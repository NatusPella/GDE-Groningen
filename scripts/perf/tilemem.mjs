// De JS-heap van de tegelwereld in Node (#379): na het laden van de vaste stadstegels, en na elke 50 gestreamde tegels (alle tegels van de
// provincie-laag, in de volgorde van de index): het verschil per tegel en de verhouding met de ruwe bytes waar het geheugenbudget van de
// TileStore (budgetBytes, 150 MB) mee rekent.
//   node --expose-gc scripts/perf/tilemem.mjs [<map met world/, standaard desktop/build/game>] [--max=400]
import './../node3d.mjs';
import fs from 'node:fs';
import path from 'node:path';
const dir = path.resolve(process.argv.find((a, i) => i > 1 && !a.startsWith('--')) || 'desktop/build/game', 'world');
const MAX = Number((process.argv.find((a) => a.startsWith('--max=')) || '--max=400').slice(6));
const TW = await import('../../game/js/tileworld.js');
const MB = (n) => (n / 1048576).toFixed(0);
const heap = () => { for (let i = 0; i < 4; i++) global.gc(); return process.memoryUsage().heapUsed; };
const source = {
  requests: 0, bytes: 0,
  async read(file, off, len) { const fd = fs.openSync(path.join(dir, file), 'r'); const b = new Uint8Array(len); fs.readSync(fd, b, 0, len, off); fs.closeSync(fd); return b; },
  async readAll(file) { return new Uint8Array(fs.readFileSync(path.join(dir, file))); },
};
const h0 = heap();
const { world, store, index } = await TW.loadTileWorld('world/', { source, pool: false, extra: [{ name: 'index-provincie.json' }, { name: 'index-corridor.json' }] });
const h1 = heap();
console.log(`stad (vaste tegels, ${store.residentKeys.length} tegels, ${MB(store.residentBytes)} MB ruw): heap ${MB(h1 - h0)} MB`);
const keys = Object.keys(index.tiles).filter((k) => !store.ready(k)).slice(0, MAX);
store.budgetBytes = Infinity;
let n = 0, raw = 0;
for (const k of keys) {
  await store.request(k, { priority: 0 });
  world.tileQueue.run(1e9);
  raw += index.tiles[k].raw;
  if (++n % 50 === 0 || n === keys.length) {
    const h = heap() - h1;
    console.log(`+${String(n).padStart(4)} tegels (${MB(raw)} MB ruw): heap +${MB(h)} MB = ${(h / raw).toFixed(1)} x het ruwe formaat, ${(h / n / 1024).toFixed(0)} kB per tegel`);
  }
}
