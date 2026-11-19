// Population work is spread over frames, not stacked. node scripts/popstagger_test.mjs
import { createPopStagger, POP_SLOTS } from '../game/js/popstagger.js';
let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL', m); } };
const st = createPopStagger(POP_SLOTS);
const fires = {}; let maxPerFrame = 0, frames = 0;
for (let t = 0; t < 30; t += 1 / 60) {
  const due = st.tick(1 / 60); frames++;
  maxPerFrame = Math.max(maxPerFrame, due.length);
  for (const d of due) (fires[d] = fires[d] || []).push(t);
}
ok(maxPerFrame === 1, 'never two population jobs on one frame (max ' + maxPerFrame + ')');
ok(fires.cars.length >= 19 && fires.cars.length <= 21, 'cars about every 1.5 s: ' + fires.cars.length);
ok(fires.peds.length >= 14 && fires.peds.length <= 16, 'peds about every 2 s: ' + fires.peds.length);
ok(Math.abs((fires.bikes[0] - fires.cars[0]) - 0.3) < 0.03, 'bikes 0.3 s after cars');
ok(Math.abs((fires.motors[0] - fires.cars[0]) - 0.9) < 0.03, 'motors 0.9 s after cars');
ok(fires.peds[0] > 1.1 && fires.peds[0] < 1.3, 'peds start 1.2 s in');
// a long frame fires each slot once, not a burst
const s2 = createPopStagger(POP_SLOTS);
ok(s2.tick(5).length === 5 && s2.tick(0.01).length === 0, 'a long frame fires every slot once');
console.log(`popstagger_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
