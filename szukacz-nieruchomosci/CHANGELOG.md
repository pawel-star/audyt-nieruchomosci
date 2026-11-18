# Historia zmian

Dwa numery wersji: aplikacja (`APP.ver` w `index.html`, widoczny w nagłówku) i wtyczka (`version` w `wtyczka/manifest.json`, widoczny w okienku i w skanerze). Podbijaj przy każdej zmianie funkcjonalnej.

## Aplikacja 1.8 · 2026-11-18: wszystko na jednej stronie
- Zakładka „Oferty” pokazuje teraz bazę ogłoszeń (`baza-ogloszen/`): statusy bazy, notatki w ramkach, historię cen, priorytet, przegląd zmian i przyciski otwierające rozmowę z Claude. Dawny katalog w pamięci przeglądarki, z formularzem, gwiazdkami i własnymi statusami, znika, bo dublował bazę.
- Oferty, które zostały w przeglądarce, zakładka proponuje przenieść do bazy: zapisuje je do pliku w Pobranych i otwiera rozmowę z poleceniem importu (`baza.js import` mapuje stare statusy na statusy bazy). Potem można je usunąć z przeglądarki.
- Pole „Wklej oferty z wtyczki” zostaje: linki idą prosto do rozmowy „Dodaj do bazy ogłoszeń”, oferty z wtyczki przez plik i import.
- Nowa zakładka „Znalezione”: lista z `znalezione.js` (numer Z, data znalezienia, profil, link), z szukaniem po numerze i filtrem profilu. Przy ogłoszeniu „Dodaj do bazy” albo numer w bazie, jeśli link już tam jest. Osobna strona `znalezione.html` z wersji 1.7 została usunięta.
- `baza-ogloszen/index.html` przekierowuje do `szukacz-nieruchomosci/index.html#oferty`. Zakładkę można otworzyć z adresu: `#oferty`, `#znalezione`.
- Kopia .json obejmuje już tylko profile (baza i lista znalezionych mają własne kopie w plikach).
- Poprawka: licznik wypełnionych pól w sekcjach liczy tylko sekcje formularza profilu.
- Sprawdzone w przeglądarce na prawdziwych danych (20 ogłoszeń w bazie, 59 znalezionych), także na szerokości telefonu. Niesprawdzone: otwarcie z dysku (`file://`) w Twoim Chrome i to, czy w jego pamięci zostały oferty z dawnej zakładki.

## Aplikacja 1.7 · lista znalezionych 1.1 · 2026-11-18
- Strona `znalezione.html`: wszystkie znalezione ogłoszenia z numerem (Z1, Z2…), datą znalezienia, profilem, którym je znaleziono, i linkami. Pole szukania przyjmuje numer („Z10” albo „10”), miejscowość lub fragment linku; lista profili zawęża widok. Odnośnik pod przyciskiem „Szukaj nowych ogłoszeń z Claude”.
- `znalezione.js` po każdym zapisie odświeża `dane/znalezione-widok.js` (strona otwierana z dysku nie czyta JSON-a). Polecenie `widok` odświeża plik ręcznie.

## Aplikacja 1.6 · lista znalezionych 1.0 · 2026-11-18
- Przycisk „Szukaj nowych ogłoszeń z Claude”: otwiera rozmowę w zakładce Code z kryteriami z formularza. Claude szuka podagentami (Google bez portali, biura, zaznaczone źródła) i sam przegląda grupy na Facebooku w Chrome. Nic nie trzeba kopiować.
- `znalezione.js`: lista wszystkich znalezionych ogłoszeń w `dane/znalezione.json`. Każde szukanie pokazuje tylko nowe, a znane rozpoznaje po linku, numerze ogłoszenia i parametrach (miejscowość, metraż, działka, ulica), więc łapie też dom wystawiony ponownie pod nowym linkiem. Zapisuje zmiany cen i zaznacza domy, które są już w bazie ogłoszeń.
- Pod przyciskiem stan profilu: zapisany, bez nazwy albo ze zmianami niezapisanymi. Przy niezapisanych zmianach przycisk proponuje zapis.
- Niesprawdzone: jak długi adres `claude://` przyjmuje aplikacja. Prompt z prostym profilem daje ok. 6 tys. znaków, pełny profil może dać 2–3 razy więcej.

