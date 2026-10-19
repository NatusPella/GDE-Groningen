// The road graph of the whole province, for routing.js (the GPS) and police.js
// (units that follow the roads out of town). The rows come from the province
// layer's road net (scripts/world/build_province.mjs writes
// provincie-roads.json.gz next to the tiles): every car road of the tiles,
// as the tiles draw them, so a route runs over the roads you see and drive.
// OSM ways meet at shared nodes, so the graph joins them by position (half a
// metre); pieces cut off from the main network are hung on it by one costly
// link. The city graph stays routing.js's own; the two meet at gateways:
// nodes of this network near the city's edge that lie on a city street.
// Built on the first use. No DOM.
//
//   encodeRoadNet(rows) / decodeRoadNet(json)  the file's format
//   loadRoadNet(base)                          fetch + decode (browser)
//   setRoadNet(roads)                          [{ pts, kind, w, oneway, bridge }]: builds the graph
//   roadNetReady()                             true once set
//   snapRoad(x, y, maxD, foot)                 the nearest point on the main network within maxD, or null
//   roadCosts(snap, toward, free)              Dijkstra costs/predecessors from a snap to every node (cached)
//   roadPath(from, to, free)                   [[x, y], ...] from snap `from` to snap `to`, or null
//   roadPathNear(from, to, maxNodes)           a short A* way for a chase
//   roadPathToNode / roadPathFromNode          the same, ending / starting at a node
//   nodeXY(n), gatewayCandidates(bounds, band)
//
// kind: 1 motorway, 2 link, 3 primary/trunk, 4 secondary, 5 tertiary,
// 6 unclassified, 7 residential / living street.

export const KIND_OF_TYPE = {
  motorway: 1, motorway_link: 2, trunk: 3, trunk_link: 2, primary: 3, primary_link: 2, secondary: 4, secondary_link: 2,
  tertiary: 5, tertiary_link: 2, unclassified: 6, residential: 7, living_street: 7,
};

// ---- the file: [kind, width in dm, flags (1 one-way, 2 bridge), x0, y0, dx, dy, ...] in decimetres
export function encodeRoadNet(rows) {
  const out = [];
  for (const r of rows) {
    const kind = KIND_OF_TYPE[r.type];
    if (!kind || r.pts.length < 2) continue;
    const e = [kind, Math.round((r.width || 5) * 10), (r.oneway ? 1 : 0) | (r.bridge ? 2 : 0)];
    let px = 0, py = 0;
    for (const p of r.pts) {
      const x = Math.round(p[0] * 10), y = Math.round(p[1] * 10);
      e.push(x - px, y - py);
      px = x; py = y;
    }
    out.push(e);
  }
  return { roads: out };
}

export function decodeRoadNet(json) {
  return json.roads.map((e) => {
    const pts = [];
    let x = 0, y = 0;
    for (let i = 3; i < e.length; i += 2) { x += e[i]; y += e[i + 1]; pts.push([x / 10, y / 10]); }
    return { pts, kind: e[0], w: e[1] / 10, oneway: !!(e[2] & 1), bridge: !!(e[2] & 2) };
  });
}

export async function loadRoadNet(base = 'world/', file = 'provincie-roads.json.gz') {
  try {
    const r = await fetch(base + file);
    if (!r.ok || typeof DecompressionStream === 'undefined') return null;
    const raw = await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).text();
    return decodeRoadNet(JSON.parse(raw));
  } catch (e) {
    console.warn('road net not loaded', e);
    return null;
  }
}

let G = null;
let ROWS = null;
const CELL = 200;
// a piece cut off from the network further than this stays out of it
const STITCH_M = 1000;
const STITCH_COST = 4;
// a big piece (a village's worth of roads, #223) may hang on the network across a wider gap in the data
const STITCH_BIG_NODES = 100;
const STITCH_BIG_M = 6000;

