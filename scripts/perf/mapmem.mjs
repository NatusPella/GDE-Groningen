// Heap of the geometry worker's copy of the city map, in Node (same V8):
// the map as loadMap builds it, and after slimWorkerMap. Three rounds.
//   node --expose-gc scripts/perf/mapmem.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameMap, applyMapExtras, slimWorkerMap } from '../../game/js/mapdata.js';

const GAME = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'game');
const MB = (n) => Math.round(n / 1048576 * 10) / 10;
const heap = () => { for (let i = 0; i < 4; i++) global.gc(); return process.memoryUsage().heapUsed; };
const { loadCityData } = await import('../lib/loadworld.mjs');
const read = (f) => JSON.parse(fs.readFileSync(path.join(GAME, f), 'utf8'));

const out = { fullMB: [], slimMB: [] };
for (let k = 0; k < 3; k++) {
  const h0 = heap();
  let data = await loadCityData();
  let map = new GameMap(data);
  data = null;
  out.fullMB.push(MB(heap() - h0));
  slimWorkerMap(map);
  out.slimMB.push(MB(heap() - h0));
  map = null;
}
console.log(JSON.stringify(out));
