import { dist, isInWater, closestPointOnSegment, pointInPolygon } from './util.js';
import { findWalkPath } from './routing.js';
import { trafficSignalsNear, pedestriansMayCross, getTrafficLights } from './trafficlights.js';
import { isInsideBuilding, isOnRoad, setPedPose, lineOfSight } from './pedestrians.js';
import { findProps, isPropBroken } from './breakables.js';
import { SpatialGrid } from './spatialgrid.js';
import { markZebraUser, zebraSpeedLimit } from './trafficyield.js';
export { zebraSpeedLimit };

// Long, purposeful walks: every civilian picks a destination a few hundred
// metres away, walks there over the walk network on one side of the street,
// crosses at junctions (waiting for red lights and gaps in traffic), idles or
// goes inside on arrival, then picks the next destination.

const DEST_MIN = 150;
const DEST_MAX = 600;
const PLAN_BUDGET_MS = 1.2;
const REACH = 1.1;
const TURN_RATE = 3.2;
const CAR_CATS = ['major', 'normal', 'minor'];
const CROSS_SCAN_M = 14;
const MAX_CROSS_WAIT = 25;
const RESYNC_GAP_S = 0.5;
const RESYNC_MAX_OFF = 20;
const FAR_THINK_DIST = 80;
const FAR_THINK_S = 0.2;
const AVOID_R = 1.2;
const AVOID_CELL = 3;
const PAIR_SPACING = 0.85;

export const pedNavStats = {
  planned: 0, failed: 0, totalLen: 0, planMsMax: 0, planMsTotal: 0,
  arrivals: 0, entered: 0, crossWaits: 0, replans: 0, stuckSkips: 0, queue: 0,
  crossings: 0, atSite: 0, detours: 0, detourExtra: 0, zebraCross: 0, benchSits: 0,
};

let pool = null;
function destPool(map) {
  if (pool) return pool;
  pool = [];
  const meta = map.meta || {};
  for (const h of meta.horeca || []) pool.push({ x: h.x, y: h.y, kind: 'horeca' });
  for (const p of (meta.pois && meta.pois.health) || []) pool.push({ x: p.x, y: p.y, kind: 'shop' });
  for (const l of meta.landmarks || []) for (let k = 0; k < 4; k++) pool.push({ x: l.x, y: l.y, kind: 'landmark' });
  for (const s of map.stations || []) for (let k = 0; k < 6; k++) pool.push({ x: s.x, y: s.y, kind: 'station' });
  return pool;
}

// Prefers destinations roughly ahead, so a walker that just finished (or just
// spawned facing along the street) doesn't turn straight around.
function pickDestination(map, ped, preferAhead) {
  const P = destPool(map);
  const hx = Math.cos(ped.angle), hy = Math.sin(ped.angle);
  let fallback = null;
  for (let k = 0; k < 24 && P.length; k++) {
    const d = P[Math.floor(Math.random() * P.length)];
    const dd = dist(ped.x, ped.y, d.x, d.y);
    if (dd < DEST_MIN || dd > DEST_MAX) continue;
    if (!preferAhead || ((d.x - ped.x) * hx + (d.y - ped.y) * hy) / dd > -0.2) return d;
    fallback = fallback || d;
  }
  if (fallback && Math.random() < 0.5) return fallback;
  const a = ped.angle + (preferAhead ? (Math.random() - 0.5) * 2.4 : Math.random() * Math.PI * 2);
  const r = DEST_MIN + Math.random() * (DEST_MAX - DEST_MIN);
  return { x: ped.x + Math.cos(a) * r, y: ped.y + Math.sin(a) * r, kind: 'street' };
}

const queue = [];

function navOf(ped) {
  if (!ped.nav) {
    ped.nav = {
      route: null, pending: null, queued: false, retryAt: 0, idleUntil: 0, enter: false,
      lastT: -Infinity, nextThink: 0, stuckT: 0, stuckX: ped.x, stuckY: ped.y, stuck: 0,
    };
    ped.walkSpeed = 1.1 + Math.random() * 0.4;
    ped.lane = Math.random();
  }
  return ped.nav;
}

function requestPlan(ped, dest) {
  const nav = navOf(ped);
  nav.pending = dest;
  nav.route = null;
  if (!nav.queued) { nav.queued = true; queue.push(ped); }
}

