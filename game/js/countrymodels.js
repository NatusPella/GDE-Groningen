import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { chash } from './countryfield.js';
import { GeoBuilder, composeMatrix, tubeGeometry, loftGeometry } from './pixelart3d.js';
import { withParts, PART } from './countrybuilding.js';

// Flat-shaded, vertex-coloured geometry for the Ommelanden: vegetation,
// farmsteads and their yard machinery, village houses and church, turbines,
// mills, pylons, gas sites and the low-detail skyline silhouettes. Local
// convention for buildings: the front faces -X, depth runs along +X.

export function jitterIco(r, detail, seed, sx = 1, sy = 1, sz = 1) {
  const g = new THREE.IcosahedronGeometry(r, detail);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const j = 1 + (chash(Math.round(x * 30) + seed, Math.round(y * 30) * 7 + Math.round(z * 30) * 13) - 0.5) * 0.28;
    p.setXYZ(i, x * sx * j, y * sy * j, z * sz * j);
  }
  return g;
}

export const leafShade = (base) => (x, y, z) => {
  const h = chash(Math.round(x * 9) + 11, Math.round(y * 9) * 3 + Math.round(z * 9) * 5);
  return h < 0.33 ? base[0] : h < 0.7 ? base[1] : base[2];
};

// ------------------------------------------------------------------ vegetation

export function roundTreeGeometry() {
  const B = new GeoBuilder();
  B.geo(tubeGeometry([0, 0, 0], [0, 3.4, 0], 0.26, 0.18, 6), null, 0x4d3a28);
  B.geo(tubeGeometry([0, 2.6, 0], [0.9, 4.2, 0.3], 0.12, 0.08, 5), null, 0x4d3a28);
  const leaves = leafShade([0x3f6a32, 0x4a7a3c, 0x567f3e]);
  B.geo(jitterIco(2.6, 1, 3), composeMatrix(0, 5.6, 0), leaves);
  B.geo(jitterIco(1.7, 1, 9), composeMatrix(1.3, 4.9, 0.6), leaves);
  B.geo(jitterIco(1.6, 1, 17), composeMatrix(-1.1, 5.1, -0.8), leaves);
  return B.build();
}

export function poplarGeometry() {
  const B = new GeoBuilder();
  B.geo(tubeGeometry([0, 0, 0], [0, 4, 0], 0.24, 0.14, 6), null, 0x5a4a38);
  B.geo(jitterIco(1, 1, 5, 1.9, 7.5, 1.9), composeMatrix(0, 10, 0), leafShade([0x44703a, 0x507c40, 0x5c8646]));
  return B.build();
}

// Knotwilg: short fat pollard trunk with a bushy head of shoots.
export function willowGeometry() {
  const B = new GeoBuilder();
  B.geo(tubeGeometry([0, 0, 0], [0.1, 2.1, 0], 0.34, 0.4, 7), null, 0x5d5044);
  B.geo(jitterIco(0.45, 0, 1), composeMatrix(0.1, 2.15, 0), 0x5d5044);
  B.geo(jitterIco(1.9, 1, 21, 1, 1.15, 1), composeMatrix(0.1, 3.6, 0), leafShade([0x7a9258, 0x88a064, 0x6b8450]));
  return B.build();
}

export function hedgeGeometry() {
  const B = new GeoBuilder();
  B.geo(jitterIco(0.5, 1, 31, 1.05, 1, 1), composeMatrix(0, 0.55, 0, 0, 0, 0, 1, 1.2, 1.1), leafShade([0x3a5f2c, 0x44693a, 0x355628]));
  return B.build();
}

export function boxGeometry(sx, sy, sz, color, y0 = 0) {
  const B = new GeoBuilder();
  B.box(0, y0 + sy / 2, 0, sx, sy, sz, color);
  return B.build();
}

// ------------------------------------------------------------------ field props

