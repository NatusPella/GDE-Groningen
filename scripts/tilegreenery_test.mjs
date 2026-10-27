// Bomen en heggen van een gestreamde tegel naast de weg (#508): de groenhook van de bouwer zette de vulbomen van
// bos en kerkhof per tegel neer met alleen de wegen van díé tegel in beeld, en de gemapte heggen liepen over de
// rijbaan. Eerst op een kleine kaart met bekende uitkomsten (een weg net buiten de tegel, een boom op de rijbaan,
// een heg er dwars over), dan op de rijen van een gebouwde wereld (game/world of GAME_WORLD; zonder die: alleen het
// eerste deel): na de opruiming staat er geen boom op een rijbaan en geen heg over een weg, en de stap is gemeten.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SpatialGrid } from '../game/js/spatialgrid.js';
import { trimTileGreenery, trimHedgeRow, hedgeLines } from '../game/js/tilegreenery.js';

const hw = (r) => (r.width || 4) / 2;
const distTo = (r, x, y) => {
  let d = Infinity;
  for (let i = 0; i + 1 < r.pts.length; i++) {
    const a = r.pts[i], b = r.pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-9;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2));
    d = Math.min(d, Math.hypot(a[0] + dx * t - x, a[1] + dy * t - y));
  }
  return d;
};

// een wereld zoals het spel hem heeft: alleen de rasters die de opruiming vraagt
function makeWorld(roads) {
  const g = new SpatialGrid(64);
  const addRoad = (r) => {
    r.bounds = r.pts.reduce((b, p) => [Math.min(b[0], p[0]), Math.min(b[1], p[1]), Math.max(b[2], p[0]), Math.max(b[3], p[1])], [Infinity, Infinity, -Infinity, -Infinity]);
    g.insert(r, r.bounds);
    return r;
  };
  for (const r of roads) addRoad(r);
  return {
    addRoad,
    roadsNear: (x, y, rad) => g.query(x - rad, y - rad, x + rad, y + rad),
    buildingsNear: () => [],
    waterNear: () => [],
    treeGrid: new SpatialGrid(8),
    hedgeGrid: new SpatialGrid(64),
    furniture: [],
  };
}
const addTree = (w, t) => { t[3] = t[3] || 80; w.treeGrid.insert(t, [t[0], t[1], t[0], t[1]]); return t; };
const addHedge = (w, h) => { h.bounds = h.pts.reduce((b, p) => [Math.min(b[0], p[0]), Math.min(b[1], p[1]), Math.max(b[2], p[0]), Math.max(b[3], p[1])], [Infinity, Infinity, -Infinity, -Infinity]); w.hedgeGrid.insert(h, h.bounds); w.furniture.push(h); return h; };
const BOX = [0, 0, 1000, 1000];

// (a) een boom op de rijbaan gaat weg of staat ernaast; (b) een boom naast de weg blijft waar hij staat
{
  const road = { cat: 'normal', width: 6.5, pts: [[-50, 500], [1050, 500]] };
  const w = makeWorld([road]);
  const on = addTree(w, [500, 501.5, 0, 80, 0]);          // 1,5 m in de rijbaan
  const beside = addTree(w, [700, 512, 0, 80, 0]);        // 12 m van de middellijn, ruim in de berm
  const stats = trimTileGreenery(w, BOX, { trees: [on, beside], roads: false });
  assert.ok(stats.removed + stats.moved >= 1, 'de boom op de rijbaan is opgeruimd');
  assert.ok(distTo(road, on[0], on[1]) >= hw(road) + 0.65, 'de boom op de rijbaan staat nu naast de weg: ' + JSON.stringify([on[0], on[1]]));
  assert.deepEqual([beside[0], beside[1]], [700, 512], 'de boom naast de weg blijft staan');
  assert.equal(stats.moved, 1, 'alleen de boom op de rijbaan is verplaatst');
  const near = w.treeGrid.query(on[0] - 2, on[1] - 2, on[0] + 2, on[1] + 2);
  assert.ok(near.includes(on), 'het boomraster kent de boom op zijn nieuwe plek');
  assert.ok(!w.treeGrid.query(499, 500, 501, 503).includes(on), 'en niet meer op de oude');
}

