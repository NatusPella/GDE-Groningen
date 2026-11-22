// Instellingen en toegankelijkheid, de regels (verfijnronde 22-11): de pure regels van settingsrules.js, de controle van waarden in settings.js
// (fuzz van een kapot bestand, een lange reeks wijzigingen met herstellen per tabblad en ongedaan maken, opslag en terugladen), en de migratie.
//   node scripts/settingsrules_test.mjs
// Eigen opslag in het geheugen; schrijft nooit naar echte opslag.
import assert from 'node:assert/strict';
import {
  TAB_KEYS, OWN_SCREEN, NO_ROW, tabOfKey, changedKeys, changedPerTab, resetMessage, dependency, dependencies, silenceWarning,
  synonymsFor, SYNONYMS, cheatsVisible, COLOR_BLIND_LABELS, shakePreviewPx,
} from '../game/js/settingsrules.js';
import { effectsFor, SHAKE_STANDEN } from '../game/js/a11ylogic.js';
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
const laad = async () => import(`../game/js/settings.js?regels=${Math.random()}`);
const zet = (o) => { opslag.clear(); opslag.set(KEY, JSON.stringify(o)); };

let n = 0;
const ok = (c, naam) => { n++; assert.ok(c, naam); };
const gelijk = (a, b, naam) => { n++; assert.deepEqual(a, b, naam); };

// 1. de tabbladen: elke sleutel hoort bij hoogstens een tabblad, en de lijsten kruisen elkaar niet
{
  const alle = Object.values(TAB_KEYS).flat();
  gelijk(new Set(alle).size, alle.length, 'geen sleutel staat op twee tabbladen');
  for (const k of [...OWN_SCREEN, ...NO_ROW]) ok(!alle.includes(k), `${k} hoort niet op een tabblad`);
  gelijk(tabOfKey('screenShake'), 'a11y', 'tabOfKey vindt het tabblad');
  gelijk(tabOfKey('bestaatniet'), null, 'tabOfKey kent het niet');
}

// 2. verschil met de standaard
{
  const def = { a: 1, b: 'x', c: { z: 1 }, d: false };
  gelijk(changedKeys(['a', 'b', 'c', 'd', 'nietdaar'], { a: 1, b: 'y', c: { z: 1 }, d: true }, def).map((x) => x.key), ['b', 'd'], 'alleen wat afwijkt, objecten op inhoud, onbekende sleutels genegeerd');
  const vlak = Object.fromEntries(Object.values(TAB_KEYS).flat().map((k) => [k, 0]));
  ok(Object.values(changedPerTab(vlak, vlak)).every((v) => v === 0), 'geen afwijking, geen teller');
  const anders = { ...vlak, fov: 1 };
  gelijk(changedPerTab(anders, vlak).camera, 1, 'een afwijking telt op het juiste tabblad');
}

// 3. de melding na herstellen
gelijk(resetMessage(0), 'Alles stond al op de standaard.', 'niets te herstellen');
gelijk(resetMessage(1, 'Dit tabblad'), '1 instelling teruggezet naar de standaard.', 'enkelvoud');
gelijk(resetMessage(3), '3 instellingen teruggezet naar de standaard.', 'meervoud');

// 4. afhankelijkheden met reden
{
  const basis = { subtitleBox: true, subtitleContrast: 'normaal', reduceMotion: false, rumble: true, showMinimap: true, showHints: true, colorBlind: 'uit' };
  gelijk(dependencies(basis), {}, 'in de standaardstand doet alles iets');
  ok(dependency('subtitleVlak', { ...basis, subtitleBox: false }).why.includes('Donker vlak'), 'vlak zonder donker vlak');
  ok(dependency('subtitleVlak', { ...basis, subtitleContrast: 'hoog' }).why.includes('altijd vol'), 'vlak bij hoog contrast');
  ok(dependency('screenShake', { ...basis, reduceMotion: true }), 'schudden bij beweging beperken');
  ok(dependency('rumbleStrength', { ...basis, rumble: false }).why.includes('uit'), 'trilsterkte zonder trillen');
  ok(dependency('rumbleStrength', { ...basis, reduceMotion: true }), 'trilsterkte bij beweging beperken');
  ok(dependency('minimapZoom', { ...basis, showMinimap: false }) && dependency('minimapNorth', { ...basis, showMinimap: false }), 'kaartje uit');
  ok(dependency('hintSource', { ...basis, showHints: false }), 'hintbron zonder hints');
  ok(dependency('markerVormen', { ...basis, colorBlind: 'protanopie' }), 'vormen staan al aan door kleurenstand');
  gelijk(dependency('fov', basis), null, 'een gewone instelling heeft geen afhankelijkheid');
  // de redenen zijn gewone taal: geen sleutelnamen
  const alles = dependencies({ subtitleBox: false, subtitleContrast: 'hoog', reduceMotion: true, rumble: false, showMinimap: false, showHints: false, colorBlind: 'tritanopie' });
  for (const why of Object.values(alles)) ok(!/[a-z][A-Z]/.test(why), `reden zonder sleutelnaam: ${why}`);
}

