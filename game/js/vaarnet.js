// The waterway network of the province (#184): which water a boat kind may
// sail, what stops it (a fixed bridge it does not clear, a lock that makes it
// wait) and the route graph ships follow from the city to the Wadden. Pure
// rules and graph search, no DOM, no three.js: scripts/world/vaarnet.mjs
// builds the graph (and audits the route) from the province data and writes
// game/vaarnet.json; ships and the tests read it here.
//
//   effectiveNav(poly)             the largest boat class a water polygon takes (a big lake takes barges)
//   passBridge(kind, bridge)       { ok, wait } a boat kind under a bridge: fixed (clearance) or movable (opens by itself)
//   lockPassage(lock)              seconds a boat spends in a lock (gates, level change), from locks.js
//   createVaarNet(json)            the graph from the file
//   routeVaar(net, from, to, kind) { nodes, edges, length, wait } the quickest route a boat kind can sail, or null
//
// File format (game/vaarnet.json): nodes [x, y, type, name], type one of
// 'haven', 'kruising', 'sluis', 'brug', 'zee', 'meer'; edges [a, b, length m,
// largest class (0-4, the smallest nav on it), lowest clear dm (-1 none)].
import { BOAT_CLASS, AIR_DRAFT, passesUnder, BRIDGE_DECK_T, BOEZEM_Y, MAIN_WATERWAYS, WATER_KINDS } from './waterlevels.js';
import { makeLock, request, enter, stepLock, levelTime, LOCK_TIMING } from './locks.js';
import { BRIDGE_TIMING } from './movablebridges.js';

export const VAAR_TYPES = ['haven', 'kruising', 'sluis', 'brug', 'zee', 'meer'];

// a lake from this area (m2) carries inland shipping, though its polygon says tour boats
export const LAKE_BARGE_AREA = 250000;
// the clearance of a fixed bridge whose deck lies at street level over the boezem
export const STREET_CLEAR = 0 - BRIDGE_DECK_T - BOEZEM_Y;

export function effectiveNav(poly, area = 0) {
  const nav = poly.nav ?? 0;
  if (nav >= 3 && poly.name && MAIN_WATERWAYS.test(poly.name)) return 4;
  if (poly.kind === 'meer' && area >= LAKE_BARGE_AREA) return Math.max(nav, 4);
  return nav;
}

const kindOf = (k) => (typeof k === 'string' ? k : (k && k.model && k.model.kind) || (k && k.kind) || 'sloep');
export const classOfKind = (k) => BOAT_CLASS[kindOf(k)] ?? 2;
export const airOfKind = (k) => AIR_DRAFT[kindOf(k)] ?? 1.3;

// Can a boat of this kind sail under the bridge? A movable bridge opens by
// itself (movablebridges.js auto-open), after the time it needs from the
// request; a fixed one only when its clearance is above the boat's air draft.
// bridge: { movable: kind string or '', clear: m (default the street-level deck) }
export function passBridge(kind, bridge) {
  if (bridge.movable) return { ok: true, wait: BRIDGE_TIMING.WARN_S + BRIDGE_TIMING.BOOMS_S + BRIDGE_TIMING.MOVE_S };
  const clear = bridge.clear ?? STREET_CLEAR;
  return { ok: passesUnder(airOfKind(kind), clear), wait: 0 };
}

// What a boat spends in a lock from the request at the gate to sailing out:
// the lock has to come to its side, close, level and open (locks.js). With
// `busy` the time the lock is still on its way from the other side.
export function lockPassage({ levels = [BOEZEM_Y, BOEZEM_Y], side = 0, busy = false } = {}) {
  const lock = makeLock({ x: 0, y: 0, levels });
  if (busy) lock.at = 1 - side, lock.level = levels[1 - side], lock.gate = side ? [1, 0] : [0, 1];
  const boat = {};
  request(lock, side, boat);
  let t = 0;
  const dt = 0.5;
  // the boat sails in once the gate on its side is open, then the lock crosses
  let inside = false;
  for (; t < 600; t += dt) {
    if (!inside && lock.at === side && lock.state === 'ready') { enter(lock, boat); inside = true; }
    stepLock(lock, dt);
    if (inside && lock.at !== side && lock.state === 'ready') return Math.round(t + dt + 3);
  }
  return 600;
}
export { LOCK_TIMING, levelTime };

