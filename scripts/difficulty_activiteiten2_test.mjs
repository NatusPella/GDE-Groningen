// #800: de tweede ronde activiteiten op de moeilijkheidsstand — kermis, carbid, driftzone,
// wandeling, golf, plaatsmedailles en de vliegschool — plus de medaille-eisen op de startkaart uit
// dezelfde geschaalde bron. Standaard houdt exact het oude gedrag.
//   node scripts/difficulty_activiteiten2_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
await import('./node3d.mjs');
const { cleanDifficulty, difficultyRecordKey, scaleTarget, scaleTargetSignedRound } = await import('../game/js/difficulty.js');
const { positionMedalFor } = await import('../game/js/medalrules.js');
const { DRIFT_MEDAL_AT } = await import('../game/js/driftzone.js');
const { PACE_MEDAL_AT, scaledPaceAt, walkMedal } = await import('../game/js/wandelrules.js');
const { medalRelFor: discRel } = await import('../game/js/discgolfrules.js');
const { medalRelFor: puttRel } = await import('../game/js/puttinglogic.js');
const { medailleTeksten } = await import('../game/js/difficulty_medals.js');
const { beoordeel, lesVan } = await import('../game/js/vliegschoolrules.js');

const ROOT = new URL('../', import.meta.url);
const lees = (p) => fs.readFileSync(new URL(p, ROOT), 'utf8');
let n = 0, bad = 0;
const t = (naam, fn) => { n++; try { fn(); } catch (e) { bad++; console.log('FAIL', naam, '\n  ', String(e.message || e).split('\n').slice(0, 4).join('\n   ')); } };
const MODES = ['ontspannen', 'standaard', 'uitdagend'];

t('kermis en carbid: puntenmedailles schuiven mee, standaard blijft gelijk', () => {
  const kermis = [60, 110, 160], carbid = [45, 80, 120];
  assert.deepEqual(kermis.map((v) => Math.round(scaleTarget(v, 'standaard', false))), kermis);
  assert.deepEqual(carbid.map((v) => Math.round(scaleTarget(v, 'standaard', false))), carbid);
  assert.deepEqual(kermis.map((v) => Math.round(scaleTarget(v, 'ontspannen', false))), [48, 88, 128]);
  assert.deepEqual(carbid.map((v) => Math.round(scaleTarget(v, 'uitdagend', false))), [56, 100, 150]);
  for (const f of ['kermis.js', 'carbid.js']) {
    const src = lees('game/js/' + f);
    assert.match(src, /difficultyRecordKey\((gm|mode), '(botsauto|carbid)'\)/, `${f}: record per stand`);
    assert.match(src, /scaleTarget\(v, mode, false\)/, `${f}: medailledrempels via de stand`);
  }
  assert.match(lees('game/js/kermis.js'), /rideS: scaleTimeLimit\(RIDE_S, mode\)/, 'kermis: 75 s schaalt');
});

t('driftzone: puntenmedailles per zone, standaard gelijk', () => {
  assert.deepEqual(DRIFT_MEDAL_AT.map((v) => Math.round(scaleTarget(v, 'standaard', false))), DRIFT_MEDAL_AT);
  assert.deepEqual(DRIFT_MEDAL_AT.map((v) => Math.round(scaleTarget(v, 'ontspannen', false))), [1200, 2800, 5600]);
  const src = lees('game/js/driftzone.js');
  assert.match(src, /DRIFT_MEDAL_AT\.map\(\(v\) => Math\.round\(scaleTarget\(v, mode, false\)\)\)/, 'drift: geschaalde tabel');
  assert.match(src, /difficultyRecordKey\(mode, id\)/, 'drift: record per stand per zone');
});

t('wandeling: pacelimieten schuiven mee en de standaardmedaille blijft gelijk', () => {
  assert.deepEqual(scaledPaceAt('standaard'), PACE_MEDAL_AT);
  assert.ok(scaledPaceAt('ontspannen')[0] < PACE_MEDAL_AT[0], 'ontspannen: een rustiger tempo haalt al brons');
  assert.ok(scaledPaceAt('uitdagend')[0] > PACE_MEDAL_AT[0], 'uitdagend: sneller lopen voor brons');
  const st = { phase: 'done', t: 100, dist: 100 };
  assert.equal(walkMedal(st, 100, 'standaard'), walkMedal(st, 100), 'standaard: dezelfde medaille');
  assert.ok(walkMedal(st, 100, 'ontspannen') >= walkMedal(st, 100, 'standaard'), 'ontspannen is niet strenger');
  assert.match(lees('game/js/wandeling.js'), /difficultyRecordKey\(mode, 'wandeling'\)/, 'wandeling: record per stand');
});