function build(roads) {
  const t0 = performance.now();
  const ids = new Map();
  const xs = [], ys = [];
  const flat = [], fk = [];
  const nodeOf = (x, y) => {
    const key = (Math.round(x * 2) + 400000) * 800000 + (Math.round(y * 2) + 400000);
    let id = ids.get(key);
    if (id === undefined) { id = xs.length; ids.set(key, id); xs.push(x); ys.push(y); }
    return id;
  };
  // flat: a, b, length, one-way (1: a to b only, the way's own direction)
  for (const r of roads) {
    const p = r.pts;
    let a = nodeOf(p[0][0], p[0][1]);
    for (let i = 1; i < p.length; i++) {
      const b = nodeOf(p[i][0], p[i][1]);
      if (a === b) continue;
      flat.push(a, b, Math.hypot(xs[b] - xs[a], ys[b] - ys[a]), r.oneway ? 1 : 0);
      fk[flat.length / 4 - 1] = (r.kind | 0) | (r.bridge ? 16 : 0);
      a = b;
    }
  }
  stitch(xs, ys, flat);
  const N = xs.length, m = flat.length / 4;
  // forward: the way a car may drive; reverse: the same turned round, for costs
  // towards a target; undirected: connected parts and snapping
  // foot: for walkers and cyclists, who stay off the motorways (kind 1) and are
  // slow on their ramps and links (kind 2)
  const adjacency = (dir, foot = false) => {
    const pairs = [];
    for (let e = 0; e < m; e++) {
      const kd = (fk[e] | 0) & 15;
      if (foot && kd === 1) continue;
      const a = flat[e * 4], b = flat[e * 4 + 1], L = foot && kd === 2 ? flat[e * 4 + 2] * 2.5 : flat[e * 4 + 2], one = flat[e * 4 + 3];
      if (dir === 'und' || !one) pairs.push(a, b, L, b, a, L);
      else if (dir === 'fwd') pairs.push(a, b, L);
      else pairs.push(b, a, L);
    }
    const k = pairs.length / 3;
    const start = new Int32Array(N + 1);
    for (let e = 0; e < k; e++) start[pairs[e * 3] + 1]++;
    for (let i = 0; i < N; i++) start[i + 1] += start[i];
    const fill = start.slice(0, N);
    const to = new Int32Array(k), len = new Float32Array(k);
    for (let e = 0; e < k; e++) { const q = fill[pairs[e * 3]]++; to[q] = pairs[e * 3 + 1]; len[q] = pairs[e * 3 + 2]; }
    return { start, to, len };
  };
  const fwd = adjacency('fwd'), rev = adjacency('rev'), und = adjacency('und'), foot = adjacency('und', true);
  const start = und.start, to = und.to;
  // the main network: the biggest connected part (stray farm tracks stay out)
  const comp = new Int32Array(N).fill(-1);
  let main = -1, mainSize = 0;
  for (let s = 0, id = 0; s < N; s++) {
    if (comp[s] >= 0) continue;
    const stack = [s];
    comp[s] = id;
    let size = 0;
    while (stack.length) {
      const u = stack.pop();
      size++;
      for (let e = start[u]; e < start[u + 1]; e++) if (comp[to[e]] < 0) { comp[to[e]] = id; stack.push(to[e]); }
    }
    if (size > mainSize) { mainSize = size; main = id; }
    id++;
  }
  // edges of the main network in a grid, for snapping onto the nearest road: a, b, one-way
  const egrid = new Map(), egridFoot = new Map();
  for (let e = 0; e < m; e++) {
    const u = flat[e * 4], v = flat[e * 4 + 1], one = flat[e * 4 + 3];
    if (comp[u] !== main) continue;
    const kind = fk[e] | 0, grids = (kind & 15) === 1 ? [egrid] : [egrid, egridFoot];
    const cx0 = Math.floor(Math.min(xs[u], xs[v]) / CELL), cx1 = Math.floor(Math.max(xs[u], xs[v]) / CELL);
    const cy0 = Math.floor(Math.min(ys[u], ys[v]) / CELL), cy1 = Math.floor(Math.max(ys[u], ys[v]) / CELL);
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const k = cx * 100003 + cy;
        for (const g of grids) {
          let c = g.get(k);
          if (!c) g.set(k, (c = []));
          c.push(u, v, one, kind);
        }
      }
    }
  }
  G = {
    N, x: Float64Array.from(xs), y: Float64Array.from(ys), fwd, rev, und, foot, comp, main, mainSize, egrid, egridFoot,
    version: (G ? G.version : 0) + 1, cache: new Map(), ms: performance.now() - t0,
  };
}

