import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { disableVehicle } from './vehiclewreck.js';
import { reportImpact, vehicleContacts, CRASH_DAMAGE_SCALE, speedCap } from './vehicle.js';
import { clamp, closestPointOnSegment, isInWater } from './util.js';
import { setWallBrokenTest } from './elevation.js';
import { rand as rnd } from './rng.js';
import { SpatialGrid } from './spatialgrid.js';
import { touchesProp } from './flightrules.js';
import { buildingAt } from './tileplace.js';

// Breakable street props. Owning modules register colliders near the player
// (addProp/removeProp); vehicles test against them each frame. Below a prop's
// breakSpeed it is a solid post, above it the static instance is hidden by
// its owner (prop.onBreak) and a dynamic copy (prop.makeMesh) tumbles away.
// Props are capsules: centre (x, y), half-axis (hx, hy), radius r.

const GRID = 8;
const VEHICLE_RANGE = 60;
const MAX_BODIES = 40;
const BODY_LIFE = 26;
const FADE_TIME = 1.2;
const RESPAWN_AFTER = 180;
const RESPAWN_DIST = 190;
const STREAM_INTERVAL = 0.25;
const G = 9.81;
const CAR_KG_PER_M2 = 190;
const MAX_DRIFT = 8;
const MAX_SPIN = 3.5;

export const PROP_DEFAULTS = {
  bench: { r: 0.32, half: 0.7, h: 0.9, mass: 60, material: 'wood', breakSpeed: 2.5, breakCost: 0.8 },
  bin: { r: 0.3, h: 0.9, mass: 10, material: 'metal', breakSpeed: 0.3, breakCost: 0.1, burst: 'litter' },
  chair: { r: 0.26, h: 0.9, mass: 5, material: 'plastic', breakSpeed: 0.2, breakCost: 0 },
  table: { r: 0.38, h: 0.8, mass: 14, material: 'metal', breakSpeed: 0.4, breakCost: 0.2 },
  parasol: { r: 0.3, h: 2.4, mass: 12, material: 'plastic', breakSpeed: 0.6, breakCost: 0.2 },
  bike: { r: 0.26, half: 0.42, h: 1.05, mass: 18, material: 'metal', breakSpeed: 0.3, breakCost: 0.1 },
  rail: { r: 0.14, half: 1, h: 0.45, mass: 35, material: 'metal', breakSpeed: 3, breakCost: 0.6 },
  stall: { r: 0.95, half: 0.55, h: 2.3, mass: 110, material: 'wood', breakSpeed: 3, breakCost: 1.5, burst: 'produce' },
  lamp: { r: 0.17, h: 5.6, mass: 320, material: 'metal', breakSpeed: 5.5, breakCost: 3, topple: true, burst: 'glass' },
  trafficlight: { r: 0.16, h: 3.7, mass: 260, material: 'metal', breakSpeed: 5, breakCost: 2.5, topple: true, burst: 'signal' },
  flitspaal: { r: 0.3, h: 3.5, mass: 420, material: 'metal', breakSpeed: 6.5, breakCost: 3.5, topple: true, burst: 'sparks', wanted: true },
  tree: { r: 0.28, h: 6, mass: 600, material: 'foliage', breakSpeed: 10, breakCost: 4, topple: true, burst: 'leaves' },
  // the ring's steel crash barriers and the fences along its cuttings
  // (elevation.js wall pieces): like a bridge railing, a car at speed or
  // scraping along hard knocks a section out
  vangrail: { r: 0.14, half: 1, h: 0.8, mass: 90, material: 'metal', breakSpeed: 4.5, breakCost: 1.2, glance: 0.25, minBreakKg: 500 },
  hek: { r: 0.08, half: 1, h: 1.1, mass: 40, material: 'metal', breakSpeed: 3.4, breakCost: 0.6, glance: 0.25, minBreakKg: 400 },
};

const grid = new SpatialGrid(GRID);
let propCount = 0;
const broken = new Map();
setWallBrokenTest((key) => broken.has(key));
const bodies = [];
const prevPos = new WeakMap();
let scene = null;
let root = null;
let world = null;
let streamTimer = 0;
let respawnTimer = 0;
let playerPrev = null;

export function propKey(kind, x, y) {
  return kind + '@' + Math.round(x * 10) + ',' + Math.round(y * 10);
}

export function isPropBroken(key) {
  return broken.has(key);
}

export function propsInRadius(x, y, r, kinds = null) {
  const out = [];
  propsNear(x, y, r, out);
  return out.filter((p) => (!kinds || kinds.includes(p.kind)) && Math.hypot(p.x - x, p.y - y) <= r);
}

// Takes a prop out of the world without breaking it (e.g. a parked bike that
// is ridden away): hidden like a broken one, back with the usual respawn.
export function claimProp(p) {
  if (broken.has(p.key)) return false;
  removeProp(p);
  p.shotHits = 0;
  broken.set(p.key, { t: world ? world.time : 0, x: p.x, y: p.y, restore: p.onRestore || null });
  if (p.onBreak) p.onBreak(p);
  return true;
}

// opts: kind + x, y, optional angle (axis direction for capsule props), any
// PROP_DEFAULTS override, onBreak(prop), makeMesh(prop) -> Object3D at the
// prop's base, disposeMesh, onRestore(), key.
export function makeProp(kind, x, y, opts = {}) {
  const d = PROP_DEFAULTS[kind];
  const p = { ...d, kind, x, y, angle: 0, ...opts };
  const half = p.half || 0;
  p.hx = Math.cos(p.angle) * half;
  p.hy = Math.sin(p.angle) * half;
  p.key = p.key || propKey(kind, x, y);
  p.cell = null;
  p.off = false;
  return p;
}

export function addProp(p) {
  if (p.cell || broken.has(p.key)) return false;
  grid.insertPoint(p, p.x, p.y);
  p.cell = [p.x, p.y, p.x, p.y]; // where it went in, so removeProp finds it even if x/y moved
  propCount++;
  return true;
}

export function removeProp(p) {
  if (!p.cell) return;
  grid.remove(p, p.cell);
  p.cell = null;
  propCount--;
}

export function propsNearInto(x, y, r, out) {
  return propsNear(x, y, r, out);
}

