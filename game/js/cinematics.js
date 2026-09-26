import { getSettings } from './settings.js';
import { isPauseMenuOpen } from './pausemenu.js';
import { isMapOpen } from './mapview.js';
import { respawnPlayer } from './world.js';
import { pointInPolygon } from './util.js';
import { startRespawnScene } from './respawn.js';

// world.cameraOverride poses use map coordinates: x/y on the map, z = height in metres.
// world.timeScale (0..1) slows gameplay; main.js multiplies the gameplay dt by it.

const SKIP_KEYS = new Set([' ', 'enter', 'e']);
const LANDMARK_RADIUS = 55;
const CRASH_COOLDOWN_MS = 20000;
const BANNER_TIME = 3.8;
const CAM_MODES = ['', 'BUMPER', 'ZIJKANT', 'HELIKOPTER', 'TELELENS'];
const WIJK_KEY = 'gte-wijken-seen';
const WIJK_DWELL = 1.5;

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

const V = (x, y, z) => ({ x, y, z });
const W = (wx, h, wy) => ({ x: wx, y: wy, z: h });
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOut = (t) => 1 - (1 - t) ** 3;

function cr(a, b, c, d, t) {
  const t2 = t * t, t3 = t2 * t;
  const f = (p0, p1, p2, p3) => 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  return V(f(a.x, b.x, c.x, d.x), f(a.y, b.y, c.y, d.y), f(a.z, b.z, c.z, d.z));
}

// Smooth Catmull-Rom camera move through evenly timed keyframes {pos, look, fov?}.
export function pathShot(keys, ease = easeInOut) {
  return (u) => {
    const s = ease(clamp01(u)) * (keys.length - 1);
    const i = Math.min(keys.length - 2, Math.floor(s));
    const t = s - i;
    const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
    const pose = { position: cr(k0.pos, k1.pos, k2.pos, k3.pos, t), lookAt: cr(k0.look, k1.look, k2.look, k3.look, t) };
    if (k1.fov != null && k2.fov != null) pose.fov = k1.fov + (k2.fov - k1.fov) * t;
    return pose;
  };
}

const LEVEL_H = 3.1;

export function roofAt(map, x, y) {
  let top = 0;
  for (const b of map.buildingsNear(x, y, 1)) {
    const [x0, y0, x1, y1] = b.bounds;
    if (x < x0 || x > x1 || y < y0 || y > y1 || !pointInPolygon(x, y, b.pts)) continue;
    top = Math.max(top, (b.h || 3) * LEVEL_H + 3.5);
  }
  return top;
}

// Lifts any keyframe that would sit inside a building up over its roof.
export function clearKeys(w, keys) {
  const lift = keys.map((k) => roofAt(w.map, k.pos.x, k.pos.y));
  for (let i = 0; i + 1 < keys.length; i++) {
    const m = roofAt(w.map, (keys[i].pos.x + keys[i + 1].pos.x) / 2, (keys[i].pos.y + keys[i + 1].pos.y) / 2);
    lift[i] = Math.max(lift[i], m);
    lift[i + 1] = Math.max(lift[i + 1], m);
  }
  keys.forEach((k, i) => { if (lift[i] && k.pos.z < lift[i] + 1.5) k.pos.z = lift[i] + 1.5; });
  return keys;
}

function heading(w) {
  const p = w.player;
  return p.inVehicle && p.inVehicle.angle != null ? p.inVehicle.angle : p.angle;
}

function momentsOn() {
  return getSettings().cinematicMoments !== false;
}

function gameStarted() {
  return document.body.classList.contains('game-started');
}

export function initCinematics(w) {
  world = w;
  if (els) return;
  const root = document.createElement('div');
  root.id = 'cine';
  root.setAttribute('aria-live', 'polite');
  root.innerHTML =
    '<div class="cine-tint"></div>' +
    '<div class="cine-bar top"></div><div class="cine-bar bottom"></div>' +
    '<div class="cine-card"><div class="cine-kicker"></div><div class="cine-title"></div></div>' +
    '<div class="cine-big"></div>' +
    '<div class="cine-sub"><span class="cine-speaker"></span><span class="cine-line"></span></div>' +
    '<div class="cine-skip"><span class="hud-key">SPATIE</span>overslaan</div>' +
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
    lineIndex: -1,
  };

  window.addEventListener('keydown', (e) => {
    if (!active || !active.skippable || e.repeat || !gameStarted()) return;
    if (!SKIP_KEYS.has(e.key.toLowerCase())) return;
    if (isPauseMenuOpen() || isMapOpen()) return;
    e.preventDefault();
    e.stopPropagation();
    if (active.t > 0.25) finish(true);
  }, true);

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

