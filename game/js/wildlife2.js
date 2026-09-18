import { dist, angleLerp, pointInPolygon, polygonBounds } from './util2.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Ambient GTA6-marketing-parody wildlife: seagulls near water/the Diepenring,
// the occasional cow/sheep in Noorderplantsoen-style green space. Pure
// atmosphere - no health, no combat, no collision with the player/vehicles.
// Mirrors pedestrians2.js's spawn-near/despawn-by-distance + wander-waypoint
// pattern, but simpler (no flee/dead states).

const POP_TARGET = 16;
const SPAWN_RADIUS = 70;
const DESPAWN_DIST = 150;
const MAINTAIN_INTERVAL = 2.5;
const DRAW_DIST = 90;

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

function drawSeagull(ctx, a, t) {
  const flap = Math.sin(t * 5 + a.flapSeed);
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(a.angle);
  const spread = 0.42 + flap * 0.14;
  ctx.strokeStyle = 'rgba(232,231,222,0.92)';
  ctx.lineWidth = 0.1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-0.42, -spread);
  ctx.moveTo(0, 0);
  ctx.lineTo(-0.42, spread);
  ctx.stroke();
  ctx.fillStyle = '#f2f1ea';
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.28, 0.11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGrazer(ctx, a, t) {
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(0.05, 0.05, 0.55, 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(a.angle);
  const bob = Math.sin(t * 2.2 + a.bobSeed) * 0.02;

  ctx.strokeStyle = 'rgba(30,28,24,0.8)';
  ctx.lineWidth = 0.09;
  for (const lx of [-0.32, 0.32]) {
    for (const ly of [-0.22, 0.22]) {
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx, ly * 1.6);
      ctx.stroke();
    }
  }

  if (a.kind === 'cow') {
    ctx.fillStyle = '#f2f0e8';
    ctx.beginPath();
    ctx.ellipse(0, bob, 0.55, 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#242220';
    for (const p of a.patches || []) {
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + bob, p.r, p.r * 0.7, p.rot, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#f2f0e8';
    ctx.beginPath();
    ctx.ellipse(0.5, bob, 0.16, 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#e8e4d6';
    ctx.beginPath();
    ctx.ellipse(-0.15, -0.1 + bob, 0.28, 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, bob, 0.5, 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0.15, 0.1 + bob, 0.26, 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a352c';
    ctx.beginPath();
    ctx.ellipse(0.48, bob, 0.13, 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawWildlife(ctx, world) {
  const p = world.player;
  for (const a of world.wildlife || []) {
    if (dist(a.x, a.y, p.x, p.y) > DRAW_DIST) continue;
    if (a.kind === 'seagull') drawSeagull(ctx, a, world.time);
    else drawGrazer(ctx, a, world.time);
  }
}

function wingMesh3D() {
  const wing = new THREE.Mesh(
    new THREE.ConeGeometry(0.5, 0.06, 4),
    new THREE.MeshLambertMaterial({ color: 0xe8e6de })
  );
  wing.rotation.z = Math.PI / 2;
  wing.scale.set(1, 1, 0.35);
  return wing;
}

export function buildSeagullMesh3D() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 6, 5),
    new THREE.MeshLambertMaterial({ color: 0xf2f1ea })
  );
  body.scale.set(1.6, 0.9, 0.9);
  body.position.y = 0.5;
  group.add(body);

  const beak = new THREE.Mesh(
    new THREE.ConeGeometry(0.03, 0.14, 5),
    new THREE.MeshLambertMaterial({ color: 0xe0a53a })
  );
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(0.2, 0.5, 0);
  group.add(beak);

  const wingL = wingMesh3D();
  wingL.position.set(-0.04, 0.53, 0.1);
  wingL.rotation.x = -0.15;
  group.add(wingL);

  const wingR = wingMesh3D();
  wingR.position.set(-0.04, 0.53, -0.1);
  wingR.rotation.x = 0.15;
  group.add(wingR);

  return group;
}

function legMesh3D(color) {
  return new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.42, 5),
    new THREE.MeshLambertMaterial({ color })
  );
}

export function buildCowMesh3D() {
  const group = new THREE.Group();
  const legColor = 0xf2f0e8;
  for (const sx of [0.35, -0.35]) {
    for (const sz of [0.22, -0.22]) {
      const leg = legMesh3D(legColor);
      leg.position.set(sx, 0.21, sz);
      group.add(leg);
    }
  }

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.5, 0.42),
    new THREE.MeshLambertMaterial({ color: 0xf2f0e8 })
  );
  body.position.set(0, 0.42 + 0.25, 0);
  group.add(body);

  for (let i = 0; i < 3; i++) {
    const patch = new THREE.Mesh(
      new THREE.BoxGeometry(0.18 + Math.random() * 0.12, 0.16, 0.44),
      new THREE.MeshLambertMaterial({ color: 0x242220 })
    );
    patch.position.set(-0.3 + Math.random() * 0.6, 0.42 + 0.25 + 0.15, 0);
    group.add(patch);
  }

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.22, 0.24),
    new THREE.MeshLambertMaterial({ color: 0xf2f0e8 })
  );
  head.position.set(0.55, 0.42 + 0.28, 0);
  group.add(head);

  return group;
}
