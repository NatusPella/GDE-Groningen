// The ring race lap (ringroute.js) and the other grade-separated ring roads
// must be free of anything solid across the lanes. probeRingSolids lists
// what a car would hit at driving height: building footprints (passages
// excepted), retaining walls, crash barriers and fences (elevation.js),
// street trees, signal poles, speed cameras, static colliders (piers,
// canopy posts, garage walls) and the street clutter the cells would place.
// driveRingLap then really drives it: a scripted car with the player's
// collision, and the race's own AI rivals (racers.js), both must finish.
import { RING_ROUTE, RING_CHECKPOINTS } from './ringroute.js';
import { pointInPolygon, closestPointOnSegment } from './util.js';
import { waterPolyAt } from './waterlevels.js';
import { inPassage } from './passages.js';
import { elevWallContact } from './elevation.js';
import { roadBaseAt } from './terrainlift.js';
import { findProps, makeProp, resolvePropCollisions } from './breakables.js';
import { getSignalPoles, streamTrafficLightProps } from './trafficlights.js';
import { streamFlitspaalProps } from './flitspaal.js';
import { streamTreeProps } from './treeprops.js';
import { cellPropSpots, CLUTTER_CELL } from './cityprops.js';
import { Vehicle, resolveVehicleBuildingCollision, resolveBoomCollisions, overOpenWater } from './vehicle.js';
import { createRace, updateRace, disposeRace } from './racers.js';
import { resolveWalker } from './collision.js';
import { railLiftZ } from './elevation.js';
import { railHeightFn, profileLifts } from './railprofile.js';

const STEP = 1;
// probes cover the lanes up to this far inside the carriageway edge, and
// anything within REACH of a probe is on the asphalt: barriers and parapets
// belong on the edge, beside the lanes
const EDGE_IN = 0.6;
const REACH = 0.35;

function capsuleDist(x, y, p) {
  const hx = p.hx || 0, hy = p.hy || 0;
  const cp = closestPointOnSegment(x, y, p.x - hx, p.y - hy, p.x + hx, p.y + hy);
  return Math.sqrt(cp.dist2) - (p.r || 0.2);
}

// Centreline samples of a polyline: { x, y, nx, ny, hw, s, z }; z from the
// road's own heights when it has them (zOf), else followed along the surface.
function samplesOf(pts, hwOf, closed, zOf = null) {
  const out = [];
  let s = 0;
  const n = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < 1e-3) continue;
    const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
    for (let t = 0; t < L; t += STEP, s += STEP) out.push({ x: a[0] + ux * t, y: a[1] + uy * t, nx: -uy, ny: ux, hw: hwOf(i), s, i, z: zOf ? zOf(i, t / L) : null });
  }
  return out;
}

// Half-width of the asphalt at a lap sample: the route's own, but never wider
// than the widest carriageway under that centreline point.
function localHalfWidth(map, q, z) {
  let best = 0;
  for (const r of map.roadsNear(q.x, q.y, 2)) {
    if (r.cat === 'foot' || r.cat === 'cycle') continue;
    const P = r.pts;
    for (let i = 0; i < P.length - 1; i++) {
      const cp = closestPointOnSegment(q.x, q.y, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]);
      if (cp.dist2 > 1) continue;
      const rz = r.z ? r.z[i] + (r.z[i + 1] - r.z[i]) * cp.t : 0;
      if (Math.abs(rz - z) < 1.5) best = Math.max(best, (r.width || 7) / 2 + Math.sqrt(cp.dist2));
    }
  }
  return best ? Math.min(q.hw, best) : q.hw;
}

function propList(world, cache, x, y) {
  const gx = Math.floor(x / CLUTTER_CELL), gy = Math.floor(y / CLUTTER_CELL);
  const out = [];
  for (let ix = gx - 1; ix <= gx + 1; ix++) {
    for (let iy = gy - 1; iy <= gy + 1; iy++) {
      const k = ix + ',' + iy;
      if (!cache.has(k)) cache.set(k, cellPropSpots(world.map, ix, iy).map((d) => makeProp(d.kind, d.x, d.y, { ...(d.opts || {}), angle: d.angle || 0, ...(d.half ? { half: d.half } : null) })));
      for (const p of cache.get(k)) if (Math.abs(p.x - x) < 8 && Math.abs(p.y - y) < 8) out.push(p);
    }
  }
  return out;
}

