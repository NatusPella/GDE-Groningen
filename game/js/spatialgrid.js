// Uniform grid over bounding boxes: insert, remove and query by box.
export class SpatialGrid {
  constructor(cellSize) {
    this.cell = cellSize;
    this.map = new Map();
  }
  key(cx, cy) { return (cx + 32768) * 65536 + cy + 32768; }
  cellRange(minx, miny, maxx, maxy) {
    return {
      cx0: Math.floor(minx / this.cell), cy0: Math.floor(miny / this.cell),
      cx1: Math.floor(maxx / this.cell), cy1: Math.floor(maxy / this.cell),
    };
  }
  insert(item, bounds) {
    const { cx0, cy0, cx1, cy1 } = this.cellRange(...bounds);
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const k = this.key(cx, cy);
        let arr = this.map.get(k);
        if (!arr) { arr = []; this.map.set(k, arr); }
        arr.push(item);
      }
    }
  }
  remove(item, bounds) {
    const { cx0, cy0, cx1, cy1 } = this.cellRange(...bounds);
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const k = this.key(cx, cy);
        const arr = this.map.get(k);
        if (!arr) continue;
        const i = arr.indexOf(item);
        if (i >= 0) arr.splice(i, 1);
        if (!arr.length) this.map.delete(k);
      }
    }
  }
  // #653: dezelfde query, maar in een bestaande array (geen nieuwe array/Set per
  // aanroep en geen dedupe-Set als de beller de cellen niet dubbel heeft).
  queryInto(out, minx, miny, maxx, maxy) {
    out.length = 0;
    const { cx0, cy0, cx1, cy1 } = this.cellRange(minx, miny, maxx, maxy);
    if (cx0 === cx1 && cy0 === cy1) {
      const arr = this.map.get(this.key(cx0, cy0));
      if (arr) for (let i = 0; i < arr.length; i++) out.push(arr[i]);
      return out.length;
    }
    // meerdere cellen: dedupe via de _intoSeen-set (hergebruikt, net als de uit-array)
    const seen = this._intoSeen || (this._intoSeen = new Set());
    seen.clear();
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const arr = this.map.get(this.key(cx, cy));
        if (!arr) continue;
        for (let i = 0; i < arr.length; i++) {
          const item = arr[i];
          if (seen.has(item)) continue;
          seen.add(item); out.push(item);
        }
      }
    }
    seen.clear();
    return out.length;
  }
  queryRadiusInto(out, x, y, r) { return this.queryInto(out, x - r, y - r, x + r, y + r); }
  query(minx, miny, maxx, maxy) {
    const { cx0, cy0, cx1, cy1 } = this.cellRange(minx, miny, maxx, maxy);
    // one cell: its list as it is (a copy), no dedupe needed
    if (cx0 === cx1 && cy0 === cy1) {
      const arr = this.map.get(this.key(cx0, cy0));
      return arr ? arr.slice() : [];
    }
    const seen = new Set();
    const out = [];
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const arr = this.map.get(this.key(cx, cy));
        if (!arr) continue;
        for (const item of arr) {
          if (!seen.has(item)) { seen.add(item); out.push(item); }
        }
      }
    }
    return out;
  }
  // Items whose cells overlap the square around (x, y) with half-side r: a
  // superset of the items within r, the caller does the exact distance test.
  queryRadius(x, y, r) { return this.query(x - r, y - r, x + r, y + r); }
  insertPoint(item, x, y) { this.insert(item, [x, y, x, y]); }
  removePoint(item, x, y) { this.remove(item, [x, y, x, y]); }
  // Moves an item whose bounds changed; a no-op when the cells stay the same.
  update(item, oldBounds, newBounds) {
    const a = this.cellRange(...oldBounds), b = this.cellRange(...newBounds);
    if (a.cx0 === b.cx0 && a.cy0 === b.cy0 && a.cx1 === b.cx1 && a.cy1 === b.cy1) return;
    this.remove(item, oldBounds);
    this.insert(item, newBounds);
  }
  // The raw item list of one cell (not a copy), or undefined.
  cellItems(cx, cy) { return this.map.get(this.key(cx, cy)); }
  clear() { this.map.clear(); }
}

// Elk object één keer, uit alle cellen van het raster (#524): de lezers van de hele
// kaartarrays gaan via de rasters, zodat een tegel zijn eigen rijen kan toevoegen en
// weghalen zonder dat de array de waarheid hoeft te zijn. De volgorde is cel-voor-cel.
export function gridItems(grid) {
  if (!grid || !grid.map) return [];
  const out = [], seen = new Set();
  for (const arr of grid.map.values()) for (const it of arr) if (!seen.has(it)) { seen.add(it); out.push(it); }
  return out;
}
