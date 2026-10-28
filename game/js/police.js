import { clamp, closestPointOnSegment, pointInPolygon } from './util.js';
import { spawnVehicleOnRoad, updateTrafficAI, resolveVehicleBuildingCollision, spawnPoliceBoatOnWater, attachToNearestRoad, maxCurvature } from './vehicle.js';
import { requestRespawn } from './world.js';
import { mulberry32 } from './rng.js';
import { bustFineIn } from './economy.js';
import { spawnCopPedestriansNear, isSpawnHidden } from './pedestrians.js';
import { isInsideBuilding } from './pedgeom.js';
import { edgeDistance } from './countryfield.js';
import { roadNetReady } from './roadgraph.js';
import { isKnockedDown } from './ragdoll.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { decayFactor, profileOf, hintFor } from './signalement.js';
import { levelOf, markSeen, stepUnseen, isInterceptorSlot, INTERCEPTOR, policeTarget, policeArmor } from './wantedlevels.js';
import { createShards, dropSpikes } from './roadshards.js';
import { makeBeamGeometry, makeBeamMaterial, requestSearchlight } from './nightlights3d.js';
import { trySpawnMounts, tryDeployCrew, adoptThrownRider, holdUnit, updateCrews, ejectMountRider, maybeBolt, updateBolting } from './policemounts.js';
import { waterNearby } from './waterlevels.js';
import { hoofdspeler } from './players.js';
import { countryRoadPoint, dryLine, solidAt, countryCopPed, countryFollow, countryPatrol, FIELD_RUN_DIST, COP_PED_MIN_DIST } from './police/ommeland.js';

// search area, cooldown and roadblock timing per star: wantedlevels.js
const SEE_RANGE_CAR = 55;
const SEE_RANGE_FOOT = 32;
const HELI_SEE_RADIUS = 14;
const HELI_SPOT_SPEED = 7.5;

const ROADBLOCK_WANTED = 3;
const ROADBLOCK_WAKE_DIST = 14;
const ROADBLOCK_CAR_SPACING = 4.2;
const ROADBLOCK_WIDE = 12;
const ROADBLOCK_EXTRA_CHANCE = 0.5;

const MOTOR_WANTED = 4;
const MOTOR_MAX = 2;
const MOTOR_MODEL = { name: 'scooter', len: 1.3, wid: 0.45, maxSpeed: 15.5, accel: 6, brake: 9, turnRate: 5, color: '#eceae4', rider: '#1c3fae' };
const DESPAWN_DIST = 260;
const SPAWN_STAGGER = 1.4;
const FIRE_RANGE = 28;
const DIRECT_CHASE_DIST = 30;

// Units come in from out of sight: far enough to need a few seconds to
// arrive, hidden from the camera (see isSpawnHidden) and never on top of
// other traffic.
const SPAWN_MIN_DIST = 90;
const SPAWN_MAX_DIST = 180;
const SEARCH_SPAWN_MIN_DIST = 70;

// Top speed per wanted level (index = stars); a regular sedan does 33.
const POLICE_TOP_SPEED = [30, 32, 35, 39, 44, 50];
// the player's cars do 0-100 in ~6-8 s (vehicle.js PLAYER_CAR_ACCEL); a patrol car a bit quicker
const POLICE_ACCEL = [5.5, 6, 6.5, 7, 7.5, 8];
// Out of sight and far behind, units speed up with distance towards 95% of
// a fast player's speed, between 1.04x and 1.2x their own top speed.
const RUBBER_BAND_NEAR = 60;
const RUBBER_BAND_FULL = 140;
const RUBBER_BAND_MATCH = 0.95;
const RUBBER_BAND_MIN = 1.04;
const RUBBER_BAND_MAX = 1.2;
const RUBBER_BAND_ACCEL = 0.2;
const MOUNT_RUBBER_BAND = 1.15;
const OUTRUN_SPEED = 15; // the tuned fatbike's sprint (16) gets away too
const OUTRUN_CLEAR_DIST = 80;
const RECYCLE_DIST = 170;

// PIT-style rams in direct chase: aim at the rear quarter with lead and come
// in a few m/s faster than the player; riders get it far more often.
const RAM_START_DIST = 22;
const RAM_MIN_DIST = 5;
const RAM_ABORT_DIST = 35;
const RAM_MAX_TIME = 3;
const RAM_COOLDOWN_MIN = 4;
const RAM_COOLDOWN_MAX = 8;
const RAM_RATE = 0.2;
const RAM_RATE_LIGHT = 0.9;
const RAM_BOOST = 5;
const RAM_BOOST_LIGHT = 8;
const RAM_CONTACT_GAP = 0.35;
const FOOT_STOP_DIST = 6.5;
const MOUNT_STOP_DIST = 2.5;

// Genre-style arrests: never on contact. On foot a cop has to stand next to
// you for a moment while you're (nearly) stopped; in a car you have to be
// boxed in and stopped with police right beside you.
const FOOT_BUST_RANGE = 1.5;
const FOOT_BUST_MAX_SPEED = 3.4; // the player's jog (3.0) is caught, a sprint is not
const FOOT_BUST_TIME = 1;
const CAR_BUST_MAX_SPEED = 2;
const CAR_BUST_CAR_GAP = 2.6;
const CAR_BUST_COP_RANGE = 3.2;
const CAR_BUST_TIME = 2;

// "Politie ook te voet" - a small pool of cop Pedestrians (see
// spawnCopPedestriansNear in pedestrians.js), grown only once there's
// something to respond to.
const COP_PED_WANTED_THRESHOLD = 1;
const COP_PED_TARGET_MAX = 3;
const COP_PED_TARGET_MAX_HIGH = 5;
const COP_PED_SPAWN_STAGGER = 2.2;
const COP_PED_DESPAWN_DIST = 140;

// "Politie per boot" - at most one police boat at a time, only spawned when
// the player is actually near/on water (chasing on foot across dry land
// makes no sense for a boat).
const BOAT_WANTED_THRESHOLD = 2;
const BOAT_SPAWN_STAGGER = 3;
const BOAT_SPAWN_MAX_DIST = 200;
const WATER_PROXIMITY = 25;
const BOAT_DESPAWN_DIST = 280;
const BOAT_SPAWN_MIN_DIST = 60;

// "Politie per heli" - a single always-circling unit at high wanted, no
// collision, purely a lerp-follow overhead presence (see updatePoliceHeli).
const HELI_WANTED_THRESHOLD = 4;
const HELI_ALTITUDE = 30;
const HELI_ORBIT_RADIUS = 22;
const HELI_ORBIT_SPEED = 0.6;
const HELI_FOLLOW_LERP = 1.1;
const HELI_MAX_SPEED = 26;
const HELI_SPAWN_DIST = 220;
const HELI_ROTOR_SPEED = 22;

// Per-world scratch state that doesn't belong on the shared World contract
// (spawn cooldowns, previous-wanted tracking for the decay timer).
const policeState = new WeakMap();
const heliRender = { heli: null };
// a heli posed by a cutscene (trailer.js) instead of updatePoliceHeli
export function setPoliceHeliRender(h) { heliRender.heli = h; }

