// Waar staan de winkelgevels van een plaats (#422)? Meet op de echte tegels en shopplaces.json, met dezelfde
// bouw als het spel (buildBuildingMesh zet b.shopFront): hoeveel panden krijgen een winkelgevel, en hoe ver
// liggen die van het plaatsmidden (de plaatsknoop van de index) en van het zwaartepunt van de winkels?
//   node scripts/shopfront_audit.mjs [Plaats ...]     (standaard: Delfzijl Appingedam Winschoten Zoutkamp)
// De wereld: GDE_GAME_DIR (de game-map met world/ en shopplaces.json), anders game/ in deze repo.
// Zonder wereld of zonder vendor-cache (cd desktop && npm run stage) slaat het script over.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GAME = process.env.GDE_GAME_DIR || path.join(ROOT, 'game');
const WORLD = path.join(GAME, 'world');
if (!fs.existsSync(path.join(WORLD, 'index-provincie.json')) || !fs.existsSync(path.join(GAME, 'shopplaces.json'))) {
  console.log('SKIP shopfront_audit: geen wereld (zet GDE_GAME_DIR op een game-map met world/ en shopplaces.json)');
  process.exit(0);
}
try { await import('./node3d.mjs'); } catch (e) { console.log('SKIP shopfront_audit: three.js ontbreekt (cd desktop && npm run stage)'); process.exit(0); }
const { decodeBlob, SECTION, tileIndexOf } = await import('../game/js/gdt.js');
const { inflateRaw } = await import('../game/js/tilestore.js');
const { wgsToWorld } = await import('../game/js/rdnew.js');
const { setShopSpots } = await import('../game/js/shopspots.js');
const { SHOP_KINDS } = await import('../game/js/winkelkit.js');
const MB = await import('../game/js/models3d_buildings.js');

const idx = JSON.parse(fs.readFileSync(path.join(WORLD, 'index-provincie.json'), 'utf8'));
const sp = JSON.parse(fs.readFileSync(path.join(GAME, 'shopplaces.json'), 'utf8'));
const names = process.argv.slice(2).length ? process.argv.slice(2) : ['Delfzijl', 'Appingedam', 'Winschoten', 'Zoutkamp'];
const median = (a) => a.slice().sort((p, q) => p - q)[Math.floor(a.length / 2)];
const band = (list, c, R) => list.filter((b) => Math.hypot(b.cx - c[0], b.cy - c[1]) <= R).length;

for (const name of names) {
  const pi = sp.places.indexOf(name);
  const node = idx.global.places.find((z) => z.name === name && z.kind !== 'suburb');
  if (pi < 0 || !node) { console.log(`${name}: niet in shopplaces.json of de index`); continue; }
  const spots = [];
  for (const l of Object.values(sp.tiles)) for (const r of l) if (r[6] === pi) { const [x, y] = wgsToWorld(r[0], r[1]); spots.push({ x, y, type: sp.types[r[2]], name: r[3] }); }
  const kit = spots.filter((s) => SHOP_KINDS.includes(s.type));
  if (!kit.length) { console.log(`${name}: geen winkels in shopplaces.json`); continue; }
  const mid = [median(kit.map((s) => s.x)), median(kit.map((s) => s.y))];
  setShopSpots(spots);
  // de tegels binnen 1,2 km van de winkels en de plaatsknoop
  const keys = new Set();
  for (const [x, y] of [...kit.map((s) => [s.x, s.y]), [node.x, node.y]]) {
    for (const dx of [-1000, 0, 1000]) for (const dy of [-1000, 0, 1000]) { const [i, j] = tileIndexOf(x + dx, y + dy); keys.add((234 + i) + '_' + (581 - j)); }
  }
  const bs = [];
  for (const key of keys) {
    const t = idx.tiles[key];
    if (!t) continue;
    const fd = fs.openSync(path.join(WORLD, idx.packs[t.pack].file), 'r');
    const buf = Buffer.alloc(t.len);
    fs.readSync(fd, buf, 0, t.len, t.off);
    fs.closeSync(fd);
    const sec = decodeBlob(await inflateRaw(new Uint8Array(buf))).sections.find((s) => s.type === SECTION.BUILDINGS);
    for (const b of (sec ? sec.rows : [])) {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const p of b.pts) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
      b.bounds = [x0, y0, x1, y1]; b.cx = (x0 + x1) / 2; b.cy = (y0 + y1) / 2;
      bs.push(b);
    }
  }
  const CELL = 64, grid = new Map();
  for (const b of bs) { const k = Math.floor(b.cx / CELL) + ',' + Math.floor(b.cy / CELL); (grid.get(k) || grid.set(k, []).get(k)).push(b); }
  MB.setBuildingMap({
    buildingsNear: (x, y, r) => { const o = [], c = Math.ceil(r / CELL) + 1; for (let i = -c; i <= c; i++) for (let j = -c; j <= c; j++) { const l = grid.get((Math.floor(x / CELL) + i) + ',' + (Math.floor(y / CELL) + j)); if (l) o.push(...l); } return o; },
    inWaterRaw: () => false, waterNear: () => [], roadsNear: () => [],
  });
  const fronts = [];
  for (const b of bs) {
    if (Math.hypot(b.cx - mid[0], b.cy - mid[1]) > 1500 && Math.hypot(b.cx - node.x, b.cy - node.y) > 1500) continue;
    try { MB.buildBuildingMesh(b); } catch (e) { continue; }
    if (b.shopFront) fronts.push(b);
  }
  const named = fronts.filter((b) => b.shopFront.name);
  console.log(`${name}: ${kit.length} winkels in shopplaces.json, ${fronts.length} winkelgevels (${named.length} met naam)`);
  console.log(`  plaatsknoop ${Math.round(node.x)},${Math.round(node.y)}: gevels binnen 300 m ${band(fronts, [node.x, node.y], 300)}, 700 m ${band(fronts, [node.x, node.y], 700)}, 1200 m ${band(fronts, [node.x, node.y], 1200)}`);
  console.log(`  winkelmidden ${Math.round(mid[0])},${Math.round(mid[1])} (${Math.round(Math.hypot(mid[0] - node.x, mid[1] - node.y))} m van de knoop): gevels binnen 300 m ${band(fronts, mid, 300)}, 700 m ${band(fronts, mid, 700)}`);
}
