import { closestPointOnSegment, normalizeAngle, clamp, pointInPolygon, lerp } from './util2.js';

const MODELS = [
  // Dutch daily traffic skews heavily toward grey/black/white/silver compacts
  // and hatchbacks, so those are weighted more heavily than the odd flash of
  // color rather than an even split across a bright arcade palette.
  { name: 'hatch', len: 3.8, wid: 1.7, maxSpeed: 30, accel: 8.5, brake: 15, turnRate: 3.0, color: '#c7c9cc' },
  { name: 'hatch', len: 3.8, wid: 1.7, maxSpeed: 30, accel: 8.5, brake: 15, turnRate: 3.0, color: '#23262a' },
  { name: 'hatch', len: 3.8, wid: 1.7, maxSpeed: 30, accel: 8.5, brake: 15, turnRate: 3.0, color: '#e8e6e0' },
  { name: 'sedan', len: 4.3, wid: 1.8, maxSpeed: 33, accel: 9, brake: 16, turnRate: 2.6, color: '#4a4d52' },
  { name: 'sedan', len: 4.3, wid: 1.8, maxSpeed: 33, accel: 9, brake: 16, turnRate: 2.6, color: '#2f3a52' },
  { name: 'sedan', len: 4.3, wid: 1.8, maxSpeed: 33, accel: 9, brake: 16, turnRate: 2.6, color: '#7a1f1f' },
  { name: 'wagon', len: 4.5, wid: 1.8, maxSpeed: 32, accel: 8, brake: 15, turnRate: 2.5, color: '#2e4a34' },
  { name: 'van', len: 5.0, wid: 2.0, maxSpeed: 26, accel: 6.5, brake: 13, turnRate: 2.0, color: '#d9d9d9' },
  { name: 'van', len: 5.0, wid: 2.0, maxSpeed: 26, accel: 6.5, brake: 13, turnRate: 2.0, color: '#c9541e' },
  { name: 'sport', len: 4.1, wid: 1.85, maxSpeed: 42, accel: 12, brake: 19, turnRate: 3.2, color: '#8a1414' },
];

// Signature red Ford Escort - GTE VI's hero car, spawned once via
// spawnHeroCarNear rather than picked from MODELS by the regular traffic RNG.
const HERO_CAR_MODEL = { name: 'escort', len: 4.0, wid: 1.65, maxSpeed: 34, accel: 10, brake: 17, turnRate: 3.4, color: '#a11f1f' };

const BIKE_MODELS = [
  { name: 'bike', len: 1.75, wid: 0.5, maxSpeed: 6.2, accel: 3.2, brake: 6, turnRate: 4.6, color: '#1c1c1c', rider: '#2f5c8a' },
  { name: 'bike', len: 1.75, wid: 0.5, maxSpeed: 6.2, accel: 3.2, brake: 6, turnRate: 4.6, color: '#2b2b2b', rider: '#7a2e2e' },
  { name: 'bike', len: 1.75, wid: 0.5, maxSpeed: 6.8, accel: 3.4, brake: 6, turnRate: 4.8, color: '#333', rider: '#3f6b3f' },
  { name: 'bike', len: 1.9, wid: 0.55, maxSpeed: 5.6, accel: 2.8, brake: 5.5, turnRate: 4.2, color: '#444', rider: '#c9a227' },
  // fatbike: chunkier tires, slower and heavier-feeling, seen around town
  // year-round in Groningen - deliberately rarer than the regular bikes
  { name: 'bike', fat: true, len: 1.95, wid: 0.62, maxSpeed: 5.2, accel: 2.6, brake: 5, turnRate: 3.8, color: '#20221f', rider: '#8a3a1f' },
];
const FATBIKE_WEIGHT = 0.12; // fraction of bike spawns that should be a fatbike
const REGULAR_BIKE_MODELS = BIKE_MODELS.filter((m) => !m.fat);
const FATBIKE_MODELS = BIKE_MODELS.filter((m) => m.fat);

function pickBikeModel(rng) {
  const pool = rng() < FATBIKE_WEIGHT ? FATBIKE_MODELS : REGULAR_BIKE_MODELS;
  return pool[Math.floor(rng() * pool.length)];
}

// Shared e-scooters (Dott/GO Sharing etc.) - faster and nimbler than a
// regular bike but with noticeably less braking grip (see the lower `brake`
// values vs. BIKE_MODELS).
const SCOOTER_MODELS = [
  { name: 'scooter', len: 1.1, wid: 0.4, maxSpeed: 7.0, accel: 3.6, brake: 4.2, turnRate: 5.2, color: '#1a1a1a', rider: '#2f5c8a' },
  { name: 'scooter', len: 1.1, wid: 0.4, maxSpeed: 6.5, accel: 3.4, brake: 4.0, turnRate: 5.0, color: '#e8e6e0', rider: '#7a2e2e' },
  { name: 'scooter', len: 1.15, wid: 0.42, maxSpeed: 7.5, accel: 3.8, brake: 4.4, turnRate: 5.4, color: '#c94b3a', rider: '#3f6b3f' },
];

function pickScooterModel(rng) {
  return SCOOTER_MODELS[Math.floor(rng() * SCOOTER_MODELS.length)];
}

// Boats free-roam water polygons rather than following the road graph - slow
// accel/brake since they're on water, see updateBoatAI/spawnBoatOnWater.
const BOAT_MODELS = [
  { name: 'boat', len: 4, wid: 1.6, maxSpeed: 4.5, accel: 1.6, brake: 2.2, turnRate: 1.3, color: '#e8e6e0', cabin: '#2f3a44' },
  { name: 'boat', len: 4.2, wid: 1.7, maxSpeed: 4.3, accel: 1.5, brake: 2.0, turnRate: 1.2, color: '#c7c9cc', cabin: '#1c1c1c' },
];

