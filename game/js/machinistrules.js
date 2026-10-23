// Machinist-minigame (issue #14): the pure rules of driving a stoptrein
// yourself. The physics stay railway.js's (state 'player'); this file keeps the
// timetable, the speed boards, the platform stop and the score. No THREE, no
// DOM, so scripts/machinist_test.mjs can drive it headless.
import { medalFrom, clamp } from './minigamekit.js';

// railway.js DRIVE_BRAKE: the service brake the plan counts on
export const BRAKE = 2.2;
export const DOORS_S = 10;
// the stop: the middle of the train on the platform mark, tolerance per medal (m)
export const STOP_TOL = [15, 8, 3];
export const PLATFORM_WINDOW = 60;
export const MISS_BEYOND = 40;
export const STOPPED_V = 0.25;
export const MEDAL_AT = [50, 70, 88];
export const MEDAL_NAMES = ['Geen medaille', 'Brons', 'Zilver', 'Goud'];

// Remweg at the service brake.
export const brakeDist = (v, a = BRAKE) => (v * v) / (2 * a);

// The speed boards on the way into a halte (m/s over the distance still to the
// platform mark); `vmax` is the line speed.
export function speedLimit(vmax, toStop) {
  if (toStop > 300) return vmax;
  if (toStop > 150) return Math.min(vmax, 16);
  if (toStop > 60) return Math.min(vmax, 10);
  return Math.min(vmax, 6);
}

// Seconds the timetable gives for `d` metres from standstill at a stop to the
// next: a brisk pull-away, a cruise at 80 % line speed and a gentle roll-in.
export function runTime(d, vmax) {
  const cruise = vmax * 0.85;
  return Math.max(15, d / cruise + cruise / 1.6 * 0.5 + cruise / BRAKE * 0.5 + 8);
}

// The halten ahead of the train (arc length c, direction dir, +1 or -1) as the
// service's stops, nearest first. `stops` are railway.js route stops; `range`
// ([lo, hi] arc the train's middle can reach) leaves out halten beyond the
// drivable track, which would never be made.
export function upcomingStops(stops, c, dir, range) {
  const list = [];
  stops.forEach((st, idx) => {
    if (st.offmap) return;
    if (range && (st.s < range[0] || st.s > range[1])) return;
    if ((st.s - c) * dir > 5) list.push({ idx, name: st.name, s: st.s });
  });
  list.sort((a, b) => (a.s - b.s) * dir);
  return list;
}

// A service: the timetable from the moment the player takes the train.
export function startService({ stops, c, dir, vmax, time, limit = 6, range }) {
  const ahead = upcomingStops(stops, c, dir, range).slice(0, limit);
  let at = time, prev = c;
  const plan = ahead.map((st) => {
    at += runTime(Math.abs(st.s - prev), vmax) + (prev === c ? 0 : DOORS_S);
    prev = st.s;
    return { ...st, due: at, score: null, errM: null, lateS: null, medal: 0 };
  });
  return {
    plan, i: 0, vmax, dir, start: time, doorsUntil: 0, overStop: 0, ebStop: 0, ebHeld: false, moved: false,
    limit: vmax, toStop: Infinity, finished: !plan.length, result: null, abandoned: false,
    flash: '', flashBad: false, flashUntil: 0,
  };
}

export const currentStop = (svc) => (svc.finished ? null : svc.plan[svc.i]);
export const doorsOpen = (svc, time) => time < svc.doorsUntil;

// Points for one stop: place 50, punctuality 40, comfort 10, minus speeding.
export function scoreStop({ errM, lateS, over, ebrakes }) {
  const a = Math.abs(errM);
  let place = 0;
  if (a <= STOP_TOL[2]) place = 50;
  else if (a <= STOP_TOL[1]) place = 38;
  else if (a <= STOP_TOL[0]) place = 25;
  else if (a <= PLATFORM_WINDOW) place = 10;
  const late = Math.max(0, lateS - 10);
  const punctual = Math.round(40 * clamp(1 - late / 80, 0, 1));
  const comfort = Math.max(0, 10 - ebrakes * 5);
  const penalty = Math.min(30, Math.round(over * 2));
  return Math.max(0, place + punctual + comfort - penalty);
}

export const stopMedal = (errM) => {
  const a = Math.abs(errM);
  return a <= STOP_TOL[2] ? 3 : a <= STOP_TOL[1] ? 2 : a <= STOP_TOL[0] ? 1 : 0;
};

function finish(svc) {
  svc.finished = true;
  const made = svc.plan.filter((p) => p.errM != null);
  const score = svc.plan.length ? Math.round(svc.plan.reduce((s, p) => s + (p.score || 0), 0) / svc.plan.length) : 0;
  svc.result = {
    score, medal: medalFrom(score, MEDAL_AT), stops: svc.plan.length, made: made.length,
    avgErr: made.length ? made.reduce((s, p) => s + Math.abs(p.errM), 0) / made.length : 0,
    avgLate: made.length ? made.reduce((s, p) => s + Math.max(0, p.lateS), 0) / made.length : 0,
  };
}

