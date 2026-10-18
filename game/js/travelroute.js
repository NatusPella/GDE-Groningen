// Trips that are not on the road graph (docs/PROVINCIE-PLAN.md 2.23): boats
// over the water, the train (with the walk to and from the station), and the
// air (a line with an altitude hint, around no-fly zones, to a landing spot).
// Pure: the world comes in through a small context, so scripts/mode_route_test.mjs
// runs it on the city map and on the F0 tiles alike.
//
// A trip: { mode, pts, length, etaS, legs: [{ kind, pts, length, label }], ... }

// typical speeds in m/s, for the ETA when standing still
import { CRUISE } from './reistijd.js';
const LONG_TRIP = 4000;
export const SPEED = { lopen: 1.5, fiets: 5, auto: 11, boot: 6, ov: 22, lucht: 35 };

export function etaSeconds(length, mode, speed = 0) {
  // a long trip by car averages the cruise speed, not the standing-start 11 m/s (#97)
  const typical = (mode === 'auto' && length > LONG_TRIP) ? CRUISE.auto : (SPEED[mode] || SPEED.auto);
  const v = Math.max(typical * 0.6, Math.abs(speed) > 1.5 ? Math.abs(speed) : typical);
  return length / v;
}

export function etaLabel(seconds) {
  const min = Math.max(1, Math.round(seconds / 60));
  if (min < 60) return `± ${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return `± ${h} u ${m ? `${m} min` : ''}`.trim();
}

const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
export function polyLength(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += dist(pts[i - 1], pts[i]);
  return L;
}

// ---- water ------------------------------------------------------------------

const CELL = 6;
const BOAT_PAD_M = 500;
// closer to the shore than this is no way for a hull; closer than SHORE_COST_M costs extra
const SHORE_SHUT_M = 0.5;
const SHORE_COST_M = 4;
const SHORE_SNAP_M = 160;

// A boat route over open water. ctx: { isWater(x, y), clearance?(x, y) (m to
// the shore or a moored hull), clearAt?(x, y) (free height under a bridge in m)
// }, opts: { height } (the boat's air draught). Cells under a bridge that is
// too low are shut, cells hugging the shore cost more. A goal on land is the
// nearest water within SHORE_SNAP_M plus a straight last bit (the quay).
export function boatRoute(ctx, a, b, opts = {}) {
  const height = opts.height ?? 2.2;
  const water = (x, y) => ctx.isWater(x, y) && (!ctx.clearAt || ctx.clearAt(x, y) >= height);
  const snap = (p) => {
    if (water(p[0], p[1])) return [p[0], p[1]];
    for (let r = CELL; r <= SHORE_SNAP_M; r += CELL) {
      const n = Math.max(8, Math.round(r / 3));
      for (let k = 0; k < n; k++) {
        const t = (k / n) * Math.PI * 2;
        const x = p[0] + Math.cos(t) * r, y = p[1] + Math.sin(t) * r;
        if (water(x, y)) return [x, y];
      }
    }
    return null;
  };
  const sa = snap(a), sb = snap(b);
  if (!sa || !sb) return null;
  const pad = BOAT_PAD_M + dist(sa, sb) * 0.5;
  const x0 = Math.min(sa[0], sb[0]) - pad, x1 = Math.max(sa[0], sb[0]) + pad;
  const y0 = Math.min(sa[1], sb[1]) - pad, y1 = Math.max(sa[1], sb[1]) + pad;
  const W = Math.ceil((x1 - x0) / CELL) + 1, H = Math.ceil((y1 - y0) / CELL) + 1;
  if (W * H > 2.5e6) return null;
  const at = (i, j) => [x0 + i * CELL, y0 + j * CELL];
  const cellOf = (p) => [Math.round((p[0] - x0) / CELL), Math.round((p[1] - y0) / CELL)];
  const open = new Int8Array(W * H).fill(-1);
  const isOpen = (i, j) => {
    if (i < 0 || j < 0 || i >= W || j >= H) return false;
    const k = j * W + i;
    if (open[k] < 0) {
      const [x, y] = at(i, j);
      let ok = water(x, y);
      if (ok && ctx.clearance && ctx.clearance(x, y) < SHORE_SHUT_M) ok = false;
      open[k] = ok ? 1 : 0;
    }
    return open[k] === 1;
  };
  const [si, sj] = cellOf(sa), [gi, gj] = cellOf(sb);
  // the snapped ends can sit on a shore cell the grid rounds to land: nudge to an open neighbour
  const nearOpen = (i, j) => {
    if (isOpen(i, j)) return [i, j];
    for (let r = 1; r <= 3; r++) for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) if (isOpen(i + di, j + dj)) return [i + di, j + dj];
    return null;
  };
  const S = nearOpen(si, sj), G = nearOpen(gi, gj);
  if (!S || !G) return null;
  const g = new Float32Array(W * H).fill(Infinity), prev = new Int32Array(W * H).fill(-1), done = new Uint8Array(W * H);
  const heap = [];
  const push = (f, k) => { heap.push([f, k]); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const t = heap[0], l = heap.pop(); if (heap.length) { heap[0] = l; let i = 0; for (;;) { let m = i; const c = 2 * i + 1, d = c + 1; if (c < heap.length && heap[c][0] < heap[m][0]) m = c; if (d < heap.length && heap[d][0] < heap[m][0]) m = d; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return t; };
  const h = (i, j) => Math.hypot(i - G[0], j - G[1]) * CELL;
  g[S[1] * W + S[0]] = 0;
  push(h(S[0], S[1]), S[1] * W + S[0]);
  const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  let found = false;
  while (heap.length) {
    const [, k] = pop();
    if (done[k]) continue;
    done[k] = 1;
    const i = k % W, j = (k / W) | 0;
    if (i === G[0] && j === G[1]) { found = true; break; }
    for (const [di, dj] of NB) {
      const ni = i + di, nj = j + dj;
      if (!isOpen(ni, nj)) continue;
      if (di && dj && (!isOpen(i + di, j) || !isOpen(i, j + dj))) continue;
      const nk = nj * W + ni;
      if (done[nk]) continue;
      const [nx, ny] = at(ni, nj);
      const near = ctx.clearance ? ctx.clearance(nx, ny) : 99;
      const step = (di && dj ? 1.4142 : 1) * CELL * (near < SHORE_COST_M ? 1 + (SHORE_COST_M - near) * 0.5 : 1);
      const ng = g[k] + step;
      if (ng < g[nk]) { g[nk] = ng; prev[nk] = k; push(ng + h(ni, nj), nk); }
    }
  }
  if (!found) return null;
  let cells = [];
  for (let k = G[1] * W + G[0]; k >= 0; k = prev[k]) cells.push(at(k % W, (k / W) | 0));
  cells.reverse();
  // pull the string: keep a point only when the straight line to the next one leaves the water
  const clear = (p, q) => {
    const n = Math.ceil(dist(p, q) / 4);
    for (let t = 1; t < n; t++) {
      const x = p[0] + (q[0] - p[0]) * t / n, y = p[1] + (q[1] - p[1]) * t / n;
      if (!water(x, y) || (ctx.clearance && ctx.clearance(x, y) < SHORE_SHUT_M)) return false;
    }
    return true;
  };
  const out = [cells[0]];
  let anchor = 0;
  for (let i = 2; i < cells.length; i++) {
    if (!clear(cells[anchor], cells[i])) { out.push(cells[i - 1]); anchor = i - 1; }
  }
  out.push(cells[cells.length - 1]);
  const pts = [[a[0], a[1]]];
  if (dist(a, out[0]) > 0.5) pts.push(out[0]);
  for (let i = 1; i < out.length; i++) pts.push(out[i]);
  if (dist(pts[pts.length - 1], b) > 0.5) pts.push([b[0], b[1]]);
  const length = polyLength(pts);
  return { mode: 'boot', pts, length, etaS: etaSeconds(length, 'boot'), legs: [{ kind: 'boat', pts, length, label: 'Varen' }], dock: dist(sb, b) > 1 ? sb : null };
}

// ---- train ------------------------------------------------------------------

const WAIT_S = 150;
const CHANGE_S = 240;
const TRAIN_V = 24;
const STATION_NEAR_M = 2500;

function prepLine(l) {
  if (l.s) return l;
  const s = [0];
  for (let i = 1; i < l.pts.length; i++) s.push(s[i - 1] + dist(l.pts[i - 1], l.pts[i]));
  return { ...l, s, len: s[s.length - 1] };
}

function pointAt(l, at) {
  const { pts, s } = l;
  if (at <= 0) return [pts[0][0], pts[0][1]];
  if (at >= s[s.length - 1]) return [pts[pts.length - 1][0], pts[pts.length - 1][1]];
  let lo = 0, hi = pts.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (s[m] <= at) lo = m; else hi = m; }
  const t = (at - s[lo]) / ((s[hi] - s[lo]) || 1);
  return [pts[lo][0] + (pts[hi][0] - pts[lo][0]) * t, pts[lo][1] + (pts[hi][1] - pts[lo][1]) * t];
}

// the track between arc lengths s0 and s1 (either way round)
export function sliceLine(l, s0, s1) {
  l = prepLine(l);
  const up = s1 >= s0, lo = Math.min(s0, s1), hi = Math.max(s0, s1);
  const out = [pointAt(l, lo)];
  for (let i = 0; i < l.pts.length; i++) if (l.s[i] > lo && l.s[i] < hi) out.push([l.pts[i][0], l.pts[i][1]]);
  out.push(pointAt(l, hi));
  return up ? out : out.reverse();
}

function project(l, x, y) {
  let best = Infinity, at = 0;
  for (let i = 1; i < l.pts.length; i++) {
    const ax = l.pts[i - 1][0], ay = l.pts[i - 1][1], dx = l.pts[i][0] - ax, dy = l.pts[i][1] - ay;
    const L2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
    const d2 = (ax + dx * t - x) ** 2 + (ay + dy * t - y) ** 2;
    if (d2 < best) { best = d2; at = l.s[i - 1] + (l.s[i] - l.s[i - 1]) * t; }
  }
  return { s: at, d: Math.sqrt(best) };
}

// Chained trip walk -> station -> train (-> change) -> station -> walk.
// ctx: { lines: [{ name, pts, stops: [{ name, s, offmap? }] }],
//        stations: [{ name, x, y }] (the entrance; else the track point),
//        walk?(a, b) -> pts | null (the road router; else a straight line) }
// opts: { onTrain } the player sits in a train: the start is the track under
// them instead of a station. Returns the legs, 'uitstappen' (where to get off)
// and 'changes' (where to change).
export function trainTrip(ctx, a, b, opts = {}) {
  const lines = ctx.lines.map(prepLine);
  const entrance = new Map();
  for (const s of ctx.stations || []) entrance.set(s.name, [s.x, s.y]);
  const stopXY = (li, si) => {
    const st = lines[li].stops[si];
    return entrance.get(st.name) || pointAt(lines[li], st.s);
  };
  const walk = ctx.walk || ((p, q) => [p, q]);
  // nodes: (line, stop). edges: along a line (rail time), and between lines at one station (a change)
  const key = (li, si) => `${li}|${si}`;
  const byName = new Map();
  lines.forEach((l, li) => l.stops.forEach((st, si) => { (byName.get(st.name) || byName.set(st.name, []).get(st.name)).push([li, si]); }));
  const dij = new Map(), prev = new Map(), heap = [];
  const push = (c, k) => { heap.push([c, k]); heap.sort((p, q) => p[0] - q[0]); };
  const startCosts = [];
  if (opts.onTrain) {
    lines.forEach((l, li) => {
      const pr = project(l, a[0], a[1]);
      if (pr.d > 30) return;
      l.stops.forEach((st, si) => startCosts.push([li, si, Math.abs(st.s - pr.s) / TRAIN_V, { line: li, s: pr.s }]));
    });
  } else {
    const near = [];
    lines.forEach((l, li) => l.stops.forEach((st, si) => { const d = dist(stopXY(li, si), a); if (d < STATION_NEAR_M) near.push([d, li, si]); }));
    near.sort((p, q) => p[0] - q[0]);
    const seen = new Set();
    for (const [d, li, si] of near) {
      const nm = lines[li].stops[si].name;
      if (seen.size >= 3 && !seen.has(nm)) continue;
      seen.add(nm);
      startCosts.push([li, si, d / SPEED.lopen + WAIT_S, null]);
    }
  }
  for (const [li, si, c, from] of startCosts) { const k = key(li, si); if (c < (dij.get(k) ?? Infinity)) { dij.set(k, c); prev.set(k, { from: null, start: from }); push(c, k); } }
  const goals = new Map();
  lines.forEach((l, li) => l.stops.forEach((st, si) => { const d = dist(stopXY(li, si), b); if (d < STATION_NEAR_M) goals.set(key(li, si), d); }));
  let best = null;
  while (heap.length) {
    const [c, k] = heap.shift();
    if (c > (dij.get(k) ?? Infinity)) continue;
    const [li, si] = k.split('|').map(Number);
    if (goals.has(k)) {
      const total = c + goals.get(k) / SPEED.lopen;
      if (!best || total < best.total) best = { k, total };
    }
    if (best && c > best.total) break;
    const l = lines[li];
    for (const nsi of [si - 1, si + 1]) {
      if (nsi < 0 || nsi >= l.stops.length) continue;
      if (l.stops[nsi].offmap) continue;
      const nk = key(li, nsi), nc = c + Math.abs(l.stops[nsi].s - l.stops[si].s) / TRAIN_V;
      if (nc < (dij.get(nk) ?? Infinity)) { dij.set(nk, nc); prev.set(nk, { from: k }); push(nc, nk); }
    }
    for (const [oli, osi] of byName.get(l.stops[si].name) || []) {
      if (oli === li) continue;
      const nk = key(oli, osi), nc = c + CHANGE_S;
      if (nc < (dij.get(nk) ?? Infinity)) { dij.set(nk, nc); prev.set(nk, { from: k, change: true }); push(nc, nk); }
    }
  }
  if (!best) return null;
  // unwind: the chain of nodes from the start
  const chain = [];
  for (let k = best.k; k; k = prev.get(k).from) chain.push(k);
  chain.reverse();
  const first = chain[0], startInfo = prev.get(first).start;
  const legs = [];
  const [l0, s0i] = first.split('|').map(Number);
  let boardXY;
  if (startInfo) {
    boardXY = a;
  } else {
    boardXY = stopXY(l0, s0i);
    const w = walk(a, boardXY);
    if (!w) return null;
    legs.push({ kind: 'walk', pts: w, length: polyLength(w), label: `Lopen naar ${lines[l0].stops[s0i].name}` });
  }
  const changes = [];
  const stops = startInfo ? [] : [{ kind: 'instap', name: lines[l0].stops[s0i].name, x: boardXY[0], y: boardXY[1] }];
  let runLine = l0, runFrom = startInfo ? startInfo.s : lines[l0].stops[s0i].s, runFromName = startInfo ? 'onderweg' : lines[l0].stops[s0i].name;
  const finishRun = (toSi) => {
    const l = lines[runLine], toS = l.stops[toSi].s;
    const pts = sliceLine(l, runFrom, toS);
    legs.push({ kind: 'train', pts, length: polyLength(pts), label: `${l.name}: ${runFromName} > ${l.stops[toSi].name}`, line: l.name, from: runFromName, to: l.stops[toSi].name });
  };
  for (let i = 1; i < chain.length; i++) {
    const [pl, ps] = chain[i - 1].split('|').map(Number), [cl, cs] = chain[i].split('|').map(Number);
    if (cl !== pl) {
      finishRun(ps);
      changes.push(lines[pl].stops[ps].name);
      const cxy = stopXY(pl, ps);
      stops.push({ kind: 'overstap', name: lines[pl].stops[ps].name, x: cxy[0], y: cxy[1] });
      runLine = cl; runFrom = lines[cl].stops[cs].s; runFromName = lines[cl].stops[cs].name;
    }
  }
  const [ll, lsi] = chain[chain.length - 1].split('|').map(Number);
  finishRun(lsi);
  const exitName = lines[ll].stops[lsi].name;
  const exitXY = stopXY(ll, lsi);
  stops.push({ kind: 'uitstap', name: exitName, x: exitXY[0], y: exitXY[1] });
  const w2 = walk(exitXY, b);
  if (!w2) return null;
  legs.push({ kind: 'walk', pts: w2, length: polyLength(w2), label: `Lopen naar je doel` });
  const pts = [];
  for (const lg of legs) for (const p of lg.pts) if (!pts.length || dist(pts[pts.length - 1], p) > 0.05) pts.push(p);
  const length = polyLength(pts);
  return { mode: 'ov', pts, length, etaS: best.total, legs, uitstappen: exitName, changes, exitXY, stops };
}

// ---- air --------------------------------------------------------------------

const NOFLY_MARGIN = 25;

// A straight line with a hint for the height, bent around no-fly zones.
// ctx: { noFly?: [{ x, y, r, name }], landings?: [{ x, y, name, kind }] }
// opts: { plane } (a plane cruises higher than a helicopter)
export function airRoute(ctx, a, b, opts = {}) {
  const zones = ctx.noFly || [];
  let pts = [[a[0], a[1]], [b[0], b[1]]];
  const hits = (p, q, z) => {
    const dx = q[0] - p[0], dy = q[1] - p[1], L2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((z.x - p[0]) * dx + (z.y - p[1]) * dy) / L2));
    return Math.hypot(p[0] + dx * t - z.x, p[1] + dy * t - z.y) < z.r + NOFLY_MARGIN * 0.5;
  };
  for (let guard = 0; guard < 8; guard++) {
    let changed = false;
    for (let i = 0; i < pts.length - 1 && !changed; i++) {
      for (const z of zones) {
        // a start or goal inside the zone is not detoured around
        if (dist(pts[i], [z.x, z.y]) < z.r || dist(pts[i + 1], [z.x, z.y]) < z.r) continue;
        if (!hits(pts[i], pts[i + 1], z)) continue;
        const p = pts[i], q = pts[i + 1];
        const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1;
        const nx = -dy / L, ny = dx / L;
        const side = (z.x - p[0]) * nx + (z.y - p[1]) * ny > 0 ? -1 : 1;
        const R = z.r + NOFLY_MARGIN;
        pts.splice(i + 1, 0, [z.x + nx * side * R * 1.15, z.y + ny * side * R * 1.15]);
        changed = true;
        break;
      }
    }
    if (!changed) break;
  }
  let landing = null, bd = 400;
  for (const l of ctx.landings || []) { const d = dist([l.x, l.y], b); if (d < bd) { bd = d; landing = l; } }
  const length = polyLength(pts);
  const alt = opts.plane ? Math.max(120, Math.min(300, 90 + length * 0.04)) : Math.max(45, Math.min(110, 40 + length * 0.02));
  return { mode: 'lucht', pts, length, etaS: etaSeconds(length, 'lucht'), legs: [{ kind: 'air', pts, length, label: 'Vliegen' }], alt: Math.round(alt / 5) * 5, landing };
}

export function airHint(t) {
  if (!t) return '';
  return `Hoogte ± ${t.alt} m${t.landing ? ` · landen: ${t.landing.name}` : ''}`;
}
