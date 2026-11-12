import { screenFx } from './postfx3d.js';
import { gridItems } from './spatialgrid.js';
import { isOverlayHeld } from './overlayhold.js';
import { cutsceneTakesSpace } from './spacegate.js';
import { setDualText } from './subtitles.js';
import { paintSpeaker } from './speakers.js';
import { noteSpoken } from './characters.js';
import { getSettings } from './settings.js';
import { isPauseMenuOpen, isMapOpen } from './pausestate.js';
import { respawnPlayer } from './world.js';
import { V, W, clamp01, easeInOut, easeOut, pathShot, roofAt, clearKeys, buildingReach, groundLift } from './camerapath.js';
import { playStoryVoice, setStoryScene, setStoryProbe, playTextMumble, pauseStoryVoice, resumeStoryVoice } from './audio.js';
import { isIntroPlaying } from './trailerstate.js';
import { logoHtml, GAME_NAME, SUBTITLE } from './logo.js';
import { mayInterrupt, noteMoment } from './attention.js';
import { momentReason } from './cutgates.js';
import { registerNarrative } from './narrative.js';
import { lineVoiceFor, lineVoicesFailed } from './linevoice.js';
import { plannedVoiceLines } from './voicetiming.js';
// What cinematics.js asks of respawn.js and scene3d.js comes in through setCinematicLinks
// (respawn.js and main.js call it), so it imports neither (#108).
import { cinematicLinks as links } from './latehooks.js';
export function setCinematicLinks(l) { Object.assign(links, l); }
import { KEYS } from './storagekeys.js';
import { registerBusyProbe } from './busy.js';
import { interiorEyePose } from './carinterior.js';
import { hasCarInterior } from './carinteriorlayout.js';
import { defaultKey } from './controls.js';
import { playerBusy } from './busy.js';
import { hoofdspeler } from './players.js';
import { gebiedIn, puntInGebied } from './grenzen.js';
import { cinematicHang } from './cinelimit.js';
import { reducedMotion } from './motion.js';
import { fitCamera } from './cutscript.js';

// world.cameraOverride poses use map coordinates: x/y on the map, z = height in metres.
export function setCameraOverride(world, pose) {
  if (world) world.cameraOverride = pose || null;
}
// world.timeScale (0..1) slows gameplay; main.js multiplies the gameplay dt by it.

const SKIP_HOLD_S = 0.9; // hold Space this long to skip a cutscene
const LANDMARK_RADIUS = 55;
const CRASH_COOLDOWN_MS = 20000;
const BANNER_TIME = 3.8;
const FAIL_BANNER_TIME = 2.8;
// after this long, playing on (moving, a click, a key) takes the banner away
const BANNER_GRACE = 0.9;
const CAM_MODES = ['', 'BUMPER', 'ZIJKANT', 'HELIKOPTER', 'TELELENS', 'BINNENIN'];
const WIJK_KEY = KEYS.wijkenSeen;
// cinematics that book their own attention.js moment
const OWN_MOMENTS = new Set(['wijk', 'landmark', 'crash', 'wanted5']);
let endedAt = -Infinity;
// Real seconds since the last cinematic ended (the HUD needs a beat before the next text).
export const sinceCinematic = () => (performance.now() - endedAt) / 1000;
const WIJK_DWELL = 1.5;

const LANDMARK_HEIGHT = {
  Martinitoren: 97, Martinikerk: 32, 'Der Aa-kerk': 45, Academiegebouw: 30, 'Groninger Museum': 28,
  'Hoofdstation Groningen': 24, Euroborg: 30, 'Forum Groningen': 45, Goudkantoor: 14,
  // #721: de set pieces buiten de binnenstad
  Kardinge: 40, Suikerfabriek: 35, Eemshaven: 110, 'Vesting Bourtange': 25,
};

let world = null;
let els = null;
let active = null;
// De wereld van de lopende sessie, voor de intocht die vanuit een menu wordt teruggekeken (#708).
export const cinematicWorld = () => world;
let queue = [];
let scale = 1;
let started = false;
let camMode = 0;
let chipTimer = 0;
let banner = null;
let prevWanted = 0;
let lastImpactSeen = null;
let lastCrashAt = -Infinity;
let scanTimer = 0;
let respawnFromCine = false;
const seenWrecks = new WeakSet();
let introMod = null;
let introWait = 0;
let wijkSeen = null;
let wijkCand = null;
let wijkDwell = 0;
let wijkTimer = 0;
// hold-to-skip: when Space went down (performance.now ms), and whether the
// press started during a cutscene - then it is swallowed until its keyup
let skipHoldSince = null;
let swallowSpace = false;
let skipShown = -1;
let voicePaused = false;

function heading(w) {
  const p = hoofdspeler(w);
  return p.inVehicle && p.inVehicle.angle != null ? p.inVehicle.angle : p.angle;
}

function momentsOn() {
  return getSettings().cinematicMoments !== false;
}

// up in the own helicopter (heliflight.js): no pausing street-level scenes mid-air
function aloft(w) {
  const p = hoofdspeler(w);
  const v = p && p.inVehicle;
  return !!(v && v.isHeli && !v.onGround);
}

function gameStarted() {
  return document.body.classList.contains('game-started');
}

export function initCinematics(w) {
  world = w;
  if (els) return;
  setStoryProbe(() => !!active || isIntroPlaying());
  registerNarrative('scene', { active: () => !!active || isIntroPlaying() || isBannerUp() });
  registerNarrative('sub-cine', { active: () => !!els && els.root.classList.contains('has-sub') });
  const root = document.createElement('div');
  root.id = 'cine';
  root.innerHTML =
    '<div class="cine-tint"></div>' +
    '<div class="cine-bar top"></div><div class="cine-bar bottom"></div>' +
    '<div class="cine-card"><div class="cine-kicker"></div><div class="cine-title"></div></div>' +
    '<div class="cine-big"></div>' +
    '<div class="cine-name"></div>' +
    '<div class="cine-sub"><span class="cine-speaker"></span><span class="cine-line"></span></div>' +
    '<div class="cine-skip"><svg class="cine-skip-ring" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle class="fill" cx="12" cy="12" r="10"/></svg>' +
    '<span>Houd</span><span class="hud-key">SPATIE</span><span>ingedrukt om over te slaan</span></div>' +
    '<div class="cine-banner" hidden><div class="cb-col"><span class="cb-bar"></span><div class="cb-title"></div>' +
    '<div class="cb-reason"></div><div class="cb-fact"><span>Beloning</span><div class="cb-reward"></div></div><div class="cb-stats"></div></div></div>' +
    '<div class="cine-chip"></div>';
  document.body.appendChild(root);
  const sub = root.querySelector('.cine-sub');
  if (sub) { sub.setAttribute('role', 'status'); sub.setAttribute('aria-live', 'polite'); sub.setAttribute('aria-atomic', 'true'); }
  els = {
    root,
    kicker: root.querySelector('.cine-kicker'),
    title: root.querySelector('.cine-title'),
    big: root.querySelector('.cine-big'),
    name: root.querySelector('.cine-name'),
    speaker: root.querySelector('.cine-speaker'),
    line: root.querySelector('.cine-line'),
    banner: root.querySelector('.cine-banner'),
    bTitle: root.querySelector('.cb-title'),
    bReason: root.querySelector('.cb-reason'),
    bReward: root.querySelector('.cb-reward'),
    bStats: root.querySelector('.cb-stats'),
    chip: root.querySelector('.cine-chip'),
    skip: root.querySelector('.cine-skip'),
    lineIndex: -1,
  };

  // Skipping needs Space held for SKIP_HOLD_S, never a single press. A press
  // that starts during a cutscene never reaches gameplay (no handbrake or
  // jump the moment the cutscene ends), not even its key repeats.
  window.addEventListener('keydown', (e) => {
    if (e.key !== ' ') return;
    if (swallowSpace) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    // a key repeat of a press from before the cutscene (the handbrake) is no skip
    if (!cutsceneTakesSpace(active, { repeat: e.repeat, started: gameStarted(), menuOpen: isPauseMenuOpen() || isMapOpen() })) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    swallowSpace = true;
    skipHoldSince = active.skippable ? performance.now() : null;
  }, true);
  window.addEventListener('keyup', (e) => {
    if (e.key !== ' ') return;
    swallowSpace = false;
    skipHoldSince = null;
  }, true);
  window.addEventListener('blur', () => { swallowSpace = false; skipHoldSince = null; });

  w.onRespawn.push((wd, { busted }) => {
    if (respawnFromCine) return;
    playCinematic({
      id: 'respawn-card', priority: 4, duration: 1.8, letterbox: false, skippable: true,
      tint: busted ? 'bust' : 'death', big: busted ? 'OPGEPAKT' : 'DOOD', hideHud: false,
    });
  });

  for (const v of w.vehicles) if (v.wrecked) seenWrecks.add(v);
  import('./intromontage.js').then((m) => { introMod = m; }).catch((e) => { introWait = Infinity; console.warn('intro', e); });
}

export function isCinematicActive(id) {
  return !!active && (id == null || active.id === id);
}
registerBusyProbe('cinematic', () => isCinematicActive());

// The red damage vignette stays off during cutscenes unless the scene asks
// for it (spec.blood) or it is the death scene itself.
export function cinematicAllowsDamageFx() {
  return !active || active.id === 'death' || !!active.blood;
}

export function cinematicPausesGameplay() {
  return !!(active && active.pause);
}

