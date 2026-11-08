// The baked terrain ground (a build artefact, scripts/world/bake_terrain.mjs).
// The arrays terrainArrays() makes from the map bounds and the water polygons are
// deterministic, so the build bakes them once instead of on every start.
//
// Why a file next to the tiles and not a tile section: the terrain spans the
// whole city frame (not one tile), and the map packer (pack_tiles.mjs) should not
// need to know the render kernels. A new file in the stage is the same pattern as
// the vendored modules and the Opus audio; the map itself stays untouched. See
// ADR 0030 (.specs-fire/standards/adr/).
//
// Format (little endian, then deflate-raw; the game reads it through
// tilestore.inflateRaw): a 112-byte header followed by the boxes, the index
// lengths, the extra points and the indices as zigzag varints (delta per tile).
// Normals are (0,1,0) everywhere and the base grid is regular: both are rebuilt
// on read, which saves two thirds of the bytes.
//
// Pure: no three, no DOM. Node (the baker, the stage check, the tests), the
// browser and Electron all read with the same code.
import { gridItems } from './spatialgrid.js';

export const TERRAIN_FILE = 'terrain.bin';
export const TERRAIN_CACHE_VERSION = 1;
const MAGIC = 'GTERR'; // 5 bytes
const HEADER = 112;
// header: 0 magic, 5 version, 6 reserved u16, 8 bounds f64 x4, 40 grid minX/minY/
// totalW/totalD f64 x4, 72 y f64, 80 segsX u32, 84 segsZ u32, 88 extraCount u32,
// 92 tileCount u32, 96 droppedTriangles u32, 100 maxTriangles u32, 104 rowsSig
// u32, 108 bodyBytes u32.
const O = { version: 5, bounds: 8, grid: 40, y: 72, segsX: 80, segsZ: 84, extra: 88, tiles: 92, dropped: 96, max: 100, sig: 104, body: 108 };

const ascii = (s) => { const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; };
const same = (a, b) => a.length === 4 && b.length === 4 && a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];

// The water list terrainArrays() cuts its holes from: the same order and the same
// polygons as scene3d.js, so the baker and the game build the same ground (the
// cache is only valid for the same list).
export function terrainHoleRows(map) {
  return gridItems(map.waterGrid).filter((w) => !map.duplicateWater || !map.duplicateWater.has(w));
}

// A short fingerprint of that list (FNV-1a over the points and their order): a
// different list means the cache no longer fits and the game builds the ground
// itself.
export function terrainRowsSignature(rows) {
  let h = 0x811c9dc5;
  const mix = (n) => { h ^= n; h = Math.imul(h, 0x01000193); };
  const dv = new DataView(new ArrayBuffer(8));
  const num = (n) => {
    dv.setFloat64(0, n, true);
    mix(dv.getUint32(0, true));
    mix(dv.getUint32(4, true));
  };
  mix(0x7e57); // separator/version of the fingerprint
  mix(rows.length);
  for (const w of rows) {
    const pts = w.pts || [];
    mix(pts.length);
    for (const p of pts) { num(p[0]); num(p[1]); }
  }
  return h >>> 0;
}

