// Pure controller logic (no DOM, node-safe): dode zone, welke pad speler 1
// bedient en de richtingsnavigatie voor menu's. gamepad.js gebruikt dit;
// scripts/padlogic_test.mjs test het zonder echte controller (#151).

export const DEAD = 0.2;

// Radiale dode zone: onder `dead` niets, daarboven stijgt de uitslag weer vanaf 0.
export function radialDeadzone(x, y, dead = DEAD) {
  const m = Math.hypot(x, y);
  if (!(m >= dead)) return [0, 0];
  const k = Math.min(1, (m - dead) / (1 - dead)) / m;
  return [x * k, y * k];
}

// Welke pad speler 1 bedient. pads: [{ index, connected, active }] (active =
// er is nu invoer). Standaard volgt de laatst gebruikte pad; met `sticky`
// (coöp) blijft speler 1 bij zijn pad zolang die verbonden is, zodat
// speler 2 hem niet kaapt. Geeft -1 als er geen is.
export function pickPad(pads, current, { sticky = false } = {}) {
  const live = pads.filter((p) => p && p.connected);
  if (!live.length) return -1;
  const cur = live.find((p) => p.index === current);
  if (cur && (sticky || cur.active)) return cur.index;
  const act = live.find((p) => p.active);
  if (act && !sticky) return act.index;
  if (cur) return cur.index;
  return (act || live[0]).index;
}

// Richtingsnavigatie door rechthoeken {x, y, w, h}: de dichtstbijzijnde in de
// gevraagde richting ('up'|'down'|'left'|'right'), zwaarder gestraft voor
// zijwaartse afstand. Geeft de index, of -1 als er niets in die richting ligt.
// from < 0: de bovenste, meest linkse.
export function spatialNext(rects, from, dir) {
  if (!rects.length) return -1;
  if (from < 0 || from >= rects.length) {
    let best = 0;
    rects.forEach((r, i) => { const b = rects[best]; if (r.y < b.y - 1 || (Math.abs(r.y - b.y) <= 1 && r.x < b.x)) best = i; });
    return best;
  }
  const a = rects[from];
  const ax = a.x + a.w / 2, ay = a.y + a.h / 2;
  const horiz = dir === 'left' || dir === 'right';
  const sign = dir === 'left' || dir === 'up' ? -1 : 1;
  let best = -1, bestCost = Infinity;
  rects.forEach((r, i) => {
    if (i === from) return;
    const dx = r.x + r.w / 2 - ax, dy = r.y + r.h / 2 - ay;
    const along = (horiz ? dx : dy) * sign;
    if (along <= 0.5) return;
    let across = Math.abs(horiz ? dy : dx);
    // overlappen ze zijwaarts, dan telt het scheef liggen niet mee
    const overlap = horiz ? Math.min(a.y + a.h, r.y + r.h) - Math.max(a.y, r.y) : Math.min(a.x + a.w, r.x + r.w) - Math.max(a.x, r.x);
    if (overlap > 0) across = 0;
    const cost = along + across * 2.5;
    if (cost < bestCost) { bestCost = cost; best = i; }
  });
  return best;
}