// A link of game/vaarnet_fixes.json as a water polygon: the rectangle round
// from-to of the given width (a hole in the map's water that a canal ought to fill).
export function linkPolygon(link) {
  const [x0, y0] = link.from, [x1, y1] = link.to, dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L * link.width / 2, ny = dx / L * link.width / 2;
  const r = (v) => Math.round(v * 100) / 100;
  return [[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]].map(([x, y]) => [r(x), r(y)]);
}

// A gap of game/vaarnet_fixes.json : [x, y, length, width, angle, nav] the
// small rectangle under a bridge or in a lock where the map's water breaks off.
export function gatPolygon(g) {
  const [x, y, L, W, a] = g, c = Math.cos(a), s = Math.sin(a), hl = L / 2, hw = W / 2;
  const r = (q) => Math.round(q * 100) / 100;
  return [[-hl, -hw], [hl, -hw], [hl, hw], [-hl, hw]].map(([u, v]) => [r(x + u * c - v * s), r(y + u * s + v * c)]);
}

// The water rows the fixes add to the world (TileWorld.addWaterPatches): the links
// and the gaps as water of the nav they carry, at the boezem's level.
const PATCH_KIND = { 4: 'kanaal', 3: 'diep', 2: 'vaart' };
const SEA_NAMES = { 'zee eems': 'Eems', 'zee dollard': 'Dollard', 'zee waddenzee': 'Waddenzee', 'zee noordzee': 'Noordzee' };
export function patchRows(fixes) {
  const rows = [];
  const row = (pts, nav, name) => {
    const kind = PATCH_KIND[nav] || 'diep';
    return { pts, kind, nav, lv: BOEZEM_Y, dp: WATER_KINDS[kind].depth, body: -2, name: name || '', flat: true, fix: true };
  };
  for (const l of (fixes && fixes.links) || []) rows.push(row(linkPolygon(l), 4, l.name));
  for (const g of (fixes && fixes.gaten) || []) rows.push(row(gatPolygon(g), g[5] || 3, ''));
  for (const g of (fixes && fixes.verbindingen) || []) rows.push(row(gatPolygon(g), g[5] || 2, ''));
  // the chamber of a lock the map draws no water in (scripts/world/sluizen.mjs finds them)
  for (const g of (fixes && fixes.sluisgaten) || []) rows.push(row(gatPolygon(g), g[5] || 3, ''));
  // the sea off a coast the map draws no water at: the open water of the Wadden and the Eems
  for (const g of (fixes && fixes.zee) || []) { const r = row(gatPolygon(g), 4, SEA_NAMES[g[6]] || 'Zee'); r.kind = 'zee'; r.dp = WATER_KINDS.zee.depth; r.strip = g[2] > 1000; rows.push(r); }
  return rows;
}

// ---------------------------------------------------------------- the graph

export function createVaarNet(json) {
  const nodes = json.nodes.map((n, id) => ({ id, x: n[0], y: n[1], type: n[2], name: n[3] || '', edges: [] }));
  const edges = json.edges.map((e, id) => {
    // the points are decimetre deltas from 0, 0
    const pts = [];
    for (let i = 0, x = 0, y = 0; e[5] && i < e[5].length; i += 2) { x += e[5][i]; y += e[5][i + 1]; pts.push([x / 10, y / 10]); }
    const o = { id, a: e[0], b: e[1], len: e[2], cls: e[3], clear: e[4] < 0 ? Infinity : e[4] / 10, pts: pts.length ? pts : null };
    nodes[o.a].edges.push(o); nodes[o.b].edges.push(o);
    return o;
  });
  return { nodes, edges, hubs: json.hubs || {} };
}

// the node nearest (x, y), optionally of one type
export function nearestNode(net, x, y, type = null) {
  let best = null, bd = Infinity;
  for (const n of net.nodes) {
    if (type && n.type !== type) continue;
    const d = Math.hypot(n.x - x, n.y - y);
    if (d < bd) { bd = d; best = n; }
  }
  return best;
}

// Can the kind sail the edge? class by the water, air draft by its lowest fixed bridge.
export function edgeOpen(edge, kind) {
  if (classOfKind(kind) > edge.cls) return false;
  return edge.clear === Infinity || passesUnder(airOfKind(kind), edge.clear);
}

const SLUICE_WAIT = 40; // s a lock costs a route on average, counted as 'metres' at 4 m/s
const LOCK_COST = (v) => (v === 'sluis' ? SLUICE_WAIT * 4 : v === 'brug' ? 15 * 4 : 0);

