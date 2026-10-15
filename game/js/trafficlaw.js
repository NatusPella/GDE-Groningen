// Roads that are not for you (roadaccess.js): walking or cycling on the
// motorway and the ring, a car on a cycle path or a footway, a bike on a
// footway. Physically possible, but an offence: a warning card at once, and
// after a grace period on it the police take an interest (one star, once per
// stretch; never more than one from this alone). Missions, jobs and the
// emergency services are left alone. Pure logic apart from reading the world.
import { travelModeOf, offenceOf } from './roadaccess.js';

export const GRACE_S = 12;
const GAP_S = 3;
const REARM_S = 25;
const SCAN_EVERY = 0.25;
const LEVEL_SPLIT_M = 2.5;

const state = { kind: null, mode: null, on: 0, off: 0, warned: false, fined: false, rearm: 0, scanT: 0, road: null };

export function getLawState() {
  return { kind: state.kind, onS: state.on, warned: state.warned, fined: state.fined, grace: Math.max(0, GRACE_S - state.on) };
}
export function resetTrafficLaw() {
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

const WARN = {
  snelweg: { lopen: 'Lopen op de snelweg? Dat mag niet. Ga er snel vanaf', fiets: 'Fietsen op de snelweg mag niet. Ga er snel vanaf' },
  fietspad: { auto: 'Een auto op het fietspad mag niet. Rijd door naar de weg' },
  voetpad: { auto: 'Een auto op het voetpad mag niet. Rijd door naar de weg', fiets: 'Fietsen op het voetpad mag niet. Stap af of pak de weg' },
};
const STAR_TEXT = 'Een agent heeft je gezien. Politie! Je hebt een ster';

function exempt(world, v) {
  if (!world.player || world.health <= 0 || world.pendingRespawn || world.pigeonMode || world.heliRun || world.trainDriving || world.trainCam) return true;
  if (world.padelGame || world.activityGame || world.challenge) return true;
  if (world.sideJob && world.sideJob.active) return true;
  if (world.mission && world.mission.phase === 'active') return true;
  if (v && (v.isPolice || v.isAmbulance || v.sirenOn || v.isBus)) return true;
  return false;
}

// call every frame; scans four times a second
export function updateTrafficLaw(dt, world) {
  if (!dt) return;
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
  if (!state.warned && state.rearm <= 0) {
    state.warned = true;
    const text = (WARN[kind] || {})[state.mode];
    if (text) world.addMessage(text, 5, { kind: 'politie', key: 'roadlaw' });
  }
  if (!state.fined && state.on >= GRACE_S) {
    state.fined = true;
    state.rearm = REARM_S;
    if ((world.wanted || 0) < 1) {
      world.wanted = 1;
      world.wantedDecayTimer = 0;
      world.addMessage(STAR_TEXT, 5, { kind: 'politie', key: 'roadlaw-star' });
    }
  }
}
