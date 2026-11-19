# NORDIC TRAIL — kontrola anonimowego API STAGING (19.11.2026)

Ta zmiana dotyczy **wyłącznie testów i diagnostyki**, bez modyfikacji bazy danych, konfiguracji RLS i aplikacji. Pliki są na gałęzi przeglądowej i wymagają osobnego scalenia z `main`.

## Zawartość

- `.github/workflows/staging-anonymous-rls-check.yml` — workflow uruchamiający lokalne testy interpretacji odpowiedzi i kontrolę anonimowych odpowiedzi API;
- `scripts/staging_anon_rls_check.py` — żądania `HEAD`, odczyt wyłącznie kodów HTTP i liczników, bez pobierania treści rekordów;
- `tests/test_staging_anon_rls_check.py` — 12 lokalnych testów klasyfikacji wyników;
- `audits/staging_privileges_readonly.sql` — cztery zapytania `SELECT` do ręcznej kontroli w Supabase STAGING.

## Interpretacja

1. `401/403` lub `200/206` z liczbą widocznych wierszy równą zero może oznaczać poprawną izolację RLS w sprawdzonym zapytaniu. Nie dowodzi istnienia chronionych danych.
2. Możliwość anonimowego `SELECT map_points.user_id` powoduje ostrzeżenie `REVIEW`; nie pobieramy wartości identyfikatorów ani nie przesądzamy o polityce publikacji.
3. Brak wiarygodnej odpowiedzi lub licznika jest wynikiem `REVIEW`, nie `PASS`.
4. Sam pozytywny test anonimowy nie zastępuje kontroli wszystkich polityk, uprawnień `EXECUTE`, sesji zalogowanych ani weryfikacji funkcji `SECURITY DEFINER`.

## Granice bezpieczeństwa

- Nie uruchamiać zapytań przeciwko produkcji.
- Żadnych kluczy serwisowych ani haseł w repozytorium lub czacie.
- Raport może pokazać wynik `REVIEW` i przerwać workflow; oznacza to potrzebę ustalenia przyczyny.
- Po scaleniu do `main` workflow może wykonywać kontrole zgodnie ze swoim harmonogramem.
- Zapytania SQL nie zostały uruchomione w bazie. Wyniki STAGING pozostają niezweryfikowane.

## Uruchomienie lokalne

```sh
python3 -m unittest discover -s tests -p 'test_staging_anon_rls_check.py' -v
```
