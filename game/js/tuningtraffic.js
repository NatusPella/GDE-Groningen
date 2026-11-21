// De koppeling van de gepimpte auto's in de wereld (tuningworld.js) aan het verkeer en de geparkeerde auto's
// (epic Autotuning, #1155): bepaalt het wijkprofiel, het uur en de weekdag, en zet v.look en de lak op een nieuwe auto.
// Zuinig: de dure vragen (urbanWeight, het profiel) komen pas als de goedkope kansrol al is gelukt.
import { MAX_SHARE, MAX_TUNED_TRAFFIC, MEET_LINES, tunedLookFor, unit, tunedShare, meetActive, meetNotice } from './tuningworld.js';
import { wijkProfileAt } from './trafficfleet.js';
import { urbanWeight } from './provinceworld.js';
import { weekdayOf } from './calendar.js';
import { hourOf } from './streetlifedata.js';

const COUNTRY_BELOW = 0.3; // minder bebouwing dan dit rond een punt: platteland (zoals parkedcars.js voor schuren)

// Wat er al is aan gepimpte rijdende auto's (verkeer, niet van de speler en niet geparkeerd) en hoeveel daarvan underglow hebben.
export function tunedCount(vehicles) {
  let tuned = 0, glow = 0;
  for (const v of vehicles) if (v.look && !v.parked && v.driver !== 'player' && !v.playerOwned && !v.isHeroCar) { tuned++; if (v.look.glow) glow++; }
  return { tuned, glow };
}

const weekdayNow = (world) => (world && world.calendar && Number.isFinite(world.calendar.day) ? weekdayOf(world.calendar.day) : 3);

// Een nieuwe verkeersauto v (met zijn soort uit trafficfleet.js) krijgt misschien een look. budget: tunedCount, wordt bijgewerkt.
export function tuneTrafficCar(world, v, kind, x, y, budget) {
  if (!v || v.look || unit('pimp', v.id) >= MAX_SHARE || (budget && budget.tuned >= MAX_TUNED_TRAFFIC)) return false;
  const country = urbanWeight(x, y) < COUNTRY_BELOW;
  const profile = wijkProfileAt(world.map, x, y).key;
  const t = tunedLookFor(v.id, profile, { country, hour: hourOf(world), weekday: weekdayNow(world), kind }, budget);
  if (!t) return false;
  v.look = t.look;
  v.model = { ...v.model, color: t.bodyColor };
  if (budget) { budget.tuned++; if (t.look.glow) budget.glow++; }
  return true;
}

// Een geparkeerd vak (parkedcars.js) deterministisch uit zijn plek. meet: staat dit vak op een actief autotreffen. Geeft
// { look, color } of null; de aanroeper zet het op de slot (model met eigen kleur) zodat het vak er elke keer hetzelfde uitziet.
export function tuneParkedBay(world, slot, kind = 'hatch', { meet = false } = {}) {
  const id = 'p' + Math.round(slot.x) + '_' + Math.round(slot.y);
  if (!meet && unit('pimp', id) >= MAX_SHARE) return null;
  const country = urbanWeight(slot.x, slot.y) < COUNTRY_BELOW;
  const profile = wijkProfileAt(world.map, slot.x, slot.y).key;
  const t = tunedLookFor(id, profile, { country, hour: 12, weekday: 3, kind, parked: true, meet }, null); // geparkeerde auto's zijn vast: een gemiddeld uur en een gewone dag, zodat het vak er altijd hetzelfde uitziet
  return t ? { look: t.look, color: t.bodyColor } : null;
}
export { tunedShare };

// Een treffen in de buurt (geparkeerde gepimpte auto's van een treffenplek, vrijdag- en zaterdagavond en zondagmiddag):
// één melding bij het naderen en af en toe een zin van een voorbijganger. sleeping: de slapende geparkeerde auto's (parkedcars.js).
const meetState = new WeakMap();
export function tickMeet(world, player, sleeping, now) {
  if (!player || !sleeping) return;
  let st = meetState.get(world);
  if (!st) { st = { next: 0, told: -1e9, said: -1e9 }; meetState.set(world, st); }
  if (now < st.next) return;
  st.next = now + 2;
  if (!meetActive(weekdayNow(world), hourOf(world))) return;
  let n = 0, nearest = Infinity;
  for (const v of sleeping) {
    if (!v.parkSlot || !v.parkSlot.meet) continue;
    const d = Math.hypot(v.x - player.x, v.y - player.y);
    if (d < 70) { n++; if (d < nearest) nearest = d; }
  }
  if (n < 3) return;
  const note = meetNotice(true, nearest);
  if (note && now - st.told > 600) { st.told = now; world.addMessage(`${note.title}: ${note.text}`, 5); }
  else if (nearest < 25 && now - st.said > 45 && now - st.told > 8) { st.said = now; world.addMessage('Een bezoeker: "' + MEET_LINES[Math.floor(unit('zin', Math.floor(now / 45)) * MEET_LINES.length)] + '"', 4); }
}
