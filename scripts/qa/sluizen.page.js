// Page half of scripts/qa/sluizen_run.mjs (desktop --perf-script body, #236): een sloep vaart
// door een paar sluizen (vanaf de dichte kant, zodat hij moet wachten op groen), met een log
// per halve seconde en screenshots van rood/wachten, deur open, schutten en uitvaren.
// window.__sl = { only, settle, maxT } staat ervoor. Elke keydown wordt gevolgd door een keyup.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
// de harnas drukt één keer Enter; op een drukke machine is het titelscherm dan nog niet klaar: zelf starten
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
const SETTLE = (window.__sl && window.__sl.settle) || 9000;
const MAXT = (window.__sl && window.__sl.maxT) || 240;
const ONLY = ((window.__sl && window.__sl.only) || '').split('|').filter(Boolean);
const issues = [];
const note = (m) => issues.push(String(m).slice(0, 240));
const origErr = console.error.bind(console);
console.error = (...a) => { note('console.error: ' + a.map(String).join(' ')); origErr(...a); };
window.addEventListener('error', (e) => note('error: ' + e.message));

const cine = await imp('cinematics');
const DN = await imp('daynight');
const VH = await imp('vehicle');
const BT = await imp('boattypes');
const WL = await imp('waterlevels');
const UT = await imp('util');
const SL = await imp('sluizen');

const skipper = setInterval(() => { if (!window.__slShot && cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const key = (type, k, code) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(type, { key: k, code: code || k, bubbles: true })); };
const teleport = (x, y) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0;
  p.gz = map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0;
};
const fixWorld = () => {
  w.clock = 14;
  w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
  if (DN.refreshDayNight) DN.refreshDayNight(w);
};
let holdPos = null, done = false;
const tick = () => { if (holdPos) { p.x = holdPos.x; p.y = holdPos.y; p.vx = p.vy = 0; } if (!done) requestAnimationFrame(tick); };
requestAnimationFrame(tick);
const shot = async (name, pose) => {
  window.__slShot = true;
  cine.playCinematic({ id: 'sl-view', duration: 60, priority: 9, shot: () => pose });
  await sleep(1800);
  console.log('[capture] ' + name);
  await sleep(500);
  cine.skipCinematic();
  window.__slShot = false;
  await sleep(300);
};

const results = {};
await sleep(4000);
const all = SL.getSluizen();
const want = [
  { id: 'lauwersoog', re: /Robbengat/, side: 1 },
  { id: 'lauwersoog-heen', re: /Robbengat/, side: 0 },
  { id: 'delfzijl', re: /^Zeesluis$/, side: 1 },
  { id: 'dorkwerder', re: /Dorkwerder/, side: 1 },
  { id: 'zoutkamp', re: /Lammerburen/, side: 1 },
].filter((q) => !ONLY.length || ONLY.includes(q.id));
results.aantalSluizen = all.length;

