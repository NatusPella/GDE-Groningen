// The proefstrook (scripts/world/build_corridor.mjs, docs/PROVINCIE-PLAN.md F1):
//  1. the tile set and its sources; same input, same bytes;
//  2. every tile decodes, every row is the world builder's (heights with a
//     source flag, roads with lanes, nav edges), roads cut at a tile edge
//     meet their piece in the next tile (portal nodes);
//  3. streaming on a virtual clock over the city + corridor index: a car at
//     40 m/s along the N360, the train along the line, the heli at 60 m/s
//     Stad -> Eemshaven: tiles late within 250 m, main-thread work per frame
//     (TileWorld.addTile into the grids), and the data holes on the way;
//  4. rail routes over the cached track, bus lines from route relations.
//   node scripts/corridor_test.mjs [--json] [--quick]   (--json: the measurements as one line; --quick: no streaming runs)
import './node3d.mjs';
import zlib from 'node:zlib';

const P = await import('./world/pack_tiles.mjs');
const C = await import('./world/build_corridor.mjs');
const CD = await import('./world/corridor.mjs');
const G = await import('../game/js/gdt.js');
const S = await import('../game/js/tilestore.js');
const { loadTileWorld, mergeIndex } = await import('../game/js/tileworld.js');

let fails = 0;
const fail = (m) => { fails++; console.log('FAIL ' + m); };
const M = {};

// --- 1. build
const city = P.build(await P.loadSourcesLaag());
const cityKeys = new Set(city.blobs.keys());
const t0 = performance.now();
const built = C.buildCorridor({ cityKeys });
M.buildMs = Math.round(performance.now() - t0);
const again = C.buildCorridor({ cityKeys });
let same = built.blobs.size === again.blobs.size;
for (const [k, b] of built.blobs) if (!again.blobs.has(k) || G.hash64(again.blobs.get(k).bytes) !== G.hash64(b.bytes)) same = false;
if (!same) fail('two builds give different tiles');
M.corridorTiles = built.keys.length;
M.built = built.blobs.size;
M.fromOmmelandCache = [...built.want.values()].filter((s) => s === 'ommeland').length;
M.fromCorridorCache = [...built.want.values()].filter((s) => s === 'corridor').length;
M.cityTiles = built.global.city.length;
M.noCache = built.missing.length;
if (M.corridorTiles < 400) fail(`corridor has only ${M.corridorTiles} tiles`);
if (M.built + M.cityTiles + M.noCache !== M.corridorTiles) fail('every corridor tile is built, the city\'s, or listed as missing');
// the game merges only what the old Ommeland layers do not draw (main.js ?corridor)
for (const [k, b] of built.blobs) if (b.src === 'ommeland' && !(b.flags & 8)) fail(`${k} comes from the Ommeland cache but is not flagged as drawn by the old layers`);
{
  const idx = { tiles: { a: { i: 0, j: 0 } }, packs: { p: {} } };
  const n = mergeIndex(idx, { layer: 'corridor', packs: { c: {} }, tiles: { a: { flags: 4 }, b: { flags: 4 }, c: { flags: 12 } }, global: { x: 1 } }, { only: (t) => !(t.flags & 8) });
  if (n !== 1 || !idx.tiles.b || idx.tiles.c || idx.tiles.a.flags !== undefined || !idx.layers.corridor.global) fail('mergeIndex: new tiles only, the city wins, the filter holds');
}
M.inGameTiles = [...built.blobs.values()].filter((b) => !(b.flags & 8)).length;
for (const town of ['Appingedam', 'Delfzijl', 'Winsum', 'Uithuizen', 'Eemshaven']) if (!built.global.places.some((p) => p.name === town)) fail(`${town} is not a place of the corridor`);

// the places name the spot (worldplaces.js, the location chip past the old Ommeland)
{
  const WP = await import('../game/js/worldplaces.js');
  WP.setWorldPlaces(built.global.places);
  for (const town of ['Appingedam', 'Delfzijl', 'Winsum', 'Uithuizen', 'Eemshaven', 'Uithuizermeeden', 'Farmsum']) {
    const p = built.global.places.find((q) => q.name === town);
    const a = WP.worldPlaceAt(p.x + 120, p.y - 80);
    if (!a || a.place !== town || a.near) fail(`the spot next to ${town}'s centre is called ${JSON.stringify(a)}`);
  }
  const d = built.global.places.filter((q) => q.of);
  M.districts = d.length;
  if (d.length) { const q = d[0]; const a = WP.worldPlaceAt(q.x, q.y); if (a.district !== q.name) fail(`district ${q.name} of ${q.of}: ${JSON.stringify(a)}`); }
}

