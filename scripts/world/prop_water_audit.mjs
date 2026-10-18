// Countryside props in open water (issue #185): the polder's fences, hedges, reeds and
// field banks (countryside.js) are generated from a hash grid that knows nothing of the
// tiles; the tiles' water must keep them out (provinceworld.js realBlockedAt). This puts
// the real tiles round a spot into a map, generates the countryside tiles there and counts
// the props that stand in a water polygon.
//   node scripts/world/prop_water_audit.mjs [--strict] [x,y ...]      (default: the three spots of #185)
//   --naive   the old rule (water of the flat grid only), to see what the audit catches
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import '../node3d.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const G = await import('../../game/js/gdt.js');
const PW = await import('../../game/js/provinceworld.js');
const CE = await import('../../game/js/countryedge.js');
const CF = await import('../../game/js/countryfield.js');
const CS = await import('../../game/js/countryside.js');
const { waterIndex } = await import('./placement_audit.mjs');

export const SPOTS = [[-14063, -10231], [-4824, -9421], [17422, -26552]];
export const PROP_KINDS = ['post', 'wire', 'hedge', 'reed', 'bank', 'rush', 'gate'];
// what --strict allows: props whose centre lies in a water polygon
export const MAX_IN_WATER = 0;

const bounds = (P) => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const p of P) { if (p[0] < a) a = p[0]; if (p[0] > c) c = p[0]; if (p[1] < b) b = p[1]; if (p[1] > d) d = p[1]; } return [a, b, c, d]; };

function loadTiles(out, index, keys) {
  const fds = new Map();
  const res = new Map();
  for (const k of keys) {
    const t = index.tiles[k];
    if (!t) continue;
    const f = index.packs[t.pack].file;
    if (!fds.has(f)) fds.set(f, fs.openSync(path.join(out, f), 'r'));
    const buf = Buffer.alloc(t.len);
    fs.readSync(fds.get(f), buf, 0, t.len, t.off);
    const blob = G.decodeBlob(new Uint8Array(zlib.inflateRawSync(buf)));
    const rows = (ty) => ((blob.sections.find((s) => s.type === ty) || { rows: [] }).rows).filter((r) => r.pts && r.pts.length > 1).map((r) => ({ ...r, bounds: bounds(r.pts) }));
    res.set(k, { buildings: rows(G.SECTION.BUILDINGS), roads: rows(G.SECTION.ROADS), water: rows(G.SECTION.WATER) });
  }
  for (const fd of fds.values()) fs.closeSync(fd);
  return res;
}

// a map shaped like TileWorld for realBlockedAt: the rows of the tiles that are in
function mapOf(tiles, naive) {
  const all = (kind) => [...tiles.values()].flatMap((t) => t[kind]);
  const near = (list) => (x, y, r) => list.filter((o) => x >= o.bounds[0] - r && x <= o.bounds[2] + r && y >= o.bounds[1] - r && y <= o.bounds[3] + r);
  const water = all('water');
  return {
    resident: null, // set by the caller from the tile indices
    buildingsNear: near(all('buildings')), roadsNear: near(all('roads')),
    // the TileWorld puts an annotated row (nav) into the water grid and only an older flat one into the flat grid
    waterNear: naive ? () => [] : near(water.filter((w) => w.nav !== undefined)),
    flatWaterNear: near(water.filter((w) => w.nav === undefined)),
    all: water,
  };
}

export function auditSpot(out, index, [x, y], { naive = false, radius = 480 } = {}) {
  const [ci, cj] = G.tileIndexOf(x, y);
  const keys = [];
  for (let i = ci - 2; i <= ci + 2; i++) for (let j = cj - 2; j <= cj + 2; j++) keys.push(G.tileKey(i, j));
  const tiles = loadTiles(out, index, keys);
  const map = mapOf(tiles, naive);
  map.resident = new Set([...tiles.keys()].map((k) => `${index.tiles[k].i},${index.tiles[k].j}`));
  const idx = index.tiles;
  const isTile = (k) => (idx[k] && idx[k].flags & PW.PFLAG.PROVINCE ? idx[k] : null);
  // the blocks the tiles cover, as initProvince makes them
  const B = PW.provinceBlocksOf(Object.keys(idx).filter(isTile), isTile);
  CF.setProvinceBlocks(B ? { x0: B.x0, y0: B.y0, w: B.w, h: B.h, data: B.data } : null);
  // the countryside takes over outside the city's map: the audit's spots are all outside it
  CF.setCountryBounds([-2000, -2000, 2000, 2000]);
  CE.setExtraBlocked((px, py, m) => PW.realBlockedAt(map, isTile, px, py, m));
  const wet = waterIndex(map.all);
  const counts = {};
  const examples = [];
  const T = 160;
  for (let tx = Math.floor((x - radius) / T); tx <= Math.floor((x + radius) / T); tx++) {
    for (let ty = Math.floor((y - radius) / T); ty <= Math.floor((y + radius) / T); ty++) {
      const tile = CS.countryTileItems(tx, ty);
      for (const k of PROP_KINDS) {
        const m = tile.items[k] && tile.items[k].m;
        // the matrices of the instances, 16 numbers each: the position is elements 12 and 14
        for (let q = 0; m && q < m.length; q += 16) {
          const px = m[q + 12], py = m[q + 14];
          const c = counts[k] || (counts[k] = { n: 0, wet: 0 });
          c.n++;
          if (wet(px, py)) { c.wet++; if (examples.length < 5) examples.push([k, Math.round(px), Math.round(py)]); }
        }
      }
    }
  }
  CE.setExtraBlocked(null);
  CF.setProvinceBlocks(null);
  const inWater = Object.values(counts).reduce((t, c) => t + c.wet, 0);
  return { at: [x, y], counts, inWater, examples };
}

async function main() {
  const args = process.argv.slice(2);
  const spots = args.filter((a) => /^-?\d+,-?\d+$/.test(a)).map((a) => a.split(',').map(Number));
  const out = path.join(ROOT, 'game/world');
  const file = path.join(out, 'index-provincie.json');
  if (!fs.existsSync(file)) { console.log('no province layer in game/world: run cd desktop && npm run stage'); return; }
  const index = JSON.parse(fs.readFileSync(file, 'utf8'));
  let bad = 0;
  for (const s of spots.length ? spots : SPOTS) {
    const r = auditSpot(out, index, s, { naive: args.includes('--naive') });
    console.log(`${s}: ${Object.entries(r.counts).map(([k, c]) => `${k} ${c.wet}/${c.n}`).join(', ')}  in water: ${r.inWater}  ${JSON.stringify(r.examples)}`);
    bad += r.inWater;
  }
  if (args.includes('--strict') && bad > MAX_IN_WATER) process.exit(1);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main();
