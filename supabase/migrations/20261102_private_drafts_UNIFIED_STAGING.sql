-- NORDIC TRAIL | Unified private drafts migration | STAGING CANDIDATE
-- NOT EXECUTED. REVIEW AND TEST BEFORE PRODUCTION.
-- Based on read-only audits through 2026-11-02.
-- Preconditions: verified backup, isolated staging test, review of RPCs and grants.
-- This script does not touch existing map point rows or moderation history.
BEGIN;

-- Abort if unexpected point states are present. Never silently convert data.
DO $preflight$
BEGIN
 IF EXISTS (
   SELECT 1 FROM public.map_points
   WHERE NOT (
     (review_status='pending' AND visibility='private') OR
     (review_status='approved' AND visibility='public') OR
     (review_status='rejected' AND visibility='private')
   )
 ) THEN
   RAISE EXCEPTION 'Unexpected map_points state; stop migration';
 END IF;
 IF EXISTS (
   SELECT 1 FROM public.point_reports r
   JOIN public.map_points p ON p.id=r.point_id
   WHERE r.review_status='pending'
     AND (p.review_status IS DISTINCT FROM 'approved'
       OR p.visibility IS DISTINCT FROM 'public')
 ) THEN
   RAISE EXCEPTION 'Pending reports on private points; review manually';
 END IF;
END
$preflight$;

ALTER TABLE public.map_points
  DROP CONSTRAINT IF EXISTS map_points_review_visibility_check;
ALTER TABLE public.map_points
  ADD CONSTRAINT map_points_review_visibility_check
  CHECK (
    (review_status='draft' AND visibility='private') OR
    (review_status='pending' AND visibility='private') OR
    (review_status='approved' AND visibility='public') OR
    (review_status='rejected' AND visibility='private')
  );
ALTER TABLE public.map_points ALTER COLUMN review_status SET DEFAULT 'draft';

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.map_points;
CREATE POLICY "Enable insert for authenticated users only"
ON public.map_points FOR INSERT TO authenticated
WITH CHECK (
  user_id=(SELECT auth.uid())
  AND review_status='draft' AND visibility='private'
);

