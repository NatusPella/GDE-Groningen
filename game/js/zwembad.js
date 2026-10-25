import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { canvasTex } from './canvastex.js';
import { getScene } from './scene3d.js';
import { buildPersonMesh, animatePersonWalk } from './models3d_people.js';
import { showBanner } from './cinematics.js';
import { unlockAchievement, recordChallengeResult, getChallengeRecord, recordStat, MEDALS } from './achievements.js';
import { showCard } from './hudcards.js';
import { spawnFxPuff } from './fx3d.js';
import { pushAudioEvent } from './pedgeom.js';
import { standActivity, recLine } from './standactivity.js';
import { createBoard, mgThema, key, bubble, clearBubbles, pick, stopPressed, easeCamera, geo, frame, fmtTime, clamp } from './minigamekit.js';
import { POOL_LINES } from './minigamelines2.js';
import { POOL, SWIM, createSwim, stepSwim, diveMarker, swimMedal, MEDAL_AT } from './swimrules.js';

// Zwembad Het Natte Papier (invented name) at the Papiermolenlaan: a small
// outdoor pool with a 25 m lane. Four lengths after a dive from the block:
// A and D alternate for the strokes (about every half second), Space dives
// when the marker is in the green and flips the turns at the wall. Medals by
// time, record in seconds (lower is better). Free. Rules: swimrules.js.
// `window.__zwembad` debug.
const ACCENT = mgThema('zwembad').accent; // één bron voor het HUD-thema: minigamekit.js (#453)
const ORIGIN = geo(53.203403, 6.57101);
const ROT = 0;
const FR = frame(ORIGIN, ROT);
const STAND = FR.toW(-15, 9.5);
const GUARD = FR.toW(0, 10.4);
const WATER_H = 0.82;
const BLOCK_H = 1.15;
const DETAIL_M = 380;
const INTRO_S = 1.5;

let game = null;
let built = null;
let board = null;
let lodT = 0;
let runs = 0;

const guardLook = { shirt: 0xe8523a, skin: 0xd8a47c, variant: 'male', seed: 4412, look: { age: 'adult', hat: null, bag: null, umbrella: null } };

// --- meshes ---------------------------------------------------------------------------------------

function poolTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 512, 256);
  grad.addColorStop(0, '#4fc3e8'); grad.addColorStop(1, '#2a9ac8');
  g.fillStyle = grad; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = '#17273a'; g.lineWidth = 5;
  for (let i = 0; i < POOL.lanes; i++) {
    const y = 26 + i * 51;
    g.beginPath(); g.moveTo(14, y); g.lineTo(498, y); g.stroke();
    g.beginPath(); g.moveTo(14, y - 12); g.lineTo(14, y + 12); g.moveTo(498, y - 12); g.lineTo(498, y + 12); g.stroke();
  }
  g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 2;
  for (let i = 0; i < 24; i++) { g.beginPath(); g.arc(Math.random() * 512, Math.random() * 256, 8 + Math.random() * 18, 0, Math.PI * 1.4); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function signTexture() {
  return canvasTex(384, 128, (g) => {
    g.fillStyle = '#2f9fd0'; g.fillRect(0, 0, 384, 128);
    g.fillStyle = '#fff'; g.font = 'bold 36px Arial'; g.textAlign = 'center';
    g.fillText('ZWEMBAD', 192, 52); g.font = 'bold 30px Arial'; g.fillText('Het Natte Papier', 192, 96);
  });
}

function buildPool() {
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
  const grp = new THREE.Group();
  grp.position.set(ORIGIN.x, 0.02, ORIGIN.y);
  grp.rotation.y = -ROT;
  const add = (geo2, mat, x, y, z, parent = grp) => { const m = new THREE.Mesh(geo2, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const L = POOL.len, W = POOL.width;
  add(new THREE.BoxGeometry(L + 12, 0.06, W + 14), std(0xd7d1c0), 0, 0.0, 0);
  // the basin walls and the water
  const wall = std(0xe9eef0);
  add(new THREE.BoxGeometry(L + 1, WATER_H + 0.18, 0.5), wall, 0, (WATER_H + 0.18) / 2, -W / 2 - 0.25);
  add(new THREE.BoxGeometry(L + 1, WATER_H + 0.18, 0.5), wall, 0, (WATER_H + 0.18) / 2, W / 2 + 0.25);
  add(new THREE.BoxGeometry(0.5, WATER_H + 0.18, W), wall, -L / 2 - 0.25, (WATER_H + 0.18) / 2, 0);
  add(new THREE.BoxGeometry(0.5, WATER_H + 0.18, W), wall, L / 2 + 0.25, (WATER_H + 0.18) / 2, 0);
  add(new THREE.BoxGeometry(L, 0.04, W), std(0x4a8ca8), 0, 0.02, 0);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(L, W), new THREE.MeshBasicMaterial({ map: poolTexture(), transparent: true, opacity: 0.88 }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, WATER_H, 0);
  grp.add(water);
  // the lane ropes
  const rope = std(0xe8523a);
  for (let i = 1; i < POOL.lanes; i++) {
    const v = -W / 2 + i * (W / POOL.lanes);
    const r = add(new THREE.CylinderGeometry(0.04, 0.04, L - 0.4, 6).rotateZ(Math.PI / 2), rope, 0, WATER_H + 0.02, v);
    r.castShadow = false;
  }
  // start blocks at the west end, steps and a ladder
  for (let i = 0; i < POOL.lanes; i++) {
    const v = -W / 2 + (i + 0.5) * (W / POOL.lanes);
    add(new THREE.BoxGeometry(0.9, BLOCK_H - 0.82 - 0.04 + 0.5, 0.7), std(0xf2f0e6), -L / 2 - 0.9, 0.82 + 0.1, v);
  }
  // a sign, a lifeguard chair, flags
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.4), new THREE.MeshBasicMaterial({ map: signTexture(), side: THREE.DoubleSide }));
  sign.position.set(-L / 2 - 4, 2.6, 8.8);
  grp.add(sign);
  for (const s of [-1.9, 1.9]) add(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), std(0x4a4e52, { metalness: 0.4 }), -L / 2 - 4 + s, 1.3, 8.8);
  add(new THREE.BoxGeometry(0.9, 0.12, 0.9), std(0xf0c030), 0, 1.5, 10.4);
  for (const [dx, dz] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) add(new THREE.BoxGeometry(0.08, 1.5, 0.08), std(0xf0c030), dx, 0.75, 10.4 + dz);
  // the floating swimmer: the player stays the player; this is only a ripple ring
  const guard = buildPersonMesh(guardLook.shirt, guardLook.skin, guardLook);
  guard.position.set(GUARD.x, 1.55, GUARD.y);
  guard.rotation.y = -(ROT - Math.PI / 2);
  getScene().add(grp, guard);
  return { grp, guard, water };
}

function updateLod(w) {
  const d = Math.hypot(w.player.x - ORIGIN.x, w.player.y - ORIGIN.y);
  if (!built && d < DETAIL_M) built = buildPool();
  if (!built) return;
  built.grp.visible = built.guard.visible = d < DETAIL_M + 80 || !!game;
}

// --- the swim ----------------------------------------------------------------------------------------

const laneV = 0;
function worldOf(x) {
  const q = FR.toW(-POOL.len / 2 + x, laneV);
  return q;
}

