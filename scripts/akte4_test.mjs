// Akte 4 "Zuidwaarts" of the new story (#163): steps, defs, places, the choice rules.
//   node scripts/akte4_test.mjs
// - M17-M21 and T4 are built, in order, with scenes that exist in script.json, a lead, a reward equal to the def's
// - the new defs sit in NEW_MISSION_IDS in the order buildAkte4Defs returns them; every stage kind is one missions.js handles
// - every `ll` place lies in the right town (distance to the real centre) and inside the province's outline
// (stagerit.js imports railway.js and so the whole renderer chain: it is checked with node --check only)
// - the choice stage (stagechoice.js): a wrong answer twice fails the intake, the wagon's ball is the way out, Tammo's friends never fail
import './node3d.mjs';
import fs from 'node:fs';

const { STEPS, NEW_MISSION_IDS, CLUES, PARTS } = await import('../game/js/storyarc_nieuw.js');
const { buildAkte4Defs, applyAkte4, PLACES } = await import('../game/js/missions_akte4.js');
const { buildNieuwDefs, applyNieuw } = await import('../game/js/missions_nieuw.js');
const { stepChoice, enterChoice } = await import('../game/js/stagechoice.js');
const { wgsToWorld } = await import('../game/js/rdnew.js');
const { FALLBACK } = await import('../game/js/regiondata.js');
const { MISSION_IDS } = await import('../game/js/storyarc.js');
const root = new URL('../game/', import.meta.url);
const script = JSON.parse(fs.readFileSync(new URL('storydata/script.json', root), 'utf8'));
const scenes = new Map(script.scenes.map((s) => [s.id, s]));
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

// --- steps
const ids = ['M17', 'M18', 'M19', 'T4', 'M20', 'M21'];
const at = ids.map((id) => STEPS.findIndex((s) => s.id === id));
ok(at.every((i, k) => i >= 0 && (k === 0 || i === at[k - 1] + 1)), 'M17, M18, M19, T4, M20, M21 follow each other in STEPS', at.join());
for (const id of ids) {
  const st = STEPS.find((s) => s.id === id);
  ok(st.part === 'zuid' && st.built === true, `${id}: part zuid, built`);
  ok(Array.isArray(st.lead) && st.lead[1].length > 20, `${id}: a lead`);
  for (const sc of st.scenes || []) ok(scenes.has(sc), `${id}: scene ${sc} exists`);
  if (st.kind === 'mission') {
    ok(MISSION_IDS.includes(st.mission), `${id}: def id ${st.mission} is in MISSION_IDS`);
    ok(st.story && (st.story.intro || []).every((x) => scenes.has(x)) && (st.story.replay || []).every((x) => scenes.has(x)), `${id}: story scenes exist`);
    ok(st.reward > 0, `${id}: a reward`);
  }
}
ok(STEPS.find((s) => s.id === 'T4').goal.type === 'reis' && STEPS.find((s) => s.id === 'T4').goal.at.length === 2, 'T4: a travel goal with a place');
ok(STEPS.find((s) => s.id === 'M21').story.outro === null, 'M21: no outro scene (the last stage tells it)');
ok(STEPS.find((s) => s.id === 'M21').solo === true && STEPS.find((s) => s.id === 'M21').player === 'anita', 'M21: solo, Tessa starts');
ok(PARTS.zuid.open && PARTS.zuid.recap.length === 3 && PARTS.zuid.card.length === 2, 'the zuid part: open, a recap, an end card');
for (const id of ['M17', 'M18', 'M19', 'M20', 'M21']) ok(CLUES.filter((c) => c.step === id).length >= 2, `${id}: clues for Wat weten we?`);
ok(CLUES.some((c) => c.step === 'M18' && /12 augustus/.test(c.text)), 'M18: the 12 August clue');

