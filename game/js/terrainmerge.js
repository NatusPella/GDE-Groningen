// The terrain tiles (terrain3d.js terrainArrays: square tiles of TERRAIN_TILE_M that share one
// vertex buffer) joined in coarse cells: each tile is its own mesh, and the far terrain in view
// is dozens of draws. Tiles share the position buffer, so joining two is
// concatenating their index lists; the box is the union.

// tiles: [{ index: Uint32Array, box: [x0, z0, x1, z1] }]; cell: side of the coarse cell (m).
export function mergeTerrainTiles(tiles, cell) {
  if (!(cell > 0) || tiles.length < 2) return tiles;
  const cells = new Map();
  for (const t of tiles) {
    const key = Math.floor((t.box[0] + t.box[2]) / 2 / cell) + ',' + Math.floor((t.box[1] + t.box[3]) / 2 / cell);
    let c = cells.get(key);
    if (!c) cells.set(key, c = []);
    c.push(t);
  }
  const out = [];
  for (const list of cells.values()) {
    if (list.length === 1) { out.push(list[0]); continue; }
    let n = 0;
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const t of list) {
      n += t.index.length;
      x0 = Math.min(x0, t.box[0]); z0 = Math.min(z0, t.box[1]); x1 = Math.max(x1, t.box[2]); z1 = Math.max(z1, t.box[3]);
    }
    const index = new Uint32Array(n);
    let o = 0;
    for (const t of list) { index.set(t.index, o); o += t.index.length; }
    out.push({ index, box: [x0, z0, x1, z1] });
  }
  return out;
}
