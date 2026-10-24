import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { applyWetGround, WET_UNIFORMS } from './terrain3d.js';
import { applyCutMask } from './cutmask3d.js';
import { onSettingsChange, QUALITY_PRESETS } from './settings.js';
import { pointInPolygon, markInstancesDirty } from './util.js';
import { getWaterIndex } from './waterindex.js';
import { dryIndices } from './greenwater.js';

// Green areas: merged per-chunk lawn surfaces with a procedural world-space
// grass shader, translucent kerb/path wear strips along their borders, and
// instanced 3D tufts, flowers, shrubs and hedges streamed around the camera.

const GREEN_Y = 0.015;
const CHUNK = 64;
export const CELL = 10;
const SIDEWALK_CATS = new Set(['major', 'normal', 'minor']);
const SIDEWALK_EXTRA = 1.8;

// prio orders overlapping kinds (a pitch inside a park); layer gives every
// kind its own polygonOffset step so no two kinds ever share a depth.
const KINDS = {
  park: { prio: 1, layer: 0, base: 0x4f7234, dry: 0.45, moss: 0.6, worn: 0.3, litter: 0, mow: 0.8, wild: 0.08, tuft: 1.3, flower: 0.05, shrub: 0, hedge: 0.3 },
  meadow: { prio: 2, layer: 1, base: 0x557434, dry: 0.9, moss: 0.3, worn: 0.05, litter: 0, mow: 0, wild: 1, tuft: 3.6, flower: 0.5, shrub: 0.002, hedge: 0 },
  forest: { prio: 3, layer: 2, base: 0x405e2c, dry: 0.1, moss: 1, worn: 0.15, litter: 1, mow: 0, wild: 0.15, tuft: 0.9, flower: 0, shrub: 0.05, hedge: 0 },
  grass: { prio: 4, layer: 3, base: 0x4f7234, dry: 0.55, moss: 0.5, worn: 0.2, litter: 0, mow: 0.6, wild: 0.2, tuft: 1.8, flower: 0.08, shrub: 0, hedge: 0.08 },
  garden: { prio: 5, layer: 4, base: 0x4f7234, dry: 0.35, moss: 0.5, worn: 0.15, litter: 0, mow: 0.7, wild: 0.15, tuft: 1.4, flower: 0.12, shrub: 0.01, hedge: 0.5 },
  cemetery: { prio: 5, layer: 5, base: 0x4d7133, dry: 0.2, moss: 0.6, worn: 0.05, litter: 0.15, mow: 1, wild: 0, tuft: 0.7, flower: 0.02, shrub: 0.006, hedge: 0.6 },
  playground: { prio: 6, layer: 6, base: 0x527334, dry: 0.8, moss: 0.3, worn: 0.85, litter: 0, mow: 0.3, wild: 0.05, tuft: 0.7, flower: 0.02, shrub: 0, hedge: 0.2 },
  dog_park: { prio: 6, layer: 7, base: 0x517234, dry: 0.8, moss: 0.3, worn: 0.75, litter: 0, mow: 0.2, wild: 0.1, tuft: 1, flower: 0.03, shrub: 0, hedge: 0.2 },
  outdoor_seating: { prio: 6, layer: 8, base: 0x4f7234, dry: 0.6, moss: 0.3, worn: 0.6, litter: 0, mow: 0.3, wild: 0, tuft: 0, flower: 0, shrub: 0, hedge: 0 },
  pitch: { prio: 7, layer: 9, base: 0x4b7432, dry: 0.1, moss: 0.2, worn: 0.3, litter: 0, mow: 1, wild: 0, tuft: 0.25, flower: 0, shrub: 0, hedge: 0, stripe: 5 },
};
const kindOf = (g) => KINDS[g.kind] || KINDS.grass;

const DRY = new THREE.Color(0x9c9153);
const MOSS = new THREE.Color(0x3b5a2c);
const SOIL = new THREE.Color(0x6b5a44);
const LITTER = new THREE.Color(0x4f4529);
const LAWN = new THREE.Color(0x4a6c31);
const EDGE = new THREE.Color(0x3b5529);

// ---------------------------------------------------------------- hashing

