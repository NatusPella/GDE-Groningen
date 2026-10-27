// De boten: spawnen op het water, varen (wandel, vaarnet, voorrang) en aanleggen (#497).
// Letterlijk uit vehicle.js gehaald; dit bestand werkt op water polygons in plaats van op de
// road graph en staat daarmee los van de voertuigfysica in vehicle.js.

import { normalizeAngle, clamp, keepBoatOffShore, boatDryPoints } from '../util.js';
import { waterClearance, waterChannelPoints } from '../waterindex.js';
import { waterAt, airDraftOf, passesUnder, bargeWater, bargeWaterAt, meanWidth, boatFitsWater, BARGE_MIN_CLEAR } from '../waterlevels.js';
import { getMovableBridges, boatNeedsOpening, boatFrame } from '../movablebridges.js';
import { lockGateStop, sluisNear } from '../sluizen.js';
import { countryRect, rectOutside } from '../countryfield.js';
import { wijkProfileAt } from '../trafficfleet.js';
import { pickWaterLife, distToCentre, hourOf } from '../streetlifedata.js';
import { pickBoatModel, BOAT_KINDS } from '../boattypes.js';
import { pickTrip, classOfKind } from '../vaarnet.js';
import { hoofdspeler } from '../players.js';

// Wat dit blok uit vehicle.js nodig heeft (de klasse Vehicle en de spawncontroles) komt van
// buiten: vehicle.js geeft het hier bij het laden door met setBoatHost. Zo importeert deze
// module niets terug en blijft de modulecyclus op 0.
let Vehicle = null, spawnSpotFree = null, spawnWouldPop = null, inPrivateGarage = null;
export function setBoatHost(h) {
  Vehicle = h.Vehicle;
  spawnSpotFree = h.spawnSpotFree;
  spawnWouldPop = h.spawnWouldPop;
  inPrivateGarage = h.inPrivateGarage;
}

// Boats free-roam water polygons rather than following the road graph - slow
// accel/brake since they're on water, see updateBoatAI/spawnBoatOnWater.
// Ambient boat mix and hull kinds live in boattypes.js.

// Politie-livery variant for spawnPoliceBoatOnWater - same white-hull family
// as the regular fleet, dark-navy cabin matching the rest of the police
// fleet's accent tone, with enough extra accel/turn to actually run down a
// fleeing player instead of just keeping pace.
const POLICE_BOAT_MODEL = { name: 'boat', len: 5.5, wid: 2.0, playerTop: 15, playerAccel: 4.5, maxSpeed: 9.8, accel: 3.2, brake: 3.4, turnRate: 1.8, color: '#e8e6e0', cabin: '#12294f' };

// Boats don't follow the road graph at all - they free-roam a water polygon,
// so spawning one just needs a point that is actually inside it rather than
// a road/lane placement.
// Spots come from the polygon's cached channel points (waterindex.js), so a
// boat starts with room around it, heading along the channel. opts: model,
// near [x, y] with min/max distance, budget (ms of channel scanning this
// frame; the default finishes the scan). Returns null when no spot fits yet.
export function spawnBoatOnWater(map, waterPoly, rng = Math.random, opts = {}) {
  const model = opts.model || pickBoatModel(rng);
  // inland shipping only on main waterways and harbours (#234), never on a ditch or a small canal
  if (model.kind === 'binnenvaart' && !bargeWater(waterPoly)) return null;
  // een boot die hier niet past (diepte, klasse, breedte of oppervlak) komt hier niet (#436):
  // een sloep hoort niet in een sloot of een plasje, een kano mag daar wel
  if (!boatFitsWater(waterPoly, model)) return null;
  const ch = waterChannelPoints(map, waterPoly, opts.budget ?? Infinity);
  let pts = ch.pts;
  if (opts.near) {
    const [nx, ny] = opts.near, lo = (opts.min || 0) ** 2, hi = (opts.max ?? Infinity) ** 2;
    pts = pts.filter((q) => { const d2 = (q.x - nx) ** 2 + (q.y - ny) ** 2; return d2 >= lo && d2 <= hi; });
  }
  if (!pts.length) return null;
  const probe = { model };
  for (let attempt = 0; attempt < 12; attempt++) {
    const q = pts[Math.floor(rng() * pts.length)];
    if (map.isOnBridge(q.x, q.y)) continue;
    const flip = rng() < 0.5 ? 0 : Math.PI;
    for (const turn of [0, Math.PI, 0.3, -0.3]) {
      const angle = normalizeAngle(q.a + flip + turn);
      if (boatDryPoints(map, probe, q.x, q.y, angle) > 0) continue;
      if (model.kind === 'binnenvaart' && waterClearance(map, q.x, q.y, BARGE_MIN_CLEAR + 1) < BARGE_MIN_CLEAR) continue;
      // a barge does not start under a bridge it does not clear
      if (model.kind === 'binnenvaart') {
        const hx = Math.cos(angle) * model.len / 2, hy = Math.sin(angle) * model.len / 2;
        if (lowBridgeRay(map, probe, q.x - hx, q.y - hy, q.x + hx, q.y + hy)) continue;
      }
      const v = new Vehicle(q.x, q.y, angle, model);
      v.isBoat = true;
      v.waterPoly = waterPoly;
      return v;
    }
  }
  return null;
}

