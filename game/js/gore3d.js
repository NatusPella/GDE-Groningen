import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getSettings, onSettingsChange } from './settings.js';
import { isInWater, pointInPolygon, WATER_Y } from './util.js';
import { personPalette } from './models3d_people.js';
import { getVehicleMesh } from './models3d_vehicles.js';
import { markShared } from './pixelart3d.js';
import { spawnFxPuff } from './fx3d.js';
import { inPassage } from './collision.js';
import { rand } from './rng.js';

// Carmageddon-style gore behind the "Bloed en ledematen" setting: people hit
// hard enough burst into chunky body parts, blood sprays and splats on the
// road and on the car, and the dead bleed a pool. Gameplay code calls
// splatterPed / bleedPed / bloodSpray; they only queue work, and
// updateGore3D renders everything from preallocated pools.

export const GIB_SPEED = 12.5; // m/s, 45 km/h

const FX_RANGE = 90;
const CHUNK_MAX = 120;
const DROP_MAX = 320;
const SPLAT_MAX = 150;
const POOL_MAX = 24;
const CAR_MAX = 48;
const CAR_PER_VEHICLE = 8;
const SPLAT_LIFE = 45;
const POOL_LIFE = 70;
const CAR_LIFE = 90;
const FADE = 8;
const GRAVITY = 9.8;
// Ground decal layers stop at -10/-40 (blob shadows), so blood gets its own slot above them.
const OFFSET_FACTOR = -11;
const OFFSET_UNITS = -44;
const DECAL_Y = 0.018;

const BLOOD = 0x8c0a0e;
const BLOOD_POOL = 0x5c0508;
const MEAT = [0xa0161c, 0x7d0d12, 0xc9646a, 0xb8262c];

let scene = null;
let ready = false;
let now = 0;
let frame = 0;
let splatSoundT = 0;
const queue = [];
const bleeders = [];


function goreOn() {
  return getSettings().gore !== false;
}

function hexOf(c, fallback) {
  if (typeof c === 'number') return c;
  if (typeof c === 'string') return parseInt(c.replace('#', ''), 16);
  return fallback;
}

function paletteOf(ped) {
  const shirt = hexOf(ped.clothing, 0xcaa46a), skin = hexOf(ped.skin, 0xe0b48a);
  return personPalette(shirt, skin, ped._lookSeed ?? Math.random() * 1000);
}

function sfx(world, kind, x, y, strength) {
  if (world.audioEvents) world.audioEvents.push({ kind, x, y, strength });
}

// --- gameplay API -----------------------------------------------------------

// Bursts a person into pieces. Returns false when gore is off, in which case
// the caller keeps its normal ragdoll. vx/vy: game-plane launch velocity.
export function splatterPed(ped, world, o = {}) {
  if (!goreOn() || ped.gibbed) return false;
  ped.gibbed = true;
  ped.ragdoll = null;
  ped.knockVX = 0;
  ped.knockVY = 0;
  ped._diedAt = world.time;
  ped.deadUntil = Math.min(ped.deadUntil ?? Infinity, world.time + 1.5);
  queue.push({ kind: 'gib', x: ped.x, y: ped.y, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz ?? 4, vehicle: o.vehicle || null, pal: paletteOf(ped), blast: !!o.blast });
  sfx(world, 'gore', ped.x, ped.y, 1);
  return true;
}

// A body that bleeds out: a pool grows under it once the ragdoll settles.
export function bleedPed(ped, world, o = {}) {
  ped._diedAt = world.time;
  if (!goreOn() || ped.gibbed) return;
  if (bleeders.length > 16) bleeders.shift();
  bleeders.push({ ped, t0: world.time, size: o.size ?? 1 });
  if (o.vehicle) queue.push({ kind: 'car', vehicle: o.vehicle, n: 1 + (Math.random() < 0.6 ? 1 : 0), x: ped.x, y: ped.y });
  if (o.spray) bloodSpray(world, ped.x, ped.y, o.spray.dx || 0, o.spray.dy || 0, o.spray.k ?? 0.5);
}

// Short burst of droplets at (x, y), thrown along (dx, dy); k 0..1.
export function bloodSpray(world, x, y, dx, dy, k = 0.4, h = 1.15) {
  if (!goreOn()) return;
  queue.push({ kind: 'spray', x, y, dx, dy, k, h });
}

// An animal run over. burst: it comes apart like a pedestrian does (small
// animals, or anything hit very fast); otherwise the carcass stays and bleeds
// a pool. size ~ body length in metres, cols: fur/feather colours. Returns
// false when gore is off.
export function splatterAnimal(world, x, y, o = {}) {
  if (!goreOn()) return false;
  queue.push({ kind: 'animal', x, y, vx: o.vx || 0, vy: o.vy || 0, size: o.size ?? 0.5, cols: o.cols || [0x6b5a48], vehicle: o.vehicle || null, burst: !!o.burst });
  sfx(world, o.burst ? 'gore' : 'gore_splat', x, y, Math.min(1, 0.4 + (o.size ?? 0.5) * 0.4));
  return true;
}

// --- pooled render state ----------------------------------------------------

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler(0, 0, 0, 'YXZ');
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

function floatArrays(o, keys, n) { for (const k of keys) o[k] = new Float32Array(n); }

