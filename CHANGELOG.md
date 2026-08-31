# Historia zmian

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
