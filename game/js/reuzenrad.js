import { hoofdspeler } from './players.js';
import { toonStartkaart } from './startkaart.js';
import { pushAudioEvent } from './pedgeom.js';
import { kermisOn, kermisWheel, kermisFrame } from './kermis.js';
import { activityBlock, iconDisc } from './activitykit.js';
import { easeStep, mgThema } from './minigamekit.js';
import { simHudTik, simHudPop, uitlegGezien, zetUitlegGezien } from './simhud.js';
import { reuzenradHudModel, stapVan, topPop, UITLEG_ID } from './reuzenradstatus.js';
import { maakSimKolom, zetSimKolom } from './simkolom3d.js';
import { getScene } from './scene3d.js';
import { showCard } from './hudcards.js';
import { recordStat, getStat } from './achievements.js';
import { getSettings } from './settings.js';
import * as W from './reuzenradrules.js';

// Hoogvlieger, het reuzenrad van kermisbaas Jan: loop naar de instap, druk E als
// er een gondel onderaan hangt (€2), en je zit twee rondes mee. Je volgt de pose
// van de gondel (kermis.js draait het rad, de regels staan in reuzenradrules.js),
// de camera hangt rustig in de gondel en je kijkt vrij rond met de muis of de
// pijltjes. BACKSPACE of E: uitstappen zodra je weer onderaan hangt. Doet mee aan
// het activiteitencontract (activities.js / busy.js). `window.__hoogvlieger` debug.
// #627: hetzelfde accent als het kermissbord komt uit MG_THEMA.
const ACCENT = mgThema('hoogvlieger').accent;
const LOOK_PER_PX = 0.0025;
const LOOK_KEYS = 1.3; // rad/s met de pijltjes
const EYE = 1.0; // oog boven de zitting
const NAME = 'Hoogvlieger';

let ride = null;
let kolom = null; // #985: de gele lichtkolom bij de instap

const { toW, toL } = kermisFrame;
const LOAD = toW(W.LOAD_AT.u, W.LOAD_AT.v);

function nearLoading(w) {
  const p = hoofdspeler(w);
  if (p.inVehicle || p.swimming || w.pigeonMode || w.heliRun) return false;
  const l = toL(p.x, p.y);
  return W.nearLoading(l.u, l.v);
}

const open = (w) => kermisOn(w) && !!kermisWheel();

function blockReason(w) {
  return activityBlock(w) || (w.money < W.PRICE ? `Te weinig geld: een ritje kost €${W.PRICE}` : null);
}

let announced = false;
function prompt(w) {
  // #679: wie overdag bij het rad staat hoort één keer wanneer het draait.
  if (!ride && !open(w) && nearLoading(w) && !announced) { announced = true; w.addMessage('Het reuzenrad Hoogvlieger draait vanavond vanaf 19:00.', 4); }
  if (ride || !open(w) || !nearLoading(w)) return null;
  const why = blockReason(w);
  const wait = W.secondsToNextGondola(kermisWheel().rot);
  const sub = why || (wait > 0 ? `€${W.PRICE} · de volgende gondel komt zo` : `€${W.PRICE} · ${W.LAPS} rondes met uitzicht over de stad`);
  return { id: 'hoogvlieger', x: LOAD.x, y: LOAD.y, h: 2.2, key: 'E', label: NAME, sub, ring: true, dim: !!why };
}

function secondary(w) {
  if (ride || !open(w) || hoofdspeler(w).inVehicle) return [];
  if (Math.hypot(hoofdspeler(w).x - LOAD.x, hoofdspeler(w).y - LOAD.y) > 60) return [];
  return [{ id: 'hoogvlieger-2', x: LOAD.x, y: LOAD.y, h: 2.4, label: NAME, sub: 'Het reuzenrad · loop naar de instap en druk E', kind: 'place' }];
}

function interact(w) {
  if (ride || !open(w) || !nearLoading(w)) return false;
  const why = blockReason(w);
  if (why) { w.addMessage(why, 2.5); return true; }
  const b = W.nearestToBoarding(kermisWheel().rot);
  if (!b.ok) { w.addMessage('Even wachten: de volgende gondel komt zo', 2); return true; }
  start(w, b.index);
  return true;
}

function start(w, index) {
  // Geluid bij het instappen: het staal van de gondel, en de bel van de kermisbaas.
  // Zonder dit was een rit in het reuzenrad van begin tot eind stil.
  pushAudioEvent(w, { kind: 'fx', name: 'bridge_clunk', x: LOAD.x, y: LOAD.y, gain: 0.35 });
  pushAudioEvent(w, { kind: 'bell', x: LOAD.x, y: LOAD.y });
  const rot = kermisWheel().rot;
  w.money -= W.PRICE;
  ride = { plan: W.ridePlan(rot, index), look: { yaw: Math.PI / 2, pitch: -0.12 }, aim: null, seat: null, exitReq: false, t: 0 };
  w.cinematicHidePlayers = true;
  document.body.classList.add('kermis-on');
  w.addMessage(`${NAME}: veel plezier!`, 2.2);
  toonStartkaart(w, 'hoogvlieger');
  recordStat(w, 'reuzenradRides');
}

