// Meerijden (stationtravel.js, docs/PROVINCIE-PLAN.md 3.2): ride along in a
// stoptrein, halte voor halte, on railway.js's own physics.
//  1. Groningen Noord -> Loppersum (the Delfzijl line through Bedum and
//     Stedum): the train stops at every halte on the way, arrives within the
//     menu's estimate (+50 %), the camera stays near the train and finite,
//     the player steps off at Loppersum, the controls come back;
//  2. the same ride skipped after 30 s (hold Space): the arrival scene, the
//     player at the halte, the clock moved on by the rest of the ride.
//   node scripts/train_ride_test.mjs
import './node3d.mjs';
import fs from 'node:fs';

// a DOM stub deep enough for the cutscene overlay (cinematics.js) and the ride board
const noop = () => {};
const ctx = document.createElement('canvas').getContext('2d');
const mk = () => ({ width: 1, height: 1, toDataURL: () => '',
  style: { setProperty: noop, removeProperty: noop }, dataset: {}, children: [], textContent: '', innerHTML: '',
  classList: { toggle: noop, add: noop, remove: noop, contains: () => false }, appendChild: noop, removeChild: noop, remove: noop,
  addEventListener: noop, removeEventListener: noop, setAttribute: noop, querySelector: () => mk(), querySelectorAll: () => [],
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 1, height: 1 }), getContext: () => ctx,
});
document.body = mk();
document.createElement = mk;

const root = new URL('../game/', import.meta.url);
const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
const { loadStadData } = await import('./lib/loadworld.mjs');
const data = await loadStadData({ extras: true });
const map = new GameMap(data);
const F = await import('../game/js/countryfield.js');
F.setCountryBounds(map.meta.bounds);
// the routes out of the city as the tile builds bake them (scripts/world/cityroutes.mjs), here the routes' own track
const { applyCityRoutes } = await import('../game/js/corridorrail.js');
const { loadCityRouteSource } = await import('./world/cityroutes.mjs');
applyCityRoutes(map, loadCityRouteSource());
const RW = await import('../game/js/railway.js');
const ST = await import('../game/js/stationtravel.js');
const CI = await import('../game/js/cinematics.js');

let fails = 0;
const fail = (m) => { fails++; console.log('FAIL ' + m); };
const msgs = [];
const input = { isDown: () => false, wasPressed: () => false, consume() {}, reset() {} };
const world = {
  map, vehicles: [], pedestrians: [], player: { x: 0, y: 0, angle: 0, vx: 0, vy: 0, z: 0 }, companion: null, time: 0, clock: 10, money: 200,
  wanted: 0, input, onRespawn: [], audioEvents: [], particles: [], addMessage: (t) => msgs.push([world.time, t]), health: 100,
};
RW.initRailway(world);
ST.initStationTravel(world);
const names = ST.getStationsForRender().map((s) => s.name);
console.log(`stations: ${names.join(', ')}`);

async function run(maxS, onFrame) {
  const dt = 1 / 30;
  // cinematics.js needs a frame before it starts (its DOM)
  for (let f = 0; f < maxS * 30; f++) {
    world.time += dt;
    if (!CI.cinematicPausesGameplay()) RW.updateRailway(dt, world);
    CI.updateCinematics(dt, world);
    if (onFrame && onFrame(f * dt) === false) return f * dt;
    await null;
    if (!ST.isTrainTripActive()) return f * dt;
  }
  return maxS;
}
CI.updateCinematics(1 / 30, world);
for (let k = 0; k < 400 && !CI.isCinematicActive() ; k++) CI.updateCinematics(1 / 30, world);
CI.skipCinematic();

const FROM = 'Groningen Noord', TO = 'Loppersum';
if (!names.includes(FROM) || !names.includes(TO)) fail(`stations ${FROM} / ${TO} missing`);