export function processPedPlanQueue(world) {
  const t0 = performance.now();
  let n = 0;
  while (queue.length && (n === 0 || performance.now() - t0 < PLAN_BUDGET_MS)) {
    const ped = queue.shift();
    const nav = ped.nav;
    nav.queued = false;
    if (!nav.pending || ped.state === 'dead') continue;
    if (dist(ped.x, ped.y, world.player.x, world.player.y) > 220) { nav.pending = null; continue; }
    n++;
    buildRoute(ped, world, nav.pending);
  }
  pedNavStats.queue = queue.length;
}

function sidewalkOffset(road, ped) {
  const w = road.width || 4;
  if (road.cat === 'foot') return Math.min(1.5, w * 0.3) * (0.2 + ped.lane * 0.8);
  if (road.bridge) return Math.max(0.3, w / 2 - 0.8);
  if (road.cat === 'cycle') return w / 2 + 0.8 + ped.lane * 0.4;
  return w / 2 + 1.2 + ped.lane * 0.7;
}

function walkable(map, x, y) {
  return !isInsideBuilding(map, x, y) && !isInWater(map, x, y);
}

// Pulls an offset point back towards the centreline until it is walkable.
function placeOffset(map, out, px, py, qx, qy) {
  for (const k of [1, 0.55, 0.2, 0]) {
    const x = px + (qx - px) * k, y = py + (qy - py) * k;
    if (k === 0 || walkable(map, x, y)) { out.push([x, y]); return; }
  }
}

// Offsetting at bevels and width changes leaves short back-and-forth
// zigzags; a walker would visibly turn around for them.
function despike(pts) {
  for (let pass = 0; pass < 3; pass++) {
    let changed = false;
    for (let i = 1; i < pts.length - 1; i++) {
      const a = pts[i - 1], b = pts[i], c = pts[i + 1];
      const ax = b[0] - a[0], ay = b[1] - a[1], bx = c[0] - b[0], by = c[1] - b[1];
      const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
      if (la < 0.4 || (Math.min(la, lb) < 6 && (ax * bx + ay * by) / (la * lb || 1) < -0.3)) {
        pts.splice(i, 1);
        i--;
        changed = true;
      }
    }
    if (!changed) break;
  }
}

function buildRoute(ped, world, dest) {
  const map = world.map;
  const nav = ped.nav;
  nav.pending = null;
  const t0 = performance.now();
  const res = findWalkPath(map, ped.x, ped.y, dest.x, dest.y);
  if (!res || res.pts.length < 2) {
    pedNavStats.failed++;
    nav.retryAt = world.time + 1 + Math.random() * 2;
    return;
  }

  const src = res.pts, srcLegs = res.legs;
  const pts = [src[0]], legs = [];
  for (let j = 1; j < src.length; j++) {
    const last = pts[pts.length - 1];
    const close = Math.hypot(src[j][0] - last[0], src[j][1] - last[1]) < 1.5;
    if (close && j < src.length - 1) continue;
    if (close && pts.length > 1) { pts[pts.length - 1] = src[j]; continue; }
    pts.push(src[j]);
    legs.push(srcLegs[j - 1]);
  }
  if (pts.length < 2) {
    pedNavStats.failed++;
    nav.retryAt = world.time + 2;
    return;
  }

  const dirs = [];
  for (let i = 0; i < legs.length; i++) {
    const dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1], l = Math.hypot(dx, dy) || 1;
    dirs.push([dx / l, dy / l]);
  }
  // stay on the side of the street the ped is already on
  const c0 = dirs[0][0] * (ped.y - pts[0][1]) - dirs[0][1] * (ped.x - pts[0][0]);
  const side = Math.abs(c0) > 0.3 ? Math.sign(c0) : Math.random() < 0.5 ? 1 : -1;
  const offs = legs.map((r) => sidewalkOffset(r, ped) * side);

  const out = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const [px, py] = pts[i];
    if (i === 0 || i === n - 1) {
      const k = i === 0 ? 0 : legs.length - 1;
      const [dx, dy] = dirs[k];
      placeOffset(map, out, px, py, px - dy * offs[k], py + dx * offs[k]);
      continue;
    }
    const [d1x, d1y] = dirs[i - 1], [d2x, d2y] = dirs[i];
    const o1 = offs[i - 1], o2 = offs[i];
    const q1x = px - d1y * o1, q1y = py + d1x * o1;
    const q2x = px - d2y * o2, q2y = py + d2x * o2;
    const cr = d1x * d2y - d1y * d2x;
    if (Math.abs(cr) < 0.15) {
      if (Math.abs(o1 - o2) > 0.3 && d1x * d2x + d1y * d2y > 0) placeOffset(map, out, px, py, q1x, q1y);
      placeOffset(map, out, px, py, q2x, q2y);
      continue;
    }
    const t = ((q2x - q1x) * d2y - (q2y - q1y) * d2x) / cr;
    const mx = q1x + d1x * t, my = q1y + d1y * t;
    if (Math.hypot(mx - px, my - py) > 2.5 * Math.max(Math.abs(o1), Math.abs(o2)) + 0.5) {
      placeOffset(map, out, px, py, q1x, q1y);
      placeOffset(map, out, px, py, q2x, q2y);
    } else placeOffset(map, out, px, py, mx, my);
  }

  despike(out);

  let length = Math.hypot(out[0][0] - ped.x, out[0][1] - ped.y);
  for (let i = 1; i < out.length; i++) length += Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]);
  nav.route = { pts: out, i: 0, dest, length, cross: null, crossLeg: -1 };
  nav.stuck = 0;

  const ms = performance.now() - t0;
  pedNavStats.planned++;
  pedNavStats.totalLen += length;
  pedNavStats.planMsTotal += ms;
  pedNavStats.planMsMax = Math.max(pedNavStats.planMsMax, ms);
}

