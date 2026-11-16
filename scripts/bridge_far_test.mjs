// #919: een brug in de verre laag ligt niet op de waterspiegel. De detailweg
// ligt op 0,03 m; de verre laag trok een vlakke brug op y = 0, precies waar het
// water ook ligt. Het water wordt daarna (transparant) getekend en dekt het dek
// af, waardoor de brug van een afstand doorzichtig lijkt. Deze test bouwt de
// verre laag zonder game/world en meet de hoogte van de verre brug.
//   node scripts/bridge_far_test.mjs
import './node3d.mjs';

// de tegel als losse mesh in plaats van als cel van de multi-draw-pool: dan is de geometrie te lezen
globalThis.window.__perfOffDyn = new Set(['pool']);
const THREE = await import('three');
const { createFarLOD } = await import('../game/js/farlod.js');
const { SpatialGrid } = await import('../game/js/spatialgrid.js');

let n = 0, bad = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };

// een enkele wegrij per geval; zonder gebouwen, zodat de road-mesh de enige is
function farRoad(row, label) {
  const roadGrid = new SpatialGrid(40);
  roadGrid.insert(row, [row.pts[0][0], row.pts[0][1], row.pts[row.pts.length - 1][0], row.pts[row.pts.length - 1][1]]);
  const map = { buildingGrid: new SpatialGrid(40), roadGrid, greenGrid: new SpatialGrid(80), terrainOn: false };
  const scene = new THREE.Scene();
  const lod = createFarLOD(scene, map, {
    flatGeometry: (g) => g,
    colors: { roads: { normal: '#555555' }, sidewalk: '#8a8a8a', green: '#4a6b3a' },
    sidewalkExtra: 1.2,
    roadColorOf: null,
  });
  for (let i = 0; i < 300 && (!lod.stats.tiles || lod.stats.queued || lod.stats.triangles === 0); i++) lod.update(50, 50, 2000, 2000, 60);
  let mesh = null;
  lod.root.traverse((o) => { if (!mesh && o.isMesh) mesh = o; });
  ok(!!mesh && mesh.geometry.attributes.position.count > 0, `${label}: de verre laag tekent de weg`);
  if (!mesh) return null;
  const pos = mesh.geometry.attributes.position;
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < pos.count; i++) { min = Math.min(min, pos.getY(i)); max = Math.max(max, pos.getY(i)); }
  return { min, max, label };
}

const deck = farRoad({ pts: [[10, 10], [90, 10]], width: 6, cat: 'normal', bridge: true, name: 'testbrug' }, 'brug');
ok(!!deck && deck.min >= 0.04, 'de verre brug ligt boven de waterspiegel (y >= 0,04)', deck && `y ${deck.min}..${deck.max}`);
ok(!!deck && deck.max <= 0.06, 'de verre brug blijft een vlak dek (geen toren)', deck && `y ${deck.min}..${deck.max}`);

const plain = farRoad({ pts: [[10, 10], [90, 10]], width: 6, cat: 'normal', bridge: false, name: 'testweg' }, 'gewone weg');
ok(!!plain && Math.abs(plain.max) < 1e-6, 'een gewone verre weg blijft op de grond (y = 0)', plain && `y ${plain.min}..${plain.max}`);

console.log(`bridge_far_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
