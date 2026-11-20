// Page half van scripts/qa/plek_beeld.mjs (desktop --perf-script body; #953): per plek een echte sprong (het laadscherm opent),
// wachten tot het weg is, dan een luchtbeeld (cameraOverride, schuin op 70 m) en een beeld van de speler zelf.
// Meet ook: staat de speler in water, welke plaatsnaam het spel noemt. window.__pb = { plekken: [{ naam, x, y }] }.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const tap = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
for (let i = 0; i < 900 && !(window.__debug && window.__debug.world && window.__debug.world.map && window.__scene3d); i++) await sleep(100);
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) {
  if (i % 30 === 5) tap('Enter', 'Enter');
  await sleep(100);
}
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const cine = await import('/js/cinematics.js');
for (let i = 0; i < 10 && cine.isCinematicActive(); i++) { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); await sleep(2500); for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); await sleep(1500); }
await sleep(4000);
for (let i = 0; i < 25 && w.paused; i++) { tap(' ', 'Space'); await sleep(200); }
const CFG = window.__pb || { plekken: [] };
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
w.devInvuln = true; w.clock = 14;
const { isInWater } = await import('/js/util.js');
const WLv = await import('/js/waterlevels.js');
const out = { plekken: [] };
try {
  for (const q of CFG.plekken) {
    const rep = { naam: q.naam, x: q.x, y: q.y };
    out.plekken.push(rep);
    w.cameraOverride = null;
    p.x = q.x; p.y = q.y; p.vx = p.vy = 0; p.z = 0; p.vz = 0;
    for (let i = 0; i < 60 && !document.getElementById('load-screen'); i++) await sleep(100);
    for (let i = 0; i < 400 && document.getElementById('load-screen'); i++) await sleep(100);
    await sleep(6000);
    w.clock = 14;
    const gz = map.groundHeightAt ? (map.groundHeightAt(q.x, q.y, 0) || 0) : 0;
    rep.speler = { x: Math.round(p.x), y: Math.round(p.y), inWater: !!isInWater(map, p.x, p.y), label: (document.querySelector('.hud-place, #place, .place-name') || {}).textContent || null };
    { const pl = WLv.waterPolyAt(map, q.x, q.y, 0); rep.waterpoly = pl ? { pts: pl.pts.length, bounds: (pl.bounds || []).map(Math.round), keys: Object.keys(pl), naam: pl.name || null, kind: pl.kind || pl.type || null, holes: pl.holes ? pl.holes.length : 0 } : null; rep.waterRondom = map.waterNear(q.x, q.y, 60).length; rep.gebouwNabij = map.buildingsNear ? map.buildingsNear(q.x, q.y, 20).length : -1; }
    const tag = (q.naam || 'plek').replace(/[^\w]+/g, '_');
    console.log('[capture] pb-' + tag + '-speler'); await sleep(600);
    w.cameraOverride = { position: { x: q.x + 45, y: q.y - 45, z: gz + 55 }, lookAt: { x: q.x, y: q.y, z: gz }, fov: 60, cut: true };
    await sleep(2500);
    console.log('[capture] pb-' + tag + '-lucht'); await sleep(600);
    w.cameraOverride = { position: { x: q.x + 16, y: q.y - 8, z: gz + 3 }, lookAt: { x: q.x, y: q.y, z: gz + 1 }, fov: 70, cut: true };
    await sleep(1800);
    console.log('[capture] pb-' + tag + '-straat'); await sleep(600);
  }
} catch (e) { out.fout = String(e && e.stack || e).slice(0, 500); }
w.cameraOverride = null;
return JSON.stringify(out);
