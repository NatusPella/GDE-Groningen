// Height audit (issue #179): the outliers among the built tiles' buildings, before and
// after buildingcap.js: slender ones (height over the footprint's side), walls of
// more than three storeys on a hall or farm footprint, and anything over 16 m that
// is not a block, a church or a tower.
//
//   node scripts/world/height_audit.mjs [dir]     the built tiles (default game/world, the province layer)
//   node scripts/world/height_audit.mjs --strict  exit 1 when an outlier is left after the cap
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const out = path.resolve(ROOT, args.find((a) => !a.startsWith('--')) || 'game/world');
await import('../node3d.mjs');
const G = await import('../../game/js/gdt.js');
const C = await import('../../game/js/buildingcap.js');

const file = path.join(out, 'index-provincie.json');
if (!fs.existsSync(file)) { console.log(`no province layer in ${path.relative(ROOT, out)}: run scripts/world/build_province.mjs (or cd desktop && npm run stage)`); process.exit(0); }
const index = JSON.parse(fs.readFileSync(file, 'utf8'));
const TALL_OK = new Set(['apartments', 'church', 'chapel', 'cathedral', 'tower', 'chimney', 'silo', 'storage_tank', 'mast', 'windmill', 'hotel', 'hospital', 'university', 'college', 'office', 'civic', 'public', 'school', 'data_center', 'castle', 'water_tower', 'commercial', 'retail', 'dormitory']);
const HALLISH = new Set(['house', 'detached', 'bungalow', 'farm', 'farmhouse', 'farm_auxiliary', 'barn', 'stable', 'cowshed', 'livestock', 'outbuilding', 'yes', 'industrial', 'warehouse', 'shed', 'service']);
function outliers(b, area) {
  const kinds = [];
  // a height a mapper wrote down or the 3D BAG measured is a statement about that building, not a guess (buildingcap.js
  // heightLimits, #179): the audit looks for guessed heights that the cap should have trimmed
  if (b.hsrc === 'osm_height' || b.hsrc === 'osm_levels' || b.hsrc === '3dbag') return kinds;
  if (b.hm > 8 && b.hm / Math.sqrt(Math.max(area, 1)) > 2.2 && !['tower', 'chimney', 'silo', 'storage_tank', 'mast', 'windmill', 'church', 'chapel', 'cathedral', 'water_tower', 'lighthouse', 'castle', 'apartments'].includes(b.type) && !(b.hsrc === '3dbag' && b.hm / Math.sqrt(area) > 8)) kinds.push('slender');
  if (HALLISH.has(b.type) && area >= 500 && b.h > 3) kinds.push('hall-with-many-storeys');
  if (b.hm > 16 && !TALL_OK.has(b.type) && !(b.type === 'yes' && b.name)) kinds.push('tall-low-class');
  return kinds;
}
const fds = new Map();
const before = {}, after = {}, samples = [];
let total = 0, changed = 0;
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
      const area = C.ringArea(b.pts);
      for (const k of outliers(b, area)) { before[k] = (before[k] || 0) + 1; if (samples.length < 12) samples.push(`${k} ${b.type} h${b.h} hm${b.hm} ${Math.round(area)} m2`); }
      const c = { ...b };
      C.capBuilding(c);
      if (c.h !== b.h || c.hm !== b.hm) changed++;
      for (const k of outliers(c, area)) after[k] = (after[k] || 0) + 1;
    }
  }
}
for (const fd of fds.values()) fs.closeSync(fd);
const fmt = (o) => Object.entries(o).map(([k, n]) => `${k} ${n}`).join(', ') || 'none';
console.log(`${total} buildings; the cap changes ${changed}`);
console.log(`outliers before: ${fmt(before)}`);
console.log(`outliers after:  ${fmt(after)}`);
for (const s of samples) console.log('  e.g. ' + s);
if (args.includes('--strict') && Object.keys(after).length) process.exit(1);
