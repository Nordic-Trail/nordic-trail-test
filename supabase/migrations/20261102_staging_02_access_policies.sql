-- NORDIC TRAIL | STAGING ONLY | 02: minimal API access and report validation
-- Run only on Nordic-Trail-Staging, after verified 01 base schema.
-- No production user data is copied. No moderator RPCs installed in this step.
BEGIN;
DO $$
BEGIN
 IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relname IN
     ('map_points','point_reports','app_admins','moderation_history','point_moderation_history')
     AND c.relkind='r') <> 5 THEN
   RAISE EXCEPTION 'Missing staging tables';
 END IF;
 IF EXISTS (SELECT 1 FROM public.map_points)
    OR EXISTS (SELECT 1 FROM public.point_reports) THEN
   RAISE EXCEPTION 'Expected empty staging tables';
 END IF;
END $$;
-- Public read-only approved points; authenticated owners read their own points.
CREATE POLICY map_points_read_approved_or_own ON public.map_points
 FOR SELECT TO anon,authenticated USING (
  (visibility='public' AND review_status='approved')
  OR (auth.uid() IS NOT NULL AND user_id=(SELECT auth.uid()))
 );
CREATE POLICY map_points_insert_draft ON public.map_points
 FOR INSERT TO authenticated WITH CHECK (
  user_id=(SELECT auth.uid()) AND visibility='private' AND review_status='draft'
 );
-- Point reports are readable only by their author.
CREATE POLICY point_reports_read_own ON public.point_reports
 FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()));
CREATE POLICY point_reports_insert_public_only ON public.point_reports
 FOR INSERT TO authenticated WITH CHECK (
  user_id=(SELECT auth.uid()) AND review_status='pending'
  AND EXISTS (SELECT 1 FROM public.map_points p WHERE p.id=point_id
   AND p.visibility='public' AND p.review_status='approved')
 );
-- All moderator and history tables remain inaccessible via Data API.
CREATE OR REPLACE FUNCTION public.validate_point_report_kind()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE v_kind text;
BEGIN
 IF NEW.report_type NOT IN ('gate_removed','road_unblocked') THEN RETURN NEW; END IF;
 SELECT p.kind INTO v_kind FROM public.map_points p WHERE p.id=NEW.point_id;
 IF NEW.report_type='gate_removed' AND v_kind IS DISTINCT FROM 'gate' THEN
  RAISE EXCEPTION 'Usunięcie szlabanu można zgłosić tylko dla szlabanu';
 END IF;
 IF NEW.report_type='road_unblocked' AND v_kind IS DISTINCT FROM 'closed' THEN
  RAISE EXCEPTION 'Odblokowanie drogi można zgłosić tylko dla zamkniętej drogi';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_report_kind BEFORE INSERT OR UPDATE ON public.point_reports
 FOR EACH ROW EXECUTE FUNCTION public.validate_point_report_kind();
CREATE OR REPLACE FUNCTION public.force_pending_report()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
BEGIN
 NEW.review_status='pending';
 RETURN NEW;
END $$;
CREATE TRIGGER force_pending_on_insert BEFORE INSERT ON public.point_reports
 FOR EACH ROW EXECUTE FUNCTION public.force_pending_report();
REVOKE ALL ON FUNCTION public.validate_point_report_kind() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.force_pending_report() FROM PUBLIC,anon,authenticated;
-- Minimal direct table grants, all updates/deletes remain denied.
GRANT SELECT ON public.map_points TO anon,authenticated;
GRANT INSERT ON public.map_points TO authenticated;
GRANT SELECT,INSERT ON public.point_reports TO authenticated;
-- Identity sequences require USAGE for inserts through Data API.
GRANT USAGE ON SEQUENCE public.map_points_id_seq,public.point_reports_id_seq TO authenticated;
COMMIT;
