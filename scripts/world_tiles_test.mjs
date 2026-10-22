// The .gdt tiles (game/js/gdt.js, scripts/world/pack_tiles.mjs):
//   node scripts/world_tiles_test.mjs
// - the codec: every value kind, exact doubles, centimetre points, float64
//   exceptions, -0 and odd numbers, strings, json, rasters, blobs
// - the packed world in game/world equals what the packer makes now from
//   stad.json + the OSM layers + mapextras.json (so it is not stale)
// - semantic round trip: decoding every tile and putting the objects back by
//   gid gives the GameMap's arrays exactly (same doubles, same keys)
// - byte round trip: decode + encode gives the same blob bytes, and the
//   hashes in the index match the blobs
// - every object sits in every tile its bounds touch
import './node3d.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const G = await import('../game/js/gdt.js');
const P = await import('./world/pack_tiles.mjs');

let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
// key order does not matter, the values must be the same doubles
const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((q) => [q, x[q]])) : x));
const sameBytes = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

// --- the codec on its own
{
  const rows = [
    { a: 1, b: 'x', c: [[330.01, 75.02], [-12000.5, 40000.25]], d: [0.28, 1.5, -2.25], e: true, f: null, g: { deep: [1, { two: 2 }] } },
    { a: 2.5, b: 'é ✓', c: [[0.1 + 0.2, 7]], d: [], e: false, h: -0, i: 1e-9 },
    { a: -7, c: [[1 / 3, 2]], d: [Math.PI], e: undefined, g: [] },
    { a: Number.MAX_SAFE_INTEGER, b: '', i: 123456.78 },
    {},
  ];
  const tree = [[1.5, 2.25], [-3, 4]];
  const blob = G.encodeBlob({ i: 3, j: -2, sections: [
    { type: G.SECTION.BUILDINGS, rows },
    { type: G.SECTION.TREES, rows: tree, tuple: true },
    { type: G.SECTION.META, json: { hello: ['wereld', 1.5] } },
    { type: G.SECTION.RASTER, raster: { w: 2, h: 3, cell: 8, x0: 330, y0: 75, data: new Uint8Array([1, 2, 3, 4, 5, 6]) } },
    { type: G.SECTION.BLOB, name: 'x.bin', bytes: new Uint8Array([9, 8, 7]) },
  ] });
  const d = G.decodeBlob(blob);
  ok(d.i === 3 && d.j === -2 && d.format === G.GDT_FORMAT, 'header');
  const want = rows.map((o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)));
  ok(canon(d.sections[0].rows) === canon(want), 'table round trip', canon(d.sections[0].rows));
  ok(Object.is(d.sections[0].rows[1].h, -0), '-0 kept');
  ok(d.sections[0].rows[1].c[0][0] === 0.1 + 0.2 && d.sections[0].rows[2].c[0][0] === 1 / 3, 'odd doubles in points kept exactly');
  ok(canon(d.sections[1].rows) === canon(tree), 'point tuples');
  ok(canon(d.sections[2].json) === canon({ hello: ['wereld', 1.5] }), 'json');
  ok(d.sections[3].raster.w === 2 && sameBytes(d.sections[3].raster.data, [1, 2, 3, 4, 5, 6]), 'raster');
  ok(d.sections[4].name === 'x.bin' && sameBytes(d.sections[4].bytes, [9, 8, 7]), 'blob');
  ok(sameBytes(G.encodeBlob({ i: 3, j: -2, sections: d.sections.map((s, k) => (k === 1 ? { ...s, tuple: true } : s)) }), blob), 'decode + encode gives the same bytes');
  // grid: the RD kilometre lines
  ok(G.tileKey(0, 0) === '234_581' && G.tileIndexOf(330, 75).join() === '0,0' && G.tileIndexOf(329.99, 74.99).join() === '-1,-1', 'grid on the RD kilometres');
  ok(G.tileFromKey(G.tileKey(-7, 12)).join() === '-7,12', 'tile keys');
  // varints across the full safe range
  const w = new G.Writer();
  const vals = [0, 1, -1, 127, 128, -129, 2 ** 31, -(2 ** 31) - 5, 2 ** 52, -(2 ** 52)];
  for (const v of vals) w.sv(v);
  const r = new G.Reader(w.out());
  ok(vals.every((v) => r.sv() === v), 'zigzag varints');
  ok(G.xxh32(new TextEncoder().encode('')) === 0x02cc5d05 && G.xxh32(new TextEncoder().encode('abc')) === 0x32d153ff, 'xxh32 reference values');
}

