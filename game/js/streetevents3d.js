// De props van een straatgebeurtenis in beeld (#1316): de geometrie komt uit het propregister (propmodels3d.js
// propGeometry, gedeeld en eenmaal gebouwd), het materiaal is één gedeeld vertexkleur-materiaal. Een pool van meshes per
// soort: een scène zet hooguit een paar props neer, dus na de eerste scène wordt er niets meer aangemaakt.
// Een gast tekent dezelfde props via de tijdelijke rekwisieten (coopextra3d.js REKW_BOUW).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { vcMaterial, markShared } from './pixelart3d.js';
import { propGeometry } from './propmodels3d.js';
import { activeStreetEvent } from './streeteventlive.js';

let material = null;
const pool = new Map();     // prop-id -> [mesh]
const inUse = [];           // de meshes die nu in de scène hangen
let shownFor = null;        // de scène waarvoor ze staan

const groundAt = (world, x, y) => { try { return world.map && world.map.groundHeightAt && world.map.elev && world.map.elev.has ? world.map.groundHeightAt(x, y) : 0; } catch (e) { return 0; } };

function take(id) {
  const list = pool.get(id);
  if (list && list.length) return list.pop();
  if (!material) material = markShared(vcMaterial({ roughness: 0.75 }));
  const m = new THREE.Mesh(propGeometry(id), material);
  m.castShadow = true;
  m.receiveShadow = true;
  m.userData.propId = id;
  return m;
}

function release(scene) {
  for (const m of inUse) {
    scene.remove(m);
    const id = m.userData.propId;
    if (!pool.has(id)) pool.set(id, []);
    pool.get(id).push(m);
  }
  inUse.length = 0;
  shownFor = null;
}

// Elk beeld: zet de props van de actieve scène neer (alleen bij een nieuwe scène wordt er iets verplaatst).
export function updateStreetEvents3D(world, scene) {
  if (!scene) return;
  const ev = activeStreetEvent();
  if (ev === shownFor) return;
  release(scene);
  if (!ev) return;
  for (const p of ev.props) {
    const m = take(p.id);
    m.position.set(p.x, groundAt(world, p.x, p.y), p.y);
    m.rotation.set(0, -p.angle, 0);
    scene.add(m);
    inUse.push(m);
  }
  shownFor = ev;
}
