// De tekenlaag van de monumentaankleding (monumentdecor.js, #953): bouwt het plan één keer als de speler de zone nadert
// (kanonnen, lindebomen, lantaarns, figuranten via missiedecor.js) en ruimt het op als hij ver weg is. 's Avonds branden de
// lantaarns warm. Elke speler bouwt het zelf uit dezelfde data: niets over het net.
import { hoofdspeler } from './players.js';
import { dayState } from './daynight.js';
import { registreerAankleding, buildMissionDressing, updateMissionDressing, disposeMissionDressing } from './missiedecor.js';
import { monumentDecorPlan, monumentDecorItems, fitMonumentDecor } from './monumentdecor.js';
import { MONUMENT_ZONES, monumentLanternOn } from './monumentzone.js';
import { setMonumentLantern } from './monumentkits3d.js';

const BUILD_R = 60;   // m voorbij de rand van de zone waarop de aankleding verschijnt
const DROP_R = 180;   // m voorbij de rand waarop hij weer weggaat

const live = new Map(); // zone-id -> { set }

// Het plan wordt één keer bij missiedecor aangemeld (een bestaande naam blijft staan).
const kindOf = (id) => 'monument-' + id;
const registered = new Set();
function ensureRegistered(zone, map) {
  if (registered.has(zone.id)) return true;
  // wacht tot de tegels van de zone er zijn: de plekken worden op de kaart gelegd (water, gebouwen, wegen)
  try { if (!map || !map.roadsNear || !map.roadsNear(zone.at[0], zone.at[1], 40).length) return false; } catch (e) { return false; }
  const plan = monumentDecorPlan(zone.id, fitMonumentDecor(map, monumentDecorItems(zone.id)));
  if (!plan) return false;
  registreerAankleding(kindOf(zone.id), plan);
  registered.add(zone.id);
  return true;
}

export function updateMonumentDecor(dt, world, scene) {
  if (!world || !scene) return;
  let p = null;
  try { p = hoofdspeler(world); } catch (e) { p = null; }
  if (!p) return;
  let hour = 12;
  try { hour = dayState(world).hour; } catch (e) { /* middag */ }
  for (const zone of MONUMENT_ZONES) {
    if (!zone.decor) continue;
    const d = Math.hypot(p.x - zone.at[0], p.y - zone.at[1]);
    let e = live.get(zone.id);
    if (!e && d <= zone.radius + BUILD_R && ensureRegistered(zone, world.map)) {
      const set = buildMissionDressing(world, kindOf(zone.id), { x: zone.at[0], y: zone.at[1], a: 0 }, scene);
      if (set) live.set(zone.id, e = { set, on: null });
    }
    if (e && d > zone.radius + DROP_R) {
      disposeMissionDressing(e.set);
      live.delete(zone.id);
      continue;
    }
    if (e) {
      updateMissionDressing(e.set, dt, p);
      const on = monumentLanternOn(zone, hour);
      if (on !== e.on) { e.on = on; setMonumentLantern(on, zone.light && zone.light.lantern); }
    }
  }
}

export function disposeMonumentDecor() {
  for (const e of live.values()) disposeMissionDressing(e.set);
  live.clear();
}

export const monumentDecorLive = () => live.size;
