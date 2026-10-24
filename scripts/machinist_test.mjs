// Machinist-minigame (machinistrules.js, issue #14): the pure rules, and a
// service driven on railway.js's own physics (the real stoptrein line):
//  1. scoring: platform tolerance, lateness, speeding and the emergency brake;
//  2. a clean driver (the test autopilot) makes the stops with a medal;
//  3. a driver who never brakes misses them and scores nothing;
//  4. abandoning keeps what was done; doors hold the timetable.
//   node scripts/machinist_test.mjs
import './node3d.mjs';
import fs from 'node:fs';

const noop = () => {};
const ctx = document.createElement('canvas').getContext('2d');
const mk = () => ({ width: 1, height: 1, toDataURL: () => '', style: { setProperty: noop, removeProperty: noop }, dataset: {}, children: [], textContent: '', innerHTML: '',
  classList: { toggle: noop, add: noop, remove: noop, contains: () => false }, appendChild: noop, removeChild: noop, remove: noop, addEventListener: noop, removeEventListener: noop,
  setAttribute: noop, querySelector: () => mk(), querySelectorAll: () => [], getBoundingClientRect: () => ({ left: 0, top: 0, width: 1, height: 1 }), getContext: () => ctx });
document.body = mk();
document.createElement = mk;

const R = await import('../game/js/machinistrules.js');
const root = new URL('../game/', import.meta.url);
import { loadCityWorld } from './lib/loadworld.mjs';
const map = (await loadCityWorld()).map;
const F = await import('../game/js/countryfield.js');
F.setCountryBounds(map.meta.bounds);
const { applyCityRoutes } = await import('../game/js/corridorrail.js');
const { loadCityRouteSource } = await import('./world/cityroutes.mjs');
applyCityRoutes(map, loadCityRouteSource());
const RW = await import('../game/js/railway.js');

let fails = 0;
const fail = (m) => { fails++; console.log('FAIL ' + m); };
const world = { map, vehicles: [], pedestrians: [], player: { x: 0, y: 0, angle: 0, vx: 0, vy: 0, z: 0 }, companion: null, time: 0, clock: 10, money: 0,
  wanted: 0, onRespawn: [], audioEvents: [], particles: [], addMessage: noop, health: 100 };
RW.initRailway(world);

// --- 1. scoring and boards
{
  const base = { errM: 0, lateS: 0, over: 0, ebrakes: 0 };
  if (R.scoreStop(base) !== 100) fail(`perfect stop is ${R.scoreStop(base)}, not 100`);
  if (!(R.scoreStop({ ...base, errM: 6 }) < R.scoreStop(base))) fail('6 m off is not worth less than on the mark');
  if (!(R.scoreStop({ ...base, errM: 12 }) < R.scoreStop({ ...base, errM: 6 }))) fail('12 m off is not worth less than 6 m');
  if (!(R.scoreStop({ ...base, lateS: 70 }) < R.scoreStop({ ...base, lateS: 5 }))) fail('lateness costs nothing');
  if (R.scoreStop({ ...base, lateS: 5 }) !== 100) fail('5 s late already costs points');
  if (R.scoreStop({ ...base, over: 8 }) !== 100 - 16) fail('speeding penalty is off');
  if (R.scoreStop({ ...base, ebrakes: 2 }) !== 90) fail('emergency brake penalty is off');
  if (R.scoreStop({ errM: 200, lateS: 999, over: 99, ebrakes: 9 }) !== 0) fail('a disaster does not floor at 0');
  if (R.stopMedal(2) !== 3 || R.stopMedal(5) !== 2 || R.stopMedal(12) !== 1 || R.stopMedal(30) !== 0) fail('stop medals');
  const lims = [500, 250, 100, 20].map((d) => R.speedLimit(30, d));
  if (!(lims[0] > lims[1] && lims[1] > lims[2] && lims[2] > lims[3])) fail(`speed boards do not step down: ${lims}`);
  // a train at the limit of each board can still stop for the platform
  for (const d of [150, 60]) if (R.brakeDist(R.speedLimit(30, d)) > d + 1) fail(`the board ${d} m out cannot be braked for`);
  if (R.brakeDist(R.speedLimit(30, 300)) > 300) fail('the 300 m board cannot be braked for');
}

// --- a service on the real physics
const route = RW.getTrains().map((t) => t.route).find((r) => r.stops.filter((s) => !s.offmap).length >= 5);
if (!route) { fail('no route with five halten'); process.exit(1); }
const inRoute = (r) => RW.getTrains().find((t) => t.route === r);
const dt = 1 / 30;

// the arc the train's middle can reach on the drivable track
const reach = (t) => { const [lo, hi] = RW.driveRange(t.route); return [lo + t.halfLen, hi - t.halfLen]; };

