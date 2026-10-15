// Packs the current map into .gdt tiles (F0, docs/PROVINCIE-PLAN.md 2.1).
//   node scripts/world/pack_tiles.mjs [--out game/world] [--check]
//
// In: game/citymap.json + mapextras.json (through the same GameMap the game
// uses, so everything it works out at load - doubled footprints, canopies,
// moored houseboats, roof steps, ways cut at a wall, dry crossings, trees off
// the carriageway - is done here once) and game/ommeland.json + .bin.
// Out: game/world/index.json, packs of 8 x 8 tiles (<pack>-<hash>.gdp) and
// one global blob. Each object keeps its place in the GameMap's arrays as
// `gid`, and is written into every tile its bounds touch, so a tile answers
// every query inside it on its own; the game keeps one copy per gid.
// Same input, same bytes (tested by scripts/world_tiles_test.mjs).
import '../node3d.mjs';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { GameMap, applyMapExtras } = await import('../../game/js/mapdata.js');
const G = await import('../../game/js/gdt.js');
const { polygonBounds } = await import('../../game/js/util.js');

export const BUILDER = 1;
export const PACK_TILES = 8;
// margin round an object's bounds when it is put in tiles (a road's ribbon,
// a rail's ballast)
const MARGIN = { roads: (r) => (r.width || 4) / 2 + 2, rails: () => 3 };

// keys that are worked out again when a tile is loaded
const DROP = new Set(['bounds', 'rooms']);
export function cleanRow(o) {
  const out = {};
  for (const k in o) if (!DROP.has(k) && k[0] !== '_' && o[k] !== undefined) out[k] = o[k];
  return out;
}

export function loadSources(game = path.join(ROOT, 'game')) {
  const data = JSON.parse(fs.readFileSync(path.join(game, 'citymap.json'), 'utf8'));
  applyMapExtras(data, JSON.parse(fs.readFileSync(path.join(game, 'mapextras.json'), 'utf8')));
  const map = new GameMap(data);
  const om = JSON.parse(fs.readFileSync(path.join(game, 'ommeland.json'), 'utf8'));
  const bin = zlib.gunzipSync(fs.readFileSync(path.join(game, 'ommeland.bin')));
  return { map, om, bin };
}

// the per-tile kinds, in the order the GameMap keeps them
export const KINDS = [
  ['buildings', G.SECTION.BUILDINGS],
  ['roads', G.SECTION.ROADS],
  ['water', G.SECTION.WATER],
  ['green', G.SECTION.GREEN],
  ['trees', G.SECTION.TREES],
  ['rails', G.SECTION.RAILS],
  ['canopies', G.SECTION.CANOPIES],
  ['passageWays', G.SECTION.PASSAGES],
];

function boundsOf(kind, o) {
  if (kind === 'trees') return [o[0], o[1], o[0], o[1]];
  const b = polygonBounds(o.pts);
  const m = MARGIN[kind] ? MARGIN[kind](o) : 0;
  return [b[0] - m, b[1] - m, b[2] + m, b[3] + m];
}

export function tilesOf(bounds) {
  const [i0, j0] = G.tileIndexOf(bounds[0], bounds[1]);
  const [i1, j1] = G.tileIndexOf(bounds[2], bounds[3]);
  const out = [];
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) out.push([i, j]);
  return out;
}

export function build({ map, om, bin }) {
  const tiles = new Map();
  const tileOf = (i, j) => {
    const k = G.tileKey(i, j);
    let t = tiles.get(k);
    if (!t) tiles.set(k, (t = { i, j, key: k, kinds: {} }));
    return t;
  };
  const counts = {};
  for (const [kind] of KINDS) {
    const list = map[kind] || [];
    counts[kind] = list.length;
    list.forEach((o, gid) => {
      for (const [i, j] of tilesOf(boundsOf(kind, o))) {
        const t = tileOf(i, j);
        (t.kinds[kind] || (t.kinds[kind] = [])).push(kind === 'trees' ? { g: gid, p: [[o[0], o[1]]] } : { gid, ...cleanRow(o) });
      }
    });
  }
  const blobs = new Map();
  for (const t of [...tiles.values()].sort((a, b) => a.i - b.i || a.j - b.j)) {
    const sections = KINDS.filter(([kind]) => t.kinds[kind]).map(([kind, type]) => ({ type, rows: t.kinds[kind] }));
    const maxH = Math.max(0, ...(t.kinds.buildings || []).map((b) => b.h || 0));
    const n = Object.fromEntries(KINDS.filter(([k]) => t.kinds[k]).map(([k]) => [k, t.kinds[k].length]));
    blobs.set(t.key, { i: t.i, j: t.j, flags: 1, bytes: G.encodeBlob({ i: t.i, j: t.j, flags: 1, builder: BUILDER, sections }), n, maxH });
  }
  // the global layer: what every system needs everywhere until F1 gives it a tile home
  const byGid = (kind) => new Map((map[kind] || []).map((o, g) => [o, g]));
  const bGid = byGid('buildings');
  const clipped = (map.clippedWays || []).map((c) => ({ road: cleanRow(c.road), building: bGid.has(c.building) ? bGid.get(c.building) : -1, x: c.x, y: c.y, len: c.len }));
  const global = G.encodeBlob({
    builder: BUILDER,
    sections: [
      { type: G.SECTION.META, json: { meta: map.meta, counts, dryCrossings: map.dryCrossings || 0, clippedWays: clipped } },
      { type: G.SECTION.ROADS, version: 1, rows: [] },
      ...['stations', 'levelCrossings', 'railRoutes', 'railLifts'].map((k) => ({ type: G.SECTION.META, json: { [k]: map[k] } })),
      { type: G.SECTION.META, json: { ommeland: om } },
      { type: G.SECTION.BLOB, name: 'ommeland.bin', bytes: new Uint8Array(bin) },
    ],
  });
  return { blobs, global, counts };
}

