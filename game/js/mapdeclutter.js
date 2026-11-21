// Declutter of the map's places per zoom (21-11, docs/KAART-DECLUTTER-21-11.md). Node-safe, no DOM.
// One rule set for the full map: which kinds of place show how many at a zoom, so that the city
// centre is not flooded with food places at zoom 6. Three parts:
//   - poiRules(zoom): the numbers per zoom (cell size of a cluster, maximum per viewport, the maximum of all pins);
//   - planHoreca(): clusters the food places on a grid anchored in the WORLD (so panning never reshuffles
//     them), merges what lies closer than the minimum distance, keeps the biggest clusters up to the maximum;
//   - capPins(): the maximum of all pins in the viewport: the highest priority wins, the kept kinds never go.
// The layer switches (mapfilters.js) and the zoom from which a category shows (mapstyle.js ICON_MIN_ZOOM)
// stay as they are: this file only thins what those let through. Collision between two icons stays in
// mapicons.js (placeIcons: the higher priority wins).
import { isKeptKind, mapPriority } from './mapicons.js';

// anchors per zoom: [zoom, cell of a cluster in px, food places per viewport, all pins per viewport].
// Between two anchors the values are interpolated, so nothing jumps. Below the zoom where the food layer
// starts (ICON_MIN_ZOOM.horeca = 6) the food count is 0.
const ANCHORS = [
  [0.55, 0, 0, 40],
  [2, 0, 0, 50],
  [4, 0, 0, 65],
  [5.99, 0, 0, 69],
  [6, 96, 12, 70],
  [7, 84, 18, 74],
  [8, 68, 26, 78],
  [10, 52, 40, 80],
  [12, 44, 56, 80],
];
export const MAX_PINS_ABSOLUTE = 80;

const lerp = (a, b, f) => a + (b - a) * f;

// the rules at a zoom (continuous): { cellPx, horecaMax, maxPins }
export function poiRules(zoom) {
  const z = Math.max(ANCHORS[0][0], Math.min(ANCHORS[ANCHORS.length - 1][0], Number.isFinite(zoom) ? zoom : 1));
  let i = 0;
  while (i < ANCHORS.length - 2 && z > ANCHORS[i + 1][0]) i++;
  const [z0, c0, h0, m0] = ANCHORS[i], [z1, c1, h1, m1] = ANCHORS[i + 1];
  const f = (z - z0) / (z1 - z0);
  return { cellPx: lerp(c0, c1, f), horecaMax: Math.round(lerp(h0, h1, f)), maxPins: Math.round(lerp(m0, m1, f)) };
}

// the zoom in steps of a quarter octave: the grid of the clusters follows the step, not every frame
export function zoomBucket(zoom) {
  return 2 ** (Math.round(Math.log2(Math.max(0.01, zoom)) * 4) / 4);
}

// fade-in just after a category's minimum zoom (0.35 up to 1), so a layer does not pop on
export function fadeIn(zoom, minZoom, span = 0.12) {
  if (!(minZoom > 0)) return 1;
  return Math.max(0.35, Math.min(1, 0.35 + 0.65 * (zoom - minZoom) / (minZoom * span)));
}

// grid clusters, anchored at world (0, 0): [{ x, y, n, first }] sorted on grid cell, so the same input gives the
// same output. A cluster's x and y are the mean of its places; `first` is the first place (its name, for n = 1).
export function clusterGrid(spots, cellM) {
  const cells = new Map();
  // sorted first: the same places in another order give the same clusters (and the same float sums)
  const sorted = spots.filter((s) => Number.isFinite(s.x) && Number.isFinite(s.y)).sort((a, b) => a.x - b.x || a.y - b.y || String(a.name || '').localeCompare(String(b.name || '')));
  for (const s of sorted) {
    const gx = Math.floor(s.x / cellM), gy = Math.floor(s.y / cellM);
    const key = gx * 100003 + gy;
    const c = cells.get(key);
    if (c) { c.sx += s.x; c.sy += s.y; c.n++; } else cells.set(key, { key, sx: s.x, sy: s.y, n: 1, first: s });
  }
  return [...cells.values()].sort((a, b) => a.key - b.key).map((c) => ({ x: c.sx / c.n, y: c.sy / c.n, n: c.n, first: c.first }));
}

