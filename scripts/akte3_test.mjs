// Act 3 of the new story (M12-M16, T3) builds and hangs together (#163):
//   node scripts/akte3_test.mjs
// - every built act-3 step names a def of missions.js/missions_nieuw.js, its scenes are in script.json
// - the places are in the province (Eemsdelta, Oldambt, Lauwersoog), every stage target resolves, the heli variant exists
// - the Winschoten kermis has three tents with a toast, the container sneak runs on the bare heist
// The province tiles of the Eemsdelta are not in the repo: positions are checked as plausible, not against roads.
import fs from 'node:fs';
import './node3d.mjs';

const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
const M = await import('../game/js/missions.js');
const { STEPS, NEW_MISSION_IDS } = await import('../game/js/storyarc_nieuw.js');
const { MISSION_IDS, stepDone, missionIndexOf } = await import('../game/js/storyarc.js');
const { STEPS: ALL_STEPS } = await import('../game/js/storyarc.js');
const P = await import('../game/js/heliplan.js');
const { judgeGate } = await import('../game/js/planestage.js');
const root = new URL('../game/', import.meta.url);
const { loadStadData } = await import('./lib/loadworld.mjs');
const data = await loadStadData({ extras: true });
const map = new GameMap(data);
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

const world = { map, onRespawn: [], addMessage() {}, player: { x: 0, y: 0 }, vehicles: [], pedestrians: [] };
M.initMissions(world);
const defs = M.getMissionDefs();
const script = JSON.parse(fs.readFileSync(new URL('storydata/script.json', root), 'utf8'));
const scenes = new Set(script.scenes.map((s) => s.id));

// the province box: Lauwersoog in the west to the Dollard in the east, Eemshaven in the north to Winschoten in the south
const inProvince = (p) => p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x > -30000 && p.x < 48000 && p.y > -32000 && p.y < 14000;

const act3 = STEPS.filter((s) => s.part === 'staart');
ok(act3.map((s) => s.id).join() === 'M12,M13,M14,T3,M15,M16', 'act 3 steps in order');
for (const s of act3.filter((q) => q.kind === 'mission' && q.built)) {
  const id = s.mission;
  ok(MISSION_IDS.includes(id), `${s.id}: ${id} is in MISSION_IDS`);
  const def = defs[MISSION_IDS.indexOf(id)];
  ok(!!def, `${s.id}: the def exists`);
  if (!def) continue;
  for (const sc of s.scenes) ok(scenes.has(sc), `${s.id}: scene ${sc} in script.json`);
  for (const k of ['intro', 'outro', 'replay']) for (const sc of [].concat((s.story || {})[k] || [])) ok(scenes.has(sc), `${s.id}: ${k} scene ${sc} in script.json`);
  ok(inProvince(def.start), `${s.id}: the start is in the province`, JSON.stringify(def.start));
  ok(Array.isArray(s.lead) && s.lead[1].length > 20, `${s.id}: has a lead`);
  ok(/[A-Za-z]/.test(def.label) && !/\bde Grunn\b/.test(JSON.stringify(def)), `${s.id}: label, no "de Grunn"`);
  for (const [j, st] of (def.stages || []).entries()) {
    if (st.target) {
      const t = M.resolveMissionTarget(world, st.target, def.start);
      ok(inProvince(t), `${s.id}: stage ${j} (${st.kind}) target is in the province`, JSON.stringify(t));
    }
    if (st.kind !== 'scene' && st.kind !== 'shot') ok(typeof st.label === 'string' && st.label.length > 8, `${s.id}: stage ${j} says its goal`, st.label);
  }
  for (const w of def.waypoints || []) ok(inProvince(w), `${s.id}: waypoint in the province`);
}
ok(NEW_MISSION_IDS.length === new Set(NEW_MISSION_IDS).size, 'new mission ids are unique');

