// Perrons met trappen uit de OSM-perrons (#436): de bouw van `map.perrons` (game/js/perrons.js), voor elk station van de kaart.
//
//   derivePerrons(data)  ->  { rows, rep }     data: { rails (met z), railPlatforms, roads, buildings, water, stations }
//
// Een OSM-perron (railway=platform) is een vlak langs het spoor. Het wordt hier:
//   1. een of meer stroken (hartlijn om de 4 m met halve breedte), met de rand van elk spoor erlangs (PLATFORM_EDGE) eruit gesneden,
//      zodat een slordig getekend perron nooit over de baan van de trein ligt;
//   2. op de hoogte van de spoorvloer + 1,02 m (rail 0,26 + perron 0,76: PERRON_TOP), vlak zoals railprofile.mjs het spoor erlangs vlak legt;
//   3. met een trap (hoog perron, bijvoorbeeld Groningen Noord op 5,6 m) of een helling (laag perron, 1:12) van straatniveau naar het perron, op
//      de plek rond het perron waar niets in de weg staat (gebouw, water, weg, spoor, een ander perron). Past nergens een trap, dan telt het
//      mee in rep.zonderTrap.
import { SpatialGrid } from '../../game/js/spatialgrid.js';
import { pointInPolygon, polygonBounds } from '../../game/js/util.js';
import { railHeightIndex, railHeightAt, PLATFORM_EDGE } from '../../game/js/railprofile.js';
import { PERRON_TOP, TRAP_HW } from '../../game/js/perrons.js';

export const STAP = 4;            // m tussen twee punten van een strook
const MIN_STROOK = 12;            // m: een kortere strook is een stukje OSM-afval
const MIN_BREED = 1.5;            // m: smaller dan dit is geen perron
const SNIJ = PLATFORM_EDGE + 0.15; // m: wat van elk spoor vrij blijft
const GRAD_TRAP = 0.28;           // een trap omhoog: 1:3,6 (te voet en met de fiets aan de hand)
const GRAD_HELLING = 0.085;       // een helling voor een laag perron: 1:12
const HOOG = 1.5;                 // m: boven deze bovenkant een trap in plaats van een helling

const r2 = (v) => Math.round(v * 100) / 100;

// ---------------------------------------------------------------- strook uit een OSM-vlak

function projector(P) {
  const n = P.length;
  const cx = P.reduce((a, q) => a + q[0], 0) / n, cy = P.reduce((a, q) => a + q[1], 0) / n;
  let sxx = 0, sxy = 0, syy = 0;
  for (const q of P) { const dx = q[0] - cx, dy = q[1] - cy; sxx += dx * dx; sxy += dx * dy; syy += dy * dy; }
  const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy), ux = Math.cos(ang), uy = Math.sin(ang);
  return { cx, cy, ux, uy, nx: -uy, ny: ux };
}

// de dwarsdoorsnede van een vlak op afstand t langs de as: de uiterste w van de snijpunten (of null)
function section(P, f, t) {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length];
    const ta = (a[0] - f.cx) * f.ux + (a[1] - f.cy) * f.uy, tb = (b[0] - f.cx) * f.ux + (b[1] - f.cy) * f.uy;
    if ((ta - t) * (tb - t) > 0 || ta === tb) continue;
    const wa = (a[0] - f.cx) * f.nx + (a[1] - f.cy) * f.ny, wb = (b[0] - f.cx) * f.nx + (b[1] - f.cy) * f.ny;
    const w = wa + (wb - wa) * (t - ta) / (tb - ta);
    if (w < lo) lo = w;
    if (w > hi) hi = w;
  }
  return hi > lo ? [lo, hi] : null;
}

