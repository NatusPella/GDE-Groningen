import { hoofdspeler } from './players.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { pointInPolygon, closestPointOnSegment, isInWater, WATER_Y } from './util.js';
import { PERSON_RIG as RIG } from './models3d_people.js';
import { inPassage } from './collision.js';

// Verlet ragdoll for every mesh built by buildPersonMesh (player, companion,
// all pedestrians incl. cops, scene NPCs and thrown-off riders). Gameplay code
// calls knockDown(actor, ...) on a hit; scene3d hands each frame's mesh to
// driveRagdoll(), which builds the body from the current pose, simulates it,
// writes the rig bones back from the particles and, for the living, plays a
// get-up once the body has settled. Particles live in three.js world space
// (x, y up, z = game y).

const N = 14;
const HL = 0, HR = 1, SL = 2, SR = 3, ST = 4, HD = 5, KL = 6, KR = 7, AL = 8, AR = 9, EL = 10, ER = 11, WL = 12, WR = 13;
const RAD = [0.1, 0.1, 0.09, 0.09, 0.1, 0.11, 0.06, 0.06, 0.05, 0.05, 0.05, 0.05, 0.045, 0.045];
const INV_M = [0.6, 0.6, 0.7, 0.7, 0.5, 0.9, 1, 1, 1.3, 1.3, 1.2, 1.2, 1.5, 1.5];
// impulse groups: 0 knees/feet, 1 hips, 2 chest, 3 head, 4 arms
const GROUP = [1, 1, 2, 2, 2, 3, 0, 0, 0, 0, 4, 4, 4, 4];
const IMPULSE = {
  hit: { h: [1.35, 1, 0.75, 0.6, 0.8], u: [1.25, 1, 0.65, 0.5, 0.8], buckle: 0 },
  shot: { h: [0, 0.3, 1, 1.25, 0.7], u: [0, 0, 0.1, 0.1, 0.1], buckle: 1.1 },
  punch: { h: [0, 0.35, 1, 1.3, 0.8], u: [0, 0, 0, 0, 0], buckle: 0.9 },
  blast: { h: [0.55, 0.85, 1.1, 1.25, 1.1], u: [1.25, 1, 0.8, 0.7, 0.9], buckle: 0 },
  collapse: { h: [0, 0, 0, 0, 0], u: [0, 0, 0, 0, 0], buckle: 1.2 },
};

const STEP = 1 / 60;
const MAX_STEPS = 3;
const ITERATIONS = 8;
const GRAVITY = 9.8;
const LIFT_K = Math.sqrt(GRAVITY / 13);
const AIR_DAMP = 0.999;
const FRICTION = 0.1;
const SLEEP_SPEED = 0.15;
const SLEEP_AFTER = 0.5;
const MAX_SIM_TIME = 8;
const MAX_ACTIVE = 8;
const BLEND_T = 0.45;
const HIT_COOLDOWN = 0.35;
const HAND_LEN = 0.24;
const STERNUM_FWD = 0.13, STERNUM_Y = 1.22;
const RIVER_BED = WATER_Y - 2.4;

const LINKS = [];
{
  const torso = [HL, HR, SL, SR, ST];
  for (let i = 0; i < torso.length; i++) for (let j = i + 1; j < torso.length; j++) LINKS.push([torso[i], torso[j], 1]);
  LINKS.push([HD, SL, 1], [HD, SR, 1], [HD, ST, 0.6]);
  LINKS.push([HL, KL, 1], [KL, AL, 1], [HR, KR, 1], [KR, AR, 1], [SL, EL, 1], [EL, WL, 1], [SR, ER, 1], [ER, WR, 1]);
}
// minimum distances (unscaled m): max knee/elbow flexion, legs not through each other
const MIN_LINKS = [[HL, AL, 0.24], [HR, AR, 0.24], [SL, WL, 0.15], [SR, WR, 0.15], [KL, KR, 0.15], [AL, AR, 0.12], [KL, ST, 0.24], [KR, ST, 0.24]];

// Get-up keyframes as a sagittal-plane pose: pelvis (px, py), torso pitch
// (0 upright, + forward), thigh angle from straight down (+ forward), knee
// flexion, upper-arm angle relative to the torso (+ forward), elbow flexion.
const P_STAND = { px: 0, py: RIG.HIP_Y, torso: 0, nod: 0, thigh: [0, 0], knee: [0.04, 0.04], arm: [0.06, 0.06], elbow: [0.14, 0.14] };
const P_RIDE = { px: 0, py: 1.0, torso: 0.35, nod: 0, thigh: [1.2, 0.9], knee: [1.3, 1.1], arm: [1.1, 1.1], elbow: [0.3, 0.3] };
const GETUP_BACK = [
  [0, { px: 0, py: 0.12, torso: -Math.PI / 2, nod: 0, thigh: [1.52, 1.5], knee: [0.12, 0.2], arm: [0.08, 0.1], elbow: [0.15, 0.2] }],
  [0.5, { px: 0, py: 0.13, torso: 0.15, nod: 0.02, thigh: [2.4, 2.25], knee: [2.4, 2.2], arm: [-0.45, -0.45], elbow: [0.1, 0.1] }],
  [0.45, { px: -0.03, py: 0.58, torso: 0.62, nod: -0.03, thigh: [1.35, 1.3], knee: [1.6, 1.55], arm: [1.0, 0.9], elbow: [0.4, 0.5] }],
  [0.55, { ...P_STAND, px: 0.3 }],
];
const GETUP_FRONT = [
  [0, { px: 0, py: 0.13, torso: Math.PI / 2, nod: 0, thigh: [-1.5, -1.52], knee: [0.15, 0.1], arm: [0.1, 0.12], elbow: [0.2, 0.15] }],
  [0.5, { px: 0, py: 0.5, torso: 1.2, nod: 0.03, thigh: [0.15, 0.12], knee: [1.65, 1.62], arm: [1.2, 1.2], elbow: [0.05, 0.05] }],
  [0.5, { px: 0, py: 0.54, torso: 0.3, nod: 0, thigh: [1.45, -0.15], knee: [1.5, 1.35], arm: [0.9, 0.5], elbow: [0.6, 0.4] }],
  [0.55, { ...P_STAND, px: 0.28 }],
];

