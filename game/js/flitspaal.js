import { speedOutcome, SPEED_MARGIN_KMH, FINE_COOLDOWN } from './flitspaalrules.js';
import { dist } from './util.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder, vcMaterial } from './pixelart3d.js';
import { makeProp, addProp, removeProp } from './breakables.js';
import { placeTrafficLight } from './trafficlights.js';
import { noteMoney } from './finance.js';

const TARGET_COUNT = 12;
const MIN_COUNT = 8;
const MIN_SEPARATION = 150; // meters, keeps cameras spread across the map
const TRIGGER_RADIUS = 6;
const FLAT_LIMIT_KMH = 60; // fallback when a road has no usable speed field
const PROP_RADIUS = 70;

function pickPoint(road) {
  if (!road.pts || road.pts.length < 3) return null;
  const i = 1 + Math.floor(Math.random() * (road.pts.length - 2));
  const [x, y] = road.pts[i];
  const [px, py] = road.pts[i - 1];
  const [nx, ny] = road.pts[i + 1];
  return { x, y, angle: Math.atan2(ny - py, nx - px) };
}

function makeCamera(road, p) {
  return { x: p.x, y: p.y, angle: p.angle, limitKmh: road.speed ? road.speed * 3.6 : null, lastFine: -Infinity, warned: false };
}

export function initFlitspaal(world) {
  const roads = world.map.roads.filter((r) => (r.cat === 'major' || r.cat === 'normal') && !r.z && r.pts && r.pts.length >= 5);
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

  // the pole stands on the right-hand kerb; cam.x/y stays the road trigger point.
  // Never in a lane (a dual carriageway's other half, a slip road): then the
  // other kerb, a step further out, or no camera there
  const map = world.map;
  const onLanes = (x, y) => map.roadsNear(x, y, 12).some((r) => {
    if (r.cat === 'foot' || r.cat === 'cycle' || r.bridge) return false;
    const hw = (r.width || 6) / 2 + 0.4;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const [ax, ay] = r.pts[i], [bx, by] = r.pts[i + 1];
      const ex = bx - ax, ey = by - ay, L2 = ex * ex + ey * ey || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / L2));
      // (a ring road's lanes up on a deck or down in a cutting are not in the way)
      if (r.z && Math.abs(r.z[i] + (r.z[i + 1] - r.z[i]) * t) > 1) continue;
      if ((ax + ex * t - x) ** 2 + (ay + ey * t - y) ** 2 < hw * hw) return true;
    }
    return false;
  });
  world.flitspaalen = cams.filter((cam) => {
    const kerb = placeTrafficLight(cam, map);
    const dx = cam.x - kerb.x, dy = cam.y - kerb.y, d = Math.hypot(dx, dy) || 1;
    for (const [sx, sy] of [[dx / d, dy / d], [-dx / d, -dy / d]]) {
      for (const extra of [0, 1.5, 3]) {
        const x = cam.x + sx * (d + extra), y = cam.y + sy * (d + extra);
        if (onLanes(x, y)) continue;
        cam.px = x; cam.py = y;
        return true;
      }
    }
    return false;
  });
}

export function updateFlitspaal(dt, world) {
  const cams = world.flitspaalen;
  if (!cams || !cams.length) return;
  const v = world.player.inVehicle;
  if (!v || v.wrecked || v.isHeli) return;

  const speedKmh = Math.abs(v.speed) * 3.6;
  for (const cam of cams) {
    if (cam.broken || world.time - cam.lastFine < FINE_COOLDOWN) continue;
    if (dist(v.x, v.y, cam.x, cam.y) > TRIGGER_RADIUS) continue;
    const limitKmh = cam.limitKmh || FLAT_LIMIT_KMH;
    const outcome = speedOutcome({ speedKmh, limitKmh, warned: cam.warned, money: world.money });
    if (outcome.kind === 'none') continue;

    cam.lastFine = world.time;
    if (outcome.kind === 'warning') {
      cam.warned = true;
      world.addMessage(
        `Flitspaal: je reed ${Math.round(speedKmh)} km/u, toegestaan is ${Math.round(limitKmh)}. Dit is een waarschuwing; volgende keer een boete.`,
        4
      );
      continue;
    }
    cam.warned = true;
    noteMoney('Boetes');
    world.money = Math.max(0, world.money - outcome.fine);
    world.addMessage(
      `Geflitst! Boete: €${outcome.fine} (u reed ${Math.round(speedKmh)} km/u, toegestaan is ${Math.round(limitKmh)})`,
      4
    );
  }
}

export function streamFlitspaalProps(world, px, py) {
  for (const cam of world.flitspaalen || []) {
    const near = Math.abs(cam.px - px) < PROP_RADIUS && Math.abs(cam.py - py) < PROP_RADIUS;
    if (!near || cam.broken) {
      if (cam.prop) { removeProp(cam.prop); cam.prop = null; }
      continue;
    }
    if (cam.prop) continue;
    const prop = makeProp('flitspaal', cam.px, cam.py, {
      disposeMesh: true,
      onBreak: () => {
        cam.broken = true;
        cam.prop = null;
        if (cam.mesh) cam.mesh.userData.broken = true;
      },
      onRestore: () => {
        cam.broken = false;
        if (cam.mesh) cam.mesh.userData.broken = false;
      },
      makeMesh: () => {
        const m = buildFlitspaalMesh3D();
        m.rotation.y = -cam.angle;
        return m;
      },
    });
    if (addProp(prop)) cam.prop = prop;
  }
}

export function buildFlitspaalMesh3D() {
  const B = new GeoBuilder(2);
  B.box(0, 0.08, 0, 0.5, 0.16, 0.5, 0x8f8c86);
  B.box(0, 1.6, 0, 0.16, 3.1, 0.16, 0x6f7479);
  B.box(0, 0.5, 0, 0.17, 0.25, 0.17, 0xd9b12a);
  B.box(0, 0.78, 0, 0.17, 0.12, 0.17, 0x1e1e1e);
  B.box(0.08, 3.05, 0, 0.5, 0.75, 0.46, 0x5d6166);
  B.box(0.08, 3.46, 0, 0.58, 0.06, 0.52, 0x4a4d52);
  B.box(0.335, 3.2, 0, 0.02, 0.2, 0.3, 0x1b2226, 1);
  B.box(0.335, 2.88, 0, 0.02, 0.16, 0.3, 0xdad6c8, 1);
  B.box(0.36, 3.2, 0, 0.06, 0.04, 0.36, 0x4a4d52);
  return new THREE.Mesh(B.build(), [vcMaterial({ roughness: 0.7 }), vcMaterial({ roughness: 0.15, metalness: 0.3 })]);
}
