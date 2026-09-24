import { dist, angleLerp, pointInPolygon, polygonBounds, SeededRng } from './util.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { HABBO_PALETTE, habboMaterial, habboFlatMaterial, buildOutline } from './pixelart3d.js';

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

// Real gulls read as birds from a torpedo-shaped torso (3-4x longer than
// wide) plus wings that dwarf the body (~2.5-3x body length EACH, spread
// wide) - the old cone wings were themselves nearly as long as the whole
// body and had no flat "wing plane" to read as anything but a blade. Wings
// here are two flattened, tapered box segments (broad root + narrower,
// swept "hand") on a shallow dihedral, mirroring a gliding gull's silhouette.
const SEAGULL_BODY_LEN = 0.5;
const SEAGULL_BODY_DIAM = SEAGULL_BODY_LEN / 3.3;
const SEAGULL_HEAD_DIAM = SEAGULL_BODY_DIAM * 0.72;
const SEAGULL_BEAK_LEN = SEAGULL_HEAD_DIAM * 0.9;
const SEAGULL_WING_LEN = SEAGULL_BODY_LEN * 2.6;
const SEAGULL_WING_ROOT_FRAC = 0.62;
const SEAGULL_DIHEDRAL = 0.24;
const SEAGULL_WINGTIP_SWEEP = 0.3;

const COW_BODY_LEN = 0.95, COW_BODY_H = 0.5, COW_BODY_W = 0.42;
const COW_LEG_LEN = 0.42, COW_LEG_R = 0.035;
const COW_HEAD = 0.24, COW_NECK_LEN = 0.2, COW_HEAD_DROOP = 0.32;

const SHEEP_BODY_LEN = 0.6, SHEEP_BODY_H = 0.38, SHEEP_BODY_W = 0.4;
const SHEEP_LEG_LEN = 0.26, SHEEP_LEG_R = 0.026;
const SHEEP_HEAD_DIAM = 0.17;

// Habbo-style flat palette colors for every species below, in place of the
// old bespoke hexes - see pixelart3d.js for the shared toolkit these pull
// from (HABBO_PALETTE/habboMaterial/buildOutline).
const SEAGULL_BODY_COLOR = HABBO_PALETTE.white;
const SEAGULL_WINGTIP_COLOR = HABBO_PALETTE.black;
const SEAGULL_BEAK_COLOR = HABBO_PALETTE.brickOrange;
const COW_HIDE_COLOR = HABBO_PALETTE.white;
const COW_PATCH_COLOR = HABBO_PALETTE.black;
const SHEEP_WOOL_COLOR = HABBO_PALETTE.white;
const SHEEP_DARK_COLOR = HABBO_PALETTE.black;

// Flat toon material + inverted-hull black outline (the pixelart3d.js
// "bold black outlines around every major shape" technique), wrapped in a
// Group so every existing meshOf() call site keeps working unchanged -
// Group exposes the same position/rotation/scale API a Mesh does, and
// callers below reparent/add children onto the returned object exactly as
// they did when it was a plain Mesh. `thickness` is exposed per-call since
// buildOutline()'s scale-up is relative to each part's own size, so small
// parts (thin legs, ears, a beak) need a larger relative thickness than
// big parts (a body, a wing) to read as an outline at all.
function meshOf(geometry, color, thickness = 0.025) {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(geometry, habboMaterial(color));
  group.add(mesh);
  group.add(buildOutline(geometry, thickness));
  group.userData.mainMesh = mesh;
  return group;
}

// Fully flat/unlit, no outline - for small decorative markings (cow spots)
// that sit flush on an already-outlined body and don't need their own rim.
function flatMeshOf(geometry, color) {
  return new THREE.Mesh(geometry, habboFlatMaterial(color));
}

function legMesh3D(color, len, radius = 0.032) {
  return meshOf(new THREE.CylinderGeometry(radius, radius, len, 6), color, 0.08);
}

function grazerLegs(group, color, legLen, legRadius, bodyLen, bodyWidth) {
  const lx = bodyLen / 2 * 0.74, lz = bodyWidth / 2 * 0.7;
  for (const sx of [1, -1]) {
    for (const sz of [1, -1]) {
      const leg = legMesh3D(color, legLen, legRadius);
      leg.position.set(sx * lx, legLen / 2, sz * lz);
      group.add(leg);
    }
  }
}

