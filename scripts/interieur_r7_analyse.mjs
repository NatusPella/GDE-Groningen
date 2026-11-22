// Analyse van waarom panden niet betreedbaar zijn (Interieurs ronde 7, #1150, #1165).
// Per gemeten pand: type, oppervlak, hoogte, verdiepingen, deur, grootste hal (b.v. 1,5 x 1,5 minimum) en de reden van planInterior.
// Gebruik: node scripts/interieur_r7_analyse.mjs --world=<map> [--sample=20] [--out=<json>] [--records=<json>]
// Alleen lezen: de wereldtegels worden niet gewijzigd. Draait zonder Electron.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { planInterior } from '../game/js/interiorrules.js';
import { frameOf, findHall } from '../game/js/interiorframe.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d = null) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };

export function areaOf(pts) {
  let a = 0;
  for (let i = 0; i < pts.length - 1; i++) a += pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1];
  return Math.abs(a) / 2;
}
export const AREA_BANDS = [[0, 10], [10, 15], [15, 20], [20, 30], [30, 45], [45, 80], [80, 150], [150, 1e9]];
export const bandOf = (a) => AREA_BANDS.findIndex(([lo, hi]) => a >= lo && a < hi);
export const bandLabel = (i) => (AREA_BANDS[i][1] > 1e8 ? '>=' + AREA_BANDS[i][0] : AREA_BANDS[i][0] + '-' + AREA_BANDS[i][1]) + ' m2';

// the largest hall behind the door of the building (any size), to see how much room there really is
export function maxHall(b) {
  const en = b.entrance;
  if (!en) return null;
  const h = findHall(b.pts, frameOf(en, en.c), { minW: 1.2, minD: 1.2 });
  return h ? { w: Math.round((h.u1 - h.u0) * 10) / 10, d: Math.round((h.v1 - h.v0) * 10) / 10 } : null;
}

export async function collect(opts) {
  await import('./node3d.mjs');
  const { loadTiles } = await import('./world/prop_conflict_audit.mjs');
  const { buildBuildingMesh } = await import('../game/js/models3d_buildings.js');
  const { makeSpotIndex, spotFor } = await import('../game/js/interiorspots.js');
  const Fac = await import('../game/js/facilities.js');
  const { setShopSpots, spotsFrom } = await import('../game/js/shopspots.js');
  const G = await import('../game/js/gdt.js');
  const index = JSON.parse(fs.readFileSync(path.join(opts.world, 'index-provincie.json'), 'utf8'));
  const readJson = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'game', f), 'utf8'));
  const meta = readJson('stad.json').meta;
  Fac.setExtraBuiltWorld((x, y) => { const [i, j] = G.tileIndexOf(x, y); const t = index.tiles[G.tileKey(i, j)]; return !!t && !!(t.flags & 4); });
  const map = { meta };
  Fac.initFacilities(map, readJson('facilities.json'));
  Fac.initShopPlaces(map, readJson('shopplaces.json'));
  setShopSpots(spotsFrom(Fac.FAC.all));
  const spotIdx = makeSpotIndex(Fac.FAC.all);
  const keys = Object.keys(index.tiles).slice(0, opts.tiles || 1e9);
  const totals = {}, records = [], seen = new Set();
  let cnt = 0;
  for (let i = 0; i < keys.length; i += 8) {
    const tiles = loadTiles(opts.world, index, keys.slice(i, i + 8));
    for (const t of tiles.values()) {
      for (const b of t.buildings) {
        if (seen.has(b.gid)) continue;
        seen.add(b.gid);
        const type = b.type || 'yes';
        const tot = totals[type] || (totals[type] = { all: 0, poi: 0 });
        tot.all++;
        if (!b.pts || b.pts.length < 4) continue;
        const poi = !!spotFor(spotIdx, b.pts, null, 6);
        if (poi) tot.poi++;
        if (!poi && cnt++ % opts.sample !== 0) continue;
        try { buildBuildingMesh(b); } catch (e) { continue; }
        const en = b.entrance;
        const spot = en ? spotFor(spotIdx, b.pts, en, 4) : null;
        const p = planInterior(b, { spot, ...(opts.plan || {}) });
        const area = areaOf(b.pts);
        records.push({ gid: b.gid, type, poi, ok: p.ok, why: p.ok ? '' : p.why, kind: p.kind || null, sub: p.sub || null, area: Math.round(area), hm: b.hm || 0, h: b.h || 0, nv: b.pts.length - 1, door: !!en, hall: p.ok ? null : maxHall(b), floors: en ? en.floors : 0 });
        b._geo3dParts = null;
      }
    }
  }
  return { totals, records };
}

export function report(records) {
  const out = [];
  const cross = (name, rows) => {
    out.push('', name);
    const g = {};
    for (const r of rows) { const k = r.type + ' / ' + bandLabel(bandOf(r.area)); const e = g[k] || (g[k] = { n: 0, ok: 0, small: 0, nodoor: 0, low: 0, typ: 0 }); e.n++; if (r.ok) e.ok++; else if (r.why === 'small') e.small++; else if (r.why === 'nodoor') e.nodoor++; else if (r.why === 'low') e.low++; else e.typ++; }
    for (const [k, e] of Object.entries(g).sort((a, b) => b[1].n - a[1].n).slice(0, 40)) out.push(k.padEnd(34) + String(e.n).padStart(6) + ' ok ' + String(e.ok).padStart(5) + ' small ' + String(e.small).padStart(5) + ' nodoor ' + String(e.nodoor).padStart(4) + ' low ' + String(e.low).padStart(4) + ' type ' + String(e.typ).padStart(5));
  };
  cross('type / oppervlak (alleen de gemeten panden, ruwe aantallen)', records);
  return out.join('\n');
}

async function main() {
  const world = path.resolve(arg('world', path.join(ROOT, 'game/world')));
  const res = await collect({ world, sample: Math.max(1, Number(arg('sample', 20))), tiles: Number(arg('tiles', 1e9)) });
  if (arg('records')) fs.writeFileSync(path.resolve(arg('records')), JSON.stringify(res));
  console.log(report(res.records));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
