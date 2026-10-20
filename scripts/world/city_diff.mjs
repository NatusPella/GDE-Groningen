// De stad twee keer: uit citymap.json (pack_tiles) en uit de provinciebouw (OSM,
// build_province.mjs met alle stadstegels als schaduw), per tegel vergeleken (#90, S2).
//   node scripts/world/city_diff.mjs [--json] [--top 15]
// Telt per tegel gebouwen, wegen, water, groen, bomen, rails, en rapporteert het verschil
// per categorie. Alleen lezen: schrijft niets naar game/world.
import '../node3d.mjs';
import * as G from '../../game/js/gdt.js';
import * as P from './pack_tiles.mjs';
import { buildProvince, haveProvince } from './build_province.mjs';
import { loadLegacySources } from '../lib/loadworld.mjs';

const NAMES = { [G.SECTION.BUILDINGS]: 'gebouwen', [G.SECTION.ROADS]: 'wegen', [G.SECTION.WATER]: 'water', [G.SECTION.GREEN]: 'groen', [G.SECTION.TREES]: 'bomen', [G.SECTION.RAILS]: 'spoor', [G.SECTION.FURNITURE]: 'meubilair', [G.SECTION.CANOPIES]: 'canopies', [G.SECTION.JUNCTIONS]: 'kruispunten' };
export const CORE_BUILDINGS = 800;
export const CATS = Object.values(NAMES);

export function countsOf(bytes) {
  const out = Object.fromEntries(CATS.map((c) => [c, 0]));
  for (const s of G.decodeBlob(bytes).sections) {
    const n = NAMES[s.type];
    if (n && s.rows) out[n] += s.rows.length;
  }
  return out;
}

// { perTile: Map key -> { stad, schaduw, diff }, total: {...} }
export function diffTiles(cityBlobs, shadowBlobs) {
  const perTile = new Map();
  const total = Object.fromEntries(CATS.map((c) => [c, { stad: 0, schaduw: 0 }]));
  for (const [k, b] of cityBlobs) {
    const stad = countsOf(b.bytes);
    const sb = shadowBlobs.get(k);
    const schaduw = sb ? countsOf(sb.bytes) : null;
    perTile.set(k, { stad, schaduw, diff: schaduw ? Object.fromEntries(CATS.map((c) => [c, schaduw[c] - stad[c]])) : null });
    for (const c of CATS) { total[c].stad += stad[c]; total[c].schaduw += schaduw ? schaduw[c] : 0; }
  }
  return { perTile, total };
}

async function main() {
  const args = process.argv.slice(2);
  const top = args.includes('--top') ? Number(args[args.indexOf('--top') + 1]) : 15;
  if (!haveProvince()) { console.log('geen provincie-extract in data/cache/province'); return; }
  const city = P.build(await loadLegacySources());
  const keys = new Set(city.blobs.keys());
  const shadow = buildProvince({ cityKeys: new Set(), only: keys, map: false, fillOld: false });
  const { perTile, total } = diffTiles(city.blobs, shadow.blobs);
  if (args.includes('--json')) { console.log(JSON.stringify({ total, tiles: [...perTile] })); return; }
  console.log(`stadstegels: ${keys.size}, schaduw gebouwd: ${[...perTile.values()].filter((t) => t.schaduw).length}`);
  console.log('categorie      stad   schaduw   verschil');
  for (const c of CATS) { const t = total[c]; console.log(`${c.padEnd(12)} ${String(t.stad).padStart(7)} ${String(t.schaduw).padStart(9)} ${String(t.schaduw - t.stad).padStart(10)}`); }
  const rank = [...perTile].filter(([, t]) => t.diff).map(([k, t]) => [k, Math.abs(t.diff.gebouwen) + Math.abs(t.diff.wegen) + Math.abs(t.diff.water), t]).sort((a, b) => b[1] - a[1]).slice(0, top);
  console.log(`grootste verschillen (gebouwen+wegen+water):`);
  for (const [k, d, t] of rank) console.log(`  ${k}  ${d}  gebouwen ${t.stad.gebouwen}->${t.schaduw.gebouwen}, wegen ${t.stad.wegen}->${t.schaduw.wegen}, water ${t.stad.water}->${t.schaduw.water}`);
  // kerntegels: waar citymap.json de tegel (bijna) vult; de randtegels zijn alleen aan de stadskant gevuld en zeggen niets over verschil
  const core = [...perTile].filter(([, t]) => t.schaduw && t.stad.gebouwen >= CORE_BUILDINGS);
  console.log(`kerntegels (stad >= ${CORE_BUILDINGS} gebouwen): ${core.length}`);
  for (const c of CATS) {
    const a = core.reduce((n, [, t]) => n + t.stad[c], 0), b = core.reduce((n, [, t]) => n + t.schaduw[c], 0);
    console.log(`  ${c.padEnd(12)} ${String(a).padStart(7)} ${String(b).padStart(9)}  ${a ? ((b / a - 1) * 100).toFixed(1) + '%' : '-'}`);
  }
  const missing = [...perTile].filter(([, t]) => !t.schaduw).map(([k]) => k);
  if (missing.length) console.log(`zonder schaduwtegel: ${missing.length} (${missing.slice(0, 8).join(', ')})`);
}

if (import.meta.url === new URL(process.argv[1], 'file:///').href || process.argv[1]?.endsWith('city_diff.mjs')) await main();
