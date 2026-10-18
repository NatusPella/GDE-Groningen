// Validity of queued story messages (refs #171). A text on the phone or a story contact is queued and only
// delivered when the player is free (narrative.js, attention.js); by then the moment can be over. A message
// may carry `valid`, and the queues ask isStale() at delivery time:
//   until         world.time after which it no longer applies (set from `ttl` seconds when stamped)
//   step          story step index (storyarc STEPS) it belongs to; stale once the story moved past it
//   whileMission  true = only while some mission is active; a number = only while that mission is active
//   within        { x, y, r }: only while the player is within r metres of the spot
// An item without `valid` never expires, so every existing message keeps working. A stale item is not shown
// as a card or a call: the queue logs it in the phone history as a short look back instead.
// Pure logic, no DOM: scripts/validity_test.mjs.

let provider = () => null;

// () => { time, stepIndex, mission: { phase, index }, player: { x, y } } (any part may be missing)
export function setValidityContext(fn) { provider = typeof fn === 'function' ? fn : () => null; }
export const validityContext = () => provider() || {};

// Gives `item` a validity: spec { ttl, step, whileMission, within } is resolved against the context now
// (ttl seconds -> until, `step: true` -> the current step). Returns the item.
export function withValidity(item, spec = {}) {
  const ctx = validityContext();
  const v = {};
  if (Number.isFinite(spec.ttl) && Number.isFinite(ctx.time)) v.until = ctx.time + spec.ttl;
  if (Number.isFinite(spec.until)) v.until = spec.until;
  if (spec.step === true) { if (Number.isFinite(ctx.stepIndex)) v.step = ctx.stepIndex; } else if (Number.isFinite(spec.step)) v.step = spec.step;
  if (spec.whileMission !== undefined) v.whileMission = spec.whileMission;
  if (spec.within) v.within = spec.within;
  if (Object.keys(v).length) item.valid = v;
  return item;
}

export function isStale(item, ctx = validityContext()) {
  const v = item && item.valid;
  if (!v) return false;
  if (Number.isFinite(v.until) && Number.isFinite(ctx.time) && ctx.time > v.until) return true;
  if (Number.isFinite(v.step) && Number.isFinite(ctx.stepIndex) && ctx.stepIndex > v.step) return true;
  if (v.whileMission !== undefined && v.whileMission !== false) {
    const m = ctx.mission;
    if (!m || m.phase !== 'active') return true;
    if (Number.isFinite(v.whileMission) && m.index !== v.whileMission) return true;
  }
  if (v.within && ctx.player && Math.hypot(ctx.player.x - v.within.x, ctx.player.y - v.within.y) > v.within.r) return true;
  return false;
}
