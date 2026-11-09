// De verkeers-AI: pure pursuit over de kruispuntgraaf (#497).
// Letterlijk uit vehicle.js gehaald. Dit blok kent alleen de weg (map/roads, kruispunten,
// verkeerslichten) en het voertuig als staatje daarop; de voertuigfysica blijft in vehicle.js.

import { normalizeAngle, clamp, lerp, closestPointOnSegment } from '../util.js';
import { gridItems } from '../spatialgrid.js';
import { busMagWeg, stepRunner, pointAt as linePointAt } from '../busroutes.js';
import { trafficSignalsNear, trafficLightPhaseMove } from '../trafficlights.js';
import { roadPriority, junctionArm } from '../junctions.js';
import { sirenYield, zebraSpeedLimit } from '../trafficyield.js';
import { bridgeSpeedLimit } from '../movablebridges.js';
import { vehicleHooks } from '../vehiclehooks.js';
import { hoofdspeler } from '../players.js';
import { motorRoadAllowed } from '../motortraffic.js';
import { vehiclesNear } from '../vehicleindex.js';
import { consumePathBudget } from '../pathbudget.js';

// Wat dit blok uit vehicle.js nodig heeft, komt van buiten: vehicle.js geeft het hier bij het laden
// door met setTrafficHost. Zo importeert deze module niets terug en blijft de modulecyclus op 0.
// De rijstrookhulpen (laneOffset, lanePoint, busLaneUser) worden ook door de spawnkant van
// vehicle.js gebruikt en blijven daarom daar; hier zijn ze alleen nodig, geen eigendom van dit blok.
let host = null;
let busLaneUser = null, busSpawnPoint = null, lanePoint = null, laneOffset = null, maxCurvature = null, lateralGrip = null;
export function setTrafficHost(h) {
  host = h;
  busLaneUser = h.busLaneUser;
  busSpawnPoint = h.busSpawnPoint;
  lanePoint = h.lanePoint;
  laneOffset = h.laneOffset;
  maxCurvature = h.maxCurvature;
  lateralGrip = h.lateralGrip;
}
// liveBussen staat niet in de lijst hierboven maar op de host: main.js zet hem tijdens het spelen
// via vehicle.js setLiveBussen, dus een momentopname bij het laden zou de AI op "geen live bussen"
// vastzetten. Daarom leest de busregel in updateTrafficAI host.liveBussen (een getter in vehicle.js),
// en dat is meteen de enige regel uit dit blok die niet letterlijk is overgenomen.

// --- traffic AI: pure-pursuit path following over a junction graph built
// from shared OSM nodes (road ends as well as mid-road crossings). ---

const graphCache = new WeakMap();
const nodeKey = (p) => Math.round(p[0] * 10) + ',' + Math.round(p[1] * 10);

// The nodes (shared vertices) of the roads by road. The city's roads are indexed at once; a road that
// streamed in with a province tile (it lives in the map's road grid, not in map.roads) is indexed the
// first time it is asked for, together with every road that touches one of its vertices, so junctions
// on the tiles have their arms: turns, routes and the priority rules (#265).
class LazyNodeMap extends Map {
  constructor(map, nodes) { super(); this.map = map; this.nodes = nodes; this.expanded = new Set(); }
  register(r) {
    if (super.has(r)) return;
    super.set(r, r.pts.map((p, idx) => {
      const k = nodeKey(p);
      let n = this.nodes.get(k);
      if (!n) { n = []; this.nodes.set(k, n); }
      n.push({ road: r, idx });
      return n;
    }));
  }
  get(r) {
    if (!super.has(r)) {
      if (!r || !r.pts || r.pts.length < 2 || r.cat === 'foot' || !this.map.roadsNear) return undefined;
      this.register(r);
    }
    if (!this.expanded.has(r)) {
      this.expanded.add(r);
      for (const p of r.pts) for (const o of this.map.roadsNear(p[0], p[1], 3)) if (o.cat !== 'foot' && o.pts.length > 1) this.register(o);
    }
    return super.get(r);
  }
}

function roadGraph(map) {
  let g = graphCache.get(map);
  // Alleen een wegwijziging hoeft de graaf opnieuw; niet elke tegel-add (geoVer).
  const ver = map._roadVer !== undefined ? map._roadVer : map.geoVer;
  if (g && g.ver === ver) return g;
  // Een gestroomde tegel voegt hooguit een paar wegen toe en de LazyNodeMap kent
  // ze bij het eerste gebruik al. De dure herbouw (alle wegen plus de
  // korte-einden-lus) wacht daarom tot de tegelwachtrij leeg is: geen halve
  // seconde hapering per tegel midden in het spel of de opening (#4).
  if (g && typeof document !== 'undefined' && document.body && document.body.classList.contains('intro-montage')) return g; // film: oude graaf is goed genoeg
  if (g && map.tileQueue && map.tileQueue.items && map.tileQueue.items.length) return g;
  const nodes = new Map();
  const nodeOf = new LazyNodeMap(map, nodes);
  // platte testkaarten zonder raster vallen terug op hun eigen wegenlijst
  const drivable = (map.orderedRoads ? map.orderedRoads() : map['roads'] || []).filter((r) => r.cat !== 'foot' && r.pts.length > 1);
  for (const r of drivable) nodeOf.register(r);
  nodeOf.expanded = new Set(drivable);
  // OSM ways that should meet sometimes stop a metre or two short
  for (const r of drivable) {
    const arr = nodeOf.get(r);
    for (const idx of [0, r.pts.length - 1]) {
      if (arr[idx].length > 1) continue;
      const p = r.pts[idx];
      let best = null, bestD2 = 16;
      for (const o of map.roadsNear(p[0], p[1], 4)) {
        const on = nodeOf.get(o);
        if (o === r || !on) continue;
        o.pts.forEach((q, j) => {
          const d2 = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2;
          if (d2 < bestD2) { bestD2 = d2; best = on[j]; }
        });
      }
      if (best) { best.push({ road: r, idx }); arr[idx] = best; }
    }
  }
  g = { nodeOf, ver, geoVer: map.geoVer };
  graphCache.set(map, g);
  return g;
}

function roadNode(map, road, i) {
  const arr = roadGraph(map).nodeOf.get(road);
  return arr ? arr[i] : null;
}

function isJunction(map, road, i) {
  if (i === 0 || i === road.pts.length - 1) return true;
  const node = roadNode(map, road, i);
  return !!node && node.length > 1;
}

