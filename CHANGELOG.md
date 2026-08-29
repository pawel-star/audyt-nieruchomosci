# Historia zmian

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
