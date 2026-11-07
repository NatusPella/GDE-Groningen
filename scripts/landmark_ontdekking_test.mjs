// #721: de vier ontbrekende landmark-ontdekkingen (Kardinge, Suikerfabriek,
// Eemshaven, Vesting Bourtange) staan in de kaartmeta en hebben een hoogte.
//   node scripts/landmark_ontdekking_test.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';

let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };
const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const stad = JSON.parse(read('game/stad.json'));

t('de vier set pieces staan in meta.landmarks, met coördinaten', () => {
  const namen = new Set(stad.meta.landmarks.map((l) => l.name));
  for (const naam of ['Kardinge', 'Suikerfabriek', 'Eemshaven', 'Vesting Bourtange']) {
    assert.ok(namen.has(naam), naam + ' ontbreekt');
    const l = stad.meta.landmarks.find((x) => x.name === naam);
    assert.ok(Number.isFinite(l.x) && Number.isFinite(l.y), naam + ' heeft coördinaten');
  }
  assert.ok(stad.meta.landmarks.length >= 18, 'de bestaande veertien blijven staan');
});

t('de hoogtetabel in cinematics kent de vier namen', () => {
  const cin = read('game/js/cinematics.js');
  const blok = cin.slice(cin.indexOf('const LANDMARK_HEIGHT'), cin.indexOf('};', cin.indexOf('const LANDMARK_HEIGHT')));
  for (const naam of ['Kardinge', 'Suikerfabriek', 'Eemshaven', 'Vesting Bourtange']) assert.ok(blok.includes(naam), naam);
});

t('de bestaande landmark-ontdekking gebruikt nog dezelfde route', () => {
  const cin = read('game/js/cinematics.js');
  assert.match(cin, /function checkLandmarks\(w\)/);
  assert.match(cin, /function playLandmark\(w, lm\)/);
  assert.match(cin, /buildingReach\(w\.map, lm\.x, lm\.y\)/);
});

console.log(`landmark_ontdekking_test: ${n}/${n} ok`);