function driveService(label, pilot, maxS = 1800) {
  const t = inRoute(route);
  const first = route.stops.findIndex((s) => !s.offmap);
  Object.assign(t, { c: route.stops[first].s, state: 'dwell', target: first, v: 0, dir: 1, timer: 5 });
  RW.hijackTrain(t, 1);
  world.time = 0;
  const svc = R.startService({ stops: route.stops, c: t.c, dir: 1, vmax: t.cfg.vmax * 1.45, time: 0, limit: 4, range: reach(t) });
  const log = [];
  let f = 0, over = 0;
  for (; f < maxS * 30 && !svc.finished; f++) {
    world.time += dt;
    const st = R.currentStop(svc);
    const ctl = pilot(svc, t, st);
    t.ctl.throttle = ctl.throttle && !R.doorsOpen(svc, world.time);
    t.ctl.brake = ctl.brake;
    t.ctl.emergency = !!ctl.emergency;
    RW.updateRailway(dt, world);
    if (t.v > svc.limit + 1) over++;
    if (process.env.DBG && f % 600 === 0) console.log(f / 30 | 0, 'c', t.c.toFixed(0), 'v', t.v.toFixed(1), 'lim', svc.limit.toFixed(1), 'to', svc.toStop.toFixed(0), 'thr', t.ctl.throttle, 'br', t.ctl.brake, 'i', svc.i);
    for (const e of R.stepService(svc, dt, { c: t.c, v: t.v, time: world.time, emergency: t.ctl.emergency })) log.push(e.kind + ':' + (e.stop ? e.stop.name : ''));
  }
  for (const p of svc.plan) console.log('  ', p.name, 'due', p.due.toFixed(0), 'err', p.errM && p.errM.toFixed(1), 'late', p.lateS && p.lateS.toFixed(0), 'score', p.score);
  console.log(`${label}:${svc.plan.length} stops, ${(f * dt).toFixed(0)} s, ${log.join(' ')} score ${svc.result && svc.result.score}`);
  return { svc, t, over, secs: f * dt };
}

// --- 2. a clean run
{
  const good = (svc, t, st) => (st ? R.autopilot(svc, t.v, (st.s - t.c)) : { throttle: false, brake: true });
  const { svc, t } = driveService('clean driver', good);
  if (!svc.finished || !svc.result) fail('the clean service never finished');
  else {
    if (svc.result.made !== svc.plan.length) fail(`clean driver made ${svc.result.made}/${svc.plan.length} stops`);
    if (svc.result.score < 60) fail(`clean driver scored only ${svc.result.score}`);
    if (svc.result.medal < 1) fail('clean driver got no medal');
    for (const p of svc.plan) if (p.errM != null && Math.abs(p.errM) > R.STOP_TOL[0]) fail(`${p.name}: stopped ${p.errM.toFixed(1)} m off`);
    for (const p of svc.plan) if (p.lateS > 60) fail(`${p.name}: ${p.lateS.toFixed(0)} s late on a clean run`);
  }
  if (t.state !== 'player') fail('the train left the player state');
}

// --- 3. never brakes
{
  const bad = () => ({ throttle: true, brake: false });
  const { svc } = driveService('reckless driver', bad, 1500);
  if (!svc.finished) fail('the reckless service did not end');
  else if (svc.result.score > 40) fail(`reckless driver scored ${svc.result.score}`);
  else if (svc.result.medal !== 0) fail('reckless driver got a medal');
}

// --- 4. abandon, doors, empty plans
{
  const svc = R.startService({ stops: route.stops, c: route.stops.find((s) => !s.offmap).s, dir: 1, vmax: 30, time: 0, limit: 3 });
  svc.plan[0].score = 80; svc.plan[0].errM = 1; svc.plan[0].lateS = 0;
  R.abandonService(svc);
  if (!svc.finished || svc.result.score !== Math.round(80 / 3)) fail(`abandoned score ${svc.result && svc.result.score}`);
  const e = R.startService({ stops: route.stops, c: route.len + 100, dir: 1, vmax: 30, time: 0 });
  if (!e.finished) fail('a service with no stop ahead is not over at once');
  const a = R.startService({ stops: route.stops, c: route.stops.find((s) => !s.offmap).s, dir: 1, vmax: 30, time: 0 });
  for (let i = 1; i < a.plan.length; i++) if (!(a.plan[i].due > a.plan[i - 1].due + R.DOORS_S)) fail('timetable does not leave time for the doors');
}

