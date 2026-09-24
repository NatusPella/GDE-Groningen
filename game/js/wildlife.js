import { dist, angleLerp, pointInPolygon, polygonBounds, SeededRng } from './util.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder, vcMaterial, composeMatrix, tubeGeometry } from './pixelart3d.js';

// Ambient GTA6-marketing-parody wildlife: seagulls near water/the Diepenring,
// the occasional cow/sheep in Noorderplantsoen-style green space. Pure
// atmosphere - no health, no combat, no collision with the player/vehicles.
// Mirrors pedestrians.js's spawn-near/despawn-by-distance + wander-waypoint
// pattern, but simpler (no flee/dead states).

const POP_TARGET = 16;
const SPAWN_RADIUS = 70;
const DESPAWN_DIST = 150;
const MAINTAIN_INTERVAL = 2.5;

const FARM_CHANCE = 1 / 6; // rare: roughly 1 in 5-8 of the wildlife budget
const BIAS_SEARCH_RADIUS = 100;

const SEAGULL_SPEED_MIN = 3.4;
const SEAGULL_SPEED_MAX = 4.6;
const SEAGULL_TURN = 1.1; // rad/s-ish smoothing -> wide, gentle loops
const SEAGULL_WAYPOINT_MIN = 3, SEAGULL_WAYPOINT_MAX = 7;
const SEAGULL_WAYPOINT_RADIUS = 26;
const SEAGULL_ARRIVE_RADIUS = 3;

const GRAZER_SPEED = 0.6;
const GRAZER_TURN = 3;
const GRAZER_HOME_RADIUS_MIN = 6, GRAZER_HOME_RADIUS_MAX = 13;
const GRAZER_PAUSE_MIN = 3, GRAZER_PAUSE_MAX = 8;
const GRAZER_ARRIVE_RADIUS = 1;

let maintainTimer = 0;

function randomPointInPolygon(pts, rng) {
  const [minx, miny, maxx, maxy] = polygonBounds(pts);
  for (let i = 0; i < 8; i++) {
    const x = minx + rng() * (maxx - minx);
    const y = miny + rng() * (maxy - miny);
    if (pointInPolygon(x, y, pts)) return [x, y];
  }
  return [(minx + maxx) / 2, (miny + maxy) / 2];
}

function cowPatches(rng) {
  const n = 2 + Math.floor(rng() * 2);
  const patches = [];
  for (let i = 0; i < n; i++) {
    patches.push({
      x: -0.3 + rng() * 0.6,
      y: -0.18 + rng() * 0.36,
      r: 0.1 + rng() * 0.12,
      rot: rng() * Math.PI,
    });
  }
  return patches;
}

export function spawnWildlifeNear(map, px, py, count, rng = Math.random) {
  const animals = [];
  const waterPolys = map.waterNear(px, py, BIAS_SEARCH_RADIUS);
  const greenPolys = map.greenNear(px, py, BIAS_SEARCH_RADIUS);

  for (let i = 0; i < count; i++) {
    if (greenPolys.length && rng() < FARM_CHANCE) {
      const poly = greenPolys[Math.floor(rng() * greenPolys.length)];
      const [hx, hy] = randomPointInPolygon(poly.pts, rng);
      const kind = rng() < 0.5 ? 'cow' : 'sheep';
      animals.push({
        kind,
        x: hx,
        y: hy,
        angle: rng() * Math.PI * 2 - Math.PI,
        speed: 0,
        wanderTarget: { x: hx, y: hy },
        homeX: hx,
        homeY: hy,
        homeRadius: GRAZER_HOME_RADIUS_MIN + rng() * (GRAZER_HOME_RADIUS_MAX - GRAZER_HOME_RADIUS_MIN),
        waypointTimer: rng() * GRAZER_PAUSE_MAX,
        bobSeed: rng() * Math.PI * 2,
        patches: kind === 'cow' ? cowPatches(rng) : null,
      });
      continue;
    }

    let sx, sy;
    if (waterPolys.length) {
      const poly = waterPolys[Math.floor(rng() * waterPolys.length)];
      const [wx, wy] = randomPointInPolygon(poly.pts, rng);
      const ang = rng() * Math.PI * 2, rad = rng() * 18;
      sx = wx + Math.cos(ang) * rad;
      sy = wy + Math.sin(ang) * rad;
    } else {
      const ang = rng() * Math.PI * 2, rad = rng() * SPAWN_RADIUS;
      sx = px + Math.cos(ang) * rad;
      sy = py + Math.sin(ang) * rad;
    }
    animals.push({
      kind: 'seagull',
      x: sx,
      y: sy,
      angle: rng() * Math.PI * 2 - Math.PI,
      speed: SEAGULL_SPEED_MIN + rng() * (SEAGULL_SPEED_MAX - SEAGULL_SPEED_MIN),
      wanderTarget: { x: sx, y: sy },
      waypointTimer: rng() * SEAGULL_WAYPOINT_MAX,
      bobSeed: rng() * Math.PI * 2,
      flapSeed: rng() * Math.PI * 2,
    });
  }
  return animals;
}

