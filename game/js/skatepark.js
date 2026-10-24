import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { buildPersonMesh, animatePersonWalk } from './models3d_people.js';
import { showBanner } from './cinematics.js';
import { unlockAchievement, recordChallengeResult, getChallengeRecord, recordStat, setStatMax, MEDALS } from './achievements.js';
import { showCard } from './hudcards.js';
import { activityBlock, iconDisc } from './activitykit.js';
import { createBoard, key, bubble, clearBubbles, pick, stopPressed, easeCamera, geo, frame, clamp } from './minigamekit.js';
import { SKATE_LINES } from './minigamelines.js';
import { loopbaanVerdien } from './loopbaanlive.js';
import { skateFx, pushFoley } from './sfx/minigamefoley.js';
import { registreerWedstrijd, zetWedGastHaken, wedNodigUit, wedNuStarten, wedHostPunt, wedGastPunt, wedScoreStop, wedGastVerlaat, wedGastReset, wedScoreRijen } from './coopwedstrijd.js';
import {
  FEATURES, PARK, RUN_S, MEDAL_AT, SKATE, createBoard as createBoardState, createCombo, stepBoard, scoreEvents, tickCombo, bankCombo, skateMedal, TRICK_NAMES,
} from './skatetricks.js';

// Skatepark Stadspark: the skatepark of the real park (OSM "Skatepark
// Stadspark"), a little widened to a concrete floor with a quarter pipe at
// each end, two kickers, a fun box with ledges and two rails. You ride a
// skateboard for 90 seconds: W pushes, S brakes (in the air: grab), A/D steer
// (in the air: spin), Space is the ollie, E a kickflip and F a heelflip.
// Over a rail or a ledge you lock on and grind: hold the balance with A/D.
// Tricks multiply with the number of different ones in the chain, a clean landing
// keeps it, a bail loses it; the chain is banked after a pause on the ground.
// Medals from the score, record in points. Money-neutral.
// Rules and scoring: skatetricks.js. `window.__skatepark` debug.
const ACCENT = '#e8523a';
const ORIGIN = geo(53.204169, 6.547889);
const ROT = -0.448;
const FR = frame(ORIGIN, ROT);
const STAND = FR.toW(-29, 0);
const USE_RADIUS = 3;
const DETAIL_M = 420;
const INTRO_S = 1.6, OUTRO_S = 2.8;
const DECK = 1.2;

let game = null;
let built = null;
let board = null;
let lodT = 0;
let runs = 0;

const skaterLook = { shirt: 0xd8a02e, skin: 0xc99a74, variant: 'male', seed: 8820, look: { age: 'young', hat: null, bag: null, umbrella: null } };

// --- meshes ---------------------------------------------------------------------------------------

let mats = null;
function materials() {
  if (mats) return mats;
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...o });
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#8f9296'; g.fillRect(0, 0, 256, 128);
  g.strokeStyle = 'rgba(60,62,66,0.5)'; g.lineWidth = 2;
  for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, 128); g.stroke(); }
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(0, i * 32); g.lineTo(256, i * 32); g.stroke(); }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 3);
  mats = {
    slab: new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }), ramp: std(0x7c8084), concrete: std(0xa4a7ab), metal: std(0xd0d4d8, { metalness: 0.8, roughness: 0.3 }),
    post: std(0x4a4e52, { metalness: 0.5 }), curb: std(0xc4c7ca), wood: std(0x7a5a3a), red: std(0xe8523a), deck: std(0xe8523a, { roughness: 0.5 }), wheel: std(0xf2f0e6),
    grip: std(0x1d1f22), truck: std(0xb8bcc0, { metalness: 0.7, roughness: 0.4 }), bin: std(0x3a6a4a),
  };
  return mats;
}

