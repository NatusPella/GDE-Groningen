import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { buildPersonMesh, animatePersonWalk } from './models3d_people.js';
import { helipadInfo, scriptHeli, landHeliOnPad } from './skyprops.js';
import { isMissionActive, getActiveRace } from './missions.js';
import { isCinematicActive } from './cinematics.js';
import { isShopOpen } from './shopui.js';
import { pushAudioEvent } from './pedestrians.js';
import { unlockAchievement, setStatMax, recordStat } from './achievements.js';
import { clamp, pointInPolygon } from './util.js';

// UMCG trauma heli "on rails": the yellow trauma heli (skyprops.js) flies a
// fixed route over Grunn; the player only controls height (W/S), a small
// sideways offset (A/D) and speed (Shift faster, Space slower). Fly through
// the rings (points and extra time), ride out gusts, then catch the drifting
// hot-air balloon: hold the basket's height and speed beside it for a few
// seconds. Started standalone at the UMCG (map icon + E), or by the story.
//
// API
//   startHeliRun({ variant, onFinish, timeLimit }) -> boolean
//     variant: 'ballonjacht' (standalone, default) or 'traumaduif' (story H15:
//     Tammo takes the Eierbal from the basket). Returns false when a run is
//     already going or the player can't leave (in a vehicle, pigeon mode).
//     onFinish(result) runs after the result card, once the player is back
//     on the street next to the UMCG:
//       { variant, success, aborted, score, medal (0 none, 1 brons, 2 zilver,
//         3 goud), medalName, rings, ringsTotal, time, timeLeft, hits }
//   abortHeliRun()        ends the run at once (onFinish gets aborted: true)
//   isHeliRunActive()     true while a run owns the player and the camera
//   getHeliRun()          read-only state for missions ({ phase, s, len, x, y, z, speed, balloon })
// main.js calls initHeliRun, updateHeliRun (instead of the player update while
// world.heliRun is set) and tryHeliSpotInteract; prompts.js, hud_panel.js and
// mapview.js use heliSpotPrompt, heliSpotSecondary, getHeliSpotsForRender and
// drawHeliMapIcon. window.__heliRun (debug): start, abort, autopilot, state.

const LEVEL_HEIGHT = 3.1;
const USE_RADIUS = 2.6;
const SPEED_MIN = 14, SPEED_MAX = 44, SPEED_START = 26;
const ACCEL = 9, BRAKE = 12;
const CLIMB = 13, SLIDE = 11, OFFSET_MAX = 32;
const Z_MIN = 22, Z_MAX = 260;
const RING_R = 7.5;
const RING_SCORE = 100, CATCH_SCORE = 1000, TIME_SCORE = 10, HIT_PENALTY = 100;
const MEDALS = [0, 0, 2600, 3300];
const MEDAL_NAMES = ['', 'Brons', 'Zilver', 'Goud'];
const INTRO_S = 4.2, RESULT_S = 5.5;
const CATCH_NEED = 5;
const BALLOON_SPEED = 4;
const SAMPLE_M = 2;

const VARIANTS = {
  ballonjacht: {
    title: 'Ballonjacht', sub: 'Vlieg door de ringen en haal de ballon in', timeLimit: 150, ringBonus: 3, seed: 424242,
    catchText: 'Koppelen: hou hoogte en snelheid van de mand vast', doneText: 'Gekoppeld! De ballonvaarders zwaaien.',
    failText: 'De ballon is weg…', hitsText: 'Te vaak tegen de ballon: de piloot breekt af.',
  },
  traumaduif: {
    title: 'Traumaduif', sub: 'Haal de Eierbal uit de mand van Jelle\'s ballon', timeLimit: 165, ringBonus: 3, seed: 1810,
    catchText: 'Tammo gaat aan het touw: hou hoogte en snelheid van de mand vast', doneText: 'Tammo heeft de Eierbal!',
    failText: 'De ballon verdwijnt richting de Ommelanden…', hitsText: 'Drie keer tegen de mand: Tammo moet terug naar binnen.',
  },
};

// Route over Grunn: [x, y, ring?]; ring = [height, sideways offset].
const ROUTE = [
  [750, -268],
  [560, -420, [62, 0]],
  [300, -640, [55, -8]],
  [133, -719, [38, 6]],
  [-120, -560, [60, 10]],
  [-190, -250, [75, -6]],
  [-143, -32, [58, 0]],
  [40, -20, [50, 8]],
  [150, -60, [110, -4]],
  [300, 40, [70, 0]],
  [260, 250, [48, -10]],
  [13, 254, [36, 0]],
  [-200, 420, [64, 8]],
  [-60, 650, [52, -8]],
  [71, 798, [44, 0]],
  [-60, 948, [70, 10]],
  [-350, 1150, [90, -6]],
  [-700, 1350],
];
const BALLOON_START = { x: -800, y: 1380, z: 150 };
const BALLOON_DIR = (() => { const l = Math.hypot(-0.5, 0.87); return { x: -0.5 / l, y: 0.87 / l }; })();

let world = null;
let scene = null;
let run = null;
let spot = null;
let rail = null;
let hud = null;
let autopilot = false;

const rand = (a, b) => a + Math.random() * (b - a);
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const approach = (v, t, r) => (v < t ? Math.min(t, v + r) : Math.max(t, v - r));
function sfx(kind, strength = 0.6) {
  if (run) pushAudioEvent(world, { kind, x: run.x, y: run.y, strength });
}

// --- rail -------------------------------------------------------------------

function buildRail() {
  const curve = new THREE.CatmullRomCurve3(ROUTE.map((p) => new THREE.Vector3(p[0], p[1], 0)), false, 'centripetal');
  curve.arcLengthDivisions = 1200;
  const len = curve.getLength();
  const n = Math.ceil(len / SAMPLE_M) + 1;
  const X = new Float32Array(n), Y = new Float32Array(n), TX = new Float32Array(n), TY = new Float32Array(n);
  const p = new THREE.Vector3(), t = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const u = Math.min(1, (i * SAMPLE_M) / len);
    curve.getPointAt(u, p);
    curve.getTangentAt(u, t);
    X[i] = p.x; Y[i] = p.y;
    const l = Math.hypot(t.x, t.y) || 1;
    TX[i] = t.x / l; TY[i] = t.y / l;
  }
  const rings = [];
  for (const wp of ROUTE) {
    if (!wp[2]) continue;
    let best = 0, bd = Infinity;
    for (let i = 0; i < n; i++) {
      const d = (X[i] - wp[0]) ** 2 + (Y[i] - wp[1]) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    rings.push({ s: best * SAMPLE_M, z: wp[2][0], off: wp[2][1] });
  }
  return { len, n, X, Y, TX, TY, rings };
}