// 5. stilte
{
  ok(silenceWarning({ masterVolume: 1, musicVolume: 1, sfxVolume: 0.75, voiceVolume: 1, showSubtitles: true }) === '', 'normaal geen waarschuwing');
  ok(silenceWarning({ masterVolume: 0, musicVolume: 1, sfxVolume: 1, voiceVolume: 1, showSubtitles: true }).includes('ondertitels'), 'hoofdvolume 0 met ondertitels');
  ok(silenceWarning({ masterVolume: 0, musicVolume: 1, sfxVolume: 1, voiceVolume: 1, showSubtitles: false }).includes('leest niets'), 'stil en geen ondertitels');
  ok(silenceWarning({ masterVolume: 1, musicVolume: 0, sfxVolume: 0, voiceVolume: 0, showSubtitles: false }) !== '', 'alle drie de soorten 0');
  ok(silenceWarning({ masterVolume: 1, musicVolume: 0, sfxVolume: 0.5, voiceVolume: 0, showSubtitles: false }) === '', 'alleen muziek en stemmen uit is geen stilte');
  ok(silenceWarning({ masterVolume: NaN, musicVolume: 1, sfxVolume: 1, voiceVolume: 1, showSubtitles: true }) !== '', 'een kapot volume telt als stil');
}

// 6. cheats
{
  ok(!cheatsVisible(), 'standaard niet in het menu');
  ok(!cheatsVisible({ tonen: true }), 'een oude keuze (tonen) telt niet meer: Cheats is vrijspeelbaar in het verhaal');
  ok(cheatsVisible({ dev: true }) && cheatsVisible({ actief: true }), 'dev of een actieve cheat');
}

// 7. zoeksynoniemen horen bij een echte sleutel, in gewone taal
{
  const alle = new Set(Object.values(TAB_KEYS).flat());
  for (const k of Object.keys(SYNONYMS)) ok(alle.has(k), `synoniem voor een bestaande instelling: ${k}`);
  ok(synonymsFor('reduceFlash').includes('epilepsie'), 'flitsen vindt je ook met epilepsie');
  gelijk(synonymsFor('bestaatniet'), '', 'onbekend geeft leeg');
  gelijk(synonymsFor(undefined), '', 'geen sleutel geeft leeg');
}

// 8. kleurenblindnamen in gewone taal, en de schudproef volgt de stand
{
  for (const k of ['deuteranopie', 'protanopie', 'tritanopie']) ok(/\(\w+\)$/.test(COLOR_BLIND_LABELS[k]) && COLOR_BLIND_LABELS[k].length > k.length + 3, `${k}: gewone woorden erbij`);
  gelijk(shakePreviewPx(SHAKE_STANDEN.aan), 6, 'aan: volle uitslag');
  ok(shakePreviewPx(SHAKE_STANDEN.minder) > 0 && shakePreviewPx(SHAKE_STANDEN.minder) < shakePreviewPx(SHAKE_STANDEN.aan), 'minder: kleiner');
  gelijk(shakePreviewPx(SHAKE_STANDEN.uit), 0, 'uit: stil');
  gelijk(shakePreviewPx(effectsFor({ reduceMotion: true, shake: 'aan' }).cameraShake), 0, 'beweging beperken: stil');
  gelijk(shakePreviewPx(NaN), 0, 'kapotte waarde: stil');
}

