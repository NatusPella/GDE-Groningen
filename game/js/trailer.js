import { gridItems } from './spatialgrid.js';
import { hoofdspeler } from './players.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { adoptSetLight } from './setlights.js';
import { FLAGS } from './devflags.js';
import { canvasTex as canvasTexture } from './canvastex.js';
import { mulberry32 } from './rng.js';
import { getScene, prewarmStreamAt, prewarmPending, streamPending, disposeObject } from './scene3d.js';
import { createSettle, settleTick, queueNear } from './benchsettle.js';
import { WARM } from './cutscenewarm.js';
import { speakerHtml } from './speakers.js';
import { getSettings, QUALITY_PRESETS, withTempSettings } from './settings.js';
import { PRESET_ORDER, GFX_PRESETS, currentPreset, describePreset, presetLabel, applyPreset, setBenchResult, getBenchResult } from './gfxprofile.js';
import { BENCH_ROUTE, playStats, shouldRemeasure, betterRun, ultraNote, runDiagnosis, benchMeasureAfter, frameStats, categoryStats, routeHitches, packRun, readLastRun, writeLastRun, heapMb, heapPeak } from './benchstats.js';
import { onBenchmarkStop } from './gamepad.js';
import { glyphHtml } from './keycap.js';
import { courseFor, commentaryFor, frameReport, fpsSeries, reportCard, normaliseChoice, COURSES } from './benchmarkmodel.js';
import { showBenchmarkChoice, reportHtml, saveReport } from './benchmarkui.js';
import { refreshDayNight } from './daynight.js';
import { makeActor, stage, seat } from './intromontage.js';
import { makeBirds, scatterBirds, updateBirds } from './birds.js';
import { setTrailerRunning } from './trailerstate.js';
import { buildAtm, buildVitrineRoom, buildFlag, waveFlag } from './trailerprops.js';
import { TAMMO_APPEARANCE, ANITA_APPEARANCE, seatPose, seatPerson, seatedY } from './models3d_people.js';
import { JELLE_LOOK, DURK_LOOK, DOUWE_LOOK } from './storycast.js';
import { spawnPedestriansNear } from './pedestrians.js';
import { isOnRoad } from './pedgeom.js';
import { KERMIS } from './kermis.js';
import { CARBID } from './carbid.js';
import { buildCarbidSet, busOpBok, animateCarbidSet, vrijOpKaart } from './carbidset.js';
import { dekselOp } from './carbidintro.js';
import { spawnExplosionFx, spawnFxPuff } from './fx3d.js';
import { tractorBodyGeometry, tractorBaseGeometry } from './countrymodels.js';
import { vcMaterial } from './pixelart3d.js';
import { Vehicle, MODELS, TRAFFIC_MODELS, spawnHeroCarNear } from './vehicle.js';
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
import { buildFatTrail, addTrailPuddle, commitTrail, clearTrail } from './fattrail3d.js';
import { kickTheme, setThemeDuck } from './theme.js';
import { probe } from './hitchprobe.js';
import { flashScreen } from './postfx3d.js';
import { logoHtml } from './logo.js';
import { updateHud } from './hud_panel.js';
import { showCard as showHudCard } from './hudcards.js';
import { showStuntHud, hideStuntHud, updateStuntHud } from './stunthud.js';
import { heliTrailerKit } from './helirun.js';
import { trailerPhone } from './phone.js';
import { KEYS, SESSION_KEYS } from './storagekeys.js';
import { PLAN, PLAN_CUTS, SLICES } from './trailerplan.js';
import { holdBackground } from './tilestream.js';
import { ensureSubtitleCss } from './subtitleui.js';

// Trailer mode: "GDE Groningen - Een zomer in Grunn" (shot list in
// docs/verhaal/E-trailer.md), one list of staged shots through Grunn, played
// three ways:
//   benchmark  the full cut ('vol') in real time with an fps counter
//              (Instellingen > Beeld > Prestatietest)
//   opname     ?trailer / desktop --trailer: fixed 1/60 s steps for
//              recordings, no fps counter, the desktop app quits at the end;
//              desktop --trailer-video pipes those frames into an MP4
//   verhaal    ?trailer&cut=verhaal / --trailer-cut=verhaal: the story
//              trailer (~85 s) with voiced lines from the game
//   gameplay   ?trailer&cut=gameplay: the Steam gameplay trailer (~60 s),
//              the logo first, the systems with the real HUD (hud: true)
//   teaser     ?trailer&cut=teaser: the 40 s teaser, hoofd: the 90 s main trailer, ontdek: the 75 s film cut (new story, no snack van)
//              (trailerplan.js, docs/verhaal/nieuw/TRAILER-SCRIPT.md); ?preview&cut=teaser
//              plays them in real time with sound, hold Space to skip
//   attract    ?attract: the short cut ('kort', ~38 s, with the Tessa and
//              Tammo name cards); hold Space to skip; hands its last camera
//              pose over to the title screen
// Each shot forces its own clock and weather. The title screen owns the frame
// loop outside the trailer; while it runs, runTrailer drives the world through
// the title screen's tick/render/relocate.

const Q = FLAGS;
const SKIP_HOLD_S = 0.9;
const STEP = 1 / 60;
const BENCH_RUNS = Q.benchmark ? Math.max(1, Number(Q.benchmarkRuns) || 1) : 0;

// --- small helpers ------------------------------------------------------------

const P = (x, y, z) => ({ x, y, z });
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const smooth = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
const lerpP = (a, b, t) => P(lerp(a.x, b.x, t), lerp(a.y, b.y, t), lerp(a.z, b.z, t));

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
#trailer { position: fixed; inset: 0; z-index: 17; pointer-events: none; font-family: var(--ds-font-zeef-kop); color: var(--ds-c-ink-papier); opacity: 0; transition: opacity 0.4s; --bar: 9vh; } /* ds3-film: scene */
#trailer.on { opacity: 1; }
#trailer > div:not(.ds-sub) { position: absolute; }
#trailer .tr-vig { inset: 0; background: radial-gradient(ellipse at center, color-mix(in srgb, var(--ds-c-ink-inkt) 0%, transparent) 55%, rgba(4, 10, 8, 0.5) 100%); transition: opacity 1.2s; } /* ds3-film: scene */
#trailer .tr-bar { left: 0; right: 0; height: var(--bar); background: var(--ds-c-ink-inkt); transition: transform 0.8s cubic-bezier(0.6, 0, 0.3, 1); } /* ds3-film: scene */
#trailer .tr-bar.top { top: 0; } #trailer .tr-bar.bottom { bottom: 0; }
#trailer.handoff .tr-bar.top { transform: translateY(-100%); } #trailer.handoff .tr-bar.bottom { transform: translateY(100%); }
#trailer.handoff .tr-vig { opacity: 0; }
/* during a run frame() sets the black's opacity from the trailer clock (the
   fixed-step export would turn these transitions into hard cuts); the
   classes are for fadeOutTrailer, after the run */
