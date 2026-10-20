// Dubbel water (#231): waar liggen twee waterlagen over elkaar buiten de stad? Telt per streek, over de
// tegels van de provincie (game/world) en de stad (stad.json + OSM-lagen):
//   tiles       tegels met water
//   rows        waterrijen
//   flatOnly    rijen zonder nav (de oude platte laag: tekent alleen de verre LOD, geen vaarwater)
//   doubleM2    oppervlak dat door twee verschillende rijen wordt gedekt (4 m-raster), uit de tegels zelf
//   cityOverM2  oppervlak waar de stadskaart en de tegels van de provincie beide water hebben
// Daarnaast de lagen die water tekenen en op welke hoogte (zie de kop van waterlagen hieronder), want
// de oorzaak van #231 zat daar: de platte water van de verre LOD lag op de grond over het echte water.
//   node scripts/world/water_layers_audit.mjs [--strict] [--json] [--raw]   (zonder --raw: de dubbele rijen die het spel weglaat, game/js/waterdupes.js, tellen niet mee)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import '../node3d.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const G = await import('../../game/js/gdt.js');
const { streekOf } = await import('./prop_conflict_audit.mjs');
const { dropWaterDuplicates } = await import('../../game/js/waterdupes.js');

const CELL = 4;
// wat --strict toestaat: alleen dalen (gemeten op de tegels van 18 oktober)
export const LIMITS = { doubleShare: 0.085, cityOverShare: 0.01 };

// de lagen die water tekenen (voor de rapportage; de test bewaakt de belangrijkste regels)
export const LAYERS = [
  { id: 'oppervlak', file: 'scene3d.js syncWater / water3d.js buildWaterMesh', y: 'WATER_Y (-2.3)', note: 'het geanimeerde water van elke rij in map.waterNear, tot de zichtafstand' },
  { id: 'grond-masker', file: 'tilewatermask.js + countryfield.js', y: 'op de grond (opent het gat, bed BED_Y)', note: 'twee maskers: 2 m rond de speler, 8 m tot ~4 km; de grond opent erboven' },
  { id: 'verre-LOD', file: 'farlod.js MATS.waterStream', y: 'op de grond (y 0, polygonOffset 0.3)', note: 'vlak water van streamende tegels; sinds #231 alleen voorbij STREAM_WATER_R' },
];

const bounds = (P) => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const p of P) { if (p[0] < a) a = p[0]; if (p[0] > c) c = p[0]; if (p[1] < b) b = p[1]; if (p[1] > d) d = p[1]; } return [a, b, c, d]; };

// vult een polygon in een raster van cellen (even-oneven); fn(ix, iy)
function fill(pts, x0, y0, W, H, fn) {
  const b = bounds(pts);
  for (let iy = Math.max(0, Math.floor((b[1] - y0) / CELL)); iy <= Math.min(H - 1, Math.floor((b[3] - y0) / CELL)); iy++) {
    const y = y0 + (iy + 0.5) * CELL, xs = [];
    for (let k = 0, j = pts.length - 1; k < pts.length; j = k++) if ((pts[k][1] > y) !== (pts[j][1] > y)) xs.push(pts[k][0] + ((pts[j][0] - pts[k][0]) * (y - pts[k][1])) / (pts[j][1] - pts[k][1]));
    xs.sort((p, q) => p - q);
    for (let q = 0; q + 1 < xs.length; q += 2) for (let ix = Math.max(0, Math.ceil((xs[q] - x0) / CELL - 0.5)); ix <= Math.min(W - 1, Math.floor((xs[q + 1] - x0) / CELL - 0.5)); ix++) fn(ix, iy);
  }
}

// de dubbele dekking van een lijst rijen binnen een vierkant (cellen die twee rijen dekken), in m2
export function doubleArea(rows, box) {
  const W = Math.ceil((box[2] - box[0]) / CELL), H = Math.ceil((box[3] - box[1]) / CELL);
  const seen = new Uint8Array(W * H);
  let dbl = 0, any = 0;
  for (const r of rows) {
    // één rij telt een cel maar één keer
    const mine = new Set();
    fill(r.pts, box[0], box[1], W, H, (ix, iy) => { mine.add(iy * W + ix); });
    for (const k of mine) { if (seen[k] === 0) any++; else if (seen[k] === 1) dbl++; seen[k] = Math.min(2, seen[k] + 1); }
  }
  return { double: dbl * CELL * CELL, covered: any * CELL * CELL };
}

