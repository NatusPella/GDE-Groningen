// Fietsschade (#1018): een beschadigde tweewieler rijdt trager (proportioneel), een fiets zonder rijder valt om bij een
// flinke klap en ligt tot hij rechtgezet wordt. Pure regels uit vehicledamage.js.
//   node scripts/fietsschade_test.mjs
import assert from 'node:assert/strict';
import { schadeSnelheidFactor, valtOm, valOm, zetRecht, SCHADE_MIN_FACTOR, OMVAL_SCHADE } from '../game/js/vehicledamage.js';

let n = 0, fails = 0;
const ok = (f, naam) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', naam, '-', e.message); } };

ok(() => {
  assert.equal(schadeSnelheidFactor({ isBike: true, health: 100 }), 1);
  assert.equal(schadeSnelheidFactor({ isBike: true, health: 90 }), 1);
  const half = schadeSnelheidFactor({ isBike: true, health: 45 });
  assert.ok(half < 1 && half > SCHADE_MIN_FACTOR, 'halve gezondheid: tussen heel en het minimum');
  assert.ok(Math.abs(half - (SCHADE_MIN_FACTOR + (1 - SCHADE_MIN_FACTOR) * 0.5)) < 1e-9);
  assert.equal(schadeSnelheidFactor({ isScooter: true, health: 0 }), SCHADE_MIN_FACTOR);
  let vorige = 2;
  for (let h = 100; h >= 0; h -= 5) { const f = schadeSnelheidFactor({ isBike: true, health: h }); assert.ok(f <= vorige + 1e-12, 'nooit sneller bij meer schade'); vorige = f; }
}, 'schade verlaagt de snelheid proportioneel');

ok(() => {
  assert.equal(schadeSnelheidFactor({ health: 10 }), 1, 'een auto houdt zijn eigen schaderegels');
  assert.equal(schadeSnelheidFactor(null), 1);
  assert.equal(schadeSnelheidFactor({ isBike: true }), 1, 'zonder gezondheid: heel');
}, 'alleen tweewielers');

ok(() => {
  const v = { isBike: true, health: 100, driver: null, speed: 3, roll: 0 };
  assert.equal(valtOm(v, OMVAL_SCHADE - 1), false, 'een duwtje geeft geen val');
  assert.equal(valtOm(v, OMVAL_SCHADE), true);
  assert.equal(valtOm({ ...v, driver: 'player' }, 50), false, 'de rijder houdt hem rechtop');
  assert.equal(valtOm({ ...v, isBike: false, isScooter: false }, 50), false, 'een auto valt niet om');
  valOm(v);
  assert.equal(v.fallen, true);
  assert.equal(v.speed, 0);
  assert.ok(v.roll > 1, 'hij ligt op zijn zij');
  assert.equal(valtOm(v, 50), false, 'een omgevallen fiets valt niet nog eens');
  zetRecht(v);
  assert.equal(v.fallen, false);
  assert.equal(v.roll, 0);
}, 'omvallen en rechtzetten');

console.log(`fietsschade_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
