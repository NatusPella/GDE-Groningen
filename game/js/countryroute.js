// A road graph over the Ommeland (countryreal.js REAL.roads), so routing.js
// can show the way to a place outside the city map (carbid at boer Roelf's,
// Rotor Roelf on Eelde) and back into Stad from there. The city graph stays
// routing.js's own; the two meet at gateways: Ommeland road points near the
// city's edge that lie on a city street. Built lazily, once. No DOM.
//
//   countryReady(real)              true once REAL is loaded (and the graph is built)
//   snapCountry(x, y, maxD)         the nearest node of the main network within maxD, or -1
//   countryCosts(from)              Dijkstra costs from node `from` to every node (cached per node)
//   countryPath(a, b)               [[x, y], ...] from node a to node b, or null
//   nodeXY(n)                       [x, y]
//   gatewayCandidates(bounds, band) nodes of the main network inside bounds and within band m of its edge

let G = null;
const CELL = 200;

function build(real) {
  const t0 = performance.now();
  const ids = new Map();
  const xs = [], ys = [];
  const flat = [];
  const nodeOf = (x, y) => {
    const key = (Math.round(x) + 50000) * 100000 + (Math.round(y) + 50000);
    let id = ids.get(key);
    if (id === undefined) { id = xs.length; ids.set(key, id); xs.push(x); ys.push(y); }
    return id;
  };
  for (const r of real.roads) {
    if (r.cycle) continue;
    const p = r.pts;
    let a = nodeOf(p[0][0], p[0][1]);
    for (let i = 1; i < p.length; i++) {
      const b = nodeOf(p[i][0], p[i][1]);
      if (a !== b) { const L = Math.hypot(xs[b] - xs[a], ys[b] - ys[a]); flat.push(a, b, L, b, a, L); }
      a = b;
    }
  }
  const N = xs.length, m = flat.length / 3;
  const start = new Int32Array(N + 1);
  for (let e = 0; e < m; e++) start[flat[e * 3] + 1]++;
  for (let i = 0; i < N; i++) start[i + 1] += start[i];
  const fill = start.slice(0, N);
  const to = new Int32Array(m), len = new Float32Array(m);
  for (let e = 0; e < m; e++) { const k = fill[flat[e * 3]]++; to[k] = flat[e * 3 + 1]; len[k] = flat[e * 3 + 2]; }
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
  const grid = new Map();
  for (let i = 0; i < N; i++) {
    if (comp[i] !== main) continue;
    const k = Math.floor(xs[i] / CELL) * 100003 + Math.floor(ys[i] / CELL);
    let c = grid.get(k);
    if (!c) grid.set(k, (c = []));
    c.push(i);
  }
  G = { N, x: Float64Array.from(xs), y: Float64Array.from(ys), start, to, len, comp, main, grid, cache: new Map(), ms: performance.now() - t0 };
}

export function countryReady(real) {
  if (G) return true;
  if (!real || !real.ready || !real.roads || !real.roads.length) return false;
  build(real);
  return true;
}

export function nodeXY(n) {
  return [G.x[n], G.y[n]];
}

export function snapCountry(x, y, maxD = 600) {
  if (!G) return -1;
  let best = -1, bd = maxD * maxD;
  const r = Math.ceil(maxD / CELL);
  const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
  for (let i = -r; i <= r; i++) {
    for (let j = -r; j <= r; j++) {
      const c = G.grid.get((cx + i) * 100003 + (cy + j));
      if (!c) continue;
      for (const n of c) {
        const d = (G.x[n] - x) ** 2 + (G.y[n] - y) ** 2;
        if (d < bd) { bd = d; best = n; }
      }
    }
  }
  return best;
}

// Costs and predecessors from one node over the whole network (both ways are
// the same length, so a path to `from` is the predecessor chain reversed).
export function countryCosts(from) {
  let c = G.cache.get(from);
  if (c) return c;
  const dist = new Float64Array(G.N).fill(Infinity), prev = new Int32Array(G.N).fill(-1);
  const heap = [[0, from]];
  dist[from] = 0;
  while (heap.length) {
    // binary heap on [cost, node]
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
    for (let e = G.start[u]; e < G.start[u + 1]; e++) {
      const v = G.to[e], nd = d + G.len[e];
      if (nd >= dist[v]) continue;
      dist[v] = nd;
      prev[v] = u;
      heap.push([nd, v]);
      for (let i = heap.length - 1; i > 0;) {
        const p = (i - 1) >> 1;
        if (heap[p][0] <= heap[i][0]) break;
        [heap[i], heap[p]] = [heap[p], heap[i]];
        i = p;
      }
    }
  }
  c = { dist, prev };
  if (G.cache.size > 6) G.cache.delete(G.cache.keys().next().value);
  G.cache.set(from, c);
  return c;
}

// The path from node a to node b, walking b's predecessor chain from countryCosts(a).
export function countryPath(a, b) {
  if (a < 0 || b < 0) return null;
  const { dist, prev } = countryCosts(a);
  if (!Number.isFinite(dist[b])) return null;
  const pts = [];
  for (let n = b; n >= 0; n = prev[n]) pts.push([G.x[n], G.y[n]]);
  return pts.reverse();
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
  return G ? { nodes: G.N, ms: Math.round(G.ms) } : null;
}
