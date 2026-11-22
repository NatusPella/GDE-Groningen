// De leescache van een slot geeft elke lezer een eigen kopie: een lezer die zijn data aanpast, vervuilt de volgende niet.
// node scripts/saveslots_cache_test.mjs
import { readSlot, writeSlot, resetReadCache, saveStats, resetSaveStats } from '../game/js/saveslots.js';
import { SAVE_VERSION } from '../game/js/savemigrate.js';
const m = new Map();
const ls = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
let n = 0, fails = 0;
const ok = (c, msg, i = '') => { n++; if (!c) { fails++; console.log('FAIL', msg, i); } };
resetReadCache();
ok(writeSlot(ls, 1, { v: SAVE_VERSION, arc: 'nieuw', money: 10, missions: { completed: ['m1'] }, story: { done: ['a'] } }), 'schrijven');
const a = readSlot(ls, 1);
ok(a.state === 'ok', 'staat ok', a.state);
a.data.missions.completed.push('VERVUILD');
a.data.story.done.length = 0;
a.data.money = 999999;
const b = readSlot(ls, 1);
ok(b.data.money === 10, 'geld niet vervuild', b.data.money);
ok(b.data.missions.completed.length === 1 && b.data.story.done.length === 1, 'geneste lijsten niet vervuild', JSON.stringify(b.data.missions));
resetSaveStats();
readSlot(ls, 1); readSlot(ls, 1);
ok(saveStats.parse === 0 && saveStats.cacheHit === 2, 'de cache werkt nog: geen nieuwe parse', JSON.stringify(saveStats));
console.log(`saveslots_cache_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
