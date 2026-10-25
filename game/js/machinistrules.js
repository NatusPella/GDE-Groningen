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
export const FAULTLESS_BONUS = 25; // een rit zonder fouten: alles gehaald, op tijd, geen sein of waakzaamheidsrem

// Remweg at the service brake.
export const brakeDist = (v, a = BRAKE) => (v * v) / (2 * a);

// --- reizigers (#492): tellen en per halte laten betalen --------------------------------------
export const TREIN_CAPACITEIT = 90;  // zit- en staanplaatsen van de stoptrein
export const PERRON_MAX = 8;         // meer wachtenden dan dit staan er nooit op een halte
export const TREIN_KAARTJE = 0.7;    // euro per meegereden reiziger per halte (de bus vraagt 0,80)

// Een vaste verdeelsleutel per halte: geen random en geen klok, dezelfde dienst geeft hetzelfde beeld.
function halteKans(zaad, n) {
  let x = (Math.imul((zaad | 0) ^ 0x9e3779b1, 2654435761) + Math.imul(n + 1, 40503)) >>> 0;
  x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13;
  return (x >>> 0) / 4294967296;
}

// Hoe druk staat het perron van deze halte? Tussen de 1 en PERRON_MAX wachtenden, vast per halte.
export const perronVoor = (zaad) => 1 + Math.round((PERRON_MAX - 1) * halteKans(zaad, 0));

// Wie stappen er op deze halte in en uit? perron: het aantal wachtenden, onBoard: wie er nu in de
// trein zit. Nooit negatief, nooit boven de capaciteit, nooit meer uitstappers dan er in de trein zitten.
// Op de laatste halte van de dienst stapt niemand meer in: die mensen zouden nooit meerijden.
export function reizigersBijHalte({ perron = 0, onBoard = 0, capaciteit = TREIN_CAPACITEIT, zaad = 0, laatste = false }) {
  const cap = Math.max(0, Math.floor(capaciteit));
  const aan = clamp(Math.floor(onBoard), 0, cap);
  const wacht = Math.max(0, Math.floor(perron));
  // een deel stapt uit; op een drukke halte willen er meer van boord (hun bestemming)
  const alight = Math.min(aan, Math.round(aan * (0.15 + 0.45 * halteKans(zaad, 1))));
  // instappen: wie er wacht, voor zover er nog plaats is; niet iedereen haalt de trein
  const vrij = cap - (aan - alight);
  const board = laatste ? 0 : Math.max(0, Math.min(vrij, Math.round(wacht * (0.55 + 0.45 * halteKans(zaad, 2)))));
  return { alight, board, onBoard: aan - alight + board };
}

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
export function startService({ stops, c, dir, vmax, time, limit = 6, range, storingen = false }) {
  const ahead = upcomingStops(stops, c, dir, range).slice(0, limit);
  let at = time, prev = c;
  const plan = ahead.map((st) => {
    at += runTime(Math.abs(st.s - prev), vmax) + (prev === c ? 0 : DOORS_S);
    prev = st.s;
    // vast zaad per fysieke halte: dezelfde halte geeft altijd dezelfde perrondrukte
    const zaad = (Math.round(st.s) * 31) >>> 0;
    return { ...st, zaad, perron: perronVoor(zaad), due: at, dep: at + 6, score: null, errM: null, lateS: null, medal: 0, punct: 0, comfort: 0, early: false };
  });
  return {
    plan, i: 0, vmax, dir, start: time, doorsUntil: 0, overStop: 0, ebStop: 0, ebHeld: false, moved: false,
    limit: vmax, toStop: Infinity, finished: !plan.length, result: null, abandoned: false,
    flash: '', flashBad: false, flashUntil: 0,
    // reizigers (#492): wie er nu in de trein zit, hoeveel er meereden en wat de kaartjes opbrachten
    reizigers: 0, totaal: 0, kaart: 0,
    // dienstregeling, storingen en veiligheid (#444): een rood sein of een overweg op een lange etappe
    storingen: storingen ? planStoringen(plan, c, dir) : [], faults: [], safetyPen: 0, deadman: 0, holdUntil: 0, opened: 0, sein: null,
  };
}

