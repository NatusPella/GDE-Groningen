// #497: de uitgelichte fatbike-/kroegenlogica. De pure baanhelpers zijn los
// testbaar; de state komt via de host-naad.
//   node scripts/missionlanes_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
const { createMissionLanes } = await import('../game/js/missionlanes.js');

let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };

t('een rechte baan: lengte, punt en projectie', () => {
  const def = { lane: [[0, 0], [10, 0], [20, 0]] };
  const { laneGeom, laneAt, laneProject } = createMissionLanes(() => ({}));
  const g = laneGeom(def);
  assert.equal(g.len, 20);
  assert.deepEqual(laneAt(g, 10), { x: 10, y: 0, a: 0, nx: -0, ny: 1 });
  const p = laneProject(g, 10, 2);
  assert.ok(Math.abs(p.s - 10) < 1e-9 && Math.abs(p.lat - 2) < 1e-9);
  assert.equal(laneGeom(def), g, 'de geometrie wordt gecachet');
});

t('de host-naad levert alle methoden', () => {
  const state = () => ({ bikes: [], crowd: [], laneT: 0 });
  const lanes = createMissionLanes(state);
  for (const m of ['startLane', 'updateLaneBikes', 'checkLaneHits', 'releaseLaneBikes', 'spawnCrowds', 'updateCrowd', 'releaseCrowd']) assert.equal(typeof lanes[m], 'function', m);
  lanes.releaseLaneBikes({ vehicles: [] });
  lanes.releaseCrowd();
  assert.deepEqual(state().bikes, []);
});

t('de fatbike-marker leidt eerst langs de Ebbingebrug, dan naar Oma Trijntje', () => {
  const { laneTarget } = createMissionLanes(() => ({}));
  const brug = { x: 25, y: -260, text: 'brug' };
  const def = { notes: [brug], dest: { x: -289, y: -107 } };
  assert.equal(laneTarget(def, null), brug, 'nog niet gelezen: de route gaat via de brug (dus door de fatbike-baan)');
  assert.equal(laneTarget(def, new Set()), brug);
  assert.equal(laneTarget(def, new Set([brug])), def.dest, 'na de brug: naar het einde');
  assert.equal(laneTarget({ dest: def.dest }, null), def.dest, 'zonder notes: direct naar het einde');
});

console.log(`missionlanes_test: ${n}/${n} ok`);
