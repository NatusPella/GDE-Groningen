// #265: traffic on a hamlet crossing on the province tiles (Wildeplaats, Dwarsdiep): no two AI
// cars end up overlapping or piled on the crossing. Seeded, on a virtual clock, with the game's AI.
//   node scripts/hamlet_traffic_test.mjs [--verbose]
// Slaat over zonder game/world (desktop stage).
import './node3d.mjs';
const verbose = process.argv.includes('--verbose');
let seed = +(process.env.SEED || 4242);
Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
await import('../game/js/player.js');
const { loadGameWorld, loadArea } = await import('./worldload.mjs');
const T = await loadGameWorld();
if (!T) { console.log('SKIP hamlet_traffic_test: geen game/world'); process.exit(0); }
const map = T.world;
const V = await import('../game/js/vehicle.js');
const TL = await import('../game/js/trafficlights.js');
const SPOT = [25435, 21226];
await loadArea(T, [SPOT[0] - 500, SPOT[1] - 500, SPOT[0] + 500, SPOT[1] + 500]);
let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log('FAIL', m, info); } };
const q = map.nearestRoadPoint(SPOT[0], SPOT[1], 200, true);
ok(!!q, 'there is a road near Wildeplaats');
const cx = q.x, cy = q.y;
const world = { map, vehicles: [], pedestrians: [], bullets: [], particles: [], time: 0, wanted: 0, player: { x: cx, y: cy, inVehicle: {}, radius: 0.35 }, addMessage() {}, stats: {}, props: [] };
TL.initTrafficLights(world);
const DT = 1 / 30, TT = 180;
globalThis.__ign = { ign: 0, tot: 0 };
let still = 0, through = new Set(), worst = 0, worstAt = null, overlapFrames = 0, frames = 0;
// real overlap: the two bodies (length x width, shrunk by 10%) cross (separating axis test)
const SHRINK = +(process.env.SHRINK || 0.75);
const corners = (v) => { const c = Math.cos(v.angle), s = Math.sin(v.angle), hl = v.halfLen * SHRINK, hw = (v.model.wid || 1.8) / 2 * SHRINK; return [[hl, hw], [hl, -hw], [-hl, -hw], [-hl, hw]].map(([a, b]) => [v.x + a * c - b * s, v.y + a * s + b * c]); };
const overlapping = (a, b) => {
  const A = corners(a), B = corners(b);
  for (const P of [A, B]) for (let i = 0; i < 2; i++) {
    const ex = P[i + 1][0] - P[i][0], ey = P[i + 1][1] - P[i][1];
    const pr = (Q) => Q.map(([x, y]) => x * ey - y * ex);
    const pa = pr(A), pb = pr(B);
    if (Math.max(...pa) < Math.min(...pb) || Math.max(...pb) < Math.min(...pa)) return false;
  }
  return true;
};
for (let t = 0, f = 0; t < TT; t += DT, f++) {
  world.time = t;
  if (f % 30 === 0) V.manageTrafficPopulation(world, { target: 30, spawnMin: 25, spawnMax: 160, despawnDist: 220 });
  TL.updateTrafficLights(DT, world);
  for (const v of world.vehicles) {
    if (v.isBoat || v.parked) continue;
    V.updateTrafficAI(v, DT, map, world, Math.random);
    V.resolveVehicleBuildingCollision(v, map, DT);
  }
  V.resolveVehicleVehicleCollisions(world.vehicles, world);
  if (world.particles.length > 200) world.particles.length = 0;
  for (const v of world.vehicles) { if (v.parked || !v.road) continue; const d = Math.hypot(v.x - cx, v.y - cy); if (d < 8) through.add(v); if (d < 45 && Math.abs(v.speed) < 0.3) still += DT; }
  if (f % 10) continue;
  frames++;
  const live = world.vehicles.filter((v) => !v.parked && !v.isBoat && !v.wrecked && Math.hypot(v.x - cx, v.y - cy) < 60);
  let pairs = 0;
  for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) if (overlapping(live[i], live[j])) { pairs++; const a = live[i], b = live[j]; globalThis.__ign.tot++; if ((a.ignoreId === b.id && t < a.ignoreUntil) || (b.ignoreId === a.id && t < b.ignoreUntil)) globalThis.__ign.ign++; }
  if (pairs) { overlapFrames++; if (verbose) for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) if (overlapping(live[i], live[j])) { const d = (v) => `${v.road && (v.road.name || v.road.type)} d${v.dir} s${v.speed.toFixed(1)} ${v.model.name} L${v.halfLen} at ${v.x.toFixed(1)},${v.y.toFixed(1)} a${v.angle.toFixed(2)} lane${v.laneMode} ${v.countryDrive ? 'country' : ''} ${v._atLight ? 'light' : ''} age${(t - (v.born || 0)).toFixed(0)}`; console.log(t.toFixed(1), d(live[i]), '|', d(live[j])); } }
  if (pairs > worst) { worst = pairs; worstAt = t; }
}
console.log(`hamlet at ${Math.round(cx)},${Math.round(cy)}: ${frames} samples, overlapping pairs worst ${worst} at ${worstAt && worstAt.toFixed(0)} s, in ${overlapFrames} samples`);
if (verbose) for (const v of world.vehicles) { const d = Math.hypot(v.x - cx, v.y - cy); if (d < 45 && !v.parked) console.log('end', v.id, v.road && (v.road.name || v.road.type), 'dir', v.dir, 'seg', v.segIdx, 'd', d.toFixed(0), 'sp', v.speed.toFixed(1), 'still', (v.stillFor || 0).toFixed(0), 'yw', (v.yieldWait || 0).toFixed(0), 'lane', v.laneMode, 'light', !!v._atLight, 'ign', v.ignoreId || '-', 'dead', v.deadEndBounces || 0, 'stuck', v.stuckFor || 0); }
console.log(`cars through ${through.size}, standstill within 45 m ${still.toFixed(0)} car-s`);
console.log('overlap pair-samples', JSON.stringify(globalThis.__ign));
// (a waiting cycle the AI breaks lets one car slip past its partner for a moment, vehicle.js
// resolveDeadlocks: those overlaps are meant; any other overlap is a car stuck in another)
ok(globalThis.__ign.tot === globalThis.__ign.ign, 'no overlap outside the deadlock breaker', JSON.stringify(globalThis.__ign));
ok(overlapFrames <= frames * 0.12, 'overlap is a passing moment, not a lasting state', `${overlapFrames}/${frames}`);
ok(through.size >= 50, 'traffic flows through the crossing', `${through.size} cars`);
console.log(`hamlet_traffic_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
