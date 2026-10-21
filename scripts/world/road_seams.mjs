// Seams where roads meet and where lane counts change (issue #130).
//   node scripts/world/road_seams.mjs [--json out.json]
// Pure functions over a roads array (game/stad.json rows); the test
// (scripts/road_seams_test.mjs) runs them on made-up junctions and on the map.
//   laneJump     two car ways meet end to end (nothing else at the node) and
//                the lanes per direction differ: the lane lines stop dead
//   widthJump    the same, and the paved widths differ by more than 1.5 m: a
//                step in the kerb line (a *_link or a change of class is a slip road)
//   gap          a car way ends 0.3-4 m from another one's line without
//                touching it (same level) and heads for that line: a sliver of grass between them
//   overlap      two car ways at the same level run side by side so close that
//                their ribbons overlap for 6 m or more, with no shared node
//   crossNoNode  two car ways at the same level cross without a shared node
//                (two ribbons in one ground layer: z-fighting)
import { laneLayout } from '../../game/js/lanes.js';

const CAR = new Set(['major', 'normal', 'minor']);
const key = (p) => Math.round(p[0] * 100) + ',' + Math.round(p[1] * 100);
const level = (r) => r.layer ?? (r.tunnel ? -1 : r.bridge ? 1 : 0);
const len = (r) => r.pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - r.pts[i - 1][0], p[1] - r.pts[i - 1][1]) : 0), 0);

function segDist(px, py, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-9;
  const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / L2));
  return Math.hypot(a[0] + dx * t - px, a[1] + dy * t - py);
}
function proper(a, b, c, d) {
  const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = o(a, b, c), d2 = o(a, b, d), d3 = o(c, d, a), d4 = o(c, d, b);
  return d1 * d2 < -1e-9 && d3 * d4 < -1e-9;
}

// lanes in travel direction away from the node, and against it
function armLanes(r, atStart) {
  const lay = laneLayout(r);
  let out = lay.lanes.filter((q) => q.dir === 1).length, inn = lay.lanes.filter((q) => q.dir === -1).length;
  // `out` = lanes along pts; seen from the node at the road's end they run towards it
  return atStart ? [out, inn] : [inn, out];
}
const awayDir = (r, atStart) => {
  const P = r.pts, a = atStart ? P[0] : P[P.length - 1], b = atStart ? P[1] : P[P.length - 2];
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
};

