# Szukacz nieruchomości

Katalog: `Projekty/audyt-nieruchomosci/szukacz-nieruchomosci`. Wersje: aplikacja w nagłówku (`APP.ver`), wtyczka w `manifest.json`; historia w `CHANGELOG.md`. Zapis rozmowy, w której powstało narzędzie, leży w `czat/`.

Trzy elementy, które pracują razem:

1. **Aplikacja** (`index.html`): budujesz profil poszukiwanej nieruchomości z filtrów i własnych kryteriów. Dostajesz gotowe wyszukiwania w grupach na Facebooku, w Google (z pominięciem Otodom, OLX i innych portali), na mapie biur z okolicy oraz w nietypowych źródłach (spółdzielnie, licytacje komornicze, przetargi gminne, syndycy).
2. **Wtyczka Chrome** (`wtyczka/`): ma dwa tryby.
   - **Skaner grup** (przycisk w okienku wtyczki): sam znajduje grupy dla Twojego miasta, a potem po kolei otwiera grupy z listy, przewija posty z ostatnich X dni, ocenia je według profilu i zbiera w jednej tabeli z filtrami i eksportem do CSV. Pamięta, co już widział, więc kolejny przebieg pokazuje tylko nowe.
   - **Skanuj tę stronę**: na dowolnej otwartej stronie (grupa, strona biura) ocenia widoczne ogłoszenia i zaznacza je ramką.

3. **Prompt dla asystenta AI** (przycisk 2 w aplikacji): tekst do wklejenia w Claude, Claude w Chrome albo ChatGPT z wyszukiwaniem. Zawiera wszystkie kryteria, zakaz portali z listy, gotowe adresy startowe i format odpowiedzi. Do asystenta wklejaj ten prompt, nie profil JSON, bo JSON nie niesie listy portali do pominięcia i asystent pójdzie na Otodom.

Strona w przeglądarce nie ma dostępu do Facebooka ani cudzych serwisów, więc samo pobieranie ogłoszeń robi wtyczka w Twojej zalogowanej sesji. Aplikacja nic nie wysyła na zewnątrz, profile trzyma lokalnie w przeglądarce.

## Uruchomienie aplikacji

Otwórz `index.html` dwuklikiem albo uruchom lokalny serwer:

```bash
python3 -m http.server 8768 --directory "szukacz-nieruchomosci"
```

i wejdź na `http://localhost:8768`.

## Instalacja wtyczki

1. W Chrome wejdź na `chrome://extensions`.
2. Włącz „Tryb dewelopera” (prawy górny róg).
3. Kliknij „Załaduj rozpakowane” i wskaż folder `szukacz-nieruchomosci/wtyczka`.
4. Przypnij wtyczkę do paska (ikona puzzla, pinezka).

## Logowanie do Facebooka

Skaner korzysta z Twojej zalogowanej sesji w Chrome. Zaloguj się sam na facebook.com w tej samej przeglądarce, w której jest wtyczka. Wtyczka nie zna hasła i nigdzie go nie wysyła. Jeśli nie jesteś zalogowany, skaner pokaże to na górze strony i zatrzyma się przy pierwszej grupie.

Posty w prywatnych grupach widzisz dopiero po dołączeniu. Skaner nie wysyła próśb o dołączenie, to robisz sam.

## Skaner grup krok po kroku

1. W aplikacji zbuduj profil i skopiuj go do wtyczki.
2. W okienku wtyczki kliknij „Skaner grup”. Otworzy się osobna karta.
3. „Znajdź grupy dla mojego miasta”: wtyczka otworzy wyszukiwarkę Facebooka w oknie roboczym, przejdzie kilka zapytań (typ nieruchomości + miasto, nieruchomości + miasto i miejscowości z profilu, ogłoszenia, bez pośredników) i zbierze grupy. Grupy z nieruchomościami w nazwie są na górze. Zaznacz te, do których należysz lub chcesz dołączyć, i dodaj do listy. Grupę bez związku z nieruchomościami odrzuć krzyżykiem, wtyczka jej więcej nie pokaże.
   - Grupy, których nazwa zawiera słowa z listy „Grupy na Facebooku do pominięcia” (aplikacja, sekcja „Źródła poza portalami”; domyślnie oddam, za darmo, gratis, praca i podobne), trafiają do zwiniętej listy „Pominięte po nazwie” i nie są skanowane. Lista słów zapisuje się z profilem.
   - Grupa usunięta z listy do skanowania zostaje zapamiętana jako odrzucona i nie wraca, także z profilu ani z listy źródeł. Przywrócisz ją w „Odrzucone grupy”.
