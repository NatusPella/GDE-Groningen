// Bus handling for the player, with the real driving physics (Vehicle
// .applyControls with the player's tuning, the suspension of
// settleVehicleHeight) on a flat open plane, next to a hatchback for scale:
//   turning circle   full lock at walking pace (radius of the driven circle)
//   sharp turn       full lock held at 30 km/h: radius, sideways g (a real
//                    city bus tips around 0.4 g) and body roll that settles
//                    without rocking
//   0-50 km/h        throttle from standstill
//   brake 50-0       S / brake from 50 km/h
//   node scripts/bus_handling_test.mjs [--verbose]
import './node3d.mjs';

const { Vehicle, settleVehicleHeight } = await import('../game/js/vehicle.js');
const { MIDIBUS_MODEL } = await import('../game/js/trafficfleet.js');
const VERBOSE = process.argv.includes('--verbose');
const DT = 1 / 120;
const FLAT = {};

function make(model, flags = {}) {
  const v = new Vehicle(0, 0, 0, { ...model });
  Object.assign(v, flags);
  v.driver = 'player';
  return v;
}

function step(v, throttle, steer, brake) {
  v.applyControls(DT, throttle, steer, brake);
  settleVehicleHeight(v, FLAT, DT);
}

// holds a speed with throttle / brake while steering
function hold(v, vT, steer) {
  const t = v.speed < vT - 0.05 ? 1 : 0, b = v.speed > vT + 0.3 ? 0.4 : 0;
  step(v, t, steer, b);
}

function circleRadius(v, vT, secs) {
  for (let i = 0; i < 6 / DT; i++) hold(v, vT, 0);
  for (let i = 0; i < 1.5 / DT; i++) hold(v, vT, 1);
  const pts = [];
  let yaw = 0, prev = v.angle, peakRoll = 0, rolls = [];
  for (let i = 0; i < secs / DT; i++) {
    hold(v, vT, 1);
    pts.push([v.x, v.y]);
    let d = v.angle - prev; d = Math.atan2(Math.sin(d), Math.cos(d)); yaw += d; prev = v.angle;
    peakRoll = Math.max(peakRoll, Math.abs(v.susRoll || 0));
    rolls.push(Math.abs(v.susRoll || 0));
  }
  let far = 0;
  for (let i = 0; i < pts.length; i += 4) for (let j = i + 4; j < pts.length; j += 4) far = Math.max(far, Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]));
  const yawRate = Math.abs(yaw) / secs;
  const r = Math.abs(yaw) > Math.PI * 2 ? far / 2 : Math.abs(v.speed) / yawRate;
  return { r, latG: Math.abs(v.speed) * yawRate / 9.81, roll: rolls[rolls.length - 1], peakRoll };
}

// steer from straight into full lock at 30 km/h: how far the roll overshoots
// its settled value (rocking) and how long it takes to settle
function rollStep(v) {
  for (let i = 0; i < 8 / DT; i++) hold(v, 8.33, 0);
  const rolls = [];
  for (let i = 0; i < 6 / DT; i++) { hold(v, 8.33, 1); rolls.push(Math.abs(v.susRoll || 0)); }
  const end = rolls[rolls.length - 1];
  const peak = Math.max(...rolls);
  let settle = 0;
  for (let i = rolls.length - 1; i >= 0; i--) if (Math.abs(rolls[i] - end) > end * 0.1) { settle = (i + 1) * DT; break; }
  return { overshoot: end > 1e-4 ? peak / end - 1 : 0, settle };
}

function accelTime(v, kmh) {
  let t = 0;
  while (v.speed < kmh / 3.6 && t < 60) { step(v, 1, 0, 0); t += DT; }
  return t;
}

function brakeDist(v, kmh) {
  for (let i = 0; i < 60 / DT && v.speed < kmh / 3.6; i++) step(v, 1, 0, 0);
  v.speed = kmh / 3.6;
  const x0 = v.x;
  let t = 0;
  while (v.speed > 0.05 && t < 30) { step(v, -1, 0, 0); t += DT; }
  return v.x - x0;
}

function steerLag(v) {
  for (let i = 0; i < 5 / DT; i++) hold(v, 8.33, 0);
  let t = 0;
  while (v.steer < 0.95 && t < 5) { hold(v, 8.33, 1); t += DT; }
  return t;
}

const BUS = { name: 'bus', len: 11, wid: 2.35, maxSpeed: 22, accel: 4.5, brake: 12, turnRate: 1.1, color: '#132a44' };
const HATCH = { name: 'hatch', len: 3.8, wid: 1.7, maxSpeed: 42, accel: 9, brake: 23, turnRate: 3.0, color: '#888' };
const KINDS = [
  ['bus', () => make(BUS, { isBus: true })],
  ['midibus', () => make(MIDIBUS_MODEL, { isBus: true })],
  ['hatch', () => make(HATCH)],
];

const out = {};
for (const [name, mk] of KINDS) {
  const slow = circleRadius(mk(), 2.5, 14);
  const sharp = circleRadius(mk(), 8.33, 12);
  const rs = rollStep(mk());
  out[name] = {
    turnR: slow.r, sharpR: sharp.r, sharpG: sharp.latG, roll: sharp.roll, overshoot: rs.overshoot, settle: rs.settle,
    t50: accelTime(mk(), 50), brake50: brakeDist(mk(), 50), steerLag: steerLag(mk()),
  };
}

const f = (x, d = 1) => x.toFixed(d);
for (const [name, r] of Object.entries(out)) {
  console.log(`${name.padEnd(8)} turn ${f(r.turnR)} m · 30 km/h full lock ${f(r.sharpR)} m, ${f(r.sharpG, 2)} g, roll ${f(r.roll * 57.3)}°, overshoot ${f(r.overshoot * 100, 0)}%, settles ${f(r.settle, 2)} s · 0-50 ${f(r.t50)} s · brake 50-0 ${f(r.brake50)} m · full lock in ${f(r.steerLag, 2)} s`);
}

const fails = [];
for (const name of ['bus', 'midibus']) {
  const r = out[name];
  if (r.turnR > 12) fails.push(`${name}: turning circle radius ${f(r.turnR)} m > 12 m`);
  if (r.sharpG > 0.4) fails.push(`${name}: ${f(r.sharpG, 2)} g sideways at 30 km/h full lock, would tip`);
  if (r.sharpR > 22) fails.push(`${name}: radius ${f(r.sharpR)} m at 30 km/h full lock, the bus will not make a corner`);
  if (r.overshoot > 0.25) fails.push(`${name}: body roll overshoots ${f(r.overshoot * 100, 0)}% (rocking)`);
  if (r.t50 > 14) fails.push(`${name}: 0-50 km/h in ${f(r.t50)} s`);
  if (r.brake50 > 32) fails.push(`${name}: ${f(r.brake50)} m to stop from 50 km/h`);
  if (r.steerLag > 0.5) fails.push(`${name}: ${f(r.steerLag, 2)} s to full lock`);
}
if (VERBOSE) console.log(JSON.stringify(out, null, 1));
if (fails.length) {
  console.log(`\n${fails.length} problem(s):\n  ` + fails.join('\n  '));
  process.exit(1);
}
console.log('\nbus handling ok');
