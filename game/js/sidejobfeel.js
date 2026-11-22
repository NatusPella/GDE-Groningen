// Game feel of the side jobs (22-11): the short feedback loop around a paid round. Pure rules, no THREE,
// no world state, no randomness, so plain node can test them (scripts/sidejobfeel_test.mjs).
//   tempoBonus       a round finished with plenty of time left pays a small extra ("Vlot", "Bliksemsnel")
//   reeksNaTegenslag what is left of the streak after a setback: bad luck keeps it, an accident halves it,
//                    walking away loses it
// Samen spelen: both run inside completeRound / skipRound of sidejobs.js, per shift (context) of one player.
// The tempo bonus is part of the tip, so every participant of the round gets it the same way as the tip;
// the streak belongs to the shift of the player who runs it. Nothing here goes over the network by itself.

// Share of the round time that must be left, best tier first. Measured against the timers in the jobs:
// a taxi ride driven straight at the planned speed keeps about 31% (0.45 / 1.45) on a long ride and more
// on a short one, so 30% is "drove well" and 50% is "really fast".
export const TEMPO_TREDEN = Object.freeze([
  Object.freeze({ rest: 0.5, pct: 15, label: 'Bliksemsnel' }),
  Object.freeze({ rest: 0.3, pct: 8, label: 'Vlot' }),
]);
// A timer shorter than this is a countdown of a panel or a hand-in, not a round you can be quick at.
export const TEMPO_MIN_BUDGET = 20;

// pay: what the round pays (euro, after level and streak); timeLeft and budget in seconds.
// Returns the tier with the bonus in whole euros, or null when there is nothing to celebrate.
export function tempoBonus(pay, timeLeft, budget) {
  if (!(pay > 0) || !Number.isFinite(timeLeft) || !Number.isFinite(budget) || budget < TEMPO_MIN_BUDGET || timeLeft <= 0) return null;
  const rest = Math.min(1, timeLeft / budget);
  for (const t of TEMPO_TREDEN) {
    if (rest >= t.rest) return { label: t.label, pct: t.pct, bonus: Math.max(1, Math.round(pay * t.pct / 100)) };
  }
  return null;
}

// The line behind the pay: "Vlot +€4".
export const tempoTekst = (t) => (t ? `${t.label} +€${t.bonus}` : '');

// soort: 'pech' (the game had no round for you, or the round is paid another way): the streak stays;
// 'aanrijding' (a pedestrian stepped in front of you): half is left; anything else (you walked away): gone.
export function reeksNaTegenslag(streak, soort) {
  const s = Math.max(0, Math.floor(streak) || 0);
  if (soort === 'pech') return s;
  if (soort === 'aanrijding') return Math.floor(s / 2);
  return 0;
}

// What the player reads after an accident: honest about what is left of the streak.
export function aanrijdingReeksTekst(voor, na) {
  if (!(voor > 0)) return '';
  return na > 0 ? `je reeks zakt naar ${na}` : 'je reeks is weg';
}
