import { clamp } from './util.js';
import { FLAGS } from './devflags.js';
import { getCamera } from './scene3d.js';
import { getSettings, onSettingsChange } from './settings.js';
import { isThemeActive } from './theme.js';
import { vehicleContacts } from './vehicle.js';
import { gearboxReadout } from './gearbox.js';
import { createBank, buildImpulse, variantsOf, bufferNames } from './sfx/dsp.js';
import { FX_INFO } from './sfx/fxbank.js';
import { plan as mixPlan, speechDuckFactor } from './sfx/mixplan.js';
import { createLinkups } from './sfx/linkups.js';
import { initAmbience, updateAmbience, ambienceStats, getPlace } from './sfx/ambience.js';
import { initFoley, updateFoley, propHit, foleyStats } from './sfx/foley.js';
import { initUiSfx, uiWorldInit, updateUiSfx, uiDomEvent, isUiGestureTarget } from './sfx/ui.js';
import { updateSkySfx } from './sfx/sky.js';
import { createScenarioDirector, loopPoints } from './scenariomusic.js';
import { MIN_TRACK_S, normalizeTrack, pickTrack, pushHistory, pickJingle, STATION_NAME } from './musicpick.js';
import { createMusicWatch } from './musicwatch.js';
import * as speech from './speech.js';
import { drunkLevel } from './drunk.js';
import { KEYS } from './storagekeys.js';

if (typeof window !== 'undefined') window.__speech = speech;

const MASTER_VOLUME = 0.55;
const MAX_DISTANCE = 120;
const SOURCE_HEIGHT = 1;
const SPEED_OF_SOUND = 343;
const ENGINE_VOICES = 4;
const ENGINE_RANGE = 70;
const SIREN_VOICES = 3;
const SPEECH_RANGE = 45;
const HRTF_NEAR = 14;
const GMUSIC_MANIFEST_URL = './audio/gmusic/manifest.json';
const GMUSIC_VOLUME = 0.85;
const GMUSIC_DUCK_VOLUME = 0.5;
// Instrumental loops that replace G-Music while something big happens
// (scenariomusic.js decides which); not part of the radio rotation.
const SCENARIO_TRACKS = {
  race: './audio/scenario/Burnout_Threshold.mp3',
  chase: './audio/scenario/Redline_Ascent.mp3',
};
const SCENARIO_VOLUME = 0.8;
const SCENARIO_FADE_IN = 1.5; // s
const SCENARIO_FADE_OUT = 2.2; // s
const SIREN_LOW_FREQ = 440;
const SIREN_HIGH_FREQ = 587;
const SIREN_HOLD_MIN = 0.5;
const SIREN_HOLD_MAX = 0.7;

// Pre-recorded TTS voicelines - Tammo/Tessa only, never reused by NPCs/
// police/anyone else. The script is intentionally asymmetric (not every
// character has every line) - playVoiceline() below just no-ops on a
// missing key rather than substituting the wrong character's line.
// Each key now has 3 phrasing variants (same character voice/delivery,
// different words) picked at random - the first is the original file, _v1/
// _v2 are the newer additions, per feedback that a single fixed line per
// trigger got repetitive fast.
function variants(dir, key) {
  return [`./audio/voicelines/${dir}/${key}.wav`, `./audio/voicelines/${dir}/${key}_v1.wav`, `./audio/voicelines/${dir}/${key}_v2.wav`];
}
const TAMMO_LINES = {
  wapen_opgepakt: variants('tammo', 'wapen_opgepakt'),
  geld_opgepakt: variants('tammo', 'geld_opgepakt'),
  auto_gejat: variants('tammo', 'auto_gejat'),
  missie_gestart: variants('tammo', 'missie_gestart'),
  missie_gelukt: variants('tammo', 'missie_gelukt'),
  missie_mislukt: variants('tammo', 'missie_mislukt'),
  opgepakt: variants('tammo', 'opgepakt'),
  water_panic: variants('tammo', 'water_panic'),
};
const ANITA_LINES = {
  wapen_opgepakt: variants('anita', 'wapen_opgepakt'),
  geld_opgepakt: variants('anita', 'geld_opgepakt'),
  missie_gestart: variants('anita', 'missie_gestart'),
  missie_gelukt: variants('anita', 'missie_gelukt'),
  missie_mislukt: variants('anita', 'missie_mislukt'),
  opgepakt: variants('anita', 'opgepakt'),
  kus: variants('anita', 'kus'),
};
const GMUSIC_JINGLES = {
  station_id: './audio/gmusic/jingles/station_id.wav',
  nummerovergang: './audio/gmusic/jingles/nummerovergang.wav',
  rij_knipoog: './audio/gmusic/jingles/rij_knipoog.wav',
  hoge_wanted: './audio/gmusic/jingles/hoge_wanted.wav',
};
const AMBIENT_JINGLE_KEYS = ['station_id', 'nummerovergang', 'rij_knipoog'];

// NPC ambient chatter, police barks, Kiekdoar phone-feed lines - each key has
// a few voice variants recorded for it; playX() below always picks one at
// random so the same trigger doesn't sound identical every time.
const NPC_PHRASE_AUDIO = Array.from({ length: 10 }, (_, i) =>
  [0, 1, 2].map((v) => `./audio/npc/phrase_${i}_v${v}.wav`));

const POLICE_BARK_KEYS = ['stop_politie', 'zet_kant', 'verdachte_voertuig', 'handen_omhoog', 'achtervolging', 'aangehouden'];
const POLICE_BARK_AUDIO = {};
for (const k of POLICE_BARK_KEYS) POLICE_BARK_AUDIO[k] = [0, 1].map((v) => `./audio/police/${k}_v${v}.wav`);
const POLICE_CHASE_START_KEYS = ['stop_politie', 'zet_kant', 'verdachte_voertuig', 'handen_omhoog', 'achtervolging'];

const SIKKOM_AUDIO_KEYS = ['wanted_up_1', 'wanted_up_2', 'wrecked_up_1', 'wrecked_up_2', 'copkill_up', 'pedkill_up', 'kill_up', 'mission_up', 'weather_storm_start', 'weather_storm_end'];
const SIKKOM_AUDIO = {};
for (const k of SIKKOM_AUDIO_KEYS) SIKKOM_AUDIO[k] = [0, 1].map((v) => `./audio/nieuws/${k}_v${v}.wav`);

let ctx = null;
let master = null;
let sfxBus = null;
let worldBus = null;
let worldIn = null;
let voiceBus = null;
let engineBus = null;
let sirenBus = null;
let musicBus = null;
let musicOut = null;
let musicLp = null; // drunk.js muffles the music
let trafficBus = null;
let ambBus = null;
let uiBus = null;
let stingBus = null;
let reverb = null;
let bank = null;
let kit = null;
let noiseBuffer = null;
let worldReady = false;

// One-shot voice budget by priority: 0 ambience/foley, 1 normal, 2 must-play.
const VOICE_CAPS = [26, 54, 76];
let activeVoices = 0;
function voiceOk(prio = 1) { return activeVoices < VOICE_CAPS[prio]; }

const AMB_LEVEL = 0.9;
const duckState = { amount: 0, until: 0, level: 0 };

function duckAmbience(amount, hold) {
  if (!ctx) return;
  const t = ctx.currentTime;
  if (t > duckState.until) duckState.amount = 0;
  duckState.amount = Math.max(duckState.amount, amount);
  duckState.until = Math.max(duckState.until, t + hold);
}

function updateDucking(dt) {
  const t = ctx.currentTime;
  if (sirenAudible > 0.05) duckAmbience(clamp(sirenAudible * 3, 0, 0.5), 0.2);
  if (t > duckState.until) duckState.amount = 0;
  const target = duckState.amount;
  duckState.level += (target - duckState.level) * Math.min(1, dt * (target > duckState.level ? 12 : 1.5));
  ambBus.gain.value = AMB_LEVEL * (1 - duckState.level);
}

// Street canyon vs open square: two generated impulse responses, wet levels
// set from building density around the listener (see sfx/ambience.js).
function buildReverb() {
  const send = ctx.createGain();
  send.gain.value = 0.18;
  const canyon = ctx.createConvolver();
  canyon.buffer = buildImpulse(ctx, 1.1, { decay: 3.2, damp: 0.25, seed: 7, early: [[0.011, 0.5], [0.019, 0.4], [0.031, 0.35], [0.047, 0.25]] });
  const open = ctx.createConvolver();
  open.buffer = buildImpulse(ctx, 2.2, { decay: 2.2, damp: 0.45, seed: 11, early: [[0.06, 0.2], [0.11, 0.12]] });
  const canyonGain = ctx.createGain();
  canyonGain.gain.value = 0.3;
  const openGain = ctx.createGain();
  openGain.gain.value = 0.15;
  send.connect(canyon).connect(canyonGain).connect(worldIn);
  send.connect(open).connect(openGain).connect(worldIn);
  return { send, canyonGain, openGain };
}

function setReverb(density, openness, closedCabin) {
  if (!reverb) return;
  const t = ctx.currentTime;
  reverb.canyonGain.gain.setTargetAtTime(0.08 + density * 0.55, t, 0.5);
  reverb.openGain.gain.setTargetAtTime(0.05 + openness * 0.4 + (1 - density) * 0.05, t, 0.5);
  reverb.send.gain.setTargetAtTime(closedCabin ? 0.05 : 0.2, t, 0.3);
}

let engine = null;
let sirenVoices = [];
let engineVoices = [];
let heliVoice = null;
let sirenAudible = 0;

let seenBullets = new WeakSet();
let seenParticles = new WeakSet();
let seenDeadPeds = new WeakSet();
let seenWrecks = new WeakSet();
const lastCrashAt = new WeakMap();
const hornWasOn = new WeakMap();
const MAX_RICOCHETS_PER_FRAME = 3;
const CRASH_MIN_GAP = 0.35;

const MUTE_STORAGE_KEY = KEYS.muted;
const PLAYER_HURT_MIN_GAP = 0.4;

function loadMuted() {
  try { return localStorage.getItem(MUTE_STORAGE_KEY) === '1'; } catch (e) { return false; }
}

function saveMuted() {
  try { localStorage.setItem(MUTE_STORAGE_KEY, muted ? '1' : '0'); } catch (e) { /* ignore */ }
}

let prev = null;
let seenMessages = null;
let muted = loadMuted();
let lastHurtAt = -Infinity;
const engineState = { freq: 42, gain: 0, gear: 0, shiftUntil: 0, startAt: 0, vehicle: null, kind: 0, startDelay: -1, prevThr: 0 };
const sirenState = { gain: 0 };
const musicState = { gain: GMUSIC_VOLUME };

function nowSec() {
  return performance.now() / 1000;
}

function masterLevel() {
  return MASTER_VOLUME * getSettings().masterVolume * (menuAudio ? MENU_LEVEL : 1);
}

// Title screen: the city itself at a lower level and no music; the theme song
// waits for Doorgaan / Nieuw spel (theme.js). Leaving re-primes the change
// detectors so loading a save doesn't chime its money and armour.
const MENU_LEVEL = 0.55;
let menuAudio = false;
export function setMenuAudio(on) {
  if (menuAudio === !!on) return;
  menuAudio = !!on;
  if (!menuAudio && worldReady && lastWorld) primeWorld(lastWorld);
  if (ctx && master) applyOutputGains(0.6);
}

onSettingsChange((st) => {
  if (!ctx) return;
  if (master && !muted) master.gain.setTargetAtTime(masterLevel(), ctx.currentTime, 0.05);
  if (musicOut && !muted) musicOut.gain.setTargetAtTime(masterLevel(), ctx.currentTime, 0.05);
  if (worldBus) worldBus.gain.setTargetAtTime(st.sfxVolume, ctx.currentTime, 0.05);
  if (voiceBus) voiceBus.gain.setTargetAtTime(st.voiceVolume, ctx.currentTime, 0.05);
});

export function isMuted() {
  return muted;
}

function buildNoiseBuffer(seconds) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function buildEngine() {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 500;
  filter.connect(engineBus);

  const osc1 = ctx.createOscillator();
  osc1.type = 'sawtooth';
  osc1.frequency.value = engineState.freq;
  osc1.connect(filter);
  osc1.start();

  const osc2 = ctx.createOscillator();
  osc2.type = 'square';
  osc2.frequency.value = engineState.freq * 2;
  osc2.detune.value = 8;
  const gain2 = ctx.createGain();
  gain2.gain.value = 0.35;
  osc2.connect(gain2).connect(filter);
  osc2.start();

  return { osc1, osc2, filter };
}

// --- 3D positioning -------------------------------------------------------
// World (x, y) maps to three/WebAudio (x, z); the listener follows the 3D
// camera, so the same right-handed frame is shared by picture and sound.
const listenerPos = { x: 0, y: 0, z: 0 };
const listenerVel = { x: 0, y: 0 };

function makePanner({ ref = 5, rolloff = 1, model = 'HRTF', maxDist = MAX_DISTANCE } = {}) {
  const p = ctx.createPanner();
  p.panningModel = model;
  p.distanceModel = 'inverse';
  p.refDistance = ref;
  p.rolloffFactor = rolloff;
  p.maxDistance = maxDist;
  return p;
}

function setPannerPos(p, x, y, h = SOURCE_HEIGHT, smooth = false) {
  // a non-finite position (a NaN spot from the data) would throw on every AudioParam write
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(h)) return;
  if (p.positionX) {
    if (smooth) {
      const t = ctx.currentTime;
      p.positionX.setTargetAtTime(x, t, 0.03);
      p.positionY.setTargetAtTime(h, t, 0.03);
      p.positionZ.setTargetAtTime(y, t, 0.03);
    } else {
      p.positionX.value = x;
      p.positionY.value = h;
      p.positionZ.value = y;
    }
  } else {
    p.setPosition(x, h, y);
  }
}

function distToListener(x, y, h = SOURCE_HEIGHT) {
  return Math.hypot(x - listenerPos.x, h - listenerPos.y, y - listenerPos.z);
}

function inverseGain(d, ref, rolloff) {
  return ref / (ref + rolloff * (Math.max(d, ref) - ref));
}

// A ref-counted panner that every node of one positional one-shot feeds;
// it disconnects once the last of them has ended. null = out of range.
function spatialOut(x, y, opts = {}) {
  if (!ctx || muted || !voiceOk(opts.prio ?? 1)) return null;
  const h = opts.h ?? SOURCE_HEIGHT;
  if (distToListener(x, y, h) > (opts.range ?? MAX_DISTANCE)) return null;
  // HRTF only where it is heard as such: far one-shots pan with equal power
  const panner = makePanner(opts.model || distToListener(x, y, h) < HRTF_NEAR ? opts : { ...opts, model: 'equalpower' });
  setPannerPos(panner, x, y, h);
  panner.connect(opts.bus || sfxBus);
  let refs = 0;
  let used = false;
  // a group whose every voice was refused by the budget never gets a release
  queueMicrotask(() => { if (!used) panner.disconnect(); });
  return {
    node: panner,
    hold() { refs++; used = true; },
    release() { if (--refs <= 0) panner.disconnect(); },
  };
}

function rotateByQuat(q, vx, vy, vz) {
  const tx = 2 * (q.y * vz - q.z * vy);
  const ty = 2 * (q.z * vx - q.x * vz);
  const tz = 2 * (q.x * vy - q.y * vx);
  return [
    vx + q.w * tx + (q.y * tz - q.z * ty),
    vy + q.w * ty + (q.z * tx - q.x * tz),
    vz + q.w * tz + (q.x * ty - q.y * tx),
  ];
}

function updateListener(world) {
  const p = world.player;
  const cam = getCamera();
  let fwd, up;
  if (cam) {
    listenerPos.x = cam.position.x;
    listenerPos.y = cam.position.y;
    listenerPos.z = cam.position.z;
    fwd = rotateByQuat(cam.quaternion, 0, 0, -1);
    up = rotateByQuat(cam.quaternion, 0, 1, 0);
  } else {
    listenerPos.x = p.x;
    listenerPos.y = SOURCE_HEIGHT;
    listenerPos.z = p.y;
    fwd = [Math.cos(p.angle || 0), 0, Math.sin(p.angle || 0)];
    up = [0, 1, 0];
  }
  const v = p.inVehicle;
  listenerVel.x = v ? Math.cos(v.angle) * v.speed : (p.vx || 0);
  listenerVel.y = v ? Math.sin(v.angle) * v.speed : (p.vy || 0);

  if (![listenerPos.x, listenerPos.y, listenerPos.z, ...fwd, ...up].every(Number.isFinite)) return;
  const L = ctx.listener;
  if (L.positionX) {
    const t = ctx.currentTime;
    const tau = 0.02;
    L.positionX.setTargetAtTime(listenerPos.x, t, tau);
    L.positionY.setTargetAtTime(listenerPos.y, t, tau);
    L.positionZ.setTargetAtTime(listenerPos.z, t, tau);
    L.forwardX.setTargetAtTime(fwd[0], t, tau);
    L.forwardY.setTargetAtTime(fwd[1], t, tau);
    L.forwardZ.setTargetAtTime(fwd[2], t, tau);
    L.upX.setTargetAtTime(up[0], t, tau);
    L.upY.setTargetAtTime(up[1], t, tau);
    L.upZ.setTargetAtTime(up[2], t, tau);
  } else {
    L.setPosition(listenerPos.x, listenerPos.y, listenerPos.z);
    L.setOrientation(fwd[0], fwd[1], fwd[2], up[0], up[1], up[2]);
  }
}

// NL/EU two-tone "hi-lo" wail, one pooled voice per nearby police unit.
function buildSirenVoice() {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1800;
  filter.Q.value = 0.5;

  const osc = ctx.createOscillator();
  osc.setPeriodicWave(sirenTone());
  osc.frequency.value = SIREN_LOW_FREQ;

  const gain = ctx.createGain();
  gain.gain.value = 0;
  const level = ctx.createGain();
  level.gain.value = 0.7;
  const panner = makePanner({ ref: 8, rolloff: 0.9, model: 'equalpower' });
  osc.connect(filter).connect(level).connect(gain).connect(panner).connect(sirenBus);
  osc.start();

  return { osc, gain, panner, target: null, level: 0, toneHigh: false, nextToggle: Math.random() * 0.6 };
}

function buildEngineVoice() {
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 40;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  const panner = makePanner({ ref: 4, rolloff: 1.3, model: 'equalpower' });
  osc.connect(filter).connect(gain).connect(panner).connect(trafficBus);
  osc.start();
  return { osc, filter, gain, panner, target: null, level: 0 };
}

function buildHeliVoice() {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 320;
  const chop = ctx.createGain();
  chop.gain.value = 0.5;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 11;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 0.5;
  lfo.connect(lfoDepth).connect(chop.gain);
  const gain = ctx.createGain();
  gain.gain.value = 0;
  const panner = makePanner({ ref: 12, rolloff: 0.8, model: 'equalpower' });
  src.connect(filter).connect(chop).connect(gain).connect(panner).connect(trafficBus);
  src.start();
  lfo.start();
  return { gain, panner };
}

// --- synthesized engines (sfx/engineworklet.js) ---------------------------
// Until the worklet has loaded, or where AudioWorklet is missing (non-secure
// origins), the oscillator engines above stay in charge.
let synth = { player: null, traffic: null };

async function loadEngineWorklet() {
  if (!ctx.audioWorklet || typeof AudioWorkletNode === 'undefined') return;
  try {
    await ctx.audioWorklet.addModule(new URL('./sfx/engineworklet.js', import.meta.url));
  } catch (e) {
    return;
  }
  const player = new AudioWorkletNode(ctx, 'gde-engine', {
    numberOfInputs: 0, numberOfOutputs: 2, outputChannelCount: [2, 1], processorOptions: { voices: 1, road: true, stereo: true },
  });
  const traffic = new AudioWorkletNode(ctx, 'gde-engine', {
    numberOfInputs: 0, numberOfOutputs: ENGINE_VOICES, outputChannelCount: Array(ENGINE_VOICES).fill(1),
    processorOptions: { voices: ENGINE_VOICES, running: true },
  });
  engine.osc1.stop(); engine.osc2.stop(); engine.filter.disconnect();
  engineBus.gain.cancelScheduledValues(ctx.currentTime);
  engineBus.gain.value = 1;
  player.connect(engineBus, 0);
  engineEarly = buildEarlyReflections();
  player.connect(engineEarly.input, 0);
  const roadGain = ctx.createGain();
  player.connect(roadGain, 1);
  roadGain.connect(worldIn);
  rumbleVoice.gain.gain.cancelScheduledValues(ctx.currentTime);
  rumbleVoice.gain.gain.value = 0;
  engineVoices.forEach((voice, i) => {
    voice.osc.stop();
    voice.gain.disconnect();
    voice.distLp = ctx.createBiquadFilter();
    voice.distLp.type = 'lowpass';
    voice.distLp.Q.value = 0.5;
    voice.distLp.frequency.value = 2000;
    traffic.connect(voice.distLp, i);
    voice.distLp.connect(voice.panner);
  });
  engineState.vehicle = null;
  synth = { player, traffic };
}

let engineEarly = null;

// Two short, darkened slap-backs off the facades, cross-fed L/R; level
// follows how built-up the street is. Subtle by design.
function buildEarlyReflections() {
  const input = ctx.createGain();
  const level = ctx.createGain();
  level.gain.value = 0;
  const split = ctx.createChannelSplitter(2);
  const merge = ctx.createChannelMerger(2);
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 2200;
  input.connect(tone).connect(split);
  [[0, 1, 0.011], [1, 0, 0.017]].forEach(([from, to, time]) => {
    const d = ctx.createDelay(0.05);
    d.delayTime.value = time;
    const g = ctx.createGain();
    g.gain.value = 0.5;
    split.connect(d, from).connect(g).connect(merge, 0, to);
  });
  merge.connect(level).connect(engineBus);
  return { input, level };
}

