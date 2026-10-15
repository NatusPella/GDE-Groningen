// Profile audit harness (docs/PROVINCIE-PLAN.md 2.11), F0 skeleton on the
// current data: grades per road class, steps where roads share a vertex, and
// the ring and A7 drive-through that `ring_probe.mjs` / `ringcheck.js` do.
//   node scripts/world/audit_profile.mjs [--strict]
// The F1 solver's output is audited by the same checks (per tile, over every
// road, both directions); --strict exits 1 when a limit is exceeded.
import '../node3d.mjs';
const P = await import('./pack_tiles.mjs');
const { roadZAt } = await import('../../game/js/elevation.js');

const { map } = P.loadSources();
const LIMIT = { major: 0.08, normal: 0.08, minor: 0.1 }; // grade limits of the current model (5 % solved, ramps up to ~6.7 %)
let ways = 0, steep = 0, worst = { g: 0 }, jumps = 0, worstJump = { d: 0 };
const at = new Map();
const key = (p) => `${Math.round(p[0] * 10)},${Math.round(p[1] * 10)}`;
for (const r of map.roads) {
  if (!r.z) continue;
  ways++;
  for (let i = 0; i < r.pts.length - 1; i++) {
    const len = Math.hypot(r.pts[i + 1][0] - r.pts[i][0], r.pts[i + 1][1] - r.pts[i][1]);
    if (len < 0.5) continue;
    const g = Math.abs(r.z[i + 1] - r.z[i]) / len;
    if (g > (LIMIT[r.cat] || 0.1)) steep++;
    if (g > worst.g) worst = { g, road: r.name || r.ref || r.type, at: r.pts[i] };
  }
  r.pts.forEach((p, i) => { const k = key(p); (at.get(k) || at.set(k, []).get(k)).push([r, r.z[i]]); });
}
for (const list of at.values()) {
  if (list.length < 2) continue;
  const zs = list.map((q) => q[1]);
  const d = Math.max(...zs) - Math.min(...zs);
  if (d > 0.02) { jumps++; if (d > worstJump.d) worstJump = { d, at: list[0][0].pts[0], names: list.map((q) => q[0].name || q[0].ref || q[0].type).join(' / ') }; }
}
console.log(`${ways} roads with a height profile, ${map.roads.length} roads`);
console.log(`segments steeper than the limit: ${steep}; steepest ${(worst.g * 100).toFixed(1)} % on ${worst.road} at ${worst.at && worst.at.map(Math.round)}`);
console.log(`vertices shared by roads whose heights differ by more than 2 cm: ${jumps}${jumps ? `; worst ${worstJump.d.toFixed(2)} m between ${worstJump.names}` : ''}`);
const { probeRingSolids } = await import('../../game/js/ringcheck.js');
await import('../../game/js/player.js');
const hits = probeRingSolids({ map, flitspaalen: [] });
console.log(`ring and numbered roads, solids on the lanes: ${hits.length}`);
if (process.argv.includes('--strict') && (steep || jumps || hits.length)) process.exit(1);
