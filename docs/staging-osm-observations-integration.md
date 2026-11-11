# NORDIC TRAIL — opcjonalne warstwy OSM na STAGING (wersja robocza)

Izolowana funkcja widoczna wyłącznie na gałęzi roboczej; nie opublikowano na main / GitHub Pages. Cel: obsłużyć trzy warstwy z audytu Tumba–Lida, bez pytania Overpass podczas pracy użytkownika.

- W STAGING trzy nowe przełączniki są **domyślnie wyłączone**.
- Włączenie pierwszej warstwy odczytuje wyłącznie `staging-app/data/tumba-lida.json` z tego samego serwera.
- Paczka zawiera 66 oznaczeń OSM (29 barier, 26 dróg z tagami, 11 ścieżek). Wpisy są niezweryfikowane; przypisanie do dróg nie oznacza prawnego zakazu ani fizycznej przejezdności.
- Marker drogi wskazuje **przybliżony środek odcinka**, nie przebieg drogi ani zakres przepisu.
- Przycisk „Pokaż Tumba–Lida na mapie” jest jedyną czynnością przesuwającą widok w obszar próby.
- Kliknięcie oznaczenia otwiera czytelną, półprzezroczystą kartę źródła OSM (id, tagi, daty, link oryginalny).
- Brak zmian kont, RLS, moderacji, zapisu punktów, tras i GPX.
- Paczka i przegląd szczegółów są całkowicie oddzielone od zatwierdzonych punktów Supabase.
- Brak automatycznego importu do Supabase; nie oznaczamy dróg jako „legalnie dostępnych”.
- Źródło ODbL: https://www.openstreetmap.org/copyright
- Podstawowe porównanie 9 wybranych rekordów ze źródłem: https://github.com/Nordic-Trail/nordic-trail-test/actions/runs/43070914987

Ta gałąź/PR wymaga testów, ręcznej oceny wizualnej oraz osobnego zatwierdzenia przed scaleniem.
