// Soft-lock safety nets: "Vastgelopen? Zet me vrij" (pause menu), "Missie
// afbreken", and watchdogs that clear overlays, flags and positions that
// would otherwise leave the player stuck until a reload.
import { isInWater } from './util.js';
import { cinematicState, skipCinematic, skipAllCinematics, isCinematicActive } from './cinematics.js';
import { isPhoneOpen } from './phone.js';
import { isShopOpen, closeShopMenu } from './shopui.js';
import { isPauseMenuOpen } from './pausestate.js';
import { isMapOpen } from './mapview.js';
import { isMissionActive, failActiveMission } from './missions.js';
import { respawnPlayer } from './world.js';
import { respawnFade } from './respawn.js';
import { playerBusy } from './busy.js';

const CINE_MAX_EXTRA_S = 20;
const CINE_MAX_S = 150;
const RESPAWN_MAX_S = 25;
const FALL_LIMIT = -16; // the deepest road (the aqueduct) is at -11 m

let world = null;
let cineSeen = null;
let cineT = 0;
let respawnSeen = null;
let respawnT = 0;
let deadT = 0;
let lastSafe = null;
let safeScanT = 0;

export function initSafety(w) {
  world = w;
  w.safetyActions = { unstuck: () => unstuck(w), abortMission: () => abortMission(w), missionActive: () => isMissionActive() };
}

export function abortMission(w = world) {
  if (!isMissionActive()) return false;
  return failActiveMission(w, 'Missie afgebroken', 'Afgebroken');
}

const finite = (...v) => v.every((n) => Number.isFinite(n));

// Nearest spot on an ordinary street (not a path, viaduct or bridge) you can
// walk away from; falls back to any open spot, then a landmark.
function safeSpot(map, x, y) {
  const inMap = finite(x, y);
  const road = inMap ? map.nearestRoadPoint(x, y, 600, true, true) : null;
  let spot = road && !road.road.bridge ? map.findOpenSpawn(road.x, road.y, 60) : null;
  if (!spot && inMap) spot = map.findOpenSpawn(x, y, 800);
  if (!spot && lastSafe) spot = { ...lastSafe };
  if (!spot) {
    const lm = (map.meta.landmarks || [])[0] || world.spawnPoint;
    spot = map.findOpenSpawn(lm.x, lm.y, 400) || { x: lm.x, y: lm.y };
  }
  if (spot.road && spot.road.pts && spot.road.pts.length > 1) {
    let best = Infinity, ang = 0;
    const pts = spot.road.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      const d = (mx - spot.x) ** 2 + (my - spot.y) ** 2;
      if (d < best) { best = d; ang = Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]); }
    }
    spot.angle = ang;
  }
  return spot;
}

export function resetWalker(a, x, y, gz) {
  a.x = x; a.y = y;
  a.vx = 0; a.vy = 0;
  a.z = 0; a.vz = 0;
  if ('gz' in a) a.gz = gz;
  a.water = null; a.swimming = false; a.swimTilt = 0;
  a.climb = null; a.climbSpot = null; a.canClimbOut = false; a.waterTime = 0;
  a.vault = null;
  if ('shoveX' in a) { a.shoveX = 0; a.shoveY = 0; }
}

export function placeCompanion(w, x, y, angle) {
  const c = w.companion;
  if (!c) return;
  if (c.inVehicle && c.inVehicle !== w.player.inVehicle) { c.inVehicle.passenger = null; c.inVehicle = null; }
  if (c.state === 'dead') { c.state = 'alive'; c.health = 100; }
  if (c.inVehicle) return;
  let at = null;
  for (const r of [1, 2, 3.5]) {
    for (const side of [1, -1, 2, 0]) {
      const a = angle + side * Math.PI / 2;
      const [cx, cy] = w.map.escapeBuilding(x + Math.cos(a) * r, y + Math.sin(a) * r);
      if (!isInWater(w.map, cx, cy)) { at = [cx, cy]; break; }
    }
    if (at) break;
  }
  if (!at) at = [x, y];
  resetWalker(c, at[0], at[1], 0);
  c.angle = angle;
}

export function resetVehicle(v, x, y, angle, gz) {
  v.x = x; v.y = y; v.angle = angle;
  v.speed = 0; v.driftX = 0; v.driftY = 0; v.yawVel = 0; v.steer = 0;
  v.z = gz; v.vz = 0; v.pitch = 0; v.roll = 0; v.airborne = false;
  v.susPitch = 0; v.susRoll = 0; v.susHeave = 0;
  v.rollingFree = false; v.throttle = 0; v.handbrake = false;
}

// Closes whatever overlay could hold input and resets camera, time scale and
// the transient states a stuck scene can leave behind.
function clearTransient(w) {
  skipAllCinematics();
  if (isShopOpen()) closeShopMenu();
  clearSceneLeftovers(w);
  if (!w.pendingRespawn) respawnFade(0);
  w.timeScale = 1;
  if (!isPhoneOpen()) w.uiPaused = false;
  w.input.reset();
}

// Flags and classes a cutscene sets and its end clears; only called with no scene running.
function clearSceneLeftovers(w) {
  w.cameraOverride = null;
  w.cinematicHidePlayers = false;
  w.cinematicHideNav = false;
  document.body.classList.remove('cine-hide-hud', 'intro-montage');
}