// terrainArrays() back into a block of bytes (unchanged; the baker compresses it).
export function encodeTerrain(T, { bounds, rowsSig = 0 } = {}) {
  const g = T && T.grid;
  if (!g || !(g.nx > 0) || !(g.nz > 0)) throw new Error('encodeTerrain: het terrein heeft geen bruikbaar grid');
  if (!T.positions || T.positions.length % 3) throw new Error('encodeTerrain: geen posities');
  if (!Array.isArray(bounds) || bounds.length !== 4) throw new Error('encodeTerrain: geen kaartgrenzen');
  const verts = T.positions.length / 3;
  const base = g.nx * g.nz;
  const extra = verts - base;
  if (!Number.isInteger(extra) || extra < 0) throw new Error(`encodeTerrain: ${verts} punten past niet op een ${g.nx}x${g.nz}-grid`);
  const tiles = T.tiles || [];
  const counts = tiles.map((t) => t.index && t.index.length);
  for (let i = 0; i < tiles.length; i++) {
    if (!tiles[i].index || !Number.isInteger(counts[i]) || counts[i] % 3) {
      throw new Error(`encodeTerrain: tegel ${i} heeft geen driehoekindex`);
    }
    if (!Array.isArray(tiles[i].box) || tiles[i].box.length !== 4) throw new Error(`encodeTerrain: tegel ${i} heeft geen box`);
  }
  // the indices: zigzag delta per tile; first count how many varint bytes that is
  let varBytes = 0;
  for (const t of tiles) {
    let prev = 0;
    for (const v of t.index) {
      if (!Number.isInteger(v) || v < 0 || v >= verts) throw new Error(`encodeTerrain: index ${v} buiten het terrein`);
      const d = v - prev; prev = v;
      let u = d < 0 ? -d * 2 - 1 : d * 2;
      do { varBytes++; u = Math.floor(u / 128); } while (u > 0);
    }
  }
  const body = tiles.length * 20 + extra * 8 + varBytes;
  const out = new Uint8Array(HEADER + body);
  const dv = new DataView(out.buffer);
  out.set(ascii(MAGIC), 0);
  dv.setUint8(O.version, TERRAIN_CACHE_VERSION);
  dv.setUint16(O.version + 1, 0, true);
  for (let i = 0; i < 4; i++) dv.setFloat64(O.bounds + i * 8, bounds[i], true);
  dv.setFloat64(O.grid, g.minX, true);
  dv.setFloat64(O.grid + 8, g.minY, true);
  dv.setFloat64(O.grid + 16, g.totalW, true);
  dv.setFloat64(O.grid + 24, g.totalD, true);
  dv.setFloat64(O.y, T.y ?? 0, true);
  dv.setUint32(O.segsX, g.segsX, true);
  dv.setUint32(O.segsZ, g.segsZ, true);
  dv.setUint32(O.extra, extra, true);
  dv.setUint32(O.tiles, tiles.length, true);
  dv.setUint32(O.dropped, T.droppedTriangles >>> 0, true);
  dv.setUint32(O.max, T.maxTriangles >>> 0, true);
  dv.setUint32(O.sig, rowsSig >>> 0, true);
  dv.setUint32(O.body, body, true);
  let off = HEADER;
  for (const t of tiles) { for (let k = 0; k < 4; k++) { dv.setFloat32(off, t.box[k], true); off += 4; } }
  for (const c of counts) { dv.setUint32(off, c, true); off += 4; }
  // the extra points (the regular base grid is implicit): x and z, y is 0
  for (let k = 0; k < extra; k++) {
    dv.setFloat32(off, T.positions[(base + k) * 3], true); off += 4;
    dv.setFloat32(off, T.positions[(base + k) * 3 + 2], true); off += 4;
  }
  for (const t of tiles) {
    let prev = 0;
    for (const v of t.index) {
      const d = v - prev; prev = v;
      let u = d < 0 ? -d * 2 - 1 : d * 2;
      while (u >= 128) { out[off++] = (u & 127) | 128; u = Math.floor(u / 128); }
      out[off++] = u;
    }
  }
  if (off !== out.length) throw new Error(`encodeTerrain: ${off} bytes geschreven, ${out.length} verwacht`);
  return out;
}

