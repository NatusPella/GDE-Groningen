// 3D BAG LoD 2.2 omzetten naar een compact, vereenvoudigd formaat per kilometertegel (#410), alleen offline en voor later.
// Het spel, de stage en de release laden dit niet (docs/BAG-LOD22.md); niets in game/js importeert dit bestand.
//
//   node scripts/world/bag_lod22.mjs convert <tegel.city.json[.gz]|.jsonl> [--out <map>] [--quant 0.05] [--min-area 0.05] [--max-mb 600]
//   node scripts/world/bag_lod22.mjs inspect <tegel.gbl>
//   node scripts/world/bag_lod22.mjs estimate [--tris 150] [--bytes-per-tri ...]       raming voor de provincie en de frametijd (data/world/3dbag_province.json.gz)
//
// Invoer: CityJSON 2.0 zoals 3D BAG het levert (fetch_3dbag_lod22.py): gebouwen met BuildingParts in LoD 2.2 (Solid of MultiSurface, met
// semantiek GroundSurface / WallSurface / RoofSurface). Eruit komen alleen daken en wanden (de grondvlakken vallen weg), met
//   - de hoogte relatief aan de maaiveldhoogte van het gebouw (b3_h_maaiveld), zoals het spel de gebouwen vlak bouwt (y = 0 is straatniveau);
//   - de coördinaten in het wereldframe van het spel (x = RD x - 233670, y = 582075 - RD y; hoogte omhoog);
//   - gekwantiseerd (standaard 5 cm) en samengevoegd (dubbele hoekpunten), vlakken onder --min-area m2 weg, driehoeken zonder oppervlak weg;
//   - elk gebouw in de tegel (1 km, het .gdt-raster) waarin zijn middelpunt ligt.
// Het formaat heet GBL1 (hierna). De hoekpunten staan als (x, y, hoogte) van het wereldframe; voor three.js is dat (x, hoogte, y), zonder de
// volgorde van de indices te veranderen (de afbeelding van RD (oost, noord, omhoog) naar three (x, omhoog, zuid) is een draaiing). Vlakken met gaten worden zonder de gaten getekend (geteld in de statistiek).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { tileIndexOf, tileKey, TILE_M } from '../../game/js/gdt.js';
import { RD_ORIGIN_X, RD_ORIGIN_Y } from '../../game/js/rdnew.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const DEFAULTS = { quant: 0.05, minArea: 0.05, maxMb: 600 };
export const GBL_MAGIC = 'GBL1';

// ------------------------------------------------------------------ invoer

// CityJSON uit een buffer (gzip of niet): { json } of, bij CityJSONSeq (regels), { seq: [json, ...] }
export function readCityJson(buf, { maxMb = DEFAULTS.maxMb } = {}) {
  let raw = buf;
  if (raw[0] === 0x1f && raw[1] === 0x8b) raw = zlib.gunzipSync(raw);
  if (raw.length > maxMb * 1e6) throw new Error(`${(raw.length / 1e6).toFixed(0)} MB ongepakt boven --max-mb ${maxMb}: een tegel van deze grootte past niet in een JSON.parse (docs/BAG-LOD22.md, risico's: streamend inlezen is er nog niet)`);
  const text = raw.toString('utf8');
  const first = text.slice(0, 2000).trimStart();
  // CityJSONSeq: een regel per feature, de eerste regel met transform en metadata
  if (first.startsWith('{') && text.indexOf('\n') > 0 && text.slice(0, text.indexOf('\n')).trimEnd().endsWith('}') && !/"CityObjects"/.test(text.slice(0, text.indexOf('\n')))) {
    const lines = text.split('\n').filter((l) => l.trim());
    const head = JSON.parse(lines[0]);
    return { seq: lines.slice(1).map((l) => JSON.parse(l)), transform: head.transform };
  }
  return { json: JSON.parse(text) };
}

