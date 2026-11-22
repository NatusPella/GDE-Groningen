// Verkenning van Vesting Bourtange op de geladen tegels (monumentgebied, #953): telt wat er in en rond de vesting ligt
// (wegen per klasse, bruggen met hoogteprofiel, gebouwen per type, water, bomen) en schrijft een tabel naar stdout.
//   node scripts/bourtange_scan.mjs [straal=330]   (zonder game/world: SKIP)
import fs from 'node:fs';
import './node3d.mjs';

const root = new URL('../game/world/', import.meta.url);
if (!fs.existsSync(new URL('index-provincie.json', root))) { console.log('SKIP bourtange_scan: geen game/world met de provincie'); process.exit(0); }
const S = await import('../game/js/tilestore.js');
const TW = await import('../game/js/tileworld.js');
const PW = await import('../game/js/provinceworld.js');
const G = await import('../game/js/gdt.js');
const { BOURTANGE } = await import('../game/js/missions_akte6.js');
const R = Number(process.argv[2]) || 330;
const files = new Proxy({}, { get: (o, f) => (typeof f === 'string' ? (o[f] || (o[f] = new Uint8Array(fs.readFileSync(new URL(f, root))))) : undefined) });
const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: ['index-provincie.json'] });
const map = T.world;
PW.initProvince({ index: T.index, world: map });
const keys = new Set();
for (let dx = -R; dx <= R; dx += 100) for (let dy = -R; dy <= R; dy += 100) {
  const [i, j] = G.tileIndexOf(BOURTANGE.plein[0] + dx, BOURTANGE.plein[1] + dy);
  const k = G.tileKey(i, j);
  if (T.index.tiles[k]) keys.add(k);
}
await Promise.all([...keys].map((k) => T.store.request(k, { priority: -1 })));
map.tileQueue.run(1e9);
const [cx, cy] = BOURTANGE.plein;
const inR = (x, y) => Math.hypot(x - cx, y - cy) <= R;
const count = (m, k) => m.set(k, (m.get(k) || 0) + 1);
const roads = new Map(), bridges = [], blds = new Map(), names = [];
for (const r of map.roadsNear(cx, cy, R + 50)) {
  const mid = r.pts[Math.floor(r.pts.length / 2)];
  if (!inR(mid[0], mid[1])) continue;
  count(roads, `${r.cat}/${r.type}`);
  if (r.bridge || (r.z && r.z.some((v) => Math.abs(v) > 0.3))) bridges.push({ id: r.id, cat: r.cat, type: r.type, bridge: !!r.bridge, dropped: !!r.deckDropped, zmax: r.z ? Math.max(...r.z).toFixed(1) : '-', len: r.pts.length, at: mid.map(Math.round).join(',') });
}
for (const b of map.buildingsNear(cx, cy, R + 50)) {
  const m = b.pts[0];
  if (!inR(m[0], m[1])) continue;
  count(blds, `${b.type || 'yes'}${b.landmark ? '*' : ''}`);
  if (b.name) names.push(`${b.name} (${b.type || 'yes'}) @${Math.round(m[0])},${Math.round(m[1])}`);
}
console.log(`straal ${R} m rond het Marktplein`);
console.log('wegen:', JSON.stringify([...roads.entries()].sort((a, b) => b[1] - a[1])));
console.log('gebouwen:', JSON.stringify([...blds.entries()].sort((a, b) => b[1] - a[1])));
console.log('namen:', names.slice(0, 40).join(' | '));
console.log('bruggen/profielen:'); for (const b of bridges.slice(0, 60)) console.log(' ', JSON.stringify(b));
console.log('water:', map.waterNear(cx, cy, R).length, 'bomen:', map.treesNear(cx, cy, R).length);
