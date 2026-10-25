import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { canvasTex } from './canvastex.js';
import { getScene } from './scene3d.js';
import { buildPersonMesh, animatePersonWalk } from './models3d_people.js';
import { showBanner } from './cinematics.js';
import { unlockAchievement, recordChallengeResult, getChallengeRecord, recordStat, setStatMax, MEDALS } from './achievements.js';
import { showCard } from './hudcards.js';
import { spawnFxPuff } from './fx3d.js';
import { pushAudioEvent } from './pedgeom.js';
import { WATER_Y } from './util.js';
import { standActivity, recLine } from './standactivity.js';
import { createBoard, mgThema, key, bubble, clearBubbles, pick, stopPressed, easeCamera, geo, frame } from './minigamekit.js';
import { SKI_LINES } from './minigamelines2.js';
import { SKI, createSki, makeGates, stepSki, boatLat, skiMedal, finalScore, MEDAL_AT } from './skirules.js';

// Waterskibaan Grunopark: a boat tows you along a 480 m stretch of the lake
// (the long straight of the Kardinge lake) on a 14 m rope. A and D lean you
// out, Space pops you over the wake for a jump, in the air A and D spin and E
// grabs the ski; swing wide round the buoys. Three falls end the run. Medals
// and record in points. Free. Rules: skirules.js. `window.__waterski` debug.
const ACCENT = mgThema('waterski').accent; // één bron voor het HUD-thema: minigamekit.js (#453)
const ORIGIN = geo(53.22442, 6.59434);
const ROT = 0.261;
const FR = frame(ORIGIN, ROT);
const STAND = FR.toW(-8, 0);
const DETAIL_M = 700;
const INTRO_S = 1.6;
const SURF = WATER_Y + 0.05;

let game = null;
let built = null;
let board = null;
let lodT = 0;
let runs = 0;

const boaterLook = { shirt: 0x2f6fb0, skin: 0xd8a47c, variant: 'male', seed: 6613, look: { age: 'adult', hat: 'cap', hatColor: 0xf0f0e8, bag: null, umbrella: null } };

// --- meshes ---------------------------------------------------------------------------------------

function signTexture() {
  return canvasTex(384, 128, (g) => {
    g.fillStyle = '#27b0b8'; g.fillRect(0, 0, 384, 128);
    g.fillStyle = '#fff'; g.font = 'bold 34px Arial'; g.textAlign = 'center';
    g.fillText('WATERSKIBAAN', 192, 54); g.font = 'bold 30px Arial'; g.fillText('Grunopark', 192, 96);
  });
}

function buildBoat() {
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
  const g = new THREE.Group();
  const add = (geo2, mat, x, y, z) => { const m = new THREE.Mesh(geo2, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  add(new THREE.BoxGeometry(5.6, 0.7, 1.9), std(0xf2f0e6), 0, 0.35, 0);
  add(new THREE.BoxGeometry(5.7, 0.14, 1.95), std(0x2f6fb0), 0, 0.55, 0);
  add(new THREE.BoxGeometry(1.4, 0.55, 1.5), std(0x2f3a44), -0.3, 0.95, 0);
  add(new THREE.BoxGeometry(0.1, 0.5, 1.5), std(0x9fd0e0, { transparent: true, opacity: 0.7 }), 0.45, 1.05, 0);
  add(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6), std(0xd8d8d8), -2.7, 1.0, 0);
  const driver = buildPersonMesh(boaterLook.shirt, boaterLook.skin, boaterLook);
  driver.position.set(-0.7, 0.45, 0.35);
  driver.scale.setScalar(0.9);
  g.add(driver);
  return { g, driver };
}

function buildSite() {
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
  const grp = new THREE.Group();
  const s = FR.toW(-4.5, 0);
  grp.position.set(s.x, 0, s.y);
  grp.rotation.y = -ROT;
  const add = (geo2, mat, x, y, z) => { const m = new THREE.Mesh(geo2, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; grp.add(m); return m; };
  // a jetty out over the water
  add(new THREE.BoxGeometry(7, 0.18, 2.6), std(0x8a6a44), 3.5, SURF + 0.35, 0);
  for (const x of [0.5, 3.5, 6.5]) for (const z of [-1.1, 1.1]) add(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6), std(0x5a4a38), x, SURF - 0.1, z);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.4), new THREE.MeshBasicMaterial({ map: signTexture(), side: THREE.DoubleSide }));
  sign.position.set(-3.5, 2.6, 3.4);
  sign.rotation.y = Math.PI / 2;
  grp.add(sign);
  for (const z of [1.7, 5.1]) add(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), std(0x4a4e52, { metalness: 0.4 }), -3.5, 1.3, z);
  const boat = buildBoat();
  const ski = new THREE.Group();
  for (const z of [-0.14, 0.14]) { const m = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.03, 0.12), std(0xff7a2a)); m.position.set(0, 0.02, z); ski.add(m); }
  ski.visible = false;
  const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, 1)]);
  const rope = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xf0e0b0 }));
  rope.frustumCulled = false;
  rope.visible = false;
  const buoys = new THREE.Group();
  const gates = [];
  makeGates().forEach((gt) => {
    const sm = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), std(0xff4a2a, { emissive: 0x301008 }));
    const q = FR.toW(gt.s, gt.side * SKI.gate.side);
    sm.position.set(q.x, SURF + 0.15, q.y);
    buoys.add(sm);
    gates.push(sm);
  });
  getScene().add(grp, boat.g, ski, rope, buoys);
  return { grp, boat, ski, rope, buoys, gates, boatPos: { x: STAND.x, y: STAND.y } };
}

