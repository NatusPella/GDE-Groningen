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
//   clipped     footways and cycleways through a solid block end at its
//               facade (passages.js clipWaysInBuildings)
//
// The city path is not touched: pack_tiles.mjs still reads the GameMap.
import { deriveBuildings, liftNestedRoofs } from '../../game/js/derive.js';
import { SpatialGrid } from '../../game/js/spatialgrid.js';
import { clipWaysInBuildings } from '../../game/js/passages.js';
import { polygonBounds } from '../../game/js/util.js';
import { clearFootprints } from './building_clearance.mjs';

// feats: [{ kind, row }] of a pack (build_corridor.mjs features()) ->
// { feats, stats }: the buildings are the derived ones, canopies come as
// { kind: 'canopies', row }, cut footways replace the way they came from.
export function deriveFeatures(feats, { clear = true, clip = true } = {}) {
  const of = (kind) => feats.filter((f) => f.kind === kind);
  const bFeats = of('buildings'), rFeats = of('roads');
  const buildings = bFeats.map((f) => f.row);
  const roads = rFeats.map((f) => f.row);
  const stats = { buildings: buildings.length, moved: 0, merged: 0, canopies: 0, lifted: 0, clipped: 0 };
  if (clear && buildings.length && roads.length) {
    const was = buildings.map((b) => b.pts);
    clearFootprints({ roads, buildings });
    stats.moved = buildings.reduce((n, b, i) => n + (b.pts !== was[i] ? 1 : 0), 0);
  }
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
