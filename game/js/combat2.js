import { normalizeAngle, pointInPolygon } from './util2.js';
import { respawnPlayer } from './world2.js';

export const WEAPONS = {
  fists: { damage: 12, range: 1.1, cooldown: 0.45, ammo: Infinity },
  pistol: { damage: 20, range: 26, cooldown: 0.32, speed: 55, startAmmo: 40 },
  uzi: { damage: 9, range: 20, cooldown: 0.08, speed: 60, startAmmo: 90 },
  shotgun: { damage: 16, range: 11, cooldown: 0.85, speed: 48, pellets: 6, spread: 0.3, startAmmo: 16 },
};

const WEAPON_KEYS = ['fists', 'pistol', 'uzi', 'shotgun'];

let fireTimer = 0;
let effect = null; // {type:'muzzle'|'melee', angle, until} — local fx state, not shared on world

function ensureAmmo(world) {
  if (world.ammoInitialized) return;
  world.ammoInitialized = true;
  for (const key of WEAPON_KEYS) {
    const w = WEAPONS[key];
    if (w.startAmmo !== undefined) world.ammo[key] = w.startAmmo;
  }
}

export function updateCombat(dt, world) {
  ensureAmmo(world);
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

  const [tx, ty] = world.camera.screenToWorld(input.mouse.x, input.mouse.y);
  const angle = Math.atan2(ty - world.player.y, tx - world.player.x);
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
      damagePed(world, t, weapon.damage);
    } else {
      t.health -= weapon.damage * 0.4;
      if (t.health <= 0) { t.health = 0; t.wrecked = true; t.speed = 0; }
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
  world.particles = world.particles.filter((p) => p.kind !== 'spark' || p.until > world.time);
}

function hitsBuilding(map, b) {
  for (const bld of map.buildingsNear(b.x, b.y, 2)) {
    const [minx, miny, maxx, maxy] = bld.bounds;
    if (b.x < minx || b.x > maxx || b.y < miny || b.y > maxy) continue;
    if (pointInPolygon(b.x, b.y, bld.pts)) return true;
  }
  return false;
}

function hitVehicles(world, b) {
  for (const v of world.vehicles) {
    if (v.wrecked) continue;
    if (b.owner === 'police' && v.isPolice) continue;
    if (b.owner === 'player' && v.driver === 'player') continue;
    if (Math.hypot(v.x - b.x, v.y - b.y) > v.halfLen) continue;
    v.health -= b.damage;
    if (v.health <= 0) {
      v.health = 0;
      v.wrecked = true;
      v.speed = 0;
      if (v.isPolice) {
        world.stats.kills++;
        world.stats.copKills++;
        world.wanted = Math.min(5, world.wanted + 2);
      }
    }
    return true;
  }
  return false;
}

function hitPedestrians(world, b) {
  for (const ped of world.pedestrians) {
    if (ped.state === 'dead') continue;
    if (b.owner === 'police' && ped.isCop) continue;
    if (Math.hypot(ped.x - b.x, ped.y - b.y) > ped.radius + 0.12) continue;
    damagePed(world, ped, b.damage);
    return true;
  }
  return false;
}

function damagePed(world, ped, damage) {
  ped.health -= damage;
  if (ped.health > 0 || ped.state === 'dead') return;
  ped.state = 'dead';
  ped.deadUntil = world.time + 2.5;
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
    respawnPlayer(world);
  }
}

function spawnSpark(world, x, y) {
  world.particles.push({ x, y, until: world.time + 0.25, kind: 'spark' });
}

export function drawCombat(ctx, world) {
  ctx.fillStyle = '#3d3d3d';
  for (const p of world.particles) {
    if (p.kind !== 'spark') continue;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#ffe9a8';
  for (const b of world.bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 0.06, 0, Math.PI * 2);
    ctx.fill();
  }

  if (!effect || effect.until <= world.time) { effect = null; return; }

  const p = world.player;
  if (effect.type === 'muzzle') {
    ctx.strokeStyle = '#ffd45c';
    ctx.lineWidth = 0.08;
    ctx.beginPath();
    ctx.moveTo(p.x + Math.cos(effect.angle) * 0.4, p.y + Math.sin(effect.angle) * 0.4);
    ctx.lineTo(p.x + Math.cos(effect.angle) * 0.9, p.y + Math.sin(effect.angle) * 0.9);
    ctx.stroke();
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 0.1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 0.9, effect.angle - Math.PI / 4, effect.angle + Math.PI / 4);
    ctx.stroke();
  }
}
