import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { speakerHtml } from './speakers.js';
import { getSettings, setSetting, QUALITY_PRESETS } from './settings.js';
import { refreshDayNight } from './daynight.js';
import { makeActor, stage, seat, makeBirds, scatterBirds, updateBirds } from './intromontage.js';
import { TAMMO_APPEARANCE, ANITA_APPEARANCE } from './models3d_people.js';
import { Vehicle, MODELS, spawnHeroCarNear, explodeVehicle } from './vehicle.js';
import { BOAT_KINDS } from './boattypes.js';
import { scriptHeli, updateSkyProps, helipadInfo } from './skyprops.js';
import { getTrains, getLevelCrossings, placeTrain } from './railway.js';
import { routeAt as canalAt, ROUTE_LENGTH as CANAL_LENGTH } from './rondvaartchase.js';
import { RING_ROUTE } from './ringroute.js';
import { buildPigeonBird, posePigeonBird } from './pigeonmode.js';
import { setPoliceHeliRender } from './police.js';
import { roofAt } from './camerapath.js';
import { kickTheme } from './theme.js';
import { probe } from './hitchprobe.js';
import { flashScreen } from './postfx3d.js';

// Trailer mode (docs/verhaal-voorstel.md section 5): one list of staged shots
// through Grunn, played three ways:
//   attract    the short cut ('kort', city and features only, no story) at
//              every launch; hold Space to skip; hands its last camera
//              pose over to the title screen
//   benchmark  the full cut ('vol') in real time with an fps counter, then a
//              results card (Instellingen > Beeld > Benchmark draaien)
//   opname     ?trailer / desktop --trailer: fixed 1/60 s steps for
//              recordings, no fps counter, the desktop app quits at the end
// Each shot forces its own clock and weather. The title screen owns the frame
// loop outside the trailer; while it runs, runTrailer drives the world through
// the title screen's tick/render/relocate.

const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
const TEST_FLAGS = ['stil', 'dev', 'storytest', 'noattract', 'hitch', 'shaderdebug'];
const BENCH_KEY = 'gte-benchmark-pending';
const SKIP_HOLD_S = 0.9;
const STEP = 1 / 60;
const MEASURE_AFTER_CUT_S = 0.3;
const BENCH_RUNS = Q.has('benchmark') ? Math.max(1, Number(Q.get('benchmark')) || 1) : 0;

// What should play before the title menu shows, if anything.
export function pendingTrailer() {
  if (Q.has('trailer')) {
    const n = Number(Q.get('shot'));
    return { mode: 'opname', cut: Q.get('cut') === 'kort' ? 'kort' : 'vol', shot: Number.isFinite(n) && n > 0 ? n : null, frames: Q.has('frames') };
  }
  // ?attract (desktop --attract) plays the attract intro on request, also in a test run
  if (Q.has('attract')) return { mode: 'attract', cut: 'kort' };
  // ?benchmark=N (desktop --benchmark=N): N benchmark runs in a row, logged
  if (Q.has('benchmark')) return { mode: 'benchmark', cut: 'vol' };
  let bench = null;
  try { bench = sessionStorage.getItem(BENCH_KEY); sessionStorage.removeItem(BENCH_KEY); } catch (e) { /* ignore */ }
  if (bench) return { mode: 'benchmark', cut: 'vol', fromGame: true };
  // every launch opens with the attract intro, except test runs
  if (TEST_FLAGS.some((k) => Q.has(k))) return null;
  return { mode: 'attract', cut: 'kort' };
}

// In a running game the benchmark starts from a fresh load of the title
// screen (after saving), and "Terug" continues that save.
export function benchmarkViaReload() {
  try { sessionStorage.setItem(BENCH_KEY, '1'); } catch (e) { return false; }
  location.reload();
  return true;
}

// --- small helpers ------------------------------------------------------------

const P = (x, y, z) => ({ x, y, z });
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const smooth = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
const lerpP = (a, b, t) => P(lerp(a.x, b.x, t), lerp(a.y, b.y, t), lerp(a.z, b.z, t));

