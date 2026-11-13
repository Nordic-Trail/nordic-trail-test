# NORDIC TRAIL — drogi według nawierzchni (Tumba–Lida)
Prototyp izolowany w \`staging-surfaces/\`, bez zmian w głównej aplikacji.

**Stan:** źródłowa paczka geometrii NIE jest jeszcze pobrana. Interfejs pokazuje komunikat o braku danych; nigdy nie rysuje wymyślonych dróg.

## Przygotowanie paczki OSM (jednorazowo, poza telefonem)
Na maszynie z Node.js 20+ oraz dostępem do sieci:
\`\`\`
node scripts/build_tumba_lida_surfaces.cjs
\`\`\`
Skrypt wykonuje pojedynczy ograniczony zapytaniem obszarowym POST do publicznego Overpass API i zapisuje:
\`staging-surfaces/data/tumba-lida-surface.geojson\`.
Przed zatwierdzeniem i opublikowaniem paczki należy ręcznie przejrzeć wyniki, liczbę obiektów i atrybucję. Jeśli źródło nie odpowie, niczego nie nadpisuje. Nie uruchamiać tego skryptu w przeglądarce.

Query obejmuje wyłącznie odcinki dróg z jawnym \`surface=*\`, nie ścieżki piesze ani wszystkie drogi w regionie. Brak danych nie dowodzi, że drogi nie ma. OSM \`surface\` i \`tracktype\` nie potwierdzają przejezdności ani uprawnienia do przejazdu.

Źródło: © OpenStreetMap contributors; ODbL. Zasady: https://www.openstreetmap.org/copyright
