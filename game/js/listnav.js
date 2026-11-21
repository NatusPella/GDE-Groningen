// Het navigatiepatroon van een popup of menulijst (DS3, 21-11): welke knop krijgt de focus na een toets. Puur: getallen in, een getal uit, zodat een
// test het zonder DOM nakijkt. Toetsenbord en controller sturen dezelfde toetsen (gamepad.js: D-pad en stick zijn pijltjes, A is Enter, B is Esc),
// dus dit is het ene pad voor beide. mapview.js (kaartpopups) gebruikt het; docs/KAART-POPUPS-21-11.md beschrijft het patroon.

/**
 * Nieuwe plek in een lijst van n knoppen, vanaf i (-1 = geen focus in de lijst).
 * Omlaag, rechts en Tab gaan forward; omhoog, links en Shift+Tab terug; Home en End naar begin en einde.
 * wrap: aan het eind weer vooraan beginnen (Tab in een venster, de focusval); anders blijft de focus op de rand staan (pijlen en D-pad).
 * Geeft -1 voor een toets die geen navigatie is.
 */
export function navIndex(n, i, key, { wrap = false, shift = false } = {}) {
  if (!n) return -1;
  if (key === 'Home') return 0;
  if (key === 'End') return n - 1;
  const forward = key === 'ArrowDown' || key === 'ArrowRight' || (key === 'Tab' && !shift);
  const backward = key === 'ArrowUp' || key === 'ArrowLeft' || (key === 'Tab' && shift);
  if (!forward && !backward) return -1;
  const naar = i < 0 ? (forward ? 0 : n - 1) : i + (forward ? 1 : -1);
  return wrap ? (naar + n) % n : Math.max(0, Math.min(n - 1, naar));
}

// De toetsen die een kaartvenster voor zichzelf houdt, zodat ze het menu onder de kaart niet wisselen: Q, E, [ ], M en Tab.
export const PAGE_SWITCH_KEYS = /^(q|e|\[|\]|m)$/i;
// De cijfertoets van een rij: '1' tot '9' (nooit '0': de lijst telt tot 9).
export const rijCijfer = (key) => (/^[1-9]$/.test(String(key)) ? Number(key) : 0);
