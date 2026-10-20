// markDryRoad (mapdata.js) against its old per-point form, on every road of the staged city: same roads marked, time of both.
//   node scripts/perf/markdry_meet.mjs [<map dir, default desktop/build/game>]
import './../node3d.mjs';
import fs from 'node:fs';
import path from 'node:path';
const dir = path.resolve(process.argv[2] || 'desktop/build/game', 'world');
const TW = await import('../../game/js/tileworld.js');
const MD = await import('../../game/js/mapdata.js');
const WL = await import('../../game/js/waterlevels.js');
const source = {
  async read(file, off, len) { const fd = fs.openSync(path.join(dir, file), 'r'); const b = new Uint8Array(len); fs.readSync(fd, b, 0, len, off); fs.closeSync(fd); return b; },
  async readAll(file) { return new Uint8Array(fs.readFileSync(path.join(dir, file))); },
};
const tw = await TW.loadTileWorld('world/', { source, pool: false, extra: [{ name: 'index-provincie.json', only: (q) => !!q.ov }] });
const map = tw.world;
const DRY = new Set(['major', 'normal', 'minor', 'service']);
function oldMark(map, r) {
  if (r.bridge || r.z || !DRY.has(r.cat)) return false;
  const pts = r.pts;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 2));
    for (let k = 0; k <= steps; k++) {
      const x = ax + ((bx - ax) * k) / steps, y = ay + ((by - ay) * k) / steps;
      if (WL.waterPolyAt(map, x, y)) return true;
    }
  }
  return false;
}
for (const r of map.roads) if (r.dryCrossing) { r.bridge = false; delete r.dryCrossing; }
const roads = map.roads.filter((r) => !r.bridge);
const run = (f) => { const t = performance.now(); const hits = roads.map((r) => { const h = f(map, r); if (h) { r.bridge = false; delete r.dryCrossing; } return h; }); return { ms: performance.now() - t, hits }; };
for (let rep = 0; rep < 3; rep++) {
  const a = run(oldMark), b = run(MD.markDryRoad);
  let diff = 0; for (let i = 0; i < roads.length; i++) if (a.hits[i] !== b.hits[i]) diff++;
  console.log(`roads ${roads.length}  old ${a.ms.toFixed(0)} ms (${a.hits.filter(Boolean).length} dry)  new ${b.ms.toFixed(0)} ms (${b.hits.filter(Boolean).length} dry)  differ ${diff}`);
}
