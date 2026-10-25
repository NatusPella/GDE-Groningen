// De ringrace (#443): de poorten en de startgrid van de solo-race en de wedstrijd
// tegen elkaar, als pure regels (scripts/ringrace_test.mjs). De baan zelf is
// RING_ROUTE uit ringroute.js; hier staan alleen de voortgang, de indeling en de
// beloning, zonder three.js en zonder wereld. De race op de baan (auto's, AI,
// camera) leeft in ringrace.js.
import { RING_ROUTE, RING_CHECKPOINTS } from './ringroute.js';

// De oude ringrace (H9, missies.js voor #187) reed de controlepunten na de
// startlijn in volgorde en finishte op de startlijn zelf: precies deze poorten.
export const POORTEN = RING_CHECKPOINTS.slice(1);
export const FINISH_INDEX = RING_CHECKPOINTS[0];
export const CP_TOTAAL = POORTEN.length + 1; // alle poorten, de finish op de startlijn meegeteld
export const POORT_REACH = 24;               // m: zo dicht bij de volgende poort telt hij als gehaald
export const START_TERUG = 8;                // m: de eerste startrij ligt zover achter de startlijn
export const RIJ_AFSTAND = 9;                // m tussen twee rijen op de grid
export const RIJ_BREEDTE = 3.0;              // m naast de hartlijn

// De poort die je nu moet halen: de eerste is het eerste controlepunt na de
// startlijn, de laatste is de finish op de startlijn.
export function poortIndex(cp) { return cp >= 0 && cp < POORTEN.length ? POORTEN[cp] : FINISH_INDEX; }
export function poortPunt(cp) { const p = RING_ROUTE[poortIndex(cp)]; return { x: p[0], y: p[1] }; }
export const klaar = (cp) => cp >= CP_TOTAAL;

export function poortGehaald(x, y, cp, reach = POORT_REACH) {
  if (cp < 0 || klaar(cp)) return false;
  const p = poortPunt(cp);
  return Math.hypot(p.x - x, p.y - y) <= reach;
}
// Een stap vooruit: alleen de volgende poort telt, dus een afsnijding of een
// respawn slaat nooit een poort over. Geeft de nieuwe cp (ongewijzigd als de
// poort nog niet gehaald is).
export function stapPoort(x, y, cp, reach = POORT_REACH) { return poortGehaald(x, y, cp, reach) ? cp + 1 : cp; }

// De meters op de baan voor de tussenstand: elke gehaalde poort telt duizend, en
// binnen een poort telt hoe dichter bij de volgende, hoe verder. Zo blijft de
// volgorde van de wedstrijdlaag (eerst cp, dan s) kloppen, ook tussen twee poorten.
export function meters(x, y, cp) {
  if (klaar(cp)) return CP_TOTAAL * 1000;
  const p = poortPunt(cp);
  const d = Math.hypot(p.x - x, p.y - y);
  return cp * 1000 + Math.max(0, 1000 - Math.min(999, Math.round(d)));
}

// De startgrid: rij k achter de startlijn, om en om links en rechts van de
// hartlijn. Iedereen staat even ver van de lijn, dus de start is eerlijk.
export function gridRij(k) {
  return { terug: START_TERUG + Math.floor(k / 2) * RIJ_AFSTAND, zij: (k % 2 ? 1 : -1) * RIJ_BREEDTE };
}

// De solo-race geeft een medaille naar plek, zoals de oude ringrace: winnen is
// goud. Wie niet op het podium komt krijgt geen medaille.
export const medailleVoorPlek = (plek) => (plek === 1 ? 3 : plek === 2 ? 2 : plek === 3 ? 1 : 0);
export const PRIJZEN_RING = [0, 250, 150, 80, 30]; // geld per plek, in het eigen geld van de speler
export const prijsVoorPlek = (plek) => PRIJZEN_RING[plek] | 0;
export const xpVoorPlek = (plek) => Math.max(4, 20 - (plek | 0) * 3); // loopbaanpunten, ook voor plek 4 en lager
