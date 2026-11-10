-- NORDIC TRAIL / Nordic-Trail-Staging
-- READ-ONLY METADATA AUDIT: run only in the STAGING Supabase SQL Editor.
-- This script consists exclusively of SELECT statements.
-- It does not read secrets, user identities, report descriptions or coordinates.
-- A PASS here confirms metadata configuration, NOT end-to-end authorization.

-- 1) RLS and duplicate protection. Investigate any REVIEW row.
WITH checks AS (
  SELECT 'RLS: map_points' AS check_name,
    EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname='map_points' AND c.relrowsecurity
    ) AS ok
  UNION ALL
  SELECT 'RLS: point_reports',
    EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname='point_reports' AND c.relrowsecurity
    )
  UNION ALL
  SELECT 'Unique pending report per user/point/type',
    EXISTS (
      SELECT 1 FROM pg_index i
      JOIN pg_class idx ON idx.oid=i.indexrelid
      JOIN pg_class tbl ON tbl.oid=i.indrelid
      JOIN pg_namespace n ON n.oid=tbl.relnamespace
      WHERE n.nspname='public' AND tbl.relname='point_reports'
        AND idx.relname='point_reports_one_pending_per_user_type'
        AND i.indisunique AND i.indisvalid
        AND pg_get_indexdef(i.indexrelid) ILIKE '%user_id%'
        AND pg_get_indexdef(i.indexrelid) ILIKE '%point_id%'
        AND pg_get_indexdef(i.indexrelid) ILIKE '%report_type%'
        AND pg_get_expr(i.indpred,i.indrelid) ILIKE '%pending%'
    )
  UNION ALL
  SELECT 'Insert guard trigger: force_pending_on_insert',
    EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid=t.tgrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname='point_reports'
        AND t.tgname='force_pending_on_insert'
        AND NOT t.tgisinternal AND t.tgenabled IN ('O','A')
    )
  UNION ALL
  SELECT 'Report type guard trigger',
    EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid=t.tgrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname='point_reports'
        AND NOT t.tgisinternal AND t.tgenabled IN ('O','A')
        AND pg_get_triggerdef(t.oid) ILIKE '%validate_point_report_kind%'
    )
  UNION ALL
  SELECT 'SECURITY DEFINER: moderate_point_report',
    EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname='moderate_point_report' AND p.prosecdef
    )
  UNION ALL
  SELECT 'SECURITY DEFINER: admin_pending_point_reports',
    EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname='admin_pending_point_reports' AND p.prosecdef
    )
)
SELECT check_name, CASE WHEN ok THEN 'PASS' ELSE 'REVIEW' END AS result
FROM checks ORDER BY check_name;

-- 2) Policy definitions for inspection. Confirm that INSERT requires the
-- authenticated owner, pending status, and an approved public point.
-- SELECT must be limited to the signed-in user's own reports.
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='public'
  AND tablename IN ('map_points','point_reports')
ORDER BY tablename, cmd, policyname;

-- 3) Inspect precise partial unique-index definition (column order/predicate).
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname='public' AND tablename='point_reports'
  AND indexname='point_reports_one_pending_per_user_type';

-- 4) Inspect SECURITY DEFINER function attributes without printing bodies.
SELECT p.proname AS function_name, p.prosecdef AS security_definer,
  p.proconfig AS function_settings
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN ('moderate_point_report','admin_pending_point_reports')
ORDER BY p.proname;

-- Interpretation: 0 rows from a protected table can be due to RLS filtering.
-- Public-key browser audits cannot prove SQL policy definitions or uniqueness.