// Regional OV city bus - teal/blue livery, roomier turning circle, only
// spawned on the bigger through-roads (see manageBusPopulation).
// Qbuzz runs the Groningen-Drenthe concession: deep navy body with a cyan
// accent band, not a generic tour-bus livery.
const BUS_MODELS = [
  { name: 'bus', len: 11, wid: 2.35, maxSpeed: 20, accel: 4.5, brake: 9, turnRate: 1.1, color: '#132a44', stripe: '#3fc6d4', accent: '#e8e6de' },
  { name: 'bus', len: 11, wid: 2.35, maxSpeed: 20, accel: 4.5, brake: 9, turnRate: 1.1, color: '#0f3a4a', stripe: '#3fc6d4', accent: '#e8e6de' },
];

let nextId = 1;

export class Vehicle {
  constructor(x, y, angle, model) {
    this.id = nextId++;
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = 0;
    this.steer = 0;
    this.model = model;
    this.health = 100;
    this.wrecked = false;
    this.driver = null; // 'player' | ai-controlled marker | null
    this.horn = false;

    // traffic AI path state
    this.road = null;
    this.dir = 1;
    this.segIdx = 0;
    this.isPolice = false;
    this.waitTimer = 0;
  }

  get halfLen() { return this.model.len / 2; }
  get halfWid() { return this.model.wid / 2; }

  bounds(margin = 0) {
    const r = this.halfLen + margin;
    return [this.x - r, this.y - r, this.x + r, this.y + r];
  }

  // Player/AI driving physics shared by both control sources.
  applyControls(dt, throttle, steerInput, brakeInput) {
    const m = this.model;
    if (brakeInput) {
      const dec = m.brake * dt;
      if (this.speed > 0) this.speed = Math.max(0, this.speed - dec);
      else this.speed = Math.min(0, this.speed + dec);
    } else if (throttle !== 0) {
      this.speed += throttle * m.accel * dt;
    } else {
      const drag = 3.2 * dt;
      if (this.speed > 0) this.speed = Math.max(0, this.speed - drag);
      else this.speed = Math.min(0, this.speed + drag);
    }
    this.speed = clamp(this.speed, -m.maxSpeed * 0.4, m.maxSpeed);

    const speedFactor = clamp(Math.abs(this.speed) / 4, 0.15, 1);
    const turn = steerInput * m.turnRate * speedFactor * (this.speed < 0 ? -1 : 1) * dt;
    this.angle = normalizeAngle(this.angle + turn);

    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;

    if (this.isBus) pushBusTrail(this);
  }
}

// Rolling history of a bus's own pose, sampled by distance travelled (not
// frame count) so the trailing "harmonica" unit tracks correctly regardless
// of framerate or speed. Runs off applyControls so it keeps working whether
// the bus is AI-driven or the player is at the wheel.
function pushBusTrail(v) {
  if (!v.trailHistory) {
    v.trailHistory = [{ x: v.x, y: v.y, angle: v.angle, dist: 0 }];
    v.trailDist = 0;
    return;
  }
  const last = v.trailHistory[v.trailHistory.length - 1];
  const d = Math.hypot(v.x - last.x, v.y - last.y);
  if (d < 0.01) return;
  v.trailDist += d;
  v.trailHistory.push({ x: v.x, y: v.y, angle: v.angle, dist: v.trailDist });
  const keepFrom = v.trailDist - v.model.len * 1.6;
  while (v.trailHistory.length > 2 && v.trailHistory[1].dist < keepFrom) v.trailHistory.shift();
}

function sampleBusTrail(v, backDist) {
  const hist = v.trailHistory;
  if (!hist || hist.length < 2) return { x: v.x, y: v.y, angle: v.angle };
  const targetDist = v.trailDist - backDist;
  if (targetDist <= hist[0].dist) return { x: hist[0].x, y: hist[0].y, angle: hist[0].angle };
  for (let i = hist.length - 1; i > 0; i--) {
    if (hist[i - 1].dist <= targetDist) {
      const a = hist[i - 1], b = hist[i];
      const span = b.dist - a.dist;
      const t = span > 1e-6 ? clamp((targetDist - a.dist) / span, 0, 1) : 0;
      return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), angle: a.angle + normalizeAngle(b.angle - a.angle) * t };
    }
  }
  return { x: hist[0].x, y: hist[0].y, angle: hist[0].angle };
}

// Right-hand-traffic offset from the road centerline, consistently used both
// to place a vehicle at spawn and as the steering target while driving -
// without this, traffic AI aimed straight at the centerline and every
// vehicle (both directions) drove down the middle of the street.
function laneOffset(road, isBike) {
  return isBike ? (road.cat === 'cycle' ? 0.5 : road.width / 2 - 0.6) : Math.min(1.6, road.width / 2 - 0.9);
}

export function spawnVehicleOnRoad(map, road, isPolice = false, rng = Math.random, isBike = false, isBus = false, atPoint = null, isScooter = false) {
  const pts = road.pts;
  let i, a, b, t;
  if (atPoint) {
    // place it at the road segment nearest the requested point (e.g. a
    // mission marker) instead of a random spot anywhere along the whole
    // road, which could be hundreds of meters from where the player is
    let bestDist2 = Infinity;
    i = 0;
    for (let k = 0; k < pts.length - 1; k++) {
      const cp = closestPointOnSegment(atPoint.x, atPoint.y, pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1]);
      if (cp.dist2 < bestDist2) { bestDist2 = cp.dist2; i = k; t = cp.t; }
    }
    a = pts[i]; b = pts[i + 1];
  } else {
    i = Math.floor(rng() * (pts.length - 1));
    a = pts[i]; b = pts[i + 1];
    t = rng();
  }
  const x = a[0] + (b[0] - a[0]) * t;
  const y = a[1] + (b[1] - a[1]) * t;
  let angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const dir = road.oneway ? 1 : (rng() < 0.5 ? 1 : -1);
  if (dir < 0) angle = normalizeAngle(angle + Math.PI);
  const model = isPolice
    ? { name: 'police', len: 4.3, wid: 1.8, maxSpeed: 38, accel: 11, brake: 18, turnRate: 2.8, color: '#1c1c1c' }
    : isBike
    ? pickBikeModel(rng)
    : isScooter
    ? pickScooterModel(rng)
    : isBus
    ? BUS_MODELS[Math.floor(rng() * BUS_MODELS.length)]
    : MODELS[Math.floor(rng() * MODELS.length)];
  const lane = laneOffset(road, isBike || isScooter);
  const nx = -Math.sin(angle), ny = Math.cos(angle);
  const v = new Vehicle(x + nx * lane * dir, y + ny * lane * dir, angle, model);
  v.road = road;
  v.dir = dir;
  v.segIdx = dir > 0 ? i : i + 1;
  v.isPolice = isPolice;
  v.isBike = isBike;
  v.isBus = isBus;
  v.isScooter = isScooter;
  return v;
}

