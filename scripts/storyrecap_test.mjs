// Story recap, diary and early-arrival anchor (#1363, #1393): who is who without spoilers, where the story stands, what is next,
// for a player who played everything, a guest who joins later, and a scene reached too early. Real story data plus small data.
// node scripts/storyrecap_test.mjs
import { buildRecap, diaryEntries, earlyArrival, introducedIds, unknownNames, currentStepOf, nameTokens } from '../game/js/storyrecap.js';
import { STEPS, PARTS, WHY } from '../game/js/storyarc.js';
import { DOSSIERS } from '../game/js/characterdossiers.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

// --- small data: exact behaviour ---------------------------------------------------------------------------------
const steps = [
  { id: 'S1', part: 'a', title: 'Eerste', lead: ['T', 'Wij gaan naar de markt.'] },
  { id: 'S2', part: 'a', title: 'Tweede', lead: ['A', 'Pieter wacht bij de brug. Hij heeft een bakkie.'] },
  { id: 'S3', part: 'a', title: 'Derde', lead: ['T', 'Marieke belt over Pieter.'] },
  { id: 'S4', part: 'b', title: 'Vierde', lead: ['A', 'Terug naar huis.'] },
];
const dossiers = [
  { id: 'pieter', tier: 'supporting', name: 'Pieter Bos', nick: 'Bakkie-Pieter; oud', firstStep: 'S2', lastStep: 'S4', tagline: 'Rijdt al veertig jaar.' },
  { id: 'marieke', tier: 'supporting', name: 'Marieke Dijk', nick: 'Marieke', firstStep: 'S3', tagline: 'Kent iedereen.' },
  { id: 'tammo', tier: 'lead', name: 'Tammo Wierenga', firstStep: 'S1', tagline: 'De duivenkoning.' },
  { id: 'cameo', tier: 'cameo', name: 'Een kind', firstStep: 'S1', tagline: 'x' },
];
const parts = { a: { title: 'Akte 1: Moi' }, b: { title: 'Akte 2: Noord' } };
const why = { a: 'Eerst geld verdienen.', b: 'Marieke weet het.' };
const base = { steps, dossiers, parts, why };

ok(nameTokens(dossiers[0]).join() === 'Pieter,Bakkie-Pieter', 'name tokens: first name and nickname before the semicolon', nameTokens(dossiers[0]).join());
ok(currentStepOf(steps, ['S1']).id === 'S2' && currentStepOf(steps, steps.map((s) => s.id)) === null, 'current step is the first one not done');
ok([...introducedIds(dossiers, steps, ['S1'])].length === 0 && [...introducedIds(dossiers, steps, ['S1', 'S2'])].join() === 'pieter', 'only a character whose first step is done is met');

const r0 = buildRecap({ ...base, done: [] });
ok(r0.stepId === 'S1' && r0.wie.length === 0 && r0.vorige.length === 0, 'a new player: no who-is-who and nothing done yet');
ok(r0.rows[0][0] === 'Waar staan we' && r0.rows[r0.rows.length - 1][0] === 'Nu', 'rows start with where we are and end with what is next');
const r1 = buildRecap({ ...base, done: ['S1', 'S2'] });
ok(r1.stepId === 'S3' && r1.wie.map((w) => w.id).join() === 'pieter' && r1.vorige.join() === 'Eerste,Tweede', 'after two steps: Pieter is known, the last two steps are named');
ok(r1.nu.includes('Marieke') && r1.wie.every((w) => w.id !== 'marieke'), 'the step that introduces Marieke may name her in its goal, but she is not in the who-is-who yet');
const odd = [{ id: 'X1', part: 'a', title: 'Een', lead: ['T', 'Marieke wacht op ons.'] }, steps[2]];
const rOdd = buildRecap({ ...base, steps: odd, done: [] });
ok(!JSON.stringify(rOdd).includes('Marieke') && rOdd.rows.some((r) => r[0] === 'Nu' && r[1].length > 5), 'a goal line that names a character met later is withheld, a neutral line stands in', rOdd.nu);
ok(!r1.wie.some((w) => w.id === 'tammo' || w.id === 'cameo'), 'leads and cameos are not in the who-is-who');
const r2 = buildRecap({ ...base, done: ['S1', 'S2', 'S3'] });
ok(r2.wie.map((w) => w.id).join() === 'marieke,pieter' && r2.nu === 'Terug naar huis.', 'later: Marieke is met, newest first');
ok(buildRecap({ ...base, done: steps.map((s) => s.id) }) === null, 'story over: no recap');
// a guest who joins later (own progress) gets a recap that fits him, even when the host is further
const guest = buildRecap({ ...base, done: ['S1'] });
const host = buildRecap({ ...base, done: ['S1', 'S2', 'S3'] });
ok(guest.stepId === 'S2' && guest.wie.length === 0 && host.wie.length === 2, 'guest and host get different recaps from their own progress');
ok(!JSON.stringify(guest).includes('Marieke'), 'guest recap has no spoiler');
ok(buildRecap({ ...base, done: ['S1', 'S2', 'S3'], maxWho: 1 }).wie.length === 1, 'who-is-who is capped');

