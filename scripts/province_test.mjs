// The whole province (scripts/world/build_province.mjs, docs/PROVINCIE-PLAN.md F2):
//  1. the pieces on made-up data (always): ring simplification, the tile set
//     round an outline, border lines, the built-up field, a two-pack build
//     whose roads meet on the pack edge, the polder blocks and the prop rule
//     of provinceworld.js;
//  2. with the extract in data/cache/province (scripts/world/extract_province.py):
//     the real build, same input same bytes, every tile decodes, portals,
//     every town named, stations and train lines, size and build time;
//  3. streaming on a virtual clock over the city + province index: the car
//     on the A7 to Bad Nieuweschans, the train to Roodeschool, the heli to
//     Eemshaven and to Ter Apel: tiles late within 250 m, main-thread work.
//   node scripts/province_test.mjs [--json] [--quick]   (--quick: no streaming)
import './node3d.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';

const B = await import('./world/build_province.mjs');
const G = await import('../game/js/gdt.js');
const PW = await import('../game/js/provinceworld.js');
const { wgsToWorld } = await import('../game/js/rdnew.js');

let fails = 0;
const fail = (m) => { fails++; console.log('FAIL ' + m); };
const M = {};

// --- 1. pieces
{
  const sq = [[0, 0], [10, 0.01], [20, 0], [20, 20], [0, 20], [0, 0]];
  const s = B.simplify(sq, 1);
  if (s.length !== 5 || s[0][0] !== 0 || s[s.length - 1][0] !== 0) fail(`closed ring simplified: ${JSON.stringify(s)}`);
  // a 3 x 3 km square outline on the grid: 9 tiles inside, a ring of buffer tiles round it
  const x0 = 330 + 10000, y0 = 75 + 10000;
  const ring = [[x0, y0], [x0 + 3000, y0], [x0 + 3000, y0 + 3000], [x0, y0 + 3000], [x0, y0]];
  const T = B.provinceTiles([ring], 1000);
  const inner = [...T.values()].filter((t) => !t.buffer).length, buf = [...T.values()].filter((t) => t.buffer).length;
  if (inner < 9 || inner > 25 || buf < 8) fail(`tile set round a square: ${inner} inside, ${buf} buffer`);
  if (!B.pointInRings(x0 + 1500, y0 + 1500, [ring]) || B.pointInRings(x0 - 5, y0, [ring])) fail('point in ring');
  const U = B.urbanFromGrid({ cell: 120, cells: [[10, 10, 50]] });
  if (U(10 * 120 + 60, 10 * 120 + 60) !== 1 || U(0, 0) !== 0) fail('built-up field from the grid');
  // border lines: a ring along Germany (east of 7.03) and the sea (north)
  const prov = { boundary: [[[53.0, 7.1], [53.2, 7.1], [53.5, 6.8], [53.0, 6.8], [53.0, 7.1]]] };
  const bl = B.borderLines(prov, 3000);
  if (!bl.some((L) => L.kind === 'duitsland') || bl.some((L) => L.pts.length < 2) || bl.some((L) => L.bufferM !== 2500)) fail(`border lines: ${JSON.stringify(bl.map((L) => [L.kind, L.pts.length]))}`);
}
// a made-up extract: two packs, a road over the pack edge, a house, a station,
// a place; the build is the same twice and the road meets itself on the edge
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-prov-'));
  const src = path.join(tmp, 'province');
  fs.mkdirSync(src);
  // the pack edge between packs 0 and 1 lies at x = 330 + 8000
  const xe = 330 + 8000, ym = 75 + 2500;
  const ll = (x, y) => { // world -> lat/lon by search (the inverse is in rdnew.js but keep this test self-contained)
    let la = 53.2195, lo = 6.565;
    for (let k = 0; k < 30; k++) { const [px, py] = wgsToWorld(la, lo); lo += (x - px) / 66800; la -= (y - py) / 111290; }
    return [+la.toFixed(7), +lo.toFixed(7)];
  };
  const box = [ll(xe - 3000, ym - 2000), ll(xe + 3000, ym - 2000), ll(xe + 3000, ym + 2000), ll(xe - 3000, ym + 2000)];
  const road = { type: 'way', id: 1, tags: { highway: 'tertiary', name: 'Proefweg' }, g: [ll(xe - 600, ym), ll(xe + 600, ym)] };
  const house = { type: 'way', id: 2, tags: { building: 'house' }, g: [ll(xe - 200, ym + 20), ll(xe - 190, ym + 20), ll(xe - 190, ym + 30), ll(xe - 200, ym + 30), ll(xe - 200, ym + 20)] };
  const [sla, slo] = ll(xe - 100, ym + 50);
  const gz = (o) => zlib.gzipSync(JSON.stringify(o));
  fs.writeFileSync(path.join(src, 'c0_0.json.gz'), gz({ elements: [road, house] }));
  fs.writeFileSync(path.join(src, 'c1_0.json.gz'), gz({ elements: [road] }));
  const [px, py] = wgsToWorld(sla, slo);
  fs.writeFileSync(path.join(src, 'province.json.gz'), gz({
    source: 'test', boundary: [[...box, box[0]]], urban: { cell: 120, cells: [] }, bus: [], trains: [],
    places: [{ id: 1, name: 'Proefdorp', kind: 'village', x: px, y: py, pop: 100 }],
    stations: [{ id: 2, name: 'Proefdorp', x: px, y: py, kind: 'halt' }],
  }));
  const a = B.buildProvince({ src, extra: [], buffer: 500 }), b = B.buildProvince({ src, extra: [], buffer: 500 });
  let same = a.blobs.size === b.blobs.size && a.blobs.size > 0;
  for (const [k, v] of a.blobs) if (!b.blobs.has(k) || G.hash64(b.blobs.get(k).bytes) !== G.hash64(v.bytes)) same = false;
  if (!same) fail('the made-up build differs between two runs');
  const tiles = [...a.blobs.values()].map((v) => G.decodeBlob(v.bytes));
  const roads = tiles.flatMap((t) => (t.sections.find((s) => s.type === G.SECTION.ROADS) || { rows: [] }).rows);
  const ends = roads.flatMap((r) => [r.pts[0], r.pts[r.pts.length - 1]]).filter((p) => Math.abs(p[0] - xe) < 0.02);
  if (roads.length !== 2 || ends.length !== 2) fail(`the road over the pack edge: ${roads.length} pieces, ${ends.length} ends on the edge`);
  const blds = tiles.flatMap((t) => (t.sections.find((s) => s.type === G.SECTION.BUILDINGS) || { rows: [] }).rows);
  if (blds.length !== 1 || blds[0].hsrc !== 'default' || blds[0].type !== 'house') fail(`the house: ${JSON.stringify(blds)}`);
  for (const v of a.blobs.values()) if (!(v.flags & B.FLAG.PROVINCE) || !(v.flags & B.FLAG.BUILT)) fail('province tiles carry flags 4 and 32');
  if (!a.global.places.some((p) => p.name === 'Proefdorp') || !a.global.stations.some((s) => s.key === 'Proefdorp')) fail('place and station in the global layer');
  // written: packs, index and the bus file
  const out = path.join(tmp, 'out');
  const w = B.writeProvince(out, a);
  if (!fs.existsSync(path.join(out, 'index-provincie.json')) || !fs.existsSync(path.join(out, 'provincie-bus.json')) || w.index.layer !== 'provincie' || w.index.global.bus) fail('the written layer');
  fs.rmSync(tmp, { recursive: true, force: true });
}
// provinceworld.js: polder blocks and the prop rule
{
  const idx = {};
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) idx[G.tileKey(20 + i, 20 + j)] = { i: 20 + i, j: 20 + j, flags: 37 };
  const blocks = PW.provinceBlocksOf(Object.keys(idx), (k) => idx[k]);
  if (!blocks || blocks.count < 9 || blocks.count > 25) fail(`polder blocks under 4 x 4 tiles: ${blocks && blocks.count}`);
  const [ox, oy] = G.tileOrigin(21, 21);
  const b = { pts: [[ox + 100, oy + 100], [ox + 120, oy + 100], [ox + 120, oy + 120], [ox + 100, oy + 120], [ox + 100, oy + 100]], bounds: [ox + 100, oy + 100, ox + 120, oy + 120] };
  const r = { pts: [[ox, oy + 500], [ox + 1000, oy + 500]], width: 6, bounds: [ox, oy + 497, ox + 1000, oy + 503] };
  const map = {
    resident: new Set(['21,21']),
    buildingsNear: (x, y, m) => (x > ox + 100 - m && x < ox + 120 + m && y > oy + 100 - m && y < oy + 120 + m ? [b] : []),
    roadsNear: (x, y, m) => (Math.abs(y - (oy + 500)) < 3 + m ? [r] : []), waterNear: () => [],
  };
  const isT = (k) => idx[k];
  const blk = (x, y, m = 1) => PW.realBlockedAt(map, isT, x, y, m);
  if (!blk(ox + 110, oy + 110) || !blk(ox + 300, oy + 501) || blk(ox + 300, oy + 300) || !blk(G.tileOrigin(22, 22)[0] + 300, G.tileOrigin(22, 22)[1] + 300) || blk(-50000, 0)) fail('the prop rule: building, road, open field, a tile not in yet, outside the layer');
}

