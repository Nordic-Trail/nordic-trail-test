# ORS — kontrola warunków przed integracją, 27.11.2026

Status: GO dla testów offline na danych syntetycznych; HOLD dla integracji publicznego API z danymi użytkowników, trwałego zapisu wyników ORS i eksportu GPX do czasu wyjaśnienia warunków.

## Ustalenia
- https://api.heigit.org/ — bezpłatny klucz Standard; API wymaga uwierzytelnienia.
- https://staging.openrouteservice.org/plans/ — opublikowany cennik Standard: Directions 2000/dzień, 40/min; aktualne limity sprawdzić w panelu konta przed wdrożeniem.
- https://staging.openrouteservice.org/restrictions/ — maksymalnie 50 waypointów na zapytanie Directions.
- https://playground.heigit.org/ — dokumentacja POST Directions GeoJSON, nagłówek Authorization.
- https://ask.openrouteservice.org/t/free-plan-in-an-app-with-a-paid-tier-license-cc-by-sa-4-0-personal-data-and-attribution-questions/8079/ — odpowiedź przedstawiciela 12.10.2026: dopuszczalne wykorzystanie komercyjne Standard, wyniki CC BY-SA 4.0, dostawca nie rozstrzyga kwalifikacji danych osobowych.
- https://ask.openrouteservice.org/t/persistent-storage-and-commercial-reuse-of-directions-api-route-geometry/8057 — odpowiedź 21.09.2026: w sprawie trwałego przechowywania geometrii skontaktować się bezpośrednio.
- https://ask.openrouteservice.org/t/standard-plan-commercial-use-attribution-caching-and-licensing-questions/8137 — odpowiedź 02.11.2026 odsyła do aktualnych warunków konta HeiGIT.
- https://ask.openrouteservice.org/t/permitted-use-of-user-location-coordinates-via-server-for-walking-directions/8159 — odpowiedź przedstawiciela 17.11.2026 nie rozstrzyga kwalifikacji danych osobowych.
- https://account.heigit.org/ — aktualnych pełnych ToS i panelu limitów nie udało się odczytać; starszy URL ToS zwracał 403. Nie uznawać kontroli prawnej za zakończoną.

## Pytania do dostawcy (przed integracją)
1. Czy Standard pozwala na lokalny, bezterminowy zapis geometrii wyznaczonych tras i ich ponowne otwieranie?
2. Czy użytkownik może eksportować te wyniki jako GPX do innych aplikacji? Jakie dokładnie oznaczenia źródła i licencji należy zachować na mapie i w GPX?
3. Czy dozwolone jest przekazywanie wybranych przez użytkownika współrzędnych za pośrednictwem backendu, bez identyfikatorów użytkownika? Jakie ograniczenia obowiązują dla danych mogących stanowić dane osobowe, np. GPS lub miejsca zamieszkania?
4. Czy nadal obowiązują 2000 Directions/dzień, 40/min oraz 50 punktów na zapytanie? Czy Standard jest odpowiedni dla ograniczonego MVP testowego?

## Zasady techniczne
- Brak kluczy w repozytorium i frontendzie; brak rzeczywistych zapytań podczas tego etapu.
- Oddzielna gałąź ORS i izolacja danych dostawców/profili. Zachować main i backup Valhalla.
- Testy syntetyczne dozwolone, bez wykorzystywania danych osobowych.
- Nie obiecywać braku kosztów eksploatacji ani dostępności usługi; brak wydatków na obecnym etapie.
- Jeżeli warunki nie pozwalają na kluczowe funkcje, ocenić self-hosting i innych dostawców przed podjęciem decyzji finansowej.