function end(w, { quit = false } = {}) {
  pushAudioEvent(w, { kind: 'fx', name: 'bridge_clunk', x: LOAD.x, y: LOAD.y, gain: 0.3 });
  if (!ride) return;
  ride = null;
  w.cinematicHidePlayers = false;
  w.cameraOverride = null;
  document.body.classList.remove('kermis-on');
  simHudTik(0, null);
  const p = hoofdspeler(w);
  p.x = LOAD.x; p.y = LOAD.y; p.z = 0; p.angle = kermisFrame.rot + Math.PI / 2;
  p.speed = 0; p.moving = false;
  if (!quit) showCard(w, { kind: 'tip', title: NAME, body: 'Uitgestapt. Wat een uitzicht!' });
  else w.addMessage(`${NAME}: uitgestapt`, 2.2);
}

function update(dt, w) {
  const g = ride;
  if (!g) return;
  const wheel = kermisWheel();
  if (w.pendingRespawn || !wheel || !kermisOn(w)) { end(w, { quit: true }); return; }
  const input = w.input;
  g.t += dt;
  g.dt = dt; // de camera rekent per seconde (#436)
  // vrij rondkijken: muis (als die vast zit) en pijltjes
  const k = LOOK_PER_PX * getSettings().mouseSensitivity;
  const key = (a, b) => (input.isDown(a) ? 1 : 0) - (input.isDown(b) ? 1 : 0);
  g.look = W.lookStep(g.look, input.mouse.dx * k + key('arrowright', 'arrowleft') * LOOK_KEYS * dt, -input.mouse.dy * k + key('arrowup', 'arrowdown') * LOOK_KEYS * dt);
  if (input.wasPressed('backspace') || input.wasPressed('e') || input.wasPressed('f')) {
    input.consume('backspace'); input.consume('e'); input.consume('f');
    g.exitReq = true;
  }
  if ((g.exitReq || W.rideDone(g.plan, wheel.rot)) && W.mayExit(g.plan, wheel.rot)) { end(w); return; }
  const s = W.seatPose(g.plan.index, wheel.rot);
  const p = hoofdspeler(w), m = toW(s.u, s.v);
  p.x = m.x; p.y = m.y; p.z = 0; p.angle = kermisFrame.rot + g.look.yaw; p.speed = 0; p.moving = false;
  g.seat = s;
}

function camera(w) {
  const g = ride;
  if (!g || !g.seat) return;
  const s = g.seat, d = W.lookDir(g.look);
  const pos = toW(s.u, s.v + W.CAM_OUT);
  const far = toW(s.u + d.u * 12, s.v + W.CAM_OUT + d.v * 12);
  const at = { x: far.x, y: far.y, z: s.h + EYE + d.h * 12 };
  // het mikpunt loopt rustig achter de muis aan, per seconde (#436)
  const f = easeStep(0.2, g.dt);
  g.aim = g.aim ? { x: g.aim.x + (at.x - g.aim.x) * f, y: g.aim.y + (at.y - g.aim.y) * f, z: g.aim.z + (at.z - g.aim.z) * f } : at;
  w.cameraOverride = { position: { x: pos.x, y: pos.y, z: s.h + EYE }, lookAt: { ...g.aim }, fov: 70, cut: true };
}

// --- de kaart en Activiteiten (#436) -------------------------------------------------------

