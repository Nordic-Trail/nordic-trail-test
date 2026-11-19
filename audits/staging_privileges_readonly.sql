-- NORDIC TRAIL / STAGING: READ ONLY permission review.
-- SQL Editor only; no rows of user data, no secrets, no mutation.
-- 1. Table-level grants and RLS state on app tables.
SELECT c.oid::regclass::text AS relation_name,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced,
       has_table_privilege('anon', c.oid, 'SELECT') AS anon_select,
       has_table_privilege('authenticated', c.oid, 'SELECT') AS authenticated_select
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('map_points', 'point_reports', 'app_admins',
                    'moderation_history', 'point_moderation_history')
  AND c.relkind IN ('r','p','v','m')
ORDER BY c.relname;

-- 2. Column-level grants. IMPORTANT: table-level SELECT also enables column read.
SELECT c.oid::regclass::text AS relation_name,
       a.attname AS column_name,
       has_column_privilege('anon', c.oid, a.attnum, 'SELECT') AS anon_can_select,
       has_column_privilege('authenticated', c.oid, a.attnum, 'SELECT') AS authenticated_can_select
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
JOIN pg_attribute AS a ON a.attrelid = c.oid
WHERE n.nspname = 'public'
  AND c.relname IN ('map_points', 'point_reports', 'app_admins')
  AND a.attname IN ('user_id', 'note', 'email', 'lat', 'lon', 'review_status', 'visibility')
  AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY c.relname, a.attname;

-- 3. Grants, SECURITY DEFINER, and search_path for relevant functions.
SELECT p.oid::regprocedure::text AS function_signature,
       p.prosecdef AS security_definer,
       p.proconfig AS function_settings,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('admin_pending_map_points', 'admin_pending_point_reports',
                    'moderate_map_point', 'moderate_point_report',
                    'submit_map_point_for_review', 'update_private_map_point')
ORDER BY p.proname, p.oid::regprocedure::text;

-- 4. Foreign key definitions relevant to account deletion / anonymization planning.
SELECT con.conname AS constraint_name,
       con.conrelid::regclass::text AS source_table,
       con.confrelid::regclass::text AS target_table,
       pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint AS con
JOIN pg_namespace AS n ON n.oid = con.connamespace
WHERE con.contype = 'f'
  AND n.nspname = 'public'
  AND (con.confrelid = to_regclass('auth.users')
       OR con.conrelid IN (to_regclass('public.map_points'),to_regclass('public.point_reports')))
ORDER BY con.conrelid::regclass::text, con.conname;
