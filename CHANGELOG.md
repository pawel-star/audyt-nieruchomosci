# Historia zmian

## 2.13
- **Prompty dla pięciu krytycznych punktów, które dotąd ich nie miały.** Po 2.12 zostało 16 krytycznych pytań bez promptu; z tego pięć da się realnie zasilić danymi z rejestrów: `g_geo` (otwory wiertnicze z Centralnej Bazy Danych Geologicznych i Szczegółowa Mapa Geologiczna Polski, plus głębokość zwierciadła wody z Banku Danych Hydrogeologicznych), `g_woda` (cieniowanie rzeźby z NMT, wysokości punktowe, ortofotomapy archiwalne, rowy melioracyjne), `b_samowola` (obrysy z kartoteki budynków EGiB porównane z aktualną i archiwalną ortofotomapą), `b_pokrycie` i `b_azbest` (odczyt połaci ze zdjęć lotniczych plus gminna inwentaryzacja wyrobów azbestowych z BIP).
- **Nowy tryb pytania: `obs:true`, prompt obserwacyjny.** Punktu, którego zdjęcie lotnicze nie rozstrzyga, nie da się uczciwie odhaczyć zdalnie. Taki prompt ma wprost zakaz wybierania odpowiedzi: zbiera materiał do notatki i mówi, na co popatrzeć podczas oględzin, a kod wybiera człowiek na miejscu. Dotyczy `g_woda`, `b_pokrycie`, `b_azbest`. Przy azbeście dochodzi osobny zakaz pisania, że azbestu nie ma — brak prążkowania na zdjęciu niczego nie wyklucza.
- Format odpowiedzi w `promptFor()`, `promptModule()` i prompcie zbiorczym rozpoznaje punkty obserwacyjne i nie prosi dla nich o wiersz z `[x]`. Znacznik sprawdzenia i tak powstaje, bo bierze się z zapisanej notatki.
- **Prompt zbiorczy dla całego audytu (`promptAll()`).** Dwa przyciski na widoku Start: „co zostało” pomija punkty już sprawdzone, „wszystko” bierze komplet. Zadania idą sekcjami, każde z numerem i oznaczeniem, czy dotyczy punktu krytycznego, a nagłówek prosi wtyczkę o zwrócenie tego, co zdążyła, i wypisanie numerów zadań niedokończonych.
- Blok „TRYB PRACY”, powielony dotąd w `promptFor()` i `promptModule()`, wyszedł do stałej `TRYB_PRACY` używanej też przez prompt zbiorczy. Trzy kopie tego samego tekstu rozjeżdżały się przy każdej poprawce.
- Razem: 29 pytań z promptem zamiast 14 przed 2.12, w tym 18 z 30 krytycznych. Reszta krytycznych to księga wieczysta (captcha), dokumenty od sprzedającego i oględziny wnętrza — tych nie da się sprawdzić zdalnie i aplikacja nie udaje, że da.
- Sprawdzone: `node --check` oraz test funkcjonalny na audycie Rokietnicy — wszystkie widoki, prompt zbiorczy w obu wariantach, format punktów obserwacyjnych w prompcie pojedynczym, sekcyjnym i zbiorczym.

