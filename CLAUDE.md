# Instrukcja dla asystenta

Ten plik ma pozwolić wejść w projekt bez czytania historii rozmów. Przeczytaj go w całości przed pierwszą edycją.

## Czym to jest

`index.html` to kompletna aplikacja w jednym pliku: HTML, CSS i JavaScript razem, bez zależności poza Leaflet z CDN. Ma działać bez serwera, po otwarciu z dysku, i po wrzuceniu na hosting statyczny. Właściciel to Paweł Ludwiczak, konsultant sprzedaży, który używa jej przy własnym zakupie domu.

## Zasady edycji — przeczytaj zanim cokolwiek zmienisz

**Zawsze rób kopię przed edycją.** W tym projekcie doszło raz do utraty 85% pliku, bo skrypt wyciął fragment między dwiema funkcjami, nie sprawdziwszy, co między nimi leży. Backupu nie było. Odbudowa zajęła godziny.

**Nigdy nie wycinaj po `h.index(A)` do `h.index(B)`**, jeśli nie masz pewności, że między A i B nie ma niczego więcej. Bezpieczna metoda: `assert` na dokładnym starym fragmencie i `replace`, nigdy wycinanie po zakresie.

**Po każdej zmianie sprawdź składnię:** wyciągnij blok `<script>` do pliku i uruchom `node --check`. Potem uruchom test funkcjonalny — wyeksportuj skrypt, podstaw atrapy `document`, `localStorage`, `window` i wywołaj `viewModule` dla każdej sekcji, `viewStart`, `viewReport`. Ten test wielokrotnie wyłapał realne błędy przed oddaniem pliku. Gotowe skrypty leżą w `test/`: `harness.js` (atrapy DOM i `fresh(ścieżka)`, które zwraca kontekst z `run(kod)`), `funk.js` (wszystkie widoki w kilku stanach), `regresja.js` (import z okna „Wklej wyniki”, z kolumnami „przed” po podaniu poprzedniej wersji jako drugiego argumentu) i `roundtrip.js` (eksport → import dla Notion, .txt, .csv). Zapisany audyt z prawdziwymi danymi podajesz w zmiennej `AUDYT_JSON`; trzymaj go poza repozytorium, bo repozytorium jest publiczne.

**Nie skracaj treści merytorycznej.** Opisy wad, instrukcje i kwoty są wynikiem researchu i weryfikacji. Jeśli coś wygląda na zbyt rozbudowane, zapytaj, zanim usuniesz.

## Struktura pliku

Kolejność w `index.html`:

1. `<head>` — style CSS, zmienne kolorów w `:root`
2. `<body>` — nagłówek z przyciskami, pasek zakładek, okno „Wklej wyniki”, kontener `#view`, dolny pasek podsumowania
3. `<script>` — cała logika w kolejności:
   - `S` — stan aplikacji, `save()` / `load()` na `localStorage`
   - `APP` — nazwa i wersja (podbijaj przy każdej zmianie funkcjonalnej)
   - `knownFacts()`, `promptFor()`, `promptModule()`, `promptAll()` — generatory promptów dla wtyczki Chrome
   - `zadaniaScreeningu()`, `promptScreening()` — prompt startowy screeningu
   - `togglePaste()`, `importGlobal()` — wspólne okno wklejania wyników
   - `wczytajOdpowiedz()`, `importScreening()` — jedno wklejenie odpowiedzi screeningu (wspólne z oknem „Wklej wyniki”)
   - `kodSpecjalny()`, `parseOgloszenie()`, `odmowaKodu()`, `ZASLEPKA_RE`, `scalZaslepki()`, `importUwagi()`, `naglowekKoncowki()`, `parseNotion()`, `applyAnswer()`, `parseTxt()`, `parseCsv()` — parsery odpowiedzi i komunikat po imporcie
   - `saveFile()`, `loadFile()`, `resetAll()`, `clearModule()` — zapis i czyszczenie
   - `R()`, `Y()`, `G()` — konstruktory flag; `$`, `esc`, `fmt`, `zl`, `dist` — narzędzia
   - `TRYBY`, `wTrybie()`, `checksTrybu()`, `modulyTrybu()` — zakres pytań w trybie
   - `flagsAll(core)`, `modFlagLevel()`, `paintBar()` — logika flag i podsumowania
   - **`const M = [...]`** — moduły i pytania, największy blok
   - `POIDEF` — definicje obiektów szukanych w OpenStreetMap
   - `LK()`, `linkChips()`, `linkList()`, `MODLINKS`, `toolbar()` — linki zewnętrzne
   - `tabItems()`, `render()`, `viewModule()`, `renderCheck()` — renderowanie
   - `viewWizyta()` (checklista oględzin), `kwCard()`, `promptKsiega()` (pełna księga), `poiCard()`
   - `viewStart()` złożony z `startDane()`, `startWybor()`, `startScreening()`, `startPelny()`, `startMapa()`, `startOferta()`, `startLista()`, `dopisekWtyczki()` (tekst wtyczki poza blokami, `S.imp`), `startWtyczka()`, `startJak()`; `drawMap()`
   - tryb i decyzja: `wybierzTryb()`, `poszerz()`, `odrzuc()`; werdykt wstępny: `werdyktScreening()`, `zdanieOCenie()`, `werdyktKarta()`
   - wyszukiwanie działki: `findAddr()`, `geocode()`, `uldk()`, `uldkPoId()`, `findId()`, `setLoc()`, `loadPOI()`
   - eksporty: `fieldChecks()`, `exportTxt()`, `exportCsv()`, `notionMd()`
   - moduł słoneczny: `sunPos()`, `sunDay()`, `sunGrid()` (astronomia), `pobierzBudynek()`, `cienBudynku()`, `rysunekCienia()` (geometria i SVG), `sunCard()` (widok w sekcji Grunt)
   - negocjacje: `negRows()`, `negState()`, `negSuma()`, `viewNeg()`
   - `viewReportScreening()`, `viewReport()` — raport krótki (screening) i pełny
   - `load(); render();` — start

