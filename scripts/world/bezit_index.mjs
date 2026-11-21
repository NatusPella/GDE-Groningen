// Bezit-index (epic Bezit, #1096): bouwt bij het bouwen van de wereld twee kleine bestanden uit de tegels, zodat het spel
// lui kan laden wat het nodig heeft zonder de tegels te lezen:
//   bezit-percelen.json: de koopbare percelen (stabiel ID, binnenpunt, ankerpunt, oppervlakte, soort, toegangsklasse)
//   bezit-panden.json:   de pand-index voor Bedrijven (OSM-id, plek, grondvlak, soort), alleen panden die geen gewone woning zijn
// De tegels knippen elk landgebruikvlak op de kilometerlijn: stukken van dezelfde soort die een deel van een tegelrand delen
// worden aaneengeregen tot een perceel. Het ID hangt niet af van gid, bouwvolgorde of tegelindeling (zie docs/BEZIT-21-11.md 2.5).
// Percelen onder 0,5 ha worden samengevoegd met de grootste buur van dezelfde soort.
//
//   node scripts/world/bezit_index.mjs [--world <map met index-provincie.json>] [--out <map>] [--quiet]
// Ook aangeroepen door build_province.mjs (writeProvince) met de uitvoermap.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import * as G from '../../game/js/gdt.js';

export const BEZIT_INDEX_VERSION = 1;
export const PARCEL_FILE = 'bezit-percelen.json';
export const BUILDING_FILE = 'bezit-panden.json';
export const KINDS = ['w', 'a', 'b'];                       // weide, akker, boomgaard
export const USE_TO_KIND = { weide: 0, akker: 1, boomgaard: 2 };
export const ACCESS = ['weg', 'pad', 'wegNabij', 'padNabij', 'geen'];
export const MIN_HA = 0.5;                                  // daaronder samenvoegen met een buur van dezelfde soort
const TL = 0.06;                                            // tolerantie voor 'ligt op een tegelrand' (m)
const CELL = 100;

const offLine = (v, o) => { const m = (((v - o) % 1000) + 1000) % 1000; return Math.min(m, 1000 - m); };
export const onTileX = (x) => offLine(x, G.GRID_X0) < TL;
export const onTileY = (y) => offLine(y, G.GRID_Y0) < TL;
const enc = new TextEncoder();
export const hash48 = (s) => G.hash64(enc.encode(s)).slice(0, 12);

export const polyArea = (P) => { let s = 0; for (let i = 0, j = P.length - 1; i < P.length; j = i++) s += (P[j][0] + P[i][0]) * (P[j][1] - P[i][1]); return Math.abs(s) / 2; };
const boundsOf = (P) => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const p of P) { if (p[0] < a) a = p[0]; if (p[0] > c) c = p[0]; if (p[1] < b) b = p[1]; if (p[1] > d) d = p[1]; } return [a, b, c, d]; };

// Stukken aaneenrijgen: een stuk dat langs een tegelrand loopt hoort bij het stuk van dezelfde soort aan de overkant dat een deel van die
// rand deelt. Eén functie, zodat een test hem met omgekeerde volgorde nog eens kan draaien (determinisme).
export function groupPieces(list) {
  const parent = list.map((_, i) => i);
  const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  const union = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[Math.max(a, b)] = Math.min(a, b); };
  const buckets = new Map();
  list.forEach((p, n) => {
    const P = p.pts;
    for (let i = 0; i < P.length - 1; i++) {
      const [ax, ay] = P[i], [bx, by] = P[i + 1];
      let k = null, lo, hi;
      if (Math.abs(ax - bx) < TL && onTileX(ax)) { k = `V${Math.round((ax - G.GRID_X0) / 1000)}|${p.use}`; lo = Math.min(ay, by); hi = Math.max(ay, by); }
      else if (Math.abs(ay - by) < TL && onTileY(ay)) { k = `H${Math.round((ay - G.GRID_Y0) / 1000)}|${p.use}`; lo = Math.min(ax, bx); hi = Math.max(ax, bx); }
      if (k) (buckets.get(k) || buckets.set(k, []).get(k)).push({ n, lo, hi });
    }
  });
  let joins = 0;
  for (const b of buckets.values()) {
    b.sort((x, y) => x.lo - y.lo);
    for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length && b[j].lo < b[i].hi - 0.5; j++) {
      if (b[i].n !== b[j].n && list[b[i].n].tile !== list[b[j].n].tile && Math.min(b[i].hi, b[j].hi) - b[j].lo > 0.5) { union(b[i].n, b[j].n); joins++; }
    }
  }
  const groups = new Map();
  list.forEach((p, n) => { const r = find(n); (groups.get(r) || groups.set(r, []).get(r)).push(p); });
  return { groups: [...groups.values()], joins };
}

