import { dist, isInWater, inWaterPoly, WATER_Y } from './util.js';
import { resolveBuildingCollisions, findExitSpot, stopVehicle, EXIT_RIGHT_FIRST, swimDepth, findClimbSpot, SWIM_SPEED, CLIMB_TIME } from './player.js';

// Tammo and Anita are always out together: whichever one the player is NOT
// controlling is this module's "companion" - an AI-controlled buddy that
// follows on foot, rides along as a passenger when the player drives, and
// respawns-and-walks-back if it gets killed. Swapping control (the 'c' key,
// handled in player.js) just trades physical state between world.player
// and world.companion - this file never touches which one is "the player".

const FOLLOW_DIST = 3.2;
const ARRIVE_SLACK = 1.1;
const CATCH_UP_SPEED = 7.5;
const BOARD_DIST = 3;
const VEHICLE_HIT_SPEED = 4;
const DEAD_DURATION = 3;
const RADIUS = 0.35;
const TELEPORT_DIST = 60;
const SWIM_TELEPORT_DIST = 14;
const SWIM_STUCK_TIME = 3;
const GRAVITY = 16;

export function initCompanion(world) {
  const p = world.player;
  // spawn shoulder-to-shoulder, not scattered off at follow-distance - they
  // arrive at the landmark together, the follow AI only kicks in once
  // the player actually starts moving away
  const ang = p.angle + Math.PI / 2;
  const sideStep = 0.9;
  world.companion = {
    x: p.x + Math.cos(ang) * sideStep,
    y: p.y + Math.sin(ang) * sideStep,
    angle: p.angle,
    vx: 0,
    vy: 0,
    radius: RADIUS,
    inVehicle: null,
    character: p.character === 'tammo' ? 'anita' : 'tammo',
    health: 100,
    state: 'alive',
    deadUntil: 0,
    water: null,
    swimming: false,
    z: 0,
    vz: 0,
    swimTilt: 0,
    climb: null,
  };
  world.onRespawn.push(() => {
    const c = world.companion;
    if (c.inVehicle) { c.inVehicle.passenger = null; c.inVehicle = null; }
    if (c.state === 'dead') { c.state = 'alive'; c.health = 100; }
    teleportNearPlayer(c, world.player, world.map);
  });
}

function respawnCompanion(world) {
  const c = world.companion;
  const landmarks = world.map.meta.landmarks || [];
  const pick = landmarks.length ? landmarks[Math.floor(Math.random() * landmarks.length)] : world.spawnPoint;
  const spot = world.map.nearestRoadPoint(pick.x, pick.y, 400) || pick;
  const [sx, sy] = world.map.escapeBuilding(spot.x, spot.y);
  c.x = sx;
  c.y = sy;
  c.vx = 0;
  c.vy = 0;
  c.health = 100;
  c.state = 'alive';
  c.inVehicle = null;
  leaveWater(c);
  const name = c.character === 'tammo' ? 'Tammo' : 'Anita';
  world.addMessage(`${name} komt er weer aan`, 3);
}

function teleportNearPlayer(c, p, map) {
  let spot = null;
  for (const r of [0.9, 2, 3.5]) {
    for (const side of [1, -1, 0, 2]) {
      const ang = p.angle + side * Math.PI / 2;
      const [x, y] = map.escapeBuilding(p.x + Math.cos(ang) * r, p.y + Math.sin(ang) * r);
      if (!isInWater(map, x, y)) { spot = [x, y]; break; }
    }
    if (spot) break;
  }
  if (!spot) {
    const road = map.nearestRoadPoint(p.x, p.y, 80);
    spot = road ? map.escapeBuilding(road.x, road.y) : [p.x, p.y];
  }
  [c.x, c.y] = spot;
  c.vx = 0;
  c.vy = 0;
  leaveWater(c);
  if (isInWater(map, c.x, c.y)) { c.water = 'swim'; c.swimming = true; c.z = swimDepth(-0.25, 0); }
}

function leaveWater(c) {
  c.water = null;
  c.swimming = false;
  c.z = 0;
  c.vz = 0;
  c.swimTilt = 0;
  c.climb = null;
  c.climbSpot = null;
  c.stuckT = 0;
}

function startFall(c) {
  c.water = 'fall';
  c.swimming = true;
  c.vz = 0;
  c.vx *= 0.5;
  c.vy *= 0.5;
}

