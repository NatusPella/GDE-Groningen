import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { isInWater, WATER_Y } from './util.js';
import { wallOnPath } from './wallpath.js';
import { wreckVehicle } from './vehiclewreck.js';
import { blastPeople, soakPed } from './pedestrians.js';
import { propsInRadius, breakProp } from './breakables.js';
import { buildVehicleExplosionMesh3D, updateVehicleExplosionMesh3D, VEHICLE_FIRE_HEALTH_THRESHOLD } from './vehicle.js';
import { spawnExplosionFx, spawnFxPuff, spawnFxSpark } from './fx3d.js';
import { flashMuzzleLight } from './nightlights3d.js';
import { markShared } from './pixelart3d.js';
import { throwablesHook } from './latehooks.js';

// Things the player lets fly that are not bullets: the waterpistool's spray,
// a thrown (or, crouching, placed) carbidbus with its fuse and big bang, and
// firework rockets that arc off and burst in a shower of colour. combat.js
// launches them (squirtWater / throwExplosive) and steps them from
// updateBullets; gunfx3d.js calls updateThrowables3D to draw them.
// Game coordinates: x/y on the map, z up.

const G = 9.81;
const MAX_DROPS = 90;
const MAX_ITEMS = 12;
const CARBID_FUSE = 2.4;
const CARBID_SCALE = 1.15;
const ROCKET_LIFE = 1.7;
const ROCKET_SCALE = 0.42;
const DOUSE_HITS = 28;

const drops = [];
const items = [];
const blasts = [];

function groundAt(map, x, y, z) {
  return map.elev && map.elev.has ? map.groundHeightAt(x, y, z) : 0;
}

function launchPoint(world, angle) {
  const p = world.player;
  const v = p.inVehicle;
  const base = v ? v.z || 0 : (p.gz || 0) + (p.z || 0);
  const rx = -Math.sin(angle) * 0.2, ry = Math.cos(angle) * 0.2;
  return { x: p.x + Math.cos(angle) * 0.6 + rx, y: p.y + Math.sin(angle) * 0.6 + ry, z: base + (v ? 1.2 : p.crouching ? 0.9 : 1.35), base };
}

function audio(world, ev) {
  const q = world.audioEvents || (world.audioEvents = []);
  if (q.length < 64) q.push({ kind: 'weapon', ...ev });
}

export function squirtWater(world, angle, weapon) {
  if (drops.length >= MAX_DROPS) drops.shift();
  const o = launchPoint(world, angle);
  const a = angle + (Math.random() - 0.5) * 0.05;
  const sp = weapon.speed * (0.92 + Math.random() * 0.12);
  drops.push({ x: o.x, y: o.y, z: o.z, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 1.2 + Math.random() * 0.4, t: 0 });
  if (Math.random() < 0.35) audio(world, { sub: 'squirt', x: o.x, y: o.y });
}

// dist: the locked target's distance (the arc lands there), else a default lob.
export function throwExplosive(world, key, angle, weapon, dist = null) {
  if (items.length >= MAX_ITEMS) return;
  const o = launchPoint(world, angle);
  const ca = Math.cos(angle), sa = Math.sin(angle);
  if (key === 'carbidbus') {
    const place = world.player.crouching || world.player.inVehicle;
    const vz = place ? 0 : 3.6;
    const d = Math.max(2, Math.min(weapon.range, dist ?? 7));
    const flight = (vz + Math.sqrt(vz * vz + 2 * G * (o.z - o.base))) / G;
    const sp = place ? 0.6 : d / flight;
    items.push({ type: 'carbid', x: o.x, y: o.y, z: place ? o.base + 0.3 : o.z, vx: ca * sp, vy: sa * sp, vz, t: 0, fuse: CARBID_FUSE, spin: 0, angle });
    audio(world, { sub: 'fuse', x: o.x, y: o.y });
  } else {
    const lift = dist ? Math.min(3.5, 1 + dist * 0.08) : 4.2;
    items.push({ type: 'rocket', x: o.x, y: o.y, z: o.z + 0.1, vx: ca * weapon.speed, vy: sa * weapon.speed, vz: lift, t: 0, fuse: ROCKET_LIFE, hue: Math.random() });
    audio(world, { sub: 'launch', x: o.x, y: o.y });
  }
}

