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
import { provinceLandAt } from './regions.js';
import { BLOCK, COUNTRY_UNIFORMS, setProvinceBlocks, setProvinceDitches } from './countryfield.js';
import { setExtraBlocked, setExtraUse, setExtraHedge, setLandMask } from './countryedge.js';
import { tileIndexOf, tileKey } from './gdt.js';
import { pointInPolygon } from './util.js';
import { setProvinceMap } from './provincemap.js';

// tile flags (build_province.mjs FLAG)
export const PFLAG = { LAND: 1, BUILT: 4, OLD: 8, BUFFER: 16, PROVINCE: 32 };

// The province's tiles are the one source wherever a tile is built (issue #3,
// PROVINCIE-PLAN 2.28): they stream everywhere, and the procedural countryside
// keeps only the cells no built tile covers. A build without the province layer
// (no extract in data/cache) has nothing to stream.

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

// A mapped hedge of the tiles within r of (x, y)?
export function realHedgeNear(map, x, y, r) {
  if (!map.hedgeNear) return false;
  for (const h of map.hedgeNear(x, y, r)) {
    const P = h.pts;
    for (let k = 0; k < P.length - 1; k++) {
      const ax = P[k][0], ay = P[k][1], dx = P[k + 1][0] - ax, dy = P[k + 1][1] - ay, L2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
      if ((x - ax - dx * t) ** 2 + (y - ay - dy * t) ** 2 < r * r) return true;
    }
  }
  return false;
}

// The land use the tiles give a point ('akker' | 'weide' | 'boomgaard'), or null: a tile that is not in, or no polygon.
export function realUseAt(map, isTile, x, y) {
  const [i, j] = tileIndexOf(x, y);
  if (!isTile(tileKey(i, j)) || !map.resident || !map.resident.has(`${i},${j}`)) return null;
  return map.landUseAt ? map.landUseAt(x, y) : null;
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
  // the track (a rail row is a line; the ballast is 4.2 m wide): no fence, hedge or herd on it
  if (map.railNear) {
    for (const r of map.railNear(x, y, m + 4)) {
      const hw = RAIL_HALF + m, P = r.pts;
      for (let k = 0; k < P.length - 1; k++) {
        const ax = P[k][0], ay = P[k][1], dx = P[k + 1][0] - ax, dy = P[k + 1][1] - ay, L2 = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
        if ((x - ax - dx * t) ** 2 + (y - ay - dy * t) ** 2 < hw * hw) return true;
      }
    }
  }
  // both grids: an annotated row (kind, nav) is in the water grid, an older flat one in the flat grid (issue #185)
  for (const w of map.waterNear(x, y, m + 1).concat(map.flatWaterNear ? map.flatWaterNear(x, y, m + 1) : [])) {
    const q = w.bounds;
    if (q && x >= q[0] - m && x <= q[2] + m && y >= q[1] - m && y <= q[3] + m && (pointInPolygon(x, y, w.pts) || nearRing(x, y, w.pts, Math.min(m, WATER_VERGE)))) return true;
  }
  return false;
}

// Half the width of the track's ballast (railway3d.js: 4.2 m)
const RAIL_HALF = 2.1;
// Props keep this far from a shore (more would clear the banks of trees and willows that stand there).
const WATER_VERGE = 1;
// Is (x, y) within d of the polygon's outline? (A ditch is a strip a few metres wide: a point on its bank is outside it.)
export function nearRing(x, y, P, d) {
  if (!(d > 0)) return false;
  const d2 = d * d;
  for (let i = 0; i < P.length - 1; i++) {
    const ax = P[i][0], ay = P[i][1], dx = P[i + 1][0] - ax, dy = P[i + 1][1] - ay, L2 = dx * dx + dy * dy || 1e-9;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
    if ((x - ax - dx * t) ** 2 + (y - ay - dy * t) ** 2 < d2) return true;
  }
  return false;
}

const S = { layer: null, keys: null, blocks: null, tex: null, has: null, cover: null, map: null };

