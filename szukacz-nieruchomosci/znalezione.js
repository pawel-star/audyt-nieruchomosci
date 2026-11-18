#!/usr/bin/env node
/*
 * Lista znalezionych ogłoszeń: wszystko, co szukanie kiedykolwiek przyniosło, także słabe i odrzucone.
 * Dzięki niej kolejne szukanie pokazuje tylko nowe ogłoszenia.
 *
 *   node znalezione.js start ["nazwa profilu"]      ile znanych, kiedy ostatnio szukano tym profilem
 *   node znalezione.js dodaj <plik.json> [--profil "nazwa"] [--zrodla "google, biura, facebook"]
 *        plik: tablica ogłoszeń {url, zrodlo, tytul, typ, miejscowosc, gmina, ulica, cena, metraz,
 *        dzialka, pokoje, rok, dataOgl, ocena, uwagi}; wypisuje nowe, znane i zmiany cen
 *   node znalezione.js lista [ile]                  ostatnio znalezione
 *
 * Rozpoznawanie znanych: ten sam link albo numer ogłoszenia, a gdy link jest inny, te same parametry
 * (miejscowość, metraż, działka, ulica) według tych samych reguł co baza ogłoszeń. Dodatkowo sprawdza,
 * czy dom jest już w bazie ogłoszeń; bazy nie zmienia.
 * Dane: dane/znalezione.json (w .gitignore, repozytorium jest publiczne). Kopia przed każdym zapisem.
 */
const fs = require('fs');
const path = require('path');
const baza = require('../baza-ogloszen/baza.js');
const { parseKwota, parseLiczba, normUrl, idOgloszenia, zrodloZUrl, porownaj } = baza;

const WERSJA = '1.0';
const KATALOG = process.env.ZNALEZIONE_DANE || path.join(__dirname, 'dane');
const PLIK = path.join(KATALOG, 'znalezione.json');
const KOPIE = path.join(KATALOG, 'kopie');
const ILE_KOPII = 20;
const PLIK_BAZY = process.env.BAZA_DANE ? path.join(process.env.BAZA_DANE, 'baza.json') : path.join(__dirname, '..', 'baza-ogloszen', 'dane', 'baza.json');

const dzis = () => new Date().toISOString().slice(0, 10);
const zl = n => n == null ? 'cena ?' : new Intl.NumberFormat('pl-PL').format(n).replace(/\s/g, ' ') + ' zł';
const m2 = n => String(n).replace('.', ',') + ' m²';

function pusta() { return { _app: 'szukacz-znalezione', _v: 1, nastepnyNr: 1, ogloszenia: [], szukania: [] }; }
function wczytaj() {
  if (!fs.existsSync(PLIK)) return pusta();
  let z;
  try { z = JSON.parse(fs.readFileSync(PLIK, 'utf8')); } catch (e) {
    throw new Error('Plik ' + PLIK + ' jest uszkodzony (' + e.message + '). Nic nie zapisałem. Kopie leżą w ' + KOPIE);
  }
  if (!z || !Array.isArray(z.ogloszenia)) throw new Error('Plik ' + PLIK + ' nie wygląda na listę znalezionych. Nic nie zapisałem.');
  z.szukania = z.szukania || [];
  return z;
}
function zapisz(z) {
  fs.mkdirSync(KOPIE, { recursive: true });
  if (fs.existsSync(PLIK)) {
    const zn = new Date().toISOString().replace(/[:.]/g, '-');
    fs.copyFileSync(PLIK, path.join(KOPIE, 'znalezione-' + zn + '.json'));
    const stare = fs.readdirSync(KOPIE).filter(f => /^znalezione-.*\.json$/.test(f)).sort();
    stare.slice(0, Math.max(0, stare.length - ILE_KOPII)).forEach(f => fs.unlinkSync(path.join(KOPIE, f)));
  }
  const tmp = PLIK + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(z, null, 2) + '\n');
  fs.renameSync(tmp, PLIK);
}
function wczytajBaze() {
  try { const b = JSON.parse(fs.readFileSync(PLIK_BAZY, 'utf8')); return Array.isArray(b.ogloszenia) ? b.ogloszenia : []; } catch (e) { return []; }
}