// Het laagste hoekpunt van de groep dat niet op een tegelrand ligt (op 1 m); alleen op een rand als er niets anders is.
export function anchorOf(g) {
  let best = null, edge = null;
  const better = (c, x, y) => !c || y < c[1] || (y === c[1] && x < c[0]);
  for (const p of g) for (const q of p.pts) {
    const x = Math.round(q[0]), y = Math.round(q[1]);
    if (onTileX(q[0]) || onTileY(q[1])) { if (better(edge, x, y)) edge = [x, y]; } else if (better(best, x, y)) best = [x, y];
  }
  return best || edge;
}

// Een punt binnen het stuk: de langste snede van een scanlijn op de halve hoogte (en nog vier hoogtes als dat mislukt).
export function surfacePoint(P) {
  const [x0, y0, x1, y1] = boundsOf(P);
  for (const f of [0.5, 0.35, 0.65, 0.2, 0.8]) {
    const y = y0 + (y1 - y0) * f, xs = [];
    for (let i = 0; i < P.length - 1; i++) { const a = P[i], b = P[i + 1]; if ((a[1] > y) !== (b[1] > y)) xs.push(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1])); }
    xs.sort((a, b) => a - b);
    let bi = -1, bl = 0;
    for (let i = 0; i + 1 < xs.length; i += 2) if (xs[i + 1] - xs[i] > bl) { bl = xs[i + 1] - xs[i]; bi = i; }
    if (bi >= 0 && bl > 1) return [Math.round((xs[bi] + xs[bi + 1]) / 2), Math.round(y)];
  }
  return [Math.round((x0 + x1) / 2), Math.round((y0 + y1) / 2)];
}

// 'p' + 12 hex (48 bit): hash van soort, ankerpunt (1 m) en binnenpunt (10 m). 0 botsingen op 13.883 percelen (audit 21-11).
export const parcelId = (use, anchor, pt) => 'p' + hash48(`${use}|${anchor[0]}|${anchor[1]}|${Math.round(pt[0] / 10)}|${Math.round(pt[1] / 10)}`);

// Stukken -> percelen (met ID, oppervlakte, ankerpunt, binnenpunt en de hoekpunten voor buren). Geen toegangsklasse: die komt apart.
export function buildParcels(pieces) {
  const { groups, joins } = groupPieces(pieces);
  const out = groups.map((g) => {
    const anchor = anchorOf(g);
    const use = g[0].use;
    const big = g.reduce((a, b) => (polyArea(b.pts) > polyArea(a.pts) ? b : a));
    const pt = surfacePoint(big.pts);
    return { id: parcelId(use, anchor, pt), use, anchor, pt, pieces: g, m2: g.reduce((s, p) => s + polyArea(p.pts), 0) };
  });
  // een vlak dat twee keer in OSM staat (zelfde ID en oppervlakte) telt een keer
  const seen = new Set(), uniq = [];
  for (const p of out) { const k = p.id + ':' + Math.round(p.m2); if (seen.has(k)) continue; seen.add(k); uniq.push(p); }
  return { parcels: uniq, joins, duplicates: out.length - uniq.length };
}

// Samenvoegen onder MIN_HA met de grootste buur van dezelfde soort (gedeeld hoekpunt, niet op een tegelrand). Wat geen buur heeft blijft
// een "perceeltje". Volgorde: klein naar groot, op ID bij gelijke maat, zodat het resultaat deterministisch is. Het ID van de grootste blijft.
export function mergeSmall(parcels, minM2 = MIN_HA * 10000) {
  const vtx = new Map();
  const key = (q) => Math.round(q[0]) + ',' + Math.round(q[1]);
  parcels.forEach((p, n) => { for (const pc of p.pieces) for (const q of pc.pts) { if (onTileX(q[0]) || onTileY(q[1])) continue; const k = key(q); let s = vtx.get(k); if (!s) vtx.set(k, (s = new Set())); s.add(n); } });
  const alive = parcels.map(() => true), into = parcels.map((_, i) => i), m2 = parcels.map((p) => p.m2);
  const root = (i) => { while (into[i] !== i) i = into[i]; return i; };
  const order = parcels.map((_, i) => i).filter((i) => parcels[i].m2 < minM2).sort((a, b) => parcels[a].m2 - parcels[b].m2 || (parcels[a].id < parcels[b].id ? -1 : 1));
  let merged = 0;
  for (const i of order) {
    if (!alive[i]) continue;
    const near = new Set();
    for (const pc of parcels[i].pieces) for (const q of pc.pts) { const s = vtx.get(key(q)); if (s) for (const n of s) { const r = root(n); if (r !== i && alive[r] && parcels[r].use === parcels[i].use) near.add(r); } }
    if (!near.size) continue;
    let best = -1;
    for (const r of near) if (best < 0 || m2[r] > m2[best] || (m2[r] === m2[best] && parcels[r].id < parcels[best].id)) best = r;
    into[i] = best; alive[i] = false; m2[best] += m2[i]; merged++;
    parcels[best].pieces = parcels[best].pieces.concat(parcels[i].pieces);
  }
  const out = [];
  parcels.forEach((p, i) => { if (alive[i]) { p.m2 = m2[i]; out.push(p); } });
  return { parcels: out, merged };
}