function propsNear(x, y, r, out) {
  out.length = 0;
  for (const p of grid.queryRadius(x, y, r)) if (!p.off) out.push(p);
  return out;
}

// --- vehicle helpers (mirrors vehicle.js's rigid-body conventions) --------------

function carMass(v) {
  return Math.max(0.3, v.model.len * v.model.wid);
}

function carKg(v) {
  return carMass(v) * CAR_KG_PER_M2;
}

function setCarVelocity(v, vx, vy) {
  const fx = Math.cos(v.angle), fy = Math.sin(v.angle);
  const cap = speedCap(v);
  v.speed = clamp(vx * fx + vy * fy, -cap, cap);
  const lat = vy * fx - vx * fy;
  v.driftX = clamp(-fy * lat, -MAX_DRIFT, MAX_DRIFT);
  v.driftY = clamp(fx * lat, -MAX_DRIFT, MAX_DRIFT);
}

function damageCar(v, dmg) {
  if (dmg <= 0 || v.wrecked || v.disabled) return;
  v.health = Math.max(0, v.health - dmg * CRASH_DAMAGE_SCALE);
  if (v.health <= 0) disableVehicle(v, v.driver === 'player', world);
}

function recordContact(v, x, y, nx, ny, impact, slide) {
  const vc = vehicleContacts;
  const c = vc.list[vc.head % vc.cap];
  vc.head++;
  c.a = v; c.b = null; c.x = x; c.y = y; c.nx = nx; c.ny = ny; c.impact = impact; c.slide = slide;
}

function audio(x, y, strength, material) {
  const q = world.audioEvents || (world.audioEvents = []);
  if (q.length < 64) q.push({ kind: 'prop_hit', x, y, strength: clamp(strength, 0, 1), material });
}

// Closest points between the vehicle axis segment and the prop axis segment.
function closestSegSeg(ax, ay, bx, by, cx, cy, dx, dy) {
  let best = closestPointOnSegment(cx, cy, ax, ay, bx, by);
  let r = { px: best.x, py: best.y, qx: cx, qy: cy, d2: best.dist2 };
  if (cx !== dx || cy !== dy) {
    let c = closestPointOnSegment(dx, dy, ax, ay, bx, by);
    if (c.dist2 < r.d2) r = { px: c.x, py: c.y, qx: dx, qy: dy, d2: c.dist2 };
    c = closestPointOnSegment(ax, ay, cx, cy, dx, dy);
    if (c.dist2 < r.d2) r = { px: ax, py: ay, qx: c.x, qy: c.y, d2: c.dist2 };
    c = closestPointOnSegment(bx, by, cx, cy, dx, dy);
    if (c.dist2 < r.d2) r = { px: bx, py: by, qx: c.x, qy: c.y, d2: c.dist2 };
  }
  return r;
}

function testCapsule(v, x, y, angle, p) {
  const seg = Math.max(0, v.halfLen - v.halfWid);
  const fx = Math.cos(angle) * seg, fy = Math.sin(angle) * seg;
  const r = closestSegSeg(x - fx, y - fy, x + fx, y + fy, p.x - p.hx, p.y - p.hy, p.x + p.hx, p.y + p.hy);
  const minD = v.halfWid + 0.05 + p.r;
  if (r.d2 >= minD * minD) return null;
  const d = Math.sqrt(r.d2);
  let nx, ny;
  if (d > 1e-4) { nx = (r.qx - r.px) / d; ny = (r.qy - r.py) / d; }
  else { nx = Math.cos(angle); ny = Math.sin(angle); }
  return { nx, ny, pen: minD - d, cx: r.px + nx * (v.halfWid + 0.05), cy: r.py + ny * (v.halfWid + 0.05) };
}

const _near = [];

export function resolvePropCollisions(vehicles, w) {
  world = w;
  const pl = w.player;
  for (const v of vehicles) {
    if (v.wrecked || v.sinking || (v.isHeli && !v.onGround)) continue;
    const mine = v.driver === 'player';
    if (!mine && (v.isBike || v.isScooter)) continue;
    const dx = v.x - pl.x, dy = v.y - pl.y;
    if (dx * dx + dy * dy > VEHICLE_RANGE * VEHICLE_RANGE) { prevPos.delete(v); continue; }
    let prev = prevPos.get(v);
    if (!prev) prevPos.set(v, prev = { x: v.x, y: v.y, a: v.angle });
    const moving = Math.abs(v.speed) > 0.15 || Math.abs(v.driftX) + Math.abs(v.driftY) > 0.15;
    if (moving) {
      const near = propsNear(v.x, v.y, v.halfLen + 2 + Math.hypot(v.x - prev.x, v.y - prev.y), _near);
      if (near.length) collideVehicle(v, prev, near);
    }
    prev.x = v.x; prev.y = v.y; prev.a = v.angle;
  }
}

function collideVehicle(v, prev, near) {
  const step = Math.hypot(v.x - prev.x, v.y - prev.y);
  const n = step > 0.5 && step < 6 ? Math.ceil(step / 0.5) : 1;
  const boat = !!v.isBoat;
  const vz = v.z || 0;
  for (const p of near) {
    if (!p.cell || !!p.water !== boat || Math.abs(vz - (p.z || 0)) > 3 || (p.top != null && vz > p.top - 0.3) || (p.base != null && vz < p.base)) continue;
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const x = prev.x + (v.x - prev.x) * t, y = prev.y + (v.y - prev.y) * t;
      const hit = testCapsule(v, x, y, v.angle, p);
      if (!hit) continue;
      if (t < 1) { v.x = x; v.y = y; }
      hitProp(v, p, hit);
      break;
    }
  }
}

