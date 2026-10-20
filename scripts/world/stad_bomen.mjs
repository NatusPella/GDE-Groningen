// De soort en hoogte van de getekende bomen van de oude stad (citymap.json) als patchlijst voor de OSM-bomen van de stad (#90).
//   node scripts/world/stad_bomen.mjs        schrijft scripts/world/stad_bomen.json
// De tegelbouw kiest de soort van een OSM-boom met de regels van greenery.js (willekeurig per plek en rij); de oude stad had ze
// eenmalig toegekend (greenery.mjs plant), met een rij kers op de Vismarkt, lindes langs de straten, een eigen mix per plek. Alleen
// de bomen die OSM zelf tekent (geen vulling van een bos): [x, y, soort, hoogte (dm), vlaggen]. stad_na.mjs (treeSpecies) legt ze op
// de OSM-boom op dezelfde plek (binnen 0,5 m). Draai dit niet opnieuw als citymap.json weg is: het bestand is dan de bron.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCitymap } from './stad_split.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FILL = (await import('../../game/js/greenery.js')).TREE_FLAG.fill;
const { data } = await readCitymap();
const out = data.trees.filter((t) => !(t[4] & FILL) && t.length >= 5).map((t) => [t[0], t[1], t[2], t[3], t[4] || 0]);
out.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
fs.writeFileSync(path.join(ROOT, 'scripts/world/stad_bomen.json'), JSON.stringify(out) + '\n');
console.log(`${out.length} getekende bomen van de oude stad > scripts/world/stad_bomen.json`);
