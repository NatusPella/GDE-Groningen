//   node scripts/hudcache_test.mjs
import { singleEntryCache } from '../game/js/hudcache.js';
let fout = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FOUT ') + m); if (!c) fout++; };

let calls = 0;
const c = singleEntryCache((x, y) => { calls++; return x === 0 ? null : { naam: `Straat ${x},${y}` }; });
// 50 keer 0,2 s met dezelfde afslag: één opzoeking
for (let i = 0; i < 50; i++) c('10,20', 10, 20);
ok(calls === 1 && c.hits === 49, `dezelfde afslag, 50 vragen, ${calls} opzoeking`);
ok(c('11,20', 11, 20).naam === 'Straat 11,20' && calls === 2, 'een nieuwe afslag zoekt opnieuw');
ok(c('0,0', 0, 0) === null && c('0,0', 0, 0) === null && calls === 3, 'niets gevonden wordt ook onthouden');
c.clear();
c('0,0', 0, 0);
ok(calls === 4, 'na clear (nieuwe kaart of wereld) wordt opnieuw gezocht');
process.exit(fout ? 1 : 0);