// Everything solid within the lanes of `samples`; one entry per 10 m and kind.
function probe(world, samples, label, cache, edgeIn = EDGE_IN) {
  const map = world.map;
  const hits = new Map();
  const hit = (q, kind, what, x, y, z) => {
    const k = kind + ':' + Math.floor(q.s / 10);
    if (!hits.has(k)) hits.set(k, { route: label, s: Math.round(q.s), kind, what, x: Math.round(x), y: Math.round(y), z: Math.round(z * 10) / 10 });
  };
  const poles = getSignalPoles();
  const cams = world.flitspaalen || [];
  let z = map.spawnZ ? map.spawnZ(samples[0].x, samples[0].y) : 0;
  for (const q of samples) {
    z = q.z !== null ? q.z : map.groundHeightAt(q.x, q.y, z);
    const half = Math.max(0, localHalfWidth(map, q, z) - edgeIn);
    const clutter = Math.abs(z) < 1 ? propList(world, cache, q.x, q.y) : [];
    for (let o = -half; o <= half + 1e-6; o += 0.7) {
      const x = q.x + q.nx * o, y = q.y + q.ny * o;
      const zz = q.z !== null ? z : map.groundHeightAt(x, y, z);
      if (zz <= 4 && zz >= -3.5) {
        for (const b of map.buildingsNear(x, y, 0.5)) {
          if (pointInPolygon(x, y, b.pts) && !inPassage(map, b, x, y, 0.35)) hit(q, 'gebouw', b.name || b.type, x, y, zz);
        }
      }
      if (map.elev && (map.terrainOn ? map.wallContact(x, y, zz, REACH) : elevWallContact(map.elev, x, y, zz, REACH))) hit(q, 'muur', 'keerwand/vangrail', x, y, zz);
      if (overOpenWater(map, x, y, zz)) hit(q, 'water', 'open water zonder brug', x, y, zz);
      if (Math.abs(zz) > 3) continue;
      for (const t of map.treesNear(x, y, 1)) if (Math.hypot(t[0] - x, t[1] - y) < 0.3 + REACH) hit(q, 'boom', 'straatboom', x, y, zz);
      for (const p of findProps(x, y, 2)) if (!p.water && Math.abs((p.z || 0) - zz) < 3 && !(p.top != null && zz > p.top - 0.3) && !(p.base != null && zz < p.base) && capsuleDist(x, y, p) < REACH) hit(q, 'obstakel', p.kind, x, y, zz);
      for (const p of poles) if (!p.ghost && Math.abs(p.x - x) < 1.2 && Math.abs(p.y - y) < 1.2 && Math.hypot(p.x - x, p.y - y) < 0.16 + REACH) hit(q, 'obstakel', 'verkeerslichtpaal', x, y, zz);
      for (const c of cams) if (Math.hypot(c.px - x, c.py - y) < 0.3 + REACH) hit(q, 'obstakel', 'flitspaal', x, y, zz);
      for (const p of clutter) if (capsuleDist(x, y, p) < REACH) hit(q, 'obstakel', p.kind, x, y, zz);
    }
  }
  return [...hits.values()];
}

const RING_REFS = new Set(['N7', 'N46', 'N370', 'N355', 'N361', 'N860']);

export function probeRingSolids(world) {
  const cache = new Map();
  const lap = samplesOf(RING_ROUTE, (i) => RING_ROUTE[i][2], true);
  const out = probe(world, lap, 'ringrace', cache);
  // the rest of the ring: every raised or sunken road and the ring's numbered roads
  out.push(...probeRoadSolids(world, world.map.roads.filter((r) => r.z || RING_REFS.has(r.ref)), cache));
  return out;
}

// The same probe over any roads' lanes (the whole network: scripts/world/
// drive_audit.mjs --solids). One entry per 10 m and kind.
export function probeRoadSolids(world, roads, cache = new Map()) {
  const out = [];
  for (const r of roads) {
    if (r.cat === 'foot' || r.cat === 'cycle') continue;
    const hw = (r.width || 7) / 2;
    const zOf = r.z ? (i, k) => r.z[i] + (r.z[i + 1] - r.z[i]) * k : () => 0;
    const all = samplesOf(r.pts, () => hw, false, zOf);
    const L = all.length ? all[all.length - 1].s : 0;
    // where a slip road splits off, the other road's barrier runs along the gore
    // at the edge: side roads count from a metre further in, and not in the
    // first and last metres where they still overlap the road they leave
    const samples = all.filter((q) => q.s > 10 && q.s < L - 10);
    if (samples.length) out.push(...probe(world, samples, `${r.ref || ''} ${r.name || r.type}`.trim(), cache, 1.2));
  }
  return out;
}

