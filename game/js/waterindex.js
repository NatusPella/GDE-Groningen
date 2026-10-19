// Spatial index over every water-polygon edge: fast any-polygon point tests
// (row-bucketed ray cast with per-polygon parity), nearest shore edge and
// ray distance queries. Shared by the terrain hole cutter, the water surface
// builder and the quay walls.

import { GRID_X0, GRID_Y0, TILE_M } from './gdt.js';
import { SpatialGrid } from './spatialgrid.js';

const ROW = 8;
const CELL = 16;

// A province polygon is cut at the 1 km tile border: the edge on the border
// is where the water carries on into the next tile, not a shore.
const onGrid = (v, g) => { const m = (((v - g) % TILE_M) + TILE_M) % TILE_M; return Math.min(m, TILE_M - m) < 0.02; };
export function onTileCut(ax, ay, bx, by) {
  if (Math.abs(ax - bx) < 0.02 && onGrid(ax, GRID_X0)) return true;
  return Math.abs(ay - by) < 0.02 && onGrid(ay, GRID_Y0);
}

// An edge longer than this is cut into pieces: whether an edge is shore is judged at its
// middle, so a long edge (a 175 m patch rectangle, #236) that runs across other water for
// part of its length would count as shore along all of it, a wall across a lock chamber.
const MAX_EDGE = 20;
export function createWaterIndex(polys) {
  let n = 0;
  for (const p of polys) for (let i = 0; i < p.pts.length; i++) {
    const a = p.pts[i], b = p.pts[(i + 1) % p.pts.length];
    n += Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / MAX_EDGE));
  }
  const ax = new Float64Array(n), ay = new Float64Array(n), bx = new Float64Array(n), by = new Float64Array(n);
  const poly = new Int32Array(n);
  const shore = new Uint8Array(n);
  let e = 0;
  polys.forEach((p, pi) => {
    const pts = p.pts;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const k = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / MAX_EDGE));
      for (let j = 0; j < k; j++) {
        ax[e] = a[0] + (b[0] - a[0]) * j / k; ay[e] = a[1] + (b[1] - a[1]) * j / k;
        bx[e] = a[0] + (b[0] - a[0]) * (j + 1) / k; by[e] = a[1] + (b[1] - a[1]) * (j + 1) / k;
        poly[e] = pi; e++;
      }
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
    if (len < 1e-3 || onTileCut(ax[i], ay[i], bx[i], by[i])) continue;
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

// The city's polygons are the map's own array (indexed once); a streamed
// province tile's water (TileWorld, waterNear) lives outside it. A polygon of
// the tiles gets an index over itself and its neighbours (cached on it, for
// its shore and surface); a point query uses the index of the tile it is in.
function staticWater(map) {
  return map._staticWater || (map._staticWater = new Set(map.water));
}
export function getWaterIndex(map, poly = null) {
  if (poly && map.waterNear && !staticWater(map).has(poly)) return polyWaterIndex(map, poly);
  return map._waterIndex || (map._waterIndex = createWaterIndex(map.water));
}

// the index that has (x, y) in its water: the tile polygons' where they hold it, else the city's
export function waterIndexAt(map, x, y) {
  const t = tileWaterIndex(map, x, y);
  return t && t.inWater(x, y) ? t : getWaterIndex(map);
}

function polyWaterIndex(map, poly) {
  if (poly._wi) return poly._wi;
  const b = poly.bounds || [Infinity, Infinity, -Infinity, -Infinity];
  const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, r = Math.max(b[2] - b[0], b[3] - b[1]) / 2 + 40;
  const near = new Set(map.waterNear(cx, cy, r));
  near.add(poly);
  const st = staticWater(map);
  return (poly._wi = createWaterIndex([...near].filter((w) => !st.has(w))));
}

