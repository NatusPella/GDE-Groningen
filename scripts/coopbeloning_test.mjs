// Samen spelen (#448): beloningen per gebeurtenis en checkpoints, de pure kant.  node scripts/coopbeloning_test.mjs
import assert from 'node:assert/strict';
import * as B from '../game/js/coopbeloning.js';
import { maakCheckpoint } from '../game/js/coopcheckpoint.js';

let n = 0;
const t = (name, f) => { f(); n++; };

t('geen samenwerkingsbonus meer (#452): factor 1, de bonus is altijd 0', () => {
  assert.equal(B.BONUS_FACTOR, 1);
  assert.deepEqual(B.samenwerkingsBonus(600, 1), { totaal: 600, bonus: 0 });
  assert.deepEqual(B.samenwerkingsBonus(600, 2), { totaal: 600, bonus: 0 });
  assert.deepEqual(B.samenwerkingsBonus(601, 4), { totaal: 601, bonus: 0 });
  assert.equal(B.samenwerkingsBonus(10_000_000, 2).bonus, 0);
  for (const x of [0, -5, NaN, 'abc', null]) assert.deepEqual(B.samenwerkingsBonus(x, 3), { totaal: 0, bonus: 0 });
});
t('gelijk verdelen: hele euro\'s, de som klopt, geen dubbele slots', () => {
  assert.deepEqual(B.verdeelGelijk(100, [0, 1, 2]), { 0: 34, 1: 33, 2: 33 });
  assert.deepEqual(B.verdeelGelijk(2, [0, 1, 2]), { 0: 1, 1: 1, 2: 0 });
  assert.deepEqual(B.verdeelGelijk(50, [1, 1]), { 1: 50 });
  assert.deepEqual(B.verdeelGelijk(50, []), {});
  for (const [b, k] of [[999, 4], [1, 3], [1_000_001, 5]]) assert.equal(Object.values(B.verdeelGelijk(b, Array.from({ length: k }, (_, i) => i))).reduce((a, c) => a + c, 0), b);
});
t('gebeurtenis: elke deelnemer krijgt het volle bedrag, geen bonus; zonder id of deelnemers niets', () => {
  const r = B.beloningVoorGebeurtenis({ id: 'a:b:1', totaal: 600, deelnemers: [0, 1] });
  assert.deepEqual(r.bedragen, { 0: 600, 1: 600 }); assert.equal(r.bonus, 0); assert.equal(r.totaal, 600);
  assert.deepEqual(B.beloningVoorGebeurtenis({ id: 'a:b:2', totaal: 600, deelnemers: [0] }).bedragen, { 0: 600 });
  assert.equal(B.beloningVoorGebeurtenis({ totaal: 5, deelnemers: [0] }), null);
  assert.equal(B.beloningVoorGebeurtenis({ id: 'x', totaal: 5, deelnemers: [] }), null);
});
t('boekhouding: een id geeft één keer geld (ook de bonus), onthoudt hooguit ID_MAX', () => {
  const b = B.maakBoekhouding();
  assert.equal(b.claim('g1'), true); assert.equal(b.claim('g1'), false); assert.equal(b.claim(''), false); assert.equal(b.claim(5), false);
  for (let i = 0; i < B.ID_MAX + 20; i++) b.claim('x' + i);
  assert.equal(b.ids().length, B.ID_MAX); assert.equal(b.heeft('g1'), false); assert.equal(b.heeft('x' + (B.ID_MAX + 19)), true);
  assert.equal(B.maakBoekhouding(b.ids()).claim('x' + (B.ID_MAX + 19)), false, 'hersteld uit een save');
});
t('pasGebeurtenisToe: geld en id in één nieuwe save, tweede keer niets, invoer ongemoeid', () => {
  const d = { money: 40, moneyBackup: 40, story: { done: ['a'] } };
  const r = B.pasGebeurtenisToe(d, 'e1', 450.9);
  assert.equal(r.money, 490); assert.equal(r.moneyBackup, 490); assert.deepEqual(r.coopGebeurtenissen, ['e1']); assert.equal(d.money, 40);
  assert.equal(B.pasGebeurtenisToe(r, 'e1', 450), null);
  assert.equal(B.pasGebeurtenisToe(r, 'e2', 10).money, 500);
  assert.equal(B.pasGebeurtenisToe({ money: -5 }, 'e', 3).money, 3);
  assert.equal(B.pasGebeurtenisToe(null, 'e', 3), null); assert.equal(B.pasGebeurtenisToe(d, '', 3), null);
});
t('ids in de eigen save (#429): lezen, erbij zetten zonder dubbel, hooguit ID_MAX, invoer ongemoeid', () => {
  assert.deepEqual(B.gebeurtenissenVan(null), []); assert.deepEqual(B.gebeurtenissenVan({ coopGebeurtenissen: 'x' }), []);
  assert.deepEqual(B.gebeurtenissenVan({ coopGebeurtenissen: ['a', 5, '', 'b'] }), ['a', 'b']);
  const d = { money: 40, coopGebeurtenissen: ['a'] };
  const r = B.voegGebeurtenissenToe(d, ['a', 'b', 'b', '', 7]);
  assert.deepEqual(r.coopGebeurtenissen, ['a', 'b']); assert.equal(r.money, 40); assert.deepEqual(d.coopGebeurtenissen, ['a'], 'invoer niet aangepast');
  assert.equal(B.voegGebeurtenissenToe(r, ['a']), null, 'niets nieuws: niets te schrijven');
  assert.equal(B.voegGebeurtenissenToe(null, ['a']), null); assert.equal(B.voegGebeurtenissenToe(d, []), null);
  const veel = B.voegGebeurtenissenToe({}, Array.from({ length: B.ID_MAX + 30 }, (_, i) => 'x' + i));
  assert.equal(veel.coopGebeurtenissen.length, B.ID_MAX);
  assert.equal(B.maakBoekhouding(B.gebeurtenissenVan(veel)).heeft('x' + (B.ID_MAX + 29)), true, 'een nieuwe sessie begint met deze ids');
});
t('checkpoint: elke 60 s, meteen bij een gelukte opdracht, blijft open tijdens een filmpje', () => {
  const c = maakCheckpoint(60);
  let k = 0; for (let s = 0; s < 150; s++) if (c.tik(1)) k++;
  assert.equal(k, 2);
  assert.equal(c.opdrachtGelukt(3), false, 'eerste keer is de beginstand');
  assert.equal(c.opdrachtGelukt(4), true); assert.equal(c.tik(0.1), true);
  c.reset(); for (let s = 0; s < 59; s++) c.tik(1);
  assert.equal(c.tik(1, true), false, 'filmpje: nog niet'); assert.equal(c.tik(0.1, false), true, 'daarna meteen');
});
console.log(`coopbeloning_test: ${n}/${n} ok`);
