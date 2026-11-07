// Buspopulatie (#497), uit vehicle.js gehaald: de streeklijnen op de grotere
// doorgaande wegen, de live-bussen (#395) en de dienstbussen (#160/#322). De
// spawn- en plaatsingshulpen van vehicle.js komen via setBusPopHost binnen,
// zodat deze module niets uit vehicle.js hoeft te importeren en de modulecyclus
// op 0 blijft (zelfde naad als vehicle/traffic.js en vehicle/boatwater.js).
import { linesNear, project as projectOnLine, makeRunner, startAt, busMagWeg } from '../busroutes.js';
import { closestPointOnSegment, normalizeAngle } from '../util.js';
import { MIDIBUS_MODEL } from '../trafficfleet.js';

let host = null;
export function setBusPopHost(h) { host = h; }

// A handful of regional buses on the bigger through-roads only - real bus
// frequency is much lower than car/bike density.
let busLines = [];
// de voorbereide lijnen (busroutes.js prepareLines); leeg = bussen rijden vrij zoals voorheen
export function setBusLines(lines) { busLines = lines || []; }
export function getBusLines() { return busLines; }
// Live bussen (#395, livebussen.js): positie(id) en kandidaten(x, y, min, max); null = alle bussen rijden eigen dienst
let liveBussen = null;
export function setLiveBussen(src) { liveBussen = src || null; }
export function getLiveBussen() { return liveBussen; }
const LIVE_HOEK_MAX = Math.PI / 2;

// Het dichtstbijzijnde punt op een weg waar de bus van deze lijn mag rijden (#322), of null.
// nearestRoadPoint pakt de dichtstbijzijnde weg, en dat is naast een lijn vaak een smal parallel straatje.
export function busSpawnPoint(map, line, x, y, reach = 25) {
  let best = null;
  for (const road of map.roadsNear(x, y, reach)) {
    if (road.pts.length < 2 || !busMagWeg(road, line)) continue;
    for (let i = 0; i < road.pts.length - 1; i++) {
      const cp = closestPointOnSegment(x, y, road.pts[i][0], road.pts[i][1], road.pts[i + 1][0], road.pts[i + 1][1]);
      if (cp.dist2 < reach * reach && (!best || cp.dist2 < best.dist2)) best = { x: cp.x, y: cp.y, road, dist2: cp.dist2 };
    }
  }
  return best;
}

// what the line spawner did (read by the QA scenes): tries, no road of the line near the spot, wrong way, blocked, spawned
export const busSpawnStats = { tries: 0, noRoad: 0, wrongWay: 0, blocked: 0, spawned: 0 };

