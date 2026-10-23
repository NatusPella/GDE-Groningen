// Building passages: the corridors that footways and streets cut through a
// footprint (collision.js keeps walkers inside them, vehicle.js and the spot
// checks treat them as open ground, models3d_buildings.js cuts the opening).
import { closestPointOnSegment, pointInPolygon, polygonBounds } from './util.js';
import { rectDist } from './museumplan.js';

// A way that enters a footprint and leaves it again is a building passage
// when OSM maps it as one (tunnel=building_passage, covered, arcades), when
// it is a street (traffic drives it, so it must be a real opening), or when
// it is a footway or cycleway run of a plausible poortje length. Longer
// footway runs are indoor corridors, and the outlines of pedestrian areas
// that clip a facade or a corner by a metre are no passage: those stay wall.
const PASSAGE_MAX = 60;
const MAPPED_MAX = 150;
const CLIP_MIN = 2.5;
const SAMPLE = 0.5;

function keepRun(r, len, mapped) {
  if (mapped) return len <= MAPPED_MAX;
  if (r.cat !== 'foot' && r.cat !== 'cycle') return len <= MAPPED_MAX;
  if (r.type === 'pedestrian') return false;
  return len >= CLIP_MIN && len <= PASSAGE_MAX;
}

function passageHalfWidth(r) {
  const w = r.width || 3;
  if (r.cat === 'foot' || r.cat === 'cycle') return Math.max(0.9, w / 2);
  return Math.max(1.2, w / 2 - 0.2);
}

function pathLength(P) {
  let L = 0;
  for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
  return L;
}

function outlineDist(x, y, pts) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const cp = closestPointOnSegment(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (cp.dist2 < best) best = cp.dist2;
  }
  return Math.sqrt(best);
}

// How deep into the footprint a run gets (sampled along it).
function runDepth(run, ring) {
  let best = 0;
  for (let i = 0; i < run.length - 1; i++) {
    const [ax, ay] = run[i], [bx, by] = run[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.5));
    for (let k = 0; k <= n; k++) best = Math.max(best, outlineDist(ax + (bx - ax) * k / n, ay + (by - ay) * k / n, ring));
  }
  return best;
}

// The OSM passage (tunnel=building_passage, covered, ...) this run follows:
// its middle within a few metres of a mapped passage way.
function mappedKind(map, run) {
  const ways = map.passageWays;
  if (!ways || !ways.length) return null;
  const L = pathLength(run);
  let s = L / 2, mx = run[0][0], my = run[0][1];
  for (let i = 1; i < run.length; i++) {
    const l = Math.hypot(run[i][0] - run[i - 1][0], run[i][1] - run[i - 1][1]);
    if (s <= l && l > 0) { mx = run[i - 1][0] + (run[i][0] - run[i - 1][0]) * s / l; my = run[i - 1][1] + (run[i][1] - run[i - 1][1]) * s / l; break; }
    s -= l;
  }
  for (const w of ways) {
    const [x0, y0, x1, y1] = w.bounds;
    if (mx < x0 - 4 || mx > x1 + 4 || my < y0 - 4 || my > y1 + 4) continue;
    for (let i = 0; i < w.pts.length - 1; i++) {
      if (closestPointOnSegment(mx, my, w.pts[i][0], w.pts[i][1], w.pts[i + 1][0], w.pts[i + 1][1]).dist2 < 16) return w.kind;
    }
  }
  return null;
}

