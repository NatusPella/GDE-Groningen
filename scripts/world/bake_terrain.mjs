#!/usr/bin/env node
// Bakes the stage's terrain ground (game/world/terrain.bin): the arrays that
// terrainArrays() would otherwise build in the geometry worker on every start
// (~2.4 s on the reference machine, more on weak machines) are deterministic in
// the map bounds and the water polygons. The build makes them once; the game
// reads them at boot and falls back to building them itself when the file is
// missing or does not fit the world (tileworld.js).
//
//   node scripts/world/bake_terrain.mjs [--world=<dir>] [--out=<file>] [--quiet]
//   node scripts/world/bake_terrain.mjs --check     (compares with what is there)
//
// The stage calls this after packing the tiles (desktop/build.mjs); with
// GDE_TERRAIN_CACHE=0 it is skipped. The result is deflate-raw (~2.8 MB for the
// city) and is read through the same reader as the tiles.
import '../node3d.mjs';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (name, d) => {
  const eq = process.argv.find((v) => v.startsWith('--' + name + '='));
  if (eq) return eq.slice(name.length + 3);
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d;
};
const WORLD = path.resolve(arg('world', process.env.GDE_WORLD_DIR || path.join(ROOT, 'game', 'world')));
const OUT = path.resolve(arg('out', path.join(WORLD, 'terrain.bin')));
const CHECK = process.argv.includes('--check');
const QUIET = process.argv.includes('--quiet');
const log = (s) => { if (!QUIET) console.log(s); };
const mb = (n) => (n / 1e6).toFixed(1) + ' MB';
const now = () => Number(process.hrtime.bigint() / 1000n) / 1000;

if (!fs.existsSync(path.join(WORLD, 'index.json'))) {
  console.error(`no world in ${WORLD} (index.json is missing); stage first, or pass --world=<dir>`);
  process.exit(2);
}

// The world as the game loads it, but from disk: the same tile source, the same
// extra layers. Read-only; no world places or province setup needed, because the
// terrain depends on the map bounds and the water rows only.
class FsSource {
  constructor(dir) { this.dir = dir; }
  async read(file, off, len) {
    // a plain Uint8Array, not a Buffer: the decoder (DecompressionStream) would
    // otherwise get a view over a larger ArrayBuffer and report trailing junk
    const a = new Uint8Array(fs.readFileSync(path.join(this.dir, file)));
    return off || len !== a.length ? a.subarray(off, off + len) : a;
  }
  async readAll(file) { return new Uint8Array(fs.readFileSync(path.join(this.dir, file))); }
}

globalThis.requestAnimationFrame = (f) => setImmediate(f);

const t0 = now();
const { loadTileWorld } = await import('../../game/js/tileworld.js');
const { terrainArrays } = await import('../../game/js/terrain3d.js');
const { encodeTerrain, terrainRowsSignature, terrainHoleRows, TERRAIN_FILE } = await import('../../game/js/terraincache.js');

const extra = [{ name: 'index-provincie.json' }, { name: 'index-corridor.json' }];
const T = await loadTileWorld('world/', { source: new FsSource(WORLD), pool: false, extra });
if (!T) { console.error(`no readable world in ${WORLD}`); process.exit(2); }
const world = T.world;
const tLoad = now();
const rows = terrainHoleRows(world);
const tRows = now();
const arrays = terrainArrays(world.meta.bounds, rows.map((w) => ({ pts: w.pts, bounds: w.bounds })));
const tBuild = now();
const raw = encodeTerrain(arrays, { bounds: world.meta.bounds, rowsSig: terrainRowsSignature(rows) });
const tEncode = now();
const packed = zlib.deflateRawSync(Buffer.from(raw), { level: 9 });
const tDeflate = now();
log(`terrain: ${arrays.positions.length / 3} points, ${arrays.tiles.length} tiles, ${rows.length} water rows; build ${(tBuild - tRows).toFixed(0)} ms, encode ${(tEncode - tBuild).toFixed(0)} ms, deflate ${(tDeflate - tEncode).toFixed(0)} ms`);

if (CHECK) {
  let existing;
  try { existing = zlib.inflateRawSync(fs.readFileSync(OUT)); } catch (e) {
    console.error(`terrain: the cache is missing or unreadable (${e.message}); bake again with node scripts/world/bake_terrain.mjs`);
    process.exit(1);
  }
  if (!Buffer.from(raw).equals(existing)) {
    console.error(`terrain: ${path.relative(ROOT, OUT)} differs from what the baker makes now; bake again (stage)`);
    process.exit(1);
  }
  // and the reader: does the game get exactly the arrays the baker made out of
  // the file? That covers the decode path (tileworld.js + terraincache.js).
  const R = await loadTileWorld('world/', { source: new FsSource(WORLD), pool: false, terrainCache: true, extra });
  const read = R && R.world && R.world.terrainCache;
  const sameArr = (a, b) => !!a && !!b && a.length === b.length && a.every((v, i) => v === b[i]);
  const fits = read
    && sameArr(read.positions, arrays.positions) && sameArr(read.normals, arrays.normals)
    && read.y === arrays.y && read.droppedTriangles === arrays.droppedTriangles && read.maxTriangles === arrays.maxTriangles
    && read.tiles.length === arrays.tiles.length
    && read.tiles.every((t, i) => sameArr(t.index, arrays.tiles[i].index) && sameArr(t.box, arrays.tiles[i].box));
  if (!fits) {
    console.error('terrain: the reader returns other ground than the baker made (tileworld.js/terraincache.js)');
    process.exit(1);
  }
  console.log(`terrain: cache is correct (${mb(packed.length)}, ${arrays.tiles.length} tiles, ${rows.length} water rows) and the reader returns the same ground`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const tmp = OUT + '.tmp';
fs.writeFileSync(tmp, packed);
fs.renameSync(tmp, OUT);
log(`terrain: baked ${path.relative(ROOT, OUT)} (${mb(packed.length)}, ${arrays.positions.length / 3} points, ${arrays.tiles.length} tiles; load ${(tLoad - t0).toFixed(0)} ms)`);
