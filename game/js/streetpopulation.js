// Straatbevolking en de foutmelding van het beeld: de voetgangers op peil houden, het verkeer uitdunnen
// op een trage machine en één zichtbare foutmelding per sessie. Afgesplitst uit main.js (#497), zonder
// inhoudelijke wijziging: dezelfde namen, dezelfde volgorde, dezelfde commentaren.
import { spawnPedestriansNear } from './pedestrians.js';
import { scaledTarget, keepVehicle } from './simload.js';
import { MODS } from './cheatmods.js';
import { trafficFactor } from './difficulty.js'; // #1169
import { dist } from './util.js';
import { hoofdspeler } from './players.js';

// De foutmelding zelf staat in fouttoast.js (puur te testen, zonder de wereld).
export { showFrameError } from './fouttoast.js';

export const PED_TARGET = 45;

// over budget on a CPU-bound machine: the farthest ordinary cars and
// cyclists out of sight go first (simload.js)
export function thinTraffic(world) {
  const { vehicles } = world;
  const player = hoofdspeler(world);
  const tf = trafficFactor(); // #1169: Verkeersdrukte per save (Standaard: 1)
  const want = { car: Math.round(scaledTarget(30) * MODS.cars * tf), bike: Math.round(scaledTarget(16) * MODS.bikes * tf), scooter: Math.round(scaledTarget(10) * MODS.scooters * tf) };
  const kindOf = (v) => (v.isBike ? 'bike' : v.isScooter ? 'scooter' : v.isBus || v.isBoat || v.parked || v.wrecked ? null : 'car');
  const have = { car: [], bike: [], scooter: [] };
  for (const v of vehicles) {
    const k = kindOf(v);
    if (!k || keepVehicle(v) || v.missionFatbike) continue;
    const d = Math.hypot(v.x - player.x, v.y - player.y);
    if (d > 110) have[k].push([d, v]);
  }
  for (const k in have) {
    const all = have[k];
    let excess = vehicles.reduce((n, v) => n + (kindOf(v) === k && !keepVehicle(v) ? 1 : 0), 0) - want[k];
    if (MODS.fading ? excess <= 0 : excess <= 2) continue;
    all.sort((a, b) => b[0] - a[0]);
    for (const [, v] of all) {
      if (excess <= 0) break;
      vehicles.splice(vehicles.indexOf(v), 1);
      excess--;
    }
  }
}
const PED_DESPAWN_DIST = 150;

export function maintainPedestrians(world) {
  // in a cutscene the street life fills round the camera's view, not round the hidden player (#157)
  const f = world.cameraOverride && world.streamFocus ? world.streamFocus : hoofdspeler(world);
  world.pedestrians = world.pedestrians.filter(
    (p) => p.state === 'dead' || dist(p.x, p.y, f.x, f.y) < PED_DESPAWN_DIST
  );
  if (world.pedestrians.length < PED_TARGET) {
    world.pedestrians.push(...spawnPedestriansNear(
      world.map, f.x, f.y, PED_TARGET - world.pedestrians.length, Math.random
    ));
  }
}
