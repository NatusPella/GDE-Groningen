import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { WATER_Y, setExtraWater } from './util.js';
import { COUNTRY_UNIFORMS, SHORE_RW, countryRect, rectOutside, realWater } from './countryfield.js';
import { wideWaterAt, openWater } from './countryedge.js';
import { REAL } from './countryreal.js';
import { sharedWaterMaterial } from './water3d.js';
import { setCountryClearance } from './waterindex.js';
import { applyCutMask } from './cutmask3d.js';

// The Ommeland canals, maren and lakes as the city's water: past the map
// rectangle the real open water (countryreal.js distance field, and the
// lines of the narrower canals and maren, countryedge.js) gets the
// shared water3d surface at WATER_Y over a muddy bank basin, merged per prop
// chunk (one water + one basin draw per chunk with water). The ground shader
// opens over it within uWaterNear and paints it beyond, the ditches stay
// painted. A flat bed under the open water hides streaming gaps.

const NEAR_CELL = 4, MID_CELL = 12;
const BANK_NEAR = 2, BANK_MID = 6;
const BED_Y = WATER_Y - 0.55;

// bank profile over the signed distance into the water (metres)
// (near linear, so the shoreline cut across the bank grid stays smooth)
const PROF = [[-1.5, -0.12], [SHORE_RW, WATER_Y], [SHORE_RW + 2, WATER_Y - 0.6]];
function bankY(rw) {
  if (rw <= PROF[0][0]) return PROF[0][1];
  for (let i = 1; i < PROF.length; i++) {
    const [r1, y1] = PROF[i];
    if (rw <= r1) {
      const [r0, y0] = PROF[i - 1];
      return y0 + ((y1 - y0) * (rw - r0)) / (r1 - r0);
    }
  }
  return PROF[PROF.length - 1][1];
}
// the colours of the city's grassy banks (quaywalls.js)
const C_GRASS = new THREE.Color(0x4d6a3a), C_MUD = new THREE.Color(0x5a4a36), C_DEEP = new THREE.Color(0x2f2a22);
const _c = new THREE.Color();
function bankColor(rw) {
  if (rw < SHORE_RW) return _c.copy(C_GRASS).lerp(C_MUD, Math.max(0, (rw + 0.5) / (SHORE_RW + 0.5)));
  return _c.copy(C_MUD).lerp(C_DEEP, Math.min(1, (rw - SHORE_RW) / 1.5));
}

// grid point clamped out of the map rectangle onto its nearest side
function outside(x, y, out) {
  const r = countryRect();
  const dx = r.hx - Math.abs(x - r.cx), dy = r.hy - Math.abs(y - r.cy);
  if (dx > 0 && dy > 0) {
    if (dx < dy) x = r.cx + Math.sign(x - r.cx || 1) * r.hx;
    else y = r.cy + Math.sign(y - r.cy || 1) * r.hy;
  }
  out[0] = x; out[1] = y;
}

function sampleGrid(x0, y0, n, c) {
  const rw = new Float32Array((n + 1) * (n + 1));
  let hi = -99;
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const v = openWater(x0 + i * c, y0 + j * c);
      rw[j * (n + 1) + i] = v;
      if (v > hi) hi = v;
    }
  }
  return { rw, hi };
}