4. Ustaw „Posty z ostatnich (dni)” i maksymalną liczbę postów na grupę. Kliknij „Skanuj grupy”.
5. Okno robocze zostaw otwarte (może być z tyłu). Facebook nie ładuje postów w zminimalizowanych kartach. Skaner otwiera każdą grupę w kolejności chronologicznej, przewija, aż trafi na posty starsze niż X dni, i przechodzi dalej po przerwie.
6. Wyniki: filtry „pasują”, „prawie”, „słabo”, „odpadły”, „tylko nowe”. Każdy wynik ma procent, powody, treść i link do posta. Ten sam post wrzucony do kilku grup pokazuję raz, z dopiskiem „też w: …”. „Eksport CSV” zapisuje wszystko do arkusza.
7. Grupy, z których nic nie dało się przeczytać (prywatne, do których nie należysz), skaner wypisuje po przebiegu z przyciskiem „Usuń je z listy”.
8. Po zmianie profilu (np. przełączeniu ceny na „może się zmienić”) kliknij „Przelicz według profilu”. Skaner oceni zapisane wyniki na nowo bez ponownego otwierania Facebooka.

Facebook nie lubi automatów. Skaner przewija jak człowiek i robi przerwy, ale trzymaj rozsądne liczby: kilka, kilkanaście grup na przebieg, jeden lub dwa przebiegi dziennie. Przy setkach grup Facebook może czasowo ograniczyć konto.

## Praca krok po kroku (tryb ręczny)

1. W aplikacji wypełnij filtry. Minimum to miasto. Im więcej liczb (cena, metraż, pokoje, piętro), tym ostrzej wtyczka odsiewa.
2. W sekcji „Własne kryteria” wpisz słowa wymagane, mile widziane i wykluczające. Wymagane trafiają w cudzysłów do Google, a we wtyczce brak takiego słowa odrzuca ogłoszenie.
3. Kliknij „Kopiuj profil do wtyczki”. Otwórz okienko wtyczki, kliknij „Wklej / zmień profil”, wklej, zapisz.
4. W panelu „Wyszukiwania” otwórz linki z sekcji Facebook. Znajdziesz grupy, dołącz do nich i wklej ich adresy w sekcji „Źródła poza portalami”. Podobnie z biurami: mapa Google pokaże biura z okolicy, wklej adresy stron z ich ofertami.
5. Zapisz profil pod nazwą (góra strony). Możesz mieć kilka, np. osobno kupno i wynajem.
6. Codziennie: zakładka „Twoje źródła”, „Otwórz wszystkie”. Na każdej karcie kliknij wtyczkę i „Skanuj tę stronę”. Na Facebooku możesz włączyć „skanuj sam”, wtedy ocenia posty w trakcie przewijania.

## Oferty i Znalezione (zakładki u góry)

Przełącznik u góry aplikacji ma trzy zakładki: „Profil wyszukiwania”, „Oferty” i „Znalezione”.

**Oferty** to baza ogłoszeń (`../baza-ogloszen/`): domy, które przeglądasz świadomie, ze statusem, historią cen i notatkami. Opis statusów i notatek jest w `baza-ogloszen/README.md`. Strona tylko pokazuje bazę; każda zmiana idzie przez rozmowę z Claude, który uruchamia `baza.js`. „+ Dodaj ogłoszenie”, „Zmień status”, „Dodaj notatkę” i „Sprawdź zmiany w ogłoszeniach” otwierają taką rozmowę z gotowym początkiem polecenia. Do bazy trafiają też ogłoszenia spoza szukacza: wystarczy podać Claude link albo opis. Po zmianie kliknij „Odśwież”.