## 2.12
- **Nowy stan punktu: „sprawdzone, bez rozstrzygnięcia”.** Prompt dla wtyczki sam każe zostawić samą notatkę, gdy rejestr nic nie podaje — a stan aplikacji miał tylko odpowiedzi (`S.a`) i notatki (`S.n`), więc taki punkt wracał na listę „do uzupełnienia”, jakby nikt się nim nie zajął. Doszło pole `S.s` ze znacznikiem `{ts, src}` (`prompt` / `import` / `reczne` / `archiwum`), ustawianym automatycznie przy każdej skutecznej odpowiedzi i przy każdej zapisanej notatce, w `applyAnswer()`, `parseNotion()`, `parseTxt()`, `parseCsv()` oraz przy ręcznym wpisie w `set()` i `note()`.
- **Migracja starych audytów (`migruj()`).** Wczytanie pliku sprzed 2.12 odtwarza znaczniki tam, gdzie jest notatka, a nie ma odpowiedzi — bez daty, ze źródłem „ze starszego zapisu”. Na audycie Rokietnicy daje to 8 znaczników i podnosi liczbę sprawdzonych punktów z 7 na 9.
- Karta pytania pokazuje pasek „Sprawdzone <data>, bez rozstrzygnięcia”, metryczkę przy notatce oraz przyciski „Oznacz jako sprawdzone” i „Cofnij znacznik sprawdzenia”.
- **Waga pytania liczona z definicji flag (`isCrit()`).** Krytyczne jest pytanie, którego którakolwiek odpowiedź potrafi zapalić czerwoną flagę, plus dwa wyjątki wpisane ręcznie: `kw_nr` i `b_ekspert`. Wychodzi 30 krytycznych z 69. Bez drugiej, ręcznie utrzymywanej listy, która i tak by się rozjechała przy pierwszej zmianie flagi.
- **Pasek bilansu na górze każdej sekcji** (`bilansPasek()`): ile punktów sprawdzonych, ile z tego bez rozstrzygnięcia, ile zostało krytycznych, a ile uzupełniających.
- **Raport rozdziela „sprawdzone” od „rozstrzygniętych”.** Tabela nagłówkowa ma obie liczby, tabela podziału pracy pokazuje je w formacie „sprawdzone / rozstrzygnięte”. Werdykt „audyt niekompletny” liczy się od sprawdzonych, bo brak rozstrzygnięcia w rejestrze nie jest zaniedbaniem.
- Nowa sekcja raportu „Sprawdzone, bez rozstrzygnięcia” (tabela z datą sprawdzenia), a dawne „Do uzupełnienia” zamieniło się w „Do zrobienia” z podziałem na krytyczne przed decyzją i warte sprawdzenia. Punkt ze znacznikiem nie trafia już do obu miejsc naraz.
- Sekcja „Notatki z oględzin” to teraz „Notatki ze sprawdzeń”: pogrupowane po sekcjach, każda ze źródłem i datą odczytu.
- **Naprawione pismo negocjacyjne przy wadach bez wyceny.** Gdy wszystkie flagi pochodzą ze skanu okolicy i mają zerowe kwoty, pismo generowało zdania „koszt co najmniej 0 zł” i „proponuję 1 090 000 zł zamiast 1 090 000 zł”. Teraz zdanie o koszcie znika, a zamiast propozycji ceny wchodzi zdanie o rozmowie o cenie z uwzględnieniem wskazanych okoliczności.
- **Eksport do Notion obejmuje wszystkie 69 punktów, nie 55.** Poprzednia wersja brała tylko `fieldChecks()`, więc na kartę nie trafiał ani jeden punkt sprawdzany promptem — czyli dokładnie te, w których siedzą najdłuższe notatki z rejestrów.
- Karta w Notion ma stały nagłówek (adres, działka, nazwa pliku audytu, data eksportu, liczniki) i instrukcję aktualizacji. Każdy punkt to blok ze stałym nagłówkiem `### pytanie \`id\``, wierszem `**Status:**` i notatką z prefiksem źródła — po `id` podmieniasz pojedynczy blok, zamiast nadpisywać stronę i tracić uwagi dopisane ręcznie.
- Nowy przycisk „Notion: tylko zmiany” (`exportNotionDiff()`) kopiuje wyłącznie bloki zmienione od ostatniego eksportu; odciski treści trzyma `S.exp`. Przy każdym pytaniu doszedł przycisk „Kopiuj blok dla Notion”.
- `parseNotion()` czyta wiersz `**Status:**` z powrotem, więc znacznik sprawdzenia razem z datą wraca do audytu. Prefiks źródła jest zdejmowany przy imporcie i dokładany przy eksporcie, więc się nie mnoży przy kolejnych rundach.
- **Dziesięć nowych promptów dla wtyczki**, z 14 na 24 pytania: `g_spadek` (NMT), `g_historia` (ortofotomapy archiwalne), `u_prad`, `u_woda`, `u_kanal`, `u_gaz` (GESUT — jeden odczyt wypełnia teraz pięć punktów Mediów, wcześniej tylko `u_przez`), `d_szer` i `d_utrzym` (uchwała o kategorii dróg plus pomiar pasa drogowego), `s_smog` (pomiary GIOŚ z progami decyzyjnymi), `n_plany` (BIP gminy, zarządy dróg wojewódzkich i powiatowych, nie tylko GDDKiA).
- Przy okazji naprawione: `g_historia` miało `mode:'semi'`, czyli badge półautomatu, ale nie miało żadnego promptu. Pytania z promptem, które nie są `semi`, dostały osobny badge „prompt”.
- Sprawdzone: `node --check` na wyciągniętym skrypcie oraz test funkcjonalny na prawdziwym audycie Rokietnicy — wszystkie widoki i obie ścieżki eksportu, round-trip eksport do Notion i z powrotem (odpowiedzi, notatki i znaczniki wracają bez zmian), migracja starego pliku, brak zdań o zerowych kwotach w piśmie.