// --- crossings ---------------------------------------------------------------

// Places where walkers are meant to cross a car road: zebras (a footway
// passing through the road), junctions and signalised crossings. Crossing
// elsewhere on a major/normal road is only done when no site is near.
const SITE_CELL = 32;
const DETOUR_SCAN_M = 45;
const DETOUR_MAX_EXTRA = 55;
const DETOUR_CATS = ['major', 'normal'];
let sites = null;

function addSite(x, y, kind) {
  sites.insertPoint({ x, y, kind }, x, y);
}

function buildSites(map) {
  sites = new SpatialGrid(SITE_CELL);
  const nodes = new Map();
  const key = (p) => Math.round(p[0] * 10) * 1e6 + Math.round(p[1] * 10);
  for (const r of map.roads) {
    r.pts.forEach((p, i) => {
      const k = key(p);
      let a = nodes.get(k);
      if (!a) nodes.set(k, a = []);
      a.push(r, i);
    });
  }
  for (const [, a] of nodes) {
    if (a.length < 4) continue;
    let car = null, busy = false, foot = false, branches = 0;
    for (let j = 0; j < a.length; j += 2) {
      const r = a[j], i = a[j + 1];
      const interior = i > 0 && i < r.pts.length - 1;
      branches += (i > 0) + (i < r.pts.length - 1);
      if (CAR_CATS.includes(r.cat)) {
        car = car || r.pts[i];
        if (interior && DETOUR_CATS.includes(r.cat)) busy = true;
      } else if (r.cat === 'foot' && interior) foot = true;
    }
    // same rule roadsurface.js uses to paint zebra stripes
    if (car && branches >= 3) addSite(car[0], car[1], busy && foot ? 'zebra' : 'junction');
  }
  for (const h of getTrafficLights()) if (h.crossing || h.bike) addSite(h.ax, h.ay, 'signal');
}

function sitesNear(x, y, r, out) {
  out.length = 0;
  for (const st of sites.queryRadius(x, y, r)) if ((st.x - x) ** 2 + (st.y - y) ** 2 <= r * r) out.push(st);
  return out;
}
const _sites = [];

function carRoadAt(map, x, y, margin) {
  for (const r of map.roadsNear(x, y, 2 + margin)) {
    if (!CAR_CATS.includes(r.cat)) continue;
    const halfW = (r.width || 5) / 2 + margin;
    const [minx, miny, maxx, maxy] = r.bounds;
    if (x < minx - halfW || x > maxx + halfW || y < miny - halfW || y > maxy + halfW) continue;
    const pts = r.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const cp = closestPointOnSegment(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
      if (cp.dist2 < halfW * halfW) return { road: r, seg: i, cx: cp.x, cy: cp.y };
    }
  }
  return null;
}

