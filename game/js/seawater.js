// The open sea as water for boats (#233). OSM only has the coastline, so the
// Wadden, the Eems and the Dollard have no water polygon and a boat's shore test
// (waterindex.js waterClearance) took every metre of them for land: a wall in open water.
// regions.js knows the sea as a polygon (the coast chain closed round the north, the
// islands cut out); this makes the clearance function of it that waterindex.js falls back
// on where no water row is: the distance to the nearest stretch of coast or island, or
// null on land. Pure: seaAt(x, y) and the shore lines come in as arguments.
import { SpatialGrid } from './spatialgrid.js';

const CELL = 64;

// lines: polylines [[x, y], ...] of the shore (the coast chain, the islands' rings)
export function createSeaClearance(seaAt, lines) {
  const grid = new SpatialGrid(CELL);
  for (const L of lines) {
    for (let i = 0; i + 1 < L.length; i++) {
      const a = L[i], b = L[i + 1];
      grid.insert([a[0], a[1], b[0], b[1]], [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])]);
    }
  }
  // a cell no shore segment touches lies wholly on one side: asked once, at its centre
  const calm = new Map();
  const calmAt = (x, y) => {
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL), k = cx * 100003 + cy;
    let v = calm.get(k);
    if (v === undefined) { v = seaAt((cx + 0.5) * CELL, (cy + 0.5) * CELL); calm.set(k, v); if (calm.size > 20000) calm.clear(); }
    return v;
  };
  // free sea round (x, y) up to maxR; null where there is none (land, no sea)
  return function seaClearance(x, y, maxR = 4) {
    const segs = grid.query(x - maxR, y - maxR, x + maxR, y + maxR);
    if (!segs.length) return calmAt(x, y) ? maxR : null;
    if (!seaAt(x, y)) return null;
    let d = maxR;
    for (const s of segs) {
      const dx = s[2] - s[0], dy = s[3] - s[1], l2 = dx * dx + dy * dy || 1e-9;
      const t = Math.max(0, Math.min(1, ((x - s[0]) * dx + (y - s[1]) * dy) / l2));
      const e = Math.hypot(s[0] + dx * t - x, s[1] + dy * t - y);
      if (e < d) d = e;
    }
    return d;
  };
}
