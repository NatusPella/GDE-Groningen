// #958: uit het water klimmen op de echte stadskaart. Zwaar (de stadsbouw duurt enkele
// minuten, daarom een audit en geen _test): zet een zwemmer 0,9 m uit de oever op een
// steekproef van waterranden en vraagt findClimbSpot om een klimplek. Een plek mag nooit
// in water, in een gebouw, in een scheepje of tegen een muur/hek liggen (de botsingsregel
// mag haar niet meer dan 4 cm verschuiven), en het pad van de waterkant naar de plek moet
// vrij zijn. Telt ook hoeveel plekken de oude regel (alleen water en gebouw) in een muur
// of hek zette: dat is het aantal dat deze audit nu weigert.
//   GDE_PROVINCE_SRC=<data/cache/province> node scripts/zwemklim_wereld_audit.mjs [--n=3000]
import { loadCityWorld } from './lib/loadworld.mjs';
import { inMapWater } from '../game/js/util.js';

const N = Number((process.argv.find((a) => a.startsWith('--n=')) || '--n=3000').slice(4));
const { map } = await loadCityWorld();
const { findClimbSpot, climbPathClear } = await import('../game/js/player.js');
const { resolveWalker } = await import('../game/js/collision.js');
const { buildingAt } = await import('../game/js/tileplace.js');
const { insideWaterObstacle } = await import('../game/js/waterindex.js');

// de randen van alle waterlichamen binnen de kaart, evenredig bemonsterd
const edges = [];
for (const w of map.water) {
  const P = w.pts;
  for (let i = 0; i < P.length - 1; i++) {
    const [ax, ay] = P[i], [bx, by] = P[i + 1];
    const L = Math.hypot(bx - ax, by - ay);
    if (L < 1) continue;
    for (let t = 0.5; t < L; t += 6) edges.push([ax + (bx - ax) * (t / L), ay + (by - ay) * (t / L), (bx - ax) / L, (by - ay) / L]);
  }
}
const stride = Math.max(1, Math.floor(edges.length / N));
let total = 0, found = 0, none = 0, bad = 0, oldBad = 0;
const fouten = [];
for (let k = 0; k < edges.length; k += stride) {
  const [ex, ey, ux, uy] = edges[k];
  // de normaal die het water in wijst
  let nx = -uy, ny = ux;
  if (!inMapWater(map, ex + nx * 1.2, ey + ny * 1.2)) { nx = -nx; ny = -ny; }
  if (!inMapWater(map, ex + nx * 1.2, ey + ny * 1.2)) continue;
  const sx = ex + nx * 0.9, sy = ey + ny * 0.9;
  if (!inMapWater(map, sx, sy) || insideWaterObstacle(map, sx, sy)) continue;
  total++;
  const spot = findClimbSpot(map, sx, sy, Math.atan2(-ny, -nx));
  // wat de oude regel gedaan zou hebben: de eerste droge plek langs de kijkrichting + 0,4 m
  let old = null;
  for (let d = 0.2; d <= 1.3; d += 0.15) {
    const px = sx - nx * d, py = sy - ny * d;
    if (!inMapWater(map, px, py)) { old = { ex: px, ey: py, x: sx - nx * (d + 0.4), y: sy - ny * (d + 0.4) }; break; }
  }
  if (old && !inMapWater(map, old.x, old.y) && !buildingAt(map, old.x, old.y) && !climbPathClear(map, old.ex, old.ey, old.x, old.y)) oldBad++;
  if (!spot) { none++; continue; }
  found++;
  const [rx, ry] = resolveWalker(spot.x, spot.y, 0.3, map, 0, 0, null, 0, 0);
  const slecht = inMapWater(map, spot.x, spot.y) || !!buildingAt(map, spot.x, spot.y) || insideWaterObstacle(map, spot.x, spot.y) || Math.hypot(rx - spot.x, ry - spot.y) > 0.04;
  if (slecht) { bad++; if (fouten.length < 5) fouten.push(`(${spot.x.toFixed(1)}, ${spot.y.toFixed(1)}) vanaf (${sx.toFixed(1)}, ${sy.toFixed(1)})`); }
}
console.log(`zwemklim_wereld_audit: ${total} zwempunten, ${found} met klimplek, ${none} zonder, ${bad} slechte plekken; de oude regel zette er ${oldBad} in een muur, hek of voorwerp`);
for (const f of fouten) console.log('  slecht:', f);
process.exit(bad ? 1 : 0);