export const currentStop = (svc) => (svc.finished ? null : svc.plan[svc.i]);
export const doorsOpen = (svc, time) => time < svc.doorsUntil;

// Points for one stop: place 50, punctuality 40, comfort 10, minus speeding.
export function scoreParts({ errM, lateS, over, ebrakes }) {
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
  return { place, punctual, comfort, penalty };
}
export function scoreStop(x) {
  const { place, punctual, comfort, penalty } = scoreParts(x);
  return Math.max(0, place + punctual + comfort - penalty);
}

export const stopMedal = (errM) => {
  const a = Math.abs(errM);
  return a <= STOP_TOL[2] ? 3 : a <= STOP_TOL[1] ? 2 : a <= STOP_TOL[0] ? 1 : 0;
};

function finish(svc) {
  svc.finished = true;
  const made = svc.plan.filter((p) => p.errM != null);
  const n = svc.plan.length;
  const avg = n ? svc.plan.reduce((s, p) => s + (p.score || 0), 0) / n : 0;
  // een sein genegeerd of een waakzaamheidsrem telt mee in de eindscore (de helft van de strafpunten)
  const score = Math.max(0, Math.round(avg - svc.safetyPen * 0.5));
  const pct = (key, max) => (n ? Math.round(svc.plan.reduce((s, p) => s + (p[key] || 0), 0) / n / max * 100) : 0);
  const punct = pct('punct', 40), comfort = pct('comfort', 10);
  const veilig = clamp(100 - svc.safetyPen - Math.round(svc.plan.reduce((s, p) => s + (p.pen || 0), 0) / Math.max(1, n)), 0, 100);
  svc.result = {
    score, medal: medalFrom(score, MEDAL_AT), stops: n, made: made.length, punct, comfort, veilig,
    faults: svc.faults.length, faultless: !svc.abandoned && made.length === n && n > 0 && veilig === 100 && punct >= 90,
    avgErr: made.length ? made.reduce((s, p) => s + Math.abs(p.errM), 0) / made.length : 0,
    avgLate: made.length ? made.reduce((s, p) => s + Math.max(0, p.lateS), 0) / made.length : 0,
    // de reizigers (#492): hoeveel er meereden en wat de kaartjes bij elkaar opbrachten
    reizigers: svc.totaal || 0, kaart: svc.kaart || 0,
  };
}

// Wat een dienst oplevert (euro's): per gehaalde halte een bedrag naar score,
// plus een bonus voor de medaille en de kaartinkomsten van de reizigers (#492).
// Een gestopte dienst betaalt niets.
export function payFor(result, abandoned = false) {
  if (!result || abandoned) return 0;
  return Math.round(result.made * (6 + result.score / 8) + result.medal * 20 + (result.kaart || 0)) + (result.faultless ? FAULTLESS_BONUS : 0);
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
  svc.lastC = s.c;
  const toStop = (st.s - s.c) * svc.dir;
  let lim = speedLimit(svc.vmax, toStop);
  svc.sein = null;
  if (svc.storingen.length) {
    const r = stepStoringen(svc, { nose: s.nose != null ? s.nose : s.c, v: s.v, time: s.time, dt }, ev);
    lim = Math.min(lim, r.limit);
    svc.sein = r.sein;
  }
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
    const parts = scoreParts({ errM: st.errM, lateS: st.lateS, over: svc.overStop, ebrakes: svc.ebStop });
    st.score = Math.max(0, parts.place + parts.punctual + parts.comfort - parts.penalty);
    st.punct = parts.punctual; st.comfort = parts.comfort; st.pen = parts.penalty;
    // de reizigers van deze halte (#492): wie er uitstapt en wie er meerijdt, en het kaartgeld.
    // Op de laatste halte stapt niemand meer in: de dienst is daar klaar.
    const laatste = svc.i >= svc.plan.length - 1;
    const r = reizigersBijHalte({ perron: st.perron, onBoard: svc.reizigers, zaad: st.zaad, laatste });
    st.alight = r.alight;
    st.board = r.board;
    st.kaart = Math.round(r.board * TREIN_KAARTJE * 100) / 100;
    svc.reizigers = r.onBoard;
    svc.totaal += r.board;
    svc.kaart = Math.round((svc.kaart + st.kaart) * 100) / 100;
    // te vroeg aangekomen: de deuren blijven open tot het vertrek (hooguit 25 s), anders loopt de dienstregeling uit
    svc.opened = s.time;
    svc.doorsUntil = Math.max(s.time + DOORS_S, Math.min(s.time + 25, st.dep));
    svc.holdUntil = svc.doorsUntil;
    svc.served = st;
    svc.flash = `${st.name}: ${st.score} punten, ${st.alight} uit, ${st.board} in`;
    svc.flashBad = st.score < MEDAL_AT[0];
    svc.flashUntil = s.time + 5;
    ev.push({ kind: 'stopped', stop: st });
    next(svc, ev);
  }
  if (s.v > 1.5) svc.moved = true;
  return ev;
}

