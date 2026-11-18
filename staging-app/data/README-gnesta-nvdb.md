# NVDB Gnesta/Klämmingen — pilotażowy snapshot mapy

## Metadane zapisane w zestawie

- Deklarowane źródło: Trafikverket NVDB.
- Deklarowana licencja w pliku: CC0 1.0.
- Data snapshotu zapisana w pliku: 2026-11-13.
- Obszar: test Gnesta/Klämmingen w Szwecji (geometrie w zakresie ok. 58.9987–59.1533 N, 17.1229–17.3404 E).
- Dane: geometrie LineString z atrybutem nawierzchni `grus`, bez potwierdzenia prawa przejazdu.
- 9 wstępnie powiązanych wpisów dotyczących tranzytu; dokładny zakres prawny, wyjątki i STFS pozostają niezweryfikowane.

## Kontrola jakości 2026-11-18

Pierwotny snapshot w tej gałęzi zawierał 765 rekordów. Rekord o identyfikatorze `38463` miał geometrię o zerowej długości: `[[17.313418,59.081165],[17.313418,59.081165]]`. Usunięto go z pliku warstwy wizualnej zamiast zgadywać prawdziwy przebieg drogi. W obecnym pliku znajdują się **764 poprawne pod względem niezerowej długości geometrie**. Liczba 9 wstępnych powiązań ograniczeń nie zmieniła się. Usunięty rekord nie miał takiego powiązania.

## Ograniczenia pochodzenia i wykorzystania

To opis metadanych zapisanych w bieżącym pliku, **nie niezależnie zweryfikowany łańcuch pochodzenia danych**. W repozytorium nie zidentyfikowano jeszcze dokładnej nazwy pakietu źródłowego, URL-u pobrania, daty eksportu oryginalnego zasobu, sumy kontrolnej nieprzetworzonego pliku ani powtarzalnego skryptu importu. Przed szerszą publikacją lub automatycznym odświeżaniem należy je udokumentować i sprawdzić warunki źródła.

Nie traktować `grus`, braku powiązanego ograniczenia ani deklaracji licencji jako potwierdzenia legalnego przejazdu. Nie potwierdzono również wiarygodnego przyporządkowania szerokości do poszczególnych odcinków; wartości te celowo nie są pokazywane w karcie.

Dane wykorzystywać wyłącznie w opcjonalnej, testowej warstwie odczytu. Brak zmian w Supabase, moderacji lub routingu.
