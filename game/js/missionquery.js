// Leaf: read-only questions about the mission chain (is a mission running, what is the next one,
// which requirement is unmet ...) for the many modules that only need to ask. missions.js registers
// the real functions when it loads; before that, or without it, they answer as an empty chain does.
// This keeps shops, home, padel, sidejobs and the rest out of missions.js's import cycle (#108).
import { isNightAtHour } from './sunrules.js';

const impl = {};
export function registerMissionQueries(o) { Object.assign(impl, o); }

export const isMissionActive = () => (impl.isMissionActive ? impl.isMissionActive() : false);
export const getActiveRace = () => (impl.getActiveRace ? impl.getActiveRace() : null);
export const isMissionCompleted = (i) => (impl.isMissionCompleted ? impl.isMissionCompleted(i) : false);
export const getMissionDefs = () => (impl.getMissionDefs ? impl.getMissionDefs() : []);
export const getMissionProgress = () => (impl.getMissionProgress ? impl.getMissionProgress() : null);
export const missionIndexById = (id) => (impl.missionIndexById ? impl.missionIndexById(id) : -1);
export const getMissionList = () => (impl.getMissionList ? impl.getMissionList() : []);
export const payMedalBonus = (world, i, medal) => (impl.payMedalBonus ? impl.payMedalBonus(world, i, medal) : 0);
export const setNextMission = (world, i) => (impl.setNextMission ? impl.setNextMission(world, i) : false);
export const unmetRequirement = (w, def) => (impl.unmetRequirement ? impl.unmetRequirement(w, def) : null);
export const requirementMet = (w, key) => (impl.requirementMet ? impl.requirementMet(w, key) : true);
export const requirementPlace = (w, key) => (impl.requirementPlace ? impl.requirementPlace(w, key) : null);
export const activeStage = () => (impl.activeStage ? impl.activeStage() : null);

export function isNight(w) {
  const h = w.dayNight ? w.dayNight.hour : w.clock;
  return isNightAtHour(h);
}

// home.js says where home is (waiting for the dark happens there); missions.js asks.
let homePlace = null;
export function setHomePlace(fn) { homePlace = fn; }
export function getHomePlace() { return homePlace; }
