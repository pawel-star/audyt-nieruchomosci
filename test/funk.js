// Test funkcjonalny: każdy widok i zakładka w kilku stanach (pusty, screening, pełny, karta dopisku,
// opcjonalnie zapisany audyt z prawdziwymi danymi).
// Użycie: node test/funk.js [ścieżka/do/index.html]
// Zapisany audyt (plik JSON z przycisku „Zapisz”) podaj w zmiennej AUDYT_JSON; trzymaj go poza repozytorium.
const {fresh}=require('./harness.js');
const fs=require('fs'), path=require('path');
const NEW=process.argv[2]||path.join(__dirname,'..','index.html');
const plik=process.env.AUDYT_JSON||'';
const J=plik&&fs.existsSync(plik)?fs.readFileSync(plik,'utf8'):null;
let n=0, err=0;
function sprawdz(nazwa,t,code,minLen){
  try{
    t.run(code); n++;
    const v=t.els.view?t.els.view.innerHTML.length:0;
    if(minLen&&v<minLen){err++;console.log('BŁĄD (pusty widok, '+v+' zn.):',nazwa);}
  }catch(e){err++;console.log('BŁĄD:',nazwa,'→',e.message.split('\n')[0]);}
}
console.log('plik: '+NEW);
for(const stan of ['pusty','screening','pelny','zapisany audyt','dopisek']){
  const t=fresh(NEW);
  if(stan==='dopisek'){
    t.run("S.tryb='pelny';S.meta.adres='Testowa 1';S.imp={ts:'2026-11-04T10:00:00Z',tekst:'Do dokończenia:\\n- Zadanie 7 (księga)\\n\\nPytania na koniec: czy mam dokończyć?'};");
    sprawdz('viewStart z dopiskiem',t,'viewStart()',200);
    const v=t.els.view.innerHTML;
    if(v.indexOf('Co wtyczka dopisała poza blokami')<0||v.indexOf('Zadanie 7 (księga)')<0){err++;console.log('BŁĄD: karta dopisku nie wyrenderowała się');}
    else console.log('\n[dopisek] karta dopisku na Starcie: jest');
    sprawdz('usunDopisek',t,'usunDopisek()');
    if(t.run('S.imp!==undefined')||t.els.view.innerHTML.indexOf('Co wtyczka dopisała')>=0){err++;console.log('BŁĄD: usunDopisek nie usunął karty');}
    else console.log('  usunDopisek: karta znika, S.imp pusty');
    continue;
  }
  if(stan==='screening')t.run("S.tryb='screening';S.meta.adres='Testowa 1, Owińska';S.meta.cena='900000';S.meta.powDom='120';");
  if(stan==='pelny')t.run("S.tryb='pelny';S.meta.adres='Testowa 1, Owińska';S.meta.cena='900000';S.meta.powDom='120';S.a.p_mpzp='nie';S.a.d_szer='waska';S.n.d_szer='test';mark('d_szer','import');");
  if(stan==='zapisany audyt'){ if(!J){console.log('\n[zapisany audyt] pomijam: ustaw AUDYT_JSON=ścieżka do zapisanego audytu');continue;} t.store['audyt_v1']=J; t.run('load()'); }
  const ids=t.run('M.map(m=>m.id)');
  const tabs=t.run('tabItems().map(i=>i.id)');
  console.log(`\n[${stan}] tryb=${JSON.stringify(t.run('S.tryb'))}, zakładki: ${tabs.join(', ')}`);
  sprawdz('viewStart',t,'viewStart()',200);
  ids.forEach(id=>sprawdz('viewModule '+id,t,`viewModule(M.find(m=>m.id==='${id}'))`,200));
  sprawdz('viewReport',t,'viewReport()',200);
  sprawdz('viewReportScreening',t,'viewReportScreening()',100);
  sprawdz('viewNeg',t,'viewNeg()');
  sprawdz('viewWizyta',t,'viewWizyta()');
  sprawdz('paintBar',t,'paintBar()');
  tabs.forEach(id=>sprawdz('render zakładka '+id,t,`TAB='${id}';render()`,100));
  sprawdz('promptAll',t,'promptAll(false)');
  sprawdz('promptScreening',t,'promptScreening()');
  sprawdz('notionMd',t,'notionMd(false)');
  sprawdz('flagsAll',t,'flagsAll()');
  if(stan==='zapisany audyt'){
    const przed=JSON.parse(J), po=t.run('JSON.parse(JSON.stringify({a:S.a,n:S.n}))');
    const zm=Object.keys(przed.a||{}).filter(k=>przed.a[k]!==po.a[k]).concat(Object.keys(po.a).filter(k=>!(k in (przed.a||{}))));
    if(zm.length){err++;console.log('BŁĄD: otwarcie pliku zmieniło odpowiedzi: '+zm.join(', '));}
    else console.log('  otwarcie pliku nie zmienia odpowiedzi ('+Object.keys(po.a).length+' odpowiedzi, '+Object.keys(po.n).length+' notatek)');
  }
}
console.log(`\n${n} wywołań, ${err} błędów`);
process.exit(err?1:0);
