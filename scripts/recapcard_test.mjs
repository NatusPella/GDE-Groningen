// Recap card "Waar waren we?" (story analysis 21-11): the content from the story progress, the length, the conditions,
// the per-device storage and the wiring (Samen spelen, no save, no new story text).
// node scripts/recapcard_test.mjs
import fs from 'node:fs';
import {
  recapContent, recapRows, recapBlockers, recapAllowed, recapDecide, readRecapSeen, writeRecapSeen, recapSeenRecently,
  RECAP_MAX_WORDS, RECAP_CLOSE_S, RECAP_REPEAT_MS, RECAP_WAIT_MAX_S, RECAP_KEY,
} from '../game/js/recapcard.js';
import { STEPS, PARTS, WHY, partName } from '../game/js/storyarc.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const words = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length;

// --- content -------------------------------------------------------------------------------------------------------
const step = { id: 'M03', part: 'kop', title: 'Het Loket', lead: 'Tessa: Het Loket bij de Grote Markt. Open tot twaalf uur, contant.' };
const k = recapContent({ step, ended: false, last: 'Even pinnen', partTitle: PARTS.kop.title, why: WHY.kop });
ok(k && k.now === 'Het Loket bij de Grote Markt. Open tot twaalf uur, contant.' && k.last === 'Even pinnen' && k.why === WHY.kop && k.part === 'Akte 1: Moi, Grunn' && k.stepId === 'M03', 'the card has part, why, last done and now');
// Spel-UI 24-11: de kaart noemt de gekozen hoofdpersoon (Tammo of Anita, opts.character) en nooit de spreker van de verhaalregel
ok(recapContent({ step, ended: false, last: '', partTitle: 'x', why: '', wie: 'Anita' }).wie === 'Anita' && !/^(Tammo|Anita|Tessa):/.test(k.now), 'the card names the chosen main character and the lead has no speaker prefix');
ok(recapRows(k).map((r) => r[0]).join() === 'Waar het om draait,Laatst gedaan,Nu', 'three rows in a fixed order');
ok(recapRows(recapContent({ step, ended: false, last: '', partTitle: 'x', why: '' })).map((r) => r[0]).join() === 'Nu', 'without a last step and without a why only "Nu" is left');
ok(recapContent(null) === null && recapContent({ ended: true, step }) === null && recapContent({ ended: false, step: null }) === null, 'no card without a step or after the end');
ok(recapContent({ step: { ...step, lead: '' }, ended: false, why: WHY.kop }) === null, 'no card without a lead: there is no goal to name');
const long = { ...step, lead: 'Tessa: Een eerste zin die iets zegt. ' + 'En dan nog veel meer woorden die niemand hoeft te lezen, '.repeat(6) + 'tot het einde.' };
const kl = recapContent({ step: long, ended: false, last: 'Even pinnen', partTitle: 'Akte 1', why: WHY.kop });
ok(kl.now === 'Een eerste zin die iets zegt.', 'a lead that is too long is cut to its first sentence', kl.now);
const size = (x) => words(x.why) + words(x.last) + words(x.now);
ok(size(kl) <= RECAP_MAX_WORDS, 'cut, it fits the word limit', size(kl));
const kw = recapContent({ step: { ...step, lead: 'Tessa: ' + 'woord '.repeat(60) }, ended: false, last: 'Even pinnen', partTitle: 'Akte 1', why: WHY.kop });
ok(kw.why === '', 'if it still does not fit, the "waar het om draait" goes', size(kw));

// every real step with a lead: the card is short and has no empty row
const leadOf = (s) => (s.lead ? `${s.lead[0] === 'A' ? 'Tessa' : s.lead[0] === 'T' ? 'Tammo' : s.lead[0]}: ${s.lead[1]}` : '');
let withLead = 0;
const tooLong = [];
for (const s of STEPS) {
  const lead = leadOf(s);
  if (!lead) continue;
  withLead++;
  const c = recapContent({ step: { id: s.id, part: s.part, title: s.title, lead }, ended: false, last: 'Een titel van een stap', partTitle: partName(s.part), why: WHY[s.part] || '' });
  if (!c || size(c) > RECAP_MAX_WORDS) tooLong.push(s.id);
}
ok(withLead >= 20, 'the steps with a lead are the source of "Nu"', withLead);
ok(tooLong.length === 0, 'for every step with a lead the card stays short enough (otherwise shorten the lead in storyarc_nieuw.js)', tooLong.join(', '));
ok(Object.keys(PARTS).every((p) => typeof WHY[p] === 'string' && WHY[p].length > 10), 'every part has a "waar het om draait"');