- **Z wtyczki.** W Skanerze „Kopiuj oferty do aplikacji”, potem w zakładce Oferty pole „Wklej oferty z wtyczki albo listę linków” i „Dodaj do bazy przez Claude”. Linki idą prosto do rozmowy, a oferty z wtyczki strona zapisuje do pliku w Pobranych, który Claude importuje (`baza.js import`).
- **Dawne oferty z przeglądarki.** Do wersji 1.7 zakładka Oferty trzymała katalog w pamięci przeglądarki, z formularzem i własnymi statusami. Jeśli coś tam zostało, zakładka pokazuje ramkę „Przenieś do bazy przez Claude”. Statusy przechodzą tak: nowe → Nowe, do umówienia → Do kontaktu, przygotować raport → Analiza wstępna, czekam na spotkanie i po wizycie → Wizja lokalna, do decyzji → Zainteresowany, odpada → Niezainteresowany. Po imporcie usuń je z przeglądarki przyciskiem w tej samej ramce.

**Znalezione** to wszystko, co przyniosło szukanie przyciskiem „Szukaj nowych ogłoszeń z Claude”, także słabe i odrzucone (`znalezione.js`, dane w `dane/znalezione.json`). Każde ma numer `Z…`, datę znalezienia, profil, którym je znaleziono, i link. W polu szukania wpisz „Z10” albo „10”, żeby od razu znaleźć ogłoszenie, o którym Claude pisał w rozmowie. Przy ogłoszeniu jest „Dodaj do bazy” albo numer w bazie, jeśli już tam jest.

Zakładkę można otworzyć wprost z adresu: `index.html#oferty`, `index.html#znalezione`.

## Testy

- `node test/ocena.js`: ocena przykładowych ogłoszeń (odczyt liczb, kryteria twarde i elastyczne, sprzeczności).
- `test/fb-makieta.html?w=A|B|C|D|E` przez lokalny serwer: układy strony Facebooka (posty z komentarzami, starszy układ, post w okienku, Marketplace, układ z żywych grup z 15.11.2026). `&v=<plik kopii>` porównuje ze starszą wersją `content.js`.
- `test/skaner-makieta.html`: skaner grup z atrapą Chrome i Facebooka (wyszukiwanie grup, pomijanie, przebieg, duplikaty, przeliczanie).

## Kopia zapasowa

Przycisk „3. Zapisz kopię .json” zapisuje w jednym pliku bieżący profil i wszystkie zapisane profile. „Wczytaj kopię z pliku .json” odtwarza to na innym komputerze lub po wyczyszczeniu przeglądarki; profile dopisuje, nie kasuje istniejących. Ten sam przycisk wczyta też stary plik z samym profilem. Oferty ze starej kopii (sprzed 1.8) trafiają do ramki „Przenieś do bazy” w zakładce Oferty. Bazy ogłoszeń i listy znalezionych ta kopia nie obejmuje: one leżą w plikach (`baza-ogloszen/dane/`, `szukacz-nieruchomosci/dane/`), a skrypty same robią ich kopie przy każdym zapisie.

## Kryteria: „musi być spełnione” albo „może się zmienić”

Przy nagłówku każdej sekcji profilu jest przełącznik. Domyślnie wszystkie sekcje są ustawione na „musi być spełnione”. Kliknij, żeby zmienić na „może się zmienić”. Ustawienie zapisuje się z profilem i trafia do wtyczki oraz do promptu.

- **Musi być spełnione:** ogłoszenie poza widełkami albo sprzeczne z kryterium odpada.
- **Może się zmienić:** ogłoszenie lekko poza widełkami (cena i cena za m² do 15%, metraż i działka do 20%, pokoje, łazienki i piętro o jeden, rok budowy o 10 lat) albo z jedną cechą niezgodną (np. inny stan) trafia do kategorii **prawie pasuje**. Jeśli takich odchyleń jest więcej niż dwa albo przekroczenie jest większe, odpada.
- Typ nieruchomości, kupno lub wynajem, słowa wymagane i wykluczające oraz „rezerwacja / sprzedane” zawsze muszą się zgadzać.

