// Who simulates an ambient agent: the worker (far from the player, cheap) or
// the main thread (near the player, full AI with police, crime, collisions).
// Pure decision logic for issue #58; the caller creates the real Vehicle or
// Pedestrian and sends the spawn/despawn messages. Hysteresis (rIn < rOut)
// keeps an agent on the border from flipping every frame.

export const R_IN = 110; // m: a worker agent this close becomes real
export const R_OUT = 150; // m: a real ambient agent this far goes to the worker
const MAX_PER_PLAN = 6; // handovers per frame, so one frame never stalls

// agents: Map id -> { x, y, road, s, speed } from the worker snapshot
// real:   [{ id, x, y, road, s, speed, ambient }] on the main thread; only
//         `ambient` ones (no mission, police, player, hijack, burning...) and
//         ones with a known road position (road >= 0) may go back.
// Returns { takeOver: [agent...], giveBack: [real...] }, nearest first.
export function handoverPlan(agents, real, player, { rIn = R_IN, rOut = R_OUT, max = MAX_PER_PLAN } = {}) {
  const d2 = (o) => (o.x - player.x) * (o.x - player.x) + (o.y - player.y) * (o.y - player.y);
  const takeOver = [];
  for (const a of agents.values()) if (d2(a) < rIn * rIn) takeOver.push(a);
  const giveBack = [];
  for (const r of real) if (r.ambient && r.road >= 0 && d2(r) > rOut * rOut) giveBack.push(r);
  takeOver.sort((p, q) => d2(p) - d2(q));
  giveBack.sort((p, q) => d2(q) - d2(p));
  return { takeOver: takeOver.slice(0, max), giveBack: giveBack.slice(0, max) };
}

// Ids must not clash between the two sides: worker agents use a block that
// the main thread's own ids never reach.
const WORKER_ID_BASE = 1e6;
export const workerId = (n) => WORKER_ID_BASE + n;
export const isWorkerId = (id) => id >= WORKER_ID_BASE;