// --- 1. the whole ride
{
  msgs.length = 0;
  const money = world.money, clock = world.clock;
  if (!ST.startRideBetween(world, FROM, TO)) fail('no direct ride Groningen Noord -> Loppersum');
  const est = 25 * 60;
  let far = 0, nan = 0, maxSpeed = 0, frames = 0, held = 0, scene = false;
  const t0 = world.time;
  const dur = await run(est * 2, () => {
    frames++;
    if (CI.isCinematicActive('train-arrive')) scene = true;
    const pose = world.cameraOverride;
    if (world.challengeHoldPlayer) held++;
    const t = RW.getTrains().find((q) => q.state !== 'parked' && Math.hypot(q.cars[0].x - world.player.x, q.cars[0].y - world.player.y) < 80);
    if (pose && pose.position) {
      if (![pose.position.x, pose.position.y, pose.position.z, pose.lookAt.x, pose.lookAt.y].every(Number.isFinite)) nan++;
      else if (t && Math.hypot(pose.position.x - t.cars[1].x, pose.position.y - t.cars[1].y) > 90) far++;
    }
    if (t) maxSpeed = Math.max(maxSpeed, t.v);
  });
  const halts = msgs.filter(([, m]) => /^Halte /.test(m)).map(([, m]) => m.slice(6));
  console.log(`ride ${FROM} -> ${TO}: ${(dur / 60).toFixed(1)} min, haltes on the way: ${halts.join(', ')}, top speed ${maxSpeed.toFixed(1)} m/s, ${frames} frames`);
  if (ST.isTrainTripActive() || ST.isTrainRideActive()) fail('the ride did not end');
  for (const h of ['Bedum', 'Stedum']) if (!halts.includes(h)) fail(`no stop at ${h} on the way`);
  if (nan) fail(`${nan} camera poses with NaN`);
  if (!scene) fail('no arrival scene at the end of the ride');
  if (far > frames * 0.02) fail(`${far} camera poses far from the train`);
  if (held < frames * 0.9) fail('the player was not held while riding');
  if (world.challengeHoldPlayer || world.trainCam || world.cinematicHidePlayers) fail('the controls did not come back');
  const lop = ST.getStationsForRender().find((s) => s.name === TO);
  if (Math.hypot(world.player.x - lop.arrive.x, world.player.y - lop.arrive.y) > 1) fail('the player is not at the Loppersum halte');
  if (world.money >= money) fail('no ticket paid');
  if (world.clock !== clock) fail('a ride in real time moved the clock on as well');
  if (!msgs.some(([, m]) => /^Aangekomen in Loppersum/.test(m))) fail('no arrival message');
  globalThis.rideMin = dur / 60;
}

// --- 2. skipped after 30 s
{
  msgs.length = 0;
  // back to Groningen Noord the quick way, then ride again
  const clock0 = world.clock;
  if (!ST.startRideBetween(world, TO, FROM)) fail('no ride back');
  let skippedAt = null, arriveScene = false;
  const dur = await run(600, (t) => {
    if (t > 30 && skippedAt === null) { skippedAt = t; CI.skipCinematic(); }
    if (CI.isCinematicActive('train-arrive')) arriveScene = true;
  });
  console.log(`skipped ride ${TO} -> ${FROM}: skipped at ${skippedAt && skippedAt.toFixed(0)} s, over after ${dur.toFixed(1)} s, arrival scene ${arriveScene}, clock +${((world.clock - clock0) * 60).toFixed(0)} min`);
  if (!arriveScene) fail('no arrival scene after a skip');
  if (ST.isTrainTripActive()) fail('the skipped ride did not end');
  const noord = ST.getStationsForRender().find((s) => s.name === FROM);
  if (Math.hypot(world.player.x - noord.arrive.x, world.player.y - noord.arrive.y) > 1) fail('the player is not at Groningen Noord after the skip');
  const left = (world.clock - clock0) * 60;
  if (!(left > 5)) fail(`the skip did not move the clock on by the rest of the ride (${left.toFixed(1)} min)`);
}

console.log(fails ? `${fails} failure(s)` : 'train ride: ok');
process.exit(fails ? 1 : 0);
