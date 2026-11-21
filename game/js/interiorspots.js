// Which place lies in which building (epic Interieurs, #1150): the facilities of the world (FAC.all rows: cafés, the police,
// pharmacies, garages, fuel stations, shops) become spots on a grid, and a building asks for the one inside it or at its
// front door. The shop windows already do the same for the shop types (shopspots.js); this covers what the window kit has no
// type for. Pure: rows in, the nearest spot out.
import { pointInPolygon, distToRing } from './shopbind.js';
import { kindOfFacility } from './interiorkinds.js';
import { openRing } from './interiorframe.js';

const CELL = 32;
const key = (cx, cy) => cx * 100003 + cy;

export function makeSpotIndex(rows = []) {
  const grid = new Map();
  let n = 0;
  for (const f of rows) {
    if (!Number.isFinite(f.x) || !Number.isFinite(f.y)) continue;
    const k = kindOfFacility(f);
    if (!k) continue;
    const kk = key(Math.floor(f.x / CELL), Math.floor(f.y / CELL));
    let l = grid.get(kk);
    if (!l) grid.set(kk, l = []);
    l.push({ x: f.x, y: f.y, kind: k.kind, sub: k.sub, name: f.name || '' });
    n++;
  }
  return { grid, n };
}

// the spot in the ring, or within `reach` m of the front edge ({ ax, ay, tx, ty, len }); { kind, sub, name } or null
export function spotFor(index, ring, edge = null, reach = 4) {
  if (!index || !index.n) return null;
  const R = openRing(ring);
  if (R.length < 3) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of R) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  let best = null, bd = Infinity;
  for (let cx = Math.floor((x0 - reach) / CELL); cx <= Math.floor((x1 + reach) / CELL); cx++) {
    for (let cy = Math.floor((y0 - reach) / CELL); cy <= Math.floor((y1 + reach) / CELL); cy++) {
      const l = index.grid.get(key(cx, cy));
      if (!l) continue;
      for (const s of l) {
        const inside = pointInPolygon(s.x, s.y, R);
        let d = inside ? 0 : distToRing(s.x, s.y, R);
        if (!inside && d > reach) continue;
        if (!inside && edge) {
          const dx = edge.tx, dy = edge.ty;
          const t = Math.max(0, Math.min(edge.len, (s.x - edge.ax) * dx + (s.y - edge.ay) * dy));
          d = Math.hypot(s.x - (edge.ax + dx * t), s.y - (edge.ay + dy * t));
          if (d > reach) continue;
        }
        if (d < bd) { bd = d; best = s; }
      }
    }
  }
  return best ? { kind: best.kind, sub: best.sub, name: best.name, x: best.x, y: best.y } : null;
}