// Dijkstra over the edges the kind can sail; locks and movable bridges cost the
// time they take. from/to: node ids. Returns { nodes: [id], edges: [edge], length, wait } or null.
export function routeVaar(net, from, to, kind) {
  const N = net.nodes.length, dist = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), via = new Array(N).fill(null);
  const done = new Uint8Array(N);
  dist[from] = 0;
  // a binary heap of [dist, node]
  const h = [[0, from]];
  const push = (it) => { h.push(it); let i = h.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (h[p][0] <= h[i][0]) break; [h[p], h[i]] = [h[i], h[p]]; i = p; } };
  const pop = () => {
    const top = h[0], last = h.pop();
    if (h.length) { h[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < h.length && h[l][0] < h[m][0]) m = l; if (r < h.length && h[r][0] < h[m][0]) m = r; if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m; } }
    return top;
  };
  while (h.length) {
    const [d, u] = pop();
    if (done[u]) continue;
    done[u] = 1;
    if (u === to) break;
    for (const e of net.nodes[u].edges) {
      if (!edgeOpen(e, kind)) continue;
      const v = e.a === u ? e.b : e.a;
      const nd = d + e.len + LOCK_COST(net.nodes[v].type);
      if (nd < dist[v]) { dist[v] = nd; prev[v] = u; via[v] = e; push([nd, v]); }
    }
  }
  if (!done[to]) return null;
  const ids = [], es = [];
  for (let v = to; v !== -1; v = prev[v]) { ids.push(v); if (via[v]) es.push(via[v]); }
  ids.reverse(); es.reverse();
  let length = 0, wait = 0;
  for (const e of es) length += e.len;
  for (const id of ids) { const t = net.nodes[id].type; if (t === 'sluis') wait += SLUICE_WAIT; else if (t === 'brug') wait += 15; }
  return { nodes: ids, edges: es, length: Math.round(length), wait };
}

// ------------------------------------------------------- following the net

// The nearest point of the net's edges to (x, y) within maxD: { edge, i (the segment, from
// vertex i to i + 1), x, y (the point on it), d }; the edges' bounds are kept on the net.
export function nearestOnNet(net, x, y, maxD = 150, accept = null) {
  let best = null;
  for (const e of net.edges) {
    if (!e.pts || (accept && !accept(e))) continue;
    if (!e.box) { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const p of e.pts) { if (p[0] < a) a = p[0]; if (p[0] > c) c = p[0]; if (p[1] < b) b = p[1]; if (p[1] > d) d = p[1]; } e.box = [a, b, c, d]; }
    if (x < e.box[0] - maxD || x > e.box[2] + maxD || y < e.box[1] - maxD || y > e.box[3] + maxD) continue;
    for (let i = 0; i + 1 < e.pts.length; i++) {
      const ax = e.pts[i][0], ay = e.pts[i][1], dx = e.pts[i + 1][0] - ax, dy = e.pts[i + 1][1] - ay, L2 = dx * dx + dy * dy || 1e-9;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)), px = ax + dx * t, py = ay + dy * t, d = Math.hypot(px - x, py - y);
      if (d <= maxD && (!best || d < best.d)) best = { edge: e, i, x: px, y: py, d };
    }
  }
  return best;
}

// The points of a route, in order of sailing: each edge's polyline walked from the node
// the route entered it at.
export function routePoints(net, route) {
  const pts = [];
  route.edges.forEach((e, k) => {
    const from = route.nodes[k], line = e.a === from ? e.pts : e.pts.slice().reverse();
    for (const p of line) pts.push([p[0], p[1]]);
  });
  return pts;
}

