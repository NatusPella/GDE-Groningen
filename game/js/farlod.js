import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { buildingLodStyle, ownBuildingModel } from './models3d_buildings.js';
import { namedSilhouette } from './landmarks3d.js';
import { perfOff } from './devflags.js';
import { buildingLift, roadBaseAt } from './terrainlift.js';
import { drawHub } from './multidraw3d.js';
import { farBuildDist, createCooler, RING_KEEP_MAX } from './lodstable.js';
import { GLSL_BAYER, GLSL_FAR_FRAG } from './buildingfade.js';

// Far LOD layer: plain extruded buildings and flat ground (green, paths,
// roads) merged per TILE x TILE metre tile, one draw call per tile and layer.
// Tiles are built incrementally within a per-frame time budget, started a
// prefetch margin before they can come into view and dropped only well behind
// it (#502). Buildings the detailed streamer shows
// (centre within detailR of the player) are collapsed in the vertex shader;
// ground fragments inside the guaranteed-detailed radius are discarded.

const TILE = 320;
const BUDGET_MS = 2.5;

// (#502) Prefetch-marge: een tegel begint al te bouwen vóórdat hij in beeld
// komt. Tot #502 begon hij pas op de rand van de zichtafstand (d < viewDist) en
// omdat de bouw in blokken van BUDGET_MS gaat en de nieuwe meshes pas met de
// volgende pass zichtbaar worden, kwam hij dus in beeld terwijl hij nog in de
// maak was: "het plopt nu een beetje per chunk in de verte" (playtest 27-10).
// De aanloop is een deel van de zichtafstand (`share`) met een minimum (`min`),
// zodat hij ook bij de kortste zichtafstand (150 m) groter blijft dan wat een
// tegel in een paar frames bouwtijd aflegt. `release` is de hysterese achter de
// marge: een tegel die net buiten de marge valt blijft staan in plaats van meteen
// gesloopt te worden en bij het omdraaien opnieuw gebouwd te moeten worden.
export const PRELOAD = { share: 0.3, min: 80, release: TILE * 0.5 };

// De twee afstanden rond de speler waarop de laag werkt, in meters: `start` is
// waar een tegel begint te bouwen (dus voorbij de zichtafstand), `drop` waar hij
// weg mag. Puur en geëxporteerd zodat scripts/farlod_test.mjs de marge kan
// narekenen zonder daar een halve wereld voor te bouwen.
export function lodRanges(viewDist) {
  const start = viewDist + Math.max(viewDist * PRELOAD.share, PRELOAD.min);
  return { start, drop: start + PRELOAD.release };
}

// (#463) De banden van de gevel (plint, strook hooglichten, kroonlijst) als één
// bron: de shader van de gevel leest deze getallen en scripts/farlod_test.mjs
// rekent ermee na dat elke band binnen de muur valt, ook bij een lage schuur.
export const FACADE = {
  minWall: 2.4, // de laagste muur die de bouwer maakt (buildingLodStyle)
  plinthShare: 0.18, plinthMin: 0.75, plinthMax: 2.4, // de plint: een deel van de muur, begrensd
  crownLow: 0.55, crownHigh: 0.35, // de kroonlijst, van boven naar beneden gemeten
  ventFrom: 0.6, ventTo: 0.7, ventMinWall: 5.5, // de hooglichten van een hoge hal
  bandSoft: 0.15, // de zachte rand van een band, in meters
};

// Waar de banden van één muur staan, in meters boven zijn voet: `wall` is de
// hoogte waarmee de shader rekent (minstens minWall), `plinthEnd` het einde van
// de plint, `crownFrom`/`crownTo` de kroonlijst en `vent` de strook hooglichten
// van een hoge hal (null als de muur daar te laag voor is).
export function facadeBands(foot, top) {
  const wall = Math.max(top - foot, FACADE.minWall);
  const plinth = Math.min(Math.max(wall * FACADE.plinthShare, FACADE.plinthMin), FACADE.plinthMax);
  return {
    wall,
    plinth,
    plinthEnd: plinth + FACADE.bandSoft,
    crownFrom: wall - FACADE.crownLow,
    crownTo: wall - FACADE.crownHigh,
    vent: wall > FACADE.ventMinWall ? { from: wall * FACADE.ventFrom, to: wall * FACADE.ventTo } : null,
  };
}

export const lodShared = () => shared; // de uniforms van de ring en de band, ook voor de detailgebouwen (scene3d.js, buildingfade.js)
const shared = {
  uLodPlayer: { value: new THREE.Vector2() },
  uLodDetailR: { value: 140 },
  uLodInnerR: { value: 130 },
  // gebouwen binnen de detailring die nog geen eigen mesh hebben houden hun verre kopie (lodstable.js selectRing, #1016): de ring
  // hoeft dan niet naar het eerste wachtende gebouw te krimpen
  uLodKeep: { value: Array.from({ length: RING_KEEP_MAX }, () => new THREE.Vector2(1e9, 1e9)) },
  uLodKeepN: { value: 0 },
  // de dither-overgang met de detailgebouwen (buildingfade.js): zoveel meter binnen de ring
  uLodBand: { value: 0 }, // scene3d.js zet hem elke frame: BUILDING_FADE_BAND met een verre laag, anders 0 (de harde wissel)
  // a streamed tile's flat water is only drawn beyond this radius (see waterStreamMaterial)
  uLodWaterR: { value: 3800 },
  uNightGlow: { value: 0 },
  uLitFrac: { value: 0 },
};

function buildingMaterial() {
  const F = FACADE;
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0, flatShading: true });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, shared);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec2 lodCenter;
attribute vec2 lodWall;
attribute float lodHard;
uniform vec2 uLodPlayer;
uniform float uLodDetailR;
uniform vec2 uLodKeep[${RING_KEEP_MAX}];
uniform int uLodKeepN;
uniform float uLodBand;
varying vec3 vFarW;
varying float vFarSeed;
varying vec2 vFarWall;
varying float vFarFade;`)
      .replace('#include <project_vertex>', `#include <project_vertex>
