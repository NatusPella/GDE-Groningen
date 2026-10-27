// De rijen van alle tegels van een gebouwde wereld (index.json en index-provincie.json), voor audits die de hele provincie
// naast elkaar leggen (tegel_afstand_audit.mjs, tegel_schoon_test.mjs). Geen scene; alleen decoderen.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import '../node3d.mjs';

export const CARS = new Set(['major', 'normal', 'minor', 'service']);

export const heeftTegels = (dir) => fs.existsSync(path.join(dir, 'index.json'));

// { tiles, roads, trees, hedges, buildings, water }: wegen als de tegelrij, bomen als { x, y }, gemapte heggen
// (FURNITURE k = 'hedge') als { pts, osm }, gebouwen en water als de tegelrij.
export async function leesTegelRijen(dir) {
  const G = await import('../../game/js/gdt.js');
  const out = { tiles: 0, roads: [], trees: [], hedges: [], buildings: [], water: [] };
  const seen = new Set();
  for (const name of ['index.json', 'index-provincie.json']) {
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) continue;
    const index = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!index.tiles || !index.packs) continue;
    const fds = new Map();
    for (const [key, t] of Object.entries(index.tiles)) {
      if (seen.has(key)) continue;
      seen.add(key);
      const f = index.packs[t.pack].file;
      if (!fds.has(f)) fds.set(f, fs.openSync(path.join(dir, f), 'r'));
      const buf = Buffer.alloc(t.len);
      fs.readSync(fds.get(f), buf, 0, t.len, t.off);
      const blob = G.decodeBlob(new Uint8Array(zlib.inflateRawSync(buf)));
      out.tiles++;
      const sec = (type) => (blob.sections.find((s) => s.type === type) || { rows: [] }).rows;
      for (const r of sec(G.SECTION.ROADS)) if (r.pts && r.pts.length > 1) out.roads.push(r);
      for (const r of sec(G.SECTION.TREES)) for (const p of r.p || []) out.trees.push({ x: p[0], y: p[1], s: r.s, key });
      for (const r of sec(G.SECTION.FURNITURE)) if (r.k === 'hedge' && r.pts && r.pts.length > 1) out.hedges.push({ pts: r.pts, osm: r.osm, key });
      for (const r of sec(G.SECTION.BUILDINGS)) if (r.pts) out.buildings.push(r);
      for (const r of sec(G.SECTION.WATER)) if (r.pts && r.pts.length > 2) out.water.push(r);
    }
    for (const fd of fds.values()) fs.closeSync(fd);
  }
  return out;
}

const CELL = 40;
const cellsOf = (x0, y0, x1, y1) => {
  const o = [];
  for (let i = Math.floor(x0 / CELL); i <= Math.floor(x1 / CELL); i++) for (let j = Math.floor(y0 / CELL); j <= Math.floor(y1 / CELL); j++) o.push(i + ',' + j);
  return o;
};

// Raster van de rijbanen op maaiveld (autowegen, geen brug of tunnel); de functie geeft voor (x, y)
// { m, r }: de afstand tot de rand van de dichtstbijzijnde rijbaan (negatief: erop), of null. Een weg met een
// hoogteprofiel telt mee zolang hij op de plek zelf op maaiveld ligt: een dek van een viaduct of brug is niet de
// weg waar een boom naast staat (dezelfde regel als treeclear.js en tilegreenery.js, #508).
// Dezelfde grens als treeclear.js en tilegreenery.js: tot hier ligt een weg nog op maaiveld.
const HOOG_MAAIVELD = 0.5;
const zAt = (r, i, t) => (!r.z || r.z.length < i + 2 ? 0 : r.z[i] + (r.z[i + 1] - r.z[i]) * t);
export function wegRaster(roads) {
  const grid = new Map();
  for (const r of roads) {
    if (!CARS.has(r.cat) || r.bridge || r.tunnel) continue;
    const hw = (r.width || 5) / 2;
    for (let i = 0; i + 1 < r.pts.length; i++) {
      const a = r.pts[i], b = r.pts[i + 1];
      const seg = { a, b, hw, r, i };
      for (const c of cellsOf(Math.min(a[0], b[0]) - hw - 1, Math.min(a[1], b[1]) - hw - 1, Math.max(a[0], b[0]) + hw + 1, Math.max(a[1], b[1]) + hw + 1)) (grid.get(c) || grid.set(c, []).get(c)).push(seg);
    }
  }
  return (x, y) => {
    let best = null;
    for (const s of grid.get(Math.floor(x / CELL) + ',' + Math.floor(y / CELL)) || []) {
      const dx = s.b[0] - s.a[0], dy = s.b[1] - s.a[1], L2 = dx * dx + dy * dy || 1e-9;
      const t = Math.max(0, Math.min(1, ((x - s.a[0]) * dx + (y - s.a[1]) * dy) / L2));
      if (zAt(s.r, s.i, t) > HOOG_MAAIVELD) continue; // een dek boven de boom
      const m = Math.hypot(s.a[0] + dx * t - x, s.a[1] + dy * t - y) - s.hw;
      if (!best || m < best.m) best = { m, r: s.r };
    }
    return best;
  };
}

// De kaart die de groenopruiming van het spel nodig heeft (tilegreenery.js): roadsNear, buildingsNear en
// waterNear over alle rijen van de wereld. Zo meet een audit met dezelfde regel als waar het spel mee tekent.
export async function greeneryMap(rows) {
  const { SpatialGrid } = await import('../../game/js/spatialgrid.js');
  const boundsOf = (pts) => {
    let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
    for (const p of pts) { if (p[0] < a) a = p[0]; if (p[1] < b) b = p[1]; if (p[0] > c) c = p[0]; if (p[1] > d) d = p[1]; }
    return [a, b, c, d];
  };
  const grid = (list) => {
    const g = new SpatialGrid(64);
    for (const r of list) if (r.pts && r.pts.length > 1) { if (!r.bounds) r.bounds = boundsOf(r.pts); g.insert(r, r.bounds); }
    return g;
  };
  const roads = grid(rows.roads), buildings = grid(rows.buildings), water = grid(rows.water);
  const near = (g) => (x, y, rad) => g.query(x - rad, y - rad, x + rad, y + rad);
  return { roadsNear: near(roads), buildingsNear: near(buildings), waterNear: near(water), meta: {} };
}
