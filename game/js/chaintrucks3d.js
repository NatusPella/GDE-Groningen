// De zichtbare vrachtwagens van een productieketen in de wereld (Bezit, epic #1095, #1103): een chauffeur rijdt grondstof van je percelen naar je verwerker en de verwerkte
// waar naar je winkel (docs/BEZIT-21-11.md 14.2). Hoogstens vier tegelijk (de dichtstbijzijnde) binnen 230 m van de speler (weg bij 330 m), alleen in diensttijd, niets voor een gast
// (zijn bezit is van hem). De planning (chaintrucks.js) is puur en loopt tweemaal per seconde; de ritten komen elke paar seconden uit de ketens (bezitlive.chainTruckInput).
// Het wagenmodel is de bestaande vrachtwagen (models3d_vehicles.js buildTruckMesh) met de gedeelde persoonsfiguur als chauffeur; per beeld glijdt alleen de pose.
// Wat wegvalt gaat via disposeObject (geheugen terug). reducedMotion: de wagen springt naar zijn plek in plaats van te glijden. Geen Math.random.
import { getScene, disposeObject } from './scene3d.js';
import { hoofdspeler } from './players.js';
import { getBoerderij } from './boerderijlive.js';
import { Vehicle } from './vehicle.js';
import { buildVehicleMesh, updateVehicleWheelSpin } from './models3d_vehicles.js';
import { buildPersonMesh } from './models3d_people.js';
import { vehicleSeat, placeSeatedLocal } from './seating3d.js';
import { reducedMotion } from './motion.js';
import { chainTruckInput } from './bezitlive.js';
import { workersVisible, workerLook, diffActors, slide } from './farmworkers.js';
import { chainTrips, planChainTrucks, PLAN_EVERY_S, MAX_TRUCKS } from './chaintrucks.js';

const S = { actors: new Map(), t: 0, planT: -9, tripsT: -99, trips: [], routes: new Map() };
const TRIPS_EVERY_S = 4;                                       // de ketens opnieuw lezen: zelden nodig, de dagtik verandert ze maar eens per speldag
const COLORS = [0xd9d3c4, 0xb8c2cc, 0xc9a45a];                  // wit, grijs, mosterd: vaste kleur per keten
const ground = (w, x, y) => (w.map && w.map.groundHeightAt ? w.map.groundHeightAt(x, y, 0) || 0 : 0);
const snapOf = (w) => (w.map && w.map.nearestRoadPoint ? (x, y) => w.map.nearestRoadPoint(x, y, 120, true) : null);
const timeOf = () => { const f = getBoerderij(); return f && Number.isFinite(f.uren) ? f.uren * 3600 : 0; };

function makeActor(job) {
  const color = COLORS[Math.abs(String(job.chainId).charCodeAt(0)) % COLORS.length];
  const v = new Vehicle(job.x, job.y, job.heading, { name: 'truck', len: 7.2, wid: 2.35, maxSpeed: 15, accel: 4, brake: 12, turnRate: 1.5, color });
  const group = buildVehicleMesh(v);
  const look = workerLook(job.key, 1);
  const person = buildPersonMesh(look.shirt, look.skin, look.opts);
  person.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  placeSeatedLocal(person, vehicleSeat(v, true));
  group.add(person);
  group.name = 'keten-vrachtwagen';
  const sc = getScene();
  if (sc) sc.add(group);
  return { id: job.actorId, group, person, cur: null, target: null };
}
function dropActor(a) {
  if (!a) return;
  if (a.group.parent) a.group.parent.remove(a.group);
  disposeObject(a.group);
}

function plan(w) {
  const pl = hoofdspeler(w);
  if (!pl) return;
  if (S.t - S.tripsT >= TRIPS_EVERY_S) { S.tripsT = S.t; S.trips = chainTrips(chainTruckInput()); }
  const jobs = S.trips.length ? planChainTrucks(S.trips, { x: pl.x, y: pl.y }, { timeS: timeOf(), snap: snapOf(w), current: new Set(S.actors.keys()), max: MAX_TRUCKS, routes: S.routes }) : [];
  const d = diffActors(new Set(S.actors.keys()), jobs);
  for (const id of d.remove) { dropActor(S.actors.get(id)); S.actors.delete(id); }
  for (const job of [...d.add, ...d.keep]) {
    let a = S.actors.get(job.actorId);
    if (!a) { a = makeActor(job); S.actors.set(job.actorId, a); }
    a.target = { x: job.x, y: job.y, heading: job.heading };
    if (!a.cur) a.cur = { ...a.target };
  }
}

// Elk beeld aangeroepen (main.js, naast updateSnackVans): de planning elke halve seconde, de beweging van de (hoogstens vier) wagens elk beeld.
export function updateChainTrucks(w, dt) {
  if (!w || !w.map || !(dt > 0)) return;
  if (!workersVisible(w)) { if (S.actors.size) clearChainTrucks(); return; }
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
export function clearChainTrucks() { for (const a of S.actors.values()) dropActor(a); S.actors.clear(); S.planT = -9; S.tripsT = -99; S.trips = []; S.routes.clear(); }
export const chainTruckCount = () => S.actors.size;
