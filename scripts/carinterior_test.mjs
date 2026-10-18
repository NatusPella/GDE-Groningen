import assert from 'node:assert/strict';
import { hasCarInterior, interiorLayout } from '../game/js/carinteriorlayout.js';

const car = (name, extra = {}) => ({ model: { name, len: 4.2, wid: 1.8 }, ...extra });
assert.ok(hasCarInterior(car('hatch')));
assert.ok(hasCarInterior(car('sedan')));
for (const n of ['truck', 'tractor', 'quad', 'cashvan']) assert.ok(!hasCarInterior(car(n)), n);
for (const k of ['isBus', 'isBoat', 'isBike', 'isScooter', 'isHeli']) assert.ok(!hasCarInterior(car('hatch', { [k]: true })), k);
assert.ok(!hasCarInterior(null));

for (const [len, wid, seat] of [[4.2, 1.8, { x: -0.25, y: 0.38, z: -0.3 }], [3.4, 1.6, { x: -0.2, y: 0.3, z: -0.27 }], [5, 2, { x: 0.3, y: 0.66, z: -0.34 }]]) {
  const L = interiorLayout(seat, len, wid);
  // eye above the cushion, ahead of the seat back, behind the wheel and dash
  assert.ok(L.eye.y > seat.y + 0.4 && L.eye.y < seat.y + 0.9);
  assert.ok(L.eye.x < L.wheel.x && L.wheel.x < L.dash.x);
  // everything stays inside the body width
  for (const s of L.seats) assert.ok(Math.abs(s.z) + 0.25 < wid / 2 + 0.01, 'seat inside body');
  assert.ok(L.dash.w <= wid);
  // passenger sits on the other side
  assert.ok(L.seats[0].z * L.seats[1].z < 0);
  assert.ok(Object.values(L).every((o) => typeof o !== 'object' || o === null || Object.values(o).every((n) => typeof n !== 'number' || Number.isFinite(n))));
}
console.log('carinterior_test ok');
