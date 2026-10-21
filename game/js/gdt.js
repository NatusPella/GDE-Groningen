// The .gdt tile format, version 1 (docs/PROVINCIE-PLAN.md 2.1, 2.4b; the
// byte layout is in ARCHITECTURE.md "World tiles"). Pure: no DOM, no three.js; the
// map packer (scripts/world/pack_tiles.mjs), the tile worker and the game
// share it, so what is written is exactly what is read.
//
// Grid: 1 km tiles on the RD New kilometre grid. In the world frame
// (rdnew.js) the grid lines lie at x = 330 + 1000 i and y = 75 + 1000 j;
// tile (i, j) covers x in [330 + 1000 i, ...+1000), y in [75 + 1000 j, ...).
// Its key is the RD kilometre of its south-west corner, "234_581" for (0, 0).
//
// A tile blob (before compression):
//   magic 'GDT1', u16 format version, u16 builder version, i32 i, i32 j,
//   u32 flags, u16 section count, u16 reserved,
//   per section: u16 type, u16 version, u32 offset, u32 length, u32 rows,
//   then the sections. Section 0 (STRINGS) holds every string of the blob.
// A table section is self-describing and columnar: per column the key, a
// kind per row (absent, null, false, true, number, string, points, number
// list, json) and one value stream per kind. Numbers are integers, exact
// centimetres or float64, chosen per column with exceptions per row, so a
// round trip gives the same doubles. Points are tile-local centimetres,
// delta + zigzag varints, kolomgewijs (all dx, then all dy).

export const GDT_FORMAT = 1;
export const TILE_M = 1000;
// world-frame position of the grid line through RD kilometre 234 / 582
export const GRID_X0 = 330;
export const GRID_Y0 = 75;
export const RD_TILE_X0 = 234;
export const RD_TILE_Y0 = 581;

export const tileIndexOf = (x, y) => [Math.floor((x - GRID_X0) / TILE_M), Math.floor((y - GRID_Y0) / TILE_M)];
export const tileOrigin = (i, j) => [GRID_X0 + i * TILE_M, GRID_Y0 + j * TILE_M];
export const tileKey = (i, j) => `${RD_TILE_X0 + i}_${RD_TILE_Y0 - j}`;
export function tileFromKey(key) {
  const [a, b] = key.split('_').map(Number);
  return [a - RD_TILE_X0, RD_TILE_Y0 - b];
}

// section types (the version of each is its own; readers skip unknown types)
export const SECTION = {
  STRINGS: 0,
  BUILDINGS: 1, // footprints: pts, h, type, name, landmark, sd (look seed), lift, height source, ...
  ROADS: 2, // ribbons: pts, class, width, lanes, oneway, bridge, layer, ... (the z profile is in HEIGHTS)
  WATER: 3,
  GREEN: 4, // landuse and green areas
  TREES: 5, // g, p [[x, y]], s species, h height (dm), f flags (greenery.js)
  RAILS: 6,
  CANOPIES: 7, // open roofs (building=roof, platform roofs)
  PASSAGES: 8, // ways through or under a building
  JUNCTIONS: 9, // the junction model (v1: k, p, c control, a arms [road gid, idx, d, rule, stop m, enters]; junctions.js junctionRows); surfaces F1b
  HEIGHTS: 10, // vertical road profiles (v1: gid, z, pnet, st, ly; roadprofile.js heightRows); the AHN raster goes next to it (F2)
  POIS: 11, // the city's places (poisections.js): the point lists of map.meta as rows of the tile their point lies in (_l list, _n place in it)
  FURNITURE: 12, // mapped street furniture (v1: k, pts, v, h, osm; streetfurniture.js mappedFromOsm); rule items are generated per tile
  NAV: 13, // reserved (F1): road/bike/foot/boat graphs with portal nodes
  OVERLAY: 14, // reserved (F1): hand-made layers
  COUNTRY_BOXES: 15, // reserved: the old Ommeland building boxes (gone with game/ommeland.bin)
  META: 20, // JSON: anything global that has no table yet
  RASTER: 21, // u16 w, u16 h, f32 cell, f64 x0, f64 y0, u8 codec (0 u8, 1 int16 cm, 2 f32), then the cells (terrainraster.js: the AHN terrain per tile)
  BLOB: 22, // named raw bytes
  PARCELS: 16, // land use from OSM landuse: pts, use ('akker' | 'weide' | 'boomgaard'); the countryside's fences and herds follow it (#124)
};

// --------------------------------------------------------------- bytes

const enc = new TextEncoder();
const dec = new TextDecoder();

