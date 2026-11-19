// AudioParam-events only when something changes (prestatie): setTargetAtTime every frame for a value that did not move
// floods the audio thread with automation events. The decision logic is pure so it can be tested without a context.

export const PARAM_EPS = 1e-4;

// last: the value written before (undefined: never), next: the wanted one. A real zero is always written (a fade-out
// must end at silence, not at 0.00009).
export function shouldWriteParam(last, next, eps = PARAM_EPS) {
  if (last === undefined) return true;
  if (next === last) return false;
  if (next === 0) return true;
  return Math.abs(next - last) > eps;
}

// One memory per owner (WeakMap on the AudioParam: a new context brings new params and so a clean slate).
export function createParamMemo() {
  const last = new WeakMap();
  const stats = { written: 0, skipped: 0 };
  return {
    stats,
    set(param, value, t, tau, eps = PARAM_EPS) {
      if (!shouldWriteParam(last.get(param), value, eps)) { stats.skipped++; return false; }
      last.set(param, value);
      param.setTargetAtTime(value, t, tau);
      stats.written++;
      return true;
    },
    // after something else wrote the param (value =, cancelScheduledValues)
    forget(param) { last.delete(param); },
  };
}

// The listener only needs new automation when its pose really changed: positions in metres, directions as unit vectors.
// prev: { pos: [x, y, z], fwd, up } or null. Returns true when any component moved more than the epsilon.
export function listenerMoved(prev, px, py, pz, fwd, up, posEps = 0.002, dirEps = 0.0005) {
  if (!prev) return true;
  return Math.abs(prev.pos[0] - px) > posEps || Math.abs(prev.pos[1] - py) > posEps || Math.abs(prev.pos[2] - pz) > posEps
    || Math.abs(prev.fwd[0] - fwd[0]) > dirEps || Math.abs(prev.fwd[1] - fwd[1]) > dirEps || Math.abs(prev.fwd[2] - fwd[2]) > dirEps
    || Math.abs(prev.up[0] - up[0]) > dirEps || Math.abs(prev.up[1] - up[1]) > dirEps || Math.abs(prev.up[2] - up[2]) > dirEps;
}
