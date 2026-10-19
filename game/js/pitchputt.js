import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { buildPersonMesh, animatePersonWalk } from './models3d_people.js';
import { showBanner } from './cinematics.js';
import { unlockAchievement, recordChallengeResult, getChallengeRecord, recordStat, MEDALS } from './achievements.js';
import { showCard } from './hudcards.js';
import { activityBlock, iconDisc } from './activitykit.js';
import { createBoard, key, bubble, clearBubbles, pick, stopPressed, easeCamera, clamp } from './minigamekit.js';
import { PUTT_LINES } from './minigamelines.js';
import { loadEchtePlekken, golfVenues, nearestOf } from './echteplekken.js';
import {
  ppHoles, holesFromWorld, slopeAt, onGreen, inBunker, pitch, putt, straightPower, powerForCarry, finishHole, newCard, cardTotals, courseMedal, holeName, relText,
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
const ACCENT = '#46b36a';
const USE_RADIUS = 2.8;
const DETAIL_M = 520;
// The course in use: the Concours oval (the fallback) until game/echteplekken.json has real
// golf courses (#174); then the nearest of those, six holes laid out on the real course.
let HOLES, CENTER, FIRST, STAND;
function layout(holes) {
  HOLES = holes;
  CENTER = { x: HOLES.reduce((a, h) => a + h.tee.x + h.cup.x, 0) / (HOLES.length * 2), y: HOLES.reduce((a, h) => a + h.tee.y + h.cup.y, 0) / (HOLES.length * 2) };
  FIRST = HOLES[0];
  STAND = { x: FIRST.tee.x - Math.cos(FIRST.heading) * 3 + Math.cos(FIRST.heading + Math.PI / 2) * 1.3, y: FIRST.tee.y - Math.sin(FIRST.heading) * 3 + Math.sin(FIRST.heading + Math.PI / 2) * 1.3 };
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
function focus(w) {
  if (game) return;
  const n = nearestOf(venues, w.player.x, w.player.y);
  if (!n || n.item === venue) return;
  venue = n.item;
  layout(venue.holes);
  if (built) {
    getScene().remove(built.root, built.ball, built.line, built.ring, built.keeper);
    built = null;
  }
}
const BALL_R = 0.16;
const CHARGE_PITCH = 1.5, CHARGE_PUTT = 1.7;

let game = null;
let built = null;
let board = null;
let lodT = 0;
let runs = 0;
let aimLine = null;

const keeperLook = { shirt: 0x5a8a3a, skin: 0xe2b48c, variant: 'male', seed: 8810, look: { age: 'old', hat: null, bag: null, umbrella: null } };

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
  const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const line = new THREE.Line(lineGeo, M.line);
  line.frustumCulled = false;
  line.visible = false;
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.75, 20).rotateX(-Math.PI / 2), M.ring);
  ring.visible = false;
  const keeper = buildPersonMesh(keeperLook.shirt, keeperLook.skin, keeperLook);
  keeper.visible = false;
  getScene().add(root, ball, line, ring, keeper);
  return { root, holes, ball, line, ring, keeper };
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
  start(w);
  return true;
}

function start(w, { force = false } = {}) {
  if (game) return false;
  if (!force && activityBlock(w)) return false;
  focus(w);
  if (!built) built = buildCourse(w);
  const p = w.player;
  if (p.inVehicle) p.exitVehicle(w.map, w);
  ensureBoard();
  board.show();
  runs++;
  game = { t: 0, hole: 0, strokes: 0, phase: 'aim', phaseT: 0, card: newCard(HOLES), lie: null, yaw: 0, charge: 0, charging: false, anim: null, flash: null, cam: null, said: 0, bunker: false, rng: Math.random };
  beginHole(w);
  showCard(w, { kind: 'tip', kicker: 'Pitch & putt', title: 'Zes korte banen', body: '[A] [D] richten (Shift: fijn), houd [Spatie] en laat los. Het witte streepje op de meter is de kracht voor een rechte slag naar de vlag. Lees de pijltjes op de green.', duration: 10, key: 'pitchputt-help', voice: false });
  say(w, 'start', true);
  return true;
}