const live = new Set();

// True while a living actor is down (gameplay should freeze its AI/input).
// Also retires knockdowns whose mesh never showed up or went out of range.
export function isKnockedDown(actor, world) {
  const rd = actor && actor.ragdoll;
  if (!rd || rd.dead) return false;
  const stale = rd.phase === 'pending' ? world.time - rd.hitAt > 3.5 : world.time - rd.seenAt > 1;
  if (stale) {
    live.delete(rd);
    actor.ragdoll = null;
    actor.gotUpAt = world.time;
    return false;
  }
  return true;
}

// Head position of a body on the floor in three.js space [x, y up, z = game
// y], or null when there is no simulated body (knockfx3d.js puts the comic
// stars there).
export function ragdollHead(actor) {
  const rd = actor && actor.ragdoll;
  if (!rd || rd.phase === 'pending' || !rd.mesh) return null;
  return [rd.pos[HD * 3], rd.pos[HD * 3 + 1], rd.pos[HD * 3 + 2]];
}

// vx/vy: horizontal launch velocity in game coordinates, vz: upward m/s.
// kind: 'hit' | 'shot' | 'punch' | 'blast' | 'collapse'. startPose 'ride'
// launches from a riding posture (someone knocked off a bike).
export function knockDown(actor, world, o = {}) {
  const now = world ? world.time : 0;
  let rd = actor.ragdoll;
  if (rd && now - rd.hitAt < HIT_COOLDOWN) {
    if (o.dead) rd.dead = true;
    return rd;
  }
  // callers' lift speeds were tuned at g 13: scaled so a body flies as high at 9.8
  const imp = { x: o.vx || 0, y: (o.vz || 0) * LIFT_K, z: o.vy || 0, kind: IMPULSE[o.kind] ? o.kind : 'hit' };
  if (!rd) {
    rd = actor.ragdoll = {
      phase: 'pending', dead: !!o.dead, hitAt: now, seenAt: now, imp: [imp], startPose: o.startPose || null,
      lieFor: o.lieFor ?? 1.5 + Math.random() * 1.5, world, mesh: null,
      pos: new Float32Array(N * 3), prev: new Float32Array(N * 3), len: null, minLen: null, s: 1,
      acc: 0, simT: 0, downT: 0, calm: 0, sleeping: false, wet: new Uint8Array(N), wetT: 0, splashed: false,
      blds: null, bldT: 0, bldX: 0, bldZ: 0, getup: null,
    };
    actor.crouching = false;
    return rd;
  }
  rd.hitAt = now;
  rd.dead = rd.dead || !!o.dead;
  if (o.lieFor !== undefined) rd.lieFor = o.lieFor;
  if (rd.phase === 'pending') { rd.imp.push(imp); return rd; }
  if (rd.phase === 'getup') {
    rd.phase = 'sim';
    rd.getup = null;
    rd.prev.set(rd.pos);
  }
  rd.sleeping = false;
  rd.calm = 0;
  rd.simT = Math.min(rd.simT, 1);
  rd.downT = Math.min(rd.downT, 1);
  applyImpulse(rd, imp);
  return rd;
}

// Called by scene3d for every person mesh it places. Returns true while the
// ragdoll owns the mesh (the caller then skips its own placement/animation).
export function driveRagdoll(actor, mesh, world, dt) {
  const player = hoofdspeler(world);
  if (actor === player && !actor.ragdoll && world.pendingRespawn && !world.pendingRespawn.busted && world.health <= 0 && !player.inVehicle) {
    knockDown(actor, world, { kind: 'collapse', dead: true });
  }
  const rd = actor.ragdoll;
  if (!rd || !mesh || !mesh.userData.pelvis) return false;
  rd.seenAt = world.time;

  rd.seenReal = performance.now();
  const revived = rd.dead && (actor === player ? !world.pendingRespawn : actor.state === 'alive');
  const teleported = rd.phase !== 'pending' && Math.hypot(actor.x - (rd.pos[HL * 3] + rd.pos[HR * 3]) / 2, actor.y - (rd.pos[HL * 3 + 2] + rd.pos[HR * 3 + 2]) / 2) > 3;
  if (revived || teleported) { finish(actor, rd, mesh, false); return false; }

  if (rd.mesh !== mesh) attachMesh(rd, mesh, actor);

  if (rd.phase === 'pending') start(actor, rd, mesh);
  if (rd.phase === 'sim') {
    rd.downT += dt || 0;
    if (rd.sleeping && dt > 0 && (rd.wakeT = (rd.wakeT || 0) - dt) <= 0) {
      rd.wakeT = 0.25;
      if (vehicleNear(world, rd)) { rd.sleeping = false; rd.calm = 0; rd.lowT = 0; rd.simT = Math.min(rd.simT, MAX_SIM_TIME - 2); admit(rd); }
    }
    if (!rd.sleeping) {
      simulate(rd, dt);
      syncActor(actor, rd);
      writeBones(rd, mesh);
    }
    if (!rd.dead && dt > 0) {
      if (rd.wet[HL] && actor === player && rd.simT > 0.6) { finish(actor, rd, mesh, true); return false; }
      if (rd.wet[HL] && actor !== player && actor !== world.companion) rd.dead = true;
      if (rd.wet[HL] && actor === world.companion && rd.simT > 0.6) { finish(actor, rd, mesh, true); return false; }
      if ((rd.sleeping || rd.downT > 4) && rd.downT >= rd.lieFor) beginGetUp(rd);
    }
  }
  if (rd.phase === 'getup') {
    if (stepGetUp(rd, dt)) { finish(actor, rd, mesh, true); return false; }
    syncActor(actor, rd);
    writeBones(rd, mesh);
  }
  return true;
}