// --- 2. decode, rows, portals
const decoded = new Map();
const dms = [];
let rawBytes = 0, zBytes = 0;
for (const [k, b] of built.blobs) {
  const z = zlib.deflateRawSync(b.bytes, { level: 9 });
  zBytes += z.length; rawBytes += b.bytes.length;
  const t = performance.now();
  const tile = G.decodeBlob(new Uint8Array(zlib.inflateRawSync(z)));
  dms.push(performance.now() - t);
  decoded.set(k, tile);
}
dms.sort((a, b) => a - b);
const q = (p) => +dms[Math.min(dms.length - 1, Math.floor(p * dms.length))].toFixed(2);
M.decodeMs = { p50: q(0.5), p95: q(0.95), max: q(1) };
M.bytes = zBytes; M.rawBytes = rawBytes;
M.bytesPerTile = Math.round(zBytes / Math.max(1, built.blobs.size));
const rowsOf = (tile, type) => (tile.sections.find((s) => s.type === type) || { rows: [] }).rows;
let noHsrc = 0, noLanes = 0, cars = 0, navless = 0;
for (const tile of decoded.values()) {
  for (const b of rowsOf(tile, G.SECTION.BUILDINGS)) if (!b.hsrc || !(b.hm > 0) || !b.roof) noHsrc++;
  const roads = rowsOf(tile, G.SECTION.ROADS);
  for (const r of roads) if (['major', 'normal', 'minor'].includes(r.cat)) { cars++; if (!r.lanes) noLanes++; }
  if (roads.length && !rowsOf(tile, G.SECTION.NAV).length) navless++;
}
if (noHsrc) fail(`${noHsrc} buildings without a height, its source or a roof type`);
if (noLanes > cars * 0.01) fail(`${noLanes}/${cars} car roads without lanes`);
if (navless) fail(`${navless} tiles with roads but no nav edges`);
// portals: a road piece that ends on its tile's edge meets a piece of the same
// way in the neighbour (when the neighbour is built)
{
  let open = 0, ok = 0;
  const ends = new Map();
  const key = (p) => `${Math.round(p[0] * 10)},${Math.round(p[1] * 10)}`;
  for (const [k, tile] of decoded) for (const r of rowsOf(tile, G.SECTION.ROADS)) for (const p of [r.pts[0], r.pts[r.pts.length - 1]]) { const kk = key(p); (ends.get(kk) || ends.set(kk, []).get(kk)).push(k); }
  for (const [k, tile] of decoded) {
    const [ox, oy] = G.tileOrigin(tile.i, tile.j);
    for (const r of rowsOf(tile, G.SECTION.ROADS)) {
      for (const p of [r.pts[0], r.pts[r.pts.length - 1]]) {
        const onEdge = [p[0] - ox, ox + 1000 - p[0], p[1] - oy, oy + 1000 - p[1]].findIndex((d) => Math.abs(d) < 0.02);
        if (onEdge < 0) continue;
        const ni = tile.i + (onEdge === 0 ? -1 : onEdge === 1 ? 1 : 0), nj = tile.j + (onEdge === 2 ? -1 : onEdge === 3 ? 1 : 0);
        const nk = G.tileKey(ni, nj);
        if (!decoded.has(nk)) continue;
        if ((ends.get(key(p)) || []).includes(nk)) ok++; else open++;
      }
    }
  }
  M.portals = { joined: ok, open };
  if (open > ok * 0.01) fail(`${open} road ends on a tile edge have no piece in the next tile (${ok} do)`);
}