const _rp = { x: 0, y: 0, tx: 1, ty: 0 };
function railAt(s) {
  const f = clamp(s / SAMPLE_M, 0, rail.n - 1.001);
  const i = Math.floor(f), k = f - i;
  _rp.x = rail.X[i] + (rail.X[i + 1] - rail.X[i]) * k;
  _rp.y = rail.Y[i] + (rail.Y[i + 1] - rail.Y[i]) * k;
  const tx = rail.TX[i] + (rail.TX[i + 1] - rail.TX[i]) * k, ty = rail.TY[i] + (rail.TY[i + 1] - rail.TY[i]) * k;
  const l = Math.hypot(tx, ty) || 1;
  _rp.tx = tx / l; _rp.ty = ty / l;
  return _rp;
}

// --- 3D: rings and the start spot -------------------------------------------

const RING_GEO = new THREE.TorusGeometry(RING_R, 0.42, 8, 40);
const RING_MATS = {
  next: new THREE.MeshBasicMaterial({ color: 0xffc21a, transparent: true, opacity: 0.95, fog: false }),
  later: new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.35, fog: false }),
  done: new THREE.MeshBasicMaterial({ color: 0x5dff7a, transparent: true, opacity: 0.8, fog: false }),
  miss: new THREE.MeshBasicMaterial({ color: 0xff5a3c, transparent: true, opacity: 0.5, fog: false }),
};

function buildRings() {
  const group = new THREE.Group();
  group.name = 'helirun-rings';
  for (const r of rail.rings) {
    const p = railAt(r.s);
    const nx = -p.ty, ny = p.tx;
    const m = new THREE.Mesh(RING_GEO, RING_MATS.later);
    m.position.set(p.x + nx * r.off, r.z, p.y + ny * r.off);
    m.rotation.y = -Math.atan2(p.ty, p.tx) + Math.PI / 2;
    group.add(m);
    r.mesh = m;
    r.x = p.x + nx * r.off; r.y = p.y + ny * r.off;
  }
  scene.add(group);
  return group;
}

const SPOT_COLOR = '#f0c21a';

function drawHeliGlyph(g, r, color = '#1c1d20') {
  g.save();
  g.scale(r / 10, r / 10);
  g.fillStyle = color;
  g.strokeStyle = color;
  g.beginPath();
  g.ellipse(-1, 1, 5.2, 3.4, 0, 0, Math.PI * 2);
  g.fill();
  g.fillRect(-10, -0.2, 7, 1.8);
  g.fillRect(-10.5, -2.6, 1.6, 4.4);
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(-8.5, -4.2); g.lineTo(7.5, -4.2);
  g.moveTo(-1, -4.2); g.lineTo(-1, -2.2);
  g.moveTo(-4, 5.8); g.lineTo(3.5, 5.8);
  g.stroke();
  g.restore();
}

export function drawHeliMapIcon(ctx, s) {
  ctx.beginPath();
  ctx.arc(0, 0, 4.6 * s, 0, Math.PI * 2);
  ctx.fillStyle = SPOT_COLOR;
  ctx.fill();
  ctx.lineWidth = 1.2 * s;
  ctx.strokeStyle = '#0c140e';
  ctx.stroke();
  drawHeliGlyph(ctx, 3.2 * s);
}

export function getHeliSpotsForRender() {
  return spot ? [spot] : [];
}

function buildSpotMarker(x, y) {
  const group = new THREE.Group();
  group.position.set(x, 0, y);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.04, 20), new THREE.MeshLambertMaterial({ color: 0xf0c21a, transparent: true, opacity: 0.85 }));
  pad.position.y = 0.03;
  group.add(pad);
  const S = 128, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.translate(S / 2, S / 2);
  g.beginPath(); g.arc(0, 0, S / 2 - 6, 0, Math.PI * 2);
  g.fillStyle = SPOT_COLOR; g.fill();
  g.lineWidth = 7; g.strokeStyle = '#1c1d20'; g.stroke();
  drawHeliGlyph(g, 44);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  badge.scale.set(0.55, 0.55, 1);
  badge.position.y = 2.3;
  badge.onBeforeRender = () => { badge.position.y = 2.3 + Math.sin(performance.now() / 650) * 0.06; };
  group.add(badge);
  return group;
}

// Pilot "Dokter Dijkstra" in an orange flight suit next to the spot.
function buildPilot(map, x, y) {
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const [px, py] = map.escapeBuilding(x + Math.cos(a) * 2.2, y + Math.sin(a) * 2.2, 0.4);
    if (Math.hypot(px - x, py - y) > 3.5) continue;
    const m = buildPersonMesh(0xe8641c, 0xe0b48a, { seed: 77, variant: 'male', pants: 0xe8641c, shoes: 0x222222 });
    m.position.set(px, 0, py);
    m.rotation.y = -Math.atan2(y - py, x - px);
    scene.add(m);
    return m;
  }
  return null;
}

function placeSpot(map) {
  const pad = helipadInfo(map);
  if (!pad) return null;
  const open = map.findOpenSpawn(pad.x, pad.y, 250);
  if (!open) return null;
  const s = { id: 'umcg', name: 'Traumaheli UMCG', x: open.x, y: open.y, marker: buildSpotMarker(open.x, open.y) };
  scene.add(s.marker);
  s.pilot = buildPilot(map, open.x, open.y);
  return s;
}

// --- HUD --------------------------------------------------------------------

