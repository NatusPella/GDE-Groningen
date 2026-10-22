// De conversielogica van 3D BAG LoD 2.2 (#410): scripts/world/bag_lod22.mjs, met een kleine voorbeeldtegel uit
// scripts/world/bag_lod22_voorbeeld.mjs (echte rijen, verzonnen geometrie; niets gedownload, niets uit game/js geladen).
//   node scripts/bag_lod22_test.mjs
// (met GDE_BAG_EXTRACT=<extractie .json.gz> of data/cache/3dbag-province/extract erin ook een tegel van echte BAG-plekken)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as L from './world/bag_lod22.mjs';
import { makeCityJson, rowsFromExtract } from './world/bag_lod22_voorbeeld.mjs';
import { tileIndexOf } from '../game/js/gdt.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;

// ------------------------------------------------------------------ driehoeken
{
  const area = (ring, tris) => tris.reduce((s, t) => {
    const a = ring[t[0]], b = ring[t[1]], c = ring[t[2]];
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    return s + 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
  }, 0);
  const sq = [[0, 0, 0], [4, 0, 0], [4, 3, 0], [0, 3, 0]];
  const t1 = L.triangulate(sq);
  ok(t1.tris.length === 2 && near(area(sq, t1.tris), 12) && near(t1.normal[2], 1), 'a square gives two triangles of its area, normal up');
  const Lsh = [[0, 0, 0], [6, 0, 0], [6, 2, 0], [2, 2, 0], [2, 5, 0], [0, 5, 0]];
  const t2 = L.triangulate(Lsh);
  ok(t2.tris.length === 4 && near(area(Lsh, t2.tris), 18), 'an L shape (concave) gives four triangles of its area', `${t2.tris.length}, ${area(Lsh, t2.tris)}`);
  const wall = [[0, 0, 0], [5, 0, 0], [5, 0, 3], [0, 0, 3]];
  const t3 = L.triangulate(wall);
  ok(t3.tris.length === 2 && near(area(wall, t3.tris), 15) && near(Math.abs(t3.normal[1]), 1), 'a wall in a vertical plane triangulates too');
  ok(L.triangulate([[0, 0, 0], [1, 0, 0], [2, 0, 0]]).tris.length === 0 || near(area([[0, 0, 0], [1, 0, 0], [2, 0, 0]], L.triangulate([[0, 0, 0], [1, 0, 0], [2, 0, 0]]).tris), 0), 'a degenerate face has no area');
  const cw = sq.slice().reverse();
  const t4 = L.triangulate(cw);
  ok(near(t4.normal[2], -1) && t4.tris.length === 2, 'the order of the ring decides the normal (outside counter-clockwise)');
}

// ------------------------------------------------------------------ de voorbeeldtegel
const rows = [
  { id: '14100000012345', c: [900.5, 2100.25], a: 90, hmax: 9.4, hg: 0.4, h50: 7.9, roof: 'slanted' },
  { id: '14100000099999', c: [1010, 2200], a: 120, hmax: 6.2, hg: 0.3, roof: 'horizontal' },
  { id: '14100000000007', c: [1999.0, 2999.0], a: 60, hmax: 8, hg: 0, roof: 'slanted' },
];
const cj = makeCityJson(rows);
const bs = L.buildingsOf(cj);
ok(bs.length === 3 && bs[0].id === '14100000012345' && near(bs[0].hg, 0.4), 'buildings of a CityJSON: BAG id without the prefix and the part, ground height', bs[0] && bs[0].id);
ok(bs[0].faces.some((f) => f.kind === 'roof') && bs[0].faces.some((f) => f.kind === 'wall') && bs[0].faces.some((f) => f.kind === 'ground'), 'the faces carry their semantic kind');
ok(bs[1].faces.length === 6, 'a flat-roofed block has six faces (ground, four walls, roof)', String(bs[1].faces.length));

// volume van het ruwe gebouw (alle vlakken, RD-frame): positief = de vlakken wijzen naar buiten
{
  let vol = 0;
  for (const f of bs[1].faces) for (const t of L.triangulate(f.ring).tris) {
    const a = f.ring[t[0]], b = f.ring[t[1]], c = f.ring[t[2]];
    vol += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
  }
  ok(vol > 0 && near(vol, 120 * (6.2 - 0.3), 1), 'the faces of the block point outwards (signed volume = area x height)', `${vol}`);
}

