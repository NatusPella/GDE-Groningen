import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { canvasTex as textTex } from './canvastex.js';
import { getScene } from './scene3d.js';
import { buildPersonMesh, animatePersonWalk } from './models3d_people.js';
import { showBanner } from './cinematics.js';
import { unlockAchievement, recordChallengeResult, getChallengeRecord, recordStat, MEDALS } from './achievements.js';
import { showCard } from './hudcards.js';
import { isInWater, pointInPolygon } from './util.js';
import { activityBlock, iconDisc } from './activitykit.js';
import { createBoard, key, bubble, clearBubbles, pick, stopPressed, easeCamera, windText, clamp, makeRng } from './minigamekit.js';
import { DISC_LINES } from './minigamelines.js';
import { DISCEXT_LINES } from './minigamelines3.js';
import { fullRound, roundMedal, ctpPoints, ctpRound, CTP } from './discgolfext.js';
import { loopbaanVerdien } from './loopbaanlive.js';
import { registreerWedstrijd, zetWedGastHaken, wedNodigUit, wedNuStarten, wedHostScore, wedGastScore, wedScoreStop, wedGastVerlaat, wedGastReset, wedScoreRijen } from './coopwedstrijd.js';
import {
  courseHoles, simulateFlight, DISCS, DISC_ORDER, RELEASES, suggestDisc, newCard, finishHole, cardTotals, courseMedal, holeName, relText,
  MAX_OVER_PAR, CIRCLE_M,
} from './discgolfrules.js';

// Discgolf in het Stadspark: nine holes on the meadows between the canal and
// the paths of the real park, tee to basket. Aim with A/D (turn) and W/S
// (nose up or down), E picks the release (hyzer curves left, anhyzer right,
// flat fades left at the end), F the disc (driver, midrange, putter), hold
// Space to charge and let go to throw. The wind pushes the disc; water costs a
// stroke and you throw again from where you were; trees stop a disc. The
// scorecard keeps strokes against par; medals from the total, a record in
// strokes against par (lower is better). Money-neutral: no fee, no prize.
// `window.__discgolf` debug.
const ACCENT = '#f08a2e';
const USE_RADIUS = 2.8;
const DETAIL_M = 520;
// The nine holes of the park, the back nine (the same baskets the other way round,
// played from hole 9 back to 1) and the list of the holes of this round: COURSE
// is refilled when a round starts (setCourse), the meshes cover all eighteen.
const BASE = courseHoles();
const BACK = fullRound(BASE).slice(BASE.length);
const MESH_HOLES = [...BASE, ...BACK];
const COURSE = [...BASE];
// the closest-to-the-basket contest is thrown at the hole nearest 70 m
const CTP_HOLE = BASE.reduce((a, h) => (Math.abs(h.len - 70) < Math.abs(a.len - 70) ? h : a), BASE[0]);
const MODES = [
  { id: 'negen', name: 'Negen banen', rec: 'discgolf', note: 'de ronde van het Stadspark' },
  { id: 'achterkant', name: 'De achterkant', rec: 'discgolf-achterkant', note: 'dezelfde manden, de andere kant op' },
  { id: 'achttien', name: 'Achttien banen', rec: 'discgolf-achttien', note: 'heen en terug, de volle ronde' },
  { id: 'dichtbij', name: 'Dichtbij', rec: 'discgolf-dichtbij', note: 'drie worpen op één mand' },
];
function setCourse(list) {
  COURSE.length = 0;
  COURSE.push(...list);
  if (built) built.holes.forEach((hg, i) => { hg.group.visible = list.includes(MESH_HOLES[i]); });
}
const CENTER = { x: BASE.reduce((a, h) => a + h.tee.x + h.basket.x, 0) / (BASE.length * 2), y: BASE.reduce((a, h) => a + h.tee.y + h.basket.y, 0) / (BASE.length * 2) };
const FIRST = BASE[0];
const STAND = { x: FIRST.tee.x - Math.cos(FIRST.heading) * 3.2 + Math.cos(FIRST.heading + Math.PI / 2) * 1.2, y: FIRST.tee.y - Math.sin(FIRST.heading) * 3.2 + Math.sin(FIRST.heading + Math.PI / 2) * 1.2 };
const HOLE_COLORS = [0xe0452e, 0xf2c230, 0x2f6fd0, 0x2fa04a, 0xe07ab0, 0xf08a2e, 0x8a3ac8, 0x3fb8c8, 0xd8d4cc];
const CHARGE_S = 1.0;
const TEXT_FILL = '#1d2a1f';

let game = null;
let built = null;
let board = null;
let lodT = 0;
let runs = 0;
let aim = null;

const caddieLook = { shirt: 0x3f7a4a, skin: 0xe2b48c, variant: 'male', seed: 8800, look: { age: 'adult', hat: null, bag: null, umbrella: null } };

const lieOk = (map, x, y) => {
  if (isInWater(map, x, y)) return false;
  for (const b of map.buildingsNear(x, y, 1)) {
    const [minx, miny, maxx, maxy] = b.bounds;
    if (x >= minx && x <= maxx && y >= miny && y <= maxy && pointInPolygon(x, y, b.pts)) return false;
  }
  return true;
};

// --- guard trees ---------------------------------------------------------------------------------

function guardTrees(map) {
  const rng = makeRng(4242);
  const out = [];
  MESH_HOLES.forEach((h, i) => {
    const c = Math.cos(h.heading), s = Math.sin(h.heading);
    const at = (t, lat) => ({ x: h.tee.x + c * h.len * t + Math.cos(h.heading + Math.PI / 2) * lat, y: h.tee.y + s * h.len * t + Math.sin(h.heading + Math.PI / 2) * lat });
    const sign = i % 2 ? 1 : -1;
    const spots = [at(0.5 + (rng() - 0.5) * 0.12, sign * (3.2 + rng() * 2)), h.len > 70 ? at(0.86, -sign * (2.6 + rng())) : null];
    for (const p of spots) {
      if (!p || !lieOk(map, p.x, p.y)) continue;
      out.push({ hole: i, x: p.x, y: p.y, r: 0.4, h: 10, crownR: 2.3, crownZ: 3.3 });
    }
  });
  return out;
}

