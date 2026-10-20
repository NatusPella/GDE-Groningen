// Het spoor van de stad uit de OSM-elementen van de tegelbouw (#90, STAD_LAAG=rails): scripts/add_railways.py in JS.
//
//   cityRail({ elements, roads, bounds })  ->  { rails, stations, levelCrossings, railRoutes, railLifts, cut }
//
//   rails          [{pts, service}]            elke railway=rail-weg, afgeknipt op de kaart (+ rand)
//   stations       [{name, x, y}]              railway=station/halt-knopen binnen de kaart
//   levelCrossings [{x, y, railAngle, roads}]  railway=level_crossing-knopen, gegroepeerd, met de wegen die er over gaan
//   railRoutes     [{name, train, pts, stops}] de dienstroutes die de treinen rijden
//   railLifts      [{x, y, h, plateau, ramp}]  waar het spoor over een weg stijgt
//   cut            aantal voet-/fietspaden dat bij een spoorkruising is afgeknipt (roads wordt aangepast)
//
// De elementen zijn die van de packcaches ({ type, id, tags, g: [[lat, lon]] } voor wegen, lat/lon voor knopen),
// zonder knoop-id's: een knoop is een punt in het wereldraam (op de cm).
import { wgsToWorld, legacyToWorld } from '../../game/js/rdnew.js';

const STATION_NAMES = { Groningen: 'Groningen Hoofdstation' };
// (naam, treintype, wegpunten). Elke dienst begint op het Hoofdstation; ('exit', x, y, bestemming) is waar de lijn de kaart verlaat:
// het spoor wordt daarna EXIT_RUN m verder doorgetrokken zodat de trein uit beeld kan rijden en terugkomen.
const ROUTES = [
  ['Stoptrein Roodeschool', 'gtw', ['Groningen Hoofdstation', 'Groningen Noord', ['exit', ...legacyToWorld(-1000, -4400), 'Roodeschool']]],
  ['Intercity Zwolle', 'virm', ['Groningen Hoofdstation', 'Groningen Europapark', ['exit', ...legacyToWorld(2254, 2320), 'Zwolle']]],
  // (Winschoten rijdt over het spoor van Zwolle tot de rand van de kaart: de oude kaart kende het aftakkende spoor nog niet en een eigen eindpunt op de aftakking laat de lijn rechtdoor het niets in rijden)
  ['Stoptrein Winschoten', 'wink', null, { like: 'Intercity Zwolle', exit: 'Winschoten' }],
  ['Stoptrein Leeuwarden', 'gtw', ['Groningen Hoofdstation', ['exit', ...legacyToWorld(-3600, 910), 'Leeuwarden']]],
];
const EXIT_RUN = 800.0;
// spoor dat over wegen wordt getild die het zonder overweg kruist (OSM: spoorbruggen, en wegbruggen die we omkeren)
const LIFT_CAR = 6.0, LIFT_CYCLE = 3.6, LIFT_GRADE = 0.05;
const MAX_TURN = (28 * Math.PI) / 180;
const ROUTE_OVERRUN = 220.0, CLIP_MARGIN = 150.0, RAIL_CUT = 4.0;

const hyp = Math.hypot;
const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;
const nkey = (p) => `${Math.round(p[0] * 100)},${Math.round(p[1] * 100)}`;

function segIntersectClosed(a, b, c, d) {
  const rx = b[0] - a[0], ry = b[1] - a[1], sx = d[0] - c[0], sy = d[1] - c[1];
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-9) return null;
  const qx = c[0] - a[0], qy = c[1] - a[1];
  const t = (qx * sy - qy * sx) / den, u = (qx * ry - qy * rx) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [t, u] : null;
}

function liftHeight(lifts, x, y) {
  let h = 0.0;
  for (const L of lifts) {
    const d = hyp(L.x - x, L.y - y) - L.plateau;
    h = Math.max(h, d > 0 ? L.h * Math.max(0.0, Math.min(1.0, 1 - d / L.ramp)) : L.h);
  }
  return h;
}

