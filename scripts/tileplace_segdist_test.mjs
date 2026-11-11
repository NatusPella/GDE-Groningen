// segDist/scalar-pad (#804):  node scripts/tileplace_segdist_test.mjs
import { segDist, segDistD } from '../game/js/tileplace.js';

let fails = 0;
const ok = (c, name, extra) => { if (!c) { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };

const cases = [
  [0, 0, [0, 0], [10, 0]],
  [5, 3, [0, 0], [10, 0]],
  [-4, 2, [0, 0], [10, 0]],
  [3, 4, [0, 0], [0, 0]],
  [1, 1, [0, 0], [1, 1]],
  [2, 2, [4, 4], [8, 8]],
];
for (const [x, y, a, b] of cases) {
  const arr = segDist(x, y, a, b);
  const d = segDistD(x, y, a, b);
  ok(Math.abs(arr[0] - d) < 1e-9, 'scalar en array geven dezelfde afstand', { x, y, a, b, arr, d });
  const dx = arr[1] - x, dy = arr[2] - y;
  ok(Math.abs(Math.hypot(dx, dy) - d) < 1e-9, 'het teruggegeven punt ligt op dezelfde afstand', { x, y, a, b, arr, d });
}

// Een lijn met veel punten: geen array-allocatie in segDistD, wel dezelfde uitkomst.
const pts = Array.from({ length: 50 }, (_, i) => [i * 1.5, Math.sin(i) * 3]);
let maxErr = 0;
for (let k = 0; k < pts.length - 1; k++) {
  const arr = segDist(2, 2, pts[k], pts[k + 1]);
  const d = segDistD(2, 2, pts[k], pts[k + 1]);
  maxErr = Math.max(maxErr, Math.abs(arr[0] - d));
}
ok(maxErr < 1e-9, 'over een hele lijn blijft het verschil verwaarloosbaar', maxErr);
ok(segDistD(0, 0, [0, 0], [0, 0]) === 0, 'een leeg segment geeft afstand 0');

console.log(fails ? `${fails} FAIL` : 'tileplace_segdist_test ok');
process.exit(fails ? 1 : 0);