function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function polyline(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const len = cum[cum.length - 1];
  return {
    len,
    at(s) {
      s = Math.max(0, Math.min(len - 1e-3, s));
      let i = 1;
      while (i < cum.length - 1 && cum[i] < s) i++;
      const a = pts[i - 1], b = pts[i];
      const t = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
      return { x: lerp(a[0], b[0], t), y: lerp(a[1], b[1], t), a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
    },
  };
}

function shake(t, amp, seed) {
  return P(
    (Math.sin(t * 1.3 + seed) + Math.sin(t * 2.9 + seed * 2) * 0.5) * amp,
    (Math.sin(t * 1.7 + seed * 3) + Math.sin(t * 3.3 + seed) * 0.5) * amp,
    (Math.sin(t * 1.1 + seed * 5) + Math.sin(t * 2.3 + seed * 4) * 0.4) * amp * 0.6,
  );
}

const WEATHER = {
  helder: {},
  zon: {},
  mist: { mist: 0.6, overcast: 0.35 },
  bewolkt: { overcast: 0.7 },
  motregen: { rain: 0.35, kind: 'motregen' },
  storm: { rain: 1, kind: 'storm' },
};

function forceWeather(w, name) {
  const k = WEATHER[name] || WEATHER.helder;
  const rain = k.rain || 0;
  w.weather = {
    active: rain > 0, timer: 1e9, kind: k.kind, peak: rain, intensity: rain, wet: rain,
    overcast: k.overcast || 0, mist: k.mist || 0, windAngle: 0.9, elapsed: 0, duration: Infinity,
  };
}

function setClock(w, h) {
  w.clock = ((h % 24) + 24) % 24;
  refreshDayNight(w);
}

const POLICE_MODEL = { name: 'police', len: 4.3, wid: 1.8, maxSpeed: 55, accel: 11, brake: 20, turnRate: 2.8, color: '#1c1c1c' };
const EIERBAL_GEO = new THREE.SphereGeometry(0.075, 12, 10);
const EIERBAL_MAT = new THREE.MeshStandardMaterial({ color: 0xc27a2c, roughness: 0.9 });

// --- UI ---------------------------------------------------------------------------

const CSS = `
#trailer { position: fixed; inset: 0; z-index: 17; pointer-events: none; font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; color: #f0ede4; opacity: 0; transition: opacity 0.4s; --bar: 9vh; }
#trailer.on { opacity: 1; }
#trailer > div { position: absolute; }
#trailer .tr-vig { inset: 0; background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0) 55%, rgba(4, 10, 8, 0.5) 100%); transition: opacity 1.2s; }
#trailer .tr-bar { left: 0; right: 0; height: var(--bar); background: #000; transition: transform 0.8s cubic-bezier(0.6, 0, 0.3, 1); }
#trailer .tr-bar.top { top: 0; } #trailer .tr-bar.bottom { bottom: 0; }
#trailer.handoff .tr-bar.top { transform: translateY(-100%); } #trailer.handoff .tr-bar.bottom { transform: translateY(100%); }
#trailer.handoff .tr-vig { opacity: 0; }
#trailer .tr-black { inset: 0; background: #050807; opacity: 0; transition: opacity 0.35s; }
#trailer .tr-black.on { opacity: 1; transition: opacity 0.12s; }
#trailer .tr-black.fade { opacity: 1; transition: opacity 0.4s; }
#trailer .tr-black.dim { opacity: 0.55; transition: opacity 0.9s; }
#trailer .tr-flash { inset: 0; background: #fff6e6; opacity: 0; display: none; }
#trailer .tr-flash.go, #trailer .tr-flash.big { display: block; }
#trailer .tr-flash.go { animation: tr-flash 0.28s ease-out; }
#trailer .tr-flash.big { animation: tr-flash-big 0.5s ease-out; }
@keyframes tr-flash { 0% { opacity: 0.8; } 100% { opacity: 0; } }
@keyframes tr-flash-big { 0% { opacity: 1; } 30% { opacity: 0.25; } 45% { opacity: 0.9; } 100% { opacity: 0; } }
#trailer .tr-card { inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; opacity: 0; padding: 0 6vw; text-shadow: 0 3px 24px rgba(0, 0, 0, 0.75), 0 1px 3px rgba(0, 0, 0, 0.8); }
#trailer .tr-kicker { font-size: clamp(16px, 2vw, 26px); letter-spacing: 6px; color: #3fc97a; text-transform: uppercase; margin-bottom: 6px; }
#trailer .tr-title { font-size: clamp(48px, 8.5vw, 132px); line-height: 0.92; text-transform: uppercase; }
#trailer .tr-title.small { font-size: clamp(38px, 5.8vw, 88px); }
#trailer .tr-title .amp { color: #3fc97a; }
/* no card text-shadow here: it shows through the logo's transparent, gradient-clipped letters */
#trailer .tr-card .gte-logo { font-size: clamp(110px, 20vw, 250px); text-shadow: none; }
#trailer .tr-sub { left: 50%; bottom: calc(var(--bar) + 3vh); transform: translateX(-50%); width: min(86vw, 860px); text-align: center; font: clamp(17px, 1.7vw, 23px) 'Arial Narrow', Arial, sans-serif; letter-spacing: 0.3px; opacity: 0; transition: opacity 0.25s; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9); }
#trailer .tr-sub.on { opacity: 1; }
#trailer .tr-sub b { color: #3fc97a; margin-right: 6px; }
#trailer .tr-skip { right: 3vw; bottom: calc(var(--bar) * 0.5); transform: translateY(50%); display: flex; align-items: center; gap: 6px; font: 16px 'Arial Narrow', Arial, sans-serif; letter-spacing: 0.3px; color: rgba(240, 237, 228, 0.92); text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8); opacity: 0; transition: opacity 0.25s; }
#trailer.skippable .tr-skip { opacity: 1; }
#trailer .tr-skip .key { display: inline-flex; align-items: center; justify-content: center; height: 20px; padding: 0 5px; background: linear-gradient(180deg, #4a4f47, #2a2e28); border: 1px solid rgba(255, 255, 255, 0.35); border-bottom: 2px solid rgba(0, 0, 0, 0.6); border-radius: 4px; color: #3fc97a; font: 11px 'Bebas Neue', 'Arial Narrow', sans-serif; letter-spacing: 1px; }
#trailer .tr-skip svg { width: 20px; height: 20px; transform: rotate(-90deg); }
#trailer .tr-skip circle { fill: none; stroke: rgba(240, 237, 228, 0.25); stroke-width: 3; }
#trailer .tr-skip .fill { stroke: #3fc97a; stroke-linecap: round; stroke-dasharray: 62.8; stroke-dashoffset: calc(62.8 * (1 - var(--hold, 0))); }
#trailer .tr-skip.holding { color: #f0ede4; }
#trailer .tr-fps { right: 2.2vw; bottom: 1.6vh; font: 13px 'Arial Narrow', Arial, sans-serif; letter-spacing: 1.5px; color: rgba(240, 237, 228, 0.55); display: none; }
#trailer.bench .tr-fps { display: block; }
#trailer-result { position: fixed; inset: 0; z-index: 30; display: flex; align-items: center; justify-content: center; background: rgba(4, 8, 6, 0.55); font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; color: #f0ede4; animation: tr-res-in 0.35s ease both; }
#trailer-result[hidden] { display: none; }
@keyframes tr-res-in { from { opacity: 0; } to { opacity: 1; } }
#trailer-result .tr-res { width: min(520px, calc(100vw - 32px)); background: rgba(8, 14, 10, 0.88); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); border: 1px solid rgba(63, 201, 122, 0.4); border-radius: 6px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5); padding: 22px 26px 20px; box-sizing: border-box; }
#trailer-result h2 { margin: 0; font-size: 38px; letter-spacing: 2px; font-weight: normal; color: #3fc97a; }
#trailer-result .tr-meta { margin: 2px 0 14px; font: 14px 'Arial Narrow', Arial, sans-serif; letter-spacing: 0.3px; color: rgba(240, 237, 228, 0.65); }
#trailer-result .tr-nums { display: flex; gap: 34px; margin-bottom: 12px; }
#trailer-result .tr-nums div { display: flex; flex-direction: column; }
#trailer-result .tr-nums b { font-size: 56px; line-height: 1; font-weight: normal; }
#trailer-result .tr-nums span { font: 13px 'Arial Narrow', Arial, sans-serif; letter-spacing: 1px; color: rgba(240, 237, 228, 0.7); text-transform: uppercase; }
#trailer-result p { margin: 6px 0; font: 16px/1.4 'Arial Narrow', Arial, sans-serif; letter-spacing: 0.2px; }
#trailer-result .tr-advice { color: #f0ede4; border-left: 3px solid #3fc97a; padding-left: 10px; margin-top: 12px; }
#trailer-result .tr-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
#trailer-result button { font: 20px 'Bebas Neue', 'Arial Narrow', sans-serif; letter-spacing: 1.5px; padding: 7px 16px; border-radius: 3px; cursor: pointer; background: transparent; color: #f0ede4; border: 1px solid rgba(63, 201, 122, 0.6); }
#trailer-result button.primary { background: linear-gradient(90deg, #1e9e56, #3fc97a); color: #0c140e; border-color: transparent; }
#trailer-result button:hover, #trailer-result button:focus-visible { border-color: #5fe39a; color: #5fe39a; outline: none; }
#trailer-result button.primary:hover, #trailer-result button.primary:focus-visible { color: #0c140e; box-shadow: 0 0 0 2px #f0ede4; }
#trailer-result button[hidden] { display: none; }
body.trailer-on #hud, body.trailer-on .prompts, body.trailer-on #cine { display: none !important; }
@media (max-width: 700px) { #trailer-result .tr-nums { gap: 20px; } #trailer-result .tr-nums b { font-size: 42px; } }
`;

let ui = null;

function ensureUi() {
  if (ui) return ui;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const root = document.createElement('div');
  root.id = 'trailer';
  root.setAttribute('aria-live', 'polite');
  root.innerHTML = '<div class="tr-vig"></div><div class="tr-flash"></div><div class="tr-black"></div>' +
    '<div class="tr-card"></div><div class="tr-sub"></div><div class="tr-bar top"></div><div class="tr-bar bottom"></div>' +
    '<div class="tr-skip"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle class="fill" cx="12" cy="12" r="10"/></svg>' +
    '<span>Houd</span><span class="key">SPATIE</span><span>ingedrukt om over te slaan</span></div>' +
    '<div class="tr-fps"></div>';
  document.body.appendChild(root);
  const q = (s) => root.querySelector(s);
  q('.tr-flash').addEventListener('animationend', (e) => e.target.classList.remove('go', 'big'));
  ui = { root, flash: q('.tr-flash'), card: q('.tr-card'), sub: q('.tr-sub'), skip: q('.tr-skip'), fps: q('.tr-fps'), black: q('.tr-black'), cardKey: '', subKey: '' };
  return ui;
}

// In the last post pass when there is one; a full-screen DOM layer over the
// canvas otherwise, only present while it animates.
function flash(big = false) {
  if (flashScreen(big)) return;
  const f = ui.flash;
  f.classList.remove('go', 'big');
  void f.offsetWidth;
  f.classList.add(big ? 'big' : 'go');
}

// Driven by trailer time (p = 0..1 through the card), not a CSS animation:
// fixed-step recordings run slower than real time.
function showCard(cap, p = 0) {
  const key = cap ? cap.title + (cap.kicker || '') : '';
  if (key !== ui.cardKey) {
    ui.cardKey = key;
    if (cap) ui.card.innerHTML = cap.html || `${cap.kicker ? `<div class="tr-kicker">${cap.kicker}</div>` : ''}<div class="tr-title${cap.small ? ' small' : ''}">${cap.title}</div>`;
  }
  if (!cap) { ui.card.style.opacity = '0'; return; }
  const e = 1 - (1 - p) ** 3;
  ui.card.style.opacity = String(p < 0.16 ? p / 0.16 : p > 0.84 ? (1 - p) / 0.16 : 1);
  ui.card.style.transform = `scale(${(1.14 - 0.14 * e).toFixed(4)})`;
  ui.card.style.letterSpacing = `${(0.02 + 0.08 * e).toFixed(3)}em`;
}

function setSub(line) {
  const key = line ? line[2] + line[3] : '';
  if (key === ui.subKey) return;
  ui.subKey = key;
  ui.sub.classList.toggle('on', !!line);
  if (line) ui.sub.innerHTML = speakerHtml(line[2]) + line[3];
}

// --- shots ---------------------------------------------------------------------------

function landmark(w, name, fx, fy) {
  const lm = (w.map.meta.landmarks || []).find((l) => l.name === name);
  return lm ? { x: lm.x, y: lm.y } : { x: fx, y: fy };
}

// Nearest point within r metres that is not inside a building footprint.
function openSpot(map, x, y, r = 24) {
  if (!roofAt(map, x, y)) return { x, y };
  for (let d = 2; d <= r; d += 2) {
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
      if (!roofAt(map, px, py)) return { x: px, y: py };
    }
  }
  return { x, y };
}

// Stretch of the ring road that runs highest (a viaduct), as a polyline.
function ringViaduct(map) {
  const n = RING_ROUTE.length, span = 9;
  const zs = RING_ROUTE.map(([x, y]) => map.groundHeightAt(x, y, 40));
  let best = 0, bestZ = -1;
  for (let i = 0; i + span < n; i++) {
    let lo = Infinity;
    for (let k = 0; k <= span; k++) lo = Math.min(lo, zs[i + k]);
    if (lo > bestZ) { bestZ = lo; best = i; }
  }
  const pts = RING_ROUTE.slice(Math.max(0, best - 4), Math.min(n, best + span + 6)).map(([x, y]) => [x, y]);
  return { path: polyline(pts), deck: Math.max(0, bestZ), half: RING_ROUTE[best + (span >> 1)][2] };
}

