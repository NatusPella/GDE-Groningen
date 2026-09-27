// The HUD's attention budget, in one place: how important each kind of
// interruption is and how often the game may interrupt the player with
// something that isn't the story. cinematics.js asks before a non-story
// cinematic moment (new-wijk flyover, landmark and Ommelanden scenes, crash
// replay, five stars); hudcards.js ranks its cards with CARD_PRIORITY and
// rations tips. Story cutscenes, mission intros/outros and death/busted
// are exempt. Pure logic (clock injectable) so it can be tested directly.
//
// Priority: story > wanted/danger > money/achievement > discovery/flavour > tips.
export const PRIORITY = { story: 5, danger: 4, reward: 3, discovery: 2, tip: 1 };

// HUD card categories (hudcards.js) on that scale
export const CARD_PRIORITY = { missie: 5, bijbaan: 5, politie: 4, gevaar: 4, geld: 3, prestatie: 3, tip: 1 };

// Cinematic moments: their level, their own cooldown and whether they may
// interrupt while driving fast. Discovery scenes share one cooldown.
const MOMENTS = {
  wijk: { level: 'discovery', group: 'discovery', cooldown: 210, fast: false },
  landmark: { level: 'discovery', group: 'discovery', cooldown: 210, fast: false },
  ommelanden: { level: 'discovery', group: 'discovery', cooldown: 210, fast: false },
  crash: { level: 'danger', group: 'crash', cooldown: 60, fast: true },
  wanted5: { level: 'danger', group: 'wanted5', cooldown: 120, fast: true },
};
// no two interruptions of any kind closer together than this
const GLOBAL_GAP = 40;
// a lower level also waits this long after a higher one
const AFTER_HIGHER = 20;
const FAST = 50 / 3.6;
const TIP_GAP = 20;

let clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
const last = { any: -Infinity, level: 0, groups: {}, tip: -Infinity };

export function setAttentionClock(fn) { clock = fn; }
export function resetAttention() { last.any = -Infinity; last.level = 0; last.groups = {}; last.tip = -Infinity; for (const k in voicedAt) delete voicedAt[k]; }

function busy(w) {
  return !!(w && ((w.mission && w.mission.phase === 'active') || (w.sideJob && w.sideJob.active) || w.challenge || w.race));
}

// May a cinematic moment of `kind` play now? Doesn't book it (noteMoment does).
export function mayInterrupt(kind, w) {
  const m = MOMENTS[kind];
  if (!m) return true;
  const now = clock();
  if (busy(w)) return false;
  if (typeof document !== 'undefined' && document.body && document.body.classList.contains('hud-call-on')) return false;
  const v = w && w.player && w.player.inVehicle;
  if (!m.fast && v && Math.abs(v.speed || 0) > FAST) return false;
  if (now - (last.groups[m.group] ?? -Infinity) < m.cooldown) return false;
  if (now - last.any < GLOBAL_GAP) return false;
  if (PRIORITY[m.level] < last.level && now - last.any < GLOBAL_GAP + AFTER_HIGHER) return false;
  return true;
}

export function noteMoment(kind) {
  const m = MOMENTS[kind];
  const now = clock();
  last.any = now;
  last.level = m ? PRIORITY[m.level] : PRIORITY.story;
  if (m) last.groups[m.group] = now;
}

// Tip cards: at most one per TIP_GAP seconds.
export function mayShowTip() {
  return clock() - last.tip >= TIP_GAP;
}
export function noteTip() { last.tip = clock(); }

// Phone messages read aloud (phonefeed.js): a character's text always; the
// Sikkom news feed and the app's own texts at most once per gap, the rest
// only get the ping.
const VOICE_GAP = { news: 45, system: 30 };
const voicedAt = {};
export function mayVoiceText(kind) {
  const gap = VOICE_GAP[kind];
  return !gap || clock() - (voicedAt[kind] ?? -Infinity) >= gap;
}
export function noteVoiceText(kind) { voicedAt[kind] = clock(); }

export const attentionState = () => ({ ...last, groups: { ...last.groups }, now: clock() });