// --- meshes ----------------------------------------------------------------------------------------

let mats = null;

function materials() {
  if (mats) return mats;
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
  mats = {
    pole: std(0x9aa2a8, { metalness: 0.6, roughness: 0.4 }), chain: std(0xc8ced2, { metalness: 0.8, roughness: 0.3 }), rubber: std(0x26282c, { roughness: 0.95 }),
    trunk: std(0x6a4a2e), crown: std(0x3f8a3c, { flatShading: true }), crown2: std(0x4f9e48, { flatShading: true }),
    disc: std(0xf2f0e6, { roughness: 0.4 }), discRim: std(0xe0452e, { roughness: 0.4 }),
    marker: new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.9, depthWrite: false }),
    aimLine: new THREE.LineBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.85 }),
    ghost: new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }),
    wood: std(0x7a5a3a),
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

function holeSign(h, i, M) {
  const g = new THREE.Group();
  mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 6), M.pole, 0, 0.75, 0, g);
  const tex = textTex(256, 128, (c, w, hh) => {
    c.fillStyle = '#f2ede0'; c.fillRect(0, 0, w, hh);
    c.fillStyle = '#' + HOLE_COLORS[i % HOLE_COLORS.length].toString(16).padStart(6, '0'); c.fillRect(0, 0, w, 34);
    c.fillStyle = '#fff'; c.font = 'bold 26px Arial'; c.textAlign = 'center'; c.fillText(`BAAN ${h.n}`, w / 2, 27);
    c.fillStyle = TEXT_FILL; c.font = 'bold 40px Arial'; c.fillText(`PAR ${h.par}`, w / 2, 80);
    c.font = '24px Arial'; c.fillText(`${Math.round(h.len)} m`, w / 2, 112);
  });
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
  plate.position.set(0, 1.5, 0);
  g.add(plate);
  return g;
}

function basketMesh(color, n, M) {
  const g = new THREE.Group();
  mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.5, 8), M.pole, 0, 0.75, 0, g);
  mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.06, 14), new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.4 }), 0, 0.74, 0, g);
  const top = mesh(new THREE.TorusGeometry(0.27, 0.018, 6, 20).rotateX(Math.PI / 2), M.chain, 0, 1.36, 0, g);
  top.castShadow = false;
  const mid = mesh(new THREE.TorusGeometry(0.14, 0.014, 6, 14).rotateX(Math.PI / 2), M.chain, 0, 0.95, 0, g);
  mid.castShadow = false;
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const x0 = Math.cos(a) * 0.27, z0 = Math.sin(a) * 0.27, x1 = Math.cos(a) * 0.14, z1 = Math.sin(a) * 0.14;
    const len = Math.hypot(0.41, 0.13);
    const c = mesh(new THREE.CylinderGeometry(0.008, 0.008, len, 3), M.chain, (x0 + x1) / 2, 1.155, (z0 + z1) / 2, g);
    c.castShadow = false;
    c.rotation.z = Math.atan2(x1 - x0, 0.41) * Math.cos(a) * -1;
    c.rotation.x = Math.atan2(z1 - z0, 0.41) * Math.sin(a);
  }
  // a tall flag so the basket reads from the tee
  mesh(new THREE.CylinderGeometry(0.025, 0.025, 4.2, 6), M.pole, 0.55, 2.1, 0, g);
  const ftex = textTex(128, 64, (c, w, hh) => {
    c.fillStyle = '#' + color.toString(16).padStart(6, '0'); c.fillRect(0, 0, w, hh);
    c.fillStyle = '#fff'; c.font = 'bold 44px Arial'; c.textAlign = 'center'; c.fillText(String(n), w / 2, 48);
  });
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.5), new THREE.MeshBasicMaterial({ map: ftex, side: THREE.DoubleSide }));
  flag.position.set(1.05, 3.85, 0);
  g.add(flag);
  return g;
}

function treeMesh(M) {
  const g = new THREE.Group();
  mesh(new THREE.CylinderGeometry(0.28, 0.4, 3.6, 7), M.trunk, 0, 1.8, 0, g);
  mesh(new THREE.IcosahedronGeometry(2.3, 0), M.crown, 0, 5.2, 0, g);
  mesh(new THREE.IcosahedronGeometry(1.6, 0), M.crown2, 0.6, 7.2, 0.3, g);
  return g;
}