// --- per-device storage --------------------------------------------------------------------------------------------
const mem = () => { const m = {}; return { getItem: (a) => (a in m ? m[a] : null), setItem: (a, v) => { m[a] = String(v); }, m }; };
const st = mem();
ok(readRecapSeen(st) === null && readRecapSeen(null) === null, 'empty: nothing seen yet');
ok(writeRecapSeen(st, 'M03', 1000) && readRecapSeen(st).step === 'M03' && readRecapSeen(st).at === 1000, 'write and read back');
ok(RECAP_KEY === 'gde-recap-v1' && Object.keys(st.m).join() === 'gde-recap-v1', 'one own gde key');
st.m[RECAP_KEY] = 'kapot{'; ok(readRecapSeen(st) === null, 'broken storage counts as nothing seen');
st.m[RECAP_KEY] = JSON.stringify({ v: 1, stap: 5, om: 'x' }); ok(readRecapSeen(st) === null, 'a shape that is wrong counts as nothing seen');
ok(writeRecapSeen({ setItem() { throw new Error('vol'); } }, 'M03') === false && writeRecapSeen(null, 'M03') === false && writeRecapSeen(st, 5) === false, 'full or missing storage gives false, no error');
const g = { step: 'M03', at: 1000 };
ok(recapSeenRecently(g, 'M03', 1000 + 60 * 1000) === true, 'same step a minute later: not again');
ok(recapSeenRecently(g, 'M03', 1000 + RECAP_REPEAT_MS + 1) === false, 'same step much later: again (you were away a while)');
ok(recapSeenRecently(g, 'M04', 2000) === false && recapSeenRecently(null, 'M03') === false, 'another step or nothing seen: yes');

// --- when ----------------------------------------------------------------------------------------------------------
const calm = { off: false, testbed: false, started: true, loading: false, loaded: true, client: false, session: false, openingDue: false, missionActive: false, cinematicActive: false, sinceCinematicS: null, narrativeBusy: false, pigeon: false, activity: false, respawn: false, menuOpen: false, dataReady: true };
ok(recapAllowed(calm), 'calm and loaded: the card may show');
const blocking = { off: true, testbed: true, started: false, loading: true, loaded: false, client: true, session: true, openingDue: true, missionActive: true, cinematicActive: true, narrativeBusy: true, pigeon: true, activity: true, respawn: true, menuOpen: true, dataReady: false };
for (const [key, value] of Object.entries(blocking)) {
  const r = recapBlockers({ ...calm, [key]: value });
  ok(r.length === 1, `only ${key} blocks`, r.join(' | '));
}
ok(recapBlockers({ ...calm, sinceCinematicS: 1 }).length === 1 && recapBlockers({ ...calm, sinceCinematicS: 2 }).length === 0, 'a film that just ended blocks for 1.5 s');
ok(recapBlockers({ ...calm, inVehicle: true, wanted: 3 }).length === 0, 'a vehicle or police does not block: the world stands still while the card is open');
ok(recapDecide({ blockers: [], waitS: 1, calmS: 0.3 }) === 'wait' && recapDecide({ blockers: [], waitS: 1, calmS: 0.7 }) === 'show', 'show only after 0.6 s of calm');
ok(recapDecide({ blockers: ['x'], waitS: 3, calmS: 0 }) === 'wait' && recapDecide({ blockers: ['x'], waitS: RECAP_WAIT_MAX_S + 1, calmS: 0 }) === 'give-up', 'wait, and give up after the maximum wait');
ok(RECAP_CLOSE_S >= 8 && RECAP_CLOSE_S <= 20, 'the card closes itself after a calm time');

// --- wiring --------------------------------------------------------------------------------------------------------
const pure = read('game/js/recapcard.js'), run = read('game/js/recapcardrun.js'), main = read('game/js/main.js');
ok(!/document\.|window\.|THREE|^import /m.test(pure.replace(/\/\/.*$/gm, '')), 'recapcard.js is pure: no DOM, no world, no imports');
ok(/world\.input/.test(run) && /uiPaused = true/.test(run) && /uiPaused = false/.test(run), 'the card stops the world and gives it back');
ok(!/saveGame|getSave|writeSave|world\.state|coopSend|coopNet\.send/.test(run), 'the card writes nothing into the save and sends nothing over the net');
ok(/client: w\.coopRole === 'client'/.test(run) && /session:/.test(run), 'a guest and a running session skip the card');
ok(/getSettings\(\)\.terugkeerScene === false/.test(run), 'the setting Terugkeerscène also turns the card off');
ok(/AUTOPLAY \|\| STORY_TEST/.test(run), 'test bench and game bot never get the card');
ok(/updateRecap\(dt, world/.test(main) && /isShopOpen\(\) \|\| isRecapOpen\(\)\)/.test(main), 'main.js draws the card and lets the return scene wait');
ok(/isRecapOpen/.test(read('game/js/phone.js')), 'phone.js (the world pause) knows the card, otherwise it lifts the pause every frame');
ok(/recap: 'gde-recap-v1'/.test(read('game/js/storagekeys.js')), 'the key is in storagekeys.js');
ok(/getStorySteps/.test(read('game/js/storyquery.js')), 'storyquery.js gives the steps read-only');

console.log(`recapcard_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