function seekTowards(c, tx, ty, speed, dt, map, intoWater = false) {
  const d = dist(c.x, c.y, tx, ty);
  if (d < 0.25) { c.vx = 0; c.vy = 0; return; }
  c.angle = Math.atan2(ty - c.y, tx - c.x);
  const s = Math.min(speed, d * 3);
  c.vx = Math.cos(c.angle) * s;
  c.vy = Math.sin(c.angle) * s;
  let nx = c.x + c.vx * dt, ny = c.y + c.vy * dt;
  [nx, ny] = resolveBuildingCollisions(nx, ny, c.radius, map);
  if (!isInWater(map, c.x, c.y) && isInWater(map, nx, ny) && !intoWater) {
    if (!isInWater(map, nx, c.y)) ny = c.y;
    else if (!isInWater(map, c.x, ny)) nx = c.x;
    else { nx = c.x; ny = c.y; }
  }
  c.x = nx;
  c.y = ny;
  if (isInWater(map, c.x, c.y)) startFall(c);
}

function swimTowards(c, tx, ty, speed, dt, map) {
  const d = dist(c.x, c.y, tx, ty);
  const moving = d > 0.4;
  if (moving) c.angle = Math.atan2(ty - c.y, tx - c.x);
  const s = moving ? Math.min(speed, d * 2) : 0;
  const k = Math.min(1, dt * 3);
  c.vx += (Math.cos(c.angle) * s - c.vx) * k;
  c.vy += (Math.sin(c.angle) * s - c.vy) * k;
  const ox = c.x, oy = c.y;
  const nx = c.x + c.vx * dt, ny = c.y + c.vy * dt;
  if (inWaterPoly(map, nx, ny)) { c.x = nx; c.y = ny; }
  else if (inWaterPoly(map, nx, c.y)) c.x = nx;
  else if (inWaterPoly(map, c.x, ny)) c.y = ny;
  c.swimTilt += ((moving ? -0.85 : -0.25) - c.swimTilt) * Math.min(1, dt * 4);
  return moving && Math.hypot(c.x - ox, c.y - oy) < s * dt * 0.3;
}

function updateCompanionWater(c, p, dt, world) {
  const map = world.map;
  if (c.water !== 'climb' && !inWaterPoly(map, c.x, c.y)) { leaveWater(c); return; }

  if (c.water === 'fall') {
    c.vz -= GRAVITY * dt;
    c.z += c.vz * dt;
    const nx = c.x + c.vx * dt, ny = c.y + c.vy * dt;
    if (inWaterPoly(map, nx, ny)) { c.x = nx; c.y = ny; }
    if (c.z <= WATER_Y) {
      world.particles.push({ kind: 'splash', x: c.x, y: c.y, until: world.time + 1.1 });
      c.water = 'swim';
      c.vz = 0;
      c.stuckT = 0;
    }
    return;
  }

  if (c.water === 'climb') {
    const cl = c.climb;
    cl.t += dt;
    const k = Math.min(1, cl.t / CLIMB_TIME);
    const e = k * k * (3 - 2 * k);
    const slide = Math.max(0, (k - 0.45) / 0.55);
    const se = slide * slide * (3 - 2 * slide);
    c.x = cl.fromX + (cl.toX - cl.fromX) * se;
    c.y = cl.fromY + (cl.toY - cl.fromY) * se;
    c.z = cl.fromZ + (0.15 - cl.fromZ) * Math.sin(Math.min(1, k / 0.6) * Math.PI / 2) - 0.15 * e;
    c.swimTilt = -0.9 * (1 - e);
    c.vx = 0; c.vy = 0;
    if (k >= 1) leaveWater(c);
    return;
  }

  const d = dist(c.x, c.y, p.x, p.y);
  let stuck;
  if (p.swimming && !p.inVehicle) {
    const behind = Math.atan2(p.y - c.y, p.x - c.x);
    stuck = swimTowards(c, p.x - Math.cos(behind) * 1.8, p.y - Math.sin(behind) * 1.8, d > 6 ? 3 : SWIM_SPEED * 1.15, dt, map);
  } else {
    if (d > SWIM_TELEPORT_DIST) { teleportNearPlayer(c, p, map); return; }
    stuck = swimTowards(c, p.x, p.y, 2.6, dt, map);
    if (world.time >= (c.climbScanAt || 0)) {
      c.climbScanAt = world.time + 0.25;
      c.climbSpot = findClimbSpot(map, c.x, c.y, c.angle);
    }
    if (c.climbSpot) {
      const spot = c.climbSpot;
      c.water = 'climb';
      c.climb = { t: 0, fromX: c.x, fromY: c.y, fromZ: c.z, toX: spot.x, toY: spot.y };
      c.angle = Math.atan2(spot.y - c.y, spot.x - c.x);
      return;
    }
  }
  c.stuckT = stuck ? (c.stuckT || 0) + dt : 0;
  if (c.stuckT > SWIM_STUCK_TIME && !p.swimming) { teleportNearPlayer(c, p, map); return; }
  c.z += (swimDepth(c.swimTilt, world.time, 1.3) - c.z) * Math.min(1, dt * 5);
}

