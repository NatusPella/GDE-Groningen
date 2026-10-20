// TileWorld and the tile streamer (game/js/tileworld.js, tilestore.js):
//   node scripts/tileworld_test.mjs
// 1. equivalence: the map loaded from tiles answers every GameMap query the
//    way the map built from citymap.json does (arrays, grids, nearest road
//    point, escapeBuilding, isOnBridge, heights, ...)
// 2. streaming: LRU budget, pins, cancellation, priority by heading, prefetch
//    hysteresis, the frame queue budget, a drive and a heli flight over the
//    city on a virtual clock (no tile late), teleports
// 3. ByteSource: the same store over Range-style reads and in-memory bytes
import './node3d.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';

const P = await import('./world/pack_tiles.mjs');
const G = await import('../game/js/gdt.js');
const S = await import('../game/js/tilestore.js');
const { loadTileWorld, TileWorld } = await import('../game/js/tileworld.js');

let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).filter((q) => q !== 'bounds' && !P.PROFILE_KEYS.includes(q)).sort().map((q) => [q, x[q]])) : x));

const stripA = (o) => { const c = { ...o }; for (const k of P.ATTR_KEYS) delete c[k]; return c; };
const src = await P.loadSourcesLaag();
const legacy = src.map;
const built = P.build(src);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-tileworld-test-'));
process.on('exit', () => fs.rmSync(dir, { recursive: true, force: true }));
const index0 = P.writeWorld(dir, built, new Set(built.blobs.keys()));
const files = {};
for (const f of fs.readdirSync(dir)) files[f] = new Uint8Array(fs.readFileSync(path.join(dir, f)));

const T = await loadTileWorld('world/', { source: new S.MemorySource(files), pool: false });
const tw = T.world;
ok(tw instanceof TileWorld && T.store.residentKeys.length === Object.keys(index0.tiles).length, 'the pinned city is resident', T.store.residentKeys.length);

// the profiles come back from the heights section, and the roads build their
// meshes (r.net is the road network roadsurface.js builds a road against:
// the profile's network is r.pnet)
{
  const prof = tw.roads.filter((r) => r.z);
  ok(prof.length === legacy.roads.filter((r) => r.z).length && prof.every((r) => Number.isInteger(r.pnet) && r.st.length === r.pts.length - 1), 'profiles joined back from the heights section', prof.length);
  ok(tw.roads.every((r) => r.net == null || typeof r.net === 'object'), 'no road carries a number for its road network');
  const RS = await import('../game/js/roadsurface.js');
  RS.setRoadNetwork(tw);
  let built = 0, err = '';
  for (const r of prof.slice(0, 40)) {
    try { if (RS.roadSurfaceGeometries(r, 1).road) built++; } catch (e) { err = e.message; break; }
  }
  ok(built === Math.min(40, prof.length), 'profiled roads from tiles build their surfaces', err || built);
}

// --- 1. equivalence
for (const k of ['roads', 'buildings', 'canopies', 'water', 'green', 'trees', 'rails', 'stations', 'levelCrossings', 'railRoutes', 'railLifts', 'passageWays', 'clippedWays']) {
  const a = legacy[k], b = tw[k];
  let bad = a.length !== b.length ? -1 : 0;
  if (bad === 0) for (let i = 0; i < a.length; i++) {
    const x = k === 'clippedWays' ? { ...a[i], building: legacy.buildings.indexOf(a[i].building), road: P.cleanRow(a[i].road) } : a[i];
    const y = k === 'clippedWays' ? { ...b[i], building: tw.buildings.indexOf(b[i].building), road: P.cleanRow(b[i].road) } : b[i];
    const cx = k === 'trees' ? JSON.stringify(x) : canon(k === 'buildings' || k === 'roads' || k === 'canopies' ? stripA(P.cleanRow(x)) : x);
    const cy = k === 'trees' ? JSON.stringify(y) : canon(k === 'buildings' || k === 'roads' || k === 'canopies' ? stripA(P.cleanRow(y)) : y);
    if (cx !== cy) { bad++; if (bad < 3) console.log(`  ${k}[${i}]`, cx.slice(0, 160), '|', cy.slice(0, 160)); }
  }
  ok(bad === 0, `${k}: ${a.length} the same as in the JSON map`, bad);
}
ok(canon(legacy.meta) === canon(tw.meta) && legacy.dryCrossings === tw.dryCrossings, 'meta and dryCrossings');
ok(legacy.elev.walls.length === tw.elev.walls.length && legacy.elev.segs.length === tw.elev.segs.length && legacy.elev.skirts.length === tw.elev.skirts.length, 'elevation model: same walls, segments, skirts', `${legacy.elev.walls.length}/${tw.elev.walls.length}`);

