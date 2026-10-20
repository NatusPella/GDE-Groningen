// De eerste hoogtes voor de ringweg en zijn ongelijkvloerse kruisingen, uit de OSM-laagtags
// (layer, tunnel, viaduct, bridge): de plateaus en hellingen die de oplosser van profile.mjs als
// vertrekpunt krijgt. Dit is scripts/add_elevation.py in JS, zodat de stad uit de gedeelde
// OSM-tegelbouw komt (#90, STAD_LAAG=roads). Zie de kop van dat bestand voor het model:
//
//   1. Plateaus. Ringwegen (motorway/trunk/primary + links) met tunnel of een negatieve laag
//      liggen op SUNK onder straatniveau, viaducten op LIFT erboven. Bij elke kruising tussen
//      twee wegen (of weg en spoor) met verschillende lagen waar minstens een ringweg is, moet de
//      bovenste CLEAR boven de onderste: de getagde beweegt (brug stijgt, tunnel zakt), anders de
//      ringweg, tot alle kruisingen vrij zijn.
//   2. Hellingen. De grenzen zijn onder- en bovenwaarden; elk punt neemt de hoogte die het
//      dichtst bij straatniveau ligt bij MAX_GRADE over het wegennet.
//   3. Naast elkaar. Een afrit of de andere helft van een dubbele rijbaan houdt de hoogte van de
//      ander zolang hun wegdekken elkaar in plattegrond overlappen.
//
//   ringHeights({ roads, water }, rails)  zet road.z (en dichtere pts) op de ringwegen en wat ze kruist
import { CAR } from '../../game/js/roadprofile.js';

const RING_TYPES = new Set(['motorway', 'motorway_link', 'trunk', 'trunk_link', 'primary', 'primary_link']);
const LIFT = 6.0;       // viaductdek boven straatniveau (m)
const SUNK = -6.5;      // verdiepte ringweg onder straatniveau (m)
const CLEAR = 5.6;      // vrije hoogte tussen kruisende wegen (m)
const MAX_GRADE = 0.05;
const STEP = 8.0;       // wegen met helling op deze afstand van punten voorzien (m)
const SMOOTH_ITERS = 6;
const SMOOTH_GRADE = 0.058;
const UNDER_WATER = -8.2;  // een ringweg onder een kanaal (aquaduct) blijft onder de kanaalbodem
const RAIL_Z = 0.0;
const SHOULDER = 1.8;      // getekende berm naast het wegdek (elevation.js surfaceHalfWidth)
const COUPLE_TOL = 0.1;
const COUPLE_ANGLE = 35.0;
const COUPLE_OVERLAP = 0.5;
const COUPLE_ROUNDS = 3;
const KUIL_MAX = 4;     // een dal van hooguit zoveel punten (24 m) wordt opgevuld
const RANK = { motorway: 0, trunk: 1, primary: 2, motorway_link: 3, trunk_link: 4, primary_link: 5 };
const CAT_CAR = CAR;
const hyp = Math.hypot;

const key = (p) => `${Math.round(p[0] * 10)},${Math.round(p[1] * 10)}`;
const W = (r) => (r.width === undefined ? 6 : r.width);

function segIntersect(a, b, c, d) {
  const rx = b[0] - a[0], ry = b[1] - a[1], sx = d[0] - c[0], sy = d[1] - c[1];
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-9) return null;
  const qx = c[0] - a[0], qy = c[1] - a[1];
  const t = (qx * sy - qy * sx) / den, u = (qx * ry - qy * rx) / den;
  return t > 0 && t < 1 && u > 0 && u < 1 ? [t, u] : null;
}

const layerOf = (r) => parseInt(r.layer || 0, 10) || 0;
const isRing = (r) => RING_TYPES.has(r.type);
const isDown = (r) => !!r.tunnel || layerOf(r) < 0;
const isUp = (r) => !!r.bridge || layerOf(r) > 0;