// --- body setup ------------------------------------------------------------

function attachMesh(rd, mesh, actor) {
  rd.mesh = mesh;
  rd.savedScale = mesh.scale.clone();
  rd.s = mesh.scale.y || 1;
  const ud = mesh.userData;
  rd.dims = { s: rd.s, hipZ: Math.abs(ud.legL.position.z), shZ: Math.abs(ud.armL.position.z) };
  rd.shadowY = ud.shadow ? ud.shadow.position.y : 0;
  if (!rd.len) buildLengths(rd);
  mesh.scale.setScalar(rd.s);
  if (ud.umbrella) ud.umbrella.visible = false;
  for (const k of ['phoneProp', 'rodProp']) if (ud[k]) ud[k].visible = false;
  if (rd.phase !== 'pending') writeBones(rd, mesh);
}

const _tmp = new Float32Array(N * 3);
function buildLengths(rd) {
  fk(P_STAND, rd.dims, _tmp, 0, 0, 0);
  rd.len = LINKS.map(([a, b]) => dist3(_tmp, a, b));
  rd.minLen = MIN_LINKS.map(([, , m]) => m * rd.s);
}

function start(actor, rd, mesh) {
  const nearMesh = Math.abs(mesh.position.x - actor.x) + Math.abs(mesh.position.z - actor.y) < 1.5;
  if (rd.startPose === 'ride') fk(P_RIDE, rd.dims, rd.pos, actor.angle || 0, actor.x, actor.y);
  else if (nearMesh) captureFromMesh(rd, mesh);
  else fk(P_STAND, rd.dims, rd.pos, actor.angle || 0, actor.x, actor.y);
  // standing on a viaduct / down in a cutting: lift the fresh pose to its ground
  if (!nearMesh || rd.startPose === 'ride') {
    const base = actor.gz || 0;
    if (base) for (let i = 0; i < N; i++) rd.pos[i * 3 + 1] += base;
  }
  rd.prev.set(rd.pos);
  for (const imp of rd.imp) applyImpulse(rd, imp);
  rd.imp = null;
  rd.phase = 'sim';
  rd.wetT = 0;
  actor.knockVX = 0;
  actor.knockVY = 0;
  admit(rd);
}

function vehicleNear(world, rd) {
  const x = (rd.pos[HL * 3] + rd.pos[HR * 3]) / 2, z = (rd.pos[HL * 3 + 2] + rd.pos[HR * 3 + 2]) / 2;
  for (const v of world.vehicles || []) {
    if (v.isBoat || Math.abs(v.speed) < 1) continue;
    const reach = v.halfLen + 1.2;
    if (Math.abs(v.x - x) < reach && Math.abs(v.y - z) < reach) return true;
  }
  return false;
}

function admit(rd) {
  const now = performance.now();
  let active = 0, oldest = null;
  for (const r of live) {
    if (now - r.seenReal > 1000 || r.phase !== 'sim') { live.delete(r); continue; }
    if (r.sleeping) continue;
    active++;
    if (!oldest || r.simT > oldest.simT) oldest = r;
  }
  if (active >= MAX_ACTIVE && oldest) oldest.sleeping = true;
  rd.seenReal = now;
  live.add(rd);
}

const _v = new THREE.Vector3();
function captureFromMesh(rd, mesh) {
  mesh.updateMatrixWorld(true);
  const ud = mesh.userData, p = rd.pos;
  const put = (i, bone, x, y, z) => {
    _v.set(x, y, z);
    bone.localToWorld(_v);
    p[i * 3] = _v.x; p[i * 3 + 1] = _v.y; p[i * 3 + 2] = _v.z;
  };
  put(HL, ud.legL, 0, 0, 0); put(HR, ud.legR, 0, 0, 0);
  put(KL, ud.kneeL, 0, 0, 0); put(KR, ud.kneeR, 0, 0, 0);
  put(AL, ud.kneeL, 0, RIG.ANKLE_Y - RIG.KNEE_Y, 0); put(AR, ud.kneeR, 0, RIG.ANKLE_Y - RIG.KNEE_Y, 0);
  put(SL, ud.armL, 0, 0, 0); put(SR, ud.armR, 0, 0, 0);
  put(EL, ud.elbowL, 0, 0, 0); put(ER, ud.elbowR, 0, 0, 0);
  put(WL, ud.elbowL, 0, -HAND_LEN, 0); put(WR, ud.elbowR, 0, -HAND_LEN, 0);
  put(HD, ud.head, 0, RIG.HEAD_Y - RIG.NECK_Y, 0);
  put(ST, ud.chest, STERNUM_FWD, STERNUM_Y - RIG.CHEST_Y, 0);
}