function seagullWing3D(sign) {
  const rootLen = SEAGULL_WING_LEN * SEAGULL_WING_ROOT_FRAC;
  const tipLen = SEAGULL_WING_LEN - rootLen;
  const group = new THREE.Group();

  const root = meshOf(
    new THREE.BoxGeometry(SEAGULL_BODY_LEN * 0.36, SEAGULL_BODY_DIAM * 0.14, rootLen),
    SEAGULL_BODY_COLOR
  );
  root.position.z = sign * rootLen / 2;
  group.add(root);

  const tip = meshOf(
    new THREE.BoxGeometry(SEAGULL_BODY_LEN * 0.2, SEAGULL_BODY_DIAM * 0.1, tipLen),
    SEAGULL_WINGTIP_COLOR
  );
  tip.position.z = sign * (rootLen + tipLen / 2);
  tip.rotation.y = -sign * SEAGULL_WINGTIP_SWEEP;
  group.add(tip);

  // root/tip geometry always extends toward +Z; negating the dihedral
  // together with the mirrored position keeps BOTH wingtips lifted, instead
  // of the mirrored wing dipping down when sign flips
  group.rotation.x = -sign * SEAGULL_DIHEDRAL;
  return group;
}

export function buildSeagullMesh3D() {
  const group = new THREE.Group();

  const body = meshOf(new THREE.SphereGeometry(1, 8, 6), SEAGULL_BODY_COLOR);
  body.scale.set(SEAGULL_BODY_LEN / 2, SEAGULL_BODY_DIAM / 2, SEAGULL_BODY_DIAM / 2);
  group.add(body);

  const head = meshOf(new THREE.SphereGeometry(SEAGULL_HEAD_DIAM / 2, 6, 5), SEAGULL_BODY_COLOR);
  head.position.set(SEAGULL_BODY_LEN * 0.42, SEAGULL_BODY_DIAM * 0.12, 0);
  group.add(head);

  const beak = meshOf(new THREE.ConeGeometry(SEAGULL_HEAD_DIAM * 0.22, SEAGULL_BEAK_LEN, 6), SEAGULL_BEAK_COLOR, 0.05);
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(SEAGULL_BODY_LEN * 0.42 + SEAGULL_HEAD_DIAM * 0.42, SEAGULL_BODY_DIAM * 0.08, 0);
  group.add(beak);

  const tail = meshOf(
    new THREE.BoxGeometry(SEAGULL_BODY_LEN * 0.3, SEAGULL_BODY_DIAM * 0.18, SEAGULL_BODY_DIAM * 1.05),
    SEAGULL_BODY_COLOR
  );
  tail.position.set(-SEAGULL_BODY_LEN * 0.56, 0, 0);
  group.add(tail);

  const shoulderX = SEAGULL_BODY_LEN * 0.08;
  const shoulderY = SEAGULL_BODY_DIAM * 0.35;
  const shoulderZ = SEAGULL_BODY_DIAM * 0.42;
  const wings = [];
  for (const sign of [1, -1]) {
    const wing = seagullWing3D(sign);
    wing.position.set(shoulderX, shoulderY, sign * shoulderZ);
    wing.userData.sign = sign;
    group.add(wing);
    wings.push(wing);
  }
  group.userData.wings = wings;

  return group;
}

// Deterministic per-animal so a cow's markings don't visibly "reroll" every
// time buildCowMesh3D() is called again on respawn-into-view (Math.random()
// previously ran fresh on every call). Seeded off the animal's own bobSeed
// (a float in [0, 2*PI)) - scaled up before flooring so nearby bobSeed
// values don't collide into the same SeededRng seed.
function seededCowPatches(seed) {
  const rng = new SeededRng(Math.floor(seed * 1e6));
  const n = 2 + Math.floor(rng.next() * 2);
  const maxR = Math.min(COW_BODY_LEN, COW_BODY_W) * 0.18;
  const patches = [];
  for (let i = 0; i < n; i++) {
    const r = maxR * (0.6 + rng.next() * 0.4);
    patches.push({
      x: (rng.next() * 2 - 1) * (COW_BODY_LEN / 2 - r),
      z: (rng.next() * 2 - 1) * (COW_BODY_W / 2 - r),
      r,
      squashZ: 0.55 + rng.next() * 0.3,
      rot: rng.next() * Math.PI,
    });
  }
  return patches;
}

