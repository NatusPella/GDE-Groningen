import { dist, isInWater } from './util.js';
import { countryFacilities, countryDoor, poiLayerPlaces } from './facilities.js';
import { recordUnique } from './achievements.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { noteMoney } from './finance.js';

const TRIGGER_RADIUS = 4;
const USE_COOLDOWN = 60;
const MIN_SPEND = 12;
const MAX_SPEND = 35;
const HEAL_AMOUNT = 15;
const TOAST_DURATION = 3.2;
const COUNTRY_SPACING = 250;
const SP_SPACING = 90; // the real cafés of shopplaces.json (#175)

let spots = [];

export function initHoreca(world) {
  // OSM places bars/cafés at a point inside their building: move each one out
  // to the street side (also used by the terrace props in cityprops.js)
  const map = world.map;
  // the cafés come out of the tiles of their layered POI rows (#314, C1), on a copy: the fixes below move a place to the
  // street, and go back into map.meta.horeca, which cityprops.js, pedestrians.js and pedroutes.js still read whole
  const places = poiLayerPlaces(map, 'horeca').map((h) => ({ ...h }));
  for (const h of places) {
    [h.x, h.y] = map.escapeBuilding(h.x, h.y, 1.2);
    // pushed into a closed-off courtyard, or out onto the canal side (Café De Lallende Koe stond in het water): the nearest street instead
    if (isInWater(map, h.x, h.y) || !map.canWalkOut(h.x, h.y, 30)) {
      const o = map.findOpenSpawn(h.x, h.y, 80);
      if (o) { h.x = o.x; h.y = o.y; }
    }
  }
  syncHorecaMeta(map, places);
  spots = places.map((h) => ({ x: h.x, y: h.y, name: cafeName(h), osmName: h.name, lastUsed: -Infinity }));
}

// The street-side point of every café in the list of the map too: the order of the POI rows is the order of the list
// (poisections.js layerRows), so a reader that is still on the whole list sees the same spots as the game does.
function syncHorecaMeta(map, places) {
  const meta = (map.meta && map.meta.horeca) || [];
  if (meta.length !== places.length) return;
  for (let i = 0; i < meta.length; i++) { meta[i].x = places[i].x; meta[i].y = places[i].y; }
}

// The waterway fixes put water into the world after the start (vaarload.js: patches over the holes under bridges and in locks):
// a café that ends up in it steps out to the nearest open ground, like at the start (Kroeg 't Scheve Toorntje stond zo in het water).
export function refitHoreca(map) {
  let n = 0;
  for (const s of spots) {
    if (s.place || !isInWater(map, s.x, s.y)) continue;
    const o = map.findOpenSpawn(s.x, s.y, 80);
    if (!o || isInWater(map, o.x, o.y)) continue;
    const h = (map.meta.horeca || []).find((q) => q.x === s.x && q.y === s.y);
    if (h) { h.x = o.x; h.y = o.y; }
    s.x = o.x; s.y = o.y;
    n++;
  }
  return n;
}

// Out in the Ommelanden: the real cafés, pubs and restaurants (facilities.js),
// at their street door; their tiles are in while this runs (main.js).
export function initCountryHoreca(world) {
  const map = world.map;
  for (const f of countryFacilities('horeca')) {
    if (spots.some((s) => dist(s.x, s.y, f.x, f.y) < (f.sp ? SP_SPACING : COUNTRY_SPACING))) continue;
    const d = countryDoor(map, f.x, f.y);
    if (!d) continue;
    const h = { x: d.x, y: d.y };
    // ook buiten de stad een verzonnen naam: `f.own` is de naam uit OSM en die mag nooit in beeld (#488)
    spots.push({ x: d.x, y: d.y, name: cafeName(h), osmName: `${f.place} ${Math.round(f.x)},${Math.round(f.y)}`, place: f.place, lastUsed: -Infinity });
  }
}

