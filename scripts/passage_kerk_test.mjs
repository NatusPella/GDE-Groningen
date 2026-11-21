// #1057 (Usquert): twee voetpaden die op de west- en oostgevel van de Petrus en Pauluskerk doodlopen werden door linkDoors tot een hal
// door het gebouw verbonden; de speler liep zo het midden van de kerkkit in en zag de binnenkant ("enorme zwarte zuilen").
// Een kerk is een massief gebouw: zijn deuren blijven deuren, maar er komt geen hal doorheen. Een gewoon gebouw houdt zijn hal (de
// binnenplaats van het Academiegebouw). Eerst synthetisch, daarna (zonder game/world: SKIP) op de echte tegel van Usquert.
//   node scripts/passage_kerk_test.mjs
import fs from 'node:fs';
import './node3d.mjs';
const { passagesOf, isChurchBuilding } = await import('../game/js/passages.js');
const { resolveWalker } = await import('../game/js/collision.js');
const { pointInPolygon } = await import('../game/js/util.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

// 30 x 10 m, twee voetpaden van buiten tot op de gevel (de deur), op de korte zijden
const ring = [[0, 0], [30, 0], [30, 10], [0, 10], [0, 0]];
const foot = (pts) => ({ pts, cat: 'foot', type: 'footway', width: 1.8, bounds: [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))] });
const make = (extra) => {
  const roads = [foot([[-12, 5], [0.5, 5]]), foot([[42, 5], [29.5, 5]])];
  const b = { pts: ring, bounds: [0, 0, 30, 10], type: 'yes', ...extra };
  const map = { buildings: [b], roads, passageWays: [], buildingsNear: () => [b], roadsNear: () => roads, roadGrid: null };
  return { b, map };
};
const mid = (map) => {
  let x = -3, y = 5, inside = 0;
  for (let i = 0; i < 160; i++) {
    [x, y] = resolveWalker(x + 0.25, y, 0.35, map, 4, 0, null, 0, 0);
    if (pointInPolygon(x, y, ring)) inside++;
  }
  return { x, inside };
};

const gewoon = make({ name: 'Gildehuis' });
ok(passagesOf(gewoon.map, gewoon.b).some((p) => p.hall), 'een gewoon gebouw met twee tegenover elkaar liggende deuren houdt zijn hal');
const mg = mid(make({ name: 'Gildehuis' }).map); ok(mg.inside > 20, 'en een wandelaar loopt er doorheen', JSON.stringify(mg));

for (const [naam, extra] of [['naam Petrus en Pauluskerk', { name: 'Petrus en Pauluskerk' }], ['type church', { type: 'church' }], ['Sint-Jozefkathedraal', { name: 'Sint-Jozefkathedraal' }], ['type chapel', { type: 'chapel' }]]) {
  const k = make(extra);
  ok(isChurchBuilding(k.b), `${naam}: is een kerk`);
  ok(!passagesOf(k.map, k.b).some((p) => p.hall), `${naam}: geen hal door de kerk`);
  const w = mid(make(extra).map);
  ok(w.inside === 0 && w.x < 0.1, `${naam}: een wandelaar komt de kerk niet in`, `inside ${w.inside}, x ${w.x.toFixed(1)}`);
}
ok(!isChurchBuilding({ type: 'yes', name: 'Gildehuis' }) && !isChurchBuilding({ type: 'yes' }), 'geen kerk zonder kerknaam of -type');

// de echte tegel van Usquert
const root = new URL('../game/world/', import.meta.url);
if (!fs.existsSync(new URL('index-provincie.json', root))) {
  console.log(`${n - fails}/${n} checks passed (SKIP het echte-wereld-deel: geen game/world met de provincie)`);
  process.exit(fails ? 1 : 0);
}
const S = await import('../game/js/tilestore.js');
const TW = await import('../game/js/tileworld.js');
const PW = await import('../game/js/provinceworld.js');
const G = await import('../game/js/gdt.js');
const files = new Proxy({}, { get: (o, f) => (typeof f === 'string' ? (o[f] || (o[f] = new Uint8Array(fs.readFileSync(new URL(f, root))))) : undefined) });
const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: ['index-provincie.json'] });
const map = T.world;
PW.initProvince({ index: T.index, world: map });
const [X, Y] = [2769.7, -20431.3];
const [ti, tj] = G.tileIndexOf(X, Y);
await T.store.request(G.tileKey(ti, tj), { priority: -1 });
map.tileQueue.run(1e9);
const kerk = map.buildingsNear(X, Y, 5).find((b) => b.name === 'Petrus en Pauluskerk');
ok(!!kerk, 'Usquert: de Petrus en Pauluskerk staat op de tegel');
if (kerk) {
  ok(!passagesOf(map, kerk).some((p) => p.hall), 'Usquert: geen hal door de kerk');
  let inside = 0;
  for (const [sx, sy, dx, dy] of [[2750, -20431, 1, 0], [2805, -20431, -1, 0], [X, -20420, 0, -1], [X, -20445, 0, 1]]) {
    let x = sx, y = sy;
    for (let i = 0; i < 100; i++) {
      [x, y] = resolveWalker(x + dx * 0.25, y + dy * 0.25, 0.35, map, dx * 4, dy * 4, null, 0, 0);
      if (pointInPolygon(x, y, kerk.pts)) inside++;
    }
  }
  ok(inside === 0, 'Usquert: te voet is het midden van de kerkkit niet te bereiken', `${inside} stappen binnen`);
}
console.log(`${n - fails}/${n} checks passed`);
process.exit(fails ? 1 : 0);
