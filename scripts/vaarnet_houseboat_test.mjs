// De woonboten van de provincie en de boot (#343), op de echte tegels: een woonboot is een afgemeerd obstakel zolang zijn tegel
// er is (en weg als de tegel weggaat), en geen tak van game/vaarnet.json loopt er doorheen of er binnen 1,5 m langs.
// Heeft game/world met de provinciewereld nodig; zonder dat SKIP.
//   node scripts/vaarnet_houseboat_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
import zlib from 'node:zlib';

globalThis.requestAnimationFrame = (f) => setImmediate(f);
const root = new URL('../game/world/', import.meta.url);
if (!fs.existsSync(new URL('index-provincie.json', root))) { console.log('SKIP no game/world with the province layer'); process.exit(0); }

const G = await import('../game/js/gdt.js');
const S = await import('../game/js/tilestore.js');
const TW = await import('../game/js/tileworld.js');
const WI = await import('../game/js/waterindex.js');
const V = await import('../game/js/vaarnet.js');
const { loadProvinceVaar } = await import('./world/vaarnet_data.mjs');

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };

// ------------------------------------------------ een woonboot in een streamtegel
const files = new Proxy({}, { get: (o, f) => (typeof f === 'string' ? (o[f] || (o[f] = new Uint8Array(fs.readFileSync(new URL(f, root))))) : undefined) });
const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: ['index-provincie.json'] });
const map = T.world;
const P = loadProvinceVaar(root);
ok(P.houseboats.length > 150, 'the province tiles hold their houseboats', String(P.houseboats.length));
const hb = P.houseboats.find((h) => h.osm === 276680127) || P.houseboats[0];
const cx = hb.pts.reduce((a, p) => a + p[0], 0) / hb.pts.length, cy = hb.pts.reduce((a, p) => a + p[1], 0) / hb.pts.length;
const [ti, tj] = G.tileIndexOf(cx, cy), key = G.tileKey(ti, tj);
ok(!!T.index.tiles[key], 'its tile is in the index', key);
await T.store.request(key, { priority: -1 });
map.tileQueue.run(1e9);
const mine = map.buildingsNear(cx, cy, 30).filter((b) => b.type === 'houseboat' && b.pts.length === hb.pts.length);
ok(mine.length >= 1, 'the tile brings the houseboat', String(mine.length));
ok(mine.every((b) => b._moor), 'and registers it as a moored obstacle');
ok(WI.insideWaterObstacle(map, cx, cy), 'a point in the hull is inside the obstacle');
ok(WI.waterClearance(map, cx, cy, 6) < 0, 'and has no free water');
map.dropTile(`${ti},${tj}`);
ok(!WI.insideWaterObstacle(map, cx, cy), 'the obstacle is gone with the tile');

// ------------------------------------------------ het vaarnet loopt er niet doorheen
const net = V.createVaarNet(JSON.parse(fs.readFileSync(new URL('../game/vaarnet.json', import.meta.url), 'utf8')));
const near = (x, y, ring, m) => {
  let inside = false, d2 = Infinity;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const ax = ring[j][0], ay = ring[j][1], bx = ring[i][0], by = ring[i][1];
    if ((ay > y) !== (by > y) && x < ax + (bx - ax) * (y - ay) / (by - ay)) inside = !inside;
    const ex = bx - ax, ey = by - ay, l2 = ex * ex + ey * ey, t = l2 > 1e-9 ? Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / l2)) : 0;
    d2 = Math.min(d2, (ax + ex * t - x) ** 2 + (ay + ey * t - y) ** 2);
  }
  return inside || d2 <= m * m;
};
const rings = P.houseboats.filter((h) => h.pts.length > 2).map((h) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of h.pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  return { pts: h.pts, osm: h.osm, box: [x0 - 1.5, y0 - 1.5, x1 + 1.5, y1 + 1.5] };
});
let hit = 0;
const hits = [];
for (const e of net.edges) {
  const L = e.pts;
  if (!L) continue;
  for (let i = 0; i + 1 < L.length; i++) {
    const len = Math.hypot(L[i + 1][0] - L[i][0], L[i + 1][1] - L[i][1]), m = Math.max(1, Math.ceil(len / 2));
    for (let s = 0; s <= m; s++) {
      const x = L[i][0] + (L[i + 1][0] - L[i][0]) * s / m, y = L[i][1] + (L[i + 1][1] - L[i][1]) * s / m;
      for (const r of rings) if (x >= r.box[0] && x <= r.box[2] && y >= r.box[1] && y <= r.box[3] && near(x, y, r.pts, 1.5)) { hit++; if (hits.length < 5) hits.push(`${r.osm}@${Math.round(x)},${Math.round(y)}`); }
    }
  }
}
ok(hit === 0, 'no edge of the waterway net runs through a houseboat or within 1.5 m of it', `${hit} points, ${hits.join(' ')}`);

console.log(`${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
