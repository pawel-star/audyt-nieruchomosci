// Round-trip: stan → eksport (Notion / .txt / .csv) → import do świeżej aplikacji → porównanie odpowiedzi i notatek.
// Do tego stan sprzeczny (kod ręczny + notatka z odmową) i stare formaty wklejki.
// Użycie: node test/roundtrip.js [ścieżka/do/index.html]
const {fresh}=require('./harness.js');
const path=require('path');
const NEW=process.argv[2]||path.join(__dirname,'..','index.html');
const IDS=['p_mpzp','d_szer','kw_nr','u_przez','s_powodz','kw_forma','kw_hipoteka','g_spadek','b_azbest'];
function zrodlo(){
  const t=fresh(NEW);
  t.run(`S.tryb='pelny';S.meta.adres='Testowa 1, Owińska';S.meta.cena='900000';S.meta.powDom='120';
    S.a.p_mpzp='nie';S.n.p_mpzp='Brak MPZP, geoportal gminy, 2026-11-03.';mark('p_mpzp','import');
    S.a.d_szer='waska';S.n.d_szer='Z e-mapy 4,8 m, pomiar w terenie potwierdził.';mark('d_szer','reczne');
    S.a.kw_nr='PO1P/00123456/7';S.n.kw_nr='numer z ogłoszenia';mark('kw_nr','import');
    S.n.u_przez='Nie mam opisów kodów, więc żadnego nie wybieram.';mark('u_przez','import');
    S.a.s_powodz='nie';mark('s_powodz','import');
    S.a.kw_forma='calosc';S.n.kw_forma='dział II, własność';mark('kw_forma','import');
    S.n.kw_hipoteka='Brak wzmianki nie jest odpowiedzią, więc kodu nie wybieram.';mark('kw_hipoteka','import');
    S.a.g_spadek='plaska';mark('g_spadek','reczne');
    S.n.b_azbest='Dach z blachy, widziane z ulicy; bez kodu, bo nie wszedłem na posesję.';mark('b_azbest','reczne');`);
  return t;
}
const stan=t=>t.run(`(()=>{const o={};${JSON.stringify(IDS)}.forEach(id=>o[id]={a:S.a[id]==null?null:S.a[id],n:S.n[id]||'',st:statusLinia(allChecks().find(c=>c.id===id))});return o})()`);
const pad=(s,n)=>String(s).padEnd(n).slice(0,n);
let bledy=0;
function porownaj(nazwa,przed,po,wEksporcie){
  console.log('\n'+nazwa);
  IDS.forEach(id=>{
    if(!wEksporcie(id)){console.log('  '+pad(id,12)+' nie ma w tym eksporcie');return;}
    const okA=przed[id].a===po[id].a, okN=przed[id].n===po[id].n;
    const okR=/rozstrzygnięte/.test(przed[id].st)===/rozstrzygnięte/.test(po[id].st)&&/bez rozstrzygnięcia/.test(przed[id].st)===/bez rozstrzygnięcia/.test(po[id].st);
    if(!(okA&&okN&&okR))bledy++;
    console.log('  '+pad(id,12)+' kod '+pad(JSON.stringify(przed[id].a),20)+'→ '+pad(JSON.stringify(po[id].a),20)+(okA&&okN&&okR?'OK':'BŁĄD'+(okA?'':' kod')+(okN?'':' notatka: '+JSON.stringify(po[id].n).slice(0,90))+(okR?'':' status: '+przed[id].st+' → '+po[id].st)));
  });
}
console.log('plik: '+NEW);
const src=zrodlo(), przed=stan(src);

