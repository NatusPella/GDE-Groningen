// A road graph over the Ommeland, so routing.js can show the way to a place
// outside the city map (carbid at boer Roelf's, Rotor Roelf on Eelde, a farm
// out in the polders) and back into Stad from there. It joins the real roads
// (countryreal.js REAL.roads) and, past the real data, the polder grid
// (countryfield.js edgeRoad). The OSM ways are simplified, so crossings and
// T-junctions often lack a shared node: roads that cross are split where
// they cross (bridges excepted) and a road that ends right beside another is
// joined to it. The city graph stays routing.js's own; the two meet at
// gateways: Ommeland road points near the city's edge that lie on a city
// street. Built lazily (rebuilt when a route leaves the polder window). No DOM.
//
//   countryReady(real)              true once REAL is loaded (and the graph is built)
//   snapCountry(x, y, maxD)         the nearest point on the main network within maxD, or null
//   countryCosts(snap)              Dijkstra costs/predecessors from a snap to every node (cached)
//   countryPath(from, to)           [[x, y], ...] from snap `from` to snap `to`, or null
//   countryPathToNode(from, n)      same, ending at node n
//   countryCover(pts)               grow the polder grid to cover these points (before snapping)
//   nodeXY(n)                       [x, y]
//   gatewayCandidates(bounds, band) nodes of the main network inside bounds and within band m of its edge
import { BLOCK, ROAD_IN, ROAD_W, edgeRoad, realActive } from './countryfield.js';

let G = null;
let REALDATA = null;
const CELL = 200;
// a road ending this close to another one meets it there
const JOIN_M = 15;
// a road piece cut off from the network further than this stays out of it
const STITCH_M = 1000;
const STITCH_COST = 4;
// how far past the real roads the polder grid is built (and grown on demand)
const POLDER_MARGIN = 6000;
const PC = ROAD_IN + ROAD_W / 2;