function hashi(x, y) {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul((y | 0) + 0x165667b1, 0x85ebca77);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hashi(ix, iy), b = hashi(ix + 1, iy), c = hashi(ix, iy + 1), d = hashi(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function rng(seed) {
  let s = (seed * 4294967296) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- polygon analysis

function ringOf(pts) {
  const n = pts.length;
  return n > 1 && pts[0][0] === pts[n - 1][0] && pts[0][1] === pts[n - 1][1] ? pts.slice(0, n - 1) : pts;
}

function polyInfo(g) {
  if (g._gInfo) return g._gInfo;
  const ring = ringOf(g.pts);
  const n = ring.length;
  let area = 0, per = 0, best = 0, ang = 0, cx = 0, cy = 0;
  for (let i = 0; i < n; i++) {
    const a = ring[i], b = ring[(i + 1) % n];
    area += a[0] * b[1] - b[0] * a[1];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    per += l;
    if (l > best) { best = l; ang = Math.atan2(b[1] - a[1], b[0] - a[0]); }
    cx += a[0]; cy += a[1];
  }
  const K = kindOf(g);
  const h = hashi(Math.round(cx / n * 7), Math.round(cy / n * 7));
  const absA = Math.abs(area) / 2;
  let mow = K.mow, wild = K.wild;
  if (g.kind === 'grass' || !KINDS[g.kind]) {
    if (absA < 250) { mow = 0.25; wild = 0.15; }
    else if (h < 0.55) { mow = 1; wild = 0.05; }
    else if (h < 0.8) { mow = 0.35; wild = 0.3; }
    else { mow = 0; wild = 0.85; }
  }
  return g._gInfo = {
    ring, sign: area > 0 ? 1 : -1, area: absA, width: per > 0 ? (2 * absA) / per : 0,
    angle: ang, hash: h, mow, wild, K,
  };
}

function inPoly(x, y, g) {
  const b = g.bounds;
  if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) return false;
  return pointInPolygon(x, y, g.pts);
}

// Per edge: inward normal and whether the outside is another green area
// (no kerb wear or edge tufts on green-to-green seams).
function polyEdges(g, map) {
  if (g._gEdges) return g._gEdges;
  const { ring, sign } = polyInfo(g);
  const n = ring.length;
  const out = [];
  const near = map.greenNear((g.bounds[0] + g.bounds[2]) / 2, (g.bounds[1] + g.bounds[3]) / 2,
    Math.max(g.bounds[2] - g.bounds[0], g.bounds[3] - g.bounds[1]) / 2 + 2).filter((o) => o !== g);
  for (let i = 0; i < n; i++) {
    const a = ring[i], b = ring[(i + 1) % n];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (len < 1e-3) { out.push(null); continue; }
    const nx = (-dy / len) * sign, ny = (dx / len) * sign;
    const mx = (a[0] + b[0]) / 2 - nx * 0.7, my = (a[1] + b[1]) / 2 - ny * 0.7;
    const seam = near.some((o) => inPoly(mx, my, o));
    out.push({ a, b, len, nx, ny, seam, h: hashi(Math.round(a[0] * 3), Math.round(a[1] * 3)) });
  }
  return g._gEdges = out;
}

function roadClear(r) {
  return r.width / 2 + (SIDEWALK_CATS.has(r.cat) ? SIDEWALK_EXTRA : 0);
}

// ---------------------------------------------------------------- surface shaders

const GLSL_NOISE = `
float gHash(vec2 p) {
  uvec2 q = uvec2(ivec2(floor(p)));
  uint h = (q.x * 1597334677u) ^ (q.y * 3812015801u);
  h ^= h >> 16; h *= 2246822519u; h ^= h >> 13; h *= 3266489917u; h ^= h >> 16;
  return float(h) * (1.0 / 4294967295.0);
}
float gNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(gHash(i), gHash(i + vec2(1.0, 0.0)), u.x), mix(gHash(i + vec2(0.0, 1.0)), gHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
uniform vec3 uGDry, uGMoss, uGSoil, uGLitter, uGEdge, uGLawn;
`;

const FILL_COLOR = `
{
  vec2 p = vWetXZ;
  float px = length(fwidth(p));
  float fa = 1.0 - smoothstep(0.004, 0.03, px);
  float fb = 1.0 - smoothstep(0.03, 0.2, px);
  float n1 = gNoise(p * 0.035), n2 = gNoise(p * 0.11 + 7.3), n3 = gNoise(p * 0.47 + 3.1);
  float macro = n1 * 0.6 + n2 * 0.4;
  vec3 c = diffuseColor.rgb * (0.78 + 0.44 * macro);
  c *= mix(vec3(1.0), vec3(1.06, 1.04, 0.82), smoothstep(0.5, 0.85, n2) * 0.6);
  float dry = smoothstep(0.6, 0.8, gNoise(p * 0.075 + 13.0) * 0.65 + n3 * 0.35) * uGP.x;
  c = mix(c, uGDry, dry * 0.6);
  float moss = smoothstep(0.58, 0.78, gNoise(p * 0.21 + 31.0) * 0.75 + n3 * 0.25) * uGP.y;
  c = mix(c, uGMoss, moss * 0.5);
  vec2 sd = vec2(cos(vGrass.x), sin(vGrass.x));
  vec2 sp = vec2(dot(p, sd), dot(p, vec2(-sd.y, sd.x)));
  float stripe = (smoothstep(-0.3, 0.3, sin(sp.y / uGP2.x * 3.14159)) - 0.5) * vGrass.z * uGP2.y;
  c *= 1.0 + stripe * 0.13;
  sRough += stripe * 0.14;
  float g1 = 0.5, g2 = 0.5;
#ifdef GRASS_BUMP
  if (fb > 0.0) {
    g1 = gNoise(mix(p * 9.0, sp * vec2(2.5, 16.0), vGrass.z));
    g2 = gNoise(p * 31.0 + 5.0);
  }
#endif
  float grain = g1 * 0.6 + g2 * 0.4 - 0.5;
  c *= 1.0 + grain * (0.2 * fb + 0.12 * fa);
  sHeight += grain * 0.006 * fa + (n3 - 0.5) * 0.02;
  sRough += (n3 - 0.5) * 0.1 - moss * 0.06 + dry * 0.04;
  float worn = smoothstep(0.7, 0.86, gNoise(p * 0.06 + 50.0) * 0.6 + (1.0 - n3) * 0.25 + g1 * 0.15) * uGP.z;
  c = mix(c, uGSoil * (0.85 + 0.3 * n3), worn * 0.8);
  sHeight -= worn * 0.015;
  sDip += worn * 0.9 - 0.45;
  if (uGP.w > 0.0) {
    float lc = gHash(p * 7.0);
    float lit = smoothstep(0.4, 0.75, gNoise(p * 0.3 + 70.0) * 0.6 + gNoise(p * 2.1) * 0.4) * uGP.w;
    c = mix(c, uGLitter * (0.7 + 0.6 * lc), lit * 0.65);
    sHeight += lit * (lc - 0.5) * 0.01 * fa;
  }
  float fl = vGrass.w * uGP2.z;
  vec2 fc = p * 6.0;
  float fw = fwidth(fc.x);
#ifdef GRASS_BUMP
  if (fl > 0.0 && fw < 0.2) {
    vec2 fi = floor(fc), ff = fract(fc) - 0.5;
    float cl = smoothstep(0.35, 0.8, n2 * 0.5 + n3 * 0.5);
    float on = step(gHash(fi + 17.0), fl * 0.3 * cl * cl);
    vec2 off = (vec2(gHash(fi + 3.1), gHash(fi + 7.7)) - 0.5) * 0.5;
    float d = length(ff - off);
    float m = on * (1.0 - smoothstep(0.1 - fw, 0.1 + fw, d)) * (1.0 - smoothstep(0.08, 0.2, fw));
    float ft = gHash(fi + 11.3);
    vec3 fcol = ft < 0.55 ? vec3(0.8, 0.8, 0.76) : (ft < 0.85 ? vec3(0.85, 0.6, 0.03) : vec3(0.38, 0.22, 0.5));
    if (ft < 0.55) fcol = mix(vec3(0.85, 0.58, 0.05), fcol, smoothstep(0.035, 0.05, d));
    c = mix(c, fcol, m * fb);
    sRough -= m * 0.1;
  }
#endif
  c = mix(c, vec3(0.7, 0.68, 0.42), fl * 0.03 * (1.0 - fb));
  diffuseColor.rgb = c;
}
`;

const BUMP = `
#ifdef GRASS_BUMP
{
  float bh = sHeight * (1.0 - puddle);
  vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition);
  vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx);
  float det = dot(dpx, r1);
  vec3 grad = sign(det) * (dFdx(bh) * r1 + dFdy(bh) * r2);
  normal = normalize(abs(det) * normal - grad);
}
#endif
`;

const FILL_SURF = {
  key: 'grass1',
  vertexCommon: 'attribute vec4 aGrass;\nvarying vec4 vGrass;\n',
  vertexMain: 'vGrass = aGrass;\n',
  fragmentCommon: GLSL_NOISE + 'varying vec4 vGrass;\nuniform vec4 uGP, uGP2;\n',
  color: FILL_COLOR,
  normal: BUMP,
};

const EDGE_SURF = {
  key: 'grassedge1',
  vertexCommon: 'attribute vec2 aEdge;\nvarying vec2 vEdge;\n',
  vertexMain: 'vEdge = aEdge;\n',
  fragmentCommon: GLSL_NOISE + 'varying vec2 vEdge;\n',
  color: `
{
  vec2 p = vWetXZ;
  float n = gNoise(p * 1.1) * 0.55 + gNoise(p * 3.7 + 4.0) * 0.3 + gNoise(p * 13.0) * 0.15;
  float k = clamp(1.0 - vEdge.x, 0.0, 1.0);
  float a;
  vec3 c;
  if (vEdge.y < 0.5) {
    a = pow(k, 1.6) * (0.3 + 0.6 * n);
    c = mix(uGEdge, uGSoil, smoothstep(0.55, 0.85, n) * k * 0.7);
  } else if (vEdge.y > 1.5) {
    a = smoothstep(0.15, 0.85, k + (n - 0.5) * 0.9) * 0.9;
    c = uGLawn;
  } else {
    a = smoothstep(0.0, 0.9, k) * smoothstep(0.3, 0.65, n + k * 0.45) * 0.9;
    c = mix(uGSoil, uGDry, n * 0.5);
    sDip += a * 0.6;
  }
  diffuseColor.rgb = c * (0.85 + 0.3 * n);
  diffuseColor.a = a;
}
`,
  normal: '',
};

const SHARED_UNIFORMS = {
  uGDry: { value: DRY }, uGMoss: { value: MOSS }, uGSoil: { value: SOIL }, uGLitter: { value: LITTER }, uGEdge: { value: EDGE }, uGLawn: { value: LAWN },
};

const GRASS_MATS = [];
function withUniforms(m, surf, own) {
  applyWetGround(m, surf);
  const wet = m.onBeforeCompile;
  m.onBeforeCompile = (shader, r) => {
    Object.assign(shader.uniforms, SHARED_UNIFORMS, own);
    wet(shader, r);
  };
  m.userData.shared = true;
  applyCutMask(m, 'vWetXZ');
  GRASS_MATS.push(m);
  return m;
}

// Depth steps: above the far-LOD green (factor -0.2 / units -0.8, which
// overlaps near chunks in the LOD ring), below the edge strips and the
// sidewalk layer (-2 / -8). sub = half step for a polygon that overlaps an
// earlier one of the same kind.
const FILL_OFFSET = { factor: 0.36, units: 1.6, factorStep: 0.1, unitsStep: 0.6 };
const fillMats = new Map();
function fillMaterial(kind, sub = 0) {
  const K = KINDS[kind] || KINDS.grass;
  const key = K.layer * 2 + sub;
  let m = fillMats.get(key);
  if (m) return m;
  const step = K.layer + sub * 0.5;
  m = new THREE.MeshStandardMaterial({
    color: K.base, roughness: 0.94, polygonOffset: true,
    polygonOffsetFactor: -(FILL_OFFSET.factor + FILL_OFFSET.factorStep * step),
    polygonOffsetUnits: -(FILL_OFFSET.units + FILL_OFFSET.unitsStep * step),
  });
  m.defines = qualityName === 'laag' ? {} : { GRASS_BUMP: '' };
  withUniforms(m, FILL_SURF, {
    uGP: { value: new THREE.Vector4(K.dry, K.moss, K.worn, K.litter) },
    uGP2: { value: new THREE.Vector4(K.stripe || 1.7, 1, K.flower > 0 ? 1 : 0, 0) },
  });
  fillMats.set(key, m);
  return m;
}

const edgeMat = withUniforms(new THREE.MeshStandardMaterial({
  color: 0xffffff, roughness: 0.95, transparent: true, depthWrite: false,
  polygonOffset: true, polygonOffsetFactor: -1.5, polygonOffsetUnits: -7.7,
}), EDGE_SURF, {});

// ---------------------------------------------------------------- chunk geometry

function fillInto(B, g, geo) {
  const info = polyInfo(g);
  const pos = geo.attributes.position.array;
  const base = B.pos.length / 3;
  const nv = pos.length / 3;
  for (let i = 0; i < nv; i++) {
    B.pos.push(pos[i * 3], 0, pos[i * 3 + 2]);
    B.attr.push(info.angle, info.hash, info.mow, info.wild);
  }
  const inWater = map ? getWaterIndex(map).inWater : null;
  let idx = geo.index ? geo.index.array : null;
  if (!idx) { idx = new Array(nv); for (let i = 0; i < nv; i++) idx[i] = i; }
  if (inWater) idx = dryIndices(pos, idx, inWater);
  for (let i = 0; i < idx.length; i++) B.idx.push(base + idx[i]);
}

function quad(E, ax, ay, bx, by, cx, cy, dx, dy, ta, tb, type) {
  const base = E.pos.length / 3;
  E.pos.push(ax, 0, ay, bx, 0, by, cx, 0, cy, dx, 0, dy);
  E.attr.push(ta, type, ta, type, tb, type, tb, type);
  if ((cy - ay) * (bx - ax) - (cx - ax) * (by - ay) > 0) E.idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
  else E.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

function insetRing(ring, edges, w) {
  const n = ring.length;
  const inset = [];
  for (let i = 0; i < n; i++) {
    const e0 = edges[(i - 1 + n) % n], e1 = edges[i];
    const n0 = e0 || e1, n1 = e1 || e0;
    if (!n0) { inset.push(ring[i]); continue; }
    let mx = n0.nx + n1.nx, my = n0.ny + n1.ny;
    const ml = Math.hypot(mx, my) || 1;
    mx /= ml; my /= ml;
    const k = w / Math.max(0.45, mx * n1.nx + my * n1.ny);
    inset.push([ring[i][0] + mx * k, ring[i][1] + my * k]);
  }
  return inset;
}

function edgesInto(E, g, map) {
  const info = polyInfo(g);
  const edges = polyEdges(g, map);
  const ring = info.ring, n = ring.length;
  const inset = insetRing(ring, edges, Math.min(1.2, Math.max(0.35, info.width * 0.4)));
  const blend = info.K.litter > 0.5;
  const insetB = blend ? insetRing(ring, edges, Math.min(2.5, Math.max(0.5, info.width * 0.5))) : null;
  for (let i = 0; i < n; i++) {
    const e = edges[i];
    if (!e) continue;
    const j = (i + 1) % n;
    if (!e.seam) quad(E, ring[i][0], ring[i][1], ring[j][0], ring[j][1], inset[j][0], inset[j][1], inset[i][0], inset[i][1], 0, 1, 0);
    else if (blend) quad(E, ring[i][0], ring[i][1], ring[j][0], ring[j][1], insetB[j][0], insetB[j][1], insetB[i][0], insetB[i][1], 0, 1, 2);
  }
  // worn / darker verges along paths and roads crossing the green
  const b = g.bounds;
  for (const r of map.roadsNear((b[0] + b[2]) / 2, (b[1] + b[3]) / 2, Math.max(b[2] - b[0], b[3] - b[1]) / 2 + 4)) {
    if (r.bridge) continue;
    const hw = roadClear(r);
    const soft = r.cat === 'foot' || r.cat === 'cycle';
    const ww = soft ? 1.1 : 0.7;
    const pts = r.pts;
    for (let s = 0; s < pts.length - 1; s++) {
      const a = pts[s], c = pts[s + 1];
      const dx = c[0] - a[0], dy = c[1] - a[1];
      const len = Math.hypot(dx, dy);
      if (len < 0.2) continue;
      const pieces = Math.ceil(len / 3);
      const nx = -dy / len, ny = dx / len;
      for (let k = 0; k < pieces; k++) {
        const t0 = k / pieces, t1 = (k + 1) / pieces;
        const x0 = a[0] + dx * t0, y0 = a[1] + dy * t0, x1 = a[0] + dx * t1, y1 = a[1] + dy * t1;
        for (const sd of [-1, 1]) {
          const ox = nx * sd, oy = ny * sd;
          const tx = (x0 + x1) / 2 + ox * (hw + ww * 0.5), ty = (y0 + y1) / 2 + oy * (hw + ww * 0.5);
          if (!inPoly(tx, ty, g)) continue;
          const i0 = hw - 0.05, o0 = hw + ww;
          if (sd > 0) quad(E, x0 + ox * i0, y0 + oy * i0, x1 + ox * i0, y1 + oy * i0, x1 + ox * o0, y1 + oy * o0, x0 + ox * o0, y0 + oy * o0, 0, 1, soft ? 1 : 0);
          else quad(E, x1 + ox * i0, y1 + oy * i0, x0 + ox * i0, y0 + oy * i0, x0 + ox * o0, y0 + oy * o0, x1 + ox * o0, y1 + oy * o0, 0, 1, soft ? 1 : 0);
        }
      }
    }
  }
}

function toGeometry(B, attrName, size) {
  if (!B.idx.length) return null;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(B.pos);
  const nrm = new Float32Array(pos.length);
  for (let i = 1; i < nrm.length; i += 3) nrm[i] = 1;
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.setAttribute(attrName, new THREE.BufferAttribute(new Float32Array(B.attr), size));
  geo.setIndex(new THREE.BufferAttribute(pos.length / 3 > 65535 ? new Uint32Array(B.idx) : new Uint16Array(B.idx), 1));
  geo.computeBoundingSphere();
  return geo;
}

// ---------------------------------------------------------------- tuft geometry

function blade(G, cx, cz, dirA, lean, w, h, shade, head = 1) {
  const ux = Math.cos(dirA), uz = Math.sin(dirA);
  const px = -uz, pz = ux;
  const mx = cx + ux * lean * 0.35, mz = cz + uz * lean * 0.35, my = h * 0.5;
  G.tri([cx - px * w / 2, 0, cz - pz * w / 2], [cx + px * w / 2, 0, cz + pz * w / 2], [mx + px * w * 0.1, my, mz + pz * w * 0.1], [0.45 * shade, 0.45 * shade, 0.8 * shade], head);
  G.tri([mx - px * w * 0.3, my * 0.92, mz - pz * w * 0.3], [mx + px * w * 0.3, my * 0.92, mz + pz * w * 0.3], [cx + ux * lean, h, cz + uz * lean], [0.78 * shade, 0.78 * shade, 1.12 * shade], head);
}

class GeoBuilder {
  constructor() { this.pos = []; this.nrm = []; this.col = []; this.head = []; this.flex = []; }
  tri(a, b, c, shades, head, colors, upBias = 0.9, flexK = 1) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl; ny /= nl; nz /= nl;
    if (upBias <= 0) {
      const ox = (a[0] + b[0] + c[0]) / 3, oy = (a[1] + b[1] + c[1]) / 3 - 0.45, oz = (a[2] + b[2] + c[2]) / 3;
      if (nx * ox + ny * oy + nz * oz < 0) { nx = -nx; ny = -ny; nz = -nz; }
      ny -= upBias;
      const l2 = Math.hypot(nx, ny, nz); nx /= l2; ny /= l2; nz /= l2;
    } else {
      if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
      nx *= 0.4; nz *= 0.4; ny = ny * 0.4 + upBias;
      const l2 = Math.hypot(nx, ny, nz); nx /= l2; ny /= l2; nz /= l2;
    }
    [a, b, c].forEach((p, i) => {
      this.pos.push(p[0], p[1], p[2]);
      this.nrm.push(nx, ny, nz);
      const s = shades[i];
      if (colors) this.col.push(colors[i][0] * s, colors[i][1] * s, colors[i][2] * s);
      else this.col.push(s, s, s);
      this.head.push(Array.isArray(head) ? head[i] : head);
      this.flex.push(Math.max(0, p[1]) ** 2 * flexK);
    });
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aHead', new THREE.Float32BufferAttribute(this.head, 1));
    g.setAttribute('aFlex', new THREE.Float32BufferAttribute(this.flex, 1));
    g.computeBoundingSphere();
    return g;
  }
}

function clumpGeometry() {
  const G = new GeoBuilder();
  const R = rng(0.137);
  const n = 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + R() * 0.7;
    const r0 = 0.03 + R() * 0.16;
    blade(G, Math.cos(a) * r0, Math.sin(a) * r0, a + (R() - 0.5) * 0.8, 0.15 + R() * 0.3, 0.12 + R() * 0.06, 0.55 + R() * 0.45, 0.85 + R() * 0.25);
  }
  return G.build();
}

function flowerGeometry() {
  const G = new GeoBuilder();
  blade(G, 0.05, 0, 0.3, 0.25, 0.16, 0.45, 1, 0);
  blade(G, -0.05, 0.03, 2.9, 0.25, 0.16, 0.4, 1, 0);
  const hx = 0.06, hz = 0.02, hy = 1;
  G.tri([hx - 0.02, 0, hz], [hx + 0.02, 0, hz], [hx, hy, hz], [0.6, 0.6, 0.9], 0, null, 0.9, 0.4);
  const r = 0.2;
  for (let i = 0; i < 6; i++) {
    const a0 = (i / 6) * Math.PI * 2, a1 = ((i + 1) / 6) * Math.PI * 2;
    G.tri([hx, hy + 0.03, hz], [hx + Math.cos(a1) * r, hy, hz + Math.sin(a1) * r], [hx + Math.cos(a0) * r, hy, hz + Math.sin(a0) * r],
      [1, 1, 1], [1, 1, 1], [[1, 0.78, 0.25], [1, 1, 1], [1, 1, 1]], 1.2, 0.4);
  }
  return G.build();
}

function shrubGeometry() {
  const G = new GeoBuilder();
  const ico = new THREE.IcosahedronGeometry(0.5, 0);
  const p = ico.attributes.position.array;
  const R = rng(0.61);
  for (const [ox, oy, oz, sc] of [[0, 0.36, 0, 1], [0.28, 0.3, 0.12, 0.7], [-0.2, 0.52, -0.1, 0.62]]) {
    for (let i = 0; i < p.length; i += 9) {
      const v = [0, 3, 6].map((o) => [ox + p[i + o] * sc, oy + p[i + o + 1] * sc * 0.85, oz + p[i + o + 2] * sc]);
      const s = 0.8 + R() * 0.4;
      G.tri(v[0], v[1], v[2], v.map((q) => s * (0.7 + q[1] * 0.5)), 1, null, -0.7, 0.06);
    }
  }
  ico.dispose();
  return G.build();
}

function hedgeGeometry() {
  const G = new GeoBuilder();
  const b = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]];
  const t = [[-0.44, -0.4], [0.44, -0.4], [0.44, 0.4], [-0.44, 0.4]];
  const R = rng(0.29);
  const q = (a, bb, c, d, s0, s1) => {
    const s = 0.85 + R() * 0.25;
    G.tri(a, bb, c, [s0 * s, s0 * s, s1 * s], 1, null, 0, 0.03);
    G.tri(a, c, d, [s0 * s, s1 * s, s1 * s], 1, null, 0, 0.03);
  };
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    q([b[i][0], 0, b[i][1]], [b[j][0], 0, b[j][1]], [b[j][0], 0.8, b[j][1]], [b[i][0], 0.8, b[i][1]], 0.5, 0.95);
    q([b[i][0], 0.8, b[i][1]], [b[j][0], 0.8, b[j][1]], [t[j][0], 1, t[j][1]], [t[i][0], 1, t[i][1]], 0.95, 1.1);
  }
  q([t[0][0], 1, t[0][1]], [t[1][0], 1, t[1][1]], [t[2][0], 1, t[2][1]], [t[3][0], 1, t[3][1]], 1.1, 1.1);
  return G.build();
}

