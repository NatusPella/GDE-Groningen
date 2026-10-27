import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { edgeDistance } from './countryfield.js';
import {
  turbineTowerGeometry, turbineRotorGeometry, lightGeometry, pylonGeometry, wireGeometry,
  TURBINE_HUB, PYLON_ARMS,
} from './countrymodels.js';
import { vcMaterial, markShared } from './pixelart3d.js';
import { markInstancesDirty } from './util.js';
import { hoofdspeler } from './players.js';

// The tall things of the province past the detail radius: wind turbines and
// pylons at the places OSM has them (the land file of the tile build,
// scripts/world/farprops.mjs), drawn as one instanced layer whose vertex
// shader pulls anything beyond ~cam.far in along its view ray (same angular
// size) and whose haze follows the true distance, so they stay faintly
// readable on the horizon far past the fog. Nothing here moves on the CPU;
// rotors spin in the shader. The same lists are the solids the walkers and
// vehicles collide with near a turbine's foot or a pylon's leg.
//
//   setFarProps({ turbines: [[x, y, hub]], pylons: [[x, y, yaw]], spans: [[i, j]] })
//   farSolidsNear(x, y, r)     [{ x, y, r }] of the foot circles within r
//   farPropsIn(x0, y0, x1, y1) { turbines, pylons } in a window, for the maps
//   updateFarProps(dt, world, scene, cam)

const R_TALL = 5200;
const WIND_YAW = -Math.PI / 4; // rotors face the south-west wind
const RESCAN_M = 220;

const U = { uFarR: { value: 900 }, uTime: { value: 0 }, uCapT: { value: 0.5 }, uFarMulT: { value: 14 }, uFadeT: { value: 1 } };

const D = { turbines: [], pylons: [], spans: [], cell: new Map() };
const CELL = 500;
const ck = (x, y) => Math.floor(x / CELL) * 100003 + Math.floor(y / CELL);

export function setFarProps(data) {
  D.turbines = (data && data.turbines) || [];
  D.pylons = (data && data.pylons) || [];
  D.spans = (data && data.spans) || [];
  D.cell.clear();
  for (const t of D.turbines) { const k = ck(t[0], t[1]); (D.cell.get(k) || D.cell.set(k, []).get(k)).push({ x: t[0], y: t[1], r: 2.4 * (t[2] / TURBINE_HUB) + 0.8 }); }
  D.pylons.forEach((p) => { const k = ck(p[0], p[1]); (D.cell.get(k) || D.cell.set(k, []).get(k)).push({ x: p[0], y: p[1], r: 3.4 }); });
  if (K) K.buildAt = null;
}

export function farSolidsNear(x, y, r, out = []) {
  for (let cx = Math.floor((x - r - 4) / CELL); cx <= Math.floor((x + r + 4) / CELL); cx++) {
    for (let cy = Math.floor((y - r - 4) / CELL); cy <= Math.floor((y + r + 4) / CELL); cy++) {
      for (const s of D.cell.get(cx * 100003 + cy) || []) if (Math.abs(s.x - x) < r + s.r && Math.abs(s.y - y) < r + s.r) out.push(s);
    }
  }
  return out;
}

export function farPropsIn(x0, y0, x1, y1) {
  const inb = (p) => p[0] > x0 && p[0] < x1 && p[1] > y0 && p[1] < y1;
  return { turbines: D.turbines.filter(inb), pylons: D.pylons.filter(inb) };
}

