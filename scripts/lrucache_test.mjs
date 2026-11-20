// De LRU-cache met bovengrens en dispose-teller (#1040), zuiver.
//   node scripts/lrucache_test.mjs
import { createLru } from '../game/js/lrucache.js';

let fails = 0, n = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL', name, info); } };

{
  const disposed = [];
  const c = createLru(3, (v, k) => disposed.push(k));
  for (const k of ['a', 'b', 'c']) c.set(k, { k });
  ok(c.size === 3 && disposed.length === 0, 'tot de grens geen dispose');
  c.get('a');   // a is nu het jongste, b het oudste
  c.set('d', { k: 'd' });
  ok(c.size === 3 && disposed.join() === 'b' && !c.has('b') && c.has('a'), 'het oudst gebruikte gaat eruit en krijgt een dispose', disposed.join());
  c.set('a', { k: 'a2' });   // overschrijven telt niet als nieuw item
  ok(c.size === 3 && disposed.length === 1 && c.get('a').k === 'a2', 'overschrijven verdringt niets');
  for (let i = 0; i < 100; i++) c.set('x' + i, i);
  ok(c.size === 3 && disposed.length === 101, 'na honderd inserts blijft de grootte op de grens', String(c.size));
  ok(c.stats.evicted === disposed.length, 'de teller klopt met de dispose-aanroepen', `${c.stats.evicted} ${disposed.length}`);
  const before = disposed.length;
  c.clear();
  ok(c.size === 0 && disposed.length === before + 3, 'clear dispoost wat nog in de cache stond');
}
{
  const c = createLru(2, () => { throw new Error('kapot'); });
  c.set(1, 1); c.set(2, 2); c.set(3, 3);
  ok(c.size === 2 && c.stats.evicted === 1, 'een falende dispose breekt de cache niet');
  ok(createLru(0).set('a', 1) === 1 && createLru(NaN).size === 0, 'een onzinnige grens wordt 1, geen fout');
}
console.log(fails ? `lrucache_test: ${fails} van ${n} mislukt` : `lrucache_test: ok (${n} controles)`);
process.exit(fails ? 1 : 0);