// Flat splat in the XZ plane (normal +Y): a lumpy core, a few spikes and
// satellite droplets. pool = smooth rounded blob instead.
function splatGeometry(seed, pool) {
  let s = seed * 9301 + 49297;
  const R = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const pos = [], idx = [];
  const disc = (cx, cz, r, seg, radius) => {
    const base = pos.length / 3;
    pos.push(cx, 0, cz);
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const rr = radius(a, i) * r;
      pos.push(cx + Math.cos(a) * rr, 0, cz + Math.sin(a) * rr);
    }
    for (let i = 0; i < seg; i++) idx.push(base, base + 1 + ((i + 1) % seg), base + 1 + i);
  };
  const p1 = R() * 6, p2 = R() * 6, p3 = R() * 6;
  if (pool) {
    disc(0, 0, 0.5, 22, (a) => 0.84 + 0.1 * Math.sin(a * 2 + p1) + 0.06 * Math.sin(a * 3 + p2) + 0.04 * Math.sin(a * 5 + p3));
    disc(0.32 * Math.cos(p1), 0.32 * Math.sin(p1), 0.22, 12, () => 1);
  } else {
    const seg = 26;
    const spikes = new Set();
    for (let k = 0; k < 6; k++) spikes.add(Math.floor(R() * seg));
    disc(0, 0, 0.36, seg, (a, i) => (spikes.has(i) ? 1.35 + R() * 0.5 : 0.78 + 0.16 * Math.sin(a * 3 + p1) + 0.08 * Math.sin(a * 7 + p2)));
    for (let k = 0; k < 7; k++) {
      const a = R() * Math.PI * 2, d = 0.42 + R() * 0.45;
      disc(Math.cos(a) * d, Math.sin(a) * d, 0.025 + R() * 0.05, 7, () => 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const nrm = new Float32Array(pos.length);
  for (let i = 1; i < nrm.length; i += 3) nrm[i] = 1;
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

function decalMaterial(color, instanced) {
  const mat = new THREE.MeshStandardMaterial({
    color, roughness: 0.26, metalness: 0, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: OFFSET_FACTOR, polygonOffsetUnits: OFFSET_UNITS,
  });
  if (instanced) {
    mat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aAlpha;\nvarying float vGoreAlpha;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGoreAlpha = aAlpha;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vGoreAlpha;')
        .replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\ndiffuseColor.a *= vGoreAlpha;\nif (diffuseColor.a < 0.01) discard;');
    };
    mat.customProgramCacheKey = () => 'gore-decal';
  }
  return mat;
}

// Ring buffer of ground decals; the oldest is recycled once full.
function makeDecalLayer(geo, max, color, name) {
  const L = { max, next: 0, dirty: false };
  floatArrays(L, ['x', 'z', 'rot', 'size', 'aspect', 'grow', 'birth', 'life', 'a0'], max);
  L.alive = new Uint8Array(max);
  L.alpha = new Float32Array(max);
  L.alphaAttr = new THREE.InstancedBufferAttribute(L.alpha, 1).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aAlpha', L.alphaAttr);
  const mesh = new THREE.InstancedMesh(geo, decalMaterial(color, true), max);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < max; i++) mesh.setMatrixAt(i, ZERO);
  mesh.frustumCulled = false;
  mesh.receiveShadow = true;
  mesh.renderOrder = 1;
  mesh.name = name;
  L.mesh = mesh;
  scene.add(mesh);
  return L;
}

function addDecal(L, x, z, size, o = {}) {
  const i = L.next;
  L.next = (i + 1) % L.max;
  L.x[i] = x; L.z[i] = z;
  L.rot[i] = o.rot ?? Math.random() * Math.PI * 2;
  L.size[i] = size;
  L.aspect[i] = o.aspect ?? rand(0.8, 1.2);
  L.grow[i] = o.grow ?? 0.14;
  L.birth[i] = now;
  L.life[i] = o.life ?? SPLAT_LIFE;
  L.a0[i] = o.alpha ?? rand(0.82, 0.95);
  L.alive[i] = 1;
  writeDecal(L, i, 0.01);
}

function writeDecal(L, i, k) {
  _q.setFromAxisAngle(_Y, L.rot[i]);
  _p.set(L.x[i], DECAL_Y, L.z[i]);
  const s = L.size[i] * k;
  _s.set(s * L.aspect[i], 1, s);
  L.mesh.setMatrixAt(i, _m.compose(_p, _q, _s));
  L.dirty = true;
}

function updateDecals(L) {
  let any = false;
  for (let i = 0; i < L.max; i++) {
    if (!L.alive[i]) continue;
    any = true;
    const t = now - L.birth[i];
    if (t >= L.life[i]) {
      L.alive[i] = 0;
      L.alpha[i] = 0;
      L.mesh.setMatrixAt(i, ZERO);
      L.dirty = true;
      continue;
    }
    const g = L.grow[i];
    if (t < g + 0.05) {
      const u = Math.min(1, t / g);
      // splats pop slightly past full size, pools just ooze outwards
      const k = g < 1 ? 1 - (1 - u) * (1 - u) + Math.sin(u * Math.PI) * 0.12 : 1 - (1 - u) * (1 - u) * (1 - u);
      writeDecal(L, i, Math.max(0.01, k));
    }
    L.alpha[i] = L.a0[i] * Math.min(1, (L.life[i] - t) / FADE);
  }
  if (any || L.dirty) {
    L.alphaAttr.needsUpdate = true;
    if (L.dirty) L.mesh.instanceMatrix.needsUpdate = true;
    L.dirty = false;
  }
}

function clearDecals(L) {
  for (let i = 0; i < L.max; i++) { L.alive[i] = 0; L.alpha[i] = 0; L.mesh.setMatrixAt(i, ZERO); }
  L.mesh.instanceMatrix.needsUpdate = true;
  L.alphaAttr.needsUpdate = true;
}

const _Y = new THREE.Vector3(0, 1, 0);

// --- chunks (body parts, meat, feathers) ------------------------------------

const chunks = { max: CHUNK_MAX, next: 0 };

function chunkMaterial() {
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0, flatShading: true });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aEnd;\nattribute vec2 aStump;\nvarying float vGore;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGore = aEnd < -0.5 ? aStump.x : (aEnd > 0.5 ? aStump.y : 0.0);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vGore;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.26, 0.004, 0.008), vGore);');
  };
  mat.customProgramCacheKey = () => 'gore-chunk';
  return mat;
}