// de w-waarden waar een spoor de dwarslijn op t kruist
function railCuts(rails, f, t, wlo, whi) {
  const out = [];
  for (const P of rails) {
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i], b = P[i + 1];
      const ta = (a[0] - f.cx) * f.ux + (a[1] - f.cy) * f.uy, tb = (b[0] - f.cx) * f.ux + (b[1] - f.cy) * f.uy;
      if ((ta - t) * (tb - t) > 0 || ta === tb) continue;
      const wa = (a[0] - f.cx) * f.nx + (a[1] - f.cy) * f.ny, wb = (b[0] - f.cx) * f.nx + (b[1] - f.cy) * f.ny;
      const w = wa + (wb - wa) * (t - ta) / (tb - ta);
      if (w > wlo - 4 && w < whi + 4) out.push(w);
    }
  }
  return out.sort((p, q) => p - q);
}

function subtract(iv, cuts) {
  let out = [iv];
  for (const w of cuts) {
    const next = [];
    for (const [a, b] of out) {
      if (w + SNIJ <= a || w - SNIJ >= b) { next.push([a, b]); continue; }
      if (w - SNIJ > a) next.push([a, w - SNIJ]);
      if (w + SNIJ < b) next.push([w + SNIJ, b]);
    }
    out = next;
  }
  return out.filter(([a, b]) => b - a >= MIN_BREED);
}

// stroken { pts: [[x, y, hs]] } van een perronvlak, met de sporen eruit gesneden
export function stripsOf(P, rails) {
  const f = projector(P);
  let lo = Infinity, hi = -Infinity;
  for (const q of P) { const t = (q[0] - f.cx) * f.ux + (q[1] - f.cy) * f.uy; if (t < lo) lo = t; if (t > hi) hi = t; }
  const open = [], done = [];
  let idx = 0;
  const ts = [];
  for (let t = lo + 0.25; t < hi - 0.25; t += STAP) ts.push(t);
  ts.push(hi - 0.25);
  for (const t of ts) {
    idx++;
    const sec = section(P, f, t);
    const ivs = sec ? subtract(sec, railCuts(rails, f, t, sec[0], sec[1])) : [];
    const taken = new Set();
    for (const [a, b] of ivs) {
      const wc = (a + b) / 2;
      let best = null, bd = 3;
      for (const s of open) if (!taken.has(s) && s.idx === idx - 1 && Math.abs(s.w - wc) < bd) { bd = Math.abs(s.w - wc); best = s; }
      if (!best) { best = { pts: [], idx, w: wc }; open.push(best); }
      taken.add(best);
      best.pts.push([f.cx + f.ux * t + f.nx * wc, f.cy + f.uy * t + f.ny * wc, (b - a) / 2]);
      best.idx = idx; best.w = wc;
    }
    for (let i = open.length - 1; i >= 0; i--) if (open[i].idx < idx) done.push(...open.splice(i, 1));
  }
  done.push(...open);
  return done.map((s) => s.pts).filter((p) => p.length >= 2 && (p.length - 1) * STAP >= MIN_STROOK);
}

// ---------------------------------------------------------------- de omgeving: waar staat iets in de weg

function obstacles(d) {
  const poly = (list, cell) => {
    const g = new SpatialGrid(cell);
    for (const o of list || []) { if (!o.pts || o.pts.length < 3) continue; g.insert(o, polygonBounds(o.pts)); }
    return g;
  };
  const bg = poly(d.buildings, 64), wg = poly(d.water, 128);
  const rg = new SpatialGrid(64);
  for (const r of d.roads || []) {
    // (paden zijn geen hindernis: een trap die over een voetpad komt laat dat pad eronder liggen, een weg niet)
    if (!r.pts || r.pts.length < 2 || r.bridge || r.tunnel || r.cat === 'rail' || r.cat === 'foot' || r.cat === 'cycle') continue;
    rg.insert(r, polygonBounds(r.pts));
  }
  const lg = new SpatialGrid(64);
  d.rails.forEach((r, i) => {
    const P = r.pts;
    for (let k = 0; k < P.length - 1; k++) lg.insert({ ax: P[k][0], ay: P[k][1], bx: P[k + 1][0], by: P[k + 1][1], z: Math.max(r.z ? r.z[k] : 0, r.z ? r.z[k + 1] : 0), rail: i }, [Math.min(P[k][0], P[k + 1][0]), Math.min(P[k][1], P[k + 1][1]), Math.max(P[k][0], P[k + 1][0]), Math.max(P[k][1], P[k + 1][1])]);
  });
  return { bg, wg, rg, lg };
}
const segd = (x, y, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
  const t = L2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)) : 0;
  return Math.hypot(x - ax - dx * t, y - ay - dy * t);
};
function nearPoly(P, x, y, m) {
  if (pointInPolygon(x, y, P)) return true;
  for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; if (segd(x, y, a[0], a[1], b[0], b[1]) < m) return true; }
  return false;
}

