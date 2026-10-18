// Randaudit (#6): hoe eindigt de wereld, per rand. Telt de lijnen van de randlaag van het
// provincie-extract (Wad, Eems, Duitsland, Friesland, Drenthe), controleert dat elke rand een
// tekst, een omkeerscène en bouwbare props heeft, en dat er achter de omkeerplek nog kaartdata
// ligt. Schrijft niets; exit 1 bij harde fouten.
//   node scripts/world/randaudit.mjs [--world <map>]    (standaard game/world met index-provincie.json)
import '../node3d.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { coastKinds, borderByData } from '../../game/js/worldedge.js';
import { auditEdge } from '../../game/js/randaudit.js';
import { tileIndexOf, tileKey } from '../../game/js/gdt.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const i = process.argv.indexOf('--world');
const dir = i >= 0 ? path.resolve(process.argv[i + 1]) : path.join(ROOT, 'game/world');
const f = path.join(dir, 'index-provincie.json');
if (!fs.existsSync(f)) { console.log('SKIP geen index-provincie.json in ' + dir); process.exit(0); }
const idx = JSON.parse(fs.readFileSync(f, 'utf8'));
const g = idx.global;
const have = new Set(Object.keys(idx.tiles));
const tileHas = (x, y) => have.has(tileKey(...tileIndexOf(x, y)));
const { EDGE_PROP_KINDS } = await import('../../game/js/ommelandprops3d.js');
const raw = auditEdge(coastKinds(g.edge), { tileHas, propKinds: EDGE_PROP_KINDS, step: 400 });
const edge = borderByData(coastKinds(g.edge), tileHas);
const A = auditEdge(edge, { tileHas, propKinds: EDGE_PROP_KINDS, step: 400 });
console.log(`zonder de data-buffer (vaste 2500 m): ${raw.stats.border.noData} van ${raw.stats.border.backOk} omkeerplekken zonder kaartdata`);
console.log('== Kust (lijnen, km) ==');
for (const [k, v] of Object.entries(A.coast)) console.log(`  ${k.padEnd(10)} ${String(v.n).padStart(3)} lijnen ${String(v.km).padStart(7)} km`);
console.log('== Grens (lijnen, km) ==');
for (const [k, v] of Object.entries(A.border)) console.log(`  ${k.padEnd(10)} ${String(v.n).padStart(3)} lijnen ${String(v.km).padStart(7)} km`);
console.log('== Scènes ==');
for (const [k, v] of Object.entries(A.scenes)) console.log(`  ${k.padEnd(10)} ${v.props} props, regeltekst ${v.text ? 'ja' : 'NEE'}`);
const b = A.stats.border, c = A.stats.coast;
console.log(`grens: ${b.samples} monsters; waarschuwing ${b.warnOk}, omkeren ${b.backOk}, zonder data erachter ${b.noData}, scène-props zonder tegel ${b.plansOutside}`);
console.log(`kust: ${c.samples} monsters; waarschuwing ${c.warnOk}, omkeren ${c.backOk}`);
console.log(`kustzijde: ${A.stats.side.good} goed, ${A.stats.side.wrong} omgekeerd, ${A.stats.side.unsure} onduidelijk (slik, eilandjes)`);
for (const s of A.issues) console.log('FOUT ' + s);
console.log(`${A.issues.length} harde fouten`);
process.exit(A.issues.length ? 1 : 0);
