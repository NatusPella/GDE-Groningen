import { dist, isInWater, inMapWater, WATER_Y, normalizeAngle, pointInPolygon, closestPointOnSegment } from './util.js';
import { knockDown, isKnockedDown } from './ragdoll.js';
import { resolveElevWalls } from './elevation.js';
import { resolveBuildingCollisions, findExitSpot, stopVehicle, EXIT_RIGHT_FIRST, swimDepth, findClimbSpot, SWIM_SPEED, CLIMB_TIME, GRAVITY } from './player.js';
import { findProps } from './breakables.js';
import { pushCircleOutOfVehicle } from './vehicle.js';
import { resolveRailings } from './bridgerails.js';
import { waterClearance } from './waterindex.js';
import { passagesOf } from './collision.js';

import { coopStep } from './coopglue.js';
import { kanUitstappen } from './coopgast.js';
const SWIM_EDGE_CLEAR = 0.7;
import { registerPoseSource, unregisterPoseSource, TAMMO_APPEARANCE, ANITA_APPEARANCE } from './models3d_people.js';

// Tammo and Tessa are always out together: whichever one the player is NOT
// controlling is this module's "companion" - an AI-controlled buddy that
// follows on foot, rides along as a passenger when the player drives, and
// respawns-and-walks-back if it gets killed. Swapping control (the 'c' key,
// handled in player.js) just trades physical state between world.player
// and world.companion - this file never touches which one is "the player".

const FOLLOW_DIST = 3.2;
const ARRIVE_SLACK = 1.1;
const CATCH_UP_SPEED = 7.0;
const BOARD_DIST = 3;
const VEHICLE_HIT_SPEED = 4;
const DEAD_DURATION = 5;
const RADIUS = 0.35;
const TELEPORT_DIST = 60;
const SWIM_TELEPORT_DIST = 14;
const SWIM_STUCK_TIME = 3;

// walking together (open-world buddy style): a slot at the player's shoulder
const WALK_SPEED = 3.0; // the player's default jog
const SIDE_OFFSET = 1.2;
const SIDE_OFFSET_CROUCH = 1.0;
const SHOULDER_LAG = 0.35;
const FILE_GAP = 1.7;
const CATCH_UP_START = 9;
const CATCH_UP_END = 3.5;
const RUN_CATCH_SPEED = 7.6;
const ACCEL = 16;
const BRAKE = 24;
const GAIN = 1.8;
const FACE_RATE = 10;
const SWING_RATE = 7;
const IDLE_FACE_RATE = 3;
const SHARP_TURN = 2;
const SIDE_SWITCH_COOLDOWN = 0.8;
const SCAN_INTERVAL = 0.15;
const CRUMB_STEP = 0.75;
const MAX_CRUMBS = 90;
const LOST_TIME = 5;
const LOST_MIN_DIST = 14;
const STUCK_TIME = 4;
const COMBAT_HOLD = 5;
const COMBAT_SIDE = 1.8;
const COMBAT_BACK = 2.6;
const PERSONAL_SPACE = 0.8;
const PED_SPACE = 1.3;
const POSE_SEEDS = { tammo: TAMMO_APPEARANCE.seed, anita: ANITA_APPEARANCE.seed };

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
  world.coopMove = moveFigure; // samen spelen (#366): botsingen voor de figuren van extra spelers
  world.coopVrij = figuurVrij;
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
  const name = c.character === 'tammo' ? 'Tammo' : 'Tessa';
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
  [nx, ny] = resolveRailings(nx, ny, c.radius, map);
  [nx, ny] = resolveBuildingCollisions(nx, ny, c.radius, map, 0, true);
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
  // same wall margin as the player's swimming: slide along, may back away
  const here = waterClearance(map, c.x, c.y, SWIM_EDGE_CLEAR + 1);
  const free = (x, y) => { const w = waterClearance(map, x, y, SWIM_EDGE_CLEAR + 1); return w >= SWIM_EDGE_CLEAR || (w > 0 && w >= here); };
  if (free(nx, ny)) { c.x = nx; c.y = ny; }
  else if (free(nx, c.y)) c.x = nx;
  else if (free(c.x, ny)) c.y = ny;
  c.swimTilt += ((moving ? -0.85 : -0.25) - c.swimTilt) * Math.min(1, dt * 4);
  return moving && Math.hypot(c.x - ox, c.y - oy) < s * dt * 0.3;
}

