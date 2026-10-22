// De pionnen van de afzetting op de A7 (#411, sidejob_tjalke.js): echte rekwisieten (breakables.js), dus een auto tikt ze om met een tik en ze
// buitelen weg. Alleen plastic: geen schade aan de auto (breakCost 0), geen mensen in de buurt. Zelfde patroon als de stuntavond (stuntavond.js):
// een mesh in een groep in de scène en een prop in het raster; sneuvelt de prop, dan verdwijnt de mesh en buitelt een kopie weg (makeMesh).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { makeProp, addProp, removeProp, onPropBreak } from './breakables.js';
import { getScene } from './scene3d.js';

let run = null;
let seq = 0;

const ORANJE = new THREE.MeshLambertMaterial({ color: 0xe8661c });
const WIT = new THREE.MeshLambertMaterial({ color: 0xf0ede4 });
const ZWART = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });

function pionMesh() {
  const g = new THREE.Group();
  const voet = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.42), ZWART);
  voet.position.y = 0.025;
  const kegel = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.62, 10), ORANJE);
  kegel.position.y = 0.36;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.125, 0.1, 10), WIT);
  band.position.y = 0.34;
  g.add(voet, kegel, band);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// spots: [{ x, y }]; ground(x, y) -> hoogte; onTik() bij elke omgetikte pion. Geeft het aantal geplaatste pionnen.
export function plaatsPionnen(world, spots, ground, onTik) {
  stopPionnen();
  const scene = getScene && getScene();
  const group = new THREE.Group();
  group.name = 'pionnen-a7';
  if (scene) scene.add(group);
  const id = ++seq;
  const props = [];
  spots.forEach((p, k) => {
    const z = ground ? ground(p.x, p.y) : 0;
    const mesh = pionMesh();
    mesh.position.set(p.x, z, p.y);
    group.add(mesh);
    const prop = makeProp('chair', p.x, p.y, {
      r: 0.2, h: 0.7, mass: 3, material: 'plastic', breakSpeed: 0.3, breakCost: 0,
      key: `pion${id}-${k}`,
      makeMesh: () => pionMesh(),
      disposeMesh: (m) => m.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }),
      onBreak: () => { mesh.visible = false; },
    });
    if (addProp(prop)) props.push(prop); else group.remove(mesh);
  });
  const stop = onPropBreak((prop) => { if (run && String(prop.key).startsWith(`pion${id}-`)) { run.omgetikt++; if (onTik) onTik(prop); } });
  run = { id, group, props, omgetikt: 0, stop };
  return props.length;
}

export const pionnenOmgetikt = () => (run ? run.omgetikt : 0);
export const pionnenActief = () => !!run;

export function stopPionnen() {
  if (!run) return;
  run.stop();
  for (const p of run.props) removeProp(p);
  run.group.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
  run.group.removeFromParent();
  run = null;
}