// Forward kinematics of a sagittal pose into world particles, facing game
// angle a with the local origin at (ox, oz) on the ground.
function fk(pose, d, out, a, ox, oz) {
  const s = d.s;
  const fx = Math.cos(a), fz = Math.sin(a), sx = -Math.sin(a), sz = Math.cos(a);
  const put = (i, lx, ly, lz) => {
    out[i * 3] = ox + (lx * fx + lz * sx) * s;
    out[i * 3 + 1] = ly * s;
    out[i * 3 + 2] = oz + (lx * fz + lz * sz) * s;
  };
  const th = pose.torso, tx = Math.sin(th), ty = Math.cos(th), nx = Math.cos(th), ny = -Math.sin(th);
  const px = pose.px, py = pose.py;
  const up = RIG.SHOULDER_Y - RIG.HIP_Y, su = STERNUM_Y - RIG.HIP_Y, hu = RIG.HEAD_Y - RIG.HIP_Y;
  const nod = pose.nod || 0;
  put(HL, px, py, d.hipZ); put(HR, px, py, -d.hipZ);
  const shx = px + tx * up, shy = py + ty * up;
  put(SL, shx, shy, d.shZ); put(SR, shx, shy, -d.shZ);
  put(ST, px + tx * su + nx * STERNUM_FWD, py + ty * su + ny * STERNUM_FWD, 0);
  put(HD, px + tx * hu + nx * nod, py + ty * hu + ny * nod, 0);
  for (let k = 0; k < 2; k++) {
    const side = k ? -1 : 1;
    const a1 = pose.thigh[k], a2 = a1 - pose.knee[k];
    const kx = px + Math.sin(a1) * RIG.THIGH_LEN, ky = py - Math.cos(a1) * RIG.THIGH_LEN;
    put(KL + k, kx, ky, side * d.hipZ);
    put(AL + k, kx + Math.sin(a2) * RIG.SHIN_LEN, ky - Math.cos(a2) * RIG.SHIN_LEN, side * d.hipZ);
    const b1 = pose.arm[k], b2 = b1 + pose.elbow[k];
    const ex = shx + (-tx * Math.cos(b1) + nx * Math.sin(b1)) * RIG.UPPER_ARM;
    const ey = shy + (-ty * Math.cos(b1) + ny * Math.sin(b1)) * RIG.UPPER_ARM;
    put(EL + k, ex, ey, side * (d.shZ + 0.02));
    put(WL + k, ex + (-tx * Math.cos(b2) + nx * Math.sin(b2)) * HAND_LEN, ey + (-ty * Math.cos(b2) + ny * Math.sin(b2)) * HAND_LEN, side * (d.shZ + 0.03));
  }
}

function applyImpulse(rd, imp) {
  const w = IMPULSE[imp.kind];
  const p = rd.pos, q = rd.prev;
  torsoFrame(p);
  const jitter = (Math.random() - 0.5) * 0.8;
  for (let i = 0; i < N; i++) {
    const g = GROUP[i];
    let vx = imp.x * w.h[g], vy = imp.y * w.u[g], vz = imp.z * w.h[g];
    if (w.buckle && (i === KL || i === KR)) { vx += F[0] * w.buckle; vz += F[2] * w.buckle; }
    if (i === SL || i === EL || i === WL) { vx += S[0] * jitter; vz += S[2] * jitter; }
    q[i * 3] -= vx * STEP;
    q[i * 3 + 1] -= vy * STEP;
    q[i * 3 + 2] -= vz * STEP;
  }
}

// --- simulation --------------------------------------------------------------

const U = [0, 1, 0], S = [0, 0, 1], F = [1, 0, 0];
function torsoFrame(p) {
  const hx = (p[HL * 3] + p[HR * 3]) / 2, hy = (p[HL * 3 + 1] + p[HR * 3 + 1]) / 2, hz = (p[HL * 3 + 2] + p[HR * 3 + 2]) / 2;
  const sx = (p[SL * 3] + p[SR * 3]) / 2, sy = (p[SL * 3 + 1] + p[SR * 3 + 1]) / 2, sz = (p[SL * 3 + 2] + p[SR * 3 + 2]) / 2;
  let ux = sx - hx, uy = sy - hy, uz = sz - hz;
  let l = Math.hypot(ux, uy, uz) || 1;
  ux /= l; uy /= l; uz /= l;
  let ax = p[HL * 3] - p[HR * 3], ay = p[HL * 3 + 1] - p[HR * 3 + 1], az = p[HL * 3 + 2] - p[HR * 3 + 2];
  const d = ax * ux + ay * uy + az * uz;
  ax -= ux * d; ay -= uy * d; az -= uz * d;
  l = Math.hypot(ax, ay, az) || 1;
  ax /= l; ay /= l; az /= l;
  U[0] = ux; U[1] = uy; U[2] = uz;
  S[0] = ax; S[1] = ay; S[2] = az;
  F[0] = uy * az - uz * ay; F[1] = uz * ax - ux * az; F[2] = ux * ay - uy * ax;
}

function simulate(rd, dt) {
  if (!(dt > 0)) return;
  rd.acc = Math.min(rd.acc + dt, STEP * MAX_STEPS);
  while (rd.acc >= STEP) {
    rd.acc -= STEP;
    substep(rd);
    if (rd.sleeping) { rd.acc = 0; break; }
  }
}