function buildCourse(w) {
  const M = materials();
  const root = new THREE.Group();
  const holes = MESH_HOLES.map((h, i) => {
    const hg = new THREE.Group();
    const pad = mesh(new THREE.BoxGeometry(2.6, 0.05, 1.3), M.rubber, 0, 0.025, 0, hg);
    pad.position.set(h.tee.x, 0.03, h.tee.y);
    pad.rotation.y = -h.heading;
    const sign = holeSign(h, i, M);
    const sx = h.tee.x - Math.cos(h.heading) * 1.8 + Math.cos(h.heading + Math.PI / 2) * 1.5;
    const sy = h.tee.y - Math.sin(h.heading) * 1.8 + Math.sin(h.heading + Math.PI / 2) * 1.5;
    sign.position.set(sx, 0, sy);
    sign.rotation.y = -h.heading - Math.PI / 2;
    hg.add(sign);
    const basket = basketMesh(HOLE_COLORS[i % HOLE_COLORS.length], h.n, M);
    basket.position.set(h.basket.x, 0, h.basket.y);
    basket.rotation.y = -h.heading;
    hg.add(basket);
    hg.visible = COURSE.includes(h);
    root.add(hg);
    return { group: hg, basket };
  });
  const trees = guardTrees(w.map);
  for (const t of trees) {
    const m = treeMesh(M);
    m.position.set(t.x, 0, t.y);
    m.rotation.y = (t.x * 13.7) % 6.28;
    root.add(m);
  }
  const disc = new THREE.Group();
  const body = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 16), M.disc, 0, 0, 0, disc);
  body.castShadow = false;
  mesh(new THREE.TorusGeometry(0.2, 0.025, 5, 16).rotateX(Math.PI / 2), M.discRim, 0, 0, 0, disc).castShadow = false;
  disc.scale.setScalar(1.8);
  disc.visible = false;
  const marker = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 1.0, 24).rotateX(-Math.PI / 2), M.marker);
  marker.add(ring);
  marker.visible = false;
  const lineGeo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 48 }, () => new THREE.Vector3()));
  const line = new THREE.Line(lineGeo, M.aimLine);
  line.frustumCulled = false;
  line.visible = false;
  const lie = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 12), M.disc);
  lie.visible = false;
  const caddie = buildPersonMesh(caddieLook.shirt, caddieLook.skin, caddieLook);
  caddie.visible = false;
  getScene().add(root, disc, marker, line, lie, caddie);
  return { root, holes, trees, disc, marker, line, lie, caddie };
}

function updateLod(w) {
  const d = Math.hypot(w.player.x - CENTER.x, w.player.y - CENTER.y);
  if (!built && d < DETAIL_M) built = buildCourse(w);
  if (!built) return;
  built.root.visible = d < DETAIL_M + 80 || !!game;
}

// --- map icon -------------------------------------------------------------------------------------------

