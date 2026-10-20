// Triangle and material count of the buildings round the Grote Markt and
// the Vismarkt (marktgebouwen.js), as the game builds them:
//   node scripts/markt_audit.mjs [--list]
// "draw calls" = distinct (cell, material) pairs, what staticbatch3d.js
// draws once the cells are merged. Needs the vendored three.js once:
// cd desktop && npm run stage
import './node3d.mjs';
import fs from 'node:fs';

const root = new URL('../game/', import.meta.url);
const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
const MB = await import('../game/js/models3d_buildings.js');
const MG = await import('../game/js/marktgebouwen.js').catch(() => null);
const { loadCityData } = await import('./lib/loadworld.mjs');
const data = await loadCityData();
const map = new GameMap(data);
MB.setBuildingMap(map);

const AREAS = { 'Grote Markt': [201.13, 92.66, 120], Vismarkt: [-16.52, 267.35, 100] };
const CELL = 48;
const list = process.argv.includes('--list');
for (const [name, [cx, cy, r]] of Object.entries(AREAS)) {
  let tris = 0, detailTris = 0, n = 0, meshes = 0;
  const calls = new Set(), mats = new Set();
  for (const b of map.buildings) {
    if (!b.bounds) continue;
    const bx = (b.bounds[0] + b.bounds[2]) / 2, by = (b.bounds[1] + b.bounds[3]) / 2;
    if (Math.hypot(bx - cx, by - cy) > r) continue;
    const g = MB.buildBuildingMesh(b);
    n++;
    let bt = 0;
    const cell = `${Math.floor(bx / CELL)},${Math.floor(by / CELL)}`;
    g.traverse((o) => {
      if (!o.isMesh || !o.geometry.attributes.position) return;
      meshes++;
      const t = (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
      bt += t;
      if (o === g.userData.facadeDetail) detailTris += t;
      const ms = Array.isArray(o.material) ? o.geometry.groups.map((gr) => o.material[gr.materialIndex]) : [o.material];
      for (const m of ms) { calls.add(cell + ':' + m.uuid); mats.add(m.uuid); }
    });
    tris += bt;
    if (list) console.log(Math.round(bx), Math.round(by), (MG && MG.marktKind(b)) || '-', b.markt || '', b.name || '', b.type, b.h, Math.round(bt));
  }
  console.log(`${name}: ${n} buildings, ${Math.round(tris)} triangles (${Math.round(detailTris)} facade detail), ${meshes} meshes, ${mats.size} materials, ~${calls.size} batched draw calls`);
}