function build(real, need = null) {
  const t0 = performance.now();
  // ---- segments: the real roads, then the polder grid
  const sx0 = [], sy0 = [], sx1 = [], sy1 = [], sroad = [], sbridge = [], sone = [];
  const ends = [];
  let rid = 0;
  let wx0 = Infinity, wy0 = Infinity, wx1 = -Infinity, wy1 = -Infinity;
  for (const r of real.roads) {
    const p = r.pts;
    for (let i = 0; i < p.length - 1; i++) {
      if (p[i][0] === p[i + 1][0] && p[i][1] === p[i + 1][1]) continue;
      sx0.push(p[i][0]); sy0.push(p[i][1]); sx1.push(p[i + 1][0]); sy1.push(p[i + 1][1]); sroad.push(rid); sbridge.push(!!r.bridge); sone.push(!!r.oneway);
    }
    for (const q of p) { wx0 = Math.min(wx0, q[0]); wy0 = Math.min(wy0, q[1]); wx1 = Math.max(wx1, q[0]); wy1 = Math.max(wy1, q[1]); }
    ends.push(p[0][0], p[0][1], rid, p.at(-1)[0], p.at(-1)[1], rid);
    rid++;
  }
  let win = null;
  if (realActive() && Number.isFinite(wx0)) {
    win = [wx0 - POLDER_MARGIN, wy0 - POLDER_MARGIN, wx1 + POLDER_MARGIN, wy1 + POLDER_MARGIN];
    if (need) win = [Math.min(win[0], need[0]), Math.min(win[1], need[1]), Math.max(win[2], need[2]), Math.max(win[3], need[3])];
    // Polder roads run just inside a block's low-x / low-y edge; one block's
    // road and the next block's meet over the main ditch, so the grid is a
    // lattice through (i * BLOCK + PC, j * BLOCK + PC).
    const i0 = Math.floor(win[0] / BLOCK), i1 = Math.floor(win[2] / BLOCK), j0 = Math.floor(win[1] / BLOCK), j1 = Math.floor(win[3] / BLOCK);
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const x = i * BLOCK + PC, y = j * BLOCK + PC;
        for (const s of [0, 1]) {
          if (!edgeRoad(i, j, s)) continue;
          sx0.push(x); sy0.push(y); sx1.push(s ? x + BLOCK : x); sy1.push(s ? y : y + BLOCK); sroad.push(rid); sbridge.push(false); sone.push(false);
          ends.push(x, y, rid, s ? x + BLOCK : x, s ? y : y + BLOCK, rid);
          rid++;
        }
      }
    }
  }
  const S = sx0.length;
  const splits = new Array(S).fill(null);
  const split = (s, t) => (splits[s] || (splits[s] = [0, 1])).push(t);
  const bx0 = new Float64Array(S), bx1 = new Float64Array(S), by0 = new Float64Array(S), by1 = new Float64Array(S);
  for (let s = 0; s < S; s++) {
    bx0[s] = Math.min(sx0[s], sx1[s]); bx1[s] = Math.max(sx0[s], sx1[s]);
    by0[s] = Math.min(sy0[s], sy1[s]); by1[s] = Math.max(sy0[s], sy1[s]);
  }
  const extra = [];
  // ---- segment grid
  const sgrid = new Map();
  for (let s = 0; s < S; s++) {
    const cx0 = Math.floor(Math.min(sx0[s], sx1[s]) / CELL), cx1 = Math.floor(Math.max(sx0[s], sx1[s]) / CELL);
    const cy0 = Math.floor(Math.min(sy0[s], sy1[s]) / CELL), cy1 = Math.floor(Math.max(sy0[s], sy1[s]) / CELL);
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const k = cx * 100003 + cy;
        let c = sgrid.get(k);
        if (!c) sgrid.set(k, (c = []));
        c.push(s);
      }
    }
  }
  // ---- crossings: split both roads where they cross (counted once, in the crossing's own cell)
  for (const [k, c] of sgrid) {
    for (let a = 0; a < c.length; a++) {
      const s = c[a];
      if (sbridge[s]) continue;
      const ax = sx0[s], ay = sy0[s], adx = sx1[s] - ax, ady = sy1[s] - ay;
      for (let b = a + 1; b < c.length; b++) {
        const u = c[b];
        if (bx0[u] > bx1[s] || bx1[u] < bx0[s] || by0[u] > by1[s] || by1[u] < by0[s]) continue;
        if (sroad[u] === sroad[s] || sbridge[u]) continue;
        const bdx = sx1[u] - sx0[u], bdy = sy1[u] - sy0[u];
        const den = adx * bdy - ady * bdx;
        if (Math.abs(den) < 1e-9) continue;
        const ex = sx0[u] - ax, ey = sy0[u] - ay;
        const t = (ex * bdy - ey * bdx) / den, v = (ex * ady - ey * adx) / den;
        if (t < 0 || t > 1 || v < 0 || v > 1) continue;
        const x = ax + adx * t, y = ay + ady * t;
        if (Math.floor(x / CELL) * 100003 + Math.floor(y / CELL) !== k) continue;
        split(s, t);
        split(u, v);
      }
    }
  }
  // ---- T-junctions: a road end close beside another road joins it there
  for (let e = 0; e < ends.length; e += 3) {
    const x = ends[e], y = ends[e + 1], r = ends[e + 2];
    let best = -1, bd = JOIN_M, bt = 0;
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const c = sgrid.get((cx + i) * 100003 + cy + j);
        if (!c) continue;
        for (const s of c) {
          if (sroad[s] === r) continue;
          const dx = sx1[s] - sx0[s], dy = sy1[s] - sy0[s], l2 = dx * dx + dy * dy;
          let t = ((x - sx0[s]) * dx + (y - sy0[s]) * dy) / l2;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const d = Math.hypot(sx0[s] + dx * t - x, sy0[s] + dy * t - y);
          if (d < bd) { bd = d; best = s; bt = t; }
        }
      }
    }
    if (best < 0) continue;
    split(best, bt);
    if (bd > 0.5) extra.push(x, y, sx0[best] + (sx1[best] - sx0[best]) * bt, sy0[best] + (sy1[best] - sy0[best]) * bt);
  }
  // ---- nodes and edges
  const ids = new Map();
  const xs = [], ys = [];
  const flat = [];
  const nodeOf = (x, y) => {
    const key = (Math.round(x * 2) + 200000) * 400000 + (Math.round(y * 2) + 200000);
    let id = ids.get(key);
    if (id === undefined) { id = xs.length; ids.set(key, id); xs.push(x); ys.push(y); }
    return id;
  };
  // flat: a, b, length, one-way (1: a to b only, the way's own direction)
  const edge = (a, b, one = 0) => {
    if (a === b) return;
    const L = Math.hypot(xs[b] - xs[a], ys[b] - ys[a]);
    flat.push(a, b, L, one);
  };
  for (let s = 0; s < S; s++) {
    const ts = splits[s] ? splits[s].sort((p, q) => p - q) : [0, 1];
    const dx = sx1[s] - sx0[s], dy = sy1[s] - sy0[s];
    let a = nodeOf(sx0[s], sy0[s]);
    for (let i = 1; i < ts.length; i++) {
      if (ts[i] - ts[i - 1] < 1e-6) continue;
      const b = i === ts.length - 1 ? nodeOf(sx1[s], sy1[s]) : nodeOf(sx0[s] + dx * ts[i], sy0[s] + dy * ts[i]);
      edge(a, b, sone[s] ? 1 : 0);
      a = b;
    }
  }
  for (let e = 0; e < extra.length; e += 4) edge(nodeOf(extra[e], extra[e + 1]), nodeOf(extra[e + 2], extra[e + 3]));
  stitch(xs, ys, flat);
  const N = xs.length, m = flat.length / 4;
  // forward: the way a car may drive; reverse: the same turned round, for costs
  // towards a target; undirected: connected parts and snapping
  const adjacency = (dir) => {
    const pairs = [];
    for (let e = 0; e < m; e++) {
      const a = flat[e * 4], b = flat[e * 4 + 1], L = flat[e * 4 + 2], one = flat[e * 4 + 3];
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
  const fwd = adjacency('fwd'), rev = adjacency('rev'), und = adjacency('und');
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
  const egrid = new Map();
  for (let e = 0; e < m; e++) {
    const u = flat[e * 4], v = flat[e * 4 + 1], one = flat[e * 4 + 3];
    if (comp[u] !== main) continue;
    const cx0 = Math.floor(Math.min(xs[u], xs[v]) / CELL), cx1 = Math.floor(Math.max(xs[u], xs[v]) / CELL);
    const cy0 = Math.floor(Math.min(ys[u], ys[v]) / CELL), cy1 = Math.floor(Math.max(ys[u], ys[v]) / CELL);
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const k = cx * 100003 + cy;
        let c = egrid.get(k);
        if (!c) egrid.set(k, (c = []));
        c.push(u, v, one);
      }
    }
  }
  G = {
    N, x: Float64Array.from(xs), y: Float64Array.from(ys), fwd, rev, und, comp, main, mainSize, egrid, win,
    version: (G ? G.version : 0) + 1, cache: new Map(), ms: performance.now() - t0,
  };
}

