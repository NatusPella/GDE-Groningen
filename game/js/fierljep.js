import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { buildPersonMesh, animatePersonWalk, swimPose, PERSON_RIG } from './models3d_people.js';
import { pushAudioEvent } from './pedgeom.js';
import { pointInPolygon as inPoly, isInWater, inMapWater, clamp, WATER_Y } from './util.js';
import { playCinematic, isCinematicActive, skipCinematic } from './cinematics.js';
import { bridgeWithin } from './vaultkit.js';
import { getWaterIndex, insideWaterObstacle } from './waterindex.js';
import { rand } from './rng.js';

// Fierljeppen: an NPC sprints to a canal, jumps onto a pole standing in the
// water, climbs it while it tips over and drops onto the far bank - or the
// pole stalls, tips sideways and the jumper splashes in. Jelle Terpstra's
// escape move; works for any NPC object with x/y (a Pedestrian or a plain
// { x, y, angle } actor).
//
// API
//   poleVault(npc, from, to, opts) -> handle
//     from: { x, y } on the take-off bank at the water's edge; to: { x, y }
//     landing spot on the far bank. The NPC runs from where it stands (or
//     from a run-up behind `from` when it is far away / right on it).
//     opts: fail (bool), appearance (buildPersonMesh look, e.g. JELLE_LOOK;
//       default: the NPC's own clothing/skin), camera (letterboxed side camera,
//       played as a cinematics.js shot), slowmo (the jump slows down at the top),
//       say (speech bubbles, default true), keepActor (keep showing the
//       jumper after landing until handle.dispose(); for NPCs nobody else
//       draws), swimTime (s in the water after a fail, default 5; Infinity
//       waits for handle.release()), onDone(result).
//     handle: { done: Promise<result>, phase, pos { x, y, z }, release(), dispose() }
//     result: { result: 'landed' | 'fail', x, y }. After a fail the NPC is
//     put back on the take-off bank (climbed out), unless the caller moved it.
//     While vaulting, npc.scripted and npc.hideMesh are set: pedestrians.js
//     leaves the NPC alone and scene3d.js hides its normal mesh.
//   findVaultSpot(map, x, y, radius = 60, { minWidth, maxWidth }) -> { from, to, width } | null
//     the nearest straight-across canal crossing (5-22 m of water) around a
//     point: from on the near bank, to on the opposite bank.
//     why: optional {} that counts the reasons candidates were rejected.
//     bridgeNear: metres; a crossing with a bridge that close is refused.
//   bridgeWithin(map, x, y, r) -> bool.
//   isVaulting(npc), updatePoleVaults(dt, world) (main.js, every frame).

export const JELLE_LOOK = { shirt: 0x1d4f9c, skin: 0xe9c29c, hair: 0xe0bd62, variant: 'male', pants: 0xf2f0ea, shoes: 0x1c1c1e, hairStyle: 'short', seed: 1581 };

const RUN_SPEED = 7.5;
const JUMP_S = 0.42;
const DROP_G = 9.81;
const HANG = 2.05; // hands above feet while hanging from the pole
const THETA0 = -0.3;
const THETA1 = 0.52;
export const POLE_MAX = 22; // m: spans up to ~21 m of water
const SAY_OK = ['Oant sjen, Grinzers!', 'Moaie sprong, al zeg ik het zelf.', 'Fierljeppen, dat kunnen jullie niet!'];
const SAY_FAIL = ['Wiet! Hielendal wiet!', 'Nee nee nee…', 'Dit heeft niemand gezien, hè?'];

let world = null;
const vaults = [];
const pick = (l) => l[Math.floor(Math.random() * l.length)];
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

// --- props ------------------------------------------------------------------

let flagTex = null;
export function pompebledTexture() {
  if (flagTex) return flagTex;
  const W = 192, H = 128, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#f4f2ec';
  g.fillRect(0, 0, W, H);
  const ang = Math.atan2(H, W);
  const band = Math.hypot(W, H) / 7;
  g.save();
  g.rotate(ang);
  g.fillStyle = '#1d4f9c';
  for (let i = 0; i < 7; i += 2) g.fillRect(-W, i * band - H * 0.62, W * 3, band);
  g.restore();
  // pompeblêden: little upside-down hearts on the white bands
  g.fillStyle = '#d42a24';
  const leaf = (x, y, s) => {
    g.save();
    g.translate(x, y);
    g.rotate(ang + Math.PI);
    g.beginPath();
    g.moveTo(0, s * 0.9);
    g.bezierCurveTo(-s * 1.3, 0, -s * 0.7, -s * 1.1, 0, -s * 0.45);
    g.bezierCurveTo(s * 0.7, -s * 1.1, s * 1.3, 0, 0, s * 0.9);
    g.fill();
    g.restore();
  };
  for (const [u, v] of [[0.14, 0.08], [0.43, 0.3], [0.72, 0.52], [0.3, 0.02], [0.6, 0.24], [0.9, 0.46], [0.08, 0.5]]) {
    const k = 1 * band;
    const bx = u * W, by = v * H + k * 0.5;
    leaf(bx, by + band * 0.9, 7);
  }
  flagTex = new THREE.CanvasTexture(c);
  flagTex.colorSpace = THREE.SRGBColorSpace;
  return flagTex;
}