// --- 2. the real build
if (!B.haveProvince()) {
  console.log('province: no extract in data/cache/province (scripts/world/extract_province.py), real build skipped');
} else {
  const P = await import('./world/pack_tiles.mjs');
  const city = P.build(await P.loadSourcesLaag());
  const cityKeys = new Set(city.blobs.keys());
  const t0 = performance.now();
  const built = B.buildProvince({ cityKeys });
  M.buildMs = Math.round(performance.now() - t0);
  const again = B.buildProvince({ cityKeys });
  let same = built.blobs.size === again.blobs.size;
  for (const [k, b] of built.blobs) if (!again.blobs.has(k) || G.hash64(again.blobs.get(k).bytes) !== G.hash64(b.bytes)) same = false;
  if (!same) fail('two builds give different tiles');
  const g = built.global;
  M.tiles = built.keys.length; M.built = built.blobs.size; M.city = g.city.length; M.empty = built.empty.length; M.noPack = built.missing.length;
  M.buffer = [...built.blobs.values()].filter((b) => b.flags & B.FLAG.BUFFER).length;
  M.oldLayers = [...built.blobs.values()].filter((b) => b.flags & B.FLAG.OLD).length;
  M.streamed = M.built;
  if (M.built < 2500) fail(`only ${M.built} tiles built`);
  if (M.built + M.city + M.empty + M.noPack !== M.tiles) fail('every tile is built, the city\'s, empty or without a pack');
  // decode, rows, portals
  const decoded = new Map();
  const dms = [];
  let zBytes = 0, rawBytes = 0;
  for (const [k, b] of built.blobs) {
    const z = zlib.deflateRawSync(b.bytes, { level: 9 });
    zBytes += z.length; rawBytes += b.bytes.length;
    const t = performance.now();
    decoded.set(k, G.decodeBlob(new Uint8Array(zlib.inflateRawSync(z))));
    dms.push(performance.now() - t);
  }
  dms.sort((a, b) => a - b);
  const q = (p) => +dms[Math.min(dms.length - 1, Math.floor(p * dms.length))].toFixed(2);
  M.decodeMs = { p50: q(0.5), p95: q(0.95), max: q(1) };
  M.MB = +(zBytes / 1e6).toFixed(1); M.rawMB = +(rawBytes / 1e6).toFixed(1);
  if (M.decodeMs.p95 > 6) fail(`decode p95 ${M.decodeMs.p95} ms`);
  const rowsOf = (tile, type) => (tile.sections.find((s) => s.type === type) || { rows: [] }).rows;
  let noH = 0, cars = 0, noLanes = 0;
  for (const tile of decoded.values()) {
    for (const b of rowsOf(tile, G.SECTION.BUILDINGS)) if (!b.hsrc || !(b.hm > 0)) noH++;
    for (const r of rowsOf(tile, G.SECTION.ROADS)) if (['major', 'normal', 'minor'].includes(r.cat)) { cars++; if (!r.lanes) noLanes++; }
  }
  if (noH) fail(`${noH} buildings without a height or its source`);
  if (noLanes > cars * 0.01) fail(`${noLanes}/${cars} car roads without lanes`);
  {
    let open = 0, ok = 0;
    const ends = new Map();
    const key = (p) => `${Math.round(p[0] * 10)},${Math.round(p[1] * 10)}`;
    for (const [k, tile] of decoded) for (const r of rowsOf(tile, G.SECTION.ROADS)) for (const p of [r.pts[0], r.pts[r.pts.length - 1]]) { const kk = key(p); (ends.get(kk) || ends.set(kk, []).get(kk)).push(k); }
    for (const [, tile] of decoded) {
      const [ox, oy] = G.tileOrigin(tile.i, tile.j);
      for (const r of rowsOf(tile, G.SECTION.ROADS)) for (const p of [r.pts[0], r.pts[r.pts.length - 1]]) {
        const e = [p[0] - ox, ox + 1000 - p[0], p[1] - oy, oy + 1000 - p[1]].findIndex((d) => Math.abs(d) < 0.02);
        if (e < 0) continue;
        const nk = G.tileKey(tile.i + (e === 0 ? -1 : e === 1 ? 1 : 0), tile.j + (e === 2 ? -1 : e === 3 ? 1 : 0));
        if (!decoded.has(nk)) continue;
        if ((ends.get(key(p)) || []).includes(nk)) ok++; else open++;
      }
    }
    M.portals = { joined: ok, open };
    if (open > ok * 0.005) fail(`${open} road ends on a tile edge have no piece in the next tile (${ok} do)`);
  }
  // every town is a place and names its spot
  const WP = await import('../game/js/worldplaces.js');
  WP.setWorldPlaces(g.places);
  const TOWNS = ['Appingedam', 'Delfzijl', 'Veendam', 'Stadskanaal', 'Winschoten', 'Hoogezand', 'Leek', 'Zuidhorn', 'Winsum', 'Uithuizen',
    'Ter Apel', 'Oude Pekela', 'Bedum', 'Haren', 'Zoutkamp', 'Lauwersoog', 'Eemshaven', 'Bad Nieuweschans', 'Musselkanaal', 'Marum', 'Grijpskerk',
    'Loppersum', 'Ten Boer', 'Siddeburen', 'Scheemda', 'Vlagtwedde', 'Bellingwolde', 'Warffum', 'Zuidbroek', 'Slochteren', 'Grootegast', 'Termunten'];
  const unnamed = [];
  for (const town of TOWNS) {
    const p = g.places.find((q) => q.name === town);
    if (!p) { unnamed.push(town + ' (no place)'); continue; }
    const a = WP.worldPlaceAt(p.x + 80, p.y - 60);
    if (!a || a.place !== town) unnamed.push(`${town} -> ${a && a.place}`);
  }
  if (unnamed.length) fail(`towns not named at their centre: ${unnamed.join(', ')}`);
  M.places = g.places.length;
  M.districts = g.places.filter((p) => p.of).length;
  // stations and train lines
  M.stations = g.stations.length;
  const want = ['Groningen', 'Groningen Noord', 'Groningen Europapark', 'Zuidhorn', 'Grijpskerk', 'Haren', 'Kropswolde', 'Martenshoek', 'Hoogezand-Sappemeer', 'Zuidbroek',
    'Scheemda', 'Winschoten', 'Bad Nieuweschans', 'Veendam', 'Sauwerd', 'Winsum', 'Baflo', 'Warffum', 'Usquert', 'Uithuizen', 'Uithuizermeeden', 'Roodeschool', 'Eemshaven',
    'Bedum', 'Stedum', 'Loppersum', 'Appingedam', 'Delfzijl West', 'Delfzijl'];
  const missingSt = want.filter((n) => !g.stations.some((s) => s.key === n));
  if (missingSt.length) fail(`stations missing: ${missingSt.join(', ')}`);
  const onLine = new Set(g.routes.filter((r) => r.reached).flatMap((r) => r.stops.map((s) => s.name)));
  const offLine = want.filter((n) => !onLine.has(n));
  if (offLine.length) fail(`stations on no complete line: ${offLine.join(', ')}`);
  for (const r of g.routes) for (let i = 1; i < r.stops.length; i++) if (!(r.stops[i].s > r.stops[i - 1].s)) fail(`${r.id}: stops out of order`);
  M.lines = g.routes.map((r) => `${r.name}${r.reached ? '' : ' (incomplete)'}: ${r.stops.length} stops, ${(r.stops.length ? r.stops[r.stops.length - 1].s / 1000 : 0).toFixed(1)} km`);
  M.coast = g.edge.coast.length; M.border = g.edge.border.map((L) => L.kind);

  // --- 3. streaming
  if (!process.argv.includes('--quick')) {
    const S = await import('../game/js/tilestore.js');
    const { loadTileWorld } = await import('../game/js/tileworld.js');
    const mem = (blobs, pack, extra = {}) => {
      const index = { format: G.GDT_FORMAT, tiles: {}, packs: {}, pins: {}, ...extra };
      const parts = [];
      let off = 0;
      for (const [key, b] of [...blobs].sort((a, c) => (a[0] < c[0] ? -1 : 1))) {
        const z = new Uint8Array(zlib.deflateRawSync(b.bytes, { level: 6 }));
        index.tiles[key] = { i: b.i, j: b.j, pack, off, len: z.length, raw: b.bytes.length, n: b.n, maxH: b.maxH, flags: b.flags };
        parts.push(z); off += z.length;
      }
      return { index, parts, off };
    };
    const c = mem(city.blobs, 'city');
    const gz = new Uint8Array(zlib.deflateRawSync(city.global, { level: 6 }));
    c.index.global = { pack: 'city', off: c.off, len: gz.length, raw: city.global.length };
    c.parts.push(gz);
    c.index.pins.city = { tiles: Object.keys(c.index.tiles).sort() };
    const cat = (parts) => { const n = parts.reduce((a, p) => a + p.length, 0); const all = new Uint8Array(n); let o = 0; for (const p of parts) { all.set(p, o); o += p.length; } return all; };
    for (const k of Object.keys(c.index.tiles)) delete c.index.tiles[k].flags;
    c.index.packs.city = { file: 'city.gdp', size: 0 };
    const p = mem(built.blobs, 'v');
    p.index.layer = 'provincie';
    p.index.global = g;
    p.index.packs.v = { file: 'prov.gdp', size: 0 };
    const files = { 'city.gdp': cat(c.parts), 'index.json': new TextEncoder().encode(JSON.stringify(c.index)), 'prov.gdp': cat(p.parts), 'index-provincie.json': new TextEncoder().encode(JSON.stringify(p.index)) };
    const place = (n) => { const q = g.places.find((x) => x.name === n) || g.stations.find((x) => x.key === n); if (!q) throw new Error('no place ' + n); return [q.x, q.y]; };
    const polyRoute = (pts) => {
      const acc = [0];
      for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      return { len: acc[acc.length - 1], at: (s) => { s = Math.max(0, Math.min(acc[acc.length - 1], s)); let i = 1; while (i < acc.length - 1 && acc[i] < s) i++; const t = (s - acc[i - 1]) / ((acc[i] - acc[i - 1]) || 1); return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]; } };
    };
    async function stream(name, route, speed, { hz = 20, radius = 1500, latency = 20 } = {}) {
      const source = new S.MemorySource(files, { latency });
      let T = null, err = null;
      const decode = async (b) => G.decodeBlob(new Uint8Array(zlib.inflateRawSync(b)));
      const pending = loadTileWorld('world/', { source, pool: false, extra: [{ name: 'index-provincie.json' }], now: () => source.now, decode }).then((v) => { T = v || { failed: true }; }, (e) => { err = e; });
      for (let k = 0; !T && !err && k < 5000; k++) { await source.advance(20); await new Promise((r) => setImmediate(r)); }
      if (err || !T || T.failed) throw err || new Error('the tile world did not load');
      await pending;
      const store = T.store, world = T.world;
      const frameMs = 1000 / hz;
      let late = 0, frames = 0, over4 = 0, over8 = 0, maxMs = 0, peak = 0;
      const [x0, y0] = route.at(0);
      store.prefetch(x0, y0, { radius });
      for (let t = 0; t < 1500; t += 20) { await source.advance(20); world.tileQueue.run(1e9); }
      for (let f = 0; f * frameMs / 1000 < route.len / speed; f++) {
        const s = (f * frameMs / 1000) * speed;
        const [x, y] = route.at(s), [x1, y1] = route.at(s + speed * 0.1);
        await source.advance(frameMs);
        const t = performance.now();
        world.follow(x, y, { vx: (x1 - x) * 10, vy: (y1 - y) * 10, radius }, 2);
        const ms = performance.now() - t;
        frames++;
        maxMs = Math.max(maxMs, ms);
        if (ms > 4) over4++;
        if (ms > 8) over8++;
        for (const k of store.keysAround(x, y, 250)) if (!store.ready(k) || !world.resident.has(`${store.index.tiles[k].i},${store.index.tiles[k].j}`)) late++;
        peak = Math.max(peak, store.residentBytes);
      }
      const r = { km: +(route.len / 1000).toFixed(1), speed, frames, late, loads: store.stats.loads, evictions: store.stats.evictions, maxFrameMs: +maxMs.toFixed(1), framesOver4ms: over4, framesOver8ms: over8, peakMB: +(peak / 1e6).toFixed(1) };
      console.log(`${name}: ${JSON.stringify(r)}`);
      return r;
    }
    const line = (id) => g.routes.find((r) => r.reached && r.stops[0] && r.stops[r.stops.length - 1] && (r.name.includes(id) || r.id === id));
    // the game side over a loaded province: polder blocks, the prop rule, the
    // far LOD of a streamed tile, the train lines (one load, no streaming clock)
    {
      const source = new S.MemorySource(files, { latency: 0 });
      let T = null;
      const decode = async (b) => G.decodeBlob(new Uint8Array(zlib.inflateRawSync(b)));
      const pend = loadTileWorld('world/', { source, pool: false, extra: [{ name: 'index-provincie.json' }], now: () => source.now, decode }).then((v) => { T = v; });
      for (let k = 0; !T && k < 5000; k++) { await source.advance(20); await new Promise((r) => setImmediate(r)); }
      await pend;
      const CF = await import('../game/js/countryfield.js');
      const res = PW.initProvince(T);
      M.provinceBlocks = res.blocks;
      if (res.blocks < 1500) fail(`only ${res.blocks} polder blocks under the province's tiles`);
      // Winschoten's centre: a real block, so no procedural road, maar or village there
      const [wx, wy] = place('Winschoten');
      const bx = Math.floor(wx / CF.BLOCK), by = Math.floor(wy / CF.BLOCK);
      if (!CF.provinceBlock(bx, by) || CF.edgeRoad(bx, by, 0) || CF.villageOf(bx, by)) fail('Winschoten lies in a real block without procedural roads or villages');
      // a tile in: the prop rule sees its buildings; the far LOD builds it
      const [ti, tj] = G.tileIndexOf(wx, wy);
      const key = G.tileKey(ti, tj);
      await T.store.request(key, { priority: 0 });
      for (let k = 0; k < 50 && !T.world.resident.has(`${ti},${tj}`); k++) { await source.advance(20); T.world.tileQueue.run(1e9); }
      const tile = T.store.get ? T.store.get(key) : null;
      const blds = T.world.buildingsNear(wx, wy, 300);
      if (!blds.length) fail('no buildings round Winschoten\'s centre after its tile came in');
      else {
        const b = blds.find((q) => q.bounds && q.bounds[2] - q.bounds[0] > 6) || blds[0];
        const cx = (b.bounds[0] + b.bounds[2]) / 2, cy = (b.bounds[1] + b.bounds[3]) / 2;
        const CE = await import('../game/js/countryedge.js');
        if (!CE.edgeBlocked(cx, cy, 1)) fail('the countryside props do not keep off a real building');
      }
      const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
      const { createFarLOD } = await import('../game/js/farlod.js');
      const scene = { add() {} };
      const flat = (poly) => { const c = poly.pts.slice(0, -1).map(([x, y]) => new THREE.Vector2(x, y)); const g = new THREE.BufferGeometry(); const pos = []; for (const [a, b2, c2] of THREE.ShapeUtils.triangulateShape(c, [])) for (const q of [a, b2, c2]) pos.push(c[q].x, 0, c[q].y); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); return g; };
      const lod = createFarLOD(scene, { buildings: [], roads: [], green: [] }, { flatGeometry: flat, colors: { roads: { major: 0x555555, normal: 0x666666, minor: 0x777777, foot: 0x888888, cycle: 0x993333 }, sidewalk: 0x999999, green: 0x336633 }, sidewalkExtra: 1 });
      let streamed = 0;
      T.world.onTiles((kind, tl, k) => {
        if (kind !== 'add') return;
        const rows = (type) => (tl.sections.find((q) => q.type === type) || { rows: [] }).rows;
        const [ox, oy] = G.tileOrigin(tl.i, tl.j);
        lod.addStreamTile(k, ox, oy, G.TILE_M, { buildings: rows(G.SECTION.BUILDINGS), roads: rows(G.SECTION.ROADS), green: rows(G.SECTION.GREEN), water: rows(G.SECTION.WATER) });
        streamed++;
      });
      T.store.prefetch(wx, wy, { radius: 1500 });
      for (let k = 0; k < 200; k++) { await source.advance(20); T.world.tileQueue.run(1e9); }
      for (let k = 0; k < 400 && (k === 0 || lod.stats.queued !== 0); k++) lod.update(wx, wy, 2500, 2500, 400);
      lod.update(wx, wy, 2500, 2500, 400);
      M.farlodStreamed = { tiles: streamed, built: lod.stats.tiles, triangles: lod.stats.triangles };
      if (!streamed || !lod.stats.triangles) fail(`the far LOD of streamed tiles: ${JSON.stringify(M.farlodStreamed)}`);
      void tile;
      // every Ommeland train route runs on to its stations over the real track
      const CR = await import('../game/js/corridorrail.js');
      const om = (await import('./world/cityroutes.mjs')).loadCityRouteSource();
      const pl = CR.provinceRailLines(om, g.routes);
      const x = CR.extendRoutes(pl.om, { ...g, routes: pl.lines });
      const stops = new Set(x.routes.flatMap((r) => r.stops.filter((q) => !q.offmap).map((q) => q.name)));
      const country = ['Zuidhorn', 'Grijpskerk', 'Haren', 'Kropswolde', 'Martenshoek', 'Hoogezand-Sappemeer', 'Zuidbroek', 'Scheemda', 'Winschoten', 'Bad Nieuweschans', 'Veendam',
        'Sauwerd', 'Winsum', 'Baflo', 'Warffum', 'Usquert', 'Uithuizen', 'Uithuizermeeden', 'Roodeschool', 'Eemshaven', 'Bedum', 'Stedum', 'Loppersum', 'Appingedam', 'Delfzijl West', 'Delfzijl'];
      const off = country.filter((n) => !stops.has(n));
      if (off.length) fail(`stations no train route stops at: ${off.join(', ')}`);
      for (const r of x.routes) for (let i = 1; i < r.stops.length; i++) if (!(r.stops[i].s > r.stops[i - 1].s)) fail(`${r.name}: stops out of order after extending`);
      M.trainStations = stops.size;
      PW.initProvince(T, { stream: false });
    }
    M.stream = {};
    M.stream.carA7 = await stream('car A7 Stad-Bad Nieuweschans 33 m/s', polyRoute(['Groningen', 'Hoogezand', 'Zuidbroek', 'Scheemda', 'Winschoten', 'Bad Nieuweschans'].map(place)), 33);
    const rs = line('Roodeschool') || line('spoor-eemshaven');
    if (rs) M.stream.train = await stream(`train ${rs.name} 39 m/s`, polyRoute(rs.pts), 39);
    M.stream.heliEems = await stream('heli Stad-Eemshaven 60 m/s', polyRoute([place('Groningen'), place('Eemshaven')]), 60);
    M.stream.heliTerApel = await stream('heli Stad-Ter Apel 60 m/s', polyRoute([place('Groningen'), place('Ter Apel')]), 60);
    for (const [k, r] of Object.entries(M.stream)) if (r.late) fail(`${k}: ${r.late} tile-frames late within 250 m`);
  }
}

if (process.argv.includes('--json')) console.log(JSON.stringify(M));
else if (M.built) {
  console.log(`province: ${M.tiles} tiles, ${M.built} built (${M.streamed} beyond the old Ommeland, ${M.buffer} in the buffer strip), ${M.city} city, ${M.empty} empty; ${M.MB} MB (${M.rawMB} MB raw), decode p50 ${M.decodeMs.p50} p95 ${M.decodeMs.p95} max ${M.decodeMs.max} ms; build ${M.buildMs} ms; portals ${JSON.stringify(M.portals)}`);
  console.log(`  ${M.places} places (${M.districts} districts), ${M.stations} stations, coast ${M.coast}, border ${M.border.join('/')}`);
  for (const l of M.lines) console.log('  ' + l);
}
console.log(fails ? `${fails} failure(s)` : 'province: ok');
process.exit(fails ? 1 : 0);
