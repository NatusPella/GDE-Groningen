import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { makeProp, addProp, removeProp } from './breakables.js';
import { allSignals } from './junctions.js';
import { MODS } from './cheatmods.js';

// Conflict-free fixed-time controllers. Every car approach belongs to an
// axis (streams that are parallel or opposite); each axis gets its own green
// phase, split into through+right and a protected left turn where the road is
// wide enough for a turn lane (voorsorteren). Then the Groningen bike phase:
// every cyclist direction and every pedestrian crossing green at once, all
// cars red. Each green is followed by amber and an all-red clearance.
const MAIN_GREEN = 7;
const CROSS_GREEN = 5;
const LEFT_GREEN = 4;
const SPLIT_GREEN = 4.5;
const BIKE_GREEN = 5;
const CROSSING_MAIN_GREEN = 10;
const PED_GREEN = 5;
const IDLE_RED = 8;
const AMBER = 3;
const BIKE_AMBER = 2;
const ALL_RED = 1.5;
const MAX_CYCLE = 48;
const MIN_GREEN = 3;
const SAME_DOT = 0.8;
const OPPOSITE_DOT = -0.55;
const MAX_AXES = 4;

const CLUSTER_RADIUS = 30;
const MERGE_RADIUS = 45;
const APPROACH_REACH = 45;
const CAR_CATS = new Set(['major', 'normal', 'minor']);
const CAT_RANK = { major: 3, normal: 2, minor: 1, cycle: 0 };
const GRID = 64;
const PROP_RADIUS = 70;

// heads: one per approach (the traffic stream that stops at one stop line).
// x, y: stop point on the road centreline; hx, hy: travel direction of the
// traffic it controls; poles: kerb positions where a signal head stands.
let heads = [];
let controllers = [];
let grid = new Map();
let map = null;

const nodeKey = (p) => Math.round(p[0] * 10) + ',' + Math.round(p[1] * 10);

export function getTrafficLights() {
  return heads;
}

export function getTrafficControllers() {
  return controllers;
}

export function trafficSignalsNear(x, y) {
  return grid.get(Math.floor(x / GRID) + ',' + Math.floor(y / GRID)) || EMPTY;
}
const EMPTY = [];

// Light for a movement ('through' includes right turns, 'left') at this head.
function movePhase(h, move) {
  const c = h.ctrl;
  const P = c.phases[c.cur];
  if (h.bike) return P.bike ? c.part : 'red';
  if (P.bike || P.idle || P.axis !== h.axis) return 'red';
  if (P.dir !== undefined && P.dir !== h.dirGroup) return 'red';
  if (P.move !== 'all' && P.move !== move) return 'red';
  return c.part;
}

export function getTrafficLightPhase(head) {
  if (head.broken) return 'off';
  if (MODS.alwaysGreen) return 'green';   // Altijd groen (cheat): the lamps show what the cars obey
  return movePhase(head, 'through');
}

// What an AI vehicle at this head obeys: left turners wait for their arrow
// where the axis has a protected left phase.
export function trafficLightPhaseMove(head, left) {
  if (head.broken || MODS.alwaysGreen) return 'green';
  return movePhase(head, left ? 'left' : 'through');
}

// Phase for traffic travelling at `heading` through this head's controller.
export function trafficLightPhaseFor(head, heading) {
  if (head.broken || MODS.alwaysGreen) return 'green';
  const c = head.ctrl;
  let best = null, bs = 2;
  for (const a of c.approaches) {
    if (a.bike) continue;
    const s = Math.abs(Math.sin(heading - Math.atan2(a.hy, a.hx)));
    if (s < bs) { bs = s; best = a; }
  }
  return best ? movePhase(best, 'through') : 'red';
}

// Pedestrians cross with the bike phase, when no car has green.
export function pedestriansMayCross(head) {
  if (head.broken) return true;
  const c = head.ctrl;
  const P = c.phases[c.cur];
  return !!(P.bike || P.idle) && c.part === 'green';
}

// ---------------------------------------------------------------- network

let nodes = null;

function buildNodes(m) {
  nodes = new Map();
  for (const r of m.roads) {
    if (r.cat === 'foot' || r.pts.length < 2) continue;
    r.pts.forEach((p, idx) => {
      const k = nodeKey(p);
      let a = nodes.get(k);
      if (!a) nodes.set(k, a = []);
      a.push({ road: r, idx });
    });
  }
}

const isCar = (r) => CAR_CATS.has(r.cat);

// Branches leaving a node; d is the road direction pointing away from it.
function branches(k, carOnly) {
  const out = [];
  for (const e of nodes.get(k) || EMPTY) {
    if (carOnly && !isCar(e.road)) continue;
    if (e.idx > 0) out.push({ road: e.road, idx: e.idx, d: -1 });
    if (e.idx < e.road.pts.length - 1) out.push({ road: e.road, idx: e.idx, d: 1 });
  }
  return out;
}