// A trip for a boat at (x, y) heading `angle`: it joins the net at the edge end it points to
// and sails to a hub it can reach (a lock or a movable bridge costs time, a low fixed bridge
// shuts the edge for a boat that does not clear it). null when the net is out of reach or
// every hub is shut or further than maxLength m (a tour boat stays near home). rng() picks the hub.
export function pickTrip(net, x, y, angle, kind, rng = Math.random, maxD = 150, maxLength = Infinity) {
  const at = nearestOnNet(net, x, y, maxD);
  if (!at || !edgeOpen(at.edge, kind)) return null;
  const e = at.edge, i = at.i;
  // the way along the polyline the bow points to
  const forward = (e.pts[i + 1][0] - e.pts[i][0]) * Math.cos(angle) + (e.pts[i + 1][1] - e.pts[i][1]) * Math.sin(angle) >= 0;
  // the polyline's points still to sail on this edge, then the node at its end
  const rest = [[at.x, at.y]].concat(forward ? e.pts.slice(i + 1) : e.pts.slice(0, i + 1).reverse());
  const startNode = forward ? e.b : e.a;
  const names = Object.keys(net.hubs);
  const order = names.map((n) => [rng(), n]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
  for (const name of order) {
    const to = net.hubs[name];
    if (to === startNode) continue;
    const r = routeVaar(net, startNode, to, kind);
    if (!r || r.nodes.length < 2 || r.length > maxLength) continue;
    return { name, length: r.length, wait: r.wait, pts: rest.concat(routePoints(net, r)) };
  }
  return null;
}

// Points along the net ahead of a boat at (x, y) moving (vx, vy): the polyline it lies on
// from the nearest vertex towards its heading, on over the edges at the nodes that bend
// least, up to `dist` m. For the tile streamer: the tiles of those points are fetched
// before the boat gets there (tilesAhead), also where the heading alone would not
// look (a canal that bends away from the bow). Empty when the net is out of reach.
export function routeAhead(net, x, y, vx, vy, dist = 3000, maxD = 120) {
  const at = nearestOnNet(net, x, y, maxD);
  if (!at) return [];
  const sp = Math.hypot(vx, vy);
  const hx = sp > 0.3 ? vx / sp : 1, hy = sp > 0.3 ? vy / sp : 0;
  let e = at.edge, dir = (e.pts[at.i + 1][0] - e.pts[at.i][0]) * hx + (e.pts[at.i + 1][1] - e.pts[at.i][1]) * hy >= 0 ? 1 : -1;
  // the vertex ahead of the nearest point, then on from there
  let i = dir > 0 ? at.i + 1 : at.i;
  const out = [];
  let run = 0, px = at.x, py = at.y;
  for (let hops = 0; hops < 8 && run < dist; hops++) {
    for (let j = i; j >= 0 && j < e.pts.length && run < dist; j += dir) {
      const p = e.pts[j], step = Math.hypot(p[0] - px, p[1] - py);
      for (let t = 300; t < step; t += 300) out.push([px + (p[0] - px) * t / step, py + (p[1] - py) * t / step]);
      run += step; px = p[0]; py = p[1];
      out.push([px, py]);
    }
    // on at the node: the other edge that bends least from the way we came
    const node = net.nodes[dir > 0 ? e.b : e.a];
    const last = e.pts[dir > 0 ? e.pts.length - 1 : 0], before = e.pts[dir > 0 ? Math.max(0, e.pts.length - 2) : Math.min(e.pts.length - 1, 1)];
    const wx = last[0] - before[0], wy = last[1] - before[1], wl = Math.hypot(wx, wy) || 1;
    let best = null, bs = -2;
    for (const o of node.edges) {
      if (o === e || !o.pts) continue;
      const fromA = o.a === node.id, q = fromA ? o.pts[Math.min(1, o.pts.length - 1)] : o.pts[Math.max(0, o.pts.length - 2)];
      const ox = q[0] - node.x, oy = q[1] - node.y, ol = Math.hypot(ox, oy) || 1;
      const s = (ox * wx + oy * wy) / (ol * wl);
      if (s > bs) { bs = s; best = { o, fromA }; }
    }
    if (!best || bs < -0.2) break;
    e = best.o; dir = best.fromA ? 1 : -1; i = best.fromA ? 0 : e.pts.length - 1;
    px = node.x; py = node.y;
  }
  return out;
}

// ------------------------------------------------------- the net for everyone

// The narrowest channel (m, bank to bank) a boat kind sails: about twice its beam and room to
// turn. The water's class (waterlevels.js: 1 ponds and ditches, 2 vaarten of 4 m and up,
// 3 canals of 9 m and up, 4 shipping canals of 30 m and up, or by name) is where it comes from.
// Narrower water is not in the net on purpose: a ditch is waded or paddled, nothing plans a route there.
export const MIN_WIDTH = { kano: 2, kajak: 2, sup: 2, waterfiets: 4, dinghy: 3, sloep: 4, rubberboot: 4, skiff: 4, acht: 9, rondvaart: 9, skutsje: 9, binnenvaart: 24 };
export const minWidthOf = (k) => MIN_WIDTH[kindOf(k)] ?? 4;

// the net the game loaded (vaarload.js), for the GPS and the boats
let shared = null;
export const setSharedNet = (n) => { shared = n; };
export const getSharedNet = () => shared;

const lenOf = (pts, i0, i1) => { let s = 0; for (let i = i0; i < i1; i++) s += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); return s; };

