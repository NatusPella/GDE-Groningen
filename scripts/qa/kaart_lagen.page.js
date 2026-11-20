// Page half van scripts/qa/gebieden_shots.mjs --page=scripts/qa/kaart_lagen.page.js (desktop --perf-script body; 21-11).
// De kaartlagen in beeld: de grote kaart op drie zoomniveaus (overdag) en de minikaart, in het centrum van Groningen, zonder de
// eenmalige uitleg. Voor en na vergelijk je door dezelfde run op twee gestagede games te doen (voor = vóór het nieuwe palet).
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
for (let i = 0; i < 900 && !(window.__debug && window.__debug.world && window.__debug.world.map && window.__scene3d); i++) await sleep(100);
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) {
  if (i % 30 === 5) for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true })); }
  await sleep(100);
}
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
for (let i = 0; i < 25 && w.paused; i++) { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); } await sleep(700); }
const imp = (f) => import('/js/' + f + '.js');
const cine = await imp('cinematics');
const PM = await imp('pausemenu');
const MV = await imp('mapview');
const errors = [];
window.addEventListener('error', (e) => { errors.push(String(e.message)); console.error('[gb-error] ' + e.message); });
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const index = await fetch('/world/index-provincie.json').then((r) => r.json()).then((j) => j.global);
const q = index.places.find((x) => x.name === 'Groningen' && x.kind === 'city') || index.places.find((x) => x.name === 'Groningen');
let hold = null, done = false;
const tick = () => { if (hold) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; p.angle = 0; w.camYaw = 0; } w.clock = 13; if (!done) requestAnimationFrame(tick); };
requestAnimationFrame(tick);
if (p.inVehicle) p.exitVehicle(map, w);
p.x = q.x; p.y = q.y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0; hold = { x: q.x, y: q.y };
// de opname loopt achter op de regel: eerst een voorloper, dan de echte, en daarna nog even rust (zoals kaart_toestanden.page.js)
const cap = async (name) => { await sleep(1500); console.log('[capture] ' + name + '-0'); await sleep(2800); console.log('[capture] ' + name); await sleep(3500); };
const results = { css: [innerWidth, innerHeight], shots: [], errors };
await sleep(9000);
await cap('mini'); results.shots.push('mini');
PM.openPauseMenu('map'); await sleep(3000);
for (const b of document.querySelectorAll('button')) if (/begrepen/i.test(b.textContent)) { b.click(); await sleep(700); }
for (const z of [1, 3, 6]) { MV.setMapView(q.x, q.y, z); await sleep(9000); await cap('kaart-z' + z); results.shots.push('kaart-z' + z); }
PM.closePauseMenu(); await sleep(1500);
done = true;
clearInterval(skipper);
return JSON.stringify(results);
