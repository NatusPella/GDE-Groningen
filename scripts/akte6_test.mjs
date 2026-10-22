// Deel 4 "Nazomer" of the new story (#361): steps, defs, places, the gate behind the finale, the calendar.
//   node scripts/akte6_test.mjs
// - M27, M28, M29, T5 and M30 follow the epilogue E, in part 'nazomer', built, with scenes that exist in script.json, a lead and a reward equal to the def's
// - the part after the finale: `after`, a recap and an end card; the story waits for the finale card of act 5 (nextStoryStep) and then goes on
// - the new defs sit in NEW_MISSION_IDS in the order buildAkte6Defs returns them; every stage kind is one missions.js handles; nothing can fail or hurt
// - the places: Loppersum near the village, the Bourtange spots within the vesting's reach, all inside the province
// - the calendar: the steps play 14 to 19 september, still summer; the story text has no real company and no winter
// What this cannot see (Electron, in beeld): whether the places are walkable and good to look at, how the staged scenes look.
import './node3d.mjs';
import fs from 'node:fs';

const { STEPS, NEW_MISSION_IDS, CLUES, PARTS, WHY, CHARACTERS, SPEAKERS } = await import('../game/js/storyarc_nieuw.js');
const { buildAkte6Defs, LOPPERSUM: LP, BOURTANGE, CHURCH: CH } = await import('../game/js/missions_akte6.js');
const { buildNieuwDefs } = await import('../game/js/missions_nieuw.js');
const { nextStoryStep, stepAvailable, MISSION_IDS, missionIndexOf, FINALE_PART } = await import('../game/js/storyarc.js');
const { wgsToWorld } = await import('../game/js/rdnew.js');
const { FALLBACK } = await import('../game/js/regiondata.js');
const { STEP_DAY, NAZOMER_STEP_DAYS, EPILOGUE_DAY, LAST_SUMMER_DAY, day, weekdayOf, partStartDay, formatDay } = await import('../game/js/calendar.js');
const { REISBEATS } = await import('../game/js/reisbeats.js');
const { STORY_AKTE6 } = await import('../game/js/missionstory_akte6.js');
const root = new URL('../game/', import.meta.url);
const script = JSON.parse(fs.readFileSync(new URL('storydata/script.json', root), 'utf8'));
const scenes = new Map(script.scenes.map((s) => [s.id, s]));
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

// --- steps
const ids = ['M27', 'M28', 'M29', 'T5', 'M30'];
const at = ids.map((id) => STEPS.findIndex((s) => s.id === id));
const eAt = STEPS.findIndex((s) => s.id === 'E');
ok(at[0] === eAt + 1 && at.every((i, k) => i >= 0 && (k === 0 || i === at[k - 1] + 1)) && at[4] === STEPS.length - 1, 'M27, M28, M29, T5, M30 follow E and end the arc', at.join());
for (const id of ids) {
  const st = STEPS.find((s) => s.id === id);
  ok(st.part === 'nazomer' && st.built === true && stepAvailable(st), `${id}: part nazomer, built`);
  ok(Array.isArray(st.lead) && st.lead[1].length > 20, `${id}: a lead`);
  for (const sc of st.scenes || []) ok(scenes.has(sc) && scenes.get(sc).step === id, `${id}: scene ${sc} exists and belongs to it`);
  if (st.kind === 'mission') {
    ok(MISSION_IDS.includes(st.mission), `${id}: def id ${st.mission} is in MISSION_IDS`);
    ok(st.story && (st.story.intro || []).every((x) => scenes.has(x)) && (st.story.outro || []).every((x) => scenes.has(x)) && (st.story.replay || []).every((x) => scenes.has(x)), `${id}: story scenes exist`);
    ok(st.reward > 0, `${id}: a reward`);
    ok(STORY_AKTE6[st.mission] && STORY_AKTE6[st.mission].npc && STORY_AKTE6[st.mission].fail.length >= 2, `${id}: a story entry with an NPC and fail lines`);
  }
}
const T5 = STEPS.find((s) => s.id === 'T5');
ok(T5.goal.type === 'reis' && T5.goal.at.length === 2 && scenes.has(T5.goal.scene), 'T5: a travel goal with a place and an arrival scene');
ok(REISBEATS.T5 && REISBEATS.T5.act === 6 && REISBEATS.M27 && REISBEATS.M27.act === 6, 'M27 and T5 have a travel beat (act 6)');
ok(scenes.get('T5.1').kind === 'travel' && scenes.get('T5.2').kind === 'outro' && scenes.get('T5.3').kind === 'replay', 'T5: trip talk, arrival and replay scenes');
for (const id of ['M27', 'M28', 'M29', 'M30']) {
  const sc = script.scenes.filter((s) => s.step === id && /^M\d\d\.\d$/.test(s.id));
  ok(sc.some((s) => s.kind === 'intro') && sc.some((s) => s.kind === 'outro') && sc.some((s) => s.kind === 'replay'), `${id}: an intro, an outro and a replay scene`);
}
for (const id of ['M27', 'M28', 'M29', 'M30']) ok(CLUES.filter((c) => c.step === id).length >= 1, `${id}: clues for Wat weten we?`);
ok(CLUES.some((c) => c.step === 'M30' && /Zes woorden/.test(c.title)) && CLUES.some((c) => c.step === 'M29' && /grip/.test(c.title)), 'the callbacks (Voor de grip, zes woorden) are clues');

