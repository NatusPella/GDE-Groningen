import { dist, pointInPolygon } from './util2.js';

const WEAPON_KEYS = ['pistol', 'uzi', 'shotgun'];
const WEAPON_AMMO = { pistol: 30, uzi: 60, shotgun: 10 };

const MONEY_TARGET = 6;
const MONEY_RADIUS = 70;
const MONEY_PICKUP_DIST = 1.1;

const WEAPON_TARGET = 3;
const WEAPON_RADIUS = 90;
const WEAPON_PICKUP_DIST = 1.1;

const HEALTH_TARGET = 1;
const ARMOR_TARGET = 1;
const HEALTH_RADIUS = 100;
const HEALTH_RESPAWN_DELAY = 25;
const HEALTH_PICKUP_DIST = 1.1;

const GARAGE_RADIUS = 6;
const GARAGE_COOLDOWN = 10;

let money = [];
let weapons = [];
let health = null;
let healthRespawnAt = 0;
let armor = null;
let armorRespawnAt = 0;
let garages = [];

function isInsideBuilding(map, x, y) {
  for (const b of map.buildingsNear(x, y, 0.5)) {
    if (pointInPolygon(x, y, b.pts)) return true;
  }
  return false;
}

function randomRoadSpot(map, x, y, radius) {
  const roads = map.roadsNear(x, y, radius).filter((r) => r.pts.length >= 2 && r.cat !== 'foot');
  if (!roads.length) return null;
  for (let attempt = 0; attempt < 15; attempt++) {
    const road = roads[Math.floor(Math.random() * roads.length)];
    const pts = road.pts;
    const i = Math.floor(Math.random() * (pts.length - 1));
    const a = pts[i], b = pts[i + 1];
    const t = Math.random();
    const px = a[0] + (b[0] - a[0]) * t;
    const py = a[1] + (b[1] - a[1]) * t;
    const segAngle = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const nx = -Math.sin(segAngle), ny = Math.cos(segAngle);
    const side = Math.random() < 0.5 ? 1 : -1;
    const offset = (road.width || 4) / 2 + 1 + Math.random() * 2;
    const px2 = px + nx * offset * side;
    const py2 = py + ny * offset * side;
    if (dist(px2, py2, x, y) > radius) continue;
    if (isInsideBuilding(map, px2, py2)) continue;
    return [px2, py2];
  }
  return null;
}

export function initPickups(world) {
  garages = world.map.meta.garages || [];
  for (const g of garages) g.cooldownUntil = 0;
  money = [];
  weapons = [];
  health = null;
  armor = null;
  healthRespawnAt = 0;
  armorRespawnAt = 0;
}

function maintainMoney(world) {
  const { map, player } = world;
  money = money.filter((m) => dist(m.x, m.y, player.x, player.y) < MONEY_RADIUS * 1.6);
  let guard = 0;
  while (money.length < MONEY_TARGET && guard++ < MONEY_TARGET * 4) {
    const spot = randomRoadSpot(map, player.x, player.y, MONEY_RADIUS);
    if (!spot) break;
    const [x, y] = spot;
    if (dist(x, y, player.x, player.y) < 8) continue;
    money.push({ x, y, amount: 50 + Math.floor(Math.random() * 101) });
  }
}

function maintainWeapons(world) {
  const { map, player } = world;
  weapons = weapons.filter((w) => dist(w.x, w.y, player.x, player.y) < WEAPON_RADIUS * 1.6);
  let guard = 0;
  while (weapons.length < WEAPON_TARGET && guard++ < WEAPON_TARGET * 4) {
    const spot = randomRoadSpot(map, player.x, player.y, WEAPON_RADIUS);
    if (!spot) break;
    const [x, y] = spot;
    if (dist(x, y, player.x, player.y) < 8) continue;
    weapons.push({ x, y, key: WEAPON_KEYS[Math.floor(Math.random() * WEAPON_KEYS.length)] });
  }
}

function maintainHealthArmor(world) {
  const { map, player } = world;
  if (!health && world.time >= healthRespawnAt) {
    const spot = randomRoadSpot(map, player.x, player.y, HEALTH_RADIUS);
    if (spot) health = { x: spot[0], y: spot[1] };
  }
  if (!armor && world.time >= armorRespawnAt) {
    const spot = randomRoadSpot(map, player.x, player.y, HEALTH_RADIUS);
    if (spot) armor = { x: spot[0], y: spot[1] };
  }
}

