import assert from 'node:assert/strict';
import { hasCarInterior, interiorLayout, doorTrims, interiorKlasse, klasseStijl } from '../game/js/carinteriorlayout.js';
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
for (const [len, wid, seat] of [[4.3, 1.8, { x: -0.25, y: 0.38, z: -0.3 }], [11, 2.5, { x: 4.5, y: 1.2, z: -1.0 }]]) {
  const L = interiorLayout(seat, len, wid);
  assert.ok(L.mirror.y < L.roof.y && L.mirror.y > L.eye.y, 'spiegel hangt tussen oog en dak');
}
// interieur per voertuigklasse (#51)
{
  const k = (name, extra = {}) => interiorKlasse(car(name, extra));
  assert.equal(k('hatch'), 'auto');
  assert.equal(k('sport'), 'sport');
  assert.equal(k('taxi'), 'taxi');
  assert.equal(k('sedan', { isTaxi: true }), 'taxi');
  assert.equal(k('van'), 'bestel');
  assert.equal(k('cashvan'), 'bestel');
  assert.equal(k('truck'), 'vrachtwagen');
  assert.equal(k('sedan', { isPolice: true }), 'politie');
  assert.equal(k('van', { isAmbulance: true }), 'ambulance');
  assert.equal(k('bus', { isBus: true }), 'bus');
  assert.equal(interiorKlasse(null), 'auto');
  const seat = { x: -0.25, y: 0.38, z: -0.3 };
  const klassen = ['auto', 'sport', 'taxi', 'politie', 'ambulance', 'bestel', 'vrachtwagen', 'bus'];
  const stijlen = klassen.map((n) => JSON.stringify(klasseStijl(n, interiorLayout(seat, 4.3, 1.8), seat)));
  assert.equal(new Set(stijlen).size, klassen.length, 'elke klasse ziet er anders uit');
  for (const n of klassen) {
    const L = interiorLayout(seat, 4.3, 1.8);
    const K = klasseStijl(n, L, seat);
    for (const e of K.extras) {
      assert.ok(e.at[1] > 0 && e.at[1] < L.roof.y, n + ': onderdeel onder het dak');
      assert.ok(Math.abs(e.at[2]) <= 1.8 / 2 && e.b.every((x) => x > 0), n + ': onderdeel binnen de carrosserie');
    }
  }
  assert.ok(klasseStijl('bus', interiorLayout(seat, 4.3, 1.8), seat).wheel.r > klasseStijl('sport', interiorLayout(seat, 4.3, 1.8), seat).wheel.r, 'busstuur groter dan sportstuur');
}
// de indeling hangt aan de echte romp (#442): dashboard onder de raamlijn en achter de voorruit,
// het stuur en de binnenspiegel achter het glas, de dakhemel onder het echte dak
const hatchRomp = { belt: 0.93, roof: 1.47, xA: 0.9, xB: 0.15, xC: -1.4, xD: -1.7 };
const vanRomp = { belt: 1.08, roof: 2.08, xA: 2.05, xB: 1.4, xC: -2.46, xD: -2.48 };
for (const [len, wid, seat, romp] of [[3.8, 1.7, { x: -0.11, y: 0.38, z: -0.29 }, hatchRomp], [4.3, 1.8, { x: -0.13, y: 0.38, z: -0.31 }, hatchRomp], [4.1, 1.85, { x: -0.12, y: 0.3, z: -0.31 }, hatchRomp], [5, 2, { x: 1.05, y: 0.72, z: -0.34 }, vanRomp]]) {
  const L = interiorLayout(seat, len, wid, romp);
  assert.ok(L.dash.y + L.dash.h <= romp.belt, 'dashboard onder de raamlijn');
  assert.ok(L.dash.x + L.dash.d / 2 <= romp.xA, 'dashboard achter de voorruit');
  assert.ok(L.wheel.x < L.dash.x && L.wheel.y + 0.13 < romp.roof, 'stuur achter het dashboard en onder het dak');
  assert.ok(L.mirror.y < L.roof.y && L.mirror.y > L.eye.y, 'spiegel tussen oog en dak');
  assert.ok(L.mirror.x > L.eye.x && L.mirror.x < L.roof.x1 + 0.01, 'spiegel voor het oog, aan de dakhemel');
  assert.ok(L.roof.y < romp.roof && L.roof.x1 < romp.xB, 'dakhemel onder het echte dak en achter de voorruit');
  assert.ok(L.roof.x0 > Math.min(romp.xC, seat.x - 1.1) - 0.01, 'dakhemel tot de achterruit');
}
console.log('carinterior_test ok');
