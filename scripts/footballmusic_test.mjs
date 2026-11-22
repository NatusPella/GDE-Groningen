// Voetbalmuziek (22-11): de fasekeuze is puur. Per wedstrijdfase de juiste track, de terugval als een bestand ontbreekt (ook met een lege lijst),
// instellingen aan/uit en volume, de demping bij een doelpunt, en map en lijst gelijk.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import {
  FOOTBALL_TRACKS, FOOTBALL_KEYS, FOOTBALL_AVAILABLE, pickAvailable, footballMusicOn, footballMusicVolume, isFinalPhase,
  ownTeamOf, outcomeFor, matchPhaseKey, footballDucking, footballMusicKey, DUCK_GOAL, DUCK_WHISTLE,
} from '../game/js/footballmusic.js';
import { ACTIVITY_KEYS, activityMusicKey } from '../game/js/scenariomusic.js';

const dir = new URL('../game/audio/voetbal/', import.meta.url);
const ALLES = FOOTBALL_KEYS.slice();
const sim = (o = {}) => ({ fase: 'spel', helft: 1, klok: 200, duurHelft: 240, score: [0, 0], mensen: [{ slot: 0, team: 0 }], mijnSlot: 0, ...o });
const wereld = (s, extra = {}) => ({ voetbalGame: { sim: s }, ...extra });

// de set: minstens 5 volledige nummers en 2 stings, alle ACTIVITY_KEYS van de director
assert.ok(FOOTBALL_KEYS.filter((k) => !FOOTBALL_TRACKS[k].oneShot).length >= 5, 'minstens 5 volledige nummers');
assert.ok(FOOTBALL_KEYS.filter((k) => FOOTBALL_TRACKS[k].oneShot).length >= 2, 'minstens 2 stings');
for (const k of FOOTBALL_KEYS) assert.ok(ACTIVITY_KEYS.includes(k), k + ' zit in ACTIVITY_KEYS');
// map en lijst gelijk
for (const k of FOOTBALL_KEYS) assert.equal(existsSync(new URL(FOOTBALL_TRACKS[k].file, dir)), FOOTBALL_AVAILABLE.includes(k), k + ': lijst en map moeten gelijk zijn (FOOTBALL_AVAILABLE)');
assert.ok(FOOTBALL_AVAILABLE.every((k) => FOOTBALL_KEYS.includes(k)));

// de fase wijst de track aan
assert.equal(matchPhaseKey(sim({ fase: 'intro' })), 'voetbal_opkomst');
for (const f of ['aftrap', 'spel', 'hervat']) assert.equal(matchPhaseKey(sim({ fase: f })), 'voetbal_rustig');
assert.equal(matchPhaseKey(sim({ fase: 'goal' })), 'voetbal_sting_goal');
assert.equal(matchPhaseKey(sim({ fase: 'rust' })), 'voetbal_club');
assert.equal(matchPhaseKey(sim({ fase: 'eind', score: [2, 1] })), 'voetbal_sting_winst');
assert.equal(matchPhaseKey(sim({ fase: 'eind', score: [1, 2] })), 'voetbal_troost');
assert.equal(matchPhaseKey(sim({ fase: 'klaar', score: [1, 1] })), 'voetbal_troost');
assert.equal(matchPhaseKey(null), null);

// de slotfase: alleen in de tweede helft
assert.equal(isFinalPhase(sim({ helft: 1, klok: 10 })), false);
assert.equal(isFinalPhase(sim({ helft: 2, klok: 200 })), false);
assert.equal(isFinalPhase(sim({ helft: 2, klok: 50 })), true, 'laatste kwart');
assert.equal(isFinalPhase(sim({ helft: 2, klok: 100, score: [1, 1] })), true, 'laatste helft, nek aan nek');
assert.equal(isFinalPhase(sim({ helft: 2, klok: 100, score: [4, 0] })), false, 'laatste helft maar beslist');
assert.equal(matchPhaseKey(sim({ helft: 2, klok: 30 })), 'voetbal_tempo');

