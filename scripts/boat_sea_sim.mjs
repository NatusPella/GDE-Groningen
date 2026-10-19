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

// start points: every ~Nth vertex of the long coast chains, 300 m out to sea
const n = opt('--n', 24), secs = opt('--secs', 120), DT = 1 / 30;
const pts = [];
for (const L of edge.coast) for (let i = 0; i + 1 < L.pts.length; i++) {
  const a = L.pts[i], b = L.pts[i + 1];
  if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 150) continue;
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  for (const s of [1, -1]) {
    const nx = -(b[1] - a[1]), ny = b[0] - a[0], k = Math.hypot(nx, ny) || 1;
    const x = mx + (s * nx / k) * 300, y = my + (s * ny / k) * 300;
    const o = outsideDist(x, y, edge.coast);
    if (o && o.d > 250 && seaAt(x, y)) { pts.push({ x, y, ax: (s * nx) / k, ay: (s * ny) / k, kind: L.kind }); break; }
  }
}
const step = Math.max(1, Math.floor(pts.length / n));
const starts = pts.filter((_, i) => i % step === 0).slice(0, n);

// and the way a player gets there: out of the water the map has (the open-sea strips of the
// fixes) in every direction; without the sea the first metre past it is a wall
const fixes = JSON.parse(fs.readFileSync(new URL('../game/vaarnet_fixes.json', import.meta.url), 'utf8'));
const wet = [];
for (const g of fixes.zee || []) if (g[2] > 1000) for (const da of [0, Math.PI / 2, Math.PI, -Math.PI / 2, Math.PI / 4, -Math.PI / 4, (3 * Math.PI) / 4, (-3 * Math.PI) / 4]) wet.push({ x: g[0], y: g[1], ang: g[4] + da, kind: g[6] });

const model = BOAT_KINDS.sloep;
let bumpsTotal = 0, boatsHit = 0;
const runs = [];
for (const st of starts) for (const [label, ang] of [['seaward', Math.atan2(st.ay, st.ax)], ['along', Math.atan2(st.ay, st.ax) + Math.PI / 2]]) runs.push({ st, label, ang });
for (const w of wet) runs.push({ st: { x: w.x, y: w.y, kind: w.kind }, label: 'strip ' + Math.round((w.ang * 180) / Math.PI), ang: w.ang });
{
  for (const { st, label, ang } of runs) {
    await loadAround(st.x, st.y);
    const v = new Vehicle(st.x, st.y, ang, { ...model });
    v.isBoat = true; v.driver = 'player'; v.speed = 0;
    let bumps = 0, shore = 0, first = null, t = 0, why = 'time';
    for (; t < secs; t += DT) {
      if (Math.floor(t / DT) % 60 === 0) await loadAround(v.x, v.y);
      const o = outsideDist(v.x, v.y, edge.coast);
      if (o && o.d > seaM - 300) { why = 'sea limit'; break; }
      if (!drivePlayerBoat(v, map, DT, 1, 0, false)) {
        // a bump within 20 m of the coast is the shore, as it should be
        if (o && o.d < 20) { shore++; continue; }
        bumps++;
        if (!first) {
          const tw = waterIndexAt(map, v.x, v.y);
          first = `at ${Math.round(v.x)},${Math.round(v.y)} t=${t.toFixed(0)}s ${regionAt(v.x, v.y).id} coast ${o ? Math.round(o.d) : '?'} m, clearance ${waterClearance(map, v.x, v.y, 4).toFixed(1)}, seaAt ${seaAt(v.x, v.y)}, a water row ${tw && tw.inWater(v.x, v.y)}`;
        }
      }
    }
    bumpsTotal += bumps; if (bumps) boatsHit++;
    console.log(`${st.kind} ${label.padEnd(7)} from ${Math.round(st.x)},${Math.round(st.y)}: ${bumps ? bumps + ' bumps in open water, first ' + first : 'no bump in open water'}${shore ? ` (${shore} on the coast)` : ''} (${why}, ${Math.round(Math.hypot(v.x - st.x, v.y - st.y))} m sailed)`);
  }
}
console.log(`${runs.length} runs, ${boatsHit} with a bump in open water, ${bumpsTotal} such bumps${process.env.SEA_OFF ? ' (SEA_OFF)' : ''}`);
process.exit(boatsHit && !process.env.SEA_OFF ? 1 : 0);