vFarFade = 1.0;
vFarW = (modelMatrix * vec4(transformed, 1.0)).xyz;
vFarWall = lodWall;
vFarSeed = fract(sin(dot(lodCenter, vec2(12.9898, 78.233))) * 43758.5453);
float lodDist = distance(lodCenter, uLodPlayer);
if (lodDist <= uLodDetailR) {
  bool keepFar = false;
  for (int i = 0; i < ${RING_KEEP_MAX}; i++) { if (i >= uLodKeepN) break; if (distance(lodCenter, uLodKeep[i]) < 0.6) { keepFar = true; break; } }
  // binnen de band dooft de kopie uit tegen het detailgebouw in (buildingfade.js); daarbinnen klapt hij in
  if (!keepFar) {
    if (uLodBand <= 0.0 || lodHard > 0.5 || lodDist <= uLodDetailR - uLodBand) gl_Position = vec4(0.0, 0.0, -2.0, 1.0);
    else vFarFade = (lodDist - (uLodDetailR - uLodBand)) / uLodBand;
  }
}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uNightGlow, uLitFrac;
varying vec3 vFarW;
varying float vFarSeed;
varying vec2 vFarWall;
varying float vFarFade;
${GLSL_BAYER}`)
      .replace('void main() {', `void main() {
${GLSL_FAR_FRAG}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  // flat roofs: panel seams every 24 m and a slightly different tone per panel, so a big hall is no empty grey plane (#260)
  vec3 rn = normalize(cross(dFdx(vFarW), dFdy(vFarW)));
  if (abs(rn.y) > 0.9) {
    vec2 rg = vFarW.xz / 24.0;
    vec2 rfw = max(fwidth(rg), vec2(1e-5));
    vec2 rf = abs(fract(rg - 0.5) - 0.5) / rfw;
    float seam = 1.0 - min(min(rf.x, rf.y), 1.0);
    float fade = 1.0 - smoothstep(0.15, 0.45, max(rfw.x, rfw.y));
    float tone = fract(sin(dot(floor(rg), vec2(12.9898, 78.233))) * 43758.5453);
    diffuseColor.rgb *= (0.93 + 0.14 * tone * fade + 0.07 * (1.0 - fade)) * (1.0 - 0.16 * seam * fade);
  } else if (abs(rn.y) < 0.3) {
    // walls: a grid of dark windows by day too (same grid as the night glow), so a far block reads as a building and not as a grey slab (#259)
    vec2 wt = normalize(vec2(-rn.z, rn.x));
    vec2 wg = vec2(dot(vFarW.xz, wt) / 2.6, vFarW.y / 3.1);
    vec2 wf = fract(wg);
    float wwin = step(0.3, wf.x) * step(wf.x, 0.7) * step(0.32, wf.y) * step(wf.y, 0.78);
    float wblur = smoothstep(0.3, 0.9, max(fwidth(wg.x), fwidth(wg.y)));
    // where the grid is finer than the pixels (in the distance, or a long wall seen almost along its length) the windows join into their
    // own average, so the wall keeps a cool, darker tone instead of turning into one flat plane (#463)
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.13, 0.17, 0.22), mix(wwin, 0.18, wblur) * 0.62);
    // the facade rhythm of the mass itself (#463): a plinth at the foot, a band of high windows on a tall hall and a darker crown under
    // the roof edge. Anchored to the wall's own foot and height (lodWall), so it stands at every distance and every viewing angle: a band
    // that falls under a pixel fades into the share it has of that wall, so nothing shimmers and no band pops in. The numbers come from
    // FACADE (one source with facadeBands, which farlod_test.mjs checks stay inside the wall).
    float yb = clamp(vFarW.y - vFarWall.x, 0.0, max(vFarWall.y - vFarWall.x, 0.01));
    float wh = max(vFarWall.y - vFarWall.x, ${F.minWall.toFixed(2)});
    float soft = smoothstep(0.5, 1.5, max(fwidth(vFarW.y), 1e-4));
    float ph = clamp(wh * ${F.plinthShare.toFixed(2)}, ${F.plinthMin.toFixed(2)}, ${F.plinthMax.toFixed(2)}); // the height of the plinth
    float plinth = mix(1.0 - smoothstep(ph - ${F.bandSoft.toFixed(2)}, ph + ${F.bandSoft.toFixed(2)}, yb), ph / wh, soft);
    float crown = mix(smoothstep(wh - ${F.crownLow.toFixed(2)}, wh - ${F.crownHigh.toFixed(2)}, yb), min(0.5 / wh, 0.22), soft);
    float vent = 0.0;
    if (wh > ${F.ventMinWall.toFixed(1)}) { // a hall: the strip of high windows a third down from the roof
      float v0 = wh * ${F.ventFrom.toFixed(2)}, v1 = wh * ${F.ventTo.toFixed(2)};
      vent = mix(smoothstep(v0, v0 + ${F.bandSoft.toFixed(2)}, yb) * (1.0 - smoothstep(v1 - ${F.bandSoft.toFixed(2)}, v1, yb)), (v1 - v0) / wh, soft);
    }
    diffuseColor.rgb *= 1.0 - (0.15 + 0.11 * vFarSeed) * plinth - 0.10 * crown - 0.14 * vent;
    diffuseColor.rgb *= mix(1.0, 0.94, wblur);
  }
}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
if (uNightGlow > 0.0) {
  vec3 wn = normalize(cross(dFdx(vFarW), dFdy(vFarW)));
  if (abs(wn.y) < 0.3) {
    vec2 t = normalize(vec2(-wn.z, wn.x));
    vec2 g = vec2(dot(vFarW.xz, t) / 2.6, vFarW.y / 3.1);
    vec2 cell = floor(g), f = fract(g);
    float win = step(0.3, f.x) * step(f.x, 0.7) * step(0.32, f.y) * step(f.y, 0.78);
    float rnd = fract(sin(dot(cell + vFarSeed * 91.0, vec2(41.3, 289.1))) * 15731.743);
    float lit = step(rnd, uLitFrac) * win;
    float blur = smoothstep(0.3, 0.9, max(fwidth(g.x), fwidth(g.y)));
    vec3 warm = mix(vec3(1.0, 0.56, 0.24), vec3(1.0, 0.76, 0.48), fract(rnd * 7.13));
    totalEmissiveRadiance += warm * mix(lit, uLitFrac * 0.2, blur) * uNightGlow * 0.8;
  }
}`);
  };
  return m;
}

// #1203, #1193: een vlak gras was één egale kleur (een groot effen groen vlak zonder variatie). Het gras krijgt een rustige
// variatie in de wereldruimte: twee ruisschalen (ca. 40 m en 9 m) die helderheid en een beetje geel-groen verschuiven, met gemiddelde
// 1 zodat de overgang naar het gedetailleerde gras geen naad geeft. Gratis: een paar vermenigvuldigingen in het fragment.
export const GRASS_VARIATION_GLSL = `
float gvHash(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float gvNoise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(gvHash(i), gvHash(i + vec2(1.0, 0.0)), u.x), mix(gvHash(i + vec2(0.0, 1.0)), gvHash(i + vec2(1.0, 1.0)), u.x), u.y); }
vec3 grassVariation(vec2 p) {
  float big = gvNoise(p * 0.025), mid = gvNoise(p * 0.11 + 7.0);
  float v = big * 0.65 + mid * 0.35 - 0.5;
  return vec3(1.0 + v * 0.26 + v * 0.10, 1.0 + v * 0.26, 1.0 + v * 0.26 - v * 0.12);
}`;
function grassVariation(shader, withVarying) {
  if (withVarying) {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vGrassXZ;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvGrassXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
  }
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec2 vGrassXZ;' + GRASS_VARIATION_GLSL)
    .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= grassVariation(vGrassXZ);');
}

function groundMaterial(offset, near = false, grass = false) {
  const m = new THREE.MeshLambertMaterial({
    vertexColors: true, polygonOffset: true, polygonOffsetFactor: -offset, polygonOffsetUnits: -offset * 4,
  });
  // near: drawn up to the player too (a streamed tile's green and water have
  // no detailed copy that takes over)
  if (near) {
    if (grass) m.onBeforeCompile = (shader) => grassVariation(shader, true);
    return m;
  }
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, shared);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vFarXZ;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvFarXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec2 uLodPlayer;\nuniform float uLodInnerR;\nvarying vec2 vFarXZ;')
      .replace('void main() {', 'void main() {\nif (distance(vFarXZ, uLodPlayer) < uLodInnerR) discard;');
    if (grass) grassVariation(shader, true);
  };
  return m;
}

// The flat water of a streamed tile (a province tile's row, lying on the ground) is the far picture of water that the
// ground shader and the surface meshes draw themselves: the shader opens the ground over the water within its windows
// (tilewatermask.js: 2 m texels round the player, 8 m texels out to ~4 km) and syncWater (scene3d.js) lays the animated
// surface under it. A flat layer on the ground over that hides the real water: two water layers (#231). So it is
// drawn only beyond what the windows cover (STREAM_WATER_R, a little under half the far mask's 8 km), where nothing else shows water.
export const STREAM_WATER_R = 3800;
export function waterStreamMaterial() {
  const m = groundMaterial(0.3, true);
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, shared);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vFarXZ;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvFarXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec2 uLodPlayer;\nuniform float uLodWaterR;\nvarying vec2 vFarXZ;')
      .replace('void main() {', 'void main() {\nif (distance(vFarXZ, uLodPlayer) < uLodWaterR) discard;');
  };
  return m;
}

// Offsets stay below the detailed ground decals: detailed grass starts at 0.08
// and the road at 5, while the far road sits at 0.7 (#883: the far green used
// to sit at 0.2, under the detailed grass, and a grass fill that reached past
// the far road's offset drew grass over the asphalt in the LOD ring).
const MATS = {
  building: buildingMaterial(),
  green: groundMaterial(0.02, false, true),
  path: groundMaterial(0.45),
  road: groundMaterial(0.7),
  greenNear: groundMaterial(0.02, true, true),
  water: groundMaterial(0.3, true),
  waterStream: waterStreamMaterial(),
};
const WATER_FLAT = [44, 74, 78];

const _c = new THREE.Color();
function rgb8(hex) {
  _c.setHex(hex);
  return [Math.round(_c.r * 255), Math.round(_c.g * 255), Math.round(_c.b * 255)];
}

class Buf {
  constructor(Type, cap = 1024) { this.a = new Type(cap); this.n = 0; }
  reserve(k) {
    if (this.n + k <= this.a.length) return;
    let cap = this.a.length * 2;
    while (cap < this.n + k) cap *= 2;
    const b = new this.a.constructor(cap);
    b.set(this.a.subarray(0, this.n));
    this.a = b;
  }
  view() { return this.a.slice(0, this.n); }
}

class MeshBuilder {
  constructor(withCenter, withWall = false) {
    this.pos = new Buf(Float32Array, 4096);
    this.col = new Buf(Uint8Array, 4096);
    this.idx = new Buf(Uint32Array, 4096);
    this.ctr = withCenter ? new Buf(Float32Array, 4096) : null;
    // buildings: the foot and the top of the wall this vertex belongs to, for the facade rhythm (farlod.js buildingMaterial, #463)
    this.wall = withWall ? new Buf(Float32Array, 4096) : null;
    // buildings: 1 = no dither band (a landmark: its detail mesh never fades, so its far copy keeps the hard switch on the ring)
    this.hard = withWall ? new Buf(Uint8Array, 4096) : null;
    this.hardNow = 0;
  }
  get vertCount() { return this.pos.n / 3; }
  vert(x, y, z, c, cx, cy, wb, wt) {
    this.pos.reserve(3); this.col.reserve(3);
    const p = this.pos, k = this.col;
    p.a[p.n++] = x; p.a[p.n++] = y; p.a[p.n++] = z;
    k.a[k.n++] = c[0]; k.a[k.n++] = c[1]; k.a[k.n++] = c[2];
    if (this.ctr) { this.ctr.reserve(2); this.ctr.a[this.ctr.n++] = cx; this.ctr.a[this.ctr.n++] = cy; }
    if (this.wall) { this.wall.reserve(2); this.wall.a[this.wall.n++] = wb; this.wall.a[this.wall.n++] = wt; }
    if (this.hard) { this.hard.reserve(1); this.hard.a[this.hard.n++] = this.hardNow; }
  }
  tri(a, b, c) {
    this.idx.reserve(3);
    const i = this.idx;
    i.a[i.n++] = a; i.a[i.n++] = b; i.a[i.n++] = c;
  }
  build(normalUp) {
    if (!this.idx.n) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos.view(), 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col.view(), 3, true));
    if (this.ctr) g.setAttribute('lodCenter', new THREE.BufferAttribute(this.ctr.view(), 2));
    if (this.wall) g.setAttribute('lodWall', new THREE.BufferAttribute(this.wall.view(), 2));
    if (this.hard) g.setAttribute('lodHard', new THREE.BufferAttribute(this.hard.view(), 1, true));
    if (normalUp) {
      const n = new Int8Array(this.vertCount * 3);
      for (let i = 1; i < n.length; i += 3) n[i] = 127;
      g.setAttribute('normal', new THREE.BufferAttribute(n, 3, true));
    }
    g.setIndex(new THREE.BufferAttribute(this.idx.view(), 1));
    g.computeBoundingSphere();
    return g;
  }
}

function addBuilding(B, b, lift = 0) {
  B.hardNow = ownBuildingModel(b) ? 1 : 0; // own model: its detail does not fade (scene3d.js addBuildingFade), no dither band for its copy either
  const s = buildingLodStyle(b);
  const ring = s.ring;
  const n = ring.length;
  if (n < 3) return;
  // a named city model (cathedral, theatre, synagogue) keeps its own silhouette here (landmarks3d.js)
  const sil = namedSilhouette(b, ring);
  if (sil) { addSilhouette(B, b, sil, (s.base || 0) + lift); return; }
  let area2 = 0;
  for (let i = 0; i < n; i++) {
    const a = ring[i], c = ring[(i + 1) % n];
    area2 += a[0] * c[1] - c[0] * a[1];
  }
  const pts = area2 > 0 ? ring.slice().reverse() : ring;
  const cx = (b.bounds[0] + b.bounds[2]) / 2, cy = (b.bounds[1] + b.bounds[3]) / 2;
  const wall = rgb8(s.wallHex), roof = rgb8(s.roofHex), y0 = (s.base || 0) + lift, h = y0 + s.depth;
  const base = B.vertCount;
  for (const [x, y] of pts) B.vert(x, y0, y, wall, cx, cy, y0, h);
  for (const [x, y] of pts) B.vert(x, h, y, wall, cx, cy, y0, h);
  for (const [x, y] of pts) B.vert(x, h, y, roof, cx, cy, y0, h);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    B.tri(base + i, base + j, base + n + i);
    B.tri(base + j, base + n + j, base + n + i);
  }
  const contour = pts.map(([x, y]) => new THREE.Vector2(x, y));
  const tris = THREE.ShapeUtils.triangulateShape(contour, []);
  const r0 = base + 2 * n;
  for (const [a, b2, c] of tris) {
    const ux = pts[b2][0] - pts[a][0], uz = pts[b2][1] - pts[a][1];
    const vx = pts[c][0] - pts[a][0], vz = pts[c][1] - pts[a][1];
    if (ux * vz - uz * vx < 0) B.tri(r0 + a, r0 + b2, r0 + c);
    else B.tri(r0 + a, r0 + c, r0 + b2);
  }
}

// The silhouette geometry (non-indexed, linear vertex colours as 0-255) into the far layer's builder; the wall
// band for the facade rhythm is the whole height of the model.
function addSilhouette(B, b, g, y0) {
  const p = g.attributes.position.array, c = g.attributes.color.array;
  const cx = (b.bounds[0] + b.bounds[2]) / 2, cy = (b.bounds[1] + b.bounds[3]) / 2;
  let top = y0;
  for (let i = 1; i < p.length; i += 3) top = Math.max(top, p[i] + y0);
  const base = B.vertCount, col = [0, 0, 0];
  for (let i = 0; i < p.length; i += 3) {
    col[0] = c[i]; col[1] = c[i + 1]; col[2] = c[i + 2];
    B.vert(p[i], p[i + 1] + y0, p[i + 2], col, cx, cy, y0, top);
  }
  // the model is drawn double-sided up close (its windings are not all outward): both faces here too
  for (let i = 0; i < p.length / 3; i += 3) { B.tri(base + i, base + i + 1, base + i + 2); B.tri(base + i, base + i + 2, base + i + 1); }
}

// za/zb: height of a raised ring road (the far view keeps its viaducts up;
// sunken sections stay at street level, where the ground covers them anyway)
// bump: a bridge deck lies a hair above the water (WATER_Y = 0), like the
// detail road at 0.03; the water surface is drawn after the opaque road, so a
// deck at exactly 0 is covered by it and the bridge looks transparent (#919)
function addSegment(B, ax, ay, bx, by, half, c, za = 0, zb = 0, bump = 0) {
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len * half, ny = dx / len * half;
  const i = B.vertCount;
  const ya = Math.max(0, za) + bump, yb = Math.max(0, zb) + bump;
  B.vert(ax + nx, ya, ay + ny, c);
  B.vert(ax - nx, ya, ay - ny, c);
  B.vert(bx + nx, yb, by + ny, c);
  B.vert(bx - nx, yb, by - ny, c);
  B.tri(i, i + 2, i + 1);
  B.tri(i + 1, i + 2, i + 3);
}

function addPolyGeometry(B, geo, c) {
  const p = geo.attributes.position.array;
  const base = B.vertCount;
  for (let i = 0; i < p.length; i += 3) B.vert(p[i], 0, p[i + 2], c);
  const index = geo.index;
  if (index) {
    const ix = index.array;
    for (let i = 0; i < ix.length; i += 3) B.tri(base + ix[i], base + ix[i + 1], base + ix[i + 2]);
  } else {
    for (let i = 0; i < p.length / 3; i += 3) B.tri(base + i, base + i + 1, base + i + 2);
  }
}

// (#524) De verre laag leest de rasters in plaats van de hele kaartarrays: zo blijft
// hij werken als de stad niet meer gepind is en een tegel zijn eigen rijen aan de
// rasters toevoegt. (#755) De basisindex wordt uit die rasters opgebouwd en na een
// tegel-add/drop opnieuw, in stukken; zie daarvoor de baseBuild-machinerie hieronder.
export function createFarLOD(scene, map, opts) {
  const { flatGeometry, colors, sidewalkExtra, roadColorOf, hideBuilding = null } = opts;
  // (#917) Een gebouw dat de detailring verbergt (scene3d.setBuildingHidden: een kit-kerk,
  // -molen of -borg staat ervoor in de plaats) hoort ook geen verre-kist te hebben. Anders
  // steekt dat blok tussen de detailring en de verre ring dwars door de kit en flikkert de
  // gevel. `hideBuilding(b)` komt uit scene3d en kijkt in dezelfde verborgen-set.
  const isHidden = (b) => !!b.landmark || (hideBuilding ? !!hideBuilding(b) : false);
  // welk verre-tegel een gebouw tekent, zodat een gebouw dat pas later verborgen wordt
  // uit die ene tegel kan (en niet de hele laag opnieuw hoeft)
  const buildingTile = new WeakMap();
  const roadColor = Object.fromEntries(Object.entries(colors.roads).map(([k, hex]) => {
    const a = new THREE.Color(hex), s = new THREE.Color(colors.sidewalk);
    const mixed = (k === 'major' || k === 'normal' || k === 'minor') ? a.lerp(s, 0.3) : a;
    return [k, rgb8(mixed.getHex())];
  }));
  const greenColor = rgb8(colors.green);
  const tintCache = new Map();

  const tiles = new Map();
  const tileCooler = createCooler();
  // (#921) de rijen die een gestroomde tegel zelf tekent: de basisindex slaat ze over,
  // anders staat elk gestroomd gebouw, elke weg en elk vlak groen er twee keer in (dubbel
  // werk, en bij een verandering een oude kopie die blijft staan).
  const streamedRows = new WeakSet();
  let geoSeen = map.geoVer; // (#314 C2) de kaartstand van de LOD-tegels
  let tilesVersion = 0, lastPass = null, passFrame = 0; // idle-pass bookkeeping of update()
  const tileOf = (x, y) => {
    const i = Math.floor(x / TILE), j = Math.floor(y / TILE);
    const key = i + ',' + j;
    let t = tiles.get(key);
    if (!t) {
      t = { key, x0: i * TILE, y0: j * TILE, x1: (i + 1) * TILE, y1: (j + 1) * TILE, buildings: [], segs: [], green: [], meshes: null, job: null };
      tiles.set(key, t);
      tilesVersion++;
    }
    return t;
  };
  // (#755) De basisindex: de rijen die de rasters bevatten, per TILE-tegel. Hij
  // werd bij de aanmaak één keer gebouwd en daarna nooit meer: na de eerste
  // tegel-add/drop (map.geoVer) gooide update() alle tegels weg zonder ze terug
  // te zetten, dus de verre stad was na de boot permanent weg. De opbouw kost
  // op de echte wereld ~48 ms en gaat daarom in stukken door het far-LOD-budget
  // (per rastercel, niet per raster in één keer).
  const takeBase = {
    building: (b) => {
      if (isHidden(b) || !b.bounds || streamedRows.has(b)) return;
      const t = tileOf((b.bounds[0] + b.bounds[2]) / 2, (b.bounds[1] + b.bounds[3]) / 2);
      t.buildings.push(b);
      buildingTile.set(b, t);
    },
    road: (r) => {
      if (streamedRows.has(r)) return;
      for (let i = 0; i < r.pts.length - 1; i++) {
        const a = r.pts[i], c = r.pts[i + 1];
        tileOf((a[0] + c[0]) / 2, (a[1] + c[1]) / 2).segs.push(r, i);
      }
    },
    green: (g) => {
      if (!g.bounds || g.pts.length < 3 || streamedRows.has(g)) return;
      tileOf((g.bounds[0] + g.bounds[2]) / 2, (g.bounds[1] + g.bounds[3]) / 2).green.push(g);
    },
  };
  let baseBuild = null, baseStale = false;
  // One job per grid over its cells; an item in several cells is taken once
  // (the same dedupe as gridItems, but the walk itself is spread over frames).
  // #755: de positie IN de cel wordt bewaard. Valt het budget midden in een cel,
  // dan gaat de volgende frame daar verder waar deze stopte; de buiten-iterator
  // is die cel al voorbij, dus de rest mag niet aan de iterator worden overgelaten.
  function startBaseBuild() {
    baseBuild = {
      jobs: [{ kind: 'building', grid: map.buildingGrid }, { kind: 'road', grid: map.roadGrid }, { kind: 'green', grid: map.greenGrid }]
        .map((j) => ({ ...j, cells: j.grid && j.grid.map ? j.grid.map.values() : null, seen: new Set(), cell: null, i: 0 })),
      j: 0,
    };
  }
  // Returns true once the base index is complete, false when the budget ran out.
  function stepBaseBuild(deadline) {
    const B = baseBuild;
    while (B.j < B.jobs.length) {
      const job = B.jobs[B.j];
      if (!job.cells) { B.j++; continue; }
      if (!job.cell) {
        const c = job.cells.next();
        if (c.done) { job.seen = null; job.cells = null; B.j++; continue; }
        job.cell = c.value;
        job.i = 0;
      }
      const cel = job.cell;
      let n = 0;
      for (; job.i < cel.length; job.i++) {
        const it = cel[job.i];
        if (job.seen.has(it)) continue;
        job.seen.add(it);
        takeBase[job.kind](it);
        if ((++n & 63) === 0 && performance.now() >= deadline) {
          job.i++; // de volgende frame begint na dit item, midden in dezelfde cel
          return false;
        }
      }
      job.cell = null;
      job.i = 0;
    }
    // een tegel groepeert zijn groen op dezelfde rangorde als voor #755
    if (colors.greenRank) for (const t of tiles.values()) t.green.sort((x, y) => colors.greenRank(x) - colors.greenRank(y));
    // (#921) een oude tegel waarvan alle rijen nu door een gestroomde tegel
    // getekend worden, houdt niets nieuws over: zijn oude mesh gaat nu weg
    for (const t of tiles.values()) {
      if (t.oldMeshes && !t.buildings.length && !t.segs.length && !t.green.length) disposeTile(t);
    }
    baseBuild = null;
    return true;
  }
  // The base index at creation: in one go (the boot has no frame to protect yet)
  startBaseBuild();
  stepBaseBuild(Infinity);
  const greenOf = colors.greenOf ? (g) => rgb8(colors.greenOf(g)) : () => greenColor;

  const queue = [];
  const root = new THREE.Group();
  root.name = 'farlod';
  scene.add(root);
  let enabled = true;
  const stats = { tiles: 0, visible: 0, triangles: 0, queued: 0, lastBuildMs: 0 };

  function startJob(t) {
    t.job = {
      phase: 0, i: 0,
      bld: new MeshBuilder(true, true), green: new MeshBuilder(false), path: new MeshBuilder(false), road: new MeshBuilder(false), water: new MeshBuilder(false),
    };
    queue.push(t);
  }

  // Returns true once the tile is complete.
  function stepJob(t, deadline) {
    const J = t.job;
    let k = 0;
    while (true) {
      if ((++k & 7) === 0 && performance.now() > deadline) return false;
      if (J.phase === 0) {
        if (J.i >= t.buildings.length) { J.phase = 1; J.i = 0; continue; }
        const b = t.buildings[J.i++];
        // (?terrain, #269: what stands on the relief rides up with it, terrainlift.js)
        addBuilding(J.bld, b, map.terrainOn ? buildingLift(map, b) : 0);
      } else if (J.phase === 1) {
        if (J.i >= t.segs.length) { J.phase = 2; J.i = 0; continue; }
        for (let n = 0; n < 16 && J.i < t.segs.length; n++, J.i += 2) {
          const r = t.segs[J.i], s = t.segs[J.i + 1];
          const a = r.pts[s], c = r.pts[s + 1];
          const car = r.cat === 'major' || r.cat === 'normal' || r.cat === 'minor';
          const half = r.width / 2 + (car ? sidewalkExtra * 0.6 : 0);
          const tint = roadColorOf && roadColorOf(r);
          let col = roadColor[r.cat] || roadColor.normal;
          if (tint) {
            const key = tint + (car ? 'c' : 'p');
            col = tintCache.get(key);
            if (!col) tintCache.set(key, col = rgb8(new THREE.Color(tint).lerp(new THREE.Color(colors.sidewalk), car ? 0.3 : 0).getHex()));
          }
          const ta = map.terrainOn ? roadBaseAt(map, r, a[0], a[1]) : 0, tb = map.terrainOn ? roadBaseAt(map, r, c[0], c[1]) : 0;
          const za = (r.z ? r.z[s] : 0) + ta, zb = (r.z ? r.z[s + 1] : 0) + tb;
          // (#919) een vlakke brug in de verte ligt op 0 terwijl het water ook op 0 ligt:
          // het water wordt daarna getekend en dekt het dek af, dus de brug lijkt doorzichtig.
          // Het detail-dek ligt op 0,03; de verre brug krijgt dezelfde lift.
          addSegment(car ? J.road : J.path, a[0], a[1], c[0], c[1], half, col, za, zb, r.bridge ? 0.05 : 0);
        }
      } else if (J.phase === 2) {
        if (J.i >= t.green.length) { J.phase = 3; J.i = 0; continue; }
        const g = t.green[J.i++];
        addPolyGeometry(J.green, flatGeometry(g), greenOf(g));
      } else if (J.phase === 3) {
        if (!t.water || J.i >= t.water.length) { J.phase = 4; continue; }
        addPolyGeometry(J.water, flatGeometry(t.water[J.i++]), WATER_FLAT);
      } else {
        finishJob(t);
        return true;
      }
    }
  }

  function finishJob(t) {
    const J = t.job;
    t.job = null;
    // (#921) pas nu de oude mesh weghalen: de nieuwe is compleet, dus de tegel
    // valt geen frame weg tijdens de herbouw na een tegel-add/drop
    if (t.oldMeshes) { dropMeshes(t.oldMeshes); t.oldMeshes = null; }
    t.meshes = [];
    t.pooled = !perfOff('pool');
    for (const [name, B] of [['building', J.bld], ['green', J.green], ['path', J.path], ['road', J.road], ['water', J.water]]) {
      const geo = B.build(name !== 'building');
      if (!geo) continue;
      const mat = MATS[t.stream && name === 'green' ? 'greenNear' : t.stream && name === 'water' ? 'waterStream' : name];
      if (t.pooled) {
        // one cell of the multi-draw pool (multidraw3d.js) instead of a mesh of its own; `visible` follows the distance as before
        const handle = drawHub.add(mat, false, geo, false);
        t.meshes.push({ handle, userData: { tris: geo.index.count / 3 }, vis: true, set visible(v) { if (v !== this.vis) { this.vis = v; drawHub.setVisible(this.handle, v); } }, get visible() { return this.vis; } });
        continue;
      }
      const mesh = new THREE.Mesh(geo, mat);
      mesh.matrixAutoUpdate = false;
      mesh.userData.tris = geo.index.count / 3;
      root.add(mesh);
      t.meshes.push(mesh);
    }
  }

  function dropMeshes(list) {
    if (!list) return;
    for (const m of list) {
      if (m.handle) { drawHub.remove(m.handle); continue; }
      root.remove(m);
      m.geometry.dispose();
    }
  }

  function disposeTile(t) {
    dropMeshes(t.meshes);
    t.meshes = null;
    dropMeshes(t.oldMeshes);
    t.oldMeshes = null;
    t.job = null;
  }

  // (#917) Een gebouw dat de detailring nu verbergt (scene3d.setBuildingHidden, vanuit
  // ommelandlandmarks.coverBuildings als er een kit-kerk/-molen/-borg voor in de plaats staat)
  // uit zijn verre tegel halen: het blok stak tussen de detailring en de verre ring dwars
  // door de kit en gaf z-fighting op de gevel. Alleen die ene tegel wordt opnieuw gebouwd.
  function hideFarBuilding(b) {
    const t = buildingTile.get(b);
    if (!t) return false;
    buildingTile.delete(b);
    if (tiles.get(t.key) !== t) return false; // de tegel is al weg (resetTiles): niets te doen
    const i = t.buildings.indexOf(b);
    if (i < 0) return false;
    t.buildings.splice(i, 1);
    if (t.job) {
      const q = queue.indexOf(t);
      if (q >= 0) queue.splice(q, 1);
      t.job = null;
    }
    if (t.meshes) disposeTile(t);
    if (!t.job) startJob(t);
    tilesVersion++;
    return true;
  }

  // (#755) De kaartstand veranderde (map.geoVer): de basisindex komt opnieuw uit de
  // rasters. (#921) Alleen de basisdelen: een gestroomde tegel houdt zijn mesh en
  // wordt niet weggegooid en opnieuw opgebouwd bij elke tegel die erbij komt of
  // weggaat (dat was het "opnieuw inladen" van een stadsdeel). Zijn rijen staan in
  // streamedRows, zodat de basisindex ze niet nog een keer tekent.
  // De oude mesh van een basis-tegel blijft zichtbaar tot de herbouwde tegel klaar
  // is; finishJob wisselt ze in één frame om. Eerst weggooien gaf precies de pop
  // die #921 beschrijft: een stadsdeel verdween even en kwam in brokjes terug.
  function resetTiles() {
    for (const [k, t] of tiles) {
      if (t.stream) continue;
      if (t.job) {
        const q = queue.indexOf(t);
        if (q >= 0) queue.splice(q, 1);
        t.job = null;
      }
      if (t.meshes) { t.oldMeshes = t.oldMeshes ? t.oldMeshes.concat(t.meshes) : t.meshes; t.meshes = null; }
      t.buildings = [];
      t.segs = [];
      t.green = [];
      if (!t.oldMeshes) tiles.delete(k);
    }
    lastPass = null;
    baseBuild = null;
  }

  function rectDist(t, px, py) {
    const dx = Math.max(t.x0 - px, 0, px - t.x1), dy = Math.max(t.y0 - py, 0, py - t.y1);
    return Math.hypot(dx, dy);
  }

  // A pass that left nothing queued is repeated after the focus moved a metre, a setting changed, a tile came or
  // went, or FAR_IDLE_FRAMES frames: the pass walks every tile of the world with a hypot each and sorts the queue.
  const FAR_IDLE_FRAMES = 30;
  function update(px, py, viewDist, visibleDist, detailR, extra = null) {
    // #314 C2: komt er een tegel bij of gaat die weg, dan zijn de LOD-tegels oud.
    // #755: sinds de sparse tegelwereld is de stad zelf ook gestroomd, dus de
    // basisindex moet daarna opnieuw uit de rasters komen; anders blijft de verre
    // kaart weg. Dat gebeurt hieronder in stukken.
    if (geoSeen !== map.geoVer) {
      geoSeen = map.geoVer;
      resetTiles();
      baseStale = true;
    }
    shared.uLodPlayer.value.set(px, py);
    shared.uLodDetailR.value = detailR;
    shared.uLodInnerR.value = detailR - 8;
    const keep = extra && extra.keep ? extra.keep : null, keepN = keep ? Math.min(RING_KEEP_MAX, keep.length) : 0;
    for (let i = 0; i < keepN; i++) shared.uLodKeep.value[i].set(keep[i][0], keep[i][1]);
    shared.uLodKeepN.value = keepN;
    const on = viewDist > detailR + 20;
    if (on !== enabled) { enabled = on; root.visible = on; }
    passFrame++;
    if (lastPass && !queue.length && !baseStale && !baseBuild && !perfOff('verresync') && passFrame - lastPass.frame < FAR_IDLE_FRAMES && Math.abs(px - lastPass.x) < 1 && Math.abs(py - lastPass.y) < 1
      && lastPass.view === viewDist && lastPass.visible === visibleDist && lastPass.detail === detailR && lastPass.version === tilesVersion) return;
    lastPass = null;
    stats.tiles = stats.visible = stats.triangles = 0;
    if (!on) {
      for (const t of tiles.values()) if (t.meshes || t.job) disposeTile(t);
      queue.length = 0;
      stats.queued = 0;
      return;
    }
    const t0 = performance.now();
    // het budget komt van de gedeelde planner (streamplanner.js); een klein minimum houdt de laag altijd vooruit
    const deadline = t0 + (extra && extra.budgetMs > 0 ? extra.budgetMs : extra ? 0.25 : BUDGET_MS);
    const lead = extra && extra.lead ? extra.lead : null;
    tileCooler.beginFrame();
    // (#755) De basisindex opnieuw opbouwen, in stukken van BUDGET_MS. Zolang
    // hij niet af is bouwen we geen tegels (een tegel zou rijen missen die er
    // later nog bij komen); de volgende frame gaat verder waar deze stopte.
    if (baseStale) { baseStale = false; startBaseBuild(); }
    if (baseBuild) {
      const klaar = stepBaseBuild(deadline);
      stats.lastBuildMs = performance.now() - t0;
      if (!klaar) { stats.queued = 0; return; }
    }
    // (#502) twee afstanden: `start` ligt een marge voorbij de zichtafstand (de
    // prefetch), `drop` een halve tegel achter die marge (de hysterese). Een
    // tegel tussen `start` en `drop` wordt met rust gelaten: hij is gebouwd en
    // blijft staan, ook als hij buiten beeld valt.
    const { start, drop } = lodRanges(viewDist);
    for (const t of tiles.values()) {
      // switched with ?perfoff=pool (A/B runs): the tile is built again in the other mode
      if (t.meshes && t.pooled === perfOff('pool')) disposeTile(t);
      const d = rectDist(t, px, py);
      // in de rijrichting begint een tegel eerder te bouwen: het aandachtspunt (focus + lead) telt mee (lodstable.js farBuildDist)
      const dA = lead ? farBuildDist(d, rectDist(t, lead.x, lead.y)) : d;
      t.dist = dA;
      if (dA < start) {
        tileCooler.wanted(t);
        if (!t.meshes && !t.job) startJob(t);
      } else if (dA > drop && (t.meshes || t.job || t.oldMeshes)) {
        // pas hier, ruim achter de zichtafstand: een tegel die net buiten beeld
        // valt of waar de speler omheen draait blijft staan; een afgebouwde tegel nog een paar seconden
        // (heen en weer lopen bouwt hem dan niet opnieuw) en hoogstens twee per frame echt vrijgegeven
        if (!t.meshes || t.job || t.oldMeshes || tileCooler.unwanted(t, t0)) { tileCooler.forget(t); disposeTile(t); }
      }
      if (t.meshes) {
        const vis = d < visibleDist;
        stats.tiles++;
        for (const m of t.meshes) {
          m.visible = vis;
          if (vis) stats.triangles += m.userData.tris;
        }
        if (vis) stats.visible++;
      }
      // (#921) een tegel die opnieuw gebouwd wordt, houdt zijn oude mesh zichtbaar
      if (t.oldMeshes) {
        const vis = d < visibleDist;
        for (const m of t.oldMeshes) m.visible = vis;
      }
    }
    for (let i = queue.length - 1; i >= 0; i--) if (!queue[i].job) queue.splice(i, 1);
    // (#502) op afstand gesorteerd: wat in beeld staat gaat vóór de
    // prefetch-tegels verder weg, dus de marge kost nooit detail dichtbij.
    queue.sort((a, b) => a.dist - b.dist);
    const hadQueue = queue.length > 0;
    // Het budget blijft een hard plafond per frame (BUDGET_MS): staan er door de
    // prefetch meer tegels in de wachtrij, dan duurt het vullen langer in plaats
    // van dat een frame duurder wordt. De basisindex-herbouw hierboven heeft al
    // een deel van hetzelfde budget gebruikt.
    while (queue.length && performance.now() < deadline) {
      if (stepJob(queue[0], deadline)) queue.shift();
    }
    stats.queued = queue.length;
    stats.lastBuildMs = performance.now() - t0;
    // a pass that built something shows the new meshes with the next one
    if (!hadQueue) lastPass = { frame: passFrame, x: px, y: py, view: viewDist, visible: visibleDist, detail: detailR, version: tilesVersion };
  }

  // A streamed tile (tileworld.js onTiles: the province's and the
  // proefstrook's tiles) as one more far-LOD tile, built and dropped like
  // the rest; its objects are the rows the tile world's grids hold.
  function addStreamTile(key, x0, y0, size, { buildings = [], roads = [], green = [], water = [] }) {
    const k = 's:' + key;
    if (tiles.has(k)) disposeTile(tiles.get(k));
    const t = { key: k, x0, y0, x1: x0 + size, y1: y0 + size, buildings: [], segs: [], green: [], water: water.filter((w) => w.flat && w.pts.length >= 4), meshes: null, job: null, stream: true };
    for (const b of buildings) if (!isHidden(b) && b.bounds) { t.buildings.push(b); streamedRows.add(b); buildingTile.set(b, t); }
    for (const r of roads) for (let i = 0; i < r.pts.length - 1; i++) t.segs.push(r, i);
    for (const r of roads) streamedRows.add(r);
    for (const g of green) if (g.bounds && g.pts.length >= 3) { t.green.push(g); streamedRows.add(g); }
    if (colors.greenRank) t.green.sort((x, y) => colors.greenRank(x) - colors.greenRank(y));
    tiles.set(k, t);
    tilesVersion++;
  }
  function dropStreamTile(key) {
    const t = tiles.get('s:' + key);
    if (!t) return;
    tileCooler.forget(t); // review 22-11: anders houdt de koeler de gebouwen en stukken van een gedropte tegel vast
    disposeTile(t);
    tiles.delete(t.key);
    tilesVersion++;
  }

  function setNight(glow, litFrac) {
    shared.uNightGlow.value = glow;
    shared.uLitFrac.value = litFrac;
  }

  // #1354: heeft de verre laag een gebouwde kopie van dit gebouw (de audit van de LOD-dekking, scripts/qa/popin.page.js)?
  const covers = (b) => { const t = buildingTile.get(b); return !!(t && (t.meshes || t.oldMeshes)); };
  return { update, setNight, stats, root, addStreamTile, dropStreamTile, hideBuilding: hideFarBuilding, covers };
}