## Model pytania

```js
{id:'b_azbest',            // unikalny kod, używany w eksportach i promptach — NIE ZMIENIAJ
 src:'wlasne',             // 'raport' = zwykle w płatnym raporcie o terenie, 'wlasne' = musisz sam
 mode:'field',             // semi | man | field | info — steruje etykietą i listą terenową
 q:'Czy na dachu jest eternit?',
 why:'Krótkie uzasadnienie, dlaczego to pytanie ma znaczenie.',
 type:'select',            // select | yn | text | info
 opts:[['nie','Nie ma'],['dach','Tak, na dachu domu']],
 flag:v=>{...},            // zwraca R()/Y()/G() albo null
 task:`...`,               // opcjonalnie: polecenie dla wtyczki Chrome
 manual:`...`,             // opcjonalnie: droga urzędowa, gdy automat zawiedzie
 help:`...`,               // instrukcja „jak to sprawdzić samodzielnie”
 core:true,                // opcjonalnie: pytanie należy do szybkiego screeningu
 scr:`...`}                // opcjonalnie: zadanie dla wtyczki w screeningu, zamiast task (zwykle odczyt z ogłoszenia)
```

Flagi: `R(tytuł, opis, kosztMin, kosztMax, argumentNegocjacyjny)`. Argument trafia do pisma negocjacyjnego, więc pisz go jako zdanie gotowe do wklejenia. `G()` przyjmuje tylko tytuł i opis.

Kody odpowiedzi (`opts[i][0]`) i `id` pytań są **kontraktem** — po nich parsery rozpoznają wyniki wklejane z wtyczki, Notion i plików. Zmiana kodu psuje zgodność ze starymi eksportami.

## Przepływ danych

```
adres / mapa / nr działki  →  S.parcel
        ↓
prompty (kopiuj)  →  wtyczka Chrome  →  odpowiedź  →  okno „Wklej wyniki”  →  S.a, S.n
        ↓
eksport listy terenowej (.txt/.csv/Notion)  →  telefon  →  import  →  S.a, S.n
        ↓
flagsAll()  →  paintBar() i viewReport()  →  wycena + pismo negocjacyjne
```

`importGlobal()` **dopisuje**, nie nadpisuje całości: pytania nieobecne w tekście zostają nietknięte. To celowe.

`parseNotion()` decyduje o kodzie dopiero na końcu bloku, po przeczytaniu notatki (od 3.7). Jeśli notatka jawnie odmawia wyboru (`odmowaKodu()`: „kodu nie wybieram”, „żadnego nie wybieram”, „bez kodu”), wiersz `[x]` z tego bloku nie wchodzi, a kod z wcześniejszej wklejki jest usuwany i wypisany w komunikacie; kod kliknięty ręcznie albo bez znacznika zostaje z ostrzeżeniem. Odmowa jednego konkretnego kodu („Kodu „studnia” nie wybieram”) nie liczy się jako odmowa całości. Pola tekstowe nie przyjmują zaślepek („brak w ogłoszeniu”, „n/d”, „wartość”): `applyAnswer()` odkłada je do `acc.zaslepki`, a `scalZaslepki()` dopisuje je na początek notatki. Nie wracaj do zaznaczania kodu od razu przy wierszu `[x]`: tak w 3.6 powstawały odpowiedzi sprzeczne z notatką, które wyglądały na rozstrzygnięte.

