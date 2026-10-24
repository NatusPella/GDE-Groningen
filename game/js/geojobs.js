import { STORY_TEST, FLAGS } from './devflags.js';
import { makeGeoQueue, geoPush, geoTake, GEO_OPEN_PER_WORKER, GEO_DISPATCH_PER_FRAME } from './streambudget.js';

// Geometry jobs (geokernels.js) in a module worker, so streaming the city
// props and the Ommeland water never blocks a frame on building buffers.
// runGeo(kind, data, done, near) calls done(result) when the arrays are back;
// the caller only wraps them in a BufferGeometry. Without module workers, under
// the story test or with ?noworker the same kernel runs right away on the
// main thread (done is called before runGeo returns), and if the worker
// fails, its open jobs are redone that way.
//
// The queue (streambudget.js) is what keeps a burst honest (#247): after a jump
// or a train ride the streamers ask for a whole district at once, and sending
// all of it meant the job the player needed stood behind every job ordered
// before it. Now at most GEO_DISPATCH_PER_FRAME new jobs leave per frame, at
// most GEO_OPEN_PER_WORKER are open, and the nearest (and, at speed, the most
// ahead) goes first: `near` is 0..1 from streambudget.js.

const WANT = typeof Worker !== 'undefined' && !STORY_TEST && !FLAGS.noworker;

// geokernels.js registers its kernels here (main.js imports it), so this module
// does not import it back
let KERNELS = null;
export function registerKernels(k) { KERNELS = k; }

// Two workers: the road and shore kernels (roadInit builds the whole network once, 9 to 13 s; roadGeo and shore use it) keep one to
// themselves, so the props and the terrain are not queued behind that set-up (#247).
const workers = [null, null];
const WORKER_OF = { roadPreload: 1, roadInit: 1, roadGeo: 1, shoreInit: 1, shore: 1 }; // shore reads the road worker's map
const workerOf = (kind) => (FLAGS.perfoff && FLAGS.perfoff.includes('eenworker') ? 0 : WORKER_OF[kind] || 0);
let failed = !WANT;
let nextId = 1;
const open = new Map();
// waiting jobs, one queue per worker; in flight per worker (the cap), and how
// many new jobs that worker may still get this frame (geoFrame resets it)
const queues = [makeGeoQueue(), makeGeoQueue()];
const inFlight = [0, 0];
const frameRoom = [GEO_DISPATCH_PER_FRAME, GEO_DISPATCH_PER_FRAME];
// set-up jobs that only mean something in the worker (never redone here)
const WORKER_ONLY = new Set(['roadPreload', 'roadInit', 'shoreInit']);
export const WORKER_ONLY_KINDS = WORKER_ONLY; // (scripts/roadpreload_test.mjs)
const fallbackHooks = [];
let fellBack = false;
// byKind: per job kind the count, the longest round trip (ms, queue wait included) and the most jobs open at once (#247)
// queued/maxQueued/queueMaxMs: what waits, and the longest wait from request to send (the queue's own delay)
// the open worker jobs (the trailer recordings wait until it is 0, scripts/trailer/lib/clip.page.js)
export const geoOpenCount = () => open.size;
export const geoStats = { worker: 0, sync: 0, maxRoundTrip: 0, maxOpen: 0, queued: 0, maxQueued: 0, maxInFlight: 0, queueMaxMs: 0, byKind: {} };
const kindStat = (k) => geoStats.byKind[k] || (geoStats.byKind[k] = { n: 0, maxMs: 0, sumMs: 0, maxOpen: 0 });

// A set-up job goes first; otherwise the job the player can see now wins, and
// at speed what lies ahead counts more than what lies behind. The near bonus
// stays under one kind step, so a shore at the player's feet never beats a road.
const KIND_PRIO = { roadPreload: 90, roadInit: 90, shoreInit: 80, roadGeo: 60, cityMerge: 50, terrain: 40, shore: 20 };
const NEAR_PRIO = 30;
function priorityOf(kind, near) {
  const n = Number.isFinite(near) ? Math.max(0, Math.min(1, near)) : 0;
  return (KIND_PRIO[kind] || 0) + n * NEAR_PRIO;
}

function runSync(kind, data, done) {
  if (!fellBack) { fellBack = true; for (const fn of fallbackHooks) fn(); }
  geoStats.sync++;
  done(KERNELS[kind](data).result);
}

const queuedCount = () => queues[0].items.length + queues[1].items.length;
function noteQueue() {
  geoStats.queued = queuedCount();
  geoStats.maxQueued = Math.max(geoStats.maxQueued, geoStats.queued);
}

