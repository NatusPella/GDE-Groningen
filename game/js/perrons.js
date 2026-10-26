import { SpatialGrid } from './spatialgrid.js';
import { closestPointOnSegment } from './util.js';
import { RAIL_TOP, PLATFORM_ABOVE_RAIL } from './railprofile.js';

// Perrons (#436): een perron is een vlakke, loopbare vloer op de hoogte van de spoorvloer plus 1,02 m (bovenkant rail 0,26 m
// boven het ballastbed, perron 0,76 m boven de rail), met een rand die de trein vrij laat. Pure gegevens en meetkunde: geen scene.
//
// De bouw (scripts/world/perrons.mjs) maakt uit de OSM-perrons rijen van de vorm
//   { id, nm, st, p: [[x, y, hs, z], ...], r: [{ a: [x, y], b: [x, y], hw, za, zb, k }] }
// p is de hartlijn van een strook (om de ~4 m een punt: halve breedte hs, bovenkant z boven straatniveau), r zijn de trappen
// ('trap' voor een hoog perron, 'helling' voor een laag): a bij het perron (z = za), b aan de voet (z = zb).
//
// Het loopvlak komt via perronZAt in groundHeightAt (elevation.js), de randen via perronWalls (een muur voor wie lager staat dan
// het perron min één stap), zodat je alleen via een trap omhoog komt en een auto er nooit op rijdt.

export const PERRON_TOP = RAIL_TOP + PLATFORM_ABOVE_RAIL;
// voetgangers stappen over een rand van deze hoogte (zoals STEP_UP in elevation.js, met een marge); wat hoger is, blijft een muur
export const WALK_STEP = 1.35;
// voertuigen (ook een fiets) komen niet over een rand hoger dan dit
export const VEH_STEP = 0.3;
// halve breedte van een trap, de afstand van de palen aan de voet (een fiets past ertussen, een auto niet)
export const TRAP_HW = 1.6;
export const PAAL_GAT = 0.75;
const CELL = 16;
const WALL_PIECE = 1;
const WALL_OVERLAP = 0.25;

const lerp = (a, b, t) => a + (b - a) * t;

// Het raster van loopvlakken (strookstukken en trappen) en de randstukken van een lijst perronrijen.
export function buildPerrons(rows) {
  const P = { rows: rows || [], grid: new SpatialGrid(CELL), walls: [], posts: [], items: 0 };
  for (const row of P.rows) {
    const pts = row.p || [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay, ha, za] = pts[i], [bx, by, hb, zb] = pts[i + 1];
      const len = Math.hypot(bx - ax, by - ay);
      if (len < 1e-3) continue;
      const hs = Math.max(ha, hb);
      const it = { k: 0, ax, ay, bx, by, ha, hb, hs, za, zb, len, ux: (bx - ax) / len, uy: (by - ay) / len, row, first: i === 0, last: i === pts.length - 2 };
      P.grid.insert(it, [Math.min(ax, bx) - hs, Math.min(ay, by) - hs, Math.max(ax, bx) + hs, Math.max(ay, by) + hs]);
      P.items++;
    }
    for (const r of row.r || []) {
      const [ax, ay] = r.a, [bx, by] = r.b;
      const len = Math.hypot(bx - ax, by - ay);
      if (len < 1e-3) continue;
      const hw = r.hw || TRAP_HW;
      const it = { k: 1, ax, ay, bx, by, hw, za: r.za, zb: r.zb, len, ux: (bx - ax) / len, uy: (by - ay) / len, row, ramp: r };
      const ex = Math.abs(it.uy) * hw, ey = Math.abs(it.ux) * hw;
      P.grid.insert(it, [Math.min(ax, bx) - ex, Math.min(ay, by) - ey, Math.max(ax, bx) + ex, Math.max(ay, by) + ey]);
      P.items++;
    }
    addWalls(P, row);
  }
  return P;
}

// Hoogte van het perronvloertje of de trap onder (x, y): { z, k } voor het hoogste vlak, of null. lim: de hoogste z die telt.
const _hit = { z: 0, k: 0, item: null };
export function perronHitAt(P, x, y, lim = Infinity) {
  if (!P || !P.items) return null;
  const list = P.grid.cellItems(Math.floor(x / CELL), Math.floor(y / CELL));
  if (!list) return null;
  let best = null;
  for (const it of list) {
    let z;
    if (it.k === 0) {
      const q = closestPointOnSegment(x, y, it.ax, it.ay, it.bx, it.by);
      const hs = lerp(it.ha, it.hb, q.t);
      if (q.dist2 > hs * hs) continue;
      // (de koppen van een strook zijn recht: geen ronde kap voorbij het eerste of laatste punt)
      const along = (x - it.ax) * it.ux + (y - it.ay) * it.uy;
      if ((it.first && along < 0) || (it.last && along > it.len)) continue;
      z = lerp(it.za, it.zb, q.t);
    } else {
      const along = (x - it.ax) * it.ux + (y - it.ay) * it.uy;
      if (along < 0 || along > it.len) continue;
      const side = -(x - it.ax) * it.uy + (y - it.ay) * it.ux;
      if (side > it.hw || side < -it.hw) continue;
      z = lerp(it.za, it.zb, along / it.len);
    }
    if (z > lim) continue;
    if (!best || z > best.z) { _hit.z = z; _hit.k = it.k; _hit.item = it; best = _hit; }
  }
  return best;
}
export const perronZAt = (P, x, y, lim = Infinity) => { const h = perronHitAt(P, x, y, lim); return h ? h.z : null; };