const contact = new Uint8Array(N);
const _before = new Float32Array(N * 3);
function substep(rd) {
  const p = rd.pos, q = rd.prev, h2 = STEP * STEP;
  _before.set(p);
  rd.simT += STEP;
  rd.wetT -= STEP;
  if (rd.wetT <= 0) refreshSurroundings(rd);

  // once the tumble is over, bleed off the sideways creep the joint limits
  // keep stirring up in parts touching the ground (falls stay undamped)
  const settle = rd.lowT > 0.25 ? Math.min(0.3, (rd.lowT - 0.25) * 0.4) : 0;
  for (let i = 0; i < N; i++) {
    const i3 = i * 3;
    let damp = AIR_DAMP;
    const hDamp = contact[i] ? 1 - settle : 1;
    let ay = -GRAVITY;
    if (rd.wet[i] && p[i3 + 1] < WATER_Y + 0.02) {
      const depth = WATER_Y + 0.02 - p[i3 + 1];
      ay += GRAVITY * Math.min(1.6, depth / 0.12);
      damp = 0.9;
    }
    const vx = (p[i3] - q[i3]) * damp * hDamp, vy = (p[i3 + 1] - q[i3 + 1]) * damp, vz = (p[i3 + 2] - q[i3 + 2]) * damp * hDamp;
    q[i3] = p[i3]; q[i3 + 1] = p[i3 + 1]; q[i3 + 2] = p[i3 + 2];
    p[i3] += vx;
    p[i3 + 1] += vy + ay * h2;
    p[i3 + 2] += vz;
  }

  contact.fill(0);
  for (let it = 0; it < ITERATIONS; it++) {
    for (let c = 0; c < LINKS.length; c++) {
      const [a, b, k] = LINKS[c];
      solveDistance(p, a, b, rd.len[c], k, false);
    }
    for (let c = 0; c < MIN_LINKS.length; c++) solveDistance(p, MIN_LINKS[c][0], MIN_LINKS[c][1], rd.minLen[c], 1, true);
    jointLimits(p, q);
    ground(rd, p);
  }
  if (rd.blds && rd.blds.length) { pushOutBuildings(rd, p); ground(rd, p); }
  if (rd.cars && rd.cars.length) pushOutVehicles(rd, p, q);

  let maxV2 = 0, grounded = true;
  for (let i = 0; i < N; i++) {
    const i3 = i * 3;
    if (contact[i]) {
      q[i3] = p[i3] - (p[i3] - q[i3]) * (1 - FRICTION);
      q[i3 + 2] = p[i3 + 2] - (p[i3 + 2] - q[i3 + 2]) * (1 - FRICTION);
      if (q[i3 + 1] < p[i3 + 1]) q[i3 + 1] = p[i3 + 1];
    }
    const dx = p[i3] - _before[i3], dy = p[i3 + 1] - _before[i3 + 1], dz = p[i3 + 2] - _before[i3 + 2];
    maxV2 = Math.max(maxV2, dx * dx + dy * dy + dz * dz);
    if (!rd.wet[i] && p[i3 + 1] > 0.9) grounded = false;
  }
  const speed = Math.sqrt(maxV2) / STEP;
  rd.lowT = speed < 2.5 && grounded ? (rd.lowT || 0) + STEP : 0;
  rd.calm = speed < SLEEP_SPEED && grounded ? rd.calm + STEP : 0;
  if (grounded && (rd.calm > SLEEP_AFTER || rd.simT > MAX_SIM_TIME || (rd.lowT > 2.5 && speed < 0.4))) {
    rd.sleeping = !rd.wet[HL] || rd.simT > MAX_SIM_TIME;
    if (rd.sleeping) q.set(p);
  }
}

function solveDistance(p, a, b, rest, k, minOnly) {
  const a3 = a * 3, b3 = b * 3;
  const dx = p[b3] - p[a3], dy = p[b3 + 1] - p[a3 + 1], dz = p[b3 + 2] - p[a3 + 2];
  const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (d < 1e-6 || (minOnly && d >= rest)) return;
  const wa = INV_M[a], wb = INV_M[b];
  const f = ((d - rest) / (d * (wa + wb))) * k;
  p[a3] += dx * f * wa; p[a3 + 1] += dy * f * wa; p[a3 + 2] += dz * f * wa;
  p[b3] -= dx * f * wb; p[b3 + 1] -= dy * f * wb; p[b3 + 2] -= dz * f * wb;
}

// Hip cone, hinge knees that never hyperextend, elbows that
// only fold forward and upper arms that stay out of the chest.
// Corrections move prev along with pos so conflicting limits can't pump
// energy into the body (it would never come to rest otherwise).
function jointLimits(p, q) {
  torsoFrame(p);
  for (let k = 0; k < 2; k++) {
    const sg = k ? -1 : 1;
    const hip = (HL + k) * 3, knee = (KL + k) * 3, ank = (AL + k) * 3;
    let tx = p[knee] - p[hip], ty = p[knee + 1] - p[hip + 1], tz = p[knee + 2] - p[hip + 2];
    const L = Math.hypot(tx, ty, tz) || 1e-6;
    tx /= L; ty /= L; tz /= L;
    const f = tx * F[0] + ty * F[1] + tz * F[2];
    const u = tx * U[0] + ty * U[1] + tz * U[2];
    const s = (tx * S[0] + ty * S[1] + tz * S[2]) * sg;
    const nf = Math.max(f, -0.42), nu = Math.min(u, 0.6), ns = Math.min(0.9, Math.max(-0.22, s));
    if (nf !== f || nu !== u || ns !== s) {
      let dx = F[0] * nf + U[0] * nu + S[0] * ns * sg;
      let dy = F[1] * nf + U[1] * nu + S[1] * ns * sg;
      let dz = F[2] * nf + U[2] * nu + S[2] * ns * sg;
      const l = Math.hypot(dx, dy, dz) || 1;
      dx = dx / l * L; dy = dy / l * L; dz = dz / l * L;
      const mx = p[hip] + dx - p[knee], my = p[hip + 1] + dy - p[knee + 1], mz = p[hip + 2] + dz - p[knee + 2];
      shift(p, q, knee, mx, my, mz);
      shift(p, q, ank, mx, my, mz);
      tx = dx / L; ty = dy / L; tz = dz / L;
    }
    hinge(p, q, knee, ank, tx, ty, tz, false);
  }
  for (let k = 0; k < 2; k++) {
    const sg = k ? -1 : 1;
    const sh = (SL + k) * 3, el = (EL + k) * 3, wr = (WL + k) * 3;
    let ux = p[el] - p[sh], uy = p[el + 1] - p[sh + 1], uz = p[el + 2] - p[sh + 2];
    const L = Math.hypot(ux, uy, uz) || 1e-6;
    ux /= L; uy /= L; uz /= L;
    const s = (ux * S[0] + uy * S[1] + uz * S[2]) * sg;
    if (s < -0.35) {
      const c = (-0.35 - s) * sg * L;
      shift(p, q, el, S[0] * c, S[1] * c, S[2] * c);
      shift(p, q, wr, S[0] * c, S[1] * c, S[2] * c);
    }
    hinge(p, q, el, wr, ux, uy, uz, true);
  }
}