// ---------------------------------------------------------------- tuft material

const grassFade = { value: new THREE.Vector2(25, 40) };
const shrubFade = { value: new THREE.Vector2(45, 68) };
const tuftUniforms = {
  uGTime: { value: 0 },
  uGWind: { value: 0.2 },
  uGWindDir: { value: new THREE.Vector2(0.8, 0.6) },
  uGPush: { value: [0, 1, 2, 3].map(() => new THREE.Vector4(0, 0, 1, 0)) },
  uGLeaf: { value: new THREE.Color(0x4d7236) },
};

function tuftMaterial(roughness, fade) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness, side: THREE.DoubleSide });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, tuftUniforms, WET_UNIFORMS, { uGFade: fade });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
attribute float aHead;
attribute float aFlex;
uniform float uGTime, uGWind;
uniform vec2 uGWindDir, uGFade;
uniform vec4 uGPush[4];
uniform vec3 uGLeaf;`)
      .replace('#include <color_vertex>', 'vColor = color * mix(uGLeaf, instanceColor, aHead);')
      .replace('#include <project_vertex>', `
vec4 gw = instanceMatrix * vec4(transformed, 1.0);
vec3 gip = instanceMatrix[3].xyz;
float gh = max(gw.y - gip.y, 0.0);
float gph = dot(gip.xz, vec2(0.37, 0.61));
float gust = 0.55 + 0.45 * sin(dot(gip.xz, uGWindDir) * 0.09 - uGTime * 1.3);
float sway = sin(uGTime * 2.1 + gph) * 0.6 + sin(uGTime * 3.7 + gph * 1.7) * 0.4;
vec2 gOff = (uGWindDir * gust * (0.7 + 0.3 * sway) + vec2(-uGWindDir.y, uGWindDir.x) * sway * 0.3) * uGWind * aFlex * length(instanceMatrix[1].xyz) * 0.45;
gw.xz += gOff;
gw.y -= dot(gOff, gOff) * 1.5;
for (int i = 0; i < 4; i++) {
  vec2 d = gip.xz - uGPush[i].xy;
  float dl = length(d);
  float f = (1.0 - smoothstep(uGPush[i].z * 0.55, uGPush[i].z, dl)) * uGPush[i].w;
  gw.xz += d / max(dl, 1e-3) * f * gh * 0.8;
  gw.y = mix(gw.y, gip.y + gh * 0.3, f);
}
float gf = 1.0 - smoothstep(uGFade.x, uGFade.y, distance(gip.xz, cameraPosition.xz));
gw.xyz = gip + (gw.xyz - gip) * gf;
vec4 mvPosition = viewMatrix * gw;
gl_Position = projectionMatrix * mvPosition;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uWet;')
      .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = normalize(vNormal);')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= mix(1.0, 0.7, uWet);')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.45, uWet);');
  };
  m.customProgramCacheKey = () => 'grasstuft1';
  applyCutMask(m);
  return m;
}

