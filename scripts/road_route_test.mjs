// Routes into, out of and across the province (routing.js + roadgraph.js):
// the story's routes (carbid at boer Roelf's, Rotor Roelf on Eelde, back to
// a padel court), then a sweep of start/target pairs - city, the tile roads,
// fields beside them - that measures how much of each route is off any road,
// the longest off-road stretch, dead ends (no route, or one that stops short)
// and compute time, plus rerouting after leaving the route, driving along
// roads without the GPS losing the way, and the one-ways. The roads are the
// province layer's road net (game/world/provincie-roads.json.gz, written by
// scripts/world/build_province.mjs).
//   node scripts/road_route_test.mjs [--verbose] [--drives=N]
import './node3d.mjs';
import fs from 'node:fs';
import zlib from 'node:zlib';

const VERBOSE = process.argv.includes('--verbose');
const DEBUG = process.argv.includes('--debug');
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? +a.slice(k.length + 3) : d; };
const root = new URL('../game/', import.meta.url);
const roadFile = new URL('world/provincie-roads.json.gz', root);
if (!fs.existsSync(roadFile)) { console.log('SKIP no game/world with the province road net (scripts/world/build_province.mjs)'); process.exit(0); }
import { loadCityWorld } from './lib/loadworld.mjs';
const R = await import('../game/js/routing.js');
const RG = await import('../game/js/roadgraph.js');
const map = (await loadCityWorld()).map;
const roadNet = RG.decodeRoadNet(JSON.parse(zlib.gunzipSync(fs.readFileSync(roadFile)).toString('utf8')));
RG.setRoadNet(roadNet);
const stats = RG.roadGraphStats();
console.log(`road net: ${roadNet.length} roads, ${stats.nodes} nodes (${stats.main} in the main network), built in ${stats.ms} ms`);

