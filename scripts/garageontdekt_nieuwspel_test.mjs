// Nieuw spel en de garage: alleen de Escapade is ontdekt, politie- en verkeersvoertuigen tellen niet mee, en een prestatie die het profiel
// al had (Foetsie, Heel Grunn zoekt je) zet de politieauto niet meteen in de garage. Pure test met een nepopslag, nooit echte localStorage.
//   node scripts/garageontdekt_nieuwspel_test.mjs
import assert from 'node:assert/strict';
import { setKnownContext, knownRecord, noteSeated, markKnown, knownCount } from '../game/js/garageknown.js';
import { cleanBase, baselineNow, earnedThisSave } from '../game/js/unlockbase.js';

let n = 0, fails = 0;
const t = (naam, fn) => { n++; try { fn(); console.log('ok   ' + naam); } catch (e) { fails++; console.log('FAIL ' + naam + '\n  ' + e.message.split('\n')[0]); } };
const nepOpslag = (start = {}) => { const d = { ...start }; return { d, getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); } }; };
const KEY = 'garage-ontdekt-test';
const STOCK = new Set(['mug', 'politie', 'omafiets']);
const ctx = (store, owned) => setKnownContext({ store, key: KEY, valid: (k) => STOCK.has(k), owned: () => owned, onNew: null });

t('nieuw spel: niets in bezit, dus ontdekt is alleen de Escapade', () => {
  ctx(nepOpslag(), []);
  assert.deepEqual(knownRecord().keys, []);
  const lijst = markKnown([{ id: 'hero', key: 'hero', hero: true, owned: true }, { id: 'politie', key: 'politie', owned: false }, { id: 'mug', key: 'mug', owned: false }], knownRecord());
  assert.deepEqual(lijst.filter((e) => e.discovered).map((e) => e.key), ['hero']);
  assert.deepEqual(knownCount(lijst), { ontdekt: 1, totaal: 3, verborgen: 2 });
});

t('migratie van bestaande opslag telt alleen het bezit, geen politie- of verkeersvoertuigen', () => {
  const opslag = nepOpslag();
  ctx(opslag, ['mug']);
  assert.deepEqual(knownRecord().keys, ['mug']);
  assert.ok(!knownRecord().keys.includes('politie'));
});

t('instappen in een patrouilleauto, verkeersauto of NPC-auto (geen winkelsleutel) ontdekt niets', () => {
  ctx(nepOpslag(), []);
  assert.equal(noteSeated({ isPolice: true, model: { name: 'police' } }), null);
  assert.equal(noteSeated({ isPolice: true, hijacked: true }), null);
  assert.equal(noteSeated({ model: { name: 'hatch' } }), null);
  assert.deepEqual(knownRecord().keys, []);
});

t('een eigen politieauto (winkelsleutel) wel: legitiem bezit of erin gezeten', () => {
  ctx(nepOpslag(), []);
  assert.equal(noteSeated({ stockKey: 'politie' }), 'politie');
  assert.deepEqual(knownRecord().keys, ['politie']);
});

t('prestatie die het profiel al had: bij een nieuw spel telt hij niet', () => {
  const ids = ['ontsnapt_5', 'ster_5'];
  const profiel = new Set(['ontsnapt_5']);
  const heeft = (id) => profiel.has(id);
  const base = baselineNow(ids, heeft);
  assert.deepEqual(base, ['ontsnapt_5']);
  assert.equal(earnedThisSave('ontsnapt_5', heeft, base), false, 'politieauto niet meteen vrij');
  profiel.add('ster_5'); // in deze save gehaald
  assert.equal(earnedThisSave('ster_5', heeft, base), true);
});

t('oude save zonder basislijn behoudt wat hij had; rommel valt weg', () => {
  const ids = ['ontsnapt_5', 'ster_5'];
  assert.deepEqual(cleanBase(undefined, ids), []);
  assert.equal(earnedThisSave('ontsnapt_5', () => true, cleanBase(undefined, ids)), true);
  assert.deepEqual(cleanBase(['ster_5', 'ster_5', 'x', 3], ids), ['ster_5']);
});

console.log(`\n${n - fails}/${n} groen`);
process.exit(fails ? 1 : 0);
