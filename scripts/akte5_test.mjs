// Act 5 ("Ontzet", M22-M26) of the new arc: the defs of game/js/missions_akte5.js against the script and the steps.
// Pure (missions_akte5.js has no imports): every stage kind is one missions.js knows, every script scene a stage
// plays exists with the lines the range asks for, and each step's story ids are scenes of that step.
import fs from 'node:fs';
import { buildAkte5Defs, applyAkte5 } from '../game/js/missions_akte5.js';

const { STEPS, NEW_MISSION_IDS, PARTS } = await import('../game/js/storyarc_nieuw.js');
const data = JSON.parse(fs.readFileSync(new URL('../game/storydata/script.json', import.meta.url), 'utf8'));
const scene = new Map(data.scenes.map((s) => [s.id, s]));

let n = 0, bad = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FAIL ' + m); } };

const KINDS = new Set(['board', 'goto', 'hold', 'scene', 'pigeon', 'chase', 'bake', 'convoy', 'choice', 'timing']);
const spot = (x, y) => ({ x, y, road: { pts: [] } });
const fresh = buildAkte5Defs({ map: {}, walk: spot, drive: spot });
ok(fresh.length === 2 && fresh.map((d) => d.mid).join() === 'luik,colonne', 'two new defs: luik and colonne');
ok(fresh.every((d) => NEW_MISSION_IDS.includes(d.mid)), 'their ids are appended to NEW_MISSION_IDS');
ok(NEW_MISSION_IDS.indexOf('luik') < NEW_MISSION_IDS.indexOf('colonne'), 'luik before colonne');

// the old defs as applyAkte5 finds them: the minimum it touches
const old = [
  { label: 'Er hangt iets Fries aan d\'Olle Grieze', start: spot(1, 1), stages: [{ kind: 'scene', showFlag: true, lines: [['A', 'x']] }, { kind: 'pigeon', spot: 'martini', targets: [] }, { kind: 'scene', dropFlag: true, lines: [['A', 'y']] }] },
  { label: 'Het bod viel tegen', start: spot(2, 2), eggs: { from: 2 }, stages: [{ kind: 'goto' }] },
  { label: 'Ontzet, net als in 1672', start: spot(3, 3), stages: [{ kind: 'hold' }, { kind: 'scene' }, { kind: 'board' }, { kind: 'chase', swarm: { lines: [] } }, { kind: 'scene' }] },
];
applyAkte5(old);
const defs = [...fresh, ...old];
const byLabel = (l) => defs.find((d) => d.label === l);

function checkRange(ref, where) {
  for (const id of ref.ids) {
    const sc = scene.get(id);
    ok(!!sc, `${where}: scene ${id} exists`);
    if (!sc) continue;
    const len = sc.lines.length;
    const from = ref.from || 0, to = ref.to ?? len;
    ok(from < to && to <= len, `${where}: ${id} lines ${from}-${to} of ${len}`);
  }
}

for (const d of defs) {
  ok(d.stages && d.stages.length >= 2, `${d.label}: has stages`);
  d.stages.forEach((st, k) => {
    const where = `${d.label} #${k + 1} (${st.kind})`;
    ok(KINDS.has(st.kind), `${where}: a known stage kind`);
    if (st.kind !== 'scene') ok(typeof st.label === 'string' && st.label.length > 8, `${where}: the goal is said aloud (label)`);
    if (st.script) checkRange(st.script, where + ' script');
    if (st.talk) checkRange(st.talk, where + ' talk');
    if (st.swarm && st.swarm.script) checkRange(st.swarm.script, where + ' swarm');
    if (st.kind === 'scene') ok(!!st.script || (st.lines && st.lines.length), `${where}: a scene says something`);
    if (st.kind === 'bake') ok(['practice', 'contest'].includes(st.recipe) && st.rounds >= 1, `${where}: a recipe and rounds`);
  });
}