function fail(err) {
  if (failed) return;
  console.warn('geometry worker unavailable, building on the main thread', err);
  failed = true;
  for (let i = 0; i < workers.length; i++) { if (workers[i]) workers[i].terminate(); workers[i] = null; }
  const jobs = [...open.values()];
  open.clear();
  for (let i = 0; i < queues.length; i++) { queues[i].items.length = 0; inFlight[i] = 0; }
  noteQueue();
  for (const j of jobs) if (!WORKER_ONLY.has(j.kind)) runSync(j.kind, j.data, j.done);
}

// Hand worker `i` up to `allowance` waiting jobs, best first; never past the cap.
// Returns how many left.
function dispatch(i, allowance) {
  const jobs = geoTake(queues[i], inFlight[i], GEO_OPEN_PER_WORKER, allowance);
  for (const j of jobs) {
    inFlight[i]++;
    geoStats.maxInFlight = Math.max(geoStats.maxInFlight, inFlight[i]);
    const wait = performance.now() - j.t0;
    geoStats.queueMaxMs = Math.max(geoStats.queueMaxMs, wait);
    const ks = kindStat(j.kind);
    ks.queueMax = Math.max(ks.queueMax || 0, wait);
    try { workers[i].postMessage({ id: j.id, kind: j.kind, data: j.data }); } catch (e) { fail(e); break; }
  }
  noteQueue();
  return jobs.length;
}

function getWorker(i = 0) {
  if (workers[i] || failed) return workers[i];
  try {
    const worker = workers[i] = new Worker(new URL('./geoworker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      const { id, result, error, ms } = e.data;
      const j = open.get(id);
      if (!j) return;
      if (error) { fail(error); return; }
      open.delete(id);
      inFlight[i] = Math.max(0, inFlight[i] - 1);
      geoStats.worker++;
      const rt = performance.now() - j.t0, ks = kindStat(j.kind);
      geoStats.maxRoundTrip = Math.max(geoStats.maxRoundTrip, rt);
      ks.n++; ks.sumMs += rt; ks.maxMs = Math.max(ks.maxMs, rt);
      // the round trip minus the kernel's own time: the wait in the queue and for the main thread to take the answer
      if (ms !== undefined) { ks.execMs = (ks.execMs || 0) + ms; ks.execMax = Math.max(ks.execMax || 0, ms); ks.waitMax = Math.max(ks.waitMax || 0, rt - ms); }
      // the worker is free again: fill the slot from the queue (this does not
      // eat the frame's allowance: one out, one in keeps the worker busy)
      dispatch(i, Infinity);
      j.done(result);
    };
    worker.onerror = (e) => { e.preventDefault(); fail(e.message || 'error'); };
  } catch (e) {
    fail(e);
  }
  return workers[i];
}

// True while jobs go to the worker (a caller sends its data once, then).
export function geoWorkerActive() {
  return !!getWorker();
}

// Once per frame from scene3d.js update3D, after the stream focus moved: give
// each worker a fresh dispatch allowance and hand out what waits, best first.
export function geoFrame() {
  for (let i = 0; i < workers.length; i++) {
    if (!workers[i]) continue;
    frameRoom[i] = GEO_DISPATCH_PER_FRAME;
    frameRoom[i] -= dispatch(i, GEO_DISPATCH_PER_FRAME);
    if (!workers[i]) return; // a failing worker terminated both
  }
}

// near: 0..1 (streambudget.js streamNear: 1 at the player, 0 at the edge of the
// view); optional, a caller that has no position leaves it out.
export function runGeo(kind, data, done = () => {}, near = 0) {
  const wi = workerOf(kind);
  const w = getWorker(wi);
  if (!w) { runSync(kind, data, done); return; }
  const id = nextId++;
  const job = { id, kind, data, done, t0: performance.now(), near };
  open.set(id, job);
  geoStats.maxOpen = Math.max(geoStats.maxOpen, open.size);
  const ks = kindStat(kind);
  ks.maxOpen = Math.max(ks.maxOpen, [...open.values()].filter((o) => o.kind === kind).length);
  geoPush(queues[wi], job, priorityOf(kind, near));
  noteQueue();
  // what still fits this frame goes out at once, the rest waits for geoFrame().
  // The very first job on an idle system never waits for a frame: the boot
  // preload of the worker's map must not lose the time the map download gives
  // it. After that, a burst is exactly what the per-frame budget spreads.
  if (frameRoom[wi] > 0) frameRoom[wi] -= dispatch(wi, frameRoom[wi]);
  else if (open.size === 1 && inFlight[wi] === 0) dispatch(wi, 1);
}
