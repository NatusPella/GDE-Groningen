// De snackwagens in de wereld (Snackimperium, epic #1095, #1102): je eigen snackwagen, die van je medewerkers en die van Us Mem Snacks staan geparkeerd op hun standplaats,
// met een verkoper achter het luik. Hoogstens MAX_WAGONS (vijf, de dichtstbijzijnde) binnen de streamstraal (SPAWN_R 260 m, weg bij DESPAWN_R 340 m, zie snackvanplan.js).
// Het wagenmodel is dat van de bestaande foodtruck (models3d_vehicles.js) in een eigen kleur met een eigen bord; de verkoper is de gedeelde persoonsfiguur
// (models3d_people.js). Wat wegvalt gaat via disposeObject (geheugen terug); het bord is een gedeeld materiaal per tekst. De planning is puur en loopt tweemaal per
// seconde, er beweegt niets per beeld. Geen Math.random.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene, disposeObject } from './scene3d.js';
import { hoofdspeler } from './players.js';
import { Vehicle } from './vehicle.js';
import { buildVehicleMesh } from './models3d_vehicles.js';
import { buildPersonMesh } from './models3d_people.js';
import { wagonSites, snackOpen } from './snacklive.js';
import { INK } from './mapstyle.js';
import { planWagons, diffWagons, PLAN_EVERY_S, MAX_WAGONS } from './snackvanplan.js';

const S = { actors: new Map(), t: 0, planT: -9 };
const SIGN_MATS = new Map();
const ground = (w, x, y) => (w.map && w.map.groundHeightAt ? w.map.groundHeightAt(x, y, 0) || 0 : 0);

// Het bord boven de wagen: crème met een gekleurde rand en de naam. Per tekst één materiaal, gedeeld door alle wagens met die tekst.
function signMaterial(text, color) {
  const k = `${text}|${color}`;
  let m = SIGN_MATS.get(k);
  if (m) return m;
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = INK.cream; g.fillRect(0, 0, 512, 128);
  g.fillStyle = color; g.fillRect(0, 0, 512, 12); g.fillRect(0, 116, 512, 12);
  g.font = 'bold 54px "Arial Black", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 66, 460);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  m = new THREE.MeshLambertMaterial({ map: tex });
  m.userData.shared = true;                      // disposeObject laat gedeelde materialen met rust
  SIGN_MATS.set(k, m);
  return m;
}
// Het bord van de foodtruck (de laatste mesh met een doos van 0,62 hoog) krijgt onze tekst in plaats van de oude tekst.
function reSign(group, text, color) {
  const mat = signMaterial(text, color);
  if (!mat) return;
  group.traverse((o) => {
    const p = o.isMesh && o.geometry && o.geometry.parameters;
    if (p && p.height === 0.62 && p.depth === 0.05 && o.material && !(o.material.userData && o.material.userData.shared)) { o.material.dispose(); o.material = mat; }
  });
}

function makeActor(p) {
  const v = new Vehicle(p.x, p.y, p.heading, { name: 'foodtruck', len: 5.4, wid: 2.1, maxSpeed: 34, accel: 6.5, brake: 14, turnRate: 2, color: p.color });
  const group = buildVehicleMesh(v);
  reSign(group, p.sign, p.color);
  const person = buildPersonMesh(p.seller.shirt, p.seller.skin, { seed: p.spot.length * 7 + p.spot.charCodeAt(0) });
  person.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  person.position.set(0.2, 0, 1.95);            // naast het luik, aan de stoeprand (+z), kijkend naar de wagen
  person.rotation.y = Math.PI;
  group.add(person);
  group.name = 'snackwagen';
  const sc = getScene();
  if (sc) sc.add(group);
  return { key: p.key, group, person, x: p.x, y: p.y, heading: p.heading };
}
function dropActor(a) {
  if (!a) return;
  if (a.group.parent) a.group.parent.remove(a.group);
  disposeObject(a.group);
}

function plan(w) {
  const pl = hoofdspeler(w);
  if (!pl) return;
  const cur = new Set(S.actors.keys());
  const p = planWagons(wagonSites(), { x: pl.x, y: pl.y }, cur, MAX_WAGONS);
  const d = diffWagons(cur, p);
  for (const key of d.remove) { dropActor(S.actors.get(key)); S.actors.delete(key); }
  for (const job of d.add) S.actors.set(job.key, makeActor(job));
  for (const a of S.actors.values()) {
    a.group.position.set(a.x, ground(w, a.x, a.y) + 0.02, a.y);
    a.group.rotation.y = -a.heading;
  }
}

// Elk beeld aangeroepen (main.js): de planning elke halve seconde.
export function updateSnackVans(w, dt) {
  if (!w || !w.map || !(dt > 0)) return;
  S.t += dt;
  if (S.t - S.planT < PLAN_EVERY_S) return;   // de poort (snackOpen rekent de verhaalstand uit) en de planning alleen op de planklok, niet elk beeld
  if (!snackOpen()) { if (S.actors.size) clearSnackVans(); S.planT = S.t; return; }
  S.planT = S.t; plan(w);
}
export function clearSnackVans() { for (const a of S.actors.values()) dropActor(a); S.actors.clear(); S.planT = -9; }
export const snackVanCount = () => S.actors.size;
