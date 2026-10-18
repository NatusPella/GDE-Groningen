import assert from 'node:assert';
import { attachPlane, flyPlaneVehicle, planeInput, planeExitBlock, makeStrip, idlePlane, planeStatus } from '../game/js/planecontrol.js';

const keys = new Set();
const isDown = (k) => keys.has(k);
const flat = () => 5;
const strip = makeStrip({ x: 0, y: 0, heading: 0, length: 900 });
assert.ok(strip.contains(100, 3) && !strip.contains(100, 40) && !strip.contains(1200, 0));

// gas blijft staan na loslaten
const st = { thr: 0 };
keys.add('w'); planeInput(isDown, st, 1); keys.delete('w');
assert.ok(st.thr > 0.4 && planeInput(isDown, st, 1).throttle === st.thr);

const v = { x: 0, y: 0, model: {}, health: 100 };
attachPlane(v, 0, 0, 5, 0);
assert.strictEqual(planeExitBlock(v), '', 'stilstaand mag uitstappen');
// opstijgen met alleen toetsen
const dt = 1 / 60;
keys.add('w');
for (let i = 0; i < 60 * 14 && v.onGround; i++) {
  if (v.speed > 31) keys.add(' ');
  flyPlaneVehicle(v, dt, isDown, flat, (x, y) => strip.contains(x, y));
}
assert.ok(!v.onGround && v.speed > 30 && v.x < 900, 'opgestegen binnen de baan');
assert.ok(planeExitBlock(v).startsWith('Eerst landen'));
assert.ok(v.z > 5 && v.airborne);
keys.delete(' ');
// bocht met D
const a0 = v.angle;
keys.add('d');
for (let i = 0; i < 240; i++) flyPlaneVehicle(v, dt, isDown, flat, () => false);
assert.ok(Math.abs(v.angle - a0) > 0.3);
keys.clear();
// motorstoring: geen gas, landt of crasht, wordt wrak
v.disabled = true;
for (let i = 0; i < 60 * 120 && !v.wrecked && !v.onGround; i++) flyPlaneVehicle(v, dt, isDown, flat, () => false);
assert.ok(v.wrecked && v.health === 0, 'zonder baan wordt het een wrak');
assert.strictEqual(planeStatus(v).state, 'Neergestort');
// geparkeerd rolt uit
const w = { x: 0, y: 0, model: {} }; attachPlane(w, 0, 0, 5, 0); w.plane.speed = 10;
for (let i = 0; i < 200; i++) idlePlane(w, dt, flat);
assert.strictEqual(w.speed, 0);
console.log('planecontrol_test ok');