// The player's own helicopter in the air (heliflight.js), or null.
function playerAloft(world) {
  const pv = hoofdspeler(world).inVehicle;
  return pv && pv.isHeli && !pv.onGround ? pv : null;
}
// Up above the rooftops everyone on the street can see you.
function aloftInSight(world) {
  const a = playerAloft(world);
  return !!a && a.z - (a.groundZ || 0) > 25;
}
function getState(world) {
  let s = policeState.get(world);
  if (!s) {
    s = {
      prevWanted: world.wanted, nextSpawnAt: 0, nextCopPedSpawnAt: 0, nextBoatSpawnAt: 0, nextRoadblockAt: 0, nextMotorAt: 0, nextMountAt: 0,
      seeTimer: 0, outrun: false, nextRecycleAt: 0, crewUnits: [], strays: [],
    };
    policeState.set(world, s);
  }
  return s;
}

function spawnSpotHidden(world, x, y, angle = 0, half = 0) {
  if (!isSpawnHidden(world, x, y)) return false;
  if (!half) return true;
  const fx = Math.cos(angle) * half, fy = Math.sin(angle) * half;
  return isSpawnHidden(world, x + fx, y + fy) && isSpawnHidden(world, x - fx, y - fy);
}

function vehicleClearance(world, x, y, r) {
  for (const o of world.vehicles) if (Math.abs(o.x - x) < r && Math.abs(o.y - y) < r && Math.hypot(o.x - x, o.y - y) < r) return false;
  return true;
}

// A road point SPAWN_MIN..MAX_DIST from (cx, cy), at least minFromPlayer from
// the player and out of the camera's sight, preferring spots behind or
// beside the player when they're driving - or ahead along their route when
// they are outrunning every unit.
// Waar de eenheden komen en hoe de wegblokkade staat is te herhalen: een eigen zaadje per wereld
// (world.policeSeed, anders vast), zodat de achtervolgingssimulatie dezelfde politie krijgt.
export function policeRng(world) {
  if (!world._policeRng) world._policeRng = mulberry32(world.policeSeed ?? 0x5eed1);
  return world._policeRng;
}

function findSpawnPoint(world, cx, cy, minFromPlayer = SPAWN_MIN_DIST, ahead = false) {
  const map = world.map, p = hoofdspeler(world);
  const pv = p.inVehicle;
  const heading = pv ? (pv.speed >= 0 ? pv.angle : pv.angle + Math.PI) : null;
  for (let attempt = 0; attempt < 10; attempt++) {
    const rnd = policeRng(world);
    let ang = rnd() * Math.PI * 2;
    if (heading !== null && ahead && attempt < 7) ang = heading + (rnd() - 0.5) * 1.6;
    else if (heading !== null && Math.abs(pv.speed) > 6 && attempt < 6) ang = heading + Math.PI / 2 + rnd() * Math.PI;
    const d = SPAWN_MIN_DIST + rnd() * (SPAWN_MAX_DIST - SPAWN_MIN_DIST);
    const qx = cx + Math.cos(ang) * d, qy = cy + Math.sin(ang) * d;
    const rp = map.nearestRoadPoint(qx, qy, 40, true) || countryRoadPoint(qx, qy, 70);
    if (!rp || rp.road.bridge) continue;
    const dp = Math.hypot(rp.x - p.x, rp.y - p.y);
    if (dp < minFromPlayer || dp > SPAWN_MAX_DIST + 20) continue;
    if (!spawnSpotHidden(world, rp.x, rp.y, 0, 0) || !vehicleClearance(world, rp.x, rp.y, 8)) continue;
    return rp;
  }
  return null;
}

function spawnPoliceVehicleAt(world, rp, opts = {}) {
  const v = spawnVehicleOnRoad(world.map, rp.road, !opts.motor, policeRng(world), false, false, { x: rp.x, y: rp.y }, !!opts.motor);
  if (!spawnSpotHidden(world, v.x, v.y, v.angle, v.halfLen || 2.2)) return null;
  if (solidAt(world.map, v.x, v.y)) return null;
  const m = world.map;
  if (m.homeGarageAt && m.homeGarageAt(v.x, v.y, 2)) return null; // not in the private garage
  // a country road point's stand-in road is no part of the street graph;
  // the unit faces the player's way, in its own lane
  if (rp.road.country) {
    v.road = null;
    const p = hoofdspeler(world);
    if (Math.cos(v.angle) * (p.x - v.x) + Math.sin(v.angle) * (p.y - v.y) < 0 && !rp.road.oneway) {
      v.angle += Math.PI;
      v.x = 2 * rp.x - v.x;
      v.y = 2 * rp.y - v.y;
    }
  }
  return v;
}

function isPatrolCar(v) {
  return v.isPolice && !v.hijacked && !v.wrecked && !v._roadblock && !v._motor && !v._mount && !v._commandeered && !v.isBoat;
}

function trySpawnPolice(world, state) {
  const p = hoofdspeler(world), pv = p.inVehicle, pol = world.police;
  let alive = 0, nearest = Infinity;
  for (const v of world.vehicles) {
    if (!v.isPolice || v.hijacked || v.wrecked || v.disabled || v.isBoat) continue;
    nearest = Math.min(nearest, Math.hypot(v.x - p.x, v.y - p.y));
    if (isPatrolCar(v)) alive++;
  }
  state.outrun = !!pv && !pv.isBoat && Math.abs(pv.speed) > OUTRUN_SPEED && !(pol && pol.searching) && nearest > OUTRUN_CLEAR_DIST;
  const target = policeTarget(world.wanted);
  if (alive >= target || world.time < state.nextSpawnAt) return;
  state.nextSpawnAt = world.time + 0.5;
  const c = pol && pol.searching && pol.searchCenter ? pol.searchCenter : p;
  const rp = findSpawnPoint(world, c.x, c.y, pol && pol.searching ? SEARCH_SPAWN_MIN_DIST : SPAWN_MIN_DIST, state.outrun);
  if (!rp) return;
  const v = spawnPoliceVehicleAt(world, rp);
  if (!v) return;
  v._interceptor = isInterceptorSlot(world.wanted, alive);
  tunePoliceCar(v, world);
  world.vehicles.push(v);
  state.nextSpawnAt = world.time + SPAWN_STAGGER;
}

// The police model object is per car/mount (spawnVehicleOnRoad and
// policemounts build a fresh one), so it can follow the wanted level and the
// rubber band. A commandeered car keeps its shared civilian model untouched.
function tunePoliceCar(v, world, d = 0, sees = true) {
  if (v._motor || v.isBoat || v._commandeered) return;
  const k = sees ? 0 : clamp((d - RUBBER_BAND_NEAR) / (RUBBER_BAND_FULL - RUBBER_BAND_NEAR), 0, 1);
  if (v._mount) {
    v.model.maxSpeed = v._baseTop * (1 + (MOUNT_RUBBER_BAND - 1) * k);
    return;
  }
  if (v.model.name !== 'police') return;
  v.armor = policeArmor(world.wanted); // #436: op vijf sterren houdt een politicauto meer klappen
  const w = clamp(world.wanted, 0, 5);
  const base = POLICE_TOP_SPEED[w];
  const pv = hoofdspeler(world).inVehicle;
  const want = clamp((pv ? Math.abs(pv.speed) : 0) * RUBBER_BAND_MATCH, base * RUBBER_BAND_MIN, base * RUBBER_BAND_MAX);
  v.model.maxSpeed = (base + (want - base) * k) * (v._interceptor ? INTERCEPTOR.boost : 1);
  v.model.accel = POLICE_ACCEL[w] * (1 + RUBBER_BAND_ACCEL * k) * (v._interceptor ? INTERCEPTOR.boost : 1);
}

