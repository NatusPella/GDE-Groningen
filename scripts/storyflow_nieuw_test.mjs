// The new story, acts 2 to 5 (M07-E), hangs together from end to end on the pure side (#10, #11, #12, #163):
//   node scripts/storyflow_nieuw_test.mjs
// - the chain: parts in order, every step built, unique ids, no step between two others that is not built (no dead end)
// - walking the story with nextStoryStep visits every step once and ends on the finale; a save made before any
//   step resumes on exactly that step (also with only mission indices passed, and with a step done ahead)
// - every mission step has one def at its own MISSION_IDS index; no two steps share a def; MISSION_IDS add-only
// - every def: a start on the map, a known stage kind, a goal said in the HUD, scenes that exist, no leftovers
//   of the old plot (Boer Roelf, Hilje), requirements that exist and can be met
// - the travel beats point at the place the step starts (reisbeats.js), travel goals lie in the province
// - the worst-case money never drops below zero before a purchase
// - a save loaded in the middle of an act restores the mission chain (setMissionProgress) to the step that was next
// What this cannot see (Electron, in beeld): whether a stage can actually be played to the end, the places on the real map.
process.env.GDE_NIEUW_VERHAAL = '1';
import fs from 'node:fs';
import './node3d.mjs';

const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
const M = await import('../game/js/missions.js');
const A = await import('../game/js/storyarc.js');
const { NEW_MISSION_IDS, PARTS: NPARTS } = await import('../game/js/storyarc_nieuw.js');
const { REISBEATS } = await import('../game/js/reisbeats.js');
const { wgsToWorld } = await import('../game/js/rdnew.js');
const { FALLBACK } = await import('../game/js/regiondata.js');
const { STEPS, MISSION_IDS, nextStoryStep, stepDone, missionIndexOf, computeMoneyTimeline, PARTS } = A;
const root = new URL('../game/', import.meta.url);
const { loadStadData } = await import('./lib/loadworld.mjs');
const data = await loadStadData({ extras: true });
const map = new GameMap(data);
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const world = { map, onRespawn: [], addMessage() {}, player: { x: 0, y: 0 }, vehicles: [], pedestrians: [], stats: { pedKills: 0, copKills: 0 } };
M.initMissions(world);
const defs = M.getMissionDefs();
const script = JSON.parse(fs.readFileSync(new URL('storydata/script.json', root), 'utf8'));
const scenes = new Set(script.scenes.map((s) => s.id));
const src = fs.readFileSync(new URL('js/missions.js', root), 'utf8');

// --- the chain
const first = STEPS.findIndex((s) => s.id === 'M07');
const story = STEPS.slice(first);
ok(first > 0 && story.at(-1).id === 'M30', 'M07 to M30 are the last steps of the arc (Deel 4 follows E)');
ok(story.map((s) => s.id).join() === 'M07,M08,T1,M09,M10,T2,M11,M12,M13,M14,T3,M15,M16,M17,M18,M19,T4,M20,M21,M22,M23,M24,M25,M26,E,M27,M28,M29,T5,M30', 'acts 2 to 5 and Deel 4 in story order');
ok(new Set(STEPS.map((s) => s.id)).size === STEPS.length, 'step ids are unique');
const partOrder = ['kop', 'romp', 'staart', 'zuid', 'ontzet', 'nazomer'];
let pi = 0;
for (const s of STEPS) {
  const k = partOrder.indexOf(s.part);
  ok(k >= pi, `${s.id}: parts never go back`, s.part);
  pi = Math.max(pi, k);
  ok(s.built === true, `${s.id}: built (an unbuilt step stops the story)`);
  ok(PARTS[s.part] && PARTS[s.part].open, `${s.id}: its part is open`);
  ok(typeof s.title === 'string' && s.title.length > 3, `${s.id}: a title`);
  if (s.kind !== 'mission' || s.id !== 'M07') ok(Array.isArray(s.lead) && s.lead.length === 2 && s.lead[1].length > 20 || s.id.startsWith('M0') || s.id === 'E', `${s.id}: a lead (the goal in the HUD before the mission starts)`);
}
for (const p of partOrder) ok(NPARTS[p].card && NPARTS[p].card.length >= 2, `${p}: an end card`);

