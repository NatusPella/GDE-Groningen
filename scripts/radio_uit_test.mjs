// #502: de radio moet uit te zetten zijn en de toeter moet onder de motor
// blijven. Deze test bewijst twee dingen zonder AudioContext of browser:
//
//  a. de scenariomuziek van een voertuig (bus, boerderij, vlucht, fiets) start
//     niet als de radio uit staat en wel als hij aan staat; een race, een
//     achtervolging en de andere activiteiten houden hun eigen muziek;
//  b. N zet de radio om tijdens een helirun, een minigame, de duifmodus en
//     padel, en een minigame zet de radio niet meer zelf aan.
//
// De functies worden uit de bron gelezen en in een kleine proefstand gezet: de
// echte updateScenarioMusic() en de echte updateRadio() uit game/js/radio.js,
// met de audio-knopen (start/stop van een track, setRadioOn) als tellers.
//
//   node scripts/radio_uit_test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createScenarioDirector, activityMusicKey } from '../game/js/scenariomusic.js';
import { registerBusyProbe, playerBusy } from '../game/js/busy.js';
import { createAdState } from '../game/js/radioads.js';
import { programmeAt, normalizeRadio, STATION_NAME } from '../game/js/musicpick.js';

const AUDIO = new URL('../game/js/audio/scenario.js', import.meta.url);
const RADIO = new URL('../game/js/radio.js', import.meta.url);
const audioSrc = readFileSync(AUDIO, 'utf8');
const radioSrc = readFileSync(RADIO, 'utf8');

let fails = 0, n = 0;
const ok = (c, name, extra) => { n++; if (!c) { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };

// Een functie uit de bron knippen: van 'function naam(' tot de bijbehorende
// sluitende accolade, met strings en template-strings overgeslagen.
function extractFn(src, name) {
  const at = src.indexOf('function ' + name + '(');
  if (at < 0) throw new Error(name + ' staat niet in de bron');
  let depth = 0, i = src.indexOf('{', at);
  const start = i;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === "'" || c === '"' || c === '`') {
      const q = c;
      for (i++; i < src.length && src[i] !== q; i++) if (src[i] === '\\') i++;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return src.slice(at, i + 1);
  }
  throw new Error(name + ': geen sluitende accolade');
}

// --- de vier voertuigsleutels staan in de bron ------------------------------
const keyLine = audioSrc.match(/export const RADIO_VEHICLE_KEYS = \[([^\]]*)\];/);
ok(!!keyLine, 'RADIO_VEHICLE_KEYS staat in scenario.js');
const vehicleKeys = keyLine ? keyLine[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean) : [];
ok(vehicleKeys.join() === 'bus,boerderij,vlucht,fiets', 'precies de vier voertuigdeuntjes', vehicleKeys);
ok(/host\.radioOn\(\)/.test(audioSrc), 'updateScenarioMusic gebruikt de radiostand');
const allowedSrc = audioSrc.match(/export function scenarioKeyAllowed[\s\S]*?\n}/);
ok(!!allowedSrc, 'scenarioKeyAllowed staat in scenario.js');
const scenarioKeyAllowed = allowedSrc ? new Function('RADIO_VEHICLE_KEYS', allowedSrc[0].replace(/^export /, '') + '\nreturn scenarioKeyAllowed;')(vehicleKeys) : null;
if (scenarioKeyAllowed) {
  for (const k of vehicleKeys) {
    ok(scenarioKeyAllowed(k, false) === false, k + ': radio uit is stil');
    ok(scenarioKeyAllowed(k, true) === true, k + ': radio aan speelt');
  }
  for (const k of ['race', 'chase', 'kart', 'padel', 'golf', 'trein', 'missie', 'thuis', 'menu', 'pvp', 'klimtoren']) {
    ok(scenarioKeyAllowed(k, false) === true, k + ': houdt zijn eigen muziek ook met de radio uit');
  }
  ok(scenarioKeyAllowed(null, true) === false && scenarioKeyAllowed(undefined, false) === false, 'geen sleutel is geen muziek');
}

