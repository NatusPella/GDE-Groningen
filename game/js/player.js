import { closestPointOnSegment, normalizeAngle, pointInPolygon, isInWater, inWaterPoly, WATER_Y, clamp } from './util.js';
import { findNearestVehicle, resolveVehicleBuildingCollision, pushCircleOutOfVehicle, reportImpact, tickSinkingVehicles } from './vehicle.js';
import { playAutoGejatLine } from './audio.js';
import { requestRespawn } from './world.js';
import { getSettings } from './settings.js';

const RADIUS = 0.35;
const WALK_SPEED = 4.2;
const RUN_SPEED = 7.5;
const CROUCH_SPEED = 2.0;
const FACE_TURN_RATE = 12; // rad/s the body turns toward its movement direction
const MOUSE_TURN_PER_PX = 0.0025; // rad per px of mouse motion, camera orbit
const KISS_DIST = 1.8;
const KISS_HEAL = 25;
const KISS_COOLDOWN = 3;
let kissReadyAt = 0;
const JUMP_SPEED = 5.2;
const GRAVITY = 16;
const SHOVE_DECAY = 6; // 1/s
const MAX_SHOVE = 7; // m/s
export const SWIM_SPEED = 1.8;
const SWIM_SPRINT = 3.0;
const SWIM_TILT_MOVING = -0.85;
const SWIM_TILT_IDLE = -0.25;
const SWIM_EXHAUSTED_AFTER = 150; // s in the water before it starts to hurt
const EXHAUST_RATE = 2; // health/sec
export const CLIMB_TIME = 0.6;
const CLIMB_REACH = 1.3;
const CLIMB_SCAN_INTERVAL = 0.15;
const SPLASH_LIFE = 1.1;