export class Writer {
  constructor(size = 1 << 16) { this.buf = new Uint8Array(size); this.n = 0; this.dv = new DataView(this.buf.buffer); }
  ensure(k) {
    if (this.n + k <= this.buf.length) return;
    let s = this.buf.length * 2;
    while (s < this.n + k) s *= 2;
    const b = new Uint8Array(s);
    b.set(this.buf.subarray(0, this.n));
    this.buf = b;
    this.dv = new DataView(b.buffer);
  }
  u8(v) { this.ensure(1); this.buf[this.n++] = v; }
  u16(v) { this.ensure(2); this.dv.setUint16(this.n, v, true); this.n += 2; }
  u32(v) { this.ensure(4); this.dv.setUint32(this.n, v, true); this.n += 4; }
  i32(v) { this.ensure(4); this.dv.setInt32(this.n, v, true); this.n += 4; }
  f32(v) { this.ensure(4); this.dv.setFloat32(this.n, v, true); this.n += 4; }
  f64(v) { this.ensure(8); this.dv.setFloat64(this.n, v, true); this.n += 8; }
  // unsigned varint for 0 <= v < 2^53
  uv(v) {
    this.ensure(8);
    while (v >= 128) { this.buf[this.n++] = (v % 128) | 128; v = Math.floor(v / 128); }
    this.buf[this.n++] = v;
  }
  sv(v) { this.uv(v < 0 ? -2 * v - 1 : 2 * v); }
  bytes(b) { this.ensure(b.length); this.buf.set(b, this.n); this.n += b.length; }
  str(s) { const b = enc.encode(s); this.uv(b.length); this.bytes(b); }
  out() { return this.buf.slice(0, this.n); }
}

export class Reader {
  constructor(bytes, off = 0, end = bytes.length) { this.b = bytes; this.p = off; this.end = end; this.dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); }
  u8() { return this.b[this.p++]; }
  u16() { const v = this.dv.getUint16(this.p, true); this.p += 2; return v; }
  u32() { const v = this.dv.getUint32(this.p, true); this.p += 4; return v; }
  i32() { const v = this.dv.getInt32(this.p, true); this.p += 4; return v; }
  f32() { const v = this.dv.getFloat32(this.p, true); this.p += 4; return v; }
  f64() { const v = this.dv.getFloat64(this.p, true); this.p += 8; return v; }
  uv() {
    let v = 0, m = 1, c;
    do { c = this.b[this.p++]; v += (c & 127) * m; m *= 128; } while (c & 128);
    return v;
  }
  sv() { const u = this.uv(); return u % 2 ? -(u + 1) / 2 : u / 2; }
  bytes(k) { const s = this.b.subarray(this.p, this.p + k); this.p += k; return s; }
  str() { return dec.decode(this.bytes(this.uv())); }
}

// --------------------------------------------------------------- hashing
// XXH32 (Yann Collet, BSD-2); a tile's hash is two of them with different
// seeds, as 16 hex digits.

const P1 = 2654435761, P2 = 2246822519, P3 = 3266489917, P4 = 668265263, P5 = 374761393;
const rotl = (x, r) => (x << r) | (x >>> (32 - r));
export function xxh32(b, seed = 0) {
  const n = b.length;
  let p = 0, h;
  const u32 = (i) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;
  if (n >= 16) {
    let v1 = (seed + P1 + P2) | 0, v2 = (seed + P2) | 0, v3 = seed | 0, v4 = (seed - P1) | 0;
    const lim = n - 16;
    while (p <= lim) {
      v1 = Math.imul(rotl((v1 + Math.imul(u32(p), P2)) | 0, 13), P1); p += 4;
      v2 = Math.imul(rotl((v2 + Math.imul(u32(p), P2)) | 0, 13), P1); p += 4;
      v3 = Math.imul(rotl((v3 + Math.imul(u32(p), P2)) | 0, 13), P1); p += 4;
      v4 = Math.imul(rotl((v4 + Math.imul(u32(p), P2)) | 0, 13), P1); p += 4;
    }
    h = (rotl(v1, 1) + rotl(v2, 7) + rotl(v3, 12) + rotl(v4, 18)) | 0;
  } else h = (seed + P5) | 0;
  h = (h + n) | 0;
  while (p + 4 <= n) { h = Math.imul(rotl((h + Math.imul(u32(p), P3)) | 0, 17), P4); p += 4; }
  while (p < n) { h = Math.imul(rotl((h + Math.imul(b[p], P5)) | 0, 11), P1); p++; }
  h ^= h >>> 15; h = Math.imul(h, P2); h ^= h >>> 13; h = Math.imul(h, P3); h ^= h >>> 16;
  return h >>> 0;
}
export const hash64 = (b) => xxh32(b, 0).toString(16).padStart(8, '0') + xxh32(b, 0x9e3779b1).toString(16).padStart(8, '0');