function beginHole(w) {
  const g = game;
  const h = HOLES[g.hole];
  g.strokes = 0;
  g.lie = { x: h.tee.x, y: h.tee.y };
  g.bunker = false;
  g.phase = 'aim';
  g.phaseT = 0;
  g.cam = null;
  setLie(w);
}

const mode = (g) => (onGreen(HOLES[g.hole], g.lie.x, g.lie.y) ? 'putt' : 'pitch');

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
    built.ball.visible = true;
    built.ball.position.set(g.lie.x, BALL_R, g.lie.y);
    built.holes.forEach((hh, i) => { hh.arrows.visible = i === g.hole; });
  }
  aimLine = null;
}

// --- shots ----------------------------------------------------------------------------------------------------

function shoot(w, power, over = {}) {
  const g = game;
  const h = HOLES[g.hole];
  const yaw = over.yaw ?? g.yaw;
  const kind = over.mode || mode(g);
  const from = { ...g.lie };
  let res;
  if (kind === 'putt') {
    res = putt(h, from, yaw, power);
    g.anim = { kind: 'putt', path: res.path.map((p) => [p[0], p[1], 0]), step: 0.04, t: 0, res };
  } else {
    res = pitch(h, from, yaw, power, g.rng, g.bunker);
    const carry = res.carry;
    const fly = 0.6 + carry / 45;
    const arc = [];
    const n = Math.max(8, Math.round(fly / 0.04));
    const peak = 3 + carry * 0.16;
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      arc.push([from.x + (res.landing.x - from.x) * k, from.y + (res.landing.y - from.y) * k, 4 * peak * k * (1 - k)]);
    }
    const roll = res.path.slice(2).map((p) => [p[0], p[1], 0]);
    g.anim = { kind: 'pitch', path: [...arc, ...roll], step: 0.04, t: 0, res };
  }
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
  g.anim = null;
  if (res.holed) { holeDone(w, g.strokes, 'cup'); return; }
  g.lie = { x: res.end.x, y: res.end.y };
  const left = Math.hypot(h.cup.x - g.lie.x, h.cup.y - g.lie.y);
  if (inBunker(h, g.lie.x, g.lie.y)) { g.flash = { text: 'In het zand', t: 2.4, bad: true }; say(w, 'bunker'); }
  else if (!onGreen(h, g.lie.x, g.lie.y)) { g.flash = { text: `Naast de green, nog ${Math.round(left)} m`, t: 2.4, bad: true }; if (g.strokes === 1) say(w, 'rough'); }
  else g.flash = { text: `Op de green, nog ${left < 10 ? left.toFixed(1) : Math.round(left)} m`, t: 2.4 };
  if (g.strokes >= h.par + MAX_OVER_PAR) { holeDone(w, g.strokes, 'opgepakt'); return; }
  g.phase = 'landed';
  g.phaseT = 0;
}

function holeDone(w, strokes, why) {
  const g = game;
  const h = HOLES[g.hole];
  finishHole(g.card, g.hole, strokes);
  const name = why === 'opgepakt' ? 'Opgepakt' : holeName(strokes, h.par);
  g.flash = { text: `${name}: ${strokes} slag${strokes === 1 ? '' : 'en'} (par ${h.par})`, t: 3, bad: strokes > h.par };
  const d = strokes - h.par;
  say(w, strokes === 1 && why !== 'opgepakt' ? 'hole1' : d < 0 ? 'birdie' : d === 0 ? 'par' : 'bogey', true);
  g.phase = 'holeDone';
  g.phaseT = 0;
  if (built) built.ball.position.set(h.cup.x, 0.02, h.cup.y);
}

function nextHole(w) {
  const g = game;
  g.hole++;
  if (g.hole >= HOLES.length) { end(w); return; }
  beginHole(w);
}

