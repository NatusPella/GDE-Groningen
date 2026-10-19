// De coach op de fiets naast de roeiacht (#28): zodra een acht in de buurt
// vaart, fietst een coach over de weg langs de kant mee en kijkt waar de boot
// heen gaat. De coach is een gewone fiets uit de verkeers-AI met een doel (aiOpts.goal)
// een eind vóór de boot; de weg is wat er langs het water ligt. Geen weg langs het
// water binnen COACH_REACH: geen coach.
import { spawnVehicleOnRoad } from './vehicle.js';

export const COACH_REACH = 22;    // m: een weg verder van de boot dan dit telt niet als oever
export const COACH_REACH_FAR = 45; // m: tweede poging, voor een oever met een fietspad iets verder weg
export const COACH_LEAD = 18;     // m vóór de boot
export const COACH_DROP = 60;     // m: verder dan dit achter, de coach is hem kwijt
export const COACH_NEAR = 160;    // m van de speler: alleen dan is er een coach

// Is dit een weg voor een coach? Een rustig weggetje, geen drukke weg.
export const coachRoadOk = (rp) => !!rp && !!rp.road && rp.road.cat !== 'major' && !(rp.road.width > 9);

// De weg langs de oever: eerst dichtbij, daarna ruimer. find(afstand) geeft een wegpunt of null.
export function coachRoadFor(find) {
  for (const r of [COACH_REACH, COACH_REACH_FAR]) {
    const rp = find(r);
    if (coachRoadOk(rp)) return rp;
  }
  return null;
}

// doel voor de coach: LEAD m vóór de boot in zijn vaarrichting
export function coachGoal(boat, lead = COACH_LEAD) {
  return { x: boat.x + Math.cos(boat.angle) * lead, y: boat.y + Math.sin(boat.angle) * lead };
}

// fietsgemiddelde bij het tempo van de boot (cruiseScale van de verkeers-AI is relatief aan de weg)
export function coachCruiseScale(boatSpeed, roadSpeed) {
  return Math.max(0.35, Math.min(1.3, (Math.abs(boatSpeed) * 1.05 + 1.2) / Math.max(2, roadSpeed || 6)));
}

// per tikje (zie main.js, bij manageBoatPopulation)
export function tickRowingCoaches(world) {
  const { map, player, vehicles } = world;
  for (let i = vehicles.length - 1; i >= 0; i--) {
    const c = vehicles[i];
    if (!c.coachOf) continue;
    const b = c.coachOf;
    const gone = !vehicles.includes(b) || b.wrecked || b.driver === 'player' || c.driver === 'player' || c.wrecked;
    if (gone || Math.hypot(c.x - b.x, c.y - b.y) > COACH_DROP || Math.hypot(c.x - player.x, c.y - player.y) > COACH_NEAR + 80) {
      if (c.driver !== 'player') vehicles.splice(i, 1);
      else c.coachOf = null;
      if (b) b.hasCoach = false;
      continue;
    }
    c.aiOpts = { goal: coachGoal(b) };
    c.cruiseScale = coachCruiseScale(b.speed, c.road && c.road.speed);
  }
  for (const b of vehicles) {
    if (!b.isBoat || !b.model || b.model.kind !== 'acht' || b.hasCoach || b.driver === 'player' || b.wrecked) continue;
    if (Math.hypot(b.x - player.x, b.y - player.y) > COACH_NEAR) continue;
    const rp = coachRoadFor((r) => map.nearestRoadPoint(b.x, b.y, r, true));
    if (!rp) continue;   // geen rustige weg langs het water: geen coach
    const c = spawnVehicleOnRoad(map, rp.road, false, Math.random, true, false, rp);
    c.coachOf = b;
    c.aiOpts = { goal: coachGoal(b) };
    vehicles.push(c);
    b.hasCoach = true;
  }
}
