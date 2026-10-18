// The province and what lies round it, for the full map, the minimap and the
// HUD: which region a point is in (Groningen, Friesland, Drenthe, Duitsland,
// Waddenzee, Eems, Dollard, Noordzee), the sea as a polygon (OSM only has the
// coastline, so the sea itself has no water polygon), the outline and land
// borders to draw, and the name to show for any spot.
//
// Source: the province layer's outline and edge (index-provincie.json global,
// setRegionData); without it a coarse fallback (regiondata.js) from the same data.
import { worldToWgs, wgsToWorld } from './rdnew.js';
import { FALLBACK } from './regiondata.js';
import { MAP_PALETTE, seaStyle } from './mapstyle.js';
import { worldPlaceAt } from './worldplaces.js';
import { coastKinds, borderByData } from './worldedge.js';
import { setSeaClearance } from './waterindex.js';
import { createSeaClearance } from './seawater.js';

export const REGIONS = {
  groningen: { name: 'Groningen', land: true },
  friesland: { name: 'Friesland', land: true },
  drenthe: { name: 'Drenthe', land: true },
  duitsland: { name: 'Duitsland', land: true },
  waddenzee: { name: 'Waddenzee', land: false },
  eems: { name: 'Eems', land: false },
  dollard: { name: 'Dollard', land: false },
  noordzee: { name: 'Noordzee', land: false },
};

// where a region's name sits on the map (lat, lon); a label is only drawn
// where the region is really under it
export const REGION_ANCHORS = [
  { id: 'groningen', at: [53.2, 6.65], big: true },
  { id: 'friesland', at: [53.13, 6.1] },
  { id: 'drenthe', at: [52.93, 6.62] },
  { id: 'duitsland', at: [53.22, 7.26] },
  { id: 'waddenzee', at: [53.5, 6.45] },
  { id: 'noordzee', at: [53.65, 6.6] },
  { id: 'eems', at: [53.4, 6.98] },
  { id: 'dollard', at: [53.29, 7.1] },
];

const S = { outline: null, coast: null, islands: [], border: [], sea: null, seaBox: null, outlineBox: null, path: null };

const bboxOf = (P) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of P) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return [x0, y0, x1, y1];
};