// --- a. de echte updateScenarioMusic, met de audio-knopen als tellers -------
// De track-start en -stop zetten hier alleen een naam; in het spel hangen daar
// de AudioBufferSourceNodes aan. Geen ctx, geen fetch, geen decode.
function loadScenarioMusic() {
  const body = extractFn(audioSrc, 'updateScenarioMusic');
  const factory = new Function('createScenarioDirector', 'activityMusicKey', 'scenarioKeyAllowed', [
    'const scenarioBuffers = {};',
    'let scenarioNow = null;',
    'let stopped = 0;',
    'let radioOn = true;',
    'const host = { ctx: () => ({}), musicOut: () => null, getSettings: () => ({}), musicVolume: () => 1, radioOn: () => radioOn, stingDuck: { level: 0 } };',
    'const scenarioVol = null;',
    'const SCENARIO_VOLUME = 0.6;',
    'const stingDuck = { level: 0 };',
    'const getSettings = () => ({});',
    'const musicVolume = () => 1;',
    'const scanScenarioLoops = () => {};',
    'const scenarioDirector = createScenarioDirector();',
    // een gedecodeerde track met loop-punten: zo gedraagt de echte functie zich
    // alsof het bestand al binnen is
    'const loadScenarioBuffer = (k) => { if (!scenarioBuffers[k]) scenarioBuffers[k] = { buf: {}, loop: { start: 0, end: 1 } }; };',
    'const startScenarioTrack = (k) => { scenarioNow = { key: k }; };',
    'const stopScenarioTrack = () => { stopped++; scenarioNow = null; };',
    body,
    'return {',
    '  setRadio: (v) => { radioOn = !!v; },',
    '  step: (dt, w) => updateScenarioMusic(dt, w),',
    '  now: () => (scenarioNow ? scenarioNow.key : null),',
    '  loaded: () => Object.keys(scenarioBuffers),',
    '  stopped: () => stopped,',
    '};',
  ].join('\n'));
  return factory(createScenarioDirector, activityMusicKey, scenarioKeyAllowed);
}

const scenario = loadScenarioMusic();
const W = {
  bus: { player: { inVehicle: { isBus: true, sideJob: true } } },
  fiets: { player: { inVehicle: { isBike: true } } },
  boerderij: { player: { inVehicle: { model: { name: 'tractor' } } } },
  vlucht: { player: { inVehicle: { isHeli: true } } },
};
// een paar seconden draaien, zoals het spel per frame doet (0,1 s per stap)
const frames = (secs, w) => { let last = null; for (let t = 0; t < secs; t += 0.1) last = scenario.step(0.1, w); return last; };

// radio uit: geen deuntje, en het bestand wordt niet eens geladen
for (const k of vehicleKeys) {
  scenario.setRadio(false);
  const last = frames(3, W[k]);
  ok(last === null && scenario.now() === null, k + ': start niet met de radio uit', { last, now: scenario.now() });
  ok(!scenario.loaded().includes(k), k + ': wordt met de radio uit niet geladen', scenario.loaded());
}
// radio aan: hetzelfde wereldbeeld laat het deuntje wel horen
for (const k of vehicleKeys) {
  const fresh = loadScenarioMusic();
  fresh.setRadio(true);
  let last = null;
  for (let t = 0; t < 3; t += 0.1) last = fresh.step(0.1, W[k]);
  ok(last === k && fresh.now() === k, k + ': speelt met de radio aan', { last, now: fresh.now() });
}

// de rest van de scenariomuziek heeft een eigen reden en blijft ongewijzigd
{
  // per geval een verse regisseur, zodat een achtervolging van het vorige geval
  // (die zes seconden blijft hangen) niet meedoet
  const scene = (secs, w) => {
    const s = loadScenarioMusic();
    s.setRadio(false);
    let last = null;
    for (let t = 0; t < secs; t += 0.1) last = s.step(0.1, w);
    return last;
  };
  ok(scene(1, { mission: { phase: 'active', raceMusic: true } }) === 'race', 'een race speelt ook met de radio uit');
  ok(scene(3, { wanted: 1 }) === 'chase', 'een achtervolging speelt ook met de radio uit');
  ok(scene(1, { padelGame: {} }) === 'padel', 'padel houdt zijn eigen muziek');
  ok(scene(1, { activityGame: 'kartbaan' }) === 'kart', 'de kartbaan houdt zijn eigen muziek');
  ok(scene(1, { mission: { phase: 'active' } }) === 'missie', 'de missiespanning blijft');
  ok(scene(1, { trainDriving: {} }) !== 'bus', 'de trein is geen voertuigdeuntje van de radio');
}

