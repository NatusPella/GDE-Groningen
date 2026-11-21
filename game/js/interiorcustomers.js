// Customers of an own business (epic Bezit #1102 x epic Interieurs #1150): the hook `customers(b)` says how many customers the turnover of today
// is worth (at most 6); the layout already has a few loose 'klant' figures, this adds the missing ones on reachable floor cells.
// Pure (no THREE): a walk grid and its reach in, extra npc rows out. Seeded, so the same shop shows the same people.
import { CELL } from './interiorlayout.js';

export const MAX_CUSTOMER_FIGURES = 6;

// how many to add: the wanted number (clamped) minus the customers that are already standing there
export function missingCustomers(wanted, npcs) {
  const want = Math.max(0, Math.min(MAX_CUSTOMER_FIGURES, Math.floor(Number(wanted) || 0)));
  const have = (npcs || []).filter((n) => n.role === 'klant').length;
  return Math.max(0, want - have);
}

// n extra customers on cells that can be reached, 1.2 m apart from everyone, not in the doorway (the first 1.6 m of the hall)
export function extraCustomers(grid, reach, npcs, n, rnd) {
  const out = [];
  if (!grid || !reach || n <= 0) return out;
  const { free, nu, nv, H } = grid;
  const cells = [];
  for (let k = 0; k < nv; k++) for (let i = 0; i < nu; i++) {
    if (!free[k * nu + i] || !reach.seen[k * nu + i]) continue;
    const u = H.u0 + (i + 0.5) * CELL, v = H.v0 + (k + 0.5) * CELL;
    if (v < H.v0 + 1.6) continue;
    cells.push([u, v]);
  }
  const taken = (npcs || []).map((q) => [q.u, q.v]);
  let tries = 0;
  while (out.length < n && cells.length && tries++ < 60) {
    const [u, v] = cells[Math.floor(rnd() * cells.length)];
    if (taken.some(([a, b]) => Math.hypot(a - u, b - v) < 1.2)) continue;
    taken.push([u, v]);
    out.push({ role: 'klant', u, v, face: Math.floor(rnd() * 4), pose: 'stand', extra: true });
  }
  return out;
}

// Hook sets of several systems (Bezit, Homebase) become one: owned: any says yes; manage and homeStyle: the first answer that is not empty;
// customers: the highest; epoch: the sum. A hook that throws counts as no answer.
export function combineHooks(sets) {
  const call = (k, ...a) => { const out = []; for (const x of sets) { if (typeof x[k] !== 'function') continue; try { out.push(x[k](...a)); } catch (e) { out.push(undefined); } } return out; };
  return {
    owned: (b) => call('owned', b).some(Boolean),
    manage: (b, plan) => call('manage', b, plan).find((r) => r) || null,
    homeStyle: (b) => call('homeStyle', b).find((r) => r) || null,
    epoch: () => call('epoch').reduce((a, n) => a + (Number(n) || 0), 0),   // telt elke wijziging die het plan van een pand kan veranderen (Bezit: gekocht, verkocht)
    customers: (b) => Math.max(0, ...call('customers', b).map((n) => Number(n) || 0)),
  };
}
