// Page half of the second round of scripts/qa/province_shots.mjs --ronde=2
// (desktop --perf-script body). window.__qa2 = { spots, settle } is put in front.
// Spot types:
//   rail   { x, y, a }       on the track (heading along it): ground shot, a high shot along the
//                            line and a long low shot (rail LOD, #158)
//   motor  { x, y }          the nearest motorway (road kind 1) to the hint: ground + high shot
//   zee    { x, y, R }       the coast point nearest to the hint (the province's coast chain, regions.js): a shot from 60 m
//                            inland looking out to sea, one from the shore at eye height over the water and a high one (#5, round 3)
//   knoop  { x, y }          a motorway junction (a motorway joined by another road) nearest to the hint: ground + high shot
//   plaats { x, y, a }       a place centre: street level and 40 m up, looking at it
//   water  { x, y, R }       the nearest navigable/any water to the hint within R m: shot from
//                            9 m up over the water, looking along the longest open stretch
// Then two play checks: a car (an existing traffic car near the Grote Markt) and a boat
// (a sloep on the first water spot), each driven with W held for DRIVE ms (synthetic
// keydown always followed by keyup). Reports distance covered and any errors.
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const sc = window.__scene3d;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const cine = await imp('cinematics');
const PM = await imp('pausemenu');
const DN = await imp('daynight');
const RG = await imp('roadgraph');
const WL = await imp('waterlevels');
const VH = await imp('vehicle');
const BT = await imp('boattypes');
const RGN = await imp('regions');
const SETTLE = window.__qa2.settle || 9000;
const DRIVE = window.__qa2.drive || 15000;
const ONLY = (window.__qa2.only || '').split(',').filter(Boolean);
let ownShot = false;
const skipper = setInterval(() => { if (!ownShot && cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const errors = [];
window.addEventListener('error', (e) => errors.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => errors.push('promise: ' + String(e.reason && e.reason.message || e.reason)));

const teleport = (x, y) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0;
  p.gz = map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0;
};
let hold = null, done = false, driving = false;
const tick = () => {
  if (PM.isPauseMenuOpen()) PM.closePauseMenu();
  D.input.mouse.y = innerHeight * 0.4;
  if (hold && !driving) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; p.angle = hold.a; w.camYaw = hold.a; w.clock = 14; }
  if (!done) requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
const fixWorld = () => {
  w.clock = 14;
  w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
  if (DN.refreshDayNight) DN.refreshDayNight(w);
};
const key = (type, k, code) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(type, { key: k, code, bubbles: true })); };
const shot = async (name, pose, wait = 2500) => {
  if (cine.isCinematicActive()) cine.skipCinematic();
  ownShot = true;
  cine.playCinematic({ id: 'qa-view', duration: 60, priority: 9, shot: () => pose });
  await sleep(wait);
  console.log('[capture] ' + name);
  await sleep(600);
  cine.skipCinematic();
  ownShot = false;
};
const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
const go = async (x, y, a, settle = SETTLE) => {
  fixWorld();
  teleport(x, y);
  hold = { x, y, a };
  await sleep(settle);
  fixWorld();
};

function nearestMotorway(hx, hy) {
  let best = null;
  for (const rd of RG.roadNetRows() || []) {
    if (rd.kind !== 1) continue;
    for (let i = 0; i < rd.pts.length - 1; i++) {
      const a = rd.pts[i], b = rd.pts[i + 1];
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 8) continue;
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, d = Math.hypot(mx - hx, my - hy);
      if (!best || d < best.d) best = { d, x: mx, y: my, a: Math.atan2(b[1] - a[1], b[0] - a[0]), w: rd.w };
    }
  }
  return best;
}

function findWater(hx, hy, R, navigable) {
  for (let r = 0; r <= R; r += 25) {
    const n = r === 0 ? 1 : Math.max(8, Math.round(r / 12));
    for (let k = 0; k < n; k++) {
      const t = (k / n) * Math.PI * 2, x = hx + Math.cos(t) * r, y = hy + Math.sin(t) * r;
      const wa = WL.waterAt(map, x, y);
      if (wa && (!navigable || wa.navigable) && wa.depth > 1.2) return { x, y, wa };
    }
  }
  return null;
}
// heading with the longest unbroken water run from (x, y)
function openDir(x, y) {
  let best = { run: -1, a: 0 };
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    let run = 0;
    for (let d = 10; d <= 800; d += 10) { if (!WL.waterAt(map, x + Math.cos(a) * d, y + Math.sin(a) * d)) break; run = d; }
    if (run > best.run) best = { run, a };
  }
  return best;
}