function mesh(geo2, mat, x, y, z, parent, shadow = true) {
  const m = new THREE.Mesh(geo2, mat);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// A ramp from a profile [[d, z], ...] extruded across `width` (centred).
function profileMesh(points, width, mat) {
  const s = new THREE.Shape();
  s.moveTo(points[0][0], 0);
  for (const [d, z] of points) s.lineTo(d, z);
  s.lineTo(points[points.length - 1][0], 0);
  s.closePath();
  const geo2 = new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: false, steps: 1 });
  geo2.translate(0, 0, -width / 2);
  const m = new THREE.Mesh(geo2, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function buildPark() {
  const M = materials();
  const park = new THREE.Group();
  park.position.set(ORIGIN.x, 0.02, ORIGIN.y);
  park.rotation.y = -ROT;
  const hu = PARK.hu, hv = PARK.hv;
  mesh(new THREE.BoxGeometry(hu * 2 + 0.6, 0.08, hv * 2 + 0.6), M.slab, 0, 0.0, 0, park, false).receiveShadow = true;
  // curbs round the floor
  for (const s of [-1, 1]) {
    mesh(new THREE.BoxGeometry(hu * 2 + 1.2, 0.3, 0.3), M.curb, 0, 0.12, s * (hv + 0.4), park);
    mesh(new THREE.BoxGeometry(0.3, 0.3, hv * 2 + 1.2), M.curb, s * (hu + 0.4), 0.12, 0, park);
  }
  for (const f of FEATURES) {
    if (f.type === 'quarter') {
      const D = Math.sqrt(f.R * f.R - (f.R - f.h) * (f.R - f.h));
      const len = Math.abs(f.u1 - f.u0);
      const pts = [];
      for (let i = 0; i <= 12; i++) { const d = (len * i) / 12; const dd = Math.min(d, D); pts.push([d, f.R - Math.sqrt(Math.max(0, f.R * f.R - dd * dd))]); }
      pts.push([len + DECK, pts[pts.length - 1][1]]);
      const m = profileMesh(pts, f.v1 - f.v0, M.ramp);
      m.position.set(f.u0, 0.04, (f.v0 + f.v1) / 2);
      if (f.u1 < f.u0) m.rotation.y = Math.PI;
      park.add(m);
      // the coping: a steel bar along the lip
      const lipU = f.u0 + Math.sign(f.u1 - f.u0) * len;
      mesh(new THREE.CylinderGeometry(0.05, 0.05, f.v1 - f.v0, 8).rotateX(Math.PI / 2), M.metal, lipU, f.h + 0.05, (f.v0 + f.v1) / 2, park);
    } else if (f.type === 'kicker') {
      const len = Math.abs(f.u1 - f.u0);
      const pts = [];
      for (let i = 0; i <= 8; i++) { const k = i / 8; pts.push([len * k, f.h * k * k * (0.6 + 0.4 * k)]); }
      const m = profileMesh(pts, f.v1 - f.v0, M.concrete);
      m.position.set(f.u0, 0.04, (f.v0 + f.v1) / 2);
      if (f.u1 < f.u0) m.rotation.y = Math.PI;
      park.add(m);
    } else if (f.type === 'box') {
      const bx = (f.u0 + f.u1) / 2, bz = (f.v0 + f.v1) / 2;
      mesh(new THREE.BoxGeometry(f.u1 - f.u0, f.h, f.v1 - f.v0), M.concrete, bx, f.h / 2 + 0.04, bz, park);
      for (const v of [f.v0, f.v1]) mesh(new THREE.BoxGeometry(f.u1 - f.u0, 0.05, 0.08), M.metal, bx, f.h + 0.065, v, park, false);
    } else if (f.type === 'rail') {
      const len = Math.hypot(f.u1 - f.u0, f.v1 - f.v0);
      const r = mesh(new THREE.CylinderGeometry(0.035, 0.035, len, 8), M.metal, (f.u0 + f.u1) / 2, f.h + 0.04, (f.v0 + f.v1) / 2, park);
      r.rotation.z = Math.PI / 2;
      r.rotation.y = -Math.atan2(f.v1 - f.v0, f.u1 - f.u0);
      for (let i = 0; i <= 2; i++) {
        const k = i / 2;
        mesh(new THREE.CylinderGeometry(0.03, 0.03, f.h, 6), M.post, f.u0 + (f.u1 - f.u0) * k, f.h / 2 + 0.04, f.v0 + (f.v1 - f.v0) * k, park);
      }
    }
  }
  // the entrance sign at the west end, a bench and a bin outside the curb
  const signTex = (() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 96;
    const g = c.getContext('2d');
    g.fillStyle = '#e8523a'; g.fillRect(0, 0, 256, 96);
    g.fillStyle = '#fff'; g.font = 'bold 30px Arial'; g.textAlign = 'center'; g.fillText('SKATEPARK', 128, 42); g.font = 'bold 24px Arial'; g.fillText('STADSPARK', 128, 76);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.9), new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide }));
  sign.position.set(-hu - 3.2, 1.9, 0);
  sign.rotation.y = Math.PI / 2;
  park.add(sign);
  for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), M.post, -hu - 3.2, 1.2, s * 1.1, park);
  mesh(new THREE.BoxGeometry(2, 0.08, 0.5), M.wood, 6, 0.5, hv + 2.4, park);
  mesh(new THREE.BoxGeometry(2, 0.5, 0.06), M.wood, 6, 0.8, hv + 2.65, park);
  mesh(new THREE.CylinderGeometry(0.28, 0.25, 0.8, 8), M.bin, -4, 0.4, hv + 2.2, park);
  // the deck and the wheels of the board
  const bd = new THREE.Group();
  mesh(new THREE.BoxGeometry(0.62, 0.025, 0.2), M.deck, 0, 0.11, 0, bd);
  for (const s of [-1, 1]) {
    const t = mesh(new THREE.BoxGeometry(0.16, 0.025, 0.2), M.deck, s * 0.36, 0.14, 0, bd);
    t.rotation.z = s * 0.35;
    mesh(new THREE.BoxGeometry(0.06, 0.04, 0.16), M.truck, s * 0.22, 0.075, 0, bd);
    for (const k of [-1, 1]) mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 10).rotateX(Math.PI / 2), M.wheel, s * 0.22, 0.04, k * 0.1, bd);
  }
  bd.visible = false;
  const skater = buildPersonMesh(skaterLook.shirt, skaterLook.skin, skaterLook);
  skater.visible = false;
  getScene().add(park, bd, skater);
  return { park, bd, skater };
}

