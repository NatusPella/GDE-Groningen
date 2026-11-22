// Bij een volle opslag gaan eerst de herstelkopie en dan de miniaturen weg; de save zelf blijft staan. node scripts/saveslots_ruimte_test.mjs
import { writeSlotRaw, readSlot, writeThumb } from '../game/js/saveslots.js';
import { slotKey, slotThumbKey, slotRecoveryKey } from '../game/js/storagekeys.js';
import { SAVE_VERSION } from '../game/js/savemigrate.js';
// opslag met een harde limiet in tekens
const maak = (limiet) => { const m = new Map(); const gebruik = () => [...m].reduce((a, [k, v]) => a + k.length + v.length, 0);
  return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), removeItem: (k) => m.delete(k),
    setItem(k, v) { v = String(v); const nu = gebruik() - (m.has(k) ? k.length + m.get(k).length : 0); if (nu + k.length + v.length > limiet) throw Object.assign(new Error('quota'), { name: 'QuotaExceededError' }); m.set(k, v); } }; };
let n = 0, fails = 0;
const ok = (c, msg, i = '') => { n++; if (!c) { fails++; console.log('FAIL', msg, i); } };
const save = (extra) => JSON.stringify({ v: SAVE_VERSION, arc: 'nieuw', money: 1, vul: 'x'.repeat(extra) });
const thumb = 'data:image/jpeg;base64,' + 'A'.repeat(300);
// limiet: één save + net niet genoeg voor een kopie ernaast of een thumb
const ls = maak(3000);
ok(writeSlotRaw(ls, 1, save(1000)), 'eerste save');
for (let i = 1; i <= 3; i++) writeThumb(ls, i, thumb);
ok(ls.getItem(slotThumbKey(1)) !== null, 'miniatuur staat er');
ok(writeSlotRaw(ls, 1, save(2000)), 'tweede, grotere save lukt ondanks volle opslag');
ok(readSlot(ls, 1).state === 'ok' && readSlot(ls, 1).data.vul.length === 2000, 'de nieuwe save staat er heel');
ok(ls.getItem(slotThumbKey(1)) === null, 'de miniaturen zijn voor de save gegaan');
// echt te groot: de oude save blijft staan
const ls2 = maak(1500);
ok(writeSlotRaw(ls2, 1, save(600)), 'kleine save');
ok(!writeSlotRaw(ls2, 1, save(5000)), 'een save die nooit past mislukt');
ok(readSlot(ls2, 1).state === 'ok' && readSlot(ls2, 1).data.vul.length === 600, 'de oude save blijft heel');
console.log(`saveslots_ruimte_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
