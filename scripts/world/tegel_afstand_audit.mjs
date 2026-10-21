// Bomen en gemapte heggen tegen de wegen, per tegel van een gebouwde wereld (#324): elke boom en elk punt van een heg
// (OSM barrier=hedge, tegelrij FURNITURE met k = 'hedge') tegen de rijbanen op maaiveld (autowegen, geen brug of tunnel).
// Een boom met zijn stam binnen de halve breedte van een weg staat op de weg; van een heg telt elke meter. Bomen horen
// sinds tegel_schoon.mjs (pack-bouw) naast de weg te staan: 0 op de rijbaan. Heggen over een weg zijn informatie: het spel
// zet er geen heginstanties op (streetfurniture.js pieceOnWayOrWater) en laat de gemapte lijn dus weg waar hij de weg kruist.
// Leest index.json (de stadstegels) en index-provincie.json uit game/world, GAME_WORLD of --world=<map>.
//   node scripts/world/tegel_afstand_audit.mjs [--world=<map>] [--max-bomen=0] [--verbose]
// Zonder wereld: SKIP.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { heeftTegels, leesTegelRijen, wegRaster } from '../lib/tegelrijen.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const verbose = process.argv.includes('--verbose');
const dir = path.resolve(arg('world', process.env.GAME_WORLD || path.join(ROOT, 'game', 'world')));
if (!heeftTegels(dir)) { console.log('SKIP tegel_afstand_audit: geen wereld in ' + dir); process.exit(0); }
const rows = await leesTegelRijen(dir);
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
  for (let i = 0; i + 1 < h.pts.length; i++) {
    const a = h.pts[i], b = h.pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), m = Math.max(1, Math.ceil(L));
    for (let s = 0; s <= m; s++) {
      const x = a[0] + (b[0] - a[0]) * s / m, y = a[1] + (b[1] - a[1]) * s / m;
      hedgePts++;
      const e = rand(x, y);
      if (e && e.m < -0.2) { over++; if (-e.m > worst) { worst = -e.m; at = [Math.round(x), Math.round(y)]; road = e.r.name || e.r.type; } }
    }
  }
  if (over >= 2) { hedgeOn++; worstHedges.push({ osm: h.osm, metersOpWeg: over, diepste: +worst.toFixed(1), plek: at, weg: road }); }
}
console.log(`tegel_afstand_audit: ${rows.tiles} tegels, ${rows.trees.length} bomen: ${treeOn} op een rijbaan, ${treeNarrow} binnen 0,4 m van de rand; ${rows.hedges.length} gemapte heggen (${hedgePts} punten): ${hedgeOn} lopen over een weg (informatie)`);
worstTrees.sort((a, b) => b.opWeg - a.opWeg);
worstHedges.sort((a, b) => b.metersOpWeg - a.metersOpWeg);
if (verbose || treeOn) for (const r of worstTrees.slice(0, 20)) console.log('  boom', JSON.stringify(r));
if (verbose) for (const r of worstHedges.slice(0, 20)) console.log('  heg', JSON.stringify(r));
process.exit(treeOn > Number(arg('max-bomen', 0)) ? 1 : 0);