function updateLod(w) {
  const d = Math.hypot(w.player.x - ORIGIN.x, w.player.y - ORIGIN.y);
  if (!built && d < DETAIL_M) built = buildPark();
  if (!built) return;
  built.park.visible = d < DETAIL_M + 80 || !!game;
  if (!game) {
    // Luuk hangs about by the bench
    const bench = FR.toW(6, PARK.hv + 3.6);
    built.skater.visible = built.park.visible;
    built.skater.position.set(bench.x, 0, bench.y);
    built.skater.rotation.y = -(ROT - Math.PI / 2 + 0.3);
  }
}

// --- map icon ---------------------------------------------------------------------------------------

function drawIcon(ctx, s) {
  iconDisc(ctx, s, ACCENT);
  ctx.save();
  ctx.scale(s, s);
  ctx.fillStyle = '#f2ede0';
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-3, 0.4, 6, 1.2, 0.6) : ctx.rect(-3, 0.4, 6, 1.2); ctx.fill();
  ctx.beginPath(); ctx.arc(-1.6, 2.4, 0.7, 0, Math.PI * 2); ctx.arc(1.6, 2.4, 0.7, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#f2ede0'; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(-2.4, -0.4); ctx.quadraticCurveTo(-0.4, -1, 0.2, -2.8); ctx.stroke();
  ctx.restore();
}

// --- prompt and start ---------------------------------------------------------------------------------

function nearStand(w) {
  const p = w.player;
  if (game || w.pigeonMode || w.heliRun || p.inVehicle || p.swimming) return false;
  return Math.hypot(p.x - STAND.x, p.y - STAND.y) < USE_RADIUS;
}

function recText() {
  const rec = getChallengeRecord('skatepark');
  return rec && rec.best != null ? `Record: ${Math.round(rec.best).toLocaleString('nl-NL')} punten${rec.medal ? ' · ' + MEDALS[rec.medal].toLowerCase() : ''}` : null;
}

function prompt(w) {
  if (!nearStand(w)) return null;
  const why = activityBlock(w);
  return { id: 'skatepark', x: STAND.x, y: STAND.y, h: 2.2, key: 'E', label: 'Skatepark', sub: why || recText() || 'Negentig seconden kunstjes · gratis', ring: true, dim: !!why };
}

function secondary(w) {
  if (game || w.player.inVehicle) return [];
  if (Math.hypot(w.player.x - ORIGIN.x, w.player.y - ORIGIN.y) > 120) return [];
  return [{ id: 'skatepark-2', x: STAND.x, y: STAND.y, h: 2.2, label: 'Skatepark Stadspark', sub: 'Loop naar de ingang en druk E', kind: 'place' }];
}

