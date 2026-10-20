// Brings the half widths of the ring race lap (game/js/ringroute.js, made by
// scripts/gen_ringroute.py) to the carriageway widths of the current map,
// leaving the lap's points as they are:
//   node scripts/world/ring_widths.mjs [--write]
// Each point takes half the width of the car road whose centreline it is on
// (the nearest one within 1.5 m). Run after scripts/world/lanes.py.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FILE = path.join(ROOT, 'game/js/ringroute.js');
const { loadCityData } = await import('../lib/loadworld.mjs');
const data = await loadCityData({ extras: false });
const CAR = new Set(['major', 'normal', 'minor']);
const G = 40, grid = new Map();
for (const r of data.roads) {
  if (!CAR.has(r.cat)) continue;
  for (let i = 0; i < r.pts.length - 1; i++) {
    const [a, b] = [r.pts[i], r.pts[i + 1]];
    for (let gx = Math.floor((Math.min(a[0], b[0]) - 2) / G); gx <= Math.floor((Math.max(a[0], b[0]) + 2) / G); gx++) {
      for (let gy = Math.floor((Math.min(a[1], b[1]) - 2) / G); gy <= Math.floor((Math.max(a[1], b[1]) + 2) / G); gy++) {
        const k = gx * 100000 + gy;
        (grid.get(k) || grid.set(k, []).get(k)).push([r, a, b]);
      }
    }
  }
}
const dist = (x, y, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2));
  return Math.hypot(a[0] + dx * t - x, a[1] + dy * t - y);
};
const src = fs.readFileSync(FILE, 'utf8');
let n = 0, changed = 0, missing = 0;
const out = src.replace(/\[(-?[\d.]+),(-?[\d.]+),([\d.]+)\]/g, (m, xs, ys, hs) => {
  const x = +xs, y = +ys;
  let best = null, bd = 1.5;
  for (const [r, a, b] of grid.get(Math.floor(x / G) * 100000 + Math.floor(y / G)) || []) {
    const d = dist(x, y, a, b);
    if (d < bd) { bd = d; best = r; }
  }
  n++;
  if (!best) { missing++; return m; }
  const hw = (Math.round(best.width / 2 * 10) / 10).toFixed(1);
  if (hw !== hs) changed++;
  return `[${xs},${ys},${hw}]`;
});
console.log(`${n} lap points, ${changed} new half widths, ${missing} not on a car road (kept)`);
if (process.argv.includes('--write')) fs.writeFileSync(FILE, out);
