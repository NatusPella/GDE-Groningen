// Percelen-audit (boerderij-provincie, plan 21-11): wat de provincietegels aan landgebruikvlakken (PARCELS: weide, akker,
// boomgaard) hebben en of die als koopbare percelen voor de boerderij kunnen dienen. Alleen lezen: schrijft niets (behalve
// met --json), start geen spel. Meet:
//  - het aantal stukken in de tegels en het aantal echte percelen na het aaneenrijgen over tegelranden (de tegels knippen elk
//    vlak op de kilometerlijn: een stuk is dus niet een perceel);
//  - de verdeling van de oppervlakte (ha), per soort, per gemeente (echte grenzen, game/grenzen.json) en per streek;
//  - bereikbaarheid (een autoweg of pad aan de rand), en wat het perceel raakt of doorsnijdt (water, spoor, gebouw, weg);
//  - een stabiel ID (hash van soort, laagste hoekpunt en een binnenpunt op 10 m, nooit het gid van de bouwer) en of het tussen twee runs gelijk blijft;
//  - te kleine en te grote percelen, buren, en de datagrootte (tegel, indexbestand, savegame, netwerk).
//
//   node scripts/world/percelen_audit.mjs [--world <map met index-provincie.json>] [--json <bestand>] [--quiet]
//
// De wereldmap is niet in git (game/world wordt bij het bouwen gemaakt): geef een bestaande bouw mee met --world.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const G = await import('../../game/js/gdt.js');
const { ontvouw, gebiedIn } = await import('../../game/js/grenzen.js');
const { streekAt } = await import('../../game/js/regioleven.js');

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const WORLD = path.resolve(arg('--world', path.join(ROOT, 'game/world')));
const JSON_OUT = arg('--json', '');
const QUIET = process.argv.includes('--quiet');

// ---- kleine hulpen ----
const CELL = 100;
const cellKey = (cx, cy) => (cx + 4096) * 8192 + (cy + 4096);
const mkIndex = () => new Map();
const addPt = (ix, x, y) => {
  const k = cellKey(Math.floor(x / CELL), Math.floor(y / CELL));
  let a = ix.get(k);
  if (!a) ix.set(k, (a = []));
  a.push(x, y);
};
// dichtstbijzijnde punt binnen r meter (Infinity als er geen is)
const nearest = (ix, x, y, r) => {
  let best = Infinity;
  const c0 = Math.floor((x - r) / CELL), c1 = Math.floor((x + r) / CELL), d0 = Math.floor((y - r) / CELL), d1 = Math.floor((y + r) / CELL);
  for (let cx = c0; cx <= c1; cx++) for (let cy = d0; cy <= d1; cy++) {
    const a = ix.get(cellKey(cx, cy));
    if (!a) continue;
    for (let i = 0; i < a.length; i += 2) { const d = Math.hypot(a[i] - x, a[i + 1] - y); if (d < best) best = d; }
  }
  return best <= r ? best : Infinity;
};
const sampleLine = (pts, step, fn) => {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
    for (let t = 0; t < n; t++) fn(ax + ((bx - ax) * t) / n, ay + ((by - ay) * t) / n);
  }
  const l = pts[pts.length - 1];
  fn(l[0], l[1]);
};
const inPoly = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < ((P[j][0] - P[i][0]) * (y - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
const segDist = (x, y, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
  return Math.hypot(ax + dx * t - x, ay + dy * t - y);
};
const ringDist = (x, y, P) => { let d = Infinity; for (let i = 0; i < P.length - 1; i++) d = Math.min(d, segDist(x, y, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1])); return d; };
const area = (P) => { let s = 0; for (let i = 0, j = P.length - 1; i < P.length; j = i++) s += (P[j][0] + P[i][0]) * (P[j][1] - P[i][1]); return Math.abs(s) / 2; };
const boundsOf = (P) => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const p of P) { if (p[0] < a) a = p[0]; if (p[0] > c) c = p[0]; if (p[1] < b) b = p[1]; if (p[1] > d) d = p[1]; } return [a, b, c, d]; };
const TL = 0.06;
const offLine = (v, o) => { const m = (((v - o) % 1000) + 1000) % 1000; return Math.min(m, 1000 - m); };
const onTileX = (x) => offLine(x, G.GRID_X0) < TL;
const onTileY = (y) => offLine(y, G.GRID_Y0) < TL;
const enc = new TextEncoder();
const h48 = (s) => G.hash64(enc.encode(s)).slice(0, 12);
const h32 = (s) => G.xxh32(enc.encode(s), 0).toString(16).padStart(8, '0');
const pct = (n, d) => (d ? Math.round((1000 * n) / d) / 10 : 0);
const ha1 = (m2) => Math.round(m2 / 100) / 100;

