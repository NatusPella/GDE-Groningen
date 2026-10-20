// Footprint clearance along the car roads (issue #77).
//   node scripts/world/building_clearance.mjs   (report; --write is gone, the OSM tile build derives this itself)
// OSM footprints and street centrelines are traced independently, so in old
// streets a house corner may sit 0.6 m from the centreline: the car drives
// into a wall that is not there on the photo (drive_audit.mjs 'botst').
// Every ground-level car road (major, normal, minor) keeps CLEAR m between its
// centreline and any footprint: edges near a road are cut into 1 m pieces and
// the vertices closer than CLEAR are pushed straight out from the centreline.
// Left alone: landmarks and their parts, the helipad wing, and any footprint a
// road runs into (passages, tunnels under a building: passages.js owns those).
// Idempotent: a second run finds nothing within CLEAR.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const CLEAR = 1.5; // 2.3 m (a yawed car's swing) pushed 1087 footprints and broke junction_sim_test (parked cars and queues shift); 1.5 m fixes the real clipping

const CAR = new Set(['major', 'normal', 'minor']);
const CELL = 40;

const segPoint = (px, py, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return [a[0] + t * dx, a[1] + t * dy];
};
const inPoly = (x, y, P) => {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    if ((P[i][1] > y) !== (P[j][1] > y) && x < ((P[j][0] - P[i][0]) * (y - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) c = !c;
  }
  return c;
};

function pass(data, clear) {
  const grid = new Map();
  const roads = data.roads.filter((r) => CAR.has(r.cat) && r.type !== 'track' && !r.bridge && !(r.z && r.z.some((z) => Math.abs(z) > 1)));
  for (const r of roads) {
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], b = r.pts[i + 1];
      const x0 = Math.floor((Math.min(a[0], b[0]) - clear - 2) / CELL), x1 = Math.floor((Math.max(a[0], b[0]) + clear + 2) / CELL);
      const y0 = Math.floor((Math.min(a[1], b[1]) - clear - 2) / CELL), y1 = Math.floor((Math.max(a[1], b[1]) + clear + 2) / CELL);
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
        const k = x + ',' + y;
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push([a, b]);
      }
    }
  }
  const near = (x, y) => grid.get(Math.floor(x / CELL) + ',' + Math.floor(y / CELL)) || [];
  // the closest centreline point to (x, y) within `limit`, else null
  const closest = (x, y, limit) => {
    let best = null, bd = limit;
    for (const [a, b] of near(x, y)) {
      const p = segPoint(x, y, a, b), d = Math.hypot(x - p[0], y - p[1]);
      if (d < bd) { bd = d; best = { p, d, n: [-(b[1] - a[1]), b[0] - a[0]] }; }
    }
    return best;
  };
  let fixed = 0, moved = 0, skipped = 0;
  for (const b of data.buildings) {
    if (b.landmark || b.landmarkKind || b.landmarkPart || b.helipad || b.parts) continue;
    const P = b.pts;
    let any = false;
    const ring = P.length > 1 && P[0][0] === P[P.length - 1][0] && P[0][1] === P[P.length - 1][1];
    const dense = [];
    for (let i = 0; i < P.length; i++) {
      dense.push(P[i]);
      if (i === P.length - 1) break;
      const a = P[i], c = P[i + 1], n = Math.min(60, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1])));
      for (let k = 1; k < n; k++) dense.push([a[0] + ((c[0] - a[0]) * k) / n, a[1] + ((c[1] - a[1]) * k) / n]);
    }
    for (const q of dense) if (closest(q[0], q[1], clear - 0.02)) { any = true; break; }
    if (!any) continue;
    // a road that runs into the footprint is a passage or a mapped overlap: leave it
    let through = false;
    for (const q of dense) {
      for (const [a, c] of near(q[0], q[1])) {
        const n = Math.max(1, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1])));
        for (let k = 0; k <= n && !through; k++) if (inPoly(a[0] + ((c[0] - a[0]) * k) / n, a[1] + ((c[1] - a[1]) * k) / n, P)) through = true;
        if (through) break;
      }
      if (through) break;
    }
    if (through) { skipped++; continue; }
    const out = [];
    const mid = [P.reduce((t, q) => t + q[0], 0) / P.length, P.reduce((t, q) => t + q[1], 0) / P.length];
    for (const q of dense) {
      const c = closest(q[0], q[1], clear - 0.02);
      if (!c) { out.push(q); continue; }
      let dx = q[0] - c.p[0], dy = q[1] - c.p[1];
      const d = Math.hypot(dx, dy);
      if (d < 1e-6) {
        // on the centreline: out along the segment's normal, to the side of the footprint's middle
        const nl = Math.hypot(c.n[0], c.n[1]) || 1;
        dx = c.n[0] / nl; dy = c.n[1] / nl;
        if (dx * (mid[0] - q[0]) + dy * (mid[1] - q[1]) < 0) { dx = -dx; dy = -dy; }
      } else { dx /= d; dy /= d; }
      out.push([Math.round((c.p[0] + dx * clear) * 100) / 100, Math.round((c.p[1] + dy * clear) * 100) / 100]);
      moved++;
    }
    const keep = out;
    if (ring) keep[keep.length - 1] = keep[0];
    b.pts = keep;
    fixed++;
  }
  return { fixed, moved, skipped };
}

export function clearFootprints(data, clear = CLEAR) {
  // (a pushed corner can bow the edge next to it back towards the road: until still)
  const total = { fixed: 0, moved: 0, skipped: 0, passes: 0 };
  for (let i = 0; i < 8; i++) {
    const r = pass(data, clear);
    total.passes++;
    total.skipped = r.skipped;
    if (!r.fixed) break;
    total.fixed += r.fixed;
    total.moved += r.moved;
  }
  return total;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) (async () => { // niet awaiten: loadworld.mjs laadt build_province.mjs, dat dit bestand weer importeert
  const { loadCityData } = await import('../lib/loadworld.mjs');
  const data = await loadCityData({ extras: false });
  const rep = clearFootprints(data);
  console.log(`footprints pushed back to ${CLEAR} m from a car road's centreline: ${rep.fixed} (${rep.moved} vertices); left alone, a road runs through: ${rep.skipped}`);
  // --write bestaat niet meer: de gebouwen van de stad komen uit de OSM-tegelbouw, die dit zelf afleidt (derive_tiles.mjs)
})();
