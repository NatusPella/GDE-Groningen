// Headroom under viaducts: samples every street-level road lane every 3 m and
// reports the lowest deck underside above it (elevation.js ceilingAt), per
// viaduct road, worst first. A car is under 2 m, a bus 3.2 m, a lorry 4 m;
// Dutch roads are built for 4.5 m.
//   node scripts/clearance_audit.mjs [--min 4.2] [--all]
// Needs the vendored three.js once: cd desktop && npm run stage
import './node3d.mjs';
import fs from 'node:fs';

const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
await import('../game/js/player.js');
const { buildElevation, DECK_T } = await import('../game/js/elevation.js');

const args = process.argv.slice(2);
const minArg = args.indexOf('--min');
const MIN = minArg >= 0 ? Number(args[minArg + 1]) : 4.2;
const all = args.includes('--all');

const root = new URL('../game/', import.meta.url);
const data = JSON.parse(fs.readFileSync(new URL('citymap.json', root)));
applyMapExtras(data, JSON.parse(fs.readFileSync(new URL('mapextras.json', root))));
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
    const under = (elev.flatGrid.at(x, y) || []).some((f) => {
      const dx = f.bx - f.ax, dy = f.by - f.ay, l2 = dx * dx + dy * dy || 1;
      const u = Math.max(0, Math.min(1, ((x - f.ax) * dx + (y - f.ay) * dy) / l2));
      return Math.hypot(x - (f.ax + dx * u), y - (f.ay + dy * u)) <= f.hs;
    });
    if (!under) continue;
    const c = zRoad - DECK_T;
    const key = `${sg.r.name || sg.r.id || 'weg'} ${sg.r.cat || ''}`;
    const cur = found.get(key);
    if (!cur || c < cur.c) found.set(key, { c, x: Math.round(x), y: Math.round(y), cat: '' });
  }
}
const rows = [...found.entries()].sort((a, b) => a[1].c - b[1].c);
let low = 0;
for (const [name, v] of rows) {
  if (v.c < MIN) low++;
  if (all || v.c < MIN) console.log(`${v.c.toFixed(2)} m  ${name} (${v.x}, ${v.y}) ${v.cat}`);
}
console.log(`under viaducts: ${rows.length} roads, ${low} below ${MIN} m`);
process.exit(low ? 1 : 0);