// ---------------------------------------------------------------- tuft streaming

export const QUALITY = {
  laag: null,
  middel: { radius: 28, density: 0.45, maxDensity: 2.5, edgeStep: 0.55, shrubRadius: 50, cap: 16000 },
  hoog: { radius: 40, density: 1, maxDensity: 6, edgeStep: 0.32, shrubRadius: 70, cap: 45000 },
};

const TYPES = ['grass', 'flower', 'shrub', 'hedge'];
const CAP_FRACTION = { grass: 1, flower: 0.2, shrub: 0.08, hedge: 0.12 };

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _c = new THREE.Color();

function pushInstance(list, x, y, rot, sx, sy, sz, color, tiltX = 0, tiltZ = 0) {
  _e.set(tiltX, rot, tiltZ);
  _q.setFromEuler(_e);
  _m.compose(_p.set(x, 0.004, y), _q, _s.set(sx, sy, sz));
  for (let i = 0; i < 16; i++) list.m.push(_m.elements[i]);
  list.c.push(color.r, color.g, color.b);
}

function buildEdgeFilter(greens, y0, y1) {
  for (const g of greens) {
    const pts = g.pts;
    const edges = [];
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i], b = pts[j];
      if (Math.max(a[1], b[1]) < y0 || Math.min(a[1], b[1]) > y1) continue;
      edges.push(a[0], a[1], b[0], b[1]);
    }
    g._gRow = edges;
  }
}
function inPolyRow(x, y, g) {
  const b = g.bounds;
  if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) return false;
  const e = g._gRow;
  let inside = false;
  for (let k = 0; k < e.length; k += 4) {
    const xi = e[k], yi = e[k + 1], xj = e[k + 2], yj = e[k + 3];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// (exported for scripts/world/hedge_audit.mjs: the cell's instances against the roads of the tiles)
export function generateCell(map, ci, cj, Q, full) {
  const x0 = ci * CELL, y0 = cj * CELL, x1 = x0 + CELL, y1 = y0 + CELL;
  const cx = x0 + CELL / 2, cy = y0 + CELL / 2;
  const out = { full };
  for (const t of TYPES) out[t] = { m: [], c: [] };
  const greens = map.greenNear(cx, cy, CELL * 0.75).filter((g) => {
    const b = g.bounds;
    return g.pts.length >= 3 && b[0] < x1 && b[2] > x0 && b[1] < y1 && b[3] > y0;
  });
  if (!greens.length) return out;
  greens.sort((a, b) => kindOf(b).prio - kindOf(a).prio);
  buildEdgeFilter(greens, y0 - 1, y1 + 1);

  const segs = [];
  for (const r of map.roadsNear(cx, cy, CELL)) {
    if (r.bridge) continue;
    const hw = roadClear(r);
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], b = r.pts[i + 1];
      if (Math.max(a[0], b[0]) < x0 - hw - 1 || Math.min(a[0], b[0]) > x1 + hw + 1) continue;
      if (Math.max(a[1], b[1]) < y0 - hw - 1 || Math.min(a[1], b[1]) > y1 + hw + 1) continue;
      segs.push(a[0], a[1], b[0], b[1], hw);
    }
  }
  const blds = map.buildingsNear(cx, cy, CELL * 0.75);
  const water = getWaterIndex(map);

  const classify = (x, y) => {
    for (const g of greens) if (inPolyRow(x, y, g)) return g;
    return null;
  };
  const blocked = (x, y, clear) => {
    for (let k = 0; k < segs.length; k += 5) {
      const ax = segs[k], ay = segs[k + 1], dx = segs[k + 2] - ax, dy = segs[k + 3] - ay;
      const l2 = dx * dx + dy * dy;
      let t = l2 > 0 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ex = ax + dx * t - x, ey = ay + dy * t - y;
      const lim = segs[k + 4] + clear;
      if (ex * ex + ey * ey < lim * lim) return true;
    }
    for (const b of blds) {
      const bb = b.bounds;
      if (x < bb[0] - clear || x > bb[2] + clear || y < bb[1] - clear || y > bb[3] + clear) continue;
      if (pointInPolygon(x, y, b.pts)) return true;
    }
    // (padel courts, the home garage)
    if (map.reservedAt && map.reservedAt(x, y)) return true;
    return water.inWater(x, y);
  };
  const inCell = (x, y) => x >= x0 && x < x1 && y >= y0 && y < y1;
  const R = rng(hashi(ci * 7 + 3, cj * 13 + 1));

  const tint = (K, info, dryChance) => {
    _c.setHex(K.base);
    _c.multiplyScalar(0.78 + R() * 0.3);
    if (R() < dryChance) _c.lerp(DRY, 0.4 + R() * 0.4);
    else if (R() < 0.2) _c.lerp(MOSS, 0.4);
    return _c;
  };

  if (full) {
    let maxD = 0;
    for (const g of greens) {
      const info = polyInfo(g);
      maxD = Math.max(maxD, info.K.tuft * (1 + info.wild * 0.8) * (1 - info.mow * 0.3));
    }
    maxD = Math.min(maxD * Q.density * 1.8, Q.maxDensity);
    if (maxD > 0) {
      const step = 1 / Math.sqrt(maxD);
      for (let y = y0 + step * 0.5; y < y1; y += step) {
        for (let x = x0 + step * 0.5; x < x1; x += step) {
          const px = x + (R() - 0.5) * step, py = y + (R() - 0.5) * step;
          const g = classify(px, py);
          if (!g) continue;
          const info = polyInfo(g), K = info.K;
          const d = K.tuft * (1 + info.wild * 0.8) * (1 - info.mow * 0.3) * Q.density * 1.8;
          const clump = vnoise(px * 0.18, py * 0.18);
          if (R() * maxD > d * (0.25 + clump * 1.1)) continue;
          if (blocked(px, py, 0.2)) continue;
          const tall = 0.14 + info.wild * 0.28 + (1 - info.mow) * 0.08;
          const h = tall * (0.7 + R() * 0.6) * (0.8 + clump * 0.4);
          const w = 0.3 + R() * 0.2 + info.wild * 0.1;
          pushInstance(out.grass, px, py, R() * 6.283, w, h, w, tint(K, info, K.dry * 0.25), (R() - 0.5) * 0.3, (R() - 0.5) * 0.3);
          const fd = K.flower * info.wild * 4;
          if (fd > 0 && R() < fd * 0.12 && vnoise(px * 0.3 + 40, py * 0.3) > 0.45) {
            const ft = R();
            _c.setHex(ft < 0.55 ? 0xf2f0e6 : ft < 0.85 ? 0xf2c21a : ft < 0.95 ? 0xa37fc4 : 0xd8392b);
            const fs = 0.22 + R() * 0.1;
            pushInstance(out.flower, px + 0.1, py + 0.07, R() * 6.283, fs, 0.18 + R() * 0.2 + info.wild * 0.12, fs, _c);
          }
        }
      }
    }
    // longer grass along kerbs and path verges, where the mower doesn't reach
    for (const g of greens) {
      const info = polyInfo(g), K = info.K;
      if (!K.tuft) continue;
      for (const e of polyEdges(g, map)) {
        if (!e || e.seam) continue;
        if (Math.max(e.a[0], e.b[0]) < x0 - 1 || Math.min(e.a[0], e.b[0]) > x1 + 1) continue;
        if (Math.max(e.a[1], e.b[1]) < y0 - 1 || Math.min(e.a[1], e.b[1]) > y1 + 1) continue;
        const n = Math.floor(e.len / Q.edgeStep);
        for (let k = 0; k < n; k++) {
          const t = (k + R()) / n;
          const ins = 0.1 + R() * R() * 0.6;
          const px = e.a[0] + (e.b[0] - e.a[0]) * t + e.nx * ins, py = e.a[1] + (e.b[1] - e.a[1]) * t + e.ny * ins;
          if (!inCell(px, py) || R() < 0.25) continue;
          if (classify(px, py) !== g || blocked(px, py, 0.08)) continue;
          const h = (0.22 + R() * 0.25) * (1 - ins * 0.5) * (0.6 + 0.4 * (1 - info.mow * 0.5));
          const w = 0.26 + R() * 0.18;
          pushInstance(out.grass, px, py, R() * 6.283, w, h, w, tint(K, info, 0.3), (R() - 0.5) * 0.4, (R() - 0.5) * 0.4);
        }
      }
    }
    for (let k = 0; k < segs.length; k += 5) {
      const ax = segs[k], ay = segs[k + 1], dx = segs[k + 2] - ax, dy = segs[k + 3] - ay;
      const len = Math.hypot(dx, dy);
      if (len < 0.3) continue;
      const nx = -dy / len, ny = dx / len;
      const n = Math.floor(len / (Q.edgeStep * 1.3));
      for (let i = 0; i < n; i++) {
        const t = (i + R()) / n;
        const sd = R() < 0.5 ? -1 : 1;
        const off = segs[k + 4] + 0.1 + R() * R() * 0.5;
        const px = ax + dx * t + nx * sd * off, py = ay + dy * t + ny * sd * off;
        if (!inCell(px, py)) continue;
        const g = classify(px, py);
        if (!g || !polyInfo(g).K.tuft || blocked(px, py, 0.05)) continue;
        const info = polyInfo(g);
        const h = 0.16 + R() * 0.22;
        const w = 0.24 + R() * 0.16;
        pushInstance(out.grass, px, py, R() * 6.283, w, h, w, tint(info.K, info, 0.4), (R() - 0.5) * 0.4, (R() - 0.5) * 0.4);
      }
    }
  }

  for (const g of greens) {
    const info = polyInfo(g), K = info.K;
    if (K.shrub > 0) {
      const b = g.bounds;
      const ax0 = Math.max(x0, b[0]), ax1 = Math.min(x1, b[2]), ay0 = Math.max(y0, b[1]), ay1 = Math.min(y1, b[3]);
      const n = Math.round((ax1 - ax0) * (ay1 - ay0) * K.shrub * (0.5 + Q.density * 0.5) + R() - 0.5);
      for (let i = 0; i < n; i++) {
        const px = ax0 + R() * (ax1 - ax0), py = ay0 + R() * (ay1 - ay0);
        if (classify(px, py) !== g || blocked(px, py, 0.8)) continue;
        const s = 0.6 + R() * 0.9;
        _c.setHex(K.base).multiplyScalar(1 + R() * 0.4).lerp(R() < 0.6 ? MOSS : DRY, 0.25);
        pushInstance(out.shrub, px, py, R() * 6.283, s * (1 + R() * 0.4), s * (0.6 + R() * 0.5), s, _c);
      }
    }
    if (K.hedge > 0) {
      for (const e of polyEdges(g, map)) {
        if (!e || e.seam || e.len < 4 || e.h > K.hedge) continue;
        if (Math.max(e.a[0], e.b[0]) < x0 - 1 || Math.min(e.a[0], e.b[0]) > x1 + 1) continue;
        if (Math.max(e.a[1], e.b[1]) < y0 - 1 || Math.min(e.a[1], e.b[1]) > y1 + 1) continue;
        const rot = -Math.atan2(e.b[1] - e.a[1], e.b[0] - e.a[0]);
        const hh = 0.55 + hashi(e.h * 1e6, 3) * 0.5;
        const n = Math.floor((e.len - 1) / 0.8);
        for (let k = 0; k <= n; k++) {
          const t = (0.5 + k * 0.8) / e.len;
          const px = e.a[0] + (e.b[0] - e.a[0]) * t + e.nx * 0.6, py = e.a[1] + (e.b[1] - e.a[1]) * t + e.ny * 0.6;
          if (!inCell(px, py) || classify(px, py) !== g || blocked(px, py, 0.45)) continue;
          _c.setHex(0x3e5f2c).multiplyScalar(0.85 + R() * 0.25);
          pushInstance(out.hedge, px, py, rot + (R() - 0.5) * 0.12, 0.95 + R() * 0.2, hh * (0.92 + R() * 0.16), 0.7 + R() * 0.12, _c);
        }
      }
    }
  }
  for (const t of TYPES) {
    out[t].m = new Float32Array(out[t].m);
    out[t].c = new Float32Array(out[t].c);
  }
  return out;
}

