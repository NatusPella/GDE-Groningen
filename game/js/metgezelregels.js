// Regels voor de metgezel (Tammo of Tessa naast de speler; companion.js), puur en zonder DOM of three: scripts/metgezel_test.mjs.
//
// Aanrijding (23-11, akte 1 op eindniveau): in de beelden van M03 stond 'Tessa is aangereden!' terwijl de speler niets deed. Het
// verkeer van de stad remt voor de speler maar niet voor de metgezel die een paar meter achter hem loopt; bij het oversteken, bij het
// neerzetten naast de speler (een missiestart, een warp) of als ze naar de auto loopt kon een passerende auto haar raken. Dat is geen
// keuze van de speler en het past niet bij "satire, geen leed" (constitutie 6). Nu telt een aanrijding alleen als een SPELER rijdt
// (de eigen auto, een meespeler): het stadsverkeer duwt haar opzij zoals een geparkeerde auto, en ze stapt zelf uit de weg.
//
// v: het voertuig; spelerRijdt: zit er een speler (van deze wereld of een meespeler) achter het stuur.
export const RAAK_SNELHEID = 4; // m/s: langzamer duwt alleen (zoals een fiets of een geparkeerde auto)
export function aanrijdingTelt(v, spelerRijdt) {
  if (!v || v.wrecked || v.isBike || v.isScooter) return false;
  if (Math.abs(v.speed || 0) < RAAK_SNELHEID) return false;
  return !!spelerRijdt;
}

// Wie zit er achter het stuur: de eigen speler ('player'), een meespeler (een slotnummer) of het voertuig waar de hoofdspeler in zit.
export const spelerAchterStuur = (v, hoofdVoertuig) => !!v && (v.driver === 'player' || typeof v.driver === 'number' || (hoofdVoertuig != null && v === hoofdVoertuig));
