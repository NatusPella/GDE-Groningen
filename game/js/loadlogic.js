// Pure logic of the load screens (loadscreen.js): which variant a jump gets,
// timing, progress from the streaming status and the choice of short tips.
// No DOM, so scripts/loadlogic_test.mjs can run it.

export const JUMP_M = 700;
export const SNEL_M = 3000;
export const MAX_S = 12;
export const TIP_MAX_CHARS = 70;
const MIN_S = { save: 2.2, travel: 1.4, snel: 0.6 };
const minSeconds = (kind) => MIN_S[kind] ?? MIN_S.travel;

// save: loading a game; snel: a short hop (fast travel nearby, a mission
// start across the block): small card, no tips; travel: a long jump.
export function loadKind(distance, { save = false } = {}) {
  if (save) return 'save';
  return distance < SNEL_M ? 'snel' : 'travel';
}

// Everything the world still has to build or load before the first seconds are
// smooth: the buildings and roads of scene3d, the tiles still in the queue and
// the prewarm of the place you are going to. The load screen waited only on the
// first two, so after fast travel the destination stayed coarse for a while
// once the screen was gone (#929). binnen: 1 as long as the home the game starts in (the flat upstairs, spawnbinnen.js) is not built
// yet, so the screen leaves only when the room stands; the wait has its own time-out (BINNEN_MAX_S) and a fallback to outside.
// #1354: extra = wat de strenge definitie van tegel-klaar (tileready.js) daarbovenop telt: shaders en texturen, het verre LOD, de bevolking.
export function loadPending(st, tiles = 0, prewarm = 0, binnen = 0, extra = 0) {
  const n = (v) => (Number.isFinite(v) && v > 0 ? v : 0);
  return n(st && st.buildings) + n(st && st.roads) + n(tiles) + n(prewarm) + n(binnen) + n(extra);
}

