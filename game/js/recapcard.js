// Recap card "Waar waren we?" (story analysis 21-11): when the player comes back to a saved game (Doorgaan), a short
// card says what the story is about, what was done last and what the goal is now. Skippable (Enter, Esc, Space or a
// click) and short enough to read in a few seconds.
// This file is the pure part: the content from the story progress, the conditions and the per-device storage.
// No DOM, no world, no THREE: scripts/recapcard_test.mjs runs it in node. The card itself is in recapcardrun.js.
//
// No new story text: everything comes from existing data (the lead of the current step in storyarc_nieuw.js, WHY per
// part and the title of the last finished step), so the card cannot contradict the canon.
//
// Samen spelen: the card is local to the player who chooses Doorgaan. Loading a game is not possible in a session
// (savegame.js coopSessieLoopt), so the card only exists when playing alone; a guest or a running session skips it.
// Nothing goes over the network and nothing is written to the save or the progress (#429: progress per player).

// At most this many words on the card (about 4 to 5 seconds of reading); a longer lead is cut to its first sentence.
export const RECAP_MAX_WORDS = 48;
// A card that is not dismissed closes itself after this many seconds (real time; the world stands still meanwhile).
export const RECAP_CLOSE_S = 14;
// Same step and less than this many milliseconds after the last card (a quick reload): no second card.
export const RECAP_REPEAT_MS = 10 * 60 * 1000;
// How long to wait for a calm moment before giving up (seconds of game time).
export const RECAP_WAIT_MAX_S = 20;
export const RECAP_KEY = 'gde-recap-v1';

const countWords = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length;
const firstSentence = (t) => { const m = /^[\s\S]*?[.!?](?=\s|$)/.exec(String(t || '').trim()); return m ? m[0] : String(t || '').trim(); };

// The content. `input` is flat, so the test needs no world:
//   { step: { id, part, title, lead: 'Name: text' } | null, ended: bool, last: 'title of the last finished step' | '',
//     partTitle: 'Akte 2: Het Noorden is groot', why: 'Waar het om draait' }
// Returns null when there is nothing to say (story over, no current step, or no lead to name the goal).
export function recapContent(input) {
  if (!input || input.ended || !input.step || !input.step.id) return null;
  const s = input.step;
  const now = String(s.lead || '').trim();
  if (!now) return null;
  let card = { part: String(input.partTitle || '').trim(), why: String(input.why || '').trim(), last: String(input.last || '').trim(), now, stepId: s.id };
  const size = (c) => countWords(c.why) + countWords(c.last) + countWords(c.now);
  // too long: first cut the lead to its first sentence, then drop the "waar het om draait"
  if (size(card) > RECAP_MAX_WORDS) card = { ...card, now: firstSentence(now) };
  if (size(card) > RECAP_MAX_WORDS) card = { ...card, why: '' };
  return card;
}

// The rows of the card as plain pairs [label, text] (for the test, screen readers and the DOM).
export function recapRows(card) {
  if (!card) return [];
  const out = [];
  if (card.why) out.push(['Waar het om draait', card.why]);
  if (card.last) out.push(['Laatst gedaan', card.last]);
  out.push(['Nu', card.now]);
  return out;
}

// --- per-device storage --------------------------------------------------------------------------------------------

// One own key (no field in a save: this belongs to the device, not the game, so every save stays whole).
// Shape: { v: 1, stap: '<step id>', om: <ms since 1970> }. Anything else counts as "nothing seen yet".
export function readRecapSeen(storage) {
  try {
    const raw = storage && storage.getItem ? storage.getItem(RECAP_KEY) : null;
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d && typeof d.stap === 'string' && d.stap.length < 40 && Number.isFinite(d.om) ? { step: d.stap, at: d.om } : null;
  } catch (e) { return null; }
}

export function writeRecapSeen(storage, stepId, now = Date.now()) {
  try {
    if (!storage || !storage.setItem || typeof stepId !== 'string') return false;
    storage.setItem(RECAP_KEY, JSON.stringify({ v: 1, stap: stepId, om: now }));
    return true;
  } catch (e) { return false; }
}

// Same step, shortly after the last card: the player reloaded for a moment (after a miss, a quick try); not again.
export function recapSeenRecently(seen, stepId, now = Date.now()) {
  return !!seen && seen.step === stepId && now - seen.at >= 0 && now - seen.at < RECAP_REPEAT_MS;
}

// --- when ----------------------------------------------------------------------------------------------------------

// Every reason the card does not show now (empty = it may). `s` is a flat snapshot. Stricter than the return scene
// where a film or a mission is concerned (a card that interrupts them is more annoying), but deliberately without
// "in a vehicle" or "police": the card stops the world while it is open, so nothing can go wrong.
export function recapBlockers(s) {
  const out = [];
  if (s.off) out.push('instelling Terugkeerscène staat uit');
  if (s.testbed) out.push('testbank of bot');
  if (!s.started) out.push('spel nog niet gestart');
  if (s.loading) out.push('laadscherm staat nog');
  if (!s.loaded) out.push('geen opgeslagen spel geladen');
  if (s.client) out.push('meespeler (de kaart hoort bij wie Doorgaan koos; een gast laadt niet)');
  if (s.session) out.push('Samen spelen');
  if (s.openingDue) out.push('de opening komt nog (eerste nieuw spel)');
  if (s.missionActive) out.push('missie actief');
  if (s.cinematicActive) out.push('film bezig');
  if (s.sinceCinematicS != null && s.sinceCinematicS <= 1.5) out.push('film net afgelopen');
  if (s.narrativeBusy) out.push('vertelling bezig');
  if (s.pigeon) out.push('duifstand');
  if (s.activity) out.push('activiteit of minigame bezig');
  if (s.respawn) out.push('terugzetten loopt');
  if (s.menuOpen) out.push('menu open');
  if (!s.dataReady) out.push('verhaaldata nog niet geladen');
  return out;
}
export const recapAllowed = (s) => recapBlockers(s).length === 0;

// Show only after 0.6 s of calm in a row (the world is then really loaded), give up after RECAP_WAIT_MAX_S.
// Returns 'show', 'wait' or 'give-up'.
export function recapDecide({ blockers, waitS, calmS }) {
  if (waitS > RECAP_WAIT_MAX_S) return 'give-up';
  if (blockers && blockers.length) return 'wait';
  return calmS >= 0.6 ? 'show' : 'wait';
}