// The one-off hero car for GTE VI: same placement machinery as a regular
// traffic spawn (spawnVehicleOnRoad with atPoint), but forces the Escort
// model regardless of the RNG pick and flags it so it's never swept up by
// the ambient traffic population manager.
export function spawnHeroCarNear(map, x, y, rng = Math.random) {
  const point = map.nearestRoadPoint(x, y, 200, true);
  if (!point) return null;
  const v = spawnVehicleOnRoad(map, point.road, false, rng, false, false, point);
  v.model = HERO_CAR_MODEL;
  v.isHeroCar = true;
  return v;
}

// Keep a believable amount of traffic around the player without simulating
// the whole city: despawn cars that have drifted far away, spawn fresh ones
// on roads just outside the view so they appear to already be driving by
// the time they're on screen.
export function manageTrafficPopulation(world, { target = 22, spawnMin = 70, spawnMax = 170, despawnDist = 260 } = {}) {
  const { map, player, vehicles } = world;
  for (let i = vehicles.length - 1; i >= 0; i--) {
    const v = vehicles[i];
    if (v.driver === 'player' || v.isPolice || v.isHeroCar || v.isBike || v.isBus) continue;
    // Wrecked cars have speed=0 forever and would otherwise almost never
    // reach the distance despawn, silently eating the traffic quota. A
    // vehicle stuck bouncing off the same dead end (isolated stub with no
    // real connection) is cleared the same way rather than left oscillating.
    if (v.wrecked || (v.deadEndBounces || 0) > 2 || Math.hypot(v.x - player.x, v.y - player.y) > despawnDist) vehicles.splice(i, 1);
  }

  let count = 0;
  for (const v of vehicles) if (!v.isPolice && !v.isHeroCar && !v.isBike && !v.isBus && v.driver !== 'player') count++;

  const candidates = map.roadsNear(player.x, player.y, spawnMax).filter((r) => r.cat !== 'foot' && r.cat !== 'cycle');
  let guard = 0;
  while (count < target && candidates.length && guard++ < target * 4) {
    const road = candidates[Math.floor(Math.random() * candidates.length)];
    const v = spawnVehicleOnRoad(map, road, false, Math.random);
    const d = Math.hypot(v.x - player.x, v.y - player.y);
    if (d < spawnMin || d > spawnMax) continue;
    vehicles.push(v);
    count++;
  }
}

// Same idea as manageTrafficPopulation but for cyclists - fietsers are the
// single most Groningen-defining detail of the streetscape, so they get
// their own population target, favoring dedicated cycleways when present.
export function manageBikePopulation(world, { target = 16, spawnMin = 40, spawnMax = 140, despawnDist = 220 } = {}) {
  const { map, player, vehicles } = world;
  for (let i = vehicles.length - 1; i >= 0; i--) {
    const v = vehicles[i];
    if (!v.isBike || v.driver === 'player') continue;
    if (v.wrecked || (v.deadEndBounces || 0) > 2 || Math.hypot(v.x - player.x, v.y - player.y) > despawnDist) vehicles.splice(i, 1);
  }

  let count = 0;
  for (const v of vehicles) if (v.isBike && v.driver !== 'player') count++;

  const candidates = map.roadsNear(player.x, player.y, spawnMax)
    .filter((r) => r.cat === 'cycle' || r.cat === 'normal' || r.cat === 'minor');
  let guard = 0;
  while (count < target && candidates.length && guard++ < target * 4) {
    const road = candidates[Math.floor(Math.random() * candidates.length)];
    const v = spawnVehicleOnRoad(map, road, false, Math.random, true);
    const d = Math.hypot(v.x - player.x, v.y - player.y);
    if (d < spawnMin || d > spawnMax) continue;
    vehicles.push(v);
    count++;
  }
}

// Deelscooters follow the same lane/road-preference rules as bikes (cycle
// lanes, or normal/minor streets when there's no dedicated cycleway).
export function manageScooterPopulation(world, { target = 10, spawnMin = 40, spawnMax = 140, despawnDist = 220 } = {}) {
  const { map, player, vehicles } = world;
  for (let i = vehicles.length - 1; i >= 0; i--) {
    const v = vehicles[i];
    if (!v.isScooter || v.driver === 'player') continue;
    if (v.wrecked || (v.deadEndBounces || 0) > 2 || Math.hypot(v.x - player.x, v.y - player.y) > despawnDist) vehicles.splice(i, 1);
  }

  let count = 0;
  for (const v of vehicles) if (v.isScooter && v.driver !== 'player') count++;

  const candidates = map.roadsNear(player.x, player.y, spawnMax)
    .filter((r) => r.cat === 'cycle' || r.cat === 'normal' || r.cat === 'minor');
  let guard = 0;
  while (count < target && candidates.length && guard++ < target * 4) {
    const road = candidates[Math.floor(Math.random() * candidates.length)];
    const v = spawnVehicleOnRoad(map, road, false, Math.random, false, false, null, true);
    const d = Math.hypot(v.x - player.x, v.y - player.y);
    if (d < spawnMin || d > spawnMax) continue;
    vehicles.push(v);
    count++;
  }
}

