// De wijk (buurt) van een plek, één keuze voor de hele game: de locatiekaart linksonder, de kaart "Nieuwe buurt", de
// praatjes van Tammo en Rikus en de prestaties. Puur, zonder DOM en zonder THREE: scripts/districtat_test.mjs.
//
// Waarom (gebiedsnaam-21-11): al die plekken namen het dichtstbijzijnde wijkpunt van de stad (stad.json
// neighbourhoodPoints, 66 punten, allemaal in de stad Groningen) ZONDER te kijken of de speler nog in de stad was. Wie in
// Winsum, bij de Eemshaven of op de A7 stond, kreeg "Nieuwe buurt: Paddepoel-Noord" te horen. Nu geldt:
//   - met de echte grenzen (grenzen.json): alleen binnen de woonplaats van de stad; daarbuiten is er geen stadswijk;
//   - zonder grenzen: hooguit MAX_DISTRICT_DISTANCE meter van een wijkpunt, nooit verder;
//   - hoog in de lucht (duif, heli, vliegtuig) is er geen wijk: dan telt alleen de woonplaats.
// Een plek zonder wijk geeft null; de aanroeper valt dan terug op de woonplaats, het dorp of Ommeland, nooit op een stadswijk.
import { gebiedIn } from './grenzen.js';

export const CITY_LOCALITY = 'Groningen';
export const MAX_DISTRICT_DISTANCE = 700;   // zonder grenzen: verder dan dit van een wijkpunt is er geen wijk
const MAX_HOOGTE = 40;          // boven dit (m boven de grond) in de lucht noemen we geen wijk

const getal = (v) => Number.isFinite(v);

// De echte grenzen, zodra gebiedenbronnen.js ze geladen heeft (daar blijft het laden); tot dan geldt de afstandsgrens.
let sharedBounds = null;
export const applyDistrictBounds = (g) => { sharedBounds = g || null; };

// Het dichtstbijzijnde wijkpunt, of null. points: [{ name, x, y }]; opts: { grenzen, maxAfstand, hoogte }.
function dichtstbijzijnde(points, x, y) {
  let best = null, bd = Infinity;
  if (!Array.isArray(points)) return { punt: null, afstand: Infinity };
  for (const p of points) {
    if (!p || !getal(p.x) || !getal(p.y)) continue;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bd) { bd = d; best = p; }
  }
  return { punt: best, afstand: bd };
}

export function districtAt(points, x, y, opts = {}) {
  if (!getal(x) || !getal(y)) return null;
  const { grenzen = sharedBounds, maxAfstand = MAX_DISTRICT_DISTANCE, hoogte = 0 } = opts;
  if (getal(hoogte) && hoogte > MAX_HOOGTE) return null;
  const { punt, afstand } = dichtstbijzijnde(points, x, y);
  if (!punt) return null;
  if (grenzen && Array.isArray(grenzen.woonplaatsen) && grenzen.woonplaatsen.length) {
    const wp = gebiedIn(grenzen.woonplaatsen, x, y);
    return wp && wp.naam === CITY_LOCALITY ? punt : null;
  }
  return afstand <= maxAfstand ? punt : null;
}

// Een wijkwissel die je mag melden ("Nieuwe buurt", praatje): alleen bij een echte overgang tussen twee bepaalde wijken,
// pas na `dwell` seconden in de nieuwe wijk, en niet na een sprong (reizen, laden, teleport, film: meer dan `sprong` meter
// sinds de vorige meting). Na een sprong is de nieuwe wijk de nieuwe stand zonder melding. Pure toestandsmachine.
//   const v = createDistrictTracker(); const melding = v.tik(dt, naam, x, y);  // naam of null
// tik geeft de naam van de wijk als die nu gemeld moet worden, anders null.
export function createDistrictTracker({ dwell = 3, sprong = 400 } = {}) {
  const s = { stand: null, kandidaat: null, tijd: 0, x: NaN, y: NaN, begin: true };
  return {
    stand: () => s.stand,
    tik(dt, naam, x, y) {
      const jumped = getal(s.x) && getal(x) && getal(y) && Math.hypot(x - s.x, y - s.y) > sprong;
      s.x = x; s.y = y;
      if (s.begin) { s.begin = false; s.stand = naam || null; return null; }   // de eerste meting is de beginstand
      if (jumped) { s.stand = naam || null; s.kandidaat = null; s.tijd = 0; return null; }
      if (!naam) { s.kandidaat = null; s.tijd = 0; s.stand = null; return null; }   // buiten elke wijk: geen melding, wel de stand wissen
      if (naam === s.stand) { s.kandidaat = null; s.tijd = 0; return null; }
      if (s.kandidaat !== naam) { s.kandidaat = naam; s.tijd = 0; return null; }
      s.tijd += getal(dt) ? dt : 0;
      if (s.tijd < dwell) return null;
      s.stand = naam; s.kandidaat = null; s.tijd = 0;
      return naam;
    },
  };
}
