import { kermisOn, kermisWheel, kermisFrame } from './kermis.js';
import { activityBlock } from './activitykit.js';
import { showCard } from './hudcards.js';
import { recordStat } from './achievements.js';
import { getSettings } from './settings.js';
import * as W from './reuzenradrules.js';

// Hoogvlieger, het reuzenrad van kermisbaas Jan: loop naar de instap, druk E als
// er een gondel onderaan hangt (€2), en je zit twee rondes mee. Je volgt de pose
// van de gondel (kermis.js draait het rad, de regels staan in reuzenradrules.js),
// de camera hangt rustig in de gondel en je kijkt vrij rond met de muis of de
// pijltjes. BACKSPACE of E: uitstappen zodra je weer onderaan hangt. Doet mee aan
// het activiteitencontract (activities.js / busy.js). `window.__hoogvlieger` debug.
const ACCENT = '#e0457a';
const LOOK_PER_PX = 0.0025;
const LOOK_KEYS = 1.3; // rad/s met de pijltjes
const EYE = 1.0; // oog boven de zitting
const NAME = 'Hoogvlieger';

let ride = null;
let hud = null;

const { toW, toL } = kermisFrame;
const LOAD = toW(W.LOAD_AT.u, W.LOAD_AT.v);

function nearLoading(w) {
  const p = w.player;
  if (p.inVehicle || p.swimming || w.pigeonMode || w.heliRun) return false;
  const l = toL(p.x, p.y);
  return W.nearLoading(l.u, l.v);
}

const open = (w) => kermisOn(w) && !!kermisWheel();

function blockReason(w) {
  return activityBlock(w) || (w.money < W.PRICE ? `Te weinig geld: een ritje kost €${W.PRICE}` : null);
}

function prompt(w) {
  if (ride || !open(w) || !nearLoading(w)) return null;
  const why = blockReason(w);
  const wait = W.secondsToNextGondola(kermisWheel().rot);
  const sub = why || (wait > 0 ? `€${W.PRICE} · de volgende gondel komt zo` : `€${W.PRICE} · ${W.LAPS} rondes met uitzicht over de stad`);
  return { id: 'hoogvlieger', x: LOAD.x, y: LOAD.y, h: 2.2, key: 'E', label: NAME, sub, ring: true, dim: !!why };
}

function secondary(w) {
  if (ride || !open(w) || w.player.inVehicle) return [];
  if (Math.hypot(w.player.x - LOAD.x, w.player.y - LOAD.y) > 60) return [];
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
  const rot = kermisWheel().rot;
  w.money -= W.PRICE;
  ride = { plan: W.ridePlan(rot, index), look: { yaw: Math.PI / 2, pitch: -0.12 }, aim: null, seat: null, exitReq: false, t: 0 };
  w.cinematicHidePlayers = true;
  document.body.classList.add('kermis-on');
  w.addMessage(`${NAME}: veel plezier!`, 2.2);
  recordStat(w, 'reuzenradRides');
}

function end(w, { quit = false } = {}) {
  if (!ride) return;
  ride = null;
  w.cinematicHidePlayers = false;
  w.cameraOverride = null;
  document.body.classList.remove('kermis-on');
  if (hud) hud.root.hidden = true;
  const p = w.player;
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
  const p = w.player, m = toW(s.u, s.v);
  p.x = m.x; p.y = m.y; p.z = 0; p.angle = kermisFrame.rot + g.look.yaw; p.speed = 0; p.moving = false;
  g.seat = s;
}

function camera(w) {
  const g = ride;
  if (!g || !g.seat) return;
  const s = g.seat, d = W.lookDir(g.look);
  const pos = toW(s.u, s.v);
  const far = toW(s.u + d.u * 12, s.v + d.v * 12);
  const at = { x: far.x, y: far.y, z: s.h + EYE + d.h * 12 };
  // het mikpunt loopt rustig achter de muis aan
  g.aim = g.aim ? { x: g.aim.x + (at.x - g.aim.x) * 0.2, y: g.aim.y + (at.y - g.aim.y) * 0.2, z: g.aim.z + (at.z - g.aim.z) * 0.2 } : at;
  w.cameraOverride = { position: { x: pos.x, y: pos.y, z: s.h + EYE }, lookAt: { ...g.aim }, fov: 70, cut: true };
}

// --- HUD: dezelfde kaart als het botsautobord (kermis.js) ---------------------------------

const CSS = `
#hud .rad-board[hidden] { display: none; }
#hud .rad-board { position: absolute; top: 14px; left: 50%; transform: translateX(-50%); min-width: 300px; padding: 8px 18px 9px 12px; color: #f0ede4; text-shadow: var(--hud-shadow); pointer-events: none; z-index: 4;
  background: linear-gradient(90deg, rgba(12,20,14,0.9), rgba(60,20,40,0.66) 80%, rgba(60,20,40,0.2)); border-left: 3px solid ${ACCENT}; }
#hud .rad-board small { display: block; font-size: 12px; letter-spacing: 3px; color: ${ACCENT}; }
#hud .rad-board .rb-row { display: flex; gap: 16px; align-items: baseline; font-size: 20px; letter-spacing: 1px; }
#hud .rad-board .rb-row b { font-weight: normal; color: #ffd23f; font-size: 24px; }
#hud .rad-board .rb-help { display: flex; flex-wrap: wrap; align-items: center; gap: 3px; font: 13px 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.78); }
#hud .rad-board .hud-key { margin: 0 2px; vertical-align: middle; }
@media (max-width: 480px) { #hud .rad-board { top: 64px; min-width: 0; } }
`;

function ensureHud() {
  if (hud) return hud;
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
  const root = document.createElement('div');
  root.className = 'rad-board';
  root.hidden = true;
  root.innerHTML = `<small>${NAME.toUpperCase()}</small><div class="rb-row"></div><div class="rb-help"></div>`;
  (document.getElementById('hud') || document.body).appendChild(root);
  hud = { root, row: root.querySelector('.rb-row'), help: root.querySelector('.rb-help'), key: '' };
  return hud;
}

function updateHud() {
  if (!ride) { if (hud) hud.root.hidden = true; return; }
  const h = ensureHud();
  const wheel = kermisWheel();
  const k = (t) => `<span class="hud-key">${t}</span>`;
  const left = wheel ? Math.ceil(W.rideSecondsLeft(ride.plan, wheel.rot)) : 0;
  const hoogte = ride.seat ? Math.max(0, Math.round(ride.seat.h)) : 0;
  const row = `<span>Hoogte <b>${hoogte} m</b></span><span>Nog <b>${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</b></span>`;
  const help = ride.exitReq ? 'Je stapt uit zodra je beneden bent...' : `Rondkijken met de muis of ${k('←')}${k('→')}${k('↑')}${k('↓')} · ${k('BACKSPACE')} uitstappen`;
  const key = row + '|' + help;
  h.root.hidden = false;
  if (key === h.key) return;
  h.key = key;
  h.row.innerHTML = row;
  h.help.innerHTML = help;
}

export const HOOGVLIEGER = {
  id: 'hoogvlieger',
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
  tick() { updateHud(); },
  camera,
};
