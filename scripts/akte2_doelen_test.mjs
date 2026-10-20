// The missions of act 2 of the new story (#163): M08 Fatbikes, T1 trein naar Winsum, M09 eieren, M10 wierde,
// T2 streekbus, M11 de kust. Goals said aloud, places in the province, scenes in the script, the searchlight.
//   node scripts/akte2_doelen_test.mjs
import './node3d.mjs';
import fs from 'node:fs';

const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
const { buildNieuwDefs, applyNieuw } = await import('../game/js/missions_nieuw.js');
const { STEPS, NEW_MISSION_IDS, CLUES } = await import('../game/js/storyarc_nieuw.js');
const { wgsToWorld } = await import('../game/js/rdnew.js');
const L = await import('../game/js/searchlightlogic.js');
const root = new URL('../game/', import.meta.url);
const { loadStadData } = await import('./lib/loadworld.mjs');
const data = await loadStadData({ extras: true });
const map = new GameMap(data);
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

const models = { tractor: { name: 'tractor' }, quad: { name: 'quad' } };
const roadSpot = (x, y, drivable = false) => {
  const p = map.nearestRoadPoint(x, y, 120, drivable) || { x, y, road: null };
  return !map.isOpenSpot || map.isOpenSpot(p.x, p.y) ? p : map.findOpenSpawn(p.x, p.y, 200, drivable) || p;
};
const defs = buildNieuwDefs({ map, walk: (x, y) => roadSpot(x, y), drive: (x, y) => roadSpot(x, y, true), models });
const byId = (id) => defs[NEW_MISSION_IDS.indexOf(id)];
const script = JSON.parse(fs.readFileSync(new URL('storydata/script.json', root), 'utf8'));
const scene = (id) => script.scenes.find((s) => s.id === id);
const km = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) / 1000;
// the province (Hogeland, Wad, Lauwersmeer) in world metres: x -30000..10000, y -30000..-10000
const inProvince = (p) => p.x > -30000 && p.x < 12000 && p.y > -30000 && p.y < -10000;

ok(['eieren', 'wierde'].every((id) => NEW_MISSION_IDS.includes(id)), 'eieren and wierde are new mission ids (appended)');
ok(NEW_MISSION_IDS.length === new Set(NEW_MISSION_IDS).size, 'no mission id twice');

// --- the steps of act 2 are built, name their scenes and say where they stand ---
for (const id of ['M07', 'M08', 'T1', 'M09', 'M10', 'T2', 'M11']) {
  const st = STEPS.find((s) => s.id === id);
  ok(st && st.built, `${id}: built`);
  ok(st && st.lead && st.lead[1].length > 10, `${id}: has a lead`);
  for (const sc of (st && st.scenes) || []) ok(scene(sc), `${id}: scene ${sc} is in script.json`);
  if (st && st.story) for (const k of ['intro', 'outro', 'replay']) for (const sc of st.story[k] || []) ok(scene(sc), `${id}: story ${k} scene ${sc}`);
}
for (const id of ['T1', 'T2']) {
  const g = STEPS.find((s) => s.id === id).goal;
  const [x, y] = wgsToWorld(g.at[0], g.at[1]);
  ok(g.type === 'reis' && g.to && inProvince({ x, y }) && g.r >= 200, `${id}: a travel goal to ${g.to} in the province`);
}
for (const id of ['M08', 'M09', 'M10', 'M11']) ok(CLUES.some((c) => c.step === id), `${id}: leaves a clue`);

// every talk of a def points at lines that exist
const talks = (def) => [def.talk, ...(def.stages || []).map((q) => q.talk)].filter(Boolean);
const checkTalk = (name, t) => {
  for (const id of t.ids) {
    const sc = scene(id);
    ok(sc, `${name}: talk scene ${id}`);
    if (sc) ok((t.from || 0) < sc.lines.length && (t.to ?? sc.lines.length) <= sc.lines.length, `${name}: talk slice of ${id} inside its ${sc.lines.length} lines`, `${t.from}-${t.to}`);
  }
};
const allStages = (def) => def.stages || [];
const labelled = (name, def) => { for (const q of allStages(def)) ok(q.label, `${name}: stage ${q.kind} has a label`); };

