import { hoofdspeler } from './players.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { isInWater, WATER_Y } from './util.js';
import { spawnFxPuff } from './fx3d.js';
import { ragdollHead } from './ragdoll.js';
import { scareAnimal } from './wildlife.js';
import { rand } from './rng.js';

// Slapstick feedback for the knockdowns that stay non-lethal (H3's stunt
// evening, pedestrians.js stuntKnock): a puff of dust where someone goes
// down, comic stars circling the head while they lie there and while they
// stand up groggy, and a few loose feathers when the player drives at a bird
// that gore3d.js did not take (it flies off). The lethal side is gore3d.js.
//
// Gameplay calls knockFx(); a knocked-down pedestrian carries ped.koUntil
// (lying) and ped.groggyUntil (back on its feet).

const FX_RANGE = 70;
const STAR_ACTORS = 10;
const STARS_EACH = 4;
const STAR_MAX = STAR_ACTORS * STARS_EACH;
const FEATHER_MAX = 60;
const GRAVITY = 9.8;
const STAR_COLOR = 0xffd23a;

let scene = null;
let ready = false;
let starMesh = null;
let starsShown = 0;
const feathers = { next: 0, active: false };

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler(0, 0, 0, 'YXZ');
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);


function sfx(world, kind, x, y, strength) {
  const q = world.audioEvents || (world.audioEvents = []);
  if (q.length < 64) q.push({ kind, x, y, strength });
}

// Dust kicked up where a body or an animal hits the ground; k 0..1.
export function knockFx(world, x, y, o = {}) {
  const k = Math.min(1, Math.max(0, o.k ?? 0.6));
  const base = (o.gz || 0) + 0.15;
  if (!(world.map && isInWater(world.map, x, y))) {
    const n = 3 + Math.round(k * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = rand(0.4, 1.2) * (0.6 + k);
      spawnFxPuff(x + Math.cos(a) * 0.25, base, y + Math.sin(a) * 0.25, Math.cos(a) * r + (o.vx || 0) * 0.1, rand(0.2, 0.6), Math.sin(a) * r + (o.vy || 0) * 0.1,
        rand(0.7, 1.1), 0.3, rand(0.9, 1.4) * (0.7 + k * 0.5), 0.78, 0.74, 0.66, 0.5, 2.5, 0.15);
    }
  }
  if (o.sound !== false) sfx(world, 'ko', x, y, k);
}

// --- comic stars --------------------------------------------------------------

function starGeometry() {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 0.42 : 1;
    pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  const g = new THREE.ShapeGeometry(new THREE.Shape(pts));
  g.scale(0.07, 0.07, 0.07);
  return g;
}

function initStars() {
  const mat = new THREE.MeshBasicMaterial({ color: STAR_COLOR, side: THREE.DoubleSide, toneMapped: false });
  starMesh = new THREE.InstancedMesh(starGeometry(), mat, STAR_MAX);
  starMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < STAR_MAX; i++) starMesh.setMatrixAt(i, ZERO);
  starMesh.frustumCulled = false;
  starMesh.name = 'fx-ko-stars';
  scene.add(starMesh);
}

function ringAt(i, hx, hy, hz, t, seed, k) {
  for (let s = 0; s < STARS_EACH; s++) {
    const a = t * 3.2 + seed + (s / STARS_EACH) * Math.PI * 2;
    _p.set(hx + Math.cos(a) * 0.28, hy + Math.sin(a * 2) * 0.03, hz + Math.sin(a) * 0.28);
    _e.set(0, -a, t * 4 + s);
    _q.setFromEuler(_e);
    _s.setScalar(k);
    starMesh.setMatrixAt(i * STARS_EACH + s, _m.compose(_p, _q, _s));
  }
}

function updateStars(world) {
  const t = world.time, pl = hoofdspeler(world);
  let n = 0;
  const head = (x, y, h, seed, k) => {
    if (n >= STAR_ACTORS || k <= 0) return;
    ringAt(n++, x, h, y, t, seed, k);
  };
  for (const ped of world.pedestrians) {
    if (n >= STAR_ACTORS) break;
    if (ped.state === 'dead' || !(ped.koUntil > t - 0.2 || ped.groggyUntil > t)) continue;
    if (Math.abs(ped.x - pl.x) > FX_RANGE || Math.abs(ped.y - pl.y) > FX_RANGE || ped.hideMesh) continue;
    const seed = ped._lookSeed || 0;
    const h = ragdollHead(ped);
    if (h) head(h[0], h[2], h[1] + 0.32, seed, 1);
    else if (ped.koUntil > t) head(ped.x, ped.y, (ped.gz || 0) + 0.45, seed, 1);
    else head(ped.x, ped.y, (ped.gz || 0) + 2.0, seed, Math.min(1, (ped.groggyUntil - t) / 0.6));
  }
  for (let i = n; i < starsShown; i++) for (let s = 0; s < STARS_EACH; s++) starMesh.setMatrixAt(i * STARS_EACH + s, ZERO);
  if (n || starsShown) starMesh.instanceMatrix.needsUpdate = true;
  starsShown = n;
}

// --- feathers -------------------------------------------------------------------