// ---- 1. de tegels lezen ----
const index = JSON.parse(fs.readFileSync(path.join(WORLD, 'index-provincie.json'), 'utf8'));
const grenzen = ontvouw(JSON.parse(fs.readFileSync(path.join(ROOT, 'game/grenzen.json'), 'utf8')));
const fds = new Map();
const roadCar = mkIndex(), roadPad = mkIndex(), railIx = mkIndex(), waterIx = mkIndex(), bldIx = mkIndex();
const pieces = [];
const bld = [];
const bytes = { tilesRaw: 0, tilesPacked: 0, parcelsRaw: 0, parcelRows: 0 };
let tileCount = 0;
for (const [key, t] of Object.entries(index.tiles)) {
  const f = index.packs[t.pack].file;
  if (!fds.has(f)) fds.set(f, fs.openSync(path.join(WORLD, f), 'r'));
  const buf = Buffer.alloc(t.len);
  fs.readSync(fds.get(f), buf, 0, t.len, t.off);
  const raw = new Uint8Array(zlib.inflateRawSync(buf));
  const head = G.blobHeader(raw);
  bytes.tilesRaw += raw.length; bytes.tilesPacked += t.len;
  for (const s of head.sections) if (s.type === G.SECTION.PARCELS) bytes.parcelsRaw += s.length;
  const blob = G.decodeBlob(raw);
  tileCount++;
  for (const s of blob.sections) {
    if (s.type === G.SECTION.PARCELS) {
      for (const r of s.rows) {
        if (!r.pts || r.pts.length < 4 || !r.use) continue;
        pieces.push({ tile: key, gid: r.gid, use: r.use, pts: r.pts });
        bytes.parcelRows++;
      }
    } else if (s.type === G.SECTION.ROADS) {
      for (const r of s.rows) {
        if (!r.pts || r.pts.length < 2 || r.bridge || r.tunnel) continue;
        const cat = r.cat;
        const ix = cat === 'major' || cat === 'normal' || cat === 'minor' ? roadCar : cat === 'cycle' || cat === 'foot' ? roadPad : null;
        if (ix) sampleLine(r.pts, 10, (x, y) => addPt(ix, x, y));
      }
    } else if (s.type === G.SECTION.RAILS) {
      for (const r of s.rows) if (r.pts && r.pts.length > 1) sampleLine(r.pts, 10, (x, y) => addPt(railIx, x, y));
    } else if (s.type === G.SECTION.WATER) {
      for (const r of s.rows) if (r.pts && r.pts.length > 1) sampleLine(r.pts, 10, (x, y) => addPt(waterIx, x, y));
    } else if (s.type === G.SECTION.BUILDINGS) {
      for (const r of s.rows) {
        if (!r.pts || r.pts.length < 3) continue;
        let mx = 0, my = 0;
        for (const p of r.pts) { mx += p[0]; my += p[1]; addPt(bldIx, p[0], p[1]); }
        addPt(bldIx, mx / r.pts.length, my / r.pts.length);
        // panden voor de Bedrijven-tak: soort, naam, OSM-id (stabiel tussen builds), kenmerken en de ligging
        bld.push({ x: mx / r.pts.length, y: my / r.pts.length, type: r.type || '?', named: !!r.name, osm: r.osm !== undefined && r.osm !== null && r.osm !== 0, landmark: !!r.landmark, m2: area(r.pts), h: r.h || 0 });
      }
    }
  }
}
for (const fd of fds.values()) fs.closeSync(fd);

