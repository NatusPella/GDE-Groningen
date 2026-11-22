// #836: één toets voor het routepunt. Staat er al een eigen routepunt, dan haalt 5 het weg;
// anders zet T het op je huidige eigen doel (een plek, klus of activiteit). Een verhaalmissie
// heeft al een route van de missieketen: die laten we met rust.
import { getGoal, getUserWaypoint } from './goal.js';
import { setUserWaypoint, clearUserWaypoint } from './routing.js';
import { isCinematicActive } from './cinematics.js';
import { playerBusy } from './busy.js';

export function tryQuickWaypoint(world) {
  const inp = world && world.input;
  if (!inp || !inp.wasPressed || !inp.wasPressed('5')) return false;
  if (isCinematicActive() || playerBusy(world, ['missionPhase', 'cinematic']).busy) {
    world.addMessage('Nu even geen routepunt.', 2);
    return false;
  }
  const g = getGoal();
  if (!g) {
    // zonder eigen doel liep hier de missietekst, ook als er geen missie was: zeg wat er echt aan de hand is
    world.addMessage('Je hebt nog geen eigen doel. Kies er een op de kaart (M).', 3);
    return false;
  }
  if (g.kind === 'mission') {
    world.addMessage('Een verhaalmissie heeft al een route; een eigen routepunt is nu niet nodig.', 2.6);
    return false;
  }
  if (getUserWaypoint()) {
    clearUserWaypoint();
    world.addMessage('Routepunt weg.', 2);
    return true;
  }
  setUserWaypoint(g.x, g.y, g.name);
  world.addMessage(`Waypoint: ${g.name}`, 2.4);
  return true;
}
