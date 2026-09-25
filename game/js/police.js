import { clamp, closestPointOnSegment, pointInPolygon } from './util.js';
import { spawnVehicleOnRoad, updateTrafficAI, resolveVehicleBuildingCollision, spawnPoliceBoatOnWater, attachToNearestRoad, maxCurvature } from './vehicle.js';
import { requestRespawn } from './world.js';
import { spawnCopPedestriansNear, isInsideBuilding } from './pedestrians.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const DECAY_TIME = 14;
const LOSE_AFTER = 5;
const SEE_RANGE_CAR = 55;
const SEE_RANGE_FOOT = 32;
const HELI_SEE_RADIUS = 14;
const HELI_SPOT_SPEED = 7.5;
const SEARCH_SHRINK = 1.2;
const SEARCH_MIN_RADIUS = 25;

const ROADBLOCK_WANTED = 3;
const ROADBLOCK_COOLDOWN = 22;
const ROADBLOCK_LIFETIME = 45;
const ROADBLOCK_WAKE_DIST = 14;

const MOTOR_WANTED = 4;
const MOTOR_MAX = 2;
const MOTOR_MODEL = { name: 'scooter', len: 1.3, wid: 0.45, maxSpeed: 17, accel: 7, brake: 9, turnRate: 5, color: '#eceae4', rider: '#1c3fae' };
const DESPAWN_DIST = 260;
const SPAWN_STAGGER = 1.4;
const FIRE_RANGE = 28;
const BUST_FAST_SPEED = 9;
const DIRECT_CHASE_DIST = 30;

// "Politie ook te voet" - a small pool of cop Pedestrians (see
// spawnCopPedestriansNear in pedestrians.js), grown only once there's
// something to respond to.
const COP_PED_WANTED_THRESHOLD = 1;
const COP_PED_TARGET_PER_WANTED = 1;
const COP_PED_TARGET_MAX = 4;
const COP_PED_TARGET_MAX_HIGH = 7;
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

// "Politie per heli" - a single always-circling unit at high wanted, no
// collision, purely a lerp-follow overhead presence (see updatePoliceHeli).
const HELI_WANTED_THRESHOLD = 4;
const HELI_ALTITUDE = 30;
const HELI_ORBIT_RADIUS = 22;
const HELI_ORBIT_SPEED = 0.6;
const HELI_FOLLOW_LERP = 1.1;
const HELI_ROTOR_SPEED = 22;

// Per-world scratch state that doesn't belong on the shared World contract
// (spawn cooldowns, previous-wanted tracking for the decay timer).
const policeState = new WeakMap();
const heliRender = { heli: null };
function getState(world) {
  let s = policeState.get(world);
  if (!s) {
    s = { prevWanted: world.wanted, nextSpawnAt: 0, nextCopPedSpawnAt: 0, nextBoatSpawnAt: 0, nextRoadblockAt: 0, nextMotorAt: 0, seeTimer: 0 };
    policeState.set(world, s);
  }
  return s;
}

// 60-120m out is far enough to be off-screen in both the 3D follow-cam
// (140m draw distance, but a chase-cam's forward FOV covers a small slice
// of that radius) and the minimap, without needing a camera/viewport
// dependency here at all.
function findSpawnRoad(map, px, py) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const ang = Math.random() * Math.PI * 2;
    const d = 60 + Math.random() * 60;
    const x = px + Math.cos(ang) * d;
    const y = py + Math.sin(ang) * d;
    const rp = map.nearestRoadPoint(x, y, 200, true);
    if (rp) return rp.road;
  }
  return null;
}

function trySpawnPolice(world, state) {
  const alive = world.vehicles.filter((v) => v.isPolice && !v.hijacked && !v.wrecked && !v._roadblock && !v._motor && !v.isBoat);
  const target = world.wanted === 0 ? 1 : Math.min(8, world.wanted + 1);
  if (alive.length >= target || world.time < state.nextSpawnAt) return;
  const pol = world.police;
  const c = pol && pol.searching && pol.searchCenter ? pol.searchCenter : world.player;
  const road = findSpawnRoad(world.map, c.x, c.y);
  if (!road) return;
  const v = spawnVehicleOnRoad(world.map, road, true, Math.random);
  if (pol && pol.searching && Math.hypot(v.x - world.player.x, v.y - world.player.y) < 70) return;
  world.vehicles.push(v);
  state.nextSpawnAt = world.time + SPAWN_STAGGER;
}