// seeded points: along roads, over buildings, near water, on the ring
let seed = 12345;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const pts = [];
const [bx0, by0, bx1, by1] = legacy.meta.bounds;
for (let i = 0; i < 1500; i++) pts.push([bx0 + rnd() * (bx1 - bx0), by0 + rnd() * (by1 - by0)]);
for (let i = 0; i < 1500; i++) { const r = legacy.roads[Math.floor(rnd() * legacy.roads.length)]; const p = r.pts[Math.floor(rnd() * r.pts.length)]; pts.push([p[0] + (rnd() - 0.5) * 12, p[1] + (rnd() - 0.5) * 12]); }
for (let i = 0; i < 700; i++) { const b = legacy.buildings[Math.floor(rnd() * legacy.buildings.length)]; const p = b.pts[0]; pts.push([p[0] + (rnd() - 0.5) * 6, p[1] + (rnd() - 0.5) * 6]); }
const ids = (arr, map) => arr.map((o) => map.indexOf ? 0 : 0).length;
const key = (list) => list.map((o) => (o.pts ? `${o.pts.length}:${o.pts[0][0]},${o.pts[0][1]}` : `${o[0]},${o[1]}`)).sort().join('|');
const same = (f) => { let bad = 0; for (const [x, y] of pts) if (f(legacy, x, y) !== f(tw, x, y)) bad++; return bad; };
const queries = {
  buildingsNear: (m, x, y) => key(m.buildingsNear(x, y, 40)),
  roadsNear: (m, x, y) => key(m.roadsNear(x, y, 60)),
  waterNear: (m, x, y) => key(m.waterNear(x, y, 80)),
  greenNear: (m, x, y) => key(m.greenNear(x, y, 80)),
  treesNear: (m, x, y) => key(m.treesNear(x, y, 50)),
  nearestRoadPoint: (m, x, y) => { const r = m.nearestRoadPoint(x, y, 200, true); return r ? `${r.x},${r.y},${r.road.pts.length}` : '-'; },
  nearestRoadPointStreet: (m, x, y) => { const r = m.nearestRoadPoint(x, y, 400, false, true); return r ? `${r.x},${r.y}` : '-'; },
  escapeBuilding: (m, x, y) => m.escapeBuilding(x, y).join(','),
  isOnBridge: (m, x, y) => m.isOnBridge(x, y),
  groundHeightAt: (m, x, y) => m.groundHeightAt(x, y, 0),
  groundHeightRing: (m, x, y) => m.groundHeightAt(x, y, 6),
  spawnZ: (m, x, y) => m.spawnZ(x, y),
  ceilingAt: (m, x, y) => m.ceilingAt(x, y, 0),
  offStreetLevel: (m, x, y) => m.offStreetLevel(x, y, 1),
  onCarriageway: (m, x, y) => m.onCarriageway(x, y, 1),
  onRingCarriageway: (m, x, y) => m.onRingCarriageway(x, y, 0),
  inWaterRaw: (m, x, y) => m.inWaterRaw(x, y),
  coveredAt: (m, x, y) => m.coveredAt(x, y),
};
for (const [name, f] of Object.entries(queries)) {
  const bad = same(f);
  ok(bad === 0, `query ${name}: same answer at ${pts.length} points`, `${bad} differ`);
}
{
  let bad = 0;
  for (const [x, y] of pts.slice(0, 120)) {
    const a = legacy.isOpenSpot(x, y, 20), b = tw.isOpenSpot(x, y, 20);
    if (a !== b) bad++;
    const c = legacy.findOpenSpawn(x, y, 200), d = tw.findOpenSpawn(x, y, 200);
    if ((c && `${c.x},${c.y}`) !== (d && `${d.x},${d.y}`)) bad++;
  }
  ok(bad === 0, 'isOpenSpot and findOpenSpawn (flood fill) agree', bad);
}
{
  const a = legacy.queryView(-300, -300, 600, 600), b = tw.queryView(-300, -300, 600, 600);
  ok(Object.keys(a).every((k) => key(a[k]) === key(b[k])), 'queryView');
}

