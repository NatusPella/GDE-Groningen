// De uitlegkaarten (#568): de kaart "Samen spelen" na de eerste missie. Die kaart viel weg zodra
// Alleen spelen een sessie van één werd (#554), want de oude poort was `!w.coopNet`. De kaart hangt nu
// aan isSamenSessie(): een echte sessie met anderen houdt hem tegen, een sessie van één niet.
//
// onboarding.js zelf is DOM- en THREE-bedrading (hudcards, narrative, cinematics) en laadt niet in
// Node; daarom toetsen we de regel (controls.js) en de bedrading in de bron. De kaart in beeld is
// niet getest.
//   node scripts/onboarding_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isSamenSessie } from '../game/js/controls.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => fs.readFileSync(path.join(ROOT, 'game/js', f), 'utf8');
let n = 0, fails = 0;
const ok = (fn, name) => { n++; try { fn(); } catch (e) { fails++; console.log(`FAIL ${name}: ${e.message}`); } };

ok(() => {
  assert.equal(isSamenSessie({ coopNet: { role: 'host' }, coopRole: 'host', coopSolo: true }), false, 'een sessie van één is geen samen-sessie');
  assert.equal(isSamenSessie({ coopNet: { role: 'host' }, coopRole: 'host' }), true, 'een echte gastheer-sessie wel');
  assert.equal(isSamenSessie({ coopNet: { role: 'client' }, coopRole: 'client' }), true, 'een gast wel');
  assert.equal(isSamenSessie({ coopSolo: true }), false, 'zonder sessie niet');
  assert.equal(isSamenSessie({}), false);
  assert.equal(isSamenSessie(null), false);
  assert.equal(isSamenSessie(undefined), false);
}, 'isSamenSessie: solo telt niet, een echte sessie wel');

const ob = src('onboarding.js');
ok(() => assert.match(ob, /import \{[^}]*\bisSamenSessie\b[^}]*\} from '\.\/controls\.js'/), 'onboarding importeert isSamenSessie');
ok(() => assert.match(ob, /id: 'samen',[\s\S]{0,700}?when: \(w\) => w\.stats\.missionsDone > startDone && !busy\(w\) && !isSamenSessie\(w\)/), 'de samen-kaart hangt aan isSamenSessie, niet aan de hub');
ok(() => assert.doesNotMatch(ob, /!w\.coopNet/), 'de oude poort (!w.coopNet) is weg');
ok(() => assert.match(ob, /title: 'Samen spelen'/), 'de kaart heet nog Samen spelen');
ok(() => assert.match(ob, /\{ESC\} en kies Samen spelen/), 'de kaart zegt nog waar Samen spelen staat');
// De kaarten blijven in volgorde staan en de samen-kaart is de laatste.
ok(() => {
  const ids = [...ob.matchAll(/^    id: '([a-z]+)',$/gm)].map((m) => m[1]);
  assert.deepEqual(ids, ['doel', 'geld', 'kaart', 'tedoen', 'eerstedag', 'samen']);
}, 'zes kaarten in vaste volgorde, samen als laatste');

if (fails) { console.log(`${fails} mislukt`); process.exit(1); }
console.log(`onboarding_test: ${n}/${n} ok`);