function updateCompanionWater(c, p, dt, world) {
  const map = world.map;
  if (c.water !== 'climb' && !inMapWater(map, c.x, c.y)) { leaveWater(c); return; }

  if (c.water === 'fall') {
    c.vz -= GRAVITY * dt;
    c.z += c.vz * dt;
    const nx = c.x + c.vx * dt, ny = c.y + c.vy * dt;
    if (inMapWater(map, nx, ny)) { c.x = nx; c.y = ny; }
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

function clearIdle(c) {
  c.crouching = false;
  c.pose = null;
}

// the idle gesture (a glance at the phone) goes through the ped pose hook,
// keyed by the appearance seed of whichever character is the companion
let posedSeed = null;
function applyPoseSource(c) {
  const seed = c.pose ? POSE_SEEDS[c.character] : null;
  if (posedSeed !== null && posedSeed !== seed) unregisterPoseSource(posedSeed);
  if (seed !== null) registerPoseSource(seed, c);
  posedSeed = seed;
}

function turnToward(a, target, maxStep) {
  const d = normalizeAngle(target - a);
  return Math.abs(d) <= maxStep ? target : a + Math.sign(d) * maxStep;
}

// +1 = the player's left (heading rotated +90deg), -1 = right, 0 = in line
function spatialSide(c, p, heading) {
  const lat = -(c.x - p.x) * Math.sin(heading) + (c.y - p.y) * Math.cos(heading);
  return Math.abs(lat) < 0.15 ? 0 : Math.sign(lat);
}

function slotAt(p, heading, side, off, back) {
  const ch = Math.cos(heading), sh = Math.sin(heading);
  return [p.x - sh * side * off - ch * back, p.y + ch * side * off - sh * back];
}

function propDist2(pr, x, y) {
  return closestPointOnSegment(x, y, pr.x - pr.hx, pr.y - pr.hy, pr.x + pr.hx, pr.y + pr.hy).dist2;
}

// (x, y) lies at least `margin` inside one of the walk-through passages of
// building b (the same corridors the on-foot collision opens up)
function inPassage(map, b, x, y, margin) {
  for (const ps of passagesOf(map, b)) {
    const P = ps.pts, lim = ps.hw - margin;
    if (lim <= 0) continue;
    for (let i = 0; i < P.length - 1; i++) {
      if (closestPointOnSegment(x, y, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]).dist2 < lim * lim) return true;
    }
  }
  return false;
}

// Is a body of radius r at (x, y) in a wall, the water, a street prop or
// (dynamic) another pedestrian?
function blockedAt(world, x, y, r, dynamic) {
  const map = world.map;
  if (isInWater(map, x, y)) return true;
  for (const b of map.buildingsNear(x, y, r + 1)) {
    const [minx, miny, maxx, maxy] = b.bounds;
    if (x < minx - r || x > maxx + r || y < miny - r || y > maxy + r) continue;
    const pts = b.pts;
    let hit = pointInPolygon(x, y, pts);
    for (let i = 0; i < pts.length - 1 && !hit; i++) {
      if (closestPointOnSegment(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]).dist2 < r * r) hit = true;
    }
    if (hit && !inPassage(map, b, x, y, r * 0.5)) return true;
  }
  if (!dynamic) return false;
  for (const pr of findProps(x, y, r + 1.5)) if (propDist2(pr, x, y) < (pr.r + r) ** 2) return true;
  for (const ped of world.pedestrians || []) {
    if (ped.state === 'dead') continue;
    const m = r + (ped.radius || 0.35);
    if ((ped.x - x) ** 2 + (ped.y - y) ** 2 < m * m) return true;
  }
  for (const v of world.vehicles || []) {
    if (v.isBoat || v.sinking || Math.abs(v.x - x) > v.halfLen + 1 || Math.abs(v.y - y) > v.halfLen + 1) continue;
    if (v.isHeli && !v.onGround) continue;
    if (pushCircleOutOfVehicle(x, y, r, v)) return true;
  }
  return false;
}

// Straight line from a to b crosses a building (or, when walking, water)?
function lineBlocked(map, ax, ay, bx, by, walking) {
  const L = Math.hypot(bx - ax, by - ay);
  if (L < 0.3) return false;
  const near = map.buildingsNear((ax + bx) / 2, (ay + by) / 2, L / 2 + 1);
  const n = Math.ceil(L / 0.5);
  for (let i = 1; i < n; i++) {
    const t = i / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
    if (walking && isInWater(map, x, y)) return true;
    for (const b of near) {
      const [minx, miny, maxx, maxy] = b.bounds;
      if (x >= minx && x <= maxx && y >= miny && y <= maxy && pointInPolygon(x, y, b.pts) && !inPassage(map, b, x, y, 0.15)) return true;
    }
  }
  return false;
}

