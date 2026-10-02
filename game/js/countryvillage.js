import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { REAL, RTILE, buildingsInTile, roadsInTile, buildingAt, buildingModel } from './countryreal.js';
import { chash, edgeDistance, realWater } from './countryfield.js';
import { edgeAt } from './countryedge.js';
import { GeoBuilder, vcMaterial, markShared, composeMatrix, tubeGeometry } from './pixelart3d.js';
import { roundTreeGeometry } from './countrymodels.js';
import { markInstancesDirty } from './util.js';
import { Pedestrian } from './pedestrians.js';

// Village centres for the real Ommelanden: the OSM church (drawn by the
// skyline layer) gets a brink beside it with benches, lime trees, a pump and
// a bike rack, the houses along the nearest streets become a snackbar, a
// café with a terrace, a bakker and so on, lamp posts line the streets, a
// few people stroll round the square and parked cars stand at the kerb
// (parkedcars.js asks villageKerbs). All of it is instanced per village and
// only exists while the player is near; it is laid out a step at a time.

const NEAR_IN = 260;
const NEAR_OUT = 480;
const BUILD_MS = 1.2;
const LAMP_R = 340;
const LAMP_STEP = 32;
const SHOP_R = { town: 150, village: 95, hamlet: 60 };
const SHOP_MAX = { town: 8, village: 5, hamlet: 2 };
const PED_R = 130;
const PEDS = { town: 7, village: 5, hamlet: 2 };
const CELL = 16;

const SHOPS = [
  ['SNACKBAR', "SNACKBAR 'T HOEKJE", 0xd8a020, '#b8322a'],
  ['CAFÉ', 'CAFÉ DE BRINK', 0x2e6b3a, '#24452c'],
  ['BAKKERIJ', 'WARME BAKKER', 0xb8742a, '#7a4a22'],
  ['SUPERMARKT', 'BUURTSUPER', 0x1f5fa8, '#1f4f8a'],
  ['KAPPER', 'KNIPPERIJ', 0x6a2a6a, '#4a2a5a'],
  ['FIETSEN', 'RIJWIELHANDEL', 0x2a2a2a, '#2a2a2a'],
  ['SLAGERIJ', 'KEURSLAGER', 0x9a2020, '#7a1a1a'],
  ['BLOEMEN', 'BLOEMIST', 0x3f8a3a, '#2f6a2a'],
  ['CHINEES', 'CHINEES-INDISCH', 0xb02a20, '#8a1a12'],
];
const CAFE = 1;

let V = null;

// ------------------------------------------------------------------ meshes

const MAT = markShared(vcMaterial({ roughness: 0.85 }));
const LAMP_ON = new THREE.Color(0xffd9a0), LAMP_OFF = new THREE.Color(0x8a8a80);
const LAMP_MAT = markShared(new THREE.MeshBasicMaterial({ color: LAMP_OFF.clone() }));
let signMat = null;