function subPolyline(pts, acc, s0, s1) {
  const at = (s) => {
    for (let i = 0; i < pts.length; i++) {
      if (Math.abs(acc[i] - s) < 1e-6) return pts[i].slice();
      if (i + 1 < pts.length && acc[i + 1] > s) {
        const t = (s - acc[i]) / ((acc[i + 1] - acc[i]) || 1);
        return [r1(pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t), r1(pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t)];
      }
    }
    return pts[pts.length - 1].slice();
  };
  s0 = Math.max(0.0, s0); s1 = Math.min(acc[acc.length - 1], s1);
  const mid = [];
  for (let i = 0; i < pts.length; i++) if (s0 + 1e-6 < acc[i] && acc[i] < s1 - 1e-6) mid.push(pts[i].slice());
  return [at(s0), ...mid, at(s1)];
}

// voet- en fietspaden die een spoor op straatniveau kruisen buiten een overweg (meestal onderdoorgangen die het spel niet kan bouwen)
// verliezen het stuk over de rails, zodat niemand er overheen loopt of fietst
export function cutPathsAtRails(roads, rails, lifts, lcPts) {
  const G = 50.0, grid = new Map();
  const cellKey = (gx, gy) => gx * 1e6 + gy;
  for (const r of rails) for (let q = 0; q < r.pts.length - 1; q++) {
    const a = r.pts[q], b = r.pts[q + 1];
    for (let gx = Math.floor(Math.min(a[0], b[0]) / G); gx <= Math.floor(Math.max(a[0], b[0]) / G); gx++) {
      for (let gy = Math.floor(Math.min(a[1], b[1]) / G); gy <= Math.floor(Math.max(a[1], b[1]) / G); gy++) {
        const k = cellKey(gx, gy);
        let c = grid.get(k);
        if (!c) grid.set(k, c = []);
        c.push([a, b]);
      }
    }
  }
  const extra = [];
  let n = 0;
  for (const road of roads) {
    if ((road.cat !== 'foot' && road.cat !== 'cycle') || road.bridge) continue;
    const pts = road.pts;
    const acc = [0.0];
    for (let q = 0; q < pts.length - 1; q++) acc.push(acc[acc.length - 1] + hyp(pts[q + 1][0] - pts[q][0], pts[q + 1][1] - pts[q][1]));
    const hits = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const cand = new Set(), candList = [];
      for (let gx = Math.floor(Math.min(a[0], b[0]) / G); gx <= Math.floor(Math.max(a[0], b[0]) / G); gx++) {
        for (let gy = Math.floor(Math.min(a[1], b[1]) / G); gy <= Math.floor(Math.max(a[1], b[1]) / G); gy++) {
          for (const s of grid.get(cellKey(gx, gy)) || []) if (!cand.has(s)) { cand.add(s); candList.push(s); }
        }
      }
      for (const [ra, rb] of candList) {
        const hit = segIntersectClosed(a, b, ra, rb);
        if (hit === null) continue;
        const hx = a[0] + (b[0] - a[0]) * hit[0], hy = a[1] + (b[1] - a[1]) * hit[0];
        if (lcPts.some(([x, y]) => hyp(hx - x, hy - y) < 20) || liftHeight(lifts, hx, hy) > 2.6) continue;
        hits.push(acc[i] + (acc[i + 1] - acc[i]) * hit[0]);
      }
    }
    if (!hits.length) continue;
    hits.sort((p, q) => p - q);
    const gaps = [];
    let s0 = hits[0], s1 = hits[0];
    for (const s of hits.slice(1)) {
      if (s - s1 > 25) { gaps.push([s0, s1]); s0 = s; }
      s1 = s;
    }
    gaps.push([s0, s1]);
    const keep = [];
    let start = 0.0;
    for (const [g0, g1] of gaps) { keep.push([start, g0 - RAIL_CUT]); start = g1 + RAIL_CUT; }
    keep.push([start, acc[acc.length - 1]]);
    const pieces = keep.filter(([a, b]) => b - a >= 3.0).map(([a, b]) => subPolyline(pts, acc, a, b));
    n++;
    road.pts = pieces.length ? pieces[0] : [pts[0].slice(), pts[0].slice()];
    for (const p of pieces.slice(1)) extra.push({ ...road, pts: p });
  }
  // (een stuk dat tot een punt is geschrompeld verdwijnt)
  const kept = roads.filter((r) => !(r.pts.length === 2 && r.pts[0][0] === r.pts[1][0] && r.pts[0][1] === r.pts[1][1]));
  roads.length = 0;
  roads.push(...kept, ...extra);
  return n;
}