// de spoorlijnen als kruisingsitems: layer uit de OSM-tag (een brug zonder laag is laag 1)
export function railItemsFrom(elements, project) {
  const out = [];
  for (const w of elements) {
    const t = w.tags || {};
    if (w.type !== 'way' || t.railway !== 'rail') continue;
    const g = w.g || (w.geometry || []).map((q) => [q.lat, q.lon]);
    if (g.length < 2) continue;
    let lay = parseInt(t.layer || '0', 10);
    if (!Number.isFinite(lay)) lay = 0;
    if ((t.bridge === 'yes' || t.bridge === 'viaduct') && lay === 0) lay = 1;
    out.push({ pts: g.map(([la, lo]) => project(la, lo)), layer: lay, rail: true, type: 'rail', cat: 'rail' });
  }
  return out;
}

function crossings(roads, rails) {
  const G = 60.0, grid = new Map();
  const items = roads.filter((r) => CAT_CAR.has(r.cat) || r.cat === 'cycle' || r.cat === 'foot').concat(rails);
  items.forEach((r, idx) => {
    const P = r.pts;
    for (let i = 0; i < P.length - 1; i++) {
      const x0 = Math.min(P[i][0], P[i + 1][0]), x1 = Math.max(P[i][0], P[i + 1][0]);
      const y0 = Math.min(P[i][1], P[i + 1][1]), y1 = Math.max(P[i][1], P[i + 1][1]);
      for (let gx = Math.floor(x0 / G); gx <= Math.floor(x1 / G); gx++) for (let gy = Math.floor(y0 / G); gy <= Math.floor(y1 / G); gy++) {
        const k = gx * 1e6 + gy;
        let c = grid.get(k);
        if (!c) grid.set(k, c = []);
        c.push([idx, i]);
      }
    }
  });
  const seen = new Set(), out = [];
  for (const cell of grid.values()) {
    for (let a = 0; a < cell.length; a++) {
      const [ia, sa] = cell[a];
      const ra = items[ia];
      for (let b = a + 1; b < cell.length; b++) {
        const [ib, sb] = cell[b];
        if (ia === ib) continue;
        const rb = items[ib];
        if (!(isRing(ra) || isRing(rb))) continue;
        if (ra.rail && rb.rail) continue;
        // voet- en fietspaden bepalen nooit hoogtes van de ringweg; alleen een pad op een brug (laag of brugtag) over een ringweg stijgt
        // mee (de ring ligt waar OSM hem legt, het pad moet er dan echt overheen: Beneluxweg bij de Kardingerweg, N46 bij de Hereweg)
        const path = (r) => r.cat === 'cycle' || r.cat === 'foot';
        if ((path(ra) || path(rb)) && !((path(ra) && isUp(ra) && !isUp(rb) && isRing(rb)) || (path(rb) && isUp(rb) && !isUp(ra) && isRing(ra)))) continue;
        const k = `${Math.min(ia, ib)}:${Math.max(ia, ib)}:${ia < ib ? sa : sb}:${ia < ib ? sb : sa}`;
        if (seen.has(k)) continue;
        seen.add(k);
        const A = ra.pts[sa], B = ra.pts[sa + 1], C = rb.pts[sb], D = rb.pts[sb + 1];
        const kA = key(A), kB = key(B), kC = key(C), kD = key(D);
        if (kA === kC || kA === kD || kB === kC || kB === kD) continue;
        const hit = segIntersect(A, B, C, D);
        if (!hit) continue;
        let la = layerOf(ra), lb = layerOf(rb);
        if (ra.rail) la = ra.layer;
        if (rb.rail) lb = rb.layer;
        if (la === lb) {
          // dezelfde laag maar geen gedeeld punt: vertrouw op de brug-/tunneltags
          const ua = (isUp(ra) ? 1 : 0) - (isDown(ra) ? 1 : 0), ub = (isUp(rb) ? 1 : 0) - (isDown(rb) ? 1 : 0);
          if (ua === ub) continue;
          la = ua; lb = ub;
        }
        const x = A[0] + (B[0] - A[0]) * hit[0], y = A[1] + (B[1] - A[1]) * hit[0];
        const [up, lo] = la > lb ? [ra, rb] : [rb, ra];
        out.push([up, lo, x, y]);
      }
    }
  }
  return out;
}

function pointInPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function basePlateaus(roads, water) {
  const lo = new Map(), hi = new Map();
  const wb = water.map((w) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of w.pts) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    return [x0 - 6, y0 - 6, x1 + 6, y1 + 6, w.pts];
  });
  const wet = (x, y) => {
    for (const [x0, y0, x1, y1, pts] of wb) {
      if (x >= x0 && x <= x1 && y >= y0 && y <= y1) for (const [dx, dy] of [[0, 0], [6, 0], [-6, 0], [0, 6], [0, -6]]) if (pointInPoly(x + dx, y + dy, pts)) return true;
    }
    return false;
  };
  for (const r of roads) {
    if (!isRing(r) || !CAT_CAR.has(r.cat)) continue;
    if (isDown(r) && !r.bridge) {
      for (const p of r.pts) { const k = key(p), v = wet(p[0], p[1]) ? UNDER_WATER : SUNK; hi.set(k, Math.min(hi.has(k) ? hi.get(k) : 1e9, v)); }
    } else if (r.viaduct) {
      for (const p of r.pts) { const k = key(p); lo.set(k, Math.max(lo.has(k) ? lo.get(k) : -1e9, LIFT)); }
    }
  }
  return { lo, hi };
}

function buildGraph(roads) {
  const adj = new Map();
  const add = (a, b, L) => { let l = adj.get(a); if (!l) adj.set(a, l = []); l.push([b, L]); };
  for (const r of roads) {
    const P = r.pts;
    for (let i = 0; i < P.length - 1; i++) {
      const a = key(P[i]), b = key(P[i + 1]), L = hyp(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]);
      add(a, b, L); add(b, a, L);
    }
  }
  return adj;
}

// een max-heap op [waarde, sleutel]
class MaxHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(v, k) {
    const a = this.a; a.push([v, k]);
    for (let i = a.length - 1; i > 0;) { const p = (i - 1) >> 1; if (a[p][0] >= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      for (let i = 0; ;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] > a[m][0]) m = l;
        if (r < a.length && a[r][0] > a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]]; i = m;
      }
    }
    return top;
  }
}

// sign=1: de laagste hoogte die de ondergrenzen overal toelaten (z >= b - g*d); sign=-1: de hoogste die de bovengrenzen toelaten
function propagate(adj, bound, sign, reach = 14.0) {
  const val = new Map();
  const heap = new MaxHeap();
  for (const [k, b] of bound) { val.set(k, b * sign); heap.push(b * sign, k); }
  while (heap.size) {
    const [v, u] = heap.pop();
    if (v < (val.has(u) ? val.get(u) : -1e9) - 1e-9) continue;
    for (const [w, L] of adj.get(u) || []) {
      const nw = v - MAX_GRADE * L;
      if (nw > -reach && nw > (val.has(w) ? val.get(w) : -1e9) + 1e-9) { val.set(w, nw); heap.push(nw, w); }
    }
  }
  const out = new Map();
  for (const [k, v] of val) out.set(k, v * sign);
  return out;
}

function densify(pts, step) {
  const out = [pts[0]];
  for (let q = 0; q < pts.length - 1; q++) {
    const a = pts[q], b = pts[q + 1];
    const L = hyp(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.ceil(L / step));
    // (de oorspronkelijke hoekpunten blijven zoals ze zijn: een knoop die twee wegen delen mag niet op 0,1 m uiteenvallen,
    // want profile.mjs zoekt knopen op de cm)
    for (let i = 1; i <= n; i++) out.push(i === n ? b : [Math.round((a[0] + (b[0] - a[0]) * i / n) * 10) / 10, Math.round((a[1] + (b[1] - a[1]) * i / n) * 10) / 10]);
  }
  const ded = [out[0]];
  for (const p of out.slice(1)) { const l = ded[ded.length - 1]; if (p[0] !== l[0] || p[1] !== l[1]) ded.push(p); }
  return ded;
}

function solveField(adj, loB, hiB) {
  const lo = propagate(adj, loB, 1), hi = propagate(adj, hiB, -1);
  const z = new Map();
  const ks = new Set([...lo.keys(), ...hi.keys()]);
  for (const k of ks) {
    const a = lo.has(k) ? lo.get(k) : -1e9, b = hi.has(k) ? hi.get(k) : 1e9;
    const v = a <= b ? Math.min(Math.max(0.0, a), b) : (a + b) / 2;
    if (Math.abs(v) > 1e-3) z.set(k, v);
  }
  return z;
}

