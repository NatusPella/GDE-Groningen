import { normalizeAngle, pointInPolygon, isInWater, WATER_Y, closestPointOnSegment } from './util.js';
import { requestRespawn } from './world.js';
import { disableVehicle, surfaceUnder } from './vehicle.js';
import { knockDown } from './ragdoll.js';
import { bloodSpray, bleedPed } from './gore3d.js';
import { DEAD_DURATION } from './pedconst.js';
import { WEAPONS, WEAPON_KEYS, SLOTS, isMeleeWeapon, isRangedWeapon, isGunWeapon } from './weapons.js';
import { setCombatEffect, getCombatEffect } from './combateffect.js';
export { getCombatEffect };
import { propOnBulletPath, shootProp } from './breakables.js';
import { reportCrime } from './crime.js';
import { gunShotFx, gunImpactFx } from './gunfx3d.js';
import { updateAim, aimFireAngle, aimedTargetDistance } from './aimassist.js';
import { scopeShot } from './scopeaim.js';
import { propsInRadius } from './breakables.js';
import { getSettings } from './settings.js';
import { assistDamage } from './assistlive.js';
import { squirtWater, throwExplosive, updateThrowables } from './throwables.js';

export { WEAPONS, WEAPON_KEYS, isMeleeWeapon, isRangedWeapon, isGunWeapon };

export function hasWeapon(world, key) {
  const w = WEAPONS[key];
  return !!w && (w.ammo === Infinity || (world.ammo[key] || 0) > 0);
}


let fireTimer = 0;
let punchSide = -1; // alternates left/right jabs // {type:'muzzle'|'melee'|'squirt'|'throw', angle, until} — local fx state, not shared on world
let pendingSwing = null;
let lockedPed = null; // the soft-locked target, reachable a step further than the swing


// Number key n: the owned weapons of slot n; pressing it again cycles them.
function selectWeaponSlot(world, slot) {
  const own = WEAPON_KEYS.filter((k) => WEAPONS[k].slot === slot && hasWeapon(world, k));
  if (!own.length) return false;
  world.weapon = own[(own.indexOf(world.weapon) + 1) % own.length];
  return true;
}

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
  const usable = WEAPON_KEYS.filter((k) => hasWeapon(world, k));
  if (usable.length < 2) return;
  const i = Math.max(0, usable.indexOf(world.weapon));
  world.weapon = usable[(i + dir + usable.length) % usable.length];
}

export function updateCombat(dt, world) {
  fireTimer = Math.max(0, fireTimer - dt);

  const { input } = world;
  // a minigame (padel, the fuse box) owns the mouse buttons and number keys
  if (world.padelGame || world.minigameUntil > world.time) { world.scoped = false; pendingSwing = null; return; }
  if (!hasWeapon(world, world.weapon)) world.weapon = 'fists';
  for (let i = 1; i <= SLOTS; i++) {
    if (input.wasPressed(String(i))) selectWeaponSlot(world, i);
  }
  cycleWeaponByWheel(dt, world, input);
  const p = world.player;
  const weapon = WEAPONS[world.weapon];
  world.scoped = !!weapon.scope && !p.inVehicle && !p.swimming && !!input.mouse.rightDown && !world.paused;
  // from a car window only guns (and the water pistol) work
  const usable = !p.inVehicle || weapon.kind === 'gun' || weapon.kind === 'water';
  updateAim(dt, world, usable && weapon.kind !== 'melee' ? weapon.range : 0);

  if (pendingSwing && world.time >= pendingSwing.at) {
    const s = pendingSwing;
    pendingSwing = null;
    meleeHit(world, s.angle, s.weapon, s.key);
  }

  if (!input.mouse.down || fireTimer > 0 || !usable || !hasWeapon(world, world.weapon)) return;

  // aim = current facing: on foot player.js turns the body to the camera
  // heading while the mouse button is held; driving, the car's heading
  let angle = p.inVehicle ? p.inVehicle.angle : p.angle;
  fireTimer = weapon.cooldown;

  if (weapon.kind === 'melee') {
    meleeAttack(world, angle, weapon);
    return;
  }
  // through the scope the shot goes exactly where the crosshair is: the
  // camera's heading, no aim assist
  const scoped = world.scoped && weapon.kind === 'gun' && !p.inVehicle;
  angle = scoped ? world.camYaw ?? angle : aimFireAngle(world, angle, weapon);
  if (weapon.kind === 'gun') fireGun(world, angle, weapon, scoped);
  else if (weapon.kind === 'water') {
    setCombatEffect({ type: 'squirt', angle, until: world.time + 0.06, start: world.time, weapon: world.weapon });
    squirtWater(world, angle, weapon);
  } else {
    setCombatEffect({ type: 'throw', angle, until: world.time + 0.3, start: world.time, weapon: world.weapon });
    throwExplosive(world, world.weapon, angle, weapon, aimedTargetDistance(world));
  }
  world.ammo[world.weapon]--;
  // the last round: the dry click of an empty magazine
  if (weapon.kind === 'gun' && world.ammo[world.weapon] <= 0) weaponSound(world, { sub: 'empty', weapon: world.weapon, x: p.x, y: p.y });
}

