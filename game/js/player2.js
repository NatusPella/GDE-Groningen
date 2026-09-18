import { closestPointOnSegment } from './util2.js';
import { findNearestVehicle, resolveVehicleBuildingCollision } from './vehicle2.js';

const RADIUS = 0.35;
const WALK_SPEED = 4.2;
const RUN_SPEED = 7.5;

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

    const [ax, ay] = input.axis();
    const len = Math.hypot(ax, ay);
    this.moving = len > 0.01;
    const speed = input.isDown('shift') ? RUN_SPEED : WALK_SPEED;

    if (this.moving) {
      const nx = ax / len, ny = ay / len;
      this.vx = nx * speed;
      this.vy = ny * speed;
      this.angle = Math.atan2(ny, nx);
    } else {
      this.vx = 0;
      this.vy = 0;
    }

    let nextX = this.x + this.vx * dt;
    let nextY = this.y + this.vy * dt;
    [nextX, nextY] = resolveBuildingCollisions(nextX, nextY, this.radius, map);

    this.x = nextX;
    this.y = nextY;
  }

  updateCharacterSwitch(world) {
    if (!world.input.wasPressed('c')) return;
    this.character = this.character === 'tammo' ? 'anita' : 'tammo';
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
