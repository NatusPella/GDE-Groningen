import { pointInPolygon } from './util.js';
import { getHorecaForRender } from './horeca.js';
import { getShopsForRender } from './shops.js';
import { nearestRepairSite } from './garages.js';
import { getGoal, setGoal, clearGoal, goalTarget, missionOnMap } from './goal.js';
import { roadAllowed, oneWayFor } from './roadaccess.js';
import { boatRoute, boatTrip, trainTrip, airRoute, etaSeconds, polyLength } from './travelroute.js';
import { getSharedNet, planVaarRoute, airOfKind } from './vaarnet.js';
import { getWaterIndex, waterClearance } from './waterindex.js';
import { roadZAt } from './elevation.js';
import { isInWater, WATER_Y } from './util.js';
import { getHelipads } from './heliflight.js';
import { roadNetReady, roadGraphBuilt, roadGraphVersion, snapRoad, roadCosts, roadPath, roadPathToNode, roadPathFromNode, nodeXY, gatewayCandidates } from './roadgraph.js';
import { playerBusy } from './busy.js';
import { walkPathHook } from './latehooks.js';

const STRAY_M = 25;
// the further from the route you may stray before it is redone, per way of travel
const STRAY_BY_MODE = { walk: 20, bike: 22, drive: 25, boat: 45, ov: 60, fly: 120 };
// a snap on the other level (bridge or below it) costs this many metres of distance
const LEVEL_PEN_START_M = 40;
const LEVEL_PEN_TARGET_M = 12;
const LEVEL_SPLIT_M = 2.5;
// driving with the motorways avoided: a motorway metre counts this many
const MOTORWAY_AVOID = 8;
const TELEPORT_M = 150;
const MIN_RECOMPUTE_S = 2;
const REACH_M = 8;
const SNAP_MAX_M = 480;
// road pieces this much further than the nearest one are as good a place to start or end on
const SNAP_TIE_M = 0.3;
const SNAP_TIE_MAX = 6;
// a way to a car-free goal that comes close over the streets may be this much longer than the one to the nearest street
const MIXED_DETOUR_MAX = 1.3;
const MIXED_DETOUR_SLACK_M = 50;
// a point further than this from a city street is out in the province (roadgraph.js)
const CITY_SNAP_OK_M = 150;
const GATEWAY_BAND_M = 700;
const GATEWAY_CELL_M = 60;
const GATEWAY_TRIES = 6;
// out in a field the route starts (or ends) at the nearest country road
const COUNTRY_SNAP_M = 3000;
// a point this close to a country road (and no closer to a city street) is on it
const COUNTRY_ON_M = 30;
// a city street this close is so surely under the point that the country graph isn't asked
const CITY_SURE_M = 25;

let graph = null;
// Up to three routes at once, each its own colour (hud_panel ROUTE_COLORS):
// the player's own goal (goal.js, purple), the objective (an active mission
// or the story yellow, a bijbaan orange) and the care route (pink: food when
// you're hurt, a garage when your OWN vehicle is damaged). Priority: an
// active bijbaan or mission, then the goal, then the story step, then the
// post-game guide. The primary one (getActiveRoute) drives the 3D ribbon
// and the route chip; map and minimap draw them all (getRoutes).
const slots = { user: newSlot(), objective: newSlot(), care: newSlot() };
let route = null;
function newSlot() { return { route: null, key: '', at: -Infinity }; }

const CARE_HURT = 35;
const CARE_HEALED = 50;
const CARE_DAMAGED = 55;
const CARE_FIXED = 90;
const HEAL_SHOPS = new Set(['snack', 'super']);
let care = null;
let careDismissed = null;
const stats = { buildMs: 0, lastMs: 0, maxMs: 0, avgMs: 0, runs: 0, nodes: 0, driveEdges: 0, walkEdges: 0, lastSettled: 0 };

const isDrivable = (road) => road.cat !== 'foot' && road.cat !== 'cycle' && !road.busOnly && roadAllowed(road, 'auto') !== false;
// Driving routes stay on the carriageway: parking aisles and tracks only
// when they really shortcut, footpaths and cycle paths only for the last
// stretch to a car-free target (the mixed graph), never as a shortcut.
const SERVICE_COST = 2.5;
const OFFROAD_COST = 15;
const STEPS_COST = 60;
// no walking along (and so no crossing of) the ring and motorways
// and the one-way ramps; a two-way viaduct (the Hereweg over the tracks) is walkable
const MOTORWAY_TYPES = new Set(['motorway', 'motorway_link', 'trunk', 'trunk_link']);
const isWalkable = (road) => roadAllowed(road, 'lopen') !== false && !road.busOnly && !(road.z && road.cat === 'major' && (road.oneway || MOTORWAY_TYPES.has(road.type)));
// by bike: no motorways, footways or steps (roadaccess.js), no bus lanes
const isBikeable = (road) => roadAllowed(road, 'fiets') !== false && !road.busOnly && !(road.z && road.cat === 'major' && MOTORWAY_TYPES.has(road.type));
const BIKE_COST = { cycle: 0.8, minor: 1.15, normal: 1, major: 1.8, foot: 1.4 };
// Some OSM footways/service roads cross building footprints (passages,
// courtyards); still usable, but routes should strongly prefer streets.
const THROUGH_BUILDING_COST = 8;
// Straight connectors from the player/target to the road network are only
// drawn when short; longer ones would cut through blocks.
const CONNECTOR_MAX_M = 15;

export function throughBuilding(map, ax, ay, bx, by) {
  const samples = Math.hypot(bx - ax, by - ay) > 6 ? [0.25, 0.5, 0.75] : [0.5];
  for (const t of samples) {
    const x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
    for (const b of map.buildingsNear(x, y, 1)) {
      const [minx, miny, maxx, maxy] = b.bounds;
      if (x < minx || x > maxx || y < miny || y > maxy) continue;
      if (pointInPolygon(x, y, b.pts)) return true;
    }
  }
  return false;
}