export function initWildlife(world) {
  world.wildlife = [];
}

function updateSeagull(a, dt) {
  if (dist(a.x, a.y, a.wanderTarget.x, a.wanderTarget.y) < SEAGULL_ARRIVE_RADIUS) {
    a.waypointTimer -= dt;
    if (a.waypointTimer <= 0) {
      const ang = Math.random() * Math.PI * 2;
      const rad = 10 + Math.random() * SEAGULL_WAYPOINT_RADIUS;
      a.wanderTarget = { x: a.x + Math.cos(ang) * rad, y: a.y + Math.sin(ang) * rad };
      a.waypointTimer = SEAGULL_WAYPOINT_MIN + Math.random() * (SEAGULL_WAYPOINT_MAX - SEAGULL_WAYPOINT_MIN);
    }
  }
  const targetAngle = Math.atan2(a.wanderTarget.y - a.y, a.wanderTarget.x - a.x);
  a.angle = angleLerp(a.angle, targetAngle, Math.min(1, dt * SEAGULL_TURN));
  a.x += Math.cos(a.angle) * a.speed * dt;
  a.y += Math.sin(a.angle) * a.speed * dt;
}

function updateGrazer(a, dt) {
  if (dist(a.x, a.y, a.wanderTarget.x, a.wanderTarget.y) < GRAZER_ARRIVE_RADIUS) {
    a.speed = 0;
    a.waypointTimer -= dt;
    if (a.waypointTimer <= 0) {
      const ang = Math.random() * Math.PI * 2;
      const rad = Math.random() * a.homeRadius;
      a.wanderTarget = { x: a.homeX + Math.cos(ang) * rad, y: a.homeY + Math.sin(ang) * rad };
      a.waypointTimer = GRAZER_PAUSE_MIN + Math.random() * (GRAZER_PAUSE_MAX - GRAZER_PAUSE_MIN);
      a.speed = GRAZER_SPEED * (0.7 + Math.random() * 0.5);
    }
    return;
  }
  const targetAngle = Math.atan2(a.wanderTarget.y - a.y, a.wanderTarget.x - a.x);
  a.angle = angleLerp(a.angle, targetAngle, Math.min(1, dt * GRAZER_TURN));
  a.x += Math.cos(a.angle) * a.speed * dt;
  a.y += Math.sin(a.angle) * a.speed * dt;
}

export function updateWildlife(dt, world) {
  if (!world.wildlife) world.wildlife = [];
  const list = world.wildlife;
  const { map, player } = world;

  maintainTimer -= dt;
  if (maintainTimer <= 0) {
    maintainTimer = MAINTAIN_INTERVAL;
    for (let i = list.length - 1; i >= 0; i--) {
      if (dist(list[i].x, list[i].y, player.x, player.y) > DESPAWN_DIST) list.splice(i, 1);
    }
    if (list.length < POP_TARGET) {
      list.push(...spawnWildlifeNear(map, player.x, player.y, POP_TARGET - list.length, Math.random));
    }
  }

  for (const a of list) {
    if (a.kind === 'seagull') updateSeagull(a, dt);
    else updateGrazer(a, dt);
  }
}

