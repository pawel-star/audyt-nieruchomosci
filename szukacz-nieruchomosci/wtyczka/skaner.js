const $ = s => document.querySelector(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fmt = n => new Intl.NumberFormat('pl-PL').format(n) + ' zł';
const norm = s => (s || '').toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[̀-ͯ]/g, '');
const API = window.__szukaczApi || null; // ocena z content.js, ładowanego przez skaner.html
// Domyślne słowa w nazwach grup, które pomijam. Profil z aplikacji może je zmienić (pole „grupyNie”).
const GRUPY_NIE_DOMYSLNE = ['oddam', 'oddaję', 'za darmo', 'gratis', 'praca', 'zatrudnię', 'ubrania', 'ciuchy', 'motoryzacja', 'zwierzęta', 'zgubione', 'znalezione'];
const SEKCJE = { podstawy: 'podstawy', lokalizacja: 'lokalizacja', cena: 'cena', powierzchnia: 'powierzchnia', budynek: 'budynek i stan', udogodnienia: 'udogodnienia', dzialka: 'działka', okolica: 'okolica', ogloszenie: 'wymagania wobec ogłoszenia' };
let profile = null, running = false, stopFlag = false, filter = 'all';
let results = [], seenLinks = new Set(), lastRunIds = new Set();
let blocked = new Set(), groupNames = {}, lastSaved = [];