// --- 2. the grids follow tiles in and out
{
  const total = (m) => m.buildingGrid.query(-1e5, -1e5, 1e5, 1e5).length;
  const t0 = total(tw);
  const keyA = [...Object.keys(index0.tiles)].find((k) => (index0.tiles[k].n.buildings || 0) > 500);
  const e = index0.tiles[keyA];
  const inTile = (m) => m.buildingsNear(...G.tileOrigin(e.i, e.j).map((v) => v + 500), 700).length;
  const before = inTile(tw);
  ok(tw.dropTile(`${e.i},${e.j}`), 'dropTile removes a resident tile');
  const mid = inTile(tw);
  ok(mid < before && total(tw) < t0, 'its buildings left the grid', `${before} -> ${mid}`);
  const tile = await T.store.request(keyA);
  ok(tw.addTile(tile) && inTile(tw) === before && total(tw) === t0, 'and came back with addTile, no duplicates', `${inTile(tw)}/${before} ${total(tw)}/${t0}`);
  ok(!tw.addTile(tile), 'adding a resident tile twice does nothing');
}

// --- 3. the store: LRU, pins, cancellation, priorities, budget
const mkStore = (opts = {}, latency = 40) => {
  const source = new S.MemorySource(files, { latency });
  const store = new S.TileStore({ source, index: index0, decode: async (b) => G.decodeBlob(new Uint8Array(zlib.inflateRawSync(b))), now: () => source.now, ...opts });
  return { source, store };
};
const sizes = Object.entries(index0.tiles).map(([k, t]) => [k, t.raw]).sort((a, b) => b[1] - a[1]);
const flush = async (source, ms = 400, step = 20) => { for (let t = 0; t < ms; t += step) await source.advance(step); };
{
  const { source, store } = mkStore({ budgetBytes: 4e5 });
  const keys = Object.keys(index0.tiles);
  for (const k of keys.slice(0, 20)) store.request(k, { priority: 1 }).catch(() => {});
  await flush(source, 3000);
  ok(store.residentBytes <= 4e5 + Math.max(...sizes.map((s) => s[1])), 'LRU: resident bytes stay near the budget', `${store.residentBytes}`);
  ok(store.stats.evictions > 0, 'LRU: tiles were evicted', store.stats.evictions);
}
{
  const { source, store } = mkStore({ budgetBytes: 1 });
  const [k1, k2, k3] = Object.keys(index0.tiles);
  store.pin(k1);
  await Promise.all([store.request(k1), (async () => { await flush(source, 200); })()].slice(0, 1).concat([flush(source, 300)]));
  store.request(k2).catch(() => {}); store.request(k3).catch(() => {});
  await flush(source, 600);
  ok(store.ready(k1), 'a pinned tile is never evicted, whatever the budget');
}
{
  const { source, store } = mkStore({ concurrency: 1 });
  const [a, b, c] = Object.keys(index0.tiles);
  const order = [];
  store.on('tile', (t, k) => order.push(k));
  store.request(a, { priority: 5 }).catch(() => {});
  store.request(b, { priority: 9 }).catch(() => {});
  store.request(c, { priority: 1 }).catch(() => {});
  await flush(source, 600);
  ok(order.join() === [a, c, b].join(), 'priority: the first starts at once, then lowest score first', order.join());
}
{
  const { source, store } = mkStore({ concurrency: 1 });
  const [a, b] = Object.keys(index0.tiles);
  let cancelled = 0;
  store.request(a, { token: 'x' }).catch((e) => { if (e.cancelled) cancelled++; });
  store.request(b, { token: 'x' }).catch((e) => { if (e.cancelled) cancelled++; });
  store.cancel('x');
  await flush(source, 300);
  ok(cancelled === 2 && !store.ready(a) && !store.ready(b), 'cancel: both requests rejected, nothing loaded', `${cancelled}`);
  ok(source.aborted >= 1 || store.stats.cancels >= 1, 'cancel: the read in flight was aborted, the queued one never started', `${source.aborted}/${store.stats.cancels}`);
}
{
  // prefetch by heading: a car going east wants the tiles ahead first
  const { source, store } = mkStore({ concurrency: 1 });
  const first = Object.values(index0.tiles).find((t) => t.n.buildings > 1500);
  const [ox, oy] = G.tileOrigin(first.i, first.j);
  const x = ox + 500, y = oy + 500;
  const want = store.prefetch(x, y, { vx: 35, vy: 0, radius: 900 });
  const sorted = [...want].sort((p, q) => p[1] - q[1]).map((p) => index0.tiles[p[0]]);
  const ahead = sorted.slice(0, 3).filter((t) => G.tileOrigin(t.i, t.j)[0] >= ox - 1);
  ok(sorted.length > 3 && ahead.length >= 2, 'prefetch: tiles ahead of the car come first', sorted.slice(0, 3).map((t) => `${t.i},${t.j}`).join(' '));
  const radius = store.prefetch(x, y, { vx: 0, vy: 0, radius: 900 }).size;
  const fast = store.prefetch(x, y, { vx: 60, vy: 0, radius: 900 }).size;
  ok(fast > radius, 'prefetch: the wanted radius grows with speed', `${radius} -> ${fast}`);
  await flush(source, 2000);
}