export function unstuck(w = world) {
  if (!w || w.pendingRespawn) return false;
  if (w.pigeonMode && w.pigeonActions) w.pigeonActions.stop();
  clearTransient(w);
  const p = w.player;
  const map = w.map;
  const v = p.inVehicle;
  const spot = safeSpot(map, p.x, p.y);
  const angle = Number.isFinite(spot.angle) ? spot.angle : p.angle;
  const gz = map.groundHeightAt ? map.groundHeightAt(spot.x, spot.y, 0) || 0 : 0;
  if (v && !v.isBoat && !v.wrecked && !v.sinking && !v.disabled && w.vehicles.includes(v)) {
    const [vx, vy] = map.escapeBuilding(spot.x, spot.y, (v.halfWid || 1) + 0.4);
    resetVehicle(v, vx, vy, angle, gz);
    p.x = v.x; p.y = v.y; p.angle = angle; p.gz = gz; p.z = 0; p.vz = 0;
  } else {
    if (v) {
      v.driver = null; v.speed = 0; v.throttle = 0;
      if (w.companion && w.companion.inVehicle === v) { v.passenger = null; w.companion.inVehicle = null; }
      p.inVehicle = null;
    }
    resetWalker(p, spot.x, spot.y, gz);
    p.angle = angle;
  }
  w.camYaw = p.angle;
  placeCompanion(w, p.x, p.y, p.angle);
  w.addMessage('Vrijgezet: je staat weer op straat', 3);
  lastSafe = { x: spot.x, y: spot.y };
  return true;
}

// --- watchdogs ----------------------------------------------------------------------

function watchCinematic(dt, w) {
  const c = cinematicState();
  if (!c) {
    cineSeen = null;
    // a scene that ended with an error can leave the players hidden
    // (a padel match, the bumper cars, a heli run or a post-game challenge hide them on purpose and draw their own)
    const owned = playerBusy(w, ['padel', 'activityGame', 'heliRun', 'challenge']).busy;
    cineT = !owned && (w.cinematicHidePlayers || w.cinematicHideNav || document.body.classList.contains('cine-hide-hud')) ? cineT + dt : 0;
    if (cineT > 3) { console.warn('[safety] scene leftovers cleared'); clearSceneLeftovers(w); cineT = 0; }
    return;
  }
  if (c !== cineSeen) { cineSeen = c; cineT = 0; }
  if (isPauseMenuOpen() || isMapOpen()) return;
  cineT += dt;
  const limit = Math.min(CINE_MAX_S, (Number.isFinite(c.duration) ? c.duration : 10) + CINE_MAX_EXTRA_S);
  if (cineT > limit) {
    console.warn('[safety] cinematic ran too long, skipping', c.id);
    skipCinematic();
    cineSeen = null; cineT = 0;
  }
}

function watchRespawn(dt, w) {
  const pr = w.pendingRespawn;
  if (!pr) {
    respawnSeen = null; respawnT = 0;
    deadT = w.health <= 0 ? deadT + dt : 0;
    if (deadT > 8 && !w.pigeonMode) { deadT = 0; console.warn('[safety] dead without respawn'); w.health = 1; respawnPlayer(w, {}); }
    return;
  }
  deadT = 0;
  if (pr !== respawnSeen) { respawnSeen = pr; respawnT = 0; }
  if (isPauseMenuOpen() || isMapOpen()) return;
  respawnT += dt;
  if (respawnT > RESPAWN_MAX_S) {
    console.warn('[safety] respawn scene ran too long, forcing respawn');
    respawnSeen = null; respawnT = 0;
    if (isCinematicActive()) skipCinematic();
    const opts = { ...pr, announced: true };
    w.pendingRespawn = null;
    respawnPlayer(w, opts);
    respawnFade(0);
    w.cameraOverride = null; w.timeScale = 1;
  }
}

function watchPlayer(dt, w) {
  const p = w.player;
  const v = p.inVehicle;
  if (w.pigeonMode || w.pendingRespawn) return;
  const bad = !finite(p.x, p.y) || (v && !finite(v.x, v.y)) || (p.gz ?? 0) + (p.z ?? 0) < FALL_LIMIT || (v && (v.z ?? 0) < FALL_LIMIT && !v.sinking);
  if (bad) { console.warn('[safety] player out of the world, unstuck'); unstuck(w); return; }
  if (v && !w.vehicles.includes(v) && !v.sinking) {
    // the car you sat in was removed from the world under you
    p.inVehicle = null;
    resetWalker(p, p.x, p.y, p.gz || 0);
  }
  safeScanT -= dt;
  if (safeScanT <= 0) {
    safeScanT = 2;
    const street = !(w.map.offStreetLevel && w.map.offStreetLevel(p.x, p.y));
    if (!v && !p.water && Math.abs(p.gz || 0) < 0.3 && street && !isInWater(w.map, p.x, p.y)) lastSafe = { x: p.x, y: p.y };
  }
}

export function updateSafety(dt, w) {
  world = w;
  if (!document.body.classList.contains('game-started')) return;
  // frame time (clamped): on a slow machine the limits stretch with the scenes
  try {
    watchCinematic(dt, w);
    watchRespawn(dt, w);
    if (!w.paused) watchPlayer(dt, w);
  } catch (e) {
    console.error('[safety]', e);
  }
}