function buildGraph(map) {
  const t0 = performance.now();
  const ids = new Map();
  const xs = [], ys = [];
  const roadNodes = new Map();
  const drive = [], driveRoad = [], walk = [], walkRoad = [], mixed = [], bike = [], bikeRoad = [], driveAvoid = [];
  const nodeOf = (x, y) => {
    const key = (Math.round(x * 2) + 32768) * 65536 + (Math.round(y * 2) + 32768);
    let id = ids.get(key);
    if (id === undefined) {
      id = xs.length;
      ids.set(key, id);
      xs.push(x);
      ys.push(y);
    }
    return id;
  };
  for (let ri = 0; ri < map.roads.length; ri++) {
    const road = map.roads[ri];
    const n = road.pts.length;
    const rn = new Int32Array(n);
    for (let i = 0; i < n; i++) rn[i] = nodeOf(road.pts[i][0], road.pts[i][1]);
    roadNodes.set(road, rn);
    const canDrive = isDrivable(road);
    const canWalk = isWalkable(road);
    const canBike = isBikeable(road);
    const bikeOne = canBike && oneWayFor(road, 'fiets');
    const mw = MOTORWAY_TYPES.has(road.type);
    for (let i = 0; i < n - 1; i++) {
      const a = rn[i], b = rn[i + 1];
      if (a === b) continue;
      const geo = Math.hypot(xs[b] - xs[a], ys[b] - ys[a]);
      const len = !road.bridge && throughBuilding(map, xs[a], ys[a], xs[b], ys[b]) ? geo * THROUGH_BUILDING_COST : geo;
      if (canWalk) {
        walk.push(a, b, len, b, a, len);
        walkRoad.push(ri, ri);
      }
      if (canBike) {
        const bl = len * (BIKE_COST[road.cat] ?? 1);
        bike.push(a, b, bl); bikeRoad.push(ri);
        if (!bikeOne) { bike.push(b, a, bl); bikeRoad.push(ri); }
      }
      if (canDrive) {
        const dl = road.type === 'service' || road.type === 'track' ? len * SERVICE_COST : len;
        drive.push(a, b, dl); driveRoad.push(ri);
        const al = mw ? dl * MOTORWAY_AVOID : dl;
        driveAvoid.push(a, b, al);
        mixed.push(a, b, dl);
        if (!road.oneway) { drive.push(b, a, dl); driveRoad.push(ri); driveAvoid.push(b, a, al); mixed.push(b, a, dl); }
      } else if (!road.busOnly) {
        const ml = len * (road.type === 'steps' ? STEPS_COST : OFFROAD_COST);
        mixed.push(a, b, ml, b, a, ml);
      }
    }
  }
  const N = xs.length;
  const csr = (flat, extra = null) => {
    const m = flat.length / 3;
    const start = new Int32Array(N + 1);
    for (let e = 0; e < m; e++) start[flat[e * 3] + 1]++;
    for (let i = 0; i < N; i++) start[i + 1] += start[i];
    const fill = start.slice(0, N);
    const to = new Int32Array(m), len = new Float32Array(m);
    const road = extra ? new Int32Array(m) : null;
    for (let e = 0; e < m; e++) {
      const k = fill[flat[e * 3]]++;
      to[k] = flat[e * 3 + 1];
      len[k] = flat[e * 3 + 2];
      if (road) road[k] = extra[e];
    }
    return { start, to, len, road };
  };
  const components = (adj) => {
    const comp = new Int32Array(N).fill(-1);
    const stack = [];
    let best = -1, bestSize = 0, id = 0;
    for (let s0 = 0; s0 < N; s0++) {
      if (comp[s0] >= 0 || adj.start[s0] === adj.start[s0 + 1]) continue;
      comp[s0] = id;
      stack.push(s0);
      let size = 0;
      while (stack.length) {
        const u = stack.pop();
        size++;
        for (let e = adj.start[u]; e < adj.start[u + 1]; e++) {
          const v = adj.to[e];
          if (comp[v] < 0) { comp[v] = id; stack.push(v); }
        }
      }
      if (size > bestSize) { bestSize = size; best = id; }
      id++;
    }
    return { comp, main: best };
  };
  const walkAdj = csr(walk, walkRoad);
  const bikeAdj = csr(bike, bikeRoad);
  const bikeUndirected = [];
  for (let i = 0; i < bike.length; i += 3) bikeUndirected.push(bike[i], bike[i + 1], bike[i + 2], bike[i + 1], bike[i], bike[i + 2]);
  const driveUndirected = [];
  for (let i = 0; i < drive.length; i += 3) driveUndirected.push(drive[i], drive[i + 1], drive[i + 2], drive[i + 1], drive[i], drive[i + 2]);
  const driveFree = csr(driveUndirected);
  graph = {
    map,
    N,
    walkComp: components(walkAdj),
    driveComp: components(driveFree),
    x: Float64Array.from(xs),
    y: Float64Array.from(ys),
    roadNodes,
    drive: csr(drive, driveRoad),
    driveAvoid: csr(driveAvoid, driveRoad),
    bike: bikeAdj,
    bikeComp: components(csr(bikeUndirected)),
    free: driveFree,
    mixed: csr(mixed),
    walk: walkAdj,
    g: new Float64Array(N),
    prev: new Int32Array(N),
    seen: new Uint32Array(N),
    done: new Uint32Array(N),
    stamp: 0,
  };
  stats.buildMs = performance.now() - t0;
  stats.nodes = N;
  stats.driveEdges = graph.drive.to.length;
  stats.walkEdges = graph.walk.to.length;
}