// a coast point near (hx, hy) with the seaward direction: probes 40 m to either side of the local tangent
function nearestShore(hx, hy, R) {
  const layer = RGN.regionEdgeLayer();
  const chains = layer ? layer.coast || (layer.edge && layer.edge.coast) || [] : []; // (regionEdgeLayer() is the edge layer itself: { coast, border, ... })
  let best = null;
  for (const c of chains) {
    const P = c.pts || c;
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i], b = P[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L < 1) continue;
      const n = Math.max(1, Math.ceil(L / 40));
      for (let s = 0; s <= n; s++) {
        const x = a[0] + (b[0] - a[0]) * s / n, y = a[1] + (b[1] - a[1]) * s / n, d = Math.hypot(x - hx, y - hy);
        if (d > R || (best && d >= best.d)) continue;
        const tx = (b[0] - a[0]) / L, ty = (b[1] - a[1]) / L;
        const p1 = RGN.seaAt(x - ty * 40, y + tx * 40), p2 = RGN.seaAt(x + ty * 40, y - tx * 40);
        if (!!p1 === !!p2) continue;
        best = { d, x, y, nx: p1 ? -ty : ty, ny: p1 ? tx : -tx };
      }
    }
  }
  return best;
}
// a motorway piece that another (lower) road starts or ends at within 14 m: a junction, nearest to the hint
function nearestJunction(hx, hy) {
  const rows = RG.roadNetRows() || [];
  const motor = rows.filter((r) => r.kind === 1), other = rows.filter((r) => r.kind !== 1);
  let best = null;
  for (const m of motor) for (let i = 0; i < m.pts.length - 1; i++) {
    const a = m.pts[i], b = m.pts[i + 1];
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, d = Math.hypot(mx - hx, my - hy);
    if (d > 6000 || (best && d >= best.d)) continue;
    let near = 0;
    for (const o of other) {
      if (!o.pts.length) continue;
      const e0 = o.pts[0], e1 = o.pts[o.pts.length - 1];
      if (Math.hypot(e0[0] - mx, e0[1] - my) < 14 || Math.hypot(e1[0] - mx, e1[1] - my) < 14) near++;
    }
    if (near) best = { d, x: mx, y: my, a: Math.atan2(b[1] - a[1], b[0] - a[0]), links: near };
  }
  return best;
}
const results = { spots: {}, play: {} };
let boatSpot = null, motorSpot = null;
for (const S of window.__qa2.spots) {
  if (ONLY.length && !ONLY.includes(S.name)) continue;
  const info = { type: S.type };
  try {
    if (S.type === 'rail') {
      await go(S.x, S.y, S.a, SETTLE * 0.6);
      await go(S.x, S.y, S.a);
      const c = Math.cos(S.a), s = Math.sin(S.a), gz = gh(S.x, S.y);
      info.at = [Math.round(S.x), Math.round(S.y)]; info.ground = gz;
      console.log('[capture] ' + S.name);
      await sleep(600);
      await shot(S.name + '-hoog', { position: { x: S.x - c * 25, y: S.y - s * 25, z: gz + 9 }, lookAt: { x: S.x + c * 60, y: S.y + s * 60, z: gz + 1 }, cut: true });
      await shot(S.name + '-lang', { position: { x: S.x - c * 12, y: S.y - s * 12, z: gz + 3.2 }, lookAt: { x: S.x + c * 400, y: S.y + s * 400, z: gz + 2 }, cut: true });
    } else if (S.type === 'motor') {
      await go(S.x, S.y, 0, SETTLE * 0.6);
      const m = nearestMotorway(S.x, S.y);
      if (!m) { info.error = 'geen weg met kind 1 in de buurt van de hint'; results.spots[S.name] = info; continue; }
      await go(m.x, m.y, m.a);
      const c = Math.cos(m.a), s = Math.sin(m.a), gz = gh(m.x, m.y);
      if (!motorSpot) motorSpot = { x: m.x, y: m.y, a: m.a };
      info.at = [Math.round(m.x), Math.round(m.y)]; info.hintDist = Math.round(m.d); info.ground = gz; info.width = m.w;
      console.log('[capture] ' + S.name);
      await sleep(600);
      await shot(S.name + '-hoog', { position: { x: m.x - c * 40, y: m.y - s * 40, z: gz + 14 }, lookAt: { x: m.x + c * 80, y: m.y + s * 80, z: gz + 1 }, cut: true });
    } else if (S.type === 'zee') {
      await go(S.x, S.y, 0, SETTLE * 0.6);
      const sh = nearestShore(S.x, S.y, S.R || 6000);
      if (!sh) { info.error = 'geen kustpunt binnen ' + (S.R || 6000) + ' m van de hint'; results.spots[S.name] = info; continue; }
      const ax = sh.x - sh.nx * 60, ay = sh.y - sh.ny * 60, ang = Math.atan2(sh.ny, sh.nx);
      await go(ax, ay, ang);
      const gz = gh(ax, ay);
      info.at = [Math.round(sh.x), Math.round(sh.y)]; info.hintDist = Math.round(sh.d); info.ground = gz;
      info.seaOut = [100, 300, 1000].map((d) => !!RGN.seaAt(sh.x + sh.nx * d, sh.y + sh.ny * d));
      info.waterAtShore = !!WL.waterAt(map, sh.x + sh.nx * 20, sh.y + sh.ny * 20);
      console.log('[capture] ' + S.name);
      await sleep(600);
      await shot(S.name + '-zee', { position: { x: ax, y: ay, z: gz + 2.4 }, lookAt: { x: sh.x + sh.nx * 300, y: sh.y + sh.ny * 300, z: Math.max(0, gz) + 0.5 }, cut: true });
      await shot(S.name + '-hoog', { position: { x: ax - sh.nx * 20, y: ay - sh.ny * 20, z: gz + 30 }, lookAt: { x: sh.x + sh.nx * 250, y: sh.y + sh.ny * 250, z: 0 }, cut: true });
    } else if (S.type === 'knoop') {
      await go(S.x, S.y, 0, SETTLE * 0.6);
      const j = nearestJunction(S.x, S.y);
      if (!j) { info.error = 'geen knooppunt in de buurt van de hint'; results.spots[S.name] = info; continue; }
      await go(j.x, j.y, j.a);
      const c = Math.cos(j.a), s = Math.sin(j.a), gz = gh(j.x, j.y);
      info.at = [Math.round(j.x), Math.round(j.y)]; info.hintDist = Math.round(j.d); info.links = j.links; info.ground = gz;
      console.log('[capture] ' + S.name);
      await sleep(600);
      await shot(S.name + '-hoog', { position: { x: j.x - c * 30, y: j.y - s * 30, z: gz + 30 }, lookAt: { x: j.x + c * 20, y: j.y + s * 20, z: gz }, cut: true });
      await shot(S.name + '-lang', { position: { x: j.x - c * 25, y: j.y - s * 25, z: gz + 4 }, lookAt: { x: j.x + c * 200, y: j.y + s * 200, z: gz + 1.5 }, cut: true });
    } else if (S.type === 'plaats') {
      await go(S.x, S.y, S.a || 0, SETTLE * 0.6);
      const sp = map.nearestRoadPoint ? map.nearestRoadPoint(S.x, S.y, S.snapR || 300, true) : null;
      const x = sp ? sp.x : S.x, y = sp ? sp.y : S.y, a = S.a || 0;
      await go(x, y, a);
      const gz = gh(x, y);
      info.at = [Math.round(x), Math.round(y)]; info.ground = gz;
      console.log('[capture] ' + S.name);
      await sleep(600);
      await shot(S.name + '-hoog', { position: { x: x - Math.cos(a) * 40, y: y - Math.sin(a) * 40, z: gz + 40 }, lookAt: { x, y, z: gz }, cut: true });
    } else if (S.type === 'water') {
      await go(S.x, S.y, 0, SETTLE * 0.6);
      const f = findWater(S.x, S.y, S.R || 1500, !!S.nav);
      if (!f) { info.error = 'geen water binnen ' + (S.R || 1500) + ' m van de hint'; results.spots[S.name] = info; continue; }
      const od = openDir(f.x, f.y);
      await go(f.x, f.y, od.a);
      const c = Math.cos(od.a), s = Math.sin(od.a);
      info.at = [Math.round(f.x), Math.round(f.y)]; info.hintDist = Math.round(Math.hypot(f.x - S.x, f.y - S.y)); info.water = { level: f.wa.level, depth: f.wa.depth, kind: f.wa.kind, navigable: f.wa.navigable }; info.openRun = od.run;
      if (!boatSpot && f.wa.navigable && od.run >= 80) boatSpot = { x: f.x, y: f.y, a: od.a, name: S.name };
      console.log('[capture] ' + S.name);
      await sleep(600);
      await shot(S.name + '-hoog', { position: { x: f.x - c * 30, y: f.y - s * 30, z: f.wa.level + 10 }, lookAt: { x: f.x + c * 200, y: f.y + s * 200, z: f.wa.level }, cut: true });
    }
  } catch (e) { info.error = String(e && e.stack || e).slice(0, 300); }
  results.spots[S.name] = info;
  console.log('[qa-spot] ' + S.name + ' ' + JSON.stringify(info));
}

