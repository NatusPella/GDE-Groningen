// Audit of the AHN terrain of the province (issue #78; fetch_ahn.py --province):
//   node scripts/world/terrain_audit.mjs [--osm]
// Hard checks (exit 1): every tile of index-provincie.json has a raster, the file size
// fits w x h, no hole (no data) and no height outside -15 .. 60 m NAP is left.
// Reported: steps over the tile borders, the steepest cells, the bridges of the road
// net (AHN has no data under a viaduct: the filled terrain there must run smooth between the ends,
// the deck itself is the viaduct rules of #8), and with --osm the dykes of the OSM packs
// (data/cache/province): how many stand out of the terrain beside them.
import '../node3d.mjs';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { loadTerrainRasters } from './terrain.mjs';
import { NODATA, TerrainField } from '../../game/js/terrainraster.js';
import { decodeRoadNet } from '../../game/js/roadgraph.js';
import { wgsToWorld } from '../../game/js/rdnew.js';
import * as G from '../../game/js/gdt.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
let hard = 0;
const fail = (m) => { hard++; console.log('FAIL ' + m); };
const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : 0; };

const rasters = loadTerrainRasters(ROOT);
const provIdx = ['game/world', 'desktop/build/game/world'].map((d) => path.join(ROOT, d, 'index-provincie.json')).find((f) => fs.existsSync(f));
if (!rasters.size) { console.log('SKIP no rasters (python scripts/world/fetch_ahn.py --province --fetch)'); process.exit(0); }

// coverage and integrity
const keys = provIdx ? Object.values(JSON.parse(fs.readFileSync(provIdx, 'utf8')).tiles).map((t) => G.tileKey(t.i, t.j)) : [];
const missing = keys.filter((k) => !rasters.has(k));
if (provIdx && missing.length) fail(`${missing.length} province tiles without a raster (first: ${missing.slice(0, 5).join(', ')})`);
let cells = 0, holes = 0, lo = Infinity, hi = -Infinity;
const field = new TerrainField();
let fine = 0;
for (const [k, r] of rasters) {
  if (r.data.length !== r.w * r.h * 2) fail(`${k}: ${r.data.length} bytes for ${r.w} x ${r.h}`);
  const dv = new DataView(r.data.buffer, r.data.byteOffset, r.data.byteLength);
  let bad = 0;
  for (let c = 0; c < r.w * r.h; c++) {
    const v = dv.getInt16(c * 2, true);
    cells++;
    if (v === NODATA) { holes++; bad++; continue; }
    lo = Math.min(lo, v / 100); hi = Math.max(hi, v / 100);
    if (v < -1500 || v > 6000) { bad++; }
  }
  if (bad) fail(`${k}: ${bad} cells without data or out of range`);
  if (r.cell <= 10) fine++;
  field.add(k, r);
}
console.log(`${rasters.size} rasters (${fine} at <= 10 m), ${cells} cells, ${holes} holes, heights ${lo.toFixed(1)} .. ${hi.toFixed(1)} m NAP`);

// the steps over the borders of neighbouring tiles, 50 m apart across the line
const steps = [];
let steep = 0;
for (const [k, r] of rasters) {
  const x1 = r.x0 + r.w * r.cell, y1 = r.y0 + r.h * r.cell;
  for (let t = 5; t < 1000; t += 10) {
    for (const [ax, ay, bx, by] of [[x1 - 3, r.y0 + t, x1 + 3, r.y0 + t], [r.x0 + t, y1 - 3, r.x0 + t, y1 + 3]]) {
      const a = field.at(ax, ay), b = field.at(bx, by);
      if (a !== 0 && b !== 0) steps.push(Math.abs(a - b));
    }
  }
  const dv = new DataView(r.data.buffer, r.data.byteOffset, r.data.byteLength);
  for (let j = 0; j < r.h - 1; j++) for (let i = 0; i < r.w - 1; i++) {
    const v = dv.getInt16((j * r.w + i) * 2, true), u = dv.getInt16((j * r.w + i + 1) * 2, true);
    if (Math.abs(v - u) / 100 / r.cell > 0.6) steep++;
  }
}
console.log(`border steps (6 m across): median ${pct(steps, 0.5).toFixed(2)} m, p99 ${pct(steps, 0.99).toFixed(2)} m, max ${Math.max(0, ...steps).toFixed(2)} m; ${steep} cell pairs steeper than 0.6 m/m`);
if (pct(steps, 0.99) > 3) fail('tiles step more than 3 m at their borders (p99)');

