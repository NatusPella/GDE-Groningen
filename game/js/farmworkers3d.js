// De zichtbare AI-werkers van Bezit in de wereld (epic #1095, #1101; ontwerp docs/BEZIT-21-11.md 5.2): een figuur in boerenkleding op een trekker met het werktuig van
// de taak rijdt de rijen van het perceel dat het personeel vandaag bewerkt, en de cellen van het veld kleuren mee (paintWorkerCell van boerderijwereld.js: dezelfde
// celstanden als het handwerk, geen tweede simulatie). Hoogstens vier tegelijk (de dichtstbijzijnde), binnen de streamstraal (SPAWN_R 230 m, weg bij DESPAWN_R 330 m),
// niets voor een gast. De planning (farmworkers.js) is puur en loopt twee keer per seconde; per beeld glijdt alleen de pose (maximaal vier figuren). Geometrie en
// materialen van voertuig en persoon komen uit de gedeelde caches van het spel; wat wegvalt gaat via disposeObject (geheugen terug). Geen Math.random.
import { getScene, disposeObject } from './scene3d.js';
import { hoofdspeler } from './players.js';
import { getBoerderij } from './boerderijlive.js';
import * as B from './boerderij.js';
import { Vehicle, MACHINE_MODELLEN } from './vehicle.js';
import { buildVehicleMesh, updateVehicleWheelSpin } from './models3d_vehicles.js';
import { buildPersonMesh } from './models3d_people.js';
import { vehicleSeat, placeSeatedLocal } from './seating3d.js';
import { bouwWerktuig, ruimWerktuig } from './werktuigen3d.js';
import { CELLEN } from './werktuigen.js';
import { RIJEN } from './werkgang.js';
import { reducedMotion } from './motion.js';
import { paintWorkerCell } from './boerderijwereld.js';
import { rowLayout } from './parcelfarm.js';
import { workersVisible, planWorkerActors, diffActors, cellsBetween, slide, workerLook, staffWorkOf, dayFraction, PLAN_EVERY_S, MAX_ACTORS } from './farmworkers.js';

const IMPLEMENT_OF = { ploegen: 'ploeg', zaaien: 'zaaimachine', oogsten: 'maaier' };
const S = { actors: new Map(), t: 0, planT: -9 };
const ground = (w, x, y) => (w.map && w.map.groundHeightAt ? w.map.groundHeightAt(x, y, 0) || 0 : 0);

function setImplement(a, taak) {
  if (a.taak === taak) return;
  a.taak = taak;
  if (a.implement) { ruimWerktuig(a.implement); a.implement = null; }
  const type = IMPLEMENT_OF[taak];
  if (!type) return;
  const imp = bouwWerktuig(type);
  imp.position.set(-(a.model.len / 2 + 1.4), 0, 0);
  imp.rotation.y = Math.PI / 2;                       // de voorkant van het werktuig (+z) naar de trekker (+x)
  a.group.add(imp);
  a.implement = imp;
}

function makeActor(w, job) {
  const model = { ...MACHINE_MODELLEN[job.skill >= 2 ? 'trekker-groot' : 'trekker-klein'] };
  const v = new Vehicle(job.x, job.y, job.heading, model);
  const group = buildVehicleMesh(v);
  const look = workerLook(job.workerId, job.skill || 1);
  const person = buildPersonMesh(look.shirt, look.skin, look.opts);
  person.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  placeSeatedLocal(person, vehicleSeat(v, true));
  group.add(person);
  group.name = 'bezit-werker';
  const a = { id: job.actorId, v, group, person, model, implement: null, taak: null, cur: null, target: null, last: null, parcelId: job.parcelId };
  setImplement(a, job.taak);
  const sc = getScene();
  if (sc) sc.add(group);
  return a;
}
function dropActor(a) {
  if (!a) return;
  if (a.implement) { ruimWerktuig(a.implement); a.implement = null; }
  if (a.group.parent) a.group.parent.remove(a.group);
  disposeObject(a.group);
}

// De cellen tussen de vorige en de nieuwe voortgang in de kleur van de taak (alleen als de taak en het perceel gelijk bleven).
function paintTrail(a, job) {
  const lay = rowLayout(job.ha);
  const from = a.last && a.last.taak === job.taak && a.last.parcelId === job.parcelId ? a.last.progress : job.progress;
  for (const c of cellsBetween(lay, from, job.progress, CELLEN)) paintWorkerCell(job.parcelId, job.taak, Math.min(RIJEN - 1, c.row), c.cell);
  a.last = { taak: job.taak, parcelId: job.parcelId, progress: job.progress };
}

function plan(w) {
  const farm = getBoerderij(), pl = hoofdspeler(w);
  if (!farm || !pl) return;
  const day = Math.floor(farm.uren / 24);
  const worked = staffWorkOf(day);
  const jobs = worked.length ? planWorkerActors(worked, { x: pl.x, y: pl.y }, { posOf: (id) => B.veldPositie(farm, id), dayFrac: dayFraction(farm.uren), current: new Set(S.actors.keys()), max: MAX_ACTORS }) : [];
  const d = diffActors(new Set(S.actors.keys()), jobs);
  for (const id of d.remove) { dropActor(S.actors.get(id)); S.actors.delete(id); }
  for (const job of [...d.add, ...d.keep]) {
    let a = S.actors.get(job.actorId);
    if (!a) { a = makeActor(w, job); S.actors.set(job.actorId, a); }
    setImplement(a, job.taak);
    a.target = { x: job.x, y: job.y, heading: job.heading };
    if (!a.cur) a.cur = { ...a.target };
    paintTrail(a, job);
  }
}

// Elk beeld aangeroepen (main.js): de planning elke halve seconde, de beweging van de (hoogstens vier) figuren elk beeld.
export function updateFarmWorkers(w, dt) {
  if (!w || !w.map || !(dt > 0)) return;
  if (!workersVisible(w)) { if (S.actors.size) clearFarmWorkers(); return; }
  S.t += dt;
  if (S.t - S.planT >= PLAN_EVERY_S) { S.planT = S.t; plan(w); }
  const reduced = reducedMotion();
  for (const a of S.actors.values()) {
    if (!a.target) continue;
    const prev = a.cur;
    a.cur = slide(a.cur, a.target, dt, reduced);
    a.group.position.set(a.cur.x, ground(w, a.cur.x, a.cur.y) + 0.02, a.cur.y);
    a.group.rotation.y = -a.cur.heading;
    if (!reduced && prev) updateVehicleWheelSpin(a.group, Math.hypot(a.cur.x - prev.x, a.cur.y - prev.y) / dt, dt);
  }
}
export function clearFarmWorkers() { for (const a of S.actors.values()) dropActor(a); S.actors.clear(); S.planT = -9; }
export const farmWorkerCount = () => S.actors.size;