let brassWave = null;
let sirenWave = null;

// Horn discs and siren compression drivers: bright, buzzy harmonic series.
function hornWave() {
  if (!brassWave) {
    const n = 18, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) im[k] = Math.pow(k, -0.8) * (k % 2 ? 1 : 0.6);
    brassWave = ctx.createPeriodicWave(re, im);
  }
  return brassWave;
}

function sirenTone() {
  if (!sirenWave) {
    const n = 12, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) im[k] = k % 2 ? Math.pow(k, -2.2) : 0.06 / (k * k);
    sirenWave = ctx.createPeriodicWave(re, im);
  }
  return sirenWave;
}

// Soft, dull scrape while a vehicle slides along a wall or another car; fed
// by collision contacts, fades once they stop.
function buildScrapeVoice() {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 650;
  band.Q.value = 0.9;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1400;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  const panner = makePanner({ ref: 5, rolloff: 1.1, model: 'equalpower' });
  src.connect(band).connect(lp).connect(gain);
  gain.connect(panner).connect(sfxBus);
  src.start();
  return { band, gain, panner, level: 0, target: 0, until: 0, fresh: true };
}

function playTone({ freq, freqEnd, type = 'sine', duration = 0.15, gain = 0.3, delay = 0, filterFreq = null, out = null, bus = null, prio = 1 }) {
  if (!voiceOk(prio)) return;
  activeVoices++;
  const t0 = ctx.currentTime + delay;
  const t1 = t0 + duration;
  const osc = ctx.createOscillator();
  if (type === 'horn') osc.setPeriodicWave(hornWave());
  else osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t1);

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.01, duration * 0.2));
  g.gain.exponentialRampToValueAtTime(0.0001, t1);

  let tail = osc;
  let filter = null;
  if (filterFreq) {
    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    osc.connect(filter);
    tail = filter;
  }
  tail.connect(g).connect(out ? out.node : bus || sfxBus);
  if (out) out.hold();

  osc.start(t0);
  osc.stop(t1 + 0.03);
  osc.onended = () => {
    activeVoices--;
    osc.disconnect();
    g.disconnect();
    if (filter) filter.disconnect();
    if (out) out.release();
  };
}

function playNoiseBurst({ duration = 0.12, freq = 1200, freqEnd, q = 1, gain = 0.5, type = 'bandpass', delay = 0, out = null, bus = null, prio = 1 }) {
  if (!voiceOk(prio)) return;
  activeVoices++;
  const t0 = ctx.currentTime + delay;
  const t1 = t0 + duration;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;

  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.setValueAtTime(freq, t0);
  if (freqEnd !== undefined) filter.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t1);
  filter.Q.value = q;

  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t1);

  src.connect(filter).connect(g).connect(out ? out.node : bus || sfxBus);
  if (out) out.hold();
  src.start(t0, Math.random() * Math.max(0, 1.9 - duration));
  src.stop(t1 + 0.03);
  src.onended = () => {
    activeVoices--;
    src.disconnect();
    filter.disconnect();
    g.disconnect();
    if (out) out.release();
  };
}

// One-shot from the procedural sample bank (sfx/dsp.js); silently skipped
// while the buffer is still being rendered or the voice budget is spent.
function playBuf(name, { out = null, bus = null, gain = 0.5, rate = 1, delay = 0, prio = 1, lp = 0 } = {}) {
  if (!ctx || !bank || !voiceOk(prio)) return null;
  const buffer = bank.get(name);
  if (!buffer) return null;
  activeVoices++;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = rate;
  const g = ctx.createGain();
  g.gain.value = gain;
  let filter = null;
  if (lp) {
    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lp;
    src.connect(filter).connect(g);
  } else src.connect(g);
  g.connect(out ? out.node : bus || sfxBus);
  if (out) out.hold();
  src.start(ctx.currentTime + delay);
  src.onended = () => {
    activeVoices--;
    src.disconnect();
    g.disconnect();
    if (filter) filter.disconnect();
    if (out) out.release();
  };
  return src;
}

function playHit(out) {
  playNoiseBurst({ duration: 0.09, freq: 1800, freqEnd: 400, q: 0.8, gain: 0.5, out });
  playTone({ freq: 140, freqEnd: 60, type: 'triangle', duration: 0.08, gain: 0.35, out });
}

function playCopSting(out) {
  playTone({ freq: 260, freqEnd: 70, type: 'sawtooth', duration: 0.35, gain: 0.3, filterFreq: 900, out });
  playNoiseBurst({ duration: 0.2, freq: 500, freqEnd: 120, q: 0.7, gain: 0.25, delay: 0.02, out });
}

function playPedSting(out) {
  playTone({ freq: 900, freqEnd: 500, type: 'sine', duration: 0.12, gain: 0.28, out });
}

// Sampled shot (sfx/dsp.js) with a sine sub-thump for weight and the
// street's slap-back; the old synthesized version stays as the fallback
// while the samples are still being rendered.
const GUN_BUF = { pistol: ['gun_pistol_', 3, 0.85], uzi: ['gun_uzi_', 3, 0.6], shotgun: ['gun_shotgun_', 2, 0.95], jachtgeweer: ['gun_shotgun_', 2, 1] };
function playGunshot(x, y, weapon, close = false) {
  const out = spatialOut(x, y, { ref: 8, rolloff: 0.8, prio: close ? 2 : 1 });
  if (!out) return;
  const [pre, n, gain] = GUN_BUF[weapon] || GUN_BUF.pistol;
  const r = (0.94 + Math.random() * 0.12) * (weapon === 'jachtgeweer' ? 0.72 : 1);
  if (playBuf(pre + Math.floor(Math.random() * n), { out, gain, rate: r, prio: close ? 2 : 1 })) {
    playTone({ freq: weapon === 'shotgun' ? 72 : 96, freqEnd: 36, type: 'sine', duration: weapon === 'shotgun' ? 0.3 : 0.16, gain: weapon === 'uzi' ? 0.22 : 0.4, out, prio: close ? 2 : 1 });
    if (weapon !== 'uzi' || Math.random() < 0.3) playBuf('gun_echo', { out, gain: weapon === 'shotgun' ? 0.3 : 0.2, rate: r, delay: 0.03, lp: 2600 });
    if (close) duckAmbience(weapon === 'shotgun' ? 0.55 : 0.3, 0.35);
    return;
  }
  if (weapon === 'shotgun') {
    playNoiseBurst({ duration: 0.28, freq: 1600, freqEnd: 250, q: 0.6, gain: 0.6, out });
    playTone({ freq: 120, freqEnd: 40, type: 'triangle', duration: 0.2, gain: 0.45, out });
  } else if (weapon === 'uzi') {
    playNoiseBurst({ duration: 0.06, freq: 2800, freqEnd: 900, q: 0.9, gain: 0.38, out });
    playTone({ freq: 200, freqEnd: 80, type: 'triangle', duration: 0.05, gain: 0.22, out });
  } else {
    playNoiseBurst({ duration: 0.12, freq: 2400, freqEnd: 600, q: 0.8, gain: 0.5, out });
    playTone({ freq: 170, freqEnd: 50, type: 'triangle', duration: 0.1, gain: 0.35, out });
  }
}

function playRicochet(x, y) {
  const out = spatialOut(x, y, { ref: 4, rolloff: 1.2, range: 60 });
  if (!out) return;
  const r = Math.random();
  const k = 0.85 + Math.random() * 0.35;
  if (r < 0.3) {
    playBuf('ric_whine', { out, gain: 0.12, rate: k });
    return;
  }
  playNoiseBurst({ duration: 0.05, freq: 3200 * k, freqEnd: 1500, q: 1.5, gain: 0.22, type: 'highpass', out });
  if (r < 0.65) playTone({ freq: 2600 * k, freqEnd: 1400 * k, type: 'sine', duration: 0.09, gain: 0.06, out });
  else playTone({ freq: 1900 * k, freqEnd: 3100 * k, type: 'triangle', duration: 0.12, gain: 0.035, out });
  if (Math.random() < 0.4) playNoiseBurst({ duration: 0.12, freq: 700, freqEnd: 300, q: 0.8, gain: 0.08, type: 'lowpass', delay: 0.01, out });
}

function playExplosion(x, y) {
  const out = spatialOut(x, y, { ref: 10, rolloff: 0.7, prio: 2 });
  if (!out) return;
  duckAmbience(0.75, 1.6);
  playFx('explosion_boom', x, y);
  playNoiseBurst({ duration: 1.1, freq: 1400, freqEnd: 70, q: 0.5, gain: 0.85, type: 'lowpass', out, prio: 2 });
  playTone({ freq: 90, freqEnd: 28, type: 'sine', duration: 0.9, gain: 0.55, out, prio: 2 });
  playNoiseBurst({ duration: 1.7, freq: 500, freqEnd: 60, q: 0.6, gain: 0.25, type: 'lowpass', delay: 0.2, out, prio: 2 });
  playBuf('glass', { out, gain: 0.2, rate: 0.8, delay: 0.03 });
  for (let i = 0; i < 5; i++) playBuf('prop_metal', { out, gain: 0.05, rate: 0.6 + Math.random() * 0.8, delay: 0.5 + Math.random() * 1.4 });
}

// One effect of sfx/fxbank.js at a place: mixer category level, a random
// variant, the speed-of-sound delay and an air low pass from sfx/mixplan.js
// (the panner does the distance gain). false while the sample still renders.
const fxLastAt = new Map();
const FX_MIN_GAP = 0.12;
function playFx(name, x, y, opts = {}) {
  const info = FX_INFO[name] || FX_INFO[`${name}_0`];
  if (!ctx || !bank || !info) return false;
  // the same effect twice within a blink (two events for one thing) is one
  if (ctx.currentTime - (fxLastAt.get(name) ?? -1) < FX_MIN_GAP) return true;
  fxLastAt.set(name, ctx.currentTime);
  const names = bufferNames().includes(name) ? [name] : variantsOf(name);
  const buf = names[Math.floor(Math.random() * names.length)];
  const d = distToListener(x, y);
  if (d > info.range) return true;
  const out = spatialOut(x, y, { ref: info.ref, rolloff: 0.6, range: info.range, prio: 2 });
  if (!out) return true;
  const p = mixPlan(info, d, Math.floor(Math.random() * 1e9));
  const speaking = voiceBusy() ? speechDuckFactor(info.cat, 1) : 1;
  const src = playBuf(buf, { out, gain: info.gain * p.gain * (opts.gain ?? 1) * speaking, rate: p.rate * (opts.rate ?? 1), delay: p.delay, lp: p.lp, prio: 2 });
  return !!src;
}

// The odd weapons (combat.js / throwables.js): swings, what they hit, the
// water pistol, the carbidbus (fuse hiss, then the deep Hogeland boom) and
// firework rockets (whistle, crack and crackle). e = { sub, weapon, material }.
function playWeaponSfx(e, x, y) {
  const r = 0.92 + Math.random() * 0.16;
  switch (e.sub) {
    case 'swing': {
      const out = spatialOut(x, y, { ref: 3, rolloff: 1.3, range: 40 });
      if (!out) return;
      const slow = e.weapon === 'polsstok' ? 0.55 : e.weapon === 'bezem' ? 1.4 : 1;
      playNoiseBurst({ duration: 0.16 / slow, freq: 900 * slow * r, freqEnd: 300, q: 0.9, gain: 0.08, type: 'bandpass', out });
      break;
    }
    case 'shot': playGunshot(x, y, e.weapon, true); break;
    case 'empty': {
      const out = spatialOut(x, y, { ref: 2, rolloff: 1.4, range: 25, prio: 2 });
      if (!out) return;
      playTone({ freq: 2400 * r, freqEnd: 1900 * r, type: 'square', duration: 0.025, gain: 0.04, out, prio: 2 });
      playNoiseBurst({ duration: 0.03, freq: 3800, q: 1.5, gain: 0.08, type: 'bandpass', delay: 0.06, out, prio: 2 });
      break;
    }
    case 'hit': {
      const out = spatialOut(x, y, { ref: 4, rolloff: 1.1, range: 60 });
      if (!out) return;
      const m = e.material;
      if (m === 'flesh') {
        playBuf('punch', { out, gain: 0.35, rate: r });
        playTone({ freq: 140 * r, freqEnd: 60, type: 'sine', duration: 0.08, gain: 0.12, out });
      } else if (m === 'metal') {
        playTone({ freq: 1350 * r, freqEnd: 1250 * r, type: 'triangle', duration: 0.22, gain: 0.07, out });
        playTone({ freq: 2210 * r, freqEnd: 2100 * r, type: 'sine', duration: 0.16, gain: 0.04, out });
        playBuf('punch', { out, gain: 0.25, rate: 1.2 * r });
      } else if (m === 'broom') {
        playNoiseBurst({ duration: 0.18, freq: 4200, freqEnd: 2200, q: 0.6, gain: 0.12, type: 'highpass', out });
      } else {
        // the hollow "tok" of wood: a bat, a pole, the klomp even lower
        const f = m === 'klomp' ? 380 : 520;
        playTone({ freq: f * r, freqEnd: f * 0.7 * r, type: 'triangle', duration: 0.09, gain: 0.2, out });
        playNoiseBurst({ duration: 0.05, freq: 1600, freqEnd: 700, q: 1.2, gain: 0.12, out });
        playBuf('punch', { out, gain: 0.3, rate: 0.85 * r });
      }
      break;
    }
    case 'squirt': {
      const out = spatialOut(x, y, { ref: 2, rolloff: 1.4, range: 25 });
      if (out) playNoiseBurst({ duration: 0.09, freq: 3000 * r, freqEnd: 1800, q: 1.4, gain: 0.05, type: 'bandpass', out });
      break;
    }
    case 'fuse': {
      if (playFx('carbid_fuse', x, y)) break; // the rendered hiss; the noise bursts below are the fallback
      const out = spatialOut(x, y, { ref: 3, rolloff: 1.2, range: 40 });
      if (!out) return;
      for (let i = 0; i < 4; i++) playNoiseBurst({ duration: 0.55, freq: 5200, freqEnd: 4600, q: 0.7, gain: 0.05, type: 'highpass', delay: 0.2 + i * 0.5, out });
      break;
    }
    case 'carbid': {
      // sampled boom (tik, crack, sub thump, reflections) first; the old
      // synthesized version stays as the fallback while it still renders
      duckAmbience(0.85, 2.4);
      if (playFx('carbid_boom', x, y)) {
        if (e.water) {
          const wet = spatialOut(x, y, { ref: 14, rolloff: 0.6, prio: 2 });
          if (wet) playBuf('step_wet_0', { out: wet, gain: 0.5, rate: 0.5, delay: 0.1 });
        }
        break;
      }
      const out = spatialOut(x, y, { ref: 14, rolloff: 0.6, prio: 2 });
      if (!out) return;
      playTone({ freq: 70, freqEnd: 22, type: 'sine', duration: 1.3, gain: 0.7, out, prio: 2 });
      playNoiseBurst({ duration: 1.4, freq: 1100, freqEnd: 50, q: 0.5, gain: 0.9, type: 'lowpass', out, prio: 2 });
      playBuf('gun_echo', { out, gain: 0.5, rate: 0.5, delay: 0.08, lp: 1400 });
      playBuf('gun_echo', { out, gain: 0.3, rate: 0.45, delay: 0.5, lp: 900 });
      if (e.water) playBuf('step_wet_0', { out, gain: 0.5, rate: 0.5, delay: 0.1 });
      break;
    }
    case 'launch': {
      // the fuse catches, a whoosh off the stick, then the rising whistle
      const out = spatialOut(x, y, { ref: 5, rolloff: 0.9, range: 140, prio: 2 });
      if (!out) return;
      playNoiseBurst({ duration: 0.12, freq: 5200, freqEnd: 4200, q: 0.7, gain: 0.08, type: 'highpass', out, prio: 2 });
      playNoiseBurst({ duration: 0.4, freq: 700, freqEnd: 2600, q: 0.8, gain: 0.32, delay: 0.05, out, prio: 2 });
      playTone({ freq: 1300 * r, freqEnd: 3400 * r, type: 'sine', duration: 1.1, gain: 0.11, delay: 0.12, out, prio: 2 });
      playTone({ freq: 1310 * r, freqEnd: 3430 * r, type: 'triangle', duration: 1.1, gain: 0.04, delay: 0.12, out, prio: 2 });
      break;
    }
    case 'incoming': {
      // a rocket coming down (H18's misfired fireworks): a falling whistle
      const out = spatialOut(x, y, { ref: 6, rolloff: 0.9, range: 140, h: 6, prio: 2 });
      if (!out) return;
      playTone({ freq: 3200 * r, freqEnd: 1100 * r, type: 'sine', duration: 1.0, gain: 0.1, out, prio: 2 });
      playNoiseBurst({ duration: 0.9, freq: 2400, freqEnd: 900, q: 1.2, gain: 0.1, out, prio: 2 });
      break;
    }
    case 'rumble': {
      // a light earthquake: a low rolling rumble that swells and fades, a rattle on top
      const dur = Math.max(3, Math.min(10, e.dur || 6));
      playNoiseBurst({ duration: dur, freq: 90, freqEnd: 55, q: 0.5, gain: 0.5, type: 'lowpass', bus: worldBus || undefined, prio: 2 });
      playTone({ freq: 38, freqEnd: 30, type: 'sine', duration: dur, gain: 0.35, bus: worldBus || undefined, prio: 2 });
      for (let i = 0; i < 10; i++) playNoiseBurst({ duration: 0.05, freq: 900 + Math.random() * 900, q: 2, gain: 0.03, type: 'bandpass', delay: 0.4 + Math.random() * (dur * 0.7), bus: worldBus || undefined });
      break;
    }
    case 'firework': {
      // a shell opening: a sharp crack, a soft low thump, then the glitter crackling down
      const out = spatialOut(x, y, e.far ? { ref: 120, rolloff: 0.5, range: 3200, h: Number.isFinite(e.z) ? e.z : undefined, prio: 2 } : { ref: 12, rolloff: 0.7, range: 300, h: Number.isFinite(e.z) ? e.z : undefined, prio: 2 });
      if (!out) return;
      playNoiseBurst({ duration: 0.07, freq: 4200 * r, freqEnd: 1500, q: 0.7, gain: 0.5, type: 'highpass', out, prio: 2 });
      playNoiseBurst({ duration: 0.35, freq: 900, freqEnd: 150, q: 0.6, gain: 0.35, type: 'lowpass', out, prio: 2 });
      playTone({ freq: 95 * r, freqEnd: 45, type: 'sine', duration: 0.3, gain: 0.25, out, prio: 2 });
      const n = 10 + Math.floor(Math.random() * 8);
      for (let i = 0; i < n; i++) playNoiseBurst({ duration: 0.02 + Math.random() * 0.03, freq: 3000 + Math.random() * 3500, q: 2, gain: 0.05 + Math.random() * 0.05, type: 'bandpass', delay: 0.12 + Math.random() * 1.2, out });
      break;
    }
    case 'burst': {
      const out = spatialOut(x, y, e.far ? { ref: 120, rolloff: 0.5, range: 3200, h: Number.isFinite(e.z) ? e.z : undefined, prio: 2 } : { ref: 10, rolloff: 0.7, range: 250, h: Number.isFinite(e.z) ? e.z : undefined, prio: 2 });
      if (!out) return;
      playNoiseBurst({ duration: 0.5, freq: 1800, freqEnd: 120, q: 0.6, gain: 0.55, type: 'lowpass', out });
      playTone({ freq: 110, freqEnd: 40, type: 'sine', duration: 0.4, gain: 0.3, out });
      for (let i = 0; i < 9; i++) playNoiseBurst({ duration: 0.03, freq: 3500 + Math.random() * 2500, q: 2, gain: 0.07, type: 'bandpass', delay: 0.25 + Math.random() * 0.9, out });
      break;
    }
    default:
      break;
  }
}

// Layered by strength: body thud, crunch, an inharmonic panel ring, and for
// hard hits a rattle of debris and glass.
function playCrash(x, y, impact) {
  const out = spatialOut(x, y, { ref: 6, rolloff: 1 });
  if (!out) return;
  const k = clamp(impact / 14, 0.08, 1);
  playTone({ freq: 90 + k * 20, freqEnd: 36, type: 'sine', duration: 0.16 + k * 0.28, gain: 0.2 + k * 0.45, out });
  const crunch = k > 0.15 && playBuf('crunch_' + Math.floor(Math.random() * 3), { out, gain: 0.18 + k * 0.5, rate: 1.3 - k * 0.45 + Math.random() * 0.1, lp: 2500 + k * 6000 });
  playNoiseBurst({ duration: 0.1 + k * 0.35, freq: 650 + k * 700, freqEnd: 140, q: 0.8, gain: (0.22 + k * 0.45) * (crunch ? 0.4 : 1), out });
  if (k > 0.45) duckAmbience(0.35 * k, 0.6);
  if (k > 0.7) playBuf('glass', { out, gain: 0.12 + (k - 0.7) * 0.5, rate: 0.9 + Math.random() * 0.2, delay: 0.02 });
  if (k < 0.2) return;
  const base = 190 + Math.random() * 140;
  const ring = 0.2 + k * 0.45;
  playTone({ freq: base, freqEnd: base * 0.94, type: 'square', duration: ring, gain: 0.05 * k, filterFreq: 1800 + k * 2500, out });
  playTone({ freq: base * 2.76, freqEnd: base * 2.6, type: 'triangle', duration: ring * 0.8, gain: 0.06 * k, out });
  playTone({ freq: base * 5.4, type: 'sine', duration: ring * 0.6, gain: 0.04 * k, out });
  playNoiseBurst({ duration: 0.06 + k * 0.1, freq: 2600, freqEnd: 1200, q: 1.6, gain: 0.18 * k, type: 'bandpass', delay: 0.015, out });
  if (k < 0.4) return;
  const ticks = 3 + Math.floor(k * 5);
  for (let i = 0; i < ticks; i++) {
    const d = 0.06 + Math.random() * (0.25 + k * 0.35);
    if (Math.random() < 0.5) playTone({ freq: 3000 + Math.random() * 3500, type: 'sine', duration: 0.05 + Math.random() * 0.08, gain: 0.03 + 0.04 * k, delay: d, out });
    else playNoiseBurst({ duration: 0.03 + Math.random() * 0.05, freq: 1800 + Math.random() * 2500, q: 2, gain: 0.08 * k, type: 'bandpass', delay: d, out });
  }
}