function despawnFarPolice(world, state) {
  const p = hoofdspeler(world);
  const { x: px, y: py } = p;
  const pv = p.inVehicle;
  const recycle = state.outrun && world.time >= state.nextRecycleAt;
  if (recycle) state.nextRecycleAt = world.time + 1;
  const hx = pv ? Math.cos(pv.angle) * Math.sign(pv.speed || 1) : 0, hy = pv ? Math.sin(pv.angle) * Math.sign(pv.speed || 1) : 0;
  for (let i = world.vehicles.length - 1; i >= 0; i--) {
    const v = world.vehicles[i];
    if (!v.isPolice || v.driver === 'player') continue;
    const d = Math.hypot(v.x - px, v.y - py);
    if (v._crew && d < DESPAWN_DIST) continue;
    // hopelessly behind a player who is outrunning everyone: free the slot
    // so a fresh unit can come in ahead
    const behind = recycle && isPatrolCar(v) && d > RECYCLE_DIST && !v._sees &&
      (v.x - px) * hx + (v.y - py) * hy < 0 && isSpawnHidden(world, v.x, v.y);
    if (behind || (!v.wrecked && ((v.deadEndBounces || 0) > 2 || ((v.stuckFor || 0) > 25 && d > 40))) || d > DESPAWN_DIST) world.vehicles.splice(i, 1);
  }
}

function hasLineOfSight(map, ax, ay, bx, by) {
  const d = Math.hypot(bx - ax, by - ay);
  const steps = Math.ceil(d / 3);
  for (let k = 1; k < steps; k++) {
    const x = ax + (bx - ax) * k / steps, y = ay + (by - ay) * k / steps;
    for (const b of map.buildingsNear(x, y, 0.5)) {
      const [minx, miny, maxx, maxy] = b.bounds;
      if (x < minx || x > maxx || y < miny || y > maxy) continue;
      if (pointInPolygon(x, y, b.pts)) return false;
    }
  }
  return true;
}

function randomPointInSearch(pol) {
  const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * pol.searchRadius;
  return { x: pol.searchCenter.x + Math.cos(a) * r, y: pol.searchCenter.y + Math.sin(a) * r };
}

// Far away or around a corner the car drives the road network toward the
// player; with a clear line of sight close by it goes straight for them.
// While searching it patrols random points inside the search circle instead.
function updateChase(v, dt, world) {
  const p = hoofdspeler(world);
  const pv = p.inVehicle;
  const pol = world.police;
  const d = Math.hypot(p.x - v.x, p.y - v.y);
  v._losTimer = (v._losTimer || 0) - dt;
  if (v._losTimer <= 0) {
    v._losTimer = 0.25;
    v._sees = d < SEE_RANGE_CAR && (aloftInSight(world) || hasLineOfSight(world.map, v.x, v.y, p.x, p.y));
    // out in the fields the last stretch from the road nearest the player is
    // across the grass (countryFollow sets _fieldRun at the end of its way)
    if (v._fieldRun && (d > FIELD_RUN_DIST || pol.searching || !dryLine(world.map, v.x, v.y, p.x, p.y))) v._fieldRun = false;
    v._direct = (d < DIRECT_CHASE_DIST && v._sees || !!v._fieldRun) && !pol.searching;
    // never straight into a canal or a maar out there
    if (v._direct && !v._fieldRun && roadNetReady() && edgeDistance(v.x, v.y) > 0 && !dryLine(world.map, v.x, v.y, p.x, p.y)) v._direct = false;
  }
  tunePoliceCar(v, world, d, v._sees);
  let goal = p;
  if (pol.searching) {
    if (!v._searchGoal || Math.hypot(v._searchGoal.x - v.x, v._searchGoal.y - v.y) < 12 || world.time > (v._searchGoalUntil || 0)) {
      v._searchGoal = randomPointInSearch(pol);
      v._searchGoalUntil = world.time + 12;
    }
    goal = v._searchGoal;
  }
  let cruise = pursuitCruise(v, d, pv, pol.searching);
  if (!pv && !pol.searching && d < 25) cruise = Math.max(3, (d - FOOT_STOP_DIST) * 0.8);
  // out in the Ommeland (the player, or a unit without a city street) the
  // real roads lead there, like the streets do in town
  const country = !v._direct && roadNetReady() && (edgeDistance(goal.x, goal.y) > 30 || (!v.road && edgeDistance(v.x, v.y) > 0));
  if (country && countryFollow(v, dt, world, goal, cruise)) {
    v.road = null;
    v._wasDirect = false;
  } else if (!v._direct && v.road && !v._wasDirect) {
    updateTrafficAI(v, dt, world.map, world, Math.random, { goal, chase: true, cruise });
  } else if (!v._direct) {
    if (!attachToNearestRoad(v, world.map)) v._direct = true;
    v._wasDirect = false;
    updateTrafficAI(v, dt, world.map, world, Math.random, { goal, chase: true, cruise });
  } else {
    v._wasDirect = true;
    const tvx = pv ? Math.cos(pv.angle) * pv.speed : 0, tvy = pv ? Math.sin(pv.angle) * pv.speed : 0;
    const ps = Math.hypot(tvx, tvy);
    const ramming = updateRam(v, dt, world, pv, d, ps);
    let ax = p.x, ay = p.y, lead = pv ? 0.5 : 0;
    if (ramming) {
      const pfx = Math.cos(pv.angle), pfy = Math.sin(pv.angle);
      const side = (v.y - p.y) * pfx - (v.x - p.x) * pfy >= 0 ? 1 : -1;
      const back = pv.halfLen * 0.7, off = pv.halfWid * 0.8;
      ax = p.x - pfx * back - pfy * off * side;
      ay = p.y - pfy * back + pfx * off * side;
      lead = clamp(d / Math.max(4, v.speed - ps + 4), 0.2, 1.2);
    }
    const dx = ax + tvx * lead - v.x, dy = ay + tvy * lead - v.y;
    const fx = Math.cos(v.angle), fy = Math.sin(v.angle);
    const fwd = dx * fx + dy * fy, lat = dy * fx - dx * fy;
    const alpha = Math.atan2(lat, fwd);
    const curv = 2 * lat / Math.max(1, dx * dx + dy * dy);
    const steer = Math.abs(alpha) > Math.PI / 2 ? Math.sign(alpha) : clamp(curv / maxCurvature(v), -1, 1);
    // close in gently (a few m/s over the player's speed) unless committed to
    // a ram; a player on foot gets a unit that stops short and lets its
    // officers out instead of running them over
    let vTarget;
    if (ramming) vTarget = ps + v._ramBoost;
    else if (pv) vTarget = ps + clamp((d - 6) * 0.35, -4, 4);
    else vTarget = clamp((d - (v._mount || v._motor ? MOUNT_STOP_DIST : FOOT_STOP_DIST)) * 0.7, 0, 9);
    vTarget = Math.min(vTarget, Math.sqrt((ramming ? 8 : 5.5) / Math.max(1e-3, Math.abs(curv))));
    if (Math.abs(alpha) > 0.7) vTarget = Math.min(vTarget, 6);
    vTarget = Math.min(vTarget, v.model.maxSpeed);
    const err = vTarget - v.speed;
    const throttle = err > 0.25 ? clamp(err * 0.4, 0.15, 1) : 0;
    const brake = err < -0.5 ? clamp(-err * 0.3, 0.1, 1) : 0;
    v.applyControls(dt, throttle, steer, brake);
  }
  resolveVehicleBuildingCollision(v, world.map, dt);
}

