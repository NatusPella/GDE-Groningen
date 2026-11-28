// Overgangsscènes (#1125): de data (BRIDGES en de scènes in script.json), de keuze van de scène die aan de beurt is,
// de rustvoorwaarden, de afstand tussen twee scènes, en dat de speler er geen voortgang in kan verliezen of winnen.
// node scripts/storybridge_test.mjs
import fs from 'node:fs';
import { STEPS, BRIDGES } from '../game/js/storyarc.js';
import {
  bridgeDue, bridgeBlockers, bridgeMay, bridgeDecide, bridgeSpacingProblems, bridgeFlag, BRIDGE_VIAS, BRIDGE_CALM_S, BRIDGE_CAR_WAIT_S, BRIDGE_MAX_STEPS_LATE,
} from '../game/js/storybridge.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const data = JSON.parse(read('game/storydata/script.json'));
const byId = new Map(data.scenes.map((s) => [s.id, s]));
const words = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length;
const stepIdx = (id) => STEPS.findIndex((s) => s.id === id);

// --- de data --------------------------------------------------------------------------------------------------------
ok(BRIDGES.length === 12, 'twaalf overgangsscènes', BRIDGES.length);
ok(new Set(BRIDGES.map((b) => b.id)).size === BRIDGES.length, 'de id\'s zijn uniek');
for (const b of BRIDGES) {
  const sc = byId.get(b.scene);
  ok(sc && sc.kind === 'bridge', `${b.id}: de scène bestaat en is van het soort bridge`);
  ok(stepIdx(b.after) >= 0 && STEPS[stepIdx(b.after)].kind === 'mission', `${b.id}: hangt aan een missie (${b.after})`);
  ok(BRIDGE_VIAS.includes(b.via), `${b.id}: via is car, flat of phone`, b.via);
  if (!sc) continue;
  ok(sc.step === b.after && sc.anchor && sc.anchor.at === 'after' && sc.anchor.step === b.after, `${b.id}: de scène in script.json hangt na ${b.after}`, JSON.stringify(sc.anchor));
  const ls = sc.lines.filter((l) => l.channel !== 'app-stil');
  ok(ls.length >= 4 && ls.length <= 14, `${b.id}: vier tot veertien regels (O1 heeft Beppe erbij)`, ls.length);
  ok(ls.every((l) => words(l.text) <= 25), `${b.id}: elke regel hoogstens 25 woorden`);
  const talkers = new Set(ls.map((l) => l.speaker));
  ok(talkers.size >= 2 && talkers.size <= 3, `${b.id}: twee of drie sprekers`, [...talkers].join());
  ok(sc.regie.length >= 1, `${b.id}: een regel regie`);
  if (b.via === 'phone') ok(ls.some((l) => l.channel === 'telefoon'), `${b.id}: een telefoonscène heeft telefoonregels`);
}
ok(data.scenes.filter((s) => s.kind === 'bridge').length === BRIDGES.length, 'elke scène van het soort bridge staat in BRIDGES');
ok(bridgeSpacingProblems().length === 0, 'nooit twee scènes na twee opeenvolgende missies', bridgeSpacingProblems().join('; '));
ok(bridgeSpacingProblems([{ after: 'M02' }, { after: 'M03' }]).length === 1, 'de afstandscontrole vangt twee opeenvolgende missies');
const parts = new Set(BRIDGES.map((b) => STEPS[stepIdx(b.after)].part));
ok(['kop', 'romp', 'staart', 'zuid', 'ontzet', 'nazomer'].every((p) => parts.has(p)), 'elke akte heeft minstens één overgangsscène');
ok(data.scenes.filter((s) => s.id === 'O7')[0].lines[0].text === 'Over zaterdag.', 'O7 draagt "Over zaterdag." (naar M17.1 verplaatst; de grap blijft staan)');

// --- welke scène is aan de beurt ---------------------------------------------------------------------------------------
const mk = (doneIds, flagIds = [], currentId = null) => ({ done: new Set(doneIds), flags: new Set(flagIds), currentId });
ok(bridgeDue(mk(['M00'], [], 'M01')) === null, 'niets aan de beurt zolang de stap niet af is');
ok(bridgeDue(mk(['M01'], [], 'N1')).id === 'O1' && bridgeDue(mk(['M01', 'M02'], [], 'M03')).id === 'O1', 'na M01 is O1 aan de beurt (ook tijdens de nieuwe N-stappen)');
ok(bridgeDue(mk(['M01'], [bridgeFlag('O1')], 'N1')) === null, 'een geziene scène komt niet terug');
ok(bridgeDue(mk(['M01', 'M02', 'M03'], [], 'M05')).id === 'O1', 'de eerste die nog aan de beurt is, wint (volgorde van het verhaal)');
ok(bridgeDue(mk(['M01'], [], 'M05')).id === 'O1', 'tot en met twee missies later nog wel');
ok(bridgeDue(mk(['M01'], [], 'M06')) === null, 'een scène over iets van lang geleden speelt niet meer');
ok(bridgeDue(mk(['M30'], [], null)).id === 'O12', 'na het einde (geen huidige stap) komt O12 nog');
ok(bridgeDue(mk(['M10'], [], 'T2')).id === 'O5', 'een reisstap tussen twee missies telt mee');

