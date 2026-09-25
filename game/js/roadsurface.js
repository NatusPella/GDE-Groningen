import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { applyWetGround } from './terrain3d.js';
import { onSettingsChange, QUALITY_PRESETS } from './settings.js';
import { pointInPolygon } from './util.js';

// Street surfaces: procedural asphalt / klinkers / stoeptegels / gravel in the
// shared wet-ground shader, mitred ribbons carrying road-space coordinates,
// kerbs merged into the sidewalk mesh, and one merged marking mesh per road.

export const GROUND_LAYER = { green: 1, sidewalk: 2, foot: 3, cycle: 4, minor: 5, normal: 6, major: 7, marking: 8 };
export const SIDEWALK_EXTRA = 1.8;
export const PAVED_MATS = [];

const CITY_CENTRE = [100, 77];
const KLINKER_RADIUS = 1500;
const SIDEWALK_CATS = new Set(['major', 'normal', 'minor']);
const CARRIAGE = new Set(['major', 'normal', 'minor']);
const RANK = { major: 3, normal: 2, minor: 1, cycle: 0, foot: -1 };
const JUNCTION_DIP = -0.004;
const KERB_H = 0.13;

// ---------------------------------------------------------------- shaders

const VERTEX_COMMON = `
#ifndef SURF_MARKING
attribute vec4 aSurf;
attribute float aSurfEnd;
#endif
varying vec4 vSurf;
varying float vSurfEnd;
`;

const VERTEX_MAIN = `
#ifndef SURF_MARKING
vSurf = aSurf; vSurfEnd = aSurfEnd;
#else
vSurf = vec4(0.0); vSurfEnd = 0.0;
#endif
`;

