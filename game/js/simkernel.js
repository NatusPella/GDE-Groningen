import { MSG, MAX_DT, packSnapshot } from './simcontract.js';

// The pure simulation core behind the worker (issue #58). It runs in
// simworker.js, or on the main thread when Worker is missing (simhost.js), so
// both paths give the same numbers. Ambient agents follow a road polyline:
// cars keep a gap to the car ahead and stop at a red stop line, walkers just
// walk. The interactive AI (vehicle.js, pedestrians.js: police, crime, the
// player's surroundings) stays on the main thread; simhandover.js decides
// which agents cross over. No DOM, no THREE, no Math.random: deterministic.

const ACCEL = 2.5; // m/s2
const BRAKE = 4; // m/s2, comfortable braking
export const MIN_GAP = 5; // m between bumper and tail, standing
const SIGNAL_LOOK = 60; // m
const END_STOP = 0.5; // m before the end of the road where a stopping agent (spawn `stop`) halts

// Red/green as a pure function of the kernel clock.
export function signalGreen(sig, t) {
  const cycle = sig.cycle > 0 ? sig.cycle : 1;
  return ((((t + (sig.offset || 0)) % cycle) + cycle) % cycle) < sig.green;
}

// The speed a car may have with `gap` metres of free road ahead.
export function safeSpeed(gap) {
  return Math.sqrt(2 * BRAKE * Math.max(0, gap - MIN_GAP));
}

export function createSimKernel() {
  let roads = new Map(); // id -> { pts, cum, len }
  let agents = new Map(); // id -> { id, road, s, speed (cruise), v, kind, x, y, angle }
  let signals = new Map(); // road -> [{ s, cycle, green, offset }] sorted by s
  let clock = 0;

  function addRoad(r) {
    const pts = r.pts;
    const n = Math.floor(pts.length / 2);
    const cum = new Float64Array(n);
    for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + Math.hypot(pts[2 * i] - pts[2 * i - 2], pts[2 * i + 1] - pts[2 * i - 1]);
    roads.set(r.id, { pts, cum, len: n ? cum[n - 1] : 0 });
  }

  function place(a) {
    const r = roads.get(a.road);
    if (!r || r.len <= 0) return;
    a.s = ((a.s % r.len) + r.len) % r.len; // loops around
    // dir -1: the agent travels from the end of the polyline to its start; s counts along its way
    const s = a.dir < 0 ? r.len - a.s : a.s;
    let i = 1;
    while (i < r.cum.length - 1 && r.cum[i] < s) i++;
    const t = (s - r.cum[i - 1]) / Math.max(1e-6, r.cum[i] - r.cum[i - 1]);
    const x0 = r.pts[2 * i - 2], y0 = r.pts[2 * i - 1], x1 = r.pts[2 * i], y1 = r.pts[2 * i + 1];
    a.x = x0 + (x1 - x0) * t;
    a.y = y0 + (y1 - y0) * t;
    a.angle = Math.atan2(y1 - y0, x1 - x0);
    if (a.dir < 0) a.angle = Math.atan2(Math.sin(a.angle + Math.PI), Math.cos(a.angle + Math.PI));
  }

  // Room ahead of a car: the car in front or a red stop line, whichever is nearer.
  function advance(dt) {
    const byRoad = new Map();
    for (const a of agents.values()) {
      if (a.kind === 'ped') { a.s += a.speed * dt; continue; }
      const key = a.road * 2 + (a.dir < 0 ? 1 : 0); // each driving direction is its own queue
      if (!byRoad.has(key)) byRoad.set(key, []);
      byRoad.get(key).push(a);
    }
    for (const [rid, list] of byRoad) {
      const len = roads.get(Math.floor(rid / 2)).len;
      list.sort((p, q) => p.s - q.s || p.id - q.id);
      const sig = (rid % 2 ? [] : signals.get(rid / 2)) || []; // stop lines are for the forward direction
      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        let gap = Infinity;
        if (list.length > 1) {
          const lead = list[(i + 1) % list.length];
          gap = lead.s - a.s;
          if (gap <= 0) gap += len;
          gap -= 2; // car length
        }
        for (const g of sig) {
          let d = g.s - a.s;
          if (d < 0) d += len;
          if (d > SIGNAL_LOOK || signalGreen(g, clock)) continue;
          if (d - 1 + MIN_GAP < gap) gap = d - 1 + MIN_GAP; // stop 1 m before the line, not MIN_GAP behind it
        }
        const want = Math.min(a.speed, safeSpeed(gap));
        a.v = want >= a.v ? Math.min(want, a.v + ACCEL * dt) : Math.max(want, a.v - 2 * BRAKE * dt);
        a.s += a.v * dt;
        // a car that ends at the road end waits there for the main thread to take it over (simbridge.js)
        if (a.stop && a.s > len - END_STOP) { a.s = len - END_STOP; a.v = 0; }
      }
    }
    for (const a of agents.values()) { place(a); }
  }

  // Handles one message; returns a reply message or null.
  function handle(msg) {
    switch (msg.type) {
      case MSG.INIT:
        roads = new Map(); agents = new Map(); signals = new Map(); clock = 0;
        for (const r of msg.roads) addRoad(r);
        for (const g of msg.signals || []) {
          if (!signals.has(g.road)) signals.set(g.road, []);
          signals.get(g.road).push(g);
        }
        for (const l of signals.values()) l.sort((a, b) => a.s - b.s);
        return { type: MSG.READY };
      case MSG.SPAWN:
        for (const a of msg.agents) {
          const o = { id: a.id, road: a.road, s: a.s || 0, speed: a.speed || 0, v: a.speed || 0, kind: a.kind === 'ped' ? 'ped' : 'car', dir: a.dir < 0 ? -1 : 1, stop: !!a.stop, x: 0, y: 0, angle: 0 };
          if (!roads.has(o.road)) continue;
          place(o);
          agents.set(o.id, o);
        }
        return null;
      case MSG.DESPAWN:
        for (const id of msg.ids) agents.delete(id);
        return null;
      case MSG.STEP: {
        const dt = Number.isFinite(msg.dt) ? Math.max(0, Math.min(MAX_DT, msg.dt)) : 0; // NaN zou de klok en alle posities voorgoed vergiften
        clock += dt;
        advance(dt);
        return packSnapshot([...agents.values()].map((a) => ({ ...a, speed: a.v })), msg.tick);
      }
      default:
        return { type: MSG.ERROR, error: `onbekend type ${msg.type}` };
    }
  }

  return { handle, size: () => agents.size };
}
