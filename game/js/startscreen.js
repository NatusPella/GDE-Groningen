import { icoon } from './icons.js';
import { hoofdspeler } from './players.js';
import { FLAGS, reseedAutoplay } from './devflags.js';
import { hasSave, loadBootSave, startNewSlot, getSaveSummary, ensureActiveSlot, ensureLatestSlot, isFreshStart, finishFreshStart, currentSlot, markLegacyCardSeen } from './savegame.js';
import { askLegacyCard } from './legacysavecardui.js';
import { openSaveSlots, isSaveSlotsOpen } from './saveslotsui.js';
import { listSlots } from './saveslots.js';
import { VERSION } from './version.js';
import { pointInPolygon } from './util.js';
import { openPauseMenu, menuIcon } from './pausemenu.js';
import { requestOpenSamen } from './samenpanel.js';
import { ensureSamenProfile } from './launchchoiceui.js';
import { askNewGameDifficulty } from './difficultyui.js';
import { difficultyPlan } from './difficultycard.js';
import { openSamenKeuze, isSamenKeuzeOpen } from './samenkeuze.js';
import { stopSoloHost } from './coopsolo.js';
import { isPauseMenuOpen } from './pausestate.js';
import { askQuitConfirm, isQuitConfirmOpen } from './quitconfirmui.js';
import { pendingTrailer } from './trailerstate.js';
import { afterBenchmarkPlan } from './benchmarkreturn.js';
// trailer.js (2500 lines) is only loaded when a trailer or benchmark really runs
import { startTheme, stopTheme } from './theme.js';
import { COW_LOADING } from './flavourlines.js';
import { MENU_FRAME_S, getRenderer, streamPending } from './scene3d.js';
import { makeMenuGate, GATE } from './menuready.js';
import { isAdvisorSampling, startGfxAdvisor, applyPreset, isDefaultGfx, readAdvice, writeAdvice, presetLabel, measureAutoPreset, autoGfxValue } from './gfxprofile.js';
import { setSetting } from './settings.js';
import { ABOUT_HTML } from './credits.js';
import { startLoadScreen } from './loadscreen.js';
import { stepDurations, bootPlan, bootProgress, bootPhaseAt, bootCreepCap, BOOT_DONE_LABEL, easeBar } from './loadlogic.js';
import { padGlyphInner } from './glyphs.js';
import { onDeviceChange, getDevice } from './inputdevice.js';
import { MENU_PLEKKEN, stadPlek, leesVerleden, bewaarVerleden, kiesVolgende, noteer, maakBeeld } from './menuplekken.js';
import { escapeHtml as esc } from './htmlescape.js';

// the footer hints (static HTML in index.html) show the controller buttons when a controller was used last
let footKb = null;
function syncFoot() {
  const foot = document.querySelector('#start-screen .ss-foot');
  if (!foot) return;
  if (footKb === null) footKb = foot.innerHTML;
  const pg = (slot) => `<span class="pm-pad-g" data-g-raw>${padGlyphInner(slot)}</span>`;
  foot.innerHTML = getDevice() === 'pad'
    ? `<span class="m-hint">${pg('dpad')}<span>kiezen</span></span><span class="m-hint">${pg('a')}<span>ok</span></span>`
    : footKb;
}
onDeviceChange(syncFoot);

export const TIPS = [
  'Tip: in de Stad neemt een fietser altijd voorrang, of die nou voorrang heeft of niet.',
  'Tip: de Martinitoren heet hier gewoon d’Olle Grieze.',
  'Tip: een eierbal eet je warm. Koud is een misdaad, ook in Grunn.',
  'Tip: “Moi” is goeiemorgen, goeiemiddag én goeienavond.',
  'Tip: fatbikes stoppen voor niemand. Echt niemand.',
  'Tip: {ESC} klapt je telefoon open. Berend Bos heeft altijd wel een klusje.',
  'Tip: regen in Grunn is geen weer, het is een levenshouding.',
  'Tip: {V} wisselt tijdens het rijden tussen filmcamera’s.',
  'Tip: {M} opent de kaart. {LMB} om een bestemming te zetten.',
  'Tip: zie je een duivenbord in de stad? Druk E en word zelf een duif. Poepen mag, ook op de Martinitoren.',
];
// the commentary cows chime in between the tips
COW_LOADING.forEach((t, i) => TIPS.splice(i * 3 + 1, 0, t));
const TIP_MS = 3800;

let fakeTimer = 0;
let lastPaintAt = 0;
let progress = 0;
let shown = 0;
let bootStatusLocked = false;
// The plan of the boot bar (opdracht 21-11): every step of the start with its weight, set by main.js
// (setBootPlan) before the boot begins. The bar is full only when the last step is done.
let plan = bootPlan();
let stepId = '';
let lastStatusStep = '';

// The status line of the boot screen: the step the boot is in, in plain words. Locked once
// another part (the first-run measurement, an error, "klaar") owns the line.
function bootStatus(text) {
  const status = document.querySelector('#loading .ld-status');
  if (!status || bootStatusLocked) return;
  status.classList.remove('swap');
  if (status.textContent !== text) status.textContent = text;
}

function el(id) {
  return document.getElementById(id);
}

function showVersion() {
  const hart = document.querySelector('#start-screen .ss-credit .heart');
  if (hart && !hart.firstChild) hart.innerHTML = icoon('hart_vol', { maat: 'm' }); // F5: Phosphor in plaats van de emoji
  const v = document.querySelector('#start-screen .ss-ver');
  if (v && VERSION && VERSION !== 'dev') v.textContent = 'v' + VERSION;
  const b = document.querySelector('#loading .bt-ver');
  if (b) b.textContent = (VERSION && VERSION !== 'dev' ? 'v' + VERSION : 'dev') + ' · NatusPella';
}

export function initLoading() {
  showVersion();
  // the self-hosted fonts load now, so the logo never swaps typefaces mid-stamp
  try { if (document.fonts && document.fonts.load) { document.fonts.load('800 40px "Barlow Condensed"'); document.fonts.load('400 20px "Atkinson Hyperlegible"'); } } catch (e) { /* ignore */ }
  // between the real moments the bar creeps towards the end of the step it is in, so a long
  // step (the shaders) still shows life; a real report always wins (setBootStep)
  lastPaintAt = performance.now();
  fakeTimer = setInterval(() => {
    // one continuous bar: it eases to the real progress (never back, at most ~1% per frame) and between real
    // reports it creeps asymptotically towards the end of the step, so a long step is a slow move, not a standstill
    const now = performance.now();
    const dt = now - lastPaintAt;
    lastPaintAt = now;
    if (progress > shown) shown = easeBar(shown, progress, dt);
    else {
      const cap = bootCreepCap(plan, progress);
      if (shown < cap) shown = Math.min(cap, shown + (cap - shown) * 0.005);
    }
    paint();
  }, 33);
}

// The boot plan: which steps this start has (main.js knows whether the warm-up runs).
export function setBootPlan(opts) {
  plan = bootPlan(opts);
}

