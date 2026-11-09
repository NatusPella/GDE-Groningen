// #800: de moeilijkheidsstand op de activiteiten met hun eigen tijds-/medailletabel en op de
// verhaalmissies. Standaard moet exact het oude gedrag houden en de bestaande recordsleutels
// laten staan; de andere standen schuiven de drempels en krijgen eigen records.
//   node scripts/difficulty_activiteiten_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
await import('./node3d.mjs');

const swim = await import('../game/js/swimrules.js');
const climb = await import('../game/js/climbrules.js');
const carillon = await import('../game/js/carillonrules.js');
const hengel = await import('../game/js/hengelrules.js');
const pan = await import('../game/js/pannenkoekrules.js');
const ski = await import('../game/js/skirules.js');
const fiets = await import('../game/js/skatefietsrules.js');
const tracker = await import('../game/js/achievementtracker.js');
const { MISSION_GOALS, GOLD_DAMAGE, SILVER_DAMAGE, recordMissionResult, getMissionRecord } = await import('../game/js/achievements.js');
const { withTempSettings } = await import('../game/js/settings.js');
const D = await import('../game/js/difficulty.js');

const ROOT = new URL('../', import.meta.url);
const lees = (p) => fs.readFileSync(new URL(p, ROOT), 'utf8');
let n = 0, bad = 0;
const t = (naam, fn) => { n++; try { fn(); } catch (e) { bad++; console.log('FAIL', naam, '\n  ', String(e.message || e).split('\n').slice(0, 4).join('\n   ')); } };
const MODES = ['ontspannen', 'standaard', 'uitdagend'];

t('standaard houdt elke bestaande medailltabel exact gelijk', () => {
  for (const [naam, mod] of [['zwembad', swim], ['klimtoren', climb], ['carillon', carillon], ['hengelen', hengel], ['pannenkoek', pan], ['waterski', ski]]) {
    assert.deepEqual(mod.scaledMedalAt('standaard'), mod.MEDAL_AT, `${naam}: dezelfde drempels`);
  }
  assert.equal(swim.swimMedal(90, 'standaard'), swim.swimMedal(90), 'zwembad: dezelfde medaille');
  assert.equal(climb.climbMedal(60, 'standaard'), climb.climbMedal(60));
  assert.equal(hengel.hengelMedal(7, 'standaard'), hengel.hengelMedal(7));
  assert.equal(pan.pannenkoekMedal(800, 'standaard'), pan.pannenkoekMedal(800));
  assert.equal(ski.skiMedal(1400, 'standaard'), ski.skiMedal(1400));
});

t('tijdmedailles (zwembad, klimtoren): ontspannen ruimer, uitdagend strenger', () => {
  for (const [naam, mod] of [['zwembad', swim], ['klimtoren', climb]]) {
    const at = mod.scaledMedalAt('ontspannen'), streng = mod.scaledMedalAt('uitdagend');
    for (let i = 0; i < at.length; i++) {
      assert.ok(at[i] > mod.MEDAL_AT[i], `${naam}: ontspannen drempel ${i} hoger (tijd mag langer)`);
      assert.ok(streng[i] < mod.MEDAL_AT[i], `${naam}: uitdagend drempel ${i} lager (tijd moet korter)`);
    }
  }
  // een tijd die op standaard net geen brons haalt, haalt op ontspannen wel brons
  assert.equal(swim.swimMedal(110, 'standaard'), 0);
  assert.equal(swim.swimMedal(110, 'ontspannen'), 1);
  assert.equal(climb.climbMedal(85, 'standaard'), 0);
  assert.equal(climb.climbMedal(85, 'ontspannen'), 1);
});

