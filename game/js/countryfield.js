// Endless Groningen countryside past the edge of the real map data: one
// deterministic field layout (parcels, ditches, polder roads, feathered
// blend into the map edge) evaluated identically in JS (gameplay, props,
// minimap) and GLSL (the ground shader). Pure module, no imports.
//
// Layout: the world is cut into BLOCK x BLOCK polder blocks bounded by wide
// main ditches (tochten). Each block runs its narrow strip parcels either
// along x or along y; parcels are PW wide and PL long, with the cross
// ditches staggered per strip. Some block edges carry a straight polder road.

export const BLOCK = 960;
export const PW = 40;
export const PL = 240;
export const DITCH_HW = 1.1;
export const MAIN_HW = 2.1;
export const ROAD_IN = 5;
export const ROAD_W = 5;
export const ROAD_P = 0.5;
// maaren: wide canals along some block-boundary lines, running for km
export const MAAR_HW = 4.2;
// segment texture width and lookup slots per grid cell (countryedge.js)
export const EDGE_TEX_W = 2048;
export const EDGE_SLOTS = 12;
export const MAAR_WATER = 3.5;
// wierden (terp villages): centred beside a block's low-x polder road
export const VILLAGE_P = 0.2;
export const VILLAGE_X = ROAD_IN + ROAD_W / 2 + 48;
export const VILLAGE_RING = 34;

const FEATHER_IN = 180;
const FEATHER_OUT = 20;
const FEATHER_NOISE = 110;

const rect = { cx: 0, cy: 0, hx: 1e9, hy: 1e9 };
let bounds0 = null;

export function setCountryBounds(bounds) {
  bounds0 = bounds;
  const [minx, miny, maxx, maxy] = bounds;
  rect.cx = (minx + maxx) / 2;
  rect.cy = (miny + maxy) / 2;
  rect.hx = (maxx - minx) / 2;
  rect.hy = (maxy - miny) / 2;
  COUNTRY_UNIFORMS.uCountryRect.value = [rect.cx, rect.cy, rect.hx, rect.hy];
}

// what setCountryBounds / setRealZone were given (the geometry worker repeats them)
export function countryBounds() {
  return bounds0;
}
export function realZone() {
  return real;
}

export function countryRect() {
  return rect;
}

// Plain array (not a THREE.Vector4) so this file stays import-free; three
// accepts arrays for vec4 uniforms.
export const COUNTRY_UNIFORMS = {
  uCountryRect: { value: [0, 0, 1e9, 1e9] },
  // roads and canals carrying on from the map edge (countryedge.js)
  uEdgeTex: { value: null },
  // lookup grid: per cell up to EDGE_SLOTS segment indices (+1), four per texel
  uEdgeGrid: { value: null },
  uEdgeGridRect: { value: [0, 0, 64, 0] },
  uEdgeGridSize: { value: [0, 0, 0, 0] },
  // coverage mask of the real map data (signed distance, see setCountryMask)
  uMaskTex: { value: null },
  uMaskRect: { value: [0, 0, 1, 0] },
  uMaskSize: { value: [0, 0, 0, 0] },
  // the real Ommelanden (countryreal.js): polder blocks without procedural
  // roads, maaren or villages, the water distance field and the built-up mask
  uRealBlocks: { value: [1, 1, 0, 0] },
  uRealWater: { value: null },
  uRealWaterRect: { value: [0, 0, 1, 0] },
  // round the player (x, z, radius) the ground opens over the tiles' water,
  // a real surface at WATER_Y (tilewatermask.js); w = time
  uWaterNear: { value: [0, 0, 0, 0] },
  // the tiles' water round the player as a mask: rect = [x0, y0, size, on]
  uTileWater: { value: null },
  uTileWaterRect: { value: [0, 0, 1, 0] },
  uUrbanTex: { value: null },
  uUrbanRect: { value: [0, 0, 1, 0] },
  // the province's tile world (provinceworld.js): the polder blocks its real
  // tiles cover, one texel per block; rect = [bx0, by0, w, h], w = 0 when off
  uProvBlocks: { value: null },
  uProvRect: { value: [0, 0, 0, 0] },
  // the road / canal distances of cEdge baked round the player (countrybake.js):
  // rect = [x0, y0, size, on], a fine level and a coarse one
  uBake0: { value: null },
  uBakeRect0: { value: [0, 0, 1, 0] },
  uBake1: { value: null },
  uBakeRect1: { value: [0, 0, 1, 0] },
};

// Real-data zone: { bx0, by0, bx1, by1, water: { x0, y0, cell, w, h, data },
// urban: { x0, y0, cell, w, h, data } } (countryreal.js sets it).
let real = null;
export function setRealZone(z) {
  real = z;
  // the province blocks ride along with the zone (the geometry worker gets both)
  if (z.prov) prov = z.prov;
  else if (prov) z.prov = prov;
  villageCache.clear();
  COUNTRY_UNIFORMS.uRealBlocks.value = [z.bx0, z.by0, z.bx1, z.by1];
  COUNTRY_UNIFORMS.uRealWaterRect.value = [z.water.x0, z.water.y0, z.water.cell * z.water.w, z.water.cell * z.water.h];
  COUNTRY_UNIFORMS.uUrbanRect.value = [z.urban.x0, z.urban.y0, z.urban.cell * z.urban.w, z.urban.cell * z.urban.h];
}
export function realBlock(bx, by) {
  return (!!real && bx >= real.bx0 && bx <= real.bx1 && by >= real.by0 && by <= real.by1) || provinceBlock(bx, by);
}

// Polder blocks the province's real tiles cover (provinceworld.js): like the
// Ommeland's blocks, no procedural roads, maaren, villages or farms there.
// { x0, y0, w, h, data: Uint8Array } in block units, or null.
let prov = null;
export function setProvinceBlocks(p) {
  prov = p;
  if (real) real.prov = p;
  villageCache.clear();
  COUNTRY_UNIFORMS.uProvRect.value = p ? [p.x0, p.y0, p.w, p.h] : [0, 0, 0, 0];
}
export function provinceBlock(bx, by) {
  if (!prov) return false;
  const i = bx - prov.x0, j = by - prov.y0;
  return i >= 0 && j >= 0 && i < prov.w && j < prov.h && prov.data[j * prov.w + i] > 0;
}
export function realActive() {
  return !!real;
}
function bilinear(G, x, y, outside) {
  const gx = (x - G.x0) / G.cell - 0.5, gy = (y - G.y0) / G.cell - 0.5;
  if (gx < 0 || gy < 0 || gx >= G.w - 1 || gy >= G.h - 1) return outside;
  const ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy;
  const d = G.data, i = iy * G.w + ix;
  const a = d[i] + (d[i + 1] - d[i]) * fx, b = d[i + G.w] + (d[i + G.w + 1] - d[i + G.w]) * fx;
  return a + (b - a) * fy;
}
// Signed distance to real open water in metres (positive on the water).
export function realWater(x, y) {
  if (!real) return -99;
  return (bilinear(real.water, x, y, 0) - 128) / 4;
}
// Past the map rectangle the real open water from about SHORE_RW in is a
// water surface at the city's WATER_Y; the city's own polygons cover it inside.
export const SHORE_RW = 1.0;
export function rectOutside(x, y) {
  return Math.max(Math.abs(x - rect.cx) - rect.hx, Math.abs(y - rect.cy) - rect.hy);
}
// 0 in open country, 1 in the built-up parts of the real villages.
export function urbanWeight(x, y) {
  if (!real) return 0;
  return smooth(0.05, 0.16, bilinear(real.urban, x, y, 0) / 255);
}

