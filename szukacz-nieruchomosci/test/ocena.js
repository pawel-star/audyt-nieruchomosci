// Test oceny ogłoszeń z wtyczki (wtyczka/content.js): parse() i score() na przykładowych tekstach.
// Uruchom: node test/ocena.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'wtyczka', 'content.js'), 'utf8');
const ctx = { window: {}, location: { hostname: 'example.com', pathname: '/', href: 'https://example.com/' }, document: {}, console };
ctx.window = ctx; vm.createContext(ctx); vm.runInContext(src, ctx);
const { score, parse, klasa } = ctx.__szukaczApi;

let bad = 0;
function ok(name, cond, info) { if (!cond) { bad++; console.log('✗ ' + name + (info ? '\n   ' + JSON.stringify(info) : '')); } else console.log('✓ ' + name); }
const ocen = (p, t) => { const r = score(p, t); return Object.assign(r, { k: klasa(r) }); };

const DOM = { _app: 'szukacz-nieruchomosci', typ: 'dom', miasto: 'Kórnik', cenaDo: 900000, powOd: 110, powDo: 180, dzialkaOd: 600 };

// parse
ok('działka przed metrażem („800 m2 działki”)', (d => d.area === 140 && d.plot === 800)(parse('Dom 140 m2, 800 m2 działki, cena 850 tys.')), parse('Dom 140 m2, 800 m2 działki, cena 850 tys.'));
ok('działka w hektarach', parse('Siedlisko, działka 1,2 ha, dom 120 m2').plot === 12000);
ok('działka w arach', parse('działka 10 arów, dom 130 m2').plot === 1000);
ok('pokoje „liczba pokoi: 5”', parse('Dom 150 m2, liczba pokoi: 5').rooms === 5);
ok('pokoje z sypialni', (d => d.rooms === 5 && d.roomsEst)(parse('Dom 160 m2, 4 sypialnie, salon z kominkiem')));
ok('metraż z żywej grupy: taras 40 m2 nie jest metrażem domu', parse('Dom łatwy do aranżacji, ogród zimowy na obecnym otwartym 40 m2 tarasie na piętrze. Wystarczy zabudować taras i powstaje dodatkowe 40 m2 powierzchni. Przytulny dom | Radojewo | 110,90 m2').area === 110.9);
ok('metraż: „2 pokoje 48 m2” to metraż mieszkania', parse('Mieszkanie 2 pokoje 48 m2, piwnica 4 m2').area === 48);
ok('metraż: podany wprost wygrywa z całkowitą', parse('Dom, powierzchnia użytkowa 110 m2, całkowita 140 m2').area === 110);
ok('metraż: pokój 15 m2 pomijany', parse('Dom 130 m2, salon 35 m2, pokój 15 m2').area === 130);
ok('łazienki', parse('dom 150 m2, 2 łazienki').baths === 2 && parse('dwie łazienki i garderoba').baths === 2);

// ogłoszenie, które pasuje
let r = ocen(DOM, 'Sprzedam dom wolnostojący w Kórniku. Pow. 140 m2, działka 850 m2. Cena 849 000 zł. Stan do zamieszkania.');
ok('pasujący dom: ok', r.k === 'ok', r);

// komentarze nie są ogłoszeniem
r = ocen(DOM, 'Jan Kowalski Ile cena? Priv');
ok('komentarz odpada jako „nie wygląda na ogłoszenie”', r.k === 'bad' && /nie wygląda/.test(r.reject), r);

// kryterium twarde: cena za wysoka odpada
r = ocen(DOM, 'Sprzedam dom w Kórniku, 140 m2, działka 900 m2, cena 950 000 zł');
ok('cena 950 tys. przy twardej cenie: odpada', r.k === 'bad' && /cena/.test(r.reject), r);

// ta sama cena przy elastycznej cenie: prawie
const DOM_EL = Object.assign({}, DOM, { luzne: ['cenaOd', 'cenaDo', 'cenaM2Od', 'cenaM2Do'] });
r = ocen(DOM_EL, 'Sprzedam dom w Kórniku, 140 m2, działka 900 m2, cena 950 000 zł');
ok('cena +6% przy elastycznej cenie: prawie', r.k === 'near' && r.miss.length === 1, r);

// daleko poza widełkami nawet elastyczne odpada
r = ocen(DOM_EL, 'Sprzedam dom w Kórniku, 140 m2, działka 900 m2, cena 1 400 000 zł');
ok('cena +56% przy elastycznej cenie: odpada', r.k === 'bad' && /poza tolerancją/.test(r.reject), r);

