// #985 (overlap-audit 20-11): a world label (prompts.js) never lies over a HUD card, the minimap or the objective.
// Pure: given the label's rect (screen px) and the HUD rects it must stay clear of, how far must it move vertically?
// A label that hangs over a part of the top half moves under it, one over a part of the bottom half moves above it;
// a second obstacle on the way is handled in the next round (at most MAX_ROUNDS), and the label never leaves the window.
// node scripts/overlap_fixes_test.mjs
const MAX_ROUNDS = 3;
// px between the label and the HUD part it avoids; the cards carry a hard 4 px shadow, so 6 px read as touching (#1189, hertest 22-11)
export const CLEAR_GAP = 10;
const raakt0 = (a, o, tol = 2) => Math.min(a.right, o.right) - Math.max(a.left, o.left) > tol && Math.min(a.bottom, o.bottom) - Math.max(a.top, o.top) > tol;
// #1189: a label that ends just under (or above) a card, closer than the gap, also counts as in the way: it sat 1 to 2 px under the
// objective bar and read as glued to it. Only vertically: a label beside a card stays where it is.
const raakt = (a, o, gap = CLEAR_GAP) => raakt0(a, { left: o.left, right: o.right, top: o.top - gap + 1, bottom: o.bottom + gap - 1 });

// rect, obstacles: { left, top, right, bottom }; view: { w, h }. Returns dy in px (0 when nothing is in the way or no room).
export function labelDy(rect, obstacles, view, gap = CLEAR_GAP) {
  let r = { ...rect }, dy = 0;
  const h = rect.bottom - rect.top;
  for (let i = 0; i < MAX_ROUNDS; i++) {
    const o = obstacles.find((q) => raakt(r, q, gap));
    if (!o) return dy;
    const omhoog = (o.top + o.bottom) / 2 > view.h / 2; // an obstacle in the bottom half: go above it
    const top = omhoog ? o.top - gap - h : o.bottom + gap;
    if (top < 4 || top + h > view.h - 4) return dy === 0 ? 0 : dy; // no room: leave the label where it was
    dy += top - r.top;
    r = { left: r.left, right: r.right, top, bottom: top + h };
  }
  return obstacles.some((q) => raakt(r, q, gap)) ? 0 : dy; // still stuck after the last round: leave it
}

// A label whose anchor (the dot on the world target) lies under a board or panel (minigame board, choice panel) is hidden: the board speaks
// for itself and a leader line ending under it points at nothing. obstacles: { left, top, right, bottom }.
export function anchorCovered(x, y, boards, slack = 2) {
  return boards.some((b) => x > b.left - slack && x < b.right + slack && y > b.top - slack && y < b.bottom + slack);
}
