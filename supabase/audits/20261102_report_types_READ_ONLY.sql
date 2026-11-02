-- NORDIC TRAIL | Report type constraints and trigger inspection | READ ONLY
-- Run in the intended Supabase STAGING project's SQL editor.
-- Do not edit or run migrations based on assumptions about these results.

SELECT c.conname,pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c WHERE c.conrelid='public.point_reports'::regclass
ORDER BY c.conname;

SELECT t.tgname,pg_get_triggerdef(t.oid) AS trigger_definition,
 n.nspname AS function_schema,p.proname AS function_name,
 pg_get_functiondef(p.oid) AS function_definition
FROM pg_trigger t
JOIN pg_proc p ON p.oid=t.tgfoid
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE t.tgrelid='public.point_reports'::regclass AND NOT t.tgisinternal
ORDER BY t.tgname;

SELECT report_type,count(*) AS occurrences
FROM public.point_reports
GROUP BY report_type ORDER BY report_type;

SELECT p.kind,r.report_type,count(*) AS occurrences
FROM public.point_reports r
JOIN public.map_points p ON p.id=r.point_id
GROUP BY p.kind,r.report_type ORDER BY p.kind,r.report_type;
