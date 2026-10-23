// Page half voor #423: de kaartlaag Veroverd op vier zoomniveaus en de minikaart (scripts/qa/gebieden_shots.mjs --page=scripts/qa/gebieden_zoom.page.js).
// Maakt eerst drie toestanden: een wijk helemaal gedaan, een buurt/wijk bezig en de rest onveroverd, in en rond het stadshart.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
for (let i = 0; i < 900 && !(window.__debug && window.__debug.world && window.__debug.world.map && window.__scene3d); i++) await sleep(100);
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) {
  if (i % 30 === 5) for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true })); }
  await sleep(100);
}
const D = window.__debug; const w = D.world; const p = w.player;
for (let i = 0; i < 25 && w.paused; i++) { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); } await sleep(700); }
const imp = (f) => import('/js/' + f + '.js');
const cine = await imp('cinematics');
const PM = await imp('pausemenu');
const MV = await imp('mapview');
const GL = await imp('gebiedenlive');
const errors = [];
window.addEventListener('error', (e) => { errors.push(String(e.message)); console.error('[gb-error] ' + e.message); });
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
let hold = null, done = false;
const tick = () => { if (hold) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; p.angle = 0; w.camYaw = 0; } w.clock = 13; if (!done) requestAnimationFrame(tick); };
requestAnimationFrame(tick);
const cap = async (name) => { console.log('[capture] ' + name); await sleep(900); };
let o = null;
for (let i = 0; i < 300 && !o; i++) { o = GL.getOverzicht(); if (!o) await sleep(200); }
const results = { shots: [], errors };
if (!o) { results.fout = 'geen indeling'; done = true; return JSON.stringify(results); }
const ind = o.ind;
const stad = ind.gebieden.find((g) => g.niveau === 'gemeente' && g.naam === 'Groningen');
// toestanden: de gebieden van het stadshart, meest taken eerst; een deel helemaal, een deel half
const wijken = ind.gebieden.filter((g) => g.niveau === 'wijk' && g.veroverbaar && g.naam !== 'Groningen').sort((a, b) => b.taken.length - a.taken.length);
const klaar = wijken.find((g) => g.taken.length >= 3 && g.taken.length <= 9) || wijken[0];
const bezig = wijken.find((g) => g !== klaar && g.taken.length >= 4) || wijken.find((g) => g !== klaar);
const dorp = ind.gebieden.find((g) => g.niveau === 'woonplaats' && g.veroverbaar && g.naam !== 'Groningen');
w.addMessage = () => {};
for (const g of [klaar, dorp]) if (g) for (const id of g.taken) GL.doeTaak(w, id);
if (bezig) { const ids = [...bezig.taken]; for (let i = 0; i < Math.ceil(ids.length / 2); i++) GL.doeTaak(w, ids[i]); }
results.gekozen = { klaar: klaar && klaar.naam, bezig: bezig && bezig.naam, dorp: dorp && dorp.naam };
await sleep(1500);
hold = { x: klaar.x, y: klaar.y };
p.x = klaar.x; p.y = klaar.y;
PM.openPauseMenu('map'); await sleep(1500);
const niv = [['z1-ver', stad.x, stad.y, 0.5], ['z2-midden', stad.x, stad.y, 1.0], ['z3-dichtbij', klaar.x, klaar.y, 2.5], ['z4-dichtst', klaar.x, klaar.y, 5]];
for (const [naam, x, y, z] of niv) { MV.setMapView(x, y, z); await sleep(3500); await cap('gb-' + naam); results.shots.push('gb-' + naam); }
PM.closePauseMenu(); await sleep(9000);
await cap('gb-minikaart'); results.shots.push('gb-minikaart');
done = true; clearInterval(skipper);
return JSON.stringify(results);
