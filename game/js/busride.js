// Een lijnrit als toestandsmachine (#15): de bus volgt een busroutes.js-lijn
// langs de haltes volgens de dienstregeling van busservice.js. Puur: update()
// krijgt alleen positie, snelheid en dt, en geeft gebeurtenissen terug die de
// bijbaan (sidejob_lijn.js) in meldingen en geld omzet. Tests: scripts/busride_test.mjs.

import { STOP_RADIUS, DWELL } from './busroutes.js';
import { buildTimetable, punctuality, holdSeconds, stopExchange, tripScore, CAPACITY, CRUISE } from './busservice.js';
import { makeTevredenheid, stepTevredenheid, stoot, deurenOpen, deurenDicht } from './busbestuur.js';

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
    tevreden: makeTevredenheid(), nextEx: null, request: false, requestT: 0, // de volgende halte vooraf geworpen en de halteknop (#444)
    doorsOpened: false, pendingEx: null, boardLeft: 0, final: false, skipped: 0,
  };
}

// De dienst overnemen van een bus die al rijdt (#396): de rit begint bij de halte die de bus net voorbij is,
// met reizigers aan boord, en de eerstvolgende halte is het doel. s = boogafstand van de bus op de lijn,
// dir = rijrichting. De klok loopt mee met wat de bus al van het stuk tussen de haltes heeft gereden, zodat
// hij niet te vroeg of te laat begint. null als er geen halte meer vooruit ligt.
export function takeOverRide(line, { dir = 1, s = 0, rng = Math.random, demand = 1, max = Infinity } = {}) {
  const full = buildTimetable(line, { dir });
  const nxt = full.findIndex((r) => (dir > 0 ? r.s > s + 1 : r.s < s - 1));
  if (nxt < 0) return null;
  const first = Math.max(0, nxt - 1);
  const ride = makeRide(line, { dir, rng, demand, first, max });
  if (ride.table.length < 2) return null;
  const done = dir > 0 ? s - full[first].s : full[first].s - s; // m voorbij de vorige halte (kan negatief zijn: nog voor de eerste)
  ride.next = 1;
  ride.phase = 'drive';
  ride.t = DWELL + done / CRUISE;
  ride.onBoard = Math.min(CAPACITY, Math.round((6 + 14 * rng()) * demand));
  ride.passengers = 0; // alleen wie na de overname instapt telt voor het loon
  return ride;
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
  ride.doorsOpened = true; // bij de start stappen de reizigers vanzelf in; daarna sluit de bestuurder de deuren
  ride.boardLeft = 0;
  return [{ type: 'board', stop: ride.table[0], board: ex.board, alight: 0 }];
}

// Wat er bij de volgende halte gebeurt wordt vooraf geworpen: wie wil uitstappen drukt onderweg op de halteknop.
function planNext(ride) {
  ride.nextEx = stopExchange(ride.rng, { index: ride.next, count: ride.table.length, onBoard: ride.onBoard, demand: ride.demand });
  ride.request = false;
  ride.requestT = ride.t + 2 + 6 * ride.rng();
}

