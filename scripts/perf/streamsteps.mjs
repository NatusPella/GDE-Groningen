// Hoe lang duurt elk stuk tegelwerk (een next() van addTileSteps) op de hoofdthread, tijdens een rit over de echte tegels? Dat is de
// kleinste eenheid waarin de planner (streamplanner.js) kan knippen: een stuk van 50 ms is een hapering, hoe klein het budget ook is.
//   node scripts/perf/streamsteps.mjs <map met world/> [--speed=30] [--frames=3000] [--place=Groningen]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? Number(a.slice(k.length + 3)) : d; };
const dir = path.resolve(process.argv.find((a, i) => i > 1 && !a.startsWith('--')) || '.', 'world');
const SPEED = arg('speed', 30), FRAMES = arg('frames', 3000);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '../../game/js');
const TW = await import(pathToFileURL(path.join(root, 'tileworld.js')).href);
const source = {
  async read(file, off, len) { const fd = fs.openSync(path.join(dir, file), 'r'); const b = new Uint8Array(len); fs.readSync(fd, b, 0, len, off); fs.closeSync(fd); return b; },
  async readAll(file) { return new Uint8Array(fs.readFileSync(path.join(dir, file))); },
};
const steps = [];
const orig = TW.TileWorld.prototype.addTileSteps;
TW.TileWorld.prototype.addTileSteps = function* (tile, key) {
  const g = orig.call(this, tile, key);
  let n = 0;
  const rows = tile.sections.reduce((a, s) => a + (s.rows ? s.rows.length : 0), 0);
  for (;;) {
    const t = performance.now();
    const r = g.next();
    steps.push({ ms: performance.now() - t, n: n++, done: !!r.done, rows });
    if (r.done) return r.value;
    yield;
  }
};
let clock = 0;
const { world, store, index } = await TW.loadTileWorld('world/', { source, pool: false, now: () => clock, extra: [{ name: 'index-provincie.json' }, { name: 'index-corridor.json' }] });
const PLACE = process.argv.find((a) => a.startsWith('--place=')); const placeName = PLACE ? PLACE.slice(8) : 'Groningen';
const q = index.layers.provincie.global.places.find((x) => x.name === placeName);
const dts = 16.7;
steps.length = 0;
for (let f = 0; f < FRAMES; f++) {
  clock += dts;
  const x = q.x + f * dts / 1000 * SPEED, y = q.y;
  store.prefetch(x, y, { vx: SPEED, vy: 0, radius: 1500 });
  world.tileQueue.run(1e9);
  await new Promise((r) => setImmediate(r));
}
steps.sort((a, b) => b.ms - a.ms);
const ms = steps.map((s) => s.ms).sort((a, b) => a - b), pct = (p) => +ms[Math.min(ms.length - 1, Math.floor(ms.length * p))].toFixed(2);
console.log(JSON.stringify({ steps: steps.length, p50: pct(0.5), p95: pct(0.95), p99: pct(0.99), max: +ms[ms.length - 1].toFixed(1), over4: steps.filter((s) => s.ms > 4).length, over10: steps.filter((s) => s.ms > 10).length, over4Final: steps.filter((s) => s.ms > 4 && s.done).length, over4First: steps.filter((s) => s.ms > 4 && s.n === 0).length, top: steps.slice(0, 8).map((s) => `${s.ms.toFixed(1)}ms#${s.n}${s.done ? 'F' : ''}/${s.rows}rows`) }));