// ---------------------------------------------------------------- module state

let scene = null, map = null, polyGeometry = null;
let chunks = null;
let quality = null;
let qualityName = 'hoog';
const cells = new Map();
let meshes = null;
let lastCellKey = '';
let dirty = true;
let rebuildTimer = 0;
let time = 0;

onSettingsChange((st) => {
  const name = QUALITY_PRESETS[st.quality] ? st.quality : 'hoog';
  if (name === qualityName && meshes) return;
  qualityName = name;
  quality = QUALITY[name];
  for (const m of GRASS_MATS) {
    const want = name !== 'laag';
    if (want === ('GRASS_BUMP' in m.defines)) continue;
    if (want) m.defines.GRASS_BUMP = ''; else delete m.defines.GRASS_BUMP;
    m.needsUpdate = true;
  }
  cells.clear();
  dirty = true;
  lastCellKey = '';
});

export function initGrass(sc, mp, opts) {
  scene = sc;
  map = mp;
  polyGeometry = opts.polyGeometry;
  chunks = new Map();
  for (const g of map.green) {
    if (!g.bounds || g.pts.length < 3) continue;
    const i = Math.floor((g.bounds[0] + g.bounds[2]) / 2 / CHUNK), j = Math.floor((g.bounds[1] + g.bounds[3]) / 2 / CHUNK);
    const key = i + ',' + j;
    let c = chunks.get(key);
    if (!c) chunks.set(key, c = { polys: [], bounds: [Infinity, Infinity, -Infinity, -Infinity], group: null });
    c.polys.push(g);
    c.bounds[0] = Math.min(c.bounds[0], g.bounds[0]); c.bounds[1] = Math.min(c.bounds[1], g.bounds[1]);
    c.bounds[2] = Math.max(c.bounds[2], g.bounds[2]); c.bounds[3] = Math.max(c.bounds[3], g.bounds[3]);
  }
  for (const c of chunks.values()) c.polys.sort((a, b) => kindOf(a).prio - kindOf(b).prio);
  assignSubLayers(map);

  const mat = tuftMaterial(0.82, grassFade);
  const shrubMat = tuftMaterial(0.9, shrubFade);
  const geos = { grass: clumpGeometry(), flower: flowerGeometry(), shrub: shrubGeometry(), hedge: hedgeGeometry() };
  meshes = {};
  for (const t of TYPES) {
    const cap = Math.ceil(QUALITY.hoog.cap * CAP_FRACTION[t]);
    const mesh = new THREE.InstancedMesh(geos[t], t === 'shrub' || t === 'hedge' ? shrubMat : mat, cap);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.receiveShadow = true;
    mesh.castShadow = t === 'shrub' || t === 'hedge';
    mesh.userData.cap = cap;
    mesh.name = 'grass-' + t;
    scene.add(mesh);
    meshes[t] = mesh;
  }
}

