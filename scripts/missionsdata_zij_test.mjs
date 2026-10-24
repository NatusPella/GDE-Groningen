// De losse zijmissie van #400 (game/js/missionsdata_zij.js): een korte missie met drie stappen bij de snackbar
// in de Herenstraat. Pure data, geen wereld: een nep-kaart zonder straten en een walk() die het punt teruggeeft.
// Draai: node scripts/missionsdata_zij_test.mjs
import { buildZijDefs, snackbarSpots, ZIJ_DEFS } from '../game/js/missionsdata_zij.js';
import { isCheckpointStage } from '../game/js/missioncheckpoint.js';

let n = 0, bad = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${m}${info ? ` (${info})` : ''}`); } };

const spot = (x, y) => ({ x, y, road: null });
const defs = buildZijDefs({ map: {}, walk: spot });
ok(defs.length === ZIJ_DEFS.length && defs.length === 1, 'one loose side mission', `${defs.length}/${ZIJ_DEFS.length}`);
const d = defs[0];

// de def zelf: een eigen id, naast het verhaal, en een beloning
ok(d.mid === ZIJ_DEFS[0] && d.mid === 'snackbaroverlast', 'the def carries its own id');
ok(d.side === true, 'marked as a side mission (missions.js lists it outside the arc)');
ok(d.type === 'stages', 'a stages mission');
ok(typeof d.label === 'string' && d.label.length > 3, 'a label', d.label);
ok(Number.isFinite(d.reward) && d.reward > 0, 'a reward', String(d.reward));
ok(Number.isFinite(d.start.x) && Number.isFinite(d.start.y), 'a start');
ok(Array.isArray(d.intro) && d.intro.length === 2 && d.intro.every((t) => t.length > 40), 'an intro of two lines');
ok(typeof d.outro === 'string' && d.outro.length > 20, 'an outro');
ok(typeof d.say === 'string' && d.say.length > 20, 'a hint at the start');
ok(typeof d.timeUp === 'string' && d.timeUp.length > 20, 'a reason when the clock runs out');
ok(Array.isArray(d.costRow) && d.costRow.length === 2, 'what the mission leaves you with, on the success card');
ok(d.onFoot === true, 'on foot');

// de drie stappen: constateren, muziek aanzetten, wegjagen, elk met een duidelijke hint
const kinds = d.stages.map((s) => s.kind);
ok(kinds.join() === 'goto,hold,hold', 'three steps: look, music on, wait them out', kinds.join());
ok(d.stages.every((s) => typeof s.label === 'string' && s.label.length > 8), 'every step says its goal in the HUD');
ok(d.stages.every((s) => typeof s.say === 'string' && s.say.length > 20), 'every step has a clear hint');
ok(d.stages.every((s) => s.target && Number.isFinite(s.target.x) && Number.isFinite(s.target.y)), 'every step has a spot');
ok(d.stages[0].mode === 'foot' && d.stages[0].radius >= 4, 'the first step is a walk up to the snack bar');
ok(d.stages[1].time >= 2 && d.stages[1].ticks.length === 2, 'the music step is a short hold with two beats');
ok(d.stages[2].time >= 5 && d.stages[2].ticks.length === 2, 'the last step waits for them to leave');
ok(d.stages[1].target.x !== d.stages[0].target.x || d.stages[1].target.y !== d.stages[0].target.y, 'the music car is not the start');
ok(d.stages[2].target.x !== d.stages[1].target.x || d.stages[2].target.y !== d.stages[1].target.y, 'the group is not the music car');
ok(d.stages.every((s) => s.kind !== 'scene' && s.kind !== 'choice'), 'text only: no scene or choice panel');

// hervatten (#213, missioncheckpoint.js): de eerste twee stappen niet, de laatste (na de hold) wel
ok(!isCheckpointStage(d, 0) && !isCheckpointStage(d, 1) && isCheckpointStage(d, 2), 'the last step is a checkpoint after the hold', `${[0, 1, 2].map((k) => isCheckpointStage(d, k)).join()}`);

// alleen tekst, geen echte merken/personen, en geen "de Grunn"
const all = JSON.stringify(d);
ok(!/\bde Grunn\b/.test(all), 'never "de Grunn"');
ok(!/\b(McDonald|KFC|Burger King|Domino|HEMA|Jumbo|Albert Heijn)\b/i.test(all), 'no real chain');
ok(!/\b(moord|dood|bloed|geweld)\b/i.test(all), 'no violence (satire, no harm)');

// de plek: de Herenstraat als de kaart hem kent, anders de terugval bij de Grote Markt
const spots = snackbarSpots({}, spot);
ok(spots.start.x === 100 && spots.start.y === 76, 'without a map the start falls back to the Grote Markt');
ok(spots.kar.x !== spots.start.x && spots.groep.x !== spots.kar.x, 'start, music car and group stand apart');
const named = snackbarSpots({ roadsNear: () => [{ name: 'Herenstraat', pts: [[0, 0], [40, 0]], cat: 'normal' }] }, spot);
ok(named.start.x !== 100 || named.start.y !== 76, 'with the Herenstraat on the map the start moves there', JSON.stringify(named.start));

console.log(bad ? `${bad} van ${n} mislukt` : `missionsdata_zij_test: ${n} controles ok`);
process.exit(bad ? 1 : 0);
