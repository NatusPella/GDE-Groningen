// Wanneer mag een vastzittend AI-voertuig uit de wereld (#1050, docs/VERKEER-AUDIT-21-11.md)?
// Een auto die lang tegen een obstakel staat, steeds op een doodlopend einde terugkaatst of eindeloos op een kruispunt wacht,
// vult het verkeersquotum voor niets. Hij verdwijnt dan, maar niet voor de ogen van de speler: een auto die in beeld
// opeens weg is, breekt de illusie. Pure regel, geen DOM, geen three.
//
//   stuckClearable(world, v, dist)   true als v weg mag; dist is de afstand tot de dichtstbijzijnde speler (focus)
//
// Regel: vastzitten telt pas na STUCK_S (rijdend vastgelopen), DEAD_ENDS keer op een doodlopend einde terugkaatsen, of WAIT_S
// wachten zonder rood licht en op minstens FAR_M van de speler (die laatste kent de oude regel al). Een auto die zichtbaar is
// (binnen het beeld en dichterbij dan HIDE_M, of binnen NEAR_M) blijft staan tot HARD_S: de AI heeft dan nog tijd om te
// achteruitrijden, uit te wijken of de wachtende te laten gaan.

export const STUCK_S = 25;
export const DEAD_ENDS = 2;
export const WAIT_S = 45;
export const FAR_M = 70;
export const NEAR_M = 40;
export const HARD_S = 90;       // zelfs in beeld ruimt een auto op na zo lang vast (en niet naast de speler)
export const HARD_WAIT_S = 150;

export function stuckClearable(world, v, dist) {
  if (v.wrecked) return false;
  const stuck = v.stuckFor || 0, wait = v.waitFor || 0, bounces = v.deadEndBounces || 0;
  const want = bounces > DEAD_ENDS || stuck > STUCK_S || (wait > WAIT_S && dist > FAR_M);
  if (!want) return false;
  if (dist <= NEAR_M) return stuck > HARD_S * 2 || wait > HARD_WAIT_S * 2;
  const view = world && world.pedView;
  const seen = !!view && world.time >= (world.pedFreeSpawnUntil || 0) && view.inView(v.x, v.y);
  if (!seen) return true;
  return stuck > HARD_S || wait > HARD_WAIT_S || bounces > DEAD_ENDS * 3;
}
