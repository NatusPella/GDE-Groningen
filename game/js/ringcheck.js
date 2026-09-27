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
import { inPassage } from './passages.js';
import { elevWallContact } from './elevation.js';
import { findProps, makeProp, resolvePropCollisions } from './breakables.js';
import { getSignalPoles, streamTrafficLightProps } from './trafficlights.js';
import { streamFlitspaalProps } from './flitspaal.js';
import { streamTreeProps } from './treeprops.js';
import { cellPropSpots, CLUTTER_CELL } from './cityprops.js';
import { Vehicle, resolveVehicleBuildingCollision, resolveBoomCollisions } from './vehicle.js';
import { createRace, updateRace, disposeRace } from './racers.js';

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
      if (map.elev && elevWallContact(map.elev, x, y, zz, REACH)) hit(q, 'muur', 'keerwand/vangrail', x, y, zz);
      if (Math.abs(zz) > 3) continue;
      for (const t of map.treesNear(x, y, 1)) if (Math.hypot(t[0] - x, t[1] - y) < 0.3 + REACH) hit(q, 'boom', 'straatboom', x, y, zz);
      for (const p of findProps(x, y, 2)) if (!p.water && Math.abs((p.z || 0) - zz) < 3 && capsuleDist(x, y, p) < REACH) hit(q, 'obstakel', p.kind, x, y, zz);
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
  for (const r of world.map.roads) {
    if (r.cat === 'foot' || r.cat === 'cycle' || !(r.z || RING_REFS.has(r.ref))) continue;
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