function unit(ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1;
  return [dx / l, dy / l];
}

function nearestSegment(x, y, filter) {
  let best = null;
  for (const road of map.roadsNear(x, y, 4)) {
    if (!filter(road)) continue;
    for (let i = 0; i < road.pts.length - 1; i++) {
      const [ax, ay] = road.pts[i], [bx, by] = road.pts[i + 1];
      const dx = bx - ax, dy = by - ay;
      const l2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
      const d2 = (x - ax - dx * t) ** 2 + (y - ay - dy * t) ** 2;
      if (!best || d2 < best.d2) best = { d2, road, i, t, x: ax + dx * t, y: ay + dy * t };
    }
  }
  return best;
}

// Walk from a point on segment (i, i+1) in road direction `dir` through
// plain continuations until a junction (3+ branches) is reached.
function walkToJunction(road, i, x, y, dir, carOnly, maxDist) {
  let idx = dir > 0 ? i + 1 : i;
  let dist = Math.hypot(road.pts[idx][0] - x, road.pts[idx][1] - y);
  let r = road;
  for (let guard = 0; guard < 60 && dist <= maxDist; guard++) {
    const k = nodeKey(r.pts[idx]);
    const br = branches(k, carOnly);
    if (br.length >= 3) return { key: k, x: r.pts[idx][0], y: r.pts[idx][1], dist };
    if (br.length !== 2) return null;
    const next = br.find((b) => !(b.road === r && b.idx === idx && b.d === -dir));
    if (!next) return null;
    r = next.road; dir = next.d;
    const ni = next.idx + dir;
    dist += Math.hypot(r.pts[ni][0] - r.pts[next.idx][0], r.pts[ni][1] - r.pts[next.idx][1]);
    idx = ni;
  }
  return null;
}

// Point `dist` metres from vertex idx along road direction d (same road only).
function alongRoad(road, idx, d, dist) {
  let i = idx;
  while (true) {
    const j = i + d;
    if (j < 0 || j >= road.pts.length) {
      const p = road.pts[i], q = road.pts[i - d] || p;
      const [ux, uy] = unit(q[0], q[1], p[0], p[1]);
      return { x: p[0], y: p[1], hx: ux, hy: uy };
    }
    const p = road.pts[i], q = road.pts[j];
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (L >= dist) {
      const t = L > 1e-6 ? dist / L : 0;
      const [ux, uy] = unit(p[0], p[1], q[0], q[1]);
      return { x: p[0] + (q[0] - p[0]) * t, y: p[1] + (q[1] - p[1]) * t, hx: ux, hy: uy };
    }
    dist -= L;
    i = j;
  }
}

function junctionClearance(k) {
  let w = 0;
  for (const e of nodes.get(k) || EMPTY) if (isCar(e.road)) w = Math.max(w, e.road.width || 6);
  return Math.max(4, Math.min(14, w / 2 + 2.5));
}

// ---------------------------------------------------------------- build

function addApproach(list, o) {
  list.push({
    x: o.x, y: o.y, hx: o.hx, hy: o.hy, road: o.road, bike: !!o.bike,
    ax: o.ax, ay: o.ay, key: o.key || null, crossing: !!o.crossing,
    ctrl: null, axis: -1, dirGroup: 0, broken: false, poles: [],
  });
}

function approachesFromSignal(sig, list) {
  const bike = !!sig.bike;
  const seg = nearestSegment(sig.x, sig.y, bike ? (r) => r.cat === 'cycle' : isCar);
  if (!seg || seg.d2 > 9) return;
  const road = seg.road;
  const [ux, uy] = unit(road.pts[seg.i][0], road.pts[seg.i][1], road.pts[seg.i + 1][0], road.pts[seg.i + 1][1]);
  const atVertex = seg.t < 1e-3 ? seg.i : seg.t > 1 - 1e-3 ? seg.i + 1 : -1;
  const carOnly = !bike;

  if (!sig.crossing && atVertex >= 0) {
    const k = nodeKey(road.pts[atVertex]);
    if (branches(k, carOnly).length >= 3) {
      list.junctions.push({ key: k, x: road.pts[atVertex][0], y: road.pts[atVertex][1], rank: CAT_RANK[road.cat] ?? 0 });
      return;
    }
  }

  const dirs = road.oneway ? [1] : [1, -1];
  let best = null;
  if (!sig.crossing) {
    for (const dir of dirs) {
      const j = walkToJunction(road, seg.i, seg.x, seg.y, dir, carOnly, APPROACH_REACH);
      if (j && (!best || j.dist < best.j.dist)) best = { j, dir };
    }
  }
  if (best) {
    const { j, dir } = best;
    const clear = bike ? 2.5 : junctionClearance(j.key);
    const back = Math.max(0, clear - j.dist);
    const hx = ux * dir, hy = uy * dir;
    addApproach(list, {
      x: seg.x - hx * back, y: seg.y - hy * back, hx, hy, road, bike,
      ax: j.x, ay: j.y, key: j.key,
    });
    if (!bike) list.junctions.push({ key: j.key, x: j.x, y: j.y, rank: CAT_RANK[road.cat] ?? 0, implied: true });
    return;
  }
  // signalised crossing (or a signal with no junction in reach): stop both ways
  for (const dir of dirs) {
    const hx = ux * dir, hy = uy * dir;
    const back = bike ? 1.5 : 3;
    addApproach(list, {
      x: seg.x - hx * back, y: seg.y - hy * back, hx, hy, road, bike, crossing: true,
      ax: seg.x, ay: seg.y,
    });
  }
}

