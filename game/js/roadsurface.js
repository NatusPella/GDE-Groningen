import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { applyWetGround } from './terrain3d.js';
import { buildRoadStructure, buildOverpassDeck, structureGroup, jointAway, jointMiter } from './roadstructures3d.js';
import { onSettingsChange, QUALITY_PRESETS } from './settings.js';
import { pointInPolygon, closestPointOnSegment } from './util.js';
import { getWaterIndex } from './waterindex.js';
import { allSignals, yieldArms } from './junctions.js';
import { groundHeightAt } from './elevation.js';
import { runGeo, geoWorkerActive } from './geojobs.js';
import { geometryFromPlain } from './geoplain.js';
import { planBlends, blendAttributes, linearOf } from './surfaceblend.js';
import { laneLayout } from './lanes.js';
import { taperLines, taperLength, taperOffset } from './lanetaper.js';
import { isMarktFietsRoad, MARKT } from './roadaccess.js';

// Street surfaces: procedural asphalt / klinkers / stoeptegels / gravel in the
// shared wet-ground shader, mitred ribbons carrying road-space coordinates,
// kerbs merged into the sidewalk mesh, and one merged marking mesh per road.

export const GROUND_LAYER = { green: 1, sidewalk: 2, foot: 3, cycle: 4, minor: 5, normal: 6, major: 7, marking: 8 };
export const SIDEWALK_EXTRA = 1.8;
export const PAVED_MATS = [];

const CITY_CENTRE = [100.63, 76.18];
const KLINKER_RADIUS = 1500;
const SIDEWALK_CATS = new Set(['major', 'normal', 'minor']);
const CARRIAGE = new Set(['major', 'normal', 'minor']);
const JUNCTION_DIP = -0.004;
const KERB_H = 0.13;
// a sidewalk at the quay ends this far before the water, under the coping
const SHORE_INSET = 0.4;

// ---------------------------------------------------------------- shaders

const VERTEX_COMMON = `
#ifndef SURF_MARKING
attribute vec4 aSurf;
attribute float aSurfEnd;
attribute vec4 aBlendA;
attribute vec4 aBlendB;
#endif
varying vec4 vSurf;
varying float vSurfEnd;
varying vec4 vBlendA;
varying vec4 vBlendB;
`;

const VERTEX_MAIN = `
#ifndef SURF_MARKING
vSurf = aSurf; vSurfEnd = aSurfEnd; vBlendA = aBlendA; vBlendB = aBlendB;
#else
vSurf = vec4(0.0); vSurfEnd = 0.0; vBlendA = vec4(0.0); vBlendB = vec4(0.0);
#endif
`;

// vSurf: x = across (m, signed from centreline), y = along (m), z = carriageway
// width (negative on kerb faces), w / vSurfEnd = along range clear of junctions.
const FRAGMENT_COMMON = `
varying vec4 vSurf;
varying float vSurfEnd;
varying vec4 vBlendA;
varying vec4 vBlendB;
float sFade(float px, float a, float b) { return 1.0 - smoothstep(a, b, px); }
// integer hash: the float-fract hash degenerates into stripes at city-scale coordinates
float sHash(vec2 p) {
  uvec2 q = uvec2(ivec2(floor(p)));
  uint h = (q.x * 1597334677u) ^ (q.y * 3812015801u);
  h ^= h >> 16; h *= 2246822519u; h ^= h >> 13; h *= 3266489917u; h ^= h >> 16;
  return float(h) * (1.0 / 4294967295.0);
}
float sNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(sHash(i), sHash(i + vec2(1.0, 0.0)), u.x), mix(sHash(i + vec2(0.0, 1.0)), sHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
`;

const COLOR = `
{
  vec2 wp = vWetXZ;
  float px = length(fwidth(wp));
  float jz = min(vSurf.y - vSurf.w, vSurfEnd - vSurf.y);
  float jf = smoothstep(0.0, 3.0, jz);
  float rw = abs(vSurf.z);
  float ac = vSurf.x;
  float al = vSurf.y;
  float macro = sNoise(wp * 0.043) * 0.6 + sNoise(wp * 0.21 + 3.1) * 0.4;
  vec3 alb = vec3(1.0);
  float lanes = max(1.0, floor(rw / 3.1));
  float lw = max(rw / lanes, 0.1);
  float lp = (fract((ac + rw * 0.5) / lw) - 0.5) * lw;
  float track = (1.0 - smoothstep(0.12, 0.45, abs(abs(lp) - 0.85))) * jf * step(0.1, rw);

#if defined(SURF_ASPHALT) || defined(SURF_CYCLE)
  float fa = sFade(px, 0.012, 0.05);
  float agg = sNoise(wp * 42.0) * 0.6 + sNoise(wp * 97.0 + 3.0) * 0.4 * sFade(px, 0.004, 0.012);
  float stone = smoothstep(0.74, 0.82, sNoise(wp * 55.0 + 7.0));
  float fine = sNoise(wp * 7.0);
  alb *= 0.82 + 0.34 * macro + (fine - 0.5) * 0.14;
  alb *= 1.0 - smoothstep(0.55, 0.8, sNoise(wp * 0.12 + 20.0)) * 0.14;
  alb *= 1.0 + ((agg - 0.5) * 0.14 + stone * 0.22) * fa;
  sHeight += sNoise(wp * 30.0) * 0.0012 * sFade(px, 0.006, 0.02);
  sRough += (fine - 0.5) * 0.1 - stone * 0.08 * fa;
  float cn = sNoise(wp * 0.6 + vec2(sNoise(wp * 1.9), sNoise(wp * 1.9 + 9.0)) * 0.8);
  float crack = (1.0 - smoothstep(0.006, 0.006 + fwidth(cn) * 1.5, abs(cn - 0.5)))
    * smoothstep(0.5, 0.64, sNoise(wp * 0.05 + 11.0)) * sFade(px, 0.02, 0.1);
  alb *= 1.0 - crack * 0.6;
  sHeight -= crack * 0.003;
  sDip += crack * 0.35;
#ifdef SURF_ASPHALT
  alb *= 1.0 - track * (0.12 + 0.07 * sNoise(wp * 0.5));
  sRough -= track * 0.14;
  sDip += track * (0.18 + 0.25 * sNoise(wp * 0.23));
  vec2 cs = vec2(13.0, lw);
  vec2 rs = vec2(al, ac + rw * 0.5);
  vec2 pc = floor(rs / cs);
  vec2 pf = rs - pc * cs;
  vec2 psz = vec2(1.2 + 4.0 * sHash(pc + 3.1), lw * (0.35 + 0.5 * sHash(pc + 8.7)));
  vec2 po = (cs - psz) * vec2(sHash(pc + 1.3), sHash(pc + 4.4));
  vec2 pd = min(pf - po, po + psz - pf);
  float pm = min(pd.x, pd.y);
  float patchM = step(0.0, pm) * step(0.88, sHash(pc + 17.3)) * jf;
  alb *= mix(1.0, 0.86 + 0.08 * fine, patchM);
  sRough -= patchM * 0.06;
  float seam = patchM * (1.0 - smoothstep(0.02, 0.04 + px * 1.5, pm));
  alb *= 1.0 - seam * 0.4;
  sRough -= seam * 0.2;
  float oil = smoothstep(0.62, 0.85, sNoise(wp * 0.85 + 5.0)) * (1.0 - smoothstep(0.25, 0.8, abs(lp)))
    * smoothstep(0.0, 2.0, jz) * (1.25 - smoothstep(9.0, 16.0, jz));
  alb *= 1.0 - oil * 0.3;
  sRough -= oil * 0.4;
  float edge = rw * 0.5 - abs(ac);
  float gut = (1.0 - smoothstep(0.3, 0.3 + px, edge)) * jf;
  float gj = 1.0 - smoothstep(0.003, 0.003 + px, (0.5 - abs(fract(al * 2.0) - 0.5)) * 0.5);
  float gl = 1.0 - smoothstep(0.0, 0.004 + px, abs(edge - 0.3));
  alb = mix(alb, vec3(1.45 + 0.2 * fine) * (1.0 - gj * 0.3 * fa), gut);
  alb *= 1.0 - gl * 0.35 * jf;
  sRough += gut * 0.05;
  sDip += gut * 0.3;
#else
  alb *= 0.9 + 0.2 * sNoise(wp * 0.11 + 2.0);
#endif
#endif

#ifdef SURF_KLINKER
  vec2 kp = wp / 0.105;
  vec2 kc = floor(kp);
  float kd = mod(kc.x - kc.y, 4.0);
  vec2 klu, ksz, kid;
  if (kd < 1.5) {
    float left = kc.y + 4.0 * floor((kc.x - kc.y) / 4.0);
    klu = vec2((kp.x - left) * 0.5, kp.y - kc.y); ksz = vec2(2.0, 1.0); kid = vec2(left, kc.y);
  } else {
    float bot = kd > 2.5 ? kc.y : kc.y - 1.0;
    klu = vec2(kp.x - kc.x, (kp.y - bot) * 0.5); ksz = vec2(1.0, 2.0); kid = vec2(kc.x + 5000.0, bot);
  }
  vec2 ke = min(klu, 1.0 - klu) * ksz * 0.105;
  float kEdge = min(ke.x, ke.y);
  float kfa = sFade(px, 0.006, 0.025);
  float kfb = sFade(px, 0.03, 0.14);
  float kh = sHash(kid), kh2 = sHash(kid + 7.7);
  float joint = (1.0 - smoothstep(0.0025, 0.0025 + px, kEdge)) * kfa;
  vec3 kcol = vec3(1.0 + (kh - 0.5) * 0.38);
#ifdef KLINKER_RED
  kcol *= mix(vec3(1.0), vec3(1.12, 0.9, 0.82), kh2) * mix(vec3(1.0), vec3(0.62, 0.64, 0.72), step(0.94, kh2));
#else
  kcol *= mix(vec3(1.0), vec3(1.05, 1.0, 0.92), kh2);
#endif
  alb *= mix(vec3(1.0), kcol, kfb) * (0.88 + 0.24 * macro);
  alb *= mix(1.0, 0.62, joint);
  sHeight += (smoothstep(0.0, 0.01, kEdge) * 0.004 + (kh2 - 0.5) * 0.0015) * kfa;
  sRough += joint * 0.05 + (kh - 0.5) * 0.08 * kfb;
  sDip += joint * 0.25 + track * 0.35 * sNoise(wp * 0.2);
  alb *= 1.0 - track * 0.06;
  sRough -= track * 0.08;
  float kedge = (1.0 - smoothstep(0.0, 0.5, rw * 0.5 - abs(ac))) * jf * step(0.1, rw);
  alb *= mix(vec3(1.0), vec3(0.8, 0.85, 0.72), kedge * 0.6);
#endif

#ifdef SURF_TILES
  if (vSurf.z < 0.0) {
    float kj = 1.0 - smoothstep(0.003, 0.003 + px, 0.5 - abs(fract(al) - 0.5));
    alb = vec3(1.75 + 0.25 * sNoise(wp * 3.0)) * (0.9 + 0.2 * macro) * (1.0 - kj * 0.3);
    sRough -= 0.05;
  } else {
    float tjz = step(2.5, jz);
    vec2 tp = mix(wp, vec2(al, abs(ac) - rw * 0.5), tjz) / 0.3;
    vec2 tc = floor(tp), tf = fract(tp);
    vec2 tid = tc + vec2(0.0, step(0.0, ac) * 517.0) + tjz * 31.0;
    vec2 te2 = min(tf, 1.0 - tf) * 0.3;
    float te = min(te2.x, te2.y);
    float tfa = sFade(px, 0.008, 0.035);
    float tfb = sFade(px, 0.04, 0.18);
    float tjoint = (1.0 - smoothstep(0.002, 0.002 + px, te)) * tfa;
    float th = sHash(tid), th2 = sHash(tid + 3.3);
    vec3 tcol = vec3(0.93 + th * 0.14) * (1.0 - step(0.92, th2) * 0.16);
    alb *= mix(vec3(1.0), tcol, tfb) * (0.86 + 0.28 * macro);
    vec2 cdir = normalize(vec2(sHash(tid + 5.1), sHash(tid + 9.2)) - 0.5 + 1e-3);
    float cl = abs(dot(tf - 0.5, vec2(-cdir.y, cdir.x))) * 0.3;
    float tcrack = step(0.955, sHash(tid + 13.0)) * (1.0 - smoothstep(0.0012, 0.0012 + px, cl)) * tfa;
    alb *= (1.0 - tjoint * 0.35) * (1.0 - tcrack * 0.5);
    float tilt = dot(tf - 0.5, vec2(sHash(tid + 21.0), sHash(tid + 23.0)) - 0.5) * 0.004;
    sHeight += (smoothstep(0.0, 0.005, te) * 0.002 + tilt) * tfa - tcrack * 0.002;
    sRough += tjoint * 0.05 + (th - 0.5) * 0.06 * tfb;
    sDip += tjoint * 0.2 + tcrack * 0.2 + max(-tilt, 0.0) * 80.0;
    float gum = step(0.993, sHash(floor(wp * 14.0))) * sFade(px, 0.01, 0.03);
    alb *= 1.0 - gum * 0.3;
  }
#endif

#ifdef SURF_GRAVEL
  float gfa = sFade(px, 0.01, 0.04);
  float g1 = sHash(floor(wp * 60.0)), g2 = sHash(floor(wp * 23.0) + 4.0);
  alb *= (0.85 + 0.3 * macro) * (1.0 + ((g1 - 0.5) * 0.35 + (g2 - 0.5) * 0.2) * gfa);
  alb *= 1.0 - (1.0 - smoothstep(0.0, 0.35, rw * 0.5 - abs(ac))) * 0.15;
  sHeight += (g1 * 0.002 + g2 * 0.003) * gfa;
  sDip += sNoise(wp * 0.5) * 0.25;
#endif

#ifdef SURF_MARKING
  if (dot(diffuseColor.rgb, vec3(0.333)) > 0.5) {
    float mw = sNoise(wp * 2.3) * 0.55 + sNoise(wp * 9.0) * 0.3 + sNoise(wp * 31.0) * 0.15;
    if (mw < 0.33) discard;
    diffuseColor.rgb *= 0.78 + 0.22 * smoothstep(0.33, 0.7, mw);
  }
#endif
  // soepele overgang naar het dek van de buur aan begin en einde van de weg (surfaceblend.js)
  if (vBlendA.w > 0.0) {
    alb *= 1.0 + vBlendA.rgb * (1.0 - smoothstep(0.0, vBlendA.w, vSurf.y));
    alb *= 1.0 + vBlendB.rgb * (1.0 - smoothstep(0.0, vBlendA.w, vBlendB.w - vSurf.y));
  }
  diffuseColor.rgb *= alb;
}
`;