// --- 3D models (1 unit = 1 m, facing +X) ------------------------------------------
// Each animal is a few merged vertex-coloured meshes sharing one per-animal
// material; animated parts stay separate (seagull wings, grazer heads).

const SEAGULL_BODY_LEN = 0.5;
const SEAGULL_BODY_DIAM = 0.15;
const SEAGULL_WING_LEN = 0.68;
const SEAGULL_DIHEDRAL = 0.18;

const GULL_WHITE = 0xeeeeea;
const GULL_GREY = 0xa9b1b6;
const GULL_TIP = 0x1e1f21;
const GULL_BEAK = 0xe0b331;
const COW_WHITE = 0xe9e6de;
const COW_BLACK = 0x1f1e1d;
const COW_PINK = 0xd9a7a0;
const SHEEP_WOOL = 0xdcd6c6;
const SHEEP_DARK = 0x2a2624;

function mat() {
  return vcMaterial({ roughness: 0.95 });
}

function seagullWing(sign) {
  const B = new GeoBuilder(1);
  const root = SEAGULL_WING_LEN * 0.55, tip = SEAGULL_WING_LEN - root;
  B.box(0, 0, sign * root / 2, 0.2, 0.025, root, GULL_GREY);
  B.box(-0.02, -0.004, sign * root / 2, 0.21, 0.012, root * 0.98, GULL_WHITE);
  B.box(-0.03, 0, sign * (root + tip / 2), 0.13, 0.018, tip, GULL_TIP, 0, 0, -sign * 0.35, 0);
  B.box(-0.035, 0.005, sign * (root + tip * 0.8), 0.04, 0.02, 0.05, GULL_WHITE, 0, 0, -sign * 0.35, 0);
  return B.build();
}

export function buildSeagullMesh3D() {
  const group = new THREE.Group();
  const m = mat();
  const B = new GeoBuilder(1);
  B.geo(new THREE.SphereGeometry(1, 8, 5), composeMatrix(0, 0, 0, 0, 0, 0, SEAGULL_BODY_LEN / 2, SEAGULL_BODY_DIAM / 2, SEAGULL_BODY_DIAM / 2), GULL_WHITE);
  B.geo(new THREE.SphereGeometry(1, 6, 4), composeMatrix(SEAGULL_BODY_LEN * 0.42, 0.035, 0, 0, 0, 0, 0.065, 0.055, 0.05), GULL_WHITE);
  B.geo(new THREE.ConeGeometry(0.018, 0.07, 4).rotateZ(-Math.PI / 2), composeMatrix(SEAGULL_BODY_LEN * 0.42 + 0.085, 0.03, 0), GULL_BEAK);
  B.box(SEAGULL_BODY_LEN * 0.42 + 0.075, 0.02, 0, 0.012, 0.012, 0.022, 0xb8322a);
  B.box(-SEAGULL_BODY_LEN * 0.52, 0.005, 0, 0.14, 0.02, 0.13, GULL_WHITE);
  B.box(-SEAGULL_BODY_LEN * 0.08, 0.05, 0, 0.18, 0.03, 0.1, GULL_GREY);
  group.add(new THREE.Mesh(B.build(), m));
  const wings = [];
  for (const sign of [1, -1]) {
    const wing = new THREE.Group();
    wing.add(new THREE.Mesh(seagullWing(sign), m));
    wing.position.set(SEAGULL_BODY_LEN * 0.05, 0.03, sign * SEAGULL_BODY_DIAM * 0.35);
    wing.rotation.x = -sign * SEAGULL_DIHEDRAL;
    wing.userData.sign = sign;
    group.add(wing);
    wings.push(wing);
  }
  group.userData.wings = wings;
  return group;
}

const COW_LEN = 1.7, COW_BODY_H = 0.72, COW_W = 0.62, COW_LEG = 0.68;