// #729: een scène met pause:true zet de wereld echt stil. De wereldpauze loopt via
// world.uiPaused (main.js rekent die mee in world.paused); phone.js zet hem elke
// frame uit cinematicPausesGameplay(). Deze twee regels zorgen dat de pauze ook op
// paden zonder updatePhone staat (duif/heli) en dat de vorige stand terugkomt.
let pauseWasOn = false, pausePrevUi = false;
function pauseOn() {
  if (!world || pauseWasOn) return;
  pauseWasOn = true;
  pausePrevUi = !!world.uiPaused;
  world.uiPaused = true;
  world.cinematicPause = true;
}
function pauseOff() {
  if (!pauseWasOn) return;
  pauseWasOn = false;
  if (world) { world.uiPaused = pausePrevUi; world.cinematicPause = false; }
}

export function getCinemaCamMode() {
  return camMode;
}

// A name card at the lower left while a character is introduced (a scene's fx 'naam', #159).
// setNameCard('TESSA') shows it, setNameCard(null) fades it out.
export function setNameCard(text) {
  if (!els || !els.name) return;
  if (text) els.name.textContent = text;
  els.name.classList.toggle('visible', !!text);
}

// spec.prewarm: [{ x, y }] map points the scene will show, built ahead
// (scene3d.js prewarmStreamAt) so its first frames are not the far LOD.
function prewarmPoints(points) {
  for (const p of points || []) if (p) links.prewarmStreamAt(p.x, p.y);
}

// The tile world's side of the same list: the tiles round every point are
// requested first and held (pinned) until the scene ends, so a shot far from
// the player does not cut to a hole (TileWorld.registerShots).
let shotsHeld = false;
function holdShotTiles(points) {
  releaseShotTiles();
  const m = world && world.map;
  const pts = (points || []).filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y));
  if (!pts.length || !m || !m.store || !m.registerShots) return null;
  shotsHeld = true;
  // #734 (F12): de eerste frames mogen niet op ongeladen tegels wijzen; de
  // scène wacht kort op de pins (met een bovengrens, zodat streamen nooit hangt).
  return Promise.race([
    Promise.resolve(m.registerShots(pts.map((p) => ({ at: [p.x, p.y] }))).catch(() => {})),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]);
}
function releaseShotTiles() {
  if (!shotsHeld) return;
  shotsHeld = false;
  if (world && world.map && world.map.releaseShots) world.map.releaseShots();
}

// The point a pose shows (as scene3d.js streams it): the look target, at
// most 50 m out from the eye.
function poseFocus(pose) {
  if (!pose || !pose.position || !pose.lookAt) return null;
  const ex = pose.position.x, ey = pose.position.y, dx = pose.lookAt.x - ex, dy = pose.lookAt.y - ey;
  const d = Math.hypot(dx, dy), k = d > 50 ? 50 / d : 1;
  return { x: ex + dx * k, y: ey + dy * k };
}

// Cutscene camera poses off the world (the whole province, outline plus a margin) or NaN:
// one entry per cinematic id, for the story test.
const WORLD_EXTENT = [-28000, -41000, 46000, 43000];
const poseIssues = new Map();
function notePose(id, pose) {
  const P = pose.position, L = pose.lookAt;
  const ok = (q) => q && Number.isFinite(q.x) && Number.isFinite(q.y) && q.x > WORLD_EXTENT[0] && q.x < WORLD_EXTENT[2] && q.y > WORLD_EXTENT[1] && q.y < WORLD_EXTENT[3] && (!Number.isFinite(q.z) || (q.z > -10 && q.z < 900));
  if ((ok(P) && ok(L)) || poseIssues.has(id)) return;
  poseIssues.set(id, { id, position: P && { x: P.x, y: P.y, z: P.z }, lookAt: L && { x: L.x, y: L.y, z: L.z } });
  console.warn('cinematic camera off the map', id, JSON.stringify(poseIssues.get(id)));
}
export function cinematicPoseIssues() {
  return [...poseIssues.values()];
}

export function playCinematic(spec) {
  if (!els) return false;
  prewarmPoints(spec.prewarm);
  const priority = spec.priority ?? 1;
  if (active) {
    if (priority > active.priority) finish(true, true);
    else {
      if (spec.queue) queue.push(spec);
      return !!spec.queue;
    }
  }
  begin(spec);
  return true;
}

// samen spelen (coopcut.js): de gast loopt mee met de tijd van de gastheer
export const setCinematicRate = (r) => { if (active) active.rate = r; };
export const setCinematicTime = (t) => { if (active) active.t = Math.max(0, Math.min(active.duration - 0.05, t)); };

export function skipCinematic() {
  if (active) finish(true);
}

// (#728) Een eigen camerastand buiten de scènewachtrij: de polsstok- en duifcamera zijn
// gameplay-camera's, geen cutscene. Ze bezetten geen prioriteitsslot (waardoor een echte
// scène uren kon wachten), zijn niet skipbaar en hebben geen duur van 600 s: de minigame
// stopt ze zelf, en een vergeten take ruimt stopCameraTake op.
let take = null;
export function startCameraTake(id, shot, { letterbox = true, hideHud = false } = {}) {
  if (typeof shot !== 'function') return false;
  take = { id, shot, letterbox, hideHud, t: 0 };
  if (els) {
    els.root.classList.toggle('letterbox', !!letterbox);
    document.body.classList.toggle('cine-hide-hud', !!hideHud);
  }
  return true;
}
export function stopCameraTake(id) {
  if (!take || (id != null && take.id !== id)) return false;
  take = null;
  if (els) {
    els.root.classList.remove('letterbox');
    document.body.classList.remove('cine-hide-hud');
  }
  if (world && !active) world.cameraOverride = null;
  return true;
}
export const cameraTakeActive = (id) => !!take && (id == null || take.id === id);

// De stemmen van een scène (ook als pure functie te testen, #711): regels zonder eigen opname krijgen er een uit de
// 'lines'-bank; een regel met `own` (de scène speelt hem zelf) of met een eigen `voice` blijft staan, zodat de gast
// dezelfde opname en dezelfde ondertiteltijden houdt als de gastheer.
export // #733: één keer melden als scènes zonder stem spelen omdat de stemmenbank
// definitief niet laadde (dan blijven de ondertitels staan).
let stemmenStilGemeld = false;

// De stemmen van een scène (#711): regels zonder eigen opname krijgen er een uit de
// 'lines'-bank. De pure regels staan in voicetiming.js, zodat cutscenehost ze al vóór
// compileScene kan toepassen (#731: de shots en cues compilen met dezelfde duur als de
// stemmen). Een scène die de opname zelf afspeelt (own) of al een voice heeft, blijft
// staan; de gast houdt zo dezelfde opname en ondertiteltijden als de gastheer.
// Export voor test en voor de gastkant (coopcut_test).
export function attachVoices(a) {
  if (!a || !a.lines || !a.lines.length) return;
  const r = plannedVoiceLines(a.lines, a.duration, lineVoiceFor);
  if (!r.changed) {
    if (lineVoicesFailed() && !stemmenStilGemeld) {
      stemmenStilGemeld = true;
      console.warn('scène zonder stem: de stemmenbank is niet geladen; de ondertitels blijven staan');
    }
    return;
  }
  a.lines = r.lines;
  a.duration = r.duration;
}

// the internal codes of playTextMumble (audio.js): A = Tessa, T = Tammo, V = Rikus; anyone else keeps the default pitch
const MUMBLE_WHO = (speaker) => (/^(anita|tessa)$/i.test(speaker) ? 'A' : /^tammo$/i.test(speaker) ? 'T' : /^rikus$/i.test(speaker) ? 'V' : '');

function begin(spec) {
  active = {
    priority: 1, duration: 3, letterbox: true, skippable: true, hideHud: true, pause: false, timeScale: 1,
    ...spec, t: 0,
  };
  resetSkip();
  const tiles = holdShotTiles(spec.prewarm);
  active._tilesDone = !tiles;
  voicePaused = false;
  const tilesScene = active; // de scène kan intussen vervangen of gestopt zijn
  if (tiles) tiles.then(() => { if (active === tilesScene) active._tilesDone = true; }).catch(() => { if (active === tilesScene) active._tilesDone = true; });
  take = null; // een scène neemt de camera over van een camerastand (#728)
  attachVoices(active);
  if (active.pause) pauseOn(); // (#729) de wereld en de speler staan stil zolang de scène duurt

  const r = els.root;
  r.classList.toggle('letterbox', !!active.letterbox);
  r.classList.toggle('show-skip', !!active.skippable && active.duration > 1.6);
  r.dataset.tint = active.tint || '';
  setTint(active.tint || '');
  r.dataset.accent = active.accent || '';
  setDualText(els.kicker, active.kicker || '');
  els.title.textContent = active.title || '';
  r.classList.toggle('has-card', !!(active.title || active.kicker));
  if (active.logo) els.big.innerHTML = logoHtml();
  else setDualText(els.big, active.big || '');
  r.classList.toggle('has-big', !!(active.big || active.logo));
  els.lineIndex = -1;
  els.speaker.textContent = '';
  els.line.textContent = '';
  r.classList.remove('has-sub');
  document.body.classList.toggle('cine-hide-hud', !!active.hideHud);
  r.classList.add('active');
  // lines with a recording ({ voice }) are spoken as their subtitle comes up
  active.voiced = !!(active.lines && active.lines.some((l) => l.voice)) || !!active.mumble;
  if (active.voiced) setStoryScene(true, 'cine');
  // a pausing cutscene brings the player's vehicle to a stop, so resuming
  // doesn't launch you onward at full speed - except the ones that ask to
  // keep the motion (the wijk flyover only plays at low speed anyway)
  const eigen = hoofdspeler(world);
  if (active.pause && !active.keepMotion && eigen && eigen.inVehicle) {
    const v = eigen.inVehicle;
    v.speed = 0;
    v.driftX = 0;
    v.driftY = 0;
    v.yawVel = 0;
  }
  if (active.onStart) active.onStart();
}

