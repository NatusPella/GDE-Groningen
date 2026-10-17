// The story arc as data: this file picks one of the two arcs per page load
// (storyflag.js) and holds what both share. 'oud' (storyarc_oud.js) is the
// released story "Alles voor één eierbal" in three parts, H1-H18; 'nieuw'
// (storyarc_nieuw.js) is the five-act story of docs/verhaal/nieuw, only
// played with the feature flag `nieuwverhaal`. Every module imports the arc
// from here, so the rest of the game never has to know which one is on.
// The field reference is the header of storyarc_oud.js.
//
// MISSION_IDS is shared and append-only: its indices are in the saves and
// medal records of both arcs. Missions of the new arc come after the old
// ones; missions.js only builds the defs the active arc uses.
import { nieuwVerhaal, ARC_ID } from './storyflag.js';
import * as OUD from './storyarc_oud.js';
import * as NIEUW from './storyarc_nieuw.js';

export { ARC_ID };

const A = nieuwVerhaal() ? NIEUW : OUD;

export const SPEAKERS = A.SPEAKERS;
export const CHARACTERS = A.CHARACTERS;
export const PARTS = A.PARTS;
export const STEPS = A.STEPS;
export const WHY = A.WHY;
export const CLUES = A.CLUES;
export const HIDEOUTS = OUD.HIDEOUTS;
export const MISSION_IDS = [...OUD.MISSION_IDS, ...NIEUW.NEW_MISSION_IDS];
// Steps the 0.22 script retired; migration 1 of savemigrate.js drops them from old saves, whatever the arc.
export const RETIRED_STEPS = OUD.RETIRED_STEPS;
// Old step id -> step of the active arc that stands for it (the old arc: itself).
export const STEP_ALIAS = nieuwVerhaal() ? NIEUW.STEP_ALIAS : {};

// "Deel 1" for the date cards.
export const partNumber = (part) => (PARTS[part] ? PARTS[part].title.split(':')[0] : '');

export const STEP_BY_ID = new Map(STEPS.map((s) => [s.id, s]));

export function stepAvailable(step) {
  return !!(step && step.built && PARTS[step.part] && PARTS[step.part].open);
}

export function missionIndexOf(id) {
  return MISSION_IDS.indexOf(id);
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

// The next step to play, or { end: part } where the built story stops.
export function nextStoryStep(doneId, missionPassed) {
  let lastPart = 'kop';
  for (let k = 0; k < STEPS.length; k++) {
    const s = STEPS[k];
    if (!stepAvailable(s)) return { end: lastPart, next: s };
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

// Worst case money over the whole arc (planned steps included): start money,
// every requirement bought at its price, every mission at its minimum
// payout, side jobs counted as zero. `low` is the lowest balance right
// before a purchase, `margin` how much was left over there.
export const START_MONEY = 250;

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