function zOn(r, zmap, x, y) {
  if (r.rail) return RAIL_Z;
  const P = r.pts;
  let best = 1e18, bz = 0.0;
  for (let i = 0; i < P.length - 1; i++) {
    const [ax, ay] = P[i];
    const dx = P[i + 1][0] - ax, dy = P[i + 1][1] - ay;
    const L2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
    const d = (ax + dx * t - x) ** 2 + (ay + dy * t - y) ** 2;
    if (d < best) { best = d; bz = (zmap.get(key(P[i])) || 0) * (1 - t) + (zmap.get(key(P[i + 1])) || 0) * t; }
  }
  return bz;
}

const roadLen = (r) => { let s = 0; for (let i = 0; i < r.pts.length - 1; i++) s += hyp(r.pts[i + 1][0] - r.pts[i][0], r.pts[i + 1][1] - r.pts[i][1]); return s; };
const cmpOrder = (a, b) => (a[0] - b[0]) || (a[1] - b[1]);

// Ringwegen die naast elkaar lopen (een afrit die zijn rijbaan verlaat of oprijdt, de twee helften van een dubbele
// rijbaan) met overlappende wegdekken: de mindere weg (link < hoofdweg, dan de kortste) blijft binnen COUPLE_TOL van de ander
class Coupler {
  constructor(roads) {
    this.G = 40.0;
    this.roads = roads.filter((r) => isRing(r) && CAT_CAR.has(r.cat));
    this.order = new Map();
    for (const r of this.roads) this.order.set(r, [RANK[r.type] !== undefined ? RANK[r.type] : 9, -roadLen(r)]);
    this.grid = new Map();
    const G = this.G;
    for (const r of this.roads) {
      const P = r.pts, hs = W(r) / 2 + SHOULDER;
      for (let i = 0; i < P.length - 1; i++) {
        const x0 = Math.min(P[i][0], P[i + 1][0]), x1 = Math.max(P[i][0], P[i + 1][0]);
        const y0 = Math.min(P[i][1], P[i + 1][1]), y1 = Math.max(P[i][1], P[i + 1][1]);
        for (let gx = Math.floor((x0 - hs) / G); gx <= Math.floor((x1 + hs) / G); gx++) for (let gy = Math.floor((y0 - hs) / G); gy <= Math.floor((y1 + hs) / G); gy++) {
          const k = gx * 1e6 + gy;
          let c = this.grid.get(k);
          if (!c) this.grid.set(k, c = []);
          c.push([r, i]);
        }
      }
    }
    this.links = new Map();
    const cosMax = Math.cos(COUPLE_ANGLE * Math.PI / 180);
    for (const f of this.roads) {
      const P = f.pts, hf = W(f) / 2 + SHOULDER, of = this.order.get(f);
      const own = new Set(P.map(key));
      for (let j = 0; j < P.length; j++) {
        const p = P[j], k = key(p);
        const a = P[Math.max(0, j - 1)], b = P[Math.min(P.length - 1, j + 1)];
        const fl = hyp(b[0] - a[0], b[1] - a[1]) || 1;
        const fx = (b[0] - a[0]) / fl, fy = (b[1] - a[1]) / fl;
        let best = null;
        for (const [l, i] of this.grid.get(Math.floor(p[0] / this.G) * 1e6 + Math.floor(p[1] / this.G)) || []) {
          if (l === f || cmpOrder(this.order.get(l), of) >= 0) continue;
          const A = l.pts[i], B = l.pts[i + 1];
          if (own.has(key(A)) && own.has(key(B))) continue;
          const dx = B[0] - A[0], dy = B[1] - A[1], L = hyp(dx, dy);
          if (L < 1e-6 || Math.abs((fx * dx + fy * dy) / L) < cosMax) continue;
          const t = Math.max(0.0, Math.min(1.0, ((p[0] - A[0]) * dx + (p[1] - A[1]) * dy) / (L * L)));
          const d = hyp(A[0] + dx * t - p[0], A[1] + dy * t - p[1]);
          if (d < hf + W(l) / 2 + SHOULDER - COUPLE_OVERLAP && (best === null || d < best[0])) best = [d, l, i, t];
        }
        if (best && !this.links.has(k)) this.links.set(k, best.slice(1));
      }
    }
  }