function signAtlas() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 64 * SHOPS.length * 2;
  const g = c.getContext('2d');
  SHOPS.forEach((s, i) => {
    for (let v = 0; v < 2; v++) {
      const y = (i * 2 + v) * 64;
      g.fillStyle = s[3];
      g.fillRect(0, y, 512, 64);
      g.strokeStyle = '#f2ead8';
      g.lineWidth = 4;
      g.strokeRect(4, y + 4, 504, 56);
      g.fillStyle = '#f7f1e2';
      g.font = 'bold 40px "Bebas Neue", Arial Narrow, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(s[v], 256, y + 34, 480);
    }
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Unit shopfront on a facade at z = 0 facing +z: x across (scaled by the
// width), y up (scaled by the storey height).
function frontGeometry(color) {
  const B = new GeoBuilder();
  B.box(0, 0.42, 0.03, 0.9, 0.5, 0.05, 0x1c2830);
  B.box(0, 0.17, 0.035, 0.92, 0.04, 0.06, 0xe8e2d4);
  B.box(0, 0.68, 0.035, 0.92, 0.03, 0.06, 0xe8e2d4);
  for (const x of [-0.46, -0.15, 0.15, 0.46]) B.box(x, 0.42, 0.04, 0.015, 0.5, 0.06, 0xe8e2d4);
  B.box(0.3, 0.33, 0.06, 0.12, 0.33, 0.03, 0x3a2a20);
  // awning
  B.geo(new THREE.BoxGeometry(0.94, 0.01, 1.1), composeMatrix(0, 0.69, 0.55, 0.11, 0, 0), color);
  B.box(0, 0.62, 1.1, 0.94, 0.04, 0.02, color);
  return B.build();
}
function signGeometry(row) {
  const B = new GeoBuilder();
  const v0 = 1 - (row + 1) / (SHOPS.length * 2), v1 = 1 - row / (SHOPS.length * 2);
  B.quadOut([-0.42, 0.79, 0.13], [0.42, 0.79, 0.13], [0.42, 0.96, 0.13], [-0.42, 0.96, 0.13], [0, 0, 1], 0xffffff, 0, [0, v0, 1, v0, 1, v1, 0, v1]);
  B.box(0, 0.875, 0.07, 0.88, 0.19, 0.11, 0x2a2420);
  return B.build();
}
function benchGeometry() {
  const B = new GeoBuilder();
  for (const z of [-0.12, 0, 0.12]) B.box(0, 0.45, z, 1.8, 0.04, 0.1, 0x8a5a32);
  B.box(0, 0.75, -0.22, 1.8, 0.24, 0.05, 0x8a5a32);
  for (const x of [-0.75, 0.75]) { B.box(x, 0.22, 0, 0.08, 0.44, 0.44, 0x2a2e30); B.box(x, 0.6, -0.22, 0.06, 0.4, 0.06, 0x2a2e30); }
  return B.build();
}
function planterGeometry() {
  const B = new GeoBuilder();
  B.box(0, 0.25, 0, 1.4, 0.5, 1.4, 0xb0aaa0);
  B.box(0, 0.52, 0, 1.25, 0.06, 1.25, 0x4a3a2a);
  const fl = [0xd83a4a, 0xf0c030, 0xe8e8f0, 0x9a5ad0];
  for (let i = 0; i < 9; i++) B.box(((i % 3) - 1) * 0.38, 0.62, (Math.floor(i / 3) - 1) * 0.38, 0.22, 0.16, 0.22, i % 2 ? 0x3f7a32 : fl[i % 4]);
  return B.build();
}
function pumpGeometry() {
  const B = new GeoBuilder();
  B.box(0, 0.15, 0, 1.2, 0.3, 1.2, 0x9a968c);
  B.geo(new THREE.CylinderGeometry(0.22, 0.28, 2.2, 8), composeMatrix(0, 1.4, 0), 0x2f4a3a);
  B.geo(new THREE.ConeGeometry(0.36, 0.5, 8), composeMatrix(0, 2.75, 0), 0x2f4a3a);
  B.geo(new THREE.SphereGeometry(0.1, 6, 4), composeMatrix(0, 3.05, 0), 0xc9a227);
  B.box(0.32, 1.3, 0, 0.5, 0.08, 0.08, 0x2f4a3a);
  return B.build();
}
function lampGeometry() {
  const B = new GeoBuilder();
  B.geo(new THREE.CylinderGeometry(0.06, 0.09, 4.6, 6), composeMatrix(0, 2.3, 0), 0x3a3e40);
  B.box(0.32, 4.55, 0, 0.7, 0.06, 0.06, 0x3a3e40);
  B.box(0.62, 4.5, 0, 0.42, 0.12, 0.24, 0x3a3e40);
  return B.build();
}
function lampHeadGeometry() {
  const B = new GeoBuilder();
  B.box(0.62, 4.42, 0, 0.36, 0.04, 0.2, 0xffffff);
  return B.build();
}
function bikeGeometry() {
  const B = new GeoBuilder();
  for (const x of [-0.5, 0.5]) B.geo(new THREE.TorusGeometry(0.33, 0.025, 4, 12), composeMatrix(x, 0.35, 0), 0x1e1e1e);
  B.geo(tubeGeometry([-0.5, 0.35, 0], [-0.05, 0.75, 0], 0.025, 0.025, 4), null, 0xffffff);
  B.geo(tubeGeometry([-0.05, 0.75, 0], [0.42, 0.78, 0], 0.025, 0.025, 4), null, 0xffffff);
  B.geo(tubeGeometry([0.42, 0.78, 0], [0.5, 0.35, 0], 0.025, 0.025, 4), null, 0xffffff);
  B.geo(tubeGeometry([-0.05, 0.75, 0], [0.05, 0.35, 0], 0.025, 0.025, 4), null, 0xffffff);
  B.box(-0.12, 0.9, 0, 0.22, 0.05, 0.1, 0x222222);
  B.box(0.4, 0.98, 0, 0.05, 0.05, 0.5, 0x2a2a2a);
  B.box(-0.55, 0.62, 0, 0.3, 0.03, 0.14, 0x2a2a2a);
  return B.build();
}
function rackGeometry() {
  const B = new GeoBuilder();
  B.box(0, 0.05, 0, 4.2, 0.1, 0.25, 0x8a8c88);
  for (let i = 0; i < 6; i++) B.box(-1.75 + i * 0.7, 0.3, 0, 0.04, 0.5, 0.04, 0x9a9c98);
  return B.build();
}
function tableGeometry() {
  const B = new GeoBuilder();
  B.geo(new THREE.CylinderGeometry(0.4, 0.4, 0.04, 10), composeMatrix(0, 0.74, 0), 0xe8e4dc);
  B.box(0, 0.37, 0, 0.06, 0.74, 0.06, 0x3a3a3a);
  for (const x of [-0.65, 0.65]) {
    B.box(x, 0.45, 0, 0.42, 0.04, 0.42, 0x6a4a2a);
    B.box(x + Math.sign(x) * 0.2, 0.68, 0, 0.04, 0.44, 0.42, 0x6a4a2a);
    for (const dx of [-0.17, 0.17]) for (const dz of [-0.17, 0.17]) B.box(x + dx, 0.22, dz, 0.03, 0.44, 0.03, 0x2a2a2a);
  }
  B.box(0, 1.3, 0, 0.04, 1.2, 0.04, 0xdddddd);
  B.geo(new THREE.ConeGeometry(1.25, 0.45, 8, 1, true), composeMatrix(0, 2.05, 0), 0xffffff);
  return B.build();
}
function slabGeometry() {
  const B = new GeoBuilder();
  B.box(0, 0.02, 0, 1, 0.04, 1, 0xffffff);
  return B.build();
}

const TYPES = {
  slab: { geo: slabGeometry, shadow: false },
  bench: { geo: benchGeometry, shadow: true },
  planter: { geo: planterGeometry, shadow: true },
  pump: { geo: pumpGeometry, shadow: true },
  tree: { geo: roundTreeGeometry, shadow: true },
  lamp: { geo: lampGeometry, shadow: true },
  lampHead: { geo: lampHeadGeometry, shadow: false, mat: 'lamp' },
  bike: { geo: bikeGeometry, shadow: false },
  rack: { geo: rackGeometry, shadow: false },
  table: { geo: tableGeometry, shadow: true },
};
SHOPS.forEach((s, i) => {
  TYPES['front' + i] = { geo: () => frontGeometry(s[2]), shadow: false };
  for (let v = 0; v < 2; v++) TYPES['sign' + i + v] = { geo: () => signGeometry(i * 2 + v), shadow: false, mat: 'sign' };
});
const geos = {};
const geoOf = (k) => geos[k] || (geos[k] = markShared(TYPES[k].geo()));

// ------------------------------------------------------------------ layout

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _c = new THREE.Color();

function put(L, type, x, y, rotY, sx = 1, sy = 1, sz = 1, color = 0xffffff, h = 0) {
  const list = L.items[type] || (L.items[type] = { m: [], c: [] });
  _e.set(0, rotY, 0);
  _q.setFromEuler(_e);
  _m.compose(_p.set(x, -0.05 + h, y), _q, _s.set(sx, sy, sz));
  for (let i = 0; i < 16; i++) list.m.push(_m.elements[i]);
  _c.set(color);
  list.c.push(_c.r, _c.g, _c.b);
}

function solid(L, x, y, r) {
  const k = Math.floor(x / CELL) * 100003 + Math.floor(y / CELL);
  let a = L.solids.get(k);
  if (!a) L.solids.set(k, (a = []));
  a.push(x, y, r);
}

// Open ground: no real building, water or road within m.
function open(x, y, m = 0.8) {
  if (buildingAt(x, y, m) >= 0 || realWater(x, y) > -1.5) return false;
  const e = edgeAt(x, y, m);
  return !e;
}

function tilesAround(x, y, r, fn) {
  for (let ty = Math.floor((y - r) / RTILE); ty <= Math.floor((y + r) / RTILE); ty++) {
    for (let tx = Math.floor((x - r) / RTILE); tx <= Math.floor((x + r) / RTILE); tx++) fn(tx, ty);
  }
}

// Nearest real road segment to (x, y) within r: { d, ax, ay, ux, uy, hw, t, len, ri, si }.
function nearestRoad(x, y, r, kinds = null) {
  let best = null;
  tilesAround(x, y, r, (tx, ty) => {
    const R = roadsInTile(tx, ty);
    if (!R) return;
    for (let k = 0; k < R.length; k += 2) {
      const rd = REAL.roads[R[k]];
      if (kinds && !kinds(rd.kind)) continue;
      const a = rd.pts[R[k + 1]], b = rd.pts[R[k + 1] + 1];
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
      const t = Math.max(0, Math.min(len, ((x - a[0]) * dx + (y - a[1]) * dy) / len));
      const d = Math.hypot(a[0] + (dx / len) * t - x, a[1] + (dy / len) * t - y) - rd.w / 2;
      if (d < r && (!best || d < best.d)) best = { d, ax: a[0], ay: a[1], ux: dx / len, uy: dy / len, hw: rd.w / 2, t, len, ri: R[k], si: R[k + 1] };
    }
  });
  return best;
}

// Where the village's heart is: the church nearest the place point, else
// the place point itself.
function centreOf(p) {
  if (p._vc) return p._vc;
  let church = null, bd = Math.max(250, p.r * 0.75);
  for (const c of REAL.churches) {
    const d = Math.hypot(c.x - p.x, c.y - p.y);
    if (d < bd) { bd = d; church = c; }
  }
  p._vc = { x: church ? church.x : p.x, y: church ? church.y : p.y, church: !!church, sq: null, kind: p.k === 'town' ? 'town' : p.k === 'hamlet' ? 'hamlet' : 'village' };
  return p._vc;
}

// A free rectangle beside the church for the brink, along the nearest street.
function* findSquare(C) {
  const W = C.kind === 'town' ? 26 : 20, D = C.kind === 'town' ? 18 : 14;
  for (const dist of [20, 28, 36, 46, 58, 72]) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + chash(Math.round(C.x), Math.round(C.y)) * 6;
      const x = C.x + Math.cos(a) * dist, y = C.y + Math.sin(a) * dist;
      if (!open(x, y, 2)) continue;
      const rd = nearestRoad(x, y, 30);
      if (!rd) continue;
      const ang = Math.atan2(rd.uy, rd.ux);
      const c = Math.cos(ang), s = Math.sin(ang);
      let ok = true;
      for (let u = -0.5; u <= 0.5 && ok; u += 0.25) for (let v = -0.5; v <= 0.5 && ok; v += 0.25) ok = open(x + c * u * W - s * v * D, y + s * u * W + c * v * D, 0.6);
      if (ok) return { x, y, ang, W, D };
    }
    yield;
  }
  return null;
}

function* layout(p) {
  const C = centreOf(p);
  const L = { place: p, C, items: {}, solids: new Map(), shops: [] };
  if (C.sq === null) C.sq = (yield* findSquare(C)) || false;
  const hv = (a, b) => chash(Math.round(p.x) + a, Math.round(p.y) + b);
  // the brink
  if (C.sq) {
    const { x, y, ang, W, D } = C.sq;
    const c = Math.cos(ang), s = Math.sin(ang);
    const at = (u, v) => [x + c * u - s * v, y + s * u + c * v];
    put(L, 'slab', x, y, -ang, W, 1, D, 0x9a5a48);
    put(L, 'slab', x, y, -ang, W - 3, 1.5, D - 3, 0xb07a62);
    const [px, py] = at(0, 0);
    put(L, 'pump', px, py, -ang);
    solid(L, px, py, 0.7);
    for (const [u, v] of [[-W / 2 + 2, -D / 2 + 2], [W / 2 - 2, -D / 2 + 2], [-W / 2 + 2, D / 2 - 2], [W / 2 - 2, D / 2 - 2]]) {
      const [tx, ty] = at(u, v);
      put(L, 'tree', tx, ty, hv(u, v) * 6, 0.8, 0.85, 0.8);
      solid(L, tx, ty, 0.35);
    }
    for (const [u, v, r] of [[-4, -D / 2 + 1.2, 0], [4, -D / 2 + 1.2, 0], [-4, D / 2 - 1.2, Math.PI], [4, D / 2 - 1.2, Math.PI]]) {
      const [bx, by] = at(u, v);
      put(L, 'bench', bx, by, -ang + r);
      solid(L, bx, by, 0.8);
    }
    for (const u of [-W / 2 + 5.5, W / 2 - 5.5]) {
      const [qx, qy] = at(u, 0);
      put(L, 'planter', qx, qy, -ang);
      solid(L, qx, qy, 0.9);
    }
    for (const [u, v] of [[-W / 2, -D / 2], [W / 2, D / 2]]) {
      const [lx, ly] = at(u, v);
      put(L, 'lamp', lx, ly, -ang);
      put(L, 'lampHead', lx, ly, -ang);
      solid(L, lx, ly, 0.15);
    }
    // a bike rack on the square's road side
    const [rx, ry] = at(0, -D / 2 + 0.4);
    put(L, 'rack', rx, ry, -ang);
    for (let i = 0; i < 6; i++) {
      if (hv(i, 7) < 0.3) continue;
      const [kx, ky] = at(-1.75 + i * 0.7, -D / 2 + 0.4);
      put(L, 'bike', kx, ky, -ang + Math.PI / 2, 1, 1, 1, [0x2a2a2a, 0x7a1e1e, 0x1e3a6a, 0xd8d8d0, 0x3a5a3a][Math.floor(hv(i, 9) * 5)]);
    }
    for (let i = -2; i <= 2; i++) { const [sx, sy] = at(i * 0.9, -D / 2 + 0.4); solid(L, sx, sy, 0.45); }
  }
  yield;
  // shops along the streets near the centre
  const R = SHOP_R[C.kind], maxShops = SHOP_MAX[C.kind];
  const cand = [];
  tilesAround(C.x, C.y, R, (tx, ty) => {
    const B = buildingsInTile(tx, ty);
    if (!B) return;
    for (const i of B) {
      const d = Math.hypot(REAL.bx[i] - C.x, REAL.by[i] - C.y);
      if (d > R) continue;
      const m = buildingModel(i);
      if ((m.kind !== 'house' && m.kind !== 'block') || m.long < 7 || m.wall < 2.9) continue;
      if (REAL.churchNear && REAL.churchNear(REAL.bx[i], REAL.by[i])) continue;
      cand.push([d, i, m]);
    }
  });
  cand.sort((a, b) => a[0] - b[0]);
  yield;
  const used = new Set();
  for (const [, i, m] of cand) {
    if (L.shops.length >= maxShops) break;
    const x = REAL.bx[i], y = REAL.by[i];
    const rd = nearestRoad(x, y, Math.max(m.long, m.short) / 2 + 14, (k) => k >= 3);
    if (!rd) continue;
    // the side of the box that faces the road
    const qx = rd.ax + rd.ux * rd.t, qy = rd.ay + rd.uy * rd.t;
    const ca = Math.cos(m.angle), sa = Math.sin(m.angle);
    const du = (qx - x) * ca + (qy - y) * sa, dv = -(qx - x) * sa + (qy - y) * ca;
    const alongLong = Math.abs(dv) / (m.short / 2) > Math.abs(du) / (m.long / 2);
    const half = alongLong ? m.short / 2 : m.long / 2, width = Math.min(alongLong ? m.long - 1 : m.short - 0.8, 9);
    if (width < 4.5) continue;
    const sgn = Math.sign(alongLong ? dv : du) || 1;
    const nx = alongLong ? -sa * sgn : ca * sgn, ny = alongLong ? ca * sgn : sa * sgn;
    const fx = x + nx * (half + 0.02), fy = y + ny * (half + 0.02);
    if (!open(fx + nx * 1.2, fy + ny * 1.2, 0.3)) continue;
    let type = Math.floor(hv(i, 3) * SHOPS.length);
    for (let k = 0; k < SHOPS.length && used.has(type); k++) type = (type + 1) % SHOPS.length;
    if (L.shops.length === 0 && C.sq) type = CAFE;
    if (L.shops.length === 1 && !used.has(0)) type = 0;
    used.add(type);
    const rot = Math.atan2(nx, ny);
    const H = Math.min(m.wall - 0.15, 3.4);
    put(L, 'front' + type, fx, fy, rot, width, H, 1);
    put(L, 'sign' + type + (hv(i, 5) < 0.5 ? 0 : 1), fx, fy, rot, width, H, 1);
    L.shops.push({ x: fx, y: fy, nx, ny, type, width });
    // bikes against the shop window, a terrace in front of the café
    const tx = ny, ty = -nx;
    for (let k = 0; k < 3; k++) {
      if (hv(i, 11 + k) < 0.45) continue;
      const bx = fx + nx * 1.6 + tx * (width / 2 - 0.6 - k * 0.75), by = fy + ny * 1.6 + ty * (width / 2 - 0.6 - k * 0.75);
      if (!open(bx, by, 0.2)) continue;
      put(L, 'bike', bx, by, rot + Math.PI / 2 + 0.15, 1, 1, 1, [0x2a2a2a, 0x7a1e1e, 0x1e3a6a, 0xd8d8d0][Math.floor(hv(i, 15 + k) * 4)]);
      solid(L, bx, by, 0.4);
    }
    if (type === CAFE) {
      for (let k = -1; k <= 1; k++) {
        const ax = fx + nx * 3.2 + tx * k * 2.6, ay = fy + ny * 3.2 + ty * k * 2.6;
        if (!open(ax, ay, 0.9)) continue;
        put(L, 'table', ax, ay, rot + Math.PI / 2, 1, 1, 1, [0xd8402a, 0xe8e2d0, 0x2e6b3a][(k + 3) % 3]);
        solid(L, ax, ay, 1.0);
      }
    }
    yield;
  }
  // lamp posts along the village streets
  const lr = Math.min(LAMP_R, Math.max(150, p.r * 0.7));
  const seen = new Set();
  let n = 0;
  const segs = [];
  tilesAround(C.x, C.y, lr, (tx, ty) => {
    const Rt = roadsInTile(tx, ty);
    if (!Rt) return;
    for (let k = 0; k < Rt.length; k += 2) {
      const key = Rt[k] * 4096 + Rt[k + 1];
      if (seen.has(key)) continue;
      seen.add(key);
      const rd = REAL.roads[Rt[k]];
      if (rd.kind < 3 || rd.bridge) continue;
      segs.push([rd, Rt[k], Rt[k + 1]]);
    }
  });
  let ns = 0;
  for (const [rd, ri, si] of segs) {
    if (++ns % 40 === 0) yield;
    const a = rd.pts[si], b = rd.pts[si + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 8) continue;
    const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
    const side = chash(ri, 77) < 0.5 ? 1 : -1;
    for (let t = (chash(ri, si) * LAMP_STEP) % LAMP_STEP + 4; t < len - 2; t += LAMP_STEP) {
      const off = rd.w / 2 + 0.9;
      const x = a[0] + ux * t - uy * off * side, y = a[1] + uy * t + ux * off * side;
      if (Math.hypot(x - C.x, y - C.y) > lr || !open(x, y, 0.3)) continue;
      const rot = Math.atan2(ux * side, uy * side);
      put(L, 'lamp', x, y, rot);
      put(L, 'lampHead', x, y, rot);
      solid(L, x, y, 0.15);
      if (++n % 40 === 0) yield;
    }
  }
  return L;
}

// ------------------------------------------------------------------ meshes

function matOf(T) {
  if (T.mat === 'lamp') return LAMP_MAT;
  if (T.mat === 'sign') return signMat || (signMat = markShared(new THREE.MeshStandardMaterial({ map: signAtlas(), roughness: 0.6, vertexColors: true })));
  return MAT;
}

// Hidden one-instance samples of each material, so the shader warm-up
// compiles them on the title screen instead of on arrival in a village.
export function villageWarmMeshes() {
  return [['bench', true], ['lampHead', false], ['sign00', false]].map(([k, shadow]) => {
    const m = new THREE.InstancedMesh(geoOf(k), matOf(TYPES[k]), 1);
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(3).fill(1), 3);
    m.castShadow = shadow;
    m.receiveShadow = true;
    m.userData.shared = true;
    return m;
  });
}

