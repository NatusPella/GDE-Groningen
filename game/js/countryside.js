import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { createTerrainMaterial } from './terrain3d.js';
import {
  BLOCK, PW, PL, DITCH_HW, MAIN_HW, ROAD_IN, ROAD_W,
  chash, countryWeight, countryRect, edgeDistance, parcelAt, parcelUse, blockToWorld, edgeRoad, countrySurface,
} from './countryfield.js';
import { GeoBuilder, SkinBuilder, vcMaterial, composeMatrix, tubeGeometry, loftGeometry, markShared } from './pixelart3d.js';
import { surfaceUnder } from './vehicle.js';
import { buildCowMesh3D, buildSheepMesh3D, buildDuckMesh3D, animateWildlifeMesh3D } from './wildlife.js';

// Endless meadows past the real map: a ground ring that follows the player
// (same terrain shader, so the feathered edge in terrain3d continues without
// a seam), deterministic prop tiles streamed around the player within a
// per-frame budget (tree rows, hedges, fences, gates, bales, reeds, kop-hals-
// romp farms), and grazing herds that react to the player. Everything is
// instanced per prop type; only the nearest animals get animated rigs.

const TILE = 160;
const GROUND_Y = -0.05;
const GROUND_HALF = 4000;
const GROUND_SNAP = 500;
const GEN_BUDGET_MS = 1.2;
const REPACK_EVERY = 0.3;
const REED_R = 230;
const SIM_R = 170;
const SKIN_R = 90;
const SKIN_MAX = 28;
const SHADOW_MAX = 8;
const FULL = 0.92;

let S = null;

// ------------------------------------------------------------------ geometry

function loftX(rings, sides = 8) {
  const g = loftGeometry(rings.map((r) => ({ y: r.u, d: r.hh, w: r.hw, x: -r.cy })), sides, Math.PI / sides);
  g.rotateZ(-Math.PI / 2);
  const parts = [g];
  const a = rings[0], b = rings[rings.length - 1];
  const capA = new THREE.CircleGeometry(1, sides, Math.PI / sides).rotateY(-Math.PI / 2);
  capA.scale(1, a.hh, a.hw).translate(a.u, a.cy, 0);
  const capB = new THREE.CircleGeometry(1, sides, Math.PI / sides).rotateY(Math.PI / 2);
  capB.scale(1, b.hh, b.hw).translate(b.u, b.cy, 0);
  parts.push(capA.toNonIndexed(), capB.toNonIndexed());
  const pos = [];
  for (const p of parts) pos.push(...p.attributes.position.array);
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return out;
}

function jitterIco(r, detail, seed, sx = 1, sy = 1, sz = 1) {
  const g = new THREE.IcosahedronGeometry(r, detail);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const j = 1 + (chash(Math.round(x * 30) + seed, Math.round(y * 30) * 7 + Math.round(z * 30) * 13) - 0.5) * 0.28;
    p.setXYZ(i, x * sx * j, y * sy * j, z * sz * j);
  }
  return g;
}

const leafShade = (base) => (x, y, z) => {
  const h = chash(Math.round(x * 9) + 11, Math.round(y * 9) * 3 + Math.round(z * 9) * 5);
  return h < 0.33 ? base[0] : h < 0.7 ? base[1] : base[2];
};

function roundTreeGeometry() {
  const B = new GeoBuilder();
  B.geo(tubeGeometry([0, 0, 0], [0, 3.4, 0], 0.26, 0.18, 6), null, 0x4d3a28);
  B.geo(tubeGeometry([0, 2.6, 0], [0.9, 4.2, 0.3], 0.12, 0.08, 5), null, 0x4d3a28);
  const leaves = leafShade([0x3f6a32, 0x4a7a3c, 0x567f3e]);
  B.geo(jitterIco(2.6, 1, 3), composeMatrix(0, 5.6, 0), leaves);
  B.geo(jitterIco(1.7, 1, 9), composeMatrix(1.3, 4.9, 0.6), leaves);
  B.geo(jitterIco(1.6, 1, 17), composeMatrix(-1.1, 5.1, -0.8), leaves);
  return B.build();
}

function poplarGeometry() {
  const B = new GeoBuilder();
  B.geo(tubeGeometry([0, 0, 0], [0, 4, 0], 0.24, 0.14, 6), null, 0x5a4a38);
  B.geo(jitterIco(1, 1, 5, 1.9, 7.5, 1.9), composeMatrix(0, 10, 0), leafShade([0x44703a, 0x507c40, 0x5c8646]));
  return B.build();
}

// Knotwilg: short fat pollard trunk with a bushy head of shoots.
function willowGeometry() {
  const B = new GeoBuilder();
  B.geo(tubeGeometry([0, 0, 0], [0.1, 2.1, 0], 0.34, 0.4, 7), null, 0x5d5044);
  B.geo(jitterIco(0.45, 0, 1), composeMatrix(0.1, 2.15, 0), 0x5d5044);
  const leaves = leafShade([0x7a9258, 0x88a064, 0x6b8450]);
  B.geo(jitterIco(1.9, 1, 21, 1, 1.15, 1), composeMatrix(0.1, 3.6, 0), leaves);
  return B.build();
}

function hedgeGeometry() {
  const B = new GeoBuilder();
  const leaves = leafShade([0x3a5f2c, 0x44693a, 0x355628]);
  B.geo(jitterIco(0.5, 1, 31, 1.05, 1, 1), composeMatrix(0, 0.55, 0, 0, 0, 0, 1, 1.2, 1.1), leaves);
  return B.build();
}

function boxGeometry(sx, sy, sz, color, y0 = 0) {
  const B = new GeoBuilder();
  B.box(0, y0 + sy / 2, 0, sx, sy, sz, color);
  return B.build();
}

function gateGeometry() {
  const B = new GeoBuilder();
  const G = 0xb9bec0, W = 0x8a6440;
  B.box(-2.1, 0.7, 0, 0.18, 1.4, 0.18, W);
  B.box(2.1, 0.7, 0, 0.18, 1.4, 0.18, W);
  for (let i = 0; i < 5; i++) B.box(0, 0.25 + i * 0.22, 0, 4.0, 0.05, 0.05, G);
  B.box(-1.95, 0.7, 0, 0.06, 1.0, 0.06, G);
  B.box(1.95, 0.7, 0, 0.06, 1.0, 0.06, G);
  B.geo(tubeGeometry([-1.9, 0.27, 0], [1.9, 1.13, 0], 0.03, 0.03, 4), null, G);
  return B.build();
}

function baleGeometry() {
  const B = new GeoBuilder();
  B.geo(new THREE.CylinderGeometry(0.75, 0.75, 1.2, 12).rotateX(Math.PI / 2), composeMatrix(0, 0.75, 0), 0xffffff);
  return B.build();
}

// Roedenberg: four poles and a liftable pyramid roof over a hay stack.
function barrackGeometry() {
  const B = new GeoBuilder();
  const pole = 0x5a4632, hay = 0xc4ad62, roof = 0x6a5a3a;
  for (const [x, z] of [[-2.4, -2.4], [2.4, -2.4], [2.4, 2.4], [-2.4, 2.4]]) B.box(x, 3.6, z, 0.2, 7.2, 0.2, pole);
  B.box(0, 1.6, 0, 4.5, 3.2, 4.5, hay);
  B.geo(new THREE.ConeGeometry(4.0, 1.8, 4, 1).rotateY(Math.PI / 4), composeMatrix(0, 4.9, 0), roof);
  B.box(0, 4.0, 0, 5.2, 0.12, 5.2, pole);
  return B.build();
}

function reedGeometry() {
  const B = new GeoBuilder();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + chash(i, 3) * 0.8;
    const r = 0.08 + chash(i, 5) * 0.22;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const h = 0.9 + chash(i, 7) * 0.8;
    const lx = x + Math.cos(a) * 0.25, lz = z + Math.sin(a) * 0.25;
    const w = 0.045;
    const col = i % 3 === 0 ? 0x8f8a52 : i % 3 === 1 ? 0x6f8444 : 0x7c8c4a;
    B.tri([x - w * Math.sin(a), 0, z + w * Math.cos(a)], [x + w * Math.sin(a), 0, z - w * Math.cos(a)], [lx, h, lz], col);
    if (i % 2 === 0) B.box(lx, h + 0.1, lz, 0.05, 0.22, 0.05, 0x5a3a22);
  }
  return B.build();
}