export function manageBusPopulation(world, { target = 4, spawnMin = 90, spawnMax = 220, despawnDist = 300 } = {}) {
  const { map, player, vehicles } = world;
  // echte lijnen (busroutes.js, zodra de lijndata geladen is): een bus begint op zijn lijn en rijdt hem
  const near = busLines.length ? linesNear(busLines, player.x, player.y, spawnMax) : [];
  const line = near[0] || null;
  for (let i = vehicles.length - 1; i >= 0; i--) {
    const v = vehicles[i];
    if (!v.isBus || v.driver === 'player') continue;
    // buses spawned before the line data had loaded (or before the player came near a line) have no line:
    // out of sight they make room for the line's own buses (#160), else they fill the quota for ever
    if (line && !v.busRun && !v.wrecked && Math.hypot(v.x - player.x, v.y - player.y) > spawnMin * 0.7) { vehicles.splice(i, 1); continue; }
    if ((!v.wrecked && ((v.deadEndBounces || 0) > 2 || (v.stuckFor || 0) > 25 || ((v.waitFor || 0) > 45 && Math.hypot(v.x - player.x, v.y - player.y) > 70))) || host.focusAfstand(world, v, player) > despawnDist) vehicles.splice(i, 1);
  }

  let count = 0;
  for (const v of vehicles) if (v.isBus && !v.wrecked && v.driver !== 'player' && (!line || v.busRun)) count++;

  // live bussen (#395): een echte bus op een eigen lijn, binnen bereik van de speler en nog niet in de wereld, rijdt mee
  if (line && liveBussen) {
    for (const lb of liveBussen.kandidaten(player.x, player.y, spawnMin, spawnMax)) {
      if (count >= target + 2 || vehicles.some((q) => q.liveId === lb.id)) continue;
      const rp = busSpawnPoint(map, lb.line, lb.x, lb.y);
      if (!rp) continue;
      // De echte bus is de waarheid: staat er een bus van de eigen dienst op dezelfde plek, dan gaat die
      // weg in plaats van de live bus. Anders komt een live bus nooit in beeld als er net een dienstbus
      // staat — dat gebeurde in de test de helft van de tijd (#332).
      let spotBus = null;
      for (const q of vehicles) {
        if (!q.isBus || q.wrecked || q.driver === 'player' || q.liveId != null) continue;
        if (Math.hypot(q.x - lb.x, q.y - lb.y) < 24 && (!spotBus || Math.hypot(q.x - lb.x, q.y - lb.y) < Math.hypot(spotBus.x - lb.x, spotBus.y - lb.y))) spotBus = q;
      }
      if (spotBus) { vehicles.splice(vehicles.indexOf(spotBus), 1); count = Math.max(0, count - 1); }
      const v = host.spawnVehicleOnRoad(map, rp.road, false, Math.random, false, true, rp, false, null, lb.angle);
      if (Math.abs(normalizeAngle(v.angle - lb.angle)) > LIVE_HOEK_MAX || !host.spawnSpotFree(vehicles, v) || host.spawnWouldPop(world, v)) {
        if (spotBus) vehicles.push(spotBus); // past hij toch niet, dan blijft de dienstbus staan
        continue;
      }
      v.busRun = makeRunner(lb.line, projectOnLine(lb.line, v.x, v.y).s, lb.dir);
      v.liveId = lb.id;
      vehicles.push(v);
      count++;
    }
  }
  for (let tries = 0; line && count < target && tries < 4; tries++) {
    const line = near[Math.floor(Math.random() * near.length)];
    const pr = projectOnLine(line, player.x, player.y);
    const dir = Math.random() < 0.5 ? 1 : -1;
    const at = startAt(line, Math.max(0, Math.min(line.length, pr.s + dir * (spawnMin + Math.random() * (spawnMax - spawnMin) * 0.6))), dir);
    busSpawnStats.tries++;
    const rp = busSpawnPoint(map, line, at.x, at.y);
    if (!rp) { busSpawnStats.noRoad++; continue; }
    const v = host.spawnVehicleOnRoad(map, rp.road, false, Math.random, false, true, rp);
    if (Math.abs(normalizeAngle(v.angle - at.angle)) > Math.PI / 2) { busSpawnStats.wrongWay++; continue; }
    const d = Math.hypot(v.x - player.x, v.y - player.y);
    if (d < spawnMin || d > spawnMax || !host.spawnSpotFree(vehicles, v) || host.spawnWouldPop(world, v)) { busSpawnStats.blocked++; continue; }
    busSpawnStats.spawned++;
    v.busRun = makeRunner(line, projectOnLine(line, v.x, v.y).s, dir);
    vehicles.push(v);
    count++;
  }
  // with a real line in reach the buses are the line's, not random ones on the main roads (#80)
  if (line) return;

  const candidates = map.roadsNear(player.x, player.y, spawnMax).filter((r) => (r.cat === 'major' || r.cat === 'normal' || r.busOnly) && busMagWeg(r, null));   // #322: geen woonstraten, paden of smalle wegen
  let guard = 0;
  while (count < target && candidates.length && guard++ < target * 6) {
    const road = candidates[Math.floor(Math.random() * candidates.length)];
    // the 18 m gelede buses keep to the main roads and bus lanes; a midi bus
    // now and then there too, always on the quieter lines
    const midi = road.cat === 'normal' || Math.random() < 0.25;
    const v = host.spawnVehicleOnRoad(map, road, false, Math.random, false, true, null, false, midi ? { ...MIDIBUS_MODEL } : null);
    const d = Math.hypot(v.x - player.x, v.y - player.y);
    if (d < spawnMin || d > spawnMax || !host.spawnSpotFree(vehicles, v) || host.inPrivateGarage(map, v.x, v.y, 2) || host.spawnWouldPop(world, v)) continue;
    vehicles.push(v);
    count++;
  }
}