// --- wanneer -------------------------------------------------------------------------------------------------------
const calm = { started: true, loading: false, client: false, session: false, openingDue: false, missionActive: false, cinematicActive: false, sinceCinematicS: 99, pigeon: false, activity: false, respawn: false, wanted: 0, sinceDeathS: 99, menuOpen: false, recapOpen: false, dataReady: true };
ok(bridgeMay(calm), 'rustig: hij mag');
for (const [k, v] of [['started', false], ['loading', true], ['client', true], ['session', true], ['openingDue', true], ['missionActive', true], ['cinematicActive', true], ['pigeon', true], ['activity', true], ['respawn', true], ['wanted', 2], ['menuOpen', true], ['recapOpen', true], ['dataReady', false]]) {
  ok(!bridgeMay({ ...calm, [k]: v }), `geblokkeerd door ${k}`);
}
ok(!bridgeMay({ ...calm, sinceCinematicS: 1 }) && !bridgeMay({ ...calm, sinceDeathS: 5 }), 'vlak na een film of de dood wachten we');
ok(bridgeBlockers(calm).length === 0 && bridgeBlockers({ ...calm, missionActive: true, menuOpen: true }).length === 2, 'elke reden wordt genoemd');
ok(bridgeDecide({ via: 'flat', blockers: [], calmS: BRIDGE_CALM_S, waitedS: 0, inVehicle: false }) === 'speel', 'rustig lang genoeg: speel');
ok(bridgeDecide({ via: 'flat', blockers: [], calmS: 1, waitedS: 0, inVehicle: false }) === 'wacht', 'nog niet lang genoeg rustig');
ok(bridgeDecide({ via: 'flat', blockers: ['menu open'], calmS: 9, waitedS: 9, inVehicle: false }) === 'wacht', 'een blokkade wacht altijd');
ok(bridgeDecide({ via: 'car', blockers: [], calmS: 9, waitedS: 1, inVehicle: false }) === 'wacht-op-auto', 'een autoscène wacht op een voertuig');
ok(bridgeDecide({ via: 'car', blockers: [], calmS: 9, waitedS: 1, inVehicle: true }) === 'speel', 'in de auto speelt hij');
ok(bridgeDecide({ via: 'car', blockers: [], calmS: 9, waitedS: BRIDGE_CAR_WAIT_S, inVehicle: false }) === 'speel', 'na de wachttijd speelt hij ook zonder auto');

// --- Samen spelen: een gast speelt hem niet en loopt er niet in vast (regel in storybridge.js en VERHAAL-ANALYSE-21-11.md)
ok(!bridgeMay({ ...calm, client: true }) && !bridgeMay({ ...calm, session: true }), 'een meespeler en een lopende sessie spelen geen overgangsscène');
ok(bridgeBlockers({ ...calm, client: true }).includes('meespeler') && bridgeBlockers({ ...calm, session: true }).includes('Samen spelen'), 'de reden wordt genoemd');
const runSrc0 = read('game/js/storybridgerun.js');
ok(runSrc0.includes("client: w.coopRole === 'client'") && runSrc0.includes('session: !!(w.coopNet && !w.coopSolo)'),'storybridgerun.js leest coopRole en de sessie uit de wereld');
ok(!/coopNet.send|broadcast|coopcut|sendExtra|coopw*.(send|emit)/i.test(runSrc0), 'storybridgerun.js stuurt niets over het net: de gast wordt nooit gestopt of gewacht op');
ok(bridgeDue({ done: new Set(['M01']), flags: new Set(), currentId: 'N1' }).id === 'O1' && !bridgeMay({ ...calm, client: true }), 'een gast heeft zijn eigen stand (eigen done en flags), de blokkade is alleen lokaal');

// --- bedrading en wat hij nooit doet ---------------------------------------------------------------------------------
const run = read('game/js/storybridgerun.js');
const main = read('game/js/main.js');
const story = read('game/js/story.js');
ok(/updateStoryBridge\(world\.paused \? 0 : dt, world, storyBridgeView\(\)/.test(main), 'main.js speelt de overgangsscènes (niet op pauze)');
ok(/bridgeActive\(\)/.test(story) && /storyBridgeView/.test(story), 'story.js telt een lopende scène als "say" en geeft de stand door');
ok(/AUTOPLAY \|\| STORY_TEST/.test(run), 'de testbank en de spelbot krijgen hem niet vanzelf');
ok(!/localStorage|fetch\(|sendBeacon|WebSocket/.test(run), 'geen opslag en geen netwerk');
ok(/Backspace/.test(run) && /Escape/.test(run), 'overslaan met Backspace of Escape');
ok(!/state\.done|markDone|reward|addMoney/.test(run), 'de scène schrijft geen voortgang en geeft geen geld');

console.log(`storybridge_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