function initChunks() {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const n = geo.attributes.normal;
  const end = new Float32Array(n.count);
  for (let i = 0; i < n.count; i++) end[i] = n.getY(i);
  geo.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
  chunks.stump = new Float32Array(CHUNK_MAX * 2);
  chunks.stumpAttr = new THREE.InstancedBufferAttribute(chunks.stump, 2).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aStump', chunks.stumpAttr);
  floatArrays(chunks, ['x', 'y', 'z', 'vx', 'vy', 'vz', 'rx', 'ry', 'rz', 'wx', 'wy', 'wz', 'sx', 'sy', 'sz', 'age', 'life', 'grav', 'drag', 'drip', 'splats', 'half'], CHUNK_MAX);
  chunks.rest = new Uint8Array(CHUNK_MAX);
  chunks.sink = new Uint8Array(CHUNK_MAX);
  chunks.feather = new Uint8Array(CHUNK_MAX);
  const mesh = new THREE.InstancedMesh(geo, chunkMaterial(), CHUNK_MAX);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.setColorAt(0, _c.setRGB(1, 1, 1));
  mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < CHUNK_MAX; i++) mesh.setMatrixAt(i, ZERO);
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  mesh.name = 'fx-gore-chunks';
  chunks.mesh = mesh;
  chunks.active = false;
  scene.add(mesh);
}

function spawnChunk(x, y, z, vx, vy, vz, sx, sy, sz, color, o = {}) {
  const C = chunks, i = C.next;
  C.next = (i + 1) % C.max;
  C.x[i] = x; C.y[i] = y; C.z[i] = z;
  C.vx[i] = vx; C.vy[i] = vy; C.vz[i] = vz;
  C.rx[i] = Math.random() * 6; C.ry[i] = Math.random() * 6; C.rz[i] = Math.random() * 6;
  const spin = o.spin ?? 13;
  C.wx[i] = rand(-spin, spin); C.wy[i] = rand(-spin, spin); C.wz[i] = rand(-spin, spin);
  C.sx[i] = sx; C.sy[i] = sy; C.sz[i] = sz;
  C.age[i] = 0; C.life[i] = o.life ?? rand(16, 22);
  C.grav[i] = o.grav ?? 1; C.drag[i] = o.drag ?? 0.15;
  C.drip[i] = o.drip ?? 0; C.splats[i] = 0;
  C.rest[i] = 0; C.sink[i] = 0; C.feather[i] = o.feather ? 1 : 0;
  C.stump[i * 2] = o.stumpBottom ?? 0; C.stump[i * 2 + 1] = o.stumpTop ?? 0;
  C.stumpAttr.needsUpdate = true;
  C.mesh.setColorAt(i, _c.setHex(color));
  C.mesh.instanceColor.needsUpdate = true;
}

const _rm = new THREE.Matrix4();
function halfHeight(i) {
  const C = chunks;
  _e.set(C.rx[i], C.ry[i], C.rz[i]);
  _q.setFromEuler(_e);
  const e = _rm.makeRotationFromQuaternion(_q).elements;
  return 0.5 * (Math.abs(e[1]) * C.sx[i] + Math.abs(e[5]) * C.sy[i] + Math.abs(e[9]) * C.sz[i]);
}

function insideBuilding(map, x, z) {
  if (!map || !map.buildingsNear) return false;
  const bs = map.buildingsNear(x, z, 0.5);
  if (!bs) return false;
  for (const b of bs) {
    const [minx, miny, maxx, maxy] = b.bounds;
    if (x < minx || x > maxx || z < miny || z > maxy) continue;
    if (pointInPolygon(x, z, b.pts) && !inPassage(map, b, x, z)) return true;
  }
  return false;
}

