// 3D BAG for the province (docs/PROVINCIE-PLAN.md 0.1, issue #2): reads
// data/world/3dbag_province.json.gz (scripts/world/fetch_3dbag.py --province;
// 3D BAG, TU Delft and 3DGI, CC BY 4.0) and finds the record of an OSM
// building: the BAG id of its ref:bag tag, else the record whose centre lies
// inside the footprint with an area within 25 % (as pack_tiles.mjs joinAttrs
// does for the city).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { bagKey } from '../../game/js/buildingheights.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const PROVINCE_BAG = path.join(ROOT, 'data/world/3dbag_province.json.gz');
const CELL = 16;

// the file's rows as records: { id, c: [x, y], a, hmax, h50?, hg, roof? }
export function loadProvinceBag(file = PROVINCE_BAG) {
  if (!fs.existsSync(file)) return [];
  const d = JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString('utf8'));
  return d.rows.map((r) => {
    const o = { id: String(r[0]), c: [r[1], r[2]], a: r[3], hmax: r[4], hg: r[6] };
    if (r[5] !== null) o.h50 = r[5];
    if (r[7] !== null) o.roof = d.roofs[r[7]];
    return o;
  });
}

const polyArea = (P) => { let a = 0; for (let i = 0; i < P.length; i++) { const [x0, y0] = P[i], [x1, y1] = P[(i + 1) % P.length]; a += x0 * y1 - x1 * y0; } return Math.abs(a / 2); };
function inPoly(x, y, P) {
  let inside = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i], [xj, yj] = P[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// (pts, tags) => record | null, with the match counts in `.stats`
export function bagMatcher(records) {
  const byId = new Map();
  const grid = new Map();
  for (const r of records) {
    byId.set(r.id, r);
    const k = `${Math.floor(r.c[0] / CELL)},${Math.floor(r.c[1] / CELL)}`;
    (grid.get(k) || grid.set(k, []).get(k)).push(r);
  }
  const stats = { id: 0, centre: 0, none: 0 };
  const match = (pts, tags = {}) => {
    for (const ref of String(tags['ref:bag'] || '').split(';')) {
      const r = ref.trim() && byId.get(bagKey(ref.trim()));
      if (r) { stats.id++; return r; }
    }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    const area = polyArea(pts) || 1;
    let best = null, bd = Infinity;
    for (let i = Math.floor(x0 / CELL); i <= Math.floor(x1 / CELL); i++) {
      for (let j = Math.floor(y0 / CELL); j <= Math.floor(y1 / CELL); j++) {
        for (const r of grid.get(`${i},${j}`) || []) {
          if (!inPoly(r.c[0], r.c[1], pts)) continue;
          const ratio = r.a / area;
          if (ratio < 0.75 || ratio > 1.34) continue;
          const d = Math.abs(Math.log(ratio));
          if (d < bd) { bd = d; best = r; }
        }
      }
    }
    if (best) stats.centre++; else stats.none++;
    return best;
  };
  match.stats = stats;
  return match;
}