function hitProp(v, p, hit) {
  const { nx, ny } = hit;
  const vx = Math.cos(v.angle) * v.speed + v.driftX, vy = Math.sin(v.angle) * v.speed + v.driftY;
  const rx = hit.cx - v.x, ry = hit.cy - v.y;
  const pvx = vx - v.yawVel * ry, pvy = vy + v.yawVel * rx;
  const vn = pvx * nx + pvy * ny;
  const slide = Math.abs(-pvx * ny + pvy * nx);
  const mine = v.driver === 'player';
  // glance: long props (railings) also give way to a car scraping along them
  const hitSpeed = p.glance && vn > 0.5 ? vn + slide * p.glance : vn;
  if (hitSpeed > p.breakSpeed && (!p.minBreakKg || carKg(v) >= p.minBreakKg)) {
    breakByVehicle(v, p, hit, vx, vy, Math.max(vn, 0.5));
    return;
  }
  v.x -= nx * hit.pen;
  v.y -= ny * hit.pen;
  if (vn <= 0) return;
  const m = carMass(v);
  const I = m * (v.model.len ** 2 + v.model.wid ** 2) / 12;
  const rn = rx * ny - ry * nx;
  const resting = vn < 1;
  const e = resting ? 0 : 0.22;
  const jn = (1 + e) * vn / (1 / m + (resting ? 0 : rn * rn / I));
  const tx = -ny, ty = nx;
  const vt = pvx * tx + pvy * ty;
  const jt = clamp(-vt * m, -0.3 * jn, 0.3 * jn);
  const jx = -jn * nx + jt * tx, jy = -jn * ny + jt * ty;
  setCarVelocity(v, vx + jx / m, vy + jy / m);
  if (!resting) v.yawVel = clamp(v.yawVel + (rx * jy - ry * jx) / I, -MAX_SPIN, MAX_SPIN);
  if (vn < 1.2) return;
  recordContact(v, hit.cx, hit.cy, nx, ny, vn, slide);
  reportImpact(world, hit.cx, hit.cy, vn, mine);
  audio(hit.cx, hit.cy, vn / 14, p.material);
  if (vn > 4.5) damageCar(v, Math.min(22, (vn - 4.5) * 2.4 * (p.kind === 'tree' ? 1.15 : 1)));
  if (p.kind === 'tree' && vn > 3) burstLeaves(p, 4 + vn, vx, vy);
}

function breakByVehicle(v, p, hit, vx, vy, vn) {
  const { nx, ny } = hit;
  const mc = carKg(v), mp = p.mass;
  const dvn = Math.min(vn, vn * mp / (mc + mp) + p.breakCost * clamp(mp / mc * 4, 0.1, 1));
  setCarVelocity(v, vx - nx * dvn, vy - ny * dvn);
  const mine = v.driver === 'player';
  const eff = vn * clamp(mp / 300, 0.12, 1);
  damageCar(v, clamp(vn * mp / 900 * 3, 0, 20));
  if (mp >= 40 && eff > 1.5) recordContact(v, hit.cx, hit.cy, nx, ny, eff, 0);
  if (eff > 2) reportImpact(world, hit.cx, hit.cy, eff, mine);
  const kick = 0.1 + 0.95 * mc / (mc + mp);
  const tvx = vx - nx * (vx * nx + vy * ny), tvy = vy - ny * (vx * nx + vy * ny);
  breakProp(p, {
    vx: nx * vn * kick + tvx * 0.35,
    vy: ny * vn * kick + tvy * 0.35,
    speed: vn,
    lift: clamp(mc / (mc + mp), 0.2, 1),
    nx, ny,
    byPlayer: mine,
    heavy: mc,
  });
}

// hit: { vx, vy, speed, lift, nx, ny, byPlayer }
export function breakProp(p, hit) {
  if (broken.has(p.key)) return;
  removeProp(p);
  broken.set(p.key, { t: world.time, x: p.x, y: p.y, restore: p.onRestore || null });
  if (p.onBreak) p.onBreak(p);
  audio(p.x, p.y, 0.25 + hit.speed / 18 * clamp(p.mass / 150, 0.3, 1), p.material);
  spawnBody(p, hit);
  burst(p, hit);
  if (p.wanted && hit.byPlayer) raiseWanted(p);
}

function policeSees() {
  const pl = world.player;
  for (const v of world.vehicles) {
    if (!v.isPolice || v.hijacked || v.wrecked || v.driver === 'player') continue;
    if (v._sees && Math.hypot(v.x - pl.x, v.y - pl.y) < 70) return true;
  }
  for (const c of world.pedestrians) {
    if (c.isCop && c.state !== 'dead' && c._sees && Math.hypot(c.x - pl.x, c.y - pl.y) < 40) return true;
  }
  return false;
}

function raiseWanted(p) {
  const what = p.kind === 'flitspaal' ? 'flitspaal' : 'verkeerslicht';
  if (!policeSees()) {
    if (p.kind === 'flitspaal') world.addMessage('Flitspaal gesloopt. Niemand heeft het gezien...', 3);
    return;
  }
  world.wanted = Math.min(5, (world.wanted || 0) + 1);
  world.addMessage(`De politie zag je dat ${what} slopen!`, 3);
}

// --- dynamic bodies -------------------------------------------------------------

const _box = new THREE.Box3();
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const DOWN = new THREE.Vector3(0, -1, 0);
const AXES = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map((a) => new THREE.Vector3(...a));

