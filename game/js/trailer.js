import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene, prewarmStreamAt } from './scene3d.js';
import { speakerHtml } from './speakers.js';
import { getSettings, QUALITY_PRESETS, withTempSettings } from './settings.js';
import { PRESET_ORDER, GFX_PRESETS, currentPreset, describePreset, presetLabel, applyPreset, setBenchResult } from './gfxprofile.js';
import { refreshDayNight } from './daynight.js';
import { makeActor, stage, seat, makeBirds, scatterBirds, updateBirds } from './intromontage.js';
import { buildAtm, buildVitrineRoom, buildFlag, waveFlag } from './trailerprops.js';
import { TAMMO_APPEARANCE, ANITA_APPEARANCE, seatPose, seatPerson, seatedY } from './models3d_people.js';
import { JELLE_LOOK, DURK_LOOK, DOUWE_LOOK } from './storycast.js';
import { spawnPedestriansNear, isOnRoad } from './pedestrians.js';
import { KERMIS } from './kermis.js';
import { tractorBodyGeometry, tractorBaseGeometry } from './countrymodels.js';
import { vcMaterial } from './pixelart3d.js';
import { Vehicle, MODELS, spawnHeroCarNear } from './vehicle.js';
import { BOAT_KINDS } from './boattypes.js';
import { scriptHeli, updateSkyProps, helipadInfo } from './skyprops.js';
import { getTrains, placeTrain } from './railway.js';
import { routeAt as canalAt, ROUTE_LENGTH as CANAL_LENGTH } from './rondvaartchase.js';
import { RING_ROUTE } from './ringroute.js';
import { smoothPath, pathHeights, cineDrive, groundPose } from './cinedrive.js';
import { buildPigeonBird, posePigeonBird } from './pigeonmode.js';
import { hidePigeonSpots } from './pigeonspots.js';
import { setPoliceHeliRender } from './police.js';
import { roofAt } from './camerapath.js';
import { kickTheme, setThemeDuck } from './theme.js';
import { probe } from './hitchprobe.js';
import { flashScreen } from './postfx3d.js';
import { logoHtml } from './logo.js';

// Trailer mode: "GDE Groningen - Een zomer in Grunn" (shot list in
// docs/verhaal/E-trailer.md), one list of staged shots through Grunn, played
// three ways:
//   benchmark  the full cut ('vol') in real time with an fps counter
//              (Instellingen > Beeld > Benchmark draaien)
//   opname     ?trailer / desktop --trailer: fixed 1/60 s steps for
//              recordings, no fps counter, the desktop app quits at the end;
//              desktop --trailer-video pipes those frames into an MP4
//   attract    ?attract: the short cut ('kort', ~38 s, with the Anita and
//              Tammo name cards); hold Space to skip; hands its last camera
//              pose over to the title screen
// Each shot forces its own clock and weather. The title screen owns the frame
// loop outside the trailer; while it runs, runTrailer drives the world through
// the title screen's tick/render/relocate.

const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
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
  // no intro before the menu: the title screen's live city is the attract,
  // and Nieuw spel opens with its own trailer-style opening
  return null;
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
#trailer .tr-card .gde-logo { font-size: clamp(110px, 19vw, 230px); text-shadow: none; }
#trailer .tr-title.tr-tagline { margin-top: 10px; font-size: clamp(30px, 4.4vw, 64px); letter-spacing: 0.08em; }
#trailer .tr-radio { font-size: clamp(64px, 11vw, 168px); line-height: 1; color: rgba(240, 237, 228, 0.9); letter-spacing: 0.06em; }
/* name cards over a freeze frame: lower left, like a character intro */
#trailer .tr-freeze { inset: 0; opacity: 0; background: radial-gradient(ellipse at 30% 60%, rgba(255, 196, 120, 0.08), rgba(8, 18, 12, 0.42) 85%); }
#trailer .tr-name { left: 6vw; bottom: calc(var(--bar) + 7vh); max-width: min(70vw, 900px); opacity: 0; text-shadow: 0 3px 24px rgba(0, 0, 0, 0.7), 0 1px 3px rgba(0, 0, 0, 0.85); }
#trailer .tr-name b { display: block; font-weight: normal; font-size: clamp(64px, 10vw, 160px); line-height: 0.88; text-transform: uppercase; letter-spacing: 0.02em; }
#trailer .tr-name b .amp { color: #3fc97a; }
#trailer .tr-name i { display: block; margin-top: 0.5vh; border-left: 4px solid #3fc97a; padding-left: 12px; font: italic clamp(19px, 2vw, 30px) 'Arial Narrow', Arial, sans-serif; letter-spacing: 0.3px; color: #f0ede4; }
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
#trailer-result .tr-advice b { color: #3fc97a; }
#trailer-result .tr-advice small { display: block; margin-top: 2px; font-size: 14px; color: rgba(240, 237, 228, 0.7); }
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
    '<div class="tr-freeze"></div><div class="tr-card"></div><div class="tr-name"></div><div class="tr-sub"></div><div class="tr-bar top"></div><div class="tr-bar bottom"></div>' +
    '<div class="tr-skip"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle class="fill" cx="12" cy="12" r="10"/></svg>' +
    '<span>Houd</span><span class="key">SPATIE</span><span>ingedrukt om over te slaan</span></div>' +
    '<div class="tr-fps"></div>';
  document.body.appendChild(root);
  const q = (s) => root.querySelector(s);
  q('.tr-flash').addEventListener('animationend', (e) => e.target.classList.remove('go', 'big'));
  ui = { root, flash: q('.tr-flash'), card: q('.tr-card'), sub: q('.tr-sub'), skip: q('.tr-skip'), fps: q('.tr-fps'), black: q('.tr-black'), name: q('.tr-name'), freeze: q('.tr-freeze'), cardKey: '', subKey: '', nameKey: '' };
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

// The name card over a freeze frame, driven by trailer time (p = 0..1 from
// the freeze to the end of the shot).
function showName(name, p = 0) {
  const key = name ? name.title : '';
  if (key !== ui.nameKey) {
    ui.nameKey = key;
    if (name) ui.name.innerHTML = `<b>${name.title}</b><i>${name.line}</i>`;
  }
  if (!name) { ui.name.style.opacity = '0'; ui.freeze.style.opacity = '0'; return; }
  const e = 1 - (1 - clamp01(p / 0.25)) ** 3;
  ui.name.style.opacity = String(clamp01(p / 0.12) * (p > 0.9 ? (1 - p) / 0.1 : 1));
  ui.name.style.transform = `translateX(${((1 - e) * -4).toFixed(2)}vw)`;
  ui.freeze.style.opacity = String(clamp01(p / 0.08));
}

function setSub(line) {
  const key = line ? line[2] + line[3] : '';
  if (key === ui.subKey) return;
  ui.subKey = key;
  ui.sub.classList.toggle('on', !!line);
  if (line) ui.sub.innerHTML = speakerHtml(line[2]) + line[3];
}

// --- sound -----------------------------------------------------------------------------

// The title screen has no game audio graph yet (audio.js starts with play):
// the two voice lines are plain media elements, the carbid bang a burst of
// noise. Never in ?stil, and not in a video export (main.js mixes the audio).
const SILENT = Q.has('stil');
const voices = new Set();
function audible() {
  try { if (localStorage.getItem('gte-muted') === '1') return 0; } catch (e) { /* ignore */ }
  const st = getSettings();
  return Math.min(1, (st.masterVolume ?? 1) * (st.voiceVolume ?? 1));
}
function playVoice(key) {
  const v = audible();
  if (SILENT || !v || !TRAILER_VOICE[key]) return;
  const el = new Audio(new URL('../' + TRAILER_VOICE[key], import.meta.url).href);
  el.volume = v;
  voices.add(el);
  el.addEventListener('ended', () => voices.delete(el), { once: true });
  el.play().catch(() => voices.delete(el));
}
function stopVoices() {
  for (const el of voices) { el.pause(); el.src = ''; }
  voices.clear();
}
let sfxCtx = null;
function playSfx(kind) {
  const v = audible() * ((getSettings().sfxVolume ?? 0.75) / (getSettings().voiceVolume || 1));
  if (SILENT || !v || kind !== 'knal') return;
  try {
    sfxCtx = sfxCtx || new AudioContext();
    const c = sfxCtx, n = Math.floor(c.sampleRate * 0.9);
    const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (c.sampleRate * 0.12));
    const src = c.createBufferSource(), lp = c.createBiquadFilter(), g = c.createGain();
    src.buffer = buf; lp.type = 'lowpass'; lp.frequency.value = 900; g.gain.value = 0.9 * Math.min(1, v);
    src.connect(lp); lp.connect(g); g.connect(c.destination);
    src.start();
  } catch (e) { /* no audio */ }
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
export function ringViaduct(map) {
  const n = RING_ROUTE.length, span = 9;
  const zs = RING_ROUTE.map(([x, y]) => map.groundHeightAt(x, y, 40));
  let best = 0, bestZ = -1;
  for (let i = 0; i + span < n; i++) {
    let lo = Infinity;
    for (let k = 0; k <= span; k++) lo = Math.min(lo, zs[i + k]);
    if (lo > bestZ) { bestZ = lo; best = i; }
  }
  const i0 = Math.max(0, best - 4);
  const path = smoothPath(RING_ROUTE.slice(i0, Math.min(n, best + span + 6)));
  return { path, deck: Math.max(0, bestZ), half: RING_ROUTE[best + (span >> 1)][2], zAt: pathHeights(map, path, map.groundHeightAt(RING_ROUTE[i0][0], RING_ROUTE[i0][1], zs[i0] + 0.5)) };
}