// Road-following pursuit speed: close to top speed while catching up, only
// a little over the player's own speed once on their tail, patrol pace
// while searching. Corner braking stays with the traffic AI.
function pursuitCruise(v, d, pv, searching) {
  const top = v.model.maxSpeed;
  if (searching) return top * 0.55;
  if (d > 70) return top * (d > 110 ? 0.95 : 0.88);
  const ps = pv ? Math.abs(pv.speed) : 7;
  return clamp(ps + 2 + d * 0.06, 10, top * 0.92);
}

function updateRam(v, dt, world, pv, d, ps) {
  if (!pv || pv.isBoat || (pv.isHeli && !pv.onGround) || v._mount || v._motor) return false;
  const t = world.time;
  if (v._ramUntil) {
    if (t < v._ramUntil && d < RAM_ABORT_DIST && bodyGap(v, pv) > RAM_CONTACT_GAP) return true;
    v._ramUntil = 0;
    v._ramCd = t + RAM_COOLDOWN_MIN + Math.random() * (RAM_COOLDOWN_MAX - RAM_COOLDOWN_MIN);
    return false;
  }
  if (v._ramCd === undefined) v._ramCd = t + 1 + Math.random() * 3;
  if (t < v._ramCd || d > RAM_START_DIST || d < RAM_MIN_DIST || ps < 3) return false;
  const pfx = Math.cos(pv.angle) * Math.sign(pv.speed), pfy = Math.sin(pv.angle) * Math.sign(pv.speed);
  const p = hoofdspeler(world);
  if ((v.x - p.x) * pfx + (v.y - p.y) * pfy > 2) return false;
  const light = pv.isBike || pv.isScooter;
  const rate = (light ? RAM_RATE_LIGHT : RAM_RATE) * (world.wanted >= 2 ? 1 : 0.5);
  if (Math.random() > rate * dt) return false;
  v._ramUntil = t + RAM_MAX_TIME;
  v._ramBoost = light ? RAM_BOOST_LIGHT : RAM_BOOST + Math.random() * 2;
  return true;
}

// Patrol cars shoot from three stars (owner's decision, #43); cartoon shots, no one
// is shown hit, damage is small and a bust still ends it.
const FIRE_WANTED = 3;
// De agent schiet door het raam aan zijn kant, niet vanuit de voorbumper (#502):
// de loop zit op raamhoogte, een halve auto breed naar de chauffeurskant (links
// van de rijrichting) en een stukje naar voren. De kogelhoogte telt op bij de
// auto zelf (v.z): anders vliegt een schot op een brug of viaduct op 1,25 m
// hoogte onder de auto van de speler door en raakt het de inzittende.
const SHOT_SPEED = 42;
const SHOT_WINDOW = 1.12;
const SHOT_SIDE = 0.62;
const SHOT_FORWARD = 0.35;

// De kogel van een agent, vanaf het raam op de speler gericht. Apart en
// uitgevoerd, zodat de test dezelfde baan kan naspelen als het spel.
export function policeShot(v, world) {
  const p = hoofdspeler(world);
  if (!p) return null;
  const fx = Math.cos(v.angle), fy = Math.sin(v.angle);
  // chauffeurskant = links van de rijrichting (rechts rijden): (+sin, -cos)
  const mx = v.x + fx * SHOT_FORWARD + fy * SHOT_SIDE;
  const my = v.y + fy * SHOT_FORWARD - fx * SHOT_SIDE;
  const dx = p.x - mx, dy = p.y - my;
  const d = Math.hypot(dx, dy);
  if (!(d > 1e-3)) return null;
  return {
    x: mx, y: my, z: (v.z || 0) + SHOT_WINDOW,
    vx: dx / d * SHOT_SPEED, vy: dy / d * SHOT_SPEED,
    damage: 7, owner: 'police', range: FIRE_RANGE + 4, traveled: 0,
  };
}

function maybeFire(v, dt, world) {
  if (v._fireCd === undefined) v._fireCd = 1 + Math.random();
  v._fireCd -= dt;
  if (v._fireCd > 0) return;
  const p = hoofdspeler(world);
  const d = Math.hypot(p.x - v.x, p.y - v.y);
  if (d > FIRE_RANGE || d < 1) return;
  v._fireCd = 1.4 + Math.random() * 1.2;
  const shot = policeShot(v, world);
  if (shot) world.bullets.push(shot);
}

// Arrest state lives on world.police.bust (0..1 progress) so the HUD or
// audio can pick it up.
function updateBust(dt, world) {
  const pol = world.police;
  const p = hoofdspeler(world);
  const bust = pol.bust || (pol.bust = { t: 0, progress: 0, mode: null, warned: false });
  let mode = null;
  if (world.wanted > 0 && !world.pendingRespawn && !isKnockedDown(p, world)) {
    const pv = p.inVehicle;
    if (!pv) {
      if (Math.hypot(p.vx || 0, p.vy || 0) < FOOT_BUST_MAX_SPEED && !p.water && copPedWithin(world, FOOT_BUST_RANGE)) mode = 'foot';
    } else if (!pv.isBoat && !(pv.isHeli && !pv.onGround) && Math.abs(pv.speed) < CAR_BUST_MAX_SPEED && (policeCarBeside(world, pv) || copPedWithin(world, pv.halfWid + CAR_BUST_COP_RANGE))) {
      mode = 'car';
    }
  }
  if (!mode) {
    bust.t = Math.max(0, bust.t - dt * 2);
    if (bust.t === 0) { bust.mode = null; bust.warned = false; }
  } else {
    if (bust.mode !== mode) bust.t = 0;
    bust.mode = mode;
    bust.t += dt;
  }
  const need = bust.mode === 'car' ? CAR_BUST_TIME : FOOT_BUST_TIME;
  bust.progress = bust.mode ? Math.min(1, bust.t / need) : 0;
  if (bust.mode === 'car' && !bust.warned && bust.t > 0.6) {
    bust.warned = true;
    world.addMessage('Je bent klemgereden, wegwezen!', 2);
  }
  if (bust.mode && bust.t >= need) {
    bust.t = 0;
    bust.progress = 0;
    bust.mode = null;
    // samen spelen (#434): is het doelwit een gast, dan wordt hij gepakt (coopnet.js) en niet de host
    if (p.coopSlot != null && world.coopGepakt) world.coopGepakt(p.coopSlot, world.wanted);
    else requestRespawn(world, { busted: true, moneyPenalty: bustFineIn(world.wanted, world.money, p.inVehicle) });
  }
}