Tekst, który wtyczka dopisuje poza blokami odpowiedzi (zadania niedokończone, pytania do Pawła, podsumowanie sesji), nie trafia do notatek (od 3.8). Blok kończy się na wierszu `kody: …`, na nagłówku końcówki (`naglowekKoncowki()`: „Do dokończenia”, „Zadania niedokończone”, „Pytania na koniec”, samo „Podsumowanie:” w osobnym wierszu) albo na nagłówku `###` bez rozpoznanego kodu. Reszta idzie do `acc.koncowka` → `S.imp` i jest widoczna w komunikacie po imporcie oraz na karcie Start (`dopisekWtyczki()`), do usunięcia przyciskiem. Nagłówek `##` z eksportu Notion (nazwa sekcji) tylko zamyka blok. Nierozpoznany nagłówek `###` musi zamykać blok: w 3.7 zostawiał poprzednie pytanie otwarte i kolejny wiersz `[x]` nadpisywał jego odpowiedź.

Screening ma skróconą drogę: `promptScreening()` → wtyczka → jedno wklejenie → `wczytajOdpowiedz()` → blok `ogl` do `S.ogl` (odczyt ogłoszenia; do `S.meta` tylko w puste pola albo gdy pole też pochodziło z ogłoszenia), odpowiedzi do `S.a`/`S.n`, blok `werdykt` do `S.scr.komentarz` → `werdyktScreening()`.

## Tryby

`S.tryb`: `''` (nie wybrano, widać tylko Start), `screening` albo `pelny`. Zapisuje się w JSON. `migruj()` otwiera audyt sprzed 3.0 jako pełny, jeśli ma odpowiedzi albo notatki.

- Do screeningu należy pytanie z `core:true`. `wTrybie()` filtruje pytania w widokach, bilansie, pasku i prompcie sekcji. `flagsAll()` bez argumentu idzie za trybem, `flagsAll(true)` liczy zawsze same pytania podstawowe (tak liczy werdykt wstępny, także po poszerzeniu).
- Odpowiedzi pytań ukrytych nigdy nie są kasowane. `poszerz()` zmienia tryb na `pelny` i zapisuje `S.decyzja={v:'dalej',ts}`. Przejście w drugą stronę nie istnieje, za to werdykt wstępny jest dostępny z raportu pełnego (`RAP_WIDOK='screening'`, zmienna widoku, nie stanu).
- Pole `scr` zastępuje `task` tylko w prompcie screeningu. Pisz je tak, żeby wtyczka nie wybierała kodu na podstawie milczenia ogłoszenia.
- Zakładka Oględziny i Negocjacje istnieją tylko w trybie pełnym. Pełna treść księgi siedzi w `S.kw` i trafia do `promptKsiega()`.
- **Ogłoszenie i audyt to dwa źródła, nie scalaj ich.** `S.ogl` trzyma odczyt ogłoszenia, `S.meta` twoje dane (z nich idą obliczenia). `rozbieznosci()` zestawia je obok siebie, z ewidencją dla działki, a `uwagiSpojnosci()` dokłada niepewne dopasowanie i inną działkę wskazaną przez wtyczkę. Rozjazd jest ustaleniem (pomyłka, inna oferta, zawyżone parametry), więc pokazuj go nad werdyktem i nie pozwalaj mu dać zielonego światła. W 3.1 ogłoszenie nadpisywało wpis i ta informacja ginęła.

**Kody odpowiedzi w promptach zawsze z opisem** (`opisKodow()`, format `kod = opis`). Same nazwy kodów wtyczka interpretuje po swojemu i wybiera źle. Przy tak/nie opis w aplikacji jest równy kodowi („tak = Tak”), a wtyczka uznała to za brak opisu i odmówiła wyboru; dlatego `OPIS_YN` daje w prompcie „Tak, odpowiedź twierdząca na pytanie z nagłówka”, a etykiety przycisków zostają krótkie.

## Decyzje projektowe i ich powody

**Jeden plik.** Ma działać offline, z pendrive'a, bez budowania. Nie dziel na moduły bez wyraźnej prośby.

**Kolejność sekcji w eksporcie ≠ kolejność zakładek.** Zakładki są ułożone logicznie, `FIELD_ORDER` w eksportach idzie za przebiegiem spotkania: najpierw to, co widzisz i o co pytasz, na końcu dokumenty czytane w domu.

