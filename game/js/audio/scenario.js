// Scenario-muziek (#497), uit audio.js gehaald: de instrumentale loops die de
// G-Music vervangen bij een race, achtervolging, dienst of scène. De WebAudio-
// context, de muziekbus en de instellingen komen via setScenarioHost binnen,
// zodat deze module niets uit audio.js hoeft te importeren en de cyclus 0 blijft.
import { sfeerTracks } from '../missiesfeer.js';
import * as speech from '../speech.js';
import { cutMusicActive, cutMusicGain } from '../sfx/cutmusic.js';
import { musicDuckGain, musicDuckStep } from '../sfx/mixplan.js';
import { createScenarioDirector, activityMusicKey, createLoopScan } from '../scenariomusic.js';
import { FOOTBALL_TRACKS, footballMusicVolume, footballDucking } from '../footballmusic.js';

// Instrumental loops that replace G-Music while something big happens
// (scenariomusic.js decides which); not part of the radio rotation.
const SCENARIO_TRACKS = {
  race: './audio/scenario/Burnout_Threshold.mp3',
  chase: './audio/scenario/Redline_Ascent.mp3',
  kart: './audio/scenario/kart_loop.mp3',
  padel: './audio/scenario/padel_loop.mp3',
  golf: './audio/scenario/golf_loop.mp3',
  klimtoren: './audio/scenario/klimtoren_loop.mp3',
  trein: './audio/scenario/trein_loop.mp3',
  bus: './audio/scenario/bus_loop.mp3',
  boerderij: './audio/scenario/boerderij_loop.mp3',
  vlucht: './audio/scenario/vlucht_loop.mp3',
  missie: './audio/scenario/missie_spanning_loop.mp3',
  fiets: './audio/scenario/fiets_loop.mp3',
  thuis: './audio/scenario/thuis_loop.mp3',
  menu: './audio/scenario/menu_loop.mp3',
  pvp: './audio/scenario/pvp_arena_loop.mp3',
  ...Object.fromEntries(Object.entries(FOOTBALL_TRACKS).map(([k, t]) => [k, `./audio/voetbal/${t.file}`])), // de voetbalmuziek (footballmusic.js): alleen geladen als de fase er om vraagt en het bestand bestaat
  ...sfeerTracks(), // de missiesferen waarvan de eigenaar het bestand leverde (missiesfeer.js); de rest valt terug op 'missie'
};
const SCENARIO_VOLUME = 0.8;
const SCENARIO_FADE_IN = 1.5; // s
const SCENARIO_FADE_OUT = 2.2; // s
// #931: de menu-loop stopt niet meteen als je het pauzemenu sluit: hij speelt
// zacht door en pakt zijn plek weer op als je binnen deze tijd terugkomt. Zo
// begint de muziek niet bij elke Escape opnieuw.
export const MENU_PARK_S = 45;

let host = null;
export function setScenarioHost(h) { host = h; }

const scenarioDirector = createScenarioDirector();
const scenarioBuffers = {};
let scenarioVol = null;
let scenarioDuck = 0;   // glijdende dempstand onder een gesprek of ondertitelde scène (mixplan.js musicDuckStep)
let scenarioNow = null; // { key, src, fade }
let parkedMenu = null;  // de menu-loop die net zweeg en nog even zijn plek houdt
let parkTimer = null;

// Een gedecodeerde track van enkele minuten is ca. 60 MB: bewaar alleen wat speelt of net zweeg (de menu-loop), geef de rest vrij (review: perf).
function evictScenarioBuffers(houd) {
  for (const k of Object.keys(scenarioBuffers)) {
    if (k === houd || (scenarioNow && scenarioNow.key === k) || (parkedMenu && parkedMenu.key === k)) continue;
    const e = scenarioBuffers[k];
    if (e && e.buf) delete scenarioBuffers[k];
  }
}

function loadScenarioBuffer(key) {
  if (scenarioBuffers[key]) return;
  evictScenarioBuffers(key);
  scenarioBuffers[key] = { loading: true };
  const ctx = host.ctx();
  fetch(SCENARIO_TRACKS[key])
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
    .then((data) => ctx.decodeAudioData(data))
    .then((buf) => {
      const chans = [];
      for (let c = 0; c < buf.numberOfChannels; c++) chans.push(buf.getChannelData(c));
      // Minutes-long track: find the loop points in steps from
      // updateScenarioMusic(), never in one pass inside a frame (#473).
      scenarioBuffers[key] = { buf, loop: null, scan: createLoopScan(chans, buf.sampleRate) };
    })
    .catch((e) => { scenarioBuffers[key] = { failed: true }; console.warn('scenario music', key, e); });
}

// One step of the loop-point scan per frame, for every track that arrived but
// has no loop points yet. Typical tracks only have encoder padding at the ends
// and finish in the first step; a long silent intro still cannot block a frame.
function scanScenarioLoops() {
  for (const key in scenarioBuffers) {
    const e = scenarioBuffers[key];
    if (!e || !e.scan) continue;
    const loop = e.scan.step();
    if (loop) { e.loop = loop; e.scan = null; }
  }
}

function stopScenarioTrack() {
  const s = scenarioNow;
  scenarioNow = null;
  if (!s) return;
  const ctx = host.ctx();
  const t = ctx.currentTime;
  s.fade.gain.cancelScheduledValues(t);
  s.fade.gain.setValueAtTime(s.fade.gain.value, t);
  s.fade.gain.linearRampToValueAtTime(0, t + SCENARIO_FADE_OUT);
  try { s.src.stop(t + SCENARIO_FADE_OUT + 0.05); } catch (e) { /* already stopped */ }
  s.src.onended = () => s.fade.disconnect();
}