function build(L) {
  const group = new THREE.Group();
  group.name = 'village:' + L.place.n;
  group.matrixAutoUpdate = false;
  const sphere = new THREE.Sphere(new THREE.Vector3(L.C.x, 5, L.C.y), Math.max(LAMP_R, 160) + 40);
  for (const [k, it] of Object.entries(L.items)) {
    const T = TYPES[k];
    const n = it.c.length / 3;
    const mat = matOf(T);
    const mesh = new THREE.InstancedMesh(geoOf(k), mat, n);
    mesh.instanceMatrix.array.set(it.m);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(it.c), 3);
    markInstancesDirty(mesh.instanceMatrix, n);
    markInstancesDirty(mesh.instanceColor, n);
    mesh.boundingSphere = sphere;
    mesh.castShadow = T.shadow;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    mesh.userData.shared = true;
    mesh.userData.kind = 'village:' + k;
    group.add(mesh);
  }
  return group;
}

function disposeVillage(v) {
  if (v.group) {
    V.scene.remove(v.group);
    for (const m of v.group.children) m.dispose();
  }
}

// ------------------------------------------------------------------ people

function spawnPeople(world, v) {
  const C = v.L.C;
  if (!C.sq) return;
  const mine = world.pedestrians.filter((q) => q.villageOf === v.key).length;
  const want = PEDS[C.kind] - mine;
  for (let i = 0; i < want; i++) {
    const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * Math.min(C.sq.W, C.sq.D) * 0.4;
    const x = C.sq.x + Math.cos(a) * r, y = C.sq.y + Math.sin(a) * r;
    if (buildingAt(x, y, 0.3) >= 0 || realWater(x, y) > -1) continue;
    const ped = new Pedestrian(x, y, Math.random() * Math.PI * 2);
    ped.anchor = { x: C.sq.x, y: C.sq.y, r: Math.min(C.sq.W, C.sq.D) * 0.45 + 6 };
    ped.villageOf = v.key;
    world.pedestrians.push(ped);
  }
  // one at the café door, one outside the snackbar
  for (const s of v.L.shops.slice(0, 2)) {
    if (world.pedestrians.some((q) => q.villageOf === v.key && q.shopSpot === s)) continue;
    const ped = new Pedestrian(s.x + s.nx * 2.2, s.y + s.ny * 2.2, Math.atan2(-s.ny, -s.nx));
    ped.anchor = { x: s.x + s.nx * 2.4, y: s.y + s.ny * 2.4, r: 2.5 };
    ped.villageOf = v.key;
    ped.shopSpot = s;
    world.pedestrians.push(ped);
  }
}