export const EARLY_PEN = 10;
export const BOARD_MIN_S = 5; // zo lang blijven de deuren minstens open voor je ze zelf dicht mag doen

// De deurknop (O) op een halte. Dicht: kan na BOARD_MIN_S; voor de vertrektijd is te vroeg (strafpunten bij de
// punctualiteit van die halte). Open: alleen stilstaand op het perron, voor de halte die je net deed.
export function pressDoors(svc, { time, v }) {
  if (svc.finished) return { ok: false, msg: 'Geen dienst: de deuren gaan vanzelf' };
  const st = svc.served;
  if (doorsOpen(svc, time)) {
    if (time - svc.opened < BOARD_MIN_S) return { ok: false, msg: 'Wacht even: er stappen nog reizigers in' };
    const early = time < st.dep - 12;
    svc.doorsUntil = time;
    if (early && !st.early) {
      st.early = true;
      st.score = Math.max(0, st.score - EARLY_PEN);
      st.punct = Math.max(0, st.punct - EARLY_PEN);
      svc.flash = 'Te vroeg vertrokken'; svc.flashBad = true; svc.flashUntil = time + 4;
      return { ok: true, early: true, msg: 'Deuren dicht, maar voor de vertrektijd' };
    }
    return { ok: true, msg: 'Deuren dicht' };
  }
  if (!st || v > STOPPED_V || Math.abs(st.s - svc.lastC) > PLATFORM_WINDOW) return { ok: false, msg: 'De deuren gaan alleen open stilstaand aan het perron' };
  if (svc.reopened === st) return { ok: false, msg: 'De deuren zijn al een keer open geweest' };
  svc.reopened = st;
  svc.opened = time;
  svc.doorsUntil = time + 6;
  return { ok: true, msg: 'Deuren open' };
}

// --- storingen: een rood sein en een overweg op een lange etappe ---------------------------------------
export const SEIN_TRIGGER = 300;   // m voor het sein springt het op rood
export const SEIN_WAIT = 5;        // s stilstaan voor het sein voor het groen wordt
export const SEIN_MAX_RED = 50;    // s: daarna groen, wat je ook doet (nooit een vastgelopen dienst)
export const OVERWEG_NEAR = 220;   // m voor de overweg gaat de slagboom dicht
export const OVERWEG_LIMIT = 15;   // m/s door de overweg (54 km/u)
export const SEIN_PEN = 40, OVERWEG_PEN = 20, DEADMAN_PEN = 25;

// Een storing in elke lange etappe: om en om een sein en een overweg. s = booglengte (zoals de halten).
export function planStoringen(plan, c, dir) {
  const out = [];
  let prev = c;
  plan.forEach((st, i) => {
    const d = Math.abs(st.s - prev);
    if (d > (i === 0 ? 900 : 500)) {
      const kind = out.length % 2 ? 'overweg' : 'sein';
      out.push({ kind, s: prev + dir * d * (kind === 'sein' ? 0.45 : 0.62), state: 'wacht', trigAt: 0, wait: 0, passed: false, bad: false });
    }
    prev = st.s;
  });
  return out;
}

function addFault(svc, kind, pen, time, ev, text) {
  svc.faults.push({ kind, pen, at: time });
  svc.safetyPen += pen;
  svc.flash = text; svc.flashBad = true; svc.flashUntil = time + 4;
  ev.push({ kind, pen });
}

