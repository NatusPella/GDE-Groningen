// 3D-positie en de luisteraar (#497), uit audio.js gehaald. De WebAudio-context,
// de mute/voice-budgetten, de sfx-bus en de camera komen via setSpatialHost
// binnen, zodat deze module niets uit audio.js hoeft te importeren.
import { hoofdspeler } from '../players.js';
import { listenerMoved } from './paramwrite.js';

export const MAX_DISTANCE = 120;
export const SOURCE_HEIGHT = 1;
export const HRTF_NEAR = 14;

let host = null;
export function setSpatialHost(h) { host = h; }

// World (x, y) maps to three/WebAudio (x, z); the listener follows the 3D
// camera, so the same right-handed frame is shared by picture and sound.
const listenerPos = { x: 0, y: 0, z: 0 };
const listenerVel = { x: 0, y: 0 };

export function makePanner({ ref = 5, rolloff = 1, model = 'HRTF', maxDist = MAX_DISTANCE } = {}) {
  const p = host.ctx().createPanner();
  p.panningModel = model;
  p.distanceModel = 'inverse';
  p.refDistance = ref;
  p.rolloffFactor = rolloff;
  p.maxDistance = maxDist;
  return p;
}

export function setPannerPos(p, x, y, h = SOURCE_HEIGHT, smooth = false) {
  // a non-finite position (a NaN spot from the data) would throw on every AudioParam write
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(h)) return;
  if (p.positionX) {
    if (smooth) {
      const t = host.ctx().currentTime;
      p.positionX.setTargetAtTime(x, t, 0.03);
      p.positionY.setTargetAtTime(h, t, 0.03);
      p.positionZ.setTargetAtTime(y, t, 0.03);
    } else {
      p.positionX.value = x;
      p.positionY.value = h;
      p.positionZ.value = y;
    }
  } else {
    p.setPosition(x, h, y);
  }
}

export function distToListener(x, y, h = SOURCE_HEIGHT) {
  return Math.hypot(x - listenerPos.x, h - listenerPos.y, y - listenerPos.z);
}

export function inverseGain(d, ref, rolloff) {
  return ref / (ref + rolloff * (Math.max(d, ref) - ref));
}

// A ref-counted panner that every node of one positional one-shot feeds;
// it disconnects once the last of them has ended. null = out of range.
export function spatialOut(x, y, opts = {}) {
  // Vóór initAudio (testruns, het eerste beeld) is er nog geen host: dan is er ook
  // geen ruimtelijk geluid, en geen crash in de verhaaltest (#553).
  if (!host || !host.ctx() || host.muted() || !host.voiceOk(opts.prio ?? 1)) return null;
  const h = opts.h ?? SOURCE_HEIGHT;
  if (distToListener(x, y, h) > (opts.range ?? MAX_DISTANCE)) return null;
  // HRTF only where it is heard as such: far one-shots pan with equal power
  const panner = makePanner(opts.model || distToListener(x, y, h) < HRTF_NEAR ? opts : { ...opts, model: 'equalpower' });
  setPannerPos(panner, x, y, h);
  panner.connect(opts.bus || host.sfxBus());
  let refs = 0;
  let used = false;
  // a group whose every voice was refused by the budget never gets a release
  queueMicrotask(() => { if (!used) panner.disconnect(); });
  return {
    node: panner,
    hold() { refs++; used = true; },
    release() { if (--refs <= 0) panner.disconnect(); },
  };
}

function rotateByQuat(q, vx, vy, vz, out) {
  const tx = 2 * (q.y * vz - q.z * vy);
  const ty = 2 * (q.z * vx - q.x * vz);
  const tz = 2 * (q.x * vy - q.y * vx);
  out[0] = vx + q.w * tx + (q.y * tz - q.z * ty);
  out[1] = vy + q.w * ty + (q.z * tx - q.x * tz);
  out[2] = vz + q.w * tz + (q.x * ty - q.y * tx);
  return out;
}

// scratch vectors and the pose last written to the listener: no arrays per frame, no automation for a listener that stood still
const fwdScratch = [0, 0, -1], upScratch = [0, 1, 0];
const lastPose = { ctx: null, pos: [NaN, NaN, NaN], fwd: [0, 0, 0], up: [0, 0, 0], set: false };
export const listenerStats = { written: 0, skipped: 0 };

export function updateListener(world) {
  const ctx = host.ctx();
  if (!ctx) return;
  const p = hoofdspeler(world);
  const cam = host.getCamera();
  let fwd, up;
  if (cam) {
    listenerPos.x = cam.position.x;
    listenerPos.y = cam.position.y;
    listenerPos.z = cam.position.z;
    fwd = rotateByQuat(cam.quaternion, 0, 0, -1, fwdScratch);
    up = rotateByQuat(cam.quaternion, 0, 1, 0, upScratch);
  } else {
    listenerPos.x = p.x;
    listenerPos.y = SOURCE_HEIGHT;
    listenerPos.z = p.y;
    fwdScratch[0] = Math.cos(p.angle || 0); fwdScratch[1] = 0; fwdScratch[2] = Math.sin(p.angle || 0);
    upScratch[0] = 0; upScratch[1] = 1; upScratch[2] = 0;
    fwd = fwdScratch; up = upScratch;
  }
  const v = p.inVehicle;
  listenerVel.x = v ? Math.cos(v.angle) * v.speed : (p.vx || 0);
  listenerVel.y = v ? Math.sin(v.angle) * v.speed : (p.vy || 0);

  if (!(Number.isFinite(listenerPos.x) && Number.isFinite(listenerPos.y) && Number.isFinite(listenerPos.z)
    && Number.isFinite(fwd[0]) && Number.isFinite(fwd[1]) && Number.isFinite(fwd[2])
    && Number.isFinite(up[0]) && Number.isFinite(up[1]) && Number.isFinite(up[2]))) return;
  if (lastPose.ctx !== ctx) { lastPose.ctx = ctx; lastPose.set = false; } // a new context starts with a new listener
  if (!listenerMoved(lastPose.set ? lastPose : null, listenerPos.x, listenerPos.y, listenerPos.z, fwd, up)) { listenerStats.skipped++; return; }
  lastPose.set = true;
  lastPose.pos[0] = listenerPos.x; lastPose.pos[1] = listenerPos.y; lastPose.pos[2] = listenerPos.z;
  lastPose.fwd[0] = fwd[0]; lastPose.fwd[1] = fwd[1]; lastPose.fwd[2] = fwd[2];
  lastPose.up[0] = up[0]; lastPose.up[1] = up[1]; lastPose.up[2] = up[2];
  listenerStats.written++;
  const L = ctx.listener;
  if (L.positionX) {
    const t = ctx.currentTime;
    const tau = 0.02;
    L.positionX.setTargetAtTime(listenerPos.x, t, tau);
    L.positionY.setTargetAtTime(listenerPos.y, t, tau);
    L.positionZ.setTargetAtTime(listenerPos.z, t, tau);
    L.forwardX.setTargetAtTime(fwd[0], t, tau);
    L.forwardY.setTargetAtTime(fwd[1], t, tau);
    L.forwardZ.setTargetAtTime(fwd[2], t, tau);
    L.upX.setTargetAtTime(up[0], t, tau);
    L.upY.setTargetAtTime(up[1], t, tau);
    L.upZ.setTargetAtTime(up[2], t, tau);
  } else {
    L.setPosition(listenerPos.x, listenerPos.y, listenerPos.z);
    L.setOrientation(fwd[0], fwd[1], fwd[2], up[0], up[1], up[2]);
  }
}