// Road pieces that still don't touch the main network (a lane whose junction
// the data lost, a patch of roads behind a ditch) get one link across the
// field from their node nearest to it, in a few passes so a far patch can
// hang on a nearer one; the router avoids those links where it can.
function stitch(xs, ys, flat) {
  for (let pass = 0; pass < 4 && stitchPass(xs, ys, flat); pass++);
}

function stitchPass(xs, ys, flat) {
  const N = xs.length;
  const root = new Int32Array(N);
  for (let i = 0; i < N; i++) root[i] = i;
  const find = (i) => { while (root[i] !== i) i = root[i] = root[root[i]]; return i; };
  for (let e = 0; e < flat.length; e += 4) { const a = find(flat[e]), b = find(flat[e + 1]); if (a !== b) root[a] = b; }
  const size = new Int32Array(N);
  for (let i = 0; i < N; i++) size[find(i)]++;
  let main = 0;
  for (let i = 0; i < N; i++) if (size[i] > size[main]) main = i;
  const grid = new Map();
  for (let i = 0; i < N; i++) {
    if (find(i) !== main) continue;
    const k = Math.floor(xs[i] / CELL) * 100003 + Math.floor(ys[i] / CELL);
    let c = grid.get(k);
    if (!c) grid.set(k, (c = []));
    c.push(i);
  }
  const best = new Map();
  for (let i = 0; i < N; i++) {
    const r = find(i);
    if (r === main) continue;
    let b = best.get(r);
    if (!b) best.set(r, (b = { d: size[r] >= STITCH_BIG_NODES ? STITCH_BIG_M : STITCH_M, a: -1, n: -1 }));
    const R = Math.ceil(b.d / CELL);
    const cx = Math.floor(xs[i] / CELL), cy = Math.floor(ys[i] / CELL);
    for (let u = -R; u <= R; u++) {
      for (let v = -R; v <= R; v++) {
        const c = grid.get((cx + u) * 100003 + cy + v);
        if (!c) continue;
        for (const n of c) {
          const d = Math.hypot(xs[n] - xs[i], ys[n] - ys[i]);
          if (d < b.d) { b.d = d; b.a = i; b.n = n; }
        }
      }
    }
  }
  let added = 0;
  for (const b of best.values()) if (b.a >= 0) { flat.push(b.a, b.n, b.d * STITCH_COST, 0); added++; }
  return added;
}

export function roadGraphBuilt() {
  return !!G;
}

export function roadNetReady() {
  return !!G;
}

// Builds the graph from the decoded rows (once; a new set replaces it).
export function setRoadNet(roads) {
  if (!roads || !roads.length) { G = null; ROWS = null; return false; }
  ROWS = roads;
  build(roads);
  return true;
}

// the rows the graph was built from, or null
export function roadNetRows() {
  return ROWS;
}

// bumps on every rebuild (node numbers change)
export function roadGraphVersion() {
  return G ? G.version : 0;
}

export function nodeXY(n) {
  return [G.x[n], G.y[n]];
}

// The nearest point on the main network (foot: leaving out the motorways): { x, y, a, b, da, db, d, one } (on the
// edge a-b, da/db metres from its ends, d from the query point, one: 1 when the
// edge may only be driven from a to b, kind and bridge of its road), or null.
export function snapRoad(x, y, maxD = 600, foot = false) {
  if (!G) return null;
  const grid = foot ? G.egridFoot : G.egrid;
  let best = null;
  for (let r = CELL; ; r = Math.min(r * 2, maxD)) {
    let bd = r;
    const n = Math.ceil(r / CELL);
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    for (let i = -n; i <= n; i++) {
      for (let j = -n; j <= n; j++) {
        const c = grid.get((cx + i) * 100003 + (cy + j));
        if (!c) continue;
        for (let k = 0; k < c.length; k += 4) {
          const a = c[k], b = c[k + 1];
          const ax = G.x[a], ay = G.y[a], dx = G.x[b] - ax, dy = G.y[b] - ay, l2 = dx * dx + dy * dy;
          let t = l2 > 1e-9 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const px = ax + dx * t, py = ay + dy * t, d = Math.hypot(px - x, py - y);
          if (d < bd) { bd = d; const L = Math.sqrt(l2); best = { x: px, y: py, a, b, da: t * L, db: (1 - t) * L, d, one: c[k + 2], kind: c[k + 3] & 15, bridge: !!(c[k + 3] & 16) }; }
        }
      }
    }
    if (best || r >= maxD) return best;
  }
}

