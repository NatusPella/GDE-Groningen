// What the city's map derives from raw OSM rows, for the province's packs
// (docs/ARCHITECTUUR-STAD-NAAR-TEGELS.md A2): the same code the GameMap
// constructor runs (game/js/derive.js, passages.js) over one pack's features,
// before they are cut into tiles.
//
//   clearance   footprints kept 1.5 m from the centreline of a ground-level
//               car road (building_clearance.mjs, issue #77)
//   derive      doubled footprints merged, platform roofs and building=roof
//               as canopies, bridge machinery and footprints on a ring
//               carriageway dropped, houseboats moored
//   roof steps  a footprint inside another of the same height lifts 0.4 m
//   waterways   a canal or river of unmapped width (a guess of 14 / 10 m) is
//               narrowed, down to 3 m, where a footprint stands on the bank
//               (issue #124: farms in the water)
//   clipped     footways and cycleways through a solid block end at its
//               facade (passages.js clipWaysInBuildings)
//
// The city path is not touched: pack_tiles.mjs still reads the GameMap.
import { deriveBuildings, liftNestedRoofs } from '../../game/js/derive.js';
import { SpatialGrid } from '../../game/js/spatialgrid.js';
import { clipWaysInBuildings } from '../../game/js/passages.js';
import { polygonBounds } from '../../game/js/util.js';
import { clearFootprints } from './building_clearance.mjs';

const MIN_HW = 1.5; // a trimmed waterway stays 3 m wide
const BANK = 0.6; // and keeps this far from a footprint

const segDist2 = (x, y, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-9;
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2));
  return (a[0] + dx * t - x) ** 2 + (a[1] + dy * t - y) ** 2;
};
const inRing = (x, y, P) => {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    if ((P[i][1] > y) !== (P[j][1] > y) && x < ((P[j][0] - P[i][0]) * (y - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) c = !c;
  }
  return c;
};

// Water features that came from a waterway line (f.line) without a mapped width
// get their ribbon again with the half width cut to the nearest footprint
// (houseboats are meant to float and do not count). -> the number trimmed
export function trimWaterways(feats) {
  const lines = feats.filter((f) => f.kind === 'water' && f.line && !f.line.fixed);
  const blds = feats.filter((f) => f.kind === 'buildings' && f.row.type !== 'houseboat');
  if (!lines.length || !blds.length) return 0;
  const grid = new SpatialGrid(60);
  for (const f of blds) { f.row._wb = polygonBounds(f.row.pts); grid.insert(f.row, f.row._wb); }
  let trimmed = 0;
  for (const f of lines) {
    const hw = f.line.hw;
    // the centreline in pieces of at most 4 m
    const P = [];
    for (let i = 0; i < f.line.pts.length; i++) {
      const a = f.line.pts[i];
      P.push(a);
      const c = f.line.pts[i + 1];
      if (!c) break;
      const n = Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / 4);
      for (let k = 1; k < n; k++) P.push([a[0] + ((c[0] - a[0]) * k) / n, a[1] + ((c[1] - a[1]) * k) / n]);
    }
    const hws = P.map(() => hw);
    let any = false;
    P.forEach((p, i) => {
      let best = hw + BANK;
      for (const b of grid.query(p[0] - hw - 1, p[1] - hw - 1, p[0] + hw + 1, p[1] + hw + 1)) {
        const q = b._wb;
        if (p[0] < q[0] - hw - 1 || p[0] > q[2] + hw + 1 || p[1] < q[1] - hw - 1 || p[1] > q[3] + hw + 1) continue;
        if (inRing(p[0], p[1], b.pts)) { best = 0; break; }
        for (let k = 0; k < b.pts.length - 1; k++) best = Math.min(best, Math.sqrt(segDist2(p[0], p[1], b.pts[k], b.pts[k + 1])));
      }
      if (best < hw + BANK) { hws[i] = Math.max(MIN_HW, best - BANK); any = true; }
    });
    if (!any) continue;
    // (a narrowing is eased over the neighbouring pieces: no sawtooth of the bank)
    const eased = hws.map((h, i) => Math.min(h, (hws[i - 1] ?? h) + 2, (hws[i + 1] ?? h) + 2));
    const L = [], R = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      const nx = -dy / l, ny = dx / l, h = eased[i];
      L.push([Math.round((P[i][0] + nx * h) * 100) / 100, Math.round((P[i][1] + ny * h) * 100) / 100]);
      R.push([Math.round((P[i][0] - nx * h) * 100) / 100, Math.round((P[i][1] - ny * h) * 100) / 100]);
    }
    const ring = [...L, ...R.reverse()];
    f.row.pts = [...ring, ring[0]];
    trimmed++;
  }
  for (const f of blds) delete f.row._wb;
  return trimmed;
}

