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

const FEATHER_IN = 180;
const FEATHER_OUT = 20;
const FEATHER_NOISE = 110;

const rect = { cx: 0, cy: 0, hx: 1e9, hy: 1e9 };

export function setCountryBounds(bounds) {
  const [minx, miny, maxx, maxy] = bounds;
  rect.cx = (minx + maxx) / 2;
  rect.cy = (miny + maxy) / 2;
  rect.hx = (maxx - minx) / 2;
  rect.hy = (maxy - miny) / 2;
  COUNTRY_UNIFORMS.uCountryRect.value = [rect.cx, rect.cy, rect.hx, rect.hy];
}

export function countryRect() {
  return rect;
}

// Plain array (not a THREE.Vector4) so this file stays import-free; three
// accepts arrays for vec4 uniforms.
export const COUNTRY_UNIFORMS = {
  uCountryRect: { value: [0, 0, 1e9, 1e9] },
};

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
export function edgeDistance(x, y) {
  return Math.max(Math.abs(x - rect.cx) - rect.hx, Math.abs(y - rect.cy) - rect.hy);
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
  return chash(bx * 3 + s * 7919, by * 5 + 101) < 0.42;
}

// Parcel lookup; fills and returns a shared scratch object.
const P = {
  bx: 0, by: 0, rot: false, col: 0, row: 0, a: 0, b: 0,
  a0: 0, a1: 0, b0: 0, b1: 0, dDitch: 0, dMain: 0, road: false, seed: 0,
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
  P.bx = bx; P.by = by; P.rot = rot; P.col = col; P.row = row; P.a = a; P.b = b;
  P.a0 = a0; P.a1 = a1; P.b0 = b0; P.b1 = b1;
  P.dDitch = Math.min(a - a0, a1 - a, b - b0, b1 - b);
  P.dMain = Math.min(lx, BLOCK - lx, ly, BLOCK - ly);
  P.road = (edgeRoad(bx, by, 0) && lx > ROAD_IN && lx < ROAD_IN + ROAD_W)
    || (edgeRoad(bx, by, 1) && ly > ROAD_IN && ly < ROAD_IN + ROAD_W);
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
  const w = countryWeight(x, y);
  if (w < 0.5) return null;
  const p = parcelAt(x, y);
  const wet = w > 0.92;
  if (wet && p.dMain < MAIN_HW * 0.8) return 'sloot';
  if (p.road) return 'weg';
  if (wet && p.dDitch < DITCH_HW * 0.72) return 'sloot';
  return 'gras';
}

// Ground albedo for the countryside, blended into the terrain shader by
// countryWeight. Expects vec2 world xz; may adjust sRough (roughness delta)
// and sDip (puddle bias) declared by terrain3d's wet-ground code.
export const COUNTRY_GLSL = `
uniform vec4 uCountryRect;
const float C_BLOCK = ${BLOCK.toFixed(1)};
const float C_PW = ${PW.toFixed(1)};
const float C_PL = ${PL.toFixed(1)};
const float C_DITCH = ${DITCH_HW.toFixed(2)};
const float C_MAIN = ${MAIN_HW.toFixed(2)};
const float C_ROAD_IN = ${ROAD_IN.toFixed(1)};
const float C_ROAD_W = ${ROAD_W.toFixed(1)};

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

float countryWeight(vec2 p) {
  vec2 q = abs(p - uCountryRect.xy) - uCountryRect.zw;
  float d = max(q.x, q.y);
  if (d < -${(FEATHER_IN + FEATHER_NOISE).toFixed(1)}) return 0.0;
  float n = (cNoise(p * 0.012) + 0.5 * cNoise(p * 0.05 + vec2(17.0, 3.0))) / 1.5;
  return smoothstep(-${FEATHER_IN.toFixed(1)}, ${FEATHER_OUT.toFixed(1)}, d + (n - 0.5) * ${FEATHER_NOISE.toFixed(1)});
}

vec3 countryAlbedo(vec2 p, float cw, inout float sRough, inout float sDip) {
  float px = length(fwidth(p));
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

  float n1 = cNoise(p * 0.03), n2 = cNoise(p * 0.13 + 5.0), n3 = cNoise(p * 0.55 + 9.0);
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

  // lush darker verge along every ditch
  float hw = C_DITCH;
  float verge = 1.0 - smoothstep(hw, hw + 1.4, dD);
  float vergeM = 1.0 - smoothstep(C_MAIN, C_MAIN + 2.0, dM);
  c = mix(c, cLin(62.0, 94.0, 42.0) * (0.85 + 0.3 * n3), max(verge, vergeM) * 0.75);

  // polder roads just inside some block edges
  bool rx = cHash(bx * 3, by * 5 + 101) < 0.42;
  bool ry = cHash(bx * 3 + 7919, by * 5 + 101) < 0.42;
  float dr = 1e3;
  if (rx) dr = min(dr, abs(l.x - (C_ROAD_IN + C_ROAD_W * 0.5)));
  if (ry) dr = min(dr, abs(l.y - (C_ROAD_IN + C_ROAD_W * 0.5)));
  float roadM = 1.0 - smoothstep(C_ROAD_W * 0.5 - px, C_ROAD_W * 0.5 + px, dr);
  float shoulder = (1.0 - smoothstep(C_ROAD_W * 0.5 + 0.2, C_ROAD_W * 0.5 + 0.9, dr)) * (1.0 - roadM);
  vec3 asphalt = cLin(74.0, 74.0, 76.0) * (0.9 + 0.2 * n3);
  float edgeLine = (1.0 - smoothstep(0.08, 0.08 + px, abs(dr - (C_ROAD_W * 0.5 - 0.3)))) * detail;
  asphalt = mix(asphalt, cLin(214.0, 210.0, 198.0), edgeLine * 0.85);
  c = mix(c, cLin(128.0, 116.0, 92.0) * (0.85 + 0.3 * n3), shoulder * 0.8);
  c = mix(c, asphalt, roadM);
  sRough -= roadM * 0.1;
  sDip += roadM * 0.4 - 0.2;

  // ditch water (the wide main ditches win over the road verges)
  float culvert = 1.0 - smoothstep(C_ROAD_W * 0.5 + 0.8, C_ROAD_W * 0.5 + 1.6, dr);
  float wD = (1.0 - smoothstep(hw * 0.72 - px, hw * 0.72 + px, dD)) * (1.0 - culvert);
  float wM = 1.0 - smoothstep(C_MAIN * 0.8 - px, C_MAIN * 0.8 + px, dM);
  float water = max(wD, wM) * smoothstep(0.86, 0.98, cw);
  float bank = max((1.0 - smoothstep(hw * 0.72, hw, dD)) * (1.0 - culvert), 1.0 - smoothstep(C_MAIN * 0.8, C_MAIN, dM)) * (1.0 - water);
  c = mix(c, cLin(70.0, 72.0, 44.0) * (0.8 + 0.3 * n3), bank * 0.8 * smoothstep(0.86, 0.98, cw));
  vec3 wc = mix(cLin(22.0, 36.0, 36.0), cLin(30.0, 46.0, 40.0), n2);
  float weed = smoothstep(0.62, 0.8, cNoise(p * 0.35 + 40.0) * 0.7 + n3 * 0.3);
  wc = mix(wc, cLin(98.0, 128.0, 44.0), weed * 0.8);
  c = mix(c, wc, water);
  sRough -= water * (1.0 - weed) * 0.12;
  sDip -= water;
  return c;
}
`;

