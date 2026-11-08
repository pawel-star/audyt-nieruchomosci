# Baza ogłoszeń

Lista domów, które już widziałeś: cena z historią zmian, miejscowość, link i status. Dzięki niej nie wracasz do tych samych ogłoszeń i od razu widzisz, dlaczego coś odpadło.

## Jak z niej korzystać

Wklejasz Claude link do ogłoszenia (możesz kilka naraz). Claude odczytuje dane, sprawdza bazę i odpowiada jednym z czterech komunikatów:

- **DODANO**: nowy dom dostaje numer `#N` i status „Nowe”.
- **JUŻ W BAZIE**: ten dom już masz. Widzisz status, datę dodania, ile razy do niego wracałeś i powód odrzucenia, jeśli go zapisałeś.
- **ZMIANA CENY**: ten sam dom z inną ceną. Nowa cena trafia do historii, a jeśli wcześniej go odrzuciłeś, dostajesz przypomnienie powodu, żeby ocenić, czy nadal obowiązuje.
- **MOŻLIWY DUPLIKAT**: podobny dom w tej samej miejscowości, ale za mało danych, żeby mieć pewność. Nic się nie zapisuje, Claude pyta, czy to ten sam dom.

Status zmieniasz zdaniem: „#3 na wizję lokalną”, „#5 odpada, za mała działka”. Przy odrzuceniu podawaj powód, bo właśnie on oszczędza czas przy kolejnym trafieniu na to samo ogłoszenie.

Ze strony bazy możesz też zacząć od przycisku. „+ Dodaj ogłoszenie” i „Zmień status” przy każdym wpisie otwierają nową rozmowę w aplikacji Claude, w zakładce Code, w folderze audyt-nieruchomosci, z gotowym początkiem polecenia. Wklejasz link albo dopisujesz status i naciskasz Enter. Aplikacja Claude za każdym razem prosi o potwierdzenie folderu, a przeglądarka za pierwszym razem pyta, czy otworzyć aplikację.

Przegląd całej bazy: otwórz `index.html` dwuklikiem (działa z dysku, bez internetu). Masz tam filtry po statusie, wyszukiwanie, zmianę ceny w procentach i rozwijaną historię cen, statusów i notatek. Po zmianie w bazie kliknij „Odśwież”.

## Statusy

| Status | Kiedy |
|---|---|
| Nowe | wpadło w oko, nic jeszcze nie sprawdzone |
| Analiza wstępna | screening w audycie: okolica, działka, dokumenty |
| Do kontaktu | zadzwonić do sprzedającego, dopytać, umówić oględziny |
| Wizja lokalna | oględziny umówione albo odbyte |
| Zainteresowany | krótka lista |
| Niezainteresowany | odpada, z powodem |

Działają też słowa potoczne: „zainteresowanie” to „Nowe”, „skontaktować się” to „Do kontaktu”, „odpada” to „Niezainteresowany”, „wizja” to „Wizja lokalna”.

## Jak rozpoznaje ten sam dom

1. **Pewne:** ten sam link (bez dopisków w rodzaju `?utm_source=`) albo ten sam numer ogłoszenia na portalu, nawet gdy portal zmienił tytuł w adresie. Numer rozpoznaje dla Otodom, OLX, Facebooka, Gratki, Morizonu i nieruchomosci-online.
2. **Prawdopodobne:** ta sama miejscowość albo gmina i zgodne parametry. Metraż (±2 m² albo 2%), działka (±15 m² albo 3%) i ulica dają po 2 punkty, liczba pokoi, rok budowy i cena (±3%) po 1. Od 4 punktów baza uznaje, że to ten sam dom: dopisuje link i ewentualnie nową cenę.
3. **Możliwe:** od 2 punktów. Baza nic nie zapisuje i pyta.

Metraż albo działka różne o więcej niż 15% wykluczają dopasowanie. Pamiętaj jednak, że biura podają metraż różnie (z garażem albo bez), więc ten sam dom z dwóch biur czasem trafi do pytania zamiast do automatycznego scalenia.

## Skąd biorą się dane

- **Otodom:** skrypt czyta sam cenę, metraż, działkę, pokoje, rok, rodzaj zabudowy, miejscowość, gminę, ulicę i biuro.
- **OLX** odrzuca zwykłe zapytania, a **Facebook** wymaga logowania. Claude czyta wtedy stronę przez przeglądarkę albo prosi o wklejenie treści posta.
- **Inne portale:** Claude odczytuje stronę i przekazuje dane skryptowi.
- **Szukacz:** w widoku Oferty zapisz kopię przyciskiem „3. Zapisz kopię .json” i podaj Claude ścieżkę do pliku. Możesz też wkleić to, co skopiowałeś we wtyczce przyciskiem „Kopiuj oferty do aplikacji”. Import dopisuje nowe oferty, rozpoznaje te, które już są, i nie zmienia statusów nadanych w bazie. Statusy Szukacza przechodzą tak: do umówienia → do kontaktu, przygotować raport → analiza wstępna, czekam na spotkanie i po wizycie → wizja lokalna, do decyzji → zainteresowany, odpada → niezainteresowany.

## Polecenia

Zwykle wydaje je Claude, ale działają też w terminalu (z katalogu `audyt-nieruchomosci`):

```bash
node baza-ogloszen/baza.js dodaj <link> [pole=wartość ...] [--nowy | --do N] [--sprawdz]
node baza-ogloszen/baza.js status N <status> [powód]
node baza-ogloszen/baza.js notatka N <tekst>
node baza-ogloszen/baza.js cena N <kwota>
node baza-ogloszen/baza.js popraw N miejscowosc=Koninko dzialka=800
node baza-ogloszen/baza.js lista [status|wszystkie]
node baza-ogloszen/baza.js szukaj <fraza>
node baza-ogloszen/baza.js pokaz N
node baza-ogloszen/baza.js import <plik.json>
```

Pola przy `dodaj`: `cena`, `miejscowosc`, `gmina`, `ulica`, `metraz`, `dzialka`, `pokoje`, `rok`, `typ`, `rodzaj`, `tytul`, `status`, `notatka`, `powod`. Kwoty rozumie w zapisie „650 tys”, „1,2 mln”, „1.129.000 zł”, działkę także w arach i hektarach. `--sprawdz` pokazuje wynik bez zapisu.

## Dane i prywatność

Baza leży w `dane/`: `baza.json` (źródło), `baza-widok.js` (kopia dla strony) i `kopie/` z 30 ostatnimi wersjami. Skrypt robi kopię przed każdym zapisem, a uszkodzonego pliku nie nadpisuje. Folder `dane/` jest w `.gitignore`, bo repozytorium jest publiczne. Pamiętaj, że przy wrzucaniu plików na GitHub przez przeglądarkę („Add files via upload”) `.gitignore` nie działa, więc nie przeciągaj folderu `dane/`.

## Testy

```bash
node baza-ogloszen/test/test.js
```

Test pracuje na katalogu tymczasowym i nie łączy się z siecią, więc prawdziwej bazy nie dotyka.