function initFeathers() {
  const F = feathers;
  for (const k of ['x', 'y', 'z', 'vx', 'vy', 'vz', 'rx', 'ry', 'rz', 'age', 'life']) F[k] = new Float32Array(FEATHER_MAX);
  F.rest = new Uint8Array(FEATHER_MAX);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0, side: THREE.DoubleSide });
  F.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.008, 0.15), mat, FEATHER_MAX);
  F.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  F.mesh.setColorAt(0, _c.setRGB(1, 1, 1));
  F.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < FEATHER_MAX; i++) F.mesh.setMatrixAt(i, ZERO);
  F.mesh.frustumCulled = false;
  F.mesh.name = 'fx-feathers';
  scene.add(F.mesh);
}

function spawnFeather(x, h, y, vx, vy, vz, color) {
  const F = feathers, i = F.next;
  F.next = (i + 1) % FEATHER_MAX;
  F.x[i] = x; F.y[i] = h; F.z[i] = y;
  F.vx[i] = vx; F.vy[i] = vy; F.vz[i] = vz;
  F.rx[i] = Math.random() * 6; F.ry[i] = Math.random() * 6; F.rz[i] = Math.random() * 6;
  F.age[i] = 0; F.life[i] = rand(5, 8); F.rest[i] = 0;
  F.mesh.setColorAt(i, _c.setHex(color));
  F.mesh.instanceColor.needsUpdate = true;
  F.active = true;
}

function updateFeathers(dt, world) {
  const F = feathers;
  if (!F.active) return;
  let any = false;
  for (let i = 0; i < FEATHER_MAX; i++) {
    if (F.life[i] <= 0) continue;
    any = true;
    const age = (F.age[i] += dt);
    if (age >= F.life[i]) { F.life[i] = 0; F.mesh.setMatrixAt(i, ZERO); continue; }
    if (!F.rest[i] && dt > 0) {
      const k = Math.exp(-2.2 * dt);
      F.vx[i] = F.vx[i] * k + Math.sin(age * 5 + i) * 1.4 * dt;
      F.vz[i] = F.vz[i] * k + Math.cos(age * 4.3 + i * 1.7) * 1.4 * dt;
      F.vy[i] = F.vy[i] * k - GRAVITY * 0.08 * dt;
      F.x[i] += F.vx[i] * dt; F.y[i] += F.vy[i] * dt; F.z[i] += F.vz[i] * dt;
      F.rx[i] += 5 * dt; F.rz[i] += 3 * dt;
      const floor = world.map && isInWater(world.map, F.x[i], F.z[i]) ? WATER_Y : 0.01;
      if (F.y[i] < floor) { F.y[i] = floor; F.rest[i] = 1; F.rx[i] = 0; F.rz[i] = 0; }
    }
    const remain = F.life[i] - age, s = remain < 1 ? remain : 1;
    _e.set(F.rx[i], F.ry[i], F.rz[i]);
    _q.setFromEuler(_e);
    F.mesh.setMatrixAt(i, _m.compose(_p.set(F.x[i], F.y[i], F.z[i]), _q, _s.setScalar(s)));
  }
  F.mesh.instanceMatrix.needsUpdate = true;
  F.active = any;
}

const BIRDS = new Set(['pigeon', 'duck', 'seagull']);
const FEATHER_COLS = { pigeon: [0x8d929c, 0xb6bac2, 0x5b6170], duck: [0x7a5b3c, 0xa98a62, 0x2f6b3a], seagull: [0xf2f2ee, 0xc9ccd2, 0x9aa0a8] };

// A bird the player drives at flaps away in a fluster, leaving a few feathers.
function flusterBirds(world) {
  const v = hoofdspeler(world).inVehicle;
  const list = world.wildlife;
  if (!v || !list || v.isBoat || Math.abs(v.speed) < 6) return;
  const ca = Math.cos(v.angle), sa = Math.sin(v.angle);
  for (const a of list) {
    if (!BIRDS.has(a.kind) || a.gone || (a.z ?? 0) > 1.6 || world.time - (a._flusterAt ?? -99) < 3) continue;
    const dx = a.x - v.x, dy = a.y - v.y;
    if (Math.abs(dx) > v.halfLen + 1 || Math.abs(dy) > v.halfLen + 1) continue;
    const lx = dx * ca + dy * sa, lz = -dx * sa + dy * ca;
    if (Math.abs(lx) > v.halfLen + 0.25 || Math.abs(lz) > v.halfWid + 0.25) continue;
    a._flusterAt = world.time;
    const h = Math.max(0.3, a.z ?? 0.3), cols = FEATHER_COLS[a.kind];
    for (let k = 0; k < 6; k++) {
      const ang = Math.random() * Math.PI * 2, r = rand(0.6, 2);
      spawnFeather(a.x, h + rand(0, 0.3), a.y, ca * v.speed * 0.15 + Math.cos(ang) * r, rand(1, 2.5), sa * v.speed * 0.15 + Math.sin(ang) * r, cols[k % cols.length]);
    }
    sfx(world, 'poof', a.x, a.y, 0.5);
    scareAnimal(a, world, v.x, v.y);
  }
}

function init(sc) {
  scene = sc;
  initStars();
  initFeathers();
  ready = true;
}

export function updateKnockFx3D(dt, world, sc) {
  if (!sc) return;
  if (!ready) init(sc);
  if (world.paused) dt = 0;
  if (dt > 0) flusterBirds(world);
  updateFeathers(dt, world);
  updateStars(world);
}

