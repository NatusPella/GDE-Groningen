// #800: de moeilijkheidsstand op de diensten (vluchtdienst, vaardienst, machinist). De diensten
// hebben geen losse tijdklok maar wel medailledrempels, perron-/aanlegvensters en de extra tijd in
// de dienstregeling; die volgen de stand. Standaard moet exact het oude gedrag houden.
//   node scripts/difficulty_diensten_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';

const D = await import('../game/js/difficulty.js');
const S = await import('../game/js/simdienst.js');
const A = await import('../game/js/arcadeplane.js');
const Z = await import('../game/js/zeilvaren.js');
const R = await import('../game/js/machinistrules.js');

const ROOT = new URL('../', import.meta.url);
const lees = (p) => fs.readFileSync(new URL(p, ROOT), 'utf8');
let n = 0, bad = 0;
const t = (naam, fn) => { n++; try { fn(); } catch (e) { bad++; console.log('FAIL', naam, '\n  ', String(e.message || e).split('\n').slice(0, 4).join('\n   ')); } };
const MODES = ['ontspannen', 'standaard', 'uitdagend'];
const H = (x, y, naam) => ({ x, y, naam });

t('dienstmedailles: standaard is exact de oude tabel, de andere standen schuiven', () => {
  assert.deepEqual(S.scaledMedalAt('standaard'), S.MEDAILLE_AT);
  assert.deepEqual(S.scaledMedalAt('ontspannen'), [44, 60, 74], 'ontspannen: lagere score voor brons');
  assert.deepEqual(S.scaledMedalAt('uitdagend'), [69, 94, 115], 'uitdagend: hogere score voor brons');
  // één score, drie standen: de medaille schuift mee
  assert.equal(S.uitslagUitPunten('schip', 50, {}, 'standaard').medaille, 0);
  assert.equal(S.uitslagUitPunten('schip', 50, {}, 'ontspannen').medaille, 1);
  assert.equal(S.uitslagUitPunten('schip', 80, {}, 'standaard').medaille, 2);
  assert.equal(S.uitslagUitPunten('schip', 80, {}, 'uitdagend').medaille, 1);
  // de gewone uitslag gebruikt dezelfde geschaalde tabel
  const stand = { vervoer: 'schip', halten: [H(0, 0), H(100, 0), H(200, 0)], gehaald: 3, opTijd: 2, teHard: 0, t: 90, gemist: [], klaar: true, naam: 'Rondvaart' };
  assert.equal(S.dienstUitslag(stand, 'standaard').medaille, 2);
  assert.equal(S.dienstUitslag(stand, 'ontspannen').medaille, 3);
  assert.equal(S.dienstUitslag(stand, 'uitdagend').medaille, 1);
});

t('de extra diensttijd schaalt mee; standaard blijft de oude dienstregeling', () => {
  const mk = () => S.maakDienst({ vervoer: 'schip', halten: [H(0, 0, 'A'), H(100, 0, 'B'), H(200, 0, 'C')] });
  const std = mk(); S.margeVoorDienst(std, 10, 'standaard');
  assert.deepEqual(std.halten.map((h) => h.due), [10, 51, 92], 'standaard: precies de oude extra tijd');
  const makkelijk = mk(); S.margeVoorDienst(makkelijk, 10, 'ontspannen');
  const streng = mk(); S.margeVoorDienst(streng, 10, 'uitdagend');
  assert.ok(makkelijk.halten[0].due > std.halten[0].due && streng.halten[0].due < std.halten[0].due, 'ontspannen meer, uitdagend minder tijd');
  assert.equal(S.margeVoorDienst(mk(), 10).halten[0].due, 10, 'zonder stand: het oude gedrag');
});

t('vlucht- en vaardienst geven de stand door aan de uitslag', () => {
  const d = A.maakVluchtdienst({ van: H(0, 0, 'A'), naar: H(1000, 0, 'B'), route: [{ x: 300, y: 0, z: 100 }, { x: 700, y: 0, z: 100 }] });
  d.mode = 'standaard';
  assert.equal(A.vluchtUitslag(d).medaille, A.vluchtUitslag(d, 'standaard').medaille);
  d.gehaald = 3; d.opTijd = 2; d.t = 80;
  assert.ok(A.vluchtUitslag(d, 'ontspannen').medaille >= A.vluchtUitslag(d, 'standaard').medaille, 'ontspannen is niet strenger');
  assert.ok(A.vluchtUitslag(d, 'uitdagend').medaille <= A.vluchtUitslag(d, 'standaard').medaille, 'uitdagend is niet ruimer');
  const vaar = Z.maakVaardienst({ halten: [H(0, 0, 'A'), H(100, 0, 'B')] });
  vaar.gehaald = 2; vaar.opTijd = 1; vaar.t = 60;
  assert.ok(Z.vaarUitslag(vaar, 'ontspannen').medaille >= Z.vaarUitslag(vaar, 'standaard').medaille);
  assert.ok(Z.vaarUitslag(vaar, 'uitdagend').medaille <= Z.vaarUitslag(vaar, 'standaard').medaille);
});

