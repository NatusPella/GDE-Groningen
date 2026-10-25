// De waakhond van safety.js (#435): welk teken van een filmpje of scène hangt er
// nog, terwijl er geen scène meer loopt? Puur (geen DOM, geen world), zodat
// scripts/safetywacht_test.mjs het kan natrekken.
//
// De drie tekenen: de twee vlaggen op de world (cinematicHidePlayers, cinematicHideNav)
// en de klasse cine-hide-hud op de body. Een scène zet ze in onStart of in
// cinematics.js en hoort ze in onEnd weer weg te halen. Blijft er een staan,
// dan verbergt het spel de speler of de navigatie zonder reden: safety.js zet ze
// na REST_S seconden uit.
//
// De waarschuwing in de console noemt de vlag die bleef hangen en komt per teken
// maar één keer langs (#435: elf keer dezelfde regel op één dag zegt niets).
export const REST_S = 3; // seconden dat een teken mag blijven staan voor het opvalt

const NAMEN = [
  ['hidePlayers', 'cinematicHidePlayers'],
  ['hideNav', 'cinematicHideNav'],
  ['hud', 'cine-hide-hud'],
];

// Welke tekenen hangen nog? [{ sleutel, naam }], leeg als alles schoon is.
export function hangendeTeken(stand = {}) {
  return NAMEN.filter(([sleutel]) => !!stand[sleutel]).map(([sleutel, naam]) => ({ sleutel, naam }));
}

// De regel voor de console, met de namen erbij zodat een melding van een speler
// meteen zegt waar het misging.
export function restMelding(teken) {
  const namen = teken.map((t) => (typeof t === 'string' ? t : t.naam));
  return `[safety] scene leftovers cleared (${namen.join(', ')})`;
}

// De sleutel waarop we dubbel melden tegenhouden: dezelfde combinatie opnieuw
// is dezelfde klacht. De volgorde van de tekenen ligt vast (NAMEN), dus de
// sleutel is stabiel.
export function restSleutel(teken) {
  return teken.map((t) => (typeof t === 'string' ? t : t.sleutel)).join('|');
}

// Hoe vaak deze combinatie al opviel (1 = de eerste keer). De aanroeper meldt
// alleen bij 1 en telt de rest stil mee, zodat één vastgelopen scène de console
// niet volloopt.
export function telRest(teller, teken) {
  const sleutel = restSleutel(teken);
  const n = (teller.get(sleutel) || 0) + 1;
  teller.set(sleutel, n);
  return n;
}
