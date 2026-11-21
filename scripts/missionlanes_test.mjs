// #497: de uitgelichte fatbike-/kroegenlogica. De pure baanhelpers zijn los
// testbaar; de state komt via de host-naad.
//   node scripts/missionlanes_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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

t('Samen spelen (review 21-11): een geraakte gast krijgt zijn eigen melding, de host ziet hem niet als de zijne', () => {
  const st = { bikes: [] };
  const { meldAanActeur } = createMissionLanes(() => st);
  const w = { time: 10, msgs: [], gast: [], addMessage(t) { this.msgs.push(t); }, coopMeld(slot, t) { this.gast.push([slot, t]); } };
  assert.ok(meldAanActeur(w, { gast: false }, 'host raak', 2) && w.msgs.length === 1 && w.gast.length === 0, 'de host op zijn eigen scherm');
  assert.ok(meldAanActeur(w, { gast: true, slot: 2 }, 'gast raak', 2) && w.msgs.length === 1 && w.gast.length === 1 && w.gast[0][0] === 2, 'een gast via coopMeld, niet bij de host');
  assert.ok(!meldAanActeur(w, { gast: true, slot: 2 }, 'nog een', 2) && w.gast.length === 1, 'niet vaker dan eens per 1,5 s per gast');
  assert.ok(meldAanActeur(w, { gast: true, slot: 3 }, 'andere gast', 2) && w.gast.length === 2, 'een andere gast heeft een eigen teller');
  w.time = 12;
  assert.ok(meldAanActeur(w, { gast: true, slot: 2 }, 'later', 2) && w.gast.length === 3, 'na de wachttijd weer');
  assert.ok(!meldAanActeur({ time: 1, addMessage() {} }, { gast: true, slot: 1 }, 'x', 1), 'zonder coopMeld: stil, geen fout');
  const src = fs.readFileSync(new URL('../game/js/missionlanes.js', import.meta.url), 'utf8');
  assert.ok(!src.includes('world.addMessage(res.restart') && !src.includes('if (!a.gast) world.addMessage(`Ontweken'), 'de meldingen lopen via meldAanActeur');
  assert.ok(src.includes('if (isHost && world.armor > 0)'), 'het pantser van wie het spel opende betaalt niet voor een gast');
});

console.log(`missionlanes_test: ${n}/${n} ok`);
