import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import {
  BLOCK, ROAD_IN, ROAD_W, MAAR_HW, COUNTRY_UNIFORMS, EDGE_TEX_W, EDGE_SLOTS,
  chash, edgeDistance, countryWeight, edgeRoad, maarX, maarY, setEdgeQuery, setCountryMask, realWater,
} from './countryfield.js';
import { REAL, realBlocked, buildRealSigns } from './countryreal.js';

// an integer sampler must never see the default float texture
{
  const t = new THREE.DataTexture(new Uint16Array(4), 1, 1, THREE.RGBAIntegerFormat, THREE.UnsignedShortType);
  t.internalFormat = 'RGBA16UI';
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  COUNTRY_UNIFORMS.uEdgeGrid.value = t;
}

// Where the real map meets the Ommelanden. City roads that run off the map
// carry on as matching roads (same width, tapering to a polder road) until
// they meet the polder grid; city canals carry on as canals; the rail lines
// that leave the map keep a clear corridor; and a fringe of outskirts -
// allotments, sports parks, a business park, ribbon houses along the roads
// out, noise barriers along the big ones - thins out into open farmland.
// Computed once from the map data, deterministic; queried by the field
// (ground shader + surfaces), the plan, the props and the maps.

const C = ROAD_IN + ROAD_W / 2;
const CAR = { major: 3, normal: 2, minor: 1 };
const MAX_SEGS = 240;
export const FRINGE = 450;

export const EDGE = {
  ready: false, bounds: null, connectors: [], segs: [], canals: [], rails: [],
  features: [], houses: [], barriers: [], trees: [], signs: [], bridges: [],
  byTile: new Map(), byBlock: new Map(), railCells: new Set(),
};

const sideOf = (B, x, y) => {
  const d = [x - B[0], B[2] - x, y - B[1], B[3] - y];
  let s = 0;
  for (let i = 1; i < 4; i++) if (d[i] < d[s]) s = i;
  return { s, d: d[s] };
};
// outward normal per side: 0 west, 1 east, 2 north (-y), 3 south (+y)
const NRM = [[-1, 0], [1, 0], [0, -1], [0, 1]];

function openLand(x, y) {
  return edgeDistance(x, y) > 4 && countryWeight(x, y) >= 0.92;
}

// distance from p to segment, and the segment parameter
function segDist(px, py, g) {
  const dx = g.bx - g.ax, dy = g.by - g.ay;
  const L2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - g.ax) * dx + (py - g.ay) * dy) / L2));
  return [Math.hypot(px - g.ax - dx * t, py - g.ay - dy * t), t];
}

// ------------------------------------------------------------------ build

export function initCountryEdge(map) {
  if (EDGE.ready) return;
  const t0 = performance.now();
  const B = map.meta.bounds;
  EDGE.bounds = B;
  buildMask(map, B);
  if (REAL.ready) {
    // the real Ommelanden replace the roads, canals and outskirts guessed
    // from the map edge
    buildReal();
    buildRails(map, B);
  } else {
    buildConnectors(map, B);
    buildCanals(map, B);
    buildRails(map, B);
    crossings();
    buildFringe(B);
  }
  bucket();
  uploadTexture();
  setEdgeQuery(surfaceQuery);
  EDGE.initMs = Math.round(performance.now() - t0);
  EDGE.ready = true;
}

// Where the real data actually is: roads, buildings and water rasterised
// on a 40 m grid, gaps closed and holes filled, turned into a signed
// distance field. The countryside starts where this says the data ends,
// so a non-rectangular data area works as well as the bounding box.
const MASK_CELL = 40, MASK_MARGIN = 520;
function buildMask(map, B) {
  const cell = MASK_CELL;
  const x0 = B[0] - MASK_MARGIN, y0 = B[1] - MASK_MARGIN;
  const w = Math.ceil((B[2] - B[0] + MASK_MARGIN * 2) / cell), h = Math.ceil((B[3] - B[1] + MASK_MARGIN * 2) / cell);
  let occ = new Uint8Array(w * h);
  const mark = (x, y) => {
    const i = Math.floor((x - x0) / cell), j = Math.floor((y - y0) / cell);
    if (i >= 0 && j >= 0 && i < w && j < h) occ[j * w + i] = 1;
  };
  const line = (P) => {
    for (let k = 1; k < P.length; k++) {
      const a = P[k - 1], b = P[k];
      const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 25));
      for (let t = 0; t <= n; t++) mark(a[0] + ((b[0] - a[0]) * t) / n, a[1] + ((b[1] - a[1]) * t) / n);
    }
  };
  for (const r of map.roads) line(r.pts);
  for (const b of map.buildings || []) {
    const q = b.bounds;
    if (!q) continue;
    mark(q[0], q[1]); mark(q[2], q[3]); mark(q[0], q[3]); mark(q[2], q[1]); mark((q[0] + q[2]) / 2, (q[1] + q[3]) / 2);
  }
  for (const q of map.water || []) if (q.pts) line(q.pts);
  for (const t of map.trees || []) { const p = t.pts ? t.pts[0] : t; if (p && p.length >= 2) mark(p[0], p[1]); else if (t.x !== undefined) mark(t.x, t.y); }
  // close gaps (parks, fields inside town) and fill enclosed holes
  const R = 3;
  const morph = (src, keep) => {
    const out = new Uint8Array(w * h);
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        let v = keep ? 1 : 0;
        for (let dj = -R; dj <= R && v === (keep ? 1 : 0); dj++) {
          for (let di = -R; di <= R; di++) {
            if (di * di + dj * dj > R * R) continue;
            const ii = i + di, jj = j + dj;
            const s2 = ii < 0 || jj < 0 || ii >= w || jj >= h ? 0 : src[jj * w + ii];
            if (keep ? !s2 : s2) { v = keep ? 0 : 1; break; }
          }
        }
        out[j * w + i] = v;
      }
    }
    return out;
  };
  occ = morph(morph(occ, false), true);
  const seen = new Uint8Array(w * h), stack = [];
  for (let i = 0; i < w; i++) { stack.push(i, (h - 1) * w + i); }
  for (let j = 0; j < h; j++) { stack.push(j * w, j * w + w - 1); }
  while (stack.length) {
    const k = stack.pop();
    if (seen[k] || occ[k]) continue;
    seen[k] = 1;
    const i = k % w, j = (k - i) / w;
    if (i > 0) stack.push(k - 1);
    if (i < w - 1) stack.push(k + 1);
    if (j > 0) stack.push(k - w);
    if (j < h - 1) stack.push(k + w);
  }
  for (let k = 0; k < w * h; k++) if (!seen[k]) occ[k] = 1;
  // signed distance (8SSEDT) from each cell to the nearest cell of the
  // other class, in metres between cell centres
  const edt = (inside) => {
    const INF = 1e6;
    const vx = new Float32Array(w * h), vy = new Float32Array(w * h);
    for (let k = 0; k < w * h; k++) { const f = (occ[k] === 1) !== inside; vx[k] = f ? 0 : INF; vy[k] = f ? 0 : INF; }
    const d2 = (k) => vx[k] * vx[k] + vy[k] * vy[k];
    const cmp = (k, i, j, ox, oy) => {
      const ii = i + ox, jj = j + oy;
      if (ii < 0 || jj < 0 || ii >= w || jj >= h) return;
      const q = jj * w + ii;
      const nx2 = vx[q] + Math.abs(ox), ny2 = vy[q] + Math.abs(oy);
      if (nx2 * nx2 + ny2 * ny2 < d2(k)) { vx[k] = nx2; vy[k] = ny2; }
    };
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) { const k = j * w + i; cmp(k, i, j, -1, 0); cmp(k, i, j, 0, -1); cmp(k, i, j, -1, -1); cmp(k, i, j, 1, -1); }
      for (let i = w - 1; i >= 0; i--) cmp(j * w + i, i, j, 1, 0);
    }
    for (let j = h - 1; j >= 0; j--) {
      for (let i = w - 1; i >= 0; i--) { const k = j * w + i; cmp(k, i, j, 1, 0); cmp(k, i, j, 0, 1); cmp(k, i, j, 1, 1); cmp(k, i, j, -1, 1); }
      for (let i = 0; i < w; i++) cmp(j * w + i, i, j, -1, 0);
    }
    const out = new Float32Array(w * h);
    for (let k = 0; k < w * h; k++) out[k] = Math.sqrt(d2(k));
    return out;
  };
  const dOut = edt(false), dIn = edt(true);
  const data = new Float32Array(w * h);
  for (let k = 0; k < w * h; k++) data[k] = occ[k] ? -(dIn[k] - 0.5) * cell : (dOut[k] - 0.5) * cell;
  const tex = new THREE.DataTexture(data, w, h, THREE.RedFormat, THREE.FloatType);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  COUNTRY_UNIFORMS.uMaskTex.value = tex;
  setCountryMask({ x0, y0, cell, w, h, data });
}

