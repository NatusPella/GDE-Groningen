// Hulpoverzicht (#201): the "Hulp" tab under Besturing in the pause menu. Plain
// text topics for what a new player asks in the first hours; no voice. The
// topics are data, helpHtml() turns them into markup with the caller's glyph
// renderer ({E} becomes the player's own key or controller button).
// Pure: scripts/hintkit_test.mjs checks it.

export const HELP_TOPICS = [
  { id: 'doel', title: 'Waar moet ik heen?', lines: [
    'Bovenin staat je doel. Volg de gele route op de minimap tot in de gele marker.',
    'Open de kaart met {M}, kies een plek of missie en de route gaat erheen. Het verhaal wacht zolang.',
    'Shift + klik op de kaart zet je meteen op die plek (uit te zetten bij {ESC} Instellingen › Interface).',
  ] },
  { id: 'kaart', title: 'De kaart: waypoint en reizen', lines: [
    'Klik op een plek of een icoon op de kaart en kies uit drie dingen: Zet waypoint, Reis erheen (met de kosten en de duur) of Info. Met een controller kies je een plek met {ENTER} onder het kruisje.',
    'Er is één waypoint tegelijk, met een lijn en de afstand op de kaart en een baken in de wereld. Klik er nog eens op of kies Haal weg om hem te wissen ({DELETE}).',
    'Snel reizen kost tijd en geld; je staat er na een korte rit. Zelf gaan zet een waypoint en je rijdt of loopt zelf. Bij het station kies je zelf de trein besturen of als passagier meegaan.',
    'In Samen spelen kan een gast een waypoint zetten. Reizen kan alleen in je eigen spel.',
  ] },
  { id: 'todo', title: 'Wat kan ik nog meer?', lines: [
    '{ESC} › Activiteiten laat zien wat er te doen is: klussen, minigames en evenementen. Bijbanen staan onder Loopbanen. Kies iets en de route gaat erheen.',
  ] },
  { id: 'geld', title: 'Geld en winkels', lines: [
    'Geld verdien je met missies en bijbaantjes; je saldo staat rechtsboven.',
    'Een winkel staat op de kaart: loop naar binnen en druk {E}.',
  ] },
  { id: 'telefoon', title: 'Telefoon', lines: [
    'Berichten komen als kaartje binnen. Teruglezen, bellen en contacten vind je onder {ESC} › Verhaal › Personages.',
  ] },
  { id: 'opslaan', title: 'Opslaan', lines: [
    'Het spel slaat zelf op na een missie en als je naar bed gaat. Je hoeft er niets voor te doen.',
  ] },
  { id: 'voertuigen', title: 'Voertuigen', lines: [
    'Stap in met {E}, uit met {E}. Elk voertuig geeft de eerste keer een korte uitleg.',
    'Achterom kijken met {Q}, toeteren met {H}, handrem met {SPACE}.',
  ] },
  { id: 'vastgelopen', title: 'Vastgelopen?', lines: [
    '{ESC} › Overzicht heeft "Vastgelopen? Zet me vrij" en, tijdens een missie, "Missie stoppen" (je krijgt eerst een vraag).',
  ] },
  { id: 'samen', title: 'Samen spelen', lines: [
    'Kies Samen spelen in het hoofdmenu of onder {ESC}. Eén speler kiest Een spel openen en deelt de kamercode; de anderen kiezen Meedoen en typen of plakken die code.',
    'Iedereen moet dezelfde versie van het spel hebben. Staat er "Andere versie", installeer dan allemaal de nieuwste.',
    'Lukt het niet? Kies in dat scherm Verbinding testen: daar staat in gewone taal wat er mis is en wat je kunt doen. Met Foutrapport kopiëren kun je dat naar iemand sturen.',
    'Windows vraagt de eerste keer of GDE Groningen het netwerk mag gebruiken. Kies Toestaan (privé netwerk).',
    'Valt iemands verbinding weg, dan pauzeert het spel en komt het vanzelf terug zodra die weer verbonden is.',
  ] },
  { id: 'toetsen', title: 'Toetsen en controller', lines: [
    'Alles staat bij elkaar onder Instellingen › Besturing: muis en toetsenbord, controller en aanraken. Het Toetsenoverzicht zet de besturing per situatie bij elkaar: te voet, vervoer, vechten, duif, samen spelen en het menu.',
    'Toetsen en knoppen kun je zelf anders zetten, voor toetsenbord en controller.',
    'Zet de uitleg uit onder Instellingen › Interface › Meer opties.',
  ] },
  { id: 'geluid', title: 'Geluid uit of weer aan', lines: [
    'Staat het geluid uit, dan staat linksboven in beeld een luidspreker met een streep erdoor, met de toets erbij. Druk op {U} om het weer aan te zetten.',
    'Zie je dat teken en hoor je niets, dan is er niets kapot: het geluid staat gewoon uit. Onder {ESC} › Spel › Overzicht staat het ook bij de volumeschuiven.',
    'De radio gaat apart aan en uit met {N}. Het volume van muziek, effecten en stemmen stel je in onder {ESC} › Instellingen › Geluid & ondertitels.',
  ] },
];

const KEY_TOKEN = /\{(\w+)\}/g;

// The help as plain text (for search and tests), tokens left out as the key name.
export function helpPlain(topics = HELP_TOPICS) {
  return topics.map((t) => [t.title, ...t.lines.map((l) => l.replace(KEY_TOKEN, '$1'))].join('\n')).join('\n\n');
}

// glyph(token) -> html for a key; esc(text) -> escaped text
export function helpHtml(glyph, esc, topics = HELP_TOPICS) {
  const line = (l) => l.split(KEY_TOKEN).map((part, i) => (i % 2 ? glyph(part) : esc(part))).join('');
  return topics.map((t) => `<section class="pm-cgroup pm-help" data-help="${t.id}"><h3>${esc(t.title)}</h3>${t.lines.map((l) => `<p class="pm-hline">${line(l)}</p>`).join('')}</section>`).join('');
}