// de hoekpunten van een CityJSON(-feature) als echte coördinaten (RD New, m NAP)
function realVertices(cj, transform) {
  const t = cj.transform || transform || { scale: [1, 1, 1], translate: [0, 0, 0] };
  return cj.vertices.map((v) => [v[0] * t.scale[0] + t.translate[0], v[1] * t.scale[1] + t.translate[1], v[2] * t.scale[2] + t.translate[2]]);
}

// (het BAG-id als getal: de leidende nullen vallen weg, zoals in data/world/3dbag_province.json.gz)
const bagId = (key) => String(key).replace(/^NL\.IMBAG\.Pand\./, '').replace(/-\d+$/, '').replace(/^0+(?=\d)/, '');

// De gebouwen van een CityJSON(-feature): [{ id, hg, roof, faces: [{ ring: [[x, y, z], ...] (RD, NAP), kind: 'wall'|'roof'|'ground'|null, holes }] }]
export function buildingsOf(cj, transform = null) {
  const V = realVertices(cj, transform);
  const objs = cj.CityObjects || {};
  const out = [];
  const facesOf = (geom) => {
    const faces = [];
    const sem = geom.semantics;
    const kindOf = (si) => {
      if (!sem || si === null || si === undefined || si < 0) return null;
      const t = sem.surfaces[si] && sem.surfaces[si].type;
      return t === 'RoofSurface' ? 'roof' : t === 'WallSurface' ? 'wall' : t === 'GroundSurface' ? 'ground' : null;
    };
    const add = (face, si) => {
      if (!face || !face.length) return;
      faces.push({ ring: face[0].map((i) => V[i]), kind: kindOf(si), holes: face.length - 1 });
    };
    if (geom.type === 'Solid') geom.boundaries.forEach((shell, s) => shell.forEach((f, k) => add(f, sem && sem.values ? sem.values[s][k] : null)));
    else if (geom.type === 'MultiSurface' || geom.type === 'CompositeSurface') geom.boundaries.forEach((f, k) => add(f, sem && sem.values ? sem.values[k] : null));
    return faces;
  };
  const lod22 = (o) => (o.geometry || []).filter((g) => String(g.lod) === '2.2');
  for (const [key, o] of Object.entries(objs)) {
    if (o.type !== 'Building') continue;
    const faces = [];
    for (const ck of o.children || []) { const c = objs[ck]; if (c) for (const g of lod22(c)) faces.push(...facesOf(g)); }
    for (const g of lod22(o)) faces.push(...facesOf(g));
    if (!faces.length) continue;
    const a = o.attributes || {};
    out.push({ id: bagId(key), hg: Number.isFinite(a.b3_h_maaiveld) ? a.b3_h_maaiveld : Math.min(...faces.flatMap((f) => f.ring.map((p) => p[2]))), roof: a.b3_dak_type || null, faces });
  }
  return out;
}

// ------------------------------------------------------------------ driehoeken

