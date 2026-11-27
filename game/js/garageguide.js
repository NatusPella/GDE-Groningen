// Waar de pijl en de route heen wijzen bij 'rij een garage in' (#1342): naar de deur, aan de straatkant, en pas als je er bent naar
// het midden van de box. Het midden ligt achter de muur: vanaf de zijkant wees de pijl dwars door het gebouw en leek de garage
// alleen van opzij te bereiken. Puur (zonder three of DOM), voor scripts/garageguide_test.mjs.

export const DOOR_OUT = 3; // m vóór de deur, op de stoep
export const NEAR_DOOR = 12; // m van die plek: dichterbij wijst de pijl de box in

// site: { x, y, angle } van garages.js (angle wijst van het midden naar de deur/straat); bayD: de diepte van de box.
export function doorPoint(site, bayD, out = DOOR_OUT) {
  const d = bayD / 2 + out;
  return { x: site.x + Math.cos(site.angle) * d, y: site.y + Math.sin(site.angle) * d };
}

// target: { x, y, door } (missiontarget.js); from: de speler of zijn voertuig; S: de stapstaat (onthoudt dat je er al was, zodat de
// pijl niet heen en weer springt als je in de box stilstaat). Geeft het punt waar de markering staat.
export function garageGuide(target, from, S = {}) {
  if (!target || !target.door) return target;
  if (!S.garageNear && from && Math.hypot(from.x - target.door.x, from.y - target.door.y) < NEAR_DOOR) S.garageNear = true;
  return S.garageNear ? { ...target, x: target.x, y: target.y } : { ...target, x: target.door.x, y: target.door.y };
}
