// Koppeling tussen de echte voetgangers en de simulatieworker (issue #58).
// Gewone wandelaars ver van de speler (voorbij R_OUT, zie simhandover.js) worden
// "worker-gestuurd": hun Pedestrian blijft bestaan (mesh, pose, botsingen met
// events), maar de AI-stap in pedestrians.js wordt overgeslagen en x/y/hoek/
// snelheid komen uit het snapshot van de kern. Binnen R_IN, of zodra de ped een
// rol krijgt (vlucht, scene, dood...), neemt de hoofdthread hem terug op de
// plek uit het snapshot. Zonder Worker draait de kern op de hoofdthread
// (simhost.js); de bridge merkt het verschil niet.
import { createSimHost } from './simhost.js';
import { buildSimRoads } from './simworld.js';
import { createRoadIndex, planGiveToWorker, isAmbientPed } from './simambient.js';
import { handoverPlan, workerId, R_IN, R_OUT } from './simhandover.js';

export const RECONCILE_EVERY = 0.5; // s tussen overdrachtsrondes
export const MAX_OWNED = 160; // hooguit zoveel worker-agenten tegelijk

// host mag een nephost zijn (tests); roads: [{ id, pts }] van buildSimRoads(map, 'ped').
export function createSimBridge({ host, roads, seed = 1, rIn = R_IN, rOut = R_OUT } = {}) {
  const index = createRoadIndex(roads);
  const owned = new Map(); // worker-id -> ped
  let nextId = 1;
  let tick = 0;
  let accum = 0;
  let sinceReconcile = RECONCILE_EVERY; // meteen een eerste ronde
  host.init(roads, seed);

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

  function dispose() {
    for (const p of owned.values()) p._wid = 0;
    owned.clear();
    host.dispose();
  }

  return { update, drive, dispose, size: () => owned.size, owned, host };
}

let shared = null;
let sharedMap = null;
// De bridge van het spel; wordt opnieuw gebouwd als de kaart wisselt.
export function getSimBridge(map) {
  if (shared && sharedMap === map) return shared;
  if (shared) shared.dispose();
  sharedMap = map;
  shared = createSimBridge({ host: createSimHost(), roads: buildSimRoads(map, 'ped') });
  return shared;
}
