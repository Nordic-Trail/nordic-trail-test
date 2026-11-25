# Vägtrafiknät — contract for import into NORDIC TRAIL
25 November 2026 — isolated preparation; no planner or database changes.

## Obtain a small source extract
Lastkajen: https://www.trafikverket.se/lastkajen
Choose Gnesta municipality (or a small custom region covering Gnesta/Frönäs and southern Klämmingen), Vägtrafiknät, all network types. Prefer a supported vector export preserving attributes and CRS (ESRI Shape with all sidecar files, or File Geodatabase if usable on the available computer). Preserve original archive and metadata. Do not infer exported field names or codes from the map UI; inspect the actual schema and code list first. No fees or new software purchases without approval.
Official specification: https://bransch.trafikverket.se/TrvSeFiler/Dataproduktspecifikationer/V%C3%A4gdataprodukter/DPS_U-%C3%96/1075vagtrafiknat.pdf
NVDB on map: https://nvdbpakarta.trafikverket.se/

## Canonical internal contract (draft)
Dataset: source, product, sourceDate (nullable if unavailable), extractionDate, originalCRS, normalizedCRS, area, original file hashes, source field mapping, code-list mapping, license/terms reference, import version.
Record: GID (optional original string), featureOid, elementId (strings), measureFrom, measureTo (numbers in source reference system; verify interpretation), validFrom, validTo (preserve raw values and normalized dates), networkRaw, network (motor/cycle/walk/unknown), geometry (LineString or MultiLineString with CRS).
Keep source values, identifiers, validity and provenance. Unknown/obsolete codes (including historical ferry code) never silently become motor. Inspect actual export before mapping. Preserve multipart geometry and source coordinate system; make a metric projected derivative for comparison only after confirming CRS (e.g. SWEREF 99 TM/EPSG:3006 if suitable). OSM geometry must be transformed into the same CRS.
Validation: empty or invalid geometry, missing IDs, ambiguous values, invalid dates/ranges, conflicting overlapping records and unrecognized CRS -> quarantine/review, not inferred access. No silent dropping or deduplicating across different ranges or validity. Preserve future/historical records separately. Check sample geometry on map and counts by network type. Do not assign an NVDB ID from proximity alone.
Within NVDB use elementId + overlapping reference interval + compatible reference version and validity when relating datasets; Feature OID identifies a source feature, not an OSM way. Cross-source match needs geometry, topology and independent evidence; incomplete or ambiguous matches remain unconfirmed.
Network type is primary use, not legal permission. Bilnät may include pedestrian streets and vehicle ferries per specification. Restrictions remain separate. Do not feed geometry-only candidates into the exact-match classification gate.

## Reference checks from official map, 24 November (dataset dated 23 November)
Gnesta/Frönäs near roundabout, manually observed:
- motor (bilnät), GID 7348883, Feature OID 12730:43241, Element ID 12730:43042, measures 0–1, dates 20100101–99991231.
- cycle (cykelnät), GID 7188021, Feature OID 12731:75437, Element ID 12731:75141, measures 0–1, dates 20111101–99991231.
These are manually transcribed reference attributes, not an imported dataset; geometry unavailable. Reconcile if newer snapshot differs, do not invent geometry. Check both on export and compare parallel geometry only digitally.
## Acceptance
1. Inspect actual files and metadata, confirm license/terms, CRS and source mappings.
2. Count and validate records; report all quarantined/unknown values.
3. Verify the two reference records or document version changes.
4. Compare actual OSM and NVDB geometries; inspect ambiguities and network classification independently.
5. Only after review consider integration with planner. No claim of legal access or safe passage.