function playBell(x, y) {
  const out = spatialOut(x, y, { ref: 4, rolloff: 1.2, range: 45 });
  if (!out) return;
  if (playBuf('bikebell', { out, gain: 0.2, rate: 0.96 + Math.random() * 0.08 })) return;
  const f = 2750 + Math.random() * 250;
  for (const d of [0, 0.14]) {
    playTone({ freq: f, type: 'sine', duration: 0.55, gain: 0.12, delay: d, out });
    playTone({ freq: f * 1.49, type: 'sine', duration: 0.4, gain: 0.05, delay: d, out });
    playTone({ freq: f * 2.43, type: 'sine', duration: 0.25, gain: 0.025, delay: d, out });
    playNoiseBurst({ duration: 0.012, freq: 5200, q: 2, gain: 0.1, type: 'bandpass', delay: d, out });
  }
}

// Level-crossing bell: one hard metallic strike per event (railway.js repeats it).
function playCrossingBell(x, y) {
  const out = spatialOut(x, y, { ref: 6, rolloff: 1.1, range: 130, h: 2.5 });
  if (!out) return;
  playTone({ freq: 1480, type: 'triangle', duration: 0.28, gain: 0.16, out });
  playTone({ freq: 1480 * 2.76, type: 'sine', duration: 0.16, gain: 0.05, out });
  playNoiseBurst({ duration: 0.015, freq: 4200, q: 2, gain: 0.12, type: 'bandpass', out });
}

function playTrainHorn(x, y) {
  const out = spatialOut(x, y, { ref: 10, rolloff: 0.8, range: 260, h: 3 });
  if (!out) return;
  playTone({ freq: 370, type: 'sawtooth', duration: 0.55, gain: 0.08, filterFreq: 1400, out });
  playTone({ freq: 466, type: 'sawtooth', duration: 0.55, gain: 0.07, filterFreq: 1400, out });
  playTone({ freq: 311, type: 'sawtooth', duration: 0.7, gain: 0.08, filterFreq: 1300, delay: 0.62, out });
}

// Wheel sets over a rail joint: "dadam".
function playTrainClack(x, y, k) {
  const out = spatialOut(x, y, { ref: 8, rolloff: 1, range: 140, h: 0.5 });
  if (!out) return;
  for (const d of [0, 0.09]) {
    playNoiseBurst({ duration: 0.07, freq: 320 + k * 180, freqEnd: 120, q: 1.4, gain: 0.12 + k * 0.18, type: 'bandpass', delay: d, out });
    playTone({ freq: 95, freqEnd: 60, type: 'sine', duration: 0.1, gain: 0.08 + k * 0.1, delay: d, out });
  }
}

// Short vowel-ish "hé!" from a buzzy source through two formant filters.
function playShout(x, y, strength = 0.5) {
  const out = spatialOut(x, y, { ref: 4, rolloff: 1.2, range: 50, h: 1.6 });
  if (!out) return;
  const t0 = ctx.currentTime;
  const dur = 0.22 + strength * 0.12;
  const f0 = (Math.random() < 0.5 ? 140 : 230) * (0.9 + Math.random() * 0.25) * (1 + strength * 0.15);
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(f0 * 0.9, t0);
  osc.frequency.linearRampToValueAtTime(f0 * 1.12, t0 + dur * 0.3);
  osc.frequency.exponentialRampToValueAtTime(f0 * 0.72, t0 + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.16 + strength * 0.12, t0 + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  const f1 = ctx.createBiquadFilter();
  f1.type = 'bandpass'; f1.frequency.value = 550 + Math.random() * 250; f1.Q.value = 5;
  const f2 = ctx.createBiquadFilter();
  f2.type = 'bandpass'; f2.frequency.value = 1500 + Math.random() * 500; f2.Q.value = 7;
  const mix2 = ctx.createGain();
  mix2.gain.value = 0.6;
  osc.connect(f1).connect(g);
  osc.connect(f2).connect(mix2).connect(g);
  g.connect(out.node);
  out.hold();
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
  osc.onended = () => {
    osc.disconnect(); f1.disconnect(); f2.disconnect(); mix2.disconnect(); g.disconnect();
    out.release();
  };
  playNoiseBurst({ duration: 0.05, freq: 2400, q: 0.8, gain: 0.08, type: 'highpass', out });
}

// drunk.js: a short "hic" (a throat click and a quick upward chirp) and a
// breathy little giggle.
function playHiccup(x, y, female) {
  const out = spatialOut(x, y, { ref: 3, rolloff: 1.2, range: 25, h: 1.6 });
  if (!out) return;
  const t0 = ctx.currentTime;
  const f0 = (female ? 420 : 260) * (0.92 + Math.random() * 0.16);
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(f0, t0);
  osc.frequency.exponentialRampToValueAtTime(f0 * 1.9, t0 + 0.07);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.11);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 1.4;
  osc.connect(bp).connect(g).connect(out.node);
  out.hold();
  osc.start(t0);
  osc.stop(t0 + 0.13);
  osc.onended = () => { osc.disconnect(); bp.disconnect(); g.disconnect(); out.release(); };
  playNoiseBurst({ duration: 0.025, freq: 1800, q: 2, gain: 0.12, type: 'bandpass', out });
}

function playGiggle(x, y, female) {
  const out = spatialOut(x, y, { ref: 3, rolloff: 1.2, range: 25, h: 1.6 });
  if (!out) return;
  const t0 = ctx.currentTime;
  const n = 4 + Math.floor(Math.random() * 3);
  const base = (female ? 520 : 330) * (0.94 + Math.random() * 0.12);
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  for (let i = 0; i < n; i++) {
    const s = t0 + i * 0.105;
    const f = base * (1.18 - i * 0.05);
    osc.frequency.setValueAtTime(f, s);
    osc.frequency.linearRampToValueAtTime(f * 0.86, s + 0.08);
    g.gain.setValueAtTime(0.0001, s);
    g.gain.exponentialRampToValueAtTime(0.1, s + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, s + 0.085);
  }
  const f1 = ctx.createBiquadFilter();
  f1.type = 'bandpass'; f1.frequency.value = female ? 1100 : 750; f1.Q.value = 3;
  osc.connect(f1).connect(g).connect(out.node);
  out.hold();
  osc.start(t0);
  osc.stop(t0 + n * 0.105 + 0.05);
  osc.onended = () => { osc.disconnect(); f1.disconnect(); g.disconnect(); out.release(); };
}

function playDoor(x, y, open) {
  const out = spatialOut(x, y, { ref: 3, rolloff: 1.2, range: 40 });
  if (!out) return;
  if (open) {
    playNoiseBurst({ duration: 0.03, freq: 3200, q: 2, gain: 0.25, type: 'bandpass', out });
    playNoiseBurst({ duration: 0.16, freq: 900, freqEnd: 600, q: 4, gain: 0.08, type: 'bandpass', delay: 0.04, out });
  } else {
    playTone({ freq: 95, freqEnd: 48, type: 'sine', duration: 0.16, gain: 0.45, out });
    playNoiseBurst({ duration: 0.1, freq: 500, freqEnd: 160, q: 0.7, gain: 0.3, type: 'lowpass', out });
    playNoiseBurst({ duration: 0.025, freq: 2800, q: 2, gain: 0.2, type: 'bandpass', delay: 0.02, out });
  }
}

function playEngineStart(x, y, delay) {
  const out = spatialOut(x, y, { ref: 4, rolloff: 1, range: 60 });
  if (!out) return;
  for (let i = 0; i < 5; i++) {
    playTone({ freq: 140 + i * 6, freqEnd: 115, type: 'sawtooth', duration: 0.09, gain: 0.07, filterFreq: 700, delay: delay + i * 0.095, out });
  }
  playTone({ freq: 45, freqEnd: 110, type: 'sawtooth', duration: 0.22, gain: 0.16, filterFreq: 650, delay: delay + 0.48, out });
  playTone({ freq: 110, freqEnd: 44, type: 'sawtooth', duration: 0.35, gain: 0.12, filterFreq: 520, delay: delay + 0.7, out });
}

function playEngineStop(x, y) {
  const out = spatialOut(x, y, { ref: 4, rolloff: 1, range: 50 });
  if (!out) return;
  playTone({ freq: 46, freqEnd: 22, type: 'sawtooth', duration: 0.45, gain: 0.1, filterFreq: 380, out });
  playNoiseBurst({ duration: 0.08, freq: 300, q: 1, gain: 0.08, type: 'lowpass', delay: 0.35, out });
}

function playShiftBlip(up, freq) {
  if (up) {
    playNoiseBurst({ duration: 0.04, freq: 1600, q: 1.5, gain: 0.07, type: 'bandpass' });
    playTone({ freq: freq * 2.2, freqEnd: freq * 1.3, type: 'sawtooth', duration: 0.12, gain: 0.06, filterFreq: 900 });
  } else {
    playTone({ freq: freq * 1.2, freqEnd: freq * 2.1, type: 'sawtooth', duration: 0.14, gain: 0.07, filterFreq: 1000 });
  }
}

// A horse instead of a bike bell: a falling, warbling neigh and a snort.
function playWhinny(x, y) {
  const out = spatialOut(x, y, { ref: 5, rolloff: 1, range: 70, h: 2 });
  if (!out || !voiceOk(1)) return;
  activeVoices++;
  const t0 = ctx.currentTime, t1 = t0 + 1.1;
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(620, t0);
  osc.frequency.linearRampToValueAtTime(980, t0 + 0.12);
  osc.frequency.exponentialRampToValueAtTime(330, t1);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 16;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 55;
  lfo.connect(lfoGain).connect(osc.frequency);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1300;
  filter.Q.value = 1.1;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.2, t0 + 0.06);
  g.gain.exponentialRampToValueAtTime(0.0001, t1);
  osc.connect(filter).connect(g).connect(out.node);
  out.hold();
  osc.start(t0); lfo.start(t0);
  osc.stop(t1 + 0.02); lfo.stop(t1 + 0.02);
  osc.onended = () => {
    activeVoices--;
    osc.disconnect(); lfo.disconnect(); lfoGain.disconnect(); filter.disconnect(); g.disconnect();
    out.release();
  };
  playNoiseBurst({ duration: 0.25, freq: 500, freqEnd: 180, q: 0.7, gain: 0.18, type: 'lowpass', delay: 1.0, out });
}

function playSplash(x, y) {
  const out = spatialOut(x, y, { ref: 6, rolloff: 1, range: 80 });
  if (!out) return;
  playNoiseBurst({ duration: 0.7, freq: 1600, freqEnd: 220, q: 0.5, gain: 0.5, type: 'lowpass', out });
}

// Two slightly detuned horn discs; low < 1 for vans/buses, boats honk deep.
function playHorn(x, y, duration = 0.4, low = 1) {
  const out = spatialOut(x, y, { ref: 6, rolloff: 1, range: 90 });
  if (!out) return;
  const d = 1 + (Math.random() - 0.5) * 0.04;
  playTone({ freq: 415 * low * d, type: 'horn', duration, gain: 0.22, filterFreq: 3200, out });
  playTone({ freq: 498 * low * d * 1.004, type: 'horn', duration, gain: 0.18, filterFreq: 3200, out });
}

function hornPitch(v) {
  return v.isBoat ? 0.45 : v.isBus ? 0.7 : v.model && v.model.name === 'van' ? 0.85 : v.isHeroCar ? 0.96 : 1;
}

function playPlayerHurt() {
  const now = nowSec();
  if (now - lastHurtAt < PLAYER_HURT_MIN_GAP) return;
  lastHurtAt = now;
  playTone({ freq: 160, freqEnd: 55, type: 'sine', duration: 0.22, gain: 0.4 });
  playNoiseBurst({ duration: 0.15, freq: 300, freqEnd: 90, q: 0.6, gain: 0.3 });
}

function playArmorUp(out) {
  playTone({ freq: 700, type: 'triangle', duration: 0.09, gain: 0.3, out });
  playTone({ freq: 1050, type: 'triangle', duration: 0.12, gain: 0.3, delay: 0.07, out });
}

function playArmorDown() {
  playNoiseBurst({ duration: 0.08, freq: 2200, freqEnd: 900, q: 1.4, gain: 0.35, type: 'highpass' });
  playTone({ freq: 500, freqEnd: 260, type: 'square', duration: 0.07, gain: 0.15 });
}

function playCashChime(out) {
  const notes = [660, 880, 1320];
  notes.forEach((f, i) => playTone({ freq: f, type: 'sine', duration: 0.14, gain: 0.22, delay: i * 0.05, out }));
}

function playSwitchClick() {
  playNoiseBurst({ duration: 0.03, freq: 3500, freqEnd: 1800, q: 2, gain: 0.25, type: 'highpass' });
}

function playDeathSting() {
  duckAmbience(0.6, 2.5);
  playTone({ freq: 220, freqEnd: 55, type: 'sawtooth', duration: 0.5, gain: 0.35, filterFreq: 1200 });
  playTone({ freq: 165, freqEnd: 45, type: 'sawtooth', duration: 0.55, gain: 0.3, delay: 0.04, filterFreq: 900 });
  playNoiseBurst({ duration: 0.3, freq: 700, freqEnd: 150, q: 0.6, gain: 0.3 });
}

function playMissionJingle() {
  const notes = [523.25, 659.25, 784, 1046.5];
  notes.forEach((f, i) => playTone({ freq: f, type: 'triangle', duration: 0.16, gain: 0.24, delay: i * 0.09 }));
}

// One-shot playback for the pre-recorded voicelines above - routed through
// voiceBus, so the Stemmen slider sets them apart from the effects.
// A missing/unplayable file (network hiccup, or an asymmetric-script key
// with no recording for this character) fails silently, never throws.
// pos = {x, y} places the clip in the world; omitted = plain stereo.
function playClip(src, pos = null) {
  if (!ctx || muted) return null;
  const el = newVoiceEl(src);
  const nodes = [];
  try {
    const node = ctx.createMediaElementSource(el);
    nodes.push(node);
    if (pos) {
      const panner = makePanner({ ref: 4, rolloff: 1.2, model: distToListener(pos.x, pos.y, pos.h ?? 1.6) < HRTF_NEAR ? 'HRTF' : 'equalpower' });
      setPannerPos(panner, pos.x, pos.y, pos.h ?? 1.6);
      node.connect(panner).connect(voiceBus);
      nodes.push(panner);
    } else {
      node.connect(voiceBus);
    }
  } catch (e) {
    // ignore - playback still works without the Web Audio graph attached
  }
  // after the speakClip listeners (registered later) have run
  const cleanup = () => { for (const n of nodes) n.disconnect(); nodes.length = 0; setTimeout(() => releaseEl(el), 0); };
  el.addEventListener('ended', cleanup, { once: true });
  el.addEventListener('error', cleanup, { once: true });
  el.play().catch(() => { if (el.gdeLive) el.dispatchEvent(new Event('error')); });
  return el;
}

// A finished voice element lets go of its media player right away instead
// of waiting for GC: Chromium caps live players per page and refuses new
// ones past that (every later clip silent).
let liveVoiceEls = 0;
function newVoiceEl(src) {
  const el = new Audio(src);
  liveVoiceEls++;
  el.gdeLive = true;
  return el;
}
function releaseEl(el) {
  if (!el || !el.gdeLive) return;
  el.gdeLive = false;
  liveVoiceEls--;
  try { el.pause(); el.removeAttribute('src'); el.load(); } catch (e) { /* ignore */ }
}

// Every voice below asks speech.js for the one talking channel first
// (priorities, holds, queue and gaps live there); a clip reports its real
// length and its end back so the next line starts right after it.
function speakClip(cls, src, { pos = null, guess = 2, owner = null, onEnd = null } = {}) {
  if (!ctx || muted) return null;
  let el = null;
  const tok = speech.begin(cls, guess, { owner, stop: () => { if (el) { el.pause(); el.dispatchEvent(new Event('ended')); } } });
  if (!tok) return null;
  el = playClip(src, pos);
  if (!el) { speech.end(tok); return null; }
  el.addEventListener('loadedmetadata', () => { if (Number.isFinite(el.duration)) speech.extend(tok, el.duration); }, { once: true });
  const done = () => { speech.end(tok); if (onEnd) onEnd(); };
  el.addEventListener('ended', done, { once: true });
  el.addEventListener('error', done, { once: true });
  return el;
}

// The one way to speak (every play*Voice below is a wrapper that adds its own
// gate): asks speech.js for the channel, plays src (pos = in the world, else
// plain stereo), ducks the ambience for duck = [level, seconds] and reports
// the clip's end through onEnd. Returns the element, or null when the channel
// is taken or nothing can play.
export function playVoice(src, { cls = 'react', owner = null, pos = null, dur = 2, onEnd = null, duck = null } = {}) {
  const el = speakClip(cls, src, { pos, guess: dur, owner, onEnd });
  if (el && duck) duckAmbience(duck[0], duck[1]);
  return el;
}

// Voicelines/police/Kiekdoar - the event-driven reactions - also keep a
// short cooldown of their own so a burst of events can't chain them.
const SPOKEN_MIN_GAP = 1.4;
let lastSpokenAt = -Infinity;

function playSpokenClip(src, pos = null, cls = 'react') {
  if (!ctx) return false;
  const now = ctx.currentTime;
  if (cls === 'react' && now - lastSpokenAt < SPOKEN_MIN_GAP) return false;
  if (!playVoice(src, { cls, pos, dur: SPOKEN_MIN_GAP, duck: [0.45, 2.2] })) return false;
  lastSpokenAt = now;
  return true;
}

// NPC ambient chatter gets its OWN, much longer cooldown on top of the
// channel - with up to ~45 pedestrians nearby it would otherwise starve out
// the lines that matter. Per explicit feedback ("nog steeds veel te veel en
// te vaak") this is deliberately strict.
const NPC_SPOKEN_MIN_GAP = 14;
let lastNpcSpokenAt = -Infinity;

function playNpcSpokenClip(src, pos) {
  if (!ctx) return false;
  const now = ctx.currentTime;
  if (now - lastNpcSpokenAt < NPC_SPOKEN_MIN_GAP) return false;
  if (!playVoice(src, { cls: 'ambient', pos, dur: 1.2 })) return false;
  lastNpcSpokenAt = now;
  return true;
}

// Mission story cutscene dialogue: one line at a time, straight into the
// voice bus. A story scene holds the channel, so nothing else talks over it.
let storyScene = false;
let storyVoice = null;
// cinematics.js tells whether a scene really runs, so a scene that ended
// without setStoryScene(false) can't keep every other voice quiet
let storyProbe = null;
export function setStoryProbe(fn) { storyProbe = fn; }

// Scenes overlap (the intro montage starts while another cutscene is being
// replaced, a mission scene inside a voiced cinematic): each caller is its
// own owner and the story hold lasts until the last one lets go.
const storyOwners = new Set();
export function setStoryScene(on, who = 'scene') {
  if (on) storyOwners.add(who);
  else storyOwners.delete(who);
  storyScene = storyOwners.size > 0;
  if (storyScene) {
    if (!speech.holding('story')) {
      speech.hold('story', 'story', (by) => { if (by === 'watchdog') { storyOwners.clear(); storyScene = false; stopStoryVoice(); } },
        { alive: () => storyScene && (!storyProbe || storyProbe()) });
    }
  } else { speech.release('story'); stopStoryVoice(); }
}

export function stopStoryVoice() {
  const v = storyVoice;
  storyVoice = null;
  if (!v) return;
  v.el.pause();
  if (v.node) v.node.disconnect();
  speech.end(v.tok);
  releaseEl(v.el);
}

// The shared body of the one-at-a-time voices (story, banter, contact): own
// handle (get/set/stop), straight into the voice bus (radio: the broadcast
// band), channel token from speech.js, ducking once the length is known.
// strict: no token (the channel is taken) means no clip.
function playExclusive(src, { cls, owner, radio = false, duck, strict, get, set, stop }) {
  const v = { el: newVoiceEl(src), node: null, tok: null };
  v.tok = speech.begin(cls, 3, { owner, stop: () => { if (get() === v) stop(); } });
  if (strict && !v.tok) { releaseEl(v.el); return null; }
  try {
    v.node = ctx.createMediaElementSource(v.el);
    if (radio) {
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 240;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4600;
      const pk = ctx.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 1900; pk.Q.value = 0.8; pk.gain.value = 3;
      v.node.connect(hp); hp.connect(pk); pk.connect(lp); lp.connect(voiceBus);
    } else v.node.connect(voiceBus);
  } catch (e) {
    // ignore - plays without the Web Audio graph
  }
  set(v);
  const done = () => { if (get() === v) stop(); };
  v.el.addEventListener('ended', done, { once: true });
  v.el.addEventListener('error', done, { once: true });
  v.el.addEventListener('loadedmetadata', () => {
    const d = Number.isFinite(v.el.duration) ? v.el.duration : 3;
    speech.extend(v.tok, d);
    duckAmbience(duck, d + 0.4);
  }, { once: true });
  v.el.play().catch(done);
  return v;
}

