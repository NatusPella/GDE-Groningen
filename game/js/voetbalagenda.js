// De agenda van de voetbalcarrière in speldagen (#1108, ADR 0042): puur, geen DOM (scripts/voetbal_agenda_test.mjs). De carrière telt nachten (`voetbaldag`) op hetzelfde signaal als calendarday.js
// (de klok die meer dan vier uur terugspringt: middernacht, slapen, een late trein), maar los van de verhaaldatum (die is vastgehouden aan de verhaalstap, constitution 3).
// Ritme: een ronde elke 3 speldagen; beker en Waddenbeker liggen op de dagen ertussen. Een ronde heeft een venster van een speldag (twee bij een verre uitrit). Salaris volgt rondes, nooit nachten.
import { ROUNDS } from './voetbalseizoen.js';

export const DAYS_PER_ROUND = 3;
export const BREAK_DAYS = 3;                // de pauze tussen de seizoenen (transfers, contracten)
export const NIGHT_JUMP = 4;                // zoals calendarday.js
export const MAX_CATCHUP_DAYS = 40;         // na een lange afwezigheid hooguit een verzoening (geen achterstallig salaris)
export const CUP_ROUNDS = 4, EUROPE_ROUNDS = 4;

// Gaat er een nacht voorbij? prev en clock zijn de klok in uren (0 tot 24); null als er nog geen vorige meting is.
export const nightPassed = (prevClock, clock) => prevClock != null && Number.isFinite(prevClock) && Number.isFinite(clock) && prevClock - clock > NIGHT_JUMP;

// De dagen van een seizoen (relatief aan de start, dag 1 is de eerste speldag): competitie op 3, 6, ... 21; beker op 4, 10, 16, 22; Europa op 5, 11, 17, 23. Nooit twee wedstrijden op een dag.
export function seasonCalendar({ cup = true, europe = false } = {}) {
  const ev = [];
  for (let r = 1; r <= ROUNDS; r++) ev.push({ day: DAYS_PER_ROUND * r, kind: 'league', n: r });
  if (cup) for (let c = 1; c <= CUP_ROUNDS; c++) ev.push({ day: 6 * c - 2, kind: 'cup', n: c });
  if (europe) for (let c = 1; c <= EUROPE_ROUNDS; c++) ev.push({ day: 6 * c - 1, kind: 'europe', n: c });
  return ev.sort((a, b) => a.day - b.day || a.kind.localeCompare(b.kind));
}
export const seasonLength = (cal) => cal.reduce((m, e) => Math.max(m, e.day), 0) + BREAK_DAYS;
export const KIND_NAMES = { league: 'Competitie', cup: 'Dijkbeker', europe: 'Waddenbeker' };
// Het venster van een wedstrijd: vanaf zijn dag, een speldag lang (twee bij een verre rit).
export const windowOf = (ev, travelDays = 1) => ({ from: ev.day, to: ev.day + Math.max(1, travelDays) - 1 });
// 'soon' (nog niet), 'open' (nu te spelen) of 'missed' (voorbij: de club rekent hem uit, zonder geldverlies).
export function eventStatus(ev, relDay, travelDays = 1) {
  const w = windowOf(ev, travelDays);
  return relDay < w.from ? 'soon' : relDay <= w.to ? 'open' : 'missed';
}
// De volgende wedstrijd die nog niet geweest is: `done` is het aantal afgewerkte events in de kalender. Null aan het einde van het seizoen.
export const nextEvent = (cal, done) => cal[done] || null;
// Hoeveel speldagen nog tot een event (0 = vandaag; negatief = voorbij).
export const daysUntil = (ev, relDay) => ev.day - relDay;
export const dayText = (d) => (d <= 0 ? 'vandaag' : d === 1 ? 'morgen' : `over ${d} speldagen`);
// Een lange afwezigheid: hoeveel dagen telt er maximaal mee (de rest vervalt); de aanroeper rekent de gemiste rondes uit zonder achterstallig salaris.
export const catchUpDays = (gone) => Math.max(0, Math.min(MAX_CATCHUP_DAYS, Math.floor(gone) || 0));
