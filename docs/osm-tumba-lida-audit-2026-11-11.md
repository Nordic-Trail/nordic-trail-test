# OSM Tumba–Lida — audyt próbki, 11 listopada 2026

Status: audyt roboczy; brak potwierdzenia przepisów lub stanu w terenie.

## Pobrany zbiór

- 66 obserwacji OSM: 29 węzłów barier (18 gate, 6 swing_gate, 5 lift_gate) i 37 dróg z tagami dostępu.
- Wśród 37 dróg 26 to residential/service/track, natomiast **11 to footway/path/cycleway**. Te 11 należy wyłączyć z warstwy ograniczeń dla samochodów i ewentualnie pokazywać w osobnej warstwie pieszej/rowerowej.
- Nie ma duplikatów pary (typ obiektu, OSM ID). Odrębne bramy mają czasem punkty oddalone o około 8–13 m. Nie scalać automatycznie.

## Dziewięć rekordów porównanych z aktualnym API OSM

Dwa odczyty tylko do przeglądania (HTTP GET), oba HTTP 200, workflow GitHub Actions 43070914987. **9/9 zgodnych tagów** z paczką; współrzędne 4 węzłów także zgodne. To zgodność w OSM, nie potwierdzenie oznakowania w terenie.

| Rekord OSM | Oznaczenia w paczce | Wynik | Ostatnia edycja OSM |
|---|---|---|---|
| [node 226059380](https://www.openstreetmap.org/node/226059380) | gate; access=no | Zgodny | 2018-10-01 |
| [node 972124384](https://www.openstreetmap.org/node/972124384) | gate; access=private | Zgodny | 2023-08-12 |
| [node 2439158574](https://www.openstreetmap.org/node/2439158574) | gate; access=private | Zgodny | 2023-08-12 |
| [node 5274347045](https://www.openstreetmap.org/node/5274347045) | swing_gate; access=yes; motor_vehicle=no | Zgodny | 2026-10-21 |
| [way 117607547](https://www.openstreetmap.org/way/117607547) | track; motor_vehicle=no; gravel | Zgodny | 2025-07-20 |
| [way 123491155](https://www.openstreetmap.org/way/123491155) | residential; motor_vehicle=private; Finkmossvägen | Zgodny | 2024-07-23 |
| [way 5133882](https://www.openstreetmap.org/way/5133882) | residential; access=no; Grödingevägen | Zgodny | 2022-12-25 |
| [way 9664074](https://www.openstreetmap.org/way/9664074) | service; access=no; Tumba Torg | Zgodny | 2024-07-31 |
| [way 263614078](https://www.openstreetmap.org/way/263614078) | path; motor_vehicle=no; roots | Zgodny | 2024-09-09 |

## Ryzyka i decyzje

1. Wymagane rozdzielenie barier, dróg dla aut i ścieżek pieszo-rowerowych.
2. Nie stwierdzać dostępności prawnej. Tag OSM nie jest decyzją urzędową ani obserwacją w terenie.
3. Nie scalać sąsiednich bram tylko na podstawie bliskości.
4. Kontrola w pierwszej kolejności dla starszych wpisów i złożonych oznaczeń dostępu, np. access=yes z motor_vehicle=no.
5. Punkty reprezentujące sposoby OSM są środkami odcinka, nie jego dokładnym przebiegiem; zakres zakazu wymaga odrębnej weryfikacji.

Źródła audytu: https://github.com/Nordic-Trail/nordic-trail-test/actions/runs/43069666471 oraz https://github.com/Nordic-Trail/nordic-trail-test/actions/runs/43070914987.

PR #19 pozostaje roboczy; bez zmian mapy publicznej, bazy Supabase i danych użytkowników.
