// Compat-suite, deel 2: instellingen (gde-settings, #983). Een oud, half, onbekend of handmatig aangepast
// instellingenbestand laadt altijd naar een bruikbare stand: onbekende sleutels veranderen niets, ontbrekende
// velden krijgen hun standaard en getallen buiten hun schuifbereik vallen terug (volume 0..1, resolutie 0,5..1,
// zichtafstand een bekende stand, beeldhoek, camera-afstand, gevoeligheid, interfacegrootte).
// De test leest de echte settings-module met een eigen opslag en schrijft nooit naar echte opslag.
//   node scripts/compat_settings_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SETTINGS_VERSION } from '../game/js/savemigrate.js';
import { VIEW_DISTANCES } from '../game/js/viewdist.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'scripts/fixtures/saves');
const KEY = 'gde-settings';
const opslag = new Map();
globalThis.localStorage = {
  getItem: (k) => (k === KEY && opslag.has(k) ? opslag.get(k) : null),
  setItem: (k, v) => { if (k !== KEY) throw new Error(`test schreef naar ${k}`); opslag.set(k, String(v)); },
  removeItem: (k) => opslag.delete(k),
  clear: () => opslag.clear(),
};
globalThis.document = undefined;

let teller = 0;
const laad = async () => import(`../game/js/settings.js?compat=${teller++}`);
const zet = (tekst) => { opslag.clear(); opslag.set(KEY, typeof tekst === 'string' ? tekst : JSON.stringify(tekst)); };

let n = 0, fails = 0;
const t = async (naam, f) => { n++; try { await f(); } catch (e) { fails++; console.log(`FAIL ${naam}: ${e.message}`); } };

const defaults = (await (async () => { opslag.clear(); return (await laad()).getSettings(); })());
const S0 = { ...defaults };

// 1. de oude bestanden van eerdere versies
const fixtures = fs.readdirSync(DIR).filter((f) => f.startsWith('settings-') && f.endsWith('.json'));
await t('er zijn oude instellingenbestanden', () => assert.ok(fixtures.length >= 5));
for (const f of fixtures) {
  await t(`${f}: laadt naar een bruikbare stand`, async () => {
    const fx = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
    zet(fx.settings);
    const s = (await laad()).getSettings();
    for (const k of ['masterVolume', 'musicVolume', 'sfxVolume', 'voiceVolume']) assert.ok(s[k] >= 0 && s[k] <= 1, `${k} ${s[k]}`);
    assert.ok(s.resolution >= 0.5 && s.resolution <= 1);
    assert.ok(s.drawDistance in VIEW_DISTANCES);
    assert.ok(['laag', 'middel', 'hoog'].includes(s.quality));
    assert.ok(!('verhaal' in s) && !('nieuwverhaal' in s), 'het oude verhaalkeuzeveld is weg');
    // een veld dat het bestand had en dat nog bestaat blijft zoals het was
    for (const [k, v] of Object.entries(fx.settings)) if (k in S0 && typeof v === 'boolean' && k !== 'gore' && k !== 'shadows') assert.equal(s[k], v, `${k} blijft`);
  });
}

// 2. onbekende en ontbrekende sleutels, kapotte inhoud
await t('een leeg bestand en een ontbrekend bestand geven de standaard', async () => {
  for (const x of [undefined, '', '{}', 'null', '[]', '123', '"x"', 'niet json', '{"v":', '{"v":10']) {
    if (x === undefined) opslag.clear(); else zet(x);
    assert.deepEqual((await laad()).getSettings(), S0, `bestand ${JSON.stringify(x)}`);
  }
});
await t('onbekende sleutels veranderen niets aan de bekende', async () => {
  zet({ v: SETTINGS_VERSION, masterVolume: 0.4, bestaatNiet: { a: 1 }, __proto__x: 1, constructor: 5 });
  const s = (await laad()).getSettings();
  assert.equal(s.masterVolume, 0.4);
  assert.ok(!('bestaatNiet' in s));
  assert.equal(s.musicVolume, S0.musicVolume, 'een ontbrekend veld krijgt zijn standaard');
});
await t('een bestand zonder versie wordt als het oudste gelezen en bijgewerkt', async () => {
  zet({ masterVolume: 0.3, gore: 'ja', drawDistance: 'oud' });
  const s = (await laad()).getSettings();
  assert.equal(s.masterVolume, 0.3);
  assert.equal(s.gore, S0.gore, 'een gore die geen boolean is valt weg');
  assert.equal(JSON.parse(opslag.get(KEY)).v, SETTINGS_VERSION, 'het bestand is naar de huidige versie bijgewerkt');
});

