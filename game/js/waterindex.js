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

// --- clearance from the shore ----------------------------------------------
// Boats and swimmers keep off the quay walls, banks and moored houseboats: the
// drawn walls stand on the polygon edge and the banks slope out into it, so
// "inside the polygon" alone lets a hull clip through the stonework.

const OB_CELL = 16;

function obstacleGrid(map) {
  if (map._waterObstacles) return map._waterObstacles;
  const g = map._waterObstacles = new Map();
  for (const b of map.buildings || []) if (b.type === 'houseboat') addWaterObstacle(map, b.pts);
  return g;
}

// A closed ring [[x, y], ...] in the water that boats and swimmers stay clear of.
export function addWaterObstacle(map, ring) {
  const g = obstacleGrid(map);
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (const [x, y] of ring) { minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
  const ob = { ring, minx, miny, maxx, maxy };
  for (let cx = Math.floor((minx - 4) / OB_CELL); cx <= Math.floor((maxx + 4) / OB_CELL); cx++) {
    for (let cy = Math.floor((miny - 4) / OB_CELL); cy <= Math.floor((maxy + 4) / OB_CELL); cy++) {
      const k = cx + ',' + cy;
      if (!g.has(k)) g.set(k, []);
      g.get(k).push(ob);
    }
  }
}

function ringDist(ring, x, y) {
  let best = Infinity, inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const ax = ring[j][0], ay = ring[j][1], bx = ring[i][0], by = ring[i][1];
    if ((ay > y) !== (by > y) && x < ax + (bx - ax) * (y - ay) / (by - ay)) inside = !inside;
    const ex = bx - ax, ey = by - ay, l2 = ex * ex + ey * ey;
    let t = l2 > 1e-9 ? ((x - ax) * ex + (y - ay) * ey) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = ax + ex * t - x, qy = ay + ey * t - y;
    best = Math.min(best, qx * qx + qy * qy);
  }
  return inside ? -Math.sqrt(best) : Math.sqrt(best);
}

// Pushes a circle of radius r out of every moored obstacle (houseboat hull)
// it overlaps, for walkers and swimmers. Returns [x, y] or null if untouched.
export function pushOutOfWaterObstacles(map, x, y, r) {
  const list = obstacleGrid(map).get(Math.floor(x / OB_CELL) + ',' + Math.floor(y / OB_CELL));
  if (!list) return null;
  let moved = false;
  for (const ob of list) {
    if (x < ob.minx - r || x > ob.maxx + r || y < ob.miny - r || y > ob.maxy + r) continue;
    const ring = ob.ring;
    let best = Infinity, qx = 0, qy = 0, inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const ax = ring[j][0], ay = ring[j][1], bx = ring[i][0], by = ring[i][1];
      if ((ay > y) !== (by > y) && x < ax + (bx - ax) * (y - ay) / (by - ay)) inside = !inside;
      const ex = bx - ax, ey = by - ay, l2 = ex * ex + ey * ey;
      let t = l2 > 1e-9 ? ((x - ax) * ex + (y - ay) * ey) / l2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = ax + ex * t, py = ay + ey * t;
      const d2 = (px - x) ** 2 + (py - y) ** 2;
      if (d2 < best) { best = d2; qx = px; qy = py; }
    }
    const d = Math.sqrt(best);
    if (!inside && d >= r) continue;
    let nx = x - qx, ny = y - qy;
    const nl = Math.hypot(nx, ny);
    if (nl < 1e-6) {
      const cx = (ob.minx + ob.maxx) / 2, cy = (ob.miny + ob.maxy) / 2;
      nx = qx - cx; ny = qy - cy;
    } else if (inside) { nx = -nx; ny = -ny; }
    const k = Math.hypot(nx, ny) || 1;
    x = qx + (nx / k) * (r + 0.02);
    y = qy + (ny / k) * (r + 0.02);
    moved = true;
  }
  return moved ? [x, y] : null;
}

export function insideWaterObstacle(map, x, y) {
  const list = obstacleGrid(map).get(Math.floor(x / OB_CELL) + ',' + Math.floor(y / OB_CELL));
  if (!list) return false;
  for (const ob of list) {
    if (x < ob.minx || x > ob.maxx || y < ob.miny || y > ob.maxy) continue;
    if (ringDist(ob.ring, x, y) < 0) return true;
  }
  return false;
}