function drawIcon(ctx, s) {
  iconDisc(ctx, s, ACCENT);
  ctx.save();
  ctx.scale(s, s);
  ctx.strokeStyle = '#f2ede0';
  ctx.fillStyle = '#f2ede0';
  ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.ellipse(0, 1.7, 2.6, 0.9, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-1.8, 1.4); ctx.lineTo(-1, -1.8); ctx.moveTo(1.8, 1.4); ctx.lineTo(1, -1.8); ctx.moveTo(0, 1.6); ctx.lineTo(0, -2.4); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, -2, 1.7, 0.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// --- prompt and start -----------------------------------------------------------------------------------

function nearStand(w) {
  const p = w.player;
  if (game || w.pigeonMode || w.heliRun || p.inVehicle || p.swimming) return false;
  return Math.hypot(p.x - STAND.x, p.y - STAND.y) < USE_RADIUS;
}

function recText() {
  const rec = getChallengeRecord('discgolf');
  return rec && rec.best != null ? `Record: ${relText(rec.best)} t.o.v. par${rec.medal ? ' · ' + MEDALS[rec.medal].toLowerCase() : ''}` : null;
}

function prompt(w) {
  if (!nearStand(w)) return null;
  const why = activityBlock(w);
  return { id: 'discgolf', x: STAND.x, y: STAND.y, h: 2.2, key: 'E', label: 'Discgolf', sub: why || recText() || 'Kies je ronde in het Stadspark · gratis', ring: true, dim: !!why };
}

function secondary(w) {
  if (game || w.player.inVehicle) return [];
  if (Math.hypot(w.player.x - CENTER.x, w.player.y - CENTER.y) > 160) return [];
  return [{ id: 'discgolf-2', x: STAND.x, y: STAND.y, h: 2.2, label: 'Discgolf Stadspark', sub: 'Loop naar de eerste tee en druk E', kind: 'place' }];
}

function interact(w) {
  if (!nearStand(w)) return false;
  const why = activityBlock(w);
  if (why) { w.addMessage(why, 2.5); return true; }
  // with guests in the session the round is an invitation to everyone (Meedoen? J/N); pressing E again starts at once (#443)
  const uit = wedNodigUit(w, 'discgolf');
  if (uit.ok) { if (uit.reden === 'wacht') wedNuStarten(w); return true; }
  start(w);
  return true;
}

function newHoleWind(rng = Math.random) {
  return { speed: rng() * 4.6, dir: rng() * Math.PI * 2 };
}

// online: 'host' (who opened the game, at the stand) or 'gast' (on his own screen): everybody plays the same nine holes at once, with the same wind and the same scatter (#443)
function start(w, { force = false, online = null } = {}) {
  if (game) return false;
  if (!force && !online && activityBlock(w)) return false;
  if (!built) built = buildCourse(w);
  const p = w.player;
  if (p.inVehicle && p.exitVehicle) p.exitVehicle(w.map, w);
  document.body.classList.add('discgolf-on');
  ensureBoard();
  board.show();
  runs++;
  setCourse(BASE);
  game = {
    mode: 'negen', pickMode: 0, ctp: null,
    t: 0, hole: 0, strokes: 0, phase: 'aim', phaseT: 0, card: newCard(COURSE), lie: null, lastLie: null, yaw: 0, loft: 0.15, release: 0, disc: 'driver',
    charge: 0, charging: false, wind: newHoleWind(), flight: null, flash: null, cam: null, said: 0, trees: built.trees, rng: Math.random, online,
  };
  beginHole(w);
  if (online) { // the host's invitation said what is played: nine holes, no choice of round
    if (online === 'host') showCard(w, { kind: 'tip', kicker: 'Discgolf', title: 'Negen banen tegen elkaar', body: 'Iedereen speelt dezelfde baan tegelijk op het eigen scherm, met dezelfde wind. Het scorebord toont de stand. [Backspace] stopt.' });
    return true;
  }
  game.phase = 'mode';
  showCard(w, { kind: 'tip', kicker: 'Discgolf', title: 'Het Stadspark, kies je ronde', body: 'Kies eerst een ronde met [A] [D] en [Spatie]: negen banen, de achterkant, achttien banen of drie worpen op één mand. Daarna: [A] [D] richten, [W] [S] hoek, [E] release, [F] disc, houd [Spatie] om te laden en laat los om te gooien.', duration: 9, key: 'discgolf-help', voice: false });
  say(w, 'start', true);
  return true;
}

// The round is picked: refill COURSE, start a fresh card and tee off.
function chooseMode(w, id) {
  const g = game;
  g.mode = id;
  setCourse(id === 'achterkant' ? BACK : id === 'achttien' ? fullRound(BASE) : id === 'dichtbij' ? [CTP_HOLE] : BASE);
  g.card = newCard(COURSE);
  g.hole = 0;
  g.ctp = id === 'dichtbij' ? { dists: [] } : null;
  say(w, id === 'achterkant' ? 'back' : id === 'achttien' ? 'full' : id === 'dichtbij' ? 'ctp' : 'start', true);
  beginHole(w);
}

function beginHole(w) {
  const g = game;
  const h = COURSE[g.hole];
  g.strokes = 0;
  g.lie = { x: h.tee.x, y: h.tee.y };
  g.lastLie = { ...g.lie };
  g.wind = newHoleWind(g.online ? makeRng(443 + g.hole * 97 + 5) : Math.random);
  g.phase = 'aim';
  g.phaseT = 0;
  g.cam = null;
  setLie(w, true);
  if (g.wind.speed > 3.5) say(w, 'windy');
}

// A new lie: stand there, face the basket, take the disc that fits the distance.
function setLie(w, fresh = false) {
  const g = game;
  const h = COURSE[g.hole];
  const dx = h.basket.x - g.lie.x, dy = h.basket.y - g.lie.y;
  const dist = Math.hypot(dx, dy);
  g.yaw = Math.atan2(dy, dx);
  g.disc = suggestDisc(dist);
  g.loft = g.disc === 'putter' ? 0.1 : 0.15;
  g.release = 0;
  g.charge = 0;
  g.charging = false;
  const p = w.player;
  p.x = g.lie.x; p.y = g.lie.y; p.angle = g.yaw; p.speed = 0; p.moving = false; p.vx = 0; p.vy = 0; p.z = 0;
  const side = g.yaw + Math.PI / 2;
  w.companionHold = { x: g.lie.x - Math.cos(g.yaw) * 1.6 - Math.cos(side) * 2.2, y: g.lie.y - Math.sin(g.yaw) * 1.6 - Math.sin(side) * 2.2, face: g.yaw };
  if (built) {
    built.caddie.visible = true;
    built.caddie.position.set(g.lie.x - Math.cos(g.yaw) * 1.4 + Math.cos(side) * 1.9, 0, g.lie.y - Math.sin(g.yaw) * 1.4 + Math.sin(side) * 1.9);
    built.caddie.rotation.y = -g.yaw;
    built.lie.visible = !fresh;
    built.lie.position.set(g.lie.x, 0.03, g.lie.y);
    built.disc.visible = false;
  }
  aim = null;
}

// --- throwing ---------------------------------------------------------------------------------------------

function envFor(w) {
  const g = game;
  const h = COURSE[g.hole];
  return { wind: g.wind, trees: g.trees, basket: h.basket, water: (x, y) => !lieOk(w.map, x, y), rng: g.online ? makeRng(443 + g.hole * 101 + g.strokes * 7919) : g.rng };
}

function throwDisc(w, power, over = {}) {
  const g = game;
  const h = COURSE[g.hole];
  const params = { x: g.lie.x, y: g.lie.y, yaw: over.yaw ?? g.yaw, power, loft: over.loft ?? g.loft, release: over.release ?? g.release, disc: over.disc ?? g.disc };
  const res = simulateFlight(params, envFor(w));
  g.strokes++;
  g.flight = { res, t: 0, params, step: 0.06 };
  g.phase = 'flight';
  g.phaseT = 0;
  g.cam = null;
  g.flash = null;
  if (built) { built.line.visible = false; built.marker.visible = false; }
  return res;
}

function afterFlight(w) {
  const g = game;
  const h = COURSE[g.hole];
  const res = g.flight.res;
  g.flight = null;
  if (built) built.disc.visible = false;
  if (g.ctp) { ctpThrown(w, res, h); return; }
  if (res.holed) { holeDone(w, g.strokes, res.reason); return; }
  const bad = res.reason === 'water';
  if (bad) {
    g.strokes++;
    g.flash = { text: 'Plons! +1 en opnieuw vanaf je vorige worp', t: 3, bad: true };
    say(w, 'water', true);
  } else {
    g.lastLie = { ...g.lie };
    g.lie = { x: res.end.x, y: res.end.y };
    const left = Math.hypot(h.basket.x - g.lie.x, h.basket.y - g.lie.y);
    if (res.reason === 'tree') { g.flash = { text: 'Tegen de boom', t: 2.4, bad: true }; say(w, 'tree'); }
    else if (res.reason === 'rattle') { g.flash = { text: 'Aan de ketting, er weer uit', t: 2.4, bad: true }; say(w, 'rattle'); }
    else g.flash = { text: `Nog ${Math.round(left)} m naar de mand`, t: 2.4 };
  }
  if (g.strokes >= h.par + MAX_OVER_PAR) { holeDone(w, g.strokes, 'opgepakt'); return; }
  g.phase = 'landed';
  g.phaseT = 0;
}

// Closest to the basket: note how close the disc came, then tee off again.
function ctpThrown(w, res, h) {
  const g = game;
  const d = res.holed ? 0 : res.reason === 'water' ? null : Math.hypot(h.basket.x - res.end.x, h.basket.y - res.end.y);
  g.ctp.dists.push(d);
  const pts = ctpPoints(d);
  g.flash = { text: d == null ? 'Plons: nul punten' : d === 0 ? `In de mand! ${pts} punten` : `${d.toFixed(1).replace('.', ',')} m van de mand: ${pts} punten`, t: 2.6, bad: d == null };
  if (g.ctp.dists.length >= CTP.throws) { end(w); return; }
  g.lie = { x: h.tee.x, y: h.tee.y };
  g.phase = 'landed';
  g.phaseT = 0;
}

function holeDone(w, strokes, why) {
  const g = game;
  const h = COURSE[g.hole];
  const entry = finishHole(g.card, g.hole, strokes);
  if (g.online) { const sl = Math.min(strokes, h.par + MAX_OVER_PAR); if (g.online === 'host') wedHostScore(w, g.hole, sl); else wedGastScore(w, g.hole, sl); }
  const name = why === 'opgepakt' ? 'Opgepakt' : holeName(strokes, h.par);
  g.flash = { text: `${name}: ${strokes} worp${strokes === 1 ? '' : 'en'} (par ${h.par})`, t: 3, bad: strokes > h.par };
  const d = strokes - h.par;
  say(w, strokes === 1 ? 'ace' : d <= -2 ? 'eagle' : d === -1 ? 'birdie' : d === 0 ? 'par' : d === 1 ? 'bogey' : 'worse', true);
  if (strokes === 1 && why !== 'opgepakt') unlockAchievement(w, 'discgolf_ace');
  g.phase = 'holeDone';
  g.phaseT = 0;
  g.lastEntry = entry;
}

function nextHole(w) {
  const g = game;
  g.hole++;
  if (g.hole >= COURSE.length) {
    if (g.online) { g.hole = COURSE.length - 1; g.phase = 'wacht'; g.phaseT = 0; g.flash = null; return; } // all holes done: wait for the others (the host ends the round)
    end(w); return;
  }
  beginHole(w);
}

function stepFlight(w, dt) {
  const g = game;
  const f = g.flight;
  f.t += dt;
  const path = f.res.path;
  const idx = f.t / f.step;
  const last = path.length - 1;
  const i = Math.min(last, Math.floor(idx));
  const j = Math.min(last, i + 1);
  const k = Math.min(1, idx - i);
  const a = path[i], b = path[j];
  const x = a[0] + (b[0] - a[0]) * k, y = a[1] + (b[1] - a[1]) * k, z = a[2] + (b[2] - a[2]) * k;
  f.pos = { x, y, z };
  if (built) {
    built.disc.visible = true;
    built.disc.position.set(x, Math.max(0.06, z), y);
    built.disc.rotation.set(0, f.t * 26, 0);
    built.disc.rotateZ(-f.params.release * 0.35);
  }
  if (idx >= last + 4) afterFlight(w);
}

// --- the game loop ------------------------------------------------------------------------------------------

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
  const h = COURSE[g.hole];
  if (g.phase === 'mode') {
    if (input.wasPressed('a') || input.wasPressed('arrowleft')) { input.consume('a'); input.consume('arrowleft'); g.pickMode = (g.pickMode + MODES.length - 1) % MODES.length; }
    if (input.wasPressed('d') || input.wasPressed('arrowright')) { input.consume('d'); input.consume('arrowright'); g.pickMode = (g.pickMode + 1) % MODES.length; }
    if (input.wasPressed(' ') || input.wasPressed('enter')) { input.consume(' '); input.consume('enter'); chooseMode(w, MODES[g.pickMode].id); }
    return;
  }
  if (g.phase === 'aim') {
    const slow = input.isDown('shift') ? 0.3 : 1;
    const ax = (input.isDown('d') || input.isDown('arrowright') ? 1 : 0) - (input.isDown('a') || input.isDown('arrowleft') ? 1 : 0);
    const ay = (input.isDown('w') || input.isDown('arrowup') ? 1 : 0) - (input.isDown('s') || input.isDown('arrowdown') ? 1 : 0);
    g.yaw += ax * dt * 0.55 * slow;
    g.loft = clamp(g.loft + ay * dt * 0.3 * slow, 0.02, 0.5);
    if (input.wasPressed('e')) { input.consume('e'); const i = RELEASES.findIndex((r) => r.id === g.release); g.release = RELEASES[(i + 1) % 3].id; }
    if (input.wasPressed('f')) { input.consume('f'); const i = DISC_ORDER.indexOf(g.disc); g.disc = DISC_ORDER[(i + 1) % 3]; }
    p.angle = g.yaw;
    if (input.isDown(' ')) {
      g.charging = true;
      g.charge = Math.min(1, g.charge + dt / CHARGE_S);
    } else if (g.charging) {
      g.charging = false;
      const power = Math.max(0.12, g.charge);
      g.charge = 0;
      throwDisc(w, power);
    }
  } else if (g.phase === 'flight') {
    stepFlight(w, dt);
  } else if (g.phase === 'landed') {
    if (g.phaseT > 1.7) { setLie(w); g.phase = 'aim'; g.phaseT = 0; g.cam = null; }
  } else if (g.phase === 'holeDone') {
    if (g.phaseT > 3) nextHole(w);
  }
}

