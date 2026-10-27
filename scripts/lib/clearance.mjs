// The placement rule of scripts/clearance_audit.mjs (#494): does this point on a
// viaduct deck lie over the carriageway of a lane, or only over the pavement or
// verge beside it? elevation.surfaceHalfWidth adds 1.8 m of pavement to a street
// width, which made a narrow footbridge deck next to a road look like a passage
// over that road. We take the narrowest of the old rule (the deck above the lane's
// axis) and the paved part (width / 2), so a passage narrower than the lane only
// counts over the paved part.

// Free height the audit asks under a deck over a cycle path or footway, the
// default of clearance_audit --min-path (the design rule is 2.5 m:
// roadprofile.js CLEARANCE).
export const MIN_PATH = 2.4;

// Distance from a point to a lane's axis (the nearest point on its segment).
export function axisDistance(x, y, lane) {
  const dx = lane.bx - lane.ax, dy = lane.by - lane.ay;
  const l2 = dx * dx + dy * dy || 1;
  const u = Math.max(0, Math.min(1, ((x - lane.ax) * dx + (y - lane.ay) * dy) / l2));
  return Math.hypot(x - (lane.ax + dx * u), y - (lane.ay + dy * u));
}

export function laneUnderDeck(x, y, lane, deckHalf) {
  const paved = Number.isFinite(lane.r && lane.r.width) ? lane.r.width / 2 : lane.hs;
  return axisDistance(x, y, lane) <= Math.min(paved, Math.max(lane.hs - deckHalf, 0.5));
}

// The path variant (#510): a deck can hang with its edge over the axis of a cycle
// path or footway that runs beside the carriageway, outside the narrow band
// laneUnderDeck counts, and a cyclist still rides under it. The path's own axis
// under the deck's span (within its half width) makes it a passage for that path.
export function pathUnderDeck(x, y, lane, deckHalf) {
  const cat = lane.r && lane.r.cat;
  if (cat !== 'cycle' && cat !== 'foot') return false;
  return axisDistance(x, y, lane) <= deckHalf;
}
