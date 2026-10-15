// Drift scoring: thresholds, combos, transitions, banking and crashes.
//   node scripts/drift_test.mjs
import { DRIFT, createDrift, stepDrift, driftMedal, slipAngle } from '../game/js/drift.js';

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };
const DT = 1 / 60;
const run = (d, slip, speed, secs, crashed = false) => {
  let banked = 0;
  for (let i = 0; i < secs / DT; i++) banked += stepDrift(d, { slip, speed, dt: DT, crashed }).banked;
  return banked;
};

{
  const d = createDrift();
  run(d, 0.1, 20, 3);
  check('a gentle angle is no drift', d.cur === 0 && !d.chain);
  run(d, 0.5, 5, 3);
  check('a slow slide is no drift', d.cur === 0 && !d.chain);
  run(d, 0.5, 20, 1);
  check('a real slide scores', d.cur > 0 && d.active && d.chain);
  const first = d.cur;
  run(d, 0.5, 20, 1);
  check('score keeps growing', d.cur > first * 1.5);
}

{
  const d = createDrift();
  run(d, 0.5, 20, 2.4);
  check('multiplier 1 under 2.5 s', d.mult === 1);
  run(d, 0.5, 20, 0.3);
  check('multiplier 2 after 2.5 s', d.mult === 2);
  run(d, 0.5, 20, 20);
  check('multiplier capped', d.mult === DRIFT.maxMult);
}

{
  const d = createDrift();
  run(d, 0.5, 20, 1);
  run(d, -0.5, 20, 1);
  check('a change of direction adds to the multiplier', d.flips === 1 && d.mult >= 2);
  run(d, 0.5, 20, 0.2);
  check('three transitions in a row', d.flips === 2);
}

{
  const d = createDrift();
  run(d, 0.5, 20, 2);
  const pts = Math.round(d.cur);
  const banked = run(d, 0, 20, DRIFT.grace - 0.2);
  check('the chain survives a short pause', d.chain && banked === 0);
  run(d, 0.5, 20, 1);
  check('and goes on after it', d.chain && d.cur > pts);
  const b2 = run(d, 0, 20, DRIFT.grace + 0.2);
  check('banks after the grace period', b2 > pts && d.total === b2 && !d.chain && d.cur === 0 && d.mult === 1, `${b2} ${d.total}`);
  check('best chain is remembered', d.best === b2);
}

{
  const d = createDrift();
  run(d, 0.5, 20, 3);
  const r = stepDrift(d, { slip: 0.5, speed: 20, dt: DT, crashed: true });
  check('a crash loses the unbanked points', r.crashed && d.cur === 0 && d.total === 0 && d.mult === 1 && !d.chain);
  const r2 = stepDrift(d, { slip: 0, speed: 20, dt: DT, crashed: true });
  check('a crash without a chain is not reported', !r2.crashed);
}

check('medals', driftMedal(0, [10, 20, 30]) === 0 && driftMedal(10, [10, 20, 30]) === 1 && driftMedal(29, [10, 20, 30]) === 2 && driftMedal(99, [10, 20, 30]) === 3);

{
  check('straight is no slip', Math.abs(slipAngle(0, 10, 0, 0)) < 1e-9);
  const s = slipAngle(0, 10, 0, 5);
  check('sideways velocity gives a slip angle', Math.abs(s - Math.atan2(5, 10)) < 1e-9, s);
  check('reverse and crawl give none', slipAngle(0, -5, 0, 3) === 0 && slipAngle(0, 0.5, 0, 2) === 0);
  check('sign follows the side', slipAngle(0, 10, 0, -5) < 0);
}

if (bad) process.exit(1);
console.log('drift: all passed');
