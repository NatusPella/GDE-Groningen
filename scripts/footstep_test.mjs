// The player's footsteps (game/js/sfx/steps.js): a step on every stride at
// walk, run and crouch speed, on every surface a sample exists for, a landing
// after a jump, a vault and a climb onto a car roof, and steps on the roof.
//   node scripts/footstep_test.mjs
import fs from 'node:fs';
import { stepNames, stepSurface, tickFoot, strideFor, STEP_SURFACES, STEP_VARIANTS } from '../game/js/sfx/steps.js';

let fails = 0;
const check = (name, ok, extra = '') => { if (!ok) { fails++; console.log('FAIL', name, extra); } else console.log('ok  ', name); };

// every name stepNames can hand out is a sample sfx/dsp.js renders
const dsp = fs.readFileSync(new URL('../game/js/sfx/dsp.js', import.meta.url), 'utf8');
const m = dsp.match(/for \(const s of \[([^\]]+)\]\) for \(let v = 0; v < (\d+); v\+\+\) def\(`step_\$\{s\}_\$\{v\}`/);
const rendered = new Set();
if (m) for (const s of m[1].split(',').map((x) => x.trim().replace(/'/g, ''))) for (let v = 0; v < +m[2]; v++) rendered.add(`step_${s}_${v}`);
check('dsp.js renders the step samples', rendered.size > 0);
for (const surf of ['klinkers', 'asfalt', 'fietspad', 'gras', 'wood', 'wet', 'zand', 'grind', 'deck', 'tegel', 'metal', undefined, 'iets-nieuws']) {
  for (const r of [0, 0.3, 0.6, 0.99]) {
    const names = stepNames(surf, r);
    if (!names.every((n) => rendered.has(n))) { check(`surface ${surf}: all sample names exist`, false, names.join(',')); break; }
  }
}
check('every surface maps onto a sample set', STEP_SURFACES.every((s) => stepSurface(s) === s) && stepSurface('fietspad') === 'asfalt' && stepSurface('?') === 'klinkers');
check('all four variants are reachable', new Set([0, 0.26, 0.51, 0.76].map((r) => stepNames('gras', r)[0])).size === STEP_VARIANTS);
check('a variant still rendering falls back to the others, then klinkers', stepNames('wood', 0).length === STEP_VARIANTS + 1 && stepNames('wood', 0).at(-1).startsWith('step_klinkers_'));

const run = (p, secs, dt = 1 / 60, each = null) => {
  const foot = { phase: 0, air: false, maxRise: 0, baseZ: 0 };
  const ev = [];
  for (let t = 0; t < secs; t += dt) {
    if (each) each(p, t);
    for (const e of tickFoot(foot, p, dt)) ev.push({ ...e, t });
  }
  return ev;
};
// player.js: jog 3.0, sprint 6.8, stroll 1.5, crouch 1.4
for (const [name, speed, crouch, stride] of [['jog', 3.0, false, 1.14], ['run', 6.8, false, 1.62], ['stroll', 1.5, false, 0.86], ['crouch', 1.4, true, 0.55], ['slow walk', 0.6, false, 0.5]]) {
  check(`${name}: stride ${stride} m`, Math.abs(strideFor(speed, crouch) - stride) < 0.02, strideFor(speed, crouch).toFixed(2));
  for (const dt of [1 / 144, 1 / 60, 1 / 20]) {
    const steps = run({ vx: speed, vy: 0, z: 0, crouching: crouch }, 4, dt).filter((e) => e.kind === 'step').length;
    const want = Math.floor(speed * 4 / stride);
    check(`${name} at ${Math.round(1 / dt)} fps: a step every stride (${steps}/${want})`, Math.abs(steps - want) <= 1);
  }
}
{
  const ev = run({ vx: 3.0, vy: 0, z: 0, vz: 0 }, 2, 1 / 60, (p, t) => {
    // a jump at 0.5 s: 3.45 m/s up, g 9.8
    const u = t - 0.5;
    p.z = u > 0 ? Math.max(0, 3.45 * u - 4.9 * u * u) : 0;
  });
  const land = ev.find((e) => e.kind === 'land');
  check('a jump plays a take-off and a landing', ev.some((e) => e.kind === 'takeoff') && !!land);
  check('the landing is a full one', land && land.k > 0.9);
  check('no steps in the air', !ev.some((e) => e.kind === 'step' && e.t > 0.52 && e.t < land.t));
  check('steps carry on after landing', ev.some((e) => e.kind === 'step' && e.t > land.t + 0.05 && e.t < land.t + 0.3));
}
{
  // vault: the player.vault state with z lifted; then on the ground again
  const ev = run({ vx: 4, vy: 0, z: 0 }, 1.5, 1 / 60, (p, t) => {
    p.vault = t > 0.3 && t < 0.8 ? {} : null;
    p.z = p.vault ? Math.sin(Math.PI * (t - 0.3) / 0.5) * 1.3 : 0;
  });
  check('a vault ends with a landing', ev.filter((e) => e.kind === 'land').length === 1);
}
{
  // climbing onto a car roof and walking on it: z stays 1.45 up there
  const ev = run({ vx: 2.2, vy: 0, z: 0, gz: 0 }, 3, 1 / 60, (p, t) => {
    p.vault = t > 0.2 && t < 0.75 ? { climb: {} } : null;
    p.perch = t >= 0.75 ? {} : null;
    p.z = p.perch ? 1.45 : p.vault ? 1.45 * (t - 0.2) / 0.55 : 0;
  });
  const land = ev.find((e) => e.kind === 'land');
  check('landing on the roof is heard', !!land && land.t >= 0.75 && land.t < 0.8);
  check('steps on the roof', ev.filter((e) => e.kind === 'step' && e.t > 0.8).length >= 4);
}
{
  // standing on a viaduct deck (gz 6): grounded, steps as normal
  const steps = run({ vx: 3.0, vy: 0, z: 0, gz: 6 }, 2).filter((e) => e.kind === 'step').length;
  check('steps up on a viaduct', steps >= 4);
}
{
  // swimming: z under the waterline still strokes
  const steps = run({ vx: 1.8, vy: 0, z: -0.4, swimming: true, water: 'swim' }, 3).filter((e) => e.kind === 'step').length;
  check('swim strokes sound', steps >= 5);
}

console.log(fails ? `${fails} failed` : 'all passed');
process.exit(fails ? 1 : 0);
