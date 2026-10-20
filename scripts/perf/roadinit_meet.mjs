// Times the worker's roadInit (geokernels.js) in node, stage by stage, on a staged build's tiles:
//   node scripts/perf/roadinit_meet.mjs [<map dir, default desktop/build/game>]
import './../node3d.mjs';
import fs from 'node:fs';
import path from 'node:path';
const dir = path.resolve(process.argv[2] || 'desktop/build/game', 'world');
const S = await import('../../game/js/tilestore.js');
const TW = await import('../../game/js/tileworld.js');
const MD = await import('../../game/js/mapdata.js');
const RS = await import('../../game/js/roadsurface.js');
const source = {
  requests: 0, bytes: 0,
  async read(file, off, len) { const fd = fs.openSync(path.join(dir, file), 'r'); const b = new Uint8Array(len); fs.readSync(fd, b, 0, len, off); fs.closeSync(fd); return b; },
  async readAll(file) { return new Uint8Array(fs.readFileSync(path.join(dir, file))); },
};
const T = (label, t0) => console.log(label.padEnd(28), (performance.now() - t0).toFixed(0), 'ms');
let t = performance.now();
const tw = await TW.loadTileWorld('world/', { source, pool: false });
T('loadTileWorld', t);
const map = tw.world;
console.log('roads', map.roads.length, 'buildings', map.buildings.length);
// the main thread drops some roads (home.js); simulate 30 dropped
const drop = new Set(map.roads.slice(0, 30));
const keys = map.roads.filter((r) => !drop.has(r)).map(RS.roadKey);
t = performance.now();
const want = new Set(keys);
for (let i = map.roads.length - 1; i >= 0; i--) {
  const r = map.roads[i];
  if (want.has(RS.roadKey(r))) continue;
  map.roads.splice(i, 1);
  for (const arr of map.roadGrid.map.values()) { const j = arr.indexOf(r); if (j >= 0) arr.splice(j, 1); }
}
T('drop roads (30)', t);
t = performance.now(); MD.slimWorkerMap(map); T('slimWorkerMap', t);
t = performance.now(); RS.setRoadNetwork && RS.setRoadNetwork(map); T('setRoadNetwork', t);
t = performance.now(); const by = new Map(map.roads.map((r) => [RS.roadKey(r), r])); T('byKey', t);