const STEAL_HOLD_S = 0.4;
// AI traffic being driven (or a police car) is stolen, not just entered
function isStealTarget(v) {
  return !v.driver && !v.wrecked && !v.sinking && !v.isBoat && !v.isHeroCar && !v.missionCar && (!!v.road || (v.isPolice && !v.hijacked));
}

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.angle = 0;
    this.vx = 0;
    this.vy = 0;
    this.moving = false;
    this.radius = RADIUS;
    this.inVehicle = null;
    this.character = 'tammo'; // 'tammo' | 'anita' - cosmetic only, 3D layer reads this to pick a model preset
    this.z = 0; // on-foot jump height above ground, meters - vehicles ignore this entirely
    this.vz = 0;
    this.crouching = false;
    this.shoveX = 0; // m/s of push-back from bumping into cars/people, decays
    this.shoveY = 0;
    this.water = null; // null | 'fall' | 'swim' | 'climb'
    this.swimming = false;
    this.swimTilt = 0;
    this.swimStamina = 1;
    this.waterTime = 0;
    this.canClimbOut = false;
    this.climb = null;
    this.climbSpot = null;
    this.climbScanAt = 0;
  }

  update(dt, world) {
    const { input, map, vehicles } = world;
    if (world.camYaw == null) world.camYaw = this.angle;
    // on foot the mouse orbits the camera (world.camYaw, the horizontal
    // direction it looks in); in a vehicle scene3d.js owns the orbit
    if (!this.inVehicle && input.lookActive()) {
      world.camYaw = normalizeAngle(world.camYaw + input.mouse.dx * MOUSE_TURN_PER_PX * getSettings().mouseSensitivity);
    }
    tickSinkingVehicles(world);
    this.updateCharacterSwitch(world);
    if (input.wasPressed('e') || input.wasPressed('f')) {
      if (this.water) {
        if (this.water === 'swim' && !this.inVehicle) this.swimInteract(world);
      } else if (!this.tryKiss(world)) {
        const target = this.inVehicle ? null : findNearestVehicle(this.x, this.y, vehicles, 2.5);
        if (target && isStealTarget(target)) {
          // yanking someone out of a moving car takes a short hold of E
          this.stealHold = { v: target, t: 0 };
        } else {
          const wasInVehicle = !!this.inVehicle;
          this.tryEnterExit(map, vehicles, world);
          if (!wasInVehicle && this.inVehicle) playAutoGejatLine(world);
        }
      }
    }
    if (this.stealHold) {
      const h = this.stealHold;
      const held = input.isDown('e') || input.isDown('f');
      const near = Math.hypot(h.v.x - this.x, h.v.y - this.y) < 3.2;
      if (!held || !near || this.inVehicle || h.v.driver || h.v.wrecked) {
        this.stealHold = null;
        world.promptHold = 0;
      } else {
        h.t += dt;
        world.promptHold = Math.min(1, h.t / STEAL_HOLD_S);
        if (h.t >= STEAL_HOLD_S) {
          this.stealHold = null;
          world.promptHold = 0;
          this.tryEnterExit(map, vehicles, world);
          if (this.inVehicle) playAutoGejatLine(world);
        }
      }
    }

    if (this.inVehicle) {
      const v = this.inVehicle;
      if (v.sinking) { this.x = v.x; this.y = v.y; this.angle = v.angle; return; }
      if (v.wrecked) { this.exitVehicle(map, world); }
      else { this.driveVehicle(dt, input, map); return; }
    }

    if (this.water || isInWater(map, this.x, this.y)) {
      if (!this.water) this.startWaterFall();
      this.updateWater(dt, world);
      return;
    }

    // jump/crouch - on foot only; SPACE is also "remmen" while driving
    // (handled in driveVehicle, never reached here) and crouching just
    // slows movement and shrinks the 3D model, no real collision-height
    // change since building/water collision is 2D (x/y) anyway
    if (input.wasPressed(' ') && this.z <= 0) this.vz = JUMP_SPEED;
    this.vz -= GRAVITY * dt;
    this.z = Math.max(0, this.z + this.vz * dt);
    if (this.z <= 0) this.vz = 0;
    this.crouching = input.isDown('control') && this.z <= 0;

    // GTA V-style: WASD moves relative to the camera, the body turns to face
    // the movement; while attacking/aiming the body faces the camera instead
    const speed = this.crouching ? CROUCH_SPEED : input.isDown('shift') ? RUN_SPEED : WALK_SPEED;
    const aiming = input.mouse.down || input.mouse.rightDown;
    const dir = cameraRelativeMove(input, world.camYaw);
    this.moving = !!dir;
    if (aiming) this.angle = world.camYaw;
    else if (dir) this.angle = turnToward(this.angle, dir.angle, FACE_TURN_RATE * dt);
    if (dir) {
      this.vx = Math.cos(dir.angle) * speed;
      this.vy = Math.sin(dir.angle) * speed;
    } else {
      this.vx = 0;
      this.vy = 0;
    }

    // a single step longer than the radius can tunnel past a thin wall edge
    const steps = Math.max(1, Math.ceil(Math.hypot(this.vx, this.vy) * dt / (this.radius * 0.9)));
    const sdt = dt / steps;
    for (let s = 0; s < steps; s++) {
      let nextX = this.x + this.vx * sdt;
      let nextY = this.y + this.vy * sdt;
      [nextX, nextY] = resolveBuildingCollisions(nextX, nextY, this.radius, map);
      this.x = nextX;
      this.y = nextY;
      if (isInWater(map, nextX, nextY)) { this.startWaterFall(); return; }
    }
    this.resolveBodyContacts(dt, world);
  }

  startWaterFall() {
    this.water = 'fall';
    this.swimming = true;
    this.crouching = false;
    this.waterTime = 0;
    this.shoveX = 0;
    this.shoveY = 0;
  }

  enterSwim(z = WATER_Y) {
    this.water = 'swim';
    this.swimming = true;
    this.crouching = false;
    this.z = Math.min(this.z, z);
    this.vz = 0;
    this.vx = 0;
    this.vy = 0;
    this.waterTime = 0;
    this.climbScanAt = 0;
  }

  leaveWater() {
    this.water = null;
    this.swimming = false;
    this.z = 0;
    this.vz = 0;
    this.swimTilt = 0;
    this.canClimbOut = false;
    this.climb = null;
    this.climbSpot = null;
    this.waterTime = 0;
  }

  // Called by vehicle.js when the bike/scooter/car the player sits in goes
  // under; drops them into the water next to it.
  ejectIntoWater(v, world) {
    if (this.inVehicle !== v) return;
    v.driver = null;
    v.horn = false;
    v.throttle = 0;
    this.inVehicle = null;
    const nx = -Math.sin(v.angle), ny = Math.cos(v.angle);
    const off = (v.halfWid || 0.5) + 0.5;
    this.x = v.x; this.y = v.y;
    for (const s of EXIT_LEFT_FIRST) {
      const ex = v.x + nx * off * s, ey = v.y + ny * off * s;
      if (inWaterPoly(world.map, ex, ey)) { this.x = ex; this.y = ey; break; }
    }
    this.angle = v.angle;
    this.z = v.sinking ? v.sinking.z : WATER_Y;
    this.enterSwim(WATER_Y);
  }

  updateWater(dt, world) {
    const { map, input } = world;
    if (this.water !== 'climb' && !inWaterPoly(map, this.x, this.y)) { this.leaveWater(); return; }

    if (this.water === 'fall') {
      this.vz -= GRAVITY * dt;
      this.z += this.vz * dt;
      const nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
      if (inWaterPoly(map, nx, ny)) { this.x = nx; this.y = ny; } else { this.vx = 0; this.vy = 0; }
      if (this.z <= WATER_Y) {
        world.particles.push({ kind: 'splash', x: this.x, y: this.y, until: world.time + SPLASH_LIFE });
        const keepZ = this.z;
        this.enterSwim(WATER_Y);
        this.z = keepZ;
      }
      this.canClimbOut = false;
      return;
    }

    if (this.water === 'climb') {
      const c = this.climb;
      c.t += dt;
      const k = Math.min(1, c.t / CLIMB_TIME);
      const e = k * k * (3 - 2 * k);
      const lift = Math.min(1, k / 0.6);
      const slide = Math.max(0, (k - 0.45) / 0.55);
      this.x = c.fromX + (c.toX - c.fromX) * slide * slide * (3 - 2 * slide);
      this.y = c.fromY + (c.toY - c.fromY) * slide * slide * (3 - 2 * slide);
      this.z = c.fromZ + (0.15 - c.fromZ) * Math.sin(lift * Math.PI / 2) - 0.15 * e;
      this.swimTilt = -0.9 * (1 - e);
      this.vx = 0; this.vy = 0;
      this.canClimbOut = false;
      if (k >= 1) { this.leaveWater(); [this.x, this.y] = resolveBuildingCollisions(this.x, this.y, this.radius, map); }
      return;
    }

    const dir = cameraRelativeMove(input, world.camYaw);
    if (dir) this.angle = turnToward(this.angle, dir.angle, FACE_TURN_RATE * 0.6 * dt);
    const throttle = dir ? 1 : 0;
    const sprint = input.isDown('shift') && throttle > 0 && this.swimStamina > 0;
    this.swimStamina = clamp(this.swimStamina + (sprint ? -dt / 6 : dt / 5), 0, 1);
    const speed = (sprint ? SWIM_SPRINT : SWIM_SPEED) * throttle;
    const k = Math.min(1, dt * 3);
    this.vx += (Math.cos(this.angle) * speed - this.vx) * k;
    this.vy += (Math.sin(this.angle) * speed - this.vy) * k;
    this.moving = throttle !== 0;

    let blocked = false;
    const nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
    if (inWaterPoly(map, nx, ny)) { this.x = nx; this.y = ny; }
    else {
      blocked = true;
      if (inWaterPoly(map, nx, this.y)) this.x = nx;
      else if (inWaterPoly(map, this.x, ny)) this.y = ny;
    }

    const tiltTarget = this.moving ? SWIM_TILT_MOVING : SWIM_TILT_IDLE;
    this.swimTilt += (tiltTarget - this.swimTilt) * Math.min(1, dt * 4);
    this.z += (swimDepth(this.swimTilt, world.time) - this.z) * Math.min(1, dt * 5);

    if (world.time >= this.climbScanAt) {
      this.climbScanAt = world.time + CLIMB_SCAN_INTERVAL;
      this.climbSpot = findClimbSpot(map, this.x, this.y, this.angle);
    }
    this.canClimbOut = !!this.climbSpot;
    if (this.climbSpot && this.climbSpot.bank && blocked && throttle > 0) this.startClimb(this.climbSpot);

    this.waterTime += dt;
    if (this.waterTime > SWIM_EXHAUSTED_AFTER) {
      if (!this.exhaustWarned) { this.exhaustWarned = true; world.addMessage('Je raakt uitgeput, klim eruit!', 3); }
      world.health = Math.max(0, world.health - EXHAUST_RATE * dt);
      if (world.health <= 0) { this.leaveWater(); requestRespawn(world); }
    } else this.exhaustWarned = false;
  }

  swimInteract(world) {
    const boat = findNearestVehicle(this.x, this.y, world.vehicles, 2.8);
    if (boat && boat.isBoat && !boat.driver && !boat.wrecked) {
      this.leaveWater();
      this.tryEnterExit(world.map, world.vehicles, world);
      return;
    }
    if (this.climbSpot) this.startClimb(this.climbSpot);
  }

  startClimb(spot) {
    this.water = 'climb';
    this.climb = { t: 0, fromX: this.x, fromY: this.y, fromZ: this.z, toX: spot.x, toY: spot.y };
    this.angle = Math.atan2(spot.y - this.y, spot.x - this.x);
    this.canClimbOut = false;
  }

  // On foot the player is solid against vehicles and people: pushed out of
  // their footprint, with a shove that scales with how fast they were moving.
  resolveBodyContacts(dt, world) {
    const { map } = world;
    for (const v of world.vehicles) {
      if (v.isBoat || Math.abs(v.x - this.x) > v.halfLen + 1 || Math.abs(v.y - this.y) > v.halfLen + 1) continue;
      const push = pushCircleOutOfVehicle(this.x, this.y, this.radius, v);
      if (!push) continue;
      [this.x, this.y] = resolveBuildingCollisions(push.x, push.y, this.radius, map);
      const closing = (Math.cos(v.angle) * v.speed + v.driftX) * push.nx + (Math.sin(v.angle) * v.speed + v.driftY) * push.ny;
      if (closing > 1) {
        const fresh = Math.hypot(this.shoveX, this.shoveY) < 1;
        const kick = Math.min(MAX_SHOVE, 1 + closing * 0.6);
        this.shoveX += push.nx * kick;
        this.shoveY += push.ny * kick;
        if (fresh) reportImpact(world, this.x, this.y, closing * 0.6, true);
      }
    }
    for (const p of world.pedestrians || []) {
      if (p.state === 'dead') continue;
      const dx = this.x - p.x, dy = this.y - p.y;
      const min = this.radius + (p.radius || 0.35);
      const d2 = dx * dx + dy * dy;
      if (d2 >= min * min || d2 < 1e-8) continue;
      const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, overlap = min - d;
      this.x += nx * overlap * 0.5; this.y += ny * overlap * 0.5;
      p.x -= nx * overlap * 0.5; p.y -= ny * overlap * 0.5;
      this.shoveX += nx * 6 * dt; this.shoveY += ny * 6 * dt;
    }
    const sh = Math.hypot(this.shoveX, this.shoveY);
    if (sh > MAX_SHOVE) { this.shoveX *= MAX_SHOVE / sh; this.shoveY *= MAX_SHOVE / sh; }
    if (sh > 0.05) {
      [this.x, this.y] = resolveBuildingCollisions(this.x + this.shoveX * dt, this.y + this.shoveY * dt, this.radius, map);
      const decay = Math.exp(-SHOVE_DECAY * dt);
      this.shoveX *= decay;
      this.shoveY *= decay;
    } else {
      this.shoveX = 0;
      this.shoveY = 0;
    }
  }

  // Tammo and Anita are always both out in the world (see companion.js) -
  // switching just trades physical state (position/velocity/vehicle) between
  // this Player and world.companion, it never changes which object IS "the
  // player" elsewhere in the codebase. Blocked while driving without the
  // companion in the very same vehicle - there's no sensible "teleport into
  // a car you were never in" swap, only "swap seats" or "swap on foot".
  updateCharacterSwitch(world) {
    if (!world.input.wasPressed('c')) return;
    const c = world.companion;
    if (!c || c.state === 'dead') return;
    if (this.inVehicle && this.inVehicle !== c.inVehicle) {
      const other = this.character === 'tammo' ? 'Anita' : 'Tammo';
      world.addMessage(`${other} moet eerst instappen`, 2.5);
      return;
    }
    [this.x, c.x] = [c.x, this.x];
    [this.y, c.y] = [c.y, this.y];
    [this.angle, c.angle] = [c.angle, this.angle];
    [this.vx, c.vx] = [c.vx, this.vx];
    [this.vy, c.vy] = [c.vy, this.vy];
    [this.inVehicle, c.inVehicle] = [c.inVehicle, this.inVehicle];
    [this.character, c.character] = [c.character, this.character];
    for (const k of ['water', 'swimming', 'z', 'vz', 'swimTilt', 'climb']) [this[k], c[k]] = [c[k] ?? null, this[k]];
    this.swimming = !!this.water; this.z = this.z || 0; this.vz = this.vz || 0; this.swimTilt = this.swimTilt || 0;
    if (this.water === 'swim') this.climbScanAt = 0;
    this.canClimbOut = false;
    if (this.inVehicle) this.inVehicle.driver = 'player';
    if (c.inVehicle) c.inVehicle.passenger = 'companion';
    world.addMessage(this.character === 'tammo' ? 'Je bestuurt nu Tammo' : 'Je bestuurt nu Anita');
  }

  // E near your companion (on foot, both out of any vehicle) is a kiss
  // instead of a vehicle interaction - shows a heart above them and heals
  // whichever one isn't currently being controlled. Returns true if it
  // fired, so tryEnterExit is skipped for this keypress.
  tryKiss(world) {
    const c = world.companion;
    if (!c || c.state === 'dead' || this.inVehicle || c.inVehicle) return false;
    if (Math.hypot(c.x - this.x, c.y - this.y) > KISS_DIST) return false;
    if (world.time < kissReadyAt) return false;
    kissReadyAt = world.time + KISS_COOLDOWN;
    c.health = Math.min(100, c.health + KISS_HEAL);
    world.particles.push({
      x: (this.x + c.x) / 2,
      y: (this.y + c.y) / 2,
      until: world.time + 1.4,
      kind: 'kiss',
    });
    const name = c.character === 'tammo' ? 'Tammo' : 'Anita';
    world.addMessage(`Kusje voor ${name}! (+${KISS_HEAL} gezondheid)`, 2.5);
    return true;
  }

  tryEnterExit(map, vehicles, world = null) {
    if (this.inVehicle) {
      if (this.inVehicle.sinking && this.inVehicle.sinking.phase === 'fall') return;
      this.exitVehicle(map, world);
      return;
    }
    const v = findNearestVehicle(this.x, this.y, vehicles, 2.5);
    if (v && !v.driver && !v.wrecked && !v.sinking) {
      v.driver = 'player';
      v.road = null; // player takes manual control
      if (v.isPolice) v.hijacked = true;
      this.inVehicle = v;
      pushVehicleAudio(world, v, 'door_open', 'engine_start');
    }
  }

  exitVehicle(map, world = null) {
    const v = this.inVehicle;
    if (v.sinking && world) { this.ejectIntoWater(v, world); return; }
    v.driver = null;
    v.horn = false;
    v.handbrake = false;
    v.throttle = 0;
    this.inVehicle = null;
    pushVehicleAudio(world, v, v.wrecked ? null : 'engine_stop', 'door_close');
    stopVehicle(v);
    [this.x, this.y] = findExitSpot(v, this.radius, map, EXIT_LEFT_FIRST);
    this.angle = v.angle;
  }

  driveVehicle(dt, input, map) {
    const v = this.inVehicle;
    const [ax, ay] = input.axis();
    const throttle = ay < 0 ? 1 : ay > 0 ? -1 : 0;
    const brake = input.isDown(' ');
    v.handbrake = brake;
    v.throttle = throttle;
    v.horn = input.isDown('h');
    const px = v.x, py = v.y, pa = v.angle;
    v.applyControls(dt, throttle, ax, brake && v.speed !== 0);
    resolveVehicleBuildingCollision(v, map, dt);
    if (v.isBoat) {
      // boats stay on the water: the hull (centre and bow/stern) can't leave it
      const h = (v.model.len || 4) * 0.45 * Math.sign(v.speed || 1);
      const bowX = v.x + Math.cos(v.angle) * h, bowY = v.y + Math.sin(v.angle) * h;
      if (!inWaterPoly(map, v.x, v.y) || !inWaterPoly(map, bowX, bowY)) {
        v.x = px; v.y = py; v.angle = pa;
        v.speed *= -0.25;
      }
    }
    this.x = v.x;
    this.y = v.y;
    this.angle = v.angle;
  }
}