const CSS = `
body.heli-run #hud .hud-top-left, body.heli-run #hud .hud-wanted, body.heli-run #hud .hud-money,
body.heli-run #hud .hud-money-delta, body.heli-run #hud .hud-weapon, body.heli-run #hud .hud-mission,
body.heli-run #hud .hud-speedo, body.heli-run #hud .hud-route, body.heli-run #hud .hud-damage, body.heli-run .phonefeed-card { display: none !important; }
#heli-hud[hidden] { display: none; }
#heli-hud { position: fixed; inset: 0; pointer-events: none; font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; color: #f0ede4; z-index: 5; }
#heli-hud .hh-panel { position: absolute; top: 14px; left: 14px; min-width: 200px; padding: 10px 14px 12px; background: linear-gradient(160deg, rgba(20,16,6,0.8), rgba(20,16,6,0.5)); border-left: 4px solid #f0c21a; border-radius: 0 6px 6px 0; box-shadow: 0 4px 18px rgba(0,0,0,0.35); }
#heli-hud .hh-title { font-size: 26px; letter-spacing: 3px; color: #f0c21a; line-height: 1; }
#heli-hud .hh-row { display: flex; justify-content: space-between; align-items: baseline; gap: 14px; margin-top: 4px; font-size: 16px; letter-spacing: 1px; color: rgba(240,237,228,0.75); }
#heli-hud .hh-row b { font-weight: normal; font-size: 24px; color: #f0ede4; }
#heli-hud .hh-row b.low { color: #ff6a4a; }
#heli-hud .hh-score b { color: #f0c21a; font-size: 30px; }
#heli-hud .hh-alt { position: absolute; right: 26px; top: 50%; transform: translateY(-50%); width: 46px; height: 260px; background: rgba(20,16,6,0.55); border-radius: 6px; border: 1px solid rgba(240,194,26,0.4); }
#heli-hud .hh-alt i { position: absolute; left: 4px; right: 4px; height: 4px; margin-top: -2px; border-radius: 2px; }
#heli-hud .hh-alt .me { background: #f0c21a; box-shadow: 0 0 8px #f0c21a; }
#heli-hud .hh-alt .bal { background: #ff7ab6; }
#heli-hud .hh-alt .ring { background: rgba(255,233,160,0.7); height: 2px; }
#heli-hud .hh-alt span { position: absolute; left: -2px; right: -2px; bottom: -22px; text-align: center; font-size: 15px; }
#heli-hud .hh-catch { position: absolute; left: 50%; bottom: 17%; transform: translateX(-50%); width: 520px; text-align: center; }
#heli-hud .hh-catch[hidden] { display: none; }
#heli-hud .hh-catch .lbl { font-size: 20px; letter-spacing: 1px; text-shadow: 0 2px 6px rgba(0,0,0,0.7); }
#heli-hud .hh-catch .bar { height: 10px; margin-top: 6px; background: rgba(240,237,228,0.15); border-radius: 5px; overflow: hidden; }
#heli-hud .hh-catch .bar i { display: block; height: 100%; width: 0; background: linear-gradient(90deg, #f0c21a, #5dff7a); }
#heli-hud .hh-catch .tips { margin-top: 5px; font: 14px 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.85); }
#heli-hud .hh-catch .tips .ok { color: #5dff7a; }
#heli-hud .hh-msg { position: absolute; left: 50%; top: 22%; transform: translateX(-50%); font-size: 34px; letter-spacing: 2px; color: #f0c21a; text-shadow: 0 2px 10px rgba(0,0,0,0.75); opacity: 0; transition: opacity .2s; white-space: nowrap; }
#heli-hud .hh-msg.on { opacity: 1; }
#heli-hud .hh-help { position: absolute; left: 50%; bottom: 7%; transform: translateX(-50%); font: 15px 'Arial Narrow', Arial, sans-serif; letter-spacing: .5px; padding: 6px 14px; background: rgba(20,16,6,0.6); border-radius: 6px; transition: opacity .6s; }
#heli-hud .hh-help kbd { display: inline-block; min-width: 12px; margin: 0 2px; padding: 1px 6px; border: 1px solid rgba(240,237,228,0.6); border-bottom-width: 3px; border-radius: 5px; background: rgba(255,255,255,0.08); color: #f3efe4; font: bold 12px/1.2 system-ui, sans-serif; text-align: center; }
#heli-hud .hh-card { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%) scale(.96); min-width: 340px; padding: 18px 26px; text-align: center; background: rgba(20,16,6,0.86); border-top: 4px solid #f0c21a; border-radius: 8px; opacity: 0; transition: opacity .35s, transform .35s; }
#heli-hud .hh-card.on { opacity: 1; transform: translate(-50%, -50%) scale(1); }
#heli-hud .hh-card h2 { margin: 0; font-size: 42px; font-weight: normal; letter-spacing: 3px; color: #f0c21a; }
#heli-hud .hh-card p { margin: 4px 0 0; font: 16px 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.85); }
#heli-hud .hh-card .medal { font-size: 30px; letter-spacing: 2px; margin-top: 8px; }
`;

function initHudDom() {
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
  const root = document.createElement('div');
  root.id = 'heli-hud';
  root.hidden = true;
  root.innerHTML = `<div class="hh-panel"><div class="hh-title"></div>
    <div class="hh-row"><span>Tijd</span><b data-k="time">0</b></div>
    <div class="hh-row"><span>Snelheid</span><b data-k="speed">0</b></div>
    <div class="hh-row"><span>Ringen</span><b data-k="rings">0</b></div>
    <div class="hh-row"><span>Ballon</span><b data-k="dist">-</b></div>
    <div class="hh-row hh-score"><span>Score</span><b data-k="score">0</b></div></div>
    <div class="hh-alt"><i class="ring"></i><i class="bal"></i><i class="me"></i><span>0 m</span></div>
    <div class="hh-catch" hidden><div class="lbl"></div><div class="bar"><i></i></div><div class="tips"></div></div>
    <div class="hh-msg"></div>
    <div class="hh-help"><kbd>W</kbd><kbd>S</kbd> hoogte · <kbd>A</kbd><kbd>D</kbd> opzij · <kbd>SHIFT</kbd> gas · <kbd>SPATIE</kbd> rem</div>
    <div class="hh-card"><h2></h2><p class="sub"></p><div class="medal"></div><p class="rows"></p></div>`;
  document.body.appendChild(root);
  const q = (s) => root.querySelector(s);
  hud = {
    root, title: q('.hh-title'), vals: {}, cache: {},
    alt: q('.hh-alt'), altMe: q('.hh-alt .me'), altBal: q('.hh-alt .bal'), altRing: q('.hh-alt .ring'), altLbl: q('.hh-alt span'),
    catchEl: q('.hh-catch'), catchLbl: q('.hh-catch .lbl'), catchBar: q('.hh-catch .bar i'), catchTips: q('.hh-catch .tips'),
    msg: q('.hh-msg'), help: q('.hh-help'), card: q('.hh-card'),
  };
  for (const el of root.querySelectorAll('[data-k]')) hud.vals[el.dataset.k] = el;
}

