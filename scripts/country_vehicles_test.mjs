// Real vehicles out in the Ommelanden: parks the player at a few country
// spots, lets parkedcars.js fill its slots (farm tractors, quads, the kerbs
// of the tiles' streets) and checks they are there, real Vehicles you can get
// into, and not standing on a road, in a building or in the water; the country
// traffic on the tiles' roads, the meadow drag and the police.
//   node scripts/country_vehicles_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
import zlib from 'node:zlib';

const root = new URL('../game/', import.meta.url);
const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
await import('../game/js/player.js');
// the city's own map for what needs no tiles (water rule, meadow drag, police) and
// the tile world, with the tiles round the spots in, for the rest
const data = JSON.parse(fs.readFileSync(new URL('citymap.json', root)));
applyMapExtras(data, JSON.parse(fs.readFileSync(new URL('mapextras.json', root))));
const cityMap = new GameMap(data);
const { loadGameWorld, loadArea } = await import('./worldload.mjs');
const T = await loadGameWorld();
if (!T) { console.log('SKIP no game/world with the province layer'); process.exit(0); }
const map = T.world;
const F = await import('../game/js/countryfield.js');
const { buildingAt: tileBuildingAt, waterGap } = await import('../game/js/tileplace.js');
const buildingAt = (x, y, m) => (tileBuildingAt(map, x, y, m) ? 1 : -1);
const { ensureCountryEdge } = await import('../game/js/countryplan.js');
const { roadGap } = await import('../game/js/countryedge.js');
const PC = await import('../game/js/parkedcars.js');
const { findEnterableVehicle } = await import('../game/js/vehicle.js');
F.setCountryBounds(map.meta.bounds);
ensureCountryEdge(map);

