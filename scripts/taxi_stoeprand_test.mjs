// Taxi-bijbaan (#1299, punt 18): kerbFor gaf null als er binnen 250 m geen weg was (tegel nog niet geladen);
// round() las dan d.to.road en gooide een TypeError. Nu valt hij terug op de plek zelf.
//   node scripts/taxi_stoeprand_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';

const { kerbFor } = await import('../game/js/sidejob_taxi.js');
let n = 0, fails = 0;
const t = (naam, fn) => { n++; try { fn(); console.log('ok    ' + naam); } catch (e) { fails++; console.log('FAIL  ' + naam + ' :: ' + e.message); } };

const plek = { x: 120, y: -40, name: 'Ergens' };
t('geen weg in de buurt: de plek zelf, geen null', () => {
  const r = kerbFor({ nearestRoadPoint: () => null }, plek);
  assert.ok(r && r.road && r.walk, 'road en walk bestaan');
  assert.deepEqual(r.road, { x: 120, y: -40 });
  assert.deepEqual(r.walk, { x: 120, y: -40 });
  const d = { ...plek, ...r };
  assert.ok(Number.isFinite(Math.hypot(d.road.x - 0, d.road.y - 0)), 'round() kan de afstand rekenen');
});
t('een weg zonder punten: ook de plek zelf', () => {
  const r = kerbFor({ nearestRoadPoint: () => ({ x: 1, y: 1, road: { pts: [[1, 1]] } }) }, plek);
  assert.deepEqual(r.road, { x: 120, y: -40 });
});
t('een gewone weg: punt op de weg en een stoeprand ernaast', () => {
  const map = {
    nearestRoadPoint: () => ({ x: 10, y: 0, road: { pts: [[0, 0], [20, 0]], width: 6 } }),
    escapeBuilding: (x, y) => [x, y], isInWater: () => false, water: [], meta: {},
  };
  const r = kerbFor(map, plek);
  assert.deepEqual(r.road, { x: 10, y: 0 });
  assert.ok(Math.abs(Math.abs(r.walk.y) - 4.2) < 1e-6 && r.walk.x === 10, JSON.stringify(r.walk));
});

console.log(fails ? `taxi_stoeprand_test: ${fails} van ${n} mislukt` : `taxi_stoeprand_test: ${n}/${n} ok`);
process.exit(fails ? 1 : 0);
