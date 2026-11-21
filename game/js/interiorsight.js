// Looking into an interior from outside (epic Interieurs, #1150, round 4). The windows of the facade are cut open, so from the street
// you see the people through the glass. Everything that is NOT seen through a window or the door is behind a wall: those figures
// are hidden (no draw call, no animation) while the player is outside, so the look-in costs nothing extra: at most the figures
// that really show, never more than the budget. Pure: the plan (windows, door) and positions in the frame of the door in, a verdict out.

export const SIGHT_MARGIN = 0.12; // m: a person half behind the frame still counts as seen
export const MAX_SEEN = 8;        // the people budget of an interior (interiors.js MAX_NPC): what can ever be drawn

// the spans [a, b] along u of the openings in the front wall (v = 0): the door and every window that is cut open
export function sightSpans(plan) {
  const spans = [];
  const dw = plan.door ? plan.door.w / 2 : 0.6;
  spans.push([-dw, dw]);
  for (const wd of plan.windows || []) {
    const u = wd.c - (plan.doorC || 0);
    const a = Math.max(plan.hall.u0 + 0.05, u - wd.w / 2), c = Math.min(plan.hall.u1 - 0.05, u + wd.w / 2);
    if (c - a >= 0.3 && wd.y1 - wd.y0 >= 0.3) spans.push([a, c]);
  }
  return spans;
}

// does the sight line from the eye (pu, pv; pv < 0 is outside) to the person (u, v inside the hall) pass through an opening?
export function seenThrough(spans, pu, pv, u, v) {
  if (pv >= 0) return true; // inside the room: everything in it
  if (v <= pv) return false;
  const t = (0 - pv) / (v - pv), cu = pu + (u - pu) * t; // where the line crosses the front wall
  for (const s of spans) if (cu >= s[0] - SIGHT_MARGIN && cu <= s[1] + SIGHT_MARGIN) return true;
  return false;
}
