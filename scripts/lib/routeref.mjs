// Referentie voor de routekwaliteit (#320): de kortste weg over de echte wegen in zuivere lengte, zonder wegtypestraffen,
// afslagkosten of snelheidsklassen. De stadsstraten (map.roads) en het provincienet (roadNet) vormen samen één graaf; knopen vallen
// samen op een halve meter (zoals routing.js en roadgraph.js ze koppelen). Alleen auto: wegen die roadAllowed('auto') toelaat,
// eenrichting gerespecteerd. De test vergelijkt de gekozen route met deze kortste weg tussen dezelfde begin- en eindpunten.
import { roadAllowed } from '../../game/js/roadaccess.js';

const key = (x, y) => (Math.round(x * 2) + 400000) * 800000 + (Math.round(y * 2) + 400000);

// zelfde keuze als routing.js isDrivable voor stadswegen
export const cityDrivable = (r) => r.cat !== 'foot' && r.cat !== 'cycle' && !r.busOnly && roadAllowed(r, 'auto') !== false;

// roads: [{ pts, oneway }] (stad én provincie, al gefilterd op bereikbaar voor auto)
// skip(road, ax, ay, bx, by): true voor een wegstuk dat niet bruikbaar is (bijvoorbeeld dwars door een gebouw)
export function buildRef(roads, skip = null) {
  const ids = new Map();
  const xs = [], ys = [];
  const nodeOf = (x, y) => {
    const k = key(x, y);
    let id = ids.get(k);
    if (id === undefined) { id = xs.length; ids.set(k, id); xs.push(x); ys.push(y); }
    return id;
  };
  const flat = [];
  const segs = [];
  roads.forEach((r, ri) => {
    const p = r.pts;
    let a = nodeOf(p[0][0], p[0][1]);
    for (let i = 1; i < p.length; i++) {
      const b = nodeOf(p[i][0], p[i][1]);
      if (a === b) { continue; }
      if (skip && skip(r, xs[a], ys[a], xs[b], ys[b])) { a = b; continue; }
      const len = Math.hypot(xs[b] - xs[a], ys[b] - ys[a]);
      flat.push(a, b, len, r.oneway ? 1 : 0);
      segs.push({ a, b, len, ri, za: r.z ? r.z[i - 1] : 0, zb: r.z ? r.z[i] : 0 });
      a = b;
    }
  });
  const N = xs.length;
  const start = new Int32Array(N + 1);
  for (let e = 0; e < flat.length; e += 4) { start[flat[e] + 1]++; if (!flat[e + 3]) start[flat[e + 1] + 1]++; }
  for (let i = 0; i < N; i++) start[i + 1] += start[i];
  const fill = start.slice(0, N);
  const to = new Int32Array(start[N]), len = new Float32Array(start[N]), roadOf = new Int32Array(start[N]);
  for (let e = 0; e < flat.length; e += 4) {
    let q = fill[flat[e]]++;
    to[q] = flat[e + 1]; len[q] = flat[e + 2]; roadOf[q] = segs[e / 4].ri;
    if (!flat[e + 3]) { q = fill[flat[e + 1]]++; to[q] = flat[e]; len[q] = flat[e + 2]; roadOf[q] = segs[e / 4].ri; }
  }
  // samenhangende delen (onbewaakt: een los wegstuk is geen doel van de referentie)
  const uf = new Int32Array(N).map((_, i) => i);
  const find = (i) => { while (uf[i] !== i) { uf[i] = uf[uf[i]]; i = uf[i]; } return i; };
  for (const s of segs) uf[find(s.a)] = find(s.b);
  const size = new Map();
  for (const s of segs) { const c = find(s.a); size.set(c, (size.get(c) || 0) + 1); }
  let main = -1;
  for (const [c, n] of size) if (main < 0 || n > size.get(main)) main = c;
  const inMain = (s) => find(s.a) === main;
  // rasterindex van segmenten voor het snappen (cel 100 m)
  const CELL = 100, grid = new Map();
  segs.forEach((s, i) => {
    const x0 = xs[s.a], y0 = ys[s.a], x1 = xs[s.b], y1 = ys[s.b];
    for (let cx = Math.floor(Math.min(x0, x1) / CELL); cx <= Math.floor(Math.max(x0, x1) / CELL); cx++) {
      for (let cy = Math.floor(Math.min(y0, y1) / CELL); cy <= Math.floor(Math.max(y0, y1) / CELL); cy++) {
        const k = cx * 100003 + cy;
        const l = grid.get(k);
        if (l) l.push(i); else grid.set(k, [i]);
      }
    }
  });
  return { N, x: Float64Array.from(xs), y: Float64Array.from(ys), start, to, len, roadOf, segs, grid, CELL, roads, inMain };
}