// A handful of regional buses on the bigger through-roads only - real bus
// frequency is much lower than car/bike density.
export function manageBusPopulation(world, { target = 4, spawnMin = 90, spawnMax = 220, despawnDist = 300 } = {}) {
  const { map, player, vehicles } = world;
  for (let i = vehicles.length - 1; i >= 0; i--) {
    const v = vehicles[i];
    if (!v.isBus || v.driver === 'player') continue;
    if (v.wrecked || (v.deadEndBounces || 0) > 2 || Math.hypot(v.x - player.x, v.y - player.y) > despawnDist) vehicles.splice(i, 1);
  }

  let count = 0;
  for (const v of vehicles) if (v.isBus && v.driver !== 'player') count++;

  const candidates = map.roadsNear(player.x, player.y, spawnMax).filter((r) => r.cat === 'major' || r.cat === 'normal');
  let guard = 0;
  while (count < target && candidates.length && guard++ < target * 6) {
    const road = candidates[Math.floor(Math.random() * candidates.length)];
    const v = spawnVehicleOnRoad(map, road, false, Math.random, false, true);
    const d = Math.hypot(v.x - player.x, v.y - player.y);
    if (d < spawnMin || d > spawnMax) continue;
    vehicles.push(v);
    count++;
  }
}

// Boats don't follow the road graph at all - they free-roam a water polygon,
// so spawning one just needs a point that is actually inside it rather than
// a road/lane placement.
export function spawnBoatOnWater(map, waterPoly, rng = Math.random) {
  const [minx, miny, maxx, maxy] = waterPoly.bounds;
  let x = (minx + maxx) / 2, y = (miny + maxy) / 2;
  for (let attempt = 0; attempt < 20; attempt++) {
    const cx = minx + rng() * (maxx - minx);
    const cy = miny + rng() * (maxy - miny);
    if (pointInPolygon(cx, cy, waterPoly.pts)) { x = cx; y = cy; break; }
  }
  const angle = rng() * Math.PI * 2 - Math.PI;
  const model = BOAT_MODELS[Math.floor(rng() * BOAT_MODELS.length)];
  const v = new Vehicle(x, y, angle, model);
  v.isBoat = true;
  v.waterPoly = waterPoly;
  return v;
}

// Mirrors manageBikePopulation's despawn/spawn-quota shape, but candidates
// are water bodies near the player instead of roads.
export function manageBoatPopulation(world, { target = 4, spawnMin = 20, spawnMax = 180, despawnDist = 260 } = {}) {
  const { map, player, vehicles } = world;
  for (let i = vehicles.length - 1; i >= 0; i--) {
    const v = vehicles[i];
    if (!v.isBoat || v.driver === 'player') continue;
    if (v.wrecked || Math.hypot(v.x - player.x, v.y - player.y) > despawnDist) vehicles.splice(i, 1);
  }

  let count = 0;
  for (const v of vehicles) if (v.isBoat && v.driver !== 'player') count++;

  const candidates = map.waterNear(player.x, player.y, spawnMax);
  let guard = 0;
  while (count < target && candidates.length && guard++ < target * 6) {
    const poly = candidates[Math.floor(Math.random() * candidates.length)];
    const v = spawnBoatOnWater(map, poly, Math.random);
    const d = Math.hypot(v.x - player.x, v.y - player.y);
    if (d < spawnMin || d > spawnMax) continue;
    vehicles.push(v);
    count++;
  }
}

function pickBoatWaypoint(v, rng) {
  const [minx, miny, maxx, maxy] = v.waterPoly.bounds;
  for (let attempt = 0; attempt < 8; attempt++) {
    const x = minx + rng() * (maxx - minx);
    const y = miny + rng() * (maxy - miny);
    if (pointInPolygon(x, y, v.waterPoly.pts)) return [x, y];
  }
  return [v.x, v.y];
}

const BOAT_WAYPOINT_MIN = 4;
const BOAT_WAYPOINT_MAX = 9;

// Simple wander/patrol confined to the water body the boat spawned in
// (v.waterPoly, set by spawnBoatOnWater) - no road graph involved, so this
// stands entirely apart from updateTrafficAI.
export function updateBoatAI(v, dt, map, world, rng = Math.random) {
  if (!v.waterPoly) { v.applyControls(dt, 0, 0, true); return; }

  v.waypointTimer = (v.waypointTimer || 0) - dt;
  if (!v.waypoint || v.waypointTimer <= 0 || Math.hypot(v.waypoint[0] - v.x, v.waypoint[1] - v.y) < 4) {
    v.waypoint = pickBoatWaypoint(v, rng);
    v.waypointTimer = BOAT_WAYPOINT_MIN + rng() * (BOAT_WAYPOINT_MAX - BOAT_WAYPOINT_MIN);
  }

  const dx = v.waypoint[0] - v.x, dy = v.waypoint[1] - v.y;
  const steerErr = normalizeAngle(Math.atan2(dy, dx) - v.angle);

  // heading would carry the boat outside the water body - re-pick now rather
  // than let it run aground, same defensive check pedestrians2.js's
  // pickWaypoint uses before committing to a spot
  const aheadX = v.x + Math.cos(v.angle) * (v.model.len + 1);
  const aheadY = v.y + Math.sin(v.angle) * (v.model.len + 1);
  if (!pointInPolygon(aheadX, aheadY, v.waterPoly.pts)) {
    v.waypoint = pickBoatWaypoint(v, rng);
    v.waypointTimer = BOAT_WAYPOINT_MIN;
  }

  v.applyControls(dt, 1, clamp(steerErr * 1.2, -1, 1), false);
}