// Nearest point on `road` to (x, y) with the unit direction there.
function onRoad(road, x, y) {
  let best = null;
  const pts = road.pts;
  for (let i = 0; i < pts.length - 1; i++) {
    const cp = closestPointOnSegment(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (!best || cp.dist2 < best.d2) {
      const dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1], l = Math.hypot(dx, dy) || 1;
      best = { d2: cp.dist2, x: cp.x, y: cp.y, ux: dx / l, uy: dy / l };
    }
  }
  return best;
}

// First point within CROSS_SCAN_M of either end of the leg that lies on a
// car road: the kerb where the walker has to check lights and traffic.
function detectCrossing(map, ax, ay, bx, by) {
  const L = Math.hypot(bx - ax, by - ay);
  if (L < 0.5) return null;
  const steps = Math.ceil(L);
  for (let k = 1; k <= steps; k++) {
    const s = Math.min(L, k);
    if (s > CROSS_SCAN_M && L - s > CROSS_SCAN_M) { k = Math.floor(L - CROSS_SCAN_M); continue; }
    const x = ax + (bx - ax) * s / L, y = ay + (by - ay) * s / L;
    const hit = carRoadAt(map, x, y, 0.3);
    if (hit) {
      return { x, y, s, road: hit.road, ang: Math.atan2(by - ay, bx - ax), ok: s < 0.9, waited: 0, counted: false, site: null };
    }
  }
  return null;
}

function siteKind(cr) {
  const w = cr.road.width || 6;
  let best = null, bestD = w / 2 + 7;
  for (const st of sitesNear(cr.x, cr.y, bestD, _sites)) {
    const d = Math.hypot(st.x - cr.x, st.y - cr.y);
    if (d < bestD) { bestD = d; best = st; }
  }
  return best;
}

// Mid-block crossing of a busy road: walk along the kerb to the nearest
// crossing site instead, when that costs at most DETOUR_MAX_EXTRA metres.
function planDetour(map, r, cr, ax, ay) {
  if (!DETOUR_CATS.includes(cr.road.cat)) return false;
  const [bx, by] = r.pts[r.i];
  const direct = Math.hypot(bx - ax, by - ay);
  const off = (cr.road.width || 6) / 2 + 1.3;
  let best = null;
  for (const st of sitesNear(cr.x, cr.y, DETOUR_SCAN_M, _sites)) {
    const on = onRoad(cr.road, st.x, st.y);
    if (!on || on.d2 > 9) continue;
    const nx = -on.uy, ny = on.ux;
    const sN = Math.sign((ax - on.x) * nx + (ay - on.y) * ny) || 1;
    const N = [on.x + nx * off * sN, on.y + ny * off * sN], F = [on.x - nx * off * sN, on.y - ny * off * sN];
    const extra = Math.hypot(N[0] - ax, N[1] - ay) + 2 * off + Math.hypot(bx - F[0], by - F[1]) - direct;
    if (extra > DETOUR_MAX_EXTRA || (best && extra >= best.extra)) continue;
    if (!walkable(map, N[0], N[1]) || !walkable(map, F[0], F[1])) continue;
    best = { N, F, extra };
  }
  if (!best) return false;
  best.N.detour = true;
  best.F.detour = true;
  r.detours = (r.detours || 0) + 1;
  r.pts.splice(r.i, 0, best.N, best.F);
  r.crossLeg = -1;
  pedNavStats.detours++;
  pedNavStats.detourExtra += best.extra;
  return true;
}

// impatient: waited long enough to ignore the lights, but never walks out in
// front of something that would arrive within a couple of seconds
function canCross(world, cr, impatient = false) {
  if (!impatient) {
    for (const h of trafficSignalsNear(cr.x, cr.y)) {
      if (h.bike || h.broken) continue;
      if ((h.ax - cr.x) ** 2 + (h.ay - cr.y) ** 2 > 400) continue;
      if (!pedestriansMayCross(h)) return false;
      break;
    }
  }
  const gap = impatient ? 2 : 3.5;
  for (const v of world.vehicles) {
    if (v.isBoat || v.wrecked) continue;
    const sp = Math.abs(v.speed || 0);
    if (sp < 1.5) continue;
    // the reach grows with speed: a car doing 30 m/s is looked out for from far off
    const reach = 12 + sp * (gap + 1);
    const dx = cr.x - v.x, dy = cr.y - v.y;
    if (Math.abs(dx) > reach || Math.abs(dy) > reach) continue;
    const d = Math.hypot(dx, dy) || 1;
    const closing = (dx * Math.cos(v.angle) + dy * Math.sin(v.angle)) * v.speed / d;
    if (closing > 0 && (d - 3) / closing < gap) return false;
  }
  return true;
}

