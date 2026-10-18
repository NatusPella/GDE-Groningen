// Hoogte-audit per streek (#78): hoe lopen de wegen van het provincie-wegennet over het AHN-terrein?
//   node scripts/world/terrain_streek_audit.mjs [--list] [--json <bestand>]
// Per streek (regioleven.js): wegen, km, p95 en maximale helling, wegen steiler dan 12%, scheuren
// (sprong > 1,5 m tussen twee punten 10 m uiteen: tegelrand, afgesneden dijk, verkeerd gat) en bruggen of
// tunnels waarvan de dekhoogte (deckterrain.js) te steil loopt. Exit 1 bij harde fouten: scheuren buiten
// de bekende dijk-/havengevallen zijn geen fout, alleen een rapport; hard zijn alleen een ontbrekend
// raster en een NaN.
import '../node3d.mjs';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { loadTerrainField } from './terrain.mjs';
import { decodeRoadNet } from '../../game/js/roadgraph.js';
import { streekAt, STREKEN } from '../../game/js/regioleven.js';
import { auditStreken } from '../../game/js/terrainaudit.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const field = loadTerrainField(ROOT);
if (!field.size) { console.log('SKIP geen rasters (python scripts/world/fetch_ahn.py --province --fetch)'); process.exit(0); }
const roadsFile = ['game/world', 'desktop/build/game/world'].map((d) => path.join(ROOT, d, 'provincie-roads.json.gz')).find((f) => fs.existsSync(f));
if (!roadsFile) { console.log('SKIP geen provincie-roads.json.gz'); process.exit(0); }
const rows = decodeRoadNet(JSON.parse(zlib.gunzipSync(fs.readFileSync(roadsFile)).toString()));
// het wegennet kent alleen bruggen; tunnels staan er niet in
const res = auditStreken(rows, field.at, (x, y) => (streekAt(x, y) || {}).id);

let hard = 0;
const order = [...STREKEN.map((s) => s.id), 'overig'];
const f = (v, d = 2) => v.toFixed(d);
console.log('streek         wegen    km  p95 helling  max helling  steil  scheuren  bruggen  brug>8%  max reliëf');
for (const id of order) {
  const r = res[id];
  if (!r) continue;
  if (![r.p95Grade, r.maxGrade, r.maxRange].every(Number.isFinite)) { hard++; console.log(`FAIL ${id}: NaN in de hoogtes`); }
  console.log(`${id.padEnd(14)} ${String(r.roads).padStart(6)} ${String(Math.round(r.km)).padStart(5)}  ${f(r.p95Grade).padStart(10)}  ${f(r.maxGrade).padStart(11)}  ${String(r.steep).padStart(5)}  ${String(r.tears).padStart(8)}  ${String(r.decks).padStart(7)}  ${String(r.deckBad).padStart(7)}  ${f(r.maxRange, 1).padStart(9)} m`);
  if (args.includes('--list')) {
    for (const t of r.tearList.slice(0, 15)) console.log(`   scheur ${f(t.step, 1)} m op ${Math.round(t.x)},${Math.round(t.y)}`);
    for (const t of r.deckBadList.slice(0, 15)) console.log(`   brugdek ${f(t.grade * 100, 1)}% bij ${Math.round(t.x)},${Math.round(t.y)}`);
  }
}
const i = args.indexOf('--json');
if (i >= 0) fs.writeFileSync(args[i + 1], JSON.stringify(res, (k, v) => (k === 'tearList' || k === 'deckBadList' ? undefined : v), 1));
console.log(hard ? `${hard} harde fouten` : 'terrain streek audit ok');
process.exit(hard ? 1 : 0);