export function updateCompanion(dt, world) {
  const c = world.companion;
  const p = world.player;
  c.character = p.character === 'tammo' ? 'anita' : 'tammo';

  if (c.state === 'dead') {
    if (world.time >= c.deadUntil) respawnCompanion(world);
    return;
  }

  if (c.water && !c.inVehicle) {
    if (dist(c.x, c.y, p.x, p.y) > TELEPORT_DIST) teleportNearPlayer(c, p, world.map);
    else updateCompanionWater(c, p, dt, world);
    return;
  }

  if (p.inVehicle) {
    if (c.inVehicle === p.inVehicle) return; // already riding along
    if (c.inVehicle) { c.inVehicle.passenger = null; c.inVehicle = null; }
    const v = p.inVehicle;
    // bikes/scooters/boats only fit the one rider - the companion just
    // waits/follows on foot near wherever the player parked/boarded
    const canRide = !v.isBike && !v.isScooter && !v.isBoat && !v.sinking;
    if (canRide && !v.passenger && dist(c.x, c.y, v.x, v.y) < BOARD_DIST) {
      c.inVehicle = v;
      v.passenger = 'companion';
      c.vx = 0;
      c.vy = 0;
      return;
    }
    seekTowards(c, v.x, v.y, CATCH_UP_SPEED, dt, world.map);
    return;
  }

  if (c.inVehicle) {
    const v = c.inVehicle;
    v.passenger = null;
    c.inVehicle = null;
    if (v.sinking) {
      const off = v.halfWid + 0.5, nx = -Math.sin(v.angle), ny = Math.cos(v.angle);
      c.x = v.x + nx * off; c.y = v.y + ny * off;
      if (!inWaterPoly(world.map, c.x, c.y)) { c.x = v.x; c.y = v.y; }
      c.water = 'swim'; c.swimming = true; c.z = WATER_Y; c.vx = 0; c.vy = 0;
      return;
    }
    stopVehicle(v);
    [c.x, c.y] = findExitSpot(v, c.radius, world.map, EXIT_RIGHT_FIRST);
    return;
  }

  if (dist(c.x, c.y, p.x, p.y) > TELEPORT_DIST) {
    teleportNearPlayer(c, p, world.map);
    return;
  }

  // on foot, player on foot - trail a bit behind rather than sitting on top
  const behindAngle = Math.atan2(p.y - c.y, p.x - c.x);
  const tx = p.x - Math.cos(behindAngle) * FOLLOW_DIST;
  const ty = p.y - Math.sin(behindAngle) * FOLLOW_DIST;
  if (dist(c.x, c.y, p.x, p.y) > ARRIVE_SLACK) {
    seekTowards(c, tx, ty, CATCH_UP_SPEED, dt, world.map, p.swimming);
    if (c.water) return;
  } else {
    c.vx = 0;
    c.vy = 0;
  }

  for (const v of world.vehicles) {
    if (v.wrecked || Math.abs(v.speed) < VEHICLE_HIT_SPEED) continue;
    if (dist(c.x, c.y, v.x, v.y) < v.halfWid * 0.9 + c.radius) {
      c.state = 'dead';
      c.health = 0;
      c.vx = 0;
      c.vy = 0;
      c.deadUntil = world.time + DEAD_DURATION;
      const name = c.character === 'tammo' ? 'Tammo' : 'Anita';
      world.addMessage(`${name} is aangereden!`, 3);
      break;
    }
  }
}