## 2.11
- **Prompty dla wtyczki Claude w Chrome mają teraz wprost zgodę na zaklikanie bannera z cookies albo regulaminem, który zasłania mapę.** Sekcja „TRYB PRACY” w `promptFor()` i `promptModule()` (czyli w każdym prompcie, który kopiujesz do wtyczki) zabraniała dotąd akceptowania jakichkolwiek regulaminów w ogóle — co w praktyce blokowało wtyczkę, gdy trafiała na baner z cookies albo regulaminem serwisu (geoportal, ULDK i podobne rejestry często je pokazują, zanim odsłonią mapę) i zatrzymywało całą sesję do ręcznej interwencji.
- Nowe brzmienie: baner zasłaniający mapę można zaklikać — to jedyny wyjątek od zasady „tylko odczyt”. Reszta zakazów zostaje bez zmian: żadnych formularzy, żadnego logowania, niczego nie zapisujesz.
- Dopisany punkt 4 w karcie „Wtyczka przerywa i pyta o zgodę? Ustaw ją raz” (widok Start), żeby ta sama informacja była widoczna też w interfejsie, nie tylko w treści promptu.

## 2.10
- **Naprawiony realny bug: budynek „skakał” po kafelku między dwunastoma sytuacjami.** `rysunekCienia()` liczyła dopasowanie (skalę i środek rysunku) osobno dla każdego kafelka, na podstawie bieżącego obrysu, cienia i działki *razem* — a że sam cień ma zupełnie inny zasięg zależnie od pory (4–66 m w przykładzie testowym), bounding box był za każdym razem inny. Efekt: budynek wyglądał, jakby zmieniał pozycję i wielkość między kafelkami, chociaż naprawdę stoi na działce w jednym miejscu — zmienia się tylko cień.
- Nowa funkcja `ramaWspolna(obrys, dzialka, cienie, R, pad)` liczy skalę i środek rysunku **raz**, dla całej siatki dwunastu sytuacji naraz — bierze pod uwagę obrys, działkę i wszystkie dwanaście możliwych cieni jednocześnie (żeby żaden się nie obciął), a wynik (`{R,pad,cx,cy,s}`) jest przekazywany do `rysunekCienia()` jako ostatni argument zamiast dawnego `rozmiar`.
- `rysunekCienia()` bez przekazanej ramy liczy dopasowanie lokalnie jak poprzednio (zachowana ścieżka awaryjna na wypadek innego wywołania w przyszłości) — w `sunCard()` rama jest przekazywana zawsze.
- Konsekwencja świadoma i zamierzona: skala jest teraz taka sama we wszystkich dwunastu kafelkach, dopasowana do najdłuższego możliwego cienia — więc w sytuacjach z krótkim cieniem (wysokie słońce w południe) budynek zajmuje mniejszą część kafelka niż w poprzedniej wersji, za to naprawdę stoi w tym samym miejscu co we wszystkich pozostałych jedenastu.
- Sprawdzone: `node --check` na wyciągniętym skrypcie oraz ponowny render w headless Chromium — porównanie zrzutów przed i po pokazuje budynek w identycznym miejscu i rozmiarze we wszystkich renderowanych kafelkach, zmienia się tylko cień, niebo i pozycja słońca.