// Corridors (polyline + half-width) of every way that runs through `b`,
// computed once per footprint on first contact. OSM often splits a passage
// into its own way ending on the wall nodes, so a run may also start or end
// at a way end that sits on the outline, and a passage made of several ways
// meeting inside the footprint (the cycle bridge through the Groninger
// Museum) counts once its pieces together reach the outline twice.
const EDGE_TOL = 1;
const JOIN_TOL = 0.4;
// a way ending this far inside a footprint reads as a door on its facade
// (a street: a garage door)
const DOOR_DEPTH = 3.5;
const doorDepth = (r) => (r.cat === 'foot' || r.cat === 'cycle' ? DOOR_DEPTH : 6);
function computePassages(map, b) {
  const out = [], doors = [], runs = [];
  if (b.noPassages) return out;
  const [minx, miny, maxx, maxy] = b.bounds;
  const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
  const reach = Math.max(maxx - minx, maxy - miny) / 2 + 2;
  for (const r of map.roadsNear(cx, cy, reach)) {
    const rb = r.bounds;
    if (rb && (rb[2] < minx || rb[0] > maxx || rb[3] < miny || rb[1] > maxy)) continue;
    const P = r.pts;
    let run = null, s0 = false, lastOut = null;
    const finish = (s1) => {
      // a footway that only grazes the facade (never deeper in than its own
      // width) is a pavement drawn a little into the wall, not a passage
      // (a street that clips a corner stays open for the traffic on it, but
      // there is nothing to show)
      // (unless OSM maps it as a passage: a poortje through a wall of a metre, as Portal Groningen at the Werkmanbrug, is one)
      const graze = run.length > 1 && runDepth(run, b.pts) <= Math.max(1.0, passageHalfWidth(r)) && !mappedKind(map, run);
      if (run.length > 1 && (!graze || (r.cat !== 'foot' && r.cat !== 'cycle'))) runs.push({ pts: run, r, s0, s1, graze });
      run = null;
    };
    for (let i = 0; i < P.length - 1; i++) {
      const [ax, ay] = P[i], [bx, by] = P[i + 1];
      if (Math.max(ax, bx) < minx - 1 || Math.min(ax, bx) > maxx + 1 || Math.max(ay, by) < miny - 1 || Math.min(ay, by) > maxy + 1) {
        lastOut = [bx, by];
        continue;
      }
      const len = Math.hypot(bx - ax, by - ay);
      const n = Math.max(1, Math.ceil(len / SAMPLE));
      const last = i === P.length - 2;
      for (let k = 0; k <= n; k++) {
        if (k === n && !last) break;
        const t = k / n;
        const x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
        const inside = x > minx && x < maxx && y > miny && y < maxy && pointInPolygon(x, y, b.pts);
        if (inside) {
          if (!run) {
            s0 = !!lastOut || outlineDist(x, y, b.pts) < EDGE_TOL;
            run = lastOut ? [lastOut] : [];
            if (k === 0 || !lastOut) run.push([x, y]);
          } else if (k === 0 || (k === n && last)) run.push([x, y]);
        } else {
          if (run) { run.push([x, y]); finish(true); }
          lastOut = [x, y];
        }
      }
    }
    if (run) {
      const e = run[run.length - 1];
      finish(outlineDist(e[0], e[1], b.pts) < EDGE_TOL);
    }
    for (const e of [P[0], P[P.length - 1]]) {
      if (!(e[0] > minx - 1 && e[0] < maxx + 1 && e[1] > miny - 1 && e[1] < maxy + 1)) continue;
      const d = outlineDist(e[0], e[1], b.pts);
      // (a way that stops a few metres inside the wall has its door on the facade)
      if (!r.noDoors && (d < EDGE_TOL || (d < doorDepth(r) && pointInPolygon(e[0], e[1], b.pts))) && deadEnd(map, r, e)) {
        const door = [e[0], e[1]];
        door.cat = r.cat;
        doors.push(door);
      }
    }
  }
  // join runs that meet inside the footprint
  const parent = runs.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const near = (p, q) => Math.abs(p[0] - q[0]) < JOIN_TOL && Math.abs(p[1] - q[1]) < JOIN_TOL;
  runs.forEach((ra, i) => {
    for (const [end, open] of [[ra.pts[0], ra.s0], [ra.pts[ra.pts.length - 1], ra.s1]]) {
      if (open) continue;
      runs.forEach((rb, j) => { if (j !== i && rb.pts.some((q) => near(q, end))) parent[find(i)] = find(j); });
    }
  });
  const groups = new Map();
  runs.forEach((ra, i) => { const k = find(i); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(ra); });
  for (const g of groups.values()) {
    const ends = [];
    for (const ra of g) {
      if (ra.s0) ends.push(ra.pts[0]);
      if (ra.s1) ends.push(ra.pts[ra.pts.length - 1]);
    }
    const mapped = g.map((ra) => mappedKind(map, ra.pts)).find(Boolean) || null;
    // (ends further apart than 1,5 m; a mapped passage through a thin wall, 0,4 m)
    const apart = mapped ? 0.4 : 1.5;
    if (ends.length < 2 || !ends.some((e) => Math.hypot(e[0] - ends[0][0], e[1] - ends[0][1]) > apart)) continue;
    // how far the passage takes you: its longest piece or the span between its ends
    let len = Math.max(...g.map((ra) => pathLength(ra.pts)));
    for (const a of ends) for (const e of ends) len = Math.max(len, Math.hypot(a[0] - e[0], a[1] - e[1]));
    for (const ra of g) {
      if (!keepRun(ra.r, len, mapped)) continue;
      out.push({ pts: ra.pts, hw: passageHalfWidth(ra.r), len, mapped, cat: ra.r.cat, road: ra.r, shown: (len >= CLIP_MIN || !!mapped) && !ra.graze });
    }
  }
  linkDoors(b, doors, out);
  b._doors = doors.filter((e) => !e.hall).map((e) => doorOnFacade(b, e));
  return out;
}

