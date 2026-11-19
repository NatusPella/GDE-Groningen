// Sliders schrijven uitgesteld naar gde-settings; sluiten bewaart de laatste waarde. node scripts/settings_debounce_test.mjs
const KEY = 'gde-settings';
const opslag = new Map(); let writes = 0;
globalThis.localStorage = {
  getItem: (k) => (opslag.has(k) ? opslag.get(k) : null),
  setItem: (k, v) => { if (k !== KEY) throw new Error('test schreef naar ' + k); writes++; opslag.set(k, String(v)); },
  removeItem: (k) => opslag.delete(k),
};
globalThis.document = undefined;
const S = await import('../game/js/settings.js');
let n = 0, fails = 0;
const ok = (c, m, i = '') => { n++; if (!c) { fails++; console.log('FAIL', m, i); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let heard = 0; S.onSettingsChange(() => { heard++; }); const heard0 = heard;
for (let i = 1; i <= 20; i++) S.setSetting('masterVolume', i / 40);
ok(heard - heard0 === 20, 'luisteraars krijgen elke sliderstap meteen', heard - heard0);
ok(writes === 0, 'slepen schrijft niet per event', writes);
ok(S.getSettings().masterVolume === 0.5, 'de stand in het geheugen is meteen goed');
await sleep(260);
ok(writes === 1 && JSON.parse(opslag.get(KEY)).masterVolume === 0.5, 'na de pauze één schrijfbeurt met de laatste waarde', writes);
// sluiten: de laatste waarde gaat er meteen in
S.setSetting('musicVolume', 0.33);
ok(writes === 1, 'nog niet geschreven');
S.flushSettings();
ok(writes === 2 && JSON.parse(opslag.get(KEY)).musicVolume === 0.33, 'flush bewaart de laatste waarde');
S.flushSettings();
ok(writes === 2, 'flush zonder wijziging schrijft niets');
// een schakelaar schrijft meteen, met de uitgestelde slider erbij
S.setSetting('sfxVolume', 0.44);
S.setSetting('showMinimap', false);
const d = JSON.parse(opslag.get(KEY));
ok(writes === 3 && d.showMinimap === false && d.sfxVolume === 0.44, 'schakelaar schrijft meteen, de slider gaat mee');
await sleep(260);
ok(writes === 3, 'de uitgestelde beurt vervalt na die schrijfbeurt', writes);
console.log(`settings_debounce_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
