// Real vehicles out in the Ommelanden: parks the player at a few country
// spots, lets parkedcars.js fill its slots (farm tractors, quads, village
// kerbs) and checks they are there, real Vehicles you can get into, and
// not standing on a road, in a building or in the water.
//   node scripts/country_vehicles_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { P, PO } from '../game/js/worldframe.js';

const root = new URL('../game/', import.meta.url);
const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
await import('../game/js/player.js');
const data = JSON.parse(fs.readFileSync(new URL('citymap.json', root)));
applyMapExtras(data, JSON.parse(fs.readFileSync(new URL('mapextras.json', root))));
const map = new GameMap(data);
const F = await import('../game/js/countryfield.js');
const { initReal, buildingAt } = await import('../game/js/countryreal.js');
const { ensureCountryEdge } = await import('../game/js/countryplan.js');
const { roadGap } = await import('../game/js/countryedge.js');
const PC = await import('../game/js/parkedcars.js');
const { findEnterableVehicle } = await import('../game/js/vehicle.js');
F.setCountryBounds(map.meta.bounds);
const om = JSON.parse(fs.readFileSync(new URL('ommeland.json', root)));
const bin = zlib.gunzipSync(fs.readFileSync(new URL('ommeland.bin', root)));
initReal(map, { ...om, bin: bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength) });
ensureCountryEdge(map);

const SPOTS = [
  ['Eelde', ...P(1606, 9909)],
  ['Bedum', ...P(2079, -8936)],
  ['Ten Boer', ...P(8673, -6393)],
  ['Zuidhorn', ...P(-10665, -3160)],
  ['open polder NE', ...P(5700, -11600)],
  ['past the real data', ...P(16000, 15000)],
];
let fails = 0;
const total = {};
for (const [name, x, y] of SPOTS) {
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
    if (roadGap(v.x, v.y, 3) < 0 || buildingAt(v.x, v.y, 0) >= 0 || F.realWater(v.x, v.y) > -1) bad++;
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
  const ok = cars.length > 0 && !bad && enter === 'enterable';
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${cars.length} vehicles ${JSON.stringify(kinds)}, ${bad} misplaced, nearest ${enter}, ${ms} ms`);
}
console.log('parked near the spots', JSON.stringify(total));
// the farm tractors and quads over a 15 x 15 km band past the real data
const farm = {};
for (let bx = 14; bx < 30; bx++) for (let by = 14; by < 30; by++) for (const q of PC.farmVehicleSpots(bx, by)) farm[q.model.name] = (farm[q.model.name] || 0) + 1;
console.log('farm vehicles in 256 polder blocks', JSON.stringify(farm));
if (!farm.tractor || !farm.quad) fails++;

// moving traffic: within 70 m every road user is a real vehicle, placed on
// its road each frame; taken over it is let go as an ordinary vehicle
{
  const THREE = await import('three');
  const life = await import('../game/js/countrylife.js');
  const scene = new THREE.Scene();
  const world = { map, vehicles: [], time: 0, player: { ...PO(1606, 9909), inVehicle: null }, paused: false };
  const types = {};
  let real = 0, onPose = 0, taken = 0, released = 0;
  for (let f = 0; f < 3000; f++) {
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
// parked cars never overlap: countrySlots and the village kerbs share streets
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
const { REAL } = await import('../game/js/countryreal.js');
const { isInWater, inWaterPoly, setExtraWater } = await import('../game/js/util.js');
V.setGroundMap(map);
// as countrywater.js does when the 3D scene starts
setExtraWater(E.wideWaterAt);
const SEDAN = { name: 'sedan', len: 4.3, wid: 1.8, maxSpeed: 50, accel: 10, brake: 24, turnRate: 2.6, color: '#444' };

// meadow drag for every driver (vehicle.js offroadDrag): an AI car flat out
// on grass slows to the cap, the same car on the road does not
{
  const drive = (x, y, angle, driver) => {
    const v = new V.Vehicle(x, y, angle, SEDAN);
    v.driver = driver;
    v.speed = 30;
    let worst = 0;
    for (let f = 0; f < 120; f++) { v.applyControls(1 / 60, 1, 0, 0); if (f > 90) worst = Math.max(worst, v.speed); }
    return { v, worst };
  };
  let meadow = null, road = null;
  for (let k = 0; k < 6000 && !meadow; k++) {
    const x = -9000 + (k * 7919) % 18000, y = -9000 + (k * 104729) % 18000;
    if (F.edgeDistance(x, y) < 300) continue;
    if ([0, 10, 20, 30, 40].every((o) => V.offroadGround(map, x + o, y) === 'gras')) meadow = [x, y];
  }
  for (const r of REAL.roads) {
    if (r.kind > 3 || r.bridge) continue;
    const a = r.pts[0], b = r.pts[1];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 60 && F.edgeDistance(a[0], a[1]) > 300) { road = [a[0], a[1], Math.atan2(b[1] - a[1], b[0] - a[0])]; break; }
  }
  const ai = drive(meadow[0], meadow[1], 0, null), pl = drive(meadow[0], meadow[1], 0, 'player'), onRoad = drive(road[0], road[1], road[2], null);
  // the same gentle cap for every driver: grass costs a sedan some top end, not a wall
  const ok = ai.worst < onRoad.worst - 2 && pl.worst < onRoad.worst - 2 && ai.worst > 28 && pl.worst > 28 && Math.abs(ai.worst - pl.worst) < 4;
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} meadow drag: AI ${ai.worst.toFixed(1)} m/s, player ${pl.worst.toFixed(1)} m/s after 2 s flat out from 30 on grass; on a road ${onRoad.worst.toFixed(1)}`);
}

