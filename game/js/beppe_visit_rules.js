// Pure rules of a visit to Beppe's house (issue #1063): when the house opens,
// which act the player has reached (so no beat runs ahead of the story), which
// beat and tip come next, the daily soup, and the room itself (its measures,
// its spots, the walls and the fixed room camera). No THREE, no DOM, no clock:
// scripts/beppe_visit_test.mjs imports this file directly; beppe_binnen.js
// draws the room with it and beppe_garden.js asks it about the door.
//
// Why the house opens after M01 ("Nul krassen, vijftienhonderd punten", the
// first mission): the opening (M00) is only the move; M01 is the first time
// the player drives, so from there the western border is reachable and Tammo's
// text makes sense. It is derived, never stored: a save that has already passed
// M01 (done, skipped, or a later step done) simply has the house open.

import { STEPS, stepDone } from './storyarc.js';
import { BEATS, TIPS } from './beppe_visit_texts.js';

export const UNLOCK_STEP = 'M01';

// The acts in story order. The act of a note is the first act in which it may
// be read; the player's reached act is the furthest part of a finished step.
export const ACT_ORDER = ['kop', 'romp', 'staart', 'zuid', 'ontzet', 'nazomer'];
const actIndex = (part) => ACT_ORDER.indexOf(part);

// What a lifetime mark looks like (achievements.js sets): one per speeldag and
// player, so the cooldown is the player's own (#429).
export const VISIT = {
  set: 'beppe_huis',
  invited: 'uitnodiging',
  first: 'eerste',
  stat: 'beppe_bezoeken',
};
export const soupKey = (day) => `soep:${Number.isFinite(day) ? Math.round(day) : 0}`;

// A story snapshot: done = ids of finished or skipped steps, completed = the
// indices of passed missions (missions.js chain). Both come from a live game
// (storyquery.js getStorySave + the mission chain) or from a save file.
function doneSets(snap) {
  const done = new Set(snap && Array.isArray(snap.done) ? snap.done : []);
  const passed = new Set(snap && Array.isArray(snap.completed) ? snap.completed : []);
  return { isDone: (id) => done.has(id), isPassed: (i) => passed.has(i) };
}

// Is the house open? True once the unlock step is done, or any later step.
export function visitUnlocked(snap) {
  const k = STEPS.findIndex((s) => s.id === UNLOCK_STEP);
  if (k < 0) return false;
  const { isDone, isPassed } = doneSets(snap);
  for (let i = k; i < STEPS.length; i++) {
    if (stepDone(i, isDone, isPassed)) return true;
  }
  return false;
}

// The furthest act the player has reached: the part of the furthest step that
// is done. Used so that nothing is told before its act ('kop' at the least).
export function reachedAct(snap) {
  const { isDone, isPassed } = doneSets(snap);
  let best = 0;
  for (let i = 0; i < STEPS.length; i++) {
    if (!stepDone(i, isDone, isPassed)) continue;
    const a = actIndex(STEPS[i].part);
    if (a > best) best = a;
  }
  return ACT_ORDER[best];
}

export const timeOfDay = (clock) => {
  const h = (((Number(clock) || 0) % 24) + 24) % 24;
  if (h >= 5 && h < 11) return 'ochtend';
  if (h >= 11 && h < 17) return 'middag';
  if (h >= 17 && h < 22) return 'avond';
  return 'nacht';
};

// Rain (not mist or overcast): the shower that is on in the world.
export const isRaining = (weather) => !!weather && !!weather.active && (Number(weather.intensity) || 0) > 0.12;

const hash = (n) => { let h = (Math.imul(n | 0, 2654435761) ^ 0x9e3779b9) >>> 0; h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; return (h ^ (h >>> 13)) >>> 0; };

// Which beats may be told to this player at this moment, in the order of
// preference: the ones whose own condition (who, time, weather) holds first.
export function eligible(list, { act = 'kop', who = '', time = '', rain = false } = {}) {
  const max = Math.max(0, actIndex(act));
  const out = [];
  for (const b of list) {
    if (actIndex(b.act) < 0 || actIndex(b.act) > max) continue;
    if (b.who && b.who !== who) continue;
    if (b.time && b.time !== time) continue;
    if (b.weather === 'regen' && !rain) continue;
    out.push(b);
  }
  return out;
}

// The next beat or tip: deterministic in (day, visit), never the one just told
// (`last`), conditional notes first when one fits (a rainy evening gets the rain
// note before the plain ones, but not every time: every third visit is plain).
export function pickBeat(list, ctx = {}, { day = 0, visit = 0, last = '' } = {}) {
  const ok = eligible(list, ctx);
  if (!ok.length) return null;
  const tuned = ok.filter((b) => b.who || b.time || b.weather);
  const plain = ok.filter((b) => !(b.who || b.time || b.weather));
  const h = hash(day * 131 + visit * 7 + 1);
  let pool = tuned.length && visit % 3 !== 2 ? tuned : (plain.length ? plain : tuned);
  if (pool.length > 1) pool = pool.filter((b) => b.id !== last);
  return pool[h % pool.length];
}

export const pickNote = (ctx, st) => pickBeat(BEATS, ctx, st);
export const pickTip = (ctx, st) => pickBeat(TIPS, { ...ctx, who: '', time: '', rain: false }, st);

// The daily soup: once per speeldag and per player. `has` asks the player's
// own lifetime marks (hasUnique); the result says what the soup does now.
export function soupState({ day = 0, has = () => false, health = 100, maxHealth = 100, heal = 30, cookieMoney = 10 } = {}) {
  if (has(VISIT.set, soupKey(day))) return { due: false, heal: 0, money: 0, full: health >= maxHealth };
  const want = Math.max(0, Math.min(heal, maxHealth - health));
  // a player who needs no soup still gets the day's little gesture: the cookie
  return { due: true, heal: want, money: want < heal ? cookieMoney : 0, full: health >= maxHealth };
}