// Distal segment (j -> e) relative to the proximal direction t: legs fold
// backward, arms forward, around the body's side axis.
function shift(p, q, i, dx, dy, dz) {
  p[i] += dx; p[i + 1] += dy; p[i + 2] += dz;
  q[i] += dx; q[i + 1] += dy; q[i + 2] += dz;
}

function hinge(p, q, j, e, tx, ty, tz, arm) {
  let fx = S[1] * tz - S[2] * ty, fy = S[2] * tx - S[0] * tz, fz = S[0] * ty - S[1] * tx;
  const fl = Math.hypot(fx, fy, fz);
  if (fl < 1e-4) return;
  fx /= fl; fy /= fl; fz /= fl;
  const dx = p[e] - p[j], dy = p[e + 1] - p[j + 1], dz = p[e + 2] - p[j + 2];
  const along = dx * fx + dy * fy + dz * fz;
  if (arm ? along < 0 : along > 0) {
    shift(p, q, e, -fx * along, -fy * along, -fz * along);
  }
}

function ground(rd, p) {
  const map = rd.world && rd.world.map;
  const elev = map && map.elev && map.elev.has;
  for (let i = 0; i < N; i++) {
    const floor = (rd.wet[i] ? RIVER_BED : elev ? map.groundHeightAt(p[i * 3], p[i * 3 + 2], p[i * 3 + 1]) : 0) + RAD[i];
    if (p[i * 3 + 1] < floor) { p[i * 3 + 1] = floor; contact[i] = 1; }
  }
}

function refreshSurroundings(rd) {
  rd.wetT = 0.12;
  const map = rd.world && rd.world.map;
  if (!map) return;
  const p = rd.pos;
  for (let i = 0; i < N; i++) {
    const wasWet = rd.wet[i];
    rd.wet[i] = isInWater(map, p[i * 3], p[i * 3 + 2]) ? 1 : 0;
    // a particle that's already below street level stays in the canal
    if (wasWet && !rd.wet[i] && p[i * 3 + 1] < -0.2) rd.wet[i] = 1;
  }
  if (rd.wet[HL] && !rd.splashed && rd.world.particles) {
    rd.splashed = true;
    rd.world.particles.push({ kind: 'splash', x: p[HL * 3], y: p[HL * 3 + 2], until: rd.world.time + 1.1 });
  }
  const cx = p[HL * 3], cz = p[HL * 3 + 2];
  rd.cars = null;
  for (const v of rd.world.vehicles || []) {
    if (v.isBike || v.isScooter || v.isBoat || v.sinking) continue;
    if (Math.abs(v.x - cx) > v.halfLen + 3 || Math.abs(v.y - cz) > v.halfLen + 3) continue;
    (rd.cars || (rd.cars = [])).push(v);
  }
  rd.bldT -= 0.12;
  if (!rd.blds || rd.bldT <= 0 || Math.abs(cx - rd.bldX) + Math.abs(cz - rd.bldZ) > 1.5) {
    rd.blds = map.buildingsNear ? map.buildingsNear(cx, cz, 3) : null;
    rd.bldT = 0.25;
    rd.bldX = cx; rd.bldZ = cz;
  }
}

function pushOutBuildings(rd, p) {
  for (const b of rd.blds) {
    const [minx, miny, maxx, maxy] = b.bounds;
    const pts = b.pts;
    for (let i = 0; i < N; i++) {
      const x = p[i * 3], z = p[i * 3 + 2], r = RAD[i];
      if (x < minx - r || x > maxx + r || z < miny - r || z > maxy + r) continue;
      if (inPassage(rd.world.map, b, x, z)) continue;
      let best = Infinity, bx = 0, bz = 0;
      for (let j = 0; j < pts.length - 1; j++) {
        const cp = closestPointOnSegment(x, z, pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1]);
        if (cp.dist2 < best) { best = cp.dist2; bx = cp.x; bz = cp.y; }
      }
      const inside = pointInPolygon(x, z, pts);
      const d = Math.sqrt(best);
      if ((!inside && d >= r) || d < 1e-6) continue;
      let nx = (x - bx) / d, nz = (z - bz) / d;
      if (inside) { nx = -nx; nz = -nz; }
      p[i * 3] = bx + nx * r;
      p[i * 3 + 2] = bz + nz * r;
      const q = rd.prev;
      q[i * 3] = p[i * 3] - (p[i * 3] - q[i * 3]) * 0.5;
      q[i * 3 + 2] = p[i * 3 + 2] - (p[i * 3 + 2] - q[i * 3 + 2]) * 0.5;
    }
  }
}