function canalNear(x, y) {
  let best = 0, bd = Infinity;
  for (let s = 0; s < CANAL_LENGTH; s += 6) {
    const q = canalAt(s);
    const d = Math.hypot(q.x - x, q.y - y);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

function trainAtCrossing() {
  for (const c of getLevelCrossings()) {
    for (const t of getTrains()) {
      const { pts } = t.route;
      let s = 0, best = null;
      for (let i = 1; i < pts.length; i++) {
        const ax = pts[i - 1][0], ay = pts[i - 1][1], dx = pts[i][0] - ax, dy = pts[i][1] - ay;
        const L = Math.hypot(dx, dy) || 1;
        const u = Math.max(0, Math.min(1, ((c.x - ax) * dx + (c.y - ay) * dy) / (L * L)));
        const d = Math.hypot(ax + dx * u - c.x, ay + dy * u - c.y);
        if (!best || d < best.d) best = { d, s: s + u * L, a: Math.atan2(dy, dx) };
        s += L;
      }
      if (best && best.d < 10 && best.s > 150 && best.s < t.route.len - 150) return { c, t, s: best.s, a: best.a };
    }
  }
  return null;
}

function cityBox(map) {
  if (map._trailerBox) return map._trailerBox;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of map.roads) {
    const b = r.bounds;
    if (!b) continue;
    x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]);
  }
  map._trailerBox = [x0, y0, x1, y1];
  return map._trailerBox;
}