t('machinist: medaille-, perron- en vensterdrempels per stand', () => {
  assert.deepEqual(R.scaledMedalAt('standaard'), R.MEDAL_AT);
  assert.deepEqual(R.scaledMedalAt('ontspannen'), [40, 56, 70]);
  assert.deepEqual(R.scaledMedalAt('uitdagend'), [63, 88, 110]);
  assert.deepEqual(R.scaledStopTol('standaard'), R.STOP_TOL);
  assert.ok(R.scaledStopTol('ontspannen')[0] > R.STOP_TOL[0], 'ontspannen: ruimere stopmarge');
  assert.ok(R.scaledStopTol('uitdagend')[0] < R.STOP_TOL[0], 'uitdagend: krappere stopmarge');
  assert.equal(R.scaledPlatformWindow('standaard'), R.PLATFORM_WINDOW);
  assert.ok(R.scaledPlatformWindow('ontspannen') > R.PLATFORM_WINDOW && R.scaledPlatformWindow('uitdagend') < R.PLATFORM_WINDOW);
  // dezelfde afwijking geeft een andere stopmedaille
  assert.equal(R.stopMedal(13, R.scaledStopTol('standaard')), 1);
  assert.equal(R.stopMedal(13, R.scaledStopTol('uitdagend')), 0);
  assert.equal(R.stopMedal(13, R.scaledStopTol('ontspannen')), 1);
  // de dienst bewaart de stand en de drempels, zodat bord en uitslag dezelfde regel gebruiken
  const stops = [{ name: 'A', s: 1000 }, { name: 'B', s: 2000 }];
  const svc = R.startService({ stops, c: 0, dir: 1, vmax: 30, time: 0, mode: 'ontspannen' });
  assert.equal(svc.mode, 'ontspannen');
  assert.deepEqual(svc.medalAt, R.scaledMedalAt('ontspannen'));
  assert.deepEqual(svc.stopTol, R.scaledStopTol('ontspannen'));
  assert.equal(svc.platformWindow, R.scaledPlatformWindow('ontspannen'));
  const stdSvc = R.startService({ stops, c: 0, dir: 1, vmax: 30, time: 0 });
  assert.equal(stdSvc.mode, 'standaard');
  assert.deepEqual(stdSvc.medalAt, R.MEDAL_AT);
});

t('machinist: de samenvattende dienstmedaille volgt de stand', () => {
  const score = { gemiddelde: 55, halten: 4, opTijd: 70, veilig: 100, fouten: 0 };
  const std = R.dienstMedaille(score, 'standaard');
  const makkelijk = R.dienstMedaille(score, 'ontspannen');
  const streng = R.dienstMedaille(score, 'uitdagend');
  assert.ok(makkelijk.index >= std.index, `ontspannen ${makkelijk.index} >= standaard ${std.index}`);
  assert.ok(streng.index <= std.index, `uitdagend ${streng.index} <= standaard ${std.index}`);
});

t('de bedrading leest de stand bij de start en gebruikt hem bij de uitslag', () => {
  const activities = lees('game/js/activities.js');
  assert.match(activities, /cleanDifficulty\(getSettings\(\)\.difficulty\)/, 'de dienst leest de stand');
  assert.match(activities, /margeVoorDienst\(maakVluchtdienst\(rit\), 14, mode\)/, 'vluchtdienst: geschaalde diensttijd');
  assert.match(activities, /margeVoorDienst\(maakVaardienst\(\{ naam: 'Rondvaart', halten: kades \}\), 10, mode\)/, 'vaardienst: geschaalde diensttijd');
  assert.match(activities, /cfg\.uitslag\(r\.d, r\.mode\)/, 'de uitslag krijgt de stand van de run');
  const machinist = lees('game/js/machinist.js');
  assert.match(machinist, /cleanDifficulty\(getSettings\(\)\.difficulty\)/, 'machinist leest de stand');
  assert.match(machinist, /mode: cleanDifficulty\(getSettings\(\)\.difficulty\)/, 'en geeft hem aan startService');
  assert.match(machinist, /dienstMedaille\(\{ gemiddelde: r\.score, halten: r\.stops, opTijd: r\.punct, veilig: r\.veilig, fouten: r\.faults \}, svc\.mode\)/, 'de samenvattende medaille volgt de dienst');
});

t('records van diensten blijven de bestaande sleutel houden (geen tweede waarheid)', () => {
  // Diensten hebben geen eigen challenge-record; de stand zit in hun uitslag. De bestaande
  // startkaart en medaille-eisen blijven ongemoeid, zodat 'Standaard' exact het oude gedrag is.
  for (const m of MODES) assert.equal(D.difficultyRecordKey(m, 'vluchtdienst'), m === 'standaard' ? 'vluchtdienst' : `difficulty:${m}:vluchtdienst`);
});

console.log(bad ? `difficulty_diensten_test: ${n - bad}/${n} ok` : `difficulty_diensten_test: ${n}/${n} ok`);
process.exitCode = bad ? 1 : 0;
