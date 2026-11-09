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

// #685: de beloning zichtbaar splitsen in de uitslag/banner: de basis, de groepsfactor en (als de
// speler een eigen loopbaanfactor heeft) die er apart bij, met het totaal. Presentatie: de bedragen
// komen van de aanroeper, zodat er precies staat wat er is uitbetaald.
// #811: dezelfde regel in één zin, voor de wachtkamer en de startkaart (naast de volledige uitleg).
export const GROEPSBONUS_KORT = '1+1=3: elke extra speler geeft iedereen 50% meer loon, tot 3×.';
export const GROEPSBONUS_UITLEG = 'Samen spelen levert meer op: elke extra speler geeft iedereen 50% meer loon, tot 3× per persoon.';
export function bonusDelen(basis, aantal, totaal = null, niveau = 0) {
  const b = Math.max(0, Math.round(Number(basis) || 0));
  const f = groepsbonus(aantal);
  const t = totaal != null && Number.isFinite(Number(totaal)) && Number(totaal) >= 0 ? Math.round(Number(totaal)) : metGroepsbonus(b, aantal);
  const n = Math.round((Number(niveau) || 0) * 100);
  const tekst = [`basis €${b}`, n > 0 ? `jouw niveau +${n}%` : null, `groep x${f.toFixed(1).replace('.', ',')}`, `totaal €${t}`].filter(Boolean).join(' · ');
  return { basis: b, factor: f, totaal: t, tekst };
}