// Shot fields: label (benchmark results), cuts ('vol' and/or 'kort'), dur
// (seconds in the full cut; kort: its shorter length, same motion faster),
// clock/clockTo, weather, focus (where the world streams and populates),
// caps [[at, dur, title, kicker?, cuts?]], lines [[at, dur, who, text]],
// enter/tick/exit(r, s), cam(u, t, s) -> {position, lookAt, fov}.
function buildShots(w) {
  const map = w.map;
  const tower = landmark(w, 'Martinitoren', 214, 13);
  const vis = landmark(w, 'Vismarkt', 13, 254);
  const forum = landmark(w, 'Forum Groningen', 356, 63);
  const park = { x: 150, y: -736 };
  const square = { x: 172, y: 56 };

  const card = (title, kicker, extra = {}) => ({ black: true, dur: 2.6, cuts: ['vol'], caps: [[0.15, 2.3, title, kicker]], ...extra });

  const opening = card('Het noorden heeft één stad.', null, { label: 'Opening', dur: 3.0, caps: [[0.2, 2.7, 'Het noorden heeft één stad.']] });

  const toGM = Math.atan2(square.y - tower.y, square.x - tower.x);
  const sunrise = {
    label: 'Zonsopgang bij de Martinitoren', cuts: ['vol', 'kort'], dur: 5.0, kort: 3.4,
    clock: 6.35, clockTo: 6.75, weather: 'mist', focus: square,
    caps: [[1.0, 3.4, 'Grunn.', 'd’Olle Grieze']],
    cam(u, t) {
      const k = smooth(u), R = lerp(74, 60, k);
      return { position: P(tower.x + Math.cos(toGM) * R, tower.y + Math.sin(toGM) * R, lerp(3, 52, k)), lookAt: P(tower.x, tower.y, lerp(22, 74, k)), fov: 50, shake: 0.12 };
    },
  };

  const vm = openSpot(map, vis.x, vis.y, 20);
  const vismarkt = {
    label: 'Duiven op de Vismarkt', cuts: ['vol', 'kort'], dur: 3.6, kort: 2.6, clock: 9.6, weather: 'helder', focus: vm,
    enter(r, s) { s.birds = makeBirds(r.group, vm.x, vm.y, 3.5); s.gone = false; },
    tick(r, s, t, dt) {
      if (!s.gone && t > 1.1) { s.gone = true; scatterBirds(s.birds, vm.x - 9, vm.y); }
      updateBirds(s.birds, dt, t);
    },
    cam(u, t) {
      const a = lerpP(P(vm.x - 13, vm.y + 1.5, 0.7), P(vm.x - 5.5, vm.y + 0.6, 1.1), smooth(u));
      return { position: a, lookAt: P(vm.x + 4, vm.y, lerp(0.8, 3.2, smooth((u - 0.3) / 0.7))), fov: 46, shake: 0.03 };
    },
  };

  const fjordPts = [[309, 685], [326, 722], [341, 755], [351, 778], [358, 794], [360, 798], [387, 864], [412, 943], [413, 948], [424, 979], [440, 1026], [452, 1064]];
  const fjordRoad = polyline(fjordPts);
  const lane = (road, s, off) => {
    const q = road.at(s);
    return { x: q.x - Math.sin(q.a) * off, y: q.y + Math.cos(q.a) * off, a: q.a };
  };
  const fjord = {
    label: 'De Fjord', cuts: ['vol'], dur: 4.6, clock: 18.1, weather: 'helder', focus: lane(fjordRoad, 60, 2.1),
    caps: [[0.3, 2.0, 'Twee Stadjers.'], [2.45, 2.0, 'Eén droom.']],
    enter(r, s) {
      clearRoad(r, fjordRoad, 9);
      const q = lane(fjordRoad, 30, 2.1);
      s.car = tempCar(r, q.x, q.y, q.a, { hero: true });
      s.d = 30;
    },
    tick(r, s, t, dt) {
      s.d += (t < 2.1 ? 7 : 19) * dt;
      const q = lane(fjordRoad, s.d, 2.1);
      if (s.car) {
        Object.assign(s.car, { x: q.x, y: q.y, angle: q.a, speed: t < 2.1 ? 7 : 19 });
        seat(r.actor('tammo'), s.car, true);
        seat(r.actor('anita'), s.car, false);
      }
      s.q = q;
    },
    cams: [
      [2.2, (u, t, s) => {
        const q = s.q, f = Math.cos(q.a), g = Math.sin(q.a), d = lerp(3.4, 7, smooth(u));
        return { position: P(q.x + f * d - g * 0.4, q.y + g * d + f * 0.4, lerp(1.25, 1.7, u)), lookAt: P(q.x, q.y, 1.1), fov: lerp(34, 46, u), shake: 0.03 };
      }],
      [2.4, (u, t, s) => {
        const q = s.q, f = Math.cos(q.a), g = Math.sin(q.a);
        return { position: P(q.x - f * 5.2 + g * 0.6, q.y - g * 5.2 - f * 0.6, 0.55), lookAt: P(q.x + f * 6, q.y + g * 6, 0.9), fov: 56, shake: 0.08 };
      }],
    ],
  };

  const fries = card('En één Fries.', 'De Fryske Snackkening', { label: 'Fries', caps: [[0.15, 1.5, 'En één Fries.', 'De Fryske Snackkening'], [1.65, 0.9, 'Moai.', null]] });

  const chaseRoad = polyline([[407, 375], [401, 381], [394, 387], [381, 396], [362, 409], [325, 430], [320, 433], [311, 439], [295, 449], [280, 458], [266, 467], [257, 472], [253, 473], [247, 476], [239, 479], [223, 485], [205, 491], [186, 499], [182, 500], [98, 536], [95, 537], [88, 540], [81, 542], [73, 544], [66, 546], [58, 547], [50, 547], [35, 547]]);
  const chase = {
    label: 'Achtervolging door de binnenstad', cuts: ['vol', 'kort'], dur: 4.2, kort: 3.0, clock: 21.5, weather: 'motregen',
    focus: chaseRoad.at(150),
    caps: [[0.4, 1.9, 'Er rijdt niets boven Grunn.', null, ['vol']]],
    enter(r, s) {
      clearRoad(r, chaseRoad, 9);
      s.d = 40;
      const q = lane(chaseRoad, s.d, 1.8);
      s.car = tempCar(r, q.x, q.y, q.a, { model: MODELS[3 % MODELS.length] });
      s.cops = [0, 1, 2].map(() => tempCar(r, q.x, q.y, q.a, { police: true }));
      for (const c of s.cops) c.sirenOn = true;
    },
    tick(r, s, t, dt) {
      const v = 24;
      s.d += v * dt;
      const put = (car, d, off) => { const q = lane(chaseRoad, d, off); Object.assign(car, { x: q.x, y: q.y, angle: q.a + Math.sin(t * 2 + off) * 0.03, speed: v }); };
      put(s.car, s.d, 1.8 + Math.sin(t * 1.4) * 0.6);
      s.cops.forEach((c, i) => put(c, s.d - 7 - i * 6.5, (i % 2 ? 0.2 : 2.6) + Math.sin(t * 2 + i) * 0.4));
      s.q = lane(chaseRoad, s.d, 1.8);
    },
    cams: [
      [2.0, (u, t, s) => {
        const q = s.q, f = Math.cos(q.a), g = Math.sin(q.a);
        return { position: P(q.x + f * lerp(15, 11, u), q.y + g * lerp(15, 11, u), 4.2), lookAt: P(q.x - f * 12, q.y - g * 12, 0.8), fov: 54, shake: 0.1 };
      }],
      [2.2, (u, t, s) => {
        const c = s.car, f = Math.cos(c.angle), g = Math.sin(c.angle);
        return { position: P(c.x - f * 2.8 + g * 1.1, c.y - g * 2.8 - f * 1.1, 0.6), lookAt: P(c.x - f * 16, c.y - g * 16, 0.9), fov: 60, shake: 0.12 };
      }],
    ],
  };

  const heli = {
    label: 'Politieheli boven de Grote Markt', cuts: ['vol', 'kort'], dur: 3.8, kort: 3.0, clock: 23.4, weather: 'helder', focus: square,
    caps: [[0.5, 3.0, 'Grunn slaapt nooit.']],
    enter(r, s) {
      s.h = { x: square.x - 30, y: square.y - 10, z: 42, angle: 0, spotX: square.x, spotY: square.y, spotOn: true, spotK: 1 };
      r.w.policeHeli = s.h;
      setPoliceHeliRender(s.h);
      s.cops = [0, 1].map((i) => tempCar(r, square.x + 8 - i * 12, square.y + 6 + i * 5, 0.6 + i * 2.2, { police: true }));
      for (const c of s.cops) c.sirenOn = true;
    },
    tick(r, s, t) {
      const a = 0.4 + t * 0.12;
      s.h.x = square.x + Math.cos(a) * 34; s.h.y = square.y + Math.sin(a) * 34; s.h.angle = a + Math.PI / 2;
      s.h.spotX = square.x + Math.sin(t * 0.7) * 10; s.h.spotY = square.y + Math.cos(t * 0.5) * 7;
    },
    exit(r) { r.w.policeHeli = null; setPoliceHeliRender(null); },
    cam(u, t, s) {
      const h = s.h, a = 0.4 + t * 0.12 + 0.55;
      return { position: P(square.x + Math.cos(a) * 58, square.y + Math.sin(a) * 58, 30 + u * 4), lookAt: P(lerp(h.x, h.spotX, 0.45), lerp(h.y, h.spotY, 0.45), lerp(h.z, 0, 0.55)), fov: 55, shake: 0.12 };
    },
  };

  const pigeon = {
    label: 'Duif langs de Martinitoren', cuts: ['vol', 'kort'], dur: 4.4, kort: 3.0, clock: 16.2, weather: 'helder', focus: tower,
    caps: [[0.4, 2.1, 'Soms moet je het van boven zien.', null, ['vol']], [2.55, 1.8, 'En soms moet je iets loslaten.', null, ['vol']]],
    enter(r, s) {
      s.bird = r.prop('pigeon', () => {
        const b = buildPigeonBird('pigeon');
        b.scale.multiplyScalar(1.6);
        return b;
      });
    },
    tick(r, s, t) {
      const R = 15, a = 1.6 + t * 0.62, z = 50 + t * 3.2;
      s.p = P(tower.x + Math.cos(a) * R, tower.y + Math.sin(a) * R, z);
      s.a = a + Math.PI / 2;
      s.bird.position.set(s.p.x, s.p.z, s.p.y);
      s.bird.rotation.set(0, -s.a, Math.sin(t * 1.1) * 0.08 - 0.28);
      posePigeonBird(s.bird, { flapPhase: t * 17, amp: t % 1.6 < 0.9 ? 0.9 : 0.15, fold: 0, grounded: false });
    },
    cam(u, t, s) {
      const R = 16.6, a = 1.6 + t * 0.62 - 0.15;
      return { position: P(tower.x + Math.cos(a) * R, tower.y + Math.sin(a) * R, s.p.z + 1.1), lookAt: P(s.p.x + Math.cos(s.a) * 1.2, s.p.y + Math.sin(s.a) * 1.2, s.p.z + 0.1), fov: 60, shake: 0.05 };
    },
  };

  const sBoat0 = canalNear(455, -51) - 30;
  const boat = {
    label: 'Rondvaartboot op de Diepenring', cuts: ['vol', 'kort'], dur: 4.2, kort: 3.0, clock: 14.2, weather: 'helder', focus: canalAt(sBoat0 + 10),
    enter(r, s) {
      const q = canalAt(sBoat0);
      s.boat = tempCar(r, q.x, q.y, q.a, { model: BOAT_KINDS.rondvaart, boat: true });
      s.d = sBoat0;
    },
    tick(r, s, t, dt) {
      s.d += 3.4 * dt;
      const q = canalAt(s.d);
      Object.assign(s.boat, { x: q.x, y: q.y, angle: q.a, speed: 3.4 });
    },
    cam(u, t, s) {
      const b = s.boat, f = Math.cos(b.angle), g = Math.sin(b.angle), k = smooth(u);
      return { position: P(b.x + f * lerp(30, 12, k) - g * lerp(16, 7, k), b.y + g * lerp(30, 12, k) + f * lerp(16, 7, k), lerp(46, 3.2, k)), lookAt: P(b.x, b.y, lerp(-1, 0.2, k)), fov: 52, shake: 0.06 };
    },
  };

  const ring = ringViaduct(map);
  const ringS = ring.path.len * 0.25;
  const race = {
    label: 'Race op de ringweg', cuts: ['vol', 'kort'], dur: 4.2, kort: 3.0, clock: 12.8, weather: 'helder', focus: ring.path.at(ringS + 60),
    caps: [[0.3, 1.7, 'De ringweg is af.', null, ['vol']]],
    enter(r, s) {
      clearRoad(r, ring.path, 14);
      s.d = ringS;
      // a staggered pack: side by side the far cars hid behind the near ones
      // (and touched them, which the collision pass kept resolving)
      const offs = [-2.8, 0, 2.8, -1.4, 1.4], lags = [0, 5, 1.5, 10, 14];
      const k = Math.min(1, (ring.half - 1.2) / 3);
      s.cars = offs.map((off, i) => ({ off: off * k, lag: lags[i], v: tempCar(r, 0, 0, 0, { model: MODELS[(i * 3 + 1) % MODELS.length] }) }));
    },
    tick(r, s, t, dt) {
      const v = 31;
      s.d += v * dt;
      s.q = lane(ring.path, s.d, 0);
      // the deck height on the centre line: lane offsets can reach the verge
      s.z = map.groundHeightAt(s.q.x, s.q.y, (s.z ?? ring.deck) + 0.5);
      for (const c of s.cars) {
        const q = lane(ring.path, s.d - c.lag - Math.sin(t * 0.9 + c.lag) * 0.6, c.off);
        Object.assign(c.v, { x: q.x, y: q.y, angle: q.a, speed: v, z: s.z });
      }
    },
    cam(u, t, s) {
      const q = s.q, f = Math.cos(q.a), g = Math.sin(q.a);
      // long lens: the pack stays compact and the cars at the back stay readable
      const ahead = lerp(30, 19, u), side = ring.half + lerp(3.5, 1.5, u);
      return { position: P(q.x + f * ahead - g * side, q.y + g * ahead + f * side, ring.deck + lerp(6.5, 4.2, u)), lookAt: P(q.x - f * 6, q.y - g * 6, ring.deck + 0.6), fov: 36, shake: 0.08 };
    },
  };

  const bijna = card('Bijna.', null, { label: 'Bijna', dur: 1.3, caps: [[0.05, 1.2, 'Bijna.']] });

  const fromSouth = openSpot(map, forum.x + 18, forum.y + 125, 30);
  const storm = {
    label: 'Storm boven het Forum', cuts: ['vol', 'kort'], dur: 4.0, kort: 3.0, clock: 16.8, weather: 'storm', focus: { x: forum.x, y: forum.y + 60 },
    caps: [[0.6, 2.9, 'Weer? Ja.', 'Storm boven de Kiekdeuse']],
    flashes: [0.05, 1.9, 3.3],
    tick(r, s, t) {
      for (const f of this.flashes) if (!s['f' + f] && t >= f) { s['f' + f] = true; flash(true); }
    },
    cam(u) {
      return { position: P(fromSouth.x, fromSouth.y, lerp(24, 27, u)), lookAt: P(forum.x, forum.y, 24), fov: 60, shake: 0.05 };
    },
  };

  const pad = helipadInfo(map);
  const padC = pad || { x: 749.6, y: -267.8, deck: 20, angle: -0.642 };
  // low on the roof edge opposite the city: the heli lifts off against the
  // skyline instead of a wide shot over the flat hospital roofs
  const awayA = Math.atan2(padC.y - tower.y, padC.x - tower.x);
  const camAt = (d) => ({ x: padC.x + Math.cos(awayA) * d, y: padC.y + Math.sin(awayA) * d });
  const trauma = {
    label: 'Traumaheli boven het UMCG', cuts: ['vol', 'kort'], dur: 3.6, kort: 2.6, clock: 7.2, weather: 'helder', focus: padC,
    caps: [[0.5, 2.6, 'Hulp komt van boven.', null, ['vol']]],
    enter(r, s) {
      s.h = pad ? scriptHeli(r.w) : null;
      const c0 = camAt(120), dx = padC.x - c0.x, dy = padC.y - c0.y, dl = Math.hypot(dx, dy) || 1;
      s.bal = [0, 1, 2].map((i) => ({
        x: padC.x + (dx / dl) * (330 + i * 120) + (-dy / dl) * (i - 1) * 110, y: padC.y + (dy / dl) * (330 + i * 120) + (dx / dl) * (i - 1) * 110,
        z: 75 + i * 30, targetZ: 75 + i * 30, vz: 0, drift: 0.2, spin: 0.01, yaw: i, seed: 99 + i * 17, phase: 'float', timer: 0,
        burn: 0, burnLeft: 0, nextBurn: 0.8 + i, burnSeq: 0, burnDur: 0, age: 0,
      }));
      if (r.w.balloons) r.w.balloons.push(...s.bal);
    },
    tick(r, s, t) {
      if (!s.h) return;
      const k = smooth(t / 3.6);
      Object.assign(s.h, { x: padC.x, y: padC.y, z: padC.deck + lerp(0.2, 30, k), heading: padC.angle + t * 0.25, pitch: -0.05, bank: 0, rotor: 1 });
    },
    exit(r, s) {
      if (r.w.balloons) r.w.balloons = r.w.balloons.filter((b) => !s.bal.includes(b));
      if (s.h) r.w.skyHeli = null;
    },
    cam(u, t, s) {
      const hz = s.h ? s.h.z : padC.deck + 15;
      const c = camAt(lerp(24, 34, u));
      return { position: P(c.x, c.y, padC.deck + lerp(2.2, 7, smooth(u))), lookAt: P(padC.x, padC.y, lerp(padC.deck + 3, hz - 2.5, u)), fov: 58, shake: 0.05 };
    },
  };

  const cross = trainAtCrossing();
  const train = cross && {
    label: 'Trein over de overweg', cuts: ['vol', 'kort'], dur: 3.4, kort: 2.6, clock: 17.4, weather: 'bewolkt', focus: cross.c,
    caps: [[0.5, 2.4, 'Spoorboekje? Richtlijn.', null, ['vol']]],
    enter(r, s) { s.dir = Math.random() < 0.5 ? 1 : -1; },
    tick(r, s, t) {
      const tr = cross.t;
      tr.c = cross.s + s.dir * (-48 + t * 27);
      placeTrain(tr);
    },
    cam(u) {
      const c = cross.c, f = Math.cos(cross.a), g = Math.sin(cross.a);
      return { position: P(c.x - g * 22 + f * 2, c.y + f * 22 + g * 2, 1.2 + u * 0.3), lookAt: P(c.x, c.y, 2.2), fov: 52, shake: 0.06 };
    },
  };

  const fpCam = (w.flitspaalen || []).slice().sort((a, b) => Math.hypot(a.x - 150, a.y - 250) - Math.hypot(b.x - 150, b.y - 250))[0];
  const flits = fpCam && {
    label: 'Flitspaal', cuts: ['vol'], dur: 3.4, clock: 21.4, weather: 'helder', focus: fpCam,
    caps: [[2.0, 1.4, 'Glimlachen. Je staat erop.', null]],
    enter(r, s) {
      s.car = tempCar(r, fpCam.x, fpCam.y, fpCam.angle, { model: MODELS[5 % MODELS.length] });
      s.f = false;
    },
    tick(r, s, t) {
      const d = -38 + t * 24;
      const qx = fpCam.x + Math.cos(fpCam.angle) * d, qy = fpCam.y + Math.sin(fpCam.angle) * d;
      const rp = map.nearestRoadPoint(qx, qy, 20, true) || { x: qx, y: qy };
      Object.assign(s.car, { x: rp.x, y: rp.y, angle: fpCam.angle, speed: 24 });
      if (!s.f && d > 0) { s.f = true; flash(true); }
    },
    cam(u) {
      const px = fpCam.px ?? fpCam.x, py = fpCam.py ?? fpCam.y;
      const f = Math.cos(fpCam.angle), g = Math.sin(fpCam.angle);
      return { position: P(px + f * 7 + (px - fpCam.x) * 0.6, py + g * 7 + (py - fpCam.y) * 0.6, 1.6), lookAt: P(fpCam.x - f * 20, fpCam.y - g * 20, 1), fov: 50, shake: 0.03 };
    },
  };

  const boomRoad = polyline([[340, 295], [320, 254], [316, 244], [313, 235], [304, 217], [276, 157], [270, 140]]);
  const boom = {
    label: 'Explosies in de Oosterstraat', cuts: ['vol'], dur: 4.0, clock: 22.4, weather: 'helder', focus: boomRoad.at(90),
    caps: [[2.3, 1.6, 'Kon minder.']],
    slow: (t) => (t < 0.9 ? 1 : t < 2.6 ? 0.45 : 1),
    enter(r, s) {
      clearRoad(r, boomRoad, 10);
      s.cars = [80, 88, 97].map((d, i) => { const q = lane(boomRoad, d, 2.6); return tempCar(r, q.x, q.y, q.a + (i === 1 ? 0.1 : 0), { model: MODELS[(i * 4 + 2) % MODELS.length] }); });
      s.at = [0.9, 1.5, 2.0];
    },
    tick(r, s, t, dt) {
      s.cars.forEach((c, i) => {
        if (!c.wrecked && t >= s.at[i]) { c.wreckedByPlayer = false; explodeVehicle(c, r.w); }
        if (c.airborne) {
          c.z = (c.z || 0) + c.vz * dt;
          c.vz -= 9.8 * dt;
          if (c.z <= 0) { c.z = 0; c.vz = 0; c.airborne = false; }
        }
      });
    },
    cam(u) {
      const q = boomRoad.at(88), f = Math.cos(q.a), g = Math.sin(q.a);
      return { position: P(q.x - f * lerp(22, 18, u) - g * 2.5, q.y - g * lerp(22, 18, u) + f * 2.5, 1.4), lookAt: P(q.x, q.y, 1.6), fov: 52, shake: 0.08 };
    },
  };

  const plantsoen = {
    label: 'Noorderplantsoen', cuts: ['vol'], dur: 3.6, clock: 15.4, weather: 'helder', focus: park,
    caps: [[0.5, 2.8, 'Eerste zon? Heel Grunn op een kleedje.', null]],
    cam(u) {
      const a = 1.2 + u * 0.3, R = lerp(95, 80, u);
      return { position: P(park.x + Math.cos(a) * R, park.y + Math.sin(a) * R, lerp(30, 42, smooth(u))), lookAt: P(park.x, park.y, 0), fov: 54, shake: 0.05 };
    },
  };

  const box = cityBox(map);
  const land = { x: (box[0] + box[2]) / 2 + 300, y: box[1] - 260 };
  const ommeland = {
    label: 'De Ommelanden', cuts: ['vol'], dur: 4.0, clock: 19.0, weather: 'helder', focus: land,
    caps: [[0.4, 1.8, 'Daarbuiten: de Ommelanden.'], [2.3, 1.6, 'Koeien kijken terug.']],
    cam(u) {
      return { position: P(land.x - 40 + u * 30, land.y + 30, lerp(3, 9, u)), lookAt: P(land.x + 60, land.y - 120, 2), fov: 50, shake: 0.04 };
    },
  };

  const poele = polyline([[268, 129], [304, 131], [347, 130], [373, 123], [414, 115]]);
  const night = {
    label: 'Nacht in de Poelestraat', cuts: ['vol', 'kort'], dur: 3.8, kort: 3.0, clock: 23.3, weather: 'helder', focus: poele.at(70),
    caps: [[0.6, 2.8, 'Dag en nacht.']],
    cam(u) {
      const q = poele.at(lerp(8, 60, u));
      const ahead = poele.at(lerp(8, 60, u) + 38);
      return { position: P(q.x, q.y, 4.2), lookAt: P(ahead.x, ahead.y, 2.2), fov: 56, shake: 0.04 };
    },
  };

  // The last shot of the short cut: its final pose is the title screen's
  // first, and continuation() keeps the camera moving there without a cut.
  const AER = { a0: 0.55, w: -0.045, R0: 150, vr: 16, z0: 95, vz: 7.5 };
  const aerialPose = (s) => {
    const a = AER.a0 + AER.w * s, R = AER.R0 + AER.vr * s;
    return { position: P(tower.x + Math.cos(a) * R, tower.y + Math.sin(a) * R, AER.z0 + AER.vz * s), lookAt: P(tower.x, tower.y, 38), fov: 52 };
  };
  const aerial = {
    label: 'Luchtfoto bij zonsondergang', cuts: ['vol', 'kort'], dur: 5.6, kort: 4.6, clock: 19.1, weather: 'helder', focus: tower,
    caps: [[0.5, 2.3, 'Wij tweeën…', null, ['vol']], [2.9, 2.5, '…vóór Grunn.', null, ['vol']]],
    cam(u) { return aerialPose(u * 5.6); },
    // speed eases from 1 to 0.35 (arc length of that speed curve)
    continuation() {
      return (t) => aerialPose(5.6 + 0.35 * t + 1.3 * (1 - Math.exp(-t / 2)));
    },
  };

  // the aerial drifts on behind the logo, dimmed, instead of a black card
  const logoCam = aerial.continuation();
  const logo = {
    label: 'Logo', cuts: ['vol'], dur: 4.4, dim: true, keep: true, card: true, fadeOut: 1.0, clock: 19.1, clockTo: 19.35, weather: 'helder', focus: tower,
    cam(u) { return { ...logoCam(u * 4.4), shake: 0.03 }; },
    caps: [[0.2, 3.5, null, null, null, '<div class="tr-kicker">Grand Theft Eierbal</div><div class="gte-logo"><span class="gte">GTE</span><span class="vi">VI</span></div><div class="tr-kicker" style="margin-top:14px">Nu te spelen</div>']],
  };

  const tagSpot = openSpot(map, vis.x + 6, vis.y - 4, 16);
  const tag = {
    label: 'Eierbal', cuts: ['vol'], dur: 3.4, clock: 12.3, weather: 'helder', focus: tagSpot,
    lines: [[0.3, 1.6, 'Tammo', 'Mag ik nou eindelijk?'], [2.0, 1.3, 'Anita', 'Nee.']],
    enter(r, s) {
      const t = r.actor('tammo');
      s.ball = new THREE.Mesh(EIERBAL_GEO, EIERBAL_MAT);
      s.ball.position.set(0.04, -0.36, 0.06);
      if (t.userData.elbowR) t.userData.elbowR.add(s.ball);
    },
    exit(r, s) { if (s.ball) s.ball.removeFromParent(); },
    tick(r, s, t, dt) {
      stage(r.actor('tammo'), tagSpot.x, tagSpot.y, 0, { pose: 'bag', dt, t });
      stage(r.actor('anita'), tagSpot.x + 0.25, tagSpot.y + 0.85, -0.4, { pose: t > 2 ? 'lookL' : null, dt, t });
    },
    cam(u) {
      return { position: P(tagSpot.x + lerp(2.1, 1.7, u), tagSpot.y + 0.35, 1.6), lookAt: P(tagSpot.x, tagSpot.y + 0.2, 1.45), fov: 40, shake: 0.02 };
    },
  };

  return [opening, sunrise, vismarkt, fjord, fries, chase, heli, pigeon, boat, race, bijna, storm, trauma, train, flits, boom, plantsoen, ommeland, night, aerial, logo, tag].filter(Boolean);
}

