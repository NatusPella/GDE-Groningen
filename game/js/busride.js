// Een lijnrit als toestandsmachine (#15): de bus volgt een busroutes.js-lijn
// langs de haltes volgens de dienstregeling van busservice.js. Puur: update()
// krijgt alleen positie, snelheid en dt, en geeft gebeurtenissen terug die de
// bijbaan (sidejob_lijn.js) in meldingen en geld omzet. Tests: scripts/busride_test.mjs.

import { STOP_RADIUS } from './busroutes.js';
import { buildTimetable, punctuality, holdSeconds, stopExchange, tripScore, CAPACITY } from './busservice.js';

const STOP_SPEED = 1.5;     // m/s: zo langzaam moet de bus staan om te halteren
const BOARD_TIME = 3;       // s minimaal halteren
const LATE_FAIL = 75;       // s: zo ver achter dat de rit mislukt
const HARD_BRAKE = 6;       // m/s snelheidsverlies per stap dat als harde rem telt

// Een stuk van de lijn: ritlengte in haltes (max) vanaf halte `first` in rijrichting;
// een lijn van 40 km hoeft niet in één bijbaanrit. De tijden beginnen weer bij 0.
function sliceTable(table, first = 0, max = Infinity) {
  const rows = table.slice(first, first + max);
  const t0 = rows.length ? rows[0].arrive : 0;
  return rows.map((r) => ({ ...r, arrive: r.arrive - t0, depart: r.depart - t0 }));
}

// Waar en welke kant op een rit begint voor een bus op (x, y): de dichtstbijzijnde
// halte, richting de kant met de meeste haltes voor je. Geeft { dir, first } voor makeRide.
export function planRide(line, x, y) {
  const st = line.stops;
  let i = 0, best = Infinity;
  st.forEach((p, k) => { const d = Math.hypot(p.x - x, p.y - y); if (d < best) { best = d; i = k; } });
  const dir = st.length - 1 - i >= i ? 1 : -1;
  return { dir, first: dir > 0 ? i : st.length - 1 - i };
}

export function makeRide(line, { dir = 1, rng = Math.random, demand = 1, first = 0, max = Infinity } = {}) {
  return {
    line, dir, rng, demand,
    table: sliceTable(buildTimetable(line, { dir }), first, max),
    next: 1,              // index in table van de volgende halte
    t: 0, phase: 'drive', dwellLeft: 0, onBoard: 0, passengers: 0,
    deltas: [], hardBrakes: 0, prevSpeed: 0, earlyFlag: false, done: false, failed: null,
  };
}

export function rideStop(ride) { return ride.table[ride.next] || null; }

export function stopPos(ride, row) {
  const st = ride.dir > 0 ? ride.line.stops : [...ride.line.stops].reverse();
  const s = st[row.index];
  return { x: s.x, y: s.y };
}

// Eerste halte: het begin van de rit, passagiers stappen in.
export function startRide(ride) {
  const ex = stopExchange(ride.rng, { index: 0, count: ride.table.length, onBoard: 0, demand: ride.demand });
  ride.onBoard = ex.board;
  ride.passengers += ex.board;
  ride.phase = 'dwell';
  ride.dwellLeft = BOARD_TIME;
  return [{ type: 'board', stop: ride.table[0], board: ex.board, alight: 0 }];
}

// Eén beeld. bus = { x, y, speed }. Geeft een lijst gebeurtenissen.
export function updateRide(ride, bus, dt) {
  const ev = [];
  if (ride.done || ride.failed) return ev;
  ride.t += dt;
  const sp = Math.abs(bus.speed);
  if (ride.prevSpeed - sp > HARD_BRAKE && ride.prevSpeed > 6) { ride.hardBrakes++; ev.push({ type: 'hardbrake' }); }
  ride.prevSpeed = sp;
  const row = ride.phase === 'dwell' ? ride.table[ride.next - 1] : rideStop(ride);
  if (ride.phase === 'drive') {
    const p = stopPos(ride, row);
    if (Math.hypot(p.x - bus.x, p.y - bus.y) < STOP_RADIUS && sp < STOP_SPEED) {
      const delta = ride.t - row.arrive;
      ride.deltas.push(delta);
      const last = ride.next === ride.table.length - 1;
      const ex = stopExchange(ride.rng, { index: ride.next, count: ride.table.length, onBoard: ride.onBoard, demand: ride.demand });
      ride.onBoard += ex.board - ex.alight;
      ride.passengers += ex.board;
      const pun = punctuality(delta);
      ev.push({ type: 'arrive', stop: row, delta, state: pun.state, board: ex.board, alight: ex.alight, last });
      if (delta > LATE_FAIL) { ride.failed = 'laat'; ev.push({ type: 'fail', why: 'te laat' }); return ev; }
      if (last) { ride.done = true; ride.score = tripScore({ passengers: ride.passengers, deltas: ride.deltas, hardBrakes: ride.hardBrakes }); ev.push({ type: 'done', score: ride.score }); return ev; }
      ride.phase = 'dwell';
      ride.next++;
      ride.dwellLeft = Math.max(BOARD_TIME, holdSeconds(row, ride.t));
      ride.earlyFlag = false;
    }
    return ev;
  }
  // halteren: wachten tot de bus mag vertrekken
  ride.dwellLeft = Math.max(0, ride.dwellLeft - dt);
  if (sp > 3 && ride.dwellLeft > 0 && !ride.earlyFlag) {
    // weggereden voor de tijd: telt als te vroeg
    ride.earlyFlag = true;
    ride.deltas.push(-60);
    ev.push({ type: 'early', stop: row });
  }
  if (ride.dwellLeft <= 0 || sp > 3) ride.phase = 'drive';
  if (ride.phase === 'drive' && !ride.earlyFlag) ev.push({ type: 'depart', stop: row, next: rideStop(ride) });
  return ev;
}