// het oppervlak waar twee lijsten rijen beide water hebben, in m2
export function overlapArea(a, b, box) {
  const W = Math.ceil((box[2] - box[0]) / CELL), H = Math.ceil((box[3] - box[1]) / CELL);
  const A = new Uint8Array(W * H);
  for (const r of a) fill(r.pts, box[0], box[1], W, H, (ix, iy) => { A[iy * W + ix] = 1; });
  let n = 0;
  const done = new Uint8Array(W * H);
  for (const r of b) fill(r.pts, box[0], box[1], W, H, (ix, iy) => { const k = iy * W + ix; if (A[k] && !done[k]) { done[k] = 1; n++; } });
  return n * CELL * CELL;
}

async function main() {
  const args = process.argv.slice(2);
  const out = path.join(ROOT, 'game/world');
  const file = path.join(out, 'index-provincie.json');
  if (!fs.existsSync(file)) { console.log('SKIP geen game/world met de provinciegegevens'); return; }
  const index = JSON.parse(fs.readFileSync(file, 'utf8'));
  const { loadCityData } = await import('../lib/loadworld.mjs');
  const city = await loadCityData({ extras: false });
  const cityWater = (city.water || []).map((w) => ({ pts: w.pts, b: bounds(w.pts) }));
  const fds = new Map();
  const per = {};
  let dropped = 0;
  for (const [key, t] of Object.entries(index.tiles)) {
    if (!t.n || !t.n.water || key[0] === 'o') continue;
    const p = index.packs[t.pack];
    if (!fds.has(p.file)) fds.set(p.file, fs.openSync(path.join(out, p.file), 'r'));
    const buf = Buffer.alloc(t.len);
    fs.readSync(fds.get(p.file), buf, 0, t.len, t.off);
    const blob = G.decodeBlob(new Uint8Array(zlib.inflateRawSync(buf)));
    let rows = ((blob.sections.find((s) => s.type === G.SECTION.WATER) || { rows: [] }).rows).filter((r) => r.pts && r.pts.length > 3);
    if (!rows.length) continue;
    // as the game loads them (--raw: as the tiles hold them) (TileWorld.addTile leaves the twins out, game/js/waterdupes.js)
    if (!args.includes('--raw')) { const gone = dropWaterDuplicates(rows); dropped += gone.size; rows = rows.filter((r) => !gone.has(r)); }
    const [ox, oy] = G.tileOrigin(t.i, t.j);
    const box = [ox, oy, ox + 1000, oy + 1000];
    const s = per[streekOf(ox + 500, oy + 500)] || (per[streekOf(ox + 500, oy + 500)] = { tiles: 0, rows: 0, flatOnly: 0, doubleM2: 0, coveredM2: 0, cityOverM2: 0 });
    s.tiles++; s.rows += rows.length; s.flatOnly += rows.filter((r) => r.nav === undefined).length;
    const d = doubleArea(rows, box);
    s.doubleM2 += d.double; s.coveredM2 += d.covered;
    const inCity = cityWater.filter((w) => w.b[2] >= box[0] && w.b[0] <= box[2] && w.b[3] >= box[1] && w.b[1] <= box[3]);
    if (inCity.length) s.cityOverM2 += overlapArea(rows, inCity, box);
  }
  for (const fd of fds.values()) fs.closeSync(fd);
  const total = Object.values(per).reduce((t, s) => { for (const [k, v] of Object.entries(s)) t[k] = (t[k] || 0) + v; return t; }, {});
  total.doubleShare = total.doubleM2 / (total.coveredM2 || 1);
  total.cityOverShare = total.cityOverM2 / (total.coveredM2 || 1);
  if (args.includes('--json')) { console.log(JSON.stringify({ per, total })); return; }
  console.log('lagen die water tekenen:');
  for (const l of LAYERS) console.log(`  ${l.id.padEnd(12)} ${l.file}  y: ${l.y}\n               ${l.note}`);
  console.log('\nstreek'.padEnd(18) + ['tegels', 'rijen', 'platOnly', 'dubbel ha', 'dekking ha', 'stad+tegel ha'].map((x) => x.padStart(14)).join(''));
  for (const [n, s] of Object.entries(per)) console.log(n.padEnd(17) + [s.tiles, s.rows, s.flatOnly, Math.round(s.doubleM2 / 1e4), Math.round(s.coveredM2 / 1e4), Math.round(s.cityOverM2 / 1e4)].map((x) => String(x).padStart(14)).join(''));
  if (!args.includes('--raw')) console.log(`(na het weglaten van ${dropped} dubbele rijen)`);
  console.log(`totaal: dubbel ${(total.doubleShare * 100).toFixed(2)} % van het water, stadskaart over tegels ${(total.cityOverShare * 100).toFixed(2)} %`);
  if (args.includes('--strict')) {
    const bad = Object.entries(LIMITS).filter(([k, v]) => total[k] > v);
    for (const [k, v] of bad) console.log(`TE VEEL ${k}: ${(total[k] * 100).toFixed(2)} % > ${v * 100} %`);
    if (bad.length) process.exit(1);
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main();
