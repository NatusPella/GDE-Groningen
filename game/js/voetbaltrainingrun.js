import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { createBoard, key, easeCamera, stopPressed } from './minigamekit.js';
import { sfxEvent } from './sfx/haken.js';
import { hoofdspeler } from './players.js';
import * as C from './voetbalcarriere.js';
import * as V from './voetbalcarrierelive.js';
import * as O from './voetbalontwikkeling.js';
import { registerTrainer } from './voetbalcarriereui.js';
import { stopBericht, drillFor, newDrill, stepDrill, drillScore, drillStatus, sfxFor, medalOf } from './voetbaltraining.js';
import { buildDrillProps } from './voetbaltraining3d.js';
import { kitOn, kitOff } from './footballkitlive.js';

// De uitvoering van de trainingsminigames (#1109): een korte oefening op het trainingsveld van je club, met de props uit voetbaltraining3d.js en de regels uit voetbaltraining.js.
// Beeld 24-11: de oefening lag "op het gras naast je", ook als je op straat of in huis stond: hoepels door de gevel, de speler in de woonkamer. Nu gaat de speler naar het
// trainingsveld van zijn club (of het hoofdveld; zoals de wedstrijd hem naar het park zet) en loopt de oefening langs de lengteas van dat veld. Alleen zonder bekend veld nog naast je.
// Hij leeft als "extra activiteit" in activities.js (de speler staat stil terwijl de oefening loopt) maar staat niet in de lijst met spelplekken: je start hem in het kindscherm
// Voetbal > Training. Samen spelen: lokaal en per speler (een gast krijgt de snelle training zonder oefening); de beloning is alleen groei van je eigen speler, nooit verlies.
// Bediening: A D (W S) of de pijltjes of de linkerstick, SPATIE of de A-knop van de controller, Esc of B stopt zonder beloning. `window.__voetbaltraining` debug.
let game = null;
let board = null;
let props = null;
const INTRO_S = 2.2, RESULT_S = 3.4;

const TITEL = 'TRAINING VOETBAL';                          // een neutrale balk: geen eigen sfeer, want de training is geen spelplek (zie EXTRA in activities.js)
const ensureBoard = () => board || (board = createBoard(TITEL, '#2f9e5b'));
const heldKeys = (input) => {
  const dn = (...k) => k.some((x) => input.isDown(x));
  return { ax: (dn('d', 'arrowright') ? 1 : 0) - (dn('a', 'arrowleft') ? 1 : 0), ay: (dn('w', 'arrowup') ? 1 : 0) - (dn('s', 'arrowdown') ? 1 : 0), act: dn(' ') };
};
const toWorld = (g, x, z) => { const c = Math.cos(g.heading), s = Math.sin(g.heading); return { x: g.origin.x + c * x - s * z, y: g.origin.y + s * x + c * z }; };

// Het veld van de oefening: het eerste trainingsveld van de club, anders zijn hoofdveld; de oefening loopt langs de lengteas (r, zoals pitchPlacement in voetbalparken.js).
// Null bij de terugval zonder parkdata (die plekken liggen niet op de kaart): dan naast de speler.
export function trainingField(c, getClub = V.getClub, echteKaart = V.getIndex().plaatsen.length > 8) {
  const club = echteKaart && c && c.club ? getClub(c.club) : null;
  if (!club || !club.placeId) return null;
  const v = (club.trainingsvelden && club.trainingsvelden[0]) || club.park;
  return v && Number.isFinite(v.x) && Number.isFinite(v.y) ? { x: v.x, y: v.y, heading: (Number.isFinite(v.r) ? v.r : 0) - Math.PI / 2 } : null;
}
const groundAt = (w, x, y) => { try { const r = w.map.surfaceAt(x, y, { z: 0, ribbon: null }); return r && Number.isFinite(r.z) ? r.z : null; } catch (e) { return null; } };

function launchExercise(w, focus) {
  if (game || !w) return false;
  const c = V.getCareer();
  const drill = drillFor(focus);
  const p = hoofdspeler(w);
  if (!C.hasCareer(c) || !drill) return false;
  if (!O.canTrain(c, c.day - c.seasonStart)) { if (w.addMessage) w.addMessage(c.injury ? c.injury.text : 'Vandaag al getraind of gespeeld', 3); return false; }
  if (w.coopRole === 'client' || p.inVehicle || p.swimming) { V.trainNow(w, focus, 0.8); return true; }   // een gast traint lokaal zonder oefening
  const veld = trainingField(c);
  if (veld) { p.x = veld.x; p.y = veld.y; p.vx = p.vy = 0; }
  const heading = veld ? veld.heading : (Number.isFinite(p.angle) ? p.angle : 0) - Math.PI / 2;
  const grond = veld ? groundAt(w, veld.x, veld.y) : null;
  const seed = (c.day | 0) * 31 + (c.seasonNr | 0);
  const state = newDrill(drill.id, seed);
  game = { w, drill, state, focus, phase: 'intro', t: INTRO_S, heading, origin: { x: p.x, y: p.y }, ground: Number.isFinite(grond) ? grond : Number.isFinite(p.z) ? p.z : 0, cam: null, dt: 1 / 60, prevAct: false, flash: drill.kort, bad: false, score: null, input: { ax: 0, ay: 0, act: false, press: false, rel: false } };
  kitOn(w, { mode: 'training' });   // trainingsshirt met hesje (voetbalkleding 22-11); end() geeft de eigen kleren terug
  props = buildDrillProps(THREE, state, game.origin, heading, game.ground);
  try { getScene().add(props.group); } catch (e) { /* zonder scène geen props: de oefening loopt gewoon */ }
  ensureBoard().show();
  return true;
}