function reducedMotion() {
  return document.documentElement.classList.contains('reduce-motion') || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
}

function paint() {
  const fill = document.querySelector('#loading .ld-fill');
  if (fill) fill.style.transform = `scaleX(${Math.min(1, shown).toFixed(3)})`;
  const bar = document.querySelector('#loading .ld-bar');
  const phase = bootPhaseAt(progress, plan);
  if (bar) {
    bar.setAttribute('aria-valuenow', String(Math.round(Math.min(1, shown) * 100)));
    // what the boot is doing, as text, so a screen reader hears it (no "step n of m": one continuous bar, 21-11)
    bar.setAttribute('aria-valuetext', phase.label);
  }
  // only when the step changes: another part (the first-run measurement, the save choice) may own the line in between
  if (stepId && stepId !== 'klaar' && phase.id !== lastStatusStep) { lastStatusStep = phase.id; bootStatus(phase.label); }
}

// A real moment of the boot: this step is frac (0..1) of the way. The bar never goes back,
// and a step that is skipped in this plan is ignored. Returns the bar value (0..1).
export function setBootStep(id, frac = 0) {
  const p = bootProgress(plan, id, frac);
  if (!plan.steps.some((st) => st.id === id)) return progress;
  progress = Math.max(progress, p);
  stepId = id;
  // the measurement of the start (?laadstappen, the perf scripts): when every step was reported
  const marks = window.__loadMarks;
  if (marks) (marks.stappen || (marks.stappen = [])).push([id, Math.round(frac * 100) / 100, Math.round(performance.now())]);
  paint();
  return progress;
}

// Lets the browser paint the bar between heavy synchronous boot steps.
// #749: rAF staat stil in een verborgen of geoccludeerd venster (Electron met
// backgroundThrottling, #656); een timer-vangnet laat de boot dan doorlopen in plaats van
// te wachten tot het venster terug is.
export function yieldToPaint() {
  return new Promise((r) => {
    let klaar = false;
    const afronden = () => { if (klaar) return; klaar = true; r(); };
    requestAnimationFrame(() => setTimeout(afronden, 0));
    setTimeout(afronden, 100);
  });
}

// Twee frames wachten zodat het canvas één keer getekend is voordat het laadscherm weggaat.
// #749: in een verborgen venster staat rAF stil, dus een timer neemt het over.
function afterPaint(fn) {
  let gedaan = false;
  const eenKeer = () => { if (gedaan) return; gedaan = true; fn(); };
  requestAnimationFrame(() => requestAnimationFrame(eenKeer));
  setTimeout(eenKeer, 120);
}

// A run that no person sits at (the story test, the smoke test, recordings,
// the benchmark) starts the game like a player does; AUTO only skips the
// first-run graphics measurement and the boot animations.
const AUTO = FLAGS.noattract || FLAGS.storytest || FLAGS.stil || FLAGS.trailer || FLAGS.preview || FLAGS.benchmark || FLAGS.perf || FLAGS.spotsonly;

// 22-11: een oude save (zonder poort, of van een eerdere verhaalversie) toont eenmaal de kaart "Nieuw verhaal" voordat hij laadt: Doorgaan laadt hem
// zoals hij is, Nieuw spel begint een nieuwe plek en wist niets. De vlag komt in de save (markLegacyCardSeen), dus de kaart komt niet terug.
// Een testrun (dezelfde vlaggen als de moeilijkheidskaart) slaat hem over. Lokaal: geen netwerk, ook niet bij Samen spelen.
function legacyCardFirst(doorgaan, nieuw) {
  let sm = null;
  try { sm = hasSave() ? getSaveSummary() : null; } catch (e) { sm = null; }
  const testmodus = !!(AUTO || FLAGS.autoplay || FLAGS.menutest);
  if (!sm || !sm.legacyCard || testmodus) { doorgaan(); return; }
  const af = (verder) => () => { try { markLegacyCardSeen(sm.slot); } catch (e) { console.warn('oude kaart', e); } verder(); };
  if (!askLegacyCard({ onDoorgaan: af(doorgaan), onNieuw: af(nieuw) })) doorgaan();
}

// #1169: een NIEUW spel (een verse plek of de allereerste start) vraagt eerst "Hoe pittig moet het zijn?", na de keuzekaart Alleen of Samen en
// vóór het spel begint. Een testrun (dezelfde vlaggen als de startkeuze) slaat de kaart over en speelt op Standaard; ?moeilijkheid=vraag toont hem toch.
async function chooseDifficulty() {
  try {
    const testmodus = !!(AUTO || FLAGS.autoplay || FLAGS.menutest);
    await askNewGameDifficulty({ plan: difficultyPlan({ testmodus, vlag: FLAGS.moeilijkheid }), fresh: true });
  } catch (e) { console.warn('moeilijkheid kiezen', e); }
}

// #749: een late, alsnog geslaagde boot ruimt de foutstand van de boot-wachter op (de rode
// .error-klasse en de herlaadknop), anders blijft die op het laadscherm staan tot het scherm
// helemaal weggaat.
function clearBootError() {
  const l = el('loading');
  if (!l) return;
  const status = l.querySelector('.ld-status');
  if (status) status.classList.remove('error');
  const knop = l.querySelector('#boot-reload');
  if (knop && knop.parentNode) knop.parentNode.removeChild(knop);
}

// What the start measured per step (window.__loadMarks.stappen); with ?laadstappen also as a console table.
function reportStepTimes() {
  const marks = window.__loadMarks;
  if (!marks || !marks.stappen) return;
  marks.stappenKlaar = Math.round(performance.now());
  if (!FLAGS.laadstappen) return;
  const tabel = stepDurations(marks.stappen, marks.stappenKlaar).map((o) => ({ stap: o.id, ms: o.ms, procent: Math.round(o.aandeel * 100) }));
  console.table(tabel);
  console.log('[laadstappen] ' + JSON.stringify(tabel));
}

// Fills the bar to 100% and goes straight on (#226): no key to press. The boot screen stays up until
// the world is there (dismissLoading here, or the menu gate in the QA/trailer route), so there is no
// black gap. The sound starts at the first real key or click (audio.js unlockAudio), the browsers
// allow nothing earlier.
export async function finishLoading() {
  if (stepId === 'klaar') return;
  reportStepTimes();
  progress = 1;
  shown = 1;
  stepId = 'klaar';
  clearInterval(fakeTimer);
  bootStatusLocked = true;
  clearBootError();
  paint();
  const l = el('loading');
  if (!l) return;
  const status = l.querySelector('.ld-status');
  if (status) status.textContent = BOOT_DONE_LABEL;
  await new Promise((r) => setTimeout(r, 380));
}

// The menu (or the trailer) is up: the boot screen fades away over it.
export function dismissLoading() {
  clearBootError();
  const l = el('loading');
  if (!l || l.dataset.gone) return;
  l.dataset.gone = '1';
  l.classList.add('done');
  setTimeout(() => { l.style.display = 'none'; }, 800);
}