// Outward direction of the data frontier at (x, y) and its map side.
function frontier(x, y) {
  const gx = edgeDistance(x + 6, y) - edgeDistance(x - 6, y), gy = edgeDistance(x, y + 6) - edgeDistance(x, y - 6);
  const l = Math.hypot(gx, gy) || 1;
  const s = Math.abs(gx) > Math.abs(gy) ? (gx < 0 ? 0 : 1) : (gy < 0 ? 2 : 3);
  return { gx: gx / l, gy: gy / l, s };
}

function buildConnectors(map, B) {
  const ends = [[], [], [], []];
  for (const r of map.roads) {
    if (!CAR[r.cat] || r.pts.length < 2) continue;
    for (const [i, j] of [[0, 1], [r.pts.length - 1, r.pts.length - 2]]) {
      const e = r.pts[i], q = r.pts[j];
      if (edgeDistance(e[0], e[1]) < -45) continue;
      if (!deadEnd(map, r, e)) continue;
      const { gx, gy, s } = frontier(e[0], e[1]);
      let dx = e[0] - q[0], dy = e[1] - q[1];
      const l = Math.hypot(dx, dy) || 1;
      dx /= l; dy /= l;
      if (dx * gx + dy * gy < 0.35 || dx * NRM[s][0] + dy * NRM[s][1] < 0.2) continue;
      // only where open country lies straight ahead (not a cul-de-sac)
      if (edgeDistance(e[0] + dx * 60, e[1] + dy * 60) < 25) continue;
      ends[s].push({ x: e[0], y: e[1], dx, dy, w: r.width || 6, cat: r.cat, name: r.name || '' });
    }
  }
  for (let s = 0; s < 4; s++) {
    const along = s < 2 ? (e) => e.y : (e) => e.x;
    const list = ends[s].sort((a, b) => along(a) - along(b));
    const groups = [];
    for (const e of list) {
      const g = groups[groups.length - 1];
      if (g && along(e) - along(g[g.length - 1]) < 28) g.push(e);
      else groups.push([e]);
    }
    const merged = [];
    for (const g of groups) {
      const n = g.length;
      const e = { x: 0, y: 0, dx: 0, dy: 0, w: 0, cat: 'minor', name: '' };
      for (const q of g) {
        e.x += q.x / n; e.y += q.y / n; e.dx += q.dx; e.dy += q.dy;
        e.w = Math.max(e.w, q.w);
        if (CAR[q.cat] > CAR[e.cat]) e.cat = q.cat;
        if (!e.name) e.name = q.name;
      }
      if (n > 1 && e.cat === 'major') e.w = Math.min(14, e.w + 3);
      const l = Math.hypot(e.dx, e.dy) || 1;
      e.dx /= l; e.dy /= l;
      e.along = along(e);
      e.score = (e.cat === 'major' ? 4 : 0) + (e.w >= 8 ? 2 : 0) + (/weg$/i.test(e.name) ? 1.5 : 0) + chash(Math.round(e.x), Math.round(e.y)) * 0.5;
      merged.push(e);
    }
    // the bigger roads carry on into the polder; the side streets between
    // them run out a little way to a lane along the edge of town
    const trunks = [];
    for (const e of merged.slice().sort((u, v) => v.score - u.score)) {
      if (trunks.every((t) => Math.abs(t.along - e.along) > 380)) { e.trunk = true; trunks.push(e); }
    }
    const stubs = merged.filter((e) => !e.trunk);
    for (const e of trunks) makeConnector(e, s, B, 0);
    let cluster = [];
    const flush = () => {
      if (cluster.length) makeLane(cluster, trunks, s, B);
      cluster = [];
    };
    for (const e of stubs) {
      if (cluster.length && e.along - cluster[cluster.length - 1].along > 420) flush();
      cluster.push(e);
    }
    flush();
  }
}

const LANE_OUT = 120;