// Prefers the largest connected component so a stray, unconnected way near
// the point can't make the whole route fail. kind: 'walk' | 'bike' | 'drive'
// (true/false kept for drive/walk). lvl: { z, pen } the height the point is
// at; a road on the other level (the bridge, or the street under it) counts
// pen metres further away, so a waypoint clicks onto the right one.
function snapToRoad(map, x, y, kind, lvl = null) {
  kind = kind === true ? 'drive' : kind === false ? 'walk' : kind;
  const cc = kind === 'drive' ? graph.driveComp : kind === 'bike' ? graph.bikeComp : graph.walkComp;
  const usable = kind === 'drive' ? isDrivable : kind === 'bike' ? isBikeable : isWalkable;
  let fallback = null, fallbackD = Infinity;
  for (let r = 30; r <= SNAP_MAX_M; r *= 2) {
    let best = null, bestD = r;
    const ties = [];
    for (const road of map.roadsNear(x, y, r)) {
      if (!usable(road)) continue;
      const rn = graph.roadNodes.get(road);
      // a streamed tile's road is the road graph's (roadgraph.js), not the city graph's
      if (!rn) continue;
      const inMain = cc.comp[rn[0]] === cc.main;
      const p = road.pts, Z = road.z;
      for (let i = 0; i < p.length - 1; i++) {
        const ax = p[i][0], ay = p[i][1], dx = p[i + 1][0] - ax, dy = p[i + 1][1] - ay;
        const l2 = dx * dx + dy * dy;
        let t = l2 > 1e-9 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const cx = ax + dx * t, cy = ay + dy * t;
        let d = Math.hypot(cx - x, cy - y);
        if (lvl) {
          const rz = Z ? Z[i] + (Z[i + 1] - Z[i]) * t : 0;
          if (Math.abs(rz - lvl.z) > LEVEL_SPLIT_M) d += lvl.pen;
        }
        if (inMain && d < bestD + SNAP_TIE_M) ties.push({ x: cx, y: cy, road, seg: i, t, segLen: Math.sqrt(l2), d });
        if (inMain ? d >= bestD : d >= fallbackD) continue;
        const hit = { x: cx, y: cy, road, seg: i, t, segLen: Math.sqrt(l2) };
        if (inMain) { bestD = d; best = hit; } else { fallbackD = d; fallback = hit; }
      }
    }
    if (best) {
      // At a junction several road pieces lie as near as the point does (a ramp, a one-way street beside it): the search takes
      // all of them as starts or goals, or a piece that only leads away makes the way a detour (#320).
      const alts = ties.filter((h) => h.d <= bestD + SNAP_TIE_M && !(h.road === best.road && h.seg === best.seg)).sort((u, v) => u.d - v.d).slice(0, SNAP_TIE_MAX);
      if (alts.length) best.alts = alts;
      return best;
    }
  }
  return fallback;
}

class Heap {
  constructor() { this.f = []; this.n = []; }
  get size() { return this.n.length; }
  push(f, n) {
    const F = this.f, Nn = this.n;
    let i = Nn.length;
    F.push(f); Nn.push(n);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (F[p] <= f) break;
      F[i] = F[p]; Nn[i] = Nn[p]; i = p;
    }
    F[i] = f; Nn[i] = n;
  }
  pop() {
    const F = this.f, Nn = this.n;
    const top = Nn[0];
    const lf = F.pop(), ln = Nn.pop();
    const len = Nn.length;
    if (len) {
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= len) break;
        if (c + 1 < len && F[c + 1] < F[c]) c++;
        if (F[c] >= lf) break;
        F[i] = F[c]; Nn[i] = Nn[c]; i = c;
      }
      F[i] = lf; Nn[i] = ln;
    }
    return top;
  }
  peekF() { return this.f[0]; }
}

// mode: 'walk' | 'drive' | 'mixed' | 'free' (drive with the one-ways ignored: the last
// resort when a one-way the city map cuts off at its edge leaves no way) (true/false kept for walk/drive)
// A snap's alts (pieces tied with it at a junction) are starts and goals too; `used` holds the ones the last way ran from and to.
let used = null;
function astar(fromSnap, toSnap, walkMode, nodesOut = null) {
  const G = graph;
  const mode = walkMode === true ? 'walk' : walkMode === false ? 'drive' : walkMode;
  const adj = mode === 'walk' ? G.walk : mode === 'bike' ? G.bike : mode === 'mixed' ? G.mixed : mode === 'free' ? G.free : mode === 'driveAvoid' ? G.driveAvoid : G.drive;
  walkMode = mode === 'walk' || mode === 'bike';
  const stamp = ++G.stamp;
  const gx = toSnap.x, gy = toSnap.y;
  // the alts lie within the tie distance of the snap itself, from both ends
  const h = (n) => Math.max(0, Math.hypot(G.x[n] - gx, G.y[n] - gy) - 2 * SNAP_TIE_M - 0.1);
  const heap = new Heap();
  const relax = (n, g, p) => {
    if (G.seen[n] === stamp && G.g[n] <= g) return;
    G.seen[n] = stamp;
    G.g[n] = g;
    G.prev[n] = p;
    heap.push(g + h(n), n);
  };
  const oneWay = (snap) => snap.road.oneway && !walkMode && mode !== 'free' && isDrivable(snap.road);

  const froms = fromSnap.alts ? [fromSnap, ...fromSnap.alts] : [fromSnap];
  const tos = toSnap.alts ? [toSnap, ...toSnap.alts] : [toSnap];
  const startOf = new Map();
  const seed = (n, g, c) => {
    if (G.seen[n] === stamp && G.g[n] <= g) return;
    startOf.set(n, c);
    relax(n, g, -1);
  };
  for (const c of froms) {
    const fr = G.roadNodes.get(c.road);
    seed(fr[c.seg + 1], (1 - c.t) * c.segLen, c);
    if (!oneWay(c)) seed(fr[c.seg], c.t * c.segLen, c);
  }
  // goal nodes: the node, the metres from it to the goal point along the piece, which goal piece
  const goals = new Map();
  const goal = (n, extra, c) => { const l = goals.get(n); if (l) l.push({ extra, c }); else goals.set(n, [{ extra, c }]); };
  for (const c of tos) {
    const tr = G.roadNodes.get(c.road);
    goal(tr[c.seg], c.t * c.segLen, c);
    if (!oneWay(c)) goal(tr[c.seg + 1], (1 - c.t) * c.segLen, c);
  }

  let best = Infinity, bestEnd = -1, endC = null, startC = null, settled = 0;
  for (const f of froms) for (const t of tos) {
    if (f.road === t.road && f.seg === t.seg && (!oneWay(f) || t.t >= f.t)) {
      const d = Math.abs(t.t - f.t) * t.segLen;
      if (d < best) { best = d; bestEnd = -2; startC = f; endC = t; }
    }
  }
  while (heap.size) {
    if (heap.peekF() >= best) break;
    const n = heap.pop();
    if (G.done[n] === stamp) continue;
    G.done[n] = stamp;
    settled++;
    const gn = G.g[n];
    const gl = goals.get(n);
    if (gl) for (const e of gl) if (gn + e.extra < best) { best = gn + e.extra; bestEnd = n; endC = e.c; }
    for (let e = adj.start[n], end = adj.start[n + 1]; e < end; e++) {
      const m = adj.to[e];
      if (G.done[m] === stamp) continue;
      relax(m, gn + adj.len[e] + (closureFn && !walkMode ? closureFn(G.x[m], G.y[m]) : 0), n);
    }
  }
  if (!nodesOut) stats.lastSettled = settled;
  if (bestEnd === -1) return null;
  const pts = [[endC.x, endC.y]];
  let n = bestEnd;
  for (; n >= 0; n = G.prev[n]) {
    pts.push([G.x[n], G.y[n]]);
    if (nodesOut) nodesOut.push(n);
    if (G.prev[n] < 0) startC = startOf.get(n);
  }
  pts.push([startC.x, startC.y]);
  pts.reverse();
  if (nodesOut) nodesOut.reverse();
  used = { from: startC, to: endC };
  return pts;
}

