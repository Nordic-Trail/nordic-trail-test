# NORDIC TRAIL — punkt kontrolny planera STAGING, 27.11.2026

## Zakres i sposób dokumentowania
Rejestr wyników testów użytkownika na Samsungu oraz dotychczasowych kontroli kodu, przed eksperymentem ORS. PASS oznacza zaliczony opisany przypadek, nie certyfikację całej funkcji ani pełne pokrycie regresji. Nie archiwizujemy wszystkich przykładowych wypraw, zrzutów ani prywatnych współrzędnych. Nie usuwamy danych użytkownika.

## Punkt przywracania
- Repozytorium: Nordic-Trail/nordic-trail-test.
- Działający planer Valhalla: `staging-integration-20261123/planner.html`.
- Niezależna gałąź kopii kodu: [backup/valhalla-staging-20261127](https://github.com/Nordic-Trail/nordic-trail-test/tree/backup/valhalla-staging-20261127).
- Commit bazowy: [c67702ad43abc9544c21249da2b0aa8c44fcceb5](https://github.com/Nordic-Trail/nordic-trail-test/commit/c67702ad43abc9544c21249da2b0aa8c44fcceb5).
- ORS: [prototype/ors-routing-20261127](https://github.com/Nordic-Trail/nordic-trail-test/tree/prototype/ors-routing-20261127), bez integracji z main.
- Zapisane wyprawy znajdują się w localStorage przeglądarki, nie w GitHub. Nie zmieniamy istniejącego klucza ani nie nadpisujemy zapisów w eksperymencie ORS. Nie wykonano kopii danych z telefonu (testowe wyprawy nie są wymaganym artefaktem).

## Testy manualne — wyniki z sesji 26–27.11.2026
| Przypadek | Status | Uwagi |
| --- | --- | --- |
| Rozwijane sekcje Ważne ograniczenia / Brakujące fragmenty trasy / Zapis i eksport | PASS | Czytelne podsumowanie zwiniętego panelu |
| Ostrzeżenie o brakującym dojściu | PASS | Pomarańczowa linia i tekst „Trasa nie dochodzi do wybranego punktu” |
| Ręczny szkic brakującego dojścia pieszego | PASS | Fioletowy szkic, dodawanie i przesuwanie punktów |
| Instrukcja przed pierwszym punktem | PASS | Komunikat zależny od stanu szkicu |
| Usuwanie zaznaczonego punktu szkicu i cofanie | PASS | Użytkownik potwierdził działanie |
| Zamknięcie edycji z niezapisanymi zmianami | PASS | Okno X, kontynuacja edycji, odrzucenie zmian potwierdzone; szczegółowy test wszystkich ścieżek zamykania do regresji |
| Zapis i wczytanie trasy z ręcznym szkicem | PASS | Podstawowy test lokalnego zapisu na telefonie |
| Usunięcie z mapy bez usunięcia zapisu | PASS | Wczytanie zapisanej trasy po wyczyszczeniu mapy |
| Eksport GPX i import do Locus Map | PASS | Dwa osobne ślady OSM, trzy punkty; ręczny szkic pominięty, ostrzeżenie przy celu zachowane; bez sztucznego domknięcia |
| Wyszukiwarka, menu i panel warstw planera na telefonie | PASS | Użytkownik potwierdził działanie po poprawieniu położenia pod nagłówkiem |
| Etap samochodowy oraz przejście na pieszy przy parkingu | PASS | Odrębne kolory, numeracja i ostrzeżenie o brakującym dojściu |
| Dodanie powrotu do parkingu i nakładające się znaczniki | PASS (szkic) | Krótki test czterech punktów, bez pełnego obliczenia |
| Pełny routing wyprawy mieszanej, w tym powrót | OTWARTY | Wyczerpany limit demonstracyjny; nie jest potwierdzonym błędem powrotu |
| Eksport pełnej wyprawy mieszanej i import | OTWARTY | Po obliczeniu wszystkich odcinków |

## Otwarty dług techniczny i ryzyka
- Limity lokalne Valhalla: 6 zapytań na sesję, do 4 na jedno obliczenie, odstęp 1650 ms. Poprawka oblicza dostępną część i eliminuje identyczne klucze w pojedynczej partii; nie potwierdzono jej pełnego działania przy dostępnym limicie. Nie obchodzić limitów przez reset sesji ani nie zwiększać ich bez weryfikacji zasad operatora.
- Przycisk Przelicz ponownie powinien informować o wyczerpanym limicie i być odpowiednio blokowany.
- Po rozwinięciu grupy znaczników centralny licznik może być mylony z numerem punktu.
- Ujednolicić systemowe okna potwierdzeń z interfejsem.
- Sprawdzić typ punktów GPX, duplikaty współrzędnych i formalną walidację GPX 1.1. Test importu nie jest walidacją XSD.
- Routing nie potwierdza legalności przejazdu, dostępności ani bezpieczeństwa. Ręczne szkice i odcinki nieobliczone nie wchodzą do śladów eksportu GPX.

## Automatyczne testy — zachowane w repozytorium
- `scripts/staging_routing_check.cjs`
- `scripts/staging_trips_check.cjs`
- `scripts/staging_trips_integrated_check.cjs`
- `tests/test_staging_anon_rls_check.py` (osobny zakres bezpieczeństwa)
- ORS: [prototype-ors/ors-adapter.test.js](https://github.com/Nordic-Trail/nordic-trail-test/blob/prototype/ors-routing-20261127/prototype-ors/ors-adapter.test.js): 11/11 sprawdzeń offline na danych syntetycznych w sesji 27.11; nie potwierdzają działania na żywym API.
Istniejących skryptów regresji Valhalli nie uruchamiano ponownie przy tworzeniu tego rejestru.

## Warunki dalszej pracy nad ORS
1. Zweryfikować warunki usługi, limity, licencję wyników, atrybucję i prywatność.
2. Używać osobnej gałęzi i izolować zapisy testowe oraz cache według dostawcy i profilu. Nie umieszczać sekretów w kliencie lub repozytorium.
3. Porównać trasy samochodowe i piesze na danych testowych; sprawdzić ograniczenia drogowe, brakujące dojścia, błędy API, rozliczanie zapytań i zachowanie szkicu.
4. Powtórzyć testy funkcji zależnych od silnika, w tym mieszanej wyprawy, powrotu, zapisu, eksportu i importu w Locus Map. Nie powtarzać niezmienionych testów UI bez uzasadnienia.
5. Integracja do main wyłącznie po zaliczeniu wymaganych testów i akceptacji użytkownika. Przy problemie wrócić do bazowego kodu bez nadpisywania lokalnych wypraw.

Koszty dotychczasowego eksperymentu ORS: 0 SEK według wykonanych działań (bez zakupu i bez żywego API). Docelowy termin testowego MVP: 20–22.12.2026.

## Decyzja 27.11.2026 — kontynuujemy Valhallę
Użytkownik zatwierdził pozostanie przy Valhalli na etapie budowy i testów wewnętrznych. ORS pozostaje odizolowaną alternatywą; prace nad integracją wstrzymane. Priorytet: ukończenie MVP, krótkie reprezentatywne testy, ponowne użycie obliczonych odcinków, ewentualne grupowanie zapytań po zweryfikowaniu poprawności geometrii. Nie zwiększamy limitów ani nie obchodzimy ich. Przed dostępem grupy testerów wyjaśnić z operatorem warunki użycia publicznego serwera. Poprawka UI [e7b1f890](https://github.com/Nordic-Trail/nordic-trail-test/commit/e7b1f8901661993ac7f9780875347dde19bb0954): licznik pozostałych zapytań i blokada ponownego obliczania przy wyczerpaniu limitu; podgląd brakujących fragmentów nadal dostępny przy obliczonej trasie. Test na urządzeniu pozostaje otwarty.

## Wyniki uzupełniające — 27.11.2026, 09:31 CET
- PASS: automatyczne wyznaczenie wyprawy mieszanej czterech punktów, trzech odcinków po zaznaczeniu zgody. Komunikat „Trasa obliczona”, brak komunikatu o luce w tym przypadku.
- PASS: licznik zapytań 6/6 → 3/6 oraz zmiana stanu przycisku na „Trasa obliczona”. Blokada przy 0/6 i częściowe obliczenie przy zbyt małym budżecie nadal wymagają osobnego sprawdzenia; nie zużywać celowo zapytań.
- PASS: eksport mieszanej wyprawy GPX i import Locus Map (zrzuty 09:29–09:30): 4 punkty, 3 ślady; Samochód — 1 (OSM) 9,7 km; Pieszo — 2 i 3 (OSM) po 384 m. Parking i Punkt 4 widoczne jako osobne punkty w tej samej grupie. Zaliczone dla tego przypadku, nie potwierdza dokładnej zgodności współrzędnych, całej zawartości XML ani legalności przejazdu. Locus wyświetla ślady swoim stylem. Ewentualna poprawka nazwy powrotu: „Punkt 4” zamiast opisowej nazwy przy wyborze punktu na mapie (sprawdzić ścieżkę dodania przed zmianą).
- Zamykamy podstawowy przypadek pełnej wyprawy mieszanej i eksportu/importu. Nadal otwarte: wygląd rozwiniętej grupy znaczników, dłuższe wyprawy, warunki publicznego API przed udostępnieniem testerom.

## Integracja mapy i planera — 27.11.2026, 09:36 CET
- PASS: główna mapa → Trasy → widoczna zapisana wyprawa → Zamknij planer → główna mapa → Trasy; zachowany widok wyprawy. Synchronizacja środka i zoomu obu map pozostaje otwarta.

## Integracja — lista Moje trasy, 27.11.2026, 09:38 CET
- PASS na Samsungu: lista zapisanych wypraw dostępna z osadzonego planera; nazwy, daty i liczba szkiców widoczne. Otwarcie Test 3 i Test 2 przywraca różne zapisane geometrie oraz dopasowuje widok mapy. Potwierdzone na trzech zrzutach; nie sprawdzano edycji ani usuwania w tym przypadku. Bez potrzeby ponownego routingu.
- UX: ujednolicić szerokości przycisków Otwórz / Edytuj / Usuń w kartach listy. Kolejny test: warstwy i formularz + Punkt na głównej mapie, bez zapisu nowych danych.
