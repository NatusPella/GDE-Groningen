// #673: de variant na de hoogste medaille. Drie activiteiten hebben er een met een eigen record:
// discgolf (de volle ronde), de kartbaan (tijdattack op je snelste ronde) en het skatepark (combo-run
// op je beste keten). Deze test dekt de pure regel en de bedrading.
//   node scripts/variant_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { VARIANTEN, variantVan, variantVanBase, variantOpen, variantMedal, variantTekst } from '../game/js/activiteitvariant.js';

let n = 0, fails = 0;
const t = (naam, fn) => { n++; try { fn(); console.log('ok   ' + naam); } catch (e) { fails++; console.log('FAIL ' + naam + '\n  ' + e.message.split('\n')[0]); } };
const read = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');

t('drie activiteiten hebben een variant met een eigen record', () => {
  assert.equal(VARIANTEN.length, 3);
  assert.deepEqual(VARIANTEN.map((v) => v.base).sort(), ['discgolf', 'kart-race', 'skatepark']);
  const ids = new Set(), records = new Set();
  for (const v of VARIANTEN) { ids.add(v.id); records.add(v.record); assert.notEqual(v.record, v.base, `${v.id} heeft een eigen record`); assert.ok(v.doel && v.medailles.length === 3, `${v.id} heeft een doel en drie treden`); }
  assert.equal(ids.size, 3);
  assert.equal(records.size, 3);
  assert.equal(variantVan('kart-tijdattack').record, 'kart-lap');
  assert.equal(variantVanBase('skatepark').id, 'skate-combo');
  assert.equal(variantVan('bestaat-niet'), null);
});

t('de variant opent na goud op de basis, of als je hem al speelde', () => {
  const v = variantVan('kart-tijdattack');
  assert.equal(variantOpen(v, { unlocked: () => false, record: () => null }), false, 'zonder goud dicht');
  assert.equal(variantOpen(v, { unlocked: (id) => id === 'kart_goud', record: () => null }), true, 'goud op de race opent de tijdattack');
  assert.equal(variantOpen(v, { unlocked: () => false, record: (id) => (id === 'kart-lap' ? { best: 34 } : null) }), true, 'een eigen record houdt hem open');
  assert.equal(variantOpen(null), false);
});

t('de medailles van een variant volgen de eigen tredes (tijd en slagen: lager is beter)', () => {
  const kart = variantVan('kart-tijdattack');
  assert.equal(variantMedal(kart, 40), 0);
  assert.equal(variantMedal(kart, 38), 1);
  assert.equal(variantMedal(kart, 35), 2);
  assert.equal(variantMedal(kart, 31), 3);
  const disc = variantVan('discgolf-achttien');
  assert.equal(variantMedal(disc, 3), 1, 'drie boven par is brons');
  assert.equal(variantMedal(disc, 1), 2, 'één boven par is zilver');
  assert.equal(variantMedal(disc, -2), 3, 'twee onder par is goud');
  assert.equal(variantMedal(disc, 10), 0);
  const skate = variantVan('skate-combo');
  assert.equal(variantMedal(skate, 500), 0);
  assert.equal(variantMedal(skate, 1200), 1);
  assert.equal(variantMedal(skate, 3200), 3);
  assert.equal(variantMedal(null, 100), 0);
  assert.equal(variantMedal(kart, NaN), 0);
});

t('de stand van een variant leest als record en doel', () => {
  const kart = variantVan('kart-tijdattack');
  assert.equal(variantTekst(kart, null).recordTekst, 'Nog niet gespeeld');
  assert.match(variantTekst(kart, { best: 33.4, medal: 2 }).recordTekst, /Record 0:33/);
  assert.equal(variantTekst(variantVan('skate-combo'), { best: 2500, medal: 3 }).recordTekst, 'Record 2.500 punten');
  assert.match(variantTekst(variantVan('discgolf-achttien'), { best: -2, medal: 3 }).recordTekst, /-2 t\.o\.v\. par/);
  assert.equal(variantTekst(kart, null).open, true);
});

t('de varianten zijn aangesloten op de activiteiten en op Te doen', () => {
  const kart = read('kartbaan.js'), skate = read('skatepark.js'), disc = read('discgolf.js'), todo = read('todo.js');
  assert.match(kart, /variantMedal\(variantVan\('kart-tijdattack'\), lap\)/, 'de kartbaan geeft de tijdattack een medaille');
  assert.match(skate, /recordChallengeResult\(w, difficultyRecordKey\(g\.mode, 'skatepark-combo'\)/, 'het skatepark boekt de combo-run als eigen record');
  assert.match(skate, /variantMedal\(variantVan\('skate-combo'\)/, 'de combo-run heeft een eigen medaille');
  assert.match(disc, /rec: 'discgolf-achttien'/, 'discgolf had de volle ronde al als eigen record');
  assert.match(todo, /VARIANTEN/, 'Te doen leest de varianten');
  assert.match(todo, /variantOpen\(v, \{ unlocked: isUnlocked, record: getChallengeRecord \}\)/, 'Te doen toont een variant pas als hij open is');
});

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
