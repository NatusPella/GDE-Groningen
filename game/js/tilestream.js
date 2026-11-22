// How tiles are asked for and worked in, without a burst on the main thread (#1052).
// Pure: no three.js, no DOM, no timers of its own (the caller passes nextFrame and now),
// so scripts/tilestream_test.mjs checks every rule without a browser.
//
// Why: the placement windows (tileplace.js withTiles: facilities, shops, padel, villages,
// kits, the cow game) ask for tiles all over the province, at the top priority, and then ran
// the shared FrameQueue to the end in one go (run(1e9)): 2 to 6 s on the main thread in the
// first minute, in the middle of the opening scenes. Now:
//  - a background window asks with BACKGROUND_PRIORITY (after everything the prefetch wants
//    round the player) and works its tiles in BG_SLICE_MS a frame;
//  - the rows of a tile that comes in are worked nearest first (addPriority), so the
//    street the player looks at is built before a far field;
//  - an urgent window (a teleport the player just chose) keeps the old, synchronous way.

// the priority a background window asks with: the prefetch score is a distance in metres (0 to ~2500)
export const BACKGROUND_PRIORITY = 5000;
// ms of tile work per frame for a background window, on top of what follow() already spends
export const BG_SLICE_MS = 3;
// De rijen van een achtergrondvenster zijn een druppel, geen stroom (perf-regressie 22-11, docs/PERF-REGRESSIE-22-11.md): na de openingsfilm
// stond een rij van ca. 260 tegels te wachten en die kostte de eerste speelminuten haperingen van 50 tot 100 ms. De pomp geeft zo'n
// venster hoogstens BG_PUMP_MS per frame (een stuk van ROW_CHUNK_MS), follow() hoogstens BG_FOLLOW_MS, en de kruispuntversie van
// zulke tegels wordt gebundeld (BG_JUNCTION_FLUSH_MS): het model herbouwt dan niet bij elke tegel over alle tegels heen.
export const BG_PUMP_MS = 0.6;
export const BG_FOLLOW_MS = 0.3;
export const BG_JUNCTION_FLUSH_MS = 1500;
// een achtergrondtegel verder dan dit (m) van de speler of camera verhoogt geoVer en greenVer niet (de caches kijken daar niet)
export const BG_GEO_M = 3000;
// een achtergrondtegel waar de speler binnen deze afstand (m) heen komt, gaat naar de gewone wachtrij
export const BG_PROMOTE_M = 700;
// a background window that is still waiting after this long works the rest in bigger pieces (never hangs)
export const BG_DRAIN_MAX_MS = 120000;
// a jump that waits for its ring: gives up after this long, the stream carries on
export const JUMP_BUDGET_MS = 1500;
// the tiles round the target a jump waits for, in m
export const JUMP_RING_M = 1000;

// The FrameQueue priority of the rows of a tile that came in with store priority `p`:
// drops are 0, adds are in [1, 1.9]. -1000 (a registered shot) is first, a distance next,
// BACKGROUND_PRIORITY last. A tile's later chunks keep the priority of its first.
export function addPriority(p) {
  const v = Number.isFinite(p) ? p : 0;
  return 1 + Math.min(0.9, Math.max(0, (v + 1000) / 1e5));
}

// The slice a window works its tiles in: 0 = all at once (an urgent window); a caller that
// chose its own slice (the title screen's placements, 6 ms) keeps it; no slice = BG_SLICE_MS.
export function sliceFor({ urgent = false, slice = 0 } = {}) {
  if (urgent) return 0;
  return slice > 0 ? slice : BG_SLICE_MS;
}

// While a film or the benchmark plays, background windows hold their work (counted: nested holds).
// The tiles they asked for still load in the workers; only the main-thread rows wait.
let holds = 0;
export function holdBackground(on) { holds = Math.max(0, holds + (on ? 1 : -1)); }
// the game also says "a film or cutscene plays" with a probe (main.js), so no module has to count it
let probe = null;
export function setHoldProbe(fn) { probe = typeof fn === 'function' ? fn : null; }
export function backgroundHeld() {
  if (holds > 0) return true;
  try { return !!(probe && probe()); } catch (e) { return false; }
}
// a hold never lasts longer than this for one window (a film that never ends does not block placement for ever)
export const BG_HOLD_MAX_MS = 180000;

// Two FrameQueues as one for drainSliced: the first (the stream's) is worked first, what is left
// of the slice goes to the second (the background rows). `second` may be null.
export function joinQueues(first, second, now = () => Date.now()) {
  return {
    get items() { return { length: first.items.length + (second ? second.items.length : 0) }; },
    run(ms) {
      const t0 = now();
      let n = first.run(ms, now);
      const left = ms - (now() - t0);
      if (second && second.items.length && left > 0) n += second.run(left, now);
      return n;
    },
  };
}

