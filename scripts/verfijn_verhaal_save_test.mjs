// Verfijnronde 22-11, Verhaal: fuzz op het laden van een verhaal-save. Een kapotte, oude of vreemde save mag het spel nooit
// laten crashen of in een onmogelijke stand zetten, en opslaan en opnieuw laden geeft dezelfde stand (idempotent).
//   node scripts/verfijn_verhaal_save_test.mjs
import assert from 'node:assert/strict';
import './node3d.mjs';
const { applyStorySave, getStorySave } = await import('../game/js/story.js');
const A = await import('../game/js/storyarc.js');

let n = 0, fails = 0;
const t = (name, f) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
let seed = 2211;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const ids = A.STEPS.map((s) => s.id);
const rommel = [null, undefined, NaN, Infinity, -1, 1e9, 'x', '__proto__', 'constructor', {}, [], [1, 2], { a: 1 }, true, 0, '', ids[0], ids[5]];
const lijst = () => Array.from({ length: Math.floor(rnd() * 12) }, () => (rnd() < 0.5 ? pick(ids) : pick(rommel)));
const failsObj = () => { const o = {}; for (let i = 0; i < Math.floor(rnd() * 6); i++) o[rnd() < 0.7 ? pick(ids) : String(pick(rommel))] = pick(rommel); return o; };

for (let r = 0; r < 400; r++) {
  const save = { v: pick([1, 2, 2, 3, 0, '2', null]), done: lijst(), skipped: lijst(), voorschot: lijst(), waived: lijst(), cards: lijst(), flags: lijst(), fails: failsObj(), gate: pick([undefined, null, 5, { v: 1, open: lijst() }, { v: 1, open: 'x' }]) };
  t('fuzz save ' + r, () => {
    applyStorySave(save);
    const g = getStorySave();
    assert.equal(g.v, 2);
    for (const id of g.done) assert.ok(ids.includes(id), 'onbekende stap in done: ' + id);
    for (const [id, k] of Object.entries(g.fails)) assert.ok(ids.includes(id) && Number.isInteger(k) && k >= 0 && k <= 99, 'fails buiten bereik: ' + id + '=' + k);
    const norm = JSON.stringify(g, (_, v) => (Array.isArray(v) ? [...v].sort() : v));
    applyStorySave(JSON.parse(JSON.stringify(g)));
    const g2 = getStorySave();
    assert.equal(JSON.stringify(g2, (_, v) => (Array.isArray(v) ? [...v].sort() : v)), norm, 'opslaan, laden en opslaan geeft dezelfde stand');
  });
}
t('geen save en rommelsaves geven een lege nieuwe stand', () => {
  for (const x of [null, undefined, 5, 'x', [], {}, { v: 9 }]) { applyStorySave(x); assert.equal(getStorySave().done.length, 0); }
});
t('negatieve en absurde mislukkingen worden begrensd', () => {
  applyStorySave({ v: 2, done: [], fails: { [ids[3]]: -4, [ids[4]]: 1e9, [ids[5]]: 2.7 } });
  const f = getStorySave().fails;
  assert.equal(f[ids[3]], 0); assert.equal(f[ids[4]], 99); assert.equal(f[ids[5]], 2);
});

console.log(`${n - fails}/${n} verfijn_verhaal_save_test`);
process.exit(fails ? 1 : 0);
