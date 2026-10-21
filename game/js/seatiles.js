// The open sea as water rows (#233). OSM draws only the coastline, so the Wadden Sea, the Eems and the Dollard had no water row,
// the three 3190 x 500 m strips of vaarnet_fixes.json apart: off a strip the ground drew its polder (grass, ditches) over the sea,
// the boat (at water level, 2.3 m under that ground) vanished under the fields and sailed "on land". Round the player the sea
// polygon of regions.js is cut at the 1 km tile grid, like the province's own water rows (waterindex.js onTileCut: the edge on a
// tile border is no shore), and added as water rows: the ground opens over them, the surface mesh and the foam come as for any
// water. Tiles that touch an island are left out (the island is cut out of the sea ring by regions.seaAt only).
import { seaRing, seaIslandRings, regionEdgeLayer } from './regions.js';
import { tileOrigin, tileIndexOf, TILE_M } from './gdt.js';
import { BOEZEM_Y, WATER_KINDS } from './waterlevels.js';
import { polygonBounds } from './util.js';

// Sutherland-Hodgman: a (concave) ring against one axis-aligned rectangle. Where the result falls apart the pieces are joined along
// the rectangle's edge by zero-width stretches, which the even-odd fills and the ray casts do not see.
export function clipRing(ring, x0, y0, x1, y1) {
  let out = ring;
  const edges = [
    [(p) => p[0] >= x0, (a, b) => { const t = (x0 - a[0]) / (b[0] - a[0]); return [x0, a[1] + (b[1] - a[1]) * t]; }],
    [(p) => p[0] <= x1, (a, b) => { const t = (x1 - a[0]) / (b[0] - a[0]); return [x1, a[1] + (b[1] - a[1]) * t]; }],
    [(p) => p[1] >= y0, (a, b) => { const t = (y0 - a[1]) / (b[1] - a[1]); return [a[0] + (b[0] - a[0]) * t, y0]; }],
    [(p) => p[1] <= y1, (a, b) => { const t = (y1 - a[1]) / (b[1] - a[1]); return [a[0] + (b[0] - a[0]) * t, y1]; }],
  ];
  for (const [inside, cut] of edges) {
    const inp = out;
    out = [];
    if (!inp.length) break;
    let prev = inp[inp.length - 1];
    for (const cur of inp) {
      const ci = inside(cur), pi = inside(prev);
      if (ci) { if (!pi) out.push(cut(prev, cur)); out.push(cur); } else if (pi) out.push(cut(prev, cur));
      prev = cur;
    }
  }
  return out;
}

const area = (P) => { let a = 0; for (let i = 0, j = P.length - 1; i < P.length; j = i++) a += (P[j][0] + P[i][0]) * (P[j][1] - P[i][1]); return Math.abs(a / 2); };
let islandBoxes = null, islandRef = null;
const boxesOfIslands = () => {
  const rings = seaIslandRings();
  if (islandRef !== rings) { islandRef = rings; islandBoxes = rings.map(polygonBounds); }
  return islandBoxes;
};

// the water row of the sea in tile (i, j), or null (land, an island, nothing of the sea in it)
export function seaTileRow(i, j) {
  const ring = seaRing();
  if (!ring) return null;
  const [x0, y0] = tileOrigin(i, j), x1 = x0 + TILE_M, y1 = y0 + TILE_M;
  for (const b of boxesOfIslands()) if (!(b[0] > x1 || b[2] < x0 || b[1] > y1 || b[3] < y0)) return null;
  const pts = clipRing(ring, x0, y0, x1, y1);
  if (pts.length < 3 || area(pts) < 400) return null;
  const kind = 'zee';
  return { pts, kind, nav: WATER_KINDS[kind].nav, lv: BOEZEM_Y, dp: WATER_KINDS[kind].depth, body: -2, name: 'Zee', flat: true, fix: true, bank: 'oever', seaTile: true };
}

// Add the sea rows of the tiles within `radius` m of (px, py) that the map has none of yet; the number added
export function ensureSeaRows(map, px, py, radius = 3000) {
  // (only once the province layer is in: before it regions.js holds a rough fallback coast)
  if (!map || !map.addWaterPatches || !regionEdgeLayer() || !seaRing()) return 0;
  const done = map._seaTiles || (map._seaTiles = new Set());
  const [ci, cj] = tileIndexOf(px, py), n = Math.ceil(radius / TILE_M);
  const rows = [];
  for (let i = ci - n; i <= ci + n; i++) {
    for (let j = cj - n; j <= cj + n; j++) {
      const k = i * 100003 + j;
      if (done.has(k)) continue;
      done.add(k);
      const row = seaTileRow(i, j);
      if (row) rows.push(row);
    }
  }
  if (rows.length) map.addWaterPatches(rows);
  return rows.length;
}