// Walking path for pedestrians: the polyline plus the road each leg follows
// (legs[i] is the road between pts[i] and pts[i + 1]).
export function findWalkPath(map, ax, ay, bx, by) {
  if (!graph || graph.map !== map) buildGraph(map);
  const from = snapToRoad(map, ax, ay, false), to = snapToRoad(map, bx, by, false);
  if (!from || !to) return null;
  const nodes = [];
  const pts = astar(from, to, true, nodes);
  if (!pts) return null;
  const W = graph.walk;
  const legs = [used.from.road];
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i], b = nodes[i + 1];
    let road = legs[legs.length - 1];
    for (let e = W.start[a]; e < W.start[a + 1]; e++) {
      if (W.to[e] === b) { road = map.roads[W.road[e]]; break; }
    }
    legs.push(road);
  }
  if (nodes.length) legs.push(used.to.road);
  return { pts, legs };
}

function travelMode(player) {
  const v = player.inVehicle;
  if (!v) return 'walk';
  if (v.isBoat) return 'boat';
  // a helicopter or plane flies: a line to the target, around the no-fly zones
  if (v.isHeli) return 'fly';
  return v.isBike || v._mount ? 'bike' : 'drive';
}

// The height the player is at (a bridge deck, or the street below it).
const levelOf = (player) => { const v = player.inVehicle; return (v ? v.z : player.gz) || 0; };

// What the player chose in the route settings (and on the big map).
const prefs = { avoidMotorways: false, planMode: null };
export function setRoutePrefs(o = {}) {
  if ('avoidMotorways' in o && !!o.avoidMotorways !== prefs.avoidMotorways) { prefs.avoidMotorways = !!o.avoidMotorways; invalidateRoutes(); }
  if ('planMode' in o && o.planMode !== prefs.planMode) { prefs.planMode = o.planMode || null; invalidateRoutes(); }
}
export function getRoutePrefs() { return { ...prefs }; }
// Afsluitingen van evenementen (#203): voor wie rijdt of fietst telt een punt in een
// afgesloten gebied extra meters, zodat de route eromheen gaat. fn(x, y) -> extra meters (0 = vrij),
// sig wisselt als de afsluitingen wisselen (dan wordt de route opnieuw gepland).
let closureFn = null, closureSig = '';
export function setRouteClosures(fn, sig = '') {
  const same = sig === closureSig;
  closureFn = typeof fn === 'function' ? fn : null;
  closureSig = closureFn ? String(sig) : '';
  if (!same) invalidateRoutes();
}
function invalidateRoutes() { for (const k of Object.keys(slots)) { slots[k].key = ''; slots[k].route = null; } }

function busyTarget(world) {
  // a heli run (helirun.js) points at its next ring, pad or the balloon
  const hr = world.heliRunTarget;
  if (world.heliRun) return hr ? { x: hr.x, y: hr.y, kind: 'mission', name: hr.name || 'Heli' } : null;
  // a minigame on the spot (padel, carbid, the kermis): no route to anything else meanwhile
  if (playerBusy(world, ['padel', 'activityGame']).busy) return null;
  const job = world.sideJob;
  if (job && job.active) return job.marker ? { x: job.marker.x, y: job.marker.y, kind: 'job', name: job.label } : null;
  const m = world.mission;
  if (m && m.marker && m.phase === 'active') return { x: m.marker.x, y: m.marker.y, kind: 'mission', name: m.label || 'Missie' };
  return undefined;
}

function objectiveTarget(world) {
  const busy = busyTarget(world);
  if (busy !== undefined) return busy;
  // the player's own goal waits the story out (it takes the user slot)
  if (getGoal()) return null;
  // the story's next step (story.js): a mission start, or the shop, spot or
  // garage the next activity needs
  const g = world.storyGuide;
  if (g) return { x: g.x, y: g.y, kind: 'mission', name: g.name };
  // after the ending: the nearest post-game challenge still to win (postgame.js)
  const pg = world.postgameGuide;
  if (pg && !world.challenge) return { x: pg.x, y: pg.y, kind: 'mission', name: pg.name, pg: true };
  const m = world.mission;
  if (m && m.marker && m.phase !== 'cooldown' && !world.storyFreePlay && missionOnMap(world)) return { x: m.marker.x, y: m.marker.y, kind: 'mission', name: m.label || 'Missie' };
  return null;
}

const ownVehicle = (v) => !!(v && (v.isHeroCar || v.playerOwned) && !v.wrecked);

// Why the player needs care right now: 'repair' (in their own damaged
// vehicle), 'heal' (low health), or null; with hysteresis, so the route
// stays until they are really fixed or healed.
function careNeed(world) {
  // dying or being arrested is no moment for a snack tip
  if (world.pendingRespawn || world.health <= 0) return care;
  const v = world.player.inVehicle;
  const h = v ? v.health ?? 100 : 100;
  if (ownVehicle(v) && !v.isBoat && (h < CARE_DAMAGED || (care === 'repair' && h < CARE_FIXED))) return 'repair';
  if (world.health < CARE_HURT || (care === 'heal' && world.health < CARE_HEALED)) return 'heal';
  return null;
}

function careTarget(world, why) {
  const p = world.player;
  if (why === 'repair') {
    const s = nearestRepairSite(p.x, p.y);
    return s ? { x: s.x, y: s.y, kind: 'care', name: s.name, why } : null;
  }
  let best = null, bd = Infinity;
  const consider = (x, y, name) => {
    const d = Math.hypot(x - p.x, y - p.y);
    if (d < bd) { bd = d; best = { x, y, kind: 'care', name, why }; }
  };
  for (const h of getHorecaForRender() || []) consider(h.x, h.y, h.name || 'Kroeg');
  for (const s of getShopsForRender() || []) if (HEAL_SHOPS.has(s.type)) consider(s.x, s.y, s.name);
  return best;
}

