// CPU-profiel 21-11 (docs/PERF-WEGINDEX-21-11.md): de kosten van een tegelwissel voor de hoekpuntindexen, oud (alles
// opnieuw over alle geladen wegen) tegen nieuw (de gedeelde index en de verkeersgraaf per delta), op de echte tegels
// van game/world (junction of GDE_WORLD_DIR) of, zonder wereld, op synthetische tegels.
// Gebruik: node --expose-gc scripts/perf/roadindex_bench.mjs [stappen=30] [tegels=36]
import '../node3d.mjs';
import fs from 'node:fs';
const STEPS = +process.argv[2] || 30, TILES = +process.argv[3] || 36;
const { gridItems, SpatialGrid } = await import('../../game/js/spatialgrid.js');
const { roadIndexOf, nodeKey } = await import('../../game/js/roadindex.js');
const { trafficRoadGraph } = await import('../../game/js/vehicle/traffic.js');
const gc = () => { if (globalThis.gc) { globalThis.gc(); globalThis.gc(); } };
const heap = () => { gc(); return process.memoryUsage().heapUsed / 1e6; };
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
const p95 = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * 0.95))]; };

// de oude bouwers, letterlijk zoals ze waren (roadsurface.fillNodes, trafficlights.buildNodes)
const oldFillNodes = (map) => {
  const idx = new Map();
  for (const r of gridItems(map.roadGrid)) for (let i = 0; i < r.pts.length; i++) {
    const k = nodeKey(r.pts[i]);
    let a = idx.get(k);
    if (!a) idx.set(k, a = []);
    a.push(r, i);
  }
  return idx;
};
const oldBuildNodes = (map) => {
  const nodes = new Map();
  for (const r of gridItems(map.roadGrid)) {
    if (r.cat === 'foot' || r.pts.length < 2) continue;
    r.pts.forEach((p, idx) => {
      const k = Math.round(p[0] * 10) + ',' + Math.round(p[1] * 10);
      let a = nodes.get(k);
      if (!a) nodes.set(k, a = []);
      a.push({ road: r, idx });
    });
  }
  return nodes;
};

let world, swap, label;
const worldDir = process.env.GDE_WORLD_DIR ? new URL('file:///' + process.env.GDE_WORLD_DIR.replace(/\\/g, '/') + '/') : new URL('../../game/world/', import.meta.url);
if (fs.existsSync(new URL('index-provincie.json', worldDir))) {
  const { loadGameWorld, loadArea } = await import('../worldload.mjs');
  const T = await loadGameWorld();
  const G = await import('../../game/js/gdt.js');
  // de tegels rond de stad, in een rij van west naar oost: een wandeling
  const keys = Object.keys(T.index.tiles).filter((k) => T.index.tiles[k] && k[0] !== 'o').map((k) => ({ k, i: T.index.tiles[k].i, j: T.index.tiles[k].j })).sort((a, b) => a.i - b.i || a.j - b.j);
  const mid = keys.find((e) => e.i >= 234 && e.j >= 581) || keys[keys.length >> 1];
  const near = keys.map((e) => ({ ...e, d: Math.hypot(e.i - mid.i, e.j - mid.j) })).sort((a, b) => a.d - b.d).slice(0, TILES + STEPS + 8);
  world = T.world;
  // de eerste TILES tegels erin, de rest wordt de stroom
  const load = async (e) => { T.store.pin(e.k); await T.store.request(e.k, { priority: -1 }); world.tileQueue.run(1e9); };
  for (const e of near) await load(e);
  const tileOf = (e) => ({ tile: T.store.tile(e.k), key: e.k });
  const resident = near.slice(0, TILES), pool = near.slice(TILES);
  // alles wat bij de stroom hoort eerst weer eraf (de pool): alleen de eerste TILES staan erin
  for (const e of pool) { const t = tileOf(e).tile; if (t) world.dropTile(`${t.i},${t.j}`); }
  swap = () => {
    const out = resident.shift(), inn = pool.shift();
    const o = tileOf(out), i = tileOf(inn);
    if (o.tile) world.dropTile(`${o.tile.i},${o.tile.j}`);
    if (i.tile) world.addTile(i.tile, i.key);
    resident.push(inn); pool.push(out);
  };
  label = `echte tegels (${TILES} resident, ${near.length} bekend)`;
} else {
  // synthetische tegels: 1 km vakken met ~900 wegen, een wandeling van west naar oost
  const { TileWorld } = await import('../../game/js/tileworld.js').catch(() => ({}));
  world = { roadGrid: new SpatialGrid(64), roads: [], _roadVer: 1, geoVer: 1 };
  world.roadsNear = (x, y, r) => world.roadGrid.query(x - r, y - r, x + r, y + r);
  world.orderedRoads = () => gridItems(world.roadGrid).sort((a, b) => (a._ord ?? 0) - (b._ord ?? 0));
  let seed = 5; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  let ord = 0;
  const tile = (i) => {
    const roads = [];
    for (let n = 0; n < 900; n++) {
      const pts = []; let x = i * 1000 + rnd() * 1000, y = rnd() * 1000;
      for (let k = 0; k < 2 + Math.floor(rnd() * 9); k++) { pts.push([x, y]); x += (rnd() - 0.4) * 30; y += (rnd() - 0.4) * 30; }
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      roads.push({ pts, cat: rnd() < 0.2 ? 'foot' : 'normal', width: 6, bounds: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] });
    }
    return roads;
  };
  const live = [];
  let next = 0;
  const add = () => { const t = tile(next++); for (const r of t) { r._ord = 1e7 + ++ord; world.roadGrid.insert(r, r.bounds); if (world._roadIndex) world._roadIndex.add(r); world._roadVer++; } live.push(t); world.geoVer++; };
  swap = () => { const t = live.shift(); for (const r of t) { world.roadGrid.remove(r, r.bounds); if (world._roadIndex) world._roadIndex.remove(r); world._roadVer++; } world.geoVer++; add(); };
  for (let i = 0; i < TILES; i++) add();
  label = `synthetische tegels (${TILES} van 900 wegen)`;
}