// --- driving the lap -----------------------------------------------------------

const DT = 1 / 30;
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

function routeCursor() {
  const P = RING_ROUTE, acc = [0];
  for (let i = 1; i <= P.length; i++) acc.push(acc[i - 1] + Math.hypot(P[i % P.length][0] - P[i - 1][0], P[i % P.length][1] - P[i - 1][1]));
  const L = acc[acc.length - 1];
  const at = (s) => {
    s = ((s % L) + L) % L;
    let i = 0;
    while (acc[i + 1] < s) i++;
    const a = P[i], b = P[(i + 1) % P.length], k = (s - acc[i]) / ((acc[i + 1] - acc[i]) || 1);
    return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, i };
  };
  // progress of (x, y) near the last known s
  const project = (x, y, s0) => {
    let best = s0, bd = Infinity;
    for (let s = s0 - 20; s <= s0 + 60; s += 1) {
      const q = at(s), d = (q.x - x) ** 2 + (q.y - y) ** 2;
      if (d < bd) { bd = d; best = s; }
    }
    return { s: best, d: Math.sqrt(bd) };
  };
  return { at, project, L };
}

function streamAround(world, x, y) {
  streamTrafficLightProps(world, x, y);
  streamFlitspaalProps(world, x, y);
  streamTreeProps(world, x, y);
}

// A scripted car (the player's collision: buildings, walls, props, booms)
// steered along the lap. Resolves with { ok, s, at, time }.
async function scriptedLap(world, C) {
  const map = world.map, p = world.player;
  const a0 = C.at(0), a1 = C.at(6);
  const v = new Vehicle(a0.x, a0.y, Math.atan2(a1.y - a0.y, a1.x - a0.x), { name: 'sport', len: 4.1, wid: 1.85, maxSpeed: 40, accel: 14, brake: 30, turnRate: 3.2, color: '#8a1414' });
  v.z = map.spawnZ ? map.spawnZ(v.x, v.y) : 0;
  v.driver = 'player';
  let s = 0, t = 0, lastGood = 0, bestS = 0;
  while (s < C.L + 5) {
    for (let k = 0; k < 240; k++) {
      const look = Math.max(8, Math.abs(v.speed) * 0.55);
      const q = C.at(s + look);
      const fx = Math.cos(v.angle), fy = Math.sin(v.angle);
      const dx = q.x - v.x, dy = q.y - v.y;
      const lat = dy * fx - dx * fy, fwd = dx * fx + dy * fy;
      const steer = Math.max(-1, Math.min(1, Math.atan2(lat, fwd) * 2.2));
      // slow down for bends ahead
      const b0 = C.at(s + 10), b1 = C.at(s + 40);
      const bend = Math.abs(Math.atan2(b1.y - b0.y, b1.x - b0.x) - Math.atan2(b0.y - v.y, b0.x - v.x));
      const vT = Math.min(v.model.maxSpeed, bend > 0.5 && bend < 5.8 ? 14 : 30);
      v.applyControls(DT, v.speed < vT ? 1 : 0, steer, v.speed > vT + 2 ? 0.5 : 0);
      resolveVehicleBuildingCollision(v, map, DT);
      p.x = v.x; p.y = v.y;
      resolvePropCollisions([v], world);
      resolveBoomCollisions(v, world);
      t += DT;
      const pr = C.project(v.x, v.y, s);
      s = pr.s;
      if (s > bestS + 3) { bestS = s; lastGood = t; }
      if (pr.d > 25 || t - lastGood > 12) return { ok: false, s: Math.round(s), at: [Math.round(v.x), Math.round(v.y)], time: Math.round(t), off: Math.round(pr.d) };
      if (k % 30 === 0) streamAround(world, v.x, v.y);
      if (s >= C.L + 5) break;
    }
    await nextFrame();
  }
  return { ok: true, s: Math.round(s), time: Math.round(t) };
}