/* Notion */
const md=src.run('notionMd(false)');
{ const t=fresh(NEW); t.run("S.tryb='pelny'"); t.ctx.document.getElementById('gText').value=md; t.run('importGlobal()');
  porownaj('Notion (notionMd → okno „Wklej wyniki”)',przed,stan(t),id=>md.indexOf('`'+id+'`')>=0);
  const impN=t.run('S.imp&&S.imp.tekst?S.imp.tekst:null');
  if(impN){bledy++;console.log('  BŁĄD: eksport Notion dał tekst poza blokami: '+JSON.stringify(impN).slice(0,160));}
  else console.log('  tekst poza blokami po imporcie eksportu Notion: brak (OK)'); }
/* .txt: eksport oddaje tekst przez dl(nazwa, tekst), więc podstawiam własne dl */
const txt=src.run("dl=(n,t)=>{globalThis.__dl=t};exportTxt();__dl");
{ const t=fresh(NEW); t.run("S.tryb='pelny'"); t.run('parseTxt('+JSON.stringify(txt)+')');
  porownaj('.txt (exportTxt → parseTxt)',przed,stan(t),id=>txt.indexOf('['+id+']')>=0); }
/* .csv */
const csv=src.run("dl=(n,t)=>{globalThis.__dl=t};exportCsv();__dl").replace(/^﻿/,'');
{ const t=fresh(NEW); t.run("S.tryb='pelny'"); t.run('parseCsv('+JSON.stringify(csv)+')');
  porownaj('.csv (exportCsv → parseCsv)',przed,stan(t),id=>csv.indexOf('"'+id+'"')>=0); }

/* Stan sprzeczny: kod ręczny + notatka z odmową. Do tej samej aplikacji kod zostaje z ostrzeżeniem,
   do świeżej aplikacji nie wchodzi, bo nie ma czego bronić. */
console.log('\nStan sprzeczny (d_szer=waska ręcznie, notatka „Kodu nie wybieram”):');
const s2=fresh(NEW); s2.run("S.tryb='pelny';S.a.d_szer='waska';S.n.d_szer='Z e-mapy 4,8 m. Kodu nie wybieram.';mark('d_szer','reczne');");
const md2=s2.run('notionMd(false)');
s2.ctx.document.getElementById('gText').value=md2; s2.run('importGlobal()');
const taSama=s2.run('S.a.d_szer');
console.log('  ta sama aplikacja: d_szer='+JSON.stringify(taSama)+' | '+s2.els.pasteMsg.innerHTML.replace(/<[^>]+>/g,'\n').split('\n').filter(l=>/ręcznie/.test(l)).join(''));
if(taSama!=='waska')bledy++;
const f2=fresh(NEW); f2.run("S.tryb='pelny'"); f2.ctx.document.getElementById('gText').value=md2; f2.run('importGlobal()');
const swieza=f2.run('S.a.d_szer');
console.log('  świeża aplikacja: d_szer='+JSON.stringify(swieza)+' | '+f2.els.pasteMsg.innerHTML.replace(/<[^>]+>/g,'\n').split('\n').filter(l=>/Pominięte/.test(l)).join(''));
if(swieza!=null)bledy++;

/* Stare formaty wklejki: ☑ zamiast [x], [X] bez myślnika, nagłówek pogrubiony bez apostrofów */
console.log('\nStare formaty:');
const t3=fresh(NEW); t3.run("S.tryb='pelny'");
t3.ctx.document.getElementById('gText').value='### Czy jest MPZP?  `p_mpzp`\n☑ nie\n> notatka: brak planu\n\n**Jaka jest szerokość drogi dojazdowej?** d_szer\n- [X] ok\nnotatka: 6 m\n';
t3.run('importGlobal()');
console.log('  p_mpzp='+JSON.stringify(t3.run('S.a.p_mpzp'))+', d_szer='+JSON.stringify(t3.run('S.a.d_szer'))+', notatki: '+JSON.stringify(t3.run('[S.n.p_mpzp,S.n.d_szer]')));
if(t3.run('S.a.p_mpzp')!=='nie'||t3.run('S.a.d_szer')!=='ok')bledy++;
console.log(`\n${bledy} błędów`);
process.exit(bledy?1:0);