// Eén beeld. bus = { x, y, speed, doors?, tailgate? }. Met doors (de bediening van busbestuur.js) bedient de speler de
// deuren zelf: in- en uitstappen gebeurt pas als ze open staan en de bus vertrekt pas als ze dicht zijn (#444).
// Zonder doors (de oude, automatische deuren) blijft alles zoals het was. Geeft een lijst gebeurtenissen.
export function updateRide(ride, bus, dt) {
  const ev = [];
  if (ride.done || ride.failed) return ev;
  const manual = !!bus.doors;
  ride.t += dt;
  const sp = Math.abs(bus.speed);
  if (ride.prevSpeed - sp > HARD_BRAKE && ride.prevSpeed > 6) { ride.hardBrakes++; ev.push({ type: 'hardbrake' }); }
  ride.prevSpeed = sp;
  for (const e of stepTevredenheid(ride.tevreden, { speed: bus.speed, dt, tailgate: !!bus.tailgate, onBoard: ride.onBoard })) ev.push(e);
  const row = ride.phase === 'dwell' ? ride.table[ride.next - 1] : rideStop(ride);
  if (ride.phase === 'drive') {
    if (!ride.nextEx) planNext(ride);
    if (!ride.request && ride.nextEx.alight > 0 && ride.t >= ride.requestT) { ride.request = true; ev.push({ type: 'request', stop: row }); }
    const p = stopPos(ride, row);
    if (Math.hypot(p.x - bus.x, p.y - bus.y) < STOP_RADIUS && sp < STOP_SPEED) {
      const delta = ride.t - row.arrive;
      ride.deltas.push(delta);
      const last = ride.next === ride.table.length - 1;
      const ex = ride.nextEx;
      ride.nextEx = null;
      ride.request = false;
      const pun = punctuality(delta);
      ev.push({ type: 'arrive', stop: row, delta, state: pun.state, board: ex.board, alight: ex.alight, last, manual });
      if (delta > LATE_FAIL) { ride.failed = 'laat'; ev.push({ type: 'fail', why: 'te laat' }); return ev; }
      if (manual) {
        // eerst de deuren open: dan pas stapt iemand in of uit
        ride.pendingEx = ex;
        ride.doorsOpened = false;
        ride.final = last;
        ride.boardLeft = 0;
        ride.phase = 'dwell';
        ride.next++;
        ride.dwellLeft = last ? 0 : Math.max(BOARD_TIME, holdSeconds(row, ride.t));
        ride.earlyFlag = false;
        return ev;
      }
      ride.onBoard += ex.board - ex.alight;
      ride.passengers += ex.board;
      if (last) { ride.done = true; ride.score = tripScore({ passengers: ride.passengers, deltas: ride.deltas, hardBrakes: ride.hardBrakes, satisfaction: ride.tevreden.sat }); ev.push({ type: 'done', score: ride.score }); return ev; }
      ride.phase = 'dwell';
      ride.next++;
      ride.dwellLeft = Math.max(BOARD_TIME, holdSeconds(row, ride.t));
      ride.earlyFlag = false;
    }
    return ev;
  }
  // halteren: wachten tot de bus mag vertrekken
  ride.dwellLeft = Math.max(0, ride.dwellLeft - dt);
  if (manual) {
    if (!ride.doorsOpened) {
      if (deurenOpen(bus.doors)) {
        const ex = ride.pendingEx || { board: 0, alight: 0 };
        ride.pendingEx = null;
        ride.doorsOpened = true;
        ride.onBoard += ex.board - ex.alight;
        ride.passengers += ex.board;
        const kneel = !!(bus.doors.kneelWant || bus.doors.kneelAmt > 0.5) && ex.board + ex.alight > 0;
        ride.boardLeft = ex.board + ex.alight > 0 ? BOARD_TIME * (kneel ? 0.7 : 1) : 1;
        if (kneel) stoot(ride.tevreden, 3); // een lage instap is prettig
        ev.push({ type: 'doorsopen', stop: row, board: ex.board, alight: ex.alight, last: ride.final, kneel });
        if (ride.final) {
          ride.done = true;
          ride.score = tripScore({ passengers: ride.passengers, deltas: ride.deltas, hardBrakes: ride.hardBrakes, satisfaction: ride.tevreden.sat });
          ev.push({ type: 'done', score: ride.score });
        }
      } else if (sp > 3) {
        // weggereden zonder de deuren te openen: de reizigers blijven staan
        ride.pendingEx = null;
        ride.doorsOpened = true;
        ride.skipped++;
        stoot(ride.tevreden, -15);
        ev.push({ type: 'skipped', stop: row });
        if (ride.final) {
          // de eindhalte voorbij zonder uitstappers: de rit telt als gereden, de reizigers zitten er nog in
          ride.done = true;
          ride.score = tripScore({ passengers: ride.passengers, deltas: ride.deltas, hardBrakes: ride.hardBrakes, satisfaction: ride.tevreden.sat });
          ev.push({ type: 'done', score: ride.score });
          return ev;
        }
        ride.phase = 'drive';
      }
      return ev;
    }
    ride.boardLeft = Math.max(0, ride.boardLeft - dt);
    if (sp > 3 && ride.dwellLeft > 0 && !ride.earlyFlag) {
      ride.earlyFlag = true;
      ride.deltas.push(-60);
      ev.push({ type: 'early', stop: row });
    }
    if (sp > 3 || (ride.dwellLeft <= 0 && ride.boardLeft <= 0 && deurenDicht(bus.doors))) ride.phase = 'drive';
    if (ride.phase === 'drive' && !ride.earlyFlag) ev.push({ type: 'depart', stop: row, next: rideStop(ride) });
    return ev;
  }
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
