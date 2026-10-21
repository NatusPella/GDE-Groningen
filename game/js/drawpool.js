// The pure parts of the multi-draw pool (multidraw3d.js): the allocator for ranges inside one big buffer
// and the culling of the pooled pieces against a frustum. No three.js here, so scripts/drawpool_test.mjs runs in Node.

// First-fit allocator over [0, capacity): alloc(n) -> start or -1, release(start, n), grow(capacity).
// The free list stays sorted and neighbours are joined, so a buffer that is filled and emptied in turn does not fragment.
export class RangeAllocator {
  constructor(capacity) {
    this.capacity = capacity;
    this.free = [[0, capacity]];
    this.used = 0;
  }

  alloc(n) {
    if (n <= 0) return 0;
    const f = this.free;
    for (let i = 0; i < f.length; i++) {
      if (f[i][1] < n) continue;
      const start = f[i][0];
      if (f[i][1] === n) f.splice(i, 1); else { f[i][0] += n; f[i][1] -= n; }
      this.used += n;
      return start;
    }
    return -1;
  }

  release(start, n) {
    if (n <= 0) return;
    const f = this.free;
    let i = 0;
    while (i < f.length && f[i][0] < start) i++;
    f.splice(i, 0, [start, n]);
    this.used -= n;
    if (i + 1 < f.length && f[i][0] + f[i][1] === f[i + 1][0]) { f[i][1] += f[i + 1][1]; f.splice(i + 1, 1); }
    if (i > 0 && f[i - 1][0] + f[i - 1][1] === f[i][0]) { f[i - 1][1] += f[i][1]; f.splice(i, 1); }
  }

  grow(capacity) {
    if (capacity <= this.capacity) return;
    this.release(this.capacity, capacity - this.capacity);
    this.used += capacity - this.capacity; // release counted it as freed; it never was used
    this.capacity = capacity;
  }

  // the largest free run, to tell a full buffer from a fragmented one
  largest() { let m = 0; for (const r of this.free) if (r[1] > m) m = r[1]; return m; }
}

// The six planes of a view-projection matrix (column-major, as THREE.Matrix4.elements), normalized, written to
// out[0..23] as (nx, ny, nz, d) each: a point is inside when nx*x + ny*y + nz*z + d >= 0 for all six.
// The same planes as THREE.Frustum.setFromProjectionMatrix (WebGL clip space).
export function frustumPlanes(me, out = new Float64Array(24)) {
  const m0 = me[0], m1 = me[1], m2 = me[2], m3 = me[3], m4 = me[4], m5 = me[5], m6 = me[6], m7 = me[7];
  const m8 = me[8], m9 = me[9], m10 = me[10], m11 = me[11], m12 = me[12], m13 = me[13], m14 = me[14], m15 = me[15];
  const set = (i, a, b, c, d) => {
    const l = Math.hypot(a, b, c) || 1;
    out[i * 4] = a / l; out[i * 4 + 1] = b / l; out[i * 4 + 2] = c / l; out[i * 4 + 3] = d / l;
  };
  set(0, m3 - m0, m7 - m4, m11 - m8, m15 - m12);
  set(1, m3 + m0, m7 + m4, m11 + m8, m15 + m12);
  set(2, m3 + m1, m7 + m5, m11 + m9, m15 + m13);
  set(3, m3 - m1, m7 - m5, m11 - m9, m15 - m13);
  set(4, m3 - m2, m7 - m6, m11 - m10, m15 - m14);
  set(5, m3 + m2, m7 + m6, m11 + m10, m15 + m14);
  return out;
}

// Which entries show: entries are [x, y, z, radius] in `spheres` (n of them), their index ranges (in elements)
// are firsts[i] and counts[i]. Writes the visible ones to starts (in bytes: first * bytes) and outCounts and
// returns how many. Entries with radius < 0 are free slots. `near` (optional) drops entries whose centre is
// farther than near + radius from (cx, cy, cz).
export function cullRanges(spheres, firsts, counts, n, planes, bytes, starts, outCounts, maxDist = 0, cx = 0, cy = 0, cz = 0) {
  let k = 0;
  const md2 = maxDist > 0 ? maxDist : 0;
  for (let i = 0; i < n; i++) {
    const o = i * 4, r = spheres[o + 3];
    if (r < 0) continue;
    const x = spheres[o], y = spheres[o + 1], z = spheres[o + 2];
    let vis = true;
    for (let p = 0; p < 24; p += 4) {
      if (planes[p] * x + planes[p + 1] * y + planes[p + 2] * z + planes[p + 3] < -r) { vis = false; break; }
    }
    if (!vis) continue;
    if (md2) { const dx = x - cx, dy = y - cy, dz = z - cz; const lim = md2 + r; if (dx * dx + dy * dy + dz * dz > lim * lim) continue; }
    starts[k] = firsts[i] * bytes;
    outCounts[k] = counts[i];
    k++;
  }
  return k;
}