function spawnBody(p, hit) {
  if (!root || !p.makeMesh) return;
  const mesh = p.makeMesh(p);
  if (!mesh) return;
  while (bodies.length >= MAX_BODIES) removeBody(bodies[0]);
  mesh.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const inner = new THREE.Group();
  inner.add(mesh);
  inner.updateMatrixWorld(true);
  _box.setFromObject(inner);
  const size = _box.getSize(new THREE.Vector3());
  const obj = new THREE.Group();
  obj.add(inner);
  const b = {
    p, obj, inner, mesh, life: 0, sleep: false, mass: p.mass, kickAt: 0, floor: p.z || 0,
    half: size.clone().multiplyScalar(0.5),
    x: p.x, y: 0, z: p.y, vx: hit.vx, vy: 0, vz: hit.vy,
    w: new THREE.Vector3(), q: new THREE.Quaternion(),
    topple: false, theta: 0, omega: 0, axis: new THREE.Vector3(), thetaMax: Math.PI / 2,
  };
  if (p.topple) {
    b.topple = true;
    const hh = Math.max(1, _box.max.y);
    b.axis.set(hit.ny, 0, -hit.nx).normalize();
    b.omega = clamp(hit.speed * 1.1 / hh, 0.6, 4.5);
    b.thetaMax = Math.acos(clamp(Math.min(size.x, size.z) * 0.5 / (hh * 0.8), 0, 0.95));
    // a tree's canopy would prop it up at ~60 deg; let it lie nearly flat and
    // squash the crown slightly into the ground instead
    if (p.kind === 'tree') {
      b.thetaMax = 1.45;
      b.sinkDepth = Math.min(size.x, size.z) * 0.3;
    }
    const slide = clamp(0.5 - p.mass / 1500, 0.1, 0.4);
    b.vx *= slide; b.vz *= slide;
    b.len = hh;
    obj.position.set(p.x, 0, p.y);
  } else if (p.slide) {
    // heavy: shoved along the ground with a scrape and a slow turn, no flight
    const c = _box.getCenter(new THREE.Vector3());
    inner.position.set(-c.x, -c.y, -c.z);
    b.x = p.x + c.x; b.y = c.y + (p.z || 0); b.z = p.y + c.z;
    b.vy = 0;
    b.slide = true;
    const hs = Math.hypot(b.vx, b.vz), cap = 9;
    if (hs > cap) { b.vx *= cap / hs; b.vz *= cap / hs; }
    b.w.set(0, (Math.random() - 0.5) * Math.min(3, hit.speed * 0.3), 0);
    obj.position.set(b.x, b.y, b.z);
  } else {
    const c = _box.getCenter(new THREE.Vector3());
    inner.position.set(-c.x, -c.y, -c.z);
    b.x = p.x + c.x; b.y = c.y + (p.z || 0); b.z = p.y + c.z;
    b.vy = Math.min(6.5, (1 + hit.speed * 0.2 * hit.lift) * (0.75 + Math.random() * 0.5)) * clamp(1.25 - p.mass / 250, 0.5, 1);
    const hs = Math.hypot(b.vx, b.vz);
    if (hs > 26) { b.vx *= 26 / hs; b.vz *= 26 / hs; }
    const spin = clamp(hit.speed * 0.7 / Math.max(0.4, size.length() * 0.5), 1, 14);
    b.w.set(hit.ny, 0, -hit.nx).multiplyScalar(spin * (0.7 + Math.random() * 0.5));
    b.w.x += (Math.random() - 0.5) * spin * 0.6;
    b.w.y += (Math.random() - 0.5) * spin * 0.8;
    b.w.z += (Math.random() - 0.5) * spin * 0.6;
    obj.position.set(b.x, b.y, b.z);
  }
  root.add(obj);
  bodies.push(b);
}

function removeBody(b) {
  const i = bodies.indexOf(b);
  if (i >= 0) bodies.splice(i, 1);
  root.remove(b.obj);
  if (b.p.disposeMesh) {
    b.mesh.traverse((o) => {
      if (!o.isMesh) return;
      o.geometry.dispose();
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose();
    });
  }
}

function lowestCorner(b) {
  let min = Infinity;
  const h = b.half;
  for (let i = 0; i < 8; i++) {
    _v.set(i & 1 ? h.x : -h.x, i & 2 ? h.y : -h.y, i & 4 ? h.z : -h.z).applyQuaternion(b.q);
    if (_v.y < min) min = _v.y;
  }
  return min;
}

function stepFree(b, dt) {
  const ox = b.x, oz = b.z;
  b.vy -= G * dt;
  b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
  if ((b.vx || b.vz) && buildingAt(world.map, b.x, b.z)) {
    b.x = ox; b.z = oz;
    b.vx *= -0.3; b.vz *= -0.3;
  }
  const wl = b.w.length();
  if (wl > 1e-4) {
    _q.setFromAxisAngle(_v2.copy(b.w).multiplyScalar(1 / wl), wl * dt);
    b.q.premultiply(_q).normalize();
  }
  const low = b.y + lowestCorner(b) - (b.floor || 0);
  let ground = false;
  if (low < 0) {
    ground = true;
    b.y -= low;
    if (b.vy < 0) {
      if (b.vy < -1.5) {
        b.vy = -b.vy * 0.28;
        if (b.vy > 1.2 && b.mass >= 20) audio(b.x, b.z, b.vy / 8, b.p.material);
      } else b.vy = 0;
    }
    const f = Math.exp(-3.5 * dt);
    b.vx *= f; b.vz *= f;
    b.w.multiplyScalar(Math.exp(-2.5 * dt));
  }
  if (ground && Math.hypot(b.vx, b.vz) < 0.6 && Math.abs(b.vy) < 0.5) {
    let best = null, bestDot = -2;
    for (const a of AXES) {
      _v.copy(a).applyQuaternion(b.q);
      const d = _v.dot(DOWN);
      if (d > bestDot) { bestDot = d; best = a; }
    }
    _v.copy(best).applyQuaternion(b.q);
    _q2.setFromUnitVectors(_v, DOWN).multiply(b.q);
    b.q.slerp(_q2, Math.min(1, 5 * dt));
    b.w.multiplyScalar(Math.exp(-6 * dt));
    if (bestDot > 0.999 && b.w.length() < 0.05 && Math.hypot(b.vx, b.vz) < 0.05) b.sleep = true;
  }
  if (isInWater(world.map, b.x, b.z) && b.y < 0.6) sinkBody(b);
  b.obj.position.set(b.x, b.y, b.z);
  b.obj.quaternion.copy(b.q);
}

function stepTopple(b, dt) {
  if (b.theta < b.thetaMax) {
    b.omega += 1.5 * G / b.len * Math.sin(Math.max(0.05, b.theta)) * dt;
    b.theta += b.omega * dt;
    if (b.theta >= b.thetaMax) {
      b.theta = b.thetaMax;
      if (b.omega > 1.2) audio(b.x, b.z, Math.min(1, b.omega / 4 * b.mass / 400), b.p.material);
      if (b.p.kind === 'tree') burstLeaves(b.p, 18, b.vx, b.vz, b.axis, b.len);
      b.omega = -b.omega * 0.18;
      if (Math.abs(b.omega) < 0.25) b.omega = 0;
    }
  } else if (b.omega < 0) {
    b.theta += b.omega * dt;
    b.omega += 1.5 * G / b.len * dt;
    if (b.theta >= b.thetaMax) { b.theta = b.thetaMax; b.omega = 0; }
  }
  const ox = b.x, oz = b.z;
  const f = Math.exp(-(b.theta >= b.thetaMax ? 5 : 1.5) * dt);
  b.vx *= f; b.vz *= f;
  b.x += b.vx * dt; b.z += b.vz * dt;
  if (buildingAt(world.map, b.x, b.z)) { b.x = ox; b.z = oz; b.vx = b.vz = 0; }
  if (b.theta >= b.thetaMax && b.omega === 0 && Math.hypot(b.vx, b.vz) < 0.05) b.sleep = true;
  b.obj.position.set(b.x, b.sinkDepth ? -b.sinkDepth * (b.theta / b.thetaMax) : 0, b.z);
  b.obj.quaternion.setFromAxisAngle(b.axis, b.theta);
}

