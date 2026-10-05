// Routes into, out of and across the Ommeland (routing.js + countryroute.js):
// the story's routes (carbid at boer Roelf's, Rotor Roelf on Eelde, back to
// a padel court), then a sweep of start/target pairs - city, real Ommeland
// roads, fields beside them and the polder grid past the real data - that
// measures how much of each route is off any road, the longest off-road
// stretch, dead ends (no route, or one that stops short) and compute time,
// plus rerouting after leaving the route.
//   node scripts/country_route_test.mjs [--verbose]
import './node3d.mjs';
import fs from 'node:fs';

const VERBOSE = process.argv.includes('--verbose');
const DEBUG = process.argv.includes('--debug');
const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
const F = await import('../game/js/countryfield.js');
const R = await import('../game/js/routing.js');
const root = new URL('../game/', import.meta.url);
const data = JSON.parse(fs.readFileSync(new URL('citymap.json', root)));
applyMapExtras(data, JSON.parse(fs.readFileSync(new URL('mapextras.json', root))));
const map = new GameMap(data);
const om = JSON.parse(fs.readFileSync(new URL('ommeland.json', root)));
const pairs = (p) => { const o = []; for (let i = 0; i < p.length; i += 2) o.push([p[i], p[i + 1]]); return o; };
// the bits of countryreal.js REAL that routing reads, and its real-data zone
map.ommeland = { ready: true, ext: om.extent, roads: om.roads.map((r, id) => ({ id, pts: pairs(r.p), cycle: !!r.c, oneway: !!r.o, bridge: !!r.b, kind: r.k, name: r.n || '' })) };
{
  const [x0, y0, x1, y1] = om.extent, B = F.BLOCK, g = { x0: 0, y0: 0, cell: 1, w: 1, h: 1, data: new Uint8Array(1) };
  F.setRealZone({ bx0: Math.ceil(x0 / B - 0.5), by0: Math.ceil(y0 / B - 0.5), bx1: Math.floor(x1 / B - 0.5), by1: Math.floor(y1 / B - 0.5), water: g, urban: g });
}

// ---- distance to the nearest road of any kind (city, real Ommeland, polder grid)
const RC = 100, rgrid = new Map();
for (const r of map.ommeland.roads) {
  if (r.cycle) continue;
  for (let i = 0; i < r.pts.length - 1; i++) {
    const [a, b] = [r.pts[i], r.pts[i + 1]];
    for (let cx = Math.floor(Math.min(a[0], b[0]) / RC); cx <= Math.floor(Math.max(a[0], b[0]) / RC); cx++) {
      for (let cy = Math.floor(Math.min(a[1], b[1]) / RC); cy <= Math.floor(Math.max(a[1], b[1]) / RC); cy++) {
        const k = cx * 100003 + cy;
        if (!rgrid.has(k)) rgrid.set(k, []);
        rgrid.get(k).push(a[0], a[1], b[0], b[1]);
      }
    }
  }
}
const segD = (x, y, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  let t = l2 > 1e-9 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(ax + dx * t - x, ay + dy * t - y);
};
const C = F.ROAD_IN + F.ROAD_W / 2;
function roadDist(x, y, cap = 60) {
  let d = cap;
  for (const r of map.roadsNear(x, y, cap)) {
    for (let i = 0; i < r.pts.length - 1; i++) d = Math.min(d, segD(x, y, r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1]));
  }
  const cx = Math.floor(x / RC), cy = Math.floor(y / RC);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const s = rgrid.get((cx + i) * 100003 + cy + j);
    if (s) for (let k = 0; k < s.length; k += 4) d = Math.min(d, segD(x, y, s[k], s[k + 1], s[k + 2], s[k + 3]));
  }
  const B = F.BLOCK, bx = Math.floor(x / B), by = Math.floor(y / B);
  for (let i = bx - 1; i <= bx + 1; i++) for (let j = by - 1; j <= by + 1; j++) {
    if (F.edgeRoad(i, j, 0)) d = Math.min(d, segD(x, y, i * B + C, j * B, i * B + C, (j + 1) * B));
    if (F.edgeRoad(i, j, 1)) d = Math.min(d, segD(x, y, i * B, j * B + C, (i + 1) * B, j * B + C));
  }
  return d;
}

