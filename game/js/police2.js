import { normalizeAngle, clamp, closestPointOnSegment } from './util2.js';
import { spawnVehicleOnRoad, updateTrafficAI, resolveVehicleBuildingCollision, spawnPoliceBoatOnWater } from './vehicle2.js';
import { respawnPlayer } from './world2.js';
import { spawnCopPedestriansNear } from './pedestrians2.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const DECAY_TIME = 20;
const DESPAWN_DIST = 260;
const SPAWN_STAGGER = 1.4;
const FIRE_RANGE = 28;
const BUST_FAST_SPEED = 9;

// "Politie ook te voet" - a small pool of cop Pedestrians (see
// spawnCopPedestriansNear in pedestrians2.js), grown only once there's
// something to respond to.
const COP_PED_WANTED_THRESHOLD = 1;
const COP_PED_TARGET_PER_WANTED = 1;
const COP_PED_TARGET_MAX = 4;
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
function getState(world) {
  let s = policeState.get(world);
  if (!s) {
    s = { prevWanted: world.wanted, nextSpawnAt: 0, nextCopPedSpawnAt: 0, nextBoatSpawnAt: 0 };
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
  const alive = world.vehicles.filter((v) => v.isPolice && !v.wrecked);
  const target = world.wanted === 0 ? 1 : Math.min(8, world.wanted + 1);
  if (alive.length >= target || world.time < state.nextSpawnAt) return;
  const road = findSpawnRoad(world.map, world.player.x, world.player.y);
  if (!road) return;
  world.vehicles.push(spawnVehicleOnRoad(world.map, road, true, Math.random));
  state.nextSpawnAt = world.time + SPAWN_STAGGER;
}

function despawnFarPolice(world) {
  const { x: px, y: py } = world.player;
  for (let i = world.vehicles.length - 1; i >= 0; i--) {
    const v = world.vehicles[i];
    if (!v.isPolice || v.driver === 'player') continue;
    if (v.wrecked || (v.deadEndBounces || 0) > 2 || Math.hypot(v.x - px, v.y - py) > DESPAWN_DIST) world.vehicles.splice(i, 1);
  }
}

// Give a car that just stopped chasing a plausible road/segment to resume
// updateTrafficAI from, since free-roam pursuit leaves it off any polyline.
function resnapToRoad(v, map) {
  const rp = map.nearestRoadPoint(v.x, v.y, 150, true);
  if (!rp) return;
  const pts = rp.road.pts;
  let bestI = 0, bestDist2 = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const cp = closestPointOnSegment(v.x, v.y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (cp.dist2 < bestDist2) { bestDist2 = cp.dist2; bestI = i; }
  }
  const segAngle = Math.atan2(pts[bestI + 1][1] - pts[bestI][1], pts[bestI + 1][0] - pts[bestI][0]);
  v.road = rp.road;
  v.dir = Math.cos(v.angle - segAngle) >= 0 ? 1 : -1;
  v.segIdx = v.dir > 0 ? bestI : bestI + 1;
  v.waitTimer = 0;
}

function updateChase(v, dt, world) {
  const p = world.player;
  const dx = p.x - v.x, dy = p.y - v.y;
  const d = Math.hypot(dx, dy) || 0.001;
  const steerErr = normalizeAngle(Math.atan2(dy, dx) - v.angle);
  v.applyControls(dt, d > 3 ? 1 : 0, clamp(steerErr * 2.2, -1, 1), d < 2.5);
  resolveVehicleBuildingCollision(v, world.map);
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
  const contact = v.halfWid + (p.radius || 0.35) + 0.15;
  if (Math.hypot(v.x - p.x, v.y - p.y) <= contact) {
    respawnPlayer(world, { busted: true, moneyPenalty: world.wanted * 150 });
  }
}

// --- foot police --------------------------------------------------------
// Actual seek/bust behavior for a cop Pedestrian lives in pedestrians2.js's
// updatePedestrians (mirrors the civilian flee-trigger pattern, inverted) -
// this module only decides how many should exist and where they come from,
// the same split it already has with spawnVehicleOnRoad for cars.

function trySpawnCopPeds(world, state) {
  if (world.wanted < COP_PED_WANTED_THRESHOLD || world.time < state.nextCopPedSpawnAt) return;
  const alive = world.pedestrians.filter((p) => p.isCop && p.state !== 'dead');
  const target = Math.min(COP_PED_TARGET_MAX, world.wanted * COP_PED_TARGET_PER_WANTED);
  if (alive.length >= target) return;
  world.pedestrians.push(...spawnCopPedestriansNear(world.map, world.player.x, world.player.y, 1, Math.random));
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
  const alive = world.vehicles.filter((v) => v.isBoat && v.isPolice && !v.wrecked);
  if (alive.length >= 1) return;
  const polys = world.map.waterNear(world.player.x, world.player.y, BOAT_SPAWN_MAX_DIST);
  if (!polys.length) return;
  const poly = polys[Math.floor(Math.random() * polys.length)];
  world.vehicles.push(spawnPoliceBoatOnWater(world.map, poly, Math.random));
  state.nextBoatSpawnAt = world.time + BOAT_SPAWN_STAGGER;
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
// world.policeHeli is a single plain {x,y,z,angle} - z is altitude (three.y
// at render time, see integrationNotes). No collision, no gunfire: purely a
// visual/tension escalation at the highest wanted levels.

function updatePoliceHeli(dt, world) {
  const active = world.wanted >= HELI_WANTED_THRESHOLD;
  if (active && !world.policeHeli) {
    world.policeHeli = {
      x: world.player.x, y: world.player.y, z: HELI_ALTITUDE,
      angle: 0, orbitAngle: Math.random() * Math.PI * 2,
    };
  } else if (!active && world.policeHeli) {
    world.policeHeli = null;
  }
  if (!world.policeHeli) return;

  const heli = world.policeHeli;
  heli.orbitAngle += HELI_ORBIT_SPEED * dt;
  const targetX = world.player.x + Math.cos(heli.orbitAngle) * HELI_ORBIT_RADIUS;
  const targetY = world.player.y + Math.sin(heli.orbitAngle) * HELI_ORBIT_RADIUS;
  const t = Math.min(1, dt * HELI_FOLLOW_LERP);
  heli.x += (targetX - heli.x) * t;
  heli.y += (targetY - heli.y) * t;
  heli.z += (HELI_ALTITUDE - heli.z) * Math.min(1, dt * 0.8);
  heli.angle = Math.atan2(targetY - heli.y, targetX - heli.x);
}

export function updatePolice(dt, world) {
  const state = getState(world);

  if (world.wanted > state.prevWanted) {
    world.wantedDecayTimer = 0;
  } else {
    world.wantedDecayTimer += dt;
    if (world.wanted > 0 && world.wantedDecayTimer >= DECAY_TIME) {
      world.wanted = Math.max(0, world.wanted - 1);
      world.wantedDecayTimer = 0;
    }
  }
  state.prevWanted = world.wanted;

  trySpawnPolice(world, state);
  despawnFarPolice(world);
  trySpawnCopPeds(world, state);
  despawnFarCopPeds(world);
  trySpawnPoliceBoat(world, state);
  despawnFarPoliceBoats(world);
  updatePoliceHeli(dt, world);

  const chasing = world.wanted > 0;
  for (const v of world.vehicles) {
    if (!v.isPolice || v.wrecked || v.driver === 'player') continue;

    if (chasing !== v._chasing) {
      if (!chasing) resnapToRoad(v, world.map);
      v._chasing = chasing;
    }

    if (chasing) {
      updateChase(v, dt, world);
      if (world.wanted >= 3) maybeFire(v, dt, world);
      checkBusted(v, world);
    } else {
      updateTrafficAI(v, dt, world.map, world, Math.random);
      resolveVehicleBuildingCollision(v, world.map);
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

  return group;
}

// Spins the main + tail rotor. Call once per frame after repositioning the
// mesh built above - purely cosmetic, safe to skip (blades just render
// static) if an integrator forgets to wire it in.
export function updatePoliceHeliMesh3D(mesh, time) {
  mesh.userData.rotor.rotation.y = time * HELI_ROTOR_SPEED;
  mesh.userData.tailRotor.rotation.x = time * HELI_ROTOR_SPEED * 1.6;
}
