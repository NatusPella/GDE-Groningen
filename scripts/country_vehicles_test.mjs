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
process.exit(fails ? 1 : 0);
