import { clamp, dist, closestPointOnSegment, isInWater } from './util.js';
import { spawnVehicleOnRoad, distToVehicleBody } from './vehicle.js';
import { makeCopPedestrian, isInsideBuilding, isSpawnHidden, CITY_CENTRE } from './pedestrians.js';
import { buildHorseMesh } from './countryside.js';
import { setHorseMeshBuilder } from './models3d_vehicles.js';

setHorseMeshBuilder(buildHorseMesh);

// Police on bikes and horseback (Vehicles with isBike + _mount), plus the
// "crew" mechanic shared by every police unit: officers get out of a stopped
// car or off their bike/horse/scooter to make the arrest on foot, walk back
// and ride on once the player gets away, or commandeer a nearby car.

const BIKE_MODEL = { name: 'bike', len: 1.8, wid: 0.55, maxSpeed: 7.6, accel: 3.8, brake: 7, turnRate: 4.8, color: '#dfe3ea', rider: '#1c3fae' };
const HORSE_MODEL = { name: 'horse', len: 2.4, wid: 0.75, maxSpeed: 9.2, accel: 3.2, brake: 6, turnRate: 3.2, color: '#6b3f22', rider: '#1c3fae', coat: 0 };
const HORSE_COATS = [0, 3, 1];

const MOUNT_SPAWN_STAGGER = 4;
const MOUNT_SPAWN_MIN = 55;
const MOUNT_SPAWN_MAX = 120;
const MOUNT_MIN_FROM_PLAYER = 45;
const MOUNT_ROAD_CATS = ['cycle', 'minor', 'normal'];
const BIKE_CHANCE = 0.55;
const HORSE_CHANCE = 0.4;
const CENTRE_FRACTION = 0.75;
const HORSE_BOLT_HEALTH = 40;

const CAR_DEPLOY_DIST = 12;
const CAR_DEPLOY_SPEED = 3.5;
const MOUNT_DEPLOY_DIST = 6;
const MOUNT_DEPLOY_SPEED = 4;
const SLOW_TWO_WHEELER = 2;
const STOPPED_CAR = 1;
const CAR_ESCAPE_DIST = 18;
const MOUNT_ESCAPE_DIST = 15;
const FAST_VEHICLE = 6;
const REENGAGE_DIST = 9;
const CREW_MAX_OUT = 35;
const CREW_COOLDOWN = 4;
const REMOUNT_RANGE = 30;
const COMMANDEER_RANGE = 12;

export function isMounted(v) {
  return !!(v._mount || v._motor);
}

// --- spawning ----------------------------------------------------------------

function nearestPathPoint(map, x, y) {
  let best = null, bd = 30 * 30;
  for (const r of map.roadsNear(x, y, 30)) {
    if (!MOUNT_ROAD_CATS.includes(r.cat) || r.z || r.bridge || r.pts.length < 2) continue;
    const pts = r.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const cp = closestPointOnSegment(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
      if (cp.dist2 < bd) { bd = cp.dist2; best = { x: cp.x, y: cp.y, road: r }; }
    }
  }
  return best;
}

function clearOfVehicles(world, x, y, r) {
  for (const o of world.vehicles) if (Math.abs(o.x - x) < r && Math.abs(o.y - y) < r) return false;
  return true;
}

function findMountSpawn(world, minD = MOUNT_SPAWN_MIN, maxD = MOUNT_SPAWN_MAX, hidden = true) {
  const p = world.player, pol = world.police;
  const c = pol && pol.searching && pol.searchCenter ? pol.searchCenter : p;
  for (let attempt = 0; attempt < 6; attempt++) {
    const a = Math.random() * Math.PI * 2, d = minD + Math.random() * (maxD - minD);
    const rp = nearestPathPoint(world.map, c.x + Math.cos(a) * d, c.y + Math.sin(a) * d);
    if (!rp) continue;
    const dp = Math.hypot(rp.x - p.x, rp.y - p.y);
    if (hidden && (dp < MOUNT_MIN_FROM_PLAYER || dp > maxD + 25 || !isSpawnHidden(world, rp.x, rp.y))) continue;
    if (isInsideBuilding(world.map, rp.x, rp.y) || !clearOfVehicles(world, rp.x, rp.y, 5)) continue;
    return rp;
  }
  return null;
}