// Same placement as spawnBoatOnWater, forced into the police livery/model
// and flagged isPolice so updateBoatAI's chase branch (below) and the
// regular vehicle render/sync path both treat it like any other cop unit.
export function spawnPoliceBoatOnWater(map, waterPoly, rng = Math.random, opts = {}) {
  const v = spawnBoatOnWater(map, waterPoly, rng, { ...opts, model: POLICE_BOAT_MODEL });
  if (!v) return null;
  v.isPolice = true;
  return v;
}

const waterMeanWidth = meanWidth;

// A canal runs through several water bodies (one per tile pack), so the barge
// limit cannot be one number for the whole world: four barges then all pick the
// one canal near the player and lie abreast across it (#502). Count them per
// named water; water without a name gets a key per square kilometre, because the
// city's canals share one body id (#502 review).
const waterBodyKey = (p) => {
  if (!p) return null;
  if (p.name) return 'n:' + p.name;
  const b = p.bounds || [0, 0, 0, 0];
  return 'b:' + p.body + ':' + Math.round((b[0] + b[2]) / 2 / 1000) + ',' + Math.round((b[1] + b[3]) / 2 / 1000);
};

export function bargesPerWater(vehicles) {
  const per = new Map();
  for (const v of vehicles) {
    if (!v.isBoat || v.wrecked || isShip(v) || !isBarge(v)) continue;
    const k = waterBodyKey(v.waterPoly);
    per.set(k, (per.get(k) || 0) + 1);
  }
  return per;
}

