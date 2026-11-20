// De rustige HUD-melding bij de eerste live bus (#922): "Live bus: lijn 3 rijdt hier nu echt, richting ...". Eén keer per apparaat (dezelfde opslag als de
// uitleg van de light sims, alleen dit apparaat, geen savegame), en één keer per sessie een zin als de live gegevens wegvallen. De tekst en de regels staan in
// busbron.js (maakMelder, puur); dit bestand is alleen de bedrading met de wereld en gebeurt hooguit eens per twee seconden.
import { getLiveBussen } from './vehicle/buspop.js';
import { busBronNu } from './busmap.js';
import { maakMelder } from './busbron.js';
import { uitlegGezien, zetUitlegGezien } from './simhud.js';
import { hoofdspeler } from './players.js';

const NABIJ_M = 300;       // een live bus binnen dit bereik van de speler is "hier"
const TIK_S = 2;

let melder = null;
let volgende = 0;

export function tikBusMelding(world) {
  if (!world || !world.addMessage || world.time < volgende) return;
  volgende = world.time + TIK_S;
  if (!melder) melder = maakMelder({ gezien: uitlegGezien, zetGezien: zetUitlegGezien });
  try {
    const stand = busBronNu();
    let bus = null;
    const bron = getLiveBussen();
    const p = hoofdspeler(world);
    if (stand.soort === 'live' && bron && p) bus = (bron.kandidaten(p.x, p.y, 0, NABIJ_M, 1) || [])[0] || null;
    const tekst = melder.tik(stand, bus);
    if (tekst) world.addMessage(tekst, 6);
  } catch (e) { /* een melding is nooit de moeite van een fout waard */ }
}