// --- simulation -------------------------------------------------------------

function douse(world, v) {
  if (v.wrecked) {
    if (v.wreckedAt !== undefined) v.wreckedAt -= 0.6;
    return;
  }
  if (!v.disabled) return;
  v.burnLeft += 0.3;
  v._doused = (v._doused || 0) + 1;
  if (v._doused < DOUSE_HITS) return;
  v.disabled = false;
  v._doused = 0;
  v.health = VEHICLE_FIRE_HEALTH_THRESHOLD + 8;
  world.addMessage('Brand geblust! Dat scheelt n boel', 2.5);
}

function stepDrop(world, d, dt) {
  const x0 = d.x, y0 = d.y;
  d.t += dt;
  d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
  d.vz -= G * dt;
  const map = world.map;
  if (wallOnPath(map, x0, y0, d.x, d.y)) { d.hit = 'wall'; return false; }
  for (const ped of world.pedestrians) {
    if (ped.state === 'dead' || Math.abs(ped.x - d.x) > 0.6 || Math.abs(ped.y - d.y) > 0.6) continue;
    if (Math.hypot(ped.x - d.x, ped.y - d.y) > ped.radius + 0.18 || d.z > (ped.gz || 0) + 1.9) continue;
    soakPed(ped, world, world.player.x, world.player.y);
    d.hit = 'ped';
    return false;
  }
  for (const v of world.vehicles) {
    if (v.sinking || v.isBoat || Math.abs(v.x - d.x) > v.halfLen + 0.3 || Math.abs(v.y - d.y) > v.halfLen + 0.3) continue;
    const c = Math.cos(v.angle), s = Math.sin(v.angle);
    const lx = (d.x - v.x) * c + (d.y - v.y) * s, ly = -(d.x - v.x) * s + (d.y - v.y) * c;
    if (Math.abs(lx) > v.halfLen || Math.abs(ly) > (v.halfWid || v.model.wid / 2) + 0.1 || d.z > (v.z || 0) + 1.8) continue;
    douse(world, v);
    d.hit = 'car';
    return false;
  }
  if (d.z <= groundAt(map, d.x, d.y, d.z + 0.5)) { d.hit = 'ground'; return false; }
  return d.t < 1.6;
}

function explode(world, it, scale) {
  const map = world.map;
  const x = it.x, y = it.y;
  const z = it.type === 'carbid' ? Math.max(it.z - 0.3, groundAt(map, x, y, it.z)) : it.z;
  const low = z - groundAt(map, x, y, z) < 3.5;
  if (low) blastPeople(world, x, y, scale, true);
  const reach = 9 * scale;
  if (low) {
    for (const v of world.vehicles) {
      if (v.wrecked || v.sinking || v.isBoat) continue;
      const dx = v.x - x, dy = v.y - y, d = Math.hypot(dx, dy);
      if (d > reach) continue;
      const k = 1 - d / reach;
      if (v.disabled) v.burnLeft -= 6 * k;
      else {
        v.health -= 90 * k * scale;
        if (v.health <= 0) wreckVehicle(world, v, true);
      }
      if (d > 0.1) { v.driftX = (v.driftX || 0) + (dx / d) * 4 * k; v.driftY = (v.driftY || 0) + (dy / d) * 4 * k; }
    }
    for (const pr of propsInRadius(x, y, 5 * scale)) {
      const dx = pr.x - x, dy = pr.y - y, d = Math.hypot(dx, dy) || 1;
      breakProp(pr, { vx: (dx / d) * 6, vy: (dy / d) * 6, speed: 7, lift: 1.2, nx: dx / d, ny: dy / d, byPlayer: true });
    }
  }
  const p = world.player;
  const pd = Math.hypot(x - p.x, y - p.y);
  const shake = scale > 0.8 ? 60 : 25;
  if (pd < shake) world.lastImpact = { strength: Math.max(0.15, Math.min(1, (1.25 - pd / 45) * (scale > 0.8 ? 1 : 0.4))), time: world.time, x, y, blast: true, own: true };
  if (scale > 0.8) world.lastBlast = { x, y, z, time: world.time };
  const water = isInWater(map, x, y) && z < WATER_Y + 0.6;
  if (water) world.particles.push({ kind: 'splash', x, y, until: world.time + 1.1 });
  audio(world, { sub: it.type === 'carbid' ? 'carbid' : 'firework', x, y, z, water });
  if (blasts.length < 8) blasts.push({ type: it.type, x, y, z, scale, hue: it.hue ?? 0, water });
}