// The status line while the boot screen stays up for a real wait (the start
// area's prewarm, the shader compile). Unlocked on purpose: finishLoading has
// already claimed the line, and this replaces its "Klaar" text with what the
// boot is still doing, so the wait is explained instead of looking finished.
export function setLoadingStatus(text) {
  const status = document.querySelector('#loading .ld-status');
  if (!status) return;
  status.classList.remove('swap');
  status.textContent = text;
}

export function showLoadError(msg) {
  clearInterval(fakeTimer);
  bootStatusLocked = true;
  document.querySelector('#loading .ld-status') && document.querySelector('#loading .ld-status').classList.remove('swap');
  const status = document.querySelector('#loading .ld-status');
  if (status) {
    status.textContent = 'Fout bij laden: ' + msg;
    status.classList.add('error');
  } else if (el('loading')) el('loading').textContent = 'Fout bij laden: ' + msg;
}


const SHOT_MIN_S = 12;
const SHOT_MAX_S = 16;
const FADE_S = 0.45;
const BLACK_HOLD_S = 0.3;
const BLACK_MAX_S = 8;
const LEVEL_H = 3.1;
// de stad achter het menu in zomerlicht (#380): ochtend tot de late namiddag, droog
const SHOT_CLOCKS = [9.5, 11, 12.5, 15, 16.5, 17.8];
const SHOT_WEATHER = [
  { weight: 60 },
  { weight: 28, overcast: 0.35 },
  { weight: 12, overcast: 0.6 },
];

function pickShotWeather(base) {
  let r = Math.random() * SHOT_WEATHER.reduce((sum, k) => sum + k.weight, 0);
  let k = SHOT_WEATHER[0];
  for (const c of SHOT_WEATHER) { r -= c.weight; if (r <= 0) { k = c; break; } }
  return {
    ...base,
    active: false,
    kind: undefined,
    peak: 0,
    intensity: 0,
    overcast: k.overcast || 0,
    mist: 0,
    windAngle: Math.random() * Math.PI * 2,
    elapsed: 0,
    duration: Infinity,
  };
}
const EXTRA_SPOTS = [
  { name: 'Hoge der A', x: -471.57, y: 84.51, kind: 'canal' },
  { name: 'Noorderhaven', x: -351.84, y: -72.46, kind: 'canal' },
  { name: 'Reitdiepskade', x: -554.19, y: 57.67, kind: 'canal' },
  { name: 'Herestraat', x: 116.34, y: 178.6, kind: 'street' },
  { name: 'Folkingestraat', x: -62.87, y: 314.41, kind: 'street' },
  { name: 'Poelestraat', x: 349.02, y: 125.46, kind: 'street' },
  { name: 'Turfsingel', x: 371.35, y: -223.21, kind: 'canal' },
];
const BIG_KINDS = new Set(['station', 'stadium', 'mall', 'park', 'garden']);

function roofTop(map, x, y) {
  let top = 0;
  for (const b of map.buildingsNear(x, y, 1)) {
    const [x0, y0, x1, y1] = b.bounds;
    if (x < x0 || x > x1 || y < y0 || y > y1 || !pointInPolygon(x, y, b.pts)) continue;
    top = Math.max(top, b.landmarkKind === 'tower' ? 100 : Math.max(2.4, (b.h || 3) * LEVEL_H) + 2);
  }
  return top;
}

function clearance(map, x, y, r = 6) {
  let top = roofTop(map, x, y);
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    top = Math.max(top, roofTop(map, x + Math.cos(a) * r, y + Math.sin(a) * r));
  }
  return top + 5;
}

// The height a camera needs to look over the trees: those at its lens (within 10 m) and those on the line of sight to the target.
// Trees are [x, y, species, height] rows (mapdata.js treesNear); a tree is taken as 8 m when it has no height.
function treeClearance(map, q) {
  if (!map.treesNear) return 0;
  const { position: c, lookAt: l } = q;
  let need = 0;
  for (const t of map.treesNear(c.x, c.y, 10)) need = Math.max(need, (t[3] || 8) + 3);
  for (let i = 1; i < 8; i++) {
    const f = i / 8;
    const px = c.x + (l.x - c.x) * f, py = c.y + (l.y - c.y) * f;
    for (const t of map.treesNear(px, py, 5)) need = Math.max(need, ((t[3] || 8) + 1 - l.z * f) / (1 - f));
  }
  return need;
}

function roadDirection(map, spot) {
  let best = null, bd = Infinity;
  for (const r of map.roadsNear(spot.x, spot.y, 40)) {
    if (spot.kind !== 'canal' && r.name !== spot.name) continue;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const [ax, ay] = r.pts[i], [bx, by] = r.pts[i + 1];
      const d = Math.hypot((ax + bx) / 2 - spot.x, (ay + by) / 2 - spot.y);
      if (d < bd && Math.hypot(bx - ax, by - ay) > 4) { bd = d; best = Math.atan2(by - ay, bx - ax); }
    }
  }
  return best ?? Math.random() * Math.PI * 2;
}

// A slow camera move around one highlight; returns pose(t) in map coordinates.
function makeShot(map, spot) {
  const c = { x: spot.x, y: spot.y };
  const dir = Math.random() < 0.5 ? 1 : -1;
  const a0 = Math.random() * Math.PI * 2;
  const kind = spot.kind;
  if (kind === 'tower') {
    const R = 80 + Math.random() * 20, z = 48 + Math.random() * 16;
    return (t) => {
      const a = a0 + dir * t * 0.05;
      return { position: { x: c.x + Math.cos(a) * R, y: c.y + Math.sin(a) * R, z: z + t * 0.4 }, lookAt: { x: c.x, y: c.y, z: 42 }, fov: 52 };
    };
  }
  if (kind === 'street' || kind === 'canal') {
    const h = roadDirection(map, spot);
    const fx = Math.cos(h), fy = Math.sin(h);
    const len = 44;
    let z = 13 + Math.random() * 5;
    for (let s = -0.5; s <= 0.5; s += 0.125) z = Math.max(z, clearance(map, c.x + fx * len * s, c.y + fy * len * s, 3));
    return (t) => {
      const u = t / SHOT_MAX_S - 0.5;
      const px = c.x + fx * len * u, py = c.y + fy * len * u;
      return { position: { x: px, y: py, z: z + t * 0.15 }, lookAt: { x: px + fx * 40, y: py + fy * 40, z: 2 }, fov: 58 };
    };
  }
  const big = BIG_KINDS.has(kind);
  const R = big ? 85 + Math.random() * 25 : 48 + Math.random() * 18;
  const lookZ = big ? 8 : 6;
  let z = (big ? 34 : 24) + Math.random() * 10;
  for (let i = 0; i < 24; i++) {
    const a = i * Math.PI / 12;
    z = Math.max(z, clearance(map, c.x + Math.cos(a) * R, c.y + Math.sin(a) * R));
  }
  if (Math.random() < 0.35) {
    const z0 = Math.max(z - 10, clearance(map, c.x + Math.cos(a0) * R, c.y + Math.sin(a0) * R));
    return (t) => {
      const a = a0 + dir * t * 0.025;
      const k = Math.min(1, t / SHOT_MAX_S);
      return { position: { x: c.x + Math.cos(a) * R, y: c.y + Math.sin(a) * R, z: z0 + (z + 18 - z0) * k }, lookAt: { x: c.x, y: c.y, z: lookZ }, fov: 55 };
    };
  }
  return (t) => {
    const a = a0 + dir * t * 0.045;
    return { position: { x: c.x + Math.cos(a) * R, y: c.y + Math.sin(a) * R, z: z + Math.sin(t * 0.13) * 3 }, lookAt: { x: c.x, y: c.y, z: lookZ }, fov: 55 };
  };
}