// radio: Rikus on Nachtstreek (recaps, the studio shots): a gentle
// broadcast band (no deep lows, rounded highs, a little presence).
export function playStoryVoice(src, { radio = false } = {}) {
  stopStoryVoice();
  if (!ctx || muted) return;
  playExclusive(src, { cls: 'story', owner: 'story', radio, duck: 0.5, strict: false, get: () => storyVoice, set: (x) => { storyVoice = x; }, stop: stopStoryVoice });
}

// Speech-bubble lines (linevoice.js): from the speaker's spot, lowest but
// one on the channel. A bubble whose voice can't play right now stays silent.
export function playBubbleVoice(src, dur, pos = null) {
  if (!ctx || muted || storyScene) return false;
  if (pos && distToListener(pos.x, pos.y) > SPEECH_RANGE) return false;
  return !!playVoice(src, { cls: 'ambient', pos, dur, duck: [0.3, dur] });
}

// Narration in front of the player (the rondvaart guide, navigation, cows,
// Radio Nachtstreek, Jelle's post-game taunts, HUD card lines; cls = its
// channel class): false (try again) while the channel is taken, true when
// it plays or can't play at all (muted), so the caller moves on.
export function playLineVoice(src, dur, cls = 'job') {
  if (!ctx || muted || storyScene) return true;
  if (!playVoice(src, { cls, dur, duck: [0.45, dur + 0.3] })) return false;
  if (cls !== 'radio') lastSpokenAt = ctx.currentTime;
  return true;
}

// Car banter (banter.js): one line at a time with its own handle, so a crash
// can cut it off. banter.js holds the channel for the whole exchange
// (speech.hold('banter')); a call or story scene ends it.
let banterVoice = null;

export function stopBanterVoice() {
  const v = banterVoice;
  banterVoice = null;
  if (!v) return;
  v.el.pause();
  if (v.node) v.node.disconnect();
  speech.end(v.tok);
  releaseEl(v.el);
}

export function pauseBanterVoice(paused) {
  const v = banterVoice;
  if (!v) return;
  if (paused) v.el.pause();
  else v.el.play().catch(() => {});
}

// Whether the channel is taken for car banter (another line talks or holds it).
export function voiceBusy() {
  return !speech.canSpeak('banter', 'banter');
}

export function playBanterVoice(src) {
  stopBanterVoice();
  if (!ctx || muted || storyScene) return false;
  return !!playExclusive(src, { cls: 'banter', owner: 'banter', duck: 0.3, strict: true, get: () => banterVoice, set: (x) => { banterVoice = x; }, stop: stopBanterVoice });
}

// Story contacts (storycontact.js: Jelle's calls, voicemails, livestreams):
// the 'call' class under their own owner; storycontact holds the channel
// for the whole contact (holdContactChannel) so nothing talks over it.
let contactVoice = null;

export function stopContactVoice() {
  const v = contactVoice;
  contactVoice = null;
  if (!v) return;
  v.el.pause();
  if (v.node) v.node.disconnect();
  speech.end(v.tok);
  releaseEl(v.el);
}

export function pauseContactVoice(paused) {
  const v = contactVoice;
  if (!v) return;
  if (paused) v.el.pause();
  else v.el.play().catch(() => {});
}

// radio: Rikus' Nachtstreek on the phone (storycontact.js), in the same broadcast band as playStoryVoice
export function playContactVoice(src, { radio = false } = {}) {
  stopContactVoice();
  if (!ctx || muted) return false;
  return !!playExclusive(src, { cls: 'call', owner: 'contact', radio, duck: 0.4, strict: true, get: () => contactVoice, set: (x) => { contactVoice = x; }, stop: stopContactVoice });
}

// true when the contact got the channel (false: a story scene or a call has it)
export function holdContactChannel(on, alive = null) {
  if (!on) { speech.release('contact'); return true; }
  return speech.hold('contact', 'call', null, { alive });
}

// Phone calls (phonefeed.js startCall): the call holds the channel and each
// line plays through here; onEnd fires when the clip is done (or failed).
export function playCallVoice(src, onEnd) {
  if (!ctx || muted) return false;
  return !!playVoice(src, { cls: 'call', owner: 'call', dur: 3, onEnd });
}

// Phone messages read aloud (phonefeed.js): the 'call' class under its own
// owner, so a call, a story contact or a story scene keeps it waiting, and it
// waits for a playing line to end instead of cutting it off. 'play', 'wait'
// (try again next frame) or 'off' (muted: the card stays silent).
export function playSmsVoice(src, dur, onEnd) {
  if (!ctx || muted) return 'off';
  if (storyScene || speech.clipPlaying() || !speech.canSpeak('call', 'sms')) return 'wait';
  if (!playVoice(src, { cls: 'call', owner: 'sms', dur: dur || 3, onEnd, duck: [0.4, (dur || 3) + 0.4] })) return 'wait';
  return 'play';
}

// A text arriving: a soft double tick, quieter than the ringtone.
export function playPhonePing() {
  if (!ctx || muted || !uiBus) return;
  [[0, 1567.98], [0.09, 2093]].forEach(([d, f]) => playTone({ freq: f, type: 'sine', duration: 0.09, gain: 0.022, delay: d, bus: uiBus, prio: 2 }));
}

function playVoiceline(character, key) {
  if (storyScene) return false;
  const paths = (character === 'anita' ? ANITA_LINES : TAMMO_LINES)[key];
  if (!paths || !paths.length) return false;
  return playSpokenClip(paths[Math.floor(Math.random() * paths.length)]);
}

// Bijbaantje boss lines (sidejobvoice.js): above reactions and bubbles,
// below car banter and calls; quiet during a story scene.
export function playJobVoice(src) {
  if (storyScene) return false;
  return playSpokenClip(src, null, 'job');
}

export function playAutoGejatLine(world) {
  if (world.player.character === 'tammo') playVoiceline('tammo', 'auto_gejat');
}

function playRandomVariant(paths, pos = null) {
  if (!paths || !paths.length) return false;
  return playSpokenClip(paths[Math.floor(Math.random() * paths.length)], pos);
}

// Returns false (bubble stays hidden, cooldown untouched) when the speaker is
// too far away to be heard.
export function playNpcPhrase(index, x, y) {
  const paths = NPC_PHRASE_AUDIO[index];
  if (!paths || !paths.length) return false;
  const pos = x === undefined ? null : { x, y };
  if (pos && distToListener(x, y) > SPEECH_RANGE) return false;
  return playNpcSpokenClip(paths[Math.floor(Math.random() * paths.length)], pos);
}

export function playPoliceBark(key, x, y) {
  return playRandomVariant(POLICE_BARK_AUDIO[key], x === undefined ? null : { x, y });
}

function nearestPoliceSource(world) {
  const p = world.player;
  let best = null;
  let bestD = Infinity;
  const consider = (x, y) => {
    const d = Math.hypot(x - p.x, y - p.y);
    if (d < bestD) { bestD = d; best = { x, y, d }; }
  };
  for (const v of world.vehicles) {
    if (v.isPolice && !v.hijacked && !v.wrecked && v.driver !== 'player') consider(v.x, v.y);
  }
  for (const ped of world.pedestrians) {
    if (ped.isCop && ped.state !== 'dead') consider(ped.x, ped.y);
  }
  return best;
}

const CHASE_BARK_NEAR = 45;
const CHASE_BARK_WAIT = 5;
const CHASE_BARK_FALLBACK_DIST = 30;
let chaseBarkDeadline = null;

// Waits briefly for a unit to come within earshot; otherwise the bark is
// placed in the direction of the nearest unit at a still-audible distance.
function updateChaseBark(world) {
  if (chaseBarkDeadline === null) return;
  if (world.wanted === 0) { chaseBarkDeadline = null; return; }
  const src = nearestPoliceSource(world);
  const expired = world.time >= chaseBarkDeadline;
  if (!(src && src.d <= CHASE_BARK_NEAR) && !expired) return;
  chaseBarkDeadline = null;
  const p = world.player;
  let x = p.x, y = p.y;
  if (src) {
    const k = src.d > CHASE_BARK_FALLBACK_DIST ? CHASE_BARK_FALLBACK_DIST / src.d : 1;
    x = p.x + (src.x - p.x) * k;
    y = p.y + (src.y - p.y) * k;
  }
  const key = POLICE_CHASE_START_KEYS[Math.floor(Math.random() * POLICE_CHASE_START_KEYS.length)];
  playPoliceBark(key, x, y);
}

// Story UI sounds (missionstory.js, storycontact.js): a soft rising sting
// under a clue, and the ringtone of an incoming story call (two short
// double rings, a phone in a pocket rather than the room).
export function playClueSting() {
  if (!ctx || muted || !stingBus) return;
  [[659.25, 0, 0.9], [987.77, 0.11, 0.9], [1318.5, 0.22, 1.2]].forEach(([freq, delay, duration]) =>
    playTone({ freq, type: 'sine', duration, gain: 0.05, delay, bus: stingBus, prio: 2 }));
  playTone({ freq: 329.6, type: 'triangle', duration: 1.4, gain: 0.035, bus: stingBus, prio: 2 });
}

// A line without a recording (the new story's text-only lines): a soft mumble under the
// subtitle, one voiced "syllable" per few letters over the line's reading time, higher for
// Tessa and the radio, lower for Tammo. No speech, only a sound that the scene is talking.
export function playTextMumble(who = '', text = '', dur = 2.5) {
  if (!ctx || muted || !stingBus) return;
  const n = Math.max(3, Math.min(14, Math.round(String(text).length / 4)));
  const base = who === 'A' ? 235 : who === 'T' ? 118 : who === 'V' ? 160 : 150;
  const step = Math.min(0.32, Math.max(0.12, (dur * 0.85) / n));
  for (let i = 0; i < n; i++) {
    const f = base * (0.9 + ((i * 7 + text.length) % 5) * 0.06);
    playTone({ freq: f, freqEnd: f * 0.93, type: 'triangle', duration: step * 0.8, gain: 0.018, delay: i * step + (i % 4 === 3 ? 0.08 : 0), filterFreq: 900 + ((i * 3) % 4) * 220, bus: stingBus, prio: 2 });
  }
}

// One heartbeat when badly hurt (lowhealth.js): a low "lub-dub", louder the closer to death.
export function playHeartbeat(strength = 0.5) {
  if (!ctx || muted || !uiBus) return;
  const g = 0.06 + 0.1 * Math.max(0, Math.min(1, strength));
  playTone({ freq: 62, freqEnd: 42, type: 'sine', duration: 0.16, gain: g, bus: uiBus, prio: 2 });
  playTone({ freq: 54, freqEnd: 38, type: 'sine', duration: 0.14, gain: g * 0.75, delay: 0.19, bus: uiBus, prio: 2 });
}

// Two glasses touching (H11's toasts, missionstory.js playToast): a bright
// ting with a short second ring, softer for small jenever glasses.
export function playGlassClink(small = false) {
  if (!ctx || muted || !stingBus) return;
  const base = small ? 3300 : 2480;
  for (const [f, g, d] of [[1, 0.045, 0.45], [1.51, 0.022, 0.3], [2.76, 0.012, 0.18]]) playTone({ freq: base * f, type: 'sine', duration: d, gain: g, bus: stingBus, prio: 2 });
  playTone({ freq: base * 1.04, type: 'sine', duration: 0.25, gain: 0.018, delay: 0.07, bus: stingBus, prio: 2 });
}

// Tammo whistles up a pigeon (pigeonmode.js): a soft two-note "fuu-fiet".
function playWhistle() {
  if (!ctx || muted || !uiBus) return;
  playTone({ freq: 1250, freqEnd: 1500, type: 'sine', duration: 0.2, gain: 0.05, bus: uiBus, prio: 2 });
  playTone({ freq: 1700, freqEnd: 2350, type: 'sine', duration: 0.3, gain: 0.05, delay: 0.26, bus: uiBus, prio: 2 });
}

export function playPhoneRing(rings = 2) {
  if (!ctx || muted || !uiBus) return;
  for (let k = 0; k < rings; k++) {
    for (const [d, f] of [[0, 1318.5], [0.16, 1174.7]]) {
      playTone({ freq: f, type: 'square', duration: 0.12, gain: 0.03, delay: k * 1.1 + d, filterFreq: 2600, bus: uiBus, prio: 2 });
      playTone({ freq: f * 2, type: 'sine', duration: 0.1, gain: 0.02, delay: k * 1.1 + d + 0.01, bus: uiBus, prio: 2 });
    }
  }
}

export function playSikkomLine(key) {
  playRandomVariant(SIKKOM_AUDIO[key]);
}

// The radio (radio.js): one station, on or off. Off holds the music like a
// scenario track does. The programme (musicpick.js PROGRAMMES) picks the
// pool and the jingles; a new programme starts with the next record.
// Every `every` records the radio takes a talk break: the record ends, the
// break handler voices its segment and calls done, then the music goes on.
let radioOn = true;
let radioProg = { name: '', music: 'gmusic', jingles: true, every: 3 };
let radioBreak = null;
let breakId = 0;
let inBreak = false;
let recordsSinceBreak = 0;
const radioHolds = () => !radioOn;
export function setRadioOn(on) {
  const was = radioOn;
  radioOn = !!on;
  // off ends a break without the music; back on goes on with the next record
  if (!radioOn) { inBreak = false; breakId++; } else if (!was && gmusicStarted && !gmusicHeld && gmusicCurrentEl && gmusicCurrentEl.ended) advanceGmusicQueue();
}
export function setRadioProgramme(p) {
  radioProg = p;
}
export function onRadioBreak(fn) {
  radioBreak = fn;
}
export function radioInBreak() {
  return inBreak;
}

// A steady source for another module (kartbaan.js's engine): it
// connects its own nodes to `bus`. null until the audio runs.
export function ambientOut() {
  return ctx && worldBus && !muted ? { ctx, bus: worldBus } : null;
}

// Fire-and-forget: initAudio() stays sync, this just fills in gmusicTracks
// whenever the manifest resolves. An empty or missing manifest leaves it
// empty, which every playback path below treats as "nothing to play".
async function loadGMusicManifest() {
  try {
    const res = await fetch(GMUSIC_MANIFEST_URL);
    if (!res.ok) return;
    const data = await res.json();
    const tracks = (Array.isArray(data.tracks) ? data.tracks : []).map(normalizeTrack).filter(Boolean);
    gmusicTracks = tracks.map((t) => {
      const el = wireGmusicEl(new Audio('./audio/gmusic/' + t.file));
      el.preload = 'auto';
      const raw = t.id.replace(/_/g, ' ');
      el.gmusicTitle = GMUSIC_TITLES[raw] || raw;
      if (!t.artist) t.artist = trackArtist(el.gmusicTitle);
      el.gmusicTrack = t;
      return el;
    });
  } catch (e) {
    // no manifest yet / bad JSON / fetch blocked - G-Music just stays silent
  }
}

// Station-style playback: jingle, shuffled track, jingle, track, ... all through
// ONE queue and ONE current element, so two items can never play at once.
// Every event handler ignores events from anything but gmusicCurrentEl, and
// the per-frame safety net in updateGMusic only ever resumes the current
// element - advancing happens exclusively via its 'ended' event.
const GMUSIC_RETRY_MIN = 0.5;
const GMUSIC_RETRY_MAX = 8;
const GMUSIC_PENDING_TIMEOUT = 5;

let gmusicTracks = [];
// what played lately, both pools together (musicpick.js); kept
// between sessions so a new one doesn't open with the record you just heard
const GMUSIC_HISTORY_KEY = KEYS.radioHistory;
const gmusicHistory = loadMusicHistory();
let lastJingleKey = null;
// the in-game hour (world.clock), for the night records
let musicHour = NaN;
let gmusicQueue = [];
let gmusicCurrentEl = null;
let gmusicStarted = false;
let gmusicFadingIn = false;
let gmusicPendingSince = null;
let gmusicSuspended = false;
// G-Music paused (position kept) while a scenario track plays
let gmusicHeld = false;
let gmusicRetryAt = 0;
let gmusicRetryDelay = GMUSIC_RETRY_MIN;
let gmusicAnnounceOnPlay = false;
// Set once a genuine track (not a jingle) is actually playing; updateGMusic
// flushes it into a HUD toast since it runs every frame with `world` in scope.
let pendingTrackAnnounce = null;

// Made-up Grunneger acts for the G-Music playlist; tracks without a named
// act get one picked from their title.
const GMUSIC_ARTISTS = {
  'Onder de Martinitoren': "Lil' Eierbal",
  'Hart van Beton': 'MC Moi Moi',
  'Ivoren Toren in Helpman': 'De Helpman Hustlers',
  'Staal op staal': 'Sjonnie Kiekdoar & de Ringweg Crew',
  'Vismarkt Sprint': 'DJ Kapsalon Kees',
  'Trouw aan het blok': 'Paddepoel Posse',
  'Perfectie kent geen grens': 'Young Kruudmoes',
  'De Geest van Oosterpark': 'Spookie Stadjer',
  'Goudgeld op de oprit': 'Rijke Riekus',
  'Suikerbuiken in de nacht': 'DJ Suikerbiet',
  "Oosterpark is m'n droom": 'Stadjer Supreme',
  'Staal en suiker': 'Beton Bert & de Bietenbende',
  'Wie stoan nait stil': 'De Nait Soezen Crew',
  'Kleur in de Wind': 'Windkracht Wiebke',
  'Geen stoplicht houdt ons tegen': 'Ringweg Drillers',
  'Goud in de Nacht': 'Nachtbus Nino',
  'Hatchback op de Ring': 'De Uitlaatjes',
  'Zomerse droom in de Stad': 'DJ Dageraad feat. MC Zernike',
  'Trots op mien grond': 'Wierde Wind',
  'Koplampen in de Mist': 'Lil Polder',
};
// file names can't carry every character of a title
const GMUSIC_TITLES = {
  'De Geest Van Oosterpark': 'De Geest van Oosterpark',
  'Oosterpark is m n droom': "Oosterpark is m'n droom",
};
const GMUSIC_SPARE_ARTISTS = ['Oma Trijntje & de Stadjers', 'Grunn Gang', 'Lord Stoepkrijt', 'De Diepenring Boys', 'Tante Tjoedie', 'Big Bommen Berend'];