// How built-up the land round (x, y) is, 0 in open country to 1 in a village:
// the footprints of the houses and halls of the tiles that are in within 100 m
// (not barns, sheds and greenhouses) over the circle, from 5 % (0) to 16 % (1).
// The countryside's props keep out of villages by it. 0 without tiles.
const URBAN_R = 100;
const NOT_URBAN = new Set(['barn', 'farm_auxiliary', 'cowshed', 'stable', 'shed', 'greenhouse', 'silo', 'roof', 'hut', 'carport', 'service']);
function footprint(b) {
  if (b._fp !== undefined) return b._fp;
  const P = b.pts;
  let a = 0;
  for (let i = 0; i < P.length - 1; i++) a += P[i][0] * P[i + 1][1] - P[i + 1][0] * P[i][1];
  return (b._fp = Math.min(900, Math.abs(a) / 2));
}
export function urbanWeight(x, y) {
  const map = S.map;
  if (!map) return 0;
  let area = 0;
  for (const b of map.buildingsNear(x, y, URBAN_R)) {
    const q = b.bounds;
    if (!q || NOT_URBAN.has(b.type) || ((q[0] + q[2]) / 2 - x) ** 2 + ((q[1] + q[3]) / 2 - y) ** 2 > URBAN_R * URBAN_R) continue;
    area += footprint(b);
  }
  const t = Math.min(1, Math.max(0, (area / (Math.PI * URBAN_R * URBAN_R) - 0.05) / 0.11));
  return t * t * (3 - 2 * t);
}

// Does a built province tile cover (x, y)? false without the province layer.
export const coveredByTiles = (x, y) => !!S.cover && S.cover(x, y);

// Where the tiles are the one source: the built tiles of
// the layer. covered(x, y) -> coveredByTiles.
export function tileCoverOf(index) {
  const keys = new Set();
  for (const k of Object.keys(index.tiles)) { const t = index.tiles[k]; if (t.flags & PFLAG.PROVINCE && t.flags & PFLAG.BUILT) keys.add(tileKey(t.i, t.j)); }
  return (x, y) => { const [i, j] = tileIndexOf(x, y); return keys.has(tileKey(i, j)); };
}

// Whether (x, y) lies in a tile of the province's data; null without the province layer.
export function inProvinceData(x, y) {
  if (!S.has) return null;
  const [i, j] = tileIndexOf(x, y);
  return S.has.has(tileKey(i, j));
}

// After loadTileWorld: the layer's global part and, when streaming, the
// polder blocks and the prop rule. -> { layer, tiles (keys streamed), blocks }
export function initProvince(tiles) {
  const layer = tiles && tiles.index.layers && tiles.index.layers.provincie;
  S.layer = layer && layer.global ? layer.global : null;
  S.cover = S.layer && tiles.index ? tileCoverOf(tiles.index) : null;
  setProvinceDitches(!!(S.layer && S.layer.osmDitches));
  if (!S.layer) { S.has = null; S.map = null; setProvinceBlocks(null); setProvinceMap(null); return { layer: S.layer, tiles: 0, blocks: 0 }; }
  // the full map's base layer (provincemap.js)
  setProvinceMap(S.layer.map || null);
  const idx = tiles.index.tiles;
  const isTile = (k) => { const t = idx[k]; return t && t.flags & PFLAG.PROVINCE ? t : null; };
  S.keys = Object.keys(idx).filter((k) => isTile(k));
  S.has = new Set(Object.keys(idx).map((k) => tileKey(idx[k].i, idx[k].j)));
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
  S.map = map;
  setExtraBlocked((x, y, m) => realBlockedAt(map, isTile, x, y, m));
  // the land use of OSM landuse (a world built with it: global.osmParcels); the hash decides where it is silent
  setExtraHedge((x, y, r) => realHedgeNear(map, x, y, r));
  setLandMask(provinceLandAt);
  setExtraUse(S.layer.osmParcels ? (x, y) => realUseAt(map, isTile, x, y) : null);
  return { layer: S.layer, tiles: S.keys.length, blocks: S.blocks ? S.blocks.count : 0 };
}

export const provinceLayer = () => S.layer;