// --- local avoidance ---------------------------------------------------------

const grid = new SpatialGrid(AVOID_CELL);

export function buildPedAvoidGrid(peds) {
  grid.clear();
  for (let n = 0; n < peds.length; n++) {
    const p = peds[n];
    p._sepN = n;
    if (p.state === 'dead') continue;
    grid.insertPoint(p, p.x, p.y);
  }
}

function avoidBias(ped, ang) {
  const hx = Math.cos(ang), hy = Math.sin(ang);
  let bias = 0;
  for (const o of grid.queryRadius(ped.x, ped.y, AVOID_CELL)) {
    if (o === ped || o === ped.leader || o.leader === ped) continue;
    const dx = o.x - ped.x, dy = o.y - ped.y;
    const d = Math.hypot(dx, dy);
    if (d > AVOID_R || d < 1e-3) continue;
    const ahead = (dx * hx + dy * hy) / d;
    if (ahead < 0.2) continue;
    const lat = dx * -hy + dy * hx;
    bias += (lat > 0 ? -1 : 1) * 0.55 * (1 - d / AVOID_R) * ahead;
  }
  return Math.max(-0.9, Math.min(0.9, bias));
}

// Walkers that still end up overlapping (waiting at a kerb, bunching on a
// narrow footway) are nudged apart a little each frame. Pinned ones (scene
// actors, guards, sitters) hold their spot and only push others.
const SEP_DIST = 0.62;
const SEP_RATE = 0.8;
const pinned = (p) => !!(p.scene || p.state === 'guard' || (p.nav && p.nav.sit && p.nav.sit.phase === 'sit'));
export function separatePeds(peds, map) {
  const D2 = SEP_DIST * SEP_DIST;
  for (let n = 0; n < peds.length; n++) {
    const a = peds[n];
    if (a.state === 'dead' || a.ragdoll) continue;
    for (const b of grid.queryRadius(a.x, a.y, AVOID_CELL)) {
      if (b === a || b._sepN <= n || b.state === 'dead' || b.ragdoll) continue;
      let dx = b.x - a.x, dy = b.y - a.y;
      const d2 = dx * dx + dy * dy;
      if (d2 >= D2) continue;
      const pa = pinned(a), pb = pinned(b);
      if (pa && pb) continue;
      let d = Math.sqrt(d2);
      if (d < 1e-3) { const g = n * 2.39996; dx = Math.cos(g); dy = Math.sin(g); d = 1; }
      const push = (SEP_DIST - Math.min(d, SEP_DIST)) * SEP_RATE;
      const ux = dx / d, uy = dy / d;
      const ka = pa ? 0 : pb ? push : push / 2, kb = pb ? 0 : pa ? push : push / 2;
      if (ka && walkable(map, a.x - ux * ka, a.y - uy * ka)) { a.x -= ux * ka; a.y -= uy * ka; }
      if (kb && walkable(map, b.x + ux * kb, b.y + uy * kb)) { b.x += ux * kb; b.y += uy * kb; }
    }
  }
}

function turnToward(ped, target, dt) {
  let d = target - ped.angle;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  const max = TURN_RATE * dt;
  ped.angle += Math.max(-max, Math.min(max, d));
}

// --- benches -------------------------------------------------------------------

// Benches are breakable props (cityprops.js); `angle` is the long axis, the
// sitter faces axis - 90deg. One walker per seat, three seats per bench.
const SEAT_OFFS = [0, -0.52, 0.52];
const seatClaims = new Map();

function seatTaken(key, world) {
  const p = seatClaims.get(key);
  if (!p) return false;
  const S = p.nav && p.nav.sit;
  if (p.state !== 'dead' && !p._entered && S && S.key === key && world.time - p.nav.lastT < 2) return true;
  seatClaims.delete(key);
  return false;
}

function benchBroken(b) {
  return !b.cell || isPropBroken(b.key);
}