const d = diaryEntries({ steps, done: ['S1', 'S3'] });
ok(d.length === 2 && d[0].door === 'Tammo' && d[1].door === 'Tammo' && d[0].tekst === 'Wij gaan naar de markt.', 'diary: one entry per done step in the words of the speaker');
ok(diaryEntries({ steps, done: ['S2'] })[0].door === 'Tessa', 'lead code A is Tessa');

const e1 = earlyArrival({ step: steps[2], ...base, done: [] });
ok(e1.early && e1.anchor === 'Eerst geld verdienen.', 'early: lead names an unmet character, so the part line is the anchor', e1.anchor);
ok(earlyArrival({ step: steps[0], ...base, done: [] }).early === false, 'the first step is never early');
ok(earlyArrival({ step: steps[1], ...base, done: ['S1'] }).early === false, 'the next step is not early');
ok(earlyArrival({ step: steps[1], ...base, done: ['S1'] }).anchor === 'Pieter wacht bij de brug.', 'a step may name the character it introduces itself');
const e3 = earlyArrival({ step: steps[2], steps, dossiers, why: { a: 'Pieter weet het.' }, done: [] });
ok(e3.anchor.length > 10 && !/Pieter|Marieke/.test(e3.anchor), 'when everything leaks there is still a neutral anchor', e3.anchor);

// --- the real story: no spoilers, no empty rows, nobody blocked ---------------------------------------------------
const real = { steps: STEPS, dossiers: DOSSIERS, parts: PARTS, why: WHY };
const knownIds = new Set(STEPS.map((s) => s.id));
ok(DOSSIERS.filter((x) => x.tier === 'supporting' && x.firstStep && knownIds.has(x.firstStep)).length >= 15, 'real supporting cast with first steps is found');

let spoilers = 0, empties = 0, long = 0;
for (let i = 0; i < STEPS.length; i++) {
  const done = STEPS.slice(0, i).map((s) => s.id);
  const r = buildRecap({ ...real, done });
  if (!r) { empties++; continue; }
  // the who-is-who lines may name the met characters; every other row must not name an unmet one
  const rest = r.rows.filter((x) => x[0] !== 'Wie is wie').map((x) => x[1]).join(' ');
  const leak = unknownNames(rest, { ...real, done, stepId: STEPS[i].id });
  if (leak.length) { spoilers++; console.log(`  spoiler at ${STEPS[i].id}: ${leak.join()}`); }
  const met = introducedIds(DOSSIERS, STEPS, done);
  if (!r.wie.every((w) => met.has(w.id))) spoilers++;
  if (r.rows.some((x) => !String(x[1]).trim()) || /undefined|\[object|[{}]/.test(r.rows.map((x) => x[1]).join(' '))) empties++;
  if (r.wie.length > 5) long++;
}
ok(spoilers === 0, 'real story: no recap names a character the player has not met', spoilers);
ok(empties === 0 && long === 0, 'real story: no empty row, no "undefined", who-is-who within the cap', `${empties}/${long}`);
ok(buildRecap({ ...real, done: STEPS.map((s) => s.id) }) === null, 'real story: recap ends with the story');

// every step reached with nothing done: the anchor is there and names no stranger
let anchorFails = 0;
for (let i = 0; i < STEPS.length; i++) {
  const s = STEPS[i];
  const a = earlyArrival({ step: s, ...real, done: [] });
  if (!a.anchor || unknownNames(a.anchor, { ...real, done: [], stepId: s.id }).length) anchorFails++;
  if (i > 0 && !a.early) anchorFails++;
}
ok(anchorFails === 0, 'real story: every step reached too early has a clean anchor and counts as early', anchorFails);

const dAll = diaryEntries({ steps: STEPS, done: STEPS.map((s) => s.id) });
ok(dAll.length === STEPS.filter((s) => s.lead).length && dAll.length > 40, 'real diary has an entry per step with a lead', dAll.length);
ok(dAll.every((e) => e.door === 'Tammo' || e.door === 'Tessa') && dAll.every((e) => e.tekst), 'diary entries are by Tammo or Tessa and have text');

console.log(`storyrecap_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
