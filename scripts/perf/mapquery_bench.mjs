// Tijd van de kaartvragen die het spel elk frame stelt (buildingsNear, roadsNear, nearestRoadPoint, groundHeightAt) op de
// vaste stadsset, en van het langslopen van de hele arrays (#314: rijen in dictionary-modus maken elke eigenschapslezing
// een hash-zoektocht). Vaste punten (eenvoudige LCG), dus twee builds krijgen dezelfde vragen.
//   GAME_WORLD=<wereldmap> node scripts/perf/mapquery_bench.mjs [rondes]
import { wereldMap, heeftWereld, laadStadTegels } from '../lib/stadtegels.mjs';

if (!heeftWereld()) { console.log('SKIP mapquery_bench: geen wereld (GAME_WORLD)'); process.exit(0); }
const { world: map } = await laadStadTegels(wereldMap());
const rondes = +process.argv[2] || 5;
let seed = 12345;
const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const pts = Array.from({ length: 40000 }, () => [(rnd() - 0.5) * 7000, (rnd() - 0.5) * 7000]);
const t = (f) => { const t0 = performance.now(); const v = f(); return [performance.now() - t0, v]; };
const out = { buildingsNear: [], roadsNear: [], nearestRoadPoint: [], groundHeightAt: [], scanBuildings: [], scanRoads: [] };
let sink = 0;
for (let k = 0; k < rondes; k++) {
  out.buildingsNear.push(t(() => { let s = 0; for (const [x, y] of pts) for (const b of map.buildingsNear(x, y, 25)) s += b.bounds[0] + (b.h || 0); return s; }));
  out.roadsNear.push(t(() => { let s = 0; for (const [x, y] of pts) for (const r of map.roadsNear(x, y, 25)) s += r.width + r.pts.length; return s; }));
  out.nearestRoadPoint.push(t(() => { let s = 0; for (const [x, y] of pts) { const q = map.nearestRoadPoint(x, y, 40); if (q) s += q.dist || 0; } return s; }));
  out.groundHeightAt.push(t(() => { let s = 0; for (const [x, y] of pts) s += map.groundHeightAt(x, y, 0); return s; }));
  out.scanBuildings.push(t(() => { let s = 0; for (const b of map.buildings) s += (b.h || 0) + b.pts.length + (b.type === 'house' ? 1 : 0); return s; }));
  out.scanRoads.push(t(() => { let s = 0; for (const r of map.roads) s += r.width + r.pts.length + (r.cat === 'major' ? 1 : 0) + (r.bridge ? 1 : 0); return s; }));
}
const med = (a) => [...a].sort((x, y) => x - y)[a.length >> 1];
const res = {};
for (const [k, v] of Object.entries(out)) { res[k + '_ms'] = Math.round(med(v.map((x) => x[0])) * 10) / 10; sink += v[0][1]; }
console.log(JSON.stringify(res), sink > -1 ? '' : '');
