// De aanhanger met de pinautomaat achter het missievoertuig van 'Even pinnen' (#1342). Eén aanhanger tegelijk, alleen beeld: de
// kinematica staat in towkinematics.js, het model is dat van de intro (introkitchen3d.js buildAtmTrailer). Hij heeft geen botsvorm
// en hindert verkeer en ruimte niet; bij het eind van de missie verdwijnt hij met het voertuig mee (missions.js releaseMissionVehicle).
// Samen spelen: de aanhanger is beeld van het spel dat de missie draait (de host); een gast ziet hem nog niet, de missie zelf
// (stappen, beloning, voortgang) hangt er niet van af.
import { buildAtmTrailer } from './introkitchen3d.js';
import { getScene } from './scene3d.js';
import { startTow, stepTow } from './towkinematics.js';

let cur = null; // { vehicle, tow, mesh }

export function attachTow(vehicle) {
  removeTow();
  if (!vehicle) return null;
  const scene = getScene();
  let mesh = null; // zonder scène (een test in gewone node) loopt alleen de stand mee
  if (scene) {
    mesh = buildAtmTrailer();
    mesh.name = 'aanhanger-pinautomaat';
    scene.add(mesh);
  }
  cur = { vehicle, tow: startTow(vehicle), mesh };
  place(cur);
  return cur;
}

function place(t) {
  const v = t.vehicle;
  if (!t.mesh) return;
  t.mesh.position.set(t.tow.x, v.z || 0, t.tow.y);
  t.mesh.rotation.y = -t.tow.angle;
  t.mesh.visible = !v.hideInScene;
}

// Elk beeld van het spel: de aanhanger volgt zijn voertuig.
export function updateTow() {
  if (!cur) return;
  stepTow(cur.tow, cur.vehicle);
  place(cur);
}

export function removeTow() {
  if (!cur) return;
  const t = cur;
  cur = null;
  if (t.mesh) {
    t.mesh.removeFromParent();
    for (const o of (t.mesh.userData.own || [])) o.dispose();
  }
}

export const towState = () => (cur ? { x: cur.tow.x, y: cur.tow.y, angle: cur.tow.angle, vehicle: cur.vehicle } : null);
