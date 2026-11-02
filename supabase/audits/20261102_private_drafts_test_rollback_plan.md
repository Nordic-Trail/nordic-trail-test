# NORDIC TRAIL — test and rollback plan (proposal)

## Before applying anywhere
1. Verify a current database backup and tested restoration procedure. Export schema and retain existing function definitions.
2. Test in a separate staging Supabase project with the same schema, policies, triggers, and representative data. Never use production credentials in test clients.
3. Review unified migration, especially any additional grants/policies not covered by the read-only audits. Check SECURITY DEFINER ownership and auth checks.
4. Confirm app JavaScript syntax and that `draft` insert + both RPC signatures match the deployed schema.
5. Verify no client code includes service-role or other privileged secret.

## Staging tests (two separate ordinary accounts plus administrator)
- Anonymous: can read approved/public points only; cannot insert points or call new RPCs.
- Account A: insert draft/private; read own draft; cannot read account B's draft.
- Account B: cannot edit or submit A's draft via RPC.
- Account A: edit own draft; submit draft to pending once; second submit fails; edit after submit fails.
- Moderator: pending point visible only after submission; approve -> approved/public; reject -> rejected/private.
- Reports: can submit on approved/public; cannot submit on draft/private or rejected/private, even if owned.
- Moderator report queue: only pending reports on approved/public points; moderation rejects private point reports.
- Existing 1 approved/public and 5 rejected/private points retain state; existing history retained; 2 pending reports on public points remain accessible.
- Auth change during pending fetch: no private markers from prior account remain on map.
- Offline / retry / duplicate submission: no unintended duplicates or silent data loss.
- Re-run migration in staging: document whether it is safe or must be run once only.

## Deployment order
1. Confirm backup and staging test evidence.
2. Review and approve exact migration SHA.
3. Schedule short maintenance window if needed; deploy SQL transaction.
4. Recheck policies/functions/row counts; test with real JWT sessions.
5. Only then deploy matching frontend changes; verify across two devices.

## Rollback
- Retain the original policy definitions and original moderation function source from preflight audit.
- If failure occurs *inside* the transaction, PostgreSQL rolls it back automatically.
- After a committed migration, do NOT blindly restore the old `pending` default and CHECK: newly created `draft` rows may exist.
- Before rollback, check `draft` row count and whether any have been submitted. Keep data and history intact.
- Prefer forward-fix or restore from tested backup only after an explicit decision about any newly created drafts and reports.
- Never drop points, delete reports, or rewrite rejected history as a quick rollback.

## Open issues / blockers
- Browser localStorage legacy data and offline cache still need safe migration design.
- SQL staging execution, browser integration tests, and live JWT/RLS checks have NOT been performed.
- Review edge cases: NULL inputs to SECURITY DEFINER RPC, concurrent moderation/submit, and existing direct grants.