export function gateGeometry() {
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

export function baleGeometry() {
  const B = new GeoBuilder();
  B.geo(new THREE.CylinderGeometry(0.75, 0.75, 1.2, 12).rotateX(Math.PI / 2), composeMatrix(0, 0.75, 0), 0xffffff);
  return B.build();
}

// Roedenberg: four poles and a liftable pyramid roof over a hay stack.
export function barrackGeometry() {
  const B = new GeoBuilder();
  const pole = 0x5a4632, hay = 0xc4ad62, roof = 0x6a5a3a;
  for (const [x, z] of [[-2.4, -2.4], [2.4, -2.4], [2.4, 2.4], [-2.4, 2.4]]) B.box(x, 3.6, z, 0.2, 7.2, 0.2, pole);
  B.box(0, 1.6, 0, 4.5, 3.2, 4.5, hay);
  B.geo(new THREE.ConeGeometry(4.0, 1.8, 4, 1).rotateY(Math.PI / 4), composeMatrix(0, 4.9, 0), roof);
  B.box(0, 4.0, 0, 5.2, 0.12, 5.2, pole);
  return B.build();
}

export function reedGeometry() {
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

// Ditch bank: a low grassy berm one metre long, scaled along the ditch.
export function bankGeometry() {
  const B = new GeoBuilder();
  const h = 0.16, w = 0.45, t = 0.15, top = 0x5a7432, side = 0x465e27;
  B.quad([-0.5, h, t], [0.5, h, t], [0.5, h, -t], [-0.5, h, -t], top);
  B.quad([-0.5, 0, w], [0.5, 0, w], [0.5, h, t], [-0.5, h, t], side);
  B.quad([0.5, 0, -w], [-0.5, 0, -w], [-0.5, h, -t], [0.5, h, -t], side);
  B.quad([0.5, 0, w], [0.5, 0, -w], [0.5, h, -t], [0.5, h, t], side);
  B.quad([-0.5, 0, -w], [-0.5, 0, w], [-0.5, h, t], [-0.5, h, -t], side);
  return B.build();
}

// Pitrus: a tuft of stiff dark rush blades on a wet ditch edge.
export function rushGeometry() {
  const B = new GeoBuilder();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + chash(i, 11) * 0.9;
    const s = Math.sin(a) * 0.05, c = Math.cos(a) * 0.05;
    const top = [Math.cos(a) * 0.22, 0.45 + chash(i, 13) * 0.3, Math.sin(a) * 0.22];
    const col = i % 2 ? 0x3e5a2a : 0x56702f;
    B.tri([-s, 0, c], [s, 0, -c], top, col);
    B.tri([s, 0, -c], [-s, 0, c], top, col);
  }
  return B.build();
}

// Paving: a unit tile, scaled per yard / drive / lane.
export function slabGeometry() {
  const B = new GeoBuilder();
  B.box(0, 0.035, 0, 1, 0.07, 1, 0xffffff);
  return B.build();
}

// Wildrooster: pit with steel bars across the drive (drive runs along x).
export function cattleGridGeometry() {
  const B = new GeoBuilder();
  B.box(0, 0.03, 0, 2.2, 0.06, 3.6, 0x1c1c1c);
  for (let i = 0; i < 9; i++) B.box(-0.96 + i * 0.24, 0.09, 0, 0.09, 0.06, 3.6, 0x8c8f90);
  for (const s of [-1, 1]) B.box(s * 1.18, 0.07, 0, 0.16, 0.14, 3.7, 0x9a968c);
  for (const s of [-1, 1]) {
    B.box(0, 0.5, s * 2.0, 0.12, 1.0, 0.12, 0xdad6c8);
    B.box(0, 0.95, s * 2.0, 0.08, 0.12, 0.4, 0xb8322a);
  }
  return B.build();
}

// ------------------------------------------------------------------ farm helpers

export function gableRoofX(B, x0, x1, hw, he, hr, color, wallColor) {
  const o = 0.45;
  B.quadOut([x0 - o, he - 0.2, hw + o], [x1 + o, he - 0.2, hw + o], [x1 + o, hr, 0], [x0 - o, hr, 0], [0, 1, 1], color);
  B.quadOut([x0 - o, he - 0.2, -hw - o], [x0 - o, hr, 0], [x1 + o, hr, 0], [x1 + o, he - 0.2, -hw - o], [0, 1, -1], color);
  B.triOut([x0, he, hw], [x0, he, -hw], [x0, hr - 0.3, 0], [-1, 0, 0], wallColor);
  B.triOut([x1, he, hw], [x1, hr - 0.3, 0], [x1, he, -hw], [1, 0, 0], wallColor);
}

export function gableRoofZ(B, x0, x1, hw, he, hr, color, wallColor, zc = 0) {
  const o = 0.45, xm = (x0 + x1) / 2;
  B.quadOut([x0 - o, he - 0.2, zc - hw - o], [x0 - o, he - 0.2, zc + hw + o], [xm, hr, zc + hw + o], [xm, hr, zc - hw - o], [-1, 1, 0], color);
  B.quadOut([x1 + o, he - 0.2, zc - hw - o], [xm, hr, zc - hw - o], [xm, hr, zc + hw + o], [x1 + o, he - 0.2, zc + hw + o], [1, 1, 0], color);
  B.triOut([x0, he, zc + hw], [x1, he, zc + hw], [xm, hr - 0.3, zc + hw], [0, 0, 1], wallColor);
  B.triOut([x0, he, zc - hw], [xm, hr - 0.3, zc - hw], [x1, he, zc - hw], [0, 0, -1], wallColor);
}

export function hipRoof(B, x0, x1, hw, he, hr, inset, color, zc = 0, o = 0.5) {
  const A = [x0 - o, he, zc - hw - o], Bq = [x1 + o, he, zc - hw - o], C = [x1 + o, he, zc + hw + o], D = [x0 - o, he, zc + hw + o];
  const R0 = [x0 + inset, hr, zc], R1 = [x1 - inset, hr, zc];
  B.quadOut(D, C, R1, R0, [0, 1, 1], color);
  B.quadOut(A, R0, R1, Bq, [0, 1, -1], color);
  B.triOut(A, D, R0, [-1, 1, 0], color);
  B.triOut(Bq, R1, C, [1, 1, 0], color);
}

export function windowAt(B, x, y, z, nx, nz, w, h, L) {
  const t = 0.12;
  if (nx) {
    B.box(x + nx * 0.06, y, z, t, h + 0.16, w + 0.16, L.trim);
    B.box(x + nx * 0.14, y, z, t, h, w, 0x2a3236);
  } else {
    B.box(x, y, z + nz * 0.06, w + 0.16, h + 0.16, t, L.trim);
    B.box(x, y, z + nz * 0.14, w, h, t, 0x2a3236);
  }
}

export const FARM_LOOKS = [
  { brick: 0x8f4634, kopRoof: 0x3e4449, barnRoof: 0x9a4a30, trim: 0xece8de, door: 0x2f4a3a },
  { brick: 0x6e3a2c, kopRoof: 0x464b52, barnRoof: 0x4a4e54, trim: 0xece8de, door: 0x6b2a24 },
  { brick: 0xe3ddd0, kopRoof: 0x3e4449, barnRoof: 0x8a7a52, trim: 0x2f4a3a, door: 0x2f4a3a, plaster: true },
];

// Groningen kop-hals-romp: the house (kop) faces the road at x = 0, a low
// neck (hals) and the huge barn (romp) with its hipped roof.
export function farmKHRGeometry(L) {
  const B = new GeoBuilder();
  B.box(5, 3, 0, 10, 6, 13, L.brick);
  gableRoofZ(B, 0, 10, 6.5, 6, 11, L.kopRoof, L.brick);
  for (const y of [1.6, 4.3]) for (const z of [-4.2, 4.2]) windowAt(B, 0, y, z, -1, 0, 1.2, 1.5, L);
  windowAt(B, 0, 4.3, 0, -1, 0, 1.2, 1.5, L);
  B.box(-0.08, 1.15, 0, 0.18, 2.3, 1.2, L.door);
  B.box(-0.12, 2.5, 0, 0.14, 0.5, 1.5, L.trim);
  for (const x of [2.5, 7.5]) for (const s of [-1, 1]) windowAt(B, x, 1.6, s * 6.5, 0, s, 1.1, 1.4, L);
  B.box(5, 11.4, 5.2, 0.8, 1.6, 0.8, 0x6e3a2c);
  B.box(13.5, 1.9, 0, 7, 3.8, 8, L.brick);
  gableRoofX(B, 10, 17, 4, 3.8, 7.6, L.kopRoof, L.brick);
  for (const s of [-1, 1]) windowAt(B, 13.5, 1.7, s * 4, 0, s, 1.0, 1.2, L);
  B.box(33.5, 1.6, 0, 33, 3.2, 24, L.plaster ? 0x8f4634 : L.brick);
  hipRoof(B, 17, 50, 12, 3.2, 15.5, 8, L.barnRoof);
  B.box(30, 1.8, 12.08, 5, 3.6, 0.16, L.door);
  B.box(30, 3.9, 12.1, 5.4, 0.4, 0.2, L.trim);
  B.box(50.08, 1.7, 0, 0.16, 3.4, 4.2, L.door);
  for (const x of [22, 38, 44]) windowAt(B, x, 1.9, -12, 0, -1, 1.4, 0.9, L);
  return B.build();
}

// Oldambster boerderij: a wide, low front house and the barn under one
// enormous roof sweeping almost to the ground.
export const OLDA_LOOKS = [
  { brick: 0x8a4432, roof: 0x3a3e42, trim: 0xf0ece2, door: 0x2f4a3a },
  { brick: 0x9a5a3e, roof: 0x5b4f40, trim: 0xf0ece2, door: 0x6b2a24 },
  { brick: 0x7a3a2c, roof: 0x8e4a30, trim: 0xe8e0c8, door: 0x2a3a5a },
];
export function farmOldaGeometry(L) {
  const B = new GeoBuilder();
  B.box(6, 2.1, 0, 12, 4.2, 22, L.brick);
  hipRoof(B, 0, 13, 11, 4.2, 10.5, 4.5, L.roof);
  for (const z of [-8.5, -5.2, 5.2, 8.5]) windowAt(B, 0, 2.2, z, -1, 0, 1.3, 1.9, L);
  B.box(-0.1, 1.3, 0, 0.2, 2.6, 1.4, L.door);
  B.box(-0.14, 2.9, 0, 0.16, 0.6, 1.8, L.trim);
  for (const z of [-2.4, 2.4]) windowAt(B, 0, 2.2, z, -1, 0, 1.0, 1.9, L);
  for (const x of [3, 9]) for (const s of [-1, 1]) windowAt(B, x, 2.2, s * 11, 0, s, 1.2, 1.7, L);
  for (const z of [-5, 5]) B.box(5, 10.2, z, 0.8, 2.2, 0.8, 0x6e3a2c);
  B.box(34.2, 1.8, 0, 44.4, 3.6, 30.8, L.brick);
  hipRoof(B, 12, 56.4, 15.4, 3.6, 17.5, 9, L.roof, 0, 0.8);
  B.box(34, 2.2, 15.5, 6, 4.4, 0.18, L.door);
  B.box(34, 4.6, 15.5, 6.4, 0.4, 0.22, L.trim);
  B.box(56.5, 2.2, 0, 0.18, 4.4, 5.5, L.door);
  for (const x of [20, 26, 44, 50]) windowAt(B, x, 2.2, -15.4, 0, -1, 1.2, 0.8, L);
  return B.build();
}

// Keuterboerderij: small house and byre in one, gable to the road.
export const SMALL_LOOKS = [
  { brick: 0x8f4634, roof: 0x9a4a30, trim: 0xece8de, door: 0x2f4a3a, barn: 0x2e2a26 },
  { brick: 0x7a3a2c, roof: 0x3e4449, trim: 0xece8de, door: 0x6b2a24, barn: 0x5a3a2a },
  { brick: 0xe6e0d2, roof: 0x3e4449, trim: 0x2f4a3a, door: 0x2f4a3a, barn: 0x2e2a26 },
];
export function farmSmallGeometry(L) {
  const B = new GeoBuilder();
  B.box(4.5, 1.5, 0, 9, 3, 11, L.brick);
  B.box(16.5, 1.5, 0, 15, 3, 11, L.barn);
  B.box(16.5, 0.5, 0, 15.05, 1, 11.05, L.brick === 0xe6e0d2 ? 0x8f4634 : L.brick);
  gableRoofX(B, 0, 24, 5.5, 3, 8.4, L.roof, L.brick);
  for (const z of [-3, 3]) windowAt(B, 0, 1.6, z, -1, 0, 1.1, 1.3, L);
  windowAt(B, 0, 4.6, 0, -1, 0, 0.8, 1.0, L);
  for (const x of [2.5, 6.5]) for (const s of [-1, 1]) windowAt(B, x, 1.6, s * 5.5, 0, s, 1.0, 1.2, L);
  B.box(12, 1.3, 5.55, 1.4, 2.4, 0.14, L.door);
  B.box(24.08, 1.6, 0, 0.16, 3, 3.2, L.door);
  B.box(3, 8.3, -2, 0.7, 1.4, 0.7, 0x6e3a2c);
  return B.build();
}

// Modern dairy: a plain farmhouse off to one side, milking parlour and a
// long cubicle barn with open curtain sides and a light ridge.
export function farmDairyGeometry(L) {
  const B = new GeoBuilder();
  B.box(4.5, 3, -10, 9, 6, 10, L.brick);
  hipRoof(B, 0, 9, 5, 6, 9.5, 2.5, L.kopRoof, -10);
  for (const y of [1.6, 4.3]) for (const z of [-13, -7]) windowAt(B, 0, y, z, -1, 0, 1.3, 1.4, L);
  B.box(-0.08, 1.15, -10, 0.18, 2.3, 1.1, L.door);
  B.box(14.5, 2, 0, 11, 4, 12, 0xc9c5ba);
  gableRoofX(B, 9, 20, 6, 4, 6, 0x55605a, 0xc9c5ba);
  for (const s of [-1, 1]) windowAt(B, 14.5, 2.4, s * 6, 0, s, 3, 0.7, L);
  const SHEET = 0x5f6b5a, CURT = 0x2b2f2c;
  B.box(50, 0.6, 0, 60, 1.2, 34, 0xa8a49a);
  B.box(50, 2.2, 0, 59.8, 2.0, 33.8, CURT);
  B.box(50, 3.3, 0, 60, 0.6, 34, SHEET);
  for (let x = 20; x <= 80; x += 6) for (const s of [-1, 1]) B.box(x, 2.1, s * 16.9, 0.25, 4.2, 0.25, 0x8a8a84);
  gableRoofX(B, 20, 80, 17, 3.6, 9, 0x4e5852, SHEET);
  B.box(50, 9.05, 0, 60.6, 0.2, 1.6, 0xd8dccf);
  for (const x of [20, 80]) B.box(x + (x < 50 ? -0.05 : 0.05), 2.4, 0, 0.14, 4.4, 5, 0x3a3e3a);
  return B.build();
}

// Werktuigenloods: steel machine shed, unit footprint (scaled per yard).
export function shedGeometry() {
  const B = new GeoBuilder();
  B.box(0, 2.6, 0, 1, 5.2, 1, 0xffffff);
  const o = 0.03;
  B.quadOut([-0.5 - o, 5.2, 0.5 + o], [0.5 + o, 5.2, 0.5 + o], [0.5 + o, 7.2, 0], [-0.5 - o, 7.2, 0], [0, 1, 1], 0xa0a4a0);
  B.quadOut([-0.5 - o, 5.2, -0.5 - o], [-0.5 - o, 7.2, 0], [0.5 + o, 7.2, 0], [0.5 + o, 5.2, -0.5 - o], [0, 1, -1], 0xa0a4a0);
  B.triOut([-0.5, 5.2, 0.5], [-0.5, 5.2, -0.5], [-0.5, 7.1, 0], [-1, 0, 0], 0xffffff);
  B.triOut([0.5, 5.2, 0.5], [0.5, 7.1, 0], [0.5, 5.2, -0.5], [1, 0, 0], 0xffffff);
  B.box(0, 2.1, 0.505, 0.55, 4.2, 0.01, 0x3a3c3a);
  for (let i = 1; i < 8; i++) B.box(-0.5 + i / 8, 2.6, -0.503, 0.004, 5.2, 0.01, 0x8a8e8a);
  return B.build();
}

// Mestsilo: low wide concrete ring with a tent roof (unit radius).
export function mestSiloGeometry() {
  const B = new GeoBuilder();
  B.geo(new THREE.CylinderGeometry(1, 1, 4, 18, 1, true), composeMatrix(0, 2, 0), 0xffffff);
  B.geo(new THREE.ConeGeometry(1.02, 0.6, 18, 1, true), composeMatrix(0, 4.3, 0), 0x8a9a7c);
  B.geo(new THREE.CylinderGeometry(1.01, 1.01, 0.15, 18, 1, true), composeMatrix(0, 3.95, 0), 0xa8a8a0);
  return B.build();
}

export function towerSiloGeometry() {
  const B = new GeoBuilder();
  B.geo(new THREE.CylinderGeometry(3, 3, 15, 16, 1, true), composeMatrix(0, 7.5, 0), 0xffffff);
  B.geo(new THREE.SphereGeometry(3.05, 16, 4, 0, Math.PI * 2, 0, Math.PI / 2), composeMatrix(0, 15, 0), 0xd8d8d8);
  B.box(0, 7.5, 3.05, 0.5, 15, 0.12, 0x333333);
  B.box(0, 0.4, 0, 6.4, 0.8, 6.4, 0x9a968c);
  return B.build();
}

export function feedSiloGeometry() {
  const B = new GeoBuilder();
  for (const [x, z] of [[-0.8, -0.8], [0.8, -0.8], [0.8, 0.8], [-0.8, 0.8]]) B.box(x, 1.4, z, 0.12, 2.8, 0.12, 0x8a8e90);
  B.geo(new THREE.ConeGeometry(1.15, 1.4, 12, 1, true).rotateX(Math.PI), composeMatrix(0, 2.6, 0), 0xffffff);
  B.geo(new THREE.CylinderGeometry(1.15, 1.15, 5.5, 12, 1, true), composeMatrix(0, 6.05, 0), 0xffffff);
  B.geo(new THREE.ConeGeometry(1.18, 0.9, 12), composeMatrix(0, 9.25, 0), 0xdadada);
  B.geo(tubeGeometry([0.9, 1.9, 0], [0.9, 9.3, 0], 0.09, 0.09, 4), null, 0x5a5e60);
  return B.build();
}

// Sleufsilo: two concrete walls, a black-sheeted grass clamp, old tyres.
export function clampGeometry() {
  const B = new GeoBuilder();
  for (const s of [-1, 1]) B.box(0, 1.1, s * 5.2, 36, 2.2, 0.35, 0xa8a49a);
  B.box(-17.8, 1.1, 0, 0.35, 2.2, 10.7, 0xa8a49a);
  const P = 0x1e1f1e;
  B.quadOut([-17.5, 0.2, 5], [17.8, 0.2, 5], [17.8, 2.6, 0], [-17.5, 2.9, 0], [0, 1, 1], P);
  B.quadOut([-17.5, 0.2, -5], [-17.5, 2.9, 0], [17.8, 2.6, 0], [17.8, 0.2, -5], [0, 1, -1], P);
  B.triOut([17.8, 0.2, 5], [17.8, 0.2, -5], [17.8, 2.6, 0], [1, 0, 0], P);
  for (let i = 0; i < 26; i++) {
    const x = -16 + (i % 13) * 2.6, s = i < 13 ? 1 : -1, z = s * (1.2 + chash(i, 4) * 2.5);
    const y = 2.9 - (Math.abs(z) / 5) * 2.6;
    B.geo(new THREE.CylinderGeometry(0.45, 0.45, 0.2, 8), composeMatrix(x, y + 0.1, z, s * 0.45, 0, 0), 0x2c2c2c);
  }
  return B.build();
}

// Tractor (+X forward): the painted parts as one geometry for tinting, the
// wheels, glass and exhaust as another sharing the same matrix.
export function tractorBodyGeometry() {
  const B = new GeoBuilder();
  const W = 0xffffff;
  B.box(1.05, 1.15, 0, 2.1, 0.8, 0.95, W);
  B.box(-0.8, 0.95, 0, 1.8, 0.5, 1.1, W);
  B.box(-0.75, 2.95, 0, 1.95, 0.12, 1.6, W);
  for (const s of [-1, 1]) {
    B.box(-1.1, 1.75, s * 0.95, 1.8, 0.1, 0.55, W);
    B.box(1.3, 1.1, s * 0.62, 0.9, 0.08, 0.3, W);
  }
  return B.build();
}
export function tractorBaseGeometry() {
  const B = new GeoBuilder();
  const T = 0x1d1d1d, RIM = 0xc9b25a, GL = 0x3a4a52, F = 0x2a2a2a;
  for (const s of [-1, 1]) {
    B.geo(new THREE.CylinderGeometry(0.85, 0.85, 0.55, 12).rotateX(Math.PI / 2), composeMatrix(-1.1, 0.85, s * 0.95), T);
    B.geo(new THREE.CylinderGeometry(0.5, 0.5, 0.57, 10).rotateX(Math.PI / 2), composeMatrix(-1.1, 0.85, s * 0.95), RIM);
    B.geo(new THREE.CylinderGeometry(0.5, 0.5, 0.35, 10).rotateX(Math.PI / 2), composeMatrix(1.35, 0.5, s * 0.72), T);
    B.geo(new THREE.CylinderGeometry(0.28, 0.28, 0.37, 8).rotateX(Math.PI / 2), composeMatrix(1.35, 0.5, s * 0.72), RIM);
  }
  B.box(-0.75, 2.2, 0, 1.6, 1.4, 1.4, GL);
  for (const [x, z] of [[-1.55, -0.72], [-1.55, 0.72], [0.05, -0.72], [0.05, 0.72]]) B.box(x, 2.2, z, 0.08, 1.45, 0.08, F);
  B.geo(tubeGeometry([0.6, 1.5, 0.35], [0.6, 2.8, 0.35], 0.06, 0.05, 5), null, F);
  B.box(2.12, 1.1, 0, 0.06, 0.5, 0.8, 0x2a2a2a);
  return B.build();
}

export function trailerBodyGeometry() {
  const B = new GeoBuilder();
  B.box(0, 1.65, 0, 5.4, 1.1, 2.3, 0xffffff);
  B.box(0, 1.08, 0, 5.5, 0.1, 2.4, 0xdddddd);
  return B.build();
}
export function trailerBaseGeometry() {
  const B = new GeoBuilder();
  for (const x of [-1.2, 0.2]) for (const s of [-1, 1]) {
    B.geo(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 10).rotateX(Math.PI / 2), composeMatrix(x, 0.55, s * 1.0), 0x1d1d1d);
  }
  B.geo(tubeGeometry([2.7, 0.9, 0], [4.0, 0.6, 0], 0.08, 0.08, 4), null, 0x2a2a2a);
  B.box(-0.5, 0.95, 0, 5, 0.18, 1.2, 0x3a3a3a);
  return B.build();
}