// WASD relative to the camera heading: W away from the camera, A/D strafe.
// (-sin, cos) is the right-hand side of a heading (three.z = world.y).
function cameraRelativeMove(input, camYaw) {
  const [ax, ay] = input.axis();
  if (!ax && !ay) return null;
  const c = Math.cos(camYaw), s = Math.sin(camYaw);
  const mx = c * -ay - s * ax, my = s * -ay + c * ax;
  return { angle: Math.atan2(my, mx) };
}

function turnToward(from, to, maxStep) {
  const d = normalizeAngle(to - from);
  return normalizeAngle(from + Math.max(-maxStep, Math.min(maxStep, d)));
}

// Door/engine cues for audio.js; bikes and steps have neither.
function pushVehicleAudio(world, v, first, second) {
  if (!world || v.isBike || v.isScooter) return;
  const q = world.audioEvents || (world.audioEvents = []);
  const door = !v.isBoat;
  if (first && (door || !first.startsWith('door'))) q.push({ kind: first, x: v.x, y: v.y });
  if (second && (door || !second.startsWith('door'))) q.push({ kind: second, x: v.x, y: v.y });
}

export function stopVehicle(v) {
  v.speed = 0;
  v.driftX = 0;
  v.driftY = 0;
}

// Mesh-origin height that keeps the head just above the surface at a given
// forward lean, with a gentle bob.
export function swimDepth(tilt, time, phase = 0) {
  return WATER_Y + 0.1 - 1.6 * Math.cos(tilt) + Math.sin(time * 2.4 + phase) * 0.04;
}