for (const q of want) {
  const k = all.find((s) => q.re.test(s.name));
  if (!k) { results[q.id] = { fout: 'sluis niet gevonden' }; continue; }
  const c = Math.cos(k.a), s = Math.sin(k.a), dir = q.side ? -1 : 1;
  const start = { x: k.x - dir * c * (k.half + 55), y: k.y - dir * s * (k.half + 55) };
  const aim = dir > 0 ? k.a : k.a + Math.PI;
  const log = [], shots = new Set();
  try {
    fixWorld();
    teleport(start.x, start.y);
    holdPos = { x: start.x, y: start.y };
    await sleep(SETTLE);
    // de sluis begint in rust; de proef is de eerste doorvaart
    await shot(q.id + '-0-boven', { position: { x: k.x + 1, y: k.y + 1, z: 90 }, lookAt: { x: k.x, y: k.y, z: 0 }, cut: true });
    const wa = WL.waterAt(map, start.x, start.y);
    const model = { ...BT.BOAT_KINDS.sloep };
    const b = new VH.Vehicle(start.x, start.y, aim, model);
    b.isBoat = true; b.speed = 0; w.vehicles.push(b);
    holdPos = null;
    p.enterVehicle(b, w);
    await sleep(600);
    const t0 = performance.now();
    key('keydown', 'w', 'KeyW');
    let blockedFrames = 0, exited = false, minLift = 0, maxLift = 0, phases = [];
    // een lichte stuurhulp: de boot blijft op de as (de proef gaat over de sluis, niet over het sturen)
    const assist = setInterval(() => {
      const f = SL.frameOf(k, b.x, b.y);
      if (Math.abs(f.u) < k.half + 80) { const want = aim - dir * Math.max(-0.7, Math.min(0.7, f.lat * 0.06)); const d = Math.atan2(Math.sin(want - b.angle), Math.cos(want - b.angle)); b.angle += d * 0.2; }
    }, 50);
    const sideOfBoat = () => (SL.frameOf(k, b.x, b.y).u < 0 ? 0 : 1);
    for (let t = 0; t < MAXT; t += 0.5) {
      await sleep(500);
      const f = SL.frameOf(k, b.x, b.y), lift = SL.liftOf(k);
      minLift = Math.min(minLift, lift); maxLift = Math.max(maxLift, lift);
      if (!phases.length || phases[phases.length - 1] !== k.state) phases.push(k.state);
      log.push([+t.toFixed(1), k.state, k.gate.map((g) => +g.toFixed(2)), k.sig.join('/'), Math.round(f.u), +(b.speed || 0).toFixed(1), +lift.toFixed(2), k.queue.length, +f.lat.toFixed(1), +((b.angle - aim + 3 * Math.PI) % (2 * Math.PI) - Math.PI).toFixed(2), UT.boatDryPoints(map, b, b.x, b.y, b.angle), UT.boatDryPoints(map, b, b.x + Math.cos(b.angle) * 1.2, b.y + Math.sin(b.angle) * 1.2, b.angle), SL.lockGateStop(b, b.x - Math.cos(b.angle) * 0.6, b.y - Math.sin(b.angle) * 0.6, b.angle) ? 1 : 0, (() => { const wf = WL.waterAt(map, b.x + Math.cos(b.angle) * 4, b.y + Math.sin(b.angle) * 4); return wf ? wf.kind + ':' + (wf.lock ? 'L' : '') : 'DROOG'; })(), Math.round(b.x), Math.round(b.y)]);
      const centre = { x: k.x, y: k.y };
      const nx = -s, ny = c;
      const pose = { position: { x: k.x + nx * 28 - dir * c * 10, y: k.y + ny * 28 - dir * s * 10, z: 11 }, lookAt: { x: k.x, y: k.y, z: 1 }, cut: true };
      if (!shots.has('rood') && b.speed < 0.3 && t > 4 && k.sig[sideOfBoat()] === 'red' && Math.abs(f.u) > k.half) { shots.add('rood'); await shot(q.id + '-1-wacht-rood', pose); }
      else if (!shots.has('deuropen') && k.sig[q.side] === 'green' && t > 6) { shots.add('deuropen'); await shot(q.id + '-2-groen-deur-open', pose); }
      else if (!shots.has('schutten') && k.state === 'levelling' && SL.inChamber(k, b.x, b.y)) { shots.add('schutten'); await shot(q.id + '-3-schutten', pose); }
      else if (!shots.has('uit') && shots.has('schutten') && k.state === 'ready' && Math.abs(f.u) > k.half - 5 && sideOfBoat() !== q.side) { shots.add('uit'); await shot(q.id + '-4-uitvaren', pose); }
      if (!results.diag && t > 12 && b.speed < 0.3 && Math.abs(f.u) < k.half - 8 && k.gate[1] === 0 && k.gate[0] === 0) {
        // raster van de waterruimte rond de plek waar de boot stilstaat
        const WI = await imp('waterindex');
        const g = [];
        for (let du = 10; du >= -12; du -= 2) { const row = []; for (let lt = -6; lt <= 6; lt += 2) { const px = k.x + c * (f.u + du) - s * lt, py = k.y + s * (f.u + du) + c * lt; row.push(+WI.waterClearance(map, px, py, 6).toFixed(1)); } g.push([du, ...row]); }
        const rel = (px, py) => { const q = SL.frameOf(k, px, py); return [Math.round(q.u * 10) / 10, Math.round(q.lat * 10) / 10]; };
        const obs = map._waterObstacles ? map._waterObstacles.query(b.x - 12, b.y - 12, b.x + 12, b.y + 12) : [];
        const idx = WI.waterIndexAt(map, b.x, b.y), shore = [];
        idx.edgesIn(b.x - 10, b.y - 10, b.x + 10, b.y + 10, (i) => { if (idx.shore[i]) shore.push([rel(idx.ax[i], idx.ay[i]), rel(idx.bx[i], idx.by[i])]); });
        const cover = [];
        for (const uu of [8, 4, 2, 0, -2, -4, -8]) for (const lt of [-3, 0, 3]) { const px = k.x + c * uu - s * lt, py = k.y + s * uu + c * lt; cover.push([uu, lt, map.waterNear(px, py, 1).filter((w) => WL.pointInStaticPolygon(px, py, w.pts)).map((w) => (w.fix ? 'FIX' : '') + w.kind + (w.lock ? 'L' : '') + ':' + (w.name || '') + '#' + w.pts.length).join(' | ') || 'LEEG']); }
        results.dekking = cover;
        const stI = WI.getWaterIndex(map), tiI = WI.waterIndexAt(map, b.x, b.y), nearest = [];
        for (const [uu, lt] of [[2, 0], [0, 0], [-2, 0], [-4, -2]]) { const px = k.x + c * uu - s * lt, py = k.y + s * uu + c * lt; const row = { uu, lt, cl: +WI.waterClearance(map, px, py, 6).toFixed(2) }; for (const [nm, idx, other] of [['static', stI, tiI], ['tegel', tiI, stI]]) { const q = idx.nearestShore(px, py, 6); if (q.i < 0) { row[nm] = null; continue; } const ex = idx.bx[q.i] - idx.ax[q.i], ey = idx.by[q.i] - idx.ay[q.i], l2 = ex * ex + ey * ey || 1e-9; const t = Math.max(0, Math.min(1, ((px - idx.ax[q.i]) * ex + (py - idx.ay[q.i]) * ey) / l2)); const qx = idx.ax[q.i] + ex * t, qy = idx.ay[q.i] + ey * t, dx = qx - px, dy = qy - py, kk = Math.hypot(dx, dy) || 1; const bx2 = qx + dx / kk * 0.7, by2 = qy + dy / kk * 0.7; row[nm] = { d: +q.d.toFixed(2), a: rel(idx.ax[q.i], idx.ay[q.i]), b: rel(idx.bx[q.i], idx.by[q.i]), voorbij: rel(bx2, by2), anderWater: other === idx ? null : other.inWater(bx2, by2) }; } nearest.push(row); }
        results.dichtstbij = nearest; results.zelfde = stI === tiI;
        results.diagExtra = { obstakels: obs.map((o) => o.ring.map((q) => rel(q[0], q[1]))), kust: shore.slice(0, 30) };
        results.diag = { u: Math.round(f.u), lat: f.lat, kolom: 'lat -6..6 stap 2', rijen: g };
      }
      if (f.u * dir > k.half + 35) { exited = true; break; }
    }
    key('keyup', 'w', 'KeyW');
    clearInterval(assist);
    results[q.id] = { sluis: k.name, positie: [Math.round(k.x), Math.round(k.y)], peil: k.levels, boot: wa ? { water: wa.kind || null } : null, doorgekomen: exited, fasen: phases, minLift: +minLift.toFixed(2), maxLift: +maxLift.toFixed(2), screenshots: [...shots], log };
    if (p.inVehicle) p.exitVehicle(map, w);
    w.vehicles.splice(w.vehicles.indexOf(b), 1);
  } catch (e) { results[q.id] = { fout: String(e && e.stack || e).slice(0, 400), log }; key('keyup', 'w', 'KeyW'); }
}
results.fouten = issues.slice(0, 30);
done = true;
clearInterval(skipper);
return JSON.stringify(results);