// Groningen kop-hals-romp farm along +X: the house (kop) faces the road at
// x = 0, a low neck (hals) and the huge barn (romp) with its hipped roof.
const FARM_LOOKS = [
  { brick: 0x8f4634, kopRoof: 0x3e4449, barnRoof: 0x9a4a30, trim: 0xece8de, door: 0x2f4a3a },
  { brick: 0x6e3a2c, kopRoof: 0x464b52, barnRoof: 0x4a4e54, trim: 0xece8de, door: 0x6b2a24 },
  { brick: 0xe3ddd0, kopRoof: 0x3e4449, barnRoof: 0x8a7a52, trim: 0x2f4a3a, door: 0x2f4a3a, plaster: true },
];

function gableRoofX(B, x0, x1, hw, he, hr, color, wallColor) {
  const o = 0.45;
  B.quadOut([x0 - o, he - 0.2, hw + o], [x1 + o, he - 0.2, hw + o], [x1 + o, hr, 0], [x0 - o, hr, 0], [0, 1, 1], color);
  B.quadOut([x0 - o, he - 0.2, -hw - o], [x0 - o, hr, 0], [x1 + o, hr, 0], [x1 + o, he - 0.2, -hw - o], [0, 1, -1], color);
  B.triOut([x0, he, hw], [x0, he, -hw], [x0, hr - 0.3, 0], [-1, 0, 0], wallColor);
  B.triOut([x1, he, hw], [x1, hr - 0.3, 0], [x1, he, -hw], [1, 0, 0], wallColor);
}

function gableRoofZ(B, x0, x1, hw, he, hr, color, wallColor) {
  const o = 0.45, xm = (x0 + x1) / 2;
  B.quadOut([x0 - o, he - 0.2, -hw - o], [x0 - o, he - 0.2, hw + o], [xm, hr, hw + o], [xm, hr, -hw - o], [-1, 1, 0], color);
  B.quadOut([x1 + o, he - 0.2, -hw - o], [xm, hr, -hw - o], [xm, hr, hw + o], [x1 + o, he - 0.2, hw + o], [1, 1, 0], color);
  B.triOut([x0, he, hw], [x1, he, hw], [xm, hr - 0.3, hw], [0, 0, 1], wallColor);
  B.triOut([x0, he, -hw], [xm, hr - 0.3, -hw], [x1, he, -hw], [0, 0, -1], wallColor);
}

function hipRoof(B, x0, x1, hw, he, hr, inset, color) {
  const o = 0.5;
  const A = [x0 - o, he, -hw - o], Bq = [x1 + o, he, -hw - o], C = [x1 + o, he, hw + o], D = [x0 - o, he, hw + o];
  const R0 = [x0 + inset, hr, 0], R1 = [x1 - inset, hr, 0];
  B.quadOut(D, C, R1, R0, [0, 1, 1], color);
  B.quadOut(A, R0, R1, Bq, [0, 1, -1], color);
  B.triOut(A, D, R0, [-1, 1, 0], color);
  B.triOut(Bq, R1, C, [1, 1, 0], color);
}

function windowAt(B, x, y, z, nx, nz, w, h, L) {
  const t = 0.12;
  if (nx) {
    B.box(x + nx * 0.03, y, z, t, h + 0.16, w + 0.16, L.trim);
    B.box(x + nx * 0.09, y, z, t, h, w, 0x2a3236);
  } else {
    B.box(x, y, z + nz * 0.03, w + 0.16, h + 0.16, t, L.trim);
    B.box(x, y, z + nz * 0.09, w, h, t, 0x2a3236);
  }
}

function farmGeometry(L) {
  const B = new GeoBuilder();
  // kop: two-storey house, ridge across the farm axis
  B.box(5, 3, 0, 10, 6, 13, L.brick);
  gableRoofZ(B, 0, 10, 6.5, 6, 11, L.kopRoof, L.brick);
  for (const y of [1.6, 4.3]) for (const z of [-4.2, 4.2]) windowAt(B, 0, y, z, -1, 0, 1.2, 1.5, L);
  windowAt(B, 0, 4.3, 0, -1, 0, 1.2, 1.5, L);
  B.box(-0.08, 1.15, 0, 0.18, 2.3, 1.2, L.door);
  B.box(-0.12, 2.5, 0, 0.14, 0.5, 1.5, L.trim);
  for (const x of [2.5, 7.5]) for (const s of [-1, 1]) windowAt(B, x, 1.6, s * 6.5, 0, s, 1.1, 1.4, L);
  B.box(5, 11.4, 5.2, 0.8, 1.6, 0.8, 0x6e3a2c);
  // hals
  B.box(13.5, 1.9, 0, 7, 3.8, 8, L.brick);
  gableRoofX(B, 10, 17, 4, 3.8, 7.6, L.kopRoof, L.brick);
  for (const s of [-1, 1]) windowAt(B, 13.5, 1.7, s * 4, 0, s, 1.0, 1.2, L);
  // romp: low walls, huge hipped roof
  B.box(33.5, 1.6, 0, 33, 3.2, 24, L.plaster ? 0x8f4634 : L.brick);
  hipRoof(B, 17, 50, 12, 3.2, 15.5, 8, L.barnRoof);
  B.box(30, 1.8, 12.08, 5, 3.6, 0.16, L.door);
  B.box(30, 3.9, 12.1, 5.4, 0.4, 0.2, L.trim);
  B.box(50.08, 1.7, 0, 0.16, 3.4, 4.2, L.door);
  for (const x of [22, 38, 44]) windowAt(B, x, 1.9, -12, 0, -1, 1.4, 0.9, L);
  return B.build();
}

// ------------------------------------------------------------------ horse

const HORSE_SPEC = [
  ['body', null, 0, 1.35, 0],
  ['head', 'body', 0.62, 1.5, 0],
  ['tail', 'body', -0.82, 1.52, 0],
  ['legFL', 'body', 0.55, 1.2, 0.17],
  ['legFR', 'body', 0.55, 1.2, -0.17],
  ['legBL', 'body', -0.6, 1.2, 0.17],
  ['legBR', 'body', -0.6, 1.2, -0.17],
];
const HORSE_COATS = [
  { coat: 0x6b3f22, mane: 0x1f1a17, sock: 0x1f1a17 },
  { coat: 0x8a4a24, mane: 0x5a2e16, sock: 0xd8d2c6 },
  { coat: 0xc9c4bb, mane: 0x8a867e, sock: 0x8a867e },
  { coat: 0x2c2724, mane: 0x151210, sock: 0x151210 },
];

function horseGeometry(v) {
  const C = HORSE_COATS[v];
  const I = {};
  HORSE_SPEC.forEach(([n], i) => { I[n] = i; });
  const B = new SkinBuilder(1);
  B.bone = I.body;
  B.geo(loftX([
    { u: -0.86, cy: 1.42, hh: 0.2, hw: 0.17 },
    { u: -0.74, cy: 1.38, hh: 0.31, hw: 0.26 },
    { u: -0.4, cy: 1.34, hh: 0.33, hw: 0.27 },
    { u: 0.1, cy: 1.33, hh: 0.33, hw: 0.26, front: 1.1 },
    { u: 0.5, cy: 1.38, hh: 0.33, hw: 0.24 },
    { u: 0.72, cy: 1.45, hh: 0.26, hw: 0.2 },
  ], 10), null, C.coat);
  for (const [name, x, z] of [['legFL', 0.55, 0.17], ['legFR', 0.55, -0.17], ['legBL', -0.6, 0.17], ['legBR', -0.6, -0.17]]) {
    B.bone = I[name];
    const back = x < 0;
    B.geo(loftGeometry([
      { y: 0.06, d: 0.055, w: 0.055 },
      { y: 0.28, d: 0.045, w: 0.045 },
      { y: 0.55, d: back ? 0.07 : 0.055, w: 0.055, x: back ? -0.03 : 0 },
      { y: 0.9, d: back ? 0.12 : 0.09, w: 0.085, x: back ? -0.02 : 0 },
      { y: 1.25, d: 0.14, w: 0.11 },
    ], 6), composeMatrix(x, 0, z), (px, py) => (py < 0.3 ? C.sock : C.coat));
    B.box(x + 0.01, 0.04, z, 0.13, 0.08, 0.12, 0x2a2622);
  }
  B.bone = I.head;
  B.geo(tubeGeometry([0.55, 1.5, 0], [0.98, 2.02, 0], 0.2, 0.13, 7), null, C.coat);
  B.box(0.72, 1.93, 0, 0.42, 0.14, 0.05, C.mane, 0, 0, 0, 0.87);
  B.geo(tubeGeometry([0.9, 2.05, 0], [1.34, 1.72, 0], 0.13, 0.085, 7), null, C.coat);
  B.box(1.35, 1.71, 0, 0.08, 0.14, 0.15, 0x3a2e28);
  for (const s of [1, -1]) {
    B.geo(new THREE.ConeGeometry(0.035, 0.14, 4), composeMatrix(0.92, 2.2, s * 0.07, s * -0.3, 0, 0), C.coat);
    B.box(1.08, 1.98, s * 0.1, 0.04, 0.04, 0.02, 0x111111);
  }
  B.box(0.98, 2.1, 0, 0.12, 0.08, 0.1, C.mane);
  B.bone = I.tail;
  B.geo(tubeGeometry([-0.84, 1.55, 0], [-1.02, 0.75, 0], 0.075, 0.04, 5), null, C.mane);
  return B.build();
}

