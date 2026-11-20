// Page half of scripts/qa/ds_schermen4_beeld.mjs (desktop --perf-script body; designsysteem v2 fase 4, #980):
// opent Prestaties, Foto's, Kaart en Samen spelen zoals een speler dat doet, neemt beelden ("[capture] naam") en meet.
// window.__ds4 = { settle, prefix, stap: ['prestaties', 'fotos', 'kaart', 'samen'] }.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) await sleep(500);
const tap = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code: code || k, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code: code || k, bubbles: true })); } };
for (let i = 0; i < 25 && window.__debug && window.__debug.world && window.__debug.world.paused; i++) { tap(' ', 'Space'); await sleep(700); }
const D = window.__debug; const w = D.world;
const CFG = window.__ds4 || {};
const PRE = CFG.prefix || 'x';
const STAP = CFG.stap || ['prestaties', 'fotos', 'kaart', 'samen'];
const cine = await imp('cinematics');
const PM = await imp('pausemenu');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
w.clock = 14;
await sleep(CFG.settle || 8000);
const out = { stappen: [], fouten: [], venster: [innerWidth, innerHeight] };
const fps = async (ms = 1500) => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < ms) requestAnimationFrame(f); else res(+(n / ((performance.now() - t0) / 1000)).toFixed(1)); }; requestAnimationFrame(f); });
const geelNu = () => [...document.querySelectorAll('.ds-knop:not(.ds-knop--secundair):not(.ds-knop--tekst):not(.ds-knop--gevaar)')].filter((b) => b.getClientRects().length && getComputedStyle(b).visibility !== 'hidden' && !b.disabled).map((b) => b.textContent.trim().slice(0, 24)); // besluit eigenaar 20-11: één gele hoofdknop per scherm
const shot = async (name, wait = 900) => { await sleep(wait); out.geel = out.geel || {}; out.geel[name] = geelNu(); out.fps = out.fps || {}; out.fps[name] = await fps(600); console.log('[capture] ' + PRE + '-' + name); await sleep(600); };
const q = (s) => document.querySelector(s);
const kleinste = (el) => { let min = 99, wie = ''; for (const n of el.querySelectorAll('*')) { const heeftTekst = [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()); if (!heeftTekst) continue; const r = n.getBoundingClientRect(); if (!r.width || !r.height) continue; const px = parseFloat(getComputedStyle(n).fontSize); if (px < min) { min = px; wie = (n.className && n.className.baseVal === undefined ? n.className : n.tagName) + ': ' + n.textContent.trim().slice(0, 30); } } return { px: min, wie }; };
// Hoeveel van een element is na het scrollen echt zichtbaar (alle scrolvoorouders knippen)?
const zichtbaar = (el) => {
  if (!el) return null;
  el.scrollIntoView({ block: 'center' });
  const r = el.getBoundingClientRect(); let top = Math.max(0, r.top), bot = Math.min(innerHeight, r.bottom);
  for (let a = el.parentElement; a; a = a.parentElement) {
    const cs = getComputedStyle(a);
    if (/(auto|scroll|hidden|clip)/.test(cs.overflowY)) { const ar = a.getBoundingClientRect(); top = Math.max(top, ar.top); bot = Math.min(bot, ar.bottom); }
  }
  return { hoogte: Math.round(r.height), zichtbaar: Math.max(0, Math.round(bot - top)) };
};
const open = async (naam, opts) => { PM.openPauseMenu(naam, opts); await sleep(1500); };
const sluit = async () => { PM.closePauseMenu(); await sleep(500); };
out.fps0 = await fps();

