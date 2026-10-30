-- NORDIC TRAIL: READ-ONLY preflight checks.
-- Run in Supabase SQL Editor BEFORE considering private draft migration.
-- This script makes NO schema or data changes.

-- 1. Relevant policies: verify no broad UPDATE/DELETE/INSERT or private SELECT access.
SELECT schemaname,tablename,policyname,cmd,roles,qual,with_check
FROM pg_policies
WHERE schemaname='public' AND tablename IN ('map_points','point_reports')
ORDER BY tablename,cmd,policyname;

-- 2. Check function signatures, SECURITY DEFINER, search_path and EXECUTE grants.
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS args,
       p.prosecdef AS security_definer,
       p.proconfig AS function_settings,
       has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
       pg_get_functiondef(p.oid) AS definition
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN (
    'admin_pending_point_reports','moderate_point_report',
    'admin_pending_map_points','moderate_map_point',
    'submit_map_point_for_review','update_private_map_point'
  )
ORDER BY p.proname;

-- 3. Existing review states and visibility: do not overwrite historical rejected rows.
SELECT review_status,visibility,count(*) AS points
FROM public.map_points GROUP BY review_status,visibility
ORDER BY review_status,visibility;

-- 4. Reports whose target point is not public (including historical pending reports).
SELECT r.review_status AS report_state,p.review_status AS point_state,
       p.visibility AS point_visibility,count(*) AS reports
FROM public.point_reports r
JOIN public.map_points p ON p.id=r.point_id
WHERE p.review_status IS DISTINCT FROM 'approved'
   OR p.visibility IS DISTINCT FROM 'public'
GROUP BY r.review_status,p.review_status,p.visibility
ORDER BY r.review_status,p.review_status,p.visibility;

-- 5. Check all constraints, triggers and relevant grants.
SELECT c.conname,pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
JOIN pg_namespace n ON n.oid=t.relnamespace
WHERE n.nspname='public' AND t.relname IN ('map_points','point_reports');
SELECT event_object_table,trigger_name,action_statement
FROM information_schema.triggers
WHERE event_object_schema='public'
  AND event_object_table IN ('map_points','point_reports')
ORDER BY event_object_table,trigger_name;

-- 6. Confirm RLS enabled and not accidentally disabled.
SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('map_points','point_reports');

-- IMPORTANT: Supabase SQL Editor usually runs with privileged role.
-- Passing these SELECTs does NOT prove authenticated/anon RLS isolation.
-- Real user JWT tests and moderation RPC tests are still required.
