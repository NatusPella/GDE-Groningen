// Logic test for offences.js (red light, against the one-way, speeding): fines only, no star.
//   node scripts/offences_test.mjs
import { crossedStopLine, againstOneWay, speedingBy, updateOffences, resetOffences, OFFENCE_FINE } from '../game/js/offences.js';

let fails = 0, n = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL', name); } };

const head = { x: 10, y: 0, hx: 1, hy: 0 };
ok(crossedStopLine(8, 0, 12, 0, 0, head), 'over the line, in the travel direction');
ok(!crossedStopLine(8, 0, 9, 0, 0, head), 'not yet over');
ok(!crossedStopLine(8, 9, 12, 9, 0, head), 'far beside the line');
ok(!crossedStopLine(12, 0, 8, 0, Math.PI, head), 'the other way');

const road = { oneway: true, type: 'primary', speed: 13.9, pts: [[0, 0], [100, 0]] };
ok(againstOneWay(road, 50, 1, Math.PI), 'against the one-way');
ok(!againstOneWay(road, 50, 1, 0), 'with it');
ok(!againstOneWay({ ...road, oneway: false }, 50, 1, Math.PI), 'a two-way road');
ok(speedingBy(14, 30) && !speedingBy(8, 30) && !speedingBy(30, 0), 'speeding needs a margin and a limit');

const msgs = [];
const mk = () => {
  const car = { speed: 10, x: 8, y: 0, angle: 0 };
  return {
    time: 100, money: 500, health: 100, wanted: 0, addMessage: (t) => msgs.push(t),
    map: { roadsNear: () => [{ ...road, width: 6, pts: [[-50, 0], [150, 0]] }] },
    player: { x: 8, y: 0, inVehicle: car }, vehicles: [car],
    pedestrians: [{ isCop: true, x: 20, y: 5, state: 'wander' }],
  };
};
const probes = (phase) => ({ signalsNear: () => [head], phaseFor: () => phase });
const drive = (w, phase, steps = 10) => {
  const v = w.player.inVehicle; let paid = 0;
  for (let i = 0; i < steps; i++) { v.x += 0.5; paid += updateOffences(0.1, w, probes(phase)); w.time += 0.1; }
  return paid;
};

resetOffences();
let w = mk();
ok(drive(w, 'red') === OFFENCE_FINE.roodLicht, 'red light with an agent watching: fined');
ok(w.wanted === 0, 'no star');
ok(/Door rood gereden/.test(msgs[msgs.length - 1]) && !/dat mag niet/i.test(msgs.join()), 'a fine message, no warning card');
resetOffences(); w = mk();
ok(drive(w, 'green') === 0, 'green: nothing');
resetOffences(); w = mk(); w.pedestrians = [];
ok(drive(w, 'red') === 0, 'no agent: nothing');
resetOffences(); w = mk(); w.mission = { phase: 'active' };
ok(drive(w, 'red') === 0, 'never during a mission');

// against the one-way, with a car at 20 m/s beside an agent
resetOffences(); w = mk();
const v = w.player.inVehicle; v.angle = Math.PI; v.x = 30; v.speed = 8; w.player.x = 30;
w.pedestrians[0].x = 30;
let paid = 0;
for (let i = 0; i < 40; i++) { v.x -= 0.8; paid += updateOffences(0.1, w, {}); w.time += 0.1; }
ok(paid === OFFENCE_FINE.tegenVerkeer, 'against the one-way for a few seconds: one fine');
for (let i = 0; i < 40; i++) { v.x += 0; paid += updateOffences(0.1, w, {}); w.time += 0.1; }
ok(paid === OFFENCE_FINE.tegenVerkeer, 'then a pause');
// speeding: 50 km/h limit, 100 km/h
resetOffences(); w = mk();
const v2 = w.player.inVehicle; v2.speed = 28; v2.x = 30; w.pedestrians[0].x = 30;
paid = 0;
for (let i = 0; i < 30; i++) { paid += updateOffences(0.1, w, {}); w.time += 0.1; }
ok(paid === OFFENCE_FINE.teHard, 'well over the limit: one fine');
console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
