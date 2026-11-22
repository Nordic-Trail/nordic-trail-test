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

## Iteracja 1 — wspólny tryb planowania na mapie (kod gotowy do testów urządzeń)
W gałęzi zintegrowano z `staging-app/` tryb wyprawy:
- Przycisk **Trasa** otwiera panel na **tej samej mapie Leaflet**, bez przeładowania strony.
- W trybie wyboru można dodawać punkty, określać samochód/pieszo i zmieniać wybrane punkty.
- Odcinki szkicowe są przerywane; samochodowe ciemnoniebieskie, piesze ciemnozielone.
- Wspólny model danych `route-model.js` / `integration-model.js` zapisuje i odczytuje wyprawę **lokalnie**, pod istniejącym kluczem v2.
- Eksport GPX wyraźnie informuje o szkicach po linii prostej, z osobnym potwierdzeniem.
- Dodawanie punktów wyprawy nie korzysta z Supabase; kliknięcie w mapę w trybie planowania jest odseparowane od tworzenia punktów użytkownika.
- Dotychczasowy planer z obliczaniem tras OSM nadal jest dostępny przez link w panelu. **Nie przenieśliśmy jeszcze wyznaczania geometrii po drogach do nowego panelu.**
- Skrypt regresji `scripts/mvp_map_trip_integration_check.cjs` i workflow `mvp-map-trip-integration.yml` zostały dodane.
- GitHub Actions: 4 najnowsze zestawy testów PASS w dniu 22 listopada: MVP Integration, OSM Click Isolation, OSM Layers i Mobile Map. **Brak jeszcze rzeczywistego testu Safari/Samsung.**

### Warunki zamknięcia iteracji 1
- [x] Model lokalny i GPX zachowane według automatycznych testów.
- [x] Istniejące testy OSM, izolacji kliknięć i mobilnej mapy — PASS.
- [ ] Zweryfikować w Safari i na Samsungu jedną mapę + otwieranie panelu, wybieranie punktów, zapis, ponowne otwarcie i GPX.
- [ ] Zweryfikować, że tryb planowania nie powoduje utworzenia punktu w bazie przy zalogowanym użytkowniku.
- [ ] Ocenić dostępność UI/UX na urządzeniu i dopiero wtedy zatwierdzić zamknięcie etapu.

### Test ręczny na macOS Safari — 22 listopada 2026
- PASS: Otwieranie planera na tej samej mapie oraz ręczne dodanie 3 punktów.
- PASS: 1 odcinek samochodowy i 1 pieszy, rozdzielone wizualnie, zgodne wartości dystansu po zaokrągleniu.
- PASS: Lokalny zapis i przywrócenie 3 punktów po odświeżeniu strony.
- PASS: Faktyczny pobrany GPX 1.1 sprawdzony jako XML: 3 waypointy, 2 tracks, kolejno `draft-drive` i `draft-walk`, wspólny punkt przesiadki, komunikat „nie używać do nawigacji”. Dystanse według pliku: ~1,5795 km i ~1,0614 km.
- UWAGA UI: potwierdzenie zapisu było poniżej widocznego obszaru panelu; wprowadzono zmianę tekstu przycisku na „✓ Zapisano” (wymaga weryfikacji urządzenia po aktualizacji pobranego kodu).
- UWAGA UI: mapa po odświeżeniu wraca do widoku Szwecji, a panel przykrywa część szkicu; zaplanować dopasowanie mapy do zapisanej wyprawy.
- NIE SPRAWDZONO: test całego planera na Samsungu, poprawki potwierdzenia zapisu na urządzeniu, realny routing z nowego panelu, bezpieczeństwo kont po integracji.
- **Iteracja 1 nadal otwarta** do zamknięcia testów regresyjnych na urządzeniu i akceptacji.

### Wyniki dodatkowych testów Safari — 22 listopada 2026, godz. ~18:11 CET
- PASS: po ponownym otwarciu planera mapa automatycznie dopasowuje widok do zapisanych 3 punktów w rejonie Tullinge.
- PASS: po przesunięciu przycisków „Zapisz lokalnie” i „Eksport GPX” nad listę punktów są widoczne bez przewijania.
- PASS: po kliknięciu „Zapisz lokalnie” przycisk pokazuje „✓ Zapisano”, a obok widoczny jest komunikat o lokalnym zapisie.
- ZAMKNIĘTE: problem niewidocznego potwierdzenia zapisu w Safari.
- NADAL OTWARTE: test na Samsungu i wspólny routing po sieci dróg OSM. Nie scalać PR do main bez akceptacji.

## Iteracja 2 — geometra tras OSM i stabilizacja (nieukończona)
1. Włączyć do wspólnego panelu istniejący mechanizm routingu z wyraźną zgodą na wysłanie współrzędnych; zachować limity demonstracyjnego serwera.
2. Przetestować przeliczenie po zmianie punktu, porównanie przebiegu i klasyfikację odcinków.
3. Sprawdzić lokalny zapis i eksport GPX przed oraz po obliczeniu trasy; nie migrować danych użytkownika bez decyzji.
4. Testy Safari/Samsung, bezpieczeństwa regresji oraz zgodności z modułem kont i moderacji.

## Ryzyka blokujące wydanie
- Zewnętrzny demonstracyjny routing Valhalla/FOSSGIS nie jest gwarantowanym serwisem dla produkcji.
- Mapy OSM online nie są pakietem offline.
- Zgodność z prawem i przejezdność dróg nie wynikają z samej obecności geometrii OSM/NVDB.
- RLS i funkcje uprzywilejowane należy audytować w rzeczywistym STAGING, nie tylko statycznie.
- Stan poprawności danych na mapie nie jest równoznaczny z bezpieczeństwem i gotowością MVP.

## Zasady procesu
Każda iteracja: zakres → zmiany w gałęzi → automatyczne testy → test użytkownika → podsumowanie ryzyk → akceptacja → zamknięcie. Nowe funkcje poza grudniowym MVP odkładamy. `main` i Supabase pozostają nietknięte bez osobnego zatwierdzenia.
