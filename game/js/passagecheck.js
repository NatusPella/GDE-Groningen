import { gridItems } from './spatialgrid.js';
// Roads through buildings: every stretch of a street, cycleway or footway
// that runs inside a building footprint, and what the game makes of it
// (passages.js). `auditPassages(map)` counts them per class; the story test
// fails on any 'solid' or 'hole' stretch, and `node scripts/passage_audit.mjs`
// prints the list straight from the map data.
//   opening  a shown passage: cut through the facade, lined tunnel with
//            ceiling and lamps, walkable/drivable
//   door     a way that ends just inside a facade (a door panel is drawn)
//   graze    the centreline clips the facade by at most a metre
//   clipped  a footway or cycleway through a solid block, cut at the facade
//            when the map loads (map.clippedWays)
//   hole     open for walkers or traffic, but nothing shown
//   solid    drawn and used straight through a wall
import { offGradeWay, runsInside, classifyRun } from './passages.js';

export function auditPassages(map, opts = {}) {
  const counts = { opening: 0, door: 0, graze: 0, clipped: (map.clippedWays || []).length, hole: 0, solid: 0 };
  const list = (opts.all ? map.clippedWays || [] : []).map((c) => ({ cls: 'clipped', depth: 0, len: +c.len.toFixed(1), road: label(c.road), building: c.building.name || c.building.type || '', x: +c.x.toFixed(1), y: +c.y.toFixed(1) }));
  for (const r of gridItems(map.roadGrid)) {
    if (offGradeWay(r) || r.pts.length < 2) continue;
    const [minx, miny, maxx, maxy] = r.bounds;
    for (const b of map.buildingGrid.query(minx, miny, maxx, maxy)) {
      if (b.hidden || (opts.skip && opts.skip(b))) continue;
      const [bx0, by0, bx1, by1] = b.bounds;
      if (bx1 < minx || bx0 > maxx || by1 < miny || by0 > maxy) continue;
      const { runs, total } = runsInside(r, b);
      for (const run of runs) {
        const c = classifyRun(map, r, b, run, total);
        counts[c.cls]++;
        if (!opts.all && c.cls !== 'solid' && c.cls !== 'hole') continue;
        const m = run.pts[run.pts.length >> 1];
        list.push({ cls: c.cls, depth: +c.depth.toFixed(1), len: +c.len.toFixed(1), road: label(r), building: b.name || b.type || '', x: +m[0].toFixed(1), y: +m[1].toFixed(1) });
      }
    }
  }
  return { counts, bad: list.filter((e) => e.cls === 'solid' || e.cls === 'hole'), list };
}

function label(r) {
  return `${r.cat}:${r.type}${r.name ? ' ' + r.name : ''}`;
}