const snapKey = (s, rev, free) => `${free === 'foot' ? 'w' : free ? 'u' : rev ? 'r' : 'f'}${s.a}:${s.b}:${Math.round(s.da)}:${s.one}`;

// Costs and predecessors over the whole network. Forward: the cheapest way
// from the snap to every node. Reverse (`toward`): from every node to the
// snap, and a node's predecessor is the next node on its way there. `free`:
// the one-ways ignored ('foot': and the motorways closed, for walkers and cyclists), the last resort when a one-way dead end (a ramp cut at
// the data's edge) leaves no way.
export function roadCosts(from, toward = false, free = false) {
  const key = snapKey(from, toward, free);
  let c = G.cache.get(key);
  if (c) return c;
  const adj = free === 'foot' ? G.foot : free ? G.und : toward ? G.rev : G.fwd;
  const one = free ? 0 : from.one;
  const dist = new Float64Array(G.N).fill(Infinity), prev = new Int32Array(G.N).fill(-1);
  const heap = [];
  const push = (d, v) => {
    heap.push([d, v]);
    for (let i = heap.length - 1; i > 0;) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[i], heap[p]] = [heap[p], heap[i]];
      i = p;
    }
  };
  // on a one-way edge a to b only: leaving the snap runs on to b; arriving at it comes in from a
  const seed = (n, d) => { if (d < dist[n]) { dist[n] = d; push(d, n); } };
  if (toward) {
    seed(from.a, from.da);
    if (!one) seed(from.b, from.db);
  } else {
    seed(from.b, from.db);
    if (!one) seed(from.a, from.da);
  }
  while (heap.length) {
    const top = heap[0], last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      for (let i = 0; ;) {
        let k = 2 * i + 1;
        if (k >= heap.length) break;
        if (k + 1 < heap.length && heap[k + 1][0] < heap[k][0]) k++;
        if (heap[k][0] >= heap[i][0]) break;
        [heap[i], heap[k]] = [heap[k], heap[i]];
        i = k;
      }
    }
    const [d, u] = top;
    if (d > dist[u]) continue;
    for (let e = adj.start[u]; e < adj.start[u + 1]; e++) {
      const v = adj.to[e], nd = d + adj.len[e];
      if (nd >= dist[v]) continue;
      dist[v] = nd;
      prev[v] = u;
      push(nd, v);
    }
  }
  c = { dist, prev };
  if (G.cache.size > 6) G.cache.delete(G.cache.keys().next().value);
  G.cache.set(key, c);
  return c;
}

function chain(n, prev, pts) {
  for (; n >= 0; n = prev[n]) pts.push([G.x[n], G.y[n]]);
  return pts;
}

// From snap `from` to snap `to`, along the costs towards `to` (cached per
// target, so rerouting to the same place is cheap).
export function roadPath(from, to, free = false) {
  if (!from || !to) return null;
  if (from.a === to.a && from.b === to.b) {
    // on the same piece of road: straight there unless it is a one-way the wrong way
    const dir = to.da - from.da;
    if (free || !from.one || dir >= 0) return [[from.x, from.y], [to.x, to.y]];
  }
  const { dist, prev } = roadCosts(to, true, free);
  // out of from along its edge: on to b, or back to a unless it is a one-way
  const cb = dist[from.b] + from.db, ca = from.one && !free ? Infinity : dist[from.a] + from.da;
  if (!Number.isFinite(Math.min(ca, cb))) return null;
  const pts = chain(ca < cb ? from.a : from.b, prev, [[from.x, from.y]]);
  pts.push([to.x, to.y]);
  return pts;
}