function pushOutOfProps(x, y, r) {
  for (const pr of findProps(x, y, r + 1.5)) {
    const cp = closestPointOnSegment(x, y, pr.x - pr.hx, pr.y - pr.hy, pr.x + pr.hx, pr.y + pr.hy);
    const m = pr.r + r;
    if (cp.dist2 >= m * m || cp.dist2 < 1e-8) continue;
    const d = Math.sqrt(cp.dist2);
    x = cp.x + (x - cp.x) / d * m;
    y = cp.y + (y - cp.y) / d * m;
  }
  return [x, y];
}

function followState(c, p) {
  let f = c.follow;
  if (f && f.forChar === c.character) return f;
  // fresh start or a character swap: adopt the formation from where the
  // two already stand, so nobody jumps or crosses over
  const heading = Math.hypot(p.vx, p.vy) > 0.4 ? Math.atan2(p.vy, p.vx) : p.angle;
  f = c.follow = {
    forChar: c.character, heading, side: spatialSide(c, p, heading) || 1,
    lastSwitch: -99, scanAt: 0, pathAt: 0, free: [true, true], single: false, freeScans: 0,
    crumbs: [{ x: p.x, y: p.y }], via: null, losOk: true, lostT: 0, stuckT: 0, catchUp: false, repos: false,
    stillT: 0, idleAt: 0, idleFace: c.angle, poseUntil: 0, combatUntil: 0,
  };
  return f;
}

// point `back` meters behind the player along the path they walked
function trailPoint(f, p, back) {
  let acc = 0, px = p.x, py = p.y;
  for (let i = f.crumbs.length - 1; i >= 0; i--) {
    const k = f.crumbs[i], seg = dist(px, py, k.x, k.y);
    if (acc + seg >= back) {
      const u = (back - acc) / (seg || 1);
      return [px + (k.x - px) * u, py + (k.y - py) * u];
    }
    acc += seg;
    px = k.x;
    py = k.y;
  }
  return [px, py];
}

// newest breadcrumb of the player's path that the companion can walk to in
// a straight line - following it threads the same corners and alleys
function trailVia(f, c, map) {
  const n = f.crumbs.length;
  for (let i = n - 1; i >= Math.max(0, n - 45); i--) {
    const k = f.crumbs[i];
    if (!lineBlocked(map, c.x, c.y, k.x, k.y, true)) return k;
  }
  return null;
}

// Catch up discreetly: pop back in on the player's own trail, far enough
// back to be behind the camera or around a corner.
function sneakBackIn(c, p, world) {
  const f = c.follow;
  if (!f || f.crumbs.length < 2) return false;
  const yaw = world.camYaw ?? p.angle, fx = Math.cos(yaw), fy = Math.sin(yaw);
  let acc = 0, px = p.x, py = p.y;
  for (let i = f.crumbs.length - 1; i >= 0; i--) {
    const k = f.crumbs[i];
    acc += dist(px, py, k.x, k.y);
    px = k.x;
    py = k.y;
    if (acc < 9) continue;
    if (acc > 30) break;
    const hidden = (k.x - p.x) * fx + (k.y - p.y) * fy < -9 || lineBlocked(world.map, p.x, p.y, k.x, k.y, false);
    if (!hidden || blockedAt(world, k.x, k.y, RADIUS + 0.1, true)) continue;
    c.x = k.x;
    c.y = k.y;
    c.vx = 0;
    c.vy = 0;
    c.angle = Math.atan2(p.y - k.y, p.x - k.x);
    leaveWater(c);
    f.catchUp = true;
    f.lostT = 0;
    f.stuckT = 0;
    f.via = null;
    f.pathAt = 0;
    return true;
  }
  return false;
}

function pushOutOfPeds(x, y, r, world) {
  for (const ped of world.pedestrians || []) {
    if (ped.state === 'dead') continue;
    const dx = x - ped.x, dy = y - ped.y, m = r + (ped.radius || 0.35), d2 = dx * dx + dy * dy;
    if (d2 >= m * m || d2 < 1e-8) continue;
    const d = Math.sqrt(d2);
    x = ped.x + dx / d * m;
    y = ped.y + dy / d * m;
  }
  return [x, y];
}

function moveWithCollisions(c, dt, world) {
  const map = world.map;
  const steps = Math.max(1, Math.ceil(Math.hypot(c.vx, c.vy) * dt / (c.radius * 0.9)));
  const sdt = dt / steps;
  for (let i = 0; i < steps; i++) {
    let nx = c.x + c.vx * sdt, ny = c.y + c.vy * sdt;
    [nx, ny] = pushOutOfProps(nx, ny, c.radius);
    [nx, ny] = pushOutOfPeds(nx, ny, c.radius, world);
    [nx, ny] = resolveRailings(nx, ny, c.radius, map);
    [nx, ny] = resolveBuildingCollisions(nx, ny, c.radius, map, 0, true);
    if (!isInWater(map, c.x, c.y) && isInWater(map, nx, ny)) {
      if (!isInWater(map, nx, c.y)) ny = c.y;
      else if (!isInWater(map, c.x, ny)) nx = c.x;
      else { nx = c.x; ny = c.y; }
    }
    c.x = nx;
    c.y = ny;
  }
  if (isInWater(map, c.x, c.y)) startFall(c);
}