// --- drive / heli / teleport on a virtual clock: no tile late
async function run(name, route, { speed, radius, ahead, hz = 60, budgetBytes = 150e6, latency = 25, pinCity = false }) {
  const { source, store } = mkStore({ budgetBytes }, latency);
  const world = tw;
  let late = 0, maxFrame = 0, t = 0, loadsAtStart = 0;
  const frameMs = 1000 / hz;
  const [x0, y0] = route(0);
  store.prefetch(x0, y0, { radius, ahead });
  await flush(source, 800);
  loadsAtStart = store.stats.loads;
  const need = (x, y, r) => store.keysAround(x, y, r);
  for (let f = 0; f < hz * 60; f++) {
    t = f / hz;
    const [x, y] = route(t), [x1, y1] = route(t + 0.1);
    const vx = (x1 - x) * 10, vy = (y1 - y) * 10;
    store.prefetch(x, y, { vx, vy, radius, ahead });
    await source.advance(frameMs);
    for (const k of need(x, y, 250)) if (!store.ready(k)) { late++; store.stats.late++; }
  }
  return { late, loads: store.stats.loads - loadsAtStart, evictions: store.stats.evictions, resident: store.residentKeys.length, maxQueue: store.stats.maxQueue };
}
{
  // the city is ~7 km wide; a car crosses it in a line at 38 m/s, a heli at 60 m/s
  const b = legacy.meta.bounds;
  const cy = (b[1] + b[3]) / 2;
  const drive = (t) => [b[0] + 400 + t * 38, cy + Math.sin(t / 9) * 300];
  const r1 = await run('drive', drive, { speed: 38, radius: 1200, ahead: 10 });
  ok(r1.late === 0, `drive 60 s at 38 m/s across the city: no tile late inside 250 m (${r1.loads} loads, ${r1.resident} resident, queue ${r1.maxQueue})`, r1.late);
  const heli = (t) => [b[0] + 300 + t * 60, b[1] + 600 + t * 55];
  const r2 = await run('heli', heli, { speed: 80, radius: 1200, ahead: 10 });
  ok(r2.late === 0, `heli 60 s at 80 m/s diagonally: no tile late inside 250 m (${r2.loads} loads)`, r2.late);
  // drifting: the heading swings hard every few seconds, the velocity with it
  const drift = (t) => { const h = Math.sin(t / 2.2) * 1.3; return [b[0] + 800 + t * 22 * Math.cos(h) + Math.sin(t / 2.2) * 40, cy + t * 22 * Math.sin(h)]; };
  const r3 = await run('drift', drift, { speed: 25, radius: 1200, ahead: 10 });
  ok(r3.late === 0, `drift 60 s with hard heading swings: no tile late inside 250 m (${r3.loads} loads)`, r3.late);
  // heli landing: 70 m/s braking to a hover over the pad, then circling slowly
  const land = (t) => { const d = Math.min(t, 25); const x = b[0] + 300 + 70 * d - 1.4 * d * d; return [x + (t > 25 ? Math.cos((t - 25) / 4) * 30 - 30 : 0), b[1] + 700 + (t > 25 ? Math.sin((t - 25) / 4) * 30 : 0)]; };
  const r4 = await run('heli-landing', land, { speed: 70, radius: 1200, ahead: 10 });
  ok(r4.late === 0, `heli landing (70 m/s braking to a hover): no tile late inside 250 m (${r4.loads} loads)`, r4.late);
  const small = await run('drive-small-budget', drive, { speed: 38, radius: 1200, ahead: 10, budgetBytes: 3e6 });
  ok(small.late === 0 && small.evictions > 0, `the same drive with a 3 MB budget: ${small.evictions} evictions, still none late`, `${small.late}`);
}
{
  // a teleport: the destination's tiles are what to wait for
  const { source, store } = mkStore({}, 30);
  const k = Object.values(index0.tiles).find((t) => t.n.buildings > 1000);
  const [ox, oy] = G.tileOrigin(k.i, k.j);
  store.prefetch(ox + 500, oy + 500, { radius: 400 });
  const need = store.keysAround(ox + 500, oy + 500, 400);
  let ms = 0;
  while (store.missing(need).length && ms < 5000) { await source.advance(10); ms += 10; }
  ok(ms <= 400, `teleport: L0 tiles round the destination ready after ${ms} virtual ms (30 ms per read)`, ms);
}

