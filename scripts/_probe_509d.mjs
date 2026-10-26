// #509: wat geeft elevWallContact met band 1,4 op de botsplekken, en welke wand is dat?
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

for (const [x, y] of [[-610, -1154], [-614, -1147], [-604, -1142], [-587, -1143], [-595, -1138], [-591, -1137]]) {
  const h14 = E.elevWallContact(elev, x, y, 0, 1.4);
  const h035 = E.elevWallContact(elev, x, y, 0, 0.35);
  const lijst = elev.wallGrid.at(x, y) || [];
  console.log(`(${x},${y}): band 1,4 -> ${h14 ? `RAAK diepte ${h14.depth.toFixed(2)}` : 'vrij'}; band 0,35 -> ${h035 ? 'RAAK' : 'vrij'}; ${lijst.length} wanden in het raster`);
  for (const w of lijst) console.log(`    ${w.kind}${w.low ? '(low)' : ''} z=${w.z != null ? w.z.toFixed(2) : '?'} top=${w.top != null ? w.top.toFixed(2) : '-'} fence=${!!w.fence} over=${w.over != null ? w.over : '-'} van (${Math.round(w.ax)},${Math.round(w.ay)}) naar (${Math.round(w.bx)},${Math.round(w.by)})`);
}