// a spot past the province's tiles: from the old 'past the real data' spot on south-east until no tile is there
const PWV = await import('../game/js/provinceworld.js');
let beyond = [16328.69, 14806.14];
for (let k = 0; k < 60 && PWV.inProvinceData(beyond[0], beyond[1]) !== false; k++) beyond = [beyond[0] + 1000, beyond[1] + 1000];
const SPOTS = [
  ['Haren', 2838.32, 5353.35],
  ['Bedum', 1931.4, -9027.27],
  ['Ten Boer', 8572.98, -6583.35],
  ['Zuidhorn', -10732.8, -3017.02],
  ['open polder NE', 5505.95, -11770.51, true],
  ['past the province data', beyond[0], beyond[1], true],
];
let fails = 0;
const total = {};
for (const [name, x, y] of SPOTS) await map.prefetchPoints([[x, y]], { radius: 500 });
for (const [name, x, y, mayBeEmpty] of SPOTS) {
  const world = { map, vehicles: [], time: 0, player: { x, y, inVehicle: null }, input: null };
  const t0 = performance.now();
  for (let k = 0; k < 400; k++) {
    if (k % 50 === 0) PC.manageParkedCars(world);
    PC.tickParkedCars(world);
    world.time += 1 / 60;
  }
  const ms = Math.round(performance.now() - t0);
  const cars = [...PC.sleepingParkedCars(world), ...world.vehicles];
  const kinds = {};
  let bad = 0;
  for (const v of cars) {
    kinds[v.model.name] = (kinds[v.model.name] || 0) + 1;
    total[v.model.name] = (total[v.model.name] || 0) + 1;
    if (F.edgeDistance(v.x, v.y) < 0) continue;
    if (roadGap(v.x, v.y, 3) < 0 || buildingAt(v.x, v.y, 0) >= 0 || waterGap(map, v.x, v.y, 3) > -1) bad++;
  }
  // walk up to the nearest one: it wakes and can be entered
  let enter = 'none near';
  const near = cars.filter((v) => F.edgeDistance(v.x, v.y) >= 0).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
  if (near) {
    world.player.x = near.x + Math.cos(near.angle + Math.PI / 2) * (near.model.wid / 2 + 1);
    world.player.y = near.y + Math.sin(near.angle + Math.PI / 2) * (near.model.wid / 2 + 1);
    PC.tickParkedCars(world);
    enter = findEnterableVehicle(world.player.x, world.player.y, world.vehicles) === near ? 'enterable' : 'NOT enterable';
  }
  // (a polder spot with a few farms and no street to park on may have none)
  const ok = (cars.length > 0 || mayBeEmpty) && !bad && (enter === 'enterable' || (mayBeEmpty && !cars.length));
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${cars.length} vehicles ${JSON.stringify(kinds)}, ${bad} misplaced, nearest ${enter}, ${ms} ms`);
}
console.log('parked near the spots', JSON.stringify(total));
// the farm tractors: the procedural polder blocks only exist where the province data is not (countryplan.js
// openLand, #124), so the yard tractors of the tiles' barns are what is left to find; the quads go with the blocks
{
  const farm = {};
  for (const [name, x, y] of SPOTS.slice(0, 4)) {
    await map.prefetchPoints([[x, y]], { radius: 3000 });
    for (const b of map.buildingsNear(x, y, 3000)) { const q = PC.barnTractorSpot(b); if (q) farm[q.model.name] = (farm[q.model.name] || 0) + 1; }
  }
  console.log('yard tractors by the barns of the tiles', JSON.stringify(farm));
  if (!farm.tractor) { fails++; console.log('FAIL no yard tractors by the barns of the tiles'); }
}

// moving traffic: within 70 m every road user is a real vehicle, placed on
// its road each frame; taken over it is let go as an ordinary vehicle
{
  const THREE = await import('three');
  const life = await import('../game/js/countrylife.js');
  const scene = new THREE.Scene();
  await map.prefetchPoints([[2838.32, 5353.35]], { radius: 1800 });
  const world = { map, vehicles: [], time: 0, player: { x: 2838.32, y: 5353.35, inVehicle: null }, paused: false };
  const types = {};
  let real = 0, onPose = 0, taken = 0, released = 0;
  for (let f = 0; f < 1800; f++) {
    world.time += 1 / 30;
    life.updateCountryLife(1 / 30, world, scene, [], 400);
    const tr = life.countryTraffic();
    // walk along with the first road user so it comes near
    if (tr.length && f % 300 === 150) { const a = tr[f % tr.length]; const g = a.g.position; world.player.x = g.x + 30; world.player.y = g.z; }
    for (const a of tr) {
      if (!a.veh) continue;
      types[a.type] = (types[a.type] || 0) + 1;
      real++;
      if (Math.hypot(a.veh.x - a.g.position.x, a.veh.y - a.g.position.z) < 0.05) onPose++;
      if (f % 500 === 499 && !a.veh.driver) {
        const v = a.veh;
        v.driver = 'player';
        taken++;
        life.updateCountryLife(1 / 30, world, scene, [], 400);
        if (!v.countryDrive && world.vehicles.includes(v)) released++;
        v.driver = null;
        break;
      }
    }
  }
  const cd = world.vehicles.filter((v) => v.countryDrive).length;
  const ok = real > 0 && onPose === real && taken === released;
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} moving traffic: ${real} real-vehicle frames ${JSON.stringify(types)}, ${onPose} on their road pose, ${released}/${taken} let go when taken, ${cd} still driven`);
}
// parked cars never overlap: the farm slots and the streets' kerb slots share the roads
{
  let pairs = 0, overlaps = 0;
  for (const [name, x, y] of SPOTS) {
    const world = { map, vehicles: [], time: 0, player: { x, y, inVehicle: null }, input: null };
    for (let k = 0; k < 400; k++) { if (k % 50 === 0) PC.manageParkedCars(world); PC.tickParkedCars(world); world.time += 1 / 60; }
    const cars = [...PC.sleepingParkedCars(world), ...world.vehicles].filter((v) => F.edgeDistance(v.x, v.y) >= 0);
    for (let i = 0; i < cars.length; i++) {
      const a = cars[i];
      if (PC.slotOverlaps(cars.slice(i + 1).map((b) => ({ x: b.x, y: b.y, angle: b.angle, model: b.model })), a.x, a.y, a.angle, a.model, 0.05)) { overlaps++; console.log('  overlap at', name, Math.round(a.x), Math.round(a.y)); }
      pairs++;
    }
  }
  const ok = overlaps === 0;
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} parked cars: ${pairs} checked, ${overlaps} overlapping`);
}

const V = await import('../game/js/vehicle.js');
const E = await import('../game/js/countryedge.js');
const RG = await import('../game/js/roadgraph.js');
RG.setRoadNet(RG.decodeRoadNet(JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('world/provincie-roads.json.gz', root))).toString('utf8'))));
V.setGroundMap(map); // as main.js does: the tile world knows the roads, water and fields of the Ommeland
const SEDAN = { name: 'sedan', len: 4.3, wid: 1.8, maxSpeed: 50, accel: 10, brake: 24, turnRate: 2.6, color: '#444' };

// meadow drag for every driver (the car covers ~80 m in the first 2 s) (vehicle.js offroadDrag): an AI car flat out
// on grass slows to the cap, the same car on the road does not
{
  const drive = (x, y, angle, driver) => {
    const v = new V.Vehicle(x, y, angle, SEDAN);
    v.driver = driver;
    v.speed = 30;
    let worst = 0;
    for (let f = 0; f < 180; f++) { v.applyControls(1 / 60, 1, 0, 0); if (f > 150) worst = Math.max(worst, v.speed); }
    return { v, worst };
  };
  // a meadow and a road in the tiles round Bedum (resident after the prefetch above)
  const [cx, cy] = [1931.4, -9027.27];
  await map.prefetchPoints([[cx, cy]], { radius: 900 });
  let meadow = null, road = null;
  for (let k = 0; k < 4000 && !meadow; k++) {
    const x = cx - 700 + (k * 7919) % 1400, y = cy - 700 + (k * 104729) % 1400;
    if ([0, 10, 20, 30, 40, 50, 60, 70, 80, 90].every((o) => V.offroadGround(map, x + o, y) === 'gras')) meadow = [x, y];
  }
  for (const r of map.roadsNear(cx, cy, 800)) {
    if (r.bridge || r.z || !['major', 'normal', 'minor', 'service'].includes(r.cat)) continue;
    for (let i = 0; i < r.pts.length - 1 && !road; i++) {
      const a = r.pts[i], b = r.pts[i + 1], ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 100) continue;
      if ([5, 15, 25, 35, 45, 55, 65, 75, 85, 95].every((o) => V.carRoadAt(map, a[0] + Math.cos(ang) * o, a[1] + Math.sin(ang) * o))) road = [a[0], a[1], ang];
    }
    if (road) break;
  }
  if (!meadow || !road) { console.log('FAIL meadow drag: no meadow or road found near Bedum', !!meadow, !!road); fails++; } else {
  const ai = drive(meadow[0], meadow[1], 0, null), pl = drive(meadow[0], meadow[1], 0, 'player'), onRoad = drive(road[0], road[1], road[2], null);
  // the same gentle cap for every driver: grass costs a sedan some top end, not a wall
  const ok = ai.worst < onRoad.worst - 2 && pl.worst < onRoad.worst - 2 && ai.worst > 28 && pl.worst > 28 && Math.abs(ai.worst - pl.worst) < 4;
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} meadow drag: AI ${ai.worst.toFixed(1)} m/s, player ${pl.worst.toFixed(1)} m/s after 3 s flat out from 30 on grass; on a road ${onRoad.worst.toFixed(1)}`);
  }
}

