// Een door OSM gemapte doorgang door een dunne gevel is een doorgang (#420: het poortje van Portal Groningen bij de Werkmanbrug,
// een gebouw van 4 x 1 m met een voetpad erdoor, stond dicht). Zonder die kaartmarkering blijft een voetpad dat een metertje in een
// gevel steekt een stoep die in de muur getekend is (de oude regel, passages.js "graze").
//   node scripts/passage_thin_test.mjs
import './node3d.mjs';
const { pointInPolygon } = await import('../game/js/util.js');
const { passagesOf } = await import('../game/js/passages.js');
const { resolveBuildingCollisions } = await import('../game/js/collision.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

// het gebouw: 4 m breed (x 67 tot 71), 1 m diep (y 868 tot 869); het voetpad loopt van y 860 tot y 877 door het midden
const ring = [[67, 868], [71, 868], [71, 869], [67, 869], [67, 868]];
const walk = { pts: [[69, 860], [69, 877]], cat: 'foot', type: 'footway', width: 1.8, bounds: [69, 860, 69, 877] };
const make = (passageWays) => {
  const b = { pts: ring, bounds: [67, 868, 71, 869], type: 'yes' };
  const map = { buildings: [b], roads: [walk], passageWays, buildingsNear: () => [b], roadsNear: () => [walk], roadGrid: null };
  return { b, map };
};
const asWay = (pts, kind) => ({ pts, kind, hw: 'footway', bounds: [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))] });
const through = (map) => {
  let pushed = 0, inside = 0;
  for (let y = 866; y <= 871; y += 0.25) {
    for (const x of [68.6, 69, 69.4]) {
      if (!pointInPolygon(x, y, ring)) continue;
      inside++;
      const [rx, ry] = resolveBuildingCollisions(x, y, 0.35, map);
      if (Math.hypot(rx - x, ry - y) > 0.05) pushed++;
    }
  }
  return { pushed, inside };
};

const mapped = make([asWay([[68.69, 868.54], [68.7, 869.14]], 'covered')]);
const ps = passagesOf(mapped.map, mapped.b);
ok(ps.length === 1 && ps[0].mapped === 'covered', 'gemapte doorgang door een dunne gevel wordt een doorgang', JSON.stringify(ps.map((p) => p.mapped)));
ok(ps.length === 1 && ps[0].shown, 'en de opening wordt getoond');
const r1 = through(mapped.map);
ok(r1.inside > 10 && r1.pushed === 0, 'een wandelaar loopt er doorheen', `${r1.pushed}/${r1.inside}`);

const plain = make([]);
ok(passagesOf(plain.map, plain.b).length === 0, 'zonder markering blijft een voetpad door een dunne gevel een muur (stoep in de gevel)');
const r2 = through(plain.map);
ok(r2.pushed === r2.inside, 'een wandelaar wordt dan weggeduwd', `${r2.pushed}/${r2.inside}`);

console.log(`${n - fails}/${n} checks passed`);
process.exit(fails ? 1 : 0);
