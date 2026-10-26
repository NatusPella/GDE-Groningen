import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { buildPersonMesh, animatePersonWalk } from './models3d_people.js';
import { showBanner } from './cinematics.js';
import { unlockAchievement, recordChallengeResult, getChallengeRecord, recordStat, MEDALS } from './achievements.js';
import { showCard } from './hudcards.js';
import { standActivity, recLine } from './standactivity.js';
import { loopbaanVerdien } from './loopbaanlive.js';
import { registreerWedstrijd, zetWedGastHaken, wedNodigUit, wedNuStarten, wedHostTijd, wedGastTijd, wedScoreStop, wedGastVerlaat, wedGastReset, wedScoreRijen } from './multiplayerwedstrijd.js';
import { createBoard, mgThema, key, bubble, clearBubbles, pick, stopPressed, easeCamera, geo, frame, fmtTime, clamp } from './minigamekit.js';
import { CLIMB_LINES } from './minigamelines2.js';
import { WALL, ARMS, createClimb, startClimb, stepClimb, nextHold, makeHolds, climbMedal, MEDAL_AT } from './climbrules.js';
import { climbFx, pushFoley } from './sfx/minigamefoley.js';

// Klimtoren Zernike: a 12 m climbing tower on open ground at the Zernike
// campus. Hold A (left hand) and D (right hand) to reach and grip the next
// hold, let go of one to move it up, never both. Grip drains the arms, a big
// hold rests them, Space chalks once. A fall costs four seconds and a try,
// three falls end the climb. Medals by time, record in seconds (lower is
// better). Free. Rules: climbrules.js. `window.__klimtoren` debug.
const ACCENT = mgThema('klimtoren').accent; // één bron voor het HUD-thema: minigamekit.js (#453)
const ORIGIN = geo(53.236337, 6.537852);
const ROT = 0;
const FR = frame(ORIGIN, ROT);
const STAND = FR.toW(6.5, 0);
const FACE_U = 2.1;
const DETAIL_M = 380;
const INTRO_S = 1.6;

let game = null;
let built = null;
let board = null;
let lodT = 0;
let runs = 0;
const seed = 7;

const coachLook = { shirt: 0x2f6f4f, skin: 0xe0b48a, variant: 'female', seed: 5512, look: { age: 'adult', hat: null, bag: null, umbrella: null } };
const COACH = FR.toW(6, 4);

// --- meshes ---------------------------------------------------------------------------------------

function holdMesh(h) {
  const m = new THREE.Mesh(h.big ? new THREE.SphereGeometry(0.17, 10, 8) : new THREE.BoxGeometry(0.12, 0.09, 0.1), new THREE.MeshStandardMaterial({ color: h.color, roughness: 0.6 }));
  if (h.big) m.scale.set(1.3, 0.8, 0.9);
  const q = FR.toW(FACE_U, -h.x);
  m.position.set(q.x - ORIGIN.x, h.h, q.y - ORIGIN.y);
  return m;
}

function buildTower() {
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...o });
  const grp = new THREE.Group();
  grp.position.set(ORIGIN.x, 0.02, ORIGIN.y);
  const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; grp.add(m); return m; };
  box(4.2, 12.4, 3.8, std(0xc9c3b4), 0, 6.2, 0);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 12), new THREE.MeshStandardMaterial({ color: 0x8a8f94, roughness: 1 }));
  face.rotation.y = Math.PI / 2;
  face.position.set(FACE_U - 0.04, 6, 0);
  grp.add(face);
  const holds = new THREE.Group();
  grp.add(holds);
  box(6, 0.5, 6, std(0x2f4f8f), 3.6, 0.25, 0);
  box(0.12, 12.8, 0.12, std(0x4a4e52, { metalness: 0.5 }), 0, 6.4, 0);
  const flag = box(1.1, 0.7, 0.04, std(0xffd23f), 0.55, 12.4, 0);
  flag.castShadow = false;
  // two rings that show the hold each hand would take
  const rings = [0x3a8fe0, 0xff7a2a].map((c) => {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 6, 16), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9 }));
    r.rotation.y = Math.PI / 2;
    r.visible = false;
    grp.add(r);
    return r;
  });
  const coach = buildPersonMesh(coachLook.shirt, coachLook.skin, coachLook);
  coach.position.set(COACH.x, 0, COACH.y);
  coach.rotation.y = -(Math.PI + 0.6);
  getScene().add(grp, coach);
  return { grp, holds, rings, coach, holdsBuilt: null };
}