// feats: [{ kind, row }] of a pack (build_corridor.mjs features()) ->
// { feats, stats }: the buildings are the derived ones, canopies come as
// { kind: 'canopies', row }, cut footways replace the way they came from.
export function deriveFeatures(feats, { clear = true, clip = true } = {}) {
  const of = (kind) => feats.filter((f) => f.kind === kind);
  const bFeats = of('buildings'), rFeats = of('roads');
  const buildings = bFeats.map((f) => f.row);
  const roads = rFeats.map((f) => f.row);
  const stats = { buildings: buildings.length, moved: 0, merged: 0, canopies: 0, lifted: 0, clipped: 0, trimmed: 0 };
  if (clear && buildings.length && roads.length) {
    const was = buildings.map((b) => b.pts);
    clearFootprints({ roads, buildings });
    stats.moved = buildings.reduce((n, b, i) => n + (b.pts !== was[i] ? 1 : 0), 0);
  }
  // (after the clearance, before the merge: the footprints as they will stand)
  stats.trimmed = trimWaterways(feats);
  const rowFeat = new Map(bFeats.map((f) => [f.row, f]));
  // (no height profiles yet: a bridge or tunnel carriageway does not run on the footprints under it)
  const ringRoads = roads.filter((r) => !r.bridge && !r.tunnel && !(r.layer > 0));
  const d = deriveBuildings({ buildings, roads, ringRoads, water: of('water').map((f) => f.row), rails: of('rails').map((f) => f.row) });
  const kept = d.buildings;
  stats.canopies = d.canopies.length;
  stats.merged = buildings.length - kept.length - d.canopies.length;
  // roof steps: the grid holds the solid footprints only (as the GameMap does)
  const grid = new SpatialGrid(80);
  for (const b of kept) { b.bounds = polygonBounds(b.pts); grid.insert(b, b.bounds); }
  liftNestedRoofs(kept, grid);
  stats.lifted = kept.filter((b) => b.lift).length;
  // ways through a solid block
  let roadFeats = rFeats;
  if (clip && kept.length && roads.length) {
    const roadGrid = new SpatialGrid(80);
    for (const r of roads) { r.bounds = polygonBounds(r.pts); roadGrid.insert(r, r.bounds); }
    const map = {
      roads: roads.slice(), buildings: kept, buildingGrid: grid, passageWays: [],
      roadsNear: (x, y, r) => roadGrid.query(x - r, y - r, x + r, y + r),
    };
    const cut = clipWaysInBuildings(map);
    stats.clipped = cut.length;
    if (cut.length) {
      const was = new Map(rFeats.map((f) => [f.row, f]));
      roadFeats = map.roads.map((r) => was.get(r) || { kind: 'roads', row: r });
    }
    for (const r of roadFeats) delete r.row.bounds;
  }
  for (const b of kept) { delete b.bounds; b.passages = null; b._doors = null; }
  const out = [];
  for (const f of feats) if (f.kind !== 'buildings' && f.kind !== 'roads') out.push(f);
  for (const b of kept) out.push(rowFeat.get(b));
  for (const c of d.canopies) { delete c.bounds; out.push({ kind: 'canopies', row: c }); }
  for (const f of roadFeats) out.push(f);
  return { feats: out, stats };
}
