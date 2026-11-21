// Walking in an interior (epic Interieurs, #1150): the collision of the hall, its walls, its
// furniture and the doorway in the facade. Pure: it works in the door frame (interiorframe.js) and
// answers "where may a circle of radius r stand", so the player, the companion and the people of the
// interior all use it. collision.js asks it for a building that has a live interior (b.walk) before
// it pushes the walker out of the footprint, which is how the door becomes passable.
//
//   resolve(x, y, r) -> null   not my business: the building's own wall collision decides (outside, or a closed door)
//                       true   free: skip the footprint push (in the open doorway, outside the facade line)
//                       [x, y] the walker is inside: the corrected position (hall, furniture, partitions)
import { toLocal, toWorld, openRing } from './interiorframe.js';
import { pointInPolygon } from './shopbind.js';
import { rectOf } from './interiorlayout.js';

export const APPROACH = 0.9; // how far in front of the facade the doorway holds the walker in line (m)

export function makeWalk(plan, ring, isOpen = () => true) {
  const { frame, hall, door, layout } = plan;
  const R = openRing(ring);
  const boxes = [...layout.walls, ...layout.items.filter((i) => i.solid).map(rectOf)];
  const gate = door.w / 2;
  const inFootprint = (x, y) => pointInPolygon(x, y, R);
  const clampLocal = (u, v, r, open) => {
    const G = gate - r * 0.5;
    // the wall of the facade: only the door gap leads through it, and only when the door is open
    if (v < hall.v0 + r) {
      if (open && Math.abs(u) <= G + 1e-9) return [Math.max(-G, Math.min(G, u)), v];
      u = Math.max(hall.u0 + r, Math.min(hall.u1 - r, u));
      return [u, hall.v0 + r];
    }
    return [Math.max(hall.u0 + r, Math.min(hall.u1 - r, u)), Math.min(hall.v1 - r, v)];
  };
  const pushBoxes = (u, v, r) => {
    for (let it = 0; it < 3; it++) {
      let moved = false;
      for (const b of boxes) {
        const cu = Math.max(b.u0, Math.min(b.u1, u)), cv = Math.max(b.v0, Math.min(b.v1, v));
        const du = u - cu, dv = v - cv, d2 = du * du + dv * dv;
        if (d2 >= r * r) continue;
        if (d2 > 1e-12) { const d = Math.sqrt(d2); u = cu + du / d * r; v = cv + dv / d * r; }
        else {
          const o = [u - b.u0, b.u1 - u, v - b.v0, b.v1 - v], m = Math.min(...o);
          if (m === o[0]) u = b.u0 - r; else if (m === o[1]) u = b.u1 + r; else if (m === o[2]) v = b.v0 - r; else v = b.v1 + r;
        }
        moved = true;
      }
      if (!moved) break;
    }
    return [u, v];
  };
  return {
    frame, plan, boxes, active: true,
    inFootprint,
    // is a point in the hall (the walker is "inside" this interior)?
    inside(x, y, m = 0) {
      const [u, v] = toLocal(frame, x, y);
      return u >= hall.u0 - m && u <= hall.u1 + m && v >= hall.v0 - m && v <= hall.v1 + m && inFootprint(x, y);
    },
    // in the doorway line in front of the door, outside (to prompt "open the door")
    atDoor(x, y, reach = 2.2) {
      const [u, v] = toLocal(frame, x, y);
      return Math.abs(u) <= gate + 0.8 && v > -reach && v < hall.v0 + 1.2;
    },
    resolve(x, y, r) {
      const open = isOpen();
      const [u, v] = toLocal(frame, x, y);
      if (v < 0) {
        // outside the facade line: free only in line with an open door gap
        if (!open || v < -APPROACH - r || Math.abs(u) > gate - r * 0.5 + 1e-9) return null;
        return true;
      }
      if (!inFootprint(x, y)) return null;
      let [cu, cv] = clampLocal(u, v, r, open);
      [cu, cv] = pushBoxes(cu, cv, r);
      if (Math.abs(cu - u) < 1e-9 && Math.abs(cv - v) < 1e-9) return [x, y];
      return toWorld(frame, cu, cv);
    },
  };
}