// Side streets that run off the map: a short stub each, joined by a lane
// parallel to the map edge that links up with the nearest trunk roads.
function makeLane(cluster, trunks, s, B) {
  const [nx, ny] = NRM[s];
  const vert = s >= 2;
  const dir = vert ? ny : nx;
  // outwardness of the furthest stub end, plus a stretch of road
  let o = -1e9;
  for (const e of cluster) o = Math.max(o, e.x * nx + e.y * ny);
  let laneC = dir * (o + LANE_OUT);
  const rel = ((laneC % BLOCK) + BLOCK) % BLOCK;
  if (rel < C + 10 || rel > BLOCK - 8) laneC += dir * 25;
  let lo = cluster[0].along, hi = cluster[cluster.length - 1].along;
  for (const t of trunks) {
    if (t.along < lo && lo - t.along < 460) lo = t.along;
    if (t.along > hi && t.along - hi < 460) hi = t.along;
  }
  for (const e of cluster) makeConnector(e, s, B, laneC);
  if (hi - lo < 20) return;
  const w = 5.5;
  const a = vert ? [lo, laneC] : [laneC, lo], b = vert ? [hi, laneC] : [laneC, hi];
  for (let t = 0; t <= 1; t += 0.05) {
    const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
    if (edgeDistance(x, y) < 8) return;
  }
  const con = {
    s, vert: !vert, c: laneC, out: lo, dir: 1, runLen: hi - lo, major: false, cat: 'minor', name: '', w0: w, wEnd: w, taper: 0, lane: true,
    pts: [a, b], ws: [w, w], halfAt: () => w / 2,
  };
  EDGE.connectors.push(con);
  addSeg(a, b, w / 2, w / 2, 0, s, con);
}

// A road end nobody else continues from (the data was cut off there).
function deadEnd(map, r, e) {
  const near = map.roadsNear ? map.roadsNear(e[0], e[1], 4) : [];
  for (const o of near) {
    if (o === r) continue;
    for (const p of o.pts) if (Math.abs(p[0] - e[0]) < 1.5 && Math.abs(p[1] - e[1]) < 1.5) return false;
  }
  return true;
}

function makeConnector(e, s, B, laneAbs = null) {
  const [nx, ny] = NRM[s];
  const vert = s >= 2; // the run heads north/south along x = const
  const major = e.cat === 'major';
  const w0 = Math.max(4.5, e.w), wEnd = major ? 7.5 : 5;
  const E0 = [e.x - nx * 14, e.y - ny * 14];
  let P1 = [e.x + e.dx * 35, e.y + e.dy * 35];
  let c = vert ? P1[0] : P1[1];
  // snap onto a polder-road line when one runs close by
  const line = Math.round((c - C) / BLOCK) * BLOCK + C;
  if (Math.abs(line - c) < 24) c = line;
  // ...or keep clear of the main ditch right beside such a line
  else {
    const edgeLine = Math.round(c / BLOCK) * BLOCK;
    if (Math.abs(edgeLine - c) < 12) c = edgeLine + (c < edgeLine ? -12 : 12);
  }
  P1 = vert ? [c, P1[1]] : [P1[0], c];
  const out = vert ? P1[1] : P1[0], dir = vert ? ny : nx;
  // run outward to the first cross polder road (or, for a side street, to
  // the lane along the edge of town)
  let endC = laneAbs !== null ? laneAbs : out + dir * 1500;
  const k0 = Math.floor(out / BLOCK);
  for (let k = 0; k < 5 && laneAbs === null; k++) {
    const j = k0 + dir * k;
    const lc = j * BLOCK + C;
    if ((lc - out) * dir < 70) continue;
    const blk = Math.floor(c / BLOCK);
    if (vert ? edgeRoad(blk, j, 1) : edgeRoad(j, blk, 0)) { endC = lc; break; }
  }
  const P = (t) => (vert ? [c, out + dir * t] : [out + dir * t, c]);
  let runLen = Math.abs(endC - out);
  // never run back into the real data (a concave data edge)
  for (let t = 40; t < runLen; t += 20) {
    const [qx, qy] = P(t);
    if (edgeDistance(qx, qy) < -5) { runLen = t - 30; break; }
  }
  if (runLen < 20) return;
  const taper = Math.min(runLen, major ? 520 : 300);
  const T = P(taper), End = P(runLen);
  const con = {
    s, vert, c, out, dir, runLen, major, cat: e.cat, name: e.name, w0, wEnd, taper,
    pts: [E0, [e.x, e.y], P1, T, End], ws: [w0, w0, w0, wEnd, wEnd],
  };
  con.halfAt = (t) => (t <= 0 ? w0 : t >= taper ? wEnd : w0 + (wEnd - w0) * smooth01(t / taper)) / 2;
  EDGE.connectors.push(con);
  for (let i = 0; i < con.pts.length - 1; i++) {
    const a = con.pts[i], b = con.pts[i + 1];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.5) continue;
    addSeg(a, b, con.ws[i] / 2, con.ws[i + 1] / 2, 0, s, con);
  }
  // bridges where the road crosses a maar
  for (let j = Math.floor(Math.min(out, endC) / BLOCK) + 1; j * BLOCK < Math.max(out, endC); j++) {
    if (vert ? maarY(j) : maarX(j)) EDGE.bridges.push({ x: vert ? c : j * BLOCK, y: vert ? j * BLOCK : c, along: vert ? Math.PI / 2 : 0, span: 11, w: w0 });
  }
}

const smooth01 = (t) => t * t * (3 - 2 * t);

function addSeg(a, b, ha, hb, kind, side, owner) {
  if (EDGE.segs.length >= (owner && owner.real ? 65000 : MAX_SEGS)) return;
  const g = { ax: a[0], ay: a[1], bx: b[0], by: b[1], ha, hb, kind, side, owner };
  const m = Math.max(ha, hb) + 2;
  g.box = [Math.min(a[0], b[0]) - m, Math.min(a[1], b[1]) - m, Math.max(a[0], b[0]) + m, Math.max(a[1], b[1]) + m];
  EDGE.segs.push(g);
}

function buildCanals(map, B) {
  for (const w of map.water) {
    const P = w.pts;
    if (!P || P.length < 3) continue;
    // outline vertices on the data frontier, grouped by map side
    const bySide = [[], [], [], []];
    for (const p of P) {
      if (edgeDistance(p[0], p[1]) < -8) continue;
      bySide[frontier(p[0], p[1]).s].push(p);
    }
    for (let s = 0; s < 4; s++) {
      const F = bySide[s];
      if (F.length < 2) continue;
      const v = F.map((p) => (s < 2 ? p[1] : p[0]));
      const lo = Math.min(...v), hi = Math.max(...v), wd = hi - lo;
      if (wd < 6) continue;
      const mid = (lo + hi) / 2;
      const [nx, ny] = NRM[s];
      let o = -1e9;
      for (const p of F) o = Math.max(o, p[0] * nx + p[1] * ny);
      const e = s < 2 ? [o * nx, mid] : [mid, o * ny];
      // only water that actually heads off the map carries on: the main
      // axis of the outline near the edge must point outwards
      const dirOut = headsOut(P, e, nx, ny, wd);
      if (!dirOut) continue;
      const pond = wd > 95;
      const len = pond ? Math.min(60, wd * 0.4) : 4200;
      const hw = pond ? Math.min(48, wd / 2) : Math.min(32, wd / 2);
      const a = [e[0] - nx * 6, e[1] - ny * 6];
      // follow the canal's own heading a little way, then run straight out
      const bend = pond ? 0 : Math.abs(dirOut[0] * nx + dirOut[1] * ny) > 0.97 ? 0 : 140;
      const m = [e[0] + dirOut[0] * bend, e[1] + dirOut[1] * bend];
      const b = [m[0] + nx * len, m[1] + ny * len];
      const canal = { s, a, m, b, hw, pond, name: w.name || '' };
      EDGE.canals.push(canal);
      if (bend) addSeg(a, m, hw, hw, 1, s, canal);
      addSeg(bend ? m : a, b, hw, hw, 1, s, canal);
      if (pond) continue;
      // road crossings over the canal: polder roads running across it
      const vert = s >= 2;
      const o0 = vert ? m[1] : m[0], dir = vert ? ny : nx, cc = vert ? m[0] : m[1];
      for (let k = 0; k < 6; k++) {
        const i = Math.floor(o0 / BLOCK) + dir * k;
        const lc = i * BLOCK + C;
        if ((lc - o0) * dir < 20 || (lc - o0) * dir > len) continue;
        const blk = Math.floor(cc / BLOCK);
        const has = vert ? edgeRoad(blk, i, 1) : edgeRoad(i, blk, 0);
        if (has) EDGE.bridges.push({ x: vert ? cc : lc, y: vert ? lc : cc, along: vert ? 0 : Math.PI / 2, span: hw * 2 + 6, w: 6 });
      }
    }
  }
}

