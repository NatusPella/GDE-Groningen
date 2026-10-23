// Staat een door OSM als doorgang gemapte weg (covered, building_passage, arcade) echt open voor een wandelaar (#420, het
// poortje van Portal Groningen bij de Werkmanbrug stond dicht)? Per gemapte doorgang van de gebouwde wereld (game/world of
// GAME_WORLD): elke 0,5 m langs de weg door een gebouw, de straal van een wandelaar door resolveBuildingCollisions
// (collision.js); een punt dat meer dan 5 cm wordt weggeduwd is dicht. Alleen lezen.
//   node scripts/passage_open_audit.mjs [--max=<n toegestaan dicht>] [--json]
// Zonder wereld: SKIP. Zonder --max telt elke dichte doorgang als fout.
import { heeftWereld, laadStadTegels } from './lib/stadtegels.mjs';

if (!heeftWereld()) { console.log('SKIP passage_open_audit: geen wereld (GAME_WORLD of game/world)'); process.exit(0); }
const { pointInPolygon } = await import('../game/js/util.js');
const { resolveBuildingCollisions } = await import('../game/js/collision.js');
const T = await laadStadTegels();
const map = T.world;
const arg = (k) => { const a = process.argv.find((v) => v.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : null; };
const RADIUS = 0.35;
const blocked = [], open = [];
for (const w of map.passageWays || []) {
  const P = w.pts;
  const mx = (P[0][0] + P[P.length - 1][0]) / 2, my = (P[0][1] + P[P.length - 1][1]) / 2;
  const b = map.buildingsNear(mx, my, 1).filter((q) => pointInPolygon(mx, my, q.pts)).sort((p, q) => (p.pts.length - q.pts.length))[0];
  if (!b) continue;
  let inside = 0, pushed = 0;
  for (let i = 0; i < P.length - 1; i++) {
    const len = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]);
    const n = Math.max(1, Math.ceil(len / 0.5));
    for (let k = 0; k <= n; k++) {
      const x = P[i][0] + (P[i + 1][0] - P[i][0]) * k / n, y = P[i][1] + (P[i + 1][1] - P[i][1]) * k / n;
      if (!pointInPolygon(x, y, b.pts)) continue;
      inside++;
      const [rx, ry] = resolveBuildingCollisions(x, y, RADIUS, map);
      if (Math.hypot(rx - x, ry - y) > 0.05) pushed++;
    }
  }
  if (!inside) continue;
  (pushed ? blocked : open).push({ kind: w.kind, hw: w.hw, at: [Math.round(mx * 10) / 10, Math.round(my * 10) / 10], gebouw: b.name || b.type, osm: b.osm, lengte: Math.round(P.reduce((s, q, i) => (i ? s + Math.hypot(q[0] - P[i - 1][0], q[1] - P[i - 1][1]) : 0), 0) * 10) / 10, duwt: `${pushed}/${inside}` });
}
console.log(`gemapte doorgangen door een gebouw: ${open.length + blocked.length}, open ${open.length}, dicht ${blocked.length}`);
for (const d of blocked) console.log('  dicht', JSON.stringify(d));
if (process.argv.includes('--json')) console.log(JSON.stringify({ open: open.length, blocked }));
const max = arg('max') === null ? 0 : +arg('max');
process.exit(blocked.length > max ? 1 : 0);
