// Voetgangers (en later auto's) op het worker-contract (issue #58, #18): zuivere
// keuzes voor wie als ambient agent naar de simworker mag. De aanroeper maakt
// de echte Pedestrian en stuurt de spawn/despawn-berichten; zonder Worker
// draait simhost.js dezelfde kernel op de hoofdthread (terugval).
import { projectOnRoad } from './simworld.js';
import { R_OUT } from './simhandover.js';

const MAX_ROAD_DIST = 8; // m: verder van een voetpad = geen worker-agent

// Gewone wandelaars; alles met een rol (agent, scene, ragdoll, missie, baan) blijft echt.
export function isAmbientPed(p) {
  return !!p && p.state === 'wander' && !p.isCop && !p.scene && !p.ragdoll && !p.missionCrowd && !p.jobPed && !p.nightlife && !p.leader;
}

// Rasterindex over [{ id, pts }]: zonder dit kost elke zoekactie alle wegen (duizenden).
// Elke weg staat in de cellen van zijn bbox, vergroot met MAX_ROAD_DIST.
export function createRoadIndex(roads, cell = 64) {
  const grid = new Map();
  for (const r of roads) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i + 1 < r.pts.length; i += 2) {
      if (r.pts[i] < x0) x0 = r.pts[i];
      if (r.pts[i] > x1) x1 = r.pts[i];
      if (r.pts[i + 1] < y0) y0 = r.pts[i + 1];
      if (r.pts[i + 1] > y1) y1 = r.pts[i + 1];
    }
    for (let cx = Math.floor((x0 - MAX_ROAD_DIST) / cell); cx <= Math.floor((x1 + MAX_ROAD_DIST) / cell); cx++) {
      for (let cy = Math.floor((y0 - MAX_ROAD_DIST) / cell); cy <= Math.floor((y1 + MAX_ROAD_DIST) / cell); cy++) {
        const k = cx * 100003 + cy;
        const l = grid.get(k);
        if (l) l.push(r); else grid.set(k, [r]);
      }
    }
  }
  return { roads, candidates: (x, y) => grid.get(Math.floor(x / cell) * 100003 + Math.floor(y / cell)) || [] };
}

// Zoekt het dichtstbijzijnde pad in `roads`: een array [{ id, pts }] uit
// buildSimRoads(map, 'ped'), of een createRoadIndex(...).
export function nearestRoad(roads, x, y, maxDist = MAX_ROAD_DIST) {
  let best = null;
  for (const r of roads.candidates ? roads.candidates(x, y) : roads) {
    const h = projectOnRoad(r.pts, x, y);
    if (h && h.d <= maxDist && (!best || h.d < best.d)) best = { road: r.id, s: h.s, d: h.d, ang: h.ang, cx: h.cx, cy: h.cy, len: h.len };
  }
  return best;
}

// Kandidaten om aan de worker te geven: ambient, voorbij R_OUT, met pad in de buurt.
// Geeft [{ ped, agent }] met agent = spawnbericht voor de kernel; hooguit `max`.
export function planGiveToWorker(peds, player, roads, nextId, { rOut = R_OUT, max = 6 } = {}) {
  const out = [];
  for (const p of peds) {
    if (out.length >= max) break;
    if (!isAmbientPed(p) || Math.hypot(p.x - player.x, p.y - player.y) <= rOut) continue;
    const h = nearestRoad(roads, p.x, p.y);
    if (!h) continue;
    out.push({ ped: p, agent: { id: nextId + out.length, road: h.road, s: h.s, speed: p.speed || 1.3, kind: 'ped' } });
  }
  return out;
}

// Gewone auto's op een gewone weg; politie, bussen, fietsen, missie- en verhaalauto's blijven echt.
export function isAmbientCar(v) {
  return !!v && !!v.road && !v.driver && !v.wrecked && !v.sinking && !v.parked && !v.isPolice && !v.isBoat && !v.isBike && !v.isScooter && !v.isBus && !v.busRun
    && !v.missionCar && !v.isHeroCar && !v.storyCar && !v.scripted && !v.isFoodtruck && !v.racer && !v.cineTemp && !v.perfTemp && !v.hijacked
    && !v.countryDrive && !v.sirenOn && !v.burning && !v.disabled && !v.z && !v.pendingImpact && !(v.waitTimer > 0);
}

// Auto's voorbij rOut op hun eigen weg (v.road === map.roads[id]) in hun rijrichting: [{ car, agent, lane }].
// lane = zijwaartse afstand tot de wegas (rechts van de rijrichting positief), zodat de auto in zijn baan blijft.
export function planGiveCarsToWorker(cars, player, roads, roadOf, nextId, { rOut = R_OUT, max = 6 } = {}) {
  const out = [];
  for (const v of cars) {
    if (out.length >= max) break;
    if (!isAmbientCar(v) || Math.hypot(v.x - player.x, v.y - player.y) <= rOut) continue;
    const h = nearestRoad(roads, v.x, v.y);
    if (!h || roadOf(h.road) !== v.road || h.len - h.s < 15) continue;
    const dir = Math.cos(v.angle - h.ang) >= 0 ? 1 : -1;
    if (dir < 0 && v.road.oneway) continue;
    const ta = dir > 0 ? h.ang : h.ang + Math.PI;
    const lane = (v.x - h.cx) * -Math.sin(ta) + (v.y - h.cy) * Math.cos(ta);
    out.push({ car: v, lane, agent: { id: nextId + out.length, road: h.road, s: dir > 0 ? h.s : h.len - h.s, speed: Math.min((v.road.speed || 8) * (v.cruiseScale || 1), v.model.maxSpeed * 0.95), dir, kind: 'car', stop: true } });
  }
  return out;
}