const POLE_MAT = new THREE.MeshLambertMaterial({ color: 0x3b2e22 });
const TAPE_MAT = new THREE.MeshLambertMaterial({ color: 0xf2f0ea });
const PLATE_MAT = new THREE.MeshLambertMaterial({ color: 0x2a2a2c });
let flagMat = null;
function flagMaterial() {
  return flagMat || (flagMat = new THREE.MeshLambertMaterial({ map: pompebledTexture(), side: THREE.DoubleSide }));
}

// Pole along +Y from its foot (the pivot in the canal bed) to length L.
function buildPole(L) {
  const g = new THREE.Group();
  const geo = new THREE.CylinderGeometry(0.035, 0.06, L, 7);
  geo.translate(0, L / 2, 0);
  const pole = new THREE.Mesh(geo, POLE_MAT);
  g.add(pole);
  const plateGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.05, 12);
  const plate = new THREE.Mesh(plateGeo, PLATE_MAT);
  plate.position.y = 0.05;
  g.add(plate);
  const tapeGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.5, 7);
  const tapes = [];
  for (const y of [L * 0.45, L * 0.7, L - 0.6]) {
    const t = new THREE.Mesh(tapeGeo, TAPE_MAT);
    t.position.y = y;
    g.add(t);
    tapes.push(t);
  }
  const penGeo = new THREE.PlaneGeometry(0.75, 0.5);
  penGeo.translate(0.39, 0, 0);
  const pennant = new THREE.Mesh(penGeo, flagMaterial());
  pennant.position.y = L - 0.28;
  g.add(pennant);
  g.userData = { pennant, owned: [geo, plateGeo, tapeGeo, penGeo] };
  return g;
}

// A hand flag for the landing flourish, on the right forearm.
function attachHandFlag(ud) {
  const g = new THREE.Group();
  const stickGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.7, 5);
  const stick = new THREE.Mesh(stickGeo, POLE_MAT);
  stick.position.y = -0.05;
  g.add(stick);
  const flGeo = new THREE.PlaneGeometry(0.42, 0.28);
  flGeo.translate(0.22, 0, 0);
  const fl = new THREE.Mesh(flGeo, flagMaterial());
  fl.position.y = -0.3;
  fl.rotation.z = Math.PI / 2;
  g.add(fl);
  g.position.set(0.02, -0.26, 0);
  g.visible = false;
  ud.elbowR.add(g);
  g.userData = { flag: fl, owned: [stickGeo, flGeo] };
  return g;
}

function lookOf(npc, opts) {
  const a = opts.appearance || npc.appearance;
  if (a) return { shirt: a.shirt ?? 0x1d4f9c, skin: a.skin ?? 0xe0b48a, look: a };
  const hex = (v, d) => (typeof v === 'number' ? v : typeof v === 'string' ? parseInt(v.replace('#', ''), 16) : d);
  return { shirt: hex(npc.clothing, 0xcaa46a), skin: hex(npc.skin, 0xe0b48a), look: { seed: npc._lookSeed ?? 1 } };
}

// --- poses (mesh faces local +X; thigh/arm rotation.z > 0 swings forward) ----

