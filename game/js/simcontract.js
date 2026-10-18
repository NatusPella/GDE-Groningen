// Message contract between the main thread and the simulation worker
// (simhost.js <-> simworker.js, issue #58). Pure data: no DOM, no THREE, no
// world object. Positions travel as one Float32Array per snapshot so the
// buffer can be transferred, not copied.
//
// main -> worker
//   { type: 'init',    seed, roads: [{ id, pts: Float32Array [x0,y0,x1,y1,...] }] }
//   { type: 'spawn',   agents: [{ id, road, s, speed, kind }] }   s = metres along the road
//   { type: 'despawn', ids: [id, ...] }
//   { type: 'step',    tick, dt }                                  at most one in flight
// worker -> main
//   { type: 'ready' }
//   { type: 'snapshot', tick, n, data: Float32Array(n * SNAP_STRIDE) }
//   { type: 'error',   error: string }

export const SNAP_STRIDE = 5; // id, x, y, angle, speed
export const MSG = Object.freeze({
  INIT: 'init', SPAWN: 'spawn', DESPAWN: 'despawn', STEP: 'step',
  READY: 'ready', SNAPSHOT: 'snapshot', ERROR: 'error',
});
export const MAX_DT = 0.1; // a step never integrates more than this many seconds

const TO_WORKER = new Set([MSG.INIT, MSG.SPAWN, MSG.DESPAWN, MSG.STEP]);
const FROM_WORKER = new Set([MSG.READY, MSG.SNAPSHOT, MSG.ERROR]);

export function packSnapshot(agents, tick) {
  const data = new Float32Array(agents.length * SNAP_STRIDE);
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    const o = i * SNAP_STRIDE;
    data[o] = a.id; data[o + 1] = a.x; data[o + 2] = a.y; data[o + 3] = a.angle; data[o + 4] = a.speed;
  }
  return { type: MSG.SNAPSHOT, tick, n: agents.length, data };
}

// Copies a snapshot into plain objects keyed by id in `into` (a Map, reused).
export function unpackSnapshot(msg, into = new Map()) {
  into.clear();
  const d = msg.data;
  for (let i = 0; i < msg.n; i++) {
    const o = i * SNAP_STRIDE;
    into.set(d[o], { id: d[o], x: d[o + 1], y: d[o + 2], angle: d[o + 3], speed: d[o + 4] });
  }
  return into;
}

// Cheap shape check; returns an error string or null.
export function validateMessage(msg, dir) {
  if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') return 'geen bericht';
  if (!(dir === 'toWorker' ? TO_WORKER : FROM_WORKER).has(msg.type)) return `onbekend type ${msg.type}`;
  switch (msg.type) {
    case MSG.INIT: return Array.isArray(msg.roads) ? null : 'roads ontbreekt';
    case MSG.SPAWN: return Array.isArray(msg.agents) ? null : 'agents ontbreekt';
    case MSG.DESPAWN: return Array.isArray(msg.ids) ? null : 'ids ontbreekt';
    case MSG.STEP: return Number.isFinite(msg.dt) && Number.isFinite(msg.tick) ? null : 'dt/tick ongeldig';
    case MSG.SNAPSHOT: return msg.data instanceof Float32Array && msg.data.length === msg.n * SNAP_STRIDE ? null : 'snapshot ongeldig';
    default: return null;
  }
}
