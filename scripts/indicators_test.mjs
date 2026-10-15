// Logic test for the turn signals (indicators.js):
//   node scripts/indicators_test.mjs
import { toggleIndicator, tickPlayerIndicator, updateIndicators } from '../game/js/indicators.js';

let fails = 0, n = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL', name); } };

const car = () => ({ angle: 0, steer: 0, speed: 8, x: 0, y: 0, driver: 'player', model: { len: 4, wid: 1.7 } });

let v = car();
ok(toggleIndicator(v, 'left') && v.indicator === 'left', 'a tap switches the left signal on');
toggleIndicator(v, 'left');
ok(v.indicator === null, 'a second tap switches it off');
toggleIndicator(v, 'right'); toggleIndicator(v, 'left');
ok(v.indicator === 'left', 'left replaces right');
ok(!toggleIndicator({ isBoat: true }, 'left'), 'boats have no signals');

// a left turn: the angle swings back (negative), then the wheels straighten
v = car(); toggleIndicator(v, 'left');
for (let i = 0; i < 20; i++) { v.angle -= 0.05; v.steer = -0.5; tickPlayerIndicator(v, 0.05); }
ok(v.indicator === 'left', 'still blinking in the middle of the turn');
for (let i = 0; i < 5; i++) { v.steer = 0; tickPlayerIndicator(v, 0.05); }
ok(v.indicator === null, 'off after the turn is done and the wheels are straight');

// a right signal while swinging left (the wrong way) stays on
v = car(); toggleIndicator(v, 'right');
for (let i = 0; i < 40; i++) { v.angle -= 0.05; v.steer = -0.2; tickPlayerIndicator(v, 0.05); }
ok(v.indicator === 'right', 'a swing the other way does not cancel the signal');
// a small lane change does not cancel it
v = car(); toggleIndicator(v, 'right');
for (let i = 0; i < 6; i++) { v.angle += 0.02; v.steer = 0.1; tickPlayerIndicator(v, 0.05); }
ok(v.indicator === 'right', 'a lane change leaves it on');
// the time limit
for (let i = 0; i < 600; i++) tickPlayerIndicator(v, 0.05);
ok(v.indicator === null, 'a forgotten signal times out');
// hazards never cancel by turning
v = car(); toggleIndicator(v, 'hazard');
for (let i = 0; i < 100; i++) { v.angle += 0.05; v.steer = 0.5; tickPlayerIndicator(v, 0.05); }
ok(v.indicator === 'hazard', 'hazards stay on');

// AI: blinks for a bend, off a moment after
const ai = { x: 10, y: 0, angle: 0, speed: 9, model: {} };
const w = { player: { x: 0, y: 0, inVehicle: null }, vehicles: [ai], input: null };
for (let i = 0; i < 10; i++) { ai.angle += 0.02; updateIndicators(0.05, w); }
ok(ai.indicator === 'right', 'an AI car swinging right blinks right');
for (let i = 0; i < 60; i++) updateIndicators(0.05, w);
ok(!ai.indicator, 'and stops after the bend');
const parked = { x: 10, y: 0, angle: 0, speed: 0, model: {} };
w.vehicles = [parked];
for (let i = 0; i < 10; i++) { parked.angle += 0.05; updateIndicators(0.05, w); }
ok(!parked.indicator, 'a standing car does not blink');

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
