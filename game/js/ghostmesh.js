// The see-through ghost car of a drift run (ghostreplay.js has the maths).
// One shared mesh: show it at a pose, hide it again. Angle is the vehicle's
// own heading (x forward in world space, like the vehicle meshes).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';

let mesh = null;

function build() {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0x9fe0ff, transparent: true, opacity: 0.3, depthWrite: false });
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.7, 1.8), mat);
  body.position.y = 0.6;
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 1.6), mat);
  cab.position.set(-0.2, 1.2, 0);
  g.add(body, cab);
  g.visible = false;
  return g;
}

// pose: { x, y, z, a } or null to hide
export function showGhostCar(pose) {
  const scene = getScene();
  if (!scene) return;
  if (!mesh) { mesh = build(); scene.add(mesh); }
  if (!pose) { mesh.visible = false; return; }
  mesh.visible = true;
  mesh.position.set(pose.x, pose.z || 0, pose.y);
  mesh.rotation.set(0, -pose.a, 0);
}
