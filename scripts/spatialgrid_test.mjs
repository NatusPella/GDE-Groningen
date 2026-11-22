// SpatialGrid: insert, remove, query by box and radius, update, clear.
import assert from 'node:assert/strict';
import { SpatialGrid, gridItems } from '../game/js/spatialgrid.js';

const g = new SpatialGrid(10);
const a = { n: 'a' }, b = { n: 'b' }, c = { n: 'c' };
g.insert(a, [1, 1, 2, 2]);
g.insert(b, [5, 5, 35, 5]); // spans four cells, comes back once
g.insertPoint(c, -15, -15); // negative coordinates

assert.deepEqual(g.query(0, 0, 9, 9).sort((p, q) => p.n.localeCompare(q.n)), [a, b]);
assert.equal(g.query(0, 0, 40, 10).filter((x) => x === b).length, 1);
assert.deepEqual(g.query(-20, -20, -11, -11), [c]);
assert.deepEqual(g.query(100, 100, 110, 110), []);

assert.ok(g.queryRadius(-15, -15, 1).includes(c));
assert.ok(!g.queryRadius(50, 50, 5).includes(a));

g.update(a, [1, 1, 2, 2], [51, 51, 52, 52]);
assert.ok(!g.query(0, 0, 9, 9).includes(a));
assert.deepEqual(g.query(50, 50, 55, 55), [a]);
g.update(a, [51, 51, 52, 52], [53, 53, 54, 54]); // same cell: untouched
assert.deepEqual(g.query(50, 50, 55, 55), [a]);

g.remove(b, [5, 5, 35, 5]);
assert.ok(!g.query(0, 0, 40, 10).includes(b));
g.removePoint(c, -15, -15);
assert.deepEqual(g.query(-20, -20, -11, -11), []);
g.remove(b, [5, 5, 35, 5]); // removing twice is harmless

// gridItems bewaart zijn uitkomst per rasterversie (perf-60-normaal) en geeft elke keer een eigen kopie
const q1 = gridItems(g), q2 = gridItems(g);
assert.notEqual(q1, q2);
assert.deepEqual(q1, q2);
q1.length = 0; // een beller mag zijn kopie slopen
assert.deepEqual(gridItems(g), q2);
const d = { n: 'd' };
g.insert(d, [100, 100, 101, 101]);
assert.ok(gridItems(g).includes(d), 'insert maakt de bewaarde lijst ongeldig');
g.remove(d, [100, 100, 101, 101]);
assert.ok(!gridItems(g).includes(d), 'remove maakt de bewaarde lijst ongeldig');
g.map.values().next().value.pop(); g.touch(); // rechtstreekse celwijziging (home.js regrid) plus touch
assert.deepEqual(gridItems(g), (() => { const o = [], z = new Set(); for (const arr of g.map.values()) for (const it of arr) if (!z.has(it)) { z.add(it); o.push(it); } return o; })());

g.clear();
assert.equal(gridItems(g).length, 0);
assert.equal(g.map.size, 0);
console.log('spatialgrid_test: ok');

// #1184: gridItems bewaart zijn lijst tot het raster verandert; de beller krijgt steeds een eigen kopie
{
  const { SpatialGrid, gridItems } = await import('../game/js/spatialgrid.js');
  const g = new SpatialGrid(10);
  const a = { n: 'a' }, b = { n: 'b' }, c = { n: 'c' };
  g.insert(a, [0, 0, 35, 5]); g.insert(b, [50, 50, 51, 51]);
  const l1 = gridItems(g);
  let okc = l1.length === 2 && l1[0] === a && l1[1] === b;
  l1.length = 0; l1.push('vuil'); // een beller die sorteert of knipt mag de bewaarde lijst niet raken
  const l2 = gridItems(g);
  okc = okc && l2.length === 2 && l2[0] === a && l2 !== l1;
  g.insert(c, [100, 100, 101, 101]);
  okc = okc && gridItems(g).length === 3;
  g.remove(a, [0, 0, 35, 5]);
  const l4 = gridItems(g);
  okc = okc && l4.length === 2 && !l4.includes(a);
  g.update(b, [50, 50, 51, 51], [200, 200, 201, 201]);
  okc = okc && gridItems(g).includes(b) && gridItems(g).length === 2;
  g.clear();
  okc = okc && gridItems(g).length === 0;
  const nep = { map: new Map([[1, [a, a]]]) }; // nagemaakt raster zonder klasse: geen bewaring, wel dedupe
  okc = okc && gridItems(nep).length === 1 && gridItems(nep).length === 1 && nep._items === undefined;
  console.log(okc ? 'ok   gridItems: bewaarde lijst, eigen kopie, ongeldig na insert/remove/update/clear' : 'FAIL gridItems-cache');
  if (!okc) process.exitCode = 1;
}
