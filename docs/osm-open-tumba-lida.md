# OSM Tumba–Lida — podgląd bez konta

**Oddzielny podgląd do oceny**, bez zmian w działającej mapie, Supabase, trasach i GPX.

Dane są pobierane **wyłącznie po naciśnięciu** „Pobierz publiczne dane OSM”.
Źródło: OpenStreetMap (© OpenStreetMap contributors; ODbL) przez publiczne
Overpass API. Używamy małego obszaru [59.145, 17.775, 59.225, 17.920] i
ograniczamy wynik (do 150 przeszkód + 150 odcinków, do 2 MB odpowiedzi).
Ograniczamy czas żądania i ponowne odpytywanie (60 s). Publiczny serwer
Overpass może być niedostępny lub ograniczać żądania. To nie usługa
produkcyjna; gdy obciążenie wzrośnie, należy przejść na własne cache/wyciągi
zgodnie z zasadami użycia dostawców.

Wyświetlane są:
- Punkty OSM z barrier=gate/lift_gate/swing_gate/bollard.
- Drogi OSM z jawnie zapisanym access=no/private lub motor_vehicle=no/private.

**Ważne:** OSM nie jest źródłem urzędowym i tagi mogą być błędne lub stare.
Wszystkie obserwacje są niezweryfikowane. Brak tagu ograniczenia NIE oznacza,
że droga jest legalnie dostępna. Nie wyświetlamy oznaczenia „droga otwarta”.

Źródła i warunki:
https://www.openstreetmap.org/copyright
https://wiki.openstreetmap.org/wiki/Overpass_API
https://wiki.openstreetmap.org/wiki/Access

STFS można obecnie przeglądać ręcznie bez logowania, ale nie przyjmujemy
jego geometrii jako pełnej. Dane NVDB wymagające rejestracji są odłożone na koniec.

To nie import do bazy i nie automatyczne moderowanie. Nie ma żadnych kluczy.

## Diagnostic update (2026-11-11)

When a browser reports a fetch failure, account login is not required.
The preview now uses form-encoded POST, as documented by Overpass. Choose
between a Europe-region instance (`ovp.dresel.systems`, daily refreshed)
and the main global server (`overpass-api.de`). The selection is manual,
never automatic. HTTP 406/429/502/503/504, timeout, and network/CORS failures
have distinct messages. Public server usage is rate-limited to one attempt
per minute (including errors). No credentials, identifiers, or location
permissions are requested. The Europa endpoint is independently listed in
the OSM wiki, but browser CORS/success still require an on-device test.

## Smaller read-only query (2026-11-11)

The Android test experienced an Overpass Europa timeout at 25 seconds. This
is not a sign of an account/login requirement. We reduced the sample to
[59.155, 17.810, 59.203, 17.875], lowered the server time budget to 18 s,
limited requested memory, and now use `out center` instead of `out geom`.
Ways are displayed **as approximate central points**, not the precise legal
extent of restrictions. We also reject `remark` runtime error responses
returned with HTTP 200. No cached official data has been imported yet.

## Static pack architecture (2026-11-11)

The Android attempts timed out when fetching live Overpass data. The new
preview **never calls Overpass from the browser**. Its data comes from
`preview/osm-road-observations/data/tumba-lida.json` on the same host.
The shipped pack is **coverage = not_collected, 0 objects** and is not
misrepresented as a genuinely empty OSM search. No real observations have
yet been acquired, and no fictional results are shown.

The offline converter `scripts/osm_static_pack.cjs` accepts a manually
obtained real Overpass JSON file and emits a validated, small observation pack.
Run (after acquiring a legitimate source file):

```sh
node scripts/osm_static_pack.cjs INPUT_OVERPASS.json preview/osm-road-observations/data/tumba-lida.json
node scripts/osm_static_pack_check.cjs
node scripts/osm_open_preview_check.cjs
```

Review the actual data, timing, attribution and licensing before publishing.
Do not check in temporary raw source or synthetic examples. Static map data
and the approved STAGING interface are separate until explicitly approved.

## Object details and controlled external source refresh

The map's detail sheet now displays the object category (barrier / motor-road / path), exact saved OSM tags, OSM ID with a link to the original object, source snapshot time, pack acquisition time, and explicit **unverified** status. Way markers are approximate centers, not outlines of affected road sections. All content is rendered using textContent, with no user data or Supabase calls.

One-off GitHub Actions workflows for downloading source data or rechecking nine records **no longer call external APIs automatically on every pull-request update**. PR checks use offline mocked tests; an explicit manual workflow dispatch is required for later retrieval after the workflow is available on the default branch. This reduces load on public OSM services. No GitHub Pages deployment is implied by these draft changes.