// M12: the rooster flight
const m12 = act3.find((s) => s.id === 'M12');
if (m12.built) {
  const d = defs[MISSION_IDS.indexOf('traumaduif')];
  ok(d.stages.length === 1 && d.stages[0].kind === 'heli' && d.stages[0].variant === 'rooster', 'M12: one heli stage, variant rooster');
  const plan = P.makePlan('rooster', { umcg: { x: 100, y: -300, deck: 50, r: 6 }, lauwersoog: P.ROOSTER.lauwersoog });
  ok(plan.legs.map((l) => l.kind).join() === 'cruise,pad,pickup,cruise,catch', 'M12: plan cruise, pad, pickup, cruise, catch');
  const near = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  ok(near(P.ROOSTER.lauwersoog, P.ROOSTER.dollard) > 40000 && near(P.ROOSTER.dollard, P.ROOSTER.eemshaven) > 15000, 'M12: Lauwersoog, Dollard and Eemshaven are tens of km apart');
}
// M13: bare heist with watchers
const m13 = act3.find((s) => s.id === 'M13');
if (m13.built) {
  const d = defs[MISSION_IDS.indexOf('containers')];
  ok(d.heist && d.heist.bare, 'M13: bare heist (no museum)');
  ok(d.stages.filter((q) => q.watch).length >= 3, 'M13: three sneak stages with guards and cameras');
  ok(d.stages.some((q) => q.kind === 'hold' && /kraan/.test(q.label)), 'M13: the crane cabin hold');
  ok(!d.stages.some((q) => ['lock', 'fuse', 'pickpocket', 'laser', 'crack', 'plan'].includes(q.kind)), 'M13: no museum-only heist stages');
}
// M14: the race on the road network
const m14 = act3.find((s) => s.id === 'M14');
if (m14.built) {
  const d = defs[MISSION_IDS.indexOf('dijk')];
  const race = d.stages.find((q) => q.kind === 'chase' && q.race);
  ok(!!race && race.finish && Number.isFinite(race.finish.x) && race.flee.length === 2, 'M14: a chase race stage with a finish');
  const km = race ? Math.hypot(race.finish.x - d.start.x, race.finish.y - d.start.y) / 1000 : 0;
  ok(km > 7 && km < 9, 'M14: the start is about 8 km from the sluis', String(km));
  ok(d.snapStart && d.vehicle === 'car' && d.stages[0].kind === 'board', 'M14: a car is put on the road at the start');
  ok(race && race.lost && race.won && race.talk.ids[0] === 'M14.2', 'M14: lost and won lines, the race talk from the script');
}
// M15: the plane
const m15 = act3.find((s) => s.id === 'M15');
if (m15.built) {
  const d = defs[MISSION_IDS.indexOf('graan')];
  ok(d.stages.map((q) => q.kind).join() === 'plane,airgates,landplane', 'M15: board, gates, land');
  const gates = d.stages[1].gates;
  ok(gates.length === 5 && gates.every((g) => inProvince(g) && g.r > 20 && g.lo < g.hi), 'M15: five gates in the province');
  ok(gates[0].banner && d.stages[1].banner.length > 10, 'M15: the first gate hangs the banner');
  const strip = d.stages[0].strip;
  ok(Math.hypot(gates[0].x - strip.x, gates[0].y - strip.y) < 600, 'M15: the banner pole stands at the end of the strip');
  ok(d.stages[1].talk.ids[0] === 'M15.2', 'M15: the talk over the kermis from the script');
  // judging a pass: right height passes at once; too high/low/wide is told once the plane is past
  const g = { r: 40, lo: 14, hi: 48 };
  ok(judgeGate(g, { closest: Infinity, agl: 0 }, 20, 30) === 'pass', 'M15: inside the ring and in the window passes');
  const run = (agl, lat) => { const st = { closest: Infinity, agl: 0 }; let r = null; for (let x = -300; x < 300 && !r; x += 5) r = judgeGate(g, st, Math.hypot(x, lat), agl); return r; };
  ok(run(90, 0) === 'high' && run(5, 0) === 'low' && run(30, 90) === 'wide' && run(30, 0) === 'pass', 'M15: high, low, wide and a pass');
}
// M16: the kermis of Winschoten
const m16 = act3.find((s) => s.id === 'M16');
if (m16.built) {
  const d = defs[MISSION_IDS.indexOf('kroegentocht')];
  const tents = d.waypoints.filter((w) => w.toast);
  ok(tents.length === 3 && d.onFoot, 'M16: three tents on foot');
  ok(d.crowds.length >= 4, 'M16: a crowd');
  ok(/Winschoten/.test(d.intro.join(' ')), 'M16: the intro says Winschoten');
}
// Save fixtures: a save is the done step ids plus the passed mission indices (savegame.js, story.js applyStorySave).
// Act 3 must read them the way the story order says: done is done, T3 is moot once M15 is passed, nothing earlier is undone.
{
  const idx = (id) => ALL_STEPS.findIndex((s) => s.id === id);
  const fixture = (doneIds, passedMissions) => {
    const done = new Set(doneIds), passed = new Set(passedMissions.map(missionIndexOf));
    return (id) => stepDone(idx(id), (x) => done.has(x), (i) => passed.has(i));
  };
  const a = fixture(['M12', 'M13'], ['traumaduif', 'containers']);
  ok(a('M12') && a('M13') && !a('M14') && !a('T3') && !a('M15') && !a('M16'), 'save after M13: M14 is next');
  const b = fixture(['M12', 'M13', 'M14', 'M15'], ['traumaduif', 'containers', 'dijk', 'graan']);
  ok(b('T3') && b('M15') && !b('M16'), 'save after M15: the train beat is moot, M16 is next');
  const c = fixture([], ['traumaduif', 'containers', 'dijk', 'graan', 'kroegentocht']);
  ok(c('M12') && c('M13') && c('M14') && c('M15') && c('M16') && c('T3'), 'passed missions alone mark act 3 done');
  ok(['traumaduif', 'containers', 'dijk', 'graan', 'kroegentocht'].every((m) => missionIndexOf(m) >= 0), 'the mission ids of act 3 are in MISSION_IDS');
  ok(missionIndexOf('traumaduif') === 14 && missionIndexOf('kroegentocht') === 5, 'indices of the shared ids did not move');
}
console.log(fails ? `${fails} of ${n} failed` : `${n}/${n} act-3 checks passed`);
process.exit(fails ? 1 : 0);