// --------------------------------------------------------------- tables

const K = { ABSENT: 0, NULL: 1, FALSE: 2, TRUE: 3, NUM: 4, STR: 5, PTS: 6, NUMS: 7, JSON: 8 };
const NUM_INT = 0, NUM_CM = 1, NUM_F64 = 2;

const isPts = (v) => Array.isArray(v) && v.length > 0 && v.every((p) => Array.isArray(p) && p.length === 2 && typeof p[0] === 'number' && typeof p[1] === 'number');
const isNums = (v) => Array.isArray(v) && v.every((x) => typeof x === 'number');
const kindOf = (v) => {
  if (v === undefined) return K.ABSENT;
  if (v === null) return K.NULL;
  if (v === false) return K.FALSE;
  if (v === true) return K.TRUE;
  if (typeof v === 'number') return K.NUM;
  if (typeof v === 'string') return K.STR;
  if (isPts(v)) return K.PTS;
  if (isNums(v)) return K.NUMS;
  return K.JSON;
};
// an integer number of centimetres that reads back as exactly v
const cmOf = (v) => { const c = Math.round(v * 100); return Number.isSafeInteger(c) && c / 100 === v ? c : null; };

// the cheapest number mode that holds every value of the column, the rest as exceptions
function numMode(vals) {
  let ints = 0, cms = 0;
  for (const v of vals) { if (Number.isSafeInteger(v) && !Object.is(v, -0)) ints++; if (!Object.is(v, -0) && cmOf(v) !== null) cms++; }
  if (ints === vals.length) return NUM_INT;
  return cms * 2 >= vals.length ? NUM_CM : NUM_F64;
}

function writeNums(w, vals, mode) {
  // exceptions: rows whose value the mode cannot hold exactly, as float64
  const exc = [];
  w.u8(mode);
  if (mode === NUM_F64) { for (const v of vals) w.f64(v); return; }
  const codes = vals.map((v, i) => {
    const c = mode === NUM_INT ? (Number.isSafeInteger(v) && !Object.is(v, -0) ? v : null) : (Object.is(v, -0) ? null : cmOf(v));
    if (c === null) { exc.push(i); return 0; }
    return c;
  });
  w.uv(exc.length);
  let last = 0;
  for (const i of exc) { w.uv(i - last); last = i; w.f64(vals[i]); }
  for (const c of codes) w.sv(c);
}

function readNums(r, n) {
  const mode = r.u8();
  const out = new Array(n);
  if (mode === NUM_F64) { for (let i = 0; i < n; i++) out[i] = r.f64(); return out; }
  const ne = r.uv(), exc = new Map();
  let last = 0;
  for (let k = 0; k < ne; k++) { last += r.uv(); exc.set(last, r.f64()); }
  for (let i = 0; i < n; i++) {
    const c = r.sv();
    out[i] = exc.has(i) ? exc.get(i) : mode === NUM_INT ? c : c / 100;
  }
  return out;
}

// points: per list its length, then all dx (cm), then all dy; a list with a
// coordinate that is not an exact centimetre goes whole as float64
function writePts(w, lists, ox, oy) {
  const raw = [];
  w.uv(lists.length);
  for (const L of lists) w.uv(L.length);
  const exact = lists.map((L) => L.every((p) => cmOf(p[0] - 0) !== null && cmOf(p[1]) !== null));
  lists.forEach((L, i) => { if (!exact[i]) raw.push(i); });
  w.uv(raw.length);
  let last = 0;
  for (const i of raw) { w.uv(i - last); last = i; for (const p of lists[i]) { w.f64(p[0]); w.f64(p[1]); } }
  const ocx = ox * 100, ocy = oy * 100;
  for (const axis of [0, 1]) {
    let prev = axis ? ocy : ocx;
    lists.forEach((L, i) => {
      if (!exact[i]) return;
      for (const p of L) { const c = cmOf(p[axis]); w.sv(c - prev); prev = c; }
    });
  }
}