// Staat iemand op (x, y) op het vloertje van een perron (geen trap), op hoogte z? Dan raakt een trein hem niet (railway.js).
export function onPerron(P, x, y, z, tol = 0.6) {
  const h = perronHitAt(P, x, y, z + tol);
  return !!h && h.k === 0 && h.z > z - tol;
}

// ---------------------------------------------------------------- randen

function pushWall(P, ax, ay, bx, by, nx, ny, z) {
  const w = { ax, ay, bx, by, nx, ny, za: z, zb: z, z, kind: 'perron', low: true, fence: false, covered: false };
  P.walls.push(w);
}

// Een rand langs lijn a-b in stukjes van ~1 m, met de normaal loodrecht op de lijn zelf en naar het punt (ix, iy) aan de binnenkant, zonder de
// stukjes die bij een trapaanzet (een van : [x, y, halve breedte]) liggen.
function edge(P, ax, ay, bx, by, ix, iy, zOf, gaps) {
  const len = Math.hypot(bx - ax, by - ay);
  if (len < 1e-4) return;
  let nx = -(by - ay) / len, ny = (bx - ax) / len;
  if ((ix - ax) * nx + (iy - ay) * ny < 0) { nx = -nx; ny = -ny; }
  const n = Math.max(1, Math.round(len / WALL_PIECE));
  for (let k = 0; k < n; k++) {
    const t0 = k / n, t1 = (k + 1) / n, tm = (t0 + t1) / 2;
    const mx = lerp(ax, bx, tm), my = lerp(ay, by, tm);
    if (gaps && gaps.some((g) => Math.hypot(mx - g[0], my - g[1]) < g[2] + len / n / 2)) continue;
    // (de stukjes overlappen een kwart meter, zodat een knik in de rand geen spleet voor een auto laat)
    const ux = (bx - ax) / len, uy = (by - ay) / len, o = WALL_OVERLAP;
    pushWall(P, lerp(ax, bx, t0) - ux * o, lerp(ay, by, t0) - uy * o, lerp(ax, bx, t1) + ux * o, lerp(ay, by, t1) + uy * o, nx, ny, zOf(tm));
  }
}

function addWalls(P, row) {
  const pts = row.p || [];
  if (pts.length < 2) return;
  const gaps = (row.r || []).map((r) => [r.a[0], r.a[1], r.hw || TRAP_HW]);
  const L = [], R = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l, ny = dx / l, hs = pts[i][2];
    L.push([pts[i][0] + nx * hs, pts[i][1] + ny * hs, pts[i][3]]);
    R.push([pts[i][0] - nx * hs, pts[i][1] - ny * hs, pts[i][3]]);
  }
  for (let i = 0; i < pts.length - 1; i++) {
    for (const E of [L, R]) {
      const a = E[i], b = E[i + 1];
      edge(P, a[0], a[1], b[0], b[1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2, (t) => lerp(a[2], b[2], t), gaps);
    }
  }
  // de koppen
  const e = pts.length - 1;
  edge(P, L[0][0], L[0][1], R[0][0], R[0][1], pts[1][0], pts[1][1], () => pts[0][3], gaps);
  edge(P, L[e][0], L[e][1], R[e][0], R[e][1], pts[e - 1][0], pts[e - 1][1], () => pts[e][3], gaps);
  // de zijden van de trappen en de palen aan hun voet
  for (const r of row.r || []) {
    const len = Math.hypot(r.b[0] - r.a[0], r.b[1] - r.a[1]);
    if (len < 1e-3) continue;
    const ux = (r.b[0] - r.a[0]) / len, uy = (r.b[1] - r.a[1]) / len, hw = r.hw || TRAP_HW;
    for (const side of [1, -1]) {
      const nx = -uy * side, ny = ux * side; // naar buiten
      const ax = r.a[0] + nx * hw, ay = r.a[1] + ny * hw, bx = r.b[0] + nx * hw, by = r.b[1] + ny * hw;
      edge(P, ax, ay, bx, by, (r.a[0] + r.b[0]) / 2, (r.a[1] + r.b[1]) / 2, (t) => lerp(r.za, r.zb, t), null);
    }
    for (const s of hw > 1.4 ? [PAAL_GAT, -PAAL_GAT, hw - 0.15, -(hw - 0.15)] : [PAAL_GAT, -PAAL_GAT]) P.posts.push({ x: r.b[0] + -uy * s, y: r.b[1] + ux * s, r: 0.15, row });
  }
}

// De muurstukken van het perron die iets nabij (x, y) raken: voor elevation.js (wallGrid).
export function wallBox(w) {
  return [Math.min(w.ax, w.bx) - 2, Math.min(w.ay, w.by) - 2, Math.max(w.ax, w.bx) + 2, Math.max(w.ay, w.by) + 2];
}

// Een muurstuk van een perron: blokkeert wie lager staat dan de bovenkant min één stap (walkers: WALK_STEP, voertuigen:
// VEH_STEP). Voor een voertuig geldt daarbij een ondergrens van PER_UNDER: staat het perron hoger boven de auto, dan
// rijdt hij eronderdoor. Het perron van het Noorderstation ligt 6,62 m boven de Kastanjelaan en daar stond elke auto
// tegenaan (#509); 4,2 m is dezelfde doorgangshoogte die dit project voor een weg onder een dek aanhoudt. Te voet
// blijft de regel zoals hij was.
export const PER_UNDER = 4.2;
export const perronWallSide = (w, z, veh) => (veh
  ? (z < w.z - VEH_STEP && z > w.z - PER_UNDER ? -1 : 0)
  : (z < w.z - WALK_STEP ? -1 : 0));
