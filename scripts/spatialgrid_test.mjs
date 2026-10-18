// SpatialGrid: insert, remove, query by box and radius, update, clear.
import assert from 'node:assert/strict';
import { SpatialGrid } from '../game/js/spatialgrid.js';

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

g.clear();
assert.equal(g.map.size, 0);
console.log('spatialgrid_test: ok');