// Cars and buses as solid boxes: bodies slide off the side or land on the
// roof/bonnet, and are carried along with the vehicle's motion.
function pushOutVehicles(rd, p, q) {
  for (const v of rd.cars) {
    const top = v.isBus ? 3 : 1.35;
    const c = Math.cos(v.angle), sn = Math.sin(v.angle);
    const hl = v.halfLen, hw = v.halfWid;
    const vx = (c * v.speed + (v.driftX || 0)) * STEP, vz = (sn * v.speed + (v.driftY || 0)) * STEP;
    for (let i = 0; i < N; i++) {
      const i3 = i * 3, r = RAD[i];
      if (p[i3 + 1] - r > top) continue;
      const dx = p[i3] - v.x, dz = p[i3 + 2] - v.y;
      const lx = dx * c + dz * sn, lz = -dx * sn + dz * c;
      const px = hl + r - Math.abs(lx), pz = hw + r - Math.abs(lz);
      if (px <= 0 || pz <= 0) continue;
      const py = top + r - p[i3 + 1];
      if (py < px && py < pz && py < 0.45) {
        p[i3 + 1] = top + r;
        if (q[i3 + 1] < p[i3 + 1]) q[i3 + 1] = p[i3 + 1];
      } else if (px < pz) {
        const d = Math.sign(lx) * px;
        p[i3] += c * d; p[i3 + 2] += sn * d;
      } else {
        const d = Math.sign(lz) * pz;
        p[i3] -= sn * d; p[i3 + 2] += c * d;
      }
      // take on the vehicle's velocity where it's faster than the body
      const bvx = p[i3] - q[i3], bvz = p[i3 + 2] - q[i3 + 2];
      q[i3] = p[i3] - (bvx + (vx - bvx) * 0.5);
      q[i3 + 2] = p[i3 + 2] - (bvz + (vz - bvz) * 0.5);
    }
  }
}

// --- getting up -------------------------------------------------------------

function beginGetUp(rd) {
  const p = rd.pos;
  torsoFrame(p);
  const faceUp = F[1] > 0;
  const dirX = faceUp ? -U[0] : U[0], dirZ = faceUp ? -U[2] : U[2];
  const heading = Math.atan2(dirZ, dirX);
  const ox = (p[HL * 3] + p[HR * 3]) / 2, oz = (p[HL * 3 + 2] + p[HR * 3 + 2]) / 2;
  rd.phase = 'getup';
  rd.getup = { t: 0, seq: faceUp ? GETUP_BACK : GETUP_FRONT, heading, ox, oz, from: new Float32Array(p) };
  live.delete(rd);
}

const _pose = { px: 0, py: 0, torso: 0, nod: 0, thigh: [0, 0], knee: [0, 0], arm: [0, 0], elbow: [0, 0] };
function lerpPose(a, b, t) {
  for (const k of ['px', 'py', 'torso', 'nod']) _pose[k] = a[k] + (b[k] - a[k]) * t;
  for (const k of ['thigh', 'knee', 'arm', 'elbow']) for (let i = 0; i < 2; i++) _pose[k][i] = a[k][i] + (b[k][i] - a[k][i]) * t;
  return _pose;
}

const smooth = (t) => t * t * (3 - 2 * t);

// Returns true once standing.
function stepGetUp(rd, dt) {
  const g = rd.getup;
  g.t += dt || 0;
  const p = rd.pos, seq = g.seq;
  if (g.t < BLEND_T) {
    fk(seq[0][1], rd.dims, _tmp, g.heading, g.ox, g.oz);
    const k = smooth(g.t / BLEND_T);
    for (let i = 0; i < N * 3; i++) p[i] = g.from[i] + (_tmp[i] - g.from[i]) * k;
    for (let i = 0; i < N; i++) p[i * 3 + 1] = Math.max(p[i * 3 + 1], RAD[i]);
    return false;
  }
  let t = g.t - BLEND_T;
  for (let i = 1; i < seq.length; i++) {
    const d = seq[i][0];
    if (t <= d) {
      fk(lerpPose(seq[i - 1][1], seq[i][1], smooth(t / d)), rd.dims, p, g.heading, g.ox, g.oz);
      for (let j = 0; j < N; j++) p[j * 3 + 1] = Math.max(p[j * 3 + 1], RAD[j] * 0.5);
      return false;
    }
    t -= d;
  }
  fk(seq[seq.length - 1][1], rd.dims, p, g.heading, g.ox, g.oz);
  return true;
}

function syncActor(actor, rd) {
  const p = rd.pos;
  actor.x = (p[HL * 3] + p[HR * 3]) / 2;
  actor.y = (p[HL * 3 + 2] + p[HR * 3 + 2]) / 2;
  const map = rd.world && rd.world.map;
  if (map && map.elev && map.elev.has) actor.gz = map.groundHeightAt(actor.x, actor.y, (p[HL * 3 + 1] + p[HR * 3 + 1]) / 2 - 0.5);
  if (actor.vx !== undefined) { actor.vx = 0; actor.vy = 0; }
  actor.speed = 0;
}

function finish(actor, rd, mesh, stood) {
  live.delete(rd);
  if (stood) {
    syncActor(actor, rd);
    if (rd.getup) actor.angle = rd.getup.heading;
    actor.gotUpAt = rd.world ? rd.world.time : 0;
  }
  actor.ragdoll = null;
  if (!mesh || !rd.savedScale) return;
  const ud = mesh.userData;
  mesh.scale.copy(rd.savedScale);
  mesh.rotation.set(0, -(actor.angle || 0), 0);
  mesh.position.set(actor.x, actor.gz || 0, actor.y);
  for (const b of [ud.pelvis, ud.chest, ud.head, ud.legL, ud.legR, ud.kneeL, ud.kneeR, ud.armL, ud.armR, ud.elbowL, ud.elbowR]) if (b) b.rotation.set(0, 0, 0);
  ud.pelvis.position.set(0, RIG.HIP_Y, 0);
  ud.chest.position.set(0, RIG.CHEST_Y - RIG.HIP_Y, 0);
  if (ud.shadow) ud.shadow.position.y = rd.shadowY;
  if (ud.umbrella) ud.umbrella.visible = true;
}

// --- particles -> bones ------------------------------------------------------