function readPts(r, ox, oy) {
  const n = r.uv();
  const lens = new Array(n);
  for (let i = 0; i < n; i++) lens[i] = r.uv();
  const nr = r.uv(), raw = new Set(), out = new Array(n);
  let last = 0;
  for (let k = 0; k < nr; k++) {
    last += r.uv();
    raw.add(last);
    const L = new Array(lens[last]);
    for (let q = 0; q < L.length; q++) L[q] = [r.f64(), r.f64()];
    out[last] = L;
  }
  for (let i = 0; i < n; i++) if (!raw.has(i)) out[i] = new Array(lens[i]);
  for (const axis of [0, 1]) {
    let prev = axis ? oy * 100 : ox * 100;
    for (let i = 0; i < n; i++) {
      if (raw.has(i)) continue;
      const L = out[i];
      for (let q = 0; q < L.length; q++) {
        prev += r.sv();
        if (axis === 0) L[q] = [prev / 100, 0];
        else L[q][1] = prev / 100;
      }
    }
  }
  return out;
}

// rows: plain objects (keys in first-seen order); opts.tuple: rows are [x, y] points
export function writeTable(w, rows, strings, ox, oy, opts = {}) {
  if (opts.tuple) {
    w.u8(1);
    writePts(w, rows.map((p) => [p]), ox, oy);
    return;
  }
  w.u8(0);
  const keys = [];
  const seen = new Set();
  for (const o of rows) for (const k in o) if (!seen.has(k)) { seen.add(k); keys.push(k); }
  w.uv(rows.length);
  w.uv(keys.length);
  for (const key of keys) {
    w.uv(strings.id(key));
    const vals = rows.map((o) => (Object.prototype.hasOwnProperty.call(o, key) ? o[key] : undefined));
    const kinds = vals.map(kindOf);
    for (const k of kinds) w.u8(k);
    const pick = (kind) => vals.filter((v, i) => kinds[i] === kind);
    const nums = pick(K.NUM);
    if (nums.length) writeNums(w, nums, numMode(nums));
    for (const s of pick(K.STR)) w.uv(strings.id(s));
    const pts = pick(K.PTS);
    if (pts.length) writePts(w, pts, ox, oy);
    const lists = pick(K.NUMS);
    if (lists.length) {
      for (const L of lists) w.uv(L.length);
      const flat = lists.flat();
      if (flat.length) writeNums(w, flat, numMode(flat));
    }
    for (const j of pick(K.JSON)) w.uv(strings.id(JSON.stringify(j)));
  }
}

export function readTable(r, strings, ox, oy) {
  if (r.u8() === 1) return readPts(r, ox, oy).map((L) => L[0]);
  const n = r.uv(), nk = r.uv();
  const rows = new Array(n);
  for (let i = 0; i < n; i++) rows[i] = {};
  for (let c = 0; c < nk; c++) {
    const key = strings[r.uv()];
    const kinds = r.bytes(n);
    const count = (kind) => { let m = 0; for (let i = 0; i < n; i++) if (kinds[i] === kind) m++; return m; };
    const nn = count(K.NUM), ns = count(K.STR), np = count(K.PTS), nl = count(K.NUMS), nj = count(K.JSON);
    const nums = nn ? readNums(r, nn) : [];
    const strs = new Array(ns);
    for (let i = 0; i < ns; i++) strs[i] = strings[r.uv()];
    const pts = np ? readPts(r, ox, oy) : [];
    let lists = [];
    if (nl) {
      const lens = new Array(nl);
      let tot = 0;
      for (let i = 0; i < nl; i++) { lens[i] = r.uv(); tot += lens[i]; }
      const flat = tot ? readNums(r, tot) : [];
      let o = 0;
      lists = lens.map((L) => { const a = flat.slice(o, o + L); o += L; return a; });
    }
    const jsons = new Array(nj);
    for (let i = 0; i < nj; i++) jsons[i] = JSON.parse(strings[r.uv()]);
    let a = 0, b = 0, p = 0, l = 0, j = 0;
    for (let i = 0; i < n; i++) {
      switch (kinds[i]) {
        case K.ABSENT: break;
        case K.NULL: rows[i][key] = null; break;
        case K.FALSE: rows[i][key] = false; break;
        case K.TRUE: rows[i][key] = true; break;
        case K.NUM: rows[i][key] = nums[a++]; break;
        case K.STR: rows[i][key] = strs[b++]; break;
        case K.PTS: rows[i][key] = pts[p++]; break;
        case K.NUMS: rows[i][key] = lists[l++]; break;
        case K.JSON: rows[i][key] = jsons[j++]; break;
        default: throw new Error('gdt: unknown value kind ' + kinds[i]);
      }
    }
  }
  return rows;
}

class StringTable {
  constructor() { this.list = []; this.map = new Map(); }
  id(s) {
    let i = this.map.get(s);
    if (i === undefined) { i = this.list.length; this.list.push(s); this.map.set(s, i); }
    return i;
  }
}

