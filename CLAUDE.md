# Instrukcja dla asystenta

Ten plik ma pozwolić wejść w projekt bez czytania historii rozmów. Przeczytaj go w całości przed pierwszą edycją.

## Czym to jest

`index.html` to kompletna aplikacja w jednym pliku: HTML, CSS i JavaScript razem, bez zależności poza Leaflet z CDN. Ma działać bez serwera, po otwarciu z dysku, i po wrzuceniu na hosting statyczny. Właściciel to Paweł Ludwiczak, konsultant sprzedaży, który używa jej przy własnym zakupie domu.

## Zasady edycji — przeczytaj zanim cokolwiek zmienisz

**Zawsze rób kopię przed edycją.** W tym projekcie doszło raz do utraty 85% pliku, bo skrypt wyciął fragment między dwiema funkcjami, nie sprawdziwszy, co między nimi leży. Backupu nie było. Odbudowa zajęła godziny.

**Nigdy nie wycinaj po `h.index(A)` do `h.index(B)`**, jeśli nie masz pewności, że między A i B nie ma niczego więcej. Bezpieczna metoda: `assert` na dokładnym starym fragmencie i `replace`, nigdy wycinanie po zakresie.

**Po każdej zmianie sprawdź składnię:** wyciągnij blok `<script>` do pliku i uruchom `node --check`. Potem uruchom test funkcjonalny — wyeksportuj skrypt, podstaw atrapy `document`, `localStorage`, `window` i wywołaj `viewModule` dla każdej sekcji, `viewStart`, `viewReport`. Ten test wielokrotnie wyłapał realne błędy przed oddaniem pliku.

**Nie skracaj treści merytorycznej.** Opisy wad, instrukcje i kwoty są wynikiem researchu i weryfikacji. Jeśli coś wygląda na zbyt rozbudowane, zapytaj, zanim usuniesz.

## Struktura pliku

Kolejność w `index.html`:

1. `<head>` — style CSS, zmienne kolorów w `:root`
2. `<body>` — nagłówek z przyciskami, pasek zakładek, okno „Wklej wyniki”, kontener `#view`, dolny pasek podsumowania
3. `<script>` — cała logika w kolejności:
   - `S` — stan aplikacji, `save()` / `load()` na `localStorage`
   - `APP` — nazwa i wersja (podbijaj przy każdej zmianie funkcjonalnej)
   - `knownFacts()`, `promptFor()`, `promptModule()` — generatory promptów dla wtyczki Chrome
   - `togglePaste()`, `importGlobal()` — wspólne okno wklejania wyników
   - `parseNotion()`, `parseTxt()`, `parseCsv()`, `applyAnswer()` — parsery odpowiedzi
   - `saveFile()`, `loadFile()`, `resetAll()`, `clearModule()` — zapis i czyszczenie
   - `R()`, `Y()`, `G()` — konstruktory flag; `$`, `esc`, `fmt`, `zl`, `dist` — narzędzia
   - `flagsAll()`, `modFlagLevel()`, `paintBar()` — logika flag i podsumowania
   - **`const M = [...]`** — moduły i pytania, największy blok
   - `POIDEF` — definicje obiektów szukanych w OpenStreetMap
   - `LK()`, `linkChips()`, `linkList()`, `MODLINKS`, `toolbar()` — linki zewnętrzne
   - `render()`, `viewModule()`, `renderCheck()`, `poiCard()` — renderowanie
   - `viewStart()`, `drawMap()` — sekcja startowa i mapa
   - wyszukiwanie działki: `findAddr()`, `geocode()`, `uldk()`, `findId()`, `setLoc()`, `loadPOI()`
   - eksporty: `fieldChecks()`, `exportTxt()`, `exportCsv()`, `notionMd()`
   - moduł słoneczny: `sunPos()`, `sunDay()`, `sunGrid()` (astronomia), `pobierzBudynek()`, `cienBudynku()`, `rysunekCienia()` (geometria i SVG), `sunCard()` (widok w sekcji Grunt)
   - negocjacje: `negRows()`, `negState()`, `negSuma()`, `viewNeg()`
   - `viewReport()` — raport końcowy
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
 help:`...`}               // instrukcja „jak to sprawdzić samodzielnie”
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

Wysokość budynku jest wpisywana ręcznie, bo GUGiK udostępnia punktowe API tylko dla NMT (teren),
nie dla NMPT (pokrycie terenu). Google Photorealistic 3D Tiles odpada: płatne, ograniczone do dużych miast,
a klucz API w publicznym repozytorium to wyciek.

## Ograniczenia techniczne — nie próbuj ich obchodzić

- **Księgi wieczyste mają captcha.** Żaden automat ich nie odczyta. Prompt dla `kw_nr` zakłada, że numer i captcha wpisuje człowiek.
- **Dane właścicielskie z ewidencji nie są publiczne.** Grupa rejestrowa działki drogowej wymaga telefonu do wydziału geodezji.
- **Atrybuty EGiB bywają puste** także w geoportalach powiatowych (sprawdzone na powiecie poznańskim). To norma, nie awaria — instrukcje muszą to uwzględniać.
- **Przy otwarciu z `file://`** przeglądarka blokuje zapytania sieciowe. Wyszukiwanie adresu, ULDK i skan okolicy działają dopiero po wrzuceniu na hosting. Kod ma to obsłużone komunikatami, nie „naprawiaj” tego.
- **Wtyczka Claude w Chrome** bywa zablokowana ustawieniami konta lub organizacji. Wtedy nie pomoże żadna zmiana promptu.

## Styl tekstów w aplikacji

Polszczyzna naturalna, nie kalka z angielskiego. Strona czynna zamiast biernej, czasownik zamiast rzeczownika odczasownikowego. Bez korpo-fraz i bez myślników em w środku zdania jako pauzy. Ton partnerski, nie pouczający: „warto pamiętać”, nie „tylko pamiętaj”. Konkret zamiast metafory. Kwoty zawsze w widełkach, nigdy jednej liczby.

## Przy każdej zmianie

1. Kopia pliku przed edycją.
2. Zmiana.
3. `node --check` na wyciągniętym skrypcie.
4. Test funkcjonalny wszystkich widoków.
5. Podbicie `APP.ver` i wpis w `CHANGELOG.md`.
