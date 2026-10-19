// Startplek van een bijbaan aan de weg (#192), puur en Node-safe: eerst bij het streekhart,
// dan ruimer, en als daar nog geen weg geladen is (de streek ligt buiten de stadstegels)
// de dichtstbijzijnde weg in de stad, zodat een baan nooit zonder voertuig blijft staan.
export const STAD = { x: 213.81, y: 9.9 };
const ANKER_STRALEN = [400, 1500];

export function ankerMetWeg(map, p, drivable = true) {
  for (const r of ANKER_STRALEN) {
    const rp = map.nearestRoadPoint(p.x, p.y, r, drivable);
    if (rp) return { x: rp.x, y: rp.y };
  }
  const stad = map.nearestRoadPoint(STAD.x, STAD.y, 400, drivable);
  return stad ? { x: stad.x, y: stad.y } : p;
}