function spawnMount(world, rp, kind) {
  const v = spawnVehicleOnRoad(world.map, rp.road, false, Math.random, true, false, rp);
  v.model = { ...(kind === 'horse' ? HORSE_MODEL : BIKE_MODEL) };
  if (kind === 'horse') v.model.coat = HORSE_COATS[Math.floor(Math.random() * HORSE_COATS.length)];
  v.isPolice = true;
  v._mount = kind;
  v._baseTop = v.model.maxSpeed;
  world.vehicles.push(v);
  return v;
}

// Bikes mostly at 1-3 stars and wherever cars are no match (the car-free
// binnenstad, a player on foot or on a bike); the odd horse in the same places.
export function trySpawnMounts(world, state) {
  if (world.wanted < 1 || world.time < (state.nextMountAt || 0)) return;
  state.nextMountAt = world.time + MOUNT_SPAWN_STAGGER;
  let bikes = 0, horses = 0;
  for (const v of world.vehicles) {
    if (!v._mount || !v.isPolice || v.hijacked || v.wrecked) continue;
    if (v._mount === 'horse') horses++; else bikes++;
  }
  const p = world.player, pv = p.inVehicle, w = world.wanted;
  const centre = Math.hypot(p.x - CITY_CENTRE.x, p.y - CITY_CENTRE.y) < CITY_CENTRE.r * CENTRE_FRACTION;
  const slow = !pv || pv.isBike || pv.isScooter;
  let maxBikes = w <= 3 ? 1 : 0;
  if (centre || slow) maxBikes = w <= 3 ? (w >= 2 ? 2 : 1) : (centre && slow ? 1 : 0);
  const maxHorses = (w <= 3 && (centre || slow)) || (w <= 4 && centre) ? 1 : 0;
  let kind = null;
  if (horses < maxHorses && Math.random() < HORSE_CHANCE) kind = 'horse';
  else if (bikes < maxBikes && Math.random() < BIKE_CHANCE) kind = 'bike';
  if (!kind) return;
  const rp = findMountSpawn(world);
  if (!rp) { state.nextMountAt = world.time + 0.7; return; }
  spawnMount(world, rp, kind);
}

// Devtools helper: a unit on the nearest path 15-30 m away, in plain view.
export function spawnPoliceMountNear(world, kind = 'bike') {
  const rp = findMountSpawn(world, 15, 30, false);
  return rp ? spawnMount(world, rp, kind) : null;
}

// --- crew out / back in ------------------------------------------------------

function freeSpot(map, x, y) {
  return !isInsideBuilding(map, x, y) && !isInWater(map, x, y);
}

function deployCrew(v, world, state, n) {
  const p = world.player;
  const mounted = isMounted(v);
  const fx = Math.cos(v.angle), fy = Math.sin(v.angle);
  const rx = -fy, ry = fx;
  const toward = (p.x - v.x) * rx + (p.y - v.y) * ry >= 0 ? 1 : -1;
  const off = v.halfWid + 0.55, along = mounted ? 0 : 0.4;
  const crew = [];
  for (let i = 0; i < n; i++) {
    let side = i === 0 ? toward : -toward;
    let x = v.x + rx * off * side + fx * along, y = v.y + ry * off * side + fy * along;
    if (!freeSpot(world.map, x, y)) {
      side = -side;
      x = v.x + rx * off * side + fx * along;
      y = v.y + ry * off * side + fy * along;
      if (!freeSpot(world.map, x, y) || crew.some((c) => dist(c.x, c.y, x, y) < 0.6)) continue;
    }
    const cop = makeCopPedestrian(x, y, Math.atan2(p.y - y, p.x - x), mounted ? (v.id || 0) * 3.7 + 1 : null);
    cop._unit = v;
    cop.state = 'seek';
    cop._sees = true;
    cop._losT = 0.3;
    world.pedestrians.push(cop);
    crew.push(cop);
  }
  if (!crew.length) return false;
  startCrew(v, world, state, crew);
  return true;
}

function startCrew(v, world, state, crew) {
  v._crew = crew;
  v._crewSince = world.time;
  v._crewBoarded = false;
  v._riderAway = isMounted(v);
  v.road = null;
  v._wasDirect = true;
  v._ramUntil = 0;
  if (!state.crewUnits.includes(v)) state.crewUnits.push(v);
}