// Samen spelen (#366): de figuur van een derde of vierde speler loopt met dezelfde botsingen als de metgezel
// (rekwisieten, voetgangers, hekken, gebouwen) en komt niet in het water; world.coopMove wordt in initCompanion gezet.
export function moveFigure(f, dt, world) {
  const map = world.map;
  if (!map) { f.x += f.vx * dt; f.y += f.vy * dt; return; }
  if (!Number.isFinite(f.radius)) f.radius = RADIUS;
  const steps = Math.max(1, Math.min(8, Math.ceil(Math.hypot(f.vx, f.vy) * dt / (f.radius * 0.9))));
  const sdt = dt / steps;
  for (let i = 0; i < steps; i++) {
    let nx = f.x + f.vx * sdt, ny = f.y + f.vy * sdt;
    [nx, ny] = pushOutOfProps(nx, ny, f.radius);
    [nx, ny] = pushOutOfPeds(nx, ny, f.radius, world);
    [nx, ny] = resolveRailings(nx, ny, f.radius, map);
    [nx, ny] = resolveBuildingCollisions(nx, ny, f.radius, map, 0, true);
    if (isInWater(map, nx, ny) && !isInWater(map, f.x, f.y)) {
      if (!isInWater(map, nx, f.y)) ny = f.y;
      else if (!isInWater(map, f.x, ny)) nx = f.x;
      else { nx = f.x; ny = f.y; }
    }
    f.x = nx; f.y = ny;
  }
  // op de ring (elevation.js): blijf op het dek of in de bak waar je staat, achter de wanden, zoals de metgezel (followGround)
  if (map.elev && map.elev.has) {
    const hint = f.gz || 0, w = resolveElevWalls(map.elev, f.x, f.y, hint, f.radius);
    if (w) [f.x, f.y] = w;
    f.gz = map.groundHeightAt(f.x, f.y, hint);
  }
}

// Staat een figuur hier op droog land, buiten gebouwen? (coopnet.js: de terugzetplek en een figuur die vastzit in water of muur)
export function figuurVrij(x, y, world) {
  return !!world.map && !blockedAt(world, x, y, 0.05, false); // een punt: wie tegen een muur of de waterkant staat (straal 0,35) zit niet vast
}

// Rotate the desired velocity off a wall/prop straight ahead, preferring
// the turn toward the target.
function steerAround(world, c, f, vx, vy, tx, ty) {
  const s = Math.hypot(vx, vy);
  if (s < 0.3) return [vx, vy];
  const a = Math.atan2(vy, vx), probe = Math.min(1.2, 0.5 + s * 0.12);
  const free = (ang) => !blockedAt(world, c.x + Math.cos(ang) * probe, c.y + Math.sin(ang) * probe, c.radius * 0.9, true);
  if (free(a)) { f.steerSide = 0; return [vx, vy]; }
  // keep going round the same side once picked, or a head-on obstacle
  // makes it dither left-right forever
  const pref = f.steerSide || Math.sign(normalizeAngle(Math.atan2(ty - c.y, tx - c.x) - a)) || f.side;
  for (const d of [0.4, 0.8, 1.2, 1.6]) {
    for (const sg of [pref, -pref]) {
      const na = a + d * sg;
      if (free(na)) { f.steerSide = sg; return [Math.cos(na) * s, Math.sin(na) * s]; }
    }
  }
  return [vx, vy];
}