function seededCowPatches(seed) {
  const rng = new SeededRng(Math.floor(seed * 1e6));
  const n = 3 + Math.floor(rng.next() * 3);
  const patches = [];
  for (let i = 0; i < n; i++) {
    patches.push({
      x: (rng.next() * 2 - 1) * COW_LEN * 0.36,
      y: (rng.next() * 2 - 1) * COW_BODY_H * 0.25,
      side: rng.next() < 0.5 ? 1 : -1,
      w: 0.25 + rng.next() * 0.35,
      h: 0.2 + rng.next() * 0.3,
      top: rng.next() < 0.4,
    });
  }
  return patches;
}

function grazerLegs(B, legLen, r, lx, lz, color, hoof) {
  for (const sx of [1, -1]) {
    for (const sz of [1, -1]) {
      B.geo(new THREE.CylinderGeometry(r * 0.8, r, legLen, 5, 1, true), composeMatrix(sx * lx, legLen / 2 + 0.06, sz * lz), color);
      B.box(sx * lx + 0.01, 0.035, sz * lz, r * 2.4, 0.07, r * 2.2, hoof);
    }
  }
}

export function buildCowMesh3D(seed = 0) {
  const group = new THREE.Group();
  const m = mat();
  const B = new GeoBuilder(1);
  const bodyY = COW_LEG + COW_BODY_H / 2;
  grazerLegs(B, COW_LEG - 0.06, 0.06, COW_LEN * 0.36, COW_W * 0.3, COW_WHITE, 0x2a2622);
  const body = new THREE.CylinderGeometry(1, 1, 1, 8, 1);
  body.rotateZ(Math.PI / 2);
  B.geo(body, composeMatrix(0, bodyY, 0, 0, 0, 0, COW_LEN, COW_BODY_H / 2, COW_W / 2), COW_WHITE);
  B.box(-COW_LEN * 0.36, bodyY + 0.08, 0, 0.45, COW_BODY_H * 0.9, COW_W * 0.92, COW_WHITE);
  for (const p of seededCowPatches(seed)) {
    if (p.top) B.box(p.x, bodyY + COW_BODY_H / 2 + 0.005, 0, p.w, 0.02, COW_W * 0.55, COW_BLACK);
    else B.box(p.x, bodyY + p.y, p.side * (COW_W / 2 * 0.93), p.w, p.h, 0.03, COW_BLACK);
  }
  B.geo(new THREE.SphereGeometry(0.13, 6, 4), composeMatrix(-COW_LEN * 0.18, COW_LEG + 0.02, 0, 0, 0, 0, 1.2, 0.7, 1), COW_PINK);
  B.geo(tubeGeometry([-COW_LEN / 2, bodyY + 0.25, 0], [-COW_LEN / 2 - 0.08, bodyY - 0.35, 0], 0.02, 0.015, 4), null, COW_WHITE);
  B.box(-COW_LEN / 2 - 0.09, bodyY - 0.4, 0, 0.06, 0.12, 0.06, COW_BLACK);
  group.add(new THREE.Mesh(B.build(), m));

  const headGroup = new THREE.Group();
  headGroup.position.set(COW_LEN / 2 - 0.05, bodyY + 0.12, 0);
  headGroup.rotation.z = -0.35;
  const H = new GeoBuilder(1);
  H.box(0.18, 0, 0, 0.36, 0.34, 0.36, COW_WHITE);
  H.box(0.46, -0.02, 0, 0.3, 0.3, 0.26, COW_BLACK);
  H.box(0.62, -0.06, 0, 0.1, 0.2, 0.24, COW_PINK);
  for (const s of [1, -1]) {
    H.box(0.38, 0.1, s * 0.19, 0.08, 0.06, 0.14, COW_BLACK, 0, 0, s * 0.3, 0);
    H.geo(new THREE.ConeGeometry(0.025, 0.1, 4), composeMatrix(0.36, 0.2, s * 0.1, s * -0.5, 0, 0), 0xd8d0b8);
    H.box(0.5, 0.06, s * 0.12, 0.03, 0.03, 0.02, 0x111111);
  }
  headGroup.add(new THREE.Mesh(H.build(), m));
  group.add(headGroup);
  group.userData.head = headGroup;
  group.userData.headBaseRotZ = headGroup.rotation.z;
  return group;
}

