// Liggen de watergaten van vaarnet_fixes.json over huizen? (#5, gevonden met de regatta: de baan lag in een woonblok)
// Elk gat is één rechthoek om een cluster ontbrekende watercellen (vaarnet.mjs clusterGaps); een gat dat langs een bocht of schuin
// loopt, dekt een groot stuk land. Per gat (en per verbinding, sluisgat) de gebouwen van de tegels waarvan het midden in de
// rechthoek ligt: water over een gebouw is een boot door een huis, een zwemmer in een woonkamer en een regattaton op een dak.
//   node scripts/world/gaten_gebouwen_audit.mjs [--world=<map>] [--max=0] [--verbose]
// Leest de tegels (index.json en index-provincie.json) van game/world, GAME_WORLD of --world. Zonder wereld: SKIP.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { heeftTegels, leesTegelRijen } from '../lib/tegelrijen.mjs';
import { gatPolygon } from '../../game/js/vaarnet.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const verbose = process.argv.includes('--verbose');
const dir = path.resolve(arg('world', process.env.GAME_WORLD || path.join(ROOT, 'game', 'world')));
if (!heeftTegels(dir)) { console.log('SKIP gaten_gebouwen_audit: geen wereld in ' + dir); process.exit(0); }
const fixes = JSON.parse(fs.readFileSync(path.join(ROOT, 'game', 'vaarnet_fixes.json'), 'utf8'));
const rows = await leesTegelRijen(dir);

// raster van gebouwmiddens (50 m cellen)
const CELL = 50, grid = new Map();
for (const b of rows.buildings) {
  if (!b.pts || b.pts.length < 3 || b.type === 'houseboat') continue;
  let x = 0, y = 0; for (const p of b.pts) { x += p[0]; y += p[1]; }
  const c = [x / b.pts.length, y / b.pts.length, b];
  const k = Math.floor(c[0] / CELL) + ',' + Math.floor(c[1] / CELL);
  (grid.get(k) || grid.set(k, []).get(k)).push(c);
}
const inPoly = (x, y, P) => { let ins = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins; } return ins; };
const bounds = (P) => [Math.min(...P.map((p) => p[0])), Math.min(...P.map((p) => p[1])), Math.max(...P.map((p) => p[0])), Math.max(...P.map((p) => p[1]))];

let gaten = 0, geraakt = 0, gebouwen = 0;
const worst = [];
for (const [naam, lijst] of [['gaten', fixes.gaten], ['verbindingen', fixes.verbindingen], ['sluisgaten', fixes.sluisgaten]]) {
  (lijst || []).forEach((g, i) => {
    gaten++;
    const P = gatPolygon(g), b = bounds(P);
    let n = 0;
    for (let cx = Math.floor(b[0] / CELL); cx <= Math.floor(b[2] / CELL); cx++) for (let cy = Math.floor(b[1] / CELL); cy <= Math.floor(b[3] / CELL); cy++) {
      for (const [x, y] of grid.get(cx + ',' + cy) || []) if (inPoly(x, y, P)) n++;
    }
    if (n) { geraakt++; gebouwen += n; worst.push({ lijst: naam, i, x: Math.round(g[0]), y: Math.round(g[1]), L: Math.round(g[2]), B: Math.round(g[3]), gebouwen: n }); }
  });
}
worst.sort((a, b) => b.gebouwen - a.gebouwen);
console.log(`gaten_gebouwen_audit: ${gaten} watergaten, ${geraakt} liggen over minstens een gebouw (${gebouwen} gebouwen in totaal)`);
for (const r of worst.slice(0, verbose ? 60 : 12)) console.log('  ', JSON.stringify(r));
process.exit(geraakt > Number(arg('max', 0)) ? 1 : 0);