function setVal(k, text, cls) {
  if (hud.cache[k] === text) return;
  hud.cache[k] = text;
  hud.vals[k].textContent = text;
  if (cls !== undefined) hud.vals[k].className = cls;
}

function flash(text, s = 1.6) {
  if (!run) return;
  hud.msg.textContent = text;
  hud.msg.classList.add('on');
  run.msgT = s;
}

const altY = (z) => (1 - clamp((z - Z_MIN) / (Z_MAX - Z_MIN), 0, 1)) * 100 + '%';

function updateHud(dt) {
  const r = run;
  if (r.msgT > 0 && (r.msgT -= dt) <= 0) hud.msg.classList.remove('on');
  const t = Math.max(0, r.timeLeft);
  setVal('time', `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`, t < 20 ? 'low' : '');
  setVal('speed', `${Math.round(r.speed * 3.6)} km/u`);
  setVal('rings', `${r.ringsHit}/${rail.rings.length}`);
  const bd = Math.hypot(r.balloon.x - r.x, r.balloon.y - r.y);
  setVal('dist', bd > 950 ? `${(bd / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(bd / 10) * 10} m`);
  setVal('score', String(Math.max(0, Math.round(r.score))));
  hud.altMe.style.top = altY(r.z);
  hud.altBal.style.top = altY(r.balloon.z);
  const next = rail.rings[r.nextRing];
  hud.altRing.style.display = next && r.phase === 'rail' ? '' : 'none';
  if (next) hud.altRing.style.top = altY(next.z);
  const lbl = `${Math.round(r.z)} m`;
  if (hud.cache.alt !== lbl) { hud.cache.alt = lbl; hud.altLbl.textContent = lbl; }
  if (r.t > 9) hud.help.style.opacity = '0';
}

// --- start / stop -----------------------------------------------------------

function blockReason(w) {
  if (w.wanted > 0) return 'Niet nu: eerst de politie kwijt';
  if (isMissionActive() || getActiveRace()) return 'Niet nu: maak eerst je missie af';
  if (w.sideJob && w.sideJob.active) return 'Niet nu: je bent aan het werk';
  return null;
}

export function startHeliRun(opts = {}) {
  const w = world;
  if (!w || run || !rail || w.pigeonMode || isCinematicActive() || document.body.classList.contains('intro-montage')) return false;
  const pl = w.player;
  if (pl.inVehicle) return false;
  const pad = helipadInfo(w.map);
  if (!pad) return false;
  const V = { ...(VARIANTS[opts.variant] || VARIANTS.ballonjacht) };
  const variant = VARIANTS[opts.variant] ? opts.variant : 'ballonjacht';
  if (opts.timeLimit) V.timeLimit = opts.timeLimit;
  const heli = scriptHeli(w);
  if (!heli) return false;
  Object.assign(heli, { x: pad.x, y: pad.y, z: pad.deck, heading: pad.angle, pitch: 0, bank: 0, rotor: 0.35, groundZ: pad.deck, downwash: 0, searchlight: 0, landing: false });

  const balloon = {
    x: BALLOON_START.x, y: BALLOON_START.y, z: BALLOON_START.z, targetZ: BALLOON_START.z, vz: 0, drift: BALLOON_SPEED, spin: 0.01,
    yaw: 0, seed: V.seed, phase: 'float', timer: 0, burn: 0, burnLeft: 0, nextBurn: 3, burnSeq: 0, burnDur: 0, age: 0, scripted: true,
  };
  w.balloons.push(balloon);

  run = {
    V, variant, onFinish: opts.onFinish || null, pad, heli, balloon,
    phase: 'intro', t: 0, phaseT: 0, s: 0, speed: SPEED_START, z: pad.deck, off: 0, vz: 0, voff: 0,
    x: pad.x, y: pad.y, heading: pad.angle, timeLeft: V.timeLimit, elapsed: 0,
    score: 0, ringsHit: 0, nextRing: 0, hits: 0, hitCd: 0, bumps: 0,
    gust: null, gustT: rand(9, 14), catchP: 0, along: -60, catchSide: 1, msgT: 0,
    cam: null, shake: 0, prevCine: { hide: w.cinematicHidePlayers, nav: w.cinematicHideNav },
    start: { x: pl.x, y: pl.y, angle: pl.angle }, result: null,
  };
  run.rings = buildRings();
  w.heliRun = true;
  w.cinematicHidePlayers = true;
  w.cinematicHideNav = true;
  document.body.classList.add('heli-run');
  hud.root.hidden = false;
  hud.cache = {};
  hud.title.textContent = V.title.toUpperCase();
  hud.card.classList.remove('on');
  hud.catchEl.hidden = true;
  hud.help.style.opacity = '1';
  flash(V.sub, 3.5);
  w.input.reset();
  syncPlayer();
  return true;
}