const HORSE_MAT = markShared(vcMaterial({ roughness: 0.9 }));
const horseGeoCache = [];

function buildHorseMesh(v) {
  const geo = horseGeoCache[v] || (horseGeoCache[v] = markShared(horseGeometry(v)));
  const group = new THREE.Group();
  const bones = [], byName = {}, abs = {};
  for (const [name, parent, x, y, z] of HORSE_SPEC) {
    const b = new THREE.Bone();
    abs[name] = [x, y, z];
    if (parent) {
      const p = abs[parent];
      b.position.set(x - p[0], y - p[1], z - p[2]);
      byName[parent].add(b);
    } else b.position.set(x, y, z);
    bones.push(b);
    byName[name] = b;
  }
  group.add(bones[0]);
  const mesh = new THREE.SkinnedMesh(geo, HORSE_MAT);
  mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.1, 0), 1.8);
  group.add(mesh);
  group.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));
  for (const b of bones) b.userData.rest = b.position.clone();
  Object.assign(group.userData, {
    bones: byName, head: byName.head, headBaseRotZ: 0, legs: [byName.legFL, byName.legFR, byName.legBL, byName.legBR], tail: byName.tail, grazeDip: 0.95,
  });
  return group;
}

// ------------------------------------------------------------------ animals

const KINDS = {
  cow: { walk: 0.55, run: 2.6, scare: 7, shadow: [1.3, 0.75], radius: 1.1 },
  sheep: { walk: 0.45, run: 3.2, scare: 9, shadow: [0.9, 0.6], radius: 0.6 },
  horse: { walk: 0.7, run: 5.5, scare: 11, shadow: [1.4, 0.7], radius: 1.1 },
  goose: { walk: 0.35, run: 2.2, scare: 12, shadow: [0.45, 0.3], radius: 0.4 },
  duck: { walk: 0.3, run: 1.4, scare: 8, shadow: null, radius: 0.3 },
};

function animalKey(a) {
  if (a.kind === 'cow') return (a.variant === 'red' ? 'cowred' : 'cow') + (Math.floor(a.bobSeed * 1000) % 4);
  if (a.kind === 'horse') return 'horse' + a.variant;
  return a.kind;
}

const GOOSE_LEG = new THREE.MeshStandardMaterial({ color: 0xd9803a, roughness: 0.8, flatShading: true });
const GOOSE_LEG_GEO = new THREE.BoxGeometry(0.02, 0.1, 0.02).translate(0, -0.05, 0);

function buildAnimalMesh(a) {
  switch (a.kind) {
    case 'cow': return buildCowMesh3D(a.bobSeed, a.variant === 'red');
    case 'sheep': return buildSheepMesh3D();
    case 'horse': return buildHorseMesh(a.variant);
    case 'goose': {
      const g = buildDuckMesh3D('goose');
      for (const s of [1, -1]) {
        const leg = new THREE.Mesh(GOOSE_LEG_GEO, GOOSE_LEG);
        leg.position.set(0, 0.0, s * 0.03);
        g.add(leg);
      }
      return g;
    }
    default: return buildDuckMesh3D(chash(Math.floor(a.bobSeed * 1e5), 1) < 0.5 ? 'drake' : 'hen');
  }
}

function templateGeometry(key) {
  const probe = { kind: 'cow', variant: null, bobSeed: 0 };
  if (key.startsWith('cowred')) Object.assign(probe, { variant: 'red', bobSeed: (+key.slice(6)) / 1000 });
  else if (key.startsWith('cow')) probe.bobSeed = (+key.slice(3)) / 1000;
  else if (key.startsWith('horse')) Object.assign(probe, { kind: 'horse', variant: +key.slice(5) });
  else probe.kind = key;
  const m = buildAnimalMesh(probe);
  let geo = null, mat = null;
  m.traverse((o) => { if (o.isSkinnedMesh && !geo) { geo = o.geometry; mat = o.material; } });
  return { geo, mat, scale: m.scale.x };
}

function newAnimal(kind, variant, x, y, rect, rng) {
  return {
    kind, variant, x, y, angle: rng() * Math.PI * 2, speed: 0, stride: 0, bobSeed: rng(),
    rect, hx: x, hy: y, tx: x, ty: y, timer: rng() * 6, flee: 0, fx: 0, fy: 0, state: 'swim', stateTimer: 5, stateAge: 0,
  };
}

// ------------------------------------------------------------------ tiles

