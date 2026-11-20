// De wereldtegels als map voor de missieplekken (#1035): leest de provinciepacks rond een
// punt zonder Electron en geeft een object met dezelfde vragen als TileWorld
// (buildingsNear, roadsNear, waterNear, railNear), zodat game/js/missionplace.js hetzelfde
// oordeel velt als in het spel. Alleen lezen; geen schrijfactie.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const G = await import('../../game/js/gdt.js');

const boundsOf = (P) => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const p of P) { if (p[0] < a) a = p[0]; if (p[0] > c) c = p[0]; if (p[1] < b) b = p[1]; if (p[1] > d) d = p[1]; } return [a, b, c, d]; };

// Waar staat de gebouwde wereld? Een eigen map (GDE_WORLD_DIR), anders game/world van deze werkboom,
// anders (worktree) de hoofdmap drie niveaus hoger. Null als er nergens een wereld is.
export function findWorldDir(explicit) {
  const cands = [explicit, process.env.GDE_WORLD_DIR, path.join(ROOT, 'game/world'), path.join(ROOT, '../../../game/world')].filter(Boolean);
  for (const c of cands) if (fs.existsSync(path.join(c, 'index-provincie.json'))) return path.resolve(c);
  return null;
}

// Alle tegels die een venster van [x-r, x+r] raken; per soort samengevoegd en met bounds.
export function loadWorldMap(dir, x, y, r = 300) {
  const index = JSON.parse(fs.readFileSync(path.join(dir, 'index-provincie.json'), 'utf8'));
  const [i0, j0] = G.tileIndexOf(x - r, y - r), [i1, j1] = G.tileIndexOf(x + r, y + r);
  const kinds = { buildings: [], roads: [], water: [], rails: [], green: [], parcels: [] };
  const seen = new Set(), resident = new Set(), fds = new Map();
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const key = G.tileKey(i, j), t = index.tiles[key];
    if (!t) continue;
    resident.add(`${i},${j}`);
    const f = index.packs[t.pack].file;
    if (!fds.has(f)) fds.set(f, fs.openSync(path.join(dir, f), 'r'));
    const buf = Buffer.alloc(t.len);
    fs.readSync(fds.get(f), buf, 0, t.len, t.off);
    const blob = G.decodeBlob(new Uint8Array(zlib.inflateRawSync(buf)));
    for (const s of blob.sections) {
      const name = Object.keys(G.SECTION).find((n) => G.SECTION[n] === s.type);
      const k = { BUILDINGS: 'buildings', ROADS: 'roads', WATER: 'water', RAILS: 'rails', GREEN: 'green', PARCELS: 'parcels' }[name];
      if (!k) continue;
      for (const row of s.rows) {
        if (!row.pts || row.pts.length < 2) continue;
        if (row.gid !== undefined) { const sk = name + row.gid; if (seen.has(sk)) continue; seen.add(sk); }
        kinds[k].push({ ...row, bounds: boundsOf(row.pts) });
      }
    }
  }
  for (const fd of fds.values()) fs.closeSync(fd);
  const near = (list) => (px, py, m) => list.filter((o) => px >= o.bounds[0] - m && px <= o.bounds[2] + m && py >= o.bounds[1] - m && py <= o.bounds[3] + m);
  return {
    resident,
    buildingsNear: near(kinds.buildings), roadsNear: near(kinds.roads),
    waterNear: near(kinds.water.filter((w) => w.nav !== undefined)), flatWaterNear: near(kinds.water.filter((w) => w.nav === undefined)),
    railNear: near(kinds.rails),
    kinds,
  };
}

// Is (x, y) land? Tegels zonder rij in de index zijn zee; verder is het water van de rijen al in waterNear.
export function inPoly(x, y, P) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < ((P[j][0] - P[i][0]) * (y - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) c = !c;
  return c;
}
export function useAt(map, x, y) {
  for (const p of map.kinds.parcels) if (x >= p.bounds[0] && x <= p.bounds[2] && y >= p.bounds[1] && y <= p.bounds[3] && inPoly(x, y, p.pts)) return p.use || 'perceel';
  for (const g of map.kinds.green) if (x >= g.bounds[0] && x <= g.bounds[2] && y >= g.bounds[1] && y <= g.bounds[3] && inPoly(x, y, g.pts)) return 'groen';
  return null;
}
export function distToWater(map, x, y, max = 200) {
  let best = Infinity;
  for (const w of map.waterNear(x, y, max).concat(map.flatWaterNear(x, y, max))) {
    const P = w.pts;
    if (inPoly(x, y, P)) return 0;
    for (let i = 0; i < P.length - 1; i++) {
      const dx = P[i + 1][0] - P[i][0], dy = P[i + 1][1] - P[i][1], L2 = dx * dx + dy * dy || 1e-9;
      const t = Math.max(0, Math.min(1, ((x - P[i][0]) * dx + (y - P[i][1]) * dy) / L2));
      best = Math.min(best, Math.hypot(P[i][0] + dx * t - x, P[i][1] + dy * t - y));
    }
  }
  return best;
}