// ---- ruimtelijke index voor de toegang ----
const cellKey = (cx, cy) => (cx + 4096) * 8192 + (cy + 4096);
export const mkIndex = () => new Map();
export const addPt = (ix, x, y) => { const k = cellKey(Math.floor(x / CELL), Math.floor(y / CELL)); let a = ix.get(k); if (!a) ix.set(k, (a = [])); a.push(x, y); };
export function nearest(ix, x, y, r) {
  let best = Infinity;
  for (let cx = Math.floor((x - r) / CELL); cx <= Math.floor((x + r) / CELL); cx++) for (let cy = Math.floor((y - r) / CELL); cy <= Math.floor((y + r) / CELL); cy++) {
    const a = ix.get(cellKey(cx, cy));
    if (!a) continue;
    for (let i = 0; i < a.length; i += 2) { const d = Math.hypot(a[i] - x, a[i + 1] - y); if (d < best) best = d; }
  }
  return best <= r ? best : Infinity;
}
export const sampleLine = (pts, step, fn) => {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
    for (let t = 0; t < n; t++) fn(ax + ((bx - ax) * t) / n, ay + ((by - ay) * t) / n);
  }
  const l = pts[pts.length - 1];
  fn(l[0], l[1]);
};

// Toegangsklasse uit de afstand van de rand tot de dichtstbijzijnde autoweg en pad: tot 12 m 'weg' of 'pad', tot 60 m 'nabij', anders 'geen'.
export const accessClass = (wegD, padD) => (wegD <= 12 ? 'weg' : padD <= 12 ? 'pad' : wegD <= 60 ? 'wegNabij' : padD <= 60 ? 'padNabij' : 'geen');

// Gewone woningen horen niet in de pand-index (die staan als OSM-id in de tegel): de rest wel.
const RESIDENTIAL = new Set(['yes', 'house', 'detached', 'semidetached_house', 'terrace', 'residential', 'apartments', 'bungalow', 'dormitory', 'farm', 'hut', 'cabin', 'static_caravan', 'houseboat', 'garage', 'garages', 'shed', 'roof', 'carport', 'greenhouse', 'barn', 'stable', 'cowshed', 'farm_auxiliary', 'service', '?']);
export const isBusinessType = (t) => !RESIDENTIAL.has(String(t || '?'));

// ---- de wereld lezen ----
export function readWorld(worldDir) {
  const index = JSON.parse(fs.readFileSync(path.join(worldDir, 'index-provincie.json'), 'utf8'));
  const fds = new Map();
  const roadCar = mkIndex(), roadPad = mkIndex();
  const pieces = [], buildings = [];
  let tiles = 0;
  for (const [key, t] of Object.entries(index.tiles)) {
    const f = index.packs[t.pack].file;
    if (!fds.has(f)) fds.set(f, fs.openSync(path.join(worldDir, f), 'r'));
    const buf = Buffer.alloc(t.len);
    fs.readSync(fds.get(f), buf, 0, t.len, t.off);
    const blob = G.decodeBlob(new Uint8Array(zlib.inflateRawSync(buf)));
    tiles++;
    for (const s of blob.sections) {
      if (s.type === G.SECTION.PARCELS) {
        for (const r of s.rows) if (r.pts && r.pts.length >= 4 && USE_TO_KIND[r.use] !== undefined) pieces.push({ tile: key, use: r.use, pts: r.pts });
      } else if (s.type === G.SECTION.ROADS) {
        for (const r of s.rows) {
          if (!r.pts || r.pts.length < 2 || r.bridge || r.tunnel) continue;
          const ix = r.cat === 'major' || r.cat === 'normal' || r.cat === 'minor' ? roadCar : r.cat === 'cycle' || r.cat === 'foot' ? roadPad : null;
          if (ix) sampleLine(r.pts, 10, (x, y) => addPt(ix, x, y));
        }
      } else if (s.type === G.SECTION.BUILDINGS) {
        for (const r of s.rows) {
          if (!r.pts || r.pts.length < 3 || !r.osm || !isBusinessType(r.type)) continue;
          let mx = 0, my = 0;
          for (const p of r.pts) { mx += p[0]; my += p[1]; }
          buildings.push({ osm: r.osm, x: Math.round(mx / r.pts.length), y: Math.round(my / r.pts.length), m2: Math.round(polyArea(r.pts)), type: r.type || '?', h: r.h || 0, landmark: r.landmark ? 1 : 0 });
        }
      }
    }
  }
  for (const fd of fds.values()) fs.closeSync(fd);
  return { pieces, roadCar, roadPad, buildings, tiles };
}

