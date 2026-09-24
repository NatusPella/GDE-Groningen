import { dist, pointInPolygon, isInWater } from './util.js';
import { weaponDps } from './combat.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const WEAPON_KEYS = ['pistol', 'uzi', 'shotgun'];
const WEAPON_AMMO = { pistol: 30, uzi: 60, shotgun: 10 };
const WEAPON_LABELS = { pistol: 'Pistool', uzi: 'Uzi', shotgun: 'Hagelgeweer' };

// Curated per-wijk flavor: which real Groningen neighbourhood plausibly
// "owns" which weapon, so pickups cluster somewhere good-naturedly fitting
// instead of pure random noise. Deliberately not exhaustive over all 66
// neighbourhoodPoints - unlisted wijken (or none nearby) just fall back to
// the old uniform random pick, see maintainWeapons() below.
const WEAPON_DISTRICTS = {
  // stately centre/canal quarters - the classy sidearm
  pistol: [
    'Binnenstad', 'Binnenstad-Oost', 'A-kwartier', 'Ebbingekwartier',
    'Bisschopskwartier', 'Schildersbuurt', 'Hortusbuurt', 'Herewegbuurt',
    'Zuiderpark', 'Professorenbuurt', 'Bernoullipleinbuurt',
  ],
  // studentenflats & uitgaansbuurten - cheap, fast, spray-and-pray
  uzi: [
    'Studentenbuurt', 'Paddepoel', 'Paddepoel-Noord', 'Paddepoel-Zuid',
    'Selwerd', 'Selwerderwijk', 'Tuinwijk', 'Concordiabuurt', 'Oranjewijk',
    'Oosterpoort',
  ],
  // havens, industrieterreinen & het platteland aan de stadsrand - the
  // farmer's/dockworker's jachtgeweer
  shotgun: [
    'Eemskanaal', 'Damsterdiep', 'Metalenkwartier', 'Suikerfabriekterrein',
    'Cortinghborg', 'Hoendiep', 'Reitdiepswaard', 'Van Starkenborgh',
    'Ulgersmaborg', 'Martini Trade Park', 'Kostverloren', 'De Velden',
  ],
};
const WEAPON_DISTRICT_MAX_DIST = 65;
const WEAPON_DISTRICT_SPOT_RADIUS = 45;

const MONEY_TARGET = 6;
const MONEY_RADIUS = 70;
const MONEY_POI_RADIUS = 150;
const MONEY_PICKUP_DIST = 1.1;

const WEAPON_TARGET = 3;
const WEAPON_RADIUS = 90;
const WEAPON_POI_RADIUS = 150;
const WEAPON_PICKUP_DIST = 1.1;

const HEALTH_TARGET = 1;
const ARMOR_TARGET = 1;
const HEALTH_RADIUS = 100;
const HEALTH_POI_RADIUS = 180;
const HEALTH_RESPAWN_DELAY = 25;
const HEALTH_PICKUP_DIST = 1.1;
const HEALTH_REPLACE_DIST = 250;

const GARAGE_RADIUS = 6;
const GARAGE_COOLDOWN = 10;

const MAINTAIN_INTERVAL = 0.5;
const SPOT_MIN_PLAYER_DIST = 8;
const SPOT_RESPAWN = { money: 45, weapons: 75, health: 60, armor: 90 };