// Een vlak (ring van 3D-punten) als driehoeken, in de volgorde van de ring: [[a, b, c], ...] met indices in de ring.
// Projectie op het vlak waar de normaal het meest op staat, oren afknippen; de normaal komt mee terug.
export function triangulate(ring) {
  const n = ring.length;
  if (n < 3) return { tris: [], normal: [0, 0, 0] };
  let nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < n; i++) {
    const a = ring[i], b = ring[(i + 1) % n];
    nx += (a[1] - b[1]) * (a[2] + b[2]);
    ny += (a[2] - b[2]) * (a[0] + b[0]);
    nz += (a[0] - b[0]) * (a[1] + b[1]);
  }
  const L = Math.hypot(nx, ny, nz);
  if (L < 1e-12) return { tris: [], normal: [0, 0, 0] };
  const normal = [nx / L, ny / L, nz / L];
  if (n === 3) return { tris: [[0, 1, 2]], normal };
  const drop = Math.abs(nx) >= Math.abs(ny) && Math.abs(nx) >= Math.abs(nz) ? 0 : Math.abs(ny) >= Math.abs(nz) ? 1 : 2;
  const P = ring.map((p) => (drop === 0 ? [p[1], p[2]] : drop === 1 ? [p[2], p[0]] : [p[0], p[1]]));
  let area2 = 0;
  for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n]; area2 += a[0] * b[1] - b[0] * a[1]; }
  const sgn = area2 >= 0 ? 1 : -1;
  const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const inside = (p, a, b, c) => cross(a, b, p) * sgn >= -1e-12 && cross(b, c, p) * sgn >= -1e-12 && cross(c, a, p) * sgn >= -1e-12;
  const idx = ring.map((_, i) => i);
  const tris = [];
  let guard = 0;
  while (idx.length > 3 && guard++ < n * n) {
    let clipped = false;
    for (let k = 0; k < idx.length; k++) {
      const ia = idx[(k + idx.length - 1) % idx.length], ib = idx[k], ic = idx[(k + 1) % idx.length];
      if (cross(P[ia], P[ib], P[ic]) * sgn <= 1e-12) continue; // een bocht de andere kant op of recht
      let ear = true;
      for (const j of idx) if (j !== ia && j !== ib && j !== ic && inside(P[j], P[ia], P[ib], P[ic])) { ear = false; break; }
      if (!ear) continue;
      tris.push([ia, ib, ic]);
      idx.splice(k, 1);
      clipped = true;
      break;
    }
    if (!clipped) { // een ring die niet te knippen is (zelfdoorsnijding): een waaier
      for (let k = 1; k + 1 < idx.length; k++) tris.push([idx[0], idx[k], idx[k + 1]]);
      idx.length = 0;
    }
  }
  if (idx.length === 3) tris.push([idx[0], idx[1], idx[2]]);
  return { tris, normal };
}

// ------------------------------------------------------------------ een gebouw

// Eén gebouw omgezet: { id, ox, oy (cm, wereldframe), hg, verts: Int16Array (x, y, h in eenheden van quant, relatief aan ox, oy en hg), walls, roofs: Uint16Array (3 per driehoek), stats }
// of null als er niets overblijft of het niet in 16 bits past.
export function convertBuilding(b, { quant = DEFAULTS.quant, minArea = DEFAULTS.minArea } = {}) {
  const toWorld = (p) => [p[0] - RD_ORIGIN_X, RD_ORIGIN_Y - p[1], p[2] - b.hg];
  const faces = b.faces.map((f) => ({ ...f, w: f.ring.map(toWorld) }));
  // het gebouw begint in de linker-bovenhoek van zijn omhullende, op hele cm
  let minX = Infinity, minY = Infinity;
  for (const f of faces) for (const p of f.w) { if (p[0] < minX) minX = p[0]; if (p[1] < minY) minY = p[1]; }
  const ox = Math.floor(minX * 100), oy = Math.floor(minY * 100);
  const stats = { facesIn: faces.length, facesDropped: 0, holes: 0, trisIn: 0, trisOut: 0 };
  const key = new Map(), verts = [];
  const vert = (p) => {
    const q = [Math.round((p[0] - ox / 100) / quant), Math.round((p[1] - oy / 100) / quant), Math.round(p[2] / quant)];
    const k = q.join(',');
    let i = key.get(k);
    if (i === undefined) { i = verts.length / 3; key.set(k, i); verts.push(q[0], q[1], q[2]); }
    return i;
  };
  const walls = [], roofs = [];
  for (const f of faces) {
    if (f.kind === 'ground') { stats.facesDropped++; continue; }
    if (f.holes) stats.holes++;
    // (de driehoeken en de normaal in het RD-frame, rechtshandig: het wereldframe spiegelt y, en een spiegeling draait de normaal om)
    const { tris, normal } = triangulate(f.ring);
    // een vlak zonder soort: omhoog = dak, bijna loodrecht = wand, naar beneden weg
    const kind = f.kind || (Math.abs(normal[2]) < 0.35 ? 'wall' : normal[2] > 0 ? 'roof' : null);
    if (!kind) { stats.facesDropped++; continue; }
    // de oppervlakte van het vlak (Newell), in m2
    let area = 0;
    for (const t of tris) { const a = f.w[t[0]], b2 = f.w[t[1]], c = f.w[t[2]]; area += 0.5 * Math.hypot((b2[1] - a[1]) * (c[2] - a[2]) - (b2[2] - a[2]) * (c[1] - a[1]), (b2[2] - a[2]) * (c[0] - a[0]) - (b2[0] - a[0]) * (c[2] - a[2]), (b2[0] - a[0]) * (c[1] - a[1]) - (b2[1] - a[1]) * (c[0] - a[0])); }
    stats.trisIn += tris.length;
    if (area < minArea) { stats.facesDropped++; continue; }
    for (const t of tris) {
      const i = vert(f.w[t[0]]), j = vert(f.w[t[1]]), k = vert(f.w[t[2]]);
      if (i === j || j === k || i === k) continue;
      // de gewelfde oppervlakte na kwantiseren: 0 is weg
      const ax = verts[3 * j] - verts[3 * i], ay = verts[3 * j + 1] - verts[3 * i + 1], az = verts[3 * j + 2] - verts[3 * i + 2];
      const bx = verts[3 * k] - verts[3 * i], by = verts[3 * k + 1] - verts[3 * i + 1], bz = verts[3 * k + 2] - verts[3 * i + 2];
      if (ay * bz - az * by === 0 && az * bx - ax * bz === 0 && ax * by - ay * bx === 0) continue;
      (kind === 'wall' ? walls : roofs).push(i, j, k);
    }
  }
  stats.trisOut = (walls.length + roofs.length) / 3;
  if (!stats.trisOut) return null;
  const nV = verts.length / 3;
  if (nV > 65535 || walls.length / 3 > 65535 || roofs.length / 3 > 65535 || verts.some((v) => v < -32768 || v > 32767)) return { tooBig: true, id: b.id, stats };
  return { id: b.id, ox, oy, hg: b.hg, roof: b.roof, verts: Int16Array.from(verts), walls: Uint16Array.from(walls), roofs: Uint16Array.from(roofs), stats };
}

