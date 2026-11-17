/* Szukacz nieruchomości – skrypt oceniający ogłoszenia na otwartej stronie.
   Działa na grupach Facebooka (automatycznie) i na dowolnej stronie po kliknięciu „Skanuj” w okienku wtyczki.
   Ten sam plik ładuje strona skanera (skaner.html), żeby przeliczać zapisane wyniki według nowego profilu. */
(function () {
  if (window.__szukaczLoaded) return;
  window.__szukaczLoaded = true;

  const norm = s => (s || '').toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const num = s => parseInt(String(s).replace(/[^\d]/g, ''), 10);
  const fmt = n => new Intl.NumberFormat('pl-PL').format(n) + ' zł';
  const isFB = /facebook\.com$/.test(location.hostname) || !!window.__szukaczTestFB;

  /* ---------- wyciąganie liczb z treści ---------- */
  function toNum(str) {
    let x = String(str).trim();
    if (/^\d{1,3}([ .]\d{3})+(,\d+)?$/.test(x)) { const [a, b] = x.split(','); return parseFloat(a.replace(/[ .]/g, '') + (b ? '.' + b : '')); }
    if (/^\d+,\d+$/.test(x)) return parseFloat(x.replace(',', '.'));
    if (/^\d+\.\d{1,2}$/.test(x)) return parseFloat(x);
    return parseFloat(x.replace(/[ .,]/g, ''));
  }
  const NUM = '(\\d{1,3}(?:[ .]\\d{3})+(?:,\\d+)?|\\d+(?:[.,]\\d+)?)';
  const PLOT_U = '(m2|m²|m\\s?kw|mkw|ha\\b|hektar\\w*|ar(?:ow|y|ów)?\\b|a\\b)';
  function parse(raw) {
    let t = raw.replace(/[    ]/g, ' ').toLowerCase();
    const d = {};
    let m;
    // działka najpierw, żeby „1000 m2 działki” nie zostało wzięte za metraż domu
    let pm = t.match(new RegExp('dzia[łl]k\\w*[^\\d]{0,25}' + NUM + '\\s*' + PLOT_U));
    if (!pm) pm = t.match(new RegExp(NUM + '\\s*' + PLOT_U + '\\s*(?:dzia[łl]k\\w*|gruntu|ziemi)'));
    if (pm) {
      let v = toNum(pm[1]);
      if (/^(ha|hektar)/.test(pm[2])) v *= 10000; else if (/^a/.test(pm[2])) v *= 100;
      d.plot = Math.round(v); t = t.replace(pm[0], ' ');
    }
    // Metraż: pomijamy liczby przy tarasie, balkonie, garażu, piwnicy, ogrodzie i pojedynczych pokojach
    // (na żywej grupie „40 m2 tarasu” wygrywało z „110,90 m2” domu). Z reszty bierzemy podany wprost jako powierzchnię, inaczej największy.
    const PRZY_PRZED = /(taras\w*|balkon\w*|loggi\w*|ogr[oó]d\w*(\s+zimow\w*)?|gara[zż]\w*|piwnic\w*|strych\w*|kom[oó]rk\w*|wiat\w*|altan\w*|pomieszczeni\w*|gospodarcz\w*|dodatkow\w*|(?<!\d\s?)(salon|kuchni|kuchnia|sypialn|[łl]azienk|pok[oó]j|gabinet|przedpok)\w*)\s*(o\s+pow\w*\.?|pow\.?|ok\.?|około|:|-|–)?\s*$/;
    const PRZY_PO = /^\s*(taras|balkon|loggi|ogrod|ogród|gara[zż]|piwnic|strych|kom[oó]rk|wiat|altan)/;
    const WPROST = /(pow\w*\.?\s*(u[zż]ytk|ca[lł]k|domu|mieszkania|lokalu)|metra[zż]|o\s+pow|powierzchni\w*)[^\d]{0,12}$/;
    const areaRe = /(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:m2|m²|m\s?kw\b|mkw|metr)/g;
    let najw = null, wprost = null;
    while ((m = areaRe.exec(t))) {
      const v = parseFloat(m[1].replace(',', '.')); if (!(v >= 10)) continue;
      const przed = t.slice(Math.max(0, m.index - 40), m.index), po = t.slice(m.index + m[0].length, m.index + m[0].length + 15);
      if (PRZY_PRZED.test(przed) || PRZY_PO.test(po)) continue;
      if (wprost === null && WPROST.test(przed)) wprost = v;
      if (najw === null || v > najw) najw = v;
    }
    if (wprost !== null || najw !== null) d.area = wprost ?? najw;

    const mult = u => /mln|milion/.test(u) ? 1e6 : /tys|k\b/.test(u) ? 1e3 : 1;
    const skipCtx = /(kaucj|czynsz|oplat|opłat|odstepn|odstępn|media|prowizj|rata|raty|zadatek|zaliczk)\w*[^\d]{0,14}$/;
    const ctxOk = idx => !skipCtx.test(t.slice(Math.max(0, idx - 30), idx));
    if ((m = t.match(new RegExp('cen[aęey]\\w*[^\\d]{0,15}' + NUM + '\\s*(mln|milion\\w*|tys\\.?|k\\b)?')))) {
      d.price = Math.round(toNum(m[1]) * mult(m[2] || ''));
    } else {
      const cands = [];
      const re = new RegExp(NUM + '\\s*(mln|milion\\w*|tys\\.?\\s*(?:zl|zł|pln)?|k\\b|zl\\b|zł|pln|zlotych|złotych)', 'g');
      let x; while ((x = re.exec(t))) { if (!ctxOk(x.index)) continue; const v = Math.round(toNum(x[1]) * mult(x[2])); if (v >= 100) cands.push(v); }
      if (!cands.length) { const re2 = /\b(\d{1,3}(?:[ .]\d{3}){1,2})\b/g; while ((x = re2.exec(t))) { if (!ctxOk(x.index)) continue; const v = num(x[1]); if (v >= 50000) cands.push(v); } }
      if (cands.length) d.priceAll = cands;
    }
    if ((m = t.match(/(\d{1,2})\s*[- ]?\s*(?:pok\b|pok\.|pokoj|pokoi|pokojow)/))) d.rooms = +m[1];
    else if ((m = t.match(/(?:pokoi|pokoje|pokojów|pokojow)\s*[:\-–]?\s*(\d{1,2})\b/))) d.rooms = +m[1];
    else if (/kawalerk/.test(t)) d.rooms = 1;
    else if ((m = t.match(/(jedno|dwu|trzy|cztero|pieco|pięcio|szescio|sześcio)pokoj/))) d.rooms = { jedno: 1, dwu: 2, trzy: 3, cztero: 4, pieco: 5, 'pięcio': 5, szescio: 6, 'sześcio': 6 }[m[1]];
    else if ((m = t.match(/(\d)\s*sypialn/))) { d.rooms = +m[1] + 1; d.roomsEst = true; } // sypialnie + salon
    if ((m = t.match(/(\d)\s*[łl]azien/))) d.baths = +m[1];
    else if ((m = t.match(/(dwie|trzy|cztery)\s*[łl]azien/))) d.baths = { dwie: 2, trzy: 3, cztery: 4 }[m[1]];
    if ((m = t.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*(?:p\b|pietr|piętr)/))) { d.floor = +m[1]; d.floors = +m[2]; }
    else if ((m = t.match(/(\d{1,2})\s*(?:\.|-?go|-?e)?\s*(?:pietr|piętr|p\.)/))) d.floor = +m[1];
    else if ((m = t.match(/\b(i{1,3}|iv|vi{0,3}|ix|x)\s*(?:pietr|piętr|p\.)/))) d.floor = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 }[m[1]];
    else if (/\bparter/.test(t)) d.floor = 0;
    if ((m = t.match(/(?:rok budowy|rok bud\.?|budow\w*|z roku|wybudowan\w*|oddan\w*)[^\d]{0,10}(18\d{2}|19\d{2}|20\d{2})/))) d.year = +m[1];
    else if ((m = t.match(/\bz\s*(18\d{2}|19\d{2}|20\d{2})\s*(?:roku|r\.)/))) d.year = +m[1];
    if (d.floors === undefined && (m = t.match(/(\d{1,2})\s*-?\s*(?:pietrow|piętrow|kondygnac)/))) d.floors = +m[1];
    return d;
  }

  /* ---------- ocena według profilu ---------- */
  const RX = {
    udog: { balkon: /balkon/, taras: /taras/, loggia: /loggi/, 'ogródek': /ogrod/, piwnica: /piwnic/, 'komórka lokatorska': /komork/, 'garaż': /garaz/, 'miejsce postojowe': /miejsce postojowe|miejsce parkingowe|parking|postojow/, 'hala garażowa': /hal[aei] garaz/, klimatyzacja: /klimatyzac|klima\b/, umeblowane: /(?<!nie)(?<!nie )umeblowan|z meblami|wyposazon/, nieumeblowane: /nieumeblowan|nie umeblowan|bez mebli|bez wyposazenia/, AGD: /\bagd\b/, zmywarka: /zmywark/, pralka: /pralk/, domofon: /domofon/, monitoring: /monitoring/, ochrona: /ochron|teren zamkniety|osiedle zamkniete|strzezon/, rowerownia: /rowerown|wozkown/, 'plac zabaw': /plac zabaw/, 'dla niepełnosprawnych': /niepelnosprawn|bez barier/, kominek: /komin(ek|ka|kiem)/, sauna: /saun|jacuzzi/, basen: /basen/ },
    stan: { 'do zamieszkania': /do zamieszkania|do wprowadzenia|gotow\w* do (zamieszkania|wprowadzenia|wejscia)/, 'po remoncie': /po remoncie|po generaln|wyremontowan/, 'do odświeżenia': /do odswiezenia|do malowania/, 'do remontu': /do remontu|do kapitalnego/, 'do wykończenia': /do wykonczenia|deweloperski|stan deweloperski/, 'stan surowy': /stan surowy|surowy zamkniety|surowy otwarty/ },
    ogrz: { miejskie: /miejsk|mpec|cieplo sieciowe|c\.o\. miejskie/, gazowe: /gazow|piec gazowy|gaz/, 'pompa ciepła': /pomp[aąe] ciepla/, elektryczne: /elektryczn/, kominek: /komin/, 'węglowe': /wegl|ekogroszek/ },
    zabudowa: { blok: /\bblok(u|i|ach)?\b/, kamienica: /kamienic/, apartamentowiec: /apartamentow/, 'niska zabudowa': /niska zabudow|niskiej zabudow|will[aei]\b/, szeregowiec: /szereg/, loft: /\bloft/ },
    rodzaj: { 'wolnostojący': /wolnostojac|wolno stojac/, 'bliźniak': /blizniak|blizniacz/, szeregowiec: /szeregow/, siedlisko: /siedlisk|gospodarstw|zagrod/, letniskowy: /letnisk|dom\w* rekreacyjn|domek rekreacyjn/ },
    kondyg: { parterowy: /parterow/, poddasze: /poddasz\w* uzytkow|z poddaszem|uzytkow\w* poddasz/, pietrowy: /(dom|budyn\w*)\w* pietrow|\bpietrowy\b|dwukondygnac/ },
    ekspo: { 'południe': /poludni/, 'wschód': /wschod/, 'zachód': /zachod/, 'północ': /polnoc/ },
    instal: { 'okna PCV': /\bpcv\b|nowe okna|plastikowe okna/, 'nowa instalacja': /now\w* instalacj|wymienion\w* instalacj/, fotowoltaika: /fotowolt|panele (pv|fotowolt|sloneczn)|\bpv\b/, 'światłowód': /swiatlowod/, rekuperacja: /rekuperac/, ocieplony: /ocieplon|docieplon|termomoderniz/ },
    media: { 'prąd': /\bprad|energi\w* elektr|przylacz\w* elektr/, woda: /\bwod(a|y)\b|wodociag|studni/, gaz: /\bgaz(u)?\b|gazow/, kanalizacja: /kanalizac/, szambo: /szamb|oczyszczaln/, 'media w drodze': /media w drodze|uzbrojon|media (sa )?(przy|w) (dzialce|granicy|drodze)/ },
    prawne: { MPZP: /mpzp|plan\w* (miejscow\w* )?zagospodarowania/, 'warunki zabudowy': /\bwz\b|warunk\w* zabudowy/, 'pozwolenie na budowę': /pozwoleni\w* na budow/, 'księga wieczysta': /ksieg\w* wieczyst|\bkw\b/ },
    typ: { mieszkanie: /mieszkani|kawalerk|apartament/, dom: /\bdom(u|ek|em|ku|y)?\b|segment|blizniak|szeregow|siedlisk/, dzialka: /dzialk|grunt|parcel/, lokal: /lokal/, garaz: /garaz/, pokoj: /pokoj|pokoju|pokoje/, hala: /\bhal[aei]\b|magazyn/ },
    typStrict: { mieszkanie: /sprzeda\w* mieszkani|mieszkani\w* (na sprzedaz|do wynajecia|\d)|wynajm\w* mieszkani|kawalerk|apartament (na sprzedaz|do wynajecia)/, dom: /sprzeda\w* dom|dom (na sprzedaz|do wynajecia|jednorodzinn|wolnostojac|szeregow|parterow|pietrow|z dzialk|o pow|w zabudowie)|domek|blizniak|szeregowiec|siedlisk/, dzialka: /dzialk[aęeiy]|grunt (budowlan|roln|inwestycyjn)|parcel/, lokal: /lokal\w* (uzytkow|handlow|uslugow|biurow|gastronom|na sprzedaz|do wynajecia)/, garaz: /sprzeda\w* garaz|garaz (na sprzedaz|do wynajecia|murowan)|blaszak/, pokoj: /pokoj\w* (do wynajecia|dla student|dla pary|jednoosobow|dwuosobow)|wynajme pokoj/, hala: /hal[aeę] (magazynow|produkcyjn|na sprzedaz|do wynajecia)|magazyn (na sprzedaz|do wynajecia)/ }
  };
  function hasAny(map, keys, text) { return keys.some(k => (map[k] ? map[k].test(text) : text.includes(norm(k)))); }
  // „bez balkonu”, „brak windy”, „nie ma garażu” – ogłoszenie wprost mówi, że czegoś nie ma
  const NEG = /(bez|brak\w*|nie ma|nie posiada)\s+([a-z]+\s+){0,2}$/;
  function wzmianka(rx, text) {
    const g = new RegExp(rx.source, 'g'); let m, tak = false, nie = false;
    while ((m = g.exec(text))) {
      if (NEG.test(text.slice(Math.max(0, m.index - 30), m.index))) nie = true; else tak = true;
      if (!m[0].length) g.lastIndex++;
    }
    return tak ? 'tak' : nie ? 'nie' : null;
  }
  const NA_PIETRZE = ['mieszkanie', 'pokoj', 'lokal'];

  function score(p, raw) {
    const text = norm(raw);
    const r = { pts: 0, max: 0, why: [], bad: [], miss: [], reject: null, data: {} };
    const luz = new Set(p.luzne || []);
    const chk = (cond, w, ok, bad) => { r.max += w; if (cond) { r.pts += w; if (ok) r.why.push(ok); } else if (bad) r.bad.push(bad); };
    const rej = msg => { r.reject = msg; return r; };
    // Naruszone kryterium. Twarde (domyślnie) odrzuca ogłoszenie. Elastyczne daje odchylenie,
    // chyba że wynik jest daleko poza tolerancją (far); wtedy też odrzuca.
    const narusz = (key, msg, far) => {
      if (luz.has(key) && !far) r.miss.push(msg);
      else if (!r.reject) r.reject = msg + (luz.has(key) ? ' (poza tolerancją)' : '');
    };
    function zakres(key, val, od, doo, tolRel, tolAbs, label, grace) {
      const g = grace || 0;
      let side = 0, edge;
      if (doo != null && val > doo * (1 + g)) { side = 1; edge = doo; }
      else if (od != null && val < od * (1 - g)) { side = -1; edge = od; }
      if (!side) return true;
      const diff = Math.abs(val - edge);
      const far = diff > Math.abs(edge) * (tolRel + g) + tolAbs;
      const proc = edge && tolRel ? Math.round(100 * diff / Math.abs(edge)) : 0;
      narusz(key, label + (side > 0 ? ' ponad widełki' : ' poniżej widełek') + (proc ? ' (' + (side > 0 ? '+' : '−') + proc + '%)' : ''), far);
      return false;
    }

    // Zawsze twarde: definiują, czego w ogóle szukasz.
    for (const k of (p.slowaMinus || [])) if (text.includes(norm(k))) return rej('wykluczone słowo: ' + k);
    for (const k of (p.slowaMusza || [])) if (!text.includes(norm(k))) return rej('brak wymaganego: ' + k);
    if (p.bezRezerwacji && /\b(rezerwacja|zarezerwowan|sprzedane|wynajete|nieaktualn)/.test(text)) return rej('rezerwacja / nieaktualne');

    const wyn = p.transakcja === 'wynajem';
    const isWyn = /wynajm|do wynajecia|najem|czynsz najmu|\/mc|\/ mc|miesiecznie|za miesiac|\/msc|mies\./.test(text);
    const isSprz = /sprzedam|na sprzedaz|sprzedaz|sprzedaje|cena ofertowa|do sprzedania/.test(text);
    if (wyn && isSprz && !isWyn) return rej('to ogłoszenie sprzedaży, a szukasz wynajmu');
    if (!wyn && isWyn && !isSprz) return rej('to ogłoszenie wynajmu, a szukasz kupna');
    const typ = p.typ || 'mieszkanie';
    const typeHit = RX.typ[typ].test(text);
    const other = Object.entries(RX.typStrict).find(([k, rx]) => k !== typ && rx.test(text));
    if (!typeHit && other) return rej('to ' + other[0] + ', a szukasz: ' + typ);
    const d = parse(raw); r.data = d;
    const szukam = /\b(szukam|poszukuj\w*|kupie|kupię|chetnie kupie|zamienie)\b/.test(text) && !isSprz && !/do wynajecia|na sprzedaz|oferuj|sprzedaz/.test(text);
    if (szukam) return rej('to ogłoszenie „szukam”, nie oferta');
    const evidence = (typeHit ? 1 : 0) + (d.area !== undefined ? 1 : 0) + (d.price !== undefined || d.priceAll ? 1 : 0) + (d.rooms !== undefined ? 1 : 0) + (isSprz || isWyn ? 1 : 0);
    if (evidence < 2 || !(typeHit || d.area !== undefined || d.rooms !== undefined)) return rej('nie wygląda na ogłoszenie nieruchomości');
    chk(typeHit, 1, 'typ pasuje', 'brak słowa o typie');

    // Od tego miejsca kryteria mogą być twarde albo elastyczne (przełącznik przy sekcji w aplikacji).
    const unik = (p.dzielniceNie || []).find(k => text.includes(norm(k)));
    if (unik) narusz('dzielniceNie', 'unikane miejsce: ' + unik);
    if (p.bezCenyUzgodnienia && /cena do uzgodnienia/.test(text)) narusz('bezCenyUzgodnienia', 'cena do uzgodnienia');
    if (p.bezTbs && /\btbs\b|lokatorsk/.test(text)) narusz('bezTbs', 'TBS / lokatorskie');
    if (p.bezUdzialu && /udzial(u|y|ow)? w (nieruchomosci|mieszkaniu|domu)|\d\/\d udzial/.test(text)) narusz('bezUdzialu', 'udział w nieruchomości');
    if (p.bezWielkiejPlyty && /wielk\w* plyt/.test(text)) narusz('bezWielkiejPlyty', 'wielka płyta');
    if (p.bezPiecaWeglowego && /piec weglowy|ekogroszek|na wegiel|weglow/.test(text)) narusz('bezPiecaWeglowego', 'piec węglowy');
    if (p.bezInwestycji && /pakiet mieszkan|pod inwestycj|dla inwestora/.test(text)) narusz('bezInwestycji', 'oferta inwestycyjna');
    if (p.zwierzeta === 'tak' && /bez zwierzat|zwierzeta nie|zwierzat nie|zwierzat brak|nie akceptuj\w* zwierz/.test(text)) narusz('zwierzeta', 'bez zwierząt');
    if (p.bezKredytu && /tylko gotowk|gotowka tylko|wylacznie gotowk/.test(text)) narusz('bezKredytu', 'tylko gotówka');
    if (p.bezObciazen && /(z|wraz z) lokator|zamieszkal\w* przez lokator|hipotek\w* do splaty|obciazon\w* hipotek|nieruchomosc obciazona/.test(text)) narusz('bezObciazen', 'obciążenie / lokator');

    let price = d.price;
    if (price === undefined && d.priceAll) price = wyn ? d.priceAll[0] : Math.max(...d.priceAll);
    if (price !== undefined) r.data.price = price;
    if (p.cenaDo || p.cenaOd) {
      r.max += 3;
      if (price === undefined) r.bad.push('nie widzę ceny');
      else if (zakres(p.cenaDo && price > p.cenaDo ? 'cenaDo' : 'cenaOd', price, p.cenaOd, p.cenaDo, 0.15, 0, 'cena ' + fmt(price))) { r.pts += 3; r.why.push('cena ' + fmt(price)); }
    } else if (price !== undefined) r.why.push('cena ' + fmt(price));
    if (p.powOd || p.powDo) {
      r.max += 2;
      const a = typ === 'dzialka' ? (d.plot ?? d.area) : d.area;
      if (a === undefined) r.bad.push('nie widzę metrażu');
      else if (zakres(p.powDo && a > p.powDo ? 'powDo' : 'powOd', a, p.powOd, p.powDo, 0.17, 0, 'metraż ' + a + ' m²', 0.03)) { r.pts += 2; r.why.push(a + ' m²'); }
    } else if (d.area) r.why.push(d.area + ' m²');
    if ((p.dzialkaOd || p.dzialkaDo) && typ !== 'dzialka') {
      r.max += 1;
      if (d.plot === undefined) r.bad.push('nie widzę pow. działki');
      else if (zakres(p.dzialkaDo && d.plot > p.dzialkaDo ? 'dzialkaDo' : 'dzialkaOd', d.plot, p.dzialkaOd, p.dzialkaDo, 0.2, 0, 'działka ' + d.plot + ' m²')) { r.pts += 1; r.why.push('działka ' + d.plot + ' m²'); }
    } else if (d.plot && typ !== 'dzialka') r.why.push('działka ' + d.plot + ' m²');
    if (p.pokojeOd || p.pokojeDo) {
      r.max += 2;
      const est = d.roomsEst ? ' (z sypialni)' : '';
      if (d.rooms === undefined) r.bad.push('nie widzę liczby pokoi');
      else if (zakres(p.pokojeDo && d.rooms > p.pokojeDo ? 'pokojeDo' : 'pokojeOd', d.rooms, p.pokojeOd, p.pokojeDo, 0, 1, d.rooms + ' pok.' + est)) { r.pts += 2; r.why.push(d.rooms + ' pok.' + est); }
    }
    if (p.lazienkiMin && ['mieszkanie', 'dom'].includes(typ)) {
      r.max += 1;
      if (d.baths === undefined) r.bad.push('nie widzę liczby łazienek');
      else if (zakres('lazienkiMin', d.baths, +p.lazienkiMin, undefined, 0, 1, d.baths + ' łaz.')) { r.pts += 1; r.why.push(d.baths + ' łaz.'); }
    }
    if (NA_PIETRZE.includes(typ)) {
      if (p.pietroOd !== undefined || p.pietroDo !== undefined) {
        r.max += 1;
        if (d.floor === undefined) r.bad.push('nie widzę piętra');
        else if (zakres(p.pietroDo !== undefined && d.floor > p.pietroDo ? 'pietroDo' : 'pietroOd', d.floor, p.pietroOd, p.pietroDo, 0, 1, 'piętro ' + d.floor)) { r.pts += 1; r.why.push('piętro ' + d.floor); }
      }
      if (p.pietraMax && d.floors !== undefined) { if (zakres('pietraMax', d.floors, undefined, p.pietraMax, 0, 1, 'budynek ma ' + d.floors + ' pięter')) r.why.push(d.floors + ' pięter'); }
    }
    if (p.rokOd || p.rokDo) {
      r.max += 1;
      if (d.year === undefined) r.bad.push('nie widzę roku budowy');
      else if (zakres(p.rokDo && d.year > p.rokDo ? 'rokDo' : 'rokOd', d.year, p.rokOd, p.rokDo, 0, 10, 'rok ' + d.year)) { r.pts += 1; r.why.push('rok ' + d.year); }
    }
    if ((p.cenaM2Do || p.cenaM2Od) && price !== undefined && d.area) {
      const m2 = Math.round(price / d.area); r.max += 1;
      if (zakres(p.cenaM2Do && m2 > p.cenaM2Do ? 'cenaM2Do' : 'cenaM2Od', m2, p.cenaM2Od, p.cenaM2Do, 0.15, 0, fmt(m2) + '/m²')) { r.pts += 1; r.why.push(fmt(m2) + '/m²'); }
    }
    if (p.czynszMax) { const m = text.match(/czynsz\w*[^\d]{0,15}(\d{3,5})/); if (m && zakres('czynszMax', +m[1], undefined, p.czynszMax, 0.2, 0, 'czynsz ' + m[1] + ' zł')) r.why.push('czynsz ' + m[1] + ' zł'); }
    if (p.kaucjaMax) { const m = text.match(/kaucj\w*[^\d]{0,15}(\d{1,3}(?:[ .]\d{3})+|\d{3,6})/); if (m) zakres('kaucjaMax', num(m[1]), undefined, p.kaucjaMax, 0.25, 0, 'kaucja ' + fmt(num(m[1]))); }

    // Cechy: wzmianka daje punkt, brak wzmianki tylko uwagę, a wprost „nie ma” narusza kryterium.
    (p.udog || []).forEach(u => {
      const w = wzmianka(RX.udog[u] || new RegExp(norm(u).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), text);
      r.max += 1;
      if (w === 'tak') { r.pts += 1; r.why.push('ma: ' + u); } else if (w === 'nie') narusz('udog', 'nie ma: ' + u); else r.bad.push('nie wspomina: ' + u);
    });
    (p.media || []).forEach(u => {
      const w = wzmianka(RX.media[u] || new RegExp(norm(u)), text);
      r.max += 1;
      if (w === 'tak') { r.pts += 1; r.why.push('media: ' + u); } else if (w === 'nie') narusz('media', 'brak: ' + u); else r.bad.push('nie wspomina: ' + u);
    });
    (p.prawne || []).forEach(u => {
      r.max += 1;
      if (u === 'bez służebności') {
        if (/bez sluzebnosci|brak sluzebnosci|nie ma sluzebnosci/.test(text)) { r.pts += 1; r.why.push('bez służebności'); }
        else if (/sluzebnos/.test(text)) narusz('prawne', 'służebność');
        return;
      }
      const w = wzmianka(RX.prawne[u] || new RegExp(norm(u)), text);
      if (w === 'tak') { r.pts += 1; r.why.push(u); } else if (w === 'nie') narusz('prawne', 'brak: ' + u);
    });
    // Zaznaczone „akceptowane” warianty: gdy ogłoszenie podaje inny, kryterium jest naruszone.
    const warianty = (key, map, chosen, etykieta) => {
      const found = Object.keys(map).filter(k => map[k].test(text));
      const ok = chosen.filter(k => map[k] && map[k].test(text));
      r.max += 1;
      if (ok.length) { r.pts += 1; r.why.push(etykieta + ok[0]); }
      else if (found.length) narusz(key, etykieta + found.join(', '));
      return found.length > 0;
    };
    if (p.stan && p.stan.length && typ !== 'dzialka') { if (!warianty('stan', RX.stan, p.stan, 'stan: ')) r.bad.push('brak info o stanie'); }
    if (p.zabudowa && p.zabudowa.length && NA_PIETRZE.includes(typ)) warianty('zabudowa', RX.zabudowa, p.zabudowa, 'zabudowa: ');
    if (p.rodzajDomu && p.rodzajDomu.length && typ === 'dom') warianty('rodzajDomu', RX.rodzaj, p.rodzajDomu, 'dom: ');
    if (p.kondygnacje && typ === 'dom') warianty('kondygnacje', RX.kondyg, [p.kondygnacje], 'dom ');
    if (p.ogrzewanie && p.ogrzewanie.length) chk(hasAny(RX.ogrz, p.ogrzewanie, text), 1, 'ogrzewanie pasuje', null);
    if (p.material && p.material.length) chk(hasAny({}, p.material, text), 1, 'materiał pasuje', null);
    (p.instal || []).forEach(u => chk(RX.instal[u] ? RX.instal[u].test(text) : text.includes(norm(u)), 1, u, null));
    (p.ekspozycja || []).forEach(u => chk(RX.ekspo[u] ? RX.ekspo[u].test(text) : false, 1, 'okna: ' + u, null));
    if (p.rynek) {
      const pierw = /rynek pierwotny|od dewelopera|bezposrednio od dewelopera|nowa inwestycja/.test(text), wtor = /rynek wtorny/.test(text);
      if (p.rynek === 'pierwotny' && wtor && !pierw) narusz('rynek', 'rynek wtórny');
      else if (p.rynek !== 'pierwotny' && pierw && !wtor) narusz('rynek', 'rynek pierwotny');
      else chk(text.includes(norm(p.rynek)) || (p.rynek === 'pierwotny' && /dewelop/.test(text)), 1, 'rynek ' + p.rynek, null);
    }
    if (NA_PIETRZE.includes(typ)) {
      if (p.winda === 'tak') { if (/(bez|brak|nie ma) windy/.test(text)) narusz('winda', 'brak windy'); else chk(/wind[aąęy]/.test(text), 2, 'winda', 'nie wspomina o windzie'); }
      if (p.winda === 'niekoniecznie') chk(/wind[aąęy]/.test(text), 1, 'winda', null);
    }
    if (p.zwierzeta === 'tak') chk(/zwierz/.test(text), 1, 'zwierzęta OK', null);
    if (p.rozkladowe) chk(/rozkladow|bez przechodnich|niezalezne pokoje/.test(text), 1, 'rozkładowe', null);
    if (p.dwustronne) chk(/dwustronn/.test(text), 1, 'dwustronne', null);
    if (['mieszkanie', 'dom'].includes(typ)) {
      const oddz = /oddzieln\w* kuchni|kuchnia oddzieln|osobn\w* kuchni|kuchnia osobn/.test(text), aneks = /aneks/.test(text);
      if (p.kuchnia === 'oddzielna') { if (aneks && !oddz) narusz('kuchnia', 'aneks zamiast oddzielnej kuchni'); else chk(oddz, 1, 'kuchnia oddzielna', null); }
      if (p.kuchnia === 'aneks') chk(aneks, 1, 'aneks', null);
    }
    if (p.doNegocjacji) chk(/do negocjacji|negocjacj/.test(text), 1, 'do negocjacji', null);
    if (p.bezProwizji) chk(/bez prowizji|0% prowizji|bez posrednik/.test(text), 1, 'bez prowizji', null);
    const biuro = /biuro nieruchomosci|posrednik|agencj|prowizj|licencj/.test(text) && !/bez posrednik|bez prowizji|bezposrednio|0% prowizji/.test(text);
    const prywatnie = /bezposrednio|bez posrednik|od wlasciciela|wlasciciel|prywatn/.test(text);
    if (p.odkogo === 'bezposrednio') { if (biuro) narusz('odkogo', 'wygląda na biuro'); else chk(prywatnie, 1, 'bezpośrednio', null); }
    if (p.odkogo === 'biuro') { if (prywatnie && !biuro && /bez posrednik|od wlasciciela/.test(text)) narusz('odkogo', 'ogłoszenie prywatne'); else chk(/biuro|posrednik|agencj|oferta nr|nr oferty/.test(text), 1, 'biuro', null); }
    if (p.zTelefonem) chk(/(\+?48[ -]?)?\d{3}[ -]?\d{3}[ -]?\d{3}/.test(raw), 1, 'jest telefon', 'brak telefonu');
    if (p.zAdresem) chk(/\bul\.|ulic[aey]|\bal\.|\bos\.|osiedl/.test(text), 1, 'jest ulica', 'brak ulicy');
    if (p.zPlanem) chk(/\brzut|plan mieszkania|plan domu|plan pieter/.test(text), 1, 'jest rzut', null);
    (p.otoczenie || []).forEach(o => { const map = { 'cicha okolica': /cich|spokojn/, 'widok': /widok/, 'ostatnie piętro': /ostatni\w* pietr/, 'nie parter': null, 'parter z ogródkiem': /parter.{0,30}ogrod/, 'komunikacja miejska': /tramwaj|autobus|przystan|komunikac|metro|skm|pkp/, 'blisko autostrady': /autostrad|obwodnic|a[124]\b|s\d\b/, 'nie przy torach': null };
      if (o === 'nie parter') { if (NA_PIETRZE.includes(typ) && d.floor === 0) narusz('otoczenie', 'parter'); } else if (map[o]) chk(map[o].test(text), 1, o, null); });
    (p.przezn || []).forEach(m => chk(text.includes(norm(m)), 1, 'działka ' + m, null));
    (p.teren || []).forEach(m => chk(text.includes(norm(m).replace('droga ', '')), 1, m, null));
    (p.slowaPlus || []).forEach(k => chk(text.includes(norm(k)), 1, 'plus: ' + k, null));
    if (p.miasto) chk(text.includes(norm(p.miasto)), 1, 'miasto: ' + p.miasto, null);
    if (p.dzielnice && p.dzielnice.length) { r.max += 2; const hit = p.dzielnice.find(x => text.includes(norm(x))); if (hit) { r.pts += 2; r.why.push('miejsce: ' + hit); } }

    if (r.reject) return r;
    if (r.miss.length > 2) return rej('za dużo odchyleń (' + r.miss.length + '): ' + r.miss.join('; '));
    r.pct = r.max ? Math.round(100 * Math.max(0, r.pts) / r.max) : (r.pts >= 0 ? 100 : 0);
    return r;
  }
  // klasa wyniku: ok = pasuje, near = prawie (odchylenia od kryteriów elastycznych), weak = słabo, bad = odpada
  const klasa = r => r.reject ? 'bad' : (r.miss && r.miss.length) ? 'near' : (r.pct || 0) >= 50 ? 'ok' : 'weak';

  /* ---------- kandydaci na stronie ---------- */
  const visible = el => !!(el && (el.offsetWidth || el.offsetHeight || (el.getClientRects && el.getClientRects().length)));
  const MSG = '[data-ad-preview="message"],[data-ad-comet-preview="message"],[data-ad-rendering-role="story_message"]';
  // Komentarze na Facebooku też mają role="article". Poznać je po etykiecie („Komentarz użytkownika…”) albo po liście.
  function isComment(el) {
    const lab = norm(el.getAttribute('aria-label') || '');
    return /^(komentarz|odpowiedz|comment|reply)\b/.test(lab) || !!el.closest('li');
  }
  const outermost = list => list.filter(el => !list.some(o => o !== el && o.contains(el)));
  // Post otwarty w okienku nad feedem. Wtedy czytamy okienko, nie feed pod spodem.
  function openPostDialog() {
    const ds = [...document.querySelectorAll('div[role="dialog"]')].filter(visible);
    for (let i = ds.length - 1; i >= 0; i--) {
      const dl = ds[i];
      if ((dl.innerText || '').length > 60 && dl.querySelector(MSG + ',div[role="article"],a[href*="/posts/"],a[href*="permalink"],a[href*="story_fbid"]')) return dl;
    }
    return null;
  }
  let lastWhere = '';
  function marketplaceCards() {
    const seen = new Set(), out = [];
    document.querySelectorAll('a[href*="/marketplace/item/"]').forEach(a => {
      const id = (a.getAttribute('href').match(/item\/(\d+)/) || [])[1];
      if (!id || seen.has(id) || !visible(a) || (a.innerText || '').trim().length < 8) return;
      seen.add(id); out.push(a);
    });
    return out;
  }
  function candidatesFB(opts = {}) {
    if (/^\/marketplace/.test(location.pathname)) { lastWhere = 'Marketplace'; return marketplaceCards(); }
    const dlg = opts.dialog === false ? null : openPostDialog();
    const root = dlg || document;
    let list = [];
    // 1. wpisy w feedzie (grupa, wyniki wyszukiwania postów)
    // (pasek „sortuj aktualności” i zaślepki ładowania też są wpisami feedu, więc wymagamy śladu posta)
    root.querySelectorAll('div[role="feed"] > div, [aria-posinset]').forEach(el => { if (el.querySelector('[data-ad-rendering-role],a[aria-labelledby],div[role="article"],' + MSG) || (el.innerText || '').length > 200) list.push(el); });
    // 2. role="article", które nie są komentarzami
    root.querySelectorAll('div[role="article"]').forEach(a => { if (!isComment(a) && !a.parentElement.closest('div[role="article"]')) list.push(a); });
    // 3. treść posta bez żadnego z powyższych: idziemy w górę do granicy z sąsiednim postem
    root.querySelectorAll(MSG).forEach(m => {
      if (list.some(el => el.contains(m))) return;
      let c = m;
      for (let k = 0; k < 40 && c.parentElement; k++) {
        const up = c.parentElement;
        if (up.querySelectorAll(MSG).length > 1 || c === root || c.getAttribute('role') === 'main') break;
        c = up;
        if (up === root) break;
      }
      list.push(c);
    });
    list = outermost(list).filter(el => visible(el) && (el.innerText || '').trim().length > 40);
    // pojedynczy post (okienko albo osobna strona posta), w którym nic nie rozpoznaliśmy
    const permalink = /\/posts\/|\/permalink\/|story_fbid|multi_permalinks/.test(location.href);
    if (!list.length && dlg) list = [dlg];
    if (!list.length && permalink) { const main = document.querySelector('[role="main"]'); if (main) list = [main]; }
    lastWhere = dlg ? 'otwarty post (okienko)' : permalink ? 'strona posta' : 'feed';
    return list;
  }
  function candidatesGeneric() {
    const out = []; const seen = new Set();
    const nodes = document.body.querySelectorAll('article, li, div, section, tr');
    const rx = /(zł|pln)/i, rx2 = /m\s?(2|²|kw)/i;
    nodes.forEach(el => {
      if (el.closest('nav, header, footer, script, style') || el.dataset.szukaczBadge) return;
      const t = el.innerText || ''; if (t.length < 40 || t.length > 2500) return;
      if (!rx.test(t) || !rx2.test(t)) return;
      const childHas = [...el.children].some(c => { const ct = c.innerText || ''; return ct.length >= 40 && rx.test(ct) && rx2.test(ct) && ct.length < t.length * 0.9; });
      if (childHas) return;
      if ([...seen].some(s => s.contains(el))) return;
      seen.add(el); out.push(el);
    });
    lastWhere = 'strona';
    return out;
  }
  function cleanUrl(href) { try { const u = new URL(href, location.href); u.search = ''; u.hash = ''; return u.toString(); } catch (e) { return null; } }
  function linkOf(el) {
    if (el.matches && el.matches('a[href]')) return cleanUrl(el.getAttribute('href')) || location.href;
    const a = el.querySelector('a[href*="/posts/"], a[href*="permalink"], a[href*="story_fbid"], a[href*="/photo"]') || el.querySelector('a[href]');
    if (!a) return location.href;
    return cleanUrl(a.getAttribute('href')) || location.href;
  }

  /* ---------- treść posta bez komentarzy ---------- */
  // Granica treści posta. Pasek „Lubię to / Komentarz” ma dziś same ikony, więc tniemy na polu komentarza i liczniku odpowiedzi
  // (sprawdzone na grupach 2026-11-15: „Skomentuj jako Paweł”, „Odpowiedz jako…”, „Wyświetl wszystkie 3 odpowiedzi”).
  const AKCJE = /(Wszystkie reakcje:|All reactions:|Lubię to!?\s+(Komentarz|Skomentuj)|Like\s+Comment|Skomentuj jako|Odpowiedz jako|Comment as|Reply as|Napisz (publiczny )?komentarz|Write a (public )?comment|Wyświetl (więcej|wcześniejsze|wszystkie[^.]{0,12}) (komentarz\w*|odpowiedzi)|View (more|previous|all)[^.]{0,12} (comments|replies)|wyłączył\(a\) komentowanie|turned off commenting|Nie ma jeszcze komentarzy|Najtrafniejsze|Most relevant)/i;
  const zwin = s => (s || '').replace(/\s+/g, ' ').trim();
  function postText(el) {
    let t = zwin(el.innerText);
    el.querySelectorAll('div[role="article"]').forEach(c => {
      if (c === el || !isComment(c)) return;
      const ct = zwin(c.innerText); if (ct.length > 15) t = t.split(ct).join(' ');
    });
    t = zwin(t);
    t = t.replace(/(?:\bFacebook\s*){3,}/g, ' '); // Facebook wstawia w nagłówek i stopkę ukryty ciąg „Facebook Facebook…”
    const cut = t.search(AKCJE);
    if (cut > 30) t = t.slice(0, cut);
    return t.replace(/(Zobacz więcej|Wyświetl więcej|Wyświetl mniej|Zobacz mniej|See more|See less|Zobacz tłumaczenie|Wyświetl tłumaczenie|See translation|Wyślij wiadomość|Zadzwoń teraz)/gi, ' ').replace(/\s+/g, ' ').trim();
  }
  function msgText(el) { const m = el.querySelector && el.querySelector(MSG); return m ? (m.innerText || '') : ''; }
  // odcisk treści: ten sam post wrzucony do kilku grup ma ten sam odcisk
  function odcisk(el, text) { return norm(msgText(el) || text.slice(40)).replace(/[^a-z0-9]/g, '').slice(0, 160); }

  /* ---------- oznaczanie ---------- */
  const CLS = 'szukacz-badge';
  const KOLOR = { ok: '#1f9d6b', near: '#2f7fd1', weak: '#c47f12', bad: '#c0392b' };
  function clearMarks() {
    document.querySelectorAll('.' + CLS).forEach(b => b.remove());
    document.querySelectorAll('[data-szukacz]').forEach(el => { el.style.outline = ''; el.style.opacity = ''; delete el.dataset.szukacz; });
  }
  function mark(el, r, opts, idx) {
    el.dataset.szukacz = idx;
    const k = klasa(r);
    el.style.outline = (k === 'bad' ? '2px dashed ' : '3px solid ') + KOLOR[k];
    el.style.outlineOffset = '-2px';
    if (r.reject && opts.dim) el.style.opacity = '0.35';
    const b = document.createElement('div'); b.className = CLS; b.dataset.szukaczBadge = '1';
    b.style.cssText = 'position:absolute;top:6px;right:6px;z-index:9999;font:600 12px/1.3 -apple-system,Segoe UI,sans-serif;padding:5px 9px;border-radius:999px;max-width:60%;box-shadow:0 1px 4px rgba(0,0,0,.25);cursor:default;color:#fff;background:' + KOLOR[k];
    b.textContent = k === 'bad' ? '✕ ' + r.reject : k === 'near' ? '≈ ' + r.pct + '% · prawie: ' + r.miss.join(' · ') : (k === 'ok' ? '✓ ' : '~ ') + r.pct + '% · ' + r.why.slice(0, 3).join(' · ');
    b.title = (r.why.length ? 'Pasuje: ' + r.why.join(', ') + '\n' : '') + (r.miss.length ? 'Odchylenia: ' + r.miss.join(', ') + '\n' : '') + (r.bad.length ? 'Brakuje: ' + r.bad.join(', ') : '');
    const cs = getComputedStyle(el); if (cs.position === 'static') el.style.position = 'relative';
    el.appendChild(b);
  }

  async function scan(profile, opts = {}) {
    clearMarks();
    let els = isFB ? candidatesFB() : candidatesGeneric();
    if (isFB) { els.forEach(expandPost); await sleep(350); els = candidatesFB(); await odslonLinki(els); }
    const results = [];
    els.forEach((el, i) => {
      const raw = isFB ? postText(el) : (el.innerText || '').replace(/\s+/g, ' ').trim();
      const r = score(profile, raw);
      mark(el, r, opts, i);
      // post w okienku albo na osobnej stronie: pasek adresu ma już link do posta
      const link = isFB && lastWhere !== 'feed' && /\/posts\/|\/permalink\/|story_fbid|multi_permalinks/.test(location.href) ? cleanUrl(location.href) : (isFB && postLink(el)) || linkOf(el);
      results.push({ idx: i, pct: r.pct || 0, reject: r.reject, why: r.why, bad: r.bad, miss: r.miss, snippet: raw.slice(0, 220), text: raw.slice(0, 2000), link, data: r.data });
    });
    const ord = { ok: 0, near: 1, weak: 2, bad: 3 };
    results.sort((a, b) => ord[klasa(a)] - ord[klasa(b)] || b.pct - a.pct);
    return { host: location.hostname, where: lastWhere, total: results.length, results };
  }


  /* ---------- daty postów ---------- */
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const MIES = { stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6, lipca: 7, sierpnia: 8, wrzesnia: 9, pazdziernika: 10, listopada: 11, grudnia: 12,
    sty: 1, lut: 2, mar: 3, kwi: 4, maj: 5, cze: 6, lip: 7, sie: 8, wrz: 9, paz: 10, lis: 11, gru: 12,
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
    jan: 1, feb: 2, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
  function parseDate(txt) {
    if (!txt) return null;
    let t = norm(txt).replace(/\s+/g, ' ').trim();
    if (!t || t.length > 60) return null;
    t = t.replace(/\s+(temu|ago)$/, '').replace(/^(poniedzialek|wtorek|sroda|czwartek|piatek|sobota|niedziela|monday|tuesday|wednesday|thursday|friday|saturday|sunday),\s*/, '');
    const now = new Date(); let m;
    if (/^(wlasnie teraz|teraz|just now|now|kilka sekund|\d+ s(ek\w*)?|a few seconds)$/.test(t)) return now;
    // „minutę temu”, „godzinę temu”, „dzień temu”, „tydzień temu”, „miesiąc temu”, „rok temu”
    const slowo = { minute: 60e3, minuta: 60e3, 'a minute': 60e3, godzine: 3600e3, godzina: 3600e3, 'an hour': 3600e3, dzien: 864e5, 'a day': 864e5, tydzien: 7 * 864e5, 'a week': 7 * 864e5, miesiac: 30 * 864e5, 'a month': 30 * 864e5, rok: 365 * 864e5, 'a year': 365 * 864e5 };
    if (slowo[t]) return new Date(now - slowo[t]);
    if ((m = t.match(/^(\d+)\s*(mies|mo)/))) return new Date(now - m[1] * 30 * 864e5);
    if ((m = t.match(/^(\d+)\s*(lat|lata|rok|y)\b/))) return new Date(now - m[1] * 365 * 864e5);
    if ((m = t.match(/^(\d+)\s*(min|m)\b/))) return new Date(now - m[1] * 60e3);
    if ((m = t.match(/^(\d+)\s*(godz|g|h|hr|hrs)\b/))) return new Date(now - m[1] * 3600e3);
    if ((m = t.match(/^(\d+)\s*(dni|dzien|d)\b/))) return new Date(now - m[1] * 864e5);
    if ((m = t.match(/^(\d+)\s*(tyg|tydz|w)\b/))) return new Date(now - m[1] * 7 * 864e5);
    if (/^(wczoraj|yesterday)/.test(t)) return new Date(now - 864e5);
    if ((m = t.match(/^(\d{1,2})\s+([a-z]+)\.?(?:\s+(\d{4}))?/))) {
      const mo = MIES[m[2]]; if (mo) { const y = m[3] ? +m[3] : now.getFullYear(); const d = new Date(y, mo - 1, +m[1], 12); const g = t.match(/\bo (\d{1,2}):(\d{2})/); if (g) d.setHours(+g[1], +g[2]); if (!m[3] && d > now) d.setFullYear(y - 1); return d; }
    }
    if ((m = t.match(/^([a-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?/))) {
      const mo = MIES[m[1]]; if (mo) { const y = m[3] ? +m[3] : now.getFullYear(); const d = new Date(y, mo - 1, +m[2], 12); if (!m[3] && d > now) d.setFullYear(y - 1); return d; }
    }
    if ((m = t.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/))) return new Date(+m[3], +m[2] - 1, +m[1], 12);
    return null;
  }
  // Odnośnik z datą posta: ma aria-labelledby wskazujące ukryty opis („3 godz. temu”). Adres posta dostaje dopiero po najechaniu myszką.
  function kotwicaDaty(post) {
    for (const a of post.querySelectorAll('a[aria-labelledby]')) {
      const c = a.closest('div[role="article"]'); if (c && c !== post && isComment(c)) continue;
      const lab = document.getElementById(a.getAttribute('aria-labelledby'));
      if (lab && parseDate(lab.innerText)) return { a, data: parseDate(lab.innerText) };
    }
    return null;
  }
  function najedz(a, on) {
    const evs = on ? ['pointerover', 'pointerenter', 'mouseover', 'mouseenter', 'mousemove', 'focus', 'focusin'] : ['pointerout', 'pointerleave', 'mouseout', 'mouseleave', 'blur', 'focusout'];
    evs.forEach(ev => { const E = ev.startsWith('pointer') ? PointerEvent : /focus|blur/.test(ev) ? FocusEvent : MouseEvent; try { a.dispatchEvent(new E(ev, { bubbles: !/enter|leave|^focus$|^blur$/.test(ev), cancelable: true, view: window })); } catch (e) {} });
  }
  // odsłania adresy postów (Facebook podstawia je przy najechaniu), potem chowa dymki
  async function odslonLinki(posts) {
    const kotwice = posts.map(kotwicaDaty).filter(k => k && !/\/posts\/|permalink|story_fbid/.test(k.a.getAttribute('href') || '')).map(k => k.a);
    if (!kotwice.length) return;
    kotwice.forEach(a => najedz(a, true)); await sleep(600); kotwice.forEach(a => najedz(a, false));
  }
  function postDate(article) {
    const k = kotwicaDaty(article); if (k) return k.data;
    const els = article.querySelectorAll('abbr[data-utime], abbr[aria-label], a[href*="/posts/"], a[href*="permalink"], a[href*="multi_permalinks"], a[href*="story_fbid"], a[aria-label]');
    for (const el of els) {
      if (el.closest('div[role="article"]') && el.closest('div[role="article"]') !== article && isComment(el.closest('div[role="article"]'))) continue;
      if (el.dataset && el.dataset.utime) return new Date(+el.dataset.utime * 1000);
      for (const txt of [el.getAttribute('aria-label'), el.innerText]) { const d = parseDate(txt); if (d) return d; }
    }
    return null;
  }
  function expandPost(article) {
    // tylko „Wyświetl więcej” w treści; przyciski z menu (aria-haspopup) pomijamy, żeby nie otworzyć menu posta
    article.querySelectorAll('div[role="button"], span[role="button"]').forEach(b => { if (b.hasAttribute('aria-haspopup') || b.hasAttribute('aria-expanded')) return; if (/^(zobacz wiecej|see more|wyswietl wiecej|wiecej)$/.test(norm(b.innerText || '').trim())) { try { b.click(); } catch (e) {} } });
  }
  function postLink(article) {
    const a = article.querySelector('a[href*="/posts/"], a[href*="permalink"], a[href*="multi_permalinks"], a[href*="story_fbid"]');
    return a ? cleanUrl(a.getAttribute('href')) : null;
  }
  function needLogin() {
    return /\/login|\/checkpoint|\/recover/.test(location.pathname) || !!document.querySelector('form[action*="login"], #login_form, input[name="pass"]');
  }

  /* ---------- zbieranie postów z grupy (X dni wstecz) ---------- */
  async function collect(profile, opts = {}) {
    if (needLogin()) return { needLogin: true, url: location.href };
    const days = opts.days || 7, maxPosts = opts.maxPosts || 60, maxMs = (opts.maxSeconds || 150) * 1000;
    const cutoff = Date.now() - days * 864e5;
    const seen = new Map(); const t0 = Date.now(); let idle = 0, oldInRow = 0;
    while (Date.now() - t0 < maxMs) {
      const arts = candidatesFB({ dialog: false }); let fresh = 0;
      const nowe = [];
      for (const a of arts) {
        if (!seen.has(a)) { expandPost(a); seen.set(a, { el: a, text: '', fp: '', date: null, link: null }); nowe.push(a); fresh++; }
      }
      await sleep(400);
      await odslonLinki(nowe.filter(a => a.isConnected));
      oldInRow = 0;
      for (const rec of seen.values()) {
        if (!rec.el.isConnected) continue;
        const t = postText(rec.el); if (t) { rec.text = t; rec.fp = odcisk(rec.el, t); }
        rec.date = rec.date || postDate(rec.el); rec.link = rec.link || postLink(rec.el);
      }
      const recs = [...seen.values()];
      for (let i = recs.length - 1; i >= 0 && i >= recs.length - 4; i--) { if (recs[i].date && recs[i].date.getTime() < cutoff) oldInRow++; }
      if (oldInRow >= 3 || seen.size >= maxPosts) break;
      if (fresh === 0) { idle++; if (idle >= 4) break; } else idle = 0;
      window.scrollTo(0, document.documentElement.scrollHeight); await sleep(opts.scrollPause || 1600);
    }
    const results = []; let skippedOld = 0, noDate = 0;
    for (const rec of seen.values()) {
      if (!rec.text || rec.text.length < 25) continue;
      if (rec.date && rec.date.getTime() < cutoff) { skippedOld++; continue; }
      if (!rec.date) noDate++;
      const r = score(profile, rec.text);
      results.push({ pct: r.pct || 0, reject: r.reject, why: r.why, bad: r.bad, miss: r.miss, text: rec.text.slice(0, 2000), fp: rec.fp, link: rec.link || location.href.split('?')[0], date: rec.date ? rec.date.toISOString() : null, data: r.data });
    }
    const ord = { ok: 0, near: 1, weak: 2, bad: 3 };
    results.sort((a, b) => ord[klasa(a)] - ord[klasa(b)] || b.pct - a.pct);
    const title = document.title.replace(/^\(\d+\)\s*/, '').replace(/\s*\|\s*Facebook\s*$/, '').trim();
    const joinNeeded = results.length === 0 && /dolacz do grupy|join group/.test(norm(document.body.innerText || '').slice(0, 4000));
    return { url: location.href.split('?')[0], title, total: seen.size, scanned: results.length, skippedOld, noDate, joinNeeded, results, seconds: Math.round((Date.now() - t0) / 1000) };
  }

  /* ---------- zbieranie grup ze strony wyników wyszukiwania ---------- */
  async function collectGroups(opts = {}) {
    if (needLogin()) return { needLogin: true, url: location.href };
    for (let i = 0; i < (opts.scrolls || 3); i++) { window.scrollTo(0, document.documentElement.scrollHeight); await sleep(1200); }
    const out = new Map();
    document.querySelectorAll('a[href*="/groups/"]').forEach(a => {
      const m = a.href.match(/facebook\.com\/groups\/([^/?#]+)\/?(?:[?#].*)?$/); if (!m) return;
      const id = m[1]; if (/^(feed|discover|joins|create|search|your_groups|notifications)$/.test(id)) return;
      const name = (a.innerText || '').replace(/\s+/g, ' ').trim(); if (!name || name.length > 120 || /^\d+$/.test(name)) return;
      let cont = a; for (let k = 0; k < 6 && cont.parentElement; k++) cont = cont.parentElement;
      const info = ((cont.innerText || '').match(/[\d\s,.]+\s*(tys\.|K|mln|M)?\s*(czlonk|członk|members|osob|osób)\w*[^\n]*/i) || [''])[0].replace(/\s+/g, ' ').trim();
      const prev = out.get(id);
      if (!prev || (!prev.info && info)) out.set(id, { id, url: 'https://www.facebook.com/groups/' + id, name: prev && prev.name.length > name.length ? prev.name : name, info: info.slice(0, 80) });
    });
    return { url: location.href, groups: [...out.values()] };
  }

  window.__szukaczApi = { parse, score, klasa, parseDate, norm, candidatesFB, postText, postDate, postLink, odslonLinki, scan };

  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.onMessage) return;
  chrome.runtime.onMessage.addListener((msg, sender, send) => {
    if (msg.type === 'ping') { send({ ok: true, host: location.hostname }); return; }
    if (msg.type === 'scan') { scan(msg.profile, msg.opts).then(send).catch(e => send({ error: String(e) })); return true; }
    if (msg.type === 'clear') { clearMarks(); send({ ok: true }); return; }
    if (msg.type === 'goto') { const el = document.querySelector('[data-szukacz="' + msg.idx + '"]'); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } send({ ok: !!el }); return; }
    if (msg.type === 'auto') { setAuto(msg.on, msg.profile, msg.opts); send({ ok: true }); return; }
    if (msg.type === 'collect') { collect(msg.profile, msg.opts).then(send).catch(e => send({ error: String(e) })); return true; }
    if (msg.type === 'collectGroups') { collectGroups(msg.opts).then(send).catch(e => send({ error: String(e) })); return true; }
  });

  /* ---------- automatyczne skanowanie podczas przewijania (Facebook) ---------- */
  let autoOn = false, autoProfile = null, autoOpts = {}, timer = null, obs = null;
  // własne ramki i plakietki też zmieniają stronę; bez tego filtra skan wywoływał sam siebie w kółko
  const tylkoNasze = muts => muts.every(m => [...m.addedNodes, ...m.removedNodes].every(n => n.nodeType === 1 && n.classList && n.classList.contains(CLS)));
  function setAuto(on, profile, opts) {
    autoOn = on; autoProfile = profile; autoOpts = opts || {};
    if (obs) { obs.disconnect(); obs = null; }
    if (!on || !profile) return;
    scan(profile, autoOpts);
    obs = new MutationObserver(muts => { if (tylkoNasze(muts)) return; clearTimeout(timer); timer = setTimeout(() => { if (autoOn && autoProfile) scan(autoProfile, autoOpts); }, 900); });
    obs.observe(document.body, { childList: true, subtree: true });
  }
  if (isFB && chrome.storage) {
    try { chrome.storage.local.get(['profile', 'auto', 'dim'], v => { if (v.auto && v.profile) setAuto(true, v.profile, { dim: !!v.dim }); }); } catch (e) {}
  }
})();