export function trackArtist(title) {
  if (GMUSIC_ARTISTS[title]) return GMUSIC_ARTISTS[title];
  let h = 0;
  for (const c of String(title)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return GMUSIC_SPARE_ARTISTS[h % GMUSIC_SPARE_ARTISTS.length];
}

function wireGmusicEl(el) {
  try { ctx.createMediaElementSource(el).connect(musicBus); } catch (e) { /* ignore */ }
  el.addEventListener('ended', onGmusicEnded);
  // a stub or silent file is no record: never picked again, and if it is the current one, on to the next
  el.addEventListener('loadedmetadata', () => {
    if (el.gmusicTrack && Number.isFinite(el.duration) && el.duration < MIN_TRACK_S) {
      el.gmusicBad = true;
      if (el === gmusicCurrentEl && !inBreak) advanceGmusicQueue();
    }
  });
  el.addEventListener('playing', onGmusicPlaying);
  return el;
}

// one element per jingle, reused: a fresh one per cycle stayed wired to the
// music bus for good and piled up media players over a long session
const jingleEls = {};
function makeJingleEl(key) {
  const old = jingleEls[key];
  if (old && !old.error && old !== gmusicCurrentEl) return old;
  const el = wireGmusicEl(new Audio(GMUSIC_JINGLES[key]));
  el.gmusicJingleKey = key;
  jingleEls[key] = el;
  return el;
}

function loadMusicHistory() {
  try {
    const h = JSON.parse(localStorage.getItem(GMUSIC_HISTORY_KEY) || '[]');
    return Array.isArray(h) ? h.filter((x) => typeof x === 'string') : [];
  } catch (e) {
    return [];
  }
}

function randomAmbientJingleEl(chance = 1) {
  const key = pickJingle(AMBIENT_JINGLE_KEYS, lastJingleKey, { chance });
  if (!key) return null;
  lastJingleKey = key;
  return makeJingleEl(key);
}

// the next record from the programme's pool
function nextTrackEl() {
  const good = gmusicTracks.filter((x) => !x.gmusicBad);
  const t = pickTrack((good.length ? good : gmusicTracks).map((el) => el.gmusicTrack), gmusicHistory, { station: radioProg.music, hour: musicHour });
  const el = gmusicTracks.find((x) => x.gmusicTrack === t) || gmusicTracks[0];
  pushHistory(gmusicHistory, el.gmusicTrack.id);
  try { localStorage.setItem(GMUSIC_HISTORY_KEY, JSON.stringify(gmusicHistory)); } catch (e) { /* private mode */ }
  return el;
}

// a jingle between records most of the time, then the record
function buildGmusicCycle() {
  const j = randomAmbientJingleEl(0.6);
  return j ? [j, nextTrackEl()] : [nextTrackEl()];
}

function onGmusicEnded(e) {
  if (e.target !== gmusicCurrentEl) return;
  if (!e.target.gmusicJingleKey) recordsSinceBreak++;
  if (radioBreak && radioOn && !gmusicHeld && recordsSinceBreak >= radioProg.every) {
    recordsSinceBreak = 0;
    inBreak = true;
    const id = ++breakId;
    radioBreak(() => {
      if (id !== breakId || !inBreak) return;
      inBreak = false;
      advanceGmusicQueue();
    });
    return;
  }
  advanceGmusicQueue();
}

function onGmusicPlaying(e) {
  if (e.target !== gmusicCurrentEl) return;
  gmusicRetryDelay = GMUSIC_RETRY_MIN;
  if (gmusicAnnounceOnPlay) {
    gmusicAnnounceOnPlay = false;
    if (e.target.gmusicTitle) pendingTrackAnnounce = e.target.gmusicTitle;
  }
}

function playGmusicCurrent() {
  const el = gmusicCurrentEl;
  if (!el || el.gmusicPlayInFlight || gmusicSuspended || gmusicHeld) return;
  el.gmusicPlayInFlight = true;
  el.play().then(() => {
    el.gmusicPlayInFlight = false;
  }, () => {
    el.gmusicPlayInFlight = false;
    if (el !== gmusicCurrentEl) return;
    gmusicRetryAt = nowSec() + gmusicRetryDelay;
    gmusicRetryDelay = Math.min(GMUSIC_RETRY_MAX, gmusicRetryDelay * 2);
  });
}

// "Tune in" like a real running station: start mid-way through a random
// track (or occasionally a jingle) with a subtle fade-in.
function startGmusicRandomly() {
  gmusicStarted = true;
  gmusicPendingSince = nowSec();
  gmusicFadingIn = true;
  musicState.gain = 0;
  musicBus.gain.value = 0;

  const startAsJingle = Math.random() < 0.25 && speech.radioMayTalk();
  const el = startAsJingle ? randomAmbientJingleEl() : nextTrackEl();
  gmusicQueue = startAsJingle ? [nextTrackEl()] : buildGmusicCycle();
  gmusicCurrentEl = el;
  gmusicAnnounceOnPlay = true;

  const startPlayback = () => {
    if (gmusicPendingSince === null || el !== gmusicCurrentEl) return;
    gmusicPendingSince = null;
    const dur = el.duration;
    if (isFinite(dur) && dur > 1) el.currentTime = Math.random() * dur * 0.8;
    playGmusicCurrent();
  };
  if (el.readyState >= 1) startPlayback();
  else {
    el.addEventListener('loadedmetadata', startPlayback, { once: true });
    el.addEventListener('error', () => { gmusicPendingSince = null; }, { once: true });
  }
}

function advanceGmusicQueue() {
  if (!gmusicQueue.length) {
    if (!gmusicTracks.length) return;
    gmusicQueue = buildGmusicCycle();
  }
  const prevEl = gmusicCurrentEl;
  // a jingle never talks over a voice: skip it and go straight on with music
  const noJingle = () => !speech.radioMayTalk() || !radioProg.jingles;
  while (gmusicQueue.length > 1 && gmusicQueue[0].gmusicJingleKey && noJingle()) gmusicQueue.shift();
  if (gmusicQueue[0].gmusicJingleKey && noJingle() && gmusicTracks.length) gmusicQueue = [nextTrackEl()];
  const el = gmusicQueue.shift();
  gmusicCurrentEl = el;
  if (prevEl && prevEl !== el && !prevEl.paused) prevEl.pause();
  try { el.currentTime = 0; } catch (e) { /* not seekable yet */ }
  gmusicAnnounceOnPlay = true;
  playGmusicCurrent();
}

// Queued rather than layered over the running track: it replaces the next
// ambient jingle so music never overlaps.
function enqueueGmusicJingle(key) {
  if (!gmusicStarted || !speech.radioMayTalk() || !radioOn || !radioProg.jingles) return;
  const next = gmusicQueue[0];
  if (next && next.gmusicJingleKey === key) return;
  const el = makeJingleEl(key);
  if (next && next.gmusicJingleKey) gmusicQueue[0] = el;
  else gmusicQueue.unshift(el);
}

const audioLog = [];
function logAudio(ev, extra) {
  audioLog.push({ t: +(nowSec()).toFixed(1), ev, ...extra });
  if (audioLog.length > 30) audioLog.shift();
}

function resumeCtx(why) {
  if (!ctx || ctx.state === 'running' || ctx.state === 'closed' || document.hidden) return;
  logAudio('resume', { why, from: ctx.state });
  ctx.resume().catch(() => {});
}

function onVisibilityChange() {
  if (!ctx) return;
  if (document.hidden) {
    gmusicSuspended = true;
    if (gmusicCurrentEl && !gmusicCurrentEl.paused) gmusicCurrentEl.pause();
    ctx.suspend().catch(() => {});
  } else {
    gmusicSuspended = false;
    gmusicRetryAt = 0;
    // a resume() racing the suspend() above can lose: the watchdog retries
    resumeCtx('visible');
  }
}

// Safari only lets an AudioContext/media element start inside a real user
// gesture, and a context the OS suspended later (device change, fullscreen,
// focus loss) may need one too: every pointer/key press resumes what's
// stopped. Cheap when everything already runs.
function unlockAudio() {
  if (!ctx || document.hidden) return;
  gmusicSuspended = false;
  const el = gmusicCurrentEl;
  if (el && el.paused && !el.ended && gmusicPendingSince === null && !gmusicHeld) playGmusicCurrent();
  resumeCtx('input');
}

// ?stil in the URL: never create any audio (for automated/test sessions),
// without touching the player's saved mute setting.
// ?stil&audiograf: the full graph runs (G-Music, voices, ducks, watchdog) but
// ends in a muted sink, so tests can check the gain/duck state machine.
const GRAPH_TEST = FLAGS.audiograf;
const SILENT_MODE = FLAGS.stil && !GRAPH_TEST;
let outNode = null;
function output() {
  if (!outNode) {
    if (GRAPH_TEST) { outNode = ctx.createGain(); outNode.gain.value = 0; outNode.connect(ctx.destination); } else outNode = ctx.destination;
  }
  return outNode;
}

// Unity below 0.6, then a tanh knee towards 1: stacked big moments saturate
// gently instead of clipping, without the makeup gain a compressor adds.
function buildSoftClip() {
  const n = 2048;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1, a = Math.abs(x);
    curve[i] = Math.sign(x) * (a < 0.6 ? a : 0.6 + 0.4 * Math.tanh((a - 0.6) / 0.4));
  }
  const ws = ctx.createWaveShaper();
  ws.curve = curve;
  return ws;
}

let meter = null;

function buildGraph() {
  master = ctx.createGain();
  master.gain.value = muted ? 0 : masterLevel();
  const clip = buildSoftClip();
  master.connect(clip).connect(output());
  // the watchdog listens here for a NaN that silences the whole mix
  meter = ctx.createAnalyser();
  meter.fftSize = 256;
  clip.connect(meter);

  worldBus = ctx.createGain();
  worldBus.gain.value = getSettings().sfxVolume;
  worldBus.connect(master);
  // the city behind the unfolded phone (pause menu) sounds muffled; the menu's own clicks do not
  worldIn = ctx.createBiquadFilter();
  worldIn.type = 'lowpass';
  worldIn.frequency.value = 20000;
  worldIn.Q.value = 0.5;
  worldIn.connect(worldBus);

  // spoken lines skip the effects slider but share the master soft-clip
  voiceBus = ctx.createGain();
  voiceBus.gain.value = getSettings().voiceVolume;
  voiceBus.connect(master);

  sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.9;
  sfxBus.connect(worldIn);

  engineBus = ctx.createGain();
  engineBus.gain.value = 0;
  engineBus.connect(worldIn);

  sirenBus = ctx.createGain();
  sirenBus.gain.value = 0;
  sirenBus.connect(worldIn);

  // Music bypasses the SFX soft-clip so loud world sounds never squash it.
  musicOut = ctx.createGain();
  musicOut.gain.value = muted ? 0 : masterLevel();
  musicLp = ctx.createBiquadFilter();
  musicLp.type = 'lowpass';
  musicLp.frequency.value = 20000;
  musicOut.connect(musicLp).connect(output());
  musicBus = ctx.createGain();
  musicBus.gain.value = GMUSIC_VOLUME;
  musicBus.connect(musicOut);

  trafficBus = ctx.createGain();
  trafficBus.gain.value = 1;
  trafficBus.connect(worldIn);

  ambBus = ctx.createGain();
  ambBus.gain.value = AMB_LEVEL;
  ambBus.connect(worldIn);

  uiBus = ctx.createGain();
  uiBus.gain.value = 0.8;
  uiBus.connect(worldBus);

  stingBus = ctx.createGain();
  stingBus.gain.value = 0.8;
  stingBus.connect(worldIn);

  reverb = buildReverb();
  sfxBus.connect(reverb.send);
  const voiceSend = ctx.createGain();
  voiceSend.gain.value = 0.3;
  voiceBus.connect(voiceSend).connect(reverb.send);
  const ambSend = ctx.createGain();
  ambSend.gain.value = 0.5;
  ambBus.connect(ambSend).connect(reverb.send);

  noiseBuffer = buildNoiseBuffer(2);
  bank = createBank(ctx);
  engine = buildEngine();
  sirenVoices = Array.from({ length: SIREN_VOICES }, buildSirenVoice);
  engineVoices = Array.from({ length: ENGINE_VOICES }, buildEngineVoice);
  heliVoice = buildHeliVoice();
  squealVoice = buildSquealVoice();
  rumbleVoice = buildRumbleVoice();
  hornVoice = buildHornVoice();
  scrapeVoice = buildScrapeVoice();
  loadEngineWorklet();

  kit = {
    ctx, bank,
    buses: { sfx: sfxBus, amb: ambBus, ui: uiBus, sting: stingBus, world: worldBus },
    tone: playTone, noise: playNoiseBurst, buf: playBuf, spatial: spatialOut,
    dist: distToListener, listener: listenerPos, makePanner, setPannerPos,
    duckAmb: duckAmbience, setReverb, muted: () => muted,
    engineSynth: () => !!synth.traffic,
  };
  initUiSfx(kit);
}

// Created lazily: on game start, or earlier by a menu gesture on the title
// screen so its UI ticks are audible.
function ensureCtx() {
  if (ctx) return true;
  if (SILENT_MODE) return false;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  // 'balanced' gives the audio thread a few quanta of headroom: a busy CPU
  // (shader compiles, a heavy frame) then no longer starves the output
  try { ctx = new AC({ latencyHint: 'balanced' }); } catch (e) { ctx = new AC(); }
  speech.setSpeechClock(() => ctx.currentTime);
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  window.addEventListener('pointerdown', unlockAudio, true);
  window.addEventListener('keydown', unlockAudio, true);
  document.addEventListener('visibilitychange', onVisibilityChange);
  for (const ev of ['focus', 'pageshow']) window.addEventListener(ev, () => resumeCtx(ev));
  document.addEventListener('fullscreenchange', () => resumeCtx('fullscreen'));
  ctx.addEventListener('statechange', () => logAudio('state', { state: ctx.state }));
  buildGraph();
  return true;
}

export function initAudio(world) {
  if (!world.audioEvents) world.audioEvents = [];
  if (worldReady || SILENT_MODE || !ensureCtx()) return;
  worldReady = true;
  contactCursor = vehicleContacts.head;
  loadGMusicManifest();
  primeWorld(world);
}

function primeWorld(world) {
  for (const b of world.bullets) seenBullets.add(b);
  for (const pt of world.particles) seenParticles.add(pt);
  for (const ped of world.pedestrians) if (ped.state === 'dead') seenDeadPeds.add(ped);
  for (const v of world.vehicles) if (v.wrecked) seenWrecks.add(v);

  prev = {
    kills: world.stats.kills,
    copKills: world.stats.copKills,
    pedKills: world.stats.pedKills,
    health: world.health,
    armor: world.armor,
    money: world.money,
    weapon: world.weapon,
    missionPhase: world.mission ? world.mission.phase : null,
    wanted: world.wanted,
  };
  seenMessages = new WeakSet();
  for (const m of world.messages) seenMessages.add(m);
  initAmbience(kit, world);
  initFoley(kit, world);
  uiWorldInit(world);
}

function onUiDom(kind, e) {
  if (!ctx) {
    if (kind === 'focus' || kind === 'pointer' || !isUiGestureTarget(kind, e) || !ensureCtx()) return;
  }
  uiDomEvent(kind, e);
}

if (!SILENT_MODE && typeof document !== 'undefined') {
  document.addEventListener('focusin', (e) => onUiDom('focus', e), true);
  document.addEventListener('click', (e) => onUiDom('click', e), true);
  document.addEventListener('input', (e) => onUiDom('input', e), true);
  window.addEventListener('pointerdown', (e) => onUiDom('pointer', e), true);
  window.addEventListener('keydown', (e) => onUiDom('key', e), true);
}

// Fraction of top speed at which each gear runs out; the engine note climbs
// through each band and drops on the upshift.
const GEAR_TOPS = [0.15, 0.3, 0.48, 0.7, 1.05];

const BUS_GEAR_TOPS = [0.22, 0.45, 0.72, 1.05];

function gearFor(frac, current, tops = GEAR_TOPS) {
  let g = Math.min(current, tops.length - 1);
  while (g < tops.length - 1 && frac > tops[g]) g++;
  while (g > 0 && frac < tops[g - 1] - 0.04) g--;
  return g;
}

// Mirrors the worklet's PROFILES: idle/redline rpm, upshift dip time,
// output level. 0 petrol four, 1 hero Escort, 2 bus diesel, 3 brommer,
// 4 outboard, 5 V8, 6 van diesel.
const ENGINE_SPECS = [
  { idle: 800, red: 6200, shift: 0.18, level: 0.38 },
  { idle: 850, red: 6200, shift: 0.2, level: 0.4 },
  { idle: 600, red: 2300, shift: 0.3, level: 0.38 },
  { idle: 1700, red: 8000, shift: 0, level: 0.2 },
  { idle: 900, red: 5500, shift: 0, level: 0.36 },
  { idle: 750, red: 7000, shift: 0.16, level: 0.38 },
  { idle: 750, red: 4300, shift: 0.2, level: 0.38 },
  { idle: 0, red: 48000, shift: 0, level: 0.24 },
  { idle: 1300, red: 13000, shift: 0.08, level: 0.4 },
  { idle: 1200, red: 10000, shift: 0.1, level: 0.4 },
  { idle: 1000, red: 7500, shift: 0.16, level: 0.38 },
  { idle: 1800, red: 12000, shift: 0, level: 0.2 }, // 11: elektrische auto
  { idle: 900, red: 7500, shift: 0.14, level: 0.5 }, // 12: opgevoerde tokkie-auto
];

// Canoes, kayaks and pedalos have no engine: paddle strokes or the pedalo's
// wheel instead (updatePaddling).
const HUMAN_BOATS = new Set(['kano', 'kajak', 'waterfiets', 'sup', 'skiff', 'acht']);
function humanPowered(v) {
  return !!(v && v.isBoat && v.model && HUMAN_BOATS.has(v.model.kind));
}

// Sailing boats (model.sail: the skûtsje) have no engine either: wind in the
// rig, wood and rigging creaking, the bow wash, a luffing sail (updateSailing).
function sailPowered(v) {
  return !!(v && v.isBoat && v.model && v.model.sail);
}
const noMotor = (v) => humanPowered(v) || sailPowered(v);

const sailState = new WeakMap();
const SAIL_RANGE = 60;

function updateSailing(dt, world) {
  if (!ctx || muted || world.paused) return;
  const pv = world.player.inVehicle;
  for (const v of world.vehicles) {
    if (!sailPowered(v) || v.wrecked || v.sinking) continue;
    const mine = v === pv;
    if (!mine && distToListener(v.x, v.y, 1) > SAIL_RANGE) continue;
    let st = sailState.get(v);
    if (!st) { st = { creak: Math.random() * 2, wash: 0, luff: 0, angle: v.angle, yaw: 0 }; sailState.set(v, st); }
    let da = v.angle - st.angle;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    st.angle = v.angle;
    st.yaw += ((dt > 0 ? Math.abs(da) / dt : 0) - st.yaw) * Math.min(1, dt * 3);
    const speed = Math.abs(v.speed || 0);
    const frac = clamp(speed / 8, 0, 1);
    const k = mine ? 1 : 0.7;
    const out = () => spatialOut(v.x, v.y, { ref: 5, rolloff: 1.1, range: SAIL_RANGE, h: 1.2 });
    // the hull and the rigging work in the swell, more so under way and turning
    st.creak -= dt * (0.5 + frac + st.yaw * 2);
    if (st.creak <= 0) {
      st.creak = 1.4 + Math.random() * 2.2;
      const o = out();
      if (o) playBuf('creak', { out: o, gain: (0.05 + 0.05 * frac) * k, rate: 0.6 + Math.random() * 0.35, prio: 0 });
    }
    // the bow wash: slaps come quicker and louder with speed
    if (speed > 0.6) {
      st.wash -= dt;
      if (st.wash <= 0) {
        st.wash = (1.1 - 0.7 * frac) * (0.8 + Math.random() * 0.4);
        const o = spatialOut(v.x, v.y, { ref: 5, rolloff: 1.1, range: SAIL_RANGE, h: 0.2 });
        if (o) {
          playBuf('hull_slap', { out: o, gain: (0.08 + 0.12 * frac) * k, rate: 0.8 + Math.random() * 0.3, prio: 0 });
          playNoiseBurst({ duration: 0.5 + frac * 0.4, freq: 900 + frac * 900, freqEnd: 500, q: 0.5, gain: (0.03 + 0.06 * frac) * k, type: 'bandpass', out: o, prio: 0 });
        }
      }
    }
    // a sail that spills its wind (slow, turning, or the mast struck) flaps
    const luffing = (v.sailLuff ?? 0) > 0.35 || st.yaw > 0.25 || speed < 1.5;
    if (luffing) {
      st.luff -= dt;
      if (st.luff <= 0) {
        st.luff = 0.9 + Math.random() * 1.4;
        const o = out();
        if (o) {
          const n = 2 + Math.floor(Math.random() * 3);
          for (let i = 0; i < n; i++) playNoiseBurst({ duration: 0.05 + Math.random() * 0.03, freq: 320 + Math.random() * 260, q: 0.9, gain: 0.07 * k, type: 'bandpass', delay: i * (0.07 + Math.random() * 0.04), out: o, prio: 0 });
        }
      }
    }
  }
}

const paddleState = new WeakMap();
const PADDLE_RANGE = 45;

function paddleStroke(v, st, out, near) {
  const kind = v.model.kind;
  const k = near ? 1 : 0.7;
  if (kind === 'waterfiets') {
    // a blade of the stern wheel slapping in, and now and then the crank
    playNoiseBurst({ duration: 0.16, freq: 700 + Math.random() * 300, freqEnd: 260, q: 0.9, gain: 0.16 * k, type: 'bandpass', out });
    if ((st.n = (st.n || 0) + 1) % 4 === 0) playTone({ freq: 1900, freqEnd: 1500, type: 'triangle', duration: 0.03, gain: 0.025 * k, filterFreq: 3000, out });
    return;
  }
  // dip (short swish), then the pull through the water
  playNoiseBurst({ duration: 0.09, freq: 2600, freqEnd: 900, q: 1.4, gain: 0.07 * k, type: 'bandpass', out });
  playNoiseBurst({ duration: 0.42, freq: 900 + Math.random() * 250, freqEnd: 240, q: 0.6, gain: 0.22 * k, type: 'lowpass', delay: 0.07, out });
}

function updatePaddling(dt, world) {
  if (!ctx || muted || world.paused) return;
  const pv = world.player.inVehicle;
  for (const v of world.vehicles) {
    if (!humanPowered(v) || v.wrecked || v.sinking) continue;
    const mine = v === pv;
    const speed = Math.abs(v.speed || 0);
    const pulling = mine ? (v.throttle || 0) !== 0 || speed > 0.4 : speed > 0.3;
    if (!pulling) continue;
    if (!mine && distToListener(v.x, v.y, 0.5) > PADDLE_RANGE) continue;
    let st = paddleState.get(v);
    if (!st) { st = { t: Math.random() * 0.5 }; paddleState.set(v, st); }
    const top = v.model.maxSpeed || 2.5;
    const frac = clamp(speed / top, 0, 1);
    const period = v.model.kind === 'waterfiets' ? 0.34 - 0.16 * frac : v.model.kind === 'kajak' ? 0.62 - 0.14 * frac : v.model.kind === 'sup' ? 1.1 - 0.2 * frac : v.model.kind === 'skiff' || v.model.kind === 'acht' ? 1.5 - 0.3 * frac : 0.95 - 0.2 * frac;
    st.t -= dt;
    if (st.t > 0) continue;
    st.t = period * (0.92 + Math.random() * 0.16);
    const out = spatialOut(v.x, v.y, { ref: 4, rolloff: 1.2, range: PADDLE_RANGE, h: 0.4 });
    if (out) paddleStroke(v, st, out, mine);
  }
}

// Deelsteps are electric (kind 7); the police motor and the Snorscooter
// (model.moped) are a real two-stroke brommer.
function engineKind(v) {
  if (v.isScooter && v.model.motorbike) return v.model.motorbike === 'sport' ? 8 : v.model.motorbike === 'naked' ? 9 : 10;
  if (v.isScooter) return v.isPolice || v.model.moped ? 3 : 7;
  if (v.isBoat) return 4;
  if (v.isBus) return 2;
  if (v.isHeroCar) return 1;
  if (v.model && v.model.electric) return 11;
  if (v.model && v.model.tokkie) return 12;
  const name = v.model && v.model.name;
  if (name === 'sport' || name === 'police' || v.isPolice) return 5;
  if (name === 'van') return 6;
  // farm vehicles: the tractor a slow diesel like the bus, the quad a small single
  if (name === 'tractor') return 2;
  if (name === 'quad') return 3;
  return 0;
}