// one water rule: 'deep' is what sinks (inWaterPoly / isInWater), the painted
// water ('wade', 'ditch') never does
{
  const n = { deep: 0, wade: 0, ditch: 0, dry: 0 };
  let bad = 0;
  for (let k = 0; k < 60000; k++) {
    const x = -14000 + (k * 7919.3) % 28000, y = -14000 + (k * 104729.7) % 28000;
    if (F.edgeDistance(x, y) < 5) continue;
    const w = E.countryWater(x, y);
    n[w || 'dry']++;
    if ((w === 'deep') !== inWaterPoly(map, x, y) || (w === 'deep') !== isInWater(map, x, y)) bad++;
  }
  const ok = !bad && n.deep > 0 && n.wade > 0 && n.ditch > 0;
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} one water rule: ${JSON.stringify(n)}, ${bad} where sinking disagrees`);
}

// bridges: dry out to the railings, and a car steered at a railing stays on the deck
{
  let decks = 0, wetDeck = 0, cars = 0, sunk = 0;
  for (const r of REAL.roads) {
    if (!r.bridge) continue;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], b = r.pts[i + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      if (len <= 8 || F.realWater(mx, my) <= 1.5 || F.rectOutside(mx, my) <= 0 || F.edgeDistance(mx, my) < 30) continue;
      const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len, h = E.deckHalf(r.w);
      decks++;
      for (const s of [1, -1]) for (const o of [r.w / 2 + 0.5, h - 0.3]) if (E.wideWaterAt(mx - uy * o * s, my + ux * o * s)) wetDeck++;
      if (cars >= 40) continue;
      // 40 degrees off the road at 15 m/s, into the railing
      const v = new V.Vehicle(mx - ux * 6, my - uy * 6, Math.atan2(uy, ux) + 0.7, SEDAN);
      v.driver = 'player';
      v.speed = 15;
      cars++;
      for (let f = 0; f < 90; f++) {
        v.applyControls(1 / 60, 0.5, 0, 0);
        V.resolveVehicleBuildingCollision(v, map, 1 / 60);
        // near the deck end the road may bend away (a slower car arrives there later): that is not the railing job
        const along = (v.x - a[0]) * ux + (v.y - a[1]) * uy;
        if (along > len - 1.5) break;
        if (V.overOpenWater(map, v.x, v.y, 0)) { sunk++; break; }
      }
    }
  }
  const ok = decks > 0 && !wetDeck && cars > 0 && !sunk;
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} bridges: ${decks} decks over open water, ${wetDeck} deck points in the water, ${sunk}/${cars} cars into a railing ended in the water`);
}

// police out in the Ommeland: units come in on the country roads, drive them
// towards a player parked in the fields and get there
{
  const Pol = await import('../game/js/police.js');
  const { snapCountry } = await import('../game/js/countryroute.js');
  let units = 0, onRoad = 0, offRoad = 0, reached = 0, wet = 0, runs = 0;
  for (const target of [P(5700, -11600), P(2079, -8936), P(8673, -6393)]) {
    runs++;
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
  const ok = units > 0 && reached === runs && share > 0.85 && !wet;
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} police in the Ommeland: ${units} units, ${reached}/${runs} reached the player, ${(share * 100).toFixed(0)}% of road-following samples on a road, ${wet} in the water`);
}
process.exit(fails ? 1 : 0);
