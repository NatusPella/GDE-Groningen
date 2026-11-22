// mergeLife (oudmigratie.js) vouwt twee levenslange prestatiebestanden samen, maar liet missionModes (de missierecords
// van de andere moeilijkheidsniveaus, #800) weg: na de eenmalige overzetting waren die records en medailles verdwenen.
// Pure test met een opslag in het geheugen: nooit de echte sleutels.   node scripts/oudmigratie_modes_test.mjs
import assert from 'node:assert/strict';
import { mergeLife, migrateOudeOpslag } from '../game/js/oudmigratie.js';
import { BASE_KEYS, KEYS } from '../game/js/storagekeys.js';

let n = 0, fails = 0;
const ok = (fn, name) => { n++; try { fn(); } catch (e) { fails++; console.log(`FAIL ${name}: ${e.message}`); } };

const oud = { v: 1, unlocked: { a: 5 }, missions: { 0: { best: 50, medal: 1, runs: 1 } }, missionModes: { uitdagend: { 0: { best: 60, medal: 1, runs: 4 }, 2: { best: 30, medal: 2, runs: 1 } } } };
const nieuw = { v: 1, unlocked: {}, missionModes: { uitdagend: { 0: { best: 40, medal: 3, runs: 2 } }, ontspannen: { 1: { best: 90, medal: 1, runs: 1 } } } };

ok(() => {
  const m = mergeLife(oud, nieuw);
  assert.ok(m.missionModes, 'missionModes blijft bestaan');
  assert.deepEqual(m.missionModes.uitdagend[0], { best: 40, medal: 3, runs: 4 }, 'beste tijd (laagste), hoogste medaille, meeste pogingen');
  assert.deepEqual(m.missionModes.uitdagend[2], { best: 30, medal: 2, runs: 1 }, 'een record van één kant blijft');
  assert.deepEqual(m.missionModes.ontspannen[1], { best: 90, medal: 1, runs: 1 }, 'een niveau van één kant blijft');
  assert.deepEqual(m.missions[0], { best: 50, medal: 1, runs: 1 }, 'de standaardrecords blijven zoals ze waren');
}, 'mergeLife houdt de records per moeilijkheidsniveau');

ok(() => {
  const m = mergeLife({ v: 1, missionModes: { uitdagend: 'kapot', ['__proto__']: { 0: { best: 1 } } } }, null);
  assert.deepEqual(m.missionModes, {}, 'kapotte invoer geeft een lege lijst, geen fout');
}, 'mergeLife verdraagt kapotte missionModes');

ok(() => {
  // the one-time migration through a memory storage
  const mem = new Map();
  const local = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: (k) => { mem.delete(k); } };
  local.setItem(BASE_KEYS.achievements, JSON.stringify(oud));
  local.setItem(KEYS.achievements, JSON.stringify(nieuw));
  const r = migrateOudeOpslag(local);
  assert.equal(r.prestaties, true, 'de prestaties zijn samengevoegd');
  const na = JSON.parse(local.getItem(KEYS.achievements));
  assert.equal(na.missionModes && na.missionModes.uitdagend && na.missionModes.uitdagend[0].medal, 3, 'de gouden medaille op Uitdagend overleeft de overzetting');
}, 'de eenmalige overzetting gooit missionModes niet weg');

console.log(`oudmigratie_modes_test: ${n - fails}/${n} geslaagd`);
process.exit(fails ? 1 : 0);
