// The player's own goal ("Doel"): exactly one thing they picked themselves, a
// mission or klus, a minigame, a bijbaantje, a post-game challenge or just a
// place (a click on the map). routing.js puts it above the story guide; an
// active mission or bijbaantje still comes first. Once it is done or cleared
// the story guide takes over again and a card says so.
//
// A goal: { kind, id, name, sub, x, y }
//   kind 'place'      done when the player gets there (z: the height of a place on a bridge deck, so
//                     the route aims at the bridge and not at the street below it)
//   kind 'mission'    id = missions.js index; done when that mission is passed
//   kind 'play'       id = padel | carbid | kermis | drift | discgolf | pitchputt | skatepark | kartbaan | zwembad | klimtoren | waterski | vliegschool | heli | duif; done after one game
//   kind 'job'        id = sidejobs.js id; done when a shift of it ends
//   kind 'challenge'  id = postgame.js challenge id; done when it ends
// Saved in the savegame under `doel`; world.goal mirrors it for the HUD and maps.
import { STEP_BY_ID, missionIndexOf } from './storyarc.js';
import { setNextMission, getMissionDefs, unmetRequirement, requirementPlace, isMissionActive } from './missionquery.js';
import { hoofdspeler } from './players.js';

const REACH_M = 8;
const TARGET_EVERY = 2;
const KINDS = new Set(['place', 'mission', 'play', 'job', 'challenge']);

const BUSY = {
  play: {
    padel: (w) => !!w.padelGame,
    carbid: (w) => w.activityGame === 'carbid',
    kermis: (w) => w.activityGame === 'kermis',
    drift: (w) => !!w.driftRun,
    discgolf: (w) => w.activityGame === 'discgolf',
    pitchputt: (w) => w.activityGame === 'pitchputt',
    skatepark: (w) => w.activityGame === 'skatepark',
    kartbaan: (w) => w.activityGame === 'kartbaan',
    zwembad: (w) => w.activityGame === 'zwembad',
    klimtoren: (w) => w.activityGame === 'klimtoren',
    waterski: (w) => w.activityGame === 'waterski',
    vliegschool: (w) => w.activityGame === 'vliegschool',
    carillon: (w) => w.activityGame === 'carillon',
    pannenkoek: (w) => w.activityGame === 'pannenkoek',
    hengelen: (w) => w.activityGame === 'hengelen',
    heli: (w) => !!w.heliRun,
    duif: (w) => !!w.pigeonMode,
  },
  job: (w, id) => !!(w.sideJob && w.sideJob.active && w.sideJob.id === id),
  challenge: (w, id) => !!(w.challenge && w.challenge.id === id),
  mission: (w, id) => !!(w.mission && w.mission.phase === 'active' && w.mission.index === id),
};

let world = null;
let goal = null;
let run = null;
let target = null;
let targetT = 0;

export function initGoal(w) {
  world = w;
  w.goal = goal;
  window.__goal = { get: () => goal, set: (g) => setGoal(g), clear: () => clearGoal(), target: () => goalTarget(world) };
}

export function getGoal() {
  return goal;
}

// The goal's spot (any kind of goal), for the pin on the maps and in 3D (routing.js re-exports it).
export function getUserWaypoint() {
  const g = getGoal();
  return g ? { x: g.x, y: g.y, name: g.name } : null;
}

function stepLabel(step) {
  return step.kind === 'mission' ? `${step.id} · ${step.title}` : step.title;
}

// The story step that waits while a goal is set: { code, label } or null.
export function storyWaiting(w = world) {
  const g = w && w.storyGuide;
  const step = g && STEP_BY_ID.get(g.step);
  if (!step) return null;
  if (goal && goal.kind === 'mission' && step.kind === 'mission' && missionIndexOf(step.mission) === goal.id) return null;
  return { code: step.kind === 'mission' ? step.id : step.title, label: stepLabel(step) };
}

export function isGoal(kind, id) {
  return !!goal && goal.kind === kind && (id === undefined || goal.id === id);
}