// After the attract intro: the logo appears big in the middle, then glides
// and shrinks into its place before the menu fades in (CSS .ss-handoff).
function logoIn(screen) {
  const logo = screen.querySelector('.ss-logo .gde-logo');
  screen.classList.add('ss-handoff');
  setTimeout(() => screen.classList.remove('ss-handoff'), 2600);
  if (!logo || !logo.animate) return;
  const r = logo.getBoundingClientRect();
  const dx = innerWidth / 2 - (r.left + r.width / 2), dy = innerHeight / 2 - (r.top + r.height / 2);
  const big = `translate(${dx.toFixed(0)}px, ${dy.toFixed(0)}px) scale(1.45)`;
  logo.animate([
    { transform: big, opacity: 0 },
    { transform: big, opacity: 1, offset: 0.2 },
    { transform: big, opacity: 1, offset: 0.55, easing: 'cubic-bezier(0.6, 0, 0.25, 1)' },
    { transform: 'none', opacity: 1 },
  ], { duration: 1800, fill: 'backwards' });
}

// The backdrop's viewpoints (#380): the hand-picked ones over the whole province plus the city's own spots.
const menuPool = (map) => [...MENU_PLEKKEN, ...[...(map.meta.landmarks || []), ...EXTRA_SPOTS].map(stadPlek)];
function menuStorage() {
  try { return window.localStorage; } catch (e) { return null; /* no storage: every start picks fresh */ }
}
// the tiles round a viewpoint, asked for and pinned before the camera cuts there (tileworld.js registerShots); resolves when they are in
function holdTiles(map, spot) {
  if (!map || typeof map.registerShots !== 'function') return Promise.resolve();
  const radius = spot.stad ? 200 : Math.min(600, spot.R + 200);
  try { return Promise.resolve(map.registerShots([{ at: [spot.x, spot.y] }], { radius, token: 'menu' })).catch(() => {}); } catch (e) { return Promise.resolve(); }
}
// The first viewpoint is picked and its tiles are asked for while the boot screen is still up (main.js, once the map is in), so the
// province round it streams in next to the rest of the loading and the menu does not wait for it afterwards. Only the
// QA/trailer route still shows that menu (#581); a player start and every test run go straight into the world.
let planned = null;
export function planMenuStart(map) {
  if (planned || !(FLAGS.menutest || FLAGS.trailer || FLAGS.preview || FLAGS.attract)) return;
  try {
    const spot = kiesVolgende(menuPool(map), leesVerleden(menuStorage()), Math.random);
    planned = { spot, tiles: holdTiles(map, spot) };
  } catch (e) { planned = null; }
}

// The normal boot: no menu. The save written last is loaded; without a save the story starts
// at once (the owner's choice, 25-10). Only the QA/recording route (?menutest, trailer, preview,
// attract) keeps the old title screen (#581); a benchmark runs from the boot too.
export function runStartScreen(world, opts) {
  // pendingTrailer() reads and clears the pending benchmark: ask it once and hand the answer on,
  // otherwise the menu asks again and the benchmark from Instellingen > Beeld is gone.
  const pending = pendingTrailer();
  const menu = FLAGS.menutest || FLAGS.trailer || FLAGS.preview || FLAGS.attract;
  return menu ? runMenuScreen(world, opts, pending) : runBootScreen(world, opts, pending);
}

const FIRST_RUN_MS = 3500;

// The first start on a fresh profile: measure a few seconds of real frames on the boot screen
// and pick the best preset that still runs smoothly. Skipped with Esc/Space; stored so it runs
// once. The full benchmark in Instellingen > Beeld stays available for a deeper measurement.
function benchmarkFirstRun(opts, done) {
  bootStatusLocked = true;
  const status = document.querySelector('#loading .ld-status');
  if (status) status.textContent = 'Beeld instellen…';
  // 23-11 (besluit eigenaar): de meting loopt op Ultra en kiest automatisch de beste stand die hier 60 fps haalt (gfxprofile.js
  // measureAutoPreset, autoPresetFromSample); tot nu toe werd op de standaard (Hoog) gemeten en kon een sterke pc nooit Ultra krijgen
  const ctl = new AbortController();
  let finished = false, timer = 0, skipped = false, hiddenAbort = false;
  const finish = (res) => {
    if (finished) return;
    finished = true;
    window.removeEventListener('keydown', onKey, true);
    clearTimeout(timer);
    let pick = res ? res.pick : null;
    // te traag voor tien beelden binnen de tijd (geen afbreken door de speler, geen verborgen venster): de lichtste stand, niet de standaard
    if (!res && !skipped && !hiddenAbort) { pick = 'laag'; applyPreset(pick); setSetting('gfxAuto', autoGfxValue(pick)); }
    // een verborgen venster is geen keuze: de deur voor een latere meting blijft open
    if (!hiddenAbort) writeAdvice(skipped ? 'eerste-start:overgeslagen' : 'eerste-start:' + (pick || 'vlot'));
    if (status) status.textContent = skipped || !pick ? 'Klaar, Grunn staat te wachten' : `Beeld: ${presetLabel(pick)} (gekozen op basis van je pc)`;
    done();
  };
  const onKey = (e) => {
    if (e.key === 'Escape' || e.key === ' ') { e.preventDefault(); skipped = true; ctl.abort(); }
  };
  window.addEventListener('keydown', onKey, true);
  // a hidden or throttled tab must not keep the first start waiting
  timer = setTimeout(() => { hiddenAbort = document.hidden; ctl.abort(); }, FIRST_RUN_MS + 3500);
  measureAutoPreset({
    ms: FIRST_RUN_MS,
    signal: ctl.signal,
    render: () => {
      try { if (opts && opts.tick) opts.tick(0.016); } catch (e) { /* simulatie nog niet klaar */ }
      if (opts && opts.render) opts.render(0.016, 0);
    },
  }).then(finish, () => finish(null));
}

