// The route graph search over navgraph.js's edges, for scripts/navgraph_test.mjs only (#102):
// the game does not use it (routing.js, roadgraph.js and vehicle.js route).
import { MODES } from '../../game/js/navgraph.js';

const nodeKey = (p) => Math.round(p[0] * 10) + ',' + Math.round(p[1] * 10);

export class NavGraph {
  constructor() { this.ids = new Map(); this.xy = []; this.adj = []; this.edges = 0; }
  node(p) {
    const k = nodeKey(p);
    let i = this.ids.get(k);
    if (i === undefined) { i = this.xy.length; this.ids.set(k, i); this.xy.push([p[0], p[1]]); this.adj.push([]); }
    return i;
  }
  add(e) {
    const a = this.node(e.a), b = this.node(e.b);
    // cost in seconds of driving (len / speed); walking and cycling use length
    this.adj[a].push({ to: b, e });
    if (!e.ow) this.adj[b].push({ to: a, e });
    this.edges++;
  }
  static from(rows) { const g = new NavGraph(); for (const e of rows) g.add(e); return g; }
  nearest(x, y, mode = 'car', maxR = 200) {
    const mask = MODES[mode];
    let best = -1, bd = maxR * maxR;
    for (let i = 0; i < this.xy.length; i++) {
      const dx = this.xy[i][0] - x, dy = this.xy[i][1] - y, d = dx * dx + dy * dy;
      if (d < bd && this.adj[i].some((q) => q.e.acc & mask)) { bd = d; best = i; }
    }
    return best;
  }
  cost(e, mode) { return mode === 'car' || mode === 'bus' ? e.len / Math.max(2, e.spd) : e.len / (mode === 'bike' ? 4.5 : 1.4); }
  // A*: seconds along edges the mode may use, one-ways respected
  route(from, to, mode = 'car') {
    const mask = MODES[mode];
    const fast = mode === 'car' || mode === 'bus' ? 30 : mode === 'bike' ? 4.5 : 1.4;
    const goal = this.xy[to];
    const h = (i) => Math.hypot(this.xy[i][0] - goal[0], this.xy[i][1] - goal[1]) / fast;
    const dist = new Map([[from, 0]]), prev = new Map(), done = new Set();
    const heap = [[h(from), from]];
    const push = (it) => { heap.push(it); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const t = heap[0], l = heap.pop(); if (heap.length) { heap[0] = l; let i = 0; for (;;) { let m = i; const a = 2 * i + 1, b = a + 1; if (a < heap.length && heap[a][0] < heap[m][0]) m = a; if (b < heap.length && heap[b][0] < heap[m][0]) m = b; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return t; };
    while (heap.length) {
      const [, u] = pop();
      if (u === to) {
        const path = [u];
        while (prev.has(path[path.length - 1])) path.push(prev.get(path[path.length - 1]));
        return { cost: dist.get(u), nodes: path.reverse() };
      }
      if (done.has(u)) continue;
      done.add(u);
      for (const { to: v, e } of this.adj[u]) {
        if (!(e.acc & mask)) continue;
        const nd = dist.get(u) + this.cost(e, mode);
        if (nd < (dist.get(v) ?? Infinity)) { dist.set(v, nd); prev.set(v, u); push([nd + h(v), v]); }
      }
    }
    return null;
  }
}
