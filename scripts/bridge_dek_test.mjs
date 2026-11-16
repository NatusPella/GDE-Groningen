// Een brug over water houdt zijn dek (#884): de wegribbon van een brug op
// straatniveau werd op het water tot nul breedte geknipt, zodat je door de brug
// heen keek. Deze test bouwt de echte bruggen rond Visvliet en meet de breedte
// van het wegdek boven het water.
//   node scripts/bridge_dek_test.mjs   (zonder game/world: SKIP)
import fs from 'node:fs';
import '../scripts/node3d.mjs';

const root = new URL('../game/world/', import.meta.url);
if (!fs.existsSync(new URL('index-provincie.json', root))) { console.log('SKIP bridge_dek_test: geen game/world met de provincie'); process.exit(0); }

const S = await import('../game/js/tilestore.js');
const TW = await import('../game/js/tileworld.js');
const PW = await import('../game/js/provinceworld.js');
const RS = await import('../game/js/roadsurface.js');
const G = await import('../game/js/gdt.js');

const files = new Proxy({}, { get: (o, f) => (typeof f === 'string' ? (o[f] || (o[f] = new Uint8Array(fs.readFileSync(new URL(f, root))))) : undefined) });
const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: ['index-provincie.json'] });
const map = T.world;
PW.initProvince({ index: T.index, world: map });
const X = -20965, Y = -4927;
const keys = new Set();
for (let dx = -300; dx <= 300; dx += 150) for (let dy = -300; dy <= 300; dy += 150) {
  const [i, j] = G.tileIndexOf(X + dx, Y + dy);
  const k = G.tileKey(i, j);
  if (T.index.tiles[k]) keys.add(k);
}
await Promise.all([...keys].map((k) => T.store.request(k, { priority: -1 })));
map.tileQueue.run(1e9);
RS.setRoadNetwork(map);

let n = 0, bad = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FAIL', m); } };
const bridges = map.roadsNear(X, Y, 80).filter((r) => r.bridge && !r.z && r.pts && r.pts.length >= 2);
ok(bridges.length > 0, 'er liggen bruggen op straatniveau rond Visvliet');
for (const r of bridges) {
  RS.buildRoadGroup(r);
  const geo = r._geoRoad;
  ok(!!geo, 'de brug heeft een wegdekgeometrie');
  if (!geo) continue;
  const pos = geo.attributes.position.array;
  const a = r.pts[0], b = r.pts[r.pts.length - 1];
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i], z = pos[i + 2];
    if (Math.hypot(x - mx, z - my) > 12) continue;
    const lat = (x - mx) * nx + (z - my) * ny;
    lo = Math.min(lo, lat); hi = Math.max(hi, lat);
  }
  const width = hi - lo;
  ok(width >= (r.width || 4) * 0.8, `${r.name || r.type}: het dek is ${width.toFixed(1)} m breed boven het water`);
  // (#919) het dek zelf: onder de wegribbon hoort een dichte plaat te zitten, ook als
  // de stenen oever van quaywalls.js nog niet is gestreamd (rand van de detailring)
  const group = RS.buildRoadGroup(r);
  let core = null;
  group.traverse((o) => { if (o.isMesh && o.userData.roadStructure) core = o; });
  ok(!!core, `${r.name || r.type}: de vlakke brug heeft een eigen dek onder de weg`);
  if (core) {
    const cp = core.geometry.attributes.position.array;
    let minY = Infinity, maxY = -Infinity;
    for (let i = 1; i < cp.length; i += 3) { minY = Math.min(minY, cp[i]); maxY = Math.max(maxY, cp[i]); }
    ok(minY < -0.3 && maxY <= 0.01, `${r.name || r.type}: het dek steekt onder de weg door (${minY.toFixed(2)}..${maxY.toFixed(2)})`);
    // (#919) de bovenkant van de kern ligt boven de waterspiegel (0), anders dekt
    // het water dat later getekend wordt de bovenkant af en lijkt de brug doorzichtig
    ok(maxY > 0.002, `${r.name || r.type}: de bovenkant van het dek ligt boven water (${maxY.toFixed(3)})`);
  }
}
console.log(`bridge_dek_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