// Road pieces that still don't touch the main network (a lane whose junction
// the data lost, a farm track, a patch of polder roads between ditches) get
// one link across the field from their node nearest to it, in a few passes so
// a far patch can hang on a nearer one; the router avoids those links where
// it can.
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
  const R = Math.ceil(STITCH_M / CELL);
  for (let i = 0; i < N; i++) {
    const r = find(i);
    if (r === main) continue;
    let b = best.get(r);
    if (!b) best.set(r, (b = { d: STITCH_M, a: -1, n: -1 }));
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

export function countryBuilt() {
  return !!G;
}

export function countryReady(real) {
  if (G) return true;
  if (!real || !real.ready || !real.roads || !real.roads.length) return false;
  REALDATA = real;
  build(real);
  return true;
}

// Grows the polder grid when a route reaches past it (the countryside is
// endless). A rebuild renumbers the nodes: call it before snapping.
export function countryCover(pts) {
  const w = G && G.win;
  if (!w) return;
  let x0 = w[0], y0 = w[1], x1 = w[2], y1 = w[3];
  for (const [x, y] of pts) {
    if (x > w[0] + BLOCK && x < w[2] - BLOCK && y > w[1] + BLOCK && y < w[3] - BLOCK) continue;
    x0 = Math.min(x0, x - POLDER_MARGIN); y0 = Math.min(y0, y - POLDER_MARGIN);
    x1 = Math.max(x1, x + POLDER_MARGIN); y1 = Math.max(y1, y + POLDER_MARGIN);
  }
  if (x0 < w[0] || y0 < w[1] || x1 > w[2] || y1 > w[3]) build(REALDATA, [x0, y0, x1, y1]);
}

// bumps on every rebuild (node numbers change)
export function countryVersion() {
  return G ? G.version : 0;
}

export function nodeXY(n) {
  return [G.x[n], G.y[n]];
}

// The nearest point on the main network: { x, y, a, b, da, db, d, one } (on the
// edge a-b, da/db metres from its ends, d from the query point, one: 1 when the
// edge may only be driven from a to b), or null.
export function snapCountry(x, y, maxD = 600) {
  if (!G) return null;
  let best = null;
  for (let r = CELL; ; r = Math.min(r * 2, maxD)) {
    let bd = r;
    const n = Math.ceil(r / CELL);
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    for (let i = -n; i <= n; i++) {
      for (let j = -n; j <= n; j++) {
        const c = G.egrid.get((cx + i) * 100003 + (cy + j));
        if (!c) continue;
        for (let k = 0; k < c.length; k += 3) {
          const a = c[k], b = c[k + 1];
          const ax = G.x[a], ay = G.y[a], dx = G.x[b] - ax, dy = G.y[b] - ay, l2 = dx * dx + dy * dy;
          let t = l2 > 1e-9 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const px = ax + dx * t, py = ay + dy * t, d = Math.hypot(px - x, py - y);
          if (d < bd) { bd = d; const L = Math.sqrt(l2); best = { x: px, y: py, a, b, da: t * L, db: (1 - t) * L, d, one: c[k + 2] }; }
        }
      }
    }
    if (best || r >= maxD) return best;
  }
}

const snapKey = (s, rev, free) => `${free ? 'u' : rev ? 'r' : 'f'}${s.a}:${s.b}:${Math.round(s.da)}:${s.one}`;

// Costs and predecessors over the whole network. Forward: the cheapest way
// from the snap to every node. Reverse (`toward`): from every node to the
// snap, and a node's predecessor is the next node on its way there. `free`:
// the one-ways ignored, the last resort when a one-way dead end (a ramp cut at
// the data's edge) leaves no way.
export function countryCosts(from, toward = false, free = false) {
  const key = snapKey(from, toward, free);
  let c = G.cache.get(key);
  if (c) return c;
  const adj = free ? G.und : toward ? G.rev : G.fwd;
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
export function countryPath(from, to, free = false) {
  if (!from || !to) return null;
  if (from.a === to.a && from.b === to.b) {
    // on the same piece of road: straight there unless it is a one-way the wrong way
    const dir = to.da - from.da;
    if (free || !from.one || dir >= 0) return [[from.x, from.y], [to.x, to.y]];
  }
  const { dist, prev } = countryCosts(to, true, free);
  // out of from along its edge: on to b, or back to a unless it is a one-way
  const cb = dist[from.b] + from.db, ca = from.one && !free ? Infinity : dist[from.a] + from.da;
  if (!Number.isFinite(Math.min(ca, cb))) return null;
  const pts = chain(ca < cb ? from.a : from.b, prev, [[from.x, from.y]]);
  pts.push([to.x, to.y]);
  return pts;
}

// A short way from snap `from` towards snap `to` for a driver giving chase
// (police.js): A* over the one-way graph that settles at most maxNodes, so
// it never walks the whole network like countryCosts. When the budget runs
// out the path ends at the settled node nearest the target.
export function countryPathNear(from, to, maxNodes = 2500) {
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
export function countryPathToNode(from, n, free = false) {
  const { dist, prev } = countryCosts(from, false, free);
  if (!Number.isFinite(dist[n])) return null;
  const pts = chain(n, prev, []).reverse();
  pts.unshift([from.x, from.y]);
  return pts;
}

// From node n to snap `to`.
export function countryPathFromNode(n, to, free = false) {
  const { dist, prev } = countryCosts(to, true, free);
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

export function countryStats() {
  return G ? { nodes: G.N, main: G.mainSize, ms: Math.round(G.ms) } : null;
}