function ensureHolds(list) {
  if (!built || built.holdsBuilt === list) return;
  built.holdsBuilt = list;
  while (built.holds.children.length) { const o = built.holds.children[0]; built.holds.remove(o); o.geometry.dispose(); o.material.dispose(); }
  for (const h of list) if (!h.top) built.holds.add(holdMesh(h));
}

function updateLod(w) {
  const d = Math.hypot(w.player.x - ORIGIN.x, w.player.y - ORIGIN.y);
  if (!built && d < DETAIL_M) built = buildTower();
  if (!built) return;
  ensureHolds(game ? game.s.holds : (built.preview || (built.preview = makeHolds(seed))));
  built.grp.visible = built.coach.visible = d < DETAIL_M + 80 || !!game;
}

function holdWorld(h) {
  const q = FR.toW(FACE_U, -h.x);
  return { x: q.x, y: q.y };
}

// --- the climb ---------------------------------------------------------------------------------------------

function place(w) {
  const g = game, s = g.s, p = w.player;
  const hs = ['a', 'd'].map((k) => s.hands[k].hold).filter(Boolean);
  const lat = hs.length ? hs.reduce((a, h) => a + h.x, 0) / hs.length : 0;
  const q = FR.toW(FACE_U + 0.38, -lat);
  p.x = q.x; p.y = q.y;
  p.angle = Math.PI + ROT;
  p.z = s.ground ? 0.5 : Math.max(0.5, s.body + 0.5);
  p.vx = p.vy = 0; p.speed = 0; p.moving = false; p.crouching = false; p.swimming = false;
}

function say(w, kind, force = false, after = false) {
  const list = CLIMB_LINES[kind];
  if (!list || !built) return;
  const g = game;
  if (g && !force && g.t - g.said < 8) return;
  if (g) g.said = g.t;
  bubble(w, { x: COACH.x, y: COACH.y, name: CLIMB_LINES.who, text: pick(list), h: 2.1, tag: 'klimtoren', ttl: after ? 4.5 : 0 });
}

function updateGame(w, dt) {
  const g = game, s = g.s, input = w.input;
  g.t += dt;
  g.dt = dt; // de camera rekent per seconde (#436)
  if (g.flash && (g.flash.t -= dt) <= 0) g.flash = null;
  if (g.online === 'gast' && (!w.coopNet || w.coopRole !== 'client')) { wedGastReset(w); end(w, { quit: true, extern: true }); return; } // the connection is gone
  if (stopPressed(input)) { end(w, { quit: true, extern: g.online === 'gast' && !!g.gemeld }); return; } // a guest who is done and waits just leaves the screen: his result stays and his prize still comes
  if (g.phase === 'intro') {
    g.phaseT -= dt;
    if (g.phaseT <= 0) { g.phase = 'run'; startClimb(s); }
    place(w);
    return;
  }
  const down = (a, b) => input.isDown(a) || input.isDown(b);
  const inp = { a: down('a', 'arrowleft'), d: down('d', 'arrowright'), chalk: false };
  if (input.wasPressed(' ')) { input.consume(' '); inp.chalk = true; }
  const ev = stepClimb(s, inp, dt);
  for (const e of ev) onEvent(w, e);
  if (g.phase === 'run' && (s.phase === 'top' || s.phase === 'over')) {
    g.phase = 'outro'; g.phaseT = 2.2;
    if (g.online && !g.gemeld) { // online (#443): report the climb; the host keeps the board and ends the contest when everybody is done
      g.gemeld = true;
      const res = { tijd: s.time, hoogte: Math.max(0, s.best), boven: s.phase === 'top' };
      if (g.online === 'host') wedHostTijd(w, res); else wedGastTijd(w, res.tijd, res.hoogte, res.boven);
    }
  }
  if (g.phase === 'outro') { g.phaseT -= dt; if (g.phaseT <= 0) { if (g.online) { g.phase = 'wacht'; g.phaseT = 0; } else { end(w); return; } } }
  if (g.phase === 'run' && s.arms < 0.25 && !s.ground) say(w, 'low');
  place(w);
}

