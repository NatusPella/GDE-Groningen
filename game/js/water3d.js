import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { polygonBounds } from './util.js';
import { onSettingsChange } from './settings.js';
import { WATER_TONES as TONES, WATER_SHARED_GLSL } from './watertones.js';
import { KIELZOG_GLSL, kielzogVeld, veldHoogte } from './kielzogveld.js';

// Stylised canal water: a grid-filled surface clipped exactly to each water
// polygon, low-poly faceted swell (derivative normals), a per-vertex
// distance-to-shore attribute that drives the depth gradient, foam line,
// duckweed and a flow direction along the canal. Reflections are faked:
// sky gradient, a stepped skyline band of quay houses and, at night, warm
// window/lamp streaks. Behind a fast boat the surface itself lifts into the
// wake's V (kielzogveld.js, #417): four wakes at most, as uniforms.

const QUALITY = { laag: 0, middel: 1, hoog: 2 };
let quality = 2;
const materials = new Set();
onSettingsChange((st) => {
  const q = QUALITY[st.quality] ?? 2;
  if (q === quality) return;
  quality = q;
  for (const m of materials) { m.defines.WATER_Q = q; m.needsUpdate = true; }
});

const VERTEX_SHADER = `
attribute float aEdge;
attribute vec2 aFlow;
attribute float aFacade;
uniform float uTime;
uniform float uWave;
uniform float uSea;

${KIELZOG_GLSL}

varying vec3 vWorldPos;
varying float vEdge;
varying vec2 vFlow;
varying float vFacade;

#include <fog_pars_vertex>

float waveH(vec2 p, float t) {
  return sin(dot(p, vec2(0.52, 0.24)) + t * 1.1) * 0.5
       + sin(dot(p, vec2(-0.27, 0.58)) - t * 0.9) * 0.35
       + sin(dot(p, vec2(0.83, -0.66)) + t * 1.7) * 0.15;
}

void main() {
  vec3 pos = position;
  vec4 wp0 = modelMatrix * vec4(pos, 1.0);
#if WATER_Q > 0
  float amp = smoothstep(0.15, 5.0, aEdge) * uWave * (1.0 + uSea * smoothstep(12.0, 24.0, aEdge));
  pos.y += waveH(wp0.xz + aFlow * uTime * 0.25, uTime) * amp;
  pos.y += kielzogVeld(wp0.xz); // het kielzog tilt het water zelf op (#417)
#endif
  vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
  vWorldPos = worldPosition.xyz;
  vEdge = aEdge;
  vFlow = aFlow;
  vFacade = aFacade;
  vec4 mvPosition = viewMatrix * worldPosition;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FRAGMENT_SHADER = `
uniform float uTime;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform vec3 uFoamColor;
uniform vec3 uDuckweedColor;
uniform vec3 uFacadeColor;
uniform vec3 uWindowColor;
uniform vec3 uLampColor;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uSunColor;
uniform vec3 uSunDir;
uniform float uSunStrength;
uniform float uOpacity;
uniform float uRain;
uniform float uLight;
uniform float uNight;

varying vec3 vWorldPos;
varying float vEdge;
varying vec2 vFlow;
varying float vFacade;

#include <fog_pars_fragment>

${WATER_SHARED_GLSL}
#define hash2 wtrHash
#define valueNoise wtrNoise

