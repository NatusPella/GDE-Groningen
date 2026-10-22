// Een rit over de echte tegels van een gestagede build (virtuele klok, tegels van schijf, echte decodering): de A7 heen en terug en de
// spoorlijn naar de Eemshaven, met het tegelbudget van de TileStore ernaast (#379, #247). Telt de tegels die binnen 250 m van de auto nog
// niet binnen zijn (late), de verwijderde tegels en de top van de geheugenstand (ruwe bytes x 26 = JS-heap van de tegels, tilemem.mjs).
//   node --expose-gc scripts/perf/streamdrive.mjs <map met world/> [--budget=40e6] [--speed=33] [--hz=20] [--scan]
// --scan: dropTile loopt over alle rijen van de wereld (het oude gedrag, TileWorld.scanDrops); de uitvoer bevat een digest van de wereld na afloop
// (rijen en rasterinhoud per soort), die voor beide manieren gelijk hoort te zijn.
import './../node3d.mjs';
import fs from 'node:fs';
import path from 'node:path';
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? Number(a.slice(k.length + 3)) : d; };
const dir = path.resolve(process.argv.find((a, i) => i > 1 && !a.startsWith('--')) || 'desktop/build/game', 'world');
const SCAN = process.argv.includes('--scan');
const BUDGET = arg('budget', undefined), SPEED = arg('speed', 33), HZ = arg('hz', 20);
const TW = await import('../../game/js/tileworld.js');
const heap = () => { for (let i = 0; i < 4; i++) global.gc(); return process.memoryUsage().heapUsed; };
const source = {
  requests: 0, bytes: 0,
  async read(file, off, len) { const fd = fs.openSync(path.join(dir, file), 'r'); const b = new Uint8Array(len); fs.readSync(fd, b, 0, len, off); fs.closeSync(fd); return b; },
  async readAll(file) { return new Uint8Array(fs.readFileSync(path.join(dir, file))); },
};
let clock = 0;
const opts = { source, pool: false, now: () => clock, extra: [{ name: 'index-provincie.json' }, { name: 'index-corridor.json' }] };
if (BUDGET !== undefined) opts.budgetBytes = BUDGET;
// PERF: the time of every addTile and dropTile on the main thread (what the FrameQueue runs, tilestore.js), per item
const times = { add: [], drop: [] };
for (const [k, name] of [['add', 'addTile'], ['drop', 'dropTile']]) {
  const orig = TW.TileWorld.prototype[name];
  TW.TileWorld.prototype[name] = function (...a) { const t = performance.now(); try { return orig.apply(this, a); } finally { times[k].push(performance.now() - t); } };
}
const h0 = heap();
const { world, store, index } = await TW.loadTileWorld('world/', opts);
if (SCAN) world.scanDrops = true;
const g = index.layers.provincie.global;
const place = (n) => { const q = g.places.find((x) => x.name === n) || g.stations.find((x) => x.name === n || x.key === n); if (!q) throw new Error('no place ' + n); return [q.x, q.y]; };
const A7 = ['Groningen', 'Hoogezand', 'Zuidbroek', 'Scheemda', 'Winschoten', 'Bad Nieuweschans'].map(place);
const RAIL = ['Groningen', 'Winsum', 'Warffum', 'Uithuizen', 'Roodeschool', 'Eemshaven'].map(place);
const route = [...A7, ...A7.slice(0, -1).reverse(), ...RAIL.slice(1), ...RAIL.slice(0, -1).reverse()];
const acc = [0];
for (let i = 1; i < route.length; i++) acc.push(acc[i - 1] + Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]));
const len = acc[acc.length - 1];
const at = (s) => { s = Math.min(len, s); let i = 1; while (i < acc.length - 1 && acc[i] < s) i++; const t = (s - acc[i - 1]) / ((acc[i] - acc[i - 1]) || 1); return [route[i - 1][0] + (route[i][0] - route[i - 1][0]) * t, route[i - 1][1] + (route[i][1] - route[i - 1][1]) * t]; };
const dt = 1000 / HZ;
let late = 0, frames = 0, peakRaw = 0, peakTiles = 0;
const [x0, y0] = at(0);
store.prefetch(x0, y0, { radius: 1500 });
for (let k = 0; k < 100; k++) { clock += 20; await new Promise((r) => setImmediate(r)); world.tileQueue.run(1e9); }
for (let f = 0; f * dt / 1000 * SPEED < len; f++) {
  const s = f * dt / 1000 * SPEED, [x, y] = at(s), [x1, y1] = at(s + SPEED * 0.1);
  clock += dt;
  world.follow(x, y, { vx: (x1 - x) * 10, vy: (y1 - y) * 10, radius: 1500 }, 2);
  await new Promise((r) => setImmediate(r));
  frames++;
  for (const k of store.keysAround(x, y, 250)) if (!store.ready(k) || !world.resident.has(`${store.index.tiles[k].i},${store.index.tiles[k].j}`)) late++;
  peakRaw = Math.max(peakRaw, store.residentBytes);
  peakTiles = Math.max(peakTiles, store.residentKeys.length);
}
for (let k = 0; k < 50; k++) { clock += 20; await new Promise((r) => setImmediate(r)); world.tileQueue.run(1e9); }
const hEnd = heap() - h0;
const stat = (a) => { const b = [...a].sort((x, y) => x - y), q = (p) => b[Math.min(b.length - 1, Math.floor(b.length * p))] || 0; return { n: b.length, sum: +b.reduce((x, y) => x + y, 0).toFixed(0), p50: +q(0.5).toFixed(1), p95: +q(0.95).toFixed(1), max: +(b[b.length - 1] || 0).toFixed(1) }; };
console.log('itemtijden (ms):', JSON.stringify({ addTile: stat(times.add), dropTile: stat(times.drop) }));
// a digest of what the world holds now: the rows per kind with a checksum of their ids, and what the lookup grids hold
const digest = {};
for (const kind of Object.keys(world._res)) { let sum = 0; for (const gid of world._res[kind].keys()) sum = (sum + (typeof gid === "number" ? gid % 1000003 : String(gid).length) * 2654435) % 4294967296; digest[kind] = [world._res[kind].size, sum]; }
for (const grid of ['buildingGrid', 'roadGrid', 'waterGrid', 'greenGrid', 'railGrid', 'parcelGrid', 'flatWaterGrid', 'hedgeGrid']) if (world[grid]) { const all = new Set(); for (const arr of world[grid].map.values()) for (const o of arr) all.add(o); digest[grid] = all.size; }
digest.resident = world.resident.size; digest.furniture = world.furniture ? world.furniture.length : 0;
console.log('digest:', JSON.stringify(digest));
console.log(JSON.stringify({ budget: store.budgetBytes, km: +(len / 1000).toFixed(1), speed: SPEED, frames, late, loads: store.stats.loads, evictions: store.stats.evictions,
  peakResidentTiles: peakTiles, peakRawMB: +(peakRaw / 1e6).toFixed(1), endResidentTiles: store.residentKeys.length, endHeapMB: Math.round(hEnd / 1048576) }));
