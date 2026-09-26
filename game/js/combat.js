import { normalizeAngle, pointInPolygon, isInWater, WATER_Y } from './util.js';
import { requestRespawn } from './world.js';
import { disableVehicle, surfaceUnder } from './vehicle.js';
import { knockDown } from './ragdoll.js';
import { bloodSpray, bleedPed } from './gore3d.js';
import { DEAD_DURATION } from './pedestrians.js';
import { propOnBulletPath, shootProp } from './breakables.js';
import { gunShotFx, gunImpactFx } from './gunfx3d.js';

export const WEAPONS = {
  fists: { damage: 12, range: 1.1, cooldown: 0.45, ammo: Infinity },
  pistol: { damage: 20, range: 26, cooldown: 0.32, speed: 55 },
  uzi: { damage: 9, range: 20, cooldown: 0.08, speed: 60 },
  shotgun: { damage: 16, range: 11, cooldown: 0.85, speed: 48, pellets: 6, spread: 0.3 },
};

const WEAPON_KEYS = ['fists', 'pistol', 'uzi', 'shotgun'];

// Damage per second, used to decide whether a picked-up gun beats the one in hand.
export function weaponDps(key) {
  const w = WEAPONS[key];
  return w ? (w.damage * (w.pellets || 1)) / w.cooldown : 0;
}

let fireTimer = 0;
let effect = null;
let punchSide = -1; // alternates left/right jabs // {type:'muzzle'|'melee', angle, until} — local fx state, not shared on world

export function getCombatEffect() { return effect; }

// Mouse wheel cycles through the weapons you have ammo for (fists always).
// Trackpads send many small deltas, so it steps once per WHEEL_STEP of
// scroll with a short cooldown instead of once per event.
const WHEEL_STEP = 60;
const WHEEL_COOLDOWN = 0.12;
let wheelAcc = 0;
let wheelCooldown = 0;

function cycleWeaponByWheel(dt, world, input) {
  wheelCooldown = Math.max(0, wheelCooldown - dt);
  wheelAcc += input.mouse.wheel || 0;
  if (Math.abs(wheelAcc) < WHEEL_STEP || wheelCooldown > 0) {
    if (!input.mouse.wheel) wheelAcc *= 0.9; // forget a half-finished scroll
    return;
  }
  const dir = wheelAcc > 0 ? 1 : -1;
  wheelAcc = 0;
  wheelCooldown = WHEEL_COOLDOWN;
  const usable = WEAPON_KEYS.filter((k) => WEAPONS[k].ammo === Infinity || (world.ammo[k] || 0) > 0);
  if (usable.length < 2) return;
  const i = Math.max(0, usable.indexOf(world.weapon));
  world.weapon = usable[(i + dir + usable.length) % usable.length];
}

export function updateCombat(dt, world) {
  fireTimer = Math.max(0, fireTimer - dt);

  const { input } = world;
  for (let i = 0; i < WEAPON_KEYS.length; i++) {
    if (!input.wasPressed(String(i + 1))) continue;
    const key = WEAPON_KEYS[i];
    const w = WEAPONS[key];
    if (w.ammo === Infinity || (world.ammo[key] || 0) > 0) world.weapon = key;
  }
  cycleWeaponByWheel(dt, world, input);

  if (!input.mouse.down || fireTimer > 0) return;

  const weapon = WEAPONS[world.weapon];
  const hasAmmo = weapon.ammo === Infinity || (world.ammo[world.weapon] || 0) > 0;
  if (!hasAmmo) return;

  // aim = current facing: on foot player.js turns the body to the camera
  // heading while the mouse button is held; driving, the car's heading
  const angle = world.player.inVehicle ? world.player.inVehicle.angle : world.player.angle;
  fireTimer = weapon.cooldown;

  if (world.weapon === 'fists') {
    meleeAttack(world, angle, weapon);
  } else {
    fireGun(world, angle, weapon);
    world.ammo[world.weapon]--;
  }
}

