// Machinist (#14): drive a stolen or parked train as a stoptrein service. G
// starts the service from the halte, the board shows the speed, the board
// limit, the braking distance and the timetable, Backspace ends it. The rules
// are machinistrules.js, the physics railway.js (state 'player'), the boarding
// and keys traindrive.js. Money-neutral: no pay, a score and a medal.
import { createBoard, key } from './minigamekit.js';
import { driveRange } from './railway.js';
import {
  startService, stepService, abandonService, boardView, doorsOpen, MEDAL_NAMES, STOPPED_V,
} from './machinistrules.js';

const ACCENT = '#3a7bd5';
const LINE_SPEED_K = 1.45; // railway.js DRIVE_VMAX_K

let svc = null;
let board = null;

const HELP_IDLE = `${key('G')} dienst rijden: halte voor halte, op tijd en op de streep`;
const HELP_RUN = `${key('W')} gas &middot; ${key('S')} rem &middot; ${key('Spatie')} noodrem &middot; ${key('H')} toeter &middot; ${key('Backspace')} stoppen`;

export const serviceActive = () => !!svc && !svc.finished;
export const getService = () => svc;

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
    world.addMessage('Geen halte meer vooruit op dit spoor', 2.5);
    return;
  }
  world.addMessage(`Dienst: ${svc.plan.length} halten, eerst ${svc.plan[0].name}`, 3);
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
