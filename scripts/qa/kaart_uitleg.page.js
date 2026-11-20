// Page half van scripts/qa/gebieden_shots.mjs --page=scripts/qa/kaart_uitleg.page.js (desktop --perf-script body; 21-11).
// Controleert in het echte spel dat 'Zo werkt de kaart' te sluiten is: een klik op Begrepen (op het midden van de knop, via
// elementFromPoint), Enter op de knop, Escape en een klik naast het kader, en dat de uitleg na heropenen niet terugkomt.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
for (let i = 0; i < 900 && !(window.__debug && window.__debug.world && window.__debug.world.map && window.__scene3d); i++) await sleep(100);
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) {
  if (i % 30 === 5) for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true })); }
  await sleep(100);
}
const D = window.__debug; const w = D.world;
for (let i = 0; i < 25 && w.paused; i++) { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); } await sleep(200); }
const imp = (f) => import('/js/' + f + '.js');
const cine = await imp('cinematics');
const PM = await imp('pausemenu');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const res = { stappen: [] };
const help = () => document.querySelector('.mv-help');
const stap = (naam, extra = {}) => res.stappen.push({ naam, open: !!help(), ...extra });
const midden = () => { const b = document.querySelector('.mv-help .mv-help-ok'); if (!b) return null; const r = b.getBoundingClientRect(); return { b, x: r.left + r.width / 2, y: r.top + r.height / 2, r }; };
const klik = (el, x, y) => { for (const t of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 })); };
const toets = (k) => { const t = document.activeElement || document.body; t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code: k, bubbles: true, cancelable: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code: k, bubbles: true, cancelable: true })); };
const wis = () => { for (const k of Object.keys(localStorage)) if (/hud|seen/i.test(k) && k !== 'gde-save-v1') localStorage.removeItem(k); };
const open = async () => { PM.openPauseMenu('map'); await sleep(2500); };
const sluit = async () => { PM.closePauseMenu(); await sleep(1200); };

wis();
await open();
const m = midden();
if (!m) { res.fout = 'uitleg niet open bij een nieuw spel'; clearInterval(skipper); return JSON.stringify(res); }
// de menustage is met CSS zoom ingezoomd (menu.css --mz): getBoundingClientRect en elementFromPoint kunnen dan in een andere ruimte zitten, dus probeer beide
const zoomF = Number(getComputedStyle(document.querySelector('.gm-stage') || document.body).zoom) || 1;
const kandidaten = [[m.x, m.y], [m.x * zoomF, m.y * zoomF], [m.x / zoomF, m.y / zoomF]];
const treffer = kandidaten.map(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? (e.tagName + '.' + e.className).slice(0, 40) : null; });
const raak = kandidaten.findIndex(([x, y]) => { const e = document.elementFromPoint(x, y); return e && (e === m.b || m.b.contains(e)); });
const top = raak >= 0 ? document.elementFromPoint(kandidaten[raak][0], kandidaten[raak][1]) : document.elementFromPoint(m.x, m.y);
stap('open', { rect: [m.r.left, m.r.top, m.r.width, m.r.height].map(Math.round), zoomF, treffer, raak, opPunt: top && (top.tagName + '.' + top.className).slice(0, 80), isKnop: !!top && (top === m.b || m.b.contains(top)), focus: document.activeElement && document.activeElement.className });
res.opslagSleutels = Object.keys(localStorage).filter((k) => /hud|seen/i.test(k));
// 1. klik op het midden van Begrepen
klik(top || m.b, m.x, m.y); await sleep(400); stap('na klik op Begrepen' + (raak >= 0 ? '' : ' (treft de knop niet: op het element zelf)'));
await sluit(); await open(); stap('na heropenen');
// 2. Enter op de knop
wis(); await sluit(); await open();
// zonder zelf te focussen: waar de focus na het openen landt is het punt
const focusNaOpen = document.activeElement && (document.activeElement.className || document.activeElement.tagName);
toets('Enter'); await sleep(400); stap('na Enter', { focusNaOpen });
// 3. Escape: eerst de uitleg, de kaart blijft open
wis(); await sluit(); await open();
toets('Escape'); await sleep(500); stap('na Escape', { kaartOpen: !!document.querySelector('.mapview-overlay') && document.querySelector('.mapview-overlay').getClientRects().length > 0 });
// 4. klik naast het kader
wis(); await sluit(); await open();
const h = help(); if (h) { const r = h.getBoundingClientRect(); klik(h, r.left + 4, r.top + 4); await sleep(400); }
stap('na klik naast het kader');
clearInterval(skipper);
return JSON.stringify(res);