// The race's own rivals, driven by racers.js until every one has finished.
async function aiLap(world, C) {
  const map = world.map, p = world.player;
  const a0 = C.at(-20);
  p.x = a0.x; p.y = a0.y;
  const race = createRace(world, RING_ROUTE, RING_CHECKPOINTS, { topScale: 1.35, accelScale: 1.3, band: 320, jelle: true });
  race.phase = 'race';
  if (race.playerCar) { const k = world.vehicles.indexOf(race.playerCar); if (k >= 0) world.vehicles.splice(k, 1); }
  const last = race.rivals.map((r) => ({ x: r.v.x, y: r.v.y }));
  const jumps = race.rivals.map(() => 0);
  let t = 0;
  while (t < 1400 && !race.rivals.every((r) => r.finished)) {
    for (let k = 0; k < 120; k++) {
      // the camera "player" rides with the slowest rival, so none is ever
      // respawned out of sight: a rival that gets stuck stays stuck
      const slow = race.rivals.filter((r) => !r.finished).sort((a, b) => a.prog - b.prog)[0] || race.rivals[0];
      p.x = slow.v.x; p.y = slow.v.y;
      updateRace(DT, world, race, 0);
      resolvePropCollisions(race.rivals.map((r) => r.v), world);
      race.rivals.forEach((r, i) => {
        if (Math.hypot(r.v.x - last[i].x, r.v.y - last[i].y) > 12) jumps[i]++;
        last[i].x = r.v.x; last[i].y = r.v.y;
      });
      if (k % 30 === 0) streamAround(world, p.x, p.y);
      t += DT;
    }
    await nextFrame();
  }
  const res = race.rivals.map((r, i) => ({ finished: !!r.finished, prog: Math.round(r.prog), respawns: jumps[i], at: [Math.round(r.v.x), Math.round(r.v.y)] }));
  for (const r of race.rivals) { const k = world.vehicles.indexOf(r.v); if (k >= 0) world.vehicles.splice(k, 1); }
  disposeRace(world, race);
  return { ok: res.every((r) => r.finished && !r.respawns), time: Math.round(t), rivals: res };
}

export async function driveRingLap(world) {
  const p = world.player;
  const keep = { x: p.x, y: p.y, paused: world.uiPaused };
  world.uiPaused = true;
  const C = routeCursor();
  try {
    const scripted = await scriptedLap(world, C);
    const ai = await aiLap(world, C);
    return { scripted, ai };
  } finally {
    p.x = keep.x; p.y = keep.y;
    world.uiPaused = keep.paused;
  }
}

// --- water crossings -------------------------------------------------------------

// Every place a major or numbered road runs over water, one entry per
// carriageway: { road, x, y, s0, s1 } with s0..s1 the wet stretch along it.
export function waterCrossings(map) {
  const out = [];
  for (const r of map.roads) {
    if (!(r.cat === 'major' || (r.ref && (r.cat === 'normal' || r.cat === 'minor')))) continue;
    let s = 0, run = null;
    const P = r.pts;
    for (let i = 0; i < P.length - 1; i++) {
      const L = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]);
      for (let t = 0; t < L; t += 2, s += 2) {
        const k = t / L, x = P[i][0] + (P[i + 1][0] - P[i][0]) * k, y = P[i][1] + (P[i + 1][1] - P[i][1]) * k;
        const wet = !!waterPolyAt(map, x, y);
        if (wet) { if (!run) out.push(run = { road: r, x, y, s0: s, s1: s }); run.s1 = s; }
        else run = null;
      }
    }
  }
  return out;
}