function mulberry(seed) {
  let s = (seed * 4294967296) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _c = new THREE.Color();

function push(tile, type, x, y, rotY, sx, sy, sz, color = 0xffffff, jitter = 0.08, yOff = 0) {
  const list = tile.items[type] || (tile.items[type] = { m: [], c: [] });
  _e.set(0, rotY, 0);
  _q.setFromEuler(_e);
  _m4.compose(_p.set(x, GROUND_Y + yOff, y), _q, _s.set(sx, sy, sz));
  for (let i = 0; i < 16; i++) list.m.push(_m4.elements[i]);
  _c.set(color);
  const j = 1 + (chash(Math.round(x * 10), Math.round(y * 10)) - 0.5) * jitter * 2;
  list.c.push(_c.r * j, _c.g * j, _c.b * j);
}

// Farm per polder block (or none), facing the block edge that has a road.
const farmCache = new Map();
function farmOf(bx, by) {
  const key = bx + ',' + by;
  if (farmCache.has(key)) return farmCache.get(key);
  let f = null;
  if (chash(bx * 17 + 5, by * 23 + 9) < 0.62) {
    // prefer the block edges with a polder road, then any edge in open land
    const sides = [0, 1, 2, 3].sort((u, v) => (u < 2 && edgeRoad(bx, by, u) ? 0 : 1) - (v < 2 && edgeRoad(bx, by, v) ? 0 : 1));
    const along = (Math.floor((0.18 + 0.64 * chash(bx * 31 + 1, by * 37 + 2)) * BLOCK / PW) + 0.5) * PW;
    for (const s of sides) {
      const perp = s < 2 ? ROAD_IN + ROAD_W + 11 : BLOCK - 14;
      const x = bx * BLOCK + (s % 2 === 0 ? perp : along);
      const y = by * BLOCK + (s % 2 === 0 ? along : perp);
      const angle = [0, Math.PI / 2, Math.PI, -Math.PI / 2][s];
      const ca = Math.cos(angle), sa = Math.sin(angle);
      if (!openLand(x - 30 * sa, y + 30 * ca) || !openLand(x + 30 * sa, y - 30 * ca) || !openLand(x + ca * 64, y + sa * 64) || !openLand(x - ca * 8, y - sa * 8)) continue;
      if (countryWeight(x, y) < 0.99) continue;
      f = { x, y, angle, ca, sa, look: Math.floor(chash(bx + 77, by - 5) * FARM_LOOKS.length), seed: chash(bx - 3, by + 11) };
      break;
    }
  }
  farmCache.set(key, f);
  return f;
}

function farmLocal(f, x, y) {
  const dx = x - f.x, dy = y - f.y;
  return [dx * f.ca + dy * f.sa, -dx * f.sa + dy * f.ca];
}
function farmWorld(f, lx, lz) {
  return [f.x + lx * f.ca - lz * f.sa, f.y + lx * f.sa + lz * f.ca];
}
function inFarmYard(x, y) {
  const f = farmOf(Math.floor(x / BLOCK), Math.floor(y / BLOCK));
  if (!f) return false;
  const [lx, lz] = farmLocal(f, x, y);
  return lx > -8 && lx < 64 && Math.abs(lz) < 26;
}

// Props and animals stay just outside the real map data: the meadow shader
// already feathers into the map edge, but real roads and plots run up to it.
const EDGE_CLEAR = 4;
function openLand(x, y) {
  return edgeDistance(x, y) > EDGE_CLEAR && countryWeight(x, y) >= FULL;
}

function okSpot(x, y, clearDitch = 0) {
  if (!openLand(x, y) || inFarmYard(x, y)) return false;
  const p = parcelAt(x, y);
  if (p.road || p.dMain < MAIN_HW + 0.6) return false;
  return p.dDitch >= clearDitch;
}

function genTile(tx, ty) {
  const tile = { tx, ty, items: {}, animals: [], farm: null, cx: (tx + 0.5) * TILE, cy: (ty + 0.5) * TILE };
  const x0 = tx * TILE, y0 = ty * TILE;
  const bx = Math.floor(x0 / BLOCK), by = Math.floor(y0 / BLOCK);
  const rot = chash(bx * 7 + 3, by * 13 + 1) < 0.5;
  const lx0 = x0 - bx * BLOCK, ly0 = y0 - by * BLOCK;
  const aMin = rot ? ly0 : lx0, bMin = rot ? lx0 : ly0;
  const aMax = aMin + TILE, bMax = bMin + TILE;
  const R = mulberry(chash(tx * 3 + 1, ty * 5 + 2));
  const W = (a, b) => blockToWorld(bx, by, rot, a, b);
  const lineAng = rot ? 0 : Math.PI / 2; // three rotY that lays local +X along the strip direction b

  // strip-boundary lines: tree rows, hedges, electric fences
  for (let col = Math.ceil(aMin / PW); col * PW < aMax; col++) {
    if (col <= 0) continue;
    const a = col * PW;
    const lh = chash(col + bx * 131 + 900, by * 977 + (rot ? 7 : 3));
    const side = chash(col + 3, by + bx) < 0.5 ? -1 : 1;
    if (lh < 0.08) {
      const willow = lh < 0.045;
      for (let b = Math.ceil(bMin / 7) * 7; b < bMax; b += 7) {
        const [x, y] = W(a + side * 2.1, b + (R() - 0.5) * 1.5);
        if (!okSpot(x, y, 1.6)) continue;
        push(tile, willow ? 'willow' : 'tree', x, y, R() * 6.28, 0.85 + R() * 0.3, 0.85 + R() * 0.35, 0.85 + R() * 0.3, 0xffffff, 0.1);
      }
    } else if (lh < 0.13) {
      for (let b = Math.ceil(bMin / 2.2) * 2.2; b < bMax; b += 2.2) {
        const [x, y] = W(a + side * 2.0, b);
        if (!okSpot(x, y, 1.5)) continue;
        push(tile, 'hedge', x, y, lineAng + (R() - 0.5) * 0.3, 2.6, 0.9 + R() * 0.35, 1.3, 0xffffff, 0.08);
      }
    } else if (lh < 0.3) {
      let run = null;
      const flush = () => {
        if (!run || run.n < 2) { run = null; return; }
        const len = Math.hypot(run.x1 - run.x0, run.y1 - run.y0);
        const mx = (run.x0 + run.x1) / 2, my = (run.y0 + run.y1) / 2;
        const ang = -Math.atan2(run.y1 - run.y0, run.x1 - run.x0);
        for (const h of [0.45, 0.85]) push(tile, 'wire', mx, my, ang, len, 1, 1, 0xffffff, 0, h);
        run = null;
      };
      for (let b = Math.ceil(bMin / 3.5) * 3.5; b < bMax; b += 3.5) {
        const [x, y] = W(a + side * 1.6, b);
        if (!okSpot(x, y, 1.4)) { flush(); continue; }
        push(tile, 'post', x, y, R() * 6.28, 1, 0.9 + R() * 0.2, 1, 0xffffff, 0.12);
        if (!run) run = { x0: x, y0: y, x1: x, y1: y, n: 1 };
        else { run.x1 = x; run.y1 = y; run.n++; }
      }
      flush();
    }
  }

  // polder-road verges: tree rows (lanes of oaks / poplars)
  for (const s of [0, 1]) {
    if (!edgeRoad(bx, by, s)) continue;
    const onEdge = s === 0 ? lx0 === 0 : ly0 === 0;
    if (!onEdge) continue;
    const kind = chash(bx * 5 + s, by * 9) < 0.5 ? 'poplar' : chash(bx + s, by) < 0.75 ? 'tree' : null;
    if (!kind) continue;
    const step = kind === 'poplar' ? 8 : 10;
    for (let t = step / 2; t < TILE; t += step) {
      for (const off of [ROAD_IN - 1.4, ROAD_IN + ROAD_W + 1.6]) {
        const x = s === 0 ? x0 + off : x0 + t, y = s === 0 ? y0 + t : y0 + off;
        if (!openLand(x, y) || inFarmYard(x, y)) continue;
        if (parcelAt(x, y).dDitch < 1.4) continue;
        push(tile, kind, x, y, R() * 6.28, 0.9 + R() * 0.2, 0.9 + R() * 0.25, 0.9 + R() * 0.2, 0xffffff, 0.1);
      }
    }
  }

  // parcels whose centre lies in this tile
  for (let col = Math.floor(aMin / PW); col * PW < aMax; col++) {
    const a0 = col * PW, a1 = a0 + PW;
    const ac = (a0 + a1) / 2;
    if (ac < aMin || ac >= aMax) continue;
    const off = chash(col + bx * 131 + by * 977, rot ? 18 : 17) * PL;
    for (let row = Math.floor((bMin - PL + off) / PL); row * PL - off < bMax + PL; row++) {
      const b0 = Math.max(0, row * PL - off), b1 = Math.min(BLOCK, (row + 1) * PL - off);
      if (b1 - b0 < 20) continue;
      const bc = (b0 + b1) / 2;
      if (bc < bMin || bc >= bMax) continue;
      genParcel(tile, bx, by, rot, col, row, a0, a1, b0, b1, W, lineAng);
    }
  }

  // the block's farm, if its house sits in this tile
  const f = farmOf(bx, by);
  if (f && f.x >= x0 && f.x < x0 + TILE && f.y >= y0 && f.y < y0 + TILE) {
    tile.farm = f;
    genFarmYard(tile, f);
  }

  for (const k in tile.items) {
    const it = tile.items[k];
    it.m = new Float32Array(it.m);
    it.c = new Float32Array(it.c);
  }
  return tile;
}

function genParcel(tile, bx, by, rot, col, row, a0, a1, b0, b1, W, lineAng) {
  const seed = chash(col * 7 + bx * 1009, row * 13 + by * 2003 + 1);
  const use = parcelUse(seed);
  const R = mulberry(chash(Math.floor(seed * 1e7), 91));
  const [cx, cy] = W((a0 + a1) / 2, (b0 + b1) / 2);
  if (!openLand(cx, cy)) return;
  const inset = 3;
  const c0 = W(a0 + inset, b0 + inset), c1 = W(a1 - inset, b1 - inset);
  const rect = [Math.min(c0[0], c1[0]), Math.min(c0[1], c1[1]), Math.max(c0[0], c1[0]), Math.max(c0[1], c1[1])];
  const herdsOk = openLand(rect[0], rect[1]) && openLand(rect[2], rect[1]) && openLand(rect[0], rect[3]) && openLand(rect[2], rect[3]);

  // gate at one end of the strip, with short fence wings
  if (R() < 0.45) {
    const endB = R() < 0.5 && b0 > 0 ? b0 + 1.9 : b1 < BLOCK ? b1 - 1.9 : b0 + 1.9;
    const ga = a0 + 5 + R() * (PW - 14);
    const [gx, gy] = W(ga, endB);
    if (okSpot(gx, gy, 0.5)) {
      const across = rot ? -Math.PI / 2 : 0;
      push(tile, 'gate', gx, gy, across + (R() < 0.3 ? 0.5 : 0), 1, 1, 1, 0xffffff, 0.04);
      for (const s of [-1, 1]) {
        for (let k = 1; k <= 2; k++) {
          const [px, py] = W(ga + s * (2.1 + k * 2.2), endB);
          if (okSpot(px, py, 0.5)) push(tile, 'post', px, py, 0, 1, 1, 1, 0xffffff, 0.12);
        }
        const [mx, my] = W(ga + s * 4.3, endB);
        for (const h of [0.45, 0.85]) push(tile, 'wire', mx, my, rot ? -Math.PI / 2 : 0, 4.4, 1, 1, 0xffffff, 0, h);
      }
    }
  }

  // round bales on mown / hay strips
  if ((use === 'hay' || use === 'mown') && R() < 0.35) {
    const colors = [0xe8e8e2, 0x2a2a2a, 0x9fb58a, 0xc9b26a];
    const color = colors[Math.floor(R() * colors.length)];
    const n = 3 + Math.floor(R() * 7);
    const ba = a0 + 8 + R() * (PW - 16), bb = b0 + 15 + R() * Math.max(1, b1 - b0 - 30);
    const rowWise = R() < 0.5;
    for (let i = 0; i < n; i++) {
      const [x, y] = rowWise ? W(ba + (R() - 0.5) * 1.5, bb + i * 1.7) : W(ba + (R() - 0.5) * 14, bb + (R() - 0.5) * 40);
      if (!okSpot(x, y, 2)) continue;
      push(tile, 'bale', x, y, rowWise ? lineAng + Math.PI / 2 + (R() - 0.5) * 0.2 : R() * 6.28, 1, 1, 1, color, 0.05);
    }
  }

  if (!herdsOk || (use !== 'pasture' && !(use === 'mown' && R() < 0.3))) return;
  const k = R();
  let kind = null, variant = null, n = 0, spread = 10;
  if (k < 0.3) { kind = 'cow'; n = 5 + Math.floor(R() * 8); spread = 13; }
  else if (k < 0.42) { kind = 'cow'; variant = 'red'; n = 4 + Math.floor(R() * 7); spread = 12; }
  else if (k < 0.6) { kind = 'sheep'; n = 8 + Math.floor(R() * 12); spread = 9; }
  else if (k < 0.67) { kind = 'horse'; variant = Math.floor(R() * HORSE_COATS.length); n = 2 + Math.floor(R() * 3); spread = 14; }
  if (kind) {
    const hc = W(a0 + PW / 2 + (R() - 0.5) * (PW - 16), b0 + 20 + R() * Math.max(1, b1 - b0 - 40));
    for (let i = 0; i < n; i++) {
      const x = Math.min(rect[2], Math.max(rect[0], hc[0] + (R() - 0.5) * spread * 2));
      const y = Math.min(rect[3], Math.max(rect[1], hc[1] + (R() - 0.5) * spread * 2));
      if (inFarmYard(x, y)) continue;
      const a = newAnimal(kind, kind === 'horse' ? (variant + (R() < 0.3 ? 1 : 0)) % HORSE_COATS.length : variant, x, y, rect, R);
      a.hx = hc[0]; a.hy = hc[1]; a.spread = spread;
      tile.animals.push(a);
    }
  }
  // a flock of geese grazing near the ditch, or a pair of ducks in it
  if (R() < 0.12) {
    const gb = R() < 0.5 ? b0 + 5 : b1 - 5;
    const hc = W(a0 + 6 + R() * (PW - 12), gb);
    const m = 6 + Math.floor(R() * 9);
    for (let i = 0; i < m; i++) {
      const x = Math.min(rect[2], Math.max(rect[0], hc[0] + (R() - 0.5) * 10));
      const y = Math.min(rect[3], Math.max(rect[1], hc[1] + (R() - 0.5) * 10));
      if (inFarmYard(x, y)) continue;
      const g = newAnimal('goose', null, x, y, rect, R);
      g.hx = hc[0]; g.hy = hc[1]; g.spread = 6;
      tile.animals.push(g);
    }
  } else if (R() < 0.08) {
    const db = b0 + 20 + R() * Math.max(1, b1 - b0 - 40);
    const [dx0, dy0] = W(a0, db - 30), [dx1, dy1] = W(a0, db + 30);
    const drect = [Math.min(dx0, dx1) - 0.25, Math.min(dy0, dy1) - 0.25, Math.max(dx0, dx1) + 0.25, Math.max(dy0, dy1) + 0.25];
    for (let i = 0; i < 2; i++) {
      const [x, y] = W(a0, db + i * 1.2);
      if (!openLand(x, y) || parcelAt(x, y).road) continue;
      const d = newAnimal('duck', null, x, y, drect, R);
      d.hx = x; d.hy = y; d.spread = 25;
      tile.animals.push(d);
    }
  }
}

function genFarmYard(tile, f) {
  const R = mulberry(f.seed);
  const W = (lx, lz) => farmWorld(f, lx, lz);
  // shelter belt of trees round the yard, open towards the road
  for (let lx = 4; lx <= 62; lx += 7) {
    for (const s of [-1, 1]) {
      if (R() < 0.18) continue;
      const [x, y] = W(lx + (R() - 0.5) * 2, s * (16.5 + R() * 2));
      push(tile, R() < 0.7 ? 'tree' : 'poplar', x, y, R() * 6.28, 0.9 + R() * 0.3, 0.9 + R() * 0.3, 0.9 + R() * 0.3, 0xffffff, 0.1);
    }
  }
  for (let lz = -16; lz <= 16; lz += 7) {
    const [x, y] = W(60 + (R() - 0.5) * 2, lz);
    push(tile, 'tree', x, y, R() * 6.28, 0.9 + R() * 0.3, 0.9 + R() * 0.3, 0.9 + R() * 0.3, 0xffffff, 0.1);
  }
  // stack of wrapped bales and a hay barrack in the yard
  const wrap = R() < 0.5 ? 0xe8e8e2 : 0x2a2a2a;
  const baseAng = -f.angle;
  for (const [layer, count] of [[0, 4], [1, 3], [2, 2]]) {
    for (let k = 0; k < count; k++) {
      const [x, y] = W(26 + k * 1.3 + layer * 0.65, 14.2);
      const list = tile.items.bale || (tile.items.bale = { m: [], c: [] });
      _e.set(0, baseAng, 0);
      _q.setFromEuler(_e);
      _m4.compose(_p.set(x, GROUND_Y + layer * 1.3, y), _q, _s.set(0.86, 0.86, 0.86));
      for (let e = 0; e < 16; e++) list.m.push(_m4.elements[e]);
      _c.set(wrap);
      list.c.push(_c.r, _c.g, _c.b);
    }
  }
  if (R() < 0.8) {
    const [x, y] = W(55, 6);
    push(tile, 'barrack', x, y, baseAng, 1, 1, 1, 0xffffff, 0.05);
  }
}

// ------------------------------------------------------------------ pools

const PROP_TYPES = {
  tree: { geo: roundTreeGeometry, cap: 7000, shadow: true },
  poplar: { geo: poplarGeometry, cap: 5000, shadow: true },
  willow: { geo: willowGeometry, cap: 4000, shadow: true },
  hedge: { geo: hedgeGeometry, cap: 6000, shadow: false },
  post: { geo: () => boxGeometry(0.11, 1.15, 0.11, 0x8d8474), cap: 9000, shadow: false },
  wire: { geo: () => boxGeometry(1, 0.025, 0.025, 0xdad6c8), cap: 5000, shadow: false },
  gate: { geo: gateGeometry, cap: 1500, shadow: false },
  bale: { geo: baleGeometry, cap: 4000, shadow: true },
  barrack: { geo: barrackGeometry, cap: 200, shadow: true },
  reed: { geo: reedGeometry, cap: 14000, shadow: false, near: true, double: true },
};

function makePool(geo, mat, cap, shadow) {
  const mesh = new THREE.InstancedMesh(geo, mat, cap);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  mesh.matrixAutoUpdate = false;
  mesh.userData.shared = true;
  return mesh;
}

function init(scene) {
  const group = new THREE.Group();
  group.name = 'countryside';
  group.matrixAutoUpdate = false;
  scene.add(group);
  const propMat = markShared(vcMaterial({ roughness: 0.9 }));
  const reedMat = markShared(vcMaterial({ roughness: 0.9, side: THREE.DoubleSide }));
  const pools = {};
  for (const [k, T] of Object.entries(PROP_TYPES)) {
    pools[k] = makePool(T.geo(), T.double ? reedMat : propMat, T.cap, T.shadow);
    group.add(pools[k]);
  }
  const groundMat = createTerrainMaterial();
  const ground = new THREE.Mesh(new THREE.BufferGeometry(), groundMat);
  ground.position.y = GROUND_Y;
  ground.receiveShadow = true;
  ground.userData.isTerrain = true;
  group.add(ground);

  const blobTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 2, 32, 32, 31);
    grd.addColorStop(0, 'rgba(0,0,0,0.55)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const blobMat = new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 });
  const blobs = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), blobMat, 3000);
  blobs.count = 0;
  blobs.frustumCulled = false;
  blobs.matrixAutoUpdate = false;
  group.add(blobs);

  S = {
    group, pools, ground, groundKey: '', blobs,
    tiles: new Map(), queue: [], wantKey: '', repackTimer: 0, dirty: true, reedKey: '',
    animals: [], animalDirty: true,
    skinned: new Map(), meshPool: new Map(), herdPools: new Map(),
    farms: new Map(), farmGeos: [], farmMat: propMat,
    prev: null, surf: null, splashAt: 0,
    audible: [],
  };
  window.__countryside = S;
}