// Main direction of the outline near the edge, oriented outwards, or null
// when the water does not head off the map (a canal along the edge).
function headsOut(P, e, nx, ny, wd) {
  const R = Math.max(90, wd * 1.8);
  let n = 0, mx = 0, my = 0;
  const near = [];
  for (const p of P) if (Math.hypot(p[0] - e[0], p[1] - e[1]) < R) { near.push(p); mx += p[0]; my += p[1]; n++; }
  if (n < 3) return null;
  mx /= n; my /= n;
  let xx = 0, yy = 0, xy = 0;
  for (const p of near) { const dx = p[0] - mx, dy = p[1] - my; xx += dx * dx; yy += dy * dy; xy += dx * dy; }
  const ang = 0.5 * Math.atan2(2 * xy, xx - yy);
  let ax = Math.cos(ang), ay = Math.sin(ang);
  if (ax * nx + ay * ny < 0) { ax = -ax; ay = -ay; }
  const root = Math.sqrt(((xx - yy) / 2) ** 2 + xy * xy);
  const l1 = (xx + yy) / 2 + root, l2 = (xx + yy) / 2 - root;
  if (l1 < l2 * 2.2) return wd > 30 ? [nx, ny] : null;
  return ax * nx + ay * ny > 0.35 ? [ax, ay] : null;
}

// Bridges where a road from the city crosses a canal from the city.
function crossings() {
  for (const r of EDGE.segs) {
    if (r.kind) continue;
    for (const c of EDGE.segs) {
      if (!c.kind || c.owner.pond) continue;
      const d1x = r.bx - r.ax, d1y = r.by - r.ay, d2x = c.bx - c.ax, d2y = c.by - c.ay;
      const den = d1x * d2y - d1y * d2x;
      if (Math.abs(den) < 1e-6) continue;
      const t = ((c.ax - r.ax) * d2y - (c.ay - r.ay) * d2x) / den, u = ((c.ax - r.ax) * d1y - (c.ay - r.ay) * d1x) / den;
      if (t < 0 || t > 1 || u < 0 || u > 1) continue;
      EDGE.bridges.push({ x: r.ax + d1x * t, y: r.ay + d1y * t, along: Math.atan2(d1y, d1x), span: c.ha * 2 + 6, w: (r.ha + r.hb) });
    }
  }
}

// Real roads and narrow waterways as ground-shader segments, from just
// inside the city data outwards (the city draws its own part).
function buildReal() {
  const keep = (a, b) => edgeDistance(a[0], a[1]) > -40 || edgeDistance(b[0], b[1]) > -40;
  for (const r of REAL.roads) {
    const own = { real: true, road: r };
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], b = r.pts[i + 1];
      if (keep(a, b)) addSeg(a, b, r.w / 2, r.w / 2, 0, -1, own);
    }
  }
  for (const w of REAL.waterways) {
    const own = { real: true, canal: w };
    for (let i = 0; i < w.pts.length - 1; i++) {
      const a = w.pts[i], b = w.pts[i + 1];
      if (keep(a, b)) addSeg(a, b, w.hw, w.hw, 1, -1, own);
    }
  }
  EDGE.signs.push(...buildRealSigns(edgeDistance));
}

function buildRails(map, B) {
  const routes = (map.railRoutes || []).map((r) => r.pts).concat(map.countryRails || []);
  const seen = new Set();
  for (const P of routes) {
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i];
      if (edgeDistance(b[0], b[1]) < -20 && edgeDistance(a[0], a[1]) < -20) continue;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.max(1, Math.ceil(len / 6));
      for (let k = 0; k <= n; k++) {
        const x = a[0] + ((b[0] - a[0]) * k) / n, y = a[1] + ((b[1] - a[1]) * k) / n;
        for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) EDGE.railCells.add(cellKey(Math.floor(x / 8) + ox, Math.floor(y / 8) + oy));
      }
      const key = Math.round(a[0]) + ',' + Math.round(a[1]);
      if (seen.has(key)) continue;
      seen.add(key);
      EDGE.rails.push([a, b]);
    }
  }
}
const cellKey = (i, j) => i * 1000003 + j;

export function nearRail(x, y) {
  return EDGE.railCells.has(cellKey(Math.floor(x / 8), Math.floor(y / 8)));
}

// ------------------------------------------------------------------ queries

// Connector road / canal under (x, y): { kind: 'road' | 'canal', d, hw }.
const _hit = { kind: null, d: 0, hw: 0, seg: null };
const JS_GRID = 48;
const segGrid = new Map();
const NO_SEGS = [];
function segsNear(x, y, margin) {
  if (margin > JS_GRID / 2) return EDGE.segs;
  const k = Math.floor(x / JS_GRID) * 100003 + Math.floor(y / JS_GRID);
  return segGrid.get(k) || NO_SEGS;
}
export function edgeAt(x, y, margin = 0) {
  _hit.kind = null;
  let bestRoad = null;
  for (const g of segsNear(x, y, margin)) {
    const b = g.box;
    if (x < b[0] - margin || x > b[2] + margin || y < b[1] - margin || y > b[3] + margin) continue;
    const [d, t] = segDist(x, y, g);
    const hw = g.ha + (g.hb - g.ha) * t;
    if (d > hw + margin) continue;
    if (g.kind === 0) { bestRoad = g; _hit.d = d; _hit.hw = hw; break; }
    if (!_hit.kind) { _hit.kind = 'canal'; _hit.d = d; _hit.hw = hw; _hit.seg = g; }
  }
  if (bestRoad) { _hit.kind = 'road'; _hit.seg = bestRoad; }
  return _hit.kind ? _hit : null;
}