// Mirrors manageBikePopulation's despawn/spawn-quota shape, but candidates
// are water bodies near the player instead of roads. Police boats are
// excluded here exactly like manageTrafficPopulation excludes police cars -
// police.js owns their spawn/despawn lifecycle on its own wanted-driven
// schedule, not the ambient civilian quota.
export function manageBoatPopulation(world, { target = 4, spawnMin = 20, spawnMax = 180, despawnDist = 260 } = {}) {
  const { map, player, vehicles } = world;
  for (let i = vehicles.length - 1; i >= 0; i--) {
    const v = vehicles[i];
    // your own boat at the jetty is home.js's to stash, not ours to sweep away
    if (!v.isBoat || v.isPolice || v.driver === 'player' || v.playerOwned || v.homeStored || v.moored || v.missionCar || isShip(v)) continue; // (the sea ships are zeeschepen.js's and werflive.js's)
    const away = Math.hypot(v.x - player.x, v.y - player.y);
    // a boat that could not get free after three tries goes once the player cannot see it
    if (away > despawnDist || (v.stuckAway && away > BOAT_SWEEP_DIST)) vehicles.splice(i, 1);
  }

  // the barges are a fleet of their own: they do not use up the everyday boat quota
  let count = 0;
  for (const v of vehicles) if (v.isBoat && !v.wrecked && !v.isPolice && v.driver !== 'player' && !v.playerOwned && !v.homeStored && !v.moored && !isBarge(v)) count++;

  const candidates = map.waterNear(player.x, player.y, spawnMax);
  const have = { skiff: 0, acht: 0, sup: 0, binnenvaart: 0 };
  for (const v of vehicles) if (v.isBoat && !v.wrecked && v.model.kind in have) have[v.model.kind]++;
  const life = { hour: hourOf(world), d: distToCentre(player.x, player.y), profile: wijkProfileAt(map, player.x, player.y).key, have };
  const perWater = bargesPerWater(vehicles);
  let guard = 0;
  while (count < target && candidates.length && guard++ < target * 6) {
    const poly = candidates[Math.floor(Math.random() * candidates.length)];
    // rowers, an eight and stand-up paddlers on the wider city water
    life.width = waterMeanWidth(poly);
    life.wide = life.width >= 24;
    life.nav = poly.nav || 0;
    // the barge rule ("at most two near") counts per canal, not for the whole map (#502)
    life.have = { ...have, binnenvaart: perWater.get(waterBodyKey(poly)) || 0 };
    const lifeKind = pickWaterLife(Math.random, life);
    // the barge fleet stays at four in the whole world: the second loop below
    // fills the rest per canal (#502 review)
    if (lifeKind && BOAT_KINDS[lifeKind].kind === 'binnenvaart' && have.binnenvaart >= BARGE_MAX) continue;
    const v = spawnBoatOnWater(map, poly, Math.random, { near: [player.x, player.y], min: spawnMin, max: spawnMax, budget: 3, model: lifeKind ? BOAT_KINDS[lifeKind] : undefined });
    if (v && lifeKind) have[BOAT_KINDS[lifeKind].kind === 'binnenvaart' ? 'binnenvaart' : lifeKind]++;
    if (!v || !spawnSpotFree(vehicles, v) || inPrivateGarage(map, v.x, v.y, 2) || spawnWouldPop(world, v)) continue;
    if (vehicles.some((o) => o.isBoat && !o.wrecked && Math.hypot(o.x - v.x, o.y - v.y) < (isBarge(v) ? v.halfLen + o.halfLen + 20 : (isBarge(o) ? BARGE_ROOM * 0.6 : 0) + o.halfLen))) continue;
    vehicles.push(v);
    count++;
    if (isBarge(v)) perWater.set(waterBodyKey(poly), (perWater.get(waterBodyKey(poly)) || 0) + 1);
  }

  // inland shipping on the broad canals, several at a time (#7); a barge only
  // starts where no other boat lies within a few hull lengths, so it never
  // boxes in a tour boat or the player. At most two on one canal: more of them
  // fill the water from bank to bank (#502).
  if (have.binnenvaart < BARGE_MAX) {
    const wide = candidates.filter((w) => bargeWater(w));
    for (let tries = 0; tries < 4 && wide.length && have.binnenvaart < BARGE_MAX; tries++) {
      const poly = wide[Math.floor(Math.random() * wide.length)];
      const body = waterBodyKey(poly);
      if ((perWater.get(body) || 0) >= BARGE_PER_WATER) continue;
      const v = spawnBoatOnWater(map, poly, Math.random, { near: [player.x, player.y], min: spawnMin + 20, max: spawnMax, budget: 3, model: BOAT_KINDS[Math.random() < 0.55 ? 'spits' : 'kempenaar'] });
      if (!v || !spawnSpotFree(vehicles, v) || inPrivateGarage(map, v.x, v.y, 2) || spawnWouldPop(world, v)) continue;
      if (vehicles.some((o) => o.isBoat && !o.wrecked && Math.hypot(o.x - v.x, o.y - v.y) < v.halfLen + o.halfLen + 20)) continue;
      if (Math.hypot(v.x - player.x, v.y - player.y) < 40 + v.halfLen) continue;
      vehicles.push(v);
      have.binnenvaart++;
      perWater.set(body, (perWater.get(body) || 0) + 1);
    }
  }
}
// Hoeveel binnenvaartschepen er tegelijk varen (#7, #502): wereldwijd hooguit vier, en per waterlichaam
// hooguit twee (BARGE_PER_WATER, geteld met bargesPerWater). Die tweede grens is de belangrijke: met
// alleen een wereldwijde teller kozen alle schepen hetzelfde kanaal bij de speler en lagen ze bij
// Nieuwbrug met 5-8 over elkaar. streetlifedata.pickWaterLife gebruikt dezelfde per-water-grens (2).
const BARGE_MAX = 4, BARGE_ROOM = 50, BARGE_PER_WATER = 2;

