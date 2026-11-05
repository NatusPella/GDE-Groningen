import { hoofdspeler } from './players.js';
// The HUD's attention budget, in one place: how important each kind of
// interruption is and how often the game may interrupt the player with
// something that isn't the story. cinematics.js asks before a non-story
// cinematic moment (new-wijk flyover, landmark and Ommelanden scenes, crash
// replay, five stars); hudcards.js ranks its cards with CARD_PRIORITY and
// rations tips. Story cutscenes, mission intros/outros and death/busted
// are exempt. Pure logic (clock injectable) so it can be tested directly.
//
import { narrativeBusy } from './narrative.js';

import { LEVEL, CARD_PRIORITY as CARDS, MOMENTS, mayShow } from './hudbus.js';
import { playerBusy } from './busy.js';

// Priority: story > wanted/danger > money/achievement > discovery/flavour > tips.
// The tables (levels, card categories, moments, gaps) are in hudbus.js.
export const PRIORITY = LEVEL;
export const CARD_PRIORITY = CARDS;

let clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
const last = { any: -Infinity, level: 0, groups: {}, tip: -Infinity };

export function setAttentionClock(fn) { clock = fn; }
export function resetAttention() { last.any = -Infinity; last.level = 0; last.groups = {}; last.tip = -Infinity; for (const k in voicedAt) delete voicedAt[k]; }

function busy(w) {
  return !!w && playerBusy(w, ['missionPhase', 'sideJob', 'challenge', 'race']).busy;
}

// May a cinematic moment of `kind` play now? Doesn't book it (noteMoment does).
export function mayInterrupt(kind, w) {
  if (!MOMENTS[kind]) return true;
  const v = w && hoofdspeler(w) && hoofdspeler(w).inVehicle;
  return mayShow('moment', {
    kind,
    now: clock(),
    busy: busy(w),
    callOn: typeof document !== 'undefined' && !!document.body && document.body.classList.contains('hud-call-on'),
    // a story call, the radio or car talk is on (narrative.js)
    narrativeBusy: narrativeBusy(),
    speed: v ? v.speed : 0,
    last,
  });
}

export function noteMoment(kind) {
  const m = MOMENTS[kind];
  const now = clock();
  last.any = now;
  last.level = m ? PRIORITY[m.level] : PRIORITY.story;
  if (m) last.groups[m.group] = now;
}

// Tip cards: at most one per TIP_GAP seconds (hudbus.js).
export function mayShowTip() {
  return mayShow('tip', { now: clock(), last: last.tip });
}
export function noteTip() { last.tip = clock(); }

// Phone messages read aloud (phonefeed.js): a character's text always; the
// Kiekdoar news feed and the app's own texts at most once per gap, the rest
// only get the ping.
const voicedAt = {};
export function mayVoiceText(kind) {
  return mayShow('voice', { kind, now: clock(), voicedAt });
}
export function noteVoiceText(kind) { voicedAt[kind] = clock(); }

export const attentionState = () => ({ ...last, groups: { ...last.groups }, now: clock() });