// --- the room ------------------------------------------------------------
// The house frame of beppe_rules.js housePoint: +x towards the road (the door is
// in that wall), +z to the side, origin in the middle of the house. The room is
// the house itself (5.6 x 7 m, 2.6 m high: houseMesh in beppe_garden.js), so the
// outer wall colliders already keep the player in; the clamp below is a safety
// net and keeps him off the furniture.
export const ROOM = { hw: 2.8, hd: 3.5, h: 2.6, wallMargin: 0.45, ceilMargin: 0.3 };

export const SPOTS = {
  door: { x: 2.05, z: 0 },      // inside the front door: E to leave
  stove: { x: -1.75, z: 1.6 },  // the pan on the stove: the soup
  table: { x: 0.0, z: -1.35 },  // the kitchen table: the note
  board: { x: -0.4, z: -2.85 }, // the pinboard on the wall: the tip
  enter: { x: 1.4, z: 0 },      // where the player stands after entering
  out: { x: 4.4, z: 0 },        // on the veranda, in front of the door
  doorOutside: { x: 3.7, z: 0 }, // the front step: E to enter
};
export const SPOT_R = 1.35;
export const DOOR_R = 1.6;

// Solid furniture [x0, z0, x1, z1] in the house frame (the table, the stove
// block, the cupboard against the back wall).
export const SOLIDS = [
  [-0.55, -1.75, 0.55, -0.95],   // table
  [-2.6, 1.0, -1.85, 2.2],       // stove and counter
  [-2.65, -3.4, -2.1, -1.9],     // cupboard
  [-0.15, 2.25, 0.75, 3.5],      // armchair (to the wall: nobody squeezes behind it)
];

// Beppe herself, standing by the table while she lives.
export const SOLID_BEPPE = [0.65, -1.7, 1.25, -1.1];

export function nearestSpot(lx, lz, r = SPOT_R) {
  let best = null, bd = r;
  for (const k of ['door', 'stove', 'table', 'board']) {
    const s = SPOTS[k];
    const d = Math.hypot(lx - s.x, lz - s.z);
    if (d <= bd) { bd = d; best = k; }
  }
  return best;
}

export const nearDoorOutside = (lx, lz) => Math.hypot(lx - SPOTS.doorOutside.x, lz - SPOTS.doorOutside.z) <= DOOR_R;

// Keep a walker (radius r) inside the walls and out of the furniture; returns
// the corrected house-frame position.
export function keepInRoom(lx, lz, r = 0.32, extra = []) {
  if (!Number.isFinite(lx) || !Number.isFinite(lz)) { lx = SPOTS.enter.x; lz = SPOTS.enter.z; }
  const m = 0.15;
  const cl = () => {
    lx = Math.max(-ROOM.hw + r + m, Math.min(ROOM.hw - r - m, lx));
    lz = Math.max(-ROOM.hd + r + m, Math.min(ROOM.hd - r - m, lz));
  };
  cl();
  for (const [x0, z0, x1, z1] of [...SOLIDS, ...extra]) {
    const cx = Math.max(x0, Math.min(x1, lx)), cz = Math.max(z0, Math.min(z1, lz));
    const dx = lx - cx, dz = lz - cz, d = Math.hypot(dx, dz);
    if (d >= r) continue;
    if (d < 1e-4) {
      const o = [[lx - x0, -1, 0], [x1 - lx, 1, 0], [lz - z0, 0, -1], [z1 - lz, 0, 1]].sort((a, b) => a[0] - b[0])[0];
      lx += o[1] * (o[0] + r); lz += o[2] * (o[0] + r);
    } else { lx += dx / d * (r - d); lz += dz / d * (r - d); }
  }
  cl();
  return { lx, lz };
}

export const insideRoom = (lx, lz, slack = 0.2) => Math.abs(lx) <= ROOM.hw + slack && Math.abs(lz) <= ROOM.hd + slack;

// The fixed room camera: from the front corner (the door wall, the +z side), inside
// the walls and under the ceiling, looking down and across the room, so the stove,
// the table, the pinboard and the door are all in view. A hard cut, no pan (the
// binnensets rule, docs/BINNENSETS-21-11.md). Frame coordinates; `yaw` is the
// direction the camera looks in (frame angle), which the movement keys follow.
export function roomCamera() {
  const pos = { x: ROOM.hw - ROOM.wallMargin, z: ROOM.hd - ROOM.wallMargin, h: Math.min(2.15, ROOM.h - ROOM.ceilMargin) };
  const look = { x: -0.3, z: -0.4, h: 0.6 };
  return { pos, look, fov: 66, yaw: Math.atan2(look.z - pos.z, look.x - pos.x) };
}
export const cameraInsideRoom = (c) => !!c && Math.abs(c.pos.x) <= ROOM.hw - ROOM.wallMargin + 1e-9 && Math.abs(c.pos.z) <= ROOM.hd - ROOM.wallMargin + 1e-9 && c.pos.h <= ROOM.h - ROOM.ceilMargin + 1e-9 && c.pos.h > 0.3;

// Can the player come in now? (walking, nothing else in charge, no police)
export function canEnter({ onFoot = true, busy = false, wanted = 0, unlocked = false, near = false, cinematic = false } = {}) {
  return !!unlocked && !!near && !!onFoot && !busy && !(wanted > 0) && !cinematic;
}