// #581: the benchmark (--benchmark and the one from Instellingen > Beeld, which reloads into it)
// runs after the boot, on the same fresh world the menu route measured; only the menu around it is
// gone. Returns after the results card; the caller then starts the game as usual.
async function benchmarkFromBoot(world, opts) {
  dismissLoading();
  const T = await import('./trailer.js');
  const env = { tick: opts.tick, render: opts.render, relocate: opts.relocate };
  let next = 'back';
  for (;;) {
    const res = await T.runBenchmarkSuite(world, env);
    if (res.aborted) break;
    next = await T.showBenchmarkResults(res);
    if (next !== 'again') break;
  }
  await T.fadeOutTrailer(false);
  stopTheme();
  // the result and its one-click preset wait in Instellingen > Beeld
  if (next === 'settings') world.openSettingsOnStart = 'video';
}

// The start area is warmed while the boot screen is still up (main.js): the
// meshes round the spawn (or the saved game's position) are built and the
// shaders compiled, so the first seconds in the world build and link nothing on
// the main thread. A longer boot is the price the owner chose for a smooth start;
// this runs for a new game AND for a save, those are the same first minutes.
function warmBeforeFinish(opts, finish) {
  if (opts && typeof opts.warm === 'function') {
    Promise.resolve().then(() => opts.warm()).catch((e) => console.warn('startgebied voorladen', e)).then(finish);
  } else finish();
}

function runBootScreen(world, opts, pending = null) {
  // Nieuws en credits (wi-492-over) hangen hier nog aan; de eerste-start-test zit hieronder.
  // #562: een bewust gestart nieuw spel op een lege plek gaat voor op "de save die het laatst geschreven
  // is"; de boot opent dan een lege wereld in plaats van de oude save te laden.
  const fresh = isFreshStart();
  const slot = fresh ? currentSlot() : ensureLatestSlot();
  // No reliable latest (a full list, a broken save, or a save from a newer version): #606 sends the player
  // to Opgeslagen spellen with a message, instead of the old title screen that only exists for QA/trailer (#581).
  if (!slot || (!fresh && !hasSave() && listSlots(null).length)) {
    // een benchmark die op deze herlaad wacht hoort op het oude menu (QA/ontwikkelaar), niet op dit scherm
    if (pending && pending.mode === 'benchmark') return runMenuScreen(world, opts, pending);
    return runBootSaveScreen(world, opts);
  }
  return new Promise((resolve) => {
    const screen = el('start-screen');
    if (screen) { screen.classList.remove('visible'); screen.style.display = 'none'; }
    const save = !fresh && hasSave() ? getSaveSummary() : null;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      // Draw one frame before the boot screen goes: the main frame loop starts only after this
      // promise resolves, so without it the first new game would show a black canvas.
      try { if (opts && opts.render) opts.render(0.016, 0); } catch (e) { /* renderer nog niet klaar */ }
      afterPaint(async () => {
        // the menu's first viewpoint was planned during the boot; the normal start never shows
        // the menu, so release those tiles instead of keeping them pinned behind the game
        try { if (world.map && world.map.releaseShots) world.map.releaseShots(); } catch (e) { /* niet erg */ }
        // opdracht 21-11: the bar reaches 100% only now, with the last step (the first frames) done
        await finishLoading();
        dismissLoading();
        resolve('game');
      });
    };
    const startNew = async () => {
      startTheme();
      reseedAutoplay();
      await chooseDifficulty(); // #1169: de moeilijkheid van dit nieuwe spel, vóór de eerste save
      // #562: stond de verse plek al klaar (na "Nieuw spel" en de herlaad), dan begint het spel daar en
      // hoeft er geen tweede lege plek bij te komen.
      if (fresh) finishFreshStart(); else startNewSlot();
      warmBeforeFinish(opts, finish);
    };
    const continueNow = () => {
      if (!hasSave()) { startNew(); return; }
      startTheme();
      // #590: a save read from its recovery copy says so and is written back by loadBootSave
      loadBootSave(world);
      // the save's position is warmed first, then the load screen covers the boot
      // screen until the city round it has streamed in
      warmBeforeFinish(opts, () => { startLoadScreen(world, { kind: 'save' }); finish(); });
    };
    // 22-11: na een benchmark uit een lopend spel gaat het spel rechtstreeks terug naar de save (benchmarkreturn.js): geen kaart
    // "Nieuw verhaal" en geen moeilijkheidskaart; de speler zat al in dit spel
    const afterBench = pending && pending.mode === 'benchmark' ? afterBenchmarkPlan({ fromGame: !!pending.fromGame, hasSave: !!save }) : null;
    const continueGame = () => (afterBench && !afterBench.legacyCard ? continueNow() : legacyCardFirst(continueNow, startNew));
    // #581: testruns start like the player: no menu, straight on to the world. A fresh profile
    // first gets a short graphics measurement; everything else starts at once. A benchmark that was
    // asked for (--benchmark, or Instellingen > Beeld via a reload) runs first, on this same world.
    // --gfx-advice (FLAGS.gfxadvies): de automatische meting ook in een testrun (wegwerpprofiel), om hem in Electron te controleren
    const firstRun = !save && (!AUTO || FLAGS.gfxadvies) && !FLAGS.autoplay && !document.hidden && isDefaultGfx() && !readAdvice();
    const begin = () => {
      if (firstRun) benchmarkFirstRun(opts, () => startNew());
      else if (save) continueGame(); else startNew();
    };
    if (pending && pending.mode === 'benchmark') benchmarkFromBoot(world, opts).then(begin, (e) => { console.error('benchmark', e); begin(); });
    else begin();
  });
}

// #606: de laatste save kan niet automatisch geladen worden (kapot, van een nieuwere versie of de lijst is
// niet te lezen). In plaats van het oude titelscherm (#581, alleen QA/trailer) opent Opgeslagen spellen,
// met de melding erbij en de reservekopie binnen bereik. Er is geen scherm om naar terug te gaan, dus Terug
// valt weg (saveslotsui.js noBack); de speler kiest een spel of begint opnieuw.
const BOOT_SAVE_TEKST = 'We konden je opgeslagen spel niet automatisch openen. Kies een opgeslagen spel om verder te gaan of begin een nieuw spel.';
function runBootSaveScreen(world, opts) {
  bootStatusLocked = true;
  const status = document.querySelector('#loading .ld-status');
  if (status) status.textContent = 'Kies een opgeslagen spel';
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      // net als bij de gewone boot: eerst één frame tekenen voordat het laadscherm weggaat
      try { if (opts && opts.render) opts.render(0.016, 0); } catch (e) { /* renderer nog niet klaar */ }
      afterPaint(async () => {
        try { if (world.map && world.map.releaseShots) world.map.releaseShots(); } catch (e) { /* niet erg */ }
        await finishLoading();
        dismissLoading();
        resolve('game');
      });
    };
    const startNew = async () => {
      // zonder vrije plek (volle opslag) blijft de keuze staan in plaats van zonder schrijfplek te starten
      if (!startNewSlot()) { open(); return; }
      startTheme();
      reseedAutoplay();
      await chooseDifficulty(); // #1169
      warmBeforeFinish(opts, finish);
    };
    const continueNow = () => {
      if (!hasSave()) { startNew(); return; }
      startTheme();
      loadBootSave(world);
      warmBeforeFinish(opts, () => { startLoadScreen(world, { kind: 'save' }); finish(); });
    };
    const continueGame = () => legacyCardFirst(continueNow, startNew);
    const open = () => openSaveSlots({
      mode: 'start', solo: true, noBack: true, eyebrow: 'Spel', titel: 'Opgeslagen spellen', hint: BOOT_SAVE_TEKST,
      onLoad: continueGame, onNew: startNew,
    });
    open();
  });
}

