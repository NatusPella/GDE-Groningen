// #578: een instellingenbestand uit een nieuwere versie wordt bij de eerste wijziging niet teruggezet.
// Een downgrade/rollback die een nieuwer bestand opent, bewaart de hogere `v` en de sleutels die deze
// build niet kent, zodat de volgende nieuwere build zijn eigen stand terugvindt in plaats van opnieuw te
// migreren vanaf de oude versie. De test leest de echte settings-module met een eigen opslag, precies
// zoals settings_online_test.mjs, en schrijft nooit naar echte opslag.
//   node scripts/settings_versie_test.mjs
import assert from 'node:assert/strict';
import { SETTINGS_VERSION } from '../game/js/savemigrate.js';

const KEY = 'gde-settings';
const opslag = new Map();

globalThis.localStorage = {
  getItem: (k) => (k === KEY && opslag.has(k) ? opslag.get(k) : null),
  setItem: (k, v) => {
    if (k !== KEY) throw new Error(`test schreef naar ${k}`);
    opslag.set(k, String(v));
  },
  removeItem: (k) => opslag.delete(k),
  clear: () => opslag.clear(),
};
globalThis.document = undefined;

// Een verse module per scenario: settings.js leest en bewaart via de module-state.
const laad = async () => import(`../game/js/settings.js?versie=${Math.random()}`);
const zetBestand = (waarden) => { opslag.clear(); opslag.set(KEY, JSON.stringify(waarden)); };
const bewaard = () => JSON.parse(opslag.get(KEY));

let n = 0;
const gevallen = [];
const t = (naam, f) => gevallen.push({ naam, f });

t('een bestand van versie 11 met een onbekende sleutel: de wijziging bewaart v 11 en die sleutel', async () => {
  zetBestand({ v: SETTINGS_VERSION + 1, masterVolume: 0.5, toekomstInstelling: { aan: true } });
  const S = await laad();
  assert.equal(S.getSettings().masterVolume, 0.5, 'de bekende stand wordt gelezen');
  S.setSetting('masterVolume', 0.7);
  const d = bewaard();
  assert.equal(d.v, SETTINGS_VERSION + 1, 'de versie gaat nooit omlaag');
  assert.equal(d.masterVolume, 0.7, 'de wijziging staat erin');
  assert.deepEqual(d.toekomstInstelling, { aan: true }, 'de onbekende sleutel blijft bewaard');
});

t('een hogere versie zonder onbekende sleutels blijft ook staan', async () => {
  zetBestand({ v: SETTINGS_VERSION + 2, masterVolume: 0.5 });
  const S = await laad();
  S.setSetting('masterVolume', 0.2);
  assert.equal(bewaard().v, SETTINGS_VERSION + 2);
});

t('Standaard herstellen verlaagt de versie niet en gooit de onbekende sleutel niet weg', async () => {
  zetBestand({ v: SETTINGS_VERSION + 1, toekomstInstelling: 1, masterVolume: 0.2 });
  const S = await laad();
  S.resetSettings();
  const d = bewaard();
  assert.equal(d.v, SETTINGS_VERSION + 1, 'resetten is geen downgrade');
  assert.equal(d.toekomstInstelling, 1, 'de nieuwere stand blijft bewaard');
  assert.equal(d.masterVolume, 1, 'de bekende stand gaat terug naar de standaard');
});

t('een ouder bestand migreert gewoon en schrijft de huidige versie', async () => {
  zetBestand({ v: 1, masterVolume: 0.5, sfxVolume: 1, drawDistance: 'kort' });
  const S = await laad();
  assert.equal(bewaard().v, SETTINGS_VERSION, 'een ouder bestand wordt bijgewerkt naar deze versie');
  S.setSetting('masterVolume', 0.9);
  assert.equal(bewaard().v, SETTINGS_VERSION);
  assert.equal(bewaard().masterVolume, 0.9);
});

t('een nieuwer bestand dat niet wijzigt blijft ongemoeid', async () => {
  const tekst = JSON.stringify({ v: SETTINGS_VERSION + 1, toekomstInstelling: 'x' });
  zetBestand(JSON.parse(tekst));
  await laad();
  assert.equal(opslag.get(KEY), tekst, 'laden schrijft een nieuwer bestand niet opnieuw');
});

// #781: een bestaande sleutel waarvan de nieuwere versie het type wijzigt. Deze build kan die waarde
// niet gebruiken (hij valt terug op de oude default), maar de default mag hem niet overschrijven.
t('een typewijziging van een bekende sleutel overleeft een round-trip (#781)', async () => {
  zetBestand({ v: SETTINGS_VERSION + 1, showMinimap: 'altijd', masterVolume: 0.5 });
  const S = await laad();
  assert.equal(S.getSettings().showMinimap, true, 'een onbruikbaar type valt in het spel terug op de standaard');
  S.setSetting('masterVolume', 0.3); // een andere instelling wijzigen schrijft het bestand
  const d = bewaard();
  assert.equal(d.v, SETTINGS_VERSION + 1, 'de versie blijft van de nieuwere build');
  assert.equal(d.showMinimap, 'altijd', 'de nieuwere waarde wordt niet door de oude default overschreven');
  assert.equal(d.masterVolume, 0.3, 'de eigen wijziging staat erin');
});

t('een zelf gewijzigde sleutel wint van de bewaarde toekomststand (#781)', async () => {
  zetBestand({ v: SETTINGS_VERSION + 1, showMinimap: 'altijd' });
  const S = await laad();
  S.setSetting('showMinimap', false);
  assert.equal(bewaard().showMinimap, false, 'de keuze van de speler in deze build telt');
  assert.equal(bewaard().v, SETTINGS_VERSION + 1);
});

t('een onbekende sleutel blijft ook bij een typewijziging bewaard (#781)', async () => {
  zetBestand({ v: SETTINGS_VERSION + 1, toekomstInstelling: [1, 2], showMinimap: 'altijd' });
  const S = await laad();
  S.setSetting('masterVolume', 0.9);
  assert.deepEqual(bewaard().toekomstInstelling, [1, 2], 'de onbekende sleutel blijft staan');
  assert.equal(bewaard().showMinimap, 'altijd', 'en de bekende sleutel met nieuw type ook');
});

// Sequentieel: elke case gebruikt dezelfde opslag, dus parallel lopen ze door elkaar.
for (const { naam, f } of gevallen) {
  try {
    await f();
    n++;
  } catch (e) {
    console.error(`FAIL ${naam}`);
    throw e;
  }
}
console.log(`settings_versie_test: ${n}/${n} ok`);