function interact(w) {
  if (!nearStand(w)) return false;
  const why = activityBlock(w);
  if (why) { w.addMessage(why, 2.5); return true; }
  startOfUitnodigen(w);
  return true;
}

// Met gasten in de sessie is het skatepark een uitnodiging aan iedereen (Meedoen? J/N); nog eens E start meteen (#443).
function startOfUitnodigen(w) {
  const uit = wedNodigUit(w, 'skatepark');
  if (uit.ok) { if (uit.reden === 'wacht') wedNuStarten(w); return true; }
  return start(w);
}

function start(w, { force = false, online = null } = {}) {
  if (game) return false;
  if (!force && !online && activityBlock(w)) return false;
  if (!built) built = buildPark();
  const p = w.player;
  if (p.inVehicle) p.exitVehicle(w.map, w);
  const b = createBoardState();
  b.u = -PARK.hu + 4; b.v = 0; b.a = 0;
  ensureBoard();
  board.show();
  built.bd.visible = true;
  built.skater.visible = true;
  runs++;
  game = { t: 0, phase: 'intro', phaseT: INTRO_S, left: RUN_S, b, combo: createCombo(), flash: null, cam: null, said: 0, lastNames: '', bigAir: false, prevCine: w.cinematicHidePlayers, online };
  place(w, 0);
  const side = FR.toW(-PARK.hu - 2, PARK.hv + 1);
  w.companionHold = { x: side.x, y: side.y, face: ROT };
  if (online !== 'gast') showCard(w, { kind: 'tip', kicker: 'Skatepark', title: 'Negentig seconden', body: '[W] duwen, [A] [D] sturen en draaien, [Spatie] ollie, [E] kickflip, [F] heelflip, [S] in de lucht een grab. Op een leuning: houd je balans met [A] [D].', duration: 10, key: 'skatepark-help', voice: false });
  say(w, 'start', true);
  return true;
}

// --- the run ----------------------------------------------------------------------------------------------

function worldOf(b) {
  const q = FR.toW(b.u, b.v);
  return { x: q.x, y: q.y, heading: ROT + b.a };
}

// The player stands on the board; the board does the flips.
function place(w, dt) {
  const g = game;
  const b = g.b;
  const q = worldOf(b);
  const p = w.player;
  p.x = q.x; p.y = q.y; p.speed = 0; p.moving = false; p.vx = 0; p.vy = 0;
  p.z = b.z + 0.1;
  p.angle = q.heading + b.spin + Math.PI / 2;
  p.crouching = false;
  built.bd.position.set(q.x, b.z + 0.02, q.y);
  built.bd.rotation.set(0, 0, 0);
  built.bd.rotation.y = -(q.heading + b.spin);
  if (b.flip) built.bd.rotateX((b.flip === 'kickflip' ? 1 : -1) * (b.flipT / SKATE.flipTime) * Math.PI * 2);
  // on a ramp the board leans with the slope
  if (b.grounded && Math.abs(b.rise) > 0.1) built.bd.rotateZ(Math.atan2(b.rise, Math.max(1, Math.abs(b.speed))) * 0.7);
}

function say(w, kind, force = false, after = false) {
  const list = SKATE_LINES[kind];
  if (!list || !built) return;
  const g = game;
  if (g && !force && g.t - g.said < 9) return;
  if (g) g.said = g.t;
  const bench = FR.toW(6, PARK.hv + 3.6);
  bubble(w, { x: bench.x, y: bench.y, name: SKATE_LINES.who, text: pick(list), h: 2.1, tag: 'skatepark', ttl: after ? 4 : 0 });
}

