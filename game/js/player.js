import { closestPointOnSegment, normalizeAngle, pointInPolygon, isInWater } from './util.js';
import { findNearestVehicle, resolveVehicleBuildingCollision, pushCircleOutOfVehicle, reportImpact } from './vehicle.js';
import { playAutoGejatLine } from './audio.js';
import { requestRespawn } from './world.js';
import { getSettings } from './settings.js';

const RADIUS = 0.35;
const WALK_SPEED = 4.2;
const RUN_SPEED = 7.5;
const CROUCH_SPEED = 2.0;
const TURN_RATE = 3.4;
const MOUSE_TURN_PER_PX = 0.0025; // rad/s, on-foot facing turn speed
const REVERSE_FACTOR = 0.6;
const KISS_DIST = 1.8;
const KISS_HEAL = 25;
const KISS_COOLDOWN = 3;
let kissReadyAt = 0;
const JUMP_SPEED = 5.2;
const GRAVITY = 16;
const DROWN_RATE = 12; // health/sec while on foot in water
const SHOVE_DECAY = 6; // 1/s
const MAX_SHOVE = 7; // m/s

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
  }

  update(dt, world) {
    const { input, map, vehicles } = world;
    this.updateCharacterSwitch(world);
    if (input.wasPressed('e') || input.wasPressed('f')) {
      if (!this.tryKiss(world)) {
        const wasInVehicle = !!this.inVehicle;
        this.tryEnterExit(map, vehicles, world);
        if (!wasInVehicle && this.inVehicle) playAutoGejatLine(world);
      }
    }

    if (this.inVehicle) {
      if (this.inVehicle.wrecked) { this.exitVehicle(map, world); }
      else { this.driveVehicle(dt, input, map); return; }
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

    // tank controls, GTA3-style: A/D turn the character (and with it the 3D
    // follow-cam, which derives its yaw from this.angle), W/S move forward/
    // back along the current facing - a raw world-axis "D always moves you
    // toward +x" scheme feels wrong once the camera can be facing any way
    const [ax, ay] = input.axis();
    const speed = this.crouching ? CROUCH_SPEED : input.isDown('shift') ? RUN_SPEED : WALK_SPEED;

    // with the mouse captured, horizontal mouse motion turns Tammo/Anita
    // (and with them the camera and the aim), third-person-shooter style
    const mouseTurn = input.lookActive() ? input.mouse.dx * MOUSE_TURN_PER_PX * getSettings().mouseSensitivity : 0;
    this.angle = normalizeAngle(this.angle + ax * TURN_RATE * dt + mouseTurn);

    const throttle = ay < 0 ? 1 : ay > 0 ? -REVERSE_FACTOR : 0;
    this.moving = throttle !== 0;
    if (this.moving) {
      this.vx = Math.cos(this.angle) * speed * throttle;
      this.vy = Math.sin(this.angle) * speed * throttle;
    } else {
      this.vx = 0;
      this.vy = 0;
    }

    // people don't swim - water blocks on-foot movement exactly like a
    // building wall (boats are the only way to cross). Tried per-axis so
    // walking along a quay/canal edge slides instead of just sticking dead,
    // which matters a lot here given how much of central Groningen is
    // waterfront (the Diepenring, canals, ...)
    //
    // If the player is somehow ALREADY inside water (teleport, a future
    // terrain-hole edge case, being shoved in) the block is skipped - every
    // direction out of a wide canal is "into water" too, so blocking would
    // soft-lock them - and they drown instead.
    if (isInWater(map, this.x, this.y)) {
      world.health = Math.max(0, world.health - DROWN_RATE * dt);
      if (world.health <= 0) { world.health = 0; requestRespawn(world); return; }
    }

    // a single step longer than the radius can tunnel past a thin wall edge
    const steps = Math.max(1, Math.ceil(Math.hypot(this.vx, this.vy) * dt / (this.radius * 0.9)));
    const sdt = dt / steps;
    for (let s = 0; s < steps; s++) {
      let nextX = this.x + this.vx * sdt;
      let nextY = this.y + this.vy * sdt;
      [nextX, nextY] = resolveBuildingCollisions(nextX, nextY, this.radius, map);
      if (!isInWater(map, this.x, this.y) && isInWater(map, nextX, nextY)) {
        if (!isInWater(map, nextX, this.y)) nextY = this.y;
        else if (!isInWater(map, this.x, nextY)) nextX = this.x;
        else { nextX = this.x; nextY = this.y; }
      }
      this.x = nextX;
      this.y = nextY;
    }
    this.resolveBodyContacts(dt, world);
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
      this.exitVehicle(map, world);
      return;
    }
    const v = findNearestVehicle(this.x, this.y, vehicles, 2.5);
    if (v && !v.driver && !v.wrecked) {
      v.driver = 'player';
      v.road = null; // player takes manual control
      if (v.isPolice) v.hijacked = true;
      this.inVehicle = v;
      pushVehicleAudio(world, v, 'door_open', 'engine_start');
    }
  }

  exitVehicle(map, world = null) {
    const v = this.inVehicle;
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
    v.applyControls(dt, throttle, ax, brake && v.speed !== 0);
    resolveVehicleBuildingCollision(v, map, dt);
    this.x = v.x;
    this.y = v.y;
    this.angle = v.angle;
  }
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