function meleeAttack(world, angle, weapon) {
  punchSide = -punchSide;
  effect = { type: 'melee', angle, until: world.time + 0.15, start: world.time, side: punchSide };
  const targets = [...world.pedestrians, ...world.vehicles];
  for (const t of targets) {
    if (t.state === 'dead' || t.wrecked || t === world.player.inVehicle) continue;
    const dx = t.x - world.player.x, dy = t.y - world.player.y;
    const d = Math.hypot(dx, dy);
    if (d > weapon.range) continue;
    const off = Math.abs(normalizeAngle(Math.atan2(dy, dx) - angle));
    if (off > Math.PI / 3) continue;
    if ('radius' in t) {
      damagePed(world, t, weapon.damage, true, Math.cos(angle), Math.sin(angle), true);
    } else {
      t.health -= weapon.damage * 0.4;
      if (t.health <= 0) wreckVehicle(world, t, true);
    }
  }
}

// Camera recoil per shot: pitch up (rad), sideways jitter, FOV punch (deg).
const KICK = { pistol: [0.022, 0.008, 1.6], uzi: [0.009, 0.006, 0.6], shotgun: [0.05, 0.014, 3.5] };

function fireGun(world, angle, weapon) {
  effect = { type: 'muzzle', angle, until: world.time + 0.06, start: world.time, weapon: world.weapon };
  const p = world.player;
  const v = p.inVehicle;
  const shots = weapon.pellets || 1;
  const base = v ? v.z || 0 : (p.gz || 0) + (p.z || 0);
  const muzzleZ = base + (v ? 1.2 : p.crouching ? 0.95 : 1.38);
  const aimZ = base + (v ? 1.1 : p.crouching ? 0.8 : 1.2);
  // right hand: a little to the right of the body line
  const rx = -Math.sin(angle) * 0.2, ry = Math.cos(angle) * 0.2;
  for (let i = 0; i < shots; i++) {
    const a = angle + (weapon.spread ? (Math.random() - 0.5) * weapon.spread : 0) + (Math.random() - 0.5) * 0.02;
    world.bullets.push({
      x: p.x + Math.cos(a) * 0.4 + rx,
      y: p.y + Math.sin(a) * 0.4 + ry,
      z: aimZ + (Math.random() - 0.5) * (shots > 1 ? 0.35 : 0.18),
      vx: Math.cos(a) * weapon.speed,
      vy: Math.sin(a) * weapon.speed,
      damage: weapon.damage,
      owner: 'player',
      range: weapon.range,
      traveled: 0,
      pellet: shots > 1,
      _shotFx: true,
    });
  }
  gunShotFx({ x: p.x + Math.cos(angle) * 0.7 + rx, y: p.y + Math.sin(angle) * 0.7 + ry, z: muzzleZ, angle, weapon: world.weapon, owner: 'player', casing: !v });
  const [kp, ky, kf] = KICK[world.weapon] || KICK.pistol;
  const kick = world.camKick || (world.camKick = { pitch: 0, yaw: 0, fov: 0 });
  kick.pitch = Math.min(0.12, kick.pitch + kp * (0.85 + Math.random() * 0.3));
  kick.yaw += (Math.random() - 0.5) * 2 * ky;
  kick.fov = Math.min(6, kick.fov + kf);
}

// Bullets fly flat at their own height (b.z). Each step is swept from the
// previous position, so the exact point and surface of what they hit (a
// wall, a car's side, a prop) is known for the impact effects.
export function updateBullets(dt, world) {
  const { map } = world;
  const remaining = [];
  for (const b of world.bullets) {
    const x0 = b.x, y0 = b.y;
    if (b.z === undefined) b.z = 1.25;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.traveled += Math.hypot(b.vx, b.vy) * dt;

    const wall = wallOnPath(map, x0, y0, b.x, b.y);
    const prop = propOnBulletPath(x0, y0, b.x, b.y, b.z);
    const car = vehicleOnPath(world, b, x0, y0);
    // the nearest of wall / prop / car along this step takes the bullet
    let first = wall ? 'wall' : null, t = wall ? wall.t : 2;
    if (prop && prop.t < t) { first = 'prop'; t = prop.t; }
    if (car && car.t < t) first = 'car';
    if (first === 'wall') { wallImpact(world, b, wall); continue; }
    if (first === 'prop') { propImpact(world, b, prop); continue; }
    if (first === 'car') { vehicleImpact(world, b, car); continue; }
    if (hitPedestrians(world, b)) continue;
    if (b.owner !== 'player' && hitPlayer(world, b)) continue;
    if (b.traveled > b.range) { groundImpact(world, b); continue; }

    remaining.push(b);
  }
  world.bullets = remaining;
  world.particles = world.particles.filter((p) => p.until === undefined || p.until > world.time);
}

