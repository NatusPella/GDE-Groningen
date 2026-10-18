import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import {
  BLOCK, ROAD_IN, ROAD_W, COUNTRY_UNIFORMS,
  edgeDistance, countryWeight, edgeRoad, setCountryMask,
  villageAt, VILLAGE_RING, VILLAGE_X, provinceBlock, countrySurface, parcelAt, MAAR_WATER,
} from './countryfield.js';

// The edge of the data: where the province's tiles (and the city map) end and
// the procedural countryside begins. The mask of where data is, the rails
// the props keep clear of, the one polder-road gap query and the rule for the
// water of a polder ditch. Roads, buildings and water inside the data are the
// tiles' own; what the countryside's props must keep off is asked of them
// (provinceworld.js setExtraBlocked).

export const EDGE = { ready: false, bounds: null, railCells: new Set() };

// ------------------------------------------------------------------ build

export function initCountryEdge(map) {
  if (EDGE.ready) return;
  const t0 = performance.now();
  const B = map.meta.bounds;
  EDGE.bounds = B;
  buildMask(map, B);
  buildRails(map);
  EDGE.ready = true;
  EDGE.initMs = Math.round(performance.now() - t0);
}

// Where the real data actually is: roads, buildings and water rasterised
// on a 40 m grid, gaps closed and holes filled, turned into a signed
// distance field. The countryside starts where this says the data ends,
// so a non-rectangular data area works as well as the bounding box.
const MASK_CELL = 40, MASK_MARGIN = 520;
function buildMask(map, B) {
  const cell = MASK_CELL;
  const x0 = B[0] - MASK_MARGIN, y0 = B[1] - MASK_MARGIN;
  const w = Math.ceil((B[2] - B[0] + MASK_MARGIN * 2) / cell), h = Math.ceil((B[3] - B[1] + MASK_MARGIN * 2) / cell);
  let occ = new Uint8Array(w * h);
  const mark = (x, y) => {
    const i = Math.floor((x - x0) / cell), j = Math.floor((y - y0) / cell);
    if (i >= 0 && j >= 0 && i < w && j < h) occ[j * w + i] = 1;
  };
  const line = (P) => {
    for (let k = 1; k < P.length; k++) {
      const a = P[k - 1], b = P[k];
      const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 25));
      for (let t = 0; t <= n; t++) mark(a[0] + ((b[0] - a[0]) * t) / n, a[1] + ((b[1] - a[1]) * t) / n);
    }
  };
  for (const r of map.roads) line(r.pts);
  for (const b of map.buildings || []) {
    const q = b.bounds;
    if (!q) continue;
    mark(q[0], q[1]); mark(q[2], q[3]); mark(q[0], q[3]); mark(q[2], q[1]); mark((q[0] + q[2]) / 2, (q[1] + q[3]) / 2);
  }
  for (const q of map.water || []) if (q.pts) line(q.pts);
  for (const t of map.trees || []) { const p = t.pts ? t.pts[0] : t; if (p && p.length >= 2) mark(p[0], p[1]); else if (t.x !== undefined) mark(t.x, t.y); }
  // close gaps (parks, fields inside town) and fill enclosed holes
  const R = 3;
  const morph = (src, keep) => {
    const out = new Uint8Array(w * h);
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        let v = keep ? 1 : 0;
        for (let dj = -R; dj <= R && v === (keep ? 1 : 0); dj++) {
          for (let di = -R; di <= R; di++) {
            if (di * di + dj * dj > R * R) continue;
            const ii = i + di, jj = j + dj;
            const s2 = ii < 0 || jj < 0 || ii >= w || jj >= h ? 0 : src[jj * w + ii];
            if (keep ? !s2 : s2) { v = keep ? 0 : 1; break; }
          }
        }
        out[j * w + i] = v;
      }
    }
    return out;
  };
  occ = morph(morph(occ, false), true);
  const seen = new Uint8Array(w * h), stack = [];
  for (let i = 0; i < w; i++) { stack.push(i, (h - 1) * w + i); }
  for (let j = 0; j < h; j++) { stack.push(j * w, j * w + w - 1); }
  while (stack.length) {
    const k = stack.pop();
    if (seen[k] || occ[k]) continue;
    seen[k] = 1;
    const i = k % w, j = (k - i) / w;
    if (i > 0) stack.push(k - 1);
    if (i < w - 1) stack.push(k + 1);
    if (j > 0) stack.push(k - w);
    if (j < h - 1) stack.push(k + w);
  }
  for (let k = 0; k < w * h; k++) if (!seen[k]) occ[k] = 1;
  // signed distance (8SSEDT) from each cell to the nearest cell of the
  // other class, in metres between cell centres
  const edt = (inside) => {
    const INF = 1e6;
    const vx = new Float32Array(w * h), vy = new Float32Array(w * h);
    for (let k = 0; k < w * h; k++) { const f = (occ[k] === 1) !== inside; vx[k] = f ? 0 : INF; vy[k] = f ? 0 : INF; }
    const d2 = (k) => vx[k] * vx[k] + vy[k] * vy[k];
    const cmp = (k, i, j, ox, oy) => {
      const ii = i + ox, jj = j + oy;
      if (ii < 0 || jj < 0 || ii >= w || jj >= h) return;
      const q = jj * w + ii;
      const nx2 = vx[q] + Math.abs(ox), ny2 = vy[q] + Math.abs(oy);
      if (nx2 * nx2 + ny2 * ny2 < d2(k)) { vx[k] = nx2; vy[k] = ny2; }
    };
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) { const k = j * w + i; cmp(k, i, j, -1, 0); cmp(k, i, j, 0, -1); cmp(k, i, j, -1, -1); cmp(k, i, j, 1, -1); }
      for (let i = w - 1; i >= 0; i--) cmp(j * w + i, i, j, 1, 0);
    }
    for (let j = h - 1; j >= 0; j--) {
      for (let i = w - 1; i >= 0; i--) { const k = j * w + i; cmp(k, i, j, 1, 0); cmp(k, i, j, 0, 1); cmp(k, i, j, 1, 1); cmp(k, i, j, -1, 1); }
      for (let i = 0; i < w; i++) cmp(j * w + i, i, j, -1, 0);
    }
    const out = new Float32Array(w * h);
    for (let k = 0; k < w * h; k++) out[k] = Math.sqrt(d2(k));
    return out;
  };
  const dOut = edt(false), dIn = edt(true);
  const data = new Float32Array(w * h);
  for (let k = 0; k < w * h; k++) data[k] = occ[k] ? -(dIn[k] - 0.5) * cell : (dOut[k] - 0.5) * cell;
  const tex = new THREE.DataTexture(data, w, h, THREE.RedFormat, THREE.FloatType);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  COUNTRY_UNIFORMS.uMaskTex.value = tex;
  setCountryMask({ x0, y0, cell, w, h, data });
}