function boatPlace(b, sB, v) {
  const q = FR.toW(sB, boatLat(sB));
  const dl = (boatLat(sB + 1) - boatLat(sB - 1)) / 2;
  b.g.position.set(q.x, SURF - 0.1, q.y);
  if (built && built.boat === b) { built.boatPos.x = q.x; built.boatPos.y = q.y; }
  b.g.rotation.y = -(ROT + Math.atan2(dl, 1));
  b.g.rotation.z = Math.min(0.12, v * 0.01);
}

function updateLod(w) {
  const d = Math.hypot(w.player.x - ORIGIN.x, w.player.y - ORIGIN.y);
  if (!built && d < DETAIL_M) built = buildSite();
  if (!built) return;
  const show = d < DETAIL_M + 100 || !!game;
  built.grp.visible = built.buoys.visible = show;
  built.boat.g.visible = show;
  if (!game) boatPlace(built.boat, SKI.rope + 2, 0);
}

// --- the run ---------------------------------------------------------------------------------------------

function skierPose(w, g) {
  const s = g.s, p = w.player;
  const q = FR.toW(s.sS, s.px);
  p.x = q.x; p.y = q.y;
  p.gz = 0;
  const dl = (boatLat(s.sS + 1) - boatLat(s.sS - 1)) / 2;
  const heading = ROT + Math.atan2(dl, 1);
  g.heading = heading;
  p.angle = heading + s.spin;
  p.vx = Math.cos(heading) * s.vB; p.vy = Math.sin(heading) * s.vB;
  p.speed = s.vB;
  p.moving = true;
  if (s.fall > 0) {
    p.swimming = true; p.water = 'swim'; p.swimTilt = -1.25; p.crouching = false; p.z = WATER_Y - 0.25;
    built.ski.visible = false;
  } else {
    p.swimming = false; p.water = null; p.swimTilt = 0; p.crouching = !s.air;
    p.z = WATER_Y + 0.08 + Math.max(0, s.z);
    built.ski.visible = true;
    built.ski.position.set(q.x, p.z - 0.05, q.y);
    built.ski.rotation.y = -p.angle;
  }
  // the rope from the boat's stern to the skier's hands
  const bq = FR.toW(s.sB, boatLat(s.sB));
  const pts = built.rope.geometry.attributes.position;
  pts.setXYZ(0, bq.x, SURF + 1.0, bq.y);
  pts.setXYZ(1, q.x, p.z + 1.05, q.y);
  pts.needsUpdate = true;
  built.rope.visible = true;
  boatPlace(built.boat, s.sB, s.vB);
}

