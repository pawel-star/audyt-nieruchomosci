const $ = s => document.querySelector(s);
const fmt = n => new Intl.NumberFormat('pl-PL').format(n) + ' zł';
let profile = null, tab = null;

async function getTab() { const [t] = await chrome.tabs.query({ active: true, currentWindow: true }); return t; }
async function ensureContent() {
  try { return await chrome.tabs.sendMessage(tab.id, { type: 'ping' }); }
  catch (e) {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    await new Promise(r => setTimeout(r, 150));
    return chrome.tabs.sendMessage(tab.id, { type: 'ping' });
  }
}
function describe(p) {
  if (!p) return 'Brak profilu. Skopiuj go w aplikacji przyciskiem „Kopiuj profil do wtyczki” i wklej poniżej.';
  const typ = { mieszkanie: 'mieszkanie', dom: 'dom', dzialka: 'działka', lokal: 'lokal', garaz: 'garaż', pokoj: 'pokój', hala: 'hala' }[p.typ || 'mieszkanie'];
  const parts = [];
  parts.push('<b>' + typ + ' · ' + (p.transakcja === 'wynajem' ? 'wynajem' : 'kupno') + '</b>' + (p.miasto ? ' · ' + p.miasto : ''));
  if (p.cenaOd || p.cenaDo) parts.push('cena ' + (p.cenaOd ? 'od ' + fmt(p.cenaOd) + ' ' : '') + (p.cenaDo ? 'do ' + fmt(p.cenaDo) : ''));
  if (p.powOd || p.powDo) parts.push('metraż ' + (p.powOd ? 'od ' + p.powOd + ' ' : '') + (p.powDo ? 'do ' + p.powDo : '') + ' m²');
  if (p.pokojeOd || p.pokojeDo) parts.push('pokoje ' + (p.pokojeOd || '') + '–' + (p.pokojeDo || ''));
  if (p.slowaMusza) parts.push('musi: ' + p.slowaMusza.join(', '));
  if (p.slowaMinus) parts.push('nie: ' + p.slowaMinus.join(', '));
  if (p.udog) parts.push('ma mieć: ' + p.udog.join(', '));
  parts.push(p.elastyczne && p.elastyczne.length ? 'elastyczne: ' + p.elastyczne.join(', ') : 'wszystkie kryteria muszą być spełnione');
  return parts.join('<br>');
}
function cls(r) { return r.reject ? 'bad' : (r.miss && r.miss.length) ? 'near' : r.pct >= 50 ? 'ok' : 'weak'; }
function renderResults(data) {
  const box = $('#res'); box.innerHTML = '';
  const n = k => data.results.filter(r => cls(r) === k).length;
  $('#stat').innerHTML = `<span>ogłoszeń: <b>${data.total}</b></span><span style="color:#1f9d6b">pasuje: <b>${n('ok')}</b></span><span style="color:#2f7fd1">prawie: <b>${n('near')}</b></span><span style="color:#c47f12">słabo: <b>${n('weak')}</b></span><span style="color:#c0392b">odpada: <b>${n('bad')}</b></span>` + (data.where ? `<span>czytam: <b>${data.where}</b></span>` : '');
  if (!data.total) { box.innerHTML = '<div class="muted">Nie znalazłem bloków wyglądających na ogłoszenia (szukam tekstu z „zł” i „m²”). Na Facebooku przewiń feed, żeby załadować posty, i skanuj ponownie.</div>'; return; }
  data.results.forEach(r => {
    const c = cls(r);
    const d = document.createElement('div'); d.className = 'it ' + c;
    d.innerHTML = `<div class="h"><span class="pct">${c === 'bad' ? '✕' : c === 'near' ? '≈ ' + r.pct + '%' : r.pct + '%'}</span><span class="why"></span></div><div class="sn"></div><a target="_blank" rel="noopener">otwórz</a> <a href="#" class="keep" style="font-size:12px;margin-left:8px">+ do katalogu</a>`;
    const pas = r.why.slice(0, 4).join(' · ') || 'brak dopasowanych szczegółów';
    d.querySelector('.why').textContent = c === 'bad' ? r.reject : c === 'near' ? 'prawie: ' + r.miss.join(' · ') + ' | ' + pas : pas + (r.bad.length ? ' | brak: ' + r.bad.slice(0, 3).join(', ') : '');
    d.querySelector('.sn').textContent = r.snippet;
    const a = d.querySelector('a'); a.href = r.link; a.onclick = e => e.stopPropagation();
    const k = d.querySelector('.keep'); k.onclick = async e => { e.preventDefault(); e.stopPropagation(); const st = await chrome.storage.local.get(['offers']); const offers = st.offers || []; if (offers.some(o => o.link === r.link)) { k.textContent = '✓ w katalogu'; return; } offers.push({ link: r.link, zrodlo: /facebook\.com/.test(r.link) ? 'fb' : 'biuro', grupa: data.host, pct: r.pct, why: r.why, bad: r.bad, miss: r.miss || [], text: r.text || r.snippet, data: r.data, miejscowosc: (profile && profile.miasto) || '' }); await chrome.storage.local.set({ offers }); k.textContent = '✓ w katalogu'; $('#srcCnt').textContent = 'odłożone: ' + offers.length + ' (kopiuj w Skanerze grup)'; };
    d.onclick = () => chrome.tabs.sendMessage(tab.id, { type: 'goto', idx: r.idx });
    box.appendChild(d);
  });
}
async function doScan() {
  $('#err').textContent = '';
  if (!profile) { $('#err').textContent = 'Najpierw wklej profil.'; return; }
  try {
    await ensureContent();
    const opts = { dim: $('#dim').checked };
    const data = await chrome.tabs.sendMessage(tab.id, { type: 'scan', profile, opts });
    if (data.error) throw new Error(data.error);
    renderResults(data);
  } catch (e) { $('#err').textContent = 'Nie mogę skanować tej strony: ' + (e.message || e) + '. Odśwież kartę i spróbuj ponownie.'; }
}