  // volger-punt -> hoogte van de leider daar, waar een van beide van straatniveau af is
  bands(zmap) {
    const out = new Map();
    for (const [k, [l, i, t]] of this.links) {
      const A = l.pts[i], B = l.pts[i + 1];
      const zc = (zmap.get(key(A)) || 0) * (1 - t) + (zmap.get(key(B)) || 0) * t;
      if (Math.abs(zc) > 0.05 || Math.abs(zmap.get(k) || 0) > 0.05) out.set(k, zc);
    }
    return out;
  }

  leaders(ks) {
    const out = new Set();
    for (const k of ks) { const [l, i] = this.links.get(k); out.add(key(l.pts[i])); out.add(key(l.pts[i + 1])); }
    return out;
  }
}

// welke kant van een kruising beweegt voor ruimte: 'up', 'lo' of null
function mover(up, lo, zu, zl) {
  if (lo.rail) return !up.rail && isRing(up) && isUp(up) ? 'up' : null;
  if (up.rail) return isRing(lo) && isDown(lo) ? 'lo' : null;
  if (isUp(up) && !(isDown(lo) && zl < -1)) return 'up';
  if (isDown(lo)) return 'lo';
  return isRing(up) ? 'up' : 'lo';
}

const get = (m, k, d) => (m.has(k) ? m.get(k) : d);