function updateChunks(dt, world) {
  const C = chunks;
  if (!C.active) return;
  let any = false;
  const map = world.map;
  for (let i = 0; i < C.max; i++) {
    if (C.life[i] <= 0) continue;
    any = true;
    const age = C.age[i] + dt;
    C.age[i] = age;
    if (age >= C.life[i]) {
      C.life[i] = 0;
      C.mesh.setMatrixAt(i, ZERO);
      continue;
    }
    if (!C.rest[i] && dt > 0) {
      const k = Math.exp(-C.drag[i] * dt);
      C.vx[i] *= k; C.vz[i] *= k;
      if (C.feather[i]) {
        C.vy[i] *= k;
        C.vx[i] += Math.sin(age * 5 + i) * 1.4 * dt;
        C.vz[i] += Math.cos(age * 4.3 + i * 1.7) * 1.4 * dt;
      }
      C.vy[i] -= GRAVITY * C.grav[i] * dt;
      const px = C.x[i], pz = C.z[i];
      C.x[i] += C.vx[i] * dt;
      C.y[i] += C.vy[i] * dt;
      C.z[i] += C.vz[i] * dt;
      C.rx[i] += C.wx[i] * dt; C.ry[i] += C.wy[i] * dt; C.rz[i] += C.wz[i] * dt;
      if ((i + frame) % 3 === 0 && C.y[i] < 12 && insideBuilding(map, C.x[i], C.z[i])) {
        C.x[i] = px; C.z[i] = pz;
        C.vx[i] *= -0.3; C.vz[i] *= -0.3;
      }
      if (C.drip[i] > 0 && age < 1.4 && Math.random() < C.drip[i] * dt * 5) {
        spawnDrop(C.x[i], C.y[i], C.z[i], C.vx[i] * 0.5 + rand(-0.5, 0.5), C.vy[i] * 0.4, C.vz[i] * 0.5 + rand(-0.5, 0.5), rand(0.025, 0.05));
      }
      const half = halfHeight(i);
      if (C.sink[i]) {
        if (C.y[i] < WATER_Y - 1.2) { C.life[i] = 0; C.mesh.setMatrixAt(i, ZERO); continue; }
        if (C.y[i] < WATER_Y) { C.vy[i] = Math.max(C.vy[i], -0.6); C.vx[i] *= 0.9; C.vz[i] *= 0.9; }
      } else if (C.y[i] < half) {
        if (map && isInWater(map, C.x[i], C.z[i])) {
          C.sink[i] = 1;
          C.life[i] = Math.min(C.life[i], age + 4);
          if (!C.feather[i] && world.particles && Math.random() < 0.5) world.particles.push({ kind: 'splash', x: C.x[i], y: C.z[i], until: world.time + 0.8 });
        } else {
          const impact = -C.vy[i];
          C.y[i] = half;
          if (!C.feather[i] && impact > 2.2 && C.splats[i] < 3) {
            C.splats[i]++;
            addDecal(splats, C.x[i], C.z[i], Math.min(0.9, 0.28 + impact * 0.06) * (C.sy[i] > 0.2 ? 1.2 : 0.7), { aspect: rand(0.7, 1.4) });
            if (splatSoundT <= 0) { splatSoundT = 0.12; sfx(world, 'gore_splat', C.x[i], C.z[i], Math.min(1, impact / 8)); }
          }
          C.vy[i] = C.feather[i] ? 0 : -C.vy[i] * 0.3;
          const f = C.feather[i] ? 0.2 : 0.5;
          C.vx[i] *= f; C.vz[i] *= f;
          C.wx[i] *= 0.5; C.wy[i] *= 0.5; C.wz[i] *= 0.5;
          if (C.feather[i] || (Math.abs(C.vy[i]) < 0.6 && Math.hypot(C.vx[i], C.vz[i]) < 0.5)) {
            C.rest[i] = 1;
            const q = Math.PI / 2;
            const long = C.sy[i] > Math.max(C.sx[i], C.sz[i]) * 1.4;
            C.rx[i] = long ? q : Math.round(C.rx[i] / q) * q;
            C.rz[i] = long ? 0 : Math.round(C.rz[i] / q) * q;
            C.y[i] = halfHeight(i);
          }
        }
      }
    }
    const remain = C.life[i] - age;
    const k = remain < 1.2 ? remain / 1.2 : 1;
    _e.set(C.rx[i], C.ry[i], C.rz[i]);
    _q.setFromEuler(_e);
    const half = C.rest[i] ? C.y[i] : 0;
    _p.set(C.x[i], C.y[i] - (1 - k) * half, C.z[i]);
    _s.set(C.sx[i] * k, C.sy[i] * k, C.sz[i] * k);
    C.mesh.setMatrixAt(i, _m.compose(_p, _q, _s));
  }
  C.mesh.instanceMatrix.needsUpdate = true;
  C.active = any;
}

// --- blood droplets ---------------------------------------------------------

const drops = { max: DROP_MAX, next: 0 };

function initDrops() {
  floatArrays(drops, ['x', 'y', 'z', 'vx', 'vy', 'vz', 'size', 'age'], DROP_MAX);
  drops.alive = new Uint8Array(DROP_MAX);
  const mat = new THREE.MeshStandardMaterial({ color: 0xa3121a, roughness: 0.3, metalness: 0, flatShading: true });
  const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), mat, DROP_MAX);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < DROP_MAX; i++) mesh.setMatrixAt(i, ZERO);
  mesh.frustumCulled = false;
  mesh.name = 'fx-gore-drops';
  drops.mesh = mesh;
  drops.active = false;
  scene.add(mesh);
}

function spawnDrop(x, y, z, vx, vy, vz, size) {
  const D = drops, i = D.next;
  D.next = (i + 1) % D.max;
  D.x[i] = x; D.y[i] = y; D.z[i] = z;
  D.vx[i] = vx; D.vy[i] = vy; D.vz[i] = vz;
  D.size[i] = size; D.age[i] = 0;
  D.alive[i] = 1;
  D.active = true;
}

