// #682: de aantallen in spelerstekst komen uit de bron, niet uit de hand. Deze test vergelijkt de tekst in
// todo.js met LESSEN, VILLAGES, WORLD_END_TOTAL, EIERBAL_TOTAL, SECRETS_TOTAL en AGENDA, en bewaakt de
// woordenlijst (docs/DESIGN-BEDIENING.md) en de labels in Te doen, pauzemenu en kaart.
//   node scripts/spelerstekst_aantallen_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LESSEN, LES_IDS } from '../game/js/vliegschoolrules.js';
import { VILLAGES, WORLD_END_TOTAL } from '../game/js/ommelandlines.js';

const lees = (p) => fs.readFileSync(new URL('../game/js/' + p, import.meta.url), 'utf8');
const todo = lees('todo.js');
const getal = (src, naam) => { const m = src.match(new RegExp(`export const ${naam} = (\\d+)`)); return m ? Number(m[1]) : null; };
const eierballen = getal(lees('achievements.js'), 'EIERBAL_TOTAL');
const geheimen = getal(lees('geheimen.js'), 'SECRETS_TOTAL');
let n = 0, fails = 0;
const t = (name, f) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', e.message.split('\n')[0]); } };

t('#682: de vliegschool-tekst klopt met LESSEN (20 lessen: 11 vliegtuig, 9 helikopter)', () => {
  const vliegtuig = LESSEN.filter((l) => l.kist === 'vliegtuig').length;
  const heli = LESSEN.filter((l) => l.kist === 'heli' || l.kist === 'helikopter').length;
  assert.equal(LESSEN.length, 20);
  assert.equal(LES_IDS.length, 20);
  assert.equal(vliegtuig, 11);
  assert.equal(heli, 9);
  assert.match(todo, /LESSEN\.length/, 'de meta leest LESSEN.length');
  assert.match(todo, /vliegtuigLessen = LESSEN\.filter/, 'het vliegtuig-aantal komt uit LESSEN');
  assert.match(todo, /heliLessen = LESSEN\.filter/, 'het heli-aantal komt uit LESSEN');
  assert.doesNotMatch(todo, /Zes lessen met het vliegtuig en zeven/, 'de oude tekst met 13 lessen is weg');
});

t('#682: dorpen, wereld-einden, eierballen en geheimen komen uit hun bron', () => {
  assert.ok(Object.keys(VILLAGES).length >= 8, 'de dorpen: ' + Object.keys(VILLAGES).length);
  assert.equal(WORLD_END_TOTAL, 12, 'twaalf wereld-einden');
  assert.ok(eierballen > 0 && geheimen > 0);
  assert.match(todo, /Object\.keys\(VILLAGES\)\.length/, 'de dorpen tellen uit VILLAGES');
  assert.match(todo, /WORLD_END_TOTAL/, 'de wereld-einden uit ommelandlines.js');
  assert.match(todo, /EIERBAL_TOTAL/, 'de eierballen uit achievements.js');
  assert.match(todo, /SECRETS_TOTAL/, 'de geheimen uit geheimen.js');
  assert.doesNotMatch(todo, /const WORLD_ENDS = 12/, 'geen handmatige twaalf meer');
});

t('#682: één woordenlijst in docs, Te doen, pauzemenu en kaart', () => {
  const docs = fs.readFileSync(new URL('../docs/DESIGN-BEDIENING.md', import.meta.url), 'utf8');
  assert.match(docs, /Woordenlijst voor spelerstekst \(#682\)/);
  for (const w of ['**activiteit**', '**minigame**', '**bijbaan**', '**dienst**', '**kantoorklus**', '**ronde**']) assert.ok(docs.includes(w), w);
  assert.match(todo, /'minigames', 'Minigames'/, 'Te doen noemt de spelletjes Minigames');
  assert.match(todo, /'diensten', 'Diensten'/, 'en de bijbanen Diensten');
  assert.match(todo, /'kantoorklussen', 'Kantoorklussen'/);
  const pause = lees('pausemenu.js');
  assert.match(pause, /Activiteiten/, 'het pauzemenu noemt het geheel Activiteiten');
  const kaart = lees('mapview.js');
  assert.match(kaart, /diensten: 'Dienst'/, 'de kaart kent Dienst');
  assert.match(kaart, /kantoorklussen: 'Kantoorklus'/, 'en Kantoorklus');
});

console.log(`spelerstekst_aantallen_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