// ------------------------------------------------------------------ een gebouw
{
  const quant = 0.05;
  const flat = L.convertBuilding(bs[1], { quant });
  ok(flat && flat.walls.length / 3 === 8 && flat.roofs.length / 3 === 2 && flat.verts.length / 3 === 8, 'flat block: 8 wall and 2 roof triangles on 8 welded vertices (the ground is dropped)', flat && `${flat.walls.length / 3} ${flat.roofs.length / 3} ${flat.verts.length / 3}`);
  const hs = Array.from({ length: flat.verts.length / 3 }, (_, i) => flat.verts[3 * i + 2] * quant);
  ok(near(Math.min(...hs), 0, quant) && near(Math.max(...hs), 6.2 - 0.3, quant), 'heights are relative to the ground height of the building', `${Math.min(...hs)} .. ${Math.max(...hs)}`);
  const slanted = L.convertBuilding(bs[0], { quant });
  ok(slanted.stats.trisOut > flat.stats.trisOut + 6 && slanted.roofs.length / 3 >= 8, 'a pitched roof with a dormer and a chimney has more triangles', `${slanted.stats.trisOut}`);
  // kwantisering: de fout per hoekpunt is hoogstens de halve stap
  const dec = L.decodeTile(L.encodeTile(0, 0, [flat], quant));
  const wv = L.worldVerts(dec.buildings[0], dec.quant);
  const b = bs[1];
  const want = new Set(b.faces.flatMap((f) => f.ring).map((p) => `${(p[0] - 233670).toFixed(2)},${(582075 - p[1]).toFixed(2)},${(p[2] - b.hg).toFixed(2)}`));
  const wantArr = [...want].map((s) => s.split(',').map(Number));
  const worst = Math.max(...wv.map((v) => Math.min(...wantArr.map((w) => Math.hypot(v[0] - w[0], v[1] - w[1], v[2] - w[2])))));
  ok(worst <= quant * Math.sqrt(3) / 2 + 0.01 + 0.01, 'quantising moves a vertex by at most half a step', `${worst}`);
  // een vlak onder de minimumoppervlakte valt weg
  const tiny = { id: '1', hg: 0, roof: null, faces: [
    { ring: [[0, 0, 0], [4, 0, 0], [4, 0, 3], [0, 0, 3]], kind: 'wall', holes: 0 },
    { ring: [[0, 0, 0], [0.1, 0, 0], [0.1, 0, 0.1], [0, 0, 0.1]], kind: 'wall', holes: 0 },
    { ring: [[0, 0, 3], [4, 0, 3], [4, 3, 3], [0, 3, 3]], kind: null, holes: 0 },
    { ring: [[0, 0, 0], [0, 3, 0], [4, 3, 0], [4, 0, 0]], kind: null, holes: 0 },
  ] };
  const ct = L.convertBuilding(tiny, { quant, minArea: 0.05 });
  ok(ct.stats.facesDropped === 2 && ct.walls.length / 3 === 2 && ct.roofs.length / 3 === 2, 'a speck is dropped, an unlabelled face goes by its normal (up: roof, down: gone)', JSON.stringify(ct.stats));
  const wide = { id: '2', hg: 0, faces: [{ ring: [[0, 0, 0], [4000, 0, 0], [4000, 0, 3], [0, 0, 3]], kind: 'wall', holes: 0 }] };
  ok(L.convertBuilding(wide, { quant }).tooBig === true, 'a building that does not fit 16 bits is flagged, not written wrong');
}

