// One-time in-story career cards (#846): when a story step that names a loopbaan becomes current, show a silent
// card with the first assignment and where to start it, once per player. The story side (story.js, #845) calls
// maybeCareerCards after a step transition; the career profile lives in loopbaan.js / loopbaanlive.js and the
// card texts come from loopbaan.js START. The measure is the first assignment really done (loopbaan.js
// eersteKlusGedaan: points or a counted unit), never the menu button: a loopbaan counts as started for the story
// before this card appears, so the card is skipped. The one-time "seen" bit is in the player's own career profile
// (gde-loopbaan-v1), so it travels with the player to every world: a guest sees his own cards on his own device.
//
// Interface (frozen for the story-side caller):
//   maybeCareerCards(world, stepId) -> number of cards shown (0 when none)
//
// No import of story.js (that would be a cycle): the step tags come from storyarc.js.
import { loopbanenBijStap } from './storyarc.js';
import * as L from './loopbaan.js';
import { getProfiel, markeerKaartGezien, controleerDuizendpoot } from './loopbaanlive.js';

// The cards this step should show now: one per loopbaan the step names whose first assignment is not done yet
// and whose card has not been shown before. Pure, so scripts/loopbaankaarten_test.mjs covers it.
export function kaartenBijStap(profiel, stepId) {
  const out = [];
  if (!profiel || typeof stepId !== 'string' || !stepId) return out;
  for (const vak of loopbanenBijStap(stepId)) {
    if (L.eersteKlusGedaan(profiel, vak) || L.kaartGezien(profiel, vak)) continue;
    const kaart = L.kaartVoorVak(vak);
    if (kaart) out.push(kaart);
  }
  return out;
}

// Show the cards for this step and remember them in the player's career profile. Safe for a null world or a
// step without loopbanen (returns 0 and changes nothing).
export function maybeCareerCards(world, stepId) {
  if (!world || typeof world.addMessage !== 'function') return 0;
  let profiel = null;
  try { profiel = getProfiel(); } catch (e) { profiel = null; }
  if (!profiel) return 0;
  // #846: een speler die alle negentien eerste klussen al had (een gezaaid of oud profiel) krijgt het eenmalige
  // bedrag op dit natuurlijke moment, met een wereld waarin de portemonnee bestaat. Idempotent en nooit gedeeld.
  try { controleerDuizendpoot(world); } catch (e) { /* de beloning mag het verhaal nooit laten stuklopen */ }
  let getoond = 0;
  for (const kaart of kaartenBijStap(profiel, stepId)) {
    try {
      // A silent HUD card: voice: false, no TTS. It is a tip, not an achievement; the key replaces an earlier
      // card of the same loopbaan instead of stacking them.
      world.addMessage(`${kaart.titel}. ${kaart.tekst}`, 8, { kind: 'tip', kicker: 'Loopbaan', key: 'loopbaan-kaart-' + kaart.vak, voice: false });
    } catch (e) { continue; }
    if (markeerKaartGezien(kaart.vak)) getoond++;
  }
  return getoond;
}