// What you order and read about happens in a made-up café, the same one
// every time for this spot (no real business names).
const CAFE_NAMES = [
  'Café De Lallende Koe', "Kroeg 't Scheve Toorntje", 'Eetcafé De Vette Klomp', 'Café Kon Minder',
  'Café De Natte Fiets', 'Bar Moi & Proost', "Café 't Kolde Bakkie", 'Café De Dikke Duif',
  'Eetcafé De Zatte Eierbal', "Café 't Lekke Bandje", 'Café De Stoere Stadjer', "Bar 't Natte Peerd",
  'Eetcafé Mien Bakkie', 'Café De Wiebelkruk', 'Nachtcafé De Uil van Half Vier', "Café 't Kniepertje",
];
function cafeName(h) {
  const k = Math.abs(Math.round(h.x * 7 + h.y * 13));
  return CAFE_NAMES[k % CAFE_NAMES.length];
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
  noteMoney('Eten en drinken');
  world.money = Math.max(0, world.money - amount);
  world.health = Math.min(100, world.health + HEAL_AMOUNT);
  const toast = TOASTS[Math.floor(Math.random() * TOASTS.length)];
  world.addMessage(toast(name, amount), TOAST_DURATION);
  recordUnique(world, 'horeca', `${spot.osmName || name}@${Math.round(spot.x)},${Math.round(spot.y)}`);
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
const badgeTime = { value: 0 };

// The badges of every horeca spot in view as one InstancedMesh: a quad that
// faces the camera like a sprite, bobbing in the vertex shader (aPhase).
function badgeMat() {
  if (badgeMaterial) return badgeMaterial;
  badgeMaterial = new THREE.MeshBasicMaterial({ map: drawFoodBadge(), transparent: true, depthWrite: false, fog: true });
  badgeMaterial.onBeforeCompile = (sh) => {
    sh.uniforms.uBadgeTime = badgeTime;
    sh.vertexShader = 'uniform float uBadgeTime;\nattribute float aPhase;\n' + sh.vertexShader.replace('#include <project_vertex>', `
      vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(0.0, 2.3 + sin(uBadgeTime + aPhase) * 0.06, 0.0, 1.0);
      mvPosition.xy += position.xy;
      gl_Position = projectionMatrix * mvPosition;`);
  };
  badgeMaterial.customProgramCacheKey = () => 'horeca-badge';
  return badgeMaterial;
}

export function horecaBadges3D(list) {
  const geo = new THREE.PlaneGeometry(0.48, 0.48);
  const phase = new Float32Array(Math.max(1, list.length));
  geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1));
  const m = new THREE.InstancedMesh(geo, badgeMat(), list.length);
  m.count = 0;
  m.frustumCulled = false;
  m.name = 'horeca-badges';
  m.matrixAutoUpdate = false;
  m.renderOrder = 1;
  m.userData.spots = list;
  m.userData.at = null;
  m.onBeforeRender = () => { badgeTime.value = (performance.now() / 650) % (Math.PI * 2000); };
  return m;
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

// only the pads (badges) within r of (px, py), refreshed when the player has moved a bit
const _padM = new THREE.Matrix4();
export function updateHorecaPads3D(m, px, py, r) {
  const at = m.userData.at;
  if (at && Math.abs(at[0] - px) + Math.abs(at[1] - py) < 10) return;
  m.userData.at = [px, py];
  let n = 0;
  const ph = m.geometry.attributes.aPhase;
  const spots = m.userData.spots;
  for (let i = 0; i < spots.length; i++) {
    const h = spots[i];
    if (Math.abs(h.x - px) > r || Math.abs(h.y - py) > r) continue;
    if (ph) ph.array[n] = (i * 2.399) % (Math.PI * 2);
    m.setMatrixAt(n++, _padM.makeTranslation(h.x, ph ? 0 : 0.03, h.y));
  }
  m.count = n;
  m.instanceMatrix.needsUpdate = true;
  if (ph) ph.needsUpdate = true;
}
