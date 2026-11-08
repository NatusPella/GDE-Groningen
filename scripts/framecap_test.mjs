// Zuinige modus: de beeldbegrenzing (#96) en de kwaliteitsmeting onder de cap (#561).
//   node scripts/framecap_test.mjs
import { skipFrame, ZUINIG_FPS, capIdleMs, frameWorkMs, screenRefreshMs } from '../game/js/framecap.js';
let fails = 0;
const ok = (c, n) => { if (!c) { fails++; console.log('FAIL', n); } };
for (const hz of [60, 75, 120, 144]) {
  let last = 0, drawn = 0;
  const step = 1000 / hz;
  for (let t = step; t < 10000; t += step) if (!skipFrame(t - last)) { last = t; drawn++; }
  const fps = drawn / 10;
  ok(fps <= ZUINIG_FPS + 0.5 && fps >= ZUINIG_FPS * 0.75, `${hz} Hz geeft ~${ZUINIG_FPS} beelden/s, was ${fps}`);
  // #793: uit de animatiebeelden is de echte schermperiode af te lezen
  ok(Math.abs(screenRefreshMs() - step) < 0.6, `${hz} Hz: gemeten schermperiode ${screenRefreshMs().toFixed(2)} ms, verwacht ${step.toFixed(2)}`);
}
// #793: met de gemeten periode trekt de cap-correctie de echte wacht eraf (was: 60 Hz-aanname)
{
  const idle144 = capIdleMs(1000 / 144);
  const measured = frameWorkMs(34.72, true);
  ok(measured < 10 && Math.abs(measured - (34.72 - idle144)) < 0.05, `144 Hz: 30 fps meet na de correctie ${measured.toFixed(1)} ms werk, niet ~18 ms`);
}
ok(!skipFrame(1, 0) && !skipFrame(1, -5), 'cap 0 betekent geen begrenzing');
ok(!skipFrame(40) && skipFrame(10), 'trage beelden worden nooit overgeslagen');

// #561: de cap wacht bewust tussen twee beelden; dat wachten is geen traag beeld.
const idle60 = capIdleMs(1000 / 60);
ok(Math.abs(idle60 - 1000 / 60) < 0.01, `op 60 Hz is de wachttijd één beeld (${idle60})`);
ok(Math.abs(frameWorkMs(33.4, true, 1000 / 60) - 16.7) < 0.6, '30 fps op 60 Hz meet na de correctie weer ~60 fps');
ok(frameWorkMs(33.4, false) === 33.4, 'zonder zuinige modus verandert er niets');
ok(frameWorkMs(50, true, 1000 / 60) > 30, 'een echt traag beeld blijft traag na de correctie');
for (const hz of [75, 120, 144]) {
  const refresh = 1000 / hz;
  const idle = capIdleMs(refresh);
  const stride = Math.ceil((1000 / ZUINIG_FPS - 3) / refresh) * refresh;
  const rest = Math.round((stride - idle) * 100) / 100;
  ok(rest < 27, `${hz} Hz: het gecorrigeerde interval (${rest} ms) is niet traag`);
  ok(idle >= 1000 / 60 - 0.01, `${hz} Hz: de correctie is nooit kleiner dan één 60 Hz-beeld`);
}
ok(capIdleMs(0) === 0 && frameWorkMs(10, true, 0) === 10, 'ongeldige invoer verandert niets');
if (fails) { console.log(fails + ' mislukt'); process.exit(1); }
console.log('framecap_test: ok');
