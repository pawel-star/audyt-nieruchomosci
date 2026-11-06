// Regresja importu z okna „Wklej wyniki”: te same wklejki na bieżącej wersji i opcjonalnie na poprzedniej.
// Tabela: id, kod przed, kod po, status przed, status po. Każdy przypadek ma oczekiwany wynik dla nowej wersji.
// Użycie: node test/regresja.js [ścieżka/do/index.html] [ścieżka/do/poprzedniej-wersji.html]
// Zapisany audyt do sprawdzenia odmowaKodu() na prawdziwych notatkach podaj w zmiennej AUDYT_JSON (poza repozytorium).
const {fresh}=require('./harness.js');
const fs=require('fs'), path=require('path');
const NEW=process.argv[2]||path.join(__dirname,'..','index.html');
const OLD=process.argv[3]&&fs.existsSync(process.argv[3])?process.argv[3]:null;
const NOTE_SZER='pas z mapy ewidencyjnej, odczyt ze skali e-mapy (20,4 px/m), bez uchwały z wykazem. Na wysokości działki wychodzi ok. 4,8 m. Pomiar mieści się w granicach błędu ±0,2–0,3 m, a próg 5 m leży dokładnie pośrodku. Kodu nie wybieram. Dopóki nie sprawdzę uchwały lub nie zmierzę narzędziem linijki, kod „waska" ani „ok" nie ma pewnej podstawy.';
const NOTE_PRZEZ='linia „eNA" biegnie wzdłuż południowej granicy. Przez działkę idzie tylko przyłącze „eN" do budynku. Przez środek działki nie widać sieci tranzytowych. Nie mam opisów kodów „tak/nie", więc żadnego nie wybieram.';
const NOTE_KW='Tego kroku nie wykonałem. Wymaga numeru księgi z ogłoszenia i przepisania captcha przez Ciebie na przegladarka-ekw.ms.gov.pl.';
const blok=(id,lines)=>`### pytanie  \`${id}\`\n${lines.join('\n')}\n\n`;

