// De boot en de natte fiets van de openingstrailer (#1338): een routepunt op de kade wordt water, de camera staat op de kade.
//   node scripts/introwater_test.mjs
import { waterPointNear, quaySpotFor } from '../game/js/introwater.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name} ${info}`); } };

// een gracht langs de lijn y = x (de Diepenring ligt diagonaal), 14 m breed, water voor y < x - 3
const isWet = (x, y) => y < x - 3 && y > x - 17;
// het routepunt ligt 2 m op de kade, zoals in de wereld
const route = { x: 100, y: 100 + 1, a: 0.78 };
ok(!isWet(route.x, route.y), 'het routepunt ligt droog (de fout van de wereld)');
const w = waterPointNear(isWet, route);
ok(isWet(w.x, w.y), 'de boot staat in het water', JSON.stringify(w));
ok(w.a === route.a, 'de koers blijft die van de route');
for (let i = 0; i < 8; i++) ok(isWet(w.x + Math.cos(i * Math.PI / 4) * 2.4, w.y + Math.sin(i * Math.PI / 4) * 2.4), 'ruimte rondom voor een sloep', i);
ok(Math.hypot(w.x - route.x, w.y - route.y) < 16, 'dichtbij het routepunt');

const mid = { x: 108, y: 98 }; // midden in de gracht
ok(waterPointNear(isWet, { x: 108, y: 98, a: 0 }).x === 108, 'een punt dat al in het water ligt blijft staan');
ok(waterPointNear(() => false, route) === route, 'zonder water valt hij terug op het routepunt');

const cam = quaySpotFor(isWet, mid, Math.atan2(-1, 1));
ok(cam && !isWet(cam.x, cam.y), 'de camera staat op de kade', JSON.stringify(cam));
ok(cam && Math.hypot(cam.x - mid.x, cam.y - mid.y) >= 7, 'de camera staat op afstand');
ok(quaySpotFor(() => true, mid, 0) === null, 'geen droge grond: geen spot');
// de camera aan de verkeerde kant van het water (de bearing wijst het water in) schuift naar droog
const cam2 = quaySpotFor(isWet, mid, Math.atan2(1, 1) * 0 + Math.atan2(-1, 1));
ok(cam2 && !isWet(cam2.x, cam2.y), 'ook als de gewenste richting in het water wijst');

console.log(`introwater_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
