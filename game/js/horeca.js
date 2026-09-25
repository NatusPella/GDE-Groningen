import { dist } from './util.js';
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
  for (const h of world.map.meta.horeca || []) {
    [h.x, h.y] = world.map.escapeBuilding(h.x, h.y, 1.2);
  }
  spots = (world.map.meta.horeca || []).map((h) => ({ x: h.x, y: h.y, name: h.name, lastUsed: -Infinity }));
}

const TOASTS = [
  (name, amount) => `Bakje bitterballen bij ${name} - €${amount} lichter, weer wat op krachten`,
  (name, amount) => `Snel wat gegeten bij ${name}. Kost €${amount}, voelt al beter`,
  (name, amount) => `Biertje met bittergarnituur bij ${name} - proost! (-€${amount})`,
  (name, amount) => `${name} zet je weer op de been voor €${amount}`,
  (name, amount) => `Even bijgetankt op het terras van ${name} - €${amount} lichter`,
  (name, amount) => `Frikandelbroodje gescoord bij ${name}, -€${amount}`,
];

export function updateHoreca(dt, world) {
  if (!spots.length || world.player.inVehicle || world.money < MIN_SPEND) return;
  const { x: px, y: py } = world.player;
  for (const spot of spots) {
    if (world.time - spot.lastUsed < USE_COOLDOWN) continue;
    if (dist(px, py, spot.x, spot.y) > TRIGGER_RADIUS) continue;

    spot.lastUsed = world.time;
    const amount = Math.min(world.money, MIN_SPEND + Math.floor(Math.random() * (MAX_SPEND - MIN_SPEND + 1)));
    world.money = Math.max(0, world.money - amount);
    world.health = Math.min(100, world.health + HEAL_AMOUNT);
    const name = spot.name || 'de kroeg';
    const toast = TOASTS[Math.floor(Math.random() * TOASTS.length)];
    world.addMessage(toast(name, amount), TOAST_DURATION);
    break;
  }
}

export function getHorecaForRender() {
  return spots;
}

// --- 3D representation ---------------------------------------------------
// A little café terrace flag on a wooden pole plus a cup on the ground pad -
// terracotta/cream/wood palette, distinct from pickups' gold/black/white-red/
// blue and flitspaal's gray-pole-orange-box, so it reads as its own thing at
// a glance. Static/never removed (see integrationNotes), so materials never
// need disposing.
const padGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.05, 16);
const padMaterial = new THREE.MeshLambertMaterial({ color: 0xc9622a });
const poleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.3, 6);
const poleMaterial = new THREE.MeshLambertMaterial({ color: 0x3a2c1f });
const flagGeometry = new THREE.BoxGeometry(0.5, 0.36, 0.04);
const flagMaterial = new THREE.MeshLambertMaterial({ color: 0xf2ede0 });
const cupGeometry = new THREE.CylinderGeometry(0.1, 0.08, 0.16, 10);
const cupMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });

export function buildHorecaMarkerMesh3D() {
  const group = new THREE.Group();

  const pad = new THREE.Mesh(padGeometry, padMaterial);
  pad.position.y = 0.03;
  group.add(pad);

  const pole = new THREE.Mesh(poleGeometry, poleMaterial);
  pole.position.y = 0.68;
  group.add(pole);

  const flag = new THREE.Mesh(flagGeometry, flagMaterial);
  flag.position.set(0.24, 1.32, 0);
  group.add(flag);

  const cup = new THREE.Mesh(cupGeometry, cupMaterial);
  cup.position.set(-0.2, 0.14, 0.12);
  group.add(cup);

  return group;
}
