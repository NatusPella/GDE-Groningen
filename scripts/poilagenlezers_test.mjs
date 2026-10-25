// De lezers van de POI-lagen (#314, C1): horeca.js en garages.js halen hun plaatsen uit de tegels van hun laag
// (facilities.js poiLayerPlaces, index.pois.layers) en niet uit map.meta, geven dezelfde plekken, en initHoreca werkt op
// een kopie van de rijen (de rijen in de tegelstore blijven staan; de straatkant gaat terug in map.meta voor cityprops.js).
// Een wereld zonder tegelindex (WORLD_SRC=json) valt terug op map.meta. Synthetisch: geen game/world nodig.
//   node scripts/poilagenlezers_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
import { splitMeta } from '../game/js/poisections.js';
import { poiLayers } from './world/poilagen.mjs';
import * as G from '../game/js/gdt.js';

const tileKeyOf = (x, y) => { const [i, j] = G.tileIndexOf(x, y); return G.tileKey(i, j); };

// de plaatsen van de stad (de vorm van game/stad.json): twee cafés, een garage, een pomp en een buurtpunt
const places = {
  horeca: [{ name: 'Café Eén', x: 12.5, y: 8.25 }, { name: 'Café Twee', x: 1300.5, y: -20.5 }],
  garages: [{ name: 'Garage Knalpot Testwijk', x: 0, y: 8 }],
  fuel: [{ name: 'Pomp & Poets Testwijk', x: 100, y: 8 }],
  neighbourhoodPoints: [{ name: 'Testwijk', x: 0, y: 0, kind: 'wijk' }],
  bounds: [-3020, -4310, 4090, 3500],
};
const split = splitMeta(places, tileKeyOf);
const layers = poiLayers(split);
const decoded = new Map();
for (const [k, rows] of split.rows) { const [i, j] = G.tileFromKey(k); decoded.set(k, G.decodeBlob(G.encodeBlob({ i, j, sections: [{ type: G.SECTION.POIS, rows }] }))); }

// de wereld zoals tileworld.js hem maakt: de hele meta, de slanke meta (poiMeta), de tegelindex en de store
const tileWorld = (meta) => ({
  meta, poiMeta: split.meta, tileIndex: { pois: layers },
  store: { ready: () => true, tile: (k) => decoded.get(k) },
});

// de kaart voor de lezers: alleen wat ze van de map vragen (één straat, altijd dezelfde: een garage zoekt een vrije bay
// naast de weg waar hij niet zelf op staat)
const road = { cat: 'minor', width: 6, pts: [[-200, 0], [200, 0]], name: 'Teststraat' };
const fakeMap = (meta, layer = true) => ({
  ...tileWorld(meta),
  ...(layer ? {} : { tileIndex: undefined }),
  escapeBuilding: (x, y) => [x + 5, y + 5],
  canWalkOut: () => true,
  findOpenSpawn: () => null,
  roadsNear: () => [road],
  buildingsNear: () => [],
});

const { initHoreca, getHorecaForRender } = await import('../game/js/horeca.js');
const { initGarages, getGaragesForRender } = await import('../game/js/garages.js');
let uitDeLaag = 0;

// horeca: de rijen komen uit de tegels van de laag, ook als map.meta.horeca leeg is
{
  const map = fakeMap({ bounds: places.bounds });
  initHoreca({ map });
  assert.deepEqual(getHorecaForRender().map((s) => s.osmName), places.horeca.map((h) => h.name), 'horeca: niet de cafés van de laag');
  assert.deepEqual(getHorecaForRender().map((s) => [s.x, s.y]), places.horeca.map((h) => [h.x + 5, h.y + 5]), 'horeca: niet naar de straatkant geschoven');
}

// horeca: de rij in de tegelstore blijft staan (een kopie), en map.meta krijgt de straatkant voor cityprops.js
{
  const meta = { ...places, horeca: places.horeca.map((h) => ({ ...h })) };
  const map = fakeMap(meta);
  initHoreca({ map });
  const rows = [...decoded.values()].flatMap((t) => t.sections.filter((s) => s.type === G.SECTION.POIS).flatMap((s) => s.rows));
  const inTile = rows.filter((r) => r._l === 'horeca');
  assert.deepEqual(inTile.map((r) => [r.x, r.y]), places.horeca.map((h) => [h.x, h.y]), 'horeca: de rij in de tegel is verschoven (geen kopie)');
  assert.deepEqual(meta.horeca.map((h) => [h.x, h.y]), places.horeca.map((h) => [h.x + 5, h.y + 5]), 'horeca: map.meta.horeca heeft de straatkant niet');
  assert.deepEqual(getHorecaForRender().map((s) => [s.x, s.y]), meta.horeca.map((h) => [h.x, h.y]), 'horeca: speler en cityprops zien andere punten');
}

// horeca zonder tegelindex (WORLD_SRC=json): map.meta is de bron, en houdt de straatkant (de terrassen staan goed)
{
  const meta = { ...places, horeca: places.horeca.map((h) => ({ ...h })) };
  const map = fakeMap(meta, false);
  initHoreca({ map });
  assert.equal(getHorecaForRender().length, places.horeca.length, 'horeca zonder index: geen terugval op map.meta');
  assert.deepEqual(meta.horeca.map((h) => [h.x, h.y]), places.horeca.map((h) => [h.x + 5, h.y + 5]), 'horeca zonder index: map.meta niet bijgewerkt');
}

// garages: de garage en de pomp komen uit de laag, ook als map.meta.garages/fuel leeg zijn
{
  const map = fakeMap({ ...places, garages: [], fuel: [], neighbourhoodPoints: places.neighbourhoodPoints });
  initGarages({ map });
  const sites = getGaragesForRender();
  assert.ok(sites.some((s) => s.kind === 'garage' && s.name === 'Garage Knalpot Testwijk'), 'garages: de garage van de laag niet geplaatst: ' + sites.map((s) => s.name).join(', '));
  assert.ok(sites.some((s) => s.kind === 'pomp' && s.name === 'Pomp & Poets Testwijk'), 'garages: de pomp van de laag niet geplaatst: ' + sites.map((s) => s.name).join(', '));
  uitDeLaag = sites.length;
}

// garages zonder tegelindex: de lijsten van map.meta (twee garages, de laag heeft er een)
{
  const map = fakeMap({ ...places, garages: [{ x: 0, y: 8 }, { x: 100, y: 8 }], fuel: [] }, false);
  initGarages({ map });
  assert.equal(getGaragesForRender().length, 2, 'garages zonder index: geen terugval op map.meta.garages');
}

console.log(`poilagenlezers_test: ok (${places.horeca.length} cafés en ${uitDeLaag} garages en pompen uit de laag)`);