// Title screen over the live city, cycling through highlights. Resolves with
// 'game' (Alleen spelen: Doorgaan / Nieuw spel, or Samen spelen).
function runMenuScreen(world, { render, relocate, tick, ready }, pending = null) {
  return new Promise((resolve) => {
    const screen = el('start-screen');
    const menu = screen.querySelector('.ss-menu');
    ensureActiveSlot();
    const save = hasSave() ? getSaveSummary() : null;
    // two big choices (Alleen spelen opens Opgeslagen spellen: Doorgaan, Nieuw spel or any saved game), then the quiet rest;
    // only icon and label, no explaining sentences (#380)
    const items = [];
    items.push({ act: 'solo', label: 'Alleen spelen' });
    items.push({ act: 'samen', label: 'Samen spelen' });
    // "Wat is er nieuw" has one home: Over in the pause menu (#601), also on this QA/trailer screen
    items.push({ act: 'settings', label: 'Instellingen' });
    items.push({ act: 'about', label: 'Over' });
    if (window.gdeDesktop && window.gdeDesktop.isDesktop) items.push({ act: 'exit', label: 'Afsluiten' });
    const st = save && save.story;
    const itemHtml = (it, i) => {
      if (it.act === 'solo' || it.act === 'samen') {
        return `<button type="button" role="menuitem" class="ss-item ss-hero" data-act="${it.act}" data-i="${i}" aria-label="${it.label}" title="${it.label}"><span class="ss-label">${menuIcon(it.act, 'ss-ic big')}${it.label}</span></button>`;
      }
      return `<button type="button" role="menuitem" class="ss-item" data-act="${it.act}" data-i="${i}">${menuIcon(it.act)}<span class="ss-label">${it.label}</span></button>`;
    };
    menu.innerHTML = items.map(itemHtml).join('');
    // where the save picks up, right of the menu
    const saveCard = screen.querySelector('.ss-save');
    if (saveCard) {
      saveCard.hidden = !save;
      if (save) {
        const title = st && st.next ? st.next : save.goal || (st ? st.part : 'Grunn');
        const d = save.savedAt ? new Date(save.savedAt) : null;
        const ago = d ? Math.round((Date.now() - d.getTime()) / 60000) : -1;
        const agoText = ago < 0 ? '' : ago < 1 ? 'net opgeslagen' : ago < 120 ? `opgeslagen ${ago} min geleden` : `opgeslagen ${d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`;
        saveCard.innerHTML = `<span class="m-eb">Laatst gespeeld als ${esc(save.character)}</span><span class="big${title.length > 22 ? ' long' : ''}">${esc(title)}</span>` +
          (save.goal && save.goal !== title ? `<span class="line">Doel: ${esc(save.goal)}</span>` : st ? `<span class="line">${esc(st.part)}${st.date ? ' · ' + esc(st.date) : ''}</span>` : '') +
          `<span class="meta">${[`€${save.money.toLocaleString('nl-NL')}`, `${save.missionsDone} missies`, agoText].filter(Boolean).join(' · ')}</span>`;
      }
    }
    const buttons = [...menu.querySelectorAll('.ss-item')];
    let sel = 0;
    let done = false;
    let last = performance.now();

    const map = world.map;
    const p = hoofdspeler(world);
    const home = { x: p.x, y: p.y };
    const homeClock = world.clock;
    const homeWeather = world.weather;
    const move = relocate || ((x, y) => { p.x = x; p.y = y; });
    // the backdrop (#380): hand-picked viewpoints over the whole province plus the city's own spots; each start shows another
    // series (menuplekken.js), never the first of the last start, and remembers what it showed
    const pool = menuPool(map);
    const storage = menuStorage();
    let verleden = leesVerleden(storage);
    let firstPick = true;
    let curSpot = null;
    // the tiles of the viewpoint that is next: the camera only cuts there when they are in (the world behind the menu is never a hole)
    let tilesReady = true;
    let holdId = 0;
    const hold = (promise) => {
      tilesReady = false;
      const id = ++holdId;
      promise.then(() => { if (id === holdId) tilesReady = true; });
    };
    let upcoming = null;
    let qaHold = false; // a QA script chose the viewpoint: no cuts, no preloading of the next
    const nextSpot = () => {
      const spot = firstPick && planned ? planned.spot : kiesVolgende(pool, verleden, Math.random);
      verleden = noteer(verleden, spot, { eerste: firstPick });
      firstPick = false;
      bewaarVerleden(storage, verleden);
      return spot;
    };
    let shot = makeShot(map, { x: home.x, y: home.y, kind: 'spawn' });
    let shotT = 0;
    let shotDur = SHOT_MIN_S + Math.random() * (SHOT_MAX_S - SHOT_MIN_S);
    let phase = 'show';
    let phaseT = 0;
    let pose = shot(0);
    world.menuCam = true;

    const fade = document.createElement('div');
    fade.className = 'ss-fade';
    fade.style.cssText = `position:fixed;inset:0;z-index:19;background:var(--ds-c-glas);opacity:0;pointer-events:none;transition:opacity ${FADE_S}s ease`;
    document.body.appendChild(fade);

    // to a viewpoint: the player goes there (the street life and the streaming follow), the sun to the camera's side
    const cutTo = (spot, vast = {}) => {
      curSpot = spot;
      move(spot.x, spot.y);
      if (spot.stad) {
        world.clock = SHOT_CLOCKS[Math.floor(Math.random() * SHOT_CLOCKS.length)];
        shot = makeShot(map, spot);
      } else {
        const beeld = maakBeeld(spot, Math.random, vast);
        world.clock = beeld.uur;
        // a village round the viewpoint: the camera rises over the roofs along its way (as the city shots do), no further than 45 m;
        // worked out once the tiles of the place are in
        let zMin = null;
        shot = (t) => {
          const q = beeld.pose(t);
          if (zMin === null && tilesReady) {
            zMin = 0;
            for (let u = 0; u <= SHOT_MAX_S + 2; u += 3) {
              const q0 = beeld.pose(u);
              zMin = Math.max(zMin, clearance(map, q0.position.x, q0.position.y, 8), treeClearance(map, q0));
            }
            zMin = Math.min(zMin, 45);
          }
          if (zMin && q.position.z < zMin) q.position.z = zMin;
          return q;
        };
        window.__menuBeeld = { id: spot.id, uur: beeld.uur, hoek: Math.round(beeld.theta * 180 / Math.PI), beweging: beeld.beweging };
      }
      if (homeWeather) world.weather = pickShotWeather(homeWeather);
      shotT = 0;
      shotDur = SHOT_MIN_S + Math.random() * (SHOT_MAX_S - SHOT_MIN_S);
    };

    const focus = (i) => {
      sel = (i + buttons.length) % buttons.length;
      buttons.forEach((b, j) => b.classList.toggle('sel', j === sel));
      buttons[sel].focus({ preventScroll: true });
    };
    const restoreWorld = () => {
      world.menuCam = false;
      world.clock = homeClock;
      world.weather = homeWeather;
      if (Math.hypot(p.x - home.x, p.y - home.y) > 1) move(home.x, home.y);
    };
    const finish = (mode) => {
      done = true;
      news.hidden = true;
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('gde-benchmark', onBenchmark);
      world._menuCamPose = Math.hypot(pose.lookAt.x - p.x, pose.lookAt.y - p.y) < 150 ? pose : null;
      world.cameraOverride = null;
      screen.classList.remove('visible');
      fade.remove();
      if (map.releaseShots) map.releaseShots();
      resolve(mode);
    };
    const startNew = () => {
      startTheme();
      restoreWorld();
      reseedAutoplay();
      startNewSlot();
      finish('game');
    };
    const continueNow = () => {
      startTheme();
      restoreWorld();
      loadBootSave(world);
      // the load screen covers the menu until the city round the save has streamed in
      startLoadScreen(world, { kind: 'save' });
      finish('game');
    };
    const continueGame = () => legacyCardFirst(continueNow, startNew);
    const activate = (i) => {
      const it = items[i];
      if (it.act !== 'about') news.hidden = true;
      if (it.act === 'continue') {
        continueGame();
      } else if (it.act === 'samen') {
        stopSoloHost(world);
        // iets met Samen spelen: de eerste keer eerst naam en akkoord (ensureSamenProfile); Terug brengt je terug in het menu
        ensureSamenProfile().then((ok) => { if (!ok) { focus(sel); return; }
        // een echte menustroom: Gastheer worden (kies een opgeslagen spel of Nieuw spel) of Meedoen; daarna staat de wachtkamer klaar (main.js)
        openSamenKeuze({
          onClose: () => focus(sel),
          onKies: (rol) => {
            if (rol === 'gast' || rol === 'lijst') { requestOpenSamen({ rol: 'gast', gate: true, lijst: rol === 'lijst' }); if (save) continueGame(); else startNew(); return; }
            openSaveSlots({
              mode: 'start', eyebrow: 'Samen spelen', titel: 'Kies jullie spel', loadLabel: 'Dit spel spelen',
              hint: 'Jij opent het spel: de anderen spelen mee in het spel dat je hier kiest. Kies een lege plek voor een nieuw spel.',
              onLoad: () => { requestOpenSamen({ rol: 'host', gate: true }); continueGame(); },
              onNew: () => { requestOpenSamen({ rol: 'host', gate: true }); startNew(); },
              onClose: () => focus(sel),
            });
          },
        });
        });
      } else if (it.act === 'solo') {
        // no saved game at all (a first start, a throwaway profile of a test run): a new game starts at once, as the old Nieuw spel did
        if (!listSlots(null).length) { startNew(); return; }
        // Alleen spelen: the Opgeslagen spellen screen, with Doorgaan (the game played last) and Nieuw spel on top
        openSaveSlots({ mode: 'start', solo: true, eyebrow: 'Alleen spelen', onLoad: continueGame, onNew: () => startNew(), onClose: () => {
          // the card at the right shows the save as it was when the menu opened: rebuild the menu when saves changed
          const now = hasSave() ? getSaveSummary() : null;
          if (!done && JSON.stringify(now && [now.slot, now.savedAt, now.name]) !== JSON.stringify(save && [save.slot, save.savedAt, save.name])) location.reload();
          else focus(sel);
        } });
      } else if (it.act === 'about') {
        openAbout();
      } else if (it.act === 'settings') {
        openPauseMenu('settings', { prestart: true, onClose: () => focus(sel) });
      } else if (it.act === 'exit') {
        // #915: eerst de vraag, met de melding over de voortgang; Annuleren zet de focus terug
        askQuitConfirm({ onYes: () => window.gdeDesktop.quit(), onNo: () => focus(sel) });
      }
    };
    // for the QA scripts and recordings (docs/ONTWIKKELEN.md): start without clicking through Alleen spelen
    window.__menuStart = (wat) => { if (done || trailerOn) return false; if (wat === 'doorgaan' && save) continueGame(); else startNew(); return true; };
    const news = screen.querySelector('.ss-news');
    const newsBody = news.querySelector('.ss-news-body');
    const newsTitle = news.querySelector('h2');
    const showPanel = (title) => {
      newsTitle.textContent = title;
      news.setAttribute('aria-label', title);
      news.hidden = false;
      newsBody.scrollTop = 0;
      newsBody.focus({ preventScroll: true });
    };
    const openAbout = () => {
      showPanel('Over GDE');
      newsBody.innerHTML = ABOUT_HTML;
    };
    const closeNews = () => {
      news.hidden = true;
      focus(sel);
    };
    news.querySelector('.ss-news-close').addEventListener('click', closeNews);
    const onKey = (e) => {
      if (isPauseMenuOpen() || isSaveSlotsOpen() || isSamenKeuzeOpen() || isQuitConfirmOpen() || done || trailerOn) return;
      if (e.target && e.target.closest && e.target.closest('#gfx-advice')) return;
      const k = e.key;
      if (!news.hidden) {
        const page = newsBody.clientHeight * 0.85;
        if (k === 'Escape' || k === 'Backspace' || k === 'Enter') closeNews();
        else if (k === 'ArrowDown' || k === 's' || k === 'S') newsBody.scrollBy({ top: 60 });
        else if (k === 'ArrowUp' || k === 'w' || k === 'W') newsBody.scrollBy({ top: -60 });
        else if (k === 'PageDown' || k === ' ') newsBody.scrollBy({ top: page });
        else if (k === 'PageUp') newsBody.scrollBy({ top: -page });
        else return;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (k === 'ArrowDown' || k === 's' || k === 'S') focus(sel + 1);
      else if (k === 'ArrowUp' || k === 'w' || k === 'W') focus(sel - 1);
      else if (k === 'Enter' || k === ' ') { if (!e.repeat) activate(sel); }
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    menu.addEventListener('mousemove', (e) => {
      const b = e.target.closest('.ss-item');
      if (b && Number(b.dataset.i) !== sel) focus(Number(b.dataset.i));
    });
    menu.addEventListener('click', (e) => {
      const b = e.target.closest('.ss-item');
      if (b && !done) { focus(Number(b.dataset.i)); activate(sel); }
    });
    window.addEventListener('keydown', onKey, true);

    // trailer.js: the attract intro / ?trailer before the menu, and the
    // benchmark from Instellingen; the loop below idles while it runs
    const env = { tick, render, relocate: move };
    let trailerOn = false;
    const showMenu = (fromTrailer) => {
      screen.classList.add('visible');
      if (!fromTrailer && el('loading') && !el('loading').dataset.gone && !AUTO) { screen.classList.add('ss-slide'); setTimeout(() => screen.classList.remove('ss-slide'), 1200); }
      dismissLoading();
      if (fromTrailer) logoIn(screen);
      focus(0);
    };
    const backHome = () => {
      move(home.x, home.y);
      world.clock = homeClock;
      world.weather = homeWeather;
      shot = makeShot(map, { x: home.x, y: home.y, kind: 'spawn' });
      shotT = 0;
      phase = 'show';
      pose = shot(0);
      fade.style.opacity = '0';
    };
    const benchmark = async (fromGame) => {
      if (trailerOn) return;
      trailerOn = true;
      screen.classList.remove('visible');
      news.hidden = true;
      const T = await import('./trailer.js');
      let next = 'back';
      for (;;) {
        const res = await T.runBenchmarkSuite(world, env);
        if (res.aborted) break;
        next = await T.showBenchmarkResults(res);
        if (next !== 'again') break;
      }
      await T.fadeOutTrailer(false, backHome);
      stopTheme();
      trailerOn = false;
      // the result and its one-click preset wait in Instellingen > Beeld
      if (fromGame && save) {
        if (next === 'settings') world.openSettingsOnStart = 'video';
        continueGame();
        return;
      }
      showMenu(false);
      if (next === 'settings') openPauseMenu('settings', { prestart: true, sub: 'video', onClose: () => focus(sel) });
    };
    const onBenchmark = () => benchmark(false);
    window.addEventListener('gde-benchmark', onBenchmark);
    const intro = pending;
    // the first viewpoint is there before the gate starts to look, so the world streams in round it while the boot screen is up (#380)
    if (!intro) {
      const first = nextSpot();
      cutTo(first);
      hold(planned && planned.spot === first ? planned.tiles : holdTiles(map, first));
    }
    // for the QA scripts (scripts/qa/menuplekken_shots.mjs): the list, and a cut to one viewpoint that stays up
    window.__menuPlekken = {
      lijst: () => pool.map((p) => p.id),
      naar: (id, vast = {}) => {
        const spot = pool.find((p) => p.id === id);
        if (!spot || done) return null;
        qaHold = true;
        hold(holdTiles(map, spot));
        cutTo(spot, vast);
        shotDur = 1e9;
        phase = 'show';
        fade.style.opacity = '0';
        return window.__menuBeeld || { id };
      },
      stand: () => ({ id: curSpot && curSpot.id, t: Math.round(shotT * 10) / 10, wacht: streamPending(), tegels: tilesReady }),
    };
    const playIntro = async () => {
      trailerOn = true;
      dismissLoading();
      if (intro.mode === 'benchmark') { trailerOn = false; benchmark(!!intro.fromGame); return; }
      const T = await import('./trailer.js');
      const res = await T.runTrailer(world, { ...intro, env });
      if (intro.mode === 'opname' && !res.aborted && window.gdeDesktop && window.gdeDesktop.isDesktop) { window.gdeDesktop.quit(); return; }
      if (res.continuation) {
        shot = res.continuation;
        shotT = 0;
        shotDur = SHOT_MAX_S;
        phase = 'show';
        pose = shot(0);
        trailerOn = false;
        showMenu(true);
        await T.fadeOutTrailer(true);
      } else {
        await T.fadeOutTrailer(false, backHome);
        trailerOn = false;
        showMenu(true);
      }
    };
    // The menu waits for the gate (menuready.js): the world behind it drawn, the streaming quiet, the extra
    // work (`ready`) done. window.__menuGate tells what it saw; __menuHang the longest frame after the menu showed.
    const gate = makeMenuGate();
    let gateOpen = null;
    const gateReady = new Promise((r) => { gateOpen = r; });
    let extraDone = !ready;
    if (ready) Promise.resolve(ready).then(() => { extraDone = true; }, () => { extraDone = true; });
    window.__menuGate = () => gate.report();
    const lStatus = document.querySelector('#loading .ld-status');
    if (lStatus && !intro && !el('loading').dataset.gone) lStatus.textContent = 'De straten worden ingeladen';
    setTimeout(() => { gate.expire(performance.now()); gateOpen(); }, GATE.timeoutMs + 2000);
    let hangUntil = 0, hangMax = 0, lastRaf = 0;
    window.__menuHang = () => Math.round(hangMax);
    const openMenu = () => {
      if (window.__loadMarks) window.__loadMarks.menu = Math.round(performance.now());
      hangUntil = performance.now() + 4000;
      hangMax = 0;
      showMenu(false);
      startGfxAdvisor(getRenderer().getContext());
    };

    let renderDt = 0;
    const loop = (now) => {
      if (done) return;
      if (trailerOn) { last = now; requestAnimationFrame(loop); return; }
      const gap = lastRaf ? now - lastRaf : 0;
      lastRaf = now;
      if (hangUntil) { if (now < hangUntil) hangMax = Math.max(hangMax, gap); else hangUntil = 0; }
      if (!gate.isReady()) {
        const sp = streamPending();
        if (gate.step(now, gap, sp.buildings + sp.roads, extraDone && tilesReady)) gateOpen();
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      renderDt += dt;
      shotT += dt;
      phaseT += dt;
      // the next viewpoint's tiles load while this shot plays; the cut waits (black, at most BLACK_MAX_S) until they and what is built on them are in
      if (phase === 'show' && !upcoming && !qaHold && gate.isReady() && shotT > 2) { upcoming = nextSpot(); hold(holdTiles(map, upcoming)); }
      if (phase === 'show' && shotT > shotDur) { phase = 'out'; phaseT = 0; fade.style.opacity = '1'; }
      else if (phase === 'out' && phaseT > FADE_S) { cutTo(upcoming || nextSpot()); upcoming = null; phase = 'black'; phaseT = 0; }
      else if (phase === 'black' && phaseT > BLACK_HOLD_S) {
        const sp = streamPending();
        if ((tilesReady && sp.buildings + sp.roads === 0 && !sp.ahead) || phaseT > BLACK_MAX_S) { phase = 'show'; phaseT = 0; fade.style.opacity = '0'; }
      }
      pose = shot(shotT);
      world.cameraOverride = { ...pose, cut: true };
      // the menu covers part of the city, the settings sheet most of it; the
      // first-run check measures at full rate
      const every = isAdvisorSampling() ? 0 : MENU_FRAME_S[isPauseMenuOpen() ? 2 : 1];
      if (renderDt >= every) {
        const step = Math.min(0.1, renderDt);
        renderDt = 0;
        if (tick) { try { tick(step); } catch (err) { console.error(err); } }
        try { render(step); } catch (err) { console.error(err); }
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    if (intro) playIntro();
    else gateReady.then(openMenu);
  });
}