// The race shot's pack in three lanes (offset in units of 2.8 m, lag in m
// behind the leader): no two of them overlap while the lags wobble +-0.6 m,
// and Jelle's tractor drives in the middle lane between the last cars.
export const RING_PACK = {
  cars: [[-1, 0], [1, 1.5], [0, 5.5], [-1, 11], [1, 13]],
  tractor: [0, 12.5],
  speed: 31,
  wobble: 0.6,
};
const TRACTOR_HALF = 1.1;

function canalNear(x, y) {
  let best = 0, bd = Infinity;
  for (let s = 0; s < CANAL_LENGTH; s += 6) {
    const q = canalAt(s);
    const d = Math.hypot(q.x - x, q.y - y);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
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

// --- stand-in props ---------------------------------------------------------------------

const PROP_MATS = new Map();
function propMat(color, opts = {}) {
  const k = color + JSON.stringify(opts);
  if (!PROP_MATS.has(k)) PROP_MATS.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...opts }));
  return PROP_MATS.get(k);
}

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const SHIRTS = [0x3f6ea8, 0xc8261e, 0x2f8a4a, 0xe0a526, 0x6a4a8a, 0xe8e4da, 0x2a9ab0, 0xe07ab0, 0x26262a, 0xf2e050];
const SKINS = [0xe2b48c, 0xd9a57c, 0x9a6a4a, 0xc89070, 0xf0c8a8];
function extraApp(i) {
  return { shirt: SHIRTS[i % SHIRTS.length], skin: SKINS[(i * 3) % SKINS.length], variant: i % 2 ? 'female' : 'male', seed: 7300 + i * 13 };
}

const CHAIR = { recline: 0.06, footX: 0.42, footY: -0.42, arms: 'lap' };
const GROUND = { recline: -0.12, footX: 0.8, footY: -0.06, arms: 'lap' };
function sitAt(m, x, y, a, seatTop, spec) {
  stage(m, x, y, a);
  seatPose(m, spec);
  m.userData.seated = true;
  m.position.y = seatedY(m, seatTop);
  m.userData.blob.visible = false;
}

// A terrace: round tables, two chairs each, a parasol per table.
function buildTerrace(spots) {
  const g = new THREE.Group();
  const n = spots.length;
  const inst = (geo, mat, count) => { const m = new THREE.InstancedMesh(geo, mat, count); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  const tops = inst(new THREE.CylinderGeometry(0.38, 0.38, 0.04, 14), propMat(0xe8e4da), n);
  const legs = inst(new THREE.CylinderGeometry(0.04, 0.06, 0.72, 6), propMat(0x2a2a2a, { metalness: 0.5 }), n * 2);
  const chairs = inst(new THREE.BoxGeometry(0.42, 0.06, 0.42), propMat(0x8a5a32), n * 2);
  const backs = inst(new THREE.BoxGeometry(0.06, 0.42, 0.42), propMat(0x8a5a32), n * 2);
  const canopy = inst(new THREE.ConeGeometry(1.35, 0.5, 10, 1, true), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, side: THREE.DoubleSide }), n);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), V = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  const put = (mesh, i, x, h, y, rot = 0) => { Q.setFromAxisAngle(Y, -rot); mesh.setMatrixAt(i, M.compose(V.set(x, h, y), Q, S)); };
  const cols = [0x1f7a44, 0xe8e4da, 0xc8261e, 0x1f7a44, 0xf2c230];
  spots.forEach((s, i) => {
    put(tops, i, s.x, 0.74, s.y);
    put(legs, i * 2, s.x, 0.36, s.y);
    put(legs, i * 2 + 1, s.x, 1.3, s.y);
    put(canopy, i, s.x, 2.05, s.y);
    canopy.setColorAt(i, new THREE.Color(cols[i % cols.length]));
    for (const k of [0, 1]) {
      const a = s.a + k * Math.PI, cx = s.x + Math.cos(a) * 0.62, cy = s.y + Math.sin(a) * 0.62;
      put(chairs, i * 2 + k, cx, 0.44, cy, a);
      put(backs, i * 2 + k, cx + Math.cos(a) * 0.2, 0.68, cy + Math.sin(a) * 0.2, a);
    }
  });
  return g;
}

// Picnic blankets, two barbecues (glowing coals) and a frisbee.
function buildPicnic(spots, grills) {
  const g = new THREE.Group();
  const tex = [['#c8261e', '#f4efe4'], ['#2f5f9a', '#f4efe4'], ['#1f7a44', '#f2c230'], ['#e07ab0', '#ffffff']].map(([a, b]) => canvasTexture(64, 64, (c, w, h) => {
    c.fillStyle = b; c.fillRect(0, 0, w, h);
    c.fillStyle = a; c.globalAlpha = 0.8;
    for (let i = 0; i < 8; i += 2) { c.fillRect(i * 8, 0, 8, h); c.fillRect(0, i * 8, w, 8); }
  }));
  const geo = new THREE.PlaneGeometry(1.9, 1.5).rotateX(-Math.PI / 2);
  spots.forEach((s, i) => {
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex[i % tex.length], roughness: 0.95 }));
    m.position.set(s.x, s.h + 0.03, s.y);
    m.rotation.y = -s.a;
    m.receiveShadow = true;
    g.add(m);
  });
  for (const s of grills) {
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.2, 12), propMat(0x1a1a1a, { metalness: 0.6 }));
    bowl.position.set(s.x, s.h + 0.7, s.y);
    const coals = new THREE.Mesh(new THREE.CircleGeometry(0.27, 12).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff7a2a }));
    coals.position.set(s.x, s.h + 0.81, s.y);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.62, 5), propMat(0x2a2a2a));
    leg.position.set(s.x, s.h + 0.31, s.y);
    g.add(bowl, coals, leg);
  }
  const frisbee = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.12, 0.025, 16), propMat(0xff5a1e, { roughness: 0.4 }));
  frisbee.castShadow = true;
  g.add(frisbee);
  g.userData.frisbee = frisbee;
  return g;
}

function buildCone() {
  const g = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.62, 16), propMat(0xff5a14, { roughness: 0.55 }));
  cone.position.y = 0.34;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.125, 0.09, 16), propMat(0xf4f4f0, { roughness: 0.4 }));
  band.position.y = 0.36;
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.42), propMat(0x1a1a1a));
  base.position.y = 0.02;
  for (const m of [cone, band, base]) { m.castShadow = true; g.add(m); }
  return g;
}

// A kermis bumper car (the shape of kermis.js's), big enough for one twin.
function buildBumperCar() {
  const g = new THREE.Group();
  const body = propMat(0xd8262e, { roughness: 0.35, metalness: 0.4 });
  const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  box(1.5, 0.42, 1.25, body, 0, 0.42, 0);
  box(0.45, 0.5, 1.25, body, 0.55, 0.62, 0);
  box(0.4, 0.45, 1.1, propMat(0x1a1a1a), -0.45, 0.75, 0);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.13, 6, 20).rotateX(Math.PI / 2), propMat(0x111111, { roughness: 0.9 }));
  ring.scale.set(1, 1, 0.82); ring.position.y = 0.28;
  g.add(ring);
  box(0.05, 3.2, 0.05, propMat(0x9aa0a6, { metalness: 0.7 }), -0.62, 2.0, 0);
  return g;
}

// The vet of Grunn: drops sloshing out of the tanker's hatch.
const DROPS = 260;
function buildDrops() {
  const m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 6, 4), new THREE.MeshStandardMaterial({ color: 0xe8b830, roughness: 0.15, metalness: 0.1, emissive: 0x3a2a00, emissiveIntensity: 0.4 }), DROPS);
  m.frustumCulled = false;
  m.count = 0;
  m.userData.p = Array.from({ length: DROPS }, () => ({ x: 0, y: 0, z: -10, vx: 0, vy: 0, vz: 0, s: 1 }));
  m.userData.next = 0;
  return m;
}
const _dm = new THREE.Matrix4(), _dq = new THREE.Quaternion(), _ds = new THREE.Vector3(), _dv = new THREE.Vector3();
function emitDrops(m, n, x, y, z, vx, vy) {
  const P0 = m.userData.p;
  for (let i = 0; i < n; i++) {
    const d = P0[m.userData.next++ % DROPS];
    Object.assign(d, { x: x + (Math.random() - 0.5) * 0.8, y: y + (Math.random() - 0.5) * 0.8, z, vx: vx + (Math.random() - 0.5) * 3, vy: vy + (Math.random() - 0.5) * 3, vz: 1.5 + Math.random() * 3, s: 0.6 + Math.random() * 1.2 });
  }
  m.count = Math.min(DROPS, m.userData.next);
}
function updateDrops(m, dt, floor) {
  const P0 = m.userData.p;
  for (let i = 0; i < m.count; i++) {
    const d = P0[i];
    if (d.z > floor) {
      d.vz -= 9.8 * dt;
      d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
      if (d.z <= floor) { d.z = floor + 0.01; d.vx *= 0.2; d.vy *= 0.2; d.s *= 1.8; }
    }
    _ds.set(d.s, d.z <= floor + 0.02 ? 0.12 * d.s : d.s, d.s);
    m.setMatrixAt(i, _dm.compose(_dv.set(d.x, d.z, d.y), _dq, _ds));
  }
  m.instanceMatrix.needsUpdate = true;
}

