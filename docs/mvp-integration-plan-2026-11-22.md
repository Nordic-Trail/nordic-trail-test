# NORDIC TRAIL — integracja MVP, grudzień 2026

Status: **w trakcie**, gałąź `integration/mvp-december-2026`. Nie scalać do `main` przed przeglądem i testami.

## Cel
Jedna zrozumiała aplikacja dla pierwszych testerów **20–22 grudnia 2026**: mapa, konta i punkty, moderacja, plan samochód/pieszo, lokalny zapis i GPX. Każde ograniczenie prawne musi być oznaczone jako niezweryfikowane, jeśli nie ma potwierdzenia.

## Inwentaryzacja źródeł (22 listopada)
- `staging-app/`: główna mapa, warstwy OSM, punkty, logowanie i moderacja poprzez **STAGING Supabase**; w tej części brak zintegrowanego planera.
- `staging-trips-integrated/`: punkty wyprawy, odcinki samochód/pieszo, routing OSM przez demonstracyjny serwer po zgodzie użytkownika, lokalny zapis v2, GPX; nie korzysta z Supabase.
- `staging-trips/`: model danych wyprawy i mechanizm routingu; potrzebny przez zintegrowany planer.
- `staging-reports/`: odrębny interfejs zgłoszeń; sprawdzić uprawnienia i nawigację.
- `nvdb-staging-preview/`, `staging-nvdb/`: eksperymentalne warstwy NVDB; nie są jeszcze produkcyjnym źródłem legalności przejazdu.
- `index.html` w katalogu głównym: starsza aplikacja używająca **innego projektu Supabase**. **Nie kopiować jej konfiguracji ani uwierzytelniania** do staging.
- Lokalne prototypy Grödinge v5.2 / Botkyrka v6.2: wymagają osobnego importu po weryfikacji źródeł; nieobecność w repozytorium nie jest dowodem braku ich na komputerze.

## Iteracja 1 — połączenie nawigacji (w tej gałęzi)
Dodano wyłącznie link `Trasa` z `staging-app` do istniejącego `staging-trips-integrated`.
Planer już ma link zwrotny do mapy.
To **przejście między dwoma ekranami**, a nie jeszcze wspólny interfejs lub zapis do konta.
Nie zmieniano Supabase, kluczy, RLS, danych, routingu, eksportu ani plików aplikacji głównej w `main`.

### Warunki zamknięcia iteracji 1
- Link `Trasa` otwiera istniejący planer i powrót działa na telefonie i komputerze.
- Dodawanie punktu z głównej mapy nadal działa, a kliknięcie w link nie dodaje punktu.
- Planer zapisuje lokalnie i otwiera istniejącą wyprawę; GPX zachowuje dotychczasowy format.
- Brak wysyłania danych wyprawy do Supabase; brak wpływu na sesję logowania w staging.
- Automatyczne testy GitHub Actions PASS i test manualny Safari/Samsung PASS.

## Iteracja 2 — właściwe scalanie (nie rozpoczęto)
1. Uzgodnić jeden model wyprawy, zachowując czytelne rozdzielenie danych konta i danych lokalnych.
2. Włączyć planer do wspólnego interfejsu mapy; jedna mapa i nawigacja bez dublowania obsługi Leaflet.
3. Zapewnić bezpieczny zapis/odczyt i GPX; nie migrować danych użytkowników bez testów i decyzji.
4. Testy regresyjne funkcji punktów, historii moderacji, tras i bezpieczeństwa.

## Ryzyka blokujące wydanie
- Zewnętrzny demonstracyjny routing Valhalla/FOSSGIS nie jest gwarantowanym serwisem dla produkcji.
- Mapy OSM online nie są pakietem offline.
- Zgodność z prawem i przejezdność dróg nie wynikają z samej obecności geometrii OSM/NVDB.
- RLS i funkcje uprzywilejowane należy audytować w rzeczywistym STAGING, nie tylko statycznie.
- Stan poprawności danych na mapie nie jest równoznaczny z bezpieczeństwem i gotowością MVP.

## Zasady procesu
Każda iteracja: zakres → zmiany w gałęzi → automatyczne testy → test użytkownika → podsumowanie ryzyk → akceptacja → zamknięcie. Nowe funkcje poza grudniowym MVP odkładamy. `main` i Supabase pozostają nietknięte bez osobnego zatwierdzenia.
