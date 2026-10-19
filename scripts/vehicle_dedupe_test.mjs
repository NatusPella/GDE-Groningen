// #211: duplicate and stacked identical vehicles are removed. node scripts/vehicle_dedupe_test.mjs
import './node3d.mjs';
const { dedupeVehicles } = await import('../game/js/vehicle.js');
let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL', m); } };
const van = (x, y, o = {}) => ({ x, y, angle: 0, model: { name: 'busje' }, label: 'Transport', ...o });
const a = van(0, 0), b = van(0.1, 0), c = van(0, 0.2), far = van(10, 0), turned = van(0, 0, { angle: 1.5 }), me = van(0, 0, { driver: 'player' });
let list = [a, b, c, far, turned, me];
ok(dedupeVehicles(list) === 2 && list.length === 4 && list[0] === a && list.includes(far) && list.includes(turned) && list.includes(me), 'stacked copies go, the rest stays');
list = [a, a, a];
ok(dedupeVehicles(list) === 2 && list.length === 1, 'the same object three times');
list = [a, van(0, 0, { model: { name: 'bus' } }), van(0, 0, { label: 'Ander' })];
ok(dedupeVehicles(list) === 0, 'another model or label is not a twin');
list = [a, van(0, 0, { wrecked: true })];
ok(dedupeVehicles(list) === 0, 'a wreck is not touched');
console.log(`vehicle_dedupe_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
