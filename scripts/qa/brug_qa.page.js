// Page half of scripts/qa/brug_qa.mjs (desktop --perf-script body; #235): per brug vier standen als beeld zonder auto:
// naderen (de oprit op 45 m), op (op het dek), onder (naast de pijlers onder het dek, omhoog) en bij een beweegbare brug
// open en dicht. Het lezen van het dek zelf (stap en zweven) doet scripts/qa/brug_probe.mjs; dit is het beeld.
// window.__bq = { bruggen: [{ naam, x, y }], settle } staat ervoor. Elke keydown wordt gevolgd door een keyup.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const tapKey = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
for (let i = 0; i < 40; i++) {
  const ss = document.querySelector('#start-screen');
  if (!ss || getComputedStyle(ss).display === 'none' || !ss.getClientRects().length || getComputedStyle(ss).visibility === 'hidden') break;
  const item = [...ss.querySelectorAll('.ss-item')].find((e) => /nieuw spel/i.test(e.textContent));
  if (item) item.click(); else tapKey('Enter', 'Enter');
  await sleep(3000);
}
for (let i = 0; i < 25 && window.__debug && window.__debug.world && window.__debug.world.paused; i++) { tapKey(' ', 'Space'); await sleep(700); }
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const imp = (f) => import('/js/' + f + '.js');
const CFG = window.__bq || { bruggen: [] };
const SETTLE = CFG.settle || 4500;
const issues = [];
const origErr = console.error.bind(console);
console.error = (...a) => { issues.push('console.error: ' + a.map(String).join(' ').slice(0, 200)); origErr(...a); };
const cine = await imp('cinematics');
const DN = await imp('daynight');
const MB = await imp('movablebridges');
const skipper = setInterval(() => { if (!window.__bqShot && cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
w.clock = 14;
w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
if (DN.refreshDayNight) DN.refreshDayNight(w);
let hold = null, done = false;
const tick = () => { if (hold) { if (p.inVehicle) p.exitVehicle(map, w); p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; p.z = 0; p.vz = 0; } if (!done) requestAnimationFrame(tick); };
requestAnimationFrame(tick);
const shot = async (name, pose) => {
  window.__bqShot = true;
  cine.playCinematic({ id: 'bq-view', duration: 60, priority: 9, shot: () => pose });
  await sleep(1700);
  console.log('[capture] ' + name);
  await sleep(500);
  cine.skipCinematic();
  window.__bqShot = false;
  await sleep(250);
};
const lenOf = (r) => r.pts.slice(1).reduce((a, q, i) => a + Math.hypot(q[0] - r.pts[i][0], q[1] - r.pts[i][1]), 0);
const results = [];
await sleep(3000);
for (const b of CFG.bruggen) {
  const rep = { naam: b.naam, x: b.x, y: b.y };
  results.push(rep);
  try {
    hold = { x: b.x, y: b.y };
    await sleep(SETTLE);
    const road = (map.roadsNear(b.x, b.y, 6) || []).find((q) => q.bridge && q.pts.length >= 2 && (!b.naam || b.naam === '-' || q.name === b.naam)) || (map.roadsNear(b.x, b.y, 6) || []).find((q) => q.bridge);
    if (!road) { rep.fout = 'brug niet gevonden'; continue; }
    const P = road.pts, a = P[0], e = P[P.length - 1], m = P[Math.floor(P.length / 2)];
    const ux = e[0] - a[0], uy = e[1] - a[1], L = Math.hypot(ux, uy) || 1, dx = ux / L, dy = uy / L, nx = -dy, ny = dx;
    const zs = road.z ? road.z : null, zm = zs ? zs[Math.floor(zs.length / 2)] : 0, za = zs ? zs[0] : 0;
    const gz = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
    Object.assign(rep, { lengte: Math.round(lenOf(road)), zMidden: +zm.toFixed(2), zBegin: +za.toFixed(2), beweegbaar: !!road.movable });
    const tag = `bq-${String(results.length).padStart(2, '0')}-${(b.naam || 'brug').replace(/[^\w]+/g, '_')}`;
    hold = { x: m[0], y: m[1] };
    await shot(`${tag}-1-naderen`, { position: { x: a[0] - dx * 45 + nx * 3, y: a[1] - dy * 45 + ny * 3, z: za + 4.5 }, lookAt: { x: m[0], y: m[1], z: zm }, cut: true });
    await shot(`${tag}-2-op`, { position: { x: m[0] - dx * 14, y: m[1] - dy * 14, z: zm + 3.2 }, lookAt: { x: m[0] + dx * 40, y: m[1] + dy * 40, z: zm }, cut: true });
    await shot(`${tag}-3-onder`, { position: { x: m[0] + nx * 16, y: m[1] + ny * 16, z: Math.max(gz(m[0] + nx * 16, m[1] + ny * 16), 0) + 1.4 }, lookAt: { x: m[0], y: m[1], z: Math.max(zm - 0.6, 1.5) }, cut: true });
    const mb = MB.getMovableBridges().find((q) => q.r === road);
    if (mb) {
      if (p.inVehicle) p.exitVehicle(map, w);
      hold = null;
      p.x = mb.x - mb.uy * (mb.half + 6); p.y = mb.y + mb.ux * (mb.half + 6);
      const side = { x: m[0] + nx * 30, y: m[1] + ny * 30, z: 9 };
      await shot(`${tag}-4-dicht`, { position: side, lookAt: { x: m[0], y: m[1], z: zm + 1 }, cut: true });
      MB.requestOpening(mb, null, true, false);
      const t1 = performance.now();
      while (performance.now() - t1 < 90000 && mb.state !== 'open') await sleep(300);
      rep.open = mb.state === 'open';
      await sleep(1200);
      await shot(`${tag}-5-open`, { position: side, lookAt: { x: m[0], y: m[1], z: zm + 2 }, cut: true });
      const t2 = performance.now();
      while (performance.now() - t2 < 90000 && mb.state !== 'closed') await sleep(300);
      rep.dichtGegaan = mb.state === 'closed';
    }
  } catch (err) { rep.fout = String(err && err.stack || err).slice(0, 300); }
}
hold = null; done = true;
clearInterval(skipper);
return JSON.stringify({ bruggen: results, fouten: issues.slice(0, 20) });
