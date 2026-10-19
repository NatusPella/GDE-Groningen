// Leaf: small geometry/pose helpers about pedestrians that many systems use (isInsideBuilding,
// isOnRoad, lineOfSight, setPedPose, pushAudioEvent). They live here, not in pedestrians.js, so those
// systems do not import the whole pedestrian simulation (#108). pedestrians.js re-exports them.
import { closestPointOnSegment } from './util.js';
import { buildingAt } from './tileplace.js';
import { registerPoseSource, unregisterPoseSource } from './models3d_people.js';

export function isInsideBuilding(map, x, y) {
  return !!buildingAt(map, x, y);
}

export function isOnRoad(map, x, y, margin = 0, cats = null) {
  for (const r of map.roadsNear(x, y, 2 + margin)) {
    if (cats ? !cats.includes(r.cat) : r.cat === 'foot') continue;
    const pts = r.pts;
    const halfW = (r.width || 5) / 2 + margin;
    const [minx, miny, maxx, maxy] = r.bounds;
    if (x < minx - halfW || x > maxx + halfW || y < miny - halfW || y > maxy + halfW) continue;
    for (let i = 0; i < pts.length - 1; i++) {
      const cp = closestPointOnSegment(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
      if (cp.dist2 < halfW * halfW) return true;
    }
  }
  return false;
}

export function lineOfSight(map, ax, ay, bx, by) {
  const d = Math.hypot(bx - ax, by - ay);
  const steps = Math.ceil(d / 3);
  for (let k = 1; k < steps; k++) {
    const x = ax + (bx - ax) * k / steps, y = ay + (by - ay) * k / steps;
    if (isInsideBuilding(map, x, y)) return false;
  }
  return true;
}

export function setPedPose(ped, pose) {
  if (ped.pose === pose) return;
  ped.pose = pose;
  if (pose) registerPoseSource(ped._lookSeed, ped);
  else unregisterPoseSource(ped._lookSeed);
}

export function pushAudioEvent(world, ev) {
  if (!world.audioEvents) world.audioEvents = [];
  if (world.audioEvents.length < 64) world.audioEvents.push(ev);
}