const _dir = new THREE.Vector3();
function updateDrops(dt, world) {
  const D = drops;
  if (!D.active) return;
  let any = false;
  for (let i = 0; i < D.max; i++) {
    if (!D.alive[i]) continue;
    any = true;
    D.age[i] += dt;
    const k = Math.exp(-0.5 * dt);
    D.vx[i] *= k; D.vz[i] *= k;
    D.vy[i] -= GRAVITY * dt;
    D.x[i] += D.vx[i] * dt; D.y[i] += D.vy[i] * dt; D.z[i] += D.vz[i] * dt;
    if (D.y[i] < 0.03 || D.age[i] > 3) {
      D.alive[i] = 0;
      D.mesh.setMatrixAt(i, ZERO);
      if (D.age[i] <= 3 && Math.random() < 0.2 && !(world.map && isInWater(world.map, D.x[i], D.z[i]))) {
        addDecal(splats, D.x[i], D.z[i], D.size[i] * rand(4, 8), { aspect: rand(0.6, 1.5) });
      }
      continue;
    }
    // stretch along the velocity so droplets read as streaks
    const sp = Math.hypot(D.vx[i], D.vy[i], D.vz[i]);
    _p.set(D.x[i], D.y[i], D.z[i]);
    if (sp > 0.5) {
      _dir.set(D.vx[i] / sp, D.vy[i] / sp, D.vz[i] / sp);
      _q.setFromUnitVectors(_Y, _dir);
    } else _q.identity();
    const s = D.size[i];
    _s.set(s, s * (1 + Math.min(2.5, sp * 0.18)), s);
    D.mesh.setMatrixAt(i, _m.compose(_p, _q, _s));
  }
  D.mesh.instanceMatrix.needsUpdate = true;
  D.active = any;
}

// --- blood on vehicles ------------------------------------------------------
// Plain child meshes of the vehicle group (shared, so the vehicle's own
// disposal leaves them alone); a handful of alpha steps covers the fade.

const CAR_ALPHA_STEPS = 5;
const carDecals = [];
let carGeos = null;
let carMats = null;
const raycaster = new THREE.Raycaster();
const _o = new THREE.Vector3();
const _n = new THREE.Vector3();
const _wq = new THREE.Quaternion();
const _ws = new THREE.Vector3();

function initCarDecals() {
  carGeos = [11, 23, 37].map((s) => markShared(splatGeometry(s, false)));
  carMats = [];
  for (let k = 1; k <= CAR_ALPHA_STEPS; k++) {
    const m = decalMaterial(BLOOD, false);
    m.opacity = 0.92 * k / CAR_ALPHA_STEPS;
    carMats.push(markShared(m));
  }
}

function splatVehicle(v, n) {
  if (!v || v.isBoat) return;
  const mesh = getVehicleMesh(v.id);
  if (!mesh) return;
  mesh.updateMatrixWorld(true);
  const ca = Math.cos(v.angle), sa = Math.sin(v.angle);
  const hl = v.halfLen || 2, hw = v.halfWid || 0.9;
  const small = v.isBike || v.isScooter;
  mesh.getWorldQuaternion(_wq);
  mesh.getWorldScale(_ws);
  const invQ = _wq.clone().invert();
  let placed = 0;
  for (let attempt = 0; attempt < n + 3 && placed < n; attempt++) {
    const top = !small && Math.random() < 0.6;
    const lx = top ? rand(hl * 0.05, hl - 0.15) : hl + 1.5;
    const lz = rand(-hw * 0.8, hw * 0.8);
    const ly = top ? 4 : rand(0.35, small ? 0.8 : 1.1);
    _o.set(v.x + lx * ca - lz * sa, ly, v.y + lx * sa + lz * ca);
    _dir.set(top ? 0 : -ca, top ? -1 : 0, top ? 0 : -sa);
    raycaster.set(_o, _dir);
    raycaster.far = 6;
    const hits = raycaster.intersectObject(mesh, true);
    const hit = hits.find((h) => h.object.isMesh && !h.object.userData.goreDecal && h.face);
    if (!hit) continue;
    _n.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
    if (_n.dot(_dir) > 0) _n.negate();
    const d = new THREE.Mesh(carGeos[Math.floor(Math.random() * carGeos.length)], carMats[CAR_ALPHA_STEPS - 1]);
    d.userData.goreDecal = true;
    d.renderOrder = 2;
    _p.copy(hit.point).addScaledVector(_n, 0.012);
    mesh.worldToLocal(_p);
    d.position.copy(_p);
    _q.setFromUnitVectors(_Y, _n);
    d.quaternion.copy(invQ).multiply(_q).multiply(new THREE.Quaternion().setFromAxisAngle(_Y, Math.random() * Math.PI * 2));
    const size = rand(0.35, 0.75) * (small ? 0.5 : 1);
    d.scale.set(size * rand(0.8, 1.3) / (_ws.x || 1), 1, size / (_ws.z || 1));
    mesh.add(d);
    const list = v._goreDecals || (v._goreDecals = []);
    list.push(d);
    if (list.length > CAR_PER_VEHICLE) removeCarDecal(list[0]);
    carDecals.push({ d, v, birth: now });
    if (carDecals.length > CAR_MAX) removeCarDecal(carDecals[0].d);
    placed++;
  }
}

function removeCarDecal(d) {
  if (d.parent) d.parent.remove(d);
  const i = carDecals.findIndex((e) => e.d === d);
  if (i >= 0) {
    const v = carDecals[i].v;
    carDecals.splice(i, 1);
    if (v._goreDecals) {
      const j = v._goreDecals.indexOf(d);
      if (j >= 0) v._goreDecals.splice(j, 1);
    }
  }
}

function updateCarDecals() {
  for (let i = carDecals.length - 1; i >= 0; i--) {
    const e = carDecals[i];
    const t = now - e.birth;
    const group = e.d.parent;
    if (t > CAR_LIFE || !group || !group.parent) { removeCarDecal(e.d); continue; }
    const a = Math.min(1, (CAR_LIFE - t) / FADE);
    const step = Math.max(0, Math.ceil(a * CAR_ALPHA_STEPS) - 1);
    if (e.d.material !== carMats[step]) e.d.material = carMats[step];
  }
}

