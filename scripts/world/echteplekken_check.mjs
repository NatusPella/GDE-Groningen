// Rapport bij game/echteplekken.json (#174): de padellocaties en Pitch & Putt-banen met hun
// afstand tot de dichtstbijzijnde weg, uit de pack-caches van de provincie-extract.
//   node scripts/world/echteplekken_check.mjs [--packs data/cache/province] [--md rapport.md]
// 'weg' = elke highway behalve voet-, fiets-, ruiter- en trappaden; 'pad' = ook die.
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { wgsToWorld } from '../../game/js/rdnew.js';
import { padelDefs, golfVenues, afstandTotLijnen } from '../../game/js/echteplekken.js';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const root = path.resolve(here, '../..');
const packsDir = arg('--packs', path.join(root, 'data/cache/province'));
const data = JSON.parse(fs.readFileSync(path.join(root, 'game/echteplekken.json'), 'utf8'));

const GRID_X0 = 330, GRID_Y0 = 75, TILE_M = 1000, PACK = 8;
const PATH_ONLY = new Set(['footway', 'path', 'cycleway', 'bridleway', 'steps', 'pedestrian', 'corridor', 'proposed', 'construction', 'platform']);
const packCache = new Map();
function roadsOf(pi, pj) {
  const k = pi + '_' + pj;
  if (!packCache.has(k)) {
    const f = path.join(packsDir, `c${k}.json.gz`);
    const lines = [];
    if (fs.existsSync(f)) {
      for (const el of JSON.parse(zlib.gunzipSync(fs.readFileSync(f))).elements) {
        if (el.type !== 'way' || !el.tags || !el.tags.highway || !el.g) continue;
        lines.push({ hw: el.tags.highway, pts: el.g.map(([la, lo]) => wgsToWorld(la, lo)) });
      }
    }
    packCache.set(k, lines);
  }
  return packCache.get(k);
}
const packOf = (x, y) => [Math.floor(Math.floor((x - GRID_X0) / TILE_M) / PACK), Math.floor(Math.floor((y - GRID_Y0) / TILE_M) / PACK)];

// { weg, pad, bekend }: afstand (m) tot de dichtstbijzijnde weg en tot elk pad; bekend=false zonder pack-data
function roadDistances(x, y) {
  const seen = new Set();
  let weg = Infinity, pad = Infinity, bekend = false;
  for (const [dx, dy] of [[0, 0], [300, 0], [-300, 0], [0, 300], [0, -300]]) {
    const [pi, pj] = packOf(x + dx, y + dy);
    const k = pi + '_' + pj;
    if (seen.has(k)) continue;
    seen.add(k);
    const lines = roadsOf(pi, pj);
    if (lines.length) bekend = true;
    pad = Math.min(pad, afstandTotLijnen(lines, x, y));
    weg = Math.min(weg, afstandTotLijnen(lines.filter((r) => !PATH_ONLY.has(r.hw)), x, y));
  }
  return { weg, pad, bekend };
}

const fmt = (d) => (Number.isFinite(d) ? Math.round(d) + ' m' : '> 300 m');
const rows = [];
const gebied = (x, y) => (Math.hypot(x, y) < 5500 ? 'stad' : 'Ommeland');

for (const s of padelDefs(data)) {
  const pts = s.courts.length ? s.courts.map((c) => [c.x, c.y]) : [[s.x, s.y]];
  const ds = pts.map(([x, y]) => roadDistances(x, y));
  rows.push({ soort: 'padel', gebied: gebied(s.x, s.y), naam: s.name, x: s.x, y: s.y, n: s.courts.length ? `${s.courts.length} banen` : 'sportcentrum', weg: Math.min(...ds.map((d) => d.weg)), pad: Math.min(...ds.map((d) => d.pad)), bekend: ds.some((d) => d.bekend) });
}
for (const v of golfVenues(data)) {
  const ds = v.holes.flatMap((h) => [h.tee, h.cup]).map((p) => roadDistances(p.x, p.y));
  rows.push({ soort: 'golf', gebied: gebied(v.x, v.y), naam: v.name, x: v.x, y: v.y, n: `${v.holes.length} holes, ${v.real ? 'echte tees/greens' : 'rooster'}, ${v.ha} ha`, weg: Math.min(...ds.map((d) => d.weg)), pad: Math.min(...ds.map((d) => d.pad)), bekend: ds.some((d) => d.bekend) });
}
rows.sort((a, b) => (a.gebied === b.gebied ? a.soort.localeCompare(b.soort) || a.x - b.x : a.gebied === 'stad' ? -1 : 1));

const md = ['| gebied | soort | plek | x, y | inhoud | weg | pad |', '|---|---|---|---|---|---|---|']
  .concat(rows.map((r) => `| ${r.gebied} | ${r.soort} | ${r.naam} | ${Math.round(r.x)}, ${Math.round(r.y)} | ${r.n} | ${r.bekend ? fmt(r.weg) : 'geen wegdata'} | ${r.bekend ? fmt(r.pad) : '-'} |`)).join('\n');
console.log(md);
if (arg('--md')) fs.writeFileSync(arg('--md'), md + '\n');
