import { normalizeAngle, pointInPolygon } from './util.js';
import { requestRespawn } from './world.js';
import { markWreckedByPlayer } from './vehicle.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

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
let effect = null; // {type:'muzzle'|'melee', angle, until} — local fx state, not shared on world

export function getCombatEffect() { return effect; }

export function updateCombat(dt, world) {
  fireTimer = Math.max(0, fireTimer - dt);

  const { input } = world;
  for (let i = 0; i < WEAPON_KEYS.length; i++) {
    if (!input.wasPressed(String(i + 1))) continue;
    const key = WEAPON_KEYS[i];
    const w = WEAPONS[key];
    if (w.ammo === Infinity || (world.ammo[key] || 0) > 0) world.weapon = key;
  }

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
  effect = { type: 'melee', angle, until: world.time + 0.15 };
  const targets = [...world.pedestrians, ...world.vehicles];
  for (const t of targets) {
    if (t.state === 'dead' || t.wrecked || t === world.player.inVehicle) continue;
    const dx = t.x - world.player.x, dy = t.y - world.player.y;
    const d = Math.hypot(dx, dy);
    if (d > weapon.range) continue;
    const off = Math.abs(normalizeAngle(Math.atan2(dy, dx) - angle));
    if (off > Math.PI / 3) continue;
    if ('radius' in t) {
      damagePed(world, t, weapon.damage, true);
    } else {
      t.health -= weapon.damage * 0.4;
      if (t.health <= 0) wreckVehicle(world, t, true);
    }
  }
}

function fireGun(world, angle, weapon) {
  effect = { type: 'muzzle', angle, until: world.time + 0.06 };
  const shots = weapon.pellets || 1;
  for (let i = 0; i < shots; i++) {
    const a = angle + (weapon.spread ? (Math.random() - 0.5) * weapon.spread : 0);
    world.bullets.push({
      x: world.player.x + Math.cos(a) * 0.4,
      y: world.player.y + Math.sin(a) * 0.4,
      vx: Math.cos(a) * weapon.speed,
      vy: Math.sin(a) * weapon.speed,
      damage: weapon.damage,
      owner: 'player',
      range: weapon.range,
      traveled: 0,
    });
  }
}

export function updateBullets(dt, world) {
  const { map } = world;
  const remaining = [];
  for (const b of world.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.traveled += Math.hypot(b.vx, b.vy) * dt;

    if (b.traveled > b.range) continue;
    if (hitsBuilding(map, b)) { spawnSpark(world, b.x, b.y); continue; }
    if (hitVehicles(world, b)) continue;
    if (hitPedestrians(world, b)) continue;
    if (b.owner !== 'player' && hitPlayer(world, b)) continue;

    remaining.push(b);
  }
  world.bullets = remaining;
  world.particles = world.particles.filter((p) => p.until === undefined || p.until > world.time);
}

function hitsBuilding(map, b) {
  for (const bld of map.buildingsNear(b.x, b.y, 2)) {
    const [minx, miny, maxx, maxy] = bld.bounds;
    if (b.x < minx || b.x > maxx || b.y < miny || b.y > maxy) continue;
    if (pointInPolygon(b.x, b.y, bld.pts)) return true;
  }
  return false;
}

// cars take a bit longer to shoot to a wreck than raw bullet damage implies
const BULLET_VEHICLE_SCALE = 0.6;

function hitVehicles(world, b) {
  for (const v of world.vehicles) {
    if (v.wrecked) continue;
    if (b.owner === 'police' && v.isPolice && !v.hijacked) continue;
    if (b.owner === 'player' && v.driver === 'player') continue;
    if (Math.hypot(v.x - b.x, v.y - b.y) > v.halfLen) continue;
    v.health -= b.damage * BULLET_VEHICLE_SCALE;
    if (v.health <= 0) wreckVehicle(world, v, b.owner === 'player');
    return true;
  }
  return false;
}

function wreckVehicle(world, v, byPlayer) {
  v.health = 0;
  v.wrecked = true;
  v.speed = 0;
  if (!byPlayer) return;
  markWreckedByPlayer(v, world);
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
    damagePed(world, ped, b.damage, b.owner === 'player');
    return true;
  }
  return false;
}

function damagePed(world, ped, damage, byPlayer) {
  ped.health -= damage;
  if (ped.health > 0 || ped.state === 'dead') return;
  ped.state = 'dead';
  ped.deadUntil = world.time + 2.5;
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
  if (Math.hypot(world.player.x - b.x, world.player.y - b.y) > world.player.radius + 0.12) return false;
  damagePlayer(world, b.damage);
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

function spawnSpark(world, x, y) {
  world.particles.push({ x, y, until: world.time + 0.25, kind: 'spark' });
}

// local +X is the elongated/forward axis for all four shapes below, so an
// integrator that does mesh.position.set(x, y, z); mesh.rotation.y = -angle
// (the same convention scene3d.js already uses for vehicles/peds/wildlife)
// gets correct orientation for free — see integrationNotes for exact angles.

export function buildBulletMesh3D() {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 6, 5),
    new THREE.MeshBasicMaterial({ color: 0xfff0a8 })
  );
  mesh.scale.set(3, 1, 1);
  return mesh;
}

export function buildSparkBurstMesh3D() {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xffb347 });
  const n = 5;
  for (let i = 0; i < n; i++) {
    const chip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), mat);
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
    const r = 0.06 + Math.random() * 0.1;
    chip.position.set(Math.cos(a) * r, (Math.random() - 0.3) * 0.12, Math.sin(a) * r);
    group.add(chip);
  }
  return group;
}

export function buildMuzzleFlashMesh3D() {
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.6, 6),
    new THREE.MeshBasicMaterial({ color: 0xffd45c })
  );
  cone.rotation.z = -Math.PI / 2;
  cone.position.x = 0.65;
  cone.visible = false;
  return cone;
}

export function buildMeleeSwipeMesh3D() {
  const segments = 8;
  const innerR = 0.5, outerR = 0.95;
  const halfSpread = Math.PI / 4;
  const positions = [];
  const indices = [];
  for (let i = 0; i <= segments; i++) {
    const phi = -halfSpread + (i / segments) * halfSpread * 2;
    const cx = Math.cos(phi), sz = Math.sin(phi);
    positions.push(cx * innerR, 0, sz * innerR, cx * outerR, 0, sz * outerR);
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    indices.push(a, b, c, b, d, c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
  );
  mesh.visible = false;
  return mesh;
}