// Where a city canal carries on past the map edge as Ommeland water
// (countrywater.js registers it): (x, y, d) => the clearance there, with d
// the distance to the city polygon's shore, or -1 outside every polygon
// (then the free Ommeland water, or <= 0 on land). The polygon's cut along
// the map edge is no shore, so boats sail out and back in.
let countryClearance = null;
export function setCountryClearance(fn) { countryClearance = fn; }

// Free water around (x, y), capped at maxR: distance to the nearest real
// shore (edges shared by two water polygons don't count) or moored
// obstacle; negative on land or inside an obstacle.
export function waterClearance(map, x, y, maxR = 4) {
  const idx = getWaterIndex(map);
  let d;
  if (!idx.inWater(x, y)) {
    d = countryClearance ? countryClearance(x, y, -1) : -1;
    if (d <= 0) return -1;
    d = Math.min(maxR, d);
  } else {
    d = idx.nearestShore(x, y, maxR).d;
    if (countryClearance) d = Math.min(maxR, countryClearance(x, y, d));
  }
  const list = obstacleGrid(map).get(Math.floor(x / OB_CELL) + ',' + Math.floor(y / OB_CELL));
  if (list) {
    for (const ob of list) {
      if (x < ob.minx - d || x > ob.maxx + d || y < ob.miny - d || y > ob.maxy + d) continue;
      d = Math.min(d, ringDist(ob.ring, x, y));
    }
  }
  return d;
}

// --- channel points -----------------------------------------------------------
// Spots in a water polygon with room for a boat (clearance >= CHANNEL_MIN),
// each with the local channel heading (along the nearest shore). Built lazily
// on a grid scaled to the polygon's size, a few ms per frame at most, and
// cached on the polygon: boat spawns and wander targets draw from it.

const CHANNEL_MIN = 2.2;
const FRAME_BUDGET = 3;
let budgetFrame = -1, budgetSpent = 0;

function ringContains(ring, x, y) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const ay = ring[j][1], by = ring[i][1];
    if ((ay > y) !== (by > y) && x < ring[j][0] + (ring[i][0] - ring[j][0]) * (y - ay) / (by - ay)) inside = !inside;
  }
  return inside;
}

// budgetMs: Infinity finishes the scan now; otherwise the time shared by all
// polygons within the current frame.
export function waterChannelPoints(map, poly, budgetMs = Infinity) {
  let ch = poly._channel;
  if (!ch) {
    const [minx, miny, maxx, maxy] = poly.bounds;
    const step = Math.min(12, Math.max(2.5, Math.sqrt(((maxx - minx) * (maxy - miny)) / 6000)));
    ch = poly._channel = { pts: [], done: false, step, x: minx + step / 2, y: miny + step / 2 };
  }
  if (ch.done) return ch;
  const frame = Math.floor(performance.now() / 16);
  if (frame !== budgetFrame) { budgetFrame = frame; budgetSpent = 0; }
  const limit = budgetMs === Infinity ? Infinity : Math.min(budgetMs, FRAME_BUDGET - budgetSpent);
  if (limit <= 0) return ch;
  const t0 = performance.now();
  const idx = getWaterIndex(map);
  const [minx, , maxx, maxy] = poly.bounds;
  let n = 0;
  while (ch.y < maxy) {
    const x = ch.x, y = ch.y;
    ch.x += ch.step;
    if (ch.x > maxx) { ch.x = minx + ch.step / 2; ch.y += ch.step; }
    if (idx.inWater(x, y) && ringContains(poly.pts, x, y)) {
      const d = waterClearance(map, x, y, 6);
      if (d >= CHANNEL_MIN) {
        const s = idx.nearestShore(x, y, 40);
        ch.pts.push({ x, y, d, a: s.i >= 0 ? Math.atan2(s.ty, s.tx) : 0 });
      }
    }
    if (++n % 32 === 0 && performance.now() - t0 > limit) break;
  }
  if (ch.y >= maxy) ch.done = true;
  if (budgetMs !== Infinity) budgetSpent += performance.now() - t0;
  return ch;
}

// Whether some heading lets a swimmer in the quay band move at all (see updateWater).
export function swimmerCanLeave(free, x, y, step) {
  const r = Math.max(step, 0.05);
  for (let a = 0; a < 8; a++) if (free(x + Math.cos(a * Math.PI / 4) * r, y + Math.sin(a * Math.PI / 4) * r)) return true;
  return false;
}