// --- walking the story
{
  const done = new Set(), passed = new Set();
  const seen = [];
  for (let guard = 0; guard < 100; guard++) {
    const nx = nextStoryStep((id) => done.has(id), (i) => passed.has(i));
    if (nx.finale) { ok(nx.end === 'nazomer', 'the walk ends on the end of Deel 4, the last part', nx.end); break; }
    ok(!nx.end, 'the walk never hits a part end before the finale', JSON.stringify(nx.end));
    seen.push(nx.id);
    done.add(nx.id);
    if (nx.kind === 'mission') passed.add(missionIndexOf(nx.mission));
  }
  ok(seen.join() === STEPS.map((s) => s.id).join(), 'the walk visits every step once, in order', seen.length + '/' + STEPS.length);
}
// Deel 4 waits for the finale card of act 5: with the gate the walk stops on that card, and goes on once it has played
{
  const done = new Set(STEPS.filter((s) => s.part !== 'nazomer').map((s) => s.id)), passed = new Set(STEPS.filter((s) => s.kind === 'mission' && s.part !== 'nazomer').map((s) => missionIndexOf(s.mission)));
  const closed = nextStoryStep((id) => done.has(id), (i) => passed.has(i), () => false);
  ok(closed.finale === true && closed.end === 'ontzet' && closed.next === null, 'before the finale card the story ends on the finale of act 5 (Deel 4 waits)', JSON.stringify(closed.end));
  const open = nextStoryStep((id) => done.has(id), (i) => passed.has(i), (p) => p === 'ontzet');
  ok(open.id === 'M27', 'once the finale card has played, Deel 4 starts at M27', open.id || JSON.stringify(open));
  const mid = new Set([...done, 'M27']);
  ok(nextStoryStep((id) => mid.has(id), (i) => passed.has(i), () => false).id === 'M28', 'a save that is already in Deel 4 is not held back by the gate');
}
// a save in the middle: steps before k done -> k is next (by step ids, by passed missions only, and by passed missions with ids lost)
STEPS.forEach((st, k) => {
  const before = STEPS.slice(0, k);
  const byId = nextStoryStep((id) => before.some((b) => b.id === id), (i) => before.some((b) => b.kind === 'mission' && missionIndexOf(b.mission) === i));
  ok(byId.id === st.id, `save before ${st.id}: it is next`, byId.id || JSON.stringify(byId));
  const byMissions = nextStoryStep(() => false, (i) => before.some((b) => b.kind === 'mission' && missionIndexOf(b.mission) === i));
  // activities between passed missions are moot, activities after the last passed mission are not
  const lastMission = before.filter((b) => b.kind === 'mission').at(-1);
  const li = lastMission ? STEPS.indexOf(lastMission) : -1;
  const expect = STEPS.slice(li + 1).find((s) => !stepDone(STEPS.indexOf(s), () => false, (i) => before.some((b) => b.kind === 'mission' && missionIndexOf(b.mission) === i)));
  ok(byMissions.id === expect.id, `save with only missions passed before ${st.id}: resumes at ${expect.id}`, byMissions.id);
});
// a mission played ahead of the story makes the activities before it moot, and never undoes an earlier step
{
  const ahead = (id) => stepDone(STEPS.findIndex((s) => s.id === id), () => false, (i) => i === missionIndexOf('graan'));
  ok(ahead('T3') && ahead('M15') && !ahead('M12') && !ahead('M16'), 'a passed M15 makes T3 moot and does not pass M16');
}

