// #955: M30 (Het proefbeleg) loopt de punten van Bourtange af zoals het spel ze oplost: elk punt gaat door roadSpot
// (het dichtstbijzijnde pad, tot 120 m ver) tenzij de stap `snap: null` meegeeft. Bolwerk 1 en 3 werden zo 36 m en 30 m
// verschoven naar het pad aan de overkant van de gracht (930 m lopen van de brug naar bolwerk 1 voor 117 m
// hemelsbreed); bourtange_test keurde alleen de ongeschoven plekken. Deze test lost de punten op zoals het spel en
// eist dat elk been niet meer dan 4,5x de hemelsbreedte kost (plus 60 m): de vesting heeft maar enkele bruggen.
//   node scripts/m30_bolwerk_test.mjs   (zonder game/world: SKIP)
import fs from 'node:fs';
import './node3d.mjs';

const root = new URL('../game/world/', import.meta.url);
if (!fs.existsSync(new URL('index-provincie.json', root))) { console.log('SKIP m30_bolwerk_test: geen game/world met de provincie'); process.exit(0); }
const S = await import('../game/js/tilestore.js');
const TW = await import('../game/js/tileworld.js');
const PW = await import('../game/js/provinceworld.js');
const G = await import('../game/js/gdt.js');
const { isInWater, pointInPolygon } = await import('../game/js/util.js');
const { patchRows } = await import('../game/js/vaarnet.js');

const src = fs.readFileSync(new URL('../game/js/missions_akte6.js', import.meta.url), 'utf8');
const tabel = /export const BOURTANGE = \{([\s\S]*?)\n\};/.exec(src)[1];
const P = {};
for (const m of tabel.matchAll(/^\s*(\w+): \[(\d+), (\d+)\]/gm)) P[m[1]] = [Number(m[2]), Number(m[3])];
// de volgorde van de stappen van M30 (de gracht eerst, het plein als laatste); `snap: null` uit de bron
const ORDER = ['gracht', 'brug', 'bolwerk1', 'bolwerk2', 'bolwerk3', 'poort', 'plein'];
const rauw = (k) => new RegExp(`bourtangeAt\\('${k}', '[^']+', \\{ snap: null \\}\\)`).test(src);

const files = new Proxy({}, { get: (o, f) => (typeof f === 'string' ? (o[f] || (o[f] = new Uint8Array(fs.readFileSync(new URL(f, root))))) : undefined) });
const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: ['index-provincie.json'] });
const map = T.world;
PW.initProvince({ index: T.index, world: map });
const [cx, cy] = P.plein;
const keys = new Set();
for (let dx = -500; dx <= 500; dx += 100) for (let dy = -500; dy <= 500; dy += 100) {
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
// zoals roadSpot in missions.js
const oplossen = (k) => {
  const [x, y] = P[k];
  if (rauw(k)) return [x, y];
  const p = map.nearestRoadPoint(x, y, 120, false) || { x, y, road: null };
  if (!map.isOpenSpot || map.isOpenSpot(p.x, p.y)) return [p.x, p.y];
  const q = map.findOpenSpawn(p.x, p.y, 200, false) || p;
  return [q.x, q.y];
};

const CELL = 2, NW = 400, NH = 400, X0 = cx - 400, Y0 = cy - 400;
const cellOf = (x, y) => [Math.floor((x - X0) / CELL), Math.floor((y - Y0) / CELL)];
const lopen = (a) => {
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
};

ok(ORDER.every((k) => P[k]), 'alle Bourtange-plekken staan in de bron');
const pts = ORDER.map(oplossen);
ORDER.forEach((k, i) => ok(!isInWater(map, pts[i][0], pts[i][1]), `${k} ligt (opgelost) niet in het water`));
for (let s = 1; s < ORDER.length; s++) {
  const a = pts[s - 1], b = pts[s];
  const hemel = Math.hypot(a[0] - b[0], a[1] - b[1]);
  const pad = lopen(a)(b);
  ok(pad <= hemel * 4.5 + 60, `${ORDER[s - 1]} naar ${ORDER[s]}: ${Math.round(pad)} m lopen voor ${Math.round(hemel)} m hemelsbreed`);
}
console.log(bad ? `${bad} van ${n} mislukt` : `m30_bolwerk_test: ok (${n} controles)`);
process.exit(bad ? 1 : 0);