function updateCare(world) {
  const need = careNeed(world);
  if (need !== care) {
    care = need;
    if (!need) careDismissed = null;
    else if (need === 'heal' && careDismissed !== need) world.addMessage('Opknappen: volg de roze route naar een snackbar of kroeg', 5, { kind: 'gevaar', key: 'care' });
  }
  return care && careDismissed !== care ? careTarget(world, care) : null;
}

// Hides the care route until the need is over (healed/fixed, or a new one).
export function dismissCareRoute() {
  careDismissed = care;
  slots.care.route = null;
  slots.care.key = '';
}

// City streets meet the Ommeland roads here: points of the country network
// near the city's edge that lie on a drivable city street (rebuilt with the
// country graph).
let gateways = null, gatewaysFor = -1;
function cityGateways(map) {
  if (gateways && gatewaysFor === roadGraphVersion()) return gateways;
  gatewaysFor = roadGraphVersion();
  gateways = [];
  const B = map.meta && map.meta.bounds;
  if (!B) return gateways;
  const cells = new Set();
  for (const n of gatewayCandidates(B, GATEWAY_BAND_M)) {
    const [x, y] = nodeXY(n);
    const key = Math.floor(x / GATEWAY_CELL_M) * 100003 + Math.floor(y / GATEWAY_CELL_M);
    if (cells.has(key)) continue;
    const sn = snapToRoad(map, x, y, 'drive');
    if (!sn || Math.hypot(sn.x - x, sn.y - y) > 12) continue;
    cells.add(key);
    gateways.push({ n, x, y });
  }
  return gateways;
}

// A route with an end outside the city graph: over the Ommeland roads, joined
// to the city streets at the best gateway. An end out in a field gets one
// straight leg to the nearest country road. null: the city graph handles it
// (both ends in town) or there is no way.
function countryRoute(world, target, from, to, graphMode, kind, p = world.player, force = false) {
  const map = world.map;
  const driveOnly = kind === 'drive';
  // a point counts as in the city when a city street is near and no country
  // road is nearer: country roads inside the city's bounds (where the city map
  // has no data) and the ring and its ramps, which the city graph cuts off at
  // its edge, belong to the country graph
  const inCity = (s, x, y) => {
    const cityD = s ? Math.hypot(s.x - x, s.y - y) : Infinity;
    if (cityD >= CITY_SNAP_OK_M) return false;
    if (cityD <= CITY_SURE_M && !roadGraphBuilt()) return true;
    if (!roadNetReady()) return true;
    const c = snapRoad(x, y, COUNTRY_ON_M);
    return !(c && c.d <= cityD + 5);
  };
  // force: both ends on the country net, for a way the city graph has no strict route for (a gap in its streets)
  const pIn = !force && inCity(from, p.x, p.y);
  const tIn = !force && inCity(to, target.x, target.y);
  if (pIn && tIn) return null;
  if (!roadNetReady()) return null;
  const ps = pIn ? null : snapRoad(p.x, p.y, COUNTRY_SNAP_M, !driveOnly);
  const ts = tIn ? null : snapRoad(target.x, target.y, COUNTRY_SNAP_M, !driveOnly);
  if ((!pIn && !ps) || (!tIn && !ts)) return null;
  const lead = (s, x, y) => (s && s.d > 0.5 ? [[x, y]] : []);
  const gws = pIn || tIn ? cityGateways(map) : null;
  const outer = pIn ? ts : ps;
  const cityEnd = pIn ? p : target;
  // free: the one-ways ignored; on foot or by bike always, by car as the last resort
  // when a one-way dead end (a ramp cut at the data's edge) leaves no way
  const attempt = (free) => {
    if (!pIn && !tIn) {
      const cp = roadPath(ps, ts, free);
      return cp ? [...lead(ps, p.x, p.y), ...cp, ...lead(ts, target.x, target.y)] : null;
    }
    // towards the outer end for a trip into the country, from it for a trip back (one-ways)
    const { dist } = roadCosts(outer, pIn, free);
    // the best gateways first; a one-way or a dead end at the map's edge can
    // leave the city part without a way, then the next one
    const ranked = [];
    for (const g of gws) {
      const c = dist[g.n] + Math.hypot(g.x - cityEnd.x, g.y - cityEnd.y) * 1.3;
      if (Number.isFinite(c)) ranked.push([c, g]);
    }
    ranked.sort((u, v) => u[0] - v[0]);
    const cityPart = (u, v) => astar(u, v, graphMode) || (driveOnly ? astar(u, v, 'mixed') || astar(u, v, 'free') : null);
    for (const [, g] of ranked.slice(0, GATEWAY_TRIES)) {
      const gs = snapToRoad(map, g.x, g.y, kind);
      if (!gs) continue;
      const city = pIn ? cityPart(from, gs) : cityPart(gs, to);
      if (!city) continue;
      const country = pIn ? roadPathFromNode(g.n, outer, free) : roadPathToNode(outer, g.n, free);
      if (!country) continue;
      return pIn ? [...city, ...country, ...lead(ts, target.x, target.y)] : [...lead(ps, p.x, p.y), ...country, ...city];
    }
    return null;
  };
  return driveOnly ? attempt(false) || attempt(true) : attempt('foot');
}