function despawnFarPolice(world) {
  const { x: px, y: py } = world.player;
  for (let i = world.vehicles.length - 1; i >= 0; i--) {
    const v = world.vehicles[i];
    if (!v.isPolice || v.driver === 'player') continue;
    const d = Math.hypot(v.x - px, v.y - py);
    if ((v.wrecked && !v.sinking) || (v.deadEndBounces || 0) > 2 || ((v.stuckFor || 0) > 25 && d > 40) || d > DESPAWN_DIST) world.vehicles.splice(i, 1);
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
  const p = world.player;
  const pv = p.inVehicle;
  const pol = world.police;
  const d = Math.hypot(p.x - v.x, p.y - v.y);
  v._losTimer = (v._losTimer || 0) - dt;
  if (v._losTimer <= 0) {
    v._losTimer = 0.25;
    v._sees = d < SEE_RANGE_CAR && hasLineOfSight(world.map, v.x, v.y, p.x, p.y);
    v._direct = d < DIRECT_CHASE_DIST && v._sees && !pol.searching;
  }
  let goal = p;
  if (pol.searching) {
    if (!v._searchGoal || Math.hypot(v._searchGoal.x - v.x, v._searchGoal.y - v.y) < 12 || world.time > (v._searchGoalUntil || 0)) {
      v._searchGoal = randomPointInSearch(pol);
      v._searchGoalUntil = world.time + 12;
    }
    goal = v._searchGoal;
  }
  if (!v._direct && v.road && !v._wasDirect) {
    updateTrafficAI(v, dt, world.map, world, Math.random, { goal, chase: true });
  } else if (!v._direct) {
    if (!attachToNearestRoad(v, world.map)) v._direct = true;
    v._wasDirect = false;
    updateTrafficAI(v, dt, world.map, world, Math.random, { goal, chase: true });
  } else {
    v._wasDirect = true;
    const lead = pv ? 0.5 : 0;
    const tvx = pv ? Math.cos(pv.angle) * pv.speed : 0, tvy = pv ? Math.sin(pv.angle) * pv.speed : 0;
    const dx = p.x + tvx * lead - v.x, dy = p.y + tvy * lead - v.y;
    const fx = Math.cos(v.angle), fy = Math.sin(v.angle);
    const fwd = dx * fx + dy * fy, lat = dy * fx - dx * fy;
    const alpha = Math.atan2(lat, fwd);
    const steer = Math.abs(alpha) > Math.PI / 2 ? Math.sign(alpha) : clamp(2 * lat / Math.max(1, dx * dx + dy * dy) / maxCurvature(v), -1, 1);
    let vTarget = pv ? Math.hypot(tvx, tvy) + clamp(d - 4, -4, 20) * 0.8 : clamp((d - 2) * 1.2, 0, 12);
    if (Math.abs(alpha) > 0.7) vTarget = Math.min(vTarget, 7);
    vTarget = Math.min(vTarget, v.model.maxSpeed);
    const err = vTarget - v.speed;
    const throttle = err > 0.25 ? clamp(err * 0.6, 0.2, 1) : 0;
    const brake = err < -0.5 ? clamp(-err * 0.35, 0.1, 1) : 0;
    v.applyControls(dt, throttle, steer, brake);
  }
  resolveVehicleBuildingCollision(v, world.map, dt);
}

function maybeFire(v, dt, world) {
  if (v._fireCd === undefined) v._fireCd = 1 + Math.random();
  v._fireCd -= dt;
  if (v._fireCd > 0) return;
  const p = world.player;
  const dx = p.x - v.x, dy = p.y - v.y;
  const d = Math.hypot(dx, dy);
  if (d > FIRE_RANGE || d < 1) return;
  v._fireCd = 1.4 + Math.random() * 1.2;
  const speed = 42;
  world.bullets.push({
    x: v.x, y: v.y, vx: dx / d * speed, vy: dy / d * speed,
    damage: 7, owner: 'police', range: FIRE_RANGE + 4, traveled: 0,
  });
}

function checkBusted(v, world) {
  const p = world.player;
  if (p.inVehicle && Math.abs(p.inVehicle.speed) > BUST_FAST_SPEED) return;
  let dist = Math.hypot(v.x - p.x, v.y - p.y);
  let contact = v.halfWid + (p.radius || 0.35) + 0.15;
  if (!p.inVehicle) {
    // on foot the player is solid against cars, so measure to the body
    const h = Math.max(0, v.halfLen - v.halfWid), fx = Math.cos(v.angle) * h, fy = Math.sin(v.angle) * h;
    dist = Math.sqrt(closestPointOnSegment(p.x, p.y, v.x - fx, v.y - fy, v.x + fx, v.y + fy).dist2);
    contact = v.halfWid + (p.radius || 0.35) + 0.4;
  }
  if (dist <= contact) {
    requestRespawn(world, { busted: true, moneyPenalty: world.wanted * 150 });
  }
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
  const target = Math.min(max, Math.ceil(world.wanted * COP_PED_TARGET_PER_WANTED * (world.wanted >= MOTOR_WANTED ? 1.5 : 1)));
  if (alive.length >= target) return;
  const pol = world.police;
  const c = pol.searching ? randomPointInSearch(pol) : world.player;
  world.pedestrians.push(...spawnCopPedestriansNear(world.map, c.x, c.y, 1, Math.random));
  state.nextCopPedSpawnAt = world.time + COP_PED_SPAWN_STAGGER;
}

function despawnFarCopPeds(world) {
  const { x: px, y: py } = world.player;
  for (let i = world.pedestrians.length - 1; i >= 0; i--) {
    const p = world.pedestrians[i];
    if (!p.isCop || p.state === 'dead') continue;
    if (world.wanted === 0 || Math.hypot(p.x - px, p.y - py) > COP_PED_DESPAWN_DIST) world.pedestrians.splice(i, 1);
  }
}

// --- police boats --------------------------------------------------------

function isPlayerNearWater(world) {
  const p = world.player;
  if (p.inVehicle && p.inVehicle.isBoat) return true;
  return world.map.waterNear(p.x, p.y, WATER_PROXIMITY).length > 0;
}

function trySpawnPoliceBoat(world, state) {
  if (world.wanted < BOAT_WANTED_THRESHOLD || world.time < state.nextBoatSpawnAt) return;
  if (!isPlayerNearWater(world)) return;
  const alive = world.vehicles.filter((v) => v.isBoat && v.isPolice && !v.hijacked && !v.wrecked);
  if (alive.length >= 1) return;
  const polys = world.map.waterNear(world.player.x, world.player.y, BOAT_SPAWN_MAX_DIST);
  if (!polys.length) return;
  const poly = polys[Math.floor(Math.random() * polys.length)];
  state.nextBoatSpawnAt = world.time + BOAT_SPAWN_STAGGER;
  const boat = spawnPoliceBoatOnWater(world.map, poly, Math.random);
  if (boat) world.vehicles.push(boat);
}

function despawnFarPoliceBoats(world) {
  const { x: px, y: py } = world.player;
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
  const active = world.wanted >= HELI_WANTED_THRESHOLD;
  if (active && !world.policeHeli) {
    world.policeHeli = {
      x: world.player.x + 60, y: world.player.y + 60, z: HELI_ALTITUDE,
      angle: 0, orbitAngle: Math.random() * Math.PI * 2,
      spotX: world.player.x, spotY: world.player.y, spotOn: false, sweep: 0,
    };
  } else if (!active && world.policeHeli) {
    world.policeHeli = null;
  }
  heliRender.heli = world.policeHeli;
  if (!world.policeHeli) return;

  const heli = world.policeHeli;
  const pol = world.police;
  const center = pol.searching && pol.searchCenter ? pol.searchCenter : world.player;
  heli.orbitAngle += HELI_ORBIT_SPEED * dt;
  const orbit = pol.searching ? Math.min(pol.searchRadius * 0.6, 40) : HELI_ORBIT_RADIUS;
  const targetX = center.x + Math.cos(heli.orbitAngle) * orbit;
  const targetY = center.y + Math.sin(heli.orbitAngle) * orbit;
  const t = Math.min(1, dt * HELI_FOLLOW_LERP);
  heli.x += (targetX - heli.x) * t;
  heli.y += (targetY - heli.y) * t;
  heli.z += (HELI_ALTITUDE - heli.z) * Math.min(1, dt * 0.8);
  heli.angle = Math.atan2(targetY - heli.y, targetX - heli.x);

  let sx, sy;
  if (pol.seenRecently) {
    sx = world.player.x; sy = world.player.y;
  } else {
    heli.sweep += dt * 0.7;
    const r = pol.searchRadius * (0.35 + 0.3 * Math.sin(heli.sweep * 0.6));
    sx = center.x + Math.cos(heli.sweep) * r;
    sy = center.y + Math.sin(heli.sweep) * r;
  }
  const dx = sx - heli.spotX, dy = sy - heli.spotY, d = Math.hypot(dx, dy);
  const step = Math.min(d, HELI_SPOT_SPEED * dt);
  if (d > 0.01) { heli.spotX += dx / d * step; heli.spotY += dy / d * step; }
  heli.spotOn = world.wanted >= 5 && (world.dayNight?.night ?? 0) > 0.5;
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
  const p = world.player;
  for (const v of world.vehicles) {
    if (!v.isPolice || v.hijacked || v.wrecked || v.driver === 'player' || v.isBoat) continue;
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
  const p = world.player;
  for (const v of world.vehicles) {
    if (!v.isPolice || v.hijacked || v.wrecked || v.driver === 'player' || v.isBoat) continue;
    if (v._chasing && !v._roadblock) continue;
    v._losTimer = (v._losTimer || 0) - dt;
    if (v._losTimer > 0) continue;
    v._losTimer = 0.3;
    const d = Math.hypot(p.x - v.x, p.y - v.y);
    v._sees = d < SEE_RANGE_CAR && hasLineOfSight(world.map, v.x, v.y, p.x, p.y);
  }
}

function updateSearch(dt, world, state, escalated) {
  const pol = world.police;
  const p = world.player;
  if (world.wanted === 0) {
    pol.searching = false;
    pol.seenRecently = false;
    pol.searchCenter = null;
    pol.searchRadius = 0;
    pol.unseenFor = 0;
    world.wantedDecayTimer = 0;
    world.policeTip = null;
    return;
  }
  const tip = world.policeTip;
  if (tip) {
    world.policeTip = null;
    pol.lastSeen = { x: tip.x, y: tip.y };
    pol.searching = true;
    pol.seenRecently = false;
    pol.unseenFor = LOSE_AFTER;
    pol.searchCenter = { x: tip.x, y: tip.y };
    pol.searchRadius = 70;
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
    pol.lastSeen = { x: p.x, y: p.y };
    pol.unseenFor = 0;
    pol.seenRecently = true;
    pol.searching = false;
    world.wantedDecayTimer = 0;
    return;
  }

  pol.unseenFor += dt;
  if (pol.unseenFor < LOSE_AFTER && !pol.searching) {
    pol.seenRecently = true;
    return;
  }
  pol.seenRecently = false;
  if (!pol.searching) {
    pol.searching = true;
    pol.searchCenter = pol.lastSeen ? { ...pol.lastSeen } : { x: p.x, y: p.y };
    pol.searchRadius = 55 + world.wanted * 15;
    world.wantedDecayTimer = 0;
  }
  pol.searchRadius = Math.max(SEARCH_MIN_RADIUS, pol.searchRadius - SEARCH_SHRINK * dt);
  const outside = Math.hypot(p.x - pol.searchCenter.x, p.y - pol.searchCenter.y) > pol.searchRadius;
  world.wantedDecayTimer += dt * (outside ? 2 : 1);
  if (world.wantedDecayTimer >= DECAY_TIME) {
    world.wanted = Math.max(0, world.wanted - 1);
    world.wantedDecayTimer = 0;
    if (world.wanted === 0) world.addMessage('Je bent de politie kwijt', 3);
  }
}

// --- roadblocks (3+ stars) -------------------------------------------------

function tryRoadblock(world, state) {
  const pol = world.police;
  const p = world.player;
  const pv = p.inVehicle;
  if (world.wanted < ROADBLOCK_WANTED || !pol.seenRecently || pol.searching) return;
  if (!pv || pv.isBoat || Math.abs(pv.speed) < 6 || world.time < state.nextRoadblockAt) return;
  if (world.vehicles.some((v) => v._roadblock)) return;
  state.nextRoadblockAt = world.time + 3;
  const heading = pv.speed >= 0 ? pv.angle : pv.angle + Math.PI;
  const ahead = 75 + Math.min(40, Math.abs(pv.speed) * 2.5);
  const tx = p.x + Math.cos(heading) * ahead, ty = p.y + Math.sin(heading) * ahead;
  const rp = world.map.nearestRoadPoint(tx, ty, 30, true);
  if (!rp || Math.hypot(rp.x - p.x, rp.y - p.y) < 55) return;
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
  const cars = [];
  for (const side of [1, -1]) {
    const v = spawnVehicleOnRoad(world.map, road, true, Math.random, false, false, { x: rp.x, y: rp.y });
    v.x = rp.x + nx * side * 2.25;
    v.y = rp.y + ny * side * 2.25;
    v.angle = Math.atan2(ny * side, nx * side) + side * 0.35 * towardPlayer;
    v.speed = 0;
    v.road = null;
    v._roadblock = { until: world.time + ROADBLOCK_LIFETIME };
    if (isInsideBuilding(world.map, v.x, v.y)) return;
    cars.push(v);
  }
  world.vehicles.push(...cars);
  const cops = spawnCopPedestriansNear(world.map, rp.x, rp.y, 2, Math.random);
  cops.forEach((c, i) => {
    const side = i === 0 ? 1 : -1;
    const gx = rp.x - fx * towardPlayer * 3 + nx * side * 3.4;
    const gy = rp.y - fy * towardPlayer * 3 + ny * side * 3.4;
    if (!isInsideBuilding(world.map, gx, gy)) { c.x = gx; c.y = gy; }
    c.guard = { x: c.x, y: c.y, angle: Math.atan2(p.y - c.y, p.x - c.x) };
    c.state = 'guard';
    c._roadblock = true;
  });
  world.pedestrians.push(...cops);
  pol.roadblocks = [{ x: rp.x, y: rp.y }];
  state.nextRoadblockAt = world.time + ROADBLOCK_COOLDOWN;
}

function updateRoadblocks(world) {
  const p = world.player;
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
  const alive = world.vehicles.filter((v) => v._motor && !v.wrecked && !v.hijacked);
  if (alive.length >= MOTOR_MAX) return;
  state.nextMotorAt = world.time + 3;
  const road = findSpawnRoad(world.map, world.player.x, world.player.y);
  if (!road) return;
  const v = spawnVehicleOnRoad(world.map, road, false, Math.random, false, false, null, true);
  v.model = MOTOR_MODEL;
  v.isPolice = true;
  v._motor = true;
  world.vehicles.push(v);
}

export function updatePolice(dt, world) {
  const state = getState(world);
  initPoliceContract(world);

  const escalated = world.wanted > state.prevWanted;
  refreshVehicleSight(world, dt);
  updateSearch(dt, world, state, escalated && !world.policeTip);
  state.prevWanted = world.wanted;

  trySpawnPolice(world, state);
  despawnFarPolice(world);
  trySpawnCopPeds(world, state);
  despawnFarCopPeds(world);
  trySpawnPoliceBoat(world, state);
  despawnFarPoliceBoats(world);
  trySpawnMotor(world, state);
  tryRoadblock(world, state);
  updateRoadblocks(world);
  updatePoliceHeli(dt, world);

  const chasing = world.wanted > 0;
  const seen = world.police.seenRecently;
  for (const v of world.vehicles) {
    // boats chase via updateBoatAI; a stolen police car is just a car now
    if (!v.isPolice || v.hijacked || v.isBoat || v.wrecked || v.driver === 'player') continue;
    if (v._roadblock) { checkBusted(v, world); continue; }

    if (chasing !== v._chasing) {
      if (!chasing) { attachToNearestRoad(v, world.map); v._direct = false; v._wasDirect = false; }
      v._chasing = chasing;
    }

    if (chasing) {
      updateChase(v, dt, world);
      if (world.wanted >= 3 && seen && v._sees) maybeFire(v, dt, world);
      checkBusted(v, world);
    } else if (v._motor) {
      v._motor = false;
      v.isPolice = false;
    } else {
      updateTrafficAI(v, dt, world.map, world, Math.random);
      resolveVehicleBuildingCollision(v, world.map, dt);
    }
  }
}

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

  const searchlight = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.24, 8), heliMat(0xdddddd));
  searchlight.rotation.z = Math.PI / 2;
  searchlight.position.set(1.1, -0.45, 0);
  group.add(searchlight);

  const cone = new THREE.Mesh(SPOT_CONE_GEO, SPOT_CONE_MAT);
  cone.visible = false;
  cone.renderOrder = 5;
  group.add(cone);
  const disc = new THREE.Mesh(SPOT_DISC_GEO, SPOT_DISC_MAT);
  disc.visible = false;
  disc.renderOrder = 5;
  group.add(disc);
  group.userData.spotCone = cone;
  group.userData.spotDisc = disc;

  return group;
}