// OSM often tags only some arms of a signalised junction; every car arm
// entering a controlled junction gets a signal so no stream drives blind.
function fillJunctionArms(ctrl, list) {
  const keys = new Set(ctrl.keys);
  for (const k of keys) {
    const [kx, ky] = k.split(',').map((n) => n / 10);
    const clear = junctionClearance(k);
    for (const b of branches(k, true)) {
      const road = b.road;
      if (road.type === 'service' || road.type === 'track') continue;
      if (road.oneway && b.d > 0) continue;
      const np = road.pts[b.idx + b.d];
      const [ox, oy] = unit(road.pts[b.idx][0], road.pts[b.idx][1], np[0], np[1]);
      const inner = walkToJunction(road, b.d > 0 ? b.idx : b.idx - 1, road.pts[b.idx][0], road.pts[b.idx][1], b.d, true, 40);
      if (inner && keys.has(inner.key)) continue;
      const hx = -ox, hy = -oy;
      const covered = ctrl.approaches.some((a) => {
        if (a.bike || a.hx * hx + a.hy * hy < 0.75) return false;
        const rx = kx - a.x, ry = ky - a.y;
        const along = rx * hx + ry * hy;
        return along > -2 && along < APPROACH_REACH + 5 && Math.abs(rx * hy - ry * hx) < 8;
      });
      if (covered) continue;
      const p = alongRoad(road, b.idx, b.d, clear);
      addApproach(list, { x: p.x, y: p.y, hx: -p.hx, hy: -p.hy, road, ax: kx, ay: ky, key: k });
      const a = list[list.length - 1];
      a.ctrl = ctrl;
      ctrl.approaches.push(a);
    }
  }
}

// Is (x, y) on the asphalt of a road other than `own` (a slip road's kerb
// is the main carriageway's lane where the two merge)?
function onOtherCarriageway(x, y, own) {
  if (!map) return false;
  for (const r of map.roadsNear(x, y, 12)) {
    // (a raised deck overhead leaves room for a pole under it; a bridge at
    // street level over a canal is a carriageway like any other)
    if (r === own || r.cat === 'foot' || r.cat === 'cycle' || (r.bridge && r.z)) continue;
    const hw = (r.width || 6) / 2 + 0.4;
    const P = r.pts;
    for (let i = 0; i < P.length - 1; i++) {
      const ax = P[i][0], ay = P[i][1], ex = P[i + 1][0] - ax, ey = P[i + 1][1] - ay;
      const L2 = ex * ex + ey * ey || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / L2));
      if ((ax + ex * t - x) ** 2 + (ay + ey * t - y) ** 2 < hw * hw) return true;
    }
  }
  return false;
}

function placePoles(a) {
  const half = (a.road.width || (a.bike ? 2 : 6)) / 2;
  const rx = -a.hy, ry = a.hx;
  const off = half + (a.bike ? 0.5 : 0.8);
  const angle = Math.atan2(a.hy, a.hx);
  const arrow = !a.bike && a.ctrl.axes[a.axis] && a.ctrl.axes[a.axis].protectLeft;
  // a pole never stands in another road's lanes: step it out further, or leave it off
  const put = (side, main) => {
    for (const extra of [0, 1.5, 3, 4.5, 6, 8, 10]) {
      const x = a.x + rx * side * (off + extra), y = a.y + ry * side * (off + extra);
      if (onOtherCarriageway(x, y, a.road)) continue;
      a.poles.push({ x, y, angle, head: a, broken: false, prop: null, bike: main ? a.bike : false, arrow });
      return true;
    }
    return false;
  };
  const right = put(1, true);
  // wide one-way carriageways get a repeater on the left kerb too
  // hemmed in by lanes on both sides (a gore between slip roads): no pole,
  // the approach still has its signal phases
  if ((!right || (!a.bike && a.road.oneway && (a.road.width || 0) >= 7)) && !put(-1, !right) && !right) {
    a.poles.push({ x: a.x + rx * off, y: a.y + ry * off, angle, head: a, broken: false, prop: null, bike: a.bike, arrow, ghost: true });
  }
}

