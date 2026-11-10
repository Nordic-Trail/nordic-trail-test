# NORDIC TRAIL STAGING — kontrola zabezpieczeń zgłoszeń

Zakres: **wyłącznie testy i dokumentacja**, bez zmiany działającej aplikacji, funkcji RPC i polityk Supabase.

## Co poprawiono
- Audyt odczytu `staging-auth-audit/` nie zakłada już istnienia prywatnego szkicu #4; weryfikuje dostępne metadane punktów i filtr dostępu do cudzych zgłoszeń.
- Audyt zapisu `staging-write-audit/` nie zależy od punktu #4. Zapis UPDATE/DELETE używa filtrów `id=-1 AND id=-2` (żaden rekord nie pasuje); bez odpowiedzi 403/42501 wynik jest **SKIP**, a nie fałszywe potwierdzenie podatności.
- Oba audyty świadomie odróżniają PASS, FAIL i SKIP.
- Automatyczny test anonimowego RLS obejmuje zmiany w `staging-reports/` i powiązanych audytach.
- Workflow `staging-security-static.yml` wykonuje **offline** statyczne kontrole przy pull requestach; nie potrzebuje kluczy ani połączenia z Supabase.

## Co wymaga sprawdzenia w Supabase
Otwórz projekt **Nordic-Trail-Staging** → SQL Editor i uruchom treść pliku
`audits/staging_reports_security_readonly.sql`. Wykonuje wyłącznie SELECT na metadanych.
Sprawdź wynik PASS/REVIEW oraz zwrócone definicje polityk i indeksu.
**Nie przesyłaj tokenów ani kluczy tajnych.**

## Ograniczenia
- PASS dla pustego wyniku RLS potwierdza tylko obserwowane zachowanie, nie dowodzi istnienia danych innego użytkownika.
- Kontrola duplikatów na tym etapie sprawdza istnienie poprawnego indeksu w bazie; nie generuje testowych zgłoszeń.
- Niemożliwe filtry UPDATE/DELETE nie testują nadpisania prawdziwego rekordu. SKIP jest celowy, gdy API przyjmuje zapytanie bez pasujących rekordów.
- Przed/po porównujemy liczbę dostępnych rekordów; równoległe operacje innych użytkowników mogą zmienić liczby.
- Żaden z testów nie zastępuje pełnego audytu polityk RLS i implementacji SECURITY DEFINER.

## Bezpieczna kolejność po przeglądzie gałęzi
1. Przejrzyj zmiany w GitHub i ewentualnie uruchom test offline w PR.
2. Uruchom odczytowe audyty w dwóch przeglądarkach, w odpowiednich sesjach.
3. Uruchom SQL wyłącznie w projekcie STAGING i przeanalizuj REVIEW.
4. Dopiero po akceptacji scal zmiany testów z `main`. Brak automatycznego scalenia.
