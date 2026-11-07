// #426: de vier oude rode verhaaltestchecks (HUD/timing, 30 stappen, M13/M22, Kropswolde) horen bij de
// oude arc. De verhaaltest is in #581 herschreven naar de nieuwe arc; deze test legt de verwachting vast:
// de oude checks bestaan niet meer, de nieuwe checks (en de tijdgevoelige plaats in de keten) zijn er nog,
// en de logparser leest het huidige uitvoerformaat. Zo kan de verwachting niet stil verouderen.
//   node scripts/storytest_verwachting_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseStoryLog } from './lib/testrapport.mjs';

const read = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const story = read('game/js/storytest.js');
const all = read('scripts/test_all.mjs');
const docs = read('docs/TESTEN.md');

let n = 0, fails = 0;
const t = (naam, fn) => { n++; try { fn(); console.log('ok   ' + naam); } catch (e) { fails++; console.log('FAIL ' + naam + '\n  ' + e.message.split('\n')[0]); } };

t('de vier oude #426-checks zijn geen deel meer van de verhaaltest', () => {
  for (const oud of ['HUD/timing', '30 stappen', 'M13/M22', 'Kropswolde']) {
    assert.equal(story.includes(oud), false, `oude verwachting staat nog in storytest.js: ${oud}`);
  }
  // de oude arc is weg (#187): de harness speelt de nieuwe arc
  assert.match(story, /const NEW = true;/);
  assert.match(story, /new arc: the script data is loaded/);
});

t('de nieuwe verwachtingen staan er wel: HUD-rust, stappen en de nieuwe-arc-checks', () => {
  assert.match(story, /new arc: the HUD is quiet before the app text/);
  assert.match(story, /check\('all available steps passed'/);
  assert.match(story, /new arc: a silent app text shows as a phone card/);
  assert.ok((story.match(/check\('new arc:/g) || []).length >= 4, 'de nieuwe-arc-checks zijn er');
});

t('de tijdgevoelige verhaaltest staat serieel in de keten (#515/#426 HUD/timing)', () => {
  // De verhaaltest en de twee botsweeps mogen niet samenvallen met een andere Electron-stap; de
  // oude timing-flake (M09 onder belasting) kwam daar vandaan.
  assert.match(all, /later\('verhaaltest'/);
  assert.match(all, /tijdgevoelige stappen \(verhaaltest/);
  assert.doesNotMatch(all, /wacht\('verhaaltest'/);
});

t('de logparser leest het huidige uitvoerformaat en telt de fouten', () => {
  const pass = parseStoryLog('[story-test] PASS: 30 steps, 0 failed checks, report in C:\\tmp\\verhaal');
  assert.equal(pass.gehaald, true);
  assert.equal(pass.result, 'PASS');
  assert.equal(pass.steps, 30);
  assert.equal(pass.failedChecks, 0);
  const fail = parseStoryLog('[story-test] FAIL: 29 steps, 2 failed checks, report in C:\\tmp\\verhaal\n[story-test] FAIL HUD/timing x\n[story-test] FAIL all available steps passed');
  assert.equal(fail.result, 'FAIL');
  assert.equal(fail.failedChecks, 2);
  assert.deepEqual(fail.fails, ['FAIL HUD/timing x', 'FAIL all available steps passed']);
  const nan = parseStoryLog('[story-test] PASS: 30 steps, 0 failed checks\n[story-test] FAIL 2 NaN geometry warnings (computeBoundingSphere)');
  assert.equal(nan.nanWaarschuwingen, 2);
});

t('de verwachting staat expliciet in de testdocumentatie', () => {
  assert.match(docs, /#426/);
  assert.match(docs, /vervallen|vervangen/i);
  assert.match(docs, /storytest_verwachting_test/);
});

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
