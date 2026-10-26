// #509: is de straat bij het Noorderstation overdekt (rijdt de auto onder een dek)?
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(ROOT);
await import('./node3d.mjs');
const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
const E = await import('../game/js/elevation.js');
const { loadCityData } = await import('./lib/loadworld.mjs');
const data = await loadCityData();
applyMapExtras(data);
const map = new GameMap(data);
const elev = map.elev;
console.log('coveredAt bestaat:', typeof E.coveredAt, '| ceilingAt:', typeof E.ceilingAt);
for (const [x, y] of [[-610, -1154], [-614, -1147], [-604, -1142], [-587, -1143]]) {
  const cov = E.coveredAt ? E.coveredAt(elev, x, y, 0) : null;
  const ceil = E.ceilingAt ? E.ceilingAt(elev, x, y, 0) : null;
  console.log(`(${x},${y}): coveredAt(z=0)=${cov} ceilingAt=${ceil && JSON.stringify(ceil)}`);
}
