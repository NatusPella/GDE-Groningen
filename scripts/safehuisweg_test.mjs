// Safehouse mag de weg niet afsluiten (#436, Hoogkerk): opRijweg en huisVrij op een kleine nepkaart, zonder data.
import assert from 'node:assert/strict';
import { opRijweg, huisVrij, HZ } from '../game/js/safehuisplek.js';

const weg = { pts: [[-100, 0], [100, 0]], width: 6, cat: 'normal' };
const pad = { pts: [[-100, 20], [100, 20]], width: 3, cat: 'foot' };
const map = {
  roadsNear: () => [weg, pad],
  buildingsNear: () => [],
  canWalkOut: () => true,
};
const d = { isInWater: () => false, pointInPolygon: () => false, inPassage: () => false, landSolid: () => false, provinceLandAt: () => true, puntInGebied: () => true };

assert.equal(opRijweg(map, 0, 0), true, 'midden op de rijbaan');
assert.equal(opRijweg(map, 0, 2.9), true, 'op de rand van de rijbaan');
assert.equal(opRijweg(map, 0, 5), false, 'naast de weg');
assert.equal(opRijweg(map, 0, 20), false, 'een voetpad telt niet als rijweg');
assert.equal(huisVrij(map, 0, 12, 0, d), true, 'een huisje naast de weg past');
assert.equal(huisVrij(map, 0, HZ - 1, 0, d), false, 'een huisje dat over de weg valt, past niet');
assert.equal(huisVrij(map, 0, 0, Math.PI / 2, d), false, 'een huisje op de weg past niet');
console.log('safehuisweg_test ok');