// --- defs
const byIdx = (id) => defs[MISSION_IDS.indexOf(id)];
const oud = A.MISSION_IDS.length - NEW_MISSION_IDS.length;
ok(new Set(MISSION_IDS).size === MISSION_IDS.length, 'MISSION_IDS has no duplicates');
// frozen: indices live in saves, so this list may only ever grow at the end
const FROZEN = ['loket', 'bakkiestunt', 'containers', 'dijk', 'graan', 'bruggen', 'wiebelwerk', 'stoom', 'beleg', 'luik', 'colonne', 'eieren', 'wierde', 'inpakken', 'wisselwoning', 'terug', 'proefbeleg'];
ok(FROZEN.every((id, i) => NEW_MISSION_IDS[i] === id), 'NEW_MISSION_IDS keeps its frozen prefix (add-only)');
ok(defs.length >= MISSION_IDS.length, 'a def per mission id', `${defs.length}/${MISSION_IDS.length}`);
ok(MISSION_IDS.slice(0, oud).length === oud && MISSION_IDS.indexOf(NEW_MISSION_IDS[0]) === oud, 'the new ids come after the old ones');
const used = new Map();
const missionSteps = STEPS.filter((s) => s.kind === 'mission');
for (const st of missionSteps) {
  const i = MISSION_IDS.indexOf(st.mission);
  ok(i >= 0, `${st.id}: ${st.mission} is a mission id`);
  ok(!used.has(st.mission), `${st.id}: its def is not shared with ${used.get(st.mission)}`);
  used.set(st.mission, st.id);
  ok(!!defs[i], `${st.id}: the def exists`);
}
for (const id of NEW_MISSION_IDS) ok(used.has(id), `${id}: a story step plays it (no unreachable mission)`);
// the missions the list shows are exactly the ones of the story, plus the loose side missions (#400) after them
const listed = new Set(M.getMissionList().map((m) => m.code));
for (const st of missionSteps) ok(listed.has(st.id), `${st.id}: shown in the mission list`);
const side = M.getMissionList().filter((m) => !m.code);
ok(M.getMissionList().filter((m) => m.code).length === missionSteps.length && side.every((m) => m.index >= MISSION_IDS.length) && new Set(M.getMissionList().map((m) => m.index)).size === M.getMissionList().length, 'the mission list shows the story missions once, plus the loose side missions', `${M.getMissionList().length}/${missionSteps.length}`);

