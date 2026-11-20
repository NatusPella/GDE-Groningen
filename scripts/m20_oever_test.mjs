// #955: M20 (Het beleg van Bourtange): elke stap van de missie is te voet te halen zonder de gracht in te gaan.
// De noordwal (bourtangeWalB) lag aan de overkant van een brede gracht: 790 m lopen om voor 60 m hemelsbreed, en de
// route van het spel eindigde 52 m ervoor. De test loopt de stappen af (droge cellen van 2 m, een brug telt droog) en
// eist dat elk been niet meer dan 2,5x de hemelsbreedte kost (plus 40 m).
//   node scripts/m20_oever_test.mjs   (zonder game/world: SKIP)
import fs from 'node:fs';
import './node3d.mjs';

const root = new URL('../game/world/', import.meta.url);
if (!fs.existsSync(new URL('index-provincie.json', root))) { console.log('SKIP m20_oever_test: geen game/world met de provincie'); process.exit(0); }
const S = await import('../game/js/tilestore.js');
const TW = await import('../game/js/tileworld.js');
const PW = await import('../game/js/provinceworld.js');
const G = await import('../game/js/gdt.js');
const { isInWater, pointInPolygon } = await import('../game/js/util.js');
const { wgsToWorld } = await import('../game/js/rdnew.js');
const { patchRows } = await import('../game/js/vaarnet.js');

// de plekken uit de bron van de missie (niet geexporteerd): bourtange<Naam>: [lat, lon]
const src = fs.readFileSync(new URL('../game/js/missions_akte4.js', import.meta.url), 'utf8');
const P = {};
for (const m of src.matchAll(/^\s*(bourtange\w+): \[([\d.]+), ([\d.]+)\]/gm)) P[m[1]] = wgsToWorld(Number(m[2]), Number(m[3]));
// de volgorde van de stappen in M20: elke stap loopt van het vorige doel naar dit doel
const ORDER = ['bourtangeWal', 'bourtangeWalB', 'bourtangeGracht', 'bourtangeKruit', 'bourtangeKruitB', 'bourtangeKruitC', 'bourtangePoort'];

const files = new Proxy({}, { get: (o, f) => (typeof f === 'string' ? (o[f] || (o[f] = new Uint8Array(fs.readFileSync(new URL(f, root))))) : undefined) });
const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: ['index-provincie.json'] });
const map = T.world;
PW.initProvince({ index: T.index, world: map });
const keys = new Set();
const [cx, cy] = P.bourtangeKruit;
for (let dx = -400; dx <= 400; dx += 100) for (let dy = -400; dy <= 400; dy += 100) {
  const [i, j] = G.tileIndexOf(cx + dx, cy + dy);
  const k = G.tileKey(i, j);
  if (T.index.tiles[k]) keys.add(k);
}
await Promise.all([...keys].map((k) => T.store.request(k, { priority: -1 })));
map.tileQueue.run(1e9);
map.addWaterPatches(patchRows(JSON.parse(fs.readFileSync(new URL('../game/vaarnet_fixes.json', import.meta.url), 'utf8'))).filter((r) => !r.strip));

let n = 0, bad = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };
const inBuilding = (x, y) => map.buildingsNear(x, y, 0.4).some((b) => {
  const [a, c, d, e] = b.bounds;
  return x >= a && x <= d && y >= c && y <= e && pointInPolygon(x, y, b.pts);
});
const free = (x, y) => !isInWater(map, x, y) && !inBuilding(x, y);

const CELL = 2, NW = 400, NH = 400, X0 = cx - 400, Y0 = cy - 400;
const cellOf = (x, y) => [Math.floor((x - X0) / CELL), Math.floor((y - Y0) / CELL)];
function lopen(a) {
  const dist = new Int32Array(NW * NH).fill(-1);
  const [sx, sy] = cellOf(a[0], a[1]);
  const q = [sy * NW + sx];
  dist[q[0]] = 0;
  for (let h = 0; h < q.length; h++) {
    const k = q[h], i = k % NW, j = (k - i) / NW;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= NW || nj >= NH) continue;
      const nk = nj * NW + ni;
      if (dist[nk] >= 0 || !free(X0 + (ni + 0.5) * CELL, Y0 + (nj + 0.5) * CELL)) continue;
      dist[nk] = dist[k] + 1;
      q.push(nk);
    }
  }
  return (p) => { const [i, j] = cellOf(p[0], p[1]); const d = dist[j * NW + i]; return d < 0 ? Infinity : d * CELL; };
}

ok(ORDER.every((k) => P[k]), 'alle M20-plekken staan in de bron');
for (let s = 1; s < ORDER.length; s++) {
  const a = P[ORDER[s - 1]], b = P[ORDER[s]];
  const hemel = Math.hypot(a[0] - b[0], a[1] - b[1]);
  const pad = lopen(a)(b);
  ok(!isInWater(map, b[0], b[1]), `${ORDER[s]} ligt niet in het water`);
  ok(pad <= hemel * 2.5 + 40, `${ORDER[s - 1]} naar ${ORDER[s]}: ${Math.round(pad)} m lopen voor ${Math.round(hemel)} m hemelsbreed`);
}
console.log(bad ? `${bad} van ${n} mislukt` : `m20_oever_test: ok (${n} controles)`);
process.exit(bad ? 1 : 0);