function stepItem(world, it, dt) {
  const map = world.map;
  it.t += dt;
  const x0 = it.x, y0 = it.y;
  if (it.type === 'rocket') {
    // a little thrust keeps it climbing before it tips over
    it.vz -= (it.t < 0.5 ? 2 : G * 0.6) * dt;
    it.x += it.vx * dt; it.y += it.vy * dt; it.z += it.vz * dt;
    const g = groundAt(map, it.x, it.y, it.z + 0.5);
    let hit = !!wallOnPath(map, x0, y0, it.x, it.y) || it.z <= g + 0.05 || it.t >= it.fuse;
    if (!hit) {
      for (const ped of world.pedestrians) {
        if (ped.state === 'dead' || Math.abs(ped.x - it.x) > 0.7 || Math.abs(ped.y - it.y) > 0.7) continue;
        if (it.z < (ped.gz || 0) + 2 && Math.hypot(ped.x - it.x, ped.y - it.y) < ped.radius + 0.25) { hit = true; break; }
      }
    }
    if (!hit) {
      for (const v of world.vehicles) {
        if (v.wrecked || v.isBoat || Math.abs(v.x - it.x) > v.halfLen || Math.abs(v.y - it.y) > v.halfLen) continue;
        if (it.z < (v.z || 0) + 1.6 && Math.hypot(v.x - it.x, v.y - it.y) < v.halfLen * 0.8) { hit = true; break; }
      }
    }
    if (hit) {
      if (it.z < g) it.z = g + 0.1;
      explode(world, it, ROCKET_SCALE);
      return false;
    }
    return true;
  }
  // carbidbus: flies, bounces off walls and the street, then sits and hisses
  if (!it.rest) {
    it.vz -= G * dt;
    it.x += it.vx * dt; it.y += it.vy * dt; it.z += it.vz * dt;
    it.spin += dt * 9 * Math.hypot(it.vx, it.vy) / 6;
    const w = wallOnPath(map, x0, y0, it.x, it.y);
    if (w) {
      const dot = it.vx * w.nx + it.vy * w.ny;
      it.vx = (it.vx - 2 * dot * w.nx) * 0.4; it.vy = (it.vy - 2 * dot * w.ny) * 0.4;
      it.x = w.x + w.nx * 0.2; it.y = w.y + w.ny * 0.2;
    }
    const g = isInWater(map, it.x, it.y) ? WATER_Y - 0.1 : groundAt(map, it.x, it.y, it.z + 0.5);
    if (it.z <= g + 0.18) {
      it.z = g + 0.18;
      if (Math.abs(it.vz) > 1.5) { it.vz = -it.vz * 0.3; it.vx *= 0.55; it.vy *= 0.55; }
      else { it.vz = 0; it.vx *= Math.exp(-dt * 8); it.vy *= Math.exp(-dt * 8); }
      if (Math.hypot(it.vx, it.vy) < 0.15 && it.vz === 0) it.rest = true;
    }
  }
  if (it.t >= it.fuse) {
    explode(world, it, CARBID_SCALE);
    return false;
  }
  return true;
}