function sound(world, x, y, material, strength = 0.5) {
  const q = world.audioEvents || (world.audioEvents = []);
  if (q.length < 64) q.push({ kind: 'bullet_hit', x, y, material, strength });
}

// First building edge crossed between (x0, y0) and (x1, y1): { t, x, y, nx, ny, b }.
// Buildings the bullet starts inside (fired from a passage) are ignored.
function wallOnPath(map, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  let best = null;
  for (const bld of map.buildingsNear((x0 + x1) / 2, (y0 + y1) / 2, Math.hypot(dx, dy) / 2 + 1)) {
    const [minx, miny, maxx, maxy] = bld.bounds;
    if (Math.max(x0, x1) < minx || Math.min(x0, x1) > maxx || Math.max(y0, y1) < miny || Math.min(y0, y1) > maxy) continue;
    const pts = bld.pts;
    let hit = null;
    for (let i = 0; i < pts.length - 1; i++) {
      const ax = pts[i][0], ay = pts[i][1], ex = pts[i + 1][0] - ax, ey = pts[i + 1][1] - ay;
      const den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-9) continue;
      const wx = ax - x0, wy = ay - y0;
      const t = (wx * ey - wy * ex) / den;
      const u = (wx * dy - wy * dx) / den;
      if (t < 0 || t > 1 || u < 0 || u > 1 || (hit && t >= hit.t)) continue;
      const el = Math.hypot(ex, ey) || 1;
      let nx = -ey / el, ny = ex / el;
      if (nx * dx + ny * dy > 0) { nx = -nx; ny = -ny; }
      hit = { t, x: x0 + dx * t, y: y0 + dy * t, nx, ny, b: bld };
    }
    if (!hit || (best && hit.t >= best.t) || pointInPolygon(x0, y0, pts)) continue;
    best = hit;
  }
  return best;
}

// Window or wall: a stable per-building share of the facade is glass, and
// the building is either brick or plaster.
function wallImpact(world, b, w) {
  const seed = Math.abs(Math.sin(w.b.bounds[0] * 12.9898 + w.b.bounds[1] * 78.233) * 43758.5453) % 1;
  const glass = b.z > 0.9 && Math.random() < 0.12 + seed * 0.2;
  gunImpactFx({ surface: glass ? 'glass' : 'wall', x: w.x, y: w.y, z: b.z, nx: w.nx, ny: w.ny, color: seed < 0.62 ? 0x9a5a44 : 0xb8b0a0, pellet: b.pellet });
  sound(world, w.x, w.y, glass ? 'glass' : 'stone', b.pellet ? 0.3 : 0.6);
}

const PROP_SURFACE = { metal: 'metal', wood: 'wood', foliage: 'wood', plastic: 'wood', glass: 'glass' };

function propImpact(world, b, h) {
  const sp = Math.hypot(b.vx, b.vy) || 1;
  const p = h.prop;
  const broke = shootProp(p, b.vx / sp, b.vy / sp, b.owner === 'player', b.pellet ? 0.3 : 1);
  const surface = p.burst === 'glass' && broke ? 'glass' : PROP_SURFACE[p.material] || 'metal';
  gunImpactFx({ surface, x: h.x, y: h.y, z: b.z, nx: h.nx, ny: h.ny, pellet: b.pellet });
  sound(world, h.x, h.y, surface === 'glass' ? 'glass' : surface === 'metal' ? 'metal' : 'wood', b.pellet ? 0.3 : 0.6);
}