function end(w, { quit = false, extern = false, uitslag = null } = {}) {
  const g = game;
  if (!g) return;
  game = null;
  w.companionHold = null;
  w.cameraOverride = null;
  document.body.classList.remove('discgolf-on');
  if (board) board.hide();
  clearBubbles(w, 'discgolf');
  if (built) { built.line.visible = false; built.marker.visible = false; built.disc.visible = false; built.lie.visible = false; built.caddie.visible = !quit; built.caddieUntil = w.time + 14; }
  const p = w.player;
  if (!lieOk(w.map, p.x, p.y)) { p.x = STAND.x; p.y = STAND.y; }
  if (g.online) { setCourse(BASE); eindeOnline(w, g, quit, extern, uitslag); return; }
  if (quit) { setCourse(BASE); w.addMessage('Discgolf gestopt', 2.5); return; }
  if (g.ctp) { endCtp(w, g); setCourse(BASE); return; }
  const t = cardTotals(g.card);
  const mode = MODES.find((m) => m.id === g.mode) || MODES[0];
  const medal = g.mode === 'negen' ? courseMedal(t.rel) : roundMedal(t.rel, COURSE.length);
  const rec = recordChallengeResult(w, mode.rec, { value: t.rel, medal, lower: true });
  if (g.mode === 'achterkant') unlockAchievement(w, 'discgolf_achterkant');
  if (g.mode === 'achttien') unlockAchievement(w, 'discgolf_achttien');
  recordStat(w, 'discgolfRounds');
  unlockAchievement(w, 'discgolf_klaar');
  if (medal >= 3) unlockAchievement(w, 'discgolf_goud');
  const stats = [['Worpen', String(t.strokes)], ['Par', String(t.par)], ['Score', relText(t.rel)]];
  if (g.card.aces) stats.push(['Aces', String(g.card.aces)]);
  if (medal) stats.push(['Medaille', MEDALS[medal]]);
  if (rec && rec.newBest) stats.push(['Record', 'Nieuw!']);
  showBanner({ kind: medal ? 'pass' : 'fail', title: medal >= 3 ? 'ONDER PAR IN HET STADSPARK' : medal ? 'NETTE RONDE' : 'DE EENDEN HEBBEN GEWONNEN', reason: medal ? `${relText(t.rel)} t.o.v. par over ${COURSE.length === 9 ? 'negen' : COURSE.length} banen` : 'Probeer het nog eens: kijk naar de wind en de vlag', reward: 0, stats });
  say(w, medal >= 2 ? 'endGood' : 'endPoor', true, true);
  setCourse(BASE);
}

