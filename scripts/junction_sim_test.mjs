// Junctions (docs/PROVINCIE-PLAN.md 2.13): the junction model and a headless
// traffic simulation through the busiest junctions of each kind.
//   node scripts/junction_sim_test.mjs [--quick] [--verbose]
// 1. The model (junctions.js junctionModel): every car junction has a
//    control, every entering arm a rule and a stop distance; the arms that
//    give way are exactly the ones with haaientanden (yieldArms), signals
//    only at signal controllers, roundabout entries give way, equal
//    junctions are right-before-left; no two signal streams that cross share
//    a green (trafficlights.js streamsCompatible over every controller).
// 2. The simulation: traffic around a signalised crossing, a roundabout, a
//    priority junction and an equal one (rechts voor), on a virtual clock
//    with the game's own AI (vehicle.js updateTrafficAI, the population
//    manager, the signal controllers): cars pass through (throughput), no
//    one stands still near the junction for long without a red light or a
//    queue to wait for (no deadlock), no more hard crashes between AI cars
//    than the v0.29 AI had (seeded, so the same every run).
import './node3d.mjs';
import fs from 'node:fs';

const quick = process.argv.includes('--quick');
const verbose = process.argv.includes('--verbose');
let seed = +(process.env.SEED || 12345);
Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
await import('../game/js/player.js');
const JN = await import('../game/js/junctions.js');
const TL = await import('../game/js/trafficlights.js');
const V = await import('../game/js/vehicle.js');

let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } else if (verbose) console.log(`ok   ${name}${info ? ' (' + info + ')' : ''}`); };

const root = new URL('../game/', import.meta.url);
const { loadCityData } = await import('./lib/loadworld.mjs');
const data = await loadCityData();
const map = new GameMap(data);

// --- 1. the model
const model = JN.junctionModel(map);
const kinds = {};
for (const J of model.values()) kinds[J.control] = (kinds[J.control] || 0) + 1;
console.log(`junction model: ${model.size} car junctions: ${Object.entries(kinds).map(([k, v]) => `${k} ${v}`).join(', ')}`);
{
  let noRule = 0, badStop = 0;
  for (const J of model.values()) for (const a of J.arms) {
    if (!a.rule) noRule++;
    if (!(a.stop >= 3 && a.stop <= 16)) badStop++;
  }
  ok(!noRule && !badStop, 'every arm has a rule and a stop distance', `${noRule} without a rule, ${badStop} bad stops`);
  // painted = obeyed: the arms with haaientanden are the yield arms of the model
  const painted = new Set(JN.yieldArms(map).map((y) => `${y.node.key}|${y.idx}|${y.d}|${y.road.pts[0]}`));
  let missing = 0, extra = 0;
  const yields = new Set();
  for (const J of model.values()) for (const a of J.arms) {
    if (a.rule !== 'yield' || !a.enter || a.road.roundabout) continue;
    const k = `${J.key}|${a.idx}|${a.d}|${a.road.pts[0]}`;
    yields.add(k);
    if (!painted.has(k)) missing++;
  }
  for (const k of painted) if (!yields.has(k)) extra++;
  ok(!missing && !extra, 'the arms that give way carry the haaientanden, and only they', `${missing} yield arms unpainted, ${extra} painted arms that do not yield`);
  let ringEntry = 0, ringBad = 0;
  for (const J of model.values()) {
    if (J.control !== 'roundabout') continue;
    for (const a of J.arms) {
      if (!a.enter || a.road.roundabout) continue;
      ringEntry++;
      if (a.rule !== 'yield' && a.rule !== 'exit') ringBad++;
    }
  }
  ok(ringEntry > 0 && !ringBad, 'every roundabout entry gives way to the ring', `${ringBad}/${ringEntry}`);
  const equal = [...model.values()].filter((J) => J.control === 'equal');
  ok(equal.length > 0 && equal.every((J) => J.arms.every((a) => a.rule === 'right' || a.rule === 'exit')), 'equal junctions: right before left', equal.length);
}
// signals: no conflicting streams green together
{
  const world = { map, vehicles: [], pedestrians: [], time: 0, player: { x: 0, y: 0 } };
  TL.initTrafficLights(world);
  const ctrls = TL.getTrafficControllers();
  let bad = 0, checked = 0;
  for (const c of ctrls) {
    const heads = (c.approaches || []).filter((a) => !a.bike);
    for (let t = 0; t < 120; t += 1) {
      TL.updateTrafficLights(1, world);
      const green = heads.filter((a) => TL.getTrafficLightPhase(a) === 'green');
      for (let i = 0; i < green.length; i++) for (let j = i + 1; j < green.length; j++) {
        checked++;
        if (!TL.streamsCompatible(green[i], green[j]) && TL.trafficLightPhaseMove(green[i], false) === 'green' && TL.trafficLightPhaseMove(green[j], false) === 'green') bad++;
      }
    }
    if (quick) break;
  }
  ok(ctrls.length > 0 && bad === 0, 'signal controllers: no crossing streams green together', `${bad} of ${checked} pairs, ${ctrls.length} controllers`);
}

