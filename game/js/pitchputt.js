import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { buildPersonMesh, animatePersonWalk } from './models3d_people.js';
import { showBanner } from './cinematics.js';
import { unlockAchievement, recordChallengeResult, getChallengeRecord, recordStat, MEDALS } from './achievements.js';
import { showCard } from './hudcards.js';
import { activityBlock, iconDisc } from './activitykit.js';
import { loopbaanVerdien } from './loopbaanlive.js';
import { createBoard, mgThema, key, bubble, clearBubbles, pick, stopPressed, easeCamera, clamp, makeRng } from './minigamekit.js';
import { PUTT_LINES } from './minigamelines.js';
import { WOLFIE, SIR, newEtiquette, beginHole as etqBegin, step as etqStep, holeDone as etqHoleDone, misser as etqMisser, einde as etqEinde, hallo as etqHallo, plan as etqPlan, aanDeBeurt as etqBeurt } from './golfetiquette.js';
import { loadEchtePlekken, golfVenues, nearestOf } from './echteplekken.js';
import { registreerWedstrijd, zetWedGastHaken, wedNodigUit, wedNuStarten, wedHostScore, wedGastScore, wedScoreStop, wedGastVerlaat, wedGastReset, wedScoreRijen } from './coopwedstrijd.js';
import { pushAudioEvent } from './pedgeom.js';
import { SAMPLE } from './golfphysics.js';
import { golfRij, krachtTekst, scoreTabel, scoreCel, ensureGolfCss } from './golfhud.js';
import { nieuweBeurt, beginBaan, slaan, volgendeBaan, spelerStand, spelerIds, spelerNaam, spelerAantal, uitslag, MAX_SPELERS } from './golfbeurt.js';
import {
  ppHoles, holesFromWorld, venueLayout, slopeAt, onGreen, inBunker, pitch, putt, straightPower, powerForCarry, finishHole, newCard, cardTotals, courseMedal, holeName, relText,
  GREEN_R, CUP_R, MAX_OVER_PAR, PITCH_MAX,
} from './puttinglogic.js';

// Pitch & putt on the real courses of the province (#174; at the Concourslaan without that data): six short holes laid out on the open
// ground inside the Concours oval at the Stadspark (no pitch & putt course is
// mapped in Groningen, so this is the nearest big meadow). From the tee you pitch
// to the green, there you putt. A/D aim (Shift: fine), hold Space to charge
// and let go: the white tick on the meter is the power for a straight shot to
// the pin. The greens slope: the arrows show where the ball runs to, so aim
// above the cup and let it come back. Bunkers (sand) double the scatter of the next
// pitch. A hole ends in the cup or after par + 4 strokes. Medals from the
// total against par, record in strokes against par (lower is better).
// Money-neutral. `window.__pitchputt` debug.
const ACCENT = mgThema('pitchputt').accent; // één bron voor het HUD-thema: minigamekit.js (#453)
const USE_RADIUS = 2.8;
const DETAIL_M = 520;
// The course in use: the Concours oval (the fallback) until game/echteplekken.json has real
// golf courses (#174); then the nearest of those, six holes laid out on the real course.
let HOLES, CENTER, FIRST, STAND;
function layout(holes) {
  HOLES = holes;
  ({ center: CENTER, stand: STAND } = venueLayout(holes));
  FIRST = HOLES[0];
}
const CONCOURS = ppHoles();
layout(CONCOURS);
let venues = [{ id: 'concours', name: 'Pitch & putt', plaats: 'de Concourslaan', holes: CONCOURS }];
for (const v of venues) { layout(v.holes); v.stand = STAND; v.center = CENTER; v.x = STAND.x; v.y = STAND.y; }
let venue = venues[0];

function setVenues(list) {
  if (game) return;
  // the venues carry raw { tee, cup, slope, bunkers } holes (echteplekken.js): without holesFromWorld they have no heading and the stand is NaN (#229)
  venues = list.map((v) => { layout(holesFromWorld(v.holes)); return { ...v, holes: HOLES, stand: STAND, center: CENTER, x: STAND.x, y: STAND.y }; });
  venue = null;
}

// The venue the player is at (the nearest); a new one drops the old course meshes.
function zetVenue(item) {
  if (!item || item === venue) return;
  venue = item;
  layout(venue.holes);
  if (built) {
    getScene().remove(built.root, built.ball, built.line, built.ring, built.keeper, built.sir, built.wolfie);
    built = null;
  }
}
// a guest asked for a round at this venue (#452): it holds while that round is set up (extra() below clears it), at most a minute
let gastVenue = null;
function focus(w) {
  if (game) return;
  if (gastVenue && Date.now() - gastVenue.t < 60000) { zetVenue(gastVenue.item); return; }
  gastVenue = null;
  const n = nearestOf(venues, w.player.x, w.player.y);
  if (n) zetVenue(n.item);
}
// de bal is een derde van de put (CUP_R * 1,4 = 15 cm straal): groter dan een echte bal voor het oog, maar hij past duidelijk in het hol (#436)
const BALL_R = 0.05;
const CHARGE_PITCH = 1.5, CHARGE_PUTT = 1.7;
const PREVIEW_PTS = 96;

let game = null;
let built = null;
let board = null;
let lodT = 0;
let runs = 0;
let aimLine = null;

const keeperLook = { shirt: 0x5a8a3a, skin: 0xe2b48c, variant: 'male', seed: 8810, look: { age: 'old', hat: null, bag: null, umbrella: null } };
// the two made-up figures of the golf etiquette (#394, golfetiquette.js): Wolfie, the course hand in a cap and shorts, and Sir Cedric in his tweed
const wolfieLook = { shirt: 0xc9d8a8, skin: 0xe8c39e, variant: 'male', seed: 8821, look: { age: 'adult', build: 'heavy', hat: 'cap', hatColor: 0xd8c070, top: 'sweater', bottom: 'shorts', shoeType: 'sneaker', bag: null, umbrella: null, glasses: false } };
const sirLook = { shirt: 0x3a4a6a, skin: 0xf0d2b4, variant: 'male', seed: 8832, look: { age: 'adult', build: 'slim', hat: 'flatcap', hatColor: 0x7a7a52, top: 'blazer', bottom: 'trousers', shoeType: 'boot', bag: null, umbrella: null, glasses: false } };

// --- meshes --------------------------------------------------------------------------------------

