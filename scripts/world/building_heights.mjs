// Real building heights and roof shapes into the map (docs/PROVINCIE-PLAN.md 0.1).
//
//   node scripts/world/building_heights.mjs           report the height sources
//   (--write is gone: the city's buildings come from the OSM tile build, stad.json holds the hand-made ones)
//
// Joins the 3D BAG extract (data/world/3dbag.json.gz, scripts/world/fetch_3dbag.py;
// CC BY 4.0) and the OSM attributes (data/world/building_attrs.json.gz,
// building_attrs.py) to every footprint (pack_tiles.mjs joinAttrs: the BAG id
// from OSM's ref:bag, else the centre inside the footprint and the area
// within 25 %) and walks the chain of game/js/buildingheights.js: 3dbag,
// osm_height, osm_levels, default. A measured building (3dbag, osm_height) gets
//   h     its walls in storeys of 3.1 m (the renderer's body; a pitched roof on top)
//   hm    the ridge above the ground (m)
//   rk    the roof: gable | hip | flat | shed | mansard | sawtooth (when known)
// and every building hsrc. Landmarks with their own model keep their h. The
// report: the share per source, per tile the share left to the default in
// built-up tiles (over 30 % is listed), and the tallest buildings.
import '../node3d.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const P = await import('./pack_tiles.mjs');
const BH = await import('../../game/js/buildingheights.js');
const G = await import('../../game/js/gdt.js');

export function applyHeights(buildings, attrs) {
  const { fields, stats } = P.joinAttrs(buildings, attrs);
  let changed = 0;
  const tiles = new Map();
  for (const b of buildings) {
    const f = fields.get(b);
    if (!f) continue;
    const cx = b.pts.reduce((a, p) => a + p[0], 0) / b.pts.length, cy = b.pts.reduce((a, p) => a + p[1], 0) / b.pts.length;
    const key = G.tileKey(...G.tileIndexOf(cx, cy));
    const t = tiles.get(key) || tiles.set(key, { n: 0, def: 0 }).get(key);
    t.n++;
    if (f.hsrc === 'default') t.def++;
    b.hsrc = f.hsrc;
    if (f.rk) b.rk = f.rk; else delete b.rk;
    if ((f.hsrc === '3dbag' || f.hsrc === 'osm_height') && !b.landmark) {
      const h = BH.levelsFor(f.eave);
      if (h !== b.h) changed++;
      b.h = h;
      b.hm = f.hm;
    } else delete b.hm;
  }
  const busy = [...tiles].filter(([, t]) => t.n >= 200 && t.def / t.n > 0.3).map(([k, t]) => ({ tile: k, n: t.n, def: Math.round((100 * t.def) / t.n) }));
  return { stats, changed, busy };
}

async function main() {
  const args = process.argv.slice(2);
  const { loadCityData } = await import('../lib/loadworld.mjs');
  const data = await loadCityData({ extras: false });
  const attrs = P.loadAttrs();
  console.log(`3D BAG records: ${attrs.bag.length}; OSM attribute records: ${attrs.osm.length}`);
  const res = applyHeights(data.buildings, attrs);
  const s = res.stats;
  const pct = (v) => `${((100 * v) / s.buildings).toFixed(1)} %`;
  console.log(`${s.buildings} buildings, ${s.matched} matched to OSM tags; height from ${Object.entries(s.src).map(([k, v]) => `${k} ${v} (${pct(v)})`).join(', ')}`);
  console.log(`roof from data: ${data.buildings.filter((b) => b.rk).length}; storeys changed: ${res.changed}`);
  console.log(`built-up tiles with more than 30 % default heights: ${res.busy.length}${res.busy.length ? ': ' + res.busy.map((t) => `${t.tile} ${t.def} %`).join(', ') : ''}`);
  const tall = data.buildings.filter((b) => b.hm).sort((a, b) => b.hm - a.hm).slice(0, 6);
  console.log(`tallest: ${tall.map((b) => `${b.name || b.type} ${b.hm} m`).join(', ')}`);
  // --write bestaat niet meer: de hoogtes van de stad komen uit de OSM-tegelbouw (pack_tiles.mjs joinAttrs)
  if (args.includes('--write')) { console.log('--write bestaat niet meer: game/stad.json heeft alleen de handgebouwen'); process.exit(1); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main();
