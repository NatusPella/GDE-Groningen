// Het verhaal-saveformaat (#845): v:1 is van vóór de tussenstappen A1/A2, v:2 is het huidige formaat. Een v:1-save
// blijft waar hij stond; alleen de tussenstappen die hij al voorbij was gaan dicht, anders zou de speler terugspringen.
// En een v:2-save laadt op dezelfde plek. story.js heeft THREE nodig voor zijn andere imports: scripts/node3d.mjs.
//   node scripts/storysave_test.mjs
import assert from 'node:assert/strict';
import './node3d.mjs';
const { applyStorySave, getStorySave, storyApi } = await import('../game/js/story.js');
const A = await import('../game/js/storyarc.js');

let n = 0, fails = 0;
const t = (name, f) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };

const idx = (id) => A.STEPS.findIndex((s) => s.id === id);
// een v:1-save van vóór de tussenstappen: de stappen van toen, dus zonder A1/A2
const voor = (id) => A.STEPS.slice(0, idx(id)).map((s) => s.id).filter((x) => !A.BETWEEN_STEPS.includes(x));
const v1 = (done, extra = {}) => ({ v: 1, done, skipped: [], fails: {}, waived: [], voorschot: [], cards: [], flags: [], ...extra });
const v2 = (done, extra = {}) => ({ ...v1(done), v: 2, ...extra });
const done = () => new Set(getStorySave().done);

t('een nieuwe save schrijft formaat v:2', () => {
  applyStorySave(v1(voor('M10')));
  assert.equal(getStorySave().v, 2);
});

t('v:1 vóór M10: de tussenstappen staan nog open en de save blijft bij M10', () => {
  applyStorySave(v1(voor('M10')));
  assert.equal(done().has('A1'), false, 'A1 nog open');
  assert.equal(done().has('A2'), false, 'A2 nog open');
  assert.equal(storyApi.current().id, 'M10');
});

t('v:1 net na M10: de speler krijgt de bietenoogst (A1 blijft open)', () => {
  applyStorySave(v1(voor('T2')));
  assert.equal(done().has('A1'), false, 'A1 nog open: het tussenstuk komt nog');
  assert.equal(storyApi.current().id, 'A1');
});

t('v:1 voorbij A1 (bij M11): A1 gaat dicht, A2 nog niet; geen terugspringen', () => {
  applyStorySave(v1(voor('M11')));
  assert.equal(done().has('A1'), true, 'A1 voorbij: dicht');
  assert.equal(done().has('A2'), false);
  assert.equal(storyApi.current().id, 'M11');
});

t('v:1 vlak vóór A2 (bij M17): A1 dicht, A2 nog open', () => {
  applyStorySave(v1(voor('M17')));
  assert.equal(done().has('A1'), true);
  assert.equal(done().has('A2'), false, 'A2 nog open: de kermisrit komt nog');
  assert.equal(storyApi.current().id, 'A2');
});

t('v:1 na M16/bij M18: beide tussenstappen dicht en de save blijft bij M18', () => {
  applyStorySave(v1(voor('M18')));
  assert.equal(done().has('A1'), true, 'A1 dicht');
  assert.equal(done().has('A2'), true, 'A2 dicht');
  assert.equal(storyApi.current().id, 'M18');
});

t('v:2 wordt niet gemigreerd en laadt op dezelfde plek', () => {
  // een echte v:2-save heeft A1/A2 zelf al of niet; hier mist A1/A2 opzettelijk en de latere missie maakt A1 moot
  applyStorySave(v2(voor('M18'), { skipped: ['M05'], fails: { M03: 2 }, cards: ['kop'], flags: ['met:berend'] }));
  assert.equal(storyApi.current().id, 'M18');
  const s = getStorySave();
  assert.equal(s.v, 2);
  assert.deepEqual(s.skipped, ['M05'], 'bestaande velden blijven');
  assert.deepEqual(s.fails, { M03: 2 });
  assert.deepEqual(s.cards, ['kop']);
  assert.ok(s.flags.includes('met:berend'));
  // heen en terug: dezelfde done-set, dezelfde stap
  applyStorySave(JSON.parse(JSON.stringify(s)));
  assert.deepEqual([...done()].sort(), [...s.done].sort());
  assert.equal(storyApi.current().id, 'M18');
});

t('een onbekende of kapotte save wordt genegeerd', () => {
  applyStorySave({ v: 3, done: ['A1'] });
  assert.equal(done().has('A1'), false);
  assert.equal(storyApi.current().id, 'M00');
  applyStorySave(null);
  assert.equal(storyApi.current().id, 'M00');
});

console.log(`storysave_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