function walkAlongside(c, p, dt, world) {
  const map = world.map, f = followState(c, p), t = world.time, input = world.input;

  const last = f.crumbs[f.crumbs.length - 1];
  const gap = dist(last.x, last.y, p.x, p.y);
  if (gap > 6) f.crumbs = [{ x: p.x, y: p.y }];
  else if (gap > CRUMB_STEP) {
    f.crumbs.push({ x: p.x, y: p.y });
    if (f.crumbs.length > MAX_CRUMBS) f.crumbs.shift();
  }

  const pSpeed = Math.hypot(p.vx, p.vy);
  const moving = pSpeed > 0.4;
  if (moving) {
    const target = Math.atan2(p.vy, p.vx);
    const dh = normalizeAngle(target - f.heading);
    if (Math.abs(dh) > SHARP_TURN) {
      // sharp turn: keep standing on the same physical side and swing round
      f.heading = target;
      f.side = spatialSide(c, p, target) || f.side;
      f.lastSwitch = t;
    } else f.heading += dh * Math.min(1, dt * 6);
  }

  const mouse = input && input.mouse;
  if (mouse && (mouse.rightDown || (mouse.down && world.weapon && world.weapon !== 'fists'))) f.combatUntil = t + COMBAT_HOLD;
  const combat = t < f.combatUntil;
  const crouch = !!p.crouching;
  const off = combat ? COMBAT_SIDE : crouch ? SIDE_OFFSET_CROUCH : SIDE_OFFSET;
  const back = combat ? COMBAT_BACK : SHOULDER_LAG;
  const dP = dist(c.x, c.y, p.x, p.y);

  if (t >= f.scanAt) {
    f.scanAt = t + SCAN_INTERVAL;
    const h = f.heading, ax = Math.cos(h) * 1.6, ay = Math.sin(h) * 1.6;
    for (const s of [1, -1]) {
      const [sx, sy] = slotAt(p, h, s, off, back);
      // moving, props/peds at the slot are passing by - steer, don't switch
      f.free[s > 0 ? 0 : 1] = !blockedAt(world, sx, sy, RADIUS + 0.1, !moving)
        && !lineBlocked(map, p.x, p.y, sx, sy, true)
        && (!moving || !blockedAt(world, sx + ax, sy + ay, RADIUS + 0.1, false));
    }
    const cur = f.free[f.side > 0 ? 0 : 1], other = f.free[f.side > 0 ? 1 : 0];
    if (!cur && other && t - f.lastSwitch > SIDE_SWITCH_COOLDOWN) { f.side = -f.side; f.lastSwitch = t; }
    if (!cur && !other) { f.single = true; f.freeScans = 0; }
    else if (f.single && ++f.freeScans >= 3) f.single = false;
    f.losOk = !lineBlocked(map, c.x, c.y, p.x, p.y, false);
  }

  if (dP > CATCH_UP_START) f.catchUp = true;
  else if (dP < CATCH_UP_END) f.catchUp = false;

  const [tx, ty] = f.single && !combat ? trailPoint(f, p, FILE_GAP) : slotAt(p, f.heading, f.side, off, back);
  if (t >= f.pathAt) {
    f.pathAt = t + SCAN_INTERVAL;
    f.via = lineBlocked(map, c.x, c.y, tx, ty, true) ? trailVia(f, c, map) : null;
  }

  let vdx = 0, vdy = 0, maxS = 0;
  if (f.via) {
    const d = dist(c.x, c.y, f.via.x, f.via.y) || 1;
    maxS = f.catchUp || dP > 5 ? RUN_CATCH_SPEED : Math.max(pSpeed * 1.1 + 0.4, WALK_SPEED);
    vdx = (f.via.x - c.x) / d * maxS;
    vdy = (f.via.y - c.y) / d * maxS;
  } else {
    const ex = tx - c.x, ey = ty - c.y, e = Math.hypot(ex, ey);
    if (moving) f.repos = false;
    else if (e > 0.7) f.repos = true;
    else if (e < 0.3) f.repos = false;
    if (moving || f.repos) {
      // match the player's velocity, close the remaining gap gently
      vdx = p.vx + ex * GAIN;
      vdy = p.vy + ey * GAIN;
      maxS = f.catchUp ? RUN_CATCH_SPEED : Math.max(pSpeed * 1.1 + 0.4, Math.min(WALK_SPEED, 0.6 + e * 1.4));
      if (crouch && !f.catchUp) maxS = Math.min(maxS, 2.4);
      if (!moving && e < 1.5) maxS = Math.min(maxS, 1.3);
    }
  }
  if (dP < PERSONAL_SPACE && dP > 1e-3) {
    const k = (PERSONAL_SPACE - dP) * 6 / dP;
    vdx += (c.x - p.x) * k;
    vdy += (c.y - p.y) * k;
    maxS = Math.max(maxS, 1.5);
  }
  for (const ped of world.pedestrians || []) {
    if (ped.state === 'dead') continue;
    const dx = c.x - ped.x, dy = c.y - ped.y, d2 = dx * dx + dy * dy;
    if (d2 > PED_SPACE * PED_SPACE || d2 < 1e-6) continue;
    const d = Math.sqrt(d2), k = (PED_SPACE - d) * 3 / d;
    vdx += dx * k;
    vdy += dy * k;
  }
  const ds = Math.hypot(vdx, vdy);
  if (maxS > 0 && ds > maxS) { vdx *= maxS / ds; vdy *= maxS / ds; }
  [vdx, vdy] = steerAround(world, c, f, vdx, vdy, f.via ? f.via.x : tx, f.via ? f.via.y : ty);

  const cs = Math.hypot(c.vx, c.vy), nds = Math.hypot(vdx, vdy);
  const diff = cs > 1 && nds > 1 ? normalizeAngle(Math.atan2(vdy, vdx) - Math.atan2(c.vy, c.vx)) : 0;
  const swinging = f.swingDir && t < f.swingEnd && Math.abs(diff) > 0.3;
  if (!swinging) f.swingDir = 0;
  if (!swinging && moving && !f.via && !f.blocked && Math.abs(diff) > 2.2) {
    // reversing: swing round in a small arc away from the player instead of
    // braking to a halt and snapping 180 degrees; the turn direction is
    // latched so it can't flip-flop into walking away backwards
    const away = c.vx * (c.y - p.y) - c.vy * (c.x - p.x);
    f.swingDir = Math.sign(away) || Math.sign(diff) || 1;
    f.swingEnd = t + 0.7;
  }
  if (f.swingDir) {
    const na = Math.atan2(c.vy, c.vx) + f.swingDir * Math.min(Math.abs(diff), SWING_RATE * dt);
    const ns = Math.max(1.2, cs - ACCEL * 0.5 * dt);
    c.vx = Math.cos(na) * ns;
    c.vy = Math.sin(na) * ns;
  } else {
    const dvx = vdx - c.vx, dvy = vdy - c.vy, dv = Math.hypot(dvx, dvy), lim = (nds < cs ? BRAKE : ACCEL) * dt;
    if (dv > lim) { c.vx += dvx / dv * lim; c.vy += dvy / dv * lim; }
    else { c.vx = vdx; c.vy = vdy; }
  }

  const ox = c.x, oy = c.y;
  moveWithCollisions(c, dt, world);
  if (c.water) return;

  const want = Math.hypot(c.vx, c.vy);
  const made = Math.hypot(c.x - ox, c.y - oy) / dt;
  f.stuckT = want > 1 && made < want * 0.25 && dP > 4 ? f.stuckT + dt : 0;
  f.lostT = !f.losOk && dP > LOST_MIN_DIST ? f.lostT + dt : 0;
  if (f.stuckT > STUCK_TIME || f.lostT > LOST_TIME) {
    f.stuckT = 0;
    f.lostT = 0;
    sneakBackIn(c, p, world);
  }
  f.blocked = made < want * 0.9;
  if (f.blocked) {
    // sliding along a wall/prop: keep only the motion that actually happened
    c.vx = (c.x - ox) / dt;
    c.vy = (c.y - oy) / dt;
  }

  const sp = Math.hypot(c.vx, c.vy);
  c.crouching = crouch || (combat && sp < 2.5);
  if (sp > 0.6 && (moving || f.catchUp || f.via || dP > 3)) {
    c.angle = turnToward(c.angle, Math.atan2(c.vy, c.vx), FACE_RATE * dt);
    f.stillT = 0;
    f.poseUntil = 0;
    return;
  }
  if (moving) return;
  if (f.stillT === 0) { f.idleFace = p.angle; f.idleAt = t + 2 + Math.random() * 2; }
  f.stillT += dt;
  if (t >= f.idleAt) {
    // idle life: face the other one, look the same way, or glance around
    const r = Math.random();
    f.idleFace = r < 0.45 ? Math.atan2(p.y - c.y, p.x - c.x) : r < 0.75 ? p.angle : p.angle + (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 0.6);
    f.idleAt = t + 3 + Math.random() * 4;
    if (f.stillT > 6 && !combat && Math.random() < 0.3) f.poseUntil = t + 2.5 + Math.random() * 3;
  }
  if (t < f.poseUntil) c.pose = 'phone';
  c.angle = turnToward(c.angle, f.idleFace, IDLE_FACE_RATE * dt);
}

