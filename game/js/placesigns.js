// Place name boards and junction signposts on province scale
// (docs/PROVINCIE-PLAN.md 2.14, issue #73). Pure data and geometry, no scene:
// streetfurniture.js furnitureForTile calls placeSignItems per tile and the
// game draws the items (streetfurniture3d.js).
//
//   placeSignItems({ roads, towns, inTile, blocked }) -> [{ k, x, y, a, text, ... }]
//
// towns: [{ n, x, y, kind }] (worldplaces.js worldTownSigns). Items:
//   placesign: the board where a road enters a place's built-up area, on the
//     right of the traffic coming in; text: [name]; a: the travel direction;
//     `end: true` is the board for the traffic leaving (name struck through)
//   wegwijzer: a signpost before a junction of three or more roads, on the
//     right of the traffic arriving; text: ['↑ Name', '← Name', ...] (up to 3,
//     by the way each arm leads, ahead first), a: the travel direction
// Both are deterministic: the same roads and places give the same items, in
// whichever tile or worker.

// where a place's built-up area starts, from its node (m), and the weight of a
// kind (a bigger place hides a smaller one inside its own circle)
export const ENTRY = { city: 2600, town: 900, village: 420, hamlet: 190 };
// a place with its own measured built-up radius (`r`, m, from the data) uses that instead of its kind's guess
export const entryOf = (t) => (t.r > 50 && t.r < 6000 ? t.r : ENTRY[t.kind]);
const RANK = { city: 0, town: 1, village: 2, hamlet: 3 };
// what a signpost points to: reach (m) from a junction and weight by kind
const POINT = { city: { max: 40000, w: 0.15 }, town: { max: 22000, w: 0.06 }, village: { max: 9000, w: 0 }, hamlet: { max: 3500, w: -0.05 } };

// the roads a board stands along: not motorways (their gantries sign them)
const LOCAL = new Set(['major', 'normal', 'minor']);
const FAST = new Set(['motorway', 'trunk', 'motorway_link', 'trunk_link']);
const SIGNED = new Set(['major', 'normal']);

const nodeKey = (p) => Math.round(p[0] * 100) * 1e7 + Math.round(p[1] * 100);
const zAt = (r, i, t) => (r.z ? r.z[i] + (r.z[i + 1] - r.z[i]) * t : 0);

// Where the road r crosses the circle of radius R round (cx, cy) going in:
// [{ x, y, ux, uy, i, t }], travelling the way the road runs or against it.
function entries(r, cx, cy, R) {
  const P = r.pts, out = [];
  for (let i = 0; i < P.length - 1; i++) {
    const ax = P[i][0], ay = P[i][1], dx = P[i + 1][0] - ax, dy = P[i + 1][1] - ay, L2 = dx * dx + dy * dy;
    if (L2 < 1e-9) continue;
    // |a + t d - c|^2 = R^2
    const fx = ax - cx, fy = ay - cy, b = 2 * (fx * dx + fy * dy), c = fx * fx + fy * fy - R * R;
    const disc = b * b - 4 * L2 * c;
    if (disc < 0) continue;
    const sq = Math.sqrt(disc);
    for (const t of [(-b - sq) / (2 * L2), (-b + sq) / (2 * L2)]) {
      if (t < 0 || t >= 1) continue;
      const L = Math.sqrt(L2), x = ax + dx * t, y = ay + dy * t;
      // inward when the way along the segment gets nearer the centre
      const along = (dx * (cx - x) + dy * (cy - y)) / L;
      if (Math.abs(along) < 0.05 * L) continue;
      const fwd = along > 0;
      out.push({ x, y, ux: (fwd ? dx : -dx) / L, uy: (fwd ? dy : -dy) / L, fwd, i, t });
    }
  }
  return out;
}

const placeName = (t) => t.n || t.name || '';

function placeBoards(roads, towns, add, blocked) {
  const circles = towns.filter((t) => ENTRY[t.kind] && placeName(t));
  for (const t of circles) {
    const R = entryOf(t), rank = RANK[t.kind];
    const seen = [];
    for (const r of roads) {
      if (!r.pts || r.pts.length < 2 || !LOCAL.has(r.cat) || FAST.has(r.type) || r.bridge || r.tunnel) continue;
      // (a quick reject: the road's box clear of the circle)
      let near = false;
      for (const p of r.pts) if (Math.abs(p[0] - t.x) < R + 400 && Math.abs(p[1] - t.y) < R + 400) { near = true; break; }
      if (!near) continue;
      for (const e0 of entries(r, t.x, t.y, R)) {
        if (Math.abs(zAt(r, e0.i, e0.t)) > 1.5) continue;
        // inside a bigger place's own circle the board would be a second one
        if (circles.some((o) => RANK[o.kind] < rank && Math.hypot(o.x - e0.x, o.y - e0.y) < entryOf(o))) continue;
        // in: the way into the place; out: the same spot the other way, the
        // "einde bebouwde kom" board (the name struck through)
        for (const out of [false, true]) {
          // the entry's direction runs inward; a one-way road only serves its own direction
          if (r.oneway && (out ? e0.fwd : !e0.fwd)) continue;
          const e = out ? { ...e0, ux: -e0.ux, uy: -e0.uy } : e0;
          if (seen.some((s) => Math.hypot(s.x - e.x, s.y - e.y) < 30 && s.ux * e.ux + s.uy * e.uy > 0.5)) continue;
          seen.push(e);
          const off = r.width / 2 + 2.2;
          const x = e.x - e.uy * off, y = e.y + e.ux * off;
          if (blocked && blocked(r, x, y)) continue;
          add({ k: 'placesign', x, y, a: Math.atan2(e.uy, e.ux), text: [placeName(t)], v: t.kind, end: out, src: 'rule' });
        }
      }
    }
  }
}

