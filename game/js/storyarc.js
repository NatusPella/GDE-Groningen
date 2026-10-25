// The story arc as data: the five-act story of docs/verhaal/nieuw (storyarc_nieuw.js, field reference in its
// header), plus what older saves still need from the first version (storyarc_basis.js). Every module
// imports the arc from here.
//
// MISSION_IDS is append-only: its indices are in the saves and medal records. The ids of the first
// version come first (storyarc_basis.js), the missions of the current story come after them.
import * as NIEUW from './storyarc_nieuw.js';
import { MISSION_IDS as BASIS_MISSION_IDS, RETIRED_STEPS as BASIS_RETIRED_STEPS } from './storyarc_basis.js';
import { START_MONEY } from './economy.js';

// kept for the modules that ask which story a save or a handshake belongs to (there is only one now)
export const ARC_ID = 'nieuw';

export const SPEAKERS = NIEUW.SPEAKERS;
export const CHARACTERS = NIEUW.CHARACTERS;
export const PARTS = NIEUW.PARTS;
export const STEPS = NIEUW.STEPS;
export const WHY = NIEUW.WHY;
export const CLUES = NIEUW.CLUES;
export const MISSION_IDS = [...BASIS_MISSION_IDS, ...NIEUW.NEW_MISSION_IDS];
// Steps the 0.22 script retired; migration 1 of savemigrate.js drops them from old saves.
export const RETIRED_STEPS = BASIS_RETIRED_STEPS;
export const STEP_ALIAS = NIEUW.STEP_ALIAS;

// "Deel 1" for the date cards.
export const partNumber = (part) => (PARTS[part] ? PARTS[part].title.split(':')[0] : '');

export const STEP_BY_ID = new Map(STEPS.map((s) => [s.id, s]));

export function stepAvailable(step) {
  return !!(step && step.built && PARTS[step.part] && PARTS[step.part].open);
}

// A def id ('pinautomaat') or the id of a mission step of the arc ('M02'): the hooks (cutscene preview, spelbot)
// know the steps by their story code, the saves by the def id.
export function missionIndexOf(id) {
  const i = MISSION_IDS.indexOf(id);
  if (i >= 0) return i;
  const step = STEP_BY_ID.get(id);
  return step && step.kind === 'mission' && step.mission ? MISSION_IDS.indexOf(step.mission) : -1;
}

// Is step k done? Finished or skipped (doneId), a mission the chain counts as
// passed, or an activity that a later, passed mission has made moot (old
// saves, missions played ahead). Shared by story.js and the save migration test.
export function stepDone(k, doneId, missionPassed) {
  const passed = (s) => doneId(s.id) || (s.kind === 'mission' && missionIndexOf(s.mission) >= 0 && missionPassed(missionIndexOf(s.mission)));
  const step = STEPS[k];
  if (doneId(step.id)) return true;
  if (step.kind === 'mission') return passed(step);
  for (let j = k + 1; j < STEPS.length; j++) if (STEPS[j].kind === 'mission' && passed(STEPS[j])) return true;
  return false;
}

// The part that follows the finale (Deel 4): it carries `after`, the part whose end card has to play first.
export const FINALE_PART = 'ontzet';
// Is step s the first of a part that follows a finale (storyarc_nieuw.js PARTS.*.after)?
const isContinuation = (s, lastPart) => s.part !== lastPart && !!PARTS[s.part] && !!PARTS[s.part].after;

// The next step to play, or { end: part } where the built story stops. A continuation (Deel 4) waits for the
// end card of the part it follows: cardSeen(part) tells whether that card has played; without it (a save
// summary, the calendar of an old save) the continuation counts as open.
export function nextStoryStep(doneId, missionPassed, cardSeen) {
  let lastPart = 'kop';
  for (let k = 0; k < STEPS.length; k++) {
    const s = STEPS[k];
    if (cardSeen && isContinuation(s, lastPart) && !cardSeen(PARTS[s.part].after) && !stepDone(k, doneId, missionPassed)) return { end: PARTS[s.part].after, next: null, finale: true };
    // a step that is not built blocks the story, unless the save has it done (a dev jump, or the acts built side by side)
    if (!stepAvailable(s) && !stepDone(k, doneId, missionPassed)) return { end: lastPart, next: s };
    lastPart = s.part;
    if (!stepDone(k, doneId, missionPassed)) return s;
  }
  return { end: lastPart, next: null, finale: true };
}