// Online (#443): wie stopt laat de anderen doorspelen; de uitslag en de beloning komen van wie het spel opende (coopwedstrijd.js).
function eindeOnline(w, g, quit, extern, res) {
  if (quit) {
    if (!extern) { if (g.online === 'host') wedScoreStop(w); else wedGastVerlaat(w); } // the host stops it for everybody, a guest only for himself
    w.addMessage('Discgolf gestopt', 2.5);
    return;
  }
  if (g.online === 'gast' || !res) return; // a guest: the results card and the prize message come from the host
  recordStat(w, 'discgolfRounds');
  unlockAchievement(w, 'discgolf_klaar');
  const jij = res.jij || { plek: 0, geld: 0, xp: 0 };
  loopbaanVerdien(w, 'golf', jij.geld, { xp: jij.xp, n: 1, uniek: 'discgolf', deel: false }); // the prize is per place; the guests get theirs from the host
  if (jij.geld > 0) w.addMessage(`Beloning: €${jij.geld.toLocaleString('nl-NL')}`, 4);
}

function endCtp(w, g) {
  const r = ctpRound(g.ctp.dists.map((d) => (d == null ? NaN : d)));
  const rec = recordChallengeResult(w, 'discgolf-dichtbij', { value: r.points, medal: r.medal });
  recordStat(w, 'discgolfCtp');
  unlockAchievement(w, 'discgolf_klaar');
  if (r.medal >= 3) unlockAchievement(w, 'discgolf_dichtbij_goud');
  const stats = [['Punten', String(r.points)], ['Dichtstbij', Number.isFinite(r.best) ? `${r.best.toFixed(1).replace('.', ',')} m` : 'geen']];
  if (r.medal) stats.push(['Medaille', MEDALS[r.medal]]);
  if (rec && rec.newBest) stats.push(['Record', 'Nieuw!']);
  showBanner({ kind: r.medal ? 'pass' : 'fail', title: r.medal >= 3 ? 'RECHT OP DE MAND' : r.medal ? 'NET ERNAAST' : 'TE VER VAN DE MAND', reason: r.medal ? `${r.points} punten over drie worpen` : 'Gooi zacht en vlak: dichtbij telt meer dan ver', reward: 0, stats });
  say(w, r.medal >= 2 ? 'endGood' : 'endPoor', true, true);
}

// --- speech -----------------------------------------------------------------------------------------------------

function say(w, kind, force = false, after = false) {
  const list = DISC_LINES[kind] || DISCEXT_LINES[kind];
  if (!list || !built) return;
  const g = game;
  if (g && !force && g.t - g.said < 8) return;
  if (g) g.said = g.t;
  const c = built.caddie;
  const text = pick(list);
  bubble(w, { x: c.position.x, y: c.position.z, name: DISC_LINES.who, text, h: 2.1, tag: 'discgolf', ttl: after ? 4 : 0 });
}

// --- 3D and HUD per frame --------------------------------------------------------------------------------------