// ------------------------------------------------------------------ formaat GBL1
// Eén bestand per kilometertegel (de .gdt-tegel van het wereldframe, gdt.js tileIndexOf):
//   kop (niet gecomprimeerd): 'GBL1', u16 formaatversie (1), u16 vlaggen (0), i32 i, i32 j, u32 aantal gebouwen, f32 quant (m)
//   daarna deflate-raw van, per gebouw:
//     f64 BAG-id (getal; leidende nullen vallen weg), i32 ox, i32 oy (cm in het wereldframe, de hoek van het gebouw), f32 hg (m NAP, het maaiveld),
//     u16 aantal hoekpunten, u16 wanddriehoeken, u16 dakdriehoeken,
//     hoekpunten: 3 x i16 (x, y, hoogte, in eenheden van quant, x en y vanaf ox, oy, hoogte vanaf hg),
//     indices: 3 x u16 per driehoek, eerst de wanden, dan de daken (tegen de klok in gezien van buiten, zoals CityJSON)
export function encodeTile(i, j, list, quant = DEFAULTS.quant) {
  const parts = [];
  for (const b of list) {
    const nV = b.verts.length / 3, nW = b.walls.length / 3, nR = b.roofs.length / 3;
    const buf = Buffer.alloc(8 + 4 + 4 + 4 + 6 + nV * 6 + (nW + nR) * 6);
    let p = 0;
    buf.writeDoubleLE(Number(b.id), p); p += 8;
    buf.writeInt32LE(b.ox, p); p += 4;
    buf.writeInt32LE(b.oy, p); p += 4;
    buf.writeFloatLE(b.hg, p); p += 4;
    buf.writeUInt16LE(nV, p); buf.writeUInt16LE(nW, p + 2); buf.writeUInt16LE(nR, p + 4); p += 6;
    for (const v of b.verts) { buf.writeInt16LE(v, p); p += 2; }
    for (const v of b.walls) { buf.writeUInt16LE(v, p); p += 2; }
    for (const v of b.roofs) { buf.writeUInt16LE(v, p); p += 2; }
    parts.push(buf);
  }
  const head = Buffer.alloc(24);
  head.write(GBL_MAGIC, 0, 'ascii');
  head.writeUInt16LE(1, 4); head.writeUInt16LE(0, 6);
  head.writeInt32LE(i, 8); head.writeInt32LE(j, 12);
  head.writeUInt32LE(list.length, 16); head.writeFloatLE(quant, 20);
  return Buffer.concat([head, zlib.deflateRawSync(Buffer.concat(parts), { level: 9 })]);
}