void main() {
  vec2 p = vWorldPos.xz;
  vec3 v = normalize(cameraPosition - vWorldPos);

  vec3 n = normalize(cross(dFdx(vWorldPos), dFdy(vWorldPos)));
  if (n.y < 0.0) n = -n;
  WtrFlow fl;
  n = wtrNormal(n, p, vFlow, uTime, uRain, fl);
  float fw = fl.fw, rq = fl.rq;
  vec2 drift0 = fl.drift0, drift1 = fl.drift1;

  float cosV = clamp(dot(n, v), 0.0, 1.0);
  float fresnel = 0.03 + 0.97 * pow(1.0 - cosV, 5.0);

  float deep = wtrDeep(vEdge);
  vec3 body = mix(uShallowColor, uDeepColor, deep) * uLight;
#if WATER_Q > 0
  vec2 lxz = normalize(uSunDir.xz + vec2(1e-3));
  body *= clamp(1.0 + dot(n.xz, lxz) * 3.2 + n.x * 0.8, 0.55, 1.6);
#endif

  vec3 r = reflect(-v, n);
  float ry = max(r.y, 0.0);
  vec3 sky = mix(uHorizon, uZenith, pow(ry, 0.55));

  vec2 toP = vWorldPos.xz - cameraPosition.xz;
  float th = atan(toP.y, toP.x) + (n.x + n.z) * 0.22;
  float bin = floor(th * 38.0);
  float roof = 0.1 + 0.16 * hash2(vec2(bin, 1.3));
  float fac = 1.0 - smoothstep(roof - 0.015, roof + 0.015, ry);
  fac *= vFacade; // the quay houses mirror only where there are quays: a walled canal, not a lake, a river or the open sea (#231)
  vec3 facade = uFacadeColor * (0.55 + 0.45 * hash2(vec2(bin, 8.1))) * uLight;
  sky = mix(sky, facade, fac * 0.85);

#if WATER_Q > 0
  if (uNight > 0.01) {
    float wcol = floor(th * 150.0);
    float lit = step(0.68, hash2(vec2(wcol, 3.7)));
    float row = floor(ry * 55.0 + rq * 3.0);
    float dash = step(0.4, hash2(vec2(wcol, row)));
    float inCol = smoothstep(0.5, 0.15, abs(fract(th * 150.0) - 0.5));
    vec3 wc = mix(uWindowColor, uLampColor, hash2(vec2(wcol, 9.2)));
    sky += wc * lit * dash * inCol * fac * uNight * uNight * 1.8;
    float lcol = floor(th * 22.0);
    float lamp = step(0.78, hash2(vec2(lcol, 5.1)));
    float lIn = smoothstep(0.5, 0.05, abs(fract(th * 22.0) - 0.5));
    float lDash = step(0.35, hash2(vec2(lcol, floor(ry * 30.0 + rq * 4.0))));
    sky += uLampColor * lamp * lIn * lDash * (1.0 - smoothstep(0.0, roof + 0.08, ry)) * uNight * uNight * 2.4;
  }
#endif

  vec3 color = mix(body, sky, clamp(fresnel * 0.95, 0.0, 0.9));

#if WATER_Q > 0
  float spec = pow(max(dot(r, uSunDir), 0.0), 220.0) * 1.2 + pow(max(dot(r, uSunDir), 0.0), 900.0) * 4.0; // smallere lobbe: geen brede gele gloed op het water (#436)
#else
  float spec = pow(max(dot(r, uSunDir), 0.0), 220.0) * 3.0;
#endif
  color += mix(uSunColor, vec3(1.0), 0.45) * uSunStrength * spec; // de zon in het water is wit met een zweem, niet geel

  float alpha = uOpacity + fresnel * 0.1;

#if WATER_Q > 0
  float foam = wtrFoam(p, vEdge, fl, uTime);
  color = mix(color, uFoamColor * (0.35 + 0.65 * uLight), foam);

  vec3 litCol = vec3(uLight) * 0.45 + uSunColor * uSunStrength * max(uSunDir.y, 0.0) * 0.3;
  float nearEdge = 1.0 - smoothstep(0.6, 2.0 + 3.0 * valueNoise(p * 0.043), vEdge);
  float dw = mix(valueNoise((p - drift0 * 0.3) * 0.21), valueNoise((p - drift1 * 0.3) * 0.21 + 31.0), fw);
  float kroos = smoothstep(0.7, 0.74, dw * (0.55 + 0.45 * nearEdge) + valueNoise(p * 2.5) * 0.08) * nearEdge;
  color = mix(color, uDuckweedColor * litCol * (0.8 + 0.35 * valueNoise(p * 5.0)), kroos * 0.9);
  alpha = mix(alpha, 1.0, kroos);
#endif

#if WATER_Q > 1
  vec2 lp0 = (p - drift0 * 0.6) * 1.3, lp1 = (p - drift1 * 0.6) * 1.3 + 5.0;
  float leaf0 = step(0.992, hash2(floor(lp0))) * smoothstep(0.32, 0.18, length(fract(lp0) - 0.5));
  float leaf1 = step(0.992, hash2(floor(lp1))) * smoothstep(0.32, 0.18, length(fract(lp1) - 0.5));
  float leaf = mix(leaf0, leaf1, fw) * (1.0 - smoothstep(1.0, 7.0, vEdge));
  vec3 leafCol = mix(vec3(0.36, 0.2, 0.07), vec3(0.55, 0.42, 0.12), hash2(floor(lp0) + 3.0));
  color = mix(color, leafCol * litCol, leaf);
  alpha = mix(alpha, 1.0, leaf);
#endif

  gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

// Another material that draws water by the same profile (the terrain's far
// water, countryfield.js) follows the quality setting through its WATER_Q define.
export function followWaterQuality(material) {
  material.defines = { ...(material.defines || {}), WATER_Q: quality };
  materials.add(material);
  return material;
}

export function createWaterMaterial(sky = null) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uWave: { value: TONES.wave },
      uSea: { value: 0 },
      uWakeA: { value: new THREE.Vector4() },
      uWakeB: { value: new THREE.Vector4() },
      uWakeC: { value: new THREE.Vector4() },
      uWakeD: { value: new THREE.Vector4() },
      uWakeK: { value: new THREE.Vector4() },
      uDeepColor: { value: new THREE.Color(TONES.deep) },
      uShallowColor: { value: new THREE.Color(TONES.shallow) },
      uFoamColor: { value: new THREE.Color(TONES.foam) },
      uDuckweedColor: { value: new THREE.Color(TONES.duckweed) },
      uFacadeColor: { value: new THREE.Color(0x5e4034) },
      uWindowColor: { value: new THREE.Color(0xffc877) },
      uLampColor: { value: new THREE.Color(0xffa84a) },
      uZenith: sky ? sky.uZenith : { value: new THREE.Color(0x5b93cf) },
      uHorizon: sky ? sky.uHorizon : { value: new THREE.Color(0xd9e3e4) },
      uSunColor: sky ? sky.uSunColor : { value: new THREE.Color(0xffd49a) },
      uSunDir: sky ? sky.uSunDir : { value: new THREE.Vector3(0.6, 0.6, 0.4).normalize() },
      uSunStrength: sky ? sky.uSunStrength : { value: 1 },
      uOpacity: { value: TONES.opacity },
      uRain: { value: 0 },
      uLight: { value: 1 },
      uNight: { value: 0 },
      fogColor: { value: new THREE.Color(0xffffff) },
      fogNear: { value: 1 },
      fogFar: { value: 2000 },
    },
    defines: { WATER_Q: quality },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    fog: true,
  });
  materials.add(m);
  return m;
}

