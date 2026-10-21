// Samples the trailer's ring race shot ("Ring Zuid. Laatste fase.") in Node
// at 60 fps, with the same path, pack and placement as trailer.js, and
// reports per car: heading snaps (deg per frame), sideslip (heading against
// the direction actually moved), speed surges, height off the road under
// the wheels, pitch against the road slope, and overlaps between the cars
// and the tractor.
//   node scripts/cine_ring_check.mjs [--old]   (--old: the pre-fix motion)
// Needs the vendored three.js once: cd desktop && npm run stage
import './node3d.mjs';
import fs from 'node:fs';

const OLD = process.argv.includes('--old');
const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
await import('../game/js/player.js');
const { ringViaduct, RING_PACK } = await import('../game/js/trailer.js');
const { cineDrive, groundPose } = await import('../game/js/cinedrive.js');
const { Vehicle, MODELS } = await import('../game/js/vehicle.js');
const { RING_ROUTE } = await import('../game/js/ringroute.js');

const root = new URL('../game/', import.meta.url);
const { loadCityData } = await import('./lib/loadworld.mjs');
const data = await loadCityData();
const map = new GameMap(data);

const ring = ringViaduct(map);
// the pre-fix path: straight segments, heading per segment
function polyline(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const len = cum[cum.length - 1];
  return { len, at(s) {
    s = Math.max(0, Math.min(len - 1e-3, s));
    let i = 1;
    while (i < cum.length - 1 && cum[i] < s) i++;
    const a = pts[i - 1], b = pts[i], t = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
    return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  } };
}
let path = ring.path;
if (OLD) {
  const zs = RING_ROUTE.map(([x, y]) => map.groundHeightAt(x, y, 40));
  let best = 0, bestZ = -1;
  for (let i = 0; i + 9 < RING_ROUTE.length; i++) { let lo = Infinity; for (let k = 0; k <= 9; k++) lo = Math.min(lo, zs[i + k]); if (lo > bestZ) { bestZ = lo; best = i; } }
  path = polyline(RING_ROUTE.slice(Math.max(0, best - 4), Math.min(RING_ROUTE.length, best + 15)));
}
const lane = (s, off) => { const q = path.at(s); return { x: q.x - Math.sin(q.a) * off, y: q.y + Math.cos(q.a) * off, a: q.a }; };

const k = Math.min(1, (ring.half - 1.2) / 3);
const pack = OLD
  ? { cars: [-2.8, 0, 2.8, -1.4, 1.4].map((o, i) => [o * k, [0, 5, 1.5, 10, 14][i]]), tractor: [-1.4 * k, 6.5], speed: 31, wobble: 0.6 }
  : { cars: RING_PACK.cars.map(([l, lag]) => [l * k * 2.8, lag]), tractor: [RING_PACK.tractor[0] * k * 2.8, RING_PACK.tractor[1]], speed: RING_PACK.speed, wobble: RING_PACK.wobble };
const cars = pack.cars.map(([off, lag], i) => {
  const v = new Vehicle(0, 0, 0, MODELS[(i * 3 + 1) % MODELS.length]);
  Object.assign(v, { driver: 'cine', cineTemp: true, road: null, z: 0 });
  return { off, lag, v, st: { maxTurn: 0, maxSlip: 0, maxSurge: 0, maxDz: 0, maxPitchErr: 0 } };
});
const TR = { len: 3.6, wid: 1.9 };
const tractor = { st: { maxTurn: 0, maxSlip: 0, maxSurge: 0, maxDz: 0, maxPitchErr: 0 } };