export function ploughGeometry() {
  const B = new GeoBuilder();
  B.geo(tubeGeometry([-2.2, 0.8, -1.2], [2.2, 0.8, 1.2], 0.1, 0.1, 4), null, 0xffffff);
  for (let i = 0; i < 4; i++) {
    const t = -1.6 + i * 1.05;
    B.box(t, 0.45, t * 0.55, 0.12, 0.7, 0.12, 0xffffff);
    B.box(t + 0.25, 0.25, t * 0.55 + 0.25, 0.8, 0.45, 0.08, 0x8a8e90, 0, 0, -0.7, 0);
  }
  B.geo(new THREE.CylinderGeometry(0.35, 0.35, 0.18, 10).rotateX(Math.PI / 2), composeMatrix(2.0, 0.35, 1.5), 0x1d1d1d);
  B.box(2.6, 0.9, 1.3, 0.8, 0.9, 0.12, 0xffffff);
  return B.build();
}

// ------------------------------------------------------------------ village

export const HOUSE_LOOKS = [
  { brick: 0x8f4634, roof: 0x3e4449, trim: 0xece8de, door: 0x2f4a3a },
  { brick: 0x7a3a2c, roof: 0x9a4a30, trim: 0xece8de, door: 0x6b2a24 },
];

// kind 0: arbeiderswoning, 1: tall gable house, 2: plastered villa, 3: semi.
export function houseGeometry(kind, L) {
  const B = new GeoBuilder();
  if (kind === 0) {
    B.box(0, 1.5, 0, 7, 3, 9, L.brick);
    gableRoofZ(B, -3.5, 3.5, 4.5, 3, 7.6, L.roof, L.brick);
    for (const z of [-2.6, 2.6]) windowAt(B, -3.5, 1.6, z, -1, 0, 1.2, 1.3, L);
    B.box(-3.58, 1.1, 0, 0.18, 2.2, 1.0, L.door);
    B.box(-2.3, 5.3, 0, 1.4, 1.2, 1.8, L.roof);
    windowAt(B, -3.02, 5.25, 0, -1, 0, 1.1, 0.8, L);
    B.box(1.5, 7.4, 2.6, 0.6, 1.4, 0.6, 0x6e3a2c);
  } else if (kind === 1) {
    B.box(0, 3, 0, 9, 6, 8, L.brick);
    gableRoofX(B, -4.5, 4.5, 4, 6, 10.4, L.roof, L.brick);
    for (const y of [1.6, 4.3]) for (const z of [-2.2, 2.2]) windowAt(B, -4.5, y, z, -1, 0, 1.2, 1.5, L);
    windowAt(B, -4.5, 7.3, 0, -1, 0, 0.9, 1.1, L);
    B.box(-4.58, 1.1, 0, 0.18, 2.2, 1.0, L.door);
  } else if (kind === 2) {
    const P = { ...L, trim: 0x3a3e3a };
    B.box(0, 2.1, 0, 9, 4.2, 10, 0xe8e4da);
    hipRoof(B, -4.5, 4.5, 5, 4.2, 8.4, 3, L.roof, 0, 0.6);
    for (const z of [-3.2, 3.2]) windowAt(B, -4.5, 2, z, -1, 0, 1.5, 1.7, P);
    B.box(-4.58, 1.2, 0, 0.18, 2.4, 1.1, L.door);
    B.box(-5.2, 2.8, 0, 1.4, 0.15, 2.4, 0x3a3e3a);
    B.box(1.5, 8.2, -2, 0.7, 1.4, 0.7, 0x8f4634);
  } else {
    B.box(0, 1.6, 0, 8, 3.2, 14, L.brick);
    gableRoofZ(B, -4, 4, 7, 3.2, 8, L.roof, L.brick);
    for (const s of [-1, 1]) {
      windowAt(B, -4, 1.6, s * 4.8, -1, 0, 1.4, 1.3, L);
      B.box(-4.08, 1.1, s * 1.8, 0.18, 2.2, 1.0, L.door);
    }
    B.box(0.3, 7.6, 0, 0.7, 1.4, 1.2, 0x6e3a2c);
  }
  return B.build();
}