// A milk churn on a trestle with carbid: the lid goes off with a bang.
function buildChurn() {
  const g = new THREE.Group();
  const steel = propMat(0xc8ced2, { roughness: 0.38, metalness: 0.35 });
  const churn = new THREE.Group();
  churn.position.set(0, 0.98, 0);
  churn.rotation.z = Math.PI / 2 - 0.12;
  g.add(churn);
  churn.add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.78, 16), steel));
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.19, 0.14, 16), steel);
  neck.position.y = 0.45;
  churn.add(neck);
  const lid = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 8), propMat(0xd02a1e, { roughness: 0.5 }));
  lid.scale.set(1, 0.6, 1);
  g.add(lid);
  for (const x of [-0.25, 0.25]) for (const z of [-0.18, 0.18]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.06), propMat(0x6a4a2a));
    leg.position.set(x, 0.45, z);
    g.add(leg);
  }
  const smoke = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), new THREE.MeshBasicMaterial({ color: 0xe8e4dc, transparent: true, opacity: 0, depthWrite: false }));
  g.add(smoke);
  g.traverse((o) => { if (o.isMesh && o !== smoke) o.castShadow = true; });
  g.userData = { lid, smoke };
  return g;
}

function buildTractor() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(tractorBodyGeometry(), vcMaterial({ roughness: 0.8, color: 0x3f7d3a })));
  g.add(new THREE.Mesh(tractorBaseGeometry(), vcMaterial({ roughness: 0.85 })));
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

function noteCard(text) {
  const tex = canvasTexture(256, 160, (c, w, h) => {
    c.fillStyle = '#f7f2e4'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1f2a6a';
    c.font = 'italic bold 52px "Brush Script MT", "Segoe Script", cursive';
    c.textAlign = 'center';
    c.fillText(text, w / 2, h / 2 + 10);
    c.font = 'italic 26px Georgia, serif';
    c.fillText('– W.', w * 0.72, h - 22);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.125), new THREE.MeshBasicMaterial({ map: tex }));
  return m;
}

// Nearest building face from a street point, sideways to the heading a.
function wallBeside(map, x, y, a) {
  const nx = -Math.sin(a), ny = Math.cos(a);
  for (let d = 1; d <= 16; d += 0.25) {
    for (const s of [1, -1]) {
      if (roofAt(map, x + nx * d * s, y + ny * d * s)) return { x: x + nx * (d - 0.25) * s, y: y + ny * (d - 0.25) * s, out: Math.atan2(-ny * s, -nx * s) };
    }
  }
  return { x: x + nx * 4, y: y + ny * 4, out: Math.atan2(-ny, -nx) };
}

// --- shots ---------------------------------------------------------------------------

// The two spoken lines, voiced by scripts/tts_trailer.py. Paths relative to
// the game dir: the desktop video export mixes the same files.
export const TRAILER_VOICE = {
  rikus: 'audio/voicelines/trailer/rikus_augustus.mp3',
  berend: 'audio/voicelines/trailer/berend_kon_minder.mp3',
};