// --- M09 eieren ---
const eieren = byId('eieren');
ok(eieren.type === 'stages' && eieren.vehicle === 'car' && eieren.vehicleModel && eieren.lazyStart, 'eieren: a tractor mission that finds its road when it starts');
ok(eieren.stages.map((q) => q.kind).join() === 'board,goto,goto', 'eieren: board, wierdepaden, kerkkelder');
ok(eieren.eggs.count === 60 && eieren.eggs.failAt === 50 && eieren.eggs.from === 1 && eieren.eggs.rough.per > 0, 'eieren: sixty eggs, more than half broken fails, bumps break eggs');
ok(/zestig eieren/.test(eieren.say) && /kerkkelder in Usquert/.test(eieren.stages[2].label), 'eieren: the goal is said aloud');
const e0 = eieren.start, e2 = { x: eieren.stages[2].target.at[0], y: eieren.stages[2].target.at[1] };
ok(inProvince(e0) && inProvince(e2) && km(e0, e2) > 2.5 && km(e0, e2) < 5, 'eieren: Warffum to Usquert is about 3 to 4 km', km(e0, e2).toFixed(1));
ok(eieren.vehicleFail.gone && eieren.vehicleFail.wrecked && eieren.vehicleFail.left && eieren.eggs.fail, 'eieren: own failure messages');
labelled('eieren', eieren);
for (const t of talks(eieren)) checkTalk('eieren', t);

// --- M10 wierde ---
const wierde = byId('wierde');
ok(wierde.type === 'stages' && wierde.vehicle === 'car' && wierde.vehicleModel && wierde.lazyStart, 'wierde: a quad mission');
ok(wierde.stages.map((q) => q.kind).join() === 'board,goto,vault,goto', 'wierde: board, shake off the limo, Jelle jumps, bus stop');
const chase = wierde.stages[1];
ok(chase.pursuer && chase.pursuer.model.name === 'trekkerlimo' && chase.pursuer.fail && chase.pursuer.caughtFor > 1, 'wierde: the tractor-limo pursues and can catch you');
ok(/sloot bij Uithuizen/.test(chase.label), 'wierde: the goal is said aloud');
ok(wierde.stages[2].fail === true && wierde.stages[2].script.ids[0] === 'M10.3', 'wierde: Jelle ends up in the ditch, with the lines of the script');
ok(km(wierde.start, { x: chase.target.at[0], y: chase.target.at[1] }) > 2 && inProvince(wierde.start), 'wierde: Usquert to the ditch is a real drive');
labelled('wierde', wierde);
for (const t of talks(wierde)) checkTalk('wierde', t);

// --- M11 de kust: replaces the Diepenring def of the old arc ---
const list = [{ label: 'Geleend van de Friezen', type: 'stages', stages: [{ kind: 'goto' }], requires: 'boat', startAt: 'rental' }];
applyNieuw(list);
const kust = list[0];
ok(kust.requires === undefined && kust.startAt === undefined && kust.boatStart, 'kust: the old def is replaced, not patched');
ok(kust.stages.map((q) => q.kind).join() === 'goto,boatchase,scene,goto,scene,scene,hold,hold,hold,goto', 'kust: boat, skûtsje, aboard, sandbank, night, marsh x3, back', kust.stages.map((q) => q.kind).join());
const path = kust.stages[1].path;
let plen = 0;
for (let i = 1; i < path.length; i++) plen += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
ok(plen > 8000 && plen < 20000 && path.every(([x, y]) => inProvince({ x, y })), 'kust: the skûtsje route over the Reitdiep and the Lauwersmeer is 8 to 20 km', String(Math.round(plen)));
ok(Math.hypot(kust.boatStart.x - path[0][0], kust.boatStart.y - path[0][1]) < 80, 'kust: the rubber boat lies at the start of the route');
const holds = kust.stages.filter((q) => q.kind === 'hold');
ok(holds.length === 3 && holds.every((q) => q.light && q.time >= 2 && q.ticks.length === 2), 'kust: three zoutkuipen, each with the searchlight over it');
ok(kust.stages[kust.stages.length - 1].light, 'kust: the light is still on the way back');
ok(holds[0].setTime >= 150 && /water/.test(kust.timeUp), 'kust: a tide timer starts at the marsh, with its own failure message');
ok(kust.stages.some((q) => q.warp && q.warp.at), 'kust: a hop from the sandbank to Noordpolderzijl');
ok(/skûtsje/.test(kust.say) && /kustwacht/.test(kust.say) && /Haal Jelles skûtsje/.test(kust.say), 'kust: the goal is said aloud');
const light = holds[0].light;
const salt = holds.map((q) => ({ x: q.target.at[0], y: q.target.at[1] }));
ok(salt.every((p) => Math.hypot(p.x - light.x, p.y - light.y) < light.range), 'kust: all three tubs are inside the range of the beam');
labelled('kust', kust);
for (const t of talks(kust)) checkTalk('kust', t);
ok(kust.stages[2].script.ids[0] === 'M11.3' && kust.stages[4].script.ids.join() === 'M11.5,M11.6', 'kust: the scenes of the script are stages');