// --- temporary actors ------------------------------------------------------------------

function tempCar(r, x, y, a, { police = false, hero = false, model = null, boat = false } = {}) {
  const w = r.w;
  let v = null;
  if (hero) {
    v = spawnHeroCarNear(w.map, x, y);
    if (v) v.isHeroCar = false;
  }
  if (!v) v = new Vehicle(x, y, a, police ? POLICE_MODEL : model || MODELS[0]);
  Object.assign(v, { x, y, angle: a, speed: 0, road: null, plan: [], driver: 'cine', cineTemp: true, missionCar: true, isPolice: police });
  if (boat) v.isBoat = true;
  else v.z = w.map.spawnZ ? w.map.spawnZ(x, y) : 0;
  w.vehicles.push(v);
  r.cars.push(v);
  return v;
}

function clearRoad(r, path, dist) {
  r.w.vehicles = r.w.vehicles.filter((v) => {
    if (v.cineTemp || v.driver === 'player' || v.isHeroCar || v.isBoat) return true;
    for (let s = 0; s < path.len; s += 5) {
      const q = path.at(s);
      if (Math.hypot(v.x - q.x, v.y - q.y) < dist) return false;
    }
    return true;
  });
}

function clearShot(r) {
  if (r.cars.length) {
    const set = new Set(r.cars);
    r.w.vehicles = r.w.vehicles.filter((v) => !set.has(v));
    r.cars = [];
  }
  for (const o of [...r.group.children]) {
    if (o.userData.trailerActor) { o.visible = false; continue; }
    r.group.remove(o);
    if (o.isInstancedMesh) o.dispose();
  }
}