// Samen spelen (#452): carbidbussen en vuurpijlen onderweg, voor coopextra.js (staat = hoe ver de lont is, 0 tot 255)
let itemSeq = 0;
export function throwablesRekwisieten() {
  return items.map((it) => ({ soort: it.type === 'carbid' ? 'carbid' : 'raket', id: it.cid || (it.cid = ++itemSeq), x: it.x, y: it.y, z: it.z, hoek: Math.atan2(it.vy || 0, it.vx || 0), staat: Math.round(Math.min(1, it.t / (it.fuse || 1)) * 255) }));
}

export function updateThrowables(dt, world) {
  if (!dt) return;
  for (let i = drops.length - 1; i >= 0; i--) {
    if (!stepDrop(world, drops[i], dt)) {
      const d = drops[i];
      if (splashes.length < 40) splashes.push({ x: d.x, y: d.y, z: d.z, hit: d.hit });
      drops.splice(i, 1);
    }
  }
  for (let i = items.length - 1; i >= 0; i--) {
    if (!stepItem(world, items[i], dt)) items.splice(i, 1);
  }
}


// --- 3D -----------------------------------------------------------------------

const splashes = [];
const SPARK_MAX = 420;
let scene = null;
let waterPts = null;
let sparkPts = null;
const sparks = { n: 0, x: new Float32Array(SPARK_MAX), y: new Float32Array(SPARK_MAX), z: new Float32Array(SPARK_MAX),
  vx: new Float32Array(SPARK_MAX), vy: new Float32Array(SPARK_MAX), vz: new Float32Array(SPARK_MAX),
  life: new Float32Array(SPARK_MAX), max: new Float32Array(SPARK_MAX), r: new Float32Array(SPARK_MAX), g: new Float32Array(SPARK_MAX), b: new Float32Array(SPARK_MAX) };
const itemMeshes = new Map();
const fireballs = [];
const _c = new THREE.Color();

const CHURN_MAT = markShared(new THREE.MeshStandardMaterial({ color: 0x9aa2a8, roughness: 0.4, metalness: 0.7 }));
const LID_MAT = markShared(new THREE.MeshStandardMaterial({ color: 0x6f777d, roughness: 0.5, metalness: 0.6 }));
const ROCKET_MAT = markShared(new THREE.MeshStandardMaterial({ color: 0xc8261e, roughness: 0.6 }));
const STICK_MAT = markShared(new THREE.MeshStandardMaterial({ color: 0xc9a66b, roughness: 0.8 }));

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.7)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

function makePoints(max, opts) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage));
  if (opts.vertexColors) geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage));
  geo.setDrawRange(0, 0);
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ transparent: true, depthWrite: false, sizeAttenuation: true, ...opts }));
  pts.frustumCulled = false;
  pts.renderOrder = 5;
  return pts;
}

function init(sc) {
  scene = sc;
  const tex = dotTexture();
  waterPts = makePoints(MAX_DROPS, { size: 0.16, color: 0xcfe8ff, opacity: 0.85, map: tex });
  sparkPts = makePoints(SPARK_MAX, { size: 0.34, vertexColors: true, blending: THREE.AdditiveBlending, map: tex });
  scene.add(waterPts, sparkPts);
}

function spark(x, y, z, vx, vy, vz, life, r, g, b) {
  const s = sparks;
  let i = s.n;
  if (i >= SPARK_MAX) i = Math.floor(Math.random() * SPARK_MAX);
  else s.n++;
  s.x[i] = x; s.y[i] = y; s.z[i] = z; s.vx[i] = vx; s.vy[i] = vy; s.vz[i] = vz;
  s.life[i] = life; s.max[i] = life; s.r[i] = r; s.g[i] = g; s.b[i] = b;
}