function polysOverlap(a, b) {
  const A = a.bounds, B = b.bounds;
  if (A[2] <= B[0] || B[2] <= A[0] || A[3] <= B[1] || B[3] <= A[1]) return false;
  const probe = (p, q) => {
    const r = ringOf(p.pts), n = r.length;
    for (let i = 0; i < n; i++) {
      const u = r[i], v = r[(i + 1) % n], w = r[(i + 2) % n];
      const x = (u[0] + v[0] + w[0]) / 3, y = (u[1] + v[1] + w[1]) / 3;
      if (inPoly(x, y, p) && inPoly(x, y, q)) return true;
    }
    return false;
  };
  return probe(a, b) || probe(b, a);
}

// Two polygons of one kind share a material, so an overlap between them
// would fight; the later one moves half a depth step up.
function assignSubLayers(map) {
  const seen = new Set();
  for (const g of map.green) {
    if (!g.bounds || g.pts.length < 3) continue;
    const b = g.bounds;
    const used = [false, false];
    for (const o of map.greenNear((b[0] + b[2]) / 2, (b[1] + b[3]) / 2, Math.max(b[2] - b[0], b[3] - b[1]) / 2 + 2)) {
      if (o === g || !seen.has(o) || kindOf(o) !== kindOf(g) || !polysOverlap(g, o)) continue;
      used[o._gSub || 0] = true;
    }
    g._gSub = used[0] ? 1 : 0;
    seen.add(g);
  }
}

