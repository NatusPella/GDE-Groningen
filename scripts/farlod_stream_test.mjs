// De verre laag bij een tegel die erbij komt of weggaat (#921): een gestroomde tegel houdt zijn
// mesh. Vóór deze fix gooide farlod bij elke geoVer-bump alle tegels weg (ook de gestroomde) en
// bouwde de basisindex opnieuw op, zodat een stadsdeel zichtbaar opnieuw werd ingeladen en elk
// gestroomd gebouw, elke weg en elk groenvlak er twee keer in stond (basisindex uit de rasters én
// de tegel zelf). Deze test bouwt een nepmap met een raster zoals de tegelwereld dat vult:
//  - een gestroomde tegel verschijnt als mesh en blijft diezelfde mesh na een geoVer-bump;
//  - de basisindex tekent de rijen van de gestroomde tegel niet nog eens (geen dubbele driehoeken);
//  - een nieuw (vast) gebouw in het raster komt er na de bump wél bij;
//  - dropStreamTile haalt de tegel weg.
//   node scripts/farlod_stream_test.mjs   (eenmalig: cd desktop && npm run stage)
import './node3d.mjs';
globalThis.window.__perfOffDyn = new Set(['pool']);   // losse meshes in plaats van de multi-draw-pool
const THREE = await import('three');
const { createFarLOD } = await import('../game/js/farlod.js');
const { SpatialGrid } = await import('../game/js/spatialgrid.js');

let n = 0, bad = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };

const rect = (cx, cy, w, d) => [[cx - w / 2, cy - d / 2], [cx + w / 2, cy - d / 2], [cx + w / 2, cy + d / 2], [cx - w / 2, cy + d / 2]];
const building = (cx, cy, w, d, h, type = 'yes') => ({ pts: rect(cx, cy, w, d), bounds: [cx - w / 2, cy - d / 2, cx + w / 2, cy + d / 2], h, hm: h * 3.1, type });

const buildingGrid = new SpatialGrid(40);
const roadGrid = new SpatialGrid(40);
const greenGrid = new SpatialGrid(80);
const map = { buildingGrid, roadGrid, greenGrid, terrainOn: false, geoVer: 1 };
const scene = new THREE.Scene();
const lod = createFarLOD(scene, map, {
  flatGeometry: (g) => g,
  colors: { roads: {}, sidewalk: '#8a8a8a', green: '#4a6b3a' },
  sidewalkExtra: 1.2,
  roadColorOf: null,
});

// een gestroomde tegel met één gebouw, zoals de tegelwereld hem in het raster zet én aan de verre
// laag geeft (opTiles -> farLod.addStreamTile met dezelfde rijen)
const streamed = building(50, 50, 14, 10, 4);
buildingGrid.insert(streamed, streamed.bounds);
lod.addStreamTile('9,9', 0, 0, 320, { buildings: [streamed], roads: [], green: [], water: [] });

const meshes = () => lod.root.children.filter((m) => m.isMesh);
const triCount = () => meshes().reduce((s, m) => s + (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3, 0);
const settle = (px = 60, py = 60, frames = 60) => { for (let i = 0; i < frames; i++) lod.update(px + (i % 3) * 0.3, py, 2000, 2000, 60); };

settle();
const t1 = triCount();
ok(t1 > 0, 'de gestroomde tegel is gebouwd', String(t1));
const first = new Set(meshes());

// de buurt verandert: er komt een tegel bij (geoVer erft dat in de echte wereld)
map.geoVer++;
settle(61, 60);
const t2 = triCount();
const second = new Set(meshes());
ok(t2 === t1, 'na de geoVer-bump staan er geen dubbele driehoeken (basisindex slaat de tegelrijen over)', `${t1} -> ${t2}`);
let kept = 0;
for (const m of first) if (second.has(m)) kept++;
ok(kept === first.size, 'de gestroomde tegel houdt zijn eigen mesh (geen herlaad)', `${kept}/${first.size}`);

// een vast gebouw in het raster (de gepinde stad) komt er na de bump bij
const pinned = building(120, 40, 12, 9, 5);
buildingGrid.insert(pinned, pinned.bounds);
map.geoVer++;
settle(61, 60);
const t3 = triCount();
ok(t3 > t2, 'een vast gebouw uit het raster komt er na de bump bij', `${t2} -> ${t3}`);

// en de tegel gaat weg als de wereld hem laat vallen
lod.dropStreamTile('9,9');
settle(61, 60);
const t4 = triCount();
ok(t4 < t3, 'dropStreamTile haalt de gestroomde tegel weg', `${t3} -> ${t4}`);

console.log(bad ? `${bad} van ${n} mislukt` : `farlod_stream_test: ok (${n} controles, ${t1} driehoeken)`);
process.exit(bad ? 1 : 0);
