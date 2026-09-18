import { dist, pointInPolygon } from './util2.js';
import { resolveBuildingCollisions } from './player2.js';

// Tammo and Anita are always out together: whichever one the player is NOT
// controlling is this module's "companion" - an AI-controlled buddy that
// follows on foot, rides along as a passenger when the player drives, and
// respawns-and-walks-back if it gets killed. Swapping control (the 'c' key,
// handled in player2.js) just trades physical state between world.player
// and world.companion - this file never touches which one is "the player".

const FOLLOW_DIST = 3.2;
const ARRIVE_SLACK = 1.1;
const CATCH_UP_SPEED = 7.5;
const BOARD_DIST = 3;
const VEHICLE_HIT_SPEED = 4;
const DEAD_DURATION = 3;
const RADIUS = 0.35;

function isInWater(map, x, y) {
  for (const w of map.waterNear(x, y, 0.5)) {
    if (pointInPolygon(x, y, w.pts)) return true;
  }
  return false;
}

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
  };
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
  const name = c.character === 'tammo' ? 'Tammo' : 'Anita';
  world.addMessage(`${name} komt er weer aan`, 3);
}

function seekTowards(c, tx, ty, speed, dt, map) {
  const d = dist(c.x, c.y, tx, ty);
  if (d < 0.25) { c.vx = 0; c.vy = 0; return; }
  c.angle = Math.atan2(ty - c.y, tx - c.x);
  const s = Math.min(speed, d * 3);
  c.vx = Math.cos(c.angle) * s;
  c.vy = Math.sin(c.angle) * s;
  let nx = c.x + c.vx * dt, ny = c.y + c.vy * dt;
  [nx, ny] = resolveBuildingCollisions(nx, ny, c.radius, map);
  if (isInWater(map, nx, ny)) {
    if (!isInWater(map, nx, c.y)) ny = c.y;
    else if (!isInWater(map, c.x, ny)) nx = c.x;
    else { nx = c.x; ny = c.y; }
  }
  c.x = nx;
  c.y = ny;
}

export function updateCompanion(dt, world) {
  const c = world.companion;
  const p = world.player;
  c.character = p.character === 'tammo' ? 'anita' : 'tammo';

  if (c.state === 'dead') {
    if (world.time >= c.deadUntil) respawnCompanion(world);
    return;
  }

  if (p.inVehicle) {
    if (c.inVehicle === p.inVehicle) return; // already riding along
    if (c.inVehicle) { c.inVehicle.passenger = null; c.inVehicle = null; }
    const v = p.inVehicle;
    // bikes/scooters/boats only fit the one rider - the companion just
    // waits/follows on foot near wherever the player parked/boarded
    const canRide = !v.isBike && !v.isScooter && !v.isBoat;
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
    const nx = Math.sin(v.angle), ny = -Math.cos(v.angle);
    let ex = v.x + nx * (v.halfWid + 0.7), ey = v.y + ny * (v.halfWid + 0.7);
    [ex, ey] = resolveBuildingCollisions(ex, ey, c.radius, world.map);
    c.x = ex;
    c.y = ey;
    c.inVehicle = null;
    return;
  }

  // on foot, player on foot - trail a bit behind rather than sitting on top
  const behindAngle = Math.atan2(p.y - c.y, p.x - c.x);
  const tx = p.x - Math.cos(behindAngle) * FOLLOW_DIST;
  const ty = p.y - Math.sin(behindAngle) * FOLLOW_DIST;
  if (dist(c.x, c.y, p.x, p.y) > ARRIVE_SLACK) {
    seekTowards(c, tx, ty, CATCH_UP_SPEED, dt, world.map);
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