Prompt dla asystenta dzieli kryteria na twarde, elastyczne i mile widziane i prosi osobno o 3–5 ogłoszeń prawie pasujących.

## Jak wtyczka ocenia ogłoszenie

- **Odrzuca** (czerwona ramka): słowo wykluczające, brak słowa wymaganego, ogłoszenie innego typu albo „szukam”, a przy kryteriach twardych także liczby poza widełkami i sprzeczności wprost z treści: inny stan niż akceptowany, inny rodzaj domu, „bez garażu”, „brak windy”, aneks przy oddzielnej kuchni, biuro przy „tylko bezpośrednio”, TBS, udział, wielka płyta, piec węglowy, „tylko gotówka”, hipoteka lub lokator (każde z tych, jeśli zaznaczone w profilu).
- **Prawie pasuje** (niebieska ramka): odchylenia od jednego lub dwóch kryteriów elastycznych. Dymek mówi, od których i o ile.
- **Punktuje** (zielona ramka od 50%): każde dopasowane kryterium daje punkty, np. cena w widełkach 3, metraż 2, pokoje 2, dzielnica 2, każde udogodnienie i słowo mile widziane 1. Procent to stosunek zdobytych punktów do możliwych.
- **Słabo** (pomarańczowa ramka): poniżej 50%. Najczęściej ogłoszenie nie podaje liczb ani cech, których szukasz. Brak wzmianki (np. o garażu) nie odrzuca, tylko obniża ocenę. Warto zerknąć ręcznie.

Dymek na ramce pokazuje, co się zgadza, co odbiega i czego brakuje. W okienku wtyczki kliknięcie wyniku przewija stronę do ogłoszenia.

Na Facebooku wtyczka ocenia sam post, bez komentarzy. Gdy post jest otwarty w okienku nad feedem, ocenia to okienko. Pola profilu ukryte dla wybranego typu (np. piętro przy domu) nie biorą udziału w ocenie.

## Ograniczenia, o których warto wiedzieć

- Tryb „Skanuj tę stronę” czyta tylko to, co jest załadowane na ekranie. Skaner grup przewija sam.
- Datę posta czyta z ukrytego opisu przy dacie („3 godz. temu”, „dzień temu”, „15 października”). Link do posta Facebook podaje dopiero po najechaniu myszką, więc wtyczka symuluje najechanie na datę. Jeśli daty nie rozpozna, post dostaje status „bez daty” i zostaje w wynikach, żeby nic nie przepadło.
- Facebook usuwa z pamięci strony posty, które zostały daleko w górze. Skaner zapisuje tekst, datę i link od razu, w trakcie przewijania.
- Na stronach biur rozpoznaje bloki, w których jest cena w zł i metraż w m². Strony z samymi zdjęciami i ceną w obrazku pominie.
- Liczby wyciąga z tekstu wyrażeniami regularnymi. Nietypowy zapis (np. „650k”) może nie zostać rozpoznany; wtedy ogłoszenie dostaje uwagę „nie widzę ceny” zamiast odrzucenia.
- Facebook zmienia strukturę strony. Wtyczka rozpoznaje posty na trzy sposoby (wpisy feedu, `role="article"` bez komentarzy, kontener treści posta), ale jeśli przestanie je widzieć, poprawka jest w `candidatesFB()` w `content.js`. Makieta `test/fb-makieta.html` pokazuje, jakie układy strony są obsłużone.
- Marketplace: wtyczka ocenia karty na liście wyników, nie otwiera pojedynczych ogłoszeń.
- Wyszukiwania „Otwórz wszystkie” wymagają zgody przeglądarki na wyskakujące okna dla tej strony.
- Ocena we wtyczce odrzuca posty, które nie wyglądają na ogłoszenie nieruchomości (brak typu, metrażu i liczby pokoi), ogłoszenia innego typu niż w profilu, ogłoszenia „szukam” oraz wynajem przy profilu kupna i odwrotnie. Jeśli coś cennego odpada, zobacz powód na ramce i rozluźnij profil.
