# NORDIC TRAIL — shared Leaflet map integration QA
Date: 2026-11-23
Status: **Preview ready for mobile regression, do not merge**

## Requirements respected
- Exactly **one shared Leaflet map** for base-map public points/OSM layers and route planning.
- Protect existing main `staging-app/index.html`, Supabase auth and RLS, moderation, privacy, read-only layers and current stored trips.
- Continue approved Polish wording, walking/car controls, SVG symbols, 40% translucent layering, routing endpoint warnings and manual sketches.
- Preserve the GPX 1.1 safe exporter: only computed OSM track geometry + user waypoints, *never* interpolate unverified gaps.

## Implemented on a separate branch
- `staging-shared-map-20261123/index.html` — based on unchanged STAGING map, plus a `Trasy` action and a read-only reference to its single Leaflet map instance.
- `staging-shared-map-20261123/shared-planner.js` — shadow-isolated planner UI and control logic; uses the same existing Leaflet map, creates only route-specific layer groups.
- Main STAGING map's click-to-add-point handler returns early while the route planner is active. Planner map clicks return early while route planner is inactive.
- Opening planning displays only the route-specific layers, and closing hides them while leaving the original map and its visible layers in place.
- Dedicated preview storage keys; older trip archives are read-only fallback, not written to.
- CSP adds only the approved Valhalla HTTPS endpoint for the route function; Supabase configuration remains unchanged in the actual main app.
- Reuses existing `staging-app/data/tumba-lida.json` to prevent the earlier missing OSM pack error.
- All approved SVG symbols copied into the isolated planner UI, and approved route icon used for the `Trasy` entry point.

## Pre-release QA
- Source-script parsing: **PASS**.
- One-map and no-extra-OSM-tiles check: **PASS**.
- Original STAGING DOM controls preserved and unique: **PASS**.
- Planner UI IDs unique within its Shadow DOM; any name overlaps with the host are scoped: **PASS**.
- No replacement of Supabase/auth, moderation, or main app files: **PASS**.
- Separate test storage namespace: **PASS**.
- Approved GPX and manual sketch functionality preserved in code: **PASS**.
- Shared-map static smoke check: `node qa/shared-map-20261123/smoke.cjs` — **PASS**.

## Not yet verified
- Real mobile browser interaction and styling of the shared-map planner, including sheet dragging and save dialogs.
- Correct interplay of planner route click handling, Leaflet marker drag, native OSM pin click and STAGING point form.
- Returning to active OSM layers and unchanged location/zoom after closing planner.
- Authentication, moderation and RLS while integrated; don't enter sensitive credentials in an unreviewed preview.
- Actual Valhalla calls and GPX download inside shared-map host under CSP.

## Release gate
1. Publish the separate shared-map preview folder, leaving `staging-app/index.html` unchanged.
2. User checks: layer visibility, `Trasy` opens on **same** map, route is displayed, mode toggles, manual sketch, close/return without loss of layer or map state.
3. Browser regressions with signed-in tester accounts; verify Auth/RLS, point draft and admin moderation as independent operations (no writes outside test scope).
4. Final QA of GPX import after the integration.
5. Only after approval propose a PR for merging the integrated code into the main app.

Do not claim this phase has passed Samsung testing until actual screenshots confirm it.