// (d) een weg die net buiten de tegel valt, telt nu mee: de zoom reikt over de rand van de tegel
{
  // de rij van de weg ligt in de buurtegel (x = -1), zijn zoom komt 2,25 m de tegel in
  const road = { cat: 'normal', width: 6.5, pts: [[-1, 0], [-1, 1000]] };
  const w = makeWorld([road]);
  const tree = addTree(w, [1, 600, 0, 80, 0]); // 2 m van de middellijn: in de rijbaan, 0,75 m over de rand
  assert.ok(distTo(road, tree[0], tree[1]) < hw(road), 'de boom staat op de zoom van de buurweg');
  // (de tegel zelf brengt geen wegen mee: die rij ligt in de buurtegel)
  const stats = trimTileGreenery(w, BOX, { trees: [tree], roads: false });
  assert.equal(stats.removed + stats.moved, 1, 'de weg van de buurtegel is gezien: de boom is opgeruimd');
  assert.ok(distTo(road, tree[0], tree[1]) >= hw(road) + 0.65, 'en hij staat nu naast die weg');
}

// (d2) andersom: de boom stond er al in de buurtegel en deze tegel brengt de weg; de ring van 12 m ziet hem
{
  const w = makeWorld([]);
  const tree = addTree(w, [1004, 600, 0, 80, 0]); // in de buurtegel, 4 m over de rand
  const road = { cat: 'major', width: 12, pts: [[999, 0], [999, 1000]] }; // deze tegel, zoom tot 1005
  w.addRoad(road);
  const stats = trimTileGreenery(w, BOX, { trees: [], roads: true });
  assert.equal(stats.removed + stats.moved, 1, 'de boom van de buurtegel is opgeruimd toen de weg kwam');
  assert.ok(distTo(road, tree[0], tree[1]) >= hw(road) + 0.65, 'hij staat naast de weg');
}

// (c) een heg dwars over de weg wordt geknipt: twee stukken, en geen punt op de rijbaan
{
  const road = { cat: 'normal', width: 6.5, pts: [[-50, 500], [1050, 500]] };
  const w = makeWorld([road]);
  const hedge = addHedge(w, { k: 'hedge', osm: 1, pts: [[500, 480], [500, 520]] });
  assert.equal(trimHedgeRow(w, hedge), true, 'de heg is geknipt');
  const lines = hedgeLines(hedge);
  assert.equal(lines.length, 2, 'twee stukken, geen lijn over het asfalt: ' + lines.length);
  for (const line of lines) for (const [x, y] of line) assert.ok(distTo(road, x, y) > hw(road), 'geen enkel punt op de rijbaan: ' + JSON.stringify([x, y]));
  assert.equal(hedgeLines(hedge)[0], hedge.pts, 'pts is het eerste stuk');
  assert.ok(hedge.bounds[1] <= 480 && hedge.bounds[3] >= 520, 'de omtrek omvat beide stukken');

  // een heg die helemaal op de weg ligt gaat weg, en uit het heggetal
  const gone = addHedge(w, { k: 'hedge', osm: 2, pts: [[600, 499], [620, 499]] });
  trimTileGreenery(w, BOX, { hedges: [gone] });
  assert.equal(gone.pts.length, 0, 'er blijft geen punt van over');
  assert.ok(!w.hedgeGrid.query(590, 490, 630, 510).includes(gone), 'en hij staat niet meer in het heggetal');
  assert.ok(!w.furniture.includes(gone), 'en niet meer in de meubellijst');

  // een heg naast de weg blijft zoals hij is
  const free = addHedge(w, { k: 'hedge', osm: 3, pts: [[700, 520], [700, 560]] });
  const before = free.pts;
  assert.equal(trimHedgeRow(w, free), false, 'een vrije heg verandert niet');
  assert.equal(free.pts, before, 'en houdt zijn eigen punten');
  assert.equal(hedgeLines(free).length, 1, 'één lijn');
}

console.log('tilegreenery_test: ok (kleine kaart: boom op de rijbaan, boom in de berm, heg geknipt, weg over de tegelrand)');

