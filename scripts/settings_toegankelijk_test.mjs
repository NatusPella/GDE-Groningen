// De toegankelijkheidsopties van 21-11 in de instellingen (screenShake, subtitleVlak, markerVormen, tikStand) en hun migratie:
//   node scripts/settings_toegankelijk_test.mjs
// Een oud bestand zonder de sleutels valt op de standaard terug zonder versiesprong, een kapotte waarde ook, een gekozen waarde blijft
// staan, en het bestaande bestand (andere instellingen, binds, v) raakt niet kapot. Eigen opslag; schrijft nooit naar echte opslag.
// Samen spelen: lokaal per speler, geen netwerk (de test controleert dat de modules geen fetch of netwerkimport hebben).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SETTINGS_VERSION } from '../game/js/savemigrate.js';

const KEY = 'gde-settings';
const opslag = new Map();
globalThis.localStorage = {
  getItem: (k) => (k === KEY && opslag.has(k) ? opslag.get(k) : null),
  setItem: (k, v) => { if (k !== KEY) throw new Error(`test schreef naar ${k}`); opslag.set(k, String(v)); },
  removeItem: (k) => opslag.delete(k),
  clear: () => opslag.clear(),
};
globalThis.document = undefined;
const laad = async () => import(`../game/js/settings.js?toegankelijk=${Math.random()}`);
const zet = (o) => { opslag.clear(); opslag.set(KEY, JSON.stringify(o)); };

let n = 0;
const ok = (c, naam) => { n++; assert.ok(c, naam); };

// 1. oud bestand zonder de sleutels
zet({ v: SETTINGS_VERSION, masterVolume: 0.4, reduceMotion: true, colorBlind: 'protanopie', subtitleBox: true, keyBinds: { shift: 'x' } });
let S = await laad();
let st = S.getSettings();
ok(st.screenShake === 'aan' && st.subtitleVlak === 'vol' && st.markerVormen === false && st.tikStand === 'uit', 'ontbrekende sleutels vallen op de standaard terug');
ok(st.masterVolume === 0.4 && st.reduceMotion === true && st.colorBlind === 'protanopie' && st.subtitleBox === true, 'de bestaande keuzes blijven staan');
ok(JSON.parse(opslag.get(KEY)).v === SETTINGS_VERSION, 'de versie blijft gelijk: geen versiesprong nodig');

// 2. kapotte waarden
zet({ v: SETTINGS_VERSION, screenShake: 'stormachtig', subtitleVlak: 7, markerVormen: 'ja', tikStand: 'altijd' });
S = await laad(); st = S.getSettings();
ok(st.screenShake === 'aan' && st.subtitleVlak === 'vol' && st.markerVormen === false && st.tikStand === 'uit', 'kapotte waarden vallen terug');

// 3. gekozen waarden blijven, en schrijven houdt de rest heel
zet({ v: SETTINGS_VERSION, screenShake: 'uit', subtitleVlak: 'licht', markerVormen: true, tikStand: 'beide', sfxVolume: 0.3 });
S = await laad(); st = S.getSettings();
ok(st.screenShake === 'uit' && st.subtitleVlak === 'licht' && st.markerVormen === true && st.tikStand === 'beide', 'gekozen waarden worden gelezen');
S.setSetting('screenShake', 'minder'); S.setSetting('tikStand', 'rennen'); S.setSetting('subtitleVlak', 'zacht'); S.setSetting('markerVormen', false);
S.flushSettings();
const d = JSON.parse(opslag.get(KEY));
ok(d.screenShake === 'minder' && d.tikStand === 'rennen' && d.subtitleVlak === 'zacht' && d.markerVormen === false, 'wijzigingen staan onder de gde-settings-sleutel');
ok(d.sfxVolume === 0.3 && d.v === SETTINGS_VERSION, 'de andere instellingen en de versie blijven');

// 4. Standaard herstellen zet ze terug (het zijn gewone voorkeuren, geen identiteit)
S.resetSettings(); S.flushSettings();
st = S.getSettings();
ok(st.screenShake === 'aan' && st.tikStand === 'uit' && st.subtitleVlak === 'vol' && st.markerVormen === false, 'herstellen zet de nieuwe opties terug');

// 5. een nieuwer bestand met een toekomstige stand blijft van die versie (#578/#781)
zet({ v: SETTINGS_VERSION + 1, screenShake: 'extreem' });
S = await laad();
ok(S.getSettings().screenShake === 'aan', 'een onbekende toekomstige stand valt voor het spel terug');
S.setSetting('masterVolume', 0.5); S.flushSettings();
ok(JSON.parse(opslag.get(KEY)).screenShake === 'extreem', 'en wordt niet overschreven door een andere wijziging');

// 6. lokaal: geen netwerk in de nieuwe modules
for (const f of ['a11ylogic.js', 'holdlatch.js']) {
  const src = readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8');
  ok(!/\bfetch\(|XMLHttpRequest|WebSocket|RTCPeerConnection|from '\.\/net\//.test(src), `${f} praat niet met het net`);
}
// ook niet in de coöpberichten: geen van de sleutels staat in het netwerkprotocol
const proto = readFileSync(new URL('../game/js/net/protocol.js', import.meta.url), 'utf8');
ok(!/screenShake|subtitleVlak|markerVormen|tikStand/.test(proto), 'de opties komen niet in het netwerkprotocol');

console.log(`settings_toegankelijk_test: ${n} controles ok`);
process.exit(0);