const MONEY_BY_KIND = {
  atm: [90, 160], bank: [80, 140], bureau_de_change: [60, 120],
  supermarket: [15, 35], department_store: [20, 40], mall: [20, 40],
  marketplace: [10, 30], office: [10, 30], building: [10, 25],
};
const MONEY_SINGLE_KINDS = new Set(['atm', 'bank', 'bureau_de_change']);
const MONEY_CLUSTER_OFFSETS = [[1.6, 0.4], [-1.2, 1.3], [0.3, -1.7], [-1.5, -0.9]];
const MONEY_PLACE = {
  atm: 'bij de pinautomaat', bank: 'bij de bank', bureau_de_change: 'bij het wisselkantoor',
  supermarket: 'bij de supermarkt', department_store: 'bij het warenhuis', mall: 'bij het winkelcentrum',
  marketplace: 'op de markt', office: 'bij een kantoor', building: 'bij een bedrijfspand',
};
const WEAPON_BY_KIND = {
  industrial: 'shotgun', scrapyard: 'shotgun', harbour: 'shotgun',
  railyard: 'uzi', parking: 'uzi', alley: 'pistol', bridge: 'pistol',
};
const WEAPON_PLACE = {
  industrial: 'Op het industrieterrein', scrapyard: 'Op de schroothoop', harbour: 'Aan de kade',
  railyard: 'Bij het rangeerterrein', parking: 'In de parkeergarage', alley: 'In een steegje',
  bridge: 'Onder de brug',
};
const HEALTH_MESSAGE = {
  hospital: 'Opgelapt bij het ziekenhuis', clinic: 'Opgelapt bij de kliniek',
  doctors: 'Pleister gescoord bij de huisarts', pharmacy: 'Pijnstillers gescoord bij de apotheek',
  dentist: 'Pleister gescoord bij de tandarts', healthcare: 'Pleister gescoord bij de zorgpraktijk',
};
const ARMOR_MESSAGE = {
  fitness: 'Kogelwerend vest gescoord bij de sportschool', sports: 'Kogelwerend vest gescoord bij het sportcentrum',
  outdoor: 'Kogelwerend vest gescoord bij de outdoorwinkel', military: 'Kogelwerend vest gescoord bij de dumpwinkel',
  workwear: 'Kogelwerend vest gescoord bij de werkkledingzaak',
};

let money = [];
let weapons = [];
let health = null;
let healthRespawnAt = 0;
let armor = null;
let armorRespawnAt = 0;
let garages = [];
let weaponDistrictPoints = { pistol: [], uzi: [], shotgun: [] };
let poiSpots = { money: [], weapons: [], health: [], armor: [] };
let nextMaintainAt = 0;

function buildWeaponDistrictPoints(neighbourhoodPoints) {
  const byName = new Map(neighbourhoodPoints.map((p) => [p.name, p]));
  const result = {};
  for (const key of WEAPON_KEYS) {
    result[key] = (WEAPON_DISTRICTS[key] || []).map((name) => byName.get(name)).filter(Boolean);
  }
  return result;
}

function buildPoiSpots(pois) {
  const result = {};
  for (const cat of Object.keys(poiSpots)) {
    result[cat] = (pois[cat] || []).map((p) => ({ x: p.x, y: p.y, kind: p.kind, taken: false, live: 0, collected: false, respawnAt: 0 }));
  }
  return result;
}

// Weighted towards nearer spots. `inRange` is true when POIs exist here but
// are all taken or refilling, so callers skip the random-road fallback.
function pickPoiSpot(cat, cx, cy, radius, time) {
  const cands = [];
  let total = 0;
  let inRange = false;
  for (const s of poiSpots[cat]) {
    if (Math.abs(s.x - cx) > radius || Math.abs(s.y - cy) > radius) continue;
    const d = dist(s.x, s.y, cx, cy);
    if (d > radius) continue;
    inRange = true;
    if (s.taken || time < s.respawnAt || d < SPOT_MIN_PLAYER_DIST) continue;
    const w = 1 / (d + 25);
    cands.push([s, w]);
    total += w;
  }
  if (!cands.length) return { spot: null, inRange };
  let r = Math.random() * total;
  for (const [s, w] of cands) {
    r -= w;
    if (r <= 0) return { spot: s, inRange };
  }
  return { spot: cands[cands.length - 1][0], inRange };
}