#trailer .tr-black { inset: 0; background: var(--ds-c-glas); opacity: 0; transition: opacity 0.35s; } /* ds3-film: scene */
#trailer .tr-black.on { opacity: 1; transition: opacity 0.12s; }
#trailer .tr-black.fade { opacity: 1; transition: opacity 0.4s; }
#trailer .tr-black.dim { opacity: 0.55; transition: opacity 0.9s; }
#trailer .tr-flash { inset: 0; background: #fff6e6; opacity: 0; display: none; }
#trailer .tr-flash.go, #trailer .tr-flash.big { display: block; }
#trailer .tr-flash.go { animation: tr-flash 0.28s ease-out; }
#trailer .tr-flash.big { animation: tr-flash-big 0.5s ease-out; }
@keyframes tr-flash { 0% { opacity: 0.8; } 100% { opacity: 0; } }
@keyframes tr-flash-big { 0% { opacity: 1; } 30% { opacity: 0.25; } 45% { opacity: 0.9; } 100% { opacity: 0; } }
#trailer .tr-card { inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; opacity: 0; padding: 0 6vw; text-shadow: 3px 3px 0 var(--ds-c-ink-roze); }
#trailer .tr-kicker { font-size: clamp(16px, 2vw, 26px); letter-spacing: 6px; color: var(--ds-c-ink-papier); text-transform: uppercase; margin-bottom: 6px; }
#trailer .tr-title { font-size: clamp(48px, 8.5vw, 132px); line-height: 0.92; text-transform: uppercase; }
#trailer .tr-title.small { font-size: clamp(38px, 5.8vw, 88px); }
#trailer .tr-title .amp { color: var(--ds-c-ink-roze); }
/* no card text-shadow here: it shows through the logo's transparent, gradient-clipped letters */
#trailer .tr-card .gde-logo { font-size: clamp(110px, 19vw, 230px); text-shadow: none; }
#trailer .tr-title.tr-tagline { margin-top: 10px; font-size: clamp(30px, 4.4vw, 64px); letter-spacing: 0.08em; }
#trailer .tr-radio { font-size: clamp(64px, 11vw, 168px); line-height: 1; color: color-mix(in srgb, var(--ds-c-ink-papier) 90%, transparent); letter-spacing: 0.06em; }
/* name cards over a freeze frame: lower left, like a character intro */
#trailer .tr-freeze { inset: 0; opacity: 0; background: radial-gradient(ellipse at 30% 60%, color-mix(in srgb, var(--ds-c-geel, #f9c80e) 8%, transparent), color-mix(in srgb, var(--ds-c-ink-inkt, #1d1b17) 42%, transparent) 85%); }
#trailer .tr-name { left: 6vw; bottom: calc(var(--bar) + 7vh); max-width: min(72vw, 1500px); opacity: 0; text-shadow: 3px 3px 0 var(--ds-c-ink-roze); }
#trailer .tr-name b { display: block; font-weight: normal; font-size: clamp(64px, 10vw, 160px); line-height: 0.88; text-transform: uppercase; letter-spacing: 0.02em; }
#trailer .tr-name b .amp { color: var(--ds-c-ink-roze); }
#trailer .tr-name i { display: block; margin-top: 0.5vh; border-left: 0.14em solid var(--ds-c-ink-roze); padding-left: 0.4em; font: clamp(20px, 2.5vw, 64px) var(--ds-font-zeef-tekst); letter-spacing: 0.3px; color: var(--ds-c-ink-papier); }
#trailer .tr-skip { right: 3vw; bottom: calc(var(--bar) * 0.5); transform: translateY(50%); display: block; text-align: center; white-space: nowrap; opacity: 0; transition: opacity 0.25s; } /* uiterlijk: ds-schermen.css */
#trailer.skippable .tr-skip { opacity: 1; }
body.trailer-rec #trailer .tr-skip, body.trailer-rec #trailer .tr-fps { display: none; }
#trailer .tr-skip .key { display: inline; } /* de toets is een glyph in de regel (ds-keycap.css, #1075) */
#trailer .tr-skip svg { display: inline-block; width: 1.25em; height: 1.25em; margin-right: 0.4em; transform: rotate(-90deg); }
#trailer .tr-skip circle { fill: none; stroke-width: 3; }
#trailer .tr-skip .fill { stroke-linecap: round; stroke-dasharray: 62.8; stroke-dashoffset: calc(62.8 * (1 - var(--hold, 0))); }
#trailer .tr-fps { right: 2.2vw; bottom: 1.6vh; display: none; } /* uiterlijk: ds-schermen.css */
#trailer.bench .tr-fps { display: block; }
#trailer .tr-cancel { display: none; left: 3vw; bottom: calc(var(--bar) * 0.5); transform: translateY(50%); }
#trailer.bench .tr-cancel { display: flex; }
/* 0.64.1: the cursor is only hidden while a picture plays; on the result card (class tr-result-open) it is back, otherwise the card looked unclickable */
body.trailer-on:not(.tr-result-open), body.trailer-on:not(.tr-result-open) * { cursor: none !important; }
#trailer .tr-slices { display: flex; gap: 1.1vw; margin-top: 1.4vh; }
#trailer .tr-slices i { display: block; width: 5.2vw; height: 2.6vw; border-radius: 0.5vw; background: var(--ds-c-ink-papier); position: relative; transition: none; }
#trailer .tr-slices i.x { background: color-mix(in srgb, var(--ds-c-ink-papier) 28%, transparent); }
#trailer .tr-slices i.x::after { content: ''; position: absolute; left: -8%; right: -8%; top: 46%; height: 0.35vw; background: var(--ds-c-ink-papier); transform: rotate(-6deg); }
#trailer .tr-title.tr-tagline.tight { letter-spacing: 0.06em; }
#trailer .tr-info { margin-top: 2.4vh; font: 700 clamp(16px, 1.7vw, 30px) var(--ds-font-zeef-tekst); letter-spacing: 3px; text-transform: uppercase; color: color-mix(in srgb, var(--ds-c-ink-papier) 85%, transparent); }
body.trailer-on:not(.trailer-hud) #hud, body.trailer-on .prompts, body.trailer-on #cine { display: none !important; }
/* gameplay shots (hud: true): the real HUD, no bars or vignette over it */
body.trailer-on.trailer-hud #hud { visibility: visible; }
body.trailer-hud #hud .hud-prompts, body.trailer-hud #hud .hud-ctx { display: none; }
#trailer.hudshot .tr-bar, #trailer.hudshot .tr-vig { display: none; }
body.trailer-heli #hud .hud-top-left { display: none; }
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
    '<div class="tr-freeze"></div><div class="tr-card"></div><div class="tr-name"></div><div class="ds-sub ds-sub--film tr-sub" role="status" aria-live="polite"></div><div class="tr-bar top"></div><div class="tr-bar bottom"></div>' +
    '<div class="tr-skip"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle class="fill" cx="12" cy="12" r="10"/></svg>' +
    '<span>Houd</span> <span class="key is-kbg">' + glyphHtml('SPACE') + '</span> <span>ingedrukt om over te slaan</span></div>' +
    '<div class="tr-cancel"><span class="key is-kbg">' + glyphHtml('ESC') + '</span><span>Benchmark stoppen</span></div>' +
    '<div class="tr-fps"></div>' +
    '<div class="tr-prog"><span class="tr-prog__t"></span><div class="ds-z-balk"><div class="ds-z-balk__baan"><div class="ds-z-balk__vul"></div></div></div></div>';
  document.body.appendChild(root);
  const q = (s) => root.querySelector(s);
  q('.tr-flash').addEventListener('animationend', (e) => e.target.classList.remove('go', 'big'));
  ensureSubtitleCss();
  ui = { root, flash: q('.tr-flash'), card: q('.tr-card'), sub: q('.tr-sub'), skip: q('.tr-skip'), fps: q('.tr-fps'), prog: q('.tr-prog__t'), progBar: q('.tr-prog .ds-z-balk'), black: q('.tr-black'), name: q('.tr-name'), freeze: q('.tr-freeze'), cardKey: '', subKey: '', nameKey: '' };
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
  // the slice board: a slice is struck out on every tick of the snare
  if (cap.strike) {
    const n = cap.strike.filter((x) => x <= cap.ap).length;
    ui.card.querySelectorAll('.tr-slices i').forEach((el, i) => el.classList.toggle('x', i < n));
  }
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
const SILENT = Q.stil;
const voices = new Set();
function audible() {
  try { if (localStorage.getItem(KEYS.muted) === '1') return 0; } catch (e) { /* ignore */ }
  const st = getSettings();
  return Math.min(1, (st.masterVolume ?? 1) * (st.voiceVolume ?? 1));
}
function playVoice(key) {
  const v = audible();
  const src = TRAILER_VOICE[key] || key;
  if (SILENT || !v || !src) return;
  const el = new Audio(new URL('../' + src, import.meta.url).href);
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
// Every sound is synthesised (noise and sine tones); desktop/trailervideo.js
// builds the same four for the video with ffmpeg.
const SFX_SYNTH = {
  knal: { t: 0.9, noise: 'brown', decay: 0.12, lp: 900, gain: 0.9 },
  tik: { t: 0.12, noise: 'white', decay: 0.02, hp: 2200, lp: 9000, gain: 0.5 },
  stoot: { t: 0.9, tone: 52, decay: 0.2, gain: 0.9 },
  riser: { t: 1.6, noise: 'white', rise: true, bp: 1800, gain: 0.5 },
};
function playSfx(kind) {
  const v = audible() * ((getSettings().sfxVolume ?? 0.75) / (getSettings().voiceVolume || 1));
  const k = SFX_SYNTH[kind];
  if (SILENT || !v || !k) return;
  try {
    sfxCtx = sfxCtx || new AudioContext();
    const c = sfxCtx, n = Math.floor(c.sampleRate * k.t);
    const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < n; i++) {
      const x = i / c.sampleRate;
      let a = k.tone ? Math.sin(Math.PI * 2 * k.tone * x) : Math.random() * 2 - 1;
      if (k.noise === 'brown') { lastOut = (lastOut + 0.02 * a) / 1.02; a = lastOut * 3.5; }
      d[i] = a * (k.rise ? Math.min(1, x / (k.t - 0.1)) ** 2 * (x > k.t - 0.1 ? 0 : 1) : Math.exp(-x / k.decay));
    }
    const src = c.createBufferSource(), g = c.createGain();
    src.buffer = buf; g.gain.value = k.gain * Math.min(1, v);
    let node = src;
    for (const [type, f] of [['highpass', k.hp], ['lowpass', k.lp], ['bandpass', k.bp]]) {
      if (!f) continue;
      const bq = c.createBiquadFilter();
      bq.type = type; bq.frequency.value = f;
      node.connect(bq); node = bq;
    }
    node.connect(g); g.connect(c.destination);
    src.start();
  } catch (e) { /* no audio */ }
}

// --- shots ---------------------------------------------------------------------------

function landmark(w, name, fb) {
  const lm = (w.map.meta.landmarks || []).find((l) => l.name === name);
  return lm ? { x: lm.x, y: lm.y } : fb;
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
  for (const r of gridItems(map.roadGrid)) {
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

// The stunt evening's parasols and kliko's (stuntavond.js's shapes), to knock over.
function buildStuntProp(kind, k) {
  const g = new THREE.Group();
  const top = new THREE.Group();
  g.add(top);
  if (kind === 'parasol') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.3, 6), propMat(0xdddddd));
    pole.position.y = 1.15;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.5, 8), propMat([0x1e9e56, 0xf0ede4, 0xc8102e][k % 3]));
    cap.position.y = 2.2;
    top.add(pole, cap);
  } else {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.05, 0.7), propMat([0x3f7a3a, 0x4a4d50][k % 2]));
    b.position.y = 0.53;
    top.add(b);
  }
  for (const m of top.children) m.castShadow = true;
  g.userData.top = top;
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

// Carbid schieten on boer Roelf's yard (24-11): the same yard as the activity (carbidset.js: the row of churns on trestles, the
// fence with onlookers, the coffee table, tractor, shed, farm and trees, all from the real libraries) round the churn that fires.
function buildCarbidYard(map) {
  const f = CARBID.field(), c = Math.cos(f.rot), s = Math.sin(f.rot);
  const toW = (u, v) => ({ x: f.x + c * u - s * v, y: f.y + s * u + c * v });
  const root = new THREE.Group();
  const bus = busOpBok(0.32);
  root.add(bus.groep);
  const set = buildCarbidSet(root, { vrij: vrijOpKaart(map, toW) });
  root.userData = { bus: bus.bus, deksel: bus.deksel, thuis: bus.deksel.position.clone(), set, toW, field: f };
  return root;
}


function buildTractor() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(tractorBodyGeometry(), vcMaterial({ roughness: 0.8, color: 0x3f7d3a })));
  g.add(new THREE.Mesh(tractorBaseGeometry(), vcMaterial({ roughness: 0.85 })));
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
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

// The two Steam cuts in their own order: [shot id, seconds in that cut].
const CUT_ORDER = {
  verhaal: [['radio', 4.0], ['sunrise', 3.6], ['vismarkt', 3.4], ['anita', 3.0], ['tammo', 3.0], ['plantsoen', 4.6], ['escapade', 3.6],
    ['vitrine', 6.0], ['jelle', 5.4], ['pigeon', 3.8], ['twins', 3.2], ['chase', 4.0], ['race', 3.6], ['tanker', 3.6], ['boat', 4.2],
    ['kermis', 4.0], ['trauma', 3.6], ['aerial', 5.8], ['logo', 5.0], ['berend', 3.0]],
  gameplay: [['steamLogo', 2.6], ['gpCity', 2.2], ['gH1', 2.2], ['gH2', 2.0], ['hudStunt', 2.4], ['gH4', 2.0], ['gH5', 2.2],
    ['vitrine', 2.0], ['gH7', 2.0], ['tanker', 2.2], ['race', 2.2], ['night', 2.0], ['gH12', 2.0], ['boat', 2.2], ['gH14', 2.2],
    ['hudHeli', 2.4], ['hudChase', 2.2], ['gH18', 2.2], ['kermis', 2.2], ['gTwins', 1.8], ['trauma', 2.4], ['hudJob', 2.2],
    ['hudPhone', 2.4], ['timelapse', 2.2], ['storm', 1.8], ['vismarkt', 2.2], ['aerial', 2.4], ['logo', 4.0]],
};

// The benchmark route (benchstats.js): the same shots on every run.
CUT_ORDER.bench = BENCH_ROUTE.map(([id, d]) => [id, d]);
// 21-11: the film route ('Grunn in een dag', benchmarkmodel.js) and its short cut: the same locked shots, in the order of a day
CUT_ORDER.film = courseFor('film', 'volledig').map(([id, d]) => [id, d]);
CUT_ORDER.filmkort = courseFor('film', 'kort').map(([id, d]) => [id, d]);