function surfaceQuery(x, y) {
  if (!EDGE.segs.length && !REAL.ready) return null;
  const h = edgeAt(x, y);
  if (h && h.kind === 'road') return 'weg';
  if (REAL.ready && realWater(x, y) > 0.8) return 'sloot';
  if (!h) return null;
  return h.hw - h.d > 0.8 ? 'sloot' : 'gras';
}

// Kept clear of props, farms and turbines: connector roads (with verge),
// canals, rail corridors, fringe features and ribbon houses.
export function edgeBlocked(x, y, margin = 3) {
  if (!EDGE.ready) return false;
  if (edgeDistance(x, y) > 5000) return false;
  if (edgeAt(x, y, margin)) return true;
  if (nearRail(x, y)) return true;
  if (realBlocked(x, y, margin)) return true;
  const list = EDGE.byBlock.get(bkey(Math.floor(x / BLOCK), Math.floor(y / BLOCK)));
  if (list) for (const b of list) if (x > b[0] - margin && x < b[2] + margin && y > b[1] - margin && y < b[3] + margin) return true;
  return false;
}

// Rectangles (world AABBs) the block's farms must avoid.
export function edgeBlockBoxes(bx, by) {
  return EDGE.byBlock.get(bkey(bx, by)) || [];
}

// Axis-aligned connector runs crossing block (bx, by): farm frontage.
export function connectorRuns(bx, by) {
  const X = bx * BLOCK, Y = by * BLOCK, out = [];
  for (const k of EDGE.connectors) {
    const a = k.out, b = k.out + k.dir * k.runLen;
    const lo = Math.min(a, b), hi = Math.max(a, b);
    const [c0, c1, o0, o1] = k.vert ? [X, X + BLOCK, Y, Y + BLOCK] : [Y, Y + BLOCK, X, X + BLOCK];
    if (k.c < c0 || k.c >= c1 || hi < o0 || lo > o1) continue;
    out.push(k);
  }
  return out;
}

const bkey = (bx, by) => bx * 100003 + by;
const tkey = (tx, ty) => tx * 100003 + ty;

// Keeps obj out of the fringe's buildings, ribbon houses and barriers.
export function pushOutOfEdge(obj, radius) {
  if (!EDGE.ready || edgeDistance(obj.x, obj.y) > FRINGE + 200) return false;
  const tx = Math.floor(obj.x / 160), ty = Math.floor(obj.y / 160);
  let hit = false;
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      const e = EDGE.byTile.get(tkey(tx + ox, ty + oy));
      if (!e) continue;
      for (const f of e.features) for (const b of f.boxes) if (pushBox(obj, b, radius)) hit = true;
      for (const h of e.houses) if (pushCircle(obj, h.x, h.y, 5.2, radius)) hit = true;
      for (const b of e.barriers) {
        const v = Math.abs(Math.sin(b.rot)) > 0.5, hl = b.len / 2;
        if (pushBox(obj, v ? [b.x - 0.25, b.y - hl, b.x + 0.25, b.y + hl] : [b.x - hl, b.y - 0.25, b.x + hl, b.y + 0.25], radius)) hit = true;
      }
    }
  }
  return hit;
}

function pushBox(obj, b, radius) {
  const x0 = b[0] - radius, x1 = b[2] + radius, y0 = b[1] - radius, y1 = b[3] + radius;
  if (obj.x <= x0 || obj.x >= x1 || obj.y <= y0 || obj.y >= y1) return false;
  const opts = [[obj.x - x0, x0, obj.y], [x1 - obj.x, x1, obj.y], [obj.y - y0, obj.x, y0], [y1 - obj.y, obj.x, y1]];
  opts.sort((u, v) => u[0] - v[0]);
  obj.x = opts[0][1]; obj.y = opts[0][2];
  return true;
}
function pushCircle(obj, cx, cy, r, radius) {
  const dx = obj.x - cx, dy = obj.y - cy, d = Math.hypot(dx, dy), R = r + radius;
  if (d >= R) return false;
  const k = d > 1e-4 ? R / d : 0;
  obj.x = cx + (k ? dx * k : R);
  obj.y = cy + (k ? dy * k : 0);
  return true;
}

export function edgeTileItems(tx, ty) {
  return EDGE.byTile.get(tkey(tx, ty)) || null;
}

// ------------------------------------------------------------------ fringe

function rectClear(r, m = 4) {
  const [x0, y0, x1, y1] = r;
  for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1], [(x0 + x1) / 2, (y0 + y1) / 2]]) if (!openLand(x, y)) return false;
  for (const g of EDGE.segs) {
    const b = g.box;
    if (b[0] > x1 + m || b[2] < x0 - m || b[1] > y1 + m || b[3] < y0 - m) continue;
    const n = 12;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const px = g.ax + (g.bx - g.ax) * t, py = g.ay + (g.by - g.ay) * t;
      const hw = g.ha + (g.hb - g.ha) * t + m;
      if (px > x0 - hw && px < x1 + hw && py > y0 - hw && py < y1 + hw) return false;
    }
  }
  for (let x = x0; x <= x1; x += 6) for (let y = y0; y <= y1; y += 6) if (nearRail(x, y)) return false;
  // polder roads and maaren crossing the rectangle
  for (let bx = Math.floor(x0 / BLOCK); bx <= Math.floor(x1 / BLOCK); bx++) {
    for (let by = Math.floor(y0 / BLOCK); by <= Math.floor(y1 / BLOCK); by++) {
      const rx = bx * BLOCK + C, ry = by * BLOCK + C;
      if (edgeRoad(bx, by, 0) && rx > x0 - 6 && rx < x1 + 6 && by * BLOCK < y1 && (by + 1) * BLOCK > y0) return false;
      if (edgeRoad(bx, by, 1) && ry > y0 - 6 && ry < y1 + 6 && bx * BLOCK < x1 && (bx + 1) * BLOCK > x0) return false;
      if (maarX(bx) && bx * BLOCK > x0 - MAAR_HW - 3 && bx * BLOCK < x1 + MAAR_HW + 3) return false;
      if (maarY(by) && by * BLOCK > y0 - MAAR_HW - 3 && by * BLOCK < y1 + MAAR_HW + 3) return false;
    }
  }
  for (const f of EDGE.features) {
    const q = f.rect;
    if (q[0] < x1 + 10 && q[2] > x0 - 10 && q[1] < y1 + 10 && q[3] > y0 - 10) return false;
  }
  return true;
}

function nearestMajor(x, y) {
  let best = 1e9;
  for (const k of EDGE.connectors) if (k.major) best = Math.min(best, Math.hypot(k.pts[1][0] - x, k.pts[1][1] - y));
  return best;
}