function copPedWithin(world, r) {
  const p = hoofdspeler(world);
  for (const c of world.pedestrians) {
    if (!c.isCop || c.state === 'dead' || c.ragdoll) continue;
    if (Math.abs(c.x - p.x) < r + 0.5 && Math.abs(c.y - p.y) < r + 0.5 && Math.hypot(c.x - p.x, c.y - p.y) < r + (c.radius || 0.35)) return true;
  }
  return false;
}

// A stopped police car whose body is within a couple of metres of the
// player's car (side-by-side, nose to door, bumper to bumper).
function policeCarBeside(world, pv) {
  for (const v of world.vehicles) {
    if (!v.isPolice || v._mount || v === pv || v.isBoat || v.wrecked || v.disabled || v.hijacked || v.driver === 'player' || Math.abs(v.speed) > 3) continue;
    const reach = pv.halfLen + v.halfLen + CAR_BUST_CAR_GAP;
    if (Math.abs(v.x - pv.x) > reach || Math.abs(v.y - pv.y) > reach) continue;
    if (bodyGap(pv, v) < CAR_BUST_CAR_GAP) return true;
  }
  return false;
}

function bodyGap(a, b) {
  const ha = Math.max(0, a.halfLen - a.halfWid), hb = Math.max(0, b.halfLen - b.halfWid);
  const ax = Math.cos(a.angle) * ha, ay = Math.sin(a.angle) * ha;
  const bx = Math.cos(b.angle) * hb, by = Math.sin(b.angle) * hb;
  let best = Infinity;
  for (const t of [-1, -0.5, 0, 0.5, 1]) {
    const cp = closestPointOnSegment(b.x + bx * t, b.y + by * t, a.x - ax, a.y - ay, a.x + ax, a.y + ay);
    best = Math.min(best, cp.dist2);
  }
  return Math.sqrt(best) - a.halfWid - b.halfWid;
}

// --- foot police --------------------------------------------------------
// Actual seek/bust behavior for a cop Pedestrian lives in pedestrians.js's
// updatePedestrians (mirrors the civilian flee-trigger pattern, inverted) -
// this module only decides how many should exist and where they come from,
// the same split it already has with spawnVehicleOnRoad for cars.

function trySpawnCopPeds(world, state) {
  if (world.wanted < COP_PED_WANTED_THRESHOLD || world.time < state.nextCopPedSpawnAt) return;
  const alive = world.pedestrians.filter((p) => p.isCop && p.state !== 'dead');
  const max = world.wanted >= MOTOR_WANTED ? COP_PED_TARGET_MAX_HIGH : COP_PED_TARGET_MAX;
  const target = Math.min(max, levelOf(world.wanted).copPeds);
  if (alive.length >= target) return;
  const pol = world.police;
  const p = hoofdspeler(world);
  const c = pol.searching ? randomPointInSearch(pol) : p;
  state.nextCopPedSpawnAt = world.time + 0.6;
  let cops = spawnCopPedestriansNear(world.map, c.x, c.y, 1, Math.random, true, COP_PED_MIN_DIST)
    .filter((cop) => Math.hypot(cop.x - p.x, cop.y - p.y) >= COP_PED_MIN_DIST);
  if (!cops.length) cops = countryCopPed(world, c);
  if (!cops.length) return;
  world.pedestrians.push(...cops);
  state.nextCopPedSpawnAt = world.time + COP_PED_SPAWN_STAGGER;
}

function despawnFarCopPeds(world) {
  const { x: px, y: py } = hoofdspeler(world);
  for (let i = world.pedestrians.length - 1; i >= 0; i--) {
    const p = world.pedestrians[i];
    if (!p.isCop || p.state === 'dead') continue;
    // officers out of a car walk back to it first (policemounts.updateCrews)
    if ((world.wanted === 0 && !p._unit) || Math.hypot(p.x - px, p.y - py) > COP_PED_DESPAWN_DIST) world.pedestrians.splice(i, 1);
  }
}

// --- police boats --------------------------------------------------------

function isPlayerNearWater(world) {
  const p = hoofdspeler(world);
  if (p.inVehicle && p.inVehicle.isBoat) return true;
  return waterNearby(world.map, p.x, p.y, WATER_PROXIMITY);
}

function trySpawnPoliceBoat(world, state) {
  if (world.wanted < BOAT_WANTED_THRESHOLD || world.time < state.nextBoatSpawnAt) return;
  if (!isPlayerNearWater(world)) return;
  const alive = world.vehicles.filter((v) => v.isBoat && v.isPolice && !v.hijacked && !v.wrecked);
  if (alive.length >= 1) return;
  const p = hoofdspeler(world);
  const polys = world.map.waterNear(p.x, p.y, BOAT_SPAWN_MAX_DIST);
  if (!polys.length) { state.nextBoatSpawnAt = world.time + BOAT_SPAWN_STAGGER; return; }
  const poly = polys[Math.floor(Math.random() * polys.length)];
  state.nextBoatSpawnAt = world.time + BOAT_SPAWN_STAGGER;
  const boat = spawnPoliceBoatOnWater(world.map, poly, Math.random, { near: [p.x, p.y], min: BOAT_SPAWN_MIN_DIST, max: BOAT_SPAWN_MAX_DIST, budget: 3 });
  if (!boat) { state.nextBoatSpawnAt = world.time + 0.5; return; }
  const d = Math.hypot(boat.x - p.x, boat.y - p.y);
  if (d < BOAT_SPAWN_MIN_DIST || !spawnSpotHidden(world, boat.x, boat.y, boat.angle, 2)) { state.nextBoatSpawnAt = world.time + 0.5; return; }
  world.vehicles.push(boat);
}

function despawnFarPoliceBoats(world) {
  const { x: px, y: py } = hoofdspeler(world);
  for (let i = world.vehicles.length - 1; i >= 0; i--) {
    const v = world.vehicles[i];
    if (!v.isBoat || !v.isPolice || v.driver === 'player') continue;
    if (v.wrecked || world.wanted === 0 || Math.hypot(v.x - px, v.y - py) > BOAT_DESPAWN_DIST) world.vehicles.splice(i, 1);
  }
}

// --- police helicopter -----------------------------------------------------
// world.policeHeli is a plain {x,y,z,angle,spotX,spotY,spotOn} - z is altitude.
// While the player is seen it orbits them; during a search it sweeps the
// search circle and only spots the player inside its searchlight footprint.