function stepSlide(b, dt) {
  const ox = b.x, oz = b.z;
  const f = Math.exp(-2.6 * dt);
  b.vx *= f; b.vz *= f;
  b.x += b.vx * dt; b.z += b.vz * dt;
  if (buildingAt(world.map, b.x, b.z)) { b.x = ox; b.z = oz; b.vx *= -0.2; b.vz *= -0.2; }
  const wl = Math.abs(b.w.y);
  if (wl > 1e-3) {
    _q.setFromAxisAngle(_v2.set(0, 1, 0), b.w.y * dt);
    b.q.premultiply(_q).normalize();
    b.w.y *= f;
  }
  const sp = Math.hypot(b.vx, b.vz);
  if (sp > 1.5 && Math.random() < dt * 6) audio(b.x, b.z, Math.min(0.5, sp / 16), b.p.material);
  if (isInWater(world.map, b.x, b.z)) sinkBody(b);
  if (sp < 0.05 && wl < 0.02) b.sleep = true;
  b.obj.position.set(b.x, b.y, b.z);
  b.obj.quaternion.copy(b.q);
}

function sinkBody(b) {
  world.particles.push({ kind: 'splash', x: b.x, y: b.z, until: world.time + 1.2 });
  b.life = Math.max(b.life, BODY_LIFE);
  b.vx = b.vz = 0;
  b.vy = -0.5;
  b.sinking = true;
}

function updateBodies(dt) {
  for (let i = bodies.length - 1; i >= 0; i--) {
    const b = bodies[i];
    b.life += dt;
    if (!b.sleep) {
      if (b.sinking) { b.y -= dt * 0.8; b.obj.position.y = b.y; }
      else if (b.slide) stepSlide(b, dt);
      else if (b.topple) stepTopple(b, dt);
      else stepFree(b, dt);
    }
    if (b.life > BODY_LIFE) {
      const k = 1 - (b.life - BODY_LIFE) / FADE_TIME;
      if (k <= 0) { removeBody(b); continue; }
      b.obj.scale.setScalar(k);
    }
  }
}

function kickBodies() {
  const pl = world.player;
  for (const b of bodies) {
    if (b.topple || (b.mass > 150 && !b.slide) || b.sinking || world.time < b.kickAt || b.y > 1.8) continue;
    for (const v of world.vehicles) {
      if (v.wrecked || v.isBoat) continue;
      const dx = v.x - pl.x, dy = v.y - pl.y;
      if (dx * dx + dy * dy > VEHICLE_RANGE * VEHICLE_RANGE) continue;
      const sp = Math.abs(v.speed);
      if (sp < 1.5) continue;
      const seg = Math.max(0, v.halfLen - v.halfWid);
      const fx = Math.cos(v.angle), fy = Math.sin(v.angle);
      const c = closestPointOnSegment(b.x, b.z, v.x - fx * seg, v.y - fy * seg, v.x + fx * seg, v.y + fy * seg);
      const rr = v.halfWid + Math.max(0.25, Math.min(b.half.x, b.half.z));
      if (c.dist2 > rr * rr) continue;
      const d = Math.sqrt(c.dist2) || 1;
      const nx = (b.x - c.x) / d, ny = (b.z - c.y) / d;
      const vx = fx * v.speed + v.driftX, vy = fy * v.speed + v.driftY;
      if (b.slide) {
        // shoved again: pushed ahead of the bumper, the car pays for it
        const share = clamp(carKg(v) / (carKg(v) + b.mass), 0.3, 0.85);
        b.vx = vx * share + nx * 0.8; b.vz = vy * share + ny * 0.8;
        b.w.y += (Math.random() - 0.5) * 1.5;
        b.sleep = false;
        b.kickAt = world.time + 0.2;
        if (b.life > BODY_LIFE - 4) b.life = BODY_LIFE - 4;
        audio(b.x, b.z, Math.min(1, sp / 14), b.p.material);
        setCarVelocity(v, vx * (1 - (1 - share) * 0.5), vy * (1 - (1 - share) * 0.5));
        break;
      }
      const k = clamp(1.4 - b.mass / 150, 0.5, 1.3);
      b.vx = vx * k + nx * 1.5; b.vz = vy * k + ny * 1.5;
      b.vy = Math.max(b.vy, 1 + sp * 0.15);
      b.w.set(ny, 0, -nx).multiplyScalar(4 + sp * 0.4);
      b.sleep = false;
      b.kickAt = world.time + 0.25;
      if (b.life > BODY_LIFE - 4) b.life = BODY_LIFE - 4;
      audio(b.x, b.z, Math.min(1, sp / 16) * clamp(b.mass / 60, 0.3, 1), b.p.material);
      if (b.mass > 30) setCarVelocity(v, vx * 0.97, vy * 0.97);
      break;
    }
  }
}

// --- particles --------------------------------------------------------------

const PART_MAX = 260;
function makePool(material, max) {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, max);
  mesh.frustumCulled = false;
  mesh.count = 0;
  mesh.setColorAt(0, new THREE.Color(1, 1, 1));
  return {
    mesh, max, n: 0, next: 0,
    p: new Float32Array(max * 3), v: new Float32Array(max * 3), r: new Float32Array(max * 3),
    life: new Float32Array(max), age: new Float32Array(max), size: new Float32Array(max),
    drag: new Float32Array(max), flat: new Uint8Array(max),
  };
}

let debris = null, sparks = null;
const _m = new THREE.Matrix4();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

