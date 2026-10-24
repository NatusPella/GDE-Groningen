// Het volume uit de instellingen vanaf de eerste klank (#461): de pure rekenregels
// in game/js/sfx/volume.js, het laden en clampen van de vier volumes in
// settings.js, en de bedrading in audio.js en theme.js.
//   node scripts/audio_volume_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as V from '../game/js/sfx/volume.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0, n = 0;
const ok = (c, name, extra) => { n++; if (!c) { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };
const near = (a, b) => Math.abs(a - b) < 1e-9;

// --- de waarde zelf ---------------------------------------------------------
ok(V.volumeValue(0.1) === 0.1, '10% blijft 10%');
ok(V.volumeValue('0.1') === 0.1, 'een getal als tekst telt als getal (oude of bewerkte instellingen)');
ok(V.volumeValue(' 0.35 ') === 0.35, 'spaties rond een getal als tekst');
ok(V.volumeValue(0) === 0, 'nul blijft nul (muziek of geluid uit)');
ok(V.volumeValue(1) === 1, 'vol blijft vol');
ok(V.volumeValue(4) === 1 && V.volumeValue(-2) === 0, 'buiten 0..1 wordt naar de rand gebracht');
ok(V.volumeValue('abc', 0.75) === 0.75, 'onbruikbare tekst valt terug op de standaard');
ok(V.volumeValue('', 0.75) === 0.75 && V.volumeValue(null, 0.3) === 0.3 && V.volumeValue(NaN, 0.3) === 0.3, 'leeg, null en NaN vallen terug op de standaard');
ok(V.volumeValue(undefined, 0.75) === 0.75, 'ontbrekend valt terug op de standaard');
ok(V.volumeValue(Infinity, 1) === 1, 'oneindig is geen volumewaarde');

const norm = V.normalizeVolumes({ masterVolume: '0.1', musicVolume: 4, sfxVolume: -1 }, { masterVolume: 1, musicVolume: 1, sfxVolume: 0.75, voiceVolume: 1 });
ok(near(norm.masterVolume, 0.1) && norm.musicVolume === 1 && norm.sfxVolume === 0 && norm.voiceVolume === 1, 'alle vier de volumes genormaliseerd', norm);
ok(Object.keys(norm).join() === V.VOLUME_KEYS.join(), 'precies de vier volumeknoppen', Object.keys(norm));

// --- de gain van de mix -----------------------------------------------------
const st = { masterVolume: 0.1, musicVolume: 1, sfxVolume: 0.75, voiceVolume: 1 };
ok(near(V.masterGain(st), 0.055), 'master 10% in een spel is 0.055', V.masterGain(st));
ok(near(V.masterGain(st, { menu: true }), 0.03025), 'master 10% op het startscherm is nog zachter', V.masterGain(st, { menu: true }));
ok(V.masterGain({ masterVolume: 1 }) === V.MASTER_VOLUME, 'master vol is de basis van de mix');
ok(V.masterGain(st, { muted: true }) === 0, 'gedempt is stil');
ok(near(V.masterGain({ masterVolume: '0.1' }), 0.055), 'een opgeslagen tekstwaarde klinkt ook als 10%');
ok(near(V.masterGain({ masterVolume: 4 }), V.MASTER_VOLUME), 'een te hoge opgeslagen waarde wordt niet harder dan vol');

ok(near(V.musicBusGain(st, V.GMUSIC_VOLUME), 0.85), 'muziekbus volgt het muziekvolume');
ok(near(V.musicBusGain({ musicVolume: 0.5 }), 0.425), 'muziek op de helft is de helft');
ok(V.musicBusGain({ musicVolume: 0 }) === 0, 'muziek uit is stil');
ok(near(V.musicBusGain(st, NaN), 0.85), 'een NaN-niveau valt terug op de basis');

// het themalied: dezelfde verhouding als G-Music, als elementvolume
ok(near(V.themeGain(st), 0.04675), 'thema bij master 10% staat op 0.04675', V.themeGain(st));
ok(near(V.themeGain({ masterVolume: 1, musicVolume: 1 }), V.THEME_LEVEL), 'thema vol is dezelfde level als de muziek');
ok(V.themeGain(st, { muted: true }) === 0, 'gedempt thema is stil');
ok(near(V.themeGain(st, { ducked: true }), 0.04675 * 0.4), 'gedempt onder een gesprek');
ok(V.themeGain({ masterVolume: 2, musicVolume: 2 }) <= 1, 'het thema gaat nooit boven 1');

// --- de instellingen: laden en wijzigen -------------------------------------
// een wegwerp-opslag, nooit de echte
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
// een spelersbestand met 10% (als tekst, zoals een ouder of bewerkt bestand het
// kan hebben) en een muziekvolume dat te hoog staat
store.set('gde-settings', JSON.stringify({ v: 10, masterVolume: '0.1', musicVolume: 3, sfxVolume: 0.75, voiceVolume: 1 }));
const S = await import('../game/js/settings.js');
const loaded = S.getSettings();
ok(near(loaded.masterVolume, 0.1), 'opgeslagen 10% wordt geladen (viel eerder terug op 100%)', loaded.masterVolume);
ok(loaded.musicVolume === 1, 'een te hoog opgeslagen muziekvolume wordt naar vol gebracht', loaded.musicVolume);

S.setSetting('masterVolume', 7);
ok(S.getSettings() === loaded, 'er blijft een en dezelfde instellingenobject');
ok(loaded.masterVolume === 1, 'meer dan vol wordt vol', loaded.masterVolume);
S.setSetting('masterVolume', '0.1');
ok(near(loaded.masterVolume, 0.1), 'de schuif zet 10%', loaded.masterVolume);
S.setSetting('masterVolume', -1);
ok(loaded.masterVolume === 0, 'onder nul wordt nul');
S.setSetting('masterVolume', 0.1);
const saved = JSON.parse(store.get('gde-settings'));
ok(near(saved.masterVolume, 0.1), 'de opgeslagen waarde is wat er klinkt', saved.masterVolume);

// een wijziging komt meteen bij de luisteraars aan, met de geclampte waarde
const seen = [];
const stop = S.onSettingsChange((s2, key) => { if (key) seen.push([key, s2[key]]); });
S.setSetting('masterVolume', 0.05);
stop();
ok(seen.some(([k, v]) => k === 'masterVolume' && near(v, 0.05)), 'een volumewijziging wordt meteen gemeld', seen);

// --- de bedrading -----------------------------------------------------------
const src = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const audio = src('game/js/audio.js');
const theme = src('game/js/theme.js');
const settings = src('game/js/settings.js');
ok(/masterGain\(getSettings\(\), \{ menu: menuAudio \}\)/.test(audio), 'audio.js haalt de mastergain uit sfx/volume.js');
ok(/musicBusGain\(getSettings\(\), musicState\.gain\)/.test(audio), 'audio.js zet de muziekbus uit de instellingen (ook de eerste klank)');
ok(!/const GMUSIC_VOLUME = /.test(audio), 'de muziekbasis staat op één plek (sfx/volume.js)');
ok(/if \(musicBus\) musicBus\.gain\.setTargetAtTime/.test(audio), 'een volumewijziging werkt ook door als er geen spel loopt');
ok(/refreshThemeVolume\(\)/.test(audio), 'dempen raakt het themalied meteen');
ok(/import \{ themeGain \} from '\.\/sfx\/volume\.js'/.test(theme) && /themeGain\(getSettings\(\)/.test(theme), 'theme.js rekent met dezelfde regels');
ok(!/const BASE_VOLUME = /.test(theme), 'geen tweede volumerekening in theme.js');
ok(/normalizeVolumes\(raw, DEFAULTS\)/.test(settings), 'settings.js normaliseert de volumes bij het laden');
ok(/VOLUME_KEYS\.includes\(key\)\) value = volumeValue/.test(settings), 'settings.js clampt een volumewijziging');

console.log(`${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