export function canUseRoad(v, r) {
  if (r.cat === 'foot') return false;
  const small = v.isBike || v.isScooter;
  if (r.cat === 'cycle' && !small) return false;
  if (v.isMotor && !motorRoadAllowed(v.model, r)) return false; // brommers and motors keep off the fietspad
  if (r.busOnly && !busLaneUser(v)) return false;
  if (v.isBus && !busMagWeg(r, v.busRun ? v.busRun.line : null, v.model.wid)) return false;   // #322: een bus blijft op zijn lijn of het busnet
  return small || r.width >= v.model.wid + 1.1;
}

function segHeading(road, i, j) {
  const a = road.pts[i], b = road.pts[j];
  return Math.atan2(b[1] - a[1], b[0] - a[0]);
}

function chooseTurn(v, map, road, at, dir, rng, goal) {
  const node = roadNode(map, road, at) || [{ road, idx: at }];
  const inHeading = segHeading(road, at - dir, at);
  const opts = [];
  for (const e of node) {
    if (e.road !== road && !canUseRoad(v, e.road)) continue;
    for (const d of [1, -1]) {
      const j = e.idx + d;
      if (j < 0 || j >= e.road.pts.length) continue;
      if (e.road.oneway && d < 0 && !(v.isBus && e.road.busContra)) continue;
      if (e.road === road && e.idx === at && d === -dir) continue;
      opts.push({ road: e.road, dir: d, idx: e.idx, turn: normalizeAngle(segHeading(e.road, e.idx, j) - inHeading) });
    }
  }
  let pool = opts.filter((o) => Math.abs(o.turn) < 2);
  if (!pool.length) pool = opts.filter((o) => Math.abs(o.turn) < 2.6);
  if (!pool.length) pool = opts;
  if (!pool.length) return { road, dir: -dir, idx: at, uturn: true, from: road, at };

  let pick = pool[pool.length - 1];
  if (goal) {
    const p = road.pts[at];
    const gx = goal.x - p[0], gy = goal.y - p[1], gl = Math.hypot(gx, gy) || 1;
    let best = -Infinity;
    for (const o of pool) {
      const h = segHeading(o.road, o.idx, o.idx + o.dir);
      const score = (Math.cos(h) * gx + Math.sin(h) * gy) / gl + rng() * 0.15;
      if (score > best) { best = score; pick = o; }
    }
    if (best < -0.4 && !road.oneway) pick = { road, dir: -dir, idx: at, uturn: true };
  } else {
    const small = v.isBike || v.isScooter;
    const weights = pool.map((o) => {
      let w = Math.abs(o.turn) < 0.45 ? 3 : 1;
      if (v.isBus && (o.road.cat === 'major' || o.road.cat === 'normal')) w *= 3;
      if (v.isBus && o.road.busOnly) w *= 4;
      if (small && o.road.cat === 'cycle') w *= 2;
      return w;
    });
    let r = rng() * weights.reduce((a, b) => a + b, 0);
    for (let k = 0; k < pool.length; k++) {
      r -= weights[k];
      if (r <= 0) { pick = pool[k]; break; }
    }
  }
  return { road: pick.road, dir: pick.dir, idx: pick.idx, uturn: !!pick.uturn, from: road, at };
}

function nextTurn(v, map, rng, goal, k, road, at, dir) {
  let t = v.plan[k];
  if (!t || t.from !== road || t.at !== at) {
    t = chooseTurn(v, map, road, at, dir, rng, goal);
    v.plan.length = k;
    v.plan.push(t);
  }
  return t;
}

// A* over the junction graph to the drivable point nearest (gx, gy); the
// result replaces v.plan with one entry per junction along the route.
const ROUTE_MAX_EXPANSIONS = 6000;

function findRoute(v, map, gx, gy) {
  // een bus mikt op de dichtstbijzijnde weg waar hij mag rijden, niet op het parallelle straatje naast zijn lijn (#322)
  const target = (v.isBus && busSpawnPoint(map, v.busRun ? v.busRun.line : null, gx, gy, 60)) || map.nearestRoadPoint(gx, gy, 300, true);
  if (!target || !canUseRoad(v, target.road)) return false;
  const tp = target.road.pts;
  let ti = 0, tBest = Infinity;
  tp.forEach((p, i) => { const d = Math.hypot(p[0] - target.x, p[1] - target.y); if (d < tBest) { tBest = d; ti = i; } });
  const goalNode = roadNode(map, target.road, ti);
  const { nodeOf } = roadGraph(map);
  // a streamed tile's road is not in the city road graph: no route from or over it
  if (!nodeOf.get(v.road)) return false;
  const stateKey = (road, idx, dir) => (isJunction(map, road, idx) && nodeOf.get(road) ? nodeOf.get(road)[idx] : road.pts[idx][0] + ',' + road.pts[idx][1] + ',' + dir);
  const b = v.segIdx + v.dir;
  const start = { road: v.road, idx: b, dir: v.dir, g: Math.hypot(v.road.pts[b][0] - v.x, v.road.pts[b][1] - v.y), prev: null };
  const h = (p) => Math.hypot(p[0] - tp[ti][0], p[1] - tp[ti][1]);
  start.f = start.g + h(v.road.pts[b]);
  const open = [start];
  const push = (x) => {
    open.push(x);
    for (let i = open.length - 1; i > 0;) {
      const p = (i - 1) >> 1;
      if (open[p].f <= open[i].f) break;
      [open[p], open[i]] = [open[i], open[p]];
      i = p;
    }
  };
  const pop = () => {
    const top = open[0], last = open.pop();
    if (open.length) {
      open[0] = last;
      for (let i = 0; ;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < open.length && open[l].f < open[m].f) m = l;
        if (r < open.length && open[r].f < open[m].f) m = r;
        if (m === i) break;
        [open[m], open[i]] = [open[i], open[m]];
        i = m;
      }
    }
    return top;
  };
  const best = new Map([[stateKey(v.road, b, v.dir), start.g]]);
  let found = null;
  for (let n = 0; n < ROUTE_MAX_EXPANSIONS && open.length; n++) {
    const cur = pop();
    const curNodes = nodeOf.get(cur.road);
    if (!curNodes) continue;
    const node = curNodes[cur.idx];
    if (node === goalNode) { found = cur; break; }
    const exits = isJunction(map, cur.road, cur.idx) ? node : [{ road: cur.road, idx: cur.idx }];
    for (const e of exits) {
      if (!canUseRoad(v, e.road)) continue;
      for (const d of [1, -1]) {
        if (!isJunction(map, cur.road, cur.idx) && d !== cur.dir) continue;
        const j = e.idx + d;
        if (j < 0 || j >= e.road.pts.length) continue;
        // a pursuing police car may take a one-way street the wrong way
        const wrongWay = e.road.oneway && d < 0;
        if (wrongWay && !v.isPolice) continue;
        const a = e.road.pts[e.idx], q = e.road.pts[j];
        const g = cur.g + Math.hypot(q[0] - a[0], q[1] - a[1]) * (wrongWay ? 1.6 : 1) + (e.road === cur.road && d === -cur.dir ? 25 : 0);
        const key = stateKey(e.road, j, d);
        if (g >= (best.get(key) ?? Infinity)) continue;
        best.set(key, g);
        push({ road: e.road, idx: j, dir: d, g, f: g + h(q), prev: cur, exitIdx: e.idx });
      }
    }
  }
  if (!found) return false;
  const steps = [];
  for (let s = found; s.prev; s = s.prev) steps.push(s);
  steps.reverse();
  const plan = [];
  let arrRoad = v.road, arrIdx = b;
  for (const st of steps) {
    if (isJunction(map, arrRoad, arrIdx)) {
      plan.push({ road: st.road, dir: st.dir, idx: st.exitIdx, uturn: false, from: arrRoad, at: arrIdx });
    }
    arrRoad = st.road; arrIdx = st.idx;
  }
  v.plan = plan;
  v.routeEnd = { road: target.road, idx: ti };
  return true;
}