// off-road metres of a polyline (samples every 4 m > OFF_M from any road),
// and the longest unbroken off-road stretch
const OFF_M = 8;
function offroad(pts) {
  let off = 0, run = 0, longest = 0, runAt = null;
  const runs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, b] = [pts[i], pts[i + 1]];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 4));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
      if (roadDist(x, y) > OFF_M) { if (!run) runAt = [x, y]; off += L / n; run += L / n; longest = Math.max(longest, run); } else { if (run > 50) runs.push(`${Math.round(run)} m from [${runAt.map(Math.round)}] to [${Math.round(x)},${Math.round(y)}]`); run = 0; }
    }
  }
  if (run > 50) runs.push(`${Math.round(run)} m from [${runAt.map(Math.round)}] to the end`);
  return { off, longest, runs };
}

// ---- the story's routes (as before)
const padel = map.meta.padel[0];
const STORY = [
  ['centre -> carbid (Beijumerweg)', [0, 0], [1748, -3972]],
  ['centre -> Rotor Roelf, Eelde', [0, 0], [1606, 9909]],
  ['carbid -> padel in town', [1748, -3972], [padel.x, padel.y]],
  ['Eelde -> Martinitoren', [1599, 9914], [0, 0]],
];
let fails = 0;
let clock = 0;
const realNow = performance.now.bind(performance);
performance.now = () => realNow() + clock * 1000;
const worldAt = (px, py, tx, ty, name, inVehicle) => ({ map, time: 0, health: 100, player: { x: px, y: py, inVehicle }, storyGuide: { x: tx, y: ty, name, step: 'x' }, addMessage: () => {} });
const DRIVE = { isBike: false, isBoat: false };
for (const [name, [px, py], [tx, ty]] of STORY) {
  for (const inVehicle of [null, DRIVE]) {
    const t0 = realNow();
    R.updateRouting(0.1, worldAt(px, py, tx, ty, name, inVehicle));
    const r = R.getActiveRoute();
    const ok = !!r && r.pts.length > 2 && Math.hypot(r.pts.at(-1)[0] - tx, r.pts.at(-1)[1] - ty) < 150 && r.length < Math.hypot(tx - px, ty - py) * 2.2;
    if (!ok) fails++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} (${inVehicle ? 'drive' : 'walk'}): ${r ? r.pts.length + ' pts, ' + Math.round(r.length) + ' m' : 'no route'} in ${Math.round(realNow() - t0)} ms`);
  }
}

// ---- the sweep
let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
const E = om.extent, MB = map.meta.bounds;
const realRoads = map.ommeland.roads.filter((r) => !r.cycle);
const onReal = () => {
  for (;;) {
    const r = realRoads[Math.floor(rnd() * realRoads.length)], p = r.pts[Math.floor(rnd() * r.pts.length)];
    if (p[0] < MB[0] - 800 || p[0] > MB[2] + 800 || p[1] < MB[1] - 800 || p[1] > MB[3] + 800) return p;
  }
};
const inField = () => { for (;;) { const p = onReal(), a = rnd() * 6.283, q = [p[0] + Math.cos(a) * 120, p[1] + Math.sin(a) * 120]; if (roadDist(q[0], q[1]) > 40) return q; } };
const inCity = () => { const r = map.roads[Math.floor(rnd() * map.roads.length)]; return r.pts[0]; };
// past the real data: on a polder road (or in a field) a few km outside the extent
const polder = (field) => {
  for (;;) {
    const side = Math.floor(rnd() * 4), u = rnd(), out = 400 + rnd() * 3000;
    const x = side === 0 ? E[0] - out : side === 1 ? E[2] + out : E[0] + (E[2] - E[0]) * u;
    const y = side === 2 ? E[1] - out : side === 3 ? E[3] + out : E[1] + (E[3] - E[1]) * u;
    if (field) { if (roadDist(x, y) > 40) return [x, y]; continue; }
    const B = F.BLOCK, bx = Math.floor(x / B), by = Math.floor(y / B);
    if (F.edgeRoad(bx, by, 0)) return [bx * B + C, y];
    if (F.edgeRoad(bx, by, 1)) return [x, by * B + C];
  }
};
const KINDS = {
  'city->omme': () => [inCity(), onReal()],
  'omme->city': () => [onReal(), inCity()],
  'omme->omme': () => [onReal(), onReal()],
  'field->omme': () => [inField(), onReal()],
  'omme->field': () => [onReal(), inField()],
  'city->polder': () => [inCity(), polder(false)],
  'polder->city': () => [polder(false), inCity()],
  'omme->polder': () => [onReal(), polder(false)],
  'polder->polder': () => [polder(false), polder(false)],
  'pfield->omme': () => [polder(true), onReal()],
};
const PER = 8;
const tot = { n: 0, len: 0, off: 0, excess: 0, longest: 0, dead: 0, maxMs: 0, sumMs: 0, rerouteBad: 0 };
const rows = [];
for (const [kind, gen] of Object.entries(KINDS)) {
  const k = { n: 0, len: 0, off: 0, excess: 0, longest: 0, dead: 0, maxMs: 0 };
  for (let i = 0; i < PER; i++) {
    const [[px, py], [tx, ty]] = gen();
    const inVehicle = i % 2 ? DRIVE : null;
    const name = `${kind} #${i}`;
    clock += 100;
    const t0 = realNow();
    const w = worldAt(px, py, tx, ty, name, inVehicle);
    R.updateRouting(0.1, w);
    const ms = realNow() - t0;
    const r = R.getActiveRoute();
    const endGap = r ? Math.hypot(r.pts.at(-1)[0] - tx, r.pts.at(-1)[1] - ty) : Infinity;
    const startGap = r ? Math.hypot(r.pts[0][0] - px, r.pts[0][1] - py) : Infinity;
    // unavoidable: from the start / to the target onto the nearest road
    const own = Math.min(roadDist(px, py, 500), 500) + Math.min(roadDist(tx, ty, 500), 500);
    const dead = !r || r.pts.length < 2 || endGap > Math.max(60, roadDist(tx, ty, 500) + 20) || startGap > Math.max(60, roadDist(px, py, 500) + 20);
    const o = r && r.pts.length > 1 ? offroad(r.pts) : { off: 0, longest: 0 };
    const excess = Math.max(0, o.off - own);
    // leave the route: 200 m sideways from a point a third of the way along
    let reroute = '';
    if (r && r.pts.length > 3 && !dead) {
      const j = Math.floor(r.pts.length / 3), a = r.pts[j], b = r.pts[j + 1];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      w.player.x = a[0] - ((b[1] - a[1]) / L) * 200; w.player.y = a[1] + ((b[0] - a[0]) / L) * 200;
      clock += 3;
      R.updateRouting(0.1, w);
      const r2 = R.getActiveRoute();
      const o2 = r2 && r2.pts.length > 1 ? offroad(r2.pts) : null;
      const own2 = Math.min(roadDist(w.player.x, w.player.y, 500), 500) + Math.min(roadDist(tx, ty, 500), 500);
      const bad = !r2 || r2 === r || r2.pts.length < 2 || Math.hypot(r2.pts.at(-1)[0] - tx, r2.pts.at(-1)[1] - ty) > Math.max(60, roadDist(tx, ty, 500) + 20) || o2.off - own2 > excess + 50;
      if (bad) tot.rerouteBad++;
      reroute = bad ? ' REROUTE-BAD' : '';
    }
    k.n++; k.len += r ? r.length : 0; k.off += o.off; k.excess += excess; k.longest = Math.max(k.longest, o.longest); k.dead += dead ? 1 : 0; k.maxMs = Math.max(k.maxMs, ms);
    tot.sumMs += ms;
    if (VERBOSE || dead || excess > 50 || reroute) console.log(`  ${dead ? 'DEAD' : excess > 50 ? 'OFF ' : '    '} ${name} ${inVehicle ? 'drive' : 'walk'} [${Math.round(px)},${Math.round(py)}]->[${Math.round(tx)},${Math.round(ty)}]: ${r ? Math.round(r.length) : '-'} m, off ${Math.round(o.off)} m (own ${Math.round(own)}), longest ${Math.round(o.longest)} m, ${Math.round(ms)} ms${reroute}`);
    if (DEBUG && o.runs) for (const t of o.runs) console.log('      off-road ' + t);
  }
  rows.push([kind, k]);
  for (const f of ['n', 'len', 'off', 'excess', 'dead']) tot[f] += k[f];
  tot.longest = Math.max(tot.longest, k.longest); tot.maxMs = Math.max(tot.maxMs, k.maxMs);
}
console.log('\nkind            routes  km    off%  excess%  longest-off  dead  max-ms');
for (const [kind, k] of [...rows, ['TOTAL', tot]]) {
  console.log(`${kind.padEnd(15)} ${String(k.n).padStart(6)} ${(k.len / 1000).toFixed(1).padStart(5)} ${(100 * k.off / (k.len || 1)).toFixed(1).padStart(6)} ${(100 * k.excess / (k.len || 1)).toFixed(1).padStart(7)} ${String(Math.round(k.longest)).padStart(10)} m ${String(k.dead).padStart(5)} ${String(Math.round(k.maxMs)).padStart(7)}`);
}
console.log(`avg ${Math.round(tot.sumMs / tot.n)} ms per route, reroutes bad: ${tot.rerouteBad}`);
// Past the real data the polder roads come in patches between the ditches
// (each block edge has a road half the time): a route there may have to cross
// a field to the next patch. On the real roads it should never have to.
const realKinds = rows.filter(([kind]) => !kind.includes('polder') && kind !== 'pfield->omme');
const realExcess = realKinds.reduce((a, [, k]) => a + k.excess, 0) / realKinds.reduce((a, [, k]) => a + k.len, 0);
console.log(`real-data routes: ${(100 * realExcess).toFixed(2)}% off road beyond the legs to/from a field`);
const okSweep = tot.dead === 0 && realExcess < 0.002 && tot.excess / tot.len < 0.015 && tot.rerouteBad === 0;
if (!okSweep) fails++;
console.log(okSweep ? 'sweep ok' : 'sweep FAIL');