// Wat een dienst oplevert (euro's): per gehaalde halte een bedrag naar score,
// plus een bonus voor de medaille. Een gestopte dienst betaalt niets.
export function payFor(result, abandoned = false) {
  if (!result || abandoned) return 0;
  return Math.round(result.made * (6 + result.score / 8) + result.medal * 20);
}

// Wie de dienst begint (G) in een trein die hij net kaapte (#424), is geen dieven meer maar de machinist: de sterren van
// de kaping (stealStars) gaan weg, een ster door iets anders blijft staan. Meer sterren dan de kaping gaf: niets verandert.
export function wantedNaDienst(wanted, stealStars) {
  return stealStars > 0 && wanted > 0 && wanted <= stealStars ? 0 : wanted;
}

// The service ends early (Backspace): what was done counts, the rest scores 0.
export function abandonService(svc) {
  if (svc.finished) return;
  svc.abandoned = true;
  finish(svc);
}

function next(svc, ev) {
  svc.overStop = 0;
  svc.ebStop = 0;
  svc.moved = false;
  svc.i++;
  if (svc.i >= svc.plan.length) {
    finish(svc);
    ev.push({ kind: 'done', result: svc.result });
  }
}

// One frame. s: { c (arc of the train's middle), v (m/s, >= 0), time, emergency }.
// Returns the events of this frame: 'stopped' {stop}, 'missed' {stop}, 'done'.
export function stepService(svc, dt, s) {
  const ev = [];
  if (svc.finished) return ev;
  const st = svc.plan[svc.i];
  const toStop = (st.s - s.c) * svc.dir;
  const lim = speedLimit(svc.vmax, toStop);
  svc.limit = lim;
  svc.toStop = toStop;
  if (s.v > lim + 1 && !doorsOpen(svc, s.time)) svc.overStop += dt;
  if (s.emergency && !svc.ebHeld && s.v > 2) svc.ebStop++;
  svc.ebHeld = !!s.emergency;
  if (toStop < -MISS_BEYOND) {
    st.score = 0;
    svc.flash = `${st.name} gemist`;
    svc.flashBad = true;
    svc.flashUntil = s.time + 4;
    ev.push({ kind: 'missed', stop: st });
    next(svc, ev);
  } else if (s.v < STOPPED_V && Math.abs(toStop) <= PLATFORM_WINDOW && svc.moved) {
    st.errM = -toStop;
    st.lateS = s.time - st.due;
    st.medal = stopMedal(st.errM);
    st.score = scoreStop({ errM: st.errM, lateS: st.lateS, over: svc.overStop, ebrakes: svc.ebStop });
    svc.doorsUntil = s.time + DOORS_S;
    svc.flash = `${st.name}: ${st.score} punten`;
    svc.flashBad = st.score < MEDAL_AT[0];
    svc.flashUntil = s.time + 5;
    ev.push({ kind: 'stopped', stop: st });
    next(svc, ev);
  }
  if (s.v > 1.5) svc.moved = true;
  return ev;
}

// What a good driver does: throttle and brake of a clean run, for the test.
export function autopilot(svc, v, toStop) {
  const bd = brakeDist(v, BRAKE * 0.8);
  const lim = speedLimit(svc.vmax, toStop - bd);
  const need = bd + 1;
  if (toStop <= need || v > lim + 0.3) return { throttle: false, brake: v > 0.3 };
  return { throttle: v < lim - 0.8, brake: false };
}

// --- what the cab board shows (machinist.js draws it) ----------------------------

export const kmh = (v) => Math.round(v * 3.6);

// "+0:42" late, "-0:10" early; the first 10 s either way count as on time.
export function delayText(lateS) {
  const a = Math.abs(Math.round(lateS));
  if (a <= 10) return 'op tijd';
  return `${lateS > 0 ? '+' : '-'}${Math.floor(a / 60)}:${String(a % 60).padStart(2, '0')}`;
}

// The figures for one frame of a running service. s: { v, time }.
// brakeFrac: braking distance over the distance to the platform mark (>= 1 means
// the train cannot stop any more at the service brake).
export function boardView(svc, s) {
  const st = currentStop(svc);
  const open = doorsOpen(svc, s.time);
  const cells = svc.plan.map((p, i) => ({
    t: p.score == null ? (i === svc.i && !svc.finished ? '▶' : '·') : String(p.score),
    cls: p.score == null ? (i === svc.i && !svc.finished ? 'now' : '') : p.score >= MEDAL_AT[0] ? 'ok' : 'bad',
  }));
  if (!st) return { done: true, cells, flash: svc.flash, bad: svc.flashBad, result: svc.result };
  const toStop = svc.toStop;
  const bd = brakeDist(s.v);
  const frac = toStop > 0 ? bd / toStop : (s.v > STOPPED_V ? 2 : 0);
  return {
    done: false, doors: open, cells,
    name: st.name, toStop: Math.round(toStop), kmh: kmh(s.v), limitKmh: kmh(svc.limit),
    tooFast: s.v > svc.limit + 1 && !open, brakeM: Math.round(bd), brakeFrac: frac,
    delayS: s.time - st.due, delay: delayText(s.time - st.due),
    flash: s.time < svc.flashUntil ? svc.flash : '', bad: svc.flashBad,
  };
}