function onEvent(w, e) {
  const g = game, s = g.s;
  // #460: de hand op de greep, magnesium, de mat
  pushFoley(w, climbFx(e));
  if (e.type === 'fall') {
    g.flash = { text: `Gevallen! +${WALL.penalty} s (${s.falls}/${WALL.tries})`, t: 2, bad: true };
    say(w, 'fall', true);
  } else if (e.type === 'chalk') g.flash = { text: 'Magnesium: je armen zijn weer fris', t: 1.6 };
  else if (e.type === 'top') say(w, 'top', true);
  else if (e.type === 'grip' && e.hold.big && s.hands.a.hold && s.hands.d.hold && s.hands.a.hold.big && s.hands.d.hold.big) say(w, 'rest');
}

function end(w, { quit = false, extern = false, uitslag = null } = {}) {
  const g = game;
  if (!g) return;
  game = null;
  w.companionHold = null;
  w.cameraOverride = null;
  const p = w.player;
  p.z = 0; p.vx = p.vy = 0; p.speed = 0; p.moving = false;
  if (board) board.hide();
  clearBubbles(w, 'klimtoren');
  p.x = STAND.x; p.y = STAND.y; p.angle = Math.PI + ROT;
  if (g.online) { eindeOnline(w, g, quit, extern, uitslag); return; }
  if (quit) { w.addMessage('Klimmen gestopt', 2.5); return; }
  const s = g.s;
  if (s.phase === 'top') {
    const time = s.time;
    const medal = climbMedal(time);
    const rec = recordChallengeResult(w, 'klimtoren', { value: time, medal, lower: true });
    recordStat(w, 'klimTops');
    unlockAchievement(w, 'klim_klaar');
    if (medal >= 3) unlockAchievement(w, 'klim_goud');
    if (s.falls === 0) unlockAchievement(w, 'klim_foutloos');
    const stats = [['Tijd', fmtTime(time)], ['Vallen', String(s.falls)], ['Hoogte', `${WALL.height} m`]];
    if (medal) stats.push(['Medaille', MEDALS[medal]]);
    if (rec && rec.newBest) stats.push(['Record', 'Nieuw!']);
    showBanner({ kind: medal ? 'pass' : 'fail', title: medal >= 3 ? 'KONING VAN DE KLIMTOREN' : 'BOVEN!', reason: s.falls ? `Met ${s.falls} ${s.falls === 1 ? 'val' : 'vallen'}, en toch bovenaan` : 'Zonder te vallen naar de top', reward: 0, stats });
    say(w, medal >= 2 ? 'endGood' : 'endPoor', true, true);
  } else {
    showBanner({ kind: 'fail', title: 'NIET BOVEN', reason: `Hoogste greep: ${s.best.toFixed(1).replace('.', ',')} m. Rust op de grote grepen en kijk waar je volgende hand heen gaat.`, reward: 0, stats: [['Vallen', String(s.falls)], ['Hoogte', `${s.best.toFixed(1).replace('.', ',')} m`]] });
    say(w, 'endPoor', true, true);
  }
}

// Online (#443): whoever stops lets the others climb on; the results and the prize come from whoever opened the game (multiplayerwedstrijd.js).
function eindeOnline(w, g, quit, extern, res) {
  if (quit) {
    if (!extern) { if (g.online === 'host') wedScoreStop(w); else wedGastVerlaat(w); } // the host stops it for everybody, a guest only for himself
    w.addMessage('Klimmen gestopt', 2.5);
    return;
  }
  if (g.online === 'gast' || !res) return; // a guest: the results card and the prize message come from the host
  if (g.s.phase === 'top') { recordStat(w, 'klimTops'); unlockAchievement(w, 'klim_klaar'); if (g.s.falls === 0) unlockAchievement(w, 'klim_foutloos'); }
  const jij = res.jij || { plek: 0, geld: 0, xp: 0 };
  loopbaanVerdien(w, 'buiten', jij.geld, { xp: jij.xp, n: 1, uniek: 'klimtoren', deel: false }); // the prize is per place; the guests get theirs from the host
  if (jij.geld > 0) w.addMessage(`Beloning: \u20ac${jij.geld.toLocaleString('nl-NL')}`, 4);
}

