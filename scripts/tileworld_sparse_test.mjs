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
    ] },
    { i: 1, j: 0, sections: [
      { type: G.SECTION.RAILS, rows: [{ gid: 1, pts: [[1010, 10], [1110, 10]], z: [0, 0] }] },
      { type: G.SECTION.FURNITURE, rows: [{ gid: 1, k: 'hedge', pts: [[1010, 20], [1060, 20]] }] },
    ] },
  ];
}
const global = { sections: [{ type: G.SECTION.META, json: { counts: { rails: 2, furniture: 2 }, meta: {} } }] };
const opts = { sparse: ['rails', 'furniture'] };

// dichte wereld (oud gedrag) en sparse wereld (nieuw) uit dezelfde rijen
const dense = TileWorld.fromTiles(global, mkTiles());
const sparse = TileWorld.fromTiles(global, mkTiles(), opts);

ok(dense.rails.length === 2 && dense.furniture.length === 2, 'de dichte wereld heeft de arraylaag nog');
ok(sparse.rails.length === 0 && sparse.furniture.length === 0, 'de sparse wereld heeft geen rails/furniture-arraylaag', `${sparse.rails.length}/${sparse.furniture.length}`);
ok(gridItems(sparse.railGrid).length === 2 && gridItems(sparse.furnitureGrid).length === 2, 'de rasters van de sparse wereld zijn gevuld');
ok(JSON.stringify(sig(gridItems(sparse.railGrid))) === JSON.stringify(sig(gridItems(dense.railGrid))), 'dezelfde sporen in het raster als bij de dichte wereld');
ok(JSON.stringify(sig(gridItems(sparse.furnitureGrid))) === JSON.stringify(sig(gridItems(dense.furnitureGrid))), 'dezelfde meubels in het raster als bij de dichte wereld');
ok(sparse.railNear(60, 10, 5).length === 1, 'railNear vindt het spoor van de sparse wereld');
ok(sparse.furnitureGrid.query(15, 15, 25, 25).length === 1, 'de meubelvraag vindt de lamp van de sparse wereld');

// drop-pad: een gepinde tegel valt weg; sparse soorten gaan mee, dichte soorten blijven (pin)
const tk = '0,0';
ok(sparse.dropTile(tk) === true, 'de gepinde tegel valt uit de sparse wereld');
ok(gridItems(sparse.railGrid).length === 1 && gridItems(sparse.furnitureGrid).length === 1, 'alleen de rijen van die tegel zijn uit de rasters', `${gridItems(sparse.railGrid).length}/${gridItems(sparse.furnitureGrid).length}`);
ok(!sparse._res.rails.has(0) && sparse._res.rails.has(1), 'de rij is ook uit _res');
const denseBefore = { rails: gridItems(dense.railGrid).length, furniture: gridItems(dense.furnitureGrid).length };
ok(dense.dropTile(tk) === true, 'dezelfde tegel valt ook uit de dichte wereld');
ok(dense.rails.length === 2 && gridItems(dense.railGrid).length === denseBefore.rails, 'de dichte wereld houdt zijn rails (de pin)');
ok(dense.furniture.length === 2 && gridItems(dense.furnitureGrid).length === denseBefore.furniture, 'de dichte wereld houdt zijn meubels (de pin)');

// terugkomst: addTile zet de rijen van de tegel terug, geen tweede kopie
const back = mkTiles()[0];
sparse.addTile(back, '');
ok(gridItems(sparse.railGrid).length === 2 && gridItems(sparse.furnitureGrid).length === 2, 'de tegel komt terug in de rasters');
ok(sparse._res.rails.size === 2 && sparse._res.furniture.size === 2, 'en in _res, zonder dubbele gids');
ok(JSON.stringify(sig(gridItems(sparse.railGrid))) === JSON.stringify(sig(gridItems(dense.railGrid))), 'pariteit na drop+add: dezelfde sporen als de dichte wereld');

// de dichte-gid-check blijft voor de andere soorten: een ontbrekende weg is nog steeds een fout
const broken = mkTiles();
broken[0].sections.push({ type: G.SECTION.ROADS, rows: [{ gid: 0, pts: [[0, 0], [10, 0]] }] });
let threw = '';
try { TileWorld.fromTiles({ sections: [{ type: G.SECTION.META, json: { counts: { rails: 2, furniture: 2, roads: 2 }, meta: {} } }] }, broken); } catch (e) { threw = String(e.message); }
ok(/tiles lack roads/.test(threw), 'een dicht soort met een gat is nog steeds een fout', threw.slice(0, 60));

// Echte wereld: dezelfde opgeslagen tegels één keer dicht en één keer met een sparse
// index (zoals een nieuwe wereldbouw hem schrijft); de spoor- en meubelrasters moeten
// precies hetzelfde zien. Zonder game/world: SKIP (zoals canopy_base_test).
const { heeftWereld, wereldMap } = await import('./lib/stadtegels.mjs');
if (heeftWereld()) {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const T = await import('../game/js/tilestore.js');
  const { loadTileWorld } = await import('../game/js/tileworld.js');
  const dir = wereldMap();
  const files = {};
  for (const f of fs.readdirSync(dir)) if (/\.(gdp|json)$/.test(f)) files[f] = new Uint8Array(fs.readFileSync(path.join(dir, f)));
  const idx = JSON.parse(new TextDecoder().decode(files['index.json']));
  const denseWorld = (await loadTileWorld('world/', { source: new T.MemorySource({ ...files }), pool: false })).world;
  const sparseFiles = { ...files };
  sparseFiles['index.json'] = new TextEncoder().encode(JSON.stringify({ ...idx, sparse: ['rails', 'furniture'] }));
  const sparseWorld = (await loadTileWorld('world/', { source: new T.MemorySource(sparseFiles), pool: false })).world;
  const wsig = (g) => gridItems(g).map((o) => JSON.stringify({ k: o.k || o.type || '', pts: o.pts && o.pts.slice(0, 2), z: o.z && o.z.slice(0, 2) })).sort();
  ok(sparseWorld.rails.length === 0 && sparseWorld.furniture.length === 0, 'de echte wereld laadt zonder rails/furniture-arraylaag');
  ok(gridItems(sparseWorld.railGrid).length === gridItems(denseWorld.railGrid).length, 'de echte wereld: evenveel sporen in het raster', `${gridItems(sparseWorld.railGrid).length} vs ${gridItems(denseWorld.railGrid).length}`);
  ok(gridItems(sparseWorld.furnitureGrid).length === gridItems(denseWorld.furnitureGrid).length, 'de echte wereld: evenveel meubels in het raster');
  ok(JSON.stringify(wsig(sparseWorld.railGrid)) === JSON.stringify(wsig(denseWorld.railGrid)), 'de echte wereld: dezelfde sporen (pariteit)');
  ok(JSON.stringify(wsig(sparseWorld.furnitureGrid)) === JSON.stringify(wsig(denseWorld.furnitureGrid)), 'de echte wereld: dezelfde meubels (pariteit)');
  console.log(`(echte wereld meegeteld: ${gridItems(sparseWorld.railGrid).length} sporen, ${gridItems(sparseWorld.furnitureGrid).length} meubels)`);
}

console.log(`tileworld_sparse_test: ${fails ? fails + ' FAILED' : 'ok'} (${n} checks)`);
process.exit(fails ? 1 : 0);
