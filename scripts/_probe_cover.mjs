// Reproduceert cityCoverOf() zoals build_province het doet (#506)
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(ROOT);
await import('./node3d.mjs');
console.error('1 node3d klaar');
const BP = await import('./world/build_province.mjs');
console.error('2 build_province geimporteerd');
const P = await import('./world/pack_tiles.mjs');
const { cityCoverFromMask } = await import('./world/citycover.mjs');
const { data, mask } = P.readStad();
const cover = cityCoverFromMask(mask);
console.error('3 stad gelezen, cover ok:', typeof cover.inside === 'function');
const t0 = Date.now();
const stad = await P.loadCityDataLaag();
console.error('4 lagen klaar in', Date.now() - t0, 'ms; rails', (stad.data.rails || []).length);