const { HIP_Y } = PERSON_RIG;
function setLimbs(ud, legL, kneeL, legR, kneeR, armL, elbowL, armR, elbowR, spreadL = 0, spreadR = 0) {
  ud.legL.rotation.set(0, 0, legL); ud.kneeL.rotation.z = kneeL;
  ud.legR.rotation.set(0, 0, legR); ud.kneeR.rotation.z = kneeR;
  ud.armL.rotation.set(-spreadL, 0, armL); ud.elbowL.rotation.z = elbowL;
  ud.armR.rotation.set(spreadR, 0, armR); ud.elbowR.rotation.z = elbowR;
}
function spine(ud, drop = 0, lean = 0, head = 0) {
  ud.pelvis.position.set(0, HIP_Y - drop, 0);
  ud.pelvis.rotation.set(0, 0, 0);
  ud.chest.rotation.set(0, 0, lean);
  ud.head.rotation.set(0, 0, head);
}
function poseHang(ud, t, climbing) {
  const c = climbing ? Math.sin(t * 9) : 0;
  spine(ud, 0, 0.05, 0.25);
  setLimbs(ud, 0.7 + 0.45 * c, -1.3 - 0.4 * c, 0.7 - 0.45 * c, -1.3 + 0.4 * c, 2.95, 0.35 + 0.35 * Math.max(0, c), 2.95, 0.35 + 0.35 * Math.max(0, -c), 0.12, 0.12);
}
function poseDrop(ud, k) {
  spine(ud, 0, -0.1 * k, 0.1);
  setLimbs(ud, 0.5 + 0.5 * k, -0.9 + 0.3 * k, 0.4 + 0.5 * k, -0.7 + 0.2 * k, 2.4 - 0.6 * k, 0.3, 2.4 - 0.6 * k, 0.3, 0.5, 0.5);
}
function poseCrouch(ud, k) {
  spine(ud, 0.38 * k, -0.45 * k, 0.3 * k);
  setLimbs(ud, 1.35 * k, -2.1 * k, 1.25 * k, -2.0 * k, 0.9 * k, 0.4, 0.9 * k, 0.4, 0.2, 0.2);
}
function poseCheer(ud, t, k) {
  spine(ud, 0, 0.08 * k, 0.15 * k);
  setLimbs(ud, 0.05, -0.08, -0.05, -0.1, 0.35, 1.9 * k, 2.9 * k, 0.2, -0.35 * k, 0.1 + 0.35 * k * Math.sin(t * 10));
}
function poseFlail(ud, t) {
  spine(ud, 0, 0.3, 0.4);
  setLimbs(ud, 0.4 + 0.6 * Math.sin(t * 11), -0.8, 0.4 - 0.6 * Math.sin(t * 11), -0.9, 2.2 + 0.6 * Math.sin(t * 13), 0.5, 1.6 + 0.8 * Math.cos(t * 12), 0.6, 0.6, 0.7);
}

// --- geometry ---------------------------------------------------------------

function poleDir(theta, phi, dir, out) {
  const n = { x: -dir.y, y: dir.x };
  const h = Math.sin(theta) * Math.cos(phi);
  out.x = dir.x * h + n.x * Math.sin(phi);
  out.y = dir.y * h + n.y * Math.sin(phi);
  out.z = Math.cos(theta) * Math.cos(phi);
  return out;
}

// --- API --------------------------------------------------------------------

export function isVaulting(npc) {
  return vaults.some((v) => v.npc === npc && !v.over);
}

export function poleVault(npc, from, to, opts = {}) {
  const w = world || (window.__debug && window.__debug.world);
  world = w;
  const scene = getScene();
  const dx = to.x - from.x, dy = to.y - from.y;
  const D = Math.max(3, Math.hypot(dx, dy));
  const dir = { x: dx / D, y: dy / D };
  const yaw = Math.atan2(dir.y, dir.x);
  const L = clamp(0.94 * D + 1.3, 6, POLE_MAX);
  const pivotD = Math.max(0.3 * D, 1.9);
  const pivot = { x: from.x + dir.x * pivotD, y: from.y + dir.y * pivotD, z: WATER_Y - 0.1 };
  const c0 = clamp((2.35 + HANG - pivot.z - 0.05) / Math.cos(THETA0), 2.5, L - 1);

  // the run-up is straight at the water along the crossing: an NPC standing
  // off that line (or too near / far) starts from the line instead
  let sx = npc.x, sy = npc.y;
  const along = (from.x - sx) * dir.x + (from.y - sy) * dir.y;
  const across = Math.abs((from.x - sx) * dir.y - (from.y - sy) * dir.x);
  if (!Number.isFinite(sx) || along > 30 || along < 3 || across > Math.max(0.8, along * 0.12)) {
    const back = Number.isFinite(along) ? clamp(along, 6, 12) : 9;
    sx = from.x - dir.x * back; sy = from.y - dir.y * back;
  }

  const L0 = lookOf(npc, opts);
  const actor = buildPersonMesh(L0.shirt, L0.skin, L0.look);
  actor.position.set(sx, 0, sy);
  scene.add(actor);
  const handFlag = attachHandFlag(actor.userData);
  const pole = buildPole(L);
  pole.position.set(pivot.x, pivot.z, pivot.y);
  scene.add(pole);

  let resolve;
  const done = new Promise((r) => { resolve = r; });
  const v = {
    npc, from: { x: from.x, y: from.y }, to: { x: to.x, y: to.y }, dir, yaw, L, pivot, c0, opts, fail: !!opts.fail,
    actor, pole, handFlag, phase: 'run', t: 0, pt: 0, x: sx, y: sy, z: 0, theta: THETA0, phi: 0, c: c0,
    runLen: Math.hypot(from.x - sx, from.y - sy), runAngle: Math.atan2(from.y - sy, from.x - sx),
    speaker: { x: sx, y: sy, h: 2.3, speechText: '', speechUntil: 0 }, over: false, resolve, result: null,
    released: false, poleLife: 9, cam: null, cine: false,
  };
  v.pd = { x: 0, y: 0, z: 1 };
  npc.scripted = true;
  npc.hideMesh = true;
  vaults.push(v);
  if (opts.camera) startCamera(v);
  const handle = {
    done,
    get phase() { return v.phase; },
    get pos() { return { x: v.x, y: v.y, z: v.z }; },
    release() { v.released = true; },
    dispose() { disposeVault(v); },
  };
  v.handle = handle;
  return handle;
}

