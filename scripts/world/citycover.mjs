// Where the city map actually has data: its roads, buildings, water and trees
// on a 40 m grid, gaps closed and holes filled (the same rule as countryedge.js
// buildMask, which the ground shader uses for the edge of the city's data).
// build_province.mjs fills the city tiles' empty parts from the province's own
// data: only what lies outside this cover goes into those overlay tiles.
//   buildCityCover(map) -> { inside(x, y), tileShare(i, j), mask() }
//   cityCoverFromMask(mask) -> hetzelfde, uit het masker in stad.json (de kaartlagen zelf zijn er dan niet meer)
import * as G from '../../game/js/gdt.js';

const CELL = 40, MARGIN = 520, R = 3;

export function buildCityCover(map) {
  const B = map.meta.bounds;
  const x0 = B[0] - MARGIN, y0 = B[1] - MARGIN;
  const w = Math.ceil((B[2] - B[0] + MARGIN * 2) / CELL), h = Math.ceil((B[3] - B[1] + MARGIN * 2) / CELL);
  let occ = new Uint8Array(w * h);
  const mark = (x, y) => {
    const i = Math.floor((x - x0) / CELL), j = Math.floor((y - y0) / CELL);
    if (i >= 0 && j >= 0 && i < w && j < h) occ[j * w + i] = 1;
  };
  const line = (P) => {
    for (let k = 1; k < P.length; k++) {
      const a = P[k - 1], b = P[k];
      const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 25));
      for (let t = 0; t <= n; t++) mark(a[0] + ((b[0] - a[0]) * t) / n, a[1] + ((b[1] - a[1]) * t) / n);
    }
  };
  for (const r of map.roads) line(r.pts);
  for (const b of map.buildings || []) {
    const q = b.bounds;
    if (!q) continue;
    mark(q[0], q[1]); mark(q[2], q[3]); mark(q[0], q[3]); mark(q[2], q[1]); mark((q[0] + q[2]) / 2, (q[1] + q[3]) / 2);
  }
  for (const q of map.water || []) if (q.pts) line(q.pts);
  for (const t of map.trees || []) { const p = t.pts ? t.pts[0] : t; if (p && p.length >= 2) mark(p[0], p[1]); }
  // close gaps (parks, fields inside town): dilate, then erode
  const morph = (src, keep) => {
    const out = new Uint8Array(w * h);
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        let v = keep ? 1 : 0;
        for (let dj = -R; dj <= R && v === (keep ? 1 : 0); dj++) {
          for (let di = -R; di <= R; di++) {
            if (di * di + dj * dj > R * R) continue;
            const ii = i + di, jj = j + dj;
            const s2 = ii < 0 || jj < 0 || ii >= w || jj >= h ? 0 : src[jj * w + ii];
            if (keep ? !s2 : s2) { v = keep ? 0 : 1; break; }
          }
        }
        out[j * w + i] = v;
      }
    }
    return out;
  };
  occ = morph(morph(occ, false), true);
  // fill the enclosed holes: what the outside cannot reach is inside
  const seen = new Uint8Array(w * h), stack = [];
  for (let i = 0; i < w; i++) stack.push(i, (h - 1) * w + i);
  for (let j = 0; j < h; j++) stack.push(j * w, j * w + w - 1);
  while (stack.length) {
    const k = stack.pop();
    if (seen[k] || occ[k]) continue;
    seen[k] = 1;
    const i = k % w, j = (k - i) / w;
    if (i > 0) stack.push(k - 1);
    if (i < w - 1) stack.push(k + 1);
    if (j > 0) stack.push(k - w);
    if (j < h - 1) stack.push(k + w);
  }
  for (let k = 0; k < w * h; k++) if (!seen[k]) occ[k] = 1;
  return coverOf({ x0, y0, w, h, cell: CELL, occ });
}

// De dekking uit een grid (x0, y0, w, h, cell, occ) of uit het opgeslagen masker (stad.json: cover).
function coverOf({ x0, y0, w, h, cell, occ }) {
  const inside = (x, y) => {
    const i = Math.floor((x - x0) / cell), j = Math.floor((y - y0) / cell);
    return i >= 0 && j >= 0 && i < w && j < h && occ[j * w + i] === 1;
  };
  // the share of tile (i, j) the cover holds (a 25 x 25 sample)
  const tileShare = (i, j) => {
    const [ox, oy] = G.tileOrigin(i, j);
    let n = 0;
    for (let a = 0; a < 25; a++) for (let b = 0; b < 25; b++) if (inside(ox + (a + 0.5) * 40, oy + (b + 0.5) * 40)) n++;
    return n / 625;
  };
  // het masker als run-lengtes (om en om 0 en 1, te beginnen met 0): klein genoeg voor stad.json
  const mask = () => {
    const rle = [];
    let cur = 0, run = 0;
    for (let k = 0; k < occ.length; k++) { if (occ[k] === cur) run++; else { rle.push(run); cur = occ[k]; run = 1; } }
    rle.push(run);
    return { x0, y0, w, h, cell, rle };
  };
  return { inside, tileShare, mask };
}

// buildCityCover(map).mask() opgeslagen in stad.json (scripts/world/stad_split.mjs): dezelfde dekking, zonder de kaart
export function cityCoverFromMask(m) {
  const occ = new Uint8Array(m.w * m.h);
  let k = 0, v = 0;
  for (const n of m.rle) { if (v) occ.fill(1, k, k + n); k += n; v ^= 1; }
  return coverOf({ x0: m.x0, y0: m.y0, w: m.w, h: m.h, cell: m.cell, occ });
}