const CLIMB_DIRS = 16;
// Nearest dry, walkable spot along the waterline within reach, preferring
// the direction the swimmer faces. `bank` marks park/grass banks, which
// are low enough to just walk out of.
export function findClimbSpot(map, x, y, angle, reach = CLIMB_REACH) {
  for (let r = 0.45; r <= reach; r += 0.2) {
    let best = null, bestScore = -Infinity;
    for (let i = 0; i < CLIMB_DIRS; i++) {
      const a = (i / CLIMB_DIRS) * Math.PI * 2;
      const cx = Math.cos(a), cy = Math.sin(a);
      const sx = x + cx * r, sy = y + cy * r;
      if (inWaterPoly(map, sx, sy)) continue;
      const lx = sx + cx * 0.5, ly = sy + cy * 0.5;
      if (inWaterPoly(map, lx, ly) || isInsideBuilding(map, lx, ly)) continue;
      const score = Math.cos(normalizeAngle(a - angle));
      if (score > bestScore) { bestScore = score; best = { x: lx, y: ly }; }
    }
    if (best) {
      best.bank = map.greenNear(best.x, best.y, 0.5).some((g) => pointInPolygon(best.x, best.y, g.pts));
      return best;
    }
  }
  return null;
}

function isInsideBuilding(map, x, y) {
  for (const b of map.buildingsNear(x, y, 0.5)) {
    const [minx, miny, maxx, maxy] = b.bounds;
    if (x < minx || x > maxx || y < miny || y > maxy) continue;
    if (pointInPolygon(x, y, b.pts)) return true;
  }
  return false;
}

