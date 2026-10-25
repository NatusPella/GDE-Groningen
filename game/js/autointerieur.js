// Het stuur van een auto dat meedraait met de stuurinvoer (#442), van buiten gezien door de ruiten. De cabine
// (cabin3d.js) is één samengevoegde, gedeelde geometrie en heeft het stuur dus niet meer: dit is het stuur als
// eigen, kleine mesh (ring, spaken en naaf, één gedeelde geometrie per maat) dat draait met v.steer. Alleen voor
// auto's waarvan de cabine zichtbaar is en die binnen STUUR_R van de speler staan; verder weg staat het stuur recht
// in de cabine-geometrie niet getekend (dat is op die afstand niet te zien). De binnenin-camera (carinterior.js)
// draait zijn eigen stuur met dezelfde hoek.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder, markShared } from './pixelart3d.js';
import { vehicleSeat } from './seating3d.js';
import { interiorKlasse } from './carinteriorlayout.js';
import { cabinWheelPose } from './cabin3d.js';
import { carBodyFit } from './models3d_vehicles.js';

export const STUUR_R = 12;       // m: verder weg is het draaien van het stuur niet te zien
export const STUUR_HOEK = 2.2;   // rad stuurdraaiing bij volle stuurinvoer (zelfde als de binnenin-camera)
const DARK = 0x23262b, GREY = 0x3a3f46, TRIM = 0x6a707a;
const geoCache = new Map();
let material = null;

function stuurMateriaal() {
  if (!material) {
    material = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x20232a });
    material.userData.shared = true;
  }
  return material;
}

// Een stuurwiel in het vlak x-y (as langs z): ring, drie spaken en een naaf; gedeeld per straal
export function stuurwielGeometrie(r, ring = 0.022) {
  const key = r.toFixed(3) + '|' + ring.toFixed(3);
  let g = geoCache.get(key);
  if (!g) {
    const B = new GeoBuilder(1);
    B.geo(new THREE.TorusGeometry(r, ring, 5, 12), null, DARK);
    B.box(0, 0, 0, r * 2, 0.03, 0.03, GREY);
    B.box(0, -r / 2, 0, 0.03, r, 0.03, GREY);
    B.box(0, 0, 0, 0.06, 0.06, 0.05, TRIM);
    g = markShared(B.build());
    geoCache.set(key, g);
  }
  return g;
}

// pose: { x, y, z, r, tilt } voertuiglokaal, de as wijst naar voren (+x) en helt met tilt. Geeft de groep terug;
// group.userData.turn is het draaiende deel.
export function bouwStuurwiel(pose, materiaal = stuurMateriaal()) {
  const mount = new THREE.Group();
  mount.name = 'stuur';
  mount.position.set(pose.x, pose.y, pose.z);
  mount.rotation.z = pose.tilt || 0;
  const turn = new THREE.Mesh(stuurwielGeometrie(pose.r), materiaal);
  turn.rotation.y = Math.PI / 2;
  turn.userData.hoek = 0;
  mount.add(turn);
  mount.userData.turn = turn;
  return mount;
}

// Laat het stuur de invoer volgen (vloeiend); steer loopt van -1 tot 1
export function draaiStuurwiel(mount, steer, dt) {
  const turn = mount.userData.turn;
  const doel = -(steer || 0) * STUUR_HOEK;
  const stap = dt > 0 ? Math.min(1, dt * 12) : 1;
  turn.userData.hoek += (doel - turn.userData.hoek) * stap;
  turn.rotation.z = turn.userData.hoek;
}

// Eén keer per frame, na syncCabins: het stuur van auto's dichtbij. meshes: scene3d vehicleMeshes (id -> mesh).
export function syncAutoStuur(world, meshes, px, py, dt) {
  for (const v of world.vehicles) {
    const mesh = meshes.get(v.id);
    const cab = mesh && mesh.userData.cabin;
    if (!cab) continue;
    let w = cab.userData.stuur;
    if (!cab.visible || Math.abs(v.x - px) > STUUR_R || Math.abs(v.y - py) > STUUR_R) {
      if (w) w.visible = false;
      continue;
    }
    if (!w) {
      const seat = vehicleSeat(v, true);
      w = bouwStuurwiel(cabinWheelPose(seat, v.model.len, v.model.wid, interiorKlasse(v), carBodyFit(v)));
      w.userData.turn.userData.hoek = -(v.steer || 0) * STUUR_HOEK;
      cab.add(w);
      cab.userData.stuur = w;
    }
    w.visible = true;
    draaiStuurwiel(w, v.steer, dt);
  }
}
