import { STORY_TEST } from './devflags.js';
import { KERNELS } from './geokernels.js';

// Geometry jobs (geokernels.js) in a module worker, so streaming the city
// props and the Ommeland water never blocks a frame on building buffers.
// runGeo(kind, data, done) calls done(result) when the arrays are back; the
// caller only wraps them in a BufferGeometry. Without module workers, under
// the story test or with ?noworker the same kernel runs right away on the
// main thread (done is called before runGeo returns), and if the worker
// fails, its open jobs are redone that way.

const query = typeof location !== 'undefined' ? location.search : '';
const WANT = typeof Worker !== 'undefined' && !STORY_TEST && !/[?&]noworker\b/.test(query);

let worker = null;
let failed = !WANT;
let nextId = 1;
const open = new Map();
// set-up jobs that only mean something in the worker (never redone here)
const WORKER_ONLY = new Set(['roadInit', 'shoreInit']);
const fallbackHooks = [];
let fellBack = false;
export const geoStats = { worker: 0, sync: 0, maxRoundTrip: 0 };

function runSync(kind, data, done) {
  if (!fellBack) { fellBack = true; for (const fn of fallbackHooks) fn(); }
  geoStats.sync++;
  done(KERNELS[kind](data).result);
}

function fail(err) {
  if (failed) return;
  console.warn('geometry worker unavailable, building on the main thread', err);
  failed = true;
  if (worker) worker.terminate();
  worker = null;
  const jobs = [...open.values()];
  open.clear();
  for (const j of jobs) if (!WORKER_ONLY.has(j.kind)) runSync(j.kind, j.data, j.done);
}

function getWorker() {
  if (worker || failed) return worker;
  try {
    worker = new Worker(new URL('./geoworker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      const { id, result, error } = e.data;
      const j = open.get(id);
      if (!j) return;
      if (error) { fail(error); return; }
      open.delete(id);
      geoStats.worker++;
      geoStats.maxRoundTrip = Math.max(geoStats.maxRoundTrip, performance.now() - j.t0);
      j.done(result);
    };
    worker.onerror = (e) => { e.preventDefault(); fail(e.message || 'error'); };
  } catch (e) {
    fail(e);
  }
  return worker;
}

// True while jobs go to the worker (a caller sends its data once, then).
export function geoWorkerActive() {
  return !!getWorker();
}

// fn runs once before the first job that runs on the main thread
export function onGeoFallback(fn) {
  fallbackHooks.push(fn);
  if (fellBack) fn();
}

export function runGeo(kind, data, done = () => {}) {
  const w = getWorker();
  if (!w) { runSync(kind, data, done); return; }
  const id = nextId++;
  open.set(id, { kind, data, done, t0: performance.now() });
  try { w.postMessage({ id, kind, data }); } catch (e) { fail(e); }
}

export function geoPending() {
  return open.size;
}