// --- runtime --------------------------------------------------------------------------------

let running = null;
const trailerProps = new Map();

export function isTrailerRunning() {
  return !!running;
}

function snapshot(w) {
  const scalars = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v === null || typeof v !== 'object'));
  return {
    clock: w.clock, weather: w.weather, wanted: w.wanted, policeHeli: w.policeHeli || null, skyHeli: w.skyHeli || null,
    balloons: w.balloons ? w.balloons.slice() : null, menuCam: w.menuCam, hideNav: w.cinematicHideNav,
    trains: getTrains().map((t) => [t, scalars(t)]),
  };
}

function restore(w, s) {
  w.clock = s.clock;
  w.weather = s.weather;
  w.wanted = s.wanted;
  w.policeHeli = s.policeHeli;
  setPoliceHeliRender(s.policeHeli);
  w.skyHeli = s.skyHeli;
  if (s.balloons) w.balloons = s.balloons;
  w.menuCam = s.menuCam;
  w.cinematicHideNav = s.hideNav;
  for (const [t, v] of s.trains) { Object.assign(t, v); placeTrain(t); }
  refreshDayNight(w);
}

function shotDur(r, s) {
  return (r.cut === 'kort' && s.kort) || s.dur;
}

function nextFocus(r, i) {
  for (let k = i + 1; k < r.shots.length; k++) if (!r.shots[k].black && r.shots[k].focus) return r.shots[k];
  return null;
}

// Stream the next location in while the screen is black.
function streamNext(r, i) {
  const n = nextFocus(r, i);
  if (!n) return;
  r.env.relocate(n.focus.x, n.focus.y);
  if (n.clock != null) setClock(r.w, n.clock);
  forceWeather(r.w, n.weather);
  r.blackPose = { position: P(n.focus.x + 20, n.focus.y + 20, 60), lookAt: P(n.focus.x, n.focus.y, 0), fov: 50 };
}

function enterShot(r, i) {
  const prev = r.shots[r.idx];
  if (BENCH_RUNS && prev) logShot(r, r.idx);
  if (BENCH_RUNS) console.log(`[trailer] enter ${i + 1} at ${(performance.now() / 1000).toFixed(2)}`);
  if (prev && prev.exit) { try { prev.exit(r, r.state); } catch (e) { console.warn('trailer exit', e); } }
  clearShot(r);
  r.idx = i;
  r.state = {};
  r.camIdx = 0;
  const s = r.shots[i];
  const w = r.w;
  setSub(null);
  showCard(null);
  if (s.black) {
    ui.black.classList.remove('dim');
    ui.black.classList.add('on');
    streamNext(r, i);
  } else {
    const wasBlack = !prev || prev.black || prev.fadeOut;
    ui.black.classList.remove('on', 'fade');
    ui.black.classList.toggle('dim', !!s.dim);
    if (!wasBlack && !s.keep) flash();
    if (s.focus) r.env.relocate(s.focus.x, s.focus.y);
    if (s.clock != null) setClock(w, s.clock);
    forceWeather(w, s.weather);
  }
  if (s.enter) { try { s.enter(r, r.state); } catch (e) { console.error('trailer enter', s.label, e && e.stack); } }
  r.stats[i] = r.stats[i] || { label: s.label, ms: [] };
}

// ?benchmark: one line per shot with its fps, draw calls and GPU memory
function logShot(r, i) {
  const st = r.stats[i], ren = window.__scene3d && window.__scene3d.renderer;
  if (!st || !ren) return;
  const ms = st.ms.length ? st.ms.reduce((a, b) => a + b, 0) / st.ms.length : 0;
  const m = ren.info.memory;
  const worst = st.ms.length ? Math.max(...st.ms).toFixed(0) : '-';
  console.log(`[trailer] shot ${i + 1} ${st.label}: ${ms ? (1000 / ms).toFixed(1) : '-'} fps, max ${worst} ms, ${st.frames ? Math.round(st.calls / st.frames) : '-'} calls, geo ${m.geometries}, tex ${m.textures}, prog ${ren.info.programs.length}`);
}

