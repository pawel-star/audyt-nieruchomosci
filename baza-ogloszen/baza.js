#!/usr/bin/env node
'use strict';
/*
 * Baza ogłoszeń: które domy już widziałem, w jakim są statusie i jak zmieniała się cena.
 * Dane w dane/baza.json (poza repozytorium, patrz .gitignore). Opis użycia w README.md.
 *
 *   node baza.js dodaj <link> [pole=wartość ...] [--nowy | --do N] [--sprawdz] [--bez-pobierania]
 *   node baza.js dodaj '{"url":"...","cena":650000,"miejscowosc":"Kórnik","metraz":120}'
 *   node baza.js status N <status> [powód]
 *   node baza.js notatka N <tekst>
 *   node baza.js cena N <kwota> [link]
 *   node baza.js popraw N pole=wartość ...
 *   node baza.js pokaz N | lista [status|wszystkie] | szukaj <fraza>
 *   node baza.js import <plik.json>      (kopia ze Szukacza albo oferty skopiowane z wtyczki)
 *   node baza.js pobierz <link>          (sam odczyt ogłoszenia z Otodom, bez zapisu)
 *   node baza.js usun N | widok
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const WERSJA = '1.1';
const KATALOG = process.env.BAZA_DANE || path.join(__dirname, 'dane');
const PLIK = path.join(KATALOG, 'baza.json');
const WIDOK = path.join(KATALOG, 'baza-widok.js');
const KOPIE = path.join(KATALOG, 'kopie');
const ILE_KOPII = 30;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';

/* ---------- statusy ---------- */
const STATUSY = [
  ['nowe', 'Nowe', 'wpadło w oko, nic jeszcze nie sprawdzone'],
  ['analiza', 'Analiza wstępna', 'screening w audycie: okolica, działka, dokumenty'],
  ['kontakt', 'Do kontaktu', 'zadzwonić do sprzedającego, dopytać, umówić oględziny'],
  ['wizja', 'Wizja lokalna', 'oględziny umówione albo odbyte'],
  ['zainteresowany', 'Zainteresowany', 'krótka lista'],
  ['niezainteresowany', 'Niezainteresowany', 'odpada; zapisz powód, żeby nie wracać'],
];
/* rodzaje notatek: strona pokazuje je na wierzchu karty, w tej kolejności */
const RODZAJE = [
  ['waham', 'Wątpliwości', 'dlaczego się waham'],
  ['sprawdzic', 'Do sprawdzenia', 'co sprawdzić przed decyzją; po sprawdzeniu zamknij z wynikiem'],
  ['raport', 'Raporty i pliki', 'link do raportu na dysku albo w internecie'],
  ['notatka', 'Notatki', 'inne uwagi'],
];
const ALIASY = {
  'nowe': 'nowe', 'nowy': 'nowe', 'nowa': 'nowe', 'zainteresowanie': 'nowe',
  'analiza': 'analiza', 'analiza wstepna': 'analiza', 'screening': 'analiza',
  'kontakt': 'kontakt', 'do kontaktu': 'kontakt', 'skontaktowac sie': 'kontakt',
  'skontaktowac sie z klientem': 'kontakt', 'skontaktowac sie ze sprzedajacym': 'kontakt', 'zadzwonic': 'kontakt',
  'wizja': 'wizja', 'wizja lokalna': 'wizja', 'ogledziny': 'wizja',
  'zainteresowany': 'zainteresowany', 'krotka lista': 'zainteresowany',
  'niezainteresowany': 'niezainteresowany', 'nie zainteresowany': 'niezainteresowany',
  'odpada': 'niezainteresowany', 'odrzucone': 'niezainteresowany', 'odrzucam': 'niezainteresowany',
};
/* statusy Szukacza (widok Oferty) → statusy bazy */
const ZE_SZUKACZA = { nowe: 'nowe', umowic: 'kontakt', raport: 'analiza', czekam: 'wizja', po_wizycie: 'wizja', decyzja: 'zainteresowany', odpada: 'niezainteresowany' };
const RODZAJ = { detached: 'wolnostojący', semi_detached: 'bliźniak', ribbon: 'szeregowiec', residence: 'rezydencja', farm: 'gospodarstwo', house: 'dom', tenement: 'kamienica', block: 'blok', apartment: 'apartamentowiec' };
const POLA = ['tytul', 'typ', 'rodzaj', 'miejscowosc', 'gmina', 'ulica', 'metraz', 'dzialka', 'pokoje', 'rok', 'ogloszeniodawca', 'dataOgl'];
const LICZBOWE = ['metraz', 'dzialka'];
const CALKOWITE = ['pokoje', 'rok'];

