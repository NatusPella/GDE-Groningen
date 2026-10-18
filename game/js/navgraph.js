// The route graph (docs/PROVINCIE-PLAN.md 2.16, 2.23). Its build-time half is
// live: ACC/accessOf (the access bits per mode, which roadaccess.js and
// worldbuilder.js repeat) and edgeRows/globalChains (pack_tiles.mjs and
// build_corridor.mjs write the tiles' `nav` section and the global layer).
// NavGraph (nearest, route) is not used by the game at runtime: the routers
// are routing.js (city), roadgraph.js (province) and vehicle.js (traffic); one
// graph for all of them is #90. Only navgraph_test.mjs runs NavGraph.
//
// Nodes are the road vertices that roads share (key: the decimetre), edges
// one road segment each, in both directions unless one-way. Every edge
// carries an access mask per travel mode from the road's class and tags:
//   FOOT, BIKE, CAR, BUS (ACC) - motorways and trunk roads are CAR | BUS
//   only; cycle paths BIKE; footways FOOT; a busway BUS.
// Tiles hold their edges in the `nav` section (an edge sits in the tile of
// its midpoint; one that crosses a border meets its neighbour at the shared
// node, so any set of loaded tiles forms a graph with open ends). The global
// layer holds the main roads as chains between junctions for long routes;
// the F1 router goes hierarchical (HPA*) over both.
export const ACC = { FOOT: 1, BIKE: 2, CAR: 4, BUS: 8 };
export const MODES = { foot: ACC.FOOT, bike: ACC.BIKE, car: ACC.CAR, bus: ACC.BUS };

export function accessOf(r) {
  if (typeof r.acc === 'number') return r.acc;
  if (r.busOnly) return ACC.BUS;
  if (r.cat === 'cycle') return ACC.BIKE;
  if (r.cat === 'foot') return r.type === 'steps' ? ACC.FOOT : r.type === 'pedestrian' ? ACC.FOOT | ACC.BIKE : ACC.FOOT;
  if (r.type === 'motorway' || r.type === 'motorway_link' || r.type === 'trunk' || r.type === 'trunk_link') return ACC.CAR | ACC.BUS;
  return ACC.FOOT | ACC.BIKE | ACC.CAR | ACC.BUS;
}

const nodeKey = (p) => `${Math.round(p[0] * 10)},${Math.round(p[1] * 10)}`;

// One edge row per road segment: { g: road id, s: segment, a: [x, y], b: [x, y], len, spd, cls, ow, acc }
export function edgeRows(roads, gidOf = (r, i) => i) {
  const rows = [];
  roads.forEach((r, i) => {
    const gid = gidOf(r, i), acc = accessOf(r);
    for (let s = 0; s < r.pts.length - 1; s++) {
      const a = r.pts[s], b = r.pts[s + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 0.05) continue;
      rows.push({ g: gid, s, a: [a[0], a[1]], b: [b[0], b[1]], len, spd: r.speed || 8, cls: r.cat, ow: r.oneway ? 1 : 0, acc, br: r.bridge ? 1 : 0, z: r.z ? 1 : 0 });
    }
  });
  return rows;
}

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

// The global layer: the main roads (cat major) as chains between junctions
// and ends, one record per chain with its polyline, length, speed and access.
export function globalChains(roads, cat = 'major') {
  const rows = edgeRows(roads.filter((r) => r.cat === cat));
  const deg = new Map();
  for (const e of rows) for (const p of [e.a, e.b]) { const k = nodeKey(p); deg.set(k, (deg.get(k) || 0) + 1); }
  const chains = [];
  const byRoad = new Map();
  for (const e of rows) (byRoad.get(e.g) || byRoad.set(e.g, []).get(e.g)).push(e);
  for (const list of byRoad.values()) {
    list.sort((p, q) => p.s - q.s);
    let cur = null;
    for (const e of list) {
      if (!cur) cur = { pts: [e.a], len: 0, spd: e.spd, ow: e.ow, acc: e.acc };
      cur.pts.push(e.b);
      cur.len += e.len;
      if (deg.get(nodeKey(e.b)) !== 2) { chains.push(cur); cur = null; }
    }
    if (cur) chains.push(cur);
  }
  return chains.map((c) => ({ a: c.pts[0], b: c.pts[c.pts.length - 1], p: c.pts, len: c.len, spd: c.spd, ow: c.ow, acc: c.acc }));
}
