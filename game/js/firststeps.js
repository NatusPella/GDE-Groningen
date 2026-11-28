// The first ten minutes, pure rules (no DOM, no storage, no world reads): scripts/firststeps_test.mjs runs them in node.
//
// 1. Practice: the control line of the first story goal (controlhint.js, eersteDoelActief) used to stay on screen until
//    the first mission was done, also for a player who had long shown he can walk and drive. It now steps aside per
//    context (on foot, car, boat, plane, heli) once the player has covered PRACTICE_METRES there. Missions, side jobs
//    and chases keep their line (#824): this only concerns the line of the first goal.
// 2. Course: a new player who wanders away from the first goal, or makes no headway for a long time, gets one short
//    reminder card (at most NUDGE.max per session, never while near the goal). The caller decides whether a card may
//    show now (onboarding.js: one at a time, never during a scene) and confirms with courseNudged().
//
// Both keep their state in a plain object the caller owns, per device and per session: nothing is saved and nothing
// goes over the net (Samen spelen: local per player). The track functions run every frame and allocate nothing.

// Metres covered in a context before its line of the first goal steps aside.
export const PRACTICE_METRES = Object.freeze({ foot: 60, vehicle: 250, boat: 250, plane: 600, heli: 600 });
// A larger jump in one sample is a teleport, a respawn or a scene cut: not practice.
export const PRACTICE_MAX_STEP = 15;

export function createPractice() {
  return { foot: 0, vehicle: 0, boat: 0, plane: 0, heli: 0, context: '', x: NaN, y: NaN };
}

// One sample of the local player's position in a context. Mutates st; returns the metres counted this sample.
export function trackPractice(st, context, x, y) {
  if (!st || !Object.hasOwn(PRACTICE_METRES, context) || !Number.isFinite(x) || !Number.isFinite(y)) return 0;
  let step = 0;
  if (st.context === context && Number.isFinite(st.x)) {
    step = Math.hypot(x - st.x, y - st.y);
    if (step > PRACTICE_MAX_STEP) step = 0;
    st[context] += step;
  }
  st.context = context;
  st.x = x;
  st.y = y;
  return step;
}

export const practiced = (st, context) => !!st && Object.hasOwn(PRACTICE_METRES, context) && st[context] >= PRACTICE_METRES[context];

// away: metres further from the goal than the closest point reached. stall: seconds without `progress` metres of
// headway. near: within this distance the goal line already says "Je bent er". gap: seconds between two reminders.
export const NUDGE = Object.freeze({ away: 200, stall: 90, progress: 20, near: 40, gap: 150, max: 2 });

export const NUDGE_CARD = Object.freeze({ title: 'De weg kwijt?', body: 'Volg de gele route op de minimap. Je doel staat bovenin.' });

export function createCourse() {
  return { step: '', best: Infinity, mark: Infinity, stallT: 0, since: Infinity, count: 0 };
}

function rebase(st, dist) {
  st.best = dist;
  st.mark = dist;
  st.stallT = 0;
}

// One sample: the id of the story step the goal belongs to, the distance to it and the frame time. Mutates st.
// Returns '' (nothing to say), 'away' or 'stall'. A new step, or no goal at all, starts the measuring afresh.
export function trackCourse(st, stepId, dist, dt) {
  if (!st) return '';
  const t = dt > 0 && Number.isFinite(dt) ? dt : 0;
  if (st.since < NUDGE.gap) st.since += t;
  if (!stepId || !Number.isFinite(dist)) { st.step = ''; return ''; }
  if (stepId !== st.step) { st.step = stepId; rebase(st, dist); return ''; }
  if (dist < st.best) st.best = dist;
  if (dist <= st.mark - NUDGE.progress) { st.mark = dist; st.stallT = 0; } else st.stallT += t;
  if (dist < NUDGE.near) { st.stallT = 0; return ''; }
  if (st.count >= NUDGE.max || st.since < NUDGE.gap) return '';
  if (dist - st.best >= NUDGE.away) return 'away';
  if (st.stallT >= NUDGE.stall) return 'stall';
  return '';
}

// UX 28-11: the red "Slaan" prompt of a passer-by next to the spawn point was the very first prompt of a new game (before the
// Escapade or the first goal). It stays quiet until the first mission is done; the punch itself works as always.
export const punchPromptAllowed = (missionsDone) => (missionsDone | 0) > 0;

// The reminder was shown: count it and measure afresh from here, so the next one needs new wandering.
export function courseNudged(st, dist) {
  if (!st) return;
  st.count += 1;
  st.since = 0;
  rebase(st, Number.isFinite(dist) ? dist : st.best);
}

// The player chose something else (own goal, a job, a chase) or a scene plays: not lost, and the time does not count.
export function pauseCourse(st) {
  if (st) st.step = '';
}
