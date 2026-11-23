# NORDIC TRAIL — GPX 1.1 validation and integration gate
Date: 2026-11-23 | Status: **QA sample PASS; integration NOT APPROVED**

## Tested implementation
- Source preview: `staging-gpx-safe-export-20261123/index.html`.
- Reviewed commit on QA branch: `9d17bb10732387330f76107ca65ef547ecf3a266`.
- Latest accepted UI/route sketches remain in separate preview `staging-routing-gap-save-20261123/index.html`.
- Main working app `staging-app/index.html` **not changed**.

## Tests performed
1. Executed the actual `safeRoutedGpx` export function extracted from the page against synthetic data containing three named waypoints, two non-contiguous routed legs, gap warnings, XML-special characters, and one manually drawn gap.
2. Validated the resulting complete XML using Python `lxml.etree.XMLSchema` against a GPX 1.1 XSD mirror (GIScience/osmgpxfilter, `resources/gpx-1.1.xsd`; check its provenance before production dependence). Result: **PASS**, three waypoints, two distinct tracks, four trackpoints.
3. Negative control: changed GPX version to 1.0 and malformed a waypoint's child structure: validator rejected both.
4. Boundary controls: longitude -180 accepted; +180 rejected by GPX 1.1 XSD; latitude +91 rejected. New QA-branch patch maps longitude +180 to -180 in the GPX output only, preserving the geographical position. Code-level regression test passes.
5. Semantic checks: excluded hand-drawn gap coordinates, excluded unfinished draft legs, verified named waypoints and gap description, separate routed tracks, and escaping. Stored `smoke.cjs` in this branch. Executed and received **PASS**.
6. User independently imported a generated GPX in Locus Map on Samsung; two walking legs of approximately 5.8 and 5.0 km, three points, and the waypoint gap warning were displayed. This tests interoperability only, not navigation/field access.

## Remaining gaps and release blockers
- Validation above used **synthetic input run through the export function**, not the user's exact private phone GPX; the user's Locus import of the phone GPX was visually checked.
- The code in `staging-trips-integrated/integration-model.js` still contains the older `I.gpx()` exporter which can output straight draft legs. **Do not change that shared module or silently replace the reviewed export without regression tests.**
- The production-like `staging-app/index.html` contains independent Supabase/auth/RLS and map layers. Planner is not yet safely integrated. Integration should be a separate, reviewable PR, not a copy/paste replacement of the entire staging app.
- Keep manual gaps as separately labelled **unverified sketches**, never imply ground access. Do not silently join GPX tracks across missing sections.
- Locus Map may show its own map-layer cycling icons unrelated to the imported GPX type; no change to approved NORDIC TRAIL symbols is warranted.
- Android mobile test still required after future integration, including restoring named trips, editing/undo, exporting and importing in Locus, privacy and storage separation, layered map controls, and Supabase sign-in/RLS.

## Integration acceptance criteria
- Preserve staging-app Supabase authentication, private/public points, moderation, reporting, read-only layers, and layout.
- Preserve route planner approved icons and Polish UX labels.
- No writes to earlier preview's localStorage namespaces, and no Supabase schema/API modifications without approval.
- GPX 1.1 schema validation must pass for new generated file, including empty/partial routes, Unicode/XML entities and antimeridian boundaries.
- Main and preview regression tests pass; route-gaps warnings remain truthful.
- User approves merge only after independent preview and regression test results.
