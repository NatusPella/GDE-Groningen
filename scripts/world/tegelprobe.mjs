// Leest de tegels rond een plek (spelcoordinaten) zonder Electron: handig om te zien wat de tegelbouw daar
// heeft (wegen, heggen, bomen, water, gebouwen) en voor de audits van de stadsbugs (#323 t/m #335).
//
//   node scripts/world/tegelprobe.mjs <x> <y> [--r=60] [--world=game/world] [--kind=roads,furniture,...] [--naam=tekst]
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const G = await import('../../game/js/gdt.js');

export const bounds = (P) => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const p of P) { if (p[0] < a) a = p[0]; if (p[0] > c) c = p[0]; if (p[1] < b) b = p[1]; if (p[1] > d) d = p[1]; } return [a, b, c, d]; };

export function openWorld(dir = path.join(ROOT, 'game/world')) {
  const index = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
  return { dir, index };
}

// alle tegels waarvan het vak binnen r van (x, y) ligt, samengevoegd per soort (rijen met .bounds)
export function loadAround(world, x, y, r = 100) {
  const { dir, index } = world;
  const [i0, j0] = G.tileIndexOf(x - r, y - r), [i1, j1] = G.tileIndexOf(x + r, y + r);
  const out = { buildings: [], roads: [], water: [], green: [], trees: [], rails: [], furniture: [], canopies: [], passages: [], junctions: [], heights: [], tiles: [] };
  const seen = new Set();
  const fds = new Map();
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const key = G.tileKey(i, j), t = index.tiles[key];
    if (!t) continue;
    const f = index.packs[t.pack].file;
    if (!fds.has(f)) fds.set(f, fs.openSync(path.join(dir, f), 'r'));
    const buf = Buffer.alloc(t.len);
    fs.readSync(fds.get(f), buf, 0, t.len, t.off);
    const blob = G.decodeBlob(new Uint8Array(zlib.inflateRawSync(buf)));
    out.tiles.push(key);
    const rows = (ty) => ((blob.sections.find((s) => s.type === ty) || { rows: [] }).rows);
    const geo = (list, name) => { for (const q of list) { const pts = q.pts || q.p; if (!pts || !pts.length) continue; const k = (q.gid !== undefined ? 'g' + q.gid : null); if (k && seen.has(name + k)) continue; if (k) seen.add(name + k); out[name].push({ ...q, pts, bounds: bounds(pts) }); } };
    geo(rows(G.SECTION.BUILDINGS), 'buildings'); geo(rows(G.SECTION.ROADS), 'roads'); geo(rows(G.SECTION.WATER), 'water'); geo(rows(G.SECTION.GREEN), 'green');
    geo(rows(G.SECTION.TREES), 'trees'); geo(rows(G.SECTION.RAILS), 'rails'); geo(rows(G.SECTION.FURNITURE), 'furniture'); geo(rows(G.SECTION.CANOPIES), 'canopies');
    geo(rows(G.SECTION.PASSAGES), 'passages');
    for (const q of rows(G.SECTION.JUNCTIONS)) out.junctions.push(q);
    for (const q of rows(G.SECTION.HEIGHTS)) out.heights.push(q);
  }
  for (const fd of fds.values()) fs.closeSync(fd);
  return out;
}

export const segDist = (x, y, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
  return Math.hypot(ax + dx * t - x, ay + dy * t - y);
};
export const polyDist = (x, y, P) => { let d = Infinity; for (let i = 0; i < P.length - 1; i++) d = Math.min(d, segDist(x, y, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1])); return d; };

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (n, d) => { const a = args.find((q) => q.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
  const [x, y] = args.filter((a) => !a.startsWith('--')).map(Number);
  const r = Number(opt('r', 60));
  const world = openWorld(path.resolve(opt('world', path.join(ROOT, 'game/world'))));
  const data = loadAround(world, x, y, r + 50);
  const kinds = opt('kind', 'roads,furniture,trees,water,buildings,rails').split(',');
  const naam = opt('naam', '').toLowerCase();
  console.log('tegels', data.tiles.join(' '));
  for (const k of kinds) {
    for (const o of data[k] || []) {
      const d = polyDist(x, y, o.pts.length > 1 ? o.pts : [o.pts[0], o.pts[0]]);
      if (d > r) continue;
      const { pts, bounds: _b, ...rest } = o;
      const txt = JSON.stringify(rest);
      if (naam && !txt.toLowerCase().includes(naam)) continue;
      console.log(k, 'd=' + d.toFixed(1), 'n=' + pts.length, 'p0=' + pts[0].map((v) => +(+v).toFixed(1)).join(','), txt.slice(0, 260));
    }
  }
}