const SPOT_CONE_GEO = (() => {
  const g = new THREE.ConeGeometry(1, 1, 14, 1, true);
  g.translate(0, -0.5, 0);
  return g;
})();
const SPOT_CONE_MAT = new THREE.MeshBasicMaterial({
  color: 0xfff1c8, transparent: true, opacity: 0.11, depthWrite: false,
  blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
});
const SPOT_DISC_GEO = new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2);
const SPOT_DISC_MAT = new THREE.MeshBasicMaterial({
  color: 0xfff4d6, transparent: true, opacity: 0.45, depthWrite: false,
  blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2,
});
const _spotV = new THREE.Vector3();
const _spotO = new THREE.Vector3();
const _down = new THREE.Vector3(0, -1, 0);

// Spins the main + tail rotor. Call once per frame after repositioning the
// mesh built above - purely cosmetic, safe to skip (blades just render
// static) if an integrator forgets to wire it in.
export function updatePoliceHeliMesh3D(mesh, time) {
  mesh.userData.rotor.rotation.y = time * HELI_ROTOR_SPEED;
  mesh.userData.tailRotor.rotation.x = time * HELI_ROTOR_SPEED * 1.6;
  const { spotCone: cone, spotDisc: disc } = mesh.userData;
  const heli = heliRender.heli;
  const on = !!(cone && heli && heli.spotOn);
  if (cone) { cone.visible = on; disc.visible = on; }
  if (!on) return;
  mesh.updateMatrixWorld(true);
  const origin = _spotO.set(1.1, -0.45, 0);
  const target = mesh.worldToLocal(_spotV.set(heli.spotX, 0.06, heli.spotY));
  disc.position.copy(target);
  const r = HELI_SEE_RADIUS * 0.75;
  disc.scale.set(r, 1, r);
  const dir = target.clone().sub(origin);
  const len = dir.length();
  cone.position.copy(origin);
  cone.quaternion.setFromUnitVectors(_down, dir.normalize());
  cone.scale.set(r, len, r);
}