function updatePoliceHeli(dt, world) {
  const p = hoofdspeler(world);
  const active = world.wanted >= HELI_WANTED_THRESHOLD;
  if (active && !world.policeHeli) {
    const view = world.pedView;
    const back = view ? Math.atan2(view.camY - p.y, view.camX - p.x) : Math.random() * Math.PI * 2;
    const a = back + (Math.random() - 0.5) * 1.2;
    world.policeHeli = {
      x: p.x + Math.cos(a) * HELI_SPAWN_DIST, y: p.y + Math.sin(a) * HELI_SPAWN_DIST, z: HELI_ALTITUDE,
      angle: 0, orbitAngle: Math.random() * Math.PI * 2,
      spotX: p.x, spotY: p.y, spotOn: false, sweep: 0,
    };
  } else if (!active && world.policeHeli) {
    world.policeHeli = null;
  }
  heliRender.heli = world.policeHeli;
  if (!world.policeHeli) return;

  const heli = world.policeHeli;
  const pol = world.police;
  const center = pol.searching && pol.searchCenter ? pol.searchCenter : p;
  heli.orbitAngle += HELI_ORBIT_SPEED * dt;
  // the player flying their own heli: a wider orbit above them, and a little faster
  const air = playerAloft(world);
  const orbit = pol.searching ? Math.min(pol.searchRadius * 0.6, 40) : air ? HELI_ORBIT_RADIUS * 1.6 : HELI_ORBIT_RADIUS;
  const targetX = center.x + Math.cos(heli.orbitAngle) * orbit;
  const targetY = center.y + Math.sin(heli.orbitAngle) * orbit;
  const t = Math.min(1, dt * HELI_FOLLOW_LERP);
  let mx = (targetX - heli.x) * t, my = (targetY - heli.y) * t;
  const m = Math.hypot(mx, my), maxStep = (air ? HELI_MAX_SPEED * 1.3 : HELI_MAX_SPEED) * dt;
  if (m > maxStep) { mx *= maxStep / m; my *= maxStep / m; }
  heli.x += mx;
  heli.y += my;
  const alt = air ? Math.max(HELI_ALTITUDE, air.z + 14) : HELI_ALTITUDE;
  heli.z += (alt - heli.z) * Math.min(1, dt * 0.8);
  heli.angle = Math.atan2(targetY - heli.y, targetX - heli.x);

  let sx, sy;
  if (pol.seenRecently) {
    sx = p.x; sy = p.y;
  } else {
    heli.sweep += dt * 0.7;
    const r = pol.searchRadius * (0.35 + 0.3 * Math.sin(heli.sweep * 0.6));
    sx = center.x + Math.cos(heli.sweep) * r;
    sy = center.y + Math.sin(heli.sweep) * r;
  }
  const dx = sx - heli.spotX, dy = sy - heli.spotY, d = Math.hypot(dx, dy);
  const step = Math.min(d, HELI_SPOT_SPEED * dt);
  if (d > 0.01) { heli.spotX += dx / d * step; heli.spotY += dy / d * step; }
  heli.spotOn = (world.dayNight?.night ?? 0) > 0.3;
  heli.spotK = (heli.spotK || 0) + ((heli.spotOn ? 1 : 0) - (heli.spotK || 0)) * Math.min(1, dt * 2);
}

// --- line of sight / search ---------------------------------------------

function initPoliceContract(world) {
  if (!world.police) {
    world.police = {
      searching: false, searchCenter: null, searchRadius: 0,
      lastSeen: null, seenRecently: false, unseenFor: 0, roadblocks: [],
    };
  }
  return world.police;
}

function anyUnitSees(world) {
  const p = hoofdspeler(world);
  for (const v of world.vehicles) {
    if (!v.isPolice || v.hijacked || v.wrecked || v.disabled || v.driver === 'player' || v.isBoat) continue;
    if (v._sees && Math.hypot(v.x - p.x, v.y - p.y) < SEE_RANGE_CAR) return true;
  }
  for (const c of world.pedestrians) {
    if (!c.isCop || c.state === 'dead') continue;
    if (c._sees && Math.hypot(c.x - p.x, c.y - p.y) < SEE_RANGE_FOOT) return true;
  }
  for (const v of world.vehicles) {
    if (!v.isBoat || !v.isPolice || v.hijacked || v.wrecked) continue;
    if (Math.hypot(v.x - p.x, v.y - p.y) < 30) return true;
  }
  const h = world.policeHeli;
  if (h && Math.hypot(h.spotX - p.x, h.spotY - p.y) < HELI_SEE_RADIUS && !hiddenFromAbove(world.map, p.x, p.y)) return true;
  // a helicopter in the air is hard to miss for the one next to it
  if (h && playerAloft(world) && Math.hypot(h.x - p.x, h.y - p.y) < 140) return true;
  return false;
}

// Tree canopies and narrow alleys (walls close on two sides) hide the
// player from the helicopter.
function hiddenFromAbove(map, x, y) {
  for (const t of map.treesNear(x, y, 3)) if (Math.hypot(t[0] - x, t[1] - y) < 2.8) return true;
  let walls = 0;
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4;
    if (isInsideBuilding(map, x + Math.cos(a) * 3.5, y + Math.sin(a) * 3.5)) walls++;
  }
  return walls >= 3;
}

// Vehicles only refresh _sees inside updateChase; this keeps it fresh for
// patrols and parked roadblock cars too.
function refreshVehicleSight(world, dt) {
  const p = hoofdspeler(world);
  for (const v of world.vehicles) {
    if (!v.isPolice || v.hijacked || v.wrecked || v.disabled || v.driver === 'player' || v.isBoat) continue;
    if (v._chasing && !v._roadblock) continue;
    v._losTimer = (v._losTimer || 0) - dt;
    if (v._losTimer > 0) continue;
    v._losTimer = 0.3;
    const d = Math.hypot(p.x - v.x, p.y - v.y);
    v._sees = d < SEE_RANGE_CAR && (aloftInSight(world) || hasLineOfSight(world.map, v.x, v.y, p.x, p.y));
  }
}

function updateSearch(dt, world, state, escalated) {
  const pol = world.police;
  const p = hoofdspeler(world);
  if (world.wanted === 0) {
    pol.searching = false;
    pol.seenRecently = false;
    pol.searchCenter = null;
    pol.searchRadius = 0;
    pol.unseenFor = 0;
    world.wantedDecayTimer = 0;
    world.policeTip = null;
    world.wantedProfile = null;
    return;
  }
  const tip = world.policeTip;
  if (tip) {
    world.policeTip = null;
    pol.lastSeen = { x: tip.x, y: tip.y };
    pol.searching = true;
    pol.seenRecently = false;
    pol.unseenFor = levelOf(world.wanted).loseAfter;
    pol.searchCenter = { x: tip.x, y: tip.y };
    pol.searchRadius = levelOf(1).searchRadius;
    world.wantedDecayTimer = 0;
    state.seen = false;
    state.seeTimer = 1;
    return;
  }

  state.seeTimer -= dt;
  if (state.seeTimer <= 0) {
    state.seeTimer = 0.25;
    state.seen = anyUnitSees(world);
  }
  if (state.seen || escalated) {
    world.wantedProfile = profileOf(world);
    markSeen(pol, world, p.x, p.y);
    pol.hinted = false;
    return;
  }

  if (stepUnseen(pol, world, dt, p.x, p.y, decayFactor(world.wantedProfile, world))) world.addMessage('Je bent de politie kwijt', 3);
  const hint = pol.searching ? hintFor(world.wantedProfile, world, pol.hinted) : null;
  if (hint) { pol.hinted = true; world.addMessage(hint, 4); }
}

// --- roadblocks (3+ stars) -------------------------------------------------