// The place an arm leads to: from (x, y) along (ux, uy), the best place within
// 20 degrees of that bearing and its reach, by closeness and weight.
export function armDestination(x, y, ux, uy, towns, skip) {
  let best = null, bs = -Infinity;
  for (const t of towns) {
    const P = POINT[t.kind], nm = placeName(t);
    if (!P || !nm || nm === skip) continue;
    const dx = t.x - x, dy = t.y - y, d = Math.hypot(dx, dy);
    if (d < 500 || d > P.max) continue;
    const c = (dx * ux + dy * uy) / d;
    if (c < 0.94) continue;
    const s = c - d / (P.max * 2) + P.w;
    if (s > bs) { bs = s; best = nm; }
  }
  return best;
}

const arrow = (cross, dot) => (dot > 0.5 ? '↑' : cross > 0 ? '→' : '←');

function junctionBoards(roads, towns, add, blocked, inTile) {
  const pointing = towns.filter((t) => POINT[t.kind]);
  if (!pointing.length) return;
  // nodes shared by roads of the signed classes: node key -> arms
  const nodes = new Map();
  const arm = (r, p, q) => {
    const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy);
    if (l < 1e-6) return;
    const k = nodeKey(p);
    (nodes.get(k) || nodes.set(k, { x: p[0], y: p[1], arms: [] }).get(k)).arms.push({ r, ux: dx / l, uy: dy / l });
  };
  for (const r of roads) {
    if (!r.pts || r.pts.length < 2 || !SIGNED.has(r.cat) || FAST.has(r.type)) continue;
    arm(r, r.pts[0], r.pts[1]);
    arm(r, r.pts[r.pts.length - 1], r.pts[r.pts.length - 2]);
  }
  for (const nd of nodes.values()) {
    if (!inTile(nd.x, nd.y)) continue;
    // arms of one road continuing (the same road both sides) count once each
    const arms = nd.arms;
    if (arms.length < 3 || arms.length > 5) continue;
    const dest = arms.map((a) => armDestination(nd.x, nd.y, a.ux, a.uy, pointing));
    for (let ai = 0; ai < arms.length; ai++) {
      const a = arms[ai];
      // traffic arrives along the arm towards the node: travel direction -a
      const ux = -a.ux, uy = -a.uy;
      if (a.r.oneway) {
        // a one-way arm (geometry running away from the node) is not arrived on
        const P = a.r.pts, atStart = nodeKey(P[0]) === nodeKey([nd.x, nd.y]);
        if (atStart) continue;
      }
      const lines = [];
      const used = new Set();
      for (let bi = 0; bi < arms.length; bi++) {
        if (bi === ai || !dest[bi] || used.has(dest[bi])) continue;
        used.add(dest[bi]);
        const b = arms[bi];
        const dot = ux * b.ux + uy * b.uy, cross = ux * b.uy - uy * b.ux;
        if (dot < -0.7) continue; // back the way you came
        lines.push({ t: `${arrow(cross, dot)} ${dest[bi]}`, o: dot > 0.5 ? 0 : cross > 0 ? 2 : 1 });
      }
      if (!lines.length) continue;
      lines.sort((p, q) => p.o - q.o || (p.t < q.t ? -1 : 1));
      const off = a.r.width / 2 + 2;
      // 9 m before the junction, on the right of the arriving traffic
      const x = nd.x + a.ux * 9 - uy * off, y = nd.y + a.uy * 9 + ux * off;
      if (blocked && blocked(a.r, x, y)) continue;
      add({ k: 'wegwijzer', x, y, a: Math.atan2(uy, ux), text: lines.slice(0, 3).map((l) => l.t), src: 'rule' });
    }
  }
}

export function placeSignItems({ roads = [], towns = [], inTile = () => true, blocked = null }) {
  const out = [];
  if (!towns.length) return out;
  const add = (it) => { if (inTile(it.x, it.y)) out.push(it); };
  placeBoards(roads, towns, add, blocked);
  junctionBoards(roads, towns, add, blocked, inTile);
  return out;
}
