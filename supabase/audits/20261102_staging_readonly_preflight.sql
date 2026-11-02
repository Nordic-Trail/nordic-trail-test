-- NORDIC TRAIL / STAGING: READ ONLY PREFLIGHT
-- No DDL or DML. Run in a staging project and inspect output before migration.
SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
FROM pg_policies WHERE schemaname='public' AND tablename IN ('map_points','point_reports')
ORDER BY tablename,cmd,policyname;

SELECT n.nspname AS schema_name,p.proname,
 pg_get_function_identity_arguments(p.oid) AS arguments,
 pg_get_userbyid(p.proowner) AS function_owner,
 p.prosecdef AS security_definer,p.proconfig AS function_config,
 has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN
 ('admin_pending_map_points','admin_pending_point_reports','moderate_map_point',
  'moderate_point_report','submit_map_point_for_review','update_private_map_point')
ORDER BY p.proname;

SELECT review_status,visibility,count(*) AS points
FROM public.map_points GROUP BY review_status,visibility ORDER BY 1,2;

SELECT r.review_status,p.review_status AS point_review_status,
 p.visibility AS point_visibility,count(*) AS reports
FROM public.point_reports r JOIN public.map_points p ON p.id=r.point_id
GROUP BY 1,2,3 ORDER BY 1,2,3;

SELECT tgname,pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t WHERE t.tgrelid='public.point_reports'::regclass AND NOT t.tgisinternal
ORDER BY tgname;
