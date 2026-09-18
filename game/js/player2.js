import { closestPointOnSegment, normalizeAngle, pointInPolygon } from './util2.js';
import { findNearestVehicle, resolveVehicleBuildingCollision } from './vehicle2.js';

const RADIUS = 0.35;
const WALK_SPEED = 4.2;
const RUN_SPEED = 7.5;
const TURN_RATE = 3.4; // rad/s, on-foot facing turn speed
const REVERSE_FACTOR = 0.6;

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
  }

  update(dt, world) {
    const { input, map, vehicles } = world;
    this.updateCharacterSwitch(world);
    if (input.wasPressed('e') || input.wasPressed('f')) {
      this.tryEnterExit(map, vehicles);
    }

    if (this.inVehicle) {
      if (this.inVehicle.wrecked) { this.exitVehicle(map); }
      else { this.driveVehicle(dt, input, map); return; }
    }

    // tank controls, GTA3-style: A/D turn the character (and with it the 3D
    // follow-cam, which derives its yaw from this.angle), W/S move forward/
    // back along the current facing - a raw world-axis "D always moves you
    // toward +x" scheme feels wrong once the camera can be facing any way
    const [ax, ay] = input.axis();
    const speed = input.isDown('shift') ? RUN_SPEED : WALK_SPEED;

    this.angle = normalizeAngle(this.angle + ax * TURN_RATE * dt);

    const throttle = ay < 0 ? 1 : ay > 0 ? -REVERSE_FACTOR : 0;
    this.moving = throttle !== 0;
    if (this.moving) {
      this.vx = Math.cos(this.angle) * speed * throttle;
      this.vy = Math.sin(this.angle) * speed * throttle;
    } else {
      this.vx = 0;
      this.vy = 0;
    }

    let nextX = this.x + this.vx * dt;
    let nextY = this.y + this.vy * dt;
    [nextX, nextY] = resolveBuildingCollisions(nextX, nextY, this.radius, map);

    // people don't swim - water blocks on-foot movement exactly like a
    // building wall (boats are the only way to cross). Tried per-axis so
    // walking along a quay/canal edge slides instead of just sticking dead,
    // which matters a lot here given how much of central Groningen is
    // waterfront (the Diepenring, canals, ...)
    if (isInWater(nextX, nextY, map)) {
      if (!isInWater(nextX, this.y, map)) nextY = this.y;
      else if (!isInWater(this.x, nextY, map)) nextX = this.x;
      else { nextX = this.x; nextY = this.y; }
    }

    this.x = nextX;
    this.y = nextY;
  }

  // Tammo and Anita are always both out in the world (see companion2.js) -
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

  tryEnterExit(map, vehicles) {
    if (this.inVehicle) {
      this.exitVehicle(map);
      return;
    }
    const v = findNearestVehicle(this.x, this.y, vehicles, 2.5);
    if (v && !v.driver && !v.wrecked) {
      v.driver = 'player';
      v.road = null; // player takes manual control
      this.inVehicle = v;
    }
  }

  exitVehicle(map) {
    const v = this.inVehicle;
    v.driver = null;
    this.inVehicle = null;
    const nx = -Math.sin(v.angle), ny = Math.cos(v.angle);
    let ex = v.x + nx * (v.halfWid + 0.7);
    let ey = v.y + ny * (v.halfWid + 0.7);
    [ex, ey] = resolveBuildingCollisions(ex, ey, this.radius, map);
    this.x = ex;
    this.y = ey;
    this.angle = v.angle;
  }

  driveVehicle(dt, input, map) {
    const v = this.inVehicle;
    const [ax, ay] = input.axis();
    const throttle = ay < 0 ? 1 : ay > 0 ? -1 : 0;
    const brake = input.isDown(' ');
    v.applyControls(dt, throttle, ax, brake && v.speed !== 0);
    resolveVehicleBuildingCollision(v, map);
    this.x = v.x;
    this.y = v.y;
    this.angle = v.angle;
  }
}

function isInWater(x, y, map) {
  for (const w of map.waterNear(x, y, 0.5)) {
    if (pointInPolygon(x, y, w.pts)) return true;
  }
  return false;
}

// Push a circle out of any nearby building polygon it overlaps.
export function resolveBuildingCollisions(x, y, radius, map) {
  const nearby = map.buildingsNear(x, y, radius + 2);
  for (let iter = 0; iter < 2; iter++) {
    for (const b of nearby) {
      const [minx, miny, maxx, maxy] = b.bounds;
      if (x < minx - radius || x > maxx + radius || y < miny - radius || y > maxy + radius) continue;
      const pts = b.pts;
      let bestDist2 = Infinity, bestX = 0, bestY = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const cp = closestPointOnSegment(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
        if (cp.dist2 < bestDist2) { bestDist2 = cp.dist2; bestX = cp.x; bestY = cp.y; }
      }
      const d = Math.sqrt(bestDist2);
      if (d < radius && d > 1e-6) {
        const push = (radius - d) / d;
        x += (x - bestX) * push;
        y += (y - bestY) * push;
      } else if (d <= 1e-6) {
        x += radius;
      }
    }
  }
  return [x, y];
}