// ------------------------------------------------------------------ ground ring

function updateGround(px, py) {
  const cx = Math.round(px / GROUND_SNAP) * GROUND_SNAP, cy = Math.round(py / GROUND_SNAP) * GROUND_SNAP;
  const key = cx + ',' + cy;
  if (key === S.groundKey) return;
  S.groundKey = key;
  const r = countryRect();
  // terrain3d's mesh spans the map bounds plus 15% of the larger extent
  const pad = Math.max(r.hx, r.hy) * 2 * 0.15 - 1;
  const I = [r.cx - r.hx - pad, r.cy - r.hy - pad, r.cx + r.hx + pad, r.cy + r.hy + pad];
  const O = [cx - GROUND_HALF, cy - GROUND_HALF, cx + GROUND_HALF, cy + GROUND_HALF];
  const rects = [];
  const ix0 = Math.max(O[0], I[0]), iy0 = Math.max(O[1], I[1]), ix1 = Math.min(O[2], I[2]), iy1 = Math.min(O[3], I[3]);
  if (ix0 >= ix1 || iy0 >= iy1) rects.push(O);
  else {
    if (O[1] < iy0) rects.push([O[0], O[1], O[2], iy0]);
    if (iy1 < O[3]) rects.push([O[0], iy1, O[2], O[3]]);
    if (O[0] < ix0) rects.push([O[0], iy0, ix0, iy1]);
    if (ix1 < O[2]) rects.push([ix1, iy0, O[2], iy1]);
  }
  const pos = [], idx = [];
  for (const [x0, y0, x1, y1] of rects) {
    const nx = Math.max(1, Math.ceil((x1 - x0) / 400)), ny = Math.max(1, Math.ceil((y1 - y0) / 400));
    const base = pos.length / 3;
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) pos.push(x0 + ((x1 - x0) * i) / nx, 0, y0 + ((y1 - y0) * j) / ny);
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const a = base + j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const nrm = new Float32Array(pos.length);
  for (let i = 1; i < nrm.length; i += 3) nrm[i] = 1;
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  S.ground.geometry.dispose();
  S.ground.geometry = geo;
}