// Sides as multipliers of the vehicle's (-sin, cos) normal, which is its
// right-hand side (three.z = world.y). Drivers get out on the left (NL),
// passengers on the right.
export const EXIT_LEFT_FIRST = [-1, 1];
export const EXIT_RIGHT_FIRST = [1, -1];

export function findExitSpot(v, radius, map, sides = EXIT_LEFT_FIRST) {
  const nx = -Math.sin(v.angle), ny = Math.cos(v.angle);
  const off = v.halfWid + 0.7;
  for (const s of sides) {
    const ex = v.x + nx * off * s, ey = v.y + ny * off * s;
    if (isInsideBuilding(map, ex, ey) || isInWater(map, ex, ey)) continue;
    return resolveBuildingCollisions(ex, ey, radius, map);
  }
  return map.escapeBuilding(v.x + nx * off * sides[0], v.y + ny * off * sides[0]);
}

// Push a circle out of any nearby building polygon it overlaps - including
// when its centre is already inside, where the nearest-edge vector points
// outward rather than away from the wall.
export function resolveBuildingCollisions(x, y, radius, map) {
  const nearby = map.buildingsNear(x, y, radius + 2);
  // 2 passes wasn't always enough in a tight gap between two close
  // buildings - each pass could push back toward the other wall without
  // fully resolving, reading as "stuck" even though it's slowly still
  // making progress frame to frame. More passes converge properly within
  // a single call instead of relying on that slow multi-frame creep.
  for (let iter = 0; iter < 5; iter++) {
    for (const b of nearby) {
      const [minx, miny, maxx, maxy] = b.bounds;
      if (x < minx - radius || x > maxx + radius || y < miny - radius || y > maxy + radius) continue;
      const pts = b.pts;
      let bestDist2 = Infinity, bestX = 0, bestY = 0, bestI = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const cp = closestPointOnSegment(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
        if (cp.dist2 < bestDist2) { bestDist2 = cp.dist2; bestX = cp.x; bestY = cp.y; bestI = i; }
      }
      const d = Math.sqrt(bestDist2);
      const inside = pointInPolygon(x, y, pts);
      if (!inside && d >= radius) continue;
      let ox, oy;
      if (d > 1e-6) {
        ox = (x - bestX) / d;
        oy = (y - bestY) / d;
        if (inside) { ox = -ox; oy = -oy; }
      } else {
        const ex = pts[bestI + 1][0] - pts[bestI][0], ey = pts[bestI + 1][1] - pts[bestI][1];
        const el = Math.hypot(ex, ey) || 1;
        ox = -ey / el;
        oy = ex / el;
        if (pointInPolygon(bestX + ox * radius, bestY + oy * radius, pts)) { ox = -ox; oy = -oy; }
      }
      x = bestX + ox * radius;
      y = bestY + oy * radius;
    }
  }
  return [x, y];
}
