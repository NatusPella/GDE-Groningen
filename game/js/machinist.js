// Machinist (#14): drive a stolen or parked train as a stoptrein service. G
// starts the service from the halte, the board shows the speed, the board
// limit, the braking distance and the timetable, Backspace ends it. The rules
// are machinistrules.js, the physics railway.js (state 'player'), the boarding
// and keys traindrive.js. Pays per halte plus a medal bonus (payFor).
import { createBoard, key } from './minigamekit.js';
import { driveRange, routePoint, hijackTrain } from './railway.js';
import { loopbaanVerdien } from './loopbaanlive.js';
import {
  startService, stepService, abandonService, boardView, doorsOpen, MEDAL_NAMES, STOPPED_V, payFor, wantedNaDienst,
  pressDoors, deadmanFault,
} from './machinistrules.js';
import { createCabHud, cabView } from './treincabine.js';

const ACCENT = '#3a7bd5';
const LINE_SPEED_K = 1.45; // railway.js DRIVE_VMAX_K

let svc = null;
let board = null;
let hud = null;

const HELP_METER = 'Balk: remweg tegenover de afstand tot de halte (rood: nu remmen)';
const HELP_CAB = `${key('W')}${key('S')} hendel &middot; ${key('K')} waak &middot; ${key('O')} deuren &middot; ${key('Spatie')} noodrem &middot; ${key('H')} toeter &middot; ${key('C')} binnenzicht &middot; ${key('T')} rondlopen &middot; ${key('G')} dienst &middot; ${key('Backspace')} stoppen`;
const INTRO = `<b>TREIN BESTUREN</b>${key('W')} trekt de hendel omhoog: tractie. ${key('S')} zet hem terug en dan op Rem 1 tot 3. ${key('Spatie')} is de noodrem.<br>${key('K')} is de waakzaamheidsknop: druk hem als de trein erom vraagt. ${key('O')} doet de deuren op een halte. ${key('G')} start de dienst. ${key('C')} kijkt binnen, ${key('T')} laat je rondlopen.`;

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

// Alleen lezen, voor de spelbot en de tests.
export const getService = () => svc;
export const serviceRunning = () => !!svc && !svc.finished;

export function endService(world) {
  svc = null;
  if (board) board.hide();
  if (hud) hud.hide();
}

// Samenvatting voor traindrive.js: gaan de deuren open (de hendel gaat dan op nul)?
export const doorsAreOpen = (world) => !!svc && !svc.finished && doorsOpen(svc, world.time);

// De waakzaamheidsrem greep in (treincabine.js): een veiligheidsfout in de dienst.
export function deadmanHit(world) {
  if (svc && !svc.finished) deadmanFault(svc, world.time);
}

function begin(world, t) {
  const [lo, hi] = driveRange(t.route);
  const plan = (cab) => startService({
    stops: t.route.stops, c: t.c, dir: cab, vmax: t.cfg.vmax * LINE_SPEED_K, time: world.time,
    range: [lo + t.halfLen, hi - t.halfLen], storingen: true,
  });
  svc = plan(t.cab);
  // geen halte meer voor je (je stapte in bij de kop van de lijn): als de trein stilstaat draai je de cabine om (#436)
  if (svc.finished && t.v < 1) {
    const andere = plan(-t.cab);
    if (!andere.finished) {
      hijackTrain(t, -t.cab);
      svc = andere;
      world.addMessage('Einde van de lijn aan deze kant: je rijdt de andere kant op', 3);
    }
  }
  if (svc.finished) {
    svc = null;
    world.addMessage('Geen halte meer voor je: stap in bij de andere kant van de lijn', 3.5);
    return;
  }
  // een gekaapte trein: als machinist ben je niet langer gezocht voor die kaping (#424)
  const na = wantedNaDienst(world.wanted, world.trainSteal || 0);
  const vergeven = na !== world.wanted;
  if (vergeven) { world.wanted = na; world.wantedDecayTimer = 0; }
  world.trainSteal = 0;
  world.addMessage(`Dienst: ${svc.plan.length} halten, eerst ${svc.plan[0].name}${vergeven ? '. Je staat als machinist genoteerd' : ''}`, 3.5);
}

