// The coast guard boat with its searchlight (M11, kwelder bij Noordpolderzijl): a small boat on the fairway and a
// pale beam that sweeps over the marsh. The rules (who is seen) are searchlightlogic.js; this is the picture.
// createSearchlight(light) -> { update(t), angle(), seen(x, y), dispose() }  or null without a scene
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { WATER_Y } from './util.js';
import { sweepAngle, inBeam, LIGHT_DEFAULTS } from './searchlightlogic.js';

export function createSearchlight(spec) {
  const scene = getScene();
  if (!scene) return null;
  const L = { ...LIGHT_DEFAULTS, ...spec };
  const group = new THREE.Group();
  group.name = 'searchlight';
  group.position.set(L.x, 0, L.y);
  scene.add(group);

  // the boat: navy hull with a white wheelhouse and an orange stripe, riding on the water
  const hullMat = new THREE.MeshLambertMaterial({ color: 0x1f3a5f });
  const whiteMat = new THREE.MeshLambertMaterial({ color: 0xe8e6e0 });
  const orangeMat = new THREE.MeshLambertMaterial({ color: 0xe0701c });
  const boat = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(11, 1.5, 3.4), hullMat);
  hull.position.y = WATER_Y + 0.55;
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(11.02, 0.3, 3.42), orangeMat);
  stripe.position.y = WATER_Y + 0.95;
  const house = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.7, 2.6), whiteMat);
  house.position.set(-1.2, WATER_Y + 2.0, 0);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6), whiteMat);
  mast.position.set(-1.2, WATER_Y + 4.1, 0);
  boat.add(hull, stripe, house, mast);
  group.add(boat);

  // the beam: a sector on the ground and a thin cone of light, both pivoting at the lamp
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.08, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const pivot = new THREE.Group();
  pivot.position.y = WATER_Y + 4.4;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(L.range, 28, -L.half, L.half * 2), beamMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.4 - (WATER_Y + 4.4);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(Math.tan(L.half) * L.range, L.range, 18, 1, true), coneMat);
  cone.rotation.z = Math.PI / 2;
  cone.position.x = L.range / 2;
  pivot.add(floor, cone);
  group.add(pivot);
  let ang = sweepAngle(L, 0);

  const apply = () => {
    pivot.rotation.y = -ang;
    boat.rotation.y = -(L.heading ?? Math.PI / 2);
  };
  apply();

  return {
    update(t) { ang = sweepAngle(L, t); apply(); },
    angle: () => ang,
    seen: (x, y) => inBeam(L, ang, x, y),
    dispose() {
      group.removeFromParent();
      group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    },
  };
}