(async () => {
  tab = await getTab();
  $('#ver').textContent = 'v' + chrome.runtime.getManifest().version;
  let host = ''; try { host = new URL(tab.url).hostname.replace(/^www\./, ''); } catch (e) {}
  $('#host').textContent = host;
  const isFB = /facebook\.com$/.test(host);
  $('#autoWrap').classList.toggle('hidden', !isFB);
  const st = await chrome.storage.local.get(['profile', 'dim', 'auto', 'sources']);
  profile = st.profile || null; $('#prof').innerHTML = describe(profile);
  $('#dim').checked = !!st.dim; $('#auto').checked = !!st.auto;
  $('#srcCnt').textContent = (st.sources || []).length ? (st.sources.length + ' zapisanych') : '';
  if (!profile) $('#pasteBox').classList.remove('hidden');
})();

$('#togglePaste').onclick = () => $('#pasteBox').classList.toggle('hidden');
$('#saveProfile').onclick = async () => {
  $('#pasteErr').textContent = '';
  try {
    const p = JSON.parse($('#paste').value.trim());
    if (!p || p._app !== 'szukacz-nieruchomosci') throw new Error('to nie jest profil z aplikacji');
    profile = p; await chrome.storage.local.set({ profile: p });
    $('#prof').innerHTML = describe(p); $('#pasteBox').classList.add('hidden'); $('#paste').value = '';
  } catch (e) { $('#pasteErr').textContent = 'Nie udało się: ' + e.message; }
};
$('#clearProfile').onclick = async () => { profile = null; await chrome.storage.local.remove('profile'); $('#prof').innerHTML = describe(null); $('#pasteBox').classList.remove('hidden'); };
$('#scan').onclick = doScan;
$('#openScanner').onclick = () => chrome.tabs.create({ url: chrome.runtime.getURL('skaner.html') });
$('#clear').onclick = async () => { try { await ensureContent(); await chrome.tabs.sendMessage(tab.id, { type: 'clear' }); $('#res').innerHTML = ''; $('#stat').innerHTML = ''; } catch (e) {} };
$('#dim').onchange = e => chrome.storage.local.set({ dim: e.target.checked });
$('#auto').onchange = async e => {
  await chrome.storage.local.set({ auto: e.target.checked });
  try { await ensureContent(); await chrome.tabs.sendMessage(tab.id, { type: 'auto', on: e.target.checked, profile, opts: { dim: $('#dim').checked } }); } catch (err) {}
};
$('#addSrc').onclick = async () => {
  const st = await chrome.storage.local.get(['sources']); const s = st.sources || [];
  let u = tab.url; try { const x = new URL(u); if (/facebook\.com$/.test(x.hostname)) { const m = x.pathname.match(/^\/groups\/[^/]+/); if (m) u = x.origin + m[0]; } } catch (e) {}
  if (!s.includes(u)) s.push(u);
  await chrome.storage.local.set({ sources: s }); $('#srcCnt').textContent = s.length + ' zapisanych';
};
$('#copySrc').onclick = async () => {
  const st = await chrome.storage.local.get(['sources']); const s = st.sources || [];
  await navigator.clipboard.writeText(s.join('\n')); $('#srcCnt').textContent = 'skopiowano ' + s.length;
};