CREATE OR REPLACE FUNCTION public.submit_map_point_for_review(p_point_id bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Wymagane logowanie' USING ERRCODE='42501';
  END IF;
  UPDATE public.map_points
  SET review_status='pending',visibility='private'
  WHERE id=p_point_id AND user_id=(SELECT auth.uid())
    AND review_status='draft' AND visibility='private';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nie znaleziono prywatnego szkicu lub punkt zmienił status' USING ERRCODE='42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_map_point_for_review(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_map_point_for_review(bigint) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_private_map_point(
 p_point_id bigint,p_kind text,p_status text,p_note text,p_lat double precision,p_lon double precision
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Wymagane logowanie' USING ERRCODE='42501';
  END IF;
  IF p_kind NOT IN ('gate','closed','place')
    OR NOT (
      (p_kind='gate' AND p_status IN ('Otwarty','Zamknięty','Nieznany')) OR
      (p_kind='closed' AND p_status IN ('Przejezdna','Nieprzejezdna','Do sprawdzenia')) OR
      (p_kind='place' AND p_status IN ('Dostępne','Niedostępne'))
    )
    OR p_lat IS NULL OR p_lon IS NULL
    OR p_lat::text IN ('NaN','Infinity','-Infinity')
    OR p_lon::text IN ('NaN','Infinity','-Infinity')
    OR p_lat NOT BETWEEN -90 AND 90 OR p_lon NOT BETWEEN -180 AND 180
    OR length(coalesce(p_note,''))>2000
  THEN
    RAISE EXCEPTION 'Nieprawidłowe dane punktu' USING ERRCODE='22023';
  END IF;
  UPDATE public.map_points
  SET kind=p_kind,status=p_status,note=p_note,lat=p_lat,lon=p_lon
  WHERE id=p_point_id AND user_id=(SELECT auth.uid())
    AND review_status='draft' AND visibility='private';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nie znaleziono własnego szkicu' USING ERRCODE='42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.update_private_map_point(bigint,text,text,text,double precision,double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_private_map_point(bigint,text,text,text,double precision,double precision) TO authenticated;

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.point_reports;
CREATE POLICY "Enable insert for authenticated users only"
ON public.point_reports FOR INSERT TO authenticated
WITH CHECK (
 user_id=(SELECT auth.uid()) AND review_status='pending'
 AND EXISTS (
   SELECT 1 FROM public.map_points p
   WHERE p.id=point_id AND p.review_status='approved' AND p.visibility='public'
 )
);

-- Replace both moderator RPCs in the same transaction as the policy changes.
CREATE OR REPLACE FUNCTION public.admin_pending_point_reports()
RETURNS TABLE(
 report_id bigint, point_id bigint, report_type text, report_note text,
 created_at timestamp with time zone, point_kind text, point_status text,
 point_note text, lat double precision, lon double precision
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT EXISTS (
   SELECT 1 FROM public.app_admins a
   WHERE a.user_id = (SELECT auth.uid())
 ) THEN
   RAISE EXCEPTION 'Brak uprawnień administratora';
 END IF;

 RETURN QUERY
 SELECT r.id,r.point_id,r.report_type,r.note,r.created_at,
        p.kind,p.status,p.note,p.lat,p.lon
 FROM public.point_reports r
 JOIN public.map_points p ON p.id=r.point_id
 WHERE r.review_status='pending'
   AND p.review_status='approved'
   AND p.visibility='public'
 ORDER BY r.created_at ASC,r.id ASC
 LIMIT 100;
END;
$function$;

CREATE OR REPLACE FUNCTION public.moderate_point_report(
 p_report_id bigint, p_decision text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
 v_admin_id uuid := (SELECT auth.uid());
 v_old_status text;
BEGIN
 IF v_admin_id IS NULL OR NOT EXISTS (
   SELECT 1 FROM public.app_admins a WHERE a.user_id=v_admin_id
 ) THEN
   RAISE EXCEPTION 'Brak uprawnień administratora';
 END IF;

 IF p_decision IS NULL OR p_decision NOT IN ('approved','rejected') THEN
   RAISE EXCEPTION 'Nieprawidłowa decyzja';
 END IF;

 -- Lock report first, then target point; block changes if point is not public.
 SELECT r.review_status INTO v_old_status
 FROM public.point_reports r
 WHERE r.id=p_report_id
 FOR UPDATE;

 IF NOT FOUND THEN
   RAISE EXCEPTION 'Zgłoszenie nie istnieje';
 END IF;
 IF v_old_status <> 'pending' THEN
   RAISE EXCEPTION 'Zgłoszenie zostało już rozpatrzone';
 END IF;

 PERFORM 1
 FROM public.map_points p
 JOIN public.point_reports r ON r.point_id=p.id
 WHERE r.id=p_report_id
   AND p.review_status='approved'
   AND p.visibility='public'
 FOR UPDATE OF p;

 IF NOT FOUND THEN
   RAISE EXCEPTION 'Zgłoszenie dotyczy punktu niepublicznego lub nieistniejącego';
 END IF;

 UPDATE public.point_reports
 SET review_status=p_decision
 WHERE id=p_report_id;

 INSERT INTO public.moderation_history(
   report_id,admin_id,old_status,new_status
 ) VALUES (p_report_id,v_admin_id,v_old_status,p_decision);
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_pending_point_reports() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_pending_point_reports() TO authenticated;
REVOKE ALL ON FUNCTION public.moderate_point_report(bigint,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_point_report(bigint,text) TO authenticated;

-- Verify that the migration did not accidentally modify existing point states.
-- Post-deployment checks and actual JWT tests are in the separate test plan.
COMMIT;
