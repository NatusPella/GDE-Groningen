import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { attachPlane, flyPlaneVehicle, planeInput, planeExitBlock, makeStrip, idlePlane, planeStatus } from '../game/js/planecontrol.js';
import { makePlane, stepPlane, veldBaan } from '../game/js/arcadeplane.js';

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

// --- landen op een tweede veld (#492): de gemeten baan uit game/vliegplekken.json ------------
const hier = path.dirname(fileURLToPath(import.meta.url));
const plekken = JSON.parse(readFileSync(path.join(hier, '../game/vliegplekken.json'), 'utf8'));
const veld = plekken.velden[0];
const baan = veldBaan(veld);
assert.ok(baan.contains(veld.x, veld.y), 'de baan van het tweede veld ligt op de gemeten plek');
const begin = baan.point(10);
const p2 = makePlane(begin.x, begin.y, 15, veld.heading);
p2.onGround = false; p2.speed = 30; p2.vz = -1;
for (let i = 0; i < 8000 && !p2.onGround && !p2.crashed; i++) stepPlane(p2, { throttle: 0.3, pitch: -0.5 }, dt, () => 0, (x, y) => baan.contains(x, y));
assert.ok(p2.onGround && !p2.crashed, 'landt op het tweede veld');
assert.ok(p2.landing === 'zacht' || p2.landing === 'hard', 'de landing op het tweede veld telt: ' + p2.landing);
// en ernaast is het nog steeds geen baan
const p3 = makePlane(begin.x, begin.y, 15, veld.heading);
p3.onGround = false; p3.speed = 30; p3.vz = -1;
for (let i = 0; i < 8000 && !p3.onGround && !p3.crashed; i++) stepPlane(p3, { throttle: 0.3, pitch: -0.5 }, dt, () => 0, () => false);
assert.ok(p3.crashed, 'naast het tweede veld crasht het nog steeds');

console.log('planecontrol_test ok');