// 9. een kapot bestand (fuzz): elke sleutel blijft binnen zijn keuzes en bereik
const S0 = await laad();
const DEF = S0.defaultSettings();
const keys = Object.keys(DEF);
const rnd = (() => { let x = 20251122; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; })();
const junk = ['zzz', '', '__proto__', 'toString', 'constructor', -5, 0, 1e9, 0.0001, null, [], {}, true, false, '1e9', 'NaN', [1], { a: 1 }];
const geldig = (s) => {
  for (const k of keys) {
    const t = typeof DEF[k];
    if (DEF[k] === null) continue;
    if (t === 'object') { ok(s[k] && typeof s[k] === 'object' && !Array.isArray(s[k]), `${k} blijft een object`); continue; }
    ok(typeof s[k] === t, `${k} heeft het type van de standaard (${t}), kreeg ${typeof s[k]}`);
    if (t === 'number') ok(Number.isFinite(s[k]), `${k} is een eindig getal`);
    ok(S0.isValidSetting(k, s[k]), `${k}=${JSON.stringify(s[k])} is een toegestane waarde`);
  }
  ok(s.onlineMeedoen === null || typeof s.onlineMeedoen === 'boolean', 'onlineMeedoen blijft null of boolean');
  ok(s.startKeuze === null || s.startKeuze === 'alleen' || s.startKeuze === 'samen', 'startKeuze blijft nette waarde');
};
for (let ronde = 0; ronde < 150; ronde++) {
  const bestand = {};
  const aantal = 1 + Math.floor(rnd() * 8);
  for (let i = 0; i < aantal; i++) bestand[keys[Math.floor(rnd() * keys.length)]] = junk[Math.floor(rnd() * junk.length)];
  zet(bestand);
  geldig((await laad()).getSettings());
}
// de twee sleutels die eerst niet werden gecontroleerd
{
  zet({ drunkFx: 'zzz', rumbleStrength: 1e9 });
  const s = (await laad()).getSettings();
  gelijk([s.drunkFx, s.rumbleStrength], [DEF.drunkFx, DEF.rumbleStrength], 'drunkFx en rumbleStrength vallen terug op de standaard');
  zet({ drunkFx: 'mild', rumbleStrength: 0.5 });
  const t = (await laad()).getSettings();
  gelijk([t.drunkFx, t.rumbleStrength], ['mild', 0.5], 'een geldige keuze blijft staan');
}

// 10. setSetting weigert een waarde buiten bereik of keuzelijst, en laat de rest zoals het was
{
  zet({});
  const S = await laad();
  const s = S.getSettings();
  S.setSetting('textSize', 'reusachtig'); gelijk(s.textSize, DEF.textSize, 'onbekende tekstgrootte genegeerd');
  S.setSetting('fov', 500); gelijk(s.fov, DEF.fov, 'beeldhoek buiten bereik genegeerd');
  S.setSetting('fov', '70'); gelijk(s.fov, 70, 'een getal als tekst telt als getal');
  S.setSetting('colorBlind', 'paars'); gelijk(s.colorBlind, 'uit', 'onbekende kleurenstand genegeerd');
  S.setSetting('colorBlind', 'protanopie'); gelijk(s.colorBlind, 'protanopie', 'geldige kleurenstand werkt');
  S.setSetting('screenShake', '__proto__'); gelijk(s.screenShake, DEF.screenShake, 'prototype-naam is geen keuze');
  S.setSetting('rumbleStrength', -1); gelijk(s.rumbleStrength, DEF.rumbleStrength, 'negatief trillen genegeerd');
  S.setSetting('drunkFx', 'mild'); gelijk(s.drunkFx, 'mild', 'dronken effecten mild');
  S.setSetting('drawDistance', 'oneindig'); gelijk(s.drawDistance, DEF.drawDistance, 'zichtafstand onbekend genegeerd');
  S.setSetting('resolution', 0.2); gelijk(s.resolution, DEF.resolution, 'resolutie onder de grens genegeerd');
  S.setSetting('resolution', '0.6'); gelijk(s.resolution, 0.6, 'resolutie 60% als tekst');
  S.flushSettings();
  gelijk(JSON.parse(opslag.get(KEY)).fov, 70, 'de geldige wijziging is bewaard');
  const { GFX_PRESETS, MOBILE_PROFILES } = await import('../game/js/gfxprofile.js');
  for (const [naam, p] of [...Object.entries(GFX_PRESETS), ...Object.entries(MOBILE_PROFILES)]) {
    for (const [k, v] of Object.entries(p)) ok(S.isValidSetting(k, v), `voorinstelling ${naam}: ${k}=${v} is toegestaan`);
  }
}