const deflate = (b) => new Uint8Array(zlib.deflateRawSync(b, { level: 9 }));

export function writeWorld(out, { blobs, global, counts }, citySet = null) {
  fs.mkdirSync(out, { recursive: true });
  for (const f of fs.readdirSync(out)) if (f.endsWith('.gdp') || f === 'index.json') fs.rmSync(path.join(out, f));
  const packs = new Map();
  for (const [key, b] of blobs) {
    const pk = `p${Math.floor(b.i / PACK_TILES)}_${Math.floor(b.j / PACK_TILES)}`;
    (packs.get(pk) || packs.set(pk, []).get(pk)).push([key, b]);
  }
  const index = { format: G.GDT_FORMAT, builder: BUILDER, frame: 'rd-new', tileM: G.TILE_M, grid: [G.GRID_X0, G.GRID_Y0], rdTile0: [G.RD_TILE_X0, G.RD_TILE_Y0], counts, packs: {}, tiles: {}, global: null, pins: {} };
  const writePack = (name, entries) => {
    const parts = [];
    let off = 0;
    const meta = [];
    for (const [key, b] of entries) {
      const z = deflate(b.bytes);
      parts.push(z);
      meta.push([key, { off, len: z.length, raw: b.bytes.length, hash: G.hash64(b.bytes), b }]);
      off += z.length;
    }
    const all = new Uint8Array(off);
    let o = 0;
    for (const p of parts) { all.set(p, o); o += p.length; }
    const file = `${name}-${G.hash64(all).slice(0, 12)}.gdp`;
    fs.writeFileSync(path.join(out, file), all);
    index.packs[name] = { file, size: all.length };
    return meta;
  };
  for (const name of [...packs.keys()].sort()) {
    for (const [key, m] of writePack(name, packs.get(name))) {
      index.tiles[key] = { i: m.b.i, j: m.b.j, pack: name, off: m.off, len: m.len, raw: m.raw, hash: m.hash, flags: m.b.flags, n: m.b.n, maxH: m.b.maxH };
    }
  }
  const [[, g]] = writePack('global', [['global', { bytes: global, i: 0, j: 0, flags: 0, n: {} }]]);
  index.global = { pack: 'global', off: g.off, len: g.len, raw: g.raw, hash: g.hash };
  if (citySet) {
    index.pins.city = {
      tiles: [...citySet].sort(),
      // until F1 these systems read whole arrays (map.roads, map.buildings, ...):
      // routing, the minimap and big map, far LOD, water and terrain meshes,
      // traffic lights, passages, home.js; the city stays resident for them
      reason: 'whole-map consumers (F1)',
    };
  }
  const json = JSON.stringify(index);
  fs.writeFileSync(path.join(out, 'index.json'), json);
  return index;
}

async function main() {
  const args = process.argv.slice(2);
  const out = path.resolve(ROOT, args.includes('--out') ? args[args.indexOf('--out') + 1] : 'game/world');
  const t0 = performance.now();
  const src = loadSources();
  const t1 = performance.now();
  const built = build(src);
  const city = new Set(built.blobs.keys());
  const index = writeWorld(out, built, city);
  const t2 = performance.now();
  const size = Object.values(index.packs).reduce((a, p) => a + p.size, 0);
  const raw = Object.values(index.tiles).reduce((a, t) => a + t.raw, 0) + index.global.raw;
  console.log(`${Object.keys(index.tiles).length} tiles in ${Object.keys(index.packs).length} packs, ${(size / 1e6).toFixed(2)} MB (${(raw / 1e6).toFixed(2)} MB raw), index ${(fs.statSync(path.join(out, 'index.json')).size / 1e3).toFixed(0)} kB`);
  console.log(`load + derive ${((t1 - t0) / 1000).toFixed(1)} s, tile + pack ${((t2 - t1) / 1000).toFixed(1)} s -> ${path.relative(ROOT, out)}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main();