export function ringHeights(data, rails = []) {
  const roads = data.roads;
  for (const r of roads) delete r.z;
  // elke ringweg en elke weg die er een kruist op STEP-punten, zodat de hoogte langs de weg kan veranderen
  let cross = crossings(roads, rails);
  const involved = new Set();
  for (const c of cross) for (const r of [c[0], c[1]]) if (!r.rail) involved.add(r);
  const originals = new Map();
  for (const r of roads) {
    if (isRing(r) || involved.has(r)) { originals.set(r, new Set(r.pts.map(key))); r.pts = densify(r.pts, STEP); }
  }
  cross = crossings(roads, rails);
  const adj = buildGraph(roads);
  const { lo: loB, hi: hiB } = basePlateaus(roads, data.water || []);
  let zmap = new Map();
  let fallbacks = 0;
  for (let it = 0; it < 24; it++) {
    zmap = solveField(adj, loB, hiB);
    let changed = 0;
    for (const [up, lo, x, y] of cross) {
      const zu = zOn(up, zmap, x, y), zl = zOn(lo, zmap, x, y);
      if (zu - zl >= CLEAR - 0.05) continue;
      const m = mover(up, lo, zu, zl);
      if (m === null) continue;
      const [road, other] = m === 'up' ? [up, lo] : [lo, up];
      const reach = (!other.rail ? W(other) / 2 : 3.0) + 3.0;
      const need = m === 'up' ? zl + CLEAR : zu - CLEAR;
      let hit = 0;
      for (const p of road.pts) {
        if (hyp(p[0] - x, p[1] - y) > reach) continue;
        const k = key(p);
        if (m === 'up' && get(loB, k, -1e9) < need - 0.01) { loB.set(k, need); hit++; }
        else if (m === 'lo' && get(hiB, k, 1e9) > need + 0.01) { hiB.set(k, need); hit++; }
      }
      changed += hit;
      if (hit || other.rail || zu - zl > CLEAR - 0.3) continue;
      // de mover komt er niet binnen MAX_GRADE (een andere kruising trekt de andere kant op): de andere weg wijkt
      const oReach = W(road) / 2 + 3.0;
      const oNeed = m === 'up' ? zu - CLEAR : zl + CLEAR;
      for (const p of other.pts) {
        if (hyp(p[0] - x, p[1] - y) > oReach) continue;
        const k = key(p);
        if (m === 'up' && get(hiB, k, 1e9) > oNeed + 0.01) { hiB.set(k, oNeed); changed++; fallbacks++; }
        else if (m === 'lo' && get(loB, k, -1e9) < oNeed - 0.01) { loB.set(k, oNeed); changed++; fallbacks++; }
      }
    }
    if (!changed) break;
  }

  // naast elkaar liggende ringwegen: de mindere volgt de ander zolang hun wegdekken overlappen
  const coupler = new Coupler(roads);
  const band = new Map(), frozen = new Map();
  const lockLo = new Map(loB), lockHi = new Map(hiB);
  for (const [up, lo, x, y] of cross) {
    if (mover(up, lo, 0.0, 0.0) === null) continue;
    for (const [road, sign] of [[up, 1], [lo, -1]]) {
      if (road.rail) continue;
      const other = sign > 0 ? lo : up;
      const reach = (!other.rail ? W(other) / 2 : 3.0) + 3.0;
      for (const p of road.pts) {
        if (hyp(p[0] - x, p[1] - y) > reach) continue;
        const k = key(p), z = get(zmap, k, 0.0);
        if (sign > 0) lockLo.set(k, Math.max(get(lockLo, k, -1e9), z));
        else lockHi.set(k, Math.min(get(lockHi, k, 1e9), z));
      }
    }
  }
  const envLo = propagate(adj, lockLo, 1), envHi = propagate(adj, lockHi, -1);
  const bounds = () => {
    const lo = new Map(lockLo), hi = new Map(lockHi);
    for (const [k, z] of frozen) if (!band.has(k)) { lo.set(k, z); hi.set(k, z); }
    for (const [k, t] of band) {
      const el = get(envLo, k, -1e9), eh = get(envHi, k, 1e9);
      lo.set(k, Math.max(get(lo, k, -1e9), Math.max(t - COUPLE_TOL, el)));
      hi.set(k, Math.min(get(hi, k, 1e9), Math.min(t + COUPLE_TOL, eh)));
    }
    return [lo, hi];
  };
  const clampEnv = (k, z) => Math.min(Math.max(z, get(envLo, k, -1e9)), get(envHi, k, 1e9));
  for (let round = 0; round < COUPLE_ROUNDS; round++) {
    const nb = coupler.bands(zmap);
    const pull = new Map();
    for (const [k, zc] of nb) {
      if (get(envLo, k, -1e9) > get(envHi, k, 1e9)) continue;
      const t = clampEnv(k, zc);
      band.set(k, t);
      if (Math.abs(t - zc) > COUPLE_TOL) {
        // de volger komt er niet binnen MAX_GRADE: de rijbaan komt hem tegemoet
        for (const lk of coupler.leaders([k])) { let l = pull.get(lk); if (!l) pull.set(lk, l = []); l.push(t); }
      }
    }
    for (const lk of coupler.leaders(nb.keys())) {
      if (band.has(lk) || get(envLo, lk, -1e9) > get(envHi, lk, 1e9)) continue;
      if (pull.has(lk)) { const l = pull.get(lk); frozen.set(lk, clampEnv(lk, l.reduce((a, b) => a + b, 0) / l.length)); }
      else if (!frozen.has(lk)) frozen.set(lk, get(zmap, lk, 0.0));
    }
    zmap = solveField(adj, ...bounds());
  }
  const fixed = new Set([...loB.keys(), ...hiB.keys(), ...band.keys(), ...frozen.keys()]);

  // verticale bogen: de vrije punten naar hun buren ontspannen
  for (let round = 0; round < SMOOTH_ITERS; round++) {
    const nxt = new Map();
    for (const [k, z] of zmap) {
      if (fixed.has(k)) continue;
      const ns = adj.get(k) || [];
      if (!ns.length) continue;
      let wsum = 0, acc = 0;
      for (const [n, L] of ns) { wsum += 1.0 / Math.max(L, 1.0); acc += get(zmap, n, 0.0) / Math.max(L, 1.0); }
      let v = z * 0.5 + (acc / wsum) * 0.5;
      // nooit steiler dan een helling naast een punt dat niet kan bewegen
      for (const [n, L] of ns) {
        if (fixed.has(n)) { const zn = get(zmap, n, 0.0); v = Math.min(Math.max(v, zn - SMOOTH_GRADE * L), zn + SMOOTH_GRADE * L); }
      }
      nxt.set(k, v);
    }
    for (const [k, v] of nxt) zmap.set(k, v);
  }

  // kuilen: het veld is de omhullende van de ondergrenzen (elk punt de laagste hoogte die de hoge bronnen met MAX_GRADE toelaten). Waar
  // twee bronnen elkaar op een weg ontmoeten (een afrit tussen een knoop die door het ene viaduct wordt gedragen en een stuk dat de
  // koppeling met de naastgelegen rijbaan volgt) ligt een stuk van de weg lager dan de punten ervoor en erna: een dal van enkele cm dat
  // auto's op 50 km/h aan de afrit laat springen (drive_audit, N46 bij 2537,-1812). Zo'n stuk (hooguit KUIL_MAX punten die geen grens
  // vasthoudt, op een weg zonder zijtakken) komt op de lagere van de twee buren, niet boven de bovenomhullende van wat eronder door moet.
  let filled = 0;
  for (const r of roads) {
    const P = r.pts, n = P.length;
    if (n < 3) continue;
    const zAt = (i) => get(zmap, key(P[i]), 0.0);
    const free = (i) => { const k = key(P[i]); return !fixed.has(k) && (adj.get(k) || []).length === 2; };
    for (let q = 1; q < n - 1; q++) {
      const zq = zAt(q);
      if (!free(q) || zq > zAt(q - 1) + 1e-9 || zq > zAt(q + 1) + 1e-9 || (zq > zAt(q - 1) - 0.005 && zq > zAt(q + 1) - 0.005)) continue;
      // de randen van het dal: omhoog lopen tot de hoogte niet meer stijgt, hooguit KUIL_MAX punten ver
      let L = q - 1, R = q + 1;
      while (L > 0 && q - L < KUIL_MAX && zAt(L - 1) > zAt(L) + 1e-9) L--;
      while (R < n - 1 && R - q < KUIL_MAX && zAt(R + 1) > zAt(R) + 1e-9) R++;
      const m = Math.min(zAt(L), zAt(R));
      let ok = true;
      for (let i = L + 1; i < R; i++) if (!free(i)) { ok = false; break; }
      if (!ok) continue;
      for (let i = L + 1; i < R; i++) if (zAt(i) < m - 0.005) { const k = key(P[i]); zmap.set(k, Math.min(m, get(envHi, k, 1e9))); filled++; }
    }
  }

  let nRoads = 0;
  for (const r of roads) {
    let zs = r.pts.map((p) => Math.round(get(zmap, key(p), 0.0) * 100) / 100);
    const keepOrig = originals.get(r);
    if (keepOrig) {
      // dichtgemaakte punten zonder inhoud (vlak en recht) weg
      const P2 = [r.pts[0]], Z2 = [zs[0]];
      for (let i = 1; i < r.pts.length - 1; i++) {
        const p = r.pts[i];
        if (keepOrig.has(key(p)) || (adj.get(key(p)) || []).length > 2) { P2.push(p); Z2.push(zs[i]); continue; }
        const a = P2[P2.length - 1], b = r.pts[i + 1];
        const La = hyp(p[0] - a[0], p[1] - a[1]), Lb = hyp(b[0] - p[0], b[1] - p[1]);
        const lin = Z2[Z2.length - 1] + (zs[i + 1] - Z2[Z2.length - 1]) * La / ((La + Lb) || 1);
        if (Math.abs(zs[i] - lin) > 0.03 || La > 40) { P2.push(p); Z2.push(zs[i]); }
      }
      P2.push(r.pts[r.pts.length - 1]); Z2.push(zs[zs.length - 1]);
      r.pts = P2; zs = Z2;
    }
    if (zs.some((z) => Math.abs(z) > 0.05)) { r.z = zs; nRoads++; }
  }
  let bad = 0;
  for (const [up, lo, x, y] of cross) if (zOn(up, zmap, x, y) - zOn(lo, zmap, x, y) < CLEAR - 0.6 && mover(up, lo, 0, 0) !== null) bad++;
  return { roads: nRoads, crossings: cross.length, fallbacks, lowClearance: bad, filled };
}