const KINDS = new Set([...src.matchAll(/case '([a-z]+)':/g)].map((m) => m[1]));
const REQS = new Set([...src.slice(src.indexOf('const REQUIREMENTS = {')).matchAll(/^  ([a-z]+): \{$/gm)].map((m) => m[1]));
ok(KINDS.has('goto') && KINDS.has('hold') && KINDS.has('chase') && REQS.has('night'), 'stage kinds and requirements were read from missions.js', `${KINDS.size}/${REQS.size}`);
// plan and vault are panels and scenes of their own: their label is a title, the HUD goal comes from the scene
const NOSAY = new Set(['scene', 'shot', 'board', 'plan', 'vault']);
const OLD_PLOT = /Boer Roelf|\bHilje\b|\bde Grunn\b/;
const insideOutline = (poly, x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const inProvince = (p) => p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x > -45000 && p.x < 62000 && p.y > -45000 && p.y < 22000;
for (const st of missionSteps) {
  const d = byIdx(st.mission);
  if (!d) continue;
  const tag = st.id;
  ok(Number.isFinite(d.start && d.start.x) && Number.isFinite(d.start.y), `${tag}: a start`);
  ok(insideOutline(FALLBACK.outline, d.start.x, d.start.y), `${tag}: the start is inside the province's outline`, JSON.stringify(d.start));
  ok(!OLD_PLOT.test(JSON.stringify(d)), `${tag}: nothing of the old plot (Boer Roelf, Hilje) or "de Grunn"`);
  ok(typeof d.label === 'string' && d.label.length > 3, `${tag}: a label`);
  ok(d.reward === st.reward, `${tag}: the def pays what the step says`, `${d.reward}/${st.reward}`);
  for (const sc of st.scenes || []) ok(scenes.has(sc), `${tag}: scene ${sc} exists`);
  for (const k of ['intro', 'outro', 'replay']) for (const sc of [].concat((st.story || {})[k] || [])) ok(scenes.has(sc), `${tag}: ${k} scene ${sc} exists`);
  const stages = d.stages || [];
  ok(stages.length > 0 || !!d.type, `${tag}: stages or a type`);
  for (const [j, q] of stages.entries()) {
    ok(KINDS.has(q.kind), `${tag}: stage ${j} kind ${q.kind} is handled by missions.js`);
    if (!NOSAY.has(q.kind)) ok(typeof q.label === 'string' && q.label.length > 8, `${tag}: stage ${j} (${q.kind}) says its goal in the HUD`, q.label);
    for (const k of ['script', 'talk']) if (q[k]) for (const sc of q[k].ids) ok(scenes.has(sc), `${tag}: stage ${j} ${k} scene ${sc} exists`);
    if (q.target && typeof q.target.x === 'number') ok(inProvince(q.target), `${tag}: stage ${j} target is in the province`);
    if (q.kind === 'goto' && !q.target) ok(false, `${tag}: stage ${j} goto has a target`);
  }
  // a mission that is not staged still has to tell what to do
  if (!stages.length) ok(typeof d.say === 'string' || typeof d.intro === 'object' || (st.lead && st.lead[1]), `${tag}: says what to do`);
  for (const key of [].concat(d.requires || [])) {
    ok(REQS.has(key), `${tag}: requirement ${key} exists`);
    ok(['night', 'boat', 'heist', 'bike', 'car', 'racecar', 'weapon'].includes(key), `${tag}: requirement ${key} can be met`);
  }
  for (const w of d.waypoints || []) ok(inProvince(w), `${tag}: a waypoint in the province`);
}
// the shared old defs that the new story reuses must carry the new plot's text (applyNieuw): a few probes
for (const id of ['traumaduif', 'kroegentocht', 'fjord', 'vlag', 'skutsje']) {
  const d = byIdx(id);
  ok(!!d && ((d.stages && d.stages.length > 0) || (d.waypoints && d.waypoints.length > 0)), `${id}: restaged for the new story`);
}

// --- travel
const TOWN = { Winsum: [53.3301, 6.5203], Warffum: [53.3845, 6.5612], Zoutkamp: [53.3377, 6.2986], Lauwersoog: [53.4063, 6.2053], Eemshaven: [53.4410, 6.8350], Winschoten: [53.1444, 7.0356], Veendam: [53.1058, 6.8756], Stadskanaal: [52.9889, 6.95], 'Ter Apel': [52.8780, 7.0600], Bourtange: [53.0069, 7.1914], Zuidhorn: [53.2481, 6.405], Loppersum: [53.3306, 6.7494] };
for (const st of STEPS.filter((s) => s.goal && s.goal.type === 'reis')) {
  const [x, y] = wgsToWorld(st.goal.at[0], st.goal.at[1]);
  ok(insideOutline(FALLBACK.outline, x, y), `${st.id}: the travel goal is inside the province`);
  ok(st.goal.r >= 200 && st.goal.r <= 800, `${st.id}: a sensible arrival radius`, st.goal.r);
  ok(!!REISBEATS[st.id], `${st.id}: a travel step has its beat`);
}
for (const [id, b] of Object.entries(REISBEATS)) {
  const st = STEPS.find((s) => s.id === id);
  if (!st || !TOWN[b.to]) continue;
  // the beat plays in front of the step and takes you to where the step starts
  let at;
  if (st.kind === 'mission') { const d = byIdx(st.mission); at = d && d.start; } else if (st.goal && st.goal.at) { const [x, y] = wgsToWorld(st.goal.at[0], st.goal.at[1]); at = { x, y }; }
  if (!at) continue;
  const [tx, ty] = wgsToWorld(TOWN[b.to][0], TOWN[b.to][1]);
  const km = Math.hypot(at.x - tx, at.y - ty) / 1000;
  ok(km < 9, `${id}: its beat goes to ${b.to}, the step starts ${km.toFixed(1)} km from there`);
}

// cutscene cameras are judged against the whole province (#10: Hogeland, Wadden and Bourtange are far outside the city)
{
  const ext = /WORLD_EXTENT = \[(-?\d+), (-?\d+), (-?\d+), (-?\d+)\]/.exec(fs.readFileSync(new URL('js/cinematics.js', root), 'utf8'));
  const xs = FALLBACK.outline.map((p) => p[0]), ys = FALLBACK.outline.map((p) => p[1]);
  ok(!!ext && +ext[1] <= Math.min(...xs) && +ext[2] <= Math.min(...ys) && +ext[3] >= Math.max(...xs) && +ext[4] >= Math.max(...ys), 'the cinematic camera extent covers the province outline');
}

// --- money
{
  for (const share of [1, 0]) {
    const t = computeMoneyTimeline(undefined, share === 0 ? 0.0001 : 1);
    ok(t.low === Infinity || t.low >= 0, `worst-case money stays >= 0 before a purchase (pay share ${share})`, String(t.low));
  }
}

// --- save and load in the middle of an act: the chain follows the saved progress, the next story step is found again
{
  const prog = (upTo) => {
    const done = missionSteps.slice(0, upTo).map((s) => missionIndexOf(s.mission));
    return { index: upTo < missionSteps.length ? missionIndexOf(missionSteps[upTo].mission) : 0, completed: done, seen: done, medals: {} };
  };
  const stub = { ...world, pigeonMode: false, player: { x: 0, y: 0, vx: 0, vy: 0 } };
  let threw = null;
  for (let k = 0; k <= missionSteps.length; k++) {
    try {
      M.setMissionProgress(stub, prog(k));
      const back = M.getMissionProgress();
      const p = prog(k);
      ok(back.index === p.index && p.completed.every((i) => back.completed.includes(i)) && back.completed.length === p.completed.length, `load after ${k} missions: the chain is restored`);
      ok(!M.isMissionActive(), `load after ${k} missions: no mission is left running`);
    } catch (e) { threw = threw || e; ok(false, `load after ${k} missions does not throw`, String(e && e.message)); }
  }
  // a hostile or old save: unknown and out of range indices are dropped, not trusted
  try {
    M.setMissionProgress(stub, { index: 9999, completed: [-1, 9999, 'x', MISSION_IDS.indexOf('beleg')], seen: [], medals: { 9999: 3 } });
    const back = M.getMissionProgress();
    ok(back.index === 0 && back.completed.join() === String(MISSION_IDS.indexOf('beleg')), 'a save with indices out of range is cleaned, not trusted');
    M.setMissionProgress(stub, null);
    ok(M.getMissionProgress().completed.length === 0, 'a save without mission progress is a fresh start');
  } catch (e) { ok(false, 'a damaged save does not throw', String(e && e.message)); }
}

// akte 4 and 5 (#147, #136): the scenes inside the missions are staged and the finale mixes bake, hold, chase and a choice
{
  await import('../game/js/cutscenes_akte4.js');
  const { MORE_SPECS, SPECS } = await import('../game/js/cutscenes_akte1.js');
  // scenes that are deliberately not staged: the flag fall (own camera), the solo card, and the stages that cut between several script scenes
  const SKIP = new Set(['M24.3', 'M21.4']);
  for (const st of missionSteps.filter((q) => ['zuid', 'ontzet'].includes(q.part))) {
    const d = defs[MISSION_IDS.indexOf(st.mission)];
    for (const [j, q] of (d.stages || []).entries()) {
      if (q.kind !== 'scene' || !q.script || q.script.from || q.script.to || q.script.ids.length !== 1 || q.reveal || q.cam) continue;
      const id = q.script.ids[0];
      if (SKIP.has(id)) continue;
      ok(!!(MORE_SPECS[id] || SPECS[id]), `${st.id}: scene stage ${j} (${id}) has a staging`);
    }
  }
  const fin = defs[MISSION_IDS.indexOf('ontzet')];
  const kinds = fin.stages.map((q) => q.kind);
  ok(['bake', 'hold', 'chase', 'choice'].every((k) => kinds.includes(k)), 'the finale mixes bake, hold, chase and a choice', kinds.join());
  ok(!/mag niet|mag je niet/i.test(JSON.stringify(defs)), 'no failure line says "mag niet"');
}

// --- acts 2 and 3: goal in the HUD, failure lines without 'dat mag niet' (#147)
{
  const A23 = ['Al het vet van Grunn', 'Fatbikes tellen niet als fiets', 'Heel aankomen is ook een kunst', 'Een trekker-limo op de wierde', 'Geleend van de Friezen',
    'Het staat niet in het rooster', 'Het containerlabyrint', 'De dijk', 'Laag over het graan', 'Nog eentje dan'];
  for (const label of A23) {
    const d = defs.find((q) => q.label === label);
    ok(!!d, 'act 2/3 def: ' + label);
    if (!d) continue;
    ok(typeof d.say === 'string' && d.say.length > 20 || (d.stages || []).some((q) => q.say && q.say.length > 20), label + ': the goal said aloud');
    if (Number.isFinite(d.timeLimit)) ok(typeof d.timeUp === 'string' && d.timeUp.length > 15, label + ': a time limit has its own failure line');
    if (d.vehicle === 'car') ok(d.vehicleFail && d.vehicleFail.gone && d.vehicleFail.wrecked && d.vehicleFail.left, label + ': a vehicle mission has vehicle failure lines');
    const lines = [d.timeUp, ...Object.values(d.vehicleFail || {})].filter(Boolean).join(' | ');
    ok(!/mag niet|niet toegestaan|verboden/i.test(lines), label + ': failure lines never scold', lines);
  }
}

console.log(fails ? `${fails} of ${n} failed` : `${n}/${n} story flow checks passed`);
process.exit(fails ? 1 : 0);