function frame(r, dt, realMs) {
  const shots = r.shots;
  let i = r.idx < 0 ? 0 : r.idx;
  while (i < shots.length - 1 && r.T >= r.starts[i + 1]) i++;
  if (i !== r.idx) enterShot(r, i);
  const s = shots[i];
  const dur = shotDur(r, s);
  const k = s.dur / dur; // kort plays the same motion faster
  const st = (r.T - r.starts[i]) * k;
  const u = clamp01(st / s.dur);
  const slow = s.slow ? s.slow(st) : 1;
  const sdt = dt * slow;
  const w = r.w;
  // fadeOut: the shot ends on black, and the next location streams in there
  if (s.fadeOut && !r.state.faded && st > s.dur - s.fadeOut) { r.state.faded = true; ui.black.classList.remove('dim'); ui.black.classList.add('fade'); }
  if (s.fadeOut && !r.state.streamed && st > s.dur - s.fadeOut + 0.45) { r.state.streamed = true; streamNext(r, i); }
  if (r.state.streamed) {
    try { r.env.render(dt, 0); } catch (e) { /* ignore */ }
    return;
  }
  if (s.clockTo != null) setClock(w, lerp(s.clock, s.clockTo, u));
  if (!s.black && sdt > 0) {
    try { r.env.tick(sdt); } catch (e) { console.warn('trailer tick', e); }
    try { updateSkyProps(sdt, w); } catch (e) { /* ignore */ }
  }
  if (s.tick) { try { s.tick(r, r.state, st, sdt * k); } catch (e) { if (!r.warned) { r.warned = true; console.error('trailer shot', s.label, e && e.stack); } } }

  let cap = null, capP = 0;
  for (const c of s.caps || []) {
    const [at, d, title, kicker, cuts, html] = c;
    if (cuts && !cuts.includes(r.cut)) continue;
    if (st >= at && st < at + d && (title || html)) { cap = { title: title || '', kicker, html, small: (title || '').length > 18 }; capP = (st - at) / d; if (html) cap.title = html; }
  }
  showCard(cap, capP);
  if (s.lines) setSub(s.lines.find(([at, d]) => st >= at && st < at + d) || null);

  let pose = null;
  if (s.black) pose = r.blackPose || r.pose;
  else if (s.cams) {
    let acc = 0;
    for (let c = 0; c < s.cams.length; c++) {
      const [d, fn] = s.cams[c];
      if (st < acc + d || c === s.cams.length - 1) {
        if (c !== r.camIdx) { r.camIdx = c; flash(); }
        pose = fn(clamp01((st - acc) / d), st, r.state);
        break;
      }
      acc += d;
    }
  } else if (s.cam) pose = s.cam(u, st, r.state);
  if (pose && !pose.position) pose = null;
  if (pose) {
    const amp = pose.shake || 0;
    let p = pose.position, l = pose.lookAt;
    if (amp) {
      const a = shake(r.T, amp, 1), b = shake(r.T, amp * 1.6, 7);
      p = P(p.x + a.x, p.y + a.y, p.z + a.z);
      l = P(l.x + b.x, l.y + b.y, l.z + b.z);
    }
    const top = roofAt(w.map, p.x, p.y);
    if (top && p.z < top + 1.5) p = P(p.x, p.y, top + 1.5);
    r.pose = { position: p, lookAt: l, fov: pose.fov };
    w.cameraOverride = { ...r.pose, cut: true };
  }
  if (r.countCalls) r.countCalls.n = 0;
  try { r.env.render(sdt > 0 ? sdt : dt, sdt); } catch (e) { console.warn('trailer render', e); }
  if (r.countCalls) { r.stats[i].calls = (r.stats[i].calls || 0) + r.countCalls.n; r.stats[i].frames = (r.stats[i].frames || 0) + 1; }

  if (r.mode === 'benchmark') {
    // title cards are not measured, also when a picture runs behind them
    if (!s.black && !s.card && st / k > MEASURE_AFTER_CUT_S) r.stats[i].ms.push(realMs);
    r.fpsAcc += realMs; r.fpsN++;
    if (r.fpsAcc > 500) {
      ui.fps.textContent = `BENCHMARK · ${Math.round(1000 / (r.fpsAcc / r.fpsN))} fps`;
      r.fpsAcc = 0; r.fpsN = 0;
    }
  }
}

function computeStats(r) {
  const all = [];
  const shots = [];
  for (const s of r.stats) {
    if (!s || !s.ms.length) continue;
    all.push(...s.ms);
    const mean = s.ms.reduce((a, b) => a + b, 0) / s.ms.length;
    if (s.ms.length >= 20) shots.push({ label: s.label, fps: 1000 / mean });
  }
  if (!all.length) return null;
  const mean = all.reduce((a, b) => a + b, 0) / all.length;
  const sorted = all.slice().sort((a, b) => b - a);
  const n = Math.max(1, Math.floor(sorted.length * 0.01));
  const worst = sorted.slice(0, n).reduce((a, b) => a + b, 0) / n;
  shots.sort((a, b) => a.fps - b.fps);
  const min = all.reduce((a, b) => a + b, 0) / 60000;
  const spikes = [50, 100, 200].map((ms) => +(all.filter((x) => x > ms).length / Math.max(min, 1e-6)).toFixed(1));
  return { avg: 1000 / mean, low: 1000 / worst, heaviest: shots[0] || null, frames: all.length, shots, spikes };
}

// runTrailer(world, { mode, cut, shot, frames, env: { tick, render, relocate } })
// resolves with { skipped, aborted, stats, continuation }.
export function runTrailer(world, { mode = 'opname', cut = 'vol', shot = null, frames = false, env }) {
  if (running) return Promise.resolve({ skipped: true, aborted: true });
  ensureUi();
  return new Promise((resolve) => {
    const all = buildShots(world).filter((s) => s.cuts.includes(cut));
    const shots = shot != null && all[shot - 1] ? [all[shot - 1]] : all;
    const starts = [];
    let total = 0;
    const r = { w: world, env, mode, cut, shots, starts, idx: -1, state: {}, cars: [], T: 0, pose: null, stats: [], fpsAcc: 0, fpsN: 0, done: false, camIdx: 0 };
    for (const s of shots) { starts.push(total); total += shotDur(r, s); }
    r.total = total;
    const group = new THREE.Group();
    group.name = 'trailer';
    getScene().add(group);
    r.group = group;
    // actors and props are built once per session and hidden between shots
    r.prop = (name, build) => {
      let o = trailerProps.get(name);
      if (!o) {
        o = build();
        o.userData.trailerActor = true;
        trailerProps.set(name, o);
      }
      if (o.parent !== group) group.add(o);
      o.visible = true;
      return o;
    };
    r.actor = (name) => r.prop(name, () => makeActor(name === 'tammo' ? TAMMO_APPEARANCE : ANITA_APPEARANCE));
    const saved = snapshot(world);
    const nativeRandom = Math.random;
    Math.random = mulberry32(20260927 + (runTrailer.runs = (runTrailer.runs || 0) + 1) * 7919);
    world.menuCam = true;
    world.cinematicHideNav = true;
    running = r;
    const ren = window.__scene3d && window.__scene3d.renderer;
    let nativeRender = null;
    if (BENCH_RUNS && ren) {
      nativeRender = ren.render;
      r.countCalls = { n: 0 };
      ren.render = function (...a) { nativeRender.apply(this, a); r.countCalls.n += ren.info.render.calls; };
    }
    document.body.classList.add('trailer-on');
    // the colour look runs in the grade pass only: a CSS filter and blend
    // mode over the canvas would cost a full-screen compositing pass every
    // frame, which made the lowest preset the slowest
    const pfx = window.__scene3d && window.__scene3d.postfx;
    cancelAnimationFrame(lookFade);
    if (pfx && pfx.hasGrade) { pfx.look = 1; document.body.classList.add('trailer-gpu-look'); }
    ui.root.classList.remove('handoff', 'skippable', 'bench');
    ui.root.classList.toggle('bench', mode === 'benchmark');
    ui.root.classList.toggle('skippable', mode === 'attract');
    ui.skip.style.setProperty('--hold', '0');
    ui.skip.classList.remove('holding');
    ui.fps.textContent = 'BENCHMARK';
    ui.black.classList.add('on');
    ui.root.classList.add('on');
    kickTheme();
    console.log(`[trailer] ${mode}, ${cut}: ${shots.length} shots, ${total.toFixed(1)} s`);

    let holdSince = null;
    let swallow = false;
    let frozen = null;
    const onKey = (e) => {
      if (e.key === ' ') {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (e.type === 'keyup') { holdSince = null; swallow = false; return; }
        if (e.repeat || swallow) return;
        swallow = true;
        if (mode === 'attract') holdSince = performance.now();
      } else if (e.key === 'Escape' && e.type === 'keydown' && mode !== 'attract') {
        e.preventDefault();
        e.stopImmediatePropagation();
        end(true, true);
      }
    };
    const onBlur = () => { holdSince = null; swallow = false; };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKey, true);
    window.addEventListener('blur', onBlur);

    const end = (skipped, aborted = false) => {
      if (r.done) return;
      r.done = true;
      if (BENCH_RUNS) logShot(r, r.idx);
      if (nativeRender) ren.render = nativeRender;
      const last = r.shots[r.idx];
      if (last && last.exit) { try { last.exit(r, r.state); } catch (e) { /* ignore */ } }
      clearShot(r);
      group.removeFromParent();
      Math.random = nativeRandom;
      restore(world, saved);
      // the aerial's clock and weather carry on into the title screen
      const handOff = !skipped && last && last.continuation;
      if (handOff) {
        setClock(world, last.clock);
        forceWeather(world, last.weather);
      }
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('keyup', onKey, true);
      window.removeEventListener('blur', onBlur);
      showCard(null);
      setSub(null);
      ui.root.classList.remove('skippable', 'bench');
      ui.black.classList.remove('dim');
      running = null;
      const stats = mode === 'benchmark' ? computeStats(r) : null;
      if (stats) console.log('[trailer] benchmark', JSON.stringify({ avg: +stats.avg.toFixed(1), low: +stats.low.toFixed(1), spikesPerMin: stats.spikes, shots: stats.shots.map((x) => `${x.label}: ${x.fps.toFixed(1)}`) }));
      if (window.__trailer) window.__trailer.lastStats = stats;
      resolve({ skipped, aborted, stats, continuation: handOff ? last.continuation() : null, pose: r.pose });
    };
    r.end = end;

    let last = performance.now();
    const loop = (now) => {
      if (r.done) return;
      const realMs = Math.min(250, now - last);
      last = now;
      const dt = mode === 'opname' ? STEP : Math.min(0.1, realMs / 1000);
      const hold = frozen && r.T >= frozen.T;
      if (!hold) r.T += dt;
      if (r.T >= total) { end(false); return; }
      probe.begin(now);
      try { frame(r, hold ? 0 : dt, realMs); } catch (e) { console.error('trailer', r.shots[r.idx] && r.shots[r.idx].label, e && e.stack); }
      probe.end();
      if (hold) { requestAnimationFrame(loop); return; }
      if (holdSince != null) {
        const k = Math.min(1, (now - holdSince) / (SKIP_HOLD_S * 1000));
        ui.skip.style.setProperty('--hold', String(k));
        ui.skip.classList.add('holding');
        if (k >= 1) { holdSince = null; end(true); return; }
      } else if (ui.skip.classList.contains('holding')) {
        ui.skip.style.setProperty('--hold', '0');
        ui.skip.classList.remove('holding');
      }
      if (frames && window.gteDesktop && window.gteDesktop.captureFrame) {
        r.frameNo = (r.frameNo || 0) + 1;
        window.gteDesktop.captureFrame(r.frameNo).then(() => requestAnimationFrame(loop), () => requestAnimationFrame(loop));
        return;
      }
      requestAnimationFrame(loop);
    };
    // debug / screenshot hook: hold the picture at shot i (1-based), t seconds in
    window.__trailer = {
      list: () => shots.map((s, i) => `${i + 1}. ${s.label} (${shotDur(r, s)} s)`),
      // plays shot i from its start up to t seconds, then holds that frame
      freeze: (i, t = 1) => { if (!shots[i - 1]) return false; frozen = { T: starts[i - 1] + Math.min(t, shotDur(r, shots[i - 1]) - 0.05) }; r.T = starts[i - 1] - 0.001; r.idx = -1; return true; },
      play: () => { frozen = null; },
      stop: () => end(true, true),
    };
    requestAnimationFrame((now) => { last = now; loop(now); });
  });
}