// Wierde top: a low grassy truncated cone round the church.
export const TERP_H = 1.7;
export function moundGeometry() {
  const B = new GeoBuilder();
  const g = new THREE.CylinderGeometry(17, 23.5, TERP_H, 24, 1, false);
  B.geo(g, composeMatrix(0, TERP_H / 2 - 0.05, 0), (x, y, z) => (y > TERP_H - 0.2 ? 0x587e3a : chash(Math.round(x), Math.round(z)) < 0.5 ? 0x4f7434 : 0x557a38));
  return B.build();
}

export function graveGeometry() {
  const B = new GeoBuilder();
  B.box(0, 0.42, 0, 0.12, 0.84, 0.55, 0x8e8e8a);
  B.box(-0.55, 0.05, 0, 1.0, 0.1, 0.5, 0x6a6a64);
  return B.build();
}

// Romanesque brick church on the terp, tower to the west (-X). variant 0:
// Groningen saddle-roof tower, 1: needle spire, 2: cruciform with a spire
// over the crossing, 3: small zaalkerk with a roof turret (dakruiter).
// CHURCH_SPAN: [x0, x1, width] of each variant's footprint, to fit it to
// the OSM outline.
export const CHURCH_SPAN = [[-14.2, 17.5, 11], [-14.2, 17.5, 11], [-14.2, 19, 21], [-8.4, 10.6, 9]];
// The walls are painted by the facade material (countrybuilding.js): brick
// in metres everywhere, the nave's round-arched windows from its part id
// (PART.churchNave + 0: variants 0/1, 1: cruciform, 2: zaalkerk).
export function churchGeometry(variant) {
  if (variant === 2) return churchParts(cruciformChurchGeometry(), 1, -10, 12, 10, 5.5);
  if (variant === 3) return churchParts(chapelGeometry(), 2, -8, 10, 6.8, 4.5);
  return churchParts(churchBody(variant), 0, -8, 12, 8, 5.5);
}