## 2.9
- **Grafika nasłonecznienia pokazuje teraz światło, nie tylko geometrię cienia.** `rysunekCienia()` w module „Grunt" rysował dwanaście identycznych, płasko-granatowych kafelków niezależnie od tego, czy to mroźne południe w grudniu, czy lipcowy wieczór — sama pozycja i długość cienia były policzone poprawnie (`cienBudynku()`, bez zmian), ale rysunek tego nie pokazywał. Geometria cienia i cała astronomia (`sunPos`, `sunDay`, `sunGrid`) zostają dokładnie takie jak były — zmienia się wyłącznie warstwa graficzna.
- Nowa funkcja `barwyNieba(alt)` (z tabelą progów `NIEBO_STOPY` i interpolacją `mixHex()`) liczy kolor nieba i światła z wysokości słońca: ciepły, bursztynowy przy horyzoncie, chłodny i jasny błękit w południe.
- Pozycja słońca jest teraz widoczna na rysunku — mały glif ze szpilkami promieni, ustawiony biegunowo (kąt = azymut, promień maleje z wysokością słońca), nie tylko opisana tekstem pod spodem.
- Budynek ma teraz gradient ściana-oświetlona/ściana-zacieniona wzdłuż osi słońce-cień (`gradientUnits="userSpaceOnUse"`), zamiast jednolitego niebieskiego wypełnienia.
- Miękka poświata (`radialGradient`) wokół pozycji słońca sugeruje, jak pada światło na teren, bez zmiany samego, dokładnie policzonego kształtu cienia.
- Pełna róża kierunków (N/E/S/W) zamiast samego „N”.
- Teren w obliczeniach pozostaje płaski — to świadoma decyzja: GUGiK nie udostępnia ukształtowania terenu (NMPT) przez darmowe API, a płatne opcje (Google Photorealistic 3D Tiles) są ograniczone do dużych miast. Adnotacja o tym w karcie „Nasłonecznienie i cienie” zostaje bez zmian.
- Sprawdzone: `node --check` na wyciągniętym skrypcie oraz renderowanie w headless Chromium (Playwright) dla przykładowej lokalizacji — wszystkie warianty czterech pór roku i trzech pór dnia rysują się bez błędów konsoli, w tym poprawne pominięcie rysunku, gdy słońce jest pod horyzontem.

## 2.8
- **Naprawiony bug: ręczna zmiana kwoty przy wadzie nie odświeżała propozycji cen do negocjacji.** Wpisanie nowej kwoty przy pojedynczej wadzie woła `negPaint()`, nie pełny `render()` — to celowe, żeby nie tracić fokusu i kursora w polu, w którym akurat piszesz. Tyle że `negPaint()` odświeżał tylko sumę wad i cenę po korekcie, a trzy sugerowane ceny („Pierwsza oferta”, „Cena docelowa”, „Granica”) razem z podpisami „Sugestia X zł” oraz ocena atrakcyjności ceny wobec rynku były liczone wyłącznie przy pełnym renderze widoku Negocjacje — czyli zostawały nieaktualne, dopóki nie przełączyłeś zakładki i nie wróciłeś. To samo dotyczyło ostrzeżenia o przekroczeniu 20% ceny ofertowej.
- Wydzieliłem liczenie tych trzech cen (`sugCeny()`) i oceny atrakcyjności (`ocenaCeny()`) do osobnych funkcji, używanych teraz zarówno przy pełnym renderze, jak i przez `negPaint()` po każdej zmianie kwoty — jedna logika w jednym miejscu, żeby te dwie ścieżki nie mogły się rozjechać w przyszłości.
- Pole sugerowanej ceny nadal chowa się, gdy sam wpiszesz tam własną kwotę — automat nadpisuje tylko wartość, której jeszcze nie tknąłeś ręcznie.
- Sprawdzone scenariuszem end-to-end: zmiana kwoty przy wadzie w locie przelicza sumę, obie sugerowane ceny (z podpisem i wartością pola), pokazuje lub chowa ostrzeżenie o 20% i zmienia werdykt oceny rynkowej, bez przechodzenia przez pełny render widoku.