function tryRoadblock(world, state) {
  const pol = world.police;
  const p = hoofdspeler(world);
  const pv = p.inVehicle;
  if (world.wanted < ROADBLOCK_WANTED || !pol.seenRecently || pol.searching) return;
  if (!pv || pv.isBoat || pv.isHeli || Math.abs(pv.speed) < 6 || world.time < state.nextRoadblockAt) return;
  if (world.vehicles.some((v) => v._roadblock)) return;
  state.nextRoadblockAt = world.time + 3;
  const heading = pv.speed >= 0 ? pv.angle : pv.angle + Math.PI;
  const ahead = 95 + Math.min(45, Math.abs(pv.speed) * 2.5);
  const tx = p.x + Math.cos(heading) * ahead, ty = p.y + Math.sin(heading) * ahead;
  const rp = world.map.nearestRoadPoint(tx, ty, 30, true) || countryRoadPoint(tx, ty, 30);
  if (!rp || Math.hypot(rp.x - p.x, rp.y - p.y) < 70) return;
  if (!spawnSpotHidden(world, rp.x, rp.y, 0, 0) || !spawnSpotHidden(world, rp.x, rp.y, heading, 5)) return;
  const road = rp.road;
  if (road.bridge) return;
  const pts = road.pts;
  let seg = 0, best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const cp = closestPointOnSegment(rp.x, rp.y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (cp.dist2 < best) { best = cp.dist2; seg = i; }
  }
  const segA = Math.atan2(pts[seg + 1][1] - pts[seg][1], pts[seg + 1][0] - pts[seg][0]);
  const nx = -Math.sin(segA), ny = Math.cos(segA);
  const fx = Math.cos(segA), fy = Math.sin(segA);
  const towardPlayer = (p.x - rp.x) * fx + (p.y - rp.y) * fy > 0 ? 1 : -1;
  // one car per ~4 m of carriageway, a fourth on the widest roads at 4+
  // stars and sometimes a staggered extra behind the line
  const width = road.width || 6.5;
  let n = clamp(Math.ceil((width - 0.5) / ROADBLOCK_CAR_SPACING), 2, 3);
  if (width >= ROADBLOCK_WIDE && world.wanted >= 4) n = 4;
  const spacing = n === 4 ? Math.max(3.6, (width - 1) / 3) : ROADBLOCK_CAR_SPACING;
  const slots = [];
  for (let i = 0; i < n; i++) slots.push({ off: (i - (n - 1) / 2) * spacing, back: 0 });
  const rnd = policeRng(world);
  if (world.wanted >= 4 && rnd() < ROADBLOCK_EXTRA_CHANCE) slots.push({ off: (rnd() - 0.5) * 2, back: 5.5 });
  const cars = [];
  let outer = 0;
  for (const { off, back } of slots) {
    const side = off > 0.01 ? 1 : off < -0.01 ? -1 : (rnd() < 0.5 ? 1 : -1);
    const v = spawnVehicleOnRoad(world.map, road, true, rnd, false, false, { x: rp.x, y: rp.y });
    v.x = rp.x + nx * off - fx * towardPlayer * back;
    v.y = rp.y + ny * off - fy * towardPlayer * back;
    v.angle = Math.atan2(ny * side, nx * side) + side * (back ? 0.6 : 0.35) * towardPlayer;
    v.speed = 0;
    v.road = null;
    v._roadblock = { until: world.time + levelOf(world.wanted).roadblockLife };
    const ex = Math.cos(v.angle) * v.halfLen, ey = Math.sin(v.angle) * v.halfLen;
    if (solidAt(world.map, v.x, v.y) || solidAt(world.map, v.x + ex, v.y + ey) || solidAt(world.map, v.x - ex, v.y - ey)) continue;
    if (!vehicleClearance(world, v.x, v.y, 2.5)) continue;
    cars.push(v);
    if (!back) outer = Math.max(outer, Math.abs(off));
  }
  if (cars.length < 2) return;
  world.vehicles.push(...cars);
  // from 4 stars a spike strip lies on the road in front of the block (a flat tyre, nothing worse)
  if (levelOf(world.wanted).spikes) dropSpikes(world.shards || (world.shards = createShards()), rp.x + fx * towardPlayer * 9, rp.y + fy * towardPlayer * 9, segA, world.time || 0);
  const cops = spawnCopPedestriansNear(world.map, rp.x, rp.y, 2, Math.random);
  cops.forEach((c, i) => {
    const side = i === 0 ? 1 : -1;
    const gx = rp.x - fx * towardPlayer * 3 + nx * side * (outer + 1.2);
    const gy = rp.y - fy * towardPlayer * 3 + ny * side * (outer + 1.2);
    if (!solidAt(world.map, gx, gy)) { c.x = gx; c.y = gy; }
    c.guard = { x: c.x, y: c.y, angle: Math.atan2(p.y - c.y, p.x - c.x) };
    c.state = 'guard';
    c._roadblock = true;
  });
  world.pedestrians.push(...cops);
  pol.roadblocks = [{ x: rp.x, y: rp.y }];
  state.nextRoadblockAt = world.time + levelOf(world.wanted).roadblockEvery;
}

function updateRoadblocks(world) {
  const p = hoofdspeler(world);
  let any = false;
  for (const v of world.vehicles) {
    if (!v._roadblock) continue;
    const d = Math.hypot(v.x - p.x, v.y - p.y);
    if (world.wanted === 0 || world.time > v._roadblock.until || v.wrecked || d < ROADBLOCK_WAKE_DIST) {
      v._roadblock = null;
      attachToNearestRoad(v, world.map);
      continue;
    }
    any = true;
    v.speed *= 0.9;
  }
  if (!any) world.police.roadblocks = [];
}

// --- police motors (4+ stars) ---------------------------------------------

function trySpawnMotor(world, state) {
  if (world.wanted < MOTOR_WANTED || world.time < state.nextMotorAt) return;
  const alive = world.vehicles.filter((v) => v._motor && !v.wrecked && !v.disabled && !v.hijacked);
  if (alive.length >= MOTOR_MAX) return;
  state.nextMotorAt = world.time + 3;
  const p = hoofdspeler(world);
  const rp = findSpawnPoint(world, p.x, p.y);
  if (!rp) return;
  const v = spawnPoliceVehicleAt(world, rp, { motor: true });
  if (!v) return;
  v.model = MOTOR_MODEL;
  v.isPolice = true;
  v._motor = true;
  world.vehicles.push(v);
}

// Devtools handle on the per-world scratch state (cooldowns, crews, outrun).
export function policeDebug(world) {
  return getState(world);
}