export function decodeTile(buf) {
  if (buf.toString('ascii', 0, 4) !== GBL_MAGIC) throw new Error('geen GBL1-bestand');
  if (buf.readUInt16LE(4) !== 1) throw new Error('onbekende formaatversie ' + buf.readUInt16LE(4));
  const out = { i: buf.readInt32LE(8), j: buf.readInt32LE(12), quant: buf.readFloatLE(20), buildings: [] };
  const n = buf.readUInt32LE(16);
  const raw = zlib.inflateRawSync(buf.subarray(24));
  let p = 0;
  for (let k = 0; k < n; k++) {
    const id = String(raw.readDoubleLE(p)); p += 8;
    const ox = raw.readInt32LE(p), oy = raw.readInt32LE(p + 4), hg = raw.readFloatLE(p + 8); p += 12;
    const nV = raw.readUInt16LE(p), nW = raw.readUInt16LE(p + 2), nR = raw.readUInt16LE(p + 4); p += 6;
    const verts = new Int16Array(nV * 3);
    for (let q = 0; q < verts.length; q++, p += 2) verts[q] = raw.readInt16LE(p);
    const walls = new Uint16Array(nW * 3), roofs = new Uint16Array(nR * 3);
    for (let q = 0; q < walls.length; q++, p += 2) walls[q] = raw.readUInt16LE(p);
    for (let q = 0; q < roofs.length; q++, p += 2) roofs[q] = raw.readUInt16LE(p);
    out.buildings.push({ id, ox, oy, hg, verts, walls, roofs });
  }
  return out;
}

// de hoekpunten van een gedecodeerd gebouw als wereldcoördinaten [x, y, hoogte] (m)
export const worldVerts = (b, quant) => Array.from({ length: b.verts.length / 3 }, (_, i) => [b.ox / 100 + b.verts[3 * i] * quant, b.oy / 100 + b.verts[3 * i + 1] * quant, b.verts[3 * i + 2] * quant]);

// ------------------------------------------------------------------ een tegel (of een stuk) omzetten

// cj: { json } of { seq, transform } van readCityJson. Geeft { tiles: Map(sleutel -> { i, j, list }), stats }
export function convertCityJson(cj, opts = {}) {
  const t0 = performance.now();
  const parts = cj.seq ? cj.seq.map((f) => buildingsOf(f, cj.transform)) : [buildingsOf(cj.json)];
  const tiles = new Map();
  const stats = { buildings: 0, kept: 0, tooBig: 0, empty: 0, facesIn: 0, facesDropped: 0, holes: 0, trisIn: 0, trisOut: 0, verts: 0, ms: 0 };
  for (const b of parts.flat()) {
    stats.buildings++;
    const c = convertBuilding(b, opts);
    if (!c) { stats.empty++; continue; }
    stats.facesIn += c.stats.facesIn; stats.facesDropped += c.stats.facesDropped; stats.holes += c.stats.holes; stats.trisIn += c.stats.trisIn;
    if (c.tooBig) { stats.tooBig++; continue; }
    stats.kept++; stats.trisOut += c.stats.trisOut; stats.verts += c.verts.length / 3;
    // het middelpunt van de omhullende bepaalt de tegel
    let x1 = -Infinity, y1 = -Infinity;
    for (let q = 0; q < c.verts.length; q += 3) { x1 = Math.max(x1, c.verts[q]); y1 = Math.max(y1, c.verts[q + 1]); }
    const q = opts.quant || DEFAULTS.quant;
    const [ti, tj] = tileIndexOf(c.ox / 100 + (x1 * q) / 2, c.oy / 100 + (y1 * q) / 2);
    const key = tileKey(ti, tj);
    if (!tiles.has(key)) tiles.set(key, { i: ti, j: tj, list: [] });
    tiles.get(key).list.push(c);
  }
  stats.ms = performance.now() - t0;
  return { tiles, stats };
}