const CASES=[
 {nazwa:'A. format z promptu, bez [x], notatka odmawia',
  txt:blok('d_szer',['> notatka: '+NOTE_SZER,'   kody: ok, waska, bardzo'])+blok('u_przez',['> notatka: '+NOTE_PRZEZ,'   kody: tak, nie'])+blok('kw_nr',['- odpowiedź: brak w ogłoszeniu','> notatka: '+NOTE_KW]),
  exp:{d_szer:null,u_przez:null,kw_nr:null}, bez:['d_szer','u_przez','kw_nr'], impNull:true},
 {nazwa:'B. karta Notion (Status, [ ] opcje), notatka odmawia',
  txt:blok('d_szer',['**Status:** sprawdzone 2026-11-03 · z wklejki · bez rozstrzygnięcia','- [ ] ok — Powyżej 5 m','- [ ] waska — 3–5 m','- [ ] bardzo — Poniżej 3 m','> notatka: '+NOTE_SZER+' kody: ok, waska, bardzo'])
     +blok('u_przez',['**Status:** sprawdzone 2026-11-03 · z wklejki · bez rozstrzygnięcia','- [ ] tak — Tak','- [ ] nie — Nie','> notatka: '+NOTE_PRZEZ])
     +blok('kw_nr',['**Status:** sprawdzone 2026-11-03 · z wklejki · bez rozstrzygnięcia','- [ ] odpowiedz: brak w ogłoszeniu','> notatka: '+NOTE_KW]),
  exp:{d_szer:null,u_przez:null,kw_nr:null}, bez:['d_szer','u_przez','kw_nr'], impNull:true},
 {nazwa:'C. wiersz [x] + notatka odmawia (sprzeczny blok)',
  txt:blok('d_szer',['- [x] waska — 3–5 m','> notatka: '+NOTE_SZER,'   kody: ok, waska, bardzo'])+blok('u_przez',['- [x] nie — Nie','> notatka: '+NOTE_PRZEZ,'   kody: tak, nie'])+blok('n_mpzp_sasiad',['- [x] mieszane — Mieszane','> notatka: Etykiety planu nie wszystkie widoczne. Kodu nie wybieram.','   kody: mieszk, uslugi, przemysl, rolne, mieszane']),
  exp:{d_szer:null,u_przez:null,n_mpzp_sasiad:null}, bez:['d_szer','u_przez','n_mpzp_sasiad'], msg:true},
 {nazwa:'D. format A, kod był już z wcześniejszej wklejki',
  przed:{d_szer:'waska',u_przez:'nie'}, s:{d_szer:{ts:'2026-11-03T21:30:00Z',src:'import'},u_przez:{ts:'2026-11-03T21:30:00Z',src:'import'}},
  txt:blok('d_szer',['> notatka: '+NOTE_SZER,'   kody: ok, waska, bardzo'])+blok('u_przez',['> notatka: '+NOTE_PRZEZ,'   kody: tak, nie']),
  exp:{d_szer:null,u_przez:null}, bez:['d_szer','u_przez'], msg:true},
 {nazwa:'D2. jak D, ale kod kliknięty ręcznie',
  przed:{d_szer:'waska'}, s:{d_szer:{ts:'2026-11-03T21:30:00Z',src:'reczne'}},
  txt:blok('d_szer',['> notatka: '+NOTE_SZER,'   kody: ok, waska, bardzo']),
  exp:{d_szer:'waska'}, msg:true},
 {nazwa:'D3. jak D, ale kod bez znacznika (stary zapis)',
  przed:{d_szer:'waska'},
  txt:blok('d_szer',['> notatka: '+NOTE_SZER,'   kody: ok, waska, bardzo']),
  exp:{d_szer:'waska'}, msg:true},
 {nazwa:'D4. jak D, ale kod ze Status „z promptu” w tej samej wklejce (eksport Notion)',
  przed:{d_szer:'waska'}, s:{d_szer:{ts:'2026-11-03T21:30:00Z',src:'import'}},
  txt:blok('d_szer',['**Status:** sprawdzone 2026-11-03 · z promptu · rozstrzygnięte','- [x] waska — 3–5 m','> notatka: '+NOTE_SZER]),
  exp:{d_szer:null}, bez:['d_szer']},
 {nazwa:'E. [x] + notatka „kod jest wstępny” (nie odmowa)',
  txt:blok('s_powodz',['- [x] nie — Nie','> notatka: Kod „nie" jest wstępny: mapa ISOK nie pokazuje strefy, dane z 2023.']),
  exp:{s_powodz:'nie'}},
 {nazwa:'F. [x] siec + odmowa jednego kodu („studnia”)',
  txt:blok('u_woda',['- [x] siec — Sieć','> notatka: Przyłącze wodociągowe do budynku widoczne w GESUT. Kodu „studnia" nie wybieram z samego braku ujęcia.','   kody: siec, studnia, brak']),
  exp:{u_woda:'siec'}},
 {nazwa:'G. [x] nie + „Nie wybieram kodu „tak”, bo…”',
  txt:blok('u_przez',['- [x] nie — Nie','> notatka: Nie wybieram kodu „tak", bo przez środek działki nie widać sieci.','   kody: tak, nie']),
  exp:{u_przez:'nie'}},
 {nazwa:'H. kw_nr z prawdziwym numerem',
  txt:blok('kw_nr',['- odpowiedź: PO1P/00123456/7','> notatka: numer z ogłoszenia, otodom, 2026-11-03']),
  exp:{kw_nr:'PO1P/00123456/7'}},
 {nazwa:'I. kw_nr zaślepka, pole miało już zaślepkę',
  przed:{kw_nr:'brak w ogłoszeniu'}, s:{kw_nr:{ts:'2026-11-03T21:30:00Z',src:'import'}},
  txt:blok('kw_nr',['- odpowiedź: brak w ogłoszeniu','> notatka: '+NOTE_KW]),
  exp:{kw_nr:null}, bez:['kw_nr'], msg:true, nota:{kw_nr:/^Odpowiedź wtyczki: brak w ogłoszeniu\. Tego kroku nie wykonałem/}},
 {nazwa:'J. osiem poprawnych przypadków: bez [x], notatka odmawia',
  txt:['g_historia','u_prad','u_woda','u_kanal','d_typ','d_utrzym','s_smog','n_plany'].map(id=>blok(id,['> notatka: Dane niepełne w rejestrze, więc kodu nie wybieram.','   kody: KODY_'+id])).join(''),
  exp:{g_historia:null,u_prad:null,u_woda:null,u_kanal:null,d_typ:null,d_utrzym:null,s_smog:null,n_plany:null},
  bez:['g_historia','u_prad','u_woda','u_kanal','d_typ','d_utrzym','s_smog','n_plany'], impNull:true},
 {nazwa:'K. zwykłe bloki z kodem i notatką bez odmowy',
  txt:blok('p_mpzp',['- [x] nie — Nie ma planu','> notatka: Brak MPZP dla działki, geoportal gminy, 2026-11-03.'])+blok('kw_forma',['- [x] calosc — Własność','> notatka: dział II'])+blok('g_spadek',['- [x] plaska — Płaska','> notatka: NMT, różnica 0,4 m']),
  exp:{p_mpzp:'nie',kw_forma:'calosc',g_spadek:'plaska'}, impNull:true},
 {nazwa:'L. wiersz „kody:” zamyka notatkę, tekst po nim idzie do dopisku',
  txt:blok('d_szer',['- [x] ok — Powyżej 5 m','> notatka: Szerokość 6,2 m z e-mapy.','   kody: ok = Powyżej 5 m | waska = 3–5 m | bardzo = Poniżej 3 m','Do dokończenia: zadania 3 i 5.']),
  exp:{d_szer:'ok'}, nota:{d_szer:/^Szerokość 6,2 m z e-mapy\.$/}, imp:/^Do dokończenia: zadania 3 i 5\.$/, msg:true},
 {nazwa:'M. odpowiedź tekstowa „wartość” (nietknięty szablon)',
  txt:blok('kw_nr',['- odpowiedź: wartość','> notatka: nie szukałem']),
  exp:{kw_nr:null}, bez:['kw_nr']},
 {nazwa:'N. po „kody:” lista „Do dokończenia” i pytanie do mnie',
  txt:blok('b_samowola',['> notatka: Zdjęcie nie jest ortogonalne i obrysy są przesunięte. Nie wybieram kodu.','   kody: zgodny, drobne, duze','','Do dokończenia:','- Zadanie 7 (księga): potrzebny numer i captcha od Ciebie.','- Zadanie 24 (osuwiska): SOPO nie przybliża mapy.','','Czy mam teraz przejść do któregoś z nich, np. 28 (BIP i zarządcy dróg)?']),
  exp:{b_samowola:null}, bez:['b_samowola'], nota:{b_samowola:/Nie wybieram kodu\.$/}, imp:/^Do dokończenia:\n- Zadanie 7 \(księga\)[\s\S]*Czy mam teraz przejść/, msg:true},
 {nazwa:'O. bez „kody:”, w notatce „Zadania niedokończone” i „Pytania na koniec”',
  txt:blok('c_rcn',['> notatka: RCN nie podaje pow. użytkowej budynku. Kodu nie wybieram. Nie zebrałem 3–5 porównywalnych transakcji.','Zadania niedokończone: 3, 5, 7, 20, 22, 26, 28.','Zadania wykonane częściowo: 4, 11, 12.','Pytania na koniec:','1. Podaj numer księgi wieczystej.','2. Czy mam dokończyć brakujące zadania w osobnej sesji?']),
  exp:{c_rcn:null}, bez:['c_rcn'], nota:{c_rcn:/porównywalnych transakcji\.$/}, imp:/^Zadania niedokończone: 3, 5, 7, 20, 22, 26, 28\.\nZadania wykonane częściowo: 4, 11, 12\.\nPytania na koniec:\n1\. Podaj numer[\s\S]*osobnej sesji\?$/},
 {nazwa:'P. notatka wieloakapitowa bez nagłówka końcówki zostaje w całości',
  txt:blok('g_geo',['- [x] KOD0_g_geo — opis','> notatka: Akapit pierwszy o gruncie.','','Akapit drugi o wodzie gruntowej.','Podsumowanie: grunt nośny, woda głęboko.']),
  exp:{g_geo:'KOD0_g_geo'}, nota:{g_geo:/^Akapit pierwszy o gruncie\. Akapit drugi o wodzie gruntowej\. Podsumowanie: grunt nośny, woda głęboko\.$/}, impNull:true},
 {nazwa:'Q. „Podsumowanie:” jako osobny nagłówek kończy notatkę',
  txt:blok('g_geo',['> notatka: Akapit o gruncie.','**Podsumowanie:**','Sesja zakończona, trzy zadania zostały.']),
  exp:{g_geo:null}, nota:{g_geo:/^Akapit o gruncie\.$/}, imp:/^Podsumowanie:\nSesja zakończona, trzy zadania zostały\.$/},
 {nazwa:'R. nierozpoznany nagłówek ### między blokami nie nadpisuje poprzedniego pytania',
  txt:blok('p_mpzp',['- [x] tak — Jest plan','> notatka: MPZP z 2019.'])+'### Zadanie 5 (uwagi robocze)\n- [x] nie\n> notatka: to nie jest pytanie z listy\n\n'+blok('kw_forma',['- [x] calosc — Własność']),
  exp:{p_mpzp:'tak',kw_forma:'calosc'}, nota:{p_mpzp:/^MPZP z 2019\.$/}, imp:/^Zadanie 5 \(uwagi robocze\)\n- \[x\] nie\nnotatka: to nie jest pytanie z listy$/},
];

