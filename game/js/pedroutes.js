import { probe } from './hitchprobe.js';
import { hoofdspeler } from './players.js';
import { dist, isInWater, closestPointOnSegment, pointInPolygon } from './util.js';
import { trafficSignalsNear, pedestriansMayCross, getTrafficLights } from './trafficlights.js';
import { isInsideBuilding, isOnRoad, CAR_ROAD_CATS, setPedPose, lineOfSight } from './pedgeom.js';
import { findProps, isPropBroken } from './breakables.js';
import { SpatialGrid } from './spatialgrid.js';
import { walkPathHook } from './latehooks.js';
import { markZebraUser, zebraSpeedLimit } from './trafficyield.js';
import { poiLayerPlaces, FAC } from './facilities.js';
import { DEST_KINDS, NIGHTLIFE_SPOTS, pickDestKind, paceFor, arrivalPlan } from './dailyrhythm.js';
import { PARKS } from './parkplekken.js';
import { haltesInBeeld, halteplek } from './boarding.js';
import { freeTerraceSeat, claimTerraceSeat, releaseTerraceSeat } from './terraceseats.js';
import { createCalmGate } from './tilestream.js';
import { tileOrigin, TILE_M } from './gdt.js';
const tilesCalmGate = createCalmGate(); // wacht ook op de achtergrondwachtrij van de tegelwereld, hoogstens twee seconden achter elkaar (#1052)
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

const pedNavStats = {
  planned: 0, failed: 0, totalLen: 0, planMsMax: 0, planMsTotal: 0,
  arrivals: 0, entered: 0, crossWaits: 0, replans: 0, stuckSkips: 0, queue: 0,
  crossings: 0, atSite: 0, detours: 0, detourExtra: 0, zebraCross: 0, benchSits: 0,
  terraceSits: 0, bikeLocks: 0, talks: 0, rhythm: {},
};

// Bestemmingen per soort (dailyrhythm.js DEST_KINDS) uit de bestaande data: horeca, winkels, bezienswaardigheden,
// stations, parken, buurten en de bushaltes rond de speler. Eén keer gebouwd (opnieuw zodra facilities.json binnen is).
let pool = null, poolFac = false;
const FAC_SHOPS = ['supermarket', 'bakery', 'clothes', 'shoes', 'convenience', 'variety_store', 'butcher', 'kiosk', 'newsagent', 'second_hand'];
const SCHOOL_RE = /academie|forum|universiteit|school|zernike/i;
const PARK_RE = /plantsoen|tuin|park/i;
function destPool(map) {
  if (pool && (poolFac || !FAC.ready)) return pool;
  poolFac = !!FAC.ready;
  pool = { all: [] };
  for (const k of DEST_KINDS) pool[k] = [];
  const add = (kind, x, y, n = 1) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    for (let i = 0; i < n; i++) { const d = { x, y, kind }; pool[kind].push(d); pool.all.push(d); }
  };
  const meta = map.meta || {};
  for (const h of meta.horeca || []) {
    const out = NIGHTLIFE_SPOTS.some((s) => dist(h.x, h.y, s.x, s.y) < s.r);
    add(out ? 'uitgaan' : 'horeca', h.x, h.y);
    if (out) pool.horeca.push({ x: h.x, y: h.y, kind: 'horeca' });   // de kroeg in de uitgaanskern is overdag gewoon horeca
  }
  for (const p of poiLayerPlaces(map, 'pois.health')) add('winkel', p.x, p.y);
  for (const s of meta.shops || []) { add('winkel', s.x, s.y); add('werk', s.x, s.y); }
  for (const k of FAC_SHOPS) for (const f of (FAC.byKind && FAC.byKind.get(k)) || []) add('winkel', f.x, f.y);
  for (const l of meta.landmarks || []) {
    const name = l.name || '';
    add(SCHOOL_RE.test(name) ? 'school' : PARK_RE.test(name) ? 'park' : 'werk', l.x, l.y, 4);
  }
  for (const c of meta.careSites || []) add('werk', c.x, c.y, 2);
  for (const s of map.stations || []) add('station', s.x, s.y, 6);
  for (const pk of PARKS) add('park', pk.x, pk.y, 4);
  for (const b of meta.neighbourhoodPoints || []) add('huis', b.x, b.y);
  return pool;
}

