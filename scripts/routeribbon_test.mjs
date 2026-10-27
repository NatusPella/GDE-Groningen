// De route-ribbon dooft uit zodra hij de verharding verlaat (#502 punt 4): geen gele chevrons over
// een gazon of akker. Test de twee pure regels uit game/js/routeribbon.js.
//   node scripts/routeribbon_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';

const R = await import('../game/js/routeribbon.js');
const { SIDEWALK_EXTRA } = await import('../game/js/roadsurface.js');
let n = 0;
const ok = (c, m) => { n++; assert.ok(c, m); };

// een straat van 6 m breed langs de x-as, van -50 tot 50
const straat = { cat: 'normal', width: 6, pts: [[-50, 0], [50, 0]] };
const map = { roadsNear: (x, y, r) => (Math.abs(y) <= r + 4 ? [straat] : []) };
const paved = 3 + SIDEWALK_EXTRA;

ok(R.routeOffRoad(map, 0, 0) === 0, 'op de as: 0 m van de verharding');
ok(R.routeOffRoad(map, 0, 4) === 0, 'op de stoep: nog steeds verharding');
ok(R.routeOffRoad(map, 0, 6) > 1 && R.routeOffRoad(map, 0, 6) < 2, 'een meter naast de stoep: 1,2 m');
ok(R.routeOffRoad(map, 0, 11) > 5, 'ver van de weg: meer dan 5 m');
ok(R.routeOffRoad({}, 0, 0) === 0, 'zonder kaart: geen uitslag, geen fout');

ok(R.ribbonFade(0) === 1, 'op de weg: vol zichtbaar');
ok(R.ribbonFade(2) === 1, 'tot 2,5 m: vol zichtbaar');
ok(R.ribbonFade(5) === 0, 'vanaf 5 m: weg');
ok(R.ribbonFade(3.75) > 0.4 && R.ribbonFade(3.75) < 0.6, 'halverwege: half');

ok(R.ribbonAlpha(0, 80, 0) === 0, 'het begin van de strook is onzichtbaar');
ok(R.ribbonAlpha(10, 80, 0) === 1, 'midden op de weg: vol');
ok(R.ribbonAlpha(10, 80, 6) === 0, 'midden op de weg maar 6 m van de verharding: weg');
ok(R.ribbonAlpha(78, 80, 0) < 0.3, 'het eind fadet uit');

console.log(`routeribbon_test: ${n} checks ok (verharding tot ${paved.toFixed(1)} m van de as)`);