// After updateChase: a slow unit close to a player on foot, on a stopped bike
// or in a stopped car lets its officers out. Returns true when it did.
export function tryDeployCrew(v, world, state) {
  if (world.wanted === 0 || world.time < (v._crewCd || 0) || world.pendingRespawn) return false;
  const p = world.player, pv = p.inVehicle;
  if (p.water || (pv && pv.isBoat)) return false;
  const target = !pv || ((pv.isBike || pv.isScooter) && Math.abs(pv.speed) < SLOW_TWO_WHEELER) || Math.abs(pv.speed) < STOPPED_CAR;
  if (!target) return false;
  const mounted = isMounted(v);
  const d = Math.hypot(p.x - v.x, p.y - v.y);
  if (d > (mounted ? MOUNT_DEPLOY_DIST : CAR_DEPLOY_DIST) || Math.abs(v.speed) > (mounted ? MOUNT_DEPLOY_SPEED : CAR_DEPLOY_SPEED)) return false;
  if (!mounted && !v._sees) return false;
  const n = mounted || v._commandeered ? 1 : world.wanted >= 3 || Math.random() < 0.5 ? 2 : 1;
  return deployCrew(v, world, state, n);
}

// A rider thrown off a police bike/scooter (pedestrians.knockOffRiders) is
// crew too and can pick the bike up again.
export function adoptThrownRider(v, world, state) {
  const cop = v._thrownCop;
  v._thrownCop = null;
  if (!cop || v._crew) return;
  cop._unit = v;
  startCrew(v, world, state, [cop]);
}

export function holdUnit(v, dt) {
  v.applyControls(dt, 0, 0, 1);
}

function removePed(world, ped) {
  const i = world.pedestrians.indexOf(ped);
  if (i >= 0) world.pedestrians.splice(i, 1);
}

function abandonMount(v) {
  v.hijacked = true;
  v._ejected = true;
  v._riderAway = true;
  v.speed = 0;
}

function makeStray(c, state) {
  c._unit = null;
  c._recall = false;
  c._boarded = false;
  if (!state.strays.includes(c)) state.strays.push(c);
}

export function updateCrews(dt, world, state) {
  const units = state.crewUnits;
  const p = world.player, pv = p.inVehicle;
  const fastPlayer = !!pv && Math.abs(pv.speed) > FAST_VEHICLE;
  for (let i = units.length - 1; i >= 0; i--) {
    const v = units[i];
    const crew = v._crew;
    if (!crew) { units.splice(i, 1); continue; }
    const mounted = isMounted(v);
    for (let k = crew.length - 1; k >= 0; k--) {
      const c = crew[k];
      if (c._boarded && c._unit === v) {
        removePed(world, c);
        crew.splice(k, 1);
        v._crewBoarded = true;
      } else if (c.state === 'dead' || c._unit !== v || !world.pedestrians.includes(c)) {
        if (c._unit === v) c._unit = null;
        crew.splice(k, 1);
      }
    }
    const usable = !v.wrecked && !v.hijacked && !v.sinking && world.vehicles.includes(v);
    if (!usable) {
      for (const c of crew) makeStray(c, state);
      v._crew = null;
      if (mounted) v._ejected = true;
      if (v._mount && v.driver === 'player') v.isPolice = false;
      units.splice(i, 1);
      continue;
    }
    if (!crew.length) {
      v._crew = null;
      units.splice(i, 1);
      if (mounted && !v._crewBoarded) { abandonMount(v); continue; }
      v._riderAway = false;
      v.riderOff = false;
      v._crewCd = world.time + CREW_COOLDOWN;
      continue;
    }
    const escape = mounted ? MOUNT_ESCAPE_DIST : CAR_ESCAPE_DIST;
    const overtime = world.time - v._crewSince > CREW_MAX_OUT;
    for (let k = crew.length - 1; k >= 0; k--) {
      const c = crew[k];
      const dc = dist(c.x, c.y, p.x, p.y);
      const lost = c.state !== 'seek' && c.state !== 'return';
      if (world.wanted === 0 || overtime || dc > escape || fastPlayer || lost) c._recall = true;
      else if (c._recall && !pv && dc < REENGAGE_DIST && c._sees) c._recall = false;
      // a rider whose mount is too far off takes a car instead, if there is one
      if (mounted && c._recall && world.wanted > 0 && world.time >= (c._carCheckAt || 0) && dist(c.x, c.y, v.x, v.y) > REMOUNT_RANGE) {
        c._carCheckAt = world.time + 0.5;
        const car = findCommandeerCar(world, c.x, c.y);
        if (car) {
          crew.splice(k, 1);
          makeStray(c, state);
          c._unit = car;
          c._recall = true;
        }
      }
    }
  }
  updateStrays(world, state);
}

