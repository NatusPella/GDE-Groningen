// Driehoeken en meshes van elke duivenvariant van het spel (docs/DUIF-MODELLEN-22-11.md): de spelersduif, de meeuw, de skelet-duif van
// wildlife.js (middel en hoog), een zwermvogel en het verste niveau.
//   node scripts/pigeon_inventory.mjs
import './node3d.mjs';
const THREE = await import('three');
const tris = (o) => { let t = 0, m = 0; o.traverse((c) => { if (c.isMesh) { m++; const g = c.geometry; t += (g.index ? g.index.count : g.attributes.position.count) / 3; } }); return { t: Math.round(t), m }; };
const pm = await import('../game/js/pigeonmode.js');
const w = await import('../game/js/wildlife.js');
const b = await import('../game/js/birds.js');
const M = await import('../game/js/pigeonmodel.js');
const rows = [
  ['spelersduif / cutscene (pigeonmode, hi)', tris(pm.buildPigeonBird('pigeon'))], ['meeuw van de duivenmodus (hi)', tris(pm.buildPigeonBird('gull'))],
  ['wildlife-duif (mid)', tris(w.buildPigeonMesh3D(0))], ['wildlife-duif in een filmpje (hi)', tris(w.buildPigeonMesh3D(0, 'hi'))],
  ['wildlife-meeuw (mid)', tris(w.buildSeagullMesh3D())], ['wildlife-meeuw in een filmpje (hi)', tris(w.buildSeagullMesh3D('hi'))],
];
const g = new THREE.Group(); const f = b.makeBirds(g, 0, 0, 2, 1);
rows.push(['zwermvogel (romp + 2 vleugels, mid)', { t: M.geoTris(f.body.geometry) + 2 * M.geoTris(f.wings.geometry), m: 2 }]);
rows.push(['wereldleven-dier (far, een geometrie)', { t: M.geoTris(M.pigeonMerged('far', {}, { wings: 'folded' })), m: 1 }]);
for (const r of rows) console.log(r[0].padEnd(46), String(r[1].t).padStart(6), 'tri', String(r[1].m).padStart(3), 'meshes');
