// Page half van scripts/qa/kaart_acties_shots.mjs (desktop --perf-script body; #445).
// De kaart in beeld: de uitleg, de actiebalk bij een klik op een plek, Reis erheen, het waypoint met lijn en afstand,
// Haal weg bij een tweede klik, de gast, en het keuzevenster Snel reizen / Zelf gaan / Overslaan. Echte muisgebeurtenissen
// op het canvas. Geeft per stap de uitkomsten terug (waypoint gezet, weg, melding).
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
for (let i = 0; i < 900 && !(window.__debug && window.__debug.world && window.__debug.world.map && window.__scene3d); i++) await sleep(100);
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) {
  if (i % 30 === 5) for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true })); }
  await sleep(100);
}
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
for (let i = 0; i < 25 && w.paused; i++) { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); } await sleep(200); }
const imp = (f) => import('/js/' + f + '.js');
const cine = await imp('cinematics');
const PM = await imp('pausemenu');
const MV = await imp('mapview');
const RT = await imp('routing');
const RP = await imp('reispanel');
const errors = [];
window.addEventListener('error', (e) => { errors.push(String(e.message)); console.error('[ka-error] ' + e.message); });
window.addEventListener('unhandledrejection', (e) => { errors.push(String(e.reason)); console.error('[ka-error] ' + e.reason); });
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
w.money = 500;

const index = await fetch('/world/index-provincie.json').then((r) => r.json()).then((j) => j.global);
const q = index.places.find((x) => x.name === 'Groningen' && x.kind === 'city') || index.places[0];
if (p.inVehicle) p.exitVehicle(map, w);
p.x = q.x; p.y = q.y; p.vx = p.vy = 0; p.z = 0; p.vz = 0;
let done = false;
const tick = () => { p.x = q.x; p.y = q.y; p.vx = p.vy = 0; w.clock = 13; if (!done) requestAnimationFrame(tick); };
requestAnimationFrame(tick);

const res = { stappen: [], errors };
const shot = async (name) => { console.log('[capture] ' + name); await sleep(900); };
const cv = () => document.querySelector('.mapview-canvas');
const click = async (dx, dy) => {
  const r = cv().getBoundingClientRect();
  const x = r.left + r.width / 2 + dx, y = r.top + r.height / 2 + dy;
  cv().dispatchEvent(new MouseEvent('mousedown', { clientX: x, clientY: y, button: 0, buttons: 1, bubbles: true }));
  window.dispatchEvent(new MouseEvent('mouseup', { clientX: x, clientY: y, button: 0, bubbles: true }));
  await sleep(500);
};
const card = () => document.querySelector('.mapview-card');
const cardBtn = (act) => card() && card().querySelector(`[data-card="${act}"]`);
const press = async (el) => { if (el) { el.click(); await sleep(500); } return !!el; };
const stap = (naam, extra = {}) => res.stappen.push({ naam, wp: !!RT.getUserWaypoint(), kaartKaart: !!(card() && !card().hidden), ...extra });

PM.openPauseMenu('map');
await sleep(2500);
MV.setMapView(q.x, q.y, 4);
await sleep(4500);
// 1. de eerste keer: de uitleg
stap('uitleg', { uitleg: !!document.querySelector('.mv-uitleg'), hint: !!document.querySelector('.mv-hint') });
await shot('ka-1-uitleg');
await press(document.querySelector('[data-act="uitleg-sluit"]'));
stap('uitleg gesloten', { uitleg: !!document.querySelector('.mv-uitleg') });

// 2. een klik op een plek: de balk met drie keuzes (nog geen waypoint)
await click(160, -60);
stap('klik op een plek', { knoppen: [...card().querySelectorAll('.mv-actie')].map((b) => b.textContent) });
await shot('ka-2-balk');

// 3. Reis erheen: de uitgelegde keuze
await press(cardBtn('reis'));
stap('Reis erheen', { keuzes: [...card().querySelectorAll('.mv-keuze')].map((b) => b.textContent), reisnu: !!cardBtn('rij') });
await shot('ka-3-reis');

// 4. Zet waypoint: lijn en afstand
await press(cardBtn('waypoint'));
await sleep(1200);
stap('Zet waypoint', { route: (document.querySelector('.mapview-route') || {}).textContent || '' });
await shot('ka-4-waypoint');

// 5. tweede klik op het waypoint: Haal weg
const wp = RT.getUserWaypoint();
res.wp = wp && { x: wp.x, y: wp.y };
await click(160, -60);
stap('tweede klik', { knoppen: card() ? [...card().querySelectorAll('.mv-actie')].map((b) => b.textContent) : [] });
await shot('ka-5-haalweg');
await press(cardBtn('haalweg'));
stap('Haal weg');

// 6. een gast: waypoint kan, reizen niet
w.coopRole = 'client'; w.coopNet = { gast: true };
await click(-140, 80);
await press(cardBtn('reis'));
stap('gast: Reis erheen', { melding: card() ? (card().querySelector('.mv-note') || {}).textContent || '' : '' });
await shot('ka-6-gast');
await press(cardBtn('waypoint'));
stap('gast: waypoint');
RT.clearUserWaypoint();
w.coopRole = null; w.coopNet = null;
PM.closePauseMenu();
await sleep(800);

// 7. het keuzevenster van een verhaalrit
const beat = { to: 'Zoutkamp', length: 9000, ride: 'bus', lines: ['Het ritje naar Zoutkamp.'] };
const asked = RP.askTravel(beat);
await sleep(900);
await shot('ka-7-keuze');
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
res.keuze = await asked;
done = true;
clearInterval(skipper);
return JSON.stringify(res);
