// The whole province as real tiles (docs/PROVINCIE-PLAN.md F2,
// scripts/world/build_province.mjs -> index-provincie.json): which tiles the
// game streams, where the procedural polders give way to them, and what the
// countryside's props must keep clear of.
//
// The tiles themselves need nothing new to be seen: they stream into the
// TileWorld's grids, so the city's detail streamers (scene3d.js
// syncBuildings / syncRoads / syncWater / syncTrees) build them like any
// city street, and farlod.js draws them past the detail radius
// (scene3d.js streamTile). Here:
//  - the polder blocks they cover become real blocks (countryfield.js
//    setProvinceBlocks): no procedural roads, maaren, villages or farms on
//    top of the real ones, in the ground shader and in the gameplay rules;
//  - the countryside's props (herds, bales, fences, mills) keep off their
//    roads, buildings and water (countryedge.js setExtraBlocked), and stay
//    away from a tile that has not streamed in yet.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { BLOCK, COUNTRY_UNIFORMS, setProvinceBlocks } from './countryfield.js';
import { setExtraBlocked } from './countryedge.js';
import { setTileCover } from './countryreal.js';
import { tileIndexOf, tileKey } from './gdt.js';
import { pointInPolygon } from './util.js';
import { setProvinceMap } from './provincemap.js';

// tile flags (build_province.mjs FLAG)
export const PFLAG = { LAND: 1, BUILT: 4, OLD: 8, BUFFER: 16, PROVINCE: 32 };

// The province's tiles are the one source wherever a tile is built (issue #3,
// PROVINCIE-PLAN 2.28): they stream everywhere, also inside the old Ommeland
// area (flag 8), and the old layers keep only the cells no built tile covers
// (the edges of the city's own tiles, where its data ends). A build without
// the province layer (no extract in data/cache) has nothing to stream.

// The polder blocks (BLOCK m) mostly covered by tiles for which isTile(key)
// holds: { x0, y0, w, h, data } in block units, or null. A block counts when
// at least 5 of 9 sample points lie in such a tile.
export function provinceBlocksOf(keys, isTile) {
  let i0 = Infinity, j0 = Infinity, i1 = -Infinity, j1 = -Infinity;
  const tiles = [];
  for (const k of keys) {
    const t = isTile(k);
    if (!t) continue;
    tiles.push(t);
    const x0 = 330 + t.i * 1000, y0 = 75 + t.j * 1000;
    i0 = Math.min(i0, Math.floor(x0 / BLOCK)); j0 = Math.min(j0, Math.floor(y0 / BLOCK));
    i1 = Math.max(i1, Math.floor((x0 + 1000) / BLOCK)); j1 = Math.max(j1, Math.floor((y0 + 1000) / BLOCK));
  }
  if (!tiles.length) return null;
  const on = new Set(tiles.map((t) => tileKey(t.i, t.j)));
  const w = i1 - i0 + 1, h = j1 - j0 + 1;
  const data = new Uint8Array(w * h);
  let n = 0;
  for (let bj = 0; bj < h; bj++) {
    for (let bi = 0; bi < w; bi++) {
      let c = 0;
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
        const x = (i0 + bi) * BLOCK + ((a + 0.5) * BLOCK) / 3, y = (j0 + bj) * BLOCK + ((b + 0.5) * BLOCK) / 3;
        const [ti, tj] = tileIndexOf(x, y);
        if (on.has(tileKey(ti, tj))) c++;
      }
      if (c >= 5) { data[bj * w + bi] = 1; n++; }
    }
  }
  return { x0: i0, y0: j0, w, h, data, count: n };
}

// Does something real of a streamed tile stand at (x, y), within m? A tile
// of the layer that is not in yet counts as blocked.
export function realBlockedAt(map, isTile, x, y, m) {
  const [i, j] = tileIndexOf(x, y);
  if (!isTile(tileKey(i, j))) return false;
  if (!map.resident || !map.resident.has(`${i},${j}`)) return true;
  for (const b of map.buildingsNear(x, y, m + 1)) {
    const q = b.bounds;
    if (!q || x < q[0] - m || x > q[2] + m || y < q[1] - m || y > q[3] + m) continue;
    if (m <= 0.5 ? pointInPolygon(x, y, b.pts) : true) return true;
  }
  for (const r of map.roadsNear(x, y, m + 12)) {
    const hw = (r.width || 4) / 2 + m;
    const P = r.pts;
    for (let k = 0; k < P.length - 1; k++) {
      const ax = P[k][0], ay = P[k][1], dx = P[k + 1][0] - ax, dy = P[k + 1][1] - ay, L2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
      if ((x - ax - dx * t) ** 2 + (y - ay - dy * t) ** 2 < hw * hw) return true;
    }
  }
  for (const w of map.flatWaterNear ? map.flatWaterNear(x, y, m + 1) : map.waterNear(x, y, m + 1)) {
    const q = w.bounds;
    if (q && x >= q[0] - m && x <= q[2] + m && y >= q[1] - m && y <= q[3] + m && pointInPolygon(x, y, w.pts)) return true;
  }
  return false;
}

const S = { layer: null, keys: null, blocks: null, tex: null };

// Where the tiles are the one source: the built tiles of
// the layer. covered(x, y) -> countryreal.js setTileCover.
export function tileCoverOf(index) {
  const keys = new Set();
  for (const k of Object.keys(index.tiles)) { const t = index.tiles[k]; if (t.flags & PFLAG.PROVINCE && t.flags & PFLAG.BUILT) keys.add(tileKey(t.i, t.j)); }
  return (x, y) => { const [i, j] = tileIndexOf(x, y); return keys.has(tileKey(i, j)); };
}

// After loadTileWorld: the layer's global part and, when streaming, the
// polder blocks and the prop rule. -> { layer, tiles (keys streamed), blocks }
export function initProvince(tiles) {
  const layer = tiles && tiles.index.layers && tiles.index.layers.provincie;
  S.layer = layer && layer.global ? layer.global : null;
  setTileCover(S.layer && tiles.index ? tileCoverOf(tiles.index) : null);
  if (!S.layer) { setProvinceBlocks(null); setProvinceMap(null); return { layer: S.layer, tiles: 0, blocks: 0 }; }
  // the full map's base layer (provincemap.js)
  setProvinceMap(S.layer.map || null);
  const idx = tiles.index.tiles;
  const isTile = (k) => { const t = idx[k]; return t && t.flags & PFLAG.PROVINCE ? t : null; };
  S.keys = Object.keys(idx).filter((k) => isTile(k));
  S.blocks = provinceBlocksOf(S.keys, isTile);
  if (S.blocks) {
    const B = S.blocks;
    const px = new Uint8Array(B.w * B.h);
    for (let k = 0; k < px.length; k++) px[k] = B.data[k] ? 255 : 0;
    S.tex = new THREE.DataTexture(px, B.w, B.h, THREE.RedFormat, THREE.UnsignedByteType);
    S.tex.unpackAlignment = 1;
    S.tex.generateMipmaps = false;
    S.tex.minFilter = S.tex.magFilter = THREE.NearestFilter;
    S.tex.needsUpdate = true;
    COUNTRY_UNIFORMS.uProvBlocks.value = S.tex;
    setProvinceBlocks({ x0: B.x0, y0: B.y0, w: B.w, h: B.h, data: B.data });
  }
  const map = tiles.world;
  setExtraBlocked((x, y, m) => realBlockedAt(map, isTile, x, y, m));
  return { layer: S.layer, tiles: S.keys.length, blocks: S.blocks ? S.blocks.count : 0 };
}

export const provinceLayer = () => S.layer;