// Melee soft lock (auto-aim setting): the swing turns to the nearest person
// in front within a little more than its reach; the camera follows halfway.
function meleeLock(world, angle, weapon) {
  lockedPed = null;
  if (getSettings().autoAim === false) return angle;
  const p = world.player;
  const reach = weapon.range + 0.8;
  let best = null, bestScore = Infinity;
  for (const t of world.pedestrians) {
    if (t.state === 'dead' || t.scripted || t.hidden) continue;
    const dx = t.x - p.x, dy = t.y - p.y;
    if (Math.abs(dx) > reach || Math.abs(dy) > reach) continue;
    const d = Math.hypot(dx, dy);
    if (d > reach || d < 0.05) continue;
    const off = Math.abs(normalizeAngle(Math.atan2(dy, dx) - angle));
    if (off > 1.2) continue;
    const score = d + off * 2;
    if (score < bestScore) { bestScore = score; best = t; }
  }
  lockedPed = best;
  if (!best) return angle;
  const a = Math.atan2(best.y - p.y, best.x - p.x);
  if (world.camYaw != null) world.camYaw = normalizeAngle(world.camYaw + normalizeAngle(a - world.camYaw) * 0.5);
  p.angle = a;
  return a;
}

function meleeAttack(world, angle, weapon) {
  angle = meleeLock(world, angle, weapon);
  punchSide = -punchSide;
  setCombatEffect({ type: 'melee', angle, until: world.time + 0.15, start: world.time, side: punchSide, weapon: world.weapon, swing: weapon.swing });
  weaponSound(world, { sub: 'swing', weapon: world.weapon, x: world.player.x, y: world.player.y });
  if (weapon.windup) pendingSwing = { at: world.time + weapon.windup, angle, weapon, key: world.weapon };
  else meleeHit(world, angle, weapon, world.weapon);
}

function weaponSound(world, ev) {
  const q = world.audioEvents || (world.audioEvents = []);
  if (q.length < 64) q.push({ kind: 'weapon', ...ev });
}

// What a swing connects with: people (knocked over by weapon.knock), cars
// (fists and heavy swings only) and street props (toppled or broken).
function meleeHit(world, angle, weapon, key) {
  const p = world.player;
  if (p.inVehicle) return;
  const cone = weapon.cone || Math.PI / 3;
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const inReach = (x, y, extra) => {
    const dx = x - p.x, dy = y - p.y;
    if (Math.abs(dx) > weapon.range + extra || Math.abs(dy) > weapon.range + extra) return false;
    const d = Math.hypot(dx, dy);
    if (d > weapon.range + extra) return false;
    return d < 0.3 || Math.abs(normalizeAngle(Math.atan2(dy, dx) - angle)) <= cone;
  };
  let landed = null;
  for (const t of world.pedestrians) {
    if (t.state === 'dead' || t.scripted || !inReach(t.x, t.y, t === lockedPed ? 0.8 : 0)) continue;
    damagePed(world, t, weapon.damage, true, ca, sa, true, weapon);
    landed = landed || 'flesh';
  }
  for (const v of world.vehicles) {
    if (v.wrecked || v.sinking || v.isBoat || !inReach(v.x, v.y, v.halfLen * 0.7)) continue;
    if (weapon.damage >= 20 || key === 'fists') {
      v.health -= weapon.damage * 0.4;
      if (v.health <= 0) wreckVehicle(world, v, true);
    }
    landed = landed || 'car';
  }
  if (key !== 'fists') {
    const hx = p.x + ca * weapon.range * 0.6, hy = p.y + sa * weapon.range * 0.6;
    for (const pr of propsInRadius(hx, hy, weapon.range * 0.6 + 0.5)) {
      if (!inReach(pr.x, pr.y, 0.5)) continue;
      shootProp(pr, ca, sa, true, weapon.prop || 1);
      landed = landed || 'prop';
    }
  }
  if (landed) weaponSound(world, { sub: 'hit', weapon: key, material: weapon.sound, on: landed, x: p.x + ca * weapon.range, y: p.y + sa * weapon.range });
  if (landed === 'flesh' || landed === 'car') {
    world.lastMeleeHit = { time: world.time };   // main.js: korte timescale-dip (#216)
    const kick = world.camKick || (world.camKick = { pitch: 0, yaw: 0, fov: 0 });
    kick.yaw += (Math.random() - 0.5) * 0.02 * weapon.knock;
    kick.fov = Math.min(3, kick.fov + weapon.knock * 1.2);
  }
}

// Camera recoil per shot: pitch up (rad), sideways jitter, FOV punch (deg).
const KICK = { pistol: [0.022, 0.008, 1.6], uzi: [0.009, 0.006, 0.6], shotgun: [0.05, 0.014, 3.5], jachtgeweer: [0.075, 0.01, 2.2] };

