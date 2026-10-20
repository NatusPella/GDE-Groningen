// The same water mapped twice (#231): OSM often has a lake both as a multipolygon and as natural=water (Hoeksmeer: two rows of
// 141 and 136 ha over each other), and the tile builder keeps both. Every water row is drawn as its own translucent mesh at
// the same height, so where two lie over each other the water is drawn twice: darker, and in noisy patches where the two
// triangulations disagree by a rounding error. A row that another row of the same kind, level and at least its navigability
// covers for the most part, and of about its size, adds nothing: dropWaterDuplicates returns those rows (the caller leaves them out).
// Pure: rows are { pts, kind, lv, nav, name } as the tiles hold them.

const COVER = 0.9;  // this share of the smaller row lies inside the bigger one
const RATIO = 0.6;  // and it is at least this share of the bigger one's area

function bounds(P) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of P) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
  return [x0, y0, x1, y1];
}
function area(P) {
  let a = 0;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) a += (P[j][0] + P[i][0]) * (P[j][1] - P[i][1]);
  return Math.abs(a / 2);
}
function inRing(x, y, P) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    if ((P[i][1] > y) !== (P[j][1] > y) && x < ((P[j][0] - P[i][0]) * (y - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) c = !c;
  }
  return c;
}

// the points of a row to test: a grid over its box that lies inside the row (at most GRID x GRID)
function samples(r, b) {
  const out = [], G = 9;
  for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) {
    const x = b[0] + ((i + 0.5) / G) * (b[2] - b[0]), y = b[1] + ((j + 0.5) / G) * (b[3] - b[1]);
    if (inRing(x, y, r.pts)) out.push([x, y]);
  }
  return out;
}

export function dropWaterDuplicates(rows) {
  const info = rows.map((r) => (r.pts && r.pts.length > 3 ? { r, b: bounds(r.pts), a: area(r.pts) } : null));
  const order = info.map((q, i) => i).filter((i) => info[i]).sort((p, q) => info[q].a - info[p].a);
  const dropped = new Set();
  for (let ai = 0; ai < order.length; ai++) {
    const big = info[order[ai]];
    if (dropped.has(big.r)) continue;
    for (let bi = ai + 1; bi < order.length; bi++) {
      const small = info[order[bi]];
      if (dropped.has(small.r) || small.a < RATIO * big.a) continue;
      const s = small.r, g = big.r;
      if (s.kind !== g.kind || s.lv !== g.lv || (s.nav || 0) > (g.nav || 0)) continue;
      if (small.b[0] > big.b[2] || small.b[2] < big.b[0] || small.b[1] > big.b[3] || small.b[3] < big.b[1]) continue;
      const pts = samples(s, small.b);
      if (pts.length < 8) continue;
      let inside = 0;
      for (const [x, y] of pts) if (inRing(x, y, g.pts)) inside++;
      if (inside / pts.length < COVER) continue;
      if (s.name && !g.name) g.name = s.name;
      dropped.add(s);
    }
  }
  return dropped;
}
