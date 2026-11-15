// #917: een gebouw dat de detailring verbergt (een kit-kerk, -molen of -borg staat ervoor
// in de plaats) hoort ook uit de verre laag. Ander stak er tussen de detailring en de verre
// ring een gewone kistenprisma dwars door de kit, en dat gaf z-fighting op de gevel.
// Deze test bouwt een nepmap zoals de tegelwereld hem vult:
//  - een vast gebouw uit het raster staat in de verre laag;
//  - hideBuilding haalt het uit zijn tegel en de driehoeken verdwijnen (geen kist meer);
//  - een gestroomde tegel met twee gebouwen houdt de andere;
//  - een gebouw dat al verborgen is komt er bij de opbouw niet in;
//  - een onbekend gebouw geeft false.
//   node scripts/farlod_hide_test.mjs   (eenmalig: cd desktop && npm run stage)
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
const hidden = new WeakSet();
// een vast gebouw uit het raster (vóór de eerste basisindex, zoals de gepinde stad)
const pinned = building(50, 50, 14, 10, 4);
buildingGrid.insert(pinned, pinned.bounds);
const scene = new THREE.Scene();
const lod = createFarLOD(scene, map, {
  flatGeometry: (g) => g,
  colors: { roads: {}, sidewalk: '#8a8a8a', green: '#4a6b3a' },
  sidewalkExtra: 1.2,
  roadColorOf: null,
  hideBuilding: (b) => hidden.has(b),
});

const tris = () => lod.root.children.reduce((s, m) => s + (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3, 0);
const settle = (px = 60, py = 60, frames = 80) => { for (let i = 0; i < frames; i++) lod.update(px + (i % 3) * 0.3, py, 2000, 2000, 60); };

// 1. een vast gebouw uit het raster
settle();
const t1 = tris();
ok(t1 > 0, 'het vaste gebouw staat in de verre laag', String(t1));

// 2. verbergen: het gebouw gaat uit zijn tegel en de driehoeken verdwijnen
hidden.add(pinned);
ok(lod.hideBuilding(pinned) === true, 'hideBuilding haalt het gebouw uit de verre laag');
settle();
const t2 = tris();
ok(t2 === 0, 'er blijft geen kist onder de kit staan', `${t1} -> ${t2}`);
ok(lod.hideBuilding(pinned) === false, 'tweemaal verbergen is geen fout');

// 3. een gestroomde tegel met twee gebouwen: alleen het verborgene gaat weg
const a = building(420, 420, 10, 8, 5), b = building(450, 420, 12, 9, 6);
lod.addStreamTile('s1', 320, 320, 320, { buildings: [a, b], roads: [], green: [], water: [] });
settle(430, 430);
const t3 = tris();
ok(t3 > 0, 'de gestroomde tegel is gebouwd', String(t3));
hidden.add(a);
ok(lod.hideBuilding(a) === true, 'een gebouw van een gestroomde tegel gaat er ook uit');
settle(430, 430);
const t4 = tris();
ok(t4 > 0 && t4 < t3, 'de andere twee gebouwen blijven staan', `${t3} -> ${t4}`);

// 4. een gebouw dat al verborgen is bij de opbouw komt er niet in
const c = building(520, 500, 11, 9, 5);
hidden.add(c);
lod.addStreamTile('s2', 480, 480, 320, { buildings: [c], roads: [], green: [], water: [] });
settle(500, 500);
ok(tris() === t4, 'een al verborgen gebouw wordt niet getekend', `${t4} -> ${tris()}`);

// 5. onbekend gebouw
ok(lod.hideBuilding(building(900, 900, 5, 5, 3)) === false, 'een onbekend gebouw geeft false');

console.log(bad ? `${bad} van ${n} mislukt` : `farlod_hide_test: ok (${n} controles)`);
process.exit(bad ? 1 : 0);
