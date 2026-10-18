// The bridges a boat meets on its heading (#180): the live source of the boat
// layer in missionmap.js. Pure: the caller hands in the clearance query
// (waterlevels.clearanceOver), so the test needs no map.

// Samples the clearance every `step` m along the heading up to `reach` m.
// Neighbouring samples under a deck are one bridge, placed at its lowest
// sample; a sample with no deck (Infinity) or an open bridge ends it.
export function bridgesAhead(boat, clearanceAt, { reach = 240, step = 12 } = {}) {
  const out = [];
  let run = null;
  const flush = () => { if (run) out.push(run); run = null; };
  const c = Math.cos(boat.angle), s = Math.sin(boat.angle);
  for (let d = step; d <= reach; d += step) {
    const x = boat.x + c * d, y = boat.y + s * d;
    const clearance = clearanceAt(x, y);
    if (!Number.isFinite(clearance)) { flush(); continue; }
    if (!run) run = { x, y, clearance, name: 'Brug' };
    else if (clearance < run.clearance) { run.x = x; run.y = y; run.clearance = clearance; }
  }
  flush();
  return out;
}
