// Koppeling tussen de echte voetgangers en de simulatieworker (issue #58).
// Gewone wandelaars ver van de speler (voorbij R_OUT, zie simhandover.js) worden
// "worker-gestuurd": hun Pedestrian blijft bestaan (mesh, pose, botsingen met
// events), maar de AI-stap in pedestrians.js wordt overgeslagen en x/y/hoek/
// snelheid komen uit het snapshot van de kern. Binnen R_IN, of zodra de ped een
// rol krijgt (vlucht, scene, dood...), neemt de hoofdthread hem terug op de
// plek uit het snapshot. Zonder Worker draait de kern op de hoofdthread
// (simhost.js); de bridge merkt het verschil niet.
import { createSimHost } from './simhost.js';
import { FLAGS } from './devflags.js';
import { buildSimRoads } from './simworld.js';
import { createRoadIndex, planGiveToWorker, planGiveCarsToWorker, isAmbientPed, isAmbientCar } from './simambient.js';
import { handoverPlan, workerId, R_IN, R_OUT } from './simhandover.js';

export const RECONCILE_EVERY = 0.5; // s tussen overdrachtsrondes
export const MAX_OWNED = 160; // hooguit zoveel worker-agenten tegelijk
const CAR_ID_BASE = 5e5; // auto-ids liggen in hun eigen blok boven de voetgangers
export const MAX_CARS = 120; // ...en zoveel auto's