// Part ids: the nave's long walls (x0..x1, up to top, at z = +-hz) get the
// windows, every other brick-red upright face the brick only.
function churchParts(geo, w, x0, x1, top, hz) {
  const c = geo.attributes.color;
  let i = -1;
  return withParts(geo, (x, y, z, nx, ny, nz) => {
    i++;
    const r = c.getX(i), g = c.getY(i);
    if (Math.abs(ny) > 0.3 || r < 0.08 || g > r * 0.45) return PART.plain;
    if (Math.abs(nz) > 0.9 && Math.abs(Math.abs(z) - hz) < 0.05 && x > x0 - 0.05 && x < x1 + 0.05 && y < top + 0.05) return PART.churchNave + w;
    return PART.churchBrick;
  });
}

function churchBody(variant) {
  const B = new GeoBuilder();
  const BR = 0x8a4a36, ROOF = variant ? 0x3e4449 : 0x9a4a30, TR = 0xe8e0d0;
  B.box(2, 4, 0, 20, 8, 11, BR);
  gableRoofX(B, -8, 12, 5.5, 8, 14.5, ROOF, BR);
  B.geo(new THREE.CylinderGeometry(5.5, 5.5, 7, 8, 1, false, 0, Math.PI).rotateY(Math.PI / 2), composeMatrix(12, 3.5, 0), BR);
  B.geo(new THREE.ConeGeometry(5.8, 4.5, 8, 1, true, 0, Math.PI).rotateY(Math.PI / 2), composeMatrix(12, 9.25, 0), ROOF);
  B.box(-11, 11, 0, 6.4, 22, 6.4, BR);
  for (const s of [-1, 1]) {
    B.box(-11, 18.5, s * 3.22, 1.6, 2.8, 0.1, 0x1e2226);
    B.box(-11 + s * 3.22, 18.5, 0, 0.1, 2.8, 1.6, 0x1e2226);
  }
  B.box(-14.22, 15, 0, 0.1, 1.6, 1.6, TR);
  B.box(-14.25, 2, 0, 0.14, 4, 2, 0x3a2a22);
  if (!variant) {
    gableRoofZ(B, -14.2, -7.8, 3.2, 22, 29, ROOF, BR);
  } else {
    B.geo(new THREE.ConeGeometry(4.2, 16, 8, 1, true).rotateY(Math.PI / 8), composeMatrix(-11, 30, 0), ROOF);
    B.box(-11, 38.6, 0, 0.12, 1.4, 0.12, 0xc9a227);
    B.box(-11, 39.1, 0, 0.12, 0.12, 0.8, 0xc9a227);
  }
  return B.build();
}