function say(v, text, s = 2.4) {
  if (v.opts.say === false || !world) return;
  v.speaker.speechText = text;
  v.speaker.speechUntil = world.time + s;
  if (!world.extraSpeakers) world.extraSpeakers = [];
  if (!world.extraSpeakers.includes(v.speaker)) world.extraSpeakers.push(v.speaker);
}

function sfx(v, kind, strength = 0.7) {
  pushAudioEvent(world, { kind, x: v.x, y: v.y, strength });
}

function setPhase(v, p) {
  v.phase = p;
  v.pt = 0;
}

function placeOnPole(v) {
  poleDir(v.theta, v.phi, v.dir, v.pd);
  const hx = v.pivot.x + v.pd.x * v.c, hy = v.pivot.y + v.pd.y * v.c, hz = v.pivot.z + v.pd.z * v.c;
  const beta = v.theta * 0.4;
  v.x = hx - v.dir.x * Math.sin(beta) * HANG;
  v.y = hy - v.dir.y * Math.sin(beta) * HANG;
  v.z = hz - Math.cos(beta) * HANG;
  v.actor.position.set(v.x - v.pd.x * 0.25, v.z, v.y - v.pd.y * 0.25);
  v.actor.rotation.set(0, -v.yaw, -beta);
}

function finishVault(v, result) {
  if (v.result) return;
  v.result = { result, x: v.npc.x, y: v.npc.y };
  v.npc.scripted = false;
  v.npc.hideMesh = false;
  endCamera(v);
  if (!v.opts.keepActor) { v.actor.visible = false; v.actorGone = true; }
  if (v.opts.onDone) { try { v.opts.onDone(v.result); } catch (e) { console.error('fierljep onDone', e); } }
  v.resolve(v.result);
}

// The side camera is a cinematics.js shot (cinematics owns cameraOverride).
function solidAt(map, px, py) {
  return map.buildingsNear(px, py, 1).some((b) => px >= b.bounds[0] && px <= b.bounds[2] && py >= b.bounds[1] && py <= b.bounds[3] && inPoly(px, py, b.pts));
}

// Side camera spot with a clear view of the take-off and the landing.
function camSide(v) {
  const map = world.map, n = { x: -v.dir.y, y: v.dir.x };
  const mx = (v.from.x + v.to.x) / 2, my = (v.from.y + v.to.y) / 2;
  const cost = (c) => {
    const cx = mx + n.x * c.d * c.sx + v.dir.x * c.sy, cy = my + n.y * c.d * c.sx + v.dir.y * c.sy;
    if (solidAt(map, cx, cy)) return 99;
    let hits = 0;
    for (const t of [v.from, v.to, { x: mx, y: my }]) {
      const len = Math.hypot(t.x - cx, t.y - cy), steps = Math.ceil(len);
      for (let i = 1; i < steps; i++) if (solidAt(map, cx + (t.x - cx) * (i / steps), cy + (t.y - cy) * (i / steps))) { hits++; break; }
    }
    return hits;
  };
  let best = null;
  for (const d of [14, 9]) for (const sx of [1, -1]) for (const sy of [0, -7, 7]) {
    const c = { d, sx, sy };
    c.h = cost(c);
    if (!best || c.h < best.h) best = c;
  }
  return best;
}

function startCamera(v) {
  v.camAt = camSide(v);
  v.side = v.camAt.sx;
  const est = v.runLen / RUN_SPEED + JUMP_S + 1.2 + v.L * 0.09 + (v.opts.slowmo ? 1.2 : 0) + (v.fail ? 6 : 4.5);
  v.cine = playCinematic({
    id: 'fierljep', priority: 2, duration: est, letterbox: true, skippable: false, hideHud: true, pause: false,
    shot: () => v.cam && v.cam.last,
  });
}

function endCamera(v) {
  if (v.cine && isCinematicActive('fierljep')) skipCinematic();
  v.cine = false;
  v.cam = null;
}