// de dichtstbijzijnde wegstukken binnen maxD: [{ seg, t, x, y, d }], het nabijste eerst; stukken die niet meer dan tol verder liggen
// horen erbij (op een kruispunt liggen er meer even dichtbij: een afrit, een eenrichtingsstraat ernaast)
// opts: { tol, mainOnly, z } (z: de hoogte van het punt; een weg op een andere hoogte (brug, of de straat eronder) valt af)
export function snapRef(G, x, y, maxD = 600, { tol = 0.3, mainOnly = true, z = null } = {}) {
  let hits = [];
  for (let r = 25; ; r *= 2) {
    const R = Math.min(r, maxD);
    hits = [];
    for (let cx = Math.floor((x - R) / G.CELL); cx <= Math.floor((x + R) / G.CELL); cx++) {
      for (let cy = Math.floor((y - R) / G.CELL); cy <= Math.floor((y + R) / G.CELL); cy++) {
        const l = G.grid.get(cx * 100003 + cy);
        if (!l) continue;
        for (const i of l) {
          const s = G.segs[i];
          if (mainOnly && !G.inMain(s)) continue;
          const ax = G.x[s.a], ay = G.y[s.a], dx = G.x[s.b] - ax, dy = G.y[s.b] - ay, l2 = dx * dx + dy * dy;
          let t = l2 > 1e-9 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const d = Math.hypot(ax + dx * t - x, ay + dy * t - y);
          hits.push({ seg: i, t, x: ax + dx * t, y: ay + dy * t, d });
        }
      }
    }
    if (hits.length || R >= maxD) break;
  }
  if (!hits.length) return null;
  if (Number.isFinite(z)) {
    const same = hits.filter((h) => { const s = G.segs[h.seg]; return Math.abs(s.za + (s.zb - s.za) * h.t - z) <= 2.5; });
    if (same.length) hits = same;
  }
  hits.sort((u, v) => u.d - v.d);
  const near = hits.filter((h) => h.d <= hits[0].d + tol).slice(0, 8);
  const out = near[0];
  out.alts = near;
  return out;
}

class Heap {
  constructor() { this.f = []; this.n = []; }
  get size() { return this.n.length; }
  push(f, n) {
    const F = this.f, Nn = this.n;
    let i = Nn.length;
    F.push(f); Nn.push(n);
    while (i > 0) { const p = (i - 1) >> 1; if (F[p] <= f) break; F[i] = F[p]; Nn[i] = Nn[p]; i = p; }
    F[i] = f; Nn[i] = n;
  }
  pop() {
    const F = this.f, Nn = this.n, top = Nn[0], lf = F.pop(), ln = Nn.pop(), len = Nn.length;
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
}

// Kortste weglengte tussen twee snaps (A* met de hemelsbrede afstand als ondergrens); Infinity als er geen weg is.
// Elk wegstuk van from.alts is een mogelijk begin, van to.alts een mogelijk eind. Eenrichting: het beginstuk is alleen vooruit te
// verlaten, het eindstuk alleen vanaf het begin te bereiken. path (optioneel) krijgt de wegindexen van de kortste weg.
export function refLength(G, from, to, path = null) {
  const froms = from.alts || [from], tos = to.alts || [to];
  const g = new Float64Array(G.N).fill(Infinity);
  const prev = path ? new Int32Array(G.N).fill(-1) : null, via = path ? new Int32Array(G.N).fill(-1) : null;
  const done = new Uint8Array(G.N);
  const heap = new Heap();
  const h = (n) => Math.max(0, Math.hypot(G.x[n] - to.x, G.y[n] - to.y) - 10);
  const relax = (n, c, p = -1, ri = -1) => { if (c < g[n]) { g[n] = c; if (prev) { prev[n] = p; via[n] = ri; } heap.push(c + h(n), n); } };
  let best = Infinity, endN = -1, endSeg = -1;
  for (const f of froms) {
    const sf = G.segs[f.seg], oneF = G.roads[sf.ri].oneway;
    relax(sf.b, (1 - f.t) * sf.len, -1, sf.ri);
    if (!oneF) relax(sf.a, f.t * sf.len, -1, sf.ri);
    for (const t of tos) {
      if (f.seg === t.seg && (!oneF || t.t >= f.t) && Math.abs(t.t - f.t) * sf.len < best) { best = Math.abs(t.t - f.t) * sf.len; endN = -2; endSeg = t.seg; }
    }
  }
  const goals = new Map();
  for (const t of tos) {
    const st = G.segs[t.seg], oneT = G.roads[st.ri].oneway;
    for (const [n, extra, ok] of [[st.a, t.t * st.len, true], [st.b, (1 - t.t) * st.len, !oneT]]) {
      if (!ok) continue;
      const l = goals.get(n);
      if (l) l.push({ extra, seg: t.seg }); else goals.set(n, [{ extra, seg: t.seg }]);
    }
  }
  while (heap.size) {
    const n = heap.pop();
    if (done[n]) continue;
    done[n] = 1;
    const gn = g[n];
    if (gn + h(n) >= best) break;
    const gl = goals.get(n);
    if (gl) for (const e of gl) if (gn + e.extra < best) { best = gn + e.extra; endN = n; endSeg = e.seg; }
    for (let e = G.start[n]; e < G.start[n + 1]; e++) {
      const m = G.to[e];
      if (!done[m]) relax(m, gn + G.len[e], n, G.roadOf[e]);
    }
  }
  if (path && endN >= 0) { for (let n = endN; n >= 0; n = prev[n]) path.push(via[n]); path.push(G.segs[endSeg].ri); path.reverse(); }
  return best;
}
