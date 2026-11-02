-- NORDIC TRAIL: moderation report access hardening
-- REVIEWED PROPOSAL ONLY. Do not execute until staging tests and backup.
-- Preserves moderation_history, existing reports, and function signatures.
BEGIN;

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

COMMIT;

-- Note: pre-existing pending reports on private points remain in the database,
-- but are hidden from the admin pending queue and cannot be moderated with this RPC.
-- A separate explicit historical resolution policy is needed if any exist.
-- Also audit point_report INSERT policy, other grants and concurrency before deployment.