// --- 3. streaming over the merged index
const cityIdx = writeMem(city, true);
const corIdx = writeCorridorMem(built);
function writeMem({ blobs, global }, pinCity) {
  const files = {};
  const index = { format: G.GDT_FORMAT, tiles: {}, packs: {}, pins: {}, global: null };
  let off = 0;
  const parts = [];
  for (const [key, b] of [...blobs].sort((a, c) => (a[0] < c[0] ? -1 : 1))) {
    const z = new Uint8Array(zlib.deflateRawSync(b.bytes, { level: 6 }));
    index.tiles[key] = { i: b.i, j: b.j, pack: 'city', off, len: z.length, raw: b.bytes.length, n: b.n, maxH: b.maxH };
    parts.push(z); off += z.length;
  }
  const gz = new Uint8Array(zlib.deflateRawSync(global, { level: 6 }));
  index.global = { pack: 'city', off, len: gz.length, raw: global.length };
  parts.push(gz); off += gz.length;
  const all = new Uint8Array(off);
  let o = 0;
  for (const p of parts) { all.set(p, o); o += p.length; }
  files['city.gdp'] = all;
  index.packs.city = { file: 'city.gdp', size: all.length };
  if (pinCity) index.pins.city = { tiles: Object.keys(index.tiles).sort() };
  files['index.json'] = new TextEncoder().encode(JSON.stringify(index));
  return { index, files };
}
function writeCorridorMem({ blobs, global }) {
  const index = { tiles: {}, packs: {}, global };
  const parts = [];
  let off = 0;
  for (const [key, b] of [...blobs].sort((a, c) => (a[0] < c[0] ? -1 : 1))) {
    const z = new Uint8Array(zlib.deflateRawSync(b.bytes, { level: 9 }));
    index.tiles[key] = { i: b.i, j: b.j, pack: 'c', off, len: z.length, raw: b.bytes.length, n: b.n, maxH: b.maxH, src: b.src };
    parts.push(z); off += z.length;
  }
  const all = new Uint8Array(off);
  let o = 0;
  for (const p of parts) { all.set(p, o); o += p.length; }
  index.packs.c = { file: 'corridor.gdp', size: all.length };
  return { index, files: { 'corridor.gdp': all, 'index-corridor.json': new TextEncoder().encode(JSON.stringify(index)) } };
}
const files = { ...cityIdx.files, ...corIdx.files };
const places = CD.loadPlaces();
const at = (n) => { const p = places.get(n); return [p.x, p.y]; };
const polyRoute = (names) => {
  const pts = names.map(at);
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { len: acc[acc.length - 1], at: (s) => { s = Math.max(0, Math.min(acc[acc.length - 1], s)); let i = 1; while (i < acc.length - 1 && acc[i] < s) i++; const t = (s - acc[i - 1]) / ((acc[i] - acc[i - 1]) || 1); return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]; } };
};

async function stream(name, route, speed, { hz = 20, radius = 1200, latency = 20 } = {}) {
  const source = new S.MemorySource(files, { latency });
  let T = null;
  let err = null;
  const decode = async (b) => G.decodeBlob(new Uint8Array(zlib.inflateRawSync(b)));
  const pending = loadTileWorld('world/', { source, pool: false, extra: ['index-corridor.json'], now: () => source.now, decode }).then((v) => { T = v || { failed: true }; }, (e) => { err = e; });
  // (the global blob inflates through a DecompressionStream: real ticks)
  for (let k = 0; !T && !err && k < 5000; k++) { await source.advance(20); await new Promise((r) => setImmediate(r)); }
  if (err || !T || T.failed) throw err || new Error('the tile world did not load');
  await pending;
  const store = T.store, world = T.world;
  const frameMs = 1000 / hz;
  const dur = route.len / speed;
  let late = 0, hole = 0, frames = 0, over4 = 0, over8 = 0, maxMs = 0, added = 0;
  const holeKeys = new Set();
  const [x0, y0] = route.at(0);
  store.prefetch(x0, y0, { radius });
  for (let t = 0; t < 1000; t += 20) { await source.advance(20); world.tileQueue.run(1e9); }
  store.on('tile', () => added++);
  for (let f = 0; f * frameMs / 1000 < dur; f++) {
    const s = (f * frameMs / 1000) * speed;
    const [x, y] = route.at(s), [x1, y1] = route.at(s + speed * 0.1);
    const vx = (x1 - x) * 10, vy = (y1 - y) * 10;
    await source.advance(frameMs);
    const t = performance.now();
    world.follow(x, y, { vx, vy, radius }, 2);
    const ms = performance.now() - t;
    frames++;
    maxMs = Math.max(maxMs, ms);
    if (ms > 4) over4++;
    if (ms > 8) over8++;
    for (const k of store.keysAround(x, y, 250)) if (!store.ready(k) || !world.resident.has(`${store.index.tiles[k].i},${store.index.tiles[k].j}`)) late++;
    // a corridor tile on the way that has no data at all
    const [i, j] = G.tileIndexOf(x, y);
    const k = G.tileKey(i, j);
    if (!store.index.tiles[k]) { hole++; holeKeys.add(k); }
  }
  const r = { km: +(route.len / 1000).toFixed(1), speed, frames, late, holeFrames: hole, holeTiles: holeKeys.size, loads: store.stats.loads, evictions: store.stats.evictions, maxFrameMs: +maxMs.toFixed(1), framesOver4ms: over4, framesOver8ms: over8, residentMB: +(store.residentBytes / 1e6).toFixed(1) };
  console.log(`${name}: ${JSON.stringify(r)}`);
  return r;
}
M.stream = {};
if (!process.argv.includes('--quick')) {
M.stream.car = await stream('car N360 40 m/s', polyRoute(['Groningen', 'Ten Boer', 'Garrelsweer', 'Wirdum', 'Appingedam', 'Delfzijl']), 40);
M.stream.train = await stream('train Stad-Loppersum-Delfzijl 39 m/s', polyRoute(['Groningen', 'Bedum', 'Stedum', 'Loppersum', 'Appingedam', 'Delfzijl']), 39);
M.stream.heli = await stream('heli Stad-Eemshaven 60 m/s', polyRoute(['Groningen', 'Eemshaven']), 60);
for (const [k, r] of Object.entries(M.stream)) if (r.late) fail(`${k}: ${r.late} tile-frames late within 250 m`);
}