let geos = null;
function buildItemMesh(it) {
  if (!geos) {
    geos = {
      churn: markShared(new THREE.CylinderGeometry(0.16, 0.18, 0.42, 12)),
      lid: markShared(new THREE.CylinderGeometry(0.1, 0.12, 0.08, 10).translate(0, 0.25, 0)),
      tube: markShared(new THREE.CylinderGeometry(0.035, 0.035, 0.28, 6)),
      cone: markShared(new THREE.ConeGeometry(0.045, 0.1, 6).translate(0, 0.19, 0)),
      stick: markShared(new THREE.BoxGeometry(0.012, 0.7, 0.012).translate(0.04, -0.4, 0)),
    };
  }
  const g = new THREE.Group();
  if (it.type === 'carbid') {
    const body = new THREE.Mesh(geos.churn, CHURN_MAT);
    body.castShadow = true;
    g.add(body, new THREE.Mesh(geos.lid, LID_MAT));
    // lying on its side, the lid aimed where it was thrown (the traditional way)
    g.userData.tilt = Math.PI / 2;
  } else {
    g.add(new THREE.Mesh(geos.tube, ROCKET_MAT), new THREE.Mesh(geos.cone, ROCKET_MAT), new THREE.Mesh(geos.stick, STICK_MAT));
  }
  scene.add(g);
  return g;
}

function burstFx(b) {
  if (b.type === 'carbid') {
    const boom = buildVehicleExplosionMesh3D(b.scale * 0.8);
    boom.position.set(b.x, b.z, b.y);
    scene.add(boom);
    fireballs.push(boom);
    spawnExplosionFx(b.x, b.y, b.z, 0x8a9197, b.scale * 0.75);
    flashMuzzleLight(b.x, b.z + 1, b.y, 3);
    if (b.water) for (let k = 0; k < 14; k++) spawnFxPuff(b.x, WATER_Y + 0.2, b.y, (Math.random() - 0.5) * 3, 3 + Math.random() * 4, (Math.random() - 0.5) * 3, 1.2, 0.3, 1.2, 0.9, 0.94, 0.97, 0.6, 1.5, -3);
    return;
  }
  // firework: a sphere of coloured stars plus golden glitter
  _c.setHSL(b.hue, 1, 0.6);
  const n = 90;
  for (let k = 0; k < n; k++) {
    const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    const sp = 5 + Math.random() * 3;
    const gold = k % 4 === 0;
    spark(b.x, b.z, b.y, Math.cos(a) * r * sp, u * sp + 1, Math.sin(a) * r * sp, 0.9 + Math.random() * 0.7,
      gold ? 1 : _c.r, gold ? 0.8 : _c.g, gold ? 0.35 : _c.b);
  }
  for (let k = 0; k < 6; k++) spawnFxPuff(b.x, b.z, b.y, (Math.random() - 0.5) * 2, Math.random(), (Math.random() - 0.5) * 2, 1.5, 0.3, 1.4, 0.7, 0.68, 0.66, 0.3, 1.2, 0.2);
  flashMuzzleLight(b.x, b.z, b.y, 2.2);
}

function writePoints(pts, count, fill) {
  const geo = pts.geometry;
  const pos = geo.attributes.position.array;
  const col = geo.attributes.color ? geo.attributes.color.array : null;
  let n = 0;
  for (let i = 0; i < count; i++) if (fill(i, pos, col, n * 3)) n++;
  geo.setDrawRange(0, n);
  if (n || geo._lastN) {
    geo.attributes.position.needsUpdate = true;
    if (col) geo.attributes.color.needsUpdate = true;
  }
  geo._lastN = n;
}