function buildFringe(B) {
  // outskirts parks, one slot every ~190 m round the whole perimeter
  for (let s = 0; s < 4; s++) {
    const [nx, ny] = NRM[s];
    const lo = s < 2 ? B[1] - 300 : B[0] - 300, hi = s < 2 ? B[3] + 300 : B[2] + 300;
    let slot = 0;
    for (let a = lo; a < hi; a += 190, slot++) {
      const h = chash(s * 977 + slot, 4242);
      const pick = chash(slot * 13 + s, 777);
      let kind = null, W = 0, D = 0;
      const nearM = nearestMajor(s < 2 ? (s ? B[2] : B[0]) : a, s < 2 ? a : (s === 2 ? B[1] : B[3]));
      if (nearM < 700 && pick < 0.35) { kind = 'business'; W = 130; D = 90; }
      else if (pick < 0.3) { kind = 'allot'; W = 60 + h * 30; D = 50 + h * 20; }
      else if (pick < 0.44) { kind = 'sports'; W = 150; D = 100; }
      if (!kind) continue;
      // the data frontier on this line: from the bounds edge inwards
      let fx = s === 0 ? B[0] : s === 1 ? B[2] : a, fy = s === 2 ? B[1] : s === 3 ? B[3] : a;
      for (let k = 0; k < 90 && edgeDistance(fx, fy) > 1; k++) { fx -= nx * 20; fy -= ny * 20; }
      for (const depth of [40, 110, 190]) {
        const dd = depth + D / 2 + h * 40;
        const ex = s < 2 ? fx + nx * dd : a + (h - 0.5) * 60;
        const ey = s < 2 ? a + (h - 0.5) * 60 : fy + ny * dd;
        const hwX = s < 2 ? D / 2 : W / 2, hwY = s < 2 ? W / 2 : D / 2;
        const rect = [ex - hwX, ey - hwY, ex + hwX, ey + hwY];
        if (!rectClear(rect, 6)) continue;
        const f = { kind, rect, s, seed: chash(Math.round(ex), Math.round(ey)), items: [], boxes: [] };
        fillFeature(f);
        EDGE.features.push(f);
        break;
      }
    }
  }
  // ribbon houses along the roads out, a lane of trees beyond them, and
  // noise barriers along the big roads
  for (const k of EDGE.connectors) {
    const along = (t) => (k.vert ? [k.c, k.out + k.dir * t] : [k.out + k.dir * t, k.c]);
    for (const side of [-1, 1]) {
      let houseEnd = 0;
      if (!k.major) {
        for (let t = 25; t < Math.min(k.runLen - 15, FRINGE); t += 19 + chash(Math.round(t), side + 5) * 8) {
          if (chash(Math.round(t * 3), k.s * 7 + side + Math.round(k.c)) > 0.62) continue;
          const hw = k.halfAt(t);
          const off = side * (hw + 10.5);
          const [px, py] = along(t);
          const x = k.vert ? px + off : px, y = k.vert ? py : py + off;
          if (!houseSpot(x, y)) continue;
          // the house's back points away from the road
          const angle = k.vert ? (side > 0 ? 0 : Math.PI) : (side > 0 ? Math.PI / 2 : -Math.PI / 2);
          const house = { x, y, angle, kind: Math.floor(chash(Math.round(x), Math.round(y)) * 4), look: chash(Math.round(y), Math.round(x)) < 0.5 ? 0 : 1 };
          EDGE.houses.push(house);
          const gk = Math.floor(x / 13) * 100003 + Math.floor(y / 13);
          if (!houseGrid.has(gk)) houseGrid.set(gk, []);
          houseGrid.get(gk).push(house);
          houseEnd = t;
        }
      } else {
        for (let t = 30; t < Math.min(k.runLen - 20, 400); t += 20) {
          const hw = k.halfAt(t);
          const [px, py] = along(t + 10);
          const off = side * (hw + 3.2);
          const x = k.vert ? px + off : px, y = k.vert ? py : py + off;
          if (!openLand(x, y) || crossesGrid(x, y, k)) continue;
          EDGE.barriers.push({ x, y, rot: k.vert ? Math.PI / 2 : 0, len: 20 });
        }
      }
      // tree lane
      for (let t = Math.max(houseEnd + 25, 60); t < k.runLen - 10; t += 9) {
        const [px, py] = along(t);
        const off = side * (k.halfAt(t) + (k.major ? 8 : 2.6));
        const x = k.vert ? px + off : px, y = k.vert ? py : py + off;
        if (!openLand(x, y) || crossesGrid(x, y, k) || nearRail(x, y)) continue;
        if (chash(Math.round(k.c), Math.floor(t / 180)) < 0.25) continue;
        EDGE.trees.push({ x, y, poplar: chash(Math.round(k.c) + side, 3) < 0.4, s: 0.85 + chash(Math.round(t), 9) * 0.3 });
      }
    }
    // the city limit, facing traffic heading into town, on its right
    const [nx, ny] = NRM[k.s];
    const hw = k.halfAt(20);
    const [sx, sy] = along(22);
    const x = sx + ny * (hw + 1.8), y = sy - nx * (hw + 1.8);
    if (edgeDistance(x, y) > 0) EDGE.signs.push({ kind: 'place', text: 'Groningen', x, y, rot: Math.atan2(nx, -ny) });
  }
}

// polder roads, main ditches and maaren crossing a connector at (x, y)
function crossesGrid(x, y, k) {
  const q = k.vert ? y : x;
  const rel = ((q % BLOCK) + BLOCK) % BLOCK;
  return rel < 12 || rel > BLOCK - 3;
}

const houseGrid = new Map();
function houseSpot(x, y) {
  if (!openLand(x, y) || nearRail(x, y)) return false;
  for (const g of EDGE.segs) {
    const b = g.box;
    if (x < b[0] - 9 || x > b[2] + 9 || y < b[1] - 9 || y > b[3] + 9) continue;
    const [d, t] = segDist(x, y, g);
    if (d < g.ha + (g.hb - g.ha) * t + 5.5) return false;
  }
  const rel = (v) => ((v % BLOCK) + BLOCK) % BLOCK;
  if (rel(x) < 17 || rel(y) < 17 || rel(x) > BLOCK - 7 || rel(y) > BLOCK - 7) return false;
  for (const f of EDGE.features) {
    const q = f.rect;
    if (x > q[0] - 8 && x < q[2] + 8 && y > q[1] - 8 && y < q[3] + 8) return false;
  }
  const hk = (i, j) => i * 100003 + j;
  const ci = Math.floor(x / 13), cj = Math.floor(y / 13);
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const h of houseGrid.get(hk(ci + a, cj + b)) || []) if (Math.abs(h.x - x) < 13 && Math.abs(h.y - y) < 13) return false;
  return true;
}