function begin(spec) {
  active = {
    priority: 1, duration: 3, letterbox: true, skippable: true, hideHud: true, pause: false, timeScale: 1,
    ...spec, t: 0,
  };
  const r = els.root;
  r.classList.toggle('letterbox', !!active.letterbox);
  r.classList.toggle('show-skip', !!active.skippable && active.duration > 1.6);
  r.dataset.tint = active.tint || '';
  r.dataset.accent = active.accent || '';
  els.kicker.textContent = active.kicker || '';
  els.title.textContent = active.title || '';
  r.classList.toggle('has-card', !!(active.title || active.kicker));
  els.big.textContent = active.big || '';
  r.classList.toggle('has-big', !!active.big);
  els.lineIndex = -1;
  els.speaker.textContent = '';
  els.line.textContent = '';
  r.classList.remove('has-sub');
  document.body.classList.toggle('cine-hide-hud', !!active.hideHud);
  r.classList.add('active');
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
  r.classList.remove('active', 'letterbox', 'has-card', 'has-big', 'has-sub', 'show-skip');
  r.dataset.tint = '';
  document.body.classList.remove('cine-hide-hud');
  if (world) world.cameraOverride = null;
  if (a && a.onEnd) a.onEnd(skipped, replaced);
  if (!active && queue.length) begin(queue.shift());
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
  els.speaker.textContent = l && l.speaker ? l.speaker + ':' : '';
  els.line.textContent = l ? l.text : '';
}

export function updateCinematics(dt, w) {
  world = w;
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
      active.t += dt;
      updateSubtitles();
      if (active.t >= active.duration) finish(false);
    }
    if (started) checkTriggers(dt, w);
    updateBanner(dt);
    if (chipTimer > 0 && (chipTimer -= dt) <= 0) els.chip.classList.remove('visible');
  }

  if (started && w.input.wasPressed('v') && !active) cycleCinemaCam(w);
  if (camMode && !w.player.inVehicle) setCamMode(0);

  let pose = null;
  if (active && active.shot) pose = active.shot(clamp01(active.t / active.duration), active.t, w);
  else if (!active && camMode && w.player.inVehicle) pose = cinemaCamPose(w);
  w.cameraOverride = pose;

  const target = active ? active.timeScale : 1;
  scale += (target - scale) * Math.min(1, dt * 7);
  if (Math.abs(scale - target) < 0.01) scale = target;
  w.timeScale = scale;
  document.body.classList.toggle('cine-slowmo', scale < 0.85);
}

// --- triggers ---------------------------------------------------------------

function checkTriggers(dt, w) {
  if (w.pendingRespawn && !w.pendingRespawn.scene && !isCinematicActive('death')) playDeath(w, w.pendingRespawn);

  const wantedUp = w.wanted >= 5 && prevWanted < 5;
  prevWanted = w.wanted;
  if (wantedUp && momentsOn() && !active) playWantedFive(w);

  const imp = w.lastImpact;
  if (imp && imp !== lastImpactSeen) {
    lastImpactSeen = imp;
    if (imp.strength > 0.8) tryCrashReplay(w, imp.x, imp.y);
  }

  checkWijk(dt, w);
  scanTimer -= dt;
  if (scanTimer > 0) return;
  scanTimer = 0.25;
  const p = w.player;
  for (const v of w.vehicles) {
    if (!v.wrecked || seenWrecks.has(v)) continue;
    seenWrecks.add(v);
    if (Math.hypot(v.x - p.x, v.y - p.y) < 20) tryCrashReplay(w, v.x, v.y);
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
  const keys = [
    first || { pos: W(p.x - fx * 20 + fy * 45, 55, p.y - fy * 20 - fx * 45), look: W(p.x, 4, p.y) },
    { pos: W(p.x - fx * 26 + fy * 14, 30, p.y - fy * 26 - fx * 14), look: W(p.x, 2, p.y) },
    { pos: W(p.x - fx * 13, 9, p.y - fy * 13), look: W(p.x, 1.2, p.y) },
    behindPose(w),
  ];
  return pathShot(clearKeys(w, keys));
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
    kicker: 'Grand Theft Eierbal', title: 'GTE VI',
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
  return !!((w.mission && w.mission.phase === 'active') || (w.sideJob && w.sideJob.active));
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
  markWijk(p);
  wijkCand = null;
  playWijk(w, p);
}

// A calm, low flyover through one characteristic street of the new wijk:
// a named residential street near the player (long, straight-ish, close to
// the wijk), glided along a little above the rooftops looking down the
// street, then a gentle rise and glide back to behind the player.
const WIJK_STREET_CATS = new Set(['minor', 'normal', 'major']);
const WIJK_MAX_SPEED = 12; // m/s: faster than this the flyover waits
const WIJK_RUN = 110; // metres of street the camera travels

function roadStraightRun(road) {
  const p = road.pts;
  let best = null, start = 0, len = 0, prevA = null;
  const close = (i) => { if (!best || len > best.len) best = { a: p[start], b: p[i], len }; };
  for (let i = 0; i < p.length - 1; i++) {
    const a = Math.atan2(p[i + 1][1] - p[i][1], p[i + 1][0] - p[i][0]);
    let turn = prevA == null ? 0 : Math.abs(a - prevA);
    if (turn > Math.PI) turn = Math.PI * 2 - turn;
    if (turn > 0.3) { close(i); start = i; len = 0; }
    len += Math.hypot(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]);
    prevA = a;
  }
  close(p.length - 1);
  return best;
}