// Shot fields: label (benchmark results), cuts ('vol' and/or 'kort'), dur
// (seconds in the full cut; kort: its shorter length, same motion faster),
// clock/clockTo, weather, focus (where the world streams and populates),
// caps [[at, dur, title, kicker?, cuts?, html?]], lines [[at, dur, who, text]],
// voice [[at, key]] (TRAILER_VOICE), sfx [[at, kind]], name {at, title, line}
// (a name card over a freeze frame from freezeAt on), preTheme (before the
// theme song starts), duck (theme ducked), thumb (seconds in: the video
// export's thumbnail), prep(r) (builds props during the opening black),
// enter/tick/exit(r, s), cam(u, t, s) -> {position, lookAt, fov}.
function buildShots(w) {
  const map = w.map;
  const tower = landmark(w, 'Martinitoren', 214, 13);
  const vis = landmark(w, 'Vismarkt', 13, 254);
  const forum = landmark(w, 'Forum Groningen', 356, 63);
  const museum = landmark(w, 'Groninger Museum', 70.9, 798.3);
  const park = landmark(w, 'Noorderplantsoen', 133, -719);
  const square = { x: 172, y: 56 };
  const gz = (x, y, hint = 0) => { const z = map.groundHeightAt ? map.groundHeightAt(x, y, hint) : 0; return Number.isFinite(z) ? z : 0; };
  const lane = (road, s, off) => {
    const q = road.at(s);
    return { x: q.x - Math.sin(q.a) * off, y: q.y + Math.cos(q.a) * off, a: q.a };
  };
  const extra = (r, i) => r.prop('extra' + i, () => makeActor(extraApp(i)));
  const cast = (r, name, app) => r.prop(name, () => makeActor(app));

  const radio = {
    label: 'Radio', black: true, preTheme: true, cuts: ['vol', 'kort'], dur: 4.0, kort: 3.2,
    voice: [[0.05, 'rikus']],
    lines: [[0.9, 3.1, 'Rikus', 'Augustus. In Grunn heet dat zomer.']],
    caps: [[0.25, 3.6, null, null, null, '<div class="tr-kicker">Radio Nachtstreek</div><div class="tr-radio">06:12</div>']],
  };

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

  // terraces along the square, pigeons in front of the camera
  const vm = openSpot(map, vis.x, vis.y, 20);
  const vmA = -0.55;
  const vf = { x: Math.cos(vmA), y: Math.sin(vmA) }, vn = { x: -vf.y, y: vf.x };
  // terrace tables on the square only: never on a road or cycle path (the
  // Vismarkt has a street through it), nearest the dolly line first
  const tables = [];
  for (let i = 0; i < 8; i++) {
    for (const off of [-3.6, 3.6, -6.4, 6.4, -9.2, 9.2]) {
      const x = vm.x + vf.x * (i * 2.9 - 7) + vn.x * off, y = vm.y + vf.y * (i * 2.9 - 7) + vn.y * off;
      if (!roofAt(map, x, y) && !roofAt(map, x + 1.4, y) && !roofAt(map, x, y + 1.4) && !roofAt(map, x - 1.4, y) && !roofAt(map, x, y - 1.4) && !isOnRoad(map, x, y, 1.6)) tables.push({ x, y, a: vmA + Math.PI / 2, d: Math.abs(off) });
    }
  }
  tables.sort((a, b) => a.d - b.d);
  tables.length = Math.min(tables.length, 12);
  const vismarkt = {
    label: 'Terrassen op de Vismarkt', cuts: ['vol', 'kort'], dur: 4.0, kort: 2.6, clock: 13.2, weather: 'helder', focus: vm,
    caps: [[0.6, 3.0, 'Een zomer.']],
    prep(r) { r.prop('terrace', () => buildTerrace(tables)); for (let i = 0; i < 16; i++) extra(r, i); },
    enter(r, s) {
      r.prop('terrace', () => buildTerrace(tables));
      clearAround(r, vm, 70);
      s.birds = makeBirds(r.group, vm.x + vf.x * 4, vm.y + vf.y * 4, 5.5, 72, { avoid: 7 });
      s.gone = false;
      s.extraPeds = spawnPedestriansNear(map, vm.x, vm.y, 30, Math.random);
      r.w.pedestrians.push(...s.extraPeds);
    },
    tick(r, s, t, dt) {
      tables.slice(0, 8).forEach((tb, i) => {
        if (tb.d > 7) return;
        for (const k of [0, 1]) {
          const a = tb.a + k * Math.PI, m = extra(r, i * 2 + k);
          sitAt(m, tb.x + Math.cos(a) * 0.62, tb.y + Math.sin(a) * 0.62, a + Math.PI, 0.47, CHAIR);
          if (k === 0 && i % 3 === 1) m.userData.armR.rotation.z = 1.4 + Math.sin(t * 2 + i) * 0.15;
        }
      });
      if (!s.gone && t > 1.2) { s.gone = true; scatterBirds(s.birds, vm.x - vf.x * 6, vm.y - vf.y * 6); }
      updateBirds(s.birds, dt, t);
    },
    exit(r, s) { const set = new Set(s.extraPeds || []); r.w.pedestrians = r.w.pedestrians.filter((p) => !set.has(p)); },
    cam(u) {
      const d = lerp(-11, -4, smooth(u));
      const p = P(vm.x + vf.x * d + vn.x * 0.4, vm.y + vf.y * d + vn.y * 0.4, lerp(0.75, 1.15, u));
      return { position: p, lookAt: P(vm.x + vf.x * (d + 9), vm.y + vf.y * (d + 9), lerp(1.0, 2.4, smooth((u - 0.3) / 0.7))), fov: 48, shake: 0.03 };
    },
  };

  // blankets on the lawn, a barbecue, a frisbee between two of them
  // an open lawn in the Noorderplantsoen: 30+ m from any road, path or
  // water, no building within 16 m
  const pk = openSpot(map, park.x - 153, park.y + 51, 10);
  const pz = gz(pk.x, pk.y);
  const pa = Math.PI / 2, pf = { x: Math.cos(pa), y: Math.sin(pa) }, pn = { x: -pf.y, y: pf.x };
  const pAt = (f, n) => ({ x: pk.x + pf.x * f + pn.x * n, y: pk.y + pf.y * f + pn.y * n });
  const blankets = [[-7, 3], [-3, 5.5], [1.5, 3.2], [5, 6], [9, 3.5], [-5, 9], [3, 10]].map(([f, n], i) => ({ ...pAt(f, n), a: pa + i * 0.7, h: pz }));
  const grills = [pAt(-1, 7.4), pAt(7, 8.5)].map((q) => ({ ...q, h: pz }));
  const thrower = pAt(-4, 1), catcher = pAt(6, 0.5);
  const plantsoen = {
    label: 'Noorderplantsoen', cuts: ['vol'], dur: 3.0, clock: 15.4, weather: 'helder', focus: pk,
    prep(r) { r.prop('picnic', () => buildPicnic(blankets, grills)); for (let i = 16; i < 28; i++) extra(r, i); },
    enter(r, s) {
      s.g = r.prop('picnic', () => buildPicnic(blankets, grills));
      clearAround(r, pk, 60);
      s.extraPeds = spawnPedestriansNear(map, pk.x, pk.y, 25, Math.random);
      r.w.pedestrians.push(...s.extraPeds);
    },
    tick(r, s, t, dt) {
      blankets.forEach((b, i) => {
        for (const k of [0, 1]) {
          if (i >= 5 && k) continue;
          const m = extra(r, 16 + i * 2 + k);
          const off = k ? -0.45 : 0.45;
          sitAt(m, b.x + Math.cos(b.a + Math.PI / 2) * off, b.y + Math.sin(b.a + Math.PI / 2) * off, b.a + (k ? Math.PI : 0), pz + 0.08, GROUND);
        }
      });
      const fa = Math.atan2(catcher.y - thrower.y, catcher.x - thrower.x);
      stage(extra(r, 28), thrower.x, thrower.y, fa, { h: pz, pose: 'throw', dt, t });
      stage(extra(r, 29), catcher.x, catcher.y, fa + Math.PI, { h: pz, pose: 'hips', dt, t });
      const k = (t * 0.55) % 1;
      const fr = s.g.userData.frisbee;
      fr.position.set(lerp(thrower.x, catcher.x, k), pz + 1.5 + Math.sin(k * Math.PI) * 1.4, lerp(thrower.y, catcher.y, k));
      fr.rotation.set(0.15, t * 18, 0.1);
    },
    exit(r, s) { const set = new Set(s.extraPeds || []); r.w.pedestrians = r.w.pedestrians.filter((p) => !set.has(p)); },
    cam(u) {
      const f = lerp(-12, 4, u);
      const c = pAt(f, -9);
      return { position: P(c.x, c.y, pz + 2.6), lookAt: P(c.x + pn.x * 14 + pf.x * 2, c.y + pn.y * 14 + pf.y * 2, pz + 0.9), fov: 50, shake: 0.03 };
    },
  };

  // the Herestraat in the morning
  const here = polyline([[214, 398], [217, 403], [222, 413], [230, 430], [232, 438], [235, 446], [247, 476], [250, 483], [252, 490], [252, 494], [264, 554], [266, 570], [270, 591], [273, 602]]);
  const hq = here.at(40);
  const hf = { x: Math.cos(hq.a), y: Math.sin(hq.a) }, hn = { x: -hf.y, y: hf.x };
  const anita = {
    label: 'Anita', cuts: ['vol', 'kort'], dur: 3.0, clock: 8.1, weather: 'helder', focus: hq,
    freezeAt: 1.55, name: { at: 1.55, title: 'Anita', line: 'Heeft altijd een plan B. Plan A is ook van haar.' },
    enter(r, s) {
      clearRoad(r, here, 6);
      s.atm = r.prop('atm', buildAtm);
      s.d = 0;
    },
    tick(r, s, t, dt) {
      s.d += 1.7 * dt;
      const q = { x: hq.x + hf.x * s.d + hn.x * 0.8, y: hq.y + hf.y * s.d + hn.y * 0.8 };
      // she pushes the machine on its sack truck ahead of her, hands on the handles
      stage(r.actor('anita'), q.x, q.y, hq.a, { speed: 1.7, pose: t > 1.1 ? 'lookR' : null, dt, t });
      const ud = r.actor('anita').userData;
      ud.armL.rotation.set(-0.12, 0, 1.0); ud.elbowL.rotation.z = 0.45;
      ud.armR.rotation.set(0.12, 0, 1.0); ud.elbowR.rotation.z = 0.45;
      s.atm.position.set(q.x + hf.x * 0.95, gz(q.x, q.y), q.y + hf.y * 0.95);
      s.atm.rotation.set(0, -hq.a, 0.32);
      s.q = q;
    },
    cam(u, t, s) {
      // three-quarter front, wide enough of the machine to see her behind it
      const q = s.q, d = lerp(4.6, 3.8, smooth(u));
      return { position: P(q.x + hf.x * d - hn.x * 3.6, q.y + hf.y * d - hn.y * 3.6, 1.35), lookAt: P(q.x + hf.x * 0.3, q.y + hf.y * 0.3, 1.2), fov: 46, shake: 0.03 };
    },
  };

  const dq = here.at(24);
  const door = wallBeside(map, dq.x, dq.y, dq.a);
  const dOut = { x: Math.cos(door.out), y: Math.sin(door.out) }, dSide = { x: -dOut.y, y: dOut.x };
  const tammo = {
    label: 'Tammo', cuts: ['vol', 'kort'], dur: 3.0, clock: 8.4, weather: 'helder', focus: door,
    freezeAt: 1.35, name: { at: 1.35, title: 'Tammo', line: 'Stadjer. Groot hart. Kleine portemonnee.' },
    prep(r) { r.prop('door', () => buildDoor()); },
    enter(r, s) {
      s.door = r.prop('door', () => buildDoor());
      const h = gz(door.x, door.y);
      s.door.position.set(door.x + dSide.x * 0.5, h, door.y + dSide.y * 0.5);
      s.door.rotation.set(0, -(door.out - Math.PI / 2), 0);
      s.h = h;
    },
    tick(r, s, t, dt) {
      s.door.userData.leaf.rotation.y = -lerp(0.3, 1.45, smooth(t / 1.1));
      const m = r.actor('tammo');
      const p = { x: door.x + dOut.x * 0.55 + dSide.x * 0.05, y: door.y + dOut.y * 0.55 + dSide.y * 0.05 };
      stage(m, p.x, p.y, door.out, { h: s.h, dt, t });
      const ud = m.userData;
      ud.armR.rotation.set(-0.6, 0, 1.15); ud.elbowR.rotation.z = 0.25;
      ud.head.rotation.y = lerp(0, -0.55, smooth((t - 0.5) / 0.6));
      ud.head.rotation.z = -0.08;
    },
    cam(u) {
      const c = { x: door.x + dOut.x * 3.1 + dSide.x * 1.1, y: door.y + dOut.y * 3.1 + dSide.y * 1.1 };
      return { position: P(c.x, c.y, lerp(1.7, 1.62, u)), lookAt: P(door.x + dOut.x * 0.55, door.y + dOut.y * 0.55, 1.55), fov: lerp(36, 30, smooth(u)), shake: 0.015 };
    },
  };

  const escapade = {
    label: 'De Escapade in de Herestraat', cuts: ['vol', 'kort'], dur: 4.0, kort: 3.0, clock: 10.5, weather: 'helder', focus: lane(here, 90, 0),
    caps: [[0.4, 3.2, 'Eén droom op vier wielen.']],
    enter(r, s) {
      clearRoad(r, here, 7);
      const q = lane(here, 20, 0);
      s.car = tempCar(r, q.x, q.y, q.a, { hero: true });
      s.d = 20;
    },
    tick(r, s, t, dt) {
      const v = t < 1.6 ? 9 : 17;
      s.d += v * dt;
      const q = lane(here, s.d, 0.2);
      if (s.car) {
        Object.assign(s.car, { x: q.x, y: q.y, angle: q.a, speed: v });
        seat(r.actor('tammo'), s.car, true);
        seat(r.actor('anita'), s.car, false);
      }
      s.q = q;
    },
    cams: [
      [1.8, (u, t, s) => {
        const q = s.q, f = Math.cos(q.a), g = Math.sin(q.a), d = lerp(3.6, 6.5, smooth(u));
        return { position: P(q.x + f * d - g * 0.5, q.y + g * d + f * 0.5, lerp(1.2, 1.6, u)), lookAt: P(q.x, q.y, 1.0), fov: lerp(36, 46, u), shake: 0.03 };
      }],
      [2.2, (u, t, s) => {
        const q = s.q, f = Math.cos(q.a), g = Math.sin(q.a);
        return { position: P(q.x - f * 4.6 + g * 0.6, q.y - g * 4.6 - f * 0.6, 0.5), lookAt: P(q.x + f * 6, q.y + g * 6, 0.9), fov: 58, shake: 0.08 };
      }],
    ],
  };

  // Jelle up through the roof of his trekker-limo, the low sun behind him
  const fjordRoad = polyline([[309, 685], [326, 722], [341, 755], [351, 778], [358, 794], [360, 798], [387, 864], [412, 943], [413, 948], [424, 979], [440, 1026], [452, 1064]]);
  const LIMO = { ...MODELS[0], name: 'trekkerlimo', len: 5.6, wid: 2.0, color: '#0d0d0f' };
  const jelle = {
    label: 'Jelle Terpstra', cuts: ['vol'], dur: 4.0, clock: 18.9, weather: 'helder', focus: lane(fjordRoad, 70, 2),
    slow: () => 0.45, freezeAt: 2.3, name: { at: 2.3, title: 'Jelle Terpstra', line: 'Snackkoning. Fries. Heel tevreden met zichzelf.' },
    prep(r) { cast(r, 'jelle', JELLE_LOOK); r.prop('flagL', buildFlag); r.prop('flagR', buildFlag); },
    enter(r, s) {
      clearRoad(r, fjordRoad, 9);
      s.d = 95;
      const q = lane(fjordRoad, s.d, 2);
      s.car = tempCar(r, q.x, q.y, q.a + Math.PI, { model: LIMO });
      s.flags = [r.prop('flagL', buildFlag), r.prop('flagR', buildFlag)];
      for (const f of s.flags) f.scale.setScalar(0.45);
    },
    tick(r, s, t, dt) {
      s.d -= 6 * dt;
      const q = lane(fjordRoad, s.d, 2), a = q.a + Math.PI;
      Object.assign(s.car, { x: q.x, y: q.y, angle: a, speed: 6 });
      const f = { x: Math.cos(a), y: Math.sin(a) }, n = { x: -f.y, y: f.x };
      const m = cast(r, 'jelle', JELLE_LOOK);
      // up through the limousine's roof, behind the tractor cab
      stage(m, q.x - f.x * 1.7, q.y - f.y * 1.7, a, { h: 1.05, pose: t > 0.6 ? 'hips' : null, dt, t });
      m.userData.blob.visible = false;
      m.userData.head.rotation.y = 0.15;
      s.flags.forEach((fl, i) => {
        const sd = i ? -0.85 : 0.85;
        fl.position.set(q.x + f.x * 2.6 + n.x * sd, 0.9, q.y + f.y * 2.6 + n.y * sd);
        fl.rotation.y = -(a + Math.PI);
        waveFlag(fl, t * 2);
      });
      s.q = q; s.a = a;
    },
    cam(u, t, s) {
      const q = s.q, f = Math.cos(s.a), g = Math.sin(s.a);
      // low at the kerb, three-quarter front: Jelle clear of the tractor cab
      return { position: P(q.x + f * lerp(3.5, 2.5, u) + g * 7, q.y + g * lerp(3.5, 2.5, u) - f * 7, 0.6), lookAt: P(q.x - f * 1.2, q.y - g * 1.2, 2.1), fov: 50, shake: 0.02 };
    },
  };

  // Durk and Douwe in one bumper car, under the kermis tent
  const kc = { x: 168, y: 110 };
  const twins = {
    label: 'Durk & Douwe', cuts: ['vol'], dur: 3.2, clock: 16.6, weather: 'helder', focus: kc,
    freezeAt: 1.9, name: { at: 1.9, title: 'Durk <span class="amp">&amp;</span> Douwe', line: 'Twee reuzen. Eén brein.' },
    prep(r) { cast(r, 'durk', DURK_LOOK); cast(r, 'douwe', DOUWE_LOOK); r.prop('botsauto', buildBumperCar); },
    enter(r, s) { s.car = r.prop('botsauto', buildBumperCar); kermisTick(r.w, 1); },
    tick(r, s, t, dt) {
      kermisTick(r.w, dt);
      const a = 0.35 + Math.sin(t * 0.8) * 0.04;
      const cx = kc.x + Math.sin(t * 0.7) * 0.15, cy = kc.y;
      s.car.position.set(cx, 0.12, cy);
      s.car.rotation.y = -a;
      const f = { x: Math.cos(a), y: Math.sin(a) }, n = { x: -f.y, y: f.x };
      ['durk', 'douwe'].forEach((who, i) => {
        const m = cast(r, who, who === 'durk' ? DURK_LOOK : DOUWE_LOOK);
        const sd = i ? -0.33 : 0.33;
        stage(m, cx - f.x * 0.3 + n.x * sd, cy - f.y * 0.3 + n.y * sd, a);
        seatPerson(m, i === 0);
        m.userData.seated = true;
        m.position.y = seatedY(m, 0.62);
        m.userData.blob.visible = false;
        m.userData.head.rotation.y = 0;
        m.userData.chest.rotation.y = (i ? 1 : -1) * 0.08;
      });
    },
    exit(r) { kermisTick(r.w, 1, true); },
    cam(u) {
      const a = 0.35;
      return { position: P(kc.x + Math.cos(a) * 4.4, kc.y + Math.sin(a) * 4.4, 1.55), lookAt: P(kc.x, kc.y, 1.35), fov: 40, shake: 0.0 };
    },
  };

  const pigeon = {
    label: 'Duif langs de Martinitoren', cuts: ['vol'], dur: 3.4, clock: 16.2, weather: 'helder', focus: tower,
    caps: [[0.5, 2.6, 'Kieken van boven.']],
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

  // the museum at night: the case is empty, a thank-you card on the cushion
  const vitrine = {
    label: 'De lege vitrine', cuts: ['vol'], dur: 4.0, clock: 23.4, weather: 'helder', focus: museum,
    prep(r) { vitrineRoom(r); },
    enter(r, s) {
      s.room = vitrineRoom(r);
      s.at = { x: museum.x, y: museum.y, z: 300 };
      s.room.position.set(s.at.x, s.at.z, s.at.y);
    },
    cam(u, t, s) {
      const c = s.at, k = smooth(u), a = 0.7, R = lerp(3.6, 1.55, k);
      return { position: P(c.x + Math.cos(a) * R, c.y + Math.sin(a) * R, c.z + lerp(1.9, 1.55, k)), lookAt: P(c.x, c.y, c.z + lerp(1.3, 1.22, k)), fov: lerp(40, 30, k), shake: 0.006 };
    },
  };

  const chaseRoad = polyline([[407, 375], [401, 381], [394, 387], [381, 396], [362, 409], [325, 430], [320, 433], [311, 439], [295, 449], [280, 458], [266, 467], [257, 472], [253, 473], [247, 476], [239, 479], [223, 485], [205, 491], [186, 499], [182, 500], [98, 536], [95, 537], [88, 540], [81, 542], [73, 544], [66, 546], [58, 547], [50, 547], [35, 547]]);
  const chase = {
    label: 'Achtervolging door de binnenstad', cuts: ['vol', 'kort'], dur: 4.2, kort: 3.0, clock: 21.6, weather: 'motregen',
    focus: chaseRoad.at(150),
    caps: [[0.4, 2.2, 'Lange avonden.']],
    enter(r, s) {
      clearRoad(r, chaseRoad, 9);
      s.d = 40;
      const q = lane(chaseRoad, s.d, 1.8);
      s.car = tempCar(r, q.x, q.y, q.a, { model: MODELS[3 % MODELS.length] });
      s.cops = [0, 1, 2].map(() => tempCar(r, q.x, q.y, q.a, { police: true }));
      for (const c of s.cops) c.sirenOn = true;
      s.h = { x: q.x, y: q.y, z: 38, angle: q.a, spotX: q.x, spotY: q.y, spotOn: true, spotK: 1 };
      r.w.policeHeli = s.h;
      setPoliceHeliRender(s.h);
    },
    tick(r, s, t, dt) {
      const v = 24;
      s.d += v * dt;
      const put = (car, d, off) => { const q = lane(chaseRoad, d, off); Object.assign(car, { x: q.x, y: q.y, angle: q.a + Math.sin(t * 2 + off) * 0.03, speed: v }); };
      put(s.car, s.d, 1.8 + Math.sin(t * 1.4) * 0.6);
      s.cops.forEach((c, i) => put(c, s.d - 7 - i * 6.5, (i % 2 ? 0.2 : 2.6) + Math.sin(t * 2 + i) * 0.4));
      s.q = lane(chaseRoad, s.d, 1.8);
      const hq2 = lane(chaseRoad, s.d - 26, -8);
      Object.assign(s.h, { x: hq2.x, y: hq2.y, angle: hq2.a, spotX: s.car.x, spotY: s.car.y });
    },
    exit(r) { r.w.policeHeli = null; setPoliceHeliRender(null); },
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

  const ring = ringViaduct(map);
  const ringS = ring.path.len * 0.25;
  const race = {
    label: 'Race op de ringweg', cuts: ['vol', 'kort'], dur: 4.0, kort: 3.0, clock: 12.8, weather: 'helder', focus: ring.path.at(ringS + 60),
    caps: [[0.3, 2.6, 'Ring Zuid. Laatste fase.']],
    prep(r) { r.prop('tractor', buildTractor); },
    enter(r, s) {
      clearRoad(r, ring.path, 14);
      s.d = ringS;
      // a staggered pack: side by side the far cars hid behind the near ones
      const k = Math.min(1, (ring.half - 1.2) / 3) * 2.8;
      s.cars = RING_PACK.cars.map(([lane, lag], i) => ({ off: lane * k, lag, v: tempCar(r, 0, 0, 0, { model: MODELS[(i * 3 + 1) % MODELS.length] }) }));
      s.tractor = r.prop('tractor', buildTractor);
      s.tractor.rotation.order = 'YZX';
      s.tOff = RING_PACK.tractor[0] * k;
    },
    tick(r, s, t, dt) {
      const v = RING_PACK.speed;
      s.d += v * dt;
      s.q = lane(ring.path, s.d, 0);
      for (const c of s.cars) {
        const d = s.d - c.lag - Math.sin(t * 0.9 + c.lag) * RING_PACK.wobble;
        cineDrive(c.v, map, lane(ring.path, d, c.off), v, dt, ring.zAt(d));
      }
      const td = s.d - RING_PACK.tractor[1];
      const tq = lane(ring.path, td, s.tOff);
      const g = groundPose(map, tq.x, tq.y, tq.a, ring.zAt(td), TRACTOR_HALF);
      s.tractor.position.set(tq.x, g.z + Math.abs(Math.sin(t * 9)) * 0.04, tq.y);
      s.tractor.rotation.set(Math.sin(t * 7) * 0.02, -tq.a, g.pitch);
    },
    cam(u, t, s) {
      const q = s.q, f = Math.cos(q.a), g = Math.sin(q.a);
      // long lens: the pack stays compact and the cars at the back stay readable
      const ahead = lerp(30, 19, u), side = ring.half + lerp(3.5, 1.5, u);
      return { position: P(q.x + f * ahead - g * side, q.y + g * ahead + f * side, ring.deck + lerp(6.5, 4.2, u)), lookAt: P(q.x - f * 6, q.y - g * 6, ring.deck + 0.6), fov: 36, shake: 0.08 };
    },
  };

  // a cone the pack left behind, still bouncing
  const coneAt = lane(ring.path, ringS + 70, 0.6);
  const bijna = {
    label: 'Bijna', cuts: ['vol'], dur: 1.3, clock: 12.9, weather: 'helder', focus: coneAt,
    caps: [[0.1, 1.15, 'Bijna.']],
    prep(r) { r.prop('cone', buildCone); },
    enter(r, s) { s.cone = r.prop('cone', buildCone); s.z0 = map.groundHeightAt(coneAt.x, coneAt.y, ring.deck + 0.5); },
    tick(r, s, t) {
      const ph = t % 0.62, hop = 4 * ph * (0.62 - ph) * (1.2 - t * 0.5);
      s.cone.position.set(coneAt.x + t * 1.1 * Math.cos(coneAt.a), s.z0 + Math.max(0, hop), coneAt.y + t * 1.1 * Math.sin(coneAt.a));
      s.cone.rotation.set(t * 3.1, 0.4, 1.2 + t * 4.2);
    },
    cam(u) {
      const f = Math.cos(coneAt.a), g = Math.sin(coneAt.a), z = map.groundHeightAt(coneAt.x, coneAt.y, ring.deck + 0.5);
      return { position: P(coneAt.x - g * 2.4 + f * 0.4, coneAt.y + f * 2.4 + g * 0.4, z + 0.35), lookAt: P(coneAt.x + f * 0.8, coneAt.y + g * 0.8, z + 0.35), fov: 44, shake: 0.03 };
    },
  };

  // the Us Mem Vet tanker on the Europaweg, sliding, the fat sloshing out
  const euro = polyline([[1113, 424], [1118, 430], [1122, 436], [1130, 447], [1137, 456], [1140, 460], [1143, 464], [1171, 496], [1197, 524], [1224, 551], [1277, 605], [1307, 635]]);
  const TANKER = { name: 'truck', tank: true, len: 7.2, wid: 2.35, maxSpeed: 24, accel: 4.5, brake: 14, turnRate: 1.5, color: '#e6c21a' };
  const tanker = {
    label: 'Tankwagen op de Europaweg', cuts: ['vol'], dur: 4.0, clock: 17.6, weather: 'helder', focus: lane(euro, 130, 0),
    caps: [[0.9, 2.8, 'Al het vet van Grunn.']],
    slow: (t) => (t < 0.8 ? 1 : 0.4),
    enter(r, s) {
      clearRoad(r, euro, 10);
      s.d = s.d0 = 95;
      const q = lane(euro, s.d, 1.5);
      s.truck = tempCar(r, q.x, q.y, q.a, { model: TANKER });
      for (let d = 95; d <= 185; d += 15) clearAround(r, lane(euro, d, 0), 26, s.truck);
      s.drops = r.prop('drops', buildDrops);
      s.drops.count = 0; s.drops.userData.next = 0;
    },
    tick(r, s, t, dt) {
      const v = 19;
      s.d += v * dt;
      const yaw = smooth((t - 0.4) / 1.6) * 0.55;
      const q = lane(euro, s.d, 1.5 + yaw * 3);
      const a = q.a + yaw;
      Object.assign(s.truck, { x: q.x, y: q.y, angle: a, speed: v });
      const z = gz(q.x, q.y);
      // the fat sloshes out of the hatches over the outside of the slide
      if (t > 0.5) for (const off of [-1.8, 0.2]) emitDrops(s.drops, 3, q.x + Math.cos(a) * off + Math.sin(a) * 0.9, q.y + Math.sin(a) * off - Math.cos(a) * 0.9, z + 2.7, Math.cos(q.a) * v * 0.85 + Math.sin(a) * 3.5, Math.sin(q.a) * v * 0.85 - Math.cos(a) * 3.5);
      updateDrops(s.drops, dt, z + 0.02);
      s.q = q; s.a = a;
    },
    cam(u, t, s) {
      const q = s.q, f = Math.cos(q.a), g = Math.sin(q.a);
      // low on the cleared road ahead (the other lane): it slides towards us
      const c = lane(euro, s.d0 + 64, -3.2);
      return { position: P(c.x, c.y, gz(c.x, c.y) + 0.7), lookAt: P(q.x, q.y, 1.6), fov: 46, shake: 0.06 };
    },
  };

  const fromSouth = openSpot(map, forum.x + 18, forum.y + 125, 30);
  const storm = {
    label: 'Storm boven het Forum', cuts: ['vol', 'kort'], dur: 4.0, kort: 3.0, clock: 16.8, weather: 'storm', focus: { x: forum.x, y: forum.y + 60 },
    caps: [[0.6, 2.9, 'Zomer? Ja.', 'Onweer boven de Kiekdeuse']],
    flashes: [0.05, 1.9, 3.3],
    tick(r, s, t) {
      for (const f of this.flashes) if (!s['f' + f] && t >= f) { s['f' + f] = true; flash(true); }
    },
    cam(u) {
      return { position: P(fromSouth.x, fromSouth.y, lerp(24, 27, u)), lookAt: P(forum.x, forum.y, 24), fov: 60, shake: 0.05 };
    },
  };

  // evening light on the Diepenring, Tammo and Anita at the rail
  const sBoat0 = canalNear(455, -51) - 30;
  const boat = {
    label: 'Rondvaartboot op de Diepenring', cuts: ['vol', 'kort'], dur: 4.0, kort: 3.0, clock: 18.4, weather: 'helder', focus: canalAt(sBoat0 + 10),
    duck: true,
    enter(r, s) {
      const q = canalAt(sBoat0);
      s.boat = tempCar(r, q.x, q.y, q.a, { model: BOAT_KINDS.rondvaart, boat: true });
      s.d = sBoat0;
    },
    tick(r, s, t, dt) {
      s.d += 3.4 * dt;
      const q = canalAt(s.d);
      Object.assign(s.boat, { x: q.x, y: q.y, angle: q.a, speed: 3.4 });
      const f = { x: Math.cos(q.a), y: Math.sin(q.a) }, n = { x: -f.y, y: f.x };
      const hw = (s.boat.model.wid || 3) / 2 - 0.45;
      stage(r.actor('tammo'), q.x - f.x * 1.6 + n.x * hw, q.y - f.y * 1.6 + n.y * hw, q.a + Math.PI / 2, { h: 0.55, pose: 'lean', dt, t });
      stage(r.actor('anita'), q.x - f.x * 0.9 + n.x * hw, q.y - f.y * 0.9 + n.y * hw, q.a + Math.PI / 2 + 0.2, { h: 0.55, pose: 'lookR', dt, t });
    },
    cam(u, t, s) {
      // down from the drone height onto the water astern (the quays are
      // built up), ending on the two at the rail
      const b = s.boat, f = Math.cos(b.angle), g = Math.sin(b.angle), k = smooth(u * 1.4);
      const back = lerp(26, 7.5, k), side = lerp(10, 1.2, k);
      return { position: P(b.x - f * back - g * side, b.y - g * back + f * side, lerp(40, 2.1, k)), lookAt: P(b.x - f * 0.8, b.y - g * 0.8, lerp(-1, 1.3, k)), fov: 48, shake: 0.05 };
    },
  };

  const pad = helipadInfo(map);
  const padC = pad || { x: 749.6, y: -267.8, deck: 20, angle: -0.642 };
  // low on the roof edge opposite the city: the heli lifts off against the
  // skyline instead of a wide shot over the flat hospital roofs
  const awayA = Math.atan2(padC.y - tower.y, padC.x - tower.x);
  const camAt = (d) => ({ x: padC.x + Math.cos(awayA) * d, y: padC.y + Math.sin(awayA) * d });
  const trauma = {
    label: 'Traumaheli boven het UMCG', cuts: ['vol'], dur: 3.6, clock: 7.2, weather: 'helder', focus: padC,
    caps: [[0.5, 2.7, 'Spoedeisende duif.']],
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

  // the kermis at night: the wheel, the lights, the crowd (kermis.js)
  const wheel = { x: 146, y: 60 };
  const kermisPeds = { x: 160, y: 85 };
  const kermis = {
    label: 'Kermis op de Grote Markt', cuts: ['vol', 'kort'], dur: 4.0, kort: 3.0, clock: 22.4, weather: 'helder', focus: kermisPeds,
    caps: [[0.5, 3.0, '28 augustus.', 'Kermis op de Grote Markt']],
    enter(r, s) {
      kermisTick(r.w, 1);
      s.extraPeds = spawnPedestriansNear(map, kermisPeds.x, kermisPeds.y, 35, Math.random);
      r.w.pedestrians.push(...s.extraPeds);
    },
    tick(r, s, t, dt) { kermisTick(r.w, dt); },
    exit(r, s) {
      kermisTick(r.w, 1, true);
      const set = new Set(s.extraPeds || []); r.w.pedestrians = r.w.pedestrians.filter((p) => !set.has(p));
    },
    cam(u) {
      const a = lerp(1.15, 0.7, u), R = 34;
      return { position: P(wheel.x + Math.cos(a) * R, wheel.y + Math.sin(a) * R, lerp(4.5, 6.5, u)), lookAt: P(wheel.x, wheel.y, 8.5), fov: 54, shake: 0.03 };
    },
  };

  // last orders in the Poelestraat; Durk sings
  const poele = polyline([[268, 129], [304, 131], [347, 130], [373, 123], [414, 115]]);
  const singer = lane(poele, 72, 1.6);
  const night = {
    label: 'Nacht in de Poelestraat', cuts: ['vol'], dur: 3.8, clock: 23.3, weather: 'helder', focus: poele.at(70),
    caps: [[0.7, 2.8, 'Nog eentje dan.']],
    prep(r) { cast(r, 'durk', DURK_LOOK); },
    tick(r, s, t, dt) {
      const m = cast(r, 'durk', DURK_LOOK);
      stage(m, singer.x, singer.y, singer.a + Math.PI - 0.3, { pose: 'kissA', dt, t });
      m.userData.head.rotation.z = 0.25 + Math.sin(t * 3) * 0.08;
      m.userData.chest.rotation.y = Math.sin(t * 2.2) * 0.15;
    },
    cam(u) {
      const q = poele.at(lerp(8, 48, u));
      const ahead = poele.at(lerp(8, 48, u) + 38);
      return { position: P(q.x, q.y, 4.0), lookAt: P(ahead.x, ahead.y, 2.0), fov: 56, shake: 0.04 };
    },
  };

  const box = cityBox(map);
  const land = { x: (box[0] + box[2]) / 2 + 300, y: box[1] - 260 };
  const churnAt = { x: land.x - 20, y: land.y + 17 };
  const ommeland = {
    label: 'De Ommelanden', cuts: ['vol'], dur: 4.0, clock: 19.0, weather: 'helder', focus: land,
    sfx: [[2.2, 'knal']],
    prep(r) { r.prop('churn', buildChurn); },
    enter(r, s) {
      s.churn = r.prop('churn', buildChurn);
      s.z = gz(churnAt.x, churnAt.y);
      s.churn.position.set(churnAt.x, s.z, churnAt.y);
      s.churn.rotation.y = -2.2;
    },
    tick(r, s, t) {
      const { lid, smoke } = s.churn.userData;
      const k = t - 2.2;
      if (k < 0) { lid.position.set(-0.52, 0.93, 0); smoke.material.opacity = 0; return; }
      if (!s.banged) { s.banged = true; flash(false); }
      lid.position.set(-0.52 - k * 9, 0.93 + k * 7 - 4.9 * k * k, Math.sin(k * 3) * 0.3);
      lid.rotation.set(k * 9, 0, k * 6);
      smoke.position.set(-0.7 - k * 1.2, 0.95 + k * 0.6, 0);
      smoke.scale.setScalar(0.4 + k * 2.4);
      smoke.material.opacity = Math.max(0, 0.75 - k * 0.45);
    },
    cam(u) {
      const cz = gz(churnAt.x, churnAt.y);
      return { position: P(land.x - 40 + u * 22, land.y + 30, cz + lerp(2.2, 3.2, u)), lookAt: P(churnAt.x + 3, churnAt.y - 9, cz + 1.4), fov: 48, shake: 0.04 };
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
    caps: [[0.6, 4.2, 'Er gaat niets boven Grunn.']],
    thumb: 2.6,
    cam(u) { return aerialPose(u * 5.6); },
    // speed eases from 1 to 0.35 (arc length of that speed curve)
    continuation() {
      return (t) => aerialPose(5.6 + 0.35 * t + 1.3 * (1 - Math.exp(-t / 2)));
    },
  };

  // the aerial drifts on behind the logo, dimmed, instead of a black card
  const logoCam = aerial.continuation();
  const logo = {
    label: 'Logo', cuts: ['vol'], dur: 5.0, dim: true, keep: true, card: true, fadeOut: 1.0, clock: 19.1, clockTo: 19.35, weather: 'helder', focus: tower,
    cam(u) { return { ...logoCam(u * 5.0), shake: 0.03 }; },
    caps: [[0.2, 4.0, null, null, null, logoHtml() + '<div class="tr-title small tr-tagline">Een zomer in Grunn</div>']],
  };

  // after the logo: Berend finds a scratch on his bakkie
  const bq = openSpot(map, 224, -27, 14);
  const BAKKIE = { ...MODELS[4], color: '#2f4a66' };
  const BEREND_LOOK = { shirt: 0x4a4038, skin: 0xe2b48c, hair: 0xb8b2a8, variant: 'male', pants: 0x3a3a40, shoes: 0x2a2a2a, hairStyle: 'short', seed: 1672, look: { age: 'old', hat: 'flatcap', hatColor: 0x3a3430, top: 'coat', bottom: 'trousers', bag: null, umbrella: null, glasses: false, build: 'heavy' } };
  const berend = {
    label: 'Berend', cuts: ['vol'], dur: 3.0, clock: 9.4, weather: 'helder', focus: bq,
    voice: [[1.05, 'berend']],
    lines: [[1.05, 1.75, 'Bommen Berend', '…Kon minder.']],
    prep(r) { cast(r, 'berend', BEREND_LOOK); },
    enter(r, s) {
      // parked at the kerb; Berend stands on the pavement beside it
      const rp = roadPoint(map, bq.x, bq.y);
      s.a = rp ? rp.a : 0.3;
      s.f = { x: Math.cos(s.a), y: Math.sin(s.a) }; s.n = { x: -s.f.y, y: s.f.x };
      const half = rp ? (rp.road.width || 6) / 2 : 3;
      s.c = rp ? { x: rp.x + s.n.x * (half - 1.05), y: rp.y + s.n.y * (half - 1.05) } : bq;
      s.car = tempCar(r, s.c.x, s.c.y, s.a, { model: BAKKIE });
      clearAround(r, s.c, 40, s.car);
      s.scratch = r.prop('scratch', () => new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.012, 0.01), new THREE.MeshBasicMaterial({ color: 0xd8dde2 })));
    },
    tick(r, s, t, dt) {
      const { f, n, c } = s, side = (BAKKIE.wid || 1.8) / 2;
      const sp = { x: c.x + f.x * 0.9 + n.x * (side + 0.01), y: c.y + f.y * 0.9 + n.y * (side + 0.01) };
      s.scratch.position.set(sp.x, 0.78, sp.y);
      s.scratch.rotation.set(0, -s.a, 0.12);
      const m = cast(r, 'berend', BEREND_LOOK);
      stage(m, sp.x + n.x * 0.62 - f.x * 0.25, sp.y + n.y * 0.62 - f.y * 0.25, s.a - Math.PI / 2 + 0.25, { dt, t });
      const ud = m.userData;
      ud.chest.rotation.z = -0.32;
      ud.head.rotation.z = lerp(-0.3, -0.12, smooth((t - 1.6) / 0.6));
      ud.head.rotation.y = lerp(0, -0.2, smooth((t - 1.6) / 0.6));
      ud.armR.rotation.set(-0.2, 0, 0.85); ud.elbowR.rotation.z = 0.6;
      s.sp = sp;
    },
    cam(u, t, s) {
      const { f, n, sp } = s;
      // along the car's flank: Berend in profile, the scratch in front of him
      return { position: P(sp.x + f.x * 2.6 + n.x * 0.75, sp.y + f.y * 2.6 + n.y * 0.75, 1.35), lookAt: P(sp.x + n.x * 0.35 - f.x * 0.2, sp.y + n.y * 0.35 - f.y * 0.2, 1.1), fov: lerp(40, 34, u), shake: 0.01 };
    },
  };

  return [radio, sunrise, vismarkt, plantsoen, anita, tammo, escapade, jelle, twins, pigeon, vitrine, chase, race, bijna, tanker, storm, boat, trauma, kermis, night, ommeland, aerial, logo, berend];
}

function buildDoor() {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.25), new THREE.MeshBasicMaterial({ color: 0x0b0a09 }));
  frame.position.set(-0.5, 1.12, 0.03);
  const leaf = new THREE.Group();
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.96, 2.1, 0.05), propMat(0x1f5a3a, { roughness: 0.55 }));
  panel.position.set(-0.48, 1.05, 0);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), propMat(0xc9a43a, { metalness: 0.8, roughness: 0.3 }));
  knob.position.set(-0.86, 1.0, 0.05);
  leaf.add(panel, knob);
  leaf.position.set(0, 0, 0.06);
  g.add(frame, leaf);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.userData.leaf = leaf;
  return g;
}