// rpm for a vehicle from its speed, gear and throttle. st carries gear state.
function engineRpm(v, st, kind, throttle, t) {
  const S = ENGINE_SPECS[kind];
  const speed = Math.abs(v.speed);
  const frac = speed / (v.model.maxSpeed || 30);
  let shifted = 0;
  if (kind === 3) return { rpm: throttle > 0 ? 3800 + 3400 * Math.min(1, frac) : S.idle + 1800 * Math.min(1, frac), shifted };
  if (kind === 11) return { rpm: 1800 + 9500 * Math.min(1, speed / ((v.model.maxSpeed || 34) * 0.7)), shifted };
  if (kind === 7) return { rpm: 2400 + 42000 * Math.min(1, speed / 10), shifted };
  if (kind === 4) return { rpm: S.idle + (S.red - S.idle) * (throttle !== 0 ? 0.35 + 0.6 * Math.min(1, frac) : frac * 0.4), shifted };
  if (v.speed < -0.2) { st.gear = 0; return { rpm: S.idle + (S.red * 0.7 - S.idle) * clamp(speed / (v.model.maxSpeed * 0.25), 0, 1), shifted }; }
  const tops = kind === 2 ? BUS_GEAR_TOPS : GEAR_TOPS;
  const g = gearFor(frac, st.gear, tops);
  if (g !== st.gear) { shifted = g > st.gear ? 1 : -1; st.gear = g; }
  let rpm = Math.max(S.idle, S.red * 0.93 * frac / tops[g]);
  if (g === 0 && throttle > 0 && speed < 4) rpm = Math.max(rpm, S.idle + (kind === 2 ? 300 : 700) * (1 - speed / 4));
  return { rpm, shifted };
}

function synthPost(node, msg) {
  if (node) node.port.postMessage(msg);
}

const SURFACE_CODE = { asfalt: 0, klinkers: 1, gras: 2, fietspad: 3 };

function updateEngineSynth(dt, world) {
  const S = engineState;
  const v = world.player.inVehicle;
  const t = ctx.currentTime;
  // a helicopter's rotor is sfx/sky.js, not a car engine
  const motor = !!(v && !v.isBike && !v.isHeli && !v.wrecked && !v.shiftParked && !noMotor(v));
  if (motor && v !== S.vehicle) {
    S.vehicle = v;
    S.kind = engineKind(v);
    S.gear = 0;
    S.shiftUntil = 0;
    S.prevThr = 0;
    if (S.startDelay < 0 && Math.abs(v.speed) > 1) synthPost(synth.player, { type: 'run', i: 0, kind: S.kind });
    else synthPost(synth.player, { type: 'start', i: 0, kind: S.kind, at: t + Math.max(0, S.startDelay) });
  } else if (!motor && S.vehicle) {
    S.vehicle = null;
    synthPost(synth.player, { type: 'stop', i: 0 });
  }
  S.startDelay = -1;

  const rain = clamp(world.weather ? world.weather.intensity || 0 : 0, 0, 1);
  let road = { gain: 0 };
  if (v && !v.wrecked && !v.isHeli && !world.paused) {
    const speed = Math.abs(v.speed);
    const small = v.isBike || v.isScooter;
    const surface = v.isBoat ? 4 : SURFACE_CODE[v.surface] ?? 0;
    const coasting = v.isBike && !v._mount && !(v.throttle > 0) && speed > 0.8;
    road = {
      speed, surface, small: small ? 1 : 0,
      wet: surface === 2 || v.isBoat ? 0 : rain,
      water: v.isBoat ? 1 : 0,
      wind: small ? 1 : sailPowered(v) ? 1 : v.isBoat ? 0.8 : v.isBus ? 0.25 : 0.4,
      free: coasting ? speed * 9 : 0,
      gain: clamp(speed / 1.2, v.isBoat ? 1 : 0, 1) * (v.isBus ? 0.36 : small ? 0.3 : 0.32),
    };
  }

  if (!S.vehicle) {
    S.gain += (0 - S.gain) * Math.min(1, dt * 4);
    synthPost(synth.player, { type: 'p', v: [], road });
    return;
  }
  const spec = ENGINE_SPECS[S.kind];
  const thr = world.paused ? 0 : v.throttle || 0;
  const speed = Math.abs(v.speed);
  const prevGear = S.gear;
  let { rpm: baseRpm, shifted } = engineRpm(v, S, S.kind, thr, t);
  // geared vehicles: the gearbox (gearbox.js) owns gear and revs, mapped onto this engine's range
  const gb = v.gb;
  if (gb) {
    const p = gb.p;
    baseRpm = spec.idle + clamp((gb.rpm - p.idle) / (p.red - p.idle), 0, 1.02) * (spec.red - spec.idle);
    if (gb.stalled) baseRpm = 0;
    const g = Math.max(0, gb.gear - 1);
    shifted = g === prevGear ? 0 : g > prevGear ? 1 : -1;
    S.gear = g;
  }
  let rpm = baseRpm;
  let load = thr > 0 ? 0.9 : speed < 0.4 ? 0.25 : 0.15;
  if (thr < 0 && v.speed <= 0.3) load = 0.7;
  if (shifted > 0 && speed > 2 && thr > 0 && spec.shift) S.shiftUntil = t + spec.shift;
  if (speed < 0.5 && thr > 0 && v.handbrake) rpm = spec.red * 0.6;
  if (thr > 0) rpm += (v.slip || 0) * spec.red * 0.08;
  if (t < S.shiftUntil) load = 0.3;
  rpm = Math.min(rpm, spec.red * 0.95);
  S.prevThr = thr;
  S.rpm = rpm;

  // an electric motor is silent standing still and whines up with speed
  const gain = spec.level * (world.paused ? 0.5 : 1) * (S.kind === 7 || S.kind === 11 ? clamp(speed / 2.5, 0, 1) * (0.6 + 0.4 * (thr > 0 ? 1 : 0)) : 1);
  S.gain += (clamp(0.15 + 0.35 * load * rpm / spec.red, 0, 0.5) - S.gain) * Math.min(1, dt * 4);
  const camD = distToListener(v.x, v.y, 0.7);
  const muffle = clamp(16000 / (1 + Math.max(0, camD - 5) / 6), 1200, 16000);
  if (engineEarly) {
    const place = getPlace();
    engineEarly.level.gain.setTargetAtTime(v.isBoat ? 0 : 0.05 + 0.13 * clamp(place.density || 0, 0, 1), ctx.currentTime, 0.5);
  }
  synthPost(synth.player, { type: 'p', v: [{ i: 0, kind: S.kind, rpm, load, gain, pitch: 1, muffle }], road });
}

// The HUD's rev counter and gear (hud_panel.js): the engine sound's own
// state, so the needle and the sound agree. null when no engine runs.
export function engineReadout() {
  const S = engineState;
  if (!S.vehicle) return null;
  const spec = ENGINE_SPECS[S.kind];
  const gb = S.vehicle.gb;
  const geared = !!gb || (S.kind !== 3 && S.kind !== 4 && S.kind !== 7 && S.kind !== 11);
  const out = { rpm: S.rpm || spec.idle, red: spec.red, gear: geared ? S.gear : -1, reverse: S.vehicle.speed < -0.2, gears: gb ? gb.p.tops.length : geared ? (S.kind === 2 ? BUS_GEAR_TOPS : GEAR_TOPS).length : 0 };
  if (gb) out.gb = gearboxReadout(gb);
  return out;
}

const trafficEngine = new WeakMap();

function trafficEngineParams(v, dt, fresh) {
  let st = trafficEngine.get(v);
  const speed = Math.abs(v.speed);
  if (!st) { st = { gear: 0, prev: speed, load: 0.3 }; trafficEngine.set(v, st); }
  const acc = dt > 0 ? (speed - st.prev) / dt : 0;
  st.prev = speed;
  const target = acc > 0.3 ? clamp(0.4 + acc / (v.model.accel || 8) * 0.4, 0, 0.8) : acc < -0.6 ? 0.12 : speed < 0.3 ? 0.22 : 0.3;
  st.load += (target - st.load) * Math.min(1, dt * 2.5);
  const kind = engineKind(v);
  const { rpm } = engineRpm(v, st, kind, acc > 0.3 ? 1 : 0, 0);
  return { kind, rpm, load: st.load, snap: fresh };
}

function updateEngine(dt, world) {
  if (synth.player) { updateEngineSynth(dt, world); return; }
  const v = world.player.inVehicle;
  const motor = v && !v.isBike && !v.isHeli && !noMotor(v);
  const speed = motor ? Math.abs(v.speed) : 0;
  const t = ctx.currentTime;
  let targetGain = 0, targetFreq = 42, cutoff = 300;
  if (motor && v.isScooter) {
    targetGain = speed > 0.2 ? 0.03 + speed * 0.006 : 0;
    const brommer = v.isPolice || v.model.moped;
    targetFreq = brommer ? 70 + speed * 12 : 300 + speed * 70;
    cutoff = brommer ? 700 : 2600;
    if (brommer) targetGain *= 0.7;
  } else if (motor) {
    const frac = speed / (v.model.maxSpeed || 30);
    const g = v.speed < 0 ? 0 : gearFor(frac, engineState.gear);
    if (g !== engineState.gear) {
      const up = g > engineState.gear;
      engineState.gear = g;
      if (!v.isBoat && speed > 2) {
        engineState.shiftUntil = t + (up ? 0.13 : 0.08);
        playShiftBlip(up, engineState.freq);
      }
    }
    const lo = g ? GEAR_TOPS[g - 1] : 0;
    const rpm = clamp((frac - lo) / (GEAR_TOPS[g] - lo), 0, 1);
    const load = v.throttle > 0 ? 1 : 0.55;
    targetFreq = 40 + rpm * 62 + g * 5;
    targetGain = clamp((0.12 + rpm * 0.2 + speed * 0.004) * load, 0.1, 0.5);
    cutoff = 260 + rpm * 900 * load + speed * 6;
    if (t < engineState.startAt) targetGain = 0;
    if (t < engineState.shiftUntil) { targetGain *= 0.35; targetFreq *= 0.8; }
  }
  if (motor && v.tuning) targetGain *= v.tuning.geluid; // uitlaat uit tuningplan.js (#196)
  const k = Math.min(1, dt * (t < engineState.shiftUntil ? 14 : 6));
  engineState.gain += (targetGain - engineState.gain) * k;
  engineState.freq += (targetFreq - engineState.freq) * k;

  engineBus.gain.value = engineState.gain * 0.65;
  engine.osc1.frequency.value = engineState.freq;
  engine.osc2.frequency.value = engineState.freq * 2 + 4;
  engine.filter.frequency.value = cutoff;
}

// --- tyre squeal, surface rumble, player horn ---------------------------------

const SQUEAL_RANGE = 55;
const NO_VEHICLES = [];
let squealVoice = null;
let rumbleVoice = null;
let hornVoice = null;
let scrapeVoice = null;
let contactCursor = 0;
let bellReadyAt = 0;

function buildSquealVoice() {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 1300;
  band.Q.value = 9;
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = 1100;
  const oscGain = ctx.createGain();
  oscGain.gain.value = 0.12;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  const panner = makePanner({ ref: 6, rolloff: 1, model: 'equalpower' });
  src.connect(band).connect(gain);
  osc.connect(oscGain).connect(gain);
  gain.connect(panner).connect(sfxBus);
  src.start();
  osc.start();
  return { band, osc, gain, panner, level: 0, target: null, fresh: true };
}

function buildRumbleVoice() {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 200;
  filter.Q.value = 0.8;
  const am = ctx.createGain();
  am.gain.value = 1;
  const lfo = ctx.createOscillator();
  lfo.type = 'square';
  lfo.frequency.value = 20;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 0;
  lfo.connect(lfoDepth).connect(am.gain);
  const gain = ctx.createGain();
  gain.gain.value = 0;
  src.connect(filter).connect(am).connect(gain).connect(sfxBus);
  src.start();
  lfo.start();
  return { filter, am, lfo, lfoDepth, gain };
}

// Player horn: two detuned discs driven into a soft clipper (the brassy
// "honk"), then a resonant horn-bell formant and a gentle top cut.
function hornDrive() {
  const n = 1024, curve = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; curve[i] = Math.tanh(x * 2.6) / Math.tanh(2.6); }
  return curve;
}

function buildHornVoice() {
  const mix = ctx.createGain();
  mix.gain.value = 0.7;
  const shaper = ctx.createWaveShaper();
  shaper.curve = hornDrive();
  shaper.oversample = '2x';
  const bell = ctx.createBiquadFilter();
  bell.type = 'peaking';
  bell.frequency.value = 1750;
  bell.Q.value = 1.4;
  bell.gain.value = 7;
  const body = ctx.createBiquadFilter();
  body.type = 'peaking';
  body.frequency.value = 520;
  body.Q.value = 1.1;
  body.gain.value = 4;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 4200;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  const a = ctx.createOscillator();
  a.setPeriodicWave(hornWave());
  a.frequency.value = 415;
  const b = ctx.createOscillator();
  b.setPeriodicWave(hornWave());
  b.frequency.value = 523;
  const bGain = ctx.createGain();
  bGain.gain.value = 0.8;
  a.connect(mix);
  b.connect(bGain).connect(mix);
  mix.connect(shaper).connect(body).connect(bell).connect(filter).connect(gain).connect(sfxBus);
  a.start();
  b.start();
  return { a, b, bGain, gain, on: false };
}

function updateSqueal(dt, world) {
  let best = null, bestScore = 0;
  for (const v of world.paused ? NO_VEHICLES : world.vehicles) {
    const slip = v.slip || 0;
    if (slip < 0.3 || v.wrecked || v.isBoat || v.surface === 'gras') continue;
    if (Math.abs(v.speed) < 1.5 && !v._burnout) continue;
    const d = distToListener(v.x, v.y, 0.4);
    if (d > SQUEAL_RANGE) continue;
    const score = slip * (v.driver === 'player' ? 2 : 1) / (1 + d * 0.05);
    if (score > bestScore) { bestScore = score; best = v; }
  }
  const voice = squealVoice;
  const t = ctx.currentTime;
  if (best !== voice.target) { voice.target = best; voice.fresh = true; }
  let target = 0;
  if (best) {
    const slip = best.slip;
    const small = best.isBike || best.isScooter;
    target = clamp((slip - 0.3) / 0.6, 0, 1) * (small ? 0.12 : 0.34);
    const wob = Math.sin(t * 23) * 60 + Math.sin(t * 7.3) * 90;
    const f = (small ? 2200 : 950) + slip * 700 + wob;
    voice.band.frequency.setTargetAtTime(f, t, 0.05);
    voice.osc.frequency.setTargetAtTime(f * 0.99, t, 0.05);
    setPannerPos(voice.panner, best.x, best.y, 0.4, !voice.fresh);
    voice.fresh = false;
  }
  voice.level += (target - voice.level) * Math.min(1, dt * (target > voice.level ? 12 : 5));
  if (voice.level < 0.002 && target === 0) voice.level = 0;
  voice.gain.gain.setTargetAtTime(voice.level, t, 0.03);
}

const RUMBLE = {
  klinkers: { freq: 190, q: 0.9, rate: 4.2, depth: 0.85, gain: 0.014, max: 0.32 },
  asfalt: { freq: 140, q: 0.6, rate: 1.2, depth: 0.08, gain: 0.005, max: 0.12 },
  fietspad: { freq: 160, q: 0.6, rate: 1.5, depth: 0.12, gain: 0.006, max: 0.13 },
  gras: { freq: 320, q: 0.5, rate: 1.6, depth: 0.55, gain: 0.011, max: 0.26 },
};

function updateRumble(dt, world) {
  const v = world.player.inVehicle;
  const t = ctx.currentTime;
  const r = rumbleVoice;
  if (synth.player) return;
  if (!v || v.isBoat || v.isHeli || v.wrecked || world.paused) { r.gain.gain.setTargetAtTime(0, t, 0.1); return; }
  const p = RUMBLE[v.surface] || RUMBLE.asfalt;
  const speed = Math.abs(v.speed);
  const scale = v.isBike || v.isScooter ? 0.45 : v.isBus ? 1.3 : 1;
  const g = Math.min(p.max, speed * p.gain) * scale * clamp(speed / 1.5, 0, 1);
  r.filter.frequency.setTargetAtTime(p.freq * (v.isBus ? 0.7 : 1), t, 0.1);
  r.filter.Q.setTargetAtTime(p.q, t, 0.1);
  r.lfo.frequency.setTargetAtTime(clamp(speed * p.rate, 2, 90), t, 0.05);
  r.lfoDepth.gain.setTargetAtTime(p.depth * 0.5, t, 0.1);
  r.am.gain.setTargetAtTime(1 - p.depth * 0.5, t, 0.1);
  r.gain.gain.setTargetAtTime(g, t, 0.12);
}

function updatePlayerHorn(world) {
  const v = world.player.inVehicle;
  const t = ctx.currentTime;
  const pressing = !!(v && v.horn && !v.wrecked && !world.paused);
  const bell = v && (v.isBike || (v.isScooter && !v.isPolice)); // an e-step has a bell too
  if (pressing && bell) {
    if (t >= bellReadyAt && v._mount === 'horse') { playWhinny(v.x, v.y); bellReadyAt = t + 1.6; }
    else if (t >= bellReadyAt) {
      playBell(v.x, v.y);
      // tuning (#196): de dubbele bel is een tweede, hogere tik net na de eerste
      if (v.tuning && v.tuning.claxon === 'bel2') setTimeout(() => playBell(v.x, v.y), 140);
      bellReadyAt = t + 0.45;
    }
  } else if (!pressing) bellReadyAt = 0;
  const on = pressing && !bell;
  if (on && !hornVoice.on) {
    let low = v.isScooter ? 1.55 : hornPitch(v);
    const single = v.isScooter || v.isHeroCar;
    // tuning (#196): de toeter klinkt hoger en vrolijker, de melodietoeter loopt drie noten omhoog
    const claxon = v.tuning && v.tuning.claxon;
    if (claxon === 'toeter') low *= 1.18;
    if (claxon === 'melodie') {
      low *= 1.12;
      for (const [i, m] of [1.26, 1.5].entries()) {
        const at = t + 0.16 * (i + 1);
        hornVoice.a.frequency.setValueAtTime(415 * low * m, at);
        hornVoice.b.frequency.setValueAtTime(498 * low * m * 1.004, at);
      }
    }
    hornVoice.a.frequency.setValueAtTime(415 * low, t);
    hornVoice.b.frequency.setValueAtTime(498 * low * 1.004, t);
    hornVoice.bGain.gain.setValueAtTime(single ? 0 : 0.85, t);
  }
  if (on !== hornVoice.on) {
    hornVoice.on = on;
    hornVoice.gain.gain.setTargetAtTime(on ? (v && v.isScooter ? 0.12 : 0.42) : 0, t, on ? 0.006 : 0.025);
  }
}

// Collision contacts recorded by vehicle.js: crunches scaled by closing
// speed, rate-limited scrapes while sliding along walls or cars.
function updateContactAudio(world) {
  const vc = vehicleContacts;
  if (vc.head - contactCursor > vc.cap) contactCursor = vc.head - vc.cap;
  for (; contactCursor < vc.head; contactCursor++) {
    const c = vc.list[contactCursor % vc.cap];
    if (!c.a) continue;
    if (c.impact >= 1.5) {
      const la = lastCrashAt.get(c.a) ?? -Infinity;
      const lb = c.b ? lastCrashAt.get(c.b) ?? -Infinity : -Infinity;
      if (world.time - Math.max(la, lb) >= CRASH_MIN_GAP) {
        playCrash(c.x, c.y, c.impact);
        lastCrashAt.set(c.a, world.time);
        if (c.b) lastCrashAt.set(c.b, world.time);
      }
    } else if (c.slide > 3 && !c.a.isBike && !c.a.isScooter) {
      const sv = scrapeVoice;
      if (world.time > sv.until) sv.fresh = true;
      sv.until = world.time + 0.16;
      sv.target = Math.max(sv.fresh ? 0 : sv.target, clamp(c.slide / 12, 0.2, 1));
      sv.x = c.x; sv.y = c.y;
    }
  }
}

function updateScrape(dt, world) {
  const sv = scrapeVoice;
  const t = ctx.currentTime;
  const on = !world.paused && world.time < sv.until;
  const target = on ? sv.target : 0;
  sv.target *= Math.max(0, 1 - dt * 2);
  sv.level += (target - sv.level) * Math.min(1, dt * (target > sv.level ? 8 : 5));
  if (sv.level < 0.002 && !on) { sv.level = 0; sv.target = 0; }
  if (sv.level > 0) {
    setPannerPos(sv.panner, sv.x, sv.y, 0.5, !sv.fresh);
    sv.fresh = false;
    sv.band.frequency.setTargetAtTime(550 + sv.level * 350, t, 0.12);
  }
  sv.gain.gain.setTargetAtTime(sv.level * 0.07, t, 0.08);
}

const MAX_EVENTS_PER_FRAME = 8;

