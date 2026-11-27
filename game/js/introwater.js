// Water for the intro montage (#1338): the canal route is a rough centre line that on the Diepenring lies a few metres on the
// quay, so a boat put on it sat on dry land (at water level: under the street) and the camera filmed an empty road.
// Pure (no three): isWet(x, y) tells whether a point is water; scripts/introwater_test.mjs walks it on a synthetic canal.

// Snap a route point to the nearest water with room all round (a sloep is 2 m wide) and keep the route's heading.
export function waterPointNear(isWet, q, { r = 16, room = 2.4 } = {}) {
  const roomy = (x, y) => isWet(x, y) && [0, 1, 2, 3, 4, 5, 6, 7].every((i) => isWet(x + Math.cos(i * Math.PI / 4) * room, y + Math.sin(i * Math.PI / 4) * room));
  if (roomy(q.x, q.y)) return q;
  for (let d = 1; d <= r; d += 0.5) {
    for (let i = 0; i < 24; i++) {
      const a = i * Math.PI / 12, x = q.x + Math.cos(a) * d, y = q.y + Math.sin(a) * d;
      if (roomy(x, y)) return { ...q, x, y };
    }
  }
  return q;
}

// A camera spot on dry ground 7 to 10 m from a point on the water, as near as it gets to the wanted bearing; null if there is none.
export function quaySpotFor(isWet, target, bearing, z = 2.2) {
  for (const dist of [9, 8, 7, 10]) {
    for (let k = 0; k < 13; k++) {
      const a = bearing + (k === 0 ? 0 : (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 12));
      const x = target.x + Math.cos(a) * dist, y = target.y + Math.sin(a) * dist;
      if (!isWet(x, y) && !isWet(x + Math.cos(a) * 1.5, y + Math.sin(a) * 1.5)) return { x, y, z };
    }
  }
  return null;
}