// ------------------------------------------------------------------ entry

function init(scene) {
  V = { scene, villages: new Map(), failed: new Set(), job: null, places: REAL.places.filter((p) => p.k !== 'suburb' && p.k !== 'quarter' && p.k !== 'city' && edgeDistance(p.x, p.y) > 60) };
  window.__villages = V;
}

// Per frame from countryside.js: lay out the village the player is nearing
// (a step at a time), drop the ones left behind, light the lamps at night.
export function updateVillages(dt, world, scene) {
  if (!REAL.ready) return;
  if (!V) init(scene);
  const p = world.player;
  const t0 = performance.now();
  for (const pl of V.places) {
    const d = Math.hypot(pl.x - p.x, pl.y - p.y);
    const key = pl.n + '@' + Math.round(pl.x);
    const v = V.villages.get(key);
    if (v && d > pl.r + NEAR_OUT) {
      disposeVillage(v);
      V.villages.delete(key);
      if (V.job && V.job.key === key) V.job = null;
    } else if (!v && d < pl.r + NEAR_IN && !V.job && !V.failed.has(key)) {
      V.job = { key, place: pl, steps: layout(pl) };
    }
  }
  while (V.job && performance.now() - t0 < BUILD_MS) {
    let r;
    try { r = V.job.steps.next(); } catch (e) {
      // a village whose layout fails stays plain countryside
      console.warn('village layout failed', V.job.place.n, e && e.message);
      V.failed.add(V.job.key);
      V.job = null;
      break;
    }
    if (!r.done) continue;
    const v = { key: V.job.key, L: r.value, group: build(r.value), pedsAt: -1e9 };
    scene.add(v.group);
    V.villages.set(v.key, v);
    V.job = null;
  }
  const night = world.dayNight ? world.dayNight.night || 0 : 0;
  LAMP_MAT.color.copy(LAMP_OFF).lerp(LAMP_ON, Math.min(1, night * 1.4));
  for (const v of V.villages.values()) {
    const sq = v.L.C.sq;
    if (!sq || world.time - v.pedsAt < 20) continue;
    const d = Math.hypot(sq.x - p.x, sq.y - p.y);
    if (d < PED_R && d > 25) { v.pedsAt = world.time; spawnPeople(world, v); }
  }
}

