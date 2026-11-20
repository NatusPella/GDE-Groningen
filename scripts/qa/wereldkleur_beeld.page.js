// Page half van scripts/qa/wereldkleur_beeld.mjs (desktop --perf-script body; wereldkleur 21-11, worldpalette.js): per plek een echte sprong,
// tijd en weer vastzetten en één beeld (HUD weg via een cinematic zonder balken) op 1280x720. window.__wk = { plekken: [{ naam, x, y, klok, weer, d, az, h, lz, oog, a }] }.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const CFG = window.__wk;
for (let i = 0; i < 900 && !(window.__debug && window.__debug.world && window.__debug.world.map && window.__scene3d); i++) await sleep(100);
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) {
  if (i % 30 === 5) for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true })); }
  await sleep(100);
}
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const cine = await import('/js/cinematics.js');
const DN = await import('/js/daynight.js');
const PM = await import('/js/pausemenu.js');
for (let i = 0; i < 25 && w.paused; i++) { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); } await sleep(500); }
let ownShot = false, hold = null, now = null, done = false;
const skipper = setInterval(() => { if (!ownShot && cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
// de klokuren: de zonshoogte die een dagdeel nodig heeft (graden), gezocht in de zomercyclus van daynight.js
const uurBij = (elev) => { let best = 12, bd = 1e9; for (let h = 12; h < 24; h += 0.05) { const d = Math.abs(DN.sunElevationDeg(h) - elev); if (d < bd) { bd = d; best = h; } } return best; };
const uren = { dag: 14, avond: uurBij(4), nacht: uurBij(-20) };
const WEER = { helder: { kind: undefined, peak: 0, overcast: 0, mist: 0, active: false, wet: 0 }, regen: { kind: 'regenbui', peak: 0.7, overcast: 0.85, mist: 0.15, active: true, wet: 1 } };
const tick = () => {
  if (PM.isPauseMenuOpen()) PM.closePauseMenu();
  if (hold && !p.inVehicle) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; }
  if (now) {
    w.clock = now.hour; if (DN.refreshDayNight) DN.refreshDayNight(w);
    const ws = w.weather, k = now.weer;
    ws.timer = 1e9; ws.kind = k.kind; ws.peak = k.peak; ws.overcast = k.overcast; ws.mist = k.mist; ws.active = k.active; ws.duration = Infinity; ws.elapsed = 0; ws.windAngle = 0.9;
    ws.intensity = k.active ? k.peak : 0; ws.wet = k.wet;
  }
  if (!done) requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
const out = { uren, plekken: [] };
try {
  for (const q of CFG.plekken) {
    const rep = { naam: q.naam };
    out.plekken.push(rep);
    now = { hour: uren[q.klok || 'dag'], weer: WEER[q.weer || 'helder'] };
    if (p.inVehicle) p.exitVehicle(map, w);
    p.x = q.x; p.y = q.y; p.vx = p.vy = 0; p.z = 0; p.vz = 0; hold = { x: q.x, y: q.y };
    for (let i = 0; i < 60 && !document.getElementById('load-screen'); i++) await sleep(100);
    for (let i = 0; i < 400 && document.getElementById('load-screen'); i++) await sleep(100);
    await sleep(7000);
    const gz = (map.groundHeightAt ? map.groundHeightAt(q.x, q.y, 0) : 0) || 0;
    const pose = q.oog
      ? { position: { x: q.x, y: q.y, z: gz + 1.8 }, lookAt: { x: q.x + Math.cos(q.a) * 40, y: q.y + Math.sin(q.a) * 40, z: gz + 4 }, cut: true }
      : { position: { x: q.x + Math.cos(q.az) * q.d, y: q.y + Math.sin(q.az) * q.d, z: gz + q.h }, lookAt: { x: q.x, y: q.y, z: gz + q.lz }, cut: true };
    if (cine.isCinematicActive()) cine.skipCinematic();
    ownShot = true;
    cine.playCinematic({ id: 'qa-wk', duration: 60, priority: 9, letterbox: false, shot: () => ({ ...pose, fov: q.fov || 62 }) });
    await sleep(2500);
    console.log('[capture] wk-' + q.naam); await sleep(900);
    cine.skipCinematic(); ownShot = false; await sleep(400);
    rep.gz = gz;
  }
} catch (e) { out.fout = String(e && e.stack || e).slice(0, 500); }
done = true; clearInterval(skipper);
return JSON.stringify(out);
