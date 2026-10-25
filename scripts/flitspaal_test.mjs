// De flitspaalregels (#493): de eerste pass waarschuwt, daarna kost het geld, met een ruime
// marge en een boete die nooit meer is dan wat je hebt.  node scripts/flitspaal_test.mjs
import assert from 'node:assert/strict';
import { speedOutcome, SPEED_MARGIN_KMH, FINE_COOLDOWN } from '../game/js/flitspaalrules.js';
import { SPEED_FINE, START_MONEY } from '../game/js/economy.js';

let n = 0, fails = 0;
const ok = (fn, name) => { n++; try { fn(); } catch (e) { fails++; console.log(`FAIL ${name}: ${e.message}`); } };

ok(() => assert.equal(START_MONEY, 500), 'startbudget is €500');
ok(() => assert.deepEqual(SPEED_FINE, [10, 25]), 'flitsboete is €10-25');
ok(() => assert.equal(SPEED_MARGIN_KMH, 35), 'marge is 35 km/u');
ok(() => assert.equal(FINE_COOLDOWN, 15), 'afkoeling is 15 s');

const at = (over, warned = false, money = 1000, roll = 0.5) => speedOutcome({ speedKmh: 60 + over, limitKmh: 60, warned, money, roll });

ok(() => assert.deepEqual(at(SPEED_MARGIN_KMH), { kind: 'none' }), 'op de marge: geen melding');
ok(() => assert.deepEqual(at(SPEED_MARGIN_KMH + 1), { kind: 'warning' }), 'net over de marge: waarschuwing');
ok(() => assert.deepEqual(at(50), { kind: 'warning' }), 'te hard, nog niet gewaarschuwd: waarschuwing');
ok(() => assert.deepEqual(at(50, true), { kind: 'fine', fine: 18 }), 'tweede keer: boete binnen het bereik');
ok(() => assert.deepEqual(at(50, true, 5), { kind: 'fine', fine: 5 }), 'boete nooit meer dan je geld');
ok(() => assert.deepEqual(at(50, true, 0), { kind: 'none' }), 'geen geld: geen boetemelding');
ok(() => assert.deepEqual(at(50, true, -10), { kind: 'none' }), 'negatief geld wordt niet erger');
ok(() => assert.equal(at(50, true, 1000, 0).fine, 10), 'ondergrens van de boete');
ok(() => assert.equal(at(50, true, 1000, 0.999999).fine, 25), 'bovengrens van de boete');
ok(() => assert.equal(at(50, true, 1000, 2).fine, 25), 'een te hoge roll blijft op de bovengrens');
ok(() => assert.equal(at(50, true, 1000, -1).fine, 10), 'een te lage roll blijft op de ondergrens');
ok(() => assert.deepEqual(at(0, true), { kind: 'none' }), 'onder de limiet: niets');

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