/* KODY_<id> w tekście zastępuję listą kodów pytania, KOD0_<id> jego pierwszym kodem,
   żeby przypadek nie zależał od konkretnych wartości w definicji pytania. */
function uruchom(html,c){
  const t=fresh(html);
  t.run(`S.tryb='pelny';S.meta=S.meta||{};`);
  if(c.przed)t.run(`Object.assign(S.a,${JSON.stringify(c.przed)});`);
  if(c.s)t.run(`S.s=S.s||{};Object.assign(S.s,${JSON.stringify(c.s)});`);
  const kod0=id=>t.run(`allChecks().find(x=>x.id==='${id}').opts[0][0]`);
  const txt=c.txt
    .replace(/KODY_([a-z_0-9]+)/g,(m,id)=>t.run(`(allChecks().find(x=>x.id==='${id}').opts||[]).filter(o=>o[0]!=='?').map(o=>o[0]).join(', ')`))
    .replace(/KOD0_([a-z_0-9]+)/g,(m,id)=>kod0(id));
  t.ctx.document.getElementById('gText').value=txt;
  t.run('importGlobal()');
  const out={};
  Object.keys(c.exp).forEach(id=>{
    out[id]=t.run(`(()=>{const c=allChecks().find(x=>x.id==='${id}');return {a:S.a['${id}']==null?null:S.a['${id}'],n:S.n['${id}']||'',status:statusLinia(c)}})()`);
  });
  const el=t.els.pasteMsg; out._msg=el?el.innerHTML.replace(/<[^>]+>/g,'\n').replace(/\n{2,}/g,'\n').trim():'';
  out._imp=t.run('S.imp&&S.imp.tekst?S.imp.tekst:null');
  out._kod0=kod0;
  return out;
}
let bledy=0, wiersze=0;
const pad=(s,n)=>String(s).padEnd(n).slice(0,n);
console.log('nowa wersja:  '+NEW);
console.log(OLD?'stara wersja: '+OLD:'stara wersja: brak (podaj ją jako drugi argument, żeby zobaczyć kolumny „przed”)');
console.log('\n'+pad('id',14)+' | '+pad('kod przed',18)+' | '+pad('kod po',18)+' | '+pad('status przed',52)+' | '+pad('status po',52)+' | wynik');
for(const c of CASES){
  const o=OLD?uruchom(OLD,c):null, n=uruchom(NEW,c);
  console.log('\n'+c.nazwa);
  for(const id of Object.keys(c.exp)){
    const exp=/^KOD0_/.test(String(c.exp[id]))?n._kod0(String(c.exp[id]).slice(5)):c.exp[id];
    const okKod=n[id].a===exp;
    const okBez=!c.bez||!c.bez.includes(id)||/bez rozstrzygnięcia/.test(n[id].status);
    const okNota=!c.nota||!c.nota[id]||c.nota[id].test(n[id].n);
    const ok=okKod&&okBez&&okNota; if(!ok)bledy++; wiersze++;
    console.log(pad(id,14)+' | '+pad(o?JSON.stringify(o[id].a):'—',18)+' | '+pad(JSON.stringify(n[id].a),18)+' | '+pad(o?o[id].status:'—',52)+' | '+pad(n[id].status,52)+' | '+(ok?'OK':'BŁĄD'+(okKod?'':' kod (oczekiwane '+JSON.stringify(exp)+')')+(okBez?'':' status')+(okNota?'':' notatka: '+JSON.stringify(n[id].n).slice(0,120))));
  }
  if(c.imp||c.impNull){
    const okImp=c.impNull?n._imp===null:(n._imp!==null&&c.imp.test(n._imp)); wiersze++; if(!okImp)bledy++;
    console.log('  S.imp '+(okImp?'OK':'BŁĄD')+': '+JSON.stringify(n._imp)+(o?'  (przed: '+JSON.stringify(o._imp)+')':''));
  }
  if(c.msg)console.log('  komunikat: '+n._msg.split('\n').filter(l=>/Pominięte|Usunięte|ręcznie|Pole tekstowe|poza blokami/.test(l)).join(' / '));
}
console.log(`\n${wiersze} wierszy, ${bledy} błędów`);

