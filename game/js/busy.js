// The one "is the player busy" gate. Every module that asks "may this start
// now" or "does something else own the player" goes through playerBusy(w),
// instead of its own list of world.padelGame / sideJob / challenge flags.
//
// A reason is one way of being busy. A caller names the reasons that matter to
// it (the default is all of them), and gets { busy, why } with `why` the first
// reason that holds. The state that lives in other modules (the mission chain,
// cinematics, the activities register) is reached through probes those modules
// register at load, so this file imports nothing and has no import cycle.
//
// The activity contract (a register entry of activities.js: active(), quit(w),
// update(dt, w), ...) stays where it is; activities report in through the
// 'activity' probe and through world.activityGame / world.padelGame.

const probes = {};
export function registerBusyProbe(reason, fn) { probes[reason] = fn; }

const FLAGS = {
  sideJob: (w) => !!(w.sideJob && w.sideJob.active),
  challenge: (w) => !!w.challenge,
  race: (w) => !!w.race,
  padel: (w) => !!w.padelGame,
  activityGame: (w) => !!w.activityGame,
  heliRun: (w) => !!w.heliRun,
  pigeon: (w) => !!w.pigeonMode,
  train: (w) => !!w.trainDriving,
  respawn: (w) => !!w.pendingRespawn,
  missionPhase: (w) => !!(w.mission && w.mission.phase === 'active'),
  cinematic: () => !!(probes.cinematic && probes.cinematic()),
  mission: () => !!(probes.mission && probes.mission()),
  activity: () => !!(probes.activity && probes.activity()),
  activeRace: () => !!(probes.activeRace && probes.activeRace()),
};

export const BUSY_ALL = Object.keys(FLAGS);
// something plays on the spot and owns the screen: padel, an activity minigame, a heli run
export const BUSY_GAME = ['padel', 'activityGame', 'heliRun'];

export function playerBusy(w, reasons = BUSY_ALL) {
  for (const r of reasons) if (FLAGS[r](w)) return { busy: true, why: r };
  return { busy: false, why: null };
}

export const gameBusy = (w) => playerBusy(w, BUSY_GAME).busy;

// Een modus die de speler overneemt (de duif) beëindigt eerst wat er loopt: een minigame of wandeling
// houdt anders zijn HUD en timer aan onder de nieuwe modus (#241). activities.js meldt zijn quit hier aan.
const quitHooks = [];
export function registerQuitHook(fn) { if (typeof fn === 'function' && !quitHooks.includes(fn)) quitHooks.push(fn); }
export function quitRunningActivities(w) {
  for (const fn of quitHooks) { try { fn(w); } catch (e) { console.error('quit hook', e); } }
}