function finish(skipped, replaced = false) {
  const a = active;
  active = null;
  pauseOff(); // (#729) de wereld loopt weer door (de volgende scène zet hem zo nodig weer stil)
  releaseShotTiles();
  resetSkip();
  if (voicePaused) { resumeStoryVoice(); voicePaused = false; }
  clearCinematicUi();
  const r = els.root;
  r.classList.remove('active', 'letterbox', 'has-card', 'has-big', 'has-sub', 'show-skip', 'sub-clue');
  r.dataset.tint = '';
  setTint('');
  document.body.classList.remove('cine-hide-hud');
  if (world) world.cameraOverride = null;
  if (a && a.voiced) setStoryScene(false, 'cine');
  // a story or mission scene counts against the attention budget too: no
  // wijk flyover straight after an outro or the opening montage
  if (a && (a.pause || a.hideHud) && !OWN_MOMENTS.has(a.id)) noteMoment('scene');
  if (a) endedAt = performance.now();
  try {
    if (a && a.onEnd) a.onEnd(skipped, replaced);
  } finally {
    // a replaced scene makes way for the new one, the queue waits for that
    if (!active && !replaced && queue.length) begin(queue.shift());
  }
}

// #734 (F8): één hold mag nooit twee scènes skippen. Reset de holdstand bij het
// begin en het einde van elke scène (ook als de vorige natuurlijk afliep of
// door een hogere prioriteit werd vervangen).
function resetSkip() {
  skipHoldSince = null;
  skipShown = -1;
  if (els && els.skip) {
    els.skip.style.setProperty('--hold', '0');
    els.skip.classList.remove('holding');
  }
}

// #734 (F10): één plek die alle scène-UI opruimt. De banner kan uit een onEnd
// komen en wordt daarom vóór onEnd gewist; de HUD-flags en timeScale gaan mee.
function clearCinematicUi() {
  if (!els) return;
  els.banner.hidden = true;
  els.banner.classList.remove('in', 'out');
  banner = null;
  els.chip.classList.remove('visible');
  chipTimer = 0;
  setNameCard(null);
  if (world) {
    world.timeScale = 1;
    world.cinematicHidePlayers = false;
    world.cinematicHideNav = false;
  }
}

function updateSkipHold() {
  let k = 0;
  if (active && active.skippable && skipHoldSince != null) {
    k = Math.min(1, (performance.now() - skipHoldSince) / (SKIP_HOLD_S * 1000));
    if (k >= 1 && active.t > 0.25) {
      skipHoldSince = null;
      finish(true);
      k = 0;
    }
  } else if (!active) skipHoldSince = null;
  const shown = Math.round(k * 100);
  if (shown === skipShown) return;
  skipShown = shown;
  els.skip.style.setProperty('--hold', String(k));
  els.skip.classList.toggle('holding', k > 0);
}

function updateSubtitles() {
  const lines = active.lines;
  if (active.cardFor != null && active.t > active.cardFor) els.root.classList.remove('has-card');
  if (!lines || !lines.length) return;
  const start = 0.5, span = Math.max(0.5, active.duration - start - 0.2);
  const idx = lines[0].at != null
    ? lines.findIndex((l) => active.t >= l.at && active.t < l.at + l.dur)
    : active.t < start ? -1 : Math.min(lines.length - 1, Math.floor(((active.t - start) / span) * lines.length));
  if (idx === els.lineIndex) return;
  els.lineIndex = idx;
  const l = lines[idx];
  els.root.classList.toggle('has-sub', !!l);
  paintSpeaker(els.speaker, l && l.speaker);
  if (l && l.speaker) noteSpoken(world, l.speaker);
  setDualText(els.line, l ? l.text : '', { gloss: true });
  els.root.classList.toggle('sub-clue', !!(l && l.clue));
  if (l && l.voice) playStoryVoice(l.voice, { radio: !!l.radio });
  else if (l && active.mumble && l.speaker && !l.own) playTextMumble(MUMBLE_WHO(l.speaker), l.text, l.dur ?? 2.5); // geen opname: een zacht gemurmel onder de ondertitel (#326)
}

// realtime cinematics (the opening montage: its lines are timed to their
// recordings and its cuts to the theme) run on the wall clock: the frame dt
// is capped at 50 ms, so below 20 fps they would drift behind the audio and
// hold every subtitle far longer than its line.
let wallLast = 0;

export function updateCinematics(dt, w) {
  world = w;
  const now = performance.now();
  const wallDt = wallLast ? Math.min(0.25, Math.max(0, (now - wallLast) / 1000)) : dt;
  wallLast = now;
  if (!els) initCinematics(w);
  if (!started && gameStarted() && (introMod || (introWait += dt) > 3)) {
    started = true;
    prevWanted = w.wanted;
    lastImpactSeen = w.lastImpact || null;
    playGameStart(w);
  }
  // Vangnet voor de allereerste opening: als een filmpje de gameplay nog steeds
  // tegenhoudt terwijl de wereldklok nog niet loopt, sla het na 30 s over. Dit is de
  // enige plek met een time-out voor een hangende opening (#635): main.js had een
  // tweede, 30 s-tak die door een ontbrekende import nooit werkte.
  if (active && !active._wStart && w && w.time <= 1) active._wStart = now;
  if (active && cinematicHang({ startedAt: active._wStart, now, worldTime: w && w.time, sceneT: active.t }) === 'opening') { finish(true); return; }
  // (#714) Een gastkopie (cutId) loopt door achter het eigen pauzemenu of de kaart van de gast: anders bevriest zijn
  // kopie en springt hij na het sluiten van het menu bij. De gastheer bepaalt de tijd (coopcut.cutGastTik), niet het menu.
  // (#713) Tijdens het wachtscherm van samen spelen (coopHold) staat alles stil, ook de kopie: de sessie wordt opnieuw opgezet.
  const gastKopie = !!(active && active.cutId != null);
  const hold = !!(w && w.coopHold);
  const menuOpen = isPauseMenuOpen() || isMapOpen();
  // #734 (F9): niet alleen het pauzemenu en de kaart, maar elke wereldpauze
  // (winkel, telefoon, coopHold) stopt de scèneklok; de stem gaat mee. De eigen
  // cinematicPause (#729) telt niet: die zet de scène zelf.
  const wereldPauze = !!(w && w.paused && !w.cinematicPause);
  const frozen = menuOpen || hold || wereldPauze;
  if (active && (active.voiced || active.mumble)) {
    if (frozen && !voicePaused) { if (pauseStoryVoice()) voicePaused = true; }
    else if (!frozen && voicePaused) { resumeStoryVoice(); voicePaused = false; }
  }
  if (!frozen) {
    if (active) {
      // Vangnet: een filmpje dat veel wandkloktijd krijgt maar zelf niet vooruitkomt
      // (een vastgelopen intro of scène) mag de game niet blokkeren.
      if (!active._wStart) active._wStart = now;
      if (cinematicHang({ startedAt: active._wStart, now, worldTime: w && w.time, sceneT: active.t, waitsForInput: !!active.pause }) === 'frozen') { finish(true); return; }
      // #734 (F12): de eerste frames pas laten lopen als de shottegels klaar zijn (met time-out)
      if (active._tilesDone) {
        active.t += (active.realtime ? Math.max(dt, wallDt) : dt) * (active.rate ?? 1);
        updateSubtitles();
        if (active.t >= active.duration) finish(false);
      }
    }
    updateSkipHold();
    if (started) checkTriggers(dt, w);
    updateBanner(dt);
    if (chipTimer > 0 && (chipTimer -= dt) <= 0) els.chip.classList.remove('visible');
  } else if (gastKopie && !hold && menuOpen) {
    // alleen de scène van de gastheer loopt door; de rest van de wereld blijft stil staan onder het menu
    active.t += (active.realtime ? Math.max(dt, wallDt) : dt) * (active.rate ?? 1);
    updateSubtitles();
    if (active.t >= active.duration) finish(false);
    skipHoldSince = null;
  } else skipHoldSince = null;

  if (started && w.input.wasPressed('v') && !active) cycleCinemaCam(w);
  // C: tussen de volgcamera en het binnenzicht van de auto (#442); in een browser is C de Ctrl-toets, daar blijft V
  const lichaam = hoofdspeler(w);
  if (started && !active && lichaam.inVehicle && w.input.wasPressed('c') && hasCarInterior(lichaam.inVehicle) && defaultKey('control') !== 'c') setCamMode(camMode === 5 ? 0 : 5);
  if (camMode && !lichaam.inVehicle) setCamMode(0);

  // a scene that films its own cast (hidePlayers): the real players stay hidden for the whole scene, also when another run
  // cleans up in between and clears the flag (two identical Tammos next to Tessa, #264)
  if (active && active.hidePlayers) { w.cinematicHidePlayers = true; w.cinematicHideNav = true; }
  let pose = null;
  if (active && active.shot) {
    try {
      pose = active.shot(clamp01(active.t / active.duration), active.t, w);
    } catch (err) {
      console.error('cinematic shot', active.id, err);
      finish(true);
    }
  }
  else if (!active && take) {
    // (#728) camerastand zonder scène: eigen klok, geen wachtrij, geen skip
    take.t += dt;
    try { pose = take.shot(take.t, w); } catch (err) { console.error('camera take', take && take.id, err); stopCameraTake(); }
  }
  else if (!active && camMode && lichaam.inVehicle) pose = cinemaCamPose(w);
  if (pose && active) notePose(active.id, pose);
  w.cameraOverride = pose;

  const target = active ? active.timeScale : 1;
  scale += (target - scale) * Math.min(1, dt * 7);
  if (Math.abs(scale - target) < 0.01) scale = target;
  w.timeScale = scale;
  const slowmo = scale < 0.85;
  if (slowmo !== screenFx.slowmo) {
    screenFx.slowmo = slowmo;
    document.body.classList.toggle('cine-slowmo', slowmo);
  }
}