const roadsNow = gridItems(world.roadGrid).length;
console.log(`${label}: ${roadsNow} wegen geladen, ${STEPS} tegelwissels`);

// ---- geheugen: oude kopieen tegen de ene index
{
  const base = heap();
  const a = oldFillNodes(world), b = oldBuildNodes(world);
  const g = trafficRoadGraph(Object.create(world));
  const old = heap() - base;
  const keep = [a, b, g];
  void keep;
  gc();
  const base2 = heap();
  delete world._roadIndex;
  const idx = roadIndexOf(world);
  const nieuw = heap() - base2;
  console.log(`geheugen: oude indexen (roadsurface + trafficlights + verkeersgraaf) ${old.toFixed(1)} MB, gedeelde index ${nieuw.toFixed(1)} MB`);
  void idx;
}

// ---- tijd per tegelwissel
const oldMs = [], newMs = [], newIdxMs = [];
const idx = roadIndexOf(world);
const g = trafficRoadGraph(world); // de eerste (volledige) bouw telt niet mee
let allocOld = 0, allocNew = 0;
for (let s = 0; s < STEPS; s++) {
  const m0 = process.memoryUsage().heapUsed;
  swap();
  const t1 = performance.now();
  trafficRoadGraph(world); // de graaf per delta (de index zelf werd al bijgewerkt door de tegelwereld)
  newMs.push(performance.now() - t1);
  allocNew += Math.max(0, process.memoryUsage().heapUsed - m0);
  const m1 = process.memoryUsage().heapUsed;
  const t0 = performance.now();
  oldFillNodes(world); oldBuildNodes(world);
  trafficRoadGraph(Object.create(world)); // een nieuw object: volledige herbouw, zoals de oude roadGraph
  oldMs.push(performance.now() - t0);
  allocOld += Math.max(0, process.memoryUsage().heapUsed - m1);
}
const fmt = (a) => `mediaan ${med(a).toFixed(2)} ms, p95 ${p95(a).toFixed(2)} ms, max ${Math.max(...a).toFixed(2)} ms, totaal ${a.reduce((x, y) => x + y, 0).toFixed(0)} ms`;
console.log(`oud (fillNodes + buildNodes + roadGraph, alles opnieuw): ${fmt(oldMs)}`);
console.log(`nieuw (index bijgewerkt door de tegelwereld + graaf per delta): ${fmt(newMs)}`);
console.log(`snelheid: ${(med(oldMs) / Math.max(1e-6, med(newMs))).toFixed(0)}x op de mediaan; kortlevende allocaties (heapgroei zonder gc) oud ${(allocOld / 1e6).toFixed(0)} MB, nieuw ${(allocNew / 1e6).toFixed(1)} MB over ${STEPS} wissels`);
// juistheid van de laatste stand: de index tegen een verse opbouw
{
  const fresh = oldFillNodes(world);
  let bad = 0;
  if (fresh.size !== idx.nodeCount) bad++;
  for (const [k, l] of fresh) { const m = idx.get(k); if (!m || m.length !== l.length) bad++; }
  console.log(`index tegen verse opbouw: ${bad ? bad + ' verschillen' : 'gelijk'} (${idx.nodeCount} knopen, ${idx.size} wegen)`);
  if (bad) process.exit(1);
}
// de gebouwtoetscache van routing.js: routes met warme cache (na tegelwissels) tegen dezelfde routes met koude cache
if (world.buildingGrid && world.tileQueue) {
  const R = await import('../../game/js/routing.js');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const roads = gridItems(world.roadGrid).filter((r) => r.cat !== 'foot' && r.cat !== 'cycle' && r.pts.length > 2);
  let sd = 3; const rn = () => (sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296;
  const pick = () => { const r = roads[Math.floor(rn() * roads.length)]; return r.pts[r.pts.length >> 1]; };
  const pairs = Array.from({ length: 10 }, () => [pick(), pick()]);
  world.tileQueue.run(1e9);
  R.planLandRoute(world, 'drive', pairs[0][0], pairs[0][1]); // eerste bouw: vult de cache
  for (let k = 0; k < 3; k++) swap();
  world.tileQueue.run(1e9);
  R.planLandRoute(world, 'drive', pairs[0][0], pairs[0][1]); // markeert de graaf als verouderd; hij bouwt pas na 1 s stilte
  await sleep(1300);
  const h0 = R.throughStats.hit, m0 = R.throughStats.miss;
  const tb = performance.now();
  const warm = pairs.map(([a, b]) => R.planLandRoute(world, 'drive', a, b));
  const warmMs = performance.now() - tb;
  const hits = R.throughStats.hit - h0, misses = R.throughStats.miss - m0;
  world._tbEpoch = (world._tbEpoch || 0) + 1; world._roadVer++; // alles onthouden vervalt, de graaf is verouderd
  R.planLandRoute(world, 'drive', pairs[0][0], pairs[0][1]);
  await sleep(1300);
  const tc = performance.now();
  const cold = pairs.map(([a, b]) => R.planLandRoute(world, 'drive', a, b));
  const coldMs = performance.now() - tc;
  const sig = (x) => (x ? x.pts.length + ':' + x.pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(';') : 'null');
  const same = warm.every((w, i) => sig(w) === sig(cold[i]));
  console.log(`gebouwtoets per weg (routing.js): graafbouw met warme cache ${hits} treffers / ${misses} missers (${(100 * hits / Math.max(1, hits + misses)).toFixed(0)}% uit de cache), ${warm.filter(Boolean).length}/10 routes; routes met warme en koude cache ${same ? 'gelijk' : 'VERSCHILLEN'} (eerste route incl. graafbouw: warm ${warmMs.toFixed(0)} ms, koud ${coldMs.toFixed(0)} ms)`);
  if (!same) process.exit(1);
}
// juistheid van de verkeersgraaf op deze tegels: leden per hoekpunt van de delta-graaf tegen een volledige herbouw
{
  const A = trafficRoadGraph(world), B = trafficRoadGraph(Object.create(world));
  const ids = new Map();
  const id = (r) => ids.get(r) ?? (ids.set(r, ids.size), ids.size - 1);
  const shape = (gr, r) => gr.nodeOf.get(r).map((n) => n.map((e) => id(e.road) + ':' + e.idx).sort().join('+')).join('/');
  let bad = 0, total = 0;
  for (const r of gridItems(world.roadGrid)) { if (r.cat === 'foot' || r.pts.length < 2) continue; total++; if (shape(A, r) !== shape(B, r)) bad++; }
  console.log(`verkeersgraaf (delta) tegen volledige herbouw: ${bad} van ${total} wegen verschillen`);
  if (bad) process.exit(1);
}
