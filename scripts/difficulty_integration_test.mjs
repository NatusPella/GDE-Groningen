// #800: de moeilijkheidsstand is aangesloten: settings, de startkaart en één tijd-/medaillepad
// (het skatepark). Standaard moet exact het huidige gedrag houden; de andere standen krijgen
// eigen recordsleutels zodat ze de bestaande records niet overschrijven.
//   node scripts/difficulty_integration_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  DIFFICULTY_MODES, DIFFICULTY_DEFAULT, DIFFICULTY, cleanDifficulty, scaleTimeLimit, scaleTarget, difficultyRecordKey,
} from '../game/js/difficulty.js';
import { RUN_S, MEDAL_AT, runSeconds, medalAt, skateMedal } from '../game/js/skatetricks.js';
import { getSettings, withTempSettings } from '../game/js/settings.js';
await import('./node3d.mjs'); // de startkaart tekent via hudcards/THREE; de shim maakt dat in node mogelijk
const SK = await import('../game/js/startkaart.js');

const ROOT = new URL('../', import.meta.url);
const lees = (p) => fs.readFileSync(new URL(p, ROOT), 'utf8');
let n = 0, bad = 0;
const t = (naam, fn) => { n++; try { fn(); } catch (e) { bad++; console.log('FAIL', naam, '\n  ', String(e.message || e).split('\n').slice(0, 4).join('\n   ')); } };

t('settings: Standaard is de standaard en een onbekende stand valt daarop terug', () => {
  assert.equal(DIFFICULTY_DEFAULT, 'standaard');
  assert.equal(getSettings().difficulty, 'standaard', 'de standaardinstelling is Standaard');
  assert.equal(cleanDifficulty('onzin'), 'standaard');
  assert.equal(cleanDifficulty(undefined), 'standaard');
  assert.deepEqual(DIFFICULTY_MODES, ['ontspannen', 'standaard', 'uitdagend']);
  const zet = withTempSettings({ difficulty: 'ontspannen' });
  assert.equal(getSettings().difficulty, 'ontspannen', 'de stand is tijdens het spel te wisselen');
  zet();
  assert.equal(getSettings().difficulty, 'standaard', 'en de tijdelijke stand gaat netjes terug');
});

t('Standaard houdt exact het oude gedrag van de tijdslimiet en de medailles', () => {
  assert.equal(RUN_S, 90, 'de oude ronde blijft 90 s');
  assert.deepEqual(MEDAL_AT, [1200, 3200, 6500], 'de oude medailledrempels blijven staan');
  assert.equal(runSeconds('standaard'), RUN_S);
  assert.deepEqual(medalAt('standaard'), MEDAL_AT);
  for (const score of [0, 1199, 1200, 3200, 6500, 9000]) assert.equal(skateMedal(score, 'standaard'), skateMedal(score), `dezelfde medaille bij ${score}`);
  assert.equal(scaleTimeLimit(90, 'standaard'), 90);
  assert.equal(scaleTarget(1200, 'standaard', false), 1200);
});

t('Ontspannen en Uitdagend schalen de ronde en de medailledrempels', () => {
  assert.equal(runSeconds('ontspannen'), Math.round(90 * DIFFICULTY.ontspannen.time));
  assert.equal(runSeconds('uitdagend'), Math.round(90 * DIFFICULTY.uitdagend.time));
  assert.ok(runSeconds('ontspannen') > runSeconds('standaard') && runSeconds('uitdagend') < runSeconds('standaard'), 'meer of minder tijd');
  const makkelijk = medalAt('ontspannen'), streng = medalAt('uitdagend');
  assert.deepEqual(makkelijk, MEDAL_AT.map((v) => Math.round(v / DIFFICULTY.ontspannen.target)));
  assert.deepEqual(streng, MEDAL_AT.map((v) => Math.round(v / DIFFICULTY.uitdagend.target)));
  assert.ok(makkelijk[0] < MEDAL_AT[0] && streng[0] > MEDAL_AT[0], 'de eerste drempel schuift de goede kant op');
  // een score net onder de oude bronsdrempel haalt op Ontspannen wel brons en op Uitdagend niet
  assert.equal(skateMedal(1000, 'standaard'), 0);
  assert.equal(skateMedal(1000, 'ontspannen'), 1);
  assert.equal(skateMedal(1000, 'uitdagend'), 0);
  assert.equal(skateMedal(9000, 'ontspannen'), 3);
});

t('records zijn per stand gescheiden en de bestaande sleutel blijft van Standaard', () => {
  const keys = DIFFICULTY_MODES.map((m) => difficultyRecordKey(m, 'skatepark'));
  assert.equal(new Set(keys).size, 3, 'drie verschillende sleutels');
  assert.equal(difficultyRecordKey('standaard', 'skatepark'), 'skatepark', 'Standaard schrijft op de bestaande sleutel');
  assert.equal(difficultyRecordKey('ontspannen', 'skatepark'), 'difficulty:ontspannen:skatepark');
  assert.equal(difficultyRecordKey('uitdagend', 'skatepark'), 'difficulty:uitdagend:skatepark');
});

t('het skatepark gebruikt de stand voor ronde, medaille en record', () => {
  const src = lees('game/js/skatepark.js');
  assert.match(src, /runSeconds\(mode\)/, 'de ronde komt uit de stand');
  assert.match(src, /skateMedal\(score, g\.mode\)/, 'de medaille gebruikt de stand van deze ronde');
  assert.match(src, /difficultyRecordKey\(g\.mode, 'skatepark'\)/, 'het record gebruikt de sleutel per stand');
  assert.match(src, /difficultyRecordKey\(g\.mode, 'skatepark-combo'\)/, 'de combo-variant ook');
  assert.match(src, /difficultyRecordKey\(cleanDifficulty\(getSettings\(\)\.difficulty\), 'skatepark'\)/, 'de recordregel leest de stand');
});

t('de stand staat op de startkaart en in de instellingen', () => {
  const sk = lees('game/js/startkaart.js');
  assert.match(sk, /Stand: \$\{DIFFICULTY\[mode\]\.label\}/, 'de startkaart noemt de stand');
  const spec = SK.startkaartSpec('skatepark', { difficulty: 'standaard' });
  assert.ok(spec && /Stand: Standaard/.test(spec.bodyHtml), 'Standaard staat op de kaart');
  const zet = withTempSettings({ difficulty: 'ontspannen' });
  try {
    const ontspannen = SK.startkaartSpec('skatepark');
    assert.ok(ontspannen && /Stand: Ontspannen/.test(ontspannen.bodyHtml), 'de kaart volgt de gekozen stand');
  } finally { zet(); }
  const menu = lees('game/js/pausemenu.js');
  assert.match(menu, /picker\('difficulty', 'Moeilijkheid'/, 'de instellingen hebben een moeilijkheidskeuze');
  assert.match(menu, /\['ontspannen', 'Ontspannen'\], \['standaard', 'Standaard'\], \['uitdagend', 'Uitdagend'\]/, 'met de drie standen');
});


console.log(bad ? `difficulty_integration_test: ${n - bad}/${n} ok` : `difficulty_integration_test: ${n}/${n} ok`);
process.exitCode = bad ? 1 : 0;