function disposeVault(v) {
  if (v.disposed) return;
  v.disposed = true;
  v.over = true;
  if (!v.result) finishVault(v, v.fail ? 'fail' : 'landed');
  const scene = getScene();
  scene.remove(v.actor);
  scene.remove(v.pole);
  for (const o of v.pole.userData.owned) o.dispose();
  for (const o of v.handFlag.userData.owned) o.dispose();
  v.actor.traverse((o) => { if (o.isSkinnedMesh) o.geometry.dispose(); });
  const i = vaults.indexOf(v);
  if (i >= 0) vaults.splice(i, 1);
  const sp = world && world.extraSpeakers;
  if (sp) { const j = sp.indexOf(v.speaker); if (j >= 0) sp.splice(j, 1); }
}

function updateCamera(v, dt) {
  if (!v.opts.camera || v.result) return;
  const n = { x: -v.dir.y, y: v.dir.x };
  const mx = (v.from.x + v.to.x) / 2, my = (v.from.y + v.to.y) / 2;
  const fx = v.phase === 'run' ? v.x : mx * 0.4 + v.x * 0.6, fy = v.phase === 'run' ? v.y : my * 0.4 + v.y * 0.6;
  const cs = v.camAt || { d: 14, sx: 1, sy: 0, h: 0 };
  const wet = v.phase === 'topple' || v.phase === 'fall' || v.phase === 'swim';
  // a fall is watched from the take-off bank (that run-up is known to be open)
  const want = wet
    ? { x: v.from.x - v.dir.x * 7 - n.x * 2 * v.side, y: v.from.y - v.dir.y * 7 - n.y * 2 * v.side, z: 5.5 }
    : { x: fx + n.x * cs.d * cs.sx + v.dir.x * cs.sy, y: fy + n.y * cs.d * cs.sx + v.dir.y * cs.sy, z: 3.5 + Math.max(0, v.z) * 0.4 + (cs.h ? 4 : 0) };
  if (!v.cam) v.cam = { x: want.x, y: want.y, z: want.z, last: null };
  const s = 1 - Math.exp(-4 * dt);
  v.cam.x += (want.x - v.cam.x) * s; v.cam.y += (want.y - v.cam.y) * s; v.cam.z += (want.z - v.cam.z) * s;
  v.cam.last = { position: { x: v.cam.x, y: v.cam.y, z: v.cam.z }, lookAt: { x: v.x, y: v.y, z: Math.max(v.z, WATER_Y) + 1.2 }, fov: 50, cut: true };
}

