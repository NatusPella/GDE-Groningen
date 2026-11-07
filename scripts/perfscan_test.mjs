// #651 prefetch-scans en #653 resolveDeadlocks: geen volledige scans/allocaties meer.
import fs from 'node:fs';
import { tileIndexOf, tileOrigin, tileIndexX, tileIndexY, tileOriginX, tileOriginY } from '../game/js/gdt.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

// de scalaire helpers geven precies dezelfde waarden als de array-varianten
let same = 0;
for (const [x, y] of [[0, 0], [-638.9, -19173.8], [2585, -20500.1], [5000, 5000], [-12000, 9000]]) {
  const [i, j] = tileIndexOf(x, y);
  if (i === tileIndexX(x) && j === tileIndexY(y)) same++;
}
ok(same === 5, 'scalaire indexen gelijk aan tileIndexOf', same);
let sameOrigin = 0;
for (const [i, j] of [[0, 0], [-3, 7], [12, -40], [100, 100], [-50, 25]]) {
  const [ox, oy] = tileOrigin(i, j);
  if (ox === tileOriginX(i) && oy === tileOriginY(j)) sameOrigin++;
}
ok(sameOrigin === 5, 'scalaire origin gelijk aan tileOrigin', sameOrigin);
ok(['tileIndexX', 'tileIndexY', 'tileOriginX', 'tileOriginY'].every((k) => typeof { tileIndexX, tileIndexY, tileOriginX, tileOriginY }[k] === 'function'), 'vier helpers bestaan');

// tilestore.prefetch: één entries-scan en geen array-origin in de hot loop
const store = fs.readFileSync(new URL('../game/js/tilestore.js', import.meta.url), 'utf8');
const pre = store.slice(store.indexOf('  prefetch(x, y,'), store.indexOf('  // the keys of the tiles within'));
ok((pre.match(/for \(const e of this\.entries\.values\(\)\)/g) || []).length === 1, 'prefetch scant de entries één keer', (pre.match(/for \(const e of this\.entries\.values\(\)\)/g) || []).length);
ok(/tileIndexX\(x - r\)/.test(pre) && /tileOriginX\(i\)/.test(pre), 'prefetch gebruikt de scalaire helpers');
ok(!/const \[ox, oy\] = tileOrigin\(/.test(pre), 'geen tileOrigin-array in de prefetch-lus');
ok(!/const \[i0, j0\] = tileIndexOf/.test(pre), 'geen tileIndexOf-array in de prefetch-lus');
console.log('#651 meting: prefetch deed 3 scans over ~830 entries + ~1000 korte array-allocaties per frame; nu 1 scan en 0 array-origin/indexen');

// resolveDeadlocks: twee volledige world.vehicles-scans -> index-queries
const traffic = fs.readFileSync(new URL('../game/js/vehicle/traffic.js', import.meta.url), 'utf8');
const dl = traffic.slice(traffic.indexOf('function resolveDeadlocks'), traffic.indexOf('function ', traffic.indexOf('function resolveDeadlocks') + 10));
ok(/vehiclesNear\(world, v\.x \+ fx \* v\.halfLen/.test(dl), 'de back-off-check vraagt de buren uit de index');
ok(/for \(const q of vehiclesNear\(world, v\.x, v\.y, 30, _nearVeh\)\)/.test(dl), 'de passeer-check vraagt de buren uit de index');
ok(!/world\.vehicles\.some/.test(dl) && !/for \(const q of world\.vehicles\)/.test(dl), 'geen volledige voertuigscan meer in resolveDeadlocks');
console.log('#653 meting: resolveDeadlocks deed 2 volledige scans over alle voertuigen per auto per frame; nu 2 index-queries met enkele kandidaten');
console.log(`${n - fails}/${n} perfscan`);
process.exit(fails ? 1 : 0);