function findSeat(world, ped, radius, onlyBench = null, aheadOnly = false) {
  const map = world.map;
  let best = null;
  for (const b of findProps(ped.x, ped.y, radius)) {
    if (b.kind !== 'bench' || benchBroken(b) || (onlyBench && b !== onlyBench)) continue;
    const d = dist(ped.x, ped.y, b.x, b.y);
    if (d > radius || (best && d >= best.d)) continue;
    if (aheadOnly && ((b.x - ped.x) * Math.cos(ped.angle) + (b.y - ped.y) * Math.sin(ped.angle)) < -0.3 * d) continue;
    const face = b.angle - Math.PI / 2;
    const fx = Math.cos(face), fy = Math.sin(face);
    for (const z of SEAT_OFFS) {
      const key = b.key + '#' + z;
      if (seatTaken(key, world)) continue;
      const sx = b.x - fx * 0.02 - fy * z, sy = b.y - fy * 0.02 + fx * z;
      const stand = [sx + fx * 0.8, sy + fy * 0.8];
      if (!walkable(map, stand[0], stand[1])) continue;
      if (d > 2 && (!lineOfSight(map, ped.x, ped.y, stand[0], stand[1]) || detectCrossing(map, ped.x, ped.y, stand[0], stand[1]))) break;
      best = { d, bench: b, key, sx, sy, face, stand };
      break;
    }
  }
  return best;
}

function goSit(ped, world, seat, resume, follow = false) {
  const nav = ped.nav;
  seatClaims.set(seat.key, ped);
  nav.sit = {
    ...seat, resume, follow, phase: 'go',
    goUntil: world.time + seat.d / 0.8 + 4,
    until: 0,
  };
}

function releaseSeat(ped) {
  const S = ped.nav && ped.nav.sit;
  if (!S) return;
  if (seatClaims.get(S.key) === ped) seatClaims.delete(S.key);
  ped.nav.sit = null;
}

function inPark(map, x, y) {
  for (const g of map.greenNear(x, y, 0.5)) {
    const [minx, miny, maxx, maxy] = g.bounds;
    if (x < minx || x > maxx || y < miny || y > maxy) continue;
    if (pointInPolygon(x, y, g.pts)) return true;
  }
  return false;
}

// Returns null when the ped is not (or no longer) busy with a bench.
function stepSit(ped, world, nav, dt) {
  const S = nav.sit;
  const t = world.time;
  if (benchBroken(S.bench)) {
    const sitting = S.phase === 'sit';
    releaseSeat(ped);
    if (!sitting) return null;
    setPedPose(ped, null);
    ped.state = 'flee';
    ped.stateUntil = t + 5 + Math.random() * 3;
    ped.fleeFrom = { x: S.bench.x, y: S.bench.y };
    ped.fleeSpeed = 3.4;
    return false;
  }
  if (S.phase === 'go') {
    const [gx, gy] = S.stand;
    const d = dist(ped.x, ped.y, gx, gy);
    if (t > S.goUntil) { releaseSeat(ped); return null; }
    if (d > 0.45) {
      turnToward(ped, Math.atan2(gy - ped.y, gx - ped.x), dt * 1.5);
      ped.speed = ped.walkSpeed * (d < 2 ? 0.6 : 0.9);
      return true;
    }
    S.phase = 'sit';
    S.until = S.follow ? Infinity : t + 15 + Math.random() * 45;
    pedNavStats.benchSits++;
  }
  const L = ped.leader;
  const leaderUp = S.follow && !(L && L.nav && L.nav.sit && L.nav.sit.phase === 'sit' && L.state === 'wander');
  if (t >= S.until || leaderUp) {
    setPedPose(ped, null);
    ped.x = S.stand[0];
    ped.y = S.stand[1];
    releaseSeat(ped);
    nav.benchAt = t + 90 + Math.random() * 90;
    if (!S.follow) {
      if (S.resume && nav.route) resync(ped, world, nav, true);
      else requestPlan(ped, pickDestination(world.map, ped, true));
    }
    ped.speed = 0;
    return false;
  }
  ped.x = S.sx;
  ped.y = S.sy;
  ped.angle = S.face;
  ped.speed = 0;
  if (ped.pose !== 'sit') setPedPose(ped, 'sit');
  return false;
}

// --- per-ped step --------------------------------------------------------------