// A mission parks the companion: world.companionHold = { x, y, face, crouch,
// pose } (walks there and waits) or { vehicle } (sits in it as passenger);
// heist.js uses it for the lookout at the door and the getaway boat.
function holdCompanion(c, h, dt, world) {
  if (h.vehicle) {
    const v = h.vehicle;
    if (!world.vehicles.includes(v) || v.sinking || (v.passenger && v.passenger !== 'companion')) return false;
    if (c.inVehicle !== v) {
      if (c.inVehicle) c.inVehicle.passenger = null;
      leaveWater(c);
      c.inVehicle = v;
      v.passenger = 'companion';
    }
    c.x = v.x; c.y = v.y; c.vx = 0; c.vy = 0;
    return true;
  }
  if (c.inVehicle || c.water) return false;
  const d = dist(c.x, c.y, h.x, h.y);
  if (d > 30) { c.x = h.x; c.y = h.y; c.vx = 0; c.vy = 0; return true; }
  if (d > 0.3) {
    const x0 = c.x, y0 = c.y;
    seekTowards(c, h.x, h.y, d > 6 ? CATCH_UP_SPEED : WALK_SPEED, dt, world.map);
    h.stuck = Math.hypot(c.x - x0, c.y - y0) < 0.02 ? (h.stuck || 0) + dt : 0;
    if (h.stuck > 2.5) { c.x = h.x; c.y = h.y; h.stuck = 0; }
    return true;
  }
  c.vx = 0; c.vy = 0;
  if (h.face != null) c.angle = turnToward(c.angle, h.face, IDLE_FACE_RATE * dt);
  c.crouching = !!h.crouch;
  c.pose = h.pose || null;
  return true;
}

