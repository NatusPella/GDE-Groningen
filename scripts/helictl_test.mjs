import assert from 'node:assert';
import { expo, shapeAxis, shapeInputs, RAMP } from '../game/js/helictl.js';
import { chaseTarget, followCam } from '../game/js/helicam.js';
import { guideColor } from '../game/js/heligrade.js';

assert.strictEqual(expo(0), 0); assert.strictEqual(expo(1), 1); assert.strictEqual(expo(-1), -1);
assert.ok(expo(0.5) < 0.5 && expo(0.5) > 0, 'zachter bij kleine uitslag');
assert.ok(expo(-0.3) < 0 && expo(-0.3) === -expo(0.3), 'tekenvast');

// een tik van 0,05 s geeft maar een klein beetje; vasthouden komt op 1
const dt = 1 / 60;
let a = 0; for (let i = 0; i < 3; i++) a = shapeAxis(a, 1, dt);
assert.ok(a > 0 && a < 0.3);
for (let i = 0; i < 60; i++) a = shapeAxis(a, 1, dt);
assert.strictEqual(a, 1);
// loslaten: terug op exact 0, nooit door nul heen
for (let i = 0; i < 60; i++) { a = shapeAxis(a, 0, dt); assert.ok(a >= 0); }
assert.strictEqual(a, 0);
// omkeren van +1 naar -1 remt eerst (geen sprong)
let b = 1; b = shapeAxis(b, -1, dt); assert.ok(b < 1 && b > 0.8);
// tijden kloppen: volledig opbouwen duurt ~RAMP.up
let c = 0, t = 0; while (c < 1) { c = shapeAxis(c, 1, dt); t += dt; }
assert.ok(Math.abs(t - RAMP.up) < 2 * dt);
const ctl = {}; const out = shapeInputs(ctl, { up: 1, yaw: -1, fwd: 0, side: 0 }, 1);
assert.deepStrictEqual(out, { up: 1, yaw: -1, fwd: 0, side: 0 });

// camera: achter de heli, kijkt vooruit, vloeiend
const h = { x: 0, y: 0, z: 50, angle: 0, vx: 0, vy: 0 };
const T = chaseTarget(h);
assert.ok(T.pos.x < 0 && T.pos.z > 50 && T.look.x > 0);
const fast = chaseTarget({ ...h, vx: 30 });
assert.ok(fast.pos.x < T.pos.x && fast.fov > T.fov, 'verder terug en ruimer bij snelheid');
// zijwaarts bewegen schuift de kijkrichting een beetje mee, begrensd
const sl = chaseTarget({ ...h, vx: 0, vy: 20 });
assert.ok(sl.dir > 0 && sl.dir <= 0.6 + 1e-9);
let cam = null; cam = followCam(cam, T, dt);
const far = { pos: { x: 100, y: 0, z: 50 } };
const c1 = followCam(cam, far, dt), c2 = followCam(c1, far, dt);
assert.ok(c1.x > cam.x && c1.x < 100 && c2.x > c1.x, 'glijdt');
assert.strictEqual(guideColor('goed'), 0x5dff7a); assert.strictEqual(guideColor('te snel'), 0xff5a3c); assert.strictEqual(guideColor('uitlijnen'), 0xffc21a);
console.log('helictl_test ok');