// ---- play checks -----------------------------------------------------------------
async function hold_w(ms, sampler) {
  driving = true;
  key('keydown', 'w', 'KeyW');
  const out = [];
  const t0 = performance.now();
  try {
    while (performance.now() - t0 < ms) { await sleep(1000); out.push(sampler()); }
  } finally { key('keyup', 'w', 'KeyW'); }
  await sleep(500);
  driving = false;
  return out;
}
const err0 = () => errors.length;
if (!window.__qa2.noPlay && (!ONLY.length || ONLY.includes('speelcheck'))) {
  // car: a traffic car near the Grote Markt (world 201,45)
  try {
    hold = null;
    const e0 = err0();
    // on the motorway when a motorway spot was visited (a straight road), else near the Grote Markt
    const cs = motorSpot || { x: 160, y: 85, a: 0 };
    teleport(cs.x, cs.y);
    fixWorld();
    await sleep(SETTLE);
    const car = w.vehicles.filter((v) => !v.isBoat && !v.isBike && !v.isScooter && !v.isHeli && !v.dead && !v.isPolice && Math.hypot(v.x - p.x, v.y - p.y) < 200)
      .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    if (!car) results.play.auto = { error: 'geen auto binnen 200 m' };
    else {
      teleport(car.x, car.y);
      p.enterVehicle(car, w);
      await sleep(800);
      const start = [car.x, car.y];
      const trace = await hold_w(DRIVE, () => [Math.round(car.x), Math.round(car.y), +(car.speed || 0).toFixed(1)]);
      console.log('[capture] speelcheck-auto');
      await sleep(500);
      results.play.auto = { where: motorSpot ? 'snelweg' : 'Grote Markt', model: car.model && (car.model.name || car.model.kind), inVehicle: !!p.inVehicle, start: start.map(Math.round), end: [Math.round(car.x), Math.round(car.y)], dist: Math.round(Math.hypot(car.x - start[0], car.y - start[1])), trace, errors: errors.length - e0 };
      if (p.inVehicle) p.exitVehicle(map, w);
    }
  } catch (e) { results.play.auto = { error: String(e && e.stack || e).slice(0, 300) }; driving = false; key('keyup', 'w', 'KeyW'); }
  // boat
  try {
    if (!boatSpot) results.play.boot = { error: 'geen vaarwater gevonden bij de waterplekken' };
    else {
      const e0 = err0();
      hold = null;
      await go(boatSpot.x, boatSpot.y, boatSpot.a, SETTLE);
      hold = null;
      const model = { ...BT.BOAT_KINDS.sloep };
      const boat = new VH.Vehicle(boatSpot.x, boatSpot.y, boatSpot.a, model);
      boat.isBoat = true;
      w.vehicles.push(boat);
      p.swimming && p.leaveWater && p.leaveWater();
      p.enterVehicle(boat, w);
      await sleep(800);
      const start = [boat.x, boat.y];
      const trace = await hold_w(DRIVE, () => [Math.round(boat.x), Math.round(boat.y), +(boat.speed || 0).toFixed(1), !!WL.waterAt(map, boat.x, boat.y)]);
      console.log('[capture] speelcheck-boot');
      await sleep(500);
      results.play.boot = { spot: boatSpot.name, inVehicle: !!p.inVehicle, start: start.map(Math.round), end: [Math.round(boat.x), Math.round(boat.y)], dist: Math.round(Math.hypot(boat.x - start[0], boat.y - start[1])), onWater: !!WL.waterAt(map, boat.x, boat.y), trace, errors: errors.length - e0 };
      if (p.inVehicle) p.exitVehicle(map, w);
    }
  } catch (e) { results.play.boot = { error: String(e && e.stack || e).slice(0, 300) }; driving = false; key('keyup', 'w', 'KeyW'); }
}
results.errors = errors.slice(0, 40);
hold = null;
done = true;
clearInterval(skipper);
return JSON.stringify(results);
