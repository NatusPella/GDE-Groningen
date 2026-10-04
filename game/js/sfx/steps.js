// The player's footstep rhythm and the step-sample names, kept free of
// Web Audio so node scripts/footstep_test.mjs can check them.

export const STEP_SURFACES = ['klinkers', 'asfalt', 'gras', 'wood', 'wet'];
export const STEP_VARIANTS = 4;
const KNOWN = new Set(STEP_SURFACES);
// what the map / countryside / interiors can report, folded onto a sample set
const ALIAS = { fietspad: 'asfalt', weg: 'asfalt', zand: 'gras', grind: 'klinkers', aarde: 'gras', akker: 'gras', tegel: 'klinkers', vloer: 'wood', deck: 'wood', steiger: 'wood', metal: 'klinkers', water: 'wet' };

export function stepSurface(s) {
  if (KNOWN.has(s)) return s;
  return ALIAS[s] || 'klinkers';
}

// Sample names to try for one step, in order: a random variant of the
// surface, its other variants (one may still be rendering), then klinkers.
export function stepNames(surface, r = Math.random()) {
  const s = stepSurface(surface);
  const v0 = Math.floor(r * STEP_VARIANTS) % STEP_VARIANTS;
  const out = [];
  for (let i = 0; i < STEP_VARIANTS; i++) out.push(`step_${s}_${(v0 + i) % STEP_VARIANTS}`);
  if (s !== 'klinkers') out.push(`step_klinkers_${v0}`);
  return out;
}

export function strideFor(speed, crouch) {
  return crouch ? 0.55 : speed > 6 ? 1.05 : 0.75;
}

// Feet on something: the ground, or a car roof (z > 0 up there).
export function grounded(p) {
  return !!p.perch || (p.z || 0) <= 0;
}

// One frame of the player's feet. foot: { phase, air, maxRise, baseZ }.
// Returns what to play: { kind: 'takeoff' | 'land' | 'step', gain, rate, k }.
export function tickFoot(foot, p, dt, out = []) {
  out.length = 0;
  const speed = Math.hypot(p.vx || 0, p.vy || 0);
  const z = (p.gz || 0) + (p.z || 0);
  if (!grounded(p) || p.vault) {
    if (!foot.air) { foot.air = true; foot.baseZ = z; foot.maxRise = 0; out.push({ kind: 'takeoff', gain: 0.16, rate: 1.1 }); }
    foot.maxRise = Math.max(foot.maxRise, z - foot.baseZ, 0);
    return out;
  }
  if (foot.air) {
    foot.air = false;
    // how far you came down from the top of the arc
    const k = Math.min(1, Math.max(0.3, (foot.maxRise + Math.max(0, foot.baseZ - z)) / 0.8));
    out.push({ kind: 'land', gain: 0.22 * k, rate: 0.9, k });
    // the next foot comes down half a stride later
    foot.phase = strideFor(speed, p.crouching) * 0.5;
    foot.maxRise = 0;
    return out;
  }
  if (speed > 0.3) {
    const stride = strideFor(speed, p.crouching);
    foot.phase += speed * dt;
    if (foot.phase >= stride) {
      foot.phase %= stride;
      const run = speed > 6, crouch = !!p.crouching;
      out.push({ kind: 'step', gain: crouch ? 0.08 : run ? 0.3 : 0.2, rate: run ? 0.88 : crouch ? 1.12 : 1 });
    }
  } else foot.phase = Math.min(foot.phase, 0.5);
  return out;
}