// de bestanden van een tegelomzetting naar een map; geeft per tegel { key, buildings, tris, verts, bytes }
export function writeTiles(tiles, outDir, quant = DEFAULTS.quant) {
  fs.mkdirSync(outDir, { recursive: true });
  const rows = [];
  for (const [key, t] of [...tiles].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    t.list.sort((a, b) => Number(a.id) - Number(b.id));
    const buf = encodeTile(t.i, t.j, t.list, quant);
    fs.writeFileSync(path.join(outDir, key + '.gbl'), buf);
    rows.push({ key, buildings: t.list.length, tris: t.list.reduce((s, b) => s + b.stats.trisOut, 0), verts: t.list.reduce((s, b) => s + b.verts.length / 3, 0), bytes: buf.length, raw: t.list.reduce((s, b) => s + 28 + b.verts.length * 2 + (b.walls.length + b.roofs.length) * 2, 0) });
  }
  return rows;
}

// ------------------------------------------------------------------ ramingen

// Per tegel gemeten, voor de provincie geraamd: opslag, bouwtijd en driehoeken. `rows` zijn de rijen van writeTiles, `stats` van convertCityJson.
export function perBuilding(rows, stats) {
  const n = rows.reduce((s, r) => s + r.buildings, 0) || 1;
  return { buildings: n, tris: rows.reduce((s, r) => s + r.tris, 0) / n, verts: rows.reduce((s, r) => s + r.verts, 0) / n, bytes: rows.reduce((s, r) => s + r.bytes, 0) / n, msIn: stats.ms / (stats.buildings || 1) };
}

// Raming voor N gebouwen uit de gemiddelden per gebouw (gemeten of aangenomen): { MB, minutes, tris }
export function estimateFor(N, per) {
  return { MB: (N * per.bytes) / 1e6, minutes: (N * per.msIn) / 60000, tris: N * per.tris };
}

// De dichtheid van gebouwen in de provincie uit data/world/3dbag_province.json.gz: gebouwen binnen `radius` m, per percentiel
// van de gebouwen (de tellingen per rastercel van 50 m, daarna de som over de cellen binnen de straal).
export function densityPercentiles(rows, radius = 150, cell = 50) {
  const grid = new Map();
  for (const r of rows) { const k = Math.floor(r[1] / cell) + ',' + Math.floor(r[2] / cell); grid.set(k, (grid.get(k) || 0) + 1); }
  const R = Math.ceil(radius / cell);
  const counts = [];
  for (const [k, n] of grid) {
    const [cx, cy] = k.split(',').map(Number);
    let s = 0;
    for (let dx = -R; dx <= R; dx++) for (let dy = -R; dy <= R; dy++) if (Math.hypot(dx * cell, dy * cell) <= radius) s += grid.get((cx + dx) + ',' + (cy + dy)) || 0;
    for (let q = 0; q < n; q++) counts.push(s);
  }
  counts.sort((a, b) => a - b);
  const at = (p) => counts[Math.min(counts.length - 1, Math.floor(p * counts.length))];
  return { buildings: rows.length, p50: at(0.5), p90: at(0.9), p99: at(0.99), max: counts[counts.length - 1] };
}

// ------------------------------------------------------------------ CLI

