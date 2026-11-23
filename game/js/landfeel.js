// Landing and dust feel (juice, 23-11): what the feet and the wheels throw up when they touch down or pull away.
// Pure rules, Node-safe, no THREE or world; fx3d.js asks for the numbers and spawns the pooled puffs, so there is no
// allocation per frame (the tick functions reuse the state and out objects). `fx` is effectsFor() from a11ylogic.js:
// with reduced motion the camera dip is 0 (the dust itself is a plain picture and stays).

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// --- dust colour per surface (surfaceUnder in vehicle.js) ---------------------------------------
// Grass and soil throw a warm brown-green dust, paving a pale grey one. rgb 0..1, alpha of the puff.
const DUST = {
  gras: [0.46, 0.42, 0.28, 0.34],
  klinkers: [0.74, 0.72, 0.68, 0.22],
  asfalt: [0.7, 0.7, 0.68, 0.2],
  fietspad: [0.7, 0.68, 0.64, 0.2],
};
export function dustLook(surface, out = [0, 0, 0, 0]) {
  const d = DUST[surface] || DUST.klinkers;
  out[0] = d[0]; out[1] = d[1]; out[2] = d[2]; out[3] = d[3];
  return out;
}

// --- on foot -------------------------------------------------------------------------------------
const FOOT_LAND_MIN_K = 0.3;      // the same floor as tickFoot in sfx/steps.js: a tiny hop is no landing
const FOOT_LAND_RISE = 0.55;             // m of fall that counts as a full landing (same as tickFoot)
export const RUN_DUST_FROM = 5.2;        // m/s: a jog raises nothing, a run does
const LAUNCH_DUST_FROM = 5.4;     // m/s reached from a standstill: the starting burst
const LAUNCH_SLOW = 2.4;                 // m/s: below this the walker counts as having stood still

export function makeFootFx() { return { air: false, baseZ: 0, maxRise: 0, slow: true }; }

// One frame of the player's feet. p: { z, gz, perch, vault, vx, vy }. out is overwritten:
//   takeoff - the feet just left the ground; land - 0 or the strength 0.3..1 of a landing just now;
//   launch  - true on the frame a standing walker reaches a run; runRate - dust puffs per second while running.
export function tickFootFx(st, p, dt, out) {
  out.takeoff = false; out.land = 0; out.launch = false; out.runRate = 0;
  const speed = Math.hypot(p.vx || 0, p.vy || 0);
  const z = (p.gz || 0) + (p.z || 0);
  const onGround = !!p.perch || (p.z || 0) <= 0;
  if (!onGround || p.vault) {
    if (!st.air) { st.air = true; st.baseZ = z; st.maxRise = 0; out.takeoff = true; }
    st.maxRise = Math.max(st.maxRise, z - st.baseZ, 0);
    st.slow = false;
    return out;
  }
  if (st.air) {
    st.air = false;
    const k = clamp((st.maxRise + Math.max(0, st.baseZ - z)) / FOOT_LAND_RISE, 0, 1);
    out.land = k >= FOOT_LAND_MIN_K ? k : 0;
    st.maxRise = 0;
    return out;
  }
  if (speed < LAUNCH_SLOW) st.slow = true;
  else if (st.slow && speed >= LAUNCH_DUST_FROM) { st.slow = false; out.launch = true; }
  if (speed > RUN_DUST_FROM && !p.crouching) out.runRate = clamp((speed - RUN_DUST_FROM) * 3 + 2, 0, 9);
  return out;
}

// Number of puffs, their spread speed (m/s) and size (m) for a landing of strength k (0.3..1).
export function footLandPuffs(k) { return Math.round(3 + 6 * clamp(k, 0, 1)); }
export const footLandSpeed = (k) => 0.9 + 1.5 * clamp(k, 0, 1);
export const footLandSize = (k) => 0.18 + 0.2 * clamp(k, 0, 1);

// Camera dip of a landing (rad, negative = the view sinks) and the haptic strength; 0 under reduced motion.
export function footLandDip(k, fx = { cameraShake: 1 }) {
  if (!fx.cameraShake) return 0;
  return -(0.006 + 0.022 * clamp(k, 0, 1)) * Math.min(1, fx.cameraShake);
}

// --- vehicles ------------------------------------------------------------------------------------
// A car that comes down hard after a jump: a ring of dust, on paving also sparks from the bottoming-out, and a thump.
export const VEHICLE_LAND_MIN = 3.2;     // m/s of vertical speed: under this the suspension eats it
const VEHICLE_LAND_FULL = 11;            // m/s: the strongest effect

const vehicleLandK = (hit) => clamp((hit - VEHICLE_LAND_MIN) / (VEHICLE_LAND_FULL - VEHICLE_LAND_MIN), 0, 1);

// -> { puffs, sparks, dip, haptic }; null when the landing is too soft to notice.
export function vehicleLandFx(hit, paved, small = false, fx = { cameraShake: 1 }, out = { puffs: 0, sparks: 0, dip: 0, haptic: 0 }) {
  if (!(hit > VEHICLE_LAND_MIN)) return null;
  const k = vehicleLandK(hit);
  out.puffs = Math.round((small ? 5 : 9) + (small ? 6 : 14) * k);
  out.sparks = paved && !small && k > 0.35 ? Math.round(4 + 12 * k) : 0;
  out.dip = fx.cameraShake ? -(0.01 + 0.035 * k) * Math.min(1, fx.cameraShake) : 0;
  out.haptic = 0.3 + 0.7 * k;
  return out;
}

// --- speed streaks (post-process) ------------------------------------------------------------------
// The radial speed blur at the screen edge grows with the extra FOV that the speed feel already adds (camlean.js:
// speed FOV 0..8 plus drift 0..3). 0 under the threshold, at most MAX; off with reduced motion or Speed feel off.
const STREAK_FROM_FOV = 3;
export const STREAK_MAX = 0.6;
export function streakAmount(fovBonus, fx = { cameraSway: 1 }) {
  if (!fx.cameraSway || !(fovBonus > STREAK_FROM_FOV)) return 0;
  return STREAK_MAX * clamp((fovBonus - STREAK_FROM_FOV) / (11 - STREAK_FROM_FOV), 0, 1);
}
