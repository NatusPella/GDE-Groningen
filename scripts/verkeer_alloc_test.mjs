// Geheugen en tijd van de verkeers-AI per frame op de echte tegels (#1048, punt 9: geen allocaties per frame, tijdbudget).
// 30 AI-auto's rijden door het centrum; na 60 s opwarmen meten we 20 s lang alleen updateTrafficAI (zonder populatiebeheer):
// de gemiddelde kortlevende allocatie per auto-stap en de zwaarste stap.
//   node scripts/verkeer_alloc_test.mjs        (draait zichzelf opnieuw met --expose-gc)
// Slaat over zonder game/world (desktop stage).
import { spawnSync } from 'node:child_process';
if (typeof gc !== 'function') {
  const r = spawnSync(process.execPath, ['--expose-gc', ...process.argv.slice(1)], { stdio: 'inherit' });
  process.exit(r.status ?? 1);
}
await import('./node3d.mjs');
// GDE_ALLOC_PROFILE=1: toon de grootste allocerende functies tijdens de meetfase (inspector-steekproef, ook wat al weg is)
const profile = !!process.env.GDE_ALLOC_PROFILE;
let session = null;
if (profile) { const insp = await import('node:inspector'); session = new insp.Session(); session.connect(); }
const post = (m, p) => new Promise((res, rej) => session.post(m, p, (e, r) => (e ? rej(e) : res(r))));
let seed = 31337;
Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const realNow = performance.now.bind(performance);
let virtueleMs = 0;
try { performance.now = () => virtueleMs; } catch (e) { /* oudere Node */ }
await import('../game/js/player.js');
const { loadGameWorld, loadArea } = await import('./worldload.mjs');
const T = await loadGameWorld();
if (!T) { console.log('SKIP verkeer_alloc_test: geen game/world'); process.exit(0); }
const map = T.world;
const V = await import('../game/js/vehicle.js');
const TL = await import('../game/js/trafficlights.js');
let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log('FAIL', m, info); } };

await loadArea(T, [-400, -400, 600, 600]);
const q = map.nearestRoadPoint(192, 138, 300, true);
const world = { map, vehicles: [], pedestrians: [], bullets: [], particles: [], props: [], time: 0, wanted: 0, stats: {}, addMessage() {}, player: { x: q.x, y: q.y, inVehicle: {}, radius: 0.35 } };
TL.initTrafficLights(world);
const DT = 1 / 30;
let steps = 0, bytes = 0, worstMs = 0, totMs = 0;
for (let t = 0, f = 0; t < 80; t += DT, f++) {
  virtueleMs = t * 1000;
  world.time = t;
  if (f % 30 === 0) V.manageTrafficPopulation(world, { target: 30, spawnMin: 30, spawnMax: 200, despawnDist: 260 });
  TL.updateTrafficLights(DT, world);
  const measure = t > 60;
  if (profile && measure && !session._started) { session._started = true; await post('HeapProfiler.startSampling', { samplingInterval: 256, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true }); }
  const cars = world.vehicles.filter((v) => !v.isBoat && !v.parked && v.driver !== 'player');
  let before = 0;
  if (measure && !profile) { gc(); before = process.memoryUsage().heapUsed; }
  const t0 = realNow();
  for (const v of cars) V.updateTrafficAI(v, DT, map, world, Math.random);
  const ms = realNow() - t0;
  if (measure && !profile) {
    bytes += Math.max(0, process.memoryUsage().heapUsed - before);
    steps += cars.length; totMs += ms; if (ms > worstMs) worstMs = ms;
  }
  if (profile && measure) { for (const v of cars) { v.x += Math.cos(v.angle) * v.speed * DT * 0; } continue; }
  for (const v of cars) V.resolveVehicleBuildingCollision(v, map, DT);
  V.resolveVehicleVehicleCollisions(world.vehicles, world);
  if (world.particles.length > 200) world.particles.length = 0;
}
if (profile) {
  const { profile: pr } = await post('HeapProfiler.stopSampling');
  const by = new Map();
  (function walk(nd) {
    const cf = nd.callFrame;
    const key = `${cf.functionName || '(anon)'} ${cf.url.split('/').slice(-2).join('/')}:${cf.lineNumber + 1}`;
    by.set(key, (by.get(key) || 0) + (nd.selfSize || 0));
    for (const c of nd.children || []) walk(c);
  })(pr.head);
  const tot = [...by.values()].reduce((a, b) => a + b, 0);
  console.log(`totaal ${(tot / 1024).toFixed(0)} KB over ${steps} stappen`);
  for (const [k, v] of [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(`${(v / 1024).toFixed(0).padStart(7)} KB ${k}`);
  process.exit(0);
}
const perStep = bytes / Math.max(1, steps);
console.log(`${steps} auto-stappen: ${perStep.toFixed(0)} B per auto-stap kortlevend, ${(totMs / (steps / 30)).toFixed(3)} ms per frame (gemiddeld), zwaarste frame ${worstMs.toFixed(2)} ms`);
ok(steps > 300, 'er zijn auto-stappen gemeten', String(steps));
ok(perStep < 20000, 'de verkeers-AI maakt niet meer kortlevend afval per auto-stap dan de gemeten stand (restpunt, zie docs/VERKEER-AUDIT-21-11.md)', `${perStep.toFixed(0)} B`);
ok(worstMs < 25, 'het zwaarste AI-frame blijft onder het tijdbudget van 25 ms voor 30 auto\'s', `${worstMs.toFixed(1)} ms`);
console.log(`verkeer_alloc_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