function vitrineRoom(r) {
  return r.prop('vitrine', () => {
    const room = buildVitrineRoom();
    room.userData.ball.visible = false;
    const card = noteCard('Tige tank!');
    // propped up on the cushion, facing the push-in (vitrine cam, a = 0.7)
    card.scale.setScalar(1.25);
    card.position.set(0.02, 1.2, 0.03);
    card.rotation.set(-0.3, Math.PI / 2 - 0.7, 0, 'YXZ');
    room.add(card);
    return room;
  });
}

// The kermis (kermis.js) only lives in a running game: the trailer ticks it
// near its focus, and parks it out of sight again afterwards.
function kermisTick(w, dt, away = false) {
  try {
    if (away) KERMIS.tick(1, { ...w, clock: 12, paused: true, player: { x: 1e6, y: 1e6 } });
    else KERMIS.tick(dt, w);
  } catch (e) { /* the kermis is decoration here */ }
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

// No traffic or cyclists near a staged spot (terraces, the park, Berend):
// nothing drives through the people there.
function clearAround(r, c, dist, keep = null) {
  r.w.vehicles = r.w.vehicles.filter((v) => v === keep || v.cineTemp || v.driver === 'player' || v.isHeroCar || v.isBoat || Math.hypot(v.x - c.x, v.y - c.y) > dist);
}

// The nearest drivable road point with the road's heading there.
function roadPoint(map, x, y) {
  const rp = map.nearestRoadPoint(x, y, 60, true, true);
  if (!rp) return null;
  let best = Infinity, a = 0;
  const pts = rp.road.pts;
  for (let i = 0; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    const L = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    const d = Math.hypot(rp.x - mx, rp.y - my) - L / 2;
    if (d < best) { best = d; a = Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]); }
  }
  return { ...rp, a };
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
  showName(null);
  if (prev && prev.duck) setThemeDuck(false);
  if (s.duck) setThemeDuck(true);
  // the song starts after the radio intro (main.js video export: themeAt)
  if (!r.themeKicked && !s.preTheme) { r.themeKicked = true; kickTheme(); }
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
  // the next shot's place is built ahead of its cut
  const nx = shots[i + 1];
  if (nx && nx.focus && r.prewarmed !== i + 1 && r.T > r.starts[i + 1] - 2) {
    r.prewarmed = i + 1;
    prewarmStreamAt(nx.focus.x, nx.focus.y, 3);
  }
  const s = shots[i];
  const dur = shotDur(r, s);
  const k = s.dur / dur; // kort plays the same motion faster
  const st = (r.T - r.starts[i]) * k;
  const u = clamp01(st / s.dur);
  // a name card holds the picture from freezeAt on: world, actors and camera
  // stay at that moment (wt), the card runs on trailer time
  const frozen = s.freezeAt != null && st >= s.freezeAt;
  const wt = frozen ? s.freezeAt : st;
  const slow = frozen ? 0 : s.slow ? s.slow(st) : 1;
  const sdt = dt * slow;
  const w = r.w;
  if (frozen && !r.state.froze) { r.state.froze = true; flash(); }
  for (const [at, key] of s.voice || []) if (st >= at && !r.state['v' + at]) { r.state['v' + at] = true; if (!r.video) playVoice(key); }
  for (const [at, kind] of s.sfx || []) if (st >= at && !r.state['x' + at]) { r.state['x' + at] = true; if (!r.video) playSfx(kind); }
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
  if (s.tick && !frozen) { try { s.tick(r, r.state, st, sdt * k); } catch (e) { if (!r.warned) { r.warned = true; console.error('trailer shot', s.label, e && e.stack); } } }

  let cap = null, capP = 0;
  for (const c of s.caps || []) {
    const [at, d, title, kicker, cuts, html] = c;
    if (cuts && !cuts.includes(r.cut)) continue;
    if (st >= at && st < at + d && (title || html)) { cap = { title: title || '', kicker, html, small: (title || '').length > 18 }; capP = (st - at) / d; if (html) cap.title = html; }
  }
  showCard(cap, capP);
  if (s.lines) setSub(s.lines.find(([at, d]) => st >= at && st < at + d) || null);
  if (s.name) showName(st >= s.name.at ? s.name : null, (st - s.name.at) / Math.max(0.1, s.dur - s.name.at));

  let pose = null;
  if (s.black) pose = r.blackPose || r.pose;
  else if (s.cams) {
    let acc = 0;
    for (let c = 0; c < s.cams.length; c++) {
      const [d, fn] = s.cams[c];
      if (wt < acc + d || c === s.cams.length - 1) {
        if (c !== r.camIdx) { r.camIdx = c; flash(); }
        pose = fn(clamp01((wt - acc) / d), wt, r.state);
        break;
      }
      acc += d;
    }
  } else if (s.cam) pose = s.cam(frozen ? clamp01(wt / s.dur) : u, wt, r.state);
  if (pose && !pose.position) pose = null;
  if (pose) {
    const amp = frozen ? 0 : pose.shake || 0;
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
  try { r.env.render(frozen ? 0 : sdt > 0 ? sdt : dt, sdt); } catch (e) { console.warn('trailer render', e); }
  if (r.countCalls) { r.stats[i].calls = (r.stats[i].calls || 0) + r.countCalls.n; r.stats[i].frames = (r.stats[i].frames || 0) + 1; }

  if (r.mode === 'benchmark') {
    // title cards are not measured, also when a picture runs behind them
    if (!s.black && !s.card && !frozen && st / k > MEASURE_AFTER_CUT_S) r.stats[i].ms.push(realMs);
    r.fpsAcc += realMs; r.fpsN++;
    if (r.fpsAcc > 500) {
      ui.fps.textContent = `BENCHMARK${r.label ? ` · ${r.label}` : ''} · ${Math.round(1000 / (r.fpsAcc / r.fpsN))} fps`;
      r.fpsAcc = 0; r.fpsN = 0;
    }
  }
}

