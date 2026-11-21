// Pure test van game/js/compileplanner.js (#1046): budget, volgorde en geen dubbele compilaties.
import assert from 'node:assert/strict';
import { CompilePlanner, COMPILE_BUDGET_MS } from '../game/js/compileplanner.js';
import { withAllVisible, planPrecompile, scanLate, stepIdleCompile, idleCompilePending } from '../game/js/launchcompile.js';

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

// laat toegevoegde groepen (#1046): één keer gecompileerd, groepen uit het laadplan niet nog eens, lichten nooit
const mk = (id, extra = {}) => ({ uuid: id, children: [], traverse(f) { f(this); }, ...extra });
t('scanLate: nieuwe groep krijgt een portie, bekende en lichten niet, geen dubbele', () => {
  const a = mk('a'), b = mk('b'), licht = mk('l', { isLight: true });
  const scene = { children: [a] }; const gedaan = [];
  const kit = { scene, compile: (o) => gedaan.push(o.uuid), withLightRig: (on, fn) => fn(), lightRigOn: () => true, filmOff: true };
  const plan = planPrecompile(kit, {});
  while (plan.pending) plan.step(1e9);
  scene.children.push(b, licht);
  for (let i = 0; i < 40; i++) stepIdleCompile(2, () => kit);
  assert.deepEqual(gedaan, ['a', 'b']);
  assert.equal(idleCompilePending(), 0);
  // een bekende groep die groeit levert alleen zijn nieuwe kind
  const c = mk('c'); a.children.push(c);
  for (let i = 0; i < 40; i++) stepIdleCompile(2, () => kit);
  assert.deepEqual(gedaan, ['a', 'b', 'c']);
});

t('withAllVisible: verborgen objecten zijn zichtbaar tijdens fn en daarna weer verborgen', () => {
  const kind = { visible: false }, root = { visible: true, traverse(f) { f(this); f(kind); } };
  let tijdens = null;
  withAllVisible(root, () => { tijdens = kind.visible; });
  assert.equal(tijdens, true); assert.equal(kind.visible, false);
  assert.throws(() => withAllVisible(root, () => { throw new Error('x'); }));
  assert.equal(kind.visible, false);
});

t('review 21-11 (N1): add sorteert niet meer elke keer; een add tijdens een run met lagere prio komt toch eerst', () => {
  const p = new CompilePlanner(), uit = [];
  p.add('x', () => { uit.push('x'); p.add('vroeg', () => uit.push('vroeg'), 0); }, 0);
  p.add('y', () => uit.push('y'), 1);
  p.add('z', () => uit.push('z'), 1);
  assert.equal(p.pending, 3);
  assert.equal(p.step(1e9), 4);
  assert.deepEqual(uit, ['x', 'vroeg', 'y', 'z']);
  assert.equal(p.pending, 0);
  assert.equal(p.queue.length, 0, 'de wachtrij is na het leegdraaien ook echt leeg');
});

t('review 21-11 (N1): 3800 items plannen kost geen kwadratische sorteertijd', () => {
  const p = new CompilePlanner();
  const t0 = performance.now();
  for (let i = 0; i < 3800; i++) p.add('k' + i, () => {}, i % 7);
  const ms = performance.now() - t0;
  console.log(`  3800 x add: ${ms.toFixed(1)} ms (voorheen ca. 131 ms)`);
  assert.ok(ms < 60, `add blijft goedkoop (${ms} ms)`);
  p.step(1e9);
  assert.equal(p.done, 3800);
});

console.log(`compileplanner_test: ${ok} controles OK`);