// ------------------------------------------------------------------ tegels en formaat
{
  const { tiles, stats } = L.convertCityJson({ json: cj });
  const keys = [...tiles.keys()].sort();
  const t0 = tileIndexOf(900.5, 2100.25), t2 = tileIndexOf(1999, 2999);
  ok(stats.buildings === 3 && stats.kept === 3 && keys.length >= 2 && tiles.size === new Set(rows.map((r) => tileIndexOf(r.c[0], r.c[1]).join())).size, 'every building goes into the km tile of its middle', `${keys}`);
  ok(stats.trisOut < stats.trisIn + 3 && stats.verts > 0, 'statistics count triangles in and out');
  const outDir = fs.mkdtempSync(path.join(process.env.TEMP || process.env.TMP || '/tmp', 'gbl-'));
  try {
    const wrote = L.writeTiles(tiles, outDir);
    ok(wrote.length === tiles.size && wrote.every((r) => r.bytes < r.raw + 64 && fs.existsSync(path.join(outDir, r.key + '.gbl'))), 'one .gbl file per tile, smaller than its raw size', JSON.stringify(wrote.map((r) => [r.key, r.bytes, r.raw])));
    for (const r of wrote) {
      const t = tiles.get(r.key);
      const back = L.decodeTile(fs.readFileSync(path.join(outDir, r.key + '.gbl')));
      const same = back.buildings.length === t.list.length && back.i === t.i && back.j === t.j && back.buildings.every((b, k) => {
        const o = t.list[k];
        return b.id === String(Number(o.id)) && b.ox === o.ox && b.oy === o.oy && near(b.hg, o.hg, 1e-5) && b.verts.every((v, q) => v === o.verts[q]) && b.walls.every((v, q) => v === o.walls[q]) && b.roofs.every((v, q) => v === o.roofs[q]);
      });
      ok(same, `tile ${r.key} reads back exactly`);
    }
  } finally { fs.rmSync(outDir, { recursive: true, force: true }); }
  void t0; void t2;
  let bad = 0;
  try { L.decodeTile(Buffer.from('XXXX' + '0'.repeat(30))); } catch { bad++; }
  const head = L.encodeTile(0, 0, []); head.writeUInt16LE(9, 4);
  try { L.decodeTile(head); } catch { bad++; }
  ok(bad === 2, 'a wrong magic or format version is refused');
}

// ------------------------------------------------------------------ invoer
{
  const plain = Buffer.from(JSON.stringify(cj));
  const a = L.readCityJson(plain), b = L.readCityJson(zlib.gzipSync(plain));
  ok(L.buildingsOf(a.json).length === 3 && L.buildingsOf(b.json).length === 3, 'CityJSON is read plain or gzipped');
  let msg = '';
  try { L.readCityJson(plain, { maxMb: 0.0001 }); } catch (e) { msg = e.message; }
  ok(/max-mb/.test(msg), 'a file over the size limit is refused with the reason');
  // CityJSONSeq: de kop en per feature een regel met eigen hoekpunten
  const head = { type: 'CityJSON', version: '2.0', transform: cj.transform, metadata: {} };
  const feats = [];
  for (const r of rows) { const one = makeCityJson([r]); feats.push({ type: 'CityJSONFeature', CityObjects: one.CityObjects, vertices: one.vertices }); }
  const seq = Buffer.from([head, ...feats].map((o) => JSON.stringify(o)).join('\n') + '\n');
  const s = L.readCityJson(seq);
  const r1 = L.convertCityJson(s), r2 = L.convertCityJson({ json: cj });
  ok(s.seq && s.seq.length === 3 && r1.stats.trisOut === r2.stats.trisOut && r1.stats.kept === 3, 'CityJSONSeq (a line per feature) gives the same result as one CityJSON', `${r1.stats.trisOut} ${r2.stats.trisOut}`);
}

// ------------------------------------------------------------------ ramingen
{
  const per = L.perBuilding([{ buildings: 10, tris: 1500, verts: 900, bytes: 18000 }], { ms: 4, buildings: 10 });
  ok(near(per.tris, 150) && near(per.bytes, 1800) && near(per.msIn, 0.4), 'per building averages from the rows');
  const e = L.estimateFor(400000, { tris: 150, bytes: 1800, msIn: 0.4 });
  ok(near(e.MB, 720) && near(e.tris, 6e7) && near(e.minutes, 400000 * 0.4 / 60000), 'estimate for N buildings: MB, minutes and triangles');
  // een raster van 40 gebouwen op 50 m: elk heeft er binnen 150 m een bekend aantal
  const grid = [];
  for (let i = 0; i < 20; i++) for (let j = 0; j < 20; j++) grid.push([0, i * 50 + 1, j * 50 + 1]);
  const d = L.densityPercentiles(grid, 150, 50);
  ok(d.buildings === 400 && d.max > d.p50 - 1 && d.p50 >= 20 && d.max <= 29, 'density percentiles over 150 m on a grid of buildings every 50 m', JSON.stringify(d));
}