function buildChunk(c) {
  const groups = new Map();
  const E = { pos: [], attr: [], idx: [] };
  for (const g of c.polys) {
    const K = kindOf(g);
    const key = K.layer * 2 + (g._gSub || 0);
    let B = groups.get(key);
    if (!B) groups.set(key, B = { kind: g.kind, sub: g._gSub || 0, pos: [], attr: [], idx: [] });
    fillInto(B, g, polyGeometry(g));
    edgesInto(E, g, map);
  }
  const group = new THREE.Group();
  group.name = 'green-chunk';
  for (const B of groups.values()) {
    const geo = toGeometry(B, 'aGrass', 4);
    if (!geo) continue;
    const mesh = new THREE.Mesh(geo, fillMaterial(B.kind, B.sub));
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  const eg = toGeometry(E, 'aEdge', 2);
  if (eg) {
    const mesh = new THREE.Mesh(eg, edgeMat);
    mesh.receiveShadow = true;
    mesh.renderOrder = -1;
    group.add(mesh);
  }
  group.position.y = GREEN_Y;
  return group;
}

function disposeChunk(c) {
  scene.remove(c.group);
  for (const m of c.group.children) m.geometry.dispose();
  c.group = null;
}

function rectDist(b, x, y) {
  const dx = Math.max(b[0] - x, 0, x - b[2]), dy = Math.max(b[1] - y, 0, y - b[3]);
  return Math.hypot(dx, dy);
}

function syncChunks(px, py, dist) {
  const t0 = performance.now();
  for (const c of chunks.values()) {
    const d = rectDist(c.bounds, px, py);
    if (d < dist) {
      if (!c.group && (d < 30 || performance.now() - t0 < 3)) {
        c.group = buildChunk(c);
        scene.add(c.group);
      }
    } else if (c.group && d > dist + 30) disposeChunk(c);
  }
}

function syncTufts(cam, dt) {
  const Q = quality;
  if (!Q) {
    if (meshes.grass.count || meshes.hedge.count) for (const t of TYPES) meshes[t].count = 0;
    return;
  }
  const cx = cam.position.x, cy = cam.position.z;
  const ci = Math.floor(cx / CELL), cj = Math.floor(cy / CELL);
  const key = ci + ',' + cj;
  if (key !== lastCellKey) { lastCellKey = key; dirty = true; }
  const outer = Q.shrubRadius + CELL, inner = Q.radius + CELL * 0.75;
  const span = Math.ceil(outer / CELL);
  const want = [];
  let pending = false;
  const t0 = performance.now();
  for (let j = cj - span; j <= cj + span; j++) {
    for (let i = ci - span; i <= ci + span; i++) {
      const d = Math.hypot((i + 0.5) * CELL - cx, (j + 0.5) * CELL - cy);
      if (d > outer) continue;
      want.push({ i, j, d, full: d < inner });
    }
  }
  want.sort((a, b) => a.d - b.d);
  for (const w of want) {
    const k = w.i + ',' + w.j;
    const c = cells.get(k);
    if (c && (c.full || !w.full)) { w.cell = c; continue; }
    if (performance.now() - t0 > 2.5 && w.d > 12) { pending = true; continue; }
    w.cell = generateCell(map, w.i, w.j, Q, w.full);
    cells.set(k, w.cell);
    dirty = true;
  }
  for (const [k, c] of cells) {
    const [i, j] = k.split(',').map(Number);
    if (Math.hypot((i + 0.5) * CELL - cx, (j + 0.5) * CELL - cy) > outer + CELL * 3) cells.delete(k);
  }
  rebuildTimer -= dt;
  if (!dirty || (pending && rebuildTimer > 0)) return;
  rebuildTimer = 0.3;
  dirty = false;
  for (const t of TYPES) {
    const mesh = meshes[t];
    const cap = Math.min(mesh.userData.cap, Math.ceil(Q.cap * CAP_FRACTION[t]));
    const M = mesh.instanceMatrix.array, C = mesh.instanceColor.array;
    let n = 0;
    for (const w of want) {
      if (!w.cell || (t === 'grass' || t === 'flower') && !w.full) continue;
      const L = w.cell[t];
      const k = Math.min(L.c.length / 3, cap - n);
      if (k <= 0) continue;
      M.set(k * 16 === L.m.length ? L.m : L.m.subarray(0, k * 16), n * 16);
      C.set(k * 3 === L.c.length ? L.c : L.c.subarray(0, k * 3), n * 3);
      n += k;
    }
    mesh.count = n;
    markInstancesDirty(mesh.instanceMatrix, n);
    markInstancesDirty(mesh.instanceColor, n);
  }
  grassFade.value.set(Q.radius * 0.62, Q.radius * 0.95);
  shrubFade.value.set(Q.shrubRadius * 0.7, Q.shrubRadius * 0.98);
}

function updatePushers(world) {
  const P = tuftUniforms.uGPush.value;
  const p = world.player;
  let n = 0;
  const v = p.inVehicle;
  if (v && !v.isBoat) P[n++].set(v.x, v.y, (v.model ? v.model.len : 4) * 0.5 + 0.6, 1);
  else if (!world.pigeonMode) P[n++].set(p.x, p.y, 0.75, 1);
  for (const o of world.vehicles || []) {
    if (n >= 4) break;
    if (o === v || o.isBoat || o.wrecked) continue;
    if (Math.abs(o.x - p.x) > 30 || Math.abs(o.y - p.y) > 30) continue;
    P[n++].set(o.x, o.y, (o.model ? o.model.len : 4) * 0.5 + 0.5, 1);
  }
  for (; n < 4; n++) P[n].set(0, 0, 1, 0);
}

export function updateGrass(dt, world, cam, drawDist) {
  if (!chunks) return;
  const p = world.streamFocus || world.player;
  syncChunks(p.x, p.y, drawDist);
  syncTufts(cam, dt);
  time = world.time || time + dt;
  const storm = world.weather ? Math.min(1, Math.max(0, world.weather.intensity)) : 0;
  tuftUniforms.uGTime.value = time;
  tuftUniforms.uGWind.value = 0.22 + storm * (world.weather && world.weather.kind === 'storm' ? 1.1 : 0.7);
  const wa = Math.sin(time * 0.013) * 0.6 + 0.7;
  tuftUniforms.uGWindDir.value.set(Math.cos(wa), Math.sin(wa));
  updatePushers(world);
  const env = 1 + WET_UNIFORMS.uWet.value * 0.25;
  for (const m of GRASS_MATS) m.envMapIntensity = env;
}

// Een stuk grond waar geen gras meer hoort (een akker van de boerderij, #415: map.reservedAt houdt het gras er voortaan weg): de al gemaakte
// gras-cellen eronder worden weggegooid en komen zonder gras terug.
export function wisGrasCellen(x0, y0, x1, y1) {
  for (const k of [...cells.keys()]) {
    const [i, j] = k.split(',').map(Number);
    if ((i + 1) * CELL > x0 && i * CELL < x1 && (j + 1) * CELL > y0 && j * CELL < y1) cells.delete(k);
  }
  dirty = true;
  lastCellKey = '';
}

// Far-LOD tint: the kind's base colour nudged towards the shader's average.
export function grassFarColor(g) {
  const K = kindOf(g);
  _c.setHex(K.base).multiplyScalar(0.96);
  if (K.litter) _c.lerp(LITTER, 0.3);
  return _c.getHex();
}
export function grassFarRank(g) {
  return kindOf(g).prio;
}
