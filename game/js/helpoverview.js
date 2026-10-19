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
  { id: 'todo', title: 'Wat kan ik nog meer?', lines: [
    '{ESC} › Te doen laat alles zien wat openstaat: missies, bijbaantjes en plekken. Kies iets en de route gaat erheen.',
  ] },
  { id: 'geld', title: 'Geld en winkels', lines: [
    'Geld verdien je met missies en bijbaantjes; je saldo staat rechtsboven.',
    'Een winkel staat op de kaart: loop naar binnen en druk {E}.',
  ] },
  { id: 'telefoon', title: 'Telefoon', lines: [
    'Berichten komen als kaartje binnen. Teruglezen, bellen en contacten vind je onder {ESC} › Telefoon.',
  ] },
  { id: 'opslaan', title: 'Opslaan', lines: [
    'Het spel slaat zelf op na een missie en als je naar bed gaat. Je hoeft er niets voor te doen.',
  ] },
  { id: 'voertuigen', title: 'Voertuigen', lines: [
    'Stap in met {E}, uit met {E}. Elk voertuig geeft de eerste keer een korte uitleg.',
    'Achterom kijken met {Q}, toeteren met {H}, handrem met {SPACE}.',
  ] },
  { id: 'vastgelopen', title: 'Vastgelopen?', lines: [
    '{ESC} › Overzicht heeft "Vastgelopen? Zet me vrij" en, tijdens een missie, "Missie afbreken".',
  ] },
  { id: 'toetsen', title: 'Toetsen en controller', lines: [
    'Alle toetsen en knoppen staan onder Besturing. Je kunt ze zelf anders zetten, voor toetsenbord en controller.',
    'Zet de uitleg uit onder Instellingen › Interface › Meer opties.',
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