function pickWijkStreet(w, wijk, R) {
  const p = w.player;
  const cx = (wijk.x + p.x) / 2, cy = (wijk.y + p.y) / 2;
  const reach = Math.max(120, Math.min(R, Math.hypot(wijk.x - p.x, wijk.y - p.y) / 2 + 90));
  let best = null;
  for (const r of w.map.roadsNear(cx, cy, reach)) {
    if (!r.name || !WIJK_STREET_CATS.has(r.cat) || r.bridge || r.z || r.pts.length < 2) continue;
    const run = roadStraightRun(r);
    if (!run || run.len < 45) continue;
    const mx = (run.a[0] + run.b[0]) / 2, my = (run.a[1] + run.b[1]) / 2;
    const dPlayer = Math.hypot(mx - p.x, my - p.y), dWijk = Math.hypot(mx - wijk.x, my - wijk.y);
    if (dPlayer > 260) continue;
    // long residential streets close to the player and inside the wijk win
    const catK = r.cat === 'major' ? 0.6 : r.cat === 'normal' ? 1.1 : 1;
    const score = Math.min(run.len, 220) * catK / (1 + dPlayer / 90) / (1 + dWijk / (R * 1.5));
    if (!best || score > best.score) best = { r, run, score };
  }
  return best;
}

// Highest roof within `side` metres of the line a-b (sampled).
function roofline(w, ax, ay, bx, by, side) {
  const len = Math.hypot(bx - ax, by - ay) || 1;
  const nx = -(by - ay) / len, ny = (bx - ax) / len;
  let top = 0;
  const n = Math.max(2, Math.ceil(len / 12));
  for (let i = 0; i <= n; i++) {
    const x = ax + (bx - ax) * (i / n), y = ay + (by - ay) * (i / n);
    for (const o of [-side, -side / 2, 0, side / 2, side]) top = Math.max(top, roofAt(w.map, x + nx * o, y + ny * o));
  }
  return top;
}

function wijkRadius(w, wijk) {
  const d = (w.map.meta.neighbourhoodPoints || [])
    .filter((q) => q !== wijk && q.name !== wijk.name)
    .map((q) => Math.hypot(q.x - wijk.x, q.y - wijk.y))
    .sort((a, b) => a - b);
  const near = d.length >= 3 ? (d[0] + d[1] + d[2]) / 3 : d[0] || 300;
  return Math.min(420, Math.max(130, near * 0.55));
}

