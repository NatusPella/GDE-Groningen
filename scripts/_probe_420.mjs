// #420: de H.N. Werkmanbrug — is hij overdekt, en staan er keerwanden op het dek?
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

const bruggen = map.roads.filter((r) => /werkman/i.test(r.name || ''));
console.log('wegen met Werkman in de naam:', bruggen.length);
for (const r of bruggen) {
  console.log(`  ${r.name} ${r.cat} breed ${r.width} bridge ${!!r.bridge} z ${r.z ? 'ja' : 'nee'} punten ${r.pts.length}`);
}
const dek = bruggen.find((r) => r.bridge) || bruggen[0];
if (!dek) { console.log('geen brug gevonden'); process.exit(0); }
const mid = dek.pts[Math.floor(dek.pts.length / 2)];
const zDek = dek.z ? dek.z[Math.floor(dek.z.length / 2)] : 0;
console.log(`\nmidden van het dek: (${Math.round(mid[0])}, ${Math.round(mid[1])}), z=${zDek.toFixed(2)}`);
for (const [dx, dy] of [[0, 0], [5, 0], [-5, 0], [0, 5], [0, -5], [10, 0], [0, 10]]) {
  const x = mid[0] + dx, y = mid[1] + dy;
  const cov = E.coveredAt(elev, x, y, zDek);
  const ceil = E.ceilingAt(elev, x, y, zDek);
  const gz = E.groundHeightAt(elev, x, y, zDek);
  console.log(`  (${Math.round(x)},${Math.round(y)}): covered=${cov} ceiling=${ceil && (ceil.z != null ? ceil.z.toFixed(2) : JSON.stringify(ceil))} grond=${gz && gz.toFixed ? gz.toFixed(2) : gz}`);
}
// keerwanden op het dek
let opDek = 0;
const soorten = new Map();
for (const w of elev.walls) {
  const cx = (w.ax + w.bx) / 2, cy = (w.ay + w.by) / 2;
  if (Math.hypot(cx - mid[0], cy - mid[1]) > 40) continue;
  if (w.z != null && Math.abs(w.z - zDek) < 2) { opDek++; soorten.set(w.kind, (soorten.get(w.kind) || 0) + 1); }
}
console.log(`keerwanden binnen 40 m op de hoogte van het dek: ${opDek} ${JSON.stringify([...soorten])}`);
