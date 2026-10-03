import { dist, isInWater, pointInPolygon } from './util.js';
import { clearOfReal } from './countryreal.js';
import { recordUnique } from './achievements.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const TRIGGER_RADIUS = 4;
const USE_COOLDOWN = 60;
const MIN_SPEND = 12;
const MAX_SPEND = 35;
const HEAL_AMOUNT = 15;
const TOAST_DURATION = 3.2;

let spots = [];

export function initHoreca(world) {
  // OSM places bars/cafés at a point inside their building: move each one out
  // to the street side (also used by the terrace props in cityprops.js)
  const map = world.map;
  for (const h of map.meta.horeca || []) {
    [h.x, h.y] = map.escapeBuilding(h.x, h.y, 1.2);
    // pushed into a closed-off courtyard: the nearest street instead
    if (!map.canWalkOut(h.x, h.y, 30)) {
      const o = map.findOpenSpawn(h.x, h.y, 80);
      if (o) { h.x = o.x; h.y = o.y; }
    }
    // inside an Ommelanden building box: step out of it
    const r = clearOfReal(h.x, h.y, (x, y) => !isInWater(map, x, y) && !map.buildingsNear(x, y, 1).some((b) => pointInPolygon(x, y, b.pts)));
    if (r) { h.x = r.x; h.y = r.y; }
  }
  spots = (world.map.meta.horeca || []).map((h) => ({ x: h.x, y: h.y, name: h.name, lastUsed: -Infinity }));
}

const TOASTS = [
  (name, amount) => `Bakje bitterballen bij ${name} - €${amount} lichter, weer wat op krachten`,
  (name, amount) => `Snel wat gegeten bij ${name}. €${amount} armer, maar je knapt al op`,
  (name, amount) => `Biertje met bittergarnituur bij ${name} - proost! (-€${amount})`,
  (name, amount) => `${name} zet je weer op de been voor €${amount}`,
  (name, amount) => `Even bijgetankt op het terras van ${name} - €${amount} lichter`,
  (name, amount) => `Frikandelbroodje gescoord bij ${name}, -€${amount}`,
  (name, amount) => `${name}: "Moi! Wat mag t wezen?" Een bakkie en n kniepertje, -€${amount}`,
  (name, amount) => `Kastelein van ${name}: "Zo, dat was goud, nait? Hou dij goud!" (-€${amount})`,
];

// Close enough to order: the prompt (prompts.js) and the E handler share it.
export const HORECA_USE_RADIUS = 2.4;

export function nearestHorecaSpot(world) {
  if (!spots.length || world.player.inVehicle) return null;
  const { x: px, y: py } = world.player;
  let best = null, bestD = HORECA_USE_RADIUS;
  for (const spot of spots) {
    const d = dist(px, py, spot.x, spot.y);
    if (d <= bestD) { best = spot; bestD = d; }
  }
  return best;
}

export function horecaState(world, spot) {
  if (world.time - spot.lastUsed < USE_COOLDOWN) return 'cooldown';
  if (world.money < MIN_SPEND) return 'broke';
  return 'ready';
}

// Runs before the player update so E at a café orders instead of also
// kissing the companion or opening a car door.
export function tryHorecaInteract(world) {
  const { input } = world;
  if (!input || !(input.wasPressed('e') || input.wasPressed('f'))) return false;
  const spot = nearestHorecaSpot(world);
  if (!spot) return false;
  input.consume('e');
  input.consume('f');
  const name = spot.name || 'de kroeg';
  const state = horecaState(world, spot);
  if (state === 'cooldown') {
    world.addMessage(`Je hebt net al wat gehad bij ${name}. Even laten zakken.`, TOAST_DURATION);
    return true;
  }
  if (state === 'broke') {
    world.addMessage(`Geen geld voor een hapje bij ${name}. Eerst wat verdienen.`, TOAST_DURATION);
    return true;
  }
  spot.lastUsed = world.time;
  const amount = Math.min(world.money, MIN_SPEND + Math.floor(Math.random() * (MAX_SPEND - MIN_SPEND + 1)));
  world.money = Math.max(0, world.money - amount);
  world.health = Math.min(100, world.health + HEAL_AMOUNT);
  const toast = TOASTS[Math.floor(Math.random() * TOASTS.length)];
  world.addMessage(toast(name, amount), TOAST_DURATION);
  recordUnique(world, 'horeca', `${name}@${Math.round(spot.x)},${Math.round(spot.y)}`);
  return true;
}

