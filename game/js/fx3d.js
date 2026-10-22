import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { vehicleContacts, surfaceUnder } from './vehicle.js';
import { getVehicleMesh, pruneVehicleMeshes, applyVehicleDamage, vehicleDamageParts, updateBikeStaat } from './models3d_vehicles.js';
import { rand } from './rng.js';
import { nieuwLos } from './vehicledamage.js';

// Vehicle feel effects: skid marks, tyre smoke/dust/spray/exhaust, sparks,
// debris and progressive body damage. Everything is pooled up front; the
// per-frame paths only write into preallocated typed arrays.

const FX_RANGE = 90;
// Skid marks: one pooled ring buffer of quads (the oldest is reused), held
// at full strength for SKID_HOLD s, then fading out over SKID_FADE s.
const SKID_QUADS = 2400;
const SKID_HOLD = 45;
const SKID_FADE = 45;
// over the road layers (asphalt +0.03, markings +0.035 in roadsurface.js)
const SKID_LIFT = 0.048;
const SMOKE_MAX = 420;
const SPARK_MAX = 180;
const CHUNK_MAX = 140;
const PANEL_MAX = 10;
const GRAVITY = 9.8;

let ready = false;
let fxMap = null;
let simTime = 0;
let contactCursor = 0;
let pruneTimer = 0;


// --- skid marks ----------------------------------------------------------------

const skid = {
  mesh: null, pos: null, col: null, birth: null, alpha: null, next: 0, fadeTimer: 0, dirty: false,
};

function initSkids(scene) {
  const geo = new THREE.BufferGeometry();
  skid.pos = new Float32Array(SKID_QUADS * 12);
  skid.col = new Float32Array(SKID_QUADS * 16);
  skid.birth = new Float32Array(SKID_QUADS).fill(-1e9);
  skid.alpha = new Float32Array(SKID_QUADS);
  const idx = new Uint16Array(SKID_QUADS * 6);
  for (let q = 0; q < SKID_QUADS; q++) {
    const b = q * 4;
    idx.set([b, b + 2, b + 1, b + 1, b + 2, b + 3], q * 6);
  }
  for (let i = 0; i < SKID_QUADS * 4; i++) {
    skid.col[i * 4] = 0.035; skid.col[i * 4 + 1] = 0.033; skid.col[i * 4 + 2] = 0.03; skid.col[i * 4 + 3] = 0;
  }
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.setAttribute('position', new THREE.BufferAttribute(skid.pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('color', new THREE.BufferAttribute(skid.col, 4).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -7, polygonOffsetUnits: -28,
  });
  skid.mesh = new THREE.Mesh(geo, mat);
  skid.mesh.frustumCulled = false;
  skid.mesh.matrixAutoUpdate = false;
  skid.mesh.name = 'fx-skidmarks';
  scene.add(skid.mesh);
}

// a/b: the quad's back and front edge, each with its own surface heights,
// so a mark on a ramp, a bridge or the raised/sunken ring follows the deck
function writeSkidQuad(ax0, ay0, ah0, ax1, ay1, ah1, bx0, by0, bh0, bx1, by1, bh1, alpha) {
  const q = skid.next;
  skid.next = (q + 1) % SKID_QUADS;
  const p = skid.pos, o = q * 12;
  p[o] = ax0; p[o + 1] = ah0 + SKID_LIFT; p[o + 2] = ay0;
  p[o + 3] = ax1; p[o + 4] = ah1 + SKID_LIFT; p[o + 5] = ay1;
  p[o + 6] = bx0; p[o + 7] = bh0 + SKID_LIFT; p[o + 8] = by0;
  p[o + 9] = bx1; p[o + 10] = bh1 + SKID_LIFT; p[o + 11] = by1;
  skid.birth[q] = simTime;
  skid.alpha[q] = alpha;
  skid.live = true;
  const c = skid.col, co = q * 16;
  c[co + 3] = alpha; c[co + 7] = alpha; c[co + 11] = alpha; c[co + 15] = alpha;
  skid.dirty = true;
}

function updateSkidFade(dt) {
  skid.fadeTimer -= dt;
  if (skid.dirty) {
    skid.mesh.geometry.attributes.position.needsUpdate = true;
    skid.mesh.geometry.attributes.color.needsUpdate = true;
    skid.dirty = false;
  }
  if (skid.fadeTimer > 0 || !skid.live) return;
  skid.fadeTimer = 0.25;
  const c = skid.col;
  let live = 0;
  for (let q = 0; q < SKID_QUADS; q++) {
    if (skid.alpha[q] <= 0) continue;
    live++;
    const t = (simTime - skid.birth[q] - SKID_HOLD) / SKID_FADE;
    let a = skid.alpha[q];
    if (t >= 1) { a = 0; skid.alpha[q] = 0; } else if (t > 0) a *= 1 - t * t;
    const co = q * 16;
    c[co + 3] = a; c[co + 7] = a; c[co + 11] = a; c[co + 15] = a;
  }
  skid.mesh.geometry.attributes.color.needsUpdate = true;
  skid.live = live > 0;
}

// Per-wheel track state lives on the vehicle (allocated once per vehicle).
function trackFor(v, i) {
  let t = v._skidTracks;
  if (!t) {
    t = v._skidTracks = [];
    for (let k = 0; k < 4; k++) t.push({ on: false, x: 0, y: 0, lx: 0, ly: 0, lh: 0, rx: 0, ry: 0, rh: 0 });
  }
  return t[i];
}

// The top surface under a tyre edge for a car at height z (elevation.js:
// a deck, ramp or the raised/sunken ring, never the layer above or below).
function skidSurface(x, y, z) {
  if (!fxMap || !fxMap.elev || !fxMap.elev.has) return z;
  const g = fxMap.groundHeightAt(x, y, z + 0.25);
  // no surface data near the car's own level (Ommeland terrain): the car's height
  return Math.abs(g - z) > 1.2 ? z : g;
}

function skidWheel(v, i, wx, wy, halfW, intensity) {
  const t = trackFor(v, i);
  if (intensity <= 0) { t.on = false; return; }
  const ca = Math.cos(v.angle), sa = Math.sin(v.angle);
  const z = v.z || 0;
  if (!t.on) {
    t.on = true; t.x = wx; t.y = wy;
    t.lx = wx + sa * halfW; t.ly = wy - ca * halfW;
    t.rx = wx - sa * halfW; t.ry = wy + ca * halfW;
    t.lh = skidSurface(t.lx, t.ly, z); t.rh = skidSurface(t.rx, t.ry, z);
    return;
  }
  const dx = wx - t.x, dy = wy - t.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.35) return;
  if (d > 3) { t.on = false; return; }
  const ux = dx / d, uy = dy / d;
  const sideways = Math.abs(ux * sa - uy * ca);
  const w = halfW * (1 + sideways * 0.9);
  const lx = wx + uy * w, ly = wy - ux * w, rx = wx - uy * w, ry = wy + ux * w;
  const lh = skidSurface(lx, ly, z), rh = skidSurface(rx, ry, z);
  // a step to another layer (off a deck edge, onto a ramp's lip): start a new track there
  if (Math.abs(lh - t.lh) > 0.6 || Math.abs(rh - t.rh) > 0.6 || Math.abs(lh - rh) > 0.6) {
    t.x = wx; t.y = wy; t.lx = lx; t.ly = ly; t.rx = rx; t.ry = ry; t.lh = lh; t.rh = rh;
    return;
  }
  writeSkidQuad(t.lx, t.ly, t.lh, t.rx, t.ry, t.rh, lx, ly, lh, rx, ry, rh, Math.min(0.62, 0.18 + intensity * 0.5));
  t.x = wx; t.y = wy; t.lx = lx; t.ly = ly; t.rx = rx; t.ry = ry; t.lh = lh; t.rh = rh;
}