function setTint(tint) {
  if (screenFx.tint === tint) return;
  const b = document.body.classList;
  if (screenFx.tint) b.remove('cine-tint-' + screenFx.tint);
  if (tint) b.add('cine-tint-' + tint);
  screenFx.tint = tint;
}

// --- triggers ---------------------------------------------------------------

function checkTriggers(dt, w) {
  if (w.pendingRespawn && !w.pendingRespawn.scene && !isCinematicActive('death')) playDeath(w, w.pendingRespawn);

  const wantedUp = w.wanted >= 5 && prevWanted < 5;
  prevWanted = w.wanted;
  if (wantedUp && momentsOn() && !active && !aloft(w) && mayInterrupt('wanted5', w)) { noteMoment('wanted5'); playWantedFive(w); }

  const imp = w.lastImpact;
  if (imp && imp !== lastImpactSeen) {
    lastImpactSeen = imp;
    if (imp.strength > 0.8 && (!imp.blast || imp.own)) tryCrashReplay(w, imp.x, imp.y);
  }

  checkWijk(dt, w);
  scanTimer -= dt;
  if (scanTimer > 0) return;
  scanTimer = 0.25;
  const p = hoofdspeler(w);
  for (const v of w.vehicles) {
    if (!v.wrecked || seenWrecks.has(v)) continue;
    seenWrecks.add(v);
    if (v.wreckedByPlayer && Math.hypot(v.x - p.x, v.y - p.y) < 20) tryCrashReplay(w, v.x, v.y);
  }
  checkLandmarks(w);
  checkOmmelanden(w);
}

// --- the Ommelanden: a 'landmark' for leaving the city -----------------------

const OMMELANDEN = 'De Ommelanden';
const OMMELANDEN_MARGIN = 40; // meters past the last real map data
let cityBox = null;

function realMapBox(map) {
  if (cityBox) return cityBox;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of gridItems(map.roadGrid)) {
    const b = r.bounds;
    if (!b) continue;
    if (b[0] < x0) x0 = b[0];
    if (b[1] < y0) y0 = b[1];
    if (b[2] > x1) x1 = b[2];
    if (b[3] > y1) y1 = b[3];
  }
  cityBox = [x0, y0, x1, y1];
  return cityBox;
}

function checkOmmelanden(w) {
  if (active || !momentsOn() || w.wanted > 0 || w.pendingRespawn || w.pigeonMode) return;
  if (busyWithJob(w)) return;
  // #732: geen scène in een race, op snelheid of in de lucht (dezelfde poorten als de andere momenten)
  if (momentReason(w, { vehicle: hoofdspeler(w).inVehicle })) return;
  const seen = visited(w);
  if (seen.has(OMMELANDEN)) return;
  const [x0, y0, x1, y1] = realMapBox(w.map);
  const p = hoofdspeler(w), m = OMMELANDEN_MARGIN;
  if (p.x > x0 - m && p.x < x1 + m && p.y > y0 - m && p.y < y1 + m) return;
  if (aloft(w) || !mayInterrupt('ommelanden', w)) return;
  noteMoment('ommelanden');
  seen.add(OMMELANDEN);
  playOmmelanden(w);
}

function playOmmelanden(w) {
  const p = hoofdspeler(w);
  const [x0, y0, x1, y1] = realMapBox(w.map);
  // look away from the city: out over the open land
  let ox = p.x - (x0 + x1) / 2, oy = p.y - (y0 + y1) / 2;
  const ol = Math.hypot(ox, oy) || 1;
  ox /= ol; oy /= ol;
  const nx = -oy, ny = ox;
  const b = behindPose(w);
  // (#730) ook hier boven de grond op deze plek (dijk, wierde), niet op absolute z=0
  const gz = groundLift(w.map, p.x, p.y, p.gz || 0);
  const keys = [
    { pos: W(p.x - ox * 10 + nx * 4, gz + 6, p.y - oy * 10 + ny * 4), look: W(p.x + ox * 30, gz + 2, p.y + oy * 30) },
    { pos: W(p.x - ox * 6 + nx * 18, gz + 38, p.y - oy * 6 + ny * 18), look: W(p.x + ox * 220, gz + 0, p.y + oy * 220) },
    { pos: W(p.x + ox * 40 - nx * 26, gz + 52, p.y + oy * 40 - ny * 26), look: W(p.x + ox * 320 + nx * 120, gz + 0, p.y + oy * 320 + ny * 120) },
    { pos: W(p.x - ox * 14, gz + 12, p.y - oy * 14), look: W(p.x + ox * 20, gz + 1.5, p.y + oy * 20) },
    b,
  ];
  playCinematic({
    id: 'landmark', priority: 1, duration: 8, pause: true,
    lines: [{ speaker: '', text: 'Koeien, sloten en een horizon. Verder niks. Heerlijk.' }],
    shot: pathShot(clearKeys(w, keys)),
  });
}

function visited(w) {
  if (!(w.visitedLandmarks instanceof Set)) w.visitedLandmarks = new Set(w.visitedLandmarks || []);
  return w.visitedLandmarks;
}

function checkLandmarks(w) {
  if (active || !momentsOn() || w.wanted > 0 || w.pendingRespawn) return;
  if (busyWithJob(w)) return;
  // #732: ook niet als duif, in een race, in de lucht of op snelheid: deze scène pauzeert de wereld
  if (momentReason(w, { vehicle: hoofdspeler(w).inVehicle })) return;
  const seen = visited(w);
  const p = hoofdspeler(w);
  for (const lm of w.map.meta.landmarks || []) {
    if (!lm.name || seen.has(lm.name)) continue;
    if (Math.hypot(lm.x - p.x, lm.y - p.y) > LANDMARK_RADIUS) continue;
    // over budget: stays unseen, plays on a later visit
    if (aloft(w) || !mayInterrupt('landmark', w)) return;
    noteMoment('landmark');
    seen.add(lm.name);
    playLandmark(w, lm);
    return;
  }
}

function markNearbyLandmarksVisited(w, radius) {
  const seen = visited(w);
  const p = hoofdspeler(w);
  for (const lm of w.map.meta.landmarks || []) {
    if (lm.name && Math.hypot(lm.x - p.x, lm.y - p.y) < radius) seen.add(lm.name);
  }
}

// --- moments ----------------------------------------------------------------

function behindPose(w, back = 7, up = 3.4) {
  const p = hoofdspeler(w), a = heading(w);
  return { pos: W(p.x - Math.cos(a) * back, up, p.y - Math.sin(a) * back), look: W(p.x, 1.3, p.y) };
}

function flyInShot(w, first) {
  const p = hoofdspeler(w), a = heading(w);
  const fx = Math.cos(a), fy = Math.sin(a);
  const high = clearKeys(w, [
    first || { pos: W(p.x - fx * 20 + fy * 45, 55, p.y - fy * 20 - fx * 45), look: W(p.x, 4, p.y) },
    { pos: W(p.x - fx * 26 + fy * 14, 30, p.y - fy * 26 - fx * 14), look: W(p.x, 2, p.y) },
  ]);
  const fallback = [{ pos: W(p.x - fx * 13, 9, p.y - fy * 13), look: W(p.x, 1.2, p.y) }, behindPose(w)];
  let path = null;
  // The descent ends on the live follow camera, straight down onto it, so
  // play resumes exactly where the shot stops: a landing key lifted over a
  // roof (the home tower right behind the new-game spawn) would leave the
  // camera hanging in the air. Built on the second frame, once the follow
  // camera has caught up with a player the scene just put back.
  return (u) => {
    const f = links.getFollowPose();
    if (!path && f && u > 0) {
      const land = { pos: V(f.position.x, f.position.y, f.position.z), look: V(f.lookAt.x, f.lookAt.y, f.lookAt.z) };
      const above = { pos: V(land.pos.x, land.pos.y, land.pos.z + 10), look: land.look };
      path = pathShot([...high, above, land]);
    }
    if (!path && u > 0.1) path = pathShot(clearKeys(w, [...high, ...fallback]));
    if (!path) return { position: high[0].pos, lookAt: high[0].look };
    const q = path(u);
    return f ? { ...q, follow: u > 0.75 } : q;
  };
}

function skyFlyInShot(w) {
  const p = hoofdspeler(w), a = heading(w);
  const fx = Math.cos(a), fy = Math.sin(a);
  return flyInShot(w, { pos: W(p.x - fx * 60 + fy * 70, 130, p.y - fy * 60 - fx * 70), look: W(p.x, 0, p.y) });
}

function playGameStart(w) {
  markNearbyLandmarksVisited(w, 70);
  // a new save starts with its own empty list; a loaded save brought its list in through
  // applyWijkenSeen (savegame.js applySave), so nothing is read or wiped here (#726)
  if (!w.loadedFromSave) wijkSeen = new Set();
  const here = currentWijk(w);
  if (here) markWijk(here);
  w.messages = w.messages.filter((m) => !m.text.startsWith('Je begint bij'));
  const mp = w._menuCamPose;
  const first = mp && mp.position && mp.lookAt
    ? { pos: V(mp.position.x, mp.position.y, mp.position.z), look: V(mp.lookAt.x, mp.lookAt.y, mp.lookAt.z) }
    : null;
  const where = w.loadedFromSave ? 'Welkom terug in Grunn' : w.spawnLandmarkName ? `Je begint bij ${w.spawnLandmarkName}` : 'Welkom in Grunn';
  playCinematic({
    id: 'start', priority: 3, duration: 5.5, pause: true,
    kicker: SUBTITLE, title: GAME_NAME,
    lines: [{ speaker: '', text: where }],
    shot: flyInShot(w, first),
  });
}