// The block back into exactly the shape terrainGroup() expects: positions (base
// grid + extra points), normals (0,1,0), tiles with index and box, y and the
// counters. Throws with the reason on an unknown or damaged block.
export function decodeTerrain(bytes) {
  if (!bytes || bytes.byteLength === undefined) throw new Error('terrein: geen bytes');
  if (bytes.byteLength < HEADER) throw new Error(`terrein: ${bytes.byteLength} bytes is te kort`);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < MAGIC.length; i++) if (bytes[i] !== MAGIC.charCodeAt(i)) throw new Error('terrein: geen terreinblok (magic)');
  const version = dv.getUint8(O.version);
  if (version !== TERRAIN_CACHE_VERSION) throw new Error(`terrein: versie ${version} in het cachebestand, versie ${TERRAIN_CACHE_VERSION} verwacht; het terrein wordt opnieuw gebouwd`);
  if (dv.getUint32(O.body, true) !== bytes.byteLength - HEADER) throw new Error('terrein: de lengte in de kop klopt niet met het bestand');
  const bounds = [dv.getFloat64(O.bounds, true), dv.getFloat64(O.bounds + 8, true), dv.getFloat64(O.bounds + 16, true), dv.getFloat64(O.bounds + 24, true)];
  const grid = {
    minX: dv.getFloat64(O.grid, true), minY: dv.getFloat64(O.grid + 8, true),
    totalW: dv.getFloat64(O.grid + 16, true), totalD: dv.getFloat64(O.grid + 24, true),
    segsX: dv.getUint32(O.segsX, true), segsZ: dv.getUint32(O.segsZ, true),
  };
  grid.nx = grid.segsX + 1; grid.nz = grid.segsZ + 1;
  const extra = dv.getUint32(O.extra, true);
  const tileCount = dv.getUint32(O.tiles, true);
  if (!(grid.segsX > 0 && grid.segsZ > 0 && grid.segsX < 1e5 && grid.segsZ < 1e5)) throw new Error('terrein: onzinnig grid');
  if (grid.nx * grid.nz > 1e8 || extra > 1e8 || tileCount > 1e6) throw new Error('terrein: onzinnige aantallen');
  const base = grid.nx * grid.nz;
  const body = bytes.byteLength - HEADER;
  if (tileCount * 20 + extra * 8 > body) throw new Error('terrein: het bestand is korter dan de kop zegt');
  const positions = new Float32Array((base + extra) * 3);
  for (let j = 0; j < grid.nz; j++) {
    const z = grid.minY + (grid.totalD * j) / grid.segsZ;
    for (let i = 0; i < grid.nx; i++) {
      const at = (j * grid.nx + i) * 3;
      positions[at] = grid.minX + (grid.totalW * i) / grid.segsX;
      positions[at + 1] = 0;
      positions[at + 2] = z;
    }
  }
  let off = HEADER;
  const tiles = new Array(tileCount);
  for (let i = 0; i < tileCount; i++) {
    const box = [dv.getFloat32(off, true), dv.getFloat32(off + 4, true), dv.getFloat32(off + 8, true), dv.getFloat32(off + 12, true)];
    off += 16;
    tiles[i] = { box };
  }
  const counts = new Uint32Array(tileCount);
  for (let i = 0; i < tileCount; i++) { counts[i] = dv.getUint32(off, true); off += 4; }
  for (let k = 0; k < extra; k++) {
    positions[(base + k) * 3] = dv.getFloat32(off, true); off += 4;
    positions[(base + k) * 3 + 2] = dv.getFloat32(off, true); off += 4;
  }
  // the normal is straight up everywhere; no bytes in the file
  const normals = new Float32Array(positions.length);
  for (let i = 1; i < normals.length; i += 3) normals[i] = 1;
  const verts = base + extra;
  for (let i = 0; i < tileCount; i++) {
    const n = counts[i];
    if (!n || n % 3) throw new Error(`terrein: tegel ${i} heeft een ongeldige indexlengte`);
    const index = new Uint32Array(n);
    let prev = 0;
    for (let k = 0; k < n; k++) {
      let u = 0, shift = 0, b;
      do {
        if (off >= bytes.byteLength) throw new Error('terrein: het bestand eindigt midden in een index');
        b = bytes[off++];
        u += (b & 127) * Math.pow(2, shift);
        shift += 7;
        if (shift > 35) throw new Error('terrein: varint is te lang');
      } while (b & 128);
      const d = (u & 1) ? -((u + 1) / 2) : u / 2;
      const v = prev + d;
      if (!(v >= 0 && v < verts)) throw new Error(`terrein: index ${v} valt buiten het terrein`);
      index[k] = v;
      prev = v;
    }
    tiles[i].index = index;
  }
  if (off !== bytes.byteLength) throw new Error(`terrein: ${bytes.byteLength - off} overtollige bytes`);
  return {
    positions, normals, tiles, grid,
    y: dv.getFloat64(O.y, true),
    droppedTriangles: dv.getUint32(O.dropped, true),
    maxTriangles: dv.getUint32(O.max, true),
    bounds, rowsSig: dv.getUint32(O.sig, true),
  };
}

// The stage check: null when the block is fine, else the reason. (The baker fails
// the build on an invalid file, like a missing pack.)
export function checkTerrainCacheBytes(bytes) {
  try { decodeTerrain(bytes); return null; }
  catch (e) { return e.message; }
}

export { same as sameBounds };
