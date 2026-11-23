# NORDIC TRAIL — integracja planera, etap 1
Date: 2026-11-23
Status: **branch preview prepared; no merge approved**

## Ground rules (22 Nov planning and current acceptance)
- Target: integrated tester MVP around 20–22 December 2026, using staged, reviewable releases and formal stage acceptance.
- Preserve existing, tested STAGING behavior, Supabase Auth/RLS, public/private points, moderation, OSM/NVDB experimental overlays, and fixed legal wording.
- No unapproved Supabase writes/schema changes and no publishing to the main app.
- Retain approved icon SVGs, clear Polish UI, named trip saving and undo, endpoint warnings, manually drawn gaps as *unverified*, and XSD-tested GPX 1.1 export.
- Prioritize a low-cost, reversible integration, simple manual Samsung checks and no unnecessary retesting.

## Completed phase-1 bridge
- Created **only** `staging-integration-20261123/index.html` and `staging-integration-20261123/planner.html` on branch `integration/planner-shell-20261123`.
- Host is based on `staging-app/index.html` and preserves its existing UI and application scripts. Added a "Trasy" button with the approved route icon and a full-screen, reversible planner view.
- Host CSP gained `frame-src 'self'` for only same-origin embedding; iframe loads lazily and messages check origin and source.
- Planner module uses route scripts from the shared `staging-trips` and `staging-trips-integrated` folders; no new routing server, keys or accounts.
- Route archive writes use a **new** localStorage namespace; older test archives are read-only fallback. Existing STAGING sessionStorage key was isolated in the integration host, so sign-in may need to be repeated in integration preview.
- Included reviewed `safeRoutedGpx` export, including the GPX 1.1 +180° longitude edge-case fix.
- `qa/integration-20261123/smoke.cjs` checks ID uniqueness, retention of original map controls, security and privacy boundaries, JS parsing, and opening/closing with state preservation.

## Verification
- Static and event-driven JavaScript regression checks: **PASS**.
- Original `staging-app/index.html`: **unchanged**.
- Previous named-trips and Supabase data: **not modified by this integration PR**.
- Live Samsung behavior and actual Supabase flows in integration preview: **NOT YET TESTED**.

## Known limitation
This is a **module shell integration**, not final single-map integration. Planner runs in a separate iframe with its own Leaflet map. Therefore the existing STAGING map and planner do not yet share one Leaflet instance, map view, layers or map interaction. This is deliberate for safe initial verification and **is not final MVP acceptance**.

## Next gating actions
1. Deploy isolated preview folder (not the main STAGING app) for Samsung.
2. Test map -> Trasy -> Pieszo, saved trip and purple sketches -> safe GPX -> Mapa -> working OSM/public points.
3. Test Layers, add-point modal and sign-in/admin account separately in the integration preview, avoiding real personal coordinates.
4. Perform exact integration with one shared Leaflet map as a **separate** reviewable step; refactor planner UI into independent module instead of copying the whole page into `staging-app`.
5. Run signed-in and signed-out regression, RLS access checks, and recheck legal disclaimers.
6. Obtain user sign-off before proposing any merge into the main app.

## Release decision
**DO NOT MERGE** this branch into `staging-app` or treat the bridge as complete integration.