function updateGame(w, dt) {
  const g = game;
  const input = w.input;
  g.t += dt;
  if (g.online === 'gast' && (!w.coopNet || w.coopRole !== 'client')) { wedGastReset(w); end(w, { quit: true, extern: true }); return; } // de verbinding is weg
  if (g.flash && (g.flash.t -= dt) <= 0) g.flash = null;
  if (stopPressed(input)) { end(w, { quit: true }); return; }
  const live = g.phase === 'run';
  const k = (a, b2) => input.isDown(a) || input.isDown(b2);
  const inp = {
    push: live && k('w', 'arrowup') ? 1 : 0,
    brake: live && k('s', 'arrowdown') ? 1 : 0,
    steer: (k('d', 'arrowright') ? 1 : 0) - (k('a', 'arrowleft') ? 1 : 0),
    ollie: false, kick: false, heel: false, grab: live && k('s', 'arrowdown'), spin: 0,
  };
  inp.spin = inp.steer;
  if (!live) { inp.steer = 0; inp.spin = 0; inp.grab = false; }
  if (input.wasPressed(' ')) { input.consume(' '); inp.ollie = live; }
  if (input.wasPressed('e')) { input.consume('e'); inp.kick = live; }
  if (input.wasPressed('f')) { input.consume('f'); inp.heel = live; }
  // the physics at a fixed step
  g.acc = (g.acc || 0) + dt;
  let steps = 0;
  while (g.acc >= 1 / 90 && steps < 6) {
    g.acc -= 1 / 90;
    steps++;
    const ev = stepBoard(g.b, inp, 1 / 90, FEATURES, g.combo);
    inp.ollie = inp.kick = inp.heel = false;
    for (const e of ev) onEvent(w, e);
    const r = scoreEvents(g.combo, ev);
    if (r.gained) {
      g.lastNames = r.names.map((n) => TRICK_NAMES[n] || n).join(' + ');
      g.flash = { text: `${g.lastNames} +${r.gained}`, t: 1.6 };
    }
    if (r.bailed) { g.flash = { text: `Gevallen! -${r.bailed}`, t: 1.8, bad: true }; }
    const banked = tickCombo(g.combo, 1 / 90, !g.b.grounded || !!g.b.grind);
    if (banked) { g.flash = { text: `Keten opgeslagen: +${banked}`, t: 1.8 }; if (banked > 1200) say(w, 'combo'); }
  }
  if (g.phase === 'intro') {
    g.phaseT -= dt;
    if (g.phaseT <= 0) { g.phase = 'run'; g.left = RUN_S; }
  } else if (g.phase === 'run') {
    g.left -= dt;
    if (g.left <= 0) {
      g.left = 0;
      g.phase = 'outro';
      g.phaseT = OUTRO_S;
      if (g.combo.chain && g.b.grounded) bankCombo(g.combo);
    }
  } else if (g.phase === 'outro') {
    g.phaseT -= dt;
    if (g.combo.chain && g.b.grounded) bankCombo(g.combo);
    if (g.phaseT <= 0) { end(w); return; }
  }
  place(w, dt);
}

function onEvent(w, e) {
  const g = game;
  // #460: de pop, het staal, de landing en de val
  pushFoley(w, skateFx(e));
  if (e.type === 'land' && e.height > 1.1 && !g.bigAir) { say(w, 'big'); }
  if (e.type === 'bail') say(w, 'bail');
  if (e.type === 'grind') say(w, 'grind');
}

function end(w, { quit = false, extern = false, uitslag = null } = {}) {
  const g = game;
  if (!g) return;
  game = null;
  w.companionHold = null;
  w.cameraOverride = null;
  const p = w.player;
  p.z = 0;
  if (board) board.hide();
  clearBubbles(w, 'skatepark');
  if (built) { built.bd.visible = false; }
  p.x = STAND.x; p.y = STAND.y; p.angle = ROT;
  const c = g.combo;
  if (c.chain) bankCombo(c);
  const score = c.total;
  if (g.online && !quit) { if (g.online === 'host') wedHostPunt(w, 0, Math.round(score)); else wedGastPunt(w, 0, Math.round(score)); } // zijn beurt gaat naar wie het spel opende
  if (g.online) { eindeOnline(w, g, quit, extern, uitslag); return; }
  if (quit) { w.addMessage('Skatepark gestopt', 2.5); return; }
  const medal = skateMedal(score);
  const rec = recordChallengeResult(w, 'skatepark', { value: score, medal });
  recordStat(w, 'skateRuns');
  setStatMax(w, 'skateBestChain', c.best);
  unlockAchievement(w, 'skate_klaar');
  if (medal >= 3) unlockAchievement(w, 'skate_goud');
  if (c.best >= 2000) unlockAchievement(w, 'skate_combo');
  const stats = [['Score', score.toLocaleString('nl-NL')], ['Beste keten', c.best.toLocaleString('nl-NL')], ['Gevallen', String(g.b.bails)], ['Grinds', String(g.b.grinds)]];
  if (medal) stats.push(['Medaille', MEDALS[medal]]);
  if (rec && rec.newBest) stats.push(['Record', 'Nieuw!']);
  showBanner({ kind: medal ? 'pass' : 'fail', title: medal >= 3 ? 'KONING VAN HET SKATEPARK' : medal ? 'MOOIE RONDE' : 'NOG EEN RONDE?', reason: medal ? `Beste keten: ${c.best.toLocaleString('nl-NL')} punten` : 'Hou je keten vast: elk nieuw kunstje telt zwaarder', reward: 0, stats });
  const bench = built && built.skater;
  if (built) built.skater.visible = true;
  say(w, medal >= 2 ? 'endGood' : 'endPoor', true, true);
}

