// Why the police come (#391): a star that arrives without a word looks like bad luck. Every way to a star that has no card of its own names
// its cause in one short line on the message card (politie), at most 14 words (hudtext.js). Pure apart from the world's addMessage.
export const WANTED_WHY = {
  pedHit: 'Een voetganger geraakt: de politie zag het',
  pedKill: 'Een voetganger geraakt: de politie zag het',
  copBump: 'Politiewagen geraakt: de politie komt',
  copHit: 'Een agent geraakt: de politie komt',
  drunkDriving: 'Dronken achter het stuur: de politie zag het',
  overlast: 'Te veel overlast: de politie komt',
  copAanval: 'Politie aangevallen: twee sterren',
  agentAangevallen: 'Een agent aangevallen: de politie komt',
  fietspad: 'Auto op het fietspad: de politie zag het',
  voetpadAuto: 'Auto op het voetpad: de politie zag het',
  voetpadFiets: 'Fiets op het voetpad: de politie zag het',
  snelweg: 'Op de snelweg: de politie zag het',
  getuigeDiefstal: 'Een getuige heeft de politie gebeld: je stal een auto',
  getuige: 'Een getuige heeft de politie gebeld: ze zagen wat je deed',
  bestuurder: 'De bestuurder heeft de diefstal gemeld: de politie komt',
};

// kinds that tell their own story (a card of their own: the cash van, the tuned moped) and need no extra line
export const WANTED_OWN_CARD = new Set(['cashVanBlown', 'cashVanLoot', 'tunedMoped']);

export function wantedWhyText(kind) { return WANTED_WHY[kind] || null; }

// Names the cause on the card; the same key replaces a card that is still up (two stars in a row show the last cause).
export function noteWantedWhy(world, kind) {
  const text = wantedWhyText(kind);
  if (!text || !world || typeof world.addMessage !== 'function') return null;
  world.addMessage(text, 4, { kind: 'politie', key: 'wanted-why' });
  if (world.stats) world.stats.lastWantedWhy = kind;
  return text;
}

// Een getuige belt (#391): eerst een korte waarschuwing zolang het bellen duurt, zodat de speler nog weg kan komen; daarna pas de ster.
export const WITNESS_HINT = 'Een getuige belt de politie. Maak dat je wegkomt';

export function noteWitnessHint(world) {
  if (!world || typeof world.addMessage !== 'function') return null;
  world.addMessage(WITNESS_HINT, 3, { kind: 'politie', key: 'witness-hint' });
  return WITNESS_HINT;
}

// Het telefoontje van een getuige van een autodiefstal telt alleen als de dief nog in die auto zit (zoals de melding van de bestuurder):
// wie al is uitgestapt of in iets anders zit, krijgt geen achtervolging om een auto die hij niet meer heeft.
export function witnessCallStands(call, world) {
  if (!call) return false;
  if (call.kind === 'theft' && call.vehicle) return !!(world && world.player && world.player.inVehicle === call.vehicle);
  return true;
}
