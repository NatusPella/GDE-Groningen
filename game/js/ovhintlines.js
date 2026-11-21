// De regels van de lichte OV-/taxihint (ovhint.js, #1091): het andere personage zegt een korte zin als het doel ver weg is.
// Pure data, geen imports: scripts/voicelines_collect.mjs leest dit ook in Node.
//   id     stabiel
//   soort  'taxi' (alleen de taxi is een optie) of 'beide' (er is ook een halte dichtbij: bus of trein)
//   tekst  wat op de kaart staat; {M} wordt de eigen (eventueel herbonden) kaarttoets of de controllerknop
//   say    wat het andere personage zegt: dezelfde zin zonder toets. De opname staat in de hints-bank als
//          "Tammo|<say>" en "Anita|<say>" (smsvoice.js hintVoiceFor); zonder opname is het een stille kaart.
// Geen namen van personages in een zin: elke regel wordt door beiden gezegd. Geen merken: alleen "taxi", "bus", "trein", "OV".
export const OV_HINT_LINES = [
  { id: 'taxi-bel', soort: 'taxi', tekst: 'Ver weg hè? Open de kaart met {M}: daar bel je een taxi.', say: 'Ver weg hè? Open de kaart, daar bel je een taxi.' },
  { id: 'taxi-eind', soort: 'taxi', tekst: 'Dat is een heel eind. Via de kaart ({M}) neemt een taxi je zo mee.', say: 'Dat is een heel eind. Via de kaart neemt een taxi je zo mee.' },
  { id: 'beide-bus', soort: 'beide', tekst: 'Ver weg hè? Er rijdt ook een bus, of kies op de kaart ({M}) voor een taxi.', say: 'Ver weg hè? Er rijdt ook een bus, of kies op de kaart voor een taxi.' },
  { id: 'beide-ov', soort: 'beide', tekst: 'Wist je dat het ook met het OV kan? Klik op de kaart ({M}) en kies Reis erheen.', say: 'Wist je dat het ook met het OV kan? Klik op de kaart en kies Reis erheen.' },
  { id: 'beide-trein', soort: 'beide', tekst: 'Geen zin om zo ver te rijden? Pak de bus of de trein: de kaart ({M}) laat zien hoe.', say: 'Geen zin om zo ver te rijden? Pak de bus of de trein: de kaart laat zien hoe.' },
];