function say(w, kind, force = false, after = false) {
  const list = SKI_LINES[kind];
  if (!list || !built) return;
  const g = game;
  if (g && !force && g.t - g.said < 7) return;
  if (g) g.said = g.t;
  bubble(w, { x: built.boatPos.x, y: built.boatPos.y, follow: built.boatPos, name: SKI_LINES.who, text: pick(list), h: 2.4, tag: 'waterski', ttl: after ? 4.5 : 0 });
}

function splash(w, x, y, big) {
  pushAudioEvent(w, { kind: 'splash', x, y });
  for (let k = 0; k < (big ? 14 : 5); k++) {
    const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * (big ? 4 : 2);
    spawnFxPuff(x, SURF + 0.2, y, Math.cos(a) * sp, 2 + Math.random() * 3, Math.sin(a) * sp, 0.9, 0.15, 0.7, 0.92, 0.97, 1, 0.8, 2, -5);
  }
}

function updateGame(w, dt) {
  const g = game, s = g.s, input = w.input;
  g.t += dt;
  g.dt = dt; // de camera rekent per seconde (#436)
  if (g.flash && (g.flash.t -= dt) <= 0) g.flash = null;
  if (stopPressed(input)) { end(w, { quit: true }); return; }
  if (g.phase === 'outro') {
    g.phaseT -= dt;
    if (g.phaseT <= 0) { end(w); return; }
    skierPose(w, g);
    return;
  }
  const k = (a, b) => input.isDown(a) || input.isDown(b);
  const inp = { steer: (k('a', 'arrowleft') ? 1 : 0) - (k('d', 'arrowright') ? 1 : 0), jump: false, grab: false, spin: 0 };
  inp.spin = inp.steer;
  if (input.wasPressed(' ')) { input.consume(' '); inp.jump = true; }
  if (input.wasPressed('e')) { input.consume('e'); inp.grab = true; }
  if (g.phase === 'intro') {
    g.phaseT -= dt;
    inp.steer = 0; inp.jump = false;
    if (g.phaseT <= 0) g.phase = 'run';
    else { skierPose(w, g); return; }
  }
  const ev = stepSki(s, inp, dt);
  for (const e of ev) onEvent(w, e);
  // a trail of spray behind the skier and the boat
  g.sprayT -= dt;
  if (g.sprayT <= 0 && s.air === 0 && s.fall <= 0) {
    g.sprayT = 0.06;
    const q = FR.toW(s.sS - 0.8, s.px);
    spawnFxPuff(q.x, SURF + 0.15, q.y, (Math.random() - 0.5) * 1.5, 1 + Math.random(), (Math.random() - 0.5) * 1.5, 0.7, 0.12, 0.55, 0.92, 0.97, 1, 0.7, 2, -3);
    const bq = FR.toW(s.sB - 3, boatLat(s.sB - 3));
    spawnFxPuff(bq.x, SURF + 0.2, bq.y, (Math.random() - 0.5), 0.8, (Math.random() - 0.5), 1.1, 0.3, 1.2, 0.95, 0.98, 1, 0.55, 2, -2);
  }
  // buoys that were passed go green, the missed ones grey
  built.gates.forEach((m, i) => {
    const gt = s.gates[i];
    if (gt.done) m.material.color.setHex(gt.hit ? 0x3adf6a : 0x7d8488);
  });
  if (s.phase === 'done' || s.phase === 'over') { g.phase = 'outro'; g.phaseT = 2.4; }
  skierPose(w, g);
}