## 2.7
- **Naprawiony realny bug: pole na nazwę własnej wady w Negocjacjach było praktycznie niewidoczne.** Przyczyna była w CSS, nie w JS: generyczna reguła `input[type=text]{width:100%}` ma wyższą specyficzność niż `.negkw{width:112px}` (selektor z atrybutem bije sam selektor klasy), więc pole na kwotę rozciągało się na 100% szerokości wiersza zamiast trzymać stałe 112 px, zabierając całe miejsce polu na nazwę i wypychając samo pole kwoty poza widoczny obszar ekranu. Poprawka: `.negkw` → `input.negkw`, ta sama specyficzność co reguła ogólna, a że jest zapisana niżej w arkuszu, teraz to ona wygrywa. Sprawdzone przeliczeniem specyficzności w jsdom (przed poprawką pole liczyło się na `100%`, po poprawce na `112px`) i end-to-end w prawdziwej przeglądarce na wersji online.
- **To ten sam bug odpowiadał za drugie zgłoszenie: „nowe wady nie trafiają do promptu wyceny".** Sama logika (`wycPozycje`, `promptWyceny`) działała poprawnie i uwzględniała dopisane pozycje, tylko z powodu niewidocznego pola nazwa nigdy realnie nie została wpisana, więc pozycja zostawała bez tytułu i filtr słusznie ją pomijał. Po naprawie pola nowe pozycje trafiają do promptu od razu, bez dodatkowej zmiany w logice.
- **Lista „Wady wykryte w audycie" podzielona na dwie sekcje.** Wcześniej wszystkie wady z audytu (czerwone i żółte) trafiały na jedną listę w kolejności modułów, niezależnie od tego, czy miały policzoną kwotę. Teraz na górze jest osobna sekcja „Wady z policzoną kwotą — zaznaczone automatycznie", posortowana malejąco po kwocie, czyli dokładnie te, które `negState()` domyślnie włącza do obniżki z automatu. Niżej osobna sekcja „Pozostałe uwagi z audytu, bez wyceny" (czerwone przed żółtymi) na to, co jest realne, ale nie ma jeszcze kwoty w złotówkach. Sama logika zaznaczania się nie zmieniła, zmieniła się tylko kolejność i podział wyświetlania.

## 2.6
- **Nowy obiekt w skanie okolicy: przepompownia ścieków.** Dotąd POI z OpenStreetMap łapały tylko oczyszczalnię (`wastewater_plant`), a przepompownia to inny obiekt (`pumping_station`) i mniejsza skala uciążliwości: możliwy zapach przy awarii lub upale, niewielki hałas silnika, promień 400 m zamiast 1500 m dla oczyszczalni.
- **Pytanie o inwestycje drogowe (`n_plany`) poprawione u źródła.** Wcześniej wskazywało tylko mapę GDDKiA, która pokazuje wyłącznie drogi krajowe. Obwodnice łączące drogi wojewódzkie (częsty przypadek) w ogóle się tam nie pojawiają. Doszedł link do zarządu dróg wojewódzkich (budowany z województwa działki) i do aktualności gminy/miasta, bo urzędy lokalne ogłaszają harmonogram i etapy budowy wcześniej niż ogólnopolskie mapy inwestycyjne. Treść pytania tłumaczy teraz też, że nowa trasa bywa plusem (ruch znika ze starej drogi) albo minusem (nowe źródło hałasu bliżej domu) zależnie od przebiegu względem działki, więc samo „tak, coś się planuje” nie wystarcza za ocenę.
- **Nowe pytanie w module Cena: `c_cechy`.** Porównanie ceny za m² z transakcjami czy ofertami w okolicy ma sens tylko przy zbliżonych udogodnieniach. Pytanie każe rozdzielić dwa najczęściej pomijane czynniki: brak garażu (koszt budowy dziś 50 000–120 000 zł) i różnicę w standardzie wykończenia (stan deweloperski kontra dom gotowy, różnica 200 000–350 000 zł) — bez tego porównanie miesza dwa różne produkty i wniosek o cenie wychodzi zawyżony albo zaniżony.

## 2.5
- **Tańsze prompty dla wtyczki Claude w Chrome.** Sekcja „TRYB PRACY” w `promptFor()` i `promptModule()` (czyli w każdym prompcie, który kopiujesz do wtyczki) ma teraz dwie dodatkowe zasady: żadnego drugiego ponawiania tego samego kroku (otwarcia strony, wyszukania działki) i czytanie wyników z paneli informacyjnych jako tekstu strony zamiast zrzutu ekranu, ze zrzutem tylko wtedy, gdy informacja jest wyłącznie wizualna na mapie, i najwyżej jeden na warstwę. Cel: jedna sesja audytu (czyli kilka promptów na jeden adres) nie powinna już zjadać całego pięciogodzinnego limitu Cowork.
- Bez zmian w logice pytań, flagach ani formacie odpowiedzi — to wyłącznie instrukcja dla wtyczki, nie zmienia się nic w samej checkliście.

## 2.4
- **Wybór przy zapisie: nadpisz albo nowy plik.** Zapis audytu pyta teraz, czy nadpisać poprzedni plik, czy zapisać jako nowy. Na wersji z hostingu (https) otwiera się natywne okno zapisu, w którym wskazujesz plik do nadpisania albo wpisujesz nową nazwę. Przy pliku otwartym z dysku, gdzie przeglądarka nie ma dostępu do zapisu w konkretne miejsce, wybór jest prostszy: nadpisz (ta sama nazwa) albo nowy plik z datą w nazwie.
- Aplikacja zapamiętuje nazwę wczytanego lub ostatnio zapisanego pliku, żeby wiedzieć, co nadpisać.

