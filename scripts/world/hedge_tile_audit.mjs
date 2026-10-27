// Gemapte heggen (OSM barrier=hedge, tegelrij `furniture` met k = 'hedge') over een weg? (#324, #508) Elke meter van
// elke gemapte heg van de stadstegels tegen de rijbanen en paden eromheen: een punt binnen de halve breedte van een weg
// is een heg op de weg.
//   node scripts/world/hedge_tile_audit.mjs [--max=0] [--verbose]
// De audit laadt de wereld zoals het spel dat doet (tilestore.js, tileworld.js), dus hij meet de geknipte heggen die
// het spel tekent: tileworld.js knipt een heg waar hij een weg raakt (game/js/tilegreenery.js). 0 is de grens.
// Heeft game/world (GAME_WORLD) met de stadstegels nodig; zonder dat SKIP.
import '../node3d.mjs';
const { heeftWereld, laadStadTegels } = await import('../lib/stadtegels.mjs');
const { hedgeLines } = await import('../../game/js/tilegreenery.js');
if (!heeftWereld()) { console.log('SKIP hedge_tile_audit: geen game/world'); process.exit(0); }
const MAX = Number((process.argv.find((v) => v.startsWith('--max=')) || '--max=0').slice(6)), verbose = process.argv.includes('--verbose');
const city = (await laadStadTegels()).world;
const dseg = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-9; const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2)); return Math.hypot(a[0] + dx * t - x, a[1] + dy * t - y); };
const seen = new Set(), hedges = [];
for (const cell of city.hedgeGrid ? city.hedgeGrid.map.values() : []) for (const h of cell) if (!seen.has(h)) { seen.add(h); hedges.push(h); }
let bad = 0, pts = 0;
const rows = [];
for (const h of hedges) {
  let over = 0, worst = 0, at = null, road = null;
  for (const line of hedgeLines(h)) for (let i = 0; i + 1 < line.length; i++) {
    const a = line[i], b = line[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), m = Math.max(1, Math.ceil(L));
    for (let s = 0; s <= m; s++) {
      const x = a[0] + (b[0] - a[0]) * s / m, y = a[1] + (b[1] - a[1]) * s / m;
      pts++;
      for (const r of city.roadsNear(x, y, 12)) {
        if (r.bridge || r.z) continue;
        let d = Infinity;
        for (let j = 0; j + 1 < r.pts.length; j++) d = Math.min(d, dseg(x, y, r.pts[j], r.pts[j + 1]));
        const hw = r.width / 2;
        if (d < hw - 0.2) { over++; if (hw - d > worst) { worst = hw - d; at = [Math.round(x), Math.round(y)]; road = `${r.name || r.type} ${r.cat} ${r.width} m`; } }
      }
    }
  }
  if (over) { bad++; rows.push({ osm: h.osm, id: h.gid, n: h.pts.length, metersOpWeg: over, diepste: +worst.toFixed(1), plek: at, weg: road }); }
}
console.log(`hedge_tile_audit: ${hedges.length} gemapte heggen (${pts} punten), ${bad} liggen (deels) op een weg`);
rows.sort((a, b) => b.metersOpWeg - a.metersOpWeg);
if (verbose || bad) for (const r of rows.slice(0, 30)) console.log('  ', JSON.stringify(r));
process.exit(bad > MAX ? 1 : 0);