// Voorsorteren: on a wide road, a car that turns left at the next junction
// moves to the inner lane for the last 40 m.
function wantsTurnLane(v) {
  const t = v.plan && v.plan[0];
  if (!t || t.from !== v.road || t.uturn) return false;
  const r = v.road;
  if ((r.width || 0) < (r.oneway ? 7 : 9)) return false;
  const p = r.pts[t.at];
  const d = Math.hypot(p[0] - v.x, p[1] - v.y);
  if (d > 40 || d < 3) return false;
  const prev = r.pts[t.at - v.dir], next = t.road.pts[t.idx + t.dir];
  if (!prev || !next) return false;
  const inH = Math.atan2(p[1] - prev[1], p[0] - prev[0]);
  const q = t.road.pts[t.idx];
  const outH = Math.atan2(next[1] - q[1], next[0] - q[0]);
  return normalizeAngle(outH - inH) < -0.5;
}

// Move segIdx forward once the vehicle has passed the end of its segment, or
// is already closer to the next one (a corner that got cut).
function advanceAlongRoad(v, map, rng, goal) {
  for (let k = 0; k < 6; k++) {
    const road = v.road, b = v.segIdx + v.dir;
    const A = lanePoint(map, road, v.segIdx, v.dir, v, _la), B = lanePoint(map, road, b, v.dir, v, _lb);
    const cur = closestPointOnSegment(v.x, v.y, A[0], A[1], B[0], B[1], _cpA);
    let t = null, nRoad = road, nDir = v.dir, nIdx = b;
    if (isJunction(map, road, b)) {
      t = nextTurn(v, map, rng, goal, 0, road, b, v.dir);
      nRoad = t.road; nDir = t.dir; nIdx = t.idx;
    }
    const C = lanePoint(map, nRoad, nIdx, nDir, v, _lc), D = lanePoint(map, nRoad, nIdx + nDir, nDir, v, _ld);
    const nxt = closestPointOnSegment(v.x, v.y, C[0], C[1], D[0], D[1], _cpB);
    if (cur.t < 1 && !(nxt.t > 0 && nxt.dist2 < cur.dist2)) break;
    if (t) {
      v.plan.shift();
      v.deadEndBounces = t.uturn ? (v.deadEndBounces || 0) + 1 : 0;
    }
    v.road = nRoad; v.dir = nDir; v.segIdx = nIdx;
  }
}

const PATH_LEN = 45;
const PLAN_DEPTH = 4;

// #652: één vaste buffer per voertuig in plaats van een nieuwe padpolyline per
// frame. De puntobjecten (v._path) worden hergebruikt en de lane-punten,
// segmentprojecties en tussenstanden schrijven in deze scratch-objecten; alleen
// de eerste frame van een voertuig alloceert nog. trafficPathStats() is de
// teller voor de meting.
const PATH_STATS = { builds: 0, newPoints: 0 };
export function trafficPathStats() { return { ...PATH_STATS }; }
const _la = [0, 0], _lb = [0, 0], _lc = [0, 0], _ld = [0, 0];
const _cpA = { x: 0, y: 0, t: 0, dist2: 0 }, _cpB = { x: 0, y: 0, t: 0, dist2: 0 }, _cpP = { x: 0, y: 0, t: 0, dist2: 0 };
const _prA = { s: 0, lat: 0, tx: 0, ty: 0 }, _prB = { s: 0, lat: 0, tx: 0, ty: 0 }, _prC = { s: 0, lat: 0, tx: 0, ty: 0 }, _prD = { s: 0, lat: 0, tx: 0, ty: 0 };

// Lane-offset polyline ahead of the vehicle, following its planned turns.
// Points flagged j are junction nodes. #652: it fills the vehicle's own buffer
// (v._path) with reused point objects instead of building a new array and a new
// object per point every frame.
function buildPathInto(v, map, rng, goal) {
  let road = v.road, dir = v.dir, idx = v.segIdx + dir;
  const A = lanePoint(map, road, v.segIdx, dir, v, _la), B = lanePoint(map, road, idx, dir, v, _lb);
  const start = closestPointOnSegment(v.x, v.y, A[0], A[1], B[0], B[1], _cpA);
  const path = v._path || (v._path = []);
  let n = 0;
  const point = () => { let p = path[n]; if (!p) { p = path[n] = {}; PATH_STATS.newPoints++; } n++; return p; };
  const p0 = point();
  p0.x = start.x; p0.y = start.y; p0.s = 0; p0.j = false; p0.r = undefined; p0.i = undefined; p0.node = undefined; p0.from = undefined; p0.fromDir = undefined;
  let px = start.x, py = start.y, s = 0, k = 0;
  const push = (junction) => {
    lanePoint(map, road, idx, dir, v, _lc);
    s += Math.hypot(_lc[0] - px, _lc[1] - py);
    px = _lc[0]; py = _lc[1];
    const p = point();
    p.x = px; p.y = py; p.s = s; p.j = junction; p.r = road; p.i = idx;
    p.node = undefined; p.from = undefined; p.fromDir = undefined;
    return p;
  };
  for (let guard = 0; guard < 120 && s < PATH_LEN; guard++) {
    const junction = isJunction(map, road, idx);
    const jp = push(junction);
    if (junction) {
      jp.node = roadNode(map, road, idx);
      jp.from = road;
      jp.fromDir = dir;
      if (k >= PLAN_DEPTH) break;
      const t = nextTurn(v, map, rng, goal, k++, road, idx, dir);
      road = t.road; dir = t.dir; idx = t.idx;
      push(false);
    }
    idx += dir;
  }
  path.length = n;
  PATH_STATS.builds++;
  return path;
}

