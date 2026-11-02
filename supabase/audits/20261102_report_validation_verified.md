# Walidacja zgłoszeń — potwierdzone z Supabase 2026-11-02

Źródło: użytkownik uruchomił `pg_get_functiondef('public.validate_point_report_kind()'::regprocedure)` w SQL Editor i przekazał pełną definicję.

## Potwierdzone działanie trigger function
- `gate_removed`: wymaga `map_points.kind='gate'`; inaczej wyjątek.
- `road_unblocked`: wymaga `map_points.kind='closed'`; inaczej wyjątek.
- Inne typy `report_type`: funkcja zwraca `NEW` bez dodatkowej walidacji rodzaju punktu.
- Funkcja jest `SECURITY DEFINER` i ma `search_path=''`.
- Nie wnioskuj z tego o akceptacji INSERT: dodatkowe CHECK, RLS, inne triggery i unikalne indeksy nadal obowiązują.

## Potwierdzone istniejące rekordy (zrzut SQL Editor)
- `closed/incorrect_info`: 4
- `closed/other`: 3
- `closed/road_unblocked`: 1

## Zmiana aplikacji
Commit `f0dd2957e60ecb820d5b26df815437556d20b39d` na `feature/private-points-draft`: dla pierwszej opcji zgłoszenia `gate` wysyła `gate_removed`, a `closed` wysyła `road_unblocked`. Potwierdzony odczyt pliku z GitHub, nie test end-to-end.

## Następna kontrola
Odczytać `pg_constraint` dla `point_reports` i sprawdzić aktualną politykę INSERT oraz unikalny indeks oczekujących zgłoszeń. Testy INSERT wykonać na izolowanym staging z kontami testowymi, nie na produkcyjnych danych.

## Potwierdzone ograniczenia CHECK / FK (odczyt SQL Editor, 2026-11-02)
- `point_reports_pkey`: PRIMARY KEY (id).
- `point_reports_point_id_fkey`: FOREIGN KEY (point_id) REFERENCES map_points(id).
- `point_reports_user_id_fkey`: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT.
- `point_reports_status_check`: `review_status IN ('pending','approved','rejected')`.
- `point_reports_type_check`: `report_type IN ('gate_removed','gate_status','closure_risk','private_road','incorrect_info','other','road_unblocked')`.
- Te wyniki **nie** potwierdzają polityki RLS ani wykonania testu INSERT. Indeksy unikalne należy sprawdzić osobno.