// The carriageway through a crossing as one polyline, `reach` metres on
// either side: the road itself, continued at its ends along the car road that
// carries straight on (same level, smallest turn).
export function crossingPath(map, c, reach) {
  const r = c.road, P = r.pts;
  const len = (Q) => Q.slice(1).reduce((a, q, i) => a + Math.hypot(q[0] - Q[i][0], q[1] - Q[i][1]), 0);
  // (with ?terrain the heights of the path are absolute: the profile over the ground the road is on, terrainlift.js roadBaseAt)
  const tb = (w, q) => (map.terrainOn ? roadBaseAt(map, w, q[0], q[1]) : 0);
  const zEnd = (w, end) => (w.z ? (end ? w.z[w.z.length - 1] : w.z[0]) : 0) + tb(w, end ? w.pts[w.pts.length - 1] : w.pts[0]);
  const withZ = (w) => w.pts.map((q, i) => [q[0], q[1], (w.z ? w.z[i] : 0) + tb(w, q)]);
  const extend = (w, fwd, need) => {
    const out = [];
    let cur = w, guard = 0;
    while (need > 0 && guard++ < 12) {
      const Q = cur.pts, e = fwd ? Q[Q.length - 1] : Q[0], ze = zEnd(cur, fwd);
      const d0 = fwd ? [e[0] - Q[Q.length - 2][0], e[1] - Q[Q.length - 2][1]] : [e[0] - Q[1][0], e[1] - Q[1][1]];
      const a0 = Math.atan2(d0[1], d0[0]);
      // only through a plain joint (two car ways meet): a junction, with its
      // corners, kerbs and poles, is not the carriageway carrying on
      let ways = 0;
      for (const o of map.roadsNear(e[0], e[1], 1)) {
        if (o.cat === 'foot' || o.cat === 'cycle') continue;
        if (o.pts.some((q) => Math.abs(q[0] - e[0]) < 0.05 && Math.abs(q[1] - e[1]) < 0.05)) ways++;
      }
      if (ways > 2) break;
      let best = null, bt = 0.9;
      for (const o of map.roadsNear(e[0], e[1], 1)) {
        if (o === cur || o.cat === 'foot' || o.cat === 'cycle' || o.pts.length < 2) continue;
        const O = o.pts, oa = fwd ? O[0] : O[O.length - 1];
        if (Math.hypot(oa[0] - e[0], oa[1] - e[1]) > 0.5 || Math.abs(zEnd(o, !fwd) - ze) > 1) continue;
        const ob = fwd ? O[1] : O[O.length - 2];
        // (on along o, away from the node: the way it carries on, for either end)
        const ao = Math.atan2(ob[1] - oa[1], ob[0] - oa[0]);
        const turn = Math.abs(Math.atan2(Math.sin(ao - a0), Math.cos(ao - a0)));
        if (turn < bt) { bt = turn; best = o; }
      }
      if (!best) break;
      const add = fwd ? withZ(best).slice(1) : withZ(best).slice(0, -1).reverse();
      out.push(...add);
      need -= len(best.pts);
      cur = best;
    }
    return out;
  };
  const L = len(P);
  const before = extend(r, false, reach - c.s0).reverse(), after = extend(r, true, reach - (L - c.s1));
  const full = [...before, ...withZ(r), ...after];
  // trim to reach metres around the wet stretch
  const off = len([...before, P[0]]);
  const a = Math.max(0, off + c.s0 - reach), b = off + c.s1 + reach;
  const out = [];
  let s = 0;
  for (let i = 0; i < full.length - 1; i++) {
    const p = full[i], q = full[i + 1], l = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (l < 1e-3) continue;
    for (let t = 0; t < l; t += 1, s += 1) if (s >= a && s <= b) out.push([p[0] + (q[0] - p[0]) * t / l, p[1] + (q[1] - p[1]) * t / l, p[2] + (q[2] - p[2]) * t / l]);
  }
  return out;
}

// Speed at which the tightest bend of the next 50 m takes 6 m/s² of grip.
function cornerSpeed(path, s) {
  let v = Infinity;
  const at = (k) => path[Math.min(path.length - 1, Math.round(k))];
  for (let k = s; k < s + 50 && k + 10 < path.length; k += 5) {
    const a = at(k), b = at(k + 5), c = at(k + 10);
    const t = Math.abs(Math.atan2(Math.sin(Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(b[1] - a[1], b[0] - a[0])), Math.cos(Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(b[1] - a[1], b[0] - a[0]))));
    if (t > 1e-3) v = Math.min(v, Math.sqrt(6 * 5 / t));
  }
  return Math.max(6, v);
}

// The path shifted o metres sideways, but never nearer than a car's half
// width to the edge of the carriageway it is on (the road ahead may narrow).
// The offset changes by at most a metre per 10 m of path, the way a driver
// keeps to a lane where the carriageway widens or narrows (the path's points
// are a metre apart).
export function offsetPath(map, path, o) {
  if (!o) return path;
  const cap = path.map((q) => {
    let hw = 0, bd = 9;
    for (const r of map.roadsNear(q[0], q[1], 3)) {
      if (r.cat === 'foot' || r.cat === 'cycle') continue;
      for (let k = 0; k < r.pts.length - 1; k++) {
        const cp = closestPointOnSegment(q[0], q[1], r.pts[k][0], r.pts[k][1], r.pts[k + 1][0], r.pts[k + 1][1]);
        if (cp.dist2 < bd) { bd = cp.dist2; hw = (r.width || 7) / 2; }
      }
    }
    return Math.max(0, Math.min(Math.abs(o), hw - 1.3));
  });
  for (let i = 1; i < cap.length; i++) cap[i] = Math.min(cap[i], cap[i - 1] + 0.1);
  for (let i = cap.length - 2; i >= 0; i--) cap[i] = Math.min(cap[i], cap[i + 1] + 0.1);
  return path.map((q, i) => {
    const a = path[Math.max(0, i - 2)], b = path[Math.min(path.length - 1, i + 2)];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const oo = Math.sign(o) * cap[i];
    return [q[0] - (b[1] - a[1]) / L * oo, q[1] + (b[0] - a[0]) / L * oo, q[2]];
  });
}

