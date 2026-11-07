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
    ] },
    { i: 1, j: 0, sections: [
      { type: G.SECTION.RAILS, rows: [{ gid: 1, pts: [[1010, 10], [1110, 10]], z: [0, 0] }] },
      { type: G.SECTION.FURNITURE, rows: [{ gid: 1, k: 'hedge', pts: [[1010, 20], [1060, 20]] }] },
      { type: G.SECTION.BUILDINGS, rows: [{ gid: 1, pts: sq(1200, 200, 20), type: 'house', h: 6 }] },
      { type: G.SECTION.GREEN, rows: [{ gid: 1, pts: sq(1300, 300, 30), kind: 'gras' }] },
      { type: G.SECTION.TREES, rows: [{ g: 1, p: [[1400, 400]] }] },
    ] },
  ];
}
const sq = (x, y, s) => [[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]];
const global = { sections: [{ type: G.SECTION.META, json: { counts: { rails: 2, furniture: 2, buildings: 2, trees: 2, green: 2 }, meta: {} } }] };
const KINDS = ['rails', 'furniture', 'buildings', 'trees', 'green'];
const GRIDS = { rails: 'railGrid', furniture: 'furnitureGrid', buildings: 'buildingGrid', trees: 'treeGrid', green: 'greenGrid' };
const opts = { sparse: KINDS };

// dichte wereld (oud gedrag) en sparse wereld (nieuw) uit dezelfde rijen
const dense = TileWorld.fromTiles(global, mkTiles());
const sparse = TileWorld.fromTiles(global, mkTiles(), opts);

ok(dense.rails.length === 2 && dense.furniture.length === 2, 'de dichte wereld heeft de arraylaag nog');
ok(KINDS.every((k) => sparse[k].length === 0), 'de sparse wereld heeft voor alle vijf soorten geen arraylaag', KINDS.map((k) => `${k}:${sparse[k].length}`).join(','));
ok(KINDS.every((k) => gridItems(sparse[GRIDS[k]]).length === 2), 'de rasters van de sparse wereld zijn gevuld');
for (const k of KINDS) ok(JSON.stringify(sig(gridItems(sparse[GRIDS[k]]))) === JSON.stringify(sig(gridItems(dense[GRIDS[k]]))), `dezelfde ${k} in het raster als bij de dichte wereld`);
ok(sparse.railNear(60, 10, 5).length === 1, 'railNear vindt het spoor van de sparse wereld');
ok(sparse.furnitureGrid.query(15, 15, 25, 25).length === 1, 'de meubelvraag vindt de lamp van de sparse wereld');
ok(sparse.buildingsNear(205, 205, 1).length === 1, 'buildingsNear vindt het huis van de sparse wereld');
ok(sparse.greenNear(305, 305, 1).length === 1, 'greenNear vindt het groen van de sparse wereld');
ok(gridItems(sparse.treeGrid).length === 2, 'de bomen staan in het boomraster');

// drop-pad: een gepinde tegel valt weg; sparse soorten gaan mee, dichte soorten blijven (pin)
const tk = '0,0';
const geo0 = sparse.geoVer || 0;
ok(sparse.dropTile(tk) === true, 'de gepinde tegel valt uit de sparse wereld');
ok(sparse.geoVer === geo0 + 1, 'de geo-versie stijgt bij een drop (caches kunnen verversen)');
ok(KINDS.every((k) => gridItems(sparse[GRIDS[k]]).length === 1), 'alleen de rijen van die tegel zijn uit de rasters');
ok(!sparse._res.rails.has(0) && sparse._res.rails.has(1) && !sparse._res.buildings.has(0) && !sparse._res.green.has(0) && !sparse._res.trees.has(0), 'de rijen zijn ook uit _res');
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
try { TileWorld.fromTiles({ sections: [{ type: G.SECTION.META, json: { counts: { rails: 2, furniture: 2, roads: 2 }, meta: {} } }] }, broken); } catch (e) { threw = String(e.message); }
ok(/tiles lack roads/.test(threw), 'een dicht soort met een gat is nog steeds een fout', threw.slice(0, 60));

// Echte wereld: dezelfde opgeslagen tegels één keer dicht en één keer met een sparse
// index (zoals een nieuwe wereldbouw hem schrijft); alle vijf rasters moeten precies
// hetzelfde zien en de arraylaag moet leeg zijn. Zonder game/world: SKIP.
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
  sparseFiles['index.json'] = new TextEncoder().encode(JSON.stringify({ ...idx, sparse: KINDS }));
  const sparseWorld = (await loadTileWorld('world/', { source: new T.MemorySource(sparseFiles), pool: false })).world;
  const wsig = (g) => gridItems(g).map((o) => JSON.stringify({ k: o.k || o.type || '', pts: o.pts && o.pts.slice(0, 2), z: o.z && o.z.slice(0, 2) })).sort();
  ok(KINDS.every((k) => sparseWorld[k].length === 0), 'de echte wereld laadt zonder arraylaag voor de vijf sparse soorten');
  ok(KINDS.every((k) => denseWorld[k].length === (idx.counts[k] || 0)), 'de dichte wereld heeft de arraylaag nog (even groot als de telling)');
  for (const k of KINDS) {
    ok(gridItems(sparseWorld[GRIDS[k]]).length === gridItems(denseWorld[GRIDS[k]]).length, `de echte wereld: evenveel ${k} in het raster`, `${gridItems(sparseWorld[GRIDS[k]]).length} vs ${gridItems(denseWorld[GRIDS[k]]).length}`);
    ok(JSON.stringify(wsig(sparseWorld[GRIDS[k]])) === JSON.stringify(wsig(denseWorld[GRIDS[k]])), `de echte wereld: dezelfde ${k} (pariteit)`);
  }
  console.log(`(echte wereld meegeteld: ${KINDS.map((k) => `${gridItems(sparseWorld[GRIDS[k]]).length} ${k}`).join(', ')})`);
}

console.log(`tileworld_sparse_test: ${fails ? fails + ' FAILED' : 'ok'} (${n} checks)`);
process.exit(fails ? 1 : 0);