// Het menu zweeg: de loop blijft draaien (op 0) en houdt zijn plek MENU_PARK_S
// seconden vast. Kom je binnen die tijd terug, dan gaat hij daar verder in plaats
// van opnieuw te beginnen (#931).
function parkScenarioTrack() {
  const s = scenarioNow;
  scenarioNow = null;
  if (!s) return;
  const ctx = host.ctx();
  const t = ctx.currentTime;
  s.fade.gain.cancelScheduledValues(t);
  s.fade.gain.setValueAtTime(s.fade.gain.value, t);
  s.fade.gain.linearRampToValueAtTime(0, t + SCENARIO_FADE_OUT);
  parkedMenu = s;
  clearTimeout(parkTimer);
  parkTimer = setTimeout(() => {
    if (parkedMenu !== s) return;
    parkedMenu = null;
    try { s.src.stop(); } catch (e) { /* al gestopt */ }
    s.src.onended = () => s.fade.disconnect();
  }, MENU_PARK_S * 1000);
}

function resumeScenarioTrack() {
  const s = parkedMenu;
  if (!s) return false;
  clearTimeout(parkTimer);
  parkTimer = null;
  parkedMenu = null;
  const ctx = host.ctx();
  const t = ctx.currentTime;
  s.fade.gain.cancelScheduledValues(t);
  s.fade.gain.setValueAtTime(Math.max(0, s.fade.gain.value), t);
  s.fade.gain.linearRampToValueAtTime(0.7, t + SCENARIO_FADE_IN);
  scenarioNow = s;
  return true;
}

function startScenarioTrack(key) {
  // het menu pakt zijn oude plek weer op als het kort geleden zweeg (#931)
  if (key === 'menu' && resumeScenarioTrack()) return true;
  const entry = scenarioBuffers[key];
  if (!entry || !entry.buf || !entry.loop) return false;
  const ctx = host.ctx();
  if (!scenarioVol) {
    scenarioVol = ctx.createGain();
    scenarioVol.connect(host.musicOut());
  }
  const src = ctx.createBufferSource();
  src.buffer = entry.buf;
  const oneShot = !!(FOOTBALL_TRACKS[key] && FOOTBALL_TRACKS[key].oneShot); // een sting speelt één keer
  src.loop = !oneShot;
  if (!oneShot) { src.loopStart = entry.loop.start; src.loopEnd = entry.loop.end; }
  const fade = ctx.createGain();
  const t = ctx.currentTime;
  fade.gain.setValueAtTime(0, t);
  fade.gain.linearRampToValueAtTime(key === 'menu' ? 0.7 : 1, t + SCENARIO_FADE_IN); // the menu loop sits a bit lower
  src.connect(fade).connect(scenarioVol);
  src.start(t);
  scenarioNow = { key, src, fade };
  return true;
}

// De vier deuntjes die alleen ter vervanging van de radio spelen (#502): de
// busbaan, het boerenwerk op de trekker, het vliegen en de fiets. Staat de radio
// uit, dan blijven die vier stil; de rest (race, missie, menu) speelt altijd.
export const RADIO_VEHICLE_KEYS = ['bus', 'boerderij', 'vlucht', 'fiets'];
export function scenarioKeyAllowed(key, on) {
  return !!key && (!!on || !RADIO_VEHICLE_KEYS.includes(key));
}

// Returns the scenario key while one is (starting to) play, else null.
export function updateScenarioMusic(dt, world) {
  scanScenarioLoops();
  const m = world.mission;
  const race = !!(m && m.phase === 'active' && m.raceMusic);
  const chasing = world.wanted > 0 && !(world.police && world.police.searching) && !world.pendingRespawn;
  let want = scenarioDirector.update(dt, { race, chasing, activity: activityMusicKey(world, host.getSettings()) });
  if (!scenarioKeyAllowed(want, host.radioOn())) want = null;
  if (want) loadScenarioBuffer(want);
  const cur = scenarioNow ? scenarioNow.key : null;
  if (want !== cur) {
    // switch once the new loop is decoded; until then the old one keeps going
    if (!want) {
      // het menu houdt zijn plek vast in plaats van te stoppen (#931)
      if (cur === 'menu') parkScenarioTrack(); else stopScenarioTrack();
    }
    else if (scenarioBuffers[want].loop) { stopScenarioTrack(); startScenarioTrack(want); }
    else if (scenarioBuffers[want].failed) want = null;
  }
  scenarioDuck = musicDuckStep(scenarioDuck, cutMusicActive() ? 0 : speech.musicDuck(), dt);
  if (scenarioVol) scenarioVol.gain.value = SCENARIO_VOLUME * host.musicVolume(host.getSettings()) * (1 - 0.45 * host.stingDuck.level) * musicDuckGain(scenarioDuck) * cutMusicGain() * (want && want.startsWith('voetbal_') ? footballMusicVolume(host.getSettings()) * footballDucking(world) : 1);
  return want && scenarioBuffers[want] && !scenarioBuffers[want].failed ? want : null;
}

export const scenarioPlaying = () => !!scenarioNow;
// geheugenbewaking (#1004, memwatch.js): bytes van de gedecodeerde scenariotracks die nu vastgehouden worden
export function scenarioBytes() {
  let n = 0;
  for (const e of Object.values(scenarioBuffers)) if (e && e.buf) n += (e.buf.length || 0) * (e.buf.numberOfChannels || 0) * 4;
  return n;
}
export const scenarioKey = () => (scenarioNow ? scenarioNow.key : null);