const _X = new THREE.Vector3(), _Y = new THREE.Vector3(), _Z = new THREE.Vector3(), _A = new THREE.Vector3(), _B = new THREE.Vector3();
const _sP = new THREE.Vector3(), _hint = new THREE.Vector3();
const _m = new THREE.Matrix4();
const qP = new THREE.Quaternion(), qPi = new THREE.Quaternion(), q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), qTmp = new THREE.Quaternion();

function frame(q, yAxis, zHint) {
  _Y.copy(yAxis).normalize();
  _Z.copy(zHint).addScaledVector(_Y, -zHint.dot(_Y));
  if (_Z.lengthSq() < 1e-8) {
    _Z.set(1, 0, 0).addScaledVector(_Y, -_Y.x);
    if (_Z.lengthSq() < 1e-8) _Z.set(0, 0, 1).addScaledVector(_Y, -_Y.z);
  }
  _Z.normalize();
  _X.crossVectors(_Y, _Z);
  _m.makeBasis(_X, _Y, _Z);
  q.setFromRotationMatrix(_m);
}

function vec(p, i, out) { return out.set(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]); }
const _p0 = new THREE.Vector3(), _p1 = new THREE.Vector3(), _p2 = new THREE.Vector3(), _mh = new THREE.Vector3(), _ms = new THREE.Vector3();

// Limb pair (root -> mid -> end): parent-relative quaternions for both bones.
// legs fold with (lower x upper) along the side axis, arms with (upper x lower).
function limb(p, a, b, c, arm, boneA, boneB) {
  vec(p, a, _p0); vec(p, b, _p1); vec(p, c, _p2);
  _A.subVectors(_p1, _p0);
  _B.subVectors(_p2, _p1);
  const la = _A.length(), lb = _B.length();
  _hint.copy(_sP);
  if (la > 1e-5 && lb > 1e-5) {
    const axis = arm ? _X.crossVectors(_A, _B) : _X.crossVectors(_B, _A);
    const sin = axis.length() / (la * lb);
    if (sin > 1e-3) {
      axis.normalize();
      if (axis.dot(_sP) < 0) axis.negate();
      const w = Math.min(1, sin / 0.3);
      _hint.multiplyScalar(1 - w).addScaledVector(axis, w);
    }
  }
  frame(q1, _A.negate(), _hint);
  frame(q2, _B.negate(), _hint);
  boneA.quaternion.copy(qPi).multiply(q1);
  boneB.quaternion.copy(qTmp.copy(q1).invert()).multiply(q2);
}

function writeBones(rd, mesh) {
  const p = rd.pos, ud = mesh.userData, s = rd.s;
  vec(p, HL, _p0); vec(p, HR, _p1);
  _mh.addVectors(_p0, _p1).multiplyScalar(0.5);
  _sP.subVectors(_p0, _p1);
  vec(p, SL, _p0); vec(p, SR, _p1);
  _ms.addVectors(_p0, _p1).multiplyScalar(0.5);
  _A.subVectors(_ms, _mh);
  frame(qP, _A, _sP);
  _sP.copy(_Z);
  qPi.copy(qP).invert();

  mesh.position.set(_mh.x, _mh.y - RIG.HIP_Y * s, _mh.z);
  mesh.rotation.set(0, 0, 0);
  mesh.scale.setScalar(s);
  ud.pelvis.position.set(0, RIG.HIP_Y, 0);
  ud.pelvis.quaternion.copy(qP);
  ud.chest.position.set(0, RIG.CHEST_Y - RIG.HIP_Y, 0);
  ud.chest.quaternion.identity();

  vec(p, HD, _p0);
  _A.subVectors(_p0, _ms);
  frame(q1, _A, _sP);
  ud.head.quaternion.copy(qPi).multiply(q1);

  limb(p, HL, KL, AL, false, ud.legL, ud.kneeL);
  limb(p, HR, KR, AR, false, ud.legR, ud.kneeR);
  limb(p, SL, EL, WL, true, ud.armL, ud.elbowL);
  limb(p, SR, ER, WR, true, ud.armR, ud.elbowR);

  if (ud.shadow) {
    ud.shadow.visible = !rd.wet[HL];
    ud.shadow.position.set(0, (0.02 - mesh.position.y) / s, 0);
  }
}

function dist3(p, a, b) {
  return Math.hypot(p[b * 3] - p[a * 3], p[b * 3 + 1] - p[a * 3 + 1], p[b * 3 + 2] - p[a * 3 + 2]);
}

// --- bikes and scooters whose rider was knocked off -------------------------

// Hides the built-in rider and lays the bike on its side until someone
// (the player) picks it up again.
export function syncBikeRider(mesh, v, time) {
  const ud = mesh.userData;
  if (ud.riderFig === undefined) ud.riderFig = mesh.children.find((c) => c.userData && c.userData.legL) || null;
  if (v.driver === 'player' && v.riderOff) v.riderOff = false;
  const down = !!v.riderOff;
  // a bike standing parked (taken from the clutter, or left by the player) has nobody on it
  if (ud.riderFig) ud.riderFig.visible = !down && (!!v.driver || !!v.road || !!v.countryDrive || !!v.sinking || (v.isPolice && !v.hijacked));
  if (down) {
    const k = smooth(Math.min(1, (time - (v.riderOffAt || 0)) / 0.45));
    mesh.rotation.order = 'YXZ';
    mesh.rotation.x = (v.riderOffSide || 1) * 1.38 * k;
    mesh.position.y = (v.z || 0) + 0.04 * k;
    ud.bikeDown = true;
  } else if (ud.bikeDown) {
    ud.bikeDown = false;
    mesh.rotation.x = 0;
    mesh.rotation.order = 'XYZ';
  }
}