// Where a door at way end `e` sits: the nearest point of the outline, with
// the edge's direction and outward normal.
function doorOnFacade(b, e) {
  const P = b.pts;
  let best = Infinity, at = null;
  for (let i = 0; i < P.length - 1; i++) {
    const cp = closestPointOnSegment(e[0], e[1], P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]);
    if (cp.dist2 >= best) continue;
    best = cp.dist2;
    const dx = P[i + 1][0] - P[i][0], dy = P[i + 1][1] - P[i][1], l = Math.hypot(dx, dy) || 1;
    at = { x: cp.x, y: cp.y, ux: dx / l, uy: dy / l, edge: l };
  }
  // outward: the side of the edge away from the footprint
  const nx = -at.uy, ny = at.ux;
  const out = pointInPolygon(at.x + nx * 0.3, at.y + ny * 0.3, P) ? -1 : 1;
  return { ...at, nx: nx * out, ny: ny * out, cat: e.cat };
}

// Doors of `b` (way ends at its facade), as facade points { x, y, ux, uy, nx, ny, cat, edge }.
export function doorsOf(map, b) {
  passagesOf(map, b);
  return b._doors || [];
}

// Footways that stop dead at a wall are doors. Two doors of one building
// that face each other through it (the Academiegebouw's front entrance and
// its courtyard door) are joined by a straight hall, so a courtyard whose
// only way out is through the building can be left on foot.
const HALL_MIN = 4, HALL_MAX = 45, HALL_HW = 1.1;
function deadEnd(map, way, e) {
  for (const o of map.roadsNear(e[0], e[1], 1)) {
    // (a ramp down into an underground garage goes on below the street)
    if (o === way || ((o.tunnel || o.layer < 0) && !offGradeWay(way))) continue;
    for (const q of o.pts) if (Math.abs(q[0] - e[0]) < 0.3 && Math.abs(q[1] - e[1]) < 0.3) return false;
  }
  return true;
}
function linkDoors(b, doors, out) {
  if (doors.length < 2) return;
  const linked = new Set();
  for (let i = 0; i < doors.length; i++) {
    let best = -1, bestD = HALL_MAX;
    for (let j = 0; j < doors.length; j++) {
      if (j === i) continue;
      const d = Math.hypot(doors[j][0] - doors[i][0], doors[j][1] - doors[i][1]);
      if (d < HALL_MIN || d >= bestD || !throughInterior(b, doors[i], doors[j], d)) continue;
      best = j; bestD = d;
    }
    if (best < 0) continue;
    const key = Math.min(i, best) + ',' + Math.max(i, best);
    if (linked.has(key)) continue;
    linked.add(key);
    doors[i].hall = doors[best].hall = true;
    out.push({ pts: [doors[i], doors[best]], hw: HALL_HW, hall: true });
  }
}

function throughInterior(b, a, c, d) {
  const n = Math.ceil(d / SAMPLE);
  for (let k = 1; k < n; k++) {
    const t = k / n, s = t * d;
    if (s < 1.5 || d - s < 1.5) continue;
    if (!pointInPolygon(a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, b.pts)) return false;
  }
  return true;
}

export function passagesOf(map, b) {
  return b.passages || (b.passages = computePassages(map, b));
}

// Nearest corridor centreline point to (x, y), in a shared result object.
const _c = { d: Infinity, x: 0, y: 0, hw: 0 };
export function nearestCorridor(passages, x, y) {
  _c.d = Infinity;
  for (const ps of passages) {
    const P = ps.pts;
    for (let i = 0; i < P.length - 1; i++) {
      const cp = closestPointOnSegment(x, y, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]);
      // rank by distance relative to each corridor's own width
      const d = Math.sqrt(cp.dist2);
      if (d - ps.hw < _c.d - _c.hw) { _c.d = d; _c.x = cp.x; _c.y = cp.y; _c.hw = ps.hw; }
    }
  }
  return _c;
}

