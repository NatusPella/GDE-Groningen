// #581: de eerste drie QA-harnassen starten als de speler (boot → wereld) en
// hebben geen __menuStart/#start-screen meer nodig. De inventaris noemt de rest.
//   node scripts/qa_start_test.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';

let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };
const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');

t('de eerste drie harnassen hebben geen menu-aanroep meer', () => {
  for (const f of ['cutaudio_live.mjs', 'cutscene_shots.mjs', 'province_shots.mjs']) {
    const src = read('scripts/qa/' + f);
    assert.ok(!/__menuStart|#start-screen/.test(src), f + ' start via de wereld');
    assert.match(src, /game-started/, f + ' wacht op de wereldstart');
  }
});

t('de inventaris noemt de overgebleven harnassen en de reden', () => {
  const doc = read('docs/QA-START-VAN-MENU-AF.md');
  for (const f of ['readme_shots', 'menuplekken_shots', 'testbank', 'playtest_sim']) assert.ok(doc.includes(f), f);
  assert.match(doc, /bewust/);
  assert.match(doc, /omgezet/);
});

t('readme_shots is de volgende kandidaat, niet stilletjes vergeten', () => {
  assert.match(read('scripts/qa/readme_shots.mjs'), /__menuStart/);
  assert.match(read('docs/QA-START-VAN-MENU-AF.md'), /readme_shots[\s\S]{0,200}volgende/);
});

console.log(`qa_start_test: ${n}/${n} ok`);