## Aplikacja 1.5 · 2026-11-17
- „Wiek ogłoszenia” to teraz dowolna liczba dni (wcześniej tylko 24 h, tydzień, miesiąc). Wartość trafia do filtra czasu Google (`tbs=qdr:dN`) i do promptu dla asystenta, który ma pomijać starsze ogłoszenia.
- Przycisk „Od ostatniego przeglądu: N dni” pod polem: wpisuje liczbę dni od ostatniego kliknięcia „Otwórz wszystkie” (zapis w `localStorage`, tylko w tej przeglądarce). Dzięki temu kolejny przegląd nie wraca do ogłoszeń już widzianych.
- Stare profile z wartościami d / w / m przeliczają się przy wczytaniu na 1 / 7 / 30 dni.
- Niesprawdzone: jak dokładnie Google traktuje `qdr:dN` dla N innych niż 1, 7 i 30; filtr jest przybliżony, bo nie każdy wynik ma datę.

## Wtyczka 1.4.1 · 2026-11-15 (po teście na żywych grupach)
Sprawdzone na grupach „Poznań + 25 km | TYLKO DOMY”, „Nieruchomości Poznań i okolica” i w zbiorczym feedzie grup.
- Potwierdzone: posty na Facebooku nie mają już `role="article"`, mają je komentarze („Komentarz <imię> 2 godz. temu”) i puste zaślepki ładowania. Stara wersja oceniała więc wyłącznie komentarze.
- Data posta: Facebook trzyma ją w ukrytym opisie odnośnika („3 godz. temu”, „dzień temu”). Wtyczka czyta ten opis i rozumie zapis słowny („dzień temu”, „tydzień temu”, „godzinę temu”) oraz pełny z dniem tygodnia. Wcześniej posty dostawały „bez daty”, a skaner nie wiedział, kiedy przestać przewijać.
- Link do posta: Facebook podstawia adres dopiero po najechaniu myszką. Wtyczka symuluje najechanie na datę i zapisuje prawdziwy link do posta zamiast linku do grupy.
- Tekst posta: usuwany ukryty ciąg „Facebook Facebook…”, pole „Skomentuj jako…”, „Wyślij wiadomość”, „Wyświetl mniej”. Pasek „Lubię to / Komentarz” ma same ikony, więc granicą treści jest pole komentarza.
- Metraż: liczby przy tarasie, balkonie, garażu, piwnicy, ogrodzie i pojedynczych pokojach są pomijane; wygrywa metraż podany wprost, inaczej największy. Na żywym poście „40 m2 tarasu” brało górę nad „110,90 m2” domu.
- Pasek „sortuj aktualności” i zaślepki ładowania nie są już brane za posty. Rozwijanie „Wyświetl więcej” pomija przyciski menu.
- Post w okienku: link z paska adresu.
- Makieta `test/fb-makieta.html?w=E` odwzorowuje układ z żywych grup.

