// De waakhond voor achtergebleven scènes (#435): de consolewaarschuwing
// "scene leftovers cleared" kwam elf keer op één dag langs zonder te zeggen wat
// er bleef hangen. Nu noemt de regel de vlag en komt hij per teken één keer.
// Ook de reis met de trein ruimt zijn vlag op als de rit afbreekt.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { REST_S, hangendeTeken, restMelding, restSleutel, telRest } from '../game/js/scenerest.js';
import { cinematicHang, cinematicLimit, CINE_MARGIN_S, CINE_MAX_S, OPENING_HANG_MS, SCENE_HANG_MS } from '../game/js/cinelimit.js';

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

t('de waakhond kapt een lange treinrit niet na 150 s af', () => {
  // een treinrit van 4 km duurt ongeveer 4 minuten en meldt drie keer die duur
  // plus vier minuten; de oude vaste grens van 150 s kapte hem midden in de rit
  // af (#496). Een scène die niet lang mag duren houdt de oude grens.
  assert.equal(CINE_MARGIN_S, 20);
  assert.equal(CINE_MAX_S, 150);
  assert.equal(cinematicLimit({ duration: 960, long: true }), 980);
  assert.equal(cinematicLimit({ duration: 960 }), 150, 'zonder long blijft de vaste grens');
  assert.equal(cinematicLimit({ duration: 3 }), 23);
  assert.equal(cinematicLimit({}), 30, 'zonder duur een korte lijn');
  assert.equal(cinematicLimit(null), 30);
  const s = lees('safety.js');
  assert.match(s, /const limit = cinematicLimit\(c\);/);
  assert.doesNotMatch(s, /CINE_MAX_S/, 'de grens staat in cinelimit.js, niet meer hier');
  assert.match(lees('stationtravel.js'), /id: 'train-ride', priority: 2, duration: minutes \* 60 \* 3 \+ 240, long: true/);
});

// Startvangnet (#635): de opening die de eerste seconde gameplay niet vrijgeeft, en de
// scène die zijn eigen klok niet vooruit krijgt, worden door cinematics.js afgebroken.
// Sinds #635 is dat de enige plek: main.js had een tweede 30 s-tak, en die deed niets
// omdat de import ontbrak (undef_check ving hem).
t('een hangende opening wordt na 30 s overgeslagen', () => {
  assert.equal(OPENING_HANG_MS, 30000);
  assert.equal(cinematicHang({ startedAt: 0, now: 29000, worldTime: 0.5, sceneT: 5 }), null, 'na 29 s nog niet');
  assert.equal(cinematicHang({ startedAt: 0, now: 31000, worldTime: 0.5, sceneT: 5 }), 'opening');
  assert.equal(cinematicHang({ startedAt: 0, now: 31000, worldTime: 3, sceneT: 5 }), null, 'de wereldklok loopt: geen opening meer');
});

t('een scène die zelf niet vooruitkomt wordt na 20 s afgebroken', () => {
  assert.equal(SCENE_HANG_MS, 20000);
  assert.equal(cinematicHang({ startedAt: 0, now: 19000, worldTime: 30, sceneT: 1.9 }), null);
  assert.equal(cinematicHang({ startedAt: 0, now: 21000, worldTime: 30, sceneT: 1.9 }), 'frozen');
  assert.equal(cinematicHang({ startedAt: 0, now: 21000, worldTime: 30, sceneT: 2.5 }), null, 'een scène die vooruitkomt speelt door');
  assert.equal(cinematicHang({ startedAt: null, now: 21000, worldTime: 30, sceneT: 0 }), null, 'zonder starttijd niets doen');
  assert.equal(cinematicHang({ startedAt: 0, now: NaN, worldTime: 30, sceneT: 0 }), null, 'zonder klok niets doen');
});

// #771: een bewuste pause:true-scène mag in zijn eerste twee seconden op de speler wachten
// (AFK). Voor die scènes telt de wandklok niet als hang; een gewone scène wordt nog steeds
// afgebroken en de opening-regel blijft voor iedereen gelden.
t('een bewuste pause:true-scène wordt niet als hang overgeslagen (#771)', () => {
  assert.equal(cinematicHang({ startedAt: 0, now: 21000, worldTime: 30, sceneT: 1.9, waitsForInput: true }), null, 'een AFK-speler verliest zijn pauzescène niet');
  assert.equal(cinematicHang({ startedAt: 0, now: 21000, worldTime: 30, sceneT: 1.9, waitsForInput: false }), 'frozen', 'een gewone scène wordt nog steeds afgebroken');
  assert.equal(cinematicHang({ startedAt: 0, now: 60000, worldTime: 30, sceneT: 1.9, waitsForInput: true }), null, 'ook na een minuut wachten geen valse hang');
  assert.equal(cinematicHang({ startedAt: 0, now: 31000, worldTime: 0.5, sceneT: 1, waitsForInput: true }), 'opening', 'de opening-regel blijft gelden');
});

t('cinematics.js is de enige eigenaar van het startvangnet', () => {
  const c = lees('cinematics.js');
  assert.match(c, /cinematicHang\(\{ startedAt: active\._wStart, now, worldTime: w && w\.time, sceneT: active\.t \}\) === 'opening'/);
  // #771: de 'frozen'-regel geeft een bewuste pauzescène de ruimte (waitsForInput)
  assert.match(c, /cinematicHang\(\{ startedAt: active\._wStart, now, worldTime: w && w\.time, sceneT: active\.t, waitsForInput: !!active\.pause \}\) === 'frozen'/);
  const m = lees('main.js');
  assert.doesNotMatch(m, /startWatch/, 'de tweede 30 s-tak in main.js is weg (#635)');
  assert.doesNotMatch(m, /skipCinematic/, 'main.js breekt geen scènes meer zelf af');
});

console.log(`safetywacht_test: ${n}/${n} ok`);