export function auditSeams(roads) {
  const car = roads.filter((r) => CAR.has(r.cat) && r.pts.length > 1);
  const found = { laneJump: [], widthJump: [], gap: [], overlap: [], crossNoNode: [] };
  const nodes = new Map();
  for (const r of roads) {
    if (r.pts.length < 2) continue;
    r.pts.forEach((p, i) => { const k = key(p); if (!nodes.has(k)) nodes.set(k, []); nodes.get(k).push([r, i]); });
  }
  // two ways end to end
  for (const list of nodes.values()) {
    if (list.length !== 2) continue;
    const [[a, ia], [b, ib]] = list;
    if (a === b || !CAR.has(a.cat) || !CAR.has(b.cat) || level(a) !== level(b)) continue;
    const ea = ia === 0 || ia === a.pts.length - 1, eb = ib === 0 || ib === b.pts.length - 1;
    if (!ea || !eb) continue;
    const da = awayDir(a, ia === 0), db = awayDir(b, ib === 0);
    if (da[0] * db[0] + da[1] * db[1] > -0.8) continue; // not a through joint
    if (a.roundabout || b.roundabout || a.type.endsWith('_link') !== b.type.endsWith('_link')) continue;
    const at = a.pts[ia];
    const [ao, ai] = armLanes(a, ia === 0), [bo, bi] = armLanes(b, ib === 0);
    // a's lanes leaving the node must meet b's lanes entering it
    if (ao !== bi || ai !== bo) found.laneJump.push({ at, a: a.name, b: b.name, lanes: [[ao, ai], [bo, bi]] });
    else if (Math.abs(a.width - b.width) > 1.5 && a.cat === b.cat) found.widthJump.push({ at, a: a.name, b: b.name, widths: [a.width, b.width] });
  }
  // the segments of the car ways by 30 m cell, for the gap lookup and for overlap and crossings
  const G = 30, grid = new Map();
  const cells = (a, b, f) => { for (let gx = Math.floor((Math.min(a[0], b[0]) - 8) / G); gx <= Math.floor((Math.max(a[0], b[0]) + 8) / G); gx++) for (let gy = Math.floor((Math.min(a[1], b[1]) - 8) / G); gy <= Math.floor((Math.max(a[1], b[1]) + 8) / G); gy++) f(gx + ',' + gy); };
  car.forEach((r, ri) => { for (let i = 0; i < r.pts.length - 1; i++) cells(r.pts[i], r.pts[i + 1], (k) => { if (!grid.has(k)) grid.set(k, []); grid.get(k).push([ri, i]); }); });
  // gaps: a free end close to another way's line (the cells pad every segment by 8 m: all ways within 4 m are in the end's cell)
  for (const r of car) {
    for (const i of [0, r.pts.length - 1]) {
      const p = r.pts[i];
      if ((nodes.get(key(p)) || []).some(([o]) => o !== r && CAR.has(o.cat))) continue;
      const near = [...new Set((grid.get(Math.floor(p[0] / G) + ',' + Math.floor(p[1] / G)) || []).map(([ri]) => ri))].sort((a, b) => a - b);
      for (const o of near.map((ri) => car[ri])) {
        if (o === r || level(o) !== level(r)) continue;
        let best = Infinity, foot = null;
        for (let j = 0; j < o.pts.length - 1; j++) { const d = segDist(p[0], p[1], o.pts[j], o.pts[j + 1]); if (d < best) { best = d; foot = j; } }
        if (!(best > 0.3 && best < 4 && best > o.width / 2 + 0.01 - 0.3)) continue;
        // the way has to head for the other line: two ways that start side by side (a dual road's carriageways, two service roads
        // running on in parallel) are no gap, and a hairpin back onto the other line is not one a join could close (stad_wegen.mjs closeGaps)
        const nb = r.pts[i === 0 ? 1 : r.pts.length - 2], hl = Math.hypot(p[0] - nb[0], p[1] - nb[1]) || 1;
        const a = o.pts[foot], b = o.pts[foot + 1], dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1e-9)));
        const qx = a[0] + dx * t, qy = a[1] + dy * t;
        if (((qx - p[0]) * (p[0] - nb[0]) + (qy - p[1]) * (p[1] - nb[1])) / (hl * best) < 0.5) continue;
        found.gap.push({ at: p, a: r.name, b: o.name, d: +best.toFixed(2) });
        break;
      }
    }
  }
  // overlap and crossings
  const shares = (a, b) => a.pts.some((p) => (nodes.get(key(p)) || []).some(([o]) => o === b));
  const pairs = new Map();
  for (const bucket of grid.values()) {
    for (let x = 0; x < bucket.length; x++) for (let y = x + 1; y < bucket.length; y++) {
      const [ra, ia] = bucket[x], [rb, ib] = bucket[y];
      if (ra === rb) continue;
      const pk = ra < rb ? ra + ':' + rb : rb + ':' + ra;
      let st = pairs.get(pk);
      if (!st) pairs.set(pk, st = { a: car[ra], b: car[rb], cross: null, ov: new Set(), at: null });
      const A = car[ra], B = car[rb];
      if (level(A) !== level(B)) continue;
      const a0 = A.pts[ia], a1 = A.pts[ia + 1], b0 = B.pts[ib], b1 = B.pts[ib + 1];
      if (proper(a0, a1, b0, b1)) st.cross = st.cross || a0;
      // sample A's segment against B's segment, parallel and closer than the half widths
      const L = Math.hypot(a1[0] - a0[0], a1[1] - a0[1]);
      const dax = (a1[0] - a0[0]) / (L || 1), day = (a1[1] - a0[1]) / (L || 1);
      const Lb = Math.hypot(b1[0] - b0[0], b1[1] - b0[1]) || 1;
      if (Math.abs(dax * (b1[0] - b0[0]) / Lb + day * (b1[1] - b0[1]) / Lb) < 0.9) continue;
      const lim = (A.width + B.width) / 2 - 1;
      for (let t = 0; t <= L; t += 1) {
        const px = a0[0] + dax * t, py = a0[1] + day * t;
        if (segDist(px, py, b0, b1) < lim) { st.ov.add(Math.round(px) + ',' + Math.round(py)); st.at = st.at || [px, py]; }
      }
    }
  }
  for (const st of pairs.values()) {
    const sh = shares(st.a, st.b);
    if (st.cross && !sh) found.crossNoNode.push({ at: st.cross, a: st.a.name, b: st.b.name });
    if (st.ov.size >= 6 && !sh) found.overlap.push({ at: st.at, a: st.a.name, b: st.b.name, m: st.ov.size });
  }
  return found;
}

if (import.meta.url === new URL(process.argv[1], 'file:///').href || process.argv[1]?.endsWith('road_seams.mjs')) {
  const fs = await import('node:fs');
  const { loadStadData } = await import('../lib/loadworld.mjs');
  const data = await loadStadData();
  const f = auditSeams(data.roads);
  for (const [k, v] of Object.entries(f)) { console.log(k.padEnd(12), v.length); for (const q of v.slice(0, 5)) console.log('   ', JSON.stringify(q)); }
  const j = process.argv.indexOf('--json');
  if (j > 0) fs.writeFileSync(process.argv[j + 1], JSON.stringify(f));
}
