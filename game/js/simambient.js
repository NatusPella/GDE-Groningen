// Voetgangers (en later auto's) op het worker-contract (issue #58, #18): zuivere
// keuzes voor wie als ambient agent naar de simworker mag. De aanroeper maakt
// de echte Pedestrian en stuurt de spawn/despawn-berichten; zonder Worker
// draait simhost.js dezelfde kernel op de hoofdthread (terugval).
import { projectOnRoad } from './simworld.js';
import { R_OUT } from './simhandover.js';

export const MAX_ROAD_DIST = 8; // m: verder van een voetpad = geen worker-agent

// Gewone wandelaars; alles met een rol (agent, scene, ragdoll, missie, baan) blijft echt.
export function isAmbientPed(p) {
  return !!p && p.state === 'wander' && !p.isCop && !p.scene && !p.ragdoll && !p.missionCrowd && !p.jobPed && !p.nightlife && !p.leader;
}

// Zoekt het dichtstbijzijnde pad in `roads` ([{ id, pts }] uit buildSimRoads(map, 'ped')).
export function nearestRoad(roads, x, y, maxDist = MAX_ROAD_DIST) {
  let best = null;
  for (const r of roads) {
    const h = projectOnRoad(r.pts, x, y);
    if (h && h.d <= maxDist && (!best || h.d < best.d)) best = { road: r.id, s: h.s, d: h.d };
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
