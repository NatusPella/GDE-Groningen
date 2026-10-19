// Pure logic of the load screens (loadscreen.js): which variant a jump gets,
// timing, progress from the streaming status and the choice of short tips.
// No DOM, so scripts/loadlogic_test.mjs can run it.

export const JUMP_M = 700;
export const SNEL_M = 3000;
export const MAX_S = 12;
export const TIP_MAX_CHARS = 70;
export const LINE_S = { save: 4.5, travel: 3.5, snel: 0 };
const MIN_S = { save: 2.2, travel: 1.4, snel: 0.6 };
const minSeconds = (kind) => MIN_S[kind] ?? MIN_S.travel;

// save: loading a game; snel: a short hop (fast travel nearby, a mission
// start across the block): small card, no tips; travel: a long jump.
export function loadKind(distance, { save = false } = {}) {
  if (save) return 'save';
  return distance < SNEL_M ? 'snel' : 'travel';
}

// The streaming status counts what is still to be built; the first frames
// have not looked at the new place yet, so they report nothing useful.
// state: { total, shown, calm, frames }, returns the next state plus bar (0..1)
// and done. Pure: pass the old state in, get a new one out.
export function stepProgress(state, pending, elapsedS, kind) {
  const frames = state.frames + 1;
  let total = state.total;
  if (frames > 3) total = Math.max(total, pending);
  const k = frames <= 3 ? 0 : total ? 1 - pending / total : 1;
  const shown = Math.max(state.shown, Math.min(1, Math.max(0, k)));
  const min = minSeconds(kind);
  const timeK = Math.min(1, elapsedS / min);
  const bar = Math.min(shown, 0.04 + timeK * 0.96);
  const calm = frames > 3 && pending === 0 ? state.calm + 1 : 0;
  const done = (elapsedS >= min && calm >= 12) || elapsedS > MAX_S;
  return { total, shown, calm, frames, bar: done ? 1 : bar, done };
}
export const startProgress = () => ({ total: 0, shown: 0, calm: 0, frames: 0 });

// Exactly one progress bar is visible per phase: the boot screen's during the
// boot, the load screen's afterwards (the boot bar is hidden once it opens).
export const BAR_PHASES = ['boot', 'save', 'travel', 'snel'];
export const barsFor = (phase) => (BAR_PHASES.includes(phase) ? 1 : 0);

const firstSentence = (t) => (t.match(/^.*?[.!?](\s|$)/) || [t])[0].trim();
export const tipText = (t) => firstSentence(String(t).replace(/^Tip: /, '')).replace(/^./, (c) => c.toUpperCase());

// Short tips only (a line, not a wall): the first sentence, at most
// TIP_MAX_CHARS. Never the same tip twice in a row across screens (last).
export function pickTips(all, n, rng = Math.random, last = '') {
  const pool = [...new Set(all.map(tipText).filter((t) => t && t.length <= TIP_MAX_CHARS && t !== last))];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.max(0, n));
}

// The lines the screen cycles through: one lead line (place or story), then
// tips. A snel screen has no lines at all.
export function buildLines(kind, lead, tips) {
  if (kind === 'snel') return [];
  const lines = [];
  if (lead && lead[1]) lines.push(lead);
  for (const t of tips) lines.push(['Wist je dat', t]);
  return lines;
}
