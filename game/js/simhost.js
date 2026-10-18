import { STORY_TEST, FLAGS } from './devflags.js';
import { MSG, validateMessage, unpackSnapshot } from './simcontract.js';
import { createSimKernel } from './simkernel.js';

// Main-thread side of the simulation worker (issue #58), driven by
// simbridge.js (on by default, ?zonderworker turns it off). The
// same path serves Electron and web. Without module workers, under the story
// test or with ?noworker the kernel runs right here and the snapshot is
// available straight after step(); if the worker fails, its state is rebuilt
// on the main thread from the messages sent so far.


// opts.workerFactory: () => Worker-like ({postMessage, terminate, onmessage, onerror}); default builds simworker.js.
// opts.useWorker: false forces the main-thread fallback.
export function createSimHost(opts = {}) {
  const useWorker = opts.useWorker !== undefined ? opts.useWorker : (!!opts.workerFactory || (typeof Worker !== 'undefined' && !STORY_TEST && !FLAGS.noworker));
  const factory = opts.workerFactory || (() => new Worker(new URL('./simworker.js', import.meta.url), { type: 'module' }));
  let worker = null;
  let kernel = null; // main-thread fallback
  let journal = []; // init/spawn/despawn so far, replayed if the worker dies
  let inFlight = false;
  let latest = null; // last raw snapshot
  const view = new Map();
  const stats = { mode: 'none', steps: 0, dropped: 0, snapshots: 0 };

  function receive(msg) {
    const bad = validateMessage(msg, 'fromWorker');
    if (bad) { fallback(bad); return; }
    if (msg.type === MSG.SNAPSHOT) { latest = msg; inFlight = false; stats.snapshots++; unpackSnapshot(msg, view); }
    else if (msg.type === MSG.ERROR) fallback(msg.error);
  }

  function fallback(why) {
    if (kernel) return;
    if (worker) { try { worker.terminate(); } catch (e) { /* already gone */ } }
    worker = null;
    stats.mode = 'main';
    if (why) console.warn('simulation worker unavailable, running on the main thread', why);
    kernel = createSimKernel();
    inFlight = false;
    for (const m of journal) kernel.handle(m);
  }

  function start() {
    if (worker || kernel) return;
    if (!useWorker) { fallback(null); return; }
    try {
      worker = factory();
      worker.onmessage = (e) => receive(e.data);
      worker.onerror = (e) => { if (e && e.preventDefault) e.preventDefault(); fallback((e && e.message) || 'error'); };
      stats.mode = 'worker';
    } catch (e) {
      fallback(e);
    }
  }

  function send(msg) {
    const bad = validateMessage(msg, 'toWorker');
    if (bad) throw new Error(bad);
    start();
    if (msg.type !== MSG.STEP) journal.push(msg);
    if (kernel) { const r = kernel.handle(msg); if (r) receive(r); return; }
    try { worker.postMessage(msg); } catch (e) { fallback(e); if (msg.type === MSG.STEP) kernel.handle(msg); }
  }

  return {
    init(roads, seed = 1) { journal = []; send({ type: MSG.INIT, seed, roads }); },
    spawn(agents) { send({ type: MSG.SPAWN, agents }); },
    despawn(ids) { send({ type: MSG.DESPAWN, ids }); },
    // Asks for one step; skipped (and counted) while the previous one is still out.
    step(tick, dt) {
      // een ongeldige stap zou in send() gooien na inFlight = true: dan wacht de host voorgoed op een snapshot
      if (!Number.isFinite(dt) || !Number.isFinite(tick)) { stats.dropped++; return false; }
      if (inFlight) { stats.dropped++; return false; }
      stats.steps++;
      if (!kernel) inFlight = true;
      send({ type: MSG.STEP, tick, dt });
      return true;
    },
    // Latest snapshot as Map(id -> {id,x,y,angle,speed}); stale until the next one lands.
    positions() { return view; },
    snapshot() { return latest; },
    mode() { start(); return stats.mode; },
    stats,
    dispose() { if (worker) { try { worker.terminate(); } catch (e) { /* ignore */ } } worker = null; kernel = null; },
  };
}
