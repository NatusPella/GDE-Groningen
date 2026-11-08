// Sparse arraylaag + drop-pad voor spoor en meubels (#314 C1/C2, stappen 1-2).
// De gepinde stad levert geen dichte rails/furniture-array meer: die rijen leven in _res en
// in de rasters, en een tegel die uit de store valt haalt ze er per tegel uit; komt de tegel
// terug, dan zet addTile ze terug zonder tweede kopie. De andere soorten blijven dicht (pin).
//   node scripts/tileworld_sparse_test.mjs
import './node3d.mjs';
const { TileWorld } = await import('../game/js/tileworld.js');
const G = await import('../game/js/gdt.js');
const { gridItems } = await import('../game/js/spatialgrid.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const sig = (list) => list.map((o) => `${o.pts ? o.pts[0] : o.k}:${o.pts ? o.pts.length : ''}`).sort();

// Twee gepinde tegels met elk een spoor (met profiel) en een meubelstuk; geen wegen nodig.
function mkTiles() {
  return [
    { i: 0, j: 0, sections: [
      { type: G.SECTION.RAILS, rows: [{ gid: 0, pts: [[10, 10], [110, 10]], z: [0, 4] }] },
      { type: G.SECTION.FURNITURE, rows: [{ gid: 0, k: 'lamp', pts: [[20, 20]] }] },
      { type: G.SECTION.BUILDINGS, rows: [{ gid: 0, pts: sq(200, 200, 20), type: 'house', h: 6 }] },
      { type: G.SECTION.GREEN, rows: [{ gid: 0, pts: sq(300, 300, 30), kind: 'gras' }] },
      { type: G.SECTION.TREES, rows: [{ g: 0, p: [[400, 400]] }] },
      { type: G.SECTION.WATER, rows: [{ gid: 0, pts: sq(500, 500, 40), kind: 'meer', lv: 0, nav: 0 }] },
      { type: G.SECTION.ROADS, rows: [{ gid: 0, pts: [[600, 600], [700, 600]], cat: 'normal', type: 'residential', width: 6, name: 'Straat' }] },
    ] },
    { i: 1, j: 0, sections: [
      { type: G.SECTION.RAILS, rows: [{ gid: 1, pts: [[1010, 10], [1110, 10]], z: [0, 0] }] },
      { type: G.SECTION.FURNITURE, rows: [{ gid: 1, k: 'hedge', pts: [[1010, 20], [1060, 20]] }] },
      { type: G.SECTION.BUILDINGS, rows: [{ gid: 1, pts: sq(1200, 200, 20), type: 'house', h: 6 }] },
      { type: G.SECTION.GREEN, rows: [{ gid: 1, pts: sq(1300, 300, 30), kind: 'gras' }] },
      { type: G.SECTION.TREES, rows: [{ g: 1, p: [[1400, 400]] }] },
      { type: G.SECTION.WATER, rows: [{ gid: 1, pts: sq(1500, 500, 40), kind: 'meer', lv: 0, nav: 0 }] },
      { type: G.SECTION.ROADS, rows: [{ gid: 1, pts: [[1600, 600], [1700, 600]], cat: 'normal', type: 'residential', width: 6, name: 'Straat' }] },
    ] },
  ];
}
const sq = (x, y, s) => [[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]];
const global = { sections: [{ type: G.SECTION.META, json: { counts: { rails: 2, furniture: 2, buildings: 2, trees: 2, green: 2, water: 2, roads: 2 }, meta: {} } }] };
const KINDS = ['roads', 'buildings', 'water', 'trees', 'rails', 'furniture', 'green'];
const GRIDS = { roads: 'roadGrid', rails: 'railGrid', furniture: 'furnitureGrid', buildings: 'buildingGrid', trees: 'treeGrid', green: 'greenGrid', water: 'waterGrid' };
const opts = { sparse: KINDS };

// dichte wereld (oud gedrag) en sparse wereld (nieuw) uit dezelfde rijen
const dense = TileWorld.fromTiles(global, mkTiles());
const sparse = TileWorld.fromTiles(global, mkTiles(), opts);

ok(dense.rails.length === 2 && dense.furniture.length === 2, 'de dichte wereld heeft de arraylaag nog');
ok(KINDS.every((k) => sparse[k].length === 0), 'de sparse wereld heeft voor alle zeven soorten geen arraylaag', KINDS.map((k) => `${k}:${sparse[k].length}`).join(','));
ok(sparse.orderedRoads().length === 2 && sparse.orderedRoads()[0]._ord <= sparse.orderedRoads()[1]._ord, 'de wegen komen in bouwvolgorde uit het raster (geen array nodig)');
ok(KINDS.every((k) => gridItems(sparse[GRIDS[k]]).length === 2), 'de rasters van de sparse wereld zijn gevuld');
for (const k of KINDS) ok(JSON.stringify(sig(gridItems(sparse[GRIDS[k]]))) === JSON.stringify(sig(gridItems(dense[GRIDS[k]]))), `dezelfde ${k} in het raster als bij de dichte wereld`);
ok(sparse.railNear(60, 10, 5).length === 1, 'railNear vindt het spoor van de sparse wereld');
ok(sparse.furnitureGrid.query(15, 15, 25, 25).length === 1, 'de meubelvraag vindt de lamp van de sparse wereld');
ok(sparse.buildingsNear(205, 205, 1).length === 1, 'buildingsNear vindt het huis van de sparse wereld');
ok(sparse.greenNear(305, 305, 1).length === 1, 'greenNear vindt het groen van de sparse wereld');
ok(gridItems(sparse.treeGrid).length === 2, 'de bomen staan in het boomraster');
ok(sparse.waterNear(510, 510, 1).length === 1, 'waterNear vindt de plas van de sparse wereld');
ok(sparse._waterByWi && sparse._waterByWi.length === 2 && sparse._waterByWi[0]._wi === 0 && sparse._waterByWi[1]._wi === 1, 'de waterrijen houden hun bouw-id voor de geo-werker');

// drop-pad: een gepinde tegel valt weg; sparse soorten gaan mee, dichte soorten blijven (pin)
const tk = '0,0';
const geo0 = sparse.geoVer || 0;
ok(sparse.dropTile(tk) === true, 'de gepinde tegel valt uit de sparse wereld');
ok(sparse.geoVer === geo0 + 1, 'de geo-versie stijgt bij een drop (caches kunnen verversen)');
ok(KINDS.every((k) => gridItems(sparse[GRIDS[k]]).length === 1), 'alleen de rijen van die tegel zijn uit de rasters');
ok(!sparse._res.rails.has(0) && sparse._res.rails.has(1) && !sparse._res.buildings.has(0) && !sparse._res.green.has(0) && !sparse._res.trees.has(0) && !sparse._res.water.has(0) && !sparse._res.roads.has(0), 'de rijen zijn ook uit _res (ook het water en de weg)');
const denseBefore = Object.fromEntries(KINDS.map((k) => [k, gridItems(dense[GRIDS[k]]).length]));
ok(dense.dropTile(tk) === true, 'dezelfde tegel valt ook uit de dichte wereld');
for (const k of KINDS) ok(dense[k].length === 2 && gridItems(dense[GRIDS[k]]).length === denseBefore[k], `de dichte wereld houdt zijn ${k} (de pin)`);

// terugkomst: addTile zet de rijen van de tegel terug, geen tweede kopie
const back = mkTiles()[0];
sparse.addTile(back, '');
ok(sparse.geoVer === geo0 + 2, 'de geo-versie stijgt bij een add');
ok(KINDS.every((k) => gridItems(sparse[GRIDS[k]]).length === 2), 'de tegel komt terug in alle rasters');
ok(sparse._res.rails.size === 2 && sparse._res.furniture.size === 2 && sparse._res.buildings.size === 2 && sparse._res.green.size === 2, 'en in _res, zonder dubbele gids');
for (const k of KINDS) ok(JSON.stringify(sig(gridItems(sparse[GRIDS[k]]))) === JSON.stringify(sig(gridItems(dense[GRIDS[k]]))), `pariteit na drop+add: dezelfde ${k} als de dichte wereld`);

// de dichte-gid-check blijft voor de andere soorten: een ontbrekende weg is nog steeds een fout
const broken = mkTiles();
broken[0].sections.push({ type: G.SECTION.ROADS, rows: [{ gid: 0, pts: [[0, 0], [10, 0]] }] });
let threw = '';
// alleen deze tegel: het tweede wegslot (gid 1) ontbreekt in een dichte wereld
try { TileWorld.fromTiles({ sections: [{ type: G.SECTION.META, json: { counts: { roads: 2 }, meta: {} } }] }, [broken[0]]); } catch (e) { threw = String(e.message); }
ok(/tiles lack roads/.test(threw), 'een dicht soort met een gat is nog steeds een fout', threw.slice(0, 60));

// #764: prefetchPoints vraagt de tegels van de punten echt aan. De letterlijke
// \n-reeksen maakten de functie een no-op die undefined teruggaf (node --check zag
// daar niets van); deze nep-store ziet wat er gevraagd wordt.
{
  const gevraagd = [];
  const nepStore = {
    on() {},
    index: { tiles: {} },
    keysAround: (x, y) => [`${x},${y}`, `${x},${y + 1}`],
    request: (k) => { gevraagd.push(k); return Promise.resolve({}); },
  };
  const pf = TileWorld.fromTiles(global, mkTiles());
  pf.attachStore(nepStore);
  const n = await pf.prefetchPoints([[0, 0]], { radius: 10, token: 'prefetch-test' });
  ok(gevraagd.length === 2 && n !== undefined, 'prefetchPoints vraagt de tegels aan (#764)', `${gevraagd.length} aanvragen, resultaat ${n}`);
}

// #762: een overlay-resident (de rijklasse vanaf OVERLAY_GID0 van een stadstegel,
// 'o' + plaats) heeft geen eigen store-entry. Valt de stadstegel uit de store, dan
// moet zijn overlay mee uit _res en de rasters; anders blijft die de hele sessie staan.
{
  const tw = TileWorld.fromTiles(global, mkTiles(), opts);
  const OVER = 20_000_000; // OVERLAY_GID0 (tileworld.js)
  const overlay = { i: 0, j: 0, sections: [
    { type: G.SECTION.BUILDINGS, rows: [{ gid: OVER, pts: sq(50, 50, 20), h: 6 }] },
    { type: G.SECTION.ROADS, rows: [{ gid: OVER + 1, pts: [[40, 40], [60, 40]], type: 'residential', cat: 'normal', width: 6 }] },
  ] };
  tw.addTile(overlay, 'o0,0');
  let dropHandler = null;
  const nepStore = { index: { tiles: { '0,0': { i: 0, j: 0 } } }, on: (ev, fn) => { if (ev === 'drop') dropHandler = fn; } };
  tw.attachStore(nepStore);
  ok(tw.resident.has('o0,0') && tw._res.buildings.has(OVER) && tw._res.roads.has(OVER + 1), 'de overlay-resident staat naast de stadstegel');
  const before = gridItems(tw.buildingGrid).length;
  dropHandler('0,0');
  tw.tileQueue.run(1e9);
  ok(!tw.resident.has('o0,0') && !tw._res.buildings.has(OVER) && !tw._res.roads.has(OVER + 1),
    'de overlay-resident valt mee met de store-drop (#762)', `resident ${tw.resident.has('o0,0')}, building ${tw._res.buildings.has(OVER)}`);
  ok(gridItems(tw.buildingGrid).length < before, 'en de overlayrijen zijn uit de rasters', `${before} -> ${gridItems(tw.buildingGrid).length}`);
}

// Echte wereld: dezelfde opgeslagen tegels één keer dicht en één keer met een sparse
// index (zoals een nieuwe wereldbouw hem schrijft); alle vijf rasters moeten precies
// hetzelfde zien en de arraylaag moet leeg zijn. Zonder game/world: SKIP.
// (#764) pack_tiles.mjs schrijft op HEAD altijd `index.sparse`; de dichte baseline
// schrijven we hier zelf door de sparse-vlag uit de index te halen. De pakketten zijn
// identiek, alleen de laag die fromTiles bouwt verschilt.
const { heeftWereld, wereldMap } = await import('./lib/stadtegels.mjs');
if (heeftWereld()) {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const T = await import('../game/js/tilestore.js');
  const { loadTileWorld, splitOverlay } = await import('../game/js/tileworld.js');
  const dir = wereldMap();
  const files = {};
  for (const f of fs.readdirSync(dir)) if (/\.(gdp|json)$/.test(f)) files[f] = new Uint8Array(fs.readFileSync(path.join(dir, f)));
  const idx = JSON.parse(new TextDecoder().decode(files['index.json']));
  const denseFiles = { ...files };
  const { sparse: _sparse, ...denseIndex } = idx;
  denseFiles['index.json'] = new TextEncoder().encode(JSON.stringify(denseIndex));
  const denseLoad = await loadTileWorld('world/', { source: new T.MemorySource(denseFiles), pool: false });
  const denseWorld = denseLoad.world;
  const sparseFiles = { ...files };
  sparseFiles['index.json'] = new TextEncoder().encode(JSON.stringify({ ...idx, sparse: KINDS }));
  const sparseLoad = await loadTileWorld('world/', { source: new T.MemorySource(sparseFiles), pool: false });
  const sparseWorld = sparseLoad.world;
  const wsig = (g) => gridItems(g).map((o) => JSON.stringify({ k: o.k || o.type || '', pts: o.pts && o.pts.slice(0, 2), z: o.z && o.z.slice(0, 2) })).sort();
  ok(KINDS.every((k) => sparseWorld[k].length === 0), 'de echte wereld laadt zonder arraylaag voor de zeven sparse soorten');
  ok(KINDS.every((k) => denseWorld[k].length === (idx.counts[k] || 0)), 'de dichte wereld heeft de arraylaag nog (even groot als de telling)');
  ok(sparseWorld.orderedRoads().length === gridItems(denseWorld.roadGrid).length, 'de echte wereld: alle wegen in bouwvolgorde uit het raster');
  for (const k of KINDS) {
    ok(gridItems(sparseWorld[GRIDS[k]]).length === gridItems(denseWorld[GRIDS[k]]).length, `de echte wereld: evenveel ${k} in het raster`, `${gridItems(sparseWorld[GRIDS[k]]).length} vs ${gridItems(denseWorld[GRIDS[k]]).length}`);
    ok(JSON.stringify(wsig(sparseWorld[GRIDS[k]])) === JSON.stringify(wsig(denseWorld[GRIDS[k]])), `de echte wereld: dezelfde ${k} (pariteit)`);
  }
  // #314 C1: de sparse wereld houdt de stad niet meer vast; de dichte oude wereld wel.
  const pinned = (load) => [...Object.keys(idx.tiles)].filter((k) => { const e = load.store.entries.get(k); return e && e.pinned; });
  ok(pinned(sparseLoad).length === 0, 'de sparse wereld laadt zonder city-pin', String(pinned(sparseLoad).length));
  ok(pinned(denseLoad).length > 0, 'de oude dichte wereld blijft gepind (achterwaartse compatibiliteit)');
  // een stadstegel valt uit de store en komt terug, zoals bij het streamen
  const key = Object.keys(idx.tiles).find((k) => (idx.tiles[k].n && idx.tiles[k].n.buildings > 300) && !idx.tiles[k].ov);
  const tegel = idx.tiles[key];
  const before = gridItems(sparseWorld.buildingGrid).length;
  ok(sparseWorld.dropTile(`${tegel.i},${tegel.j}`) === true, 'de sparse stadstegel valt weg');
  ok(gridItems(sparseWorld.buildingGrid).length < before, 'de gebouwen van die tegel zijn uit het raster', `${before} -> ${gridItems(sparseWorld.buildingGrid).length}`);
  const city = splitOverlay(await sparseLoad.store.request(key)).city;
  sparseWorld.addTile(city, '');
  ok(gridItems(sparseWorld.buildingGrid).length === before, 'en komen met addTile terug zonder dubbele rijen', `${gridItems(sparseWorld.buildingGrid).length} vs ${before}`);
  console.log(`(echte wereld meegeteld: ${KINDS.map((k) => `${gridItems(sparseWorld[GRIDS[k]]).length} ${k}`).join(', ')})`);
}

// #314: de router bouwt zijn graaf uit het wegenraster en haalt de weg bij een
// knooppunt uit dezelfde lijst, niet uit de sparse arraylaag.
{
  const R = await import('../game/js/routing.js');
  const route = R.findWalkPath(sparse, 605, 600, 695, 600);
  ok(route && route.pts.length >= 2 && route.legs.length >= 1 && route.legs.every(Boolean), 'routing werkt op de sparse wegenlaag');
}

// #754: de caches hangen aan laagversies, niet aan geoVer. Een tegel zonder weg- of
// gebouwrijen laat de routinggraaf staan; een gestroomde tegel met water laat de
// waterindex (die over het vaste water gaat) staan, maar vast water dat uit het
// raster gaat ververst hem wel.
{
  const R = await import('../game/js/routing.js');
  const W = await import('../game/js/waterindex.js');
  const buildMs = R.getRoutingStats().buildMs;
  sparse.addTile({ i: 5, j: 5, sections: [
    { type: G.SECTION.TREES, rows: [{ g: 99, p: [[5005, 5005]] }] },
    { type: G.SECTION.GREEN, rows: [{ gid: 99, pts: sq(5000, 5000, 20), kind: 'gras' }] },
  ] }, '5,5');
  R.findWalkPath(sparse, 605, 600, 695, 600);
  ok(R.getRoutingStats().buildMs === buildMs, 'een tegel zonder wegen of gebouwen herbouwt de routinggraaf niet (#754)', `${buildMs} -> ${R.getRoutingStats().buildMs}`);
  const wi = W.getWaterIndex(sparse);
  sparse.addTile({ i: 6, j: 6, sections: [{ type: G.SECTION.WATER, rows: [{ gid: 500, pts: sq(5000, 5000, 30), kind: 'sloot', lv: 0, nav: 0 }] }] }, '6,6');
  ok(W.getWaterIndex(sparse) === wi, 'gestroomd tegelwater herdraait de waterindex niet (#754)');
  sparse.dropTile('1,0'); // vast (gepind) water van die tegel gaat uit het raster
  ok(W.getWaterIndex(sparse) !== wi, 'vast water dat uit het raster gaat ververst de waterindex wel (#754)');
}

console.log(`tileworld_sparse_test: ${fails ? fails + ' FAILED' : 'ok'} (${n} checks)`);
process.exit(fails ? 1 : 0);