// A wander target with room around it that the boat can reach in a straight
// line through open water (sampled every 3 m), so the route doesn't cut
// across a bend in the canal; falls back to any spot with some room.
// Where the boat's canal runs off the map and carries on as the tiles' water,
// now and then a spot out in the country, and from out there spots further
// along or back into the city.
function countryBoatSpot(v, rng, map, ch) {
  const out = rectOutside(v.x, v.y) > 0;
  let x, y;
  if (out) {
    if (rng() < 0.3) return null;
    const a = v.angle + (rng() - 0.5) * 2.2, d = 15 + rng() * 35;
    x = v.x + Math.cos(a) * d; y = v.y + Math.sin(a) * d;
  } else {
    if (!ch.done) return null;
    const ex = ch.edge || (ch.edge = ch.pts.filter((q) => rectOutside(q.x, q.y) > -40));
    if (!ex.length || rng() > 0.35) return null;
    const q = ex[Math.floor(rng() * ex.length)];
    const r = countryRect(), sx = Math.abs(q.x - r.cx) - r.hx, sy = Math.abs(q.y - r.cy) - r.hy;
    const k = 4 - rectOutside(q.x, q.y) + rng() * 40;
    x = q.x + (sx > sy ? Math.sign(q.x - r.cx) * k : 0); y = q.y + (sx > sy ? 0 : Math.sign(q.y - r.cy) * k);
  }
  return rectOutside(x, y) > 0 && waterClearance(map, x, y, 3) >= 3 ? { x, y, d: 3 } : null;
}

// A barge (class 4) must not sail under a fixed bridge it does not clear:
// the city's low bridges (1.8 m) stop it; an open movable bridge has no deck.
function lowBridgeAt(map, v, x, y) {
  const w = waterAt(map, x, y);
  return !!w && !passesUnder(airDraftOf(v), w.clearanceAbove);
}
// sea ships and the tug (#398) sail like barges: class 4 water, no low bridges, the right of way of the big ones; they need more room
export const isShip = (v) => v.model.kind === 'zeeschip' || v.model.kind === 'sleper';
const isBarge = (v) => v.model.kind === 'binnenvaart' || isShip(v);
const bargeClear = (v) => Math.max(BARGE_MIN_CLEAR, (v.model.wid || 0) / 2 + 2.5);
// ...along a line, sampled every 3 m (a deck is 5 m or more wide)
function lowBridgeRay(map, v, x0, y0, x1, y1) {
  const d = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(d / 3));
  for (let i = 0; i <= n; i++) if (lowBridgeAt(map, v, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n)) return true;
  return false;
}

function pickBoatWaypoint(v, rng, map) {
  const ch = waterChannelPoints(map, v.waterPoly, 2), pts = ch.pts;
  let fallback = null;
  for (let attempt = 0; attempt < 14 && pts.length; attempt++) {
    const q = countryBoatSpot(v, rng, map, ch) || pts[Math.floor(rng() * pts.length)];
    const x = q.x, y = q.y;
    const d = Math.hypot(x - v.x, y - v.y);
    if (d < 6) continue;
    let clear = q.d >= 3;
    for (let t = 3; t < d && clear; t += 3) {
      if (waterClearance(map, v.x + (x - v.x) * t / d, v.y + (y - v.y) * t / d, 3) < 1.8) clear = false;
      else if (isBarge(v) && (lowBridgeAt(map, v, v.x + (x - v.x) * t / d, v.y + (y - v.y) * t / d) || waterClearance(map, v.x + (x - v.x) * t / d, v.y + (y - v.y) * t / d, bargeClear(v) + 1) < bargeClear(v))) clear = false;
    }
    if (clear) return [x, y];
    if (!fallback) fallback = [x, y];
  }
  return fallback || [v.x, v.y];
}

// The waterway network (vaarnet.js, game/vaarnet.json): a barge or a tour boat that lies on it
// sails a trip to one of its hubs, over the edges it clears (no low bridge, a lock or a movable
// bridge costs time) instead of wandering in its polygon. The trip is a list of points the boat
// follows as waypoints; a boat that gets stuck, or a net that is out of reach, falls back
// to the wander. At a lock or a bridge it waits like the player's boat: the lock's gate stops it
// and asks the lock (sluizen.js), a movable bridge opens for a boat that needs it (movablebridges.js).
let vaarNet = null;
export function setVaarNet(net) { vaarNet = net; }
export const getVaarNet = () => vaarNet;
const VAAR_REACH = 150, VAAR_RETRY_S = 45, VAAR_ARRIVE = 14;
// a tour boat sails the city, its harbours and the Reitdiep (#296), not out to the Waddenzee: trips up to this long (m)
export const TOUR_TRIP_MAX = 12000;
const isTour = (v) => v.model.kind === 'rondvaart';
// the boats that follow the net, and the longest trip they pick (Infinity: any hub)
const followsNet = (v) => isBarge(v) || isTour(v);

