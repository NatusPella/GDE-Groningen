// node scripts/viewdist_estimate.mjs: what each Zichtafstand puts in range at
// a few spots (city centre, halfway, the city edge, out in the Ommeland):
// far-LOD tiles (up to 4 draw calls each), far buildings and their rough
// triangle count, and the 160 m Ommeland prop tiles streamed in.
import fs from 'node:fs';
import { VIEW_DISTANCES, propRadius } from '../game/js/viewdist.js';

const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
const root = new URL('../game/', import.meta.url);
const { loadCityData } = await import('./lib/loadworld.mjs');
const data = await loadCityData();
const map = new GameMap(data);

let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
for (const b of map.buildings) {
  if (!b.bounds) continue;
  bx0 = Math.min(bx0, b.bounds[0]); by0 = Math.min(by0, b.bounds[1]);
  bx1 = Math.max(bx1, b.bounds[2]); by1 = Math.max(by1, b.bounds[3]);
}
const cx = (bx0 + bx1) / 2, cy = (by0 + by1) / 2, hx = (bx1 - bx0) / 2, hy = (by1 - by0) / 2;
// countryfield.js edgeDistance without the mask: the building bbox
const edge = (x, y) => Math.max(Math.abs(x - cx) - hx, Math.abs(y - cy) - hy);
console.log(`city ${Math.round(hx * 2)} x ${Math.round(hy * 2)} m, ${map.buildings.length} buildings`);

const TILE = 320;
const tiles = new Map();
for (const b of map.buildings) {
  if (b.landmark || !b.bounds) continue;
  const mx = (b.bounds[0] + b.bounds[2]) / 2, my = (b.bounds[1] + b.bounds[3]) / 2;
  const i = Math.floor(mx / TILE), j = Math.floor(my / TILE), k = i + ',' + j;
  let t = tiles.get(k);
  if (!t) tiles.set(k, (t = { i, j, b: [] }));
  const n = (b.pts || b.poly || []).length || 4;
  t.b.push([mx, my, 3 * n - 2]); // walls 2n + roof n-2
}
const rectDist = (t, px, py) => Math.hypot(Math.max(t.i * TILE - px, 0, px - (t.i + 1) * TILE), Math.max(t.j * TILE - py, 0, py - (t.j + 1) * TILE));

const spots = { centrum: [cx, cy], halfweg: [cx + hx * 0.5, cy], stadsrand: [cx + hx, cy], ommeland: [cx + hx + 400, cy + hy * 0.3] };
const PT = 160;
for (const [name, [px, py]] of Object.entries(spots)) {
  for (const [vn, v] of Object.entries(VIEW_DISTANCES)) {
    const vis = Math.min(v, v * 1.02) + 20;
    let nt = 0, nb = 0, tris = 0;
    for (const t of tiles.values()) {
      if (rectDist(t, px, py) >= vis) continue;
      nt++;
      for (const [x, y, tr] of t.b) if (Math.hypot(x - px, y - py) > 140) { nb++; tris += tr; }
    }
    const R = propRadius(v);
    let pt = 0;
    for (let ty = Math.floor((py - R) / PT); ty <= Math.floor((py + R) / PT); ty++) {
      for (let tx = Math.floor((px - R) / PT); tx <= Math.floor((px + R) / PT); tx++) {
        const X = (tx + 0.5) * PT, Y = (ty + 0.5) * PT;
        if (Math.hypot(X - px, Y - py) > R + PT * 0.71 || edge(X, Y) < -(180 + 110 + PT * 0.71)) continue;
        pt++;
      }
    }
    console.log(`${name.padEnd(10)} ${vn.padEnd(8)} ${String(v).padStart(4)} m  far-LOD tiles ${String(nt).padStart(3)}  far buildings ${String(nb).padStart(6)}  ~tris ${String(tris).padStart(7)}  Ommeland prop tiles ${String(pt).padStart(3)} (R ${R})`);
  }
}
