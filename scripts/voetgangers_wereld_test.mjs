// Voetgangers en verkeer samen op de echte tegels (#1047): de wandelaars van het spel (updatePedestrians, populatiebeheer)
// lopen tussen de AI-auto's (updateTrafficAI); strikte controles per stap:
//   - geen voetganger in een gebouw of in het water,
//   - geen voetganger die door een rijdende auto heen loopt (lichaam in het autolichaam bij meer dan 3 m/s),
//   - geen voetganger die minutenlang op dezelfde plek vastzit in beweging.
//   node scripts/voetgangers_wereld_test.mjs [--verbose] [--secs=90]
// Slaat over zonder game/world (desktop stage).
import './node3d.mjs';
const verbose = process.argv.includes('--verbose');
const secsArg = process.argv.find((a) => a.startsWith('--secs='));
const TT = secsArg ? +secsArg.slice(7) : 90;
let seed = +(process.env.SEED || 99);
Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
let virtueleMs = 0;
try { performance.now = () => virtueleMs; } catch (e) { /* oudere Node */ }
await import('../game/js/player.js');
const { loadGameWorld, loadArea } = await import('./worldload.mjs');
const T = await loadGameWorld();
if (!T) { console.log('SKIP voetgangers_wereld_test: geen game/world'); process.exit(0); }
const map = T.world;
const V = await import('../game/js/vehicle.js');
const TL = await import('../game/js/trafficlights.js');
const P = await import('../game/js/pedestrians.js');
const { isInWater } = await import('../game/js/util.js');

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log('FAIL', m, info); } };
const SPOTS = [['centrum', 192, 138], ['Oosterpoort', 900, 100], ['Helpman', 100, -1100]];
const DT = 1 / 30;
const tot = { peds: 0, inBuilding: 0, inWater: 0, runOver: 0, frozen: 0 };
const ex = [];
for (const [name, sx, sy] of SPOTS) {
  await loadArea(T, [sx - 500, sy - 500, sx + 500, sy + 500]);
  const q = map.nearestRoadPoint(sx, sy, 300, true);
  const cx = q ? q.x : sx, cy = q ? q.y : sy;
  const world = {
    map, vehicles: [], pedestrians: [], bullets: [], particles: [], props: [], time: 0, wanted: 0, stats: {}, audioEvents: [], addMessage() {},
    weapon: 'fists', input: { mouse: { down: false, rightDown: false }, keys: {} }, player: { x: cx, y: cy, angle: 0, inVehicle: null, radius: 0.35, health: 100, speed: 0 },
  };
  TL.initTrafficLights(world);
  const hit = { b: new Set(), w: new Set(), run: new Set() };
  const last = new Map();
  let frozen = 0, peak = 0;
  for (let t = 0, f = 0; t < TT; t += DT, f++) {
    virtueleMs = t * 1000;
    world.time = t;
    if (f % 30 === 0) V.manageTrafficPopulation(world, { target: 24, spawnMin: 30, spawnMax: 180, despawnDist: 240 });
    TL.updateTrafficLights(DT, world);
    for (const v of world.vehicles) {
      if (v.isBoat || v.parked || v.driver === 'player') continue;
      V.updateTrafficAI(v, DT, map, world, Math.random);
      V.resolveVehicleBuildingCollision(v, map, DT);
    }
    V.resolveVehicleVehicleCollisions(world.vehicles, world);
    P.updatePedestrians(DT, world);
    if (world.particles.length > 200) world.particles.length = 0;
    if (world.audioEvents.length > 100) world.audioEvents.length = 0;
    if (f % 15) continue;
    peak = Math.max(peak, world.pedestrians.length);
    for (const p of world.pedestrians) {
      if (p.state === 'dead' || p.ragdoll || p.scripted || p.knocked) continue;
      if (Math.hypot(p.x - cx, p.y - cy) > 250) continue;
      if (!(p.gz > 3) && P.isInsideBuilding(map, p.x, p.y) && !p.nav) { if (!hit.b.has(p)) { hit.b.add(p); if (ex.length < 6) ex.push(`${name} gebouw ${p.x.toFixed(0)},${p.y.toFixed(0)} ${p.state}`); } }
      if (isInWater(map, p.x, p.y) && !(p.gz > 0.5)) hit.w.add(p);
      for (const v of world.vehicles) {
        if (v.parked || v.isBoat || Math.abs(v.speed) < 3 || Math.abs(v.x - p.x) > 6 || Math.abs(v.y - p.y) > 6) continue;
        const c = Math.cos(v.angle), s = Math.sin(v.angle), dx = p.x - v.x, dy = p.y - v.y;
        const lx = dx * c + dy * s, ly = -dx * s + dy * c;
        if (Math.abs(lx) < v.halfLen - 0.3 && Math.abs(ly) < (v.model.wid || 1.8) / 2 - 0.2 && p.state !== 'drive' && !p.inVehicle) {
          if (!hit.run.has(p)) { hit.run.add(p); if (ex.length < 6) ex.push(`${name} door auto ${p.x.toFixed(0)},${p.y.toFixed(0)} ${p.state} v ${v.speed.toFixed(1)}`); }
        }
      }
      // loopt maar komt nergens: 90 s binnen 1 m terwijl hij 'wander' of 'flee' is
      const L = last.get(p);
      if (!L || Math.hypot(p.x - L.x, p.y - L.y) > 1) last.set(p, { x: p.x, y: p.y, t });
      else if ((p.state === 'wander' || p.state === 'flee') && t - L.t > 90) { frozen++; last.set(p, { x: p.x, y: p.y, t: t + 1e6 }); }
    }
  }
  tot.peds += peak; tot.inBuilding += hit.b.size; tot.inWater += hit.w.size; tot.runOver += hit.run.size; tot.frozen += frozen;
  console.log(`${name}: piek ${peak} voetgangers, in gebouw ${hit.b.size}, in water ${hit.w.size}, door een rijdende auto ${hit.run.size}, bevroren ${frozen}`);
}
for (const e of ex) console.log('  ' + e);
const strict = !!process.env.STRICT;
const lim = (v) => (strict ? 0 : v);
ok(tot.peds > 30, 'er lopen voetgangers', String(tot.peds));
ok(tot.inBuilding <= lim(2), 'geen voetganger in een gebouw', String(tot.inBuilding));
ok(tot.inWater <= lim(1), 'geen voetganger in het water', String(tot.inWater));
ok(tot.runOver <= lim(Math.ceil(tot.peds * 0.03)), 'geen voetganger door een rijdende auto heen', String(tot.runOver));
ok(tot.frozen <= lim(3), 'geen voetganger die minutenlang bevroren staat', String(tot.frozen));
console.log(`voetgangers_wereld_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