const SHEEP_LEN = 1.0, SHEEP_H = 0.55, SHEEP_W = 0.6, SHEEP_LEG = 0.36;

export function buildSheepMesh3D() {
  const group = new THREE.Group();
  const m = mat();
  const B = new GeoBuilder(1);
  grazerLegs(B, SHEEP_LEG - 0.05, 0.035, SHEEP_LEN * 0.32, SHEEP_W * 0.26, SHEEP_DARK, 0x1a1817);
  const bodyY = SHEEP_LEG + SHEEP_H / 2;
  const lumps = [[0, 0.02, 0, 0.55, 0.3, 0.32], [-0.3, 0, 0, 0.3, 0.27, 0.29], [0.28, 0.03, 0, 0.28, 0.26, 0.28], [0, 0.14, 0.12, 0.3, 0.2, 0.2], [0, 0.14, -0.12, 0.3, 0.2, 0.2]];
  for (const [dx, dy, dz, sx, sy, sz] of lumps) {
    B.geo(new THREE.IcosahedronGeometry(1, 0), composeMatrix(dx, bodyY + dy, dz, 0, dx * 3, 0, sx, sy, sz), SHEEP_WOOL);
  }
  B.geo(new THREE.IcosahedronGeometry(1, 0), composeMatrix(-SHEEP_LEN * 0.5, bodyY + 0.05, 0, 0, 0, 0, 0.08, 0.08, 0.07), SHEEP_WOOL);
  group.add(new THREE.Mesh(B.build(), m));

  const head = new THREE.Group();
  head.position.set(SHEEP_LEN * 0.5, bodyY + 0.02, 0);
  const H = new GeoBuilder(1);
  H.box(0.06, 0.04, 0, 0.18, 0.2, 0.2, SHEEP_WOOL);
  H.geo(new THREE.CylinderGeometry(0.06, 0.085, 0.24, 6).rotateZ(-Math.PI / 2 + 0.5), composeMatrix(0.2, -0.04, 0), SHEEP_DARK);
  for (const s of [1, -1]) {
    H.box(0.12, 0.05, s * 0.12, 0.05, 0.03, 0.12, SHEEP_DARK, 0, 0, 0, -0.3);
    H.box(0.24, 0.02, s * 0.06, 0.025, 0.025, 0.015, 0x0d0d0d);
  }
  head.add(new THREE.Mesh(H.build(), m));
  group.add(head);
  group.userData.head = head;
  group.userData.headBaseY = head.position.y;
  return group;
}

// Seagulls alternate flapping and gliding; grazers step-bob while walking
// and dip their head to graze while standing.
export function animateWildlifeMesh3D(mesh, a, time) {
  const ud = mesh.userData;
  const seed = a.flapSeed || a.bobSeed || 0;
  if (ud.wings) {
    const glide = Math.max(0, Math.sin(time * 0.45 + seed));
    const flap = Math.sin(time * 9 + seed) * 0.6 * (1 - glide);
    for (const w of ud.wings) w.rotation.x = -w.userData.sign * (SEAGULL_DIHEDRAL + flap);
    return;
  }
  const walking = a.speed > 0.05;
  mesh.position.y = walking ? Math.abs(Math.sin(time * 7 + seed)) * 0.035 : 0;
  if (!ud.head) return;
  const graze = walking ? Math.sin(time * 7 + seed) * 0.05 : 0.35 + Math.sin(time * 1.3 + seed) * 0.12;
  if (ud.headBaseRotZ !== undefined) ud.head.rotation.z = ud.headBaseRotZ - graze;
  else ud.head.position.y = ud.headBaseY - graze * 0.5;
}
