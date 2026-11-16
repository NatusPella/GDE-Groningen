// #921: een tegel in de verre laag valt tijdens een herbouw (na een tegel-add of
// -drop, map.geoVer) geen frame weg. Eerst werd elke basis-tegel meteen
// weggegooid en daarna in brokjes opnieuw gebouwd: een stadsdeel verdween even
// en kwam terug ("eerst ingeladen en daarna opnieuw ingeladen"). Nu blijft de
// oude mesh staan tot de nieuwe klaar is en wisselt finishJob ze in één frame om.
//   node scripts/farlod_rebuild_test.mjs
import './node3d.mjs';

// losse meshes in plaats van pool-cellen: dan is de scene te tellen
globalThis.window.__perfOffDyn = new Set(['pool']);
const THREE = await import('three');
const { createFarLOD } = await import('../game/js/farlod.js');
const { SpatialGrid } = await import('../game/js/spatialgrid.js');

let n = 0, bad = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };

// een dichte tegel: genoeg gebouwen om de herbouw over meerdere frames te spreiden
const buildingGrid = new SpatialGrid(40);
const rect = (cx, cy, w, d) => [[cx - w / 2, cy - d / 2], [cx + w / 2, cy - d / 2], [cx + w / 2, cy + d / 2], [cx - w / 2, cy + d / 2]];
for (let i = 0; i < 28; i++) for (let j = 0; j < 28; j++) {
  const cx = 8 + i * 8, cy = 8 + j * 8;
  const b = { pts: rect(cx, cy, 6, 6), bounds: [cx - 3, cy - 3, cx + 3, cy + 3], h: 2, hm: 6, type: 'house' };
  buildingGrid.insert(b, b.bounds);
}
const map = { buildingGrid, roadGrid: new SpatialGrid(40), greenGrid: new SpatialGrid(80), terrainOn: false, geoVer: 1 };
const scene = new THREE.Scene();
const lod = createFarLOD(scene, map, {
  flatGeometry: (g) => g,
  colors: { roads: {}, sidewalk: '#8a8a8a', green: '#4a6b3a' },
  sidewalkExtra: 1.2,
  roadColorOf: null,
});

const meshes = () => lod.root.children.filter((o) => o.isMesh);
for (let i = 0; i < 400 && !meshes().length; i++) lod.update(120, 120, 3000, 2000, 160);
const first = meshes()[0];
ok(!!first, 'de verre tegel is gebouwd');

// een tegel komt erbij: de kaartstand verandert
map.geoVer = 2;
let zero = 0, replaced = false;
for (let i = 0; i < 500; i++) {
  lod.update(120, 120, 3000, 2000, 160);
  const now = meshes();
  if (!now.length) zero++;
  if (now.length && now[0] !== first) { replaced = true; break; }
}
ok(zero === 0, 'de tegel valt tijdens de herbouw geen enkel frame weg', `${zero} lege frames`);
ok(replaced, 'de tegel wordt na de kaartstand opnieuw gebouwd');
ok(!lod.root.children.includes(first), 'de oude mesh is opgeruimd');

console.log(`farlod_rebuild_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