// The road router for one way of travel ('walk' | 'bike' | 'drive') between two
// points, the city graph only: strictly by the rules (no fallbacks), so the
// tests can hold every edge against roadaccess.js. opts: { avoidMotorways,
// az, bz } (the heights at the ends, for bridge or below). Returns
// { pts, roads } (roads[i]: the road between pts[i] and pts[i + 1]) or null.
export function planLandRoute(map, kind, a, b, opts = {}) {
  if (!graph || graph.map !== map) buildGraph(map);
  const lvl = (z, pen) => (Number.isFinite(z) ? { z, pen } : null);
  const from = snapToRoad(map, a[0], a[1], kind, lvl(opts.az, LEVEL_PEN_START_M));
  const to = snapToRoad(map, b[0], b[1], kind, lvl(opts.bz, LEVEL_PEN_TARGET_M));
  if (!from || !to) return null;
  const gm = kind === 'drive' ? (opts.avoidMotorways ? 'driveAvoid' : 'drive') : kind;
  const nodes = [];
  const pts = astar(from, to, gm, nodes);
  if (!pts) return null;
  const adj = kind === 'drive' ? (opts.avoidMotorways ? graph.driveAvoid : graph.drive) : kind === 'bike' ? graph.bike : graph.walk;
  const roads = [used.from.road];
  for (let i = 0; i < nodes.length - 1; i++) {
    const u = nodes[i], v = nodes[i + 1];
    let road = roads[roads.length - 1];
    for (let e = adj.start[u]; e < adj.start[u + 1]; e++) if (adj.to[e] === v) { road = map.roads[adj.road[e]]; break; }
    roads.push(road);
  }
  if (nodes.length) roads.push(used.to.road);
  return { pts, roads, from: used.from, to: used.to };
}

// Where a waypoint clicks onto for a mode: the nearest road that is for the
// mode, on the level asked for (z: 0 street level, a bridge deck's height).
export function snapWaypoint(map, kind, x, y, z) {
  if (!graph || graph.map !== map) buildGraph(map);
  return snapToRoad(map, x, y, kind, Number.isFinite(z) ? { z, pen: LEVEL_PEN_TARGET_M } : { z: 0, pen: LEVEL_PEN_TARGET_M / 2 });
}

// no-fly zones and landing spots in the air: police stations are no place for
// a helicopter; the pads, and the home helipad, are
const NOFLY_R = 70;
function airContext(map) {
  const meta = map.meta || {};
  if (!map._noFly) map._noFly = (meta.policeStations || []).map((s) => ({ x: s.x, y: s.y, r: NOFLY_R, name: s.name }));
  // the pads register as the world comes up (home.js, shops.js): asked every time
  const landings = [];
  if (meta.helipad) landings.push({ x: meta.helipad.x, y: meta.helipad.y, name: 'Helikopterplatform', kind: 'helipad' });
  for (const h of getHelipads()) if (!landings.some((l) => Math.hypot(l.x - h.x, l.y - h.y) < 20)) landings.push({ x: h.x, y: h.y, name: h.name || 'Landingsplek', kind: 'helipad' });
  return { noFly: map._noFly, landings };
}
export function noFlyZones(map) { return airContext(map).noFly; }
export function landingSpots(map) { return airContext(map).landings; }

// The rails for a train trip: the lines with their stops, the station entrances
function railContext(map) {
  const lines = (map.railRoutes || []).filter((r) => r.stops && r.stops.length > 1);
  return { lines, stations: (map.stations || []).concat(map.countryStations || []) };
}

// Water for a boat: the water polygons ignore the bridges over them (a boat
// sails under), the clearance keeps it off quays and moored hulls, and a
// bridge whose deck hangs lower than the boat is tall shuts the way.
function boatContext(map) {
  if (map._boatCtx) return map._boatCtx;
  const idx = getWaterIndex(map);
  const deck = new Map();
  const clearAt = (x, y) => {
    const k = Math.round(x / 6) * 100003 + Math.round(y / 6);
    let c = deck.get(k);
    if (c === undefined) {
      c = Infinity;
      for (const r of map.roadsNear(x, y, 5)) {
        if (!r.bridge || !r.z) continue;
        c = Math.min(c, roadZAt(r, x, y) - WATER_Y - 0.5);
      }
      deck.set(k, c);
    }
    return c;
  };
  return (map._boatCtx = {
    isWater: (x, y) => idx.inWater(x, y) || isInWater(map, x, y),
    clearance: (x, y) => waterClearance(map, x, y, 4),
    clearAt,
  });
}

export function planBoatRoute(map, a, b, opts = {}) { return boatRoute(boatContext(map), a, b, opts); }

// A boat trip between two points for a boat kind (or the vehicle): over the waterway network (vaarnet.js: every navigable
// water, bridges that open, locks, the boat's air draft) when it joins them, else the local grid search; both ends may lie
// on a quay beside the water, the trip then runs from and to the nearest water (#184, the waypoint on water). null: no water.
export function planBoatTrip(map, a, b, kind = 'sloep', opts = {}) {
  const net = getSharedNet();
  return boatTrip(boatContext(map), a, b, {
    height: Math.max(1.2, airOfKind(kind) + 0.05),
    net: net ? (sa, sb) => planVaarRoute(net, sa, sb, kind) : null,
    ...opts,
  });
}

// A goal on the water, for a way of travel that cannot go there (walking, riding, driving): the land beside the nearest
// shore, a berth to walk to; null when the goal is not on water or no shore is near.
export function berthFor(map, x, y, maxR = 400) {
  if (!isInWater(map, x, y)) return null;
  const idx = getWaterIndex(map), s = idx.nearestShore(x, y, maxR);
  if (s.i < 0) return null;
  const ex = idx.bx[s.i] - idx.ax[s.i], ey = idx.by[s.i] - idx.ay[s.i], l2 = ex * ex + ey * ey || 1e-9;
  const t = Math.max(0, Math.min(1, ((x - idx.ax[s.i]) * ex + (y - idx.ay[s.i]) * ey) / l2));
  const qx = idx.ax[s.i] + ex * t, qy = idx.ay[s.i] + ey * t;
  // a step beyond the shore, away from the water
  const dx = qx - x, dy = qy - y, k = Math.hypot(dx, dy) || 1;
  return { x: qx + (dx / k) * 1.5, y: qy + (dy / k) * 1.5, shoreD: s.d };
}
export function planAirRoute(map, a, b, opts = {}) { return airRoute(airContext(map), a, b, opts); }
export function planTrainTrip(map, a, b, opts = {}) {
  const ctx = railContext(map);
  return trainTrip({ ...ctx, walk: opts.walk }, a, b, opts);
}

const ROUTE_TO_HUD = { walk: 'lopen', bike: 'fiets', drive: 'auto', boat: 'boot', ov: 'ov', fly: 'lucht' };