// Minimap: meadow green past the map edge with the ditch grid and polder
// roads, drawn in world units into an already world-transformed context.
export function drawCountryMinimap(ctx, x0, y0, x1, y1) {
  if (edgeDistance(x0, y0) < 0 && edgeDistance(x1, y1) < 0 && edgeDistance(x0, y1) < 0 && edgeDistance(x1, y0) < 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, x1 - x0, y1 - y0);
  ctx.rect(rect.cx - rect.hx, rect.cy - rect.hy, rect.hx * 2, rect.hy * 2);
  ctx.clip('evenodd');
  ctx.fillStyle = '#4f7a3e';
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.strokeStyle = '#3f7f95';
  for (let bx = Math.floor(x0 / BLOCK); bx * BLOCK < x1; bx++) {
    for (let by = Math.floor(y0 / BLOCK); by * BLOCK < y1; by++) {
      const ox = bx * BLOCK, oy = by * BLOCK;
      const rot = chash(bx * 7 + 3, by * 13 + 1) < 0.5;
      const line = (a0, b0, a1, b1) => {
        const [xa, ya] = blockToWorld(bx, by, rot, a0, b0), [xb, yb] = blockToWorld(bx, by, rot, a1, b1);
        if (Math.max(xa, xb) < x0 || Math.min(xa, xb) > x1 || Math.max(ya, yb) < y0 || Math.min(ya, yb) > y1) return;
        ctx.moveTo(xa, ya);
        ctx.lineTo(xb, yb);
      };
      ctx.lineWidth = MAIN_HW * 2;
      ctx.beginPath();
      ctx.rect(ox, oy, BLOCK, BLOCK);
      ctx.stroke();
      ctx.lineWidth = Math.max(1.6, DITCH_HW * 2);
      ctx.beginPath();
      for (let col = 1; col < BLOCK / PW; col++) {
        line(col * PW, 0, col * PW, BLOCK);
        const off = chash(col - 1 + bx * 131 + by * 977, rot ? 18 : 17) * PL;
        for (let row = 1; row * PL - off < BLOCK; row++) {
          const b = row * PL - off;
          if (b > 0) line((col - 1) * PW, b, col * PW, b);
        }
      }
      ctx.stroke();
      ctx.strokeStyle = '#a8ada2';
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (edgeRoad(bx, by, 0)) { ctx.moveTo(ox + ROAD_IN + ROAD_W / 2, oy); ctx.lineTo(ox + ROAD_IN + ROAD_W / 2, oy + BLOCK); }
      if (edgeRoad(bx, by, 1)) { ctx.moveTo(ox, oy + ROAD_IN + ROAD_W / 2); ctx.lineTo(ox + BLOCK, oy + ROAD_IN + ROAD_W / 2); }
      ctx.stroke();
      ctx.strokeStyle = '#3f7f95';
    }
  }
  ctx.restore();
}