// The rails (the city's routes and the countryside's track) as 8 m cells
// the props keep out of.
function buildRails(map) {
  const routes = (map.railRoutes || []).map((r) => r.pts).concat(map.countryRails || []);
  for (const P of routes) {
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i];
      if (edgeDistance(b[0], b[1]) < -20 && edgeDistance(a[0], a[1]) < -20) continue;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.max(1, Math.ceil(len / 6));
      for (let k = 0; k <= n; k++) {
        const x = a[0] + ((b[0] - a[0]) * k) / n, y = a[1] + ((b[1] - a[1]) * k) / n;
        for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) EDGE.railCells.add(cellKey(Math.floor(x / 8) + ox, Math.floor(y / 8) + oy));
      }
    }
  }
}
const cellKey = (i, j) => i * 1000003 + j;

export function nearRail(x, y) {
  return EDGE.railCells.has(cellKey(Math.floor(x / 8), Math.floor(y / 8)));
}

// ------------------------------------------------------------------ queries

// The one water rule out on the polder grid, for vehicles and walkers alike:
//   'wade'  a maar: painted on the ground, vehicles crawl through at walking
//           pace, walkers wade
//   'ditch' a strip or main ditch: a dip a vehicle bumps through, walkers wade
//   null    dry
// The tiles' water (waterlevels.js waterAt) is the rule wherever a tile is in.
export function countryWater(x, y) {
  if (countrySurface(x, y) === 'sloot') return parcelAt(x, y).dMaar < MAAR_WATER ? 'wade' : 'ditch';
  return null;
}

