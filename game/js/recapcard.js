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

// de spreker van de verhaalregel eraf (dezelfde regel als spelstatus.js zonderSpreker; dit bestand blijft zonder imports)
const zonderSpreker = (lead) => String(lead || '').replace(/^\s*(Tammo|Anita|Tessa)\s*:\s*/, '').trim();

const countWords = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length;
// Perfect-ronde (22-11): as many whole sentences from the front as fit the budget (at least the first one). The first sentence alone
// often is not the goal ("Eerst de mosterd." without "vaar voor het schip uit"), so more sentences stay while there is room.
// A full stop after an abbreviation (Dr., St., mevr., bijv.) or an initial (J.) is not a sentence end.
const ABBREVIATION = /(?:^|[\s(])(?:dr|drs|mr|ir|prof|st|mevr|mw|dhr|bijv|nr|ca|enz|[a-z])$/i;
const splitSentences = (t) => {
  const text = String(t || '').trim();
  const re = /[.!?](?=\s|$)/g;
  const parts = [];
  let from = 0;
  let m;
  while ((m = re.exec(text))) {
    if (text[m.index] === '.' && ABBREVIATION.test(text.slice(from, m.index))) continue;
    parts.push(text.slice(from, m.index + 1).trim());
    from = m.index + 1;
  }
  if (text.slice(from).trim()) parts.push(text.slice(from).trim());
  return parts.length ? parts : [text];
};
const sentencesWithin = (t, budget) => {
  const parts = splitSentences(t);
  let out = parts[0];
  for (const z of parts.slice(1)) { const next = out + ' ' + z; if (countWords(next) > budget) break; out = next; }
  return out;
};

// The content. `input` is flat, so the test needs no world:
//   { step: { id, part, title, lead: 'Name: text' } | null, ended: bool, last: 'title of the last finished step' | '',
//     partTitle: 'Akte 2: Het Noorden is groot', why: 'Waar het om draait' }
// Returns null when there is nothing to say (story over, no current step, or no lead to name the goal).
// De verhaalregel komt als "Anita: tekst" (het voorvoegsel is de dialoogmarkering van de stap); de kaart noemt de gekozen hoofdpersoon zelf (wie).
export function recapContent(input) {
  if (!input || input.ended || !input.step || !input.step.id) return null;
  const s = input.step;
  const now = zonderSpreker(s.lead);
  if (!now) return null;
  let card = { wie: String(input.wie || '').trim(), part: String(input.partTitle || '').trim(), why: String(input.why || '').trim(), last: String(input.last || '').trim(), now, stepId: s.id };
  const size = (c) => countWords(c.why) + countWords(c.last) + countWords(c.now);
  // too long: first cut the lead to its first sentence, then drop the "waar het om draait"
  if (size(card) > RECAP_MAX_WORDS) {
    // the goal comes first: keep the "waar het om draait" only when the goal does not lose a sentence for it
    const withWhy = sentencesWithin(now, RECAP_MAX_WORDS - countWords(card.why) - countWords(card.last));
    const withoutWhy = sentencesWithin(now, RECAP_MAX_WORDS - countWords(card.last));
    card = countWords(withoutWhy) > countWords(withWhy) ? { ...card, why: '', now: withoutWhy } : { ...card, now: withWhy };
  }
  if (size(card) > RECAP_MAX_WORDS) card = { ...card, why: '' };
  // Verfijning 22-11: een ongewoon lange titel of eerste zin mag de kaart nooit uit het budget duwen: eerst "laatst gedaan" weg,
  // dan het doel zelf op woorden afgekapt met een beletselteken.
  if (size(card) > RECAP_MAX_WORDS) card = { ...card, last: countWords(card.last) > 14 ? '' : card.last };
  if (size(card) > RECAP_MAX_WORDS) {
    const budget = Math.max(8, RECAP_MAX_WORDS - countWords(card.last));
    card = { ...card, now: card.now.trim().split(/\s+/).slice(0, budget).join(' ').replace(/[,;:]$/, '') + '…' };
  }
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
