// #1045: wat de tegelwereld bij het laden van een tegel zelf rechtzet. Laadt de hele provincie zoals het spel
// (tileworld.js) en telt in de grids waar het spel uit tekent en tegen botst:
//   - ongenoemde gebouwen op een rijbaan of in water: weg (propfilter.misplacedBuilding),
//   - bomen in water of in een gebouw: weg (tilegreenery.js retrimTree).
// De audit (scripts/world/world_audit.mjs) telt hetzelfde op de ruwe tegelrijen: dat zijn de aantallen 'voor'.
//
//   node scripts/world_misplaced_test.mjs        (zonder game/world: SKIP)
import fs from 'node:fs';
import './node3d.mjs';
import { worldDirUrl } from './lib/worldlocator.mjs';

const root = worldDirUrl();
if (!fs.existsSync(new URL('index-provincie.json', root))) { console.log('SKIP world_misplaced_test: geen game/world met de provincie'); process.exit(0); }

const S = await import('../game/js/tilestore.js');
const TW = await import('../game/js/tileworld.js');
const PW = await import('../game/js/provinceworld.js');
const PF = await import('../game/js/propfilter.js');

const files = new Proxy({}, { get: (o, f) => (typeof f === 'string' ? (o[f] || (o[f] = new Uint8Array(fs.readFileSync(new URL(f, root))))) : undefined) });
const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: ['index-provincie.json'] });
const map = T.world;
PW.initProvince({ index: T.index, world: map });
map.tileQueue.run(1e9);

let n = 0, bad = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FAIL ' + m); } };

const dropped = map.droppedBuildings || 0;
console.log(`world_misplaced_test: ${dropped} gebouwen bij het laden weggelaten`);
ok(dropped > 0, 'de tegelwereld liet gebouwen op een weg of in water weg');

let onRoad = 0, inWater = 0, stillDropped = 0, bTotal = 0;
// alleen de gestreamde tegels (rij-id's vanaf 1e7); de vaste stad (pinned) is een eigen bron en blijft zoals hij is
const streamed = (kind) => [...map._res[kind]].filter(([gid]) => gid >= 1e7).map(([, e]) => e.obj);
for (const b of streamed('buildings')) {
  bTotal++;
  if (b.dropped) { if (map.buildingGrid.query(b.bounds[0], b.bounds[1], b.bounds[2], b.bounds[3]).includes(b)) stillDropped++; continue; }
  const m = PF.misplacedBuilding(map, b);
  if (m === 'weg') { onRoad++; if (process.env.GDE_LIJST) console.log('  weg', b.type, Math.round(b.bounds[0]), Math.round(b.bounds[1]), b.tile, b.gid); } else if (m === 'water') inWater++;
}
ok(stillDropped === 0, `geen weggelaten gebouw staat nog in het raster (${stillDropped})`);
ok(onRoad === 0, `geen klein ongenoemd gebouw op een rijbaan in het raster (${onRoad})`);
ok(inWater === 0, `geen ongenoemd gebouw in water in het raster (${inWater})`);

let tw = 0, tb = 0, trees = 0;
for (const t of streamed('trees')) {
  trees++;
  if (!map.treeGrid.query(t[0], t[1], t[0], t[1]).includes(t)) continue; // door de opruiming weggehaald
  if (PF.waterDistance(map, t[0], t[1], 0.5) === 0) { tw++; if (process.env.GDE_LIJST) console.log('  boom in water', Math.round(t[0]), Math.round(t[1])); } else if (PF.inBuildingAt(map, t[0], t[1])) { tb++; if (process.env.GDE_LIJST) console.log('  boom in gebouw', Math.round(t[0]), Math.round(t[1])); }
}
console.log(`world_misplaced_test: ${bTotal} gestreamde gebouwen en ${trees} bomen`);
ok(tw === 0, `geen boom in water in het raster (${tw})`);
ok(tb === 0, `geen boom in een gebouw in het raster (${tb})`);

// pure regel
const sq = (x, y, s) => [[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]];
const roadMap = { roadsNear: () => [{ cat: 'minor', width: 4, pts: [[-50, 0], [50, 0]], bounds: [-50, 0, 50, 0] }], waterNear: () => [], buildingsNear: () => [] };
ok(PF.misplacedBuilding(roadMap, { type: 'shed', pts: sq(-1, -1, 2) }) === 'weg', 'een schuur op de rijbaan valt weg');
ok(PF.misplacedBuilding(roadMap, { type: 'shed', name: 'Depot', pts: sq(-1, -1, 2) }) === null, 'een genoemd gebouw blijft');
ok(PF.misplacedBuilding(roadMap, { type: 'yes', pts: sq(-20, -20, 40) }) === null, 'een groot gebouw met een weg erdoor blijft (poort)');
ok(PF.misplacedBuilding(roadMap, { type: 'yes', pts: sq(-1, 8, 2) }) === null, 'een gebouw naast de weg blijft');
ok(PF.misplacedBuilding(roadMap, { type: 'roof', pts: sq(-1, -1, 2) }) === null, 'een overkapping blijft');

if (bad) { console.log(`world_misplaced_test: ${bad} van ${n} checks rood`); process.exit(1); }
console.log(`world_misplaced_test: ${n} checks groen`);
