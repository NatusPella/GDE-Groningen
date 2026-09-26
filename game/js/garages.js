import { dist } from './util.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Spuit & Klaar drive-in garages: drive in to repair the vehicle, heal,
// refill armour and lose the wanted level.
const GARAGE_RADIUS = 6;
const GARAGE_COOLDOWN = 10;

let garages = [];

export function initGarages(world) {
  garages = world.map.meta.garages || [];
  for (const g of garages) g.cooldownUntil = 0;
}

export function updateGarages(dt, world) {
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

export function getGaragesForRender() {
  return garages;
}

// Local origin at ground level; materials/geometries are shared by every
// garage, so a removal path must never dispose them.
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

export function buildGarageMesh3D() {
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
