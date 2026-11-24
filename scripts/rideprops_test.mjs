// Een fiets uit een stalling pakken (#1018): een fiets tegen een gevel start buiten het gebouw en een fiets die niet te
// claimen is, valt terug op de volgende vrije in plaats van stil niets te doen.
//   node scripts/rideprops_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';

const { vrijeStart, vrijeKoers, rideFirstFree, rideCandidates } = await import('../game/js/rideprops.js');
const B = await import('../game/js/breakables.js');

let n = 0, fails = 0;
const ok = (f, naam) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', naam, '-', e.message); } };

ok(() => {
  const spot = vrijeStart({ escapeBuilding: (x, y) => [x + 1.4, y] }, 10, 5);
  assert.deepEqual(spot, { x: 11.4, y: 5 });
  assert.deepEqual(vrijeStart(null, 3, 4), { x: 3, y: 4 }, 'zonder kaart blijft de plek');
  assert.deepEqual(vrijeStart({ escapeBuilding: () => [NaN, 1] }, 3, 4), { x: 3, y: 4 }, 'een kapot antwoord laat de plek staan');
}, 'een fiets in een gevel schuift naar buiten');

ok(() => {
  const world = { vehicles: [], map: { escapeBuilding: (x, y) => [x, y + 2] }, time: 0 };
  B.setBreakablesWorld && B.setBreakablesWorld(world);
  const a = B.makeProp('bike', 50, 50, { key: 'bike@a' });
  const b = B.makeProp('bike', 50.5, 50, { key: 'bike@b' });
  B.addProp(a); B.addProp(b);
  // a is al door iemand anders geclaimd (zelfde sleutel in gebruik): de speler krijgt dan de buurfiets
  B.claimProp(a);
  const near = rideCandidates(50.2, 50);
  assert.ok(near.every((c) => c.prop !== a), 'een geclaimde fiets valt uit de lijst');
  const v = rideFirstFree(world, a, 50.2, 50);
  assert.ok(v, 'de buurfiets wordt gepakt');
  assert.equal(world.vehicles.length, 1);
  assert.ok(Math.abs(v.y - 52) < 1e-9, 'en start op de vrije plek');
  assert.equal(rideFirstFree(world, a, 50.2, 50), null, 'niets meer vrij: null, de speler krijgt een melding');
}, 'een niet te claimen fiets valt terug op de volgende');

ok(() => {
  // een gevel langs x = 2 (het pand loopt van x 2 tot 12): een fiets op x 0,8 met het voorwiel naar +x staat ertegen
  const box = { pts: [[2, -10], [12, -10], [12, 10], [2, 10], [2, -10]], bounds: [2, -10, 12, 10] };
  const map = { buildingsNear: (x, y) => (x > 1 && x < 13 && y > -11 && y < 11 ? [box] : []) };
  assert.ok(Math.abs(vrijeKoers(map, 0.8, 0, 0) - Math.PI) < 1e-9, 'voorwiel naar de gevel: omgedraaid naar de straat');
  assert.equal(vrijeKoers(map, 0.8, 0, Math.PI), Math.PI, 'al naar de straat: blijft staan');
  assert.equal(vrijeKoers(map, 0.8, 0, Math.PI / 2), Math.PI / 2, 'langs de gevel: blijft staan');
  assert.equal(vrijeKoers(map, -5, 0, 0), 0, 'ver van de gevel: blijft staan');
  assert.equal(vrijeKoers(null, 0.8, 0, 0), 0, 'zonder kaart: blijft staan');
}, 'een rekfiets met zijn voorwiel naar de gevel draait om (#1018, beeldcheck 24-11)');

console.log(`rideprops_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