// countryedge.js registers its road / canal lookup here (this module stays
// import-free so the shader source can be shared).
let edgeQuery = null;
export function setEdgeQuery(fn) {
  edgeQuery = fn;
}

// Near the city the thin ditches thin out: a ditch only runs if its hash
// is under this ramp, so the ditch grid fades in instead of starting on a line.
export function ditchRamp(x, y) {
  const d = edgeDistance(x, y);
  return d >= 450 ? 1 : smooth(20, 450, d);
}
export function thinDitchOn(p) {
  const r = ditchRamp(p.x, p.y);
  if (r >= 1) return true;
  const dA = Math.min(p.a - p.a0, p.a1 - p.a), dB = Math.min(p.b - p.b0, p.b1 - p.b);
  if (dA < dB) {
    const ci = p.a - p.a0 < p.a1 - p.a ? p.col : p.col + 1;
    return chash(ci + p.bx * 131 + 5, p.by * 977 + 61) < r;
  }
  const ri = p.b - p.b0 < p.b1 - p.b ? p.row : p.row + 1;
  return chash(p.col * 31 + p.bx * 7 + ri * 131, p.by * 977 + 71) < r;
}

export function chash(x, y) {
  let h = Math.imul(x | 0, 1597334677) ^ Math.imul(y | 0, 3812015801 | 0);
  h ^= h >>> 16; h = Math.imul(h, 2246822519 | 0);
  h ^= h >>> 13; h = Math.imul(h, 3266489917 | 0);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = chash(ix, iy), b = chash(ix + 1, iy), c = chash(ix, iy + 1), d = chash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function smooth(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

// Signed distance past the map edge (negative inside), Chebyshev.
// Beyond the bounds rectangle this is the plain rectangle distance; inside
// it (and a margin round it) a coverage mask of where real map data exists
// takes over, so the countryside follows the actual shape of the data.
export function edgeDistance(x, y) {
  const r = Math.max(Math.abs(x - rect.cx) - rect.hx, Math.abs(y - rect.cy) - rect.hy);
  const M = mask;
  if (!M) return r;
  const gx = (x - M.x0) / M.cell - 0.5, gy = (y - M.y0) / M.cell - 0.5;
  if (gx < 0 || gy < 0 || gx >= M.w - 1 || gy >= M.h - 1) return r;
  const ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy;
  const d = M.data, i = iy * M.w + ix;
  const a = d[i] + (d[i + 1] - d[i]) * fx, b = d[i + M.w] + (d[i + M.w + 1] - d[i + M.w]) * fx;
  return Math.max(r, a + (b - a) * fy);
}

// Coverage mask: { x0, y0, cell, w, h, data: Float32Array signed distance
// (m, negative inside the data) at cell centres }. Clears derived caches.
let mask = null;
export function setCountryMask(m) {
  mask = m;
  villageCache.clear();
  COUNTRY_UNIFORMS.uMaskRect.value = [m.x0, m.y0, m.cell, 0];
  COUNTRY_UNIFORMS.uMaskSize.value = [m.w, m.h, 0, 0];
}
export function countryMask() {
  return mask;
}

// 0 inside the real map, 1 in open countryside, noisy feather between.
export function countryWeight(x, y) {
  const d = edgeDistance(x, y);
  if (d < -FEATHER_IN - FEATHER_NOISE) return 0;
  if (d > FEATHER_OUT + FEATHER_NOISE) return 1;
  const n = (vnoise(x * 0.012, y * 0.012) + 0.5 * vnoise(x * 0.05 + 17, y * 0.05 + 3)) / 1.5;
  return smooth(-FEATHER_IN, FEATHER_OUT, d + (n - 0.5) * FEATHER_NOISE);
}

// Whether the edge of block (bx, by) on side s carries a polder road
// (s: 0 = low-x edge, 1 = low-y edge; roads run just inside that edge).
export function edgeRoad(bx, by, s) {
  if (real && realBlock(bx, by)) return false;
  return chash(bx * 3 + s * 7919, by * 5 + 101) < ROAD_P;
}

// Maar along the vertical line x = i * BLOCK / horizontal line y = j * BLOCK.
export function maarX(i) {
  return chash(i * 37 + 11, 4441) < 0.18;
}
export function maarY(j) {
  return chash(j * 41 + 17, 5557) < 0.18;
}

// Village of block (bx, by): { x, y, r } or null. Its disc reaches into the
// block to the west, never across a horizontal block edge.
const villageCache = new Map();
export function villageOf(bx, by) {
  const key = bx * 100003 + by;
  let v = villageCache.get(key);
  if (v !== undefined) return v;
  v = null;
  if (!realBlock(bx, by) && !realBlock(bx - 1, by) && chash(bx * 29 + 7, by * 31 + 3) < VILLAGE_P && edgeRoad(bx, by, 0) && !maarX(bx)) {
    const x = bx * BLOCK + VILLAGE_X, y = by * BLOCK + 250 + chash(bx + 71, by - 13) * 460;
    const r = 100 + chash(bx - 9, by + 17) * 30;
    if (edgeDistance(x, y) >= r + 260) v = { x, y, r, bx, by };
  }
  villageCache.set(key, v);
  return v;
}

// Village whose disc contains (x, y), with d = distance / radius.
export function villageAt(x, y) {
  const bx = Math.floor(x / BLOCK), by = Math.floor(y / BLOCK);
  for (const v of [villageOf(bx, by), villageOf(bx + 1, by)]) {
    if (!v) continue;
    const d = Math.hypot(x - v.x, y - v.y) / v.r;
    if (d < 1) return { v, d };
  }
  return null;
}

// Brick village streets: the ring round the church terp and the spur from
// the polder road.
export function villageStreet(v, x, y) {
  const d = Math.hypot(x - v.x, y - v.y);
  if (Math.abs(d - VILLAGE_RING) < 2.6) return true;
  return Math.abs(y - v.y) < 2.3 && x > v.x - VILLAGE_X + ROAD_IN && x < v.x - VILLAGE_RING;
}

// Parcel lookup; fills and returns a shared scratch object.
const P = {
  bx: 0, by: 0, rot: false, col: 0, row: 0, a: 0, b: 0,
  a0: 0, a1: 0, b0: 0, b1: 0, dDitch: 0, dMain: 0, dMaar: 1e3, road: false, cont: false, seed: 0, x: 0, y: 0,
};
export function parcelAt(x, y) {
  const bx = Math.floor(x / BLOCK), by = Math.floor(y / BLOCK);
  const lx = x - bx * BLOCK, ly = y - by * BLOCK;
  const rot = chash(bx * 7 + 3, by * 13 + 1) < 0.5;
  const a = rot ? ly : lx, b = rot ? lx : ly;
  const col = Math.floor(a / PW);
  const off = chash(col + bx * 131 + by * 977, rot ? 18 : 17) * PL;
  const row = Math.floor((b + off) / PL);
  const b0 = Math.max(0, row * PL - off), b1 = Math.min(BLOCK, (row + 1) * PL - off);
  const a0 = col * PW, a1 = a0 + PW;
  P.x = x; P.y = y;
  P.bx = bx; P.by = by; P.rot = rot; P.col = col; P.row = row; P.a = a; P.b = b;
  P.a0 = a0; P.a1 = a1; P.b0 = b0; P.b1 = b1;
  P.dDitch = Math.min(a - a0, a1 - a, b - b0, b1 - b);
  P.dMain = Math.min(lx, BLOCK - lx, ly, BLOCK - ly);
  const rv = edgeRoad(bx, by, 0) && lx > ROAD_IN && lx < ROAD_IN + ROAD_W;
  const rh = edgeRoad(bx, by, 1) && ly > ROAD_IN && ly < ROAD_IN + ROAD_W;
  P.road = rv || rh;
  // a road that carries on into the next block crosses the ditch on a
  // culvert (or a bridge over a maar)
  P.cont = (rv && edgeRoad(bx, ly < BLOCK / 2 ? by - 1 : by + 1, 0))
    || (rh && edgeRoad(lx < BLOCK / 2 ? bx - 1 : bx + 1, by, 1));
  P.dMaar = realBlock(bx, by) ? 1e3 : Math.min(maarX(bx) ? lx : 1e3, maarX(bx + 1) ? BLOCK - lx : 1e3, maarY(by) ? ly : 1e3, maarY(by + 1) ? BLOCK - ly : 1e3);
  P.seed = chash(col * 7 + bx * 1009, row * 13 + by * 2003 + 1);
  return P;
}

// Block-local (a, b) back to world (x, y).
export function blockToWorld(bx, by, rot, a, b) {
  const lx = rot ? b : a, ly = rot ? a : b;
  return [bx * BLOCK + lx, by * BLOCK + ly];
}

// Parcel use, matching the shader: 'mown' | 'hay' | 'plough' | 'crop' | 'pasture'.
export function parcelUse(seed) {
  const s2 = (seed * 7.31) % 1;
  return s2 < 0.3 ? 'mown' : s2 < 0.37 ? 'hay' : s2 < 0.405 ? 'plough' : s2 < 0.44 ? 'crop' : 'pasture';
}

// Ground kind under (x, y) for gameplay: null (real map), 'gras', 'weg'
// (polder road) or 'sloot' (ditch water).
export function countrySurface(x, y) {
  if (edgeQuery) {
    const e = edgeQuery(x, y);
    if (e) return e === 'sloot' && parcelAt(x, y).road ? 'weg' : e;
  }
  const w = countryWeight(x, y);
  if (w < 0.5) return null;
  const vi = w > 0.99 ? villageAt(x, y) : null;
  if (vi && vi.d < 0.9) {
    if (villageStreet(vi.v, x, y)) return 'weg';
    const p = parcelAt(x, y);
    return p.road ? 'weg' : 'gras';
  }
  const p = parcelAt(x, y);
  const wet = w > 0.92;
  if (wet && p.dMaar < MAAR_WATER) return p.road && p.cont ? 'weg' : 'sloot';
  const town = real && urbanWeight(x, y) > 0.5;
  if (wet && !town && p.dMain < MAIN_HW * 0.8 && !(p.road && p.cont)) return 'sloot';
  if (p.road) return 'weg';
  if (wet && !town && p.dDitch < DITCH_HW * 0.72) {
    if (thinDitchOn(p)) return 'sloot';
  }
  return 'gras';
}

// Ground albedo for the countryside, blended into the terrain shader by
// countryWeight. Expects vec2 world xz; may adjust sRough (roughness delta)
// and sDip (puddle bias) declared by terrain3d's wet-ground code.
export const COUNTRY_GLSL = `
uniform vec4 uCountryRect;
uniform sampler2D uEdgeTex;
uniform highp usampler2D uEdgeGrid;
uniform vec4 uEdgeGridRect;
uniform vec4 uEdgeGridSize;
uniform sampler2D uMaskTex;
uniform vec4 uMaskRect;
uniform vec4 uMaskSize;
uniform vec4 uRealBlocks;
uniform sampler2D uRealWater;
uniform vec4 uRealWaterRect;
uniform vec4 uWaterNear;
uniform sampler2D uTileWater;
uniform vec4 uTileWaterRect;
uniform sampler2D uUrbanTex;
uniform vec4 uUrbanRect;
uniform sampler2D uProvBlocks;
uniform vec4 uProvRect;
uniform sampler2D uBake0;
uniform vec4 uBakeRect0;
uniform sampler2D uBake1;
uniform vec4 uBakeRect1;
float cEdD = 0.0;
const float C_BLOCK = ${BLOCK.toFixed(1)};
const float C_PW = ${PW.toFixed(1)};
const float C_PL = ${PL.toFixed(1)};
const float C_DITCH = ${DITCH_HW.toFixed(2)};
const float C_MAIN = ${MAIN_HW.toFixed(2)};
const float C_ROAD_IN = ${ROAD_IN.toFixed(1)};
const float C_ROAD_W = ${ROAD_W.toFixed(1)};
const float C_ROAD_P = ${ROAD_P.toFixed(3)};
const float C_MAAR = ${MAAR_HW.toFixed(2)};
const float C_MAAR_WATER = ${MAAR_WATER.toFixed(2)};

float cHash(int x, int y) {
  uint h = (uint(x) * 1597334677u) ^ (uint(y) * 3812015801u);
  h ^= h >> 16; h *= 2246822519u; h ^= h >> 13; h *= 3266489917u; h ^= h >> 16;
  return float(h) * (1.0 / 4294967296.0);
}
float cNoise(vec2 p) {
  vec2 i = floor(p), f = p - i;
  vec2 u = f * f * (3.0 - 2.0 * f);
  int ix = int(i.x), iy = int(i.y);
  float a = cHash(ix, iy), b = cHash(ix + 1, iy), c = cHash(ix, iy + 1), d = cHash(ix + 1, iy + 1);
  return a + (b - a) * u.x + (c - a) * u.y + (a - b - c + d) * u.x * u.y;
}
vec3 cLin(float r, float g, float b) { return pow(vec3(r, g, b) / 255.0, vec3(2.2)); }
// Signed distance past the real data (negative inside): the coverage mask
// where it exists, the bounds rectangle beyond it. Mirrors edgeDistance().
float cEdgeDist(vec2 p) {
  vec2 q = abs(p - uCountryRect.xy) - uCountryRect.zw;
  float r = max(q.x, q.y);
  if (uMaskSize.x < 2.0) return r;
  vec2 g = (p - uMaskRect.xy) / uMaskRect.z - 0.5;
  if (g.x < 0.0 || g.y < 0.0 || g.x >= uMaskSize.x - 1.0 || g.y >= uMaskSize.y - 1.0) return r;
  ivec2 i = ivec2(floor(g));
  vec2 f = g - vec2(i);
  float a = texelFetch(uMaskTex, i, 0).r, b = texelFetch(uMaskTex, i + ivec2(1, 0), 0).r;
  float c = texelFetch(uMaskTex, i + ivec2(0, 1), 0).r, d = texelFetch(uMaskTex, i + ivec2(1, 1), 0).r;
  return max(r, mix(mix(a, b, f.x), mix(c, d, f.x), f.y));
}

bool cReal(int bx, int by) {
  if (float(bx) >= uRealBlocks.x && float(bx) <= uRealBlocks.z && float(by) >= uRealBlocks.y && float(by) <= uRealBlocks.w) return true;
  if (uProvRect.z < 0.5) return false;
  ivec2 q = ivec2(bx - int(uProvRect.x), by - int(uProvRect.y));
  if (q.x < 0 || q.y < 0 || q.x >= int(uProvRect.z) || q.y >= int(uProvRect.w)) return false;
  return texelFetch(uProvBlocks, q, 0).r > 0.5;
}
// signed metres to real open water (positive on it); built-up weight
float cRealWater(vec2 p) {
  if (uRealBlocks.z < uRealBlocks.x) return -99.0;
  vec2 uv = (p - uRealWaterRect.xy) / uRealWaterRect.zw;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return -99.0;
  return (texture(uRealWater, uv).r * 255.0 - 128.0) * 0.25;
}
// the tiles' water mask (0..1 on the water); -1 outside its window
float cTileWater(vec2 p) {
  if (uTileWaterRect.w < 0.5) return -1.0;
  vec2 uv = (p - uTileWaterRect.xy) / uTileWaterRect.z;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return -1.0;
  return texture(uTileWater, uv).r;
}
float cUrban(vec2 p) {
  if (uRealBlocks.z < uRealBlocks.x) return 0.0;
  vec2 uv = (p - uUrbanRect.xy) / uUrbanRect.zw;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 0.0;
  return smoothstep(0.05, 0.16, texture(uUrbanTex, uv).r);
}
bool cRoad(int bx, int by, int s) { if (cReal(bx, by)) return false; return cHash(bx * 3 + s * 7919, by * 5 + 101) < C_ROAD_P; }
bool cMaarX(int i) { return cHash(i * 37 + 11, 4441) < 0.18; }
bool cMaarY(int j) { return cHash(j * 41 + 17, 5557) < 0.18; }
vec3 cVillage(int bx, int by) {
  if (cReal(bx, by) || cReal(bx - 1, by) || cHash(bx * 29 + 7, by * 31 + 3) >= ${VILLAGE_P.toFixed(3)} || !cRoad(bx, by, 0) || cMaarX(bx)) return vec3(0.0);
  float x = float(bx) * C_BLOCK + ${VILLAGE_X.toFixed(2)};
  float y = float(by) * C_BLOCK + 250.0 + cHash(bx + 71, by - 13) * 460.0;
  float r = 100.0 + cHash(bx - 9, by + 17) * 30.0;
  if (cEdgeDist(vec2(x, y)) < r + 260.0) return vec3(0.0);
  return vec3(x, y, r);
}

// Roads (x) and canals (y) carried on from the map edge; z = signed
// distance to the edge of the asphalt (negative on it, 1e3 far off).
vec3 cEdge(vec2 p, float px) {
  float road = 0.0, canal = 0.0, line = 1e3;
  vec2 g = (p - uEdgeGridRect.xy) / uEdgeGridRect.z;
  if (g.x < 0.0 || g.y < 0.0 || g.x >= uEdgeGridSize.x || g.y >= uEdgeGridSize.y) return vec3(0.0, 0.0, 1e3);
  ivec2 c = ivec2(floor(g));
  uvec4 s0 = texelFetch(uEdgeGrid, ivec2(c.x * 3, c.y), 0);
  if (s0.x == 0u) return vec3(0.0, 0.0, 1e3);
  uvec4 s1 = texelFetch(uEdgeGrid, ivec2(c.x * 3 + 1, c.y), 0);
  uvec4 s2 = s1.w == 0u ? uvec4(0u) : texelFetch(uEdgeGrid, ivec2(c.x * 3 + 2, c.y), 0);
  for (int k = 0; k < ${EDGE_SLOTS}; k++) {
    uint id = k < 4 ? s0[k] : k < 8 ? s1[k - 4] : s2[k - 8];
    if (id == 0u) break;
    int i = int(id) - 1;
    ivec2 at = ivec2(i % ${EDGE_TEX_W}, (i / ${EDGE_TEX_W}) * 2);
    vec4 A = texelFetch(uEdgeTex, at, 0);
    vec2 ab = A.zw - A.xy;
    float t = clamp(dot(p - A.xy, ab) / max(dot(ab, ab), 1e-3), 0.0, 1.0);
    float d = length(p - A.xy - ab * t);
    vec4 W = texelFetch(uEdgeTex, at + ivec2(0, 1), 0);
    float hw = mix(W.x, W.y, t);
    if (d > hw + 2.5) continue;
    float cov = 1.0 - smoothstep(hw - px - 0.05, hw + px + 0.05, d);
    if (W.z < 0.5) { road = max(road, cov); line = min(line, d - hw); }
    else canal = max(canal, 1.0 - smoothstep(hw - 1.2 - px, hw - 1.2 + px, d));
  }
  return vec3(road, canal, line);
}

// The city's asphalt (roadsurface.js SURF_ASPHALT) for the painted roads:
// same base colour, macro/fine/aggregate noise and worn wheel tracks. e =
// metres in from the asphalt edge; rough gets the roughness delta.
vec3 cAsphalt(vec2 p, float px, float e, float hw, inout float rough) {
  float macro = cNoise(p * 0.043) * 0.6 + cNoise(p * 0.21 + 3.1) * 0.4;
  float fine = cNoise(p * 7.0);
  float a = (0.82 + 0.34 * macro + (fine - 0.5) * 0.14) * (1.0 - smoothstep(0.55, 0.8, cNoise(p * 0.12 + 20.0)) * 0.14);
  float fa = 1.0 - smoothstep(0.012, 0.05, px);
  float stone = 0.0;
  if (fa > 0.0) {
    stone = smoothstep(0.74, 0.82, cNoise(p * 55.0 + 7.0));
    a *= 1.0 + ((cNoise(p * 42.0) - 0.5) * 0.14 + stone * 0.22) * fa;
  }
  // wheel tracks 0.85 m either side of each lane centre (lanes from the edge in)
  float lw = hw > 2.4 ? min(hw, 3.5) : hw;
  float lp = (fract(e / lw) - 0.5) * lw;
  float track = (1.0 - smoothstep(0.12, 0.45, abs(abs(lp) - 0.85))) * step(0.6, e) * (1.0 - smoothstep(0.2, 1.0, px));
  a *= 1.0 - track * (0.12 + 0.07 * cNoise(p * 0.5));
  rough += -0.07 + (fine - 0.5) * 0.1 - stone * 0.08 * fa - track * 0.14;
  return cLin(75.0, 77.0, 80.0) * a;
}
// The city's road paint: white, worn in patches (SURF_MARKING).
vec3 cPaint(vec3 c, vec2 p, float m) {
  if (m <= 0.0) return c;
  float mw = cNoise(p * 2.3) * 0.55 + cNoise(p * 9.0) * 0.3 + cNoise(p * 31.0) * 0.15;
  m *= smoothstep(0.28, 0.38, mw);
  return mix(c, vec3(0.86) * (0.78 + 0.22 * smoothstep(0.33, 0.7, mw)), m);
}

// Road markings of the real road under p (only asked for near the camera,
// on road pixels): x = white paint, y = red asphalt (the cycle lanes OSM
// has on a road, or a whole fietspad). Segment texel W.w = (kind + 8 *
// oneway + 16 * cycle lanes + 32 * fietspad) * 4096 + metres along the road.
vec2 cMark(vec2 p, float px) {
  vec2 g = (p - uEdgeGridRect.xy) / uEdgeGridRect.z;
  if (g.x < 0.0 || g.y < 0.0 || g.x >= uEdgeGridSize.x || g.y >= uEdgeGridSize.y) return vec2(0.0);
  ivec2 c = ivec2(floor(g));
  uvec4 s0 = texelFetch(uEdgeGrid, ivec2(c.x * 3, c.y), 0);
  if (s0.x == 0u) return vec2(0.0);
  uvec4 s1 = texelFetch(uEdgeGrid, ivec2(c.x * 3 + 1, c.y), 0);
  uvec4 s2 = s1.w == 0u ? uvec4(0u) : texelFetch(uEdgeGrid, ivec2(c.x * 3 + 2, c.y), 0);
  float bd = 0.0, dc = 0.0, hw = 0.0, along = 0.0, code = 0.0;
  for (int k = 0; k < ${EDGE_SLOTS}; k++) {
    uint id = k < 4 ? s0[k] : k < 8 ? s1[k - 4] : s2[k - 8];
    if (id == 0u) break;
    int i = int(id) - 1;
    ivec2 at = ivec2(i % ${EDGE_TEX_W}, (i / ${EDGE_TEX_W}) * 2);
    vec4 W = texelFetch(uEdgeTex, at + ivec2(0, 1), 0);
    if (W.z > 0.5 || W.w < 4096.0) continue;
    vec4 A = texelFetch(uEdgeTex, at, 0);
    vec2 ab = A.zw - A.xy;
    float L = max(length(ab), 1e-3);
    float t = clamp(dot(p - A.xy, ab) / (L * L), 0.0, 1.0);
    float d = length(p - A.xy - ab * t);
    float h = mix(W.x, W.y, t);
    if (d - h < bd) { bd = d - h; dc = d; hw = h; code = floor(W.w / 4096.0); along = W.w - code * 4096.0 + t * L; }
  }
  if (bd >= 0.0) return vec2(0.0);
  if (code > 31.5) return vec2(0.0, 1.0);
  float kind = mod(code, 8.0);
  bool one = mod(code, 16.0) > 7.5;
  bool lanes = code > 15.5;
  float line = 0.0, strip = 0.0;
  float aa = px + 0.02;
  if (lanes && hw > 2.4) {
    // fietsstroken: red asphalt 1.5 m in from each edge behind a line
    float e = hw - dc;
    float dl = kind > 4.5 ? step(fract(along / 2.0), 0.5) : 1.0;
    line = (1.0 - smoothstep(0.06, 0.06 + aa, abs(e - 1.5))) * dl;
    strip = 1.0 - smoothstep(1.45, 1.45 + aa, e);
    if (kind < 5.5 && !one) line = max(line, (1.0 - smoothstep(0.05, 0.05 + aa, dc)) * step(fract(along / 9.0), 1.0 / 3.0));
  } else if (kind < 1.5) {
    // lane divider on a motorway carriageway: 3 m on, 9 m off (as in the city)
    line = (1.0 - smoothstep(0.06, 0.06 + aa, dc)) * step(fract(along / 12.0), 0.25);
  } else if (kind > 2.5 && kind < 3.5 && !one) {
    // trunk / primary: one solid centre line, like the city's main roads
    line = 1.0 - smoothstep(0.06, 0.06 + aa, dc);
  } else if (kind > 3.5 && kind < 5.5 && !one) {
    // secondary / tertiary: the city's 3 m on, 6 m off
    line = (1.0 - smoothstep(0.05, 0.05 + aa, dc)) * step(fract(along / 9.0), 1.0 / 3.0);
  }
  return vec2(line, strip);
}

// Signed distances (m, clamped to +-4) to the nearest road edge and to the
// nearest canal's water edge: what countrybake.js stores per texel.
vec2 cEdgeSD(vec2 p) {
  float sdR = 4.0, sdC = 4.0;
  vec2 g = (p - uEdgeGridRect.xy) / uEdgeGridRect.z;
  if (g.x < 0.0 || g.y < 0.0 || g.x >= uEdgeGridSize.x || g.y >= uEdgeGridSize.y) return vec2(sdR, sdC);
  ivec2 c = ivec2(floor(g));
  uvec4 s0 = texelFetch(uEdgeGrid, ivec2(c.x * 3, c.y), 0);
  if (s0.x == 0u) return vec2(sdR, sdC);
  uvec4 s1 = texelFetch(uEdgeGrid, ivec2(c.x * 3 + 1, c.y), 0);
  uvec4 s2 = s1.w == 0u ? uvec4(0u) : texelFetch(uEdgeGrid, ivec2(c.x * 3 + 2, c.y), 0);
  for (int k = 0; k < ${EDGE_SLOTS}; k++) {
    uint id = k < 4 ? s0[k] : k < 8 ? s1[k - 4] : s2[k - 8];
    if (id == 0u) break;
    int i = int(id) - 1;
    ivec2 at = ivec2(i % ${EDGE_TEX_W}, (i / ${EDGE_TEX_W}) * 2);
    vec4 A = texelFetch(uEdgeTex, at, 0);
    vec2 ab = A.zw - A.xy;
    float t = clamp(dot(p - A.xy, ab) / max(dot(ab, ab), 1e-3), 0.0, 1.0);
    float d = length(p - A.xy - ab * t);
    vec4 W = texelFetch(uEdgeTex, at + ivec2(0, 1), 0);
    float hw = mix(W.x, W.y, t);
    if (W.z < 0.5) sdR = min(sdR, d - hw);
    else sdC = min(sdC, d - hw + 1.2);
  }
  return clamp(vec2(sdR, sdC), -4.0, 4.0);
}

// The baked texel at p (road and canal distances, the two field noises):
// false where neither level covers p.
bool cBake(vec2 p, out vec4 t) {
  vec2 u = (p - uBakeRect0.xy) / uBakeRect0.z;
  if (uBakeRect0.w > 0.5 && min(u.x, u.y) > 0.002 && max(u.x, u.y) < 0.998) { t = textureLod(uBake0, u, 0.0); return true; }
  u = (p - uBakeRect1.xy) / uBakeRect1.z;
  if (uBakeRect1.w > 0.5 && min(u.x, u.y) > 0.002 && max(u.x, u.y) < 0.998) { t = textureLod(uBake1, u, 0.0); return true; }
  t = vec4(0.0);
  return false;
}
// cEdge from the baked distances (one texture read instead of the segment
// loop); junctions come out as one outline.
vec3 cEdgeFrom(vec4 t, float px) {
  float sdR = t.r * 8.0 - 4.0, sdC = t.g * 8.0 - 4.0;
  return vec3(1.0 - smoothstep(-px - 0.05, px + 0.05, sdR), 1.0 - smoothstep(-px, px, sdC), sdR < 2.5 ? sdR : 1e3);
}
vec3 cEdgeAt(vec2 p, float px) {
  vec4 t;
  return cBake(p, t) ? cEdgeFrom(t, px) : cEdge(p, px);
}

float countryWeight(vec2 p) {
  float d = cEdgeDist(p);
  cEdD = d;
  if (d < -${(FEATHER_IN + FEATHER_NOISE).toFixed(1)}) return 0.0;
  if (d > ${(FEATHER_OUT + FEATHER_NOISE / 2 + 1).toFixed(1)}) return 1.0;
  float n = (cNoise(p * 0.012) + 0.5 * cNoise(p * 0.05 + vec2(17.0, 3.0))) / 1.5;
  float cw = smoothstep(-${FEATHER_IN.toFixed(1)}, ${FEATHER_OUT.toFixed(1)}, d + (n - 0.5) * ${FEATHER_NOISE.toFixed(1)});
  // the roads and canals running off the map are fully country from the edge on
  if (cw < 1.0 && d > -16.0 && d < 90.0) {
    vec3 e = cEdgeAt(p, 0.5);
    cw = max(cw, max(max(e.x, e.y), smoothstep(-0.5, 0.5, cRealWater(p))));
  }
  return cw;
}

vec3 countryAlbedo(vec2 p, float cw, inout float sRough, inout float sDip) {
  float px = length(fwidth(p));
  vec4 bk;
  bool baked = cBake(p, bk);
  float detail = 1.0 - smoothstep(0.05, 0.6, px);
  vec2 bf = floor(p / C_BLOCK);
  int bx = int(bf.x), by = int(bf.y);
  vec2 l = p - bf * C_BLOCK;
  bool rot = cHash(bx * 7 + 3, by * 13 + 1) < 0.5;
  float a = rot ? l.y : l.x, b = rot ? l.x : l.y;
  int col = int(floor(a / C_PW));
  float off = cHash(col + bx * 131 + by * 977, rot ? 18 : 17) * C_PL;
  int row = int(floor((b + off) / C_PL));
  float b0 = max(0.0, float(row) * C_PL - off), b1 = min(C_BLOCK, float(row + 1) * C_PL - off);
  float a0 = float(col) * C_PW;
  float dA = min(a - a0, a0 + C_PW - a);
  float dB = min(b - b0, b1 - b);
  float dD = min(dA, dB);
  float dM = min(min(l.x, C_BLOCK - l.x), min(l.y, C_BLOCK - l.y));
  float seed = cHash(col * 7 + bx * 1009, row * 13 + by * 2003 + 1);
  float seed2 = fract(seed * 7.31);
  bool inReal = cReal(bx, by);
  float urb = inReal ? cUrban(p) : 0.0;
  // thin ditches fade in over the first few hundred metres past the city
  float edD = cEdD;
  float keepD = 1.0;
  float ramp = smoothstep(20.0, 450.0, edD);
  keepD = 1.0 - urb;
  if (ramp < 1.0) {
    if (dA < dB) { int ci = (a - a0 < a0 + C_PW - a) ? col : col + 1; keepD = step(cHash(ci + bx * 131 + 5, by * 977 + 61), ramp); }
    else { int ri = (b - b0 < b1 - b) ? row : row + 1; keepD = step(cHash(col * 31 + bx * 7 + ri * 131, by * 977 + 71), ramp); }
    keepD *= 1.0 - urb;
  }

  float n1 = baked ? bk.b : cNoise(p * 0.03), n2 = baked ? bk.a : cNoise(p * 0.13 + 5.0), n3 = cNoise(p * 0.55 + 9.0);
  vec3 grassA = cLin(88.0, 122.0, 54.0), grassB = cLin(79.0, 114.0, 52.0), grassC = cLin(104.0, 138.0, 62.0);
  vec3 c = seed < 0.35 ? grassA : (seed < 0.7 ? grassB : grassC);
  c *= 0.86 + 0.26 * (n1 * 0.6 + n2 * 0.4);
  if (seed2 < 0.3) {
    // freshly mown: light/dark stripes along the strip
    float st = smoothstep(-0.25, 0.25, sin(a / 3.2 * 3.14159)) - 0.5;
    c *= 1.0 + st * 0.12 * (1.0 - smoothstep(0.3, 2.5, px));
  } else if (seed2 < 0.37) {
    // hay drying in windrows
    c = mix(c, cLin(156.0, 145.0, 83.0), 0.45 + 0.2 * n2);
    float wr = 1.0 - smoothstep(0.3, 0.9, abs(fract(a / 5.0) - 0.5) * 5.0);
    c = mix(c, cLin(176.0, 160.0, 92.0), wr * 0.55 * (1.0 - smoothstep(0.3, 2.0, px)));
  } else if (seed2 < 0.405) {
    // ploughed arable strip: furrows along b
    vec3 soil = mix(cLin(107.0, 90.0, 68.0), cLin(86.0, 71.0, 56.0), n2);
    float fu = abs(fract(a / 0.8) - 0.5) * 2.0;
    soil *= 1.0 - (1.0 - smoothstep(0.2, 0.7, fu)) * 0.18 * (1.0 - smoothstep(0.1, 0.6, px));
    c = soil;
    sRough += 0.03;
  } else if (seed2 < 0.44) {
    // young crop rows
    float fu = abs(fract(a / 0.75) - 0.5) * 2.0;
    vec3 soil = cLin(100.0, 86.0, 64.0);
    vec3 crop = cLin(96.0, 136.0, 58.0) * (0.9 + 0.2 * n3);
    float rowMask = smoothstep(0.35, 0.65, fu);
    c = mix(mix(soil, crop, 0.55), mix(soil, crop, rowMask), 1.0 - smoothstep(0.1, 0.8, px));
  } else {
    // pasture: tussocks, clover, the odd molehill
    float tus = smoothstep(0.55, 0.8, cNoise(p * 0.9 + seed * 50.0));
    c = mix(c, c * vec3(0.82, 0.9, 0.78), tus * 0.5 * detail);
    c = mix(c, cLin(150.0, 146.0, 88.0), smoothstep(0.7, 0.9, n2 * 0.7 + n3 * 0.3) * 0.25);
    vec2 mc = floor(p / 6.0);
    float mh = cHash(int(mc.x) + 3001, int(mc.y) - 77);
    vec2 mo = (vec2(cHash(int(mc.x), int(mc.y) + 5), cHash(int(mc.x) + 9, int(mc.y))) - 0.5) * 4.0;
    float md = length(p - (mc + 0.5) * 6.0 - mo);
    float mole = step(mh, 0.035) * (1.0 - smoothstep(0.25, 0.45, md));
    c = mix(c, cLin(92.0, 74.0, 56.0), mole * detail);
  }
  c *= 1.0 + (n3 - 0.5) * 0.1 * detail;

  // wierde village: tidy lawns and gardens instead of parcels
  vec3 vA = cVillage(bx, by), vB = cVillage(bx + 1, by);
  vec3 vv = vA.z > 0.0 && length(p - vA.xy) < vA.z ? vA : vB;
  float vd = vv.z > 0.0 ? length(p - vv.xy) / vv.z : 2.0;
  float vil = 1.0 - smoothstep(0.82, 1.0, vd);
  float lawnW = max(vil, urb);
  if (lawnW > 0.0) {
    float gard = smoothstep(0.55, 0.75, cNoise(p * 0.08 + 31.0));
    vec3 lawn = mix(cLin(92.0, 132.0, 58.0), cLin(84.0, 112.0, 60.0), gard) * (0.9 + 0.2 * n3);
    c = mix(c, lawn, lawnW);
  }

  // lush darker verge along every ditch
  float hw = C_DITCH;
  float verge = (1.0 - smoothstep(hw, hw + 1.4, dD)) * (1.0 - vil) * keepD;
  float vergeM = (1.0 - smoothstep(C_MAIN, C_MAIN + 2.0, dM)) * (1.0 - lawnW);
  c = mix(c, cLin(62.0, 94.0, 42.0) * (0.85 + 0.3 * n3), max(verge, vergeM) * 0.75);

  // polder roads just inside some block edges
  bool rx = cRoad(bx, by, 0);
  bool ry = cRoad(bx, by, 1);
  float drV = rx ? abs(l.x - (C_ROAD_IN + C_ROAD_W * 0.5)) : 1e3;
  float drH = ry ? abs(l.y - (C_ROAD_IN + C_ROAD_W * 0.5)) : 1e3;
  float dr = min(drV, drH);
  bool contV = rx && cRoad(bx, l.y < C_BLOCK * 0.5 ? by - 1 : by + 1, 0);
  bool contH = ry && cRoad(l.x < C_BLOCK * 0.5 ? bx - 1 : bx + 1, by, 1);
  float dCont = min(contV ? drV : 1e3, contH ? drH : 1e3);
  float roadM = 1.0 - smoothstep(C_ROAD_W * 0.5 - px, C_ROAD_W * 0.5 + px, dr);
  float shoulder = (1.0 - smoothstep(C_ROAD_W * 0.5 + 0.2, C_ROAD_W * 0.5 + 0.9, dr)) * (1.0 - roadM);
  c = mix(c, cLin(128.0, 116.0, 92.0) * (0.85 + 0.3 * n3), shoulder * 0.8);
  if (roadM > 0.0) {
    float ar = 0.0;
    float edgeLine = (1.0 - smoothstep(0.075, 0.075 + px, abs(dr - (C_ROAD_W * 0.5 - 0.35)))) * detail;
    vec3 asphalt = cPaint(cAsphalt(p, px, C_ROAD_W * 0.5 - dr, C_ROAD_W * 0.5, ar), p, edgeLine);
    c = mix(c, asphalt, roadM);
    sRough += ar * roadM;
  }
  sDip += roadM * 0.4 - 0.2;

  // roads and canals carried on from the city
  vec3 ce = vec3(0.0, 0.0, 1e3);
  if (edD > -20.0) ce = baked ? cEdgeFrom(bk, px) : cEdge(p, px);
  // round the player the tiles' water is the water: no old canals
  float tw = cTileWater(p);
  bool tiled = tw >= 0.0;
  if (tiled) ce.y = 0.0;
  // verge along the real roads: a gravel berm out in the polder, a kerb
  // and a strip of the city's pavement tiles in town
  if (ce.z > 0.0 && ce.z < 2.0 && ce.y < 0.5) {
    float bw = mix(0.9, 1.6, urb);
    float berm = (1.0 - smoothstep(bw - 0.6, bw, ce.z)) * (1.0 - ce.x);
    vec3 bc = mix(cLin(128.0, 116.0, 92.0) * (0.85 + 0.3 * n3), cLin(131.0, 126.0, 116.0) * (0.9 + 0.2 * n3), urb);
    bc = mix(bc, cLin(168.0, 164.0, 156.0), urb * (1.0 - smoothstep(0.15, 0.15 + px, ce.z)));
    c = mix(c, bc, berm * mix(0.8, 1.0, urb));
  }
  if (ce.x > 0.0) {
    float ar = 0.0;
    vec3 asph = cAsphalt(p, px, -ce.z, 3.5, ar);
    float paint = (1.0 - smoothstep(0.075, 0.075 + px, abs(ce.z + 0.35))) * detail;
    if (px < 1.2 && ce.x > 0.5) {
      // the red asphalt carries further out than the white paint
      vec2 mk = cMark(p, px) * vec2(1.0 - smoothstep(0.2, 0.4, px), 1.0 - smoothstep(0.8, 1.2, px));
      asph = mix(asph, cLin(130.0, 59.0, 45.0) * (0.9 + 0.2 * n3), mk.y * 0.9);
      paint = max(paint, mk.x);
    }
    asph = cPaint(asph, p, paint);
    c = mix(c, asph, ce.x);
    sRough += ar * ce.x;
    roadM = max(roadM, ce.x);
  }

  // village streets in red klinkers
  if (vil > 0.0) {
    float vr = length(p - vv.xy);
    float dS = abs(vr - ${VILLAGE_RING.toFixed(1)});
    float spX = p.x - (vv.x - ${VILLAGE_X.toFixed(2)} + C_ROAD_IN);
    if (spX > 0.0 && p.x < vv.x - ${VILLAGE_RING.toFixed(1)}) dS = min(dS, abs(p.y - vv.y) + 0.3);
    float st = (1.0 - smoothstep(2.4 - px, 2.6 + px, dS)) * vil;
    vec3 klinker = cLin(132.0, 72.0, 58.0) * (0.85 + 0.25 * n3);
    float herr = abs(fract((p.x + p.y) * 2.2) - 0.5);
    klinker *= 1.0 - 0.08 * smoothstep(0.35, 0.5, herr) * detail;
    c = mix(c, klinker, st);
    sRough -= st * 0.06;
  }

  // ditch water (the wide main ditches win over the road verges)
  float culvert = 1.0 - smoothstep(C_ROAD_W * 0.5 + 0.8, C_ROAD_W * 0.5 + 1.6, dr);
  float culvM = 1.0 - smoothstep(C_ROAD_W * 0.5 + 0.2, C_ROAD_W * 0.5 + 0.9, dCont);
  float dQ = 1e3;
  if (!inReal) {
    if (cMaarX(bx)) dQ = min(dQ, l.x);
    if (cMaarX(bx + 1)) dQ = min(dQ, C_BLOCK - l.x);
    if (cMaarY(by)) dQ = min(dQ, l.y);
    if (cMaarY(by + 1)) dQ = min(dQ, C_BLOCK - l.y);
  }
  float rw = !tiled && (inReal || edD < 400.0) ? cRealWater(p) : -99.0;
  float wR = (1.0 - smoothstep(-px - 0.25, px + 0.25, -rw)) * (1.0 - roadM);
  float dry = (1.0 - vil) * (1.0 - urb) * (1.0 - smoothstep(-3.0, -1.0, rw));
  float dryE = 1.0 - ce.x;
  float wD = (1.0 - smoothstep(hw * 0.72 - px, hw * 0.72 + px, dD)) * (1.0 - culvert) * dry * keepD * dryE;
  float wM = (1.0 - smoothstep(C_MAIN * 0.8 - px, C_MAIN * 0.8 + px, dM)) * (1.0 - culvM) * dry * dryE;
  float wQ = (1.0 - smoothstep(C_MAAR_WATER - px, C_MAAR_WATER + px, dQ)) * dryE;
  float wC = max(ce.y * (1.0 - roadM), wR);
  wQ = max(wQ, wC);
  float water = max(max(wD, wM), wQ) * smoothstep(0.86, 0.98, max(cw, wC));
  if (tiled) { wD = 0.0; wM = 0.0; wQ = 0.0; water = smoothstep(0.35, 0.6, tw) * smoothstep(0.86, 0.98, cw); }
  float bank = max(max((1.0 - smoothstep(hw * 0.72, hw, dD)) * (1.0 - culvert) * keepD, (1.0 - smoothstep(C_MAIN * 0.8, C_MAIN, dM)) * (1.0 - culvM)) * dry * dryE, max((1.0 - smoothstep(C_MAAR_WATER, C_MAAR, dQ)) * dryE, (1.0 - smoothstep(0.0, 2.2, -rw)) * (1.0 - roadM))) * (1.0 - water);
  c = mix(c, cLin(70.0, 72.0, 44.0) * (0.8 + 0.3 * n3), bank * 0.8 * smoothstep(0.86, 0.98, cw));
  // ditches lie deeper than the field (the one water rule: waded, 0.6 m):
  // a shadowed inner slope just above the water line
  float lip = max((1.0 - smoothstep(hw * 0.72, hw * 0.92, dD)) * (1.0 - culvert) * keepD, (1.0 - smoothstep(C_MAIN * 0.8, C_MAIN * 0.95, dM)) * (1.0 - culvM)) * dry * dryE * (1.0 - water);
  c *= 1.0 - 0.34 * lip * smoothstep(0.86, 0.98, cw);
  // the tiles' water near the player is the real surface below (tilewatermask.js)
  vec2 qR = abs(p - uCountryRect.xy) - uCountryRect.zw;
  if (tw > 0.35 && max(qR.x, qR.y) > 0.0 && length(p - uWaterNear.xy) < uWaterNear.z) discard;
  // the city water's shallow / deep tones (water3d.js), glossy so the sky
  // reflects in it; a slow drifting sheen where it is not weed
  vec3 wc = mix(cLin(44.0, 74.0, 56.0), cLin(11.0, 36.0, 32.0), 0.35 + 0.4 * n2 + 0.25 * wQ);
  float weed = smoothstep(0.62, 0.8, cNoise(p * 0.35 + 40.0) * 0.7 + n3 * 0.3) * (1.0 - wQ * 0.8);
  wc = mix(wc, cLin(93.0, 127.0, 44.0) * 0.8, weed * 0.75);
  float sheen = cNoise(p * 0.45 + vec2(uWaterNear.w * 0.21, -uWaterNear.w * 0.17)) * cNoise(p * 0.9 - uWaterNear.w * 0.13);
  wc *= 0.92 + 0.22 * sheen * (1.0 - weed) * detail;
  // darker towards the middle of a ditch: the water has depth
  float deepT = max(wD * (1.0 - smoothstep(0.0, hw * 0.72, dD)), wM * (1.0 - smoothstep(0.0, C_MAIN * 0.8, dM)));
  wc *= 1.0 - 0.36 * deepT * (1.0 - wQ);
  c = mix(c, wc, water);
  sRough -= water * (1.0 - weed) * 0.86;
  sDip -= water;
  return c;
}
`;