let mats = null;
function materials() {
  if (mats) return mats;
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...o });
  const stripes = document.createElement('canvas');
  stripes.width = 128; stripes.height = 128;
  const sg = stripes.getContext('2d');
  for (let i = 0; i < 8; i++) { sg.fillStyle = i % 2 ? '#79c26a' : '#6bb85d'; sg.fillRect(0, i * 16, 128, 16); }
  const tex = new THREE.CanvasTexture(stripes);
  tex.colorSpace = THREE.SRGBColorSpace;
  mats = {
    green: new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }), sand: std(0xe0cc92), cup: new THREE.MeshBasicMaterial({ color: 0x0a0a0a }),
    pole: std(0xe8e4d8, { metalness: 0.2 }), flag: new THREE.MeshBasicMaterial({ color: 0xe0452e, side: THREE.DoubleSide }), mat: std(0x2a6a3a),
    ball: std(0xffffff, { roughness: 0.3 }), arrow: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide }),
    water: new THREE.MeshStandardMaterial({ color: 0x2f7f86, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.92 }),
    line: new THREE.LineBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.9 }),
    ring: new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.85, depthWrite: false }),
  };
  return mats;
}

function mesh(geo, mat, x, y, z, parent) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function arrowGeometry() {
  const s = new THREE.Shape();
  s.moveTo(1, 0); s.lineTo(0.3, 0.5); s.lineTo(0.3, 0.18); s.lineTo(-1, 0.18); s.lineTo(-1, -0.18); s.lineTo(0.3, -0.18); s.lineTo(0.3, -0.5); s.closePath();
  const g = new THREE.ShapeGeometry(s);
  g.rotateX(-Math.PI / 2);
  return g;
}

function buildCourse(w) {
  const M = materials();
  const root = new THREE.Group();
  const geoArrow = arrowGeometry();
  const holes = HOLES.map((h) => {
    const g = new THREE.Group();
    const green = mesh(new THREE.CylinderGeometry(GREEN_R, GREEN_R, 0.06, 28), M.green, h.cup.x, 0.03, h.cup.y, g);
    green.castShadow = false;
    for (const b of h.bunkers) { const sb = mesh(new THREE.CylinderGeometry(b.r, b.r, 0.07, 18), M.sand, b.x, 0.035, b.y, g); sb.castShadow = false; }
    for (const b of h.water || []) { const wm = mesh(new THREE.CylinderGeometry(b.r, b.r, 0.07, 22), M.water, b.x, 0.036, b.y, g); wm.castShadow = false; }
    const cup = new THREE.Mesh(new THREE.CircleGeometry(CUP_R * 1.4, 12).rotateX(-Math.PI / 2), M.cup);
    cup.position.set(h.cup.x, 0.075, h.cup.y);
    g.add(cup);
    mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.4, 6), M.pole, h.cup.x, 1.2, h.cup.y, g);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.42), M.flag);
    flag.position.set(h.cup.x + 0.35, 2.15, h.cup.y);
    g.add(flag);
    const tee = mesh(new THREE.BoxGeometry(1.6, 0.04, 1.2), M.mat, h.tee.x, 0.03, h.tee.y, g);
    tee.rotation.y = -h.heading;
    tee.castShadow = false;
    // the slope arrows on the green
    const pts = [];
    for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) {
      const x = h.cup.x + dx * 3.4, y = h.cup.y + dy * 3.4;
      if (Math.hypot(x - h.cup.x, y - h.cup.y) < GREEN_R - 1.2 && Math.hypot(dx, dy) > 0.1) pts.push([x, y]);
    }
    const arrows = new THREE.InstancedMesh(geoArrow, M.arrow, pts.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
    pts.forEach(([x, y], i) => {
      const sl = slopeAt(h, x, y);
      const mag = Math.hypot(sl.x, sl.y);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.atan2(sl.y, sl.x));
      const len = clamp(mag / 0.03, 0.5, 1.5) * 0.9;
      sc.set(len, 1, len);
      pos.set(x, 0.09, y);
      m4.compose(pos, q, sc);
      arrows.setMatrixAt(i, m4);
    });
    arrows.instanceMatrix.needsUpdate = true;
    arrows.visible = false;
    g.add(arrows);
    root.add(g);
    return { group: g, arrows };
  });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 10, 8), M.ball);
  ball.castShadow = true;
  ball.visible = false;
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PREVIEW_PTS * 3), 3));
  lineGeo.setDrawRange(0, 2);
  const line = new THREE.Line(lineGeo, M.line);
  line.frustumCulled = false;
  line.visible = false;
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.75, 20).rotateX(-Math.PI / 2), M.ring);
  ring.visible = false;
  const keeper = buildPersonMesh(keeperLook.shirt, keeperLook.skin, keeperLook);
  keeper.visible = false;
  const wolfie = buildPersonMesh(wolfieLook.shirt, wolfieLook.skin, wolfieLook);
  const sir = buildPersonMesh(sirLook.shirt, sirLook.skin, sirLook);
  wolfie.visible = false;
  sir.visible = false;
  getScene().add(root, ball, line, ring, keeper, sir, wolfie);
  return { root, holes, ball, line, ring, keeper, sir, wolfie };
}

function updateLod(w) {
  focus(w);
  const d = Math.hypot(w.player.x - CENTER.x, w.player.y - CENTER.y);
  if (!built && d < DETAIL_M) built = buildCourse(w);
  if (!built) return;
  built.root.visible = d < DETAIL_M + 80 || !!game;
}

// --- map icon -------------------------------------------------------------------------------------