function resync(ped, world, nav, keep = false) {
  if (nav.sit && !keep) {
    releaseSeat(ped);
    if (ped.pose === 'sit') setPedPose(ped, null);
  }
  if (nav.idleUntil) {
    nav.idleUntil = 0;
    nav.enter = false;
    requestPlan(ped, pickDestination(world.map, ped, false));
    return;
  }
  const r = nav.route;
  if (!r) return;
  let best = -1, bestD = Infinity;
  for (let j = Math.max(0, r.i - 2); j < Math.min(r.pts.length, r.i + 16); j++) {
    const d = dist(ped.x, ped.y, r.pts[j][0], r.pts[j][1]);
    if (d < bestD) { bestD = d; best = j; }
  }
  if (bestD > RESYNC_MAX_OFF) {
    pedNavStats.replans++;
    requestPlan(ped, r.dest);
    return;
  }
  r.i = Math.min(r.pts.length - 1, best + (best < r.pts.length - 1 && bestD < 3 ? 1 : 0));
  r.cross = null;
  r.crossLeg = -1;
}

function arrive(ped, world, nav) {
  pedNavStats.arrivals++;
  const dest = nav.route.dest;
  nav.route = null;
  const nearBuilding = world.map.buildingsNear(ped.x, ped.y, 6).length > 0;
  const goesIn = dest.kind !== 'landmark' && nearBuilding && Math.random() < (dest.kind === 'street' ? 0.2 : 0.4);
  if (!goesIn && Math.random() < 0.35) {
    const seat = findSeat(world, ped, 25);
    if (seat) { goSit(ped, world, seat, false); return; }
  }
  nav.enter = goesIn;
  nav.idleUntil = world.time + (goesIn ? 0.6 + Math.random() * 1.2 : 4 + Math.random() * 8);
  if (dist(ped.x, ped.y, dest.x, dest.y) < 40) nav.faceX = dest.x, nav.faceY = dest.y;
  else nav.faceX = null;
  if (!goesIn && Math.random() < 0.4) setPedPose(ped, 'phone');
}

function followLeader(ped, world, dt) {
  const L = ped.leader;
  const Ln = L.nav;
  if (L._entered && dist(ped.x, ped.y, L.x, L.y) < 4) { ped._entered = true; return 'enter'; }
  const gone = L._entered || L.state !== 'wander' || (Ln && world.time - Ln.lastT > 1) || dist(ped.x, ped.y, L.x, L.y) > 12;
  if (gone) { ped.leader = null; return null; }
  const LS = Ln && Ln.sit;
  if (LS && LS.phase === 'sit' && !ped.nav.sit && world.time > (ped.nav.benchAt || 0)) {
    ped.nav.benchAt = world.time + 3;
    const seat = findSeat(world, ped, 6, LS.bench);
    if (seat) { goSit(ped, world, seat, false, true); return true; }
  }
  const side = ped.pairSide || 1;
  const tx = L.x - Math.sin(L.angle) * PAIR_SPACING * side, ty = L.y + Math.cos(L.angle) * PAIR_SPACING * side;
  const d = dist(ped.x, ped.y, tx, ty);
  if (!L.speed && d < 0.6) {
    ped.speed = 0;
    turnToward(ped, L.angle, dt);
    return false;
  }
  if (d > 0.3) turnToward(ped, Math.atan2(ty - ped.y, tx - ped.x), dt * 1.5);
  else turnToward(ped, L.angle, dt);
  ped.speed = Math.min(2.2, Math.max(L.speed, 0.6) * (1 + Math.max(-0.4, Math.min(0.6, (d - 0.3) * 0.5))));
  return true;
}

