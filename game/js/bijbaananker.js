// Startplek van een bijbaan aan de weg (#192), puur en Node-safe: eerst bij het streekhart,
// dan ruimer, en als daar nog geen weg geladen is (de streek ligt buiten de stadstegels)
// de dichtstbijzijnde weg in de stad, zodat een baan nooit zonder voertuig blijft staan.
export const STAD = { x: 213.81, y: 9.9 };
const ANKER_STRALEN = [400, 1500];

export function ankerMetWeg(map, p, drivable = true, stralen = ANKER_STRALEN) {
  for (const r of stralen) {
    const rp = map.nearestRoadPoint(p.x, p.y, r, drivable);
    if (rp) return { x: rp.x, y: rp.y };
  }
  const stad = map.nearestRoadPoint(STAD.x, STAD.y, 400, drivable);
  // fallback: the caller (sidejobs.js) looks again once the region's tiles are in
  return stad ? { x: stad.x, y: stad.y, fallback: true } : p;
}

// De brugpost van de brugwachter (#341): de wegkant van een echte beweegbare brug, niet het streekhart. De
// brug is Midscheeps in Delfzijl (OSM bridge:movable=bascule, dek van (23136, -12170) naar (23094, -12212),
// 59 m); de post staat 10 m voor het dek aan de oostkant, aan de weg. Hetzelfde patroon als ankerMetWeg:
// staat er nog geen weg (de streek is nog niet geladen), dan blijft de baan in de stad en komt hij later thuis.
export const BRUG_DELFZIJL = { x: 23115, y: -12191, ux: -0.7071, uy: -0.7071, len: 59 };
export function brugpost(brug) {
  const af = brug.len / 2 + 10;
  return { x: brug.x - brug.ux * af, y: brug.y - brug.uy * af };
}
export function ankerBijBrug(map, brug = BRUG_DELFZIJL) {
  return ankerMetWeg(map, brugpost(brug), true, [35, 150, 400]);
}