// 3. waarden buiten hun bereik
const buiten = {
  masterVolume: [-1, 2, 1e9, 'abc', null, NaN, '0.5'],
  musicVolume: [-1, 2, 1e9],
  sfxVolume: [-5, 5],
  voiceVolume: [-0.1, 9],
  resolution: [0, 0.1, 1.5, 9999, -1, 'hoog', null],
  drawDistance: ['bestaat-niet', 5, null, '', 'ULTRA'],
  quality: ['ultra', 5, null, ''],
  brightness: [0, 99, -1, 'x', 1e9],
  uiScale: [0, 0.1, 99, -3, 1e9],
  fov: [0, 5, 500, -90, 1e9],
  cameraDistance: [0, -1, 100, 1e9],
  mouseSensitivity: [0, -2, 1e6],
  steerSensitivity: [0, 9],
  padLookSensitivity: [0, 99],
  minimapZoom: [0, 99],
  hudMode: ['bestaat-niet', 5],
  difficulty: ['onmogelijk', 5, null],
  keyBinds: ['x', 5, [], null, { w: 5 }, { bestaatniet: 'KeyZ' }],
  padBinds: ['x', 5, [], null, { a: 'x' }],
  onlineKleur: ['rood', 5, '#12', '#gggggg'],
  onlineNaam: [5, null, 'x'.repeat(5000)],
  onlineMeedoen: ['true', 1, 'ja', {}],
};
for (const [k, lijst] of Object.entries(buiten)) {
  for (const v of lijst) {
    const naam = `${k} = ${typeof v === 'number' && !Number.isFinite(v) ? String(v) : JSON.stringify(v)} valt terug op een bruikbare waarde`;
    await t(naam, async () => {
      zet(JSON.stringify({ v: SETTINGS_VERSION, [k]: v }));
      const s = (await laad()).getSettings();
      switch (k) {
        case 'masterVolume': case 'musicVolume': case 'sfxVolume': case 'voiceVolume': assert.ok(Number.isFinite(s[k]) && s[k] >= 0 && s[k] <= 1, `${s[k]}`); break;
        case 'resolution': assert.ok(s.resolution >= 0.5 && s.resolution <= 1, `${s.resolution}`); break;
        case 'drawDistance': assert.ok(s.drawDistance in VIEW_DISTANCES); break;
        case 'quality': assert.ok(['laag', 'middel', 'hoog'].includes(s.quality)); break;
        case 'brightness': assert.ok(s[k] >= 0.6 && s[k] <= 1.6, `${s[k]}`); break;
        case 'uiScale': assert.ok(s[k] >= 0.8 && s[k] <= 1.5, `${s[k]}`); break;
        case 'fov': assert.ok(s[k] >= 50 && s[k] <= 90, `${s[k]}`); break;
        case 'cameraDistance': assert.ok(s[k] >= 0.8 && s[k] <= 1.6, `${s[k]}`); break;
        case 'mouseSensitivity': assert.ok(s[k] >= 0.3 && s[k] <= 2.5, `${s[k]}`); break;
        case 'steerSensitivity': assert.ok(s[k] >= 0.5 && s[k] <= 1.5); break;
        case 'padLookSensitivity': assert.ok(s[k] >= 0.3 && s[k] <= 2.5); break;
        case 'minimapZoom': assert.ok(s[k] >= 0.6 && s[k] <= 1.6); break;
        case 'hudMode': assert.ok(['slim', 'alles', 'minimaal'].includes(s.hudMode)); break;
        case 'difficulty': assert.ok(['ontspannen', 'standaard', 'uitdagend'].includes(s.difficulty)); break;
        case 'keyBinds': case 'padBinds': assert.ok(s[k] && typeof s[k] === 'object' && !Array.isArray(s[k])); break;
        case 'onlineKleur': assert.match(s.onlineKleur, /^#[0-9a-f]{6}$/i); break;
        case 'onlineNaam': assert.ok(typeof s.onlineNaam === 'string' && s.onlineNaam.length <= 16); break;
        case 'onlineMeedoen': assert.equal(s.onlineMeedoen, null, 'alleen een echte ja of nee telt (toestemming, ADR 0022)'); break;
        default: assert.fail('onbekende sleutel in de test');
      }
    });
  }
}

// 4. geldige waarden en het hoge uiteinde van elke schuif blijven staan (geen stille reset van wat de speler koos)
await t('geldige keuzes blijven zoals de speler ze koos', async () => {
  const keuze = { masterVolume: 0, musicVolume: 0.35, sfxVolume: 1, voiceVolume: 0.5, resolution: 0.5, brightness: 1.6, uiScale: 0.8, fov: 90, cameraDistance: 1.6, mouseSensitivity: 0.3, steerSensitivity: 1.5, padLookSensitivity: 2.5, minimapZoom: 0.6, hudMode: 'alles', difficulty: 'uitdagend', onlineMeedoen: true, onlineKleur: '#aabbcc' };
  zet({ v: SETTINGS_VERSION, ...keuze });
  const s = (await laad()).getSettings();
  for (const [k, v] of Object.entries(keuze)) assert.equal(s[k], v, k);
});

// 5. schrijven laat het bestand heel en de versie omhoog
await t('een wijziging na een kapot bestand schrijft een heel bestand', async () => {
  zet('{"v":10,"masterVolume":');
  const S = await laad();
  S.setSetting('masterVolume', 0.6); S.flushSettings();
  const d = JSON.parse(opslag.get(KEY));
  assert.equal(d.v, SETTINGS_VERSION);
  assert.equal(d.masterVolume, 0.6);
});

console.log(`compat_settings_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