// --- camera and HUD -------------------------------------------------------------------------------------------

function camera(w) {
  const g = game;
  if (!g) return;
  const s = g.s, p = w.player;
  const h = s.ground ? 1.5 : s.body + 1.4;
  const pos = { x: p.x + 8.5, y: p.y, z: Math.max(2.6, h * 0.55 + 1.6) };
  const at = { x: p.x - 1, y: p.y, z: h };
  const c = easeCamera(g, pos, at, 0.08);
  w.cameraOverride = { position: c.position, lookAt: c.lookAt, fov: 55, cut: true };
}

function ensureBoard() {
  if (!board) board = createBoard('klimtoren');
  return board;
}

function updateHud(w) {
  const g = game;
  if (!g || !board) return;
  const s = g.s;
  const height = s.ground ? 0 : Math.max(0, s.body + 1.15);
  const row = `${stand ? `<span>${stand}</span>` : ''}<span>Tijd <b>${fmtTime(s.time)}</b></span><span>Hoogte <b>${height.toFixed(1).replace('.', ',')} m</b></span><span>Pogingen <b>${Math.max(0, WALL.tries - s.falls)}</b></span>`;
  const meter = { v: s.arms, color: s.arms < 0.25 ? '#ff6f61' : ACCENT };
  const stand = g.online ? wedScoreRijen(w).map((r) => `${r.weg ? '<s>' : ''}${r.naam} ${r.banen === 1 ? fmtTime(r.slagen / 10) : r.banen === 2 ? 'niet boven' : 'bezig'}${r.weg ? '</s>' : ''}`).join(' · ') : '';
  const flash = g.flash ? g.flash.text : g.phase === 'wacht' ? (s.phase === 'top' ? 'Boven! Wachten op de anderen' : 'Klaar: wachten op de anderen') : g.phase === 'intro' ? 'Pak de eerste grepen...' : s.ground && g.phase === 'run' ? 'Houd A of D ingedrukt om te grijpen' : '';
  const help = `${key('A')} linkerhand · ${key('D')} rechterhand · houd vast, laat één hand los om hem hoger te zetten · ${key('SPATIE')} magnesium · ${key('BACKSPACE')} stoppen`;
  board.set({ row, meter, flash, bad: !!(g.flash && g.flash.bad), help });
}

function updateRings() {
  if (!built) return;
  const g = game;
  ['a', 'd'].forEach((k, i) => {
    const r = built.rings[i];
    if (!g || g.phase !== 'run') { r.visible = false; return; }
    const hd = g.s.hands[k];
    const t = hd.state === 'reach' ? hd.target : hd.state === 'free' || hd.state === 'miss' ? nextHold(g.s, k) : null;
    if (!t) { r.visible = false; return; }
    const q = holdWorld(t);
    r.visible = true;
    r.position.set(q.x - ORIGIN.x + 0.05, t.h, q.y - ORIGIN.y);
    r.scale.setScalar(hd.state === 'reach' ? 1.4 - 0.5 * clamp(hd.t / WALL.reachT, 0, 1) : 1);
  });
}

// --- map icon ---------------------------------------------------------------------------------------

function glyph(ctx) {
  ctx.fillStyle = '#f2ede0';
  ctx.fillRect(-1.6, -3.2, 3.2, 6.4);
  ctx.fillStyle = '#f08a30';
  for (const [x, y] of [[-0.6, -2], [0.7, -0.6], [-0.5, 0.8], [0.6, 2.1]]) { ctx.beginPath(); ctx.arc(x, y, 0.55, 0, Math.PI * 2); ctx.fill(); }
}

// --- start -----------------------------------------------------------------------------------------------