function arg(args, name, d) { const a = args.find((q) => q.startsWith('--' + name + '=')); if (a) return a.slice(name.length + 3); const i = args.indexOf('--' + name); return i >= 0 && args[i + 1] ? args[i + 1] : d; }

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  if (cmd === 'convert') {
    const file = args.find((a) => !a.startsWith('--') && fs.existsSync(a));
    if (!file) throw new Error('geef een CityJSON-bestand');
    const opts = { quant: Number(arg(args, 'quant', DEFAULTS.quant)), minArea: Number(arg(args, 'min-area', DEFAULTS.minArea)) };
    const out = path.resolve(arg(args, 'out', path.join(ROOT, 'data', 'cache', '3dbag-lod22', 'gbl')));
    const cj = readCityJson(fs.readFileSync(file), { maxMb: Number(arg(args, 'max-mb', DEFAULTS.maxMb)) });
    const { tiles, stats } = convertCityJson(cj, opts);
    const rows = writeTiles(tiles, out, opts.quant);
    const per = perBuilding(rows, stats);
    console.log(`${stats.buildings} gebouwen, ${stats.kept} bewaard (${stats.tooBig} te groot voor 16 bits, ${stats.empty} leeg), ${stats.holes} vlakken met gaten zonder gaten getekend`);
    console.log(`driehoeken ${stats.trisIn} -> ${stats.trisOut}, hoekpunten ${stats.verts}, omzetten ${(stats.ms / 1000).toFixed(2)} s`);
    for (const r of rows) console.log(`  ${r.key}: ${r.buildings} gebouwen, ${r.tris} driehoeken, ${(r.bytes / 1e3).toFixed(0)} kB (${(r.raw / 1e3).toFixed(0)} kB voor deflate) -> ${path.relative(ROOT, path.join(out, r.key + '.gbl'))}`);
    console.log(`per gebouw: ${per.tris.toFixed(0)} driehoeken, ${per.verts.toFixed(0)} hoekpunten, ${per.bytes.toFixed(0)} B, ${(per.msIn * 1000).toFixed(0)} us omzetten`);
    return;
  }
  if (cmd === 'inspect') {
    const t = decodeTile(fs.readFileSync(args[0]));
    const tris = t.buildings.reduce((s, b) => s + (b.walls.length + b.roofs.length) / 3, 0);
    console.log(`tegel ${tileKey(t.i, t.j)}: ${t.buildings.length} gebouwen, ${tris} driehoeken, quant ${t.quant} m`);
    return;
  }
  if (cmd === 'estimate') {
    const f = path.join(ROOT, 'data', 'world', '3dbag_province.json.gz');
    if (!fs.existsSync(f)) throw new Error('data/world/3dbag_province.json.gz ontbreekt');
    const d = JSON.parse(zlib.gunzipSync(fs.readFileSync(f)).toString());
    // AANNAMES tot de eerste echte tegel gemeten is: driehoeken per gebouw (--tris, anders de drie scenario's), hoekpunten 0,6 per driehoek,
    // 6 B per hoekpunt en per driehoek, deflate 0,6 (--ratio), 0,4 ms omzetten per gebouw (--ms)
    const scen = arg(args, 'tris', null) ? [Number(arg(args, 'tris', 150))] : [60, 150, 300];
    const ratio = Number(arg(args, 'ratio', 0.6)), ms = Number(arg(args, 'ms', 0.4));
    const dens = densityPercentiles(d.rows);
    console.log(`provincie: ${d.rows.length} gebouwen in de 3D BAG-extractie (data/world/3dbag_province.json.gz)`);
    console.log(`gebouwen binnen 150 m van een gebouw: p50 ${dens.p50}, p90 ${dens.p90}, p99 ${dens.p99}, max ${dens.max}`);
    console.log('driehoeken per gebouw (aanname) | opslag | omzetten | driehoeken provincie | binnen 150 m: p50 / p90 / p99 / max');
    for (const tris of scen) {
      const verts = 0.6 * tris, per = { tris, verts, bytes: (28 + verts * 6 + tris * 6) * ratio, msIn: ms };
      const e = estimateFor(d.rows.length, per);
      console.log(`  ${String(tris).padStart(4)} | ${e.MB.toFixed(0)} MB | ${e.minutes.toFixed(0)} min | ${(e.tris / 1e6).toFixed(0)} M | ${['p50', 'p90', 'p99', 'max'].map((k) => (dens[k] * tris / 1e3).toFixed(0) + 'k').join(' / ')}`);
    }
    return;
  }
  console.log('gebruik: convert <bestand> | inspect <bestand.gbl> | estimate');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.message); process.exit(1); });