function stepBall(w, dt) {
  const g = game;
  const a = g.anim;
  a.t += dt;
  const idx = a.t / a.step;
  const last = a.path.length - 1;
  const i = Math.min(last, Math.floor(idx)), j = Math.min(last, i + 1);
  const k = Math.min(1, idx - i);
  const p = a.path[i], q = a.path[j];
  const x = p[0] + (q[0] - p[0]) * k, y = p[1] + (q[1] - p[1]) * k, z = p[2] + (q[2] - p[2]) * k;
  a.pos = { x, y, z };
  if (built) built.ball.position.set(x, BALL_R + z, y);
  if (idx >= last + 6) ballDone(w);
}

// --- the loop --------------------------------------------------------------------------------------------------------

function updateGame(w, dt) {
  const g = game;
  const input = w.input;
  g.t += dt;
  g.phaseT += dt;
  if (g.flash && (g.flash.t -= dt) <= 0) g.flash = null;
  if (stopPressed(input)) { end(w, { quit: true }); return; }
  const p = w.player;
  p.speed = 0; p.moving = false; p.vx = 0; p.vy = 0; p.z = 0;
  if (g.phase === 'aim') {
    const putting = mode(g) === 'putt';
    const slow = input.isDown('shift') ? 0.25 : 1;
    const ax = (input.isDown('d') || input.isDown('arrowright') ? 1 : 0) - (input.isDown('a') || input.isDown('arrowleft') ? 1 : 0);
    g.yaw += ax * dt * (putting ? 0.32 : 0.5) * slow;
    p.angle = g.yaw;
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
    if (g.phaseT > 1.4) { setLie(w); g.phase = 'aim'; g.phaseT = 0; g.cam = null; }
  } else if (g.phase === 'holeDone') {
    if (g.phaseT > 3) nextHole(w);
  }
}

