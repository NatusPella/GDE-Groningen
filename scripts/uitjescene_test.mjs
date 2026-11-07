// #720: één gedeelde standaard voor activiteitenscènes en de vier onthullingen.
// De helper is DOM-vrij genoeg voor node; de vier activiteiten moeten hem gebruiken.
//   node scripts/uitjescene_test.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import './node3d.mjs';

let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };
const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');

t('de helper heeft één standaard met dezelfde vlaggen en opruiming', () => {
  const s = read('game/js/uitjescene.js');
  for (const v of ['pause: true', 'letterbox: true', 'skippable: true', 'hideHud: true', 'cameraOverride = null', 'cinematicHidePlayers = false']) assert.ok(s.includes(v), v);
  assert.match(s, /export function uitjeScene/);
  assert.match(s, /export function onthullingScene/);
});

t('dorpsuitjes gebruikt dezelfde standaard, geen eigen playCinematic-vlaggen meer', () => {
  const s = read('game/js/dorpsuitjes.js');
  assert.match(s, /from '\.\/uitjescene\.js'/);
  assert.match(s, /uitjeScene\(w,/);
  assert.ok(!/playCinematic\(\{/.test(s));
});

t('de vier ontbrekende onthullingen staan erin', () => {
  for (const [f, id] of [['klimtoren.js', 'klimtoren-reveal'], ['zwembad.js', 'zwembad-reveal'], ['kartbaan.js', 'kartbaan-reveal'], ['kermis.js', 'kermis-reveal']]) {
    const s = read('game/js/' + f);
    assert.match(s, /onthullingScene\(w,/);
    assert.ok(s.includes(id), id);
  }
});

t('de standaard staat in de componentendocumentatie', () => {
  const d = read('docs/DESIGN-COMPONENTEN.md');
  assert.match(d, /Activiteitenscène \(#720\)/);
  assert.match(d, /uitjeScene/);
  assert.match(d, /3-5 s/);
});

t('zonder wereld of shot doet de helper niets (bail-out)', async () => {
  const { uitjeScene, onthullingScene } = await import('../game/js/uitjescene.js');
  assert.equal(uitjeScene(null, { shot: () => ({}) }), false);
  assert.equal(uitjeScene({}, { shot: null }), false);
  assert.equal(onthullingScene({}, { x: NaN, y: 0 }), false);
});

console.log(`uitjescene_test: ${n}/${n} ok`);
