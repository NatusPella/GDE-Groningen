// Romantiek als verhaalmomenten en kleine keuzes (#1137, WP14): de romance van Tammo en Tessa is een hoofdlijn, zoet en
// komisch. Geen dating-sim en geen punten: vier kleine keuzes na een overgangsscène (storybridge.js) die alleen de toon van
// dat ene moment veranderen. Een keuze zet één stille vlag (`romantiek:*`) die later hooguit een andere regel of een andere
// blik oplevert (`extra` bij een scène in storyarc_nieuw.js BRIDGES), nooit een ander verloop of een ander einde.
//
// Zuiver: de data en de regels. De keuze-UI is stagechoice.js (één ronde, geen mislukking), het aanbieden staat in
// storybridgerun.js. Tests: scripts/storyromance_test.mjs (een vlag verandert nooit de voortgang; het einde is altijd hetzelfde).
// Samen spelen: de keuze is van wie het spel opende en speelt lokaal, zoals de scène zelf (storybridge.js).

// round: wat stagechoice.js verwacht ({ who, text, rule, options: [{ label, reply }], time, timeoutPick }); `flag` hoort
// bij het label op dezelfde plek; `humor`: een komisch beat dat het paneel van de eigenaar nog beoordeelt.
export const ROMANCE_CHOICES = [
  {
    id: 'kaartje', bridge: 'O1', kicker: 'HET KAARTJE',
    round: { who: 'Tammo', text: 'Het kaartje van de eerste week hangt nog aan de koelkast.', rule: 'Wat doet Tammo ermee?', time: 14, timeoutPick: 1,
      options: [{ label: 'Laten hangen', reply: 'Hij laat het hangen. Tessa tekent door en glimlacht naar het bonnetje.' }, { label: 'In zijn zak stoppen', reply: 'Hij stopt het in zijn zak. Tessa doet alsof ze het niet ziet.' }] },
    flags: ['romantiek:kaartje-hangt', 'romantiek:kaartje-zak'],
  },
  {
    id: 'jas', bridge: 'O4', kicker: 'EEN JAS',
    round: { who: 'Mem', text: 'Famke. Jas.', rule: 'Tessa heeft geen jas aan. Wat doet Tammo?', time: 14, timeoutPick: 2,
      options: [{ label: 'Zijn jas aanbieden', reply: 'Tessa kijkt naar de jas, dan naar buiten. Ze trekt hem aan.' }, { label: 'Niks zeggen', reply: 'Tammo zegt niks. Tessa pakt een jas van de achterbank. Het is zijn jas.' }] },
    flags: ['romantiek:jas-aangeboden', 'romantiek:jas-achterbank'],
  },
  {
    id: 'zaterdag', bridge: 'O7', kicker: 'OVER ZATERDAG',
    round: { who: 'Tessa', text: 'Welke zaterdag?', rule: 'Wat zegt Tammo?', time: 14, timeoutPick: 1,
      options: [{ label: 'Laat maar', reply: 'Ze kijken allebei naar de weg.' }, { label: 'De botsauto', reply: "Tessa zegt: 'Dat was een goede botsauto.' Verder zegt niemand iets." }] },
    flags: ['romantiek:zaterdag-laatmaar', 'romantiek:zaterdag-botsauto'],
  },
  {
    id: 'weg', bridge: 'O12', kicker: 'WAT NU',
    round: { who: 'Tessa', text: 'Samen.', rule: 'Tammo start de auto. Wat doet hij nog meer?', time: 14, timeoutPick: 2,
      options: [{ label: 'Haar hand pakken', reply: 'Ze laat zijn hand zitten, tot de eerste bocht.' }, { label: 'De radio aanzetten', reply: 'Rikus draait een nummer zonder praatje.' }] },
    flags: ['romantiek:weg-hand', 'romantiek:weg-radio'],
  },
];
export const ROMANCE_FLAGS = ROMANCE_CHOICES.flatMap((c) => c.flags);
export const romanceFor = (bridgeId) => ROMANCE_CHOICES.find((c) => c.bridge === bridgeId) || null;

// De `st` die stagechoice.js verwacht, voor één keuze.
export const romanceStage = (c) => ({ kind: 'choice', kicker: c.kicker, rounds: [c.round] });
// De vlag bij de gekozen optie (index 0 of 1).
export const romanceFlagFor = (c, i) => c.flags[Math.max(0, Math.min(c.flags.length - 1, i))];

// Een extra regel in een latere scène door een eerdere keuze: `extra` is [{ if: vlag, line: [spreker, tekst] }];
// geeft de regels van de vlaggen die gezet zijn. Alleen kleur: de scène werkt ook zonder.
export function extraLines(extra, flags) {
  const has = (f) => (flags && (flags.has ? flags.has(f) : flags.includes(f)));
  return (extra || []).filter((e) => has(e.if)).map((e) => e.line);
}