// radio uit terwijl het busdeuntje speelt: het stopt; weer aan: het komt terug
{
  const s = loadScenarioMusic();
  const stopBefore = s.stopped();
  s.setRadio(true);
  for (let t = 0; t < 3; t += 0.1) s.step(0.1, W.bus);
  ok(s.now() === 'bus', 'busdeuntje speelt met de radio aan');
  s.setRadio(false);
  ok(s.step(0.1, W.bus) === null && s.now() === null, 'radio uit stopt het busdeuntje meteen');
  ok(s.stopped() > stopBefore, 'de track wordt ook echt gestopt');
  s.setRadio(true);
  ok(s.step(0.1, W.bus) === 'bus' && s.now() === 'bus', 'radio weer aan: het deuntje komt terug');
}

// --- b. de echte updateRadio uit radio.js ----------------------------------
// De importregels gaan eruit en de rest van het bestand draait in een
// proefstand: window en document zijn nep, de audio-imports zijn tellers.
function loadRadio({ document: doc } = {}) {
  const body = radioSrc.replace(/^import[^;]*;[ \t]*$/gm, '').replace(/^export /gm, '');
  const setOnline = [], shown = [];
  const stubs = {
    window: {},
    document: doc || { body: { classList: { contains: () => false } } },
    setRadioOn: (v) => setOnline.push(!!v),
    setRadioProgramme: () => {},
    onRadioBreak: () => {},
    radioInBreak: () => false,
    playLineVoice: () => false,
    playRadioJingle: () => {},
    playTextMumble: () => {},
    lineVoiceFor: () => null,
    NARRATOR: 'Verteller',
    smsVoiceFor: () => null,
    SMS_SAY: { bike: { lines: [] } },
    NACHTSTREEK: ['nacht'],
    KROLBRUG_FAULTS: ['brug'],
    COW_FEED: { koe: [['koe', 'boe']] },
    PLANTSOEN_NEWS: 'nieuws',
    EVENT_DAYS: {},
    RADIO_HOST: 'Geesje',
    RADIO_GRUNN: { ident: ['x'], news: ['x'], ads: ['x'], traffic: ['x'], weatherRain: ['x'], weatherSun: ['x'], cows: ['x'], rikus: ['x'] },
    KERMIS_NEWS: 'kermis',
    talkActive: () => false,
    playerBusy,
    radioMayTalk: () => true,
    showRadioSub: (who, text) => shown.push(who + ': ' + text),
    hideRadioSub: () => {},
    createAdState,
    programmeAt,
    normalizeRadio,
    STATION_NAME,
  };
  const names = Object.keys(stubs);
  const factory = new Function(...names, body + '\nreturn { updateRadio, radioKeyBlocked, setRadio, radioIsOn, radioPlaying: () => playing };');
  const api = factory(...names.map((k) => stubs[k]));
  api.setRadioOnCalls = setOnline;
  return api;
}

// een wereld met alleen wat updateRadio gebruikt; input is een echte rand
const makeWorld = (o = {}) => {
  let pressed = false;
  const w = {
    time: 0, clock: 12, paused: false, messages: [],
    input: { wasPressed: (k) => k === 'n' && pressed },
    press() { pressed = true; },
    release() { pressed = false; },
    ...o,
  };
  return w;
};
const toggle = (api, w) => { w.press(); api.updateRadio(0.1, w); w.release(); };

