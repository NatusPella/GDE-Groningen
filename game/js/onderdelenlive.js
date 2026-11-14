// #837: onderdelen vinden en één unieke auto laten bouwen. De vondsten staan in de
// bestaande prestatieset (geen nieuwe opslagsleutel); de auto is een bestaand model uit
// de shopvoorraad met een eigen kleur en naam.
import { hoofdspeler } from './players.js';
import { recordUnique, hasUnique, isUnlocked } from './achievements.js';
import { Vehicle } from './vehicle.js';
import { VEHICLE_STOCK } from './shopdata.js';
import { ONDERDELEN_TOTAAL, ONDERDEEL_R, PRESTATIE_SET, ONDERDEEL_AUTO, onderdelen, onderdeelId, stand, autoNaam, heeftAlle } from './onderdelen.js';

let worldRef = null;
let gebouwd = false;

export function initOnderdelen(world) { worldRef = world; return true; }

const gezien = (id) => hasUnique(PRESTATIE_SET, id);
export function onderdelenAlbum() {
  return stand(gezien);
}

export function getOnderdeelSpotsForRender() {
  return onderdelen().filter((p) => !gezien(p.id)).map((p) => ({ ...p, kind: 'onderdeel' }));
}

export function tryOnderdeelInteract(world) {
  if (!world || world.coopRole === 'client') return false;
  const p = hoofdspeler(world);
  if (!p) return false;
  const id = onderdeelId(p.x, p.y, ONDERDEEL_R);
  if (!id || gezien(id)) return false;
  const part = onderdelen().find((q) => q.id === id);
  if (!recordUnique(world, PRESTATIE_SET, id)) return false;
  const now = stand(gezien);
  world.addMessage(`${part.naam} gevonden · ${now.gevonden}/${now.totaal} onderdelen`, 3.2, { kind: 'prestatie' });
  if (now.compleet) world.addMessage('Alle onderdelen! Ga naar de garage om je auto te laten bouwen.', 4, { kind: 'tip' });
  return true;
}

// De garage roept dit aan zodra de speler alle onderdelen heeft. Zonder garagehaak
// zet de auto een bestaand model (Knutselwagen op basis van de wervelwind) bij de speler.
export function bouwAuto(world) {
  if (!world || world.coopRole === 'client') return { ok: false, reden: 'Alleen in je eigen spel.' };
  if (!heeftAlle(gezien)) return { ok: false, reden: 'Je mist nog onderdelen.' };
  if (gebouwd) return { ok: false, reden: 'Je auto staat er al.' };
  const spec = VEHICLE_STOCK[ONDERDEEL_AUTO.basis] || VEHICLE_STOCK.mug;
  if (!spec) return { ok: false, reden: 'Dit model is niet beschikbaar.' };
  const p = hoofdspeler(world);
  const model = { ...spec.model, color: ONDERDEEL_AUTO.kleur, name: 'knutselwagen' };
  // Geen import van ownedvehicles (dat zou een importcyclus met garages geven): de auto
  // komt naast de speler op een open plek, of anders direct naast hem.
  const spot = (world.map && world.map.findOpenSpawn && world.map.findOpenSpawn(p.x, p.y, 40)) || { x: p.x + 3, y: p.y };
  const v = new Vehicle(spot.x, spot.y, p.angle || 0, model);
  v.name = autoNaam();
  v.playerOwned = true;
  v.missionCar = false;
  v.color = ONDERDEEL_AUTO.kleur;
  world.vehicles.push(v);
  gebouwd = true;
  world.addMessage(`Je ${autoNaam()} staat klaar. Een echte Eigen Maaksel!`, 4, { kind: 'prestatie' });
  return { ok: true, auto: v, record: v };
}

export const onderdelenGebouwd = () => gebouwd;