// --- defs
const mine = buildAkte4Defs();
const ours = ['bruggen', 'wiebelwerk', 'stoom', 'beleg'];
ok(mine.length === 4, 'four new defs');
const base = NEW_MISSION_IDS.indexOf('bruggen');
ok(base >= 2 && ours.every((id, k) => NEW_MISSION_IDS[base + k] === id), 'NEW_MISSION_IDS has bruggen, wiebelwerk, stoom, beleg in a row');
const map = { meta: { landmarks: [] } };
const all = buildNieuwDefs({ map, walk: (x, y) => ({ x, y, road: null }), drive: (x, y) => ({ x, y, road: null }) });
ok(all.length === NEW_MISSION_IDS.length, 'buildNieuwDefs returns one def per new mission id', `${all.length}/${NEW_MISSION_IDS.length}`);
ok(all[base].label === 'Open, dicht' && all[base + 3].label === 'Het beleg van Bourtange', 'the defs are in the order of the ids');
const KINDS = new Set(['board', 'goto', 'hold', 'scene', 'choice', 'rit', 'timing', 'garage', 'escape', 'chase', 'boatchase', 'train', 'heli', 'vault', 'pigeon']);
const src = fs.readFileSync(new URL('js/missions.js', root), 'utf8');
for (const d of mine) {
  ok(Number.isFinite(d.start.x) && Number.isFinite(d.start.y), `${d.label}: start`);
  ok(STEPS.some((s) => s.kind === 'mission' && s.reward === d.reward && s.mission === ours[mine.indexOf(d)]), `${d.label}: reward equals the step's`);
  ok(d.stages.length >= 2 && d.stages.every((q) => KINDS.has(q.kind)), `${d.label}: known stage kinds`, d.stages.map((q) => q.kind).join());
  ok(d.stages.every((q) => q.label), `${d.label}: every stage says its goal`);
  for (const q of d.stages) if (q.script) for (const id of q.script.ids) ok(scenes.has(id), `${d.label}: scene ${id} exists`);
  for (const q of d.stages) if (q.talk) for (const id of q.talk.ids) ok(scenes.has(id), `${d.label}: talk scene ${id} exists`);
  for (const q of d.stages) for (const kind of [q.kind]) ok(new RegExp(`case '${kind}'`).test(src) || kind === 'board', `${d.label}: missions.js handles ${kind}`);
}
ok(mine[0].boatAt && mine[0].boatModel === 'sloep' && mine[0].stages[0].kind === 'board', 'bruggen: a sloep to board');
ok(mine[1].stages.map((q) => q.kind).join() === 'goto,choice,scene,goto,timing,timing,hold,goto', 'wiebelwerk: walk in, intake, how wary the manager got, servers (sneak past the cameras, harder when he is wary), logbook, out');
ok(mine[2].stages.some((q) => q.kind === 'rit' && q.exit), 'stoom: a train ride that ends outside the train');
ok(mine[3].stages.filter((q) => q.kind === 'hold' && q.fireworks).length >= 5, 'beleg: two walls and three cellar doors are held against the bangs, with a run in between');
const list = [{ label: 'Iedereen heeft een rode auto gezien', stages: [], start: {} }];
applyAkte4(list);
const fj = list[0];
ok(fj.fjordTrain === false && fj.stages.filter((q) => q.kind === 'choice').length === 2, 'fjord: Tessa\'s wagon choice and Tammo\'s friends');
void applyNieuw;