/* ogłoszenie z odpowiedzi podagenta → rekord w kształcie, który rozumie porownaj() z bazy */
function rekord(d) {
  const url = String(d.url || d.link || '').trim();
  const r = { linki: url ? [{ url, id: idOgloszenia(url), zrodlo: d.zrodlo || zrodloZUrl(url) }] : [] };
  for (const k of ['tytul', 'typ', 'rodzaj', 'miejscowosc', 'gmina', 'ulica', 'dataOgl', 'uwagi']) {
    const v = d[k] == null ? '' : String(d[k]).trim();
    if (v && !/^(brak( danych)?|n\/?d|\?|-)$/i.test(v)) r[k] = v;
  }
  r.cena = parseKwota(d.cena);
  r.metraz = parseLiczba(d.metraz);
  r.dzialka = parseLiczba(d.dzialka);
  r.pokoje = d.pokoje == null || d.pokoje === '' ? null : (parseInt(d.pokoje, 10) || null);
  r.rok = d.rok == null || d.rok === '' ? null : (parseInt(d.rok, 10) || null);
  if (d.ocena != null && d.ocena !== '' && isFinite(+d.ocena)) r.ocena = +d.ocena;
  return r;
}
const RANGA = { pewne: 3, prawdopodobne: 2, mozliwe: 1 };
function najlepsze(lista, rek) {
  let best = null;
  for (const s of lista) {
    if (!s.linki) continue;
    const w = porownaj(rek, s);
    if (w && (!best || RANGA[w.poziom] > RANGA[best.w.poziom] || (RANGA[w.poziom] === RANGA[best.w.poziom] && w.pkt > best.w.pkt))) best = { s, w };
  }
  return best;
}
function opis(r) {
  return [r.miejscowosc + (r.ulica ? ', ' + r.ulica : ''), zl(r.cena), r.metraz ? m2(r.metraz) : null, r.dzialka ? 'działka ' + m2(r.dzialka) : null, r.pokoje ? r.pokoje + ' pok.' : null]
    .filter(Boolean).join(' · ');
}

function dodaj(z, wejscie, opcje) {
  const d = dzis(), domy = wczytajBaze();
  const wynik = { nowe: [], znane: [], wBazie: [], ceny: [], mozliwe: [], pominiete: [] };
  const wTymSzukaniu = new Map();   // ten sam dom od dwóch podagentów liczę raz
  for (const surowe of wejscie) {
    const rek = rekord(surowe);
    if (!rek.linki.length) { wynik.pominiete.push((surowe.tytul || '?') + ': brak linku'); continue; }
    if (!rek.miejscowosc) rek.miejscowosc = '';
    const klucz = normUrl(rek.linki[0].url);
    if (wTymSzukaniu.has(klucz)) continue;

    const wBazie = najlepsze(domy, rek);
    const znany = najlepsze(z.ogloszenia, rek);
    if (znany && znany.w.poziom !== 'mozliwe') {
      const s = znany.s;
      s.ostatnio = d; s.ileRazy = (s.ileRazy || 1) + 1;
      if (opcje.profil && !(s.profile || []).includes(opcje.profil)) s.profile = [...(s.profile || []), opcje.profil];
      const nowyLink = !s.linki.some(l => normUrl(l.url) === klucz);
      if (nowyLink) s.linki.push(Object.assign({ dodano: d }, rek.linki[0]));
      if (rek.cena && s.cena && rek.cena !== s.cena) {
        wynik.ceny.push({ s, stara: s.cena, nowa: rek.cena, url: rek.linki[0].url });
        s.historiaCen = s.historiaCen || [];
        s.historiaCen.push({ data: d, cena: rek.cena, url: rek.linki[0].url });
        s.cena = rek.cena;
      } else if (rek.cena && !s.cena) s.cena = rek.cena;
      for (const k of ['ulica', 'metraz', 'dzialka', 'pokoje', 'rok', 'gmina']) if (s[k] == null && rek[k] != null) s[k] = rek[k];
      wynik.znane.push({ s, nowyLink, powod: znany.w.powody.join(', '), wBazie: wBazie && wBazie.w.poziom !== 'mozliwe' ? wBazie.s.nr : null });
      wTymSzukaniu.set(klucz, s);
      continue;
    }
    const r = Object.assign({ nr: 'Z' + (z.nastepnyNr++), pierwszy: d, ostatnio: d, ileRazy: 1, profile: opcje.profil ? [opcje.profil] : [] }, rek);
    r.linki[0].dodano = d;
    r.historiaCen = r.cena ? [{ data: d, cena: r.cena, url: r.linki[0].url }] : [];
    z.ogloszenia.push(r);
    wTymSzukaniu.set(klucz, r);
    if (wBazie && wBazie.w.poziom !== 'mozliwe') { wynik.wBazie.push({ r, nr: wBazie.s.nr, status: wBazie.s.status, powod: wBazie.w.powody.join(', ') }); continue; }
    const podobne = (znany && znany.w.poziom === 'mozliwe') ? znany.s.nr + ' (' + znany.w.powody.join(', ') + ')' : (wBazie ? 'bazie #' + wBazie.s.nr + ' (' + wBazie.w.powody.join(', ') + ')' : null);
    wynik.nowe.push({ r, podobne });
  }
  z.szukania.push({ data: new Date().toISOString(), profil: opcje.profil || '', zrodla: opcje.zrodla || '', wszystkich: wejscie.length, nowych: wynik.nowe.length, znanych: wynik.znane.length + wynik.wBazie.length });
  return wynik;
}