// --------------------------------------------------------------- blobs

// sections: [{ type, version = 1, rows | json | raster | bytes, tuple }]
// origin: world [x0, y0] the points are relative to; [i, j] the tile (0, 0 for global blobs)
export function encodeBlob({ i = 0, j = 0, flags = 0, builder = 1, sections }) {
  const [ox, oy] = tileOrigin(i, j);
  const strings = new StringTable();
  const bodies = sections.map((s) => {
    const w = new Writer();
    let rows = 0;
    if (s.rows) { writeTable(w, s.rows, strings, ox, oy, { tuple: s.tuple }); rows = s.rows.length; }
    else if (s.json !== undefined) w.uv(strings.id(JSON.stringify(s.json)));
    else if (s.raster) {
      const R = s.raster;
      w.u16(R.w); w.u16(R.h); w.f32(R.cell); w.f64(R.x0); w.f64(R.y0); w.u8(R.codec || 0);
      w.bytes(R.data);
      rows = R.w * R.h;
    } else if (s.bytes) { w.uv(strings.id(s.name || '')); w.uv(s.bytes.length); w.bytes(s.bytes); }
    return { type: s.type, version: s.version || 1, rows, body: w.out() };
  });
  const sw = new Writer();
  sw.uv(strings.list.length);
  for (const s of strings.list) sw.str(s);
  const all = [{ type: SECTION.STRINGS, version: 1, rows: strings.list.length, body: sw.out() }, ...bodies];
  const head = 24 + all.length * 16;
  const w = new Writer(head + all.reduce((a, s) => a + s.body.length, 0));
  w.bytes(enc.encode('GDT1'));
  w.u16(GDT_FORMAT); w.u16(builder); w.i32(i); w.i32(j); w.u32(flags); w.u16(all.length); w.u16(0);
  let off = head;
  for (const s of all) { w.u16(s.type); w.u16(s.version); w.u32(off); w.u32(s.body.length); w.u32(s.rows); off += s.body.length; }
  for (const s of all) w.bytes(s.body);
  return w.out();
}

// The header and section table of a blob, without decoding the sections.
export function blobHeader(bytes) {
  const r = new Reader(bytes);
  if (dec.decode(r.bytes(4)) !== 'GDT1') throw new Error('gdt: not a tile blob');
  const format = r.u16(), builder = r.u16(), i = r.i32(), j = r.i32(), flags = r.u32(), n = r.u16();
  r.u16();
  if (format > GDT_FORMAT) throw new Error(`gdt: format ${format} is newer than this game (${GDT_FORMAT})`);
  const sections = [];
  for (let k = 0; k < n; k++) sections.push({ type: r.u16(), version: r.u16(), offset: r.u32(), length: r.u32(), rows: r.u32() });
  return { format, builder, i, j, flags, sections };
}

export function blobStrings(bytes, head = blobHeader(bytes)) {
  const s = head.sections.find((q) => q.type === SECTION.STRINGS);
  const r = new Reader(bytes, s.offset, s.offset + s.length);
  const n = r.uv(), out = new Array(n);
  for (let k = 0; k < n; k++) out[k] = r.str();
  return out;
}

// One section of a blob as data: rows, json, a raster or bytes.
export function decodeSection(bytes, sec, strings, i, j) {
  const [ox, oy] = tileOrigin(i, j);
  const r = new Reader(bytes, sec.offset, sec.offset + sec.length);
  switch (sec.type) {
    case SECTION.META: return { json: JSON.parse(strings[r.uv()]) };
    case SECTION.RASTER: {
      const w = r.u16(), h = r.u16(), cell = r.f32(), x0 = r.f64(), y0 = r.f64(), codec = r.u8();
      // bytes per cell by codec: 0 u8, 1 int16 cm, 2 float32 (terrainraster.js)
      return { raster: { w, h, cell, x0, y0, codec, data: r.bytes(sec.rows * (codec === 1 ? 2 : codec === 2 ? 4 : 1)) } };
    }
    case SECTION.BLOB: { const name = strings[r.uv()]; return { name, bytes: r.bytes(r.uv()) }; }
    default: return { rows: readTable(r, strings, ox, oy) };
  }
}

export function decodeBlob(bytes) {
  const head = blobHeader(bytes);
  const strings = blobStrings(bytes, head);
  const sections = head.sections.filter((s) => s.type !== SECTION.STRINGS).map((s) => ({ type: s.type, version: s.version, ...decodeSection(bytes, s, strings, head.i, head.j) }));
  return { ...head, sections };
}
