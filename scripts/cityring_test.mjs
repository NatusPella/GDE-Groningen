// De ring om de stad blijft resident (#1052): cityRingKeys kiest de tegels binnen `ring` tegels van een stadstegel,
// zonder de stadstegels zelf en zonder overlay-tegels.
//   node scripts/cityring_test.mjs
import './node3d.mjs';
const { cityRingKeys, CITY_RING_TILES } = await import('../game/js/tileworld.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

// stad: 2x2 tegels op (0,0)-(1,1); provincie: een raster van -10..10
const tiles = {};
const city = [];
for (let i = 0; i <= 1; i++) for (let j = 0; j <= 1; j++) { const k = `c${i}_${j}`; tiles[k] = { i, j }; city.push(k); }
for (let i = -10; i <= 10; i++) for (let j = -10; j <= 10; j++) { if (i >= 0 && i <= 1 && j >= 0 && j <= 1) continue; tiles[`p${i}_${j}`] = { i, j }; }
tiles.ovTile = { i: 2, j: 0, ov: true };
tiles.inTile = { i: 2, j: 1, in: 'c1_1' };
const index = { tiles };

const r1 = cityRingKeys(index, city, 1);
// ring 1 om een blok van 2x2: (4x4 = 16) min 4 stadstegels = 12, min de twee overlay/stub-tegels die er bij horen
ok(r1.length === 12 - 2 || r1.length === 12, 'ring 1: de omliggende tegels', String(r1.length));
ok(!r1.some((k) => city.includes(k)), 'de stadstegels zelf zitten er niet in');
ok(!r1.includes('ovTile') && !r1.includes('inTile'), 'overlay- en stubtegels zitten er niet in');
const r3 = cityRingKeys(index, city, 3);
ok(r3.length === 8 * 8 - 4 - 2 || r3.length === 8 * 8 - 4, 'ring 3: 8x8 min de stad', String(r3.length));
ok(r3.includes('p-3_-3') && !r3.includes('p-4_-4') && r3.includes('p4_4') && !r3.includes('p5_5'), 'ring 3 loopt tot 3 tegels van de stad');
ok(cityRingKeys(index, city, 0).length === 0, 'ring 0 is leeg');
ok(cityRingKeys(index, [], 3).length === 0, 'zonder stadstegels geen ring');
ok(cityRingKeys({ tiles: { a: { i: 0, j: 0 } } }, ['a'], 3).length === 0, 'een wereld zonder provincietegels geeft geen ring');
ok(CITY_RING_TILES >= 1 && CITY_RING_TILES <= 5, 'de standaardring is een paar tegels', String(CITY_RING_TILES));

if (fails) { console.log(`cityring_test: ${fails} FOUT(EN) van ${n}`); process.exit(1); }
console.log(`cityring_test: ok (${n} checks)`);
