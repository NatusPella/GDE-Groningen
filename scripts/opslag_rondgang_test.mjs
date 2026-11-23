// Opslag-rondgang (#1295): opslaan, laden en weer opslaan geeft precies dezelfde kleding-save (ook de volgorde van de
// slots, anders ziet stateSignature een verschil en volgt er na elke lading een overbodige autosave), en een wapen met
// oneindige munitie valt bij het laden niet terug op vuisten.
//   node scripts/opslag_rondgang_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const store = new Map();
const BLOCKED = new Set(['gde-save-v1', 'gde-settings', 'gde-prestaties-v1']);
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { if (BLOCKED.has(k)) throw new Error('test schrijft naar echte opslag: ' + k); store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
};

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0, fails = 0;
const ok = (fn, name) => { n++; try { fn(); } catch (e) { fails++; console.log(`FAIL ${name}: ${e.message}`); } };

const C = await import('../game/js/clothing.js');
const { SLOT_IDS } = await import('../game/js/clothingdata.js');

ok(() => {
  const s1 = JSON.stringify(C.getClothingSave());
  C.applyClothingSave(JSON.parse(s1));
  const s2 = JSON.stringify(C.getClothingSave());
  assert.equal(s2, s1);
}, 'nieuw spel: opslaan, laden, opslaan geeft dezelfde tekst (ook de slotvolgorde)');

ok(() => {
  const d = C.getClothingSave();
  for (const k of Object.keys(d)) {
    const per = d[k];
    if (!per || typeof per !== 'object' || !per.w) continue;
    const omgekeerd = Object.fromEntries(Object.entries(per.w).reverse());
    per.w = omgekeerd;
  }
  C.applyClothingSave(d);
  const s2 = JSON.stringify(C.getClothingSave());
  C.applyClothingSave(JSON.parse(s2));
  assert.equal(JSON.stringify(C.getClothingSave()), s2);
}, 'een save met een andere slotvolgorde wordt na één lading stabiel');

ok(() => {
  const d = C.getClothingSave();
  const order = [...Object.keys(d.tammo.w)];
  const sorted = [...order].sort((a, b) => SLOT_IDS.indexOf(a) - SLOT_IDS.indexOf(b));
  assert.deepEqual(order, sorted);
}, 'de slots staan in de vaste volgorde van SLOT_IDS');

// savegame.js laadt three via de CDN en draait niet in node; de regel staat in de bron
const sg = fs.readFileSync(path.join(ROOT, 'game/js/savegame.js'), 'utf8');
const lijn = sg.split('\n').find((l) => /^\s*w\.weapon = WEAPONS\[d\.weapon\]/.test(l)) || '';
ok(() => assert.match(lijn, /ammo\[d\.weapon\] === Infinity/), 'laden houdt een wapen met oneindige munitie vast');
ok(() => {
  // dezelfde uitdrukking los nagerekend met een pistool en 'inf' in de save
  const WEAPONS = { pistol: { ammo: 12 }, fists: { ammo: Infinity } };
  const ammo = { pistol: Infinity };
  const d = { weapon: 'pistol' };
  const expr = lijn.replace(/^\s*w\.weapon = /, '').replace(/;\s*$/, '');
  const kies = new Function('WEAPONS', 'ammo', 'd', `return ${expr};`);
  assert.equal(kies(WEAPONS, ammo, d), 'pistol');
  assert.equal(kies(WEAPONS, { pistol: 5 }, d), 'pistol');
  assert.equal(kies(WEAPONS, {}, d), 'fists');
}, 'pistool met oneindige munitie blijft pistool; zonder munitie vuisten');

// duifrecords (pigeonmode.js laadt three en draait niet in node): de drie functies uit de bron, met een nep-ACH en een nep-sleutel
ok(() => {
  const pm = fs.readFileSync(path.join(ROOT, 'game/js/pigeonmode.js'), 'utf8');
  const blok = (naam) => {
    const start = pm.indexOf(`function ${naam}(`);
    assert.ok(start >= 0, naam);
    let diep = 0;
    for (let i = pm.indexOf('{', start); i < pm.length; i++) {
      if (pm[i] === '{') diep++;
      else if (pm[i] === '}' && --diep === 0) return pm.slice(start, i + 1);
    }
    throw new Error('geen einde ' + naam);
  };
  const code = `let store = { best: 0, total: 0, ach: [], home: false };
    ${blok('sanitizeStore')}
    ${blok('loadLegacyStore')}
    ${blok('applyPigeonSaveData')}
    return { apply: applyPigeonSaveData, get: () => store };`;
  const oud = { v: null };
  const ls = { getItem: () => oud.v };
  const M = new Function('ACH', 'STORE_KEY', 'localStorage', code)({ a1: 1, a2: 1 }, 'gde-duif', ls);
  M.apply({ best: 900, total: 40, ach: ['a1'], home: true }); // plek A
  M.apply({ best: 10, total: 1, ach: [], home: false }); // plek B
  assert.deepEqual(M.get(), { best: 10, total: 1, ach: [], home: false }, 'plek B houdt zijn eigen records');
  M.apply(undefined); // een save zonder duif-veld
  assert.deepEqual(M.get(), { best: 0, total: 0, ach: [], home: false }, 'een save zonder duif begint niet met de records van plek B');
  oud.v = JSON.stringify({ best: 300, total: 5, ach: ['a2'], home: false }); // de oude losse sleutel gaat nog steeds mee
  M.apply({ best: 10, total: 9, ach: ['a1'], home: true });
  assert.deepEqual(M.get(), { best: 300, total: 9, ach: ['a2', 'a1'], home: true });
}, 'duifrecords lekken niet van de ene saveplek naar de andere');

console.log(`opslag_rondgang_test: ${n - fails}/${n} geslaagd`);
process.exit(fails ? 1 : 0);
