// Ongeldige plekken en datums: niets wordt stil verzet of gooit. node scripts/saveslots_ongeldig_test.mjs
import { setActive, renameSlot, deleteSlot, createSlot, activeSlot, readIndex, writeSlot, exportFileName, exportSlot, listSlots } from '../game/js/saveslots.js';
import { SAVE_VERSION } from '../game/js/savemigrate.js';
const m = new Map();
const ls = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
let n = 0, fails = 0;
const ok = (c, msg, i = '') => { n++; if (!c) { fails++; console.log('FAIL', msg, i); } };
writeSlot(ls, 1, { v: SAVE_VERSION, arc: 'nieuw', money: 1 });
writeSlot(ls, 2, { v: SAVE_VERSION, arc: 'nieuw', money: 2 });
ok(setActive(ls, 2) && activeSlot(ls) === 2, 'geldige plek');
for (const bad of [0, 9, -1, 1.5, NaN, undefined, null, '2', 99]) {
  ok(setActive(ls, bad) === false && activeSlot(ls) === 2, 'setActive weigert ' + String(bad), activeSlot(ls));
  ok(renameSlot(ls, bad, 'x') === false, 'renameSlot weigert ' + String(bad));
  ok(deleteSlot(ls, bad) === false, 'deleteSlot weigert ' + String(bad));
}
ok(listSlots(ls).length === 2, 'niets verwijderd door ongeldige nummers', listSlots(ls).length);
ok(Object.keys(readIndex(ls).names).length === 0, 'geen naam voor een ongeldige plek');
let naam = '';
try { naam = exportFileName('Mijn spel', new Date('kapot')); } catch (e) { naam = 'GOOIDE'; }
ok(/^gde-save-mijn-spel-\d{4}-\d\d-\d\d\.json$/.test(naam), 'ongeldige datum geeft toch een bestandsnaam', naam);
try { naam = exportFileName('x', 'geen datum'); } catch (e) { naam = 'GOOIDE'; }
ok(naam !== 'GOOIDE', 'een tekst als datum gooit niet');
ok(exportSlot(ls, 1, new Date(NaN)).ok === true, 'export met ongeldige datum lukt');
console.log(`saveslots_ongeldig_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