function fireGun(world, angle, weapon, scoped = false) {
  setCombatEffect({ type: 'muzzle', angle, until: world.time + 0.06, start: world.time, weapon: world.weapon });
  const p = world.player;
  const v = p.inVehicle;
  const shots = weapon.pellets || 1;
  const base = v ? v.z || 0 : (p.gz || 0) + (p.z || 0);
  const muzzleZ = base + (v ? 1.2 : p.crouching ? 0.95 : 1.38);
  const aimZ = base + (v ? 1.1 : p.crouching ? 0.8 : 1.2);
  // right hand: a little to the right of the body line
  const rx = -Math.sin(angle) * 0.2, ry = Math.cos(angle) * 0.2;
  if (scoped && shots === 1) {
    const s = scopeShot(p, angle, base, weapon.speed);
    world.bullets.push({ ...s, damage: weapon.damage, owner: 'player', range: weapon.range, traveled: 0, pellet: false, _shotFx: true });
  }
  for (let i = scoped && shots === 1 ? shots : 0; i < shots; i++) {
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
  // the shot is its own audio event: a bullet that hits on its first step
  // (a wall in front, a near target) is gone before audio.js sees it
  weaponSound(world, { sub: 'shot', weapon: world.weapon, x: p.x, y: p.y });
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
    if (hitPedestrians(world, b, x0, y0)) continue;
    if (b.owner !== 'player' && hitPlayer(world, b)) continue;
    if (b.traveled > b.range) { groundImpact(world, b); continue; }

    remaining.push(b);
  }
  world.bullets = remaining;
  world.particles = world.particles.filter((p) => p.until === undefined || p.until > world.time);
  updateThrowables(dt, world);
}

function sound(world, x, y, material, strength = 0.5) {
  const q = world.audioEvents || (world.audioEvents = []);
  if (q.length < 64) q.push({ kind: 'bullet_hit', x, y, material, strength });
}

// First building edge crossed between (x0, y0) and (x1, y1): { t, x, y, nx, ny, b }.
// Buildings the bullet starts inside (fired from a passage) are ignored.
export function wallOnPath(map, x0, y0, x1, y1) {
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

export function wreckVehicle(world, v, byPlayer) {
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

// Swept along this step (a bullet moves ~1 m per frame, more than a body is wide).
function hitPedestrians(world, b, x0, y0) {
  let ped = null, bestT = 2;
  const reach = Math.abs(b.x - x0) + Math.abs(b.y - y0) + 1;
  for (const q of world.pedestrians) {
    if (q.state === 'dead') continue;
    if (b.owner === 'police' && q.isCop) continue;
    if (Math.abs(q.x - b.x) > reach || Math.abs(q.y - b.y) > reach) continue;
    const r = q.radius + 0.12;
    const c = closestPointOnSegment(q.x, q.y, x0, y0, b.x, b.y);
    if (c.dist2 > r * r || c.t >= bestT) continue;
    ped = q; bestT = c.t;
  }
  if (ped) {
    const bl = Math.hypot(b.vx, b.vy) || 1;
    damagePed(world, ped, b.damage, b.owner === 'player', b.vx / bl, b.vy / bl, false);
    sound(world, ped.x, ped.y, 'flesh', b.pellet ? 0.4 : 0.7);
    return true;
  }
  return false;
}

function damagePed(world, ped, damage, byPlayer, dx, dy, melee, weapon = WEAPONS.fists) {
  ped.health -= damage;
  if (!melee) bloodSpray(world, ped.x, ped.y, dx, dy, ped.state === 'dead' ? 0.25 : 0.45);
  if (ped.state === 'dead') return;
  const shove = weapon.push || 2.6;
  if (ped.health > 0) {
    if (melee && (ped.ragdoll || Math.random() < weapon.knock)) knockDown(ped, world, { kind: 'punch', vx: dx * shove, vy: dy * shove, lieFor: 0.8 + weapon.knock + Math.random() });
    else if (melee) ped.hitReact = { t: world.time, dx, dy, k: 0.6 + weapon.knock * 0.6 };
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
  const fling = melee ? Math.max(3, shove) : damage > 60 ? 4 : 2.4;
  knockDown(ped, world, { kind: melee ? 'punch' : 'shot', dead: true, vx: dx * fling, vy: dy * fling });
  bleedPed(ped, world, { size: melee ? 0.7 : 1 });
  if (!byPlayer) return;
  world.stats.kills++;
  if (ped.isCop) {
    world.stats.copKills++;
    world.wanted = Math.min(5, world.wanted + 2);
  } else {
    world.stats.pedKills++;
    reportCrime(world, 'pedKill');
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

export function damagePlayer(world, damage) {
  damage = assistDamage(damage); // Hulp (#215): minder schade bij kogels, klappen en wegpiraten
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
