# Audyt Nieruchomości

Narzędzie do samodzielnego audytu domu z działką przed zakupem. Jeden plik HTML, działa w przeglądarce, bez serwera i bez konta.

**Wersja:** 1.7 · **Stan prawny:** sierpień 2026

## Co robi

Prowadzi przez 68 punktów kontrolnych w dziesięciu sekcjach: grunt, księga wieczysta, plan zabudowy, budynek, wnętrze, media, dojazd, środowisko, sąsiedztwo i cena. Dla każdej odpowiedzi wylicza flagę ryzyka (czerwona, żółta, zielona) i szacunkowy koszt usunięcia wady. Na końcu generuje kartę audytu z werdyktem, wyceną i gotowym pismem negocjacyjnym.

**Co robi automatycznie:** znajduje działkę po adresie, współrzędnych lub numerze ewidencyjnym, pobiera dane z ULDK, skanuje okolicę w promieniu 3 km przez OpenStreetMap (fermy, kopalnie, składowiska, drogi szybkiego ruchu, kolej, linie wysokiego napięcia, ale też szkoły i sklepy).

**Czego nie robi:** nie czyta ksiąg wieczystych (captcha), nie zna danych właścicielskich z ewidencji (nie są publiczne), nie oceni stanu technicznego budynku. To zostaje po twojej stronie.

## Podział pracy

22 z 68 pytań dotyczy danych, które znajdziesz w płatnym raporcie o terenie (100–300 zł). Pozostałe 46 to księga wieczysta, stan budynku i rozmowy — tego żaden raport nie zrobi. Raport pokazuje oba zakresy osobno, z kosztami wad w każdym.

## Jak używać

1. Otwórz `index.html` w przeglądarce (albo wejdź na wersję online, jeśli włączone GitHub Pages).
2. Wskaż nieruchomość: adres, klik w mapę albo numer działki.
3. Wypełnij dane oferty (cena, powierzchnie, rok budowy) — zasilają prompty i wycenę.
4. Sekcje sprawdzane w rejestrach mają gotowe **prompty dla wtyczki Claude w Chrome**. Kopiujesz, wklejasz do wtyczki, odpowiedź wklejasz z powrotem w oknie „Wklej wyniki".
5. Przed oględzinami wyeksportuj listę terenową (`.txt`, `.csv` albo dla Notion) i wypełnij na telefonie.
6. Po powrocie wczytaj wyniki i wygeneruj raport.

Dane zapisują się w przeglądarce automatycznie. Przycisk „Zapisz" eksportuje plik JSON — używaj go do przenoszenia audytu między urządzeniami i do porównywania kilku nieruchomości.

## Wdrożenie na GitHub Pages

W ustawieniach repozytorium: **Settings → Pages → Source: Deploy from a branch → main → / (root)**.

Po chwili aplikacja będzie pod adresem `https://<nazwa-konta>.github.io/<nazwa-repo>/`.

To rozwiązuje dwa problemy naraz: działa na telefonie i znika blokada zapytań sieciowych, którą przeglądarka nakłada na pliki otwierane z dysku (`file://`). Dopiero wtedy wyszukiwanie adresu, ULDK i skan okolicy działają w pełni.

**Uwaga:** GitHub Pages dla repozytoriów prywatnych wymaga płatnego planu. Na darmowym koncie repozytorium musi być publiczne. Aplikacja nie zawiera żadnych danych osobowych — wszystko, co wpiszesz, zostaje w twojej przeglądarce.

## Prywatność

Aplikacja nie ma serwera i nie wysyła twoich odpowiedzi nigdzie. Dane audytu trzymane są wyłącznie w `localStorage` przeglądarki i w plikach, które sam wyeksportujesz. Zapytania wychodzą tylko do publicznych usług mapowych (Nominatim, ULDK, Overpass, kafelki OpenStreetMap) i zawierają wyłącznie adres albo współrzędne.

## Źródła danych

Geoportal krajowy i geoportale powiatowe (EGiB), ULDK (GUGiK), Nominatim, Overpass API (OpenStreetMap), Hydroportal ISOK, SOPO (PIG), Geoserwis GDOŚ, Rejestr Cen Nieruchomości, przeglądarka ksiąg wieczystych.

## Podstawa merytoryczna

Zakres kontroli opracowano m.in. w oparciu o workbook „Samodzielny audyt działki" Marcina Jaremki (BezpiecznyGrunt.pl), rozszerzony o moduł stanu technicznego budynku i zaktualizowany o stan prawny z sierpnia 2026.

## Zastrzeżenie

Narzędzie pomocnicze. Nie zastępuje opinii prawnej, operatu rzeczoznawcy majątkowego ani ekspertyzy technicznej. Szacunki kosztów są orientacyjne i służą przygotowaniu do negocjacji.