function place(w, dt) {
  const g = game, p = w.player, s = g.s;
  p.moving = true;
  p.crouching = false;
  if (g.s.phase === 'block') {
    const q = FR.toW(-POOL.len / 2 - 0.9, laneV);
    p.x = q.x; p.y = q.y; p.angle = ROT; p.z = BLOCK_H; p.vx = p.vy = 0; p.speed = 0; p.swimming = false; p.water = null; p.swimTilt = 0;
    return;
  }
  const q = worldOf(s.x);
  p.x = q.x; p.y = q.y;
  const heading = ROT + (s.dir > 0 ? 0 : Math.PI);
  // a flip turn rolls over once
  if (g.roll > 0) { g.roll -= dt; p.swimTilt = -1.35 - (1 - clamp(g.roll / 0.55, 0, 1)) * Math.PI * 2; } else p.swimTilt = -1.35;
  p.angle = heading;
  p.swimming = true; p.water = 'swim';
  const diveK = clamp(g.diveT / 0.55, 0, 1);
  const bob = Math.sin(w.time * 5) * 0.03;
  p.z = BLOCK_H - (BLOCK_H - (WATER_H + 0.1 - 1.6 * Math.cos(-1.35) + bob)) * (1 - (1 - diveK) * (1 - diveK));
  p.vx = Math.cos(heading) * s.v; p.vy = Math.sin(heading) * s.v;
  p.speed = s.v;
  if (g.diveT < 0.55) g.diveT += dt;
}

function say(w, kind, force = false, after = false) {
  const list = POOL_LINES[kind];
  if (!list || !built) return;
  const g = game;
  if (g && !force && g.t - g.said < 8) return;
  if (g) g.said = g.t;
  bubble(w, { x: GUARD.x, y: GUARD.y, name: POOL_LINES.who, text: pick(list), h: 3.4, tag: 'zwembad', ttl: after ? 4.5 : 0 });
}

function splash(w, x, y, big) {
  pushAudioEvent(w, { kind: 'splash', x, y });
  for (let k = 0; k < (big ? 16 : 5); k++) {
    const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * (big ? 3.5 : 1.5);
    spawnFxPuff(x, WATER_H + 0.1, y, Math.cos(a) * sp, 1.5 + Math.random() * 2, Math.sin(a) * sp, 0.8, 0.12, 0.5, 0.9, 0.97, 1, 0.8, 2, -4);
  }
}

function updateGame(w, dt) {
  const g = game, s = g.s, input = w.input;
  g.t += dt;
  g.dt = dt; // de camera rekent per seconde (#436)
  if (g.flash && (g.flash.t -= dt) <= 0) g.flash = null;
  if (stopPressed(input)) { end(w, { quit: true }); return; }
  const inp = { dive: false, stroke: null, flip: false };
  if (g.phase === 'intro') {
    g.phaseT -= dt;
    if (g.phaseT <= 0) { g.phase = 'run'; s.t = 0; }
    place(w, dt);
    return;
  }
  if (input.wasPressed(' ')) { input.consume(' '); inp.dive = s.phase === 'block'; inp.flip = s.phase === 'swim'; }
  for (const k of ['a', 'd']) if (input.wasPressed(k)) { input.consume(k); if (s.phase === 'swim') inp.stroke = inp.stroke || k; }
  for (const k of ['arrowleft', 'arrowright']) if (input.wasPressed(k)) { input.consume(k); if (s.phase === 'swim') inp.stroke = inp.stroke || (k === 'arrowleft' ? 'a' : 'd'); }
  const ev = stepSwim(s, inp, dt);
  for (const e of ev) onEvent(w, e);
  if (s.phase === 'done') {
    g.outro = (g.outro || 0) + dt;
    if (g.outro > 2.4) { end(w); return; }
  }
  place(w, dt);
}

function onEvent(w, e) {
  const g = game, s = g.s;
  const q = worldOf(s.x);
  if (e.type === 'dive') {
    g.diveT = 0;
    splash(w, q.x + 3, q.y, e.q > 0.9);
    g.flash = { text: e.q >= 0.95 ? 'Mooie duik!' : e.q > 0.5 ? 'Redelijke duik' : 'Buikschuiver!', t: 1.6, bad: e.q < 0.5 };
    say(w, e.q >= 0.95 ? 'dive' : 'flop', true);
  } else if (e.type === 'stroke') {
    if (Math.random() < 0.35) splash(w, q.x, q.y, false);
    if (e.q < 0.3 && g.t - g.flailAt > 5) { g.flailAt = g.t; g.flash = { text: 'Wissel A en D, rustig ritme', t: 1.4, bad: true }; }
  } else if (e.type === 'turn') {
    g.roll = e.flip ? 0.55 : 0;
    splash(w, q.x, q.y, true);
    g.flash = { text: e.flip ? 'Mooie keerpunt!' : 'Keerpunt: druk Spatie vlak voor de muur', t: 1.4, bad: !e.flip };
    if (e.flip) say(w, 'flip');
  } else if (e.type === 'length') {
    if (e.n === POOL.lengths - 1) say(w, 'last', true);
  } else if (e.type === 'finish') {
    g.phase = 'finish';
  }
}