function cruciformChurchGeometry() {
  const B = new GeoBuilder();
  const BR = 0x84462f, ROOF = 0x3e4449, TR = 0xe8e0d0;
  B.box(1, 5, 0, 22, 10, 11, BR);
  gableRoofX(B, -10, 12, 5.5, 10, 16.5, ROOF, BR);
  B.box(7, 5, 0, 7, 10, 21, BR);
  gableRoofZ(B, 3.5, 10.5, 10.5, 10, 16.5, ROOF, BR);
  B.geo(new THREE.CylinderGeometry(5.5, 5.5, 9, 8, 1, false, 0, Math.PI).rotateY(Math.PI / 2), composeMatrix(12, 4.5, 0), BR);
  B.geo(new THREE.ConeGeometry(5.8, 4.5, 8, 1, true, 0, Math.PI).rotateY(Math.PI / 2), composeMatrix(12, 11.25, 0), ROOF);
  for (const s of [-1, 1]) B.geo(new THREE.CircleGeometry(1.6, 12), composeMatrix(7, 7.2, s * 10.53, 0, s > 0 ? 0 : Math.PI, 0), 0x2a3236);
  // crossing flèche
  B.box(7, 17.2, 0, 2.2, 2.4, 2.2, ROOF);
  B.geo(new THREE.ConeGeometry(1.6, 9, 8).rotateY(Math.PI / 8), composeMatrix(7, 22.9, 0), ROOF);
  // west tower with a spire
  B.box(-11.2, 13, 0, 6, 26, 6, BR);
  for (const s of [-1, 1]) { B.box(-11.2, 22, s * 3.02, 1.4, 2.6, 0.1, 0x1e2226); B.box(-11.2 + s * 3.02, 22, 0, 0.1, 2.6, 1.4, 0x1e2226); }
  B.box(-14.25, 18, 0, 0.1, 1.5, 1.5, TR);
  B.box(-14.25, 2.2, 0, 0.14, 4.4, 2.2, 0x3a2a22);
  B.geo(new THREE.ConeGeometry(4.1, 15, 8, 1, true).rotateY(Math.PI / 8), composeMatrix(-11.2, 33.5, 0), ROOF);
  B.box(-11.2, 41.6, 0, 0.12, 1.4, 0.12, 0xc9a227);
  return B.build();
}

function chapelGeometry() {
  const B = new GeoBuilder();
  const BR = 0x9a5a40, ROOF = 0x9a4a30, W = 0xece6da;
  B.box(1, 3.4, 0, 18, 6.8, 9, BR);
  gableRoofX(B, -8, 10, 4.5, 6.8, 12, ROOF, BR);
  B.box(-8.05, 1.3, 0, 0.14, 2.6, 1.6, 0x3a2a22);
  B.geo(new THREE.CircleGeometry(0.9, 10), composeMatrix(-8.06, 7.8, 0, 0, -Math.PI / 2, 0), 0x2a3236);
  // dakruiter on the west end of the ridge
  B.box(-5.5, 12.4, 0, 1.5, 1.8, 1.5, W);
  B.box(-5.5, 12.6, 0, 1.56, 0.9, 0.9, 0x2a2e30);
  B.geo(new THREE.ConeGeometry(1.15, 4.2, 8).rotateY(Math.PI / 8), composeMatrix(-5.5, 15.4, 0), 0x3e4449);
  B.box(-5.5, 17.8, 0, 0.1, 1.0, 0.1, 0xc9a227);
  return B.build();
}

// ------------------------------------------------------------------ skyline

export const TURBINE_HUB = 85;
export function turbineTowerGeometry() {
  const B = new GeoBuilder();
  const W = 0xe8eae8;
  B.geo(new THREE.CylinderGeometry(1.25, 2.2, TURBINE_HUB - 1.5, 12, 1, true), composeMatrix(0, (TURBINE_HUB - 1.5) / 2, 0), W);
  B.geo(new THREE.CylinderGeometry(2.25, 2.3, 1.2, 12), composeMatrix(0, 0.6, 0), 0x9aa09a);
  B.box(-2.25, 1.4, 0, 0.12, 2.2, 1.0, 0x6a706c);
  B.geo(new THREE.CylinderGeometry(1.7, 1.9, 10.2, 8).rotateZ(Math.PI / 2), composeMatrix(1.9, TURBINE_HUB + 0.4, 0), W);
  B.box(6.9, TURBINE_HUB + 2.0, 0, 0.8, 0.6, 1.2, 0x8a8e8a);
  return B.build();
}

// Rotor: hub and three blades in the local YZ plane (spins about X).
export function turbineRotorGeometry() {
  const B = new GeoBuilder();
  const W = 0xeef0ee;
  B.geo(new THREE.ConeGeometry(1.6, 3.2, 10).rotateZ(Math.PI / 2), composeMatrix(-1.6, 0, 0), W);
  const L = 48;
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    const blade = new GeoBuilder();
    const root = 1.8, tip = 0.35;
    blade.quadOut([0, 1.2, -root], [0, 1.2, root * 0.6], [0.05, L, tip * 0.5], [0.05, L, -tip], [-1, 0, 0], W);
    blade.quadOut([0.35, 1.2, -root], [0.05, L, -tip], [0.05, L, tip * 0.5], [0.35, 1.2, root * 0.6], [1, 0, 0], W);
    blade.quadOut([0, 1.2, root * 0.6], [0.35, 1.2, root * 0.6], [0.05, L, tip * 0.5], [0.05, L, tip * 0.5], [0, 0, 1], W);
    const g = blade.build();
    B.geo(g, new THREE.Matrix4().makeRotationX(a), W);
  }
  return B.build();
}

export function lightGeometry() {
  const B = new GeoBuilder();
  B.box(0, 0, 0, 0.7, 0.5, 0.7, 0xff2a1a);
  return B.build();
}

// Poldermolen (grondzeiler): brick base, thatched octagonal body, cap.
export const MILL_AXLE = [-3.4, 14.4, 0];
export function millBodyGeometry() {
  const B = new GeoBuilder();
  const TH = leafShade([0x5a5042, 0x62584a, 0x544a3e]);
  B.geo(loftGeometry([{ y: 0, d: 5, w: 5 }, { y: 1.4, d: 4.9, w: 4.9 }], 8), null, 0x7a3a2c);
  B.geo(new THREE.CircleGeometry(4.9, 8).rotateX(-Math.PI / 2), composeMatrix(0, 1.4, 0), 0x7a3a2c);
  B.geo(loftGeometry([{ y: 1.4, d: 4.6, w: 4.6 }, { y: 13.2, d: 2.6, w: 2.6 }], 8), null, TH);
  B.box(-4.7, 0.9, 0, 0.2, 1.8, 1.1, 0x2f4a3a);
  B.box(-3.5, 7, 0, 0.2, 0.9, 0.7, 0xece8de);
  B.box(-0.2, 14.2, 0, 5.4, 2.2, 3.8, 0x4a4038);
  B.geo(new THREE.CylinderGeometry(0.01, 2.0, 1.4, 4, 1).rotateY(Math.PI / 4), composeMatrix(-0.2, 16, 0, 0, 0, 0, 1.4, 1, 1), 0x3e362e);
  B.geo(tubeGeometry([0.8, 14.4, 0], [-3.3, 14.4, 0], 0.35, 0.3, 6), null, 0x3a3a3a);
  B.geo(tubeGeometry([2.2, 14, 0], [6.5, 1.2, 0], 0.18, 0.15, 4), null, 0x4a3a2a);
  B.geo(tubeGeometry([6.5, 1.2, -1.2], [6.5, 1.2, 1.2], 0.18, 0.18, 4), null, 0x4a3a2a);
  return B.build();
}