function spawnParticle(pool, x, y, z, vx, vy, vz, size, color, life, drag = 0, flat = 0) {
  if (!pool) return;
  const i = pool.next;
  pool.next = (pool.next + 1) % pool.max;
  if (pool.n < pool.max) pool.n++;
  pool.p[i * 3] = x; pool.p[i * 3 + 1] = y; pool.p[i * 3 + 2] = z;
  pool.v[i * 3] = vx; pool.v[i * 3 + 1] = vy; pool.v[i * 3 + 2] = vz;
  pool.r[i * 3] = Math.random() * 6; pool.r[i * 3 + 1] = Math.random() * 6; pool.r[i * 3 + 2] = Math.random() * 6;
  pool.life[i] = life; pool.age[i] = 0; pool.size[i] = size; pool.drag[i] = drag; pool.flat[i] = flat;
  pool.mesh.setColorAt(i, _c.setHex(color));
  if (pool.mesh.instanceColor) pool.mesh.instanceColor.needsUpdate = true;
}

function updatePool(pool, dt) {
  if (!pool.n) return;
  let alive = 0;
  for (let i = 0; i < pool.n; i++) {
    const s0 = pool.size[i];
    let s = 0;
    if (pool.age[i] < pool.life[i]) {
      pool.age[i] += dt;
      const k = i * 3, drag = pool.drag[i];
      pool.v[k + 1] -= G * (drag > 0 ? 0.25 : 1) * dt;
      if (drag > 0) {
        const f = Math.exp(-drag * dt);
        pool.v[k] *= f; pool.v[k + 2] *= f;
        pool.v[k + 1] = Math.max(pool.v[k + 1], -1.2);
        pool.v[k] += Math.sin(pool.age[i] * 5 + i) * dt * 1.5;
      }
      pool.p[k] += pool.v[k] * dt; pool.p[k + 1] += pool.v[k + 1] * dt; pool.p[k + 2] += pool.v[k + 2] * dt;
      if (pool.p[k + 1] < s0 * 0.3) {
        pool.p[k + 1] = s0 * 0.3;
        pool.v[k + 1] = pool.v[k + 1] < -2 ? -pool.v[k + 1] * 0.3 : 0;
        pool.v[k] *= 0.6; pool.v[k + 2] *= 0.6;
      } else {
        pool.r[k] += dt * 6; pool.r[k + 2] += dt * 4;
      }
      const left = pool.life[i] - pool.age[i];
      s = s0 * Math.min(1, left / 0.6);
      if (left > 0) alive++;
    }
    const k = i * 3;
    _e.set(pool.r[k], pool.r[k + 1], pool.r[k + 2]);
    _q.setFromEuler(_e);
    _s.set(s, pool.flat[i] ? s * 0.15 : s * 0.7, s);
    _m.compose(_v.set(pool.p[k], pool.p[k + 1], pool.p[k + 2]), _q, _s);
    pool.mesh.setMatrixAt(i, _m);
  }
  pool.mesh.count = pool.n;
  pool.mesh.instanceMatrix.needsUpdate = true;
  if (!alive) { pool.n = 0; pool.next = 0; pool.mesh.count = 0; }
}

const LEAF = [0x3f6634, 0x4a7236, 0x56793a, 0x6b8a3a, 0x7a6a2a];
const LITTER = [0xece8de, 0xd8d0c0, 0xb8352a, 0x3a6ea5, 0x2a2a2a, 0xc9a227, 0x9a9a98];
const PRODUCE = [0xb8352a, 0x6f9a3a, 0xd98a2b, 0xe0c24a, 0x7a3b5a, 0x9ab84a, 0xc9a07a];
const WOOD = [0x8a6a3a, 0x6e4a2f, 0x9a7048];
const GLASS = [0xe8f0f0, 0xd0e4ea, 0xfff4c8];
const SIGNAL = [0xe74c3c, 0xf1c40f, 0x2ecc40, 0x1b1d1f];

function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

function burstLeaves(p, n, vx = 0, vy = 0, axis = null, len = 0) {
  let x = p.x, z = p.y, y = 4;
  if (axis) {
    x = p.x - axis.z * len * 0.7;
    z = p.y + axis.x * len * 0.7;
    y = 1.2;
  }
  for (let i = 0; i < n; i++) {
    spawnParticle(debris, x + rnd(-1.5, 1.5), y + rnd(-1, 1.5), z + rnd(-1.5, 1.5),
      vx * 0.2 + rnd(-2.5, 2.5), rnd(0.5, 3), vy * 0.2 + rnd(-2.5, 2.5), rnd(0.12, 0.22), pick(LEAF), rnd(3, 5.5), 1.8, 1);
  }
}

