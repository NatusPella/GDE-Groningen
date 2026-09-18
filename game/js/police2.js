import { normalizeAngle, clamp, closestPointOnSegment } from './util2.js';
import { spawnVehicleOnRoad, updateTrafficAI, resolveVehicleBuildingCollision } from './vehicle2.js';
import { respawnPlayer } from './world2.js';

const DECAY_TIME = 20;
const DESPAWN_DIST = 260;
const SPAWN_STAGGER = 1.4;
const FIRE_RANGE = 28;
const BUST_FAST_SPEED = 9;

// Per-world scratch state that doesn't belong on the shared World contract
// (spawn cooldown, previous-wanted tracking for the decay timer).
const policeState = new WeakMap();
function getState(world) {
  let s = policeState.get(world);
  if (!s) {
    s = { prevWanted: world.wanted, nextSpawnAt: 0 };
    policeState.set(world, s);
  }
  return s;
}

function findSpawnRoad(map, camera, px, py) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const ang = Math.random() * Math.PI * 2;
    const d = 60 + Math.random() * 60;
    const x = px + Math.cos(ang) * d;
    const y = py + Math.sin(ang) * d;
    const [vminx, vminy, vmaxx, vmaxy] = camera.viewBounds(20);
    if (x > vminx && x < vmaxx && y > vminy && y < vmaxy) continue;
    const rp = map.nearestRoadPoint(x, y, 200, true);
    if (rp) return rp.road;
  }
  return null;
}

function trySpawnPolice(world, state) {
  const alive = world.vehicles.filter((v) => v.isPolice && !v.wrecked);
  const target = world.wanted === 0 ? 1 : Math.min(8, world.wanted + 1);
  if (alive.length >= target || world.time < state.nextSpawnAt) return;
  const road = findSpawnRoad(world.map, world.camera, world.player.x, world.player.y);
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