// ------------------------------------------------------------------ streaming

function propRadius(viewDist) {
  return Math.min(620, Math.max(260, viewDist + 60));
}

function syncTiles(px, py, viewDist, budgetEnd) {
  const R = propRadius(viewDist);
  const t0x = Math.floor((px - R) / TILE), t1x = Math.floor((px + R) / TILE);
  const t0y = Math.floor((py - R) / TILE), t1y = Math.floor((py + R) / TILE);
  const key = t0x + ',' + t0y + ',' + Math.round(R);
  if (key !== S.wantKey) {
    S.wantKey = key;
    const want = [];
    for (let ty = t0y; ty <= t1y; ty++) {
      for (let tx = t0x; tx <= t1x; tx++) {
        const cx = (tx + 0.5) * TILE, cy = (ty + 0.5) * TILE;
        const d = Math.hypot(cx - px, cy - py);
        if (d > R + TILE * 0.71) continue;
        if (edgeDistance(cx, cy) < -(180 + 110 + TILE * 0.71)) continue;
        const k = tx + ',' + ty;
        if (!S.tiles.has(k)) want.push({ tx, ty, k, d });
      }
    }
    want.sort((a, b) => a.d - b.d);
    S.queue = want;
    for (const [k, t] of S.tiles) {
      if (Math.hypot(t.cx - px, t.cy - py) > R + TILE * 1.3) {
        unloadTile(t);
        S.tiles.delete(k);
        S.dirty = true;
      }
    }
  }
  let made = 0;
  while (S.queue.length && (made === 0 || performance.now() < budgetEnd)) {
    const w = S.queue.shift();
    if (S.tiles.has(w.k)) continue;
    const t = genTile(w.tx, w.ty);
    S.tiles.set(w.k, t);
    loadTile(t);
    S.dirty = true;
    made++;
  }
}

function loadTile(t) {
  for (const a of t.animals) S.animals.push(a);
  if (t.animals.length) S.animalDirty = true;
  if (t.farm) {
    const f = t.farm;
    const geo = S.farmGeos[f.look] || (S.farmGeos[f.look] = markShared(farmGeometry(FARM_LOOKS[f.look])));
    const m = new THREE.Mesh(geo, S.farmMat);
    m.position.set(f.x, GROUND_Y, f.y);
    m.rotation.y = -f.angle;
    m.castShadow = true;
    m.receiveShadow = true;
    m.updateMatrix();
    m.matrixAutoUpdate = false;
    S.group.add(m);
    S.farms.set(t, m);
  }
}

function unloadTile(t) {
  if (t.animals.length) {
    const gone = new Set(t.animals);
    S.animals = S.animals.filter((a) => !gone.has(a));
    for (const a of t.animals) releaseSkin(a);
    S.animalDirty = true;
  }
  const m = S.farms.get(t);
  if (m) { S.group.remove(m); S.farms.delete(t); }
}

function repack(px, py) {
  const counts = {};
  for (const k in S.pools) counts[k] = 0;
  const reedR2 = REED_R * REED_R;
  for (const t of S.tiles.values()) {
    const nearReed = (t.cx - px) ** 2 + (t.cy - py) ** 2 < reedR2;
    for (const k in t.items) {
      if (PROP_TYPES[k].near && !nearReed) continue;
      const pool = S.pools[k];
      const it = t.items[k];
      const n = it.c.length / 3;
      const cap = PROP_TYPES[k].cap;
      if (counts[k] + n > cap) continue;
      pool.instanceMatrix.array.set(it.m, counts[k] * 16);
      pool.instanceColor.array.set(it.c, counts[k] * 3);
      counts[k] += n;
    }
  }
  for (const k in S.pools) {
    const pool = S.pools[k];
    pool.count = counts[k];
    pool.instanceMatrix.needsUpdate = true;
    pool.instanceColor.needsUpdate = true;
  }
}

// Reed clumps along the ditch banks, only for tiles near the player.
function addReeds(t) {
  t.reeds = true;
  const x0 = t.tx * TILE, y0 = t.ty * TILE;
  const bx = Math.floor(x0 / BLOCK), by = Math.floor(y0 / BLOCK);
  const rot = chash(bx * 7 + 3, by * 13 + 1) < 0.5;
  const lx0 = x0 - bx * BLOCK, ly0 = y0 - by * BLOCK;
  const aMin = rot ? ly0 : lx0, bMin = rot ? lx0 : ly0;
  const tmp = { items: {} };
  const put = (a, b) => {
    const [x, y] = blockToWorld(bx, by, rot, a, b);
    const clump = chash(Math.floor(x / 7) + 5, Math.floor(y / 7) - 3);
    if (clump > 0.42 || !openLand(x, y)) return;
    const p = parcelAt(x, y);
    if (p.road || p.dMain < MAIN_HW * 0.8 || (p.dDitch < DITCH_HW * 0.72 && p.dMain > MAIN_HW + 0.5)) return;
    const h = chash(Math.round(x * 3), Math.round(y * 3));
    push(tmp, 'reed', x, y, h * 6.28, 0.9 + h * 0.3, 0.6 + clump * 1.1, 0.9 + h * 0.3, 0xffffff, 0.12);
  };
  // strip ditches (and the block's own main ditch at a = 0 / b = 0)
  for (let col = Math.ceil(aMin / PW); col * PW < aMin + TILE; col++) {
    const a = col * PW, hw = col === 0 ? MAIN_HW * 0.8 : DITCH_HW * 0.72;
    for (let b = bMin + 0.6; b < bMin + TILE; b += 1.25) {
      for (const sd of [-1, 1]) put(a + sd * (hw + 0.25 + chash(Math.round(b * 4), col) * 0.35), b);
    }
  }
  if (bMin === 0) {
    for (let a = aMin + 0.6; a < aMin + TILE; a += 1.25) put(a, MAIN_HW * 0.8 + 0.3 + chash(Math.round(a * 4), 9) * 0.35);
  }
  // cross ditches between the strips' parcels
  for (let col = Math.floor(aMin / PW); col * PW < aMin + TILE; col++) {
    const off = chash(col + bx * 131 + by * 977, rot ? 18 : 17) * PL;
    for (let row = Math.ceil((bMin + off) / PL); row * PL - off < bMin + TILE; row++) {
      const b = row * PL - off;
      if (b <= 0 || b >= BLOCK) continue;
      for (let a = col * PW + 1.5; a < col * PW + PW - 1.5; a += 1.25) {
        for (const sd of [-1, 1]) put(a, b + sd * (DITCH_HW * 0.72 + 0.25 + chash(Math.round(a * 4), row) * 0.35));
      }
    }
  }
  const it = tmp.items.reed;
  t.items.reed = it ? { m: new Float32Array(it.m), c: new Float32Array(it.c) } : { m: new Float32Array(0), c: new Float32Array(0) };
}

