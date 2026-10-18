// Audit of the sea for boats (#233): OSM only has the coastline, so the Wadden,
// the Eems and the Dollard have no water polygon of their own, and a boat's
// shore test (waterindex.js waterClearance) calls every metre of open sea land.
// This takes the sea as the regions see it (the coast chains closed round the
// north, within the world edge's seaM past the coast) and asks, per sample,
// whether the streamed water rows (the province's tile water plus the water
// patches of vaarnet_fixes.json) hold water there; where not, a boat would be
// stopped by a wall that is no land.
//   node scripts/boat_sea_audit.mjs [--world <dir with index-provincie.json>] [--step 100] [--strict]
// Without --world it looks in game/world, then in the main checkout's.
// Read-only: it opens the tile packs and writes nothing.
import './node3d.mjs';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const G = await import('../game/js/gdt.js');
const { waterClearance } = await import('../game/js/waterindex.js');
const { setRegionData, seaRing, seaAt, regionAt } = await import('../game/js/regions.js');
const { outsideDist, coastKinds } = await import('../game/js/worldedge.js');
const { patchRows } = await import('../game/js/vaarnet.js');

export function findWorld(arg) {
  const cands = [arg, path.join(ROOT, 'game/world')];
  // a worktree has no game/world: the main checkout's (read only)
  const m = ROOT.split(/[\\/]\.claude[\\/]worktrees[\\/]/)[0];
  if (m !== ROOT) cands.push(path.join(m, 'game/world'));
  return cands.find((d) => d && fs.existsSync(path.join(d, 'index-provincie.json'))) || null;
}

// every water row of the province's tiles, plus the vaarnet_fixes patches
export function loadWater(dir) {
  const index = JSON.parse(fs.readFileSync(path.join(dir, 'index-provincie.json'), 'utf8'));
  const fds = new Map();
  const rows = [];
  for (const t of Object.values(index.tiles)) {
    const f = index.packs[t.pack].file;
    if (!fds.has(f)) fds.set(f, fs.openSync(path.join(dir, f), 'r'));
    const buf = Buffer.alloc(t.len);
    fs.readSync(fds.get(f), buf, 0, t.len, t.off);
    const blob = G.decodeBlob(new Uint8Array(zlib.inflateRawSync(buf)));
    const sec = blob.sections.find((s) => s.type === G.SECTION.WATER);
    if (sec) for (const w of sec.rows) rows.push(w);
  }
  for (const fd of fds.values()) fs.closeSync(fd);
  return { index, rows };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
  const dir = findWorld(opt('--world', null) && path.resolve(opt('--world')));
  if (!dir) { console.log('SKIP no province layer (game/world/index-provincie.json)'); process.exit(0); }
  const step = Number(opt('--step', 200));
  const { index, rows } = loadWater(dir);
  const edge = coastKinds(index.global.edge);
  setRegionData(index.global);
  const fixes = JSON.parse(fs.readFileSync(path.join(ROOT, 'game/vaarnet_fixes.json'), 'utf8'));
  const patches = patchRows(fixes);
  // the map as the shore test sees it: water rows only (waterindex.js waterClearance)
  const map = { water: rows.concat(patches), buildings: [] };
  const BOAT_CLEAR = 1.0; // BOAT_EDGE_CLEAR (util.js): a hull probe nearer a shore is dry
  const seaM = edge.seaM || 3000;

  const ring = seaRing();
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of ring) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  let n = 0, dry = 0;
  const byRegion = {}, cells = [];
  for (let y = y0; y <= y1; y += step) {
    for (let x = x0; x <= x1; x += step) {
      const o = outsideDist(x, y, edge.coast);
      if (!o || o.d <= 0 || o.d > seaM) continue;
      const r = regionAt(x, y);
      if (!r || r.land || !seaAt(x, y)) continue; // a Wadden island, Germany, the coast's far ends: land
      n++;
      const b = byRegion[r.id] || (byRegion[r.id] = { n: 0, dry: 0 });
      b.n++;
      // open sea: 20 m or more off the coast, a probe must have room
      if (o.d > 20 && waterClearance(map, x, y, BOAT_CLEAR + 0.5) < BOAT_CLEAR) { dry++; b.dry++; cells.push([x, y]); }
    }
  }
  console.log(`sea samples (${step} m, within ${seaM} m of the coast): ${n}, a boat would be stopped at ${dry} (${n ? Math.round((100 * dry) / n) : 0}%)`);
  for (const [k, b] of Object.entries(byRegion)) console.log(`  ${k}: ${b.n} samples, ${b.dry} dry`);
  // the dry cells in lumps of 1 km, the biggest first
  const lump = new Map();
  for (const [x, y] of cells) { const k = Math.floor(x / 1000) + ',' + Math.floor(y / 1000); lump.set(k, (lump.get(k) || 0) + 1); }
  const top = [...lump.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  for (const [k, c] of top) console.log(`  1 km block ${k}: ${c} dry samples`);
  // and the other way: no place of the province is sea (the sea polygon closes over the coast chain)
  let wet = 0;
  for (const p of index.global.places || []) {
    if (waterClearance({ water: [], buildings: [] }, p.x, p.y, 2) >= 0) { wet++; console.log(`  place in the sea: ${p.name} (${Math.round(p.x)}, ${Math.round(p.y)})`); }
  }
  if (args.includes('--strict') && (dry || wet)) process.exit(1);
}
