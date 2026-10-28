// Eén regel voor alle props die los op de grond staan (#502, playtest 27-10).
//
// Tot nu toe hield elke soort zijn eigen rand aan (countryside.js ROAD_CLEAR) en keek die
// alleen naar de polderwegen en dorpsstraten van de hash (countryedge.js roadGap). De echte
// wegen, het water, het spoor en de gebouwen van de tegels zaten daar niet in: een hooibaal
// van een erf naast een provinciale weg, een boom van een dorpsrand of een heg om een terp
// kwam zo op de verharding uit, en een baal stond tegen een gevel in de fietsstraat.
//
// Nu is er één regel voor elke prop: zijn voetafdruk (`rad`) plus PROP_MARGE blijft van de
// rand van de verharding, en `blocked` ziet daarbij ook de tegels (countryedge.js
// edgeBlocked -> provinceworld.js realBlockedAt: wegen, water, spoor, gebouwen).
// PROP_MARGE is de rand die de bestaande audits al eisen: treeclear.js houdt een boom
// 0,7 m van de rand (TREE_KERB) en de wereldcontrole liet op vijf centimeter afronding
// drie bomen op de rijbaan staan, dus 0,15 m speling (treeclear.js, tegel_afstand_audit).
//
// Beide lookups zijn inwisselbaar (`gap`, `blocked`), zodat een test de regel op een eigen
// kaart kan leggen zonder de hele wereld te bouwen.
import { roadGap, edgeBlocked } from './countryedge.js';

export const PROP_MARGE = 0.15; // m naast de rand van de verharding

// Mag een prop met voetafdruk `rad` op (x, y) staan?
//   gap(x, y, reach)      afstand tot de rand van de hash-weg (polderweg, dorpsstraat)
//   blocked(x, y, marge)  staat er iets van de tegels binnen `marge` (weg, water, spoor, pand)
export function propVrij(x, y, rad = 0, opts = {}) {
  const m = rad + PROP_MARGE;
  const gap = opts.gap || roadGap;
  if (!(gap(x, y, m + 0.5) >= m)) return false;
  const blocked = opts.blocked || edgeBlocked;
  return !blocked(x, y, m);
}