// ------------------------------------------------------------------ animals

function acquireSkin(a) {
  const key = animalKey(a);
  const pool = S.meshPool.get(key);
  let mesh = pool && pool.length ? pool.pop() : buildAnimalMesh(a);
  mesh.userData.poolKey = key;
  mesh.visible = true;
  S.group.add(mesh);
  S.skinned.set(a, mesh);
  return mesh;
}

function releaseSkin(a) {
  const mesh = S.skinned.get(a);
  if (!mesh) return;
  S.skinned.delete(a);
  S.animalDirty = true;
  S.group.remove(mesh);
  const key = mesh.userData.poolKey;
  if (!S.meshPool.has(key)) S.meshPool.set(key, []);
  const pool = S.meshPool.get(key);
  if (pool.length < 12) pool.push(mesh);
}

function herdPool(key) {
  let p = S.herdPools.get(key);
  if (!p) {
    const tpl = templateGeometry(key);
    p = makePool(tpl.geo, tpl.mat, 2500, false);
    p.userData.scale = tpl.scale;
    p.castShadow = false;
    S.group.add(p);
    S.herdPools.set(key, p);
  }
  return p;
}

function threatOf(world) {
  const p = world.player;
  const v = p.inVehicle;
  if (world.pigeonMode) return { x: p.x, y: p.y, r: 3, horn: false };
  if (v) {
    const sp = Math.abs(v.speed || 0);
    return { x: v.x, y: v.y, r: v.horn ? 45 : sp > 1.5 ? 14 + sp * 0.8 : 5, horn: !!v.horn, v, sp };
  }
  const sp = Math.hypot(p.vx || 0, p.vy || 0);
  return { x: p.x, y: p.y, r: sp > 4 ? 1.35 : sp > 0.5 ? 1 : 0.6, rel: true };
}

function clampRect(a) {
  const r = a.rect;
  a.x = Math.min(r[2], Math.max(r[0], a.x));
  a.y = Math.min(r[3], Math.max(r[1], a.y));
}

function simAnimal(a, dt, th, time) {
  const K = KINDS[a.kind];
  const dx = a.x - th.x, dy = a.y - th.y;
  const d = Math.hypot(dx, dy);
  const scareR = th.rel ? K.scare * th.r : th.r * (a.kind === 'cow' ? 0.8 : 1);
  if (d < scareR && a.flee <= 0.5) {
    a.flee = 2.5 + Math.random() * 2;
    a.fx = dx / (d || 1); a.fy = dy / (d || 1);
  }
  // cars shove animals aside instead of driving through them
  if (th.v && d < K.radius + 1.6) {
    const push = (K.radius + 1.6 - d);
    a.x += (dx / (d || 1)) * push;
    a.y += (dy / (d || 1)) * push;
  }
  const prevA = a.angle;
  if (a.flee > 0) {
    a.flee -= dt;
    const tx = a.x + a.fx * 10, ty = a.y + a.fy * 10;
    const want = Math.atan2(ty - a.y, tx - a.x);
    a.angle = lerpAngle(a.angle, want, Math.min(1, dt * 5));
    a.speed += (K.run * (a.flee > 1 ? 1 : a.flee) - a.speed) * Math.min(1, dt * 3);
  } else {
    const td = Math.hypot(a.tx - a.x, a.ty - a.y);
    if (td < 0.8) {
      a.speed = Math.max(0, a.speed - dt * 1.5);
      a.timer -= dt;
      if (a.timer <= 0) {
        const ang = Math.random() * Math.PI * 2, rad = Math.random() * (a.spread || 10);
        a.tx = a.hx + Math.cos(ang) * rad;
        a.ty = a.hy + Math.sin(ang) * rad;
        a.tx = Math.min(a.rect[2], Math.max(a.rect[0], a.tx));
        a.ty = Math.min(a.rect[3], Math.max(a.rect[1], a.ty));
        a.timer = 4 + Math.random() * 10;
      }
    } else {
      a.angle = lerpAngle(a.angle, Math.atan2(a.ty - a.y, a.tx - a.x), Math.min(1, dt * 2.5));
      a.speed += (K.walk - a.speed) * Math.min(1, dt * 2);
    }
  }
  const nx = a.x + Math.cos(a.angle) * a.speed * dt, ny = a.y + Math.sin(a.angle) * a.speed * dt;
  const r = a.rect;
  if (nx < r[0] || nx > r[2] || ny < r[1] || ny > r[3]) {
    // ditch ahead: slide along it, and turn away if fleeing into it
    if (a.flee > 0) {
      if (nx < r[0] || nx > r[2]) a.fx = -a.fx * 0.5;
      if (ny < r[1] || ny > r[3]) a.fy = -a.fy * 0.5;
      const l = Math.hypot(a.fx, a.fy) || 1;
      a.fx /= l; a.fy /= l;
    } else a.timer = 0;
  }
  a.x = nx; a.y = ny;
  clampRect(a);
  a.stride += a.speed * dt;
  a.turn = (a.angle - prevA) / Math.max(dt, 1e-3);
}

function lerpAngle(a, b, t) {
  let d = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return a + d * t;
}

function animateGoose(mesh, a, time) {
  const b = mesh.userData.bones;
  const moving = a.speed > 0.05;
  const s = a.stride * (a.speed > 1 ? 9 : 14);
  mesh.position.y = 0.2 + (moving ? Math.abs(Math.sin(s)) * 0.015 : 0);
  const graze = moving ? 0 : Math.max(0, Math.sin(time * 0.7 + a.bobSeed * 9)) ** 0.5;
  b.body.rotation.set(moving ? Math.sin(s) * 0.08 : 0, 0, -0.1 - graze * 0.35);
  b.head.rotation.set(0, moving ? 0 : Math.sin(time * 0.5 + a.bobSeed * 4) * 0.4, -graze * 0.9 + (graze > 0.5 ? Math.sin(time * 7) * 0.08 : 0));
  b.tail.rotation.set(0, Math.sin(time * 3 + a.bobSeed) * 0.15, 0);
}

function updateAnimals(dt, world, time, simulate) {
  const p = world.player;
  const th = threatOf(world);
  const cands = [];
  for (const a of S.animals) {
    const d2 = (a.x - p.x) ** 2 + (a.y - p.y) ** 2;
    if (d2 > SIM_R * SIM_R) continue;
    if (simulate) simAnimal(a, dt, th, time);
    a._d2 = d2;
    cands.push(a);
  }
  cands.sort((u, v) => u._d2 - v._d2);
  const want = new Set();
  for (let i = 0; i < cands.length && want.size < SKIN_MAX; i++) {
    if (cands[i]._d2 < SKIN_R * SKIN_R) want.add(cands[i]);
  }
  for (const a of [...S.skinned.keys()]) if (!want.has(a)) releaseSkin(a);
  let shadows = 0, fresh = 0;
  for (const a of want) {
    let mesh = S.skinned.get(a);
    if (!mesh) {
      if (fresh++ >= 4) continue;
      mesh = acquireSkin(a);
      S.animalDirty = true;
    }
    mesh.position.set(a.x, 0, a.y);
    mesh.rotation.y = -a.angle;
    if (a.kind === 'goose') animateGoose(mesh, a, time);
    else if (a.kind === 'duck') {
      animateWildlifeMesh3D(mesh, a, time);
      mesh.position.y = -0.06 + Math.sin(time * 1.7 + a.bobSeed * 6) * 0.008;
    } else animateWildlifeMesh3D(mesh, a, time);
    const cast = shadows < SHADOW_MAX && a._d2 < 40 * 40 && a.kind !== 'duck';
    if (cast) shadows++;
    if (mesh.userData.cast !== cast) {
      mesh.userData.cast = cast;
      mesh.traverse((o) => { if (o.isMesh) o.castShadow = cast; });
    }
  }

  // everything else: static instanced herds, refreshed a few times a second
  S.herdTimer = (S.herdTimer || 0) - dt;
  if (S.herdTimer <= 0 || S.animalDirty) {
    S.herdTimer = S.animalDirty ? 0 : 0.25;
    S.animalDirty = false;
    const counts = new Map();
    let built = 0;
    for (const pool of S.herdPools.values()) pool.count = 0;
    for (const a of S.animals) {
      if (S.skinned.has(a)) continue;
      const key = animalKey(a);
      // one new herd template per frame keeps the first arrival hitch-free
      if (!S.herdPools.has(key)) {
        if (built++) { S.animalDirty = true; continue; }
      }
      const pool = herdPool(key);
      const n = counts.get(key) || 0;
      if (n >= 2500) continue;
      const sc = pool.userData.scale || 1;
      _e.set(0, -a.angle, 0);
      _q.setFromEuler(_e);
      _m4.compose(_p.set(a.x, a.kind === 'goose' ? 0.2 : a.kind === 'duck' ? -0.06 : 0, a.y), _q, _s.set(sc, sc, sc));
      _m4.toArray(pool.instanceMatrix.array, n * 16);
      pool.instanceColor.array[n * 3] = pool.instanceColor.array[n * 3 + 1] = pool.instanceColor.array[n * 3 + 2] = 1;
      counts.set(key, n + 1);
    }
    for (const [key, pool] of S.herdPools) {
      pool.count = counts.get(key) || 0;
      pool.instanceMatrix.needsUpdate = true;
      pool.instanceColor.needsUpdate = true;
    }
  }

  // soft blob shadows under every nearby animal
  let n = 0;
  const arr = S.blobs.instanceMatrix.array;
  for (const a of cands) {
    const sz = KINDS[a.kind].shadow;
    if (!sz || n >= 3000) continue;
    _e.set(0, -a.angle, 0);
    _q.setFromEuler(_e);
    _m4.compose(_p.set(a.x, 0.0, a.y), _q, _s.set(sz[0] * 1.5, 1, sz[1] * 1.8));
    _m4.toArray(arr, n * 16);
    n++;
  }
  S.blobs.count = n;
  S.blobs.instanceMatrix.needsUpdate = true;

  // ambience.js picks moos/bleats from world.countryAudible: keep it to the
  // two nearest cows and one sheep so it stays an occasional, distant sound
  const aud = S.audible;
  aud.length = 0;
  let cows = 0, sheep = 0;
  for (const a of cands) {
    if (a._d2 > 90 * 90) break;
    if (a.kind === 'cow' && cows < 2) { aud.push(a); cows++; }
    else if (a.kind === 'sheep' && sheep < 1) { aud.push(a); sheep++; }
    if (cows >= 2 && sheep >= 1) break;
  }
  world.countryAudible = aud;
}

