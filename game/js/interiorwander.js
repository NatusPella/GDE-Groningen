// People who walk around in an interior (epic Interieurs, #1150, round 2): customers browse the shop floor, guests move to another
// table, visitors cross the hall. Pure: a walk grid (interiorlayout.js walkGrid, the cells a 0.3 m circle fits) and a seeded
// generator in, positions out. A wanderer picks a reachable cell 2 to 9 m away, finds a path over the grid (breadth-first, 4
// neighbours, shortened to corners), walks it at about 1.1 m/s, waits a few seconds and picks the next. They never leave the
// reachable floor, so they never stand in furniture or in the doorway, and they never walk through a wall.
import { CELL } from './interiorlayout.js';

export const WALK_SPEED = 1.1;

export function makeWanderer(grid, reach, rnd, u, v) {
  return { grid, reach, rnd, u, v, path: [], wait: 1 + rnd() * 4, moving: false, hu: 1, hv: 0 };
}

const cellOf = (g, u, v) => [Math.floor((u - g.H.u0) / CELL), Math.floor((v - g.H.v0) / CELL)];
const centre = (g, i, k) => [g.H.u0 + (i + 0.5) * CELL, g.H.v0 + (k + 0.5) * CELL];

// path over the grid from (i0, k0) to (i1, k1) as a list of [u, v] corner points, or null
export function findPath(grid, reach, i0, k0, i1, k1) {
  const { free, nu, nv } = grid;
  const ok = (i, k) => i >= 0 && k >= 0 && i < nu && k < nv && free[k * nu + i] && reach.seen[k * nu + i];
  if (!ok(i1, k1)) return null;
  const prev = new Map([[i0 + ',' + k0, null]]);
  const q = [[i0, k0]];
  let found = false;
  for (let h = 0; h < q.length; h++) {
    const [i, k] = q[h];
    if (i === i1 && k === k1) { found = true; break; }
    for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di, b = k + dk, key = a + ',' + b;
      if (!ok(a, b) || prev.has(key)) continue;
      prev.set(key, i + ',' + k);
      q.push([a, b]);
    }
  }
  if (!found) return null;
  const cells = [];
  for (let key = i1 + ',' + k1; key; key = prev.get(key)) cells.unshift(key.split(',').map(Number));
  // keep the corners only
  const pts = [];
  for (let n = 1; n < cells.length; n++) {
    const prevDir = n > 1 ? [cells[n - 1][0] - cells[n - 2][0], cells[n - 1][1] - cells[n - 2][1]] : null;
    const dir = [cells[n][0] - cells[n - 1][0], cells[n][1] - cells[n - 1][1]];
    if (!prevDir || prevDir[0] !== dir[0] || prevDir[1] !== dir[1]) pts.push(centre(grid, cells[n - 1][0], cells[n - 1][1]));
  }
  pts.push(centre(grid, i1, k1));
  return pts;
}

// advance a wanderer by dt seconds; returns the wanderer (u, v, moving, hu, hv = heading)
export function stepWanderer(w, dt, speed = WALK_SPEED) {
  const g = w.grid;
  if (w.wait > 0) { w.wait -= dt; w.moving = false; return w; }
  if (!w.path.length) {
    // pick a reachable target 2 to 9 m away
    const [i0, k0] = cellOf(g, w.u, w.v);
    for (let t = 0; t < 12; t++) {
      const a = w.rnd() * Math.PI * 2, d = 2 + w.rnd() * 7;
      const [i1, k1] = cellOf(g, w.u + Math.cos(a) * d, w.v + Math.sin(a) * d);
      const p = findPath(g, w.reach, i0, k0, i1, k1);
      if (p && p.length) { w.path = p; break; }
    }
    if (!w.path.length) { w.wait = 2 + w.rnd() * 3; w.moving = false; return w; }
  }
  let left = speed * dt;
  while (left > 1e-9 && w.path.length) {
    const [tu, tv] = w.path[0], du = tu - w.u, dv = tv - w.v, L = Math.hypot(du, dv);
    if (L < 1e-6) { w.path.shift(); continue; }
    w.hu = du / L; w.hv = dv / L;
    const s = Math.min(left, L);
    w.u += w.hu * s; w.v += w.hv * s; left -= s;
    if (s >= L - 1e-9) w.path.shift();
  }
  w.moving = true;
  if (!w.path.length) { w.wait = 2 + w.rnd() * 6; w.moving = false; }
  return w;
}

// who walks around: people on their feet with a role that browses (the staff behind a counter and the seated stay)
const WANDER_ROLES = new Set(['klant', 'gast', 'reiziger', 'bezoeker', 'lezer', 'bewoner']);
export const mayWander = (n) => n.pose !== 'sit' && WANDER_ROLES.has(n.role);
