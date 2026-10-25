// Headroom under viaducts: samples every street-level road lane every 3 m and
// reports the lowest deck underside above it (elevation.js ceilingAt), per
// viaduct road, worst first. A car is under 2 m, a bus 3.2 m, a lorry 4 m;
// Dutch roads are built for 4.5 m; a cycle path or footway needs 2.5 m
// (roadprofile.js CLEARANCE), so those lanes are held to --min-path (2.4).
//   node scripts/clearance_audit.mjs [--min 4.2] [--min-path 2.4] [--all]
// Needs the vendored three.js once: cd desktop && npm run stage
import './node3d.mjs';
import { laneUnderDeck } from './lib/clearance.mjs';
import fs from 'node:fs';

const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
await import('../game/js/player.js');
const { buildElevation, DECK_T } = await import('../game/js/elevation.js');

const args = process.argv.slice(2);
const minArg = args.indexOf('--min');
const MIN = minArg >= 0 ? Number(args[minArg + 1]) : 4.2;
const pathArg = args.indexOf('--min-path');
const MIN_PATH = pathArg >= 0 ? Number(args[pathArg + 1]) : 2.4;
const all = args.includes('--all');

const root = new URL('../game/', import.meta.url);
const { loadCityData } = await import('./lib/loadworld.mjs');
const data = await loadCityData();
const map = new GameMap(data);
const elev = buildElevation(map);

// per viaduct deck: the underside (road height minus the deck thickness) wherever
// a street-level road runs beneath it (elevation.js flatGrid)
const found = new Map();
for (const sg of elev.segs) {
  if (!sg.deck) continue;
  const len = sg.len;
  for (let d = 0; d <= len; d += 3) {
    const t = d / len;
    const x = sg.ax + (sg.bx - sg.ax) * t, y = sg.ay + (sg.by - sg.ay) * t;
    const zRoad = sg.za + (sg.zb - sg.za) * t;
    if (zRoad < 0.5) continue;
    const lower = (elev.flatGrid.at(x, y) || []).filter((f) => laneUnderDeck(x, y, f, sg.hs));
    const under = lower.length > 0;
    // the strictest class under this point decides: any car lane needs the full height
    const pathOnly = under && lower.every((f) => f.r.cat === 'cycle' || f.r.cat === 'foot');
    if (!under) continue;
    const c = zRoad - DECK_T;
    const key = `${sg.r.name || sg.r.id || 'weg'} ${sg.r.cat || ''}${pathOnly ? ' (over a path)' : ''}`;
    const cur = found.get(key);
    if (!cur || c < cur.c) found.set(key, { c, x: Math.round(x), y: Math.round(y), cat: '', min: pathOnly ? MIN_PATH : MIN });
  }
}
const rows = [...found.entries()].sort((a, b) => a[1].c - b[1].c);
let low = 0;
for (const [name, v] of rows) {
  if (v.c < v.min) low++;
  if (all || v.c < v.min) console.log(`${v.c.toFixed(2)} m  ${name} (${v.x}, ${v.y}) ${v.cat}`);
}
console.log(`under viaducts: ${rows.length} roads, ${low} below the minimum (${MIN} m for roads, ${MIN_PATH} m for paths)`);
process.exit(low ? 1 : 0);
