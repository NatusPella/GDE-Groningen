// 1+1=3 (#492): meer spelers, meer loon per persoon. Puur en deterministisch.
//   node scripts/groepsbonus_test.mjs
import assert from 'node:assert/strict';
import * as G from '../game/js/groepsbonus.js';

let n = 0;
const t = (naam, fn) => { n++; try { fn(); } catch (e) { console.log('FAIL', naam, '\n  ', e.message); process.exitCode = 1; } };

t('de factor groeit per deelnemer en stopt op 3x', () => {
  assert.equal(G.groepsbonus(1), 1);
  assert.equal(G.groepsbonus(2), 1.5);   // 1+1=3: twee spelers, elk 1,5x
  assert.equal(G.groepsbonus(3), 2);
  assert.equal(G.groepsbonus(4), 2.5);
  assert.equal(G.groepsbonus(5), 3);
  assert.equal(G.groepsbonus(10), 3);
  assert.equal(G.groepsbonus(999), 3);
});

t('geen deelnemer of rare invoer telt als één', () => {
  assert.equal(G.groepsbonus(0), 1);
  assert.equal(G.groepsbonus(-4), 1);
  assert.equal(G.groepsbonus('2'), 1.5);
  assert.equal(G.groepsbonus(2.9), 1.5);
  assert.equal(G.groepsbonus(NaN), 1);
});

t('het bedrag is in hele euro\'s en nooit negatief', () => {
  assert.equal(G.metGroepsbonus(100, 1), 100);
  assert.equal(G.metGroepsbonus(100, 2), 150);
  assert.equal(G.metGroepsbonus(100, 3), 200);
  assert.equal(G.metGroepsbonus(101, 2), 152);
  assert.equal(G.metGroepsbonus(0, 4), 0);
  assert.equal(G.metGroepsbonus(-50, 4), 0);
  assert.equal(G.metGroepsbonus('100', 2), 150);
  assert.equal(G.metGroepsbonus(NaN, 2), 0);
});

t('twee spelers leveren samen drie keer het solobedrag op', () => {
  const solo = G.metGroepsbonus(100, 1);
  const twee = G.metGroepsbonus(100, 2);
  assert.equal(solo + solo, 200);
  assert.equal(twee * 2, 300, '1+1=3');
  assert.ok(twee > solo, 'elk persoon krijgt meer');
});

t('de regel is puur en heeft geen invoer van buiten', () => {
  assert.equal(G.groepsbonus(2), G.groepsbonus(2));
  assert.equal(typeof G.GROEPSBONUS_PER_SPELER, 'number');
  assert.ok(G.GROEPSBONUS_MAX >= 1);
});

if (process.exitCode) console.log(`groepsbonus_test: ${n} tests, mislukt`);
else console.log(`groepsbonus_test: ${n}/${n} ok`);
