import { dist } from './util.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const TARGET_COUNT = 12;
const MIN_COUNT = 8;
const MIN_SEPARATION = 150; // meters, keeps cameras spread across the map
const TRIGGER_RADIUS = 6;
const FINE_COOLDOWN = 15;
const SPEED_MARGIN_KMH = 25; // "a good margin" over the local limit
const FLAT_LIMIT_KMH = 60; // fallback when a road has no usable speed field
const MIN_FINE = 35;
const MAX_FINE = 75;

function pickPoint(road) {
  if (!road.pts || road.pts.length < 3) return null;
  const i = 1 + Math.floor(Math.random() * (road.pts.length - 2));
  const [x, y] = road.pts[i];
  const [px, py] = road.pts[i - 1];
  const [nx, ny] = road.pts[i + 1];
  return { x, y, angle: Math.atan2(ny - py, nx - px) };
}

function makeCamera(road, p) {
  return { x: p.x, y: p.y, angle: p.angle, limitKmh: road.speed ? road.speed * 3.6 : null, lastFine: -Infinity };
}

export function initFlitspaal(world) {
  const roads = world.map.roads.filter((r) => (r.cat === 'major' || r.cat === 'normal') && r.pts && r.pts.length >= 5);
  const shuffled = roads.slice().sort(() => Math.random() - 0.5);
  const cams = [];
  const used = new Set();

  for (const road of shuffled) {
    if (cams.length >= TARGET_COUNT) break;
    const p = pickPoint(road);
    if (!p) continue;
    if (cams.some((c) => dist(c.x, c.y, p.x, p.y) < MIN_SEPARATION)) continue;
    used.add(road);
    cams.push(makeCamera(road, p));
  }
  // sparse map: relax the spacing rule rather than end up with too few cameras
  for (const road of shuffled) {
    if (cams.length >= MIN_COUNT) break;
    if (used.has(road)) continue;
    const p = pickPoint(road);
    if (!p) continue;
    cams.push(makeCamera(road, p));
  }

  world.flitspaalen = cams;
}

export function updateFlitspaal(dt, world) {
  const cams = world.flitspaalen;
  if (!cams || !cams.length) return;
  const v = world.player.inVehicle;
  if (!v || v.wrecked) return;

  const speedKmh = Math.abs(v.speed) * 3.6;
  for (const cam of cams) {
    if (world.time - cam.lastFine < FINE_COOLDOWN) continue;
    if (dist(v.x, v.y, cam.x, cam.y) > TRIGGER_RADIUS) continue;
    const limitKmh = cam.limitKmh || FLAT_LIMIT_KMH;
    if (speedKmh <= limitKmh + SPEED_MARGIN_KMH) continue;

    cam.lastFine = world.time;
    const fine = MIN_FINE + Math.floor(Math.random() * (MAX_FINE - MIN_FINE + 1));
    world.money = Math.max(0, world.money - fine);
    world.addMessage(
      `Geflitst! Boete: €${fine} (u reed ${Math.round(speedKmh)} km/u waar ${Math.round(limitKmh)} was toegestaan)`,
      4
    );
  }
}

export function buildFlitspaalMesh3D() {
  const group = new THREE.Group();

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 2.6, 8),
    new THREE.MeshLambertMaterial({ color: 0x7d8489 })
  );
  pole.position.y = 1.3;
  group.add(pole);

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.42, 0.3),
    new THREE.MeshLambertMaterial({ color: 0xe0a020 })
  );
  head.position.set(0.25, 2.4, 0);
  group.add(head);

  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.1, 10),
    new THREE.MeshLambertMaterial({ color: 0x2a2a2a })
  );
  lens.rotation.z = Math.PI / 2;
  lens.position.set(0.55, 2.4, 0);
  group.add(lens);

  return group;
}