// the index over the streamed polygons around a tile (null: none there),
// rebuilt when tiles came or went (map._waterVer, tileworld.js)
function tileWaterIndex(map, x, y) {
  if (!map.waterNear || !map.waterGrid) return null;
  const ti = Math.floor((x - GRID_X0) / TILE_M), tj = Math.floor((y - GRID_Y0) / TILE_M);
  const cache = map._tileWater || (map._tileWater = new Map());
  const key = ti * 100003 + tj, ver = map._waterVer || 0;
  const e = cache.get(key);
  if (e && e.ver === ver) return e.idx;
  const ox = GRID_X0 + ti * TILE_M, oy = GRID_Y0 + tj * TILE_M, st = staticWater(map);
  const list = [...new Set(map.waterNear(ox + TILE_M / 2, oy + TILE_M / 2, TILE_M / 2 + 60))].filter((w) => !st.has(w));
  const idx = list.length ? createWaterIndex(list) : null;
  if (cache.size > 64) cache.clear();
  cache.set(key, { ver, idx });
  return idx;
}

// Free water at (x, y) from the streamed polygons, unioned with the city's
// index: a shore edge that the other source has water behind (a province
// polygon next to a city polygon) is no shore.
function tileClearance(map, x, y, maxR, st) {
  const ti = tileWaterIndex(map, x, y);
  const sIn = st.inWater(x, y), tIn = !!ti && ti.inWater(x, y);
  if (!sIn && !tIn) return null;
  let d = maxR;
  const near = (idx, other) => {
    const s = idx.nearestShore(x, y, maxR);
    if (s.i < 0) return;
    const ex = idx.bx[s.i] - idx.ax[s.i], ey = idx.by[s.i] - idx.ay[s.i], l2 = ex * ex + ey * ey || 1e-9;
    const t = Math.max(0, Math.min(1, ((x - idx.ax[s.i]) * ex + (y - idx.ay[s.i]) * ey) / l2));
    const qx = idx.ax[s.i] + ex * t, qy = idx.ay[s.i] + ey * t;
    const dx = qx - x, dy = qy - y, k = Math.hypot(dx, dy) || 1;
    const bx = qx + (dx / k) * 0.7, by = qy + (dy / k) * 0.7;
    if ((other && other.inWater(bx, by)) || (seaFn && seaFn(bx, by, 0.5) !== null)) return;
    d = Math.min(d, s.d);
  };
  if (sIn) near(st, ti);
  if (ti) near(ti, st);
  return d;
}

// The open sea (seawater.js createSeaClearance, set by regions.js): (x, y, maxR) -> free
// sea round the point, null on land. The sea carries on from a water row's edge.
let seaFn = null;
export function setSeaClearance(fn) { seaFn = fn || null; }

// --- clearance from the shore ----------------------------------------------
// Boats and swimmers keep off the quay walls, banks and moored houseboats: the
// drawn walls stand on the polygon edge and the banks slope out into it, so
// "inside the polygon" alone lets a hull clip through the stonework.

const OB_CELL = 16;

function obstacleGrid(map) {
  if (map._waterObstacles) return map._waterObstacles;
  const g = map._waterObstacles = new SpatialGrid(OB_CELL);
  for (const b of map.buildings || []) if (b.type === 'houseboat') addWaterObstacle(map, b.pts);
  return g;
}

// A closed ring [[x, y], ...] in the water that boats and swimmers stay clear of.
export function addWaterObstacle(map, ring) {
  const g = obstacleGrid(map);
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (const [x, y] of ring) { minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
  const ob = { ring, minx, miny, maxx, maxy };
  g.insert(ob, [minx - 4, miny - 4, maxx + 4, maxy + 4]);
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
  const list = obstacleGrid(map).query(x, y, x, y);
  if (!list.length) return null;
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
  const list = obstacleGrid(map).query(x, y, x, y);
  if (!list.length) return false;
  for (const ob of list) {
    if (x < ob.minx || x > ob.maxx || y < ob.miny || y > ob.maxy) continue;
    if (ringDist(ob.ring, x, y) < 0) return true;
  }
  return false;
}

// Free water around (x, y), capped at maxR: distance to the nearest real
// shore (edges shared by two water polygons don't count) or moored
// obstacle; negative on land or inside an obstacle.
export function waterClearance(map, x, y, maxR = 4) {
  const idx = getWaterIndex(map);
  let d = tileClearance(map, x, y, maxR, idx);
  // no water row: the open sea, which OSM has no polygon for (seawater.js), else land
  if (d === null && seaFn) d = seaFn(x, y, maxR);
  if (d === null) return -1;
  const list = obstacleGrid(map).query(x, y, x, y);
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
  const idx = getWaterIndex(map, poly);
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