// When everything sounds, in seconds of trailer time (= video time): the
// theme from the first shot after the radio intro, the voice lines, the
// carbid bang, the ducked stretch, and the thumbnail moment.
function soundSheet(r) {
  const sheet = { total: r.total, fps: 1 / STEP, frames: Math.floor(r.total / STEP - 1e-6), themeAt: null, theme: 'audio/theme/miles_past_the_city_square.mp3', voices: [], sfx: [], duck: [], thumbAt: null };
  r.shots.forEach((s, i) => {
    const t0 = r.starts[i], k = s.dur / shotDur(r, s);
    if (sheet.themeAt == null && !s.preTheme) sheet.themeAt = t0;
    for (const [at, key] of s.voice || []) sheet.voices.push({ src: TRAILER_VOICE[key], at: t0 + at / k });
    for (const [at, kind] of s.sfx || []) sheet.sfx.push({ kind, at: t0 + at / k });
    if (s.duck) sheet.duck.push([t0, t0 + shotDur(r, s)]);
    if (s.thumb != null && sheet.thumbAt == null) sheet.thumbAt = t0 + s.thumb / k;
  });
  if (sheet.themeAt == null) sheet.themeAt = 0;
  return sheet;
}

function computeStats(r) {
  const all = [];
  const shots = [];
  r.stats.forEach((s, idx) => {
    if (!s || !s.ms.length) return;
    all.push(...s.ms);
    const mean = s.ms.reduce((a, b) => a + b, 0) / s.ms.length;
    if (s.ms.length >= 20) shots.push({ label: s.label, fps: 1000 / mean, idx });
  });
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
export function runTrailer(world, { mode = 'opname', cut = 'vol', shot = null, frames = false, env, label = '' }) {
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
    ui.fps.textContent = 'BENCHMARK' + (label ? ` · ${label}` : '');
    r.label = label;
    ui.black.classList.add('on');
    ui.root.classList.add('on');
    hidePigeonSpots(true);
    // props and extra actors are built under the opening black, not on their cut
    for (const s of shots) if (s.prep) { try { s.prep(r); } catch (e) { console.error('trailer prep', s.label, e && e.stack); } }
    for (const o of group.children) if (o.userData.trailerActor) o.visible = false;
    // desktop --trailer-video: main.js pipes every frame into ffmpeg and mixes
    // the sound from this sheet (the page itself stays quiet)
    r.video = !!(frames && Q.has('video') && window.gteDesktop && window.gteDesktop.videoBegin);
    const begun = r.video ? window.gteDesktop.videoBegin(soundSheet(r)).catch(() => false) : null;
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
      setThemeDuck(false);
      stopVoices();
      hidePigeonSpots(false);
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
      showName(null);
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
    // a video export starts once main.js has the sound sheet
    Promise.resolve(begun).then(() => requestAnimationFrame((now) => { last = now; loop(now); }));
  });
}