// --- the part after the finale
const P = PARTS.nazomer;
ok(P.open && P.after === FINALE_PART && FINALE_PART === 'ontzet', 'nazomer: open, after the finale of act 5');
ok(!P.finale, 'nazomer: not a finale itself (the main story has its credits and postgame)');
ok(P.recap.length === 3 && P.card.length >= 4 && P.card.every((l) => l.length === 2 && l[1].length > 5), 'nazomer: a recap and an end card');
ok(typeof P.big === 'string' && P.big.startsWith('Einde'), 'nazomer: the end card says Einde van Deel 4, not Wordt vervolgd');
ok(/^Deel 4:/.test(P.title) && P.date === '14 september' && WHY.nazomer, 'nazomer: title, date, why');
ok(Object.values(PARTS).filter((p) => p.after).length === 1, 'only Deel 4 is a continuation');
ok(CHARACTERS.willemien && CHARACTERS.willemien.step === 'M27' && SPEAKERS.willemien === 'Willemien' && SPEAKERS.buurvrouw === 'Buurvrouw', 'Willemien and the buurvrouw are in the cast');
{
  // the gate: act 5 ends on its finale card first, Deel 4 starts once the card has played
  const done = new Set(STEPS.filter((s) => s.part !== 'nazomer').map((s) => s.id));
  const passed = new Set(STEPS.filter((s) => s.kind === 'mission' && s.part !== 'nazomer').map((s) => missionIndexOf(s.mission)));
  const d = (id) => done.has(id), p = (i) => passed.has(i);
  ok(nextStoryStep(d, p, () => false).end === 'ontzet' && nextStoryStep(d, p, () => false).finale === true, 'the gate: act 5 ends on its finale card');
  ok(nextStoryStep(d, p).id === 'M27', 'no gate given (a save summary): Deel 4 is open');
  ok(nextStoryStep(d, p, (x) => x === 'ontzet').id === 'M27', 'the finale card has played: M27 is next');
  for (const s of STEPS.filter((q) => q.part === 'nazomer')) { done.add(s.id); if (s.kind === 'mission') passed.add(missionIndexOf(s.mission)); }
  const end = nextStoryStep(d, p, (x) => x === 'ontzet');
  ok(end.end === 'nazomer' && end.finale === true && end.next === null, 'all done: the story ends on the end of Deel 4', JSON.stringify(end));
}