// A car with the player's collision driven over the path at `speed` m/s.
// Resolves null when it crossed, else { what, x, y, z }.
// opts.jump: a car in the air for more than 0.3 s fails too (a crest or a
// step in the profile); opts.maxT: seconds before 'komt niet vooruit' (30).
export async function driveAcross(world, path, speed, opts = {}) {
  const map = world.map, p = world.player;
  const car = new Vehicle(path[0][0], path[0][1], Math.atan2(path[3][1] - path[0][1], path[3][0] - path[0][0]), { name: 'sport', len: 4.1, wid: 1.85, maxSpeed: 40, accel: 14, brake: 30, turnRate: 3.2, color: '#8a1414' });
  car.driver = 'player';
  // on the layer of the path's own road (its ribbon), not whatever overlaps it there
  car.surf = { z: path[0][2], ribbon: map.ribbonAt(path[0][0], path[0][1], path[0][2]) };
  car.z = map.surfaceAt(car.x, car.y, car.surf).z;
  // (a path that starts in a bend starts at the speed for it)
  car.speed = Math.min(speed, cornerSpeed(path, 0));
  const dt = 1 / 60;
  let s = 0, t = 0, air = 0;
  // what the car ran into: props, footprints or walls around it
  const cause = () => {
    const out = new Set();
    for (const p of findProps(car.x, car.y, 4)) if (!p.water && Math.abs((p.z || 0) - (car.z || 0)) < 3 && capsuleDist(car.x, car.y, p) < 3.5) out.add(p.kind);
    for (const b of map.buildingsNear(car.x, car.y, 4)) if (Math.abs(car.z || 0) < 4 && pointInPolygon(car.x + Math.cos(car.angle) * 2.5, car.y + Math.sin(car.angle) * 2.5, b.pts)) out.add('gebouw ' + (b.name || b.type || ''));
    if (map.elev && (map.terrainOn ? map.wallContact(car.x + Math.cos(car.angle) * 2.2, car.y + Math.sin(car.angle) * 2.2, car.z || 0) : elevWallContact(map.elev, car.x + Math.cos(car.angle) * 2.2, car.y + Math.sin(car.angle) * 2.2, car.z || 0))) out.add('muur');
    if (!out.size) {
      // nothing ahead: what touches the body (a side scrape)
      for (const b of map.buildingsNear(car.x, car.y, 4)) {
        for (const [ox, oy] of [[2.2, 1.1], [2.2, -1.1], [0, 1.1], [0, -1.1], [-2.2, 1.1], [-2.2, -1.1]]) {
          const c = Math.cos(car.angle), sn = Math.sin(car.angle);
          if (Math.abs(car.z || 0) < 4 && pointInPolygon(car.x + c * ox - sn * oy, car.y + sn * ox + c * oy, b.pts)) { out.add('gebouw ' + (b.name || b.type || '') + ' (zijkant)'); break; }
        }
      }
      for (const p of findProps(car.x, car.y, 6)) if (capsuleDist(car.x, car.y, p) < 5) out.add(`${p.kind}@${capsuleDist(car.x, car.y, p).toFixed(1)}`);
    }
    return [...out].join(',');
  };
  // (yaw: degrees the body is turned off the path's heading, dev: m it is off the path; a car
  // swinging round a sharp joint reaches further out than the straight road it was cleared for)
  let yaw = 0, dev = 0;
  const fail = (what) => ({ what, x: Math.round(car.x), y: Math.round(car.y), z: Math.round((car.z || 0) * 10) / 10, v: Math.round(car.speed * 3.6), by: cause(), yaw, dev });
  streamAround(world, car.x, car.y);
  await nextFrame();
  while (s < path.length - 4) {
    for (let k = 0; k < 60 && s < path.length - 4; k++) {
      const q = path[Math.min(path.length - 1, Math.round(s + Math.max(6, car.speed * 0.5)))];
      const fx = Math.cos(car.angle), fy = Math.sin(car.angle);
      const dx = q[0] - car.x, dy = q[1] - car.y;
      const steer = Math.max(-1, Math.min(1, Math.atan2(dy * fx - dx * fy, dx * fx + dy * fy) * 2.2));
      // corners on the approach (a junction just past a city bridge) are taken slower
      const vT = Math.min(speed, cornerSpeed(path, s));
      const before = car.speed;
      // (a breakable prop knocked over in the step is gone from findProps after it)
      const propsBefore = findProps(car.x, car.y, 4).filter((q) => !q.water).map((q) => `${q.kind}@${capsuleDist(car.x, car.y, q).toFixed(1)}`);
      car.applyControls(dt, car.speed < vT ? 1 : 0, steer, car.speed > vT + 1 ? 0.6 : 0);
      resolveVehicleBuildingCollision(car, map, dt);
      resolvePropCollisions([car], world);
      resolveBoomCollisions(car, world);
      p.x = car.x; p.y = car.y;
      t += dt;
      if (!car.airborne && overOpenWater(map, car.x, car.y, car.z || 0)) return fail('zinkt in het water');
      air = car.airborne ? air + dt : 0;
      if (opts.onStep) opts.onStep(car, s);
      if (opts.jump && air > 0.3) return fail('springt');
      // progress: nearest path point a little ahead of the last
      let bs = s, bd = Infinity;
      for (let j = Math.max(0, Math.floor(s) - 3); j < Math.min(path.length, s + 12); j++) {
        const d = (path[j][0] - car.x) ** 2 + (path[j][1] - car.y) ** 2;
        if (d < bd) { bd = d; bs = j; }
      }
      s = Math.max(s, bs);
      {
        const a = path[Math.min(path.length - 1, bs + 1)], b0 = path[bs];
        const dh = Math.atan2(a[1] - b0[1], a[0] - b0[0]) - car.angle;
        yaw = Math.round(Math.abs(Math.atan2(Math.sin(dh), Math.cos(dh))) * 57.3);
        dev = Math.round(Math.sqrt(bd) * 10) / 10;
      }
      if (bd > 36) return fail('van de rijbaan geduwd');
      // braking never takes more than ~0.5 m/s off in a step: more is an impact
      if (before - car.speed > 1.5) return { ...fail(`botst (-${(before - car.speed).toFixed(1)} m/s)`), near: propsBefore.join(',') };
      if (car.speed < 2) return fail('staat stil');
      // (where two carriageways overlap on their way to merge it may ride the other one,
      // at the same height; the car keeps to its own ribbon, map.surfaceAt, to the end)
      if (!car.airborne && (car.z || 0) < path[bs][2] - 2.5) return fail('van het dek gevallen');
      if (t > (opts.maxT || 30)) return fail('komt niet vooruit');
    }
    streamAround(world, car.x, car.y);
    await nextFrame();
  }
  return null;
}