function finish(success, why = '') {
  const r = run;
  if (!r || r.phase === 'result') return;
  const timeBonus = success ? Math.round(Math.max(0, r.timeLeft) * TIME_SCORE) : 0;
  if (success) r.score += CATCH_SCORE + timeBonus;
  const score = Math.max(0, Math.round(r.score));
  let medal = 0;
  if (success) for (let m = 3; m >= 1; m--) if (score >= MEDALS[m]) { medal = m; break; }
  if (success && !medal) medal = 1;
  r.result = {
    variant: r.variant, success, aborted: false, score, medal, medalName: MEDAL_NAMES[medal], rings: r.ringsHit,
    ringsTotal: rail.rings.length, time: Math.round(r.elapsed * 10) / 10, timeLeft: Math.max(0, Math.round(r.timeLeft)), hits: r.hits,
  };
  r.phase = 'result';
  r.phaseT = 0;
  hud.catchEl.hidden = true;
  hud.msg.classList.remove('on');
  hud.card.querySelector('h2').textContent = success ? r.V.doneText.split('!')[0] + '!' : 'Mislukt';
  hud.card.querySelector('.sub').textContent = success ? r.V.doneText : why || r.V.failText;
  hud.card.querySelector('.medal').textContent = medal ? `${MEDAL_NAMES[medal]} · ${score} punten` : `${score} punten`;
  hud.card.querySelector('.rows').textContent = `Ringen ${r.ringsHit}/${rail.rings.length} · tijdbonus ${timeBonus} · botsingen ${r.hits}`;
  hud.card.classList.add('on');
  sfx(success ? 'prestatie' : 'notify', 0.8);
  if (success) {
    recordStat(world, 'heliRuns');
    setStatMax(world, 'heliBest', score);
    unlockAchievement(world, 'ballonjacht');
    if (medal === 3) unlockAchievement(world, 'ballonjacht_goud');
  }
}

function cleanup(aborted) {
  const r = run;
  const w = world;
  run = null;
  if (r.rings) { scene.remove(r.rings); }
  const bi = w.balloons.indexOf(r.balloon);
  if (bi >= 0) {
    if (r.result && r.result.success) { r.balloon.scripted = false; r.balloon.phase = 'float'; r.balloon.targetZ = r.balloon.z; }
    else w.balloons.splice(bi, 1);
  }
  landHeliOnPad(w, 20);
  if (w.skyHeli) unlockAchievement(w, 'umcg_heli');
  w.heliRun = false;
  w.cinematicHidePlayers = r.prevCine.hide || false;
  w.cinematicHideNav = r.prevCine.nav || false;
  w.cameraOverride = null;
  document.body.classList.remove('heli-run');
  hud.root.hidden = true;
  hud.card.classList.remove('on');
  const pl = w.player;
  const back = spot || r.start;
  pl.x = back.x; pl.y = back.y;
  pl.angle = r.start.angle;
  pl.vx = 0; pl.vy = 0; pl.z = 0; pl.vz = 0;
  pl.water = null; pl.swimming = false; pl.climb = null;
  const c = w.companion;
  if (c && c.state !== 'dead' && !c.inVehicle) { c.x = pl.x + 1.2; c.y = pl.y + 0.6; }
  w.input.reset();
  const result = r.result || {
    variant: r.variant, success: false, aborted: true, score: 0, medal: 0, medalName: '', rings: r.ringsHit,
    ringsTotal: rail.rings.length, time: r.elapsed, timeLeft: Math.round(r.timeLeft), hits: r.hits,
  };
  if (aborted) result.aborted = true;
  if (r.onFinish) { try { r.onFinish(result); } catch (e) { console.error('heli run onFinish', e); } }
}

export function abortHeliRun() {
  if (!run) return false;
  cleanup(true);
  return true;
}

export function isHeliRunActive() {
  return !!run;
}

export function getHeliRun() {
  if (!run) return null;
  return { phase: run.phase, s: run.s, len: rail.len, x: run.x, y: run.y, z: run.z, off: run.off, vz: run.vz, voff: run.voff, nextRing: run.nextRing, catchSide: run.catchSide, along: run.along, speed: run.speed, variant: run.variant, balloon: { x: run.balloon.x, y: run.balloon.y, z: run.balloon.z } };
}

function syncPlayer() {
  const pl = world.player;
  pl.x = run.x; pl.y = run.y;
  pl.vx = 0; pl.vy = 0;
}

// --- flight -----------------------------------------------------------------

function controls(dt) {
  const r = run, inp = world.input;
  let up = (inp.isDown('w') || inp.isDown('arrowup') ? 1 : 0) - (inp.isDown('s') || inp.isDown('arrowdown') ? 1 : 0);
  let side = (inp.isDown('d') || inp.isDown('arrowright') ? 1 : 0) - (inp.isDown('a') || inp.isDown('arrowleft') ? 1 : 0);
  let thr = (inp.isDown('shift') ? 1 : 0) - (inp.isDown(' ') ? 1 : 0);
  if (autopilot) [up, side, thr] = autoInput();
  r.vz = approach(r.vz, up * CLIMB, dt * 30);
  r.voff = approach(r.voff, side * SLIDE, dt * 28);
  r.speed = clamp(r.speed + (thr > 0 ? ACCEL * thr : thr < 0 ? BRAKE * thr : 0) * dt, r.phase === 'catch' ? 0 : SPEED_MIN, SPEED_MAX);
  if (r.gust) {
    const g = r.gust;
    const k = Math.sin(Math.PI * clamp(g.t / g.dur, 0, 1));
    r.voff += g.side * g.power * k * dt;
    r.vz += g.lift * k * dt;
  }
  r.z = clamp(r.z + r.vz * dt, Z_MIN, Z_MAX);
}

function autoInput() {
  const r = run;
  let tz = r.z, toff = r.off, tv = 34;
  if (r.phase === 'rail') {
    const ring = rail.rings[r.nextRing];
    if (ring) { tz = ring.z; toff = ring.off; }
    else tz = r.balloon.z;
  } else {
    tz = r.balloon.z + 1;
    toff = 16 * r.catchSide;
    tv = r.phase === 'catch' ? BALLOON_SPEED - r.along * 0.6 : 40;
  }
  const f = (d, dead) => (d > dead ? 1 : d < -dead ? -1 : 0);
  return [f(tz - r.z - r.vz * 0.4, 0.8), f(toff - r.off - r.voff * 0.35, 0.6), f(tv - r.speed, 0.6)];
}

