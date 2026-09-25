// Spatial index over every water-polygon edge: fast any-polygon point tests
// (row-bucketed ray cast with per-polygon parity), nearest shore edge and
// ray distance queries. Shared by the terrain hole cutter, the water surface
// builder and the quay walls.

const ROW = 8;
const CELL = 16;

export function createWaterIndex(polys) {
  let n = 0;
  for (const p of polys) n += p.pts.length;
  const ax = new Float64Array(n), ay = new Float64Array(n), bx = new Float64Array(n), by = new Float64Array(n);
  const poly = new Int32Array(n);
  const shore = new Uint8Array(n);
  let e = 0;
  polys.forEach((p, pi) => {
    const pts = p.pts;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      ax[e] = a[0]; ay[e] = a[1]; bx[e] = b[0]; by[e] = b[1]; poly[e] = pi; e++;
    }
  });

  const rows = new Map();
  const cells = new Map();
  const ckey = (cx, cy) => cx * 100003 + cy;
  for (let i = 0; i < n; i++) {
    const y0 = Math.floor(Math.min(ay[i], by[i]) / ROW), y1 = Math.floor(Math.max(ay[i], by[i]) / ROW);
    for (let r = y0; r <= y1; r++) {
      let arr = rows.get(r);
      if (!arr) rows.set(r, arr = []);
      arr.push(i);
    }
    const cx0 = Math.floor(Math.min(ax[i], bx[i]) / CELL), cx1 = Math.floor(Math.max(ax[i], bx[i]) / CELL);
    const cy0 = Math.floor(Math.min(ay[i], by[i]) / CELL), cy1 = Math.floor(Math.max(ay[i], by[i]) / CELL);
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const k = ckey(cx, cy);
        let arr = cells.get(k);
        if (!arr) cells.set(k, arr = []);
        arr.push(i);
      }
    }
  }

  const parity = new Uint8Array(polys.length);
  const touched = [];
  function inWater(x, y) {
    const arr = rows.get(Math.floor(y / ROW));
    if (!arr) return false;
    for (let k = 0; k < arr.length; k++) {
      const i = arr[k];
      const y0 = ay[i], y1 = by[i];
      if ((y0 > y) === (y1 > y)) continue;
      const xi = ax[i] + (bx[i] - ax[i]) * (y - y0) / (y1 - y0);
      if (xi > x) {
        const p = poly[i];
        if (!parity[p]) touched.push(p);
        parity[p] ^= 1;
      }
    }
    let hit = false;
    for (let k = 0; k < touched.length; k++) { if (parity[touched[k]]) hit = true; parity[touched[k]] = 0; }
    touched.length = 0;
    return hit;
  }

  let stamp = 1;
  const seen = new Uint32Array(n);
  function edgesIn(x0, y0, x1, y1, cb) {
    stamp++;
    const cx0 = Math.floor(x0 / CELL), cx1 = Math.floor(x1 / CELL);
    const cy0 = Math.floor(y0 / CELL), cy1 = Math.floor(y1 / CELL);
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const arr = cells.get(ckey(cx, cy));
        if (!arr) continue;
        for (let k = 0; k < arr.length; k++) {
          const i = arr[k];
          if (seen[i] === stamp) continue;
          seen[i] = stamp;
          cb(i);
        }
      }
    }
  }

  for (let i = 0; i < n; i++) {
    const dx = bx[i] - ax[i], dy = by[i] - ay[i];
    const len = Math.hypot(dx, dy);
    if (len < 1e-3) continue;
    const mx = (ax[i] + bx[i]) / 2, my = (ay[i] + by[i]) / 2;
    const nx = -dy / len * 0.6, ny = dx / len * 0.6;
    shore[i] = inWater(mx + nx, my + ny) !== inWater(mx - nx, my - ny) ? 1 : 0;
  }

  const out = { d: 0, i: -1, tx: 1, ty: 0 };
  function nearestShore(x, y, maxR) {
    let best = maxR * maxR, bi = -1;
    edgesIn(x - maxR, y - maxR, x + maxR, y + maxR, (i) => {
      if (!shore[i]) return;
      const ex = bx[i] - ax[i], ey = by[i] - ay[i];
      const l2 = ex * ex + ey * ey;
      let t = l2 > 1e-9 ? ((x - ax[i]) * ex + (y - ay[i]) * ey) / l2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const qx = ax[i] + ex * t - x, qy = ay[i] + ey * t - y;
      const d2 = qx * qx + qy * qy;
      if (d2 < best) { best = d2; bi = i; }
    });
    out.i = bi;
    out.d = Math.sqrt(best);
    if (bi >= 0) {
      const ex = bx[bi] - ax[bi], ey = by[bi] - ay[bi];
      const l = Math.hypot(ex, ey) || 1;
      out.tx = ex / l; out.ty = ey / l;
    }
    return out;
  }

  function rayDist(x, y, dx, dy, maxD) {
    let best = maxD;
    edgesIn(Math.min(x, x + dx * maxD), Math.min(y, y + dy * maxD), Math.max(x, x + dx * maxD), Math.max(y, y + dy * maxD), (i) => {
      const ex = bx[i] - ax[i], ey = by[i] - ay[i];
      const den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-9) return;
      const wx = ax[i] - x, wy = ay[i] - y;
      const t = (wx * ey - wy * ex) / den;
      const u = (wx * dy - wy * dx) / den;
      if (t > 0.05 && t < best && u >= 0 && u <= 1) best = t;
    });
    return best;
  }

  function segHitsAny(x0, y0, x1, y1, list) {
    for (let k = 0; k < list.length; k++) {
      const i = list[k];
      if (segSeg(x0, y0, x1, y1, ax[i], ay[i], bx[i], by[i])) return true;
    }
    return false;
  }

  return { ax, ay, bx, by, poly, shore, count: n, inWater, edgesIn, nearestShore, rayDist, segHitsAny };
}

function segSeg(p0x, p0y, p1x, p1y, q0x, q0y, q1x, q1y) {
  const d1x = p1x - p0x, d1y = p1y - p0y, d2x = q1x - q0x, d2y = q1y - q0y;
  const den = d1x * d2y - d1y * d2x;
  if (Math.abs(den) < 1e-12) return false;
  const wx = q0x - p0x, wy = q0y - p0y;
  const t = (wx * d2y - wy * d2x) / den;
  const u = (wx * d1y - wy * d1x) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

export function getWaterIndex(map) {
  return map._waterIndex || (map._waterIndex = createWaterIndex(map.water));
}
