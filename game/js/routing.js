const STRAY_M = 25;
const TELEPORT_M = 150;
const MIN_RECOMPUTE_S = 2;
const REACH_M = 8;
const SNAP_MAX_M = 480;

let graph = null;
let userWaypoint = null;
let route = null;
let routeKey = '';
let lastComputeAt = -Infinity;
const stats = { buildMs: 0, lastMs: 0, maxMs: 0, avgMs: 0, runs: 0, nodes: 0, driveEdges: 0, walkEdges: 0, lastSettled: 0 };

const isDrivable = (road) => road.cat !== 'foot' && road.cat !== 'cycle';

function buildGraph(map) {
  const t0 = performance.now();
  const ids = new Map();
  const xs = [], ys = [];
  const roadNodes = new Map();
  const drive = [], walk = [];
  const nodeOf = (x, y) => {
    const key = (Math.round(x * 2) + 32768) * 65536 + (Math.round(y * 2) + 32768);
    let id = ids.get(key);
    if (id === undefined) {
      id = xs.length;
      ids.set(key, id);
      xs.push(x);
      ys.push(y);
    }
    return id;
  };
  for (const road of map.roads) {
    const n = road.pts.length;
    const rn = new Int32Array(n);
    for (let i = 0; i < n; i++) rn[i] = nodeOf(road.pts[i][0], road.pts[i][1]);
    roadNodes.set(road, rn);
    const canDrive = isDrivable(road);
    for (let i = 0; i < n - 1; i++) {
      const a = rn[i], b = rn[i + 1];
      if (a === b) continue;
      const len = Math.hypot(xs[b] - xs[a], ys[b] - ys[a]);
      walk.push(a, b, len, b, a, len);
      if (canDrive) {
        drive.push(a, b, len);
        if (!road.oneway) drive.push(b, a, len);
      }
    }
  }
  const N = xs.length;
  const csr = (flat) => {
    const m = flat.length / 3;
    const start = new Int32Array(N + 1);
    for (let e = 0; e < m; e++) start[flat[e * 3] + 1]++;
    for (let i = 0; i < N; i++) start[i + 1] += start[i];
    const fill = start.slice(0, N);
    const to = new Int32Array(m), len = new Float32Array(m);
    for (let e = 0; e < m; e++) {
      const k = fill[flat[e * 3]]++;
      to[k] = flat[e * 3 + 1];
      len[k] = flat[e * 3 + 2];
    }
    return { start, to, len };
  };
  const components = (adj) => {
    const comp = new Int32Array(N).fill(-1);
    const stack = [];
    let best = -1, bestSize = 0, id = 0;
    for (let s0 = 0; s0 < N; s0++) {
      if (comp[s0] >= 0 || adj.start[s0] === adj.start[s0 + 1]) continue;
      comp[s0] = id;
      stack.push(s0);
      let size = 0;
      while (stack.length) {
        const u = stack.pop();
        size++;
        for (let e = adj.start[u]; e < adj.start[u + 1]; e++) {
          const v = adj.to[e];
          if (comp[v] < 0) { comp[v] = id; stack.push(v); }
        }
      }
      if (size > bestSize) { bestSize = size; best = id; }
      id++;
    }
    return { comp, main: best };
  };
  const walkAdj = csr(walk);
  const driveUndirected = [];
  for (let i = 0; i < drive.length; i += 3) driveUndirected.push(drive[i], drive[i + 1], drive[i + 2], drive[i + 1], drive[i], drive[i + 2]);
  graph = {
    N,
    walkComp: components(walkAdj),
    driveComp: components(csr(driveUndirected)),
    x: Float64Array.from(xs),
    y: Float64Array.from(ys),
    roadNodes,
    drive: csr(drive),
    walk: walkAdj,
    g: new Float64Array(N),
    prev: new Int32Array(N),
    seen: new Uint32Array(N),
    done: new Uint32Array(N),
    stamp: 0,
  };
  stats.buildMs = performance.now() - t0;
  stats.nodes = N;
  stats.driveEdges = graph.drive.to.length;
  stats.walkEdges = graph.walk.to.length;
}

// Prefers the largest connected component so a stray, unconnected way near
// the point can't make the whole route fail.
function snapToRoad(map, x, y, driveOnly) {
  const cc = driveOnly ? graph.driveComp : graph.walkComp;
  let fallback = null, fallbackD2 = Infinity;
  for (let r = 30; r <= SNAP_MAX_M; r *= 2) {
    let best = null, bestD2 = r * r;
    for (const road of map.roadsNear(x, y, r)) {
      if (driveOnly && !isDrivable(road)) continue;
      const rn = graph.roadNodes.get(road);
      const inMain = cc.comp[rn[0]] === cc.main;
      const p = road.pts;
      for (let i = 0; i < p.length - 1; i++) {
        const ax = p[i][0], ay = p[i][1], dx = p[i + 1][0] - ax, dy = p[i + 1][1] - ay;
        const l2 = dx * dx + dy * dy;
        let t = l2 > 1e-9 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const cx = ax + dx * t, cy = ay + dy * t;
        const d2 = (cx - x) ** 2 + (cy - y) ** 2;
        if (inMain ? d2 >= bestD2 : d2 >= fallbackD2) continue;
        const hit = { x: cx, y: cy, road, seg: i, t, segLen: Math.sqrt(l2) };
        if (inMain) { bestD2 = d2; best = hit; } else { fallbackD2 = d2; fallback = hit; }
      }
    }
    if (best) return best;
  }
  return fallback;
}

