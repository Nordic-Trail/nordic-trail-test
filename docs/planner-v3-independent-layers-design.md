# NORDIC TRAIL — Planer wypraw v3: niezależne warstwy samochodowa i piesza

Status: **projekt i analiza ryzyk, NIE wdrożenie**  
Data: 22.11.2026  
Repozytorium: Nordic-Trail/nordic-trail-test  
Projekt odizolowany od danych staging v1/v2 i wersji produkcyjnej.

## Cel

Pozwolić osobno planować i edytować odcinki **samochodowe** i **piesze** oraz zobaczyć je wspólnie na jednej mapie, we właściwej kolejności wyprawy. Ukrywanie warstwy nie usuwa ani nie modyfikuje danych. Przypadkowa edycja jednej warstwy nie może przesuwać ani usuwać punktów drugiej.

## Ustalona koncepcja

1. Wyprawa jest kontenerem: nazwa, uporządkowana lista etapów oraz osobne zestawy etapów dwóch trybów.
2. Każdy etap (leg) ma jednoznaczny tryb `drive` lub `walk`, własny start, punkty pośrednie, metę, geometrię (szkic / wyznaczoną trasę), etykiety i stabilny identyfikator.
3. Dopuszczalne sekwencje: samochód → pieszo → samochód; pieszo → pieszo; sam samochód; samo pieszo; wiele nawrotów i ponowne odwiedzanie tych samych lokalizacji.
4. **Warstwy służą do filtrowania widoczności, a tryb edycji do wybrania obiektu do modyfikacji**. Są to osobne stany. W trybie „Cała wyprawa” można oglądać wszystkie etapy; wybranie etapu do edycji przełącza na jego tryb.
5. Punkty parkingu lub przesiadki są **dwoma niezależnymi punktami**, powiązanymi opcjonalnym „miękkim” łącznikiem. To NIE jest współdzielony obiekt współrzędnych. Zmiana punktu A nie przesuwa B.
6. Zmiana kolejności etapów aktualizuje wyłącznie plan podróży i uruchamia kontrolę ciągłości. Nie przenosi geometrii żadnej warstwy.
7. „Cofnij” działa lokalnie na ostatnią operację i obejmuje pełen stan etapu oraz powiązań; „Anuluj” nie usuwa zapisu bez potwierdzenia.

## Szkic danych v3

```json
{
  "version": 3,
  "name": "Wyprawa do jeziora",
  "legs": {
    "c1": {
      "mode": "drive",
      "points": [
        {"id":"c1-start","role":"start","lat":59.0,"lon":17.0},
        {"id":"c1-end","role":"finish","lat":59.1,"lon":17.1}
      ],
      "geometry": {"status":"draft","points":[]}
    },
    "w1": {
      "mode": "walk",
      "points": [
        {"id":"w1-start","role":"start","lat":59.1,"lon":17.1},
        {"id":"w1-via","role":"via","lat":59.11,"lon":17.11},
        {"id":"w1-end","role":"finish","lat":59.1,"lon":17.1}
      ],
      "geometry": {"status":"draft","points":[]}
    },
    "c2": {
      "mode": "drive",
      "points": [
        {"id":"c2-start","role":"start","lat":59.1,"lon":17.1},
        {"id":"c2-end","role":"finish","lat":59.0,"lon":17.0}
      ],
      "geometry": {"status":"draft","points":[]}
    }
  },
  "itinerary": ["c1","w1","c2"],
  "links": [
    {"fromPointId":"c1-end","toPointId":"w1-start","kind":"transfer"},
    {"fromPointId":"w1-end","toPointId":"c2-start","kind":"return-to-car"}
  ]
}
```

Przykładowe współrzędne wyłącznie ilustrują strukturę — nie są zweryfikowaną trasą. W implementacji geometria i cache muszą mieć wersjonowanie, walidację schematu oraz ograniczenia wielkości.

## Interfejs

- Górny panel: nazwa wyprawy; zakładki / przyciski **Samochód**, **Pieszo**, **Cała wyprawa**; mapa.
- Filtry „pokaż samochód” i „pokaż pieszo” działają niezależnie od tego, który etap jest edytowany. Włączenie obu = widok łączny; wyłączenie obu = sama mapa z jasnym stanem warstw.
- Panel wybranego etapu: **Start**, **+ Punkt pośredni**, **Cel**, **Edytuj trasę**, **Wyznacz trasę**.
- Widok całej wyprawy: lista etapów w kolejności (C1 → W1 → C2), status połączeń i suma danych, możliwość otwarcia pojedynczego etapu do edycji.
- Przy kliknięciu nakładających się punktów: wybór punktu i warstwy zamiast automatycznej edycji „tego z góry”.
- Kolor samochód: niebieski; pieszy: zielony; status szkic/wyznaczone odróżniony wzorem linii. Zatwierdzone ikony pozostają wzorcem.
- „Zapisz”, „Pobierz plik trasy” + objaśnienie GPX pod przyciskiem.

## Kontrola ciągłości i kolizji logicznych