// Benches, trees, lamp posts and racks of the built villages are solid.
export function pushOutOfVillage(obj, radius) {
  if (!V || !V.villages.size) return false;
  let hit = false;
  const gx = Math.floor(obj.x / CELL), gy = Math.floor(obj.y / CELL);
  for (const v of V.villages.values()) {
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const a = v.L.solids.get((gx + ox) * 100003 + gy + oy);
        if (!a) continue;
        for (let i = 0; i < a.length; i += 3) {
          const dx = obj.x - a[i], dy = obj.y - a[i + 1], r = a[i + 2] + radius;
          const d2 = dx * dx + dy * dy;
          if (d2 >= r * r) continue;
          const d = Math.sqrt(d2) || 1e-3;
          obj.x = a[i] + (dx / d) * r;
          obj.y = a[i + 1] + (dy / d) * r;
          hit = true;
        }
      }
    }
  }
  return hit;
}

// Kerb segments near a village centre for parkedcars.js: [{ ax, ay, ux, uy, len, hw, id }]
// of the residential streets within ~110 m, touching the box (x0, y0, size).
const kerbCache = new Map();
export function villageKerbs(x0, y0, size) {
  if (!REAL.ready) return [];
  const out = [];
  const places = V ? V.places : REAL.places.filter((p) => p.k !== 'suburb' && p.k !== 'quarter' && p.k !== 'city');
  for (const pl of places) {
    if (Math.abs(pl.x - x0 - size / 2) > 900 || Math.abs(pl.y - y0 - size / 2) > 900) continue;
    if (edgeDistance(pl.x, pl.y) < 60) continue;
    const key = pl.n + '@' + Math.round(pl.x);
    let K = kerbCache.get(key);
    if (!K) {
      const C = centreOf(pl);
      const r = C.kind === 'town' ? 130 : 100;
      K = [];
      const seen = new Set();
      tilesAround(C.x, C.y, r, (tx, ty) => {
        const Rt = roadsInTile(tx, ty);
        if (!Rt) return;
        for (let k = 0; k < Rt.length; k += 2) {
          const id = Rt[k] * 4096 + Rt[k + 1];
          if (seen.has(id)) continue;
          seen.add(id);
          const rd = REAL.roads[Rt[k]];
          if (rd.kind < 5 || rd.bridge) continue;
          const a = rd.pts[Rt[k + 1]], b = rd.pts[Rt[k + 1] + 1];
          const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
          if (len < 20 || Math.hypot((a[0] + b[0]) / 2 - C.x, (a[1] + b[1]) / 2 - C.y) > r) continue;
          K.push({ ax: a[0], ay: a[1], ux: (b[0] - a[0]) / len, uy: (b[1] - a[1]) / len, len, hw: rd.w / 2, id });
        }
      });
      kerbCache.set(key, K);
    }
    for (const k of K) {
      const bx0 = Math.min(k.ax, k.ax + k.ux * k.len) - 8, bx1 = Math.max(k.ax, k.ax + k.ux * k.len) + 8;
      const by0 = Math.min(k.ay, k.ay + k.uy * k.len) - 8, by1 = Math.max(k.ay, k.ay + k.uy * k.len) + 8;
      if (bx1 < x0 || bx0 > x0 + size || by1 < y0 || by0 > y0 + size) continue;
      out.push(k);
    }
  }
  return out;
}

// A parked car's footprint by a village kerb: clear of houses, water,
// other roads and the square's furniture.
export function villageSlotFree(x, y, angle, len, wid) {
  const c = Math.cos(angle), s = Math.sin(angle);
  for (const [lx, ly] of [[len / 2, wid / 2], [len / 2, -wid / 2], [-len / 2, wid / 2], [-len / 2, -wid / 2], [0, 0]]) {
    const px = x + lx * c - ly * s, py = y + lx * s + ly * c;
    if (buildingAt(px, py, 0.4) >= 0 || realWater(px, py) > -1.5) return false;
    const e = edgeAt(px, py, 0);
    if (e && e.kind === 'road') return false;
  }
  for (const pl of REAL.places) {
    const C = pl._vc;
    if (C && C.sq && Math.hypot(x - C.sq.x, y - C.sq.y) < Math.hypot(C.sq.W, C.sq.D) / 2 + 3) return false;
  }
  return true;
}

export function villageStats() {
  if (!V) return null;
  return { built: [...V.villages.values()].map((v) => v.L.place.n + ':' + v.L.shops.length + 'shops'), job: V.job ? V.job.place.n : null, failed: [...V.failed], places: V.places.length };
}
