// Scripted cars in the trailer and the intro montage: smooth paths and road
// height for cars that are placed by position every frame instead of driven.
import { settleVehicleHeight } from './vehicle.js';

const lerp = (a, b, t) => a + (b - a) * t;

// A path through pts ([x, y] or [x, y, ...]) as a Catmull-Rom curve
// resampled every `step` m. at(s) gives the point and the tangent heading,
// so a car on a lane offset turns gradually instead of snapping at each
// vertex, and its offset point never jumps sideways at a corner.
export function smoothPath(pts, step = 1) {
  const P = pts.map((p) => [p[0], p[1]]);
  const n = P.length;
  const dense = [P[0]];
  for (let i = 0; i < n - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(n - 1, i + 2)];
    const k = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let j = 1; j <= k; j++) {
      const t = j / k, t2 = t * t, t3 = t2 * t;
      const c = (a, b, cc, d) => 0.5 * (2 * b + (cc - a) * t + (2 * a - 5 * b + 4 * cc - d) * t2 + (3 * b - a - 3 * cc + d) * t3);
      dense.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  const m = dense.length;
  const cum = new Float64Array(m);
  const ang = new Float64Array(m);
  for (let i = 1; i < m; i++) cum[i] = cum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]);
  for (let i = 0; i < m; i++) {
    const a = dense[Math.max(0, i - 1)], b = dense[Math.min(m - 1, i + 1)];
    ang[i] = Math.atan2(b[1] - a[1], b[0] - a[0]);
  }
  const len = cum[m - 1];
  return {
    len,
    at(s) {
      s = Math.max(0, Math.min(len - 1e-3, s));
      let lo = 0, hi = m - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid; }
      const t = (s - cum[lo]) / (cum[hi] - cum[lo] || 1);
      let da = ang[hi] - ang[lo];
      da = Math.atan2(Math.sin(da), Math.cos(da));
      return { x: lerp(dense[lo][0], dense[hi][0], t), y: lerp(dense[lo][1], dense[hi][1], t), a: ang[lo] + da * t };
    },
  };
}

// The road height along a path, followed from z0 at its start in short
// steps, so a stretch that climbs onto a viaduct or dips into a cutting
// stays on that road and not on the street that crosses over or under it.
export function pathHeights(map, path, z0 = 0, step = 1) {
  const n = Math.max(2, Math.ceil(path.len / step) + 1);
  const zs = new Float64Array(n);
  let z = z0;
  for (let i = 0; i < n; i++) {
    const q = path.at(Math.min(path.len, i * step));
    z = map.groundHeightAt ? map.groundHeightAt(q.x, q.y, z) : 0;
    zs[i] = z;
  }
  return (s) => {
    const f = Math.max(0, Math.min(n - 1, s / step));
    const i = Math.min(n - 2, Math.floor(f));
    return lerp(zs[i], zs[i + 1], f - i);
  };
}

// Puts scripted car v on q ({ x, y, a }) at `speed` and lets its wheels ride
// the surface like a driven car's: height, pitch and roll from the road
// under it (vehicle.js settleVehicleHeight). zHint is the road height there
// (pathHeights); the car snaps to that level when it is not on it yet.
export function cineDrive(v, map, q, speed, dt, zHint = null) {
  v.x = q.x; v.y = q.y; v.angle = q.a; v.speed = speed;
  if (zHint != null && (v.z == null || Math.abs((v.z || 0) - zHint) > 1.2)) {
    const g = groundPose(map, q.x, q.y, q.a, zHint, Math.min(v.model.len * 0.375, 2.4));
    v.z = g.z; v.pitch = g.pitch; v.roll = 0;
    v.vz = 0; v.vzG = 0; v.airborne = false;
  }
  if (dt > 0) settleVehicleHeight(v, map, dt);
}

// Height and pitch of the ground under a prop that is not a Vehicle (the
// trailer's tractor), half its wheelbase ahead and behind.
export function groundPose(map, x, y, a, zHint, half) {
  if (!map.groundHeightAt) return { z: zHint || 0, pitch: 0 };
  const z = map.groundHeightAt(x, y, zHint);
  const c = Math.cos(a), s = Math.sin(a);
  const zf = map.groundHeightAt(x + c * half, y + s * half, z);
  const zr = map.groundHeightAt(x - c * half, y - s * half, z);
  return { z, pitch: Math.atan2(zf - zr, 2 * half) };
}
