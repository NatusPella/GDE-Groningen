// 1+1=3 (#492): met meer spelers levert een groep meer op, en elk lid krijgt daar zelf
// ook meer van. De regel is bewust simpel en puur: elke extra deelnemer geeft 50% meer
// voor iedereen, tot een maximum van 3x per persoon. Daarboven groeit alleen het totaal
// nog mee (het aantal spelers is in theorie onbeperkt; de host en de verbinding bepalen
// de praktische grens). Geen random, geen DOM, geen opslag.
//
// De factor gaat over het bedrag dat een speler zou krijgen; de eigen loopbaanfactor van
// die speler komt daar nog overheen. Zo krijgt een gast met een hoger niveau nog steeds
// zijn eigen voordeel.

export const GROEPSBONUS_PER_SPELER = 0.5;
export const GROEPSBONUS_MAX = 3;

// De factor voor één speler bij `aantal` deelnemers. 1 speler = 1x, 2 = 1,5x, 3 = 2x,
// 4 = 2,5x, 5 of meer = 3x.
export function groepsbonus(aantal) {
  const n = Math.max(1, Math.floor(Number(aantal) || 1));
  return Math.min(GROEPSBONUS_MAX, 1 + GROEPSBONUS_PER_SPELER * (n - 1));
}

// Een bedrag met de groepsbonus, in hele euro's en nooit negatief.
export function metGroepsbonus(bedrag, aantal) {
  const b = Number(bedrag);
  if (!Number.isFinite(b) || b <= 0) return 0;
  return Math.max(0, Math.round(b * groepsbonus(aantal)));
}