// vSurf: x = across (m, signed from centreline), y = along (m), z = carriageway
// width (negative on kerb faces), w / vSurfEnd = along range clear of junctions.
const FRAGMENT_COMMON = `
varying vec4 vSurf;
varying float vSurfEnd;
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

const SURF_SHADER = { key: 'roadsurf1', vertexCommon: VERTEX_COMMON, vertexMain: VERTEX_MAIN, fragmentCommon: FRAGMENT_COMMON, color: COLOR, normal: NORMAL };

// ---------------------------------------------------------------- materials

const SURFACES = {
  asphalt: { define: 'SURF_ASPHALT', roughness: 0.88, colors: { major: 0x57595c, normal: 0x4b4d50, minor: 0x505255 } },
  cycle: { define: 'SURF_CYCLE', roughness: 0.86, colors: { cycle: 0x823b2d } },
  klinker_red: { define: 'SURF_KLINKER', extra: 'KLINKER_RED', roughness: 0.9, colors: { any: 0x6c4236 } },
  klinker_grey: { define: 'SURF_KLINKER', roughness: 0.9, colors: { any: 0x7a766e } },
  tiles: { define: 'SURF_TILES', roughness: 0.93, colors: { sidewalk: 0x7b776d, any: 0x837e74 } },
  gravel: { define: 'SURF_GRAVEL', roughness: 0.97, colors: { any: 0x9a8f78 } },
};

let detail = true;
let qualityVersion = 0;
const materials = new Map();

function makeMaterial(color, layer, roughness, defines, extra = {}) {
  const m = new THREE.MeshStandardMaterial({
    color, roughness, polygonOffset: true, polygonOffsetFactor: -layer, polygonOffsetUnits: -layer * 4, ...extra,
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
  m = makeMaterial(color, GROUND_LAYER[layerName], def.roughness, defines);
  materials.set(key, m);
  return m;
}

let markingMaterial = null;
function getMarkingMaterial() {
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
const UV_WHITE = [0.25, 0.75];
const UV_MANHOLE = [0.5, 0.5, 1, 1];
const UV_GRATE = [0, 0, 0.5, 0.5];
const UV_BIKE = [0.5, 0, 1, 0.5];

function buildAtlas() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, 128, 128);

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
const nodeIndex = new Map();
let lights = [];
const nodeKey = (p) => Math.round(p[0] * 10) + ',' + Math.round(p[1] * 10);

export function setRoadNetwork(map) {
  if (netMap === map) return;
  netMap = map;
  nodeIndex.clear();
  for (const r of map.roads) {
    for (let i = 0; i < r.pts.length; i++) {
      const k = nodeKey(r.pts[i]);
      let a = nodeIndex.get(k);
      if (!a) nodeIndex.set(k, a = []);
      a.push(r, i);
    }
  }
  lights = (map.meta && map.meta.trafficLights) || [];
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
  if (!others.length) return { J: 0, giveWay: false };
  if (others.length === 2) {
    const o = others[0], oi = others[1];
    if (o === r) return { J: 0, giveWay: false };
    const oEnd = oi === 0 || oi === o.pts.length - 1;
    if (oEnd && o.cat === r.cat && Math.abs(o.width - r.width) < 1.5) {
      const od = dirAt(o.pts, oi, oi === 0 ? 1 : -1);
      if (od[0] * away[0] + od[1] * away[1] < -0.8) return { J: 0, giveWay: false };
    }
  }
  let J = 0, maxRank = -1;
  for (let k = 0; k < others.length; k += 2) {
    const o = others[k], oi = others[k + 1];
    const dirs = [];
    if (oi > 0) dirs.push(dirAt(o.pts, oi, -1));
    if (oi < o.pts.length - 1) dirs.push(dirAt(o.pts, oi, 1));
    for (const od of dirs) {
      const cos = od[0] * away[0] + od[1] * away[1];
      if (Math.abs(cos) > 0.85) continue;
      const si = Math.sqrt(1 - cos * cos);
      J = Math.max(J, (o.width / 2 + hw * Math.abs(cos)) / si + 1);
    }
    maxRank = Math.max(maxRank, RANK[o.cat] ?? -1);
  }
  return { J: Math.max(J, 1), giveWay: CARRIAGE.has(r.cat) && (RANK[r.cat] ?? -1) < maxRank };
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
    if (i === 0) { miter.push(segN[0].slice()); continue; }
    if (i === n - 1) { miter.push(segN[n - 2].slice()); continue; }
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
    cuts: [], crossings: [],
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

function ribbonInto(r, rs, half, B, surfWidth) {
  const n = r.pts.length;
  const base = B.pos.length / 3;
  for (let i = 0; i < n; i++) {
    const p = r.pts[i], m = rs.miter[i];
    const y = (i === 0 && rs.e0.J > 0) || (i === n - 1 && rs.e1.J > 0) ? JUNCTION_DIP : 0;
    for (const sg of [1, -1]) {
      B.pos.push(p[0] + m[0] * half * sg, y, p[1] + m[1] * half * sg);
      B.nrm.push(0, 1, 0);
      B.surf.push(half * sg, rs.s[i], surfWidth, rs.S0);
      B.end.push(rs.S1);
    }
  }
  for (let i = 0; i < n - 1; i++) {
    const a = base + i * 2;
    B.idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
}

function newBuf() { return { pos: [], nrm: [], idx: [], surf: [], end: [] }; }
function bufGeometry(B) {
  return finishGeometry(B.pos, B.nrm, B.idx, [['aSurf', B.surf, 4], ['aSurfEnd', B.end, 1]]);
}

function ribbonGeometry(r, half, surfWidth = r.width) {
  const rs = analyse(r);
  const B = newBuf();
  ribbonInto(r, rs, half, B, surfWidth);
  return bufGeometry(B);
}

function hasKerbs(r) {
  return (r.cat === 'major' || r.cat === 'normal') && r.pts.length >= 2;
}

function kerbIntervals(rs, side) {
  let iv = [[rs.e0.J > 0 ? rs.e0.J : 0, rs.e1.J > 0 ? rs.L - rs.e1.J : rs.L]];
  for (const [a, b, sd] of rs.cuts) {
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
  const tmp = [0, 0, 0];
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
        return { sv, pts, ys: [-0.01, top, top, 0], nx: seg[0] * side, ny: seg[1] * side, top };
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
  ribbonInto(r, rs, rs.hw + SIDEWALK_EXTRA, B, r.width);
  if (hasKerbs(r)) kerbInto(r, rs, B);
  return bufGeometry(B);
}

// ---------------------------------------------------------------- markings

function markBuf() { return { pos: [], nrm: [], uv: [], idx: [] }; }

function stripAlong(r, rs, M, s0, s1, off, half) {
  if (s1 - s0 < 0.05) return;
  const tmp = [0, 0, 0];
  const base = M.pos.length / 3;
  const st = stations(rs, s0, s1);
  for (const sv of st) {
    for (const o of [off + half, off - half]) {
      at(r, rs, sv, o, tmp);
      M.pos.push(tmp[0], 0, tmp[1]);
      M.nrm.push(0, 1, 0);
      M.uv.push(UV_WHITE[0], UV_WHITE[1]);
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

function decal(r, rs, M, sAlong, off, len, wid, uv) {
  const c = at(r, rs, sAlong, off, [0, 0, 0]);
  const nrmv = rs.segN[Math.min(c[2], rs.segN.length - 1)];
  const fx = nrmv[1], fy = -nrmv[0];
  const base = M.pos.length / 3;
  const corners = [[-1, -1, uv[0], uv[1]], [1, -1, uv[2], uv[1]], [-1, 1, uv[0], uv[3]], [1, 1, uv[2], uv[3]]];
  for (const [u, v, tu, tv] of corners) {
    M.pos.push(c[0] + fx * u * len / 2 + nrmv[0] * v * wid / 2, 0, c[1] + fy * u * len / 2 + nrmv[1] * v * wid / 2);
    M.nrm.push(0, 1, 0);
    M.uv.push(tu, tv);
  }
  M.idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
}

function triangleMark(r, rs, M, sBase, sApex, off, halfBase) {
  const tmp = [0, 0, 0];
  const base = M.pos.length / 3;
  for (const [sv, o] of [[sBase, off - halfBase], [sBase, off + halfBase], [sApex, off]]) {
    at(r, rs, sv, o, tmp);
    M.pos.push(tmp[0], 0, tmp[1]);
    M.nrm.push(0, 1, 0);
    M.uv.push(UV_WHITE[0], UV_WHITE[1]);
  }
  const [x0, , z0, x1, , z1, x2, , z2] = M.pos.slice(base * 3, base * 3 + 9);
  const up = (x1 - x0) * (z2 - z0) - (z1 - z0) * (x2 - x0);
  if (up < 0) M.idx.push(base, base + 1, base + 2); else M.idx.push(base, base + 2, base + 1);
}

function rnd(r, k) {
  const v = Math.sin(roadHash(r) * 1000 + k * 17.13) * 43758.5453;
  return v - Math.floor(v);
}

function markingGeometry(r) {
  const rs = analyse(r);
  const surf = roadSurface(r);
  const M = markBuf();
  const hw = rs.hw, L = rs.L;
  const a = Math.max(0, rs.S0) + 0.5, b = Math.min(L, rs.S1) - 0.5;
  const asphalt = surf === 'asphalt';
  const lanes = Math.max(1, Math.round(r.width / 3.3));

  if (asphalt && b > a) {
    if (r.cat === 'major') {
      stripAlong(r, rs, M, a, b, hw - 0.35, 0.075);
      stripAlong(r, rs, M, a, b, -hw + 0.35, 0.075);
      if (!r.oneway) {
        if (r.width >= 12) { stripAlong(r, rs, M, a, b, 0.12, 0.05); stripAlong(r, rs, M, a, b, -0.12, 0.05); }
        else stripAlong(r, rs, M, a, b, 0, 0.06);
      } else {
        for (let k = 1; k < lanes; k++) dashes(r, rs, M, a, b, -hw + (r.width / lanes) * k, 0.06, 3, 9);
      }
    } else if (r.cat === 'normal' && r.type !== 'residential' && !r.oneway && r.width >= 5.5) {
      dashes(r, rs, M, a, b, 0, 0.05, 3, 6);
    }
  }
  if (r.cat === 'cycle' && b > a) {
    if (r.width >= 2.4) dashes(r, rs, M, a, b, 0, 0.05, 1, 2);
    if (detail) for (let s = a + 3; s < b - 2; s += 70) decal(r, rs, M, s, r.width >= 2.4 ? r.width / 4 : 0, 1.5, 0.75, UV_BIKE);
  }

  for (const c of rs.crossings) {
    for (let o = -hw + 0.6; o <= hw - 0.6; o += 1) stripAlong(r, rs, M, c.s - 1.5, c.s + 1.5, o + 0.25, 0.25);
    if (c.stop && (!r.oneway || c.stop < 0)) {
      const ss = c.s + c.stop * 2.6;
      const half = r.oneway ? [-hw, hw] : c.stop > 0 ? [-hw, 0] : [0, hw];
      stripAlong(r, rs, M, ss - 0.15, ss + 0.15, (half[0] + half[1]) / 2, (half[1] - half[0]) / 2 - 0.2);
    }
  }

  // haaientanden on the approach lane of a give-way end
  for (const end of [0, 1]) {
    const e = end ? rs.e1 : rs.e0;
    if (!e.giveWay || e.J <= 0) continue;
    if (r.oneway && !end) continue;
    const dir = end ? 1 : -1;
    const sBase = end ? L - e.J - 0.3 : e.J + 0.3;
    if (sBase < 1 || sBase > L - 1) continue;
    const o0 = r.oneway ? -hw + 0.3 : end ? 0.2 : -hw + 0.3;
    const o1 = r.oneway ? hw - 0.3 : end ? hw - 0.3 : -0.2;
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
        for (let s = a + 4 + rnd(r, side + 9) * 10; s < b - 2; s += 16 + rnd(r, s) * 8) decal(r, rs, M, s, side * (hw - 0.2), 0.5, 0.3, UV_GRATE);
      }
    }
  }

  if (!M.idx.length) return null;
  return finishGeometry(M.pos, M.nrm, M.idx, [['uv', M.uv, 2]]);
}

// ---------------------------------------------------------------- road group

export function buildRoadGroup(r) {
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
  return group;
}