**Lista terenowa** to `src==='wlasne'` **lub** `mode==='field'`. Nawet jeśli raport poda rodzaj gruntu, na miejscu i tak patrzysz, czy w rowie stoi woda.

**Wycena obniżki opiera się na dolnej granicy** szacunków, nie na sumie górnych. Suma najgorszych scenariuszy daje kwotę nie do obronienia w rozmowie. Do tego twardy limit 15% ceny — powyżej niego narzędzie mówi wprost, że pytanie brzmi „czy kupować", nie „ile utargować".

**Pismo negocjacyjne bierze 5 najmocniejszych argumentów,** nie wszystkie. Długa lista pretensji zamyka rozmowę.

**Ponowne kliknięcie zaznaczonej opcji ją odznacza.** Bez tego przypadkowy klik zostawał w audycie jako potwierdzona odpowiedź i zawyżał kompletność.

## Moduł słoneczny

Pozycja słońca liczona lokalnie, bez API — algorytm w `sunPos()` daje dokładność setnych części stopnia.
Sprawdzian poprawności: górowanie w przesilenie zimowe musi wynosić `90 − szerokość − 23,44`, w letnie
`90 − szerokość + 23,44`, w równonoc `90 − szerokość`. Jeśli te trzy liczby się zgadzają, algorytm działa.

Uwaga na pułapkę, która już raz wystąpiła: `Date.UTC` obcina ułamkowe godziny, więc czasy liczy się
przez dodanie milisekund do północy (`utcOf()`), nigdy przez podanie ułamka w argumencie godziny.

**Cienie z otoczenia (od 3.5) liczą się z NMPT GUGiK** (model pokrycia terenu: dachy i korony drzew, oczko 0,5 m).
Usługa WCS (`NMPT_URL`, `NMT_URL`) działa, ale nie wysyła nagłówka CORS, więc strona daje link do wycinka, a człowiek
pobiera plik `result.asc` i wczytuje go przyciskiem (`wczytajModel()` → `parseAsc()` → `przyjmijModel()`). Nie próbuj
pobierać tego `fetch`-em ani przez wtyczkę (za dużo liczb do przepisania). Model siedzi w `S.nmpt` i opcjonalnie `S.nmt`
(Int16 w decymetrach, base64), w pamięci w `NMPT_MEM` z pamięcią podręczną wyników w `g.cache`.
Współrzędne: `doPL92()` / `zPL92()` (Gauss-Krüger, GRS80). Sprawdzian: narożniki działki 302104_2.0010.259/26
muszą wyjść w PL-1992 z dokładnością do 0,5 m wobec geoportalu (np. N 517765,99 / E 362723,37).
Cień: `maskaCienia()` idzie od komórki w stronę słońca i sprawdza, czy coś wystaje ponad promień (próg 0,3 m).
Bez wczytanego modelu karta wraca do wersji z jednym budynkiem (`sunCardProsta()`) i wysokością z ręki, a na jej górze
stoi wyróżniona ramka pobierania (`modelBlok()`, klasa `modelcta`). Nie chowaj jej niżej: w 3.5 zwykła ramka ginęła
i karta wyglądała, jakby nowej wersji nie było.
Google Photorealistic 3D Tiles odpada: płatne, ograniczone do dużych miast, a klucz API w publicznym repozytorium to wyciek.

## Ograniczenia techniczne — nie próbuj ich obchodzić

- **Księgi wieczyste mają captcha.** Żaden automat ich nie odczyta. Prompt dla `kw_nr` zakłada, że numer i captcha wpisuje człowiek. W screeningu numer bierze się z ogłoszenia (`scr`), a pełną treść człowiek wkleja w karcie księgi.
- **Dane właścicielskie z ewidencji nie są publiczne.** Grupa rejestrowa działki drogowej wymaga telefonu do wydziału geodezji.
- **Atrybuty EGiB bywają puste** także w geoportalach powiatowych (sprawdzone na powiecie poznańskim). To norma, nie awaria — instrukcje muszą to uwzględniać.
- **Przy otwarciu z `file://`** przeglądarka blokuje zapytania sieciowe. Wyszukiwanie adresu, ULDK i skan okolicy działają dopiero po wrzuceniu na hosting. Kod ma to obsłużone komunikatami, nie „naprawiaj” tego.
- **Kafelki OpenStreetMap z `file://` są blokowane** (OSM wymaga nagłówka Referer, którego plik z dysku nie wysyła). Dlatego domyślny podkład to ortofotomapa GUGiK z działkami KIEG (`warstwyMapy()`), a OSM jest dostępny tylko na hostingu. Nie wracaj do OSM jako jedynego podkładu.
- **Wtyczka Claude w Chrome** bywa zablokowana ustawieniami konta lub organizacji. Wtedy nie pomoże żadna zmiana promptu.