// --- de gebouwde wereld: dezelfde opruiming als bij het laden, over alle tegels
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.resolve(process.env.GAME_WORLD || path.join(ROOT, 'game', 'world'));
const { heeftTegels, leesTegelRijen, wegRaster, greeneryMap } = await import('./lib/tegelrijen.mjs');
if (!heeftTegels(dir)) { console.log('tilegreenery_test: geen wereld in ' + dir + ', alleen de kleine kaart'); process.exit(0); }
const { clearTreesFromRoads } = await import('../game/js/treeclear.js');
const rows = await leesTegelRijen(dir);
const map = await greeneryMap(rows);
const t0 = performance.now();
const trim = { moved: 0, removed: 0 };
const marked = rows.trees.map((t, i) => [t.x, t.y, i]);
const kept = clearTreesFromRoads(map, marked, trim).map((a) => ({ ...rows.trees[a[2]], x: a[0], y: a[1] }));
let cutHedges = 0;
for (const h of rows.hedges) if (trimHedgeRow(map, h)) cutHedges++;
const ms = performance.now() - t0;
const rand = wegRaster(rows.roads);
const onRoad = kept.filter((t) => { const e = rand(t.x, t.y); return e && e.m < 0.05; }).length;
assert.equal(onRoad, 0, `geen boom op een rijbaan (${onRoad} van ${kept.length})`);
let hedgeOver = 0;
for (const h of rows.hedges) for (const line of hedgeLines(h)) for (let i = 0; i + 1 < line.length; i++) {
  const a = line[i], b = line[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), m = Math.max(1, Math.ceil(L));
  for (let s = 0; s <= m; s++) { const e = rand(a[0] + ((b[0] - a[0]) * s) / m, a[1] + ((b[1] - a[1]) * s) / m); if (e && e.m < -0.2) hedgeOver++; }
}
assert.equal(hedgeOver, 0, `geen heg over een weg (${hedgeOver} punten)`);

// de kosten van één tegel: de bomen en heggen van een echte tegel met de wegen van de 3 x 3 tegels eromheen, honderd
// keer achter elkaar (dit draait per gestreamde tegel, tileworld.js addTile). De mediaan en de drukste tegel.
const G = await import('../game/js/gdt.js');
const perKey = new Map();
for (const t of kept) perKey.set(t.key, (perKey.get(t.key) || 0) + 1);
const ranked = [...perKey].sort((a, b) => a[1] - b[1]);
const costOf = (key) => {
  const [kx, ky] = key.split('_').map(Number);
  const [ox, oy] = G.tileOrigin(kx - G.RD_TILE_X0, G.RD_TILE_Y0 - ky);
  const box = [ox, oy, ox + G.TILE_M, oy + G.TILE_M];
  const own = kept.filter((t) => t.key === key).map((t) => [t.x, t.y, 0, 80, 0]);
  const hedges = rows.hedges.filter((h) => h.key === key).map((h) => ({ k: 'hedge', osm: h.osm, pts: h.pts }));
  const around = (r) => {
    const b = r.pts.reduce((q, p) => [Math.min(q[0], p[0]), Math.min(q[1], p[1]), Math.max(q[2], p[0]), Math.max(q[3], p[1])], [Infinity, Infinity, -Infinity, -Infinity]);
    return b[2] > box[0] - 12 && b[0] < box[2] + 12 && b[3] > box[1] - 12 && b[1] < box[3] + 12;
  };
  const bench = makeWorld(rows.roads.filter(around).map((r) => ({ cat: r.cat, width: r.width, pts: r.pts, bridge: r.bridge, tunnel: r.tunnel, z: r.z })));
  const t1 = performance.now();
  for (let k = 0; k < 100; k++) {
    bench.treeGrid = new SpatialGrid(8);
    bench.hedgeGrid = new SpatialGrid(64);
    bench.furniture = [];
    const ts = own.map((t) => t.slice());
    for (const t of ts) bench.treeGrid.insert(t, [t[0], t[1], t[0], t[1]]);
    const hs = hedges.map((h) => ({ ...h, pts: h.pts }));
    for (const h of hs) {
      h.bounds = h.pts.reduce((b, p) => [Math.min(b[0], p[0]), Math.min(b[1], p[1]), Math.max(b[2], p[0]), Math.max(b[3], p[1])], [Infinity, Infinity, -Infinity, -Infinity]);
      bench.hedgeGrid.insert(h, h.bounds);
      bench.furniture.push(h);
    }
    trimTileGreenery(bench, box, { trees: ts, hedges: hs, roads: true });
  }
  return { n: own.length, h: hedges.length, ms: (performance.now() - t1) / 100 };
};
const mid = costOf(ranked[Math.floor(ranked.length / 2)][0]);
const worst = costOf(ranked[ranked.length - 1][0]);
console.log(`tilegreenery_test: ok (${rows.trees.length} bomen van ${rows.tiles} tegels: ${trim.moved} naast de weg, ${trim.removed} weg, ${cutHedges} heggen geknipt in ${(ms / 1000).toFixed(2)} s; één tegel: mediaan ${mid.ms.toFixed(2)} ms (${mid.n} bomen, ${mid.h} heggen), drukste ${worst.ms.toFixed(2)} ms (${worst.n} bomen, ${worst.h} heggen))`);