t('scoremedailles (carillon, hengelen, pannenkoek, waterski): drempels schuiven mee', () => {
  for (const [naam, mod] of [['carillon', carillon], ['hengelen', hengel], ['pannenkoek', pan], ['waterski', ski]]) {
    const makkelijk = mod.scaledMedalAt('ontspannen'), streng = mod.scaledMedalAt('uitdagend');
    for (let i = 0; i < makkelijk.length; i++) {
      assert.ok(makkelijk[i] < mod.MEDAL_AT[i], `${naam}: ontspannen drempel ${i} lager`);
      assert.ok(streng[i] > mod.MEDAL_AT[i], `${naam}: uitdagend drempel ${i} hoger`);
    }
  }
  // een score net onder de oude bronsdrempel haalt op ontspannen wel brons
  assert.equal(pan.pannenkoekMedal(380, 'standaard'), 0);
  assert.equal(pan.pannenkoekMedal(380, 'ontspannen'), 1);
  assert.equal(ski.skiMedal(600, 'standaard'), 0);
  assert.equal(ski.skiMedal(600, 'ontspannen'), 1);
});

t('tijdslimieten schuiven mee: hengelen, pannenkoek en de fietsronde', () => {
  const h = (m) => D.scaleTimeLimit(hengel.HENGEL.duration, m);
  const p = (m) => D.scaleTimeLimit(pan.PAN.duration, m);
  assert.equal(h('standaard'), 90); assert.equal(h('ontspannen'), 122); assert.equal(h('uitdagend'), 77);
  assert.equal(p('standaard'), 120); assert.equal(p('ontspannen'), 162); assert.equal(p('uitdagend'), 102);
  assert.equal(fiets.runSeconds('standaard'), 60);
  assert.equal(fiets.createRun('standaard').cap, 60);
  assert.equal(fiets.createRun('ontspannen').cap, 81);
  assert.equal(fiets.createRun('uitdagend').cap, 51);
  const run = fiets.createRun('ontspannen');
  run.t = 61; // na de oude 60 s nog niet klaar op ontspannen
  fiets.stepRun(run, 0.01, { speed: 0, wheelie: false, hop: false });
  assert.equal(run.done, false, 'ontspannen: de ronde loopt langer');
  run.t = 81;
  fiets.stepRun(run, 0.01, { speed: 0, wheelie: false, hop: false });
  assert.equal(run.done, true, 'ontspannen: klaar op de geschaalde grens');
});

t('records zijn per stand gescheiden en standaard houdt de bestaande sleutel', () => {
  for (const id of ['zwembad', 'klimtoren', 'carillon-broeder', 'hengelen', 'pannenkoek', 'waterski', 'skatefiets', 'mission:3']) {
    const keys = MODES.map((m) => D.difficultyRecordKey(m, id));
    assert.equal(new Set(keys).size, 3, `${id}: drie sleutels`);
    assert.equal(D.difficultyRecordKey('standaard', id), id, `${id}: standaard onveranderd`);
    assert.notEqual(keys[0], id); assert.notEqual(keys[2], id);
  }
});

