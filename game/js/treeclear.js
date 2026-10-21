// Trees on or at the edge of a carriageway (#324, #334). The OSM tree points of the city lie a few metres off the road, but
// some sit on the kerb or inside the half width (the old GameMap constructor dropped only those further than 0.3 m in); with a
// crown of two metres and more they hang over the traffic and their trunk stands in the lane. A tree on the road, or closer
// than TREE_KERB to its edge, is set beside it (the verge or the pavement, the way the tree row was meant). Where there is no
// room for that (a building, another road, water) a tree that stands beside the road (not on it) stays, as in a narrow median;
// one on the carriageway goes, as does one on the middle line (no side to put it on). Pure: map.roadsNear, buildingsNear, isInWater.

import { closestPointOnSegment, pointInPolygon, isInWater } from './util.js';

const CARS = new Set(['major', 'normal', 'minor', 'service']);
export const TREE_KERB = 0.7; // the trunk's centre stands this far beyond the carriageway's edge (m)
const SEARCH = 9;

const grade = (r) => CARS.has(r.cat) && !r.bridge && !r.tunnel && !r.z && r.pts && r.pts.length > 1;

// the car road at grade whose edge is nearest to (x, y): { m: metres from its edge (negative: on it), cp: nearest point, d, r }
function nearestEdge(map, x, y, skip = null) {
  let best = null;
  for (const r of map.roadsNear(x, y, SEARCH)) {
    if (!grade(r) || r === skip) continue;
    const hw = (r.width || 5) / 2;
    const [minx, miny, maxx, maxy] = r.bounds || [-Infinity, -Infinity, Infinity, Infinity];
    if (x < minx - hw - SEARCH || x > maxx + hw + SEARCH || y < miny - hw - SEARCH || y > maxy + hw + SEARCH) continue;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const cp = closestPointOnSegment(x, y, r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1]);
      const d = Math.sqrt(cp.dist2);
      if (!best || d - hw < best.m) best = { m: d - hw, cp, d, r, hw };
    }
  }
  return best;
}

// where a tree at (x, y) ends up: the same spot, a spot beside the road, or null (it goes)
export function treeBesideRoad(map, x, y) {
  const e = nearestEdge(map, x, y);
  if (!e || e.m >= TREE_KERB) return [x, y];
  if (e.d < 0.4) return null; // on the middle of the road: no side to put it on
  const out = e.hw + TREE_KERB + 0.05;
  const nx = x + ((x - e.cp.x) / e.d) * (out - e.d), ny = y + ((y - e.cp.y) / e.d) * (out - e.d);
  const again = nearestEdge(map, nx, ny);
  const stay = e.m >= 0.05 ? [x, y] : null; // (no room: a tree beside the road keeps its place)
  if (again && again.m < TREE_KERB - 0.15) return stay; // another road (or a bend of this one) is in the way
  for (const b of map.buildingsNear(nx, ny, 1)) if (pointInPolygon(nx, ny, b.pts)) return stay;
  if (isInWater(map, nx, ny)) return stay;
  return [nx, ny];
}

// the trees of a map set beside the roads, in place (a row keeps its other fields); the survivors are returned
export function clearTreesFromRoads(map, trees, stats = null) {
  const out = [];
  for (const t of trees) {
    const p = treeBesideRoad(map, t[0], t[1]);
    if (!p) { if (stats) stats.removed++; continue; }
    if (p[0] !== t[0] || p[1] !== t[1]) { t[0] = p[0]; t[1] = p[1]; if (stats) stats.moved++; }
    out.push(t);
  }
  return out;
}