// Works `queue` (a FrameQueue) `sliceMs` per call, one call per frame, until the queue is empty or
// `until()` (the window's own tiles are in) is true, and resolves with how many frames it took. Never in one go: a window that
// has waited maxMs on a queue that keeps filling (the player drives on) takes bigger slices
// (3x), no more. While hold() is true nothing is worked (the time held does not count).
export async function drainSliced(queue, { sliceMs = BG_SLICE_MS, nextFrame, now = () => Date.now(), maxMs = BG_DRAIN_MAX_MS, until = null, hold = null } = {}) {
  const done = () => !queue.items.length || !!(until && until());
  let spent = 0, held = 0, last = now(), frames = 0;
  while (!done()) {
    const t = now();
    const held_ = hold && held < BG_HOLD_MAX_MS && hold();
    if (held_) held += t - last; else spent += t - last;
    last = t;
    if (!held_) {
      queue.run(spent > maxMs ? sliceMs * 3 : sliceMs, now);
      frames++;
    }
    if (!done()) await nextFrame();
  }
  return frames;
}

// Resolves when every key of `keys` is in the store (store.missing(keys) is empty) or after
// budgetMs, whichever is first; true when they are all in. A tile that never comes does not
// hold the caller. `wait` is the caller's way to let a frame pass (a timer or a frame).
export async function whenReady(store, keys, { budgetMs = JUMP_BUDGET_MS, now = () => Date.now(), wait } = {}) {
  const t0 = now();
  for (;;) {
    if (!store || !store.missing(keys).length) return true;
    if (now() - t0 >= budgetMs) return false;
    await wait();
  }
}

// Is er nog tegelwerk in een van de twee wachtrijen van de kaart (de stroom en de achtergrondvensters, #1052)? Poorten die een
// cache pas bouwen als de tegels klaar zijn (straatmeubilair, verkeerslichten, voetgangersroutes, plekken) keken alleen naar de
// eerste wachtrij en bouwden bij elke achtergrondtegel opnieuw.
export function mapBusy(map) {
  if (!map) return false;
  return !!((map.tileQueue && map.tileQueue.items && map.tileQueue.items.length) || (map.bgQueue && map.bgQueue.items && map.bgQueue.items.length));
}
// Een rustpoort: true als de kaart niets meer te doen heeft, en anders hoogstens eens per maxWaitMs (zo wacht een poort nooit voor
// altijd op een stroom die niet ophoudt, en bouwt hij ook niet bij elke tegel).
export function createCalmGate(maxWaitMs = 2000) {
  let last = -Infinity;
  return (map, now = (typeof performance !== 'undefined' ? performance.now() : Date.now())) => {
    if (!mapBusy(map)) return true;
    if (now - last >= maxWaitMs) { last = now; return true; }
    return false;
  };
}

// Eén gedeelde pomp voor alle plaatsingsvensters (#1052, code-review): elk venster draaide zijn eigen drainSliced-lus, dus het
// budget gold per venster en niet per frame (vijf vensters = 15 ms per frame). Nu staan de vensters in één lijst en werkt de
// pomp per frame EEN keer de gedeelde wachtrij af: het budget is het grootste van de actieve vensters (een urgent venster
// 6 ms, een achtergrondvenster 3 ms), niet de som. Een venster is klaar als zijn eigen tegels erin zijn (until) of de wachtrij
// leeg is; een vastgehouden venster (hold) telt niet mee voor het budget en kost niets; na maxMs nemen de stukken 3x zo
// groot (nooit alles in een keer).
export function createDrainPump({ queue, nextFrame, now = () => Date.now(), grant = null, onSpend = null }) {
  const wins = new Set();
  let running = false;
  const stats = { frames: 0, maxBudget: 0, windowsMax: 0 };
  async function loop() {
    running = true;
    while (wins.size) {
      const t = now();
      let budget = 0, active = 0, urgent = false;
      for (const w of wins) {
        const done = !queue.items.length || !!(w.until && w.until());
        if (done) { wins.delete(w); w.resolve(w.frames); continue; }
        const elapsed = t - w.last; w.last = t;
        const held = w.hold && w.held < BG_HOLD_MAX_MS && w.hold();
        if (held) { w.held += elapsed; continue; }
        w.spent += elapsed;
        active++;
        if (w.urgent) urgent = true;
        budget = Math.max(budget, w.spent > w.maxMs ? w.sliceMs * 3 : w.sliceMs);
        w.frames++;
      }
      if (budget > 0) {
        const g = grant ? grant(budget, wins, urgent) : budget;
        const t1 = now();
        queue.run(g, now);
        if (onSpend) onSpend(now() - t1, budget, urgent);
        stats.maxBudget = Math.max(stats.maxBudget, g);
      }
      stats.frames++; stats.windowsMax = Math.max(stats.windowsMax, active);
      if (wins.size) await nextFrame();
    }
    running = false;
  }
  return {
    // geeft een belofte die het aantal frames oplevert waarin dit venster werd bediend
    add({ sliceMs = BG_SLICE_MS, until = null, hold = null, maxMs = BG_DRAIN_MAX_MS, urgent = false } = {}) {
      return new Promise((resolve) => {
        wins.add({ sliceMs, until, hold, maxMs, urgent, resolve, frames: 0, spent: 0, held: 0, last: now() });
        if (!running) loop();
      });
    },
    get size() { return wins.size; },
    stats,
  };
}