const NORMAL = `
#ifdef SURF_BUMP
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

const SURF_SHADER = { key: 'roadsurf2', vertexCommon: VERTEX_COMMON, vertexMain: VERTEX_MAIN, fragmentCommon: FRAGMENT_COMMON, color: COLOR, normal: NORMAL };

// ---------------------------------------------------------------- materials

const SURFACES = {
  asphalt: { define: 'SURF_ASPHALT', roughness: 0.88, rank: 3, colors: { major: 0x57595c, normal: 0x4b4d50, minor: 0x505255 } },
  cycle: { define: 'SURF_CYCLE', roughness: 0.86, rank: 3, colors: { cycle: 0x823b2d } },
  klinker_red: { define: 'SURF_KLINKER', extra: 'KLINKER_RED', roughness: 0.9, rank: 2, colors: { any: 0x6c4236 } },
  klinker_grey: { define: 'SURF_KLINKER', roughness: 0.9, rank: 1, colors: { any: 0x7a766e } },
  tiles: { define: 'SURF_TILES', roughness: 0.93, rank: 2, colors: { sidewalk: 0x7b776d, any: 0x837e74 } },
  gravel: { define: 'SURF_GRAVEL', roughness: 0.97, rank: 0, colors: { any: 0x9a8f78 } },
};

let detail = true;
let qualityVersion = 0;
const materials = new Map();

// rank: a sub-step inside the layer (0-3), so two surfaces of one layer that
// overlap at a junction (asphalt and klinkers) have a fixed winner
function makeMaterial(color, layer, roughness, defines, extra = {}, rank = 0) {
  const m = new THREE.MeshStandardMaterial({
    color, roughness, polygonOffset: true, polygonOffsetFactor: -layer, polygonOffsetUnits: -layer * 4 - rank, ...extra,
  });
  m.defines = { ...defines };
  if (detail && defines.SURF_MARKING === undefined) m.defines.SURF_BUMP = '';
  applyWetGround(m, SURF_SHADER);
  PAVED_MATS.push(m);
  return m;
}

function surfaceMaterial(layerName, surf) {
  const key = layerName + ':' + surf;
  let m = materials.get(key);
  if (m) return m;
  const def = SURFACES[surf];
  const color = def.colors[layerName] ?? def.colors.any ?? Object.values(def.colors)[0];
  const defines = { [def.define]: '' };
  if (def.extra) defines[def.extra] = '';
  m = makeMaterial(color, GROUND_LAYER[layerName], def.roughness, defines, {}, def.rank);
  materials.set(key, m);
  return m;
}

// The materials road r is drawn with (buildRoadGroup): the carriageway's and,
// on a road with pavements, the pavement's. A movable bridge's leaf wears the
// same ones, so the deck does not change look when it opens.
export function roadSurfaceMaterials(r) {
  const net = ownNet(r);
  try {
    const layer = GROUND_LAYER[r.cat] ? r.cat : 'normal';
    return { road: surfaceMaterial(layer, roadSurface(r)), sidewalk: SIDEWALK_CATS.has(r.cat) ? surfaceMaterial('sidewalk', 'tiles') : null };
  } finally {
    restoreNet(net);
  }
}

let markingMaterial = null;
export function getMarkingMaterial() {
  if (!markingMaterial) {
    markingMaterial = makeMaterial(0xffffff, GROUND_LAYER.marking, 0.62, { SURF_MARKING: '' }, { map: buildAtlas(), alphaTest: 0.5 });
  }
  return markingMaterial;
}

onSettingsChange((st) => {
  const next = (QUALITY_PRESETS[st.quality] ? st.quality : 'hoog') !== 'laag';
  if (next === detail) return;
  detail = next;
  qualityVersion++;
  for (const m of PAVED_MATS) {
    if (m.defines.SURF_MARKING !== undefined) continue;
    if (detail) m.defines.SURF_BUMP = ''; else delete m.defines.SURF_BUMP;
    m.needsUpdate = true;
  }
});

export function getRoadQualityVersion() { return qualityVersion; }

// Atlas quadrants (canvas px): white paint, manhole, drain grate, bike symbol.
const UV_WHITE = [0.25, 0.875];
const UV_BUS = [0, 0.5, 0.5, 0.75];
const UV_RED = [0.25, 0.457];
const UV_MANHOLE = [0.5, 0.5, 1, 1];
const UV_GRATE = [0, 0, 0.5, 0.5];
const UV_BIKE = [0.5, 0, 1, 0.5];

function buildAtlas() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, 128, 64);
  g.font = 'bold 50px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('BUS', 64, 98);
  // bus lane asphalt (dark enough to count as surface, not worn paint)
  g.fillStyle = '#6e2a22';
  g.fillRect(0, 130, 128, 18);

  g.save();
  g.translate(192, 64);
  g.fillStyle = '#2d2c2a';
  g.beginPath(); g.arc(0, 0, 56, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#4a4844'; g.lineWidth = 5;
  g.beginPath(); g.arc(0, 0, 52, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(0, 0, 40, 0, Math.PI * 2); g.clip();
  g.lineWidth = 3; g.strokeStyle = '#3f3d3a';
  for (let i = -48; i <= 48; i += 10) {
    g.beginPath(); g.moveTo(i, -50); g.lineTo(i + 50, 50); g.stroke();
    g.beginPath(); g.moveTo(i, -50); g.lineTo(i - 50, 50); g.stroke();
  }
  g.restore();

  g.fillStyle = '#343331';
  g.fillRect(14, 150, 100, 84);
  g.fillStyle = '#0d0d0c';
  for (let x = 24; x < 108; x += 12) g.fillRect(x, 160, 6, 64);

  g.save();
  g.translate(192, 192);
  g.strokeStyle = '#fff'; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.arc(-30, 16, 20, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(30, 16, 20, 0, Math.PI * 2); g.stroke();
  g.beginPath();
  g.moveTo(-30, 16); g.lineTo(-10, -14); g.lineTo(20, -14); g.lineTo(30, 16);
  g.moveTo(-30, 16); g.lineTo(4, 16); g.lineTo(-10, -14);
  g.moveTo(4, 16); g.lineTo(20, -14);
  g.moveTo(-14, -24); g.lineTo(-4, -24);
  g.moveTo(20, -14); g.lineTo(16, -28); g.lineTo(26, -30);
  g.stroke();
  g.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// ---------------------------------------------------------------- network

let netMap = null;
let nodeIndex = new Map();
let lights = [];
const nodeKey = (p) => Math.round(p[0] * 10) + ',' + Math.round(p[1] * 10);

// Junction index and signals per road network: the city map, and any other
// map whose roads carry it as r.net; a road
// is always built against its own network.
const nets = new WeakMap();
function netState(map) {
  let s = nets.get(map);
  if (s) return s;
  s = { nodeIndex: new Map(), lights: allSignals(map).filter((l) => !l.bike) };
  for (const r of map.roads) {
    for (let i = 0; i < r.pts.length; i++) {
      const k = nodeKey(r.pts[i]);
      let a = s.nodeIndex.get(k);
      if (!a) s.nodeIndex.set(k, a = []);
      a.push(r, i);
    }
  }
  nets.set(map, s);
  return s;
}
function useNet(map) {
  const prev = [netMap, nodeIndex, lights];
  const s = netState(map);
  netMap = map; nodeIndex = s.nodeIndex; lights = s.lights;
  return prev;
}
function ownNet(r) {
  return r.net && r.net !== netMap ? useNet(r.net) : null;
}
function restoreNet(prev) {
  if (prev) [netMap, nodeIndex, lights] = prev;
}

export function setRoadNetwork(map) {
  if (netMap === map) return;
  useNet(map);
}

function roadHash(r) {
  const p = r.pts[0];
  const v = Math.sin(p[0] * 12.9898 + p[1] * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

function inGreen(x, y) {
  if (!netMap) return false;
  for (const g of netMap.greenNear(x, y, 1)) {
    const b = g.bounds;
    if (b && (x < b[0] || x > b[2] || y < b[1] || y > b[3])) continue;
    if (pointInPolygon(x, y, g.pts)) return true;
  }
  return false;
}

export function roadSurface(r) {
  if (r._surf) return r._surf;
  const mid = r.pts[Math.floor(r.pts.length / 2)];
  const d = Math.hypot(mid[0] - CITY_CENTRE[0], mid[1] - CITY_CENTRE[1]);
  const h = roadHash(r);
  const inner = d < KLINKER_RADIUS;
  let s = 'asphalt';
  if (r.cat === 'cycle') s = 'cycle';
  else if (r.cat === 'foot') {
    if (r.type === 'pedestrian') s = 'klinker_grey';
    else if (r.type === 'footway' && inGreen(mid[0], mid[1])) s = 'gravel';
    else s = 'tiles';
  } else if (r.cat === 'normal') {
    if (r.type === 'residential' && h < (inner ? 0.85 : 0.35)) s = 'klinker_red';
    else if (r.type === 'unclassified' && inner && h < 0.3) s = 'klinker_red';
  } else if (r.cat === 'minor') {
    if (r.type === 'living_street') s = 'klinker_red';
    else if (r.type === 'track') s = 'gravel';
    else if (h < (inner ? 0.9 : 0.5)) s = h < 0.45 ? 'klinker_grey' : 'klinker_red';
  }
  if (netMap) r._surf = s;
  return s;
}

// Far LOD tint matching the detailed surface (colour only).
export function roadFarColor(r) {
  const s = roadSurface(r);
  if (s === 'klinker_red') return 0x6c4236;
  if (s === 'klinker_grey') return 0x77736b;
  if (s === 'gravel') return 0x9a8f78;
  return null;
}

// ---------------------------------------------------------------- analysis

function dirAt(pts, i, step) {
  const a = pts[i], b = pts[i + step];
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  return [dx / l, dy / l];
}

function endInfo(r, i, away, hw) {
  const list = nodeIndex.get(nodeKey(r.pts[i])) || [];
  const others = [];
  for (let k = 0; k < list.length; k += 2) {
    const o = list[k], oi = list[k + 1];
    if (o === r && oi === i) continue;
    if (o.cat === 'foot') continue;
    others.push(o, oi);
  }
  if (!others.length) return { J: 0 };
  if (others.length === 2) {
    const o = others[0], oi = others[1];
    if (o === r) return { J: 0 };
    const oEnd = oi === 0 || oi === o.pts.length - 1;
    if (oEnd && o.cat === r.cat && Math.abs(o.width - r.width) < 1.5) {
      const od = dirAt(o.pts, oi, oi === 0 ? 1 : -1);
      if (od[0] * away[0] + od[1] * away[1] < -0.8) return { J: 0 };
    }
  }
  let J = 0;
  for (let k = 0; k < others.length; k += 2) {
    const o = others[k], oi = others[k + 1];
    const dirs = [];
    if (oi > 0) dirs.push(dirAt(o.pts, oi, -1));
    if (oi < o.pts.length - 1) dirs.push(dirAt(o.pts, oi, 1));
    for (const od of dirs) {
      const cos = od[0] * away[0] + od[1] * away[1];
      if (cos < -0.85) continue;
      const si = Math.sqrt(1 - cos * cos);
      // (a slip road merging at a shallow angle overlaps the other way for metres)
      J = Math.max(J, Math.min(30, (o.width / 2 + hw * Math.abs(cos)) / Math.max(si, 0.15) + 1));
    }
  }
  return { J: Math.max(J, 1) };
}

function analyse(r) {
  if (r._rs) return r._rs;
  const pts = r.pts, n = pts.length;
  const s = new Float64Array(n);
  const segN = [];
  for (let i = 0; i < n - 1; i++) {
    const d = dirAt(pts, i, 1);
    segN.push([-d[1], d[0]]);
    s[i + 1] = s[i] + Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  }
  const miter = [];
  for (let i = 0; i < n; i++) {
    if (i === 0 || i === n - 1) {
      // an end that carries straight on into the next way is cut on the bisector
      const sn = segN[i === 0 ? 0 : n - 2];
      const away = netMap ? jointAway(netMap, r, i) : null;
      miter.push(away ? jointMiter(sn, away, i === 0, 0.4) : sn.slice());
      continue;
    }
    const a = segN[i - 1], b = segN[i];
    let mx = a[0] + b[0], my = a[1] + b[1];
    const ml = Math.hypot(mx, my);
    if (ml < 1e-3) { miter.push(b.slice()); continue; }
    mx /= ml; my /= ml;
    const sc = 1 / Math.max(mx * b[0] + my * b[1], 0.4);
    miter.push([mx * sc, my * sc]);
  }
  const L = s[n - 1];
  const hw = r.width / 2;
  const e0 = endInfo(r, 0, dirAt(pts, 0, 1), hw);
  const e1 = endInfo(r, n - 1, dirAt(pts, n - 1, -1), hw);
  const rs = {
    s, miter, segN, L, hw, e0, e1,
    S0: e0.J > 0 ? e0.J : -1e4,
    S1: e1.J > 0 ? L - e1.J : L + 1e4,
    cuts: [], crossings: [], zones: [], plain: r.cat === 'foot',
  };

  for (let i = 1; i < n - 1; i++) {
    const list = nodeIndex.get(nodeKey(pts[i]));
    if (!list || list.length <= 2) continue;
    const rd = [(segN[i - 1][1] + segN[i][1]) * -0.5, (segN[i - 1][0] + segN[i][0]) * 0.5];
    const rl = Math.hypot(rd[0], rd[1]) || 1;
    const fwd = [rd[0] / rl, rd[1] / rl], right = [-fwd[1], fwd[0]];
    for (let k = 0; k < list.length; k += 2) {
      const o = list[k], oi = list[k + 1];
      if (o === r) continue;
      const foot = o.cat === 'foot';
      if (!foot && !CARRIAGE.has(o.cat) && o.cat !== 'cycle') continue;
      const interior = oi > 0 && oi < o.pts.length - 1;
      if (foot && interior && CARRIAGE.has(r.cat) && r.cat !== 'minor') rs.crossings.push({ s: s[i], zebra: true });
      const dirs = [];
      if (oi > 0) dirs.push(dirAt(o.pts, oi, -1));
      if (oi < o.pts.length - 1) dirs.push(dirAt(o.pts, oi, 1));
      for (const od of dirs) {
        const sn = Math.abs(od[0] * fwd[1] - od[1] * fwd[0]);
        const side = od[0] * right[0] + od[1] * right[1] > 0 ? 1 : -1;
        const hl = (foot ? 1.2 : o.width / 2 / Math.max(sn, 0.35) + 1.2);
        rs.cuts.push([s[i] - hl, s[i] + hl, side]);
        if (sharesLayer(r, o)) rs.zones.push([s[i], hl + (SIDEWALK_CATS.has(o.cat) ? SIDEWALK_EXTRA / Math.max(sn, 0.35) : 0)]);
      }
    }
  }

  if (r.cat === 'major' || r.cat === 'normal') {
    const b = r.bounds;
    for (const lt of lights) {
      if (b && (lt.x < b[0] - 15 || lt.x > b[2] + 15 || lt.y < b[1] - 15 || lt.y > b[3] + 15)) continue;
      let bi = -1, bd = 100;
      for (let i = 0; i < n; i++) {
        const d = (pts[i][0] - lt.x) ** 2 + (pts[i][1] - lt.y) ** 2;
        if (d < bd) { bd = d; bi = i; }
      }
      if (bi === 0 && e0.J > 0) rs.crossings.push({ s: e0.J + 2.2, stop: 1 });
      else if (bi === n - 1 && e1.J > 0) rs.crossings.push({ s: L - e1.J - 2.2, stop: -1 });
      else if (bi > 0 && bi < n - 1) {
        let hl = 0;
        for (const c of rs.cuts) if (Math.abs((c[0] + c[1]) / 2 - s[bi]) < 0.01) hl = Math.max(hl, (c[1] - c[0]) / 2);
        if (hl > 1.3) {
          rs.crossings.push({ s: s[bi] - hl - 2.2, stop: -1 });
          rs.crossings.push({ s: s[bi] + hl + 2.2, stop: 1 });
        } else {
          const p = project(rs, pts, lt.x, lt.y);
          if (p && p.d < 12) rs.crossings.push({ s: p.s });
        }
      } else {
        const p = project(rs, pts, lt.x, lt.y);
        if (p && p.d < 12) rs.crossings.push({ s: p.s });
      }
    }
    const kept = [];
    for (const c of rs.crossings.sort((a, b2) => a.s - b2.s)) {
      if (c.s < 2.5 || c.s > L - 2.5) continue;
      if (kept.some((k) => Math.abs(k.s - c.s) < 8)) continue;
      kept.push(c);
    }
    rs.crossings = kept;
  } else rs.crossings = [];

  return (r._rs = rs);
}

// Ribbons of r and o lie in the same ground layer where they cross: the same
// category, or both with a sidewalk.
function sharesLayer(r, o) {
  return GROUND_LAYER[r.cat] === GROUND_LAYER[o.cat] || (SIDEWALK_CATS.has(r.cat) && SIDEWALK_CATS.has(o.cat));
}

// The junction zones round the point at along-distance p of r: the end of the
// last one centred at or before it and the start of the first one centred at
// or after it (as aSurf.w and aSurfEnd). Inside a zone (and up to a few metres out) the
// surface shaders drop the patterns tied to the way's own coordinates (lane
// wear, gutters, patches, tile courses), so the ribbons of two ways that
// cross there look the same and cannot flicker against each other.
function zoneAt(rs, p, zones) {
  // footways and squares are one junction zone from end to end: their paving
  // lies in world space, so the dense paths and outlines of squares that
  // overlap everywhere look the same wherever they do
  if (rs.plain) return [1e4, -1e4];
  let w = rs.S0, e = rs.S1;
  for (const [c, hl] of zones) {
    if (c <= p + 1e-6) w = Math.max(w, c + hl);
    if (c >= p - 1e-6) e = Math.min(e, c - hl);
  }
  return [w, e];
}

// Zones where r's ribbon ('road' or 'walk') overlaps the ribbon of a way in
// the same ground layer that it shares no node with there (service roads
// that nearly touch, a way ending just beside another): [centre s, half
// length] along r, like the junction zones. Ways lying side by side are cut
// back by ribbonClip instead.
const NEAR_STEP = 1;
function nearZones(r, rs, kind) {
  const key = kind === 'walk' ? 'nearWalk' : 'nearRoad';
  if (rs[key]) return rs[key];
  const out = (rs[key] = []);
  if (!netMap || rs.plain || r.pts.length < 2) return out;
  const walk = kind === 'walk';
  if (walk ? !SIDEWALK_CATS.has(r.cat) : !CARRIAGE.has(r.cat)) return out;
  const ext = walk ? SIDEWALK_EXTRA : 0;
  const hr = rs.hw + ext;
  const P = r.pts, n = P.length;
  const ok = (o) => o !== r && o.pts.length >= 2 && (walk ? SIDEWALK_CATS.has(o.cat) : GROUND_LAYER[o.cat] === GROUND_LAYER[r.cat]);
  const mine = new Set(P.map(nodeKey));
  const sharedOf = new Map();
  const shared = (o) => {
    let l = sharedOf.get(o);
    if (!l) sharedOf.set(o, l = o.pts.filter((p) => mine.has(nodeKey(p))));
    return l;
  };
  let lo = -1, hi = -1;
  const flush = () => {
    if (lo >= 0) out.push([(lo + hi) / 2, (hi - lo) / 2 + NEAR_STEP]);
    lo = hi = -1;
  };
  // is side j cut back at both ribbon stations round t on segment i?
  const clip = walk ? rs.walkClip : roadClip(r, rs);
  const segLims = new Map();
  const clipped = (i, t, j) => {
    if (!clip) return false;
    let L = segLims.get(i);
    if (!L) {
      const m0 = rs.miter[i], m1 = rs.miter[i + 1], p0 = P[i], p1 = P[i + 1];
      L = [[0, clip.pts[i]]];
      for (const u of clip.steps(i)) L.push([u, clip.at(p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u, m0[0] + (m1[0] - m0[0]) * u, m0[1] + (m1[1] - m0[1]) * u, i, u)]);
      L.push([1, clip.pts[i + 1]]);
      segLims.set(i, L);
    }
    let q = 1;
    while (q < L.length - 1 && L[q][0] < t) q++;
    return L[q - 1][1][j] < hr - 1e-3 && L[q][1][j] < hr - 1e-3;
  };
  const grid = netMap.roadGrid;
  for (let i = 0; i < n - 1; i++) {
    const a = P[i], b = P[i + 1];
    const len = rs.s[i + 1] - rs.s[i];
    const bx0 = Math.min(a[0], b[0]) - hr, by0 = Math.min(a[1], b[1]) - hr, bx1 = Math.max(a[0], b[0]) + hr, by1 = Math.max(a[1], b[1]) + hr;
    // the partner segments within reach of this one: [o, k, ho]
    const segs = [];
    if (len > 1e-3) {
      for (const o of grid.query(bx0 - 12, by0 - 12, bx1 + 12, by1 + 12)) {
        if (!ok(o)) continue;
        const ho = o.width / 2 + ext, [ox0, oy0, ox1, oy1] = o.bounds;
        if (ox0 - ho > bx1 || ox1 + ho < bx0 || oy0 - ho > by1 || oy1 + ho < by0) continue;
        const Q = o.pts;
        for (let k = 0; k < Q.length - 1; k++) {
          const p = Q[k], q = Q[k + 1];
          if (Math.min(p[0], q[0]) - ho > bx1 || Math.max(p[0], q[0]) + ho < bx0 || Math.min(p[1], q[1]) - ho > by1 || Math.max(p[1], q[1]) + ho < by0) continue;
          segs.push(o, k, ho);
        }
      }
    }
    if (!segs.length) { flush(); continue; }
    const d = dirAt(P, i, 1);
    const steps = Math.max(1, Math.ceil(len / NEAR_STEP));
    for (let q = i === 0 ? 0 : 1; q <= steps; q++) {
      const t = q / steps, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
      const zr = r.z ? r.z[i] + (r.z[i + 1] - r.z[i]) * t : 0;
      let hit = false;
      for (let m = 0; m < segs.length && !hit; m += 3) {
        const o = segs[m], k = segs[m + 1], reach = hr + segs[m + 2], Q = o.pts;
        const cp = closestPointOnSegment(x, y, Q[k][0], Q[k][1], Q[k + 1][0], Q[k + 1][1]);
        if (cp.dist2 >= reach * reach) continue;
        // (round a node they share the junction zones and mitred joints see to it)
        if (shared(o).some((p) => (p[0] - x) ** 2 + (p[1] - y) ** 2 < (reach + 1) ** 2)) continue;
        if ((r.z || o.z) && Math.abs(zr - (o.z ? o.z[k] + (o.z[k + 1] - o.z[k]) * cp.t : 0)) > 0.8) continue;
        const dist = Math.sqrt(cp.dist2);
        // side by side ribbonClip stops both halfway, except on the stretch
        // where the cut-back edge fans out from a station it did not cut
        const od = dirAt(Q, k, 1), lat = (cp.x - x) * -d[1] + (cp.y - y) * d[0];
        if (dist > 0.3 && Math.abs(od[0] * d[0] + od[1] * d[1]) >= 0.9 && Math.abs(lat) >= 0.8 * dist && clipped(i, t, lat > 0 ? 0 : 1)) continue;
        hit = true;
      }
      const sv = rs.s[i] + len * t;
      if (hit) { if (lo < 0) lo = sv; hi = sv; } else flush();
    }
  }
  flush();
  return out;
}

function project(rs, pts, x, y) {
  let best = null;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
    const d = Math.hypot(ax + dx * t - x, ay + dy * t - y);
    if (!best || d < best.d) best = { d, s: rs.s[i] + (rs.s[i + 1] - rs.s[i]) * t };
  }
  return best;
}

// Point at along-distance s and signed offset off (right of travel is +),
// interpolated between mitred vertices so it matches the ribbon edges.
function at(r, rs, sAlong, off, out) {
  const s = rs.s, n = s.length;
  let i = 0;
  while (i < n - 2 && s[i + 1] < sAlong) i++;
  const len = s[i + 1] - s[i] || 1;
  const t = (sAlong - s[i]) / len;
  const a = r.pts[i], b = r.pts[i + 1], ma = rs.miter[i], mb = rs.miter[i + 1];
  const ax = a[0] + ma[0] * off, ay = a[1] + ma[1] * off;
  const bx = b[0] + mb[0] * off, by = b[1] + mb[1] * off;
  out[0] = ax + (bx - ax) * t;
  out[1] = ay + (by - ay) * t;
  out[2] = i;
  out[3] = r.z ? r.z[i] + (r.z[i + 1] - r.z[i]) * Math.min(1, Math.max(0, t)) : 0;
  return out;
}

function stations(rs, s0, s1) {
  const out = [s0];
  for (let i = 1; i < rs.s.length - 1; i++) if (rs.s[i] > s0 + 0.05 && rs.s[i] < s1 - 0.05) out.push(rs.s[i]);
  out.push(s1);
  return out;
}

// ---------------------------------------------------------------- geometry

function finishGeometry(pos, nrm, idx, extra) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  for (const [name, arr, size] of extra) g.setAttribute(name, new THREE.Float32BufferAttribute(arr, size));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

// clip: edge limits along the way (ribbonClip), or null for a plain ribbon
// of half width `half`. Where an edge is cut back the segment gets a
// station every DENSE metres, so the edge follows the quay or the
// carriageway alongside.
const DENSE = 3;
function ribbonInto(r, rs, half, B, surfWidth, clip = null, near = null, drop = false) {
  const n = r.pts.length;
  const station = (k, t, zone) => {
    const p = r.pts[k], m = rs.miter[k];
    const q = k + 1 < n ? r.pts[k + 1] : p, mq = k + 1 < n ? rs.miter[k + 1] : m;
    const x = p[0] + (q[0] - p[0]) * t, z = p[1] + (q[1] - p[1]) * t;
    const mx = m[0] + (mq[0] - m[0]) * t, mz = m[1] + (mq[1] - m[1]) * t;
    const sv = rs.s[k] + (k + 1 < n ? rs.s[k + 1] - rs.s[k] : 0) * t;
    const h0 = r.z ? r.z[k] + (k + 1 < n ? r.z[k + 1] - r.z[k] : 0) * t : 0;
    const dip = t === 0 && ((k === 0 && rs.e0.J > 0) || (k === n - 1 && rs.e1.J > 0)) ? JUNCTION_DIP : 0;
    const lim = clip ? (t === 0 ? clip.pts[k] : clip.at(x, z, mx, mz, k, t)) : null;
    const at = B.pos.length / 3;
    for (let j = 0; j < 2; j++) {
      const sg = j ? -1 : 1, h = lim ? lim[j] : half;
      B.pos.push(x + mx * h * sg, h0 + dip, z + mz * h * sg);
      B.nrm.push(0, 1, 0);
      B.surf.push(h * sg, sv, surfWidth, zone[0]);
      B.end.push(zone[1]);
      if (drops) {
        // a cut-back edge over a lower surface (a ramp merging with the
        // carriageway alongside at another height): how far it drops there
        const ml = Math.hypot(mx, mz) || 1, ex = x + mx * h * sg, ez = z + mz * h * sg;
        const low = h < half - 0.05 ? groundHeightAt(netMap.elev, ex + mx / ml * sg * 0.15, ez + mz / ml * sg * 0.15, h0 - 0.15, 0) : h0;
        drops[j].push([ex, ez, h0 + dip, h0 - low > 0.1 && h0 - low < 3 ? low : h0 + dip, sv, mx / ml * sg, mz / ml * sg]);
      }
    }
    return at;
  };
  const drops = drop && r.z && clip && netMap && netMap.elev && netMap.elev.has ? [[], []] : null;
  // every station is shared by the triangles either side (a seam of doubled
  // points is a crack to the audit and a T-joint to the rasteriser); the
  // zones get stations at their centre and both ends, so the linearly
  // interpolated range stays exact between stations
  const zones = near && near.length ? rs.zones.concat(near) : rs.zones;
  let prev = station(0, 0, zoneAt(rs, 0, zones));
  for (let i = 0; i < n - 1; i++) {
    const s0 = rs.s[i], s1 = rs.s[i + 1], len = s1 - s0;
    const ts = clip ? clip.steps(i).slice() : [];
    if (len > 0.1 && !rs.plain) {
      for (const [c, hl] of zones) {
        for (const sv of [c - hl, c, c + hl]) if (sv > s0 + 0.05 && sv < s1 - 0.05) ts.push((sv - s0) / len);
      }
      ts.sort((p, q) => p - q);
    }
    let a = prev, last = -1;
    for (const t of ts) {
      if (t - last < 0.02 / Math.max(len, 0.02)) continue;
      last = t;
      const b = station(i, t, zoneAt(rs, s0 + t * len, zones));
      B.idx.push(a, b, a + 1, a + 1, b, b + 1);
      a = b;
    }
    const b = station(i + 1, 0, zoneAt(rs, s1, zones));
    B.idx.push(a, b, a + 1, a + 1, b, b + 1);
    prev = b;
  }
  if (!drops) return;
  // a face down from that edge to the surface below (drawn only)
  for (let j = 0; j < 2; j++) {
    const D = drops[j];
    for (let i = 0; i < D.length - 1; i++) {
      const p = D[i], q = D[i + 1];
      if (p[3] >= p[2] && q[3] >= q[2]) continue;
      const v = B.pos.length / 3;
      for (const e of [p, q]) {
        for (const y of [Math.min(e[3], e[2]) - 0.02, e[2]]) {
          B.pos.push(e[0], y, e[1]);
          B.nrm.push(e[5], 0, e[6]);
          B.surf.push(0, e[4], -1, -1e4);
          B.end.push(1e9);
        }
      }
      // (v, v+1: bottom and top here; v+2, v+3 at the next station)
      if (j === 0) B.idx.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
      else B.idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
    }
  }
}

// Edge limits of r's carriageway ('road') or sidewalk ('walk') ribbon:
//  - at the quay a street-level ribbon stops SHORE_INSET short of the water
//    (under the coping) instead of hanging out over the canal;
//  - beside a way in the same ground layer whose ribbon it would overlap (the
//    two carriageways of a dual road, a street and the service road or the
//    sidewalk of the street alongside) it stops halfway between them (by
//    width): two coplanar ribbons with their own patterns flicker where
//    they overlap.
// Null when neither applies, else { at(x, y, mx, my, k, t): [right, left]
// half widths (miter units), pts: those at every point, steps(i): the extra
// stations (0..1) along segment i }.
function ribbonClip(r, rs, kind) {
  if (!netMap || r.pts.length < 2) return null;
  const sidewalk = kind === 'walk';
  const half = r.width / 2 + (sidewalk ? SIDEWALK_EXTRA : 0);
  const [x0, y0, x1, y1] = r.bounds || boundsOf(r.pts);
  const pad = half * 2.5 + 1;
  // (a way with a height profile only where it lies at street level)
  const lv = r.z ? boundsOf(r.pts.filter((p, k) => Math.abs(r.z[k]) < 0.3)) : [x0, y0, x1, y1];
  const wet = !r.bridge && lv[0] <= lv[2] && netMap.water.some((w) => w.bounds && w.bounds[0] < lv[2] + pad && w.bounds[2] > lv[0] - pad && w.bounds[1] < lv[3] + pad && w.bounds[3] > lv[1] - pad);
  const index = wet ? getWaterIndex(netMap) : null;
  // (a way with a height profile clips one without where they lie level side by side)
  const partners = netMap.roadGrid.query(x0 - pad - 8, y0 - pad - 8, x1 + pad + 8, y1 + pad + 8).filter((o) => o !== r && o.pts.length >= 2
    && (sidewalk ? SIDEWALK_CATS.has(o.cat) && SIDEWALK_CATS.has(r.cat) : GROUND_LAYER[o.cat] === GROUND_LAYER[r.cat]));
  if (!index && !partners.length) return null;
  const P = r.pts, n = P.length;
  // the sidewalk is never narrower than the carriageway on top of it
  const road = sidewalk ? roadClip(r, rs) : null;
  // a ramp's sidewalk stops at the lanes of a lower ramp or road beside it
  // instead of hanging over them (the drop face closes the gap)
  const zRange = (w) => (w.z ? [Math.min(...w.z), Math.max(...w.z)] : [0, 0]);
  const rz = zRange(r);
  const lower = sidewalk && !r.bridge ? partners.filter((o) => {
    if (!(r.z || o.z) || o.tunnel) return false;
    const oz = zRange(o);
    return rz[1] - oz[0] > 0.3 && rz[0] - oz[1] < 4;
  }) : [];
  // the segments of those near segment k of r, then within reach of a station: [o, i, ho]
  const nearSegs = new Map();
  const laneSegs = (x, y, reach, k) => {
    let near = nearSegs.get(k);
    if (!near) {
      nearSegs.set(k, near = []);
      const a = P[k], b = P[Math.min(k + 1, n - 1)], pad = half * 3;
      const bx0 = Math.min(a[0], b[0]) - pad, by0 = Math.min(a[1], b[1]) - pad, bx1 = Math.max(a[0], b[0]) + pad, by1 = Math.max(a[1], b[1]) + pad;
      for (const o of lower) {
        const Q = o.pts, ho = o.width / 2, [ox0, oy0, ox1, oy1] = o.bounds;
        if (ox0 - ho > bx1 || ox1 + ho < bx0 || oy0 - ho > by1 || oy1 + ho < by0) continue;
        for (let i = 0; i < Q.length - 1; i++) {
          const p = Q[i], q = Q[i + 1];
          if (Math.min(p[0], q[0]) - ho > bx1 || Math.max(p[0], q[0]) + ho < bx0 || Math.min(p[1], q[1]) - ho > by1 || Math.max(p[1], q[1]) + ho < by0) continue;
          near.push(o, i, ho);
        }
      }
    }
    const out = [];
    for (let m = 0; m < near.length; m += 3) {
      const Q = near[m].pts, i = near[m + 1], d = reach + near[m + 2];
      if (closestPointOnSegment(x, y, Q[i][0], Q[i][1], Q[i + 1][0], Q[i + 1][1]).dist2 < d * d) out.push(near[m], i, near[m + 2]);
    }
    return out;
  };
  const lanesBelow = (segs, px, py, h) => {
    for (let m = 0; m < segs.length; m += 3) {
      const o = segs[m], i = segs[m + 1], ho = segs[m + 2], Q = o.pts;
      const cp = closestPointOnSegment(px, py, Q[i][0], Q[i][1], Q[i + 1][0], Q[i + 1][1]);
      if (cp.dist2 >= ho * ho) continue;
      const d = h - (o.z ? o.z[i] + (o.z[i + 1] - o.z[i]) * cp.t : 0);
      if (d > 0.3 && d < 4) return true;
    }
    return false;
  };
  const at = (x, y, mx, my, k, t) => {
    const ml = Math.hypot(mx, my) || 1, reach = half * ml;
    // (at an end along its miter: a way carrying on from there shares it, so
    // both see the way alongside as beside them or not)
    const d = t === 0 && (k === 0 || k === n - 1) ? [my / ml, -mx / ml] : dirAt(P, Math.min(k, n - 2), 1);
    const sn = rs.segN[Math.min(k, n - 2)];
    const res = [half, half];
    const zr = r.z ? r.z[k] + (k + 1 < n ? r.z[k + 1] - r.z[k] : 0) * t : 0;
    const level = index && Math.abs(zr) < 0.3;
    // (a path drawn out over the water without a bridge: nothing there)
    if (level && index.inWater(x, y)) return [0, 0];
    if (level) {
      for (let j = 0; j < 2; j++) {
        const sg = j ? -1 : 1, ux = mx / ml * sg, uy = my / ml * sg, probe = reach + SHORE_INSET + 0.1;
        if (!index.inWater(x + ux * probe, y + uy * probe)) continue;
        // (no edge on the way out: the way runs along the water's edge itself)
        const ray = index.rayDist(x, y, ux, uy, probe + 0.5);
        const w = (ray >= probe + 0.5 - 1e-6 ? 0 : ray) - SHORE_INSET;
        if (w < reach) res[j] = Math.min(res[j], Math.max(0, w / ml));
      }
    }
    for (const o of partners) {
      const oh = o.width / 2 + (sidewalk ? SIDEWALK_EXTRA : 0);
      const [ox0, oy0, ox1, oy1] = o.bounds;
      const ohs = o.width / 2 + (SIDEWALK_CATS.has(o.cat) ? SIDEWALK_EXTRA : 0.3), ox = Math.max(oh, o.z ? ohs : 0);
      if (x < ox0 - reach - ox || x > ox1 + reach + ox || y < oy0 - reach - ox || y > oy1 + reach + ox) continue;
      let best = Infinity, bi = 0, bx = 0, by = 0, bt = 0;
      const Q = o.pts;
      for (let i = 0; i < Q.length - 1; i++) {
        const cp = closestPointOnSegment(x, y, Q[i][0], Q[i][1], Q[i + 1][0], Q[i + 1][1]);
        if (cp.dist2 < best) { best = cp.dist2; bi = i; bx = cp.x; by = cp.y; bt = cp.t; }
      }
      const dist = Math.sqrt(best);
      // no overlap, or a duplicate lying on top
      if (dist >= reach + ox || dist < 0.3) continue;
      const od = dirAt(Q, bi, 1);
      if (Math.abs(od[0] * d[0] + od[1] * d[1]) < 0.9) continue;
      const oz = o.z ? o.z[bi] + (o.z[bi + 1] - o.z[bi]) * bt : 0;
      // beside the point, not ahead of it (where o ends or joins); between
      // the points square to the segment, as the miter turns towards a bend
      const lat = ((bx - x) * mx + (by - y) * my) / ml, lt = (bx - x) * sn[0] + (by - y) * sn[1];
      if (Math.abs(t > 0 ? lt : lat) < 0.8 * dist) continue;
      // o lies off square to its own line (two ways meeting at a point share
      // its miter and see the same), or past o's end square to this one's;
      // a miter unit reaches mo square to it
      let off = Math.abs(lat), mo = ml, mr = reach;
      if (t > 0 && (r.bridge || zr > 0.5) && (o.bridge || oz > 0.5) && bt > 1e-6 && bt < 1 - 1e-6) { off = dist; mo = Math.max(0.4, Math.abs(mx * od[1] - my * od[0])); mr = half; }
      else if (t > 0) { off = Math.abs(lt); mo = Math.max(0.4, mx * sn[0] + my * sn[1]); mr = half; }
      const j = lat > 0 ? 0 : 1;
      if ((r.z || o.z) && Math.abs(zr - oz) > 0.8) {
        // an open cutting alongside: this ribbon stops on the middle of its
        // retaining wall (or the wall face closing it) instead of hanging
        // out over the sunken way
        if (o.z && !o.tunnel && !o.bridge && oz < -0.25 && zr - oz > 0.8) res[j] = Math.min(res[j], Math.max(0, (off - ohs - 0.225) / mo));
        continue;
      }
      res[j] = Math.min(res[j], Math.max(0.5, off * mr / (mr + oh) / mo));
    }
    const segs = lower.length ? laneSegs(x, y, reach, k) : null;
    if (segs && segs.length) {
      for (let j = 0; j < 2; j++) {
        const sg = j ? -1 : 1;
        for (let h = rs.hw; h < res[j]; h += 0.1) {
          if (lanesBelow(segs, x + mx * h * sg, y + my * h * sg, zr)) { res[j] = h; break; }
        }
      }
    }
    const lo = road ? (t === 0 ? road.pts[k] : road.at(x, y, mx, my, k, t)) : null;
    for (let j = 0; j < 2; j++) res[j] = Math.max(res[j], lo ? lo[j] : sidewalk ? rs.hw : 0);
    return res;
  };
  const pts = P.map((p, k) => at(p[0], p[1], rs.miter[k][0], rs.miter[k][1], k, 0));
  // where a narrower bridge lands on this way at the quay, the end is at
  // least as wide as the bridge (no notch of water between the two)
  if (index) {
    for (const k of [0, n - 1]) {
      const list = nodeIndex.get(nodeKey(P[k])) || [];
      if (list.length !== 4) continue;
      const o = list[0] === r ? list[2] : list[0], oi = list[0] === r ? list[3] : list[1];
      if (o === r || !o.bridge || (oi !== 0 && oi !== o.pts.length - 1)) continue;
      const oh = Math.min(half, o.width / 2 + (sidewalk ? SIDEWALK_EXTRA : 0));
      for (let j = 0; j < 2; j++) pts[k][j] = Math.max(pts[k][j], oh);
    }
  }
  const cut = (lim) => lim[0] < half - 1e-3 || lim[1] < half - 1e-3;
  const steps = (i) => {
    const k = Math.floor((rs.s[i + 1] - rs.s[i]) / DENSE);
    if (k < 1) return [];
    const m0 = rs.miter[i], m1 = rs.miter[i + 1], p0 = P[i], p1 = P[i + 1];
    const ends = [cut(pts[i])];
    for (let q = 1; q <= k; q++) {
      const t = q / (k + 1);
      ends.push(cut(at(p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t, m0[0] + (m1[0] - m0[0]) * t, m0[1] + (m1[1] - m0[1]) * t, i, t)));
    }
    ends.push(cut(pts[i + 1]));
    // the stations where an edge is cut back, and their neighbours
    const out = [];
    for (let q = 1; q <= k; q++) if (ends[q] || ends[q - 1] || ends[q + 1]) out.push(q / (k + 1));
    return out;
  };
  return { at, steps, pts };
}

function boundsOf(P) {
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const [x, y] of P) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); }
  return [a, b, c, d];
}

// The carriageway's limits, cached on rs: the kerbs, edge lines and the
// sidewalk follow them.
function roadClip(r, rs) {
  if (rs.roadClip === undefined) rs.roadClip = ribbonClip(r, rs, 'road');
  return rs.roadClip;
}

// Is side j (0 right of the miter, 1 left) of r's carriageway cut back anywhere?
function sideCut(r, rs, j) {
  const c = roadClip(r, rs);
  return !!c && c.pts.some((p) => p[j] < rs.hw - 0.3);
}

function newBuf() { return { pos: [], nrm: [], idx: [], surf: [], end: [] }; }
function bufGeometry(B) {
  return finishGeometry(B.pos, B.nrm, B.idx, [['aSurf', B.surf, 4], ['aSurfEnd', B.end, 1]]);
}

// The colour blend at the ends of r's carriageway towards the surface of the
// ways it meets (surfaceblend.js).
function surfaceOf(o) {
  const layer = GROUND_LAYER[o.cat] ? o.cat : 'normal';
  const surf = roadSurface(o), def = SURFACES[surf];
  const color = def.colors[layer] ?? def.colors.any ?? Object.values(def.colors)[0];
  return { id: layer + ':' + surf, colour: linearOf(color), rank: GROUND_LAYER[layer] * 4 + def.rank };
}
const sameLevel = (r, o) => o.cat !== 'foot' && !o.bridge === !r.bridge && !o.tunnel === !r.tunnel && (o.layer || 0) === (r.layer || 0);
function roadBlendPlan(r, rs) {
  if (!netMap || r.cat === 'foot') return null;
  const plan = planBlends(nodeIndex, nodeKey, [r], surfaceOf, (_, start) => Math.max(0, (start ? rs.e0 : rs.e1).J), sameLevel);
  return plan.get(r) || null;
}

function ribbonGeometry(r, half, surfWidth = r.width) {
  const rs = analyse(r);
  const B = newBuf();
  ribbonInto(r, rs, half, B, surfWidth, roadClip(r, rs), surfWidth ? nearZones(r, rs, 'road') : null, !SIDEWALK_CATS.has(r.cat));
  const g = bufGeometry(B);
  const pl = roadBlendPlan(r, rs);
  if (pl) {
    const { A, B: E } = blendAttributes(pl, rs.L);
    const n = B.pos.length / 3, a = new Float32Array(n * 4), b = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { a.set(A, i * 4); b.set(E, i * 4); }
    g.setAttribute('aBlendA', new THREE.BufferAttribute(a, 4));
    g.setAttribute('aBlendB', new THREE.BufferAttribute(b, 4));
  }
  return g;
}

function hasKerbs(r) {
  return (r.cat === 'major' || r.cat === 'normal') && r.pts.length >= 2;
}

function kerbIntervals(rs, side) {
  let iv = [[rs.e0.J > 0 ? rs.e0.J : 0, rs.e1.J > 0 ? rs.L - rs.e1.J : rs.L]];
  // none where the carriageway meets the one alongside (the kerb would stand
  // in it) or the sidewalk stops at the quay (it would hang over the water)
  const off = [];
  const j = side > 0 ? 0 : 1;
  const cut = (k) => (rs.roadClip && rs.roadClip.pts[k][j] < rs.hw - 0.05) || (rs.walkClip && rs.walkClip.pts[k][j] < rs.hw + 0.5);
  for (let i = 0; i < rs.s.length - 1; i++) if (cut(i) || cut(i + 1)) off.push([rs.s[i] - 1, rs.s[i + 1] + 1, side]);
  for (const [a, b, sd] of rs.cuts.concat(off)) {
    if (sd !== side && sd !== 0) continue;
    const next = [];
    for (const [x, y] of iv) {
      if (b <= x || a >= y) { next.push([x, y]); continue; }
      if (a > x) next.push([x, a]);
      if (b < y) next.push([b, y]);
    }
    iv = next;
  }
  return iv.filter(([x, y]) => y - x > 2.5);
}

function kerbInto(r, rs, B) {
  const hw = rs.hw;
  const tmp = [0, 0, 0, 0];
  for (const side of [1, -1]) {
    for (const [a, b] of kerbIntervals(rs, side)) {
      const st = stations(rs, a, b);
      const ramp = Math.min(1, (b - a) / 3);
      if (a + ramp < st[1] - 0.05) st.splice(1, 0, a + ramp);
      if (b - ramp > st[st.length - 2] + 0.05) st.splice(st.length - 1, 0, b - ramp);
      const prof = [hw, hw, hw + 0.13, hw + 0.45];
      const rows = st.map((sv) => {
        const k = Math.min(1, (sv - a) / ramp, (b - sv) / ramp);
        const top = 0.005 + KERB_H * Math.max(0.1, k);
        const pts = prof.map((o) => at(r, rs, sv, o * side, tmp).slice(0, 2));
        const seg = rs.segN[Math.min(tmp[2], rs.segN.length - 1)];
        const z = tmp[3];
        return { sv, pts, ys: [z - 0.01, z + top, z + top, z], nx: seg[0] * side, ny: seg[1] * side, top };
      });
      for (let f = 0; f < 3; f++) {
        const base = B.pos.length / 3;
        for (const row of rows) {
          let nx, ny, nz;
          if (f === 0) { nx = -row.nx; ny = 0; nz = -row.ny; }
          else if (f === 1) { nx = 0; ny = 1; nz = 0; }
          else { const l = Math.hypot(row.top, 0.32); nx = row.nx * row.top / l; ny = 0.32 / l; nz = row.ny * row.top / l; }
          for (const j of [f, f + 1]) {
            B.pos.push(row.pts[j][0], row.ys[j], row.pts[j][1]);
            B.nrm.push(nx, ny, nz);
            B.surf.push(0, row.sv, -1, -1e4);
            B.end.push(1e9);
          }
        }
        for (let i = 0; i < rows.length - 1; i++) {
          const q = base + i * 2;
          if (side > 0) B.idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2);
          else B.idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3);
        }
      }
    }
  }
}

function sidewalkGeometry(r) {
  const rs = analyse(r);
  const B = newBuf();
  roadClip(r, rs);
  rs.walkClip = ribbonClip(r, rs, 'walk');
  ribbonInto(r, rs, rs.hw + SIDEWALK_EXTRA, B, r.width, rs.walkClip, nearZones(r, rs, 'walk'), true);
  if (hasKerbs(r)) kerbInto(r, rs, B);
  return bufGeometry(B);
}

// ---------------------------------------------------------------- markings

function markBuf() { return { pos: [], nrm: [], uv: [], idx: [] }; }

// Paint that lies over other paint in one marking mesh sits a few mm higher
// (bus lane red, then white lines, then manholes, grates and symbols), so the
// overlaps never fight over the same depth.
const PAINT_RED = 0, PAINT_WHITE = 0.004, PAINT_DECAL = 0.008;
// decals of different kinds can lie on one another (a manhole on "BUS", a grate
// on the edge line of the street alongside): each kind a few mm over the last
const decalLift = (uv) => PAINT_DECAL + (uv === UV_GRATE ? 0.004 : uv === UV_BIKE ? 0.008 : uv === UV_BUS ? 0.012 : 0);

function stripAlong(r, rs, M, s0, s1, off, half, uvc = UV_WHITE) {
  if (s1 - s0 < 0.05) return;
  const tmp = [0, 0, 0, 0];
  const base = M.pos.length / 3;
  const st = stations(rs, s0, s1);
  const lift = uvc === UV_RED ? PAINT_RED : PAINT_WHITE;
  for (const sv of st) {
    for (const o of [off + half, off - half]) {
      at(r, rs, sv, o, tmp);
      M.pos.push(tmp[0], tmp[3] + lift, tmp[1]);
      M.nrm.push(0, 1, 0);
      M.uv.push(uvc[0], uvc[1]);
    }
  }
  for (let i = 0; i < st.length - 1; i++) {
    const a = base + i * 2;
    M.idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
}

function dashes(r, rs, M, s0, s1, off, half, dash, gap) {
  for (let s = s0; s < s1; s += dash + gap) stripAlong(r, rs, M, s, Math.min(s + dash, s1), off, half);
}

// Where a ramp merges into / splits from a carriageway, both ways' edge and
// lane lines would run across the other's lanes. Parts of line `off` that lie
// on another major road's asphalt (at about the same height) are left out.
const CLIP_STEP = 1;
function onOtherCarriageway(others, x, y, z) {
  for (const o of others) {
    const hw = o.width / 2 - 0.15;
    const [minx, miny, maxx, maxy] = o.bounds;
    if (x < minx - hw || x > maxx + hw || y < miny - hw || y > maxy + hw) continue;
    const P = o.pts, Z = o.z;
    for (let i = 0; i < P.length - 1; i++) {
      const ax = P[i][0], ay = P[i][1], dx = P[i + 1][0] - ax, dy = P[i + 1][1] - ay;
      const l2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
      if ((ax + dx * t - x) ** 2 + (ay + dy * t - y) ** 2 >= hw * hw) continue;
      const oz = Z ? Z[i] + (Z[i + 1] - Z[i]) * t : 0;
      if (Math.abs(oz - z) < 1.5) return true;
    }
  }
  return false;
}

function clearSpans(r, rs, s0, s1, off) {
  if (!netMap || r.cat !== 'major' || !r.bounds) return [[s0, s1]];
  if (!r._markOthers) {
    const [minx, miny, maxx, maxy] = r.bounds;
    r._markOthers = netMap.roadGrid.query(minx - 10, miny - 10, maxx + 10, maxy + 10)
      .filter((o) => o !== r && o.cat === 'major' && o.bounds && o.bounds[0] < maxx + 10 && o.bounds[2] > minx - 10 && o.bounds[1] < maxy + 10 && o.bounds[3] > miny - 10);
  }
  const others = r._markOthers;
  if (!others.length) return [[s0, s1]];
  const out = [];
  const tmp = [0, 0, 0, 0];
  let start = null;
  for (let s = s0; ; s = Math.min(s1, s + CLIP_STEP)) {
    at(r, rs, s, off, tmp);
    const free = !onOtherCarriageway(others, tmp[0], tmp[1], tmp[3]);
    if (free && start === null) start = s;
    if (!free && start !== null) { out.push([start, s]); start = null; }
    if (s >= s1) break;
  }
  if (start !== null) out.push([start, s1]);
  return out;
}

function stripClipped(r, rs, M, s0, s1, off, half) {
  for (const [a, b] of clearSpans(r, rs, s0, s1, off)) stripAlong(r, rs, M, a, b, off, half);
}

function dashesClipped(r, rs, M, s0, s1, off, half, dash, gap) {
  for (const [a, b] of clearSpans(r, rs, s0, s1, off)) {
    // keep the dash rhythm of the whole line
    const first = s0 + Math.ceil((a - s0) / (dash + gap) - 1e-6) * (dash + gap);
    for (let s = first - (dash + gap); s < b; s += dash + gap) {
      const x0 = Math.max(a, s), x1 = Math.min(b, s + dash);
      if (x1 > x0) stripAlong(r, rs, M, x0, x1, off, half);
    }
  }
}

// Lane lines of `lay.lines`, with the ones that have no counterpart across a
// joint (more lanes here than there) bent over to the other way's line instead
// of stopping dead (#130, lanetaper.js).
function laneLineDashes(r, rs, M, a, b, lay, clipped, dash, gap, half) {
  let t0 = [], t1 = [];
  if (netMap && netMap.roadGrid && r.pts.length >= 2 && b - a > 20) {
    const near = (p) => netMap.roadGrid.query(p[0] - 2, p[1] - 2, p[0] + 2, p[1] + 2);
    t0 = taperLines(r, true, near(r.pts[0]));
    t1 = taperLines(r, false, near(r.pts[r.pts.length - 1]));
  }
  const len = taperLength((b - a) / 2);
  const run = clipped ? dashesClipped : dashes;
  for (const o of lay.lines) {
    const h = t0.find((q) => q.off === o), e = t1.find((q) => q.off === o);
    const sa = h ? a + len : a, sb = e ? b - len : b;
    run(r, rs, M, sa, sb, o, half, dash, gap);
    for (const [t, from, to, atStart] of [[h, a, a + len, true], [e, b - len, b, false]]) {
      if (!t) continue;
      for (let s = from; s < to; s += dash + gap) {
        const s1 = Math.min(s + dash, to), mid = (s + s1) / 2;
        stripAlong(r, rs, M, s, s1, taperOffset(t, atStart ? mid - a : b - mid, len), half);
      }
    }
  }
}

function decal(r, rs, M, sAlong, off, len, wid, uv) {
  const c = at(r, rs, sAlong, off, [0, 0, 0, 0]);
  const nrmv = rs.segN[Math.min(c[2], rs.segN.length - 1)];
  const fx = nrmv[1], fy = -nrmv[0];
  const base = M.pos.length / 3;
  const corners = [[-1, -1, uv[0], uv[1]], [1, -1, uv[2], uv[1]], [-1, 1, uv[0], uv[3]], [1, 1, uv[2], uv[3]]];
  const lift = decalLift(uv);
  const tmp = [0, 0, 0, 0];
  for (const [u, v, tu, tv] of corners) {
    // (on a ramp the corners follow the road's slope)
    const z = r.z ? at(r, rs, sAlong + u * len / 2, off, tmp)[3] : c[3];
    M.pos.push(c[0] + fx * u * len / 2 + nrmv[0] * v * wid / 2, z + lift, c[1] + fy * u * len / 2 + nrmv[1] * v * wid / 2);
    M.nrm.push(0, 1, 0);
    M.uv.push(tu, tv);
  }
  M.idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
}

// "BUS" painted across a lane, readable for traffic travelling `dir`.
function busDecal(r, rs, M, sAlong, off, dir) {
  const c = at(r, rs, sAlong, off, [0, 0, 0, 0]);
  const nrmv = rs.segN[Math.min(c[2], rs.segN.length - 1)];
  const fx = nrmv[1] * dir, fy = -nrmv[0] * dir;
  const rx = -fy, ry = fx;
  const len = 1.6, wid = 2.4;
  const base = M.pos.length / 3;
  const [u0, v0, u1, v1] = UV_BUS;
  const tmp = [0, 0, 0, 0];
  for (const [a, b, tu, tv] of [[-1, -1, u0, v0], [1, -1, u0, v1], [-1, 1, u1, v0], [1, 1, u1, v1]]) {
    const z = r.z ? at(r, rs, sAlong + a * dir * len / 2, off, tmp)[3] : c[3];
    M.pos.push(c[0] + fx * a * len / 2 + rx * b * wid / 2, z + decalLift(UV_BUS), c[1] + fy * a * len / 2 + ry * b * wid / 2);
    M.nrm.push(0, 1, 0);
    M.uv.push(tu, tv);
  }
  M.idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
}

function busLaneMarkings(r, rs, M, a, b) {
  const hw = rs.hw;
  if (r.busOnly) {
    stripAlong(r, rs, M, a, b, 0, hw - 0.1, UV_RED);
    for (let s = a + 6; s < b - 3; s += 35) {
      if (r.oneway) busDecal(r, rs, M, s, 0, 1);
      else { busDecal(r, rs, M, s, hw / 2, 1); busDecal(r, rs, M, s + 4, -hw / 2, -1); }
    }
    return;
  }
  const L = r.busLane;
  if (!L || r.width < 6) return;
  const laneW = Math.min(3.2, r.oneway ? hw : hw * 0.9);
  for (const [on, dir] of [[L.fwd, 1], [L.bwd, -1]]) {
    if (!on) continue;
    const mid = (hw - laneW / 2) * (r.oneway ? 1 : dir);
    const inner = (hw - laneW) * (r.oneway ? 1 : dir);
    stripAlong(r, rs, M, a, b, mid, laneW / 2 - 0.1, UV_RED);
    stripAlong(r, rs, M, a, b, inner, 0.08);
    for (let s = a + 8; s < b - 3; s += 40) busDecal(r, rs, M, s, mid, r.oneway ? 1 : dir);
  }
}

function triangleMark(r, rs, M, sBase, sApex, off, halfBase) {
  const tmp = [0, 0, 0, 0];
  const base = M.pos.length / 3;
  for (const [sv, o] of [[sBase, off - halfBase], [sBase, off + halfBase], [sApex, off]]) {
    at(r, rs, sv, o, tmp);
    M.pos.push(tmp[0], tmp[3] + PAINT_WHITE, tmp[1]);
    M.nrm.push(0, 1, 0);
    M.uv.push(UV_WHITE[0], UV_WHITE[1]);
  }
  const [x0, , z0, x1, , z1, x2, , z2] = M.pos.slice(base * 3, base * 3 + 9);
  const up = (x1 - x0) * (z2 - z0) - (z1 - z0) * (x2 - x0);
  if (up < 0) M.idx.push(base, base + 1, base + 2); else M.idx.push(base, base + 2, base + 1);
}

let yieldIndex = null;
function yieldsOf(r) {
  if (!netMap) return [];
  if (!yieldIndex || yieldIndex.map !== netMap) {
    yieldIndex = { map: netMap, byRoad: new Map() };
    for (const y of yieldArms(netMap)) {
      let a = yieldIndex.byRoad.get(y.road);
      if (!a) yieldIndex.byRoad.set(y.road, a = []);
      a.push(y);
    }
  }
  return yieldIndex.byRoad.get(r) || [];
}

function rnd(r, k) {
  const v = Math.sin(roadHash(r) * 1000 + k * 17.13) * 43758.5453;
  return v - Math.floor(v);
}

// A painted arrow in a lane for traffic travelling `dir`, its tip at sTip:
// one shaft and a head per turn in `turns` (turn:lanes values).
const ARROW_LEN = 5, ARROW_HEAD = 1.4;
function arrowMark(r, rs, M, sTip, off, dir, turns) {
  const tail = sTip - dir * ARROW_LEN;
  const s0 = Math.min(tail, sTip - dir * ARROW_HEAD), s1 = Math.max(tail, sTip - dir * ARROW_HEAD);
  stripAlong(r, rs, M, s0, s1, off, 0.08);
  for (const t of turns) {
    const side = /left/.test(t) ? -1 : /right/.test(t) ? 1 : 0;
    if (/through/.test(t) || /none/.test(t) || !side) triangleMark(r, rs, M, sTip - dir * ARROW_HEAD, sTip, off, 0.35);
    if (!side) continue;
    // a turn: a head off to the side half way along the shaft (dir flips
    // left and right for a lane running against the pts)
    const sm = sTip - dir * ARROW_LEN * 0.45, o = side * dir;
    polyMark(r, rs, M, [[sm - dir * 0.35, off], [sm + dir * 0.35, off], [sm + dir * 0.1, off + o * 0.9], [sm + dir * 0.45, off + o * 0.95], [sm - dir * 0.2, off + o * 1.45]]);
  }
}

// a convex polygon of paint given as [along, offset] points (fan)
function polyMark(r, rs, M, pts) {
  const tmp = [0, 0, 0, 0];
  const base = M.pos.length / 3;
  for (const [sv, o] of pts) {
    at(r, rs, sv, o, tmp);
    M.pos.push(tmp[0], tmp[3] + PAINT_WHITE, tmp[1]);
    M.nrm.push(0, 1, 0);
    M.uv.push(UV_WHITE[0], UV_WHITE[1]);
  }
  for (let i = 1; i < pts.length - 1; i++) M.idx.push(base, base + i, base + i + 1, base, base + i + 1, base + i);
}

// Turn arrows from turn:lanes on the approach to the way's end (forward
// lanes) and start (backward lanes): two per lane, 10 and 40 m before it.
function turnArrows(r, rs, M, a, b) {
  const lay = laneLayout(r);
  for (const [list, dir] of [[r.turnFwd, 1], [r.turnBwd, -1]]) {
    if (!list || !list.length) continue;
    const mine = lay.lanes.filter((q) => q.dir === dir).sort((p, q) => (p.off - q.off) * dir);
    if (mine.length !== list.length) continue;
    // turn:lanes lists the lanes from left to right in the direction of travel
    mine.forEach((q, i) => {
      const turns = String(list[i]).split(';');
      for (const back of [10, 40]) {
        const sTip = dir > 0 ? b - back : a + back;
        if (sTip - ARROW_LEN < a || sTip + ARROW_LEN > b) continue;
        arrowMark(r, rs, M, sTip, q.off, dir, turns);
      }
    });
  }
}

function markingGeometry(r) {
  const rs = analyse(r);
  const surf = roadSurface(r);
  const M = markBuf();
  const hw = rs.hw, L = rs.L;
  const a = Math.max(0, rs.S0) + 0.5, b = Math.min(L, rs.S1) - 0.5;
  const asphalt = surf === 'asphalt';
  const lay = laneLayout(r);
  const lanes = lay.n;

  if (asphalt && b > a) {
    if (r.cat === 'major') {
      // (no edge line on a side cut back at the quay or against the other carriageway)
      if (!sideCut(r, rs, 0)) stripClipped(r, rs, M, a, b, hw - 0.35, 0.075);
      if (!sideCut(r, rs, 1)) stripClipped(r, rs, M, a, b, -hw + 0.35, 0.075);
      if (!r.oneway) {
        if (r.width >= 12 && r.lanesFwd == null) { stripAlong(r, rs, M, a, b, 0.12, 0.05); stripAlong(r, rs, M, a, b, -0.12, 0.05); }
        else stripAlong(r, rs, M, a, b, lay.divider || 0, 0.06);
      }
      laneLineDashes(r, rs, M, a, b, lay, true, 3, 9, 0.06);
    } else if (r.cat === 'normal' && r.type !== 'residential' && !r.oneway && r.width >= 5.5) {
      dashes(r, rs, M, a, b, lay.divider || 0, 0.05, 3, 6);
      laneLineDashes(r, rs, M, a, b, lay, false, 3, 6, 0.05);
    }
    if (detail && (r.turnFwd || r.turnBwd) && (r.cat === 'major' || r.cat === 'normal')) turnArrows(r, rs, M, a, b);
  }
  if (b > a && (r.busOnly || r.busLane)) busLaneMarkings(r, rs, M, a, b);
  if (r.cat === 'cycle' && b > a) {
    if (r.width >= 2.4) dashes(r, rs, M, a, b, 0, 0.05, 1, 2);
    if (detail) for (let s = a + 3; s < b - 2; s += 70) decal(r, rs, M, s, r.width >= 2.4 ? r.width / 4 : 0, 1.5, 0.75, UV_BIKE);
  }

  // the bike route over the Grote Markt: dashed edge lines and a bike symbol on the cobbles
  if (b > a + 6 && isMarktFietsRoad(r, rs.L)) {
    for (const o of [-MARKT.laneHalf, MARKT.laneHalf]) dashes(r, rs, M, a + 1, b - 1, o, 0.06, 1.4, 1.1);
    for (let s = a + 5; s < b - 3; s += 13) decal(r, rs, M, s, 0, 1.7, 0.85, UV_BIKE);
  }

  for (const c of rs.crossings) {
    for (let o = -hw + 0.6; o <= hw - 0.6; o += 1) stripAlong(r, rs, M, c.s - 1.5, c.s + 1.5, o + 0.25, 0.25);
    if (c.stop && (!r.oneway || c.stop < 0)) {
      const ss = c.s + c.stop * 2.6;
      const half = r.oneway ? [-hw, hw] : c.stop > 0 ? [-hw, 0] : [0, hw];
      stripAlong(r, rs, M, ss - 0.15, ss + 0.15, (half[0] + half[1]) / 2, (half[1] - half[0]) / 2 - 0.2);
    }
  }

  // haaientanden on the approach lane of every arm that gives way
  // (junctions.js: lower priority class than the crossing road)
  for (const y of yieldsOf(r)) {
    const dir = -y.d;
    const sNode = rs.s[y.idx];
    const sBase = dir > 0 ? sNode - y.J - 0.3 : sNode + y.J + 0.3;
    if (sBase < 1 || sBase > L - 1) continue;
    const o0 = r.oneway ? -hw + 0.3 : dir > 0 ? 0.2 : -hw + 0.3;
    const o1 = r.oneway ? hw - 0.3 : dir > 0 ? hw - 0.3 : -0.2;
    for (let o = o0 + 0.25; o <= o1 - 0.25; o += 0.75) triangleMark(r, rs, M, sBase, sBase - dir * 0.6, o, 0.25);
  }

  if (detail && (r.cat === 'major' || r.cat === 'normal') && b - a > 10) {
    const lw = r.width / lanes;
    let k = 0;
    for (let s = a + 6 + rnd(r, 1) * 20; s < b - 3; s += 35 + rnd(r, k + 2) * 30, k++) {
      const off = lanes > 1 ? -hw + lw * ((k % lanes) + 0.5) : 0;
      decal(r, rs, M, s, off, 0.7, 0.7, UV_MANHOLE);
    }
    if (hasKerbs(r)) {
      for (const side of [1, -1]) {
        if (sideCut(r, rs, side > 0 ? 0 : 1)) continue;
        for (let s = a + 4 + rnd(r, side + 9) * 10; s < b - 2; s += 16 + rnd(r, s) * 8) decal(r, rs, M, s, side * (hw - 0.2), 0.5, 0.3, UV_GRATE);
      }
    }
  }

  if (!M.idx.length) return null;
  return finishGeometry(M.pos, M.nrm, M.idx, [['uv', M.uv, 2]]);
}

// The surface geometries of a road as buildRoadGroup makes them, uncached,
// for marking detail `det` (the geometry worker builds them from its own copy
// of the map, geokernels.js).
export function roadSurfaceGeometries(r, det = detail) {
  const prev = detail;
  detail = det;
  const net = ownNet(r);
  try {
    const surf = roadSurface(r);
    return {
      sidewalk: SIDEWALK_CATS.has(r.cat) ? sidewalkGeometry(r) : null,
      road: ribbonGeometry(r, r.width / 2, surf === 'tiles' || surf === 'gravel' ? 0 : r.width),
      mark: markingGeometry(r),
    };
  } finally {
    detail = prev;
    restoreNet(net);
  }
}
export function roadDetail() {
  return detail;
}

// a road's identity in both copies of the map: class and points
export const roadKey = (r) => r._gkey || (r._gkey = r.cat + ':' + r.type + ':' + r.width + ':' + r.pts.join(';'));

// The surfaces are built in the geometry worker (geokernels.js roadGeo) once
// its own copy of the map is loaded; until then, without a worker, or for a
// road it does not know, here as before. False while a road's surfaces are
// on their way (the request goes out on the first call).
const RW = { state: 0 };
function roadWorkerReady() {
  if (RW.state === 0 && netMap && geoWorkerActive() && typeof location !== 'undefined') {
    RW.state = 1;
    runGeo('roadInit', { url: new URL('stad.json', location.href).href, keys: netMap.roads.map(roadKey) }, (res) => {
      RW.state = res && !res.missing ? 2 : -1;
    });
  }
  return RW.state === 2 && geoWorkerActive();
}
// the worker's map is loaded (quaywalls.js builds the shores there too)
export function workerMapReady() {
  return RW.state === 2 && geoWorkerActive();
}
// The jobs of one frame's "nearest first" are not all sent at once (#247): 86 open jobs in the worker's queue meant a
// road near the player waited behind every road requested before it. At most ROAD_GEO_OPEN are out; each frame asks
// again in the order of the day, so the queue holds what is nearest and ahead now.
export const ROAD_GEO_OPEN = 8;
let roadGeoOpen = 0;
export const roadGeoRoom = () => roadGeoOpen < ROAD_GEO_OPEN;
export function roadGeometryReady(r) {
  if (r._geoRoad && r._geoMarkQ === qualityVersion) return true;
  if (r._geoMain || !roadWorkerReady()) return true;
  if (r._geoPending === qualityVersion) return false;
  if (roadGeoOpen >= ROAD_GEO_OPEN) return false;
  const q = r._geoPending = qualityVersion;
  roadGeoOpen++;
  const struct = (r.z ? r._geoStruct : r._geoOverDeck) === undefined;
  runGeo('roadGeo', { key: roadKey(r), detail, struct }, (res) => {
    roadGeoOpen--;
    if (r._geoPending === q) r._geoPending = null;
    if (!res) { r._geoMain = true; return; }
    // the civil works are kept for good; a mismatch builds them here
    if (res.struct !== undefined && netMap && netMap.elev && netMap.elev.has) {
      const k = r.z ? '_geoStruct' : '_geoOverDeck';
      if (r[k] === undefined) {
        const g = structureGroup(netMap, res.struct);
        if (g !== undefined) r[k] = g;
      }
    }
    const parts = [geometryFromPlain(res.sidewalk), geometryFromPlain(res.road), geometryFromPlain(res.mark)];
    if (q !== qualityVersion) { for (const g of parts) if (g) g.dispose(); return; }
    const [sidewalk, road, mark] = parts;
    if (!r._geoSidewalk && sidewalk) r._geoSidewalk = sidewalk; else if (sidewalk) sidewalk.dispose();
    if (!r._geoRoad) r._geoRoad = road; else road.dispose();
    if (r._geoMark) r._geoMark.dispose();
    r._geoMark = mark;
    r._geoMarkQ = q;
  });
  return false;
}

// ---------------------------------------------------------------- road group

export function buildRoadGroup(r) {
  const net = ownNet(r);
  try {
    return roadGroup(r);
  } finally {
    restoreNet(net);
  }
}
function roadGroup(r) {
  const group = new THREE.Group();
  const surf = roadSurface(r);

  if (SIDEWALK_CATS.has(r.cat)) {
    if (!r._geoSidewalk) r._geoSidewalk = sidewalkGeometry(r);
    const sidewalk = new THREE.Mesh(r._geoSidewalk, surfaceMaterial('sidewalk', 'tiles'));
    sidewalk.position.y = 0.02;
    group.add(sidewalk);
  }

  if (!r._geoRoad) r._geoRoad = ribbonGeometry(r, r.width / 2, surf === 'tiles' || surf === 'gravel' ? 0 : r.width);
  const layer = GROUND_LAYER[r.cat] ? r.cat : 'normal';
  const road = new THREE.Mesh(r._geoRoad, surfaceMaterial(layer, surf));
  road.position.y = 0.03;
  group.add(road);

  if (r._geoMarkQ !== qualityVersion) {
    if (r._geoMark) r._geoMark.dispose();
    r._geoMark = markingGeometry(r);
    r._geoMarkQ = qualityVersion;
  }
  if (r._geoMark) {
    const mark = new THREE.Mesh(r._geoMark, getMarkingMaterial());
    mark.position.y = 0.035;
    group.add(mark);
  }
  for (const m of group.children) m.receiveShadow = true;
  // viaduct deck, embankment, cutting walls, tunnel roof / deck over a cutting
  if (netMap && netMap.elev && netMap.elev.has) {
    const struct = r.z ? buildRoadStructure(r, netMap) : buildOverpassDeck(r, netMap);
    // merged with the road's cell; a knocked-out crash barrier bumps its
    // geometry's batchVer, which redoes the cell
    if (struct) { struct.userData.batchChildren = true; group.add(struct); }
  }
  return group;
}

// For the audit: the blend plan of a road ends on this map (null: none needed)
// and the id of the surface it is drawn with.
export function roadBlendInfo(r) {
  const net = ownNet(r);
  try {
    return { surface: surfaceOf(r), plan: roadBlendPlan(r, analyse(r)) };
  } finally {
    restoreNet(net);
  }
}