// The benchmark from Instellingen: the full cut on the current settings,
// then every other preset on the two heaviest shots of that run. A preset's
// fps is the full run's average times its measured speed-up on those shots.
export async function runBenchmarkSuite(world, env) {
  const cur = currentPreset();
  const res = await runTrailer(world, { mode: 'benchmark', cut: 'vol', env });
  if (res.aborted || !res.stats || BENCH_RUNS) return res;
  const probe = res.stats.shots.slice(0, 2);
  const fps = {};
  if (cur) fps[cur] = res.stats.avg;
  for (const name of PRESET_ORDER) {
    if (name === cur || !probe.length) continue;
    const restore = withTempSettings(GFX_PRESETS[name]);
    let ratio = 0, n = 0, aborted = false;
    try {
      for (const s of probe) {
        const r = await runTrailer(world, { mode: 'benchmark', cut: 'vol', shot: s.idx + 1, env, label: presetLabel(name) });
        if (r.aborted) { aborted = true; break; }
        if (r.stats) { ratio += r.stats.avg / s.fps; n++; }
      }
    } finally { restore(); }
    if (aborted) break;
    if (n) fps[name] = res.stats.avg * ratio / n;
  }
  res.presetFps = fps;
  res.preset = cur;
  return res;
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

// One recommended preset (gfxprofile.js) that sets everything at once.
function advise(stats) {
  const st = getSettings();
  const cur = currentPreset(st);
  const i = PRESET_ORDER.indexOf(cur || st.quality);
  const rec = (name, why) => ({ text: `${why} Aanbevolen: <b>${presetLabel(name)}</b>`, what: describePreset(name), apply: name });
  if (stats.avg < 40 || stats.low < 22) {
    if (i > 0) return rec(PRESET_ORDER[i - 1], 'Grunn hapert hier en daar.');
    if (cur !== 'laag') return rec('laag', 'Grunn hapert hier en daar.');
    return { text: 'Alles staat al zo licht mogelijk. Sluit andere programma’s en tabbladen voor wat extra lucht.', apply: null };
  }
  if (stats.avg >= 75 && stats.low >= 45 && i < PRESET_ORDER.length - 1) return rec(PRESET_ORDER[i + 1], 'Er is ruimte over.');
  return { text: `${cur ? `Stand ${presetLabel(cur)}` : 'Je eigen instellingen'} draait prima. ${cur === 'hoog' ? 'Genieten maar.' : 'Niks aan veranderen.'}`, apply: null };
}

let resultEl = null;

// Shows the results card; resolves with 'again' or 'back'.
export function showBenchmarkResults(res) {
  const stats = res && res.stats;
  // a player's run: the result goes to Instellingen > Beeld (gfxprofile.js)
  if (!BENCH_RUNS) {
    setBenchResult(stats, res.preset, res.presetFps || {});
    return Promise.resolve('settings');
  }
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
  const meta = `Kwaliteit ${st.quality} · schaduwen ${st.shadows && QUALITY_PRESETS[st.quality].shadows ? 'aan' : 'uit'} · zichtafstand ${st.drawDistance} · resolutie ${Math.round(st.resolution * 100)}%${st.autoResolution ? ' (auto)' : ''} · ${innerWidth}×${innerHeight}`;
  resultEl.innerHTML = `<div class="tr-res">
    <h2 id="tr-res-title">Benchmark</h2>
    <div class="tr-meta">${meta}</div>
    ${stats ? `<div class="tr-nums"><div><b>${r(stats.avg)}</b><span>fps gemiddeld</span></div><div><b>${r(stats.low)}</b><span>1%-low</span></div></div>
    ${stats.heaviest ? `<p>Zwaarste shot: ${stats.heaviest.label}: ${r(stats.heaviest.fps)} fps</p>` : ''}` : ''}
    <p class="tr-advice">${adv.text}${adv.what ? `<small>${adv.what}</small>` : ''}</p>
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
        applyPreset(adv.apply);
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