// staat er bij (x, y) iets binnen m: 'gebouw', 'water', 'weg', 'spoor' (alleen spoor op hoogte als `hoog` onwaar is) of een ander perron
function blocker(O, x, y, m, { alleSpoor, eigen, anders }) {
  for (const b of O.bg.query(x - m, y - m, x + m, y + m)) if (nearPoly(b.pts, x, y, m)) return 'gebouw';
  for (const w of O.wg.query(x - m, y - m, x + m, y + m)) if (pointInPolygon(x, y, w.pts)) return 'water';
  for (const r of O.rg.query(x - m - 8, y - m - 8, x + m + 8, y + m + 8)) {
    const hw = (r.width || 4) / 2 + m;
    for (let i = 0; i < r.pts.length - 1; i++) if (segd(x, y, r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1]) < hw) return 'weg';
  }
  for (const s of O.lg.query(x - 3, y - 3, x + 3, y + 3)) if ((alleSpoor || s.z > 0.4) && segd(x, y, s.ax, s.ay, s.bx, s.by) < 2.4 + m * 0.3) return 'spoor';
  for (const p of anders) {
    for (let i = 0; i < p.length - 1; i++) if (segd(x, y, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]) < p[i][2] + m) return 'perron';
  }
  return null;
}

// ---------------------------------------------------------------- trappen

