// Jachthavens (#7): where finger piers and berths fit on a water polygon.
// Pure: the caller passes the polygon outline and a `clear(x, y, maxR)` that
// gives the distance to the nearest bank or obstacle in water (-1 outside it),
// in the game it is waterindex.waterClearance(map, ...). A marina is a row of
// finger piers set out from a quay edge; the boats lie between the fingers,
// bow to the quay. Nothing is planned where the fingers would reach into the
// fairway: the water beyond the tips must stay open for passing boats.
//
//   const plan = planMarina(poly.pts, (x, y, r) => waterClearance(map, x, y, r), { rng });
//   plan.fingers  [{ x0, y0, x1, y1 }]  pier centre lines, quay to tip
//   plan.berths   [{ x, y, angle, kind, len, wid }]  boat centre and heading (bow to the quay)
//   plan.quay     { ax, ay, bx, by, nx, ny }  the quay edge used (normal into the water)

// Invented marina names (no real clubs or harbours).
// (names: one per marina; scripts/world/marinas.mjs hands them out in order)
export const MARINA_NAMES = ['Jachthaven Zuiderstrand', 'Watersportvereniging De Kolk', 'Jachthaven Noorderhoek', 'Haven De Wiebelhoek', 'Jachthaven De Zwaan', 'Watersportvereniging Eendracht', 'Jachthaven Het Hoofd', 'Jachthaven De Brede Vaart']; // invented

// Pleasure craft that lie in a marina: kind (boattypes.js key), weight.
export const MARINA_FLEET = [['sloep', 34], ['sloepGrijs', 18], ['dinghy', 14], ['rubberboot', 8], ['kano', 10], ['waterfiets', 6], ['kajak', 10]];

const BERTH_GAP = 0.6;       // m between hull and finger pier
const FINGER_W = 0.9;        // m wide
const FAIRWAY = 9;           // m of open water that must remain beyond the tips
const MIN_QUAY = 14;         // shortest quay edge worth a marina (m)
const MAX_FINGERS = 14;

function pickKind(rng) {
  let tot = 0;
  for (const [, w] of MARINA_FLEET) tot += w;
  let r = rng() * tot;
  for (const [k, w] of MARINA_FLEET) { r -= w; if (r <= 0) return k; }
  return 'sloep';
}

// Dimensions of the marina kinds without importing boattypes (kept pure);
// planMarina takes `specs` ({ kind: { len, wid } }) to override.
const DEFAULT_SPECS = {
  sloep: { len: 5.5, wid: 2.0 }, sloepGrijs: { len: 5.8, wid: 2.1 }, dinghy: { len: 2.8, wid: 1.25 },
  rubberboot: { len: 3.4, wid: 1.6 }, kano: { len: 4.2, wid: 0.8 }, waterfiets: { len: 2.6, wid: 1.6 }, kajak: { len: 3.6, wid: 0.66 },
};

// Quay edges of a polygon, longest first, as { ax, ay, bx, by, len, nx, ny }
// with the normal pointing into the water (tested with `clear`).
export function quayEdges(pts, clear, minLen = MIN_QUAY) {
  const out = [];
  const n = pts.length;
  const last = pts[0][0] === pts[n - 1][0] && pts[0][1] === pts[n - 1][1] ? n - 1 : n;
  for (let i = 0; i < last; i++) {
    const a = pts[i], b = pts[(i + 1) % last];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < minLen) continue;
    const tx = (b[0] - a[0]) / len, ty = (b[1] - a[1]) / len;
    for (const s of [1, -1]) {
      const nx = -ty * s, ny = tx * s;
      const mx = (a[0] + b[0]) / 2 + nx * 1.5, my = (a[1] + b[1]) / 2 + ny * 1.5;
      if (clear(mx, my, 3) > 0) { out.push({ ax: a[0], ay: a[1], bx: b[0], by: b[1], len, nx, ny }); break; }
    }
  }
  return out.sort((p, q) => q.len - p.len);
}

// Plans one marina on the best quay edge of the polygon, or returns null when
// no edge has room for at least two berths. opts: rng, specs, blocked(x, y)
// (a bridge, a mission spot: those berths are skipped), fairway.
export function planMarina(pts, clear, opts = {}) {
  const rng = opts.rng || Math.random;
  const specs = opts.specs || DEFAULT_SPECS;
  const fairway = opts.fairway ?? FAIRWAY;
  const blocked = opts.blocked || (() => false);
  for (const q of quayEdges(pts, clear)) {
    const tx = (q.bx - q.ax) / q.len, ty = (q.by - q.ay) / q.len;
    const fingerLen = 7;       // long enough for a sloep, bow to the quay
    const pitch = 4.4;         // finger centre to finger centre: a berth plus a finger
    const fingers = [], berths = [];
    let first = null;
    for (let t = 1.5; t + pitch < q.len - 1.5 && fingers.length < MAX_FINGERS; t += pitch) {
      const fx = q.ax + tx * t, fy = q.ay + ty * t;
      const tx1 = fx + q.nx * fingerLen, ty1 = fy + q.ny * fingerLen;
      // water around the finger: the whole length open and the fairway beyond
      let ok = clear(tx1 + q.nx * fairway, ty1 + q.ny * fairway, fairway + 2) > 0 && !blocked(fx, fy) && !blocked(tx1, ty1);
      for (let d = 1.5; ok && d <= fingerLen; d += 1.5) {
        if (clear(fx + q.nx * d, fy + q.ny * d, 2) < FINGER_W / 2) ok = false;
      }
      if (!ok) { if (fingers.length >= 2) break; fingers.length = 0; berths.length = 0; first = null; continue; }
      fingers.push({ x0: fx, y0: fy, x1: tx1, y1: ty1 });
      if (first) {
        // the berth between this finger and the previous one
        const kind = pickKind(rng), sp = specs[kind] || DEFAULT_SPECS.sloep;
        const cx = (first.x0 + fx) / 2 + q.nx * (sp.len / 2 + 0.3), cy = (first.y0 + fy) / 2 + q.ny * (sp.len / 2 + 0.3);
        if (sp.wid + 2 * BERTH_GAP <= pitch - FINGER_W) berths.push({ x: cx, y: cy, angle: Math.atan2(-q.ny, -q.nx), kind, len: sp.len, wid: sp.wid });
      }
      first = fingers[fingers.length - 1];
    }
    if (berths.length >= 2) {
      return { name: MARINA_NAMES[Math.floor(rng() * MARINA_NAMES.length)], quay: q, fingers, berths };
    }
  }
  return null;
}
