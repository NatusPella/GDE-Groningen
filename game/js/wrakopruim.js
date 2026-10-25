// Opruimen van wrakken (#436): pure regel, zonder three.js of een wereld, zodat een test hem kan dekken.
// Een wrak blijft roken waar het stierf tot de speler ver genoeg weg is; pas als er te veel liggen gaat de
// verste weg. In Samen spelen telt de afstand tot de dichtstbijzijnde speler (coopfoci.js), niet alleen tot
// de gastheer: anders verdween een wrak waar een gast naast stond omdat de gastheer aan de andere kant van
// de stad liep. Wat van een speler is (zijn eigen auto, een missieauto, een auto in de garage) blijft staan.
import { minAfstand } from './coopfoci.js';

export const MAX_WRAKKEN = 12;

// Blijft dit wrak bewaard, hoe vol het ook staat? Wat van een speler is, blijft: zijn eigen auto,
// een missieauto, de Escapade en een auto die in de garage staat (repairVehicle kan hem opknappen).
function beschermd(v) {
  return v.driver === 'player' || !!v.missionCar || !!v.playerOwned || !!v.homeStored || !!v.isHeroCar;
}

// De wrakken die weg mogen: de verste eerst, net zoveel als er boven de grens liggen.
// foci: [{ x, y }] van alle spelers (de gastheer en elke losse groep); zonder foci telt niets als dichtbij.
export function kiesWrakkenVoorOpruimen(voertuigen, foci, max = MAX_WRAKKEN) {
  const kandidaten = [];
  for (const v of voertuigen || []) {
    if (!v || !v.wrecked || v.sinking || v.sunk || beschermd(v)) continue;
    const d = minAfstand(foci, v.x, v.y);
    // een wrak zonder bruikbare plek is nooit "dichtbij": die mag als eerste weg
    kandidaten.push({ v, d: Number.isFinite(d) ? d : Infinity });
  }
  const teVeel = kandidaten.length - Math.max(0, Math.floor(max));
  if (teVeel <= 0) return [];
  kandidaten.sort((a, b) => b.d - a.d);
  return kandidaten.slice(0, teVeel).map((k) => k.v);
}