function rampCandidates(pts, top, steps = []) {
  const hoog = top > HOOG, g = hoog ? GRAD_TRAP : GRAD_HELLING, L = top / g;
  const out = [];
  const n = pts.length;
  const dir = (i, j) => { const dx = pts[j][0] - pts[i][0], dy = pts[j][1] - pts[i][1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
  // de trappen die OSM zelf al bij dit perron tekent (highway=steps): de echte plek gaat voor
  for (const st of steps) {
    let best = null, bd = 40;
    for (const e of [st[0], st[st.length - 1]]) for (let i = 0; i < n; i++) { const dd = Math.hypot(pts[i][0] - e[0], pts[i][1] - e[1]); if (dd < bd) { bd = dd; best = { e, i }; } }
    if (!best) continue;
    const c = pts[best.i], dx = best.e[0] - c[0], dy = best.e[1] - c[1], l = Math.hypot(dx, dy);
    if (l < c[2] * 0.5) continue;
    out.push({ kind: 'osm', at: best.i / (n - 1), a: [c[0] + (dx / l) * c[2], c[1] + (dy / l) * c[2]], u: [dx / l, dy / l], L, hs: c[2] });
  }
  // de koppen, in het verlengde van de strook
  const [sx, sy] = dir(1, 0), [ex, ey] = dir(n - 2, n - 1);
  out.push({ kind: 'kop', at: 'begin', a: [pts[0][0], pts[0][1]], u: [sx, sy], L, hs: pts[0][2] });
  out.push({ kind: 'kop', at: 'eind', a: [pts[n - 1][0], pts[n - 1][1]], u: [ex, ey], L, hs: pts[n - 1][2] });
  // de lange zijden: dwars op de strook, aan beide kanten, op 8 plekken
  for (let k = 1; k <= 8; k++) {
    const i = Math.min(n - 2, Math.round(((n - 1) * k) / 9));
    const [dx, dy] = dir(i, i + 1);
    for (const side of [1, -1]) {
      const nx = -dy * side, ny = dx * side;
      out.push({ kind: 'zij', at: k / 9, a: [pts[i][0] + nx * pts[i][2], pts[i][1] + ny * pts[i][2]], u: [nx, ny], L, hs: pts[i][2] });
    }
  }
  return out;
}

function score(c, O, ctx) {
  let hits = 0, first = null;
  const hw = Math.min(TRAP_HW, Math.max(0.9, c.hs - 0.1));
  c.hw = hw;
  for (let s = 2; s <= c.L; s += 2) {
    for (const o of [-hw - 0.6, 0, hw + 0.6]) {
      const x = c.a[0] + c.u[0] * s - c.u[1] * o, y = c.a[1] + c.u[1] * s + c.u[0] * o;
      const w = blocker(O, x, y, 0.8, ctx);
      if (w) { hits++; if (!first) first = w; }
    }
  }
  c.hits = hits; c.first = first;
  return hits;
}

// Waar een autoweg dwars door het vlak loopt (een overweg, een straat over het perronkop) houdt de strook op: een muur over de weg sluit hem af
function splitAtRoads(strip, O, raised) {
  const out = [];
  let cur = [];
  for (const q of strip) {
    let bad = false;
    // (een perron op een dijk of viaduct staat boven de weg die eronderdoor gaat)
    if (!raised(q)) for (const r of O.rg.query(q[0] - 12, q[1] - 12, q[0] + 12, q[1] + 12)) {
      const hw = (r.width || 4) / 2 + 1.5;
      for (let i = 0; i < r.pts.length - 1 && !bad; i++) if (segd(q[0], q[1], r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1]) < hw) bad = true;
      if (bad) break;
    }
    if (bad) { if (cur.length) out.push(cur); cur = []; } else cur.push(q);
  }
  if (cur.length) out.push(cur);
  return out;
}

// de hartlijn gladstrijken (1-2-1) en de breedte op het smalste van drie buren, zodat de rand niet zaagt en nooit ruimer wordt dan het vlak
function smooth(pts) {
  if (pts.length < 3) return pts;
  return pts.map((q, i) => {
    if (i === 0 || i === pts.length - 1) return q;
    const a = pts[i - 1], b = pts[i + 1];
    return [0.25 * a[0] + 0.5 * q[0] + 0.25 * b[0], 0.25 * a[1] + 0.5 * q[1] + 0.25 * b[1], Math.min(a[2], q[2], b[2])];
  });
}

// ---------------------------------------------------------------- alles

export function derivePerrons(data, { log = false } = {}) {
  const rep = { platforms: 0, stroken: 0, trappen: 0, helling: 0, zonderTrap: [], overgeslagen: 0, hoog: 0 };
  const platforms = data.railPlatforms || [];
  if (!platforms.length || !(data.rails || []).length) return { rows: [], rep };
  const railPts = data.rails.map((r) => r.pts);
  const idx = railHeightIndex(data.rails);
  const O = obstacles(data);
  const rows = [], all = [];
  // stap 1 en 2: de stroken met hun hoogte
  for (const pl of platforms) {
    const P = pl.pts;
    if (!P || P.length < 3) continue;
    const b = polygonBounds(P);
    const near = railPts.filter((r) => { const q = polygonBounds(r); return q[2] > b[0] - 20 && q[0] < b[2] + 20 && q[3] > b[1] - 20 && q[1] < b[3] + 20; });
    if (!near.length) { rep.overgeslagen++; continue; }
    rep.platforms++;
    const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
    let st = null, bd = 500;
    for (const s of data.stations || []) { const dd = Math.hypot(s.x - cx, s.y - cy); if (dd < bd) { bd = dd; st = s.name; } }
    let k = 0;
    for (const strip of stripsOf(P, near).flatMap((s) => splitAtRoads(s, O, (q) => railHeightAt(idx, q[0], q[1], 15) > 0.5)).map(smooth).filter((s) => s.length >= 2 && (s.length - 1) * STAP >= MIN_STROOK)) {
      const p = strip.map(([x, y, hs]) => { const zr = railHeightAt(idx, x, y, 15); return [r2(x), r2(y), r2(hs), r2(zr + PERRON_TOP)]; });
      k++;
      rep.stroken++;
      rows.push({ id: `${(st || 'perron').replace(/^Groningen /, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${pl.ref || '?'}${k > 1 ? '-' + k : ''}`, nm: pl.ref ? `Perron ${pl.ref}` : 'Perron', st, p, r: [] });
      all.push(p);
    }
  }
  // stap 3: de trappen
  for (const row of rows) {
    const top = row.p.reduce((a, q) => a + q[3], 0) / row.p.length;
    if (top > HOOG) rep.hoog++;
    const anders = all.filter((p) => p !== row.p);
    const steps = (data.roads || []).filter((r) => r.type === 'steps' && r.pts && r.pts.length >= 2).map((r) => r.pts);
    const cands = rampCandidates(row.p, top, steps);
    const ctxFor = (c) => ({ alleSpoor: c.kind !== 'kop' && top > HOOG, anders: c.kind !== 'kop' ? anders : [], eigen: row.p });
    for (const c of cands) score(c, O, ctxFor(c));
    const lang = (row.p.length - 1) * STAP;
    const want = lang > 100 ? 2 : 1;
    const picked = [];
    // eerst wat vrij is: kop boven zij, dan de kortste weg langs het perron naar het midden
    const order = (a, b) => a.hits - b.hits || (a.kind === 'osm' ? -1 : a.kind === 'kop' ? 0 : 1) - (b.kind === 'osm' ? -1 : b.kind === 'kop' ? 0 : 1);
    for (let n = 0; n < want; n++) {
      const free = cands.filter((c) => !picked.includes(c) && c.hits === 0 && picked.every((p) => Math.hypot(p.a[0] - c.a[0], p.a[1] - c.a[1]) > Math.min(40, lang / 2.5)));
      free.sort(order);
      if (free.length) { picked.push(free[0]); continue; }
      if (n === 0) {
        const rest = cands.filter((c) => !picked.includes(c)).sort(order);
        if (rest.length) { picked.push(rest[0]); rep.zonderTrap.push({ perron: row.id, hits: rest[0].hits, hinder: rest[0].first }); }
      }
    }
    for (const c of picked) {
      const hoog = top > HOOG;
      const za = r2(c.kind === 'kop' ? (c.at === 'begin' ? row.p[0][3] : row.p[row.p.length - 1][3]) : nearZ(row.p, c.a));
      row.r.push({ a: [r2(c.a[0]), r2(c.a[1])], b: [r2(c.a[0] + c.u[0] * c.L), r2(c.a[1] + c.u[1] * c.L)], hw: r2(c.hw), za, zb: 0, k: hoog ? 'trap' : 'helling' });
      if (hoog) rep.trappen++; else rep.helling++;
    }
    if (log) console.log(row.id, 'top', top.toFixed(2), 'trappen', picked.map((c) => `${c.kind}@${typeof c.at === 'number' ? c.at.toFixed(2) : c.at} hits ${c.hits}${c.first ? ' ' + c.first : ''}`).join(' | '));
  }
  return { rows, rep };
}

function nearZ(p, a) {
  let bd = Infinity, z = p[0][3];
  for (const q of p) { const d = Math.hypot(q[0] - a[0], q[1] - a[1]); if (d < bd) { bd = d; z = q[3]; } }
  return z;
}