export function updateCompanion(dt, world) {
  stepCompanion(dt, world);
  followGround(world);
  applyPoseSource(world.companion);
}

// Heights on the ring (elevation.js): stay on the deck / in the cutting the
// player is on, behind its walls and barriers.
function followGround(world) {
  const c = world.companion, map = world.map;
  if (!c) return;
  if (c.inVehicle) { c.gz = c.inVehicle.z || 0; return; }
  if (!map.elev || !map.elev.has || c.water) { c.gz = 0; return; }
  const p = world.player;
  const pz = (p.gz || 0) + (p.z || 0);
  const hint = dist(c.x, c.y, p.x, p.y) < 4 ? pz : c.gz || 0;
  const w = map.terrainOn ? map.resolveWalls(c.x, c.y, hint, c.radius) : resolveElevWalls(map.elev, c.x, c.y, hint, c.radius);
  if (w) [c.x, c.y] = w;
  c.gz = map.groundHeightAt(c.x, c.y, hint);
}

// De gast (plek 1, de metgezel) doet iets met E (docs/COOP-GAST.md): zit ze in het voertuig van de host, dan stapt ze uit zodra het
// bijna stilstaat; staat ze erbuiten en zit de host in een voertuig met een vrije plek dichtbij, dan stapt ze in.
function coopGastGebruik(c, p, world) {
  if (!world.coop || !world.coop.remote) return;
  const meld = (t) => { if (world.coopMeld) world.coopMeld(1, t); };
  if (c.inVehicle) {
    const v = c.inVehicle;
    if (!kanUitstappen(v)) { meld('Stap uit als het voertuig bijna stilstaat.'); return; }
    v.passenger = null;
    c.inVehicle = null;
    [c.x, c.y] = findExitSpot(v, c.radius, world.map, EXIT_RIGHT_FIRST);
    c.vx = 0; c.vy = 0;
    c.coopUit = true;
    if (world.coopWielSlot === 1) world.coopWielSlot = null; // zonder bijrijder geen stuur
    return;
  }
  const v = p.inVehicle;
  if (!v) { if ((world.vehicles || []).some((q) => dist(c.x, c.y, q.x, q.y) < 6)) meld('Je kunt alleen meerijden als de ander in een voertuig zit.'); return; } // E bij een geparkeerd voertuig deed niets (#388)
  const canRide = !v.sinking && !v.riderOff && !(v.isHeli && (!v.onGround || Math.abs((v.z || 0) - (c.gz || 0)) > 2.5));
  if (!canRide || v.passenger) { meld(v.passenger ? 'Er is geen plek meer in dit voertuig.' : 'Hier kun je nu niet instappen.'); return; }
  if (dist(c.x, c.y, v.x, v.y) >= (v.isBoat ? BOARD_DIST + 2.5 : BOARD_DIST) + 2) { meld('Loop naar het voertuig om in te stappen.'); return; }
  c.inVehicle = v;
  v.passenger = 'companion';
  c.coopUit = false;
  c.vx = 0; c.vy = 0;
}