const _p = [0, 0];
function surfaceGeo(x0, y0, T, c) {
  const n = Math.round(T / c), m = n + 1;
  const { rw, hi } = sampleGrid(x0, y0, n, c);
  if (hi <= 0) return null;
  const map = new Int32Array(m * m).fill(-1);
  const pos = [], edge = [], flow = [], idx = [];
  const vert = (i, j) => {
    const k = j * m + i;
    if (map[k] >= 0) return map[k];
    outside(x0 + i * c, y0 + j * c, _p);
    const v = rw[k];
    const gx = rw[j * m + Math.min(n, i + 1)] - rw[j * m + Math.max(0, i - 1)];
    const gy = rw[Math.min(n, j + 1) * m + i] - rw[Math.max(0, j - 1) * m + i];
    let tx = -gy, ty = gx;
    const l = Math.hypot(tx, ty);
    if (l < 1e-4) { tx = 1; ty = 0; } else { tx /= l; ty /= l; }
    if (tx * 0.8 + ty * 0.6 < 0) { tx = -tx; ty = -ty; }
    map[k] = pos.length / 3;
    pos.push(_p[0], 0, _p[1]);
    edge.push(Math.min(24, Math.max(0, v - SHORE_RW)));
    flow.push(tx, ty);
    return map[k];
  };
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const a = rw[j * m + i], b = rw[j * m + i + 1], d = rw[(j + 1) * m + i], e = rw[(j + 1) * m + i + 1];
      if (Math.max(a, b, d, e) <= 0) continue;
      if (rectOutside(x0 + (i + 1) * c, y0 + (j + 1) * c) <= 0 && rectOutside(x0 + i * c, y0 + j * c) <= 0
        && rectOutside(x0 + (i + 1) * c, y0 + j * c) <= 0 && rectOutside(x0 + i * c, y0 + (j + 1) * c) <= 0) continue;
      const v00 = vert(i, j), v10 = vert(i + 1, j), v01 = vert(i, j + 1), v11 = vert(i + 1, j + 1);
      if ((i + j) & 1) idx.push(v00, v11, v10, v00, v01, v11);
      else idx.push(v00, v01, v10, v10, v01, v11);
    }
  }
  if (!idx.length) return null;
  return { pos: new Float32Array(pos), edge: new Float32Array(edge), flow: new Float32Array(flow), idx };
}

function basinGeo(x0, y0, T, c) {
  const n = Math.round(T / c), m = n + 1;
  const { rw, hi } = sampleGrid(x0, y0, n, c);
  if (hi <= -1.5) return null;
  const map = new Int32Array(m * m).fill(-1);
  const pos = [], col = [], idx = [];
  const vert = (i, j) => {
    const k = j * m + i;
    if (map[k] >= 0) return map[k];
    outside(x0 + i * c, y0 + j * c, _p);
    map[k] = pos.length / 3;
    pos.push(_p[0], bankY(rw[k]), _p[1]);
    const cc = bankColor(rw[k]);
    col.push(cc.r, cc.g, cc.b);
    return map[k];
  };
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const a = rw[j * m + i], b = rw[j * m + i + 1], d = rw[(j + 1) * m + i], e = rw[(j + 1) * m + i + 1];
      if (Math.max(a, b, d, e) <= -1.5 || Math.min(a, b, d, e) >= SHORE_RW + 2) continue;
      if (rectOutside(x0 + (i + 1) * c, y0 + (j + 1) * c) <= 0 && rectOutside(x0 + i * c, y0 + j * c) <= 0
        && rectOutside(x0 + (i + 1) * c, y0 + j * c) <= 0 && rectOutside(x0 + i * c, y0 + (j + 1) * c) <= 0) continue;
      const v00 = vert(i, j), v10 = vert(i + 1, j), v01 = vert(i, j + 1), v11 = vert(i + 1, j + 1);
      idx.push(v00, v01, v10, v10, v01, v11);
    }
  }
  if (!idx.length) return null;
  return { pos: new Float32Array(pos), col: new Float32Array(col), idx };
}

// Per tile and tier, made once and kept with the tile.
function tileWater(t, T, mid) {
  const key = mid ? 'mid' : 'near';
  const cache = t.water || (t.water = {});
  if (cache[key] !== undefined) return cache[key];
  const x0 = t.tx * T, y0 = t.ty * T;
  const r = countryRect();
  const inside = Math.abs(x0 + T / 2 - r.cx) + T / 2 < r.hx && Math.abs(y0 + T / 2 - r.cy) + T / 2 < r.hy;
  let out = null;
  if (REAL.ready && !inside) {
    const s = surfaceGeo(x0, y0, T, mid ? MID_CELL : NEAR_CELL);
    if (s) out = { s, b: basinGeo(x0, y0, T, mid ? BANK_MID : BANK_NEAR) };
  }
  cache[key] = out;
  return out;
}

