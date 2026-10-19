import assert from 'node:assert/strict';
import { hasCarInterior, interiorLayout, doorTrims } from '../game/js/carinteriorlayout.js';
import { DEUR_DEFS } from '../game/js/vehicledoors.js';

const car = (name, extra = {}) => ({ model: { name, len: 4.2, wid: 1.8 }, ...extra });
assert.ok(hasCarInterior(car('hatch')));
assert.ok(hasCarInterior(car('sedan')));
for (const n of ['tractor', 'quad']) assert.ok(!hasCarInterior(car(n)), n);
for (const n of ['truck', 'cashvan', 'foodtruck']) assert.ok(hasCarInterior(car(n)), n);
assert.ok(hasCarInterior(car('hatch', { isBus: true })));
assert.equal(interiorLayout({ x: 3, y: 1.2, z: -0.8 }, 11, 2.5).rear, null, 'no rear bench in a bus cab');
for (const k of ['isBoat', 'isBike', 'isScooter', 'isHeli']) assert.ok(!hasCarInterior(car('hatch', { [k]: true })), k);
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

// dakhemel en portierbekleding (#51, sluit aan op de deuren van #225)
for (const [naam, len, wid, seat] of [['sedan', 4.3, 1.8, { x: -0.25, y: 0.38, z: -0.3 }], ['hatch', 3.8, 1.7, { x: -0.2, y: 0.3, z: -0.27 }], ['truck', 7, 2.4, { x: 2.5, y: 1.0, z: -1.0 }]]) {
  const L = interiorLayout(seat, len, wid);
  assert.ok(L.roof.y > L.eye.y + 0.3, naam + ': dak boven het hoofd');
  assert.ok(L.roof.x0 < L.eye.x && L.roof.x1 > L.eye.x, naam + ': dak boven de bestuurder');
  assert.ok(L.roof.w <= wid, naam + ': dak binnen de romp');
  for (const p of L.roof.pillars) assert.ok(p.y1 > p.y0 && Math.abs(p.z) < wid / 2, naam + ': A-stijl');
  const trims = doorTrims(DEUR_DEFS[naam], len, wid);
  assert.ok(trims.length >= 2, naam + ': bekleding voor de voordeuren');
  for (const t of trims) assert.ok(Math.abs(t.z) < wid / 2 && Math.abs(t.z) > wid / 2 - 0.15 && Math.abs(t.x) + t.w / 2 < len / 2 && t.h > 0.2, naam + ' ' + t.id);
}
assert.equal(doorTrims(DEUR_DEFS.sedan, 4.3, 1.8).length, 4, 'sedan: vier portieren');
assert.equal(doorTrims(DEUR_DEFS.hatch, 3.8, 1.7).length, 2, 'hatch: twee portieren');
assert.equal(doorTrims(DEUR_DEFS.bus, 11.2, 2.55).length, 0, 'bus: schuifdeuren krijgen geen portierbekleding');
assert.equal(doorTrims(null, 4, 1.8).length, 0);
console.log('carinterior_test ok');