// Online (#443): wie stopt laat de anderen doorskaten; de uitslag en de beloning komen van wie het spel opende (coopwedstrijd.js).
function eindeOnline(w, g, quit, extern, res) {
  if (quit) {
    if (!extern) { if (g.online === 'host') wedScoreStop(w); else wedGastVerlaat(w); } // de host stopt het voor iedereen, een gast alleen voor zichzelf
    w.addMessage('Skatepark gestopt', 2.5);
    return;
  }
  if (g.online === 'gast' || !res) return; // een gast: de uitslagkaart en het geld komen van de host
  beloonOnline(w, res);
}
// De beloning van een plek in het eigen geld en de eigen loopbaan (de gasten krijgen de hunne van de host).
function beloonOnline(w, res) {
  const jij = res.jij || { plek: 0, geld: 0, xp: 0 };
  loopbaanVerdien(w, 'buiten', jij.geld, { xp: jij.xp, n: 1, uniek: 'skatepark', deel: false });
  if (jij.geld > 0) w.addMessage(`Beloning: \u20ac${jij.geld.toLocaleString('nl-NL')}`, 4);
}

// --- camera and HUD -------------------------------------------------------------------------------------------

function camera(w) {
  const g = game;
  if (!g) return;
  const b = g.b;
  const q = worldOf(b);
  const h = ROT + b.a;
  const pos = { x: q.x - Math.cos(h) * 7.5, y: q.y - Math.sin(h) * 7.5, z: 3.4 + Math.max(0, b.z) * 0.6 };
  const at = { x: q.x + Math.cos(h) * 4, y: q.y + Math.sin(h) * 4, z: 0.9 + b.z * 0.7 };
  const c = easeCamera(g, pos, at, 0.08);
  w.cameraOverride = { position: c.position, lookAt: c.lookAt, fov: 62, cut: true };
}

function ensureBoard() {
  if (!board) board = createBoard('SKATEPARK STADSPARK', ACCENT);
  return board;
}

function updateHud(w) {
  const g = game;
  if (!g || !board) return;
  const c = g.combo;
  const left = g.phase === 'run' ? Math.ceil(g.left) : g.phase === 'intro' ? RUN_S : 0;
  const cur = Math.round(c.cur);
  const online = g.online ? wedScoreRijen(w) : [];
  const stand = online.length ? `<span>${online.map((r) => `${r.weg ? '<s>' : ''}${r.naam} ${(r.slagen || 0).toLocaleString('nl-NL')}${r.weg ? '</s>' : ''}`).join(' · ')}</span>` : '';
  const row = `${stand}<span>Tijd <b>${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</b></span><span>Score <b>${c.total.toLocaleString('nl-NL')}</b></span><span>Keten <b>${cur.toLocaleString('nl-NL')}</b> x${c.chain ? c.mult : 1}</span><span>Beste <b>${c.best.toLocaleString('nl-NL')}</b></span>`;
  let meter = null, flash = g.flash ? g.flash.text : g.phase === 'intro' ? 'Daar gaan we...' : g.phase === 'outro' ? 'Tijd!' : '';
  if (g.b.grind) {
    meter = { v: 0.5 + g.b.grind.bal / 2.4, mark: 0.5, color: Math.abs(g.b.grind.bal) > 0.65 ? '#ff6f61' : '#46b36a' };
    flash = g.b.grind.bal > 0.1 ? 'Balans: je leunt rechts, stuur links' : g.b.grind.bal < -0.1 ? 'Balans: je leunt links, stuur rechts' : 'Grind!';
  }
  const help = `${key('W')} duwen · ${key('A')}${key('D')} sturen/draaien · ${key('SPATIE')} ollie · ${key('E')} kickflip · ${key('F')} heelflip · ${key('S')} grab · ${key('BACKSPACE')} stoppen`;
  board.set({ row, meter, flash, bad: !!(g.flash && g.flash.bad), help });
}

