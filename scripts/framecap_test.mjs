// Zuinige modus: de beeldbegrenzing (#96).  node scripts/framecap_test.mjs
import { skipFrame, ZUINIG_FPS } from '../game/js/framecap.js';
let fails = 0;
const ok = (c, n) => { if (!c) { fails++; console.log('FAIL', n); } };
for (const hz of [60, 75, 120, 144]) {
  let last = 0, drawn = 0;
  const step = 1000 / hz;
  for (let t = step; t < 10000; t += step) if (!skipFrame(t - last)) { last = t; drawn++; }
  const fps = drawn / 10;
  ok(fps <= ZUINIG_FPS + 0.5 && fps >= ZUINIG_FPS * 0.75, `${hz} Hz geeft ~${ZUINIG_FPS} beelden/s, was ${fps}`);
}
ok(!skipFrame(1, 0) && !skipFrame(1, -5), 'cap 0 betekent geen begrenzing');
ok(!skipFrame(40) && skipFrame(10), 'trage beelden worden nooit overgeslagen');
if (fails) { console.log(fails + ' mislukt'); process.exit(1); }
console.log('framecap_test: ok');