// Range spent: the bullet drops into the street, the grass or the canal.
function groundImpact(world, b) {
  if (b.owner !== 'player' || Math.random() < 0.35) return;
  const sp = Math.hypot(b.vx, b.vy) || 1;
  const { map } = world;
  if (isInWater(map, b.x, b.y)) {
    gunImpactFx({ surface: 'water', x: b.x, y: b.y, z: WATER_Y + 0.05 });
    sound(world, b.x, b.y, 'water', 0.4);
    return;
  }
  const s = surfaceUnder(map, b.x, b.y);
  gunImpactFx({ surface: 'ground', ground: s === 'gras' ? 'gras' : s === 'klinkers' ? 'klinkers' : 'asfalt', x: b.x, y: b.y, z: 0, dirx: b.vx / sp, diry: b.vy / sp });
  sound(world, b.x, b.y, s === 'gras' ? 'dirt' : 'stone', 0.35);
}

// cars take a bit longer to shoot to a wreck than raw bullet damage implies
const BULLET_VEHICLE_SCALE = 0.6;

// Swept test against each vehicle's box in its own frame (slab method):
// { v, t, x, y, nx, ny, glass } for the first side the bullet enters.
function vehicleOnPath(world, b, x0, y0) {
  let best = null;
  for (const v of world.vehicles) {
    if (v.wrecked || v.sinking) continue;
    if (b.owner === 'police' && v.isPolice && !v.hijacked) continue;
    if (b.owner === 'player' && v.driver === 'player') continue;
    const reach = v.halfLen + 2 + Math.abs(b.x - x0) + Math.abs(b.y - y0);
    if (Math.abs(v.x - b.x) > reach || Math.abs(v.y - b.y) > reach) continue;
    const vz = v.isBoat ? WATER_Y + 0.4 : v.z || 0;
    const top = vz + (v.isBus ? 3.1 : v.isBike || v.isScooter ? 1.4 : 1.55);
    if (b.z > top || b.z < vz - 0.2) continue;
    const c = Math.cos(v.angle), sn = Math.sin(v.angle);
    const lx0 = (x0 - v.x) * c + (y0 - v.y) * sn, ly0 = -(x0 - v.x) * sn + (y0 - v.y) * c;
    const lx1 = (b.x - v.x) * c + (b.y - v.y) * sn, ly1 = -(b.x - v.x) * sn + (b.y - v.y) * c;
    const hl = v.halfLen, hw = (v.halfWid || v.model.wid / 2) + 0.05;
    let tmin = 0, tmax = 1, axis = null, sign = 0;
    const slab = (p0, p1, h, name) => {
      const d = p1 - p0;
      if (Math.abs(d) < 1e-9) return p0 >= -h && p0 <= h;
      let ta = (-h - p0) / d, tb = (h - p0) / d, s = -1;
      if (ta > tb) { const tmp = ta; ta = tb; tb = tmp; s = 1; }
      if (ta > tmin) { tmin = ta; axis = name; sign = s; }
      tmax = Math.min(tmax, tb);
      return tmin <= tmax;
    };
    if (!slab(lx0, lx1, hl, 'x') || !slab(ly0, ly1, hw, 'y')) continue;
    if (best && tmin >= best.t) continue;
    if (!axis) { axis = Math.abs(lx0) / hl > Math.abs(ly0) / hw ? 'x' : 'y'; sign = (axis === 'x' ? lx0 : ly0) > 0 ? 1 : -1; }
    // outward normal of the entered face, back in world space
    const lnx = axis === 'x' ? sign : 0, lny = axis === 'y' ? sign : 0;
    const hx = lx0 + (lx1 - lx0) * tmin;
    const carLike = !v.isBike && !v.isScooter && !v.isBoat;
    const cabin = carLike && b.z > vz + (v.isBus ? 1.1 : 0.95) && (v.isBus || axis === 'x' || Math.abs(hx) < hl * 0.45);
    best = {
      v, t: tmin, glass: cabin,
      x: x0 + (b.x - x0) * tmin, y: y0 + (b.y - y0) * tmin,
      nx: lnx * c - lny * sn, ny: lnx * sn + lny * c,
    };
  }
  return best;
}

function vehicleImpact(world, b, h) {
  const v = h.v;
  v.health -= b.damage * BULLET_VEHICLE_SCALE;
  if (v.health <= 0) wreckVehicle(world, v, b.owner === 'player');
  gunImpactFx({ surface: h.glass ? 'carglass' : 'metal', x: h.x, y: h.y, z: b.z, nx: h.nx, ny: h.ny, vehicle: v.wrecked ? null : v, pellet: b.pellet });
  sound(world, h.x, h.y, h.glass ? 'glass' : 'metal', b.pellet ? 0.3 : 0.6);
}