// where a point on an edge lies along it: metres from node a and from node b (by the polyline)
function split(at) {
  const P = at.edge.pts, total = lenOf(P, 0, P.length - 1);
  const toA = lenOf(P, 0, at.i) + Math.hypot(at.x - P[at.i][0], at.y - P[at.i][1]);
  return { toA, toB: Math.max(0, total - toA) };
}
// the polyline from node a to the point (a=true) or from the point to node b (a=false)
function part(at, a) {
  const P = at.edge.pts;
  return a ? P.slice(0, at.i + 1).concat([[at.x, at.y]]) : [[at.x, at.y]].concat(P.slice(at.i + 1));
}

// nearest edge a boat kind can sail
function snapOpen(net, x, y, kind, maxD) {
  let best = null;
  for (let r = 60; r <= maxD && !best; r *= 2.5) {
    // nearestOnNet takes the nearest of all edges: ask again with a wider reach until one is open
    const at = nearestOnNet(net, x, y, Math.min(r, maxD), (e) => edgeOpen(e, kind));
    if (at) best = at;
  }
  return best;
}

// The route for a boat kind (or the player's boat) between two points over the net: A* over the
// edges it can sail, from the point nearest `from` to the point nearest `to` (within snapMax m
// of the net, a longer way is a straight last bit the caller draws). Locks and movable bridges cost
// their waiting time. -> { pts, length, wait, etaS, nodes } or null when the net does not join them.
export function planVaarRoute(net, from, to, kind, { snapMax = 500, speed = 5 } = {}) {
  const s = snapOpen(net, from[0], from[1], kind, snapMax), t = snapOpen(net, to[0], to[1], kind, snapMax);
  if (!s || !t) return null;
  const S = split(s), T = split(t);
  // both on one edge: along it
  if (s.edge === t.edge) {
    const a = S.toA, b = T.toA, pts = a <= b
      ? [[s.x, s.y]].concat(s.edge.pts.slice(s.i + 1, t.i + 1), [[t.x, t.y]])
      : [[s.x, s.y]].concat(s.edge.pts.slice(t.i + 1, s.i + 1).reverse(), [[t.x, t.y]]);
    const length = Math.abs(a - b);
    return { pts, length: Math.round(length), wait: 0, etaS: Math.round(length / speed), nodes: [] };
  }
  const N = net.nodes.length, g = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), via = new Array(N).fill(null), done = new Uint8Array(N);
  const tx = t.x, ty = t.y, h = (id) => Math.hypot(net.nodes[id].x - tx, net.nodes[id].y - ty);
  const heap = [];
  const push = (it) => { heap.push(it); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  const seed = (id, c) => { if (c < g[id]) { g[id] = c; prev[id] = -1; via[id] = null; push([c + h(id), id]); } };
  seed(s.edge.a, S.toA); seed(s.edge.b, S.toB);
  // the goal: the edge ends of t's edge, with the way along t's edge as the last leg
  const goal = new Map([[t.edge.a, T.toA], [t.edge.b, T.toB]]);
  let bestEnd = -1, bestCost = Infinity;
  while (heap.length) {
    const [f, u] = pop();
    if (done[u]) continue;
    if (f >= bestCost) break;
    done[u] = 1;
    if (goal.has(u) && g[u] + goal.get(u) < bestCost) { bestCost = g[u] + goal.get(u); bestEnd = u; }
    for (const e of net.nodes[u].edges) {
      if (!edgeOpen(e, kind)) continue;
      const v = e.a === u ? e.b : e.a, nd = g[u] + e.len + LOCK_COST(net.nodes[v].type);
      if (nd < g[v]) { g[v] = nd; prev[v] = u; via[v] = e; push([nd + h(v), v]); }
    }
  }
  if (bestEnd < 0) return null;
  const ids = [], es = [];
  for (let v = bestEnd; v !== -1; v = prev[v]) { ids.push(v); if (via[v]) es.push(via[v]); }
  ids.reverse(); es.reverse();
  // start point -> first node, the edges, last node -> end point
  const pts = ids[0] === s.edge.a ? part(s, true).reverse() : part(s, false);
  es.forEach((e, k) => { for (const p of (e.a === ids[k] ? e.pts : e.pts.slice().reverse())) pts.push(p); });
  const last = ids[ids.length - 1];
  for (const p of last === t.edge.a ? part(t, true) : part(t, false).reverse()) pts.push(p);
  let wait = 0;
  for (const id of ids) { const kindN = net.nodes[id].type; if (kindN === 'sluis') wait += SLUICE_WAIT; else if (kindN === 'brug') wait += 15; }
  const length = Math.round(lenOf(pts, 0, pts.length - 1));
  return { pts, length, wait, etaS: Math.round(length / speed + wait), nodes: ids };
}
