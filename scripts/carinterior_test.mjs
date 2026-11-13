import assert from 'node:assert/strict';
import { hasCarInterior, interiorLayout, doorTrims, interiorKlasse, klasseStijl, wrakStijl, innerShell, isCockpit } from '../game/js/carinteriorlayout.js';
import { cockpitLayout, isCockpitKlasse, tractorCabMaten } from '../game/js/cockpitlayout.js';
import { DEUR_DEFS } from '../game/js/vehicledoors.js';

const car = (name, extra = {}) => ({ model: { name, len: 4.2, wid: 1.8 }, ...extra });
assert.ok(hasCarInterior(car('hatch')));
assert.ok(hasCarInterior(car('sedan')));
for (const n of ['quad']) assert.ok(!hasCarInterior(car(n)), n);
for (const n of ['truck', 'cashvan', 'foodtruck']) assert.ok(hasCarInterior(car(n)), n);
assert.ok(hasCarInterior(car('hatch', { isBus: true })));
assert.equal(interiorLayout({ x: 3, y: 1.2, z: -0.8 }, 11, 2.5).rear, null, 'no rear bench in a bus cab');
for (const k of ['isBoat', 'isBike', 'isScooter']) assert.ok(!hasCarInterior(car('hatch', { [k]: true })), k);
// de cockpitklassen (#847) horen er ook bij: trekker, heli, vliegtuig en de machines
assert.ok(hasCarInterior(car('tractor', {})), 'trekker');
assert.ok(hasCarInterior(car('heli', { isHeli: true })), 'helikopter');
assert.ok(hasCarInterior(car('plane', { isPlane: true })), 'vliegtuig');
assert.ok(hasCarInterior(car('maaidorser', {})), 'maaidorser');
assert.ok(hasCarInterior(car('laadmachine', {})), 'laadmachine');
assert.ok(!hasCarInterior(null));
assert.ok(isCockpit(car('tractor')) && isCockpit(car('heli', { isHeli: true })) && isCockpit(car('plane', { isPlane: true })));
assert.ok(!isCockpit(car('hatch')) && !isCockpit(car('quad')) && !isCockpit(null));

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
  // de cockpitklassen (#847), ook als de naam van het model anders is dan de klasse
  assert.equal(k('tractor'), 'trekker');
  assert.equal(k('heli', { isHeli: true }), 'heli');
  assert.equal(k('plane', { isPlane: true }), 'vliegtuig');
  assert.equal(k('maaidorser'), 'machine');
  assert.equal(k('laadmachine'), 'machine');
  assert.equal(k('heli', { isHeli: true, isPolice: true }), 'heli', 'een politiehelikopter blijft een heli');
  assert.equal(k('truck', { isPolice: true }), 'politie', 'orde blijft: politie gaat voor vrachtwagen');
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
  // elke cockpitklasse heeft een eigen stijl die binnen zijn eigen cabine past
  for (const [klasse, naam, len, wid, cabSeat] of [
    ['trekker', 'tractor', 4.3, 2.3, { x: -1.02, y: 1.55, z: -0.1 }],
    ['heli', 'heli', 8.8, 2.1, { x: 0.62, y: 0.98, z: 0.4 }],
    ['vliegtuig', 'plane', 8, 10.6, { x: -0.1, y: 1.15, z: 0 }],
    ['machine', 'maaidorser', 7.4, 3.3, { x: 1.25, y: 2.28, z: -0.2 }],
    ['machine', 'laadmachine', 3.4, 1.8, { x: -0.15, y: 1.04, z: -0.1 }],
  ]) {
    const L = interiorLayout(cabSeat, len, wid, null, klasse, naam);
    const K = klasseStijl(klasse, L, cabSeat);
    assert.ok(K.seatColor !== null, klasse + ': eigen bekleding');
    for (const e of K.extras) {
      assert.ok(e.at.every((n) => Number.isFinite(n)) && e.b.every((x) => x > 0), klasse + ': eindige extra');
      assert.ok(e.at[1] - e.b[1] / 2 > L.cab.floorY - 0.2 && e.at[1] + e.b[1] / 2 < L.cab.roofY + 0.05, klasse + ': onderdeel binnen de cabinehoogte');
      assert.ok(Math.abs(e.at[2]) + e.b[2] / 2 <= L.cab.hw + 0.001, klasse + ': onderdeel binnen de cabinebreedte');
      assert.ok(e.at[0] > L.cab.x0 - 0.1 && e.at[0] < L.cab.x1 + 0.1, klasse + ': onderdeel binnen de cabinelengte');
    }
    // de cockpitindeling is dezelfde als die van cockpitlayout.js
    assert.deepEqual(L, cockpitLayout(klasse, cabSeat, len, wid, naam), klasse + ': interiorLayout geeft de cockpitindeling');
    assert.ok(isCockpitKlasse(klasse) && L.shell && L.cab);
    // de binnenhuid past in de cabine
    const S = innerShell(cabSeat, len, wid, L, null);
    assert.ok(S.x0 >= L.cab.x0 && S.x1 <= L.cab.x1 && S.floorY >= L.cab.floorY && S.roofY <= L.cab.roofY && S.hw <= L.cab.hw, klasse + ': binnenhuid in de cabine');
  }
  // de trekker-cabine is smaller dan model.wid/2; de portierbekleding volgt die halve breedte
  const tSeat = { x: -1.02, y: 1.55, z: -0.1 };
  const trekkerCab = tractorCabMaten(4.3, 2.3);
  const tTrims = doorTrims(DEUR_DEFS.tractor, 4.3, 2.3, trekkerCab.hw);
  assert.equal(tTrims.length, 2, 'trekker: twee portierbekledingen');
  for (const t of tTrims) {
    assert.ok(Math.abs(t.z) < trekkerCab.hw && Math.abs(t.z) > trekkerCab.hw - 0.15, 'trekker: bekleding tegen de cabinewand, niet tegen model.wid');
    assert.ok(t.y > trekkerCab.floorY && t.y + t.h / 2 < trekkerCab.belt, 'trekker: bekleding in het vaste deel onder de raamlijn');
    assert.ok(t.x > trekkerCab.x0 && t.x < trekkerCab.x1, 'trekker: bekleding in de cabine');
  }
  assert.ok(doorTrims(DEUR_DEFS.tractor, 4.3, 2.3).every((t) => Math.abs(t.z) > trekkerCab.hw), 'zonder hw zit de oude bekleding buiten de cabine: de halve breedte is echt nodig');
  void tSeat;
}
// De taxi en de politieauto hebben een ingerichte passagiersruimte (#442): het taxameter, de betaalautomaat en
// de scheidingsruit bij de taxi, de kooi en de mobilofoon bij de politie, met een eigen bekleding van de
// achterbank. Alles binnen de breedte en onder de dakhemel, zodat het door de ruiten te zien is.
{
  const seat = { x: -0.14, y: 0.38, z: -0.31 };
  const L = interiorLayout(seat, 4.6, 1.8);
  for (const [naam, min] of [['taxi', 10], ['politie', 14]]) {
    const K = klasseStijl(naam, L, seat);
    assert.ok(K.extras.length >= min, `${naam}: passagiersruimte ingericht (${K.extras.length})`);
    assert.notEqual(K.rearColor, null, `${naam}: eigen bekleding van de achterbank`);
    assert.ok(K.extras.some((e) => e.at[0] < seat.x - 0.3), `${naam}: onderdelen achter de voorstoelen`);
    assert.ok(K.extras.some((e) => e.at[0] > seat.x + 0.2), `${naam}: onderdelen bij het dashboard`);
    for (const e of K.extras) {
      assert.ok(e.at[1] - e.b[1] / 2 > 0 && e.at[1] + e.b[1] / 2 < L.roof.y, `${naam}: onderdeel onder de dakhemel`);
      assert.ok(Math.abs(e.at[2]) + e.b[2] / 2 <= 1.8 / 2 + 0.001, `${naam}: onderdeel binnen de breedte`);
    }
  }
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
// Wrakvariant (#847): dezelfde indeling, maar een eigen, donkere stijl met verschroeide bekleding,
// een scheve stoel en brokstukken op de vloer. Per klasse anders, en alles eindig en binnen de cabine.
{
  const gevallen = [
    ['auto', 4.3, 1.8, { x: -0.13, y: 0.38, z: -0.31 }],
    ['bestel', 5, 2, { x: 1.05, y: 0.72, z: -0.34 }],
    ['vrachtwagen', 8.5, 2.5, { x: 3.25, y: 1.47, z: -1.0 }],
    ['trekker', 4.3, 2.3, { x: -1.02, y: 1.55, z: -0.1 }],
    ['machine', 7.4, 3.3, { x: 1.25, y: 2.28, z: -0.2 }],
  ];
  const gezien = new Set();
  for (const [klasse, len, wid, seat] of gevallen) {
    const L = interiorLayout(seat, len, wid, null, klasse, klasse === 'machine' ? 'maaidorser' : '');
    const W = wrakStijl(klasse, L, seat);
    assert.ok(W.seatColor < 0x404040 && W.soot < 0x303030, klasse + ': roetzwarte bekleding en binnenhuid');
    assert.ok(W.seatTilt > klasseStijl(klasse, L, seat).seatTilt, klasse + ': de stoel staat schever dan normaal');
    assert.ok(W.seatKwijt, klasse + ': de tweede zitplaats is weg');
    assert.ok(W.brokstukken.length >= 2, klasse + ': brokstukken op de vloer');
    for (const p of W.brokstukken) {
      assert.ok(p.at.every((n) => Number.isFinite(n)) && p.b.every((n) => n > 0), klasse + ': eindig brokstuk');
      assert.ok(Math.abs(p.at[2]) + p.b[2] / 2 <= L.hw, klasse + ': brokstuk binnen de breedte');
      assert.ok(p.at[1] > 0 && p.at[1] < L.eye.y, klasse + ': brokstuk op de vloer, onder het oog');
    }
    assert.ok(!gezien.has(JSON.stringify(W)) , klasse + ': eigen wrakstijl');
    gezien.add(JSON.stringify(W));
  }
}
console.log('carinterior_test ok');