// world.audioEvents: [{kind, x, y, strength?}], up to MAX_EVENTS_PER_FRAME a
// frame; returns how many it took (the rest waits for the next frame).
function playAudioEvents(world) {
  const q = world.audioEvents;
  const n = Math.min(q.length, MAX_EVENTS_PER_FRAME);
  let doorDelay = 0;
  for (let i = 0; i < n; i++) {
    const e = q[i];
    const x = e.x ?? world.player.x, y = e.y ?? world.player.y;
    switch (e.kind) {
      case 'bell': playBell(x, y); break;
      case 'crossing_bell': playCrossingBell(x, y); break;
      case 'train_horn': playTrainHorn(x, y); break;
      case 'train_clack': playTrainClack(x, y, clamp(e.strength ?? 0.5, 0, 1)); break;
      case 'horn': playHorn(x, y, e.strength ? 0.15 + clamp(e.strength, 0, 1) * 0.65 : 0.4); break;
      case 'shout': playShout(x, y, clamp(e.strength ?? 0.5, 0, 1)); break;
      case 'hiccup': playHiccup(x, y, !!e.female); break;
      case 'weapon': playWeaponSfx(e, x, y); break;
      case 'giggle': playGiggle(x, y, !!e.female); break;
      case 'door_open': if (!(e.wood && playFx('door_wood_open', x, y))) playDoor(x, y, true); doorDelay = 0.3; break;
      case 'door_close': if (!(e.wood && playFx('door_wood_close', x, y))) playDoor(x, y, false); break;
      // a minigame foot on the run-up (pg_fierljep.js) and a boat hitting a bridge (rondvaartchase.js)
      case 'step': playBuf('prop_wood', { out: spatialOut(x, y, { ref: 4, range: 50 }) || undefined, gain: 0.12 + clamp(e.strength ?? 0.5, 0, 1) * 0.2, rate: 0.9 + Math.random() * 0.2 }); break;
      case 'impact': propHit({ strength: e.strength ?? 0.7, material: e.material || 'wood' }, x, y); playFx('splash_big', x, y); break;
      case 'engine_start':
        if (synth.player) { engineState.startDelay = doorDelay; break; }
        playEngineStart(x, y, doorDelay);
        engineState.startAt = ctx.currentTime + doorDelay + 0.75;
        engineState.gear = 0;
        break;
      case 'engine_stop': if (!synth.player) playEngineStop(x, y); break;
      case 'gear-ok': playNoiseBurst({ duration: 0.03, freq: 700, q: 3, gain: 0.05, type: 'bandpass', bus: uiBus }); break;
      case 'gear-grind': {
        for (let j = 0; j < 3; j++) playNoiseBurst({ duration: 0.05, freq: 1800 + j * 400, q: 1.5, gain: 0.06, type: 'bandpass', delay: j * 0.045, bus: uiBus });
        break;
      }
      case 'gear-refuse': playTone({ freq: 220, type: 'square', duration: 0.1, gain: 0.04, bus: uiBus }); break;
      case 'engine_stall': playTone({ freq: 90, freqEnd: 35, type: 'sawtooth', duration: 0.35, gain: 0.12, filterFreq: 500, bus: uiBus }); break;
      case 'prop_hit': propHit(e, x, y); break;
      case 'bullet_hit': playBulletHit(x, y, e.material, clamp(e.strength ?? 0.5, 0, 1)); break;
      case 'coo': case 'flap': case 'bonk': case 'poop': case 'splat': case 'plop': case 'pala': case 'padelglas': case 'padelgaas': playCritterEvent(e.kind, x, y, clamp(e.strength ?? 0.5, 0, 1)); break;
      case 'splash': playSplash(x, y); break;
      case 'fx': playFx(e.name, x, y, e); break;
      // one carillon-game bell (carillon.js): the tower's bell sample at the right pitch, no gap limit
      case 'bell_note': {
        const out = spatialOut(x, y, { ref: 8, rolloff: 0.7, range: 400, prio: 2 });
        if (out) playBuf('bell_carillon', { out, gain: 0.5 * clamp(e.gain ?? 1, 0, 1.5), rate: clamp(e.rate ?? 1, 0.25, 4), prio: 2 });
        break;
      }
      case 'whistle': playWhistle(); break;
      case 'gore': case 'gore_splat': case 'ko': case 'poof': playGoreEvent(e.kind, x, y, clamp(e.strength ?? 0.5, 0, 1)); break;
      case 'animal_hit': {
        const out = spatialOut(x, y, { ref: 6, rolloff: 1, range: 70 });
        const k = clamp(e.strength ?? 0.5, 0, 1);
        if (out) {
          playBuf('body_hit', { out, gain: 0.25 + k * 0.3, rate: 0.95 - k * 0.3 });
          playTone({ freq: 110 - k * 40, freqEnd: 40, type: 'sine', duration: 0.18 + k * 0.2, gain: 0.15 + k * 0.3, out });
        }
        break;
      }
      case 'caw': case 'peck': playCritterEvent(e.kind, x, y, clamp(e.strength ?? 0.5, 0, 1)); break;
      case 'whoosh': playBuf('whoosh', { out: spatialOut(x, y, { ref: 6, range: 60 }) || undefined, gain: 0.18 + clamp(e.strength ?? 0.5, 0, 1) * 0.2 }); break;
      case 'camera_shutter':
        playNoiseBurst({ duration: 0.025, freq: 3200, q: 2, gain: 0.07, type: 'bandpass', bus: uiBus });
        playNoiseBurst({ duration: 0.03, freq: 2400, q: 2, gain: 0.06, type: 'bandpass', delay: 0.07, bus: uiBus });
        break;
      case 'alarm': {
        const out = spatialOut(x, y, { ref: 6, range: 90 });
        if (out) for (let j = 0; j < 6; j++) playTone({ freq: j % 2 ? 900 : 1300, type: 'square', duration: 0.22, gain: 0.035, delay: j * 0.24, out });
        break;
      }
      case 'notify':
        playTone({ freq: 1568, type: 'sine', duration: 0.3, gain: 0.08, bus: uiBus, prio: 2 });
        playTone({ freq: 2093, type: 'sine', duration: 0.25, gain: 0.06, delay: 0.08, bus: uiBus, prio: 2 });
        break;
      case 'prestatie':
        [659, 988, 1319].forEach((f, j) => playTone({ freq: f, type: 'sine', duration: 0.6, gain: 0.045, delay: j * 0.09, filterFreq: 2600, bus: stingBus, prio: 2 }));
        break;
      case 'achievement':
        [784, 988, 1175, 1568].forEach((f, j) => playTone({ freq: f, type: 'triangle', duration: 0.22, gain: 0.08, delay: j * 0.07, bus: stingBus, prio: 2 }));
        break;
      default: break;
    }
  }
  return n;
}

// Bullet impacts by surface; a share of the hard ones whine off as ricochets.
const IMPACT_BUF = { stone: ['imp_stone_', 3], metal: ['imp_metal_', 3], dirt: ['imp_dirt', 0], wood: ['imp_wood', 0], water: ['imp_water', 0] };
let impactsThisFrame = 0;
let impactFrameAt = -1;
function playBulletHit(x, y, material, k) {
  if (!ctx) return;
  if (impactFrameAt !== ctx.currentTime) { impactFrameAt = ctx.currentTime; impactsThisFrame = 0; }
  if (++impactsThisFrame > 4) return;
  const out = spatialOut(x, y, { ref: 4, rolloff: 1.2, range: 70 });
  if (!out) return;
  const r = 0.9 + Math.random() * 0.2;
  if (material === 'glass') {
    playBuf('glass', { out, gain: 0.12 + k * 0.12, rate: 1.1 + Math.random() * 0.3 });
    return;
  }
  if (material === 'flesh') {
    playBuf('body_hit', { out, gain: 0.28 + k * 0.2, rate: 0.9 * r });
    return;
  }
  const [pre, n] = IMPACT_BUF[material] || IMPACT_BUF.stone;
  playBuf(n ? pre + Math.floor(Math.random() * n) : pre, { out, gain: 0.16 + k * 0.22, rate: r });
  if ((material === 'stone' || material === 'metal') && Math.random() < 0.18) playBuf('ric_whine', { out, gain: 0.08, rate: 0.9 + Math.random() * 0.3, delay: 0.01 });
}

function playGoreEvent(kind, x, y, k) {
  const big = kind === 'gore' || kind === 'ko';
  const out = spatialOut(x, y, { ref: big ? 7 : 4, rolloff: 1.1, range: big ? 80 : 45 });
  if (!out) return;
  const r = 0.9 + Math.random() * 0.2;
  if (kind === 'gore') {
    playBuf('squelch_' + Math.floor(Math.random() * 3), { out, gain: 0.3 + k * 0.22, rate: r, prio: 2 });
    playBuf('body_hit', { out, gain: 0.22, rate: 0.7 * r });
  } else if (kind === 'ko') {
    // a non-lethal knockdown (knockfx3d.js): the body hitting the ground and
    // the cartoon "seeing stars" twinkle
    playBuf('body_fall', { out, gain: 0.25 + k * 0.2, rate: r });
    playBuf('dizzy', { out, gain: 0.16, rate: r, delay: 0.25 });
  } else if (kind === 'gore_splat') playBuf('gore_splat', { out, gain: 0.12 + k * 0.14, rate: r * (0.85 + Math.random() * 0.4) });
  else {
    playBuf('poof', { out, gain: 0.22 + k * 0.1, rate: r });
    playBuf('flutter', { out, gain: 0.16, rate: r * 1.2 });
  }
}

function playCritterEvent(kind, x, y, k) {
  const out = spatialOut(x, y, { ref: 3, rolloff: 1.3, range: 40, model: 'equalpower', h: 0.6 });
  if (!out) return;
  const r = 0.92 + Math.random() * 0.16;
  if (kind === 'coo') playBuf('pigeon', { out, gain: 0.12 + k * 0.12, rate: r });
  else if (kind === 'flap') playBuf('flutter', { out, gain: 0.08 + k * 0.14, rate: r * 1.1 });
  else if (kind === 'bonk') { playBuf('punch', { out, gain: 0.2 + k * 0.15, rate: 1.4 * r }); playTone({ freq: 700, freqEnd: 380, type: 'triangle', duration: 0.12, gain: 0.05, out }); }
  else if (kind === 'pala') { playBuf('punch', { out, gain: 0.12 + k * 0.12, rate: 1.9 * r }); playTone({ freq: 520, freqEnd: 300, type: 'triangle', duration: 0.08, gain: 0.05, out }); }
  else if (kind === 'padelglas') { playTone({ freq: 1500 * r, freqEnd: 900, type: 'triangle', duration: 0.1, gain: 0.05 + k * 0.08, out }); playNoiseBurst({ duration: 0.06, freq: 4200, freqEnd: 2600, q: 2, gain: 0.05 + k * 0.06, type: 'bandpass', out }); }
  else if (kind === 'padelgaas') playNoiseBurst({ duration: 0.14, freq: 1800, freqEnd: 700, q: 0.8, gain: 0.05 + k * 0.07, type: 'bandpass', out });
  else if (kind === 'poop') playNoiseBurst({ duration: 0.09, freq: 500, freqEnd: 180, q: 1.2, gain: 0.12, type: 'bandpass', out });
  else if (kind === 'splat') playBuf('step_wet_' + Math.floor(Math.random() * 4), { out, gain: 0.25 + k * 0.1, rate: 0.75 * r });
  else if (kind === 'plop') playTone({ freq: 700, freqEnd: 240, type: 'sine', duration: 0.07, gain: 0.08 + k * 0.08, out });
  else if (kind === 'caw') playBuf(Math.random() < 0.5 ? 'gull_0' : 'gull_1', { out, gain: 0.16 + k * 0.1, rate: r });
  else if (kind === 'peck') playTone({ freq: 2400, freqEnd: 1800, type: 'triangle', duration: 0.03, gain: 0.05 + k * 0.04, out });
}

// Keeps each voice on the same source while it stays among the nearest;
// a voice is only handed to a new source once it has faded out.
function assignVoices(voices, candidates) {
  const wanted = new Set(candidates);
  for (const voice of voices) if (voice.target && !wanted.has(voice.target)) voice.target = null;
  const taken = new Set();
  for (const voice of voices) if (voice.target) taken.add(voice.target);
  for (const c of candidates) {
    if (taken.has(c)) continue;
    const free = voices.find((voice) => !voice.target && voice.level < 0.005);
    if (!free) break;
    free.target = c;
    free.fresh = true;
    taken.add(c);
  }
}

function nearestSorted(items, range, max) {
  const list = [];
  for (const it of items) {
    const d = distToListener(it.x, it.y);
    if (d <= range) list.push({ it, d });
  }
  list.sort((a, b) => a.d - b.d);
  return list.slice(0, max).map((e) => e.it);
}

function fadeVoice(voice, target, dt, rate) {
  voice.level = voice.level || 0;
  voice.level += (target - voice.level) * Math.min(1, dt * rate);
  if (voice.level < 0.002 && target === 0) voice.level = 0;
  voice.gain.gain.setTargetAtTime(voice.level, ctx.currentTime, 0.04);
}

function placeVoice(voice, x, y, h = SOURCE_HEIGHT) {
  setPannerPos(voice.panner, x, y, h, !voice.fresh);
  voice.fresh = false;
}

function dopplerCents(src, svx, svy) {
  const dx = listenerPos.x - src.x, dy = listenerPos.z - src.y;
  const d = Math.hypot(dx, dy) || 1;
  const ux = dx / d, uy = dy / d;
  const vs = clamp(svx * ux + svy * uy, -60, 60);
  const vl = clamp(-(listenerVel.x * ux + listenerVel.y * uy), -60, 60);
  return 1200 * Math.log2((SPEED_OF_SOUND + vl) / (SPEED_OF_SOUND - vs));
}

function updateSiren(dt, world) {
  const chaseActive = world.wanted > 0;
  const intensity = clamp(world.wanted / 5, 0, 1);
  // ambulances on a call and a player-switched siren sound without a chase too
  const units = world.vehicles.filter((v) => !v.wrecked && !v.sinking &&
    (v.sirenOn || (chaseActive && v.isPolice && !v._mount && !v._commandeered && !v.hijacked && v.driver !== 'player')));
  const targetGain = chaseActive ? 0.18 + intensity * 0.22 : units.length ? 0.22 : 0;
  sirenState.gain += (targetGain - sirenState.gain) * Math.min(1, dt * 2.2);
  sirenBus.gain.value = sirenState.gain;

  assignVoices(sirenVoices, nearestSorted(units, MAX_DISTANCE, SIREN_VOICES));

  // Stepped hi-lo alternation, not a swept wail: hold each fixed pitch for
  // 0.5-0.7s (higher wanted level = faster alternation, still in range) and
  // step within ~30ms, like a two-tone horn, not a glide.
  const hold = SIREN_HOLD_MAX - intensity * (SIREN_HOLD_MAX - SIREN_HOLD_MIN);
  const t = ctx.currentTime;
  let audible = 0;
  for (const voice of sirenVoices) {
    const v = voice.target;
    fadeVoice(voice, v ? 1 : 0, dt, 3);
    if (v) {
      placeVoice(voice, v.x, v.y, 1.6);
      const cents = dopplerCents(v, Math.cos(v.angle) * v.speed, Math.sin(v.angle) * v.speed);
      voice.osc.detune.setTargetAtTime(cents, t, 0.1);
      audible = Math.max(audible, voice.level * inverseGain(distToListener(v.x, v.y, 1.6), 8, 0.9));
    }
    if (voice.level > 0 && t >= voice.nextToggle) {
      voice.toneHigh = !voice.toneHigh;
      voice.osc.frequency.setTargetAtTime(voice.toneHigh ? SIREN_HIGH_FREQ : SIREN_LOW_FREQ, t, 0.012);
      voice.nextToggle = t + hold;
    }
  }
  sirenAudible = sirenState.gain * audible;
}

function vehicleVoiceParams(v) {
  const s = Math.abs(v.speed);
  if (v.isBoat) return { type: 'sawtooth', freq: 28 + s * 7, cutoff: 240 + s * 40, gain: 0.1 + s * 0.02 };
  if (v.isScooter) return v.isPolice || v.model.moped ? { type: 'triangle', freq: 70 + s * 8, cutoff: 600 + s * 25, gain: 0.03 + s * 0.004 } : { type: 'triangle', freq: 260 + s * 70, cutoff: 2600, gain: s > 0.5 ? 0.02 + s * 0.004 : 0 };
  if (v.isBus) return { type: 'sawtooth', freq: 30 + s * 2.4, cutoff: 280 + s * 14, gain: 0.12 + s * 0.008 };
  return { type: 'sawtooth', freq: 40 + s * 3.2, cutoff: 300 + s * 16, gain: 0.06 + s * 0.009 };
}

function isEngineRunning(v) {
  if (v.wrecked || v.isBike || v.isHeli || v.parked || v.driver === 'player' || noMotor(v)) return false;
  if (Math.abs(v.speed) > 0.2) return true;
  // a driven car idles: city traffic, racers, and the Ommeland's road users (countrylife.js)
  return v.isBoat || v.racer || v.countryDrive || (!!v.road && !v.isHeroCar);
}

function updateTrafficAudio(dt, world) {
  const running = [];
  for (const v of world.vehicles) {
    if (isEngineRunning(v)) running.push(v);
    const horn = !!v.horn;
    if (horn && !hornWasOn.get(v) && v.driver !== 'player') {
      if (v._mount === 'horse') playWhinny(v.x, v.y);
      else if (v.isBike) playBell(v.x, v.y);
      else playHorn(v.x, v.y, 0.4, hornPitch(v));
    }
    hornWasOn.set(v, horn);
  }
  assignVoices(engineVoices, nearestSorted(running, ENGINE_RANGE, ENGINE_VOICES));
  const t = ctx.currentTime;
  if (synth.traffic) {
    const msg = [];
    engineVoices.forEach((voice, i) => {
      const v = voice.target;
      if (!v) {
        fadeVoice(voice, 0, dt, 4);
        msg.push({ i, gain: voice.level });
        return;
      }
      const p = trafficEngineParams(v, dt, voice.fresh);
      const pitch = Math.pow(2, clamp(dopplerCents(v, Math.cos(v.angle) * v.speed, Math.sin(v.angle) * v.speed), -250, 250) / 1200);
      placeVoice(voice, v.x, v.y, v.isBoat ? 0.5 : 0.7);
      const d = distToListener(v.x, v.y, 0.7);
      voice.distLp.frequency.setTargetAtTime(clamp(2400 / (1 + d / 10), 250, 2400), t, 0.15);
      const level = v.isBus ? 0.42 : v.isBoat ? 0.38 : v.isScooter ? (p.kind === 7 ? 0.16 * clamp(Math.abs(v.speed) / 2.5, 0, 1) : 0.18) : p.kind === 11 ? 0.12 * clamp(Math.abs(v.speed) / 2.5, 0, 1) : p.kind === 12 ? 0.42 + p.load * 0.12 : 0.28 + p.load * 0.1;
      fadeVoice(voice, level, dt, 3);
      msg.push({ i, kind: p.kind, rpm: p.rpm, load: p.load, gain: voice.level, pitch, snap: p.snap });
    });
    synthPost(synth.traffic, { type: 'p', v: msg });
  }
  for (const voice of synth.traffic ? [] : engineVoices) {
    const v = voice.target;
    if (!v) { fadeVoice(voice, 0, dt, 4); continue; }
    const p = vehicleVoiceParams(v);
    if (voice.osc.type !== p.type) voice.osc.type = p.type;
    voice.osc.frequency.setTargetAtTime(p.freq, t, voice.fresh ? 0.001 : 0.08);
    voice.filter.frequency.setTargetAtTime(p.cutoff, t, 0.08);
    placeVoice(voice, v.x, v.y, v.isBoat ? 0.5 : 0.7);
    fadeVoice(voice, Math.min(0.3, p.gain) * 0.6, dt, 4);
  }

  const heli = world.policeHeli;
  if (heli) setPannerPos(heliVoice.panner, heli.x, heli.y, heli.z ?? 30, true);
  heliVoice.gain.gain.setTargetAtTime(heli ? 0.35 : 0, t, 0.4);
}

function spatialAt(x, y, opts) {
  return spatialOut(x, y, opts || { ref: 5 });
}

function updateWorldEvents(world) {
  const p = world.player;

  for (const b of world.bullets) {
    if (seenBullets.has(b)) continue;
    seenBullets.add(b);
    // the player's own shots come as 'weapon' events (combat.js fireGun)
    if (b.owner === 'player') continue;
    const sp = Math.hypot(b.vx, b.vy) || 1;
    playGunshot(b.x - (b.vx / sp) * b.traveled, b.y - (b.vy / sp) * b.traveled, 'pistol');
  }

  let ricochets = 0;
  const splashes = [];
  for (const pt of world.particles) {
    if (seenParticles.has(pt)) continue;
    seenParticles.add(pt);
    if (pt.kind === 'spark' && ricochets < MAX_RICOCHETS_PER_FRAME) { ricochets++; playRicochet(pt.x, pt.y); }
    else if (pt.kind === 'splash') { splashes.push(pt); playSplash(pt.x, pt.y); }
  }

  const newlyDead = [];
  for (const ped of world.pedestrians) {
    if (ped.state !== 'dead' || seenDeadPeds.has(ped)) continue;
    seenDeadPeds.add(ped);
    newlyDead.push(ped);
  }

  if (!world.paused) updateContactAudio(world);
  const newlyWrecked = [];
  for (const v of world.vehicles) {
    if (!v.wrecked || seenWrecks.has(v)) continue;
    seenWrecks.add(v);
    newlyWrecked.push(v);
    if (!v.isBike && !v.isScooter && !splashes.some((s) => Math.hypot(s.x - v.x, s.y - v.y) < 3)) playExplosion(v.x, v.y);
  }

  const at = (src) => spatialAt((src || p).x, (src || p).y);
  if (world.stats.kills > prev.kills) {
    const out = at(newlyDead[0] || newlyWrecked[0]);
    if (out) playHit(out);
  }
  if (world.stats.copKills > prev.copKills) {
    const out = at(newlyDead.find((d) => d.isCop) || newlyWrecked.find((v) => v.isPolice));
    if (out) playCopSting(out);
  }
  if (world.stats.pedKills > prev.pedKills) {
    const out = at(newlyDead.find((d) => !d.isCop));
    if (out) playPedSting(out);
  }
}

