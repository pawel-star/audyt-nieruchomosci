# Historia zmian

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
