// #1011: de samenvatting van de startmeting (multiplayerlaunchtiming.js) en het zetten van stappen. Puur, zonder browser.
import assert from 'node:assert/strict';
import { samenvatStartMeting, markeerStartStap, startStartMeting } from '../game/js/multiplayerlaunchtiming.js';

const s = samenvatStartMeting([
  { at: 10, dur: 500, stap: 'hek-open', bron: 'longtask' },
  { at: 700, dur: 300, stap: 'hek-open', bron: 'raf' },
  { at: 2000, dur: 1200, stap: 'opening-speelt', bron: 'raf' },
  { at: 3000, dur: 50, stap: 'opening-speelt', bron: 'raf' }, // onder de drempel
  { at: 3100, dur: 130 },
  null,
]);
assert.equal(s.aantal, 4);
assert.equal(s.totaalMs, 500 + 300 + 1200 + 130);
assert.equal(s.langsteMs, 1200);
assert.deepEqual(s.perStap['hek-open'], { n: 2, som: 800, max: 500 });
assert.equal(s.perStap['(geen stap)'].n, 1);
assert.deepEqual(samenvatStartMeting(undefined), { aantal: 0, totaalMs: 0, langsteMs: 0, perStap: {} });

// zonder meting is markeren een no-op; met een lopende meting komt de stap erbij
assert.equal(markeerStartStap({}, 'x'), false);
const w = {};
w.coopStartMeting = { t0: performance.now(), stap: 'a', stappen: [], events: [], klaar: false };
assert.equal(markeerStartStap(w, 'hek-open'), true);
assert.equal(w.coopStartMeting.stap, 'hek-open');
assert.equal(w.coopStartMeting.stappen.length, 1);
w.coopStartMeting.klaar = true;
assert.equal(markeerStartStap(w, 'nog'), false);
// zonder requestAnimationFrame (Node) start de meting zonder te crashen en is hij te stoppen
const w2 = {};
const m = startStartMeting(w2);
assert.ok(m && !m.klaar);
assert.equal(startStartMeting(w2), m, 'eenmalig per start');
m.stop();
assert.ok(m.klaar && m.samenvatting.aantal === 0);
console.log('multiplayerlaunchtiming_test: ok');