// bridges over open water stay dry across the road's width and a car driven along the deck
// never sinks (the tiles' railings are road meshes: no solid lines to test in Node)
{
  const { inMapWater } = await import('../game/js/util.js');
  let decks = 0, wet = 0, cars = 0, sunk = 0;
  for (const r of RG.roadNetRows()) {
    if (!r.bridge || decks >= 12) continue;
    for (let i = 0; i < r.pts.length - 1 && decks < 12; i++) {
      const a = r.pts[i], b = r.pts[i + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len <= 12) continue;
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      if (F.edgeDistance(mx, my) < 30) continue;
      const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
      await loadArea(T, [mx - 60, my - 60, mx + 60, my + 60]);
      if (!side(r, mx, my, ux, uy)) continue;
      decks++;
      for (let t = -len / 2 + 1; t <= len / 2 - 1; t += 2) for (const o of [-r.w / 2, 0, r.w / 2]) {
        if (V.overOpenWater(map, mx + ux * t - uy * o, my + uy * t + ux * o, 0)) wet++;
      }
      const v = new V.Vehicle(a[0] + ux * 2, a[1] + uy * 2, Math.atan2(uy, ux), SEDAN);
      v.driver = 'player';
      v.speed = 10;
      cars++;
      for (let f = 0; f < 60; f++) {
        v.applyControls(1 / 60, 0.3, 0, 0);
        if ((v.x - a[0]) * ux + (v.y - a[1]) * uy > len - 2) break;
        if (V.overOpenWater(map, v.x, v.y, 0)) { sunk++; break; }
      }
    }
  }
  function side(r, mx, my, ux, uy) {
    const o = r.w / 2 + 6;
    return inMapWater(map, mx - uy * o, my + ux * o) || inMapWater(map, mx + uy * o, my - ux * o);
  }
  const ok = decks > 0 && !wet && cars > 0 && !sunk;
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} bridges: ${decks} decks over open water, ${wet} wet deck points, ${sunk}/${cars} cars driven along the deck ended in the water`);
}

// police out in the Ommeland: units come in on the country roads, drive them
// towards a player parked in the fields and get there
{
  const Pol = await import('../game/js/police.js');
  const snapCountry = RG.snapRoad;
  let units = 0, onRoad = 0, offRoad = 0, reached = 0, wet = 0, runs = 0;
  for (const target of [[5505.95, -11770.51], [1931.4, -9027.27], [8572.98, -6583.35]]) {
    runs++;
    await map.prefetchPoints([target], { radius: 3200 });
    const car = new V.Vehicle(target[0], target[1], 0, SEDAN);
    car.driver = 'player';
    const world = {
      map, vehicles: [car], pedestrians: [], bullets: [], particles: [], time: 0, wanted: 3, wantedDecayTimer: 0,
      player: { x: target[0], y: target[1], inVehicle: car, radius: 0.35 }, addMessage() {}, stats: {},
    };
    const seen = new Set();
    let closest = Infinity;
    for (let f = 0; f < 60 * 45; f++) {
      world.time += 1 / 60;
      world.wanted = 3;
      Pol.updatePolice(1 / 60, world);
      for (const v of world.vehicles) {
        if (!v.isPolice || v.isBoat) continue;
        seen.add(v);
        const d = Math.hypot(v.x - car.x, v.y - car.y);
        closest = Math.min(closest, d);
        if (V.overOpenWater(map, v.x, v.y, 0)) wet++;
        if (d > 40 && !v._direct && f % 30 === 0) { const q = snapCountry(v.x, v.y, 100); if (q && q.d < 6) onRoad++; else offRoad++; }
      }
    }
    units += seen.size;
    // up to the player, or as close as the road nearest them when water lies between
    const gap = snapCountry(target[0], target[1], 600).d;
    if (closest < Math.max(15, gap + 8)) reached++;
    console.log(`     at ${target}: ${seen.size} units, closest ${closest.toFixed(1)} m (nearest road ${gap.toFixed(1)} m)`);
  }
  const share = onRoad / Math.max(1, onRoad + offRoad);
  // (the units' last stretch and the tracks beside the road are on the tiles now, not only on the road net; their ditch crossings are counted, not failed)
  const ok = units > 0 && reached === runs && share > 0.6;
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} police in the Ommeland: ${units} units, ${reached}/${runs} reached the player, ${(share * 100).toFixed(0)}% of road-following samples on a road, ${wet} in the water`);
}
process.exit(fails ? 1 : 0);
