// Sidewalks of profiled ways (ramps, cuttings) hanging over the lanes of a
// carriageway 0.3-4 m lower beside or under them (outside their own lanes):
// m² per pair, worst first.
//   node scripts/overhang_audit.mjs
// Needs the vendored three.js once: cd desktop && npm run stage
import './node3d.mjs';
import fs from 'node:fs';
const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
await import('../game/js/player.js');
const { closestPointOnSegment } = await import('../game/js/util.js');
const RS = await import('../game/js/roadsurface.js');
const root = new URL('../game/', import.meta.url);
const { loadCityData } = await import('./lib/loadworld.mjs');
const data = await loadCityData();
const map = new GameMap(data);
RS.setRoadNetwork(map);
const CAR = new Set(['major', 'normal', 'minor']);
const zAt = (o, k, t) => (o.z ? o.z[k] + (o.z[k + 1] - o.z[k]) * t : 0);
const dirOf = (Q, k) => { const dx = Q[k + 1][0] - Q[k][0], dy = Q[k + 1][1] - Q[k][1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
const nearest = (o, x, y) => { let best = Infinity, bk = 0, bt = 0; const Q = o.pts; for (let k = 0; k < Q.length - 1; k++) { const c = closestPointOnSegment(x, y, Q[k][0], Q[k][1], Q[k + 1][0], Q[k + 1][1]); if (c.dist2 < best) { best = c.dist2; bk = k; bt = c.t; } } return [Math.sqrt(best), bk, bt]; };
const lanesBelow = (x, y, h, self) => {
  const [ds, sk] = nearest(self, x, y);
  if (ds < self.width / 2) return null;
  const sd = dirOf(self.pts, sk);
  for (const o of map.roadGrid.query(x - 8, y - 8, x + 8, y + 8)) {
    if (o === self || !CAR.has(o.cat) || o.pts.length < 2) continue;
    const Q = o.pts, hw = o.width / 2;
    for (let k = 0; k < Q.length - 1; k++) {
      const c = closestPointOnSegment(x, y, Q[k][0], Q[k][1], Q[k + 1][0], Q[k + 1][1]);
      if (c.dist2 > hw * hw) continue;
      const d = h - zAt(o, k, c.t);
      const od = dirOf(Q, k);
      if (d > 0.3 && d < 4) return o;
    }
  }
  return null;
};
let total = 0;
const per = new Map();
for (const r of map.roads) {
  if (!r.z || r.bridge || !CAR.has(r.cat) || r.pts.length < 2) continue;
  const g = RS.roadSurfaceGeometries(r).sidewalk;
  if (!g) continue;
  const P = g.attributes.position.array, I = g.index.array;
  for (let f = 0; f < I.length; f += 3) {
    const a = I[f] * 3, b = I[f + 1] * 3, c = I[f + 2] * 3;
    const ux = P[b] - P[a], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vz = P[c + 2] - P[a + 2];
    const area = Math.abs(ux * vz - uz * vx) / 2;
    if (area < 1e-4) continue;
    const N = 4; let hit = 0, cnt = 0, who = null;
    for (let i = 0; i <= N; i++) for (let j = 0; i + j <= N; j++) {
      const s = (i + 1 / 3) / (N + 1), t = (j + 1 / 3) / (N + 1);
      if (s + t > 1) continue;
      cnt++;
      const x = P[a] + ux * s + vx * t, z = P[a + 2] + uz * s + vz * t, h = P[a + 1] + (P[b + 1] - P[a + 1]) * s + (P[c + 1] - P[a + 1]) * t;
      const o = lanesBelow(x, z, h, r);
      if (o) { hit++; who = o; }
    }
    if (!hit) continue;
    const m2 = area * hit / cnt;
    total += m2;
    const key = `${r.name || r.type} over ${who.name || who.type}`;
    const e = per.get(key) || per.set(key, { m2: 0, at: [P[a].toFixed(0), P[a + 2].toFixed(0)] }).get(key);
    e.m2 += m2;
  }
}
for (const [k, e] of [...per].sort((p, q) => q[1].m2 - p[1].m2).slice(0, 15)) console.log(e.m2.toFixed(1).padStart(7), 'm2', k, e.at.join(','));
console.log(`sidewalk over lower lanes: ${total.toFixed(1)} m2`);
process.exit(0);