export function millSailsGeometry() {
  const B = new GeoBuilder();
  const STOCK = 0x2e2a26, RAIL = 0xe8e4d8, BAR = 0x8a2a24;
  for (let k = 0; k < 4; k++) {
    const m = new THREE.Matrix4().makeRotationX((k / 4) * Math.PI * 2);
    const A = new GeoBuilder();
    A.box(0, 6.2, 0, 0.3, 12.4, 0.35, STOCK);
    for (const z of [0.25, 2.1]) A.box(0.1, 7.2, z, 0.1, 10.4, 0.1, RAIL);
    for (let i = 0; i < 9; i++) A.box(0.1, 2.4 + i * 1.18, 1.18, 0.07, 0.07, 1.9, BAR);
    A.box(0.1, 7.2, -0.3, 0.06, 10.4, 0.5, RAIL);
    B.geo(A.build(), m, 0xffffff);
  }
  return B.build();
}

// Hoogspanningsmast: lattice approximated by slim corner members, cross
// bracing and two arms. The line runs along local X.
export const PYLON_ARMS = [[32, 6.8], [40, 5.4]];
export function pylonGeometry() {
  const B = new GeoBuilder();
  const S = 0x8a9096;
  const corner = (y) => {
    const w = y < 30 ? 3.8 - (y / 30) * 2.8 : 1.0;
    return w;
  };
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    B.geo(tubeGeometry([sx * 3.8, 0, sz * 3.8], [sx * 1.0, 30, sz * 1.0], 0.14, 0.1, 4), null, S);
    B.geo(tubeGeometry([sx * 1.0, 30, sz * 1.0], [sx * 0.7, 44, sz * 0.7], 0.1, 0.08, 4), null, S);
  }
  for (let y = 4; y < 30; y += 6.5) {
    const w0 = corner(y), w1 = corner(y + 6.5);
    for (const s of [-1, 1]) {
      B.geo(tubeGeometry([-w0, y, s * w0], [w1, y + 6.5, s * w1], 0.05, 0.05, 3), null, S);
      B.geo(tubeGeometry([s * w0, y, -w0], [s * w1, y + 6.5, w1], 0.05, 0.05, 3), null, S);
    }
  }
  for (const [y, half] of PYLON_ARMS) {
    B.box(0, y, 0, 1.2, 0.35, half * 2 + 0.4, S);
    B.geo(tubeGeometry([0, y + 2.5, 0.8], [0, y, half], 0.06, 0.06, 3), null, S);
    B.geo(tubeGeometry([0, y + 2.5, -0.8], [0, y, -half], 0.06, 0.06, 3), null, S);
    for (const s of [-1, 1]) B.box(0, y - 1.1, s * half, 0.14, 2.0, 0.14, 0xb8c0c4);
  }
  B.geo(new THREE.ConeGeometry(0.7, 3, 4), composeMatrix(0, 45.5, 0), S);
  return B.build();
}

export function wireGeometry() {
  const B = new GeoBuilder();
  B.box(0, 0, 0, 1, 0.07, 0.07, 0x34373a);
  return B.build();
}

// Gas production site (no branding): fenced gravel yard with wellheads,
// separators, a tank, pipe racks and a portacabin. Front (gate) at x = 0.
export function gasSiteGeometry() {
  const B = new GeoBuilder();
  const L = 56, H = 20, FENCE = 0x3f5a44, GR = 0xa39c8c, PIPE = 0xb8bcbc, YEL = 0xd6b43a, RED = 0xb8322a;
  B.box(L / 2, 0.04, 0, L, 0.08, H * 2, GR);
  const fence = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 3));
    for (let i = 0; i <= n; i++) B.box(x0 + ((x1 - x0) * i) / n, 1.1, z0 + ((z1 - z0) * i) / n, 0.08, 2.2, 0.08, FENCE);
    const ang = Math.atan2(z1 - z0, x1 - x0);
    B.box((x0 + x1) / 2, 1.15, (z0 + z1) / 2, len, 1.9, 0.03, 0x4a5e4e, 0, 0, -ang, 0);
  };
  fence(0.5, -H + 0.5, L - 0.5, -H + 0.5);
  fence(0.5, H - 0.5, L - 0.5, H - 0.5);
  fence(L - 0.5, -H + 0.5, L - 0.5, H - 0.5);
  fence(0.5, -H + 0.5, 0.5, -3);
  fence(0.5, 3, 0.5, H - 0.5);
  for (let i = 0; i < 3; i++) {
    const x = 16 + i * 9, z = -9;
    B.box(x, 0.3, z, 2.2, 0.6, 2.2, 0x8a8a84);
    B.geo(tubeGeometry([x, 0.6, z], [x, 2.6, z], 0.18, 0.18, 6), null, PIPE);
    for (const y of [1.1, 1.9]) B.geo(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 8), composeMatrix(x, y, z), i === 1 ? YEL : RED);
    B.geo(tubeGeometry([x, 1.5, z], [x + 0.9, 1.5, z], 0.1, 0.1, 5), null, PIPE);
    B.geo(new THREE.CylinderGeometry(0.22, 0.22, 0.35, 8).rotateZ(Math.PI / 2), composeMatrix(x + 1.0, 1.5, z), YEL);
    B.geo(tubeGeometry([x + 0.9, 1.5, z], [x + 0.9, 1.5, 2], 0.12, 0.12, 5), null, YEL);
  }
  B.geo(tubeGeometry([10, 1.5, 2], [48, 1.5, 2], 0.2, 0.2, 6), null, YEL);
  B.geo(tubeGeometry([10, 2.2, 2.6], [48, 2.2, 2.6], 0.14, 0.14, 6), null, PIPE);
  for (let x = 12; x <= 46; x += 6) {
    for (const s of [-1, 1]) B.box(x, 1.25, 2.3 + s * 0.9, 0.12, 2.5, 0.12, 0x6a6e6e);
    B.box(x, 2.45, 2.3, 0.14, 0.12, 2.0, 0x6a6e6e);
  }
  for (const z of [8, 13]) {
    B.geo(new THREE.CylinderGeometry(1.2, 1.2, 8, 12).rotateZ(Math.PI / 2), composeMatrix(34, 2.0, z), 0xe4e6e2);
    for (const x of [31, 37]) B.box(x, 0.5, z, 0.4, 1.0, 2.0, 0x6a6e6e);
  }
  B.geo(new THREE.CylinderGeometry(2.4, 2.4, 6, 14), composeMatrix(47, 3, 11), 0xe4e6e2);
  B.geo(new THREE.ConeGeometry(2.45, 0.6, 14), composeMatrix(47, 6.3, 11), 0xc8cac6);
  B.box(8, 1.5, 12, 6, 3, 3, 0x6f7a6c);
  windowAt(B, 5, 1.8, 12, -1, 0, 1.2, 0.9, { trim: 0xdadada });
  B.box(8, 3.05, 12, 6.2, 0.12, 3.2, 0x4a4e4a);
  B.box(-0.3, 1.2, -4.5, 0.1, 0.8, 1.4, 0xece8de);
  B.box(-0.3, 0.6, -4.5, 0.1, 1.2, 0.1, 0x8a8e90);
  return B.build();
}