if (STAP.includes('prestaties')) {
  await open('prestaties');
  const m = q('#pause-menu');
  out.prestaties = { tegels: m.querySelectorAll('.pa-tile').length, kaarten: m.querySelectorAll('.ds-kaart').length, klein: kleinste(m) };
  await shot('prestaties-alles', 600);
  const tegel = m.querySelector('[data-achcat]'); if (tegel) { tegel.click(); await sleep(500); await shot('prestaties-open', 400); }
  const rij = m.querySelector('[data-ach]'); if (rij) { rij.click(); await sleep(500); await shot('prestaties-detail', 400); }
  const bijna = m.querySelector('[data-achview="bijna"]'); if (bijna) { bijna.click(); await sleep(500); await shot('prestaties-bijna', 400); }
  await sluit();
}
if (STAP.includes('fotos')) {
  await open('fotos');
  const m = q('#pause-menu');
  out.fotos = { kaarten: m.querySelectorAll('.pm-fotos .ds-kaart').length, klein: kleinste(m.querySelector('.pm-fotos') || m) };
  await shot('fotos', 700);
  await sluit();
}
if (STAP.includes('fotosvol')) {
  // een galerij met drie foto's (wegwerpprofiel: de sleutel gde-galerij-v1 raakt geen echte opslag)
  const F = await imp('fotomodus');
  const thumb = (kleur) => { const c = document.createElement('canvas'); c.width = 320; c.height = 180; const g = c.getContext('2d'); g.fillStyle = kleur; g.fillRect(0, 0, 320, 180); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, 120, 320, 60); return c.toDataURL('image/jpeg', 0.6); };
  let lijst = [];
  [['Martinitoren', '#6a8fb0', 9], ['Grote Markt', '#b08a6a', 17], ['Noorderplantsoen', '#6ab08a', 20]].forEach(([plaats, kleur, uur], i) => { lijst = F.addShot(lijst, F.makeShot({ id: 'f' + (i + 1), plaats, dagLabel: 'Vrijdag 14 augustus', hour: uur, weather: null, filter: 'geen', thumb: thumb(kleur), file: 'grunn-' + (i + 1) + '.png' })); });
  F.saveGallery(window.localStorage, lijst);
  await open('fotos');
  const m = q('#pause-menu');
  out.fotosvol = { kaarten: m.querySelectorAll('.pm-fotos .foto-kaart').length, klein: kleinste(m.querySelector('.pm-fotos') || m) };
  await shot('fotos-vol', 700);
  await sluit();
  F.saveGallery(window.localStorage, []);
}
if (STAP.includes('kaart')) {
  await open('map');
  out.kaart = { klein: kleinste(q('#pause-menu')) };
  await shot('kaart', 1500);
  await sluit();
}
if (STAP.includes('samen')) {
  await open('samen');
  out.samen = { klein: kleinste(q('#pause-menu')) };
  await shot('samen', 800);
  await sluit();
}
if (STAP.includes('raak')) {
  // QA-sweep 20-11: railknoppen op raakbediening en de focusring van de schuif en het kaartzoekveld
  const zicht = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  await open('spel');
  out.raak = { touch: document.documentElement.classList.contains('touch-device'), venster: [innerWidth, innerHeight], rail: [...document.querySelectorAll('#pause-menu .ra')].filter(zicht).map((e) => [e.textContent.trim().slice(0, 14), Math.round(e.getBoundingClientRect().width), Math.round(e.getBoundingClientRect().height)]) };
  await shot('raak-rail', 600);
  await open('settings');
  const sl = document.querySelector('#pause-menu input.m-sl');
  if (sl) { sl.scrollIntoView({ block: 'center' }); tap('ArrowRight', 'ArrowRight'); sl.focus(); const cs = getComputedStyle(sl); out.raak.schuif = { focusVisible: sl.matches(':focus-visible'), outline: cs.outlineStyle + ' ' + cs.outlineWidth }; await shot('raak-schuif', 500); }
  await sluit();
  await open('map'); await sleep(1500);
  const zoek = document.querySelector('.mapview-search input');
  if (zoek) { tap('Tab', 'Tab'); zoek.focus(); const cs = getComputedStyle(zoek); out.raak.zoek = { focusVisible: zoek.matches(':focus-visible'), outline: cs.outlineStyle + ' ' + cs.outlineWidth }; await shot('raak-zoek', 500); }
  await sluit();
}
clearInterval(skipper);
return JSON.stringify(out);
