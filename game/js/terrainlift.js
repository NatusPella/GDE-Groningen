// What stands on the relief rides up with it (#269, ?terrain). The world is built flat (y = 0 is the street level of the place),
// the ground of ?terrain rises where the AHN relief does (terrainrelief3d.js), so everything that was built flat on it is lifted by
// the relief under it: a road by its own base (the one its profile is relative to, mapdata.js terrainBase), a building and a tree by
// the ground at their foot. Pure: no three.js; a geometry only needs `attributes.position`.

// Lifts the vertices of `geometry` by baseAt(x, z), once (a geometry cached on a road is lifted the first time the road is drawn).
export function liftGeometry(geometry, baseAt) {
  if (!geometry || !geometry.attributes || !geometry.attributes.position || (geometry.userData && geometry.userData.terrainLifted)) return false;
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) + baseAt(pos.getX(i), pos.getZ(i)));
  pos.needsUpdate = true;
  geometry.boundingBox = null;
  geometry.boundingSphere = null;
  (geometry.userData || (geometry.userData = {})).terrainLifted = true;
  return true;
}

// The ground a road is drawn on, as the physics reads it: a road with a profile (a ribbon in the elevation model) over its own base
// (vertex to vertex, a deck from the line between its ends), any other road on the terrain itself
export function roadBaseAt(map, road, x, y) {
  if (road._zp === undefined) road._zp = !!road.z && road.z.some((v) => Math.abs(v) >= 0.02);
  return road._zp ? map.terrainBase(road, x, y) : map.terrainAt(x, y);
}

// A road's drawn group (ribbon, sidewalk, marking, structure) lifted by the ground it is on
export function liftRoadGroup(group, map, road) {
  const base = (x, z) => roadBaseAt(map, road, x, z);
  group.traverse((o) => { if (o.isMesh) liftGeometry(o.geometry, base); });
  return group;
}

// The height a building stands at: the lowest ground under its footprint (the high side sinks into the slope, the low side does
// not float)
export function buildingLift(map, b) {
  const P = b.pts;
  if (!P || !P.length) return 0;
  let lo = Infinity;
  const n = P.length - 1 || 1;
  let cx = 0, cy = 0;
  for (let i = 0; i < n; i++) { lo = Math.min(lo, map.terrainAt(P[i][0], P[i][1])); cx += P[i][0]; cy += P[i][1]; }
  return Math.min(lo, map.terrainAt(cx / n, cy / n));
}