function end(w, { quit = false } = {}) {
  const g = game;
  if (!g) return;
  game = null;
  w.companionHold = null;
  w.cameraOverride = null;
  const p = w.player;
  p.z = 0; p.swimming = false; p.water = null; p.swimTilt = 0; p.vx = p.vy = 0; p.speed = 0; p.moving = false;
  if (board) board.hide();
  clearBubbles(w, 'zwembad');
  p.x = STAND.x; p.y = STAND.y; p.angle = ROT - Math.PI / 2;
  if (quit) { w.addMessage('Zwemmen gestopt', 2.5); return; }
  const s = g.s;
  if (s.phase !== 'done') return;
  const time = s.time;
  const medal = swimMedal(time);
  const rec = recordChallengeResult(w, 'zwembad', { value: time, medal, lower: true });
  recordStat(w, 'zwemRuns');
  unlockAchievement(w, 'zwem_klaar');
  if (medal >= 3) unlockAchievement(w, 'zwem_goud');
  if (s.flips >= 3) unlockAchievement(w, 'zwem_keer');
  const stats = [['Tijd', fmtTime(time)], ['Keerpunten', `${s.flips}/${s.turns} perfect`], ['Slagen', String(s.strokes)]];
  if (medal) stats.push(['Medaille', MEDALS[medal]]);
  if (rec && rec.newBest) stats.push(['Record', 'Nieuw!']);
  showBanner({ kind: medal ? 'pass' : 'fail', title: medal >= 3 ? 'SNELSTE VAN HET ZWEMBAD' : medal ? 'MOOIE BANEN' : 'DROOG DOEKJE?', reason: medal ? `Honderd meter in ${fmtTime(time)}` : 'Houd een rustig ritme: A, D, A, D, ongeveer twee slagen per seconde', reward: 0, stats });
  say(w, medal >= 2 ? 'endGood' : 'endPoor', true, true);
}

// --- camera and HUD -------------------------------------------------------------------------------------------

function camera(w) {
  const g = game;
  if (!g) return;
  const q = worldOf(g.s.phase === 'block' ? -0.9 : g.s.x);
  const pos = { x: q.x - 2.5 * (g.s.dir > 0 ? 1 : -1), y: q.y + 8.2, z: 3.4 };
  const at = { x: q.x + 4 * (g.s.dir > 0 ? 1 : -1), y: q.y, z: WATER_H + 0.2 };
  const c = easeCamera(g, pos, at, 0.07);
  w.cameraOverride = { position: c.position, lookAt: c.lookAt, fov: 58, cut: true };
}

function ensureBoard() {
  if (!board) board = createBoard('zwembad');
  return board;
}

function updateHud() {
  const g = game;
  if (!g || !board) return;
  const s = g.s;
  const row = `<span>Tijd <b>${fmtTime(s.time)}</b></span><span>Baan <b>${Math.min(POOL.lengths, s.length + 1)}/${POOL.lengths}</b></span><span>Afstand <b>${Math.round(s.dist)} m</b></span>`;
  let meter, flash = g.flash ? g.flash.text : g.phase === 'intro' ? 'Op het startblok...' : '';
  if (s.phase === 'block' && g.phase === 'run') {
    meter = { v: diveMarker(s.t), mark: 0.52, color: '#46b36a' };
    flash = flash || 'Spatie als de balk in het groen is';
  } else {
    meter = { v: s.stamina, color: s.stamina < SWIM.tired ? '#ff9a3c' : ACCENT };
    if (!flash && s.stamina < SWIM.tired) flash = 'Moe! Rustig aan, ritme vasthouden';
  }
  const help = `${key('A')}${key('D')} om en om zwemmen · ${key('SPATIE')} duik en keerpunt · ${key('BACKSPACE')} stoppen`;
  board.set({ row, meter, flash, bad: !!(g.flash && g.flash.bad), help });
}