// --- first visit to a wijk ------------------------------------------------------

// Rikus's line on the first visit to a wijk: a few per wijk, so neighbours
// don't sound alike. WIJK_ALIAS points a buurt without its own lines at the
// wijk it belongs to; the rest gets WIJK_GENERIC. wijkLine never repeats one
// of the last WIJK_RECENT lines (kept across sessions).
const WIJK_LINES = {
  Binnenstad: ['Het hart van Grunn. Klopt het hardst na middernacht.', 'Twee pleinen, één toren, en overal een fiets in de weg.', 'De binnenstad. Met de auto mag je er niet door. Sinds 1977.'],
  'Binnenstad-Oost': ['De oostkant van de binnenstad. Kroegen, kerken en een terras op elke stoep.', 'Hier staan de oude huizen schever dan de mensen na sluitingstijd.'],
  Stationsgebied: ['Iedereen komt hier aan. Niet iedereen gaat weer weg.', 'Het Hoofdstation. Het mooiste van het land, zeggen ze. Wij zeggen het in elk geval.', 'Onder het plein een fietsenkelder. Je fiets vind je er nooit meer terug.'],
  Westerhaven: ['De Westerhaven. Vroeger schepen, nu een winkelcentrum met uitzicht op het water.', 'Hier legden de turfschippers aan. Nu zoekt iedereen een parkeerplek.'],
  Ebbingekwartier: ['Hip, nieuw en duur. Hou je portemonnee vast.', 'Vroeger de gasfabriek. Nu koffie met havermelk.', 'Hier wonen ze in een loods en noemen ze het een loft.'],
  Hortusbuurt: ['De Hortusbuurt. De hortus is allang naar Haren. De naam is gebleven.', 'Stille straatjes achter de Ebbingestraat. Hier fluisteren zelfs de fietsers.'],
  'A-kwartier': ['Smalle straatjes, oude grachten, niks zien en niks zeggen.', 'De Hoge en de Lage der A. Pakhuizen, bruggetjes en een terras aan het water.'],
  Damsterkwartier: ['Het Damsterdiep. Hier begon de trekvaart naar Delfzijl. Nu varen er eenden.'],
  Oosterpoort: ['Muziek, kroegen en altijd wel ergens herrie.', 'De Oosterpoort. Achter elke deur een fiets en een bandje dat oefent.', 'Hier staat de concertzaal. De buren luisteren gratis mee, door de muur heen.'],
  Herewegbuurt: ['De Herewegbuurt. Grote huizen, grote bomen, en de bus dendert er dwars doorheen.', 'Villa\'s aan de Hereweg. Hier heeft de heg een eigen tuinman.'],
  Zeeheldenbuurt: ['Genoemd naar helden. De bewoners doen hun best.', 'De Zeeheldenbuurt. Zeehelden, in Grunn. Het dichtstbijzijnde zeegat is Delfzijl.'],
  Rivierenbuurt: ['De Rivierenbuurt. Elke straat een rivier. Water zie je hier alleen als het regent.', 'Rijtjeshuizen met een voortuintje. Op zaterdag wordt hier de auto gewassen. Met de hand.'],
  Grunobuurt: ['De Grunobuurt. Genoemd naar Gruno, die Stad gesticht zou hebben. Zou.', 'Rustig, groen, en vlak bij de Euroborg. Behalve op wedstrijddagen.'],
  Laanhuizen: ['Laanhuizen. Rijtjes, hofjes, en het Stadspark om de hoek.'],
  Europapark: ['Voetbal, kantoren en een hoop glas.', 'De Euroborg. Als de club scoort, hoor je het tot in Haren.', 'Europapark. Een station waar je alleen uitstapt als er gevoetbald wordt.'],
  Zuiderpark: ['Het Zuiderpark. Vijver, kinderboerderij, en een fietspad dat je nooit twee keer vindt.'],
  Schildersbuurt: ['Elke straat een schilder. Elke buur een mening.', 'De Schildersbuurt. Hier woont Berend. Hij heeft er vast al een brief over geschreven.', 'Smalle stoepen, lage huizen en een buurman die altijd net buiten staat.'],
  Korrewegwijk: ['Stoer, eerlijk en met de fiets tot aan de voordeur.', 'De Korrewegwijk. Studenten op zolder, oma beneden, en ze groeten elkaar.', 'Hier hangt de was buiten. Ook als het regent. Vooral als het regent.'],
  Oosterparkwijk: ['Het Oosterpark. Mijn oude stoep. Doe er voorzichtig mee.', 'Hier stond het oude stadion. Op zondag hoorde je het tot in de binnenstad.', 'Rode baksteen, smalle straatjes, en een hart van goud. Zeg dat maar niet hardop.'],
  'Het Blauwe Dorp': ['Het Blauwe Dorp. Eerst een volksbuurtje, toen gesloopt, nu nieuw. De naam mocht blijven.', 'Nieuwe huizen, oude naam. En niks is hier blauw.'],
  'De Hoogte': ['De Hoogte. Volkswijk met een eigen park en een eigen mening.', 'Hier zeggen ze nog moi als je langsloopt. Zeg maar terug.'],
  Paddepoel: ['Winkelen, wonen en de ringweg om de hoek.', 'Paddepoel. Voor een Stadjer uit het Oosterpark is dit buitenland. Tammo woont er nu.', 'Flats, een winkelcentrum, en de wind krijg je er gratis bij.'],
  'Paddepoel-Noord': ['Paddepoel-Noord. Flats op een rij, en daarachter de universiteit op Zernike.', 'Hier fietst om half negen heel Stad langs. Naar Zernike, met tegenwind.'],
  'Paddepoel-Zuid': ['Paddepoel-Zuid. Flats, gras ertussen, en de Pleiadenlaan als ruggengraat.', 'De sterrenbuurt. Elke straat een sterrenbeeld. Je ziet ze alleen niet, door de lantaarnpalen.'],
  Selwerd: ['Selwerd. Vroeger een klooster, nu flats en een busbaan.', 'Studenten, gezinnen en een winkelcentrum dat net groot genoeg is.'],
  Selwerderwijk: ['De Selwerderwijk. Rijtjeshuizen tussen het kanaal en de ringweg. Hier staat niemand stil.'],
  Reitdiepswaard: ['Het Reitdiep. Nieuwe huizen aan oud water. De schippers kijken toe.', 'Aan het Reitdiep. Hier vaar je zo naar Zoutkamp. Als de brug opengaat.'],
  Hoendiep: ['Het Hoendiep. Een kanaal naar het westen. Daar begint het Westerkwartier.'],
  Noorderplantsoenbuurt: ['Bij het Noorderplantsoen. Bij de eerste zon ligt hier half Stad in het gras.', 'Hier woont iedereen vlak bij het park. Dat zeggen ze ook op elk feestje.'],
  Professorenbuurt: ['De Professorenbuurt. Statige huizen, en achter elk raam iemand die het beter weet.'],
  Oranjewijk: ['De Oranjewijk. Herenhuizen, bomen, en een stoep vol bakfietsen.'],
  'Kop van Oost': ['Kop van Oost. Oude pakhuizen aan het water. Het wordt hier hip, zeggen ze. Al jaren.'],
  Eemskanaal: ['Het Eemskanaal. Een rechte streep water naar Delfzijl, en de wind komt er gratis mee.'],
  Suikerfabriekterrein: ['De oude suikerfabriek. Nu festivals en moestuinen. Het ruikt er niet meer naar suiker.'],
  'De Meeuwen': ['De Meeuwen. Een buurt genoemd naar de vogel die je patat jat.'],
  Badstratenbuurt: ['De Badstratenbuurt. Kleine straatjes, kleine huizen, en in elk huis vijf studenten.'],
  Schuitenschuiverskwartier: ['Het Schuitenschuiverskwartier. Zeg dat maar eens na vier kroegen.'],
  'Nieuw-Indische buurt': ['De Indische buurt. Straatnamen van ver weg, huizen van hier.'],
};
const WIJK_ALIAS = {
  Damsterdiep: 'Damsterkwartier', Damsterbuurt: 'Damsterkwartier', Oranjebuurt: 'Oranjewijk', Tuinwijk: 'Oranjewijk',
  'Oud-Indische buurt': 'Nieuw-Indische buurt', 'Kop Indische buurt': 'Nieuw-Indische buurt', 'West-Indische buurt': 'Nieuw-Indische buurt',
  Studentenbuurt: 'Badstratenbuurt', Florabuurt: 'De Hoogte', Vogelbuurt: 'De Hoogte',
};
const WIJK_GENERIC = [
  'Moi. Hier kent iedereen elkaar, dus doe een beetje normaal.',
  'Rustige straten, drukke fietspaden. Kiek goed uit.',
  'Hier zeggen ze niks, maar ze zien alles.',
  'Parkeren kost hier meer dan je auto.',
  'Op elke hoek een snackbar. Grunn op z’n best.',
  'Het waait hier altijd. Ook als het niet waait.',
  'De buren hebben je al gezien. Zwaai maar even.',
  'Het is hier stil. Dat verandert zo.',
];
const WIJK_RECENT_KEY = KEYS.wijkLinesRecent;
const WIJK_RECENT = 12;

// The HUD's place name (hud_panel.js) shows the wijk's first line, without
// booking it as heard.
export function wijkBlurb(name) {
  const pool = WIJK_LINES[name] || WIJK_LINES[WIJK_ALIAS[name]];
  return pool ? pool[0] : '';
}