function previewLine(w) {
  const g = game;
  if (!built || g.phase !== 'aim') { if (built) { built.line.visible = false; built.marker.visible = false; } return; }
  const power = g.charging ? Math.max(0.12, g.charge) : 1;
  const sig = [g.yaw.toFixed(3), g.loft.toFixed(3), g.release, g.disc, power.toFixed(2), g.lie.x, g.hole].join('|');
  if (aim && aim.sig === sig) return;
  const res = simulateFlight({ x: g.lie.x, y: g.lie.y, yaw: g.yaw, power, loft: g.loft, release: g.release, disc: g.disc }, { trees: g.trees, basket: COURSE[g.hole].basket, rng: makeRng(7) }); // vaste rng: de voorbeeldlijn bij de mand knippert niet bij elke frame
  aim = { sig, res };
  const pos = built.line.geometry.attributes.position;
  const path = res.path;
  for (let i = 0; i < 48; i++) {
    const k = (i / 47) * (path.length - 1);
    const a = path[Math.floor(k)], b = path[Math.min(path.length - 1, Math.floor(k) + 1)];
    const f = k - Math.floor(k);
    pos.setXYZ(i, a[0] + (b[0] - a[0]) * f, Math.max(0.1, a[2] + (b[2] - a[2]) * f), a[1] + (b[1] - a[1]) * f);
  }
  pos.needsUpdate = true;
  built.line.visible = true;
  built.line.material = g.charging ? mats.aimLine : mats.ghost;
  built.marker.visible = true;
  built.marker.position.set(res.end.x, 0.08, res.end.y);
  built.marker.scale.setScalar(g.charging ? 1 : 0.7);
}

function windArrow(g) {
  // relative to the aim: up is a tailwind
  const rel = g.wind.dir - g.yaw;
  const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
  return arrows[((Math.round(rel / (Math.PI / 4)) % 8) + 8) % 8];
}

function sync3D(w, dt) {
  if (!built) return;
  if (game) previewLine(w);
  if (built.caddie.visible) {
    animatePersonWalk(built.caddie, 0, dt);
    if (!game && built.caddieUntil && w.time > built.caddieUntil) { built.caddie.visible = false; built.caddieUntil = 0; clearBubbles(w, 'discgolf'); }
  }
}

function camera(w) {
  const g = game;
  if (!g) return;
  const h = COURSE[g.hole];
  let pos, at;
  if (g.phase === 'flight' && g.flight && g.flight.pos) {
    const f = g.flight.pos;
    const yaw = g.flight.params.yaw;
    pos = { x: f.x - Math.cos(yaw) * 9, y: f.y - Math.sin(yaw) * 9, z: Math.max(2.6, f.z + 2.4) };
    at = { x: f.x + Math.cos(yaw) * 4, y: f.y + Math.sin(yaw) * 4, z: Math.max(0.4, f.z) };
  } else if (g.phase === 'landed' || g.phase === 'holeDone') {
    const tx = g.phase === 'holeDone' ? h.basket.x : g.lie.x, ty = g.phase === 'holeDone' ? h.basket.y : g.lie.y;
    const yaw = g.flight ? g.flight.params.yaw : g.yaw;
    pos = { x: tx - Math.cos(yaw) * 9, y: ty - Math.sin(yaw) * 9, z: 4 };
    at = { x: tx, y: ty, z: 0.8 };
  } else {
    pos = { x: g.lie.x - Math.cos(g.yaw) * 4.6, y: g.lie.y - Math.sin(g.yaw) * 4.6, z: 2.5 };
    const far = Math.min(60, Math.hypot(h.basket.x - g.lie.x, h.basket.y - g.lie.y));
    at = { x: g.lie.x + Math.cos(g.yaw) * far * 0.55, y: g.lie.y + Math.sin(g.yaw) * far * 0.55, z: 1.2 };
  }
  const k = g.phase === 'flight' ? 0.22 : 0.1;
  const c = easeCamera(g, pos, at, k);
  w.cameraOverride = { position: c.position, lookAt: c.lookAt, fov: 58, cut: true };
}

function ensureBoard() {
  if (!board) board = createBoard('DISCGOLF STADSPARK', ACCENT);
  return board;
}

function updateHud(w) {
  const g = game;
  if (!g || !board) return;
  if (g.phase === 'mode') {
    const m = MODES[g.pickMode];
    board.set({ row: `<span>Ronde <b>${m.name}</b></span><span>${m.note}</span>`, flash: '', help: `${key('A')}${key('D')} kiezen · ${key('SPATIE')} beginnen · ${key('BACKSPACE')} stoppen` });
    return;
  }
  const h = COURSE[g.hole];
  const dist = Math.hypot(h.basket.x - g.lie.x, h.basket.y - g.lie.y);
  const t = cardTotals(g.card);
  if (g.ctp) {
    const ds = g.ctp.dists.map((d) => (d == null ? 'plons' : `${d.toFixed(1).replace('.', ',')} m`)).join(' · ') || 'nog niets';
    const info = g.phase === 'aim' ? `${DISCS[g.disc].name} · ${RELEASES.find((r) => r.id === g.release).name} · hoek ${Math.round(g.loft * 57.3)}°` : '';
    board.set({ row: `<span>Worp <b>${Math.min(CTP.throws, g.ctp.dists.length + 1)}/${CTP.throws}</b></span><span>Mand <b>${Math.round(dist)} m</b></span><span>${windText(g.wind)} ${windArrow(g)}</span><span>${ds}</span>`, meter: g.phase === 'aim' ? { v: g.charge, color: '#f08a2e' } : null, flash: g.flash ? g.flash.text : info, bad: !!(g.flash && g.flash.bad), help: g.phase === 'aim' ? `${key('A')}${key('D')} richten · ${key('W')}${key('S')} hoek · ${key('E')} release · ${key('F')} disc · houd ${key('SPATIE')} en laat los · ${key('BACKSPACE')} stoppen` : key('BACKSPACE') + ' stoppen' });
    return;
  }
  const online = g.online ? wedScoreRijen(w) : [];
  const stand2 = online.length ? `<span>${online.map((r) => `${r.weg ? '<s>' : ''}${r.naam} ${relText(r.rel)} (${r.banen}/${COURSE.length})${r.weg ? '</s>' : ''}`).join(' · ')}</span>` : '';
  const row = `${stand2}<span>Baan <b>${h.n}</b>/${COURSE.length}</span><span>Par <b>${h.par}</b></span><span>Worp <b>${g.phase === 'aim' ? g.strokes + 1 : g.strokes}</b></span><span>Mand <b>${Math.round(dist)} m</b></span><span>${windText(g.wind)} ${windArrow(g)}</span>`;
  const cells = g.card.holes.map((c, i) => ({ t: c.done ? String(c.strokes) : i === g.hole ? `${g.strokes || '·'}` : String(c.n), cls: `${i === g.hole ? 'on' : ''} ${c.done ? (c.strokes <= c.par ? 'good' : 'bad') : ''}` }));
  const disc = DISCS[g.disc];
  const rel = RELEASES.find((r) => r.id === g.release);
  const info = g.phase === 'aim' ? `${disc.name} · ${rel.name} · hoek ${Math.round(g.loft * 57.3)}°${dist <= CIRCLE_M ? ' · in de cirkel' : ''}` : '';
  const flash = g.flash ? g.flash.text : g.phase === 'wacht' ? 'Alle banen af: wachten op de anderen' : info;
  const help = g.phase === 'aim'
    ? `${key('A')}${key('D')} richten · ${key('W')}${key('S')} hoek · ${key('E')} release · ${key('F')} disc · houd ${key('SPATIE')} en laat los · ${key('BACKSPACE')} stoppen · totaal ${relText(t.rel)}`
    : `Totaal ${relText(t.rel)} · ${key('BACKSPACE')} stoppen`;
  board.set({ row, cells, meter: g.phase === 'aim' ? { v: g.charge, color: '#f08a2e' } : null, flash, bad: !!(g.flash && g.flash.bad), help });
}