const _pa = [0, 0], _pb = [0, 0], _pc = [0, 0];
const _nearVeh = []; // #653: hergebruikte kandidatenlijst
function pointAlongInto(path, s, out) {
  for (let i = 1; i < path.length; i++) {
    if (path[i].s < s) continue;
    const a = path[i - 1], b = path[i];
    const span = b.s - a.s;
    const t = span > 1e-6 ? (s - a.s) / span : 0;
    out[0] = lerp(a.x, b.x, t); out[1] = lerp(a.y, b.y, t);
    return out;
  }
  const last = path[path.length - 1];
  out[0] = last.x; out[1] = last.y;
  return out;
}



function projectOnPathInto(path, x, y, out) {
  let bestI = -1, bestT = 0, bestD2 = Infinity;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    if (b.s - a.s < 0.05) continue;
    const cp = closestPointOnSegment(x, y, a.x, a.y, b.x, b.y, _cpP);
    if (cp.dist2 < bestD2) { bestD2 = cp.dist2; bestI = i; bestT = cp.t; }
  }
  if (bestI < 0) return null;
  const a = path[bestI - 1], b = path[bestI];
  const L = b.s - a.s;
  out.s = a.s + L * bestT; out.lat = Math.sqrt(bestD2); out.tx = (b.x - a.x) / L; out.ty = (b.y - a.y) / L;
  return out;
}

// De hooks (vehicleHooks.crossingSpeedLimit, bridgeSpeedLimit, zebraSpeedLimit)
// krijgen een functie; die houdt de oude, allockerende vorm (3 per frame).
function projectOnPath(path, x, y) {
  return projectOnPathInto(path, x, y, { s: 0, lat: 0, tx: 0, ty: 0 });
}

// Fastest speed now that still lets the vehicle take every upcoming bend at
// a comfortable sideways acceleration, braking at `decel`.
function curveSpeedLimit(v, path, aLat, decel) {
  let vmax = Infinity;
  const end = path[path.length - 1].s;
  for (let s = 3; s < end - 3; s += 2) {
    const p0 = pointAlongInto(path, s - 3, _pa), p1 = pointAlongInto(path, s, _pb), p2 = pointAlongInto(path, s + 3, _pc);
    const h1 = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
    const h2 = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
    const turn = Math.abs(normalizeAngle(h2 - h1));
    if (turn < 0.08) continue;
    const vc = Math.max(2.5, Math.sqrt(aLat * 3 / turn));
    vmax = Math.min(vmax, Math.sqrt(vc * vc + 2 * decel * Math.max(0, s - v.halfLen)));
  }
  return vmax;
}

// Planned (comfortable) deceleration for AI speed profiles; the brake pedal
// itself can still use the model's full m.brake when something jumps out.
function aiComfortDecel(v) {
  const m = v.model;
  return v.isBike || v.isScooter ? m.brake * 0.4 : Math.min(7, m.brake * 0.3);
}

// The player (or companion) on foot in the lane ahead: traffic tries to stop
// in front of them, which is what makes carjacking possible at all.
// Every so often a driver is on their phone: they notice the walker late
// (and stop hard, maybe too late) or not at all. Rolled once per encounter;
// fast, aggressive drivers are distracted more often.
const DISTRACT_LATE = 0.1;
const DISTRACT_BLIND = 0.035;
function rollDistraction(v, world) {
  if (world.time < (v.attnUntil || 0)) return v.attn;
  const aggro = v.cruiseScale > 1.06 || v.isPolice ? 2.2 : 1;
  const r = Math.random();
  v.attn = r < DISTRACT_BLIND * aggro ? 'blind' : r < (DISTRACT_BLIND + DISTRACT_LATE) * aggro ? 'late' : 'ok';
  v.attnUntil = world.time + 6;
  return v.attn;
}

function walkerAheadLimit(v, path, world, decel) {
  let vmax = Infinity;
  const fx = Math.cos(v.angle), fy = Math.sin(v.angle);
  const extra = world.yieldWalkers;
  const n = extra ? extra.length + 2 : 2;
  for (let k = 0; k < n; k++) {
    const w = k === 0 ? hoofdspeler(world) : k === 1 ? world.companion : extra[k - 2];
    if (!w || w.inVehicle || w.state === 'dead' || w.swimming) continue;
    const dx = w.x - v.x, dy = w.y - v.y;
    const fwd = dx * fx + dy * fy;
    if (fwd < v.halfLen - 0.5 || fwd > 32 || Math.abs(dy * fx - dx * fy) > 6) continue;
    const pr = projectOnPathInto(path, w.x, w.y, _prA);
    if (!pr || pr.lat > v.halfWid + 0.9) continue;
    const stopS = pr.s - v.halfLen - 1.4;
    const attn = Math.abs(v.speed) > 4 ? rollDistraction(v, world) : 'ok';
    if (attn === 'blind') continue;
    // late: only reacts in the last ~0.3 s, then stands on the brakes
    if (attn === 'late' && stopS > Math.abs(v.speed) * 0.3) continue;
    vmax = Math.min(vmax, Math.sqrt(2 * (attn === 'late' ? v.model.brake * 0.8 : decel) * Math.max(0, stopS)));
  }
  return vmax;
}