function followVaarTrip(v, dt, rng, map) {
  if (!vaarNet || !followsNet(v)) return false;
  v._vaarWait = Math.max(0, (v._vaarWait || 0) - dt);
  if (v.stuckCount >= 2) { v._vaar = null; v._vaarWait = VAAR_RETRY_S; }
  if (!v._vaar) {
    if (v._vaarWait > 0) return false;
    const trip = pickTrip(vaarNet, v.x, v.y, v.angle, v, rng, VAAR_REACH, isTour(v) ? TOUR_TRIP_MAX : Infinity);
    if (!trip) { v._vaarWait = VAAR_RETRY_S; return false; }
    v._vaar = { pts: trip.pts, i: 0, name: trip.name };
  }
  const T = v._vaar;
  while (T.i < T.pts.length - 1 && Math.hypot(T.pts[T.i][0] - v.x, T.pts[T.i][1] - v.y) < VAAR_ARRIVE) T.i++;
  // the next point lies in a ditch or vaart (the net is wider than the boat can sail): drop the trip (#234)
  const nw = waterAt(map, T.pts[T.i][0], T.pts[T.i][1]);
  if (nw && (isBarge(v) ? !bargeWaterAt(nw) : nw.navigable < classOfKind(v))) { v._vaar = null; v._vaarWait = VAAR_RETRY_S; return false; }
  if (T.i >= T.pts.length - 1 && Math.hypot(T.pts[T.i][0] - v.x, T.pts[T.i][1] - v.y) < VAAR_ARRIVE * 2) { v._vaar = null; v._vaarWait = VAAR_RETRY_S; return false; }
  v.waypoint = [T.pts[T.i][0], T.pts[T.i][1]];
  v.waypointTimer = BOAT_WAYPOINT_MAX;
  return true;
}

const BOAT_WAYPOINT_MIN = 4;
const BOAT_WAYPOINT_MAX = 9;

// Right of way on the water: the player's boat, then the big inland barges,
// then by length; the lower one gives way (equal: the younger vehicle).
const boatRank = (o) => (o.driver === 'player' ? 100 : 0) + (isBarge(o) ? 50 : 0) + o.model.len;

// The other boat in the way ahead of v: its gap (m, bow to the nearest point
// of the other hull) and whether v has to give way. The other hull is sampled
// along its axis and has to lie in a corridor as wide as both boats. null when clear.
export function boatInTheWay(v, others, look) {
  const c = Math.cos(v.angle), s = Math.sin(v.angle);
  let best = null;
  for (const o of others) {
    if (o === v || !o.isBoat || o.wrecked || o.sinking) continue;
    const dx = o.x - v.x, dy = o.y - v.y, reach = look + v.halfLen + o.halfLen;
    if (dx * dx + dy * dy > reach * reach) continue;
    const oc = Math.cos(o.angle), os = Math.sin(o.angle), lat = v.halfWid + o.halfWid + 1.2;
    for (let k = -2; k <= 2; k++) {
      const px = o.x + oc * o.halfLen * k / 2, py = o.y + os * o.halfLen * k / 2;
      const fx = (px - v.x) * c + (py - v.y) * s - v.halfLen, ly = -(px - v.x) * s + (py - v.y) * c;
      if (fx < -0.5 || fx > look || Math.abs(ly) > lat) continue;
      if (!best || fx < best.gap) best = { o, gap: fx, side: ly, head: oc * c + os * s };
    }
  }
  if (!best) return null;
  const a = boatRank(v), b = boatRank(best.o);
  best.yield = a < b || (a === b && v.id > best.o.id);
  return best;
}

// Boats that have not moved a metre in this long are stuck (a quay corner, a
// bridge pier, a boat in the way): back out and pick another heading; after
// a third try the boat is flagged for removal once it is out of the player's sight.
const BOAT_STUCK_S = 6, BOAT_STUCK_M = 1.2, BOAT_BACK_S = 3, BOAT_STUCK_GIVEUP = 3;
export const BOAT_SWEEP_DIST = 70;