function findCommandeerCar(world, x, y) {
  let best = null, bd = COMMANDEER_RANGE;
  for (const o of world.vehicles) {
    if (o.isPolice || o.wrecked || o.sinking || o.isBoat || o.isBike || o.isScooter || o.isBus || o.parked) continue;
    if (o.driver === 'player' || o.passenger || o.isHeroCar || o.missionCar || o.playerOwned || o.racer || o.cineTemp || o.isAmbulance) continue;
    if (Math.abs(o.x - x) > bd + 3 || Math.abs(o.y - y) > bd + 3) continue;
    const d = distToVehicleBody(o, x, y);
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}

function commandeer(car, cop, world) {
  removePed(world, cop);
  cop._unit = null;
  car.isPolice = true;
  car._commandeered = true;
  car.waitTimer = 0;
  car.plan = [];
  world.addMessage('Een agent vordert een auto!', 2);
}

// Officers without a unit (mount gone, wrecked or stolen) chase on foot, and
// once the player is away walk to the nearest car to commandeer it.
function updateStrays(world, state) {
  const strays = state.strays;
  const p = world.player, pv = p.inVehicle;
  for (let i = strays.length - 1; i >= 0; i--) {
    const c = strays[i];
    if (world.wanted === 0 || c.state === 'dead' || !world.pedestrians.includes(c)) {
      c._unit = null;
      c._recall = false;
      strays.splice(i, 1);
      continue;
    }
    const near = !pv && dist(c.x, c.y, p.x, p.y) < REENGAGE_DIST;
    const car = c._unit;
    if (car) {
      if (near || car.wrecked || car.isPolice || car.driver === 'player' || !world.vehicles.includes(car)) {
        c._unit = null;
        c._recall = false;
        c._boarded = false;
        continue;
      }
      if (c._boarded) { commandeer(car, c, world); strays.splice(i, 1); continue; }
      car.waitTimer = Math.max(car.waitTimer || 0, 0.6);
      continue;
    }
    if (world.time < (c._carCheckAt || 0)) continue;
    c._carCheckAt = world.time + 0.5;
    if (dist(c.x, c.y, p.x, p.y) < MOUNT_ESCAPE_DIST && !(pv && Math.abs(pv.speed) > FAST_VEHICLE)) continue;
    const found = findCommandeerCar(world, c.x, c.y);
    if (found) { c._unit = found; c._recall = true; }
  }
}

// The player took a police bike/horse: whoever was riding it is now on foot.
export function ejectMountRider(v, world, state) {
  v._ejected = true;
  v.isPolice = false;
  if (v._riderAway || v._crew) return;
  v._riderAway = true;
  const rx = -Math.sin(v.angle), ry = Math.cos(v.angle);
  for (const s of [1, -1]) {
    const x = v.x + rx * s * 1.1, y = v.y + ry * s * 1.1;
    if (!freeSpot(world.map, x, y)) continue;
    const cop = makeCopPedestrian(x, y, v.angle, (v.id || 0) * 3.7 + 1);
    cop.state = 'seek';
    cop._sees = true;
    world.pedestrians.push(cop);
    makeStray(cop, state);
    return;
  }
}

// A horse that has taken a beating throws its rider and bolts.
export function maybeBolt(v, world, state) {
  if (v._mount !== 'horse' || v._bolting || v.health > HORSE_BOLT_HEALTH) return false;
  v._bolting = true;
  if (!v._riderAway && !v._crew) ejectMountRider(v, world, state);
  v._ejected = true;
  v._riderAway = true;
  // still flagged police so the traffic loop leaves it to updateBolting
  v.isPolice = true;
  v.hijacked = true;
  v.road = null;
  return true;
}

export function updateBolting(v, dt, world) {
  const p = world.player;
  const away = Math.atan2(v.y - p.y, v.x - p.x);
  let diff = away - v.angle;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  v.applyControls(dt, v.speed < v.model.maxSpeed * 0.9 ? 1 : 0, clamp(diff * 2, -1, 1), 0);
  return Math.hypot(v.x - p.x, v.y - p.y) > 70 && isSpawnHidden(world, v.x, v.y);
}