function burst(p, hit) {
  const vx = hit.vx, vz = hit.vy;
  const cnt = (n) => Math.round(n * (0.6 + Math.min(1, hit.speed / 15) * 0.6));
  switch (p.burst) {
    case 'leaves': burstLeaves(p, cnt(26), vx, vz); break;
    case 'litter':
      for (let i = 0; i < cnt(12); i++) spawnParticle(debris, p.x, rnd(0.4, 0.9), p.y, vx * rnd(0.3, 0.9) + rnd(-2, 2), rnd(1.5, 4), vz * rnd(0.3, 0.9) + rnd(-2, 2), rnd(0.07, 0.14), pick(LITTER), rnd(6, 10), Math.random() < 0.5 ? 1.2 : 0, Math.random() < 0.6 ? 1 : 0);
      break;
    case 'produce':
      for (let i = 0; i < cnt(22); i++) spawnParticle(debris, p.x + rnd(-1, 1), rnd(0.9, 1.2), p.y + rnd(-1, 1), vx * rnd(0.3, 0.8) + rnd(-3, 3), rnd(1.5, 4.5), vz * rnd(0.3, 0.8) + rnd(-3, 3), rnd(0.12, 0.2), pick(PRODUCE), rnd(8, 12));
      break;
    case 'glass':
      for (let i = 0; i < cnt(10); i++) spawnParticle(debris, p.x, rnd(3, 5.4), p.y, vx * 0.3 + rnd(-2, 2), rnd(0, 2), vz * 0.3 + rnd(-2, 2), rnd(0.05, 0.1), pick(GLASS), rnd(4, 7), 0, 1);
      break;
    case 'posters':
      for (let i = 0; i < cnt(18); i++) spawnParticle(debris, p.x + rnd(-0.5, 0.5), rnd(0.6, 2.6), p.y + rnd(-0.5, 0.5), vx * rnd(0.2, 0.6) + rnd(-2.5, 2.5), rnd(1, 3.5), vz * rnd(0.2, 0.6) + rnd(-2.5, 2.5), rnd(0.1, 0.2), pick(LITTER), rnd(6, 10), 1.6, 1);
      for (let i = 0; i < cnt(10); i++) {
        const a = Math.random() * Math.PI * 2, s = rnd(2, 5);
        spawnParticle(sparks, p.x, rnd(0.1, 0.4), p.y, Math.cos(a) * s, rnd(1, 3), Math.sin(a) * s, rnd(0.03, 0.05), 0xffc060, rnd(0.25, 0.5));
      }
      break;
    case 'signal':
      for (let i = 0; i < cnt(10); i++) spawnParticle(debris, p.x, rnd(2.8, 3.6), p.y, vx * 0.3 + rnd(-2, 2), rnd(0, 2.5), vz * 0.3 + rnd(-2, 2), rnd(0.06, 0.11), pick(SIGNAL), rnd(4, 7), 0, 1);
      break;
    case 'sparks':
      for (let i = 0; i < cnt(26); i++) {
        const a = Math.random() * Math.PI * 2, s = rnd(2, 7);
        spawnParticle(sparks, p.x, rnd(0.2, 3.2), p.y, Math.cos(a) * s + vx * 0.2, rnd(1, 5), Math.sin(a) * s + vz * 0.2, rnd(0.03, 0.06), 0xffc060, rnd(0.3, 0.8));
      }
      for (let i = 0; i < 8; i++) spawnParticle(debris, p.x, rnd(2.8, 3.4), p.y, vx * 0.3 + rnd(-2, 2), rnd(0, 2), vz * 0.3 + rnd(-2, 2), rnd(0.05, 0.1), pick(GLASS), rnd(4, 7), 0, 1);
      break;
    default:
      if (p.material === 'wood') {
        for (let i = 0; i < cnt(8); i++) spawnParticle(debris, p.x, rnd(0.3, 0.8), p.y, vx * 0.5 + rnd(-2, 2), rnd(1, 3.5), vz * 0.5 + rnd(-2, 2), rnd(0.06, 0.16), pick(WOOD), rnd(5, 8));
      } else if (p.material === 'metal' && hit.speed > 6) {
        for (let i = 0; i < cnt(8); i++) {
          const a = Math.random() * Math.PI * 2, s = rnd(2, 5);
          spawnParticle(sparks, p.x, rnd(0.3, 0.9), p.y, Math.cos(a) * s, rnd(1, 3), Math.sin(a) * s, rnd(0.03, 0.05), 0xffc060, rnd(0.25, 0.5));
        }
      }
  }
}

// --- player on foot kicks light props -------------------------------------------

function footKicks() {
  const pl = world.player;
  if (pl.inVehicle) { playerPrev = null; return; }
  if (!playerPrev) { playerPrev = { x: pl.x, y: pl.y, t: world.time }; return; }
  const dt = Math.max(1e-3, world.time - playerPrev.t);
  const vx = (pl.x - playerPrev.x) / dt, vy = (pl.y - playerPrev.y) / dt;
  playerPrev.x = pl.x; playerPrev.y = pl.y; playerPrev.t = world.time;
  const sp = Math.hypot(vx, vy);
  if (sp < 1.8 || sp > 15) return;
  for (const p of propsNear(pl.x, pl.y, 1.5, _near)) {
    if (p.mass > 20) continue;
    if (world.pigeonMode && !touchesProp((world.pigeonAlt || 0) - (p.z || 0), p.h || 1)) continue; // a pigeon flying over it
    const c = closestPointOnSegment(pl.x, pl.y, p.x - p.hx, p.y - p.hy, p.x + p.hx, p.y + p.hy);
    const rr = p.r + 0.35;
    if (c.dist2 > rr * rr) continue;
    const nx = vx / sp, ny = vy / sp;
    breakProp(p, { vx: vx * 0.9, vy: vy * 0.9, speed: sp * 0.6, lift: 0.5, nx, ny, byPlayer: true });
  }
}

// --- per-frame --------------------------------------------------------------

function respawnCheck() {
  const pl = world.player;
  for (const [key, b] of broken) {
    if (world.time - b.t < RESPAWN_AFTER) continue;
    if (Math.hypot(b.x - pl.x, b.y - pl.y) < RESPAWN_DIST) continue;
    broken.delete(key);
    if (b.restore) b.restore();
  }
}

export function updateBreakables(dt, w, sc) {
  world = w;
  if (sc && !root) {
    scene = sc;
    root = new THREE.Group();
    root.name = 'breakables';
    scene.add(root);
    debris = makePool(new THREE.MeshLambertMaterial({ color: 0xffffff }), PART_MAX);
    sparks = makePool(new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }), 120);
    sparks.mesh.material.color.setScalar(3);
    root.add(debris.mesh, sparks.mesh);
  }
  streamTimer -= dt;
  if (streamTimer <= 0) {
    streamTimer = STREAM_INTERVAL;
    const { x, y } = w.player.inVehicle || w.player;
    for (const fn of streamers) fn(w, x, y);
  }
  if (w.paused || !root) return;
  respawnTimer -= dt;
  if (respawnTimer <= 0) { respawnTimer = 1; respawnCheck(); }
  footKicks();
  kickBodies();
  updateBodies(dt);
  updatePool(debris, dt);
  updatePool(sparks, dt);
}

// Other owners of streamed props (streetfurniture3d.js): fn(world, x, y)
// every STREAM_INTERVAL, like the trees and the traffic lights.
const streamers = [];
export function addPropStreamer(fn) {
  if (!streamers.includes(fn)) streamers.push(fn);
}

export function findProps(x, y, r) {
  return propsNear(x, y, r, []);
}

export function breakablesStats() {
  return { props: propCount, bodies: bodies.length, broken: broken.size, recent: [...broken.keys()].slice(-4),
    list: bodies.map((b) => ({ kind: b.p.kind, x: +b.obj.position.x.toFixed(1), y: +b.obj.position.y.toFixed(2), z: +b.obj.position.z.toFixed(1), theta: b.topple ? +b.theta.toFixed(2) : undefined, sleep: b.sleep })) };
}

// --- walkers (player, companion, pedestrians, animals) --------------------------

const WALK_KICK_MASS = 20;
const WALK_KICK_SPEED = 1.8;
const SEAT_KINDS = new Set(['bench', 'chair', 'table']);
// low street clutter that AI walkers weave through: their routes follow the
// facades where Groningen parks its bikes, and pressing into a bike row
// only gets them stuck
const PED_PASSABLE = new Set(['bike', 'nietje', 'scooter', 'chair', 'table', 'parasol', 'bin', 'kliko', 'stoepbord']);
const _walk = [];

