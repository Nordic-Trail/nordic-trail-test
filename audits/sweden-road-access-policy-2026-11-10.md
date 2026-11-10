# NORDIC TRAIL — interpretacja dostępności dróg w Szwecji (szkic projektowy)

**Stan: 10 listopada 2026. Dokument analityczny, nie automatyczna certyfikacja legalności.**

## Zasady obowiązujące dla tras samochodowych

- Wskazanie przebiegu przez OSM/Valhalla oznacza jedynie możliwą geometrię sieci drogowej. Nie gwarantuje prawa przejazdu.
- Prawo **allemansrätten** nie daje uprawnienia do ruchu samochodowego po drogach prywatnych. Właściciel drogi prywatnej może zabronić ruchu pojazdów; trzeba respektować oznakowanie, szlabany i obowiązujące przepisy.
- Ruch samochodem w terenie poza drogami jest co do zasady zabroniony na gruncie bezśnieżnym. Samo istnienie śladu w OSM nie oznacza legalnej drogi.
- Oznaczenia dostępu z OSM, informacje z NVDB oraz lokalne przepisy z STFS/RDT mogą stanowić **materiał pomocniczy**; brak danych nie znaczy, że przejazd jest dozwolony.
- Dane o aktualnym stanie szlabanu lub zgłoszenia użytkowników wymagają osobnej weryfikacji, zanim można je publicznie przedstawiać jako sprawdzone.

## Proponowany schemat oceny dostępności

- `unknown`: domyślny; dostępność niepotwierdzona.
- `restriction_reported`: pojawiło się wiarygodne ograniczenie, nie ustala jeszcze wszystkich przepisów.
- `review_required`: dane sprzeczne albo brak aktualnego potwierdzenia.
- `verified_for_context`: potwierdzony **konkretny** stan informacji z datą i źródłem, lecz **bez gwarancji** możliwości przejazdu w przyszłości.

Nie tworzyć automatycznego statusu „droga legalna” na podstawie samego routingu lub kategorii własności NVDB. Nie obiecywać, że znaków i ograniczeń nie ma.

## Zalecana kolejność wdrażania

1. Utrzymać widoczne ostrzeżenie „dostępność niezweryfikowana”.
2. Zbudować słownik źródeł i identyfikatorów dla OSM, NVDB oraz STFS/RDT.
3. Dla wybranych dróg przeprowadzić ręczną walidację danych, dat obowiązywania i konfliktów.
4. Dopiero potem rozważyć półautomatyczne oznaczanie ograniczeń wraz z dowodem i datą aktualizacji.

## Oficjalne źródła

- Naturvårdsverket, *Allemansrätten på enskild väg*: https://www.naturvardsverket.se/amnesomraden/allemansratten/sa-gor-vi-allemansratt/enskild-vag/
- Naturvårdsverket, *Husvagn, husbil och taktält i naturen*: https://www.naturvardsverket.se/amnesomraden/allemansratten/sa-gor-vi-allemansratt/husvagn-husbil-och-taktalt-i-naturen/
- Naturvårdsverket, *Allemansrätten för markägare*: https://www.naturvardsverket.se/vagledning-och-stod/allemansratten/allemansratten-for-markagare/
- Transportstyrelsen, *Trafikföreskrifter*: https://www.transportstyrelsen.se/sv/vagtrafik/trafikregler-och-vagmarken/trafikregler/stfs-for-myndigheter-som-beslutar-trafikforeskrifter/om-stfs/trafikforeskrifter-/