## Styl tekstów w aplikacji

Polszczyzna naturalna, nie kalka z angielskiego. Strona czynna zamiast biernej, czasownik zamiast rzeczownika odczasownikowego. Bez korpo-fraz i bez myślników em w środku zdania jako pauzy. Ton partnerski, nie pouczający: „warto pamiętać”, nie „tylko pamiętaj”. Konkret zamiast metafory. Kwoty zawsze w widełkach, nigdy jednej liczby.

## Przy każdej zmianie

1. Kopia pliku przed edycją.
2. Zmiana.
3. `node --check` na wyciągniętym skrypcie.
4. Test funkcjonalny wszystkich widoków: `node test/funk.js`. Po zmianach w parserach i eksportach także `node test/regresja.js index.html <kopia poprzedniej wersji>` i `node test/roundtrip.js`. Nowy przypadek z życia dopisz do `CASES` w `regresja.js`, zanim naprawisz błąd.
5. Podbicie `APP.ver` i wpis w `CHANGELOG.md`.

## Baza ogłoszeń (`baza-ogloszen/`)

Osobne narzędzie obok aplikacji: lista domów, które Paweł już widział, ze statusem i historią cen. Opis dla Pawła w `baza-ogloszen/README.md`. Gdy Paweł wkleja link do ogłoszenia (albo kilka) bez innego polecenia, dodaj je do bazy:

1. Otodom: `node baza-ogloszen/baza.js dodaj <link>`. Skrypt sam czyta dane ze strony.
2. Inne portale: odczytaj stronę (web-fetch albo przeglądarka; OLX odrzuca zwykłe zapytania, Facebook wymaga logowania, wtedy poproś o treść posta) i podaj pola: `dodaj <link> cena=… miejscowosc=… gmina=… ulica=… metraz=… dzialka=… pokoje=… rok=… typ=dom`. Pól, których ogłoszenie nie podaje, nie zgaduj, tylko je pomiń.
3. Przekaż wynik zwykłym zdaniem. MOŻLIWY DUPLIKAT (kod wyjścia 2) niczego nie zapisuje: porównaj zdjęcia albo opis obu ogłoszeń i zapytaj, czy to ten sam dom (`--do N`), czy inny (`--nowy`).
4. Status: `status N <status> [powód]`. Przy odrzuceniu dopytaj o powód, jeśli go nie podał, bo powód jest tym, co oszczędza mu czas przy kolejnym trafieniu.
5. Notatki mają rodzaj i strona pokazuje je na wierzchu karty, każdy rodzaj w osobnej ramce. Przypisz rodzaj sam, z sensu zdania: wahanie, obawa, „nie wiem, czy” → `waham N <tekst>`; coś do sprawdzenia, zapytania, dokument do obejrzenia → `sprawdzic N <tekst>`; ścieżka do pliku albo link do raportu → `raport N "<ścieżka|link>" [opis]` (ścieżkę w cudzysłowie, bo bywają spacje); reszta → `notatka N <tekst>`. Gdy Paweł pisze, że coś sprawdził albo wątpliwość odpadła, zamknij punkt z wynikiem: `zamknij N <nr notatki> <wynik>` (numery pokazuje `pokaz N`). Nie usuwaj notatek, które się zdezaktualizowały, tylko je zamykaj; `usun-notatke` służy do pomyłek.

Przyciski na stronie bazy („+ Dodaj ogłoszenie”, „Zmień status”) otwierają nową rozmowę w zakładce Code linkiem `claude://code/new?folder=…&q=…` z gotowym początkiem polecenia: „Dodaj do bazy ogłoszeń: …” albo „Baza ogłoszeń, #N (miejscowość, cena): zmień status na …”. Traktuj je jak wklejony link albo polecenie zmiany statusu. Folder projektu strona bierze z `window.BAZA_FOLDER`, który `baza.js` zapisuje w `dane/baza-widok.js`.

Dane leżą w `baza-ogloszen/dane/` (w `.gitignore`, repozytorium jest publiczne). Nie commituj ich, nie publikuj jako Artifact i nie wysyłaj nigdzie. Zmieniaj je tylko przez `baza.js`: skrypt robi kopię przed każdym zapisem i odświeża plik dla `index.html`. Kody statusów (`nowe`, `analiza`, `kontakt`, `wizja`, `zainteresowany`, `niezainteresowany`) są kontraktem z widokiem i plikiem danych. Po zmianie w `baza.js` uruchom `node baza-ogloszen/test/test.js`.