export function updatePolice(dt, world) {
  const state = getState(world);
  initPoliceContract(world);

  const escalated = world.wanted > state.prevWanted;
  refreshVehicleSight(world, dt);
  updateSearch(dt, world, state, escalated && !world.policeTip);
  state.prevWanted = world.wanted;

  trySpawnPolice(world, state);
  despawnFarPolice(world, state);
  trySpawnCopPeds(world, state);
  despawnFarCopPeds(world);
  trySpawnPoliceBoat(world, state);
  despawnFarPoliceBoats(world);
  trySpawnMotor(world, state);
  trySpawnMounts(world, state);
  tryRoadblock(world, state);
  updateRoadblocks(world);
  updatePoliceHeli(dt, world);
  updateCrews(dt, world, state);
  updateBust(dt, world);

  const chasing = world.wanted > 0;
  const seen = world.police.seenRecently;
  const vehicles = world.vehicles;
  for (let i = vehicles.length - 1; i >= 0; i--) {
    const v = vehicles[i];
    if (v._bolting) {
      if (v.driver === 'player') { v._bolting = false; v.isPolice = false; continue; }
      if (updateBolting(v, dt, world)) vehicles.splice(i, 1);
      continue;
    }
    if (v._mount && v.hijacked && !v._ejected) ejectMountRider(v, world, state);
    // boats chase via updateBoatAI; a stolen police car is just a car now
    if (!v.isPolice || v.hijacked || v.isBoat || v.wrecked || v.disabled || v.driver === 'player') continue;
    if (v._roadblock) continue;
    if (maybeBolt(v, world, state)) continue;
    if (v._thrownCop) adoptThrownRider(v, world, state);
    if (v._crew) { holdUnit(v, dt); continue; }

    if (chasing !== v._chasing) {
      if (!chasing) { attachToNearestRoad(v, world.map); v._direct = false; v._wasDirect = false; }
      v._chasing = chasing;
    }

    if (chasing) {
      updateChase(v, dt, world);
      if (tryDeployCrew(v, world, state)) continue;
      if (!v._mount && world.wanted >= FIRE_WANTED && seen && v._sees) maybeFire(v, dt, world);
    } else if (v._motor) {
      v._motor = false;
      v.isPolice = false;
    } else if (v._commandeered) {
      v._commandeered = false;
      v.isPolice = false;
    } else if (!v.road && !v._mount && roadNetReady() && edgeDistance(v.x, v.y) > 0) {
      countryPatrol(v, dt, world);
      resolveVehicleBuildingCollision(v, world.map, dt);
    } else {
      updateTrafficAI(v, dt, world.map, world, Math.random);
      resolveVehicleBuildingCollision(v, world.map, dt);
    }
  }
}

// --- the Ommeland ------------------------------------------------------------
// The country-road spawn, pursuit and patrol helpers live in police/ommeland.js.


// --- 3D mesh for the police helicopter --------------------------------
// Cheap primitives per the brief: a capsule fuselage + tail boom, and a
// spinning main rotor built from 2 thin crossed boxes (not a disc mesh) so
// it reads as spinning blades without a spin animation being mandatory.
// Local origin (0,0,0), nose toward local +X, matching every other 3D actor
// in the game (mesh.rotation.y = -angle at render time).

function heliMat(color) {
  return new THREE.MeshLambertMaterial({ color });
}

const HELI_BODY_MAT = heliMat(0x1c1c1c);
const HELI_STRIPE_MAT = heliMat(0x2255dd);
const HELI_ROTOR_MAT = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
const HELI_BEACON_MAT = new THREE.MeshBasicMaterial({ color: 0xdd2222 });
const HELI_GLASS_MAT = heliMat(0x2a3540);

export function buildPoliceHeliMesh3D() {
  const group = new THREE.Group();

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.6, 2.4, 4, 8), HELI_BODY_MAT);
  body.rotation.z = -Math.PI / 2;
  group.add(body);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), HELI_GLASS_MAT);
  nose.position.set(1.7, 0, 0);
  group.add(nose);

  for (const sz of [0.61, -0.61]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.24, 0.05), HELI_STRIPE_MAT);
    stripe.position.set(0, 0.1, sz);
    group.add(stripe);
  }

  const tailBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.05, 1.8, 6), HELI_BODY_MAT);
  tailBoom.rotation.z = Math.PI / 2;
  tailBoom.position.set(-1.8, 0.08, 0);
  group.add(tailBoom);

  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 0.04), HELI_ROTOR_MAT);
  tailRotor.position.set(-2.65, 0.08, 0);
  group.add(tailRotor);
  group.userData.tailRotor = tailRotor;

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.32, 6), HELI_BODY_MAT);
  mast.position.set(0, 0.94, 0);
  group.add(mast);

  const rotor = new THREE.Group();
  rotor.position.set(0, 1.1, 0);
  rotor.add(new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.04, 0.2), HELI_ROTOR_MAT));
  rotor.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 5.6), HELI_ROTOR_MAT));
  group.add(rotor);
  group.userData.rotor = rotor;

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), HELI_BEACON_MAT);
  beacon.position.set(0.3, 0.7, 0);
  group.add(beacon);

  const lensMat = new THREE.MeshBasicMaterial({ color: 0x9a9a9a });
  const searchlight = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.24, 8), lensMat);
  searchlight.rotation.z = Math.PI / 2;
  searchlight.position.set(1.1, -0.45, 0);
  group.add(searchlight);

  if (!SPOT_CONE.geo) { SPOT_CONE.geo = makeBeamGeometry(20); SPOT_CONE.mat = makeBeamMaterial(0xfff1c8); }
  const cone = new THREE.Mesh(SPOT_CONE.geo, SPOT_CONE.mat);
  cone.visible = false;
  cone.renderOrder = 5;
  cone.frustumCulled = false;
  group.add(cone);
  group.userData.spotCone = cone;
  group.userData.lensMat = lensMat;

  return group;
}

const SPOT_CONE = { geo: null, mat: null };
const _spotV = new THREE.Vector3();
const _spotO = new THREE.Vector3();
const _spotW = new THREE.Vector3();
const _down = new THREE.Vector3(0, -1, 0);

// Spins the main + tail rotor. Call once per frame after repositioning the
// mesh built above - purely cosmetic, safe to skip (blades just render
// static) if an integrator forgets to wire it in.
export function updatePoliceHeliMesh3D(mesh, time) {
  mesh.userData.rotor.rotation.y = time * HELI_ROTOR_SPEED;
  mesh.userData.tailRotor.rotation.x = time * HELI_ROTOR_SPEED * 1.6;
  const { spotCone: cone, lensMat } = mesh.userData;
  const heli = heliRender.heli;
  const reach = heli ? Math.hypot(heli.spotX - heli.x, heli.spotY - heli.y) : 0;
  const k = heli ? (heli.spotK || 0) * (1 - Math.min(1, Math.max(0, (reach - 55) / 55))) : 0;
  const on = !!(cone && k > 0.01);
  if (lensMat) lensMat.color.setScalar(0.6 + 2.4 * k);
  if (cone) cone.visible = on;
  if (!on) return;
  mesh.updateMatrixWorld(true);
  const origin = _spotO.set(1.1, -0.45, 0);
  const target = mesh.worldToLocal(_spotV.set(heli.spotX, 0.06, heli.spotY));
  const r = HELI_SEE_RADIUS * 0.75;
  const dir = target.clone().sub(origin);
  const len = dir.length();
  cone.position.copy(origin);
  cone.quaternion.setFromUnitVectors(_down, dir.normalize());
  cone.scale.set(r, len, r);
  cone.material.uniforms.uOpacity.value = 0.3 * k;
  mesh.localToWorld(_spotW.copy(origin));
  requestSearchlight(_spotW.x, _spotW.y, _spotW.z, heli.spotX, 0, heli.spotY, r, k, 1);
}