// Car-following: keep a stopping distance plus a time gap to whatever sits
// on our path ahead - same-direction traffic, crossing traffic at a
// junction, or something oncoming in our own lane.
function followSpeedLimit(v, path, world, decel, chase) {
  let vmax = Infinity, leader = null, leaderS = Infinity;
  const ignoring = world.time < (v.ignoreUntil || 0) ? v.ignoreId : -1;
  const fx = Math.cos(v.angle), fy = Math.sin(v.angle);
  const stopGap = chase ? 1 : v.isBike || v.isScooter ? 0.8 : 1.8;
  const timeGap = chase ? 0.35 : 0.9;
  const corridor = v.halfLen + 3 + Math.abs(v.speed) * 0.8;
  const creeping = world.time < (v.creepUntil || 0);
  // #653: alleen de buren uit de index; de checks binnen de lus blijven gelijk
  for (const o of vehiclesNear(world, v.x, v.y, PATH_LEN + 5, _nearVeh)) {
    if (o === v || o.isBoat || o.sinking || o.id === ignoring || Math.abs((o.z || 0) - (v.z || 0)) > 3) continue;   // (a car in the garage under the street is no leader, parkeergarage.js)
    if (chase && v.chaseDodge && o.driver === 'player') continue;
    const dx = o.x - v.x, dy = o.y - v.y;
    if (dx * dx + dy * dy > (PATH_LEN + 5) ** 2) continue;
    const rel = Math.cos(o.angle - v.angle);
    if (creeping && rel < 0.5 && !o.wrecked) continue;
    // same-direction traffic alongside or behind is never our leader (two
    // vehicles side by side must not both wait for each other)
    if (rel > 0.8 && dx * Math.cos(v.angle) + dy * Math.sin(v.angle) < 0) continue;
    const ofx = Math.cos(o.angle), ofy = Math.sin(o.angle);
    const reach = v.halfWid + o.halfWid + (rel < -0.5 ? 0.1 : 0.3);
    const passing = v.laneMode === 'pass' && o.id === v.passId;
    let hit = null;
    for (const k of [0, 0.8, -0.8]) {
      const qx = o.x + ofx * o.halfLen * k, qy = o.y + ofy * o.halfLen * k;
      const fwd = (qx - v.x) * fx + (qy - v.y) * fy;
      if (fwd < 0.3) continue;
      const pr = projectOnPathInto(path, qx, qy, k === 0 ? _prA : k === 0.8 ? _prB : _prC);
      if (pr && pr.lat < reach && (!hit || pr.s < hit.s)) hit = pr;
      // right in front of the bumper counts even where the path bends away
      const side = Math.abs((qy - v.y) * fx - (qx - v.x) * fy);
      if (!passing && fwd < corridor && side < reach - 0.2 && (!hit || fwd < hit.s)) hit = { s: fwd, lat: side, tx: fx, ty: fy };
    }
    if (!hit) continue;
    let along = (ofx * o.speed + o.driftX) * hit.tx + (ofy * o.speed + o.driftY) * hit.ty;
    if (along < -1) {
      const pc = projectOnPathInto(path, o.x, o.y, _prD);
      if (!pc || pc.lat > v.halfWid + o.halfWid - 0.1) continue;
      along = 0;
    }
    const lead = Math.max(0, along);
    const gap = hit.s - v.halfLen - Math.max(o.halfWid, o.halfLen * 0.2);
    const vf = Math.max(0, Math.min(
      lead + 0.5 * (gap - stopGap - timeGap * Math.max(0, v.speed)),
      Math.sqrt(Math.max(0, 2 * decel * (gap - stopGap))) + lead * 0.7,
    ));
    if (vf < vmax) { vmax = vf; leader = o; leaderS = hit.s; }
  }
  return { vmax, leader, leaderS };
}

// Speed that brings the vehicle to a halt at the stop line of a red (or a
// still-stoppable amber) signal on its path. Each signal head controls one
// approach direction; once past a stop line on green the rest of that
// junction's heads are not ours to stop for.
function trafficLightLimit(v, path, world) {
  const near = trafficSignalsNear(v.x, v.y);
  if (!near.length) return Infinity;
  const small = v.isBike || v.isScooter;
  const decel = aiComfortDecel(v) * 1.1;
  const reach = Math.max(3.5, laneOffset(v.road, v) + 2);
  const since = world.time - (v.clearedAt || -99);
  const cc = v.clearedCtrl;
  const cleared = cc && (since < 12 || (since < 40 && Math.hypot(v.x - cc.x, v.y - cc.y) < 40)) ? cc : null;
  let vmax = Infinity;
  for (const A of near) {
    if (A.broken || (A.bike && !small) || A.ctrl === cleared) continue;
    const dx = A.x - v.x, dy = A.y - v.y;
    if (dx * dx + dy * dy > 55 * 55) continue;
    const pr = projectOnPathInto(path, A.x, A.y, _prA);
    if (!pr || pr.lat > reach) continue;
    // tangent over a few metres: lane joins at way ends leave tiny kinks
    pointAlongInto(path, Math.max(0, pr.s - 2), _pa); pointAlongInto(path, pr.s + 2, _pb);
    const ax = _pa[0], ay = _pa[1], bx = _pb[0], by = _pb[1];
    if ((bx - ax) * A.hx + (by - ay) * A.hy < 0.6 * Math.hypot(bx - ax, by - ay)) continue;
    const stopS = pr.s - v.halfLen - 1.2;
    const phase = trafficLightPhaseMove(A, !A.bike && turnsLeftAfter(path, pr.s, A));
    const go = phase === 'green' || stopS < -1 ||
      (phase === 'yellow' && (v.speed * v.speed) / (2 * aiComfortDecel(v) * 1.75) > stopS);
    if (go) {
      if (stopS < 3) { v.clearedCtrl = A.ctrl; v.clearedAt = world.time; }
      continue;
    }
    vmax = Math.min(vmax, Math.sqrt(2 * decel * Math.max(0, stopS)));
  }
  return vmax;
}

// Does the path turn left at the junction behind this stop line? Compares the
// heading at the stop line with the heading ~8 m past the junction centre.
function turnsLeftAfter(path, s, A) {
  const sj = s + Math.hypot(A.ax - A.x, A.ay - A.y);
  pointAlongInto(path, sj + 4, _pa); pointAlongInto(path, sj + 10, _pb);
  const ex0 = _pa[0], ey0 = _pa[1], ex1 = _pb[0], ey1 = _pb[1];
  const el = Math.hypot(ex1 - ex0, ey1 - ey0);
  if (el < 1) return false;
  return (A.hx * (ey1 - ey0) - A.hy * (ex1 - ex0)) / el < -0.4;
}

