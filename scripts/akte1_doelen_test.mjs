// Every mission goal of act 1 of the new story exists on the map (#120):
//   node scripts/akte1_doelen_test.mjs
// - the new defs (missions_nieuw.js): start and destination are on a road, the stunt square is open ground
// - the landmarks and shop types that the act's defs point at (missions.js) exist in stad.json
// - every act-1 mission step names a def, and a def with a scene list has its scenes in script.json
import './node3d.mjs';
import fs from 'node:fs';

const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
const { buildNieuwDefs } = await import('../game/js/missions_nieuw.js');
const { STEPS, NEW_MISSION_IDS } = await import('../game/js/storyarc_nieuw.js');
const { MISSION_IDS } = await import('../game/js/storyarc.js');
const root = new URL('../game/', import.meta.url);
const { loadStadData } = await import('./lib/loadworld.mjs');
const data = await loadStadData({ extras: true });
const map = new GameMap(data);
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

function roadSpot(x, y, drivable = false) {
  const p = map.nearestRoadPoint(x, y, 120, drivable) || { x, y, road: null };
  if (!map.isOpenSpot || map.isOpenSpot(p.x, p.y)) return p;
  return map.findOpenSpawn(p.x, p.y, 200, drivable) || p;
}
const defs = buildNieuwDefs({ map, walk: (x, y) => roadSpot(x, y), drive: (x, y) => roadSpot(x, y, true) });
ok(defs.length === NEW_MISSION_IDS.length, 'one new def per new mission id', `${defs.length}/${NEW_MISSION_IDS.length}`);
const byId = (id) => defs[NEW_MISSION_IDS.indexOf(id)];

for (const [i, d] of defs.entries()) {
  const id = NEW_MISSION_IDS[i];
  ok(Number.isFinite(d.start && d.start.x), `${id}: start`);
  if (d.type === 'deliver') {
    ok(!!d.start.road, `${id}: the start is on a drivable road (the car spawns there)`);
    ok(!!(d.dest && d.dest.road), `${id}: the destination is on a drivable road`);
    ok(map.nearestRoadPoint(d.dest.x, d.dest.y, 30, true) !== null, `${id}: a drivable road within 30 m of the destination`);
  }
  if (d.stunt) {
    const c = d.stunt.center;
    ok(map.isOpenSpot(c.x, c.y), `${id}: the stunt centre is open ground`);
    // the marker stands on the square: a drivable road must reach it, or the route guidance has nowhere to go
    ok(map.nearestRoadPoint(c.x, c.y, 60, true) !== null, `${id}: a drivable road within 60 m of the stunt centre`);
  }
}
ok(MISSION_IDS.slice(-NEW_MISSION_IDS.length).join() === NEW_MISSION_IDS.join(), 'MISSION_IDS ends with the new ids (append-only)');