function step(v, dt) {
  v.t += dt;
  v.pt += dt;
  const ud = v.actor.userData;
  const npc = v.npc;
  switch (v.phase) {
    case 'run': {
      const d = Math.min(v.runLen, v.pt * RUN_SPEED * Math.min(1, 0.45 + v.pt));
      v.x = v.from.x - Math.cos(v.runAngle) * (v.runLen - d);
      v.y = v.from.y - Math.sin(v.runAngle) * (v.runLen - d);
      v.z = 0;
      v.actor.position.set(v.x, 0, v.y);
      v.actor.rotation.set(0, -v.runAngle, 0);
      animatePersonWalk(v.actor, RUN_SPEED, dt);
      if (v.pt < 0.1 && v.t < 0.2 && Math.random() < 0.6) say(v, v.fail ? 'Hup, Jelle!' : 'Sjoch mar ris!', 1.6);
      if (d >= v.runLen - 1e-3) { setPhase(v, 'jump'); v.jx = v.x; v.jy = v.y; }
      break;
    }
    case 'jump': {
      const k = smooth(v.pt / JUMP_S);
      poleDir(THETA0, 0, v.dir, v.pd);
      const tx = v.pivot.x + v.pd.x * v.c0 - v.dir.x * Math.sin(THETA0 * 0.4) * HANG;
      const ty = v.pivot.y + v.pd.y * v.c0 - v.dir.y * Math.sin(THETA0 * 0.4) * HANG;
      const tz = v.pivot.z + v.pd.z * v.c0 - Math.cos(THETA0 * 0.4) * HANG;
      v.x = v.jx + (tx - v.jx) * k; v.y = v.jy + (ty - v.jy) * k;
      v.z = tz * k + Math.sin(k * Math.PI) * 0.9;
      v.actor.position.set(v.x, v.z, v.y);
      v.actor.rotation.set(0, -v.yaw, -THETA0 * 0.4 * k);
      poseDrop(ud, 1 - k);
      if (v.pt >= JUMP_S) {
        sfx(v, 'whoosh', 0.6);
        v.swingT = v.fail ? 1.5 : 1.05 + v.L * 0.09;
        v.c1 = v.fail ? v.L * 0.68 : v.L - 0.35;
        setPhase(v, 'swing');
      }
      break;
    }
    case 'swing': {
      const u = clamp(v.pt / v.swingT, 0, 1);
      if (v.fail) v.theta = THETA0 + (0.07 - THETA0) * (1 - (1 - u) * (1 - u)) + Math.sin(v.pt * 7) * 0.012 * u;
      else v.theta = THETA0 + (THETA1 - THETA0) * Math.pow(u, 1.7);
      v.c = v.c0 + (v.c1 - v.c0) * smooth(u * 1.15);
      placeOnPole(v);
      poseHang(ud, v.t, u < 0.85);
      if (u >= 1) {
        if (v.fail) { setPhase(v, 'topple'); say(v, 'Hè? Nee… nee!', 1.8); }
        else {
          setPhase(v, 'drop');
          v.dx0 = v.x; v.dy0 = v.y; v.dz0 = v.z;
          v.dropT = clamp(Math.sqrt((2 * Math.max(0.3, v.z)) / DROP_G) + 0.18, 0.45, 1.2);
          v.vz0 = (0 - v.z + 0.5 * DROP_G * v.dropT * v.dropT) / v.dropT;
        }
      }
      break;
    }
    case 'drop': {
      const tt = Math.min(v.pt, v.dropT), k = tt / v.dropT;
      v.x = v.dx0 + (v.to.x - v.dx0) * k;
      v.y = v.dy0 + (v.to.y - v.dy0) * k;
      v.z = Math.max(0, v.dz0 + v.vz0 * tt - 0.5 * DROP_G * tt * tt);
      v.actor.position.set(v.x, v.z, v.y);
      v.actor.rotation.set(0, -v.yaw, -THETA1 * 0.4 * (1 - k));
      poseDrop(ud, k);
      if (v.pt >= v.dropT) {
        setPhase(v, 'land');
        v.x = v.to.x; v.y = v.to.y; v.z = 0;
        sfx(v, 'bonk', 0.4);
      }
      break;
    }
    case 'land': {
      const k = v.pt < 0.3 ? smooth(v.pt / 0.12) : 1 - smooth((v.pt - 0.3) / 0.45);
      v.actor.position.set(v.x, 0, v.y);
      poseCrouch(ud, k);
      if (v.pt >= 0.75) {
        setPhase(v, 'cheer');
        v.handFlag.visible = true;
        say(v, pick(SAY_OK), 2.6);
      }
      break;
    }
    case 'cheer': {
      const k = smooth(v.pt / 0.3) * (1 - smooth((v.pt - 1.9) / 0.3));
      poseCheer(ud, v.t, k);
      v.handFlag.userData.flag.rotation.x = Math.sin(v.t * 9) * 0.5;
      if (v.pt >= 2.2) {
        v.handFlag.visible = false;
        npc.x = v.to.x; npc.y = v.to.y; npc.angle = v.yaw;
        if ('gz' in npc) npc.gz = 0;
        finishVault(v, 'landed');
        setPhase(v, 'idle');
      }
      break;
    }
    case 'topple': {
      const k = Math.pow(clamp(v.pt / 1.4, 0, 1), 2);
      v.phi = k * 1.45 * (v.side || (v.side = Math.random() < 0.5 ? -1 : 1));
      placeOnPole(v);
      v.actor.rotation.x = -v.phi * 0.6;
      poseHang(ud, v.t, false);
      if (Math.abs(v.phi) > 0.75) {
        setPhase(v, 'fall');
        v.fx0 = v.x; v.fy0 = v.y; v.fz0 = v.z;
        v.fallT = Math.sqrt((2 * Math.max(0.5, v.z - WATER_Y)) / DROP_G);
        say(v, 'Aaaaah!', 1.2);
      }
      break;
    }
    case 'fall': {
      const tt = Math.min(v.pt, v.fallT);
      const n = { x: -v.dir.y * Math.sign(v.phi), y: v.dir.x * Math.sign(v.phi) };
      v.x = v.fx0 + n.x * tt * 1.6; v.y = v.fy0 + n.y * tt * 1.6;
      v.z = v.fz0 - 0.5 * DROP_G * tt * tt;
      v.actor.position.set(v.x, v.z, v.y);
      v.actor.rotation.set(-Math.sign(v.phi) * (0.5 + tt * 0.8), -v.yaw, 0.2);
      poseFlail(ud, v.t);
      if (v.pt >= v.fallT) {
        world.particles.push({ kind: 'splash', x: v.x, y: v.y, until: world.time + 1.2 });
        world.particles.push({ kind: 'splash', x: v.x + v.dir.x * 0.8, y: v.y + v.dir.y * 0.8, until: world.time + 1.0 });
        sfx(v, 'splash', 1);
        setPhase(v, 'swim');
        v.swimFor = v.opts.swimTime ?? 5;
        setTimeout(() => { if (!v.disposed && v.phase === 'swim') say(v, pick(SAY_FAIL), 2.8); }, 700);
      }
      break;
    }
    case 'swim': {
      const tilt = -0.22;
      v.z = WATER_Y + 0.22 - 1.6 * Math.cos(tilt) + Math.sin(v.t * 2.4) * 0.04;
      v.actor.position.set(v.x, v.z, v.y);
      v.actor.rotation.set(0, -(v.yaw + Math.PI), tilt);
      swimPose(v.actor, v.t, false);
      npc.x = v.x; npc.y = v.y;
      if (v.released || v.pt >= v.swimFor) {
        npc.x = v.from.x - v.dir.x * 1.2; npc.y = v.from.y - v.dir.y * 1.2;
        npc.angle = v.yaw + Math.PI;
        finishVault(v, 'fail');
        setPhase(v, 'idle');
      }
      break;
    }
    case 'idle':
      if (v.opts.keepActor && !v.actorGone) animatePersonWalk(v.actor, 0, dt);
      break;
  }
  if (v.phase === 'run' || v.phase === 'jump') { v.theta = THETA0; v.phi = 0; }
  else if (!v.fail && v.phase !== 'swing') v.theta = Math.min(1.3, v.theta + dt * 1.8);
  else if (v.fail && v.phase !== 'swing' && v.phase !== 'topple') v.phi = v.side * Math.min(1.5, Math.abs(v.phi) + dt * 1.2);
  poleDir(v.theta, v.phi, v.dir, v.pd);
  orientPole(v);
  v.pole.userData.pennant.rotation.y = Math.sin(v.t * 6) * 0.35;
  v.speaker.x = v.x; v.speaker.y = v.y; v.speaker.h = Math.max(v.z, WATER_Y + 0.4) + 2.3;
  if (!v.result && v.phase !== 'idle') { npc.x = v.x; npc.y = v.y; npc.angle = v.yaw; }
  updateCamera(v, dt);
  if (v.phase === 'idle') {
    v.poleLife -= dt;
    if (v.poleLife <= 0 && !v.opts.keepActor) disposeVault(v);
  }
}