function wreckVehicle(world, v, byPlayer) {
  // already burning: every hit brings the explosion closer
  if (v.disabled) { v.burnLeft -= 0.7; return; }
  if (v.wrecked) return;
  disableVehicle(v, byPlayer, world);
  if (!byPlayer) return;
  if (v.isPolice && !v.hijacked) {
    world.stats.kills++;
    world.stats.copKills++;
    world.wanted = Math.min(5, world.wanted + 2);
  }
}

function hitPedestrians(world, b) {
  for (const ped of world.pedestrians) {
    if (ped.state === 'dead') continue;
    if (b.owner === 'police' && ped.isCop) continue;
    if (Math.hypot(ped.x - b.x, ped.y - b.y) > ped.radius + 0.12) continue;
    const bl = Math.hypot(b.vx, b.vy) || 1;
    damagePed(world, ped, b.damage, b.owner === 'player', b.vx / bl, b.vy / bl, false);
    sound(world, ped.x, ped.y, 'flesh', b.pellet ? 0.4 : 0.7);
    return true;
  }
  return false;
}

function damagePed(world, ped, damage, byPlayer, dx, dy, melee) {
  ped.health -= damage;
  if (!melee) bloodSpray(world, ped.x, ped.y, dx, dy, ped.state === 'dead' ? 0.25 : 0.45);
  if (ped.state === 'dead') return;
  if (ped.health > 0) {
    if (melee && (ped.ragdoll || Math.random() < 0.4)) knockDown(ped, world, { kind: 'punch', vx: dx * 2.6, vy: dy * 2.6, lieFor: 1.2 + Math.random() });
    else if (!melee) {
      // flinch away from the shot and stumble back half a step; a heavy hit
      // sometimes floors them
      ped.hitReact = { t: world.time, dx, dy, k: Math.min(1.3, 0.6 + damage / 30) };
      if (!ped.ragdoll) { ped.x += dx * 0.18; ped.y += dy * 0.18; }
      if (!ped.ragdoll && damage >= 14 && Math.random() < 0.25) knockDown(ped, world, { kind: 'shot', vx: dx * 2, vy: dy * 2, lieFor: 1 + Math.random() });
    }
    return;
  }
  ped.state = 'dead';
  ped.deadUntil = world.time + DEAD_DURATION;
  knockDown(ped, world, { kind: melee ? 'punch' : 'shot', dead: true, vx: dx * (melee ? 3 : 2.4), vy: dy * (melee ? 3 : 2.4) });
  bleedPed(ped, world, { size: melee ? 0.7 : 1 });
  if (!byPlayer) return;
  world.stats.kills++;
  if (ped.isCop) {
    world.stats.copKills++;
    world.wanted = Math.min(5, world.wanted + 2);
  } else {
    world.stats.pedKills++;
    world.wanted = Math.min(5, world.wanted + 1);
  }
}

function hitPlayer(world, b) {
  const p = world.player;
  if (Math.hypot(p.x - b.x, p.y - b.y) > p.radius + 0.12) return false;
  damagePlayer(world, b.damage);
  const bl = Math.hypot(b.vx, b.vy) || 1;
  if (!p.inVehicle) {
    p.hitReact = { t: world.time, dx: b.vx / bl, dy: b.vy / bl, k: 0.7 };
    bloodSpray(world, p.x, p.y, b.vx / bl, b.vy / bl, 0.3);
  }
  const kick = world.camKick || (world.camKick = { pitch: 0, yaw: 0, fov: 0 });
  kick.yaw += (Math.random() - 0.5) * 0.05;
  kick.pitch += 0.015;
  sound(world, p.x, p.y, 'flesh', 0.6);
  return true;
}

function damagePlayer(world, damage) {
  if (world.armor > 0) {
    const absorbed = Math.min(world.armor, damage);
    world.armor -= absorbed;
    damage -= absorbed;
  }
  world.health -= damage;
  if (world.health <= 0) {
    world.health = 0;
    requestRespawn(world);
  }
}