function computeRoute(world, target, mode, start = world.player) {
  const t0 = performance.now();
  const map = world.map;
  const p = start;
  let pts = null, extra = null;
  if (mode === 'boat') {
    // over the waterway network for the boat kind the player sails ('sloep' when walking and planning a boat trip),
    // the local grid search where the net does not join the two
    const pv = p.inVehicle;
    const r = planBoatTrip(map, [p.x, p.y], [target.x, target.y], pv && pv.isBoat ? pv : 'sloep');
    pts = r ? r.pts : [[p.x, p.y]];
    if (r) extra = { etaS: r.etaS, dock: r.dock, net: !!r.net };
  } else if (mode === 'fly') {
    const plane = !!(world.player.inVehicle && world.player.inVehicle.isPlane);
    const r = planAirRoute(map, [p.x, p.y], [target.x, target.y], { plane });
    pts = r.pts;
    extra = { etaS: r.etaS, alt: r.alt, landing: r.landing };
  } else if (mode === 'ov') {
    const onTrain = !!(world.trainDriving || world.trainCam);
    const walk = (a, b) => {
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 20) return [a, b];
      const w = computeRoute(world, { x: b[0], y: b[1], kind: target.kind }, 'walk', { x: a[0], y: a[1], inVehicle: null });
      return w.pts.length > 1 ? w.pts : null;
    };
    const r = planTrainTrip(map, [p.x, p.y], [target.x, target.y], { onTrain, walk });
    if (r) {
      pts = r.pts;
      extra = { etaS: r.etaS, legs: r.legs.map((l) => ({ kind: l.kind, label: l.label, length: l.length })), uitstappen: r.uitstappen, changes: r.changes, stops: r.stops };
    } else pts = [[p.x, p.y]];
  } else {
    // a goal on the water: walk, ride or drive to the berth beside it (a quay, the shore), the boat takes over from there
    const berth = mode === 'walk' || mode === 'bike' || mode === 'drive' ? berthFor(map, target.x, target.y) : null;
    pts = landRoute(world, berth ? { ...target, x: berth.x, y: berth.y } : target, mode, p);
    extra = { compromise: landCompromise, ...(berth ? { berth: { x: berth.x, y: berth.y } } : null) };
    if (pts.length > 1) {
      const first = pts[0];
      const dFirst = Math.hypot(first[0] - p.x, first[1] - p.y);
      if (dFirst > 0.5 && dFirst <= CONNECTOR_MAX_M) pts.unshift([p.x, p.y]);
      const last = pts[pts.length - 1];
      const dLast = Math.hypot(last[0] - target.x, last[1] - target.y);
      if (dLast > 0.5 && dLast <= CONNECTOR_MAX_M) pts.push([target.x, target.y]);
    }
  }

  const cum = new Float64Array(pts.length);
  for (let i = 1; i < pts.length; i++) cum[i] = cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);

  const ms = performance.now() - t0;
  stats.lastMs = ms;
  stats.maxMs = Math.max(stats.maxMs, ms);
  stats.runs++;
  stats.avgMs += (ms - stats.avgMs) / stats.runs;

  const length = cum[pts.length - 1];
  return {
    pts, cum, length, remaining: length,
    kind: target.kind, target, mode, idx: 0, px: p.x, py: p.y, off: 0, version: stats.runs,
    fly: mode === 'fly' && pts.length <= 2,
    etaS: etaSeconds(length, ROUTE_TO_HUD[mode] || 'auto'),
    ...(extra || {}),
  };
}

// The roads for walk, bike and drive, city and Ommeland. It bends the rules
// only when nothing else gets there, and `compromise` then says so ('mixed':
// over the pedestrian area for a car-free goal; 'free': against a one-way at
// the data's edge).
let landCompromise = null;
function landRoute(world, target, mode, p) {
  const map = world.map;
  const driveOnly = mode === 'drive';
  const kind = mode;
  const avoid = driveOnly && prefs.avoidMotorways;
  const zFrom = levelOf(p.x === world.player.x && p.y === world.player.y ? world.player : p);
  const lvlFrom = { z: Number.isFinite(zFrom) ? zFrom : 0, pen: LEVEL_PEN_START_M };
  const lvlTo = { z: Number.isFinite(target.z) ? target.z : 0, pen: Number.isFinite(target.z) ? LEVEL_PEN_START_M : LEVEL_PEN_TARGET_M / 2 };
  let to = snapToRoad(map, target.x, target.y, kind, lvlTo);
  let graphMode = driveOnly ? (avoid ? 'driveAvoid' : 'drive') : kind;
  let compromise = null, carTo = null;
  // targets in car-free areas (Grote Markt, Poelestraat): drive along the
  // streets as close as possible, the last bit over the pedestrian area
  if (driveOnly && to && Math.hypot(to.x - target.x, to.y - target.y) > CONNECTOR_MAX_M) {
    const tw = snapToRoad(map, target.x, target.y, 'walk', lvlTo);
    if (tw && Math.hypot(tw.x - target.x, tw.y - target.y) <= CONNECTOR_MAX_M) { graphMode = 'mixed'; carTo = to; to = tw; compromise = 'mixed'; }
  }
  const from = snapToRoad(map, p.x, p.y, kind, lvlFrom);
  // The way to a snap: over the Ommeland roads when an end is out there, else over the city streets.
  // Both ends on a city street: the city graph is a candidate too, and the shorter way wins. A city street that the
  // province net also carries (it holds every car road of the tiles) counted as country, and the way then ran out
  // to a gateway on the city's edge and back (#320).
  const wayTo = (toS, gm) => {
    let w = countryRoute(world, target, from, toS, gm, kind, p);
    if (w && from && toS && Math.hypot(from.x - p.x, from.y - p.y) < CITY_SNAP_OK_M && Math.hypot(toS.x - target.x, toS.y - target.y) < CITY_SNAP_OK_M) {
      const direct = astar(from, toS, gm);
      if (direct && polyLength(direct) < polyLength(w)) w = direct;
    }
    if (!w && from && toS) {
      w = astar(from, toS, gm);
      // no strict way over the city streets: they can have a gap (a one-way cut off, a link missing) that the country net, which
      // holds every car road of the tiles, closes; before the compromises of a free way against the one-ways (#320)
      if (!w) w = countryRoute(world, target, from, toS, gm, kind, p, true);
    }
    return w;
  };
  let pts = wayTo(to, graphMode);
  if (!pts && from && to) {
    if (!pts && driveOnly) {
      const tw = snapToRoad(map, target.x, target.y, 'walk', lvlTo);
      if (tw) { pts = astar(from, tw, 'mixed'); if (pts) compromise = 'mixed'; }
    }
    if (!pts && driveOnly) { pts = astar(from, to, 'free'); if (pts) compromise = 'free'; }
  }
  // The last bit over the pedestrian area is a few metres, not a detour: when the way that comes close over the streets is far
  // longer than the one to the nearest street, the latter wins and the rest is walked (#320)
  if (pts && carTo && from && compromise === 'mixed') {
    const toStreet = wayTo(carTo, avoid ? 'driveAvoid' : 'drive');
    if (toStreet && polyLength(pts) > polyLength(toStreet) * MIXED_DETOUR_MAX + MIXED_DETOUR_SLACK_M) { pts = toStreet; compromise = null; }
  }
  // no route found: no line at all rather than a straight one through town
  if (!pts) { pts = [[p.x, p.y]]; compromise = null; }
  landCompromise = compromise;
  return pts;
}

