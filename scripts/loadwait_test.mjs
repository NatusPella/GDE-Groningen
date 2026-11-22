// 22-11: een ontdekkingsmelding (nieuw gebied, nieuwe streek) komt pas nadat het laadscherm weg is.
//   node scripts/loadwait_test.mjs
import fs from 'node:fs';
import { announceAfterLoadScreen, flushLoadWait, pendingCount, clearLoadWait, loadScreenOpen } from '../game/js/loadwait.js';
let fails = 0, n = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL', name, info); } };
let open = true;
const probe = () => open;
const log = [];
clearLoadWait();
ok(announceAfterLoadScreen(() => log.push('a'), probe) === false && log.length === 0, 'tijdens het laadscherm geen melding');
announceAfterLoadScreen(() => log.push('b'), probe);
ok(pendingCount() === 2, 'twee meldingen wachten');
ok(flushLoadWait(probe) === 0 && log.length === 0, 'scherm nog open: niets');
open = false;
ok(flushLoadWait(probe) === 2 && log.join('') === 'ab', 'scherm weg: in volgorde', log.join(''));
ok(flushLoadWait(probe) === 0, 'maar een keer');
ok(announceAfterLoadScreen(() => log.push('c'), probe) === true && log.at(-1) === 'c', 'zonder scherm direct');
open = true;
for (let i = 0; i < 20; i++) announceAfterLoadScreen(() => {}, probe);
ok(pendingCount() === 8, 'de wachtrij is begrensd', String(pendingCount()));
clearLoadWait();
// DOM-mock
const doc = (ids, bootDone) => ({ getElementById: (id) => (id === 'load-screen' && ids.includes('ls') ? {} : id === 'loading' && ids.includes('boot') ? { isConnected: true, classList: { contains: (c) => c === 'done' && bootDone } } : null) });
ok(loadScreenOpen(doc(['ls'])) === true, 'laadscherm van een save telt');
ok(loadScreenOpen(doc(['boot'], false)) === true, 'opstartscherm telt');
ok(loadScreenOpen(doc(['boot'], true)) === false, 'opstartscherm met done telt niet');
ok(loadScreenOpen(doc([])) === false, 'niets in beeld');
// de haken
for (const f of ['gebiedenlive', 'explorationlive']) {
  const s = fs.readFileSync(new URL(`../game/js/${f}.js`, import.meta.url), 'utf8');
  ok(/announceAfterLoadScreen\(/.test(s) && /flushLoadWait\(\)/.test(s), f + ': melding wacht op het laadscherm en wordt gespoeld');
  ok(!/^\s*(w|world)\.addMessage\(.*(Nieuw gebied|Nieuwe streek|Streekstempel)/m.test(s), f + ': geen directe ontdekkingsmelding');
}
console.log(fails ? `loadwait_test: ${fails} FAIL` : `loadwait_test: ok (${n} controles)`);
process.exit(fails ? 1 : 0);