// --- the activity ---------------------------------------------------------------------------------------------

// --- de wedstrijd tegen elkaar (#443): iedereen skatet zijn eigen ronde, wie het spel opende houdt het scorebord ------------------------------

function gastTik(w, dt) {
  if (!game || game.online !== 'gast') return false;
  updateGame(w, dt);
  if (game) { if ((lodT -= dt) <= 0) { lodT = 0.5; updateLod(w); } if (built && built.skater.visible) animatePersonWalk(built.skater, 0, dt); updateHud(w); }
  return true;
}
registreerWedstrijd('skatepark', {
  naam: 'Skatepark Stadspark', soort: 'punt', vak: 'buiten',
  opties: () => ({ beurten: 1, format: (p) => `${Math.round(p).toLocaleString('nl-NL')} punten` }),
  start: (w) => start(w, { online: 'host', force: true }),
  plek: () => ({ ...STAND }),
  gastPlek: (w, x, y) => !game && !w.player.inVehicle && Math.hypot(x - STAND.x, y - STAND.y) < 4.5, // een gast vraagt het bij de ingang (#452)
  eind: (w, res) => {
    if (game && game.online === 'host') end(w, res ? { uitslag: res } : { quit: true, extern: true });
    else if (res) beloonOnline(w, res); // de host was al klaar: alleen zijn beloning miste nog
  },
  solo: (w) => start(w),
});
zetWedGastHaken('skatepark', {
  dichtbij: (w) => !game && !w.player.inVehicle && Math.hypot(w.player.x - STAND.x, w.player.y - STAND.y) < 3,
  start: (w) => start(w, { online: 'gast', force: true }),
  eind: (w, uit) => { if (game && game.online === 'gast') end(w, uit.gestopt ? { quit: true, extern: true } : { uitslag: uit }); },
  tik: gastTik,
});

export const SKATEPARK = {
  id: 'skatepark',
  layer: 'skatepark',
  legend: { kind: 'act-skatepark', label: 'Skatepark', note: 'skatepark in het Stadspark: hellingen, leuningen en kunstjes' },
  init(w) {
    window.__skatepark = {
      spot: () => ({ ...STAND }),
      origin: () => ({ ...ORIGIN, rot: ROT }),
      start: (force = true) => start(w, { force }),
      state: () => (game ? { phase: game.phase, left: game.left, b: { u: game.b.u, v: game.b.v, z: game.b.z, speed: game.b.speed, grounded: game.b.grounded }, combo: { cur: game.combo.cur, mult: game.combo.mult, total: game.combo.total, best: game.combo.best } } : null),
      // gives the run a score straight away (tests)
      score: (n) => { if (!game) return false; game.combo.total += n; game.combo.best = Math.max(game.combo.best, n); return true; },
      finish: () => { if (!game) return false; game.phase = 'run'; game.left = 0.01; return true; },
      quit: () => { if (!game) return false; end(w, { quit: true }); return true; },
    };
  },
  spots: () => [{ id: 'skatepark', name: 'Skatepark Stadspark', x: STAND.x, y: STAND.y }],
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
    if (built && built.skater.visible) animatePersonWalk(built.skater, 0, dt);
    updateHud(w);
  },
  camera,
  icon: drawIcon,
  mapSub: () => recText() || 'Skatepark: hellingen, leuningen en kunstjes',
  ubbo(w) {
    const d = Math.hypot(STAND.x - w.player.x, STAND.y - w.player.y);
    const rec = getChallengeRecord('skatepark');
    return { name: 'Skatepark Stadspark', sub: rec && rec.medal ? `record: ${MEDALS[rec.medal].toLowerCase()}` : 'hellingen, leuningen en kunstjes, gratis', dist: d, x: STAND.x, y: STAND.y, play: 'skatepark', where: 'het skatepark in het Stadspark', hint: 'loop naar de ingang en druk E' };
  },
  runs: () => runs,
};
