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
sprawdz(/Dodane: 2, już były: 1/.test(r.out) && po.ogloszenia.length === 6, '22. import: nowe dodane, duplikat rozpoznany', r.out);
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

fs.rmSync(DANE, { recursive: true, force: true });
console.log((zle ? '✗ ' : '✓ ') + ok + ' sprawdzeń zaliczonych, ' + zle + ' niezaliczonych');
process.exitCode = zle ? 1 : 0;