// Unsignalled junction priority, Dutch rules: the higher road class goes
// first (roundabout > major > normal > minor > service), between equals
// traffic from the right goes first, a left turn yields to oncoming traffic,
// otherwise whoever arrives first (ties by id). Vehicles held by a light or
// a queue don't claim, so they can't block traffic that actually can go.
// If everyone we yield to is itself stuck waiting (rechts-voor-gaat on all
// four arms), the lowest id among them goes.
// Same classes as the haaientanden and B6 signs (junctions.js).
function roadRank(r) {
  return roadPriority(r);
}

function realJunction(node) {
  let n = 0;
  for (const e of node) n += (e.idx > 0 ? 1 : 0) + (e.idx < e.road.pts.length - 1 ? 1 : 0);
  return n >= 3;
}

function firstJunction(path) {
  for (const p of path) if (p.j && p.s > 0.5 && p.node && realJunction(p.node)) return p;
  return null;
}

function junctionYieldLimit(v, path, world, decel, claim) {
  const first = firstJunction(path);
  if (!first || first.s > 18) return Infinity;
  const claims = first.node.claims || (first.node.claims = new Map());
  const eta = first.s / Math.max(Math.abs(v.speed), 1.5);
  pointAlongInto(path, Math.max(0, first.s - 3), _pa);
  pointAlongInto(path, first.s + 4, _pb);
  const ax = _pa[0], ay = _pa[1], bx = _pb[0], by = _pb[1];
  const la = Math.hypot(first.x - ax, first.y - ay) || 1, lb = Math.hypot(bx - first.x, by - first.y) || 1;
  const hx = (first.x - ax) / la, hy = (first.y - ay) / la;
  const turnLeft = hx * (by - first.y) / lb - hy * (bx - first.x) / lb < -0.4;
  const rank = roadRank(first.from);
  if (claim) {
    // reused: a fresh object per car per frame lived long enough to be
    // promoted, and the old-space churn showed up as ~150 ms GC pauses
    let c = claims.get(v.id);
    if (!c) claims.set(v.id, c = {});
    c.eta = eta; c.time = world.time; c.from = first.from; c.fromDir = first.fromDir; c.rank = rank;
    c.hx = hx; c.hy = hy; c.turnLeft = turnLeft; c.still = v.stillFor || 0;
  } else claims.delete(v.id);
  let yieldTo = false, othersWaiting = true, minId = v.id;
  for (const [id, c] of claims) {
    if (id === v.id) continue;
    if (world.time - c.time > 0.25) { claims.delete(id); continue; }
    if (c.from === first.from && c.fromDir === first.fromDir) continue;
    let must;
    if (c.eta < 0.8 && c.eta < eta) must = true;
    else if (c.rank !== rank) must = c.rank > rank && c.eta < 6;
    else {
      const cross = hx * c.hy - hy * c.hx;
      const dot = hx * c.hx + hy * c.hy;
      if (cross < -0.35) must = c.eta < eta + 3;
      else if (cross > 0.35) must = c.eta < eta - 2;
      else if (dot < -0.7 && turnLeft !== c.turnLeft) must = turnLeft && c.eta < eta + 2.5;
      else must = c.eta < eta - 0.25 || (Math.abs(c.eta - eta) <= 0.25 && id < v.id);
    }
    if (!must) continue;
    yieldTo = true;
    if (c.still < 1.5) othersWaiting = false;
    if (id < minId) minId = id;
  }
  if (!yieldTo) return Infinity;
  const waited = v.yieldWait || 0;
  if ((waited > 2.5 && othersWaiting && v.id <= minId) || waited > 8 + (v.id % 5)) return Infinity;
  // stop where the junction model puts the teeth or the stop line of this
  // arm (the edge of the crossing carriageway), not on the crossing road
  const arm = world.map && first.r ? junctionArm(world.map, first.r, first.i, first.fromDir) : null;
  const stopS = first.s - (arm ? clamp(arm.stop, 3, 10) : 4) - v.halfLen;
  return stopS < -0.5 ? Infinity : Math.sqrt(2 * decel * Math.max(0, stopS));
}

// Don't drive into a junction whose exit is still blocked by the queue in
// front: wait at the entry so crossing traffic keeps flowing.
function junctionBoxLimit(v, path, follow, decel) {
  const o = follow.leader;
  if (!o || Math.abs(o.speed) > 1 || follow.leaderS === Infinity) return Infinity;
  const j = firstJunction(path);
  if (!j || j.s > 14 || follow.leaderS < j.s) return Infinity;
  if (follow.leaderS - j.s > v.model.len + 4) return Infinity;
  const stopS = j.s - 4 - v.halfLen;
  return stopS < 1 ? Infinity : Math.sqrt(2 * decel * stopS);
}

function queuedAtLight(v) {
  let r = v, n = 0;
  while (r && n++ < 30) { if (r._atLight) return true; r = r._leader; }
  return false;
}