function wijkLine(name) {
  const pool = WIJK_LINES[name] || WIJK_LINES[WIJK_ALIAS[name]] || WIJK_GENERIC;
  let recent = [];
  try { recent = JSON.parse(localStorage.getItem(WIJK_RECENT_KEY) || '[]'); } catch (e) { /* ignore */ }
  if (!Array.isArray(recent)) recent = [];
  const fresh = pool.filter((t) => !recent.includes(t));
  // all heard lately: the one heard longest ago
  const line = fresh.length ? fresh[Math.floor(Math.random() * fresh.length)] : pool.slice().sort((a, b) => recent.indexOf(a) - recent.indexOf(b))[0];
  recent = [...recent.filter((t) => t !== line), line].slice(-WIJK_RECENT);
  try { localStorage.setItem(WIJK_RECENT_KEY, JSON.stringify(recent)); } catch (e) { /* ignore */ }
  return line;
}

function currentWijk(w) {
  const { x, y } = hoofdspeler(w);
  let best = null, bestD2 = Infinity;
  for (const p of w.map.meta.neighbourhoodPoints || []) {
    const d2 = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d2 < bestD2) { bestD2 = d2; best = p; }
  }
  return best;
}

// The wijk cards this save already showed (#726). The list travels in the savegame, so a new
// game no longer wipes it for the other saves on the device; a save from before the field
// (no `wijken`) falls back to the device list, which used to be the only place. markWijk keeps
// the list in memory only: saving the game writes it (savegame.js getWijkenSeen).
export function getWijkenSeen() {
  return wijkSeen ? [...wijkSeen] : [];
}

// Called by savegame.js when a save is loaded: an array (also an empty one) is this save's list,
// a missing field is a save from before #726 and takes the device list.
export function applyWijkenSeen(list) {
  wijkSeen = new Set();
  if (Array.isArray(list)) {
    for (const n of list) if (typeof n === 'string') wijkSeen.add(n);
    return;
  }
  try {
    const old = JSON.parse(localStorage.getItem(WIJK_KEY) || '[]');
    if (Array.isArray(old)) for (const n of old) if (typeof n === 'string') wijkSeen.add(n);
  } catch (e) { /* ignore */ }
}

function markWijk(p) {
  if (!wijkSeen) wijkSeen = new Set();
  wijkSeen.add(p.name);
}

function busyWithJob(w) {
  return playerBusy(w, ['missionPhase', 'sideJob', 'challenge', 'activeRace']).busy; // race: nooit een scène erdoorheen (#732)
}

function checkWijk(dt, w) {
  if (!wijkSeen || w.pigeonMode) return;
  wijkTimer -= dt;
  if (wijkTimer > 0) return;
  const step = 0.25 - wijkTimer;
  wijkTimer = 0.25;
  const p = currentWijk(w);
  if (!p || wijkSeen.has(p.name)) { wijkCand = null; return; }
  if (!wijkCand || wijkCand.name !== p.name) { wijkCand = p; wijkDwell = 0; return; }
  wijkDwell += step;
  if (wijkDwell < WIJK_DWELL || active || w.pendingRespawn || w.wanted > 0 || w.time < (w.quietUntil || 0)) return;
  // never during a mission, race or bijbaantje: the wijk stays unseen and
  // plays once the player is free again (and still in it)
  if (busyWithJob(w)) return;
  // over the attention budget: waits while the player is still in the wijk
  if (aloft(w) || !mayInterrupt('wijk', w)) return;
  noteMoment('wijk');
  // #734 (F6): pas als de kaart echt getoond kan worden de wijk als gezien
  // markeren; anders blijft de kaart/film voorgoed weg.
  wijkCand = null;
  if (showWijkCard(w, p)) markWijk(p);
}

// The card's own area (#725): the real boundary (grenzen.json) around the wijk point, so a
// landmark of a neighbouring wijk never ends up on this card. The buurt is the card's own
// scale; only when the boundaries are not loaded yet it stays null.
function wijkGrens(w, name) {
  const grenzen = links.getGrenzen ? links.getGrenzen() : null;
  const p = (w.map.meta.neighbourhoodPoints || []).find((q) => q.name === name);
  if (!grenzen || !p) return null;
  return gebiedIn(grenzen.buurten || [], p.x, p.y) || gebiedIn(grenzen.wijken || [], p.x, p.y);
}

// The landmarks that belong to a wijk: inside its own boundary, the closest first; the card
// lists a few of them. Without the boundaries (old world data) the nearest wijk point decides,
// as it did before #725.
export function wijkHighlights(w, name, max = 3) {
  const pts = w.map.meta.neighbourhoodPoints || [];
  const here = pts.find((q) => q.name === name) || null;
  const grens = wijkGrens(w, name);
  const out = [];
  for (const l of w.map.meta.landmarks || []) {
    if (grens) {
      if (puntInGebied(grens, l.x, l.y)) out.push({ name: l.name, d2: here ? (here.x - l.x) ** 2 + (here.y - l.y) ** 2 : 0 });
      continue;
    }
    let best = null, bestD2 = Infinity;
    for (const q of pts) {
      const q2 = (q.x - l.x) ** 2 + (q.y - l.y) ** 2;
      if (q2 < bestD2) { bestD2 = q2; best = q; }
    }
    if (best && best.name === name && bestD2 < 700 * 700) out.push({ name: l.name, d2: bestD2 });
  }
  return out.sort((a, b) => a.d2 - b.d2).map((o) => o.name).filter((n, i, a) => a.indexOf(n) === i).slice(0, max);
}

// The default for a new wijk: a short name card with Rikus's line spoken and
// the wijk's highlights listed; the flyover is the optional film (Instellingen).
let wijkCardEl = null;
let wijkCardT = 0;
function showWijkCard(w, wijk, left = 30) {
  if (typeof document === 'undefined') return false;
  // #734 (F19): de kaart mag niet alsnog voor een oude wijk verschijnen als de
  // speler intussen ergens anders staat (bijvoorbeeld na het sluiten van een
  // resultaatkaart of keuzepaneel).
  const hier = currentWijk(w);
  if (!hier || hier.name !== wijk.name) return false;
  if (!wijkCardEl) {
    const st = document.createElement('style');
    st.textContent = `
#wijk-card { position: fixed; left: max(6vw, calc((46px + 250px + 190px) * var(--ui, 1))); bottom: calc(11vh + 12vh); z-index: 17; pointer-events: none; color: #f0ede4; max-width: 44ch;
  opacity: 0; transform: translateX(-28px); transition: opacity .35s, transform .6s cubic-bezier(.2,.7,.2,1); text-shadow: 0 2px 12px rgba(0,0,0,.85); }
#wijk-card.on { opacity: 1; transform: none; }
#wijk-card .wc-kick { font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; font-size: 18px; letter-spacing: .2em; color: #3fc97a; }
#wijk-card .wc-name { font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; font-size: clamp(44px, 6vw, 84px); line-height: .9; letter-spacing: 1px; text-transform: uppercase; }
#wijk-card .wc-name::after { content: ''; display: block; width: 120px; height: 4px; margin-top: 8px; background: linear-gradient(90deg, #1e9e56, #3fc97a); }
#wijk-card .wc-line { font-family: 'Arial Narrow', Arial, sans-serif; font-size: clamp(16px, 1.6vw, 22px); margin-top: 8px; }
#wijk-card .wc-hi { font-family: 'Arial Narrow', Arial, sans-serif; font-size: clamp(14px, 1.3vw, 18px); margin-top: 8px; color: rgba(240,237,228,.75); }
#wijk-card .wc-hi:empty { display: none; }
`;
    document.head.appendChild(st);
    wijkCardEl = document.createElement('div');
    wijkCardEl.id = 'wijk-card';
    wijkCardEl.setAttribute('aria-live', 'polite');
    wijkCardEl.innerHTML = '<div class="wc-kick">Nieuwe buurt</div><div class="wc-name"></div><div class="wc-line"></div><div class="wc-hi"></div>';
    document.body.appendChild(wijkCardEl);
  }
  // onder de resultaatkaart of een keuzepaneel wacht de wijkkaart (#292), hooguit 12 s
  if (left > 0 && isOverlayHeld('wijkkaart')) { clearTimeout(wijkCardT); wijkCardT = setTimeout(() => showWijkCard(w, wijk, left - 1), 400); return true; }
  const text = wijkLine(wijk.name);
  const hi = wijkHighlights(w, wijk.name);
  wijkCardEl.querySelector('.wc-name').textContent = wijk.name;
  wijkCardEl.querySelector('.wc-line').textContent = text;
  wijkCardEl.querySelector('.wc-hi').textContent = hi.length ? 'Te zien: ' + hi.join(' · ') : '';
  wijkCardEl.classList.remove('on');
  void wijkCardEl.offsetWidth;
  wijkCardEl.classList.add('on');
  const v = lineVoiceFor('', text);
  if (v) playStoryVoice(v.src, {});
  clearTimeout(wijkCardT);
  wijkCardT = setTimeout(() => wijkCardEl.classList.remove('on'), Math.max(5, (v ? v.dur : 0) + 1.5) * 1000);
  return true;
}

export { pathShot, roofAt, clearKeys, showWijkCard };

function keyHits(w, keys) {
  let hits = 0;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (roofAt(w.map, k.pos.x, k.pos.y) > k.pos.z) hits++;
    const n = keys[i + 1];
    if (!n) continue;
    // #734 (F11): keur meer punten langs het segment, niet alleen het midden
    for (let s = 1; s < 4; s++) {
      const u = s / 4;
      const x = k.pos.x + (n.pos.x - k.pos.x) * u, y = k.pos.y + (n.pos.y - k.pos.y) * u;
      if (roofAt(w.map, x, y) > k.pos.z + (n.pos.z - k.pos.z) * u) hits++;
    }
  }
  return hits;
}