// --- defs
const mine = buildAkte6Defs();
const ours = ['inpakken', 'wisselwoning', 'terug', 'proefbeleg'];
ok(mine.length === 4, 'four new defs');
const base = NEW_MISSION_IDS.indexOf('inpakken');
ok(base > 0 && ours.every((id, k) => NEW_MISSION_IDS[base + k] === id) && base + 4 === NEW_MISSION_IDS.length, 'NEW_MISSION_IDS ends with inpakken, wisselwoning, terug, proefbeleg');
const map = { meta: { landmarks: [] } };
const all = buildNieuwDefs({ map, walk: (x, y) => ({ x, y, road: null }), drive: (x, y) => ({ x, y, road: null }) });
ok(all.length === NEW_MISSION_IDS.length, 'buildNieuwDefs returns one def per new mission id', `${all.length}/${NEW_MISSION_IDS.length}`);
ok(all[base].label === 'Inpakken' && all[base + 3].label === 'Het proefbeleg', 'the defs are in the order of the ids');
const KINDS = new Set(['board', 'goto', 'hold', 'scene']);
const src = fs.readFileSync(new URL('js/missions.js', root), 'utf8');
mine.forEach((d, k) => {
  ok(Number.isFinite(d.start.x) && Number.isFinite(d.start.y), `${d.label}: start`);
  ok(STEPS.some((s) => s.kind === 'mission' && s.reward === d.reward && s.mission === ours[k]), `${d.label}: reward equals the step's`);
  ok(d.stages.length >= 2 && d.stages.every((q) => KINDS.has(q.kind)), `${d.label}: known stage kinds`, d.stages.map((q) => q.kind).join());
  ok(d.stages.every((q) => q.label), `${d.label}: every stage says its goal`);
  ok(d.timeLimit === null && !d.stages.some((q) => q.fireworks || q.limit || q.light || q.pursuer), `${d.label}: no timer, no bangs, nobody chases (the series cannot fail)`);
  for (const q of d.stages) if (q.script) for (const id of q.script.ids) ok(scenes.has(id), `${d.label}: scene ${id} exists`);
  for (const q of d.stages) if (q.talk) {
    for (const id of q.talk.ids) ok(scenes.has(id), `${d.label}: talk scene ${id} exists`);
    const len = scenes.get(q.talk.ids[0]).lines.length;
    ok((q.talk.from || 0) < len && (q.talk.to == null || q.talk.to <= len), `${d.label}: the talk slice lies inside its scene`, `${q.talk.from}-${q.talk.to}/${len}`);
  }
  for (const q of d.stages) ok(new RegExp(`case '${q.kind}'`).test(src) || q.kind === 'board', `${d.label}: missions.js handles ${q.kind}`);
});
ok(mine[0].stages.map((q) => q.kind).join() === 'hold,hold,scene,hold,goto' && mine[0].onFoot, 'inpakken: books, china, the photo, the cat, the van, on foot');
ok(mine[1].vehicle === 'car' && mine[1].lazyStart && mine[1].stages[0].kind === 'board' && mine[1].vehicleModel.name === 'van', 'wisselwoning: a removal van to board and drive');
ok(mine[2].stages.map((q) => q.kind).join() === 'hold,scene,goto', 'terug: the tables, the party, the hallway');
ok(mine[3].stages.filter((q) => q.kind === 'hold').length === 3 && mine[3].stages.filter((q) => q.kind === 'scene').length === 3, 'proefbeleg: three bastions held, three scenes (moat, bridge, gate)');
// the three bastions are told in one scene: the talk slices of M30.4 follow each other and cover every line
{
  const slices = mine[3].stages.filter((q) => q.talk && q.talk.ids[0] === 'M30.4').map((q) => [q.talk.from || 0, q.talk.to == null ? scenes.get('M30.4').lines.length : q.talk.to]);
  ok(slices.length === 3 && slices[0][0] === 0 && slices.every((s, i) => i === 0 || s[0] === slices[i - 1][1]) && slices[2][1] === scenes.get('M30.4').lines.length, 'proefbeleg: the talk of the bastions covers M30.4 once, in order', JSON.stringify(slices));
}

