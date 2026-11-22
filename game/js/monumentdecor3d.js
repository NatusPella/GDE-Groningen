// De tekenlaag van de monumentaankleding (monumentdecor.js, #953): bouwt het plan één keer als de speler het gebied nadert
// (kanonnen, lindebomen, lantaarns, figuranten via missiedecor.js) en ruimt het op als hij ver weg is. 's Avonds branden de
// lantaarns warm. Elke speler bouwt het zelf uit dezelfde data: niets over het net.
import { hoofdspeler } from './players.js';
import { dayState } from './daynight.js';
import { registreerAankleding, buildMissionDressing, updateMissionDressing, disposeMissionDressing } from './missiedecor.js';
import { monumentDecorPlan, monumentDecorItems, fitMonumentDecor } from './monumentdecor.js';
import { HERITAGE_AREAS, monumentLanternOn } from './heritagearea.js';
import { setMonumentLantern } from './monumentkits3d.js';

const BUILD_R = 60;   // m voorbij de rand van het gebied waarop de aankleding verschijnt
const DROP_R = 180;   // m voorbij de rand waarop hij weer weggaat

const live = new Map(); // gebied-id -> { set }

// Het plan wordt één keer bij missiedecor aangemeld (een bestaande naam blijft staan).
const kindOf = (id) => 'monument-' + id;
const registered = new Set();
function ensureRegistered(area, map) {
  if (registered.has(area.id)) return true;
  // wacht tot de tegels van het gebied er zijn: de plekken worden op de kaart gelegd (water, gebouwen, wegen)
  try { if (!map || !map.roadsNear || !map.roadsNear(area.at[0], area.at[1], 40).length) return false; } catch (e) { return false; }
  const plan = monumentDecorPlan(area.id, fitMonumentDecor(map, monumentDecorItems(area.id)));
  if (!plan) return false;
  registreerAankleding(kindOf(area.id), plan);
  registered.add(area.id);
  return true;
}

export function updateMonumentDecor(dt, world, scene) {
  if (!world || !scene) return;
  let p = null;
  try { p = hoofdspeler(world); } catch (e) { p = null; }
  if (!p) return;
  let hour = 12;
  try { hour = dayState(world).hour; } catch (e) { /* middag */ }
  for (const area of HERITAGE_AREAS) {
    if (!area.decor) continue;
    const d = Math.hypot(p.x - area.at[0], p.y - area.at[1]);
    let e = live.get(area.id);
    if (!e && d <= area.radius + BUILD_R && ensureRegistered(area, world.map)) {
      const set = buildMissionDressing(world, kindOf(area.id), { x: area.at[0], y: area.at[1], a: 0 }, scene);
      if (set) live.set(area.id, e = { set, on: null });
    }
    if (e && d > area.radius + DROP_R) {
      disposeMissionDressing(e.set);
      live.delete(area.id);
      continue;
    }
    if (e) {
      updateMissionDressing(e.set, dt, p);
      const on = monumentLanternOn(area, hour);
      if (on !== e.on) { e.on = on; setMonumentLantern(on, area.light && area.light.lantern); }
    }
  }
}

export function disposeMonumentDecor() {
  for (const e of live.values()) disposeMissionDressing(e.set);
  live.clear();
}

export const monumentDecorLive = () => live.size;