// Is the boat waiting for a lock or a movable bridge that has to open for it (#296)? That is no
// stuck boat: it lies still on purpose, for as long as a cycle takes (WAIT_MAX_S, then the
// watchdog is back: a bridge or lock that never answers must not hold a boat for good).
const WAIT_MAX_S = 150;
function boatWaitsForPassage(v) {
  const k = sluisNear(v.x, v.y, 120);
  if (k && k.queue.some((q) => q.who === v)) return true;
  for (const b of getMovableBridges()) {
    if (Math.abs(b.x - v.x) > b.len / 2 + 90 || Math.abs(b.y - v.y) > b.len / 2 + 90) continue;
    if (b.boats.has(v)) return true;
    if (b.state !== 'closed' && b.state !== 'closing' && b.state !== 'up' && boatNeedsOpening(v) && boatFrame(b, v).w < 70) return true;
  }
  return false;
}

function boatWatchdog(v, dt, rng, map, chasing) {
  if (boatWaitsForPassage(v)) {
    v._passWait = (v._passWait || 0) + dt;
    if (v._passWait < WAIT_MAX_S) { v._wdT = 0; v._wdAt = [v.x, v.y]; return; }
  } else v._passWait = 0;
  v._wdT = (v._wdT || 0) + dt;
  if (!v._wdAt) v._wdAt = [v.x, v.y];
  const moved = Math.hypot(v.x - v._wdAt[0], v.y - v._wdAt[1]);
  if (moved >= BOAT_STUCK_M * 6) { v.stuckCount = 0; v.stuckAway = false; }
  if (moved >= BOAT_STUCK_M) { v._wdAt = [v.x, v.y]; v._wdT = 0; return; }
  if (v._wdT < BOAT_STUCK_S || v._backT > 0) return;
  v._wdT = 0;
  v.stuckCount = (v.stuckCount || 0) + 1;
  v._backT = BOAT_BACK_S;
  v._backSteer = rng() < 0.5 ? 1 : -1;
  if (v.stuckCount >= BOAT_STUCK_GIVEUP) v.stuckAway = true;
  if (!chasing) { v.waypoint = pickBoatWaypoint(v, rng, map); v.waypointTimer = BOAT_WAYPOINT_MIN; }
}

