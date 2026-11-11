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
