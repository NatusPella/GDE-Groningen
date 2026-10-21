// De vaarroute van de binnenstad naar de Waddenzee ligt op water (#184, #232): de punten van de route van het vaarnet
// (game/vaarnet.json) liggen, met de gestreamde tegels en de gaten van vaarnet_fixes.json erin, in water of onder een
// brug of in een sluis; geen route over land. Heeft game/world met de provincie nodig (desktop stage).
//   node scripts/vaar_route_water_test.mjs
import './node3d.mjs';
import fs from 'node:fs';

globalThis.requestAnimationFrame = (f) => setImmediate(f);
const full = (d) => fs.existsSync(new URL('index.json', d)) && fs.existsSync(new URL('index-provincie.json', d));
const root = new URL('../game/world/', import.meta.url);
if (!full(root)) { console.log('SKIP vaar_route_water_test: geen game/world met de provincie'); process.exit(0); }
const G = await import('../game/js/gdt.js');
const S = await import('../game/js/tilestore.js');
const TW = await import('../game/js/tileworld.js');
const L = await import('../game/js/waterlevels.js');
const V = await import('../game/js/vaarnet.js');
const files = new Proxy({}, { get: (o, f) => (typeof f === 'string' ? (o[f] || (o[f] = new Uint8Array(fs.readFileSync(new URL(f, root))))) : undefined) });
const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: ['index-provincie.json'] });
const map = T.world;
const game = new URL('../game/', import.meta.url);
const net = V.createVaarNet(JSON.parse(fs.readFileSync(new URL('vaarnet.json', game), 'utf8')));
map.addWaterPatches(V.patchRows(JSON.parse(fs.readFileSync(new URL('vaarnet_fixes.json', game), 'utf8'))));
const lau = JSON.parse(fs.readFileSync(new URL('index-provincie.json', root), 'utf8')).global.places.find((p) => p.name === 'Lauwersoog');
let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };
// het begin: de Gerrit Krolbrug in de stad ligt op (0, 0) van de kaart; het doel is het zeeknooppunt van het vaarnet bij Lauwersoog
// (de tong voorbij de Robbengatsluis). Het eerste water bij het dorp (de vijver achter de dijk) is sinds de dammen (#349) een eiland.
const zee = net.nodes[net.hubs['Waddenzee bij Lauwersoog']];
const r = V.planVaarRoute(net, [-1448, -74], [zee.x, zee.y], 'rondvaart', { snapMax: 3000 });
ok(!!r && r.pts.length > 50, 'er is een vaarroute van de binnenstad naar Lauwersoog', r && String(r.pts.length));
const samples = [];
if (r) for (let i = 1; i < r.pts.length; i++) {
  const a = r.pts[i - 1], b = r.pts[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.ceil(d / 25));
  for (let t = 0; t < k; t++) samples.push([a[0] + ((b[0] - a[0]) * t) / k, a[1] + ((b[1] - a[1]) * t) / k]);
}
const keys = new Set();
for (const [x, y] of samples) { const [i, j] = G.tileIndexOf(x, y); keys.add(G.tileKey(i, j)); }
await Promise.all([...keys].map((k) => T.store.request(k, { priority: -1 })));
map.tileQueue.run(1e9);
const sluizen = JSON.parse(fs.readFileSync(new URL('sluizen.json', game), 'utf8')).sluizen || [];
const EDGE_M = 8;
let dry = 0, bridge = 0, lock = 0, edge = 0; const ex = [];
for (const [x, y] of samples) {
  if (L.waterAt(map, x, y)) continue;
  // onder een brug of in een sluis is het water van de kaart soms onderbroken: dat telt niet
  if (map.roadsNear(x, y, 30).some((q) => q.bridge)) { bridge++; continue; }
  if (sluizen.some((k) => Math.hypot(k.x - x, k.y - y) < (k.half || 60) + 60)) { lock++; continue; }
  // hoever het dichtstbijzijnde water ligt (stappen van 4 m, acht richtingen): de hartlijn van het net ligt in een smal kanaal soms een paar meter ernaast
  let near = 999;
  for (let d = 4; d <= 80 && near === 999; d += 4) for (let a = 0; a < 8; a++) if (L.waterAt(map, x + Math.cos(a * 0.785) * d, y + Math.sin(a * 0.785) * d)) { near = d; break; }
  if (near <= EDGE_M) { edge++; continue; }
  dry++;
  if (ex.length < 12) ex.push(`${Math.round(x)},${Math.round(y)}[${near === 999 ? '>80' : near} m]`);
}
const share = dry / Math.max(1, samples.length);
console.log(`route ${r ? Math.round(r.length) : 0} m, ${samples.length} punten in ${keys.size} tegels, ${dry} zonder water (en ${bridge} onder een brug, ${lock} bij een sluis, ${edge} binnen ${EDGE_M} m van water) (${(100 * share).toFixed(1)}%) ${ex.join(' ')}`);
ok(share <= 0.02, 'de route ligt op water (hoogstens 2% van de punten erbuiten)', `${(100 * share).toFixed(1)}%`);
console.log(`${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