function newController(x, y) {
  return { x, y, n: 0, keys: new Set(), approaches: [], t: 0, axes: [], phases: [], cycle: 1, cur: 0, part: 'red' };
}

// Controllers closer than MERGE_RADIUS run as one: a dual carriageway's two
// nodes, or a crossing just outside a junction, never get independent
// timings that could send crossing streams on green together.
function mergeControllers() {
  for (let i = 0; i < controllers.length; i++) {
    const a = controllers[i];
    for (let j = i + 1; j < controllers.length; j++) {
      const b = controllers[j];
      if (Math.hypot(a.x - b.x, a.y - b.y) > MERGE_RADIUS) continue;
      for (const h of b.approaches) { h.ctrl = a; a.approaches.push(h); }
      for (const k of b.keys) a.keys.add(k);
      a.x = (a.x * a.n + b.x * b.n) / Math.max(1, a.n + b.n);
      a.y = (a.y * a.n + b.y * b.n) / Math.max(1, a.n + b.n);
      a.n += b.n;
      controllers.splice(j, 1);
      j = i;
    }
  }
}

function rankOf(a) {
  return (CAT_RANK[a.road.cat] ?? 0) * 100 + (a.road.width || 0);
}

// Two approaches may share a green when their streams never cross: the same
// direction, or (roughly) opposite ones - also on a road that bends through
// the junction.
export function streamsCompatible(a, b) {
  const dot = a.hx * b.hx + a.hy * b.hy;
  return dot > SAME_DOT || dot < OPPOSITE_DOT;
}

function assignAxes(c) {
  const cars = c.approaches.filter((a) => !a.bike).sort((p, q) => rankOf(q) - rankOf(p));
  const axes = [];
  for (const a of cars) {
    let best = axes.findIndex((ax) => ax.heads.every((h) => streamsCompatible(a, h)));
    if (best < 0 && axes.length < MAX_AXES) {
      axes.push({ heads: [], protectLeft: false });
      best = axes.length - 1;
    }
    if (best < 0) {
      // more stream directions than phases: share with the least-conflicting axis
      let bc = Infinity;
      axes.forEach((ax, i) => {
        const n = ax.heads.filter((h) => !streamsCompatible(a, h)).length;
        if (n < bc) { bc = n; best = i; }
      });
    }
    a.axis = best;
    axes[best].heads.push(a);
  }
  // Opposite directions on one axis: left turners would cross the oncoming
  // stream. With room for a turn lane the lefts get their own phase;
  // without, each direction gets its own green (split phasing).
  for (const ax of axes) {
    const ref = ax.heads[0];
    for (const h of ax.heads) h.dirGroup = h.hx * ref.hx + h.hy * ref.hy > 0 ? 0 : 1;
    const both = ax.heads.some((h) => h.dirGroup === 1);
    const wide = ax.heads.some((h) => !h.crossing && (h.road.width || 0) >= 9);
    const junction = ax.heads.some((h) => !h.crossing);
    ax.protectLeft = junction && both && wide;
    ax.split = junction && both && !wide;
  }
  c.axes = axes;
}

function buildPhases(c) {
  const allCrossing = c.approaches.every((a) => a.crossing || a.bike);
  const P = [];
  c.axes.forEach((ax, i) => {
    const g = i === 0 ? (allCrossing ? CROSSING_MAIN_GREEN : MAIN_GREEN) : CROSS_GREEN;
    if (ax.protectLeft) {
      P.push({ axis: i, move: 'through', g });
      P.push({ axis: i, move: 'left', g: LEFT_GREEN });
    } else if (ax.split) {
      P.push({ axis: i, move: 'all', dir: 0, g: SPLIT_GREEN });
      P.push({ axis: i, move: 'all', dir: 1, g: SPLIT_GREEN });
    } else P.push({ axis: i, move: 'all', g });
  });
  P.push({ bike: true, g: allCrossing ? PED_GREEN : BIKE_GREEN });
  if (!c.axes.length) P.push({ idle: true, g: IDLE_RED });
  const fixed = P.reduce((s, p) => s + (p.idle ? 0 : (p.bike ? BIKE_AMBER : AMBER) + ALL_RED), 0);
  const carGreen = P.reduce((s, p) => s + (p.bike || p.idle ? 0 : p.g), 0);
  const bikeGreen = P.reduce((s, p) => s + (p.bike || p.idle ? p.g : 0), 0);
  const room = MAX_CYCLE - fixed - bikeGreen;
  if (carGreen > room) {
    const k = room / carGreen;
    for (const p of P) if (!p.bike && !p.idle) p.g = Math.max(MIN_GREEN, Math.round(p.g * k * 2) / 2);
  }
  let t = 0;
  for (const p of P) {
    p.start = t;
    p.greenEnd = t + p.g;
    p.amberEnd = p.greenEnd + (p.idle ? 0 : p.bike ? BIKE_AMBER : AMBER);
    p.end = p.amberEnd + (p.idle ? 0 : ALL_RED);
    t = p.end;
  }
  c.phases = P;
  c.cycle = t;
}