function end(w, { quit = false } = {}) {
  const g = game;
  if (!g) return;
  game = null;
  w.companionHold = null;
  w.cameraOverride = null;
  if (board) board.hide();
  clearBubbles(w, 'pitchputt');
  if (built) { built.line.visible = false; built.ring.visible = false; built.ball.visible = false; built.keeper.visible = !quit; built.keeperUntil = w.time + 14; built.holes.forEach((hh) => { hh.arrows.visible = false; }); }
  if (quit) { w.addMessage('Pitch & putt gestopt', 2.5); return; }
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

function previewLine() {
  const g = game;
  if (!built) return;
  if (g.phase !== 'aim') { built.line.visible = false; built.ring.visible = false; return; }
  const h = HOLES[g.hole];
  const putting = mode(g) === 'putt';
  const dist = Math.hypot(h.cup.x - g.lie.x, h.cup.y - g.lie.y);
  const reach = putting ? Math.min(dist * 1.25 + 2, 22) : Math.max(8, g.charging ? PITCH_MAX * Math.max(0.05, g.charge) : dist);
  const sig = [g.yaw.toFixed(3), reach.toFixed(1), g.lie.x, g.lie.y].join('|');
  if (aimLine === sig) return;
  aimLine = sig;
  const pos = built.line.geometry.attributes.position;
  pos.setXYZ(0, g.lie.x, 0.12, g.lie.y);
  pos.setXYZ(1, g.lie.x + Math.cos(g.yaw) * reach, 0.12, g.lie.y + Math.sin(g.yaw) * reach);
  pos.needsUpdate = true;
  built.line.visible = true;
  built.ring.visible = !putting;
  if (!putting) built.ring.position.set(g.lie.x + Math.cos(g.yaw) * reach, 0.1, g.lie.y + Math.sin(g.yaw) * reach);
}

function sync3D(w, dt) {
  if (!built) return;
  if (game) previewLine();
  if (built.keeper.visible) {
    animatePersonWalk(built.keeper, 0, dt);
    if (!game && built.keeperUntil && w.time > built.keeperUntil) { built.keeper.visible = false; built.keeperUntil = 0; clearBubbles(w, 'pitchputt'); }
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
    pos = { x: h.cup.x - 4, y: h.cup.y - 4, z: 2.2 };
    at = { x: h.cup.x, y: h.cup.y, z: 0.4 };
  } else {
    const back = putting ? 3.4 : 9;
    const to = putting ? { x: g.lie.x + Math.cos(g.yaw) * Math.min(14, Math.hypot(h.cup.x - g.lie.x, h.cup.y - g.lie.y)) * 0.6, y: g.lie.y + Math.sin(g.yaw) * Math.min(14, Math.hypot(h.cup.x - g.lie.x, h.cup.y - g.lie.y)) * 0.6 } : { x: g.lie.x + Math.cos(g.yaw) * 30, y: g.lie.y + Math.sin(g.yaw) * 30 };
    pos = { x: g.lie.x - Math.cos(g.yaw) * back, y: g.lie.y - Math.sin(g.yaw) * back, z: putting ? 1.7 : 4.4 };
    at = { x: to.x, y: to.y, z: putting ? 0.2 : 1.5 };
  }
  const c = easeCamera(g, pos, at, g.phase === 'ball' ? 0.2 : 0.1);
  w.cameraOverride = { position: c.position, lookAt: c.lookAt, fov: putting ? 50 : 58, cut: true };
}

function ensureBoard() {
  if (!board) board = createBoard('PITCH & PUTT', ACCENT);
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

function updateHud() {
  const g = game;
  if (!g || !board) return;
  const h = HOLES[g.hole];
  const dist = Math.hypot(h.cup.x - g.lie.x, h.cup.y - g.lie.y);
  const putting = mode(g) === 'putt';
  const t = cardTotals(g.card);
  const row = `<span>Baan <b>${h.n}</b>/${HOLES.length}</span><span>Par <b>${h.par}</b></span><span>Slag <b>${g.phase === 'aim' ? g.strokes + 1 : g.strokes}</b></span><span>Vlag <b>${dist < 10 ? dist.toFixed(1).replace('.', ',') : Math.round(dist)} m</b></span><span>${putting ? 'Putter' : g.bunker ? 'Wedge (zand)' : 'Wedge'}</span>`;
  const cells = g.card.holes.map((c, i) => ({ t: c.done ? String(c.strokes) : i === g.hole ? `${g.strokes || '·'}` : String(c.n), cls: `${i === g.hole ? 'on' : ''} ${c.done ? (c.strokes <= c.par ? 'good' : 'bad') : ''}` }));
  const mark = putting ? straightPower(dist) : powerForCarry(dist);
  const flash = g.flash ? g.flash.text : g.phase === 'aim' ? (putting ? slopeText(g) : g.bunker ? 'Uit het zand: meer spreiding' : 'Mik op de vlag') : '';
  const help = g.phase === 'aim'
    ? `${key('A')}${key('D')} richten (${key('SHIFT')} fijn) · houd ${key('SPATIE')} en laat los bij het streepje · ${key('BACKSPACE')} stoppen · totaal ${relText(t.rel)}`
    : `Totaal ${relText(t.rel)} · ${key('BACKSPACE')} stoppen`;
  board.set({ row, cells, meter: g.phase === 'aim' ? { v: g.charge, mark: clamp(mark, 0, 1), color: '#46b36a' } : null, flash, bad: !!(g.flash && g.flash.bad), help });
}

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
      holes: () => HOLES.map((h) => ({ n: h.n, par: h.par, len: Math.round(h.len), tee: { ...h.tee }, cup: { ...h.cup } })),
      start: (force = true) => start(w, { force }),
      state: () => (game ? { phase: game.phase, hole: game.hole, strokes: game.strokes, lie: { ...game.lie }, mode: mode(game), card: cardTotals(game.card) } : null),
      shoot: (power = 0.8, over = {}) => (game && game.phase === 'aim' ? (shoot(w, power, over), true) : false),
      sink: () => { if (!game) return false; if (game.phase === 'ball') ballDone(w); if (game && game.phase !== 'holeDone') holeDone(w, Math.max(1, game.strokes + 1), 'cup'); return true; },
      skip: () => { if (!game) return false; game.phase = 'holeDone'; game.phaseT = 99; return true; },
      finish: () => { if (!game) return false; for (let i = game.hole; i < HOLES.length; i++) { game.hole = i; holeDone(w, HOLES[i].par, 'cup'); } game.hole = HOLES.length - 1; nextHole(w); return true; },
      quit: () => { if (!game) return false; end(w, { quit: true }); return true; },
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
    updateHud();
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
