import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Purely decorative sky traffic - "af en toe een overvliegende traumaheli of
// heteluchtballon". A prop spawns rarely at the draw-distance edge, drifts
// in a straight line at a fixed high altitude, and despawns once it has
// passed well beyond the player on the far side. No gameplay effect at all:
// no collision, doesn't touch world.wanted/health/anything else.

const SPAWN_MIN_INTERVAL = 90;
const SPAWN_MAX_INTERVAL = 180;
// beyond the far view distance (up to 600 m) so they drift in out of the haze
// instead of popping into view mid-sky
const SPAWN_DIST = 620;
const DESPAWN_DIST = 680;
const ALT_MIN = 40, ALT_MAX = 60;
const SPEED_MIN = 4, SPEED_MAX = 7;
const HEADING_SPREAD = 1.0; // rad, keeps it from always flying the exact same line

export function initSkyProps(world) {
  world.skyProps = [];
  world._skyPropTimer = SPAWN_MIN_INTERVAL + Math.random() * (SPAWN_MAX_INTERVAL - SPAWN_MIN_INTERVAL);
}

function spawnOne(world) {
  const px = world.player.x, py = world.player.y;
  const startAngle = Math.random() * Math.PI * 2;
  const startX = px + Math.cos(startAngle) * SPAWN_DIST;
  const startY = py + Math.sin(startAngle) * SPAWN_DIST;
  // heading roughly back across toward/over the player, with some spread
  const heading = startAngle + Math.PI + (Math.random() - 0.5) * HEADING_SPREAD;
  world.skyProps.push({
    kind: Math.random() < 0.5 ? 'traumaheli' : 'balloon',
    x: startX,
    y: startY,
    z: ALT_MIN + Math.random() * (ALT_MAX - ALT_MIN),
    angle: heading,
    speed: SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN),
  });
}

export function updateSkyProps(dt, world) {
  if (!world.skyProps) initSkyProps(world);
  const list = world.skyProps;
  const { x: px, y: py } = world.player;

  world._skyPropTimer -= dt;
  if (world._skyPropTimer <= 0) {
    spawnOne(world);
    world._skyPropTimer = SPAWN_MIN_INTERVAL + Math.random() * (SPAWN_MAX_INTERVAL - SPAWN_MIN_INTERVAL);
  }

  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.x += Math.cos(p.angle) * p.speed * dt;
    p.y += Math.sin(p.angle) * p.speed * dt;
    if (Math.hypot(p.x - px, p.y - py) > DESPAWN_DIST) list.splice(i, 1);
  }
}

// --- 3D meshes -----------------------------------------------------------
// Local origin (0,0,0), nose/front toward local +X, matching every other 3D
// actor in the game (mesh.rotation.y = -angle at render time).

function lambert(color) {
  return new THREE.MeshLambertMaterial({ color });
}

// Dutch traumahelikopter livery: red body, white stripe.
const TH_BODY_MAT = lambert(0xcc2222);
const TH_STRIPE_MAT = lambert(0xf2f0e8);
const TH_ROTOR_MAT = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
const TH_GLASS_MAT = lambert(0x1c2b3d);
const HELI_ROTOR_SPEED = 14;

export function buildTraumaHeliMesh3D() {
  const group = new THREE.Group();

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 2.2, 4, 8), TH_BODY_MAT);
  body.rotation.z = -Math.PI / 2;
  group.add(body);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), TH_GLASS_MAT);
  nose.position.set(1.6, 0, 0);
  group.add(nose);

  for (const sz of [0.51, -0.51]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.2, 0.06), TH_STRIPE_MAT);
    stripe.position.set(0, 0.05, sz);
    group.add(stripe);
  }

  const tailBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.045, 1.6, 6), TH_BODY_MAT);
  tailBoom.rotation.z = Math.PI / 2;
  tailBoom.position.set(-1.6, 0.05, 0);
  group.add(tailBoom);

  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.55, 0.04), TH_ROTOR_MAT);
  tailRotor.position.set(-2.35, 0.05, 0);
  group.add(tailRotor);
  group.userData.tailRotor = tailRotor;

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.28, 6), TH_BODY_MAT);
  mast.position.set(0, 0.82, 0);
  group.add(mast);

  const rotor = new THREE.Group();
  rotor.position.set(0, 0.97, 0);
  rotor.add(new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.035, 0.16), TH_ROTOR_MAT));
  rotor.add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 5.2), TH_ROTOR_MAT));
  group.add(rotor);
  group.userData.rotor = rotor;

  return group;
}

// Spins the main + tail rotor - call once per frame after repositioning
// (mirrors police.js's updatePoliceHeliMesh3D). Optional: skipping it just
// leaves the blades static, which still reads fine at this altitude/distance.
export function updateTraumaHeliMesh3D(mesh, time) {
  mesh.userData.rotor.rotation.y = time * HELI_ROTOR_SPEED;
  mesh.userData.tailRotor.rotation.x = time * HELI_ROTOR_SPEED * 1.6;
}

const BALLOON_ENVELOPE_MAT = lambert(0xe0a020);
const BALLOON_STRIPE_MAT = lambert(0xc94b3a);
const BALLOON_BASKET_MAT = lambert(0x6b4a2f);
const BALLOON_LINE_MAT = new THREE.LineBasicMaterial({ color: 0x2b2620 });

export function buildBalloonMesh3D() {
  const group = new THREE.Group();

  const envelope = new THREE.Mesh(new THREE.SphereGeometry(2.2, 12, 10), BALLOON_ENVELOPE_MAT);
  envelope.scale.y = 1.25;
  envelope.position.y = 3.6;
  group.add(envelope);

  // teardrop taper: a cone closing off the envelope's underside toward the
  // basket, instead of leaving a flat sphere bottom
  const taper = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.6, 12), BALLOON_ENVELOPE_MAT);
  taper.position.y = 1.1;
  group.add(taper);

  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.9, 0.08), BALLOON_STRIPE_MAT);
    stripe.position.set(Math.cos(a) * 2.05, 3.4, Math.sin(a) * 2.05);
    stripe.rotation.y = a;
    group.add(stripe);
  }

  const basket = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.7), BALLOON_BASKET_MAT);
  basket.position.y = 0.28;
  group.add(basket);

  const linesGeo = new THREE.BufferGeometry();
  const verts = [];
  for (const [sx, sz] of [[0.3, 0.3], [0.3, -0.3], [-0.3, 0.3], [-0.3, -0.3]]) {
    verts.push(sx, 0.55, sz, sx * 0.9, 1.0, sz * 0.9);
  }
  linesGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  group.add(new THREE.LineSegments(linesGeo, BALLOON_LINE_MAT));

  return group;
}