// bridges of the province road net: filled terrain smooth between the ends
const roadsFile = ['game/world', 'desktop/build/game/world'].map((d) => path.join(ROOT, d, 'provincie-roads.json.gz')).find((f) => fs.existsSync(f));
if (roadsFile) {
  const rows = decodeRoadNet(JSON.parse(zlib.gunzipSync(fs.readFileSync(roadsFile)).toString()));
  let n = 0, rough = 0, worst = 0;
  for (const r of rows) {
    if (!r.bridge || r.pts.length < 2) continue;
    const a = r.pts[0], b = r.pts[r.pts.length - 1];
    if (!rasters.size || Math.hypot(b[0] - a[0], b[1] - a[1]) < 30) continue;
    const za = field.at(a[0], a[1]), zb = field.at(b[0], b[1]);
    let dev = 0;
    for (let t = 0.1; t < 1; t += 0.1) dev = Math.max(dev, Math.abs(field.at(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t) - (za + (zb - za) * t)));
    n++; worst = Math.max(worst, dev);
    if (dev > 2) rough++;
  }
  console.log(`${n} bridges: terrain under them deviates ${worst.toFixed(2)} m at most from the line between the ends; ${rough} over 2 m (river valleys and dyke crossings)`);
}

// the dykes of the OSM packs
if (args.includes('--osm')) {
  const dir = path.join(ROOT, 'data/cache/province');
  let dykes = 0, standing = 0, nocover = 0;
  for (const f of fs.readdirSync(dir).filter((q) => /^[a-z]-?\d+_-?\d+\.json\.gz$/.test(q))) {
    const els = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir, f)))).elements || [];
    for (const e of els) {
      const t = e.tags || {};
      if (e.type !== 'way' || !e.g || e.g.length < 3 || !(t.man_made === 'dyke' || t.embankment === 'dyke')) continue;
      const P = e.g.map(([la, lo]) => wgsToWorld(la, lo));
      let len = 0;
      for (let i = 1; i < P.length; i++) len += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
      if (len < 100) continue;
      dykes++;
      let up = 0, m = 0, covered = true;
      for (let i = 0; i + 1 < P.length; i++) {
        const dx = P[i + 1][0] - P[i][0], dy = P[i + 1][1] - P[i][1], l = Math.hypot(dx, dy) || 1;
        const nx = -dy / l, ny = dx / l;
        const px = (P[i][0] + P[i + 1][0]) / 2, py = (P[i][1] + P[i + 1][1]) / 2;
        const top = field.at(px, py), side = (field.at(px + nx * 40, py + ny * 40) + field.at(px - nx * 40, py - ny * 40)) / 2;
        if (!rasters.size) covered = false;
        up += top - Math.min(side, field.at(px + nx * 40, py + ny * 40), field.at(px - nx * 40, py - ny * 40)) > 0.8 ? 1 : 0;
        m++;
      }
      if (!covered) nocover++;
      if (m && up / m > 0.5) standing++;
    }
  }
  console.log(`${dykes} dyke ways of 100 m+: ${standing} stand at least 0.8 m above the lower side over most of their length (${nocover} without terrain)`);
}

console.log(hard ? `${hard} hard failures` : 'terrain audit ok');
process.exit(hard ? 1 : 0);