// online: 'host' (who opened the game, at the mat) or 'gast' (on his own screen): everybody climbs the same wall at once, the host keeps the board (#443)
function start(w, { online = null } = {}) {
  if (game) return false;
  if (!built) built = buildTower();
  const p = w.player;
  if (p.inVehicle) p.exitVehicle(w.map, w);
  const holds = makeHolds(seed);
  ensureBoard();
  board.show();
  runs++;
  game = { t: 0, phase: 'intro', phaseT: INTRO_S, s: createClimb(holds), flash: null, cam: null, said: 0, online };
  ensureHolds(game.s.holds);
  const side = FR.toW(7, 3);
  w.companionHold = { x: side.x, y: side.y, face: Math.PI };
  if (online === 'gast') { place(w); return true; } // a guest reads the keys on the board; the host's invitation said what is played
  showCard(w, { kind: 'tip', kicker: 'Klimtoren', title: 'Twaalf meter', body: 'Houd [A] vast voor je linkerhand en [D] voor je rechter: de hand grijpt na een tel de ring. Laat één hand los om hem hoger te zetten, nooit allebei. Grote grepen zijn rustplekken.', duration: 11, key: 'klimtoren-help', voice: false });
  say(w, 'start', true);
  place(w);
  return true;
}

function recText() {
  return recLine(getChallengeRecord('klimtoren'), fmtTime, MEDALS);
}

// with guests in the session the climb is an invitation to everyone (Meedoen? J/N); pressing E again starts at once (#443)
function startOfUitnodigen(w) {
  const uit = wedNodigUit(w, 'klimtoren');
  if (uit.ok) { if (uit.reden === 'wacht') wedNuStarten(w); return true; }
  return start(w);
}

// a guest: the host started the climb and this guest said yes; the climb runs on his own screen
function gastTik(w, dt) {
  if (!game || game.online !== 'gast') return false;
  updateGame(w, dt);
  if (game) { if ((lodT -= dt) <= 0) { lodT = 0.5; updateLod(w); } if (built && built.coach.visible) animatePersonWalk(built.coach, 0, dt); updateRings(); updateHud(w); }
  return true;
}
registreerWedstrijd('klimtoren', {
  naam: 'Klimtoren Zernike', soort: 'tijd', vak: 'buiten',
  start: (w) => start(w, { online: 'host' }),
  plek: () => ({ ...STAND }),
  gastPlek: (w, x, y) => !game && Math.hypot(x - STAND.x, y - STAND.y) < 4.5, // a guest asks at the stand (#452)
  eind: (w, res) => { if (game && game.online === 'host') end(w, res ? { uitslag: res } : { quit: true, extern: true }); },
  solo: (w) => start(w),
});
zetWedGastHaken('klimtoren', {
  dichtbij: (w) => !game && !w.player.inVehicle && Math.hypot(w.player.x - STAND.x, w.player.y - STAND.y) < 3,
  start: (w) => start(w, { online: 'gast' }),
  eind: (w, uit) => { if (game && game.online === 'gast') end(w, uit.gestopt ? { quit: true, extern: true } : { uitslag: uit }); },
  tik: gastTik,
});

export const KLIMTOREN = standActivity({
  id: 'klimtoren',
  name: 'Klimtoren Zernike',
  label: 'Klimtoren',
  note: 'klimtoren op Zernike: twaalf meter, tegen de klok',
  accent: ACCENT,
  stand: () => STAND,
  origin: () => ORIGIN,
  useRadius: 3,
  sub: 'Twaalf meter klimmen · gratis',
  hint: 'Loop naar de mat en druk E',
  ubboSub: 'twaalf meter klimmen, gratis',
  where: 'de klimtoren op Zernike',
  recText,
  glyph,
  isActive: () => !!game,
  start: (w) => startOfUitnodigen(w),
  quit: (w) => end(w, { quit: true }),
  update: (dt, w) => updateGame(w, dt),
  tick(dt, w) {
    if ((lodT -= dt) <= 0) { lodT = 0.5; updateLod(w); }
    if (built && built.coach.visible) animatePersonWalk(built.coach, 0, dt);
    updateRings();
    updateHud(w);
  },
  camera,
  debug: (w) => ({
    spot: () => ({ ...STAND }),
    origin: () => ({ ...ORIGIN }),
    start: () => start(w),
    state: () => (game ? { phase: game.phase, climb: { phase: game.s.phase, body: game.s.body, arms: game.s.arms, falls: game.s.falls, time: game.s.time, best: game.s.best } } : null),
    finish: () => { if (!game) return false; game.phase = 'outro'; game.phaseT = 0.01; game.s.phase = 'top'; game.s.time = 44.5; game.s.falls = 0; return true; },
    quit: () => { if (!game) return false; end(w, { quit: true }); return true; },
  }),
});
