// Samen spelen (#95): wat een sessie onthoudt (game/js/coopsave.js). Geen coöp-save, geen gedeelde save.
import assert from 'node:assert/strict';
import * as S from '../game/js/coopsave.js';
import { BASE_KEYS, KEYS } from '../game/js/storagekeys.js';

let n = 0;
const t = (name, f) => { f(); n++; };
class Mem { constructor() { this.m = new Map(); } getItem(k) { return this.m.has(k) ? this.m.get(k) : null; } setItem(k, v) { this.m.set(k, String(v)); } removeItem(k) { this.m.delete(k); } }

t('alleen een sessiesleutel; geen aparte coöp-verhaalsave en niet per verhaalboog', () => {
  assert.equal(BASE_KEYS.coopSession, 'gde-coop-sessie');
  assert.equal(BASE_KEYS.coopSave, undefined);
  assert.equal(KEYS.coopSession, BASE_KEYS.coopSession);
  assert.notEqual(KEYS.coopSession, KEYS.save);
});
t('standaard leeg', () => assert.deepEqual(S.readSession(new Mem()), { v: 1, laatsteCode: '' }));
t('bewaart kamercodes en koppelcodes, geen rommel', () => {
  assert.equal(S.toSession(null, { code: 'k3j9d-8f2mn' }).laatsteCode, 'K3J9D-8F2MN');
  assert.equal(S.toSession(null, { code: 'GDE2-84.12.34.56:41000-ABCDEFGH-1A2B' }).laatsteCode, 'GDE2-84.12.34.56:41000-ABCDEFGH-1A2B');
  assert.equal(S.toSession(null, { code: '<script>alert(1)</script>' }).laatsteCode, '');
  assert.equal(S.toSession({ laatsteCode: 'K3J9D-8F2MN' }, {}).laatsteCode, '');
});
t('schrijven, lezen, wissen; solosleutel onaangeroerd', () => {
  const ls = new Mem(); ls.setItem(KEYS.save, 'SOLO');
  assert.equal(S.writeSession(ls, S.toSession(null, { code: 'K3J9D-8F2MN' })), true);
  assert.equal(S.readSession(ls).laatsteCode, 'K3J9D-8F2MN');
  S.clearSession(ls); assert.equal(S.readSession(ls).laatsteCode, '');
  assert.equal(ls.getItem(KEYS.save), 'SOLO');
});
t('kapotte of nieuwere data valt terug op leeg; vol opslag gooit niet', () => {
  const ls = new Mem(); ls.setItem(KEYS.coopSession, '{kapot'); assert.equal(S.readSession(ls).laatsteCode, '');
  ls.setItem(KEYS.coopSession, JSON.stringify({ v: 99, laatsteCode: 'K3J9D-8F2MN' })); assert.equal(S.readSession(ls).laatsteCode, '');
  assert.equal(S.writeSession({ setItem() { throw new Error('vol'); } }, S.newSession()), false);
});
t('eigen voortgang van een gast: verdiend geld erbij in zijn eigen save, de rest blijft', () => {
  const d = { v: 9, money: 40, moneyBackup: 40, story: { done: ['H1'] } };
  const r = S.applyGuestEarnings(d, 250.7);
  assert.equal(r.money, 290); assert.equal(r.moneyBackup, 290); assert.deepEqual(r.story, d.story); assert.equal(d.money, 40, 'invoer niet aangepast');
  assert.equal(S.applyGuestEarnings(d, 0), null); assert.equal(S.applyGuestEarnings(d, -5), null); assert.equal(S.applyGuestEarnings(null, 5), null);
  assert.equal(S.applyGuestEarnings({ money: null }, 10).money, 10);
});
console.log(`coopsave_test: ${n}/${n} ok`);
