// De vaste (gepinde) set van TileWorld.fromTiles bouwt dezelfde opzoekrasters als het gestreamde pad (addTile) (#314, C1/C2):
// het perceelraster (landUseAt) en het heggenraster (hedgeNear). Zonder deze rasters ziet een stad die tot de rand uit
// tegels bestaat (C2: geen overlaytegels meer) geen akkers, weides of heggen, en zou het platteland aan de rand zijn
// hekken, vee en heggen verliezen (r32: 179 percelen en 1.991 meubilair-rijen vielen weg).
//   node scripts/tileworld_pinned_test.mjs
import './node3d.mjs';
const G = await import('../game/js/gdt.js');
const { TileWorld } = await import('../game/js/tileworld.js');

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
// elke rij (de arrays zijn op gid gesorteerd en moeten dicht blijven), maar de tweeling gaat niet mee in het waterraster en
// niet in het water dat het terrein tekent (map.duplicateWater, scene3d.js): dezelfde antwoorden als het gestreamde pad.
{
  const globalW = { sections: [{ type: G.SECTION.META, json: { counts: { water: 2 }, meta: {} } }] };
  const waterTiles = [
    tile(0, 0, [{ type: G.SECTION.WATER, rows: [
      { gid: 0, pts: sq(0, 0, 40), kind: 'meer', lv: 0, nav: 0, name: 'Groot meer' },
      { gid: 1, pts: sq(0, 0, 36), kind: 'meer', lv: 0, nav: 0 },
    ] }]),
  ];
  const w = TileWorld.fromTiles(globalW, waterTiles);
  ok(w.water.length === 2, 'een tweeling blijft in de waterarray (de gids blijven dicht)', String(w.water.length));
  ok(w.duplicateWater && w.duplicateWater.size === 1 && w.duplicateWater.has(w.water[1]), 'de kleinste van de twee is de tweeling');
  ok(w.waterNear(20, 20, 1).length === 1, 'waterNear: de plas wordt één keer gevonden', String(w.waterNear(20, 20, 1).length));
  const dry = TileWorld.fromTiles({ sections: [{ type: G.SECTION.META, json: { counts: { water: 2 }, meta: {} } }] }, [
    tile(0, 0, [{ type: G.SECTION.WATER, rows: [
      { gid: 0, pts: sq(0, 0, 40), kind: 'meer', lv: 0, nav: 0 },
      { gid: 1, pts: sq(0, 0, 36), kind: 'meer', lv: 0, nav: 2 },
    ] }]),
  ]);
  ok(dry.water.length === 2 && !dry.duplicateWater && dry.waterNear(20, 20, 1).length === 2, 'een ander peil of een andere vaarklasse is geen tweeling');
}
console.log(`${n - fails}/${n} checks passed`);
process.exit(fails ? 1 : 0);