// Audit: every water polygon's surface mesh (a Group named 'water' whose first
// child is the surface; banks and quays follow) must wear the one shared
// material. Returns { total, shared, stray: [group names/positions] }.
export function auditWaterMeshes(root, material) {
  let total = 0, shared = 0;
  const stray = [];
  root.traverse((o) => {
    if (o.name !== 'water' || !o.children || !o.children.length) return;
    total++;
    const surface = o.children[0];
    if (surface && surface.material === material) shared++;
    else stray.push(`${o.name}@${Math.round(o.position.x)},${Math.round(o.position.z)}`);
  });
  return { total, shared, stray };
}

// The one water material the city canals and the Ommeland water share.
let shared = null;
export function sharedWaterMaterial(sky = null) {
  return shared || (shared = createWaterMaterial(sky));
}

let swellAmp = TONES.wave;
let seaExtra = 0;
const WAKE_SLOTS = ['uWakeA', 'uWakeB', 'uWakeC', 'uWakeD'];
// sea = extra swell on open water (golven.js seaExtra): from 12 m to 24 m off the shore the swell grows by this factor (#417)
export function updateWaterMaterial(material, time, rain = 0, night = 0, sea = 0) {
  const u = material.uniforms;
  u.uTime.value = time;
  u.uRain.value = rain;
  u.uNight.value = night;
  u.uLight.value = (0.14 + 0.86 * (1 - night)) * (1 - 0.3 * Math.min(1, rain));
  u.uWave.value = swellAmp = TONES.wave + TONES.waveRain * Math.min(1, rain);
  u.uSea.value = seaExtra = sea;
  // the wakes of this frame (kielzogveld.js): four slots, the rest flat
  const veld = kielzogVeld(), k = u.uWakeK.value;
  for (let i = 0; i < WAKE_SLOTS.length; i++) {
    const slot = u[WAKE_SLOTS[i]].value, w = veld[i];
    if (w && w.sterkte > 0 && Number.isFinite(w.sterkte)) { slot.set(w.x, w.y, w.cx, w.cy); k.setComponent(i, w.sterkte); }
    else { slot.set(0, 0, 1, 0); k.setComponent(i, 0); }
  }
}