function collectFoot(world) {
  const { player } = world;
  const px = player.inVehicle ? player.inVehicle.x : player.x;
  const py = player.inVehicle ? player.inVehicle.y : player.y;

  for (let i = money.length - 1; i >= 0; i--) {
    const m = money[i];
    if (dist(px, py, m.x, m.y) < MONEY_PICKUP_DIST) {
      world.money += m.amount;
      world.addMessage(`+ €${m.amount}`, 1.6);
      money.splice(i, 1);
    }
  }

  for (let i = weapons.length - 1; i >= 0; i--) {
    const w = weapons[i];
    if (dist(px, py, w.x, w.y) < WEAPON_PICKUP_DIST) {
      world.ammo[w.key] = (world.ammo[w.key] || 0) + WEAPON_AMMO[w.key];
      world.addMessage(`${w.key} +${WEAPON_AMMO[w.key]} ammo`, 1.8);
      weapons.splice(i, 1);
    }
  }

  if (health && dist(px, py, health.x, health.y) < HEALTH_PICKUP_DIST) {
    world.health = Math.min(100, world.health + 100);
    world.addMessage('Health opgekrikt', 1.8);
    health = null;
    healthRespawnAt = world.time + HEALTH_RESPAWN_DELAY;
  }

  if (armor && dist(px, py, armor.x, armor.y) < HEALTH_PICKUP_DIST) {
    world.armor = Math.min(100, world.armor + 100);
    world.addMessage('Armor opgekrikt', 1.8);
    armor = null;
    armorRespawnAt = world.time + HEALTH_RESPAWN_DELAY;
  }
}

function updateGarages(world) {
  const v = world.player.inVehicle;
  if (!v) return;
  for (const g of garages) {
    if (world.time < g.cooldownUntil) continue;
    if (dist(v.x, v.y, g.x, g.y) < GARAGE_RADIUS) {
      v.health = 100;
      v.wrecked = false;
      world.health = 100;
      world.armor = 100;
      world.wanted = 0;
      world.addMessage("Pay 'n Spray", 2.2);
      g.cooldownUntil = world.time + GARAGE_COOLDOWN;
    }
  }
}

export function updatePickups(dt, world) {
  maintainMoney(world);
  maintainWeapons(world);
  maintainHealthArmor(world);
  collectFoot(world);
  updateGarages(world);
}

function drawCoin(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#e0c020';
  ctx.beginPath();
  ctx.arc(0, 0, 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8a6a10';
  ctx.lineWidth = 0.06;
  ctx.stroke();
  ctx.fillStyle = '#8a6a10';
  ctx.font = '0.4px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', 0, 0.02);
  ctx.restore();
}

function drawWeaponPickup(ctx, x, y, key) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.arc(0, 0, 0.5, 0, Math.PI * 2);
  ctx.fill();
  const colors = { pistol: '#9aa0a6', uzi: '#3a3a3a', shotgun: '#6b4a2a' };
  ctx.fillStyle = colors[key] || '#888';
  ctx.fillRect(-0.32, -0.1, 0.64, 0.2);
  ctx.restore();
}

function drawCross(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.arc(0, 0, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e0e0e0';
  ctx.beginPath();
  ctx.arc(0, 0, 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d1382f';
  ctx.fillRect(-0.09, -0.3, 0.18, 0.6);
  ctx.fillRect(-0.3, -0.09, 0.6, 0.18);
  ctx.restore();
}

function drawShield(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.arc(0, 0, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3f6bd4';
  ctx.beginPath();
  ctx.moveTo(0, -0.4);
  ctx.lineTo(0.32, -0.22);
  ctx.lineTo(0.32, 0.12);
  ctx.quadraticCurveTo(0.32, 0.36, 0, 0.44);
  ctx.quadraticCurveTo(-0.32, 0.36, -0.32, 0.12);
  ctx.lineTo(-0.32, -0.22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#1c3a8a';
  ctx.lineWidth = 0.05;
  ctx.stroke();
  ctx.restore();
}

function drawGarage(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(0, 0, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d1382f';
  ctx.lineWidth = 0.18;
  ctx.beginPath();
  ctx.arc(0, 0, 1.4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = 0.22;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-0.55, 0.55);
  ctx.lineTo(0.4, -0.4);
  ctx.stroke();
  ctx.fillStyle = '#2a2a2a';
  ctx.beginPath();
  ctx.arc(-0.55, 0.55, 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(-0.55, 0.55, 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawPickups(ctx, world) {
  for (const g of garages) drawGarage(ctx, g.x, g.y);
  for (const m of money) drawCoin(ctx, m.x, m.y);
  for (const w of weapons) drawWeaponPickup(ctx, w.x, w.y, w.key);
  if (health) drawCross(ctx, health.x, health.y);
  if (armor) drawShield(ctx, armor.x, armor.y);
}