// --- effects ------------------------------------------------------------------

let splats = null;
let pools = null;

function doSpray(e, world) {
  const n = Math.round(6 + e.k * 26);
  const dl = Math.hypot(e.dx, e.dy) || 1;
  const dx = e.dx / dl, dy = e.dy / dl;
  for (let i = 0; i < n; i++) {
    const sp = rand(1, 3 + e.k * 4);
    const a = Math.random() * Math.PI * 2;
    spawnDrop(e.x + rand(-0.1, 0.1), e.h + rand(-0.15, 0.15), e.y + rand(-0.1, 0.1),
      dx * sp * rand(0.6, 1.3) + Math.cos(a) * rand(0.3, 1.6), rand(0.5, 2.5 + e.k * 2), dy * sp * rand(0.6, 1.3) + Math.sin(a) * rand(0.3, 1.6), rand(0.02, 0.045));
  }
  spawnFxPuff(e.x, e.h, e.y, dx * 1.2, 0.3, dy * 1.2, rand(0.35, 0.6), 0.15, 0.55 + e.k * 0.5, 0.55, 0.03, 0.04, 0.35 + e.k * 0.2, 3, -0.6);
}

function doGib(e, world) {
  const { x, y, pal } = e;
  const sp = Math.hypot(e.vx, e.vy);
  const fx = sp > 0.1 ? e.vx / sp : 1, fy = sp > 0.1 ? e.vy / sp : 0;
  const sx = -fy, sy = fx;
  const pieces = [
    // [lateral, height, sx, sy, sz, colour, stumpBottom, stumpTop]
    [0, 1.55, 0.21, 0.23, 0.21, pal.skin, 1, 0],
    [0, 1.22, 0.38, 0.3, 0.22, pal.top, 1, 1],
    [0, 0.95, 0.34, 0.22, 0.21, pal.pants, 0.6, 1],
    [0.26, 1.15, 0.1, 0.5, 0.1, pal.top, 0, 1],
    [-0.26, 1.15, 0.1, 0.5, 0.1, pal.top, 0, 1],
    [0.1, 0.5, 0.13, 0.62, 0.13, pal.pants, 0, 1],
  ];
  if (Math.random() < 0.5) pieces.push([-0.1, 0.5, 0.13, 0.62, 0.13, pal.pants, 0, 1]);
  else pieces.push([-0.1, 0.72, 0.13, 0.36, 0.13, pal.pants, 1, 1], [-0.1, 0.22, 0.12, 0.3, 0.12, pal.pants, 0, 1], [-0.1, 0.05, 0.12, 0.09, 0.24, pal.shoes, 0, 0]);
  if (pal.hair) pieces.push([0, 1.7, 0.22, 0.07, 0.22, pal.hair, 0, 0]);
  if (pal.hat) pieces.push([0, 1.76, 0.25, 0.09, 0.25, pal.hat, 0, 0]);
  const meat = 7 + Math.floor(Math.random() * 4);
  for (let k = 0; k < meat; k++) {
    const s = rand(0.06, 0.13);
    pieces.push([rand(-0.25, 0.25), rand(0.6, 1.4), s, s * rand(0.6, 1.2), s * rand(0.7, 1.3), MEAT[k % MEAT.length], 0, 0]);
  }
  const fwd = e.blast ? 1 : rand(1.0, 1.3);
  for (const [lat, h, a, b, c, col, s0, s1] of pieces) {
    const side = lat === 0 ? rand(-1, 1) : Math.sign(lat) * rand(0.5, 1.5);
    const push = e.blast ? rand(0.6, 1.3) : rand(0.85, 1.15);
    const vx = e.vx * fwd * push + sx * side * rand(1, 3) + rand(-1.2, 1.2);
    const vy = e.vy * fwd * push + sy * side * rand(1, 3) + rand(-1.2, 1.2);
    const vz = e.vz * rand(0.7, 1.25) + rand(1, 3) + h * 1.1;
    spawnChunk(x + fx * 0.3 + sx * lat, h, y + fy * 0.3 + sy * lat, vx, vz, vy, a, b, c, col,
      { stumpBottom: s0, stumpTop: s1, drip: s0 + s1 > 0 ? 1 : 0.3 });
  }
  chunks.active = true;

  const nd = 56;
  for (let k = 0; k < nd; k++) {
    const a = Math.random() * Math.PI * 2, r = rand(1.5, 6);
    spawnDrop(x + rand(-0.2, 0.2), rand(0.7, 1.4), y + rand(-0.2, 0.2),
      e.vx * rand(0.3, 1.1) + Math.cos(a) * r, rand(1, 6) + e.vz * 0.4, e.vy * rand(0.3, 1.1) + Math.sin(a) * r, rand(0.025, 0.06));
  }
  for (let k = 0; k < 5; k++) {
    spawnFxPuff(x + rand(-0.3, 0.3), rand(0.8, 1.4), y + rand(-0.3, 0.3), e.vx * 0.3 + rand(-1, 1), rand(0.3, 1.2), e.vy * 0.3 + rand(-1, 1),
      rand(0.5, 0.9), 0.3, rand(1.2, 1.9), 0.52, 0.03, 0.04, 0.5, 2.6, -0.5);
  }
  if (!(world.map && isInWater(world.map, x, y))) {
    const rot = -Math.atan2(fy, fx);
    addDecal(splats, x + fx * 0.4, y + fy * 0.4, rand(1.6, 2.1), { rot, aspect: 1.6 });
    for (let k = 1; k <= 3; k++) {
      const d = k * rand(1.2, 2.2);
      addDecal(splats, x + fx * d + sx * rand(-0.5, 0.5), y + fy * d + sy * rand(-0.5, 0.5), rand(0.6, 1.1), { rot, aspect: rand(1.2, 1.8) });
    }
  }
  if (e.vehicle) splatVehicle(e.vehicle, 4);
}

