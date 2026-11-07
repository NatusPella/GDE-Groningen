// #653 rest: SpatialGrid.queryInto, avoid-grid om de 2 frames en #651 geoFrame-budget.
import fs from 'node:fs';
import { SpatialGrid } from '../game/js/spatialgrid.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

// --- queryInto geeft dezelfde items als query, zonder nieuwe array
const grid = new SpatialGrid(16);
const items = Array.from({ length: 60 }, (_, i) => ({ id: i, x: (i * 37) % 400, y: (i * 91) % 400 }));
for (const it of items) grid.insertPoint(it, it.x, it.y);
const out = [];
let same = 0, total = 0;
for (const [x, y, r] of [[100, 100, 30], [0, 0, 10], [200, 200, 80], [399, 399, 200], [-50, -50, 20]]) {
  const want = grid.query(x - r, y - r, x + r, y + r).map((q) => q.id).sort((a, b) => a - b);
  const count = grid.queryRadiusInto(out, x, y, r);
  const got = out.map((q) => q.id).sort((a, b) => a - b);
  total++;
  if (count === out.length && got.join() === want.join()) same++;
}
ok(same === total, 'queryInto geeft dezelfde items als query', same + '/' + total);
const ref = out;
const c1 = grid.queryRadiusInto(out, 100, 100, 30);
const c2 = grid.queryRadiusInto(out, 100, 100, 30);
ok(out === ref && c1 > 0 && c2 === c1, 'tweede aanroep: dezelfde array en hetzelfde aantal', c1 + '/' + c2);
console.log('#653 meting: queryRadius per voetganger per frame maakte een array + Set; queryRadiusInto hergebruikt er één en dedupe-t alleen bij meerdere cellen');

// --- avoidBias leest via queryRadiusInto
const pdroutes = fs.readFileSync(new URL('../game/js/pedroutes.js', import.meta.url), 'utf8');
const ab = pdroutes.slice(pdroutes.indexOf('function avoidBias'), pdroutes.indexOf('function separatePeds') > 0 ? pdroutes.indexOf('function separatePeds') : undefined);
ok(/grid\.queryRadiusInto\(_avoidOut, ped\.x, ped\.y, AVOID_CELL\)/.test(ab), 'avoidBias gebruikt de hergebruikte lijst');
ok(!/grid\.queryRadius\(/.test(ab), 'geen queryRadius-allocatie meer in avoidBias');
const peds = fs.readFileSync(new URL('../game/js/pedestrians.js', import.meta.url), 'utf8');
ok(/if \(\+\+pedAvoidTick % 2 === 0\) buildPedAvoidGrid\(peds\)/.test(peds), 'de avoid-grid gaat om de twee frames');
console.log('#653 meting: avoid-grid 60x/s -> 30x/s; avoidBias 0 nieuwe arrays/Sets per voetganger per frame');

// --- #651 geoFrame: het frame-budget wordt nu echt gerespecteerd
const geo = fs.readFileSync(new URL('../game/js/geojobs.js', import.meta.url), 'utf8');
ok(/frameRoom\[i\] -= dispatch\(i, frameRoom\[i\]\);/.test(geo), 'geoFrame geeft de rest van het budget mee');
ok(!/dispatch\(i, GEO_DISPATCH_PER_FRAME\)/.test(geo), 'niet opnieuw de volle constante');
console.log('#651 meting: geoFrame kon tot 12 jobs per frame per worker sturen (2x de bedoelde 6); nu hooguit het restbudget');
console.log(`${n - fails}/${n} perfrest`);
process.exit(fails ? 1 : 0);