export function accessOf(p, roadCar, roadPad) {
  let wegD = Infinity, padD = Infinity;
  for (const pc of p.pieces) sampleLine(pc.pts, 25, (x, y) => {
    if (onTileX(x) || onTileY(y)) return;
    wegD = Math.min(wegD, nearest(roadCar, x, y, 60));
    padD = Math.min(padD, nearest(roadPad, x, y, 60));
  });
  return accessClass(wegD, padD);
}

// Het indexbestand: rijen [id, x, y, ha100 (0,01 ha), soort, toegang, ankerx, ankery].
export function parcelRows(parcels) {
  return parcels.map((p) => [p.id, p.pt[0], p.pt[1], Math.max(1, Math.round(p.m2 / 100)), USE_TO_KIND[p.use], ACCESS.indexOf(p.access || 'geen'), p.anchor[0], p.anchor[1]]);
}

// ---- de getekende grenslijn (#1100): een vereenvoudigde omtrek per perceel, apart en lui geladen ----
// Rijen [id, [dx1, dy1, dx2, dy2, ...]]: de omtrek van het grootste stuk (buitenste ring, geen gaten) met Douglas-Peucker (SHAPE_TOLERANCE m), op SHAPE_STEP m
// afgerond. Het eerste punt is relatief aan het binnenpunt van het perceel, elk volgend punt relatief aan het vorige (delta). Hoogstens SHAPE_MAX_POINTS punten:
// past het niet, dan wordt de tolerantie stapsgewijs groter. Een perceel dat over een tegelrand loopt heeft hier de vorm van zijn grootste stuk (de index kent
// het perceel als geheel, de tegel levert de rest). Percelen onder SHAPE_MIN_HA krijgen geen vorm: de schets blijft.
export const SHAPE_FILE = 'bezit-vormen.json';
export const SHAPE_VERSION = 1;
export const SHAPE_STEP = 5;
export const SHAPE_TOLERANCE = 8;
export const SHAPE_MAX_POINTS = 24;
export const SHAPE_MIN_HA = 0;

const segDist = (p, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
};
// Douglas-Peucker op een open lijn: houdt de eindpunten; geeft de indices.
function dpKeep(pts, tol) {
  const keep = new Uint8Array(pts.length);
  keep[0] = 1; keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let bi = -1, bd = tol;
    for (let i = a + 1; i < b; i++) { const d = segDist(pts[i], pts[a], pts[b]); if (d > bd) { bd = d; bi = i; } }
    if (bi >= 0) { keep[bi] = 1; stack.push([a, bi], [bi, b]); }
  }
  return keep;
}
// Een gesloten ring (zonder herhaald slotpunt) vereenvoudigen: splitsen bij het punt dat het verst van het eerste ligt.
export function simplifyRing(ring, tol) {
  const n = ring.length;
  if (n <= 3) return ring.slice();
  let far = 1, fd = -1;
  for (let i = 1; i < n; i++) { const d = Math.hypot(ring[i][0] - ring[0][0], ring[i][1] - ring[0][1]); if (d > fd) { fd = d; far = i; } }
  const a = ring.slice(0, far + 1), b = ring.slice(far).concat([ring[0]]);
  const ka = dpKeep(a, tol), kb = dpKeep(b, tol);
  const out = [];
  a.forEach((p, i) => { if (ka[i]) out.push(p); });
  b.forEach((p, i) => { if (kb[i] && i > 0 && i < b.length - 1) out.push(p); });
  return out;
}
// De omtrek van een perceel als delta's: [dx0, dy0, dx1, dy1, ...] in eenheden van SHAPE_STEP m, of null als er geen bruikbare vorm uit komt.
export function shapeDeltas(p, tolerance = SHAPE_TOLERANCE) {
  if (!p.pieces || !p.pieces.length) return null;
  const big = p.pieces.reduce((a, b) => (polyArea(b.pts) > polyArea(a.pts) ? b : a));
  let ring = big.pts.map((q) => [q[0], q[1]]);
  if (ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]) ring.pop();
  if (ring.length < 3) return null;
  for (let tol = tolerance; tol <= 200; tol = Math.ceil(tol * 1.5)) {
    const q = [];
    for (const r of simplifyRing(ring, tol)) {
      const c = [Math.round((r[0] - p.pt[0]) / SHAPE_STEP), Math.round((r[1] - p.pt[1]) / SHAPE_STEP)];
      const l = q[q.length - 1];
      if (!l || l[0] !== c[0] || l[1] !== c[1]) q.push(c);
    }
    while (q.length > 1 && q[0][0] === q[q.length - 1][0] && q[0][1] === q[q.length - 1][1]) q.pop();
    if (q.length < 3) return null;
    if (q.length > SHAPE_MAX_POINTS) continue;
    let area = 0;
    for (let i = 0, j = q.length - 1; i < q.length; j = i++) area += q[j][0] * q[i][1] - q[i][0] * q[j][1];
    if (area === 0) return null;
    const flat = [];
    let px = 0, py = 0;
    for (const c of q) { flat.push(c[0] - px, c[1] - py); px = c[0]; py = c[1]; }
    return flat;
  }
  return null;
}
export function shapeRows(parcels, { minHa = SHAPE_MIN_HA, tolerance = SHAPE_TOLERANCE } = {}) {
  const rows = [];
  for (const p of parcels) {
    if (p.m2 < minHa * 10000) continue;
    const s = shapeDeltas(p, tolerance);
    if (s) rows.push([p.id, s]);
  }
  rows.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return rows;
}