// Steers a wandering ped along its route. Returns true when it walks this
// frame, false when it stands, 'enter' when it has gone inside a building.
export function walkRoute(ped, world, dt, dPlayer) {
  const nav = navOf(ped);
  const t = world.time;
  const gap = t - nav.lastT;
  nav.lastT = t;

  if (nav.sit && gap <= RESYNC_GAP_S) {
    const s = stepSit(ped, world, nav, dt);
    if (s !== null) return s;
  }
  if (ped.leader) {
    const f = followLeader(ped, world, dt);
    if (f !== null) return f;
  }
  if (gap > RESYNC_GAP_S && gap !== Infinity) resync(ped, world, nav);

  if (nav.idleUntil) {
    if (t < nav.idleUntil) {
      ped.speed = 0;
      if (nav.faceX != null) turnToward(ped, Math.atan2(nav.faceY - ped.y, nav.faceX - ped.x), dt);
      return false;
    }
    nav.idleUntil = 0;
    if (ped.pose) setPedPose(ped, null);
    if (nav.enter) {
      pedNavStats.entered++;
      ped._entered = true;
      return 'enter';
    }
    requestPlan(ped, pickDestination(world.map, ped, false));
  }

  const r = nav.route;
  if (!r) {
    if (!nav.queued && t >= nav.retryAt) requestPlan(ped, pickDestination(world.map, ped, true));
    ped.speed = 0;
    return false;
  }

  if (dPlayer > FAR_THINK_DIST && t < nav.nextThink && !r.cross?.waiting) return ped.speed > 0;
  const thinkDt = dPlayer > FAR_THINK_DIST ? Math.max(dt, FAR_THINK_S) : dt;
  nav.nextThink = t + FAR_THINK_S;

  let tgt = r.pts[r.i];
  while (dist(ped.x, ped.y, tgt[0], tgt[1]) < REACH) {
    if (r.i >= r.pts.length - 1) { arrive(ped, world, nav); ped.speed = 0; return false; }
    r.i++;
    tgt = r.pts[r.i];
  }

  if (r.crossLeg !== r.i) {
    const map = world.map;
    r.crossLeg = r.i;
    const a = r.i > 0 ? r.pts[r.i - 1] : [ped.x, ped.y];
    r.cross = detectCrossing(map, a[0], a[1], tgt[0], tgt[1]);
    if (r.cross) {
      if (!sites) buildSites(map);
      r.cross.site = siteKind(r.cross);
      const mayDetour = !a.detour && !tgt.detour && (r.detours || 0) < 6;
      if (mayDetour && !r.cross.site && !r.cross.ok && planDetour(map, r, r.cross, ped.x, ped.y)) {
        r.cross = null;
        tgt = r.pts[r.i];
      } else {
        pedNavStats.crossings++;
        if (r.cross.site) pedNavStats.atSite++;
      }
    }
  }
  const cr = r.cross;
  const zebra = cr && cr.site && cr.site.kind === 'zebra';
  if (zebra && (!cr.ok || cr.onZebra)) markZebraUser(ped, cr, t);
  if (cr && !cr.ok) {
    const dEntry = dist(ped.x, ped.y, cr.x, cr.y);
    if (dEntry < 1.2) {
      if (canCross(world, cr, cr.waited > MAX_CROSS_WAIT)) {
        cr.ok = true;
        cr.waiting = false;
        if (zebra) { cr.onZebra = true; pedNavStats.zebraCross++; }
      } else {
        if (!cr.counted) { cr.counted = true; pedNavStats.crossWaits++; }
        cr.waiting = true;
        cr.waited += thinkDt;
        ped.speed = 0;
        turnToward(ped, cr.ang, thinkDt);
        return false;
      }
    }
  }

  nav.stuckT += thinkDt;
  if (nav.stuckT > 2.5) {
    const moved = dist(ped.x, ped.y, nav.stuckX, nav.stuckY);
    nav.stuckT = 0;
    nav.stuckX = ped.x; nav.stuckY = ped.y;
    if (moved < 0.5) {
      nav.stuck++;
      pedNavStats.stuckSkips++;
      if (nav.stuck >= 3) { pedNavStats.replans++; requestPlan(ped, pickDestination(world.map, ped, false)); ped.speed = 0; return false; }
      if (r.i < r.pts.length - 1) r.i++;
    } else nav.stuck = 0;
  }

  if (dPlayer < 90 && t > (nav.benchAt || 0) && !ped.leader) {
    nav.benchAt = t + 5;
    const map = world.map;
    const calm = inPark(map, ped.x, ped.y) || isOnRoad(map, ped.x, ped.y, 0.5, ['foot']);
    if (Math.random() < (calm ? 0.06 : 0.008)) {
      const seat = findSeat(world, ped, 14, null, true);
      if (seat) { goSit(ped, world, seat, true); return true; }
    }
  }

  const want = Math.atan2(tgt[1] - ped.y, tgt[0] - ped.x);
  turnToward(ped, want + avoidBias(ped, want), thinkDt);
  ped.speed = ped.walkSpeed;
  return true;
}

// A companion that walks next to `leader` for as long as the leader walks.
export function makeCompanion(ped, leader) {
  ped.leader = leader;
  ped.pairSide = Math.random() < 0.5 ? 1 : -1;
  ped.angle = leader.angle;
  navOf(ped);
}