function trackProgress(r, x, y) {
  const { pts, cum } = r;
  const lo = Math.max(0, r.idx - 3), hi = Math.min(pts.length - 1, r.idx + 60);
  let bestD2 = Infinity, bi = r.idx, bt = 0;
  for (let i = lo; i < hi; i++) {
    const ax = pts[i][0], ay = pts[i][1], dx = pts[i + 1][0] - ax, dy = pts[i + 1][1] - ay;
    const l2 = dx * dx + dy * dy;
    let t = l2 > 1e-9 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const d2 = (ax + dx * t - x) ** 2 + (ay + dy * t - y) ** 2;
    if (d2 < bestD2) { bestD2 = d2; bi = i; bt = t; }
  }
  if (pts.length < 2) { r.off = Math.hypot(pts[0][0] - x, pts[0][1] - y); r.remaining = r.off; return; }
  r.idx = bi;
  r.px = pts[bi][0] + (pts[bi + 1][0] - pts[bi][0]) * bt;
  r.py = pts[bi][1] + (pts[bi + 1][1] - pts[bi][1]) * bt;
  r.off = Math.sqrt(bestD2);
  r.remaining = r.length - (cum[bi] + (cum[bi + 1] - cum[bi]) * bt) + r.off;
}

function updateSlot(world, slot, target, mode) {
  if (!target || !mode) { slot.route = null; slot.key = ''; return; }
  const p = world.player;
  // already there: no line left to follow (it stayed on the map, #118)
  if (Math.hypot(target.x - p.x, target.y - p.y) < REACH_M * 2) { slot.route = null; slot.key = ''; return; }
  const key = `${target.kind}:${Math.round(target.x)}:${Math.round(target.y)}:${mode}:${prefs.avoidMotorways ? 1 : 0}:${closureSig}`;
  const now = performance.now() / 1000;
  if (key !== slot.key || !slot.route) {
    slot.key = key;
    slot.route = computeRoute(world, target, mode);
    slot.at = now;
    return;
  }
  trackProgress(slot.route, p.x, p.y);
  // a train carries you along its line: no straying there
  if (mode === 'ov' && (world.trainDriving || world.trainCam)) return;
  if (slot.route.off > TELEPORT_M || (slot.route.off > (STRAY_BY_MODE[mode] ?? STRAY_M) && now - slot.at >= MIN_RECOMPUTE_S)) {
    slot.route = computeRoute(world, target, mode);
    slot.at = now;
  }
}

export function updateRouting(dt, world) {
  if (!graph || graph.map !== world.map) buildGraph(world.map);
  const p = world.player;

  const mode = world.pigeonMode || world.heliRun ? 'fly' : world.trainDriving || world.trainCam ? 'ov' : travelMode(p);
  // the big map may plan the waypoint for another way of travel than your own
  const userMode = prefs.planMode || mode;
  const gt = busyTarget(world) === undefined && !world.challenge ? goalTarget(world) : null;
  updateSlot(world, slots.user, gt ? { x: gt.x, y: gt.y, kind: 'user', name: gt.name, z: gt.z } : null, userMode);
  updateSlot(world, slots.objective, objectiveTarget(world), mode);
  const ct = playerBusy(world, ['pigeon', 'heliRun', 'padel', 'activityGame']).busy ? null : updateCare(world);
  // no care route to where you're already standing
  updateSlot(world, slots.care, ct && Math.hypot(ct.x - p.x, ct.y - p.y) > REACH_M * 2 ? ct : null, mode);
  route = slots.user.route || slots.objective.route || slots.care.route;
}

export function getActiveRoute() {
  return route;
}

// Every route shown right now, drawn bottom to top: care, objective, waypoint.
export function getRoutes() {
  return [slots.care.route, slots.objective.route, slots.user.route].filter(Boolean);
}

export function getCareRoute() {
  return slots.care.route;
}

// Remaining polyline from the player's projection onto the route (the
// primary one unless given), up to maxLen metres.
export function getRouteAhead(maxLen, r = route) {
  const route = r;
  if (!route || route.pts.length < 2) return null;
  const out = [[route.px, route.py]];
  let acc = 0;
  let prev = out[0];
  for (let i = route.idx + 1; i < route.pts.length; i++) {
    const q = route.pts[i];
    const d = Math.hypot(q[0] - prev[0], q[1] - prev[1]);
    if (acc + d >= maxLen) {
      const k = (maxLen - acc) / (d || 1);
      out.push([prev[0] + (q[0] - prev[0]) * k, prev[1] + (q[1] - prev[1]) * k]);
      break;
    }
    acc += d;
    out.push(q);
    prev = q;
  }
  return out;
}

// A place on the map as the player's goal (goal.js); kept under this name
// for the many "zet op je kaart" callers.
export function setUserWaypoint(x, y, name = '', z = undefined) {
  setGoal({ kind: 'place', x, y, z, name: name || 'Bestemming' }, { quiet: true });
}

export function clearUserWaypoint() {
  clearGoal();
}

export { getUserWaypoint } from './goal.js';

export function getRoutingStats() {
  return { ...stats };
}

export function formatDistance(m) {
  if (m < 1000) return `${Math.max(0, Math.round(m / 10) * 10)} m`;
  return `${(m / 1000).toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

walkPathHook.find = findWalkPath; // pedroutes.js walks over this router (latehooks.js)