// 11. herstellen per tabblad: alleen die sleutels, binds en toestemming blijven, en de oude waarden komen terug voor ongedaan maken
{
  zet({ fov: 80, brightness: 1.3, masterVolume: 0.2, onlineNaam: 'Klaas', onlineMeedoen: true, keyBinds: { e: 'KeyZ' } });
  const S = await laad();
  const s = S.getSettings();
  const bindsVoor = JSON.stringify(s.keyBinds);
  const oud = S.resetSettingsKeys(TAB_KEYS.video);
  gelijk(Object.keys(oud), ['brightness'], 'alleen wat afweek wordt teruggezet');
  gelijk(oud.brightness, 1.3, 'de oude waarde komt terug');
  gelijk([s.brightness, s.fov, s.masterVolume], [1, 80, 0.2], 'andere tabbladen blijven staan');
  gelijk(JSON.parse(opslag.get(KEY)).brightness, 1, 'direct bewaard');
  const geen = S.resetSettingsKeys(TAB_KEYS.camera.concat(['onlineNaam', 'keyBinds', 'difficulty']));
  gelijk(Object.keys(geen), ['fov'], 'naam, binds en moeilijkheid worden nooit meegenomen');
  gelijk([s.onlineNaam, s.onlineMeedoen, JSON.stringify(s.keyBinds)], ['Klaas', true, bindsVoor], 'identiteit, toestemming en toetsen blijven');
  for (const [k, v] of Object.entries(oud)) S.setSetting(k, v);
  gelijk(s.brightness, 1.3, 'ongedaan maken zet het terug');
  gelijk(S.resetSettingsKeys(['bestaatniet']), {}, 'onbekende sleutel doet niets');
}

// 12. een lange reeks wijzigingen: willekeurig zetten, tabbladen herstellen, ongedaan maken, bewaren en terugladen
{
  zet({});
  const S = await laad();
  const opties = {};
  for (const k of keys) {
    if (OWN_SCREEN.includes(k) || NO_ROW.includes(k)) continue;
    const t = typeof DEF[k];
    opties[k] = t === 'boolean' ? [true, false] : t === 'number' ? [0, 0.3, 0.5, 0.75, 1, 1.25, 1.5, 2, 70, 1e9, -1] : [...junk.filter((j) => typeof j === 'string'), DEF[k]];
  }
  const slKeys = Object.keys(opties);
  const tabs = Object.keys(TAB_KEYS);
  let ongedaan = null;
  for (let i = 0; i < 1500; i++) {
    const r = rnd();
    if (r < 0.7) {
      const k = slKeys[Math.floor(rnd() * slKeys.length)];
      S.setSetting(k, opties[k][Math.floor(rnd() * opties[k].length)]);
    } else if (r < 0.8) {
      const tab = tabs[Math.floor(rnd() * tabs.length)];
      ongedaan = S.resetSettingsKeys(TAB_KEYS[tab]);
      for (const k of TAB_KEYS[tab]) ok(changedKeys([k], S.getSettings(), DEF).length === 0, `${k} staat op de standaard na herstellen van ${tab}`);
    } else if (r < 0.85 && ongedaan) {
      for (const [k, v] of Object.entries(ongedaan)) S.setSetting(k, v);
      ongedaan = null;
    } else if (r < 0.88) {
      S.resetSettings();
    } else if (r < 0.95) {
      S.flushSettings();
      const bewaard = JSON.parse(opslag.get(KEY));
      const na = (await laad()).getSettings();
      for (const k of keys) if (typeof DEF[k] !== 'object') assert.equal(na[k], S.getSettings()[k], `${k} komt na terugladen terug`);
      ok(bewaard.v === SETTINGS_VERSION, 'versie in het bestand klopt');
    }
    if (i % 100 === 0) geldig(S.getSettings());
  }
  geldig(S.getSettings());
}

// 13. migratie: een oud bestand zonder of met de vervallen sleutel cheatsTonen, en een nieuwer bestand blijft heel
{
  zet({ masterVolume: 0.4, v: 1 });
  const s = (await laad()).getSettings();
  gelijk([s.cheatsTonen, s.masterVolume], [undefined, 0.4], 'oud bestand: geen cheatsTonen, de rest blijft');
  zet({ cheatsTonen: true, masterVolume: 0.4, v: 1 });
  gelijk((await laad()).getSettings().cheatsTonen, undefined, 'een oud bestand met cheatsTonen: de sleutel wordt opgeschoond, Cheats blijft verborgen');
  zet({ toekomst: 5, v: SETTINGS_VERSION + 3 });
  const S = await laad();
  S.setSetting('fov', 60); S.flushSettings();
  const f = JSON.parse(opslag.get(KEY));
  gelijk([f.toekomst, f.v, f.fov], [5, SETTINGS_VERSION + 3, 60], 'nieuwer bestand: onbekende sleutel en versie blijven');
}

console.log(`settingsrules_test: ${n} controles ok`);
