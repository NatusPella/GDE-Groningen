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

t('de volgende vijf harnassen zijn ook omgezet', () => {
  const files = ['readme_shots.mjs', 'sweep.mjs', 'wachtbeeld.mjs', 'speeltest74.mjs', 'stadvergelijk.mjs'];
  for (const f of files) {
    const src = read('scripts/qa/' + f);
    assert.ok(!/__menuStart|#start-screen/.test(src), f + ' start via de wereld');
    assert.match(src, /game-started|#581/, f + ' wacht op de wereldstart');
  }
  const doc = read('docs/QA-START-VAN-MENU-AF.md');
  assert.ok((doc.match(/\*\*omgezet\*\*/g) || []).length >= 7, 'de inventaris markeert de omgezette harnassen');
});


t('de brug-harnassen starten ook via de wereld (#581)', () => {
  for (const f of ['brug_qa.mjs', 'brug_beeld.mjs', 'brug_boot.mjs']) {
    const page = read('scripts/qa/' + f.replace('.mjs', '.page.js'));
    assert.ok(!/__menuStart|#start-screen/.test(page), f + ' heeft geen menu-aanroep meer');
    assert.match(page, /game-started/, f + ' wacht op de wereldstart');
  }
  assert.ok((read('docs/QA-START-VAN-MENU-AF.md').match(/\*\*omgezet\*\*/g) || []).length >= 8, 'de inventaris telt de omgezette harnassen');
});

t('de inventaris noemt de overgebleven harnassen en de reden', () => {
  const doc = read('docs/QA-START-VAN-MENU-AF.md');
  for (const f of ['readme_shots', 'menuplekken_shots', 'testbank', 'playtest_sim']) assert.ok(doc.includes(f), f);
  assert.match(doc, /bewust/);
  assert.match(doc, /omgezet/);
});

t('de menu- en coop-harnassen blijven bewust, met reden', () => {
  const doc = read('docs/QA-START-VAN-MENU-AF.md');
  assert.match(doc, /menuplekken_shots/);
  assert.match(doc, /GDE_MENU_TEST/);
  assert.match(doc, /bewust/);
});

t('benchmark_run en de tester-groep zijn per harnas gedocumenteerd', () => {
  const doc = read('docs/QA-START-VAN-MENU-AF.md');
  assert.match(doc, /benchmark_run/);
  assert.match(doc, /tester_bugs/);
  assert.match(doc, /tester_\*\.page\.js/);
  assert.match(read('scripts/qa/benchmark_run.mjs'), /GDE_MENU_TEST/);
  assert.match(read('scripts/qa/tester_bugs.mjs'), /GDE_MENU_TEST/);
});

console.log(`qa_start_test: ${n}/${n} ok`);