// lines: [{ speaker, text, at?, dur?, voice? }]; duration defaults to 4.8 s.
export function playMissionIntro(w, { title, kicker, lines, objective, duration = 4.8 }) {
  const p = hoofdspeler(w);
  // (#730) de camera staat boven de grond onder de speler, niet op absolute z=0: op een
  // dijk, viaduct of wierde zakte de scène anders onder het maaiveld.
  const gz = groundLift(w.map, p.x, p.y, p.gz || 0);
  let a = objective ? Math.atan2(objective.y - p.y, objective.x - p.x) : heading(w);
  if (!Number.isFinite(a)) a = heading(w);
  const dx = Math.cos(a), dy = Math.sin(a);
  const build = (side) => {
    const nx = -dy * side, ny = dx * side;
    return [
      { pos: W(p.x + dx * 4.5 + nx * 1.5, gz + 1.7, p.y + dy * 4.5 + ny * 1.5), look: W(p.x, gz + 1.35, p.y), fov: 50 },
      { pos: W(p.x + nx * 5, gz + 2.3, p.y + ny * 5), look: W(p.x, gz + 1.3, p.y), fov: 55 },
      { pos: W(p.x - dx * 5 + nx * 2, gz + 3.2, p.y - dy * 5 + ny * 2), look: W(p.x + dx * 6, gz + 1.5, p.y + dy * 6), fov: 60 },
      { pos: W(p.x - dx * 8, gz + 5.5, p.y - dy * 8), look: W(p.x + dx * 40, groundLift(w.map, p.x + dx * 40, p.y + dy * 40, gz) + 2, p.y + dy * 40), fov: 62 },
    ];
  };
  const left = build(1), right = build(-1);
  const keys = keyHits(w, right) < keyHits(w, left) ? right : left;
  return playCinematic({ id: 'mission-intro', priority: 3, duration, pause: true, kicker, title, lines, shot: cameraFit(w, pathShot(clearKeys(w, keys))) });
}

function orbitShot(w, { radius = 8, height = 3, sweep = 1, start = null, lookY = 1.3, fixed = null, fov = null }) {
  const a0 = start ?? heading(w) + Math.PI * 0.75;
  const p0 = fixed ? null : hoofdspeler(w);
  const c0 = fixed || { x: p0.x, y: p0.y };
  // (#730) de baan hangt boven de grond op die plek (dijk, viaduct, wierde), niet op z=0
  const gz = groundLift(w.map, c0.x, c0.y, p0 ? p0.gz || 0 : 0);
  let best = null;
  for (const [rk, dir] of [[1, 1], [1, -1], [0.65, 1], [0.65, -1], [0.45, 1]]) {
    const r = radius * rk;
    let hits = 0, roof = 0;
    for (let i = 0; i <= 6; i++) {
      const a = a0 + (i / 6) * sweep * dir;
      const top = roofAt(w.map, c0.x + Math.cos(a) * r, c0.y + Math.sin(a) * r);
      if (top > height) { hits++; roof = Math.max(roof, top); }
    }
    if (!best || hits < best.hits) best = { r, dir, hits, roof };
    if (!hits) break;
  }
  const r = best.r, dir = best.dir, h = best.hits ? Math.max(height, best.roof + 2) : height;
  return (u) => {
    const c = fixed || hoofdspeler(w);
    const a = a0 + easeInOut(reducedMotion() ? 0 : u) * sweep * dir;
    return { position: W(c.x + Math.cos(a) * r, gz + h, c.y + Math.sin(a) * r), lookAt: W(c.x, gz + lookY, c.y), ...(fov != null ? { fov } : {}) };
  };
}

export // #734 (F11): de handgemaakte camera's (missie-intro, fail, death, crash,
// wanted5) gebruiken geen cutscript-env; deze wrapper haalt een kader dat in
// een gevel staat naar voren/omhoog, met dezelfde fitCamera-regel als de
// gescripte scènes.
function cameraFit(w, shot) {
  const env = { solid: (x, y, z) => roofAt(w.map, x, y) > z - 0.2 };
  return (u, t) => {
    const pose = shot(u, t);
    if (!pose) return pose;
    const position = fitCamera(pose.position, pose.lookAt, env);
    return { ...pose, position };
  };
}

export function playMissionFailed(w, info, withShot = true) {
  // sikkom: Gronings for "almost, but not quite" (the dialect word, not the news site)
  showBanner({ kind: 'fail', title: 'Sikkom.', ...info });
  if (!withShot) return false;
  const p = hoofdspeler(w), a = heading(w);
  const px = p.x, py = p.y;
  const gz = groundLift(w.map, px, py, p.gz || 0); // (#730) boven de grond, niet op z=0
  const keys = [
    { pos: W(px - Math.cos(a) * 6, gz + 3, py - Math.sin(a) * 6), look: W(px, gz + 1.2, py) },
    { pos: W(px - Math.cos(a) * 9, gz + 9, py - Math.sin(a) * 9), look: W(px, gz + 0.8, py) },
  ];
  return playCinematic({ id: 'mission-fail', priority: 2, duration: 2.4, letterbox: false, timeScale: 0.5, shot: cameraFit(w, pathShot(clearKeys(w, keys), easeOut)) });
}

function playDeath(w, pending) {
  const opts = { busted: !!pending.busted, moneyPenalty: pending.moneyPenalty || 0, announced: !!pending.announced };
  const p = hoofdspeler(w), a = heading(w);
  const px = p.x, py = p.y;
  const gz = groundLift(w.map, px, py, p.gz || 0); // (#730) op een dijk of viaduct niet onder het maaiveld
  const bx = -Math.cos(a + 0.5), by = -Math.sin(a + 0.5);
  // Genre-style: slow motion, the colour drains, a slow rise over the spot,
  // the title on a band, then a dip to black into the trip (respawn.js)
  const keys = [
    { pos: W(px + bx * 4, gz + 2.2, py + by * 4), look: W(px, gz + 0.7, py), fov: 52 },
    { pos: W(px + bx * 6, gz + 5, py + by * 6), look: W(px, gz + 0.5, py), fov: 50 },
    { pos: W(px + bx * 8, gz + 10, py + by * 8), look: W(px, gz + 0.3, py), fov: 48 },
  ];
  const DUR = 3.2;
  const shot = pathShot(clearKeys(w, keys), easeOut);
  playCinematic({
    id: 'death', priority: 5, duration: DUR, letterbox: true, timeScale: 0.25, skippable: true,
    tint: opts.busted ? 'bust' : 'death', big: opts.busted ? 'OPGEPAKT' : 'DOOD',
    shot: cameraFit(w, (u, t) => {
      if (t > DUR - 0.45) links.respawnFade(Math.min(1, (t - (DUR - 0.45)) / 0.4));
      return shot(u);
    }),
    onEnd: () => {
      if (w.pendingRespawn !== pending) { links.respawnFade(0, 300); return; }
      // the trip to the hospital / police station; it respawns the player itself
      if (links.startRespawnScene(w, pending, opts)) return;
      links.respawnFade(0, 400);
      w.pendingRespawn = null;
      respawnFromScene(w, opts);
    },
  });
}

export function respawnFromScene(w, opts) {
  respawnFromCine = true;
  try { respawnPlayer(w, opts); } finally { respawnFromCine = false; }
}

// The orbit runs outside the building it films (a wide one like the Forum has a reach of 47 m from its point, the orbit used
// to be 28 m) and its title card names the place on screen, as the first version did (#329).
export function playLandmark(w, lm) {
  const fp = buildingReach(w.map, lm.x, lm.y);
  const h = Math.max(LANDMARK_HEIGHT[lm.name] || 16, Math.min(120, fp.top));
  const p = hoofdspeler(w);
  const start = Math.atan2(p.y - lm.y, p.x - lm.x);
  const radius = Math.min(Math.max(Math.min(80, Math.max(34, h * 0.9)), fp.reach + 18), 95);
  // #734 (F14): frame ook de spits. De camera kijkt naar het midden-bovenstuk
  // en staat hoog genoeg; de fov dekt de top van hoge gebouwen (Martinitoren,
  // Forum) zodat de titelklap niet boven het beeld valt.
  const lookY = h * 0.52;
  const height = h * 0.62 + 5;
  const fov = Math.max(45, Math.min(66, 2 * Math.atan((h * 0.55) / Math.max(20, radius)) * 180 / Math.PI + 8));
  playCinematic({
    id: 'landmark', priority: 1, duration: 3.8, pause: true,
    kicker: 'Ontdekt', title: lm.name,
    // (#712) ook een filmpje zonder script heeft een regel: de gast leest waar het over gaat
    lines: [{ speaker: '', text: 'Weer een stukje Grunn dat je nu kent.' }],
    mumble: true,
    shot: orbitShot(w, { fixed: lm, radius, height, lookY, sweep: 1.3, start, fov }),
  });
}

function tryCrashReplay(w, x, y) {
  const now = performance.now();
  if (!momentsOn() || active || now - lastCrashAt < CRASH_COOLDOWN_MS || w.pendingRespawn || w.mission || w.race) return;
  if (aloft(w) || !mayInterrupt('crash', w)) return;
  noteMoment('crash');
  lastCrashAt = now;
  const a = heading(w);
  const fx = Math.cos(a), fy = Math.sin(a), nx = -fy, ny = fx;
  let side = Math.random() < 0.5 ? 1 : -1;
  if (roofAt(w.map, x + nx * 6 * side, y + ny * 6 * side)) side = -side;
  const cx = x + nx * 6 * side, cy = y + ny * 6 * side;
  const dak = roofAt(w.map, cx, cy); // gebouw bovenop de grond (0 op open grond)
  const gz = groundLift(w.map, cx, cy, 0); // (#730) grond onder de camera, geen absolute z=0
  const gzl = groundLift(w.map, x, y, 0);
  playCinematic({
    id: 'crash', priority: 1, duration: 1.2, timeScale: 0.22, letterbox: true, hideHud: true,
    // (#712) één regel, zodat een gast niet alleen twee balken ziet
    lines: [{ speaker: '', text: 'Krak. Iemand lette even niet op.' }],
    mumble: true,
    shot: cameraFit(w, (u) => ({
      position: W(cx - fx * (2 - u * 2.5), gz + dak + 0.7 + u * 0.4, cy - fy * (2 - u * 2.5)),
      lookAt: W(x, gzl + 0.9, y),
      fov: 48,
      cut: true,
    })),
  });
}