export function buildCowMesh3D(seed = 0) {
  const group = new THREE.Group();
  const hide = COW_HIDE_COLOR;

  grazerLegs(group, hide, COW_LEG_LEN, COW_LEG_R, COW_BODY_LEN, COW_BODY_W);

  const bodyY = COW_LEG_LEN + COW_BODY_H / 2;
  const body = meshOf(new THREE.BoxGeometry(COW_BODY_LEN, COW_BODY_H, COW_BODY_W), hide, 0.018);
  body.position.y = bodyY;
  for (const p of seededCowPatches(seed)) {
    const patch = flatMeshOf(new THREE.CylinderGeometry(p.r, p.r, 0.05, 8), COW_PATCH_COLOR);
    patch.scale.z = p.squashZ;
    patch.rotation.y = p.rot;
    // sits mostly embedded in the body with just a proud sliver above the
    // top face - fully inside would leave it invisible, fully outside would
    // poke past the body's silhouette (the original bug)
    patch.position.set(p.x, COW_BODY_H / 2 - 0.015, p.z);
    body.add(patch);
  }
  group.add(body);

  // neck+head is one rigid, hinged group so it can never end up floating
  // disconnected from the body regardless of the droop angle: neck and head
  // are laid out consecutively along local +X, then the whole assembly
  // rotates together about its body-anchored hinge point
  const headGroup = new THREE.Group();
  headGroup.position.set(COW_BODY_LEN / 2, bodyY + COW_BODY_H * 0.18, 0);
  headGroup.rotation.z = -COW_HEAD_DROOP;

  const neck = meshOf(new THREE.BoxGeometry(COW_NECK_LEN, 0.18, 0.26), hide, 0.04);
  neck.position.x = COW_NECK_LEN / 2;
  headGroup.add(neck);

  const head = meshOf(new THREE.BoxGeometry(COW_HEAD, COW_HEAD * 0.85, COW_HEAD), hide, 0.04);
  head.position.set(COW_NECK_LEN + COW_HEAD * 0.4, -0.01, 0);
  headGroup.add(head);

  for (const sz of [1, -1]) {
    const ear = meshOf(new THREE.BoxGeometry(0.03, 0.08, 0.09), hide, 0.08);
    ear.position.set(head.position.x - 0.05, head.position.y + 0.07, sz * 0.13);
    headGroup.add(ear);
  }

  group.add(headGroup);
  group.userData.head = headGroup;
  group.userData.headBaseRotZ = headGroup.rotation.z;
  return group;
}

// scene3d.js currently has no separate sheep path - it reuses
// buildCowMesh3D() for kind==='sheep' too (see integrationNotes). The 2D
// drawGrazer already gives sheep a distinct fluffy/lighter look, so 3D
// should too: a lumpy wool-colored body (3 overlapping spheres, same trick
// the 2D version uses with ellipses) with a small dark, bare-looking head
// poking out front, instead of the cow's boxy hide-colored head.
export function buildSheepMesh3D() {
  const group = new THREE.Group();
  const wool = SHEEP_WOOL_COLOR, dark = SHEEP_DARK_COLOR;

  grazerLegs(group, dark, SHEEP_LEG_LEN, SHEEP_LEG_R, SHEEP_BODY_LEN, SHEEP_BODY_W);

  const bodyY = SHEEP_LEG_LEN + SHEEP_BODY_H / 2;
  const lumps = [
    [0, SHEEP_BODY_LEN / 2, SHEEP_BODY_H / 2, SHEEP_BODY_W / 2],
    [-SHEEP_BODY_LEN * 0.34, SHEEP_BODY_LEN * 0.3, SHEEP_BODY_H * 0.42, SHEEP_BODY_W * 0.42],
    [SHEEP_BODY_LEN * 0.32, SHEEP_BODY_LEN * 0.26, SHEEP_BODY_H * 0.38, SHEEP_BODY_W * 0.38],
  ];
  for (const [dx, sx, sy, sz] of lumps) {
    const lump = meshOf(new THREE.SphereGeometry(1, 7, 6), wool, 0.022);
    lump.scale.set(sx, sy, sz);
    lump.position.set(dx, bodyY, 0);
    group.add(lump);
  }

  const head = meshOf(new THREE.SphereGeometry(SHEEP_HEAD_DIAM / 2, 6, 5), dark, 0.05);
  head.position.set(SHEEP_BODY_LEN * 0.56, bodyY - SHEEP_BODY_H * 0.1, 0);
  group.add(head);
  group.userData.head = head;
  group.userData.headBaseY = head.position.y;

  for (const sz of [1, -1]) {
    const ear = meshOf(new THREE.BoxGeometry(0.02, 0.03, 0.1), dark, 0.08);
    ear.rotation.z = sz * 0.5;
    ear.position.set(head.position.x - 0.05, head.position.y + 0.02, sz * 0.1);
    group.add(ear);
  }

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
  else ud.head.position.y = ud.headBaseY - graze * 0.25;
}