// Per beeld: s = { nose (booglengte van de neus), v, time }. Geeft { limit, sein } terug: de snelheid die de
// storing toestaat en de tekst voor het bord (of null).
function stepStoringen(svc, s, ev) {
  let limit = Infinity, text = null;
  const dt = s.dt || 0;
  for (const g of svc.storingen) {
    if (g.passed) continue;
    const to = (g.s - s.nose) * svc.dir;
    if (g.kind === 'sein') {
      if (g.state === 'wacht' && to < SEIN_TRIGGER && to > 0) { g.state = 'rood'; g.trigAt = s.time; ev.push({ kind: 'sein-rood', g }); }
      if (g.state === 'rood') {
        if (to < 90 && s.v < 1) g.wait += dt;
        if (g.wait >= SEIN_WAIT || s.time - g.trigAt > SEIN_MAX_RED) { g.state = 'groen'; ev.push({ kind: 'sein-groen', g }); }
      }
      if (g.state === 'rood') {
        limit = Math.min(limit, Math.sqrt(2 * BRAKE * Math.max(0, to - 12)));
        text = to < 90 && s.v < 1 ? `Sein op rood: wacht nog ${Math.max(0, Math.ceil(SEIN_WAIT - g.wait))} s` : `Sein op rood, over ${Math.max(0, Math.round(to))} m: stop ervoor`;
      }
      if (to < -2) {
        g.passed = true;
        if (g.state === 'rood') { g.bad = true; addFault(svc, 'sein-genegeerd', SEIN_PEN, s.time, ev, 'Sein op rood genegeerd'); }
      }
    } else {
      if (g.state === 'wacht' && to < OVERWEG_NEAR && to > 0) { g.state = 'dicht'; ev.push({ kind: 'overweg-dicht', g }); }
      if (g.state === 'dicht') {
        limit = Math.min(limit, OVERWEG_LIMIT);
        text = `Overweg dicht over ${Math.max(0, Math.round(to))} m: max ${kmh(OVERWEG_LIMIT)} km/u`;
        if (to < 0 && !g.fast && s.v > OVERWEG_LIMIT + 2) g.fast = true;
      }
      if (to < -2) {
        g.passed = true;
        if (g.fast) { g.bad = true; addFault(svc, 'overweg-te-hard', OVERWEG_PEN, s.time, ev, 'Te hard door de overweg'); }
        else if (g.state === 'dicht') ev.push({ kind: 'overweg-vrij', g });
      }
    }
  }
  return { limit, sein: text };
}

// De waakzaamheidsrem (treincabine.js) heeft ingegrepen: dat is een veiligheidsfout.
export function deadmanFault(svc, time) {
  if (svc.finished) return;
  svc.deadman++;
  addFault(svc, 'waakzaam', DEADMAN_PEN, time, [], 'Waakzaamheidsrem: je reageerde niet');
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
  if (!st) return { done: true, cells, flash: svc.flash, bad: svc.flashBad, result: svc.result, reizigers: svc.reizigers || 0, kaart: svc.kaart || 0 };
  const toStop = svc.toStop;
  const bd = brakeDist(s.v);
  const frac = toStop > 0 ? bd / toStop : (s.v > STOPPED_V ? 2 : 0);
  const served = svc.served && svc.served.board != null ? svc.served : null;
  return {
    done: false, doors: open, cells,
    name: st.name, toStop: Math.round(toStop), kmh: kmh(s.v), limitKmh: kmh(svc.limit),
    tooFast: s.v > svc.limit + 1 && !open, brakeM: Math.round(bd), brakeFrac: frac,
    delayS: s.time - st.due, delay: delayText(s.time - st.due),
    flash: s.time < svc.flashUntil ? svc.flash : '', bad: svc.flashBad,
    dueIn: Math.round(st.due - s.time), depIn: open && svc.served ? Math.max(0, Math.round(svc.served.dep - s.time)) : null,
    storing: svc.sein, faults: svc.faults.length, vmaxKmh: kmh(svc.vmax), stopIndex: svc.i, stopCount: svc.plan.length,
    // de reizigers (#492): wie er nu meerijdt en wat er op de vorige halte in- en uitstapte
    reizigers: svc.reizigers || 0, kaart: svc.kaart || 0,
    lastStop: served ? { name: served.name, alight: served.alight, board: served.board } : null,
  };
}
