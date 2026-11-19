// QoL (#985): een dure aankoop vraagt een tweede druk, overal op dezelfde manier. De gewone winkel doet dat
// al vanaf €1.000 (shoplist.js needsConfirm); de boerderij gebruikt dezelfde grens. Pure regels, geen DOM.
import { euro } from './geldtekst.js';

export const TWEEDE_DRUK_VANAF = 1000;
export const TWEEDE_DRUK_MS = 8000;

// De vraag bij een aankoop, of '' als het zonder kan.
export function koopVraag(naam, prijs) {
  const p = Number(prijs) || 0;
  return p >= TWEEDE_DRUK_VANAF ? `${naam} kopen voor ${euro(p)}? Druk nog een keer om te kopen` : '';
}

// Eén stap van de tweede druk: zonder vraag meteen uitvoeren; anders de eerste druk "wapent" (met een
// houdbaarheid) en pas dezelfde druk binnen die tijd voert uit. `armed` is de vorige stand of null.
export function tweedeDruk(armed, sleutel, vraag, nu) {
  if (!vraag) return { uitvoeren: true, armed: null };
  if (armed && armed.sleutel === sleutel && nu < armed.tot) return { uitvoeren: true, armed: null };
  return { uitvoeren: false, armed: { sleutel, tot: nu + TWEEDE_DRUK_MS } };
}