function updateGust(dt) {
  const r = run;
  const w = world.weather || {};
  const storm = w.active && (w.kind === 'storm' || w.kind === 'onweer') ? 1.7 : 1 + (w.intensity || 0) * 0.5;
  if (r.gust) {
    r.gust.t += dt;
    if (r.gust.t >= r.gust.dur) r.gust = null;
    return;
  }
  r.gustT -= dt;
  if (r.gustT <= 0) {
    const side = Math.random() < 0.5 ? -1 : 1;
    r.gust = { t: -1, dur: 2.4, side, power: rand(9, 15) * storm, lift: rand(-5, 3) * storm };
    r.gustT = rand(7, 12) / storm;
    flash(side > 0 ? 'Rukwind van links!' : 'Rukwind van rechts!', 1.8);
    sfx('whoosh', 0.9);
    r.shake = 0.5;
  }
}

function roofAt(x, y) {
  let top = 0;
  for (const b of world.map.buildingsNear(x, y, 5)) {
    const [x0, y0, x1, y1] = b.bounds;
    if (x < x0 - 4 || x > x1 + 4 || y < y0 - 4 || y > y1 + 4) continue;
    if (!pointInPolygon(x, y, b.pts)) continue;
    top = Math.max(top, (b.h || 3) * LEVEL_HEIGHT + (b.lift || 0));
  }
  return top;
}

function checkCollision(dt) {
  const r = run;
  r.hitCd -= dt;
  const top = roofAt(r.x, r.y);
  if (top && r.z < top + 3) {
    r.z = top + 3;
    if (r.vz < 0) r.vz = 0;
    if (r.hitCd <= 0) {
      r.hitCd = 1.5;
      r.hits++;
      r.score -= HIT_PENALTY;
      r.speed = Math.max(SPEED_MIN, r.speed * 0.6);
      r.shake = 1;
      flash('Au! Rotor langs het dak', 1.5);
      sfx('bonk', 1);
    }
  }
}

function updateBalloon(dt) {
  const b = run.balloon;
  b.age += dt;
  const t = run.t;
  const gust = run.gust ? Math.sin(Math.PI * clamp(run.gust.t / run.gust.dur, 0, 1)) * run.gust.side * 0.8 : 0;
  b.vx = BALLOON_DIR.x * BALLOON_SPEED - BALLOON_DIR.y * gust;
  b.vy = BALLOON_DIR.y * BALLOON_SPEED + BALLOON_DIR.x * gust;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  const zWant = BALLOON_START.z + Math.sin(t * 0.21) * 14 + Math.sin(t * 0.53 + 1) * 4;
  b.vz = (zWant - b.z) * 0.8;
  b.z += b.vz * dt;
  b.yaw += b.spin * dt;
  if (b.burnLeft > 0) { b.burnLeft -= dt; if (b.burnLeft <= 0) b.nextBurn = rand(4, 9); }
  else if ((b.nextBurn -= dt) <= 0) { b.burnLeft = rand(1.2, 2.6); b.burnSeq++; }
  b.burn += ((b.burnLeft > 0 ? 1 : 0) - b.burn) * Math.min(1, dt * 10);
}

function passRings() {
  const r = run;
  while (r.nextRing < rail.rings.length && rail.rings[r.nextRing].s <= r.s) {
    const ring = rail.rings[r.nextRing];
    const d = Math.hypot(r.z - ring.z, r.off - ring.off);
    if (d <= RING_R) {
      r.ringsHit++;
      r.score += RING_SCORE;
      r.timeLeft += r.V.ringBonus;
      ring.mesh.material = RING_MATS.done;
      flash(`Ring! +${RING_SCORE}  +${r.V.ringBonus} s`, 1.1);
      sfx('notify', 0.7);
    } else {
      ring.mesh.material = RING_MATS.miss;
      flash('Ring gemist', 1);
    }
    r.nextRing++;
  }
  for (let i = r.nextRing; i < rail.rings.length; i++) {
    const m = rail.rings[i].mesh;
    const want = i === r.nextRing ? RING_MATS.next : RING_MATS.later;
    if (m.material !== want) m.material = want;
    if (i > r.nextRing + 3) break;
  }
  if (r.nextRing > 1) {
    const old = rail.rings[r.nextRing - 2].mesh;
    if (old.visible) old.visible = false;
  }
}

function flyRail(dt) {
  const r = run;
  controls(dt);
  updateGust(dt);
  r.off = clamp(r.off + r.voff * dt, -OFFSET_MAX, OFFSET_MAX);
  r.s += r.speed * dt;
  passRings();
  const p = railAt(r.s);
  const nx = -p.ty, ny = p.tx;
  const px = r.x, py = r.y;
  r.x = p.x + nx * r.off;
  r.y = p.y + ny * r.off;
  r.hdgWant = Math.atan2(p.ty, p.tx);
  r.hvx = dt > 0 ? (r.x - px) / dt : 0;
  r.hvy = dt > 0 ? (r.y - py) / dt : 0;
  if (r.s >= rail.len - 1) {
    r.phase = 'approach';
    r.phaseT = 0;
    flash('Achter die ballon aan!', 2);
  }
}