function wijkStreetShot(w, wijk) {
  const p = w.player, a = heading(w);
  const pick = pickWijkStreet(w, wijk, wijkRadius(w, wijk));
  if (!pick) return null;
  let [ax, ay] = pick.run.a, [bx, by] = pick.run.b;
  // travel towards the player's end of the street, so the glide home is short
  if (Math.hypot(ax - p.x, ay - p.y) < Math.hypot(bx - p.x, by - p.y)) [ax, ay, bx, by] = [bx, by, ax, ay];
  let len = Math.hypot(bx - ax, by - ay);
  const ux = (bx - ax) / len, uy = (by - ay) / len;
  if (len > WIJK_RUN) { ax = bx - ux * WIJK_RUN; ay = by - uy * WIJK_RUN; len = WIJK_RUN; }
  const nx = -uy, ny = ux;
  const roofs = roofline(w, ax, ay, bx, by, 14);
  const h = Math.min(30, Math.max(12, roofs + 3));
  const side = 2.5;
  const at = (d, off, hh) => W(ax + ux * d + nx * off, hh, ay + uy * d + ny * off);
  const ahead = (d) => W(ax + ux * (d + 34), 1.5, ay + uy * (d + 34));
  const street = [
    { pos: at(-12, side, h + 6), look: ahead(-4), fov: 56 },
    { pos: at(len * 0.35, side * 0.6, h + 2), look: ahead(len * 0.35), fov: 56 },
    { pos: at(len * 0.72, 0, h), look: ahead(len * 0.72), fov: 56 },
    { pos: at(len, -side * 0.5, h), look: ahead(len), fov: 56 },
  ];
  // the rise over the rooftops and down behind the player
  const bxP = p.x - Math.cos(a) * 16, byP = p.y - Math.sin(a) * 16;
  const over = Math.max(h + 4, roofline(w, bx, by, bxP, byP, 6) + 6);
  const b = behindPose(w, 8, 3.8);
  const home = [
    { pos: { ...street[3].pos }, look: { ...street[3].look }, fov: 56 },
    { pos: W((bx + bxP) / 2, over, (by + byP) / 2), look: W(p.x, 2, p.y), fov: 56 },
    { pos: W(bxP, Math.max(9, roofline(w, bxP, byP, p.x, p.y, 4) + 3), byP), look: W(p.x, 1.4, p.y), fov: 58 },
    { pos: b.pos, look: b.look, fov: 60 },
  ];
  const streetShot = pathShot(clearKeys(w, street), (t) => t);
  const homeShot = pathShot(clearKeys(w, home), (t) => 1 - (1 - t) ** 2);
  const SPLIT = 0.66;
  // ease into the street glide, keep a steady drift, blend into the rise
  const ease = (t) => (t < 0.2 ? (t * t) / 0.4 : 0.1 + (t - 0.2) * 1.125);
  return (u) => (u < SPLIT ? streetShot(ease(u / SPLIT)) : homeShot((u - SPLIT) / (1 - SPLIT)));
}

function playWijk(w, wijk) {
  const shot = wijkStreetShot(w, wijk);
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

export function playMissionIntro(w, { title, kicker, lines, objective }) {
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
  return playCinematic({ id: 'mission-intro', priority: 3, duration: 4.8, pause: true, kicker, title, lines, shot: pathShot(clearKeys(w, keys)) });
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
  showBanner({ kind: 'fail', title: 'MISSIE MISLUKT', ...info });
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
  const keys = [
    { pos: W(px + bx * 4, 2.2, py + by * 4), look: W(px, 0.6, py), fov: 55 },
    { pos: W(px + bx * 7, 7, py + by * 7), look: W(px, 0.4, py), fov: 55 },
    { pos: W(px + bx * 10, 15, py + by * 10), look: W(px, 0.3, py), fov: 52 },
  ];
  playCinematic({
    id: 'death', priority: 5, duration: 2.6, letterbox: true, timeScale: 0.3, skippable: true,
    tint: opts.busted ? 'bust' : 'death', big: opts.busted ? 'OPGEPAKT' : 'DOOD',
    shot: pathShot(clearKeys(w, keys), easeOut),
    onEnd: () => {
      if (w.pendingRespawn !== pending) return;
      // the trip to the hospital / police station; it respawns the player itself
      if (startRespawnScene(w, pending, opts)) return;
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
  if (!momentsOn() || active || now - lastCrashAt < CRASH_COOLDOWN_MS || w.pendingRespawn) return;
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
  banner = { t: 0 };
}

function updateBanner(dt) {
  if (!banner) return;
  banner.t += dt;
  if (banner.t > BANNER_TIME && !els.banner.classList.contains('out')) els.banner.classList.add('out');
  if (banner.t > BANNER_TIME + 0.6) {
    els.banner.hidden = true;
    els.banner.classList.remove('in', 'out');
    banner = null;
  }
}