// The streaming status counts what is still to be built; the first frames
// have not looked at the new place yet, so they report nothing useful.
// state: { total, shown, calm, frames }, returns the next state plus bar (0..1)
// and done. Pure: pass the old state in, get a new one out.
export function stepProgress(state, pending0, elapsed0, kind) {
  // een kapotte tijd of teller (NaN) mag het laadscherm niet laten hangen: de tijd telt dan als verlopen, de teller als leeg
  const elapsedS = Number.isFinite(elapsed0) ? elapsed0 : MAX_S + 1;
  const pending = Number.isFinite(pending0) && pending0 > 0 ? pending0 : 0;
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

// The boot bar's real steps (#600, opdracht 21-11). main.js reports the measured moments of the start
// (setBootStep with the step and how far it is); every step says in plain words what is
// happening and has a weight that follows the measured duration (docs/LAAD-STREAMING-LOD.md), so the
// bar is only full when the very last step is done: the game is really ready. The steps
// that do not apply (no warm-up in a test run, no opening shots, no sound) drop out of the
// plan and the weights are scaled to add up to 1 again. Pure, so scripts/loadlogic_test.mjs
// can walk it.
export const BOOT_STEPS = [
  { id: 'kaart', weight: 0.12, label: 'De kaart van Grunn komt binnen' },
  { id: 'wereld', weight: 0.06, label: 'De wereld wordt opgebouwd' },
  { id: 'systemen', weight: 0.13, label: 'Wegen en voertuigen worden klaargezet' },
  { id: 'buurt', weight: 0.18, label: 'Wegen en gebouwen rond je worden geladen', when: 'warm' },
  { id: 'openingsbeelden', weight: 0.12, label: 'De openingsbeelden worden klaargezet', when: 'openings' },
  { id: 'shaders', weight: 0.33, weightEenLicht: 0.16, label: 'De shaders worden klaargezet (dit duurt even)', when: 'warm' },
  { id: 'geluid', weight: 0.04, label: 'Het geluid wordt klaargemaakt', when: 'geluid' },
  { id: 'beeld', weight: 0.06, label: 'De eerste beelden worden getekend', when: 'warm' },
];
export const BOOT_DONE_LABEL = 'Klaar, Grunn staat te wachten';
// opts: warm (the start area and shader warm-up run), openings (the opening shots are ridden ahead),
// film (a new game: the shaders are also compiled in the film's light setting), geluid (wait for the samples)
export function bootPlan({ warm = true, openings = false, film = true, geluid = true } = {}) {
  const on = { warm, openings: warm && openings, geluid: warm && geluid };
  const kept = BOOT_STEPS.filter((s) => !s.when || on[s.when]);
  const w = (s) => (!film && s.weightEenLicht ? s.weightEenLicht : s.weight);
  const sum = kept.reduce((t, s) => t + w(s), 0);
  let from = 0;
  const steps = kept.map((s, i) => {
    const to = i === kept.length - 1 ? 1 : from + w(s) / sum;
    const step = { id: s.id, label: s.label, weight: w(s) / sum, from, to, nr: i + 1, total: kept.length };
    from = to;
    return step;
  });
  return { steps, total: steps.length };
}
const clamp01 = (v) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
// The bar (0..1) for "this step is frac of the way"; an unknown step is 0. Never 1 before the last step is done.
export function bootProgress(plan, id, frac = 0) {
  const s = plan.steps.find((x) => x.id === id);
  if (!s) return 0;
  return s.from + (s.to - s.from) * clamp01(frac);
}
// The step a bar value belongs to (clamped); 'final' is the last step. A bar of 1 is "klaar".
export function bootPhaseAt(progress, plan = bootPlan()) {
  const p = clamp01(progress);
  let step = plan.steps[0];
  for (const s of plan.steps) if (p >= s.from) step = s;
  return { ...step, final: step.nr === plan.total, klaar: p >= 1 };
}
// The slow creep inside a long step (the bar keeps moving while one step has nothing to report):
// the bar may drift towards the step's end but never into the last tenth of it, so a step that
// reports real progress is never overtaken and the end of a step is only reached when it is done.
export function bootCreepCap(plan, progress) {
  const s = bootPhaseAt(progress, plan);
  if (s.klaar) return 1;
  return s.to - (s.to - s.from) * 0.1;
}
// What a run measured per step: entries are [id, frac, ms since navigation] in the order they were reported
// (startscreen.js setBootStep, window.__loadMarks.stappen); a step lasts from its first report to the first report
// of the next one, the last one until endMs. Returns [{ id, ms, aandeel }] (aandeel: share of the total, 0..1), for
// choosing the weights of BOOT_STEPS from a measurement (?laadstappen).
export function stepDurations(entries, endMs) {
  const first = [];
  for (const [id, , ms] of entries) if (!first.some((f) => f.id === id)) first.push({ id, ms });
  const out = first.map((f, i) => ({ id: f.id, ms: Math.max(0, (i + 1 < first.length ? first[i + 1].ms : endMs) - f.ms) }));
  const total = out.reduce((t, o) => t + o.ms, 0) || 1;
  return out.map((o) => ({ ...o, aandeel: o.ms / total }));
}

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

// The load screen's real steps in words (#1002), like BOOT_PHASES for the boot bar: the bar
// (0..1, from stepProgress) says how far, the step says what the wait is for. Pure.
export const LOAD_STEPS = [
  { from: 0, id: 'plek', label: 'De plek wordt klaargezet' },
  { from: 0.25, id: 'gebouwen', label: 'Gebouwen en straten komen binnen' },
  { from: 0.6, id: 'tegels', label: 'De tegels rond je worden gelegd' },
  { from: 0.9, id: 'bijna', label: 'Bijna klaar: de buurt wordt gladgestreken' },
];
const SNEL_STEP = { id: 'snel', label: 'De buurt wordt ingeladen' };
// The same principle as the boot bar (opdracht 21-11): the step counter of the load screen. The thresholds
// above are the weights (25%, 35%, 30%, 10% of the bar); the bar is only 1 when stepProgress says done.
export function loadStepNr(bar, kind = 'travel') {
  if (kind === 'snel') return { nr: 1, total: 1 };
  const id = loadStepAt(bar, kind).id;
  return { nr: LOAD_STEPS.findIndex((s) => s.id === id) + 1, total: LOAD_STEPS.length };
}
// One smooth bar (opdracht 21-11, owner): the shown value eases towards the target, never goes back, never passes 1 and
// moves at most MAX_STEP_PER_FRAME (1%) per frame of 16.7 ms, so a jump in the target (a step ends, a queue empties) is
// a calm slide and not a lurch. dtMs scales the limit for a slow frame (a hidden window, a heavy boot step).
export const MAX_STEP_PER_FRAME = 0.01;
export function easeBar(shown, target, dtMs = 16.7) {
  const s = clamp01(shown), t = clamp01(target);
  if (t <= s) return s;
  const frames = Math.max(0.2, Math.min(12, (Number.isFinite(dtMs) ? dtMs : 16.7) / 16.7));
  const step = Math.min((t - s) * 0.12 * frames, MAX_STEP_PER_FRAME * frames);
  return Math.min(t, s + Math.max(step, Math.min(t - s, 0.0004 * frames)));
}
export function loadStepAt(bar, kind = 'travel') {
  if (kind === 'snel') return SNEL_STEP;
  const p = Math.max(0, Math.min(1, Number.isFinite(bar) ? bar : 0));
  let step = LOAD_STEPS[0];
  for (const s of LOAD_STEPS) if (p >= s.from) step = s;
  return step;
}

// Who holds the world still for a load (the load screen, the travel scene). phone.js refreshPause recomputes
// world.uiPaused every frame from the dialogs it knows; without this the pause a load screen set lasted exactly one
// frame and the world (clock, traffic, police, the player's own input) ran on behind the screen. A named source per
// holder, so two holders never release each other. Pure: it only touches world.loadHolds.
export function setLoadHold(world, source, on) {
  if (!world || !source) return;
  const holds = world.loadHolds || (world.loadHolds = {});
  if (on) holds[source] = true; else delete holds[source];
}
export const loadHeld = (world) => !!(world && world.loadHolds && Object.keys(world.loadHolds).length);

// A second jump while the screen is already up (a respawn or a mission start right after fast travel, a save loaded
// twice): the wait starts again for the new place. The bar keeps what it showed (it never goes back); the calm
// counter and the three blind frames start over, so the screen cannot close on the old place's "nothing pending".
export const retargetProgress = (state) => ({ total: 0, shown: state && Number.isFinite(state.shown) ? state.shown : 0, calm: 0, frames: 0 });
