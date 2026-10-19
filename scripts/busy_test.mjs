// The one "player is busy" gate (game/js/busy.js): reasons, probes, groups,
// and that every old per-module flag list still maps to the same answer.
//   node scripts/busy_test.mjs
import { playerBusy, gameBusy, registerBusyProbe, registerQuitHook, quitRunningActivities, BUSY_ALL, BUSY_GAME } from '../game/js/busy.js';

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };

const w = () => ({});
check('idle world is free', !playerBusy(w()).busy && playerBusy(w()).why === null);
check('no probes: probe reasons are false', !playerBusy(w(), ['mission', 'cinematic', 'activity', 'activeRace']).busy);

const flags = [
  ['sideJob', { sideJob: { active: true } }], ['challenge', { challenge: { id: 'x' } }], ['race', { race: {} }],
  ['padel', { padelGame: {} }], ['activityGame', { activityGame: 'carbid' }], ['heliRun', { heliRun: {} }],
  ['pigeon', { pigeonMode: true }], ['train', { trainDriving: {} }], ['respawn', { pendingRespawn: true }],
];
for (const [why, o] of flags) {
  const r = playerBusy(o);
  check('flag ' + why, r.busy && r.why === why, JSON.stringify(r));
  check('flag ' + why + ' ignored when not asked', !playerBusy(o, BUSY_ALL.filter((x) => x !== why)).busy);
}
check('inactive sideJob is free', !playerBusy({ sideJob: { active: false } }).busy);

let m = false, c = false, a = false, r = false;
registerBusyProbe('mission', () => m);
registerBusyProbe('cinematic', () => c);
registerBusyProbe('activity', () => a);
registerBusyProbe('activeRace', () => r);
check('probes idle', !playerBusy(w()).busy);
m = true; check('mission probe', playerBusy(w()).why === 'mission');
m = false; c = true; check('cinematic probe', playerBusy(w()).why === 'cinematic');
c = false; a = true; check('activity probe', playerBusy(w()).why === 'activity');
a = false; r = true; check('activeRace probe', playerBusy(w()).why === 'activeRace');
r = false;

check('first matching reason wins', playerBusy({ padelGame: {}, challenge: {} }, ['challenge', 'padel']).why === 'challenge');
check('game group', BUSY_GAME.join() === 'padel,activityGame,heliRun');
check('gameBusy', gameBusy({ padelGame: {} }) && gameBusy({ activityGame: 'kermis' }) && gameBusy({ heliRun: {} }) && !gameBusy({ challenge: {}, sideJob: { active: true } }));

console.log(bad ? bad + ' failed' : 'busy_test ok');
process.exit(bad ? 1 : 0);// de duif beëindigt een lopende activiteit (#241)
{
  const gezien = [];
  registerQuitHook((x) => gezien.push(['a', x.tag]));
  registerQuitHook(() => { throw new Error('kapot'); });
  registerQuitHook((x) => gezien.push(['b', x.tag]));
  const origErr = console.error; console.error = () => {};
  quitRunningActivities({ tag: 'w' });
  console.error = origErr;
  check('quit-hooks draaien allemaal, ook na een fout', gezien.length === 2 && gezien[0][0] === 'a' && gezien[1][0] === 'b', JSON.stringify(gezien));
  const f = () => {}; registerQuitHook(f); registerQuitHook(f); registerQuitHook(null);
  gezien.length = 0; quitRunningActivities({ tag: 'x' });
  check('dezelfde hook telt een keer', gezien.length === 2);
}