export function updateThrowables3D(dt, world, sc) {
  if (!sc) return;
  if (!scene) init(sc);
  for (const b of blasts) burstFx(b);
  blasts.length = 0;
  for (const s of splashes) {
    if (s.hit === 'ped' || s.hit === 'car' || Math.random() < 0.3) spawnFxPuff(s.x, Math.max(0.05, s.z), s.y, (Math.random() - 0.5) * 0.6, 0.5, (Math.random() - 0.5) * 0.6, 0.35, 0.08, 0.3, 0.85, 0.92, 1, 0.45, 2, -1);
  }
  splashes.length = 0;

  const live = new Set(items);
  for (const [it, m] of itemMeshes) {
    if (live.has(it)) continue;
    scene.remove(m);
    itemMeshes.delete(it);
  }
  for (const it of items) {
    let m = itemMeshes.get(it);
    if (!m) { m = buildItemMesh(it); itemMeshes.set(it, m); }
    m.position.set(it.x, it.z, it.y);
    if (it.type === 'carbid') {
      m.rotation.set(0, -it.angle, -m.userData.tilt - it.spin, 'YXZ');
      // the fuse: sparks at the lid and a thin wisp, faster towards the end
      if (dt > 0 && Math.random() < 0.5 + it.t / it.fuse) {
        const lx = it.x + Math.cos(it.angle) * 0.25, ly = it.y + Math.sin(it.angle) * 0.25;
        spark(lx, it.z + 0.05, ly, (Math.random() - 0.5) * 1.5, 1 + Math.random() * 1.5, (Math.random() - 0.5) * 1.5, 0.25, 1, 0.75, 0.3);
        if (Math.random() < 0.3) spawnFxPuff(lx, it.z + 0.1, ly, 0, 0.4, 0, 0.8, 0.05, 0.35, 0.85, 0.85, 0.85, 0.25, 1.5, 0.3);
      }
    } else {
      const sp = Math.hypot(it.vx, it.vy);
      m.rotation.set(0, -Math.atan2(it.vy, it.vx), -Math.atan2(sp, it.vz), 'YXZ');
      if (dt > 0) {
        for (let k = 0; k < 3; k++) spark(it.x - it.vx * 0.012 * k, it.z - it.vz * 0.012 * k, it.y - it.vy * 0.012 * k, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2 - 1, (Math.random() - 0.5) * 1.2, 0.35, 1, 0.7, 0.3);
        if (Math.random() < 0.5) spawnFxSpark(it.x, it.z, it.y, (Math.random() - 0.5) * 2, -1, (Math.random() - 0.5) * 2, 0.3);
      }
    }
  }

  const s = sparks;
  if (dt > 0) {
    for (let i = s.n - 1; i >= 0; i--) {
      s.life[i] -= dt;
      if (s.life[i] <= 0) {
        const j = --s.n;
        s.x[i] = s.x[j]; s.y[i] = s.y[j]; s.z[i] = s.z[j]; s.vx[i] = s.vx[j]; s.vy[i] = s.vy[j]; s.vz[i] = s.vz[j];
        s.life[i] = s.life[j]; s.max[i] = s.max[j]; s.r[i] = s.r[j]; s.g[i] = s.g[j]; s.b[i] = s.b[j];
        continue;
      }
      const drag = Math.exp(-dt * 2.2);
      s.vx[i] *= drag; s.vz[i] *= drag; s.vy[i] = s.vy[i] * drag - 3.5 * dt;
      s.x[i] += s.vx[i] * dt; s.y[i] += s.vy[i] * dt; s.z[i] += s.vz[i] * dt;
    }
  }
  writePoints(sparkPts, s.n, (i, pos, col, o) => {
    const k = s.life[i] / s.max[i];
    const tw = k < 0.5 && Math.random() < 0.3 ? 0.2 : 1;
    pos[o] = s.x[i]; pos[o + 1] = s.y[i]; pos[o + 2] = s.z[i];
    col[o] = s.r[i] * k * tw; col[o + 1] = s.g[i] * k * tw; col[o + 2] = s.b[i] * k * tw;
    return true;
  });
  writePoints(waterPts, drops.length, (i, pos, col, o) => {
    const d = drops[i];
    pos[o] = d.x; pos[o + 1] = d.z; pos[o + 2] = d.y;
    return true;
  });

  for (let i = fireballs.length - 1; i >= 0; i--) {
    if (updateVehicleExplosionMesh3D(fireballs[i], dt)) continue;
    const f = fireballs[i];
    scene.remove(f);
    f.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    fireballs.splice(i, 1);
  }
}

throwablesHook.update3D = updateThrowables3D; // gunfx3d.js draws them (latehooks.js)
