// CPU cost of the traffic simulation without a browser (#58, #246): the city, the game's own AI (vehicle.js updateTrafficAI, the building and vehicle
// collisions, the population manager, the signals) around a point of the city, seeded, on a virtual clock of 60 steps a second. Prints the CPU ms per
// step (process.cpuUsage, so other work on the machine does not count) and the functions the time is in (self time, inspector profiler).
//   GDE_PROVINCE_SRC=<repo>/data/cache/province node scripts/perf/simbench.mjs [--seconds=60] [--target=30] [--at=x,y] [--top=30] [--noprof] [--cache=<bestand>]
// --cache bewaart de ingeladen stad bij de eerste run (v8.serialize) en leest hem daarna terug: het inladen kost op een drukke machine 10 minuten, de simulatie 1 minuut.
// The same seed gives the same cars, so a change that must not alter the traffic can be checked by the "digest" line (a hash of all positions at the end).
import '../node3d.mjs';
import inspector from 'node:inspector';
import fs from 'node:fs';
import v8 from 'node:v8';

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const SECONDS = +arg('seconds', 60), TARGET = +arg('target', 30), TOP = +arg('top', 30);
let seed = +(process.env.SEED || 12345);
Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

const { GameMap } = await import('../../game/js/mapdata.js');
await import('../../game/js/player.js');
const TL = await import('../../game/js/trafficlights.js');
const V = await import('../../game/js/vehicle.js');
const { loadCityData } = await import('../lib/loadworld.mjs');
const t0 = performance.now();
const cacheFile = arg('cache', '');
let cityData;
if (cacheFile && fs.existsSync(cacheFile)) cityData = v8.deserialize(fs.readFileSync(cacheFile));
else { cityData = await loadCityData(); if (cacheFile) fs.writeFileSync(cacheFile, v8.serialize(cityData)); }
const map = new GameMap(cityData);
console.log(`city loaded in ${((performance.now() - t0) / 1000).toFixed(0)} s`);

// the busiest part of the ring road region: the middle of the city unless --at=x,y
const at = arg('at', '0,0').split(',').map(Number);
const world = {
  map, vehicles: [], pedestrians: [], bullets: [], particles: [], time: 0, wanted: 0,
  player: { x: at[0], y: at[1], inVehicle: {}, radius: 0.35 }, addMessage() {}, stats: {}, props: [],
};
TL.initTrafficLights(world);
const DT = 1 / 60;
let fcount = 0;
const step = (t) => {
  world.time = t;
  if (fcount++ % 90 === 0) V.manageTrafficPopulation(world, { target: TARGET, spawnMin: 25, spawnMax: 160, despawnDist: 220 });
  TL.updateTrafficLights(DT, world);
  for (const v of world.vehicles) {
    if (v.isBoat || v.parked) continue;
    V.updateTrafficAI(v, DT, map, world, Math.random);
    V.resolveVehicleBuildingCollision(v, map, DT);
  }
  V.resolveVehicleVehicleCollisions(world.vehicles, world);
  if (world.particles.length > 200) world.particles.length = 0;
};
// settle: cars spawn and spread out
for (let t = 0; t < 20; t += DT) step(t);

const session = new inspector.Session();
const prof = !process.argv.includes('--noprof');
if (prof) { session.connect(); await new Promise((res) => session.post('Profiler.enable', () => session.post('Profiler.setSamplingInterval', { interval: 100 }, () => session.post('Profiler.start', res)))); }
const c0 = process.cpuUsage(), w0 = performance.now();
let steps = 0, maxCars = 0;
for (let t = 20; t < 20 + SECONDS; t += DT, steps++) { step(t); maxCars = Math.max(maxCars, world.vehicles.length); }
const c1 = process.cpuUsage(c0), wall = performance.now() - w0;
const cpuMs = (c1.user + c1.system) / 1000;
let profile = null;
if (prof) profile = await new Promise((res) => session.post('Profiler.stop', (e, r) => res(r.profile)));
let digest = 0;
for (const v of world.vehicles) digest = (digest * 31 + Math.round(v.x * 10) * 7 + Math.round(v.y * 10) * 13 + Math.round((v.speed || 0) * 10)) | 0;
console.log(`${steps} steps of ${(DT * 1000).toFixed(1)} ms, ${world.vehicles.length} cars (most ${maxCars}): ${(cpuMs / steps).toFixed(3)} ms CPU per step, ${(wall / steps).toFixed(3)} ms wall; digest ${digest}`);
if (profile) {
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const per = new Map();
  profile.samples.forEach((id, i) => per.set(id, (per.get(id) || 0) + (profile.timeDeltas[i] || 0)));
  const self = new Map(); let all = 0;
  for (const [id, us] of per) {
    const cf = byId.get(id).callFrame;
    if (cf.functionName === '(idle)' || cf.functionName === '(program)') continue;
    const k = `${cf.functionName || '(anon)'} ${cf.url.split('/').pop()}:${cf.lineNumber + 1}`;
    self.set(k, (self.get(k) || 0) + us); all += us;
  }
  console.log('self time per function (share of the sampled time, ms per step):');
  for (const [k, us] of [...self].sort((a, b) => b[1] - a[1]).slice(0, TOP)) console.log(`${(us / all * 100).toFixed(1).padStart(5)}%  ${(us / 1000 / steps).toFixed(3).padStart(7)}  ${k}`);
}
process.exit(0);