## Aplikacja 1.4 · wtyczka 1.4 · 2026-11-15
- Facebook: wtyczka czyta posty, a nie komentarze. Komentarze mają na Facebooku to samo oznaczenie co dawniej posty (`role="article"`), więc stara wersja oceniała komentarze („Chętnie kupię”, „Do wynajęcia też?”) i odrzucała je jako „nie wygląda na ogłoszenie” albo „szukam”, a samych postów nie widziała. Teraz posty rozpoznaje po feedzie i treści posta, a tekst komentarzy wycina przed oceną.
- Post otwarty w okienku nad feedem: „Skanuj tę stronę” ocenia to okienko, nie feed pod spodem. Okienko wtyczki pokazuje, co przeczytała (feed, otwarty post, strona posta, Marketplace).
- Facebook Marketplace: „Skanuj tę stronę” ocenia karty ogłoszeń na liście wyników.
- Kryteria „musi być spełnione” i „może się zmienić”: przełącznik przy każdej sekcji profilu, zapisywany z profilem. Elastyczne kryterium lekko przekroczone (cena do 15%, metraż i działka do 20%, pokoje i piętro o jeden, rok o 10 lat) daje kategorię „prawie pasuje”, jeśli odchylenia są najwyżej dwa. Prompt dla asystenta ma osobno kryteria twarde, elastyczne i mile widziane oraz prośbę o 3–5 ogłoszeń prawie pasujących.
- Ocena wykrywa sprzeczności wprost z ogłoszenia: inny stan niż akceptowany, bliźniak przy „wolnostojący”, „bez garażu”, „brak windy”, aneks przy oddzielnej kuchni, biuro przy „tylko bezpośrednio”, służebność, hipoteka lub lokator. Brak wzmianki tylko obniża ocenę, nie odrzuca.
- Poprawki odczytu: działka w hektarach i arach, „800 m2 działki” przed metrażem domu, „liczba pokoi: 5”, pokoje z liczby sypialni, łazienki; „nieumeblowane” nie liczy się już jako „umeblowane”. Nowe punkty za instalacje, ekspozycję okien i rzut.
- Pola ukryte dla wybranego typu (np. piętro przy domu) nie trafiają do oceny ani promptu. Wcześniej piętro z profilu mieszkania odrzucało domy parterowe.
- Grupy do pominięcia: lista słów w nazwie grupy (domyślnie oddam, za darmo, gratis, praca i podobne) zapisuje się z profilem. Skaner nie proponuje i nie przegląda takich grup, a grupy odrzucone krzyżykiem albo usunięte z listy zapamiętuje i nie przywraca. Po przebiegu pokazuje grupy, których nie dało się przeczytać, z przyciskiem do usunięcia.
- Skaner: ten sam post z kilku grup pokazuje raz („też w: …”), filtr „prawie”, przycisk „Przelicz według profilu” (ocenia zapisane wyniki na nowo bez otwierania Facebooka), skaner widzi zmianę profilu bez przeładowania.
- Wyszukiwania: grupy mieszkańców miasta i miejscowości z profilu, Facebook Marketplace, przetargi AMW i KOWR. Zapytanie o grupy „sprzedam <miasto>” zastąpione zapytaniem o typ nieruchomości, bo przynosiło głównie grupy „kupię, sprzedam, oddam”.
- Automatyczne skanowanie na Facebooku nie wywołuje już samo siebie w kółko (reagowało na własne plakietki).
- Testy w `test/`: `ocena.js` (node), `fb-makieta.html` (układy strony Facebooka), `skaner-makieta.html` (skaner na atrapie Chrome).

## Wtyczka 1.3 · 2026-11-08
- Skaner grup domyślnie przegląda posty z ostatnich 2 dni (wcześniej 7). Puste pole też oznacza 2 dni.

## Aplikacja 1.3 · wtyczka 1.2 · 2026-11-03
- Widok „Oferty”: katalog ogłoszeń z numerem `OF-RRRRMMDD-NNN`, nazwą rekordu `TYP-Miejscowosc-cenaK-metrazM2`, oceną 1–5, notatkami i statusami: nowe, do umówienia, przygotować raport, czekam na spotkanie, po wizycie, do decyzji, odpada.
- Zasilanie katalogu z wtyczki („+ do katalogu” przy wynikach, „Kopiuj oferty do aplikacji” w skanerze) i ręcznie (formularz, lista linków).
- Kopia zapasowa .json z profilem, zapisanymi profilami i ofertami; wczytywanie z pliku dopisuje, nie kasuje.
- Numer wersji w nagłówku aplikacji, w profilu JSON, w kopii i w stopce promptu; w wtyczce w okienku i w skanerze.

## Aplikacja 1.2 · wtyczka 1.1 · 2026-10-30
- Prompt dla asystenta AI: kryteria twarde i mile widziane, zakaz portali z listy, adresy startowe, kroki pracy, format odpowiedzi.
- Panel „Co skopiować i gdzie wkleić” z trzema przyciskami i opisami.
- Ostrzejsza ocena we wtyczce: odrzuca posty bez cech ogłoszenia, inny typ niż w profilu, ogłoszenia „szukam”, wynajem przy kupnie. Cena czytana w formatach „1,5 mln”, „650 tys”, „599.000 PLN”, „650k”.
- Skaner grup: znajdowanie grup dla miasta, przegląd postów z X dni w kolejności chronologicznej, zaznacz/odznacz wszystkie, eksport CSV.
- Przeniesienie do `audyt-nieruchomosci/szukacz-nieruchomosci`.

## Aplikacja 1.0 · wtyczka 1.0 · 2026-10-30
- Formularz filtrów w 11 sekcjach, własne kryteria, generator linków do grup FB, biur, Google z wykluczeniem portali i nietypowych źródeł.
- Wtyczka: ocena ogłoszeń na otwartej stronie według profilu.