// Metres from (x, y) to the edge of the nearest paved way the ground shader
// paints (negative on it): the polder roads and the village streets. The
// tiles' roads are their own meshes. Looks only `reach` metres out and
// returns reach past that.
export function roadGap(x, y, reach = 6) {
  let best = reach;
  const bx = Math.floor(x / BLOCK), by = Math.floor(y / BLOCK);
  // the blocks the tiles cover have no polder roads or wierde villages
  if (provinceBlock(bx, by) && provinceBlock(bx + 1, by) && provinceBlock(bx, by + 1)) return best;
  if (countryWeight(x, y) < 0.5) return best;
  const lx = x - bx * BLOCK, ly = y - by * BLOCK;
  for (const k of [0, 1]) {
    if (edgeRoad(bx + k, by, 0)) best = Math.min(best, Math.max(ROAD_IN - (lx - k * BLOCK), lx - k * BLOCK - ROAD_IN - ROAD_W));
    if (edgeRoad(bx, by + k, 1)) best = Math.min(best, Math.max(ROAD_IN - (ly - k * BLOCK), ly - k * BLOCK - ROAD_IN - ROAD_W));
  }
  const vi = villageAt(x, y);
  if (vi) {
    const v = vi.v, d = Math.hypot(x - v.x, y - v.y);
    best = Math.min(best, Math.abs(d - VILLAGE_RING) - 2.6);
    if (x > v.x - VILLAGE_X + ROAD_IN && x < v.x - VILLAGE_RING) best = Math.min(best, Math.abs(y - v.y) - 2.3);
  }
  return best;
}

// More that blocks the countryside's props and farms: the province's real
// tiles (provinceworld.js), whose roads, buildings and water live in the tile world.
let extraBlocked = null;
export function setExtraBlocked(fn) { extraBlocked = fn; }

// What the tiles say the land is used for at a point (OSM landuse, provinceworld.js): 'akker' | 'weide' | 'boomgaard' | null.
// The countryside's fences and herds follow it where it speaks; the hash decides where it does not.
let extraUse = null;
export function setExtraUse(fn) { extraUse = fn; }
export const landUseAt = (x, y) => (extraUse ? extraUse(x, y) : null);

// The land mask of the province (countryfield.js setLandMask / landOk): the hash-grid countryside exists only there (#233).
export { setLandMask, landOk } from './countryfield.js';

// Is a mapped hedge (OSM barrier=hedge, in the tiles) within r of a point? The countryside's own hedges keep off it: the data wins
// where it speaks, the hash only where it is silent (#124).
let extraHedge = null;
export function setExtraHedge(fn) { extraHedge = fn; }
export const hedgeMapped = (x, y, r) => (extraHedge ? extraHedge(x, y, r) : false);

// Kept clear of props, farms and turbines: what the tiles hold, and the rails.
export function edgeBlocked(x, y, margin = 3) {
  if (extraBlocked && extraBlocked(x, y, margin)) return true;
  if (!EDGE.ready) return false;
  // the rails of the province too, far from the city: the cells hold all of provincie-land.json's track (#124)
  return nearRail(x, y);
}

// A line prop (a fence span, a hedge piece) from (ax, ay) to (bx, by): blocked
// when any point along it is (checked every `step` m, both ends included). The
// posts of a fence are tested one by one, the wire between them is not: a
// ditch or a lane narrower than the post spacing was crossed (issue #124).
export function edgeSpanBlocked(ax, ay, bx, by, margin = 0.5, step = 1) {
  const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
  for (let k = 0; k <= n; k++) if (edgeBlocked(ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n, margin)) return true;
  return false;
}
