// Coöp fase 3 (#95): coöp-save (game/js/coopsave.js) naast de solosave.
import assert from 'node:assert/strict';
import * as S from '../game/js/coopsave.js';
import { BASE_KEYS, KEYS } from '../game/js/storagekeys.js';

let n = 0;
const t = (name, f) => { f(); n++; };
class Mem { constructor() { this.m = new Map(); } getItem(k) { return this.m.has(k) ? this.m.get(k) : null; } setItem(k, v) { this.m.set(k, String(v)); } removeItem(k) { this.m.delete(k); } }

t('eigen sleutel, niet de solosave', () => {
  assert.equal(BASE_KEYS.coopSave, 'gde-coop-v1');
  assert.notEqual(KEYS.coopSave, KEYS.save);
});
t('coöp vanaf solo: kopie, solosave blijft ongewijzigd', () => {
  const solo = { v: 9, money: 1234.9, arc: 'oud', story: { done: ['H1', 'H2'], step: 'H3' } };
  const frozen = JSON.stringify(solo);
  const c = S.coopFromSolo(solo, 5);
  assert.equal(c.origin, 'solo'); assert.equal(c.shared.money, 1234); assert.deepEqual(c.story, solo.story);
  c.story.done.push('H3');
  assert.equal(JSON.stringify(solo), frozen);
});
t('schrijven en lezen via opslag; solosleutel onaangeroerd', () => {
  const ls = new Mem(); ls.setItem(KEYS.save, 'SOLO');
  const save = S.toCoopSave(null, { story: { done: [] }, shared: { money: 50, wanted: 9 }, mission: { id: 'H3', stage: 2.7 } }, 7);
  assert.equal(save.shared.wanted, 5); assert.deepEqual(save.mission, { id: 'H3', stage: 2 });
  assert.equal(S.writeCoopSave(ls, save), true);
  assert.equal(ls.getItem(KEYS.save), 'SOLO');
  const back = S.readCoopSave(ls);
  assert.equal(back.v, 1); assert.equal(back.shared.money, 50);
  assert.equal(S.clearCoopSave(ls), true); assert.equal(S.hasCoopSave(ls), false);
  assert.equal(ls.getItem(KEYS.save), 'SOLO');
});
t('kapotte, nieuwere of lege data geeft null', () => {
  assert.equal(S.parseCoopSave('{kapot'), null);
  assert.equal(S.parseCoopSave(JSON.stringify({ v: 99 })), null);
  assert.equal(S.parseCoopSave('{}').v, 1, 'zonder versie telt als v1');
  const ls = new Mem(); assert.equal(S.readCoopSave(ls), null);
});
t('opslag vol: schrijven mislukt zonder te gooien', () => {
  const ls = { getItem: () => null, setItem() { throw new Error('vol'); }, removeItem() {} };
  assert.equal(S.writeCoopSave(ls, S.newCoopSave()), false);
});
t('geen netwerkgegevens in de save, alleen host schrijft', () => {
  const txt = JSON.stringify(S.toCoopSave(null, { story: null, shared: { money: 1, wanted: 0 } }));
  assert.ok(!/candidate|ip|sdp/i.test(txt.replace(/"players"/g, '')));
  assert.equal(S.mayWrite('host'), true); assert.equal(S.mayWrite('guest'), false);
});
console.log(`coopsave_test: ${n}/${n} ok`);