class Heap {
  constructor() { this.f = []; this.n = []; }
  get size() { return this.n.length; }
  push(f, n) {
    const F = this.f, Nn = this.n;
    let i = Nn.length;
    F.push(f); Nn.push(n);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (F[p] <= f) break;
      F[i] = F[p]; Nn[i] = Nn[p]; i = p;
    }
    F[i] = f; Nn[i] = n;
  }
  pop() {
    const F = this.f, Nn = this.n;
    const top = Nn[0];
    const lf = F.pop(), ln = Nn.pop();
    const len = Nn.length;
    if (len) {
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= len) break;
        if (c + 1 < len && F[c + 1] < F[c]) c++;
        if (F[c] >= lf) break;
        F[i] = F[c]; Nn[i] = Nn[c]; i = c;
      }
      F[i] = lf; Nn[i] = ln;
    }
    return top;
  }
  peekF() { return this.f[0]; }
}

function astar(fromSnap, toSnap, walkMode) {
  const G = graph;
  const adj = walkMode ? G.walk : G.drive;
  const stamp = ++G.stamp;
  const gx = toSnap.x, gy = toSnap.y;
  const h = (n) => Math.hypot(G.x[n] - gx, G.y[n] - gy);
  const heap = new Heap();
  const relax = (n, g, p) => {
    if (G.seen[n] === stamp && G.g[n] <= g) return;
    G.seen[n] = stamp;
    G.g[n] = g;
    G.prev[n] = p;
    heap.push(g + h(n), n);
  };

  const fr = G.roadNodes.get(fromSnap.road);
  const fOne = fromSnap.road.oneway && !walkMode;
  relax(fr[fromSnap.seg + 1], (1 - fromSnap.t) * fromSnap.segLen, -1);
  if (!fOne) relax(fr[fromSnap.seg], fromSnap.t * fromSnap.segLen, -1);

  const tr = G.roadNodes.get(toSnap.road);
  const tOne = toSnap.road.oneway && !walkMode;
  const goalA = tr[toSnap.seg], goalB = tr[toSnap.seg + 1];
  const extraA = toSnap.t * toSnap.segLen, extraB = (1 - toSnap.t) * toSnap.segLen;

  let best = Infinity, bestEnd = -1, settled = 0;
  if (fromSnap.road === toSnap.road && fromSnap.seg === toSnap.seg && (!fOne || toSnap.t >= fromSnap.t)) {
    best = Math.abs(toSnap.t - fromSnap.t) * toSnap.segLen;
    bestEnd = -2;
  }
  while (heap.size) {
    if (heap.peekF() >= best) break;
    const n = heap.pop();
    if (G.done[n] === stamp) continue;
    G.done[n] = stamp;
    settled++;
    const gn = G.g[n];
    if (n === goalA && gn + extraA < best) { best = gn + extraA; bestEnd = n; }
    if (n === goalB && !tOne && gn + extraB < best) { best = gn + extraB; bestEnd = n; }
    for (let e = adj.start[n], end = adj.start[n + 1]; e < end; e++) {
      const m = adj.to[e];
      if (G.done[m] === stamp) continue;
      relax(m, gn + adj.len[e], n);
    }
  }
  stats.lastSettled = settled;
  if (bestEnd === -1) return null;
  const pts = [[toSnap.x, toSnap.y]];
  for (let n = bestEnd; n >= 0; n = G.prev[n]) pts.push([G.x[n], G.y[n]]);
  pts.push([fromSnap.x, fromSnap.y]);
  pts.reverse();
  return pts;
}

function travelMode(player) {
  const v = player.inVehicle;
  if (!v) return 'walk';
  if (v.isBoat) return null;
  return v.isBike ? 'walk' : 'drive';
}

function currentTarget(world) {
  if (userWaypoint) return { x: userWaypoint.x, y: userWaypoint.y, kind: 'user', name: userWaypoint.name };
  const m = world.mission;
  if (m && m.marker && m.phase !== 'cooldown') return { x: m.marker.x, y: m.marker.y, kind: 'mission', name: m.label || 'Missie' };
  return null;
}