export function findNearestVehicle(x, y, vehicles, maxDist = 2.5) {
  let best = null, bestD = maxDist;
  for (const v of vehicles) {
    if (v.wrecked) continue;
    const d = Math.hypot(v.x - x, v.y - y);
    if (d < bestD) { bestD = d; best = v; }
  }
  return best;
}

// --- simplified traffic AI: follow the current road's polyline, and hop to a
// connecting road when reaching an endpoint (approximating an intersection). ---

function roadEndpoint(road, dir) {
  return dir > 0 ? road.pts[road.pts.length - 1] : road.pts[0];
}

function findConnectingRoad(map, point, excludeRoad, rng, allowCycle = false, minWidth = 0) {
  const candidates = [];
  for (const r of map.roadsNear(point[0], point[1], 7)) {
    if (r.cat === 'foot' || (r.cat === 'cycle' && !allowCycle)) continue;
    if (r.width < minWidth) continue;
    const d0 = Math.hypot(r.pts[0][0] - point[0], r.pts[0][1] - point[1]);
    const d1 = Math.hypot(r.pts[r.pts.length - 1][0] - point[0], r.pts[r.pts.length - 1][1] - point[1]);
    if (d0 < 6) candidates.push({ road: r, dir: 1 });
    if (d1 < 6 && r.pts.length > 1 && !r.oneway) candidates.push({ road: r, dir: -1 });
  }
  const fresh = candidates.filter((c) => c.road !== excludeRoad);
  const pool = fresh.length ? fresh : candidates;
  if (!pool.length) return null;
  return pool[Math.floor(rng() * pool.length)];
}

export function updateTrafficAI(v, dt, map, world, rng = Math.random) {
  if (v.waitTimer > 0) {
    v.waitTimer -= dt;
    v.applyControls(dt, 0, 0, true);
    return;
  }
  if (!v.road) return;

  const pts = v.road.pts;
  let targetIdx = v.segIdx + v.dir;
  if (targetIdx < 0 || targetIdx >= pts.length) {
    const endPoint = roadEndpoint(v.road, v.dir);
    const minWidth = v.model.wid + 0.6;
    const next = findConnectingRoad(map, endPoint, v.road, rng, v.isBike || v.isScooter, minWidth);
    if (next) {
      v.road = next.road;
      v.dir = next.dir;
      v.segIdx = next.dir > 0 ? 0 : next.road.pts.length - 1;
      v.deadEndBounces = 0;
    } else {
      v.dir *= -1; // dead end: u-turn
      v.segIdx = clamp(v.segIdx, 0, pts.length - 1);
      v.deadEndBounces = (v.deadEndBounces || 0) + 1;
    }
    return;
  }

  const target = pts[targetIdx];
  const prevPt = pts[v.segIdx];
  const segAngle = Math.atan2(target[1] - prevPt[1], target[0] - prevPt[0]);
  const lane = laneOffset(v.road, v.isBike || v.isScooter);
  const nx = -Math.sin(segAngle), ny = Math.cos(segAngle);
  const targetX = target[0] + nx * lane * v.dir;
  const targetY = target[1] + ny * lane * v.dir;
  const dx = targetX - v.x, dy = targetY - v.y;
  const distToTarget = Math.hypot(dx, dy);
  if (distToTarget < 1.5) {
    v.segIdx = targetIdx;
  }

  const targetAngle = Math.atan2(dy, dx);
  let steerErr = normalizeAngle(targetAngle - v.angle);

  let cruiseSpeed = (v.road.speed || 10) * (v.isPolice ? 1.15 : 1);
  const ahead = findVehicleAhead(v, world.vehicles, v.halfLen + 7);
  if (ahead) cruiseSpeed = Math.min(cruiseSpeed, Math.max(0, ahead.speed - 1));

  const wantBrake = v.speed > cruiseSpeed + 0.5;
  const throttle = wantBrake ? 0 : 1;

  // Rare, purely-cosmetic loss of control: a sharp turn taken too fast can
  // spin a car out. Kept rare on purpose (~1.5%/frame while the condition
  // holds) so it reads as a surprise, not a constant hazard. Chasing police
  // skip this entirely so pursuits stay predictable.
  if (!v.isPolice && Math.abs(steerErr) > 1.2 && Math.abs(v.speed) > v.model.maxSpeed * 0.5 && rng() < 0.015) {
    v.angle = normalizeAngle(v.angle + (rng() < 0.5 ? -1 : 1) * (1.6 + rng() * 1.4));
    v.speed *= 0.3;
  }

  v.applyControls(dt, throttle, clamp(steerErr * 1.4, -1, 1), wantBrake);
}

function findVehicleAhead(v, vehicles, maxDist) {
  let best = null, bestD = maxDist;
  const fx = Math.cos(v.angle), fy = Math.sin(v.angle);
  for (const other of vehicles) {
    if (other === v || other.wrecked) continue;
    const dx = other.x - v.x, dy = other.y - v.y;
    const fwd = dx * fx + dy * fy;
    if (fwd <= 0 || fwd > maxDist) continue;
    const lat = Math.abs(dx * -fy + dy * fx);
    if (lat > 2.2) continue;
    if (fwd < bestD) { bestD = fwd; best = other; }
  }
  return best;
}

