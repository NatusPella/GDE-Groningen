// Bomen en gemapte heggen tegen de wegen, per tegel van een gebouwde wereld (#324, #508): elke boom en elk punt van een
// heg (OSM barrier=hedge, tegelrij FURNITURE met k = 'hedge') tegen de rijbanen op maaiveld (autowegen, geen brug,
// tunnel of dek). Een boom met zijn stam binnen de halve breedte van een weg staat op de weg; van een heg telt elke meter.
//
// De audit meet wat het spel tekent: bomen en heggen gaan eerst door dezelfde opruiming als bij het laden van een
// tegel (game/js/tilegreenery.js, game/js/treeclear.js, tileworld.js), met de wegen van alle tegels erbij. Wat hier
// overblijft, staat ook echt in de wereld. 0 bomen op de rijbaan en 0 heggen over een weg zijn de grenzen
// (--max-bomen, --max-heggen).
// Leest index.json (de stadstegels) en index-provincie.json uit game/world, GAME_WORLD of --world=<map>.
//   node scripts/world/tegel_afstand_audit.mjs [--world=<map>] [--max-bomen=0] [--max-heggen=0] [--verbose]
// Zonder wereld: SKIP.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { heeftTegels, leesTegelRijen, wegRaster, greeneryMap } from '../lib/tegelrijen.mjs';
import { clearTreesFromRoads } from '../../game/js/treeclear.js';
import { trimHedgeRow, hedgeLines } from '../../game/js/tilegreenery.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const verbose = process.argv.includes('--verbose');
const dir = path.resolve(arg('world', process.env.GAME_WORLD || path.join(ROOT, 'game', 'world')));
if (!heeftTegels(dir)) { console.log('SKIP tegel_afstand_audit: geen wereld in ' + dir); process.exit(0); }
const rows = await leesTegelRijen(dir);

// de opruiming die het spel bij het laden doet (tileworld.js addTile → tilegreenery.js), over de hele wereld
const map = await greeneryMap(rows);
const trim = { moved: 0, removed: 0 };
const marked = rows.trees.map((t, i) => [t.x, t.y, i]);
rows.trees = clearTreesFromRoads(map, marked, trim).map((a) => ({ ...rows.trees[a[2]], x: a[0], y: a[1] }));
let cutHedges = 0;
for (const h of rows.hedges) {
  if (!trimHedgeRow(map, h)) continue;
  cutHedges++;
}
rows.hedges = rows.hedges.filter((h) => h.pts.length > 1);

const rand = wegRaster(rows.roads);

let treeOn = 0, treeNarrow = 0;
const worstTrees = [];
for (const t of rows.trees) {
  const e = rand(t.x, t.y);
  if (!e) continue;
  if (e.m < 0.05) { treeOn++; worstTrees.push({ x: Math.round(t.x), y: Math.round(t.y), opWeg: +(-e.m).toFixed(2), weg: e.r.name || e.r.type }); } else if (e.m < 0.4) treeNarrow++;
}
let hedgeOn = 0, hedgePts = 0;
const worstHedges = [];
for (const h of rows.hedges) {
  let over = 0, worst = 0, at = null, road = '';
  for (const line of hedgeLines(h)) for (let i = 0; i + 1 < line.length; i++) {
    const a = line[i], b = line[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), m = Math.max(1, Math.ceil(L));
    for (let s = 0; s <= m; s++) {
      const x = a[0] + (b[0] - a[0]) * s / m, y = a[1] + (b[1] - a[1]) * s / m;
      hedgePts++;
      const e = rand(x, y);
      if (e && e.m < -0.2) { over++; if (-e.m > worst) { worst = -e.m; at = [Math.round(x), Math.round(y)]; road = e.r.name || e.r.type; } }
    }
  }
  if (over >= 2) { hedgeOn++; worstHedges.push({ osm: h.osm, metersOpWeg: over, diepste: +worst.toFixed(1), plek: at, weg: road }); }
}
console.log(`tegel_afstand_audit: ${rows.tiles} tegels, ${rows.trees.length} bomen: ${treeOn} op een rijbaan, ${treeNarrow} binnen 0,4 m van de rand; ${rows.hedges.length} gemapte heggen (${hedgePts} punten): ${hedgeOn} lopen over een weg`);
console.log(`  opgeruimd bij het laden: ${trim.removed} bomen weg, ${trim.moved} naast de weg, ${cutHedges} heggen geknipt`);
worstTrees.sort((a, b) => b.opWeg - a.opWeg);
worstHedges.sort((a, b) => b.metersOpWeg - a.metersOpWeg);
if (verbose || treeOn) for (const r of worstTrees.slice(0, 20)) console.log('  boom', JSON.stringify(r));
if (verbose || hedgeOn) for (const r of worstHedges.slice(0, 20)) console.log('  heg', JSON.stringify(r));
process.exit(treeOn > Number(arg('max-bomen', 0)) || hedgeOn > Number(arg('max-heggen', 0)) ? 1 : 0);
