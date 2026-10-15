// Driving sim: the player car's 0-100 km/h in the three shift modes, the rev
// limiter, engine braking and an arcade drift with the assist on and off.
//   node scripts/drive_sim.mjs
import './node3d.mjs';

const { Vehicle } = await import('../game/js/vehicle.js');
const { shift } = await import('../game/js/gearbox.js');
const { createDrift, stepDrift } = await import('../game/js/drift.js');

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };
const DT = 1 / 60;

const hatch = () => ({ name: 'hatch', len: 3.8, wid: 1.7, maxSpeed: 42, accel: 9, brake: 23, turnRate: 3.0, color: '#c7c9cc' });
function player(mode) {
  const v = new Vehicle(0, 0, 0, hatch());
  v.driver = 'player';
  v.shiftMode = mode;
  return v;
}

// 0-100 km/h (27.78 m/s); manual shifts at the shift light
function zeroTo100(mode, shiftAt = 0.9) {
  const v = player(mode);
  let t = 0;
  while (v.speed < 27.78 && t < 30) {
    if (mode !== 'auto' && v.gb && v.gb.rpm > v.gb.p.red * shiftAt && !v.gb.limiter) {
      v.clutchIn = mode === 'clutch';
      if (v.gb.gear < v.gb.p.tops.length) shift(v.gb, 1, v.speed / 42);
    } else v.clutchIn = false;
    v.applyControls(DT, 1, 0, false);
    t += DT;
  }
  return t;
}

const tAuto = zeroTo100('auto');
const tMan = zeroTo100('manual');
console.log('0-100 auto', tAuto.toFixed(2), 's, manual', tMan.toFixed(2), 's');
check('automatic 0-100 stays at 6-8 s', tAuto >= 6 && tAuto <= 8, tAuto);
check('manual with decent shifts within 1.5 s of automatic', Math.abs(tMan - tAuto) < 1.5, tMan);

// stuck in first at full throttle: the limiter holds the car under its top of first
{
  const v = player('manual');
  for (let i = 0; i < 600; i++) v.applyControls(DT, 1, 0, false);
  const topFirst = 0.15 / 0.93 * 42;
  check('first gear tops out at its limit', v.speed < topFirst * 1.08 && v.speed > topFirst * 0.7, v.speed);
  check('limiter active', v.gb.rpm <= v.gb.p.red);
}

// engine braking: off the throttle, a lower gear slows the car more in manual
{
  const slow = (g) => {
    const v = player('manual');
    v.speed = 18;
    v.applyControls(DT, 0, 0, false);
    v.gb.pos = g; v.gb.gear = g;
    for (let i = 0; i < 60; i++) v.applyControls(DT, 0, 0, false);
    return v.speed;
  };
  const a = slow(2), b = slow(5);
  check('lower gear brakes harder off the throttle', a < b, a + ' vs ' + b);
  const auto = player('auto');
  auto.speed = 18;
  for (let i = 0; i < 60; i++) auto.applyControls(DT, 0, 0, false);
  check('automatic coasting unchanged by engine braking', auto.speed > a, auto.speed);
}

// no gearbox on a boat or bicycle
{
  const v = new Vehicle(0, 0, 0, { name: 'bike', len: 1.75, wid: 0.5, maxSpeed: 6.2, accel: 3.2, brake: 6, turnRate: 4.6 });
  v.isBike = true; v.driver = 'player';
  v.applyControls(DT, 1, 0, false);
  check('bicycle has no gearbox', v.gb === null);
}

// drift: handbrake turn at speed, scored
function driftRun(assist) {
  const v = player('auto');
  v.driftAssist = assist;
  v.speed = 24;
  const d = createDrift();
  let maxSlip = 0, spun = false, t = 0;
  for (let i = 0; i < 60 * 6; i++) {
    t = i * DT;
    const hb = t > 0.4 && t < 1.2;
    const steer = t < 3 ? 0.7 : 0;
    v.applyControls(DT, t > 1.0 && t < 4 ? 1 : 0, steer, hb);
    maxSlip = Math.max(maxSlip, Math.abs(v.slipAngle));
    if (Math.abs(v.slipAngle) > 1.9) spun = true;
    stepDrift(d, { slip: v.slipAngle, speed: Math.abs(v.speed), dt: DT, crashed: false });
  }
  return { maxSlip, spun, d, v };
}
const on = driftRun(true), off = driftRun(false);
console.log('drift assist on: slip', on.maxSlip.toFixed(2), 'score', Math.round(on.d.cur + on.d.total), '| off: slip', off.maxSlip.toFixed(2), 'score', Math.round(off.d.cur + off.d.total));
check('handbrake turn makes a real slide', on.maxSlip > 0.25, on.maxSlip);
check('the slide scores points', on.d.cur + on.d.total > 100);
check('assist keeps the slide from spinning out', !on.spun);
check('everything stays finite', [on, off].every((r) => Number.isFinite(r.v.x) && Number.isFinite(r.v.y) && Number.isFinite(r.v.speed)));

// straight driving never counts as drifting
{
  const v = player('auto');
  const d = createDrift();
  for (let i = 0; i < 600; i++) {
    v.applyControls(DT, 1, i % 120 < 60 ? 0.3 : -0.3, false);
    stepDrift(d, { slip: v.slipAngle, speed: Math.abs(v.speed), dt: DT, crashed: false });
  }
  check('weaving at full throttle without handbrake scores nothing', d.total + d.cur < 1, d.total + d.cur);
}

if (bad) process.exit(1);
console.log('drive sim: all passed');
