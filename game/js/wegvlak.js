// Is a point on the roadway: a carriageway, or the open middle of a junction? mapdata.js onCarriageway only knows the
// lanes (the centre line and half the road width); where three or more roads meet, the asphalt of the junction is wider
// than any of them, so an animal or a hedge counted as "beside the road" stood in the middle of it (#334, #324).
// Pure: asks only map.roadsNear and map.onCarriageway.

const CARS = new Set(['major', 'normal', 'minor', 'service']);
const JOIN = 2.5;   // road ends within this of each other (m) are one junction node
const MIN_ARMS = 3; // a node with this many road ends is a junction
const EDGE = 1.5;   // the asphalt reaches this far past an arm's half width round the node

// the junction nodes of the car roads round (x, y): [{ x, y, arms, r }] (r: how far the asphalt reaches from the node)
export function junctionNodes(map, x, y, R = 16) {
  const ends = [];
  for (const r of map.roadsNear(x, y, R)) {
    if (!CARS.has(r.cat) || r.bridge || r.z || !r.pts || r.pts.length < 2) continue;
    for (const p of [r.pts[0], r.pts[r.pts.length - 1]]) ends.push({ x: p[0], y: p[1], w: r.width || 5, r });
  }
  const nodes = [];
  for (const e of ends) {
    if (nodes.some((n) => Math.hypot(n.x - e.x, n.y - e.y) < JOIN)) continue;
    const arms = ends.filter((q) => Math.hypot(q.x - e.x, q.y - e.y) < JOIN);
    if (new Set(arms.map((q) => q.r)).size < MIN_ARMS) continue;
    nodes.push({ x: e.x, y: e.y, arms: arms.length, r: Math.max(...arms.map((q) => q.w)) / 2 + EDGE });
  }
  return nodes;
}

export function onRoadway(map, x, y, margin = 0) {
  if (map.onCarriageway && map.onCarriageway(x, y, margin)) return true;
  for (const n of junctionNodes(map, x, y)) if (Math.hypot(n.x - x, n.y - y) < n.r + margin) return true;
  return false;
}