/* ---------- narzędzia ---------- */
const bezOgonkow = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/Ł/g, 'L');
const klucz = s => bezOgonkow(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const kluczUlicy = s => klucz(s).replace(/^(ul|ulica|al|aleja|os|osiedle|pl|plac)\s+/, '').replace(/\s*\d.*$/, '').trim();
function dzis() {
  if (process.env.BAZA_DZIS) return process.env.BAZA_DZIS;
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
const zl = n => n == null ? 'cena nieznana' : new Intl.NumberFormat('pl-PL').format(n).replace(/ /g, ' ') + ' zł';
const proc = x => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x).toFixed(1).replace('.', ',') + '%';
const m2 = n => String(n).replace('.', ',') + ' m²';
const roznica = n => (n > 0 ? '+' : '−') + zl(Math.abs(n));
const etykieta = k => (STATUSY.find(s => s[0] === k) || [k, k])[1];

function parseKwota(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v > 0 ? Math.round(v) : null;
  let s = String(v).toLowerCase().replace(/zł|zl|pln/g, '').replace(/[\s ]/g, '');
  let mn = 1;
  if (/mln$|mln\.?$|m$/.test(s)) { mn = 1e6; s = s.replace(/mln\.?$|m$/, ''); }
  else if (/tys\.?$|k$/.test(s)) { mn = 1e3; s = s.replace(/tys\.?$|k$/, ''); }
  if (mn > 1) s = s.replace(',', '.');
  else if (/^\d{1,3}([.,]\d{3})+$/.test(s)) s = s.replace(/[.,]/g, '');
  else s = s.replace(',', '.');
  const n = parseFloat(s);
  return isFinite(n) && n > 0 ? Math.round(n * mn) : null;
}
function parseLiczba(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v > 0 ? v : null;
  const s = String(v).toLowerCase().replace(/[\s ]/g, '').replace(',', '.');
  // działka bywa podana w arach albo hektarach
  const mn = /ha$/.test(s) ? 10000 : /(ar|ary|arów)$/.test(s) ? 100 : 1;
  const n = parseFloat(s.replace(/m2|m²|ha$|ar(y|ów)?$/g, ''));
  return isFinite(n) && n > 0 ? Math.round(n * mn * 100) / 100 : null;
}

function normUrl(u) {
  if (!u) return '';
  let x;
  try { x = new URL(String(u).trim()); } catch (e) { return String(u).trim(); }
  const host = x.hostname.toLowerCase().replace(/^(www|m|mobile|web)\./, '');
  let reszta = '';
  if (/facebook\.com$/.test(host)) {
    const k = ['story_fbid', 'id', 'fbid', 'v'].filter(n => x.searchParams.get(n)).map(n => n + '=' + x.searchParams.get(n));
    if (k.length) reszta = '?' + k.join('&');
  }
  return host + x.pathname.replace(/\/+$/, '') + reszta;
}
function idOgloszenia(u) {
  let x;
  try { x = new URL(String(u).trim()); } catch (e) { return null; }
  const h = x.hostname.toLowerCase().replace(/^(www|m|mobile|web)\./, ''), p = x.pathname;
  let m;
  if (/otodom\.pl$/.test(h) && (m = p.match(/-ID([0-9A-Za-z]+)(?:\.html)?\/?$/))) return 'otodom:' + m[1];
  if (/olx\.pl$/.test(h) && (m = p.match(/-ID([0-9A-Za-z]+)\.html/))) return 'olx:' + m[1];
  if (/facebook\.com$/.test(h)) {
    if ((m = p.match(/\/(?:posts|permalink)\/(\d+)/))) return 'fb:' + m[1];
    if (x.searchParams.get('story_fbid')) return 'fb:' + x.searchParams.get('story_fbid');
    if ((m = p.match(/\/marketplace\/item\/(\d+)/))) return 'fbm:' + m[1];
  }
  // ten sam numer bywa pod www. i pod subdomeną miejscowości, raz po przecinku, raz po ukośniku
  if (/nieruchomosci-online\.pl$/.test(h) && (m = p.match(/[,/](\d{6,})\.html$/))) return 'no:' + m[1];
  if (/gratka\.pl$/.test(h) && (m = p.match(/\/ob\/(\d+)/))) return 'gratka:' + m[1];
  if (/morizon\.pl$/.test(h) && (m = p.match(/(mzn\d+)/))) return 'morizon:' + m[1];
  return null;
}
function zrodloZUrl(u) {
  let h = '';
  try { h = new URL(String(u).trim()).hostname.toLowerCase().replace(/^(www|m|mobile|web)\./, ''); } catch (e) { return 'inne'; }
  const znane = ['otodom', 'olx', 'facebook', 'nieruchomosci-online', 'gratka', 'morizon', 'domiporta', 'adresowo', 'sprzedajemy', 'gumtree', 'szybko'];
  const z = znane.find(n => h === n + '.pl' || h === n + '.com' || h.endsWith('.' + n + '.pl') || h.endsWith('.' + n + '.com'));
  return z || h;
}

/* ---------- plik bazy ---------- */
function pusta() { return { _app: 'baza-ogloszen', _v: 1, _zmiana: null, nastepnyNr: 1, ogloszenia: [] }; }
function wczytaj() {
  if (!fs.existsSync(PLIK)) return pusta();
  const txt = fs.readFileSync(PLIK, 'utf8');
  let b;
  try { b = JSON.parse(txt); } catch (e) {
    throw new Error('Plik ' + PLIK + ' jest uszkodzony (' + e.message + '). Nic nie zapisałem. Ostatnie dobre wersje leżą w ' + KOPIE);
  }
  if (!b || !Array.isArray(b.ogloszenia)) throw new Error('Plik ' + PLIK + ' nie wygląda na bazę ogłoszeń. Nic nie zapisałem.');
  // notatki sprzed wersji 1.1 nie mają numeru ani rodzaju
  b.ogloszenia.forEach(o => {
    o.notatki = o.notatki || [];
    let max = o.notatki.reduce((m, n) => Math.max(m, n.nr || 0), 0);
    o.notatki.forEach(n => { if (!n.nr) n.nr = ++max; if (!n.rodzaj) n.rodzaj = 'notatka'; });
  });
  return b;
}
function zapisz(b) {
  fs.mkdirSync(KOPIE, { recursive: true });
  if (fs.existsSync(PLIK)) {
    const znacznik = new Date().toISOString().replace(/[:.]/g, '-');
    let cel = path.join(KOPIE, 'baza-' + znacznik + '.json'), i = 1;
    while (fs.existsSync(cel)) cel = path.join(KOPIE, 'baza-' + znacznik + '-' + (i++) + '.json');
    fs.copyFileSync(PLIK, cel);
    const stare = fs.readdirSync(KOPIE).filter(f => /^baza-.*\.json$/.test(f)).sort();
    stare.slice(0, Math.max(0, stare.length - ILE_KOPII)).forEach(f => fs.unlinkSync(path.join(KOPIE, f)));
  }
  b._zmiana = new Date().toISOString();
  const tmp = PLIK + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(b, null, 2) + '\n');
  fs.renameSync(tmp, PLIK);
  zapiszWidok(b);
}
function zapiszWidok(b) {
  fs.mkdirSync(KATALOG, { recursive: true });
  fs.writeFileSync(WIDOK, '/* Generuje baza.js po każdej zmianie. Nie edytuj ręcznie. */\n' +
    'window.BAZA=' + JSON.stringify(b) + ';\nwindow.BAZA_STATUSY=' + JSON.stringify(STATUSY) + ';\n' +
    'window.BAZA_RODZAJE=' + JSON.stringify(RODZAJE) + ';\n' +
    // folder projektu dla przycisków, które otwierają nową rozmowę w aplikacji Claude (zakładka Code)
    'window.BAZA_FOLDER=' + JSON.stringify(path.dirname(__dirname)) + ';\n');
}
function znajdzNr(b, nr) {
  const n = parseInt(String(nr).replace(/^#/, ''), 10);
  const r = b.ogloszenia.find(o => o.nr === n);
  if (!r) throw new Error('Nie ma w bazie ogłoszenia #' + nr + '.');
  return r;
}

/* ---------- rekord ---------- */
function oczysc(dane) {
  const r = {};
  const url = dane.url || dane.link || '';
  if (dane.cena !== undefined) r.cena = parseKwota(dane.cena);
  POLA.forEach(k => {
    if (dane[k] == null || dane[k] === '') return;
    if (LICZBOWE.includes(k)) r[k] = parseLiczba(dane[k]);
    else if (CALKOWITE.includes(k)) r[k] = parseInt(String(dane[k]).replace(/\D.*$/, ''), 10) || null;
    else if (k === 'typ') r[k] = klucz(dane[k]).replace(/\s+/g, '');
    else r[k] = String(dane[k]).trim();
    if (r[k] == null) delete r[k];
  });
  r.linki = url ? [{ url: String(url).trim(), zrodlo: dane.zrodlo || zrodloZUrl(url), id: idOgloszenia(url) }] : [];
  if (dane.status) r.status = kodStatusu(dane.status);
  r.noweNotatki = [['notatka', dane.notatka], ['waham', dane.waham], ['sprawdzic', dane.sprawdzic], ['raport', dane.raport]]
    .filter(([, t]) => t != null && String(t).trim()).map(([k, t]) => [k, String(t).trim()]);
  if (dane.powod) r.powod = String(dane.powod).trim();
  return r;
}
function kodStatusu(s) {
  const k = klucz(s);
  if (ALIASY[k]) return ALIASY[k];
  if (STATUSY.some(x => x[0] === k)) return k;
  throw new Error('Nie znam statusu „' + s + '”. Dostępne: ' + STATUSY.map(x => x[1].toLowerCase()).join(', ') + '.');
}
/* ---------- notatki ---------- */
const etykietaRodzaju = k => (RODZAJE.find(x => x[0] === k) || [k, k])[1];
function linkRaportu(s) {
  let t = String(s).trim();
  if (/^~\//.test(t)) t = path.join(os.homedir(), t.slice(2));
  if (/^file:\/\//i.test(t)) { try { t = decodeURIComponent(new URL(t).pathname); } catch (e) { /* zostaje jak jest */ } }
  const lokalny = t.startsWith('/');
  return { cel: t, lokalny, istnieje: lokalny ? fs.existsSync(t) : null };
}
function dodajNotatke(r, rodzaj, tekst, opisPliku) {
  r.notatki = r.notatki || [];
  const nr = r.notatki.reduce((m, n) => Math.max(m, n.nr || 0), 0) + 1;
  const n = { nr, data: dzis(), rodzaj, tekst: String(tekst).trim() };
  let uwaga = '';
  if (rodzaj === 'raport') {
    const l = linkRaportu(tekst);
    if (!l.lokalny && !/^https?:\/\//i.test(l.cel)) throw new Error('Raport podaj jako ścieżkę do pliku (zaczyna się od /) albo link (https://…).');
    n.link = l.cel;
    n.tekst = (opisPliku && String(opisPliku).trim()) || (l.lokalny ? path.basename(l.cel) : l.cel);
    if (l.lokalny && !l.istnieje) uwaga = 'nie widzę pliku ' + l.cel + ' na dysku; zapisałem, ale sprawdź ścieżkę';
  }
  r.notatki.push(n);
  return { n, uwaga };
}
function znajdzNotatke(r, nr) {
  const n = r.notatki.find(x => x.nr === parseInt(String(nr || '').replace(/^#/, ''), 10));
  if (!n) throw new Error('Przy #' + r.nr + ' nie ma notatki nr ' + nr + '. Numery notatek pokazuje polecenie: pokaz ' + r.nr + '.');
  return n;
}
function znaczniki(o) {
  const otw = k => o.notatki.filter(n => n.rodzaj === k && !n.zamkniete).length;
  const cz = [];
  if (otw('waham')) cz.push('wątpliwości ' + otw('waham'));
  if (otw('sprawdzic')) cz.push('do sprawdzenia ' + otw('sprawdzic'));
  if (o.notatki.some(n => n.rodzaj === 'raport')) cz.push('raport');
  return cz.length ? ' [' + cz.join(', ') + ']' : '';
}

function opis(r) {
  const loc = [r.miejscowosc, r.gmina && klucz(r.gmina) !== klucz(r.miejscowosc) ? '(gm. ' + r.gmina + ')' : ''].filter(Boolean).join(' ') || 'miejscowość nieznana';
  const cz = [
    loc + (r.ulica ? ', ' + (/^(os|al|pl)\.?\s/i.test(r.ulica) ? '' : 'ul. ') + r.ulica.replace(/^ul\.?\s*/i, '') : ''),
    [r.typ, r.rodzaj].filter(Boolean).join(' '),
    zl(r.cena),
    r.metraz ? m2(r.metraz) : '',
    r.dzialka ? 'działka ' + m2(r.dzialka) : '',
    r.pokoje ? r.pokoje + ' pok.' : '',
    r.rok ? 'rok ' + r.rok : '',
  ].filter(Boolean);
  return '#' + r.nr + ' ' + cz.join(' · ');
}
function ostatniPowod(r) {
  const h = (r.historiaStatusow || []).filter(x => x.status === r.status);
  const ost = h[h.length - 1];
  return ost ? ost : null;
}
function linijkaStatusu(r) {
  const ost = ostatniPowod(r);
  return 'status: ' + etykieta(r.status) + (ost ? ' od ' + ost.data : '') +
    (ost && ost.powod ? ' (' + (r.status === 'niezainteresowany' ? 'powód' : 'uwaga') + ': ' + ost.powod + ')' : '');
}

/* ---------- porównanie: czy to ten sam dom ---------- */
function blisko(a, b, abs, rel) { return Math.abs(a - b) <= Math.max(abs, rel * Math.max(a, b)); }
function lokalizacje(r) { return new Set([r.miejscowosc, r.gmina].filter(Boolean).map(klucz)); }
function porownaj(nowy, stary) {
  const nUrl = nowy.linki.map(l => normUrl(l.url));
  if (stary.linki.some(l => nUrl.includes(normUrl(l.url)))) return { poziom: 'pewne', pkt: 99, powody: ['ten sam link'] };
  const nId = nowy.linki.map(l => l.id).filter(Boolean);
  const wspolny = stary.linki.find(l => l.id && nId.includes(l.id));
  if (wspolny) return { poziom: 'pewne', pkt: 99, powody: ['ten sam numer ogłoszenia (' + wspolny.id + ')'] };

  const A = lokalizacje(nowy), B = lokalizacje(stary);
  if (!A.size || ![...A].some(x => B.has(x))) return null;
  if (nowy.typ && stary.typ && nowy.typ !== stary.typ) return null;
  let pkt = 0, mocne = 0;
  const powody = ['ta sama miejscowość'];
  // metraż i działka: w tolerancji +2, do 15% różnicy −2, powyżej to inny dom
  for (const [k, abs, rel, nazwa] of [['metraz', 2, 0.02, 'metraż'], ['dzialka', 15, 0.03, 'działka']]) {
    const a = nowy[k], b = stary[k];
    if (a == null || b == null) continue;
    if (blisko(a, b, abs, rel)) { pkt += 2; mocne++; powody.push(nazwa + ' ' + b + (a !== b ? '/' + a : '') + ' m²'); }
    else if (blisko(a, b, 0, 0.15)) { pkt -= 2; powody.push('inny ' + nazwa + ': ' + b + ' i ' + a + ' m²'); }
    else return null;
  }
  if (nowy.ulica && stary.ulica) {
    if (kluczUlicy(nowy.ulica) === kluczUlicy(stary.ulica)) { pkt += 2; mocne++; powody.push('ulica ' + stary.ulica); }
    else { pkt -= 2; powody.push('inna ulica: ' + stary.ulica + ' i ' + nowy.ulica); }
  }
  if (nowy.pokoje && stary.pokoje) {
    const d = Math.abs(nowy.pokoje - stary.pokoje);
    if (d === 0) { pkt += 1; powody.push(stary.pokoje + ' pokoi'); } else if (d >= 2) pkt -= 1;
  }
  if (nowy.rok && stary.rok) {
    const d = Math.abs(nowy.rok - stary.rok);
    if (d <= 1) { pkt += 1; powody.push('rok ' + stary.rok); } else if (d > 3) pkt -= 1;
  }
  if (nowy.cena && stary.cena && blisko(nowy.cena, stary.cena, 0, 0.03)) { pkt += 1; powody.push('podobna cena'); }
  if (!mocne) return null;
  if (pkt >= 4) return { poziom: 'prawdopodobne', pkt, powody };
  if (pkt >= 2) return { poziom: 'mozliwe', pkt, powody };
  return null;
}
const RANGA = { pewne: 3, prawdopodobne: 2, mozliwe: 1 };
function dopasowania(b, rek) {
  return b.ogloszenia.map(s => ({ s, w: porownaj(rek, s) })).filter(x => x.w)
    .sort((x, y) => RANGA[y.w.poziom] - RANGA[x.w.poziom] || y.w.pkt - x.w.pkt);
}

/* ---------- dodawanie i scalanie ---------- */
function dodajDoBazy(b, dane, opcje) {
  opcje = opcje || {};
  const rek = oczysc(dane);
  const d = dzis();
  if (!rek.linki.length && !rek.miejscowosc) throw new Error('Potrzebuję co najmniej linku albo miejscowości.');
  const traf = dopasowania(b, rek);
  const naj = traf[0];
  let cel = null;
  if (opcje.do) cel = znajdzNr(b, opcje.do);
  else if (opcje.nowy) {
    if (naj && naj.w.poziom === 'pewne') return { wynik: 'juz', bezZapisu: true, tekst: 'Ten sam link albo numer ogłoszenia jest już w ' + opis(naj.s) + '. Nie zakładam drugiego wpisu.' };
  } else if (naj && (naj.w.poziom === 'pewne' || naj.w.poziom === 'prawdopodobne')) cel = naj.s;
  else if (naj && naj.w.poziom === 'mozliwe') {
    const L = ['MOŻLIWY DUPLIKAT, nic nie zapisałem. Nowe ogłoszenie jest podobne do:'];
    traf.filter(x => x.w.poziom === 'mozliwe').slice(0, 3).forEach(x => {
      L.push('  ' + opis(x.s), '    ' + linijkaStatusu(x.s), '    zgodne: ' + x.w.powody.join(', '));
    });
    L.push('Ten sam dom: powtórz z --do ' + naj.s.nr + '. Inny dom: powtórz z --nowy.');
    return { wynik: 'mozliwe', tekst: L.join('\n'), kandydaci: traf.map(x => x.s.nr) };
  }
  if (cel) return scal(cel, rek, d, naj && naj.s === cel ? naj.w : { poziom: 'wskazane', powody: ['wskazane ręcznie (--do)'] }, opcje);

  const r = {
    nr: b.nastepnyNr++,
    dodano: d,
    status: rek.status || 'nowe',
  };
  POLA.forEach(k => { if (rek[k] != null) r[k] = rek[k]; });
  r.cena = rek.cena == null ? null : rek.cena;
  r.linki = rek.linki.map(l => Object.assign({}, l, { dodano: d }));
  r.historiaCen = rek.cena ? [{ data: d, cena: rek.cena, url: rek.linki[0] ? rek.linki[0].url : '' }] : [];
  r.historiaStatusow = [{ data: d, status: r.status, powod: rek.powod || undefined }];
  r.notatki = [];
  const uwagi = rek.noweNotatki.map(([k, t]) => dodajNotatke(r, k, t).uwaga).filter(Boolean);
  r.widziane = [d];
  b.ogloszenia.push(r);
  const L = ['DODANO: ' + opis(r), '  status: ' + etykieta(r.status)];
  if (r.notatki.length) L.push('  notatki: ' + r.notatki.map(n => etykietaRodzaju(n.rodzaj).toLowerCase() + ': ' + n.tekst).join('; '));
  uwagi.forEach(u => L.push('  uwaga: ' + u));
  const podobne = traf.filter(x => x.w.poziom !== 'pewne');
  if (podobne.length) L.push('  podobne w bazie (dodane na Twoje polecenie jako osobny dom): ' + podobne.slice(0, 3).map(x => '#' + x.s.nr).join(', '));
  const brak = ['miejscowosc', 'metraz'].concat(r.typ === 'mieszkanie' ? [] : ['dzialka']).filter(k => r[k] == null).concat(r.cena == null ? ['cena'] : []);
  if (brak.length) L.push('  brakuje: ' + brak.join(', ') + ' (bez tego słabiej wyłapię duplikaty z innych portali)');
  return { wynik: 'dodano', nr: r.nr, tekst: L.join('\n') };
}
function scal(cel, rek, d, w, opcje) {
  const L = [];
  const tenSam = (l, s) => normUrl(s.url) === normUrl(l.url) || (l.id && s.id === l.id);
  const nowyLink = rek.linki.find(l => !cel.linki.some(s => tenSam(l, s)));
  if (nowyLink) cel.linki.push(Object.assign({}, nowyLink, { dodano: d }));
  // ten sam numer ogłoszenia pod nowym adresem (portal zmienił tytuł w linku): trzymam najnowszy adres
  rek.linki.forEach(l => { const s = cel.linki.find(s => l.id && s.id === l.id && normUrl(s.url) !== normUrl(l.url)); if (s) s.url = l.url; });
  if (cel.widziane[cel.widziane.length - 1] !== d) cel.widziane.push(d);
  const uzupelnione = [];
  POLA.forEach(k => { if (cel[k] == null && rek[k] != null) { cel[k] = rek[k]; uzupelnione.push(k); } });
  let zmiana = null;
  if (rek.cena && rek.cena !== cel.cena) {
    zmiana = { stara: cel.cena, nowa: rek.cena };
    cel.cena = rek.cena;
    cel.historiaCen.push({ data: d, cena: rek.cena, url: (rek.linki[0] || {}).url || '' });
  }
  const uwagiNotatek = [];
  let ileNotatek = 0;
  rek.noweNotatki.forEach(([k, t]) => {
    if (cel.notatki.some(n => n.rodzaj === k && (n.tekst === t || (n.link && n.link === linkRaportu(t).cel)))) return;
    const w = dodajNotatke(cel, k, t);
    ileNotatek++;
    if (w.uwaga) uwagiNotatek.push(w.uwaga);
  });
  // przy imporcie status w bazie jest świeższy niż w Szukaczu, więc go nie ruszam
  if (rek.status && rek.status !== cel.status && !(opcje && opcje.zImportu)) {
    cel.status = rek.status;
    cel.historiaStatusow.push({ data: d, status: rek.status, powod: rek.powod || undefined });
  }
  const dop = w.poziom === 'prawdopodobne' ? 'prawdopodobnie ten sam dom (' + w.powody.join(', ') + ')' : w.powody.join(', ');
  const zmianaRealna = zmiana && zmiana.stara != null;
  if (zmianaRealna) {
    const delta = zmiana.nowa - zmiana.stara;
    L.push('ZMIANA CENY: ' + opis(cel));
    L.push('  ' + zl(zmiana.stara) + ' → ' + zl(zmiana.nowa) + ' (' + roznica(delta) + ', ' + proc(100 * delta / zmiana.stara) + '), zapisane w historii cen');
  } else {
    L.push('JUŻ W BAZIE: ' + opis(cel));
    if (zmiana) L.push('  dopisana cena: ' + zl(zmiana.nowa) + ' (wcześniej nieznana)');
  }
  L.push('  ' + linijkaStatusu(cel));
  L.push('  dodane ' + cel.dodano + ', zgłaszane ' + cel.widziane.length + ' raz' + (cel.widziane.length === 1 ? '' : 'y') +
    (cel.historiaCen.length > 1 ? ', historia cen: ' + cel.historiaCen.map(h => h.data + ' ' + zl(h.cena)).join(' → ') : ''));
  L.push('  dopasowanie: ' + dop);
  if (nowyLink) L.push('  dopisany nowy link (' + nowyLink.zrodlo + ')');
  if (uzupelnione.length) L.push('  uzupełnione pola: ' + uzupelnione.join(', '));
  if (ileNotatek) L.push('  dopisane notatki: ' + ileNotatek);
  uwagiNotatek.forEach(u => L.push('  uwaga: ' + u));
  if (zmianaRealna && cel.status === 'niezainteresowany' && zmiana.nowa < zmiana.stara) {
    L.push('  UWAGA: to ogłoszenie wcześniej odrzuciłeś' + (ostatniPowod(cel) && ostatniPowod(cel).powod ? ' (powód: ' + ostatniPowod(cel).powod + ')' : '') + '. Cena spadła, więc warto sprawdzić, czy powód nadal obowiązuje.');
  }
  return { wynik: zmianaRealna ? 'zmiana_ceny' : 'juz', nr: cel.nr, tekst: L.join('\n') };
}

/* ---------- Otodom ---------- */
function zOtodom(html, url) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('Nie widzę danych ogłoszenia na stronie Otodom (zmieniona struktura strony?).');
  const j = JSON.parse(m[1]);
  const ad = j && j.props && j.props.pageProps && j.props.pageProps.ad;
  if (!ad) throw new Error('Strona Otodom nie zawiera ogłoszenia; mogło zostać zdjęte.');
  const t = ad.target || {};
  const loc = (ad.location && ad.location.reverseGeocoding && ad.location.reverseGeocoding.locations) || [];
  const poz = lvl => (loc.find(l => l.locationLevel === lvl) || {}).name || null;
  const ul = ad.location && ad.location.address && ad.location.address.street;
  const bt = [].concat(t.Building_type || [])[0];
  const gmina = poz('commune');
  return {
    url: ad.url || url,
    tytul: ad.title || null,
    cena: Number(t.hidePrice) ? null : (Number(t.Price) || null),   // hidePrice przychodzi jako tekst „0”
    metraz: parseLiczba(t.Area),
    dzialka: parseLiczba(t.Terrain_area),
    pokoje: parseInt([].concat(t.Rooms_num || [])[0], 10) || null,
    rok: parseInt(t.Build_year, 10) || null,
    typ: t.ProperType || null,
    rodzaj: bt ? (RODZAJ[bt] || bt) : null,
    miejscowosc: poz('city_or_village') || poz('city') || gmina,
    gmina: gmina,
    ulica: ul && ul.name ? ul.name + (ul.number ? ' ' + ul.number : '') : null,
    ogloszeniodawca: (ad.agency && ad.agency.name) || (ad.advertiserType === 'private' ? 'prywatnie' : null),
    dataOgl: ad.createdAt ? String(ad.createdAt).slice(0, 10) : null,
  };
}
async function pobierz(url) {
  if (zrodloZUrl(url) !== 'otodom') return null;
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'pl-PL,pl;q=0.9' }, redirect: 'follow', signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error('Otodom odpowiedział kodem ' + r.status + '.');
  return zOtodom(await r.text(), r.url || url);
}

/* ---------- import ze Szukacza ---------- */
function zeSzukacza(x) {
  const d = x.data || {};
  const tekst = String(x.opis || x.text || x.snippet || '').replace(/\s+/g, ' ').trim();
  return {
    url: x.link || x.url || '',
    zrodlo: x.link && /facebook\.com/.test(x.link) ? 'facebook' : undefined,
    tytul: x.nazwa || (tekst ? tekst.slice(0, 100) : undefined),
    miejscowosc: x.miejscowosc || x.lokalizacja || undefined,
    cena: x.cena || d.price || undefined,
    metraz: x.pow || x.metraz || d.area || undefined,
    pokoje: x.pokoje || d.rooms || undefined,
    typ: x.typ || undefined,
    status: x.status ? (ZE_SZUKACZA[x.status] || x.status) : undefined,
    notatka: x.notatki || undefined,
  };
}
function importuj(b, obj) {
  const lista = Array.isArray(obj) ? obj : (obj && (obj.oferty || obj.offers || obj.results)) || [];
  if (!lista.length) throw new Error('W pliku nie ma ofert. Oczekuję kopii .json ze Szukacza albo listy ofert z wtyczki.');
  const wyn = { dodano: [], juz: [], zmiana_ceny: [], mozliwe: [], bledy: [] };
  lista.forEach((x, i) => {
    try {
      const r = dodajDoBazy(b, zeSzukacza(x), { zImportu: true });
      wyn[r.wynik].push(r);
    } catch (e) { wyn.bledy.push({ tekst: 'oferta ' + (i + 1) + ': ' + e.message }); }
  });
  const L = ['IMPORT: ' + lista.length + ' ofert. Dodane: ' + wyn.dodano.length + ', już były: ' + wyn.juz.length +
    ', zmiana ceny: ' + wyn.zmiana_ceny.length + ', możliwe duplikaty (pominięte): ' + wyn.mozliwe.length + ', błędy: ' + wyn.bledy.length];
  ['zmiana_ceny', 'mozliwe', 'bledy'].forEach(k => wyn[k].forEach(r => L.push('', r.tekst)));
  return L.join('\n');
}

/* ---------- widoki tekstowe ---------- */
function pokaz(r) {
  const L = [opis(r)];
  if (r.tytul) L.push('  tytuł: ' + r.tytul);
  L.push('  ' + linijkaStatusu(r));
  L.push('  dodane ' + r.dodano + ', zgłaszane ' + r.widziane.length + '× (ostatnio ' + r.widziane[r.widziane.length - 1] + ')');
  if (r.ogloszeniodawca) L.push('  ogłoszeniodawca: ' + r.ogloszeniodawca);
  r.linki.forEach(l => L.push('  link (' + l.zrodlo + ', ' + l.dodano + '): ' + l.url));
  if (r.historiaCen.length > 1) L.push('  historia cen: ' + r.historiaCen.map(h => h.data + ' ' + zl(h.cena)).join(' → '));
  L.push('  historia statusów: ' + r.historiaStatusow.map(h => h.data + ' ' + etykieta(h.status) + (h.powod ? ' (' + h.powod + ')' : '')).join(' → '));
  RODZAJE.forEach(([k, et]) => {
    const g = r.notatki.filter(n => n.rodzaj === k);
    if (!g.length) return;
    L.push('  ' + et.toUpperCase() + ':');
    g.forEach(n => L.push('    ' + (n.zamkniete ? '✓' : '•') + ' [' + n.nr + '] ' + n.tekst + (n.link ? ' → ' + n.link : '') + ' (' + n.data + ')' +
      (n.zamkniete ? ', zamknięte ' + n.zamkniete.data + (n.zamkniete.wynik ? ': ' + n.zamkniete.wynik : '') : '')));
  });
  return L.join('\n');
}
function lista(b, filtr) {
  let kody = STATUSY.map(s => s[0]).filter(k => k !== 'niezainteresowany');
  if (filtr) kody = klucz(filtr) === 'wszystkie' ? STATUSY.map(s => s[0]) : [kodStatusu(filtr)];
  const L = ['W bazie: ' + b.ogloszenia.length + ' (' + STATUSY.map(s => s[1].toLowerCase() + ' ' + b.ogloszenia.filter(o => o.status === s[0]).length).join(', ') + ')'];
  kody.forEach(k => {
    const g = b.ogloszenia.filter(o => o.status === k);
    if (!g.length) return;
    L.push('', etykieta(k).toUpperCase() + ' (' + g.length + ')');
    g.forEach(o => {
      const ost = ostatniPowod(o);
      const zm = o.historiaCen.length > 1 ? ' [cena ' + proc(100 * (o.cena - o.historiaCen[0].cena) / o.historiaCen[0].cena) + ']' : '';
      L.push('  ' + opis(o) + zm + (ost && ost.powod ? ' · ' + ost.powod : '') + znaczniki(o));
    });
  });
  return L.join('\n');
}
function szukaj(b, fraza) {
  const f = klucz(fraza);
  const traf = b.ogloszenia.filter(o => klucz([o.miejscowosc, o.gmina, o.ulica, o.tytul, o.ogloszeniodawca,
    o.notatki.map(n => n.tekst).join(' '), o.linki.map(l => l.url).join(' ')].join(' ')).includes(f));
  if (!traf.length) return 'Nic nie znalazłem dla „' + fraza + '”.';
  return traf.map(o => opis(o) + '\n  ' + linijkaStatusu(o)).join('\n');
}

/* ---------- linia poleceń ---------- */
function rozbierz(args) {
  const flagi = {}, reszta = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--nowy') flagi.nowy = true;
    else if (a === '--sprawdz') flagi.sprawdz = true;
    else if (a === '--bez-pobierania') flagi.bezPobierania = true;
    else if (a === '--do') flagi.do = args[++i];
    else if (a.startsWith('--do=')) flagi.do = a.slice(5);
    else reszta.push(a);
  }
  return { flagi, reszta };
}
function paryKV(lista) {
  const o = {};
  lista.forEach(p => {
    const m = p.match(/^([a-zA-Ząćęłńóśźż]+)=(.*)$/);
    if (!m) throw new Error('Nie rozumiem „' + p + '”. Podaj pole=wartość, np. cena=650000 miejscowosc=Kórnik.');
    o[bezOgonkow(m[1]).toLowerCase()] = m[2];
  });
  return o;
}
async function daneDoDodania(reszta, flagi) {
  if (!reszta.length) throw new Error('Podaj link albo dane JSON.');
  if (reszta[0].trim().startsWith('{')) return JSON.parse(reszta.join(' '));
  const url = reszta[0];
  const kv = paryKV(reszta.slice(1));
  let auto = {};
  if (!flagi.bezPobierania && zrodloZUrl(url) === 'otodom') {
    try { auto = (await pobierz(url)) || {}; }
    catch (e) { if (!Object.keys(kv).length) throw new Error('Nie udało się odczytać ogłoszenia: ' + e.message + ' Podaj dane ręcznie: pole=wartość.'); }
  }
  return Object.assign({ url }, auto, kv);
}
const POMOC = `Baza ogłoszeń ${WERSJA}. Dane: ${PLIK}
  dodaj <link> [pole=wartość ...] [--nowy | --do N] [--sprawdz] [--bez-pobierania]
        pola: cena, miejscowosc, gmina, ulica, metraz, dzialka, pokoje, rok, typ, rodzaj, tytul, status, notatka, powod
        Otodom czytam sam; dla innych portali podaj pola albo JSON.
  status N <status> [powód]      statusy: ${STATUSY.map(s => s[1].toLowerCase()).join(', ')}
  waham N <tekst>                dlaczego się wahasz (na wierzchu karty)
  sprawdzic N <tekst>            co sprawdzić; po sprawdzeniu: zamknij N <nr notatki> [wynik]
  raport N <ścieżka|link> [opis] link do raportu na dysku albo w internecie
  notatka N <tekst> · usun-notatke N <nr notatki>
  cena N <kwota> [link] · popraw N pole=wartość ...
  pokaz N · lista [status|wszystkie] · szukaj <fraza> · import <plik.json> · pobierz <link> · usun N · widok`;

const KOMENDY = { sprawdz: 'sprawdzic', watpliwosc: 'waham', watpliwosci: 'waham', plik: 'raport', usunnotatke: 'usun-notatke' };
async function main(argv) {
  const [surowe, ...args] = argv;
  let kom = bezOgonkow(surowe || '').toLowerCase();
  kom = KOMENDY[kom] || kom;
  const { flagi, reszta } = rozbierz(args);
  switch (kom) {
    case 'dodaj': {
      const dane = await daneDoDodania(reszta, flagi);
      const b = wczytaj();
      const r = dodajDoBazy(b, dane, flagi);
      if (flagi.sprawdz) return { kod: 0, tekst: '[sprawdzenie, nic nie zapisano]\n' + r.tekst };
      if (r.wynik !== 'mozliwe' && !r.bezZapisu) zapisz(b);
      return { kod: r.wynik === 'mozliwe' ? 2 : 0, tekst: r.tekst };
    }
    case 'status': {
      const b = wczytaj();
      const r = znajdzNr(b, reszta[0]);
      const tekst = reszta.slice(1).join(' ');
      const slowa = tekst.split(/\s+/).filter(Boolean);
      let kod = null, i;
      for (i = slowa.length; i > 0 && !kod; i--) { try { kod = kodStatusu(slowa.slice(0, i).join(' ')); } catch (e) { /* krótszy prefiks */ } }
      if (!kod) kodStatusu(tekst); // rzuci czytelny błąd
      const powod = slowa.slice(i + 1).join(' ').replace(/^[,:;\-–]\s*/, '');
      if (r.status === kod && !powod) return { kod: 0, tekst: opis(r) + '\n  status bez zmian: ' + etykieta(kod) };
      r.status = kod;
      r.historiaStatusow.push({ data: dzis(), status: kod, powod: powod || undefined });
      zapisz(b);
      let t = opis(r) + '\n  ' + linijkaStatusu(r);
      if (kod === 'niezainteresowany' && !powod) t += '\n  Bez powodu. Dopisz go (status N niezainteresowany <powód>), wtedy przy kolejnym trafieniu od razu zobaczysz, dlaczego odpadło.';
      return { kod: 0, tekst: t };
    }
    case 'notatka':
    case 'waham':
    case 'sprawdzic':
    case 'raport': {
      const b = wczytaj();
      const r = znajdzNr(b, reszta[0]);
      const t = (kom === 'raport' ? reszta[1] || '' : reszta.slice(1).join(' ')).trim();
      if (!t) throw new Error(kom === 'raport' ? 'Podaj ścieżkę do pliku albo link.' : 'Podaj treść notatki.');
      const w = dodajNotatke(r, kom, t, kom === 'raport' ? reszta.slice(2).join(' ') : '');
      zapisz(b);
      return { kod: 0, tekst: opis(r) + '\n  dopisane (' + etykietaRodzaju(kom).toLowerCase() + ', nr ' + w.n.nr + '): ' + w.n.tekst +
        (w.n.link ? ' → ' + w.n.link : '') + (w.uwaga ? '\n  uwaga: ' + w.uwaga : '') };
    }
    case 'zamknij': {
      const b = wczytaj();
      const r = znajdzNr(b, reszta[0]);
      const n = znajdzNotatke(r, reszta[1]);
      if (n.zamkniete) throw new Error('Notatka nr ' + n.nr + ' przy #' + r.nr + ' jest już zamknięta (' + n.zamkniete.data + ').');
      const wynik = reszta.slice(2).join(' ').trim();
      n.zamkniete = { data: dzis(), wynik: wynik || undefined };
      zapisz(b);
      return { kod: 0, tekst: opis(r) + '\n  zamknięte (' + etykietaRodzaju(n.rodzaj).toLowerCase() + ', nr ' + n.nr + '): ' + n.tekst + (wynik ? ' → ' + wynik : '') };
    }
    case 'usun-notatke': {
      const b = wczytaj();
      const r = znajdzNr(b, reszta[0]);
      const n = znajdzNotatke(r, reszta[1]);
      r.notatki = r.notatki.filter(x => x !== n);
      zapisz(b);
      return { kod: 0, tekst: opis(r) + '\n  usunięta notatka nr ' + n.nr + ': ' + n.tekst };
    }
    case 'cena':
    case 'popraw': {
      const b = wczytaj();
      const r = znajdzNr(b, reszta[0]);
      const kv = kom === 'cena' ? { cena: reszta[1], url: reszta[2] } : paryKV(reszta.slice(1));
      const L = [];
      if (kv.cena !== undefined) {
        const c = parseKwota(kv.cena);
        if (!c) throw new Error('Nie rozumiem kwoty „' + kv.cena + '”.');
        if (c !== r.cena) {
          const stara = r.cena;
          r.cena = c;
          r.historiaCen.push({ data: dzis(), cena: c, url: kv.url || '' });
          L.push('cena: ' + zl(stara) + ' → ' + zl(c) + (stara ? ' (' + roznica(c - stara) + ', ' + proc(100 * (c - stara) / stara) + ')' : ''));
        }
      }
      if (kom === 'popraw') {
        const cz = oczysc(Object.assign({}, kv, { cena: undefined, url: undefined }));
        POLA.forEach(k => { if (kv[k] !== undefined) { r[k] = cz[k] == null ? undefined : cz[k]; L.push(k + ': ' + (cz[k] == null ? '(usunięte)' : cz[k])); } });
        if (kv.url) { const l = oczysc({ url: kv.url }).linki[0]; if (!r.linki.some(s => normUrl(s.url) === normUrl(l.url))) { r.linki.push(Object.assign(l, { dodano: dzis() })); L.push('dopisany link'); } }
      }
      if (!L.length) return { kod: 0, tekst: opis(r) + '\n  nic się nie zmieniło' };
      zapisz(b);
      return { kod: 0, tekst: opis(r) + '\n  ' + L.join('\n  ') };
    }
    case 'pokaz': return { kod: 0, tekst: pokaz(znajdzNr(wczytaj(), reszta[0])) };
    case 'lista': return { kod: 0, tekst: lista(wczytaj(), reszta.join(' ')) };
    case 'szukaj': return { kod: 0, tekst: szukaj(wczytaj(), reszta.join(' ')) };
    case 'import': {
      if (!reszta[0]) throw new Error('Podaj ścieżkę do pliku .json.');
      const b = wczytaj();
      const t = importuj(b, JSON.parse(fs.readFileSync(reszta[0], 'utf8')));
      if (!flagi.sprawdz) zapisz(b);
      return { kod: 0, tekst: (flagi.sprawdz ? '[sprawdzenie, nic nie zapisano]\n' : '') + t };
    }
    case 'pobierz': {
      const d = await pobierz(reszta[0]);
      if (!d) return { kod: 1, tekst: 'Sam czytam tylko Otodom. Dla tego portalu odczytaj dane ze strony i podaj je w dodaj.' };
      return { kod: 0, tekst: JSON.stringify(d, null, 2) };
    }
    case 'usun': {
      const b = wczytaj();
      const r = znajdzNr(b, reszta[0]);
      b.ogloszenia = b.ogloszenia.filter(o => o !== r);
      zapisz(b);
      return { kod: 0, tekst: 'USUNIĘTO: ' + opis(r) + '\n  poprzednia wersja bazy leży w ' + KOPIE };
    }
    case 'widok': zapiszWidok(wczytaj()); return { kod: 0, tekst: 'Odświeżono ' + WIDOK };
    default: return { kod: kom ? 1 : 0, tekst: (kom ? 'Nie znam polecenia „' + kom + '”.\n' : '') + POMOC };
  }
}

if (require.main === module) {
  main(process.argv.slice(2)).then(r => {
    console.log(r.tekst);
    process.exitCode = r.kod;
  }).catch(e => {
    console.error('BŁĄD: ' + e.message);
    process.exitCode = 1;
  });
} else {
  module.exports = { main, parseKwota, parseLiczba, normUrl, idOgloszenia, zrodloZUrl, porownaj, oczysc, zOtodom, kodStatusu, dodajDoBazy, importuj, linkRaportu, STATUSY, RODZAJE };
}