// Is (x, y) inside one of the corridors cut through footprint `b`?
// Walkable rooms inside a footprint (b.rooms, museumplan.js; a room with
// `shut` is closed off, heist.js): the room of (x, y) or null. `who`: 'walker', 'bike' (rooms open to bikes) or 'car' (none).
export function roomAt(b, x, y, slack = 0, who = 'walker') {
  if (!b.rooms || who === 'car') return null;
  for (const r of b.rooms) if (!r.shut && (who !== 'bike' || r.bikes) && rectDist(r, x, y) < slack) return r;
  return null;
}

export function inPassage(map, b, x, y, slack = 0, who = 'walker') {
  if (b.rooms && roomAt(b, x, y, slack, who)) return true;
  const passages = passagesOf(map, b);
  if (!passages.length) return false;
  const c = nearestCorridor(passages, x, y);
  return c.d < c.hw + slack;
}

// --- ways through solid blocks ------------------------------------------------------

const RUN_STEP = 0.5;
const GRAZE_DEPTH = 1.0;

// Ways at another level than the footprints: viaducts, the sunken ring,
// tunnels, bridges and decks (OSM layer).
export function offGradeWay(r) {
  return !!(r.tunnel || (r.z && r.z.some((z) => Math.abs(z) > 1.5)) || (r.layer && r.layer !== 0));
}

// Stretches of the centreline of `r` inside footprint `b`: [{ pts, s0, s1 }]
// (arc length along the way), plus the way's total length.
export function runsInside(r, b) {
  const [minx, miny, maxx, maxy] = b.bounds;
  const P = r.pts, runs = [];
  let run = null, s = 0;
  for (let i = 0; i < P.length - 1; i++) {
    const [ax, ay] = P[i], [bx, by] = P[i + 1];
    const L = Math.hypot(bx - ax, by - ay);
    if (Math.max(ax, bx) < minx || Math.min(ax, bx) > maxx || Math.max(ay, by) < miny || Math.min(ay, by) > maxy) {
      if (run) { runs.push(run); run = null; }
      s += L;
      continue;
    }
    const n = Math.max(1, Math.ceil(L / RUN_STEP));
    const last = i === P.length - 2;
    for (let k = 0; k < n + (last ? 1 : 0); k++) {
      const t = k / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
      if (x > minx && x < maxx && y > miny && y < maxy && pointInPolygon(x, y, b.pts)) {
        if (!run) run = { pts: [], s0: s + L * t, s1: 0 };
        run.pts.push([x, y]);
        run.s1 = s + L * t;
      } else if (run) { runs.push(run); run = null; }
    }
    s += L;
  }
  if (run) runs.push(run);
  return { runs, total: s };
}

function inCorridor(ps, x, y, slack) {
  const P = ps.pts, r = ps.hw + slack;
  for (let i = 0; i < P.length - 1; i++) {
    if (closestPointOnSegment(x, y, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]).dist2 < r * r) return true;
  }
  return false;
}

// What a stretch of way `r` inside `b` is (passagecheck.js lists the classes):
// 'opening' (a shown passage), 'graze' (clips the facade), 'door' (ends just
// inside the wall), 'hole' (open for walkers and traffic, nothing shown) or
// 'solid' (straight through a wall).
export function classifyRun(map, r, b, run, total) {
  let depth = 0, shown = 0, open = 0;
  const passages = passagesOf(map, b);
  const mine = passages.filter((p) => p.road === r || p.hall);
  for (const [x, y] of run.pts) {
    depth = Math.max(depth, outlineDist(x, y, b.pts));
    let s = false, o = false;
    for (const ps of mine.length ? mine : passages) {
      if (!inCorridor(ps, x, y, 0.05)) continue;
      o = true;
      if (ps.shown || ps.hall) { s = true; break; }
    }
    if (s) shown++;
    if (o) open++;
  }
  const n = run.pts.length;
  const atEnd = run.s0 < RUN_STEP * 1.5 || run.s1 > total - RUN_STEP * 1.5;
  let cls;
  if (b.rooms || shown >= n * 0.9) cls = 'opening';
  else if (depth <= GRAZE_DEPTH) cls = 'graze';
  else if (atEnd && depth <= doorDepth(r)) cls = 'door';
  else if (open >= n * 0.5) cls = 'hole';
  else cls = 'solid';
  return { cls, depth, len: run.s1 - run.s0 };
}

