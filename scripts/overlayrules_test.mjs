import assert from 'node:assert/strict';
import { heldOverlays, mayStartOverlay, RANK, HOLDS } from '../game/js/overlayrules.js';

const h = (a) => [...heldOverlays(a)].sort();
assert.deepEqual(h([]), []);
assert.deepEqual(h(['naamkaart']), [], 'alleen een naamkaart: niets wacht');
assert.deepEqual(h(['resultaat', 'naamkaart']), ['naamkaart'], 'naamkaart wacht onder de resultaatkaart');
assert.deepEqual(h(['resultaat', 'duelbalk', 'prestatie', 'naamkaart']), ['duelbalk', 'naamkaart', 'prestatie']);
assert.deepEqual(h(['duelbalk', 'prestatie']), ['prestatie'], 'duelbalk houdt prestatie tegen');
assert.deepEqual(h(['prestatie', 'naamkaart']), [], 'zelfde of lagere rang houdt niet tegen');
assert.deepEqual(h(['keuze', 'locatie']), ['locatie']);
assert.deepEqual(h(['resultaat', 'resultaat']), []);
assert.ok(!mayStartOverlay('naamkaart', ['resultaat']));
assert.ok(mayStartOverlay('naamkaart', []));
assert.ok(mayStartOverlay('resultaat', ['naamkaart', 'duelbalk']), 'de resultaatkaart begint altijd');
assert.ok(!mayStartOverlay('prestatie', ['duelbalk']));
// geen cycli: een overlay houdt alleen lagere rangen tegen
for (const [a, list] of Object.entries(HOLDS)) for (const b of list) assert.ok(RANK[a] > RANK[b], `${a} > ${b}`);
// de wijkkaart (#292): wacht onder resultaat, keuze en duelbalk; houdt de naamkaart tegen
assert.deepEqual(h(['resultaat', 'wijkkaart']), ['wijkkaart']);
assert.deepEqual(h(['keuze', 'wijkkaart']), ['wijkkaart']);
assert.deepEqual(h(['duelbalk', 'wijkkaart']), ['wijkkaart']);
assert.deepEqual(h(['wijkkaart', 'naamkaart']), ['naamkaart'], 'wijkkaart en naamkaart staan op dezelfde plek: één tegelijk');
assert.deepEqual(h(['wijkkaart', 'prestatie']), [], 'een prestatie staat elders (zone E)');
console.log('overlayrules_test ok');