function skyMaterial(key, { rotor = 0, light = false } = {}) {
  const m = light ? new THREE.MeshBasicMaterial({ vertexColors: true }) : vcMaterial({ roughness: 0.9 });
  markShared(m);
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    const head = 'uniform float uFarR;\nuniform float uTime;\nvarying float vSkyD;\n';
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\n${head}`).replace('#include <project_vertex>', `
${rotor ? `{
  float ang = uTime * ${rotor.toFixed(3)} + instanceMatrix[3].x * 0.0131 + instanceMatrix[3].z * 0.0291;
  float c = cos(ang), s = sin(ang);
  transformed = vec3(transformed.x, c * transformed.y - s * transformed.z, s * transformed.y + c * transformed.z);
}` : ''}
vec4 skyO = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
float skyD = distance(skyO.xyz, cameraPosition);
vSkyD = skyD;
vec4 skyW = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
${light ? 'skyW.xyz = skyO.xyz + (skyW.xyz - skyO.xyz) * max(1.6, skyD / 220.0);' : ''}
skyW.xyz = cameraPosition + (skyW.xyz - cameraPosition) * (skyD > uFarR ? uFarR / skyD : 1.0);
vec4 mvPosition = viewMatrix * skyW;
gl_Position = projectionMatrix * mvPosition;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform float uTime;
uniform float uCapT; uniform float uFarMulT; uniform float uFadeT;
varying float vSkyD;`).replace('#include <fog_fragment>', `
${light ? 'gl_FragColor.rgb *= 0.12 + 0.88 * step(0.35, fract(uTime * 0.5 + 0.2));' : ''}
#ifdef USE_FOG
  float std = smoothstep(fogNear, fogFar, vSkyD);
  float hz = min(std, uCapT + (1.0 - uCapT) * smoothstep(fogFar, fogFar * uFarMulT, vSkyD));
  hz = mix(std, hz, uFadeT);
  if (hz > 0.995) discard;
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, hz);
#endif`);
  };
  m.customProgramCacheKey = () => 'farprops-' + key;
  return m;
}

const TYPES = {
  turbine: { geo: turbineTowerGeometry, mat: 'tall', cap: 700, shadow: true },
  rotor: { geo: turbineRotorGeometry, mat: 'rotorT', cap: 700 },
  light: { geo: lightGeometry, mat: 'light', cap: 700 },
  pylon: { geo: pylonGeometry, mat: 'tall', cap: 1200, shadow: true },
  wire: { geo: wireGeometry, mat: 'tall', cap: 6000 },
};

let K = null;

function init(scene) {
  const group = new THREE.Group();
  group.name = 'farprops';
  group.matrixAutoUpdate = false;
  scene.add(group);
  const mats = { tall: skyMaterial('tall'), rotorT: skyMaterial('rotorT', { rotor: 1.15 }), light: skyMaterial('light', { light: true }) };
  const pools = {};
  for (const [k, T] of Object.entries(TYPES)) {
    const mesh = new THREE.InstancedMesh(markShared(T.geo()), mats[T.mat], T.cap);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(T.cap * 3), 3);
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.castShadow = !!T.shadow;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    mesh.userData.shared = true;
    group.add(mesh);
    pools[k] = mesh;
  }
  K = { group, pools, buildAt: null, ms: 0 };
  window.__farprops = K;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const _e = new THREE.Euler(), _x = new THREE.Vector3(1, 0, 0), _d = new THREE.Vector3();

function put(L, type, x, h, y, rotY, sx, sy, sz) {
  const list = L[type] || (L[type] = { m: [], n: 0 });
  if (list.n >= TYPES[type].cap) return;
  _e.set(0, rotY, 0);
  _q.setFromEuler(_e);
  _m.compose(_p.set(x, h, y), _q, _s.set(sx, sy, sz));
  for (let i = 0; i < 16; i++) list.m.push(_m.elements[i]);
  list.n++;
}

function putSeg(L, a, b, thick) {
  const list = L.wire || (L.wire = { m: [], n: 0 });
  if (list.n >= TYPES.wire.cap) return;
  _d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = _d.length();
  _q.setFromUnitVectors(_x, _d.normalize());
  _m.compose(_p.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), _q, _s.set(len, thick, thick));
  for (let i = 0; i < 16; i++) list.m.push(_m.elements[i]);
  list.n++;
}

function rot2(lx, lz, angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return [lx * c - lz * s, lx * s + lz * c];
}