function stepController(c) {
  const P = c.phases;
  let i = 0;
  while (i < P.length - 1 && c.t >= P[i].end) i++;
  const p = P[i];
  c.cur = i;
  c.part = c.t < p.greenEnd ? 'green' : c.t < p.amberEnd ? 'yellow' : 'red';
  if (p.idle) c.part = 'red';
}

export function initTrafficLights(world) {
  map = world.map;
  buildNodes(map);
  const signals = allSignals(map);
  const list = [];
  list.junctions = [];
  for (const s of signals) approachesFromSignal(s, list);

  // cluster junction nodes (and crossings) into controllers, strongest road first
  controllers = [];
  const anchors = [
    ...list.junctions,
    ...list.filter((a) => !a.key || a.bike).map((a) => ({ x: a.ax, y: a.ay, rank: a.bike ? -1 : CAT_RANK[a.road.cat] ?? 0 })),
  ].sort((a, b) => b.rank - a.rank);
  const ctrlOf = new Map();
  for (const an of anchors) {
    let c = controllers.find((o) => Math.hypot(o.x - an.x, o.y - an.y) < CLUSTER_RADIUS);
    if (!c) {
      c = newController(an.x, an.y);
      controllers.push(c);
    }
    c.x = (c.x * c.n + an.x) / (c.n + 1);
    c.y = (c.y * c.n + an.y) / (c.n + 1);
    c.n++;
    if (an.key && !an.implied) c.keys.add(an.key);
    if (an.key) ctrlOf.set(an.key, c);
  }
  for (const a of list) {
    const c = (a.key && !a.bike && ctrlOf.get(a.key)) ||
      controllers.reduce((b, o) => (!b || Math.hypot(o.x - a.ax, o.y - a.ay) < Math.hypot(b.x - a.ax, b.y - a.ay) ? o : b), null);
    if (!c) continue;
    a.ctrl = c;
    c.approaches.push(a);
  }
  mergeControllers();
  for (const c of controllers) {
    for (const a of c.approaches) if (a.key && !a.crossing && !a.bike) c.keys.add(a.key);
    fillJunctionArms(c, list);
  }
  controllers = controllers.filter((c) => c.approaches.length);

  heads = [];
  for (const c of controllers) {
    assignAxes(c);
    buildPhases(c);
    c.t = Math.random() * c.cycle;
    stepController(c);
    for (const a of c.approaches) {
      placePoles(a);
      heads.push(a);
    }
  }

  grid = new Map();
  for (const h of heads) {
    const cx = Math.floor(h.x / GRID), cy = Math.floor(h.y / GRID);
    for (let ix = cx - 1; ix <= cx + 1; ix++) {
      for (let iy = cy - 1; iy <= cy + 1; iy++) {
        const k = ix + ',' + iy;
        let a = grid.get(k);
        if (!a) grid.set(k, a = []);
        a.push(h);
      }
    }
  }
  poles = heads.flatMap((h) => h.poles);
  turnArrows = buildTurnArrowList();
  if (instanced) disposeInstanced();
}

// AI traffic reads the lights itself (see trafficLightLimit in vehicle.js).
// In the rain the car phases run faster (w.wet 0..1), so the Groningen bike
// phase comes round sooner; the bike green itself is never shortened.
export const RAIN_CAR_SPEEDUP = 0.4;
export function trafficClockRate(phase, wet) {
  if (!phase || phase.bike || phase.idle) return 1;
  return 1 + RAIN_CAR_SPEEDUP * Math.max(0, Math.min(1, (wet - 0.2) / 0.8));
}

export function updateTrafficLights(dt, world) {
  const wet = (world && world.weather && world.weather.wet) || 0;
  for (const c of controllers) {
    c.t = (c.t + dt * trafficClockRate(c.phases[c.cur], wet)) % c.cycle;
    stepController(c);
  }
}

