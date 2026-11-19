// Autosave parst de vorige save niet opnieuw als wij die zelf schreven. node scripts/saveslots_lastwritten_test.mjs
import { slotKey, slotRecoveryKey } from '../game/js/storagekeys.js';
import { SAVE_VERSION } from '../game/js/savemigrate.js';
import { ARC_ID } from '../game/js/storyarc.js';
import * as S from '../game/js/saveslots.js';
let n = 0, fails = 0;
const ok = (c, m, i = '') => { n++; if (!c) { fails++; console.log('FAIL', m, i); } };
class Mem { constructor() { this.m = new Map(); } getItem(k) { return this.m.has(k) ? this.m.get(k) : null; } setItem(k, v) { this.m.set(k, String(v)); } removeItem(k) { this.m.delete(k); } }
const save = (money) => ({ v: SAVE_VERSION, arc: ARC_ID, savedAt: 1000 + money, money, speeltijd: 100, missions: { index: 1, completed: [0], seen: [0] }, character: 'tammo' });
const ls = new Mem();
S.resetSaveStats();
ok(S.writeSlot(ls, 1, save(1)), 'eerste save');
ok(S.writeSlot(ls, 1, save(2)), 'tweede save');
const p2 = S.saveStats.parse;
ok(S.writeSlot(ls, 1, save(3)), 'derde save');
ok(S.saveStats.parse === p2, 'een eigen vorige save wordt niet opnieuw geparsed', S.saveStats.parse - p2);
ok(JSON.parse(ls.getItem(slotRecoveryKey(1))).money === 2, 'de herstelkopie is de vorige save');
// een andere tab schrijft iets anders: dan wel controleren (en kapotte tekst wordt geen herstelkopie)
ls.setItem(slotKey(1), '{kapot');
const before = ls.getItem(slotRecoveryKey(1));
const p3 = S.saveStats.parse;
S.writeSlot(ls, 1, save(4));
ok(S.saveStats.parse > p3, 'andere tekst op de plek: wel geparsed');
ok(ls.getItem(slotRecoveryKey(1)) === before, 'kapotte tekst wordt geen herstelkopie');
ok(JSON.parse(ls.getItem(slotKey(1))).money === 4, 'nieuwe save staat er');
console.log(`saveslots_lastwritten_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
