# NORDIC TRAIL — read-only security review of shared-map integration
Date: 2026-11-23
Environment: **Nordic-Trail-Staging** (Supabase project ref `bairmdubhnodwplioxld`, ACTIVE_HEALTHY)
Scope: current separate QA2 preview, `staging-app/index.html`, RLS policies, database grants, function bodies, Supabase Security Advisors.
Decision: **PASS for static/configuration review; runtime auth/RLS regression still required. DO NOT MERGE.**

## Sources and methods
- Compared GitHub `staging-app/index.html` to the integration-only QA2 HTML and shared planner JS on 2026-11-23. Known unchanged main-app blob: `76f0e1637cb028badd0b6f73c16ee93aa727883f`.
- Read Supabase project metadata, `pg_class.relrowsecurity`, `pg_policies`, `has_table_privilege`, function `SECURITY DEFINER` flags and `pg_get_functiondef` using **SELECT-only** SQL.
- Fetched Supabase Security Advisors (security) without making any edits.
- Did not request or read passwords, tokens, user-specific rows or coordinates, and did not alter database data, RLS, privileges or account settings.
- Prior successful two-user RLS/role checks are historical context, not an additional runtime test in this audit.

## Evidence — expected access model
- All five public app tables have RLS enabled: `app_admins`, `map_points`, `point_reports`, `moderation_history`, `point_moderation_history`.
- `map_points`: SELECT allows approved/public points or own points for logged-in owner. INSERT is restricted to own private `draft`.
- `point_reports`: SELECT restricted to report owner; INSERT requires authenticated owner and pending report about an approved/public map point.
- `app_admins`, `moderation_history`, `point_moderation_history`: RLS enabled, zero RLS policies and no direct SELECT/INSERT/UPDATE grants for `anon` and `authenticated`. This is intentional direct-deny behavior while privileged routines access these tables internally.
- Anonymous SQL role has no permission to execute the reviewed moderator/admin definer functions.
- Six exposed `SECURITY DEFINER` routines callable by authenticated role were checked. `admin_pending_map_points`, `admin_pending_point_reports`, `moderate_map_point`, `moderate_point_report` explicitly check `auth.uid()` and membership in `public.app_admins`. `submit_map_point_for_review` and `update_private_map_point` check `auth.uid()`, point ownership and allowed draft status. Their definitions use a fixed empty `search_path`. No obvious missing role/ownership check was identified by static inspection.
- Existing STAGING code handles Supabase Auth and moderation; QA2 planner JS contains no Supabase client or direct table RPC. Its local trip storage is separately namespaced; STAGING Auth session is separately namespaced in preview.
- GitHub client code did not contain `service_role`, `sb_secret_`, database connection URIs, or server-side password material matching the static checks. Public publishable key configuration is loaded on the client; **this is not a secret key**.

## Advisor findings (not automatically vulnerabilities)
- INFO, `rls_enabled_no_policy` on three intentionally private tables listed above; the absence of direct client grants means no expected direct access. Documented advisory: https://supabase.com/docs/guides/database/database-advisors?lint=0008_rls_enabled_no_policy
- WARN, `authenticated_security_definer_function_executable` on six functions. Their internal guards appear appropriate; a privileged function always needs periodic scrutiny and **runtime negative tests**. Do not revoke EXECUTE or change definer mode without an approved migration and tests, as that could break moderation. Advisory: https://supabase.com/docs/guides/database/database-advisors?lint=0029_authenticated_security_definer_function_executable
- WARN, leaked-password protection disabled. Supabase documentation says this particular protection requires Pro or above; budget impact and availability require separate review. In the meantime test account passwords should be unique and strong. Documentation: https://supabase.com/docs/guides/auth/password-security

## Open release gate
1. On separate integration URL, use existing **test** accounts (admin and two non-admins) to verify sign in/out and that logout hides private drafts and pending queues.
2. Verify read-only public points as a guest; a non-admin cannot access moderator queues or approve/reject via UI or direct RPC.
3. Verify an owner can see their own private drafts but cannot read/modify another test user's drafts.
4. Confirm planner open/close does not persist Supabase session in route localStorage or trigger unexpected writes.
5. Re-run security advisor after approved changes; do not bypass RLS or broaden RPC permissions to silence warnings.
6. No new test points required unless narrowly needed; avoid creating or importing real personal locations.

## Decision
**Static code + DB configuration review: PASS WITH NOTED ADVISORIES. Runtime role isolation not yet retested in the combined view. No merge into `staging-app`, no Supabase changes, and no claim of completed security certification.**