// A knocked-down head stops controlling its approach until it respawns.
export function streamTrafficLightProps(world, px, py) {
  for (const pole of poles) {
    if (pole.ghost) continue;
    const near = Math.abs(pole.x - px) < PROP_RADIUS && Math.abs(pole.y - py) < PROP_RADIUS;
    if (!near || pole.broken) {
      if (pole.prop) { removeProp(pole.prop); pole.prop = null; }
      continue;
    }
    if (pole.prop) continue;
    const prop = makeProp('trafficlight', pole.x, pole.y, {
      onBreak: () => { pole.broken = true; pole.prop = null; refreshBroken(pole.head); },
      onRestore: () => { pole.broken = false; refreshBroken(pole.head); },
      makeMesh: () => {
        const g = buildTrafficLightMesh3D();
        setTrafficLightPhase3D(g, 'off');
        g.rotation.y = -pole.angle;
        if (pole.bike) g.scale.setScalar(BIKE_SCALE);
        return g;
      },
    });
    if (addProp(prop)) pole.prop = prop;
  }
}

function refreshBroken(head) {
  head.broken = head.poles[0].broken;
  matricesDirty = true;
}

// ---------------------------------------------------------------- turn arrows

// Painted lane arrows before the stop line of an approach with a protected
// left phase: left arrow in the inner lane, straight-ahead in the outer one.
let turnArrows = [];

function buildTurnArrowList() {
  const out = [];
  for (const h of heads) {
    if (h.bike || h.crossing || !h.ctrl.axes[h.axis] || !h.ctrl.axes[h.axis].protectLeft) continue;
    const w = h.road.width || 9;
    const half = h.road.oneway ? w / 2 : w / 2;
    const laneW = h.road.oneway ? w / 2 : half / 2;
    const rx = -h.hy, ry = h.hx;
    const inner = h.road.oneway ? -laneW / 2 : laneW / 2;
    const outer = h.road.oneway ? laneW / 2 : laneW * 1.5;
    for (const back of [4, 16]) {
      const bx = h.x - h.hx * back, by = h.y - h.hy * back;
      out.push({ kind: 0, x: bx + rx * inner, y: by + ry * inner, angle: Math.atan2(h.hy, h.hx) });
      out.push({ kind: 1, x: bx + rx * outer, y: by + ry * outer, angle: Math.atan2(h.hy, h.hx) });
    }
  }
  return out;
}

function arrowGeometry(kind) {
  // flat on the road, pointing along +X; left = -Z in three (map north of east)
  const pts = kind === 0
    ? [[-2.2, -0.12], [0.06, -0.12], [0.06, -0.7], [-0.15, -0.7], [0.18, -1.1], [0.51, -0.7], [0.3, -0.7], [0.3, 0.12], [-2.2, 0.12]]
    : [[-2.2, -0.12], [0.6, -0.12], [0.6, -0.42], [1.8, 0], [0.6, 0.42], [0.6, 0.12], [-2.2, 0.12]];
  const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2);
  return g;
}

// ---------------------------------------------------------------- rendering

const PHASE_COLORS = { green: 0x2ecc40, yellow: 0xf1a90f, red: 0xe74c3c };
const LAMP_ORDER = ['red', 'yellow', 'green'];
const BIKE_SCALE = 0.72;
const POLE_MAT = new THREE.MeshLambertMaterial({ color: 0x8e9193 });
const HOUSING_MAT = new THREE.MeshLambertMaterial({ color: 0x17191b });
const LAMP_MAT = new THREE.MeshBasicMaterial({ color: 0xffffff });
const ARROW_LAMP_MAT = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
const MARK_MAT = new THREE.MeshBasicMaterial({ color: 0xe8e6e0, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -30, depthWrite: false, transparent: true, opacity: 0.9 });
const LAMP_OFF = Object.fromEntries(LAMP_ORDER.map((p) => [p, new THREE.MeshBasicMaterial({ color: new THREE.Color(PHASE_COLORS[p]).multiplyScalar(0.16) })]));
const LAMP_ON = Object.fromEntries(LAMP_ORDER.map((p) => [p, new THREE.MeshBasicMaterial({ color: PHASE_COLORS[p] })]));
const OFF_COLORS = Object.fromEntries(LAMP_ORDER.map((p) => [p, new THREE.Color(PHASE_COLORS[p]).multiplyScalar(0.16)]));
let glow = 1;

// Lit lamps are pushed above 1.0 at night so the bloom pass picks them up.
export function setTrafficLightGlow(k) {
  if (Math.abs(k - glow) < 0.02) return;
  glow = k;
  for (const p of LAMP_ORDER) LAMP_ON[p].color.setHex(PHASE_COLORS[p]).multiplyScalar(k);
  colorsDirty = true;
}