// derby (#1114) en gast: de uitkomst volgt het eigen team en de eigen slot
const derby = sim({ fase: 'eind', score: [0, 3], mensen: [{ slot: 0, team: 1 }] });
assert.equal(ownTeamOf(derby), 1);
assert.equal(outcomeFor(derby), 'winst');
const gast = sim({ fase: 'eind', score: [3, 0], mijnSlot: 2, mensen: [{ slot: 0, team: 0 }, { slot: 2, team: 1 }] });
assert.equal(outcomeFor(gast), 'verlies');

// terugval
assert.equal(pickAvailable('voetbal_tempo', ALLES), 'voetbal_tempo');
assert.equal(pickAvailable('voetbal_tempo', ['voetbal_rustig']), 'voetbal_rustig');
assert.equal(pickAvailable('voetbal_sting_goal', ['voetbal_rustig']), 'voetbal_rustig', 'zonder sting speelt de lus door');
assert.equal(pickAvailable('voetbal_sting_winst', ['voetbal_club']), 'voetbal_club');
assert.equal(pickAvailable('voetbal_tempo', []), null);
assert.equal(pickAvailable(null, ALLES), null);

// de hoofdvraag: met alles, met een lege lijst (veilig terugvallen op de radio), uit, penalty, training, clubscherm
const s = { footballMusic: true };
assert.equal(footballMusicKey(wereld(sim({ fase: 'intro' })), s, { list: ALLES }), 'voetbal_opkomst');
assert.equal(footballMusicKey(wereld(sim()), s, { list: [] }), null, 'lege lijst: geen muziek, geen fout');
assert.equal(footballMusicKey(wereld(sim()), { footballMusic: false }, { list: ALLES }), null, 'uitgezet in Instellingen');
assert.equal(footballMusicKey({ activityGame: 'penalty' }, s, { list: ALLES }), 'voetbal_rustig');
assert.equal(footballMusicKey({ activityGame: 'voetbaltraining' }, s, { list: ALLES }), 'voetbal_rustig');
assert.equal(footballMusicKey({}, s, { clubScreen: true, list: ALLES }), 'voetbal_ambient');
assert.equal(footballMusicKey({}, s, { list: ALLES }), null, 'buiten het voetbal niets');
assert.equal(footballMusicKey(null, s, { list: ALLES }), null);
// zonder bestanden (de standaardlijst) is het hele pad veilig
assert.doesNotThrow(() => activityMusicKey(wereld(sim()), s));
if (!FOOTBALL_AVAILABLE.length) assert.equal(activityMusicKey(wereld(sim()), s), null);

// instellingen
assert.equal(footballMusicOn(undefined), true);
assert.equal(footballMusicOn({}), true);
assert.equal(footballMusicOn({ footballMusic: false }), false);
assert.equal(footballMusicVolume({}), 0.8);
assert.equal(footballMusicVolume({ footballMusicVolume: 0.3 }), 0.3);
assert.equal(footballMusicVolume({ footballMusicVolume: 7 }), 1);
assert.equal(footballMusicVolume({ footballMusicVolume: 'x' }), 0.8);

// de demping: doelpunt en fluit, anders niets
assert.equal(footballDucking(wereld(sim({ fase: 'goal' }))), DUCK_GOAL);
assert.equal(footballDucking(wereld(sim({ fase: 'hervat', hervat: { t: 0.2, pauze: 1.5 } }))), DUCK_WHISTLE);
assert.equal(footballDucking(wereld(sim({ fase: 'hervat', hervat: { t: 2, pauze: 1.5 } }))), 1);
assert.equal(footballDucking(wereld(sim({ fase: 'spel' }))), 1);
assert.equal(footballDucking({}), 1);

console.log('footballmusic_test ok: ' + FOOTBALL_KEYS.length + ' sleutels, ' + FOOTBALL_AVAILABLE.length + ' beschikbaar');
