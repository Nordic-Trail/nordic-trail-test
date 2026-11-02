# Kontrola statyczna — 2026-11-02

Zakres: aktualne pliki `index.html`, `20261102_private_drafts_UNIFIED_STAGING.sql` i skrypt preflight. **Bez dostępu do uruchomionej bazy ani testów przeglądarkowych.**

## Bloker przed staging
**Niezgodność raportowania:** `index.html` oferuje `gate_removed`, `gate_status`, `closure_risk`, `private_road`, `incorrect_info`, `other`, ale nie oferuje `road_unblocked`. Co więcej, opcja „Droga została odblokowana / szlaban usunięty” wysyła zawsze `gate_removed` — również dla `closed`. Wcześniej audytowany trigger `validate_point_report_kind` ograniczał `gate_removed` do `gate`, a `road_unblocked` do `closed`. Wymaga sprawdzenia aktualnej definicji triggera i zgodnego modelu typów; nie należy obchodzić walidacji bazy.

## Inne ryzyka
- Preflight migracji dopuszcza wyłącznie stare stany; ponowne uruchomienie po utworzeniu szkiców `draft/private` przerwie transakcję.
- `DROP POLICY IF EXISTS` usuwa tylko wskazaną politykę, nie inne ewentualne polityki permissive. Wymagany pełny audyt `pg_policies`.
- `localStorage` per konto nie chroni przed dostępem do tego samego profilu przeglądarki. Stare dane pozostają odizolowane bez ścieżki odzyskania; anonimowe punkty nie przetrwają odświeżenia.
- Prywatne i publiczne punkty mają `limit(500)`, brak paginacji.
- `SECURITY DEFINER` wymaga kontroli właścicieli funkcji i uprawnień po wdrożeniu.

## Kolejne kontrole
1. Na staging uruchomić `supabase/audits/20261102_staging_readonly_preflight.sql` i przeanalizować wyniki.
2. Odczytać rzeczywistą definicję `validate_point_report_kind` oraz constraint na `point_reports.report_type`.
3. Uzgodnić mapowanie rodzajów zgłoszeń z UI; dodać testy dla `gate` i `closed`.
4. Dopiero potem rozważyć uruchomienie migracji staging i testy ról JWT.

Żadne zmiany produkcyjnego Supabase ani `main` nie zostały wykonane.