function releaseSpot(pickup, time, collected) {
  const s = pickup && pickup.spot;
  if (!s) return;
  if (collected) s.collected = true;
  if (--s.live > 0) return;
  s.taken = false;
  if (s.collected) s.respawnAt = time + SPOT_RESPAWN[pickup.cat] * (0.8 + Math.random() * 0.4);
  s.collected = false;
}

function claimSpot(spot, cat, extra, x = spot.x, y = spot.y) {
  spot.taken = true;
  spot.live = (spot.live || 0) + 1;
  return { x, y, kind: spot.kind, spot, cat, ...extra };
}

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
    if (isInsideBuilding(map, px2, py2) || isInWater(map, px2, py2)) continue;
    return [px2, py2];
  }
  return null;
}

export function initPickups(world) {
  garages = world.map.meta.garages || [];
  for (const g of garages) g.cooldownUntil = 0;
  weaponDistrictPoints = buildWeaponDistrictPoints(world.map.meta.neighbourhoodPoints || []);
  poiSpots = buildPoiSpots(world.map.meta.pois || {});
  money = [];
  weapons = [];
  health = null;
  armor = null;
  healthRespawnAt = 0;
  armorRespawnAt = 0;
  nextMaintainAt = 0;
}

function randInt([lo, hi]) {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

function maintainMoney(world) {
  const { map, player } = world;
  money = money.filter((m) => {
    const keep = dist(m.x, m.y, player.x, player.y) < (m.spot ? MONEY_POI_RADIUS : MONEY_RADIUS) * 1.4;
    if (!keep) releaseSpot(m, world.time, false);
    return keep;
  });
  let guard = 0;
  while (money.length < MONEY_TARGET && guard++ < MONEY_TARGET * 4) {
    const { spot, inRange } = pickPoiSpot('money', player.x, player.y, MONEY_POI_RADIUS, world.time);
    if (spot) {
      spawnMoneyCluster(map, spot);
      continue;
    }
    if (inRange) break;
    const rs = randomRoadSpot(map, player.x, player.y, MONEY_RADIUS);
    if (!rs) break;
    const [x, y] = rs;
    if (dist(x, y, player.x, player.y) < SPOT_MIN_PLAYER_DIST) continue;
    money.push({ x, y, amount: 50 + Math.floor(Math.random() * 101) });
  }
}

function spawnMoneyCluster(map, spot) {
  const range = MONEY_BY_KIND[spot.kind] || [20, 50];
  money.push(claimSpot(spot, 'money', { amount: randInt(range) }));
  if (MONEY_SINGLE_KINDS.has(spot.kind)) return;
  const extra = 1 + Math.floor(Math.random() * 2);
  const start = Math.floor(Math.random() * MONEY_CLUSTER_OFFSETS.length);
  let added = 0;
  for (let i = 0; i < MONEY_CLUSTER_OFFSETS.length && added < extra; i++) {
    const [ox, oy] = MONEY_CLUSTER_OFFSETS[(start + i) % MONEY_CLUSTER_OFFSETS.length];
    const x = spot.x + ox, y = spot.y + oy;
    if (isInsideBuilding(map, x, y) || isInWater(map, x, y)) continue;
    money.push(claimSpot(spot, 'money', { amount: randInt(range) }, x, y));
    added++;
  }
}

function nearbyWeaponDistrict(player) {
  const nearby = [];
  for (const key of WEAPON_KEYS) {
    for (const p of weaponDistrictPoints[key]) {
      if (dist(p.x, p.y, player.x, player.y) < WEAPON_DISTRICT_MAX_DIST) nearby.push({ x: p.x, y: p.y, key });
    }
  }
  if (!nearby.length) return null;
  return nearby[Math.floor(Math.random() * nearby.length)];
}

function maintainWeapons(world) {
  const { map, player } = world;
  weapons = weapons.filter((w) => {
    const keep = dist(w.x, w.y, player.x, player.y) < (w.spot ? WEAPON_POI_RADIUS : WEAPON_RADIUS) * 1.4;
    if (!keep) releaseSpot(w, world.time, false);
    return keep;
  });
  let guard = 0;
  while (weapons.length < WEAPON_TARGET && guard++ < WEAPON_TARGET * 4) {
    const poi = pickPoiSpot('weapons', player.x, player.y, WEAPON_POI_RADIUS, world.time);
    if (poi.spot) {
      const key = WEAPON_BY_KIND[poi.spot.kind] || WEAPON_KEYS[Math.floor(Math.random() * WEAPON_KEYS.length)];
      weapons.push(claimSpot(poi.spot, 'weapons', { key }));
      continue;
    }
    if (poi.inRange) break;
    const district = nearbyWeaponDistrict(player);
    let spot = district && randomRoadSpot(map, district.x, district.y, WEAPON_DISTRICT_SPOT_RADIUS);
    if (spot && dist(spot[0], spot[1], player.x, player.y) > WEAPON_RADIUS) spot = null;
    let key = spot ? district.key : null;
    if (!spot) {
      spot = randomRoadSpot(map, player.x, player.y, WEAPON_RADIUS);
      key = WEAPON_KEYS[Math.floor(Math.random() * WEAPON_KEYS.length)];
    }
    if (!spot) break;
    const [x, y] = spot;
    if (dist(x, y, player.x, player.y) < SPOT_MIN_PLAYER_DIST) continue;
    weapons.push({ x, y, key });
  }
}

function spawnSingle(world, cat) {
  const { map, player } = world;
  const { spot } = pickPoiSpot(cat, player.x, player.y, HEALTH_POI_RADIUS, world.time);
  if (spot) return claimSpot(spot, cat, {});
  const rs = randomRoadSpot(map, player.x, player.y, HEALTH_RADIUS);
  return rs ? { x: rs[0], y: rs[1] } : null;
}

function maintainHealthArmor(world) {
  const { player } = world;
  if (health && dist(health.x, health.y, player.x, player.y) > HEALTH_REPLACE_DIST) {
    releaseSpot(health, world.time, false);
    health = null;
  }
  if (armor && dist(armor.x, armor.y, player.x, player.y) > HEALTH_REPLACE_DIST) {
    releaseSpot(armor, world.time, false);
    armor = null;
  }
  if (!health && world.time >= healthRespawnAt) health = spawnSingle(world, 'health');
  if (!armor && world.time >= armorRespawnAt) armor = spawnSingle(world, 'armor');
}

function collectFoot(world) {
  const { player } = world;
  const px = player.inVehicle ? player.inVehicle.x : player.x;
  const py = player.inVehicle ? player.inVehicle.y : player.y;

  for (let i = money.length - 1; i >= 0; i--) {
    const m = money[i];
    if (dist(px, py, m.x, m.y) < MONEY_PICKUP_DIST) {
      world.money += m.amount;
      const place = MONEY_PLACE[m.kind];
      world.addMessage(place ? `+ €${m.amount} gevonden ${place}` : `+ €${m.amount}`, 1.8);
      releaseSpot(m, world.time, true);
      money.splice(i, 1);
    }
  }

  for (let i = weapons.length - 1; i >= 0; i--) {
    const w = weapons[i];
    if (dist(px, py, w.x, w.y) < WEAPON_PICKUP_DIST) {
      world.ammo[w.key] = (world.ammo[w.key] || 0) + WEAPON_AMMO[w.key];
      const place = WEAPON_PLACE[w.kind];
      const text = `${WEAPON_LABELS[w.key] || w.key} +${WEAPON_AMMO[w.key]} munitie`;
      world.addMessage(place ? `${place}: ${text}` : text, 2);
      // pick up something stronger (or anything when the current gun is empty): switch to it
      const cur = world.weapon;
      const curEmpty = cur !== 'fists' && !(world.ammo[cur] > 0);
      if (w.key !== cur && (curEmpty || weaponDps(w.key) > weaponDps(cur))) world.weapon = w.key;
      releaseSpot(w, world.time, true);
      weapons.splice(i, 1);
    }
  }

  if (health && dist(px, py, health.x, health.y) < HEALTH_PICKUP_DIST) {
    world.health = Math.min(100, world.health + 100);
    world.addMessage(HEALTH_MESSAGE[health.kind] || 'Gezondheid opgekrikt', 2);
    releaseSpot(health, world.time, true);
    health = null;
    healthRespawnAt = world.time + HEALTH_RESPAWN_DELAY;
  }

  if (armor && dist(px, py, armor.x, armor.y) < HEALTH_PICKUP_DIST) {
    world.armor = Math.min(100, world.armor + 100);
    world.addMessage(ARMOR_MESSAGE[armor.kind] || 'Pantser opgekrikt', 2);
    releaseSpot(armor, world.time, true);
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
      v.wreckedByPlayer = false;
      v._exploded = false;
      world.health = 100;
      world.armor = 100;
      world.wanted = 0;
      world.addMessage('Spuit & Klaar: als nieuw!', 2.2);
      g.cooldownUntil = world.time + GARAGE_COOLDOWN;
    }
  }
}