// Items in the feature's local rect (x across, y along), world-placed later.
function fillFeature(f) {
  const [x0, y0, x1, y1] = f.rect;
  const W = x1 - x0, H = y1 - y0;
  const R = mulberry(f.seed);
  const it = (kind, x, y, rot, sx, sy, sz, color = 0xffffff, h = 0) => f.items.push({ kind, x, y, rot, sx, sy, sz, color, h });
  const box = (a, b, c, d) => f.boxes.push([a, b, c, d]);
  if (f.kind === 'allot') {
    it('slab', (x0 + x1) / 2, (y0 + y1) / 2, 0, W, 1, H, 0x6f8a4a);
    const pw = 9, ph = 13;
    for (let x = x0 + 3; x + pw < x1 - 2; x += pw + 1.2) {
      for (let y = y0 + 3; y + ph < y1 - 2; y += ph + 2.2) {
        const cx = x + pw / 2, cy = y + ph / 2, r = R();
        it('slab', cx, cy, 0, pw, 1, ph, r < 0.45 ? 0x6a5236 : r < 0.75 ? 0x5c7a38 : 0x7a9a48, 0.03);
        if (R() < 0.7) {
          const shed = R() < 0.8;
          it(shed ? 'shed' : 'glass', cx + pw / 2 - 1.6, cy - ph / 2 + 1.6, 0, 2.2, shed ? 0.42 : 0.4, 2.2, shed ? [0x7a5a3a, 0x3f5a44, 0x8a2a24, 0x2f4a6a][Math.floor(R() * 4)] : 0xd8e8e0);
          box(cx + pw / 2 - 2.8, cy - ph / 2 + 0.4, cx + pw / 2 - 0.4, cy - ph / 2 + 2.8);
        }
        if (R() < 0.35) it('tree', cx - 2, cy + 3, R() * 6, 0.45, 0.45, 0.45);
      }
    }
    it('hedgeRow', x0, y0, 0, W, H, 0);
  } else if (f.kind === 'sports') {
    it('slab', (x0 + x1) / 2, (y0 + y1) / 2, 0, W, 1, H, 0x5f8a3e);
    const wide = W > H;
    for (let i = 0; i < 2; i++) {
      const cx = wide ? x0 + W * (i ? 0.72 : 0.28) : (x0 + x1) / 2 + 6;
      const cy = wide ? (y0 + y1) / 2 + 6 : y0 + H * (i ? 0.72 : 0.28);
      pitch(it, cx, cy, wide);
    }
    const hx = wide ? (x0 + x1) / 2 : x0 + 9, hy = wide ? y0 + 9 : (y0 + y1) / 2;
    it('clubhouse', hx, hy, wide ? 0 : Math.PI / 2, 1, 1, 1);
    // the clubhouse is 16.6 x 9.6 m plus its veranda, not an 18 m square
    if (wide) box(hx - 8.4, hy - 6.2, hx + 8.4, hy + 6.2); else box(hx - 6.2, hy - 8.4, hx + 6.2, hy + 8.4);
    for (const [mx, my] of [[x0 + 2, y0 + 2], [x1 - 2, y0 + 2], [x0 + 2, y1 - 2], [x1 - 2, y1 - 2], [(x0 + x1) / 2, y0 + 2], [(x0 + x1) / 2, y1 - 2]]) it('mast', mx, my, Math.atan2((y0 + y1) / 2 - my, (x0 + x1) / 2 - mx), 1, 1, 1);
    it('fenceRow', x0, y0, 0, W, H, 0);
  } else {
    it('slab', (x0 + x1) / 2, (y0 + y1) / 2, 0, W, 1, H, 0x6e6e6c);
    const n = 2 + Math.floor(R() * 2);
    const long = W > H;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const hx = long ? W / n - 14 : W - 34, hy = long ? H - 34 : H / n - 14;
      const cx = long ? x0 + W * t : (x0 + x1) / 2 + 6, cy = long ? (y0 + y1) / 2 + 6 : y0 + H * t;
      it('hall', cx, cy, 0, hx, 0.9 + R() * 0.6, hy, [0x8a9296, 0x5a6a78, 0xb8b6ae, 0x3f5a6a][Math.floor(R() * 4)]);
      box(cx - hx / 2, cy - hy / 2, cx + hx / 2, cy + hy / 2);
    }
    it('fenceRow', x0, y0, 0, W, H, 0);
    for (let i = 0; i < 8; i++) it('tree', x0 + 3 + (W - 6) * (i / 7), long ? y1 - 3 : y0 + 3 + (H - 6) * (i / 7), R() * 6, 0.8, 0.8, 0.8);
  }
}

// A football pitch with its long axis along world y (alongY) or x.
function pitch(it, cx, cy, alongY) {
  const hw = 30, hl = 45;
  const sx = alongY ? hw * 2 : hl * 2, sy = alongY ? hl * 2 : hw * 2;
  it('slab', cx, cy, 0, sx + 4, 1, sy + 4, 0x6fa446, 0.02);
  const L = 0xf2f2ea, t = 0.2;
  it('slab', cx, cy - sy / 2, 0, sx, 1, t, L, 0.04);
  it('slab', cx, cy + sy / 2, 0, sx, 1, t, L, 0.04);
  it('slab', cx - sx / 2, cy, 0, t, 1, sy, L, 0.04);
  it('slab', cx + sx / 2, cy, 0, t, 1, sy, L, 0.04);
  it('slab', cx, cy, 0, alongY ? sx : t, 1, alongY ? t : sy, L, 0.04);
  if (alongY) {
    it('goal', cx, cy - sy / 2, 0, 1, 1, 1);
    it('goal', cx, cy + sy / 2, Math.PI, 1, 1, 1);
  } else {
    it('goal', cx - sx / 2, cy, -Math.PI / 2, 1, 1, 1);
    it('goal', cx + sx / 2, cy, Math.PI / 2, 1, 1, 1);
  }
}