// Polyline P without the [a, b] arc-length spans (sorted, disjoint): the pieces left.
function cutSpans(P, spans) {
  const pieces = [];
  let cur = [], s = 0;
  const inSpan = (t) => spans.some(([a, b]) => t > a && t < b);
  if (!inSpan(0)) cur.push(P[0]);
  for (let i = 0; i < P.length - 1; i++) {
    const [ax, ay] = P[i], [bx, by] = P[i + 1];
    const L = Math.hypot(bx - ax, by - ay);
    const at = (t) => [ax + (bx - ax) * (t - s) / (L || 1), ay + (by - ay) * (t - s) / (L || 1)];
    for (const [a, b] of spans) {
      if (a >= s && a < s + L) { cur.push(at(a)); pieces.push(cur); cur = []; }
      if (b >= s && b < s + L) cur.push(at(b));
    }
    if (!inSpan(s + L)) cur.push(P[i + 1]);
    s += L;
  }
  pieces.push(cur);
  return pieces.filter((q) => q.length > 1);
}

function wayLength(P) {
  let L = 0;
  for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
  return L;
}

// Footways and cycleways that run through a footprint which is no passage
// (the indoor streets of the UMCG, pedestrian-area outlines crossing a
// block, paths that end deep inside a building) are cut at the facade when
// the map loads: nothing is drawn, walked or routed through the wall, and
// the cut ends become doors (doorsOf). Streets are left alone (passages.js
// opens every street through a building). Tunnels without a height profile
// (garage ramps and basement drives under a block) would be drawn at street
// level straight through the walls: their stretches inside are cut as well.
// The first piece keeps the way's place in map.roads, the others are
// appended. Returns what was cut.
const underground = (r) => (r.tunnel || r.layer < 0) && !(r.z && r.z.some((z) => Math.abs(z) > 1.5));
export function clipWaysInBuildings(map) {
  const cut = [];
  const n0 = map.roads.length;
  let removed = false;
  for (let ri = 0; ri < n0; ri++) {
    const r = map.roads[ri];
    if (r.pts.length < 2 || (!underground(r) && ((r.cat !== 'foot' && r.cat !== 'cycle') || offGradeWay(r)))) continue;
    const rb = r.bounds;
    let spans = null;
    for (const b of map.buildingGrid.query(rb[0], rb[1], rb[2], rb[3])) {
      const [x0, y0, x1, y1] = b.bounds;
      if (x1 < rb[0] || x0 > rb[2] || y1 < rb[1] || y0 > rb[3] || b.rooms) continue;
      const { runs, total } = runsInside(r, b);
      for (const run of runs) {
        if (classifyRun(map, r, b, run, total).cls !== 'solid') continue;
        (spans || (spans = [])).push([Math.max(0, run.s0 - RUN_STEP / 2), Math.min(total, run.s1 + RUN_STEP / 2)]);
        const m = run.pts[run.pts.length >> 1];
        cut.push({ road: r, building: b, x: m[0], y: m[1], len: run.s1 - run.s0 });
      }
    }
    if (!spans) continue;
    spans.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const sp of spans) {
      const last = merged[merged.length - 1];
      if (last && sp[0] <= last[1]) last[1] = Math.max(last[1], sp[1]);
      else merged.push(sp.slice());
    }
    // (the pieces of an area's outline end at the wall without a door)
    const P = r.pts, ring = Math.hypot(P[0][0] - P[P.length - 1][0], P[0][1] - P[P.length - 1][1]) < 0.5;
    const ways = cutSpans(P, merged).filter((q) => wayLength(q) >= 1).map((pts) => ({ ...r, pts, bounds: polygonBounds(pts), clipped: true, noDoors: ring }));
    if (ways.length) map.roads[ri] = ways[0];
    else { map.roads[ri] = null; removed = true; }
    for (let i = 1; i < ways.length; i++) map.roads.push(ways[i]);
  }
  if (!cut.length) return cut;
  if (removed) map.roads = map.roads.filter(Boolean);
  // passages and doors are worked out again with the cut ways
  for (const b of map.buildings) if (b.passages) { b.passages = null; b._doors = null; }
  return cut;
}