// --- the searchlight: where it points, who is seen ---
const lt = { x: 0, y: 0, from: 1.4, to: 2.65, speed: 0.32, range: 500, half: 0.17, rate: 1.5, crouchRate: 0.3, decay: 0.3 };
for (let t = 0; t < 60; t += 0.7) { const a = L.sweepAngle(lt, t); ok(a >= lt.from - 1e-6 && a <= lt.to + 1e-6, 'light: the beam stays inside its arc', `${t}`); }
ok(L.inBeam(lt, 2, Math.cos(2) * 300, Math.sin(2) * 300), 'light: a point in the beam is seen');
ok(!L.inBeam(lt, 2, Math.cos(2.6) * 300, Math.sin(2.6) * 300), 'light: a point beside the beam is not');
ok(!L.inBeam(lt, 2, Math.cos(2) * 800, Math.sin(2) * 800), 'light: nor one beyond its range');
const stand = L.stepExposure(0, 0.5, true, false, lt), crouch = L.stepExposure(0, 0.5, true, true, lt);
ok(stand > crouch * 3, 'light: crouching in the grass fills the "gezien" meter far slower', `${stand} vs ${crouch}`);
ok(L.stepExposure(0, 1, true, false, lt) === 1 && L.stepExposure(1, 1, false, false, lt) === 0.7, 'light: a second in the beam standing is the end; outside it the meter empties');

// --- the plakjesbord: what Jelle bought, and how each slice ended ---
{
  const { plakjesState, PLAKJES } = await import('../game/js/plakjes.js');
  ok(PLAKJES.length === 8 && PLAKJES.every((p, i) => p.n === i + 1 && p.open && p.ended && ['gered', 'verloren', 'geblokkeerd'].includes(p.result)), 'plakjes: eight slices, each with a text for open and ended');
  ok(PLAKJES.every((p) => STEPS.some((s) => s.id === p.step) && STEPS.some((s) => s.id === p.reveal)), 'plakjes: every slice is settled and revealed by a step of the arc');
  ok(plakjesState(new Set(), 'M01').length === 0, 'plakjes: nothing on the board before the Loket');
  const a = plakjesState(new Set(['M00', 'M01', 'M02', 'M03', 'M04', 'M05', 'M06']), 'M07');
  ok(a.map((p) => p.n + p.state).join() === '1verloren,2open', 'plakjes: after the Loket the standplaatsen are lost, the vet is open', a.map((p) => p.n + p.state).join());
  const b = plakjesState(new Set(['M03', 'M07', 'M09', 'M11']), 'M12');
  ok(b.map((p) => p.n + p.state).join() === '1verloren,2gered,3gered,4gered,5open,6open,7open,8open', 'plakjes: after act 2 the first four are settled and the koopboek of M12 shows the rest', b.map((p) => p.n + p.state).join());
}

// --- the saves of act 2 (scripts/fixtures/saves): the steps they carry exist in the new arc and the story continues where they say ---
{
  const dir = new URL('../scripts/fixtures/saves/', import.meta.url);
  const fixtures = fs.readdirSync(dir).filter((f) => /nieuw-verhaal-akte2/.test(f));
  ok(fixtures.length >= 2, 'save fixtures for act 2 exist', String(fixtures.length));
  for (const f of fixtures) {
    const fx = JSON.parse(fs.readFileSync(new URL(f, dir), 'utf8'));
    const done = new Set(fx.save.story.done);
    ok([...done].every((id) => STEPS.some((s) => s.id === id)), `${f}: every done step is a step of the new arc`);
    const next = STEPS.find((s) => !done.has(s.id));
    ok(next && next.id === fx._expect.step && next.built, `${f}: continues at the built step ${fx._expect.step}`, next && next.id);
    // the missions it counts as completed are the defs of the done mission steps
    const { MISSION_IDS } = await import('../game/js/storyarc.js');
    const completed = new Set(fx.save.missions.completed);
    for (const s of STEPS.filter((q) => q.kind === 'mission' && done.has(q.id))) ok(completed.has(MISSION_IDS.indexOf(s.mission)), `${f}: ${s.id} (${s.mission}) is a completed mission`);
    const [x, y] = [fx.save.pos.x, fx.save.pos.y];
    ok(x > 150000 && x < 280000 && y > 560000 && y < 620000, `${f}: the player stands in the province (RD New)`);
  }
}

console.log(`${n - fails}/${n} act-2 goal checks passed`);
process.exit(fails ? 1 : 0);
