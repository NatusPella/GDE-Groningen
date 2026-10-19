// #102: "where is the road" has one kernel (util.nearestOnRoadList); the point
// helpers of tileplace/padel/cityprops read it instead of looping over segments.
//   node scripts/nearestroad_test.mjs
import fs from 'node:fs';
import { nearestOnRoadList, segDist } from '../game/js/util.js';

let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL', m); } };
const roads = [
  { name: 'A', cat: 'normal', pts: [[0, 0], [100, 0]], width: 6 },
  { name: 'B', cat: 'foot', pts: [[0, 10], [100, 10]], width: 2 },
];
const q = nearestOnRoadList(roads, 30, 4);
ok(q.road.name === 'A' && Math.abs(q.d - 4) < 1e-9 && Math.abs(q.x - 30) < 1e-9 && q.ux === 1 && q.uy === 0, 'nearest road, direction');
ok(nearestOnRoadList(roads, 30, 4, (r) => r.cat === 'foot').road.name === 'B', 'filter');
ok(nearestOnRoadList(roads, 30, 4, () => false) === null, 'none');
ok(Math.abs(segDist(30, 4, 0, 0, 100, 0) - 4) < 1e-9, 'segDist agrees');

// no new private nearest-road loops in the game: every file that finds the nearest road
// by looping over segments must be on this list of known ones
const KNOWN = new Set(['util.js', 'tileplace.js', 'mapdata.js', 'routing.js', 'vehicle.js', 'pedroutes.js', 'countrylife.js', 'simambient.js', 'roadgraph.js', 'roadsurface.js']);
const dir = new URL('../game/js/', import.meta.url);
const loops = [];
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.js') || KNOWN.has(f)) continue;
  const s = fs.readFileSync(new URL(f, dir), 'utf8');
  if (/function\s+(nearestRoad|nearestStreet|roadAt|onRoad|nearestStreetPoint|nearestRoadAngle)\b[^{]*\{[^}]*?for\s*\(\s*let\s+i\s*=\s*0[^)]*pts\.length\s*-\s*1/s.test(s)) loops.push(f);
}
ok(loops.length === 0, 'no private nearest-road loops outside the known files: ' + loops.join(','));
console.log(`nearestroad_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