// The vertex shader's swell at world (x, z) on the CPU, for floating things
// (scene3d.js boat buoyancy): edge = distance to the nearest shore, (tx, ty)
// that shore's direction (the aFlow attribute, buildWaterGeometry). The wake
// field of this frame lifts the hull just like it lifts the mesh (#417).
export function waterSwellAt(x, z, time, edge, tx, ty) {
  if (!quality) return 0;
  if (tx * 0.8 + ty * 0.6 < 0) { tx = -tx; ty = -ty; }
  const px = x + tx * time * 0.25, pz = z + ty * time * 0.25;
  const h = Math.sin(px * 0.52 + pz * 0.24 + time * 1.1) * 0.5
    + Math.sin(-px * 0.27 + pz * 0.58 - time * 0.9) * 0.35
    + Math.sin(px * 0.83 - pz * 0.66 + time * 1.7) * 0.15;
  const k = Math.min(1, Math.max(0, (edge - 0.15) / 4.85));
  const o = Math.min(1, Math.max(0, (edge - 12) / 12));
  return h * k * k * (3 - 2 * k) * swellAmp * (1 + seaExtra * o * o * (3 - 2 * o)) + veldHoogte(x, z);
}

export function waterSwellAmp() {
  return quality ? swellAmp : 0;
}

// --- geometry ------------------------------------------------------------

function clipAxis(src, axis, val, keepGreater) {
  const out = [];
  const n = src.length / 2;
  for (let i = 0; i < n; i++) {
    const ax = src[i * 2], ay = src[i * 2 + 1];
    const j = (i + 1) % n;
    const bx = src[j * 2], by = src[j * 2 + 1];
    const ca = axis ? ay : ax, cb = axis ? by : bx;
    const ina = keepGreater ? ca >= val : ca <= val;
    const inb = keepGreater ? cb >= val : cb <= val;
    if (ina) out.push(ax, ay);
    if (ina !== inb) {
      const t = (val - ca) / (cb - ca);
      out.push(ax + (bx - ax) * t, ay + (by - ay) * t);
    }
  }
  return out;
}

function clipBox(src, x0, y0, x1, y1) {
  let p = clipAxis(src, 0, x0, true);
  if (p.length < 6) return p;
  p = clipAxis(p, 0, x1, false);
  if (p.length < 6) return p;
  p = clipAxis(p, 1, y0, true);
  if (p.length < 6) return p;
  return clipAxis(p, 1, y1, false);
}

function flatArea(p) {
  let s = 0;
  const n = p.length / 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    s += p[i * 2] * p[j * 2 + 1] - p[j * 2] * p[i * 2 + 1];
  }
  return s / 2;
}