const STORING_MSG = {
  'sein-rood': 'Sein op rood voor je: stop ervoor',
  'sein-groen': 'Het sein springt op groen',
  'overweg-dicht': 'De slagbomen van de overweg gaan dicht',
  'sein-genegeerd': 'Sein op rood genegeerd: veiligheidsfout',
  'overweg-te-hard': 'Te hard door de overweg: veiligheidsfout',
  early: 'Te vroeg vertrokken van de halte',
};

// Called by traindrive.js each frame while the player drives t, after the
// controls are read into t.ctl. cab: de hendel (treincabine.js).
export function updateMachinist(dt, world, t, cab) {
  const input = world.input;
  if (!board) board = createBoard('Machinist', ACCENT);
  if (!hud) hud = createCabHud();
  const vmaxV = t.cfg.vmax * LINE_SPEED_K;
  if (input.wasPressed('g')) {
    input.consume('g');
    if (!svc || svc.finished) { begin(world, t); cab.introUntil = 0; }
  }
  if (input.wasPressed('backspace') && svc) {
    input.consume('backspace');
    if (!svc.finished) abandonService(svc);
    else endService(world);
  }
  if (input.wasPressed('o')) {
    input.consume('o');
    if (!svc || svc.finished) world.addMessage('De deuren gaan open bij een halte in een dienst: druk eerst G', 2.5);
    else {
      const r = pressDoors(svc, { time: world.time, v: t.v });
      world.addMessage(r.msg, 2);
    }
  }
  t.doorsOpen = !!svc && !svc.finished && doorsOpen(svc, world.time); // de deuren in het binnenste (treininterieur.js)
  if (hud) hud.show();
  if (hud) hud.intro(cab && cab.introUntil > world.time && !cab.since ? INTRO : '');
  if (!svc) {
    board.hide();
    if (hud) hud.set(cabView(cab, t.v, null, vmaxV), HELP_CAB);
    return;
  }
  if (!svc.finished) {
    // doors are open: the train stands
    if (doorsOpen(svc, world.time)) { t.ctl.throttle = false; t.ctl.power = 0; }
    const events = stepService(svc, dt, { c: t.c, v: t.v, time: world.time, emergency: t.ctl.emergency, nose: t.c + svc.dir * t.halfLen });
    for (const e of events) {
      if (e.kind === 'stopped' || e.kind === 'missed') world.addMessage(svc.flash, 3);
      else if (STORING_MSG[e.kind]) world.addMessage(STORING_MSG[e.kind], 3);
    }
  }
  const v = boardView(svc, { v: t.v, time: world.time });
  if (v.done) {
    const r = svc.result;
    if (!svc.paid) {
      svc.paid = true;
      const pay = payFor(r, svc.abandoned);
      const betaald = loopbaanVerdien(world, 'trein', pay, { xp: pay > 0 ? Math.round(r.made * 4 + r.medal * 8) : 0, n: 0, uniek: pay > 0 ? 'machinist' : null }); // samen spelen (#365), loopbaan (#381)
      svc.pay = betaald;
      if (betaald > 0) world.addMessage(`Dienst betaald: €${betaald}`, 3);
    }
    board.hide();
    if (hud) {
      hud.set(cabView(cab, t.v, null, vmaxV), HELP_CAB);
      hud.result({ ...r, medalName: MEDAL_NAMES[r.medal] }, svc.pay || 0, svc.abandoned, `${key('G')} nieuwe dienst &middot; ${key('Backspace')} sluiten`);
    }
    return;
  }
  board.show();
  board.set({
    row: `<b>${v.name}</b> &middot; remweg ${v.brakeM} m`,
    cells: v.cells,
    meter: { v: Math.min(1, v.brakeFrac), color: v.brakeFrac > 0.9 ? '#d94a3a' : v.brakeFrac > 0.7 ? '#e0a030' : '#46a35e' },
    flash: v.doors ? 'Deuren open' : v.tooFast ? 'Te hard: rem af' : v.flash,
    bad: v.tooFast || v.bad,
    help: HELP_METER,
  });
  if (hud) hud.set(cabView(cab, t.v, v, vmaxV), HELP_CAB);
}