// After the rail: steer to a point beside the balloon, then hold station.
function flyChase(dt) {
  const r = run, b = r.balloon;
  controls(dt);
  updateGust(dt);
  const fx = BALLOON_DIR.x, fy = BALLOON_DIR.y, nx = -fy, ny = fx;
  if (r.phase === 'approach') {
    r.off = clamp(r.off + r.voff * dt, -OFFSET_MAX, OFFSET_MAX);
    const tx = b.x - fx * 30 + nx * 16 * r.catchSide, ty = b.y - fy * 30 + ny * 16 * r.catchSide;
    const dx = tx - r.x, dy = ty - r.y, d = Math.hypot(dx, dy) || 1;
    const px = r.x, py = r.y;
    const step = Math.min(d, r.speed * dt);
    r.x += (dx / d) * step;
    r.y += (dy / d) * step;
    r.hdgWant = Math.atan2(dy, dx);
    r.hvx = dt > 0 ? (r.x - px) / dt : 0;
    r.hvy = dt > 0 ? (r.y - py) / dt : 0;
    if (d < 45) {
      r.phase = 'catch';
      r.phaseT = 0;
      r.along = (r.x - b.x) * fx + (r.y - b.y) * fy;
      r.off = (r.x - b.x) * nx + (r.y - b.y) * ny;
      hud.catchEl.hidden = false;
      hud.catchLbl.textContent = r.V.catchText;
      flash('Koppelen!', 1.5);
    }
    return;
  }
  // catch: position relative to the balloon's track
  r.along += (r.speed - BALLOON_SPEED) * dt;
  r.off = clamp(r.off + r.voff * dt, -40, 40);
  r.along = clamp(r.along, -120, 60);
  if (r.speed > BALLOON_SPEED + 12 && r.along > 0) r.speed = Math.max(BALLOON_SPEED, r.speed - BRAKE * dt);
  const px = r.x, py = r.y;
  r.x = b.x + fx * r.along + nx * r.off;
  r.y = b.y + fy * r.along + ny * r.off;
  r.hdgWant = Math.atan2(fy, fx);
  r.hvx = dt > 0 ? (r.x - px) / dt : 0;
  r.hvy = dt > 0 ? (r.y - py) / dt : 0;

  const dz = r.z - (b.z + 1);
  const lat = Math.abs(r.off);
  const rel = r.speed - BALLOON_SPEED;
  const okZ = Math.abs(dz) < 3.5, okLat = lat > 11 && lat < 22, okAlong = Math.abs(r.along) < 8, okV = Math.abs(rel) < 3;
  if (lat < 10 && Math.abs(r.along) < 10 && dz > -6 && dz < 20 && r.hitCd <= 0) {
    r.bumps++;
    r.hits++;
    r.score -= HIT_PENALTY;
    r.hitCd = 2;
    r.off = Math.sign(r.off || 1) * 18;
    r.catchP = Math.max(0, r.catchP - 2);
    r.shake = 1;
    sfx('bonk', 1);
    if (r.bumps >= 3) { finish(false, r.V.hitsText); return; }
    flash(`Pas op de ballon! (${3 - r.bumps} over)`, 1.8);
  }
  r.hitCd -= dt;
  const inZone = okZ && okLat && okAlong && okV;
  r.catchP = clamp(r.catchP + (inZone ? dt : -dt * 0.5), 0, CATCH_NEED);
  hud.catchBar.style.width = `${(r.catchP / CATCH_NEED) * 100}%`;
  const tip = (ok, good, bad) => `<span class="${ok ? 'ok' : ''}">${ok ? good : bad}</span>`;
  const tips = [
    tip(okZ, 'hoogte goed', dz > 0 ? 'lager' : 'hoger'),
    tip(okLat, 'afstand goed', lat <= 11 ? 'verder weg' : 'dichterbij'),
    tip(okAlong && okV, 'snelheid goed', r.along < -8 || (rel < -3 && r.along < 8) ? 'sneller' : 'langzamer'),
  ].join(' · ');
  if (hud.cache.tips !== tips) { hud.cache.tips = tips; hud.catchTips.innerHTML = tips; }
  if (r.catchP >= CATCH_NEED) finish(true);
}

function attitude(dt) {
  const r = run, h = r.heli;
  const prev = r.heading;
  let dh = r.hdgWant - r.heading;
  dh = Math.atan2(Math.sin(dh), Math.cos(dh));
  r.heading += dh * Math.min(1, dt * 3);
  const yawRate = dt > 0 ? Math.atan2(Math.sin(r.heading - prev), Math.cos(r.heading - prev)) / dt : 0;
  const bankT = clamp(Math.atan((r.speed * yawRate) / 9.81) + r.voff * 0.025, -0.5, 0.5);
  const pitchT = clamp(-0.1 - 0.006 * r.speed + (r.prevSpeed !== undefined ? -(r.speed - r.prevSpeed) / Math.max(dt, 1e-3) * 0.012 : 0), -0.4, 0.2);
  r.prevSpeed = r.speed;
  h.bank += (bankT - h.bank) * Math.min(1, dt * 2.5);
  h.pitch += (pitchT - h.pitch) * Math.min(1, dt * 2);
  h.heading = r.heading;
  h.x = r.x; h.y = r.y; h.z = r.z;
  h.vx = r.hvx || 0; h.vy = r.hvy || 0; h.vz = r.vz;
  h.v = r.speed;
  h.rotor = 1;
  h.downwash = 0;
}

// --- camera -----------------------------------------------------------------

function updateCamera(dt) {
  const r = run, b = r.balloon;
  let pos, look, fov = 62;
  if (r.phase === 'intro') {
    const pad = r.pad;
    const a = pad.angle + 2.2 + r.phaseT * 0.08;
    pos = { x: pad.x + Math.cos(a) * 30, y: pad.y + Math.sin(a) * 30, z: pad.deck + 7 + r.phaseT * 1.2 };
    look = { x: r.x, y: r.y, z: r.z + 1.5 };
    fov = 55;
  } else if (r.phase === 'result') {
    const a = r.phaseT * 0.18 + r.heading + 2.4;
    const mx = (r.x + b.x) / 2, my = (r.y + b.y) / 2, mz = (r.z + b.z) / 2 + 6;
    pos = { x: mx + Math.cos(a) * 55, y: my + Math.sin(a) * 55, z: mz + 12 };
    look = { x: mx, y: my, z: mz };
    fov = 55;
  } else {
    const catching = r.phase === 'catch';
    const back = catching ? 34 : 20 + r.speed * 0.2;
    const up = catching ? 9 : 6.5;
    const ch = Math.cos(r.heading), sh = Math.sin(r.heading);
    pos = { x: r.x - ch * back, y: r.y - sh * back, z: r.z + up };
    if (catching) {
      const nx = -sh, ny = ch, side = -Math.sign(r.off || 1);
      pos.x += nx * side * 10; pos.y += ny * side * 10;
    }
    const lx = r.x + ch * 40, ly = r.y + sh * 40;
    const bd = Math.hypot(b.x - r.x, b.y - r.y);
    const k = catching ? 0.5 : r.phase === 'approach' ? 0.35 : clamp(1 - bd / 2500, 0, 0.2);
    const bx = r.x + (b.x - r.x) * Math.min(1, 60 / Math.max(bd, 1)), by = r.y + (b.y - r.y) * Math.min(1, 60 / Math.max(bd, 1));
    look = { x: lx + (bx - lx) * k, y: ly + (by - ly) * k, z: r.z + (catching ? (b.z + 8 - r.z) * 0.5 : 0) };
    fov = catching ? 58 : clamp(56 + (r.speed - SPEED_MIN) * 0.55, 56, 76);
  }
  if (!r.cam) r.cam = { ...pos };
  else {
    const s = 1 - Math.exp(-(r.phase === 'rail' || r.phase === 'approach' ? 6 : 3) * dt);
    r.cam.x += (pos.x - r.cam.x) * s; r.cam.y += (pos.y - r.cam.y) * s; r.cam.z += (pos.z - r.cam.z) * s;
  }
  let sx = 0, sy = 0;
  if (r.shake > 0) {
    r.shake = Math.max(0, r.shake - dt * 1.6);
    sx = (Math.random() - 0.5) * r.shake * 0.8; sy = (Math.random() - 0.5) * r.shake * 0.8;
  }
  world.cameraOverride = { position: { x: r.cam.x + sx, y: r.cam.y, z: r.cam.z + sy }, lookAt: look, fov, cut: true };
}