function playWantedFive(w) {
  const p = hoofdspeler(w);
  let target = null;
  if (w.policeHeli) target = { x: w.policeHeli.x, y: w.policeHeli.y, h: w.policeHeli.z || 30 };
  else {
    let best = Infinity;
    for (const v of w.vehicles) {
      if (!v.isPolice || v.wrecked) continue;
      const d = Math.hypot(v.x - p.x, v.y - p.y);
      if (d < best) { best = d; target = { x: v.x, y: v.y, h: groundLift(w.map, v.x, v.y, v.z || 0) + 1 }; }
    }
  }
  let shot;
  if (target) {
    const dx = p.x - target.x, dy = p.y - target.y, d = Math.hypot(dx, dy) || 1;
    const ux = dx / d, uy = dy / d;
    const gz = groundLift(w.map, p.x, p.y, p.gz || 0); // (#730) geen absolute z=0
    const gzt = groundLift(w.map, target.x, target.y, 0);
    const cam = target.h > 5
      ? W(p.x + ux * 5, gz + 1.6, p.y + uy * 5)
      : W(target.x - uy * 5 + ux * 2, gzt + 1.1, target.y + ux * 5 + uy * 2);
    shot = (u) => ({ position: V(cam.x, cam.y, cam.z + u * 0.6), lookAt: W(target.x, target.h, target.y), fov: 45 - u * 6, cut: true });
  } else {
    shot = orbitShot(w, { radius: 6, height: 1.6, sweep: 0.4, lookY: 2 });
  }
  playCinematic({
    id: 'wanted5', priority: 2, duration: 1.6, timeScale: 0.4, letterbox: true,
    kicker: '★★★★★', title: 'Heel Grunn zit achter je aan', accent: 'wanted', shot: cameraFit(w, shot),
    // (#712) één regel voor de gast (de gastheer ziet de sterren en de titel)
    lines: [{ speaker: '', text: 'Vijf sterren. Nu even rustig aan doen.' }],
    mumble: true,
  });
}

// --- player-controlled chase cams (V) --------------------------------------

function setCamMode(m) {
  camMode = m;
  camHeading = null; // start each camera straight behind/ahead of the car
  els.chip.textContent = m ? `Filmcamera: ${CAM_MODES[m]}` : 'Filmcamera uit';
  els.chip.classList.add('visible');
  chipTimer = 1.6;
}

function cycleCinemaCam(w) {
  if (!hoofdspeler(w).inVehicle) {
    w.addMessage('Filmcamera werkt alleen in een voertuig', 2);
    return;
  }
  setCamMode((camMode + 1) % CAM_MODES.length);
}

// The car cameras used to lock rigidly onto v.angle, so every drift, bump
// and collision spin swung the view instantly - disorienting, above all in
// the bumper view. The camera stays on the car but its heading eases after
// it (partly towards the direction of travel) with a capped turn rate.
let camHeading = null;
let camHeadingT = 0;
const CAM_HEADING_TAU = 0.25; // s
const CAM_MAX_TURN = 2.2; // rad/s
function smoothCamHeading(v, a) {
  const now = performance.now() / 1000;
  const dt = camHeading === null ? 0 : Math.min(0.1, Math.max(0, now - camHeadingT));
  camHeadingT = now;
  // blend in the direction of travel when drifting, so the view looks where you go
  const vx = Math.cos(a) * (v.speed || 0) + (v.driftX || 0), vy = Math.sin(a) * (v.speed || 0) + (v.driftY || 0);
  const moving = Math.hypot(vx, vy) > 3 && (v.speed || 0) > 0;
  const travel = moving ? Math.atan2(vy, vx) : a;
  const target = a + normAngle(travel - a) * 0.5;
  if (camHeading === null) { camHeading = target; return camHeading; }
  let d = normAngle(target - camHeading) * Math.min(1, dt / CAM_HEADING_TAU);
  const cap = CAM_MAX_TURN * dt;
  if (d > cap) d = cap; else if (d < -cap) d = -cap;
  camHeading = normAngle(camHeading + d);
  return camHeading;
}
function normAngle(x) {
  x = (x + Math.PI) % (Math.PI * 2);
  if (x < 0) x += Math.PI * 2;
  return x - Math.PI;
}

function cinemaCamPose(w) {
  const eigen = hoofdspeler(w);
  const v = eigen.inVehicle;
  const a = smoothCamHeading(v, v.angle != null ? v.angle : eigen.angle);
  const fx = Math.cos(a), fy = Math.sin(a), nx = -fy, ny = fx;
  const x = v.x, y = v.y;
  switch (camMode) {
    case 1: return { position: W(x + fx * 2.8, 0.85, y + fy * 2.8), lookAt: W(x + fx * 30, 1, y + fy * 30), fov: 68, cut: true };
    case 2: return { position: W(x + nx * 6.5 - fx * 1.2, 1.3, y + ny * 6.5 - fy * 1.2), lookAt: W(x + fx * 1.5, 0.9, y + fy * 1.5), fov: 55, cut: true };
    case 3: return { position: W(x - fx * 16 + nx * 6, 24, y - fy * 16 + ny * 6), lookAt: W(x + fx * 8, 0, y + fy * 8), fov: 50, cut: true };
    case 4: return { position: W(x - fx * 22 + nx * 5, 4, y - fy * 22 + ny * 5), lookAt: W(x + fx * 5, 1, y + fy * 5), fov: 34, cut: true };
    case 5: {
      // driver's eyes inside the cabin; the car's raw heading, so wheel and dash stay put
      const e = interiorEyePose(v);
      if (!e) return { position: W(x + fx * 2.8, 0.85, y + fy * 2.8), lookAt: W(x + fx * 30, 1, y + fy * 30), fov: 68, cut: true };
      const ca = v.angle != null ? v.angle : eigen.angle, cx = Math.cos(ca), cy = Math.sin(ca);
      return { position: W(e.x, e.z, e.y), lookAt: W(e.x + cx * 30, e.z - 0.4, e.y + cy * 30), fov: 74, cut: true, interior: true };
    }
    default: return null;
  }
}

// --- mission banner -----------------------------------------------------------

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export function showBanner({ kind = 'pass', title, reason = '', reward = 0, stats = [] }) {
  if (!els) return;
  const b = els.banner;
  // the same result already up (scene start, then a fallback): once is enough
  if (banner && !b.hidden && b.dataset.kind === kind && els.bTitle.textContent === title) return;
  b.dataset.kind = kind;
  els.bTitle.textContent = title;
  els.bReason.textContent = reason;
  const rewardDoel = Math.max(0, Math.round(Number(reward) || 0));
  // #514: de beloning telt op in plaats van in één keer te verschijnen; de
  // waarde staat meteen op nul en updateBanner loopt hem in 0,7 s op.
  els.bReward.textContent = rewardDoel ? '+ €0' : '';
  els.bStats.innerHTML = stats.map(([k, v], i) => `<div style="--i:${i}"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
  b.hidden = false;
  b.classList.remove('in', 'out');
  void b.offsetWidth;
  b.classList.add('in');
  // one banner at a time: a new one replaces whatever was up
  banner = { t: 0, time: kind === 'fail' ? FAIL_BANNER_TIME : BANNER_TIME, out: -1, rewardDoel, rewardGetoond: 0 };
}

const MOVE_KEYS = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
const ACT_KEYS = ['e', 'f', ' ', 'm', 't', 'shift'];
function playingOn() {
  const inp = world && world.input;
  if (!inp) return false;
  return MOVE_KEYS.some((k) => inp.isDown(k)) || ACT_KEYS.some((k) => inp.wasPressed(k)) || !!(inp.mouse && inp.mouse.down);
}

function updateBanner(dt) {
  if (!banner) return;
  banner.t += dt;
  // #514: de beloning telt in 0,7 s op (ease-out), zodat het resultaat even
  // iets te kijken geeft in plaats van meteen als eindbedrag te staan.
  if (banner.rewardDoel) {
    const p = Math.min(1, banner.t / 0.7);
    const waarde = Math.round(banner.rewardDoel * (1 - Math.pow(1 - p, 3)));
    if (waarde !== banner.rewardGetoond) {
      banner.rewardGetoond = waarde;
      els.bReward.textContent = `+ €${waarde.toLocaleString('nl-NL')}`;
    }
  }
  if (banner.out < 0 && (banner.t > banner.time || (banner.t > BANNER_GRACE && !active && playingOn()))) {
    banner.out = banner.t;
    els.banner.classList.add('out');
  }
  if (banner.out >= 0 && banner.t > banner.out + 0.55) {
    els.banner.hidden = true;
    els.banner.classList.remove('in', 'out');
    banner = null;
  }
}

// a mission result banner is on screen (story.js waits with a handover)
export function isBannerUp() {
  return !!banner;
}

// read-only view of the running cutscene for the soft-lock watchdog (safety.js)
export function cinematicState() {
  return active;
}

// Ends the running cutscene and drops the queued ones (loading a save, "Zet me vrij").
export function skipAllCinematics() {
  queue.length = 0;
  for (let i = 0; i < 8 && active; i++) finish(true);
  swallowSpace = false;
  resetSkip();
  if (voicePaused) { resumeStoryVoice(); voicePaused = false; }
  clearCinematicUi();
}





