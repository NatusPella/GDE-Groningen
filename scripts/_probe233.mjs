// Sails boats straight out over the Wadden, the Eems and the Dollard (#233) with the
// real boat physics (drivePlayerBoat) over the real streamed tiles + the water patches:
// from points off the coast, throttle on, the wheel straight, for up to 120 s or until the
// world edge's sea limit. Every bump is logged with the position, the distance to the
// coast and what the shore test saw there (a water row, the sea, nothing).
//   node scripts/boat_sea_sim.mjs [--n 24] [--secs 120]     (SEA_OFF=1: without the sea, the old way)
// Needs game/world with the province layer; SKIPs without.
import './node3d.mjs';
import fs from 'node:fs';
import zlib from 'node:zlib';

const { Vehicle, drivePlayerBoat } = await import('../game/js/vehicle.js');
const { setCountryBounds } = await import('../game/js/countryfield.js');
const { waterClearance, setSeaClearance, waterIndexAt } = await import('../game/js/waterindex.js');
const { BOAT_KINDS } = await import('../game/js/boattypes.js');
const { setRegionData, seaAt, regionAt } = await import('../game/js/regions.js');
const { outsideDist, coastKinds } = await import('../game/js/worldedge.js');
const { patchRows } = await import('../game/js/vaarnet.js');
const S = await import('../game/js/tilestore.js');
const TW = await import('../game/js/tileworld.js');
const G = await import('../game/js/gdt.js');

globalThis.requestAnimationFrame = (f) => setImmediate(f);
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? Number(args[args.indexOf(k) + 1]) : d);
const root = new URL('../game/world/', import.meta.url);
if (!fs.existsSync(new URL('index-provincie.json', root))) { console.log('SKIP no game/world with the province layer'); process.exit(0); }
const files = new Proxy({}, { get: (o, f) => (typeof f === 'string' ? (o[f] || (o[f] = new Uint8Array(fs.readFileSync(new URL(f, root))))) : undefined) });
const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: ['index-provincie.json'] });
const map = T.world;
setCountryBounds(map.meta.bounds);
const idx = JSON.parse(fs.readFileSync(new URL('index-provincie.json', root), 'utf8'));
setRegionData(idx.global);
if (process.env.SEA_OFF) setSeaClearance(null);
const edge = coastKinds(idx.global.edge);
const seaM = edge.seaM || 3000;
map.addWaterPatches(patchRows(JSON.parse(fs.readFileSync(new URL('../game/vaarnet_fixes.json', import.meta.url), 'utf8'))));

const loaded = new Set();
async function loadAround(x, y, r = 700) {
  const keys = new Set();
  for (const dx of [-r, 0, r]) for (const dy of [-r, 0, r]) {
    const [i, j] = G.tileIndexOf(x + dx, y + dy), k = G.tileKey(i, j);
    if (!loaded.has(k) && T.index.tiles[k]) keys.add(k);
  }
  for (const k of keys) loaded.add(k);
  if (keys.size) { await Promise.all([...keys].map((k) => T.store.request(k, { priority: -1 }))); map.tileQueue.run(1e9); }
}


const P = [[-24706,-21255],[-24711,-21250],[-24704,-21168],[-25001,-21474],[-24878,-21096],[-24827,-21558]];
for (const [x, y] of P) {
  await loadAround(x, y, 900);
  const wc = waterClearance(map, x, y, 40);
  const o = outsideDist(x, y, edge.coast);
  console.log(JSON.stringify({ x, y, clearance: +wc.toFixed(1), sea: !!seaAt(x, y), region: regionAt ? regionAt(x, y) : null, outside: o ? { d: Math.round(o.d), side: o.side } : null, water: !!(map.waterNear(x, y, 5).length) }));
}
// a sweep: clearance along the boat's last metres (-24706,-21255) heading 270 deg
for (let k = 0; k <= 40; k += 5) { const x = -24706 - k, y = -21255; console.log('x', x, waterClearance(map, x, y, 40).toFixed(1), !!seaAt(x, y)); }
for (let k = 0; k <= 60; k += 10) { const x = -24706, y = -21255 + k; console.log('y', y, waterClearance(map, x, y, 40).toFixed(1), !!seaAt(x, y)); }
process.exit(0);