export function setGoal(spec, { quiet = false } = {}) {
  if (!spec || !KINDS.has(spec.kind) || !Number.isFinite(spec.x) || !Number.isFinite(spec.y)) return false;
  goal = { kind: spec.kind, id: spec.id ?? null, name: String(spec.name || 'Doel'), sub: spec.sub ? String(spec.sub) : '', x: spec.x, y: spec.y, ...(Number.isFinite(spec.z) ? { z: spec.z } : {}) };
  run = null;
  target = null;
  targetT = 0;
  if (world) {
    world.goal = goal;
    if (goal.kind === 'mission' && !isMissionActive()) setNextMission(world, goal.id);
    if (!quiet) world.addMessage(`Doel: ${goal.name}`, 3, { kind: 'missie', key: 'goal' });
  }
  return true;
}

// done: the goal was reached or played; otherwise the player dropped it.
export function clearGoal({ quiet = false, done = false, title = '' } = {}) {
  if (!goal) return false;
  const was = goal;
  goal = null;
  run = null;
  target = null;
  if (!world) return true;
  world.goal = null;
  // hand the mission marker back to the story's mission
  const step = world.storyGuide && STEP_BY_ID.get(world.storyGuide.step);
  if (was.kind === 'mission' && step && step.kind === 'mission' && !isMissionActive()) setNextMission(world, missionIndexOf(step.mission));
  if (quiet) return true;
  const wait = storyWaiting(world);
  const back = wait ? `Terug naar het verhaal: ${wait.label}` : '';
  if (done && title) world.addMessage(back ? `${title}. ${back}` : title, 5, { kind: 'missie', key: 'goal' });
  else if (back) world.addMessage(back, 4.5, { kind: 'missie', key: 'goal' });
  else world.addMessage('Doel gewist', 2.5, { kind: 'missie', key: 'goal' });
  return true;
}

function busy(w) {
  const b = BUSY[goal.kind];
  if (!b) return false;
  if (goal.kind === 'play') return !!(b[goal.id] && b[goal.id](w));
  return b(w, goal.id);
}

// Where the route goes: the goal itself, or for a mission that still needs
// gear, the nearest place that sells it first.
export function goalTarget(w = world) {
  if (!goal || !w) return null;
  if (goal.kind !== 'mission') return { x: goal.x, y: goal.y, name: goal.name, z: goal.z };
  const now = w.time || 0;
  if (!target || now - targetT > TARGET_EVERY || now < targetT) {
    targetT = now;
    const def = getMissionDefs()[goal.id];
    const gate = def ? unmetRequirement(w, def) : null;
    const place = gate ? requirementPlace(w, gate) : null;
    target = place ? { x: place.x, y: place.y, name: `Eerst: ${place.name}`, gate } : { x: goal.x, y: goal.y, name: goal.name };
  }
  return target;
}

export function updateGoal(dt, w) {
  world = w;
  if (w.goal !== goal) w.goal = goal;
  if (!goal) return;
  const p = hoofdspeler(w);
  if (goal.kind === 'place') {
    if (Math.hypot(goal.x - p.x, goal.y - p.y) < REACH_M) clearGoal({ done: true, title: 'Doel bereikt' });
    return;
  }
  const now = busy(w);
  if (now && !run) run = { done0: w.stats.missionsDone };
  else if (!now && run) {
    const ok = goal.kind !== 'mission' || w.stats.missionsDone > run.done0;
    run = null;
    if (ok) { clearGoal({ done: true, title: `Doel gehaald: ${goal.name}` }); return; }
  }
  // the chosen mission keeps the marker (story.js leaves it alone meanwhile)
  if (goal.kind === 'mission' && !isMissionActive() && w.mission && w.mission.index !== goal.id) setNextMission(w, goal.id);
}

// Map rule: a mission marker shows only while it runs, when it is the story's
// current step, or when the player chose it as their goal.
export function missionOnMap(w) {
  const m = w.mission;
  if (!m || !m.marker || m.phase === 'cooldown') return false;
  if (m.phase === 'active') return true;
  if (goal && goal.kind === 'mission' && goal.id === m.index) return true;
  const step = w.storyGuide && STEP_BY_ID.get(w.storyGuide.step);
  return !!(step && step.kind === 'mission' && missionIndexOf(step.mission) === m.index);
}

export function getGoalSave() {
  return goal ? { ...goal } : null;
}

export function applyGoalSave(d) {
  goal = null;
  run = null;
  target = null;
  if (world) world.goal = null;
  if (d && typeof d === 'object') setGoal(d, { quiet: true });
}