// Deadlock breakers, run after the speed limits are known:
// - a waiting cycle (A waits for B waits for ... A): the lowest id in the
//   cycle ignores its leader for a moment and goes first;
// - an oncoming vehicle close ahead on a narrow two-way street: both hug the
//   right verge so they fit past each other;
// - a stopped obstacle (wreck, abandoned car, broken-down queue head) in the
//   lane: swing out and pass it when the other side is clear.
function resolveDeadlocks(v, dt, world, follow, lightV) {
  const o = follow.leader;
  const held = o && follow.vmax < 0.5 && Math.abs(v.speed) < 0.5 && lightV > 1;
  v._leader = held ? o : null;
  v._atLight = lightV < 0.5;
  if (held) {
    let r = o, minId = v.id, n = 0;
    while (r && r !== v && n++ < 10) { if (r.id < minId) minId = r.id; r = r._leader; }
    if (r === v && minId === v.id) { v.ignoreId = o.id; v.ignoreUntil = world.time + 2.5; }
  }

  const now = world.time;
  if (v.laneMode && now > v.laneModeUntil) v.laneMode = null;
  const fx = Math.cos(v.angle), fy = Math.sin(v.angle);
  // the vehicle in our way is pinned trying to manoeuvre: back off a little
  if (held && (o.stuckFor || 0) > 1 && Math.cos(o.angle - v.angle) < 0.5 && now - (v.backOffAt || -99) > 6 &&
    !vehiclesNear(world, v.x + fx * v.halfLen, v.y + fy * v.halfLen, v.halfLen + 2.5, _nearVeh).some((q) => q !== v)) {
    v.backOffAt = now;
  }
  const half = (v.road.width || 6) / 2;
  if (o && !o.wrecked && o.road && !v.road.oneway && half < 3.6 && Math.cos(o.angle - v.angle) < -0.5 && follow.vmax < 4) {
    v.laneMode = 'squeeze'; v.laneModeUntil = now + 3;
  }
  if (!held || v.laneMode === 'squeeze') return;
  const obstacle = o.wrecked || !o.road || (o.driver === 'player' && Math.abs(o.speed) < 0.3) || (o.stuckFor || 0) > 3;
  if (!obstacle || Math.cos(o.angle - v.angle) < -0.5 && !o.wrecked) return;
  // #653: alleen de buren uit de index (was een scan over alle voertuigen).
  // #791: de index zoekt in een cirkel, de oude scan in een rechthoek van 30 m
  // vooruit en half + 3 m opzij. De straal moet de verste hoek daarvan dekken,
  // anders valt een tegenligger op 28,6-30 m net buiten de query en begint de
  // inhaalmanoeuvre te vroeg.
  const nearR = Math.hypot(30, Math.max(0.5, half + 3)) + 0.25;
  for (const q of vehiclesNear(world, v.x, v.y, nearR, _nearVeh)) {
    if (q === v || q === o || q.isBoat) continue;
    const dx = q.x - v.x, dy = q.y - v.y;
    const fwd = dx * fx + dy * fy, lat = dy * fx - dx * fy;
    if (fwd > v.halfLen && fwd < 30 && lat < 0.5 && lat > -half - 3 && Math.cos(q.angle - v.angle) < 0.3) return;
  }
  v.laneMode = 'pass'; v.laneModeUntil = now + 4; v.passId = o.id;
  v.ignoreId = -1;
}