function stepCompanion(dt, world) {
  const c = world.companion;
  const p = world.player;
  c.character = p.character === 'tammo' ? 'anita' : 'tammo';
  clearIdle(c);

  if (c.state === 'dead') {
    if (world.time >= c.deadUntil) respawnCompanion(world);
    return;
  }
  if (isKnockedDown(c, world)) { c.vx = 0; c.vy = 0; return; }
  if (world.companionHold && holdCompanion(c, world.companionHold, dt, world)) return;
  // samen spelen (#291): de gast drukte op E: als bijrijder uitstappen (bijna stilstaand) of weer instappen
  if (!p.inVehicle) c.coopUit = !!(world.coop && world.coop.remote); // de host stapte uit: ze loopt weer gewoon mee; een echte speler stapt zelf in met E, ze gaat niet vanzelf mee als de ander instapt (#388)
  if (world.coopGebruik) { world.coopGebruik = false; coopGastGebruik(c, p, world); }
  // mini co-op (coop.js): a second human steers the companion on foot (ook naast het voertuig van de host als ze zelf is uitgestapt)
  if (world.coop && (!p.inVehicle || c.coopUit) && !c.inVehicle && !c.water && coopStep(c, dt, world, moveWithCollisions)) return;

  if (c.water && !c.inVehicle) {
    const boat = p.inVehicle && p.inVehicle.isBoat && !p.inVehicle.passenger && !p.inVehicle.sinking ? p.inVehicle : null;
    if (boat && c.water !== 'climb' && dist(c.x, c.y, boat.x, boat.y) < BOARD_DIST + 1) {
      leaveWater(c);
      c.inVehicle = boat;
      boat.passenger = 'companion';
      c.vx = 0;
      c.vy = 0;
      return;
    }
    if (dist(c.x, c.y, p.x, p.y) > TELEPORT_DIST) teleportNearPlayer(c, p, world.map);
    else updateCompanionWater(c, p, dt, world);
    return;
  }

  if (p.inVehicle) {
    if (c.inVehicle === p.inVehicle) return; // already riding along
    if (c.inVehicle) { c.inVehicle.passenger = null; c.inVehicle = null; }
    const v = p.inVehicle;
    // every vehicle takes the two of them: a bike on the rack (or the
    // fatbike's long saddle), a step standing behind; a boat is stepped
    // into from the quay edge, so it gets a longer reach
    // a helicopter only takes them on board while it stands on their level
    const heliAway = v.isHeli && (!v.onGround || Math.abs((v.z || 0) - (c.gz || 0)) > 2.5);
    if (heliAway) { c.vx = 0; c.vy = 0; return; }
    const canRide = !v.sinking && !v.riderOff;
    if (canRide && !v.passenger && dist(c.x, c.y, v.x, v.y) < (v.isBoat ? BOARD_DIST + 2.5 : BOARD_DIST)) {
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
      if (!inMapWater(world.map, c.x, c.y)) { c.x = v.x; c.y = v.y; }
      c.water = 'swim'; c.swimming = true; c.z = WATER_Y; c.vx = 0; c.vy = 0;
      return;
    }
    stopVehicle(v);
    [c.x, c.y] = findExitSpot(v, c.radius, world.map, EXIT_RIGHT_FIRST);
    return;
  }

  if (dist(c.x, c.y, p.x, p.y) > TELEPORT_DIST) {
    if (!sneakBackIn(c, p, world)) teleportNearPlayer(c, p, world.map);
    return;
  }

  if (p.swimming) {
    // player went into the water - just head straight after them
    clearIdle(c);
    const behindAngle = Math.atan2(p.y - c.y, p.x - c.x);
    const tx = p.x - Math.cos(behindAngle) * FOLLOW_DIST;
    const ty = p.y - Math.sin(behindAngle) * FOLLOW_DIST;
    if (dist(c.x, c.y, p.x, p.y) > ARRIVE_SLACK) {
      seekTowards(c, tx, ty, CATCH_UP_SPEED, dt, world.map, true);
      if (c.water) return;
    } else {
      c.vx = 0;
      c.vy = 0;
    }
  } else {
    walkAlongside(c, p, dt, world);
    if (c.water) return;
  }

  for (const v of world.vehicles) {
    if (v.isBoat || v.sinking || v === c.inVehicle) continue;
    if (Math.abs(v.x - c.x) > v.halfLen + 1 || Math.abs(v.y - c.y) > v.halfLen + 1) continue;
    if (v.isHeli && Math.abs((v.z || 0) - (c.gz || 0)) > 2) continue;
    const push = pushCircleOutOfVehicle(c.x, c.y, c.radius, v);
    if (!push) continue;
    // parked, slow or wrecked: a solid body to walk around; a bike only
    // shoves, like it does the player
    if (v.wrecked || Math.abs(v.speed) < VEHICLE_HIT_SPEED || v.isBike || v.isScooter) {
      [c.x, c.y] = resolveBuildingCollisions(push.x, push.y, c.radius, world.map);
      continue;
    }
    {
      c.state = 'dead';
      c.health = 0;
      c.vx = 0;
      c.vy = 0;
      c.deadUntil = world.time + DEAD_DURATION;
      const away = Math.atan2(c.y - v.y, c.x - v.x), sp = Math.abs(v.speed);
      knockDown(c, world, {
        kind: 'hit', dead: true, vz: 1.2 + sp * 0.22,
        vx: Math.cos(v.angle) * v.speed * 0.9 + Math.cos(away) * sp * 0.35,
        vy: Math.sin(v.angle) * v.speed * 0.9 + Math.sin(away) * sp * 0.35,
      });
      const name = c.character === 'tammo' ? 'Tammo' : 'Tessa';
      world.addMessage(`${name} is aangereden!`, 3);
      break;
    }
  }
}
