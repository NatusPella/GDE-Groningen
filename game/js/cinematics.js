import { screenFx } from './postfx3d.js';
import { setDualText } from './subtitles.js';
import { paintSpeaker } from './speakers.js';
import { noteSpoken } from './characters.js';
import { getSettings } from './settings.js';
import { isPauseMenuOpen } from './pausemenu.js';
import { isMapOpen } from './mapview.js';
import { respawnPlayer } from './world.js';
import { V, W, clamp01, easeInOut, easeOut, pathShot, roofAt, clearKeys, wijkStreetShot } from './camerapath.js';
import { startRespawnScene, respawnFade } from './respawn.js';
import { playStoryVoice, setStoryScene, setStoryProbe } from './audio.js';
import { isIntroPlaying } from './intromontage.js';
import { logoHtml, GAME_NAME, SUBTITLE } from './logo.js';
import { mayInterrupt, noteMoment } from './attention.js';
import { lineVoiceFor } from './linevoice.js';
import { getFollowPose } from './scene3d.js';

// world.cameraOverride poses use map coordinates: x/y on the map, z = height in metres.
// world.timeScale (0..1) slows gameplay; main.js multiplies the gameplay dt by it.

const SKIP_HOLD_S = 0.9; // hold Space this long to skip a cutscene
const LANDMARK_RADIUS = 55;
const CRASH_COOLDOWN_MS = 20000;
const BANNER_TIME = 3.8;
const FAIL_BANNER_TIME = 2.8;
// after this long, playing on (moving, a click, a key) takes the banner away
const BANNER_GRACE = 0.9;
const CAM_MODES = ['', 'BUMPER', 'ZIJKANT', 'HELIKOPTER', 'TELELENS'];
const WIJK_KEY = 'gte-wijken-seen';
// cinematics that book their own attention.js moment
const OWN_MOMENTS = new Set(['wijk', 'landmark', 'crash', 'wanted5']);
let endedAt = -Infinity;
// Real seconds since the last cinematic ended (the HUD needs a beat before the next text).
export const sinceCinematic = () => (performance.now() - endedAt) / 1000;
const WIJK_DWELL = 1.5;
const WIJK_MAX_SPEED = 12; // m/s: faster than this the flyover waits

const LANDMARK_HEIGHT = {
  Martinitoren: 97, Martinikerk: 32, 'Der Aa-kerk': 45, Academiegebouw: 30, 'Groninger Museum': 28,
  'Hoofdstation Groningen': 24, Euroborg: 30, 'Forum Groningen': 45, Goudkantoor: 14,
};

let world = null;
let els = null;
let active = null;
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

function heading(w) {
  const p = w.player;
  return p.inVehicle && p.inVehicle.angle != null ? p.inVehicle.angle : p.angle;
}

function momentsOn() {
  return getSettings().cinematicMoments !== false;
}

// up in the own helicopter (heliflight.js): no pausing street-level scenes mid-air
function aloft(w) {
  const v = w.player && w.player.inVehicle;
  return !!(v && v.isHeli && !v.onGround);
}

function gameStarted() {
  return document.body.classList.contains('game-started');
}