export function updatePickups(dt, world) {
  if (world.time >= nextMaintainAt) {
    nextMaintainAt = world.time + MAINTAIN_INTERVAL;
    maintainMoney(world);
    maintainWeapons(world);
    maintainHealthArmor(world);
  }
  collectFoot(world);
  updateGarages(world);
}

export function getPickupsForRender() {
  return { money, weapons, health, armor, garages };
}

// --- 3D representations --------------------------------------------------
// Local origin at ground level (y=0) for every builder below. Money/weapon
// icons bake their own hover offset into local geometry so the integrator
// can just do mesh.position.set(x, 0, y) like vehicles/peds; the money coin
// additionally wants a slow spin applied via mesh.rotation.y each frame
// (see integrationNotes). Materials/geometries are shared at module scope
// since many pickups can be alive at once - never call .dispose() on them
// from a removal path, only on the shared consts if the module is torn down
// (which never happens here).

const moneyCoinGeometry = new THREE.CylinderGeometry(0.42, 0.42, 0.1, 20);
moneyCoinGeometry.rotateZ(Math.PI / 2);
const moneyFaceMaterial = new THREE.MeshLambertMaterial({ color: 0xe0c020 });
const moneyRimMaterial = new THREE.MeshLambertMaterial({ color: 0x8a6a10 });