// ---- 2. stukken aaneenrijgen tot percelen (de tegels knippen op de kilometerlijn) ----
// Een stuk dat langs een tegelrand loopt, hoort bij het stuk van dezelfde soort aan de overkant dat een deel van die rand deelt.
// Eén functie, zodat de test op determinisme hem met omgekeerde volgorde nog eens kan draaien.
function groupPieces(list) {
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

// Het stabiele ID: soort, het laagste hoekpunt van de hele groep dat niet op een tegelrand ligt (op 1 m) en een binnenpunt (op 10 m:
// buurpercelen delen soms het laagste hoekpunt). Niets uit de
// bouwvolgorde (gid) of de tegelindeling; wel de OSM-vorm. Een andere OSM-opname kan het hoekpunt verschuiven: de opslag bewaart
// daarom ook het ankerpunt (zie ontwerp, herkoppelen).
function anchorOf(g) {
  let best = null, edge = null;
  for (const p of g) for (const q of p.pts) {
    const x = Math.round(q[0]), y = Math.round(q[1]);
    const better = (c) => !c || y < c[1] || (y === c[1] && x < c[0]);
    if (onTileX(q[0]) || onTileY(q[1])) { if (better(edge)) edge = [x, y]; } else if (better(best)) best = [x, y];
  }
  return best || edge;
}
// een punt binnen het grootste stuk: de langste snede van een scanlijn op de halve hoogte
function surfacePoint(P) {
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

function build(list) {
  const { groups, joins } = groupPieces(list);
  const out = groups.map((g) => {
    const anchor = anchorOf(g);
    const use = g[0].use;
    const big = g.reduce((a, b) => (area(b.pts) > area(a.pts) ? b : a));
    const sp = surfacePoint(big.pts);
    const key = `${use}|${anchor[0]}|${anchor[1]}|${Math.round(sp[0] / 10)}|${Math.round(sp[1] / 10)}`;
    const id = 'p' + h48(key);
    return { id, id32: h32(key), use, anchor, pt: sp, pieces: g, m2: g.reduce((s, p) => s + area(p.pts), 0), tiles: new Set(g.map((p) => p.tile)).size };
  });
  // een vlak dat twee keer in OSM staat (zelfde ID en zelfde oppervlakte) telt een keer
  const seen = new Set(), uniq = [];
  for (const p of out) { const k = p.id + ':' + Math.round(p.m2); if (seen.has(k)) continue; seen.add(k); uniq.push(p); }
  return { out: uniq, joins, dubbel: out.length - uniq.length };
}

const A = build(pieces);
const B = build([...pieces].reverse());
const parcels = A.out;

// ---- 3. stabiliteit en botsingen van het ID ----
const idMap = new Map();
let dupIds = 0;
for (const p of parcels) { if (idMap.has(p.id)) dupIds++; idMap.set(p.id, p); }
const dup32 = parcels.length - new Set(parcels.map((p) => p.id32)).size;
const sigA = parcels.map((p) => p.id + ':' + Math.round(p.m2)).sort().join(',');
const sigB = B.out.map((p) => p.id + ':' + Math.round(p.m2)).sort().join(',');
const deterministic = sigA === sigB;

// ---- 4. wat raakt het perceel ----
const sampleBoundary = (p) => {
  const pts = [];
  for (const pc of p.pieces) sampleLine(pc.pts, 25, (x, y) => { if (!onTileX(x) && !onTileY(y)) pts.push([x, y]); });
  return pts;
};
const touches = { weg: 0, pad: 0, wegNabij: 0, padNabij: 0, geen: 0, water: 0, spoor: 0, gebouw: 0 };
const cross = { water: 0, spoor: 0, gebouw: 0, weg: 0 };
const anyInside = (ix, p, margin) => {
  for (const pc of p.pieces) {
    const [x0, y0, x1, y1] = boundsOf(pc.pts);
    for (let cx = Math.floor(x0 / CELL); cx <= Math.floor(x1 / CELL); cx++) for (let cy = Math.floor(y0 / CELL); cy <= Math.floor(y1 / CELL); cy++) {
      const a = ix.get(cellKey(cx, cy));
      if (!a) continue;
      for (let i = 0; i < a.length; i += 2) {
        const x = a[i], y = a[i + 1];
        if (x < x0 || x > x1 || y < y0 || y > y1) continue;
        if (inPoly(x, y, pc.pts) && ringDist(x, y, pc.pts) > margin) return true;
      }
    }
  }
  return false;
};
for (const p of parcels) {
  const B2 = sampleBoundary(p);
  let wegD = Infinity, padD = Infinity, wD = Infinity, rD = Infinity, bD = Infinity;
  for (const [x, y] of B2) {
    wegD = Math.min(wegD, nearest(roadCar, x, y, 60));
    padD = Math.min(padD, nearest(roadPad, x, y, 60));
    wD = Math.min(wD, nearest(waterIx, x, y, 6));
    rD = Math.min(rD, nearest(railIx, x, y, 10));
    bD = Math.min(bD, nearest(bldIx, x, y, 8));
  }
  p.weg = wegD; p.pad = padD;
  p.raaktWater = wD < Infinity; p.raaktSpoor = rD < Infinity; p.raaktGebouw = bD < Infinity;
  p.doorWater = anyInside(waterIx, p, 6); p.doorSpoor = anyInside(railIx, p, 6); p.doorGebouw = anyInside(bldIx, p, 3); p.doorWeg = anyInside(roadCar, p, 8);
  p.klasse = wegD <= 12 ? 'weg' : padD <= 12 ? 'pad' : wegD <= 60 ? 'wegNabij' : padD <= 60 ? 'padNabij' : 'geen';
  touches[p.klasse]++;
  if (p.raaktWater) touches.water++;
  if (p.raaktSpoor) touches.spoor++;
  if (p.raaktGebouw) touches.gebouw++;
  if (p.doorWater) cross.water++;
  if (p.doorSpoor) cross.spoor++;
  if (p.doorGebouw) cross.gebouw++;
  if (p.doorWeg) cross.weg++;
  const g = grenzen ? gebiedIn(grenzen.gemeenten, p.pt[0], p.pt[1]) : null;
  p.gemeente = g ? g.naam : 'buiten de provincie';
  const st = streekAt(p.pt[0], p.pt[1]);
  p.streek = st ? st.name : 'overig';
}

// overlap tussen percelen (een punt van het ene ligt in het andere), en buren (gedeeld hoekpunt)
const pieceIx = new Map();
parcels.forEach((p, n) => { for (const pc of p.pieces) { const b = boundsOf(pc.pts); for (let cx = Math.floor(b[0] / 500); cx <= Math.floor(b[2] / 500); cx++) for (let cy = Math.floor(b[1] / 500); cy <= Math.floor(b[3] / 500); cy++) { const k = cellKey(cx, cy); (pieceIx.get(k) || pieceIx.set(k, []).get(k)).push({ n, pts: pc.pts, b }); } } });
let overlap = 0;
parcels.forEach((p, n) => {
  const [x, y] = p.pt;
  const c = pieceIx.get(cellKey(Math.floor(x / 500), Math.floor(y / 500))) || [];
  if (c.some((q) => q.n !== n && x >= q.b[0] && x <= q.b[2] && y >= q.b[1] && y <= q.b[3] && inPoly(x, y, q.pts))) { overlap++; p.overlapt = true; }
});
const vtx = new Map();
parcels.forEach((p, n) => { for (const pc of p.pieces) for (const q of pc.pts) { if (onTileX(q[0]) || onTileY(q[1])) continue; const k = Math.round(q[0]) + ',' + Math.round(q[1]); let s = vtx.get(k); if (!s) vtx.set(k, (s = new Set())); s.add(n); } });
const buren = parcels.map(() => new Set());
for (const s of vtx.values()) if (s.size > 1) for (const a of s) for (const b of s) if (a !== b) buren[a].add(b);
parcels.forEach((p, n) => { p.buren = buren[n].size; p.burenZelfde = [...buren[n]].filter((m) => parcels[m].use === p.use).length; });

// ---- 5. tellen ----
const KL = [['< 0,2 ha', 0, 2000], ['0,2 tot 0,5', 2000, 5000], ['0,5 tot 1', 5000, 10000], ['1 tot 2', 10000, 20000], ['2 tot 5', 20000, 50000], ['5 tot 10', 50000, 100000], ['10 tot 20', 100000, 200000], ['20 tot 50', 200000, 500000], ['>= 50 ha', 500000, Infinity]];
const hist = (list) => KL.map(([n, lo, hi]) => { const m = list.filter((p) => p.m2 >= lo && p.m2 < hi); return { klasse: n, n: m.length, ha: ha1(m.reduce((s, p) => s + p.m2, 0)) }; });
const sum = (list) => ({ n: list.length, ha: ha1(list.reduce((s, p) => s + p.m2, 0)) });
const by = (list, f) => { const m = new Map(); for (const p of list) { const k = f(p); (m.get(k) || m.set(k, []).get(k)).push(p); } return m; };
const inProv = parcels.filter((p) => p.gemeente !== 'buiten de provincie');
const reach = (l) => l.filter((p) => p.klasse === 'weg' || p.klasse === 'pad');
const sorted = [...parcels].sort((a, b) => a.m2 - b.m2);
const q = (f) => sorted[Math.min(sorted.length - 1, Math.floor(f * sorted.length))].m2;

// koopprijs zoals percelen.js ze nu rekent: weiland 1.500 per ha, akker 2.300 per ha (boomgaard als akker)
const PRIJS_HA = { weide: 1500, akker: 2300, boomgaard: 2300 };
const prijsLos = parcels.reduce((s, p) => s + (p.m2 / 10000) * PRIJS_HA[p.use], 0);

// grootte van de data
const idx = parcels.map((p) => [p.id, p.pt[0], p.pt[1], Math.round(p.m2 / 100), p.use === 'weide' ? 0 : p.use === 'akker' ? 1 : 2, ['weg', 'pad', 'wegNabij', 'padNabij', 'geen'].indexOf(p.klasse)]);
const idxJson = Buffer.from(JSON.stringify(idx));
const idxGz = zlib.gzipSync(idxJson).length;
const vertTotal = pieces.reduce((s, p) => s + p.pts.length, 0);

const per = (m, f) => [...m.entries()].map(([k, l]) => ({ naam: k, ...sum(l), bereikbaar: pct(reach(l).length, l.length), mediaanHa: ha1(l.map((p) => p.m2).sort((a, b) => a - b)[Math.floor(l.length / 2)]) })).sort((a, b) => b.ha - a.ha);
const rep = {
  wereld: WORLD, tegels: tileCount,
  stukken: { n: pieces.length, hoekpunten: vertTotal, aaneengeregen: A.joins },
  percelen: { ...sum(parcels), buitenProvincie: sum(parcels.filter((p) => p.gemeente === 'buiten de provincie')), binnenProvincie: sum(inProv), meerdereTegels: parcels.filter((p) => p.tiles > 1).length },
  perSoort: Object.fromEntries([...by(parcels, (p) => p.use)].map(([k, l]) => [k, { ...sum(l), mediaanHa: ha1(l.map((p) => p.m2).sort((a, b) => a - b)[Math.floor(l.length / 2)]) }])),
  verdeling: hist(parcels),
  kwantielenHa: { p10: ha1(q(0.1)), p25: ha1(q(0.25)), p50: ha1(q(0.5)), p75: ha1(q(0.75)), p90: ha1(q(0.9)), p99: ha1(q(0.99)), max: ha1(sorted[sorted.length - 1].m2) },
  perGemeente: per(by(inProv, (p) => p.gemeente)),
  perStreek: per(by(inProv, (p) => p.streek)),
  bereikbaar: { ...touches, bereikbaarN: reach(parcels).length, bereikbaarPct: pct(reach(parcels).length, parcels.length), bereikbaarHa: sum(reach(parcels)).ha, autoweg: parcels.filter((p) => p.klasse === 'weg').length },
  raakt: { water: touches.water, spoor: touches.spoor, gebouw: touches.gebouw }, doorsneden: cross,
  buren: { geenBuur: parcels.filter((p) => !p.buren).length, mediaan: [...parcels].map((p) => p.buren).sort((a, b) => a - b)[Math.floor(parcels.length / 2)], metZelfdeSoortBuur: parcels.filter((p) => p.burenZelfde).length },
  klein: { onder05: parcels.filter((p) => p.m2 < 5000).length, onder1: parcels.filter((p) => p.m2 < 10000).length, onder05MetBuur: parcels.filter((p) => p.m2 < 5000 && p.buren).length, onder05MetZelfdeBuur: parcels.filter((p) => p.m2 < 5000 && p.burenZelfde).length },
  groot: { boven20: parcels.filter((p) => p.m2 >= 200000).length, boven50: parcels.filter((p) => p.m2 >= 500000).length, boven20Ha: ha1(parcels.filter((p) => p.m2 >= 200000).reduce((s, p) => s + p.m2, 0)) },
  overlapMetAnder: overlap,
  id: { dubbeleVlakken: A.dubbel, duplicaten48: dupIds, duplicaten32: dup32, deterministisch: deterministic, lengte: 'p + 12 hex (48 bit)' },
  prijs: { totaalEuroHuidigeTarieven: Math.round(prijsLos), perPercelMediaan: Math.round((q(0.5) / 10000) * 1800) },
  data: { tegelsRawMB: Math.round(bytes.tilesRaw / 1e5) / 10, tegelsPackedMB: Math.round(bytes.tilesPacked / 1e5) / 10, perceelsectieRawKB: Math.round(bytes.parcelsRaw / 100) / 10, perceelsectieBytesPerStuk: Math.round(bytes.parcelsRaw / Math.max(1, bytes.parcelRows)), bytesPerHoekpunt: Math.round((bytes.parcelsRaw / Math.max(1, vertTotal)) * 10) / 10, gemHoekpuntenPerStuk: Math.round((vertTotal / pieces.length) * 10) / 10, indexJsonKB: Math.round(idxJson.length / 100) / 10, indexGzipKB: Math.round(idxGz / 100) / 10, indexBytesPerPerceel: Math.round(idxJson.length / parcels.length), saveBytesPerPerceelJson: 0 },
};
// een opgeslagen perceel van de speler: [id, fase-teller, gewas, zaaitijd, bodemlog] als JSON
const sampleSave = parcels.slice(0, 200).map((p) => [p.id, 3, 'aardappel', 123456, 0.12]);
rep.data.saveBytesPerPerceelJson = Math.round(JSON.stringify(sampleSave).length / sampleSave.length);

// ---- 5b. prijsvoorstel (docs/BOERDERIJ-PROVINCIE-21-11.md, hoofdstuk Prijsmodel): getallen om mee te rekenen, geen spelcode ----
const STREEK_F = { Hogeland: 1.15, Hunsingo: 1.15, Oldambt: 1.15, Eemsdelta: 1.1, Lauwerskust: 1.0, Westerkwartier: 0.9, 'Veenkoloniën': 0.85, Westerwolde: 0.8, overig: 1.0 };
const STREEK_BODEM = { Hogeland: 0.85, Hunsingo: 0.85, Oldambt: 0.9, Eemsdelta: 0.8, Lauwerskust: 0.7, Westerkwartier: 0.55, 'Veenkoloniën': 0.5, Westerwolde: 0.45, overig: 0.6 };
const LIGGING_F = { weg: 1, pad: 0.92, wegNabij: 0.85, padNabij: 0.78 };
const GROND = { weide: 1500, akker: 2300, boomgaard: 3200 };
const MIN_PRIJS = 1200;
const prijsVan = (p) => {
  if (p.klasse === 'geen') return 0;
  const ha = p.m2 / 10000;
  const jit = (parseInt(p.id.slice(1, 5), 16) / 65535 - 0.5) * 0.2;
  const bodem = Math.max(0.2, Math.min(1, (STREEK_BODEM[p.streek] ?? 0.6) + jit));
  const maat = ha <= 5 ? 1 : ha <= 20 ? 0.95 : 0.85;
  return Math.max(MIN_PRIJS, Math.round((ha * GROND[p.use] * (STREEK_F[p.streek] ?? 1) * (0.7 + 0.6 * bodem) * LIGGING_F[p.klasse] * maat) / 50) * 50);
};
const koopbaar = parcels.filter((p) => p.klasse !== 'geen');
const prijzen = koopbaar.map(prijsVan).sort((a, b) => a - b);
const qp = (f) => prijzen[Math.min(prijzen.length - 1, Math.floor(f * prijzen.length))];
const NETTO_PER_UUR = 1100; // economie_sim_test: netto ongeveer 1.100 euro per uur
rep.prijsVoorstel = {
  koopbaar: koopbaar.length, nietKoopbaar: parcels.length - koopbaar.length,
  totaalEuro: prijzen.reduce((s, v) => s + v, 0), goedkoopste: prijzen[0], p10: qp(0.1), p25: qp(0.25), mediaan: qp(0.5), p75: qp(0.75), p90: qp(0.9), p99: qp(0.99), duurste: prijzen[prijzen.length - 1],
  uurNettoVoorMediaan: Math.round((qp(0.5) / NETTO_PER_UUR) * 10) / 10, uurNettoVoorP10: Math.round((qp(0.1) / NETTO_PER_UUR) * 10) / 10,
  aantalTot2400: prijzen.filter((v) => v <= 2400).length, aantalTot10000: prijzen.filter((v) => v <= 10000).length,
  perUse: Object.fromEntries(['weide', 'akker', 'boomgaard'].map((u) => { const l = koopbaar.filter((p) => p.use === u).map(prijsVan).sort((a, b) => a - b); return [u, { n: l.length, mediaan: l[Math.floor(l.length / 2)], totaal: l.reduce((s, v) => s + v, 0) }]; })),
};
if (!QUIET) console.log('\n== Prijsvoorstel (zie ontwerpdoc) =='), console.log(' ', JSON.stringify(rep.prijsVoorstel));

// ---- 6. panden (Bedrijven-tak): wat er te koop zou kunnen zijn ----
const CAT = {
  woning: ['house', 'residential', 'apartments', 'detached', 'terrace', 'semidetached_house', 'bungalow', 'dormer', 'houseboat', 'static_caravan', 'dwelling', 'duplex', 'yes_house'],
  landbouw: ['farm', 'barn', 'farm_auxiliary', 'stable', 'greenhouse', 'silo', 'cowshed', 'sty', 'livestock'],
  handel: ['retail', 'commercial', 'supermarket', 'kiosk', 'shop', 'office', 'hotel', 'restaurant', 'cafe', 'pub'],
  industrie: ['industrial', 'warehouse', 'factory', 'manufacture', 'service', 'storage_tank'],
  openbaar: ['school', 'university', 'college', 'kindergarten', 'hospital', 'church', 'chapel', 'cathedral', 'civic', 'government', 'public', 'fire_station', 'police', 'train_station', 'transportation', 'museum', 'theatre', 'stadium', 'sports_hall', 'sports_centre', 'prison', 'townhall', 'mosque', 'synagogue', 'monastery', 'library'],
  bijgebouw: ['garage', 'garages', 'shed', 'roof', 'carport', 'outbuilding', 'hut', 'cabin', 'container', 'parking', 'allotment_house', 'boathouse', 'ruins'],
};
const catOf = (t) => { for (const [k, l] of Object.entries(CAT)) if (l.includes(t)) return k; return t === 'yes' ? 'onbepaald' : 'overig'; };
const types = {}, cats = {}, catM2 = {}, gemBld = {};
for (const b of bld) {
  types[b.type] = (types[b.type] || 0) + 1;
  const c = catOf(b.type);
  cats[c] = (cats[c] || 0) + 1; catM2[c] = (catM2[c] || 0) + b.m2;
}
const gem = (x, y) => { const g = grenzen ? gebiedIn(grenzen.gemeenten, x, y) : null; return g ? g.naam : 'buiten de provincie'; };
for (const b of bld) { const g = gem(b.x, b.y); b.gem = g; (gemBld[g] || (gemBld[g] = { n: 0, woning: 0, handel: 0 })).n++; const c = catOf(b.type); if (c === 'woning' || c === 'handel') gemBld[g][c]++; }
const topTypes = Object.entries(types).sort((a, b) => b[1] - a[1]).slice(0, 25);
const spots = (() => { let n = 0; try { const sp = JSON.parse(fs.readFileSync(path.join(ROOT, 'game/shopplaces.json'), 'utf8')); for (const r of Object.values(sp.tiles)) n += r.length; } catch { n = -1; } return n; })();
const fac = (() => { try { const f = JSON.parse(fs.readFileSync(path.join(ROOT, 'game/facilities.json'), 'utf8')); return { kinds: f.kinds.length, bytes: fs.statSync(path.join(ROOT, 'game/facilities.json')).size }; } catch { return null; } })();
rep.panden = {
  n: bld.length, metOsmId: bld.filter((b) => b.osm).length, metNaam: bld.filter((b) => b.named).length, landmarks: bld.filter((b) => b.landmark).length,
  gemiddeldM2: Math.round(bld.reduce((s, b) => s + b.m2, 0) / Math.max(1, bld.length)),
  perCategorie: cats, perCategorieHaDak: Object.fromEntries(Object.entries(catM2).map(([k, v]) => [k, ha1(v)])), topTypes,
  perGemeente: Object.entries(gemBld).sort((a, b) => b[1].n - a[1].n).slice(0, 12),
  winkelplaatsen: spots, voorzieningen: fac,
  // opslag van bezit: een pand-id is de OSM-id (4 byte tot 5 byte); de speler bewaart een set van geheel getallen
  bezitBytes: { per1000Json: JSON.stringify(bld.slice(0, 1000).map((b, i) => 100000000 + i * 37)).length, per10000Json: JSON.stringify(bld.slice(0, 10000).map((b, i) => 100000000 + i * 37)).length },
};
if (!QUIET) {
  console.log('\n== Panden (Bedrijven-tak) ==');
  console.log(`  ${rep.panden.n} panden, met OSM-id ${rep.panden.metOsmId}, met naam ${rep.panden.metNaam}, landmark ${rep.panden.landmarks}, gemiddeld ${rep.panden.gemiddeldM2} m2`);
  console.log('  categorie', JSON.stringify(rep.panden.perCategorie)); console.log('  dakoppervlak ha', JSON.stringify(rep.panden.perCategorieHaDak));
  console.log('  top types', JSON.stringify(rep.panden.topTypes)); console.log('  per gemeente', JSON.stringify(rep.panden.perGemeente));
  console.log('  winkelplaatsen (shopplaces.json)', spots, 'voorzieningen', JSON.stringify(fac), 'bezit-opslag', JSON.stringify(rep.panden.bezitBytes));
}
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(rep, null, 1));
if (!QUIET) {
  const row = (r) => `  ${String(r.naam).padEnd(24)} ${String(r.n).padStart(6)} ${String(r.ha).padStart(10)} ha  bereikbaar ${String(r.bereikbaar).padStart(5)}%  mediaan ${r.mediaanHa} ha`;
  console.log('== Percelen-audit ==');
  console.log(`wereld ${rep.wereld}\ntegels ${rep.tegels}, stukken in de tegels ${rep.stukken.n} (${rep.stukken.hoekpunten} hoekpunten), randverbindingen ${rep.stukken.aaneengeregen}`);
  console.log(`percelen na aaneenrijgen: ${rep.percelen.n} (${rep.percelen.ha} ha); in de provincie ${rep.percelen.binnenProvincie.n} (${rep.percelen.binnenProvincie.ha} ha), erbuiten ${rep.percelen.buitenProvincie.n} (${rep.percelen.buitenProvincie.ha} ha); over meerdere tegels ${rep.percelen.meerdereTegels}`);
  console.log('\n== Per soort =='); for (const [k, v] of Object.entries(rep.perSoort)) console.log(`  ${k.padEnd(10)} ${String(v.n).padStart(6)} ${String(v.ha).padStart(10)} ha  mediaan ${v.mediaanHa} ha`);
  console.log('\n== Verdeling =='); for (const h of rep.verdeling) console.log(`  ${h.klasse.padEnd(12)} ${String(h.n).padStart(6)} ${String(h.ha).padStart(10)} ha`);
  console.log('kwantielen (ha)', JSON.stringify(rep.kwantielenHa));
  console.log('\n== Per gemeente (binnen de provincie) =='); for (const r of rep.perGemeente) console.log(row(r));
  console.log('\n== Per streek =='); for (const r of rep.perStreek) console.log(row(r));
  console.log('\n== Bereikbaarheid (rand tot autoweg of pad) =='); console.log(' ', JSON.stringify(rep.bereikbaar));
  console.log('raakt (rand binnen 6/10/8 m)', JSON.stringify(rep.raakt), '\ndoorsneden', JSON.stringify(rep.doorsneden));
  console.log('buren', JSON.stringify(rep.buren), '\nklein', JSON.stringify(rep.klein), '\ngroot', JSON.stringify(rep.groot), '\noverlap met een ander perceel', rep.overlapMetAnder);
  console.log('\n== ID =='); console.log(' ', JSON.stringify(rep.id));
  console.log('\n== Prijs (huidige tarieven, ha x 1.500 weide of 2.300 akker) =='); console.log(' ', JSON.stringify(rep.prijs));
  console.log('\n== Data =='); console.log(' ', JSON.stringify(rep.data));
}