function mulberry(seed) {
  let s = (seed * 4294967296) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ------------------------------------------------------------------ buckets

function bucket() {
  const TILE = 160;
  const addT = (x, y, type, o) => {
    const k = tkey(Math.floor(x / TILE), Math.floor(y / TILE));
    let e = EDGE.byTile.get(k);
    if (!e) EDGE.byTile.set(k, (e = { features: [], houses: [], barriers: [], trees: [], signs: [], bridges: [] }));
    e[type].push(o);
  };
  const addB = (r) => {
    for (let bx = Math.floor(r[0] / BLOCK); bx <= Math.floor(r[2] / BLOCK); bx++) {
      for (let by = Math.floor(r[1] / BLOCK); by <= Math.floor(r[3] / BLOCK); by++) {
        const k = bkey(bx, by);
        if (!EDGE.byBlock.has(k)) EDGE.byBlock.set(k, []);
        EDGE.byBlock.get(k).push(r);
      }
    }
  };
  for (const f of EDGE.features) { addT((f.rect[0] + f.rect[2]) / 2, (f.rect[1] + f.rect[3]) / 2, 'features', f); addB(f.rect); }
  for (const h of EDGE.houses) { addT(h.x, h.y, 'houses', h); addB([h.x - 12, h.y - 12, h.x + 12, h.y + 12]); }
  for (const b of EDGE.barriers) addT(b.x, b.y, 'barriers', b);
  for (const t of EDGE.trees) addT(t.x, t.y, 'trees', t);
  for (const s of EDGE.signs) addT(s.x, s.y, 'signs', s);
  for (const b of EDGE.bridges) addT(b.x, b.y, 'bridges', b);
  // road corridors and canals as boxes for the farm planner
  for (const g of EDGE.segs) {
    // JS lookup grid for edgeAt
    const gm = Math.max(g.ha, g.hb) + JS_GRID / 2;
    for (let cx = Math.floor((Math.min(g.ax, g.bx) - gm) / JS_GRID); cx <= Math.floor((Math.max(g.ax, g.bx) + gm) / JS_GRID); cx++) {
      for (let cy = Math.floor((Math.min(g.ay, g.by) - gm) / JS_GRID); cy <= Math.floor((Math.max(g.ay, g.by) + gm) / JS_GRID); cy++) {
        if (segDist((cx + 0.5) * JS_GRID, (cy + 0.5) * JS_GRID, g)[0] > gm + JS_GRID * 0.71) continue;
        const k = cx * 100003 + cy;
        let L = segGrid.get(k);
        if (!L) segGrid.set(k, (L = []));
        L.push(g);
      }
    }
    if (g.owner && g.owner.real) continue;
    const m = g.kind ? 6 : 8;
    const n = Math.max(1, Math.ceil(Math.hypot(g.bx - g.ax, g.by - g.ay) / 60));
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      const ax = g.ax + (g.bx - g.ax) * t0, ay = g.ay + (g.by - g.ay) * t0, bx = g.ax + (g.bx - g.ax) * t1, by = g.ay + (g.by - g.ay) * t1;
      const hw = Math.max(g.ha, g.hb) + m;
      addB([Math.min(ax, bx) - hw, Math.min(ay, by) - hw, Math.max(ax, bx) + hw, Math.max(ay, by) + hw]);
    }
  }
  for (const [a, b] of REAL.ready ? [] : EDGE.rails) {
    const hw = 10;
    addB([Math.min(a[0], b[0]) - hw, Math.min(a[1], b[1]) - hw, Math.max(a[0], b[0]) + hw, Math.max(a[1], b[1]) + hw]);
  }
}

// Segments for the ground shader (per segment two texels in consecutive
// rows: ends, then half widths at both ends and the kind; EDGE_TEX_W wide)
// and a 48 m lookup grid naming the (at most EDGE_SLOTS) segments that can
// touch each cell, so a pixel tests only those. The grid covers the map
// bounds plus a margin, and the real Ommelanden when they are loaded.
const GRID = 48, GRID_PAD = 4600;
function uploadTexture() {
  const segs = EDGE.segs;
  const n = Math.max(1, segs.length);
  const rows = Math.ceil(n / EDGE_TEX_W) * 2;
  const data = new Float32Array(EDGE_TEX_W * rows * 4);
  segs.forEach((g, i) => {
    const o = ((Math.floor(i / EDGE_TEX_W) * 2) * EDGE_TEX_W + (i % EDGE_TEX_W)) * 4;
    data.set([g.ax, g.ay, g.bx, g.by], o);
    data.set([g.ha, g.hb, g.kind, 0], o + EDGE_TEX_W * 4);
  });
  const tex = new THREE.DataTexture(data, EDGE_TEX_W, rows, THREE.RGBAFormat, THREE.FloatType);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  const B = EDGE.bounds;
  let [gx0, gy0, gx1, gy1] = [B[0] - GRID_PAD, B[1] - GRID_PAD, B[2] + GRID_PAD, B[3] + GRID_PAD];
  if (REAL.ready) {
    const E = REAL.ext;
    gx0 = Math.min(gx0, E[0]); gy0 = Math.min(gy0, E[1]); gx1 = Math.max(gx1, E[2]); gy1 = Math.max(gy1, E[3]);
  }
  const w = Math.ceil((gx1 - gx0) / GRID), h = Math.ceil((gy1 - gy0) / GRID);
  const TX = EDGE_SLOTS / 4;
  const grid = new Uint16Array(w * TX * h * 4);
  const fill = new Uint8Array(w * h);
  // wide roads claim their slots first, so a crowded cell drops a lane
  const order = segs.map((g, i) => i).sort((a, b) => (segs[a].kind - segs[b].kind) || (segs[b].ha - segs[a].ha));
  let dropped = 0;
  for (const i of order) {
    const g = segs[i];
    const m = Math.max(g.ha, g.hb) + 3;
    const [x0, y0, x1, y1] = [Math.min(g.ax, g.bx) - m, Math.min(g.ay, g.by) - m, Math.max(g.ax, g.bx) + m, Math.max(g.ay, g.by) + m];
    for (let cy = Math.max(0, Math.floor((y0 - gy0) / GRID)); cy <= Math.min(h - 1, Math.floor((y1 - gy0) / GRID)); cy++) {
      for (let cx = Math.max(0, Math.floor((x0 - gx0) / GRID)); cx <= Math.min(w - 1, Math.floor((x1 - gx0) / GRID)); cx++) {
        // only cells the widened segment actually passes
        const mx = gx0 + (cx + 0.5) * GRID, my = gy0 + (cy + 0.5) * GRID;
        if (segDist(mx, my, g)[0] > m + GRID * 0.71) continue;
        const k = cy * w + cx;
        if (fill[k] >= EDGE_SLOTS) { dropped++; continue; }
        const slot = fill[k]++;
        grid[((cy * w * TX) + cx * TX + (slot >> 2)) * 4 + (slot & 3)] = i + 1;
      }
    }
  }
  EDGE.gridDropped = dropped;
  const gtex = new THREE.DataTexture(grid, w * TX, h, THREE.RGBAIntegerFormat, THREE.UnsignedShortType);
  gtex.internalFormat = 'RGBA16UI';
  gtex.minFilter = gtex.magFilter = THREE.NearestFilter;
  gtex.needsUpdate = true;
  COUNTRY_UNIFORMS.uEdgeTex.value = tex;
  COUNTRY_UNIFORMS.uEdgeGrid.value = gtex;
  COUNTRY_UNIFORMS.uEdgeGridRect.value = [gx0, gy0, GRID, 0];
  COUNTRY_UNIFORMS.uEdgeGridSize.value = [w, h, 0, 0];
}