// --- 6. the cab board's figures
{
  const stops = [{ name: 'A', s: 1000 }, { name: 'B', s: 2000 }];
  const svc = R.startService({ stops, c: 0, dir: 1, vmax: 30, time: 0 });
  R.stepService(svc, dt, { c: 0, v: 20, time: 1, emergency: false });
  const v = R.boardView(svc, { v: 20, time: 1 });
  if (v.name !== 'A' || v.toStop !== 1000 || v.kmh !== 72) fail(`board figures ${JSON.stringify(v)}`);
  if (v.brakeM !== Math.round(R.brakeDist(20)) || !(v.brakeFrac > 0 && v.brakeFrac < 1)) fail('board braking distance');
  R.stepService(svc, dt, { c: 960, v: 20, time: 2, emergency: false });
  if (!(R.boardView(svc, { v: 20, time: 2 }).brakeFrac > 1)) fail('board does not warn when the train cannot stop any more');
  if (R.delayText(5) !== 'op tijd' || R.delayText(75) !== '+1:15' || R.delayText(-30) !== '-0:30') fail('delay text');
  if (v.cells.length !== 2 || v.cells[0].t !== '▶') fail('board cells');
  R.abandonService(svc);
  if (!R.boardView(svc, { v: 0, time: 3 }).done) fail('board is not done after abandoning');
}

// --- 5. several stops on a synthetic straight track (the real drivable range holds one halte)
{
  const stops = [1000, 3200, 5600, 7400].map((x, i) => ({ name: 'H' + i, s: x }));
  const svc = R.startService({ stops, c: 0, dir: 1, vmax: 30, time: 0, range: [0, 8000] });
  let c = 0, v = 0, time = 0;
  for (let f = 0; f < 30 * 1500 && !svc.finished; f++) {
    time += dt;
    const st = R.currentStop(svc);
    const ctl = R.autopilot(svc, v, st.s - c);
    const lim = svc.vmax;
    if (R.doorsOpen(svc, time)) v = Math.max(0, v - 2.2 * dt);
    else if (ctl.brake) v = Math.max(0, v - 2.2 * dt);
    else if (ctl.throttle) v = Math.min(lim, v + 1.6 * dt);
    else v = Math.max(0, v - 0.3 * dt);
    c += v * dt;
    R.stepService(svc, dt, { c, v, time, emergency: false });
  }
  if (process.env.DBG) console.log(svc.plan.map((p) => [p.name, p.errM, p.score, p.due]), c, time);
  if (!svc.finished || svc.result.made !== 4) fail(`synthetic service made ${svc.result && svc.result.made}/4`);
  else if (svc.result.score < 60) fail(`synthetic clean run scored ${svc.result.score}`);
  const r = R.startService({ stops, c: 0, dir: 1, vmax: 30, time: 0, range: [0, 4000] });
  if (r.plan.length !== 2) fail('range does not drop halten beyond the track');
}

ok_pay();
function ok_pay() {
  if (R.payFor({ made: 4, score: 80, medal: 2 }) !== Math.round(4 * 16 + 40)) fail('payFor value');
  if (R.payFor({ made: 4, score: 80, medal: 2 }, true) !== 0 || R.payFor(null) !== 0) fail('abandoned pays nothing');
  if (R.payFor({ made: 0, score: 0, medal: 0 }) !== 0) fail('no halten, no pay');
}
// de dienst starten in een gekaapte trein vergeeft de sterren van de kaping (#424), andere sterren blijven
{
  if (R.wantedNaDienst(2, 2) !== 0 || R.wantedNaDienst(1, 2) !== 0) fail('de sterren van de kaping gaan weg');
  if (R.wantedNaDienst(3, 2) !== 3) fail('meer sterren dan de kaping blijven');
  if (R.wantedNaDienst(0, 2) !== 0 || R.wantedNaDienst(2, 0) !== 2) fail('niets te vergeven: niets verandert');
}
// de tractiehendel (#444): ctl.power en ctl.brakeF op de echte natuurkunde: halve stand is zachter dan een hele
{
  const run = (ctl, from, secs) => {
    const t = inRoute(route);
    const first = route.stops.findIndex((s) => !s.offmap);
    Object.assign(t, { c: route.stops[first].s, state: 'dwell', target: first, v: 0, dir: 1, timer: 5 });
    RW.hijackTrain(t, 1);
    t.pv = from; t.v = Math.abs(from);
    Object.assign(t.ctl, ctl);
    for (let f = 0; f < secs * 30; f++) { world.time += dt; RW.updateRailway(dt, world); }
    const v = t.v;
    RW.parkTrain(t);
    return v;
  };
  const half = run({ power: 0.5 }, 0, 6), full = run({ power: 1 }, 0, 6);
  if (!(half > 1 && full > half)) fail(`tractiehendel: halve stand ${half}, hele ${full}`);
  const b1 = run({ power: 0, brakeF: 1 / 3 }, 20, 4), b3 = run({ power: 0, brakeF: 1 }, 20, 4);
  if (!(b3 < b1 && b1 < 20)) fail(`remhendel: rem 1 ${b1}, rem 3 ${b3}`);
  const roll = run({ power: 0, brakeF: 0 }, 20, 4);
  if (!(roll > b1)) fail(`rollen remt niet: ${roll}`);
  if (run({ power: 0, brakeF: 1 }, 0, 3) !== 0) fail('rem laat de trein achteruit rijden');
}
console.log(fails ? `${fails} failure(s)` : 'machinist: ok');
process.exit(fails ? 1 : 0);