// --- a cutscene registers its shots: tiles first, held until released
{
  const { source, store } = mkStore({ budgetBytes: 4e5 }, 30);
  const keys = Object.entries(index0.tiles).filter(([, t]) => t.n.buildings > 800).map(([k]) => k);
  const at = (k) => { const [ox, oy] = G.tileOrigin(index0.tiles[k].i, index0.tiles[k].j); return [ox + 500, oy + 500]; };
  const shots = keys.slice(0, 4).map((k, i) => ({ at: at(k), look: at(keys[(i + 1) % keys.length]) }));
  const fake = { store, tileQueue: new S.FrameQueue(), registerShots: TileWorld.prototype.registerShots, shotsReady: TileWorld.prototype.shotsReady, releaseShots: TileWorld.prototype.releaseShots };
  const done = fake.registerShots(shots);
  ok(!fake.shotsReady(), 'registerShots: nothing is in before the reads are done');
  let ms = 0;
  while (!fake.shotsReady() && ms < 5000) { await source.advance(10); ms += 10; }
  await done;
  ok(fake.shotsReady() && ms <= 600, `registerShots: every tile of ${shots.length} shots ready after ${ms} virtual ms`, ms);
  for (const k of keys.slice(4, 14)) store.request(k).catch(() => {});
  await flush(source, 1500);
  ok(fake.shotsReady(), 'the shots\' tiles stay pinned while other tiles stream through a tiny budget');
  fake.releaseShots();
  for (const k of keys.slice(14, 24)) store.request(k).catch(() => {});
  await flush(source, 1500);
  ok(store.stats.evictions > 0 && store.residentBytes <= 4e5 + Math.max(...sizes.map((s) => s[1])), 'after the release they can be evicted again');
}

// --- the frame queue keeps its budget
{
  const q = new S.FrameQueue();
  let clock = 0;
  const now = () => clock;
  for (let i = 0; i < 100; i++) q.add(() => { clock += 0.4; }, i % 3);
  const first = q.run(2, now);
  ok(first >= 5 && first <= 6 && q.size === 100 - first, 'frame queue: runs items up to the budget', `${first}`);
  let frames = 1;
  while (q.size) { q.run(2, now); frames++; }
  ok(frames <= 20 && q.stats.ran === 100, 'frame queue: everything runs, spread over frames', `${frames}`);
  const q2 = new S.FrameQueue();
  q2.add(() => { clock += 50; });
  ok(q2.run(2, now) === 1, 'frame queue: one item always runs, however slow');
}

// --- ByteSource: a Range server in front of the same files
{
  const calls = [];
  globalThis.fetch = async (url, opt = {}) => {
    const f = String(url).replace(/^.*world\//, '');
    const buf = files[f];
    if (!buf) return new Response(null, { status: 404 });
    const m = /bytes=(\d+)-(\d+)/.exec((opt.headers && opt.headers.Range) || '');
    calls.push([f, m ? +m[1] : 0, m ? +m[2] - +m[1] + 1 : buf.length]);
    if (!m) return new Response(buf, { status: 200 });
    return new Response(buf.subarray(+m[1], +m[2] + 1), { status: 206 });
  };
  const src2 = new S.HttpRangeSource('world/');
  const W = await loadTileWorld('world/', { source: src2, pool: false });
  const ranged = calls.filter((c) => c[0].endsWith('.gdp') && !c[0].startsWith('global')).every((c) => c[2] < files[c[0]].length);
  ok(W && ranged && W.world.buildings.length === legacy.buildings.length, 'HttpRangeSource: tiles are read as byte ranges (never a whole pack)', `${calls.length} requests`);
  const e = Object.values(index0.tiles)[0];
  const raw = await src2.read(index0.packs[e.pack].file, e.off, e.len);
  ok(raw.length === e.len, 'a range read gives exactly the tile bytes');
  ok((await loadTileWorld('nothing/', { source: new S.HttpRangeSource('nothing/'), pool: false })) === null, 'no index: null, the caller falls back to the JSON map');
}

console.log(`${n - fails}/${n} passed`);
process.exit(fails ? 1 : 0);

// --- pins are counted (overlapping holders: city pins, map view, placement windows)
{
  const { source, store } = mkStore({ budgetBytes: 1 });
  const [k1, k2] = Object.keys(index0.tiles);
  store.pin(k1); store.pin(k1);
  store.unpin(k1);
  ok(store.entries.get(k1).pinned, 'one holder let go: the tile is still pinned');
  store.unpin(k1); store.unpin(k1);
  ok(!store.entries.get(k1).pinned && store.entries.get(k1).pins === 0, 'all holders let go: free to evict, no negative count');
}