// merge clusters that lie closer than minM into the bigger one (centre to centre, metres); the biggest first
export function mergeClose(clusters, minM) {
  const order = clusters.map((c, i) => ({ c, i })).sort((a, b) => b.c.n - a.c.n || a.i - b.i);
  const kept = [];
  for (const { c } of order) {
    let near = null, nd = minM * minM;
    for (const k of kept) {
      const d2 = (k.x - c.x) ** 2 + (k.y - c.y) ** 2;
      if (d2 < nd) { nd = d2; near = k; }
    }
    if (near) near.n += c.n; // the bigger cluster keeps its place, so the kept ones stay minM apart
    else kept.push({ ...c });
  }
  return kept;
}

// The food places to draw: [{ x, y, n, first }] (n = 1: a place of its own, n > 1: a cluster with a count).
// view: { zoom, scale (px per metre now), x0, y0, x1, y1 (world rectangle of the viewport) }.
// The planner remembers the clusters per zoom step and the last plan per view: no work in a frame where
// nothing moved or zoomed (#declutter: no recalculation per frame).
export function createHorecaPlanner() {
  let src = null, srcLen = -1, bucketKey = null, clusters = null;
  let lastKey = null, lastPlan = [];
  return function plan(spots, view) {
    const rules = poiRules(view.zoom);
    if (!spots || !spots.length || rules.horecaMax <= 0 || !(rules.cellPx > 0)) return [];
    const zb = zoomBucket(view.zoom);
    const scaleB = view.scale * (zb / view.zoom);
    const cellM = rules.cellPx / scaleB;
    const viewKey = [view.zoom, view.x0, view.y0, view.x1, view.y1].map((v) => Math.round(v * 100)).join(',');
    const key = `${zb}|${viewKey}|${rules.horecaMax}`;
    if (src === spots && srcLen === spots.length && key === lastKey) return lastPlan;
    const cKey = `${zb}|${Math.round(cellM * 100)}`;
    if (src !== spots || srcLen !== spots.length || cKey !== bucketKey) {
      src = spots; srcLen = spots.length; bucketKey = cKey;
      clusters = clusterGrid(spots, cellM);
    }
    const margin = cellM;
    const inView = clusters.filter((c) => c.x >= view.x0 - margin && c.x <= view.x1 + margin && c.y >= view.y0 - margin && c.y <= view.y1 + margin);
    const merged = mergeClose(inView, cellM * 0.7);
    // the biggest groups first; of equal size the one nearest the middle of the view (no bias to one side)
    const mx = (view.x0 + view.x1) / 2, my = (view.y0 + view.y1) / 2;
    const dm = (c) => (c.x - mx) ** 2 + (c.y - my) ** 2;
    merged.sort((a, b) => b.n - a.n || dm(a) - dm(b) || a.x - b.x || a.y - b.y);
    lastKey = key;
    lastPlan = merged.slice(0, rules.horecaMax);
    return lastPlan;
  };
}

// The maximum of pins in the viewport: the kept kinds always stay, of the rest the highest priority wins
// (a tie: the earlier one). `placed` is what placeIcons returned (lowest priority first); the order is kept.
export function capPins(placed, max) {
  const loose = placed.filter((q) => !isKeptKind(q.kind));
  if (loose.length <= max) return placed;
  const rank = loose.map((q, i) => ({ q, i, pri: mapPriority(q.kind) })).sort((a, b) => b.pri - a.pri || a.i - b.i);
  const keep = new Set(rank.slice(0, Math.max(0, max)).map((r) => r.q));
  return placed.filter((q) => isKeptKind(q.kind) || keep.has(q));
}
