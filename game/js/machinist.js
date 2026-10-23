// Machinist (#14): drive a stolen or parked train as a stoptrein service. G
// starts the service from the halte, the board shows the speed, the board
// limit, the braking distance and the timetable, Backspace ends it. The rules
// are machinistrules.js, the physics railway.js (state 'player'), the boarding
// and keys traindrive.js. Pays per halte plus a medal bonus (payFor).
import { createBoard, key } from './minigamekit.js';
import { driveRange, routePoint } from './railway.js';
import { loopbaanVerdien } from './loopbaanlive.js';
import {
  startService, stepService, abandonService, boardView, doorsOpen, MEDAL_NAMES, STOPPED_V, payFor, wantedNaDienst,
} from './machinistrules.js';

const ACCENT = '#3a7bd5';
const LINE_SPEED_K = 1.45; // railway.js DRIVE_VMAX_K

let svc = null;
let board = null;

const HELP_IDLE = `${key('G')} dienst rijden: halte voor halte, op tijd en op de streep`;
const HELP_RUN = `${key('W')} gas &middot; ${key('S')} rem &middot; ${key('Spatie')} noodrem &middot; ${key('H')} toeter &middot; ${key('Backspace')} stoppen`;


// The service as the map layer reads it (missionmaplive.js, #180): the halten
// of the timetable with the next one marked, and the track ahead of the train.
// Read only; null when no service runs.
export function getServiceMapState(world) {
  const t = world && world.trainDriving;
  if (!svc || !t || !t.route) return null;
  const stops = svc.plan.map((st, i) => {
    const [x, y] = routePoint(t.route, st.s);
    return { x, y, name: st.name, next: !svc.finished && i === svc.i, done: st.score != null };
  });
  const last = svc.plan.length ? svc.plan[svc.plan.length - 1].s : t.c;
  const route = [];
  const n = 24;
  for (let k = 0; k <= n; k++) {
    const [x, y] = routePoint(t.route, t.c + (last - t.c) * (k / n));
    route.push({ x, y });
  }
  return { stops, route };
}

export function endService(world) {
  svc = null;
  if (board) board.hide();
}

function begin(world, t) {
  const [lo, hi] = driveRange(t.route);
  svc = startService({
    stops: t.route.stops, c: t.c, dir: t.cab, vmax: t.cfg.vmax * LINE_SPEED_K, time: world.time,
    range: [lo + t.halfLen, hi - t.halfLen],
  });
  if (svc.finished) {
    svc = null;
    world.addMessage('Einde van de lijn: stap aan de andere kant van de trein in', 3.5);
    return;
  }
  // een gekaapte trein: als machinist ben je niet langer gezocht voor die kaping (#424)
  const na = wantedNaDienst(world.wanted, world.trainSteal || 0);
  const vergeven = na !== world.wanted;
  if (vergeven) { world.wanted = na; world.wantedDecayTimer = 0; }
  world.trainSteal = 0;
  world.addMessage(`Dienst: ${svc.plan.length} halten, eerst ${svc.plan[0].name}${vergeven ? '. Je staat als machinist genoteerd' : ''}`, 3.5);
}

// Called by traindrive.js each frame while the player drives t, after the
// controls are read into t.ctl.
export function updateMachinist(dt, world, t) {
  const input = world.input;
  if (!board) board = createBoard('Machinist', ACCENT);
  if (input.wasPressed('g')) {
    input.consume('g');
    if (!svc || svc.finished) begin(world, t);
  }
  if (input.wasPressed('backspace') && svc) {
    input.consume('backspace');
    if (!svc.finished) abandonService(svc);
    else endService(world);
  }
  if (!svc) {
    if (t.v < 1) { board.show(); board.set({ row: '', help: HELP_IDLE }); } else board.hide();
    return;
  }
  board.show();
  if (!svc.finished) {
    // doors are open: the train stands
    if (doorsOpen(svc, world.time)) t.ctl.throttle = false;
    const events = stepService(svc, dt, { c: t.c, v: t.v, time: world.time, emergency: t.ctl.emergency });
    for (const e of events) if (e.kind === 'stopped' || e.kind === 'missed') world.addMessage(svc.flash, 3);
  }
  const v = boardView(svc, { v: t.v, time: world.time });
  if (v.done) {
    const r = svc.result;
    if (!svc.paid) {
      svc.paid = true;
      const pay = payFor(r, svc.abandoned);
      const betaald = loopbaanVerdien(world, 'trein', pay, { xp: pay > 0 ? Math.round(r.made * 4 + r.medal * 8) : 0, n: 0, uniek: pay > 0 ? 'machinist' : null }); // samen spelen (#365), loopbaan (#381)
      if (betaald > 0) world.addMessage(`Dienst betaald: €${betaald}`, 3);
    }
    board.set({
      row: `<b>${MEDAL_NAMES[r.medal]}</b> &middot; ${r.score} punten`,
      cells: v.cells,
      flash: svc.abandoned ? 'Dienst gestopt' : `${r.made}/${r.stops} halten, gemiddeld ${r.avgErr.toFixed(1)} m naast de streep, ${Math.round(r.avgLate)} s te laat`,
      help: `${key('G')} nieuwe dienst &middot; ${key('Backspace')} sluiten`,
    });
    return;
  }
  board.set({
    row: `<b>${v.name}</b> &middot; ${v.toStop < 0 ? 'voorbij' : `${v.toStop} m`} &middot; ${v.kmh} km/u (max ${v.limitKmh}) &middot; remweg ${v.brakeM} m &middot; ${v.delay}`,
    cells: v.cells,
    meter: { v: Math.min(1, v.brakeFrac), color: v.brakeFrac > 0.9 ? '#d94a3a' : v.brakeFrac > 0.7 ? '#e0a030' : '#46a35e' },
    flash: v.doors ? 'Deuren open' : v.tooFast ? 'Te hard: rem af' : v.flash,
    bad: v.tooFast || v.bad,
    help: HELP_RUN,
  });
}
