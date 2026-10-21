// Het water dat twee keer is getekend (#231, game/js/waterdupes.js): een bijna gelijk meer van dezelfde soort en hetzelfde peil
// valt weg (de naam blijft), een kanaal in een meer, een eiland, een ander peil of een andere soort niet.
//   node scripts/waterdupes_test.mjs
import { dropWaterDuplicates } from '../game/js/waterdupes.js';

let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL ' + m); } };
const ring = (x, y, w, h, k = 24) => { const P = []; for (let i = 0; i < k; i++) P.push([x + w / 2 + (w / 2) * Math.cos((i / k) * 2 * Math.PI), y + h / 2 + (h / 2) * Math.sin((i / k) * 2 * Math.PI)]); P.push(P[0]); return P; };
const row = (pts, o = {}) => ({ pts, kind: 'meer', lv: -1, nav: 3, name: '', ...o });

const big = row(ring(0, 0, 600, 400));
const twin = row(ring(10, 5, 590, 395, 40), { name: 'Hoeksmeer' }); // the same lake mapped again
let d = dropWaterDuplicates([big, twin]);
ok(d.size === 1 && d.has(twin) && big.name === 'Hoeksmeer', 'the twin goes, its name stays on the bigger one');

const canal = row(ring(100, 150, 400, 80), { kind: 'kanaal', lv: -2.3, nav: 3 });
ok(dropWaterDuplicates([row(ring(0, 0, 600, 400)), canal]).size === 0, 'a canal through a lake is another row');
const island = row(ring(200, 100, 100, 80));
ok(dropWaterDuplicates([row(ring(0, 0, 600, 400)), island]).size === 0, 'a pond in a lake is not a twin (a fifth of its size)');
ok(dropWaterDuplicates([row(ring(0, 0, 600, 400)), row(ring(0, 0, 600, 400), { lv: -2.3 })]).size === 0, 'another level is another row');
const navTwin = [row(ring(0, 0, 600, 400), { nav: 3 }), row(ring(0, 0, 580, 400), { nav: 1 })];
ok(dropWaterDuplicates(navTwin).has(navTwin[1]), 'a twin that is less navigable than the bigger one goes');
const better = [row(ring(0, 0, 600, 400), { nav: 1 }), row(ring(0, 0, 590, 400), { nav: 3 })];
ok(!dropWaterDuplicates(better).has(better[1]), 'a twin that is more navigable stays (the bigger one loses nothing it has)');
ok(dropWaterDuplicates([row(ring(0, 0, 600, 400)), row(ring(2000, 2000, 600, 400))]).size === 0, 'two lakes apart stay');
ok(dropWaterDuplicates([row([[0, 0], [1, 1], [0, 1]]), row([[0, 0], [1, 1], [0, 1]])]).size === 0, 'degenerate rows are left alone');

console.log(fails ? `${fails} of ${n} FAILED` : `${n} water duplicate checks passed`);
process.exit(fails ? 1 : 0);
