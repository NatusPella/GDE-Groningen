// De hervatbare graafopbouw (#1008):  node scripts/routegraphbuild_test.mjs  [--bench]
// Stap voor stap bouwen (met een piepklein budget) geeft exact dezelfde graaf als achter elkaar, en een stap blijft klein.
import { graphBuildSteps, runSteps, ROADS_PER_STEP } from '../game/js/routegraphbuild.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

let seed = 12345;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const TYPES = ['residential', 'service', 'track', 'motorway', 'steps', 'footway', 'primary', 'cycleway'];
const CATS = ['normal', 'major', 'minor', 'foot', 'cycle'];
function makeRoads(count) {
  const roads = [];
  for (let i = 0; i < count; i++) {
    // roads on a coarse lattice so that many share endpoints (nodes are keyed on 0,5 m)
    const gx = Math.floor(rnd() * 60), gy = Math.floor(rnd() * 60);
    const pts = [[gx * 20, gy * 20]];
    const segs = 1 + Math.floor(rnd() * 4);
    let x = gx, y = gy;
    for (let s = 0; s < segs; s++) {
      if (rnd() < 0.5) x += rnd() < 0.5 ? 1 : -1; else y += rnd() < 0.5 ? 1 : -1;
      pts.push([x * 20, y * 20]);
    }
    roads.push({ pts, type: TYPES[Math.floor(rnd() * TYPES.length)], cat: CATS[Math.floor(rnd() * CATS.length)], oneway: rnd() < 0.2, bridge: rnd() < 0.1, busOnly: rnd() < 0.05 });
  }
  return roads;
}
const hooks = {
  isDrivable: (r) => r.cat !== 'foot' && r.cat !== 'cycle' && !r.busOnly,
  isWalkable: (r) => !r.busOnly && r.type !== 'motorway',
  isBikeable: (r) => !r.busOnly && r.type !== 'motorway' && r.type !== 'steps',
  oneWayFor: (r) => !!r.oneway,
  throughOf: (r, i) => (r.pts.length + i) % 7 === 0,
  consts: { THROUGH_BUILDING_COST: 8, SERVICE_COST: 2.5, OFFROAD_COST: 15, STEPS_COST: 60, MOTORWAY_AVOID: 8, BIKE_COST: { cycle: 0.8, minor: 1.15, normal: 1, major: 1.8, foot: 1.4 }, MOTORWAY_TYPES: new Set(['motorway', 'motorway_link']) },
};

const sameArr = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const sameAdj = (a, b) => sameArr(a.start, b.start) && sameArr(a.to, b.to) && sameArr(a.len, b.len) && (a.road === null ? b.road === null : sameArr(a.road, b.road));
const KEYS = ['drive', 'driveAvoid', 'bike', 'free', 'mixed', 'walk'];
function sameGraph(a, b) {
  if (a.N !== b.N || !sameArr(a.x, b.x) || !sameArr(a.y, b.y)) return false;
  for (const k of KEYS) if (!sameAdj(a[k], b[k])) return false;
  for (const k of ['walkComp', 'driveComp', 'bikeComp']) if (a[k].main !== b[k].main || !sameArr(a[k].comp, b[k].comp)) return false;
  return true;
}

const roads = makeRoads(3000);
const full = runSteps(graphBuildSteps(roads, hooks)).value;
ok(full.N > 100 && full.drive.to.length > 100 && full.walk.to.length > 100 && full.bike.to.length > 100, 'de testkaart heeft een echte graaf', { N: full.N });
ok(full.roadNodes.size === roads.length, 'elke weg heeft zijn knopen');

// elke stap een sleuf van 0 ms: minstens een stap per aanroep, dus de bouw loopt in zo veel mogelijk porties
let calls = 0, res;
const gen = graphBuildSteps(roads, hooks);
do { res = runSteps(gen, 0); calls++; } while (!res.done);
ok(calls > roads.length / ROADS_PER_STEP, 'de bouw loopt in meerdere porties', calls);
ok(sameGraph(full, res.value), 'stap voor stap geeft dezelfde graaf als achter elkaar');

// een ruimer budget geeft minder porties en dezelfde graaf
let t = 0;
const fakeNow = () => (t += 1); // elke klokaanroep kost 1 ms
const gen2 = graphBuildSteps(roads, hooks);
let calls2 = 0, res2;
do { res2 = runSteps(gen2, 20, fakeNow); calls2++; } while (!res2.done);
ok(calls2 < calls && sameGraph(full, res2.value), 'een budget van 20 ms: minder porties, dezelfde graaf', { calls, calls2 });

// minstens een stap per aanroep, ook met een negatief budget
const gen3 = graphBuildSteps(roads.slice(0, 10), hooks);
const r3 = runSteps(gen3, -1);
ok(r3.steps >= 1, 'altijd minstens een stap');

// een lege wegenlijst geeft een lege graaf
const empty = runSteps(graphBuildSteps([], hooks)).value;
ok(empty.N === 0 && empty.drive.to.length === 0, 'geen wegen: lege graaf');

// de graaf is deterministisch: twee keer bouwen geeft hetzelfde
ok(sameGraph(full, runSteps(graphBuildSteps(roads, hooks)).value), 'deterministisch');

if (process.argv.includes('--bench')) {
  const big = makeRoads(20000);
  const t0 = performance.now();
  runSteps(graphBuildSteps(big, hooks));
  const whole = performance.now() - t0;
  const g = graphBuildSteps(big, hooks);
  let worst = 0, steps = 0;
  for (;;) { const s = performance.now(); const r = g.next(); const d = performance.now() - s; steps++; if (d > worst) worst = d; if (r.done) break; }
  console.log(`20000 wegen: achter elkaar ${whole.toFixed(0)} ms; in ${steps} stappen, langste stap ${worst.toFixed(1)} ms`);
}

console.log(fails ? `${fails} van ${n} mislukt` : `ok: ${n} controles`);
process.exit(fails ? 1 : 0);