// Het rad op de kaart en de minimap, in dezelfde stijl als de andere attracties: een schijf in
// de eigen kleur met een glyph. De bovenrand van het rad, de A-poten en je eigen gondel.
function drawIcon(ctx, s) {
  iconDisc(ctx, s, ACCENT);
  ctx.save();
  ctx.scale(s, s);
  ctx.strokeStyle = '#f2ede0';
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.arc(0, -1.6, 1.7, Math.PI, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -3.3); ctx.lineTo(-1.9, -0.2); ctx.moveTo(0, -3.3); ctx.lineTo(1.9, -0.2); ctx.moveTo(0, -3.3); ctx.lineTo(0, 0.2); ctx.stroke();
  ctx.fillStyle = '#f2ede0';
  ctx.beginPath(); ctx.moveTo(-1.6, 0.2); ctx.lineTo(1.6, 0.2); ctx.lineTo(1.2, 2.6); ctx.lineTo(-1.2, 2.6); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// Het item onder Activiteiten. Het reuzenrad staat nog niet in de catalogus van todo.js (#436),
// dus de attractie levert de regel zelf; activities.js geeft hem aan todoui.js door.
// #679: het reuzenrad krijgt een meetbaar doel (vijf ritjes) en een aankondiging van de avonduren;
// de teller komt uit de bestaande statistiek per speler.
const TODO = (world) => {
  const ritten = getStat('reuzenradRides') || 0;
  return {
  key: 'mg:hoogvlieger',
  group: 'minigames',
  icon: 'act-hoogvlieger',
  title: 'Reuzenrad',
  meta: `Grote Markt · €${W.PRICE} per ritje · vanavond 19:00-01:00`,
  kicker: 'Attractie · Grote Markt',
  text: `Kermisbaas Jan laat je ${W.LAPS} rondes meedraaien in het reuzenrad ${NAME}. Loop naar de instap en druk E als er een gondel onderaan hangt; met de muis of de pijltjes kijk je rond en met Backspace stap je weer uit.`,
  rows: [['Prijs', `€${W.PRICE} per ritje`], ['Wanneer', "elke avond 19:00-01:00, en de hele dag als de kermis op de markt staat"], ['Doel', `${ritten} van 5 ritjes · haal de titel`]],
  open,
  };
};

// --- HUD (#985): de gedeelde strook van de light sims in plaats van het bord, plus een gele lichtkolom bij de instap -----------

// Het model is puur (reuzenradstatus.js); hier alleen de stand van het ritje inlezen.
function updateHud(w) {
  const wheel = kermisWheel();
  // de lichtkolom bij de instap: alleen als het rad open is, je dichtbij staat en je niet meerijdt
  const p = w && hoofdspeler(w);
  const toon = !ride && !!w && open(w) && Math.hypot(p.x - LOAD.x, p.y - LOAD.y) < 70 && !p.inVehicle;
  if (toon && !kolom) { kolom = maakSimKolom('reuzenradkolom'); getScene().add(kolom); }
  if (kolom) zetSimKolom(kolom, toon ? LOAD : null, 0, (w && w.time) || 0, false);
  if (!ride || !wheel) { simHudTik(0, null); return; }
  const hoogte = ride.seat ? ride.seat.h : 0, maxH = W.AX + W.R - W.SEAT_DROP;
  const f = W.rideFraction(ride.plan, wheel.rot);
  const stijgt = Math.cos(W.gondolaAngle(ride.plan.index, wheel.rot)) > 0;
  const model = { hoogte, maxHoogte: maxH, stijgt, voortgang: f, links: W.rideSecondsLeft(ride.plan, wheel.rot), ronde: Math.floor(f * W.LAPS) + 1, uitstap: ride.exitReq, mag: W.mayExit(ride.plan, wheel.rot), uitleg: !uitlegGezien(UITLEG_ID) };
  const op = stapVan(model) === 'top';
  if (op && !ride.opTop) { const pp = topPop(hoogte, model.ronde); simHudPop(pp.tekst, pp.geluid); zetUitlegGezien(UITLEG_ID); }
  ride.opTop = op;
  simHudTik(0, reuzenradHudModel(model));
}

export const HOOGVLIEGER = {
  id: 'hoogvlieger',
  layer: 'hoogvlieger',
  legend: { kind: 'act-hoogvlieger', label: 'Reuzenrad', note: "het reuzenrad Hoogvlieger op de kermis aan de Grote Markt, 's avonds" },
  todo: TODO,
  init(w) {
    window.__hoogvlieger = {
      state: () => (ride ? { index: ride.plan.index, fraction: kermisWheel() ? W.rideFraction(ride.plan, kermisWheel().rot) : null, look: { ...ride.look }, exitReq: ride.exitReq } : null),
      spot: () => ({ ...LOAD }),
      board: () => { const wh = kermisWheel(); if (!wh || ride) return false; const b = W.nearestToBoarding(wh.rot); if (!b.ok) return false; start(w, b.index); return true; },
      quit: () => { if (!ride) return false; end(w, { quit: true }); return true; },
    };
  },
  spots: () => [{ id: 'hoogvlieger', name: NAME, x: LOAD.x, y: LOAD.y }],
  prompt,
  secondary,
  interact,
  active: () => !!ride,
  quit: (w) => end(w, { quit: true }),
  update,
  tick(dt, w) { updateHud(w); },
  camera,
  icon: drawIcon,
  mapSub: (s, w) => (kermisOn(w) ? 'Kermis op de Grote Markt: het rad draait' : "Het reuzenrad van kermisbaas Jan, 's avonds op de kermis"),
};

