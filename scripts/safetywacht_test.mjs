// De waakhond voor achtergebleven scènes (#435): de consolewaarschuwing
// "scene leftovers cleared" kwam elf keer op één dag langs zonder te zeggen wat
// er bleef hangen. Nu noemt de regel de vlag en komt hij per teken één keer.
// Ook de reis met de trein ruimt zijn vlag op als de rit afbreekt.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { REST_S, hangendeTeken, restMelding, restSleutel, telRest } from '../game/js/scenerest.js';

const lees = (f) => fs.readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8');
let n = 0;
const t = (name, f) => { f(); n++; };

t('een schone wereld heeft geen hangende tekenen', () => {
  assert.deepEqual(hangendeTeken(), []);
  assert.deepEqual(hangendeTeken({ hidePlayers: false, hideNav: false, hud: false }), []);
});

t('elk teken wordt bij zijn eigen vlag gevonden, in een vaste volgorde', () => {
  assert.deepEqual(hangendeTeken({ hidePlayers: true }).map((x) => x.naam), ['cinematicHidePlayers']);
  assert.deepEqual(hangendeTeken({ hideNav: true }).map((x) => x.naam), ['cinematicHideNav']);
  assert.deepEqual(hangendeTeken({ hud: true }).map((x) => x.naam), ['cine-hide-hud']);
  assert.deepEqual(hangendeTeken({ hud: true, hidePlayers: true, hideNav: true }).map((x) => x.sleutel), ['hidePlayers', 'hideNav', 'hud']);
});

t('de melding zegt welke vlag bleef hangen', () => {
  const teken = hangendeTeken({ hidePlayers: true, hud: true });
  const regel = restMelding(teken);
  assert.match(regel, /^\[safety\] scene leftovers cleared \(/);
  assert.match(regel, /cinematicHidePlayers/);
  assert.match(regel, /cine-hide-hud/);
  assert.doesNotMatch(regel, /cinematicHideNav/);
});

t('dezelfde combinatie heeft dezelfde sleutel, een andere niet', () => {
  assert.equal(restSleutel(hangendeTeken({ hidePlayers: true })), restSleutel(hangendeTeken({ hidePlayers: true })));
  assert.notEqual(restSleutel(hangendeTeken({ hidePlayers: true })), restSleutel(hangendeTeken({ hideNav: true })));
});

t('de teller meldt de eerste keer en telt daarna stil', () => {
  const teller = new Map();
  const teken = hangendeTeken({ hud: true });
  assert.equal(telRest(teller, teken), 1);
  assert.equal(telRest(teller, teken), 2);
  assert.equal(telRest(teller, teken), 3);
  assert.equal(telRest(teller, hangendeTeken({ hidePlayers: true })), 1, 'een ander teken is een nieuwe melding');
});

t('drie seconden is de grens', () => assert.equal(REST_S, 3));

t('safety.js gebruikt de hulp, noemt de vlag en waarschuwt maar één keer', () => {
  const s = lees('safety.js');
  assert.match(s, /hangendeTeken\(\{/);
  assert.match(s, /if \(telRest\(restTeller, teken\) === 1\) console\.warn\(restMelding\(teken\)\)/);
  assert.doesNotMatch(s, /console\.warn\('\[safety\] scene leftovers cleared'\)/, 'de oude regel zonder uitleg is weg');
  assert.match(s, /if \(cineT > REST_S\)/, 'de waakhond gebruikt dezelfde grens als de test');
});

t('de treinreis ruimt de vlag op als de rit afbreekt', () => {
  const st = lees('stationtravel.js');
  const endRide = st.slice(st.indexOf('function endRide('), st.indexOf('function rideShot(') > st.indexOf('function endRide(') ? st.indexOf('function rideShot(') : st.indexOf('function arrive('));
  assert.match(endRide, /w\.cinematicHidePlayers = false;[\s\S]*if \(!r \|\| !trip\) return;/, 'endRide wist de vlag voor de vroege terugkeer');
  const arrive = st.slice(st.indexOf('function arrive('), st.indexOf('function saveTrain(') > st.indexOf('function arrive(') ? st.indexOf('function saveTrain(') : st.length);
  assert.match(arrive, /w\.cinematicHidePlayers = false;[\s\S]{0,200}if \(!trip\) return;/, 'arrive wist de vlag ook zonder reis');
});

console.log(`safetywacht_test: ${n}/${n} ok`);