## 2.3
- **Wycena wad w cenach regionu.** W sekcji Negocjacje doszły dwa bloki: jeden wycenia wady z audytu i notatek, drugi (na dole) pozycje dodane ręcznie. Każdy generuje prompt do wtyczki w przeglądarce, która ustala województwo z lokalizacji i szuka aktualnych cen usunięcia wad u wykonawców z regionu. Odpowiedź wkleja się w pole, a kwoty podstawiają się przy pozycjach.
- Wycena regionalna nadpisuje sztywne widełki wpisane w kod. Przy pozycji pojawia się adnotacja, z jakiego regionu pochodzi kwota. Zaznaczasz, które pozycje wliczyć do obniżki, tak jak dotąd.
- Wczytane kwoty wchodzą do sumy negocjacji i do raportu tą samą drogą co pozostałe pozycje.

## 2.2
- **Naprawione kopiowanie promptów.** Przyciski „Kopiuj” przy pytaniu i „Kopiuj prompty tej sekcji” znów działają. Trzy funkcje (`copyPrompt`, `copyModulePrompt`, `importModuleAnswers`) zniknęły przy wcześniejszej odbudowie pliku i przyciski wołały puste miejsce.
- **Kopiowanie działa też z dysku.** Doszła zapasowa metoda przez `execCommand`, bo przy otwarciu pliku z `file://` przeglądarka nie daje dostępu do `navigator.clipboard` i kopiowanie wcześniej milczało.
- **Wczytywanie odpowiedzi w karcie sekcji.** Przycisk „Wczytaj odpowiedzi” pod kartą modułu znów rozpoznaje wklejony blok z wtyczki i dopisuje odpowiedzi do audytu.
- Przyciski kopiujące przekazują `this` zamiast polegać na globalnej zmiennej `event`, której część przeglądarek nie udostępnia.

## 2.1
- **Wycena notatek.** Aplikacja rozpoznaje w notatkach typowe problemy budowlane (ponad dwadzieścia kategorii: azbest, zawilgocenie, pęknięcia, dach, instalacje, docieplenie, odwodnienie i inne) i proponuje widełki wraz z uzasadnieniem, skąd wzięła kwotę.
- **Odniesienie do rynku.** Nowe pole na średnią cenę transakcyjną w okolicy (zł/m²). Gdy oferta ją przewyższa, nadwyżka pojawia się jako osobna pozycja negocjacyjna z sugestią 60% różnicy.
- **Ocena atrakcyjności ceny** — aplikacja mówi wprost, czy po uwzględnieniu wad propozycja trafia w rynek, schodzi poniżej, czy nadal jest za wysoka. Jeśli oferta jest już tańsza od stawek w okolicy, sugeruje sprawdzenie, dlaczego.
- **Własne pozycje negocjacyjne** — dopisujesz cokolwiek, co ci przeszkadza, wraz z kwotą.
- **Podsumowanie flag na początku raportu**: wady blokujące i wady do wyceny wymienione z nazwy w pierwszym akapicie, razem z sumą kosztów i jednozdaniową oceną ceny.
- Przy każdej kwocie widać teraz, skąd pochodzi: dolna granica widełek z audytu, wycena rozpoznanego problemu albo wyliczenie z różnicy rynkowej.

## 2.0
- **Przepisany parser wklejanych odpowiedzi.** Poprzedni wymagał backticków wokół kodu pytania, a Notion traktuje kod jako formatowanie i przy kopiowaniu je gubi — przez co wklejanie po prostu nie działało.
- Kod pytania rozpoznawany po dopasowaniu do listy znanych identyfikatorów, niezależnie od znaczników: backticki, apostrofy typograficzne, nawiasy albo gołe słowo.
- Zaznaczenia rozpoznawane w formach `[x]`, `[X]`, `[✓]`, `☑`, `☒`, `✔`, z myślnikiem po kodzie i bez.
- Notatki wieloliniowe sklejane w całość; notatka bez znaku cytatu też jest wczytywana.
- Przetestowane na dwunastu wariantach formatu — wszystkie przechodzą.