// --- map icon ---------------------------------------------------------------------------------------

function glyph(ctx) {
  ctx.strokeStyle = '#f2ede0'; ctx.lineWidth = 0.9; ctx.lineCap = 'round';
  for (const y of [-1.2, 1.2]) { ctx.beginPath(); ctx.moveTo(-3, y); ctx.quadraticCurveTo(-1.5, y - 1, 0, y); ctx.quadraticCurveTo(1.5, y + 1, 3, y); ctx.stroke(); }
  ctx.fillStyle = '#f2ede0';
  ctx.beginPath(); ctx.arc(-1, -2.6, 0.9, 0, Math.PI * 2); ctx.fill();
}

// --- start -----------------------------------------------------------------------------------------------

function start(w, { force = false } = {}) {
  if (game) return false;
  if (!built) built = buildPool();
  const p = w.player;
  if (p.inVehicle) p.exitVehicle(w.map, w);
  ensureBoard();
  board.show();
  runs++;
  game = { t: 0, phase: 'intro', phaseT: INTRO_S, s: createSwim(), flash: null, cam: null, said: 0, roll: 0, diveT: 1, flailAt: -9, outro: 0 };
  const side = FR.toW(-POOL.len / 2 - 2, POOL.width / 2 + 2);
  w.companionHold = { x: side.x, y: side.y, face: ROT };
  showCard(w, { kind: 'tip', kicker: 'Zwembad', title: 'Honderd meter', body: '[Spatie] duikt als de balk in het groen is, daarna [A] en [D] om en om, ongeveer twee slagen per seconde. [Spatie] vlak voor de muur is een keerpunt.', duration: 10, key: 'zwembad-help', voice: false });
  say(w, 'start', true);
  place(w, 0);
  return true;
}

function recText() {
  return recLine(getChallengeRecord('zwembad'), fmtTime, MEDALS);
}

export const ZWEMBAD = standActivity({
  id: 'zwembad',
  name: 'Zwembad Het Natte Papier',
  label: 'Zwembad',
  note: 'zwembad aan de Papiermolenlaan: banen zwemmen',
  accent: ACCENT,
  stand: () => STAND,
  origin: () => ORIGIN,
  useRadius: 3,
  sub: 'Honderd meter zwemmen · gratis',
  hint: 'Loop naar de ingang en druk E',
  ubboSub: 'banen zwemmen, gratis',
  where: 'het zwembad aan de Papiermolenlaan',
  recText,
  glyph,
  isActive: () => !!game,
  start,
  quit: (w) => end(w, { quit: true }),
  update: (dt, w) => updateGame(w, dt),
  tick(dt, w) {
    if ((lodT -= dt) <= 0) { lodT = 0.5; updateLod(w); }
    if (built && built.guard.visible) animatePersonWalk(built.guard, 0, dt);
    updateHud();
  },
  camera,
  debug: (w) => ({
    spot: () => ({ ...STAND }),
    origin: () => ({ ...ORIGIN }),
    start: (force = true) => start(w, { force }),
    state: () => (game ? { phase: game.phase, swim: { phase: game.s.phase, x: game.s.x, v: game.s.v, length: game.s.length, dist: game.s.dist, time: game.s.time } } : null),
    finish: () => { if (!game) return false; game.phase = 'run'; game.s.phase = 'done'; game.s.time = 61.5; game.s.flips = 3; game.s.turns = 3; game.outro = 3; return true; },
    quit: () => { if (!game) return false; end(w, { quit: true }); return true; },
  }),
});