t('golf (discgolf en pitchputt): par-drempels schuiven, standaard exact gelijk', () => {
  assert.deepEqual(discRel('standaard'), [6, 1, -2]);
  assert.deepEqual(puttRel('standaard'), [7, 3, 0]);
  assert.deepEqual(discRel('ontspannen'), [8, 1, -1], 'ontspannen: ruimer boven par en minder streng onder par');
  assert.deepEqual(discRel('uitdagend'), [5, 1, -3], 'uitdagend: strenger boven par en dieper onder par');
  const disc = lees('game/js/discgolf.js');
  assert.match(disc, /difficultyRecordKey\(stand, mode\.rec\)/, 'discgolf: record per stand');
  assert.match(disc, /courseMedal\(t\.rel, stand\)|roundMedal\(t\.rel, COURSE\.length, stand\)/, 'discgolf: medaille uit de stand');
  const putt = lees('game/js/pitchputt.js');
  assert.match(putt, /difficultyRecordKey\(stand, 'pitchputt'\)/, 'pitchputt: record per stand');
  assert.match(putt, /courseMedal\(t\.rel, stand\)/, 'pitchputt: medaille uit de stand');
});

t('kartbaan en ringrace: plaatsmedailles per stand', () => {
  assert.deepEqual([1, 2, 3, 4].map((p) => positionMedalFor(p, 'standaard')), [3, 2, 1, 0]);
  assert.deepEqual([1, 2, 3, 4].map((p) => positionMedalFor(p, 'ontspannen')), [3, 3, 2, 1]);
  assert.deepEqual([1, 2, 3, 4].map((p) => positionMedalFor(p, 'uitdagend')), [3, 1, 0, 0]);
  for (const f of ['kartbaan.js', 'ringrace.js']) {
    const src = lees('game/js/' + f);
    assert.match(src, /cleanDifficulty\(getSettings\(\)\.difficulty\)/, `${f}: leest de stand`);
    assert.match(src, /difficultyRecordKey\(stand, '(kart-race|ringrace)'\)/, `${f}: record per stand`);
  }
});

t('vliegschool: lesmedailles schalen, standaard blijft gelijk', () => {
  const les = lesVan('vt-water');
  const baan = { soort: 'water', corridor: { lengte: 100 } };
  const st = { fase: 'klaar', binnen: 90, t: 40, goed: 0, tdAfstand: 0, tdKwaliteit: 'zacht', inVeld: true };
  const std = beoordeel(les, baan, st);
  const oud = beoordeel(les, baan, st, 'standaard');
  assert.deepEqual(oud, std, 'standaard: hetzelfde oordeel');
  const makkelijk = beoordeel(les, baan, st, 'ontspannen');
  const streng = beoordeel(les, baan, st, 'uitdagend');
  assert.ok(makkelijk.medaille >= std.medaille, 'ontspannen is niet strenger');
  assert.ok(streng.medaille <= std.medaille, 'uitdagend is niet ruimer');
  const src = lees('game/js/vliegschool.js');
  assert.match(src, /difficultyRecordKey\(stand, recId\(les\.id\)\)/, 'vliegschool: record per stand');
});

t('de startkaart haalt de medaille-eisen uit de geschaalde bron', () => {
  const sk = lees('game/js/startkaart.js');
  assert.match(sk, /medailleTeksten\(id, difficulty\) \|\| k\.medailles/, 'de startkaart leest de bron met de tabel als terugval');
  assert.deepEqual(medailleTeksten('kermis', 'standaard'), ['60 punten', '110 punten', '160 punten']);
  assert.deepEqual(medailleTeksten('zwembad', 'standaard'), ['binnen 1:40', 'binnen 1:16', 'binnen 1:04']);
  assert.deepEqual(medailleTeksten('discgolf', 'standaard'), ['6 boven par', '1 boven par', '2 onder par']);
  assert.deepEqual(medailleTeksten('kartbaan', 'standaard'), ['derde', 'tweede', 'eerste']);
  assert.notDeepEqual(medailleTeksten('kermis', 'ontspannen'), medailleTeksten('kermis', 'standaard'));
  assert.notDeepEqual(medailleTeksten('discgolf', 'uitdagend'), medailleTeksten('discgolf', 'standaard'));
  assert.notDeepEqual(medailleTeksten('ringrace', 'ontspannen'), medailleTeksten('ringrace', 'standaard'));
  assert.equal(medailleTeksten('onbekend', 'standaard'), null);
});

t('records blijven per stand gescheiden en standaard houdt de bestaande sleutels', () => {
  for (const id of ['botsauto', 'carbid', 'drift-ulrum', 'wandeling', 'discgolf', 'pitchputt', 'kart-race', 'ringrace', 'vlieg-vt-water']) {
    const keys = MODES.map((m) => difficultyRecordKey(m, id));
    assert.equal(new Set(keys).size, 3, id);
    assert.equal(difficultyRecordKey('standaard', id), id, id);
  }
});

console.log(bad ? `difficulty_activiteiten2_test: ${n - bad}/${n} ok` : `difficulty_activiteiten2_test: ${n}/${n} ok`);
process.exitCode = bad ? 1 : 0;
