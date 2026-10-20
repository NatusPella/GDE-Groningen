// Dubbele stad en land (#90, testerfeedback Corpus den Hoorn): ligt wat de provinciebouw (overlays en
// gewone tegels) in de buurt van de stad levert óók in de stadskaart (stad.json en de OSM-lagen)? Telt gebouwen,
// wegen en water die op elkaar liggen. Alleen lezen.
//   node scripts/world/overlap_check.mjs [--world game/world] [--near x,y,straal]
import fs from 'node:fs';
import path from 'node:path';
import '../node3d.mjs';
import * as G from '../../game/js/gdt.js';
import { inflateRaw } from '../../game/js/tilestore.js';
import * as P from './pack_tiles.mjs';

const CELL = 50;
const cellKey = (x, y) => Math.floor(x / CELL) + ',' + Math.floor(y / CELL);
const inPoly = (x, y, pts) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) if ((pts[i][1] > y) !== (pts[j][1] > y) && x < ((pts[j][0] - pts[i][0]) * (y - pts[i][1])) / (pts[j][1] - pts[i][1]) + pts[i][0]) c = !c; return c; };
const centre = (pts) => { let x = 0, y = 0; const n = pts.length - 1 || 1; for (let i = 0; i < n; i++) { x += pts[i][0]; y += pts[i][1]; } return [x / n, y / n]; };
const bbox = (pts) => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const p of pts) { if (p[0] < a) a = p[0]; if (p[1] < b) b = p[1]; if (p[0] > c) c = p[0]; if (p[1] > d) d = p[1]; } return [a, b, c, d]; };

function indexPolys(list) {
  const grid = new Map();
  for (const o of list) {
    const [a, b, c, d] = bbox(o.pts);
    for (let x = Math.floor(a / CELL); x <= Math.floor(c / CELL); x++) for (let y = Math.floor(b / CELL); y <= Math.floor(d / CELL); y++) { const k = x + ',' + y; (grid.get(k) || grid.set(k, []).get(k)).push(o); }
  }
  return (x, y) => grid.get(cellKey(x, y)) || [];
}

// segmenten van wegen als punten om de 10 m: een stuk weg is dubbel als er in de stad een weg binnen 2 m ligt
function roadProbe(list) {
  const grid = new Map();
  for (const r of list) for (let i = 0; i < r.pts.length - 1; i++) {
    const [ax, ay] = r.pts[i], [bx, by] = r.pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 5));
    for (let t = 0; t <= n; t++) { const x = ax + ((bx - ax) * t) / n, y = ay + ((by - ay) * t) / n, k = cellKey(x, y); (grid.get(k) || grid.set(k, []).get(k)).push([x, y]); }
  }
  return (x, y, d) => { for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const p of grid.get(Math.floor(x / CELL) + a + ',' + (Math.floor(y / CELL) + b)) || []) if (Math.hypot(p[0] - x, p[1] - y) <= d) return true; return false; };
}

export async function readWorldTiles(dir, indexFile = 'index-provincie.json') {
  const index = JSON.parse(fs.readFileSync(path.join(dir, indexFile), 'utf8'));
  const packs = new Map();
  const tile = async (key) => {
    const e = index.tiles[key];
    if (!packs.has(e.pack)) packs.set(e.pack, fs.readFileSync(path.join(dir, index.packs[e.pack].file)));
    return G.decodeBlob(await inflateRaw(packs.get(e.pack).subarray(e.off, e.off + e.len)));
  };
  return { index, tile };
}

const KIND = { buildings: G.SECTION.BUILDINGS, roads: G.SECTION.ROADS, water: G.SECTION.WATER };

// near: { x, y, r } beperkt tot een gebied (m); standaard de hele stad
export async function findOverlaps({ world = 'game/world', near = null, map = null } = {}) {
  map = map || (await P.loadSourcesLaag()).map;
  const { index, tile } = await readWorldTiles(world);
  const cb = indexPolys(map.buildings), cw = indexPolys(map.water), cr = roadProbe(map.roads);
  const inside = (x, y) => !near || Math.hypot(x - near.x, y - near.y) <= near.r;
  const out = { buildings: { n: 0, dup: 0, ex: [] }, roads: { n: 0, dup: 0, ex: [] }, water: { n: 0, dup: 0, ex: [] }, tiles: 0 };
  for (const key of Object.keys(index.tiles)) {
    const e = index.tiles[key];
    const [ox, oy] = G.tileOrigin(e.i, e.j);
    if (near && (ox > near.x + near.r || ox + 1000 < near.x - near.r || oy > near.y + near.r || oy + 1000 < near.y - near.r)) continue;
    const t = await tile(key);
    out.tiles++;
    for (const s of t.sections) {
      if (s.type === KIND.buildings) for (const r of s.rows) {
        if (!r.pts || r.pts.length < 4) continue;
        const [x, y] = centre(r.pts);
        if (!inside(x, y)) continue;
        out.buildings.n++;
        // dubbel: het zwaartepunt ligt in een stadsgebouw, of andersom
        const c = cb(x, y).find((b) => inPoly(x, y, b.pts) || inPoly(...centre(b.pts), r.pts));
        if (c) { out.buildings.dup++; if (out.buildings.ex.length < 8) out.buildings.ex.push({ tile: key, x: Math.round(x), y: Math.round(y), gid: r.gid }); }
      } else if (s.type === KIND.water) for (const r of s.rows) {
        if (!r.pts || r.pts.length < 4) continue;
        const [x, y] = centre(r.pts);
        if (!inside(x, y)) continue;
        out.water.n++;
        if (cw(x, y).some((w) => inPoly(x, y, w.pts) || inPoly(...centre(w.pts), r.pts))) { out.water.dup++; if (out.water.ex.length < 8) out.water.ex.push({ tile: key, x: Math.round(x), y: Math.round(y), name: r.name || '' }); }
      } else if (s.type === KIND.roads) for (const r of s.rows) {
        if (!r.pts || r.pts.length < 2) continue;
        const m = r.pts[Math.floor(r.pts.length / 2)];
        if (!inside(m[0], m[1])) continue;
        // alleen echte wegen: de helft van de punten moet dicht bij een stadsweg liggen
        let hit = 0, tot = 0;
        for (let i = 0; i < r.pts.length - 1; i++) { tot++; const mx = (r.pts[i][0] + r.pts[i + 1][0]) / 2, my = (r.pts[i][1] + r.pts[i + 1][1]) / 2; if (cr(mx, my, 2)) hit++; }
        out.roads.n++;
        if (tot && hit / tot >= 0.5) { out.roads.dup++; if (out.roads.ex.length < 8) out.roads.ex.push({ tile: key, x: Math.round(m[0]), y: Math.round(m[1]), name: r.name || '' }); }
      }
    }
  }
  return out;
}

async function main() {
  const a = process.argv.slice(2);
  const world = path.resolve(a.includes('--world') ? a[a.indexOf('--world') + 1] : 'game/world');
  const near = a.includes('--near') ? (([x, y, r]) => ({ x, y, r }))(a[a.indexOf('--near') + 1].split(',').map(Number)) : null;
  const r = await findOverlaps({ world, near });
  console.log(`tegels gelezen: ${r.tiles}`);
  for (const k of ['buildings', 'roads', 'water']) console.log(`${k.padEnd(9)} ${r[k].n} in de provinciebouw, ${r[k].dup} dubbel met de stadskaart`, r[k].ex.length ? JSON.stringify(r[k].ex.slice(0, 4)) : '');
}
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) await main();