// kept for the main loop; ordering is now interactive (tryHorecaInteract)
export function updateHoreca() {}

export function getHorecaForRender() {
  return spots;
}

// --- 3D representation ---------------------------------------------------
// A floating food badge (knife and fork on a terracotta disc) above a small
// ground pad, bobbing gently - reads as "eten" at a glance, in the horeca
// colour the minimap uses. Static/never removed, so nothing needs disposing.
const padGeometry = new THREE.CylinderGeometry(0.55, 0.55, 0.04, 20);
const padMaterial = new THREE.MeshLambertMaterial({ color: 0xc9622a, transparent: true, opacity: 0.85 });

function drawFoodBadge() {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 6, 0, Math.PI * 2);
  g.fillStyle = '#c9622a'; g.fill();
  g.lineWidth = 7; g.strokeStyle = '#f2ede0'; g.stroke();
  g.fillStyle = '#f2ede0'; g.strokeStyle = '#f2ede0'; g.lineCap = 'round';
  // fork: three tines, a neck and a handle
  g.lineWidth = 5;
  for (const dx of [-9, 0, 9]) { g.beginPath(); g.moveTo(46 + dx, 30); g.lineTo(46 + dx, 50); g.stroke(); }
  g.beginPath(); g.moveTo(37, 50); g.quadraticCurveTo(46, 62, 55, 50); g.stroke();
  g.lineWidth = 7; g.beginPath(); g.moveTo(46, 58); g.lineTo(46, 98); g.stroke();
  // knife: rounded blade and a handle
  g.beginPath(); g.moveTo(80, 28); g.quadraticCurveTo(96, 44, 90, 66); g.lineTo(80, 66); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(84, 64); g.lineTo(84, 98); g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

let badgeMaterial = null;

// withPad false: the pads come from horecaPads3D, one draw for all of them
export function buildHorecaMarkerMesh3D(withPad = true) {
  if (!badgeMaterial) badgeMaterial = new THREE.SpriteMaterial({ map: drawFoodBadge(), transparent: true, depthWrite: false, fog: true });
  const group = new THREE.Group();
  group.name = 'horeca-marker';
  if (withPad) {
    const pad = new THREE.Mesh(padGeometry, padMaterial);
    pad.position.y = 0.03;
    group.add(pad);
  }
  const badge = new THREE.Sprite(badgeMaterial);
  badge.scale.set(0.48, 0.48, 1);
  const phase = Math.random() * Math.PI * 2;
  badge.onBeforeRender = () => { badge.position.y = 2.3 + Math.sin(performance.now() / 650 + phase) * 0.06; };
  badge.position.y = 2.3;
  group.add(badge);
  return group;
}

export function horecaPads3D(list) {
  const m = new THREE.InstancedMesh(padGeometry, padMaterial, list.length);
  m.count = 0;
  m.frustumCulled = false;
  m.name = 'horeca-pads';
  m.matrixAutoUpdate = false;
  m.userData.spots = list;
  m.userData.at = null;
  return m;
}

// only the pads within r of (px, py), refreshed when the player has moved a bit
const _padM = new THREE.Matrix4();
export function updateHorecaPads3D(m, px, py, r) {
  const at = m.userData.at;
  if (at && Math.abs(at[0] - px) + Math.abs(at[1] - py) < 10) return;
  m.userData.at = [px, py];
  let n = 0;
  for (const h of m.userData.spots) {
    if (Math.abs(h.x - px) > r || Math.abs(h.y - py) > r) continue;
    m.setMatrixAt(n++, _padM.makeTranslation(h.x, 0.03, h.y));
  }
  m.count = n;
  m.instanceMatrix.needsUpdate = true;
}