// Shot fields: label (benchmark results), cuts ('vol' and/or 'kort';
// verhaal and gameplay take theirs from CUT_ORDER), dur (seconds in the full
// cut; kort: its length there, same motion
// faster or slower), hud (a gameplay shot: the real HUD, no bars),
// voice and lines entries may end in a cuts list (only in those cuts); a
// voice is a TRAILER_VOICE key or a path under game/ ([at, src, cuts, dur]:
// dur ducks the theme under it in the video),
// clock/clockTo, weather, focus (where the world streams and populates),
// caps [[at, dur, title, kicker?, cuts?, html?]], lines [[at, dur, who, text]],
// voice [[at, key]] (TRAILER_VOICE), sfx [[at, kind]], name {at, title, line}
// (a name card over a freeze frame from freezeAt on), preTheme (before the
// theme song starts), duck (theme ducked), thumb (seconds in: the video
// export's thumbnail), prep(r) (builds props during the opening black),
// enter/tick/exit(r, s), cam(u, t, s) -> {position, lookAt, fov}.
function buildShots(w) {
  const map = w.map;
  const tower = landmark(w, 'Martinitoren', { x: 213.81, y: 9.9 });
  const vis = landmark(w, 'Vismarkt', { x: 16.36, y: 255.74 });
  const forum = landmark(w, 'Forum Groningen', { x: 356.93, y: 57.89 });
  const museum = landmark(w, 'Groninger Museum', { x: 83.35, y: 802.56 });
  const park = landmark(w, 'Noorderplantsoen', { x: 120.57, y: -725.44 });
  const square = { x: 172.43, y: 53.87 };
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
    voice: [[0.5, 'audio/voicelines/banter/h5-pass-groen_1_t_0c64d9.mp3', ['verhaal'], 2.7]],
    lines: [[0.5, 2.7, 'Tammo', 'Oogcontact. Dat zei Sjoerd.', ['verhaal']]],
    label: 'Terrassen op de Vismarkt', cuts: ['vol', 'kort'], dur: 4.0, kort: 2.6, clock: 13.2, weather: 'helder', focus: vm,
    caps: [[0.6, 3.0, 'Een zomer.', null, ['vol', 'kort', 'verhaal']], [0.4, 3.2, 'Toetsenbord of controller.', 'Nederlands gesproken', ['gameplay']]],
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
    voice: [[0.3, 'audio/voicelines/banter/id-fjord-meeuw_0_a_300d42.mp3', ['verhaal'], 4.94]],
    lines: [[0.3, 4.2, 'Anita', 'De snackwagen. Blauw, met een meeuw erop.', ['verhaal']]],
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
  const here = polyline([[220.16, 397.36], [223.25, 402.34], [228.43, 412.32], [236.73, 429.3], [238.86, 437.32], [242, 445.32], [254.52, 475.31], [257.64, 482.31], [259.76, 489.32], [259.83, 493.35], [272.85, 553.53], [275.11, 569.6], [279.47, 590.67], [282.66, 601.69]]);
  const hq = here.at(40);
  const hf = { x: Math.cos(hq.a), y: Math.sin(hq.a) }, hn = { x: -hf.y, y: hf.x };
  const anita = {
    label: 'Tessa', cuts: ['vol', 'kort'], dur: 3.0, clock: 8.1, weather: 'helder', focus: hq,
    freezeAt: 1.55, name: { at: 1.55, title: 'Tessa', line: 'Heeft altijd een plan B. Plan A is ook van haar.' },
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
    freezeAt: 1.35, name: { at: 1.35, title: 'Tammo', line: 'Stadjer met een Escapade die nauwelijks rijdt.' },
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
    voice: [[0.1, 'audio/voicelines/banter/st-end-kop-fjord_0_a_c5a140.mp3', ['verhaal'], 3.67]],
    lines: [[0.1, 3.5, 'Anita', 'Zonder die Eierbal geen snackwagen.', ['verhaal']]],
    caps: [[0.4, 3.2, 'Eén droom op vier wielen.', null, ['vol', 'kort']]],
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
        // the car glides along the lane; a low reported speed keeps it from smashing bikes and bins into debris
        Object.assign(s.car, { x: q.x, y: q.y, angle: q.a, speed: Math.min(v, 4) });
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
  const fjordRoad = polyline([[320.11, 684.63], [337.76, 721.58], [353.33, 754.55], [363.74, 777.53], [371.02, 793.52], [373.09, 797.51], [401.24, 863.48], [427.6, 942.58], [428.69, 947.59], [440.22, 978.61], [457.04, 1025.64], [469.69, 1063.69]]);
  const LIMO = { ...MODELS[0], name: 'trekkerlimo', len: 5.6, wid: 2.0, color: '#0d0d0f' };
  const jelle = {
    label: 'Jelle Terpstra', cuts: ['vol'], dur: 4.0, clock: 18.9, weather: 'helder', focus: lane(fjordRoad, 70, 2),
    voice: [[0.05, 'audio/voicelines/banter/id-fierljeppen_0_a_aa6499.mp3', ['verhaal'], 5.35]],
    lines: [[0.05, 2.3, 'Anita', 'Jelle Terpstra. Zelfs zijn naam klinkt als een fierljepper.', ['verhaal']]],
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
      return { position: P(q.x + f * lerp(3.5, 2.5, u) + g * 7, q.y + g * lerp(3.5, 2.5, u) - f * 7, 2.3), lookAt: P(q.x - f * 1.2, q.y - g * 1.2, 1.9), fov: 50, shake: 0.02 };
    },
  };

  // Durk and Douwe in one bumper car, under the kermis tent
  const kc = { x: 169.31, y: 108.28 };
  const twins = {
    label: 'Durk & Douwe', cuts: ['vol'], dur: 3.2, clock: 16.6, weather: 'helder', focus: kc,
    freezeAt: 1.9, name: { at: 1.9, title: 'Durk <span class="amp">&amp;</span> Douwe', line: 'Twee reuzen die geen geheim kunnen houden.' },
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
    voice: [[0.2, 'audio/voicelines/lines/jelle_terpstra/moai_grinzers_kijk_eens_omhoog_f_b8143cd9.mp3', ['verhaal'], 3.61]],
    lines: [[0.2, 3.5, 'Jelle Terpstra', 'Moai, Grinzers! Kijk eens omhoog. Foar mem.', ['verhaal']]],
    caps: [[0.5, 2.6, 'Kieken van boven.', null, ['vol', 'verhaal']], [0.5, 2.6, 'Of ga als duif.', null, ['gameplay']]],
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
    label: 'De Gouden Eierbal', cuts: ['vol', 'verhaal'], dur: 4.0, verhaal: 6.0, clock: 23.4, weather: 'helder', focus: museum,
    caps: [[2.2, 1.7, 'De Gouden Eierbal.', 'Groninger Museum', ['vol']], [4.15, 1.75, 'De Gouden Eierbal.', 'Groninger Museum', ['verhaal']]],
    voice: [[0.25, 'audio/voicelines/lines/anita/het_museum_de_gouden_eierbal_70526a93.mp3', ['verhaal'], 2.61], [3.0, 'audio/voicelines/banter/st-h6_0_a_8d4667.mp3', ['verhaal'], 2.85]],
    lines: [[0.25, 2.5, 'Anita', 'Het museum. De Gouden Eierbal.', ['verhaal']], [3.0, 2.85, 'Anita', 'Vannacht. Het museum. Geen zaklamp.', ['verhaal']]],
    prep(r) { vitrineRoom(r); },
    enter(r, s) {
      s.room = vitrineRoom(r);
      s.at = { x: museum.x, y: museum.y, z: 300 };
      s.room.position.set(s.at.x, s.at.z, s.at.y);
    },
    tick(r, s, t) {
      const { ball, glow } = s.room.userData;
      ball.rotation.y = t * 0.35;
      glow.material.opacity = 0.42 + Math.sin(t * 2.4) * 0.08;
    },
    cam(u, t, s) {
      // a slow push-in on the case: the heist is still a plan
      const c = s.at, k = smooth(u), a = 0.7, R = lerp(4.0, 2.5, k);
      return { position: P(c.x + Math.cos(a) * R, c.y + Math.sin(a) * R, c.z + lerp(1.85, 1.6, k)), lookAt: P(c.x, c.y, c.z + 1.3), fov: lerp(40, 31, k), shake: 0.006 };
    },
  };

  const chaseRoad = polyline([[413.19, 371.04], [407.28, 377.17], [400.37, 383.33], [387.49, 392.6], [368.66, 405.99], [331.93, 427.74], [326.97, 430.84], [318.05, 437.03], [302.18, 447.35], [287.29, 456.66], [273.41, 465.94], [264.48, 471.12], [260.48, 472.2], [254.52, 475.31], [246.55, 478.46], [230.62, 484.77], [212.68, 491.1], [193.77, 499.46], [189.78, 500.54], [106.19, 538.14], [103.2, 539.2], [96.23, 542.33], [89.25, 544.46], [81.27, 546.61], [74.28, 548.73], [66.28, 549.87], [58.27, 550], [43.23, 550.25]]);
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
    caps: [[0.3, 2.6, 'Ring Zuid. Laatste fase.', null, ['vol', 'kort', 'verhaal']], [0.3, 2.6, '18 missies.', 'En een ringweg', ['gameplay']]],
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

  // the Us Mem Vet tanker on the Europaweg, sliding; the open drain valve at the back leaves a trail of fat on the road
  // (vettruck 23-11: replaces the yellow balls that sprayed up over the tank and hung there in the benchmark)
  const euro = polyline([[1121.51, 408.67], [1126.63, 414.62], [1130.73, 420.59], [1138.93, 431.53], [1146.1, 440.47], [1149.17, 444.45], [1152.25, 448.42], [1180.84, 480.16], [1207.36, 507.91], [1234.87, 534.63], [1288.89, 588.09], [1319.46, 617.78]]);
  const TANKER = { name: 'truck', tank: true, livery: 'usmemvet', len: 8.5, wid: 2.5, maxSpeed: 24, accel: 4.5, brake: 14, turnRate: 1.5, color: '#1d4f9c' };
  const tanker = {
    label: 'Tankwagen op de Europaweg', cuts: ['vol'], dur: 4.0, clock: 17.6, weather: 'helder', focus: lane(euro, 130, 0),
    caps: [[0.9, 2.8, 'Dertienduizend liter frituurvet.', 'Europaweg']],
    slow: (t) => (t < 0.8 ? 1 : 0.4),
    enter(r, s) {
      clearRoad(r, euro, 10);
      s.d = s.d0 = 95;
      const q = lane(euro, s.d, 1.5);
      s.truck = tempCar(r, q.x, q.y, q.a, { model: TANKER });
      for (let d = 95; d <= 185; d += 15) clearAround(r, lane(euro, d, 0), 26, s.truck);
      s.spoor = r.prop('vetspoor', buildFatTrail);
      clearTrail(s.spoor);
      s.lekD = null;
    },
    tick(r, s, t, dt) {
      const v = 19;
      s.d += v * dt;
      const yaw = smooth((t - 0.4) / 1.6) * 0.55;
      const q = lane(euro, s.d, 1.5 + yaw * 3);
      const a = q.a + yaw;
      Object.assign(s.truck, { x: q.x, y: q.y, angle: a, speed: v });
      // a puddle every half metre behind the drain valve (model: 4.22 m behind the centre), flat on the road
      if (t > 0.5 && (s.lekD === null || s.d - s.lekD > 0.5)) {
        s.lekD = s.d;
        const px = q.x - Math.cos(a) * 4.22, py = q.y - Math.sin(a) * 4.22;
        addTrailPuddle(s.spoor, px, py, gz(px, py), 0.28 + Math.random() * 0.3 + Math.min(0.3, (t - 0.5) * 0.12), 1.5, a);
        commitTrail(s.spoor);
      }
      s.q = q; s.a = a;
    },
    cam(u, t, s) {
      const q = s.q, f = Math.cos(q.a), g = Math.sin(q.a);
      // low on the cleared road ahead (the other lane): it slides towards us
      const c = lane(euro, s.d0 + 50, -3.2);
      return { position: P(c.x, c.y, gz(c.x, c.y) + 0.7), lookAt: P(q.x, q.y, 2.0), fov: lerp(44, 40, u), shake: 0.06 };
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

  // evening light on the Diepenring, Tammo and Tessa at the rail
  const boatNear = { x: 454.24, y: -58.47 };
  const sBoat0 = canalNear(boatNear.x, boatNear.y) - 30;
  const boat = {
    voice: [[0.9, 'audio/voicelines/lines/anita/praat_straks_eens_tegen_mij_542cf4c3.mp3', ['verhaal'], 1.5], [2.7, 'audio/voicelines/lines/tammo/straks_624071a2.mp3', ['verhaal'], 0.8]],
    lines: [[0.9, 1.7, 'Anita', 'Praat straks eens tegen mij.', ['verhaal']], [2.7, 1.2, 'Tammo', '…Straks.', ['verhaal']]],
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
  const padC = pad || { x: 745.84, y: -281.52, deck: 20, angle: -0.6606 };
  // low on the roof edge opposite the city: the heli lifts off against the
  // skyline instead of a wide shot over the flat hospital roofs
  const awayA = Math.atan2(padC.y - tower.y, padC.x - tower.x);
  const camAt = (d) => ({ x: padC.x + Math.cos(awayA) * d, y: padC.y + Math.sin(awayA) * d });
  const trauma = {
    label: 'Traumaheli boven het UMCG', cuts: ['vol'], dur: 3.6, clock: 7.2, weather: 'helder', focus: padC,
    caps: [[0.5, 2.7, 'Het staat niet in het rooster.', null, ['vol', 'gameplay']]],
    lines: [[0.0, 3.4, 'Rikus', 'In 1672 hield Stad een bisschop buiten.', ['verhaal']]],
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
  const wheel = { x: 146.44, y: 58.32 };
  const kermisPeds = { x: 160.89, y: 83.25 };
  const kermis = {
    label: 'Kermis op de Grote Markt', cuts: ['vol', 'kort'], dur: 4.0, kort: 3.0, clock: 22.4, weather: 'helder', focus: kermisPeds,
    voice: [[0.2, 'audio/voicelines/lines/rikus/achtentwintig_augustus_gronings__2e7dda33.mp3', ['verhaal'], 7.05]],
    lines: [[0.2, 3.8, 'Rikus', 'Achtentwintig augustus. Gronings Ontzet.', ['verhaal']]],
    caps: [[0.5, 3.0, '28 augustus.', 'Kermis op de Grote Markt', ['vol', 'kort', 'verhaal']], [0.4, 3.2, 'Botsauto’s. Padel. Ballonjacht.', 'Even geen missie', ['gameplay']]],
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
  const poele = polyline([[269.84, 125.76], [305.94, 127.18], [349.02, 125.46], [374.95, 117.99], [415.91, 109.26]]);
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
      // a terrace lamp over him: the street itself is too dark to see him sing
      const f = { x: Math.cos(singer.a), y: Math.sin(singer.a) };
      r.light.position.set(singer.x - f.x * 1.2, 3.1, singer.y - f.y * 1.2 + 0.4);
      r.light.intensity = 26;
    },
    exit(r) { r.light.intensity = 0; },
    cam(u) {
      // down the street onto Durk: he ends up a few metres in front of the lens
      const k = smooth(u), q = poele.at(lerp(30, 62, k));
      const ahead = poele.at(lerp(30, 62, k) + 30);
      const look = { x: lerp(ahead.x, singer.x, k), y: lerp(ahead.y, singer.y, k) };
      return { position: P(q.x, q.y, lerp(3.6, 2.2, k)), lookAt: P(look.x, look.y, lerp(2.0, 1.6, k)), fov: lerp(56, 46, k), shake: 0.04 };
    },
  };

  // carbid schieten in the Ommelanden (24-11, feedback eigenaar): on boer Roelf's yard by the Beijumerweg, the row of churns on
  // trestles with the farm, fence and onlookers behind; one churn goes off, the lid flies into the meadow, smoke and fire
  const veld = CARBID.field();
  // the Ommeland edge north-east of the city (the gameplay shot over the whole map looks that way)
  const box = cityBox(map);
  const land = { x: (box[0] + box[2]) / 2 + 300, y: box[1] - 260 };
  const vc = Math.cos(veld.rot), vs = Math.sin(veld.rot);
  const FW = (u, v) => ({ x: veld.x + vc * u - vs * v, y: veld.y + vs * u + vc * v });
  const KNAL = 1.0;
  const ommeland = {
    label: 'Carbid in de Ommelanden', cuts: ['vol'], dur: 4.0, clock: 20.4, weather: 'helder', focus: FW(-4, 0),
    sfx: [[KNAL, 'knal']],
    prep(r) { r.prop('carbiderf', () => buildCarbidYard(map)); },
    enter(r, s) {
      s.erf = r.prop('carbiderf', () => buildCarbidYard(map));
      s.erf.position.set(veld.x, gz(veld.x, veld.y), veld.y);
      s.erf.rotation.y = -veld.rot;
      s.banged = false;
    },
    tick(r, s, t, dt) {
      const { bus, deksel, thuis, set } = s.erf.userData;
      const k = t - KNAL;
      animateCarbidSet(set, dt || 0, k > 0.3 ? 'clap' : null);
      if (k < 0) { if (deksel.parent !== bus) bus.add(deksel); deksel.position.copy(thuis); deksel.rotation.set(0, 0, -Math.PI / 2); s.banged = false; return; }
      const mond = bus.localToWorld(thuis.clone());
      if (!s.banged) {
        s.banged = true;
        flash(false);
        spawnExplosionFx(mond.x + vc * 0.5, mond.z + vs * 0.5, mond.y, 0x8a9197, 0.75);
        for (let i = 0; i < 18; i++) spawnFxPuff(mond.x, mond.y, mond.z, vc * (2 + Math.random() * 6) + (Math.random() - 0.5) * 2, 0.4 + Math.random() * 1.6, vs * (2 + Math.random() * 6) + (Math.random() - 0.5) * 2, 1.2 + Math.random() * 1.2, 0.35, 1.8, 0.86, 0.85, 0.82, 0.55, 1.4, 0.3);
        for (let i = 0; i < 6; i++) spawnFxPuff(mond.x, mond.y, mond.z, vc * (5 + Math.random() * 4), Math.random(), vs * (5 + Math.random() * 4), 0.18, 0.15, 0.6, 1, 0.75, 0.3, 1, 3, 0, 1);
      }
      if (deksel.parent !== s.erf) s.erf.add(deksel);
      const m = s.erf.worldToLocal(mond.clone());
      const d = dekselOp(k, undefined, { u: m.x, h: m.y });
      deksel.position.set(d.u, d.h, m.z + d.v);
      deksel.rotation.set(d.ligt ? 0 : d.spin, 0.3, d.ligt ? 0 : -Math.PI / 2 + Math.sin(d.spin) * 0.7);
    },
    exit(r, s) { if (s.erf) { const { bus, deksel, thuis } = s.erf.userData; bus.add(deksel); deksel.position.copy(thuis); } },
    cam(u) {
      // low beside the row of churns, the yard and the onlookers behind; after the knal the lens drifts with the lid
      const a = FW(lerp(3.2, 4.4, u), lerp(-7.4, -7.9, u)), l = FW(lerp(-0.5, 3, smooth(Math.max(0, u - 0.3) / 0.7)), -1.2);
      const z = gz(veld.x, veld.y);
      return { position: P(a.x, a.y, z + lerp(1.3, 1.65, u)), lookAt: P(l.x, l.y, z + 0.9), fov: 46, shake: 0.05 };
    },
  };


  // The benchmark's rail stretch (#159): the train nearest the city, from beside the track; falls back to the tower when a build has no trains.
  const spoorTrain = (() => {
    let best = null, bd = Infinity;
    for (const tr of getTrains()) {
      const c = tr.cars && tr.cars[tr.cars.length >> 1];
      if (!c) continue;
      const d = Math.hypot(c.x - tower.x, c.y - tower.y);
      if (d < bd) { bd = d; best = tr; }
    }
    return best;
  })();
  const spoorMid = () => {
    const c = spoorTrain && spoorTrain.cars[spoorTrain.cars.length >> 1];
    return c ? { x: c.x, y: c.y } : { x: tower.x + 60, y: tower.y };
  };
  const spoor = {
    label: 'Langs het spoor', cuts: ['bench'], dur: 3.6, clock: 15.2, weather: 'helder', focus: spoorMid(),
    cam(u) {
      const m = spoorMid(), tr = spoorTrain;
      // along the train (first to last car), the lens a few metres beside it, panning with it
      const a = tr && tr.cars.length > 1 ? Math.atan2(tr.cars[tr.cars.length - 1].y - tr.cars[0].y, tr.cars[tr.cars.length - 1].x - tr.cars[0].x) : 0;
      const side = a + Math.PI / 2, gzm = gz(m.x, m.y);
      return { position: P(m.x + Math.cos(side) * 22 + Math.cos(a) * lerp(-14, 6, u), m.y + Math.sin(side) * 22 + Math.sin(a) * lerp(-14, 6, u), gzm + lerp(3.2, 2.4, u)), lookAt: P(m.x, m.y, gzm + 2), fov: 46, shake: 0.03 };
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
    voice: [[0.5, 'audio/voicelines/lines/oma_trijntje/die_bal_is_gien_geld_jong_die_ba_c28dcac6.mp3', ['verhaal'], 6.0]],
    lines: [[0.5, 5.5, 'Oma Trijntje', 'Die bal is gien geld, jong. Die bal is Grunn. En jij: één zin, hè. Niet zeventig jaar.', ['verhaal']]],
    caps: [[0.6, 4.2, 'Er gaat niets boven Grunn.', null, ['vol', 'kort', 'gameplay']], [0, 0, null, null, ['verhaal']]],
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
    caps: [
      [0.2, 4.0, null, null, ['vol', 'verhaal'], logoHtml() + '<div class="tr-title small tr-tagline">Een zomer in Grunn</div>'],
      [0.2, 4.0, null, null, ['gameplay'], logoHtml() + '<div class="tr-title small tr-tagline">Gratis · Nederlands gesproken</div>'],
    ],
  };

  // after the logo: Berend finds a scratch on his bakkie
  const bqAt = { x: 223.17, y: -30.52 };
  const bq = openSpot(map, bqAt.x, bqAt.y, 14);
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

  // --- the Steam cut: the logo in the first seconds (Steam's microtrailer),
  // then gameplay with the real HUD, then the name cards and the summer ---

  const steamLogo = {
    label: 'Logo vooraf', cuts: ['gameplay'], dur: 3.2, dim: true, card: true, clock: 7.2, clockTo: 7.4, weather: 'helder', focus: square,
    thumb: 1.4,
    caps: [[0.05, 3.05, null, null, null, logoHtml()]],
    cam(u, t) { return sunrise.cam(lerp(0.45, 0.62, u), t); },
  };

  // the game's own chase camera: behind and above, looking past the car
  const followCam = (c, back = 7.4, up = 2.7, fov = 62) => {
    const f = Math.cos(c.angle), g = Math.sin(c.angle), z = gz(c.x, c.y);
    return { position: P(c.x - f * back, c.y - g * back, z + up), lookAt: P(c.x + f * 6, c.y + g * 6, z + 1.0), fov, shake: 0.015 };
  };

  // up the Herestraat towards the Grote Markt in the Escapade: the vehicle
  // badge, the speedo, the minimap and a mission card
  const hudDrive = {
    label: 'Rijden met de HUD', cuts: ['gameplay'], dur: 5.2, hud: true, clock: 10.8, weather: 'helder', focus: lane(here, 60, 0),
    enter(r, s) {
      clearRoad(r, here, 8);
      s.d = 92;
      const q = lane(here, s.d, -0.4);
      s.car = tempCar(r, q.x, q.y, q.a + Math.PI, { hero: true });
      hudPlayer(r, s.car);
      r.w.goal = { name: 'Grote Markt', sub: 'Jelmer wacht', x: 168.69, y: 70.04 };
    },
    tick(r, s, t, dt) {
      const v = lerp(6, 13, smooth(t / 2));
      s.d -= v * dt;
      const q = lane(here, s.d, -0.4);
      Object.assign(s.car, { x: q.x, y: q.y, angle: q.a + Math.PI, speed: v });
      seat(r.actor('tammo'), s.car, true);
      seat(r.actor('anita'), s.car, false);
      hudPlayer(r, s.car);
      if (t > 1.3 && !s.card) {
        s.card = true;
        showHudCard(r.w, { kind: 'missie', title: 'Iets met de Grote Markt', body: 'Jelmer streamt een stuntavond. Rij naar de Grote Markt.', key: 'trailer-h3' });
      }
    },
    cam(u, t, s) { return followCam(s.car, lerp(6.4, 7.6, smooth(u)), 2.6, 60); },
  };

  // the stunt evening on the Grote Markt: parasols and kliko's over, pigeons
  // up, the score panel counting
  const gmAt = { x: 168.69, y: 70.04 };
  const gm = openSpot(map, gmAt.x, gmAt.y, 30);
  const SR = 15;
  const arcAt = (a) => ({ x: gm.x + Math.cos(a) * SR, y: gm.y + Math.sin(a) * SR, angle: a + Math.PI / 2 });
  const STUNT_PROPS = [['parasol', 0.75, 0.9], ['kliko', 1.15, -0.8], ['parasol', 1.55, 1.0], ['parasol', 1.95, -0.9], ['kliko', 2.3, 0.8]];
  const stuntPop = (s, t, text, kind = 'pts') => {
    // stunthud.js's popup, but cleared on trailer time (stuntPopup uses a timer)
    const box = document.querySelector('#hud .stunt-pops');
    if (!box) return;
    const d = document.createElement('div');
    d.className = 'stunt-pop' + (kind === 'pts' ? '' : ' ' + kind);
    const m = /^([+-]\d+)(.*)$/.exec(text);
    if (m) { const b = document.createElement('b'); b.textContent = m[1]; d.append(b, m[2]); } else d.textContent = text;
    d.style.top = `${Math.min(box.children.length, 4) * 26}px`;
    box.appendChild(d);
    s.pops.push({ el: d, until: t + 1.5 });
  };
  const hudStunt = {
    label: 'Stuntavond met de HUD', cuts: ['gameplay'], dur: 5.4, hud: true, clock: 19.7, weather: 'helder', focus: gm,
    prep(r) { STUNT_PROPS.forEach(([kind], i) => r.prop('stunt' + i, () => buildStuntProp(kind, i))); },
    enter(r, s) {
      clearAround(r, gm, 40);
      s.a = 0.2;
      const q = arcAt(s.a);
      s.car = tempCar(r, q.x, q.y, q.angle, { hero: true });
      hudPlayer(r, s.car);
      s.props = STUNT_PROPS.map(([kind, a, off], i) => {
        const m = r.prop('stunt' + i, () => buildStuntProp(kind, i));
        const R = SR + off;
        const x = gm.x + Math.cos(a) * R, y = gm.y + Math.sin(a) * R;
        m.position.set(x, gz(x, y), y);
        m.rotation.set(0, i * 1.3, 0);
        m.userData.top.rotation.set(0, 0, 0);
        m.userData.top.position.set(0, 0, 0);
        return { m, kind, x, y, hit: -1, pts: kind === 'parasol' ? 120 : 80 };
      });
      s.birds = makeBirds(r.group, gm.x + Math.cos(1.75) * (SR + 3), gm.y + Math.sin(1.75) * (SR + 3), 4.5, 48, { avoid: 6 });
      s.score = 380; s.combo = 1; s.lastAt = -9; s.pops = [];
      showStuntHud(2500, [], { hitCost: 250, comboMax: 4, comboS: 3 });
    },
    tick(r, s, t, dt) {
      const v = 11;
      s.a += (v / SR) * dt;
      const q = arcAt(s.a);
      // a little drift: the nose turned into the curve
      Object.assign(s.car, { x: q.x, y: q.y, angle: q.angle + 0.28 * smooth(t / 1.2), speed: v });
      seat(r.actor('tammo'), s.car, true);
      hudPlayer(r, s.car);
      const add = (pts, label) => {
        s.combo = t - s.lastAt < 3 ? Math.min(4, s.combo + 1) : 1;
        s.lastAt = t;
        const got = pts * s.combo;
        s.score += got;
        stuntPop(s, t, `+${got} ${label}`);
        if (s.combo > 1) stuntPop(s, t, `reeks x${s.combo}`, 'combo');
      };
      for (const p of s.props) {
        if (p.hit < 0 && Math.hypot(p.x - s.car.x, p.y - s.car.y) < 2.6) { p.hit = t; add(p.pts, p.kind); }
        if (p.hit >= 0) {
          // tipped over away from the car
          const k = smooth((t - p.hit) / 0.45);
          p.m.rotation.y = -s.car.angle;
          p.m.userData.top.rotation.z = -k * 1.45;
          p.m.userData.top.position.set(k * 1.6, 0, 0);
        }
      }
      if (!s.gone && s.a > 1.6) { s.gone = true; scatterBirds(s.birds, s.car.x, s.car.y); add(150, 'duivenzwerm'); }
      updateBirds(s.birds, dt, t);
      for (const p of s.pops) if (p.el && t > p.until) { p.el.remove(); p.el = null; }
      updateStuntHud(dt, { score: s.score, target: 2500, combo: s.combo, comboLeft: clamp01(1 - (t - s.lastAt) / 3), timeLeft: 74 - t }, true);
    },
    exit(r, s) { for (const p of s.pops || []) if (p.el) p.el.remove(); },
    cam(u, t, s) {
      const c = s.car;
      return followCam({ x: c.x, y: c.y, angle: c.angle - 0.28 }, 8.2, 3.4, 62);
    },
  };

  // the balloon hunt: the trauma heli through a ring over Stad, the arrow
  // pointing at the next one
  const towerDir = Math.atan2(tower.y - padC.y, tower.x - padC.x);
  const heliStart = { x: tower.x - Math.cos(towerDir) * 330, y: tower.y - Math.sin(towerDir) * 330 };
  const heliAt = (d) => ({ x: heliStart.x + Math.cos(towerDir) * d, y: heliStart.y + Math.sin(towerDir) * d });
  const HELI_Z = 58;
  const RINGS = [[52, 60], [128, 66], [200, 61]];
  const hudHeli = {
    label: 'Heli door de ringen', cuts: ['gameplay'], dur: 5.0, hud: true, clock: 18.2, weather: 'helder', focus: heliAt(90),
    enter(r, s) {
      document.body.classList.add('trailer-heli');
      s.h = pad ? scriptHeli(r.w) : null;
      s.d = 0;
      s.kit = heliTrailerKit();
      s.rings = RINGS.map(([d, z]) => {
        const q = heliAt(d);
        const m = new THREE.Mesh(s.kit.ringGeo, s.kit.ringMats.later);
        m.position.set(q.x, z, q.y);
        m.rotation.y = -towerDir + Math.PI / 2;
        r.group.add(m);
        return { m, d, z, x: q.x, y: q.y, done: false };
      });
      s.hit = 3;
      const h = s.kit.hud;
      if (h) {
        h.root.hidden = false;
        h.title.textContent = 'BALLONJACHT';
        h.help.style.opacity = '0';
        h.guide.hidden = false;
      }
      hudPlayer(r, null, { ...heliAt(0), angle: towerDir });
    },
    tick(r, s, t, dt) {
      const v = 30;
      s.d += v * dt;
      const q = heliAt(s.d), z = HELI_Z + Math.sin(t * 0.9) * 1.5;
      if (s.h) Object.assign(s.h, { x: q.x, y: q.y, z, heading: towerDir, pitch: 0.14, bank: Math.sin(t * 0.7) * 0.05, rotor: 1 });
      hudPlayer(r, null, { ...q, angle: towerDir });
      const next = s.rings.find((g) => !g.done && s.d <= g.d);
      for (const g of s.rings) {
        if (!g.done && s.d > g.d) { g.done = true; s.hit++; s.msgUntil = t + 0.9; }
        g.m.material = g.done ? s.kit.ringMats.done : g === next ? s.kit.ringMats.next : s.kit.ringMats.later;
      }
      const h = s.kit.hud;
      if (!h) return;
      const set = (k, text) => { if (h.vals[k] && h.vals[k].textContent !== text) h.vals[k].textContent = text; };
      const left = 283 - t;
      set('time', `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`);
      set('speed', `${Math.round(v * 3.6)} km/u`);
      set('rings', `${s.hit}/11`);
      set('dist', `${(1.4 - s.d / 1000).toFixed(1).replace('.', ',')} km`);
      set('score', String(300 + (s.hit - 3) * 100));
      h.msg.textContent = 'Ring!';
      h.msg.classList.toggle('on', t < (s.msgUntil || 0));
      const ground = gz(q.x, q.y);
      h.altMe.style.top = `${(1 - (z - ground) / 130) * 100}%`;
      h.altBal.style.top = `${(1 - 80 / 130) * 100}%`;
      h.altLbl.textContent = `${Math.round(z - ground)} m`;
      h.altRing.style.display = next ? '' : 'none';
      if (next) {
        h.altRing.style.top = `${(1 - next.z / 130) * 100}%`;
        const rel = Math.atan2(next.y - q.y, next.x - q.x) - towerDir + Math.sin(t * 1.3) * 0.12;
        h.arrow.style.transform = `rotate(${(rel * 180 / Math.PI + 90).toFixed(1)}deg)`;
        const dz = next.z - z;
        const hint = dz > 4 ? '<span class="up">▲ hoger</span>' : dz < -4 ? '<span class="down">▼ lager</span>' : 'hoogte goed';
        h.goal.innerHTML = `Vlieg door de ringen<small>Ring ${s.hit + 1}/11 · ${Math.max(10, Math.round((next.d - s.d) / 10) * 10)} m · ${hint}</small>`;
      }
    },
    exit(r) { if (r.w.skyHeli && r.w.skyHeli.phase === 'scripted') r.w.skyHeli = null; },
    cam(u, t, s) {
      const q = heliAt(s.d), f = Math.cos(towerDir), g = Math.sin(towerDir);
      return { position: P(q.x - f * 17, q.y - g * 17, HELI_Z + 6.5), lookAt: P(q.x + f * 20, q.y + g * 20, HELI_Z - 1), fov: 60, shake: 0.03 };
    },
  };

  // a three-star chase through the centre from behind the wheel: the stars,
  // "Ontsnap aan de politie", the police on the minimap
  const hudChase = {
    label: 'Achtervolging met de HUD', cuts: ['gameplay'], dur: 5.4, hud: true, clock: 21.4, weather: 'motregen', focus: chaseRoad.at(150),
    enter(r, s) {
      chase.enter(r, s);
      r.w.wanted = 3;
      hudPlayer(r, s.car);
    },
    tick(r, s, t, dt) {
      chase.tick(r, s, t, dt);
      hudPlayer(r, s.car);
    },
    exit(r, s) { chase.exit(r, s); },
    cam(u, t, s) { return followCam(s.car, 8.6, 3.0, 64); },
  };


  // the whole map from high over the Ommeland edge at noon, a text card over it
  const toLand = Math.atan2(land.y - tower.y, land.x - tower.x);
  const cityFrom = (u) => ({ x: tower.x + Math.cos(toLand + 0.25 - u * 0.12) * 470, y: tower.y + Math.sin(toLand + 0.25 - u * 0.12) * 470 });
  const gpCity = {
    label: 'Stad en Ommeland', cuts: ['gameplay'], dur: 3.0, clock: 13.0, weather: 'helder', focus: cityFrom(0.5),
    caps: [[0.25, 2.6, 'Een hele stad. Een heel Ommeland.']],
    cam(u) {
      const c = cityFrom(u);
      return { position: P(c.x, c.y, lerp(115, 100, u)), lookAt: P(tower.x, tower.y, 10), fov: 50, shake: 0.02 };
    },
  };

  // a bijbaan: Hap & Rap delivering along the Fjord road at noon
  const hudJob = {
    label: 'Bijbaantje met de HUD', cuts: ['gameplay'], dur: 4.0, hud: true, clock: 12.6, weather: 'helder', focus: lane(fjordRoad, 80, 0),
    enter(r, s) {
      clearRoad(r, fjordRoad, 8);
      s.d = 40;
      const q = lane(fjordRoad, s.d, 1.6);
      s.car = tempCar(r, q.x, q.y, q.a, { model: { ...MODELS[8], color: '#c9541e' } });
      hudPlayer(r, s.car);
      r.w.sideJob = { active: true, goal: { label: 'Bezorg bij de Oosterpoort', desc: '' }, progress: 'Hap & Rap · 3/5', timeLeft: 44, dots: [], marker: { x: 469.69, y: 1063.69 } };
    },
    tick(r, s, t, dt) {
      const v = 12;
      s.d += v * dt;
      const q = lane(fjordRoad, s.d, 1.6);
      Object.assign(s.car, { x: q.x, y: q.y, angle: q.a, speed: v });
      seat(r.actor('anita'), s.car, true);
      hudPlayer(r, s.car);
      r.w.sideJob.timeLeft = 44 - t;
    },
    exit(r) { r.w.sideJob = null; },
    cam(u, t, s) { return followCam(s.car, 7.6, 2.8, 60); },
  };

  // the unfolded phone on Te doen › Dichtbij, in a car in the Poelestraat
  const hudPhone = {
    label: 'Telefoon: dichtbij te doen', cuts: ['gameplay'], dur: 4.0, hud: true, clock: 14.2, weather: 'helder', focus: poele.at(40),
    enter(r, s) {
      s.d = 10;
      const q = lane(poele, s.d, -1.4);
      s.car = tempCar(r, q.x, q.y, q.a, { hero: true });
      hudPlayer(r, s.car);
      r.w.goal = { name: 'Grote Markt', sub: 'Jelmer wacht', x: 168.69, y: 70.04 };
    },
    tick(r, s, t, dt) {
      const v = lerp(5, 0, smooth(t / 1.5));
      s.d += v * dt;
      const q = lane(poele, s.d, -1.4);
      Object.assign(s.car, { x: q.x, y: q.y, angle: q.a, speed: v });
      seat(r.actor('tammo'), s.car, true);
      hudPlayer(r, s.car);
      if (t > 0.7 && !s.open) { s.open = true; try { trailerPhone('ubbo'); } catch (e) { console.warn('trailer phone', e); } }
    },
    exit() { try { trailerPhone(null); } catch (e) { /* ignore */ } },
    cam(u, t, s) { return followCam(s.car, lerp(7.2, 6.2, smooth(u)), 2.5, 58); },
  };

  // a day over Stad in three seconds: morning to night
  const timelapse = {
    label: 'Dag en nacht', cuts: ['gameplay'], dur: 3.4, clock: 9.0, clockTo: 22.6, weather: 'helder', focus: tower,
    caps: [[0.2, 1.9, 'Dag en nacht.']],
    cam(u) { return aerialPose(1.5 + u * 1.5); },
  };

  // --- gameplay cut: the mission types, two seconds each, with the HUD ---

  // the HUD's objective panel as in a mission ("title · sub")
  const missionHud = (r, text) => { r.w.mission = { ...(r.savedMission || {}), phase: 'active', type: 'trailer', progressText: text, raceHud: null, remainingWaypoints: [], marker: { x: -1e5, y: -1e5, z: -500 }, timeLeft: null }; };
  // an existing shot as a gameplay shot: no name card or lines, the HUD on
  const asMission = (base, obj, extra = {}) => ({
    ...base, freezeAt: undefined, name: undefined, lines: undefined, voice: undefined, caps: [], cuts: [], hud: true,
    enter(r, s) {
      if (base.enter) base.enter.call(this, r, s);
      missionHud(r, obj);
      hudPlayer(r, s.car || null, s.car || { ...base.focus, angle: base.focus.a ?? 0 });
    },
    tick(r, s, t, dt) {
      if (base.tick) base.tick.call(this, r, s, t, dt);
      if (s.car) hudPlayer(r, s.car);
    },
    ...extra,
  });
  const bikeModel = (fat) => TRAFFIC_MODELS().find((m) => m.name === 'bike' && !!m.fat === fat) || MODELS[0];
  // a pack along a path (road: lane offsets; water: canalAt), the first one is you
  const ride = (o) => ({
    label: o.label, cuts: [], dur: 2.2, hud: true, clock: o.clock ?? 12.5, weather: 'helder', focus: o.at(o.d0 + 15, 0),
    enter(r, s) {
      if (o.road) clearRoad(r, o.road, 9);
      s.d = o.d0;
      s.pack = o.pack.map(([model, dd, off], i) => {
        const q = o.at(s.d + dd, off);
        return tempCar(r, q.x, q.y, q.a, { model: model === 'hero' ? null : model, hero: model === 'hero', boat: !!o.water });
      });
      s.car = s.pack[0];
      missionHud(r, o.obj);
      hudPlayer(r, s.car);
    },
    tick(r, s, t, dt) {
      s.d += o.v * dt;
      s.pack.forEach((c, i) => {
        const [, dd, off] = o.pack[i];
        const q = o.at(s.d + dd + Math.sin(t * 1.3 + i) * 0.6 * i, off + (i ? Math.sin(t * 0.9 + i * 2) * 0.3 : 0));
        Object.assign(c, { x: q.x, y: q.y, angle: q.a, speed: o.v });
      });
      if (!s.car.isBike && !o.water) seat(r.actor('tammo'), s.car, true);
      hudPlayer(r, s.car);
    },
    cam(u, t, s) { return followCam(s.car, o.back ?? 7.4, o.up ?? 2.7, 60); },
  });
  const onRoad = (road) => (d, off) => lane(road, d, off);
  const onCanal = (d) => canalAt(d);

  const gH1 = ride({ label: 'H1: Berends bakkie', road: fjordRoad, at: onRoad(fjordRoad), d0: 30, v: 11, clock: 10.2,
    pack: [[BAKKIE, 0, 1.6]], obj: 'Breng Berends bakkie naar het Boterdiep · geen krassen' });
  const gH2 = asMission(anita, 'Rol de pinautomaat naar het busje · niet te hard', { label: 'H2: De pinautomaat', dur: 2.0 });
  const gH4 = asMission(pigeon, 'Kiek het museum van boven · foto 2/3', { label: 'H4: Duif boven Stad' });
  const gH5 = ride({ label: 'H5: KEI-race', road: here, at: onRoad(here), d0: 30, v: 6.5, clock: 11.5, back: 4.2, up: 1.9,
    pack: [[bikeModel(false), 0, 1.0], [bikeModel(false), 3.5, -0.4], [bikeModel(false), 6, 1.6], [bikeModel(false), 9, 0.2], [bikeModel(false), -3, 2.0]], obj: 'KEI-race · Positie 3/6 · Controlepunt 4/9' });
  const gH7 = ride({ label: 'H7: Decor naar Noorderzon', road: chaseRoad, at: onRoad(chaseRoad), d0: 60, v: 9, clock: 15.5,
    pack: [[{ ...MODELS[9], color: '#2f6a8a' }, 0, 1.8]], obj: 'Breng het decor naar Noorderzon · niets laten vallen' });
  const gH12 = ride({ label: 'H12: Fatbikes', road: poele, at: onRoad(poele), d0: 5, v: 8, clock: 16.5,
    pack: [['hero', 0, 0.0], [bikeModel(true), 9, 1.4], [bikeModel(true), 12, -1.2], [bikeModel(true), 16, 0.6], [bikeModel(true), 20, -0.4]], obj: 'De fatbikes uit de straat · Geschept: 3/8' });
  const gH14 = ride({ label: 'H14: Het skûtsje', water: true, at: onCanal, d0: sBoat0 - 20, v: 4.5, clock: 17.2, back: 9, up: 3.4,
    pack: [[BOAT_KINDS.sloep, 0, 0], [BOAT_KINDS.skutsje, 16, 0]], obj: 'Ga langszij bij het skûtsje' });
  const gH18 = asMission(jelle, 'Achter de trekker-limo aan · hij mag niet weg', { label: 'H18: De trekker-limo', slow: undefined });
  const gTwins = { ...twins, freezeAt: undefined, name: undefined, cuts: [], label: 'Botsauto’s' };

  const all = { radio, sunrise, vismarkt, plantsoen, anita, tammo, escapade, jelle, twins, pigeon, vitrine, chase, race, bijna, tanker, storm, boat, trauma, kermis, night, ommeland, spoor, aerial, logo, berend, steamLogo, gpCity, hudDrive, hudChase, hudHeli, hudStunt, hudJob, hudPhone, timelapse, gH1, gH2, gH4, gH5, gH7, gH12, gH14, gH18, gTwins };
  for (const [id, shot] of Object.entries(all)) shot.id = id;
  return Object.values(all);
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

// The Gouden Eierbal in its case, with a warm glow round it (a sprite).
function vitrineRoom(r) {
  return r.prop('vitrine', () => {
    const room = buildVitrineRoom();
    const tex = canvasTexture(128, 128, (c, w, h) => {
      const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(255, 214, 120, 1)'); g.addColorStop(0.35, 'rgba(255, 184, 60, 0.45)'); g.addColorStop(1, 'rgba(255, 160, 40, 0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    });
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.setScalar(0.9);
    glow.position.set(0, 1.29, 0);
    room.add(glow);
    room.userData.glow = glow;
    // the museum room has no environment to reflect: a warmer, self-lit gold
    room.userData.ball.material = new THREE.MeshStandardMaterial({ color: 0xf0bc3a, metalness: 0.35, roughness: 0.3, emissive: 0xb07a14, emissiveIntensity: 0.75 });
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

// #797: de acteurs en props worden per traject opgebouwd en in trailerProps bewaard. Tot het einde van
// het traject (en dus over trajecten heen) bleven ze aan die map hangen; clearShot haalde ze alleen uit de
// groep. Hier geven we ze bij het einde terug: gewone objecten via scene3d.disposeObject (dat ook de
// gedeelde personengeometrie van makeActor teruggeeft), instanced meshes via hun eigen dispose.
function disposeTrailerProp(o) {
  if (!o) return;
  try { o.removeFromParent(); } catch (e) { /* al weg */ }
  if (o.isInstancedMesh) { try { o.dispose(); } catch (e) { /* al weg */ } return; }
  disposeObject(o);
}
function disposeTrailerProps() {
  for (const o of trailerProps.values()) { try { disposeTrailerProp(o); } catch (e) { /* al weg */ } }
  trailerProps.clear();
}

// --- runtime --------------------------------------------------------------------------------

let running = null;
const trailerProps = new Map();

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

// The script cuts (trailerplan.js) bring their own captions, lines, voices and
// sounds per beat; the shot's own stay silent there. A beat in the shape the
// frame loop reads: caps [at, dur, title, kicker, cuts, html, fx].
function planBeat(b) {
  const caps = (b.caps || []).map((c) => {
    if (c.kind === 'plakjes') return [c.at, c.dur, null, null, null, `<div class="tr-kicker">${c.kicker}</div><div class="tr-title">${c.title}</div><div class="tr-slices">${'<i></i>'.repeat(SLICES)}</div>`, { strike: c.strike }];
    if (c.kind === 'radio') return [c.at, c.dur, null, null, null, `<div class="tr-kicker">${c.kicker}</div><div class="tr-radio">${c.title}</div>`];
    if (c.kind === 'eind') return [c.at, c.dur, null, null, null, `${logoHtml()}<div class="tr-title small tr-tagline tight">${c.tagline}</div>${c.small ? `<div class="tr-info">${c.small}</div>` : ''}`];
    return [c.at, c.dur, c.title, c.kicker];
  });
  return { plain: !!b.plain, caps, lines: b.lines || [], voice: (b.voice || []).map(([at, src, dur]) => [at, src, null, dur]), sfx: b.sfx || [] };
}
const beatOf = (r, s) => (r.beats && r.beats.get(s)) || null;

// a cut's own length (kort: 3.0, or from CUT_ORDER) plays the same motion faster or slower
function shotDur(r, s) {
  return (r.durs && r.durs.get(s)) || (r.cut === 'kort' && s.kort) || s.dur;
}

// The black overlay, eased over trailer time.
function blackAt(r) {
  const b = r.black;
  return b.dur > 0 ? lerp(b.from, b.to, clamp01((r.T - b.t0) / b.dur)) : b.to;
}
function setBlack(r, to, dur) {
  r.black = { from: blackAt(r), to, t0: r.T, dur };
}

// The player as the HUD sees it in a gameplay shot (in, where to put them).
function hudPlayer(r, v, at = v) {
  const p = hoofdspeler(r.w);
  p.inVehicle = v || null;
  if (at) { p.x = at.x; p.y = at.y; p.angle = at.angle ?? p.angle; r.w.camYaw = p.angle; }
}
function endHudShot(r) {
  const p = hoofdspeler(r.w), s = r.savedPlayer;
  Object.assign(p, s);
  r.w.camYaw = r.savedCamYaw;
  r.w.wanted = 0;
  r.w.goal = null;
  r.w.sideJob = null;
  r.w.mission = r.savedMission;
  hideStuntHud();
  const kit = heliTrailerKit();
  if (kit.hud) kit.hud.root.hidden = true;
  document.body.classList.remove('trailer-heli');
  try { trailerPhone(null); } catch (e) { /* ignore */ }
}

// CSS animations and transitions in the HUD run on the trailer clock in a
// recording, so the fixed-step export shows them as they play live.
function stepHudAnimations(dt) {
  const roots = [document.getElementById('hud'), document.getElementById('heli-hud')].filter(Boolean);
  for (const a of document.getAnimations()) {
    const el = a.effect && a.effect.target;
    if (!el || !roots.some((h) => h.contains(el))) continue;
    if (a.playState === 'running') a.pause();
    a.currentTime = (a.currentTime || 0) + dt * 1000;
  }
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
  if (BENCH_RUNS) {
    let pend = null;
    try { pend = streamPending(); } catch (e) { /* geen meting */ }
    console.log(`[trailer] enter ${i + 1} at ${(performance.now() / 1000).toFixed(2)} pending ${pend ? `gebouwen ${pend.buildings} wegen ${pend.roads}` : '-'}`);
  }
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
  if (r.hudTouched) { r.hudTouched = false; endHudShot(r); }
  if (s.hud) r.hudTouched = true;
  document.body.classList.toggle('trailer-hud', !!s.hud);
  ui.root.classList.toggle('hudshot', !!s.hud);
  w.cinematicHideNav = !s.hud;
  if (s.black) {
    setBlack(r, 1, 0.12);
    streamNext(r, i);
  } else {
    const wasBlack = !prev || prev.black || prev.fadeOut;
    setBlack(r, s.dim ? 0.55 : 0, s.dim ? 0.9 : 0.35);
    if (!wasBlack && !s.keep) flash();
    if (s.focus) r.env.relocate(s.focus.x, s.focus.y);
    if (s.clock != null) setClock(w, s.clock);
    forceWeather(w, s.weather);
  }
  if (s.enter) { try { s.enter(r, r.state); } catch (e) { console.error('trailer enter', s.label, e && e.stack); } }
  r.stats[i] = r.stats[i] || { label: s.label, id: s.id, ms: [] };
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
  // #1052: the tiles round the next place are asked for a shot ahead (nearest first, in the normal frame budget), not after the cut
  if (nx && nx.focus && r.tilesAsked !== i + 1 && r.T > r.starts[i + 1] - 5) {
    r.tilesAsked = i + 1;
    if (r.w.map && r.w.map.warmAhead) r.w.map.warmAhead(nx.focus.x, nx.focus.y, { token: 'trailer', budgetMs: 4000 });
  }
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
  const ov = beatOf(r, s);
  const freezeAt = ov && ov.plain ? null : s.freezeAt;
  const frozen = freezeAt != null && st >= freezeAt;
  const wt = frozen ? freezeAt : st;
  const slow = frozen ? 0 : s.slow ? s.slow(st) : 1;
  const sdt = dt * slow;
  const w = r.w;
  if (frozen && !r.state.froze) { r.state.froze = true; flash(); }
  for (const [at, key, cuts] of ov ? ov.voice : s.voice || []) if ((!cuts || cuts.includes(r.cut)) && st >= at && !r.state['v' + at]) { r.state['v' + at] = true; if (!r.video) playVoice(key); }
  for (const [at, kind] of ov ? ov.sfx : s.sfx || []) if (st >= at && !r.state['x' + at]) { r.state['x' + at] = true; if (!r.video) playSfx(kind); }
  // fadeOut: the shot ends on black, and the next location streams in there
  if (s.fadeOut && !r.state.faded && st > s.dur - s.fadeOut) { r.state.faded = true; setBlack(r, 1, 0.4); }
  ui.black.style.opacity = blackAt(r).toFixed(3);
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
  for (const c of ov ? ov.caps : s.caps || []) {
    const [at, d, title, kicker, cuts, html, fx] = c;
    if (cuts && !cuts.includes(r.cut)) continue;
    if (st >= at && st < at + d && (title || html)) { cap = { title: title || '', kicker, html, small: (title || '').length > 18 }; capP = (st - at) / d; if (html) cap.title = html; if (fx) { cap.strike = fx.strike; cap.ap = st - at; } }
  }
  showCard(cap, capP);
  if (ov ? ov.lines.length : s.lines) setSub((ov ? ov.lines : s.lines).find(([at, d, , , cuts]) => (!cuts || cuts.includes(r.cut)) && st >= at && st < at + d) || null);
  if (s.name && !(ov && ov.plain)) showName(st >= s.name.at ? s.name : null, (st - s.name.at) / Math.max(0.1, s.dur - s.name.at));

  let pose = null;
  if (r.gate) pose = r.gate.pose;
  else if (s.black) pose = r.blackPose || r.pose;
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
  if (s.hud) {
    try { updateHud(frozen ? 0 : sdt * k, w); } catch (e) { if (!r.hudWarned) { r.hudWarned = true; console.warn('trailer hud', e); } }
    if (r.mode === 'opname') stepHudAnimations(frozen ? 0 : dt);
  }
  if (r.countCalls) { r.stats[i].calls = (r.stats[i].calls || 0) + r.countCalls.n; r.stats[i].frames = (r.stats[i].frames || 0) + 1; }

  if (r.mode === 'benchmark') {
    // title cards are not measured, also when a picture runs behind them
    if (!s.black && !s.card && !frozen && !r.gate && st / k > benchMeasureAfter(i)) r.stats[i].ms.push(realMs);
    // the JS heap during the run (#379): one sample a second, the card shows the peak
    if (r.heap && r.T - r.heap.at >= 1) { r.heap.at = r.T; r.heap.peak = heapPeak([r.heap.peak, heapMb()]); }
    r.fpsAcc += realMs; r.fpsN++;
    if (r.fpsAcc > 500) {
      ui.fps.textContent = `BENCHMARK${r.label ? ` · ${r.label}` : ''} · ${Math.round(1000 / (r.fpsAcc / r.fpsN))} fps`;
      if (r.shots.length > 1) { ui.prog.textContent = `Scène ${i + 1} van ${r.shots.length} · ${s.label}`; ui.progBar.style.setProperty('--ds-z-w', `${Math.round(100 * Math.min(1, r.T / Math.max(1, r.total)))}%`); }
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
    const ov = beatOf(r, s);
    for (const [at, key, cuts, dur] of ov ? ov.voice : s.voice || []) {
      if (cuts && !cuts.includes(r.cut)) continue;
      sheet.voices.push({ src: TRAILER_VOICE[key] || key, at: t0 + at / k });
      // the theme dips under a story line (not as deep as under the boat)
      if (dur) sheet.duck.push([t0 + at / k - 0.15, t0 + at / k + dur + 0.2, 0.5]);
    }
    for (const [at, kind] of ov ? ov.sfx : s.sfx || []) sheet.sfx.push({ kind, at: t0 + at / k });
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
  const fs = frameStats(all);
  // #379: the highest JS heap of the run (a sample a second) plus the end; 0
  // when the browser has no performance.memory
  const heapNow = heapMb();
  const heap = r.heap ? heapPeak([r.heap.start, r.heap.peak, heapNow]) : heapNow;
  const play = playStats(r.stats.filter(Boolean));
  const live = r.stats.filter(Boolean);
  return { rep: frameReport(all), series: fpsSeries(live), play, avg: 1000 / mean, low: 1000 / worst, low1: fs.low1, p95: fs.p95, slow33: fs.slow33, hitches: routeHitches(r.stats.filter(Boolean)), cats: categoryStats(r.stats.filter(Boolean)), memory: heap, memoryNow: heapNow, heaviest: shots[0] || null, frames: all.length, shots, spikes };
}

// runTrailer(world, { mode, cut, shot, frames, env: { tick, render, relocate } })
// resolves with { skipped, aborted, stats, continuation }.
export function runTrailer(world, { mode = 'opname', cut = 'vol', shot = null, frames = false, env, label = '', commentary = null }) {
  if (running) return Promise.resolve({ skipped: true, aborted: true });
  ensureUi();
  return new Promise((resolve) => {
    const built = buildShots(world);
    const durs = new Map();
    const beats = new Map();
    const planned = PLAN_CUTS.includes(cut) ? PLAN[cut].beats : null;
    const all = planned ? planned.map((b) => { const s = built.find((x) => x.id === b.shot); if (!s) throw new Error(`trailer: onbekende shot ${b.shot}`); durs.set(s, b.dur); beats.set(s, planBeat(b)); return s; }) : CUT_ORDER[cut] ? CUT_ORDER[cut].map(([id, d]) => { const s = built.find((b) => b.id === id); durs.set(s, d); return s; }) : built.filter((s) => s.cuts.includes(cut));
    const shots = shot != null && all[shot - 1] ? [all[shot - 1]] : all;
    // the film route's commentary (Tammo and Tessa): subtitles on the shots, [at, dur, who, text]; the beat of a plan cut stays untouched
    if (commentary) for (const sh of shots) if (commentary[sh.id]) sh.lines = commentary[sh.id];
    const starts = [];
    let total = 0;
    const r = { w: world, env, mode, cut, durs, beats, shots, starts, idx: -1, gate: null, gated: new Set(), gates: [], state: {}, cars: [], T: 0, pose: null, stats: [], fpsAcc: 0, fpsN: 0, done: false, camIdx: 0, black: { from: 1, to: 1, t0: 0, dur: 0 }, heap: mode === 'benchmark' ? { start: heapMb(), peak: 0, at: 0 } : null };
    const pl = hoofdspeler(world);
    r.savedPlayer = { x: pl.x, y: pl.y, angle: pl.angle, inVehicle: pl.inVehicle || null };
    r.savedCamYaw = world.camYaw;
    r.savedMission = world.mission;
    for (const s of shots) { starts.push(total); total += shotDur(r, s); }
    r.total = total;
    const group = new THREE.Group();
    group.name = 'trailer';
    getScene().add(group);
    r.group = group;
    // one light for the whole run (dark until a shot uses it): adding or
    // removing a light mid-run would recompile every material. perf-r3 (24-11): it borrows a lamp of the night rig (setlights.js),
    // so the light count stays that of the game: an extra light gave every lit material a second program in the benchmark
    r.light = adoptSetLight(new THREE.PointLight(0xffb066, 0, 14, 1.4));
    getScene().add(r.light);
    // actors and props are built once per session and hidden between shots
    disposeTrailerProps(); // #797: een vorig traject dat niet netjes eindigde, laat hier niets achter
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
    setTrailerRunning(true);
    // #1052: the benchmark measures the scenes; the placement windows (tiles all over the province) wait until it is over
    if (mode === 'benchmark') { r.bgHeld = true; holdBackground(true); }
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
    ui.root.classList.toggle('skippable', mode === 'attract' || mode === 'preview');
    // recordings: nothing of the app in the picture (no cursor, no skip hint, no counter)
    document.body.classList.toggle('trailer-rec', mode === 'opname');
    ui.skip.style.setProperty('--hold', '0');
    ui.skip.classList.remove('holding');
    ui.fps.textContent = 'BENCHMARK' + (label ? ` · ${label}` : '');
    r.label = label;
    ui.black.classList.add('on');
    ui.black.style.transition = 'none';
    ui.black.style.opacity = '1';
    ui.root.classList.add('on');
    hidePigeonSpots(true);
    // props and extra actors are built under the opening black, not on their cut
    for (const s of shots) if (s.prep) { try { s.prep(r); } catch (e) { console.error('trailer prep', s.label, e && e.stack); } }
    for (const o of group.children) if (o.userData.trailerActor) o.visible = false;
    // desktop --trailer-video: main.js pipes every frame into ffmpeg and mixes
    // the sound from this sheet (the page itself stays quiet)
    r.video = !!(frames && Q.video && window.gdeDesktop && window.gdeDesktop.videoBegin);
    const begun = r.video ? window.gdeDesktop.videoBegin(soundSheet(r)).catch(() => false) : null;
    console.log(`[trailer] ${mode}, ${cut}: ${shots.length} shots, ${total.toFixed(1)} s`);

    let holdSince = null;
    let swallow = false;
    let frozen = null;
    let padOff = null;
    const onKey = (e) => {
      if (e.key === ' ') {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (e.type === 'keyup') { holdSince = null; swallow = false; return; }
        if (e.repeat || swallow) return;
        swallow = true;
        if (mode === 'attract' || mode === 'preview') holdSince = performance.now();
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
      r.w.cineJumpLoading = false;
      if (padOff) padOff();
      if (BENCH_RUNS) logShot(r, r.idx);
      if (nativeRender) ren.render = nativeRender;
      setThemeDuck(false);
      stopVoices();
      hidePigeonSpots(false);
      const last = r.shots[r.idx];
      if (last && last.exit) { try { last.exit(r, r.state); } catch (e) { /* ignore */ } }
      clearShot(r);
      group.removeFromParent();
      r.light.removeFromParent();
      disposeTrailerProps(); // #797: acteurs en props van dit traject geven hun geometrie terug
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
      ui.root.classList.remove('skippable', 'bench', 'hudshot');
      if (r.hudTouched) endHudShot(r);
      document.body.classList.remove('trailer-hud', 'trailer-rec');
      ui.black.classList.remove('dim', 'fade');
      ui.black.classList.toggle('on', blackAt(r) > 0.5);
      ui.black.style.opacity = '';
      ui.black.style.transition = '';
      running = null;
      setTrailerRunning(false);
      if (r.bgHeld) { r.bgHeld = false; holdBackground(false); }
      const stats = mode === 'benchmark' ? computeStats(r) : null;
      if (stats) console.log('[trailer] benchmark', JSON.stringify({ avg: +stats.avg.toFixed(1), low: +stats.low.toFixed(1), spikesPerMin: stats.spikes, heapMb: Math.round(stats.memory), shots: stats.shots.map((x) => `${x.label}: ${x.fps.toFixed(1)}`) }));
      if (window.__trailer) window.__trailer.lastStats = stats;
      resolve({ skipped, aborted, stats, continuation: handOff ? last.continuation() : null, pose: r.pose });
    };
    r.end = end;
    // the benchmark stops on a controller too: B or Start (the ESC hint in the
    // corner), through gamepad.js so the press does not reach the menu (#379)
    if (mode === 'benchmark') padOff = onBenchmarkStop(() => end(true, true));

    let last = performance.now();
    const loop = (now) => {
      if (r.done) return;
      const realMs = Math.min(250, now - last);
      last = now;
      const dt = mode === 'opname' ? STEP : Math.min(0.1, realMs / 1000);
      const hold = frozen && r.T >= frozen.T;
      const gated = mode === 'benchmark' && FLAGS.benchwacht !== '0' && !hold && benchGate(now, dt);
      if (!hold && !gated) r.T += dt;
      if (r.T >= total) { end(false); return; }
      probe.begin(now);
      try { frame(r, hold ? 0 : dt, realMs); } catch (e) { console.error('trailer', r.shots[r.idx] && r.shots[r.idx].label, e && e.stack); }
      if (gated) ui.black.style.opacity = '1';
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
      if (frames && window.gdeDesktop && window.gdeDesktop.captureFrame) {
        r.frameNo = (r.frameNo || 0) + 1;
        window.gdeDesktop.captureFrame(r.frameNo).then(() => requestAnimationFrame(loop), () => requestAnimationFrame(loop));
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
      prop: (name) => trailerProps.get(name) || null,
    };
    // A cut that opens on a picture (steam) streams its first place in under
    // the black before the clock starts: frame() at T = 0 enters the shot
    // and poses the camera, the black stays up.
    // 22-11: a benchmark (every preset, also the probe shots) starts its clock only when the world round the first place is settled
    // (benchsettle.js: tiles in, queue empty, nothing left to build, a calm stretch); the first measured run used to start on a world
    // that was still streaming in, which made the first preset look worse than the later ones. The wait is not measured (the black is up).
    // wat er rond een plek nog moet komen (tegels, wachtrij, gebouwen, wegen, plaatsingsring): de klaar-regel van warm() en van de poort tussen shots
    const placeQuery = (f) => () => {
      const m = r.w.map;
      const q = { tilesMissing: 0, prewarmPending: 0, buildings: 0, roads: 0, queue: 0 };
      try { if (m && m.store && m.store.keysAround) q.tilesMissing = m.store.missing(m.store.keysAround(f.x, f.y, WARM.tileRadiusM)).length; } catch (e) { /* geen tegelmeting */ }
      try { if (m && m.tileQueue && m.tileQueue.items) q.queue = queueNear(m.tileQueue.items, f, WARM.tileRadiusM); } catch (e) { /* idem */ }
      try { q.prewarmPending = prewarmPending(); } catch (e) { /* idem */ }
      try { const sp = streamPending(); q.buildings = sp.buildings; q.roads = sp.roads; } catch (e) { /* idem */ }
      return q;
    };
    // 24-11 (pop-in in de benchmark): een shot op een nieuwe plek begint pas als de wereld daar staat. De klok van de route houdt vlak voor de cut
    // stil onder zwart terwijl de camera al op de nieuwe plek staat (de streamfocus volgt de camera, niet de speler); de wachttijd wordt niet
    // gemeten (r.gate: geen frametijden). Zelfde klaar-regel als de start (benchsettle.js), met een korter tijdvenster.
    const GATE = { minMs: 900, calmMs: 700, maxMs: 5000 };
    const benchGate = (now, dt) => {
      if (r.gate) {
        // de trailer tekent via env.render (main.js render), niet via de spellus: daar loopt map.follow niet en bleef de tegelrij staan
        // (68 tot 186 wachtende rijen in de census-run). Onder het zwart werkt de poort de rij zelf af, rond de plek van het volgende shot.
        try { if (r.w.map && r.w.map.follow) r.w.map.follow(r.gate.f.x, r.gate.f.y, {}, 8); } catch (e) { /* geen tegelwereld */ }
        const q = placeQuery(r.gate.f)();
        const st = settleTick(r.gate.settle, q, now);
        if (!st.settled) return true;
        r.gates.push({ shot: r.gate.j + 1, ms: Math.round(st.waitedMs), timedOut: st.timedOut, reason: st.reason, rest: q });
        if (BENCH_RUNS) console.log('[trailer] gate', JSON.stringify(r.gates[r.gates.length - 1]));
        r.gate = null;
        r.w.cineJumpLoading = false;
        return false;
      }
      const j = r.idx + 1;
      const nx = shots[j];
      if (r.idx < 0 || !nx || nx.black || !nx.focus || r.gated.has(j) || r.T + dt < starts[j]) return false;
      r.gated.add(j);
      r.w.cineJumpLoading = true; // het streambudget van de laadsluier (20 ms): onder zwart wordt niet getekend, dus alles mag
      r.T = starts[j] - 0.001;
      r.black = { from: 1, to: 1, t0: r.T, dur: 0 };
      r.env.relocate(nx.focus.x, nx.focus.y);
      if (nx.clock != null) setClock(r.w, nx.clock);
      forceWeather(r.w, nx.weather);
      prewarmStreamAt(nx.focus.x, nx.focus.y, 5);
      if (r.w.map && r.w.map.warmAhead) r.w.map.warmAhead(nx.focus.x, nx.focus.y, { token: 'trailer', budgetMs: 8000 });
      r.gate = { j, f: nx.focus, settle: createSettle(GATE), pose: { position: P(nx.focus.x + 20, nx.focus.y + 20, 60), lookAt: P(nx.focus.x, nx.focus.y, 0), fov: 50 } };
      return true;
    };
    const warm = () => new Promise((res) => {
      const first = mode === 'benchmark' ? shots.find((x) => !x.black && x.focus) : null;
      if (shots[0].black && !first) { res(); return; }
      const f = first ? first.focus : shots[0].focus;
      if (f) prewarmStreamAt(f.x, f.y, mode === 'benchmark' ? 8 : 4);
      if (f && r.w.map && r.w.map.warmAhead) r.w.map.warmAhead(f.x, f.y, { token: 'trailer', budgetMs: mode === 'benchmark' ? 8000 : 2500 });
      const t0 = performance.now();
      const settle = mode === 'benchmark' && f ? createSettle() : null;
      if (settle) r.w.cineJumpLoading = true; // idem: de start van de benchmark mag met het volle streambudget bouwen
      const query = f ? placeQuery(f) : () => ({});
      let n = 0;
      const step = () => {
        if (r.done) { res(); return; }
        try { frame(r, 0, 16); } catch (e) { /* ignore */ }
        ui.black.style.opacity = '1';
        if (settle) {
          try { if (r.w.map && r.w.map.follow) r.w.map.follow(f.x, f.y, {}, 8); } catch (e) { /* idem als in benchGate */ }
          const st = settleTick(settle, query(), performance.now());
          if (!st.settled) { requestAnimationFrame(step); return; }
          r.warmup = { ms: Math.round(st.waitedMs), timedOut: st.timedOut, reason: st.reason };
          try { window.__benchWarmup = r.warmup; } catch (e) { /* geen window */ }
          r.w.cineJumpLoading = false;
          if (BENCH_RUNS) console.log('[trailer] settled', JSON.stringify(r.warmup));
          res();
          return;
        }
        if (++n < 60 || performance.now() - t0 < 2500) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
    // a video export starts once main.js has the sound sheet
    Promise.resolve(begun).then(warm).then(() => requestAnimationFrame((now) => { last = now; loop(now); }));
  });
}

// The benchmark from Instellingen: the full cut on the current settings,
// then every other preset on the two heaviest shots of that run. A preset's
// fps is the full run's average times its measured speed-up on those shots.
let nextChoice = null; // 'Nog een keer' measures again on the same choice without asking
export async function runBenchmarkSuite(world, env, choiceIn = null) {
  const cur = currentPreset();
  // the choice screen (benchmarkui.js): route, length, commentary; the command line (--benchmark runs) keeps the old behaviour
  let choice = choiceIn || nextChoice;
  nextChoice = null;
  if (!choice && !BENCH_RUNS) {
    ensureUi();
    choice = await showBenchmarkChoice({ preset: cur, presetLabel: cur ? presetLabel(cur) : '' });
    if (!choice) return { aborted: true };
  }
  choice = normaliseChoice(choice || { course: 'classic' });
  const cut = BENCH_RUNS ? 'vol' : choice.course === 'film' ? (choice.length === 'kort' ? 'filmkort' : 'film') : 'bench';
  const bcut = BENCH_RUNS ? 'bench' : cut;
  const commentary = commentaryFor(choice);
  let res = await runTrailer(world, { mode: 'benchmark', cut, env, commentary });
  res.choice = choice;
  // 0.64.1: a low first result is measured once more (compiles and streaming can hold one run back); the better one counts
  if (!BENCH_RUNS && !res.aborted && shouldRemeasure(res.stats, 0)) {
    const again = await runTrailer(world, { mode: 'benchmark', cut: bcut, env, label: 'Nog een meting', commentary });
    if (!again.aborted && again.stats) res = betterRun(res, again);
    if (res.stats) res.stats.remeasured = true;
  }
  res.choice = choice;
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
        const r = await runTrailer(world, { mode: 'benchmark', cut: bcut, shot: s.idx + 1, env, label: presetLabel(name) });
        if (r.aborted) { aborted = true; break; }
        if (r.stats) { ratio += r.stats.avg / s.fps; n++; }
      }
    } finally { restore(); }
    if (aborted) break;
    if (n) fps[name] = res.stats.avg * ratio / n;
  }
  res.presetFps = fps;
  res.preset = cur;
  res.choice = choice;
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

let resultEl = null;

// Shows the results card; resolves with 'again' or 'back'.
export function showBenchmarkResults(res) {
  ensureUi(); // the card's styles come with the trailer's UI: also when the card is shown without a run
  const stats = res && res.stats;
  // the result also waits in Instellingen > Beeld (gfxprofile.js)
  if (!BENCH_RUNS) setBenchResult(stats, res.preset, res.presetFps || {});
  const prev = stats && !BENCH_RUNS ? readLastRun() : null;
  if (stats && !BENCH_RUNS) writeLastRun(packRun({ stats, cats: stats.cats, preset: res.preset, memory: stats.memory, course: res.choice && res.choice.course }));
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
    if (window.gdeDesktop && window.gdeDesktop.isDesktop) setTimeout(() => window.gdeDesktop.quit(), 500);
  }
  const cur = currentPreset(getSettings());
  const course = COURSES[res.choice && res.choice.course] ? res.choice.course : 'classic';
  const basis = stats && stats.play ? { avg: stats.play.avg, low1: stats.play.low1, p95: stats.play.p95 } : stats; // what a player plays decides
  const diag = stats ? runDiagnosis({ avg: basis.avg, shots: stats.shots, current: res.preset || cur, presetFps: res.presetFps || {} }) : null; // #1015: is the limit the settings at all?
  const card = reportCard({ stats, diag, preset: res.preset || cur, presetFps: res.presetFps || {}, course, length: res.choice && res.choice.length, prev, size: [innerWidth, innerHeight], basis, describe: describePreset, extra: stats ? ultraNote(cur, stats.avg, (getBenchResult() || {}).fps) : '' });
  const adv = { apply: card.empty || card.busy ? null : card.advice.apply };
  resultEl.innerHTML = reportHtml(card);
  resultEl.hidden = false;
  document.body.classList.add('tr-result-open');
  const buttons = () => [...resultEl.querySelectorAll('button:not([hidden])')];
  buttons()[0].focus({ preventScroll: true });
  return new Promise((resolve) => {
    const close = (v) => {
      resultEl.hidden = true;
      document.body.classList.remove('tr-result-open');
      resultEl.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKey, true);
      resolve(v);
    };
    const act = (a, btn) => {
      if (a === 'apply' && adv.apply) {
        applyPreset(adv.apply);
        resultEl.querySelector('.tr-advice').innerHTML = '<p class="tr-advice__kop">Toegepast.</p><small>Draai de benchmark nog een keer om het verschil te zien.</small>';
        btn.hidden = true;
        resultEl.querySelector('[data-act="back"]').classList.remove('ds-z-knop--secundair'); // zonder Toepassen is Terug de hoofdknop
        buttons()[0].focus({ preventScroll: true });
      } else if (a === 'diag') {
        import('./gpudiag.js').then((G) => G.copyTechInfo()).then((ok) => { btn.textContent = ok ? 'Gekopieerd' : 'Kopiëren lukte niet'; }, () => { btn.textContent = 'Kopiëren lukte niet'; });
      } else if (a === 'export') {
        btn.textContent = saveReport(card) ? 'Bewaard in je downloads' : 'Bewaren lukte niet';
      } else if (a === 'again' || a === 'back' || a === 'settings') {
        if (a === 'again') nextChoice = res.choice || null; // measure again on the same choice, no new question
        close(a);
      }
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