// --- places: near the real town, inside the province
const inside = (poly, x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const LOPPERSUM = wgsToWorld(53.3306, 6.7494);
for (const [key, [x, y]] of Object.entries(LP)) {
  ok(Math.hypot(x - LOPPERSUM[0], y - LOPPERSUM[1]) < 1200, `${key}: within 1.2 km of the centre of Loppersum`, `${Math.round(Math.hypot(x - LOPPERSUM[0], y - LOPPERSUM[1]))} m`);
  ok(inside(FALLBACK.outline, x, y), `${key}: inside the province`);
}
ok(Math.hypot(LP.huis[0] - LP.bus[0], LP.huis[1] - LP.bus[1]) > 25 && Math.hypot(LP.huis[0] - LP.erf[0], LP.huis[1] - LP.erf[1]) > 25 && Math.hypot(LP.bus[0] - LP.erf[0], LP.bus[1] - LP.erf[1]) > 25, 'M27, M28 and M29 start more than 25 m apart (no two markers on one spot)');
const CHURCH = [42416.8, 22773.3];
ok(CH[0] === CHURCH[0] && CH[1] === CHURCH[1], 'the church of the vesting is the one of landmarkkit');
for (const [key, [x, y]] of Object.entries(BOURTANGE)) {
  ok(Math.hypot(x - CHURCH[0], y - CHURCH[1]) < 600, `${key}: within 600 m of the church of Bourtange`, `${Math.round(Math.hypot(x - CHURCH[0], y - CHURCH[1]))} m`);
  ok(inside(FALLBACK.outline, x, y), `${key}: inside the province`);
}
ok(['bolwerk1', 'bolwerk2', 'bolwerk3'].every((k) => Math.hypot(BOURTANGE[k][0] - CHURCH[0], BOURTANGE[k][1] - CHURCH[1]) < 220) && BOURTANGE.hooiberg[1] < BOURTANGE.gracht[1] && BOURTANGE.gracht[1] < BOURTANGE.bolwerk2[1], 'Bourtange: the bastions lie within 220 m of the church, the haystack north of the moat, the moat north of the south bastion');
ok(new Set(['bolwerk1', 'bolwerk2', 'bolwerk3']).size === 3 && ['bolwerk1', 'bolwerk2', 'bolwerk3'].every((a, i, l) => l.every((b, j) => i === j || Math.hypot(BOURTANGE[a][0] - BOURTANGE[b][0], BOURTANGE[a][1] - BOURTANGE[b][1]) > 100)), 'Bourtange: the three bastions lie more than 100 m apart');
// the church of the script is the landmark of landmarkkit
{
  const lk = fs.readFileSync(new URL('js/landmarkkit.js', root), 'utf8');
  ok(/Kerk van Bourtange', x: 42416\.8, y: 22773\.3/.test(lk), 'the church of Bourtange is where missions_akte6.js puts it');
}

// --- the calendar: 14 to 19 september, still summer
const days = ids.map((id) => STEP_DAY.get(id));
ok(days.every((v, i) => v > EPILOGUE_DAY && v <= LAST_SUMMER_DAY && (i === 0 || v >= days[i - 1])), 'the Deel 4 days lie after the epilogue, in order and before the 22nd of september', days.join());
ok(NAZOMER_STEP_DAYS.M27 === day(9, 14) && weekdayOf(STEP_DAY.get('M27')) === 1, 'M27 is on maandag 14 september');
ok(weekdayOf(STEP_DAY.get('M30')) === 6 && formatDay(STEP_DAY.get('M30')).long === 'Zaterdag 19 september', 'M30 is on zaterdag 19 september');
ok(partStartDay('nazomer') === day(9, 14), 'the date card of Deel 4 is 14 september');

// --- the text: Dutch, no real company, no numbers about the gas, always summer
const lines = script.scenes.filter((s) => s.act === 6).flatMap((s) => s.lines.map((l) => ({ ...l, scene: s.id })));
ok(lines.length >= 100, 'Deel 4 has its script', String(lines.length));
const text = lines.map((l) => l.text).join(' ') + ' ' + JSON.stringify(P) + JSON.stringify(CLUES.filter((c) => ids.includes(c.step))) + JSON.stringify(mine) + JSON.stringify(STORY_AKTE6);
ok(!/\b(NAM|Gasunie|Shell|Exxon|BAM)\b/.test(text), 'no real company in the text');
ok(/Delfstof Noord/.test(text) && lines.filter((l) => /Delfstof/.test(l.text)).length === 1, 'the made-up company is named once in the script (a sign and one sentence), never as a villain');
ok(!/\b(schuld|schurk|boef|wraak|aansprakelijk)\w*/i.test(lines.filter((l) => ['M27.1', 'M27.2', 'M27.3', 'M28.2', 'M28.3', 'M29.1', 'M29.2', 'M29.3'].includes(l.scene)).map((l) => l.text).join(' ')), 'the Loppersum scenes blame nobody and want no revenge');
ok(!/\d{2,}[.,]?\d*\s*(huizen|woningen|miljard|miljoen|bevingen|beving)/i.test(text), 'no numbers about homes, damage or quakes (nothing we cannot check)');
ok(!/\b(sneeuw|winter|ijs|vorst|herfst|oktober|november)\b/i.test(lines.map((l) => l.text).join(' ')), 'always summer: no winter or autumn words');
ok(!/de Grunn/.test(text), 'Grunn, never "de Grunn"');
ok(!lines.some((l) => /jongens/i.test(l.text)), 'inclusive words: no "jongens" for a mixed group');
ok(lines.filter((l) => !l.textOnly).every((l) => l.rec), 'a line with a recording names it');
ok(lines.filter((l) => !l.textOnly).length <= 8, 'only short lines match an existing recording (Voor de grip, Kon minder), no new recording is needed', String(lines.filter((l) => !l.textOnly).length));

console.log(`${n - fails}/${n} deel 4 (act 6) checks passed`);
process.exit(fails ? 1 : 0);
