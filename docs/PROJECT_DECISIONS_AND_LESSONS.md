# NORDIC TRAIL — rejestr decyzji i lekcji

Aktualizacja: 2026-11-02. Dokument roboczy; nie jest raportem z testów produkcyjnych.

## Decyzje
- Nowe punkty zalogowanych użytkowników: `draft/private`. Publikacja wyłącznie po świadomym zgłoszeniu i zatwierdzeniu moderatora.
- Stan oczekiwania: `pending/private`; zatwierdzenie: `approved/public`; odrzucenie: `rejected/private`.
- Zgłoszenia społeczności dotyczą wyłącznie punktów `approved/public`.
- Nie modyfikować produkcyjnego Supabase ani gałęzi `main` bez zgody użytkownika.
- Bezpieczeństwo i zachowanie historii danych mają pierwszeństwo przed tempem wdrożenia.

## Potwierdzone wcześniej
- Audyt odczytowy: RLS na `map_points` i `point_reports`; brak bezpośredniego UPDATE/DELETE dla zwykłego konta.
- Stan w chwili audytu: 1 approved/public, 5 rejected/private, 2 pending reports dla punktu publicznego.
- W gałęzi `feature/private-points-draft` istnieje propozycja migracji staging; nie uruchomiono jej w PostgreSQL.
- Lokalny zapis punktów jest rozdzielony według kont; stary klucz zachowany i odizolowany.

## Otwarte ryzyka
1. Testy JWT/RLS na staging dla anonimowego, użytkowników A/B i moderatora.
2. Komplet polityk RLS i grantów funkcji przed migracją.
3. Bezpieczne odzyskanie starszych danych lokalnych oraz trwałość punktów gościa.
4. Walidacja JavaScript w przeglądarce i test przełączania kont.
5. Paginacja chmurowych punktów zamiast limitu 500.
6. LocalStorage per konto nie jest szyfrowaniem ani izolacją przed dostępem do tego samego profilu przeglądarki.

## Lekcje
- Działaj od razu po poleceniu kontynuacji w zatwierdzonym zakresie.
- Po zapisie w GitHub odczytaj plik i sprawdź, czy zapis rzeczywiście się powiódł.
- Odróżniaj test statyczny od testu integracyjnego.
- Nie kasuj danych podczas naprawy błędów bez planu migracji i zgody.