function doAnimal(e) {
  const { x, y, size } = e;
  const sp = Math.hypot(e.vx, e.vy);
  const fx = sp > 0.1 ? e.vx / sp : 1, fy = sp > 0.1 ? e.vy / sp : 0;
  const n = Math.round(e.burst ? 7 + size * 8 : 3 + size * 3);
  for (let k = 0; k < n; k++) {
    const meat = k % 3 !== 0;
    const s = rand(0.05, 0.1) * (0.6 + size * 0.5);
    const a = Math.random() * Math.PI * 2, r = rand(0.8, 2.6);
    spawnChunk(x + rand(-0.2, 0.2), rand(0.2, 0.3 + size * 0.4), y + rand(-0.2, 0.2),
      e.vx * rand(0.5, 1.1) + Math.cos(a) * r, rand(1.5, 4) + size, e.vy * rand(0.5, 1.1) + Math.sin(a) * r,
      s, s * rand(0.6, 1.1), s * rand(0.7, 1.3), meat ? MEAT[k % MEAT.length] : e.cols[k % e.cols.length], { stumpBottom: meat ? 1 : 0, drip: meat ? 1 : 0.3 });
  }
  chunks.active = true;
  const nd = Math.round(18 + size * 30);
  for (let k = 0; k < nd; k++) {
    const a = Math.random() * Math.PI * 2, r = rand(1, 4.5);
    spawnDrop(x + rand(-0.2, 0.2), rand(0.2, 0.4 + size * 0.5), y + rand(-0.2, 0.2),
      e.vx * rand(0.2, 0.9) + Math.cos(a) * r, rand(1, 4.5), e.vy * rand(0.2, 0.9) + Math.sin(a) * r, rand(0.025, 0.055));
  }
  for (let k = 0; k < 3; k++) {
    spawnFxPuff(x + rand(-0.2, 0.2), 0.4 + size * 0.3, y + rand(-0.2, 0.2), e.vx * 0.2 + rand(-0.6, 0.6), rand(0.3, 1), e.vy * 0.2 + rand(-0.6, 0.6),
      rand(0.4, 0.8), 0.25, 0.8 + size * 0.6, 0.52, 0.03, 0.04, 0.45, 2.6, -0.5);
  }
  const rot = -Math.atan2(fy, fx);
  addDecal(splats, x + fx * 0.5, y + fy * 0.5, 0.9 + size * 0.8, { rot, aspect: 1.5 });
  if (e.burst) addDecal(splats, x + fx * 2, y + fy * 2, 0.5 + size * 0.5, { rot, aspect: 1.7 });
  else addDecal(pools, x + rand(-0.15, 0.15), y + rand(-0.15, 0.15), 0.8 + size * 0.7, { grow: rand(5, 7), life: POOL_LIFE, alpha: 0.9 });
  if (e.vehicle) splatVehicle(e.vehicle, e.burst ? 3 : Math.max(1, Math.round(size * 1.5)));
}

function updateBleeders(world) {
  for (let i = bleeders.length - 1; i >= 0; i--) {
    const b = bleeders[i], p = b.ped, t = world.time - b.t0;
    if (p.gibbed || !world.pedestrians.includes(p) || t > 6) { bleeders.splice(i, 1); continue; }
    if (t < 0.8) continue;
    const rd = p.ragdoll;
    if (rd && !rd.sleeping && t < 3.5) continue;
    bleeders.splice(i, 1);
    if (world.map && isInWater(world.map, p.x, p.y)) continue;
    if (Math.hypot(p.x - world.player.x, p.y - world.player.y) > FX_RANGE) continue;
    addDecal(pools, p.x + rand(-0.15, 0.15), p.y + rand(-0.15, 0.15), rand(1.1, 1.5) * b.size, { grow: rand(5, 7), life: POOL_LIFE, alpha: 0.9 });
  }
}

// Carmageddon rules: a corpse run over at speed bursts too.
function runOverCorpses(world) {
  const v = world.player.inVehicle;
  if (!v || v.isBoat || v.isBike || v.isScooter || Math.abs(v.speed) < GIB_SPEED * 0.8) return;
  const ca = Math.cos(v.angle), sa = Math.sin(v.angle);
  const reach = v.halfLen + 1;
  for (const p of world.pedestrians) {
    if (p.state !== 'dead' || p.gibbed) continue;
    const dx = p.x - v.x, dy = p.y - v.y;
    if (Math.abs(dx) > reach || Math.abs(dy) > reach) continue;
    if (world.time - (p._diedAt ?? -1e9) < 0.8 || (p.ragdoll && world.time - p.ragdoll.hitAt < 0.8)) continue;
    const lx = dx * ca + dy * sa, lz = -dx * sa + dy * ca;
    if (Math.abs(lx) > v.halfLen + 0.3 || Math.abs(lz) > v.halfWid + 0.3) continue;
    const vx = ca * v.speed, vy = sa * v.speed;
    splatterPed(p, world, { vx: vx * 0.7, vy: vy * 0.7, vz: 2.5, vehicle: v });
  }
}

