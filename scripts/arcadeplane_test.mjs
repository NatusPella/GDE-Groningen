import assert from 'node:assert';
import { makePlane, stepPlane, PLANE } from '../game/js/arcadeplane.js';

const flat = () => 0;
const dt = 1 / 60;
const p = makePlane(0, 0, 0, 0);
// gas, rennen, dan neus omhoog
let t = 0;
while (!(!p.onGround) && t < 60) { stepPlane(p, { throttle: 1, pitch: p.speed > PLANE.liftoff ? 1 : 0 }, dt, flat); t += dt; }
assert.ok(!p.onGround && p.x > 20, 'komt van de baan');
for (let i = 0; i < 600; i++) stepPlane(p, { throttle: 1, pitch: 0.6 }, dt, flat);
assert.ok(p.z > 50 && !p.crashed, 'klimt');

// bocht: rollen verandert de koers
const h0 = p.heading;
for (let i = 0; i < 180; i++) stepPlane(p, { throttle: 0.7, roll: 1 }, dt, flat);
assert.ok(Math.abs(p.heading - h0) > 0.3, 'bocht maakt koers');

// overtrek: gas dicht en neus op, snelheid zakt onder stall en hij zakt weg
const s = makePlane(0, 0, 300, 0); s.onGround = false; s.speed = 40;
for (let i = 0; i < 1500 && !s.crashed; i++) stepPlane(s, { throttle: 0, pitch: 1 }, dt, flat);
assert.ok(s.crashed || s.z < 300, 'overtrek zakt');

// zachte landing op de baan
const l = makePlane(0, 0, 40, 0); l.onGround = false; l.speed = 30; l.vz = -2;
for (let i = 0; i < 6000 && !l.onGround && !l.crashed; i++) stepPlane(l, { throttle: 0.3, pitch: -0.05 }, dt, flat);
assert.ok(l.onGround && !l.crashed, 'landt');

// naast de baan = crash
const c = makePlane(0, 0, 10, 0); c.onGround = false; c.speed = 30; c.vz = -2;
for (let i = 0; i < 600 && !c.crashed; i++) stepPlane(c, { throttle: 0.3, pitch: -0.3 }, dt, flat, () => false);
assert.ok(c.crashed, 'crasht naast de baan');
// duiken
const d = makePlane(0, 0, 100, 0); d.onGround = false; d.speed = 40; d.vz = -20;
for (let i = 0; i < 600 && !d.crashed && !d.onGround; i++) stepPlane(d, { throttle: 0.5, pitch: -1 }, dt, flat);
assert.ok(d.crashed, 'duikvlucht crasht');
console.log('arcadeplane_test ok');
