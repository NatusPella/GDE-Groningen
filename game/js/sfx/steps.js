// The player's footstep rhythm and the step-sample names, kept free of
// Web Audio so node scripts/footstep_test.mjs can check them.

export const STEP_SURFACES = ['klinkers', 'asfalt', 'gras', 'wood', 'wet', 'grind', 'zand', 'metaal'];
export const STEP_VARIANTS = 4;
const KNOWN = new Set(STEP_SURFACES);
// what the map / countryside / interiors can report, folded onto a sample set
const ALIAS = { fietspad: 'asfalt', weg: 'asfalt', aarde: 'gras', akker: 'gras', tegel: 'klinkers', vloer: 'wood', deck: 'wood', steiger: 'wood', metal: 'metaal', rooster: 'metaal', water: 'wet' };

export function stepSurface(s) {
  if (KNOWN.has(s)) return s;
  return ALIAS[s] || 'klinkers';
}

// Sample names to try for one step, in order: a random variant of the
// surface, its other variants (one may still be rendering), then klinkers.
// memory (optional, { surface: variant }): the variant played last on this surface is skipped, so one foot never sounds twice in a row.
export function stepNames(surface, r = Math.random(), memory = null) {
  const s = stepSurface(surface);
  let v0 = Math.floor(r * STEP_VARIANTS) % STEP_VARIANTS;
  if (memory) { if (memory[s] === v0) v0 = (v0 + 1) % STEP_VARIANTS; memory[s] = v0; }
  const out = [];
  for (let i = 0; i < STEP_VARIANTS; i++) out.push(`step_${s}_${(v0 + i) % STEP_VARIANTS}`);
  if (s !== 'klinkers') out.push(`step_klinkers_${v0}`);
  return out;
}

// --- recorded steps (#988, ADR 0039) -------------------------------------------------------------------------
// Real footsteps (CC0 / CC-BY from Freesound, game/audio/sfx/stap_<surface>_<n>.ogg, sources in docs/AUDIO-LICENTIES.md) come first; the
// procedural set above stays as the fall-back when a file is missing or the surface is unknown.
export const FILE_SURFACES = [...STEP_SURFACES, 'binnen', 'ren'];
export const FILE_VARIANTS = 6;
// What the world tells the feet that the map cannot: true while the player is upstairs in the flat (set each frame by worldevents.js, which knows home.js;
// foley.js may not import it without closing an import cycle).
export const stepContext = { indoors: false };
const FILE_KNOWN = new Set(FILE_SURFACES);
// running (not a surface of its own) uses the 'ren' recordings on these hard surfaces
const RUN_ON = new Set(['klinkers', 'asfalt', 'binnen']);
// what the procedural set can stand in for a file-only surface
export const PROC_STAND_IN = { binnen: 'wood', ren: 'asfalt' };
const FILE_ALIAS = { strand: 'zand', duin: 'zand', pad: 'grind', split: 'grind', erf: 'grind', onverhard: 'grind', parket: 'binnen', huis: 'binnen', kantoor: 'binnen', tegels: 'klinkers', stoep: 'klinkers', beton: 'asfalt' };

export function fileSurface(s) {
  if (FILE_KNOWN.has(s)) return s;
  return FILE_ALIAS[s] || stepSurface(s);
}

// Sample names to try for one recorded step, in order: a random variant of the surface (the variant played last on it is skipped, so no two
// equal steps in a row), then its other variants. run: a sprint on a hard surface sounds with the running set.
// memory (optional, { surface: variant }) is the same kind of object as for stepNames.
export function fileStepNames(surface, r = Math.random(), memory = null, run = false) {
  let s = fileSurface(surface);
  if (run && RUN_ON.has(s)) s = 'ren';
  let v0 = Math.floor(r * FILE_VARIANTS) % FILE_VARIANTS;
  if (memory) { if (memory['f' + s] === v0) v0 = (v0 + 1) % FILE_VARIANTS; memory['f' + s] = v0; }
  const out = [];
  for (let i = 0; i < FILE_VARIANTS; i++) out.push(`stap_${s}_${(v0 + i) % FILE_VARIANTS}`);
  return out;
}
export const FILE_STEP_KEYS = FILE_SURFACES.flatMap((f) => Array.from({ length: FILE_VARIANTS }, (_, v) => `stap_${f}_${v}`));

// Which foot: left and right alternate. side is 0 or 1; the sideways offset (m, to the right of the walking direction) pans the step a little
// and the pitch differs by a hair, so the two feet are not the same sound.
export function footSide(side) { return { offset: side ? 0.16 : -0.16, rate: side ? 1.012 : 0.988 }; }

// A small random loudness change per step (±1.5 dB), so no two steps carry exactly the same weight.
export function gainJitter(r = Math.random()) { return Math.pow(10, ((r * 2 - 1) * 1.5) / 20); }

// Other people's feet: much softer than your own, softer and duller with distance, never louder than your own walking.
// distance in m (the listener is the camera, a few metres behind you); returns { gain, lp } (lp 0 = no filter).
export function npcStep(distance, run, cop) {
  const base = run ? (cop ? 0.2 : 0.15) : 0.09;
  const fall = 1 / (1 + Math.max(0, distance - 2) / 6);
  return { gain: base * fall, lp: distance > 6 ? Math.max(1800, 9000 - distance * 360) : 0 };
}

// One foot to the next at the cadence models3d_people.js animatePersonWalk
// swings the legs: ~0.85 m strolling, ~1.15 m at a jog, ~1.6 m sprinting.
export function strideFor(speed, crouch) {
  return crouch ? 0.55 : Math.max(0.4, speed / (2 * Math.min(2.1, 0.42 + 0.3 * speed)));
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
    const k = Math.min(1, Math.max(0.3, (foot.maxRise + Math.max(0, foot.baseZ - z)) / 0.55));
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
      const run = speed > 4.5, crouch = !!p.crouching;
      out.push({ kind: 'step', gain: crouch ? 0.08 : run ? 0.3 : 0.2, rate: run ? 0.88 : crouch ? 1.12 : 1, run, crouch });
    }
  } else foot.phase = Math.min(foot.phase, 0.5);
  return out;
}