function computeRoute(world, target, mode) {
  const t0 = performance.now();
  const map = world.map;
  const p = world.player;
  let pts = null;
  const driveOnly = mode === 'drive';
  const from = snapToRoad(map, p.x, p.y, driveOnly);
  const to = snapToRoad(map, target.x, target.y, driveOnly);
  if (from && to) {
    pts = astar(from, to, !driveOnly);
    if (!pts && driveOnly) {
      const fw = snapToRoad(map, p.x, p.y, false), tw = snapToRoad(map, target.x, target.y, false);
      if (fw && tw) pts = astar(fw, tw, true);
    }
  }
  if (!pts) pts = [[p.x, p.y]];
  const first = pts[0];
  if (Math.hypot(first[0] - p.x, first[1] - p.y) > 0.5) pts.unshift([p.x, p.y]);
  const last = pts[pts.length - 1];
  if (Math.hypot(last[0] - target.x, last[1] - target.y) > 0.5) pts.push([target.x, target.y]);

  const cum = new Float64Array(pts.length);
  for (let i = 1; i < pts.length; i++) cum[i] = cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);

  const ms = performance.now() - t0;
  stats.lastMs = ms;
  stats.maxMs = Math.max(stats.maxMs, ms);
  stats.runs++;
  stats.avgMs += (ms - stats.avgMs) / stats.runs;

  return {
    pts, cum, length: cum[pts.length - 1], remaining: cum[pts.length - 1],
    kind: target.kind, target, mode, idx: 0, px: p.x, py: p.y, off: 0, version: stats.runs,
  };
}

function trackProgress(r, x, y) {
  const { pts, cum } = r;
  const lo = Math.max(0, r.idx - 3), hi = Math.min(pts.length - 1, r.idx + 60);
  let bestD2 = Infinity, bi = r.idx, bt = 0;
  for (let i = lo; i < hi; i++) {
    const ax = pts[i][0], ay = pts[i][1], dx = pts[i + 1][0] - ax, dy = pts[i + 1][1] - ay;
    const l2 = dx * dx + dy * dy;
    let t = l2 > 1e-9 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const d2 = (ax + dx * t - x) ** 2 + (ay + dy * t - y) ** 2;
    if (d2 < bestD2) { bestD2 = d2; bi = i; bt = t; }
  }
  if (pts.length < 2) { r.off = Math.hypot(pts[0][0] - x, pts[0][1] - y); r.remaining = r.off; return; }
  r.idx = bi;
  r.px = pts[bi][0] + (pts[bi + 1][0] - pts[bi][0]) * bt;
  r.py = pts[bi][1] + (pts[bi + 1][1] - pts[bi][1]) * bt;
  r.off = Math.sqrt(bestD2);
  r.remaining = r.length - (cum[bi] + (cum[bi + 1] - cum[bi]) * bt) + r.off;
}

export function updateRouting(dt, world) {
  if (!graph) buildGraph(world.map);
  const p = world.player;

  if (userWaypoint && Math.hypot(userWaypoint.x - p.x, userWaypoint.y - p.y) < REACH_M) {
    userWaypoint = null;
    world.addMessage('Bestemming bereikt', 3);
  }

  const target = currentTarget(world);
  const mode = travelMode(p);
  if (!target || !mode) { route = null; routeKey = ''; return; }

  const key = `${target.kind}:${Math.round(target.x)}:${Math.round(target.y)}:${mode}`;
  const now = performance.now() / 1000;
  if (key !== routeKey || !route) {
    routeKey = key;
    route = computeRoute(world, target, mode);
    lastComputeAt = now;
    return;
  }
  trackProgress(route, p.x, p.y);
  if (route.off > TELEPORT_M || (route.off > STRAY_M && now - lastComputeAt >= MIN_RECOMPUTE_S)) {
    route = computeRoute(world, target, mode);
    lastComputeAt = now;
  }
}

export function getActiveRoute() {
  return route;
}

// Remaining polyline from the player's projection onto the route, up to maxLen metres.
export function getRouteAhead(maxLen) {
  if (!route || route.pts.length < 2) return null;
  const out = [[route.px, route.py]];
  let acc = 0;
  let prev = out[0];
  for (let i = route.idx + 1; i < route.pts.length; i++) {
    const q = route.pts[i];
    const d = Math.hypot(q[0] - prev[0], q[1] - prev[1]);
    if (acc + d >= maxLen) {
      const k = (maxLen - acc) / (d || 1);
      out.push([prev[0] + (q[0] - prev[0]) * k, prev[1] + (q[1] - prev[1]) * k]);
      break;
    }
    acc += d;
    out.push(q);
    prev = q;
  }
  return out;
}

export function setUserWaypoint(x, y, name = '') {
  userWaypoint = { x, y, name };
}

export function clearUserWaypoint() {
  userWaypoint = null;
}

export function getUserWaypoint() {
  return userWaypoint;
}

export function getRoutingStats() {
  return { ...stats };
}

export function formatDistance(m) {
  if (m < 1000) return `${Math.max(0, Math.round(m / 10) * 10)} m`;
  return `${(m / 1000).toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}
