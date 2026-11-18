# NORDIC TRAIL — lokalny podgląd na Macu

Prace dotyczą wyłącznie lokalnej kopii repozytorium i roboczej gałęzi `feature/nvdb-gnesta-layer-20261118`. Nie wymagają łączenia PR #31, zmiany `main`, zapisywania danych do Supabase ani dostępu do haseł.

## Etap 1: bezpieczna kontrola środowiska

Otwórz **Terminal** w macOS i sprawdź:

```sh
sw_vers
uname -m
git --version
python3 --version
node --version
```

To zapytania diagnostyczne; brak programu nie oznacza problemu. Jeśli macOS zaproponuje instalację narzędzi deweloperskich, nie trzeba jej automatycznie zatwierdzać przed ustaleniem, co jest potrzebne. Wersja macOS i architektura procesora określają możliwości późniejszych instalacji. Nie wysyłaj haseł, tokenów, kluczy tajnych ani zawartości katalogów prywatnych.

## Etap 2: pobranie roboczej wersji — jeśli Git działa

```sh
mkdir -p "$HOME/Projects"
cd "$HOME/Projects"
git clone --branch feature/nvdb-gnesta-layer-20261118 --single-branch https://github.com/Nordic-Trail/nordic-trail-test.git
cd nordic-trail-test
git status --short --branch
```

Operacje powyżej dotyczą plików w katalogu domowym Maca. Nie publikują żadnych zmian i nie wymagają dostępu do prywatnych kluczy GitHub w tym **publicznym** repozytorium. Jeśli folder `nordic-trail-test` już istnieje, nie ponawiaj `git clone` na ten sam katalog; najpierw sprawdź zawartość.

## Etap 3: lokalny podgląd bez edycji i logowania

Jeżeli `python3 --version` zakończyło się pomyślnie:

```sh
cd "$HOME/Projects/nordic-trail-test"
python3 -m http.server 8765 --bind 127.0.0.1
```

Otwórz lokalnie w przeglądarce:

- `http://127.0.0.1:8765/staging-app/` — wersja mapy z roboczą warstwą NVDB;
- `http://127.0.0.1:8765/staging-nvdb/` — inne eksperymentalne komponenty.

Serwer jest dostępny tylko z tego Maca dzięki `--bind 127.0.0.1`. Zatrzymanie: `Ctrl+C` w Terminalu. Podkład OSM i biblioteka Leaflet nadal mogą wymagać dostępu do Internetu.

**Uwaga:** lokalny adres nie jest opublikowaną domeną STAGING. W tym etapie nie loguj się na konta testowe Supabase z lokalnego podglądu; autoryzację/RLS sprawdzaj osobno w zatwierdzonym środowisku GitHub Pages.

## Etap 4: testy deweloperskie — dopiero po kontroli zgodności Maca

Repozytorium nie ma pliku `package.json`, a testy przeglądarkowe są uruchamiane przez GitHub Actions z tymczasowo instalowanymi `puppeteer-core` i `leaflet` oraz przeglądarką Chrome. Nie instaluj automatycznie Node, Chrome, Homebrew ani Xcode tylko na potrzeby pierwszego podglądu.

Po potwierdzeniu wersji macOS można ustalić kompatybilne wersje narzędzi, wymaganą ilość miejsca oraz uruchamiać analogiczne testy bez danych rzeczywistych.

## Przechowywanie i bezpieczeństwo

- Pierwszą kopię kodu trzymaj na wewnętrznym dysku Maca; nie wymagamy zewnętrznych dysków ze zdjęciami.
- Nie zapisuj danych logowania, sekretnych kluczy Supabase ani plików `.env` w publicznym repozytorium.
- Nie zakładaj, że NVDB `grus` oznacza legalny przejazd. Warstwa nadal jest pilotażowa i prawnie niezweryfikowana.
- Błąd doczytywania kafelków Leaflet podczas przesuwania mapy pozostał osobnym otwartym zagadnieniem.