const BIRDS = new Set(['pigeon', 'duck', 'seagull']);
const FEATHERS = { pigeon: [0x8d929c, 0xb6bac2, 0x5b6170], duck: [0x7a5b3c, 0xa98a62, 0x2f6b3a], seagull: [0xf2f2ee, 0xc9ccd2, 0x9aa0a8] };

// Birds the player drives through go 'poof' in a cloud of feathers.
function poofBirds(world) {
  const v = world.player.inVehicle;
  const list = world.wildlife;
  if (!v || !list || v.isBoat || Math.abs(v.speed) < 6) return;
  const ca = Math.cos(v.angle), sa = Math.sin(v.angle);
  for (let i = list.length - 1; i >= 0; i--) {
    const a = list[i];
    if (!BIRDS.has(a.kind) || a.gone || (a.z ?? 0) > 1.6) continue;
    const dx = a.x - v.x, dy = a.y - v.y;
    if (Math.abs(dx) > v.halfLen + 1 || Math.abs(dy) > v.halfLen + 1) continue;
    const lx = dx * ca + dy * sa, lz = -dx * sa + dy * ca;
    if (Math.abs(lx) > v.halfLen + 0.25 || Math.abs(lz) > v.halfWid + 0.25) continue;
    list.splice(i, 1);
    featherPoof(world, a.x, a.y, Math.max(0.3, a.z ?? 0.3), ca * v.speed, sa * v.speed, FEATHERS[a.kind]);
    if (goreOn()) {
      bloodSpray(world, a.x, a.y, ca, sa, 0.25, Math.max(0.3, a.z ?? 0.3));
      if ((a.z ?? 0) < 0.4) addDecal(splats, a.x + ca * 0.4, a.y + sa * 0.4, rand(0.45, 0.7), { rot: -v.angle, aspect: 1.4 });
    }
  }
}

function featherPoof(world, x, y, h, vx, vy, cols) {
  for (let k = 0; k < 14; k++) {
    const a = Math.random() * Math.PI * 2, r = rand(1, 3.5);
    spawnChunk(x, h + rand(0, 0.3), y, vx * rand(0.2, 0.6) + Math.cos(a) * r, rand(1.5, 4.5), vy * rand(0.2, 0.6) + Math.sin(a) * r,
      rand(0.05, 0.08), 0.008, rand(0.12, 0.18), cols[k % cols.length], { grav: 0.08, drag: 2.2, feather: true, spin: 5, life: rand(7, 10) });
  }
  chunks.active = true;
  for (let k = 0; k < 3; k++) {
    spawnFxPuff(x + rand(-0.2, 0.2), h + 0.2, y + rand(-0.2, 0.2), vx * 0.15 + rand(-0.6, 0.6), rand(0.3, 0.8), vy * 0.15 + rand(-0.6, 0.6),
      rand(0.5, 0.8), 0.25, rand(0.9, 1.3), 0.95, 0.94, 0.92, 0.55, 3, 0.2);
  }
  sfx(world, 'poof', x, y, 0.7);
}

function clearAll() {
  queue.length = 0;
  bleeders.length = 0;
  if (!ready) return;
  for (let i = 0; i < CHUNK_MAX; i++) { chunks.life[i] = 0; chunks.mesh.setMatrixAt(i, ZERO); }
  chunks.mesh.instanceMatrix.needsUpdate = true;
  for (let i = 0; i < DROP_MAX; i++) { drops.alive[i] = 0; drops.mesh.setMatrixAt(i, ZERO); }
  drops.mesh.instanceMatrix.needsUpdate = true;
  clearDecals(splats);
  clearDecals(pools);
  while (carDecals.length) removeCarDecal(carDecals[0].d);
}

function init(sc) {
  scene = sc;
  initChunks();
  initDrops();
  initCarDecals();
  pools = makeDecalLayer(splatGeometry(5, true), POOL_MAX, BLOOD_POOL, 'fx-gore-pools');
  splats = makeDecalLayer(splatGeometry(17, false), SPLAT_MAX, BLOOD, 'fx-gore-splats');
  ready = true;
  onSettingsChange((s, key) => { if (key === 'gore' && !s.gore) clearAll(); });
}

export function updateGore3D(dt, world, sc) {
  if (!sc) return;
  if (!ready) init(sc);
  if (world.paused) dt = 0;
  now += dt;
  frame++;
  splatSoundT -= dt;
  if (!goreOn()) {
    queue.length = 0;
    if (dt > 0) poofBirds(world);
    updateChunks(dt, world);
    return;
  }
  if (dt > 0) {
    const px = world.player.x, py = world.player.y;
    for (const e of queue) {
      const ex = e.vehicle ? e.vehicle.x : e.x, ey = e.vehicle ? e.vehicle.y : e.y;
      if (Math.hypot(ex - px, ey - py) > FX_RANGE) continue;
      if (e.kind === 'gib') doGib(e, world);
      else if (e.kind === 'spray') doSpray(e, world);
      else if (e.kind === 'car') splatVehicle(e.vehicle, e.n);
      else if (e.kind === 'animal') doAnimal(e);
    }
    queue.length = 0;
    updateBleeders(world);
    runOverCorpses(world);
    poofBirds(world);
  }
  updateChunks(dt, world);
  updateDrops(dt, world);
  updateDecals(splats);
  updateDecals(pools);
  updateCarDecals();
}
