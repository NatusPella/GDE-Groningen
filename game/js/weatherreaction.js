import { hoofdspeler } from './players.js';
import { pickTalkers, lineTime } from './straatpraat.js';
// Passers-by react when the weather turns (sprint 22-11, a living world): the first drops, a clap of thunder,
// the sun that breaks through, fog rolling in. One or two walkers within earshot say a short line in a bubble
// a few seconds after the change (so the sky has visibly changed first). Text only, no voice; decor per
// player: a guest follows the host's weather (coopweer.js) and sees the reaction to his own sky.
// The classes and the choice of lines are pure (below); tickWeatherReaction hangs on regiolevenrt.js.

export const REACT_DELAY_MIN = 3, REACT_DELAY_MAX = 8;   // s between the change and the first bubble
export const REACT_COOLDOWN = 75;                         // s before the next reaction: no chatter on every flicker
export const SUN_FROM = 8, SUN_TO = 20;                   // the sun breaks through only in daylight

// Lines per transition. Dutch, light, Gronings in small doses; always summer, no real brands or people.
export const REACTION_LINES = {
  regen: [
    'Daar komt het! Wie heeft er een paraplu?',
    'Het begint te regenen. Dat was te verwachten.',
    'Kiek, de eerste druppels. Ik had het gezegd.',
    'Snel, onder de luifel!',
    'Nou ja, de planten hebben ook dorst.',
    'Mien paraplu zit natuurlijk thuis.',
    'Grunn doet zijn plicht: het regent.',
    'Net droog gewassen, die fiets. Bedankt, hoor.',
  ],
  onweer: [
    'Wat een knal! Dat was dichtbij.',
    'Onweer! Alles naar binnen.',
    'Ik tel de seconden na de bliksem. Ik ben snel bij nul.',
    'Hoor dat grommen boven de stad.',
    'Hou je fiets vast, het wordt wat.',
    'Zomeronweer. Morgen is het weer prachtig.',
  ],
  opklaren: [
    'Zie je wel, de zon komt terug!',
    'Kiek, een stukje blauw!',
    'Grunn kan nooit kiezen, hè.',
    'Dat was kort. Ik ben nog niet eens nat.',
    'Terras weer open, denk ik.',
    'Paraplu weg, zonnebril op.',
  ],
  mist: [
    'Ik zie mijn eigen fiets niet meer.',
    'Mist! Rustig fietsen, hè.',
    'Net soep, maar dan zonder zout.',
    'Waar is de toren gebleven?',
    'Zo stil ineens, joh.',
  ],
};

// weatherstate.js kinds (and the in-game 'storm') to a class
export function weatherClass(kind) {
  if (kind === 'motregen' || kind === 'regenbui') return 'regen';
  if (kind === 'onweer' || kind === 'storm') return 'onweer';
  if (kind === 'mist') return 'mist';
  if (kind === 'helder') return 'zon';
  return 'droog';
}

// The reaction to a change from one class to another (or null): rain or thunder starting, fog rolling in,
// the sky clearing after rain or thunder or fog in daylight. Dry to sunny and back is no news.
export function reactionKey(from, to, hour = 12) {
  if (!from || !to || from === to) return null;
  if (to === 'regen' || to === 'onweer') return to === 'regen' && from === 'onweer' ? null : to;
  if (to === 'mist') return 'mist';
  if (to === 'zon' && (from === 'regen' || from === 'onweer' || from === 'mist')) {
    const h = ((hour % 24) + 24) % 24;
    return h >= SUN_FROM && h < SUN_TO ? 'opklaren' : null;
  }
  return null;
}

// n different lines for a reaction, none from `recent` while there is choice. rng() in [0, 1).
export function pickReactionLines(key, n = 1, recent = [], rng = Math.random) {
  const all = REACTION_LINES[key];
  if (!all) return [];
  const out = [];
  for (let i = 0; i < n && out.length < all.length; i++) {
    const left = all.filter((t) => !out.includes(t));
    const fresh = left.filter((t) => !recent.includes(t));
    const pool = fresh.length ? fresh : left;
    out.push(pool[Math.floor(rng() * pool.length) % pool.length]);
  }
  return out;
}

// --- in the game ----------------------------------------------------------------------------------

const st = { prev: null, pending: null, cooldown: 0, recent: [] };
export function weatherReactionState() { return { prev: st.prev, pending: st.pending && { ...st.pending }, cooldown: st.cooldown, recent: st.recent.slice() }; }
export function resetWeatherReaction() { st.prev = null; st.pending = null; st.cooldown = 0; st.recent.length = 0; }

// One tick. The first call only notes the sky (no reaction to the weather a save loads into); the caller
// stays quiet during missions' cutscenes and minigames (playerBusy), like straatpraat.
export function tickWeatherReaction(dt, w, rng = Math.random) {
  if (!w || !hoofdspeler(w)) return;
  const cls = weatherClass(w.weather && w.weather.kind);
  const hour = Number.isFinite(w.clock) ? w.clock : 12;
  if (st.cooldown > 0) st.cooldown -= dt;
  if (st.prev === null) { st.prev = cls; return; }
  if (cls !== st.prev) {
    const key = reactionKey(st.prev, cls, hour);
    st.prev = cls;
    // a change of sky always replaces a reaction that is still waiting: the old one is stale
    st.pending = key && st.cooldown <= 0 ? { key, wait: REACT_DELAY_MIN + rng() * (REACT_DELAY_MAX - REACT_DELAY_MIN) } : null;
  }
  if (!st.pending) return;
  if ((st.pending.wait -= dt) > 0) return;
  const p = hoofdspeler(w);
  const talkers = pickTalkers(w.pedestrians || [], p.x, p.y, w.time, true, rng);
  if (!talkers) { if ((st.pending.giveUp = (st.pending.giveUp || 0) + 1) > 6) st.pending = null; else st.pending.wait = 2; return; }
  const lines = pickReactionLines(st.pending.key, talkers.length, st.recent, rng);
  lines.forEach((text, i) => {
    const ped = talkers[i];
    ped.speechText = text;
    ped.speechUntil = w.time + lineTime(text) + i * 0.8;
    st.recent.push(text);
  });
  while (st.recent.length > 6) st.recent.shift();
  st.pending = null;
  st.cooldown = REACT_COOLDOWN;
}
