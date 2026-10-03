import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { WATER_Y } from './util.js';
import { SHORE_RW, countryRect, rectOutside, realWater } from './countryfield.js';

// The geometry of the Ommeland water (countrywater.js) as plain arrays: runs
// on the main thread or in the geometry worker (geoworker.js), so it only
// uses three's math and buffer classes, never the scene or the DOM. The
// open-water query comes in as a function: countryedge's openWater on the
// main thread, canalWaterFrom over a snapshot of its canal grid in the
// worker.

const NEAR_CELL = 4, MID_CELL = 12;
const BANK_NEAR = 2, BANK_MID = 6;

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

function sampleGrid(openWater, x0, y0, n, c) {
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
function surfaceGeo(openWater, x0, y0, T, c) {
  const n = Math.round(T / c), m = n + 1;
  const { rw, hi } = sampleGrid(openWater, x0, y0, n, c);
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

function basinGeo(openWater, x0, y0, T, c) {
  const n = Math.round(T / c), m = n + 1;
  const { rw, hi } = sampleGrid(openWater, x0, y0, n, c);
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

// One tile's water for its tier, or null.
export function tileWater(openWater, tx, ty, T, mid) {
  const x0 = tx * T, y0 = ty * T;
  const r = countryRect();
  const inside = Math.abs(x0 + T / 2 - r.cx) + T / 2 < r.hx && Math.abs(y0 + T / 2 - r.cy) + T / 2 < r.hy;
  if (inside) return null;
  const s = surfaceGeo(openWater, x0, y0, T, mid ? MID_CELL : NEAR_CELL);
  return s ? { s, b: basinGeo(openWater, x0, y0, T, mid ? BANK_MID : BANK_NEAR) } : null;
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

const plain = (geo) => {
  const out = { index: geo.index.array };
  for (const k in geo.attributes) out[k] = geo.attributes[k].array;
  return out;
};

// A prop chunk's water: its tiles' surfaces merged into one geometry and
// their bank basins into another (normals computed), as arrays; null when
// the chunk has none. waterOf(tile) gives a tile's tileWater result.
export function chunkWaterArrays(tiles, waterOf) {
  const surf = [], bank = [];
  for (const t of tiles) {
    const w = waterOf(t);
    if (!w) continue;
    surf.push(w.s);
    if (w.b) bank.push(w.b);
  }
  if (!surf.length) return null;
  const out = { water: plain(merge(surf, [['position', 3, 'pos'], ['aEdge', 1, 'edge'], ['aFlow', 2, 'flow']])), bank: null };
  if (bank.length) {
    const geo = merge(bank, [['position', 3, 'pos'], ['color', 3, 'col']]);
    geo.computeVertexNormals();
    out.bank = plain(geo);
  }
  return out;
}

// canalWater (countryedge.js) over a snapshot of its lookup grid
// (canalGridSnapshot): { grid: Map(key -> segments), cell }.
export function canalWaterFrom(snap) {
  const NO = [];
  return (x, y) => {
    let best = -99;
    const list = snap.grid.get(Math.floor(x / snap.cell) * 100003 + Math.floor(y / snap.cell)) || NO;
    for (const g of list) {
      const b = g.box;
      if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) continue;
      const dx = g.bx - g.ax, dy = g.by - g.ay;
      const L2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - g.ax) * dx + (y - g.ay) * dy) / L2));
      const d = Math.hypot(x - g.ax - dx * t, y - g.ay - dy * t);
      best = Math.max(best, g.ha + (g.hb - g.ha) * t - 1.2 - d);
    }
    return best;
  };
}

// openWater (countryedge.js) from the field and a canal query
export function openWaterFrom(canalWater) {
  return (x, y) => Math.max(realWater(x, y), canalWater(x, y));
}
