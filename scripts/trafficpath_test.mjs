// #652: de verkeers-AI bouwt niet langer per voertuig per frame een nieuwe
// padpolyline; elk voertuig houdt één buffer (v._path) met hergebruikte punten.
// node scripts/trafficpath_test.mjs  (headless op de echte stad, virtuele klok)
// Meet met de teller trafficPathStats(): builds versus nieuwe puntobjecten.
import './node3d.mjs';
let seed = +(process.env.SEED || 4242);
Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
await import('../game/js/player.js');
// game/world (de gestagede stad) in plaats van de provincie-opbouw: die laatste
// hangt aan data/cache en is in deze werkboom niet altijd heel.
const { loadGameWorld } = await import('./worldload.mjs');
const V = await import('../game/js/vehicle.js');
const TL = await import('../game/js/trafficlights.js');
const { trafficPathStats } = await import('../game/js/vehicle/traffic.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const T = await loadGameWorld();
if (!T) { console.log('SKIP trafficpath_test: geen game/world'); process.exit(0); }
const map = T.world;
const road = map.roads.find((r) => r.pts && r.pts.length > 2 && r.cat !== 'foot' && r.cat !== 'cycle') || map.roads[0];
const [cx, cy] = road.pts[Math.floor(road.pts.length / 2)];
const world = { map, vehicles: [], pedestrians: [], bullets: [], particles: [], time: 0, wanted: 0, player: { x: cx, y: cy, inVehicle: {}, radius: 0.35 }, addMessage() {}, stats: {}, props: [] };
TL.initTrafficLights(world);
const DT = 1 / 30;
const frame = () => {
  world.time += DT;
  TL.updateTrafficLights(DT, world);
  for (const v of world.vehicles) {
    if (v.isBoat || v.parked) continue;
    V.updateTrafficAI(v, DT, map, world, Math.random);
    V.resolveVehicleBuildingCollision(v, map, DT);
  }
  V.resolveVehicleVehicleCollisions(world.vehicles, world);
};

// een handvol auto's rond de weg, dan twee warme frames (eerste bufferbouw)
V.manageTrafficPopulation(world, { target: 24, spawnMin: 20, spawnMax: 160, despawnDist: 400 });
frame(); frame();
const live = () => world.vehicles.filter((v) => !v.isBoat && !v.parked && !v.wrecked && v._path);
const cars = live();
ok(cars.length >= 5, 'er rijden auto\'s met een pad', cars.length);
const paths = new Map(cars.map((v) => [v, v._path]));
const s0 = trafficPathStats();

for (let f = 0; f < 15; f++) frame();
const s1 = trafficPathStats();
const builds = s1.builds - s0.builds;
const created = s1.newPoints - s0.newPoints;

// meting: vóór #652 was dit een verse array + 6-12 puntobjecten per auto per
// frame; nu alleen nog de eerste keer per auto (de buffer groeit niet meer).
ok(builds >= cars.length * 5, 'de teller ziet de padbuilds', builds);
ok(created < builds * 0.2, 'na de eerste buffer vrijwel geen nieuwe puntobjecten', `${created} nieuw op ${builds} builds`);

// de buffer van een auto is hetzelfde array als na de warme frames
let same = 0;
for (const v of cars) if (v._path === paths.get(v)) same++;
ok(same >= cars.length - 1, 'elk voertuig hergebruikt zijn eigen padbuffer', `${same}/${cars.length}`);

// en de AI doet nog gewoon zijn werk: paden geldig, posities veranderen
let moved = 0, bad = 0;
for (const v of live()) {
  if (!Number.isFinite(v.x) || !Number.isFinite(v.y) || !Number.isFinite(v.speed)) bad++;
  if (v._path.length >= 2 && v._path.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.s))) moved++;
}
ok(bad === 0, 'geen NaN in de voertuigen');
ok(moved >= 5, 'de paden zijn geldig', moved);

// #652-restpunt: de lane-offset/modelLane-uitkomst komt per weg uit de cache,
// zodat ook de filter-array per aanroep weg is.
{
  const laneRoads = map.roads.filter((r) => r.lanesFwd != null);
  const l0 = V.laneCacheStats();
  for (let f = 0; f < 15; f++) frame();
  const l1 = V.laneCacheStats();
  const hits = l1.hits - l0.hits, computed = l1.calls - l0.calls;
  ok(laneRoads.length > 0, 'er zijn wegen met een lane-model', laneRoads.length);
  ok(hits > 0, 'de lane-cache wordt gebruikt', `${hits} hits`);
  ok(hits > computed * 4, 'de lane-uitkomst komt bijna altijd uit de cache', `${hits} hits, ${computed} berekend`);
  console.log(`#652-restpunt meting: ${hits} lane-cache-hits, ${computed} berekeningen in 15 frames (was: een filter-array per aanroep, ~${hits + computed} per 15 frames)`);
}

console.log(`#652 meting: ${builds} padbuilds -> ${created} nieuwe puntobjecten (${(created / builds).toFixed(2)} per build; oud ±6-12 per build), ${same}/${cars.length} buffers hergebruikt`);
console.log(`${n - fails}/${n} trafficpath`);
process.exit(fails ? 1 : 0);