function onEvent(w, e) {
  const g = game, s = g.s;
  const q = FR.toW(s.sS, s.px);
  if (e.type === 'jump') { g.flash = { text: 'Hoog! Spin met A en D, grab met E', t: 1.4 }; say(w, 'jump'); }
  else if (e.type === 'land') {
    g.flash = { text: `Schone landing +${e.points}${e.spins ? ` · ${e.spins}× spin` : ''}${e.grab ? ' · grab' : ''} · x${e.mult}`, t: 2 };
    if (e.spins >= 1 && e.grab && e.air > 0.9) g.big = true;
    splash(w, q.x, q.y, true);
    say(w, 'clean');
  } else if (e.type === 'gate') { g.flash = { text: `Boei! +${e.points}`, t: 1.2 }; say(w, 'gate'); }
  else if (e.type === 'miss') g.flash = { text: 'Boei gemist: zwaai verder uit', t: 1.4, bad: true };
  else if (e.type === 'fall') {
    const why = e.why === 'landing' ? 'Slechte landing' : e.why === 'oever' ? 'Tegen de oever' : 'Touw los';
    g.flash = { text: `${why}! Gevallen (${e.falls}/${SKI.tries})`, t: 2, bad: true };
    splash(w, q.x, q.y, true);
    say(w, 'fall', true);
  } else if (e.type === 'bump') {
    if (g.t - g.bumpAt > 6) { g.bumpAt = g.t; g.flash = { text: 'Druk Spatie als je de golf kruist voor een sprong', t: 1.8 }; }
  }
}

function end(w, { quit = false } = {}) {
  const g = game;
  if (!g) return;
  game = null;
  w.companionHold = null;
  w.cameraOverride = null;
  const p = w.player;
  p.z = 0; p.gz = undefined; p.swimming = false; p.water = null; p.swimTilt = 0; p.vx = p.vy = 0; p.speed = 0; p.moving = false; p.crouching = false;
  if (board) board.hide();
  clearBubbles(w, 'waterski');
  if (built) { built.ski.visible = false; built.rope.visible = false; built.gates.forEach((m) => m.material.color.setHex(0xff4a2a)); boatPlace(built.boat, SKI.rope + 2, 0); }
  p.x = STAND.x; p.y = STAND.y; p.angle = ROT;
  if (quit) { w.addMessage('Waterskiën gestopt', 2.5); return; }
  const s = g.s;
  const score = finalScore(s);
  const medal = skiMedal(score);
  const rec = recordChallengeResult(w, 'waterski', { value: score, medal });
  recordStat(w, 'skiRuns');
  setStatMax(w, 'skiBest', score);
  unlockAchievement(w, 'ski_klaar');
  if (medal >= 3) unlockAchievement(w, 'ski_goud');
  if (g.big) unlockAchievement(w, 'ski_sprong');
  const stats = [['Score', score.toLocaleString('nl-NL')], ['Boeien', `${s.gateHits}/${s.gates.length}`], ['Sprongen', String(s.jumps)], ['Gevallen', String(s.falls)]];
  if (medal) stats.push(['Medaille', MEDALS[medal]]);
  if (rec && rec.newBest) stats.push(['Record', 'Nieuw!']);
  showBanner({ kind: medal ? 'pass' : 'fail', title: medal >= 3 ? 'KONING VAN HET MEER' : medal ? 'MOOIE RONDE' : 'NAT GEWORDEN', reason: medal ? `${score.toLocaleString('nl-NL')} punten achter de boot` : 'Leun uit voor de boeien en spring over de golven voor punten', reward: 0, stats });
  say(w, medal >= 2 ? 'endGood' : 'endPoor', true, true);
}

// --- camera and HUD -------------------------------------------------------------------------------------------

function camera(w) {
  const g = game;
  if (!g) return;
  const s = g.s;
  const h = g.heading || ROT;
  const q = FR.toW(s.sS, s.px);
  const pos = { x: q.x - Math.cos(h) * 9, y: q.y - Math.sin(h) * 9, z: SURF + 3.4 + Math.max(0, s.z) * 0.5 };
  const at = { x: q.x + Math.cos(h) * 6, y: q.y + Math.sin(h) * 6, z: SURF + 1.2 + Math.max(0, s.z) * 0.6 };
  const c = easeCamera(g, pos, at, 0.1);
  w.cameraOverride = { position: c.position, lookAt: c.lookAt, fov: 64, cut: true };
}

function ensureBoard() {
  if (!board) board = createBoard('waterski');
  return board;
}