// ---- distance to the nearest road of any kind (city, the tile roads)
const RC = 100, rgrid = new Map();
for (const r of roadNet) {
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

// ---- the story's routes
const padel = map.meta.padel[0];
const STORY = [
  ['centre -> carbid (Beijumerweg)', [-0.84, 0.33], [1683.9, -4025.98]],
  ['centre -> Rotor Roelf, Eelde', [-0.84, 0.33], [1774.82, 9945.78]],
  ['carbid -> padel in town', [1683.9, -4025.98], [padel.x, padel.y]],
  ['Eelde -> Martinitoren', [1767.87, 9950.93], [-0.84, 0.33]],
  ['centre -> Delfzijl', [-0.84, 0.33], [31500, 2500]],
  ['centre -> Zuidhorn', [-0.84, 0.33], [-10732.8, -3017.02]],
];
let fails = 0;
let clock = 0;
const realNow = performance.now.bind(performance);
performance.now = () => realNow() + clock * 1000;
const worldAt = (px, py, tx, ty, name, inVehicle) => ({ map, time: 0, health: 100, player: { x: px, y: py, inVehicle }, storyGuide: { x: tx, y: ty, name, step: 'x' }, addMessage: () => {} });
const DRIVE = { isBike: false, isBoat: false };
const BIKE = { isBike: true, isBoat: false };
for (const [name, [px, py], [tx, ty]] of STORY) {
  for (const inVehicle of [null, DRIVE, BIKE]) {
    const t0 = realNow();
    R.updateRouting(0.1, worldAt(px, py, tx, ty, name, inVehicle));
    const r = R.getActiveRoute();
    const ok = !!r && r.pts.length > 2 && Math.hypot(r.pts.at(-1)[0] - tx, r.pts.at(-1)[1] - ty) < 150 && r.length < Math.hypot(tx - px, ty - py) * 2.2;
    if (!ok) fails++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} (${inVehicle ? (inVehicle.isBike ? 'bike' : 'drive') : 'walk'}): ${r ? r.pts.length + ' pts, ' + Math.round(r.length) + ' m' : 'no route'} in ${Math.round(realNow() - t0)} ms`);
  }
}

// ---- the sweep
let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
const MB = map.meta.bounds;
// a point on a tile road of the main network (clear of the city map)
const onRoad = (range = 1e9, cx = 0, cy = 0) => {
  for (;;) {
    const r = roadNet[Math.floor(rnd() * roadNet.length)], p = r.pts[Math.floor(rnd() * r.pts.length)];
    if (p[0] > MB[0] - 800 && p[0] < MB[2] + 800 && p[1] > MB[1] - 800 && p[1] < MB[3] + 800) continue;
    if (Math.hypot(p[0] - cx, p[1] - cy) > range) continue;
    const s = RG.snapRoad(p[0], p[1], 3);
    if (s) return p;
  }
};
const inField = () => { for (;;) { const p = onRoad(), a = rnd() * 6.283, q = [p[0] + Math.cos(a) * 120, p[1] + Math.sin(a) * 120]; if (roadDist(q[0], q[1]) > 40) return q; } };
const inCity = () => { const r = map.roads[Math.floor(rnd() * map.roads.length)]; return r.pts[0]; };
const KINDS = {
  'city->prov': () => [inCity(), onRoad()],
  'prov->city': () => [onRoad(), inCity()],
  'prov->prov': () => [onRoad(), onRoad()],
  'near->near': () => { const a = onRoad(); return [a, onRoad(15000, a[0], a[1])]; },
  'field->prov': () => [inField(), onRoad()],
  'prov->field': () => [onRoad(), inField()],
};
const PER = 10;
const tot = { n: 0, len: 0, off: 0, excess: 0, longest: 0, dead: 0, maxMs: 0, sumMs: 0, rerouteBad: 0, blocked: 0 };
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
    // no way on foot (the motorways are closed to walkers) but one by car: shut, not dead
    let blocked = false;
    if (dead && !inVehicle) {
      clock += 100;
      R.updateRouting(0.1, worldAt(px, py, tx, ty, name, DRIVE));
      const rd = R.getActiveRoute();
      blocked = !!rd && rd.pts.length > 1 && Math.hypot(rd.pts.at(-1)[0] - tx, rd.pts.at(-1)[1] - ty) <= Math.max(60, roadDist(tx, ty, 500) + 20);
      if (blocked) { tot.blocked++; console.log(`  SHUT ${name} walk: no legal way for walkers (motorway), the car has one`); }
    }
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
    k.n++; k.len += r ? r.length : 0; k.off += o.off; k.excess += excess; k.longest = Math.max(k.longest, o.longest); k.dead += dead && !blocked ? 1 : 0; k.maxMs = Math.max(k.maxMs, ms);
    tot.sumMs += ms;
    if (VERBOSE || (dead && !blocked) || excess > 50 || reroute) console.log(`  ${dead && !blocked ? 'DEAD' : excess > 50 ? 'OFF ' : '    '} ${name} ${inVehicle ? 'drive' : 'walk'} [${Math.round(px)},${Math.round(py)}]->[${Math.round(tx)},${Math.round(ty)}]: ${r ? Math.round(r.length) : '-'} m, off ${Math.round(o.off)} m (own ${Math.round(own)}), longest ${Math.round(o.longest)} m, ${Math.round(ms)} ms${reroute}`);
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
const excessShare = tot.excess / (tot.len || 1);
console.log(`routes: ${(100 * excessShare).toFixed(2)}% off road beyond the legs to/from a field`);
console.log(`shut to walkers (motorway), open to cars: ${tot.blocked} of ${tot.n / 2} walks`);
const okSweep = tot.dead === 0 && tot.blocked <= tot.n * 0.05 && excessShare < 0.015 && tot.rerouteBad === 0;
if (!okSweep) fails++;
console.log(okSweep ? 'sweep ok' : 'sweep FAIL');

// ---- drive along tile roads: the GPS must keep its route
// A sample of the roads is driven from its start in the direction the route
// takes (both directions when it leaves the road at once), 20 m/s in 0.5 s
// steps, for up to 300 m. The route has to start at the car (not at some city
// street 100 m away), exist, stay within STRAY_M of the car and never be
// recomputed while the car follows it.
const ROADS = process.argv.includes('--no-roads') ? [] : (() => {
  const want = arg('drives', 2500), step = Math.max(1, Math.floor(roadNet.length / want)), out = [];
  for (let i = 0; i < roadNet.length; i += step) out.push({ id: i, ...roadNet[i], name: '' });
  return out;
})();
const FAR = [[1774.82, 9945.78], [-0.84, 0.33], [-9121.42, -6905.51]];
const roadFails = [];
let driven = 0, notInGraph = 0;
const clockStep = (s) => { clock += s; };
const nearestEdgeD = (x, y) => { const s = RG.snapRoad(x, y, 60); return s ? s.d : Infinity; };
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
  // inside the city map the city graph routes, and its own test drives those roads
  if (road.pts.some((p) => p[0] > MB[0] && p[0] < MB[2] && p[1] > MB[1] && p[1] < MB[3] && roadDistCity(p) < 4)) continue;
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
    const [ax, ay] = along(pts, 25);
    const ahead = r.pts.findIndex((q) => Math.hypot(q[0] - x0, q[1] - y0) > 12);
    const goes = ahead > 0 && Math.hypot(r.pts[ahead][0] - ax, r.pts[ahead][1] - ay) < 14;
    const maxD = Math.min(L, 300);
    let reroutes = 0, offRun = 0, why = '';
    const startGap = Math.hypot(r.pts[0][0] - x0, r.pts[0][1] - y0);
    if (startGap > 20) why = `route starts ${Math.round(startGap)} m from the car`;
    driven++;
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
function roadDistCity(p) {
  let d = 99;
  for (const r of map.roadsNear(p[0], p[1], 6)) for (let i = 0; i < r.pts.length - 1; i++) d = Math.min(d, segD(p[0], p[1], r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1]));
  return d;
}
// ---- one-ways: a route never runs against one
// A car 60 % along a one-way road, a target 20 % along it (behind the car): the
// route has to carry on forward (round a roundabout if need be), not turn round on the road.
{
  let n = 0, wrong = 0;
  const oneways = roadNet.filter((r) => r.oneway && r.kind >= 3 && polyLen(r.pts) > 500);
  for (let k = 0; k < oneways.length && n < 60; k += Math.ceil(oneways.length / 60)) {
    const r = oneways[k], L = polyLen(r.pts);
    const [x0, y0] = along(r.pts, L * 0.6), [x1, y1] = along(r.pts, L * 0.2);
    // inside the city map the city streets decide, and a route over them may start on a ramp the province net draws elsewhere (#320)
    if (x0 > MB[0] && x0 < MB[2] && y0 > MB[1] && y0 < MB[3]) continue;
    // a one-way that ends in a dead end has no legal way: the router then ignores one-ways
    const sa = RG.snapRoad(x0, y0, 50), sb = RG.snapRoad(x1, y1, 50);
    if (!sa || !sb || !RG.roadPath(sa, sb)) continue;
    const w = worldAt(x0, y0, x1, y1, 'oneway ' + k, DRIVE);
    R.updateRouting(0.1, { ...w, storyGuide: null });
    clockStep(10);
    R.updateRouting(0.1, w);
    const rt = R.getActiveRoute();
    if (!rt || rt.pts.length < 2) continue;
    n++;
    const [bx, by] = along(r.pts, L * 0.6 + 1), dx = bx - x0, dy = by - y0;
    const ahead = rt.pts.find((q) => Math.hypot(q[0] - x0, q[1] - y0) > 1);
    if (ahead && (ahead[0] - x0) * dx + (ahead[1] - y0) * dy < 0) { wrong++; console.log(`  WRONG WAY road ${k} [${Math.round(x0)},${Math.round(y0)}]`); }
  }
  console.log(`one-way: ${wrong} of ${n} routes start against the one-way`);
  if (wrong > 0 || n < 20) fails++;
}
const failIds = new Map();
for (const [road, di, why, inGraph] of roadFails) { if (!failIds.has(road.id)) failIds.set(road.id, { road, whys: [], inGraph }); failIds.get(road.id).whys.push(`dir ${di}: ${why}`); }
console.log(`\nroad drive: ${driven} drives over ${ROADS.length} roads, ${failIds.size} roads fail, ${notInGraph} roads not in the route graph`);
let shown = 0;
for (const { road, whys, inGraph } of failIds.values()) {
  if (shown++ < (VERBOSE ? 400 : 25)) console.log(`  road ${road.id} kind ${road.kind} [${road.pts[0].map(Math.round)}] ${inGraph ? '' : '(not in graph) '}${whys.join('; ')}`);
}
if (failIds.size || notInGraph > ROADS.length * 0.01) fails++;
process.exit(fails ? 1 : 0);