// Cars/bikes/buses were never actually solid to each other - only to
// buildings - so at intersections and during chases they could sail
// straight through one another. Approximate each vehicle as a circle
// (average of its half-length/half-width) and push overlapping pairs apart,
// bleeding off speed proportional to the combined impact speed.
export function resolveVehicleVehicleCollisions(vehicles) {
  for (let i = 0; i < vehicles.length; i++) {
    const a = vehicles[i];
    if (a.wrecked) continue;
    // Radius close to the actual half-width (not an average with the much
    // bigger half-length) - two cars in adjacent lanes sit ~2.8m apart
    // centre-to-centre, and a radius as big as (halfLen+halfWid)/2 (~1.5m
    // per car) made every oncoming car in its own lane register as a
    // "collision" and brake, gridlocking entire streets.
    const ra = a.halfWid + 0.25;
    for (let j = i + 1; j < vehicles.length; j++) {
      const b = vehicles[j];
      if (b.wrecked) continue;
      const rb = b.halfWid + 0.25;
      const dx = b.x - a.x, dy = b.y - a.y;
      let dist = Math.hypot(dx, dy);
      const minDist = ra + rb;
      if (dist >= minDist) continue;
      if (dist < 1e-4) dist = 1e-4;
      const overlap = minDist - dist;
      const nx = dx / dist, ny = dy / dist;
      const pushA = overlap * (rb / minDist);
      const pushB = overlap * (ra / minDist);
      a.x -= nx * pushA; a.y -= ny * pushA;
      b.x += nx * pushB; b.y += ny * pushB;
      const impactSpeed = Math.abs(a.speed) + Math.abs(b.speed);
      if (impactSpeed > 2) {
        a.speed *= 0.75;
        b.speed *= 0.75;
      }
    }
  }
}

export function resolveVehicleBuildingCollision(v, map) {
  // Only a corner that has actually penetrated a building footprint counts as
  // a collision (checked via point-in-polygon) - a corner merely passing
  // close to a wall (common: buildings sit right up against the street) must
  // NOT brake the car, or traffic would stall on almost every block.
  const corners = vehicleCorners(v);
  let hit = false;
  for (const b of map.buildingsNear(v.x, v.y, v.halfLen + 3)) {
    const [minx, miny, maxx, maxy] = b.bounds;
    for (const c of corners) {
      if (c[0] < minx || c[0] > maxx || c[1] < miny || c[1] > maxy) continue;
      if (!pointInPolygon(c[0], c[1], b.pts)) continue;
      const pts = b.pts;
      let bestDist2 = Infinity, bestX = 0, bestY = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const cp = closestPointOnSegment(c[0], c[1], pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
        if (cp.dist2 < bestDist2) { bestDist2 = cp.dist2; bestX = cp.x; bestY = cp.y; }
      }
      const d = Math.sqrt(bestDist2) || 0.01;
      const move = d + 0.08;
      v.x += (bestX - c[0]) / d * move;
      v.y += (bestY - c[1]) / d * move;
      hit = true;
    }
  }
  if (hit) v.speed *= 0.4;
  return hit;
}

export function vehicleCorners(v) {
  const hl = v.halfLen, hw = v.halfWid;
  const cos = Math.cos(v.angle), sin = Math.sin(v.angle);
  const pts = [[hl, hw], [hl, -hw], [-hl, -hw], [-hl, hw]];
  return pts.map(([lx, ly]) => [v.x + lx * cos - ly * sin, v.y + lx * sin + ly * cos]);
}