// Tall slim vent stack of the gas site, painted in red and white bands.
export function flareGeometry() {
  const B = new GeoBuilder();
  for (let i = 0; i < 7; i++) {
    B.geo(new THREE.CylinderGeometry(0.42, 0.48, 3.6, 8, 1, true), composeMatrix(0, 1.8 + i * 3.6, 0), i % 2 ? 0xe8e6e0 : 0xb8322a);
  }
  B.geo(new THREE.CylinderGeometry(0.6, 0.6, 0.5, 8), composeMatrix(0, 25.4, 0), 0x5a5e60);
  for (const [x, z] of [[1.6, 0], [-0.8, 1.4], [-0.8, -1.4]]) B.geo(tubeGeometry([0, 18, 0], [x * 5, 0, z * 5], 0.03, 0.03, 3), null, 0x8a8e90);
  return B.build();
}

// Tree belt: a unit-length (along X) row of lumpy crowns, scaled per row.
export function beltGeometry() {
  const B = new GeoBuilder();
  const leaves = leafShade([0x3a5f2e, 0x44683a, 0x3e6232]);
  for (let i = 0; i < 12; i++) {
    const x = -0.46 + i * (0.92 / 11);
    const h = 0.62 + (chash(i, 5) - 0.5) * 0.2;
    B.geo(new THREE.IcosahedronGeometry(1, 0), composeMatrix(x, h, (chash(i, 9) - 0.5) * 0.3, 0, i, 0, 0.07, 0.36 + chash(i, 2) * 0.1, 0.5), leaves);
  }
  B.box(0, 0.16, 0, 1, 0.32, 0.12, 0x4a3e30);
  return B.build();
}

// Distant farmstead: a barn with its big hipped roof (unit-ish size).
export function farmSilhouetteGeometry() {
  const B = new GeoBuilder();
  B.box(25, 1.8, 0, 50, 3.6, 24, 0x8a5a48);
  hipRoof(B, 0, 50, 12, 3.6, 15, 8, 0xffffff);
  return B.build();
}

// Blob cluster for village / farm tree clumps (unit radius and height).
export function clumpGeometry() {
  const B = new GeoBuilder();
  const leaves = leafShade([0x3a5f2e, 0x44683a, 0x3e6232]);
  for (const [x, y, z, s] of [[0, 0.62, 0, 0.55], [0.45, 0.5, 0.25, 0.42], [-0.4, 0.52, -0.3, 0.45], [0.1, 0.48, -0.5, 0.38], [-0.3, 0.45, 0.48, 0.4]]) {
    B.geo(new THREE.IcosahedronGeometry(1, 0), composeMatrix(x, y, z, 0, x * 5, 0, s, s * 0.9, s), leaves);
  }
  return B.build();
}

// Bridge deck over a maar, spanning local X (road runs along X).
export function bridgeGeometry() {
  const B = new GeoBuilder();
  B.box(0, -0.2, 0, 11, 0.5, 6.2, 0x8e8c86);
  B.box(0, 0.06, 0, 11, 0.02, 5, 0x4a4a4c);
  for (const s of [-1, 1]) {
    B.box(0, 0.12, s * 2.85, 11, 0.24, 0.5, 0xa8a69e);
    for (let x = -5; x <= 5; x += 1.25) B.box(x, 0.65, s * 2.95, 0.1, 1.0, 0.1, 0xe8e8e2);
    B.box(0, 1.15, s * 2.95, 11, 0.1, 0.14, 0xe8e8e2);
    B.box(0, 0.7, s * 2.95, 11, 0.06, 0.06, 0xe8e8e2);
  }
  return B.build();
}

// ------------------------------------------------------------------ fringe

// Kas / tuinkas: small greenhouse on an allotment (unit-ish footprint).
export function greenhouseGeometry() {
  const B = new GeoBuilder();
  B.box(0, 0.9, 0, 1, 1.8, 1, 0xcfe0d8);
  const o = 0.02;
  B.quadOut([-0.5 - o, 1.8, 0.5 + o], [0.5 + o, 1.8, 0.5 + o], [0.5 + o, 2.4, 0], [-0.5 - o, 2.4, 0], [0, 1, 1], 0xdcebe4);
  B.quadOut([-0.5 - o, 1.8, -0.5 - o], [-0.5 - o, 2.4, 0], [0.5 + o, 2.4, 0], [0.5 + o, 1.8, -0.5 - o], [0, 1, -1], 0xdcebe4);
  for (const x of [-0.5, 0, 0.5]) B.box(x, 1.2, 0, 0.03, 2.4, 1.02, 0x8a9a90);
  return B.build();
}

// Sports club canteen with a flat roof and a little veranda.
export function clubhouseGeometry() {
  const B = new GeoBuilder();
  const L = { trim: 0xece8de };
  B.box(0, 1.6, 0, 16, 3.2, 9, 0x9a5a3e);
  B.box(0, 3.35, 0, 16.6, 0.3, 9.6, 0x3a3e42);
  for (const x of [-5, -1.5, 2, 5.5]) windowAt(B, x, 1.7, -4.5, 0, -1, 2.4, 1.4, L);
  B.box(0, 2.6, -6, 14, 0.15, 3, 0x3a3e42);
  for (const x of [-6.8, 0, 6.8]) B.box(x, 1.3, -7.3, 0.14, 2.6, 0.14, 0xd8d4c8);
  B.box(-6, 5, 0, 0.1, 3.2, 0.1, 0xb8bcbc);
  B.box(-6, 6.2, 0.45, 0.02, 0.8, 0.9, 0x2a6a3a);
  return B.build();
}

export function lightMastGeometry() {
  const B = new GeoBuilder();
  B.geo(tubeGeometry([0, 0, 0], [0, 15, 0], 0.22, 0.14, 6), null, 0xa8aca8);
  B.box(0.35, 15.2, 0, 0.4, 0.8, 2.2, 0x6a6e6e);
  B.box(0.57, 15.2, 0, 0.05, 0.6, 2.0, 0xe8e8d8);
  return B.build();
}

export function goalGeometry() {
  const B = new GeoBuilder();
  const W = 0xf2f2ea;
  for (const s of [-1, 1]) {
    B.box(0, 1.22, s * 3.66, 0.12, 2.44, 0.12, W);
    B.geo(tubeGeometry([0, 2.44, s * 3.66], [-1.6, 0, s * 3.66], 0.04, 0.04, 4), null, 0xcfcfc6);
  }
  B.box(0, 2.44, 0, 0.12, 0.12, 7.44, W);
  B.box(-0.9, 1.3, 0, 0.02, 2.4, 7.3, 0xdadad2);
  return B.build();
}