// ---- drive every Ommeland road: the GPS must keep its route
// Each real road is driven from its start in the direction the route takes
// (both directions when it leaves the road at once), 20 m/s in 0.5 s steps,
// for up to 300 m. The route has to start at the car (not at some city street
// 100 m away), exist, stay within STRAY_M of the car and never be recomputed
// while the car follows it. Roads the graph doesn't contain at all (a piece
// the router stitched on across a field) are listed as such.
// a sample of the polder grid past the real data drawn by the ground shader (countryfield.js edgeRoad)
const polderRoads = [];
for (let n = 0; polderRoads.length < 400 && n < 100000; n++) {
  const side = Math.floor(rnd() * 4), u = rnd(), out = 300 + rnd() * 4000;
  const x = side === 0 ? E[0] - out : side === 1 ? E[2] + out : E[0] + (E[2] - E[0]) * u;
  const y = side === 2 ? E[1] - out : side === 3 ? E[3] + out : E[1] + (E[3] - E[1]) * u;
  const B = F.BLOCK, bx = Math.floor(x / B), by = Math.floor(y / B);
  for (const s of [0, 1]) if (F.edgeRoad(bx, by, s)) polderRoads.push({ id: 100000 + polderRoads.length, kind: 'polder', name: 'polder', pts: s ? [[bx * B + C, by * B + C], [bx * B + C + B, by * B + C]] : [[bx * B + C, by * B + C], [bx * B + C, by * B + C + B]] });
}
const ROADS = process.argv.includes('--no-roads') ? [] : [...realRoads, ...polderRoads];
const FAR = [[1606, 9909], [0, 0], [-9000, -7000]];
const roadFails = [];
let driven = 0, notInGraph = 0;
const clockStep = (s) => { clock += s; };
const nearestEdgeD = (x, y) => { const s = C2.snapCountry(x, y, 60); return s ? s.d : Infinity; };
const C2 = await import('../game/js/countryroute.js');
function along(pts, d) {
  for (let i = 0; i < pts.length - 1; i++) {
    const L = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    if (d <= L || i === pts.length - 2) { const t = L > 1e-9 ? Math.min(1, d / L) : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t, Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0])]; }
    d -= L;
  }
  return [pts[0][0], pts[0][1], 0];
}
function routeAhead(r, m) {
  let [x, y] = [r.px, r.py];
  for (let i = r.idx + 1; i < r.pts.length && m > 0; i++) {
    const q = r.pts[i], l = Math.hypot(q[0] - x, q[1] - y);
    if (l >= m) return [x + (q[0] - x) * m / l, y + (q[1] - y) * m / l];
    m -= l; x = q[0]; y = q[1];
  }
  return [x, y];
}
const polyLen = (pts) => { let l = 0; for (let i = 0; i < pts.length - 1; i++) l += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); return l; };
for (const road of ROADS) {
  if (process.env.ROAD && +process.env.ROAD !== road.id) continue;
  const L = polyLen(road.pts);
  if (L < 40) continue;
  const [tx, ty] = FAR[road.id % FAR.length];
  const inGraph = (() => { for (const f of [0.1, 0.5, 0.9]) { const [x, y] = along(road.pts, L * f); if (nearestEdgeD(x, y) > 3) return false; } return true; })();
  const dirs = [road.pts, road.pts.slice().reverse()];
  for (let di = 0; di < 2; di++) {
    const pts = dirs[di];
    const [x0, y0] = along(pts, 0);
    const w = worldAt(x0, y0, tx, ty, 'road ' + road.id, DRIVE);
    R.updateRouting(0.1, { ...w, storyGuide: null });
    clockStep(10);
    R.updateRouting(0.1, w);
    clockStep(2.5);
    R.updateRouting(0.1, w);
    let r = R.getActiveRoute();
    if (!r) { roadFails.push([road, di, 'no route', inGraph]); continue; }
    if (r.pts.length < 2) { roadFails.push([road, di, 'empty route', inGraph]); continue; }
    // does the route take this direction? (its first leg ahead of the car)
    const [ax, ay, ah] = along(pts, 25);
    const ahead = r.pts.findIndex((q) => Math.hypot(q[0] - x0, q[1] - y0) > 12);
    const goes = ahead > 0 && Math.hypot(r.pts[ahead][0] - ax, r.pts[ahead][1] - ay) < 14;
    if (di === 1 && !goes && roadFails.length && roadFails.at(-1)[0] === road) { /* already reported */ }
    const maxD = Math.min(L, 300);
    let reroutes = 0, worst = 0, offRun = 0, startGap = Math.hypot(r.pts[0][0] - x0, r.pts[0][1] - y0), why = '';
    if (startGap > 20) why = `route starts ${Math.round(startGap)} m from the car`;
    driven++;
    const r0 = r;
    for (let d = 10; d <= maxD && !why; d += 10) {
      const [x, y] = along(pts, d);
      w.player.x = x; w.player.y = y;
      clockStep(0.5);
      R.updateRouting(0.5, w);
      const rr = R.getActiveRoute();
      if (!rr || rr.pts.length < 2) { why = `route lost after ${Math.round(d)} m`; break; }
      if (rr !== r) {
        // a new route while following the road: fine only when the old one left it (a junction ahead)
        const [ox, oy] = routeAhead(r, 25), [wx, wy] = along(pts, Math.min(L, d + 25));
        if (Math.hypot(ox - wx, oy - wy) < 8) reroutes++;
        r = rr;
        const gap = Math.hypot(rr.pts[0][0] - x, rr.pts[0][1] - y);
        if (goes && gap > 20) { why = `new route starts ${Math.round(gap)} m from the car at ${Math.round(d)} m`; break; }
      }
      if (process.env.ROAD) console.log(`d ${d} car [${Math.round(x)},${Math.round(y)}] off ${rr.off.toFixed(1)} idx ${rr.idx} pts ${rr.pts.length} same ${rr === r} goes ${goes}`);
      worst = Math.max(worst, rr.off);
      // the GPS may need its 2 s to see a missed turn; staying lost for 4 s is a failure
      offRun = rr.off > 25 ? offRun + 1 : 0;
      if (goes && offRun >= 8) { why = `${Math.round(rr.off)} m off the route for 4 s at ${Math.round(d)} m`; break; }
    }
    if (!why && goes && reroutes > 0) why = `${reroutes} reroute(s) while following the route's own road`;
    if (why) roadFails.push([road, di, why, inGraph]);
    if (goes) break;
  }
  if (!inGraph) notInGraph++;
}
const failIds = new Map();
for (const [road, di, why, inGraph] of roadFails) { if (!failIds.has(road.id)) failIds.set(road.id, { road, whys: [], inGraph }); failIds.get(road.id).whys.push(`dir ${di}: ${why}`); }
console.log(`\nroad drive: ${driven} drives over ${ROADS.length} roads, ${failIds.size} roads fail, ${notInGraph} roads not in the route graph`);
let shown = 0;
for (const { road, whys, inGraph } of failIds.values()) {
  if (shown++ < (VERBOSE ? 400 : 25)) console.log(`  road ${road.id} kind ${road.kind} "${road.name}" [${road.pts[0].map(Math.round)}] ${inGraph ? '' : '(not in graph) '}${whys.join('; ')}`);
}
if (failIds.size) fails++;
process.exit(fails ? 1 : 0);