// Head geometry in local space: the controlled traffic drives along +X, so
// the lenses face -X, toward it.
const POLE_GEO = new THREE.CylinderGeometry(0.07, 0.08, 3.0, 8).translate(0, 1.5, 0);
const HOUSING_GEO = new THREE.BoxGeometry(0.28, 1.0, 0.34).translate(0, 3.35, 0);
const PLATE_GEO = new THREE.BoxGeometry(0.03, 1.22, 0.56).translate(0.155, 3.35, 0);
const LAMP_GEOS = LAMP_ORDER.map((_, i) => new THREE.CircleGeometry(0.115, 14).rotateY(-Math.PI / 2).translate(-0.145, 3.66 - i * 0.31, 0));
const VISOR_GEO = mergeVisors();
// the extra left-arrow lamp of a protected left turn, beside the main head
const ARROW_HOUSING_GEO = new THREE.BoxGeometry(0.26, 0.36, 0.3).translate(0, 3.05, -0.34);
const ARROW_LAMP_GEO = (() => {
  const s = new THREE.Shape([[0.09, 0.03], [-0.02, 0.03], [-0.02, 0.08], [-0.1, 0], [-0.02, -0.08], [-0.02, -0.03], [0.09, -0.03]].map(([u, v]) => new THREE.Vector2(u, v)));
  const g = new THREE.ShapeGeometry(s);
  // shape u -> -Z (the driver's left), v -> +Y; lens plane just in front of the housing
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i), v = pos.getY(i);
    pos.setXYZ(i, -0.135, 3.05 + v, -0.34 + u);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
})();