export function buildMoneyPickupMesh3D() {
  return new THREE.Mesh(moneyCoinGeometry, [moneyRimMaterial, moneyFaceMaterial, moneyFaceMaterial]);
}

const weaponPadGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.05, 16);
const weaponPadMaterial = new THREE.MeshLambertMaterial({ color: 0x141414, transparent: true, opacity: 0.55 });

const weaponBodyMaterials = {
  pistol: new THREE.MeshLambertMaterial({ color: 0x9aa0a6 }),
  uzi: new THREE.MeshLambertMaterial({ color: 0x3a3a3a }),
  shotgun: new THREE.MeshLambertMaterial({ color: 0x6b4a2a }),
};

const pistolBodyGeo = new THREE.BoxGeometry(0.34, 0.16, 0.16);
const pistolBarrelGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.26, 8);
pistolBarrelGeo.rotateZ(Math.PI / 2);
const pistolGripGeo = new THREE.BoxGeometry(0.12, 0.22, 0.12);

const uziBodyGeo = new THREE.BoxGeometry(0.5, 0.14, 0.14);
const uziMagGeo = new THREE.BoxGeometry(0.09, 0.26, 0.09);
const uziStockGeo = new THREE.BoxGeometry(0.18, 0.09, 0.09);

const shotgunBarrelGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.62, 8);
shotgunBarrelGeo.rotateZ(Math.PI / 2);
const shotgunPumpGeo = new THREE.BoxGeometry(0.16, 0.09, 0.15);
const shotgunStockGeo = new THREE.BoxGeometry(0.24, 0.13, 0.11);

