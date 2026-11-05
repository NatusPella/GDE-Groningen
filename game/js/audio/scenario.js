// Scenario-muziek (#497), uit audio.js gehaald: de instrumentale loops die de
// G-Music vervangen bij een race, achtervolging, dienst of scène. De WebAudio-
// context, de muziekbus en de instellingen komen via setScenarioHost binnen,
// zodat deze module niets uit audio.js hoeft te importeren en de cyclus 0 blijft.
import { createScenarioDirector, activityMusicKey, createLoopScan } from '../scenariomusic.js';

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
};
const SCENARIO_VOLUME = 0.8;
const SCENARIO_FADE_IN = 1.5; // s
const SCENARIO_FADE_OUT = 2.2; // s

let host = null;
export function setScenarioHost(h) { host = h; }

const scenarioDirector = createScenarioDirector();
const scenarioBuffers = {};
let scenarioVol = null;
let scenarioNow = null; // { key, src, fade }

function loadScenarioBuffer(key) {
  if (scenarioBuffers[key]) return;
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

function startScenarioTrack(key) {
  const entry = scenarioBuffers[key];
  if (!entry || !entry.buf || !entry.loop) return false;
  const ctx = host.ctx();
  if (!scenarioVol) {
    scenarioVol = ctx.createGain();
    scenarioVol.connect(host.musicOut());
  }
  const src = ctx.createBufferSource();
  src.buffer = entry.buf;
  src.loop = true;
  src.loopStart = entry.loop.start;
  src.loopEnd = entry.loop.end;
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
  let want = scenarioDirector.update(dt, { race, chasing, activity: activityMusicKey(world) });
  if (!scenarioKeyAllowed(want, host.radioOn())) want = null;
  if (want) loadScenarioBuffer(want);
  const cur = scenarioNow ? scenarioNow.key : null;
  if (want !== cur) {
    // switch once the new loop is decoded; until then the old one keeps going
    if (!want) stopScenarioTrack();
    else if (scenarioBuffers[want].loop) { stopScenarioTrack(); startScenarioTrack(want); }
    else if (scenarioBuffers[want].failed) want = null;
  }
  if (scenarioVol) scenarioVol.gain.value = SCENARIO_VOLUME * host.musicVolume(host.getSettings()) * (1 - 0.45 * host.stingDuck.level);
  return want && scenarioBuffers[want] && !scenarioBuffers[want].failed ? want : null;
}

export const scenarioPlaying = () => !!scenarioNow;
export const scenarioKey = () => (scenarioNow ? scenarioNow.key : null);

