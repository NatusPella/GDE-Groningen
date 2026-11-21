// Telt per kaartlaag wat de provincietegels aan randlijnen hebben (#1092): gemapte hekken en heggen
// (furniture barrier=fence|hedge), sloten, greppels en beken (water met kind sloot: een lint rond de OSM-lijn, de ditch-vlag van
// de bouwer zit niet in de tegel) en de landgebruikvlakken (parcels). Boomrijen zijn in de tegel gewone bomen (de rij blijft niet bewaard). Een bijdrage aan docs/PERCEELRANDEN-21-11.md.
//   node scripts/world/randlagen_telling.mjs
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const G = await import('../../game/js/gdt.js');
const out = path.join(ROOT, 'game/world');
const index = JSON.parse(fs.readFileSync(path.join(out, 'index-provincie.json'), 'utf8'));
const names = Object.fromEntries(Object.entries(G.SECTION).map(([k, v]) => [v, k]));
const fds = new Map();
const sections = {}, detail = {};
const bump = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };
const len = (P) => { let s = 0; for (let i = 1; i < P.length; i++) s += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return s; };
let tiles = 0;
for (const t of Object.values(index.tiles)) {
  const f = index.packs[t.pack].file;
  if (!fds.has(f)) fds.set(f, fs.openSync(path.join(out, f), 'r'));
  const buf = Buffer.alloc(t.len);
  fs.readSync(fds.get(f), buf, 0, t.len, t.off);
  const blob = G.decodeBlob(new Uint8Array(zlib.inflateRawSync(buf)));
  tiles++;
  for (const s of blob.sections) {
    bump(sections, names[s.type] || s.type, s.rows.length);
    if (s.type === G.SECTION.FURNITURE) for (const r of s.rows) { bump(detail, 'furniture:' + r.k); if (r.pts && r.pts.length > 1) bump(detail, 'furniture:' + r.k + ' (m)', Math.round(len(r.pts))); }
    if (s.type === G.SECTION.WATER) for (const r of s.rows) { const k = 'water:' + (r.kind || '?'); bump(detail, k); if (r.pts) bump(detail, k + ' (m, lint heen en terug)', Math.round(len(r.pts))); }
    if (s.type === G.SECTION.PARCELS) for (const r of s.rows) bump(detail, 'parcels:' + r.use);
  }
}
console.log('tegels', tiles);
console.log(JSON.stringify(sections));
console.log(JSON.stringify(detail, null, 1));