// landmarks and shops the act's defs refer to
const missionsSrc = fs.readFileSync(new URL('js/missions.js', root), 'utf8') + fs.readFileSync(new URL('js/missions_nieuw.js', root), 'utf8');
const lms = new Set(map.meta.landmarks.map((l) => l.name));
for (const m of missionsSrc.matchAll(/landmark: '([^']+)'/g)) ok(lms.has(m[1]), `landmark "${m[1]}" exists`);
const shopTypes = new Set((map.meta.shops || []).map((s) => s.t));
for (const m of missionsSrc.matchAll(/target: \{ shop: '([^']+)'/g)) ok(shopTypes.has(m[1]), `shop type "${m[1]}" has places on the map`);

// every built act-1 mission step names a def
const script = JSON.parse(fs.readFileSync(new URL('storydata/script.json', root), 'utf8'));
const scenes = new Set((script.scenes || script).map((s) => s.id));
for (const s of STEPS.filter((q) => q.kind === 'mission' && q.built)) {
  ok(MISSION_IDS.includes(s.mission), `${s.id}: def id "${s.mission}" is in MISSION_IDS`);
  for (const sc of s.scenes || []) ok(scenes.has(sc), `${s.id}: scene ${sc} is in script.json`);
}
// M03 Het Loket (#147): the queue is a timed wait, and every step says its goal aloud
const loket = byId('loket');
ok(loket.stages.map((q) => q.kind).join() === 'goto,hold,scene,goto,goto,goto', 'loket: ticket, wait in the queue, Jelle, form, stamp, pay');
for (const q of loket.stages) ok(!!q.label, `loket: stage ${q.kind} has a label`);
const hold = loket.stages.find((q) => q.kind === 'hold');
ok(hold.time > 0 && hold.ticks.length === 2, 'loket: the wait has a time and two ticks');
ok(loket.timeLimit > hold.time * 3 + 60, 'loket: enough time left after the wait with the clock at x3');
// M03 (#335): the counters stand at the Stadhuis, a real office, and not at the Goudkantoor (a restaurant): every stage target is open ground
// within 25 m of the Stadhuis footprint
const stadhuis = map.buildingsNear(131, 108, 40).find((b) => b.name === 'Stadhuis');
ok(!!stadhuis, 'loket: the Stadhuis is a building on the map');
const polyDist = (x, y, P) => { let d = Infinity; for (let i = 0; i < P.length - 1; i++) { const dx = P[i + 1][0] - P[i][0], dy = P[i + 1][1] - P[i][1], L2 = dx * dx + dy * dy || 1e-9, t = Math.max(0, Math.min(1, ((x - P[i][0]) * dx + (y - P[i][1]) * dy) / L2)); d = Math.min(d, Math.hypot(P[i][0] + dx * t - x, P[i][1] + dy * t - y)); } return d; };
for (const q of loket.stages.filter((q) => q.target)) {
  ok(!q.target.landmark, `loket: stage "${q.label}" is not tied to a landmark (the Goudkantoor is a restaurant)`);
  const [tx, ty] = q.target.at || [NaN, NaN];
  ok(Number.isFinite(tx) && map.isOpenSpot(tx, ty), `loket: "${q.label}" is open ground`, `${tx}, ${ty}`);
  ok(stadhuis && polyDist(tx, ty, stadhuis.pts) <= 25, `loket: "${q.label}" is within 25 m of the Stadhuis`);
}
ok(/Stadhuis/.test(loket.intro.join(' ')), 'loket: the intro names the Stadhuis');
// M02: the garage and delivery steps name the goal (#93)
const msrc = fs.readFileSync(new URL('js/missions_nieuw.js', root), 'utf8');
ok(/Schud de politie af/.test(msrc) && /Breng de automaat naar Sjabbe/.test(msrc), 'pinautomaat: goal labels say what to do');
// M04/M05 (#147): the duif photographs the fuse box too, the race says its goal aloud
ok(/De stroomkast achter de fietsenstalling/.test(msrc) && /Fotografeer 3 camera/.test(msrc), 'duifverkenning: goal names cameras, guards and fuse box');
ok(/Podium in de Kiezelrace/.test(msrc), 'kei: the start message names the goal');
// failure paths (#147): own time-up and lost-vehicle messages instead of the generic ones
ok(/Loket is dicht/.test(loket.timeUp), 'loket: own time-up message');
const bak = byId('bakkiestunt');
ok(/kattenfilmpje/.test(bak.timeUp) && bak.vehicleFail.gone && bak.vehicleFail.wrecked && bak.vehicleFail.left, 'bakkiestunt: time-up and lost-bakkie messages');
ok(/vehicleFail = \{ gone/.test(msrc) && /duif\.timeUp/.test(msrc) && /kei\.timeUp/.test(msrc), 'pinautomaat, duif and kei have own failure messages');
ok(/def\.timeUp \? def\.timeUp/.test(missionsSrc) && /vf\.wrecked/.test(missionsSrc), 'missions.js honours timeUp and vehicleFail');
// rewards and consequences are visible on the success card (#147)
ok(Array.isArray(loket.costRow) && /150/.test(loket.costRow[1]), 'loket: the card shows the entry fee (reward is 0)');
ok((msrc.match(/\.costRow = \[/g) || []).length >= 5, 'M02, M04, M05, M06, M07 show what they leave you with');
ok(/def\.costRow && !replay/.test(missionsSrc), 'missions.js adds costRow to the success card');
ok(/vet.costRow/.test(msrc) && /vet.vehicleFail/.test(msrc), 'M07: consequence row and own vehicle messages');
void byId;
console.log(`${n - fails}/${n} act-1 goal checks passed`);
process.exit(fails ? 1 : 0);
