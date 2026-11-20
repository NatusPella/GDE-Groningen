// Pure test van game/js/compileplanner.js (#1046): budget, volgorde en geen dubbele compilaties.
import assert from 'node:assert/strict';
import { CompilePlanner, COMPILE_BUDGET_MS } from '../game/js/compileplanner.js';

let ok = 0;
const t = (naam, fn) => { fn(); ok++; };

t('volgorde: lage prio eerst, daarna aanmeldvolgorde', () => {
  const p = new CompilePlanner(), uit = [];
  p.add('c', () => uit.push('c'), 2); p.add('a', () => uit.push('a'), 0); p.add('b', () => uit.push('b'), 0); p.add('d', () => uit.push('d'), 1);
  while (p.pending) p.step(1e9);
  assert.deepEqual(uit, ['a', 'b', 'd', 'c']);
});

t('geen dubbele compilaties, ook niet na het draaien', () => {
  const p = new CompilePlanner(); let n = 0;
  assert.equal(p.add('x', () => n++), true);
  assert.equal(p.add('x', () => n++), false);
  p.step(1e9);
  assert.equal(p.add('x', () => n++), false);
  p.step(1e9);
  assert.equal(n, 1);
});

t('budget: stopt als de klok het budget haalt, maar doet minstens een item', () => {
  let klok = 0; const now = () => klok;
  const p = new CompilePlanner(); let n = 0;
  for (let i = 0; i < 10; i++) p.add('k' + i, () => { n++; klok += 3; });
  assert.equal(p.step(4, now), 2); // 3 ms, 6 ms >= 4: stop na het tweede
  assert.equal(p.pending, 8);
  assert.equal(p.step(0, now), 1); // budget 0: toch een item
  assert.equal(n, 3);
});

t('voortgang en fouten: een fout telt als gedaan', () => {
  const p = new CompilePlanner();
  p.add('a', () => { throw new Error('boem'); }); p.add('b', () => {});
  assert.equal(p.progress, 0);
  p.step(1e9);
  assert.equal(p.progress, 1); assert.equal(p.errors.length, 1); assert.equal(p.errors[0].key, 'a');
});

t('leeg: voortgang 1 en step doet niets', () => {
  const p = new CompilePlanner();
  assert.equal(p.progress, 1); assert.equal(p.step(), 0); assert.equal(COMPILE_BUDGET_MS, 4);
});

console.log(`compileplanner_test: ${ok} controles OK`);