class MinHeap {
  constructor() { this.a = []; this.n = 0; }
  get size() { return this.a.length; }
  less(i, j) { const x = this.a[i], y = this.a[j]; return x[0] < y[0] || (x[0] === y[0] && x[2] < y[2]); }
  push(d, v) {
    const a = this.a; a.push([d, v, this.n++]);
    for (let i = a.length - 1; i > 0;) { const p = (i - 1) >> 1; if (!this.less(i, p)) break; [a[p], a[i]] = [a[i], a[p]]; i = p; }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      for (let i = 0; ;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(l, m)) m = l;
        if (r < a.length && this.less(r, m)) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]]; i = m;
      }
    }
    return top;
  }
}

export function cityRail({ elements, roads, bounds, project = wgsToWorld }) {
  const [bx0, by0, bx1, by1] = bounds;
  const inside = (p, margin = CLIP_MARGIN) => bx0 - margin <= p[0] && p[0] <= bx1 + margin && by0 - margin <= p[1] && p[1] <= by1 + margin;
  const geomOf = (e) => e.g || (e.geometry || []).map((q) => [q.lat, q.lon]);
  const ways = elements.filter((e) => e.type === 'way' && (e.tags || {}).railway === 'rail' && geomOf(e).length >= 2);

  // het sporennet: knopen op de cm, kanten met kosten (dienstsporen drie keer zo duur)
  const nodesXY = new Map(), adj = new Map();
  const wayNodes = ways.map((w) => geomOf(w).map(([la, lo]) => { const p = project(la, lo), k = nkey(p); if (!nodesXY.has(k)) nodesXY.set(k, p); return k; }));
  ways.forEach((w, wi) => {
    const ids = wayNodes[wi], cost = w.tags.service === undefined ? 1.0 : 3.0;
    for (let i = 0; i < ids.length - 1; i++) {
      const a = ids[i], b = ids[i + 1];
      if (!adj.has(a)) adj.set(a, []);
      if (!adj.has(b)) adj.set(b, []);
      adj.get(a).push([b, cost]); adj.get(b).push([a, cost]);
    }
  });

  // rails: afgeknipte polylijnen
  const rails = [];
  ways.forEach((w, wi) => {
    let run = [];
    const pts = wayNodes[wi].map((k) => nodesXY.get(k));
    for (const p of [...pts, null]) {
      if (p !== null && inside(p)) { run.push([r1(p[0]), r1(p[1])]); continue; }
      if (run.length >= 2) rails.push({ pts: run, service: w.tags.service || w.tags.usage || 'main' });
      run = [];
    }
  });

  // stations
  const stations = [];
  for (const e of elements) {
    const t = e.tags || {};
    if (e.type === 'node' && (t.railway === 'station' || t.railway === 'halt') && e.lat !== undefined) {
      const [x, y] = project(e.lat, e.lon);
      if (inside([x, y], 0)) stations.push({ name: STATION_NAMES[t.name] || t.name, x: r1(x), y: r1(y) });
    }
  }
  const byName = new Map(stations.map((s) => [s.name, s]));

  // treinroutes
  const turnOk = (p, u, v) => {
    if (p === null) return true;
    const pp = nodesXY.get(p), uu = nodesXY.get(u), vv = nodesXY.get(v);
    const ax = uu[0] - pp[0], ay = uu[1] - pp[1], bx = vv[0] - uu[0], by = vv[1] - uu[1];
    const la = hyp(ax, ay), lb = hyp(bx, by);
    if (la < 1e-6 || lb < 1e-6) return true;
    const c = Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb)));
    return Math.acos(c) <= MAX_TURN;
  };
  const nearNodes = (st, radius) => [...nodesXY].filter(([, [x, y]]) => hyp(x - st.x, y - st.y) < radius).map(([k]) => k);
  const used = new Set();
  const edgeKey = (u, v) => (u < v ? `${u}|${v}` : `${v}|${u}`);
  const route = (starts, dst) => {
    const goals = new Set(dst), pq = new MinHeap(), best = new Map(), parent = new Map();
    for (const [n, prev] of starts) pq.push(0.0, [n, prev, null]);
    while (pq.size) {
      const [d, [u, p, par]] = pq.pop();
      const k = `${u}#${p}`;
      if (best.has(k)) continue;
      best.set(k, d); parent.set(k, par);
      if (goals.has(u)) {
        const path = [u];
        let kk = par;
        while (kk !== null) { path.push(kk.split('#')[0]); kk = parent.get(kk); }
        return path.reverse();
      }
      for (const [v, cost] of adj.get(u) || []) {
        if (v === p || !turnOk(p, u, v)) continue;
        if (best.has(`${v}#${u}`)) continue;
        const seg = hyp(nodesXY.get(v)[0] - nodesXY.get(u)[0], nodesXY.get(v)[1] - nodesXY.get(u)[1]);
        pq.push(d + seg * cost * (used.has(edgeKey(u, v)) ? 4.0 : 1.0), [v, u, k]);
      }
    }
    return null;
  };
  const extend = (path, dist) => {
    const out = path.slice();
    let run = 0.0;
    while (run < dist) {
      const u = out[out.length - 1], p = out[out.length - 2];
      const opts = (adj.get(u) || []).map(([v]) => v).filter((v) => v !== p && !out.includes(v) && turnOk(p, u, v));
      if (!opts.length) break;
      const v = opts[0];
      run += hyp(nodesXY.get(v)[0] - nodesXY.get(u)[0], nodesXY.get(v)[1] - nodesXY.get(u)[1]);
      out.push(v);
    }
    return out;
  };
  const densify8 = (pts) => {
    const out = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], L = hyp(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.floor(L / 8));
      for (let q = 1; q <= n; q++) out.push([a[0] + (b[0] - a[0]) * q / n, a[1] + (b[1] - a[1]) * q / n]);
    }
    return out;
  };
  const arcOf = (pts, x, y) => {
    let best = null, s = 0.0, run = 0.0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], L = hyp(dx, dy);
      if (L < 1e-6) continue;
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (L * L)));
      const d = hyp(a[0] + dx * t - x, a[1] + dy * t - y);
      if (best === null || d < best) { best = d; s = run + L * t; }
      run += L;
    }
    return s;
  };
  // (het uitgangspunt ligt op de hoofd- of aftakspoor: een opstelspoor of wissel ernaast is een doodlopende bestemming)
  const mainNodes = new Set();
  ways.forEach((w, wi) => { if (w.tags.service === undefined) for (const k of wayNodes[wi]) mainNodes.add(k); });
  const nearestNode = (x, y) => {
    let bk = null, bd = Infinity;
    for (const [k, p] of nodesXY) { if (!mainNodes.has(k)) continue; const d = hyp(p[0] - x, p[1] - y); if (d < bd) { bd = d; bk = k; } }
    return bk;
  };

  const railRoutes = [];
  for (const [name, train, waypoints, share] of ROUTES) {
    if (share) {
      const like = railRoutes.find((r) => r.name === share.like);
      if (like) railRoutes.push({ name, train, pts: like.pts.map((p) => p.slice()), stops: like.stops.map((st) => (st.offmap ? { ...st, name: share.exit } : { ...st })) });
      continue;
    }
    const first = byName.get(waypoints[0]);
    if (!first) continue;
    let path = null, exitName = null, ok = true;
    for (const wp of waypoints.slice(1)) {
      let dst;
      if (Array.isArray(wp)) { dst = [nearestNode(wp[1], wp[2])]; exitName = wp[3]; }
      else { const st = byName.get(wp); if (!st) { ok = false; break; } dst = nearNodes(st, 110); }
      const starts = path === null ? nearNodes(first, 130).map((n) => [n, null]) : [[path[path.length - 1], path[path.length - 2] === undefined ? null : path[path.length - 2]]];
      const seg = route(starts, dst);
      if (!seg) { ok = false; break; }
      path = path === null ? seg : path.concat(seg.slice(1));
    }
    if (!ok || !path) continue;
    path = extend(path.slice().reverse(), ROUTE_OVERRUN).reverse();
    for (let i = 0; i < path.length - 1; i++) used.add(edgeKey(path[i], path[i + 1]));
    const raw = path.map((n) => nodesXY.get(n));
    const [ax, ay] = raw[raw.length - 2], [bx, by] = raw[raw.length - 1];
    const l = hyp(bx - ax, by - ay) || 1;
    raw.push([bx + (bx - ax) / l * EXIT_RUN, by + (by - ay) / l * EXIT_RUN]);
    const pts = densify8(raw);
    let L = 0;
    for (let i = 0; i < pts.length - 1; i++) L += hyp(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    const stops = [];
    for (const wp of waypoints) {
      if (Array.isArray(wp)) continue;
      const st = byName.get(wp);
      stops.push({ name: st.name, s: r1(arcOf(pts, st.x, st.y)) });
    }
    stops.sort((a, b) => a.s - b.s);
    stops.push({ name: exitName, s: r1(L - 120), offmap: true });
    railRoutes.push({ name, train, pts: pts.map(([x, y]) => [r1(x), r1(y)]), stops });
  }

  // overwegen
  const lcNodes = elements.filter((e) => e.type === 'node' && (e.tags || {}).railway === 'level_crossing' && e.lat !== undefined).map((e) => project(e.lat, e.lon));
  const groups = [];
  for (const p of lcNodes) {
    const g = groups.find((q) => hyp(q.cx - p[0], q.cy - p[1]) < 18);
    if (g) { g.pts.push(p); g.cx = g.pts.reduce((a, q) => a + q[0], 0) / g.pts.length; g.cy = g.pts.reduce((a, q) => a + q[1], 0) / g.pts.length; }
    else groups.push({ pts: [p], cx: p[0], cy: p[1] });
  }
  const railSegs = [];
  for (const r of rails) for (let i = 0; i < r.pts.length - 1; i++) railSegs.push([r.pts[i], r.pts[i + 1]]);
  const levelCrossings = [];
  for (const g of groups) {
    const { cx, cy } = g;
    if (!inside([cx, cy], 0)) continue;
    const nearRails = railSegs.filter((s) => Math.min(hyp(s[0][0] - cx, s[0][1] - cy), hyp(s[1][0] - cx, s[1][1] - cy)) < 60);
    const roadsOut = [];
    for (const road of roads) {
      if (road.bridge || road.tunnel) continue;
      const pts = road.pts;
      if (!pts.some((p) => hyp(p[0] - cx, p[1] - cy) < 80)) continue;
      const hits = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        for (const s of nearRails) {
          const r = segIntersectClosed(a, b, s[0], s[1]);
          if (r === null) continue;
          const hx = a[0] + (b[0] - a[0]) * r[0], hy = a[1] + (b[1] - a[1]) * r[0];
          if (hyp(hx - cx, hy - cy) > 16) continue;
          hits.push([hx, hy, a, b]);
        }
      }
      if (!hits.length) continue;
      const [a, b] = [hits[0][2], hits[0][3]];
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const ux = Math.cos(ang), uy = Math.sin(ang), ox = hits[0][0], oy = hits[0][1];
      const ts = hits.map((h) => (h[0] - ox) * ux + (h[1] - oy) * uy);
      roadsOut.push({
        x: r2(ox), y: r2(oy), angle: Math.round(ang * 1e4) / 1e4,
        t0: r2(Math.min(...ts)), t1: r2(Math.max(...ts)),
        width: road.width === undefined ? 6 : road.width, cat: road.cat, name: road.name === undefined ? null : road.name,
        oneway: !!road.oneway,
      });
    }
    if (!roadsOut.length) continue;
    let s0 = null, bd = Infinity;
    for (const s of nearRails) { const d = hyp((s[0][0] + s[1][0]) / 2 - cx, (s[0][1] + s[1][1]) / 2 - cy); if (d < bd) { bd = d; s0 = s; } }
    levelCrossings.push({
      x: r1(cx), y: r1(cy),
      railAngle: Math.round(Math.atan2(s0[1][1] - s0[0][1], s0[1][0] - s0[0][0]) * 1e4) / 1e4,
      roads: roadsOut,
    });
  }

  // ongelijkvloers: waar het spoor over een weg moet
  const lcPts = levelCrossings.map((c) => [c.x, c.y]);
  const railBridgeSegs = [];
  ways.forEach((w, wi) => {
    const t = w.tags;
    const br = ['yes', 'viaduct', 'movable'].includes(t.bridge) || !['0', '-1'].includes(t.layer === undefined ? '0' : t.layer);
    const g = wayNodes[wi].map((k) => nodesXY.get(k));
    for (let i = 0; i < g.length - 1; i++) railBridgeSegs.push([g[i], g[i + 1], br]);
  });
  const lifts = [];
  for (const road of roads) {
    const cat = road.cat;
    if (cat === 'foot') continue;
    const pts = road.pts, zs = road.z;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      for (const [ra, rb, isBridge] of railBridgeSegs) {
        const hit = segIntersectClosed(a, b, ra, rb);
        if (hit === null) continue;
        // de ring gaat hier al over/onder het spoor (ring_elevation.mjs)
        if (zs && Math.abs(zs[i] + (zs[i + 1] - zs[i]) * hit[0]) > 3) continue;
        const hx = a[0] + (b[0] - a[0]) * hit[0], hy = a[1] + (b[1] - a[1]) * hit[0];
        if (lcPts.some(([x, y]) => hyp(hx - x, hy - y) < 30)) continue;
        if (cat === 'cycle' && !isBridge) continue;
        const h = cat === 'cycle' ? LIFT_CYCLE : LIFT_CAR;
        const ux = b[0] - a[0], uy = b[1] - a[1], vx = rb[0] - ra[0], vy = rb[1] - ra[1];
        const sin = Math.abs(ux * vy - uy * vx) / ((hyp(ux, uy) * hyp(vx, vy)) || 1);
        const plateau = Math.min(35.0, ((road.width === undefined ? 6 : road.width) / 2 + 5) / Math.max(0.35, sin));
        const near = lifts.find((L) => hyp(L.x - hx, L.y - hy) < 12);
        if (near) { near.h = Math.max(near.h, h); near.plateau = Math.max(near.plateau, plateau); }
        else lifts.push({ x: hx, y: hy, h, plateau, name: road.name });
      }
    }
  }
  for (const L of lifts) {
    let ramp = L.h / LIFT_GRADE;
    for (const [x, y] of lcPts) {
      const room = hyp(L.x - x, L.y - y) - L.plateau - 15;
      if (room < ramp) { ramp = Math.max(30.0, room); L.h = Math.min(L.h, ramp * 0.1); }
    }
    L.ramp = r1(ramp); L.x = r1(L.x); L.y = r1(L.y); L.h = r2(L.h); L.plateau = r1(L.plateau);
    delete L.name;
  }
  const cut = cutPathsAtRails(roads, rails, lifts, lcPts);
  return { rails, stations, levelCrossings, railRoutes, railLifts: lifts, cut };
}
