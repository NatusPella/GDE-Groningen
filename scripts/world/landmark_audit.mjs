// Landmark audit (issue #164): how many buildings of the built tiles one of
// the everyday kits (landmarkkit.js kitItemFromBuilding: farm, silo, factory,
// flat, school, station, town hall, museum) makes recognisable, by kit, and
// what the buildings by type are.
//
//   node scripts/world/landmark_audit.mjs [dir]    the built tiles (default game/world, the province layer)
//   node scripts/world/landmark_audit.mjs --list   also name the named ones
//   node scripts/world/landmark_audit.mjs --strict exit 1 when a kit has no building at all or geometry has NaN
//
// Needs the built province layer (cd desktop && npm run stage, or
// node scripts/world/build_province.mjs).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const dirArg = args.find((a) => !a.startsWith('--'));
const out = path.resolve(ROOT, dirArg || 'game/world');

await import('../node3d.mjs');
const G = await import('../../game/js/gdt.js');
const K = await import('../../game/js/landmarkkit.js');

const file = path.join(out, 'index-provincie.json');
if (!fs.existsSync(file)) {
  console.log(`no province layer in ${path.relative(ROOT, out)}: run scripts/world/build_province.mjs (or cd desktop && npm run stage)`);
  process.exit(0);
}
const index = JSON.parse(fs.readFileSync(file, 'utf8'));
const fds = new Map();
const byType = {}, byKit = {}, named = [], bad = [];
let total = 0;
for (const t of Object.values(index.tiles)) {
  const f = index.packs[t.pack].file;
  if (!fds.has(f)) fds.set(f, fs.openSync(path.join(out, f), 'r'));
  const buf = Buffer.alloc(t.len);
  fs.readSync(fds.get(f), buf, 0, t.len, t.off);
  const blob = G.decodeBlob(new Uint8Array(zlib.inflateRawSync(buf)));
  for (const s of blob.sections) {
    if (s.type !== G.SECTION.BUILDINGS) continue;
    for (const b of s.rows) {
      total++;
      byType[b.type] = (byType[b.type] || 0) + 1;
      const item = K.kitItemFromBuilding(b);
      if (!item) continue;
      const p = K.landmarkParams(item);
      if (!p) continue;
      const key = p.kit === 'hall' || p.kit === 'industry' ? `${p.kit}:${p.type}` : p.kit === 'farm' ? `farm:${p.type}` : p.kit;
      byKit[key] = (byKit[key] || 0) + 1;
      if (item.n) named.push(`${key} ${item.n}`);
      // a sample per kit through the geometry: finite
      if ((byKit[key] - 1) % 25 === 0) {
        const pos = K.landmarkGeometry({ ...p }, K.LOD_FULL).geometry.attributes.position.array;
        if (!pos.every(Number.isFinite)) bad.push(`${key} ${item.n || b.gid}`);
      }
    }
  }
}
for (const fd of fds.values()) fs.closeSync(fd);

const recog = Object.values(byKit).reduce((a, b) => a + b, 0);
console.log(`${total} buildings; ${recog} (${((recog / total) * 100).toFixed(2)} %) get a kit:`);
for (const [k, n] of Object.entries(byKit).sort()) console.log(`  ${k.padEnd(22)} ${n}`);
const top = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, n]) => `${k} ${n}`).join(', ');
console.log(`by type: ${top}`);
if (args.includes('--list')) for (const n of named.slice(0, 200)) console.log('  ' + n);
if (bad.length) console.log('NaN in:', bad.join(', '));
if (args.includes('--strict') && (bad.length || !recog)) process.exit(1);
