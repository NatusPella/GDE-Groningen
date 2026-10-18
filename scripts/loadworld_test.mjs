// scripts/lib/loadworld.mjs (#90 S1): beide bronnen geven dezelfde stad
import assert from 'node:assert/strict';
import { loadCityWorld, worldSrc } from './lib/loadworld.mjs';

assert.equal(worldSrc({}), 'json');
assert.equal(worldSrc({ WORLD_SRC: 'tiles' }), 'tiles');
const a = (await loadCityWorld({ src: 'json' })).map;
const b = (await loadCityWorld({ src: 'tiles' })).map;
for (const k of ['roads', 'buildings', 'water']) {
  const x = a[k].length, y = b[k].length;
  assert.ok(Math.abs(x - y) <= x * 0.02, `${k}: json ${x} tegels ${y}`);
}
assert.deepEqual(a.meta.bounds, b.meta.bounds);
console.log(`loadworld_test: ok (wegen ${a.roads.length}/${b.roads.length}, gebouwen ${a.buildings.length}/${b.buildings.length})`);
