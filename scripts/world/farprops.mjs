// The tall things of the countryside that the far view draws (game/js/farprops.js):
// wind turbines (OSM power=generator, generator:source=wind) and pylons
// (power=tower) out of the extract's nodes, once at build time. The caches
// keep no power lines, so the spans are worked out from the towers: each
// tower joins its nearest neighbours into runs (at most two a tower, none
// further apart than SPAN_MAX).
import { wgsToWorld } from '../../game/js/rdnew.js';

const r1 = (v) => Math.round(v * 10) / 10;
export const SPAN_MAX = 750;

// Adds the turbines and towers among `els` to acc ({ turbines: Map, towers: Map }, by OSM id).
export function collectFarNodes(els, acc = { turbines: new Map(), towers: new Map() }) {
  for (const el of els) {
    if (el.type !== 'node' || !el.tags) continue;
    const t = el.tags;
    if (t.power === 'generator' && t['generator:source'] === 'wind') {
      if (acc.turbines.has(el.id)) continue;
      const [x, y] = wgsToWorld(el.lat, el.lon);
      const h = parseFloat(t.height);
      // a tag under 40 m is a small turbine (a farm's); the big ones are not tagged
      const hub = h > 0 && h < 40 ? h : 78 + (el.id % 19);
      acc.turbines.set(el.id, [r1(x), r1(y), r1(hub)]);
    } else if (t.power === 'tower') {
      if (acc.towers.has(el.id)) continue;
      const [x, y] = wgsToWorld(el.lat, el.lon);
      acc.towers.set(el.id, [r1(x), r1(y)]);
    }
  }
  return acc;
}

// -> { turbines: [[x, y, hub]], pylons: [[x, y, yaw]], spans: [[i, j]] } sorted, so the same input gives the same bytes
export function finishFarProps(acc) {
  const turbines = [...acc.turbines.values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const towers = [...acc.towers.values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  // neighbours within SPAN_MAX, nearest pairs first, two spans a tower at most
  const CELL = SPAN_MAX;
  const grid = new Map();
  towers.forEach((p, i) => {
    const k = Math.floor(p[0] / CELL) * 100003 + Math.floor(p[1] / CELL);
    (grid.get(k) || grid.set(k, []).get(k)).push(i);
  });
  const pairs = [];
  towers.forEach((p, i) => {
    const cx = Math.floor(p[0] / CELL), cy = Math.floor(p[1] / CELL);
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
      for (const j of grid.get((cx + ox) * 100003 + cy + oy) || []) {
        if (j <= i) continue;
        const d = Math.hypot(towers[j][0] - p[0], towers[j][1] - p[1]);
        if (d <= SPAN_MAX && d > 20) pairs.push([d, i, j]);
      }
    }
  });
  pairs.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  const deg = new Array(towers.length).fill(0);
  const dir = towers.map(() => []);
  const spans = [];
  for (const [, i, j] of pairs) {
    if (deg[i] >= 2 || deg[j] >= 2) continue;
    // a tower's second span runs on the other side, not back along the first
    const a = Math.atan2(towers[j][1] - towers[i][1], towers[j][0] - towers[i][0]);
    const bad = (k, ang) => dir[k].some((q) => Math.cos(q - ang) > 0.5);
    if (bad(i, a) || bad(j, a + Math.PI)) continue;
    deg[i]++; deg[j]++;
    dir[i].push(a); dir[j].push(a + Math.PI);
    spans.push([i, j]);
  }
  // the yaw of a tower: along its line (the first span), else across the nearest tower
  const pylons = towers.map((p, i) => {
    let yaw = 0;
    if (dir[i].length) yaw = dir[i][0];
    return [p[0], p[1], Math.round(Math.atan2(Math.sin(yaw), Math.cos(yaw)) * 1000) / 1000];
  });
  return { turbines, pylons, spans };
}
