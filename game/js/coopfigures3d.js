// Samen spelen (#95): de figuren van de andere spelers in de wereld. Elke figuur is een
// echt persoonsmodel (models3d_people.buildPersonMesh, dezelfde als de NPC's en de
// metgezel) met een eigen kleur en uiterlijk (coopplayers.figuurLook), een naamlabel
// in zijn kleur en de loopanimatie. Wat er wel of niet bestaat komt uit coopfigures.js
// (getest); dit bestand is alleen three.js en is niet in beeld bekeken.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { buildPersonMesh, animatePersonWalk } from './models3d_people.js';
import { figuurLook } from './coopplayers.js';
import { planFigures, needsRebuild, walkSpeed, labelSpec, LABEL_Y } from './coopfigures.js';

const meshes = new Map(); // plek -> { mesh, char, label, prev }

function makeLabel(spec) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.font = 'bold 34px "Arial Narrow", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(8,16,10,0.65)'; g.fillRect(8, 8, 240, 48);
  g.fillStyle = spec.kleur; g.fillText(spec.tekst, 128, 33);
  const tex = new THREE.CanvasTexture(c);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  spr.scale.set(1.8, 0.45, 1); spr.position.y = LABEL_Y; spr.renderOrder = 10;
  return spr;
}

function build(scene, fig) {
  const look = figuurLook(fig.char);
  const mesh = buildPersonMesh(look.shirt, look.skin, look.opts);
  mesh.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const label = makeLabel(labelSpec(fig));
  mesh.add(label);
  scene.add(mesh);
  return { mesh, char: fig.char, label, prev: null };
}
function dispose(scene, e) {
  scene.remove(e.mesh);
  e.mesh.traverse((o) => { if (o.geometry) o.geometry.dispose?.(); });
  if (e.label) { e.label.material.map.dispose(); e.label.material.dispose(); }
}

export const hasFigureMeshes = () => meshes.size > 0;

// Elke frame (main.js): maak, verplaats en ruim op volgens world.coopFigures.
export function syncFigures(world, dt) {
  const scene = getScene();
  if (!scene) return;
  const plan = planFigures([...meshes.keys()], world.coopFigures);
  for (const slot of plan.remove) { dispose(scene, meshes.get(slot)); meshes.delete(slot); }
  for (const f of plan.add) meshes.set(f.slot, build(scene, f));
  for (const f of [...plan.keep, ...plan.add]) {
    let e = meshes.get(f.slot);
    if (needsRebuild(e.char, f)) { dispose(scene, e); e = build(scene, f); meshes.set(f.slot, e); }
    const map = world.map;
    if (map && map.elev && map.elev.has && map.groundHeightAt) { try { f.gz = map.groundHeightAt(f.x, f.y); } catch (er) { /* hoogte onbekend: vlak */ } }
    e.mesh.visible = !f.coopVoertuig; // wie meerijdt zit in het voertuig (#372)
    e.mesh.position.set(f.x, (f.gz || 0) + (f.z || 0), f.y);
    e.mesh.rotation.y = -(f.angle || 0);
    animatePersonWalk(e.mesh, walkSpeed(e.prev, f, dt), dt);
    e.prev = { x: f.x, y: f.y };
  }
}

