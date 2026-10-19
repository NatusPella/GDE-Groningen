// Turn-signal lamps per vehicle kind (#127): a bicycle has none (hand signals are not drawn),
// a scooter or motorbike gets small lamps near the middle, a car the usual blocks at the ends.
//   node scripts/indicator_lamps_test.mjs
import './node3d.mjs';
const globalDoc = { createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => {}, set: () => true }) }) };
globalThis.document = globalThis.document || globalDoc;
const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
const { updateIndicatorLamps } = await import('../game/js/models3d_vehicles.js');

let n = 0, bad = 0;
const ok = (c, name, info = '') => { n++; if (!c) { bad++; console.log('FAIL', name, info); } };
const run = (v) => { const mesh = new THREE.Group(); updateIndicatorLamps(mesh, v, 0); return mesh; };
const size = (l) => { l.geometry.computeBoundingBox(); const b = l.geometry.boundingBox; return [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z]; };

const bike = run({ isBike: true, indicator: 'left', model: { len: 1.8, wid: 0.6 } });
ok(bike.userData.indLamps.length === 2 && bike.userData.indLamps.every((l) => size(l)[0] <= 0.05 && Math.abs(Math.abs(l.position.z) - 0.3) < 0.05), 'a bicycle gets two tiny lamps on the handlebar ends');
{ const l = bike.userData.indLamps; updateIndicatorLamps(bike, { isBike: true, indicator: 'left', model: {} }, 0); ok(l.filter((x) => x.visible).length === 1 && l.find((x) => x.visible).userData.side < 0, 'bicycle: only the signalling side blinks'); }
const bikeOff = run({ isBike: true, indicator: null, model: { len: 1.8, wid: 0.6 } });
ok(!bikeOff.userData.indLamps, 'no signal, nothing built');

const scooter = run({ isScooter: true, indicator: 'right', model: { len: 1.7, wid: 0.7 } });
ok(scooter.userData.indLamps.length === 4, 'a scooter has four lamps');
ok(scooter.userData.indLamps.every((l) => size(l)[0] <= 0.1 && Math.abs(l.position.z) <= 0.31), 'scooter lamps are small and inside the bar width');
ok(scooter.userData.indLamps.filter((l) => l.position.x > 0).length === 2, 'scooter: two lamps at the bars, two at the tail');

const moto = run({ indicator: 'left', model: { len: 2.1, wid: 0.8, motorbike: true } });
ok(moto.userData.indLamps.length === 4 && size(moto.userData.indLamps[0])[0] <= 0.1, 'a motorbike has small lamps');

const car = run({ indicator: 'left', model: { len: 4.2, wid: 1.8 } });
ok(car.userData.indLamps.length === 4 && size(car.userData.indLamps[0])[0] >= 0.15, 'a car has the full blocks');
ok(car.userData.indLamps.every((l) => Math.abs(l.position.z) > 0.5), 'car lamps sit at the sides');

// only the side of the signal lights, and only in the "on" half of the period
const lit = (mesh, v, t) => { updateIndicatorLamps(mesh, v, t); return mesh.userData.indLamps.filter((l) => l.visible).length; };
const v = { indicator: 'left', model: { len: 4, wid: 1.7 } };
ok(lit(car, v, 0) === 2 && lit(car, v, 0.7) === 0, 'left signal: two lamps on, then dark');
ok(lit(car, { ...v, indicator: 'hazard' }, 0) === 4, 'hazards light all four');

console.log(bad ? `${bad} of ${n} failed` : `all passed (${n})`);
process.exit(bad ? 1 : 0);
