// De stad vóór en na het weghalen van de overlaytegels (#314, C2): per laag de rijen (met hun vorm) in het gebied van de stadstegels en
// de ring ernaast, uit twee gebouwde werelden (A = met overlays, B = zonder). Een rij is gelijk als soort, vorm en eigenschappen gelijk
// zijn (zonder gid en hoogteprofiel); wegen en spoor tellen we in meters. Alleen lezen.
//   node scripts/world/stad_pariteit_c2.mjs <wereld A> <wereld B> [--json uit.json]
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import '../node3d.mjs';
import * as G from '../../game/js/gdt.js';

const [A, B] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const stad = JSON.parse(fs.readFileSync(new URL('../../game/stad.json', import.meta.url), 'utf8'));
const city = new Set(stad.tiles);
const region = new Set();
for (const k of city) { const [i, j] = G.tileFromKey(k); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) region.add(G.tileKey(i + a, j + b)); }
const KIND = new Map([[G.SECTION.BUILDINGS, 'buildings'], [G.SECTION.ROADS, 'roads'], [G.SECTION.WATER, 'water'], [G.SECTION.GREEN, 'green'], [G.SECTION.TREES, 'trees'], [G.SECTION.RAILS, 'rails'], [G.SECTION.CANOPIES, 'canopies'], [G.SECTION.FURNITURE, 'furniture'], [G.SECTION.PARCELS, 'parcels']]);

function load(dir) {
  const packs = {};
  const rows = {};
  for (const name of ['index.json', 'index-provincie.json']) {
    const f = path.join(dir, name);
    if (!fs.existsSync(f)) continue;
    const idx = JSON.parse(fs.readFileSync(f, 'utf8'));
    for (const [key, e] of Object.entries(idx.tiles)) {
      const base = key.startsWith('o') ? key.slice(1) : key;
      if (!region.has(base)) continue;
      const p = idx.packs[e.pack];
      const bytes = packs[p.file] || (packs[p.file] = fs.readFileSync(path.join(dir, p.file)));
      const raw = new Uint8Array(zlib.inflateRawSync(bytes.subarray(e.off, e.off + e.len)));
      const d = G.decodeBlob(raw);
      for (const s of d.sections) {
        const kind = KIND.get(s.type);
        if (!kind || !s.rows) continue;
        const list = rows[kind] || (rows[kind] = new Map());
        for (const r of s.rows) {
          const { gid, g, z, ...rest } = r;
          const sig = kind === 'trees' ? JSON.stringify([r.p ? r.p[0] : r, r.s]) : JSON.stringify(rest, (k, v) => (typeof v === 'number' ? Math.round(v * 10) / 10 : v));
          if (!list.has(sig)) list.set(sig, { row: rest, tile: base, city: city.has(base) });
        }
      }
    }
  }
  return rows;
}
const len = (pts) => pts.reduce((a, p, i) => (i ? a + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);
const a = load(A), b = load(B);
const out = {};
for (const kind of new Set([...Object.keys(a), ...Object.keys(b)])) {
  const ma = a[kind] || new Map(), mb = b[kind] || new Map();
  let both = 0, onlyA = 0, onlyB = 0;
  for (const k of ma.keys()) (mb.has(k) ? both++ : onlyA++);
  for (const k of mb.keys()) if (!ma.has(k)) onlyB++;
  const o = { A: ma.size, B: mb.size, gelijk: both, alleenA: onlyA, alleenB: onlyB };
  if (kind === 'roads' || kind === 'rails') {
    const m = (map) => [...map.values()].reduce((s, v) => s + (v.row.pts ? len(v.row.pts) : 0), 0);
    o.kmA = +(m(ma) / 1000).toFixed(1); o.kmB = +(m(mb) / 1000).toFixed(1);
  }
  out[kind] = o;
  console.log(kind.padEnd(10), JSON.stringify(o));
}
const j = process.argv.indexOf('--json');
if (j > 0) fs.writeFileSync(process.argv[j + 1], JSON.stringify(out, null, 1));
