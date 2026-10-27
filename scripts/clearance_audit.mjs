// Headroom under viaducts: samples every street-level road lane every 3 m and
// reports the lowest deck underside above it (elevation.js ceilingAt), per
// viaduct road, worst first. A car is under 2 m, a bus 3.2 m, a lorry 4 m;
// Dutch roads are built for 4.5 m; a cycle path or footway needs 2.5 m
// (roadprofile.js CLEARANCE), so those lanes are held to --min-path (2.4).
// --paden also counts a deck hanging with its edge over the axis of a cycle path
// or footway that runs beside the carriageway (#510): the same measurement, but
// for the paths the strict lane rule above deliberately leaves alone.
//   node scripts/clearance_audit.mjs [--min 4.2] [--min-path 2.4] [--all] [--paden]
// Needs the vendored three.js once: cd desktop && npm run stage
import './node3d.mjs';
import { laneUnderDeck, pathUnderDeck, MIN_PATH as PATH_MIN } from './lib/clearance.mjs';
import fs from 'node:fs';

const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
await import('../game/js/player.js');
const { buildElevation, DECK_T } = await import('../game/js/elevation.js');

const args = process.argv.slice(2);
const minArg = args.indexOf('--min');
const MIN = minArg >= 0 ? Number(args[minArg + 1]) : 4.2;
const pathArg = args.indexOf('--min-path');
const MIN_PATH = pathArg >= 0 ? Number(args[pathArg + 1]) : PATH_MIN;
const all = args.includes('--all');
const paden = args.includes('--paden');

const root = new URL('../game/', import.meta.url);
const { loadCityData } = await import('./lib/loadworld.mjs');
const data = await loadCityData();
const map = new GameMap(data);
const elev = buildElevation(map);

// per viaduct deck: the underside (road height minus the deck thickness) wherever
// a street-level road runs beneath it (elevation.js flatGrid)
const found = new Map();
// the same per cycle path or footway whose axis runs under the deck's edge
const paths = new Map();
for (const sg of elev.segs) {
  if (!sg.deck) continue;
  const len = sg.len;
  const deckName = sg.r.name || sg.r.id || 'weg';
  for (let d = 0; d <= len; d += 3) {
    const t = d / len;
    const x = sg.ax + (sg.bx - sg.ax) * t, y = sg.ay + (sg.by - sg.ay) * t;
    const zRoad = sg.za + (sg.zb - sg.za) * t;
    if (zRoad < 0.5) continue;
    const flat = elev.flatGrid.at(x, y) || [];
    const lower = flat.filter((f) => laneUnderDeck(x, y, f, sg.hs));
    const c = zRoad - DECK_T;
    // a path the strict rule already counts is no extra passage: this is what it
    // leaves alone beside the deck's edge
    if (paden) {
      for (const f of flat) {
        if (lower.includes(f) || !pathUnderDeck(x, y, f, sg.hs)) continue;
        const key = `${deckName} -> ${f.r.name || f.r.id || 'pad'}`;
        const cur = paths.get(key);
        if (!cur || c < cur.c) paths.set(key, { c, x: Math.round(x), y: Math.round(y) });
      }
    }
    const under = lower.length > 0;
    // the strictest class under this point decides: any car lane needs the full height
    const pathOnly = under && lower.every((f) => f.r.cat === 'cycle' || f.r.cat === 'foot');
    if (!under) continue;
    const key = `${deckName} ${sg.r.cat || ''}${pathOnly ? ' (over a path)' : ''}`;
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
let lowPaths = 0;
if (paden) {
  const padRows = [...paths.entries()].sort((a, b) => a[1].c - b[1].c);
  for (const [name, v] of padRows) {
    if (v.c < MIN_PATH) lowPaths++;
    if (all || v.c < MIN_PATH) console.log(`${v.c.toFixed(2)} m  ${name} (${v.x}, ${v.y}) over a path`);
  }
  console.log(`beside a deck's edge: ${padRows.length} paths, ${lowPaths} below the minimum (${MIN_PATH} m for paths)`);
}
process.exit(low || lowPaths ? 1 : 0);