Nie łączymy punktów automatycznie bez zgody. Sprawdzamy:
- Czy koniec poprzedniego etapu i start następnego zgadzają się w przestrzeni (wstępny próg informacyjny np. 25 metrów, do testów, z uwzględnieniem precyzji mapy). Próg nie dowodzi istnienia przejścia.
- Czy po pieszej wycieczce samochód znajduje się w miejscu rozpoczęcia kolejnego odcinka jazdy; przy niezgodności pokaż „Samochód pozostał przy poprzednim parkingu”.
- Czy punkt przesiadki został przesunięty w jednej warstwie: łącznik ma status wymagający ponownej weryfikacji; drugiej warstwy nie zmieniamy.
- Czy edycja / usunięcie punktu unieważnia wyznaczoną geometrię tylko odcinków tego etapu. Cache indeksowany etapem, trybem, końcami i profilem routingu; nie wolno przez przypadek podstawić cudzej geometrii.
- Czy w kilku warstwach punkty się nakładają lub dwie linie krzyżują: to informacja graficzna, a NIE dowód kolizji drogowej ani legalnego połączenia. Mosty, tunele, szlaki i drogi mogą się krzyżować bez możliwości przejścia.
- Czy użytkownik nie wyłączył warstwy, którą próbuje edytować: jasna informacja lub świadome włączenie widoczności, bez cichego przestawiania filtru.
- Czy zmiana globalnej kolejności etapów nie sprawia, że plan zaczyna się / kończy w niezamierzonym miejscu.
- Czy bez wyznaczenia geometrii linia prosta nie jest prezentowana jako dostępna lub legalna droga.

Ostrzeżenia mają 3 stany: brak stwierdzonej niespójności, możliwa niespójność (przejrzyj), niespójność logiczna (wymaga rozwiązania). Nie blokujemy bez powodu ręcznego planowania; zapis szkicu możliwy z oznaczeniem problemów.

## Słabe strony projektu i zalecane poprawki

| Ryzyko | Skutek | Działanie |
|---|---|---|
| Osobne starty i cele podwajają punkty parkingów | pozorna niespójność mapy | łączniki miękkie + wspólna pinezka z wyborem warstwy w dymku |
| Samochód → spacer w jedną stronę → samochód z innego miejsca | plan zakłada niedostępny pojazd | kontrola lokalizacji pozostawionego auta i alert przy wznowieniu jazdy |
| Dwa przełączniki widoczności mylone z wyborem trybu edycji | edycja złej trasy | osobny, wyraźny stan edycji; brak edycji całej wyprawy jedną operacją |
| Zmiana kolejności etapów | przerwanie ciągłości, nieaktualny przebieg | ponowna walidacja transferów, bez automatycznej zmiany geometrii |
| Mapa z nakładającymi się punktami i liniami | brak kontroli nad zaznaczeniem | selektor punktów, z-index i wyróżnianie aktualnego etapu |
| GPX w innych programach może zgubić kolejność wielu tras | myląca kolejność / nawigacja | `trk` osobno dla każdego etapu, nazwy z numerem, trybem i statusem; test importu; opcjonalny osobny GPX na warstwę |
| „Szkic po prostej” mylony z przejezdną drogą | błąd bezpieczeństwa | wyraźna linia przerywana, brak eksportu szkiców jako gotowych tras nawigacyjnych bez ostrzeżenia |
| Import starych wypraw | nadpisanie danych lub pomylenie trybów | osobny klucz v3, import tworzący KOPIĘ, weryfikacja i możliwość powrotu do v2 |
| Zewnętrzny serwer routingu | ujawnienie koordynatów | istniejąca wyraźna zgoda, limit żądań; brak kluczy, nazw kont i zapisu w chmurze |
| Dane NVDB/STFS nie pokrywają każdej drogi | mylne zapewnienie o legalności | wyłącznie udokumentowane źródła + organ + link + aktualność; bez domniemania przejezdności |

## Testy akceptacyjne — scenariusze

1. Edycja punktu pieszej trasy nie zmienia żadnego punktu ani geometrii samochodowej.
2. Edycja parkingu samochodowego nie przestawia automatycznie startu hiking; łącznik wymaga sprawdzenia.
3. Po ukryciu warstwy i włączeniu jej ponownie dane są identyczne.
4. C1 → W1 → C2: poprawny widok wszystkich etapów i ich kolejności, powrót do zaparkowanego samochodu.
5. Przesunięcie mety pieszego etapu daleko od parkingu wyzwala ostrzeżenie, ale nie zmienia tras.
6. Odcinki krzyżujące się graficznie na mapie nie są automatycznie łączone.
7. Cofnij/Anuluj/Zapisz działają na właściwym zakresie, bez utraty danych innej warstwy.
8. GPX zawiera osobne ślady C1, W1, C2 i czytelną numerację.
9. Import v1/v2 nie nadpisuje oryginału; wyjście z testu nie modyfikuje aktywnych zapisów.
10. W ograniczonym stanie offline/bez serwera można edytować i zapisać szkic, ale nie udawać wyznaczenia trasy online.

## Zakres i koszty

**MVP testowy:** osobny model v3, dwie warstwy z oddzielną edycją, lista etapów wyprawy, miękkie łączniki i informacja o nieciągłości, zapis lokalny, podgląd mapy i podstawowy eksport GPX. Bez nowej płatnej usługi i bez zmian w Supabase.

**Po MVP:** automatyczne proponowanie transferów, rozbudowane testy dostępu na podstawie NVDB/STFS, planowanie wielodniowe, zaawansowane eksporty i offline. Nie obiecywać analizy prawnej ani automatycznej pewności przejazdu.

## Warunek przed wdrożeniem

Najpierw zatwierdzić schemat i testy, następnie stworzyć izolowany prototyp oraz automatyczne testy modelu. Dopiero po przejściu testów i ocenie UX na Samsungu rozważyć scalenie. Aktualny planer v2 pozostaje nietknięty.