// de oude gedwongen tak is weg
ok(!/const want = on \|\| playerBusy/.test(radioSrc), 'de gedwongen want-tak staat niet meer in radio.js');
ok(/if \(!radioKeyBlocked\(w\) && w\.input\.wasPressed\('n'\)\) setRadio\(!on\);/.test(radioSrc), 'N gaat langs radioKeyBlocked');

// een filmpje (de cinematics-probe) houdt de toets tegen
let film = false;
registerBusyProbe('cinematic', () => film);

// N doet het in de helirun, de minigame, de duifmodus en bij padel
for (const [naam, flag] of [['helirun', { heliRun: {} }], ['minigame', { activityGame: 'kartbaan' }], ['duifmodus', { pigeonMode: {} }], ['padel', { padelGame: {} }], ['alles tegelijk', { heliRun: {}, activityGame: 'kartbaan', pigeonMode: {} }]]) {
  const api = loadRadio();
  const w = makeWorld(flag);
  ok(api.radioIsOn() === true, naam + ': de radio staat aan');
  toggle(api, w);
  ok(api.radioIsOn() === false, naam + ': N zet de radio uit');
  toggle(api, w);
  ok(api.radioIsOn() === true, naam + ': N zet de radio weer aan');
}

// radio uit blijft uit: de helirun of de minigame zet hem niet zelf weer aan
for (const [naam, flag] of [['helirun', { heliRun: {} }], ['minigame', { activityGame: 'kartbaan' }], ['duifmodus', { pigeonMode: {} }]]) {
  const api = loadRadio();
  const w = makeWorld(flag);
  api.setRadio(false, { announce: false });
  for (let i = 0; i < 120; i++) { w.time += 0.1; api.updateRadio(0.1, w); }
  ok(api.radioIsOn() === false, naam + ': de radio blijft uit');
  ok(api.radioPlaying() === false, naam + ': audio.js krijgt niets te spelen');
  ok(!api.setRadioOnCalls.includes(true), naam + ': de radio wordt niet stiekem aangezet', api.setRadioOnCalls);
}

// en andersom: aan blijft aan
{
  const api = loadRadio();
  const w = makeWorld({ heliRun: {} });
  for (let i = 0; i < 60; i++) { w.time += 0.1; api.updateRadio(0.1, w); }
  ok(api.radioIsOn() === true && api.radioPlaying() === true, 'aan blijft aan tijdens de helirun');
}

// een filmpje: de toets doet niets (de scène is van de cineast)
{
  film = true;
  const api = loadRadio();
  const w = makeWorld({ heliRun: {} });
  toggle(api, w);
  ok(api.radioIsOn() === true, 'tijdens een filmpje doet N niets');
  ok(api.radioKeyBlocked(w) === true, 'radioKeyBlocked zegt: filmpje');
  film = false;
  toggle(api, w);
  ok(api.radioIsOn() === false, 'na het filmpje doet N het weer');
}

// hetzelfde via de HUD-klasse van een scène (hideHud)
{
  const doc = { body: { classList: { contains: (c) => c === 'cine-hide-hud' } } };
  const api = loadRadio({ document: doc });
  const w = makeWorld();
  toggle(api, w);
  ok(api.radioIsOn() === true, 'de cine-hide-hud-klasse houdt de toets ook tegen');
}

// het pauzemenu houdt de toets (de wereld staat stil)
{
  const api = loadRadio();
  const w = makeWorld({ paused: true });
  toggle(api, w);
  ok(api.radioIsOn() === true, 'in het pauzemenu doet N niets');
  w.paused = false;
  toggle(api, w);
  ok(api.radioIsOn() === false, 'weer in het spel doet N het');
}

// een missie of een gesprek is geen filmpje: N werkt daar gewoon
{
  const api = loadRadio();
  const w = makeWorld({ mission: { phase: 'active' }, storyContact: true });
  toggle(api, w);
  ok(api.radioIsOn() === false, 'tijdens een missie of een gesprek zet N de radio uit');
}

console.log('radio_uit_test: ' + n + ' controles, ' + fails + ' mislukt');
assert.equal(fails, 0, fails + ' controle(s) mislukt');

