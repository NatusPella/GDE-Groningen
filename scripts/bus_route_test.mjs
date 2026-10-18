// Bus job (sidejob_bus.js) route check against the game's own driving route
// (routing.js, as the HUD ribbon shows it from one halte to the next):
//   no U-turn    the route out of a halte carries on the way the bus came in
//                (and the first leg the way the bus is spawned), and never
//                doubles back on itself along the way
//   kerb         the halte's waiting spot is on the right-hand side
//   timetable    the legs the schedule plans with, against the route length
//   node scripts/bus_route_test.mjs [--verbose]
//   BUS_STOPS='[["Street",x,y,dx,dy],...]' node scripts/bus_route_test.mjs   (try a stop list)
import './node3d.mjs';
import fs from 'node:fs';

import { loadCityWorld } from './lib/loadworld.mjs';
const R = await import('../game/js/routing.js');
const bus = await import('../game/js/sidejob_bus.js');
const VERBOSE = process.argv.includes('--verbose');
const root = new URL('../game/', import.meta.url);
const map = (await loadCityWorld()).map;

const STOPS = process.env.BUS_STOPS ? JSON.parse(process.env.BUS_STOPS).map(([street, x, y, dx, dy]) => ({ name: street, street, at: [x, y], dir: [dx, dy], leg: 0 })) : bus.STOPS;
const stops = bus.placeStops(map, STOPS);
if (VERBOSE) for (const s of STOPS) if (!stops.some((q) => q.at === s.at)) console.log("not placed:", s.street, s.at);
if (stops.length !== STOPS.length) {
  console.log(`FAIL only ${stops.length}/${STOPS.length} haltes found on their street`);
  process.exit(1);
}

function route(from, to) {
  const world = { map, time: 0, health: 100, player: { x: from.x, y: from.y, inVehicle: { isBike: false, isBoat: false } }, storyGuide: { x: to.x, y: to.y, name: 'halte', step: 'bus' }, addMessage: () => {} };
  R.updateRouting(0.1, world);
  const r = R.getActiveRoute();
  return r && r.pts.length > 1 ? r : null;
}

// heading of the route d metres after its start (or before its end)
function headingAt(pts, d, fromEnd) {
  const p = fromEnd ? [...pts].reverse() : pts;
  let acc = 0, q = p[p.length - 1];
  for (let i = 0; i < p.length - 1; i++) {
    const l = Math.hypot(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]);
    if (acc + l >= d) { const t = (d - acc) / (l || 1); q = [p[i][0] + (p[i + 1][0] - p[i][0]) * t, p[i][1] + (p[i + 1][1] - p[i][1]) * t]; break; }
    acc += l;
  }
  const a = Math.atan2(q[1] - p[0][1], q[0] - p[0][0]);
  return fromEnd ? a + Math.PI : a;
}
const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

// doubling back: the heading 20 m further on points (nearly) the other way -
// a U-turn at a node or round a little turning loop, not a roundabout
function doublesBack(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const at = (d) => {
    let i = 1;
    while (i < pts.length - 1 && cum[i] < d) i++;
    const t = (d - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1);
    return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
  };
  const head = (d) => { const [ax, ay] = at(d), [bx, by] = at(d + 4); return Math.atan2(by - ay, bx - ax); };
  const L = cum[cum.length - 1];
  for (let d = 0; d + 24 <= L; d += 2) if (angDiff(head(d), head(d + 20)) > 2.6) return at(d + 10);
  return null;
}

const fails = [];
const n = stops.length;
const legs = [];
for (let i = 0; i < n; i++) {
  const a = stops[i], b = stops[(i + 1) % n];
  const r = route(a, b);
  if (!r) { fails.push(`${a.name} -> ${b.name}: no route`); continue; }
  legs.push({ a, b, r });
}
if (legs.length === n) {
  const start = bus.busStart(map, stops);
  for (let i = 0; i < n; i++) {
    const { a, b, r } = legs[i];
    const inHead = i === 0 ? start.angle : headingAt(legs[i - 1].r.pts, 12, true);
    const outHead = headingAt(r.pts, 12, false);
    const turn = angDiff(inHead, outHead) * 180 / Math.PI;
    const back = doublesBack(r.pts);
    const side = -Math.sin(a.heading) * (a.kerb.x - a.x) + Math.cos(a.heading) * (a.kerb.y - a.y);
    const arrive = angDiff(a.heading, inHead) * 180 / Math.PI;
    const plan = bus.legSeconds(map, a, b);
    const msg = `${a.name} -> ${b.name}: ${Math.round(r.length)} m, leaves ${Math.round(turn)}° off the way in${back ? `, doubles back at ${back.map(Math.round)}` : ''}, kerb ${side > 0 ? 'right' : 'LEFT'}, planned ${Math.round(plan)} s`;
    console.log(msg);
    if (turn > 100) fails.push(`${a.name} -> ${b.name}: U-turn out of the halte (${Math.round(turn)}°)`);
    if (back) fails.push(`${a.name} -> ${b.name}: route doubles back at ${back.map(Math.round)}`);
    if (Math.abs(plan - (r.length / bus.CRUISE + bus.LEG_EXTRA)) > 0.15 * plan) fails.push(`${a.name}: leg ${a.leg} m in the timetable, the route is ${Math.round(r.length)} m`);
    if (side <= 0) fails.push(`${a.name}: kerb on the left of the way the bus drives`);
    if (arrive > 60) fails.push(`${a.name}: halte heading ${Math.round(arrive)}° off the way the bus arrives`);
    if (VERBOSE) console.log('   ', r.pts.map((p) => p.map(Math.round).join(',')).join(' '));
  }
  const total = legs.reduce((s, l) => s + l.r.length, 0);
  console.log(`loop ${Math.round(total)} m, ${n} haltes`);
  // the wait at each halte for a driver averaging pace m/s between haltes
  // (first round, the roomiest timetable): early departures are rebased, so
  // each leg stands on its own
  for (const pace of [7, 8.5, 10, 12]) {
    const holds = [], lates = [];
    for (const { a, r } of legs) {
      const spare = bus.legSeconds(map, a) * 1.15 - (r.length / pace + 8);
      holds.push(Math.min(bus.MAX_HOLD, Math.max(0, spare - bus.EARLY_OK)));
      lates.push(Math.max(0, -spare));
    }
    const avg = holds.reduce((s, h) => s + h, 0) / holds.length, max = Math.max(...holds), late = Math.max(...lates);
    console.log(`at ${Math.round(pace * 3.6)} km/h average: wait ${Math.round(avg)} s a halte, at most ${Math.round(max)} s${late > 0 ? `, up to ${Math.round(late)} s late` : ''}`);
    if (pace === 7 && late > bus.LATE_OK) fails.push(`timetable: ${Math.round(late)} s late at 25 km/h average`);
    if (max > 90 || avg > 60) fails.push(`timetable: waits of ${Math.round(avg)} s average, ${Math.round(max)} s at most`);
  }
}
if (fails.length) {
  console.log(`\n${fails.length} problem(s):\n  ` + fails.join('\n  '));
  process.exit(1);
}
console.log('\nbus route ok');
