// What lies beyond the edge of the province on the maps (#237): where the
// region names (Friesland, Drenthe, Duitsland, the seas) go along the border
// lines that are in view, and which neighbour villages (game/borderplaces.json)
// get a dimmed label. Pure: the border lines, the coast and the region lookup
// come in as arguments (regions.js), so scripts/mapedge_test.mjs needs no map.

const inBox = (p, [x0, y0, x1, y1]) => p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1;

// The side of the point `i` of a line where `ok(x, y)` holds, `off` m away from
// the line: { x, y } or null when neither side does.
function sidePoint(pts, i, off, ok) {
  const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
  const nx = -dy / l, ny = dx / l;
  for (const s of [1, -1]) {
    const x = pts[i][0] + nx * off * s, y = pts[i][1] + ny * off * s;
    if (ok(x, y)) return { x, y };
  }
  return null;
}

// One label per region whose border (or, for a sea, the coast) is in the
// window [x0, y0, x1, y1]: it sits at the visible point of the line nearest to
// the window centre, `off` m outside the line, on the side of that region.
//   edges: { border: [{ kind, pts }], coast: [[x, y], ...] }
//   regionAt(x, y) -> { id, name, land }
export function edgeLabels(edges, win, regionAt, off) {
  const [x0, y0, x1, y1] = win;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const best = new Map(); // region id -> { d, label }
  const consider = (pts, kindOf) => {
    for (let i = 0; i < pts.length; i++) {
      if (!inBox(pts[i], win)) continue;
      const d = Math.hypot(pts[i][0] - cx, pts[i][1] - cy);
      const p = sidePoint(pts, i, off, (x, y) => {
        const r = regionAt(x, y);
        return r.id !== 'groningen' && (kindOf === null || r.id === kindOf) && inBox([x, y], win);
      });
      if (!p) continue;
      const r = regionAt(p.x, p.y);
      const cur = best.get(r.id);
      if (!cur || d < cur.d) best.set(r.id, { d, label: { id: r.id, name: r.name, x: p.x, y: p.y, land: r.land, edge: true } });
    }
  };
  for (const L of edges.border || []) consider(L.pts, L.kind);
  if (edges.coast && edges.coast.length > 1) consider(edges.coast, null);
  return [...best.values()].map((v) => v.label);
}

// The neighbour villages of borderplaces.json as { name, kind, x, y, region }:
// only those that lie in another region than Groningen and on land (the file
// covers a rectangle, the province itself and some sea included).
//   rows: [[name, kind, lat, lon]], toWorld(lat, lon) -> [x, y]
export function neighbourPlaces(rows, toWorld, regionAt) {
  const out = [];
  for (const row of rows || []) {
    if (!Array.isArray(row) || row.length < 4 || typeof row[0] !== 'string') continue;
    const [x, y] = toWorld(row[2], row[3]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const r = regionAt(x, y);
    if (!r.land || r.id === 'groningen') continue;
    out.push({ name: row[0], kind: row[1], x, y, region: r.id });
  }
  return out;
}

// By zoom, as worldplaces.js has it for the province: cities and towns always,
// villages from 0.8.
export function neighbourVisible(place, zoom) {
  return place.kind === 'city' || place.kind === 'town' ? true : zoom >= 0.8;
}

// Which neighbour places get a label in the window, nearest the centre first,
// at most `max`, none closer than `gap` (in the same unit as the positions)
// to a label already placed (`taken`: [[x, y], ...] positions of other labels).
export function pickNeighbours(places, win, taken, { max = 12, gap = 1500, zoom = 1 } = {}) {
  const [x0, y0, x1, y1] = win;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const rank = (p) => (p.kind === 'city' ? 0 : p.kind === 'town' ? 1 : 2);
  const list = places.filter((p) => inBox([p.x, p.y], win) && neighbourVisible(p, zoom))
    .sort((a, b) => rank(a) - rank(b) || Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
  const placed = [...taken];
  const out = [];
  for (const p of list) {
    if (out.length >= max) break;
    if (placed.some((q) => Math.hypot(q[0] - p.x, q[1] - p.y) < gap)) continue;
    placed.push([p.x, p.y]);
    out.push(p);
  }
  return out;
}