function obb(x, y, a, len, wid) {
  const c = Math.cos(a), s = Math.sin(a), hl = len / 2, hw = wid / 2;
  return [[hl, hw], [hl, -hw], [-hl, -hw], [-hl, hw]].map(([u, w]) => [x + c * u - s * w, y + s * u + c * w]);
}
function overlap(A, B) {
  for (const P of [A, B]) {
    for (let i = 0; i < 4; i++) {
      const p = P[i], q = P[(i + 1) % 4], nx = q[1] - p[1], ny = p[0] - q[0];
      const pa = A.map((v) => v[0] * nx + v[1] * ny), pb = B.map((v) => v[0] * nx + v[1] * ny);
      if (Math.max(...pa) < Math.min(...pb) || Math.max(...pb) < Math.min(...pa)) return false;
    }
  }
  return true;
}
// the road under the path: its height profile (cinedrive.js pathHeights)
// and the slope of that profile over the wheelbase
function track(st, prev, x, y, a, z, pitch, dt, speed, h, s) {
  st.maxDz = Math.max(st.maxDz, Math.abs(z - ring.zAt(s)));
  st.maxPitchErr = Math.max(st.maxPitchErr, Math.abs(pitch - Math.atan2(ring.zAt(s + h) - ring.zAt(s - h), 2 * h)));
  if (prev) {
    let da = a - prev.a;
    da = Math.abs(Math.atan2(Math.sin(da), Math.cos(da)));
    st.maxTurn = Math.max(st.maxTurn, da * 180 / Math.PI);
    const mx = x - prev.x, my = y - prev.y, m = Math.hypot(mx, my);
    if (m > 1e-6) {
      let slip = Math.atan2(my, mx) - a;
      slip = Math.abs(Math.atan2(Math.sin(slip), Math.cos(slip)));
      st.maxSlip = Math.max(st.maxSlip, slip * 180 / Math.PI);
    }
    st.maxSurge = Math.max(st.maxSurge, Math.abs(m / dt - speed));
  }
  return { x, y, a };
}

const dt = 1 / 60, DUR = 4.0;
let d = path.len * 0.25, overlaps = 0, sZ = null;
const prev = new Map();
const pairs = new Set();
for (let t = 0; t <= DUR; t += dt) {
  d += pack.speed * dt;
  const boxes = [];
  if (OLD) {
    const c0 = path.at(d);
    sZ = map.groundHeightAt(c0.x, c0.y, (sZ ?? ring.deck) + 0.5);
  }
  cars.forEach((c, i) => {
    const s = d - c.lag - Math.sin(t * 0.9 + c.lag) * pack.wobble;
    const q = lane(s, c.off);
    if (OLD) Object.assign(c.v, { x: q.x, y: q.y, angle: q.a, speed: pack.speed, z: sZ, pitch: 0 });
    else cineDrive(c.v, map, q, pack.speed, dt, ring.zAt(s));
    prev.set(i, track(c.st, prev.get(i), c.v.x, c.v.y, c.v.angle, c.v.z, c.v.pitch || 0, dt, pack.speed, Math.min(c.v.halfLen * 0.75, 2.4), s));
    boxes.push(obb(c.v.x, c.v.y, c.v.angle, c.v.model.len, c.v.model.wid));
  });
  const td = d - pack.tractor[1], tq = lane(td, pack.tractor[0]);
  const g = OLD ? { z: sZ, pitch: 0 } : groundPose(map, tq.x, tq.y, tq.a, ring.zAt(td), 1.1);
  prev.set('t', track(tractor.st, prev.get('t'), tq.x, tq.y, tq.a, g.z, g.pitch, dt, pack.speed, 1.1, td));
  boxes.push(obb(tq.x, tq.y, tq.a, TR.len, TR.wid));
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (overlap(boxes[i], boxes[j])) { overlaps++; pairs.add(`${i === 5 ? 'tractor' : 'car' + i}-${j === 5 ? 'tractor' : 'car' + j}`); }
}

console.log(`${OLD ? 'OLD' : 'NEW'} ring race, ${DUR}s at 60 fps, path ${path.len.toFixed(0)} m`);
console.log('who       turn/frame  sideslip  speed surge  off-road z  pitch err');
const row = (name, st) => console.log(`${name.padEnd(9)} ${st.maxTurn.toFixed(2).padStart(7)}°  ${st.maxSlip.toFixed(2).padStart(7)}°  ${st.maxSurge.toFixed(2).padStart(7)} m/s  ${st.maxDz.toFixed(2).padStart(7)} m  ${(st.maxPitchErr * 180 / Math.PI).toFixed(2).padStart(6)}°`);
cars.forEach((c, i) => row('car' + i, c.st));
row('tractor', tractor.st);
console.log(`overlapping frames: ${overlaps}${pairs.size ? ' (' + [...pairs].join(', ') + ')' : ''}`);
const bad = [...cars.map((c) => c.st), tractor.st].some((st) => st.maxTurn > 0.6 || st.maxSlip > 2 || st.maxDz > 0.15 || st.maxPitchErr > 0.05) || overlaps > 0;
console.log(bad ? 'FAIL' : 'ok');
process.exit(bad && !OLD ? 1 : 0);