// --- the packed world
const src = await P.loadSourcesLaag();
const built = P.build(src);
// packed into a throwaway folder (game/world is a build artifact, not committed)
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-world-test-'));
process.on('exit', () => fs.rmSync(dir, { recursive: true, force: true }));
P.writeWorld(dir, built, new Set(built.blobs.keys()));
const index = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
const second = P.build(src);
ok([...built.blobs].every(([k, b]) => sameBytes(second.blobs.get(k).bytes, b.bytes)) && sameBytes(second.global, built.global), 'deterministic: a second build gives the same bytes');
const packBytes = {};
const blobOf = (e) => {
  const p = index.packs[e.pack];
  packBytes[p.file] = packBytes[p.file] || fs.readFileSync(path.join(dir, p.file));
  const raw = new Uint8Array(zlib.inflateRawSync(packBytes[p.file].subarray(e.off, e.off + e.len)));
  return raw;
};
ok(Object.keys(index.tiles).length === built.blobs.size, 'game/world has every tile the packer makes now (run node scripts/world/pack_tiles.mjs)');
let staleTiles = 0, hashBad = 0, reenc = 0;
const attrSeen = {};
const back = Object.fromEntries(P.KINDS.map(([k]) => [k, []]));
const heights = new Map();
const junctionsBack = new Map();
const poiRows = [];
for (const [key, e] of Object.entries(index.tiles)) {
  const raw = blobOf(e);
  if (G.hash64(raw) !== e.hash) hashBad++;
  const now = built.blobs.get(key);
  if (!now || !sameBytes(now.bytes, raw)) staleTiles++;
  const d = G.decodeBlob(raw);
  const again = G.encodeBlob({ i: d.i, j: d.j, flags: d.flags, builder: d.builder, sections: d.sections.map((s) => ({ ...s, tuple: false })) });
  if (!sameBytes(again, raw)) reenc++;
  for (const s of d.sections) {
    if (s.type === G.SECTION.RASTER) continue; // the AHN terrain (fetch_ahn.py), checked by terrain_test.mjs
    if (s.type === G.SECTION.NAV) continue;
    if (s.type === G.SECTION.POIS) { poiRows.push(s.rows); continue; } // the places of the meta, joined back below (poisections.js)
    if (s.type === G.SECTION.JUNCTIONS) { for (const row of s.rows) junctionsBack.set(row.k, row); continue; }
    if (s.type === G.SECTION.HEIGHTS) {
      for (const row of s.rows) {
        const have = heights.get(row.gid);
        if (have && canon(have) !== canon(row)) heights.conflict = (heights.conflict || 0) + 1;
        heights.set(row.gid, row);
      }
      continue;
    }
    const kind = P.KINDS.find(([, t]) => t === s.type)[0];
    for (const row of s.rows) {
      const gid = kind === 'trees' ? row.g : row.gid;
      const obj = kind === 'trees' ? (row.s !== undefined ? [row.p[0][0], row.p[0][1], row.s, row.h, row.f || 0] : row.p[0]) : row;
      if (kind !== 'trees') delete obj.gid;
      if (kind === 'buildings') for (const k of P.ATTR_KEYS) { if (k in obj) attrSeen[k] = (attrSeen[k] || 0) + 1; delete obj[k]; }
      const have = back[kind][gid];
      if (have && canon(have) !== canon(obj)) back[kind].conflict = (back[kind].conflict || 0) + 1;
      back[kind][gid] = obj;
    }
  }
}
ok(hashBad === 0, 'index hashes match the blobs', hashBad);
ok(staleTiles === 0, 'packed tiles are what the packer makes now', `${staleTiles} differ: run node scripts/world/pack_tiles.mjs`);
ok(reenc === 0, 'every tile: decode + encode gives the same bytes', reenc);
const gRaw = blobOf(index.global);
ok(G.hash64(gRaw) === index.global.hash && sameBytes(gRaw, built.global), 'global blob current and intact');
// the junctions section: the junction model, one row per junction, as junctions.js makes it
{
  const { junctionRows } = await import('../game/js/junctions.js');
  const want = junctionRows(src.map);
  ok(want.length > 1000 && junctionsBack.size === want.length && want.every((r) => canon(junctionsBack.get(r.k)) === canon(r)), `junctions: ${want.length} junctions back exactly`, `${junctionsBack.size}`);
}
// the heights section: every profiled road's profile, once per road, joined back by gid
{
  const want = src.map.roads.map((r, gid) => [r, gid]).filter(([r]) => r.z);
  ok(!heights.conflict, 'heights: copies in different tiles agree', heights.conflict);
  // (a road that has only a terrain profile, zt without z, has a row too, #269)
  const tOnly = src.map.roads.filter((r) => !r.z && r.zt && r.zt.length).length;
  ok(heights.size === want.length + tOnly && want.every(([r, gid]) => {
    const h = heights.get(gid);
    return h && h.z.length === r.z.length && h.z.every((v, i) => v === r.z[i]) && h.st.length === r.pts.length - 1 && Number.isInteger(h.pnet);
  }), `heights: ${want.length} profiles back exactly, with structure and network`, `${heights.size}`);
  for (const [gid, h] of heights) if (back.roads[gid]) back.roads[gid].z = h.z;
}
const withoutAttrs = (o) => { for (const k of P.ATTR_KEYS) delete o[k]; return o; };
for (const [kind] of P.KINDS) {
  // (a building's height attributes are the join's, compared below; the map's own copy of them is left out too)
  const want = (src.map[kind] || []).map((o) => (kind === 'trees' ? o : kind === 'buildings' ? withoutAttrs(P.cleanRow(o)) : P.cleanRow(o)));
  const got = back[kind];
  ok(!got.conflict, `${kind}: copies in different tiles agree`, got.conflict);
  ok(got.length === want.length && want.every((o, i) => got[i] && canon(got[i]) === canon(o)), `${kind}: ${want.length} objects back exactly`, `${got.filter(Boolean).length}/${want.length}`);
}
ok((attrSeen.hm || 0) >= src.map.buildings.length && (attrSeen.hsrc || 0) >= src.map.buildings.length, 'every building row carries hm and hsrc', JSON.stringify(attrSeen));
ok((attrSeen.year || 0) > 10000 && (attrSeen.bag || 0) > 10000, 'BAG year and id joined from the OSM tags', `${attrSeen.year} ${attrSeen.bag}`);
// the 3D BAG join (F1 brings the data; the join is tested with made-up records)
{
  const b = src.map.buildings.find((q) => q.pts.length >= 4 && !q.landmark);
  const xs = b.pts.map((p) => p[0]), ys = b.pts.map((p) => p[1]);
  const c = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
  const inside = b.pts.reduce((a, p) => [a[0] + p[0] / b.pts.length, a[1] + p[1] / b.pts.length], [0, 0]);
  const area = Math.abs(b.pts.reduce((a, p, i) => { const q = b.pts[(i + 1) % b.pts.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);
  const j = P.joinAttrs([b], { osm: [{ id: 1, c: inside, a: area, h: 11.5, roof: 'gabled', year: 1931, bag: '0014100000012345' }], bag: [{ id: 'NL.IMBAG.Pand.0014100000012345', c: inside, a: area, hmax: 4.8, h50: 4.1, hg: -0.4, roof: 'slanted' }] });
  const f = j.fields.get(b);
  ok(f.hsrc === '3dbag' && f.hm === 5.2 && f.hmax === 4.8 && f.hg === -0.4 && f.h50 === 4.1 && f.roof === 'gabled' && f.year === 1931, '3D BAG beats the OSM height, by BAG id', JSON.stringify(f));
  const k = P.joinAttrs([b], { osm: [{ id: 1, c: inside, a: area, h: 11.5 }], bag: [] }).fields.get(b);
  ok(k.hsrc === 'osm_height' && k.hm === 11.5, 'then the OSM height');
  const l = P.joinAttrs([b], { osm: [{ id: 1, c: inside, a: area, lv: 4 }], bag: [] }).fields.get(b);
  ok(l.hsrc === 'osm_levels' && l.hm === 12.4, 'then the levels');
  const d = P.joinAttrs([b], { osm: [], bag: [] }).fields.get(b);
  ok(d.hsrc === 'default' && d.hm === Math.round((b.h || 1) * 3.1 * 100) / 100, 'last the type default');
}
// the global layer
{
  const d = G.decodeBlob(gRaw);
  const meta = Object.assign({}, ...d.sections.filter((s) => s.type === G.SECTION.META).map((s) => s.json));
  const { joinMeta } = await import('../game/js/poisections.js');
  ok(canon(joinMeta(meta.meta, poiRows)) === canon(src.map.meta), 'meta round trip (the places joined back from their tiles)');
  ok(!d.sections.some((s) => s.type === G.SECTION.BLOB), 'the global blob holds no blobs');
}
// every object in every tile it touches (the bounds rule of the packer)
{
  let missing = 0;
  const has = new Map(Object.entries(index.tiles).map(([k]) => [k, null]));
  for (const [key] of has) {
    const d = G.decodeBlob(blobOf(index.tiles[key]));
    has.set(key, new Set(d.sections.filter((s) => s.type === G.SECTION.BUILDINGS).flatMap((s) => s.rows.map((r) => r.gid))));
  }
  src.map.buildings.forEach((b, gid) => {
    if (gid % 7) return;
    const bb = b.pts.reduce((a, p) => [Math.min(a[0], p[0]), Math.min(a[1], p[1]), Math.max(a[2], p[0]), Math.max(a[3], p[1])], [Infinity, Infinity, -Infinity, -Infinity]);
    for (const [i, j] of P.tilesOf(bb)) if (!has.get(G.tileKey(i, j)) || !has.get(G.tileKey(i, j)).has(gid)) missing++;
  });
  ok(missing === 0, 'buildings in every tile their bounds touch', missing);
}

console.log(`${n - fails}/${n} passed`);
process.exit(fails ? 1 : 0);
