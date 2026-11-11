# NORDIC TRAIL — road evidence v1

This is a **source validation foundation**, not an active map layer or legal
driving permission service. The dataset is intentionally empty until real
official records are examined manually. No Supabase, RLS, login, or UI change.

## Official data sources

- NVDB (Trafikverket): https://www.nvdb.se/sv/kund/hamta-aktuella-data/
- NVDB map: https://nvdbpakarta.trafikverket.se/
- Lastkajen download: https://www.trafikverket.se/lastkajen
- STFS: https://www.transportstyrelsen.se/sv/vagtrafik/trafikregler-och-vagmarken/trafikregler/stfs-for-myndigheter-som-beslutar-trafikforeskrifter/om-stfs/
- STFS search: https://rdt.transportstyrelsen.se/rdt/Default.aspx?UseStfs=1
- Private roads and motor traffic: https://www.naturvardsverket.se/amnesomraden/allemansratten/sa-gor-vi-allemansratt/enskild-vag/

**Important limits:**
NVDB Open API covers only selected data products. Other products require
Lastkajen exports; account registration and acceptance of applicable licence
conditions may be necessary. Check licensing **for each export** before reuse.
The geographic records of STFS are incomplete; absence of an STFS record on
a map DOES NOT certify that a road is open to motor vehicles. Road owner
restrictions and signs may apply regardless of mapped records.

## Data contract

File: road-data/reviewed-evidence.geojson.
GeoJSON FeatureCollection, with schema_version equal to 1.
All geometries must be EPSG:4326, with coordinate order longitude, latitude.
Every Feature has required properties:
- source: NVDB or STFS
- category: for NVDB: maintainer, road_width, surface, physical_obstacle,
  traffic_restriction, direction_restriction, state_subsidy;
  for STFS: regulation_record
- source_record_id: exact official source record identifier
- description: short factual explanation of the source record
- source_url: HTTPS URL to an official source
- source_checked_on: YYYY-MM-DD when source was checked
- data_as_of: YYYY-MM-DD of source data
- legal_access: MUST be "unverified"
- review_state: MUST be "source_checked"

Source checking is NOT proof of road accessibility or legal driving permission.
The validator checks structure, coordinates, provenance, dates and domains only.
It does not verify the regulation's interpretation, license, or field conditions.
Never assign automatically "allowed", "safe", "open" or "legally drivable".
Physical passability and legal access are separate categories.

Run:
  node scripts/road_evidence_validate.cjs road-data/reviewed-evidence.geojson
  node scripts/road_evidence_check.cjs

**Next steps before adding a map layer:**
1. Select a small Swedish study area and obtain NVDB data through official source.
2. Check export license and data quality, source identifiers and geometry.
3. Review individual records manually and record source date and source URL.
4. Prepare reviewed GeoJSON with legally conservative interpretations.
5. Build an opt-in read-only layer using the already approved glass UI.
6. Validate CI, review samples in official map, and approve publishing separately.

Do not commit sensitive data, API keys, false features, or scraped accounts.