function jitterHash(x, y) {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

// Grid inside, exact polygon clip at the boundary cells (quadtree of
// Sutherland-Hodgman box clips - robust for the Diepenring's slit ring).
// shoreFix(x, y, d): optional correction of the distance to shore, for water
// that carries on past the polygon (the map edge).
// How much the quay houses of the fake skyline mirror in a polygon: a province polygon says whether its shore is a quay
// ('kade') or a natural bank ('oever'); the city's and the fixes' (no bank) are canals, except lakes and the open sea
export function facadeOf(poly) {
  if (poly.bank !== undefined) return poly.bank === 'kade' ? 1 : 0;
  return poly.kind === 'zee' || poly.kind === 'meer' ? 0 : 1;
}

export function buildWaterGeometry(poly, index, shoreFix = null) {
  const src = [];
  for (const [x, y] of poly.pts) src.push(x, y);
  const [minx, miny, maxx, maxy] = poly.bounds || polygonBounds(poly.pts);
  const area = Math.abs(flatArea(src));
  const cell = area > 40000 ? 4 : 3;
  const ox = Math.floor(minx / cell) * cell, oy = Math.floor(miny / cell) * cell;
  let size = cell;
  while (ox + size < maxx || oy + size < maxy) size *= 2;

  const pos = [];
  const idx = [];
  const keys = new Map();
  const vert = (x, y) => {
    const k = Math.round(x * 64) * 1e7 + Math.round(y * 64);
    let v = keys.get(k);
    if (v === undefined) { v = pos.length / 2; pos.push(x, y); keys.set(k, v); }
    return v;
  };
  // vertices of the cells the outline crosses stay put: the outline may be a
  // seam with the next water polygon (no shore there to keep the jitter off)
  const rim = new Set();
  const tri = (a, b, c) => {
    if (a === b || b === c || a === c) return;
    const cr = (pos[b * 2 + 1] - pos[a * 2 + 1]) * (pos[c * 2] - pos[a * 2]) - (pos[b * 2] - pos[a * 2]) * (pos[c * 2 + 1] - pos[a * 2 + 1]);
    if (Math.abs(cr) < 1e-6) return;
    if (cr > 0) idx.push(a, b, c); else idx.push(a, c, b);
  };

  const rec = (piece, x0, y0, s) => {
    const p = clipBox(piece, x0, y0, x0 + s, y0 + s);
    if (p.length < 6) return;
    const a = Math.abs(flatArea(p));
    if (a < 1e-4) return;
    if (a >= s * s * 0.99999) {
      const n = Math.round(s / cell);
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const xa = x0 + i * cell, ya = y0 + j * cell;
          const v00 = vert(xa, ya), v10 = vert(xa + cell, ya), v01 = vert(xa, ya + cell), v11 = vert(xa + cell, ya + cell);
          if ((i + j) & 1) { tri(v00, v10, v11); tri(v00, v11, v01); } else { tri(v00, v10, v01); tri(v10, v11, v01); }
        }
      }
      return;
    }
    if (s <= cell + 1e-6) {
      const contour = [];
      for (let i = 0; i < p.length; i += 2) {
        const q = contour[contour.length - 1];
        if (q && Math.abs(q.x - p[i]) < 1e-4 && Math.abs(q.y - p[i + 1]) < 1e-4) continue;
        contour.push(new THREE.Vector2(p[i], p[i + 1]));
      }
      if (contour.length > 1 && contour[0].distanceTo(contour[contour.length - 1]) < 1e-4) contour.pop();
      if (contour.length < 3) return;
      const ids = contour.map((c) => vert(c.x, c.y));
      for (const v of ids) rim.add(v);
      if (contour.length === 3) { tri(ids[0], ids[1], ids[2]); return; }
      for (const t of THREE.ShapeUtils.triangulateShape(contour, [])) tri(ids[t[0]], ids[t[1]], ids[t[2]]);
      return;
    }
    const h = s / 2;
    rec(p, x0, y0, h); rec(p, x0 + h, y0, h); rec(p, x0, y0 + h, h); rec(p, x0 + h, y0 + h, h);
  };
  rec(src, ox, oy, size);

  const nv = pos.length / 2;
  const positions = new Float32Array(nv * 3);
  const edge = new Float32Array(nv);
  const flow = new Float32Array(nv * 2);
  for (let i = 0; i < nv; i++) {
    let x = pos[i * 2], y = pos[i * 2 + 1];
    const ns = index ? index.nearestShore(x, y, 24) : { d: 24, i: -1, tx: 1, ty: 0 };
    let tx = ns.tx, ty = ns.ty;
    if (tx * 0.8 + ty * 0.6 < 0) { tx = -tx; ty = -ty; }
    if (ns.d > cell * 1.2 && !rim.has(i)) {
      x += (jitterHash(x, y) - 0.5) * cell * 0.45;
      y += (jitterHash(y, x) - 0.5) * cell * 0.45;
    }
    positions[i * 3] = x; positions[i * 3 + 2] = y;
    edge[i] = ns.i >= 0 ? ns.d : 24;
    if (shoreFix) edge[i] = shoreFix(x, y, edge[i]);
    flow[i * 2] = tx; flow[i * 2 + 1] = ty;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aEdge', new THREE.BufferAttribute(edge, 1));
  geo.setAttribute('aFlow', new THREE.BufferAttribute(flow, 2));
  geo.setAttribute('aFacade', new THREE.BufferAttribute(new Float32Array(nv).fill(facadeOf(poly)), 1));
  geo.setIndex(new THREE.BufferAttribute(new Uint32Array(idx), 1));
  geo.computeBoundingSphere();
  return geo;
}