// ------------------------------------------------------------------ gameplay

// Footprints of kop, hals and romp in farm-local space: [x0, x1, halfZ].
const FARM_BOXES = [[-0.2, 10.2, 6.7], [10, 17, 4.2], [16.8, 50.3, 12.3]];

function pushOutOfFarms(obj, radius) {
  const f = farmOf(Math.floor(obj.x / BLOCK), Math.floor(obj.y / BLOCK));
  if (!f) return false;
  let [lx, lz] = farmLocal(f, obj.x, obj.y);
  let hit = false;
  for (const [bx0, bx1, hz] of FARM_BOXES) {
    const x0 = bx0 - radius, x1 = bx1 + radius, z0 = -hz - radius, z1 = hz + radius;
    if (lx <= x0 || lx >= x1 || lz <= z0 || lz >= z1) continue;
    const opts = [[lx - x0, x0, lz], [x1 - lx, x1, lz], [lz - z0, lx, z0], [z1 - lz, lx, z1]];
    opts.sort((u, v) => u[0] - v[0]);
    lx = opts[0][1]; lz = opts[0][2];
    hit = true;
  }
  if (!hit) return false;
  const [wx, wy] = farmWorld(f, lx, lz);
  obj.x = wx; obj.y = wy;
  return true;
}

// Countryside ground under (x, y), or null where a real mapped road or
// plot takes precedence (the meadow feathers a little into the map).
function groundAt(map, x, y) {
  const cs = countrySurface(x, y);
  if (!cs || cs === 'weg') return cs;
  if (edgeDistance(x, y) > 0) return cs;
  return surfaceUnder(map, x, y) === 'gras' ? 'gras' : null;
}

function gameplay(dt, world) {
  const p = world.player;
  if (world.pigeonMode || world.paused) { S.prev = null; return; }
  const v = p.inVehicle;
  if (v && !v.isBoat && !v.sinking && !v.wrecked) {
    const surf = groundAt(world.map, v.x, v.y);
    const sp = Math.abs(v.speed);
    if (surf === 'gras' || surf === 'sloot') {
      const cap = surf === 'sloot' ? 2.5 : Math.min(15, (v.model.maxSpeed || 30) * 0.45);
      if (sp > cap) v.speed -= Math.sign(v.speed) * (sp - cap) * Math.min(1, dt * (surf === 'sloot' ? 4 : 1.2));
      // bumpy meadow: a little random yaw wobble that grows with speed
      const k = Math.min(1, sp / 12);
      v.angle += Math.sin(world.time * 13.7 + v.x * 0.9) * Math.sin(world.time * 5.3 + v.y) * dt * 0.35 * k;
    }
    if (surf === 'sloot' && S.surf !== 'sloot' && sp > 1.5) splash(world, v.x, v.y);
    if (pushOutOfFarms(v, 1.2)) v.speed *= -0.25;
    S.surf = surf;
    S.prev = null;
    return;
  }
  if (v) { S.prev = null; return; }
  const surf = groundAt(world.map, p.x, p.y);
  const wading = surf === 'sloot' && !p.water && !p.swimming;
  if (wading && S.prev && Math.hypot(p.x - S.prev[0], p.y - S.prev[1]) < 3) {
    p.x = S.prev[0] + (p.x - S.prev[0]) * 0.45;
    p.y = S.prev[1] + (p.y - S.prev[1]) * 0.45;
  }
  if (wading && (p.z || 0) <= 0.001 && !(p.vz > 0)) p.z = -0.32;
  else if (!wading && p.z < 0 && !p.water) p.z = 0;
  if (wading && S.surf !== 'sloot') splash(world, p.x, p.y);
  pushOutOfFarms(p, p.radius || 0.35);
  S.surf = surf;
  S.prev = [p.x, p.y];
}

function splash(world, x, y) {
  const now = world.time;
  if (now - S.splashAt < 0.8) return;
  S.splashAt = now;
  const q = world.audioEvents || (world.audioEvents = []);
  if (q.length < 64) q.push({ kind: 'splash', x, y });
}

// ------------------------------------------------------------------ entry

// One call per frame from scene3d's update3D (after gameplay, before the
// player mesh is placed): streams the countryside around the player, runs
// the herds and applies the meadow/ditch effects on the player.
export function updateCountryside(dt, world, scene, cam, viewDist) {
  if (!S) init(scene);
  const p = world.player;
  const t0 = performance.now();
  const near = edgeDistance(p.x, p.y) > -(propRadius(viewDist) + 200);
  updateGround(p.x, p.y);
  if (near || S.tiles.size) {
    syncTiles(p.x, p.y, viewDist, t0 + GEN_BUDGET_MS);
    const reedKey = Math.floor(p.x / TILE) + ',' + Math.floor(p.y / TILE);
    if (reedKey !== S.reedKey) { S.reedKey = reedKey; S.dirty = true; }
    if (!S.queue.length && performance.now() < t0 + GEN_BUDGET_MS) {
      for (const t of S.tiles.values()) {
        if (t.reeds || (t.cx - p.x) ** 2 + (t.cy - p.y) ** 2 > REED_R * REED_R) continue;
        addReeds(t);
        S.dirty = true;
        break;
      }
    }
    S.repackTimer -= dt;
    if (S.dirty && S.repackTimer <= 0) {
      S.repackTimer = REPACK_EVERY;
      S.dirty = false;
      repack(p.x, p.y);
    }
    updateAnimals(world.paused ? 0 : dt, world, world.time, !world.paused);
  } else if (!S.idle) {
    // back in the city: drop whatever the last countryside frame left drawn
    for (const pool of Object.values(S.pools)) pool.count = 0;
    for (const pool of S.herdPools.values()) pool.count = 0;
    for (const a of [...S.skinned.keys()]) releaseSkin(a);
    S.blobs.count = 0;
    world.countryAudible = [];
  }
  S.idle = !(near || S.tiles.size);
  gameplay(dt, world);
  const ms = performance.now() - t0;
  S.ms = (S.ms || 0) * 0.95 + ms * 0.05;
  S.maxMs = Math.max((S.maxMs || 0) * 0.995, ms);
}

export function countrysideStats() {
  if (!S) return null;
  const pools = {};
  for (const [k, m] of Object.entries(S.pools)) pools[k] = m.count;
  let herd = 0;
  for (const m of S.herdPools.values()) herd += m.count;
  return { ms: +(S.ms || 0).toFixed(3), maxMs: +(S.maxMs || 0).toFixed(2), tiles: S.tiles.size, queue: S.queue.length, animals: S.animals.length, skinned: S.skinned.size, herd, farms: S.farms.size, pools };
}