// --- 4. rail and bus
const routes = built.global.routes;
const del = routes.find((r) => r.id === 'spoor-delfzijl'), ems = routes.find((r) => r.id === 'spoor-eemshaven');
if (!del || del.stops.length < 4) fail('the Delfzijl line reaches at least Loppersum over the cached track');
if (!ems || ems.stops.length < 3) fail('the Eemshaven line reaches at least Winsum over the cached track');
for (const r of routes) for (let i = 1; i < r.stops.length; i++) if (!(r.stops[i].s > r.stops[i - 1].s)) fail(`${r.id}: stops out of order`);
M.rail = Object.fromEntries(routes.map((r) => [r.id, { stops: r.stops.map((s) => s.name), km: +(r.stops.length ? r.stops[r.stops.length - 1].s / 1000 : 0).toFixed(1), reached: r.reached }]));
{
  // a bus route relation in the shape fetch_corridor.py keeps
  const g = (pts) => pts.map(([x, y]) => [53.3 + y * 1e-4, 6.8 + x * 1e-4]);
  const lines = C.busLines([{ type: 'relation', id: 7, tags: { route: 'bus', ref: '61', name: 'Bus 61: Groningen => Appingedam', from: 'Groningen', to: 'Appingedam' }, members: [
    { type: 'node', role: 'stop_entry_only', lat: 53.3, lon: 6.8, ref: 1 },
    { type: 'way', role: '', g: g([[0, 0], [10, 0]]) }, { type: 'way', role: '', g: g([[20, 0], [10, 0]]) },
    { type: 'node', role: 'stop_exit_only', lat: 53.3, lon: 6.802, ref: 2 },
  ] }]);
  if (lines.length !== 1 || lines[0].pts.length !== 3 || lines[0].stops.length !== 2 || lines[0].ref !== '61') fail('bus line from a route relation: ' + JSON.stringify(lines));
}
// the Ommeland's train routes run on over the corridor's track (corridorrail.js)
{
  const { extendRoutes } = await import('../game/js/corridorrail.js');
  const om = (await import('./world/cityroutes.mjs')).loadCityRouteSource();
  const same = extendRoutes(om, built.global);
  M.railAdded = same.added;
  // with today's caches the corridor's track ends where the Ommeland's does
  if (same.added.length !== built.global.routes.reduce((n, r) => n + Math.max(0, r.stops.length - (r.id === 'spoor-delfzijl' ? 4 : 3)), 0)) fail(`routes grew by ${same.added.join(', ')} without track for it`);
  // a line that does run on: Ommeland route to A, corridor A -> B -> C
  const line = (x0, x1) => { const P = []; for (let x = x0; x <= x1; x += 50) P.push([x, 0]); return P; };
  const omT = { routes: [{ name: 'Stoptrein Delfzijl', base: 'x', cutS: 0, keep: [], pts: line(0, 1000).flat(), stops: [{ name: 'A', s: 800 }, { name: 'Z', s: 900, offmap: true }] }], stations: [{ name: 'A', x: 800, y: 5 }] };
  const cor = { routes: [{ id: 'spoor-delfzijl', via: ['G', 'A', 'B', 'C'], pts: line(-500, 3000), stops: [{ name: 'G', s: 0 }, { name: 'A', s: 1300 }, { name: 'B', s: 2300 }, { name: 'C', s: 3500 }], reached: true }], stations: [{ key: 'B', name: 'Station B', x: 1800, y: 4 }, { key: 'C', name: 'Station C', x: 3000, y: 4 }] };
  const x = extendRoutes(omT, cor);
  const r = x.routes[0];
  const end = [r.pts[r.pts.length - 2], r.pts[r.pts.length - 1]];
  if (r.stops.map((q) => q.name).join() !== 'A,B,C' || r.stops[1].s !== 1800 || r.stops[2].s !== 3000 || end[0] !== 3000 || x.added.join() !== 'B,C' || omT.routes[0].stops.length !== 2) fail('extendRoutes: ' + JSON.stringify({ stops: r.stops, end, added: x.added }));
  const part = extendRoutes(omT, { ...cor, routes: [{ ...cor.routes[0], stops: cor.routes[0].stops.slice(0, 3), reached: false }] });
  if (part.routes[0].stops.map((q) => `${q.name}${q.offmap ? '*' : ''}`).join() !== 'A,B,C*') fail('extendRoutes: a line the data does not finish keeps an off-map end: ' + JSON.stringify(part.routes[0].stops));
}
// the edge at the Wadden coast (worldedge.js): a coastline way as OSM draws
// it north of Eemshaven (running west, land on its left), a boat heading out
{
  const E = await import('../game/js/worldedge.js');
  const { wgsToWorld } = await import('../game/js/rdnew.js');
  const edge = E.edgeFromOsm([{ type: 'way', id: 1, tags: { natural: 'coastline' }, g: [[53.45, 6.9], [53.45, 6.8], [53.45, 6.7]] }], (la, lo) => wgsToWorld(la, lo));
  const [cx, cy] = wgsToWorld(53.45, 6.8);
  const at = (north) => E.edgeRule(cx, cy - north, edge, { mode: 'boat' });
  const land = E.edgeRule(cx, cy + 500, edge, { mode: 'boat' });
  if (land || at(1000) || !at(2850) || at(2850).action !== 'warn' || !at(3100) || at(3100).action !== 'back' || at(3100).edge !== 'wad') fail(`Wadden edge: land ${JSON.stringify(land)}, 1 km ${JSON.stringify(at(1000))}, 2.85 km ${JSON.stringify(at(2850))}, 3.1 km ${JSON.stringify(at(3100))}`);
  const back = at(3100);
  if (back && Math.abs(Math.sin(back.face) - 1) > 0.05) fail(`the turn-back faces the coast (south): ${back.face}`);
  // the border-bridge rule: past the Eems border on a bridge nothing happens until after it
  const border = { border: [{ kind: 'eems', out: 1, bufferM: 300, pts: [[0, 0], [0, -1000]] }] };
  const side = E.outsideDist(500, -500, border.border).d > 0 ? 500 : -500;
  if (!E.edgeRule(side, -500, border, { mode: 'car' }) || E.edgeRule(side, -500, border, { mode: 'car', onDeck: true }) || E.edgeRule(side, -500, border, { mode: 'car', bridgeDist: 20 })) fail('border-bridge rule: the turn-back waits until after the bridge');
  M.edgeCoastLines = built.global.edge.coast.length;
}
M.bus = built.global.bus.length;
M.places = built.global.places.length;
M.stations = built.global.stations.map((s) => s.key);

if (process.argv.includes('--json')) console.log(JSON.stringify(M));
else console.log(`corridor: ${M.corridorTiles} tiles, ${M.built} built (${M.inGameTiles} beyond the old Ommeland, streamed with ?corridor) (${M.fromOmmelandCache} from the Ommeland cache, ${M.fromCorridorCache} from the corridor cache), ${M.cityTiles} city, ${M.noCache} without data; ${(M.bytes / 1e6).toFixed(2)} MB (${M.bytesPerTile} B/tile), decode p50 ${M.decodeMs.p50} p95 ${M.decodeMs.p95} max ${M.decodeMs.max} ms; build ${M.buildMs} ms; portals ${JSON.stringify(M.portals)}`);
console.log(fails ? `${fails} failure(s)` : 'corridor: ok');
process.exit(fails ? 1 : 0);
