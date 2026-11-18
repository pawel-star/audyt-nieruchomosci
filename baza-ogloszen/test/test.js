'use strict';
// Test bazy ogłoszeń: node baza-ogloszen/test/test.js
// Pracuje na katalogu tymczasowym (BAZA_DANE), prawdziwej bazy nie dotyka. Bez sieci.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SKRYPT = path.join(__dirname, '..', 'baza.js');
const B = require(SKRYPT);
const DANE = fs.mkdtempSync(path.join(os.tmpdir(), 'baza-test-'));
let ok = 0, zle = 0;
function sprawdz(warunek, opis, extra) {
  if (warunek) { ok++; } else { zle++; console.log('✗ ' + opis + (extra ? '\n' + extra : '')); }
}
function cli(args, dzien) {
  try {
    const out = execFileSync('node', [SKRYPT, ...args], { env: Object.assign({}, process.env, { BAZA_DANE: DANE, BAZA_DZIS: dzien || '2026-11-01' }), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { kod: 0, out };
  } catch (e) { return { kod: e.status, out: (e.stdout || '') + (e.stderr || '') }; }
}
const baza = () => JSON.parse(fs.readFileSync(path.join(DANE, 'baza.json'), 'utf8'));

/* --- funkcje pomocnicze --- */
[['650 tys', 650000], ['650 tys.', 650000], ['1,2 mln', 1200000], ['1.129.000 zł', 1129000], ['649 000', 649000], ['650k', 650000], ['1 129 000 PLN', 1129000], [1129000, 1129000], ['', null], ['brak', null]]
  .forEach(([we, wy]) => sprawdz(B.parseKwota(we) === wy, 'parseKwota(' + JSON.stringify(we) + ') = ' + wy + ', jest ' + B.parseKwota(we)));
[['142,5', 142.5], ['118 m²', 118], ['8 ar', 800], ['0,5 ha', 5000], ['1200m2', 1200], ['', null]]
  .forEach(([we, wy]) => sprawdz(B.parseLiczba(we) === wy, 'parseLiczba(' + JSON.stringify(we) + ') = ' + wy + ', jest ' + B.parseLiczba(we)));
sprawdz(B.normUrl('https://www.otodom.pl/pl/oferta/dom-ID4Dlb7/?utm_source=x#galeria') === 'otodom.pl/pl/oferta/dom-ID4Dlb7', 'normUrl usuwa parametry, kotwicę i ukośnik');
sprawdz(B.normUrl('https://m.facebook.com/permalink.php?story_fbid=123&id=9&ref=abc') === 'facebook.com/permalink.php?story_fbid=123&id=9', 'normUrl zostawia story_fbid i id na Facebooku');
sprawdz(B.idOgloszenia('https://www.otodom.pl/pl/oferta/inny-tytul-ID4Dlb7') === 'otodom:4Dlb7', 'id Otodom z końcówki adresu');
sprawdz(B.idOgloszenia('https://www.olx.pl/d/oferta/dom-kornik-CID3-IDabc123.html') === 'olx:abc123', 'id OLX');
sprawdz(B.idOgloszenia('https://www.facebook.com/groups/111/posts/222/') === 'fb:222', 'id posta w grupie FB');
sprawdz(B.zrodloZUrl('https://poznan.nieruchomosci-online.pl/dom,123.html') === 'nieruchomosci-online', 'źródło z subdomeny');
sprawdz(B.idOgloszenia('https://www.nieruchomosci-online.pl/dom,na-sprzedaz/12345678.html?i&wFav') === 'no:12345678' &&
  B.idOgloszenia('https://przykladowo.nieruchomosci-online.pl/dom,na-sprzedaz/12345678.html') === 'no:12345678', 'id nieruchomosci-online pod www i pod subdomeną');
sprawdz(B.kodStatusu('zainteresowanie') === 'nowe' && B.kodStatusu('Wizja lokalna') === 'wizja' && B.kodStatusu('skontaktować się z klientem') === 'kontakt' && B.kodStatusu('odpada') === 'niezainteresowany', 'aliasy statusów');

/* --- odczyt Otodom na sztucznej stronie o tej samej budowie --- */
const ad = { url: 'https://www.otodom.pl/pl/oferta/dom-ID4Test', title: 'Dom z ogrodem', advertiserType: 'business', agency: { name: 'Biuro X' }, createdAt: '2026-10-01T10:00:00Z',
  target: { Price: 899000, Area: '131', Terrain_area: '640', Rooms_num: ['5'], Build_year: '2015', ProperType: 'dom', Building_type: ['detached'], hidePrice: '0' },
  location: { address: { street: { name: 'Lipowa', number: '7' } }, reverseGeocoding: { locations: [{ locationLevel: 'commune', name: 'Kórnik' }, { locationLevel: 'city_or_village', name: 'Radzewo' }] } } };
const strona = '<html><script id="__NEXT_DATA__" type="application/json">' + JSON.stringify({ props: { pageProps: { ad } } }) + '</script></html>';
const o = B.zOtodom(strona, 'x');
sprawdz(o.cena === 899000 && o.metraz === 131 && o.dzialka === 640 && o.pokoje === 5 && o.rok === 2015 && o.miejscowosc === 'Radzewo' && o.gmina === 'Kórnik' && o.ulica === 'Lipowa 7' && o.rodzaj === 'wolnostojący' && o.ogloszeniodawca === 'Biuro X', 'zOtodom czyta pola', JSON.stringify(o));
let blad = '';
try { B.zOtodom('<html></html>', 'x'); } catch (e) { blad = e.message; }
sprawdz(/Nie widzę danych/.test(blad), 'zOtodom: czytelny błąd bez danych');

/* --- scenariusze na pliku --- */
const L1 = 'https://www.otodom.pl/pl/oferta/dom-koninko-ID4Aaaa';
let r = cli(['dodaj', L1, 'cena=1 129 000', 'miejscowosc=Koninko', 'gmina=Kórnik', 'metraz=118', 'dzialka=150', 'pokoje=5', 'typ=dom', '--bez-pobierania']);
sprawdz(r.kod === 0 && /DODANO: #1 Koninko/.test(r.out), '1. nowe ogłoszenie dodane jako #1', r.out);
sprawdz(fs.existsSync(path.join(DANE, 'baza-widok.js')) && /window\.BAZA=/.test(fs.readFileSync(path.join(DANE, 'baza-widok.js'), 'utf8')), '1. plik widoku wygenerowany');
sprawdz(fs.readFileSync(path.join(DANE, 'baza-widok.js'), 'utf8').includes('window.BAZA_FOLDER=' + JSON.stringify(path.dirname(path.dirname(SKRYPT)))), '1. plik widoku zna folder projektu dla przycisków');

r = cli(['dodaj', L1, 'cena=1129000', '--bez-pobierania'], '2026-11-03');
sprawdz(/JUŻ W BAZIE: #1/.test(r.out) && /ten sam link/.test(r.out) && baza().ogloszenia.length === 1, '2. ten sam link i cena: już w bazie, bez nowego wpisu', r.out);
sprawdz(baza().ogloszenia[0].widziane.length === 2, '2. zapisany dzień ponownego trafienia');

r = cli(['dodaj', L1 + '/?utm_source=fb', 'cena=1 079 000', '--bez-pobierania'], '2026-11-05');
const z = baza().ogloszenia[0];
sprawdz(/ZMIANA CENY: #1/.test(r.out) && /−50 000 zł, −4,4%/.test(r.out) && z.cena === 1079000 && z.historiaCen.length === 2, '3. ten sam link z inną ceną: zmiana ceny z historią', r.out);

r = cli(['dodaj', 'https://www.otodom.pl/pl/oferta/zmieniony-tytul-ID4Aaaa', '--bez-pobierania'], '2026-11-05');
sprawdz(/JUŻ W BAZIE: #1/.test(r.out) && /numer ogłoszenia/.test(r.out), '4. inny tytuł, ten sam numer Otodom: rozpoznane', r.out);

r = cli(['dodaj', 'https://gratka.pl/nieruchomosci/dom-koninko/ob/555', 'cena=1079000', 'miejscowosc=Koninko', 'metraz=119', 'dzialka=152', '--bez-pobierania'], '2026-11-06');
sprawdz(/JUŻ W BAZIE: #1/.test(r.out) && /prawdopodobnie ten sam dom/.test(r.out) && baza().ogloszenia[0].linki.length === 2, '5. inny portal, te same parametry: scalone, link dopisany', r.out);

r = cli(['dodaj', 'https://www.morizon.pl/oferta/dom-mzn999', 'cena=990000', 'miejscowosc=Koninko', 'metraz=118', '--bez-pobierania'], '2026-11-06');
sprawdz(r.kod === 2 && /MOŻLIWY DUPLIKAT/.test(r.out) && baza().ogloszenia.length === 1, '6. sama miejscowość i metraż: pytanie zamiast zapisu', r.out);

r = cli(['dodaj', 'https://www.morizon.pl/oferta/dom-mzn999', 'cena=990000', 'miejscowosc=Koninko', 'metraz=118', '--bez-pobierania', '--nowy'], '2026-11-06');
sprawdz(/DODANO: #2/.test(r.out) && baza().ogloszenia.length === 2, '7. --nowy dodaje mimo podobieństwa', r.out);

r = cli(['dodaj', 'https://www.olx.pl/d/oferta/dom-CID3-IDxyz.html', 'cena=1129000', 'miejscowosc=Bnin', 'metraz=118', 'dzialka=150', '--bez-pobierania'], '2026-11-06');
sprawdz(/DODANO: #3/.test(r.out), '8. te same parametry w innej miejscowości: nowy dom', r.out);

r = cli(['dodaj', 'https://example.com/a', 'miejscowosc=Koninko', 'metraz=200', 'dzialka=150', '--bez-pobierania'], '2026-11-06');
sprawdz(/DODANO: #4/.test(r.out), '9. metraż zupełnie inny: nowy dom', r.out);

r = cli(['status', '1', 'odpada', 'za', 'mała', 'działka'], '2026-11-07');
sprawdz(/Niezainteresowany od 2026-11-07 \(powód: za mała działka\)/.test(r.out), '10. status z aliasem i powodem', r.out);
r = cli(['status', '2', 'wizja', 'lokalna', 'sobota', '10:00'], '2026-11-07');
sprawdz(baza().ogloszenia[1].status === 'wizja' && /sobota 10:00/.test(r.out), '11. status dwuwyrazowy, reszta jako powód', r.out);
r = cli(['status', '3', 'niezainteresowany'], '2026-11-07');
sprawdz(/Bez powodu/.test(r.out), '12. odrzucenie bez powodu: przypomnienie', r.out);

r = cli(['dodaj', 'https://www.domiporta.pl/nieruchomosci/dom/777', 'cena=999 000', 'miejscowosc=Koninko', 'metraz=118', 'dzialka=150', 'pokoje=5', '--bez-pobierania'], '2026-11-08');
sprawdz(/ZMIANA CENY: #1/.test(r.out) && /wcześniej odrzuciłeś \(powód: za mała działka\)/.test(r.out), '13. spadek ceny odrzuconego: przypomnienie powodu', r.out);

r = cli(['dodaj', L1, '--bez-pobierania', '--nowy'], '2026-11-08');
sprawdz(/Nie zakładam drugiego wpisu/.test(r.out) && baza().ogloszenia.length === 4, '14. --nowy przy tym samym linku odmawia', r.out);

r = cli(['dodaj', 'https://www.otodom.pl/pl/oferta/x-ID4Bbbb', 'miejscowosc=Koninko', 'metraz=118', '--bez-pobierania', '--do', '2'], '2026-11-08');
sprawdz(/JUŻ W BAZIE: #2/.test(r.out) && /wskazane ręcznie/.test(r.out), '15. --do N dopisuje do wskazanego', r.out);

r = cli(['notatka', '2', 'Właściciel', 'mówi', 'o', 'negocjacjach'], '2026-11-08');
r = cli(['popraw', '2', 'ulica=Lipowa', 'dzialka=600'], '2026-11-08');
sprawdz(baza().ogloszenia[1].ulica === 'Lipowa' && baza().ogloszenia[1].dzialka === 600 && baza().ogloszenia[1].notatki.length === 1, '16. notatka i poprawka pól', r.out);
r = cli(['cena', '2', '950 tys'], '2026-11-08');
sprawdz(/990 000 zł → 950 000 zł/.test(r.out), '17. ręczna zmiana ceny', r.out);

r = cli(['lista']);
sprawdz(/W bazie: 4/.test(r.out) && !/#1 Koninko/.test(r.out) && /WIZJA LOKALNA/.test(r.out), '18. lista domyślnie bez odrzuconych', r.out);
r = cli(['lista', 'wszystkie']);
sprawdz(/#1 Koninko/.test(r.out) && /\[cena −11,5%\]/.test(r.out), '19. lista wszystkich ze zmianą ceny', r.out);
r = cli(['szukaj', 'lipowa']);
sprawdz(/#2/.test(r.out) && !/#1 /.test(r.out), '20. szukanie po ulicy', r.out);
r = cli(['pokaz', '1']);
sprawdz(/historia cen: 2026-11-01 1 129 000 zł → 2026-11-05 1 079 000 zł → 2026-11-08 999 000 zł/.test(r.out), '21. pokaz z pełną historią cen', r.out);

/* --- notatki: rodzaje, zamykanie, raporty --- */
r = cli(['waham', '2', 'Blisko', 'torów,', 'nie', 'wiem,', 'jak', 'głośno'], '2026-11-09');
sprawdz(/dopisane \(wątpliwości, nr 2\): Blisko torów/.test(r.out), '28. wątpliwość z numerem kolejnym po starej notatce', r.out);
r = cli(['sprawdzić', '2', 'Księga', 'wieczysta:', 'hipoteka?'], '2026-11-09');
sprawdz(/dopisane \(do sprawdzenia, nr 3\)/.test(r.out), '29. polecenie z polską literą rozpoznane', r.out);
const plikRaportu = path.join(DANE, 'raport Przykładowo.pdf');
fs.writeFileSync(plikRaportu, 'x');
r = cli(['raport', '2', plikRaportu, 'Audyt', 'działki'], '2026-11-09');
sprawdz(/dopisane \(raporty i pliki, nr 4\): Audyt działki → .*raport Przykładowo\.pdf/.test(r.out) && !/uwaga/.test(r.out), '30. raport z opisem, plik istnieje', r.out);
r = cli(['raport', '2', '/nie/ma/takiego.pdf'], '2026-11-09');
sprawdz(/nie widzę pliku \/nie\/ma\/takiego\.pdf/.test(r.out) && /takiego\.pdf/.test(r.out), '31. raport bez pliku: zapis z ostrzeżeniem', r.out);
r = cli(['raport', '2', 'cokolwiek'], '2026-11-09');
sprawdz(r.kod === 1 && /ścieżkę do pliku/.test(r.out), '32. raport bez ścieżki i linku: błąd', r.out);
r = cli(['zamknij', '2', '3', 'czysta,', 'bez', 'hipoteki'], '2026-11-10');
const n2 = baza().ogloszenia[1].notatki;
sprawdz(n2.find(n => n.nr === 3).zamkniete.wynik === 'czysta, bez hipoteki' && n2.find(n => n.nr === 3).zamkniete.data === '2026-11-10', '33. zamknięcie punktu z wynikiem', r.out);
r = cli(['zamknij', '2', '3']);
sprawdz(r.kod === 1 && /już zamknięta/.test(r.out), '34. podwójne zamknięcie: błąd', r.out);
r = cli(['usun-notatke', '2', '5']);
sprawdz(!baza().ogloszenia[1].notatki.some(n => n.nr === 5), '35. usunięcie notatki', r.out);
r = cli(['pokaz', '2']);
sprawdz(/WĄTPLIWOŚCI:\n    • \[2\] Blisko torów/.test(r.out) && /DO SPRAWDZENIA:\n    ✓ \[3\].*zamknięte 2026-11-10: czysta, bez hipoteki/.test(r.out) && /NOTATKI:\n    • \[1\] Właściciel/.test(r.out), '36. pokaz grupuje notatki', r.out);
r = cli(['lista']);
sprawdz(/#2 .*\[wątpliwości 1, raport\]/.test(r.out), '37. lista pokazuje otwarte wątpliwości i raport', r.out);
r = cli(['dodaj', 'https://example.com/n', 'miejscowosc=Kórnik', 'metraz=300', 'waham=Za drogi', 'sprawdzic=Plan miejscowy', '--bez-pobierania'], '2026-11-09');
sprawdz(/notatki: wątpliwości: Za drogi; do sprawdzenia: Plan miejscowy/.test(r.out), '38. notatki przy dodawaniu', r.out);
r = cli(['dodaj', 'https://example.com/n', 'waham=Za drogi', 'sprawdzic=Dojazd zimą', '--bez-pobierania'], '2026-11-09');
sprawdz(/dopisane notatki: 1/.test(r.out), '39. powtórzona notatka nie dubluje się, nowa dochodzi', r.out);
sprawdz(B.linkRaportu('~/x.pdf').cel === path.join(os.homedir(), 'x.pdf') && B.linkRaportu('file:///tmp/a%20b.pdf').cel === '/tmp/a b.pdf', '40. ścieżki ~/ i file:// w raporcie');
// stary zapis notatek (bez numeru i rodzaju) wczytuje się jako zwykłe notatki
const sur = baza();
sur.ogloszenia[0].notatki = [{ data: '2026-11-01', tekst: 'stara' }, { data: '2026-11-02', tekst: 'starsza' }];
fs.writeFileSync(path.join(DANE, 'baza.json'), JSON.stringify(sur));
r = cli(['pokaz', '1']);
sprawdz(/NOTATKI:\n    • \[1\] stara.*\n    • \[2\] starsza/.test(r.out), '41. stare notatki dostają numery i rodzaj', r.out);
const ileOgl = baza().ogloszenia.length;

/* --- import ze Szukacza --- */
const kopia = { _app: 'szukacz-nieruchomosci', _typ: 'kopia', oferty: [
  { id: 'OF-1', link: 'https://www.morizon.pl/oferta/dom-mzn999', miejscowosc: 'Koninko', cena: 950000, pow: 118, status: 'odpada', notatki: 'z Szukacza' },
  { id: 'OF-2', link: 'https://www.facebook.com/groups/1/posts/42/', miejscowosc: 'Kórnik', cena: 700000, pow: 95, status: 'umowic' },
  { id: 'OF-3', link: 'https://example.com/b', miejscowosc: 'Kórnik', data: { price: 640000, area: 88 } },
] };
const plik = path.join(DANE, 'kopia.json');
fs.writeFileSync(plik, JSON.stringify(kopia));
r = cli(['import', plik], '2026-11-08');
const po = baza();
sprawdz(/Dodane: 2, już były: 1/.test(r.out) && po.ogloszenia.length === ileOgl + 2, '22. import: nowe dodane, duplikat rozpoznany', r.out);
sprawdz(po.ogloszenia[1].status === 'wizja', '22. import nie nadpisuje statusu istniejącego wpisu');
sprawdz(po.ogloszenia.find(x => x.linki[0].url.includes('posts/42')).status === 'kontakt', '22. status Szukacza przemapowany');
r = cli(['import', plik], '2026-11-08');
sprawdz(/Dodane: 0, już były: 3/.test(r.out) && baza().ogloszenia[1].notatki.filter(n => n.tekst === 'z Szukacza').length === 1, '23. ponowny import nic nie dubluje', r.out);

/* --- bezpieczeństwo pliku --- */
const kopie = fs.readdirSync(path.join(DANE, 'kopie'));
sprawdz(kopie.length > 0 && kopie.length <= 30, '24. kopie zapasowe są i jest ich najwyżej 30 (' + kopie.length + ')');
const dobra = fs.readFileSync(path.join(DANE, 'baza.json'), 'utf8');
fs.writeFileSync(path.join(DANE, 'baza.json'), dobra.slice(0, 200));
r = cli(['dodaj', 'https://example.com/c', 'miejscowosc=Kórnik', '--bez-pobierania']);
sprawdz(r.kod === 1 && /uszkodzony/.test(r.out) && fs.readFileSync(path.join(DANE, 'baza.json'), 'utf8') === dobra.slice(0, 200), '25. uszkodzony plik: błąd i brak nadpisania', r.out);
fs.writeFileSync(path.join(DANE, 'baza.json'), dobra);
r = cli(['status', '99', 'nowe']);
sprawdz(r.kod === 1 && /Nie ma w bazie ogłoszenia #99/.test(r.out), '26. nieistniejący numer', r.out);
r = cli(['status', '2', 'coś', 'dziwnego']);
sprawdz(r.kod === 1 && /Nie znam statusu/.test(r.out), '27. nieznany status', r.out);

/* --- mieszkania w jednym bloku: piętro i rok budowy (przypadek z 15.11.2026: parter i 1. piętro, ta sama ulica i biuro) --- */
[['blok, parter', 0], ['na parterze', 0], ['wysoki parter', 0], ['1. piętro', 1], ['blok, 2. piętro', 2], ['na 3 piętrze', 3], ['piętro: 4', 4], ['piętro w willi', null], ['blok', null]]
  .forEach(([we, wy]) => sprawdz(B.pietro({ typ: 'mieszkanie', rodzaj: we }) === wy, 'pietro(' + JSON.stringify(we) + ') = ' + wy + ', jest ' + B.pietro({ typ: 'mieszkanie', rodzaj: we })));
sprawdz(B.pietro({ typ: 'mieszkanie', rodzaj: 'blok', tytul: 'Mieszkanie 46,9 m2 Parter Przykładowo ul. Klonowa' }) === 0 && B.pietro({ typ: 'dom', rodzaj: 'dom 2 piętra' }) === null, 'pietro: z tytułu, a dla domu wcale');
const adM = { url: 'https://www.otodom.pl/pl/oferta/m-ID4Mies', title: 'Mieszkanie', target: { Price: 550000, Area: '84', ProperType: 'mieszkanie', Building_type: ['block'], Floor_no: ['floor_2'] } };
const oM = B.zOtodom('<script id="__NEXT_DATA__" type="application/json">' + JSON.stringify({ props: { pageProps: { ad: adM } } }) + '</script>', 'x');
adM.target.Floor_no = ['ground_floor'];
const oP = B.zOtodom('<script id="__NEXT_DATA__" type="application/json">' + JSON.stringify({ props: { pageProps: { ad: adM } } }) + '</script>', 'x');
sprawdz(oM.rodzaj === 'blok, 2. piętro' && oP.rodzaj === 'blok, parter', 'zOtodom dopisuje piętro mieszkania do rodzaju', oM.rodzaj + ' / ' + oP.rodzaj);
{
  const mb = { nastepnyNr: 1, ogloszenia: [] };
  const blok = { typ: 'mieszkanie', miejscowosc: 'Przykładowo', gmina: 'Testowa', ulica: 'Klonowa', pokoje: 2 };
  B.dodajDoBazy(mb, Object.assign({ url: 'https://www.okolica.pl/offer/show/11111-S-00001_0000_OMS/formular', tytul: 'Mieszkanie 46,9 m2 Parter Przykładowo ul. Klonowa', rodzaj: 'blok, parter', metraz: 46.9, rok: 2011, cena: 499000 }, blok));
  let w = B.dodajDoBazy(mb, Object.assign({ url: 'https://www.okolica.pl/offer/show/11111-S-00002_0000_OMS/formular', tytul: '2-pokojowe mieszkanie z komórką lokatorską', rodzaj: '1. piętro', metraz: 46.5, rok: 2014, cena: 489000 }, blok));
  sprawdz(w.wynik === 'dodano' && mb.ogloszenia.length === 2 && mb.ogloszenia[0].cena === 499000 && mb.ogloszenia[0].historiaCen.length === 1, '49. inne piętro w tym samym bloku: osobne mieszkanie, cena pierwszego nietknięta', w.tekst);
  w = B.dodajDoBazy(mb, Object.assign({ url: 'https://example.com/m3', metraz: 46.9, rok: 2011, cena: 495000 }, blok));
  sprawdz(w.wynik === 'mozliwe' && /różnice: .*brak piętra/.test(w.tekst) && mb.ogloszenia.length === 2, '50. mieszkanie bez piętra w ogłoszeniu: pytanie zamiast scalenia', w.tekst);
  w = B.dodajDoBazy(mb, Object.assign({ url: 'https://example.com/m4', rodzaj: 'na parterze', metraz: 46.9, rok: 2014, cena: 495000 }, blok));
  sprawdz(w.wynik === 'mozliwe' && /różnice: .*inny rok budowy: 2011 i 2014/.test(w.tekst), '51. to samo piętro, inny rok budowy: pytanie zamiast scalenia', w.tekst);
  w = B.dodajDoBazy(mb, Object.assign({ url: 'https://example.com/m5', rodzaj: 'na parterze', metraz: 46.9, rok: 2011, cena: 495000 }, blok));
  sprawdz(w.wynik === 'zmiana_ceny' && w.nr === 1 && /dopasowanie: [^\n]*parter/.test(w.tekst), '52. to samo piętro i rok na innym portalu: scalone ze zmianą ceny', w.tekst);
  const db = { nastepnyNr: 1, ogloszenia: [] };
  const dom = { typ: 'dom', miejscowosc: 'Przykładowo', ulica: 'Jaworowa', metraz: 77.8, dzialka: 390, pokoje: 2, cena: 750000 };
  B.dodajDoBazy(db, Object.assign({ url: 'https://example.com/d1', rok: 1998 }, dom));
  w = B.dodajDoBazy(db, Object.assign({ url: 'https://example.com/d2', rok: 2003 }, dom));
  sprawdz(w.wynik === 'mozliwe' && /inny rok budowy: 1998 i 2003/.test(w.tekst) && db.ogloszenia.length === 1, '53. dom z innym rokiem budowy: pytanie zamiast scalenia', w.tekst);
  w = B.dodajDoBazy(db, Object.assign({ url: 'https://example.com/d3', rok: 1999 }, dom));
  sprawdz(w.wynik === 'juz' && w.nr === 1, '54. rok różny o jeden: nadal ten sam dom', w.tekst);
}

/* --- status Nieaktualne i notatka o zniknięciu ogłoszenia --- */
sprawdz(B.kodStatusu('Nieaktualna') === 'nieaktualne' && B.kodStatusu('sprzedane') === 'nieaktualne', '55. aliasy statusu Nieaktualne');
cli(['sprawdzic', '2', 'Przegląd: ogłoszenie na Otodom zniknęło (2026-11-09). Sprawdź, czy dom jest sprzedany.'], '2026-11-09');
r = cli(['status', '2', 'kontakt'], '2026-11-09');
let zn = baza().ogloszenia[1].notatki.find(n => /zniknęło/.test(n.tekst));
sprawdz(zn && !zn.zamkniete && !/zamknięta notatka/.test(r.out), '56. zwykła zmiana statusu nie zamyka notatki o zniknięciu', r.out);
r = cli(['status', '2', 'Nieaktualna.'], '2026-11-10');
zn = baza().ogloszenia[1].notatki.find(n => /zniknęło/.test(n.tekst));
sprawdz(baza().ogloszenia[1].status === 'nieaktualne' && zn.zamkniete && /Nieaktualne/.test(zn.zamkniete.wynik) && /zamknięta notatka o zniknięciu/.test(r.out), '57. status Nieaktualne zamyka notatkę o zniknięciu', r.out);
r = cli(['lista'], '2026-11-10');
sprawdz(!/#2 /.test(r.out.split('\n').slice(1).join('\n')) && /nieaktualne 1/.test(r.out), '58. lista domyślnie bez nieaktualnych', r.out);

/* --- przegląd zmian (w pamięci, sprawdzanie Otodom podstawione, bez sieci) --- */
(async () => {
  process.env.BAZA_DZIS = '2026-11-20';
  const pb = { nastepnyNr: 1, ogloszenia: [] };
  B.dodajDoBazy(pb, { url: 'https://www.otodom.pl/pl/oferta/a-ID4Pa01', cena: 600000, miejscowosc: 'Tanie', metraz: 100, dzialka: 500, typ: 'dom' });
  B.dodajDoBazy(pb, { url: 'https://www.otodom.pl/pl/oferta/b-ID4Pa02', cena: 500000, miejscowosc: 'Znika', metraz: 60, typ: 'mieszkanie' });
  B.dodajDoBazy(pb, { url: 'https://www.otodom.pl/pl/oferta/c-ID4Pa03', cena: 450000, miejscowosc: 'Bez', metraz: 50, typ: 'mieszkanie' });
  B.dodajDoBazy(pb, { url: 'https://www.olx.pl/d/oferta/d-CID3-IDpa04.html', cena: 700000, miejscowosc: 'Olx', ulica: 'Lipowa', metraz: 120, dzialka: 800, typ: 'dom' });
  B.dodajDoBazy(pb, { url: 'https://www.otodom.pl/pl/oferta/e-ID4Pa05', cena: 400000, miejscowosc: 'Odrzucone', metraz: 40, typ: 'mieszkanie', status: 'odpada' });
  const odp = {
    'ID4Pa01': { stan: 'ok', dane: { cena: 570000, tytul: 'Dom' } },
    'ID4Pa02': { stan: 'zniklo' },
    'ID4Pa03': { stan: 'ok', dane: { cena: 450000, tytul: 'REZERWACJA mieszkanie' } },
  };
  const sprawdzane = [];
  const t1 = await B.przegladStart(pb, async u => { sprawdzane.push(u); return odp[(u.match(/ID4\w+/) || [])[0]] || { stan: 'blad', komunikat: 'test' }; });
  sprawdz(/#1: cena 600 000 zł → 570 000 zł \(−5,0%\)/.test(t1) && /#2: ogłoszenie zniknęło/.test(t1) && /#3: bez zmian/.test(t1) && /#3: w tytule „REZERWACJA/.test(t1), '42. przegląd: Otodom cena, zniknięcie, rezerwacja', t1);
  sprawdz(/INNE PORTALE[\s\S]*#4 olx/.test(t1) && /#4 szukaj: dom sprzedaż Olx Lipowa 120 m2 działka 800 m2/.test(t1), '43. przegląd: inne portale i fraza do szukania', t1);
  sprawdz(!sprawdzane.some(u => u.includes('ID4Pa05')) && !/#5/.test(t1), '44. przegląd pomija odrzucone', t1);
  const znN = pb.ogloszenia[1].notatki.filter(n => /zniknęło/.test(n.tekst));
  sprawdz(znN.length === 1 && znN[0].rodzaj === 'sprawdzic' && /DO DECYZJI/.test(t1), '59. zniknięcie: notatka do sprawdzenia i komunikat do decyzji', t1);
  // w trakcie przeglądu: ten sam dom w nowym ogłoszeniu z niższą ceną i nowe ogłoszenie
  B.dodajDoBazy(pb, { url: 'https://adresowo.pl/o/dom-olx-lipowa', cena: 650000, miejscowosc: 'Olx', ulica: 'Lipowa', metraz: 120, dzialka: 800, typ: 'dom' });
  B.dodajDoBazy(pb, { url: 'https://example.com/nowy', cena: 300000, miejscowosc: 'Nowe', metraz: 30, typ: 'mieszkanie' });
  const t2 = B.przegladKoniec(pb, 'OLX nie dało się otworzyć');
  sprawdz(/PRZEGLĄD zakończony 2026-11-20: 5 zmian/.test(t2) && /#1 Tanie: cena 600 000 zł → 570 000 zł/.test(t2) && /#2 Znika: ogłoszenie na Otodom zniknęło/.test(t2) &&
    /#4 Olx: cena 700 000 zł → 650 000 zł/.test(t2) && /#4 Olx: ten sam dom w nowym ogłoszeniu \(adresowo\)/.test(t2) && /#6 Nowe: nowe ogłoszenie w bazie/.test(t2), '45. przegląd: lista zmian na koniec', t2);
  sprawdz(/ZNIKNĘŁY, DO DECYZJI[\s\S]*#2 Znika, 500 000 zł · notatka nr 1/.test(t2) && !/#2 Znika: [^\n]*Sprawdź/.test(t2), '60. koniec przeglądu: lista zniknętych do decyzji', t2);
  sprawdz(pb.przeglady.length === 1 && !pb.przegladTrwa && pb.przeglady[0].uwagi === 'OLX nie dało się otworzyć', '46. przegląd zapisany do pokazania na stronie');
  let bl = '';
  try { B.przegladKoniec(pb); } catch (e) { bl = e.message; }
  sprawdz(/Nie ma rozpoczętego przeglądu/.test(bl), '47. koniec bez startu: błąd');
  await B.przegladStart(pb, async u => /ID4Pa02/.test(u) ? { stan: 'zniklo' } : { stan: 'ok', dane: { cena: null } });
  sprawdz(pb.ogloszenia[1].notatki.filter(n => /zniknęło/.test(n.tekst)).length === 1, '61. drugi przegląd nie dubluje notatki o zniknięciu');
  sprawdz(/1 zmiana|bez zmian/.test(B.przegladKoniec(pb)), '48. drugi przegląd bez zmian');
  pb.ogloszenia[1].status = 'nieaktualne';
  const sp2 = [];
  const t3 = await B.przegladStart(pb, async u => { sp2.push(u); return { stan: 'ok', dane: { cena: null } }; });
  sprawdz(!sp2.some(u => u.includes('ID4Pa02')) && !/ZNIKNĘŁY/.test(B.przegladKoniec(pb)), '62. przegląd pomija nieaktualne', t3);

  fs.rmSync(DANE, { recursive: true, force: true });
  console.log((zle ? '✗ ' : '✓ ') + ok + ' sprawdzeń zaliczonych, ' + zle + ' niezaliczonych');
  process.exitCode = zle ? 1 : 0;
})();
