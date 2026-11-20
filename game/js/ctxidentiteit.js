// Eigen identiteit per context (#1004, ADR 0040 "eigen identiteit per context"): een proefset van twee, golf en farming.
// Eén regel per context in deze tabel; het paneel krijgt alleen `data-ctx="<id>"` en de CSS in ds-components.css
// (blok "Context-identiteit") leest de band, de stempeltekst en het embleem. Alleen bestaande inkten (geen hex, geen eigen
// lettertype), tekst op de band minstens 4,5:1, stempel minstens 13 px; in Rustig drukwerk staat de stempel recht.
// Geen engine: een paneel dat het wil, zet het attribuut. Samen spelen: elke speler ziet het lokaal op zijn eigen paneel,
// er gaat niets over het net.

/** band: de inkt van de kopband; tekst: de inkt van de tekst op de band; embleem: de naam in icons.js (24 px); stempel: korte tekst. */
export const CONTEXTEN = {
  golf: { band: 'bord', tekst: 'wit', embleem: 'golf', stempel: 'GOLF' },
  farming: { band: 'geel', tekst: 'inkt', embleem: 'boerderij', stempel: 'BOERDERIJ' },
};

// welke minigame of bijbaan bij welke context hoort (de proefset: de golfspellen en de boerderij)
const VAN_SPEL = { discgolf: 'golf', pitchputt: 'golf', boerderij: 'farming', farming: 'farming' };

export const contextVan = (spelId) => VAN_SPEL[spelId] || null;

/** Zet of haalt het attribuut op een paneel. Een onbekende context haalt het weg (het paneel blijft neutraal). */
export function zetContext(el, ctx) {
  if (!el || !el.dataset) return el;
  if (CONTEXTEN[ctx]) el.dataset.ctx = ctx; else delete el.dataset.ctx;
  return el;
}