const normG = u => String(u || '').trim().replace(/[?#].*$/, '').replace(/\/+$/, '').replace(/^https?:\/\/(?:m|web|www)\.facebook\.com/i, 'https://www.facebook.com');
const slowaGrup = () => Array.isArray(profile && profile.grupyNie) ? profile.grupyNie : GRUPY_NIE_DOMYSLNE;
const pominNazwe = name => { const n = norm(name); return slowaGrup().find(k => k && n.includes(norm(k))) || null; };
const NIER = /nieruchom|mieszka|\bdom|dzialk|grunt|sprzeda|wynaj|lokal|bez posrednik|kupi/;
function czlonkowie(info) {
  const m = norm(info || '').match(/(\d+(?:[.,]\d+)?)\s*(tys\.?|k|mln|m)?\s*(czlonk|members|osob)/); if (!m) return 0;
  let v = parseFloat(m[1].replace(',', '.')); if (m[2]) v *= /^(tys|k)/.test(m[2]) ? 1e3 : 1e6; return v;
}

function log(m) { const l = $('#log'); l.textContent += '\n' + new Date().toLocaleTimeString('pl-PL') + '  ' + m; l.scrollTop = l.scrollHeight; }
function describe(p) {
  if (!p) return 'Brak profilu. Wklej go w okienku wtyczki.';
  const typ = { mieszkanie: 'mieszkanie', dom: 'dom', dzialka: 'działka', lokal: 'lokal', garaz: 'garaż', pokoj: 'pokój', hala: 'hala' }[p.typ || 'mieszkanie'];
  const parts = ['<b>' + typ + ' · ' + (p.transakcja === 'wynajem' ? 'wynajem' : 'kupno') + '</b>' + (p.miasto ? ' · ' + p.miasto : '')];
  if (p.cenaOd || p.cenaDo) parts.push('cena ' + (p.cenaOd ? 'od ' + fmt(p.cenaOd) + ' ' : '') + (p.cenaDo ? 'do ' + fmt(p.cenaDo) : ''));
  if (p.powOd || p.powDo) parts.push('metraż ' + (p.powOd ? 'od ' + p.powOd + ' ' : '') + (p.powDo ? 'do ' + p.powDo : '') + ' m²');
  if (p.pokojeOd || p.pokojeDo) parts.push('pokoje ' + (p.pokojeOd || '') + '–' + (p.pokojeDo || ''));
  if (p.dzielnice) parts.push('miejsca: ' + p.dzielnice.join(', '));
  if (p.slowaMusza) parts.push('musi: ' + p.slowaMusza.join(', '));
  if (p.slowaMinus) parts.push('nie: ' + p.slowaMinus.join(', '));
  parts.push(p.elastyczne && p.elastyczne.length ? 'elastyczne: ' + p.elastyczne.map(k => SEKCJE[k] || k).join(', ') + '; reszta musi być spełniona' : 'wszystkie kryteria muszą być spełnione');
  return parts.join('<br>');
}
function groupList() { return [...new Set($('#groups').value.split('\n').map(x => x.trim()).filter(x => /facebook\.com\/groups\//.test(x)).map(normG))]; }
function persistGroups() { chrome.storage.local.set({ scanGroups: lastSaved, groupsBlocked: [...blocked], groupNames }); }
// Usunięcie grupy z listy zapamiętuję. Bez tego wracała przy kolejnym otwarciu skanera z profilu albo listy źródeł.
function saveGroups() {
  const now = groupList();
  const removed = lastSaved.filter(u => !now.includes(u));
  if (removed.length) { removed.forEach(u => blocked.add(u)); log('usunięte z listy: ' + removed.length + '. Zapamiętuję je jako odrzucone, nie wrócą na listę ani w wyszukiwaniu grup.'); }
  lastSaved = now; persistGroups(); renderBlocked();
}
function renderBlocked() {
  $('#blockedCnt').textContent = blocked.size;
  $('#blockedBox').classList.toggle('hidden', !blocked.size);
  const box = $('#blockedList'); box.innerHTML = '';
  [...blocked].sort().forEach(u => {
    const d = document.createElement('div'); d.className = 'grp';
    d.innerHTML = '<div style="flex:1"><span></span><small></small></div><button class="btn sm">przywróć</button>';
    d.querySelector('span').textContent = groupNames[u] || u.replace(/^https:\/\/www\.facebook\.com/, '');
    d.querySelector('small').textContent = groupNames[u] ? u.replace(/^https:\/\/www\.facebook\.com/, '') : '';
    d.querySelector('button').onclick = () => { blocked.delete(u); persistGroups(); renderBlocked(); log('przywrócono do wyszukiwania: ' + (groupNames[u] || u) + '. Dodaj ją do listy, jeśli chcesz ją skanować.'); };
    box.appendChild(d);
  });
  $('#slowaGrup').textContent = slowaGrup().join(', ') || 'brak (profil nie pomija żadnych grup)';
}

/* ---------- okno robocze ---------- */
let workWin = null, workTab = null;
async function ensureWindow() {
  if (workWin) { try { await chrome.windows.get(workWin); return; } catch (e) { workWin = null; } }
  const w = await chrome.windows.create({ url: 'about:blank', focused: false, width: 980, height: 820, type: 'normal' });
  workWin = w.id; workTab = w.tabs[0].id;
}
async function openInWork(url) {
  await ensureWindow();
  await chrome.tabs.update(workTab, { url });
  await new Promise(res => {
    const l = (id, info) => { if (id === workTab && info.status === 'complete') { chrome.tabs.onUpdated.removeListener(l); res(); } };
    chrome.tabs.onUpdated.addListener(l); setTimeout(() => { chrome.tabs.onUpdated.removeListener(l); res(); }, 25000);
  });
  await sleep(2500);
}
async function msg(m) {
  try { return await chrome.tabs.sendMessage(workTab, m); }
  catch (e) { await chrome.scripting.executeScript({ target: { tabId: workTab }, files: ['content.js'] }); await sleep(400); return chrome.tabs.sendMessage(workTab, m); }
}
async function checkLogin() {
  try {
    const r = await fetch('https://www.facebook.com/', { credentials: 'include', redirect: 'follow' });
    const ok = !/\/login|\/checkpoint/.test(r.url) && r.status === 200;
    $('#loginState').textContent = ok ? 'Facebook: zalogowany w tej przeglądarce' : 'Facebook: NIE jesteś zalogowany. Zaloguj się w Chrome na facebook.com i odśwież tę stronę.';
    $('#loginState').style.color = ok ? '' : '#c0392b';
    return ok;
  } catch (e) { $('#loginState').textContent = 'Nie mogę sprawdzić logowania. Zaloguj się na facebook.com w tej przeglądarce.'; return true; }
}

/* ---------- szukanie grup ---------- */
function wierszGrupy(g, powod) {
  const d = document.createElement('label'); d.className = 'grp';
  d.innerHTML = '<input type="checkbox"><div style="flex:1"><span></span><small></small></div><button type="button" class="btn sm" title="Nie pokazuj tej grupy więcej">✕ odrzuć</button>';
  d.querySelector('input').value = g.url; d.querySelector('span').textContent = g.name;
  const sm = d.querySelector('small'); sm.textContent = [powod, g.info].filter(Boolean).join(' · ') + ' · ';
  const a = document.createElement('a'); a.target = '_blank'; a.rel = 'noopener'; a.href = g.url; a.textContent = 'otwórz'; sm.appendChild(a);
  d.querySelector('button').onclick = e => { e.preventDefault(); blocked.add(normG(g.url)); groupNames[normG(g.url)] = g.name; persistGroups(); renderBlocked(); d.remove(); log('odrzucona: ' + g.name); };
  return d;
}
$('#findGroups').onclick = async () => {
  if (!profile || !profile.miasto) { alert('W profilu brakuje miasta. Uzupełnij je w aplikacji i wklej profil ponownie.'); return; }
  const m = profile.miasto, wyn = profile.transakcja === 'wynajem';
  const typWord = { mieszkanie: 'mieszkania', dom: 'domy', dzialka: 'działki', lokal: 'lokale', garaz: 'garaże', pokoj: 'pokoje', hala: 'hale' }[profile.typ || 'mieszkanie'];
  // Zapytanie „sprzedam <miasto>” przynosiło głównie ogólne grupy „kupię, sprzedam, oddam”. Teraz pytam o typ nieruchomości.
  const queries = [typWord + ' ' + m, 'nieruchomości ' + m, m + ' ogłoszenia', typWord + (wyn ? ' do wynajęcia ' : ' na sprzedaż ') + m, m + ' bez pośredników', ...(profile.dzielnice || []).slice(0, 3).map(x => 'nieruchomości ' + x)];
  $('#findGroups').disabled = true; $('#foundBox').classList.remove('hidden'); $('#found').innerHTML = ''; $('#foundHidden').innerHTML = ''; $('#foundHiddenBox').classList.add('hidden'); $('#foundInfo').textContent = 'Szukam…';
  const all = new Map(); const have = new Set(groupList());
  for (const q of queries) {
    log('szukam grup: ' + q);
    await openInWork('https://www.facebook.com/search/groups/?q=' + encodeURIComponent(q));
    const r = await msg({ type: 'collectGroups', opts: { scrolls: 2 } });
    if (!r || r.error) { log('błąd: ' + (r && r.error)); continue; }
    if (r.needLogin) { log('Facebook prosi o logowanie. Zaloguj się w oknie roboczym i spróbuj ponownie.'); await checkLogin(); break; }
    r.groups.forEach(g => { g.url = normG(g.url); groupNames[g.url] = g.name; if (!all.has(g.url)) all.set(g.url, Object.assign({ q }, g)); });
    log('  znaleziono ' + r.groups.length + ', łącznie ' + all.size);
    await sleep(2500);
  }
  persistGroups();
  const fresh = [...all.values()].filter(g => !have.has(g.url));
  const odrzucone = fresh.filter(g => blocked.has(g.url)).length;
  const pass = [], hidden = [];
  fresh.filter(g => !blocked.has(g.url)).forEach(g => { const k = pominNazwe(g.name); if (k) hidden.push(Object.assign({ k }, g)); else pass.push(g); });
  // najpierw grupy z nieruchomościami w nazwie, potem największe
  pass.sort((a, b) => (NIER.test(norm(b.name)) - NIER.test(norm(a.name))) || (czlonkowie(b.info) - czlonkowie(a.info)));
  const info = [pass.length ? pass.length + ' grup, których nie masz na liście. Zaznacz te, do których należysz lub chcesz dołączyć. Grupy bez związku z nieruchomościami odrzuć krzyżykiem, nie pokażę ich więcej.' : 'Nie znalazłem nowych grup.'];
  if (hidden.length) info.push('Pominąłem ' + hidden.length + ' po nazwie (' + [...new Set(hidden.map(g => g.k))].join(', ') + '), lista niżej.');
  if (odrzucone) info.push('Pominąłem też ' + odrzucone + ' odrzuconych wcześniej.');
  $('#foundInfo').textContent = info.join(' ');
  pass.forEach(g => $('#found').appendChild(wierszGrupy(g, NIER.test(norm(g.name)) ? '' : 'nazwa nie mówi o nieruchomościach')));
  hidden.forEach(g => $('#foundHidden').appendChild(wierszGrupy(g, 'nazwa zawiera „' + g.k + '”')));
  $('#foundHiddenCnt').textContent = hidden.length; $('#foundHiddenBox').classList.toggle('hidden', !hidden.length);
  $('#findGroups').disabled = false;
};
$('#addFound').onclick = () => { const sel = [...document.querySelectorAll('#foundBox input[type=checkbox]:checked')].map(i => normG(i.value)); const cur = groupList(); sel.forEach(u => { blocked.delete(u); if (!cur.includes(u)) cur.push(u); }); $('#groups').value = cur.join('\n'); saveGroups(); log('dodano ' + sel.length + ' grup do listy'); };
$('#groups').addEventListener('change', saveGroups);
$('#selAll').onclick = () => document.querySelectorAll('#found input[type=checkbox]').forEach(i => i.checked = true);
$('#selNone').onclick = () => document.querySelectorAll('#foundBox input[type=checkbox]').forEach(i => i.checked = false);

/* ---------- skanowanie ---------- */
$('#start').onclick = async () => {
  if (running) return;
  if (!profile) { alert('Brak profilu. Wklej go w okienku wtyczki.'); return; }
  saveGroups();
  const groups = groupList(); if (!groups.length) { alert('Dodaj przynajmniej jedną grupę.'); return; }
  const days = +$('#days').value || 2, maxPosts = +$('#maxPosts').value || 60, pause = (+$('#pause').value || 6) * 1000;
  running = true; stopFlag = false; $('#start').disabled = true; $('#stop').disabled = false; lastRunIds = new Set();
  $('#problemBox').classList.add('hidden');
  const problem = [];
  log('start: ' + groups.length + ' grup, ' + days + ' dni wstecz, maks. ' + maxPosts + ' postów na grupę');
  let i = 0;
  for (const g of groups) {
    if (stopFlag) break;
    i++; $('#bar').style.width = Math.round(100 * (i - 1) / groups.length) + '%';
    const k = groupNames[g] && pominNazwe(groupNames[g]);
    if (k) { log('[' + i + '/' + groups.length + '] pomijam „' + groupNames[g] + '”: nazwa zawiera „' + k + '”'); continue; }
    log('[' + i + '/' + groups.length + '] ' + (groupNames[g] || g));
    try {
      await openInWork(g + '?sorting_setting=CHRONOLOGICAL');
      const r = await msg({ type: 'collect', profile, opts: { days, maxPosts, maxSeconds: 150 } });
      if (!r || r.error) { log('  błąd: ' + (r && r.error)); problem.push({ url: g, why: 'błąd odczytu' }); continue; }
      if (r.needLogin) { log('  Facebook prosi o logowanie. Zaloguj się w oknie roboczym i uruchom ponownie.'); await checkLogin(); break; }
      if (r.title) groupNames[g] = r.title;
      const gname = r.title || g;
      let added = 0, dup = 0;
      r.results.forEach(x => {
        const id = x.link + '|' + x.text.slice(0, 80); if (seenLinks.has(id)) return; seenLinks.add(id);
        // ten sam post wrzucony do kilku grup pokazuję raz, z dopiskiem „też w…”
        if (x.fp && x.fp.length >= 40) { const twin = results.find(o => o.fp === x.fp); if (twin) { if (twin.group !== gname) twin.also = [...new Set([...(twin.also || []), gname])]; dup++; return; } }
        lastRunIds.add(id); results.push(Object.assign({ id, group: gname, groupUrl: r.url, at: new Date().toISOString() }, x)); added++;
      });
      log('  ' + gname + ': postów ' + r.total + ', w oknie czasu ' + r.scanned + ', starszych ' + r.skippedOld + (r.noDate ? ', bez daty ' + r.noDate : '') + ', nowych ' + added + (dup ? ', powtórzonych z innych grup ' + dup : '') + (r.joinNeeded ? '. Brak postów, pewnie trzeba dołączyć do grupy.' : '') + ' (' + r.seconds + ' s)');
      if (r.joinNeeded || !r.total) problem.push({ url: g, why: r.joinNeeded ? 'trzeba dołączyć' : 'nie dała się przeczytać' });
      const kk = pominNazwe(gname); if (kk) log('  nazwa zawiera „' + kk + '”, następnym razem ją pominę');
      render(); persist();
    } catch (e) { log('  błąd: ' + e.message); }
    if (i < groups.length && !stopFlag) await sleep(pause);
  }
  $('#bar').style.width = '100%';
  log(stopFlag ? 'zatrzymano' : 'koniec. Pasujących: ' + results.filter(r => lastRunIds.has(r.id) && cls(r) === 'ok').length + ', prawie pasujących: ' + results.filter(r => lastRunIds.has(r.id) && cls(r) === 'near').length + ' nowych w tym przebiegu.');
  running = false; $('#start').disabled = false; $('#stop').disabled = true;
  try { if (workWin) await chrome.windows.remove(workWin); } catch (e) {} workWin = null;
  persistGroups(); pokazProblemy(problem);
};
$('#stop').onclick = () => { stopFlag = true; log('zatrzymuję po bieżącej grupie…'); };
function pokazProblemy(problem) {
  if (!problem.length) return;
  $('#problemBox').classList.remove('hidden');
  $('#problemList').textContent = problem.map(p => '• ' + (groupNames[p.url] || p.url) + ' (' + p.why + ')').join('\n');
  $('#problemDel').onclick = () => {
    const urls = new Set(problem.map(p => p.url));
    $('#groups').value = groupList().filter(u => !urls.has(u)).join('\n');
    saveGroups(); $('#problemBox').classList.add('hidden');
  };
}

/* ---------- wyniki ---------- */
const ORD = { ok: 0, near: 1, weak: 2, bad: 3 };
function cls(r) { return r.reject ? 'bad' : (r.miss && r.miss.length) ? 'near' : r.pct >= 50 ? 'ok' : 'weak'; }
function render() {
  const minPct = +$('#minPct').value || 0;
  const list = results.filter(r => { const c = cls(r); if (filter === 'new') return lastRunIds.has(r.id); if (filter !== 'all' && c !== filter) return false; return r.reject ? true : r.pct >= minPct; })
    .sort((a, b) => ORD[cls(a)] - ORD[cls(b)] || b.pct - a.pct || (b.date || '').localeCompare(a.date || ''));
  const n = k => results.filter(r => cls(r) === k).length;
  $('#stat').innerHTML = `<span><b>${results.length}</b>ogłoszeń</span><span style="color:#1f9d6b"><b>${n('ok')}</b>pasuje</span><span style="color:#2f7fd1"><b>${n('near')}</b>prawie</span><span style="color:#c47f12"><b>${n('weak')}</b>słabo</span><span style="color:#c0392b"><b>${n('bad')}</b>odpadło</span><span><b>${lastRunIds.size}</b>nowych w ostatnim przebiegu</span>`;
  const box = $('#res'); box.innerHTML = '';
  if (!list.length) { box.innerHTML = '<div class="muted">Brak wyników dla tego filtra.</div>'; return; }
  list.forEach(r => {
    const c = cls(r);
    const d = document.createElement('div'); d.className = 'it ' + c;
    const date = r.date ? new Date(r.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }) : 'bez daty';
    d.innerHTML = `<div class="h"><span class="pct"></span><span class="grp-name"></span><span class="date"></span>${lastRunIds.has(r.id) ? '<span class="new">nowe</span>' : ''}</div><div class="why"></div><div class="txt short"></div><div class="foot"><a target="_blank" rel="noopener">otwórz post</a><a href="#" class="more">pokaż całość</a><a href="#" class="keep">${saved.has(r.link) ? '✓ w katalogu' : '+ do katalogu'}</a><a href="#" class="del">ukryj</a></div>`;
    d.querySelector('.pct').textContent = c === 'bad' ? '✕' : c === 'near' ? '≈ ' + r.pct + '%' : r.pct + '%';
    d.querySelector('.grp-name').textContent = r.group + (r.also && r.also.length ? ' · też w: ' + r.also.join(', ') : '');
    d.querySelector('.date').textContent = date;
    const pas = (r.why || []).slice(0, 5).join(' · ') || 'brak dopasowanych szczegółów';
    d.querySelector('.why').textContent = c === 'bad' ? r.reject : c === 'near' ? 'prawie: ' + r.miss.join(' · ') + ' | pasuje: ' + pas : pas + ((r.bad || []).length ? ' | brak: ' + r.bad.slice(0, 3).join(', ') : '');
    d.querySelector('.txt').textContent = r.text;
    const a = d.querySelector('.foot a'); a.href = r.link;
    d.querySelector('.more').onclick = e => { e.preventDefault(); d.querySelector('.txt').classList.toggle('short'); e.target.textContent = d.querySelector('.txt').classList.contains('short') ? 'pokaż całość' : 'zwiń'; };
    d.querySelector('.del').onclick = e => { e.preventDefault(); results = results.filter(x => x.id !== r.id); persist(); render(); };
    d.querySelector('.keep').onclick = e => { e.preventDefault(); keepOffer(r); };
    box.appendChild(d);
  });
}
/* ---------- odkładanie ofert do katalogu w aplikacji ---------- */
let saved = new Set(), offers = [];
function keepOffer(r) {
  if (saved.has(r.link)) return;
  offers.push({ link: r.link, zrodlo: 'fb', grupa: r.group, pct: r.pct, why: r.why, bad: r.bad, miss: r.miss || [], text: r.text, date: r.date, data: r.data, miejscowosc: (profile && profile.miasto) || '' });
  saved.add(r.link); chrome.storage.local.set({ offers }); updateOffersBar(); render();
}
function updateOffersBar() { $('#ofCnt').textContent = offers.length; }
$('#ofCopy').onclick = async () => {
  if (!offers.length) { $('#ofMsg').textContent = 'nic nie odłożyłeś'; return; }
  await navigator.clipboard.writeText(JSON.stringify({ _app: 'szukacz-oferty', oferty: offers }));
  $('#ofMsg').textContent = 'skopiowano ' + offers.length + '. W aplikacji: widok Oferty, pole „Wklej oferty z wtyczki”, przycisk „Dodaj do katalogu”.';
};
$('#ofClear').onclick = () => { if (!confirm('Wyczyścić odłożone oferty we wtyczce? Te już wklejone do aplikacji zostają w aplikacji.')) return; offers = []; saved = new Set(); chrome.storage.local.set({ offers }); updateOffersBar(); render(); };
function persist() { chrome.storage.local.set({ scanResults: results.slice(-800), seenLinks: [...seenLinks].slice(-3000) }); }
document.querySelectorAll('.filters button[data-f]').forEach(b => b.onclick = () => { document.querySelectorAll('.filters button[data-f]').forEach(x => x.classList.toggle('on', x === b)); filter = b.dataset.f; render(); });
$('#minPct').onchange = render;
$('#clearRes').onclick = () => { if (!confirm('Usunąć wszystkie wyniki? Przy kolejnym skanie posty pojawią się ponownie.')) return; results = []; seenLinks = new Set(); lastRunIds = new Set(); persist(); render(); };
// Zapisane wyniki oceniam na nowo, gdy zmienisz profil (np. przełączysz kryterium na elastyczne). Facebooka nie otwieram.
$('#rescore').onclick = () => {
  if (!API) { alert('Brak modułu oceny. Przeładuj wtyczkę w chrome://extensions.'); return; }
  if (!profile) { alert('Brak profilu. Wklej go w okienku wtyczki.'); return; }
  results.forEach(x => { const r = API.score(profile, x.text || ''); Object.assign(x, { pct: r.pct || 0, reject: r.reject, why: r.why, bad: r.bad, miss: r.miss, data: r.data }); });
  persist(); render(); log('przeliczono ' + results.length + ' wyników według bieżącego profilu');
};
$('#csv').onclick = () => {
  const esc = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const st = { ok: 'pasuje', near: 'prawie', weak: 'słabo' };
  const rows = [['status', 'procent', 'grupa', 'też w', 'data', 'cena', 'metraz', 'pokoje', 'pasuje', 'odchylenia', 'brak', 'link', 'tresc']];
  results.forEach(r => rows.push([r.reject ? 'odpada: ' + r.reject : st[cls(r)], r.pct, r.group, (r.also || []).join('; '), r.date ? r.date.slice(0, 10) : '', r.data && r.data.price || '', r.data && r.data.area || '', r.data && r.data.rooms || '', (r.why || []).join('; '), (r.miss || []).join('; '), (r.bad || []).join('; '), r.link, r.text]));
  const blob = new Blob(['﻿' + rows.map(r => r.map(esc).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'skan-grup-' + new Date().toISOString().slice(0, 10) + '.csv'; a.click();
};
chrome.storage.onChanged.addListener((ch, area) => {
  if (area !== 'local' || !ch.profile) return;
  profile = ch.profile.newValue || null; $('#prof').innerHTML = describe(profile); renderBlocked();
  log('profil zmieniony w okienku wtyczki. Kliknij „Przelicz według profilu”, żeby ocenić zapisane wyniki na nowo.');
});

/* ---------- start ---------- */
(async () => {
  $('#ver').textContent = 'v' + chrome.runtime.getManifest().version;
  const st = await chrome.storage.local.get(['profile', 'scanGroups', 'scanResults', 'seenLinks', 'sources', 'offers', 'groupsBlocked', 'groupNames']);
  offers = st.offers || []; saved = new Set(offers.map(o => o.link)); updateOffersBar();
  profile = st.profile || null; $('#prof').innerHTML = describe(profile);
  blocked = new Set((st.groupsBlocked || []).map(normG)); groupNames = st.groupNames || {};
  const fromProfile = (profile && profile.grupyFb) || [], fromSources = (st.sources || []).filter(u => /facebook\.com\/groups\//.test(u));
  const groups = [...new Set([...(st.scanGroups || []), ...fromProfile, ...fromSources].map(normG))].filter(u => !blocked.has(u));
  $('#groups').value = groups.join('\n'); lastSaved = groups;
  results = st.scanResults || []; seenLinks = new Set(st.seenLinks || results.map(r => r.id));
  renderBlocked(); render(); checkLogin();
})();
