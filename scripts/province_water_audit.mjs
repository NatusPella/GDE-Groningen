// Audit of the province's water (docs/PROVINCIE-PLAN.md 2.11, issue #1) over a
// built province layer: every water row has kind/lv/dp/nav, how much water of
// each kind and boat class there is, the movable bridges, the locks, the
// bridges over water a boat can sail, and the rows cut at a tile edge (those
// get no quay walls: the renderer keeps them flat).
//   node scripts/province_water_audit.mjs [--out game/world] [--strict]
import './node3d.mjs';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const G = await import('../game/js/gdt.js');
const { polyArea, WATER_KINDS } = await import('../game/js/waterlevels.js');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const out = path.resolve(ROOT, args.includes('--out') ? args[args.indexOf('--out') + 1] : 'game/world');
const file = path.join(out, 'index-provincie.json');
if (!fs.existsSync(file)) { console.log(`no province layer in ${path.relative(ROOT, out)}: run scripts/world/build_province.mjs`); process.exit(0); }
const index = JSON.parse(fs.readFileSync(file, 'utf8'));

const fds = new Map();
const readTile = (t) => {
  const f = index.packs[t.pack].file;
  if (!fds.has(f)) fds.set(f, fs.openSync(path.join(out, f), 'r'));
  const buf = Buffer.alloc(t.len);
  fs.readSync(fds.get(f), buf, 0, t.len, t.off);
  return G.decodeBlob(new Uint8Array(zlib.inflateRawSync(buf)));
};

const kinds = {}, classes = [0, 0, 0, 0, 0], banks = { kade: 0, oever: 0 };
let rows = 0, missing = 0, edge = 0, packEdge = 0, bridges = 0, movable = 0, navBridges = 0, tilesWithWater = 0, areaM2 = 0;
const bodies = new Set();
for (const t of Object.values(index.tiles)) {
  const blob = readTile(t);
  const [ox, oy] = G.tileOrigin(t.i, t.j);
  const water = (blob.sections.find((s) => s.type === G.SECTION.WATER) || { rows: [] }).rows;
  const roads = (blob.sections.find((s) => s.type === G.SECTION.ROADS) || { rows: [] }).rows;
  if (water.length) tilesWithWater++;
  const onEdge = (p) => p[0] - ox < 0.05 || p[0] - ox > G.TILE_M - 0.05 || p[1] - oy < 0.05 || p[1] - oy > G.TILE_M - 0.05;
  const onPackEdge = (p) => { const e = G.TILE_M * 8, a = (p[0] - 330) % e, b = (p[1] - 75) % e; return Math.min(a, e - a, ((b % e) + e) % e, e - (((b % e) + e) % e)) < 0.05; };
  for (const w of water) {
    rows++;
    if (w.kind === undefined || w.lv === undefined || w.dp === undefined || w.nav === undefined) { missing++; continue; }
    kinds[w.kind] = (kinds[w.kind] || 0) + 1;
    classes[w.nav]++;
    if (w.bank) banks[w.bank]++;
    areaM2 += polyArea(w.pts);
    bodies.add(`${t.pack}:${w.body}`);
    if (w.nav >= 2 && w.pts.some(onEdge)) edge++;
    if (w.pts.some(onPackEdge)) packEdge++;
  }
  for (const r of roads) {
    if (!r.bridge) continue;
    bridges++;
    if (r.movable) movable++;
    const [x, y] = r.pts[Math.floor(r.pts.length / 2)];
    if (water.some((w) => w.nav >= 2 && w.pts.some((p) => Math.hypot(p[0] - x, p[1] - y) < 25))) navBridges++;
  }
}
const locks = (index.global && index.global.locks) || [];
console.log(`province water: ${rows} polygons in ${tilesWithWater} tiles, ${bodies.size} bodies, ${(areaM2 / 1e6).toFixed(1)} km2`);
console.log(`  kinds ${Object.entries(kinds).map(([k, v]) => `${k} ${v}`).join(', ')} (levels: ${Object.entries(WATER_KINDS).map(([k, v]) => `${k} ${v.level ?? 'boezem'}`).join(', ')})`);
console.log(`  boat classes 0-4: ${classes.join(' / ')}; banks: ${banks.kade} quay, ${banks.oever} natural`);
console.log(`  ${bridges} bridge pieces (${navBridges} near sailable water, ${movable} movable), ${locks.length} locks, ${edge} sailable rows cut at a tile edge, ${packEdge} touching a pack edge`);
let bad = missing;
if (missing) console.log(`FAIL ${missing} water rows without kind/lv/dp/nav`);
process.exit(bad && args.includes('--strict') ? 1 : 0);