function end(w, { quit = false } = {}) {
  const g = game;
  if (!g) return;
  game = null;
  w.cameraOverride = null;
  w.companionHold = null;
  const p = hoofdspeler(w);
  if (p) { p.moving = false; p.speed = 0; }
  if (board) board.hide();
  kitOff();
  if (props) { try { getScene().remove(props.group); } catch (e) { /* scène al weg */ } props.dispose(); props = null; }
  { const b = quit ? stopBericht(g.phase) : null; if (b && w.addMessage) w.addMessage(b, 2.5); }
}

function runStep(g, w, dt) {
  const raw = heldKeys(w.input);
  const inp = { ax: raw.ax, ay: raw.ay, act: raw.act, press: raw.act && !g.prevAct, rel: !raw.act && g.prevAct };
  g.prevAct = raw.act;
  const ev = stepDrill(g.state, inp, dt);
  const p = hoofdspeler(w);
  const s = g.state;
  // de speler volgt zijn plek op het veld (bij schot en pass blijft hij bij de bal)
  const fx = s.p ? s.p.x : s.ball ? s.ball.x : 0, fz = s.p ? s.p.z : s.ball ? s.ball.z : 0;
  const q = toWorld(g, fx, fz);
  if (p && Number.isFinite(q.x) && Number.isFinite(q.y)) {
    const moved = Math.hypot(q.x - p.x, q.y - p.y);
    if (moved > 0.01) p.angle = Math.atan2(q.y - p.y, q.x - p.x);
    p.x = q.x; p.y = q.y; p.moving = !!s.p; p.speed = s.p ? 4 : 0;
  }
  for (const e of ev) {
    const k = sfxFor(e);
    if (k) sfxEvent(w, k, q.x, q.y);
    if (e === 'cone' || e === 'wrongside') { g.flash = e === 'cone' ? 'Kegel geraakt: +1,5 s' : 'Verkeerde kant: +1,5 s'; g.bad = true; }
    else if (e === 'net' || e === 'point' || e === 'pass') { g.flash = e === 'net' ? 'Raak!' : ''; g.bad = false; }
    else if (e === 'miss') { g.flash = 'Mis'; g.bad = true; }
    else if (e === 'puffed') { g.flash = 'Buiten adem: rustig lopen'; g.bad = true; }
    else if (e === 'through') { g.flash = 'Doorgebroken'; g.bad = true; }
  }
  if (props) props.update(s);
  if (s.done) { g.phase = 'result'; g.t = RESULT_S; g.score = drillScore(s); finish(g, w); }
}
function finish(g, w) {
  const r = V.trainNow(w, g.focus, g.score);
  const m = medalOf(g.score);
  g.flash = `${g.drill.naam}: score ${String(g.score).replace('.', ',')}${m ? ' · ' + m : ''}${r && r.ok ? '' : ' (geen winst)'}`;
  g.bad = false;
}

function hud(g) {
  const s = g.state;
  const help = g.drill.keys.reduce((a, x, i, arr) => (Array.isArray(x) ? a + x.map((k) => key(k)).join('') + ' ' : a + x + (i < arr.length - 1 ? ' · ' : '')), '') + ` · ${key('ESC')} stoppen`;
  const meter = s.id === 'conditie' ? { v: s.stamina, color: s.blown ? 'var(--ds-c-rood, #c8432b)' : '', text: `${Math.round(s.stamina * 100)}%` } : s.charge != null ? { v: s.charge, mark: s.id === 'schot' ? 0.8 : null, text: `${Math.round(s.charge * 100)}%` } : null;
  ensureBoard().set({ row: `<span>${g.drill.naam}</span><span>${g.phase === 'result' ? 'Klaar' : drillStatus(s)}</span>`, meter, flash: g.flash, bad: g.bad, help });
}

function camera(w) {
  const g = game;
  if (!g) return;
  const s = g.state;
  const fx = s.p ? s.p.x : s.ball ? s.ball.x : 0, fz = s.p ? s.p.z : s.ball ? s.ball.z : 0;
  const a = toWorld(g, fx * 0.5, fz - 10), b = toWorld(g, fx * 0.6, fz + 9);
  g.dt = 1 / 60;
  const c = easeCamera(g, { x: a.x, y: a.y, z: g.ground + 5.2 }, { x: b.x, y: b.y, z: g.ground + 0.6 }, 0.1);
  w.cameraOverride = { position: c.position, lookAt: c.lookAt, fov: 58, cut: true };
}

export const TRAINING_ACT = {
  id: 'voetbaltraining',
  active: () => !!game,
  quit: (w) => end(w, { quit: true }),
  camera,
  spots: () => [],
  update(dt, w) {
    const g = game;
    if (!g) return;
    if (w.pendingRespawn) { end(w, { quit: true }); return; }
    g.dt = dt;
    if (w.input && stopPressed(w.input)) { end(w, { quit: true }); return; }
    if (g.phase === 'intro') { g.t -= dt; if (g.t <= 0) { g.phase = 'run'; g.flash = ''; } }
    else if (g.phase === 'run') runStep(g, w, dt);
    else if (g.phase === 'result') { g.t -= dt; if (g.t <= 0) { end(w); return; } }
    hud(g);
  },
  tick() {},
};
registerTrainer((w, focus) => launchExercise(w, focus));

if (typeof window !== 'undefined') {
  window.__voetbaltraining = {
    state: () => (game ? { phase: game.phase, drill: game.state.id, perf: game.state.perf, done: game.state.done, props: props ? props.stats() : null } : null),
    start: (w, focus = 'shot') => launchExercise(w, focus),
    quit: (w) => end(w, { quit: true }),
  };
}