function inRing(x, y, P, box) {
  if (box && (x < box[0] || x > box[2] || y < box[1] || y > box[3])) return false;
  let inside = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const xi = P[i][0], yi = P[i][1], xj = P[j][0], yj = P[j][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// the chain of the mainland coast from the layer's coast pieces: the longest
// run of pieces joined end to start, plus the closed ones as islands
function chainCoast(pieces) {
  const k = (p) => p[0] + ',' + p[1];
  const list = pieces.map((c) => c.pts.slice());
  for (let merged = true; merged;) {
    merged = false;
    for (let i = 0; i < list.length && !merged; i++) {
      for (let j = 0; j < list.length; j++) {
        if (i === j) continue;
        const a = list[i], b = list[j];
        if (k(a[a.length - 1]) === k(b[0])) { list[i] = a.concat(b.slice(1)); list.splice(j, 1); merged = true; break; }
      }
    }
  }
  const len = (a) => { let L = 0; for (let i = 1; i < a.length; i++) L += Math.hypot(a[i][0] - a[i - 1][0], a[i][1] - a[i - 1][1]); return L; };
  list.sort((a, b) => len(b) - len(a));
  const closed = (p) => k(p[0]) === k(p[p.length - 1]);
  return { coast: list[0] || null, islands: list.slice(1).filter((p) => closed(p) && len(p) > 2000) };
}

// The sea polygon: the mainland coast closed round the north of the map, and
// east where the data of the Dollard ends. Land is to the south of the chain.
function seaPolygon(coast) {
  if (!coast || coast.length < 2) return null;
  const a = coast[0], b = coast[coast.length - 1];
  const ea = a[0] >= b[0] ? a : b, we = a[0] >= b[0] ? b : a;
  const chain = a[0] >= b[0] ? coast : coast.slice().reverse();
  // east end -> west end along the coast, then round the north
  return chain.concat([[we[0] - 30000, we[1]], [we[0] - 30000, -80000], [ea[0] + 400, -80000], [ea[0] + 400, ea[1]]]);
}

// tileHas(x, y): is there a data tile there (the border turn-back keeps to it).
// layer: index-provincie.json global ({ outline, edge: { coast, border } }) or
// nothing for the fallback
export function setRegionData(layer, tileHas = null) {
  const have = layer && layer.outline && layer.outline.length && layer.edge && layer.edge.coast && layer.edge.coast.length;
  let outline, coast, islands, border;
  if (have) {
    outline = layer.outline.reduce((m, r) => (r.length > m.length ? r : m), []);
    const c = chainCoast(layer.edge.coast);
    coast = c.coast; islands = c.islands;
    border = (layer.edge.border || []).map((b) => ({ kind: b.kind, pts: b.pts }));
  } else {
    outline = FALLBACK.outline; coast = FALLBACK.coast; islands = FALLBACK.islands;
    border = FALLBACK.border;
  }
  S.outline = outline;
  S.outlineBox = bboxOf(outline);
  S.coast = coast;
  S.islands = islands;
  S.border = border;
  S.sea = seaPolygon(coast);
  S.seaBox = S.sea ? bboxOf(S.sea) : null;
  S.islandBoxes = islands.map(bboxOf);
  // boats sail the sea where the map has no water row (#233)
  setSeaClearance(S.sea ? createSeaClearance(seaAt, [coast].concat(islands)) : null);
  S.path = null;
  // the raw edge layer for worldedge.js / edgeguard.js (the Eems told apart from the Wadden)
  S.edgeLayer = have ? borderByData(coastKinds(layer.edge), tileHas) : null;
}
setRegionData(null);

// the raw edge layer ({ coast, border, seaM, airM }) for worldedge.js; null without the province layer
export const regionEdgeLayer = () => S.edgeLayer || null;
export const seaRing = () => S.sea;

export function seaAt(x, y) {
  if (!S.sea || !inRing(x, y, S.sea, S.seaBox)) return false;
  for (let i = 0; i < S.islands.length; i++) if (inRing(x, y, S.islands[i], S.islandBoxes[i])) return false;
  return true;
}

function landKind(la, lo) {
  if (lo > 7.0 && la < 53.4) return 'duitsland';
  if (lo < 6.37 || (la > 53.2 && lo < 6.45)) return 'friesland';
  return 'drenthe';
}

// The region of a point: { id, name, land }.
export function regionAt(x, y) {
  const inside = inRing(x, y, S.outline, S.outlineBox);
  const [la, lo] = worldToWgs(x, y);
  let id;
  if (seaAt(x, y)) {
    if (lo > 7.0 && la < 53.31) id = 'dollard';
    else if (lo > 6.78 && la < 53.5) id = 'eems';
    else id = la > 53.53 ? 'noordzee' : 'waddenzee';
  } else if (inside) id = 'groningen';
  else if (la > 53.4 && lo > 6.1) id = la > 53.53 ? 'noordzee' : 'waddenzee';
  else id = landKind(la, lo);
  const r = REGIONS[id];
  return { id, name: r.name, land: r.land };
}

// The name to show for a spot: { name, sub, region, near } - the place (and its
// district) where one is near, else the region's name; the sea by its own name.
export function areaNameAt(x, y) {
  const r = regionAt(x, y);
  if (!r.land) return { name: r.name, sub: '', region: r.id, near: false };
  const w = worldPlaceAt(x, y);
  const open = r.id === 'groningen' ? 'Ommeland' : r.name;
  if (w && w.place && !w.near) {
    return { name: w.district || w.place, sub: w.district ? w.place : r.id === 'groningen' ? '' : r.name, region: r.id, near: false };
  }
  // out in the open: the region, with the place it lies near
  return { name: open, sub: w && w.place ? `bij ${w.place}` : '', region: r.id, near: true };
}

// A Path2D of the sea (islands cut out), built once.
export function seaPath() {
  if (S.path || typeof Path2D === 'undefined' || !S.sea) return S.path;
  const p = new Path2D();
  const ring = (P) => { p.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) p.lineTo(P[i][0], P[i][1]); p.closePath(); };
  ring(S.sea);
  for (const I of S.islands) ring(I);
  S.path = p;
  return p;
}

// The land and sea outside the province as a Path2D (even-odd): a frame round
// the outline, over which the map lays its tint.
export function outsidePath(frame) {
  if (typeof Path2D === 'undefined') return null;
  const p = new Path2D();
  const [x0, y0, x1, y1] = frame;
  p.rect(x0, y0, x1 - x0, y1 - y0);
  const O = S.outline;
  p.moveTo(O[0][0], O[0][1]);
  for (let i = 1; i < O.length; i++) p.lineTo(O[i][0], O[i][1]);
  p.closePath();
  return p;
}

const BORDER_COLOR = { friesland: '#e8b04a', drenthe: '#c9a0e0', duitsland: '#e86a5a' };
const { fill: SEA_FILL, edge: SEA_EDGE } = seaStyle(MAP_PALETTE);
const TINT = 'rgba(4, 8, 12, 0.5)';

// Under the map's vectors, world-transformed: the sea (the land colour
// shows round the islands) with the shore line. px(n): n screen pixels in metres.
export function drawSea(ctx, px, { fill = SEA_FILL, edge = SEA_EDGE } = {}) {
  const p = seaPath();
  if (!p) return;
  ctx.save();
  ctx.fillStyle = fill;
  ctx.fill(p, 'evenodd');
  ctx.restore();
  if (S.coast) {
    ctx.save();
    ctx.strokeStyle = edge;
    ctx.lineWidth = px(1.2);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(S.coast[0][0], S.coast[0][1]);
    for (let i = 1; i < S.coast.length; i++) ctx.lineTo(S.coast[i][0], S.coast[i][1]);
    ctx.stroke();
    for (const I of S.islands) {
      ctx.beginPath();
      ctx.moveTo(I[0][0], I[0][1]);
      for (let i = 1; i < I.length; i++) ctx.lineTo(I[i][0], I[i][1]);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// Over the map's vectors, world-transformed: the outside of the province
// darker, and the land borders as a line in the colour of the region beyond.
// frame: the world box the tint covers. px(n): n screen pixels in metres.
export function drawOutside(ctx, frame, px, { tint = TINT, border = true, width = 2.2 } = {}) {
  const [x0, y0, x1, y1] = frame;
  ctx.save();
  ctx.fillStyle = tint;
  const p = outsidePath(frame);
  if (p) ctx.fill(p, 'evenodd');
  if (border) {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const L of S.border) {
      ctx.beginPath();
      ctx.moveTo(L.pts[0][0], L.pts[0][1]);
      for (let i = 1; i < L.pts.length; i++) ctx.lineTo(L.pts[i][0], L.pts[i][1]);
      ctx.strokeStyle = 'rgba(12, 20, 14, 0.75)';
      ctx.lineWidth = px(width + 2);
      ctx.stroke();
      ctx.strokeStyle = BORDER_COLOR[L.kind] || '#e8e4d8';
      ctx.setLineDash([px(width * 4), px(width * 2.2)]);
      ctx.lineWidth = px(width);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  ctx.restore();
}

// Region names to write on a screen: [{ id, name, x, y }] in world units, the
// anchor of each region that has ground in the window (clamped to the window
// when its anchor lies outside it). Screen code does the drawing.
export function regionLabels(x0, y0, x1, y1, margin = 0) {
  const out = [];
  const mx = (x1 - x0) * margin, my = (y1 - y0) * margin;
  for (const a of REGION_ANCHORS) {
    const [ax, ay] = anchorWorld(a);
    const x = Math.min(Math.max(ax, x0 + mx), x1 - mx), y = Math.min(Math.max(ay, y0 + my), y1 - my);
    // the region must really be under the (possibly clamped) point
    if (regionAt(x, y).id !== a.id) continue;
    out.push({ id: a.id, name: REGIONS[a.id].name, x, y, big: !!a.big, land: REGIONS[a.id].land });
  }
  return out;
}

const anchorCache = new Map();
function anchorWorld(a) {
  let w = anchorCache.get(a.id);
  if (!w) { w = wgsToWorld(a.at[0], a.at[1]); anchorCache.set(a.id, w); }
  return w;
}
