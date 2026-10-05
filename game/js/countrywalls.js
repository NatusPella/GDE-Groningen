// Hedges and fences of the Ommeland fields as low walls: line segments with
// a height, registered per prop tile by countryside.js while the tile is
// loaded. They block walking (pushOutOfWalls) and can be vaulted
// (wallAhead, player.js / vaultkit.js); vehicles drive through them.
// Pure: no DOM, no three.js.
//   tile walls: flat [ax, ay, bx, by, h, halfThick, ...]

const TILE = 160;
const STRIDE = 6;
const wallTiles = new Map();
const tiles = wallTiles;
const tkey = (tx, ty) => tx * 100003 + ty;

export function setTileWalls(tx, ty, walls) {
  if (walls && walls.length) tiles.set(tkey(tx, ty), walls);
  else tiles.delete(tkey(tx, ty));
}
export function clearTileWalls(tx, ty) {
  tiles.delete(tkey(tx, ty));
}
export function wallTileCount() {
  return tiles.size;
}

// Tree trunks of the loaded tiles (poplar lanes, road oaks, willows) as
// zero-length walls [x, y, x, y, h, radius, ...]: solid for everything that
// moves, like the city's trees (breakables.js), never vaulted.
const trunkTiles = new Map();
export function setTileTrunks(tx, ty, trunks) {
  if (trunks && trunks.length) trunkTiles.set(tkey(tx, ty), trunks);
  else trunkTiles.delete(tkey(tx, ty));
}
export function clearTileTrunks(tx, ty) {
  trunkTiles.delete(tkey(tx, ty));
}
export function trunkTileCount() {
  return trunkTiles.size;
}

function eachNear(x, y, fn, tiles = wallTiles) {
  if (!tiles.size) return;
  const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      const W = tiles.get(tkey(tx + ox, ty + oy));
      if (W && fn(W) === false) return;
    }
  }
}

// closest point parameter of p on segment k of W
function seg(W, k, x, y) {
  const ax = W[k], ay = W[k + 1], dx = W[k + 2] - ax, dy = W[k + 3] - ay;
  const L2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
  return [ax + dx * t, ay + dy * t];
}

// Pushes obj ({x, y}) radius r out of every wall; true when it moved.
export function pushOutOfWalls(obj, r, src = wallTiles) {
  let hit = false;
  eachNear(obj.x, obj.y, (W) => {
    for (let k = 0; k < W.length; k += STRIDE) {
      const m = r + W[k + 5];
      if (obj.x < Math.min(W[k], W[k + 2]) - m || obj.x > Math.max(W[k], W[k + 2]) + m || obj.y < Math.min(W[k + 1], W[k + 3]) - m || obj.y > Math.max(W[k + 1], W[k + 3]) + m) continue;
      const [cx, cy] = seg(W, k, obj.x, obj.y);
      const dx = obj.x - cx, dy = obj.y - cy, d = Math.hypot(dx, dy);
      if (d >= m) continue;
      if (d > 1e-4) { obj.x = cx + (dx / d) * m; obj.y = cy + (dy / d) * m; } else {
        const sx = W[k + 2] - W[k], sy = W[k + 3] - W[k + 1], l = Math.hypot(sx, sy) || 1;
        obj.x = cx - (sy / l) * m; obj.y = cy + (sx / l) * m;
      }
      hit = true;
    }
  }, src);
  return hit;
}

// Pushes obj ({x, y}) radius r out of every tree trunk; true when it moved.
export function pushOutOfTrunks(obj, r) {
  return pushOutOfWalls(obj, r, trunkTiles);
}

// Nearest wall along (dx, dy) from (x, y) within reach, for a body of
// radius r: { dist, h, depth } or null.
export function wallAhead(x, y, dx, dy, reach, r = 0.2) {
  let best = null;
  eachNear(x, y, (W) => {
    for (let k = 0; k < W.length; k += STRIDE) {
      const m = r + W[k + 5];
      const ex = x + dx * reach, ey = y + dy * reach;
      if (Math.max(x, ex) < Math.min(W[k], W[k + 2]) - m || Math.min(x, ex) > Math.max(W[k], W[k + 2]) + m || Math.max(y, ey) < Math.min(W[k + 1], W[k + 3]) - m || Math.min(y, ey) > Math.max(W[k + 1], W[k + 3]) + m) continue;
      for (let s = 0; s <= reach; s += 0.1) {
        const px = x + dx * s, py = y + dy * s;
        const [cx, cy] = seg(W, k, px, py);
        if (Math.hypot(px - cx, py - cy) >= m) continue;
        if (!best || s < best.dist) best = { dist: s, h: W[k + 4], depth: W[k + 5] * 2 + 0.1 };
        break;
      }
    }
  });
  return best;
}
