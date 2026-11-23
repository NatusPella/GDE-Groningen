// De automatische stand bij de eerste start (gfxprofile.js, besluit eigenaar 23-11): de keuze uit frametijden op Ultra, de opslag
// in gde-settings (gfxAuto '<versie>:<stand>') en de regel in Instellingen > Beeld. Puur: geen opslag, geen GPU.
//   node scripts/autogfx_test.mjs
import assert from 'node:assert/strict';
import { autoPresetFromSample, autoGfxValue, parseAutoGfx, autoGfxNote, AUTO_GFX, AUTO_GFX_VERSION, GFX_PRESETS } from '../game/js/gfxprofile.js';
import { isValidSetting } from '../game/js/settings.js';

let n = 0;
const eq = (a, b, m) => { assert.deepEqual(a, b, m); n++; };
const frames = (ms, count = 60) => Array(count).fill(ms);

// 1. de keuze uit de frametijden op Ultra, met marge
eq(autoPresetFromSample('hoog', frames(16.7)), 'hoog', '60 fps op Ultra (vsync): Ultra');
eq(autoPresetFromSample('hoog', frames(7)), 'hoog', '144 Hz en ruim: Ultra');
eq(autoPresetFromSample('hoog', frames(18)), 'vlot', 'net onder 60 fps op Ultra: Hoog');
eq(autoPresetFromSample('hoog', frames(21.9)), 'vlot', 'tot 22 ms op Ultra: Hoog (lichter, 600 m)');
eq(autoPresetFromSample('hoog', frames(25)), 'middel', '40 fps op Ultra: Midden');
eq(autoPresetFromSample('hoog', frames(40)), 'laag', '25 fps op Ultra: Laag');
// marge: een mediaan op 60 fps met te veel gemiste beelden (p90 boven 22 ms) is geen Ultra
const schokkerig = [...frames(16.7, 80), ...frames(33.4, 20)];
eq(autoPresetFromSample('hoog', schokkerig), 'vlot', 'Ultra met 20% gemiste beelden: Hoog');
const enkeleHik = [...frames(16.7, 95), ...frames(80, 5)];
eq(autoPresetFromSample('hoog', enkeleHik), 'hoog', 'een paar haperingen (streaming) kosten Ultra niet');
// de videokaart begrenst
eq(autoPresetFromSample('middel', frames(16.7)), 'middel', 'basis-iGPU die toevallig soepel tekent: hoogstens Midden');
eq(autoPresetFromSample('laag', frames(16.7)), 'middel', 'zwakke gpu maar soepel: één stap, Midden');
eq(autoPresetFromSample('laag', frames(40)), 'laag', 'zwakke gpu en traag: Laag');
// geen of te weinig meting
eq(autoPresetFromSample('hoog', []), null, 'geen beelden: geen keuze');
eq(autoPresetFromSample('hoog', null), null, 'geen lijst: geen keuze');
eq(autoPresetFromSample('hoog', frames(16.7, AUTO_GFX.minFrames - 1)), 'laag', 'minder dan tien beelden in de meettijd: te traag, Laag');
eq(autoPresetFromSample('hoog', [NaN, -1, Infinity]), null, 'onzin telt niet');
// de keuze is altijd een bestaande stand
for (const ms of [5, 12, 17, 19, 23, 29, 31, 60, 200]) for (const tier of ['laag', 'middel', 'vlot', 'hoog']) {
  const p = autoPresetFromSample(tier, frames(ms));
  assert.ok(p && GFX_PRESETS[p], `${tier} ${ms} ms -> ${p}`); n++;
}

// 2. opslag in gde-settings met versie
eq(autoGfxValue('hoog'), `${AUTO_GFX_VERSION}:hoog`, 'waarde met versie');
eq(parseAutoGfx(autoGfxValue('vlot')), { version: AUTO_GFX_VERSION, preset: 'vlot' }, 'terug te lezen');
eq(parseAutoGfx(''), null, 'leeg: nooit automatisch gekozen');
eq(parseAutoGfx('1:ultra'), null, 'onbekende stand');
eq(parseAutoGfx(5), null, 'geen tekst');
eq(isValidSetting('gfxAuto', autoGfxValue('hoog')) && isValidSetting('gfxAuto', ''), true, 'de instelling neemt de waarde aan');
eq(isValidSetting('gfxAuto', 'zomaar iets'), false, 'en weigert rommel');

// 3. de regel in Instellingen > Beeld: alleen zolang de stand nog de gekozen stand is
const st = (preset, auto) => ({ ...GFX_PRESETS[preset], gfxAuto: auto });
eq(autoGfxNote(st('hoog', autoGfxValue('hoog'))), 'Gekozen op basis van je pc: Ultra', 'Ultra gekozen');
eq(autoGfxNote(st('vlot', autoGfxValue('vlot'))), 'Gekozen op basis van je pc: Hoog', 'Hoog gekozen');
eq(autoGfxNote(st('laag', autoGfxValue('hoog'))), '', 'de speler koos daarna zelf iets anders');
eq(autoGfxNote(st('vlot', '')), '', 'bestaande speler zonder automatische keuze');

console.log(`autogfx_test: ${n} controles groen`);