function drawIcon(ctx, s) {
  iconDisc(ctx, s, ACCENT);
  ctx.save();
  ctx.scale(s, s);
  ctx.fillStyle = '#f2ede0';
  ctx.strokeStyle = '#f2ede0';
  ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(-0.6, 2.4); ctx.lineTo(-0.6, -2.6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-0.6, -2.6); ctx.lineTo(2.4, -1.5); ctx.lineTo(-0.6, -0.4); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(1.4, 2.2, 0.8, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// --- prompt and start ------------------------------------------------------------------------------

function nearStand(w) {
  focus(w);
  const p = w.player;
  if (game || w.pigeonMode || w.heliRun || p.inVehicle || p.swimming) return false;
  return Math.hypot(p.x - STAND.x, p.y - STAND.y) < USE_RADIUS;
}

function recText() {
  const rec = getChallengeRecord('pitchputt');
  return rec && rec.best != null ? `Record: ${relText(rec.best)} t.o.v. par${rec.medal ? ' · ' + MEDALS[rec.medal].toLowerCase() : ''}` : null;
}

function prompt(w) {
  if (!nearStand(w)) return null;
  const why = activityBlock(w);
  return { id: 'pitchputt', x: STAND.x, y: STAND.y, h: 2.2, key: 'E', label: 'Pitch & putt', sub: why || recText() || `Zes banen · ${venue.plaats} · gratis`, ring: true, dim: !!why };
}

function secondary(w) {
  if (game || w.player.inVehicle) return [];
  focus(w);
  if (Math.hypot(w.player.x - CENTER.x, w.player.y - CENTER.y) > 220) return [];
  return [{ id: 'pitchputt-2', x: STAND.x, y: STAND.y, h: 2.2, label: 'Pitch & putt', sub: 'Loop naar de eerste tee en druk E', kind: 'place' }];
}

function interact(w) {
  if (!nearStand(w)) return false;
  const why = activityBlock(w);
  if (why) { w.addMessage(why, 2.5); return true; }
  // with guests in the session the round is an invitation to everyone (Meedoen? J/N); pressing E again starts at once (#443)
  const uit = wedNodigUit(w, 'pitchputt');
  if (uit.ok) { if (uit.reden === 'wacht') wedNuStarten(w); return true; }
  start(w);
  return true;
}

// online: 'host' (who opened the game, at the stand) or 'gast' (on his own screen, on the venue of the host, venueId): everybody plays his own six holes at once (#443)
function start(w, { force = false, online = null, venueId = null } = {}) {
  if (game) return false;
  if (!force && !online && activityBlock(w)) return false;
  if (venueId) zetVenue(venues.find((v) => v.id === venueId)); else focus(w);
  if (!built) built = buildCourse(w);
  const p = w.player;
  if (p.inVehicle && p.exitVehicle) p.exitVehicle(w.map, w);
  ensureBoard();
  board.show();
  runs++;
  game = { t: 0, hole: 0, strokes: 0, phase: 'aim', phaseT: 0, card: newCard(HOLES), players: null, b: null, pi: 0, volgende: null, lie: null, yaw: 0, charge: 0, charging: false, anim: null, flash: null, cam: null, said: 0, bunker: false, rng: Math.random, etq: newEtiquette(), misserT: -99, online };
  etqQ = [];
  etqNext = { sir: 0, wolfie: 0 };
  zetSpelers(game, 1);
  beginHole(w);
  if (online === 'gast') return true; // a guest reads the keys on the board; the host's invitation said what is played
  showCard(w, { kind: 'tip', kicker: 'Pitch & putt', title: 'Zes korte banen', body: '[A] [D] richten (Shift: fijn), houd [Spatie] en laat los. Het witte streepje op de meter is de kracht voor een rechte slag naar de vlag. Lees de pijltjes op de green. Met [2], [3] of [4] spelen meer mensen om de beurt op dit scherm.', duration: 10, key: 'pitchputt-help', voice: false });
  say(w, 'start', true);
  return true;
}

// Pass-and-play (#437): 1 tot 4 spelers, golfbeurt.js houdt de beurt bij (de verste bal slaat, op de tee de eer).
// g.lie, g.strokes en g.card zijn altijd die van wie aan de beurt is.
function zetSpelers(g, n) {
  const ids = spelerIds(n);
  g.players = ids.map((id, i) => ({ id, naam: spelerNaam(i), card: newCard(HOLES) }));
  g.b = nieuweBeurt(ids);
  g.pi = 0;
  g.card = g.players[0].card;
  g.volgende = null;
}
const meerdere = (g) => !!g.players && g.players.length > 1;
function naarSpeler(g, id) {
  const i = g.players.findIndex((s) => s.id === id);
  if (i < 0) return;
  const s = spelerStand(g.b, id);
  g.pi = i;
  g.card = g.players[i].card;
  g.lie = { ...s.lie };
  g.strokes = s.slagen;
}

function beginHole(w) {
  const g = game;
  const h = HOLES[g.hole];
  g.strokes = 0;
  g.lie = { x: h.tee.x, y: h.tee.y };
  g.volgende = null;
  if (g.b) {
    const eer = beginBaan(g.b, h.tee);
    naarSpeler(g, eer);
    if (meerdere(g)) g.flash = { text: `${g.players[g.pi].naam} heeft de eer`, t: 2.4 };
  }
  g.bunker = false;
  g.phase = 'aim';
  g.phaseT = 0;
  g.cam = null;
  setLie(w);
  etqSay(w, etqBegin(g.etq, h.par));
}

const mode = (g) => (onGreen(HOLES[g.hole], g.lie.x, g.lie.y) && !inBunker(HOLES[g.hole], g.lie.x, g.lie.y) ? 'putt' : 'pitch');

// De echte hoogte van de wereld onder de baan (map.surfaceAt): de helling ervan telt mee voor de rollende bal (golfphysics.js, holeTerrain).
// Tegen elkaar (g.online) rekent iedereen op de vaste hellingen van de baan, niet op de gestreamde wereldhoogte: zo geeft dezelfde slag
// op elk scherm dezelfde uitkomst, ook als de tegels bij de een nog niet geladen zijn (#443, #453).
function groundAtFor(w) {
  const m = w && w.map;
  if (game && game.online) return null;
  if (!m || typeof m.surfaceAt !== 'function') return null;
  const st = { z: 0, ribbon: null };
  return (x, y) => { st.z = 0; st.ribbon = null; const r = m.surfaceAt(x, y, st); return r && Number.isFinite(r.z) ? r.z : 0; };
}

function setLie(w) {
  const g = game;
  const h = HOLES[g.hole];
  g.yaw = Math.atan2(h.cup.y - g.lie.y, h.cup.x - g.lie.x);
  g.charge = 0;
  g.charging = false;
  g.anim = null;
  g.bunker = inBunker(h, g.lie.x, g.lie.y);
  const p = w.player;
  p.x = g.lie.x; p.y = g.lie.y; p.angle = g.yaw; p.speed = 0; p.moving = false; p.vx = 0; p.vy = 0; p.z = 0;
  const side = g.yaw + Math.PI / 2;
  w.companionHold = { x: g.lie.x - Math.cos(g.yaw) * 1.5 - Math.cos(side) * 2.4, y: g.lie.y - Math.sin(g.yaw) * 1.5 - Math.sin(side) * 2.4, face: g.yaw };
  if (built) {
    built.keeper.visible = true;
    built.keeper.position.set(g.lie.x - Math.cos(g.yaw) * 1.3 + Math.cos(side) * 2.3, 0, g.lie.y - Math.sin(g.yaw) * 1.3 + Math.sin(side) * 2.3);
    built.keeper.rotation.y = -g.yaw;
    // Sir Cedric stands beyond the greenkeeper, Wolfie a few steps behind the tee (golfetiquette.js)
    built.sir.visible = true;
    built.sir.position.set(g.lie.x - Math.cos(g.yaw) * 0.5 + Math.cos(side) * 4.6, 0, g.lie.y - Math.sin(g.yaw) * 0.5 + Math.sin(side) * 4.6);
    built.sir.rotation.y = -g.yaw;
    built.wolfie.visible = true;
    built.wolfie.position.set(g.lie.x - Math.cos(g.yaw) * 4.2 + Math.cos(side) * 1.2, 0, g.lie.y - Math.sin(g.yaw) * 4.2 + Math.sin(side) * 1.2);
    built.wolfie.rotation.y = -g.yaw;
    built.ball.visible = true;
    built.ball.position.set(g.lie.x, BALL_R, g.lie.y);
    built.holes.forEach((hh, i) => { hh.arrows.visible = i === g.hole; });
  }
  aimLine = null;
}

// Voor de eerste slag van de eerste baan: [1] tot [4] kiest het aantal spelers.
function kiesSpelers(w, n) {
  const g = game;
  zetSpelers(g, n);
  beginHole(w);
  setLie(w);
  g.flash = { text: meerdere(g) ? `${g.players.length} spelers: om de beurt, de verste bal slaat` : 'Je speelt alleen', t: 3 };
}

// --- shots ----------------------------------------------------------------------------------------------------

function shoot(w, power, over = {}) {
  const g = game;
  const h = HOLES[g.hole];
  const yaw = over.yaw ?? g.yaw;
  const kind = over.mode || mode(g);
  const from = { ...g.lie };
  const opts = { groundAt: groundAtFor(w) };
  let res;
  if (kind === 'putt') res = putt(h, from, yaw, power, opts);
  else res = pitch(h, from, yaw, power, g.online ? makeRng(443 + g.hole * 101 + g.strokes * 7919) : g.rng, g.bunker, opts);
  g.anim = { kind, trace: res.trace, events: res.events, ei: 0, t: 0, rollT: 0, res, from };
  g.strokes++;
  g.phase = 'ball';
  g.phaseT = 0;
  g.cam = null;
  g.flash = null;
  if (built) { built.line.visible = false; built.ring.visible = false; }
  return res;
}

function ballDone(w) {
  const g = game;
  const h = HOLES[g.hole];
  const res = g.anim.res;
  const a0 = g.anim;
  g.anim = null;
  // in het water: een strafslag en de bal gaat terug naar waar je sloeg
  const plons = !res.holed && !!res.water;
  const van = plons ? a0.from : res.end;
  if (plons) g.strokes++;
  if (g.b) g.volgende = slaan(g.b, g.players[g.pi].id, res.holed ? h.cup : van, h.cup, { inHol: res.holed, opgepakt: !res.holed && g.strokes >= h.par + MAX_OVER_PAR, strafslag: plons ? 1 : 0 });
  if (res.holed) { holeDone(w, g.strokes, 'cup'); return; }
  if (plons) {
    g.lie = { x: van.x, y: van.y };
    g.flash = { text: 'Plons! Strafslag: terug naar waar je sloeg', t: 3, bad: true };
    if (g.strokes >= h.par + MAX_OVER_PAR) { holeDone(w, g.strokes, 'opgepakt'); return; }
    g.phase = 'landed';
    g.phaseT = 0;
    return;
  }
  g.lie = { x: res.end.x, y: res.end.y };
  const left = Math.hypot(h.cup.x - g.lie.x, h.cup.y - g.lie.y);
  if (inBunker(h, g.lie.x, g.lie.y)) { g.flash = { text: 'In het zand', t: 2.4, bad: true }; say(w, 'bunker'); pendule(w); }
  else if (!onGreen(h, g.lie.x, g.lie.y)) { g.flash = { text: `Naast de green, nog ${Math.round(left)} m`, t: 2.4, bad: true }; if (g.strokes === 1) { say(w, 'rough'); pendule(w); } }
  else g.flash = { text: `Op de green, nog ${left < 10 ? left.toFixed(1) : Math.round(left)} m`, t: 2.4 };
  if (g.strokes >= h.par + MAX_OVER_PAR) { holeDone(w, g.strokes, 'opgepakt'); return; }
  g.phase = 'landed';
  g.phaseT = 0;
}

function holeDone(w, strokes, why) {
  const g = game;
  const h = HOLES[g.hole];
  finishHole(g.card, g.hole, strokes);
  if (g.online) { const sl = Math.min(strokes, h.par + MAX_OVER_PAR); if (g.online === 'host') wedHostScore(w, g.hole, sl); else wedGastScore(w, g.hole, sl); }
  const name = why === 'opgepakt' ? 'Opgepakt' : holeName(strokes, h.par);
  const wie = meerdere(g) ? `${g.players[g.pi].naam}: ` : '';
  g.flash = { text: `${wie}${name}: ${strokes} slag${strokes === 1 ? '' : 'en'} (par ${h.par})`, t: 3, bad: strokes > h.par };
  const d = strokes - h.par;
  say(w, strokes === 1 && why !== 'opgepakt' ? 'hole1' : d < 0 ? 'birdie' : d === 0 ? 'par' : 'bogey', true);
  etqSay(w, etqHoleDone(g.etq, h.par, strokes, why === 'opgepakt' ? 'opgepakt' : 'cup'));
  // met meer spelers: de baan is pas klaar als iedereen klaar is; tot dan wisselt de beurt (zie 'landed')
  if (g.volgende) { g.phase = 'landed'; g.phaseT = -1; } else { g.phase = 'holeDone'; g.phaseT = 0; }
  if (built) built.ball.position.set(h.cup.x, 0.02, h.cup.y);
}

function nextHole(w) {
  const g = game;
  g.hole++;
  if (g.b) volgendeBaan(g.b);
  if (g.hole >= HOLES.length) {
    if (g.online) { g.hole = HOLES.length - 1; g.phase = 'wacht'; g.phaseT = 0; g.flash = null; return; } // all holes done: wait for the others (the host ends the round)
    end(w); return;
  }
  beginHole(w);
}

// De baan van de bal afspelen (golfphysics.js trace, een punt per SAMPLE s) met de geluiden van de events; de baan is al uitgerekend.
const GOLF_SUB = { slag: 'slag', stuiter: 'stuiter', zand: 'zand', plons: 'plons', rand: 'rand', hole: 'hole' };
function stepBall(w, dt) {
  const g = game;
  const a = g.anim;
  const tr = a.trace;
  const last = tr.length - 1;
  // een bal die bijna stil rolt gaat sneller: geen seconden wachten op de laatste centimeters
  const slow = a.cur && a.cur[2] < 0.03 && a.cur[3] < 0.4 && !a.res.holed ? 2.5 : 1;
  a.t += dt * slow;
  const idx = a.t / SAMPLE;
  const i = Math.min(last, Math.floor(idx)), j = Math.min(last, i + 1);
  const k = Math.min(1, idx - i);
  const p = tr[i], q = tr[j];
  const x = p[0] + (q[0] - p[0]) * k, y = p[1] + (q[1] - p[1]) * k, z = p[2] + (q[2] - p[2]) * k, sp = p[3] + (q[3] - p[3]) * k;
  a.cur = [x, y, z, sp];
  a.pos = { x, y, z: Math.max(0, z) };
  if (built) built.ball.position.set(x, BALL_R + z, y);
  while (a.ei < a.events.length && a.events[a.ei].t <= a.t) {
    const e = a.events[a.ei++];
    const sub = GOLF_SUB[e.kind];
    if (sub) pushAudioEvent(w, { kind: 'golf', sub: e.kind === 'slag' && a.kind === 'putt' ? 'putt' : sub, strength: e.k, x: e.x, y: e.y });
  }
  // het zachte rollen: een tikje geluid per paar tienden zolang de bal over de grond gaat
  if (z < 0.03 && sp > 0.25 && !a.res.holed && (a.rollT -= dt) <= 0) {
    a.rollT = 0.2;
    pushAudioEvent(w, { kind: 'golf', sub: 'rol', strength: Math.min(1, sp / 6), x, y });
  }
  if (a.t >= Math.max(a.res.t, last * SAMPLE) + 0.5) ballDone(w);
}

// --- the loop --------------------------------------------------------------------------------------------------------

function updateGame(w, dt) {
  const g = game;
  const input = w.input;
  g.t += dt;
  g.phaseT += dt;
  if (g.flash && (g.flash.t -= dt) <= 0) g.flash = null;
  if (g.online === 'gast' && (!w.coopNet || w.coopRole !== 'client')) { wedGastReset(w); end(w, { quit: true, extern: true }); return; } // the connection is gone
  if (stopPressed(input)) { end(w, { quit: true }); return; }
  const p = w.player;
  p.speed = 0; p.moving = false; p.vx = 0; p.vy = 0; p.z = 0;
  // stand still at a stroke, keep the order of play: Sir Cedric and Wolfie only answer in words, the player's strokes never change (golfetiquette.js)
  const aiming = g.phase === 'aim';
  const turning = aiming && (input.isDown('a') || input.isDown('d') || input.isDown('arrowleft') || input.isDown('arrowright'));
  const charging = aiming && input.isDown(' ');
  const shotsBefore = g.strokes;
  if (g.phase === 'aim') {
    const putting = mode(g) === 'putt';
    const slow = input.isDown('shift') ? 0.25 : 1;
    const ax = (input.isDown('d') || input.isDown('arrowright') ? 1 : 0) - (input.isDown('a') || input.isDown('arrowleft') ? 1 : 0);
    g.yaw += ax * dt * (putting ? 0.32 : 0.5) * slow;
    p.angle = g.yaw;
    if (g.hole === 0 && !g.online && !g.charging && g.b.spelers.every((s) => s.slagen === 0)) {
      for (let k = 1; k <= MAX_SPELERS; k++) if (input.wasPressed(String(k)) && spelerAantal(k) !== g.players.length) { kiesSpelers(w, k); break; }
    }
    if (input.isDown(' ')) {
      g.charging = true;
      g.charge = Math.min(1, g.charge + dt / ((putting ? CHARGE_PUTT : CHARGE_PITCH) * (input.isDown('shift') ? 1.8 : 1)));
    } else if (g.charging) {
      g.charging = false;
      const power = Math.max(0.04, g.charge);
      g.charge = 0;
      shoot(w, power);
    }
  } else if (g.phase === 'ball') {
    stepBall(w, dt);
  } else if (g.phase === 'landed') {
    if (g.phaseT > 1.4) {
      if (g.b && g.volgende && g.volgende !== g.players[g.pi].id) {
        naarSpeler(g, g.volgende);
        g.flash = { text: `${g.players[g.pi].naam} is aan de beurt`, t: 2.4 };
      }
      setLie(w); g.phase = 'aim'; g.phaseT = 0; g.cam = null;
    }
  } else if (g.phase === 'holeDone') {
    if (g.phaseT > 3) nextHole(w);
  }
  if (game === g) etqSay(w, etqStep(g.etq, dt, { laadt: charging, draait: turning, schiet: g.strokes > shotsBefore }));
}

function end(w, { quit = false, extern = false, uitslag = null } = {}) {
  const g = game;
  if (!g) return;
  game = null;
  w.companionHold = null;
  w.cameraOverride = null;
  if (board) board.hide();
  clearBubbles(w, 'pitchputt');
  etqQ = [];
  etqNext = { sir: 0, wolfie: 0 };
  if (built) { built.line.visible = false; built.ring.visible = false; built.ball.visible = false; built.keeper.visible = !quit; built.sir.visible = !quit; built.wolfie.visible = !quit; built.keeperUntil = w.time + 14; built.holes.forEach((hh) => { hh.arrows.visible = false; }); }
  if (g.online) { eindeOnline(w, g, quit, extern, uitslag); return; }
  if (quit) { w.addMessage('Pitch & putt gestopt', 2.5); return; }
  if (meerdere(g)) { eindeMeerdere(w, g); return; }
  const t = cardTotals(g.card);
  const medal = courseMedal(t.rel);
  const rec = recordChallengeResult(w, 'pitchputt', { value: t.rel, medal, lower: true });
  recordStat(w, 'pitchputtRounds');
  unlockAchievement(w, 'putt_klaar');
  if (medal >= 3) unlockAchievement(w, 'putt_goud');
  const stats = [['Slagen', String(t.strokes)], ['Par', String(t.par)], ['Score', relText(t.rel)]];
  if (g.card.aces) stats.push(['Hole-in-one', String(g.card.aces)]);
  if (medal) stats.push(['Medaille', MEDALS[medal]]);
  if (rec && rec.newBest) stats.push(['Record', 'Nieuw!']);
  showBanner({ kind: medal ? 'pass' : 'fail', title: medal >= 3 ? 'ONDER PAR OP DE CONCOURSLAAN' : medal ? 'NETTE RONDE' : 'DE GREEN WON', reason: medal ? `${relText(t.rel)} t.o.v. par over zes banen` : 'Probeer het nog eens: lees de pijltjes op de green', reward: 0, stats });
  say(w, medal >= 2 ? 'endGood' : 'endPoor', true, true);
  etqSay(w, etqEinde(g.etq, medal >= 2));
}

// Online (#443): wie stopt laat de anderen doorspelen; de uitslag en de beloning komen van wie het spel opende (coopwedstrijd.js).
function eindeOnline(w, g, quit, extern, res) {
  if (quit) {
    if (!extern) { if (g.online === 'host') wedScoreStop(w); else wedGastVerlaat(w); } // the host stops it for everybody, a guest only for himself
    w.addMessage('Pitch & putt gestopt', 2.5);
    return;
  }
  if (g.online === 'gast' || !res) return; // a guest: the results card and the prize message come from the host
  recordStat(w, 'pitchputtRounds');
  unlockAchievement(w, 'putt_klaar');
  const jij = res.jij || { plek: 0, geld: 0, xp: 0 };
  loopbaanVerdien(w, 'golf', jij.geld, { xp: jij.xp, n: 1, uniek: 'pitchputt', deel: false }); // the prize is per place; the guests get theirs from the host
  if (jij.geld > 0) w.addMessage(`Beloning: \u20ac${jij.geld.toLocaleString('nl-NL')}`, 4);
}

// Pass-and-play klaar: geen persoonlijk record of medaille (die horen bij één speler), wel de uitslag.
function eindeMeerdere(w, g) {
  recordStat(w, 'pitchputtRounds');
  unlockAchievement(w, 'putt_klaar');
  const u = uitslag(g.b);
  const speler = (id) => g.players.find((s) => s.id === id);
  const stats = u.rijen.map((r) => [speler(r.id).naam, `${relText(cardTotals(speler(r.id).card).rel)} (${r.totaal} slagen)`]);
  showBanner({
    kind: 'pass',
    title: u.gelijk ? 'GELIJKSPEL OP DE GREEN' : `${speler(u.winnaars[0]).naam.toUpperCase()} WINT`,
    reason: u.gelijk ? `${u.winnaars.map((id) => speler(id).naam).join(' en ')} eindigen samen bovenaan` : `${speler(u.winnaars[0]).naam} wint de ronde over zes banen`,
    reward: 0, stats,
  });
}

// What Sir Cedric and Wolfie say (golfetiquette.js): text bubbles one after the other per speaker, never a recorded voice (#394).
let etqQ = [];
let etqNext = { sir: 0, wolfie: 0 };
function etqSay(w, events) {
  if (game && meerdere(game)) return;   // Sir Cedric en Wolfie praten alleen met één speler
  ({ rij: etqQ, volgende: etqNext } = etqPlan(etqQ, etqNext, events, w.time));
}
function etqFlush(w) {
  if (!etqQ.length) return;
  if (!built) { etqQ = []; return; }
  const { nu, rest } = etqBeurt(etqQ, w.time);
  if (!nu.length) return;
  etqQ = rest;
  for (const e of nu) {
    const c = e.wie === 'sir' ? built.sir : built.wolfie;
    bubble(w, { x: c.position.x, y: c.position.z, name: e.wie === 'sir' ? SIR : WOLFIE, text: e.tekst, h: 2.1, tag: 'pitchputt' });
  }
}
// "laat de pendule maar doen": Wolfie after a bad lie, at most once in 25 seconds
function pendule(w) {
  const g = game;
  if (!g || g.t - g.misserT < 25) return;
  g.misserT = g.t;
  etqSay(w, [etqMisser(g.etq)]);
}

function say(w, kind, force = false, after = false) {
  const list = PUTT_LINES[kind];
  if (!list || !built) return;
  const g = game;
  if (g && !force && g.t - g.said < 8) return;
  if (g) g.said = g.t;
  const c = built.keeper;
  bubble(w, { x: c.position.x, y: c.position.z, name: PUTT_LINES.who, text: pick(list), h: 2.1, tag: 'pitchputt', ttl: after ? 4 : 0 });
}

// --- 3D, camera and HUD per frame ------------------------------------------------------------------------------------

// De richtlijn met baan-preview: de bal zoals hij gaat rollen met de kracht van dit moment (de lading, of anders het streepje), zonder
// spreiding: een putt laat zijn breuk zien, een pitch zijn boog, de plek waar hij landt (de ring) en waar hij blijft liggen (het streepje).
// Gerekend met dezelfde motor als de slag zelf (golfphysics.js), alleen als richting of kracht verandert.
function previewLine(w) {
  const g = game;
  if (!built) return;
  if (g.phase !== 'aim') { built.line.visible = false; built.ring.visible = false; return; }
  const h = HOLES[g.hole];
  const putting = mode(g) === 'putt';
  const dist = Math.hypot(h.cup.x - g.lie.x, h.cup.y - g.lie.y);
  const power = g.charging ? Math.max(0.04, g.charge) : putting ? straightPower(dist) : powerForCarry(dist);
  const sig = [g.yaw.toFixed(3), power.toFixed(2), g.lie.x.toFixed(2), g.lie.y.toFixed(2), putting ? 1 : 0].join('|');
  if (aimLine === sig) return;
  aimLine = sig;
  const opts = { groundAt: groundAtFor(w) };
  const res = putting ? putt(h, g.lie, g.yaw, power, opts) : pitch(h, g.lie, g.yaw, power, () => 0.5, g.bunker, opts);
  const tr = res.trace;
  const pos = built.line.geometry.attributes.position;
  const n = Math.min(PREVIEW_PTS, tr.length);
  for (let i = 0; i < n; i++) {
    const q = tr[n === tr.length ? i : Math.round((i / (n - 1)) * (tr.length - 1))];
    pos.setXYZ(i, q[0], BALL_R + 0.04 + Math.max(0, q[2]), q[1]);
  }
  built.line.geometry.setDrawRange(0, n);
  pos.needsUpdate = true;
  built.line.visible = true;
  const mark = putting ? res.end : res.landing;
  built.ring.visible = true;
  built.ring.scale.setScalar(putting ? 0.35 : 1);
  built.ring.position.set(mark.x, 0.1, mark.y);
}

function sync3D(w, dt) {
  if (!built) return;
  if (game) previewLine(w);
  if (built.keeper.visible) {
    animatePersonWalk(built.keeper, 0, dt);
    if (!game && built.keeperUntil && w.time > built.keeperUntil) { built.keeper.visible = false; built.sir.visible = false; built.wolfie.visible = false; built.keeperUntil = 0; clearBubbles(w, 'pitchputt'); }
  }
  if (built.sir.visible) animatePersonWalk(built.sir, 0, dt);
  if (built.wolfie.visible) animatePersonWalk(built.wolfie, 0, dt);
  etqFlush(w);
  hut(w, dt);
}

// Wolfie stands at the hut by the first tee while you walk by and says a word now and then
let hutT = 0, hutNear = false;
function hut(w, dt) {
  if (built && built.keeperUntil && w.time > built.keeperUntil) built.keeperUntil = 0; // (a quit leaves it set: the keeper is hidden then)
  if (game || !built || built.keeperUntil) { hutNear = false; return; }
  const near = !w.player.inVehicle && Math.hypot(w.player.x - STAND.x, w.player.y - STAND.y) < 16;
  if (near !== hutNear) {
    hutNear = near;
    built.wolfie.visible = near;
    if (near) {
      const h = HOLES[0];
      built.wolfie.position.set(STAND.x + Math.cos(h.heading + 2.2) * 2.4, 0, STAND.y + Math.sin(h.heading + 2.2) * 2.4);
      built.wolfie.rotation.y = -(h.heading + 2.2 + Math.PI);
      hutT = 2.5;
    } else clearBubbles(w, 'pitchputt');
  }
  if (near && (hutT -= dt) <= 0) {
    hutT = 28 + Math.random() * 20;
    etqSay(w, [etqHallo()]);
  }
}

function camera(w) {
  const g = game;
  if (!g) return;
  const h = HOLES[g.hole];
  const putting = mode(g) === 'putt';
  let pos, at;
  if (g.phase === 'ball' && g.anim && g.anim.pos) {
    const a = g.anim.pos;
    pos = { x: a.x - Math.cos(g.yaw) * (putting ? 3.2 : 11), y: a.y - Math.sin(g.yaw) * (putting ? 3.2 : 11), z: putting ? 1.5 : 5 + a.z * 0.5 };
    at = { x: a.x + Math.cos(g.yaw) * 2, y: a.y + Math.sin(g.yaw) * 2, z: a.z * 0.5 };
  } else if (g.phase === 'holeDone') {
    // altijd van achter de speler langs zijn schouder naar het hol (nooit van voren: Tamo staat met zijn gezicht naar het hol)
    const ux = Math.cos(g.yaw), uy = Math.sin(g.yaw);
    pos = { x: g.lie.x - ux * 3.2 - uy * 1.3, y: g.lie.y - uy * 3.2 + ux * 1.3, z: 2.1 };
    at = { x: h.cup.x, y: h.cup.y, z: 0.4 };
  } else {
    const back = putting ? 3.4 : 9;
    const to = putting ? { x: g.lie.x + Math.cos(g.yaw) * Math.min(14, Math.hypot(h.cup.x - g.lie.x, h.cup.y - g.lie.y)) * 0.6, y: g.lie.y + Math.sin(g.yaw) * Math.min(14, Math.hypot(h.cup.x - g.lie.x, h.cup.y - g.lie.y)) * 0.6 } : { x: g.lie.x + Math.cos(g.yaw) * 30, y: g.lie.y + Math.sin(g.yaw) * 30 };
    // een stukje opzij van de lijn (over de schouder), zodat de speler nooit tussen camera en hol in beeld staat met zijn gezicht naar ons
    pos = { x: g.lie.x - Math.cos(g.yaw) * back - Math.sin(g.yaw) * 0.9, y: g.lie.y - Math.sin(g.yaw) * back + Math.cos(g.yaw) * 0.9, z: putting ? 1.7 : 4.4 };
    at = { x: to.x, y: to.y, z: putting ? 0.2 : 1.5 };
  }
  const c = easeCamera(g, pos, at, g.phase === 'ball' ? 0.2 : 0.1);
  w.cameraOverride = { position: c.position, lookAt: c.lookAt, fov: putting ? 50 : 58, cut: true };
}

function ensureBoard() {
  ensureGolfCss();
  if (!board) board = createBoard('pitchputt');
  return board;
}

// How the green falls from the ball, in words, relative to the aim.
function slopeText(g) {
  const h = HOLES[g.hole];
  const sl = slopeAt(h, g.lie.x, g.lie.y);
  const along = sl.x * Math.cos(g.yaw) + sl.y * Math.sin(g.yaw);
  const across = -sl.x * Math.sin(g.yaw) + sl.y * Math.cos(g.yaw);
  // y runs south, the aim is up the screen: a positive across falls to the right
  const pct = (v) => (Math.abs(v) * 100).toFixed(1).replace('.', ',');
  const side = Math.abs(across) < 0.004 ? 'recht' : `naar ${across > 0 ? 'rechts' : 'links'} ${pct(across)}%`;
  const up = Math.abs(along) < 0.004 ? '' : along > 0 ? ` · bergaf ${pct(along)}%` : ` · bergop ${pct(along)}%`;
  return `Green valt ${side}${up}`;
}

function updateHud(w) {
  const g = game;
  if (!g || !board) return;
  const h = HOLES[g.hole];
  const dist = Math.hypot(h.cup.x - g.lie.x, h.cup.y - g.lie.y);
  const putting = mode(g) === 'putt';
  const t = cardTotals(g.card);
  const multi = meerdere(g);
  const wie = multi ? g.players[g.pi].naam : '';
  const online = g.online ? wedScoreRijen(w) : [];
  const stand2 = online.length ? `<span>${online.map((r) => `${r.weg ? '<s>' : ''}${r.naam} ${relText(r.rel)} (${r.banen}/${HOLES.length})${r.weg ? '</s>' : ''}`).join(' · ')}</span>` : '';
  const row = stand2 + golfRij({ wie, baan: h.n, banen: HOLES.length, par: h.par, slag: g.phase === 'aim' ? g.strokes + 1 : g.strokes, vlag: dist, club: putting ? 'putter' : 'wedge', ondergrond: g.bunker ? 'zand' : 'gras' });
  const cells = g.card.holes.map((c, i) => ({ t: c.done ? String(c.strokes) : i === g.hole ? `${g.strokes || '·'}` : String(c.n), cls: `${i === g.hole ? 'on' : ''} ${c.done ? (c.strokes <= c.par ? 'good' : 'bad') : ''}` }));
  const extra = multi ? scoreTabel({
    nummers: HOLES.map((hh) => hh.n),
    huidigeBaan: g.hole,
    spelers: g.players.map((s, i) => {
      const st = spelerStand(g.b, s.id);
      return { id: s.id, naam: s.naam, aanDeBeurt: i === g.pi, klaar: !!(st && st.klaar), totaal: relText(cardTotals(s.card).rel), cellen: s.card.holes.map((c, k) => scoreCel(c, k, g.hole, st ? st.slagen : 0)) };
    }),
  }) : '';
  const mark = putting ? straightPower(dist) : powerForCarry(dist);
  const flash = g.flash ? g.flash.text : g.phase === 'wacht' ? 'Alle banen af: wachten op de anderen' : g.phase === 'aim' ? (putting ? slopeText(g) : g.bunker ? 'Uit het zand: meer spreiding' : 'Mik op de vlag') : '';
  const help = g.phase === 'aim'
    ? `${key('A')}${key('D')} richten (${key('SHIFT')} fijn) · houd ${key('SPATIE')} en laat los bij het streepje · ${key('BACKSPACE')} stoppen · totaal ${relText(t.rel)}${g.hole === 0 && g.b.spelers.every((s) => s.slagen === 0) ? ` · ${key('2')}-${key('4')} meer spelers` : ''}`
    : `Totaal ${relText(t.rel)} · ${key('BACKSPACE')} stoppen`;
  // de krachtbalk: de kleur zegt hoe dicht je bij het streepje zit (groen ver, geel dichtbij, oranje te hard), de tekst het getal
  const v = g.charge, nabij = Math.abs(v - mark);
  const kleur = v > mark + 0.12 ? '#ff9a3c' : nabij < 0.04 ? '#ffd23f' : ACCENT;
  board.set({ row, cells: multi ? null : cells, extra, meter: g.phase === 'aim' ? { v, mark: clamp(mark, 0, 1), color: kleur, text: krachtTekst(v) } : null, flash, bad: !!(g.flash && g.flash.bad), help });
}

// --- playing against others (#443) --------------------------------------------------------------------------------------

// a guest: the host started the round and this guest said yes; the round runs on his own screen
function gastTik(w, dt) {
  if (!game || game.online !== 'gast') return false;
  updateGame(w, dt);
  if (game) { if ((lodT -= dt) <= 0) { lodT = 0.5; updateLod(w); } sync3D(w, dt); updateHud(w); }
  return true;
}
registreerWedstrijd('pitchputt', {
  naam: 'Pitch & putt', soort: 'score',
  banen: (w) => { focus(w); return HOLES.map((h) => ({ par: h.par })); },
  start: (w) => start(w, { online: 'host' }),
  plek: () => ({ ...STAND }),
  extra: () => { gastVenue = null; return { v: venue.id }; },
  gastPlek: (w, x, y) => { // a guest asks at a stand (#452): the course is the one he stands at, not the one near the host
    if (game) return false;
    const n = nearestOf(venues, x, y);
    if (!n) return false;
    gastVenue = { item: n.item, t: Date.now() };
    zetVenue(n.item);
    const ok = Math.hypot(x - STAND.x, y - STAND.y) < USE_RADIUS + 1.5;
    if (!ok) gastVenue = null;
    return ok;
  },
  eind: (w, res) => { if (game && game.online === 'host') end(w, res ? { uitslag: res } : { quit: true, extern: true }); },
  solo: (w) => start(w),
});
zetWedGastHaken('pitchputt', {
  dichtbij: (w) => nearStand(w),
  start: (w, st) => start(w, { online: 'gast', venueId: st.v, force: true }),
  eind: (w, uit) => { if (game && game.online === 'gast') end(w, uit.gestopt ? { quit: true, extern: true } : { uitslag: uit }); },
  tik: gastTik,
});

// --- the activity -------------------------------------------------------------------------------------------------------

export const PITCHPUTT = {
  id: 'pitchputt',
  layer: 'pitchputt',
  legend: { kind: 'act-pitchputt', label: 'Pitch & putt', note: 'zes korte banen op de echte golfbanen: pitchen en putten' },
  init(w) {
    // the real courses (scripts/world/echteplekken.py): used as soon as the data is in
    loadEchtePlekken().then((data) => { const v = golfVenues(data); if (v.length) setVenues(v); });
    window.__pitchputt = {
      venues: () => venues.map((v) => ({ id: v.id, name: v.name, x: Math.round(v.x), y: Math.round(v.y), holes: v.holes.length })),
      spot: () => ({ ...STAND }),
      holes: () => HOLES.map((h) => ({ n: h.n, par: h.par, len: Math.round(h.len), tee: { ...h.tee }, cup: { ...h.cup }, water: (h.water || []).map((b) => ({ ...b })), bunkers: h.bunkers.map((b) => ({ ...b })) })),
      // tests: naar een andere baan, en de bal op een andere plek leggen (de beurt en de score blijven zoals ze zijn)
      goto: (i) => { if (!game || !(i >= 0 && i < HOLES.length)) return false; game.hole = i; if (game.b) game.b.baan = i; beginHole(w); return true; },
      zet: (x, y) => { if (!game || game.phase !== 'aim') return false; game.lie = { x, y }; setLie(w); return true; },
      start: (force = true) => start(w, { force }),
      state: () => (game ? { phase: game.phase, hole: game.hole, strokes: game.strokes, lie: { ...game.lie }, mode: mode(game), card: cardTotals(game.card) } : null),
      shoot: (power = 0.8, over = {}) => (game && game.phase === 'aim' ? (shoot(w, power, over), true) : false),
      sink: () => { if (!game) return false; if (game.phase === 'ball') ballDone(w); if (game && game.phase !== 'holeDone') holeDone(w, Math.max(1, game.strokes + 1), 'cup'); return true; },
      skip: () => { if (!game) return false; game.phase = 'holeDone'; game.phaseT = 99; return true; },
      finish: () => { if (!game) return false; for (let i = game.hole; i < HOLES.length; i++) { game.hole = i; holeDone(w, HOLES[i].par, 'cup'); } game.hole = HOLES.length - 1; nextHole(w); return true; },
      quit: () => { if (!game) return false; end(w, { quit: true }); return true; },
      hut: () => ({ near: hutNear, t: Math.round(hutT * 10) / 10, gebouwd: !!built, wolfie: !!(built && built.wolfie.visible), rij: etqQ.length }),
      etiquette: () => (game ? { eer: game.etq.eer, boos: game.etq.boos, sirRel: game.etq.sirRel, spelerRel: game.etq.spelerRel, fase: game.etq.hole && game.etq.hole.fase } : null),
    };
  },
  spots: () => venues.filter((v) => Number.isFinite(v.x) && Number.isFinite(v.y)).map((v, i) => ({ id: i ? 'pitchputt-' + v.id : 'pitchputt', name: v.name, x: v.x, y: v.y })),
  prompt,
  secondary,
  interact,
  active: () => !!game,
  quit: (w) => end(w, { quit: true }),
  update(dt, w) {
    if (!game) return;
    if (w.pendingRespawn) { end(w, { quit: true }); return; }
    updateGame(w, dt);
  },
  tick(dt, w) {
    if ((lodT -= dt) <= 0) { lodT = 0.5; updateLod(w); }
    sync3D(w, dt);
    updateHud(w);
  },
  camera,
  icon: drawIcon,
  mapSub: () => recText() || 'Pitch & putt: zes korte banen',
  ubbo(w) {
    focus(w);
    const d = Math.hypot(STAND.x - w.player.x, STAND.y - w.player.y);
    const rec = getChallengeRecord('pitchputt');
    return { name: 'Pitch & putt', sub: rec && rec.medal ? `record: ${MEDALS[rec.medal].toLowerCase()}` : 'zes banen, gratis', dist: d, x: STAND.x, y: STAND.y, play: 'pitchputt', where: `de eerste tee bij ${venue.plaats}`, hint: 'loop naar de tee en druk E' };
  },
  runs: () => runs,
};
