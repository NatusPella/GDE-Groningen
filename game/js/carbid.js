import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { buildPersonMesh, animatePersonWalk } from './models3d_people.js';
import { showBanner } from './cinematics.js';
import { pushAudioEvent } from './pedgeom.js';
import { unlockAchievement, recordChallengeResult, getChallengeRecord, recordStat, MEDALS } from './achievements.js';
import { showCard } from './hudcards.js';
import { spawnExplosionFx, spawnFxPuff } from './fx3d.js';
import { flashMuzzleLight } from './nightlights3d.js';
import { refreshDayNight } from './daynight.js';
import { countrySurface } from './countryfield.js';
import { activityBlock, iconDisc } from './activitykit.js';
import { addStaticCollider } from './breakables.js';
import { CARBID_LINES } from './funlines.js';
import { ROELF_LOOK, HILJE_LOOK } from './storycast.js';
import { rand } from './rng.js';

// Carbid schieten, the Groningen New Year's bang, on a meadow off the
// Beijumerweg between Beijum and Zuidwolde. Boer Roelf and Hilje have a
// milk churn on a trestle: hold Space to pour water on the carbid, the lid
// goes on and the gas builds (the ring on the field shows where the lid
// would land right now), E lights it. Too early is a plof, too late and the
// gas has leaked away. The lid flies (gravity, drag, wind) at round bales,
// oil drums and the stroman; five shots, points for hits and distance,
// medals and a record. The field's frame: u along the firing line, v across
// it (to the right, seen from the churn). `window.__carbid` debug.

// a long strip of meadow between two ditches, fired along (the tree rows
// stand on the ditches, beside the range rather than across it)
const FIELD = { x: 1683.9, y: -4025.98, rot: -1.5875 };
const SHOTS = 5;
const YAW_MAX = 0.42, EL_MIN = 0.26, EL_MAX = 0.8;
const POUR_RATE = 0.5;
const G = 9.81, DRAG = 0.0035, WIND_PUSH = 0.35;
const USE_RADIUS = 2.4;
const DETAIL_M = 260;
const ACCENT = '#e8823a';
const PRIZE = [0, 20, 45, 90];
const MEDAL_AT = [0, 45, 80, 120];
const POINTS = { baal: 10, ton: 20, pop: 40 };
const DUSK = 19.2;

const TARGETS = [
  { kind: 'baal', u: 15, v: 3 }, { kind: 'baal', u: 32, v: -4 }, { kind: 'baal', u: 38, v: 5 }, { kind: 'baal', u: 47, v: -1 },
  { kind: 'ton', u: 47, v: -1, on: 3 }, { kind: 'baal', u: 55, v: 6 }, { kind: 'baal', u: 73, v: -5 },
  { kind: 'baal', u: 81, v: 3 }, { kind: 'ton', u: 81, v: 3, on: 7 }, { kind: 'ton', u: 89, v: -3 }, { kind: 'pop', u: 96, v: 4 },
];

let game = null;
let built = null;
let hud = null;
let lodT = 0;
let runs = 0;

const C = Math.cos(FIELD.rot), S = Math.sin(FIELD.rot);
const toW = (u, v) => ({ x: FIELD.x + C * u - S * v, y: FIELD.y + S * u + C * v });
const STAND = toW(-1.4, 1.7);

// --- meshes ------------------------------------------------------------------------------

let mats = null;
function materials() {
  if (mats) return mats;
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
  const label = document.createElement('canvas');
  label.width = 128; label.height = 64;
  const g = label.getContext('2d');
  g.fillStyle = '#e9e0c8'; g.fillRect(0, 0, 128, 64);
  g.fillStyle = '#b8352a'; g.fillRect(0, 0, 128, 14);
  g.fillStyle = '#1d1d1d'; g.font = 'bold 30px Arial'; g.textAlign = 'center'; g.fillText('CARBID', 64, 48);
  const tex = new THREE.CanvasTexture(label);
  tex.colorSpace = THREE.SRGBColorSpace;
  mats = {
    churn: std(0xc8ced2, { roughness: 0.38, metalness: 0.35 }), lid: std(0x9aa2a8, { roughness: 0.4, metalness: 0.35 }),
    wood: std(0x7a5a3a), plank: std(0x9a7a52), straw: std(0xd6b46a), strawEnd: std(0xc29a52),
    red: std(0xb8352a, { roughness: 0.6, metalness: 0.3 }), blue: std(0x2f5f9a, { roughness: 0.6, metalness: 0.3 }),
    cloth: std(0x9a2f2f), bag: std(0xffffff, { map: tex }), water: std(0x5a8ab0, { roughness: 0.2 }),
    ring: new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.85, depthWrite: false }),
    ringBad: new THREE.MeshBasicMaterial({ color: 0xff7a3c, transparent: true, opacity: 0.7, depthWrite: false }),
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

// One target's mesh in its own group (so a hit can tumble it).
function targetMesh(t, M) {
  const g = new THREE.Group();
  if (t.kind === 'baal') {
    const body = mesh(new THREE.CylinderGeometry(0.66, 0.66, 1.2, 18), M.straw, 0, 0, 0, g);
    body.rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) { const e = mesh(new THREE.CircleGeometry(0.62, 18), M.strawEnd, 0, 0, s * 0.605, g); if (s < 0) e.rotation.y = Math.PI; }
    t.h = 1.32; t.hu = 0.66; t.hv = 0.6; t.lift = 0.66;
  } else if (t.kind === 'ton') {
    mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.88, 14), Math.random() < 0.5 ? M.red : M.blue, 0, 0, 0, g);
    t.h = 0.88; t.hu = 0.3; t.hv = 0.3; t.lift = 0.44;
  } else {
    mesh(new THREE.BoxGeometry(0.08, 2.2, 0.08), M.wood, 0, 0, 0, g);
    mesh(new THREE.BoxGeometry(0.06, 0.06, 1.4), M.wood, 0, 0.55, 0, g);
    mesh(new THREE.BoxGeometry(0.42, 0.7, 0.3), M.cloth, 0, 0.42, 0, g);
    mesh(new THREE.SphereGeometry(0.22, 10, 8), M.straw, 0, 1.0, 0, g);
    mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 12), M.wood, 0, 1.2, 0, g);
    mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.2, 12), M.wood, 0, 1.3, 0, g);
    t.h = 2.4; t.hu = 0.35; t.hv = 0.7; t.lift = 1.1;
  }
  return g;
}

