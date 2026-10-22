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
