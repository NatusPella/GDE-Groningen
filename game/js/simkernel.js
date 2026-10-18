import { MSG, MAX_DT, packSnapshot } from './simcontract.js';

// The pure simulation core behind the worker (issue #58). It runs in
// simworker.js, or on the main thread when Worker is missing (simhost.js), so
// both paths give the same numbers. First step: agents follow a road polyline
// at a fixed speed. The real traffic AI (vehicle.js, pedestrians.js) still
// runs on the main thread; it moves in here kernel by kernel (see the plan in
// the issue). No DOM, no THREE, no Math.random: agents are deterministic.

export function createSimKernel() {
  let roads = new Map(); // id -> { pts, cum, len }
  let agents = new Map(); // id -> { id, road, s, speed, x, y, angle }

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
    const s = ((a.s % r.len) + r.len) % r.len; // loops around
    a.s = s;
    let i = 1;
    while (i < r.cum.length - 1 && r.cum[i] < s) i++;
    const t = (s - r.cum[i - 1]) / Math.max(1e-6, r.cum[i] - r.cum[i - 1]);
    const x0 = r.pts[2 * i - 2], y0 = r.pts[2 * i - 1], x1 = r.pts[2 * i], y1 = r.pts[2 * i + 1];
    a.x = x0 + (x1 - x0) * t;
    a.y = y0 + (y1 - y0) * t;
    a.angle = Math.atan2(y1 - y0, x1 - x0);
  }

  // Handles one message; returns a reply message or null.
  function handle(msg) {
    switch (msg.type) {
      case MSG.INIT:
        roads = new Map(); agents = new Map();
        for (const r of msg.roads) addRoad(r);
        return { type: MSG.READY };
      case MSG.SPAWN:
        for (const a of msg.agents) {
          const o = { id: a.id, road: a.road, s: a.s || 0, speed: a.speed || 0, x: 0, y: 0, angle: 0 };
          if (!roads.has(o.road)) continue;
          place(o);
          agents.set(o.id, o);
        }
        return null;
      case MSG.DESPAWN:
        for (const id of msg.ids) agents.delete(id);
        return null;
      case MSG.STEP: {
        const dt = Math.max(0, Math.min(MAX_DT, msg.dt));
        for (const a of agents.values()) { a.s += a.speed * dt; place(a); }
        return packSnapshot([...agents.values()], msg.tick);
      }
      default:
        return { type: MSG.ERROR, error: `onbekend type ${msg.type}` };
    }
  }

  return { handle, size: () => agents.size };
}