function buildPistolIcon() {
  const group = new THREE.Group();
  const mat = weaponBodyMaterials.pistol;
  group.add(new THREE.Mesh(pistolBodyGeo, mat));
  const barrel = new THREE.Mesh(pistolBarrelGeo, mat);
  barrel.position.set(0.28, 0.02, 0);
  group.add(barrel);
  const grip = new THREE.Mesh(pistolGripGeo, mat);
  grip.position.set(-0.1, -0.16, 0);
  grip.rotation.z = 0.35;
  group.add(grip);
  return group;
}

function buildUziIcon() {
  const group = new THREE.Group();
  const mat = weaponBodyMaterials.uzi;
  group.add(new THREE.Mesh(uziBodyGeo, mat));
  const mag = new THREE.Mesh(uziMagGeo, mat);
  mag.position.set(-0.05, -0.18, 0);
  mag.rotation.z = -0.15;
  group.add(mag);
  const stock = new THREE.Mesh(uziStockGeo, mat);
  stock.position.set(-0.32, -0.02, 0);
  group.add(stock);
  return group;
}

function buildShotgunIcon() {
  const group = new THREE.Group();
  const mat = weaponBodyMaterials.shotgun;
  const barrel = new THREE.Mesh(shotgunBarrelGeo, mat);
  barrel.position.set(0.05, 0.02, 0);
  group.add(barrel);
  const pump = new THREE.Mesh(shotgunPumpGeo, mat);
  pump.position.set(0.02, -0.06, 0);
  group.add(pump);
  const stock = new THREE.Mesh(shotgunStockGeo, mat);
  stock.position.set(-0.34, -0.02, 0);
  group.add(stock);
  return group;
}

const WEAPON_ICON_BUILDERS = { pistol: buildPistolIcon, uzi: buildUziIcon, shotgun: buildShotgunIcon };

export function buildWeaponPickupMesh3D(key) {
  const group = new THREE.Group();
  const pad = new THREE.Mesh(weaponPadGeometry, weaponPadMaterial);
  pad.position.y = 0.03;
  group.add(pad);
  const icon = (WEAPON_ICON_BUILDERS[key] || buildPistolIcon)();
  icon.position.y = 0.34;
  group.add(icon);
  return group;
}

const healthPadGeometry = new THREE.BoxGeometry(0.9, 0.14, 0.9);
const healthPadMaterial = new THREE.MeshLambertMaterial({ color: 0xf0efe8 });
const healthArmXGeometry = new THREE.BoxGeometry(0.62, 0.2, 0.2);
const healthArmZGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.62);
const healthCrossMaterial = new THREE.MeshLambertMaterial({ color: 0xd1382f });

export function buildHealthPickupMesh3D() {
  const group = new THREE.Group();
  const pad = new THREE.Mesh(healthPadGeometry, healthPadMaterial);
  pad.position.y = 0.07;
  group.add(pad);
  const armX = new THREE.Mesh(healthArmXGeometry, healthCrossMaterial);
  armX.position.y = 0.24;
  group.add(armX);
  const armZ = new THREE.Mesh(healthArmZGeometry, healthCrossMaterial);
  armZ.position.y = 0.24;
  group.add(armZ);
  return group;
}