function merge(parts, attrs) {
  let nv = 0, ni = 0;
  for (const p of parts) { nv += p.pos.length / 3; ni += p.idx.length; }
  const geo = new THREE.BufferGeometry();
  const idx = new Uint32Array(ni);
  const arrays = {};
  for (const [name, size] of attrs) arrays[name] = new Float32Array(nv * size);
  let vo = 0, io = 0;
  for (const p of parts) {
    for (const [name, size, src] of attrs) arrays[name].set(p[src], vo * size);
    for (let k = 0; k < p.idx.length; k++) idx[io + k] = p.idx[k] + vo;
    vo += p.pos.length / 3;
    io += p.idx.length;
  }
  for (const [name, size] of attrs) geo.setAttribute(name, new THREE.BufferAttribute(arrays[name], size));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  return geo;
}

let W = null;
function init(group) {
  const bankMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), applyCutMask(new THREE.MeshBasicMaterial({ color: 0x1e2a2c }), null, true));
  bed.position.y = BED_Y;
  bed.renderOrder = 1;
  bed.visible = false;
  bed.matrixAutoUpdate = false;
  group.add(bed);
  W = { group, bankMat, bed, chunks: 0, tris: 0 };
  setExtraWater(wideWaterAt);
  setCountryClearance((x, y, d) => (d < 0 ? (rectOutside(x, y) > -3 ? openWater(x, y) - SHORE_RW : -1) : cityShoreFix(x, y, d)));
}

function dropMeshes(ch) {
  if (!ch.waterMeshes) return;
  for (const m of ch.waterMeshes) { W.group.remove(m); m.geometry.dispose(); }
  ch.waterMeshes = null;
}

// Rebuilds a prop chunk's water from its tiles (mid: per tile tier).
export function rebuildChunkWater(ch, group, T, isMid) {
  if (!W) init(group);
  dropMeshes(ch);
  const surf = [], bank = [];
  for (const t of ch.tiles) {
    const w = tileWater(t, T, isMid(t));
    if (!w) continue;
    surf.push(w.s);
    if (w.b) bank.push(w.b);
  }
  if (!surf.length) return;
  const meshes = [];
  const water = new THREE.Mesh(merge(surf, [['position', 3, 'pos'], ['aEdge', 1, 'edge'], ['aFlow', 2, 'flow']]), sharedWaterMaterial());
  water.position.y = WATER_Y;
  meshes.push(water);
  if (bank.length) {
    const geo = merge(bank, [['position', 3, 'pos'], ['color', 3, 'col']]);
    geo.computeVertexNormals();
    const basin = new THREE.Mesh(geo, W.bankMat);
    basin.receiveShadow = true;
    meshes.push(basin);
  }
  for (const m of meshes) {
    m.geometry.boundingSphere = ch.sphere.clone();
    m.userData.shared = true;
    m.userData.kind = 'country:water';
    m.updateMatrix();
    m.matrixAutoUpdate = false;
    W.group.add(m);
  }
  ch.waterMeshes = meshes;
}

export function dropChunkWater(ch) {
  if (W) dropMeshes(ch);
}

// Per frame: where the ground opens over the water, and the bed under it.
export function updateCountryWater(px, py, radius, time) {
  const u = COUNTRY_UNIFORMS.uWaterNear.value;
  u[0] = px; u[1] = py; u[2] = W ? radius : 0; u[3] = time % 1000;
  if (!W) return;
  const on = radius > 0 && REAL.ready;
  W.bed.visible = on;
  if (on) {
    W.bed.position.set(px, BED_Y, py);
    W.bed.scale.set(radius * 2 + 40, 1, radius * 2 + 40);
    W.bed.updateMatrix();
  }
}

// City water vertices by the map edge where the canal carries on: the
// distance to shore follows the field instead of the cut along the edge.
export function cityShoreFix(x, y, d) {
  if (!REAL.ready || rectOutside(x, y) < -30) return d;
  const rw = realWater(x, y);
  if (rw <= SHORE_RW || -rectOutside(x, y) > d + 0.5) return d;
  return Math.min(24, Math.max(d, rw - SHORE_RW));
}

export function countryWaterStats(chunks) {
  let meshes = 0, tris = 0;
  for (const ch of chunks) for (const m of ch.waterMeshes || []) { meshes++; tris += m.geometry.index.count / 3; }
  return { meshes, tris };
}