function mergeVisors() {
  const parts = LAMP_ORDER.map((_, i) => new THREE.BoxGeometry(0.14, 0.02, 0.26).translate(-0.21, 3.78 - i * 0.31, 0));
  const pos = [], nrm = [], idx = [];
  let base = 0;
  for (const g of parts) {
    pos.push(...g.attributes.position.array);
    nrm.push(...g.attributes.normal.array);
    for (const k of g.index.array) idx.push(k + base);
    base += g.attributes.position.count;
    g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setIndex(idx);
  return geo;
}

let poles = [];
// signal poles as { x, y } (spotcheck.js keeps them off the carriageway)
export function getSignalPoles() { return poles; }
let instanced = null;
let matricesDirty = false;
let colorsDirty = true;

function disposeInstanced() {
  for (const m of instanced.parts) m.parent?.remove(m);
  for (const m of instanced.lamps) m.parent?.remove(m);
  for (const m of instanced.arrowParts) m.parent?.remove(m);
  for (const m of instanced.marks) m.parent?.remove(m);
  instanced = null;
}

function buildInstanced(scene) {
  const n = Math.max(1, poles.length);
  const mk = (geo, mat, count = poles.length) => {
    const m = new THREE.InstancedMesh(geo, mat, Math.max(1, count));
    m.count = count;
    m.frustumCulled = false;
    m.matrixAutoUpdate = false;
    scene.add(m);
    return m;
  };
  instanced = {
    parts: [mk(POLE_GEO, POLE_MAT), mk(HOUSING_GEO, HOUSING_MAT), mk(PLATE_GEO, HOUSING_MAT), mk(VISOR_GEO, HOUSING_MAT)],
    lamps: LAMP_GEOS.map((g) => mk(g, LAMP_MAT)),
    arrowParts: [mk(ARROW_HOUSING_GEO, HOUSING_MAT), mk(ARROW_LAMP_GEO, ARROW_LAMP_MAT)],
    marks: [0, 1].map((k) => mk(arrowGeometry(k), MARK_MAT, turnArrows.filter((a) => a.kind === k).length)),
  };
  const white = new THREE.Color(1, 1, 1);
  for (const m of instanced.lamps) for (let i = 0; i < n; i++) m.setColorAt(i, white);
  for (let i = 0; i < n; i++) instanced.arrowParts[1].setColorAt(i, white);
  for (const p of poles) p.shown = null;
  matricesDirty = true;
  colorsDirty = true;
  writeMarks();
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

function writeMarks() {
  const counters = [0, 0];
  for (const a of turnArrows) {
    const gz = map && map.spawnZ ? map.spawnZ(a.x, a.y) : 0;
    _p.set(a.x, gz + 0.04, a.y);
    _q.setFromAxisAngle(_up, -a.angle);
    _s.setScalar(1);
    _m.compose(_p, _q, _s);
    instanced.marks[a.kind].setMatrixAt(counters[a.kind]++, _m);
  }
  for (const m of instanced.marks) m.instanceMatrix.needsUpdate = true;
}

function writeMatrices() {
  poles.forEach((pole, i) => {
    // junctions on a ramp of the ring stand on its surface (elevation.js)
    if (pole.gz === undefined) pole.gz = map && map.spawnZ && map.offStreetLevel(pole.x, pole.y) ? map.spawnZ(pole.x, pole.y) : 0;
    _p.set(pole.x, pole.gz, pole.y);
    _q.setFromAxisAngle(_up, -pole.angle);
    _s.setScalar(pole.broken || pole.ghost ? 0 : pole.bike ? BIKE_SCALE : 1);
    _m.compose(_p, _q, _s);
    for (const m of instanced.parts) m.setMatrixAt(i, _m);
    for (const m of instanced.lamps) m.setMatrixAt(i, _m);
    if (!pole.arrow) {
      _s.setScalar(0);
      _m.compose(_p, _q, _s);
    }
    for (const m of instanced.arrowParts) m.setMatrixAt(i, _m);
  });
  for (const m of [...instanced.parts, ...instanced.lamps, ...instanced.arrowParts]) m.instanceMatrix.needsUpdate = true;
  matricesDirty = false;
}

const _c = new THREE.Color();

// Called once per frame by the renderer: all heads live in a handful of
// instanced meshes, only lamp colours change.
export function syncTrafficLights3D(scene) {
  if (!poles.length) return;
  if (!instanced) buildInstanced(scene);
  if (matricesDirty) writeMatrices();
  let changed = false, arrowChanged = false;
  poles.forEach((pole, i) => {
    const phase = getTrafficLightPhase(pole.head);
    const left = pole.arrow && !pole.head.broken ? movePhase(pole.head, 'left') : 'off';
    if (!colorsDirty && pole.shown === phase && pole.shownLeft === left) return;
    if (colorsDirty || pole.shown !== phase) {
      changed = true;
      LAMP_ORDER.forEach((p, k) => {
        if (p === phase) _c.setHex(PHASE_COLORS[p]).multiplyScalar(glow);
        else _c.copy(OFF_COLORS[p]);
        instanced.lamps[k].setColorAt(i, _c);
      });
    }
    if (pole.arrow && (colorsDirty || pole.shownLeft !== left)) {
      arrowChanged = true;
      if (left === 'green' || left === 'yellow') _c.setHex(PHASE_COLORS[left]).multiplyScalar(glow);
      else _c.copy(OFF_COLORS.red);
      instanced.arrowParts[1].setColorAt(i, _c);
    }
    pole.shown = phase;
    pole.shownLeft = left;
  });
  if (changed) for (const m of instanced.lamps) m.instanceColor.needsUpdate = true;
  if (arrowChanged || colorsDirty) instanced.arrowParts[1].instanceColor.needsUpdate = true;
  colorsDirty = false;
}

// Traffic light nodes sit on the road centerline in OSM; stand the pole on
// the kerb next to it instead, facing along the road.
export function placeTrafficLight(light, map) {
  let best = null;
  for (const road of map.roadsNear(light.x, light.y, 12)) {
    for (let i = 0; i < road.pts.length - 1; i++) {
      const [ax, ay] = road.pts[i], [bx, by] = road.pts[i + 1];
      const dx = bx - ax, dy = by - ay;
      const len2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((light.x - ax) * dx + (light.y - ay) * dy) / len2));
      const px = ax + dx * t, py = ay + dy * t;
      const d2 = (light.x - px) ** 2 + (light.y - py) ** 2;
      if (!best || d2 < best.d2) best = { d2, dx, dy, half: (road.width || 6) / 2 };
    }
  }
  if (!best) return { x: light.x, y: light.y, angle: 0 };
  const len = Math.hypot(best.dx, best.dy) || 1;
  const nx = -best.dy / len, ny = best.dx / len;
  const off = best.half + 0.9;
  return { x: light.x + nx * off, y: light.y + ny * off, angle: Math.atan2(best.dy, best.dx) };
}

// Standalone head (used for the tumbling copy of a knocked-down signal).
export function buildTrafficLightMesh3D() {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(POLE_GEO, POLE_MAT));
  group.add(new THREE.Mesh(HOUSING_GEO, HOUSING_MAT));
  group.add(new THREE.Mesh(PLATE_GEO, HOUSING_MAT));
  group.add(new THREE.Mesh(VISOR_GEO, HOUSING_MAT));
  const lamps = {};
  LAMP_ORDER.forEach((phase, i) => {
    const lamp = new THREE.Mesh(LAMP_GEOS[i], LAMP_OFF[phase]);
    group.add(lamp);
    lamps[phase] = [lamp];
  });
  group.userData.lamps = lamps;
  group.userData.phase = null;
  return group;
}

export function setTrafficLightPhase3D(group, phase) {
  if (group.userData.phase === phase) return;
  group.userData.phase = phase;
  for (const p of LAMP_ORDER) {
    for (const lamp of group.userData.lamps[p]) lamp.material = p === phase ? LAMP_ON[p] : LAMP_OFF[p];
  }
}
