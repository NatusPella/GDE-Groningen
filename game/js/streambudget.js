// Where the streamer should look ahead, and how much geometry work a worker
// may get per frame (#247). Pure: no three.js, no DOM, no timers, so
// scripts/streambudget_test.mjs checks every rule without a browser.
//
// Two questions, two halves:
//  1. advanceStreamAhead() keeps the focus's speed and heading (smoothed, so a
//     swerve does not reorder the whole world) and streamRank() puts a place
//     in the queue: what lies ahead goes first, what lies behind waits. At a
//     standstill it is plain distance, so walking around behaves as before.
//  2. makeGeoQueue() + geoTake() hand the geometry worker at most a few new
//     jobs per frame and keep a cap on what is open, so a burst (a jump, a
//     train ride, a new district) no longer fills the worker's queue with
//     places the player has already passed.

// below this speed a place is just as near as it looks
export const STREAM_SPEED_MIN = 4; // m/s
// the same ceiling tilefocus.js uses, so one wild frame cannot invent a heading
const STREAM_MAX_SPEED = 80; // m/s
// how many seconds of travel still count as "ahead"
export const STREAM_LEAD_S = 3;
export const STREAM_MAX_LEAD = 250; // m
// the heading follows the moves with this time constant
const STREAM_SMOOTH_S = 0.35;
// a move this far in one frame (teleport, train, respawn, camera cut) is not a
// speed: it would point the prefetch somewhere random
const STREAM_CUT_M = 150;

export function createStreamAhead() {
  return { x: null, y: null, dirX: 1, dirY: 0, speed: 0, lead: 0 };
}

// One call per frame with the streaming focus (scene3d.js streamFocus) and the
// frame time. Mutates and returns `s`.
export function advanceStreamAhead(s, x, y, dt, opts = {}) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return s;
  const prevX = s.x, prevY = s.y;
  s.x = x;
  s.y = y;
  if (prevX === null || !(dt > 0)) return s;
  const dx = x - prevX, dy = y - prevY, moved = Math.hypot(dx, dy);
  if (moved > (opts.cutM ?? STREAM_CUT_M)) { s.speed = 0; s.lead = 0; return s; }
  const max = opts.maxSpeed ?? STREAM_MAX_SPEED;
  const k = Math.min(1, dt / (opts.smoothS ?? STREAM_SMOOTH_S));
  s.speed += (Math.min(max, moved / dt) - s.speed) * k;
  if (moved > 0.01) {
    const nx = dx / moved, ny = dy / moved;
    const bx = s.dirX + (nx - s.dirX) * k, by = s.dirY + (ny - s.dirY) * k;
    const bl = Math.hypot(bx, by);
    // a U-turn (the blend passes through zero) takes the new heading instead of
    // swinging round through a direction the player never drove
    if (bl > 0.2) { s.dirX = bx / bl; s.dirY = by / bl; } else { s.dirX = nx; s.dirY = ny; }
  }
  s.lead = leadOf(s, opts);
  return s;
}

// metres of travel the prefetch covers: 3 s of it, up to 250 m
function leadOf(s, opts = {}) {
  if (!(s.speed > (opts.minSpeed ?? STREAM_SPEED_MIN))) return 0;
  return Math.min(s.speed * (opts.leadS ?? STREAM_LEAD_S), opts.maxLead ?? STREAM_MAX_LEAD);
}

// The point the prefetch is aimed at (the focus plus its lead).
export function streamLead(s) {
  s.lead = leadOf(s);
  return { x: (s.x || 0) + s.dirX * s.lead, y: (s.y || 0) + s.dirY * s.lead, lead: s.lead };
}

// Sort key for a place: lower comes first. Distance, minus what the place is
// worth for lying ahead (at most the lead), plus the same for lying behind, so
// at 30 m/s a place 100 m ahead beats one 20 m behind.
export function streamRank(s, x, y) {
  // no focus yet (before the first frame): nothing deserves a head start
  if (s.x === null || !Number.isFinite(x) || !Number.isFinite(y)) return 1e9;
  const rx = x - s.x, ry = y - s.y;
  const dist = Math.hypot(rx, ry);
  const lead = s.lead || leadOf(s);
  if (!lead) return dist;
  const along = rx * s.dirX + ry * s.dirY;
  return dist - Math.max(-lead, Math.min(lead, along));
}

// 0..1 for the worker's job order: 1 at the focus, 0 at the edge of `radius`.
export function streamNear(s, x, y, radius = 300) {
  const r = streamRank(s, x, y);
  return Math.max(0, Math.min(1, 1 - r / (radius > 0 ? radius : 1)));
}

// The live predictor the streaming modules read: scene3d.js advances it once a
// frame, roadsurface.js, cityprops.js and quaywalls.js only read it, so they
// can order their worker jobs without a parameter through every call.
const here = createStreamAhead();
export function noteStreamFocus(x, y, dt) { return advanceStreamAhead(here, x, y, dt); }
export function streamAheadHere() { return here; }
export function streamRankHere(x, y) { return streamRank(here, x, y); }
export function streamNearHere(x, y, radius) { return streamNear(here, x, y, radius); }

// At most this many jobs are out at one worker; the rest waits in order.
export const GEO_OPEN_PER_WORKER = 12;
// A burst after a jump or a train ride goes out over a few frames, not all in
// the frame that noticed it.
export const GEO_DISPATCH_PER_FRAME = 6;

export function makeGeoQueue() {
  return { items: [], seq: 0 };
}

// Insert by priority (higher first), first come first served among equals, so
// a frame's requests keep their order. Returns the job.
export function geoPush(queue, job, prio = 0) {
  job.prio = prio;
  job.seq = queue.seq++;
  const a = queue.items;
  let lo = 0, hi = a.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (a[mid].prio >= prio) lo = mid + 1; else hi = mid;
  }
  a.splice(lo, 0, job);
  return job;
}

// Take the next jobs to send: never more than `allowance`, never more than the
// room under `maxOpen`.
export function geoTake(queue, open, maxOpen, allowance) {
  const room = Math.max(0, maxOpen - (open || 0));
  const n = Math.min(queue.items.length, room, Math.max(0, allowance));
  return n > 0 ? queue.items.splice(0, n) : [];
}