function gather(px, py) {
  const L = {};
  const r2 = R_TALL * R_TALL;
  for (const [x, y, hub] of D.turbines) {
    if ((x - px) ** 2 + (y - py) ** 2 > r2) continue;
    const s = hub / TURBINE_HUB;
    put(L, 'turbine', x, -0.05, y, -WIND_YAW, s, s, s);
    const [ax, ay] = rot2(-3.4 * s, 0, WIND_YAW);
    put(L, 'rotor', x + ax, (TURBINE_HUB + 0.4) * s, y + ay, -WIND_YAW, s, s, s);
    const [lx, ly] = rot2(4.6 * s, 0, WIND_YAW);
    put(L, 'light', x + lx, (TURBINE_HUB + 2.3) * s, y + ly, 0, 1, 1, 1);
  }
  for (const [x, y, yaw] of D.pylons) if ((x - px) ** 2 + (y - py) ** 2 <= r2) put(L, 'pylon', x, -0.05, y, -yaw, 1, 1, 1);
  for (const [i, j] of D.spans) {
    const a = D.pylons[i], b = D.pylons[j];
    if ((a[0] - px) ** 2 + (a[1] - py) ** 2 > r2 && (b[0] - px) ** 2 + (b[1] - py) ** 2 > r2) continue;
    // the arms lie across the line: each tower's own yaw is its line's direction
    for (const [h, half] of PYLON_ARMS) {
      for (const s of [-1, 1]) {
        const [ax, ay] = rot2(0, s * half, a[2]), [bx2, by2] = rot2(0, s * half, b[2]);
        const A = [a[0] + ax, h - 2.1, a[1] + ay], B = [b[0] + bx2, h - 2.1, b[1] + by2];
        const mid = [(A[0] + B[0]) / 2, h - 2.1 - 5.5, (A[2] + B[2]) / 2];
        const q1 = [(A[0] * 3 + B[0]) / 4, h - 2.1 - 4.1, (A[2] * 3 + B[2]) / 4];
        const q3 = [(A[0] + B[0] * 3) / 4, h - 2.1 - 4.1, (A[2] + B[2] * 3) / 4];
        putSeg(L, A, q1, 1); putSeg(L, q1, mid, 1); putSeg(L, mid, q3, 1); putSeg(L, q3, B, 1);
      }
    }
  }
  return L;
}

function upload(L) {
  for (const [k, pool] of Object.entries(K.pools)) {
    const it = L[k];
    const n = it ? it.n : 0;
    if (n) {
      pool.instanceMatrix.array.set(it.m);
      pool.instanceColor.array.fill(1, 0, n * 3);
    }
    pool.count = n;
    markInstancesDirty(pool.instanceMatrix, n);
    markInstancesDirty(pool.instanceColor, n);
  }
}

// Per frame (countryside.js updateCountryside)
export function updateFarProps(dt, world, scene, cam) {
  if (!D.turbines.length && !D.pylons.length) return;
  if (!K) init(scene);
  const t0 = performance.now();
  const p = world.streamFocus || hoofdspeler(world); // the camera focus in a cutscene (tilefocus.js)
  const ed = edgeDistance(p.x, p.y);
  // a horizon trick: hidden deep inside the city's data
  const fadeT = smooth(-2600, -700, ed);
  U.uTime.value = world.time || 0;
  U.uFadeT.value = fadeT;
  U.uFarR.value = Math.max(150, cam.far * 0.82);
  K.group.visible = fadeT > 0;
  if (fadeT <= 0) return;
  if (!K.buildAt || Math.hypot(p.x - K.buildAt[0], p.y - K.buildAt[1]) > RESCAN_M) {
    K.buildAt = [p.x, p.y];
    upload(gather(p.x, p.y));
  }
  K.ms = K.ms * 0.95 + (performance.now() - t0) * 0.05;
}

function smooth(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function farPropsStats() {
  if (!K) return { turbines: D.turbines.length, pylons: D.pylons.length };
  const counts = {};
  for (const [k, m] of Object.entries(K.pools)) counts[k] = m.count;
  return { ms: +K.ms.toFixed(3), turbines: D.turbines.length, pylons: D.pylons.length, counts };
}