function buildField() {
  const M = materials();
  const root = new THREE.Group();
  root.position.set(FIELD.x, 0, FIELD.y);
  root.rotation.y = -FIELD.rot;
  // three.js local: x = u, z = v
  const L = (u, v) => [u, v];
  // the trestle and the churn on it (the churn sits in its own group to aim)
  for (const s of [-1, 1]) {
    for (const k of [-1, 1]) {
      const leg = mesh(new THREE.BoxGeometry(0.08, 0.75, 0.08), M.wood, s * 0.45, 0.36, k * 0.22, root);
      leg.rotation.x = k * 0.25;
    }
    mesh(new THREE.BoxGeometry(0.1, 0.06, 0.5), M.wood, s * 0.45, 0.7, 0, root);
  }
  mesh(new THREE.BoxGeometry(1.3, 0.05, 0.36), M.plank, 0, 0.75, 0, root);
  const churn = new THREE.Group();
  churn.position.set(0, 0.98, 0);
  root.add(churn);
  const body = mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.78, 16), M.churn, 0, 0, 0, churn);
  body.rotation.z = -Math.PI / 2;
  const neck = mesh(new THREE.CylinderGeometry(0.13, 0.19, 0.14, 16), M.churn, 0.45, 0, 0, churn);
  neck.rotation.z = -Math.PI / 2;
  const lidHome = new THREE.Vector3(0.54, 0, 0);
  const lid = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.06, 16), M.lid, lidHome.x, 0, 0, churn);
  lid.rotation.z = -Math.PI / 2;
  // props: water bucket, carbid bag, the lontstok
  const [bx, bz] = L(-0.6, -0.9);
  mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.3, 12), M.lid, bx, 0.15, bz, root);
  mesh(new THREE.CircleGeometry(0.15, 12).rotateX(-Math.PI / 2), M.water, bx, 0.28, bz, root);
  const [cx, cz] = L(-0.3, 0.9);
  const bag = mesh(new THREE.BoxGeometry(0.42, 0.5, 0.26), M.bag, cx, 0.25, cz, root);
  bag.rotation.y = 0.4;
  const stick = mesh(new THREE.BoxGeometry(0.04, 1.5, 0.04), M.wood, -0.75, 0.72, 0.6, root);
  stick.rotation.z = 0.35;
  // the targets: a fresh set per game
  for (const t of TARGETS) {
    const m = targetMesh(t, M);
    const [tx, tz] = L(t.u, t.v);
    t.mesh = m; t.home = { x: tx, z: tz };
    root.add(m);
  }
  // landing ring (the gas preview) lives in world space
  // landing ring with a post, so it still reads a hundred metres out
  const ring = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.25, 28).rotateX(-Math.PI / 2), M.ring);
  disc.renderOrder = 3;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6).translate(0, 1.3, 0), M.ring);
  ring.add(disc, post);
  ring.userData.disc = disc;
  ring.visible = false;
  getScene().add(root, ring);
  // Roelf and Hilje
  const roelf = buildPersonMesh(ROELF_LOOK.shirt, ROELF_LOOK.skin, ROELF_LOOK);
  const hilje = buildPersonMesh(HILJE_LOOK.shirt, HILJE_LOOK.skin, HILJE_LOOK);
  const place = (m, u, v, face) => { const p = toW(u, v); m.position.set(p.x, 0, p.y); m.rotation.y = -(FIELD.rot + face); getScene().add(m); return { mesh: m, u, v, x: p.x, y: p.y, face }; };
  const farmers = { Roelf: place(roelf, -2.6, -2.4, 0.7), Hilje: place(hilje, -3.6, 2.8, -0.5) };
  return { root, churn, lid, lidHome, ring, farmers };
}

function resetTargets() {
  for (const t of TARGETS) {
    t.hit = false; t.dyn = null;
    const z0 = t.on != null ? TARGETS[t.on].h : 0;
    t.z = z0;
    t.mesh.position.set(t.home.x, z0 + t.lift, t.home.z);
    t.mesh.rotation.set(0, 0, 0);
    t.mesh.visible = true;
  }
}

function updateLod(w) {
  const d = Math.hypot(w.player.x - FIELD.x, w.player.y - FIELD.y);
  if (!built && d < DETAIL_M) { built = buildField(); resetTargets(); }
  if (!built) return;
  const vis = d < DETAIL_M + 60 || !!game;
  built.root.visible = vis;
  for (const f of Object.values(built.farmers)) f.mesh.visible = vis;
}

// --- map icon ----------------------------------------------------------------------------