// Fade the trailer overlay away: to black and then off (skip/abort), or by
// sliding the bars out over the running picture (the attract hand-off).
let lookFade = 0;
function fadeLook(ms) {
  const pfx = window.__scene3d && window.__scene3d.postfx;
  cancelAnimationFrame(lookFade);
  if (!pfx || !pfx.look) { document.body.classList.remove('trailer-gpu-look'); return; }
  if (!ms) { pfx.look = 0; document.body.classList.remove('trailer-gpu-look'); return; }
  const t0 = performance.now(), from = pfx.look;
  const step = (now) => {
    const k = Math.min(1, (now - t0) / ms);
    pfx.look = from * (1 - k);
    if (k < 1) lookFade = requestAnimationFrame(step);
    else document.body.classList.remove('trailer-gpu-look');
  };
  lookFade = requestAnimationFrame(step);
}

export function fadeOutTrailer(handOff, atBlack = null) {
  if (!ui) return Promise.resolve();
  document.body.classList.remove('trailer-on');
  if (handOff) {
    fadeLook(1200);
    ui.black.classList.remove('on');
    ui.root.classList.add('handoff');
    return new Promise((res) => setTimeout(() => { ui.root.classList.remove('on'); setTimeout(() => { ui.root.classList.remove('handoff'); res(); }, 450); }, 800));
  }
  ui.black.classList.add('fade');
  return new Promise((res) => setTimeout(() => {
    fadeLook(0);
    if (atBlack) atBlack();
    ui.black.classList.remove('fade');
    ui.black.classList.add('on');
    ui.root.classList.remove('on');
    setTimeout(() => { ui.black.classList.remove('on'); res(); }, 420);
  }, 380));
}

// --- benchmark results ----------------------------------------------------------------

const QUALITY_ORDER = ['laag', 'middel', 'hoog'];
const DRAW_ORDER = ['kort', 'normaal', 'ver'];

function advise(stats) {
  const st = getSettings();
  const qi = QUALITY_ORDER.indexOf(st.quality), di = DRAW_ORDER.indexOf(st.drawDistance);
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  if (stats.avg < 40 || stats.low < 22) {
    if (qi > 0) {
      const q = QUALITY_ORDER[qi - 1];
      const extra = di > 1 ? ` of zichtafstand 'normaal'` : '';
      return { text: `Probeer kwaliteit '${q}'${extra}. Dan loopt Grunn soepeler.`, apply: { quality: q } };
    }
    if (di > 0) {
      const d = DRAW_ORDER[di - 1];
      return { text: `Probeer zichtafstand '${d}'. Dan loopt Grunn soepeler.`, apply: { drawDistance: d } };
    }
    return { text: 'Alles staat al zo licht mogelijk. Sluit andere programma’s en tabbladen voor wat extra lucht.', apply: null };
  }
  if (stats.avg >= 75 && stats.low >= 45 && qi < QUALITY_ORDER.length - 1) {
    const q = QUALITY_ORDER[qi + 1];
    return { text: `Er is ruimte over: probeer kwaliteit '${q}'.`, apply: { quality: q } };
  }
  return { text: `Kwaliteit '${st.quality}' draait prima. ${cap(st.quality) === 'Hoog' ? 'Genieten maar.' : 'Niks aan veranderen.'}`, apply: null };
}

let resultEl = null;

// Shows the results card; resolves with 'again' or 'back'.
export function showBenchmarkResults(stats) {
  if (!resultEl) {
    resultEl = document.createElement('div');
    resultEl.id = 'trailer-result';
    resultEl.setAttribute('role', 'dialog');
    resultEl.setAttribute('aria-modal', 'true');
    resultEl.setAttribute('aria-labelledby', 'tr-res-title');
    resultEl.hidden = true;
    document.body.appendChild(resultEl);
  }
  if (BENCH_RUNS) {
    showBenchmarkResults.runs = (showBenchmarkResults.runs || 0) + 1;
    if (showBenchmarkResults.runs < BENCH_RUNS) return Promise.resolve('again');
    if (window.gteDesktop && window.gteDesktop.isDesktop) setTimeout(() => window.gteDesktop.quit(), 500);
  }
  const st = getSettings();
  const r = Math.round;
  const adv = stats ? advise(stats) : { text: 'Er is niets gemeten. Probeer het nog een keer.', apply: null };
  const meta = `Kwaliteit ${st.quality} · schaduwen ${st.shadows && QUALITY_PRESETS[st.quality].shadows ? 'aan' : 'uit'} · zichtafstand ${st.drawDistance} · ${innerWidth}×${innerHeight}`;
  resultEl.innerHTML = `<div class="tr-res">
    <h2 id="tr-res-title">Benchmark</h2>
    <div class="tr-meta">${meta}</div>
    ${stats ? `<div class="tr-nums"><div><b>${r(stats.avg)}</b><span>fps gemiddeld</span></div><div><b>${r(stats.low)}</b><span>1%-low</span></div></div>
    ${stats.heaviest ? `<p>Zwaarste shot: ${stats.heaviest.label}: ${r(stats.heaviest.fps)} fps</p>` : ''}` : ''}
    <p class="tr-advice">${adv.text}</p>
    <div class="tr-actions">
      <button type="button" class="primary" data-act="apply"${adv.apply ? '' : ' hidden'}>Toepassen</button>
      <button type="button" data-act="again">Nog een keer</button>
      <button type="button"${adv.apply ? '' : ' class="primary"'} data-act="back">Terug</button>
    </div></div>`;
  resultEl.hidden = false;
  const buttons = () => [...resultEl.querySelectorAll('button:not([hidden])')];
  buttons()[0].focus({ preventScroll: true });
  return new Promise((resolve) => {
    const close = (v) => {
      resultEl.hidden = true;
      resultEl.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKey, true);
      resolve(v);
    };
    const act = (a, btn) => {
      if (a === 'apply' && adv.apply) {
        for (const [k, v] of Object.entries(adv.apply)) setSetting(k, v);
        resultEl.querySelector('.tr-advice').textContent = 'Toegepast. Draai de benchmark nog een keer om het verschil te zien.';
        btn.hidden = true;
        buttons()[0].focus({ preventScroll: true });
      } else if (a === 'again' || a === 'back') close(a);
    };
    const onClick = (e) => {
      const b = e.target.closest('button[data-act]');
      if (b) act(b.dataset.act, b);
    };
    const onKey = (e) => {
      const list = buttons();
      const i = list.indexOf(document.activeElement);
      if (e.key === 'Escape' || e.key === 'Backspace') close('back');
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'Tab') list[(i + (e.shiftKey ? -1 : 1) + list.length) % list.length].focus();
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') list[(i - 1 + list.length) % list.length].focus();
      else if (e.key === 'Enter' || e.key === ' ') { if (!e.repeat && i >= 0) act(list[i].dataset.act, list[i]); }
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    resultEl.addEventListener('click', onClick);
    window.addEventListener('keydown', onKey, true);
  });
}