/* odmowaKodu() na prawdziwych notatkach z zapisanego audytu */
const plik=process.env.AUDYT_JSON||'';
if(plik&&fs.existsSync(plik)){
  const J=JSON.parse(fs.readFileSync(plik,'utf8'));
  const t=fresh(NEW);
  const odm=Object.keys(J.n||{}).filter(id=>t.run(`odmowaKodu(${JSON.stringify(J.n[id])})`));
  console.log('\nodmowaKodu() na notatkach z '+path.basename(plik)+' ('+Object.keys(J.n||{}).length+' notatek):');
  console.log('  odmowa:     '+odm.join(', '));
  console.log('  bez odmowy: '+Object.keys(J.n||{}).filter(id=>!odm.includes(id)).join(', '));
  const zKodem=odm.filter(id=>J.a[id]!=null&&J.a[id]!==''&&J.a[id]!=='?');
  console.log('  odmowa, a w pliku jest kod (do ręcznej korekty): '+(zKodem.map(id=>id+'='+J.a[id]).join(', ')||'brak'));
} else console.log('\n(odmowaKodu() na prawdziwych notatkach: ustaw AUDYT_JSON=ścieżka do zapisanego audytu)');

/* opisy kodów tak/nie w promptach */
{
  const t=fresh(NEW); t.run("S.tryb='pelny';S.meta.adres='Testowa 1'");
  const yn=t.run("opisKodow(YN.filter(o=>o[0]!=='?'))");
  const pow=t.run("opisKodow(allChecks().find(c=>c.id==='s_powodz').opts.filter(o=>o[0]!=='?'))");
  const szer=t.run("opisKodow(allChecks().find(c=>c.id==='d_szer').opts.filter(o=>o[0]!=='?'))");
  const pa=t.run('promptAll(false)');
  const okYn=/^tak = Tak, odpowiedź twierdząca na pytanie z nagłówka \| nie = Nie, odpowiedź przecząca na pytanie z nagłówka$/.test(yn);
  const okPow=/^nie = Nie, odpowiedź przecząca na pytanie z nagłówka \| q10 = Tak — woda 10-letnia/.test(pow);
  const okSzer=/^ok = Powyżej 5 m \| waska = /.test(szer);
  const okPa=pa.indexOf('kody: tak = Tak, odpowiedź twierdząca')>=0;
  console.log('\nopisy kodów w promptach:');
  console.log('  YN:       '+yn+'  '+(okYn?'OK':'BŁĄD'));
  console.log('  s_powodz: '+pow.slice(0,90)+'…  '+(okPow?'OK':'BŁĄD'));
  console.log('  d_szer:   '+szer+'  '+(okSzer?'OK':'BŁĄD'));
  console.log('  promptAll zawiera nowy opis: '+(okPa?'OK':'BŁĄD'));
  if(!(okYn&&okPow&&okSzer&&okPa))bledy++;
}
process.exit(bledy?1:0);