// trzy odchylenia: odpada
const WSZYSTKO_EL = Object.assign({}, DOM, { luzne: ['cenaDo', 'powOd', 'powDo', 'dzialkaOd', 'dzialkaDo'] });
r = ocen(WSZYSTKO_EL, 'Sprzedam dom w Kórniku, 100 m2, działka 540 m2, cena 980 000 zł');
ok('trzy odchylenia: odpada „za dużo odchyleń”', r.k === 'bad' && /za dużo odchyleń/.test(r.reject), r);

// stan: inny niż akceptowany
r = ocen(Object.assign({}, DOM, { stan: ['do zamieszkania', 'po remoncie'] }), 'Sprzedam dom do remontu, Kórnik, 140 m2, działka 900 m2, cena 700 000 zł');
ok('stan „do remontu” przy akceptowanym „do zamieszkania”: odpada', r.k === 'bad' && /stan/.test(r.reject), r);
r = ocen(Object.assign({}, DOM, { stan: ['do zamieszkania'] }), 'Sprzedam dom do zamieszkania, poddasze do wykończenia, Kórnik, 140 m2, działka 900 m2, cena 700 000 zł');
ok('stan mieszany z akceptowanym: nie odpada', r.k !== 'bad', r);

// rodzaj domu
r = ocen(Object.assign({}, DOM, { rodzajDomu: ['wolnostojący'] }), 'Sprzedam bliźniak w Kórniku, 140 m2, działka 600 m2, cena 790 000 zł');
ok('bliźniak przy „wolnostojący”: odpada', r.k === 'bad' && /bliźniak/.test(r.reject), r);

// „bez garażu” wprost
r = ocen(Object.assign({}, DOM, { udog: ['garaż'] }), 'Sprzedam dom w Kórniku, 140 m2, działka 700 m2, cena 800 000 zł, bez garażu');
ok('„bez garażu” przy wymaganym garażu: odpada', r.k === 'bad' && /garaż/.test(r.reject), r);
r = ocen(Object.assign({}, DOM, { udog: ['garaż'] }), 'Sprzedam dom w Kórniku, 140 m2, działka 700 m2, cena 800 000 zł');
ok('brak wzmianki o garażu: nie odpada, tylko uwaga', r.k !== 'bad' && r.bad.includes('nie wspomina: garaż'), r);
r = ocen(Object.assign({}, DOM, { udog: ['balkon'] }), 'Sprzedam dom, brak czynszu, balkon od południa, 140 m2, działka 700 m2, cena 800 000 zł');
ok('„brak czynszu, balkon” nie myli się z „brak balkonu”', r.why.includes('ma: balkon'), r);

// tylko bezpośrednio
r = ocen(Object.assign({}, DOM, { odkogo: 'bezposrednio' }), 'Biuro nieruchomości XYZ poleca: dom w Kórniku 140 m2, działka 700 m2, cena 800 000 zł, prowizja 2%');
ok('biuro przy „tylko bezpośrednio”: odpada', r.k === 'bad' && /biuro/.test(r.reject), r);

// piętro nie dotyczy domu
r = ocen(Object.assign({}, DOM, { pietroOd: 1, pietroDo: 3 }), 'Sprzedam dom parterowy, Kórnik, 140 m2, działka 700 m2, cena 800 000 zł');
ok('piętro z profilu mieszkania nie odrzuca domu', r.k !== 'bad', r);

// mieszkanie: winda
const M = { typ: 'mieszkanie', cenaDo: 600000, winda: 'tak' };
r = ocen(M, 'Sprzedam mieszkanie 3 pokoje 58 m2, 4 piętro, blok bez windy, cena 550 000 zł');
ok('„bez windy” przy wymaganej windzie: odpada', r.k === 'bad' && /windy/.test(r.reject), r);

// umeblowane vs nieumeblowane
r = ocen({ typ: 'mieszkanie', udog: ['umeblowane'] }, 'Sprzedam mieszkanie 2 pokoje 45 m2 nieumeblowane, cena 450 000 zł');
ok('„nieumeblowane” nie liczy się jako „umeblowane”', !r.why.includes('ma: umeblowane'), r);

console.log(bad ? '\n' + bad + ' błędów' : '\nwszystko w porządku');
process.exit(bad ? 1 : 0);
