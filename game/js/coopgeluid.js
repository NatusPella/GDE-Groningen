// Samen spelen (#434): de geluidsregels die voor een gast net zo gelden als
// voor de host. Elke speler hoort zijn eigen uitgang, dus dempen is van hem
// alleen; de stand moet wel altijd terug te draaien zijn, met de toets en met
// de indicator linksboven (ook op een toestel zonder toetsenbord).
// Daarnaast staan de pratende mensen (de ambient stemmen) onder de effecten,
// zodat een gesprek op straat een schot of een motor niet overstemt.
// Puur: geen DOM en geen Web Audio, zodat coopgeluid_test.mjs dit kan checken.

export const DEMP_TOETS = 'U';

// De ambient stemmen (de NPC-zinnetjes van audio.js, NPC_PHRASE_AUDIO) op de
// helft van hun oude niveau: nog goed te horen, maar onder de effecten.
export const STEM_NIVEAU = 0.5;

// Het niveau van een ambient stem: de basis (0..1) keer het stemniveau.
export function stemNiveau(basis = 1) {
  const b = typeof basis === 'number' && Number.isFinite(basis) ? Math.max(0, Math.min(1, basis)) : 1;
  return b * STEM_NIVEAU;
}

// De hint naast de luidspreker op de HUD: met de toets, en op een toestel
// zonder toetsenbord (touch) met de tik, want daar is U niet te gebruiken.
export function dempHint({ touch = false } = {}) {
  return touch ? 'tik: geluid' : DEMP_TOETS + ': geluid';
}

// Wat er in beeld komt bij het dempen: meteen hoe je het terugdraait, ook als
// de speler de toets nog niet kent.
export function dempMelding(gedempt, { touch = false } = {}) {
  if (!gedempt) return 'Geluid aan';
  return touch
    ? 'Geluid uit. Tik op het luidsprekertje linksboven voor geluid.'
    : `Geluid uit. Druk op ${DEMP_TOETS} voor geluid.`;
}