// Every water crossing of the major and numbered roads, each carriageway in
// both directions, driven at 80 km/h. One entry per failed drive.
export async function driveWaterCrossings(world, speed = 80 / 3.6) {
  const map = world.map, p = world.player;
  const keep = { x: p.x, y: p.y, paused: world.uiPaused };
  world.uiPaused = true;
  const out = [];
  let n = 0;
  try {
    for (const c of waterCrossings(map)) {
      const path = crossingPath(map, c, 60);
      if (path.length < 40) continue;
      // the centre and both outer lanes, a car's half width from the edge
      const edge = (c.road.width || 7) / 2 - 1.3;
      for (const o of edge > 0.5 ? [0, -edge, edge] : [0]) {
        const lane = offsetPath(map, path, o);
        for (const dir of [1, -1]) {
          n++;
          const res = await driveAcross(world, dir > 0 ? lane : lane.slice().reverse(), speed);
          if (res) out.push({ route: `${c.road.ref || ''} ${c.road.name || ''}`.trim() || c.road.cat, dir: dir > 0 ? 'mee' : 'tegen', lane: Math.round(o * 10) / 10, at: [Math.round(c.x), Math.round(c.y)], ...res });
        }
      }
    }
  } finally {
    p.x = keep.x; p.y = keep.y;
    world.uiPaused = keep.paused;
  }
  return { drives: n, fails: out };
}

// --- rail lifts ------------------------------------------------------------------

