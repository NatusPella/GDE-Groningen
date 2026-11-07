// Samen spelen (#684): de positieve "samen kan"-lijst en de "eigen plan"-kaart. De lijsten en teksten
// staan puur in coopstatus.js; samenplan.js toont ze als HUD-tip (hudcards.js, niet in Node te laden).
// Daarom toetst deze test de teksten en de bedrading in de bron, en niet de kaart in beeld.
//   node scripts/samenplan_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as S from '../game/js/coopstatus.js';
import { GAST_ACTIVITEITEN } from '../game/js/coopgast.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => fs.readFileSync(path.join(ROOT, 'game/js', f), 'utf8');
const woorden = (s) => s.trim().split(/\s+/).length;
let n = 0, fails = 0;
const ok = (fn, name) => { n++; try { fn(); } catch (e) { fails++; console.log(`FAIL ${name}: ${e.message}`); } };

ok(() => {
  assert.deepEqual(S.EIGEN_PLAN.map(([naam]) => naam), ['hengelen', 'pannenkoeken bakken', 'de beiaard', 'boeren']);
  // De vier dingen op de kaart zijn precies de lokale activiteiten van een gast (#429, #434).
  assert.deepEqual([...GAST_ACTIVITEITEN].sort(), ['boeren', 'carillon', 'hengelen', 'pannenkoek']);
  for (const [, waar] of S.EIGEN_PLAN) assert.ok(waar && typeof waar === 'string', 'elke activiteit noemt waar');
}, 'de eigen-plan-lijst noemt de vier lokale activiteiten met hun plek');

ok(() => {
  for (const [naam, waar] of S.EIGEN_PLAN) { assert.ok(S.EIGEN_PLAN_TEKST.includes(naam), naam); assert.ok(S.EIGEN_PLAN_TEKST.includes(waar), waar); }
  assert.match(S.EIGEN_PLAN_TEKST, /^Doe intussen je eigen ding: /);
  assert.ok(woorden(S.EIGEN_PLAN_TEKST) <= 40, 'de kaart blijft kort: ' + woorden(S.EIGEN_PLAN_TEKST));
  assert.equal(S.EIGEN_PLAN_TITEL, 'Doe intussen je eigen ding');
}, 'de eigen-plan-kaart is één korte Nederlandse zin met alle vier de plekken');

ok(() => {
  assert.match(S.SAMEN_KAN_REGEL, /^Samen kan nu: /);
  assert.ok(woorden(S.SAMEN_KAN_KORT) <= 14);
  assert.ok(S.SAMEN_KAN_TITEL.length > 0);
}, 'de positieve lijst en de korte regel bestaan');

// De bedrading: één kaart naast de eerste "Meedoen?", één bij een host-only activiteit, en de volledige
// lijst in de wachtkamer (het Samen-scherm). De kaart zelf (hudcards) is niet in Node getest.
const activities = src('activities.js');
ok(() => assert.match(activities, /import \{ toonEigenPlan \} from '\.\/samenplan\.js'/), 'activities importeert de eigen-plan-kaart');
ok(() => assert.match(activities, /const sw = samenWaarschuwing\(w, 'activiteit', a\.id\);[\s\S]{0,300}?toonEigenPlan\(w\)/), 'een gast die bij een host-only activiteit staat, krijgt de eigen-plan-kaart');

const coopnet = src('coopnet.js');
ok(() => assert.match(coopnet, /export function zetSamenKanHaak\(fn\)/), 'coopnet heeft de haak voor de kaart (geen hudcards-import in de netcode)');
ok(() => assert.match(coopnet, /case 'meedoen':[\s\S]{0,1600}?if \(samenKanHaak\) samenKanHaak\(world\)/), 'naast de eerste "Meedoen?" komt de samen-kan-kaart');
ok(() => assert.doesNotMatch(coopnet, /from '\.\/samenplan\.js'/, 'coopnet blijft vrij van hudcards (anders laden de netwerktests niet meer in Node)'));

const main = src('main.js');
ok(() => assert.match(main, /import \{ meldSamenKan \} from '\.\/samenplan\.js'/), 'main.js importeert de kaart');
ok(() => assert.match(main, /zetSamenKanHaak\(meldSamenKan\)/), 'main.js zet de haak');

const lobby = src('lobby.js');
ok(() => assert.match(lobby, /import \{ SAMEN_KAN_REGEL \} from '\.\/coopstatus\.js'/), 'de lobby gebruikt de positieve lijst');
ok(() => {
  const aantal = (lobby.match(/SAMEN_KAN_REGEL/g) || []).length;
  assert.ok(aantal >= 3, 'de lijst staat in de wachtkamer en op het samenscherm (' + aantal + ')');
}, 'de volledige lijst staat in de wachtkamer en op het samen-scherm');

const plan = src('samenplan.js');
ok(() => {
  assert.match(plan, /voice: false/, 'de kaarten worden niet uitgesproken door een stem die er niet is');
  assert.match(plan, /new WeakSet\(\)/, 'de kaart komt één keer per wereld');
  for (const k of ["key: 'samen-kan'", "key: 'eigen-plan'"]) assert.ok(plan.includes(k), k);
}, 'de kaarten zijn gewone, eenmalige HUD-tips');

if (fails) { console.log(`${fails} mislukt`); process.exit(1); }
console.log(`samenplan_test: ${n}/${n} ok`);
