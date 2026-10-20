// The Ommeland's real tiles (#165): drive along the centre line of every car
// road in a sample of tiles and ask the off-road ground rule what the tyres are
// on. On a mapped road it must be hard ground; the same rule without the roads
// (how it behaved before) shows how many places dragged a car.
// Needs game/world with the province layer.
//   node scripts/offroad_scan_test.mjs [stride]
import './node3d.mjs';
import fs from 'node:fs';

globalThis.requestAnimationFrame = (f) => setImmediate(f);
const root = new URL('../game/world/', import.meta.url);
if (!fs.existsSync(new URL('index-provincie.json', root))) { console.log('SKIP no game/world with the province layer'); process.exit(0); }
await import('../game/js/mapdata.js');
await import('../game/js/player.js');
const G = await import('../game/js/gdt.js');
const S = await import('../game/js/tilestore.js');
const TW = await import('../game/js/tileworld.js');
const V = await import('../game/js/vehicle.js');

const files = new Proxy({}, { get: (o, f) => (typeof f === 'string' ? (o[f] || (o[f] = new Uint8Array(fs.readFileSync(new URL(f, root))))) : undefined) });
const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: ['index-provincie.json'] });
if (!T) { console.log('SKIP no tile index'); process.exit(0); }
const map = T.world, idx = T.index;
V.setGroundMap && V.setGroundMap(map);
const stride = Number(process.argv[2]) || 40;
const keys = Object.keys(idx.tiles).filter((k, i) => i % stride === 0);
let roads = 0, samples = 0, bad = 0, legacy = 0;
const blind = Object.create(map);
blind.roadsNear = () => [];
const examples = [];
for (const k of keys) {
  await T.store.request(k, { priority: -1 });
  map.tileQueue.run(1e9);
  const t = idx.tiles[k];
  const o = G.tileOrigin(t.i, t.j);
  const seen = new Set();
  for (const r of map.roadsNear(o[0] + 500, o[1] + 500, 520)) {
    if (seen.has(r) || !(r.cat === 'major' || r.cat === 'normal' || r.cat === 'minor') || r.bridge || r.tunnel) continue;
    seen.add(r); roads++;
    const P = r.pts;
    for (let i = 0; i < P.length - 1; i++) {
      const L = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]);
      for (let s = 0; s < L; s += 6) {
        const x = P[i][0] + (P[i + 1][0] - P[i][0]) * s / L, y = P[i][1] + (P[i + 1][1] - P[i][1]) * s / L;
        if (x < o[0] || x >= o[0] + 1000 || y < o[1] || y >= o[1] + 1000) continue;
        samples++;
        const g = V.offroadGround(map, x, y);
        if (g) { bad++; if (examples.length < 5) examples.push([Math.round(x), Math.round(y), g, r.name || r.type]); }
        if (V.offroadGround(blind, x, y)) legacy++;
      }
    }
  }
}
console.log(`${keys.length} tiles, ${roads} car roads, ${samples} samples on centre lines: ${bad} off-road with the fix, ${legacy} without the roads in view`);
for (const e of examples) console.log('  still off-road at', e.join(' '));
process.exit(bad ? 1 : 0);