// host mag een nephost zijn (tests); roads: [{ id, pts }] van buildSimRoads(map, 'ped').
// carRoads: [{ id, pts }] van buildSimRoads(map, 'car'), roadOf(id) geeft het echte wegobject, attach(v) zet een auto
// terug op het wegennet van de hoofdthread (vehicle.js attachToNearestRoad). Zonder carRoads blijven auto's echt.
export function createSimBridge({ host, roads, carRoads = [], roadOf = null, attach = null, seed = 1, rIn = R_IN, rOut = R_OUT } = {}) {
  const index = createRoadIndex(roads);
  const carIndex = carRoads.length && roadOf && attach ? createRoadIndex(carRoads) : null;
  const carLen = new Map();
  for (const r of carRoads) { let l = 0; for (let i = 2; i < r.pts.length; i += 2) l += Math.hypot(r.pts[i] - r.pts[i - 2], r.pts[i + 1] - r.pts[i - 1]); carLen.set(r.id, l); }
  const cars = new Map(); // worker-id -> auto
  const owned = new Map(); // worker-id -> ped
  let nextId = 1;
  let tick = 0;
  let accum = 0;
  let sinceReconcile = RECONCILE_EVERY; // meteen een eerste ronde
  host.init(carRoads.length ? roads.concat(carRoads) : roads, seed);

  function release(ped, pos) {
    if (pos) { ped.x = pos.x; ped.y = pos.y; }
    owned.delete(ped._wid);
    host.despawn([ped._wid]);
    ped._wid = 0;
    ped.waypoint = null;
    ped.waypointTimer = 0;
  }

  // Eén keer per frame vóór de ped-lus. Stuurt de stap en regelt af en toe de overdracht.
  function update(dt, player, peds, time = 0) {
    accum += dt;
    if (host.step(++tick, accum)) accum = 0; // een overgeslagen stap houdt zijn tijd
    sinceReconcile += dt;
    if (sinceReconcile < RECONCILE_EVERY) return;
    sinceReconcile = 0;
    const live = new Set(peds);
    const gone = [];
    for (const [id, p] of owned) if (!live.has(p)) gone.push(id);
    if (gone.length) { for (const id of gone) owned.delete(id); host.despawn(gone); }
    // dichtbij: terug naar de hoofdthread
    const view = host.positions();
    const mine = new Map();
    for (const id of owned.keys()) { const a = view.get(id); if (a) mine.set(id, a); }
    for (const a of handoverPlan(mine, [], player, { rIn, rOut }).takeOver) release(owned.get(a.id), a);
    // ver weg: naar de worker
    if (owned.size >= MAX_OWNED) return;
    const cands = [];
    let looked = 0;
    for (const p of peds) {
      if (p._wid || (p._noRoadUntil || 0) > time || !isAmbientPed(p)) continue;
      if (++looked > 80) break; // een ronde blijft goedkoop
      cands.push(p);
    }
    const plan = planGiveToWorker(cands, player, index, workerId(nextId), { rOut, max: 6 });
    const planned = new Set();
    for (const g of plan) { g.ped._wid = g.agent.id; owned.set(g.agent.id, g.ped); planned.add(g.ped); }
    for (const p of cands) if (!planned.has(p) && Math.hypot(p.x - player.x, p.y - player.y) > rOut) p._noRoadUntil = time + 20;
    if (plan.length) { nextId += plan.length; host.spawn(plan.map((g) => g.agent)); }
  }

  // Per ped in de lus: true = de worker stuurt hem, sla de AI over. Een ped die
  // zijn rol kwijt is (vlucht, scene, dood...) wordt hier teruggenomen.
  function drive(ped) {
    if (!ped._wid) return false;
    if (!isAmbientPed(ped)) { release(ped, host.positions().get(ped._wid)); return false; }
    const a = host.positions().get(ped._wid);
    if (!a) return true; // nog geen snapshot: blijf staan
    ped.x = a.x; ped.y = a.y; ped.angle = a.angle; ped.speed = a.speed;
    return true;
  }

  function releaseCar(v, a) {
    cars.delete(v._wid);
    host.despawn([v._wid]);
    v._wid = 0;
    if (a) { v.x = a.x - Math.sin(a.angle) * v._wlane; v.y = a.y + Math.cos(a.angle) * v._wlane; v.angle = a.angle; v.speed = a.speed; }
    attach(v);
  }

  // Eén keer per frame vóór de voertuiglus: overdracht van auto's (zelfde ritme en afstanden als de voetgangers).
  let sinceCars = RECONCILE_EVERY, carCursor = 0, nextCarId = 1;
  function updateCars(dt, player, vehicles) {
    if (!carIndex) return;
    sinceCars += dt;
    if (sinceCars < RECONCILE_EVERY) return;
    sinceCars = 0;
    const live = new Set(vehicles);
    const gone = [];
    for (const [id, v] of cars) if (!live.has(v)) gone.push(id);
    if (gone.length) { for (const id of gone) cars.delete(id); host.despawn(gone); }
    const view = host.positions();
    const mine = new Map();
    for (const [id, v] of cars) {
      const a = view.get(id);
      if (!a) continue;
      // aan het eind van de weg: de echte AI kiest de volgende weg
      if (a.s >= carLen.get(a.road) - 1.5) { releaseCar(v, a); continue; }
      mine.set(id, a);
    }
    for (const a of handoverPlan(mine, [], player, { rIn, rOut }).takeOver) releaseCar(cars.get(a.id), a);
    if (cars.size >= MAX_CARS) return;
    // een draaiende cursor, zodat elke ronde andere auto's bekijkt
    const cands = [];
    const n = vehicles.length;
    for (let k = 0; k < Math.min(n, 60); k++) {
      const v = vehicles[(carCursor + k) % n];
      if (!v._wid && isAmbientCar(v)) cands.push(v);
    }
    carCursor = n ? (carCursor + 60) % n : 0;
    const plan = planGiveCarsToWorker(cands, player, carIndex, roadOf, workerId(CAR_ID_BASE + nextCarId), { rOut, max: 6 });
    for (const g of plan) { g.car._wid = g.agent.id; g.car._wlane = g.lane; cars.set(g.agent.id, g.car); }
    if (plan.length) { nextCarId += plan.length; host.spawn(plan.map((g) => g.agent)); }
  }

  // Per auto in de lus: true = de worker stuurt hem, sla AI en gebouwbotsing over.
  function driveCar(v) {
    if (!v._wid) return false;
    const a = host.positions().get(v._wid);
    if (!isAmbientCar(v) || v.waitTimer > 0) { releaseCar(v, a); return false; }
    if (!a) return true;
    v.x = a.x - Math.sin(a.angle) * v._wlane; v.y = a.y + Math.cos(a.angle) * v._wlane; v.angle = a.angle; v.speed = a.speed;
    return true;
  }

  function dispose() {
    for (const v of cars.values()) v._wid = 0;
    cars.clear();
    for (const p of owned.values()) p._wid = 0;
    owned.clear();
    host.dispose();
  }

  return { update, drive, updateCars, driveCar, dispose, size: () => owned.size, carSize: () => cars.size, owned, cars, host };
}

let shared = null;
let sharedMap = null;
// De bridge van het spel; wordt opnieuw gebouwd als de kaart wisselt.
let carAttach = null;
// main.js geeft vehicle.js attachToNearestRoad mee; met ?simauto (devflags.js) gaan ook auto's naar de worker
export function setSimCarAttach(fn) { carAttach = fn; }
export function getSimBridge(map) {
  const cars = FLAGS.simauto && !!carAttach;
  if (shared && sharedMap === map) return shared;
  if (shared) shared.dispose();
  sharedMap = map;
  shared = createSimBridge({ host: createSimHost(), roads: buildSimRoads(map, 'ped'), carRoads: cars ? buildSimRoads(map, 'car') : [], roadOf: (id) => map.roads[id], attach: cars ? (v) => carAttach(v, map) : null });
  return shared;
}