// Simple wander/patrol on the water body the boat spawned in (and out into
// the country where its canal carries on past the map edge; v.waterPoly,
// set by spawnBoatOnWater) - no road graph involved, so this
// stands entirely apart from updateTrafficAI.
export function updateBoatAI(v, dt, map, world, rng = Math.random) {
  if (v.wrecked || v.scripted) return; // scripted: a mission module steers this boat itself
  // a mission, side-job or own boat waits where it lies until the player boards it
  // Police pursuit: the waypoint is simply the player's live position.
  const chasing = v.isPolice && !v.hijacked && world.wanted > 0;
  if (!v.waterPoly || v.missionCar || v.playerOwned || v.homeStored) { v.applyControls(dt, 0, 0, true); return; }
  if (chasing) {
    const jager = hoofdspeler(world);
    v.waypoint = [jager.x, jager.y];
  } else if (!followVaarTrip(v, dt, rng, map)) {
    v.waypointTimer = (v.waypointTimer || 0) - dt;
    if (!v.waypoint || v.waypointTimer <= 0 || Math.hypot(v.waypoint[0] - v.x, v.waypoint[1] - v.y) < 4) {
      v.waypoint = pickBoatWaypoint(v, rng, map);
      v.waypointTimer = BOAT_WAYPOINT_MIN + rng() * (BOAT_WAYPOINT_MAX - BOAT_WAYPOINT_MIN);
    }
  }

  const dx = v.waypoint[0] - v.x, dy = v.waypoint[1] - v.y;
  let steer = clamp(normalizeAngle(Math.atan2(dy, dx) - v.angle) * 1.2, -1, 1);
  let throttle = 1, brake = false;

  // three feelers ahead of the bow: ease off and turn toward the side with
  // more open water well before the hull reaches a quay, bank or houseboat
  const reach = v.model.len * 0.5 + 2 + Math.abs(v.speed) * 0.9;
  const barge = isBarge(v);
  const feel = (a) => {
    const fx = v.x + Math.cos(v.angle + a) * reach, fy = v.y + Math.sin(v.angle + a) * reach;
    // a bridge too low for a barge counts as a bank
    if (barge) {
      // from the bow, far enough to stop in front of the bridge
      const bx = v.x + Math.cos(v.angle) * v.model.len / 2, by = v.y + Math.sin(v.angle) * v.model.len / 2;
      const look = 6 + Math.abs(v.speed) * 2.5 + v.speed * v.speed / (2 * (v.model.brake || 0.5));
      if (lowBridgeRay(map, v, bx, by, bx + Math.cos(v.angle + a) * look, by + Math.sin(v.angle + a) * look)) return 0;
    }
    return waterClearance(map, fx, fy, 5);
  };
  const cF = feel(0);
  if (cF < 3) {
    const cL = feel(0.5), cR = feel(-0.5);
    const away = cL >= cR ? 1 : -1;
    const urgency = clamp((3 - cF) / 2.5, 0, 1);
    steer = clamp(steer * (1 - urgency) + away * urgency, -1, 1);
    throttle = cF < 1.2 ? 0.2 : 1 - urgency * 0.6;
    brake = cF < 0.5 && Math.abs(v.speed) > 1;
    if (!chasing && cF < 1.5) { v.waypoint = pickBoatWaypoint(v, rng, map); v.waypointTimer = BOAT_WAYPOINT_MIN; }
  }

  // other boats: slow down behind one, give way to the bigger or the player's
  // by keeping to the same side, never sail into a hull
  const look = 8 + Math.abs(v.speed) * 3.5 + v.speed * v.speed / (2 * (v.model.brake || 0.5));
  const nb = world && world.vehicles ? boatInTheWay(v, world.vehicles, look) : null;
  if (nb) {
    const room = clamp((nb.gap - 2) / Math.max(4, look - 2), 0, 1);
    if (nb.head > 0.3 && !nb.yield && nb.o.speed < v.speed) throttle = Math.min(throttle, room);
    else if (nb.yield || nb.gap < 4) {
      throttle = Math.min(throttle, nb.head > 0.3 ? room : room * 0.6);
      // pass on the open side (the right one when both are equal), mirrored for the oncoming boat
      const rightClear = waterClearance(map, v.x + Math.cos(v.angle - 1.2) * (v.halfWid + 4), v.y + Math.sin(v.angle - 1.2) * (v.halfWid + 4), 4);
      const leftClear = waterClearance(map, v.x + Math.cos(v.angle + 1.2) * (v.halfWid + 4), v.y + Math.sin(v.angle + 1.2) * (v.halfWid + 4), 4);
      const side = rightClear >= 2.5 || rightClear >= leftClear ? -1 : 1;
      const k = clamp(1 - nb.gap / look, 0.2, 1);
      steer = clamp(steer * (1 - k) + side * k, -1, 1);
    }
    brake = brake || (nb.gap < 2.5 && v.speed > Math.max(0.3, nb.o.speed));
  }

  if (!chasing) {
    boatWatchdog(v, dt, rng, map, chasing);
    if (v._backT > 0) {
      v._backT -= dt;
      throttle = -0.8; steer = v._backSteer; brake = false;
    }
  }

  const px = v.x, py = v.y, pa = v.angle;
  v.applyControls(dt, throttle, steer, brake);
  if (!keepBoatOffShore(map, v, px, py, pa)) {
    v.speed *= -0.3;
    v.driftX = 0; v.driftY = 0;
    if (!chasing) { v.waypoint = pickBoatWaypoint(v, rng, map); v.waypointTimer = BOAT_WAYPOINT_MIN; }
  }
  // a shut lock gate: wait in front of it, the lock opens for a boat that asks (sluizen.js)
  if (lockGateStop(v, px, py, pa)) { v.x = px; v.y = py; v.angle = pa; v.speed = 0; v.driftX = 0; v.driftY = 0; }
  // hard stop for a barge at a bridge it does not clear (the feelers brake it
  // in time; this catches a turn that swings the hull into the deck)
  if (barge && (v.x !== px || v.y !== py || v.angle !== pa)) {
    const hull = (x, y, a) => lowBridgeRay(map, v, x - Math.cos(a) * v.model.len / 2, y - Math.sin(a) * v.model.len / 2, x + Math.cos(a) * v.model.len / 2, y + Math.sin(a) * v.model.len / 2);
    if (hull(v.x, v.y, v.angle) && !hull(px, py, pa)) {
      v.x = px; v.y = py; v.angle = pa; v.speed = 0; v.driftX = 0; v.driftY = 0;
      if (!chasing) { v.waypoint = pickBoatWaypoint(v, rng, map); v.waypointTimer = BOAT_WAYPOINT_MIN; }
    }
  }
}