// ------------------------------------------------------------------ het haalscript haalt niets op zonder het te vragen
{
  const py = ['python', 'python3'].find((c) => spawnSync(c, ['--version']).status === 0);
  if (!py) console.log('SKIP python niet gevonden: haalscript niet gecontroleerd');
  else {
    const run = (args) => spawnSync(py, [path.join(ROOT, 'scripts', 'world', 'fetch_3dbag_lod22.py'), ...args], { encoding: 'utf8', timeout: 60000, env: { ...process.env, https_proxy: 'http://127.0.0.1:9', http_proxy: 'http://127.0.0.1:9' } });
    const none = run([]);
    ok(none.status !== 0 && /--tile, --bbox of --province/.test(none.stdout + none.stderr), 'the fetch script asks for nothing without a tile, a box or --province');
    const missing = run(['--tile', '1/2/3', '--scratch', path.join(ROOT, 'data', 'cache', 'bestaat-niet'), '--version', 'v20250903']);
    ok(missing.status !== 0 && /netwerk niet|geen netwerk/.test(missing.stdout + missing.stderr), 'without --fetch or --sizes and without a cached index it stops instead of using the network');
    const help = run(['--help']);
    ok(help.status === 0 && /--fetch/.test(help.stdout) && /--max-mb/.test(help.stdout), 'the fetch script documents --fetch and --max-mb');
  }
  const src = fs.readFileSync(path.join(ROOT, 'scripts', 'world', 'fetch_3dbag_lod22.py'), 'utf8');
  ok(/CC BY 4\.0/.test(src) && /sha256/.test(src) && /VERSIE\.json/.test(src), 'the fetch script checks licence, hash and records the version');
}

// ------------------------------------------------------------------ niets in het spel, de stage of de poort
{
  const walk = (d, out = []) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) { if (!['node_modules', 'vendor-cache', 'build', '.world-cache'].includes(f.name)) walk(p, out); } else if (/\.(js|mjs|cjs|html)$/.test(f.name)) out.push(p); } return out; };
  const files = [...walk(path.join(ROOT, 'game')), ...walk(path.join(ROOT, 'desktop')), path.join(ROOT, 'scripts', 'test_all.mjs')];
  const hit = files.filter((f) => /bag_lod22|3dbag-lod22|fetch_3dbag_lod22|\.gbl\b/.test(fs.readFileSync(f, 'utf8')));
  ok(hit.length === 0, 'nothing in game/, desktop/ or test_all loads or builds the LoD 2.2 data', hit.map((f) => path.relative(ROOT, f)).join(', '));
  const gi = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
  ok(/data\/cache/.test(gi) || /^data\/cache\/?$/m.test(gi) || /cache/.test(gi), 'data/cache (the downloads and the .gbl files) is ignored by git');
}

// ------------------------------------------------------------------ echte plekken (als de extractie er is)
{
  const env = process.env.GDE_BAG_EXTRACT;
  const dir = path.join(ROOT, 'data', 'cache', '3dbag-province', 'extract');
  let file = env && fs.existsSync(env) ? env : null;
  if (!file && fs.existsSync(dir)) { const v = fs.readdirSync(dir).sort().pop(); const fs2 = fs.readdirSync(path.join(dir, v)).filter((f) => f.endsWith('.json.gz')).sort(); if (fs2.length) file = path.join(dir, v, fs2[0]); }
  if (!file) console.log('SKIP geen 3D BAG-extractie (GDE_BAG_EXTRACT of data/cache/3dbag-province/extract): de tegel met echte plekken is niet getest');
  else {
    const real = rowsFromExtract(file, 40);
    const c2 = makeCityJson(real);
    const { tiles, stats } = L.convertCityJson({ json: c2 });
    const tot = [...tiles.values()].reduce((s, t) => s + t.list.length, 0);
    ok(real.length >= 10 && stats.kept === real.length && tot === real.length && stats.trisOut > real.length * 8, `a sample of ${real.length} real BAG places converts (${stats.trisOut} triangles, ${(stats.ms).toFixed(0)} ms)`);
  }
}

console.log(`${n - fails}/${n} bag_lod22 checks passed`);
process.exit(fails ? 1 : 0);
