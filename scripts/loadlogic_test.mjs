// Pure logic of the load screens (game/js/loadlogic.js):  node scripts/loadlogic_test.mjs
import { loadKind, stepProgress, startProgress, litTiles, pickTips, buildLines, tipText, TILE_COUNT, TIP_MAX_CHARS, MAX_S, SNEL_M } from '../game/js/loadlogic.js';
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

ok(loadKind(5000) === 'travel' && loadKind(SNEL_M - 1) === 'snel' && loadKind(900) === 'snel', 'kind by distance');
ok(loadKind(10, { save: true }) === 'save', 'save wins');

// progress: monotonic, ends at 1, never done before the minimum time
let s = startProgress(), last = 0, doneAt = -1;
for (let f = 0; f < 600; f++) {
  const t = f / 60, pending = Math.max(0, 100 - f * 2);
  s = stepProgress(s, pending, t, 'travel');
  ok(s.bar >= last - 1e-9, 'bar never goes back', f);
  last = s.bar;
  if (s.done && doneAt < 0) doneAt = t;
}
ok(doneAt >= 1.4, 'not done before the minimum', doneAt);
ok(s.bar === 1, 'ends full');
// first frames show nearly nothing
let a = stepProgress(startProgress(), 500, 0, 'save');
ok(a.bar <= 0.05 && !a.done, 'first frame starts low');
// nothing to build: still waits for the minimum, then done
let q = startProgress(); let d = -1;
for (let f = 0; f < 400; f++) { q = stepProgress(q, 0, f / 60, 'snel'); if (q.done && d < 0) d = f / 60; }
ok(d >= 0.6 && d < 1.2, 'snel with an empty queue is quick', d);
// stuck stream gives up after MAX_S
let z = startProgress();
z = stepProgress(z, 50, MAX_S + 0.1, 'travel');
ok(z.done && z.bar === 1, 'timeout finishes');

ok(litTiles(0) === 0 && litTiles(1) === TILE_COUNT && litTiles(0.5) === TILE_COUNT / 2 && litTiles(2) === TILE_COUNT && litTiles(-1) === 0, 'tiles');

// tips
const tips = ['Tip: loop met V. Dan kom je verder.', 'Tip: ' + 'x'.repeat(80), 'Tip: pauze met Esc.', 'Tip: pauze met Esc.', 'Tip: kaart met M!'];
const rng = (() => { let i = 0; return () => ((i = (i * 7 + 3) % 10) / 10); })();
const p = pickTips(tips, 5, rng);
ok(p.length === 3, 'dedupes and drops long ones', p.length);
ok(p.every((t) => t.length <= TIP_MAX_CHARS && !t.startsWith('Tip')), 'short, no prefix');
ok(tipText('Tip: loop met V. Dan kom je verder.') === 'Loop met V.', 'first sentence');
ok(!pickTips(tips, 5, rng, 'Pauze met Esc.').includes('Pauze met Esc.'), 'no repeat of last');
ok(pickTips(tips, 0).length === 0, 'n = 0');

ok(buildLines('snel', ['Onderweg', 'x'], p).length === 0, 'snel has no lines');
const bl = buildLines('travel', ['Onderweg', 'Een lijn'], p);
ok(bl.length === 4 && bl[0][0] === 'Onderweg' && bl[1][0] === 'Wist je dat', 'lead then tips');
ok(buildLines('travel', ['Onderweg', ''], p).length === 3, 'empty lead skipped');
console.log(`${n - fails}/${n} loadlogic`);
process.exit(fails ? 1 : 0);