// De klok van de dagritmes: pedestrians.js zet hem één keer per beeld (speluur, weekdag van de kalender, nat 0..1).
const clock = { hour: 12, weekday: 3, wet: 0 };
export function setRhythmClock(hour, weekday, wet = 0) { clock.hour = hour; clock.weekday = weekday; clock.wet = wet; }
// wat de dagritmes opleveren (scripts/levendestad_wereld_test.mjs): per soort bestemming, terras, bank, fiets, praten
export const pedRhythmStats = () => pedNavStats;

// halte: de haltes rond de speler (bushalte.js meldt ze via boarding.js), op de plek van de paal
const _haltes = [];
function haltesNow() {
  _haltes.length = 0;
  for (const h of haltesInBeeld()) { const p = halteplek(h); if (p) _haltes.push({ x: p.x, y: p.y, kind: 'halte' }); }
  return _haltes;
}

function sampleFrom(list, ped, hx, hy, preferAhead) {
  let fallback = null;
  for (let k = 0; k < 16 && list.length; k++) {
    const d = list[Math.floor(Math.random() * list.length)];
    const dd = dist(ped.x, ped.y, d.x, d.y);
    if (dd < DEST_MIN || dd > DEST_MAX) continue;
    if (!preferAhead || ((d.x - ped.x) * hx + (d.y - ped.y) * hy) / dd > -0.2) return d;
    fallback = fallback || d;
  }
  return fallback;
}