export function buildBezitIndex(worldDir) {
  const w = readWorld(worldDir);
  const built = buildParcels(w.pieces);
  const m = mergeSmall(built.parcels);
  for (const p of m.parcels) p.access = accessOf(p, w.roadCar, w.roadPad);
  m.parcels.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const types = [...new Set(w.buildings.map((b) => b.type))].sort();
  // de woonplaatsen voor de namen en de klantenpot (alleen dorpen, steden en gehuchten, met de plek): [naam, x, y]
  const idx = JSON.parse(fs.readFileSync(path.join(worldDir, 'index-provincie.json'), 'utf8'));
  const places = ((idx.global && idx.global.places) || []).filter((p) => ['hamlet', 'village', 'town', 'city'].includes(p.kind) && p.name).map((p) => [p.name, Math.round(p.x), Math.round(p.y)]);
  const bs = w.buildings.sort((a, b) => a.osm - b.osm);
  return {
    percelen: { v: BEZIT_INDEX_VERSION, kinds: KINDS, access: ACCESS, places, rows: parcelRows(m.parcels), stats: { pieces: w.pieces.length, joins: built.joins, duplicates: built.duplicates, merged: m.merged, tiles: w.tiles } },
    panden: { v: BEZIT_INDEX_VERSION, types, rows: bs.map((b) => [b.osm, b.x, b.y, b.m2, types.indexOf(b.type), b.h, b.landmark]) },
    vormen: { v: SHAPE_VERSION, step: SHAPE_STEP, tol: SHAPE_TOLERANCE, rows: shapeRows(m.parcels) },
  };
}

export function writeBezitIndex(out, worldDir = out) {
  const r = buildBezitIndex(worldDir);
  fs.writeFileSync(path.join(out, PARCEL_FILE), JSON.stringify(r.percelen));
  fs.writeFileSync(path.join(out, BUILDING_FILE), JSON.stringify(r.panden));
  fs.writeFileSync(path.join(out, SHAPE_FILE), JSON.stringify(r.vormen));
  return r;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const world = path.resolve(arg('--world', path.join(ROOT, 'game/world')));
  const out = path.resolve(arg('--out', world));
  const t0 = Date.now();
  const r = writeBezitIndex(out, world);
  if (!process.argv.includes('--quiet')) {
    const gz = (o) => zlib.gzipSync(JSON.stringify(o)).length;
    console.log(`bezit-index: ${r.percelen.rows.length} percelen (${JSON.stringify(r.percelen.stats)}), ${r.panden.rows.length} bedrijfspanden; ${Math.round(gz(r.percelen) / 1024)} KB + ${Math.round(gz(r.panden) / 1024)} KB gzip; ${r.vormen.rows.length} vormen ${Math.round(JSON.stringify(r.vormen).length / 1024)} KB (${Math.round(gz(r.vormen) / 1024)} KB gzip); ${Date.now() - t0} ms`);
  }
}