t('missietijden en vensters volgen de stand; standaard blijft gelijk', () => {
  const missions = lees('game/js/missions.js');
  assert.match(missions, /scaleTimeLimit\(assistTime\(def\.timeLimit\), cleanDifficulty\(getSettings\(\)\.difficulty\)\)/, 'de missietijdlmiet schaalt');
  assert.match(missions, /scaleTimeLimit\(assistTime\(def\.window\.secs\)/, 'het missievenster schaalt');
  assert.equal(D.scaleTimeLimit(100, 'standaard'), 100);
  assert.equal(D.scaleTimeLimit(100, 'ontspannen'), 135);
  assert.equal(D.scaleTimeLimit(100, 'uitdagend'), 85);
});

t('missiemedailles: standaard exact de oude grenzen, andere standen schuiven', () => {
  // De decor-missie (index 3): goud 115 s, zilver 137 s, 1 wanted, schade 25/60.
  const r = { index: 3, elapsed: 130, damage: 20, maxWanted: 0 };
  assert.equal(tracker.missionMedalFor(r, 'standaard'), 2, 'standaard: zilver, zoals de oude regel');
  assert.equal(tracker.missionMedalFor(r, 'ontspannen'), 3, 'ontspannen: de ruimere tijd haalt goud');
  assert.equal(tracker.missionMedalFor(r, 'uitdagend'), 1, 'uitdagend: de krappere tijd haalt geen zilver');
  // En de oude regel onafhankelijk nagerekend voor standaard.
  const g = MISSION_GOALS[3];
  const oud = r.elapsed <= g.silver && r.damage <= SILVER_DAMAGE ? (r.elapsed <= g.gold && r.damage <= GOLD_DAMAGE ? 3 : 2) : 1;
  assert.equal(tracker.missionMedalFor(r, 'standaard'), oud);
});

t('missierecords staan per stand in een eigen map, standaard in life.missions', () => {
  // Gedrag: standaard schrijft op de oude plek, een andere stand op zijn eigen record.
  const standaardVoor = getMissionRecord(3, 'standaard');
  recordMissionResult(null, 3, { time: 140, medal: 2 });
  const std = getMissionRecord(3, 'standaard');
  assert.ok(std && std.best === 140 && std.medal === 2, 'standaard: record op de bestaande plek');
  const zet = withTempSettings({ difficulty: 'ontspannen' });
  try { recordMissionResult(null, 3, { time: 120, medal: 3 }); } finally { zet(); }
  assert.deepEqual(getMissionRecord(3, 'standaard'), std, 'ontspannen overschrijft het standaardrecord niet');
  const makkelijk = getMissionRecord(3, 'ontspannen');
  assert.ok(makkelijk && makkelijk.best === 120 && makkelijk.medal === 3, 'ontspannen: eigen record');
  assert.equal(getMissionRecord(3, 'uitdagend'), null, 'uitdagend: nog geen record');
  if (!standaardVoor) recordMissionResult(null, 3, { time: 140, medal: 2 }); // laat de standaardstand zoals gevonden
  const acc = lees('game/js/achievements.js');
  assert.match(acc, /missionModes: \{\}/, 'de levenslange opslag kent missionModes');
  assert.match(acc, /mode === 'standaard' \? life\.missions : \(life\.missionModes\[mode\]/, 'standaard schrijft op de bestaande plek');
  assert.match(acc, /getMissionRecord\(i, mode = cleanDifficulty\(getSettings\(\)\.difficulty\)\)/, 'het lezen kiest de stand');
});

t('de activiteiten gebruiken de stand bij medaille, record en volgende trede', () => {
  for (const [f, id] of [['zwembad.js', 'zwembad'], ['klimtoren.js', 'klimtoren'], ['carillon.js', 'carillon-'], ['hengelen.js', 'hengelen'], ['pannenkoek.js', 'pannenkoek'], ['waterski.js', 'waterski'], ['skatefiets.js', 'skatefiets']]) {
    const src = lees('game/js/' + f);
    assert.match(src, /difficultyRecordKey\(mode, |difficultyRecordKey\(cleanDifficulty\(getSettings\(\)\.difficulty\), /, `${f}: records per stand`);
    assert.match(src, /cleanDifficulty\(getSettings\(\)\.difficulty\)/, `${f}: leest de stand`);
  }
  assert.match(lees('game/js/hengelen.js'), /duur: scaleTimeLimit\(HENGEL\.duration, mode\)/, 'hengelen: de 90 s schaalt');
  assert.match(lees('game/js/pannenkoek.js'), /s0\.left = scaleTimeLimit\(PAN\.duration, mode\)/, 'pannenkoek: de twee minuten schalen');
});

console.log(bad ? `difficulty_activiteiten_test: ${n - bad}/${n} ok` : `difficulty_activiteiten_test: ${n}/${n} ok`);
process.exitCode = bad ? 1 : 0;