function raport(w) {
  const L = [];
  const nowe = w.nowe.slice().sort((a, b) => (b.r.ocena || 0) - (a.r.ocena || 0));
  L.push('NOWE: ' + nowe.length);
  nowe.forEach(({ r, podobne }) => {
    L.push('  ' + r.nr + ' · ' + opis(r) + (r.ocena != null ? ' · ocena ' + r.ocena : ''));
    L.push('     ' + r.linki[0].url);
    if (r.uwagi) L.push('     ' + r.uwagi);
    if (podobne) L.push('     może to samo co ' + podobne + ', sprawdź zdjęcia');
  });
  if (w.wBazie.length) {
    L.push('JUŻ W BAZIE OGŁOSZEŃ (dom, który masz w bazie): ' + w.wBazie.length);
    w.wBazie.forEach(x => L.push('  #' + x.nr + ' (' + x.status + ') · ' + opis(x.r) + ' · ' + x.r.linki[0].url));
  }
  if (w.ceny.length) {
    L.push('ZMIANY CEN: ' + w.ceny.length);
    w.ceny.forEach(x => L.push('  ' + x.s.nr + ' · ' + x.s.miejscowosc + ': ' + zl(x.stara) + ' → ' + zl(x.nowa) + ' · ' + x.url));
  }
  const ponownie = w.znane.filter(x => x.nowyLink);
  L.push('ZNANE, POMINIĘTE: ' + w.znane.length + (ponownie.length ? ', w tym wystawione pod nowym linkiem: ' + ponownie.length : ''));
  ponownie.forEach(x => L.push('  ' + x.s.nr + ' · ' + opis(x.s) + ' (' + x.powod + ')' + (x.wBazie ? ', w bazie #' + x.wBazie : '')));
  if (w.pominiete.length) L.push('BEZ LINKU, NIE ZAPISANE: ' + w.pominiete.join('; '));
  return L.join('\n');
}

const POMOC = 'Polecenia: start ["profil"] · dodaj <plik.json> [--profil "nazwa"] [--zrodla "…"] · lista [ile]';
function opcja(args, nazwa) {
  const i = args.indexOf('--' + nazwa);
  if (i < 0) return '';
  const v = args[i + 1] || ''; args.splice(i, 2); return v;
}

function main(argv) {
  const args = argv.slice();
  const kom = args.shift();
  switch (kom) {
    case 'start': {
      const z = wczytaj(), profil = args.join(' ').trim();
      const ost = z.szukania.filter(s => !profil || s.profil === profil).slice(-1)[0];
      const t = ['Lista znalezionych v' + WERSJA + ': ' + z.ogloszenia.length + ' ogłoszeń, ' + z.szukania.length + ' szukań.'];
      if (ost) {
        const dni = Math.max(1, Math.ceil((Date.now() - new Date(ost.data)) / 86400000));
        t.push('Ostatnie szukanie' + (profil ? ' profilem „' + profil + '”' : '') + ': ' + ost.data.slice(0, 10) + ' (' + (dni === 1 ? 'wczoraj lub dziś' : dni + ' dni temu') + '), nowych ' + ost.nowych + ' z ' + ost.wszystkich + '.');
        t.push('DNI_OD_OSTATNIEGO=' + dni);
      } else t.push('Tym profilem jeszcze nie szukano. DNI_OD_OSTATNIEGO=brak');
      t.push('Ogłoszeń w bazie ogłoszeń: ' + wczytajBaze().length + ' (traktuję je jako znane).');
      return { kod: 0, tekst: t.join('\n') };
    }
    case 'dodaj': {
      const profil = opcja(args, 'profil'), zrodla = opcja(args, 'zrodla');
      const plik = args[0];
      if (!plik) return { kod: 1, tekst: 'Podaj plik JSON z ogłoszeniami.\n' + POMOC };
      let wej;
      try { wej = JSON.parse(fs.readFileSync(plik, 'utf8')); } catch (e) { return { kod: 1, tekst: 'Nie odczytałem ' + plik + ': ' + e.message }; }
      if (!Array.isArray(wej)) wej = wej && Array.isArray(wej.ogloszenia) ? wej.ogloszenia : null;
      if (!wej) return { kod: 1, tekst: 'Plik musi zawierać tablicę ogłoszeń.' };
      const z = wczytaj();
      const w = dodaj(z, wej, { profil, zrodla });
      zapisz(z);
      return { kod: 0, tekst: raport(w) };
    }
    case 'lista': {
      const z = wczytaj(), ile = parseInt(args[0], 10) || 20;
      const t = z.ogloszenia.slice(-ile).reverse().map(r => r.nr + ' · ' + r.pierwszy + (r.ileRazy > 1 ? ' (widziane ' + r.ileRazy + '×)' : '') + ' · ' + opis(r) + ' · ' + r.linki[r.linki.length - 1].url);
      return { kod: 0, tekst: t.length ? t.join('\n') : 'Lista jest pusta.' };
    }
    default: return { kod: kom ? 1 : 0, tekst: (kom ? 'Nie znam polecenia „' + kom + '”.\n' : '') + POMOC };
  }
}

if (require.main === module) {
  try { const r = main(process.argv.slice(2)); console.log(r.tekst); process.exitCode = r.kod; }
  catch (e) { console.error('BŁĄD: ' + e.message); process.exitCode = 1; }
} else module.exports = { main, dodaj, rekord, wczytaj };