## 1.9
- **Nasłonecznienie i cienie** w sekcji Grunt: dwanaście rzutów z góry (cztery pory roku razy trzy pory dnia) z cieniem rzucanym przez budynek na tle granic działki.
- Pozycja słońca liczona lokalnie z algorytmu astronomicznego, bez żadnego API. Górowanie zgodne z teorią co do dziesiątych stopnia.
- Obrys budynku pobierany z ewidencji przez ULDK (`GetBuildingByXY`); przy niepowodzeniu rysowany prostokąt zastępczy, a kierunki i długości cieni pozostają prawidłowe.
- Wysokość budynku edytowalna, domyślnie 8 m do kalenicy.
- Tabela wschodów, zachodów, długości dnia i wysokości słońca dla czterech dat granicznych.
- Ostrzeżenie, gdy zimowy cień w południe wychodzi poza granice działki.

## 1.8
- Nowa sekcja **Negocjacje**: każda wada i każda notatka jako osobna pozycja, którą włączasz do ceny albo pomijasz, z własną kwotą do nadpisania.
- Trzy ceny zamiast jednej: pierwsza oferta (kotwica), cena docelowa i granica, powyżej której rezygnujesz. Każda z sugestią wyliczoną z sumy wad.
- Techniki negocjacyjne oparte na researchu: argumenty liczbowe, dowody zamiast opinii, malejące ustępstwa, negocjowanie warunków zamiast ceny, milczenie po ofercie.
- Dane rynkowe o skali obniżek wraz z uczciwym pokazaniem rozbieżności między źródłami (5–35% wobec 1–4%).
- Raport bierze twoje wybory z panelu, a nie automatyczną kalkulację. Przy ręcznym wyborze znika limit 15%, bo decyzja jest świadoma.
- Pismo negocjacyjne podaje kwotę przy każdym argumencie i sortuje je od najmocniejszego.
- Pytania z notatką mają zielony znacznik i rozwijają się automatycznie, żeby notatki nie ginęły w zwiniętych sekcjach.

## 1.7
- Jedno wspólne okno „Wklej wyniki”, dostępne z każdej zakładki. Przyjmuje odpowiedzi wtyczki, treść z Notion i wypełnioną notatkę, rozpoznaje sekcję po kodzie pytania i dopisuje bez kasowania istniejących odpowiedzi.
- Odbudowa pliku po awarii edycji (utrata definicji modułów). Stan przywrócony 1:1 pod względem liczby pytań i konfiguracji.

## 1.6
- Preambuła „Tryb pracy” w każdym prompcie: wykonaj jednym ciągiem, nie przedstawiaj planu do akceptacji, przy przeszkodzie nie przerywaj.
- Karta konfiguracji wtyczki Claude w Chrome z listą domen do zatwierdzenia.

## 1.5
- Prompty przeniesione z poziomu całego audytu na poziom sekcji. Zbiorczy zestaw 14 zadań usunięty jako zbyt duży.
- Karta „Zlecenie dla wtyczki” na górze każdej sekcji, która ma co sprawdzać online.

## 1.4
- Prompty per sekcja obok promptów per pytanie.

## 1.3
- Sekcja „Co już ustalone” w promptach: identyfikator działki, numer księgi, przeznaczenie w planie, cena ofertowa i pozostałe zebrane dane.
- Wskazanie już zapisanych odpowiedzi do weryfikacji.

## 1.2
- Prompty dla wtyczki Claude w Chrome przy 14 pytaniach sprawdzanych w rejestrach.
- Droga urzędowa („gdy automat zawiedzie”) osobno przy każdym z nich: telefon, wniosek, koszt, termin.
- Nazwa i numer wersji w nagłówku, raporcie i eksportach.

## Wcześniejsze
- Podział pytań na zakres płatnego raportu i zakres własny, z zestawieniem kosztów w raporcie.
- Eksport listy terenowej do `.txt`, `.csv` i Notion; import z powrotem.
- Kolejność sekcji w eksporcie ustawiona pod przebieg spotkania: najpierw oględziny i rozmowa, na końcu dokumenty.
- Moduł „Budynek” i „Wnętrze” (legalność, azbest, żużlobeton, okna, wentylacja, układ) — brak w pierwotnym zakresie opartym na audycie działki.
- Forma własności i quoad usum w module Księga.
- Zjazd z drogi publicznej, zdjęcia historyczne Google Earth, kształt i ekspozycja działki.
- Limit obniżki ceny do 15% i oparcie propozycji na dolnej granicy szacunków zamiast sumy najgorszych scenariuszy.
