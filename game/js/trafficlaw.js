// Roads that are not for you (roadaccess.js): walking or cycling on the
// motorway and the ring, a car on a cycle path or a footway, a bike on a
// footway. Physically possible, but an offence: no warning card (removed, #125),
// but after a grace period on it the police take an interest (one star, once per
// stretch; never more than one from this alone). Missions, jobs and the
// emergency services are left alone. Pure logic apart from reading the world.
import { travelModeOf, offenceOf, marktFietsHint, MARKT } from './roadaccess.js';
import { weekdayOf } from './calendar.js';
import { playerBusy } from './busy.js';
import { noteMoney } from './finance.js';
import { noteWantedWhy } from './wantedwhy.js';

// Two money fines when an agent is watching: the phone in your hand while
// riding or driving, and cycling after dark without a light.
export const FINE_WATCH_M = 45;
export const FINE_PHONE = { fiets: 45, auto: 100 };
export const FINE_NO_LIGHT = 25;
const LIGHT_WATCHED_S = 3;
const LIGHT_COOLDOWN_S = 120;
const MOVING_MS = 2;

export const GRACE_S = 12;
const GAP_S = 3;
const REARM_S = 25;
const SCAN_EVERY = 0.25;
const LEVEL_SPLIT_M = 2.5;

let marktHinted = false;
const state = { kind: null, mode: null, on: 0, off: 0, warned: false, fined: false, rearm: 0, scanT: 0, road: null };

export function getLawState() {
  return { kind: state.kind, onS: state.on, warned: state.warned, fined: state.fined, grace: Math.max(0, GRACE_S - state.on) };
}
export function resetTrafficLaw() {
  marktHinted = false;
  Object.assign(state, { kind: null, mode: null, on: 0, off: 0, warned: false, fined: false, rearm: 0, scanT: 0, road: null });
}

// The road the player stands on: the nearest within its half width (and a
// little more), on the player's own level (a bridge, or the street under it).
export function roadUnder(map, x, y, z = 0) {
  let best = null, bd = Infinity;
  for (const road of map.roadsNear(x, y, 12)) {
    const half = Math.max(1.2, (road.width || 4) / 2) + 1.2;
    const p = road.pts;
    for (let i = 0; i < p.length - 1; i++) {
      const ax = p[i][0], ay = p[i][1], dx = p[i + 1][0] - ax, dy = p[i + 1][1] - ay, l2 = dx * dx + dy * dy;
      let t = l2 > 1e-9 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const d = Math.hypot(ax + dx * t - x, ay + dy * t - y);
      if (d > half) continue;
      const rz = road.z ? road.z[i] + (road.z[i + 1] - road.z[i]) * t : 0;
      if (Math.abs(rz - z) > LEVEL_SPLIT_M) continue;
      if (d < bd) { bd = d; best = road; }
    }
  }
  return best;
}

// the star of a road offence needs an agent that can see it (#391: it came after 12 s with nobody near, under a card that said an agent had seen you)
export const STAR_WATCH_M = 80;

export function exempt(world, v) {
  if (!world.player || world.health <= 0 || world.pendingRespawn || world.pigeonMode || world.heliRun || world.trainDriving || world.trainCam) return true;
  if (playerBusy(world, ['padel', 'activityGame', 'challenge', 'sideJob']).busy || world.cameraOverride) return true;
  if (world.mission && world.mission.phase === 'active') return true;
  if (v && (v.isPolice || v.isAmbulance || v.sirenOn || v.isBus)) return true;
  return false;
}