const akte5 = STEPS.filter((s) => s.part === 'ontzet' && s.kind === 'mission');
ok(akte5.length === 5 && akte5.every((s) => s.built), 'five missions in act 5, all built');
for (const s of akte5) {
  for (const k of ['intro', 'outro', 'replay']) {
    for (const id of (s.story && s.story[k]) || []) ok(scene.has(id) && scene.get(id).step === s.id, `${s.id}: story ${k} ${id} is a scene of the step`);
  }
  for (const id of s.scenes) ok(scene.has(id), `${s.id}: scene ${id} exists`);
  ok(Array.isArray(s.lead) && s.lead.length === 2, `${s.id}: has a lead`);
}
// every scene of the five steps is played somewhere: story ids or a stage of the def
const played = new Set();
for (const s of akte5) for (const k of ['intro', 'outro', 'replay']) for (const id of (s.story && s.story[k]) || []) played.add(id);
for (const d of defs) for (const st of d.stages) {
  for (const r of [st.script, st.talk, st.swarm && st.swarm.script]) if (r) r.ids.forEach((id) => played.add(id));
  for (const alt of [...Object.values(st.scriptTier || {}), ...(st.scriptIf || []).map((q) => q.ids)]) alt.forEach((id) => played.add(id));
}
for (const s of akte5) for (const id of s.scenes) ok(played.has(id), `${s.id}: scene ${id} is played by the step or a stage`);

// the finale: bake -> stall -> board -> block -> fall -> Mem -> jury's question -> jury, then the outro of the step
const fin = byLabel('Ontzet, net als in 1672');
ok(fin.stages.map((q) => q.kind).join() === 'bake,hold,board,timing,timing,scene,chase,scene,scene,choice,scene,scene,scene', 'the finale runs in order (the column closes the streets before the limo chase)');
{
  // M23 ally: one remembered choice, read again in M26 (chase time, wider zone, the street scene)
  const col = byLabel('De colonne');
  ok(col.stages[0].kind === 'choice' && col.stages[0].rounds[0].options.map((o) => o.tag).join() === 'bond-bus,bond-trekker,bond-scooter', 'M23: choose the ally next to the Fjord Frituur');
  ok(col.remember.join() === 'bond-bus,bond-trekker,bond-scooter', 'M23: the ally is remembered for M26');
  ok(col.stages[1].scriptIf.map((q) => q.tag).join() === 'bond-bus,bond-trekker,bond-scooter', 'M23: a scene per ally');
  ok(col.stages.find((q) => q.kind === 'convoy').limoAfterIf['bond-bus'] > 30, 'M23: the bus holds the limo back');
  const lim = fin.stages.find((q) => q.kind === 'chase');
  ok(lim.timeIf['bond-trekker'] > lim.time && lim.timeIf['bond-bus'] > lim.time, 'M26: the ally gives the chase more time');
  const streets = fin.stages.filter((q) => q.kind === 'timing')[1];
  ok(streets.rounds.length === 3 && streets.rounds.every((r) => r.zoneIf), 'M26: the column closes three streets, the ally the surest');
  ok(fin.stages.filter((q) => q.kind === 'scene')[0].scriptIf.length === 3, 'M26: the street scene has a line per ally');
}
ok(fin.stages.find((q) => q.kind === 'chase').keep === true, 'the limo is not adopted as a mission car');
ok(byLabel('Een luik erin').stages.filter((q) => q.mud).length === 3, 'the mud is a slalom of three drives');
ok(byLabel('Een luik erin').stages.some((q) => q.kind === 'timing' && q.kicker === 'Los uit de modder' && q.rounds.length === 3), 'stuck in the mud is a rocking rhythm, not a wait (#218)');
ok(fresh.every((d) => d.heroCar), 'the new defs use the Escapade');

// the finale card (story.js playFinale) is the epilogue and the studio of the script, word for word
const E = ['E1', 'E2'].flatMap((id) => scene.get(id).lines).map((l) => [l.key === 'rikus' ? 'Rikus' : l.speaker, l.text]);
ok(JSON.stringify(PARTS.ontzet.card) === JSON.stringify(E), 'PARTS.ontzet.card is E1 + E2 of the script');
ok(PARTS.ontzet.finale === true && STEPS[STEPS.length - 1].id === 'E' && STEPS[STEPS.length - 1].built, 'the epilogue step is built and last');
ok(PARTS.ontzet.card[PARTS.ontzet.card.length - 1][0] === 'Rikus', 'the card ends in the studio (Rikus)');

console.log(`${n - bad}/${n} act 5 checks passed`);
process.exit(bad ? 1 : 0);