function drawIcon(ctx, s) {
  iconDisc(ctx, s, ACCENT);
  ctx.save();
  ctx.scale(s, s);
  ctx.fillStyle = '#f2ede0';
  ctx.beginPath();
  ctx.moveTo(-2.6, -1.4); ctx.lineTo(1.4, -1.4); ctx.lineTo(2.2, -0.8); ctx.lineTo(2.2, 0.8); ctx.lineTo(1.4, 1.4); ctx.lineTo(-2.6, 1.4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath(); ctx.arc(3.2, -1.6, 1, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// --- prompt and start ----------------------------------------------------------------------

function nearStand(w) {
  const p = w.player;
  if (game || w.pigeonMode || w.heliRun || p.inVehicle || p.swimming) return false;
  return Math.hypot(p.x - STAND.x, p.y - STAND.y) < USE_RADIUS;
}

function prompt(w) {
  if (!nearStand(w)) return null;
  const why = activityBlock(w);
  const rec = getChallengeRecord('carbid');
  const sub = why || (rec && rec.best != null ? `Record: ${rec.best} punten${rec.medal ? ' · ' + MEDALS[rec.medal].toLowerCase() : ''}` : 'Vijf schoten met de melkbus van boer Roelf');
  return { id: 'carbid', x: STAND.x, y: STAND.y, h: 2.2, key: 'E', label: 'Carbid schieten', sub, ring: true, dim: !!why };
}

function secondary(w) {
  if (game || w.player.inVehicle) return [];
  if (Math.abs(w.player.x - FIELD.x) > 40 || Math.abs(w.player.y - FIELD.y) > 40) return [];
  return [{ id: 'carbid-2', x: STAND.x, y: STAND.y, h: 2.2, label: 'Carbid schieten', sub: 'Loop naar de melkbus en druk E', kind: 'place' }];
}

function interact(w) {
  if (!nearStand(w)) return false;
  const why = activityBlock(w);
  if (why) { w.addMessage(why, 2.5); return true; }
  start(w);
  return true;
}

function start(w) {
  if (game) return false;
  if (!built) { built = buildField(); }
  resetTargets();
  const p = w.player;
  if (p.inVehicle) p.exitVehicle(w.map, w);
  // carbid is shot at dusk: by day the farmers wait for it
  const h = ((w.clock % 24) + 24) % 24;
  let waited = false;
  if (h >= 8 && h < DUSK) { w.clock = DUSK; refreshDayNight(w); waited = true; }
  p.x = STAND.x; p.y = STAND.y; p.angle = FIELD.rot;
  const mate = toW(-3.2, 4.6);
  w.companionHold = { x: mate.x, y: mate.y, face: FIELD.rot };
  game = {
    t: 0, shot: 0, score: 0, hits: 0, best: 0, phase: 'aim', phaseT: 0, yaw: 0, el: 0.5, water: 0, pouring: false,
    gas: 0, peak: 0, rise: 3, gasT: 0, wind: newWind(), lid: null, flash: null, lastSay: -9, cam: null, log: [],
    // the light stays as it is while you shoot
    clock: w.clock,
  };
  runs++;
  ensureHud();
  hud.root.hidden = false;
  document.body.classList.add('carbid-on');
  showCard(w, { kind: 'tip', kicker: 'Carbid schieten', title: waited ? 'Een paar uur later: het schemert' : 'De melkbus ligt klaar', body: '[A] [D] [W] [S] richten, houd [Spatie] voor water, [E] aansteken als de ring goed ligt. Vijf schoten.', duration: 8, key: 'carbid-help', voice: false });
  say(w, 'Roelf', 'start', true);
  return true;
}

function newWind() {
  return { v: rand(-2.6, 2.6), u: rand(-1.2, 1.2) };
}

// --- the shot -------------------------------------------------------------------------------

function peakFor(water) {
  return water <= 0.65 ? 0.2 + 0.8 * (water / 0.65) : Math.max(0.3, 1 - (water - 0.65) * 1.9);
}

function gasAt(g, t) {
  if (t < g.rise) { const k = t / g.rise; return g.peak * k * k * (3 - 2 * k); }
  if (t < g.rise + 1.1) return g.peak;
  return Math.max(0, g.peak - 0.28 * (t - g.rise - 1.1));
}

function dirOf(g) {
  const a = FIELD.rot + g.yaw;
  return { a, c: Math.cos(a), s: Math.sin(a) };
}

function launchSpeed(power) {
  return 14 + 24 * power;
}

// Landing point for a launch without wind (the preview ring).
function predict(g, power) {
  const { c, s } = dirOf(g);
  const v0 = launchSpeed(power);
  let vh = v0 * Math.cos(g.el), vz = v0 * Math.sin(g.el), d = 0, z = 1.05;
  const dt = 0.02;
  for (let i = 0; i < 400 && (z > 0 || vz > 0); i++) {
    const sp = Math.hypot(vh, vz);
    vh -= DRAG * sp * vh * dt; vz -= (G + DRAG * sp * vz) * dt;
    d += vh * dt; z += vz * dt;
  }
  const mouth = 0.55 * Math.cos(g.el);
  return { x: FIELD.x + c * (d + mouth), y: FIELD.y + s * (d + mouth), d: d + mouth };
}

function mouthPos(g) {
  const { c, s } = dirOf(g);
  const r = 0.55 * Math.cos(g.el);
  return { x: FIELD.x + c * r, y: FIELD.y + s * r, z: 0.98 + 0.55 * Math.sin(g.el) };
}

function ignite(w, g) {
  const gas = gasAt(g, g.gasT);
  const kind = gas < 0.12 ? 'dud' : g.gasT < g.rise * 0.72 ? 'early' : g.gasT > g.rise + 1.1 && gas < g.peak * 0.8 ? 'late' : 'good';
  // lit too soon the mixture is still thin: a weak plof
  const power = kind === 'early' ? gas * 0.6 : gas;
  const m = mouthPos(g);
  const { c, s } = dirOf(g);
  const big = kind === 'good' || power > 0.7;
  pushAudioEvent(w, { kind: 'weapon', sub: big ? 'carbid' : 'burst', x: m.x, y: m.y });
  spawnExplosionFx(m.x + c * 0.4, m.y + s * 0.4, m.z, 0x8a9197, 0.18 + power * 0.42);
  flashMuzzleLight(m.x, m.z + 0.5, m.y, 1.5 + power * 2);
  for (let k = 0; k < 10; k++) spawnFxPuff(m.x, m.z, m.y, c * rand(2, 6) + rand(-1, 1), rand(0.5, 2), s * rand(2, 6) + rand(-1, 1), rand(1, 2), 0.3, 1.6, 0.86, 0.86, 0.84, 0.5, 1.4, 0.3);
  const p = w.player;
  const pd = Math.hypot(m.x - p.x, m.y - p.y);
  w.lastImpact = { strength: Math.min(1, 0.25 + power * 0.6) * (pd < 12 ? 1 : 0.5), time: w.time, x: m.x, y: m.y, blast: true, own: true };
  const v0 = kind === 'dud' ? 3 : launchSpeed(power);
  g.lid = {
    x: m.x, y: m.y, z: m.z, vx: c * v0 * Math.cos(g.el), vy: s * v0 * Math.cos(g.el), vz: v0 * Math.sin(g.el),
    spin: 0, bounces: 0, rest: 0, from: { x: m.x, y: m.y }, hits: 0, wet: false, kind,
  };
  g.recoil = 1;
  g.phase = 'flight';
  g.phaseT = 0;
  g.flash = kind === 'good' ? { text: 'KNAL!', t: 1.4 } : kind === 'early' ? { text: 'Te vroeg: plof', t: 1.6, bad: true } : kind === 'late' ? { text: 'Te laat: gas weg', t: 1.6, bad: true } : { text: 'Pfft', t: 1.4, bad: true };
  say(w, kind === 'good' ? (Math.random() < 0.5 ? 'Roelf' : 'Hilje') : Math.random() < 0.6 ? 'Roelf' : 'Hilje', kind === 'good' ? 'good' : kind === 'late' ? 'late' : 'early', kind !== 'good');
}

// The lid in flight: gravity, drag against the wind, the targets, the ground.
function stepLid(w, g, dt) {
  const L = g.lid;
  const wind = windWorld(g);
  const steps = 4, h = dt / steps;
  for (let i = 0; i < steps; i++) {
    if (L.rest) break;
    const rx = L.vx - wind.x, ry = L.vy - wind.y;
    const sp = Math.hypot(rx, ry, L.vz);
    const air = L.z > 0.05;
    if (air) {
      L.vx -= (DRAG * sp * rx - WIND_PUSH * wind.x * 0.2) * h;
      L.vy -= (DRAG * sp * ry - WIND_PUSH * wind.y * 0.2) * h;
      L.vz -= (G + DRAG * sp * L.vz) * h;
    }
    L.x += L.vx * h; L.y += L.vy * h; L.z += L.vz * h;
    L.spin += h * (8 + Math.hypot(L.vx, L.vy));
    hitTargets(w, g, L);
    if (L.z <= 0.04) {
      if (!L.wet && countrySurface(L.x, L.y) === 'sloot') {
        L.wet = true;
        L.rest = 1; L.vx = L.vy = L.vz = 0; L.z = -0.3;
        pushAudioEvent(w, { kind: 'splash', x: L.x, y: L.y });
        w.particles.push({ kind: 'splash', x: L.x, y: L.y, until: w.time + 1.1 });
        break;
      }
      L.z = 0.04;
      if (L.vz < -2.2) {
        L.vz = -L.vz * 0.28; L.vx *= 0.55; L.vy *= 0.55; L.bounces++;
        pushAudioEvent(w, { kind: 'prop_hit', material: 'metal', strength: Math.min(1, -L.vz / 4 + 0.3), x: L.x, y: L.y });
      } else {
        L.vz = 0;
        const f = Math.exp(-h * 3.2);
        L.vx *= f; L.vy *= f;
        if (Math.hypot(L.vx, L.vy) < 0.25) { L.rest = 1; L.vx = L.vy = 0; }
      }
    }
  }
}

function windWorld(g) {
  const { c, s } = dirOf({ yaw: 0 });
  return { x: c * g.wind.u - s * g.wind.v, y: s * g.wind.u + c * g.wind.v };
}

function targetWorld(t) {
  const p = toW(t.u, t.v);
  return p;
}

function hitTargets(w, g, L) {
  for (const t of TARGETS) {
    if (t.hit) continue;
    const p = targetWorld(t);
    const du = (L.x - p.x) * C + (L.y - p.y) * S, dv = -(L.x - p.x) * S + (L.y - p.y) * C;
    if (Math.abs(du) > t.hu + 0.45 || Math.abs(dv) > t.hv + 0.45 || L.z < t.z - 0.1 || L.z > t.z + t.h + 0.3) continue;
    t.hit = true;
    const sp = Math.hypot(L.vx, L.vy);
    t.dyn = { vx: L.vx * 0.3, vy: L.vy * 0.3, vz: 2 + sp * 0.08, rx: rand(-1, 1) * 4, rz: (2 + sp * 0.15) * (Math.random() < 0.5 ? -1 : 1) };
    // the drum on top of a hit bale falls with it
    for (const q of TARGETS) if (q.on != null && TARGETS[q.on] === t && !q.hit) { q.hit = true; q.bonus = true; q.dyn = { vx: L.vx * 0.2, vy: L.vy * 0.2, vz: 3, rx: rand(-3, 3), rz: rand(-5, 5) }; }
    L.vx *= -0.25; L.vy *= -0.25; L.vz = Math.abs(L.vz) * 0.3 + 1;
    L.hits++;
    const pts = POINTS[t.kind];
    const extra = TARGETS.filter((q) => q.bonus && q.on != null && TARGETS[q.on] === t).reduce((a, q) => { q.bonus = false; return a + POINTS[q.kind]; }, 0);
    g.score += pts + extra;
    g.hits++;
    g.shotPts = (g.shotPts || 0) + pts + extra;
    pushAudioEvent(w, { kind: 'prop_hit', material: t.kind === 'baal' ? 'foliage' : t.kind === 'ton' ? 'metal' : 'wood', strength: 0.9, x: p.x, y: p.y });
    g.flash = { text: `${t.kind === 'baal' ? 'Baal' : t.kind === 'ton' ? 'Ton' : 'Stroman'}! +${pts + extra}`, t: 1.6 };
    say(w, t.kind === 'ton' ? 'Hilje' : 'Roelf', 'hit', true);
    break;
  }
}

function stepTargets(dt) {
  for (const t of TARGETS) {
    const d = t.dyn;
    if (!d || !t.mesh) continue;
    const m = t.mesh;
    // three local: x = u, z = v; velocities are map-space, turned into the field frame
    const du = d.vx * C + d.vy * S, dv = -d.vx * S + d.vy * C;
    m.position.x += du * dt;
    m.position.z += dv * dt;
    m.position.y += d.vz * dt;
    d.vz -= G * dt;
    m.rotation.x += d.rx * dt;
    m.rotation.z += d.rz * dt;
    const floor = t.kind === 'baal' ? 0.6 : 0.3;
    if (m.position.y < floor) {
      m.position.y = floor;
      d.vz = Math.abs(d.vz) > 1.5 ? -d.vz * 0.25 : 0;
      d.vx *= 0.6; d.vy *= 0.6; d.rx *= 0.6; d.rz *= 0.6;
      if (Math.hypot(d.vx, d.vy) < 0.1 && d.vz === 0) t.dyn = null;
    }
  }
}

// --- the game loop --------------------------------------------------------------------------

function updateGame(w, dt) {
  const g = game;
  const input = w.input;
  g.t += dt;
  g.phaseT += dt;
  if (g.flash && (g.flash.t -= dt) <= 0) g.flash = null;
  if (g.recoil) g.recoil = Math.max(0, g.recoil - dt * 1.6);
  w.clock = g.clock;
  if (input.wasPressed('backspace')) { input.consume('backspace'); end(w, { quit: true }); return; }
  const p = w.player;
  p.x = STAND.x; p.y = STAND.y; p.speed = 0; p.moving = false;
  p.angle = FIELD.rot + g.yaw * 0.5;

  if (g.phase === 'aim' || g.phase === 'gas') {
    const ax = (input.isDown('d') || input.isDown('arrowright') ? 1 : 0) - (input.isDown('a') || input.isDown('arrowleft') ? 1 : 0);
    const ay = (input.isDown('w') || input.isDown('arrowup') ? 1 : 0) - (input.isDown('s') || input.isDown('arrowdown') ? 1 : 0);
    // A/D turn the churn on the trestle (A = to the left of the firing line)
    g.yaw = Math.max(-YAW_MAX, Math.min(YAW_MAX, g.yaw + ax * dt * 0.45));
    g.el = Math.max(EL_MIN, Math.min(EL_MAX, g.el + ay * dt * 0.38));
  }
  if (g.phase === 'aim') {
    if (input.isDown(' ')) {
      g.pouring = true;
      g.water = Math.min(1, g.water + POUR_RATE * dt);
      if (Math.random() < 0.6) { const m = mouthPos(g); spawnFxPuff(m.x, m.z + 0.1, m.y, rand(-0.2, 0.2), 0.5, rand(-0.2, 0.2), 0.6, 0.05, 0.3, 0.9, 0.92, 0.95, 0.35, 1.5, 0.2); }
    } else if (g.pouring) {
      g.pouring = false;
      if (g.water < 0.06) { g.water = 0; return; }
      // lid on: the gas starts to build
      g.peak = peakFor(g.water);
      g.rise = 2.2 + (1 - g.water) * 1.4;
      g.gasT = 0;
      g.phase = 'gas';
      g.phaseT = 0;
      pushAudioEvent(w, { kind: 'prop_hit', material: 'metal', strength: 0.4, x: FIELD.x, y: FIELD.y });
      if (g.water > 0.9) g.flash = { text: 'Te veel water!', t: 1.6, bad: true };
    }
  } else if (g.phase === 'gas') {
    g.gasT += dt;
    if (input.wasPressed('e') || input.wasPressed('f')) {
      input.consume('e'); input.consume('f');
      ignite(w, g);
    } else if (gasAt(g, g.gasT) < 0.08 && g.gasT > g.rise) {
      // waited until the gas was gone: the lid stays on
      g.flash = { text: 'Het gas is op', t: 1.8, bad: true };
      say(w, 'Hilje', 'late', true);
      g.lid = null;
      g.phase = 'land';
      g.phaseT = 0;
      g.shotPts = 0;
      g.lastDist = 0;
    }
  } else if (g.phase === 'flight') {
    stepLid(w, g, dt);
    const L = g.lid;
    if (L && Math.random() < 0.5 && L.z > 0.3) spawnFxPuff(L.x, L.z, L.y, 0, 0.2, 0, 0.7, 0.08, 0.5, 0.8, 0.8, 0.8, 0.3, 1.2, 0.1);
    if (!L || L.rest || g.phaseT > 9) {
      const d = L ? Math.hypot(L.x - L.from.x, L.y - L.from.y) : 0;
      const bonus = L && !L.wet ? Math.floor(d / 10) : 0;
      g.score += bonus;
      g.shotPts = (g.shotPts || 0) + bonus;
      g.lastDist = Math.round(d);
      g.best = Math.max(g.best, g.lastDist);
      if (L && !L.hits) {
        g.flash = { text: L.wet ? `Plons! ${g.lastDist} m` : `${g.lastDist} m · +${bonus}`, t: 2, bad: L.wet };
        if (L.kind === 'good' || L.wet) say(w, Math.random() < 0.5 ? 'Roelf' : 'Hilje', 'miss');
      } else if (L) g.flash = { text: `${g.lastDist} m · +${g.shotPts}`, t: 2 };
      g.phase = 'land';
      g.phaseT = 0;
    }
  } else if (g.phase === 'land') {
    if (g.phaseT > 2.4) nextShot(w);
  }
  stepTargets(dt);
}

function nextShot(w) {
  const g = game;
  g.log.push(g.shotPts || 0);
  g.shot++;
  g.shotPts = 0;
  if (g.shot >= SHOTS) { end(w); return; }
  g.phase = 'aim';
  g.phaseT = 0;
  g.water = 0;
  g.lid = null;
  g.wind = newWind();
}

function medalOf(score) {
  return score >= MEDAL_AT[3] ? 3 : score >= MEDAL_AT[2] ? 2 : score >= MEDAL_AT[1] ? 1 : 0;
}

function end(w, { quit = false } = {}) {
  const g = game;
  if (!g) return;
  game = null;
  w.companionHold = null;
  w.cameraOverride = null;
  document.body.classList.remove('carbid-on');
  if (hud) hud.root.hidden = true;
  if (built) { built.ring.visible = false; placeLid(null); }
  if (quit) { w.addMessage('Carbid schieten gestopt', 2.5); return; }
  const medal = medalOf(g.score);
  const rec = recordChallengeResult(w, 'carbid', { value: g.score, medal });
  recordStat(w, 'carbidGames');
  unlockAchievement(w, 'carbid_klaar');
  if (medal >= 3) unlockAchievement(w, 'carbid_goud');
  const prize = PRIZE[medal] || 0;
  if (prize) w.money += prize;
  const stats = [['Punten', String(g.score)], ['Raak', String(g.hits)], ['Verste schot', `${g.best} m`]];
  if (medal) stats.push(['Medaille', MEDALS[medal]]);
  if (rec && rec.newBest) stats.push(['Record', 'Nieuw!']);
  showBanner({ kind: medal ? 'pass' : 'fail', title: medal ? 'KNAL IN DE POLDER' : 'VEEL RUIS, WEINIG KNAL', reason: medal >= 2 ? 'Boer Roelf knikt. Dat is veel.' : '', reward: prize, stats });
  say(w, medal >= 2 ? 'Roelf' : 'Hilje', medal >= 2 ? 'endGood' : 'endPoor', true);
}

// --- speech --------------------------------------------------------------------------------

function say(w, who, kind, force = false) {
  const g = game;
  const t = w.time;
  if (g && !force && t - g.lastSay < 4) return;
  if (!force && Math.random() < 0.35) return;
  const list = CARBID_LINES[who] && CARBID_LINES[who][kind];
  if (!list || !list.length || !built) return;
  if (g) g.lastSay = t;
  const f = built.farmers[who];
  const text = list[Math.floor(Math.random() * list.length)];
  const sp = w.extraSpeakers || (w.extraSpeakers = []);
  for (let i = sp.length - 1; i >= 0; i--) if (sp[i].speechName === who) sp.splice(i, 1);
  sp.push({ x: f.x, y: f.y, h: 2.2, female: who === 'Hilje', speechName: who === 'Roelf' ? 'Boer Roelf' : 'Hilje', speechText: text, speechUntil: t + Math.max(2.6, 1.2 + text.length * 0.06) });
}

// --- 3D per frame -------------------------------------------------------------------------

const _v = new THREE.Vector3();

function placeLid(L) {
  const b = built;
  if (!L) {
    b.churn.add(b.lid);
    b.lid.position.copy(b.lidHome);
    b.lid.rotation.set(0, 0, -Math.PI / 2);
    return;
  }
  if (b.lid.parent !== getScene()) getScene().add(b.lid);
  b.lid.position.set(L.x, Math.max(0.03, L.z), L.y);
  b.lid.rotation.set(L.rest ? 0 : L.spin, Math.atan2(-L.vy, L.vx), L.rest ? 0 : -Math.PI / 2 + Math.sin(L.spin) * 0.6, 'YXZ');
}

function sync3D(w, dt) {
  const b = built;
  if (!b) return;
  const g = game;
  for (const f of Object.values(b.farmers)) {
    animatePersonWalk(f.mesh, 0, dt);
  }
  const yaw = g ? g.yaw : 0, el = g ? g.el : 0.5;
  const back = g && g.recoil ? -Math.sin(g.recoil * Math.PI) * 0.25 : 0;
  b.churn.rotation.set(0, -yaw, el, 'YXZ');
  b.churn.position.x = back;
  if (g && g.lid) placeLid(g.lid);
  else if (b.lid.parent !== b.churn) placeLid(null);
  // the preview ring while the gas builds
  if (g && g.phase === 'gas') {
    const pw = gasAt(g, g.gasT);
    const lp = predict(g, pw);
    b.ring.visible = true;
    b.ring.position.set(lp.x, 0.08, lp.y);
    const mat = g.gasT > g.rise + 1.1 ? mats.ringBad : mats.ring;
    for (const m of b.ring.children) m.material = mat;
    const s = (0.8 + 0.25 * Math.sin(g.t * 9)) * (1 + lp.d / 45);
    b.ring.userData.disc.scale.set(s, 1, s);
    b.ring.children[1].scale.set(1 + lp.d / 40, 1 + lp.d / 60, 1 + lp.d / 40);
  } else b.ring.visible = false;
}

function camera(w) {
  const g = game;
  if (!g) return;
  const { c, s } = dirOf(g);
  let pos, at;
  if (g.phase === 'flight' && g.lid || (g.phase === 'land' && g.lid && g.phaseT < 1.6)) {
    const L = g.lid;
    const sp = Math.hypot(L.vx, L.vy) || 1;
    const hx = L.rest ? c : L.vx / sp, hy = L.rest ? s : L.vy / sp;
    pos = { x: L.x - hx * 7 - hy * 5, y: L.y - hy * 7 + hx * 5, z: Math.max(1.8, L.z * 0.7 + 2.2) };
    at = { x: L.x + hx * 2, y: L.y + hy * 2, z: Math.max(0.3, L.z) };
  } else {
    pos = { x: FIELD.x - c * 6 + s * 1.3, y: FIELD.y - s * 6 - c * 1.3, z: 3.8 };
    const look = g.phase === 'gas' ? predict(g, Math.max(0.3, gasAt(g, g.gasT))) : { x: FIELD.x + c * 40, y: FIELD.y + s * 40 };
    at = { x: (FIELD.x + c * 14) * 0.6 + look.x * 0.4, y: (FIELD.y + s * 14) * 0.6 + look.y * 0.4, z: 0 };
  }
  // smooth: the chase eases in instead of cutting each frame
  if (!g.cam) g.cam = { pos: { ...pos }, at: { ...at } };
  const k = g.phase === 'flight' ? 0.2 : 0.12;
  for (const key of ['x', 'y', 'z']) { g.cam.pos[key] += (pos[key] - g.cam.pos[key]) * k; g.cam.at[key] += (at[key] - g.cam.at[key]) * k; }
  w.cameraOverride = { position: { ...g.cam.pos }, lookAt: { ...g.cam.at }, fov: 58, cut: true };
}

// --- HUD -------------------------------------------------------------------------------------

const CSS = `
#hud .carbid-board[hidden] { display: none; }
#hud .carbid-board { position: absolute; top: 14px; left: 50%; transform: translateX(-50%); min-width: 360px; padding: 8px 18px 9px 12px; color: #f0ede4; text-shadow: var(--hud-shadow); pointer-events: none; z-index: 4;
  background: linear-gradient(90deg, rgba(12,20,14,0.9), rgba(48,34,20,0.66) 80%, rgba(48,34,20,0.2)); border-left: 3px solid ${ACCENT}; }
#hud .carbid-board small { display: block; font-size: 12px; letter-spacing: 3px; color: ${ACCENT}; }
#hud .carbid-board .cb-row { display: flex; gap: 16px; align-items: baseline; font-size: 20px; letter-spacing: 1px; }
#hud .carbid-board .cb-row b { font-weight: normal; color: #ffd23f; font-size: 24px; }
#hud .carbid-board .cb-meter { position: relative; height: 9px; margin: 6px 0 4px; background: rgba(240,237,228,0.16); border-radius: 2px; overflow: hidden; }
#hud .carbid-board .cb-meter i { position: absolute; left: 0; top: 0; bottom: 0; background: #5aa6e0; }
#hud .carbid-board .cb-meter i.gas { background: #8ad85a; }
#hud .carbid-board .cb-meter i.leak { background: #ff9a3c; }
#hud .carbid-board .cb-meter em { position: absolute; top: -2px; bottom: -2px; width: 2px; background: #f0ede4; }
#hud .carbid-board .cb-help { display: flex; flex-wrap: wrap; align-items: center; gap: 3px; font: 13px 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.78); }
#hud .carbid-board .hud-key { margin: 0 2px; vertical-align: middle; }
#hud .carbid-board .cb-flash { font-size: 22px; letter-spacing: 1.5px; color: #5dff7a; min-height: 1em; }
#hud .carbid-board .cb-flash.bad { color: #ff9a3c; }
body.carbid-on #hud .hud-speedo, body.carbid-on #hud .hud-route, body.carbid-on #hud .phonefeed .pf-card { display: none !important; }
@media (max-width: 480px) { #hud .carbid-board { top: 64px; min-width: 0; } }
`;

function ensureHud() {
  if (hud) return hud;
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
  const root = document.createElement('div');
  root.className = 'carbid-board';
  root.hidden = true;
  root.innerHTML = '<small>CARBID SCHIETEN</small><div class="cb-row"></div><div class="cb-meter"><i></i><em></em></div><div class="cb-flash"></div><div class="cb-help"></div>';
  (document.getElementById('hud') || document.body).appendChild(root);
  hud = { root, row: root.querySelector('.cb-row'), bar: root.querySelector('.cb-meter i'), mark: root.querySelector('.cb-meter em'), flash: root.querySelector('.cb-flash'), help: root.querySelector('.cb-help'), key: '' };
  return hud;
}

function windText(g) {
  const v = g.wind.v;
  const bft = Math.round(Math.abs(v) * 1.2 + Math.abs(g.wind.u) * 0.5);
  return bft < 1 ? 'Windstil' : `Wind ${bft} Bft ${v > 0 ? '←' : '→'}`;
}

function updateHud() {
  const g = game;
  if (!g || !hud) return;
  const k = (t) => `<span class="hud-key">${t}</span>`;
  const help = g.phase === 'aim'
    ? `${k('A')}${k('D')} draaien · ${k('W')}${k('S')} hoger/lager · houd ${k('SPATIE')} water op het carbid · ${k('BACKSPACE')} stoppen`
    : g.phase === 'gas' ? `${k('E')} aansteken als de ring goed ligt · ${k('A')}${k('D')}${k('W')}${k('S')} bijsturen` : 'Kijk hem gaan...';
  let fill = 0, cls = '', mark = -1;
  if (g.phase === 'aim') { fill = g.water; mark = 0.65; }
  else if (g.phase === 'gas') { const gv = gasAt(g, g.gasT); fill = gv; cls = g.gasT > g.rise + 1.1 ? 'leak' : 'gas'; mark = g.peak; }
  const row = `<span>Schot <b>${Math.min(SHOTS, g.shot + 1)}</b>/${SHOTS}</span><span>Punten <b>${g.score}</b></span><span>${windText(g)}</span>`;
  const flash = g.flash ? g.flash.text : g.phase === 'aim' ? (g.water > 0 ? `Water: ${Math.round(g.water * 100)}%` : 'Houd Spatie voor water') : g.phase === 'gas' ? 'Gas...' : '';
  const key = [row, Math.round(fill * 60), cls, Math.round(mark * 60), flash, g.flash && g.flash.bad, help].join('|');
  if (key === hud.key) return;
  hud.key = key;
  hud.row.innerHTML = row;
  hud.bar.style.width = `${Math.round(fill * 100)}%`;
  hud.bar.className = cls;
  hud.mark.style.display = mark < 0 ? 'none' : '';
  hud.mark.style.left = `${Math.round(mark * 100)}%`;
  hud.flash.textContent = flash;
  hud.flash.classList.toggle('bad', !!(g.flash && g.flash.bad));
  hud.help.innerHTML = help;
}

// --- the activity --------------------------------------------------------------------------

function spots() {
  return [{ id: 'carbid', name: 'Carbid schieten', x: STAND.x, y: STAND.y }];
}

// A knal from the churn without a game (storyfun.js: boer Roelf scares off the twins).
function knal(w) {
  if (!built) return false;
  const m = toW(0.6, 0);
  pushAudioEvent(w, { kind: 'weapon', sub: 'carbid', x: m.x, y: m.y });
  spawnExplosionFx(m.x + C * 0.4, m.y + S * 0.4, 1, 0x8a9197, 0.6);
  flashMuzzleLight(m.x, 1.5, m.y, 3.5);
  for (let k = 0; k < 10; k++) spawnFxPuff(m.x, 1, m.y, C * rand(2, 6) + rand(-1, 1), rand(0.5, 2), S * rand(2, 6) + rand(-1, 1), rand(1, 2), 0.3, 1.6, 0.86, 0.86, 0.84, 0.5, 1.4, 0.3);
  return true;
}

export const CARBID = {
  id: 'carbid',
  layer: 'carbid',
  legend: { kind: 'act-carbid', label: 'Carbid schieten', note: 'melkbus, deksel en een flinke knal in de polder' },
  init(w) {
    // the trestle with the churn is solid
    addStaticCollider('garagewall', FIELD.x, FIELD.y, 0.45, 0.4, FIELD.rot);
    window.__carbid = {
      spot: () => ({ ...STAND, field: { ...FIELD } }),
      start: () => start(w),
      state: () => (game ? { phase: game.phase, shot: game.shot, score: game.score, water: game.water, gas: game.phase === 'gas' ? gasAt(game, game.gasT) : 0, peak: game.peak, rise: game.rise, gasT: game.gasT, yaw: game.yaw, el: game.el, wind: { ...game.wind }, lid: game.lid ? { x: game.lid.x, y: game.lid.y, z: game.lid.z, rest: game.lid.rest } : null } : null),
      predict: (power = 1) => (game ? predict(game, power) : null),
      targets: () => TARGETS.map((t) => ({ kind: t.kind, ...targetWorld(t), hit: !!t.hit })),
      // a shot with a given power at a given aim, straight from the plateau (tests)
      fire: (power = 1, yaw = 0, el = 0.5) => { if (!game || (game.phase !== 'aim' && game.phase !== 'gas')) return false; Object.assign(game, { yaw, el, peak: power, rise: 1, gasT: 1.05, phase: 'gas' }); ignite(w, game); return true; },
      finish: () => { if (!game) return false; game.shot = SHOTS - 1; nextShot(w); return true; },
      quit: () => { if (!game) return false; end(w, { quit: true }); return true; },
    };
  },
  spots,
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
    if (built && built.root.visible) sync3D(w, dt);
    updateHud();
  },
  camera,
  icon: drawIcon,
  mapSub: () => {
    const rec = getChallengeRecord('carbid');
    return rec && rec.medal ? `Carbid schieten · record ${rec.best} punten (${MEDALS[rec.medal].toLowerCase()})` : 'Carbid schieten bij boer Roelf, bij schemer';
  },
  ubbo(w) {
    const d = Math.hypot(STAND.x - w.player.x, STAND.y - w.player.y);
    const rec = getChallengeRecord('carbid');
    return { name: 'Carbid schieten', sub: `${rec && rec.medal ? 'record: ' + MEDALS[rec.medal].toLowerCase() : 'vijf knallen in de polder'}`, dist: d, x: STAND.x, y: STAND.y, play: 'carbid', where: 'het carbidveld van boer Roelf', hint: 'loop naar de melkbus en druk E' };
  },
  runs: () => runs,
  // for the story step (storyfun.js): the field's frame, the knal, and the two farmers
  // stepping aside while a cutscene has its own Roelf and Hilje
  field: () => ({ ...FIELD }),
  knal,
  farmersVisible(on) {
    if (built) for (const f of Object.values(built.farmers)) f.mesh.visible = on;
  },
};