function updateHud() {
  const g = game;
  if (!g || !board) return;
  const s = g.s;
  const row = `<span>Score <b>${Math.round(s.score).toLocaleString('nl-NL')}</b></span><span>Afstand <b>${Math.round(s.dist)}/${SKI.len} m</b></span><span>Boeien <b>${s.gateHits}/${s.gates.length}</b></span><span>Reeks <b>x${s.mult}</b></span><span>Valpogingen <b>${Math.max(0, SKI.tries - s.falls)}</b></span>`;
  const flash = g.flash ? g.flash.text : g.phase === 'intro' ? 'Houd de lijn strak...' : '';
  const help = `${key('A')}${key('D')} uitleunen (in de lucht: draaien) · ${key('SPATIE')} sprong over de golf · ${key('E')} grab · ${key('BACKSPACE')} stoppen`;
  board.set({ row, flash, bad: !!(g.flash && g.flash.bad), help });
}

function glyph(ctx) {
  ctx.fillStyle = '#f2ede0';
  ctx.beginPath(); ctx.moveTo(-3, 2); ctx.lineTo(0, 0.6); ctx.lineTo(3, 2); ctx.lineTo(2, 3); ctx.lineTo(-2, 3); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#f2ede0'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(0, 0.6); ctx.lineTo(-1.8, -2.6); ctx.stroke();
  ctx.beginPath(); ctx.arc(-1.9, -3, 0.7, 0, Math.PI * 2); ctx.fill();
}

// --- start -----------------------------------------------------------------------------------------------

function start(w) {
  if (game) return false;
  if (!built) built = buildSite();
  const p = w.player;
  if (p.inVehicle) p.exitVehicle(w.map, w);
  ensureBoard();
  board.show();
  runs++;
  game = { t: 0, phase: 'intro', phaseT: INTRO_S, s: createSki(), flash: null, cam: null, said: 0, sprayT: 0, heading: ROT, big: false, bumpAt: -9 };
  const side = FR.toW(-10, 6);
  w.companionHold = { x: side.x, y: side.y, face: ROT };
  built.gates.forEach((m) => m.material.color.setHex(0xff4a2a));
  showCard(w, { kind: 'tip', kicker: 'Waterskiën', title: 'Achter de boot', body: '[A] en [D] leunen je naar links en rechts, het touw trekt je terug. Zwaai ruim om de boeien. [Spatie] als je de golf kruist is een sprong; in de lucht draaien [A] en [D], [E] is een grab.', duration: 11, key: 'waterski-help', voice: false });
  say(w, 'start', true);
  skierPose(w, game);
  return true;
}

function recText() {
  const r = getChallengeRecord('waterski');
  return r && r.best != null ? `Record: ${Math.round(r.best).toLocaleString('nl-NL')} punten${r.medal ? ' · ' + MEDALS[r.medal].toLowerCase() : ''}` : null;
}

export const WATERSKI = standActivity({
  id: 'waterski',
  name: 'Waterskibaan Grunopark',
  label: 'Waterskiën',
  note: 'waterskibaan bij het Grunopark: achter de boot, sprongen en boeien',
  accent: ACCENT,
  stand: () => STAND,
  origin: () => ORIGIN,
  useRadius: 3.2,
  labelRadius: 160,
  sub: 'Achter de boot over het meer · gratis',
  hint: 'Loop naar de steiger en druk E',
  ubboSub: 'waterskiën achter de boot, gratis',
  where: 'de waterskibaan bij het Grunopark',
  recText,
  glyph,
  isActive: () => !!game,
  start,
  quit: (w) => end(w, { quit: true }),
  update: (dt, w) => updateGame(w, dt),
  tick(dt, w) {
    if ((lodT -= dt) <= 0) { lodT = 0.5; updateLod(w); }
    if (built && built.boat.driver) animatePersonWalk(built.boat.driver, 0, dt);
    updateHud();
  },
  camera,
  debug: (w) => ({
    spot: () => ({ ...STAND }),
    origin: () => ({ ...ORIGIN, rot: ROT }),
    start: () => start(w),
    state: () => (game ? { phase: game.phase, ski: { phase: game.s.phase, sS: game.s.sS, px: game.s.px, score: game.s.score, falls: game.s.falls, air: game.s.air } } : null),
    finish: () => { if (!game) return false; game.phase = 'outro'; game.phaseT = 0.01; game.s.phase = 'done'; game.s.score = 1500; game.s.gateHits = 4; return true; },
    quit: () => { if (!game) return false; end(w, { quit: true }); return true; },
  }),
});
