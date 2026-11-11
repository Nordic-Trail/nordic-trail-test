# Pilot Tumba-Lida, Botkyrka — official NVDB/STFS evidence

Status: **preparation only**. 0 official road records imported. Reviewed 2026-11-11.

## Area
Approximate bounding box in WGS84 [min longitude, min latitude, max longitude, max latitude]:
[17.775, 59.145, 17.920, 59.225].
This is an engineering study rectangle, not a verified road or legal driving corridor.

## Source discovery (official)
- NVDB Datautbytesportalen: https://www.nvdb.se/sv/kund/hamta-aktuella-data/
  12 data types, including Väghållare and Vägbredd. Browsable without login;
  obtaining download access requires registration.
- Lastkajen: https://www.trafikverket.se/lastkajen
  Custom road-data exports require registration and acceptance of terms.
- NVDB map: https://nvdbpakarta.trafikverket.se/
  Check Väghinder and Förbud mot trafik separately; they are not among the
  12 listed standard API products.
- STFS: https://www.transportstyrelsen.se/sv/vagtrafik/trafikregler-och-vagmarken/trafikregler/stfs-for-myndigheter-som-beslutar-trafikforeskrifter/Hjalptexter/Hur-man-soker-med-hjalp-av-kartan/
  Map lookup is incomplete. Check legal regulation texts; no search hit
  does NOT mean the road is unrestricted.
- Stockholm municipal data: https://openstreetgs.stockholm.se/home/News
  The city announced removal of NVDB collections during autumn 2026;
  this is not a dependable service for a Botkyrka national-road pilot.

## Verification priorities
1. Väghållare: road maintainer, not permission to drive.
2. Vägbredd: width, not a safety or access guarantee.
3. Väghinder: evidence of recorded physical obstacles, not a live gate status.
4. Förbud mot trafik: exact legal/temporal scope requires verification.
5. STFS: authoritative text and exceptions, if accessible.

## Import gate
Only after official acquisition and review of licence and source identifiers:
- Confirm data as-of dates, official URLs, geometry and coordinate system.
- Keep legal_access equal to unverified for all records in this phase.
- Place reviewed GeoJSON into road-data/reviewed-evidence.geojson.
- Update imported_source_records to the actual reviewed record count.
- Run node scripts/road_evidence_check.cjs
- Run node scripts/road_pilot_check.cjs
- Manually verify examples before proposing a read-only opt-in map layer.

Never upload credentials, private data, hypothetical closures or made-up road facts.
This pilot has no frontend map, API, Supabase, auth, routing or GPX changes.