function drawBike(ctx, v) {
  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.rotate(v.angle);
  const hl = v.halfLen;

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0.05, 0.05, hl, hl * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = v.model.color;
  ctx.lineWidth = 0.06;
  ctx.beginPath();
  ctx.moveTo(-hl * 0.85, 0);
  ctx.lineTo(hl * 0.2, -0.18);
  ctx.lineTo(hl * 0.85, 0);
  ctx.lineTo(hl * 0.2, -0.18);
  ctx.lineTo(-hl * 0.3, 0.05);
  ctx.lineTo(-hl * 0.85, 0);
  ctx.stroke();

  ctx.fillStyle = '#111';
  const wheelR = v.model.fat ? hl * 0.34 : hl * 0.22;
  ctx.beginPath(); ctx.arc(-hl * 0.85, 0, wheelR, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(hl * 0.85, 0, wheelR, 0, Math.PI * 2); ctx.fill();
  if (v.model.fat) {
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 0.035;
    ctx.beginPath(); ctx.arc(-hl * 0.85, 0, wheelR * 0.6, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(hl * 0.85, 0, wheelR * 0.6, 0, Math.PI * 2); ctx.stroke();
  }

  // rider, seen from directly above: shoulders + head, shifted slightly
  // toward the rear seat position
  ctx.fillStyle = v.model.rider || '#2f5c8a';
  ctx.beginPath();
  ctx.ellipse(-hl * 0.1, 0, hl * 0.5, v.halfWid * 1.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e0b48a';
  ctx.beginPath();
  ctx.arc(hl * 0.15, 0, hl * 0.28, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// Standing rider, seen from above, reads as a tight torso circle near the
// deck's centre rather than drawBike's elongated seated-rider ellipse.
function drawScooter(ctx, v) {
  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.rotate(v.angle);
  const hl = v.halfLen, hw = v.halfWid;

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0.04, 0.04, hl, hl * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = v.model.color;
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  ctx.moveTo(-hl * 0.8, 0);
  ctx.lineTo(hl * 0.3, 0);
  ctx.lineTo(hl * 0.3, -hl * 0.35);
  ctx.stroke();

  ctx.fillStyle = '#111';
  const wheelR = hl * 0.2;
  ctx.beginPath(); ctx.arc(-hl * 0.8, 0, wheelR, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(hl * 0.7, 0, wheelR, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = v.model.rider || '#2f5c8a';
  ctx.beginPath();
  ctx.ellipse(-hl * 0.05, 0, hw * 1.15, hw, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e0b48a';
  ctx.beginPath();
  ctx.arc(hl * 0.05, 0, hl * 0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

const BUS_FRONT_FRAC = 0.58;
const BUS_REAR_FRAC = 0.5;

// Articulated ("harmonica") bus: draws a shorter tractor unit at the
// vehicle's real (collision/AI) pose, a shorter trailing unit at a pose
// sampled from its own trail history, and a bellows joint stretched/skewed
// between the two attachment points - render-only, no effect on driving.
function drawBus(ctx, v) {
  const hl = v.halfLen, hw = v.halfWid;
  const frontHl = hl * BUS_FRONT_FRAC;
  const rearHl = hl * BUS_REAR_FRAC;
  const rearHw = hw * 0.92;
  const rearPose = sampleBusTrail(v, v.model.len);

  drawBusUnit(ctx, rearPose.x, rearPose.y, rearPose.angle, rearHl, rearHw, v.model, v.wrecked, false);
  drawBusJoint(ctx, v, frontHl, hw, rearPose, rearHl, rearHw);
  drawBusUnit(ctx, v.x, v.y, v.angle, frontHl, hw, v.model, v.wrecked, true);
}

function drawBusUnit(ctx, cx, cy, angle, hl, hw, model, wrecked, isFront) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.roundRect(-hl + 0.15, -hw + 0.15, hl * 2, hw * 2, 0.5);
  ctx.fill();

  ctx.fillStyle = '#161616';
  const wheelLen = 0.55;
  const axles = isFront ? [hl * 0.55, -hl * 0.55] : [hl * 0.5, -hl * 0.7];
  for (const ax of axles) {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.roundRect(ax - wheelLen / 2, side * hw - 0.08, wheelLen, 0.16, 0.05);
      ctx.fill();
    }
  }

  ctx.fillStyle = wrecked ? '#3a3a3a' : model.color;
  ctx.beginPath();
  ctx.roundRect(-hl, -hw, hl * 2, hw * 2, 0.5);
  ctx.fill();

  ctx.fillStyle = model.stripe || '#eae6da';
  ctx.fillRect(-hl + 0.25, -hw * 0.15, hl * 2 - 0.5, hw * 0.3);

  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 0.06;
  ctx.stroke();

  ctx.fillStyle = 'rgba(150,180,200,0.85)';
  const winCount = isFront ? 3 : 3;
  const winSpan = hl * 1.55;
  const winW = winSpan / winCount - 0.12;
  for (let i = 0; i < winCount; i++) {
    const wx = -winSpan / 2 + i * (winSpan / winCount) + 0.06;
    ctx.beginPath();
    ctx.roundRect(wx, -hw + 0.16, winW, hw - 0.32, 0.08);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(wx, 0.16, winW, hw - 0.32, 0.08);
    ctx.fill();
  }

  if (isFront) {
    ctx.fillStyle = 'rgba(150,180,200,0.9)';
    ctx.beginPath();
    ctx.roundRect(hl - 0.5, -hw + 0.2, 0.35, hw * 2 - 0.4, 0.1);
    ctx.fill();

    ctx.fillStyle = '#e0c020';
    ctx.fillRect(hl - 0.7, -hw * 0.4, 0.2, hw * 0.8);
  }

  ctx.restore();
}

// Dark accordion-bellows band bridging the tractor's rear edge to the
// trailer's front edge - drawn as a quad in world space (not a local
// rotated transform) since the two units can sit at different angles while
// cornering, which is exactly what gives it the concertina look.
function drawBusJoint(ctx, v, frontHl, frontHw, rearPose, rearHl, rearHw) {
  const jointFrontHw = frontHw * 0.72;
  const fx = v.x - Math.cos(v.angle) * frontHl, fy = v.y - Math.sin(v.angle) * frontHl;
  const fnx = -Math.sin(v.angle), fny = Math.cos(v.angle);
  const flx = fx + fnx * jointFrontHw, fly = fy + fny * jointFrontHw;
  const frx = fx - fnx * jointFrontHw, fry = fy - fny * jointFrontHw;

  const jointRearHw = rearHw * 0.72;
  const rx = rearPose.x + Math.cos(rearPose.angle) * rearHl, ry = rearPose.y + Math.sin(rearPose.angle) * rearHl;
  const rnx = -Math.sin(rearPose.angle), rny = Math.cos(rearPose.angle);
  const rlx = rx + rnx * jointRearHw, rly = ry + rny * jointRearHw;
  const rrx = rx - rnx * jointRearHw, rry = ry - rny * jointRearHw;

  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.moveTo(flx, fly);
  ctx.lineTo(rlx, rly);
  ctx.lineTo(rrx, rry);
  ctx.lineTo(frx, fry);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 0.05;
  for (let i = 1; i <= 3; i++) {
    const t = i / 4;
    ctx.beginPath();
    ctx.moveTo(lerp(flx, rlx, t), lerp(fly, rly, t));
    ctx.lineTo(lerp(frx, rrx, t), lerp(fry, rry, t));
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(40,40,40,0.9)';
  ctx.beginPath();
  ctx.arc((fx + rx) / 2, (fy + ry) / 2, frontHw * 0.28, 0, Math.PI * 2);
  ctx.fill();
}

// A handful of fading dots trailing the stern - cheap stand-in for a wake,
// only drawn while actually moving.
function drawBoatWake(ctx, v) {
  if (Math.abs(v.speed) < 0.3) return;
  const bx = -Math.cos(v.angle), by = -Math.sin(v.angle);
  for (let i = 1; i <= 3; i++) {
    const d = v.halfLen + i * 0.9;
    ctx.globalAlpha = 0.35 * (1 - i / 4);
    ctx.fillStyle = 'rgba(220,235,240,0.9)';
    ctx.beginPath();
    ctx.arc(v.x + bx * d, v.y + by * d, 0.18 + i * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawBoat(ctx, v) {
  drawBoatWake(ctx, v);

  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.rotate(v.angle);
  const hl = v.halfLen, hw = v.halfWid;

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0.08, 0.08, hl, hw, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = v.wrecked ? '#3a3a3a' : v.model.color;
  ctx.beginPath();
  ctx.moveTo(hl, 0);
  ctx.lineTo(hl * 0.3, -hw);
  ctx.lineTo(-hl, -hw * 0.85);
  ctx.lineTo(-hl, hw * 0.85);
  ctx.lineTo(hl * 0.3, hw);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 0.06;
  ctx.stroke();

  ctx.fillStyle = v.model.cabin || '#2f3a44';
  ctx.beginPath();
  ctx.roundRect(-hl * 0.35, -hw * 0.55, hl * 0.7, hw * 1.1, 0.12);
  ctx.fill();

  ctx.restore();
}

export function drawVehicle(ctx, v) {
  if (v.isBike) { drawBike(ctx, v); return; }
  if (v.isScooter) { drawScooter(ctx, v); return; }
  if (v.isBus) { drawBus(ctx, v); return; }
  if (v.isBoat) { drawBoat(ctx, v); return; }
  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.rotate(v.angle);
  const hl = v.halfLen, hw = v.halfWid;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.roundRect(-hl + 0.15, -hw + 0.15, hl * 2, hw * 2, 0.4);
  ctx.fill();

  ctx.fillStyle = '#161616';
  const wheelLen = hl * 0.34, wheelWid = 0.14;
  const axleF = hl * 0.55, axleR = -hl * 0.58;
  for (const ax of [axleF, axleR]) {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.roundRect(ax - wheelLen / 2, side * hw - wheelWid / 2, wheelLen, wheelWid, 0.05);
      ctx.fill();
    }
  }

  ctx.fillStyle = v.wrecked ? '#3a3a3a' : v.model.color;
  ctx.beginPath();
  ctx.roundRect(-hl, -hw, hl * 2, hw * 2, 0.45);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 0.06;
  ctx.stroke();

  // cabin: windshield + roof + rear window, split by pillars so it doesn't
  // read as one flat window band
  const cabinX0 = -hl * 0.18, cabinX1 = hl * 0.62;
  ctx.fillStyle = 'rgba(60,64,70,0.9)';
  ctx.beginPath();
  ctx.roundRect(cabinX0, -hw + 0.16, cabinX1 - cabinX0, hw * 2 - 0.32, 0.22);
  ctx.fill();
  ctx.fillStyle = 'rgba(175,205,225,0.9)';
  ctx.beginPath();
  ctx.roundRect(cabinX0 + 0.08, -hw + 0.22, (cabinX1 - cabinX0) * 0.32, hw * 2 - 0.44, 0.16);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(cabinX0 + (cabinX1 - cabinX0) * 0.58, -hw + 0.22, (cabinX1 - cabinX0) * 0.36, hw * 2 - 0.44, 0.16);
  ctx.fill();
  ctx.fillStyle = 'rgba(150,180,200,0.85)';
  ctx.beginPath();
  ctx.roundRect(-hl * 0.72, -hw + 0.22, hl * 0.32, hw * 2 - 0.44, 0.14);
  ctx.fill();

  ctx.fillStyle = '#161616';
  ctx.beginPath(); ctx.arc(hl * 0.25, -hw - 0.02, 0.11, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(hl * 0.25, hw + 0.02, 0.11, 0, Math.PI * 2); ctx.fill();

  if (v.isPolice) {
    ctx.fillStyle = '#2255dd';
    ctx.fillRect(-hl * 0.15, -hw * 0.35, 0.3, hw * 0.35);
    ctx.fillStyle = '#dd2222';
    ctx.fillRect(-hl * 0.15, 0, 0.3, hw * 0.35);
  }

  ctx.fillStyle = '#fff7c2';
  ctx.fillRect(hl - 0.1, -hw + 0.15, 0.15, 0.25);
  ctx.fillRect(hl - 0.1, hw - 0.4, 0.15, 0.25);
  ctx.fillStyle = '#661111';
  ctx.fillRect(-hl - 0.05, -hw + 0.15, 0.12, 0.25);
  ctx.fillRect(-hl - 0.05, hw - 0.4, 0.12, 0.25);

  ctx.restore();
}

// A vehicle that drives (or is knocked) into open water is wrecked on the
// spot and splashes; the player, if driving it, is ejected right where the
// vehicle went in.
export function checkVehicleWater(v, map, world) {
  if (v.isBoat) return false;
  if (v.wrecked) return false;
  if (map.isOnBridge(v.x, v.y)) return false;
  for (const w of map.waterNear(v.x, v.y, 3)) {
    const [minx, miny, maxx, maxy] = w.bounds;
    if (v.x < minx || v.x > maxx || v.y < miny || v.y > maxy) continue;
    if (!pointInPolygon(v.x, v.y, w.pts)) continue;

    v.wrecked = true;
    v.speed = 0;
    world.particles.push({ x: v.x, y: v.y, until: world.time + 1.1, kind: 'splash' });

    if (v.driver === 'player') {
      const player = world.player;
      v.driver = null;
      player.inVehicle = null;
      player.x = v.x;
      player.y = v.y;
      world.addMessage('Nat geworden!', 3);
      world.health = Math.max(0, world.health - 15);
    }
    return true;
  }
  return false;
}

// Draws (and expires) the splash particles checkVehicleWater pushes into
// world.particles - kind 'splash', same {x,y,until} shape combat.js's own
// 'spark' particles use, filtered the same way so the two kinds coexist.
export function drawSplash(ctx, world) {
  world.particles = world.particles.filter((p) => p.kind !== 'splash' || p.until > world.time);

  for (const p of world.particles) {
    if (p.kind !== 'splash') continue;
    const t = 1 - clamp((p.until - world.time) / 1.1, 0, 1);
    const r = lerp(0.3, 2.1, t);
    ctx.globalAlpha = 1 - t;
    ctx.strokeStyle = 'rgba(210,230,240,0.9)';
    ctx.lineWidth = 0.08;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + t * 1.5;
      ctx.beginPath();
      ctx.arc(p.x + Math.cos(a) * r * 0.5, p.y + Math.sin(a) * r * 0.5, 0.15 * (1 - t * 0.6), 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

export { MODELS };
