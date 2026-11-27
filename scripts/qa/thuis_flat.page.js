// Page half of scripts/qa/thuis_qa.mjs --page=flat (#1343): de voordeur van de toren (lobby), en in de flat het volgbeeld en
// overzichtsbeelden (woonkamer, gang met voordeur, gevel van buiten). window.__tq = { settle }.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const key = (k, code, down) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key: k, code, bubbles: true })); };
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) await sleep(500);
for (let i = 0; i < 25 && window.__debug && window.__debug.world && window.__debug.world.paused; i++) { key(' ', 'Space', true); key(' ', 'Space', false); await sleep(700); }
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const imp = (f) => import('/js/' + f + '.js');
const cine = await imp('cinematics');
const SC = await imp('scene3d');
const S3 = window.__scene3d;
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const grab = async (name) => { await sleep(400); console.log('[capture] ' + name); await sleep(500); };
const out = { maten: {} };
const home = window.__home.home;
const f = home.flat, L = home.lobby;
out.maten = { flat: [f.w, f.d], toren: [+f.tower.w.toFixed(1), +f.tower.d.toFixed(1)], vloerY: f.floorY };
let cur = null;
const origRender = S3.renderer.render.bind(S3.renderer);
S3.renderer.render = (sc, c) => {
  if (cur && c === S3.cam) { c.position.set(cur.p[0], cur.p[2], cur.p[1]); c.lookAt(cur.l[0], cur.l[2], cur.l[1]); c.updateMatrixWorld(true); }
  origRender(sc, c);
};
const waitStream = async () => { let n = 0; while (SC.streamPending().roads > 0 && n++ < 10) await sleep(500); for (let k = 0; k < 10 && document.getElementById('load-screen'); k++) await sleep(500); };
await sleep((window.__tq && window.__tq.settle) || 6000);
await waitStream();
// 1. de voordeur van de toren: lobby, vanaf de straatkant
if (p.inVehicle) p.exitVehicle(map, w);
p.x = L.use[0]; p.y = L.use[1]; p.vx = p.vy = 0;
await sleep(1500);
const ca = L.angle; // naar buiten
cur = { p: [L.x + Math.cos(ca) * 5.5 + Math.cos(ca + Math.PI / 2) * 1.5, L.y + Math.sin(ca) * 5.5 + Math.sin(ca + Math.PI / 2) * 1.5, 1.7], l: [L.x, L.y, 1.4] };
await grab('lobby-voordeur');
// 2. binnen
cur = null;
window.__home.enter();
for (let i = 0; i < 24 && !(window.__home.state && window.__home.state().inside); i++) await sleep(500);
await sleep(1500);
await waitStream();
out.binnen = !!(window.__home.state && window.__home.state().inside);
await grab('flat-volgbeeld');
const fl = (x, z, h) => { const [wx, wy] = f.fl(x, z); return [wx, wy, f.floorY + h]; };
cur = { p: fl(5.5, 7.8, 3.6), l: fl(5.5, 2.0, 0.6) };
await grab('flat-overzicht-woonkamer');
cur = { p: fl(1.7, 6.0, 1.7), l: fl(1.7, 8.9, 1.3) };
await grab('flat-voordeur-gang');
cur = { p: fl(10.4, 8.4, 3.2), l: fl(1.0, 2.5, 0.8) };
await grab('flat-diagonaal');
// 3. van buiten: de gevel met glas
cur = { p: fl(5.5, -14, 14), l: fl(5.5, 2.0, 0.5) };
await grab('flat-gevel-van-buiten');
cur = { p: fl(-14, 4.5, 12), l: fl(3, 4.5, 0.5) };
await grab('flat-zijkant-van-buiten');
// 4. de plafondhoogte in het spel: wat is de snijhoogte van de muren en hoe hoog de vloer tot het volgende dek
out.snijHoogte = null;
clearInterval(skipper);
return JSON.stringify(out);
