// The train routes out of the city and the rails of the countryside as the
// tile builders write them (docs/PROVINCIE-PLAN.md): what used to be the
// rails, routes and stations of game/ommeland.json.
//
//  - cityroutes_src.json: the six routes of the city's trains with the track
//    from the city's edge to their last stop in the old data (name, base
//    route, cut, kept stops, track, stops) and the nine stations along them;
//  - bakeCityRoutes: that track run on over the province's (or the
//    proefstrook's) lines to every station (corridorrail.js), once at build
//    time; the game splices the result onto the city's routes
//    (corridorrail.js applyCityRoutes);
//  - railLines: every rail way outside the city's data as flat polylines, for
//    the 3D track bed in the countryside (railway3d.js).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { provinceRailLines, extendRoutes } from '../../game/js/corridorrail.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const r1 = (v) => Math.round(v * 10) / 10;

export const loadCityRouteSource = (root = ROOT) => JSON.parse(fs.readFileSync(path.join(root, 'scripts/world/cityroutes_src.json'), 'utf8'));

// -> { routes, stations }: `lines` are the layer's train lines (global.routes);
// with `province` they are first matched to the routes (provinceRailLines),
// else the proefstrook's line ids decide (extendRoutes)
export function bakeCityRoutes(global, { province = false, root = ROOT } = {}) {
  const src = loadCityRouteSource(root);
  if (!province) {
    const x = extendRoutes(src, global);
    return { routes: x.routes, stations: x.stations };
  }
  const pl = provinceRailLines(src, global.routes);
  const x = extendRoutes(pl.om, { ...global, routes: pl.lines });
  return { routes: x.routes, stations: x.stations };
}

// The rail rows (worldbuilder buildRail: { pts }) as flat polylines [x, y, ...]
// lying outside `inside(x, y)` (the city's data) and off the city's own track
// (cityRails: its polylines [[x, y], ...]; the city draws that), the same way
// twice kept once. A way that touches either is cut into the runs outside
// (sampled every 10 m).
export function railLines(rows, inside0 = () => false, cityRails = []) {
  const out = [], seen = new Set();
  const CELL = 6, hit = new Map();
  for (const P of cityRails) {
    for (let i = 0; i < P.length - 1; i++) {
      const [ax, ay] = P[i], [bx, by] = P[i + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 3));
      for (let t = 0; t <= n; t++) {
        const k = Math.floor((ax + ((bx - ax) * t) / n) / CELL) * 100003 + Math.floor((ay + ((by - ay) * t) / n) / CELL);
        hit.set(k, 1);
      }
    }
  }
  const onCityRail = (x, y) => { const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (hit.has((cx + a) * 100003 + cy + b)) return true; return false; };
  const inside = (x, y) => inside0(x, y) || onCityRail(x, y);
  const flat = (P) => P.flatMap(([x, y]) => [r1(x), r1(y)]);
  for (const r of rows) {
    const P = r.pts;
    if (!P || P.length < 2) continue;
    const key = `${P[0][0]},${P[0][1]},${P[P.length - 1][0]},${P[P.length - 1][1]},${P.length}`;
    if (seen.has(key)) continue;
    seen.add(key);
    let touches = false;
    for (let i = 0; i < P.length && !touches; i++) {
      if (inside(P[i][0], P[i][1])) touches = true;
      else if (i < P.length - 1 && inside((P[i][0] + P[i + 1][0]) / 2, (P[i][1] + P[i + 1][1]) / 2)) touches = true;
    }
    if (!touches) { out.push(flat(P)); continue; }
    let run = null;
    const flush = () => { if (run && run.length > 1) out.push(flat(run)); run = null; };
    for (let i = 0; i < P.length - 1; i++) {
      const [ax, ay] = P[i], [bx, by] = P[i + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 10));
      for (let t = i === 0 ? 0 : 1; t <= n; t++) {
        const x = ax + ((bx - ax) * t) / n, y = ay + ((by - ay) * t) / n;
        if (!inside(x, y)) (run || (run = [])).push(t === n ? P[i + 1] : t === 0 ? P[i] : [x, y]);
        else flush();
      }
    }
    flush();
  }
  return out;
}