export function initCinematics(w) {
  world = w;
  if (els) return;
  setStoryProbe(() => !!active || isIntroPlaying());
  const root = document.createElement('div');
  root.id = 'cine';
  root.setAttribute('aria-live', 'polite');
  root.innerHTML =
    '<div class="cine-tint"></div>' +
    '<div class="cine-bar top"></div><div class="cine-bar bottom"></div>' +
    '<div class="cine-card"><div class="cine-kicker"></div><div class="cine-title"></div></div>' +
    '<div class="cine-big"></div>' +
    '<div class="cine-sub"><span class="cine-speaker"></span><span class="cine-line"></span></div>' +
    '<div class="cine-skip"><svg class="cine-skip-ring" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle class="fill" cx="12" cy="12" r="10"/></svg>' +
    '<span>Houd</span><span class="hud-key">SPATIE</span><span>ingedrukt om over te slaan</span></div>' +
    '<div class="cine-banner" hidden><div class="cb-band"><div class="cb-title"></div></div>' +
    '<div class="cb-reason"></div><div class="cb-reward"></div><div class="cb-stats"></div></div>' +
    '<div class="cine-chip"></div>';
  document.body.appendChild(root);
  els = {
    root,
    kicker: root.querySelector('.cine-kicker'),
    title: root.querySelector('.cine-title'),
    big: root.querySelector('.cine-big'),
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
    if (e.repeat || !active || !gameStarted() || isPauseMenuOpen() || isMapOpen()) return;
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

// The red damage vignette stays off during cutscenes unless the scene asks
// for it (spec.blood) or it is the death scene itself.
export function cinematicAllowsDamageFx() {
  return !active || active.id === 'death' || !!active.blood;
}

export function cinematicPausesGameplay() {
  return !!(active && active.pause);
}

export function getCinemaCamMode() {
  return camMode;
}

export function playCinematic(spec) {
  if (!els) return false;
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

export function skipCinematic() {
  if (active) finish(true);
}

// Subtitles without their own recording get one from the lines manifest
// (narration without a speaker is Rikus, the narrator). Voiced lines then stay up
// until their recording has finished, pushing the rest (and the scene) later.
function attachVoices(a) {
  if (!a.lines || !a.lines.length) return;
  let found = false;
  const lines = a.lines.map((l) => {
    const v = !l.voice && lineVoiceFor(l.speaker, l.text);
    if (!v) return l;
    found = true;
    return { ...l, voice: v.src, vdur: v.dur };
  });
  if (!found) return;
  const start = 0.5, even = Math.max(0.5, a.duration - start - 0.2) / lines.length;
  let shift = 0;
  a.lines = lines.map((l, i) => {
    const dur0 = l.dur ?? even;
    const out = { ...l, at: (l.at ?? start + i * even) + shift, dur: l.vdur ? Math.max(dur0, l.vdur + 0.25) : dur0 };
    shift += out.dur - dur0;
    return out;
  });
  const end = a.lines[a.lines.length - 1];
  a.duration = Math.max(a.duration + shift, end.at + end.dur + 0.2);
}

function begin(spec) {
  active = {
    priority: 1, duration: 3, letterbox: true, skippable: true, hideHud: true, pause: false, timeScale: 1,
    ...spec, t: 0,
  };
  attachVoices(active);
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
  active.voiced = !!(active.lines && active.lines.some((l) => l.voice));
  if (active.voiced) setStoryScene(true, 'cine');
  // a pausing cutscene brings the player's vehicle to a stop, so resuming
  // doesn't launch you onward at full speed - except the ones that ask to
  // keep the motion (the wijk flyover only plays at low speed anyway)
  if (active.pause && !active.keepMotion && world && world.player && world.player.inVehicle) {
    const v = world.player.inVehicle;
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
  const frozen = isPauseMenuOpen() || isMapOpen();
  if (!frozen) {
    if (active) {
      active.t += active.realtime ? Math.max(dt, wallDt) : dt;
      updateSubtitles();
      if (active.t >= active.duration) finish(false);
    }
    updateSkipHold();
    if (started) checkTriggers(dt, w);
    updateBanner(dt);
    if (chipTimer > 0 && (chipTimer -= dt) <= 0) els.chip.classList.remove('visible');
  } else skipHoldSince = null;

  if (started && w.input.wasPressed('v') && !active) cycleCinemaCam(w);
  if (camMode && !w.player.inVehicle) setCamMode(0);

  let pose = null;
  if (active && active.shot) {
    try {
      pose = active.shot(clamp01(active.t / active.duration), active.t, w);
    } catch (err) {
      console.error('cinematic shot', active.id, err);
      finish(true);
    }
  }
  else if (!active && camMode && w.player.inVehicle) pose = cinemaCamPose(w);
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
  const p = w.player;
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
  for (const r of map.roads) {
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
  const seen = visited(w);
  if (seen.has(OMMELANDEN)) return;
  const [x0, y0, x1, y1] = realMapBox(w.map);
  const p = w.player, m = OMMELANDEN_MARGIN;
  if (p.x > x0 - m && p.x < x1 + m && p.y > y0 - m && p.y < y1 + m) return;
  if (aloft(w) || !mayInterrupt('ommelanden', w)) return;
  noteMoment('ommelanden');
  seen.add(OMMELANDEN);
  playOmmelanden(w);
}

function playOmmelanden(w) {
  const p = w.player;
  const [x0, y0, x1, y1] = realMapBox(w.map);
  // look away from the city: out over the open land
  let ox = p.x - (x0 + x1) / 2, oy = p.y - (y0 + y1) / 2;
  const ol = Math.hypot(ox, oy) || 1;
  ox /= ol; oy /= ol;
  const nx = -oy, ny = ox;
  const b = behindPose(w);
  const keys = [
    { pos: W(p.x - ox * 10 + nx * 4, 6, p.y - oy * 10 + ny * 4), look: W(p.x + ox * 30, 2, p.y + oy * 30) },
    { pos: W(p.x - ox * 6 + nx * 18, 38, p.y - oy * 6 + ny * 18), look: W(p.x + ox * 220, 0, p.y + oy * 220) },
    { pos: W(p.x + ox * 40 - nx * 26, 52, p.y + oy * 40 - ny * 26), look: W(p.x + ox * 320 + nx * 120, 0, p.y + oy * 320 + ny * 120) },
    { pos: W(p.x - ox * 14, 12, p.y - oy * 14), look: W(p.x + ox * 20, 1.5, p.y + oy * 20) },
    b,
  ];
  playCinematic({
    id: 'landmark', priority: 1, duration: 8, pause: true,
    kicker: 'Bezienswaardigheid', title: OMMELANDEN,
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
  const seen = visited(w);
  const p = w.player;
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
  for (const lm of w.map.meta.landmarks || []) {
    if (lm.name && Math.hypot(lm.x - w.player.x, lm.y - w.player.y) < radius) seen.add(lm.name);
  }
}

// --- moments ----------------------------------------------------------------

function behindPose(w, back = 7, up = 3.4) {
  const p = w.player, a = heading(w);
  return { pos: W(p.x - Math.cos(a) * back, up, p.y - Math.sin(a) * back), look: W(p.x, 1.3, p.y) };
}

function flyInShot(w, first) {
  const p = w.player, a = heading(w);
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
    const f = getFollowPose();
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
  const p = w.player, a = heading(w);
  const fx = Math.cos(a), fy = Math.sin(a);
  return flyInShot(w, { pos: W(p.x - fx * 60 + fy * 70, 130, p.y - fy * 60 - fx * 70), look: W(p.x, 0, p.y) });
}

function playIntro(w) {
  if (!introMod) return false;
  return introMod.playIntroMontage(w, {
    flyShot: () => skyFlyInShot(w),
    onDone: (skipped) => {
      if (!skipped || active) return;
      const b = behindPose(w);
      playCinematic({
        id: 'intro-out', priority: 3, duration: 0.6, pause: true, letterbox: false, skippable: false,
        shot: () => ({ position: b.pos, lookAt: b.look, cut: true }),
      });
    },
  });
}

// Pause menu: replays the opening montage from wherever the player is now.
export function replayIntro(w = world) {
  if (!w || !gameStarted() || w.pendingRespawn) return false;
  if (active) finish(true);
  return playIntro(w);
}

function playGameStart(w) {
  markNearbyLandmarksVisited(w, 70);
  loadWijken(!w.loadedFromSave);
  const here = currentWijk(w);
  if (here) markWijk(here);
  w.messages = w.messages.filter((m) => !m.text.startsWith('Je begint bij'));
  // every new game opens with the montage (continuing a save doesn't)
  if (!w.loadedFromSave && !w.pigeonMode && introMod && playIntro(w)) return;
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

const WIJK_LINES = {
  Binnenstad: 'Het hart van Grunn. Klopt het hardst na middernacht.',
  Stationsgebied: 'Iedereen komt hier aan. Niet iedereen gaat weer weg.',
  Ebbingekwartier: 'Hip, nieuw en duur. Hou je portemonnee vast.',
  Oosterpoort: 'Muziek, kroegen en altijd wel ergens herrie.',
  Paddepoel: 'Winkelen, wonen en de ringweg om de hoek.',
  Europapark: 'Voetbal, kantoren en een hoop glas.',
  'A-kwartier': 'Smalle straatjes, oude grachten, niks zien en niks zeggen.',
  Schildersbuurt: 'Elke straat een schilder. Elke buur een mening.',
  Zeeheldenbuurt: 'Genoemd naar helden. De bewoners doen hun best.',
  Korrewegwijk: 'Stoer, eerlijk en met de fiets tot aan de voordeur.',
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

function wijkLine(name) {
  if (WIJK_LINES[name]) return WIJK_LINES[name];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return WIJK_GENERIC[h % WIJK_GENERIC.length];
}

function currentWijk(w) {
  const { x, y } = w.player;
  let best = null, bestD2 = Infinity;
  for (const p of w.map.meta.neighbourhoodPoints || []) {
    const d2 = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d2 < bestD2) { bestD2 = d2; best = p; }
  }
  return best;
}

function loadWijken(fresh) {
  wijkSeen = new Set();
  if (fresh) {
    try { localStorage.removeItem(WIJK_KEY); } catch (e) { /* ignore */ }
    return;
  }
  try {
    const list = JSON.parse(localStorage.getItem(WIJK_KEY) || '[]');
    if (Array.isArray(list)) for (const n of list) if (typeof n === 'string') wijkSeen.add(n);
  } catch (e) { /* ignore */ }
}

function markWijk(p) {
  if (!wijkSeen) wijkSeen = new Set();
  wijkSeen.add(p.name);
  try { localStorage.setItem(WIJK_KEY, JSON.stringify([...wijkSeen])); } catch (e) { /* ignore */ }
}

function busyWithJob(w) {
  return !!((w.mission && w.mission.phase === 'active') || (w.sideJob && w.sideJob.active) || w.challenge);
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
  if (wijkDwell < WIJK_DWELL || active || !momentsOn() || w.pendingRespawn || w.wanted > 0 || w.time < (w.quietUntil || 0)) return;
  // never during a mission, race or bijbaantje: the wijk stays unseen and
  // plays once the player is free again (and still in it)
  if (busyWithJob(w)) return;
  // at speed a paused flyover is jarring: wait until the player slows down
  const v = w.player.inVehicle;
  if (v && Math.abs(v.speed || 0) > WIJK_MAX_SPEED) return;
  // over the attention budget: waits while the player is still in the wijk
  if (aloft(w) || !mayInterrupt('wijk', w)) return;
  noteMoment('wijk');
  markWijk(p);
  wijkCand = null;
  playWijk(w, p);
}

export { pathShot, roofAt, clearKeys };

function playWijk(w, wijk) {
  const shot = wijkStreetShot(w, wijk, heading(w), behindPose(w, 8, 3.8));
  if (!shot) return false;
  return playCinematic({
    id: 'wijk', priority: 1, duration: 11, pause: true, keepMotion: true,
    kicker: 'Nieuwe wijk', title: wijk.name, lines: [{ speaker: '', text: wijkLine(wijk.name) }],
    shot,
  });
}

function keyHits(w, keys) {
  let hits = 0;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (roofAt(w.map, k.pos.x, k.pos.y) > k.pos.z) hits++;
    const n = keys[i + 1];
    if (n && roofAt(w.map, (k.pos.x + n.pos.x) / 2, (k.pos.y + n.pos.y) / 2) > (k.pos.z + n.pos.z) / 2) hits++;
  }
  return hits;
}

// lines: [{ speaker, text, at?, dur?, voice? }]; duration defaults to 4.8 s.
export function playMissionIntro(w, { title, kicker, lines, objective, duration = 4.8 }) {
  const p = w.player;
  let a = objective ? Math.atan2(objective.y - p.y, objective.x - p.x) : heading(w);
  if (!Number.isFinite(a)) a = heading(w);
  const dx = Math.cos(a), dy = Math.sin(a);
  const build = (side) => {
    const nx = -dy * side, ny = dx * side;
    return [
      { pos: W(p.x + dx * 4.5 + nx * 1.5, 1.7, p.y + dy * 4.5 + ny * 1.5), look: W(p.x, 1.35, p.y), fov: 50 },
      { pos: W(p.x + nx * 5, 2.3, p.y + ny * 5), look: W(p.x, 1.3, p.y), fov: 55 },
      { pos: W(p.x - dx * 5 + nx * 2, 3.2, p.y - dy * 5 + ny * 2), look: W(p.x + dx * 6, 1.5, p.y + dy * 6), fov: 60 },
      { pos: W(p.x - dx * 8, 5.5, p.y - dy * 8), look: W(p.x + dx * 40, 2, p.y + dy * 40), fov: 62 },
    ];
  };
  const left = build(1), right = build(-1);
  const keys = keyHits(w, right) < keyHits(w, left) ? right : left;
  return playCinematic({ id: 'mission-intro', priority: 3, duration, pause: true, kicker, title, lines, shot: pathShot(clearKeys(w, keys)) });
}

function orbitShot(w, { radius = 8, height = 3, sweep = 1, start = null, lookY = 1.3, fixed = null }) {
  const a0 = start ?? heading(w) + Math.PI * 0.75;
  const c0 = fixed || { x: w.player.x, y: w.player.y };
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
    const c = fixed || w.player;
    const a = a0 + easeInOut(u) * sweep * dir;
    return { position: W(c.x + Math.cos(a) * r, h, c.y + Math.sin(a) * r), lookAt: W(c.x, lookY, c.y) };
  };
}

export function playMissionOutro(w, info) {
  showBanner({ kind: 'pass', title: 'MISSIE GESLAAGD', ...info });
  return playCinematic({
    id: 'mission-outro', priority: 3, duration: 3.4, letterbox: false, timeScale: 0.35,
    shot: orbitShot(w, { radius: 7.5, height: 3.2, sweep: 0.9 }),
  });
}

export function playMissionFailed(w, info, withShot = true) {
  // sikkom: Gronings for "almost, but not quite" (the dialect word, not the news site)
  showBanner({ kind: 'fail', title: 'Sikkom.', ...info });
  if (!withShot) return false;
  const p = w.player, a = heading(w);
  const px = p.x, py = p.y;
  const keys = [
    { pos: W(px - Math.cos(a) * 6, 3, py - Math.sin(a) * 6), look: W(px, 1.2, py) },
    { pos: W(px - Math.cos(a) * 9, 9, py - Math.sin(a) * 9), look: W(px, 0.8, py) },
  ];
  return playCinematic({ id: 'mission-fail', priority: 2, duration: 2.4, letterbox: false, timeScale: 0.5, shot: pathShot(clearKeys(w, keys), easeOut) });
}

function playDeath(w, pending) {
  const opts = { busted: !!pending.busted, moneyPenalty: pending.moneyPenalty || 0, announced: !!pending.announced };
  const p = w.player, a = heading(w);
  const px = p.x, py = p.y;
  const bx = -Math.cos(a + 0.5), by = -Math.sin(a + 0.5);
  // GTA-style: slow motion, the colour drains, a slow rise over the spot,
  // the title on a band, then a dip to black into the trip (respawn.js)
  const keys = [
    { pos: W(px + bx * 4, 2.2, py + by * 4), look: W(px, 0.7, py), fov: 52 },
    { pos: W(px + bx * 6, 5, py + by * 6), look: W(px, 0.5, py), fov: 50 },
    { pos: W(px + bx * 8, 10, py + by * 8), look: W(px, 0.3, py), fov: 48 },
  ];
  const DUR = 3.2;
  const shot = pathShot(clearKeys(w, keys), easeOut);
  playCinematic({
    id: 'death', priority: 5, duration: DUR, letterbox: true, timeScale: 0.25, skippable: true,
    tint: opts.busted ? 'bust' : 'death', big: opts.busted ? 'OPGEPAKT' : 'DOOD',
    shot: (u, t) => {
      if (t > DUR - 0.45) respawnFade(Math.min(1, (t - (DUR - 0.45)) / 0.4));
      return shot(u);
    },
    onEnd: () => {
      if (w.pendingRespawn !== pending) { respawnFade(0, 300); return; }
      // the trip to the hospital / police station; it respawns the player itself
      if (startRespawnScene(w, pending, opts)) return;
      respawnFade(0, 400);
      w.pendingRespawn = null;
      respawnFromScene(w, opts);
    },
  });
}

export function respawnFromScene(w, opts) {
  respawnFromCine = true;
  try { respawnPlayer(w, opts); } finally { respawnFromCine = false; }
}

function playLandmark(w, lm) {
  const h = LANDMARK_HEIGHT[lm.name] || 16;
  const p = w.player;
  const start = Math.atan2(p.y - lm.y, p.x - lm.x);
  playCinematic({
    id: 'landmark', priority: 1, duration: 3.8, pause: true,
    kicker: 'Ontdekt', title: lm.name,
    shot: orbitShot(w, { fixed: lm, radius: Math.min(60, Math.max(28, h * 0.6)), height: h * 0.45 + 9, lookY: h * 0.42, sweep: 1.3, start }),
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
  const lift = roofAt(w.map, x + nx * 6 * side, y + ny * 6 * side);
  playCinematic({
    id: 'crash', priority: 1, duration: 1.2, timeScale: 0.22, letterbox: true, hideHud: true,
    shot: (u) => ({
      position: W(x + nx * 6 * side - fx * (2 - u * 2.5), 0.7 + lift + u * 0.4, y + ny * 6 * side - fy * (2 - u * 2.5)),
      lookAt: W(x, 0.9, y),
      fov: 48,
      cut: true,
    }),
  });
}

function playWantedFive(w) {
  const p = w.player;
  let target = null;
  if (w.policeHeli) target = { x: w.policeHeli.x, y: w.policeHeli.y, h: w.policeHeli.z || 30 };
  else {
    let best = Infinity;
    for (const v of w.vehicles) {
      if (!v.isPolice || v.wrecked) continue;
      const d = Math.hypot(v.x - p.x, v.y - p.y);
      if (d < best) { best = d; target = { x: v.x, y: v.y, h: 1 }; }
    }
  }
  let shot;
  if (target) {
    const dx = p.x - target.x, dy = p.y - target.y, d = Math.hypot(dx, dy) || 1;
    const ux = dx / d, uy = dy / d;
    const cam = target.h > 5
      ? W(p.x + ux * 5, 1.6, p.y + uy * 5)
      : W(target.x - uy * 5 + ux * 2, 1.1, target.y + ux * 5 + uy * 2);
    shot = (u) => ({ position: V(cam.x, cam.y, cam.z + u * 0.6), lookAt: W(target.x, target.h, target.y), fov: 45 - u * 6, cut: true });
  } else {
    shot = orbitShot(w, { radius: 6, height: 1.6, sweep: 0.4, lookY: 2 });
  }
  playCinematic({
    id: 'wanted5', priority: 2, duration: 1.6, timeScale: 0.4, letterbox: true,
    kicker: '★★★★★', title: 'Heel Grunn zit achter je aan', accent: 'wanted', shot,
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
  if (!w.player.inVehicle) {
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
  const v = w.player.inVehicle;
  const a = smoothCamHeading(v, v.angle != null ? v.angle : w.player.angle);
  const fx = Math.cos(a), fy = Math.sin(a), nx = -fy, ny = fx;
  const x = v.x, y = v.y;
  switch (camMode) {
    case 1: return { position: W(x + fx * 2.8, 0.85, y + fy * 2.8), lookAt: W(x + fx * 30, 1, y + fy * 30), fov: 68, cut: true };
    case 2: return { position: W(x + nx * 6.5 - fx * 1.2, 1.3, y + ny * 6.5 - fy * 1.2), lookAt: W(x + fx * 1.5, 0.9, y + fy * 1.5), fov: 55, cut: true };
    case 3: return { position: W(x - fx * 16 + nx * 6, 24, y - fy * 16 + ny * 6), lookAt: W(x + fx * 8, 0, y + fy * 8), fov: 50, cut: true };
    case 4: return { position: W(x - fx * 22 + nx * 5, 4, y - fy * 22 + ny * 5), lookAt: W(x + fx * 5, 1, y + fy * 5), fov: 34, cut: true };
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
  b.dataset.kind = kind;
  els.bTitle.textContent = title;
  els.bReason.textContent = reason;
  els.bReward.textContent = reward ? `+ €${reward.toLocaleString('nl-NL')}` : '';
  els.bStats.innerHTML = stats.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
  b.hidden = false;
  b.classList.remove('in', 'out');
  void b.offsetWidth;
  b.classList.add('in');
  // one banner at a time: a new one replaces whatever was up
  banner = { t: 0, time: kind === 'fail' ? FAIL_BANNER_TIME : BANNER_TIME, out: -1 };
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
  skipHoldSince = null;
}
