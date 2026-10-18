// Coöp (#95): sessiekeuze naast de ene save (game/js/coopsave.js): geen verhaalsave van coöp.
import assert from 'node:assert/strict';
import * as S from '../game/js/coopsave.js';
import { BASE_KEYS, KEYS } from '../game/js/storagekeys.js';

let n = 0;
const t = (name, f) => { f(); n++; };
class Mem { constructor() { this.m = new Map(); } getItem(k) { return this.m.has(k) ? this.m.get(k) : null; } setItem(k, v) { this.m.set(k, String(v)); } removeItem(k) { this.m.delete(k); } }

t('eigen sleutel voor de sessie; er is geen aparte coöp-verhaalsave', () => {
  assert.equal(BASE_KEYS.coopSession, 'gde-coop-sessie');
  assert.equal(BASE_KEYS.coopSave, undefined);
  assert.notEqual(KEYS.coopSession, KEYS.save);
});
t('standaard Alleen, zonder rol of code', () => {
  assert.deepEqual(S.readSession(new Mem()), { v: 1, modus: 'alleen', rol: null, laatsteCode: '' });
});
t('Samen als gast onthoudt de laatste code; host en lokaal bewaren geen code', () => {
  const g = S.toSession(null, { modus: 'samen', rol: 'gast', code: 'GDE2-84.12.34.56:41000-ABCDEFGH-1A2B' });
  assert.equal(g.laatsteCode, 'GDE2-84.12.34.56:41000-ABCDEFGH-1A2B');
  const h = S.toSession(g, { modus: 'samen', rol: 'host', code: 'GDE2-84.12.34.56:41000-ABCDEFGH-1A2B' });
  assert.equal(h.laatsteCode, '');
  assert.equal(S.toSession(g, { modus: 'alleen', rol: 'gast' }).rol, null);
});
t('rommel wordt niet bewaard', () => {
  const g = S.toSession(null, { modus: 'samen', rol: 'gast', code: '<script>alert(1)</script>' });
  assert.equal(g.laatsteCode, '');
  assert.equal(S.toSession(null, { modus: 'samen', rol: 'baas' }).rol, null);
});
t('schrijven, lezen, wissen; solosleutel onaangeroerd', () => {
  const ls = new Mem(); ls.setItem(KEYS.save, 'SOLO');
  assert.equal(S.writeSession(ls, S.toSession(null, { modus: 'samen', rol: 'host' })), true);
  assert.equal(S.readSession(ls).rol, 'host');
  S.clearSession(ls); assert.equal(S.readSession(ls).modus, 'alleen');
  assert.equal(ls.getItem(KEYS.save), 'SOLO');
});
t('kapotte of nieuwere data valt terug op Alleen; vol opslag gooit niet', () => {
  const ls = new Mem(); ls.setItem(KEYS.coopSession, '{kapot'); assert.equal(S.readSession(ls).modus, 'alleen');
  ls.setItem(KEYS.coopSession, JSON.stringify({ v: 99, modus: 'samen' })); assert.equal(S.readSession(ls).modus, 'alleen');
  assert.equal(S.writeSession({ setItem() { throw new Error('vol'); } }, S.newSession()), false);
});
t('alleen de gast bewaart het verhaal niet', () => {
  assert.equal(S.mayWriteStory('samen', 'gast'), false);
  assert.equal(S.mayWriteStory('samen', 'host'), true);
  assert.equal(S.mayWriteStory('alleen', null), true);
});
console.log(`coopsave_test: ${n}/${n} ok`);