// call every frame; scans four times a second
export function updateTrafficLaw(dt, world) {
  if (!dt) return;
  updateBikeLight(dt, world);
  const p = world.player;
  const v = p && p.inVehicle;
  if (exempt(world, v)) { state.on = 0; state.kind = null; return; }
  state.scanT -= dt;
  if (state.rearm > 0) state.rearm -= dt;
  let kind = state.kind;
  if (state.scanT <= 0) {
    state.scanT = SCAN_EVERY;
    const mode = travelModeOf(world);
    state.mode = mode;
    let found = null;
    if (mode === 'lopen' || mode === 'fiets' || mode === 'auto') {
      const x = v ? v.x : p.x, y = v ? v.y : p.y;
      const z = (v ? v.z : p.gz) || 0;
      const road = roadUnder(world.map, x, y, z);
      found = road ? offenceOf(road, mode) : null;
      state.road = found ? road : null;
      if (!found && mode === 'fiets' && road && !marktHinted) {
        const hour = ((world.clock % 24) + 24) % 24;
        const weekday = world.calendar && Number.isFinite(world.calendar.day) ? weekdayOf(world.calendar.day) : -1;
        const text = marktFietsHint(mode, road, { weekday, hour });
        if (text) { marktHinted = true; world.addMessage(text, 6, { kind: 'tip', key: MARKT.hint }); }
      }
    }
    if (found) { state.off = 0; kind = found; } else { state.off += SCAN_EVERY; if (state.off > GAP_S) kind = null; }
    state.kind = kind;
  }
  if (!kind) {
    state.on = 0;
    state.warned = false;
    if (state.fined && state.off > REARM_S) state.fined = false;
    return;
  }
  state.on += dt;
  if (!state.fined && state.on >= GRACE_S && agentWatching(world, v ? v.x : p.x, v ? v.y : p.y, STAR_WATCH_M)) {
    state.fined = true;
    state.rearm = REARM_S;
    if ((world.wanted || 0) < 1) {
      world.wanted = 1;
      world.wantedDecayTimer = 0;
      noteWantedWhy(world, kind === 'voetpad' ? (state.mode === 'fiets' ? 'voetpadFiets' : 'voetpadAuto') : kind);
    }
  }
}

// Is an agent (on foot or in a police vehicle) close enough to see you?
export function agentWatching(world, x, y, range = FINE_WATCH_M) {
  const r2 = range * range;
  for (const p of world.pedestrians || []) if (p.isCop && p.state !== 'dead' && (p.x - x) ** 2 + (p.y - y) ** 2 < r2) return true;
  for (const v of world.vehicles || []) if (v.isPolice && !v.wrecked && v.driver !== 'player' && (v.x - x) ** 2 + (v.y - y) ** 2 < r2) return true;
  return false;
}

export function charge(world, amount, text) {
  const pay = Math.min(amount, Math.max(0, Math.floor(world.money || 0)));
  noteMoney('Boetes');
  world.money = (world.money || 0) - pay;
  world.addMessage(`${text}: boete €${pay}`, 5, { kind: 'politie', key: 'roadfine' });
  return pay;
}

// The phone (the pause menu on its Telefoon tab) opened while riding or
// driving at speed: a fine if an agent sees it. Returns the amount.
export function checkPhoneWhileMoving(world) {
  const p = world.player;
  const v = p && p.inVehicle;
  if (!v || exempt(world, v)) return 0;
  const mode = travelModeOf(world);
  const fine = FINE_PHONE[mode];
  if (!fine || Math.abs(v.speed || 0) < MOVING_MS) return 0;
  if (!agentWatching(world, v.x, v.y)) return 0;
  return charge(world, fine, mode === 'fiets' ? 'Mobiel in de hand op de fiets' : 'Mobiel in de hand achter het stuur');
}

const light = { watched: 0, cooldown: 0 };
export function resetLightFine() { light.watched = 0; light.cooldown = 0; }

// Cycling in the dark without a light (the bikes have none unless v.light is
// set): after a few seconds in an agent's sight, a fine, then a long pause.
export function updateBikeLight(dt, world) {
  if (!dt) return 0;
  if (light.cooldown > 0) light.cooldown -= dt;
  const p = world.player;
  const v = p && p.inVehicle;
  const night = world.dayNight && (world.dayNight.night ?? 0) > 0.5;
  if (!v || !night || light.cooldown > 0 || exempt(world, v) || travelModeOf(world) !== 'fiets' || v.light || Math.abs(v.speed || 0) < MOVING_MS) { light.watched = 0; return 0; }
  if (!agentWatching(world, v.x, v.y, FINE_WATCH_M * 0.7)) { light.watched = 0; return 0; }
  light.watched += dt;
  if (light.watched < LIGHT_WATCHED_S) return 0;
  light.watched = 0;
  light.cooldown = LIGHT_COOLDOWN_S;
  return charge(world, FINE_NO_LIGHT, 'Fietsen zonder licht in het donker');
}