// Mission indices in story order (built or not), for "has the story got
// this far" checks in the mission dialogue.
export const MISSION_STORY_ORDER = STEPS.filter((s) => s.kind === 'mission' && s.mission).map((s) => missionIndexOf(s.mission)).filter((i) => i >= 0);

// Story code ('H3') for a mission index, or null for missions outside the arc.
export function missionCode(i) {
  const s = STEPS.find((q) => q.kind === 'mission' && missionIndexOf(q.mission) === i);
  return s ? s.id : null;
}

// Loopbanen (#431): the story step where each loopbaan (loopbaan.js VAKKEN) turns up, in story order.
// This is a pointer, not a lock: the player may start a loopbaan earlier on their own, from its own startplek
// or the Loopbaan menu, and then the step counts as done (stapAfgeleidGedaan below, with loopbaan.js loopbanenGestart).
// A vak can be named at more than one step; loopbaanStap gives the first, loopbanenTot everything up to a step.
export const LOOPBAAN_STAPPEN = STEPS
  .filter((s) => Array.isArray(s.loopbanen) && s.loopbanen.length)
  .map((s) => ({ stap: s.id, deel: s.part, titel: s.title, loopbanen: [...s.loopbanen] }));
export function loopbanenBijStap(stapId) {
  const r = LOOPBAAN_STAPPEN.find((q) => q.stap === stapId);
  return r ? [...r.loopbanen] : [];
}
// A step that names loopbanen is done once every one of them has begun (#431): the player may start a loopbaan
// earlier on their own (its own startplek or the Loopbaan menu), and the story then passes the step. The step keeps
// its place: nothing is reordered; gestart(vak) answers whether that loopbaan has begun.
// The step the player is on (huidige) is never made done this way: a loopbaan that begins while they are on it (the
// trip or the mission itself) does not pull the step out from under them; that step finishes through its own goal.
// Een stap met loopbanen (#431): afgeleid uit wat de speler al begon. Puur een poort, er gaat geen geld doorheen.
export function stapAfgeleidGedaan(step, gestart, huidige = null) {
  if (!step || !Array.isArray(step.loopbanen) || !step.loopbanen.length) return false;
  if (huidige && step.id === huidige) return false;
  return typeof gestart === 'function' && step.loopbanen.every(gestart);
}
export function loopbaanStap(vak) {
  const r = LOOPBAAN_STAPPEN.find((q) => q.loopbanen.includes(vak));
  return r ? r.stap : null;
}
// Everything released up to and including this step (an unknown step: everything).
export function loopbanenTot(stapId) {
  const out = [];
  for (const r of LOOPBAAN_STAPPEN) {
    out.push(...r.loopbanen);
    if (r.stap === stapId) break;
  }
  return [...new Set(out)];
}

// The start budget lives in economy.js; re-exported for modules that ask the arc.
export { START_MONEY };

// Worst case money over the whole arc (planned steps included): start money,
// every requirement bought at its price, every mission at its minimum
// payout, side jobs counted as zero. `low` is the lowest balance right
// before a purchase, `margin` how much was left over there.
// payShare < 1 models a player who skips every mission (story.js pays that
// share) and buys only what is required.
export function computeMoneyTimeline(start = START_MONEY, payShare = 1) {
  let money = start;
  let low = Infinity;
  const rows = [];
  for (const s of STEPS) {
    const before = money;
    const cost = payShare < 1 && s.optional ? 0 : s.cost || 0;
    if (cost) low = Math.min(low, before - cost);
    const pay = s.kind === 'mission' ? Math.round((payShare < 1 ? (s.reward ?? 0) * payShare : (s.minReward ?? s.reward ?? 0))) : 0;
    money = before - cost + pay;
    rows.push({ id: s.id, part: s.part, title: s.title, built: stepAvailable(s), before, cost, pay, after: money, margin: cost ? before - cost : null });
  }
  return { rows, end: money, low };
}