function updateGMusic(dt, world) {
  musicHour = world.clock;
  if (!gmusicStarted) {
    // the theme song owns the music until it ends, then G-Music takes over
    if (isThemeActive()) return;
    if (gmusicTracks.length) startGmusicRandomly();
  } else if (gmusicPendingSince !== null) {
    if (nowSec() - gmusicPendingSince > GMUSIC_PENDING_TIMEOUT) gmusicPendingSince = null;
  } else {
    // Resume-only safety net (autoplay block, media-key pause, tab switch);
    // a broken file is skipped, an ended one is left to its 'ended' event.
    const el = gmusicCurrentEl;
    if (el && el.paused && !el.ended && !el.gmusicPlayInFlight && !gmusicSuspended && !gmusicHeld && nowSec() >= gmusicRetryAt) {
      if (el.error) advanceGmusicQueue();
      else playGmusicCurrent();
    }
  }

  if (pendingTrackAnnounce) {
    const night = radioProg.music === 'nachtstreek';
    world.nowPlaying = { title: pendingTrackAnnounce, artist: (night ? 'Rikus draait: ' : '') + trackArtist(pendingTrackAnnounce), station: STATION_NAME, programme: radioProg.name, at: world.time };
    pendingTrackAnnounce = null;
  }

  const scene = updateScenarioMusic(dt, world) || radioHolds();

  // Only spoken lines (the speech.js channel) dip the music, gently;
  // vehicles, sirens and stings never touch it. A scenario track fades
  // G-Music out and pauses it; it resumes where it was afterwards.
  const duck = speech.musicDuck();
  const ducked = duck > 0;
  const targetGain = scene ? 0 : GMUSIC_VOLUME + (GMUSIC_DUCK_VOLUME - GMUSIC_VOLUME) * duck;
  const lerpRate = scene ? dt * 1.8 : gmusicFadingIn || gmusicHeld ? dt * 0.8 : dt * (ducked ? 1.5 : 0.8);
  musicState.gain += (targetGain - musicState.gain) * Math.min(1, lerpRate);
  if (!Number.isFinite(musicState.gain)) musicState.gain = targetGain;
  const mv = getSettings().musicVolume;
  musicBus.gain.value = musicState.gain * (Number.isFinite(mv) ? mv : 1);
  if (gmusicFadingIn && Math.abs(targetGain - musicState.gain) < 0.02) gmusicFadingIn = false;
  if (scene && !gmusicHeld && musicState.gain < 0.02) {
    gmusicHeld = true;
    if (gmusicCurrentEl && !gmusicCurrentEl.paused) gmusicCurrentEl.pause();
  } else if (!scene && gmusicHeld) {
    gmusicHeld = false;
    gmusicRetryAt = 0;
    // switched off between two records (or in a break): on with the next one
    if (gmusicCurrentEl && gmusicCurrentEl.ended) { if (!inBreak) advanceGmusicQueue(); } else playGmusicCurrent();
  }
}

// --- scenario music -------------------------------------------------------

const scenarioDirector = createScenarioDirector();
const scenarioBuffers = {};
let scenarioVol = null;
let scenarioNow = null; // { key, src, fade }

function loadScenarioBuffer(key) {
  if (scenarioBuffers[key]) return;
  scenarioBuffers[key] = { loading: true };
  fetch(SCENARIO_TRACKS[key])
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
    .then((data) => ctx.decodeAudioData(data))
    .then((buf) => {
      const chans = [];
      for (let c = 0; c < buf.numberOfChannels; c++) chans.push(buf.getChannelData(c));
      scenarioBuffers[key] = { buf, loop: loopPoints(chans, buf.sampleRate) };
    })
    .catch((e) => { scenarioBuffers[key] = { failed: true }; console.warn('scenario music', key, e); });
}

function stopScenarioTrack() {
  const s = scenarioNow;
  scenarioNow = null;
  if (!s) return;
  const t = ctx.currentTime;
  s.fade.gain.cancelScheduledValues(t);
  s.fade.gain.setValueAtTime(s.fade.gain.value, t);
  s.fade.gain.linearRampToValueAtTime(0, t + SCENARIO_FADE_OUT);
  try { s.src.stop(t + SCENARIO_FADE_OUT + 0.05); } catch (e) { /* already stopped */ }
  s.src.onended = () => s.fade.disconnect();
}

function startScenarioTrack(key) {
  const entry = scenarioBuffers[key];
  if (!entry || !entry.buf) return false;
  if (!scenarioVol) {
    scenarioVol = ctx.createGain();
    scenarioVol.connect(musicOut);
  }
  const src = ctx.createBufferSource();
  src.buffer = entry.buf;
  src.loop = true;
  src.loopStart = entry.loop.start;
  src.loopEnd = entry.loop.end;
  const fade = ctx.createGain();
  const t = ctx.currentTime;
  fade.gain.setValueAtTime(0, t);
  fade.gain.linearRampToValueAtTime(1, t + SCENARIO_FADE_IN);
  src.connect(fade).connect(scenarioVol);
  src.start(t, entry.loop.start);
  scenarioNow = { key, src, fade };
  return true;
}

// Returns the scenario key while one is (starting to) play, else null.
function updateScenarioMusic(dt, world) {
  const m = world.mission;
  const race = !!(m && m.phase === 'active' && m.raceMusic);
  const chasing = world.wanted > 0 && !(world.police && world.police.searching) && !world.pendingRespawn;
  let want = scenarioDirector.update(dt, { race, chasing });
  if (want) loadScenarioBuffer(want);
  const cur = scenarioNow ? scenarioNow.key : null;
  if (want !== cur) {
    // switch once the new loop is decoded; until then the old one keeps going
    if (!want) stopScenarioTrack();
    else if (scenarioBuffers[want].buf) { stopScenarioTrack(); startScenarioTrack(want); }
    else if (scenarioBuffers[want].failed) want = null;
  }
  if (scenarioVol) scenarioVol.gain.value = SCENARIO_VOLUME * getSettings().musicVolume;
  return want && scenarioBuffers[want] && !scenarioBuffers[want].failed ? want : null;
}

let lastDeathAt = -Infinity;

export function updateAudio(dt, world) {
  const events = world.audioEvents || (world.audioEvents = []);
  if (!ctx || !worldReady) { events.length = 0; return; }
  lastWorld = world;
  // a busy frame (shots, footsteps, birds) used to swallow everything past the
  // first eight (rockets, the jachtgeweer): the rest now plays next frame
  guarded('linkups', () => runLinkups(world));
  let played = events.length;
  if (!muted) guarded('events', () => { played = playAudioEvents(world); });
  events.splice(0, played);
  if (events.length > MAX_EVENTS_PER_FRAME * 3) events.splice(0, events.length - MAX_EVENTS_PER_FRAME * 3);
  if (ctx.state !== 'running') resumeCtx('frame');

  if (!menuAudio && world.input.wasPressed('u')) {
    muted = !muted;
    saveMuted();
    applyOutputGains(0.05);
    world.addMessage(muted ? 'Geluid uit' : 'Geluid aan', 1.5, { key: 'mute' });
  }

  speech.tick();
  guarded('watchdog', () => watchdog(world));
  if (worldIn) {
    const hz = world.menuMuffle ? MENU_MUFFLE_HZ : 20000;
    if (Math.abs(worldIn.frequency.value - hz) > 50) worldIn.frequency.setTargetAtTime(hz, ctx.currentTime, 0.06);
  }
  const lpHz = musicLowpassHz(world);
  if (musicLp && Math.abs(musicLp.frequency.value - lpHz) > 50) musicLp.frequency.setTargetAtTime(lpHz, ctx.currentTime, 0.4);
  // one failing subsystem (a NaN into an AudioParam throws) must not stop
  // the music and ducking updates further down
  guarded('world', () => updateWorldAudio(dt, world));
  guarded('ducking', () => updateDucking(dt));
  if (bank.pending() === 0 && warmList.length) bank.warm([warmList.pop()]);
  if (!menuAudio) guarded('gmusic', () => updateGMusic(dt, world));
}

function updateWorldAudio(dt, world) {
  updateListener(world);
  updateWorldEvents(world);
  const pickupOut = () => spatialAt(world.player.x, world.player.y);
  if (world.health < prev.health) playPlayerHurt();
  if (world.armor > prev.armor) { const o = pickupOut(); if (o) playArmorUp(o); }
  else if (world.armor < prev.armor) playArmorDown();
  if (world.money > prev.money) { const o = pickupOut(); if (o) playCashChime(o); }
  if (world.weapon !== prev.weapon) playSwitchClick();

  const missionPhase = world.mission ? world.mission.phase : null;
  if (missionPhase === 'active' && prev.missionPhase !== 'active') {
    playMissionJingle();
    playVoiceline(world.player.character, 'missie_gestart');
  }

  for (const m of world.messages) {
    if (seenMessages.has(m)) continue;
    seenMessages.add(m);
    if (m.text === 'DOOD' || m.text === 'OPGEPAKT') {
      lastDeathAt = world.time;
      playDeathSting();
      if (m.text === 'OPGEPAKT') {
        playVoiceline(world.player.character, 'opgepakt');
        const cop = nearestPoliceSource(world);
        if (cop && cop.d < SPEECH_RANGE) playPoliceBark('aangehouden', cop.x, cop.y);
        else playPoliceBark('aangehouden');
      }
    } else if (m.text.indexOf('geklaard!') !== -1) {
      playMissionJingle();
      playVoiceline(world.player.character, 'missie_gelukt');
    } else if (m.text.indexOf('mislukt') !== -1) {
      // a mission failed by dying/arrest already got the death voiceline
      if (world.time - lastDeathAt < 3) continue;
      playVoiceline(world.player.character, 'missie_mislukt');
    } else if (m.text.endsWith('munitie')) {
      playVoiceline(world.player.character, 'wapen_opgepakt');
    } else if (m.text.startsWith('+ €')) {
      playVoiceline(world.player.character, 'geld_opgepakt');
    } else if (m.text.startsWith('Kusje voor')) {
      playVoiceline(world.companion ? world.companion.character : null, 'kus');
    } else if (m.text === 'Nat geworden!') {
      playVoiceline(world.player.character, 'water_panic');
    }
  }

  if (world.wanted > 0 && prev.wanted === 0) {
    if (!scenarioNow) enqueueGmusicJingle('hoge_wanted');
    chaseBarkDeadline = world.time + CHASE_BARK_WAIT;
  }
  updateChaseBark(world);
  prev.wanted = world.wanted;
  prev.kills = world.stats.kills;
  prev.copKills = world.stats.copKills;
  prev.pedKills = world.stats.pedKills;
  prev.health = world.health;
  prev.armor = world.armor;
  prev.money = world.money;
  prev.weapon = world.weapon;
  prev.missionPhase = missionPhase;

  updateEngine(dt, world);
  updatePaddling(dt, world);
  updateSailing(dt, world);
  updateSqueal(dt, world);
  updateRumble(dt, world);
  updateScrape(dt, world);
  updatePlayerHorn(world);
  updateSiren(dt, world);
  updateTrafficAudio(dt, world);
  updateAmbience(dt, world);
  updateFoley(dt, world);
  updateSkySfx(dt, world, kit);
  updateUiSfx(dt, world);
}

const guardFails = {};
function guarded(name, fn) {
  try { fn(); } catch (e) {
    const n = (guardFails[name] = (guardFails[name] || 0) + 1);
    if (n === 1 || n % 600 === 0) { console.warn('audio', name, e); logAudio('throw', { where: name, msg: String(e && e.message) }); }
  }
}

// drunk.js only updates its level while gameplay runs; tie the muffle to
// world.drunk too so a sober (or respawned) player never keeps it
const MENU_MUFFLE_HZ = 750;
const MENU_MUSIC_HZ = 1400;

function musicLowpassHz(world) {
  const lvl = world.drunk > 0 ? drunkLevel() : 0;
  let hz = Number.isFinite(lvl) ? 20000 * Math.pow(0.045, clamp(lvl, 0, 1)) : 20000;
  // G-Music keeps playing, softly, behind the unfolded phone
  if (world.menuMuffle) hz = Math.min(hz, MENU_MUSIC_HZ);
  return radioProg.music === 'nachtstreek' ? Math.min(hz, 3400) : hz;
}

function applyOutputGains(tc) {
  const t = ctx.currentTime;
  for (const node of [master, musicOut]) {
    if (!node) continue;
    node.gain.cancelScheduledValues(t);
    node.gain.setTargetAtTime(muted ? 0 : masterLevel(), t, tc);
  }
}

// --- watchdog ---------------------------------------------------------------
// Every WATCHDOG_S: drops voice holds nobody owns any more (speech.sweep),
// resumes a stopped context, puts the output and music gains back where the
// mute/settings say, lifts a stale muffle or scenario hold on G-Music,
// replaces a dead music element and notices a NaN in the mix.
const WATCHDOG_S = 2;
let watchdogAt = 0;
const musicWatch = createMusicWatch();
const watch = { runs: 0, fixes: 0, nan: 0, lastFix: null };
let meterBuf = null;

function fix(what) {
  watch.fixes++;
  watch.lastFix = what;
  logAudio('fix', { what });
}

function watchdog(world, force = false) {
  const now = nowSec();
  if (!force && now < watchdogAt) return;
  watchdogAt = now + WATCHDOG_S;
  watch.runs++;
  const freed = speech.sweep();
  if (freed.length) fix('hold:' + freed.join(','));
  if (!document.hidden && ctx.state !== 'running') { if (gmusicSuspended) gmusicSuspended = false; resumeCtx('watchdog'); }
  if (!document.hidden && gmusicSuspended) { gmusicSuspended = false; gmusicRetryAt = 0; fix('gmusic-suspended'); }
  const want = muted ? 0 : masterLevel();
  if (master && Math.abs(master.gain.value - want) > 0.02 && ctx.state === 'running') { applyOutputGains(0.1); fix('master-gain'); }
  else if (musicOut && Math.abs(musicOut.gain.value - want) > 0.02 && ctx.state === 'running') { applyOutputGains(0.1); fix('music-gain'); }
  if (!Number.isFinite(musicState.gain)) { musicState.gain = 0; fix('music-nan'); }
  if (musicLp && musicLowpassHz(world) >= 19999 && musicLp.frequency.value < 15000 && !(world.drunk > 0)) {
    musicLp.frequency.cancelScheduledValues(ctx.currentTime);
    musicLp.frequency.setTargetAtTime(20000, ctx.currentTime, 0.3);
    fix('lowpass');
  }
  if (gmusicHeld && !scenarioNow && !radioHolds()) { gmusicHeld = false; gmusicRetryAt = 0; playGmusicCurrent(); fix('gmusic-held'); }
  const el = gmusicCurrentEl;
  if (el && el.error && gmusicPendingSince === null) { reviveGmusicEl(el); fix('gmusic-dead'); }
  // silence while the radio should play: nudge, then the next record
  const mw = musicWatch.step(now, {
    active: gmusicStarted && radioOn && !gmusicHeld && !gmusicSuspended && gmusicPendingSince === null && !document.hidden && gmusicTracks.length > 0,
    hasEl: !!gmusicCurrentEl, ended: !!(gmusicCurrentEl && gmusicCurrentEl.ended),
    currentTime: gmusicCurrentEl ? gmusicCurrentEl.currentTime : 0, inBreak,
  });
  if (mw === 'resume') {
    if (gmusicCurrentEl) gmusicCurrentEl.gmusicPlayInFlight = false;
    gmusicRetryAt = 0; resumeCtx('musicwatch'); playGmusicCurrent(); fix('music-resume');
  } else if (mw === 'advance') {
    gmusicRetryAt = 0; resumeCtx('musicwatch'); advanceGmusicQueue(); fix('music-advance');
  } else if (mw === 'endBreak') {
    inBreak = false; breakId++; advanceGmusicQueue(); fix('music-break');
  }
  if (meter) {
    if (!meterBuf) meterBuf = new Float32Array(meter.fftSize);
    meter.getFloatTimeDomainData(meterBuf);
    if (meterBuf.some((x) => !Number.isFinite(x))) { watch.nan++; fix('nan'); resetSynth(); }
  }
}

// A music element that failed (network hiccup, decoder gone) is swapped for
// a fresh one on the same file, so the station keeps going.
function reviveGmusicEl(el) {
  const fresh = wireGmusicEl(new Audio(el.src));
  fresh.preload = 'auto';
  fresh.gmusicTitle = el.gmusicTitle;
  fresh.gmusicJingleKey = el.gmusicJingleKey;
  fresh.gmusicTrack = el.gmusicTrack;
  const i = gmusicTracks.indexOf(el);
  if (i >= 0) gmusicTracks[i] = fresh;
  if (el.gmusicJingleKey && jingleEls[el.gmusicJingleKey] === el) jingleEls[el.gmusicJingleKey] = fresh;
  try { el.removeAttribute('src'); el.load(); } catch (e) { /* ignore */ }
  gmusicCurrentEl = fresh;
  gmusicRetryAt = 0;
  advanceGmusicQueue();
}

// The engine synth is the only hand-written DSP: if the mix ever turns NaN,
// cut it loose (the classic engine voices take over) instead of staying silent.
function resetSynth() {
  for (const k of ['player', 'traffic']) {
    const n = synth[k];
    if (!n) continue;
    try { n.disconnect(); } catch (e) { /* ignore */ }
    synth[k] = null;
  }
}

function audioState() {
  if (!ctx) return { ctx: null, silentMode: SILENT_MODE, graphTest: GRAPH_TEST };
  const r3 = (x) => +(+x).toFixed(3);
  return {
    ctx: ctx.state, time: r3(ctx.currentTime), hidden: document.hidden, graphTest: GRAPH_TEST, muted,
    master: r3(master.gain.value), musicOut: r3(musicOut.gain.value), musicBus: r3(musicBus.gain.value),
    musicTarget: r3(musicState.gain), lowpass: Math.round(musicLp.frequency.value), ambience: r3(ambBus.gain.value),
    ambDuck: r3(duckState.level), musicDuck: speech.musicDuck(),
    gmusic: {
      started: gmusicStarted, held: gmusicHeld, suspended: gmusicSuspended, pending: gmusicPendingSince !== null,
      current: gmusicCurrentEl ? (gmusicCurrentEl.gmusicTitle || gmusicCurrentEl.gmusicJingleKey || '?') : null,
      paused: gmusicCurrentEl ? gmusicCurrentEl.paused : null, error: !!(gmusicCurrentEl && gmusicCurrentEl.error),
      tracks: gmusicTracks.length, queue: gmusicQueue.length, history: gmusicHistory.slice(-8),
    },
    scenario: scenarioNow ? scenarioNow.key : null, storyScene, sceneLive: storyProbe ? !!storyProbe() : null, voiceEls: liveVoiceEls, activeVoices,
    synth: !!synth.player, speech: speech.speechState(), watchdog: { ...watch }, log: audioLog.slice(-12),
  };
}

if (typeof window !== 'undefined') {
  window.__audio = {
    state: audioState,
    // runs the watchdog now (tests; the game runs it every WATCHDOG_S)
    heal: () => { if (ctx && lastWorld) watchdog(lastWorld, true); return audioState(); },
    speech,
    setStoryScene: (on) => setStoryScene(on),
    // tests: break one thing on purpose, the watchdog must repair it
    poke: (what) => {
      if (!ctx) return false;
      const t = ctx.currentTime;
      if (what === 'master') { master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(0, t); } else if (what === 'music') { musicOut.gain.cancelScheduledValues(t); musicOut.gain.setValueAtTime(0, t); } else if (what === 'lowpass') { musicLp.frequency.cancelScheduledValues(t); musicLp.frequency.setValueAtTime(300, t); } else if (what === 'suspend') ctx.suspend(); else if (what === 'held') gmusicHeld = true; else if (what === 'gmusic') gmusicSuspended = true; else return false;
      return true;
    },
  };
}
let lastWorld = null;

// What sfx/linkups.js watches (set once by main.js): bridges, trains and the listener.
const linkups = createLinkups();
let linkEnv = null;
export function setSfxLinks(env) { linkEnv = env; }
function runLinkups(world) {
  if (!linkEnv || world.paused) return;
  const q = world.audioEvents;
  for (const e of linkups.step(world, { ...linkEnv, listener: () => world.player })) if (q.length < 64) q.push({ ...e });
}

const warmList = ['glass', 'crunch_0', 'crunch_1', 'crunch_2', 'bikebell', 'ric_whine', 'prop_metal', 'bell_big', 'bell_carillon', 'thunder_0', 'thunder_1', 'thunder_2', 'bird_0', 'bird_1', 'bird_2', 'bird_3', 'bird_4',
  'gull_0', 'gull_1', 'clink', 'cow', 'sheep', 'duck', 'pigeon', 'flutter', 'dog', 'cat', 'step_gras_2', 'step_gras_3', 'step_wood_2', 'step_wood_3', 'step_wet_2', 'step_wet_3', 'poof', 'dizzy', 'gore_splat', 'squelch_2', 'squelch_1', 'squelch_0',
  'imp_water', 'imp_wood', 'imp_dirt', 'imp_metal_2', 'imp_metal_1', 'imp_metal_0', 'imp_stone_2', 'imp_stone_1', 'imp_stone_0',
  'gun_echo', 'gun_shotgun_1', 'gun_shotgun_0', 'gun_uzi_2', 'gun_uzi_1', 'gun_uzi_0', 'gun_pistol_2', 'gun_pistol_1', 'gun_pistol_0'];