// opts.goal ({x, y}) steers junction choices toward a target; opts.chase
// drives faster, tighter and ignores traffic lights (police pursuit).
export function updateTrafficAI(v, dt, map, world, rng = Math.random, opts = null) {
  // Ommeland traffic placed by countrylife.js until someone takes it over
  if (v.wrecked || v.countryDrive) return;
  if (!v.road) {
    // parked or abandoned: a shove from a collision rolls out against the
    // handbrake; a car bailed out of (or burning) rolls on freely
    if (!v.driver && !v.sinking && (v.speed || v.driftX || v.driftY || v.yawVel)) {
      const free = v.rollingFree || v.disabled;
      v.applyControls(dt, 0, free ? v.steer * 0.98 : 0, free ? 0 : 0.35);
      if (free && Math.abs(v.speed) < 0.4) v.rollingFree = false;
    }
    return;
  }
  if (!v.plan) v.plan = [];
  if (!opts) opts = v.aiOpts || null;
  // Een lijnbus die de speler als dienst rijdt (#396) blijft staan zodra hij uitstapt: de bus-AI neemt de dienst
  // niet over. Na de dienst valt rideLine weg (sidejob_lijn.js stop) en rijdt de bus weer zijn eigen lijn.
  if (v.busRun && v.driver !== 'player' && !v.rideLine) {
    const out = stepRunner(v.busRun, v.x, v.y, dt);
    opts = { goal: out.goal };
    const lp = v.liveId && host.liveBussen ? host.liveBussen.positie(v.liveId) : null;
    if (lp && lp.line === v.busRun.line && lp.dir === v.busRun.dir) {
      // #395: de echte bus bepaalt waar en hoe snel: het doel een stuk voor zijn plek op de lijn, de snelheid van de echte bus
      // met een correctie voor de afstand (voor hem: afremmen, achter hem: bijbenen); de haltetijd is die van de echte bus
      const gap = (v.busRun.s - lp.s) * lp.dir;
      const g = linePointAt(lp.line, lp.s + lp.dir * 20);
      opts = { goal: { x: g.x, y: g.y } };
      v.liveScale = Math.max(0.04, Math.min(1.6, (lp.speed - gap * 0.25) / Math.max(4, v.road.speed || 8)));
    } else if (v.liveId) {
      v.liveId = null; v.liveScale = null;      // de echte bus is weg of keerde om: voortaan de eigen dienst
    } else if (out.atStop) v.waitTimer = Math.max(v.waitTimer || 0, out.hold);
  }
  // #804: een vers voertuig zonder pad gaat via het per-frame budget (spawngolf)
  if ((!v._path || v._path.length < 2) && opts && opts.budget && !consumePathBudget(opts.budget)) {
    v.aiDeferred = (v.aiDeferred || 0) + 1;
    return;
  }
  const goal = (opts && opts.goal) || null;
  const chase = !!(opts && opts.chase);
  const small0 = v.isBike || v.isScooter;
  // make way for lights and sirens: hug the kerb, slow down, stop when close
  const yielding = !chase && !v.sirenOn && sirenYield(v, world);
  if (yielding) { v.laneMode = 'yield'; v.laneModeUntil = world.time + 1.2; v.yieldHard = yielding === 'stop'; }
  else if (!small0 && !chase && (!v.laneMode || v.laneMode === 'left')) v.laneMode = wantsTurnLane(v) ? 'left' : null;
  if (goal && world.time - (v.planAt || 0) > 1.5) {
    v.planAt = world.time;
    if (!findRoute(v, map, goal.x, goal.y)) { v.plan.length = Math.min(v.plan.length, 1); v.routeEnd = null; }
  }

  advanceAlongRoad(v, map, rng, goal);
  const path = buildPathInto(v, map, rng, goal);
  const m = v.model;
  const small = v.isBike || v.isScooter;

  const lookahead = clamp(2 + Math.abs(v.speed) * 0.55, small ? 2.5 : 3.2, 15) + (v.isBus ? 3 : 0);
  pointAlongInto(path, lookahead, _pa);
  const tx = _pa[0], ty = _pa[1];
  const fx = Math.cos(v.angle), fy = Math.sin(v.angle);
  const dx = tx - v.x, dy = ty - v.y;
  const fwd = dx * fx + dy * fy, lat = dy * fx - dx * fy;
  const alpha = Math.atan2(lat, fwd);
  v.tightTurn = Math.abs(alpha) > 1.1 && Math.abs(v.speed) < 5;
  const curvature = 2 * lat / Math.max(1, dx * dx + dy * dy);
  const steer = Math.abs(alpha) > Math.PI / 2 ? Math.sign(alpha) : clamp(curvature / maxCurvature(v), -1, 1);

  const decel = chase ? m.brake * 0.7 : aiComfortDecel(v);
  const aLat = chase ? lateralGrip(m) * 0.6 : small ? 2.2 : v.isBus ? 1.6 : 3;
  let cruise = (v.road.speed || (small ? m.maxSpeed : 8)) * (v.liveScale != null ? v.liveScale : (v.cruiseScale || 1));
  if (chase) cruise = opts.cruise || Math.max(cruise * 1.5, 16);
  cruise = Math.min(cruise, m.maxSpeed * (small ? 0.9 : 0.95));

  let vTarget = Math.min(cruise, curveSpeedLimit(v, path, aLat, decel));
  const follow = followSpeedLimit(v, path, world, decel, chase);
  const lightV = chase ? Infinity : Math.min(trafficLightLimit(v, path, world), vehicleHooks.crossingSpeedLimit(v, path, projectOnPath), bridgeSpeedLimit(v, path, projectOnPath),
    small ? Infinity : zebraSpeedLimit(v, path, projectOnPath, world.time));
  vTarget = Math.min(vTarget, follow.vmax, lightV);
  const walkerV = chase ? Infinity : walkerAheadLimit(v, path, world, decel);
  vTarget = Math.min(vTarget, walkerV);
  const creeping = world.time < (v.creepUntil || 0);
  let yieldV = Infinity;
  if (!chase && !creeping) {
    const boxV = junctionBoxLimit(v, path, follow, decel);
    yieldV = junctionYieldLimit(v, path, world, decel, Math.min(follow.vmax, lightV, boxV) > 1);
    vTarget = Math.min(vTarget, boxV, yieldV);
  }
  v.stillFor = Math.abs(v.speed) < 0.5 ? (v.stillFor || 0) + dt : 0;
  if (yieldV < 0.5 && v.stillFor > 0) v.yieldWait = (v.yieldWait || 0) + dt;
  else if (Math.abs(v.speed) > 2) v.yieldWait = 0;
  if (!chase) resolveDeadlocks(v, dt, world, follow, lightV);
  if (Math.abs(alpha) > 1) vTarget = Math.min(vTarget, 3.5);
  if (v.waitTimer > 0) { v.waitTimer -= dt; vTarget = 0; }
  if (goal && v.routeEnd) {
    const end = path.find((p) => p.r === v.routeEnd.road && p.i === v.routeEnd.idx);
    if (end) vTarget = Math.min(vTarget, Math.sqrt(2 * decel * Math.max(0, end.s - 3)));
  }
  if (creeping) vTarget = Math.min(vTarget, 2.5);
  if (v.laneMode === 'pass') vTarget = Math.min(vTarget, 4);
  if (v.laneMode === 'yield') vTarget = Math.min(vTarget, v.yieldHard ? 0 : small0 ? 2 : 3.5);

  // Gridlock (junction standoff, head-on in a narrow street, an abandoned
  // car in the lane): after a while stop yielding to cross/oncoming traffic
  // and creep through at walking pace. Queues behind a light are left alone.
  const o = follow.leader;
  const standoff = o && follow.vmax < 0.5 && Math.abs(v.speed) < 0.5 && lightV > 1 && o.driver !== 'player' &&
    (!o.road || (o.blockedFor || 0) > 0 || (o.stuckFor || 0) > 6 || Math.cos(o.angle - v.angle) < 0.5);
  v.blockedFor = standoff ? (v.blockedFor || 0) + dt : Math.max(0, (v.blockedFor || 0) - dt * 0.5);
  if (v.blockedFor > 3 + (v.id % 5) * 0.6) {
    v.creepUntil = world.time + 3;
    v.blockedFor = 0;
  }
  const blockedByPlayer = (walkerV < 0.5 || (!!o && o.driver === 'player' && follow.vmax < 0.5)) && Math.abs(v.speed) < 0.5;
  v.hornFor = blockedByPlayer ? (v.hornFor || 0) + dt : 0;
  v.horn = v.hornFor > 1.5 && v.hornFor < 2.2;
  v.stuckFor = Math.abs(v.speed) < 0.6 && vTarget > 2 ? (v.stuckFor || 0) + dt : 0;
  // what holds a car that wants to stand still (the junction sim test reads it)
  v._why = vTarget >= 0.5 ? null : follow.vmax < 0.5 ? 'queue' : lightV < 0.5 ? 'light' : walkerV < 0.5 ? 'walker' : yieldV < 0.5 ? 'yield' : 'other';
  // held (not by a light) for a long time: turn around and find another way
  v.waitFor = Math.abs(v.speed) < 0.5 && vTarget < 0.5 && lightV > 1 ? (v.waitFor || 0) + dt : 0;
  if (!chase && v.waitFor > 35 + (v.id % 10) && !v.road.oneway && !goal && !queuedAtLight(v)) {
    v.waitFor = 0;
    v.segIdx += v.dir;
    v.dir = -v.dir;
    v.plan.length = 0;
  }

  if (world.time - (v.backOffAt || -99) < 1.2) {
    v.applyControls(dt, -0.4, 0, 0);
    return;
  }
  // pinned against a wall: back off with opposite lock, then try again
  if (v.stuckFor > 1.5 && world.time - (v.reverseAt || -99) > 4) v.reverseAt = world.time;
  if (world.time - (v.reverseAt || -99) < 1.2) {
    v.applyControls(dt, -0.6, -steer, 0);
    return;
  }
  const err = vTarget - v.speed;
  let throttle = 0, brake = 0;
  if (err > 0.25) throttle = clamp(err * 0.6, 0.2, 1);
  else if (err < -0.5) brake = clamp(-err * (walkerV < v.speed ? 0.6 : 0.3), 0.1, 1);
  if (vTarget < 0.3 && Math.abs(v.speed) < 1.2) brake = 1;
  if (m.senior && !chase) {
    if (v.stillFor > 0 && v.stillFor < 1.6 && yieldV > 0.5) throttle = 0;
    else if (v.speed < 2.5) throttle *= 0.5;
    const wob = Math.sin(world.time * 1.9 + (v.id || v.x)) * 0.18 * Math.min(1, Math.abs(v.speed) / 2);
    v.applyControls(dt, throttle, clamp(steer + wob, -1, 1), brake);
    return;
  }
  v.applyControls(dt, throttle, steer, brake);
}