const ARMOR_SHIELD_SHAPE = (() => {
  const s = new THREE.Shape();
  s.moveTo(0, -0.4);
  s.lineTo(0.32, -0.22);
  s.lineTo(0.32, 0.12);
  s.quadraticCurveTo(0.32, 0.36, 0, 0.44);
  s.quadraticCurveTo(-0.32, 0.36, -0.32, 0.12);
  s.lineTo(-0.32, -0.22);
  s.closePath();
  return s;
})();
const armorShieldGeometry = new THREE.ExtrudeGeometry(ARMOR_SHIELD_SHAPE, {
  depth: 0.14,
  bevelEnabled: true,
  bevelThickness: 0.03,
  bevelSize: 0.03,
  bevelSegments: 2,
});
armorShieldGeometry.scale(1.3, 1.3, 1);
armorShieldGeometry.translate(0, 0, -0.07);
const armorShieldMaterial = new THREE.MeshLambertMaterial({ color: 0x3f6bd4 });
const armorRimGeometry = new THREE.ShapeGeometry(ARMOR_SHIELD_SHAPE);
armorRimGeometry.scale(1.42, 1.42, 1);
const armorRimMaterial = new THREE.MeshLambertMaterial({ color: 0x1c3a8a, side: THREE.DoubleSide });
const armorPadGeometry = new THREE.CylinderGeometry(0.55, 0.55, 0.05, 16);
const armorPadMaterial = new THREE.MeshLambertMaterial({ color: 0x1c3a8a, transparent: true, opacity: 0.4 });

export function buildArmorPickupMesh3D() {
  const group = new THREE.Group();
  const pad = new THREE.Mesh(armorPadGeometry, armorPadMaterial);
  pad.position.y = 0.03;
  group.add(pad);
  const rim = new THREE.Mesh(armorRimGeometry, armorRimMaterial);
  rim.position.y = 0.55;
  rim.position.z = -0.09;
  group.add(rim);
  const shield = new THREE.Mesh(armorShieldGeometry, armorShieldMaterial);
  shield.position.y = 0.55;
  group.add(shield);
  return group;
}

const garageDiscGeometry = new THREE.CylinderGeometry(1.4, 1.4, 0.05, 24);
const garageDiscMaterial = new THREE.MeshLambertMaterial({ color: 0xf5f5f0 });
const garageRingGeometry = new THREE.TorusGeometry(1.4, 0.09, 8, 24);
const garageRingMaterial = new THREE.MeshLambertMaterial({ color: 0xd1382f });
const garagePostGeometry = new THREE.BoxGeometry(0.16, 2.1, 0.16);
const garageBarGeometry = new THREE.BoxGeometry(2.3, 0.2, 0.2);
const garageFrameMaterial = new THREE.MeshLambertMaterial({ color: 0xf5f5f0 });
const garageTrimMaterial = new THREE.MeshLambertMaterial({ color: 0xd1382f });
const garageWrenchHandleGeometry = new THREE.CylinderGeometry(0.045, 0.045, 0.7, 8);
const garageWrenchHeadGeometry = new THREE.TorusGeometry(0.12, 0.045, 6, 10);
const garageWrenchMaterial = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });

export function buildGaragePickupMesh3D() {
  const group = new THREE.Group();

  const disc = new THREE.Mesh(garageDiscGeometry, garageDiscMaterial);
  disc.position.y = 0.03;
  group.add(disc);

  const ring = new THREE.Mesh(garageRingGeometry, garageRingMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.06;
  group.add(ring);

  const postL = new THREE.Mesh(garagePostGeometry, garageFrameMaterial);
  postL.position.set(-1.05, 1.05, 0);
  group.add(postL);
  const postR = new THREE.Mesh(garagePostGeometry, garageFrameMaterial);
  postR.position.set(1.05, 1.05, 0);
  group.add(postR);

  const bar = new THREE.Mesh(garageBarGeometry, garageTrimMaterial);
  bar.position.set(0, 2.1, 0);
  group.add(bar);

  const wrenchHandle = new THREE.Mesh(garageWrenchHandleGeometry, garageWrenchMaterial);
  wrenchHandle.position.set(0, 2.1, 0.18);
  wrenchHandle.rotation.z = Math.PI / 4;
  group.add(wrenchHandle);

  const wrenchHead = new THREE.Mesh(garageWrenchHeadGeometry, garageWrenchMaterial);
  wrenchHead.position.set(0.24, 2.34, 0.18);
  wrenchHead.rotation.x = Math.PI / 2;
  group.add(wrenchHead);

  return group;
}