const _up = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3();
function orientPole(v) {
  _d.set(v.pd.x, v.pd.z, v.pd.y).normalize();
  v.pole.quaternion.setFromUnitVectors(_up, _d);
}

export function updatePoleVaults(dt, w) {
  world = w;
  if (!vaults.length) return;
  for (let i = vaults.length - 1; i >= 0; i--) {
    const v = vaults[i];
    if (v.disposed) continue;
    // slow motion at the top of the swing: only the jump slows down
    const apex = v.opts.slowmo && v.phase === 'swing' && v.pt > v.swingT * 0.4 && v.pt < v.swingT * 0.9;
    step(v, apex ? dt * 0.35 : dt);
  }
}

// --- finding a crossing -------------------------------------------------------

// A crossing runs straight across the canal: the take-off is on a bank, the
// direction is the narrowest way over within 30 degrees of that bank's
// normal, and the far bank (found along that direction, bridges ignored)
// must run roughly parallel, with a clear landing and no bridge or moored
// boat in the way.
const CROSS_SWEEP = 30 * Math.PI / 180;
const CROSS_STEPS = 6;
const FAR_PARALLEL = Math.cos(35 * Math.PI / 180);

// bridgeNear: refuse a crossing with a bridge within that many metres (a walk
// round beats a vault); 0 keeps every crossing.
export function findVaultSpot(map, x, y, radius = 60, { minWidth = 5, maxWidth = 22, why = null, bridgeNear = 0 } = {}) {
  const no = (k) => { if (why) why[k] = (why[k] || 0) + 1; };
  const wi = getWaterIndex(map);
  const wet = (px, py) => inMapWater(map, px, py);
  const pts = [];
  const grid = radius > 120 ? 4 : 3;
  for (let gx = -radius; gx <= radius; gx += grid) {
    for (let gy = -radius; gy <= radius; gy += grid) {
      const d = Math.hypot(gx, gy);
      if (d <= radius) pts.push([x + gx, y + gy, d]);
    }
  }
  pts.sort((a, b) => a[2] - b[2]);
  const solid = (px, py) => map.buildingsNear(px, py, 1).some((b) => {
    const [x0, y0, x1, y1] = b.bounds;
    return px >= x0 && px <= x1 && py >= y0 && py <= y1 && inPoly(px, py, b.pts);
  });
  // water entry and exit along a ray from (px, py), or null
  const span = (px, py, cx, cy) => {
    let s = 0.25;
    while (s <= 4.5 && !wet(px + cx * s, py + cy * s)) s += 0.25;
    if (s > 4.5) return null;
    const enter = s;
    while (s <= enter + maxWidth + 2 && wet(px + cx * s, py + cy * s)) s += 0.25;
    return { enter, exit: s, width: s - enter };
  };
  for (const [px, py] of pts) {
    if (wet(px, py) || solid(px, py)) continue;
    const sh = wi.nearestShore(px, py, 4.5);
    if (sh.i < 0) { no('noshore'); continue; }
    let nx = sh.ty, ny = -sh.tx;
    if (!wet(px + nx * (sh.d + 0.6), py + ny * (sh.d + 0.6))) { nx = -nx; ny = -ny; }
    if (!wet(px + nx * (sh.d + 0.6), py + ny * (sh.d + 0.6))) { no('normal'); continue; }
    const base = Math.atan2(ny, nx);
    let best = null;
    for (let k = -CROSS_STEPS; k <= CROSS_STEPS; k++) {
      const a = base + (k / CROSS_STEPS) * CROSS_SWEEP, cx = Math.cos(a), cy = Math.sin(a);
      const sp = span(px, py, cx, cy);
      if (!sp || sp.width > maxWidth + 1.5) continue;
      if (!best || sp.width < best.width - 0.05 || (Math.abs(sp.width - best.width) <= 0.05 && Math.abs(k) < Math.abs(best.k))) best = { ...sp, cx, cy, k };
    }
    // the narrowest way over still narrowing at the sweep's edge runs into a
    // junction or a basin, not across a canal
    if (best && Math.abs(best.k) === CROSS_STEPS) { no('edge'); continue; }
    if (!best || best.width < minWidth || best.width > maxWidth) { no(best ? 'width' + Math.round(best.width) : 'nospan'); continue; }
    const { cx, cy, enter, exit, width } = best;
    // a straight stretch: the same crossing a few metres up and down the bank
    // is about as wide (not a canal mouth, a junction or the end of a pond)
    let straight = true;
    for (const off of [-4, 4]) {
      const ox = px - cy * off, oy = py + cx * off;
      const sp = !wet(ox, oy) && span(ox, oy, cx, cy);
      if (!sp || Math.abs(sp.width - width) > Math.max(2.5, width * 0.25)) { straight = false; break; }
    }
    if (!straight) { no('bend'); continue; }
    const far = wi.nearestShore(px + cx * (exit + 0.2), py + cy * (exit + 0.2), 2);
    if (far.i < 0 || Math.abs(cx * far.ty - cy * far.tx) < FAR_PARALLEL) { no('far'); continue; }
    let blocked = false;
    for (let q = 0; q <= 8 && !blocked; q++) {
      const s = enter + width * (q / 8), qx = px + cx * s, qy = py + cy * s;
      blocked = map.isOnBridge(qx, qy) || map.isOnBridge(qx - cy * 3, qy + cx * 3) || map.isOnBridge(qx + cy * 3, qy - cx * 3) || insideWaterObstacle(map, qx, qy);
    }
    if (blocked) { no('blocked'); continue; }
    const lx = px + cx * (exit + 2.2), ly = py + cy * (exit + 2.2);
    if (wet(lx, ly) || wet(lx + cx * 3, ly + cy * 3) || solid(lx, ly) || solid(lx + cx * 2, ly + cy * 2) || solid(lx - cy * 2.5, ly + cx * 2.5) || solid(lx + cy * 2.5, ly - cx * 2.5) || map.isOnBridge(lx, ly)) { no('landing'); continue; }
    const fx = px + cx * (enter - 0.4), fy = py + cy * (enter - 0.4);
    let runOk = !solid(fx, fy);
    for (let d = 3; d <= 9 && runOk; d += 3) runOk = !solid(fx - cx * d, fy - cy * d) && !wet(fx - cx * d, fy - cy * d);
    if (!runOk) { no('runup'); continue; }
    return { from: { x: fx, y: fy }, to: { x: lx, y: ly }, width };
  }
  return null;
}


export function debugVault(opts = {}) {
  const w = world || (window.__debug && window.__debug.world);
  if (!w) return null;
  world = w;
  const p = w.player;
  const spot = findVaultSpot(w.map, p.x, p.y, opts.radius || 90);
  if (!spot) { w.addMessage('Geen sloot of gracht in de buurt om over te fierljeppen', 3); return null; }
  const npc = { x: spot.from.x - (spot.to.x - spot.from.x) * 0.9, y: spot.from.y - (spot.to.y - spot.from.y) * 0.9, angle: 0, appearance: JELLE_LOOK };
  const h = poleVault(npc, spot.from, spot.to, { camera: true, slowmo: !!opts.slowmo, fail: !!opts.fail, keepActor: true, swimTime: 4, ...opts });
  h.done.then(() => setTimeout(() => h.dispose(), 2500));
  return { spot, handle: h, npc };
}

if (typeof window !== 'undefined') window.__fierljep = { poleVault, findVaultSpot, debugVault, JELLE_LOOK, vaults };