// --- per frame --------------------------------------------------------------

export function updateHeliRun(dt, w) {
  if (!run) return;
  const r = run;
  r.t += dt;
  r.phaseT += dt;
  updateBalloon(dt);
  if (r.phase === 'intro') {
    const h = r.heli, pad = r.pad;
    const k = smooth((r.phaseT - 1.2) / (INTRO_S - 1.2));
    h.rotor = Math.min(1, 0.35 + r.phaseT * 0.4);
    r.z = pad.deck + k * 16;
    h.z = r.z;
    h.downwash = clamp(1 - k, 0, 1) * h.rotor;
    h.groundZ = pad.deck;
    r.hdgWant = r.heading = h.heading = Math.atan2(railAt(8).y - pad.y, railAt(8).x - pad.x);
    if (r.phaseT >= INTRO_S) { r.phase = 'rail'; r.phaseT = 0; r.s = 0; }
  } else if (r.phase === 'result') {
    r.speed = approach(r.speed, BALLOON_SPEED, dt * 6);
    r.x += BALLOON_DIR.x * BALLOON_SPEED * dt; r.y += BALLOON_DIR.y * BALLOON_SPEED * dt;
    r.hdgWant = Math.atan2(BALLOON_DIR.y, BALLOON_DIR.x);
    attitude(dt);
    if (r.phaseT >= RESULT_S) { updateCamera(dt); syncPlayer(); cleanup(false); return; }
  } else {
    r.elapsed += dt;
    r.timeLeft -= dt;
    if (r.phase === 'rail') flyRail(dt);
    else flyChase(dt);
    if (run && run.phase !== 'result') {
      checkCollision(dt);
      attitude(dt);
      if (r.timeLeft <= 0) finish(false);
    }
  }
  if (!run) return;
  updateCamera(dt);
  syncPlayer();
  updateHud(dt);
}

// --- start spot ---------------------------------------------------------------

function nearSpot(w) {
  const p = w.player;
  if (!spot || w.pigeonMode || w.heliRun || p.inVehicle || p.swimming || p.water) return false;
  return Math.hypot(spot.x - p.x, spot.y - p.y) < USE_RADIUS;
}

export function heliSpotPrompt(w) {
  if (!nearSpot(w)) return null;
  const why = blockReason(w);
  return { id: 'heli-umcg', x: spot.x, y: spot.y, h: 2.75, key: 'E', label: 'Ballonjacht met de traumaheli', sub: why || 'Dokter Dijkstra laat je meevliegen', ring: true, dim: !!why };
}

export function heliSpotSecondary(w) {
  if (!spot || w.heliRun || w.pigeonMode || w.player.inVehicle) return [];
  const { x, y } = w.player;
  if (Math.abs(spot.x - x) > 20 || Math.abs(spot.y - y) > 20) return [];
  return [{ id: 'heli2-umcg', x: spot.x, y: spot.y, h: 2.2, label: 'Traumaheli', sub: 'Loop erheen en druk E', kind: 'place' }];
}

// Runs before the shop/horeca/player E handlers.
export function tryHeliSpotInteract(w) {
  const input = w.input;
  if (!input || isShopOpen() || isCinematicActive() || w.heliRun) return false;
  if (!(input.wasPressed('e') || input.wasPressed('f'))) return false;
  if (!nearSpot(w)) return false;
  input.consume('e');
  input.consume('f');
  const why = blockReason(w);
  if (why) { w.addMessage(why, 2.5); return true; }
  startHeliRun({ variant: 'ballonjacht' });
  return true;
}

function animatePilot(dt) {
  if (!spot || !spot.pilot) return;
  const p = world.player;
  if (Math.abs(spot.x - p.x) > 60 || Math.abs(spot.y - p.y) > 60) return;
  animatePersonWalk(spot.pilot, 0, dt);
}

export function updateHeliSpot(dt) {
  if (!world) return;
  if (spot) spot.marker.visible = !world.heliRun;
  animatePilot(dt);
}

export function initHeliRun(w) {
  world = w;
  scene = getScene();
  rail = buildRail();
  initHudDom();
  spot = placeSpot(w.map);
  // T (phone) stays shut while flying
  window.addEventListener('keydown', (e) => {
    if (w.heliRun && e.key.toLowerCase() === 't') e.stopImmediatePropagation();
  }, true);
  window.__heliRun = {
    start: (variant = 'ballonjacht', onFinish = (res) => console.log('[helirun]', JSON.stringify(res))) => startHeliRun({ variant, onFinish }),
    abort: abortHeliRun,
    set autopilot(v) { autopilot = !!v; },
    get autopilot() { return autopilot; },
    state: getHeliRun,
    spot: () => spot,
    rail: () => ({ len: rail.len, rings: rail.rings.map((r) => ({ s: r.s, z: r.z, off: r.off })) }),
  };
}
