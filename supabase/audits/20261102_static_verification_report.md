# Static verification report — 2026-11-02

Scope: branch `feature/private-points-draft`, `index.html`, `20261102_private_drafts_UNIFIED_STAGING.sql`.
No SQL executed, no live RLS/JWT or browser integration tests performed.

## 12 code-level assertions
10 pass: draft/private insert, draft/private insert policy, edit RPC naming, submit RPC naming, auth checks, owner checks, moderation history insertion, BEGIN/COMMIT transaction, revoke from PUBLIC/anon, reports public-only condition.
2 checks not passed:
1. `localStorage.nordicTrailPoints` is shared across authentication sessions and not account-scoped. This is a confirmed privacy concern for points saved locally on a shared device. Do not silently delete existing local points.
2. The unified migration does not contain `validate_point_report_kind`; this is not necessarily a defect because prior schema audit confirmed an existing trigger. Verify trigger in staging.

## Additional review notes
- `loadCloudDrafts()` includes `eq('user_id',userId)` and request-ID stale response guard. These are useful UX controls but do not substitute for database RLS.
- New SECURITY DEFINER RPCs explicitly check `auth.uid()` and `user_id`. Test with real authenticated and anonymous JWTs.
- SQL has not been parsed or executed in PostgreSQL. No claim of runtime correctness.
- Existing `map_points` SELECT policy allows owner reads; `point_reports` insert policy is being narrowed.
- `limit(500)` on private point query lacks pagination and may hide later points.
- Migration preflight is intentionally one-time: after draft rows exist, it will abort on rerun. Documented behavior, not idempotent.
- Before staging deployment, confirm trigger behavior, function ownership, all effective grants, and policies not listed in audit.

## Release gate
BLOCKED pending local point isolation design, staging SQL execution, live RLS cross-account tests, and frontend integration testing.