// A short way from snap `from` towards snap `to` for a driver giving chase
// (police.js): A* over the one-way graph that settles at most maxNodes, so
// it never walks the whole network like roadCosts. When the budget runs
// out the path ends at the settled node nearest the target.
export function roadPathNear(from, to, maxNodes = 2500) {
  if (!G || !from || !to) return null;
  if (from.a === to.a && from.b === to.b && (!from.one || to.da >= from.da)) return [[from.x, from.y], [to.x, to.y]];
  const tx = to.x, ty = to.y;
  const h = (n) => Math.hypot(G.x[n] - tx, G.y[n] - ty);
  const dist = new Map(), prev = new Map(), done = new Set();
  const heap = [];
  const push = (f, n) => {
    heap.push([f, n]);
    for (let i = heap.length - 1; i > 0;) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[i], heap[p]] = [heap[p], heap[i]];
      i = p;
    }
  };
  const pop = () => {
    const top = heap[0], last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      for (let i = 0; ;) {
        let k = 2 * i + 1;
        if (k >= heap.length) break;
        if (k + 1 < heap.length && heap[k + 1][0] < heap[k][0]) k++;
        if (heap[k][0] >= heap[i][0]) break;
        [heap[i], heap[k]] = [heap[k], heap[i]];
        i = k;
      }
    }
    return top;
  };
  const seed = (n, d) => { if (!(dist.get(n) <= d)) { dist.set(n, d); prev.set(n, -1); push(d + h(n), n); } };
  seed(from.b, from.db);
  if (!from.one) seed(from.a, from.da);
  // arriving on the target's edge: from a (on to b's side only when two-way)
  const endA = to.a, endB = to.one ? -1 : to.b;
  let best = -1, bestH = Infinity, hit = -1;
  while (heap.length && done.size < maxNodes) {
    const [, u] = pop();
    if (done.has(u)) continue;
    done.add(u);
    const hu = h(u);
    if (hu < bestH) { bestH = hu; best = u; }
    if (u === endA || u === endB) { hit = u; break; }
    const du = dist.get(u);
    for (let e = G.fwd.start[u]; e < G.fwd.start[u + 1]; e++) {
      const v = G.fwd.to[e], nd = du + G.fwd.len[e];
      if (dist.get(v) <= nd) continue;
      dist.set(v, nd);
      prev.set(v, u);
      push(nd + h(v), v);
    }
  }
  const end = hit >= 0 ? hit : best;
  if (end < 0) return null;
  const pts = [];
  for (let n = end; n >= 0; n = prev.get(n)) pts.push([G.x[n], G.y[n]]);
  pts.push([from.x, from.y]);
  pts.reverse();
  if (hit >= 0) pts.push([to.x, to.y]);
  return pts;
}

// From snap `from` to node n.
export function roadPathToNode(from, n, free = false) {
  const { dist, prev } = roadCosts(from, false, free);
  if (!Number.isFinite(dist[n])) return null;
  const pts = chain(n, prev, []).reverse();
  pts.unshift([from.x, from.y]);
  return pts;
}

// From node n to snap `to`.
export function roadPathFromNode(n, to, free = false) {
  const { dist, prev } = roadCosts(to, true, free);
  if (!Number.isFinite(dist[n])) return null;
  const pts = chain(n, prev, []);
  pts.push([to.x, to.y]);
  return pts;
}

export function gatewayCandidates(bounds, band) {
  const [x0, y0, x1, y1] = bounds;
  const out = [];
  for (let n = 0; n < G.N; n++) {
    if (G.comp[n] !== G.main) continue;
    const x = G.x[n], y = G.y[n];
    if (x < x0 || x > x1 || y < y0 || y > y1) continue;
    if (Math.min(x - x0, x1 - x, y - y0, y1 - y) > band) continue;
    out.push(n);
  }
  return out;
}

export function roadGraphStats() {
  return G ? { nodes: G.N, main: G.mainSize, ms: Math.round(G.ms) } : null;
}
