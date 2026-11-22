// 22-11: een ontdekkingsmelding (nieuw gebied, nieuwe streek) komt pas nadat het laadscherm weg is.
//   node scripts/laadwacht_test.mjs
import fs from 'node:fs';
import { meldNaLaadscherm, spoelLaadwacht, aantalWachtend, wisLaadwacht, laadschermOpen } from '../game/js/laadwacht.js';
let fails = 0, n = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL', name, info); } };
let open = true;
const probe = () => open;
const log = [];
wisLaadwacht();
ok(meldNaLaadscherm(() => log.push('a'), probe) === false && log.length === 0, 'tijdens het laadscherm geen melding');
meldNaLaadscherm(() => log.push('b'), probe);
ok(aantalWachtend() === 2, 'twee meldingen wachten');
ok(spoelLaadwacht(probe) === 0 && log.length === 0, 'scherm nog open: niets');
open = false;
ok(spoelLaadwacht(probe) === 2 && log.join('') === 'ab', 'scherm weg: in volgorde', log.join(''));
ok(spoelLaadwacht(probe) === 0, 'maar een keer');
ok(meldNaLaadscherm(() => log.push('c'), probe) === true && log.at(-1) === 'c', 'zonder scherm direct');
open = true;
for (let i = 0; i < 20; i++) meldNaLaadscherm(() => {}, probe);
ok(aantalWachtend() === 8, 'de wachtrij is begrensd', String(aantalWachtend()));
wisLaadwacht();
// DOM-mock
const doc = (ids, bootDone) => ({ getElementById: (id) => (id === 'load-screen' && ids.includes('ls') ? {} : id === 'loading' && ids.includes('boot') ? { isConnected: true, classList: { contains: (c) => c === 'done' && bootDone } } : null) });
ok(laadschermOpen(doc(['ls'])) === true, 'laadscherm van een save telt');
ok(laadschermOpen(doc(['boot'], false)) === true, 'opstartscherm telt');
ok(laadschermOpen(doc(['boot'], true)) === false, 'opstartscherm met done telt niet');
ok(laadschermOpen(doc([])) === false, 'niets in beeld');
// de haken
for (const f of ['gebiedenlive', 'explorationlive']) {
  const s = fs.readFileSync(new URL(`../game/js/${f}.js`, import.meta.url), 'utf8');
  ok(/meldNaLaadscherm\(/.test(s) && /spoelLaadwacht\(\)/.test(s), f + ': melding wacht op het laadscherm en wordt gespoeld');
  ok(!/^\s*(w|world)\.addMessage\(.*(Nieuw gebied|Nieuwe streek|Streekstempel)/m.test(s), f + ': geen directe ontdekkingsmelding');
}
console.log(fails ? `laadwacht_test: ${fails} FAIL` : `laadwacht_test: ok (${n} controles)`);
process.exit(fails ? 1 : 0);
