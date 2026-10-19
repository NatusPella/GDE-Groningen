// Ghost replay: record the path of your best run, play it back as a see-through
// ghost on the next one. Pure maths and storage plumbing, no DOM and no THREE:
// kartbaan.js and the drift zones feed it positions; scripts/ghost_test.mjs
// checks it in node. A run is sampled at a fixed interval and kept as flat
// numbers [x, y, angle, ...] (cm and centi-radians), a few KB per run.
const GHOST_STEP = 0.1; // seconds between samples
const GHOST_MAX_S = 600; // a run longer than this is not worth keeping

export function createRecorder(step = GHOST_STEP) {
  return { step, next: 0, s: [], last: 0 };
}

const r2 = (n) => Math.round(n * 100) / 100;

// call every frame with the run time and the pose; samples when due
export function recordGhost(rec, t, x, y, a) {
  if (t > GHOST_MAX_S) return;
  while (rec.next <= t) {
    rec.s.push(r2(x), r2(y), r2(a));
    rec.next += rec.step;
  }
  rec.last = t;
}

// the finished run: `total` is the result. Seconds by default (lower is
// better); { higher: true } for a score (the drift zones).
export function finishGhost(rec, total, { higher = false } = {}) {
  const g = { v: 1, step: rec.step, total: r2(total), s: rec.s.slice() };
  if (higher) g.hi = 1;
  return g;
}

export function validGhost(g) {
  return !!g && g.v === 1 && Number.isFinite(g.total) && g.total > 0 && Number.isFinite(g.step) && g.step > 0 &&
    Array.isArray(g.s) && g.s.length >= 6 && g.s.length % 3 === 0 && g.s.every(Number.isFinite);
}

export const ghostLength = (g) => (g.s.length / 3 - 1) * g.step;

const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

// pose of the ghost at run time t; null once the recording has ended
export function ghostAt(g, t) {
  if (!validGhost(g) || t < 0) return null;
  const f = t / g.step, i = Math.floor(f), n = g.s.length / 3;
  if (i >= n - 1) return i === n - 1 && f - i < 1e-9 ? { x: g.s[i * 3], y: g.s[i * 3 + 1], a: g.s[i * 3 + 2], done: false } : null;
  const k = f - i, o = i * 3;
  return {
    x: g.s[o] + (g.s[o + 3] - g.s[o]) * k,
    y: g.s[o + 1] + (g.s[o + 4] - g.s[o + 1]) * k,
    a: g.s[o + 2] + wrap(g.s[o + 5] - g.s[o + 2]) * k,
    done: false,
  };
}

// is the new run better than the saved one? (shorter time or higher score
// wins; no saved run: yes)
export function betterGhost(saved, fresh) {
  if (!validGhost(fresh)) return false;
  if (!validGhost(saved)) return true;
  return fresh.hi ? fresh.total > saved.total : fresh.total < saved.total;
}

// --- storage: one key, one ghost per id ('kart', 'drift-<zone>') ---------------------------------
export const GHOST_KEY = 'gde-ghosts-v1';

function readAll(storage, key) {
  try {
    const o = JSON.parse(storage.getItem(key) || '{}');
    return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
  } catch { return {}; }
}

export function loadGhost(storage, id, key = GHOST_KEY) {
  const g = readAll(storage, key)[id];
  return validGhost(g) ? g : null;
}

// stores the run if it beats the saved one; returns true when it did
export function saveGhost(storage, id, fresh, key = GHOST_KEY) {
  try {
    const all = readAll(storage, key);
    if (!betterGhost(all[id], fresh)) return false;
    all[id] = fresh;
    storage.setItem(key, JSON.stringify(all));
    return true;
  } catch { return false; }
}
