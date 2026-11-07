// De vaste (gepinde) set van TileWorld.fromTiles bouwt dezelfde opzoekrasters als het gestreamde pad (addTile) (#314, C1/C2):
// het perceelraster (landUseAt) en het heggenraster (hedgeNear). Zonder deze rasters ziet een stad die tot de rand uit
// tegels bestaat (C2: geen overlaytegels meer) geen akkers, weides of heggen, en zou het platteland aan de rand zijn
// hekken, vee en heggen verliezen (r32: 179 percelen en 1.991 meubilair-rijen vielen weg).
//
// Het tweede blok bewaakt de pin zelf: een stadstegel uit index.pins.city blijft in de store, een gewone tegel ver weg valt
// weg. Zonder die pin gooit het strooipad (prefetch/evictie, tilestore.js) de stadstegels weg: dropTile haalt hun rijen uit
// de rasters terwijl de hele arrays (map.buildings, map.roads, ...) ze houden, en een herlaadbeurt zet van elk object een
// tweede kopie neer (zelfde gid, ander object). Ontpinnen is C1 en vraagt eerst de 51 modules die hele arrays lezen.
//   node scripts/tileworld_pinned_test.mjs
import './node3d.mjs';
import zlib from 'node:zlib';
import fs from 'node:fs';
const G = await import('../game/js/gdt.js');
const S = await import('../game/js/tilestore.js');
const { TileWorld, loadTileWorld } = await import('../game/js/tileworld.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

const sq = (x, y, s) => [[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]];
const tile = (i, j, sections) => ({ i, j, sections });
const global = { sections: [{ type: G.SECTION.META, json: { counts: { parcels: 2, furniture: 2 }, meta: {} } }] };
const tiles = [
  tile(0, 0, [
    { type: G.SECTION.PARCELS, rows: [{ gid: 0, pts: sq(0, 0, 100), use: 'akker' }, { gid: 1, pts: sq(40, 40, 20), use: 'weide' }] },
    { type: G.SECTION.FURNITURE, rows: [{ gid: 0, k: 'hedge', pts: [[10, 120], [60, 120]], osm: 1 }, { gid: 1, k: 'lamp', pts: [[5, 5]] }] },
  ]),
];
let tw = null;
try { tw = TileWorld.fromTiles(global, tiles); } catch (e) { ok(false, 'fromTiles met percelen en heggen bouwt', e.message); }
if (tw) {
  ok(tw.landUseAt(10, 10) === 'akker', 'landUseAt: akker in het grote perceel', String(tw.landUseAt(10, 10)));
  ok(tw.landUseAt(50, 50) === 'weide', 'landUseAt: het kleinste perceel wint', String(tw.landUseAt(50, 50)));
  ok(tw.landUseAt(500, 500) === null, 'landUseAt: buiten alle percelen niets');
  ok(tw.hedgeNear(30, 120, 5).length === 1 && tw.hedgeNear(30, 120, 5)[0].osm === 1, 'hedgeNear: de gemapte heg wordt gevonden');
  ok(tw.hedgeNear(500, 500, 5).length === 0, 'hedgeNear: ver weg niets');
  ok(tw.hedgeNear(5, 5, 3).length === 0, 'een lantaarn is geen heg');
}

// Dezelfde plas twee keer gemapt (#231): het gestreamde pad laat de tweeling helemaal weg (addTile). De gepinde set houdt
// elke rij (de arrays zijn op gid gesorteerd en de kaartvragen moeten hetzelfde antwoorden als de kaart), maar de tweeling
// gaat niet mee in wat het terrein en de watermeshes tekenen (map.duplicateWater, scene3d.js). Zo wordt hetzelfde water
// niet twee keer over elkaar getekend (donkerder en rommelig) zonder dat waterNear of een andere vraag verandert.
{
  const meta = { sections: [{ type: G.SECTION.META, json: { counts: { water: 2 }, meta: {} } }] };
  const tweeling = TileWorld.fromTiles(meta, [tile(0, 0, [{ type: G.SECTION.WATER, rows: [
    { gid: 0, pts: sq(0, 0, 40), kind: 'meer', lv: 0, nav: 0 },
    { gid: 1, pts: sq(0, 0, 36), kind: 'meer', lv: 0, nav: 0, name: 'Klein meer' },
  ] }])]);
  ok(tweeling.water.length === 2, 'een tweeling blijft in de waterarray (de gids blijven dicht)', String(tweeling.water.length));
  ok(tweeling.duplicateWater && tweeling.duplicateWater.size === 1 && tweeling.duplicateWater.has(tweeling.water[1]), 'de kleinste van de twee is de tweeling');
  ok(tweeling.waterNear(20, 20, 1).length === 2, 'waterNear: de plas wordt nog bij beide rijen gevonden (de kaart verandert niet)', String(tweeling.waterNear(20, 20, 1).length));
  ok(tweeling.water[0].name === undefined && tweeling.water[1].name === 'Klein meer', 'de naam van de tweeling wordt niet verplaatst');
  const anders = TileWorld.fromTiles(meta, [tile(0, 0, [{ type: G.SECTION.WATER, rows: [
    { gid: 0, pts: sq(0, 0, 40), kind: 'meer', lv: 0, nav: 0 },
    { gid: 1, pts: sq(0, 0, 36), kind: 'meer', lv: 0, nav: 2 },
  ] }])]);
  ok(!anders.duplicateWater, 'een andere vaarklasse is geen tweeling');
  const scene = fs.readFileSync(new URL('../game/js/scene3d.js', import.meta.url), 'utf8');
  ok(/const waterRows = \(map\) => gridItems\(map\.waterGrid\)\.filter/.test(scene) && /duplicateWater\.has\(w\)/.test(scene), 'scene3d: het terrein tekent de tweeling niet (uit het waterraster, #524)');
  ok(/const waterNearDrawn = \(map, x, y, r\) =>/.test(scene) && /duplicateWater\.has\(w\)/.test(scene), 'scene3d: de watermeshes slaan de tweeling over');
}

// Het spoor van de gepinde stad in één raster (#314 C2b): railNear en de spoorlezers
// (railway, railprofile, canopies, ringcheck) vinden dezelfde objecten als de array.
{
  const meta = { sections: [{ type: G.SECTION.META, json: { counts: { rails: 1 }, meta: {} } }] };
  const railMap = TileWorld.fromTiles(meta, [tile(0, 0, [{ type: G.SECTION.RAILS, rows: [{ gid: 0, pts: [[0, 0], [100, 0]] }] }])]);
  const near = railMap.railNear(50, 0, 5);
  ok(railMap.railGrid && railMap.railGrid.map.size > 0, 'de gepinde kaart bouwt een railraster');
  ok(near.length === 1 && near[0] === railMap.rails[0], 'railNear vindt hetzelfde spoorobject als map.rails');
  ok(Array.isArray(near[0].bounds) && near[0].bounds.length === 4, 'het spoor heeft bounds voor het raster');
}

// Het straatmeubilair van de gepinde stad in één raster (#314 C2b): streetfurniture3d
// en nightlights3d lezen de meubelrijen daaruit, en een gestroomde tegel voegt ze toe.
{
  const meta = { sections: [{ type: G.SECTION.META, json: { counts: { furniture: 2 }, meta: {} } }] };
  const fmap = TileWorld.fromTiles(meta, [tile(0, 0, [{ type: G.SECTION.FURNITURE, rows: [
    { gid: 0, k: 'hedge', pts: [[10, 120], [60, 120]] },
    { gid: 1, k: 'lamp', pts: [[5, 5]] },
  ] }])]);
  const items = [...fmap.furnitureGrid.map.values()].flat();
  ok(fmap.furnitureGrid && items.length === 2 && items.every((it, i) => items.indexOf(it) === i), 'de gepinde kaart bouwt een meubelraster met elk item één keer');
  ok(items.every((it) => fmap.furniture.includes(it)), 'dezelfde objecten als de meubelarray');
  ok(fmap.furnitureGrid.query(20, 120, 20, 120).length === 1, 'een heg is op zijn plek te vinden');
}

// --- de pin: de stad blijft, de provincie stroomt ------------------------------------------------
// Twee tegels in een eigen pakket: de stad op (0, 0) uit index.pins.city, de provincie op (3, 0) — 3 km verderop. De stad
// is opzettelijk de grootste van de twee (8 gebouwen tegen 1): alleen dan blijft de stad na het wegvallen van de provincie
// boven de helft van het budget, waar het strooipad op let (zoals in de echte wereld: 23,6 MB stad op een budget van 40 MB).
const cityRows = [];
for (let k = 0; k < 8; k++) cityRows.push({ gid: k, pts: sq(100 + k * 6, 100, 8), type: 'house' });
const cityTile = tile(0, 0, [{ type: G.SECTION.BUILDINGS, rows: cityRows }]);
const provTile = tile(3, 0, [{ type: G.SECTION.BUILDINGS, rows: [{ gid: 8, pts: sq(3100, 100, 10), type: 'house' }] }]);
const g2 = G.encodeBlob({ sections: [{ type: G.SECTION.META, json: { counts: { buildings: 8 }, meta: {} } }] });
const parts = [[G.encodeBlob(cityTile), 'city'], [G.encodeBlob(provTile), 'prov'], [g2, 'global']].map(([b, k]) => ({ k, b, z: new Uint8Array(zlib.deflateRawSync(b)) }));
const index2 = { format: G.GDT_FORMAT, builder: 1, frame: 'rd-new', tileM: G.TILE_M, grid: [G.GRID_X0, G.GRID_Y0], rdTile0: [G.RD_TILE_X0, G.RD_TILE_Y0], counts: {}, packs: { p: { file: 'p.gdp' } }, tiles: {}, global: null, pins: {} };
let off2 = 0;
const z2 = [];
for (const p of parts) {
  const e = { off: off2, len: p.z.length, raw: p.b.length, hash: G.hash64(p.b) };
  off2 += p.z.length; z2.push(p.z);
  if (p.k === 'global') index2.global = { pack: 'p', ...e };
  else {
    const [i, j] = p.k === 'city' ? [0, 0] : [3, 0];
    index2.tiles[G.tileKey(i, j)] = { i, j, pack: 'p', ...e, flags: 0, n: { buildings: p.k === 'city' ? 8 : 1 }, maxH: 8 };
  }
}
index2.packs.p.size = off2;
const all2 = new Uint8Array(off2);
let o2 = 0;
for (const z of z2) { all2.set(z, o2); o2 += z.length; }
index2.pins.city = { tiles: [G.tileKey(0, 0)], reason: 'whole-map consumers (F1)' };
const cityKey = G.tileKey(0, 0), provKey = G.tileKey(3, 0);
// Het budget net boven wat beide tegels samen aan ruwe rijen zijn: de store zit dan boven de helft (waar het strooipad op
// let, tilestore.js `prefetch`) maar onder het budget, zodat alleen de hysteresis en niet `_evict` een tegel wegdoet.
const rawSum = index2.tiles[cityKey].raw + index2.tiles[provKey].raw;
const source = new S.MemorySource({ 'index.json': new TextEncoder().encode(JSON.stringify(index2)), 'p.gdp': all2 }, { latency: 0 });
const T2 = await loadTileWorld('world/', { source, pool: false, now: () => source.now, budgetBytes: Math.round(rawSum * 1.2) });
const w2 = T2.world, store2 = T2.store;
ok(store2.entries.get(cityKey) && store2.entries.get(cityKey).pins === 1, 'loadTileWorld pint elke tegel uit index.pins.city');
ok(!store2.entries.has(provKey), 'een provincietegel wordt niet gepind en niet vooraf geladen');
const cityQ = () => w2.buildingsNear(120, 104, 50);
ok(w2.buildings.length === 8 && cityQ().length === 8, 'de stad staat in de arrays en in het raster', `${w2.buildings.length}/${cityQ().length}`);

await store2.request(provKey, { priority: 0 });
w2.tileQueue.run(1e9);
ok(w2.buildingsNear(3105, 105, 20).length === 1, 'de provincietegel komt gestreamd binnen');
// de speler blijft in de stad; de provincietegel is ongewenst en ver, en de store zit boven de helft van het budget
await source.advance(12000);
store2.prefetch(155, 155, { radius: 100 });
w2.tileQueue.run(1e9);
ok(!store2.ready(provKey) && !w2.resident.has('3,0'), 'een ongepinde tegel ver weg valt uit de store en uit de wereld');
ok(w2.buildingsNear(3105, 105, 20).length === 0, 'en zijn gebouw is uit het raster');
ok(store2.ready(cityKey) && w2.resident.has('0,0'), 'de gepinde stadstegel blijft resident');
ok(w2.buildings.length === 8 && cityQ().length === 8 && cityQ().every((b) => w2.buildings.indexOf(b) >= 0), 'de stad antwoordt nog met de rijen uit de arrays');
// en nu de speler 3 km verderop, buiten de stad: zonder pin valt de stad hier weg (in de echte wereld is de stad van
// 23,6 MB al groter dan de helft van het budget van 40 MB, dus dit gebeurt meteen bij het eerste strooien)
await source.advance(12000);
store2.prefetch(3100, 105, { radius: 100 });
w2.tileQueue.run(1e9);
ok(store2.ready(cityKey) && w2.resident.has('0,0'), 'de gepinde stad blijft ook als de speler ver weg staat');
ok(cityQ().length === 8 && cityQ().every((b) => w2.buildings.indexOf(b) >= 0), 'en de stad antwoordt daar nog met de rijen uit de arrays');

console.log(`tileworld_pinned ${n - fails}/${n} checks passed`);
process.exit(fails ? 1 : 0);