// Walk, drive and cycle up every rail lift (the track climbing onto an
// embankment or viaduct, map.railLifts) along the rails, from the flat to the
// top and on over it: no step in the surface, nothing solid across the track.
// One entry per problem: { lift, how, what, x, y, z }.
export function probeRailLifts(world) {
  const map = world.map;
  // the raised stretches of the track profile, or the old radial lifts
  const zAt = railHeightFn(map, railLiftZ);
  const lifts = zAt.profiled ? profileLifts(map.rails) : map.railLifts || [];
  const railLiftZ_ = (_, x, y) => zAt(x, y);
  const out = [];
  const car = new Vehicle(0, 0, 0, { name: 'sport', len: 4.1, wid: 1.85, maxSpeed: 40, accel: 14, brake: 30, turnRate: 3.2, color: '#8a1414' });
  car.driver = 'player';
  const bike = new Vehicle(0, 0, 0, { name: 'bike', len: 1.75, wid: 0.5, maxSpeed: 6.2, accel: 3.2, brake: 6, turnRate: 4.6, color: '#1c1c1c' });
  bike.isBike = true;
  bike.driver = 'player';
  lifts.forEach((L, li) => {
    const reach = L.plateau + L.ramp + 25;
    for (const rail of map.rails || []) {
      const P = rail.pts || rail;
      // the stretch of this rail within reach of the lift, sampled every 0.5 m
      const pts = [];
      for (let i = 0; i < P.length - 1 && !(pts.length && pts.done); i++) {
        const [ax, ay] = P[i], [bx, by] = P[i + 1];
        const Ls = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(Ls / 0.5));
        for (let k = 0; k < n; k++) {
          const x = ax + (bx - ax) * k / n, y = ay + (by - ay) * k / n;
          if (Math.hypot(x - L.x, y - L.y) < reach) pts.push([x, y]);
          else if (pts.length) { pts.done = true; break; }
        }
      }
      if (pts.length < 20 || !pts.some(([x, y]) => railLiftZ_(lifts, x, y) > (zAt.profiled ? 1 : L.h * 0.9))) continue;
      const report = (how, what, x, y, z) => {
        if (!out.some((o) => o.lift === li && o.how === how)) out.push({ lift: li, how, what, x: Math.round(x), y: Math.round(y), z: Math.round(z * 10) / 10 });
      };
      for (const dir of [1, -1]) {
        const seq = dir > 0 ? pts : pts.slice().reverse();
        // on foot
        // (a stretch may begin half way up, where the rail way before it ends)
        let z = map.groundHeightAt(seq[0][0], seq[0][1], railLiftZ_(lifts, seq[0][0], seq[0][1])), px = seq[0][0], py = seq[0][1];
        for (let k = 1; k < seq.length; k++) {
          const [tx, ty] = seq[k];
          const nz = map.groundHeightAt(tx, ty, z);
          if (Math.abs(nz - z) > 0.45) { report('lopen', 'trede in het talud', tx, ty, nz); break; }
          const [rx, ry] = resolveWalker(tx, ty, 0.35, map, (tx - px) * 10, (ty - py) * 10, { kick: false }, nz);
          if (Math.hypot(rx - tx, ry - ty) > 0.25) { report('lopen', 'muur op het spoor', tx, ty, nz); break; }
          z = nz; px = tx; py = ty;
        }
        // a car and a bike: the player's vehicle collision (footprints, walls, props)
        for (const [v, how] of [[car, 'rijden'], [bike, 'fietsen']]) {
          v.x = seq[0][0]; v.y = seq[0][1];
          v.z = map.groundHeightAt(v.x, v.y, railLiftZ_(lifts, v.x, v.y));
          for (let k = 2; k < seq.length; k += 2) {
            const [tx, ty] = seq[k], [qx, qy] = seq[k - 2];
            v.angle = Math.atan2(ty - qy, tx - qx);
            v.x = tx; v.y = ty; v.speed = 0.4; v.driftX = v.driftY = v.yawVel = 0;
            v.z = map.groundHeightAt(tx, ty, v.z);
            v.airborne = false; v.vz = 0;
            resolveVehicleBuildingCollision(v, map, 1 / 60);
            v.airborne = false; v.vz = 0;
            resolvePropCollisions([v], world);
            if (Math.hypot(v.x - tx, v.y - ty) > 0.3) { report(how, 'botst op het spoor', tx, ty, v.z); break; }
          }
        }
      }
    }
  });
  return out;
}