// --- 2. the simulation
function pick(control, score) {
  return [...model.values()].filter((J) => J.control === control).sort((a, b) => score(b) - score(a))[0];
}
const entering = (J) => J.arms.filter((a) => a.enter).length;
const sumRank = (J) => J.arms.reduce((s, a) => s + a.rank, 0) + entering(J) * 3;
const cases = [
  ['signals', pick('signals', sumRank)],
  ['roundabout', pick('roundabout', sumRank)],
  ['priority', pick('priority', sumRank)],
  ['equal', pick('equal', (J) => entering(J) * 10 + sumRank(J))],
].filter(([, J]) => J);

for (const [kind, J] of cases) {
  const world = {
    map, vehicles: [], pedestrians: [], bullets: [], particles: [], time: 0, wanted: 0,
    // (the player stands at the junction for the population manager, out of the cars' way: "in a vehicle")
    player: { x: J.x, y: J.y, inVehicle: {}, radius: 0.35 }, addMessage() {}, stats: {}, props: [],
  };
  TL.initTrafficLights(world);
  const DT = 1 / 30, T = quick ? 90 : 240;
  const through = new Set(), stuck = new Map();
  let crashes = 0, worstStill = 0, worstAt = null, worstV = null;
  for (let t = 0, f = 0; t < T; t += DT, f++) {
    world.time = t;
    if (f % 30 === 0) V.manageTrafficPopulation(world, { target: 26, spawnMin: 25, spawnMax: 160, despawnDist: 220 });
    TL.updateTrafficLights(DT, world);
    for (const v of world.vehicles) {
      if (v.isBoat || v.parked) continue;
      V.updateTrafficAI(v, DT, map, world, Math.random);
      V.resolveVehicleBuildingCollision(v, map, DT);
    }
    const before = world.particles.length;
    V.resolveVehicleVehicleCollisions(world.vehicles, world);
    for (let i = before; i < world.particles.length; i++) if (world.particles[i].kind === 'impact' && world.particles[i].strength > 0.35) crashes++;
    if (world.particles.length > 200) world.particles.length = 0;
    for (const v of world.vehicles) {
      if (v.parked || !v.road) continue;
      const d = Math.hypot(v.x - J.x, v.y - J.y);
      if (d < 8) through.add(v);
      // standing still near the junction with nothing to wait for: no red
      // light ahead and no queue behind one
      const held = v._atLight || (v._leader && v._leader._atLight);
      if (d < 45 && Math.abs(v.speed) < 0.3 && !held) {
        const s = (stuck.get(v) || 0) + DT;
        stuck.set(v, s);
        if (s > worstStill) { worstStill = s; worstAt = [Math.round(v.x), Math.round(v.y)]; worstV = v; }
      } else stuck.delete(v);
    }
  }
  const perMin = through.size / (T / 60);
  const info = `${kind} at ${Math.round(J.x)},${Math.round(J.y)} (${entering(J)} entering arms): ${through.size} cars through in ${T} s (${perMin.toFixed(1)}/min), longest standstill without a light ${worstStill.toFixed(0)} s${worstAt ? ' at ' + worstAt : ''}, ${crashes} hard crashes`;
  console.log(`     ${info}`);
  if (verbose && worstV) { const w = worstV; console.log("     stuck:", JSON.stringify({ id: w.id, road: w.road && (w.road.name || w.road.type), dir: w.dir, seg: w.segIdx, speed: w.speed, laneMode: w.laneMode, yieldWait: w.yieldWait, waitTimer: w.waitTimer, stillFor: w.stillFor, why: w._why, vt: w.vTargetDbg, stuckFor: w.stuckFor, waitFor: w.waitFor, leader: w._leader && w._leader.id, atLight: w._atLight, ignore: w.ignoreId, creep: w.creepUntil, plan: (w.plan || []).length, wrecked: w.wrecked, driver: w.driver, parked: w.parked, model: w.model && w.model.name })); }
  ok(perMin >= 4, `${kind}: traffic flows through`, info);
  ok(worstStill < 40, `${kind}: no deadlock`, info);
  // (the v0.29 AI has its knocks too: up to ~2 a minute at the busiest
  // signals in 4 seeded runs; more than 3 a minute is a regression)
  ok(crashes <= T / 20, `${kind}: no pile-ups between AI cars`, info);
}

console.log(`${n - fails}/${n} junction checks passed`);
process.exit(fails ? 1 : 0);