// --- places: near the real town, inside the province
const TOWN = { veendam: [53.1058, 6.8756], stadskanaal: [52.9889, 6.95], bourtange: [53.0069, 7.1914], zuidhorn: [53.2481, 6.405] };
const km = (a, b) => { const [ax, ay] = wgsToWorld(a[0], a[1]); const [bx, by] = wgsToWorld(b[0], b[1]); return Math.hypot(ax - bx, ay - by) / 1000; };
const town = (key) => (key.startsWith('veendam') || key.startsWith('wiebelwerk') ? 'veendam' : key.startsWith('stadskanaal') ? 'stadskanaal' : key.startsWith('bourtange') ? 'bourtange' : 'zuidhorn');
const inside = (poly, x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
for (const [key, p] of Object.entries(PLACES)) {
  const t = key === 'tinusSchuur' ? 'zuidhorn' : town(key);
  const d = km(p, TOWN[t]);
  ok(d < (key === 'tinusSchuur' ? 3.5 : 3), `${key}: ${d.toFixed(2)} km from ${t}`);
  const [x, y] = wgsToWorld(p[0], p[1]);
  ok(inside(FALLBACK.outline, x, y), `${key}: inside the province's outline`);
}

// --- the choice rules
const intake = fj.stages; void intake;
const wieb = mine[1].stages.find((q) => q.kind === 'choice');
const run = (st, keys) => {
  const S = {}; enterChoice(S);
  let r = null;
  for (const k of keys) { r = stepChoice(st, S, k, 0.1); for (let i = 0; i < 40 && !r && S.cphase === 'reply'; i++) r = stepChoice(st, S, null, 0.1); if (r) break; }
  return { r, S };
};
ok(run(wieb, ['2', '2', '1']).r === 'done' && run(wieb, ['2', '2', '1']).S.wrong === 0, 'intake: the right answers pass');
ok(run(wieb, ['1', '1', '2']).r && run(wieb, ['1', '1', '2']).r.fail, 'intake: three wrong answers fail');
ok(run(wieb, ['1', '1', '1']).r === 'done' && run(wieb, ['1', '1', '1']).S.wrong === 2, 'intake: two wrong answers are survived, with a wary manager (argwaan2)');
ok(run(wieb, ['1', '2', '1']).r === 'done' && run(wieb, ['1', '2', '1']).S.wrong === 1, 'intake: one wrong answer is forgiven (argwaan1)');
ok(wieb.countTag === 'argwaan' && wieb.rounds.length === 3, 'intake: three questions, the wrong answers are counted as argwaan1/argwaan2');
const wary = mine[1].stages.find((q) => q.kind === 'scene');
ok(wary.scriptIf.map((q) => q.tag).join() === 'argwaan2,argwaan1' && wary.scriptIf.every((q) => scenes.has(q.ids[0])), 'wiebelwerk: the manager scene has an outcome per number of wrong answers');
const sneaks = mine[1].stages.filter((q) => q.kind === 'timing');
ok(sneaks.length === 2 && sneaks[0].ifTag === 'argwaan1' && sneaks[1].unlessTag === 'argwaan1', 'wiebelwerk: a wary manager gets the harder hall, the others the plain one');
ok(sneaks[0].rounds.every((r, k) => r.speed > sneaks[1].rounds[k].speed && r.zone[1] - r.zone[0] < sneaks[1].rounds[k].zone[1] - sneaks[1].rounds[k].zone[0]), 'wiebelwerk: the harder hall is faster and its dark zone narrower');
const wagon = fj.stages.find((q) => q.kind === 'choice' && q.kicker === 'Op de wagon');
ok(run(wagon, ['1']).r === 'done', 'wagon: the car passes');
ok(run(wagon, ['2']).r === 'done', 'wagon: keeping the ball does not restart the mission (the reply tells the consequence)');
const friends = fj.stages.find((q) => q.kind === 'choice' && /vrienden/.test(q.kicker));
for (const combo of [['1', '1', '1', '1'], ['2', '2', '2', '2'], ['3', '3', '3', '3'], ['1', '2', '3', '1']]) ok(run(friends, combo).r === 'done', `friends: ${combo.join('')} always ends the mission, never a fail`);
ok(friends.rounds.length === 4 && friends.rounds.every((r) => r.options.every((o) => o.ok !== false || o.reply)), 'friends: four friends, every answer has a reply');

// the M20 duel ends in the real pole vault (missionstory.playDuelJump, missions.js timing stage)
ok(mine.some((d) => d.stages.some((q) => q.kind === 'timing' && q.vaultJump)), 'M20: the duel timing stage has vaultJump');
const ms = fs.readFileSync(new URL('js/missionstory.js', root), 'utf8');
ok(/export function playDuelJump/.test(ms) && /playDuelJump/.test(src), 'playDuelJump exists and missions.js uses it');
console.log(`${n - fails}/${n} akte 4 checks passed`);
process.exit(fails ? 1 : 0);
