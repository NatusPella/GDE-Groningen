import { STORY_TEST, FLAGS } from './devflags.js';

// Geometry jobs (geokernels.js) in a module worker, so streaming the city
// props and the Ommeland water never blocks a frame on building buffers.
// runGeo(kind, data, done) calls done(result) when the arrays are back; the
// caller only wraps them in a BufferGeometry. Without module workers, under
// the story test or with ?noworker the same kernel runs right away on the
// main thread (done is called before runGeo returns), and if the worker
// fails, its open jobs are redone that way.

const WANT = typeof Worker !== 'undefined' && !STORY_TEST && !FLAGS.noworker;

// geokernels.js registers its kernels here (main.js imports it), so this module
// does not import it back
let KERNELS = null;
export function registerKernels(k) { KERNELS = k; }

let worker = null;
let failed = !WANT;
let nextId = 1;
const open = new Map();
// set-up jobs that only mean something in the worker (never redone here)
const WORKER_ONLY = new Set(['roadInit', 'shoreInit']);
const fallbackHooks = [];
let fellBack = false;
// byKind: per job kind the count, the longest round trip (ms, queue wait included) and the most jobs open at once (#247)
const geoStats = { worker: 0, sync: 0, maxRoundTrip: 0, maxOpen: 0, byKind: {} };
const kindStat = (k) => geoStats.byKind[k] || (geoStats.byKind[k] = { n: 0, maxMs: 0, sumMs: 0, maxOpen: 0 });

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
      const rt = performance.now() - j.t0, ks = kindStat(j.kind);
      geoStats.maxRoundTrip = Math.max(geoStats.maxRoundTrip, rt);
      ks.n++; ks.sumMs += rt; ks.maxMs = Math.max(ks.maxMs, rt);
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


export function runGeo(kind, data, done = () => {}) {
  const w = getWorker();
  if (!w) { runSync(kind, data, done); return; }
  const id = nextId++;
  open.set(id, { kind, data, done, t0: performance.now() });
  geoStats.maxOpen = Math.max(geoStats.maxOpen, open.size);
  const ks = kindStat(kind);
  ks.maxOpen = Math.max(ks.maxOpen, [...open.values()].filter((o) => o.kind === kind).length);
  try { w.postMessage({ id, kind, data }); } catch (e) { fail(e); }
}