// Pushes a walking circle out of every prop it overlaps. Light props (bins,
// chairs, parked bikes...) bumped at a jog or faster are kicked over instead.
// opts: { kick = true, byPlayer = false, skipSeats = false, ped = false }
// hop: how high the walker's feet are off the ground (a jump); props lower
// than that are cleared.
export function resolveWalkerProps(x, y, radius, vx = 0, vy = 0, opts = null, hop = 0, z = 0) {
  if (!propCount) return [x, y];
  const near = propsNear(x, y, radius + 2, _walk);
  if (!near.length) return [x, y];
  const kick = world && (!opts || opts.kick !== false);
  const sp = Math.hypot(vx, vy);
  for (const p of near) {
    if (!p.cell || (opts && ((opts.skipSeats && SEAT_KINDS.has(p.kind)) || (opts.ped && PED_PASSABLE.has(p.kind))))) continue;
    if (hop > 0 && hop > (p.h || 1) - HOP_MARGIN) continue;
    if (p.top != null && z > p.top - 0.3) continue;
    const c = closestPointOnSegment(x, y, p.x - p.hx, p.y - p.hy, p.x + p.hx, p.y + p.hy);
    const rr = p.r + radius;
    if (c.dist2 >= rr * rr) continue;
    if (kick && p.mass <= WALK_KICK_MASS && sp >= WALK_KICK_SPEED) {
      breakProp(p, { vx: vx * 0.9, vy: vy * 0.9, speed: sp * 0.6, lift: 0.5, nx: vx / sp, ny: vy / sp, byPlayer: !!(opts && opts.byPlayer) });
      continue;
    }
    const d = Math.sqrt(c.dist2);
    let nx, ny;
    if (d > 1e-4) { nx = (x - c.x) / d; ny = (y - c.y) / d; }
    else if (sp > 1e-3) { nx = -vx / sp; ny = -vy / sp; }
    else { nx = 1; ny = 0; }
    x = c.x + nx * rr;
    y = c.y + ny * rr;
  }
  return [x, y];
}

export const HOP_MARGIN = 0.15;

// First prop a bullet flying from (x0, y0) to (x1, y1) at height z runs into:
// { prop, t, x, y, nx, ny } (t: 0..1 along the path) or null.
export function propOnBulletPath(x0, y0, x1, y1, z) {
  if (!propCount) return null;
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  const len = Math.hypot(x1 - x0, y1 - y0);
  const near = propsNear(mx, my, len / 2 + 1.5, _ahead);
  let best = null;
  const steps = Math.max(2, Math.ceil(len / 0.12));
  for (const p of near) {
    if (!p.cell || p.water || (p.h || 1) < z - 0.05) continue;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      if (best && t >= best.t) break;
      const bx = x0 + (x1 - x0) * t, by = y0 + (y1 - y0) * t;
      const c = closestPointOnSegment(bx, by, p.x - p.hx, p.y - p.hy, p.x + p.hx, p.y + p.hy);
      if (c.dist2 >= p.r * p.r) continue;
      const d = Math.sqrt(c.dist2) || 1e-3;
      best = { prop: p, t, x: bx, y: by, nx: (bx - c.x) / d, ny: (by - c.y) / d };
      break;
    }
  }
  return best;
}

// A bullet hit: light props are knocked over, glass ones shatter, props with
// shotHp give way after that many hits, the rest only take the dent. Returns true when the prop gave way.
export function shootProp(p, dx, dy, byPlayer, weight = 1) {
  if (!p.cell || !world) return false;
  const light = p.mass <= 40 && p.breakSpeed <= 3.5;
  const glassy = p.burst === 'glass' && !p.topple;
  if (p.shotHp && !light && !glassy) {
    p.shotHits = (p.shotHits || 0) + weight;
    if (p.shotHits < p.shotHp) {
      audio(p.x, p.y, 0.25, p.material);
      return false;
    }
    breakProp(p, { vx: dx * 0.6, vy: dy * 0.6, speed: 2.5, lift: 0.3, nx: dx, ny: dy, byPlayer: !!byPlayer });
    return true;
  }
  if (!light && !glassy) {
    audio(p.x, p.y, 0.25, p.material);
    return false;
  }
  breakProp(p, { vx: dx * (light ? 3.5 : 1), vy: dy * (light ? 3.5 : 1), speed: light ? 4 : 2, lift: 0.4, nx: dx, ny: dy, byPlayer: !!byPlayer });
  return true;
}

// Nearest prop a walker at (x, y) heading along unit (dx, dy) would run into
// within `reach` metres: { dist, h, prop } or null. Used for vaulting.
export function propAhead(x, y, dx, dy, reach, radius = 0.3) {
  if (!propCount) return null;
  const near = propsNear(x + dx * reach * 0.5, y + dy * reach * 0.5, reach * 0.5 + 1.5, _ahead);
  let best = null;
  for (const p of near) {
    if (!p.cell || p.water || (p.breakSpeed === Infinity && p.top == null)) continue;
    for (let s = 0; s <= reach; s += 0.1) {
      const c = closestPointOnSegment(x + dx * s, y + dy * s, p.x - p.hx, p.y - p.hy, p.x + p.hx, p.y + p.hy);
      const rr = p.r + radius;
      if (c.dist2 >= rr * rr) continue;
      if (!best || s < best.dist) best = { dist: s, h: p.h || 1, prop: p, depth: p.r * 2 };
      break;
    }
  }
  return best;
}
const _ahead = [];

// Fixed scenery that only needs a collider (canopy posts, viaduct piers):
// registered once, never broken. `water` props only meet boats and swimmers.
// `top`: the collider ends at that height (a viaduct pier under the deck:
// whoever is up on the deck walks and drives over it).
export function addStaticCollider(kind, x, y, r, half = 0, angle = 0, water = false, top = null) {
  const p = makeProp(kind, x, y, { r, half, angle, h: top !== null ? top : 4, top, mass: 1e5, material: 'metal', breakSpeed: Infinity, breakCost: 0, water, key: propKey(kind, x, y) });
  addProp(p);
  return p;
}