// Prefers destinations roughly ahead, so a walker that just finished (or just
// spawned facing along the street) doesn't turn straight around. Which kind of
// place follows the hour and the day (dailyrhythm.js, #1314).
function pickDestination(map, ped, preferAhead) {
  const P = destPool(map);
  const hx = Math.cos(ped.angle), hy = Math.sin(ped.angle);
  const nav = navOf(ped);
  nav.pace = paceFor(clock.hour, clock.weekday);
  const kind = pickDestKind(clock.hour, clock.weekday, Math.random(), (k) => (k === 'halte' ? haltesInBeeld().length > 0 : P[k].length > 0));
  if (kind) {
    const d = sampleFrom(kind === 'halte' ? haltesNow() : P[kind], ped, hx, hy, preferAhead);
    if (d) { pedNavStats.rhythm[kind] = (pedNavStats.rhythm[kind] || 0) + 1; return kind === 'halte' ? { x: d.x, y: d.y, kind } : d; }
  }
  const fallback = sampleFrom(P.all, ped, hx, hy, preferAhead);
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
    if (dist(ped.x, ped.y, hoofdspeler(world).x, hoofdspeler(world).y) > 220) { nav.pending = null; continue; }
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

// A walker keeps to the verge or the sidewalk; the carriageway of a car road is
// only for a bridge, where there is no verge at all (#502).
function walkable(map, x, y) {
  return !isInsideBuilding(map, x, y) && !isInWater(map, x, y) && !isOnRoad(map, x, y, 0.2, CAR_ROAD_CATS);
}

// Pulls an offset point towards the verge or sidewalk beside the leg. The other
// side and a little further out come before the carriageway: a walker on the
// asphalt of a provincial road is a walker in the lane (#502). Only where neither
// side has a walkable spot (a bridge) does he keep to the road itself.
function placeOffset(map, out, px, py, qx, qy) {
  const dx = qx - px, dy = qy - py;
  for (const side of [1, -1]) {
    for (const k of [1, 1.2, 0.7, 1.4]) {
      const x = px + dx * k * side, y = py + dy * k * side;
      if (walkable(map, x, y)) { out.push([x, y]); return; }
    }
  }
  for (const k of [1, 0.55, 0.2, 0]) {
    const x = px + dx * k, y = py + dy * k;
    if (k === 0 || (!isInsideBuilding(map, x, y) && !isInWater(map, x, y))) { out.push([x, y]); return; }
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
  const res = walkPathHook.find(map, ped.x, ped.y, dest.x, dest.y);
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
let sitesGeo = null; // { map, ver }: de sites horen bij deze wegenstand

function addSite(x, y, kind) {
  sites.insertPoint({ x, y, kind }, x, y);
}

function buildSites(map) {
  sitesBuild = null;
  for (const _ of buildSitesSteps(map)) { /* in één keer */ }
}
// perf-r3 (24-11, t-voetgangers tot ~165 ms): de volle opbouw (na een sprong, als de tegellog niet ver genoeg terugreikt) loopt in
// stappen van hoogstens SITES_BUDGET_MS per beeld in een nieuwe grid; de oude sites blijven tot de nieuwe af zijn (zelfde uitkomst
// als in één keer: dezelfde knopen in dezelfde volgorde). Alleen zonder sites (de eerste keer) gaat het in één keer.
const SITES_BUDGET_MS = 2;
let sitesBuild = null;
function* buildSitesSteps(map) {
  const roads = map.orderedRoads ? map.orderedRoads() : map['roads'] || [];
  const geo = { map, ver: map._roadVer !== undefined ? map._roadVer : map.geoVer, geo: map.geoVer, roads: new Set(roads) };
  const grid = new SpatialGrid(SITE_CELL);
  const nodes = new Map();
  const key = (p) => Math.round(p[0] * 10) * 1e6 + Math.round(p[1] * 10);
  for (let n = 0; n < roads.length; n++) {
    const r = roads[n];
    r.pts.forEach((p, i) => {
      const k = key(p);
      let a = nodes.get(k);
      if (!a) nodes.set(k, a = []);
      a.push(r, i);
    });
    if (n % 400 === 399) yield;
  }
  let n = 0;
  for (const [, a] of nodes) {
    const site = nodeSite(a);
    if (site) grid.insertPoint(site, site.x, site.y);
    if (++n % 2000 === 0) yield;
  }
  for (const h of getTrafficLights()) if (h.crossing || h.bike) grid.insertPoint({ x: h.ax, y: h.ay, kind: 'signal' }, h.ax, h.ay);
  sites = grid;
  sitesGeo = geo;
}
function stepSitesBuild() {
  if (!sitesBuild) return;
  const t0 = performance.now();
  do { if (sitesBuild.next().done) { sitesBuild = null; return; } } while (performance.now() - t0 < SITES_BUDGET_MS);
}
// elk beeld een stuk van een lopende opbouw (pedestrians.js updatePedestrians)
export function stepPedSites() { stepSitesBuild(); }

// 24-11 (profiel benchmark: buildSites 10% van de spellus, bij elke nieuwe wegentegel over ALLE wegen): alleen wat sinds de vorige bouw
// veranderde, opnieuw. Per gewijzigde tegel (map.geoLog, tileworld.js) de wegen die nu zijn vlak raken tegen de wegen die er bij de vorige
// bouw waren: een site verandert alleen op een punt van een weg die erbij kwam of wegging. In de box van zo'n weg gaan de sites eruit en
// leveren alle wegen die die box raken de knopen opnieuw (een knoop in de box heeft al zijn wegen in die zoekvraag). False: alles opnieuw.
const inRect = (R, x, y) => x >= R[0] && x <= R[2] && y >= R[1] && y <= R[3];
function patchSites(map) {
  const log = map.geoLog, since = sitesGeo && sitesGeo.geo;
  if (!sites || !sitesGeo || sitesGeo.map !== map || since == null || !map.roadGrid || !log || !log.length || !(log[0] <= since + 1)) return false;
  const known = sitesGeo.roads;
  if (!known) return false;
  const changed = [];
  for (let n = 0; n < log.length; n += 2) {
    if (log[n] <= since) continue;
    const [i, j] = String(log[n + 1]).replace(/^o/, '').split(',').map(Number);
    if (!Number.isFinite(i) || !Number.isFinite(j)) return false;
    const [ox, oy] = tileOrigin(i, j);
    const T = [ox - 0.5, oy - 0.5, ox + TILE_M + 0.5, oy + TILE_M + 0.5];
    const now = new Set(map.roadGrid.query(T[0], T[1], T[2], T[3]));
    for (const r of now) if (!known.has(r)) { known.add(r); changed.push(r); }
    for (const r of known) {
      const b = r.bounds;
      if (!b || b[2] < T[0] || b[0] > T[2] || b[3] < T[1] || b[1] > T[3]) continue;
      if (!now.has(r)) { known.delete(r); changed.push(r); }
    }
  }
  for (const r of changed) {
    const b = r.bounds;
    if (!b) return false;
    const R = [b[0] - 0.5, b[1] - 0.5, b[2] + 0.5, b[3] + 0.5];
    for (const st of sites.query(R[0], R[1], R[2], R[3])) if (inRect(R, st.x, st.y)) sites.removePoint(st, st.x, st.y);
  }
  // perf-r3 (24-11): de oversteeklichten één keer uitzoeken, niet alle lichten opnieuw per gewijzigde weg (een tegel brengt honderden wegen)
  const crossHeads = changed.length ? getTrafficLights().filter((h) => h.crossing || h.bike) : [];
  for (const r of changed) {
    const b = r.bounds;
    const R = [b[0] - 0.5, b[1] - 0.5, b[2] + 0.5, b[3] + 0.5];
    // geen dubbele sites: een knoop in de box van twee gewijzigde wegen komt er één keer bij
    addRoadSites(map.roadGrid.query(R[0], R[1], R[2], R[3]), R, true);
    for (const h of crossHeads) if (inRect(R, h.ax, h.ay)) addSiteOnce(h.ax, h.ay, 'signal');
  }
  sitesGeo = { map, ver: map._roadVer !== undefined ? map._roadVer : map.geoVer, geo: map.geoVer, roads: known };
  return true;
}

function addSiteOnce(x, y, kind) {
  for (const st of sites.query(x, y, x, y)) if (st.x === x && st.y === y && st.kind === kind) return;
  addSite(x, y, kind);
}
// de zebra's en kruisingen van deze wegen; R: alleen knopen binnen dit vlak (null: alle); once: niet als hij er al staat
function addRoadSites(roads, R, once = false) {
  const nodes = new Map();
  const key = (p) => Math.round(p[0] * 10) * 1e6 + Math.round(p[1] * 10);
  for (const r of roads) {
    r.pts.forEach((p, i) => {
      const k = key(p);
      let a = nodes.get(k);
      if (!a) nodes.set(k, a = []);
      a.push(r, i);
    });
  }
  for (const [, a] of nodes) {
    const site = nodeSite(a);
    if (site && (!R || inRect(R, site.x, site.y))) (once ? addSiteOnce : addSite)(site.x, site.y, site.kind);
  }
}
// de site van één knoop ([weg, index, ...]) of null
function nodeSite(a) {
  if (a.length < 4) return null;
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
  return car && branches >= 3 ? { x: car[0], y: car[1], kind: busy && foot ? 'zebra' : 'junction' } : null;
}

function sitesNear(x, y, r, out) {
  out.length = 0;
  if (!sites) return out; // nog geen site-index (stadstegels nog niet binnen)
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

// #653: geen nieuwe array + Set per voetganger per frame; de grid vult een vaste lijst
const _avoidOut = [];
function avoidBias(ped, ang) {
  const hx = Math.cos(ang), hy = Math.sin(ang);
  let bias = 0;
  grid.queryRadiusInto(_avoidOut, ped.x, ped.y, AVOID_CELL);
  for (const o of _avoidOut) {
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
const _sepOut = []; // own reusable list (not _avoidOut): no new Set/array per ped per frame
export function separatePeds(peds, map) {
  const D2 = SEP_DIST * SEP_DIST;
  for (let n = 0; n < peds.length; n++) {
    const a = peds[n];
    if (a.state === 'dead' || a.ragdoll) continue;
    grid.queryRadiusInto(_sepOut, a.x, a.y, AVOID_CELL);
    for (let bi = 0; bi < _sepOut.length; bi++) {
      const b = _sepOut[bi];
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
  if (S.slot) releaseTerraceSeat(S.slot, ped);
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
    S.until = S.follow ? Infinity : t + (S.dur || 15 + Math.random() * 45);
    if (S.slot) pedNavStats.terraceSits++;
    else pedNavStats.benchSits++;
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
    nav.talking = false;
    if (ped.pose === 'phone' || ped.pose === 'talk') setPedPose(ped, null);
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
  const t = world.time;
  // wat hij hier doet volgt het dagritme (dailyrhythm.js arrivalPlan): naar binnen, op een terras of bank, de fiets op slot,
  // even bellen, met zijn metgezel praten of wachten (bij de halte langer)
  const nearBuilding = world.map.buildingsNear(ped.x, ped.y, 6).length > 0;
  const horeca = dest.kind === 'horeca' || dest.kind === 'uitgaan';
  const terrace = horeca ? freeTerraceSeat(ped.x, ped.y, 22, t, isPropBroken) : null;
  const bike = nearBuilding && Math.random() < 0.5 ? nearestParkedBike(ped.x, ped.y, 9) : null;
  const plan = arrivalPlan(clock.hour, clock.weekday, dest.kind === 'street' ? 'park' : dest.kind, [Math.random(), Math.random(), Math.random()],
    { terrace: !!terrace, bench: true, bike: !!bike, building: nearBuilding, companion: !!ped.hasCompanion });
  if (plan.act === 'terras' && terrace) {
    const seat = terraceSeatFor(world, ped, terrace, plan.dur);
    if (seat) { claimTerraceSeat(terrace, ped, t); goSit(ped, world, seat, false); return; }
  }
  if (plan.act === 'bank') {
    const seat = findSeat(world, ped, 25);
    if (seat) { goSit(ped, world, seat, false); nav.sit.dur = plan.dur; return; }
  }
  if (plan.act === 'fiets' && bike) {
    // naar de fiets in het rek, even hurken bij het slot, daarna (meestal) naar binnen
    const s = bike.angle + Math.PI / 2, sx = bike.x + Math.cos(s) * 0.55, sy = bike.y + Math.sin(s) * 0.55;
    if (walkable(world.map, sx, sy)) {
      nav.act = { x: sx, y: sy, face: s + Math.PI, pose: 'crouch', dur: plan.dur, phase: 'go', goUntil: t + dist(ped.x, ped.y, sx, sy) / 0.8 + 4, until: 0, enter: Math.random() < 0.7 };
      return;
    }
  }
  const goesIn = plan.act === 'binnen';
  nav.enter = goesIn;
  nav.idleUntil = t + plan.dur;
  if (dist(ped.x, ped.y, dest.x, dest.y) < 40) nav.faceX = dest.x, nav.faceY = dest.y;
  else nav.faceX = null;
  if (plan.act === 'telefoon') setPedPose(ped, 'phone');
  else if (plan.act === 'praten') { setPedPose(ped, 'talk'); nav.talking = true; pedNavStats.talks++; }
}

// De dichtstbijzijnde geparkeerde fiets in een rek (cityprops.js, soort 'bike'), of null.
function nearestParkedBike(x, y, r) {
  let best = null, bd = r;
  for (const b of findProps(x, y, r)) {
    if (b.kind !== 'bike' || isPropBroken(b.key)) continue;
    const d = dist(x, y, b.x, b.y);
    if (d < bd) { bd = d; best = b; }
  }
  return best;
}

// Een terrasstoel als zitplek (terraceseats.js): zelfde vorm als een bankplek, met de stoel als "bank" (kapot = opstaan).
function terraceSeatFor(world, ped, slot, dur) {
  const back = slot.angle + Math.PI, stand = [slot.x + Math.cos(back) * 0.75, slot.y + Math.sin(back) * 0.75];
  if (!walkable(world.map, stand[0], stand[1])) { stand[0] = slot.x - Math.sin(slot.angle) * 0.7; stand[1] = slot.y + Math.cos(slot.angle) * 0.7; }
  const d = dist(ped.x, ped.y, stand[0], stand[1]);
  if (d > 2 && detectCrossing(world.map, ped.x, ped.y, stand[0], stand[1])) return null;
  return { d, bench: { cell: true, key: slot.propKey, x: slot.x, y: slot.y }, key: 'terras#' + slot.propKey, sx: slot.x, sy: slot.y, face: slot.angle, stand, slot, dur };
}

// Een korte handeling op een plek (de fiets op slot zetten): ernaartoe lopen, de houding even aannemen en verder.
// Geeft null als er niets (meer) te doen is.
function stepAct(ped, world, nav, dt) {
  const A = nav.act, t = world.time;
  if (A.phase === 'go') {
    const d = dist(ped.x, ped.y, A.x, A.y);
    if (t > A.goUntil) { nav.act = null; return null; }
    if (d > 0.35) {
      turnToward(ped, Math.atan2(A.y - ped.y, A.x - ped.x), dt * 1.5);
      ped.speed = ped.walkSpeed * (d < 2 ? 0.6 : 0.9);
      return true;
    }
    A.phase = 'do';
    A.until = t + A.dur;
    pedNavStats.bikeLocks++;
  }
  ped.speed = 0;
  turnToward(ped, A.face, dt * 2);
  if (t < A.until) { if (ped.pose !== A.pose) setPedPose(ped, A.pose); return false; }
  setPedPose(ped, null);
  nav.act = null;
  nav.enter = A.enter;
  nav.idleUntil = t + (A.enter ? 0.8 : 2 + Math.random() * 3);
  nav.faceX = null;
  return false;
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
    // op een terras de stoel ernaast of ertegenover, op een bank een plek op dezelfde bank
    const slot = LS.slot ? freeTerraceSeat(LS.sx, LS.sy, 3, world.time, isPropBroken) : null;
    const seat = LS.slot ? (slot && terraceSeatFor(world, ped, slot, 0)) : findSeat(world, ped, 6, LS.bench);
    if (seat) { if (slot) claimTerraceSeat(slot, ped, world.time); goSit(ped, world, seat, false, true); return true; }
  }
  if (ped.pose === 'talk' && !(L.pose === 'talk' && !L.speed)) setPedPose(ped, null);
  const side = ped.pairSide || 1;
  // een groepje (vrijgezellen.js) loopt in een brokje: pairK keer de afstand opzij en pairBack meter erachter; een paar heeft geen van beide
  const k = ped.pairK || 1, back = ped.pairBack || 0;
  const tx = L.x - Math.sin(L.angle) * PAIR_SPACING * side * k - Math.cos(L.angle) * back, ty = L.y + Math.cos(L.angle) * PAIR_SPACING * side * k - Math.sin(L.angle) * back;
  const d = dist(ped.x, ped.y, tx, ty);
  if (!L.speed && L.pose === 'talk') {
    // de leider staat stil en praat: naar elkaar toe gedraaid, allebei met gebaren (dailyrhythm.js 'praten')
    ped.speed = 0;
    turnToward(ped, Math.atan2(L.y - ped.y, L.x - ped.x), dt);
    if (Ln) { Ln.faceX = ped.x; Ln.faceY = ped.y; }
    if (ped.pose !== 'talk') setPedPose(ped, 'talk');
    return false;
  }
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
  if (nav.act) {
    const a = gap <= RESYNC_GAP_S ? stepAct(ped, world, nav, dt) : (nav.act = null);
    if (a !== null) return a;
    if (ped.pose === 'crouch') setPedPose(ped, null);
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
    nav.talking = false;
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
      // De sites komen uit de wegen, niet uit elke kaartwissel. Tijdens een reeks
      // streamende tegels blijven de oude sites staan en bouwt hij pas bij rust
      // opnieuw: een netwerk over alle wegen is te duur per tegel (#4).
      const ver = map._roadVer !== undefined ? map._roadVer : map.geoVer;
      if (!sites || sitesGeo.map !== map || sitesGeo.ver !== ver) {
        const intro = typeof document !== 'undefined' && document.body && (document.body.classList.contains('intro-montage') || document.body.classList.contains('cine-hide-hud'));
        const tilesCalm = tilesCalmGate(map);
        probe.mark("t-voetgangers:route");
        if (tilesCalm && !intro && !sitesBuild && !patchSites(map)) { if (sites) sitesBuild = buildSitesSteps(map); else buildSites(map); }
        probe.mark("t-voetgangers:sites");
      }
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
  ped.speed = ped.walkSpeed * (nav.pace || 1);   // in de spits met haast, 's avonds slenterend (dailyrhythm.js paceFor)
  return true;
}

// A companion that walks next to `leader` for as long as the leader walks.
export function makeCompanion(ped, leader) {
  ped.leader = leader;
  leader.hasCompanion = true;
  ped.pairSide = Math.random() < 0.5 ? 1 : -1;
  ped.angle = leader.angle;
  navOf(ped);
}



// voor scripts/pedsites_test.mjs: de site-index alles opnieuw tegen alleen de gewijzigde tegels
export const pedSitesForTest = { build: (map) => buildSites(map), patch: (map) => patchSites(map), list: (R) => (sites ? sites.query(R[0], R[1], R[2], R[3]).map((s) => `${s.kind}@${s.x},${s.y}`).sort() : []) };