// --- smoke / dust / spray / exhaust (lit camera-facing puffs) ----------------------
// Instanced quads with a standard material so puffs pick up the same sun,
// sky and fog as everything else; the fragment fakes a sphere normal and a
// lumpy soft edge, and per-instance opacity rides in aAlpha. A glow puff (aGlow, firework bursts #347) ignores the
// lights and shows its own colour, so it still reads at night.

const smoke = {
  mesh: null, alphaAttr: null, alpha: null, seed: null,
  x: null, y: null, z: null, vx: null, vy: null, vz: null, age: null, life: null, s0: null, s1: null, a0: null, drag: null, lift: null, size: null,
  next: 0, colorDirty: false, dirty: false,
};

function puffMaterial() {
  const mat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, transparent: true, depthWrite: false });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aAlpha;\nattribute float aSeed;\nattribute float aGlow;\nvarying float vAlpha;\nvarying float vSeed;\nvarying float vGlow;\nvarying vec2 vPuff;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAlpha = aAlpha;\nvSeed = aSeed;\nvGlow = aGlow;\nvPuff = position.xy * 2.0;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vAlpha;\nvarying float vSeed;\nvarying float vGlow;\nvarying vec2 vPuff;')
      .replace('#include <opaque_fragment>', 'if (vGlow > 0.5) outgoingLight = diffuseColor.rgb * 1.8;\n#include <opaque_fragment>')
      .replace('#include <alphamap_fragment>', `#include <alphamap_fragment>
        float pr = length(vPuff);
        float pa = vSeed * 6.2832;
        vec2 pq = mat2(cos(pa), -sin(pa), sin(pa), cos(pa)) * vPuff;
        float pn = sin(pq.x * 6.5 + vSeed * 17.0) * sin(pq.y * 5.5 - vSeed * 9.0) * 0.5 + sin((pq.x - pq.y) * 9.5 + vSeed * 5.0) * 0.25;
        float pe = 0.8 + 0.2 * pn;
        diffuseColor.a *= vAlpha * smoothstep(pe, pe * 0.3, pr);
        if (diffuseColor.a < 0.004) discard;`)
      .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
        normal = normalize(vec3(vPuff * 0.85, max(0.25, sqrt(max(0.0, 1.0 - dot(vPuff, vPuff) * 0.7)))));`);
  };
  return mat;
}

function initSmoke(scene) {
  const n = SMOKE_MAX;
  for (const k of ['x', 'y', 'z', 'vx', 'vy', 'vz', 'age', 'life', 's0', 's1', 'a0', 'drag', 'lift', 'size', 'floor']) smoke[k] = new Float32Array(n);
  smoke.alpha = new Float32Array(n);
  smoke.seed = new Float32Array(n);
  smoke.glow = new Float32Array(n);
  const geo = new THREE.PlaneGeometry(1, 1);
  smoke.alphaAttr = new THREE.InstancedBufferAttribute(smoke.alpha, 1).setUsage(THREE.DynamicDrawUsage);
  smoke.seedAttr = new THREE.InstancedBufferAttribute(smoke.seed, 1).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aAlpha', smoke.alphaAttr);
  geo.setAttribute('aSeed', smoke.seedAttr);
  smoke.glowAttr = new THREE.InstancedBufferAttribute(smoke.glow, 1).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aGlow', smoke.glowAttr);
  const mesh = new THREE.InstancedMesh(geo, puffMaterial(), n);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.setColorAt(0, _c.setRGB(1, 1, 1));
  mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < n; i++) mesh.setMatrixAt(i, zero);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  mesh.name = 'fx-smoke';
  smoke.mesh = mesh;
  scene.add(mesh);
}

// r,g,b 0..1 (sRGB); s0 -> s1 is the diameter over life (metres); lift is upward accel.
function spawnSmoke(x, y, z, vx, vy, vz, life, s0, s1, r, g, b, a, drag = 1.5, lift = 0.3, glow = 0) {
  const i = smoke.next;
  smoke.next = (i + 1) % SMOKE_MAX;
  smoke.x[i] = x; smoke.y[i] = y; smoke.z[i] = z;
  // never below the surface it came from (a car down in the sunken ring
  // smokes down there, not at street level)
  smoke.floor[i] = Math.min(0.05, y - 0.15);
  smoke.vx[i] = vx; smoke.vy[i] = vy; smoke.vz[i] = vz;
  smoke.age[i] = 0; smoke.life[i] = life;
  smoke.s0[i] = s0; smoke.s1[i] = s1; smoke.a0[i] = a;
  smoke.drag[i] = drag; smoke.lift[i] = lift;
  smoke.seed[i] = Math.random();
  smoke.glow[i] = glow;
  smoke.mesh.setColorAt(i, _c.setRGB(r, g, b, THREE.SRGBColorSpace));
  smoke.colorDirty = true;
  smoke.dirty = true;
}

export function spawnFxPuff(x, y, z, vx, vy, vz, life, s0, s1, r, g, b, a, drag, lift, glow = 0) {
  if (ready) spawnSmoke(x, y, z, vx, vy, vz, life, s0, s1, r, g, b, a, drag, lift, glow);
}

// Hot streak (bullet ricochet, grinding metal); three.js coordinates.
export function spawnFxSpark(x, y, z, vx, vy, vz, life) {
  if (ready) spawnSpark(x, y, z, vx, vy, vz, life);
}

// Tumbling chip from the shared debris pool (stone, glass, wood, paint).
export function spawnFxChip(x, y, z, vx, vy, vz, size, color, life) {
  if (ready) spawnDebris(chunks, x, y, z, vx, vy, vz, size, size * rand(0.3, 0.7), size * rand(0.6, 1.2), color, life);
}

const _camQ = new THREE.Quaternion();

// scene3d.js hands over its camera when it makes it (no import back)
let fxCamera = null;
export function setFxCamera(c) { fxCamera = c; }

// Uploads only while puffs live (plus one frame to clear the last ones):
// re-sending idle instance buffers every frame can stall on a busy GPU.
function updateSmoke(dt) {
  const cam = fxCamera;
  if (cam) cam.getWorldQuaternion(_camQ);
  const mesh = smoke.mesh;
  let live = 0;
  if (!smoke.dirty && !smoke.colorDirty) return;
  for (let i = 0; i < SMOKE_MAX; i++) {
    const life = smoke.life[i];
    if (life <= 0) {
      if (smoke.alpha[i] !== 0 || smoke.size[i] !== 0) { smoke.alpha[i] = 0; smoke.size[i] = 0; mesh.setMatrixAt(i, _m4.makeScale(0, 0, 0)); }
      continue;
    }
    live++;
    const age = smoke.age[i] + dt;
    smoke.age[i] = age;
    const t = age / life;
    if (t >= 1) { smoke.life[i] = 0; smoke.alpha[i] = 0; smoke.size[i] = 0; mesh.setMatrixAt(i, _m4.makeScale(0, 0, 0)); continue; }
    const k = Math.exp(-smoke.drag[i] * dt);
    smoke.vx[i] *= k; smoke.vz[i] *= k;
    smoke.vy[i] = smoke.vy[i] * k + smoke.lift[i] * dt;
    smoke.x[i] += smoke.vx[i] * dt;
    smoke.y[i] = Math.max(smoke.floor[i], smoke.y[i] + smoke.vy[i] * dt);
    smoke.z[i] += smoke.vz[i] * dt;
    const grow = 1 - (1 - t) * (1 - t);
    const size = smoke.s0[i] + (smoke.s1[i] - smoke.s0[i]) * grow;
    smoke.size[i] = size;
    smoke.alpha[i] = smoke.a0[i] * Math.min(1, t * 8) * (1 - t) * (1 - t * 0.3);
    _p.set(smoke.x[i], smoke.y[i], smoke.z[i]);
    _s.set(size, size, size);
    mesh.setMatrixAt(i, _m4.compose(_p, _camQ, _s));
  }
  mesh.instanceMatrix.needsUpdate = true;
  smoke.alphaAttr.needsUpdate = true;
  if (smoke.colorDirty) { mesh.instanceColor.needsUpdate = true; smoke.seedAttr.needsUpdate = true; smoke.glowAttr.needsUpdate = true; smoke.colorDirty = false; }
  smoke.dirty = live > 0;
}

// --- sparks (additive streaks) --------------------------------------------------------

const spark = { lines: null, pos: null, col: null, x: null, y: null, z: null, vx: null, vy: null, vz: null, age: null, life: null, next: 0, dirty: false };

function initSparks(scene) {
  const n = SPARK_MAX;
  spark.pos = new Float32Array(n * 6);
  spark.col = new Float32Array(n * 6);
  for (const k of ['x', 'y', 'z', 'floor', 'vx', 'vy', 'vz', 'age', 'life']) spark[k] = new Float32Array(n);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(spark.pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('color', new THREE.BufferAttribute(spark.col, 3).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: true });
  spark.lines = new THREE.LineSegments(geo, mat);
  spark.lines.frustumCulled = false;
  spark.lines.matrixAutoUpdate = false;
  spark.lines.renderOrder = 3;
  spark.lines.name = 'fx-sparks';
  scene.add(spark.lines);
}

// Surface under a freshly spawned particle (y is the height), so bits from
// a crash on a viaduct land on the deck instead of the street below.
function floorUnder(x, y, z) {
  return fxMap && fxMap.elev && fxMap.elev.has ? fxMap.groundHeightAt(x, z, y) : 0;
}

// On landing: a bit that flew off a deck edge keeps falling to what's below.
function dropFloor(x, z, floor) {
  if (!fxMap || !fxMap.elev || !fxMap.elev.has || floor <= 0.05) return floor;
  return fxMap.groundHeightAt(x, z, floor);
}

function spawnSpark(x, y, z, vx, vy, vz, life, floor = floorUnder(x, y, z)) {
  const i = spark.next;
  spark.next = (i + 1) % SPARK_MAX;
  spark.x[i] = x; spark.y[i] = y; spark.z[i] = z; spark.floor[i] = floor;
  spark.vx[i] = vx; spark.vy[i] = vy; spark.vz[i] = vz;
  spark.age[i] = 0; spark.life[i] = life;
  spark.dirty = true;
}

function updateSparks(dt) {
  if (!spark.dirty) return;
  const p = spark.pos, c = spark.col;
  let live = 0;
  for (let i = 0; i < SPARK_MAX; i++) {
    const o = i * 6;
    if (spark.life[i] <= 0) {
      if (c[o] !== 0) for (let k = 0; k < 6; k++) { c[o + k] = 0; p[o + k] = 0; }
      continue;
    }
    live++;
    const age = spark.age[i] + dt;
    spark.age[i] = age;
    const t = age / spark.life[i];
    if (t >= 1) { spark.life[i] = 0; for (let k = 0; k < 6; k++) { c[o + k] = 0; p[o + k] = 0; } continue; }
    spark.vy[i] -= GRAVITY * dt;
    spark.x[i] += spark.vx[i] * dt;
    spark.y[i] += spark.vy[i] * dt;
    spark.z[i] += spark.vz[i] * dt;
    if (spark.y[i] < spark.floor[i] + 0.02) {
      const f = dropFloor(spark.x[i], spark.z[i], spark.floor[i]);
      if (f < spark.floor[i] - 0.3) spark.floor[i] = f;
    }
    if (spark.y[i] < spark.floor[i] + 0.02) {
      spark.y[i] = spark.floor[i] + 0.02;
      spark.vy[i] = -spark.vy[i] * 0.35;
      spark.vx[i] *= 0.7; spark.vz[i] *= 0.7;
    }
    const tail = 0.035;
    p[o] = spark.x[i]; p[o + 1] = spark.y[i]; p[o + 2] = spark.z[i];
    p[o + 3] = spark.x[i] - spark.vx[i] * tail; p[o + 4] = spark.y[i] - spark.vy[i] * tail; p[o + 5] = spark.z[i] - spark.vz[i] * tail;
    const hot = 1 - t;
    c[o] = 1.6 * hot; c[o + 1] = (1.1 - t * 0.8) * hot; c[o + 2] = 0.45 * hot * hot;
    c[o + 3] = 0.9 * hot; c[o + 4] = 0.35 * hot; c[o + 5] = 0.05 * hot;
  }
  const g = spark.lines.geometry.attributes;
  g.position.needsUpdate = true;
  g.color.needsUpdate = true;
  spark.dirty = live > 0;
}

// --- debris (instanced chunks + bumper panels) ------------------------------------------

function makeDebrisPool(scene, geometry, max, name) {
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.15, flatShading: true });
  const mesh = new THREE.InstancedMesh(geometry, mat, max);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.setColorAt(0, new THREE.Color(1, 1, 1));
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.name = name;
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < max; i++) mesh.setMatrixAt(i, zero);
  scene.add(mesh);
  const pool = { mesh, max, next: 0, active: 0 };
  for (const k of ['x', 'y', 'z', 'floor', 'vx', 'vy', 'vz', 'rx', 'ry', 'rz', 'wx', 'wy', 'wz', 'sx', 'sy', 'sz', 'age', 'life']) pool[k] = new Float32Array(max);
  pool.rest = new Uint8Array(max);
  return pool;
}

let chunks = null;
let panels = null;
const _m4 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

function spawnDebris(pool, x, y, z, vx, vy, vz, sx, sy, sz, color, life, floor = floorUnder(x, y, z)) {
  const i = pool.next;
  pool.next = (i + 1) % pool.max;
  pool.x[i] = x; pool.y[i] = y; pool.z[i] = z; pool.floor[i] = floor;
  pool.vx[i] = vx; pool.vy[i] = vy; pool.vz[i] = vz;
  pool.rx[i] = Math.random() * 6; pool.ry[i] = Math.random() * 6; pool.rz[i] = Math.random() * 6;
  pool.wx[i] = rand(-12, 12); pool.wy[i] = rand(-12, 12); pool.wz[i] = rand(-12, 12);
  pool.sx[i] = sx; pool.sy[i] = sy; pool.sz[i] = sz;
  pool.age[i] = 0; pool.life[i] = life; pool.rest[i] = 0;
  pool.mesh.setColorAt(i, _c.setHex(color));
  pool.mesh.instanceColor.needsUpdate = true;
}

function updateDebris(pool, dt) {
  let any = false;
  for (let i = 0; i < pool.max; i++) {
    if (pool.life[i] <= 0) continue;
    any = true;
    const age = pool.age[i] + dt;
    pool.age[i] = age;
    if (age >= pool.life[i]) {
      pool.life[i] = 0;
      pool.mesh.setMatrixAt(i, _m4.makeScale(0, 0, 0));
      continue;
    }
    const half = pool.sy[i] * 0.5;
    if (!pool.rest[i]) {
      pool.vy[i] -= GRAVITY * dt;
      pool.x[i] += pool.vx[i] * dt;
      pool.y[i] += pool.vy[i] * dt;
      pool.z[i] += pool.vz[i] * dt;
      pool.rx[i] += pool.wx[i] * dt; pool.ry[i] += pool.wy[i] * dt; pool.rz[i] += pool.wz[i] * dt;
      if (pool.y[i] < pool.floor[i] + half) {
        const f = dropFloor(pool.x[i], pool.z[i], pool.floor[i]);
        if (f < pool.floor[i] - 0.3) pool.floor[i] = f;
      }
      if (pool.y[i] < pool.floor[i] + half) {
        pool.y[i] = pool.floor[i] + half;
        pool.vy[i] = -pool.vy[i] * 0.32;
        pool.vx[i] *= 0.55; pool.vz[i] *= 0.55;
        pool.wx[i] *= 0.5; pool.wy[i] *= 0.5; pool.wz[i] *= 0.5;
        if (Math.abs(pool.vy[i]) < 0.6 && Math.hypot(pool.vx[i], pool.vz[i]) < 0.4) {
          pool.rest[i] = 1;
          pool.rx[i] = Math.round(pool.rx[i] / (Math.PI / 2)) * (Math.PI / 2);
          pool.rz[i] = Math.round(pool.rz[i] / (Math.PI / 2)) * (Math.PI / 2);
        }
      }
    }
    const remain = pool.life[i] - age;
    const k = remain < 1 ? remain : 1;
    _e.set(pool.rx[i], pool.ry[i], pool.rz[i]);
    _q.setFromEuler(_e);
    _p.set(pool.x[i], pool.y[i] - (1 - k) * half, pool.z[i]);
    _s.set(pool.sx[i] * k, pool.sy[i] * k, pool.sz[i] * k);
    pool.mesh.setMatrixAt(i, _m4.compose(_p, _q, _s));
  }
  if (any || pool.active) pool.mesh.instanceMatrix.needsUpdate = true;
  pool.active = any ? 1 : 0;
}

// --- per-vehicle effects ---------------------------------------------------------------------

const PAINT_FALLBACK = 0x8a8e92;

function paintOf(v) {
  if (v.isPolice) return 0xeceae4;
  const c = v.model && v.model.color;
  if (typeof c === 'string') { _c.set(c); return _c.getHex(); }
  return typeof c === 'number' ? c : PAINT_FALLBACK;
}

function isPaved(s) { return s !== 'gras'; }

function vehicleSlip(v, dt, abs) {
  const prev = v._fxPrevSpeed === undefined ? abs : v._fxPrevSpeed;
  const dec = dt > 0 ? (prev - abs) / dt : 0;
  v._fxPrevSpeed = abs;
  v._fxDec = dec;
  let target = 0;
  const lat = Math.hypot(v.driftX || 0, v.driftY || 0);
  if (lat > 1.2) target = Math.min(1, (lat - 1.2) / 4);
  const spin = Math.abs(v.yawVel || 0) * v.model.len * 0.5;
  if (spin > 1.5) target = Math.max(target, Math.min(1, (spin - 1.5) / 4));
  if (abs > 5 && dec > 11) target = Math.max(target, Math.min(0.85, 0.35 + (dec - 11) / 10));
  if (v.driver === 'player') {
    if (v.handbrake && abs > 9 && Math.abs(v.steer) > 0.3) target = Math.max(target, 0.75);
    else if (v.handbrake && abs > 4) target = Math.max(target, 0.45);
    if (v.throttle > 0 && v.handbrake && abs < 6) {
      target = Math.max(target, 0.85);
      v._burnout = true;
    } else v._burnout = false;
    if (v.throttle > 0 && !v.handbrake) {
      if (abs < 0.6) v._launchT = 0.7;
    } else if (!v.throttle) v._launchT = 0;
    if (v._launchT > 0) {
      v._launchT -= dt;
      target = Math.max(target, 0.5 * (1 - abs / 9));
    }
  }
  if (v.isBike || v.isScooter) target *= 0.6;
  const slip = v.slip || 0;
  v.slip = slip + (target - slip) * Math.min(1, dt * (target > slip ? 14 : 6));
  if (v.slip < 0.01) v.slip = 0;
  return v.slip;
}

function spawnCount(rate, dt) {
  const n = rate * dt;
  const whole = Math.floor(n);
  return whole + (Math.random() < n - whole ? 1 : 0);
}

function vehicleFx(v, world, dt) {
  const abs = Math.abs(v.speed);
  const slip = vehicleSlip(v, dt, abs);
  v._surfT = (v._surfT || 0) - dt;
  if (v._surfT <= 0 || !v.surface) {
    v._surfT = v.driver === 'player' ? 0.15 : 0.5;
    v.surface = surfaceUnder(world.map, v.x, v.y);
  }
  const mesh = getVehicleMesh(v.id);
  if (!mesh || v.isBoat) return;
  const wheels = mesh.userData.wheels;
  if (!wheels) return;
  const ca = Math.cos(v.angle), sa = Math.sin(v.angle);
  const vx = ca * v.speed + (v.driftX || 0), vy = sa * v.speed + (v.driftY || 0);
  const paved = isPaved(v.surface);
  const small = v.isBike || v.isScooter;
  const halfW = small ? 0.03 : v.isBus ? 0.16 : 0.1;
  const rain = world.weather ? world.weather.intensity || 0 : 0;
  const n = Math.min(4, wheels.length);
  const vz = v.z || 0;
  const braking = abs > 5 && v._fxDec > 11;
  for (let i = 0; i < n; i++) {
    const w = wheels[i];
    if (w.parent !== mesh) continue;
    const lx = w.position.x, lz = w.position.z;
    const wx = v.x + lx * ca - lz * sa, wy = v.y + lx * sa + lz * ca;
    const rear = lx < 0;
    const marks = paved && slip > 0.28 && (rear || braking || slip > 0.6) ? slip : 0;
    skidWheel(v, i, wx, wy, halfW, marks);
    if (small) continue;
    if (rear && paved && slip > 0.42 && (abs > 1.5 || v._burnout)) {
      const cnt = spawnCount(slip * 15, dt);
      for (let k = 0; k < cnt; k++) {
        spawnSmoke(wx + rand(-0.2, 0.2), vz + 0.25, wy + rand(-0.2, 0.2), vx * 0.25 + rand(-1.6, 1.6), rand(0.3, 0.9), vy * 0.25 + rand(-1.6, 1.6),
          rand(1.4, 2.2), 0.4, rand(1.6, 2.6), 0.92, 0.92, 0.91, 0.32 * slip + 0.1, 0.9, 0.45);
      }
    }
    if (rear && !paved && (abs > 3 || slip > 0.3)) {
      const cnt = spawnCount(abs * 0.9 + slip * 18, dt);
      for (let k = 0; k < cnt; k++) {
        spawnSmoke(wx - ca * 0.3, vz + 0.2, wy - sa * 0.3, -vx * 0.15 + rand(-0.6, 0.6), rand(0.3, 0.9), -vy * 0.15 + rand(-0.6, 0.6),
          rand(1.1, 1.8), 0.4, rand(1.6, 2.4), 0.52, 0.44, 0.32, 0.32, 1.6, 0.1);
      }
    }
    if (rear && paved && rain > 0.15 && abs > 5) {
      const cnt = spawnCount(rain * abs * 1.6, dt);
      for (let k = 0; k < cnt; k++) {
        spawnSmoke(wx - ca * 0.35, vz + 0.15, wy - sa * 0.35, vx * 0.35 - ca * 1.5 + rand(-0.5, 0.5), rand(0.8, 1.8), vy * 0.35 - sa * 1.5 + rand(-0.5, 0.5),
          rand(0.45, 0.8), 0.25, rand(0.9, 1.4), 0.8, 0.84, 0.87, 0.2 * rain + 0.05, 2.5, -3);
      }
    }
  }
  if (small) return;

  const parts = vehicleDamageParts(mesh);
  const hl = parts ? parts.hl : v.model.len / 2, hw = parts ? parts.hw : v.model.wid / 2;
  if (v.driver === 'player' || (v._fxWasStill && abs > 0.6)) {
    const launching = v.driver === 'player' && v.throttle > 0 && abs < 5 && !v.handbrake;
    const rate = launching ? 16 : v._fxWasStill && abs > 0.6 ? 30 : v.driver === 'player' && abs < 0.5 ? 2.5 : 0;
    const cnt = spawnCount(rate, dt) + (v._fxWasStill && abs > 0.6 ? 2 : 0);
    const ex = -hl - 0.1, ez = hw * 0.55;
    const px = v.x + ex * ca - ez * sa, py = v.y + ex * sa + ez * ca;
    for (let k = 0; k < cnt; k++) {
      spawnSmoke(px, vz + 0.28, py, -ca * 1.2 + vx * 0.5 + rand(-0.2, 0.2), rand(0.1, 0.35), -sa * 1.2 + vy * 0.5 + rand(-0.2, 0.2),
        rand(0.7, 1.2), 0.15, rand(0.7, 1.1), 0.3, 0.3, 0.31, launching ? 0.3 : 0.14, 2, 0.35);
    }
  }
  v._fxWasStill = abs < 0.3;

  if (v.health < 40 && !v.wrecked) {
    const k = 1 - Math.max(0, v.health) / 40;
    const cnt = spawnCount(5 + k * 14, dt);
    const fx = hl - 0.55;
    const hood = (parts ? parts.hood : 0.85) + 0.05 + vz;
    for (let j = 0; j < cnt; j++) {
      const oz = rand(-hw * 0.5, hw * 0.5);
      const shade = 0.62 - k * 0.55;
      spawnSmoke(v.x + fx * ca - oz * sa, hood, v.y + fx * sa + oz * ca, vx * 0.3 + rand(-0.3, 0.3), rand(0.8, 1.4), vy * 0.3 + rand(-0.3, 0.3),
        rand(1.8, 2.8), 0.35, rand(1.8, 2.8) + k, shade, shade, shade * 1.02, 0.28 + k * 0.3, 0.9, 0.45);
    }
  }
}

// Burnt-out wrecks keep smoking: a thick black column at first that thins
// to a lazy grey wisp, but never stops entirely.
function wreckSmoke(v, world, dt) {
  if (v.sinking || v.isBoat) return;
  const age = v.wreckedAt === undefined ? 60 : world.time - v.wreckedAt;
  const k = Math.max(0, 1 - age / 60);
  const cnt = spawnCount(v.isBike || v.isScooter ? 1.5 : 3 + k * 16, dt);
  const shade = 0.12 + (1 - k) * 0.3;
  for (let j = 0; j < cnt; j++) {
    spawnSmoke(v.x + rand(-0.5, 0.5), (v.z || 0) + 0.9, v.y + rand(-0.5, 0.5), rand(-0.25, 0.25), rand(1.0, 1.6) + k, rand(-0.25, 0.25),
      rand(2.2, 3.2) + k * 1.5, 0.4, rand(2.6, 3.6) + k * 2, shade, shade, shade * 1.02, 0.22 + k * 0.35, 1.2, 0.5);
  }
}

// --- explosions ----------------------------------------------------------------------------------

// Everything a car explosion throws out of the shared pools: a boiling black
// smoke column, burnt panels and glass, a shower of sparks and a scorch mark
// (dark skid quads fanned into a blotch, fading like the tyre marks).
export function spawnExplosionFx(x, y, z, color, scale = 1) {
  if (!ready) return;
  const paint = typeof color === 'string' ? (_c.set(color), _c.getHex()) : typeof color === 'number' ? color : PAINT_FALLBACK;
  for (let k = 0; k < Math.round(26 * scale); k++) {
    const a = Math.random() * Math.PI * 2, r = rand(0.5, 3.5) * scale;
    const dark = rand(0.05, 0.16);
    spawnSmoke(x + Math.cos(a) * r * 0.4, z + rand(0.6, 2.2), y + Math.sin(a) * r * 0.4, Math.cos(a) * r, rand(1.5, 4.5), Math.sin(a) * r,
      rand(3.5, 6.5), rand(1.2, 2), rand(4.5, 7.5) * scale, dark, dark, dark * 1.05, rand(0.55, 0.8), 1.1, 0.8);
  }
  for (let k = 0; k < 10; k++) {
    const a = Math.random() * Math.PI * 2;
    spawnSmoke(x + rand(-0.6, 0.6), z + rand(0.3, 1.2), y + rand(-0.6, 0.6), Math.cos(a) * rand(3, 7), rand(0.2, 1.2), Math.sin(a) * rand(3, 7),
      rand(1.5, 2.6), 0.8, rand(3, 4.5), 0.42, 0.38, 0.34, 0.4, 2.2, 0.1);
  }
  for (let k = 0; k < Math.min(40, Math.round(34 * scale)); k++) {
    const a = Math.random() * Math.PI * 2, sp = rand(5, 16);
    spawnSpark(x, z + rand(0.4, 1.4), y, Math.cos(a) * sp, rand(3, 11), Math.sin(a) * sp, rand(0.5, 1.2), z);
  }
  for (let k = 0; k < Math.round(22 * scale); k++) {
    const a = Math.random() * Math.PI * 2, sp = rand(3, 11);
    const roll = Math.random();
    const col = roll < 0.35 ? 0x161616 : roll < 0.6 ? 0x2c2a28 : roll < 0.8 ? paint : 0x9fb4ba;
    const sz = roll >= 0.8 ? rand(0.04, 0.08) : rand(0.1, 0.26);
    spawnDebris(chunks, x + rand(-0.5, 0.5), z + rand(0.5, 1.3), y + rand(-0.5, 0.5), Math.cos(a) * sp, rand(4, 11), Math.sin(a) * sp,
      sz, sz * rand(0.3, 0.7), sz * rand(0.8, 1.5), col, rand(14, 22), z);
  }
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI + Math.random() * 0.4, r = rand(2, 3.2) * scale;
    const ca = Math.cos(a) * r, sa = Math.sin(a) * r;
    const q = [[x - ca - sa * 0.6, y - sa + ca * 0.6], [x - ca + sa * 0.6, y - sa - ca * 0.6], [x + ca - sa * 0.6, y + sa + ca * 0.6], [x + ca + sa * 0.6, y + sa - ca * 0.6]];
    const h = q.map(([qx, qy]) => skidSurface(qx, qy, z));
    writeSkidQuad(q[0][0], q[0][1], h[0], q[1][0], q[1][1], h[1], q[2][0], q[2][1], h[2], q[3][0], q[3][1], h[3], 0.42);
  }
}

// --- contacts: sparks, debris, dents -----------------------------------------------------------

function nearPlayer(world, x, y, r) {
  const p = world.player;
  const dx = x - p.x, dy = y - p.y;
  return dx * dx + dy * dy < r * r;
}

// Parts that came loose with this hit (vehicledamage.js, #205) fly off as small bits of trim.
const PART_SPOT = { grille: [0.5, 0], spiegels: [0.15, 1], sierdoppen: [0, 1], uitlaat: [-0.5, 0.3] };
const PART_COLOR = { grille: 0x2b2b2b, spiegels: 0x1d1e20, sierdoppen: 0xb9bec4, uitlaat: 0x6a6d70 };
function looseParts(v, ids, ca, sa) {
  for (const id of ids) {
    const [fx, side] = PART_SPOT[id] || [0, 0];
    for (let k = 0; k < (id === 'sierdoppen' ? 2 : 1); k++) {
      const sgn = side ? (k % 2 ? -1 : 1) : 0;
      const lx = fx * v.model.len, lz = sgn * v.model.wid * 0.5;
      const bx = v.x + lx * ca - lz * sa, by = v.y + lx * sa + lz * ca;
      const out = sgn ? 2 : 0.6;
      spawnDebris(chunks, bx, 0.7 + (v.z || 0), by, -sa * sgn * out + rand(-1, 1), rand(1.5, 3), ca * sgn * out + rand(-1, 1), 0.16, 0.1, 0.12, PART_COLOR[id] || 0x2b2b2b, rand(14, 20), v.z || 0);
    }
  }
}

// Een fiets krijgt geen deuken maar een logboek van klappen (v.dentLog): vanaf een bepaalde sterkte voorop is het voorspatbord scheef en
// het voorlicht los (studentenfiets.js, vehicledamage.js fietsStaat); het frame wordt dan door de variant met die afwijking vervangen.
function dentBike(v, x, y, strength) {
  if (!(strength > 0.05) || simTime - (v._dentT || -1) < 0.12) return;
  v._dentT = simTime;
  const dx = x - v.x, dy = y - v.y;
  const ca = Math.cos(v.angle), sa = Math.sin(v.angle);
  if (!v.dentLog) v.dentLog = [];
  v.dentLog.push([dx * ca + dy * sa, -dx * sa + dy * ca, Math.min(1, strength)]);
  if (v.dentLog.length > 12) v.dentLog.shift();
  const mesh = getVehicleMesh(v.id);
  if (mesh) updateBikeStaat(mesh, v);
}

function dentVehicle(v, x, y, strength, world) {
  if (v.isBike && !v.wrecked && !v.model.fat) { dentBike(v, x, y, strength); return; }
  if (v.wrecked || v.isBike || v.isScooter || v.isBoat) return;
  if (simTime - (v._dentT || -1) < 0.12) return;
  v._dentT = simTime;
  const mesh = getVehicleMesh(v.id);
  if (!mesh) return;
  const dx = x - v.x, dy = y - v.y;
  const ca = Math.cos(v.angle), sa = Math.sin(v.angle);
  const lx = dx * ca + dy * sa, lz = -dx * sa + dy * ca;
  const before = v.dentLog ? v.dentLog.map((d) => d.slice()) : [];
  const dropped = applyVehicleDamage(mesh, v, lx, lz, strength);
  looseParts(v, nieuwLos(before, v.dentLog, v.model.len, v.model.wid), ca, sa);
  if (!dropped) return;
  const parts = vehicleDamageParts(mesh);
  const part = parts[dropped];
  const bx = v.x + part.x * ca, by = v.y + part.x * sa;
  const vx = ca * v.speed + (v.driftX || 0), vy = sa * v.speed + (v.driftY || 0);
  spawnDebris(panels, bx, part.y + (v.z || 0), by, vx * 0.6 + rand(-1, 1), rand(1.5, 3), vy * 0.6 + rand(-1, 1), 0.12, 0.14, parts.hw * 2 - 0.04, parts.bumperColor, rand(16, 22), v.z || 0);
  const i = (panels.next + panels.max - 1) % panels.max;
  panels.ry[i] = -v.angle; panels.rx[i] = 0; panels.rz[i] = rand(-0.3, 0.3);
  panels.wx[i] = rand(-2, 2); panels.wy[i] = rand(-1.5, 1.5); panels.wz[i] = rand(-4, 4);
}

function burstAt(c, world) {
  const a = c.a, b = c.b;
  const strength = Math.min(1, c.impact / 14);
  const ax = Math.cos(a.angle) * a.speed + (a.driftX || 0), ay = Math.sin(a.angle) * a.speed + (a.driftY || 0);
  const base = a.z || 0;
  const h = 0.45 + base;
  if (c.slide > 3 && (!b || (!b.isBike && !b.isScooter)) && !a.isBike && !a.isScooter && !a.isBoat) {
    const cnt = Math.min(7, Math.floor(c.slide * 0.45 + Math.random() * 2));
    const tx = -c.ny, ty = c.nx;
    const sgn = ax * tx + ay * ty > 0 ? 1 : -1;
    for (let k = 0; k < cnt; k++) {
      const s = rand(0.3, 0.8) * c.slide;
      spawnSpark(c.x, base + rand(0.25, 0.55), c.y, tx * sgn * s - c.nx * rand(0, 1.5) + rand(-1, 1), rand(0.5, 2.6), ty * sgn * s - c.ny * rand(0, 1.5) + rand(-1, 1), rand(0.25, 0.55), base);
    }
  }
  if (c.impact < 3) return;
  const small = a.isBike || a.isScooter || (b && (b.isBike || b.isScooter));
  const nSpark = small ? 3 : Math.min(28, Math.floor(6 + c.impact * 1.4));
  for (let k = 0; k < nSpark; k++) {
    const sp = rand(2, 5 + strength * 7);
    const ang = Math.random() * Math.PI * 2;
    spawnSpark(c.x, h + rand(-0.15, 0.2), c.y, Math.cos(ang) * sp - c.nx * sp * 0.6, rand(1.2, 4 + strength * 3), Math.sin(ang) * sp - c.ny * sp * 0.6, rand(0.3, 0.75), base);
  }
  const nChunk = Math.min(18, Math.floor(3 + strength * 16));
  const paintA = paintOf(a), paintB = b ? paintOf(b) : paintA;
  for (let k = 0; k < nChunk; k++) {
    const roll = Math.random();
    const glass = strength > 0.3 && roll < 0.4;
    const color = glass ? 0xb4cdd4 : roll < 0.7 ? (Math.random() < 0.5 ? paintA : paintB) : 0x1d1e20;
    const sz = glass ? rand(0.03, 0.06) : rand(0.05, 0.12) * (small ? 0.6 : 1);
    const sp = rand(1.5, 3.5 + strength * 4);
    const ang = Math.random() * Math.PI * 2;
    spawnDebris(chunks, c.x + rand(-0.2, 0.2), h + rand(0, 0.3), c.y + rand(-0.2, 0.2),
      Math.cos(ang) * sp + ax * 0.35, rand(1.5, 3.5 + strength * 2), Math.sin(ang) * sp + ay * 0.35,
      sz, sz * rand(0.35, 0.8), sz * rand(0.7, 1.3), color, rand(9, 14), base);
  }
  const puffs = Math.floor(2 + strength * 5);
  for (let k = 0; k < puffs; k++) {
    spawnSmoke(c.x + rand(-0.3, 0.3), base + 0.4, c.y + rand(-0.3, 0.3), rand(-1, 1), rand(0.3, 1), rand(-1, 1),
      rand(0.9, 1.5), 0.4, rand(1.4, 2.2), 0.6, 0.58, 0.55, 0.25 + strength * 0.2, 2.2, 0.2);
  }
  if (c.impact > 3.5) {
    dentVehicle(a, c.x, c.y, strength, world);
    if (b) dentVehicle(b, c.x, c.y, strength, world);
  }
}

function consumeContacts(world) {
  const vc = vehicleContacts;
  if (vc.head - contactCursor > vc.cap) contactCursor = vc.head - vc.cap;
  for (; contactCursor < vc.head; contactCursor++) {
    const c = vc.list[contactCursor % vc.cap];
    if (!c.a || !nearPlayer(world, c.x, c.y, FX_RANGE)) continue;
    burstAt(c, world);
  }
}

// --- horse droppings -----------------------------------------------------------------------------
// A police horse now and then leaves a small heap behind it; the heaps shrink
// away after a minute and never number more than DROP_MAX.

const DROP_MAX = 10;
const DROP_LIFE = 70;
const DROP_FADE = 8;
const drops = [];
let dropScene = null;
let dropGeo = null, dropMat = null;

function addDropping(x, y, z, angle) {
  if (!dropScene) return;
  if (!dropGeo) {
    const parts = [[0, 0.07, 0, 0.13], [0.12, 0.05, 0.06, 0.09], [-0.1, 0.05, 0.08, 0.1], [0.03, 0.14, -0.04, 0.08]];
    const geos = parts.map(([px, py, pz, r]) => new THREE.IcosahedronGeometry(r, 0).translate(px, py, pz));
    dropGeo = mergeGeos(geos);
    dropMat = new THREE.MeshLambertMaterial({ color: 0x4a3420 });
  }
  const m = new THREE.Mesh(dropGeo, dropMat);
  m.position.set(x, z + 0.02, y);
  m.rotation.y = angle;
  m.name = 'horse-dropping';
  dropScene.add(m);
  drops.push({ m, age: 0 });
  if (drops.length > DROP_MAX) { const o = drops.shift(); dropScene.remove(o.m); }
}

function mergeGeos(list) {
  const pos = [], idx = [];
  let base = 0;
  for (const g of list) {
    const gi = g;
    const pa = gi.attributes.position;
    for (let i = 0; i < pa.count; i++) pos.push(pa.getX(i), pa.getY(i), pa.getZ(i));
    if (gi.index) for (let i = 0; i < gi.index.count; i++) idx.push(gi.index.getX(i) + base);
    else for (let i = 0; i < pa.count; i++) idx.push(base + i);
    base += pa.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setIndex(idx);
  out.computeVertexNormals();
  return out;
}

function horseDroppings(v, dt) {
  if (v._mount !== 'horse' || v.wrecked || v.driver === 'player') return;
  if (v._dropIn === undefined) v._dropIn = 20 + Math.random() * 50;
  v._dropIn -= dt;
  if (v._dropIn > 0) return;
  if (Math.abs(v.speed || 0) > 3) { v._dropIn = 2; return; }
  v._dropIn = 40 + Math.random() * 80;
  addDropping(v.x - Math.cos(v.angle) * 1.3, v.y - Math.sin(v.angle) * 1.3, v.z || 0, Math.random() * 6.28);
}

function updateDroppings(dt) {
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    d.age += dt;
    if (d.age > DROP_LIFE) { dropScene.remove(d.m); drops.splice(i, 1); continue; }
    const k = d.age > DROP_LIFE - DROP_FADE ? (DROP_LIFE - d.age) / DROP_FADE : 1;
    d.m.scale.setScalar(Math.max(0.05, k));
  }
}

// --- entry ---------------------------------------------------------------------------------------

function init(scene) {
  initSkids(scene);
  initSmoke(scene);
  initSparks(scene);
  chunks = makeDebrisPool(scene, new THREE.IcosahedronGeometry(0.62, 0), CHUNK_MAX, 'fx-debris');
  panels = makeDebrisPool(scene, new THREE.BoxGeometry(1, 1, 1), PANEL_MAX, 'fx-panels');
  contactCursor = vehicleContacts.head;
  dropScene = scene;
  ready = true;
}

export function updateFx3D(dt, world, scene) {
  if (!scene) return;
  if (!ready) init(scene);
  fxMap = world.map;
  if (world.paused) dt = 0;
  simTime += dt;
  pruneTimer -= dt;
  if (pruneTimer <= 0) { pruneTimer = 1; pruneVehicleMeshes(); }
  if (dt > 0) {
    consumeContacts(world);
    const vs = world.vehicles;
    for (let i = 0; i < vs.length; i++) {
      const v = vs[i];
      if (!nearPlayer(world, v.x, v.y, FX_RANGE)) continue;
      if (v.wrecked) wreckSmoke(v, world, dt);
      else { vehicleFx(v, world, dt); if (v._mount) horseDroppings(v, dt); }
    }
  }
  updateSkidFade(dt);
  updateSmoke(dt);
  updateSparks(dt);
  updateDroppings(dt);
  updateDebris(chunks, dt);
  updateDebris(panels, dt);
}