// --- the activity ------------------------------------------------------------------------------------------------

// --- playing against others (#443) --------------------------------------------------------------------------------------

// a guest: the host started the round and this guest said yes; the round runs on his own screen
function gastTik(w, dt) {
  if (!game || game.online !== 'gast') return false;
  updateGame(w, dt);
  if (game) { if ((lodT -= dt) <= 0) { lodT = 0.5; updateLod(w); } sync3D(w, dt); updateHud(w); }
  return true;
}
registreerWedstrijd('discgolf', {
  naam: 'Discgolf', soort: 'score',
  banen: () => BASE.map((h) => ({ par: h.par })),
  start: (w) => start(w, { online: 'host' }),
  plek: () => ({ ...STAND }),
  gastPlek: (w, x, y) => !game && Math.hypot(x - STAND.x, y - STAND.y) < USE_RADIUS + 1.5, // a guest asks at the stand (#452)
  eind: (w, res) => { if (game && game.online === 'host') end(w, res ? { uitslag: res } : { quit: true, extern: true }); },
  solo: (w) => start(w),
});
zetWedGastHaken('discgolf', {
  dichtbij: (w) => nearStand(w),
  start: (w) => start(w, { online: 'gast', force: true }),
  eind: (w, uit) => { if (game && game.online === 'gast') end(w, uit.gestopt ? { quit: true, extern: true } : { uitslag: uit }); },
  tik: gastTik,
});

export const DISCGOLF = {
  id: 'discgolf',
  layer: 'discgolf',
  legend: { kind: 'act-discgolf', label: 'Discgolf', note: 'negen banen in het Stadspark: gooi de disc in de mand' },
  init(w) {
    window.__discgolf = {
      spot: () => ({ ...STAND }),
      holes: () => COURSE.map((h) => ({ n: h.n, par: h.par, len: Math.round(h.len), tee: { ...h.tee }, basket: { ...h.basket } })),
      start: (force = true) => start(w, { force }),
      mode: (id) => (game && game.phase === 'mode' ? (chooseMode(w, id), true) : false),
      modes: () => MODES.map((m) => m.id),
      state: () => (game ? { phase: game.phase, hole: game.hole, strokes: game.strokes, lie: { ...game.lie }, yaw: game.yaw, card: cardTotals(game.card), wind: { ...game.wind }, disc: game.disc } : null),
      throwAt: (power = 0.8, over = {}) => (game && game.phase === 'aim' ? (throwDisc(w, power, over), true) : false),
      sink: () => { if (!game) return false; if (game.phase === 'flight') afterFlight(w); if (game && game.phase !== 'holeDone') holeDone(w, Math.max(1, game.strokes + 1), 'chains'); return true; },
      skip: () => { if (!game) return false; game.phase = 'holeDone'; game.phaseT = 99; return true; },
      finish: () => { if (!game) return false; for (let i = game.hole; i < COURSE.length; i++) { game.hole = i; holeDone(w, COURSE[i].par, 'chains'); } game.hole = COURSE.length - 1; nextHole(w); return true; },
      quit: () => { if (!game) return false; end(w, { quit: true }); return true; },
    };
  },
  spots: () => [{ id: 'discgolf', name: 'Discgolf Stadspark', x: STAND.x, y: STAND.y }],
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
  mapSub: () => recText() || 'Discgolf: negen banen in het Stadspark',
  ubbo(w) {
    const d = Math.hypot(STAND.x - w.player.x, STAND.y - w.player.y);
    const rec = getChallengeRecord('discgolf');
    return { name: 'Discgolf Stadspark', sub: rec && rec.medal ? `record: ${MEDALS[rec.medal].toLowerCase()}` : 'negen banen, gratis', dist: d, x: STAND.x, y: STAND.y, play: 'discgolf', where: 'de eerste tee in het Stadspark', hint: 'loop naar de tee en druk E' };
  },
  runs: () => runs,
};
