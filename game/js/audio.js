import { clamp } from './util.js';
import { getCamera } from './scene3d.js';
import { getSettings, onSettingsChange } from './settings.js';
import { isThemeActive } from './theme.js';
import { vehicleContacts } from './vehicle.js';
import { createBank, buildImpulse } from './sfx/dsp.js';
import { initAmbience, updateAmbience, ambienceStats } from './sfx/ambience.js';
import { initFoley, updateFoley, propHit, foleyStats } from './sfx/foley.js';
import { initUiSfx, uiWorldInit, updateUiSfx, uiDomEvent, isUiGestureTarget } from './sfx/ui.js';

const MASTER_VOLUME = 0.55;
const MAX_DISTANCE = 120;
const SOURCE_HEIGHT = 1;
const SPEED_OF_SOUND = 343;
const ENGINE_VOICES = 6;
const ENGINE_RANGE = 70;
const SIREN_VOICES = 3;
const SPEECH_RANGE = 45;
const GMUSIC_MANIFEST_URL = './audio/gmusic/manifest.json';
const GMUSIC_VOLUME = 0.5;
const GMUSIC_DUCK_VOLUME = 0.2;
const SIREN_LOW_FREQ = 440;
const SIREN_HIGH_FREQ = 587;
const SIREN_HOLD_MIN = 0.5;
const SIREN_HOLD_MAX = 0.7;

// Pre-recorded TTS voicelines - Tammo/Anita only, never reused by NPCs/
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

// NPC ambient chatter, police barks, Sikkom phone-feed lines - each key has
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
for (const k of SIKKOM_AUDIO_KEYS) SIKKOM_AUDIO[k] = [0, 1].map((v) => `./audio/sikkom/${k}_v${v}.wav`);

let ctx = null;
let master = null;
let sfxBus = null;
let worldBus = null;
let engineBus = null;
let sirenBus = null;
let musicBus = null;
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
const duckState = { amount: 0, until: 0, level: 0, musicUntil: 0 };

function duckAmbience(amount, hold) {
  if (!ctx) return;
  const t = ctx.currentTime;
  if (t > duckState.until) duckState.amount = 0;
  duckState.amount = Math.max(duckState.amount, amount);
  duckState.until = Math.max(duckState.until, t + hold);
}

function duckMusic(hold) {
  if (ctx) duckState.musicUntil = Math.max(duckState.musicUntil, ctx.currentTime + hold);
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
  send.connect(canyon).connect(canyonGain).connect(worldBus);
  send.connect(open).connect(openGain).connect(worldBus);
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

const MUTE_STORAGE_KEY = 'gte-muted';
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
const engineState = { freq: 42, gain: 0, gear: 0, shiftUntil: 0, startAt: 0, vehicle: null, kind: 0, startDelay: -1, prevThr: 0, blipUntil: 0, limiter: 0 };
const sirenState = { gain: 0 };
const musicState = { gain: GMUSIC_VOLUME };

function nowSec() {
  return performance.now() / 1000;
}

function masterLevel() {
  return MASTER_VOLUME * getSettings().masterVolume;
}

onSettingsChange((st) => {
  if (!ctx) return;
  if (master && !muted) master.gain.setTargetAtTime(masterLevel(), ctx.currentTime, 0.05);
  if (worldBus) worldBus.gain.setTargetAtTime(st.sfxVolume, ctx.currentTime, 0.05);
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
  const panner = makePanner(opts);
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
  filter.type = 'bandpass';
  filter.frequency.value = 1100;
  filter.Q.value = 0.45;

  const osc = ctx.createOscillator();
  osc.setPeriodicWave(sirenTone());
  osc.frequency.value = SIREN_LOW_FREQ;

  const gain = ctx.createGain();
  gain.gain.value = 0;
  const level = ctx.createGain();
  level.gain.value = 0.55;
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
  const player = new AudioWorkletNode(ctx, 'gte-engine', {
    numberOfInputs: 0, numberOfOutputs: 2, outputChannelCount: [1, 1], processorOptions: { voices: 1, road: true },
  });
  const traffic = new AudioWorkletNode(ctx, 'gte-engine', {
    numberOfInputs: 0, numberOfOutputs: ENGINE_VOICES, outputChannelCount: Array(ENGINE_VOICES).fill(1),
    processorOptions: { voices: ENGINE_VOICES, running: true },
  });
  engine.osc1.stop(); engine.osc2.stop(); engine.filter.disconnect();
  engineBus.gain.cancelScheduledValues(ctx.currentTime);
  engineBus.gain.value = 1;
  player.connect(engineBus, 0);
  const roadGain = ctx.createGain();
  player.connect(roadGain, 1);
  roadGain.connect(worldBus);
  rumbleVoice.gain.gain.cancelScheduledValues(ctx.currentTime);
  rumbleVoice.gain.gain.value = 0;
  engineVoices.forEach((voice, i) => { voice.osc.stop(); voice.gain.disconnect(); traffic.connect(voice.panner, i); });
  engineState.vehicle = null;
  synth = { player, traffic };
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
    for (let k = 1; k < n; k++) im[k] = k % 2 ? Math.pow(k, -1.1) : 0.18 / k;
    sirenWave = ctx.createPeriodicWave(re, im);
  }
  return sirenWave;
}

// Continuous metal-on-metal/stone grind while a vehicle slides along a wall
// or another car; fed by collision contacts, fades once they stop.
function buildScrapeVoice() {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 1600;
  band.Q.value = 2.5;
  const ring = ctx.createBiquadFilter();
  ring.type = 'bandpass';
  ring.frequency.value = 3400;
  ring.Q.value = 14;
  const ringGain = ctx.createGain();
  ringGain.gain.value = 2.2;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  const panner = makePanner({ ref: 5, rolloff: 1.1, model: 'equalpower' });
  src.connect(band).connect(gain);
  src.connect(ring).connect(ringGain).connect(gain);
  gain.connect(panner).connect(sfxBus);
  src.start();
  return { band, ring, gain, panner, level: 0, target: 0, until: 0, fresh: true };
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

function playGunshot(x, y, weapon) {
  const out = spatialOut(x, y, { ref: 8, rolloff: 0.8 });
  if (!out) return;
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
  duckMusic(1.2);
  playNoiseBurst({ duration: 1.1, freq: 1400, freqEnd: 70, q: 0.5, gain: 0.85, type: 'lowpass', out, prio: 2 });
  playTone({ freq: 90, freqEnd: 28, type: 'sine', duration: 0.9, gain: 0.55, out, prio: 2 });
  playNoiseBurst({ duration: 1.7, freq: 500, freqEnd: 60, q: 0.6, gain: 0.25, type: 'lowpass', delay: 0.2, out, prio: 2 });
  playBuf('glass', { out, gain: 0.2, rate: 0.8, delay: 0.03 });
  for (let i = 0; i < 5; i++) playBuf('prop_metal', { out, gain: 0.05, rate: 0.6 + Math.random() * 0.8, delay: 0.5 + Math.random() * 1.4 });
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

function playScrape(x, y, slide) {
  const out = spatialOut(x, y, { ref: 5, rolloff: 1.1, range: 60 });
  if (!out) return;
  const k = clamp(slide / 12, 0.2, 1);
  const f = 1400 + Math.random() * 1600;
  playNoiseBurst({ duration: 0.16, freq: f, freqEnd: f * 0.8, q: 3.5, gain: 0.12 + k * 0.18, type: 'bandpass', out });
  playTone({ freq: 700 + Math.random() * 500, freqEnd: 600, type: 'sawtooth', duration: 0.12, gain: 0.025 * k, filterFreq: 2400, out });
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

function playSplash(x, y) {
  const out = spatialOut(x, y, { ref: 6, rolloff: 1, range: 80 });
  if (!out) return;
  playNoiseBurst({ duration: 0.7, freq: 1600, freqEnd: 220, q: 0.5, gain: 0.5, type: 'lowpass', out });
}

// Gearbox clunk and clutch thump; the engine note itself does the rest.
function playGearClunk(heavy) {
  playNoiseBurst({ duration: 0.035, freq: heavy ? 900 : 1300, q: 2.5, gain: heavy ? 0.05 : 0.035, type: 'bandpass', bus: engineBus, prio: 0 });
  playTone({ freq: heavy ? 70 : 110, freqEnd: 50, type: 'sine', duration: 0.07, gain: 0.05, bus: engineBus, prio: 0 });
}

// Two slightly detuned horn discs; low < 1 for vans/buses, boats honk deep.
function playHorn(x, y, duration = 0.4, low = 1) {
  const out = spatialOut(x, y, { ref: 6, rolloff: 1, range: 90 });
  if (!out) return;
  const d = 1 + (Math.random() - 0.5) * 0.04;
  playTone({ freq: 415 * low * d, type: 'horn', duration, gain: 0.075, filterFreq: 2600, out });
  playTone({ freq: 523 * low * d * 1.004, type: 'horn', duration, gain: 0.06, filterFreq: 2600, out });
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
  duckMusic(2);
  duckAmbience(0.6, 2.5);
  playTone({ freq: 220, freqEnd: 55, type: 'sawtooth', duration: 0.5, gain: 0.35, filterFreq: 1200 });
  playTone({ freq: 165, freqEnd: 45, type: 'sawtooth', duration: 0.55, gain: 0.3, delay: 0.04, filterFreq: 900 });
  playNoiseBurst({ duration: 0.3, freq: 700, freqEnd: 150, q: 0.6, gain: 0.3 });
}

function playMissionJingle() {
  duckMusic(1.4);
  const notes = [523.25, 659.25, 784, 1046.5];
  notes.forEach((f, i) => playTone({ freq: f, type: 'triangle', duration: 0.16, gain: 0.24, delay: i * 0.09 }));
}

// One-shot playback for the pre-recorded voicelines/jingles above - routed
// through sfxBus (not its own bus) since these are conceptually just
// another kind of one-shot sound effect, same as every playX() above,
// just sourced from a real audio file instead of a synthesized oscillator.
// A missing/unplayable file (network hiccup, or an asymmetric-script key
// with no recording for this character) fails silently, never throws.
// pos = {x, y} places the clip in the world; omitted = plain stereo.
function playClip(src, pos = null) {
  if (!ctx || muted) return;
  const el = new Audio(src);
  const nodes = [];
  try {
    const node = ctx.createMediaElementSource(el);
    nodes.push(node);
    if (pos) {
      const panner = makePanner({ ref: 4, rolloff: 1.2 });
      setPannerPos(panner, pos.x, pos.y, pos.h ?? 1.6);
      node.connect(panner).connect(sfxBus);
      nodes.push(panner);
    } else {
      node.connect(sfxBus);
    }
  } catch (e) {
    // ignore - playback still works without the Web Audio graph attached
  }
  const cleanup = () => { for (const n of nodes) n.disconnect(); nodes.length = 0; };
  el.addEventListener('ended', cleanup, { once: true });
  el.addEventListener('error', cleanup, { once: true });
  el.play().catch(cleanup);
}

// Voicelines/police/Sikkom - the "important", event-driven spoken lines -
// share one global cooldown so simultaneous triggers (walking through a
// cluster of pickups) can't stack into overlapping voices. Returns whether
// it actually played, so callers that only want a visual (e.g. a speech
// bubble) to show up TOGETHER with real audio can check first.
const SPOKEN_MIN_GAP = 1.4;
let lastSpokenAt = -Infinity;

function playSpokenClip(src, pos = null) {
  if (!ctx) return false;
  const now = ctx.currentTime;
  if (now - lastSpokenAt < SPOKEN_MIN_GAP) return false;
  lastSpokenAt = now;
  playClip(src, pos);
  duckAmbience(0.45, 2.2);
  duckMusic(2.2);
  return true;
}

// NPC ambient chatter gets its OWN, much longer cooldown, entirely separate
// from the one above - with up to ~45 pedestrians nearby, sharing a single
// short cooldown with real gameplay events (money/weapon pickups, mission
// beats, busted) let ambient chatter starve out the lines that actually
// matter. Per explicit feedback ("nog steeds veel te veel en te vaak") this
// is deliberately strict.
const NPC_SPOKEN_MIN_GAP = 14;
let lastNpcSpokenAt = -Infinity;

function playNpcSpokenClip(src, pos) {
  if (!ctx) return false;
  const now = ctx.currentTime;
  if (now - lastNpcSpokenAt < NPC_SPOKEN_MIN_GAP) return false;
  lastNpcSpokenAt = now;
  playClip(src, pos);
  return true;
}

// Mission story cutscene dialogue: one line at a time, straight into the
// world bus (no reverb). While a story scene runs, the generic mission
// voicelines stay quiet so they don't talk over it.
let storyScene = false;
let storyVoice = null;

export function setStoryScene(on) {
  storyScene = on;
  if (!on) stopStoryVoice();
}

export function stopStoryVoice() {
  const v = storyVoice;
  storyVoice = null;
  if (!v) return;
  v.el.pause();
  if (v.node) v.node.disconnect();
}

export function playStoryVoice(src) {
  stopStoryVoice();
  if (!ctx || muted) return;
  const v = { el: new Audio(src), node: null };
  try {
    v.node = ctx.createMediaElementSource(v.el);
    v.node.connect(worldBus);
  } catch (e) {
    // ignore - plays without the Web Audio graph
  }
  storyVoice = v;
  const done = () => { if (storyVoice === v) stopStoryVoice(); };
  v.el.addEventListener('ended', done, { once: true });
  v.el.addEventListener('error', done, { once: true });
  v.el.addEventListener('loadedmetadata', () => {
    const hold = (Number.isFinite(v.el.duration) ? v.el.duration : 3) + 0.4;
    duckAmbience(0.5, hold);
    duckMusic(hold);
  }, { once: true });
  v.el.play().catch(done);
}

function playVoiceline(character, key) {
  if (storyScene) return false;
  const paths = (character === 'anita' ? ANITA_LINES : TAMMO_LINES)[key];
  if (!paths || !paths.length) return false;
  return playSpokenClip(paths[Math.floor(Math.random() * paths.length)]);
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

export function playSikkomLine(key) {
  playRandomVariant(SIKKOM_AUDIO[key]);
}

// Fire-and-forget: initAudio() stays sync, this just fills in gmusicTracks
// whenever the manifest resolves. An empty or missing manifest leaves it
// empty, which every playback path below treats as "nothing to play".
async function loadGMusicManifest() {
  try {
    const res = await fetch(GMUSIC_MANIFEST_URL);
    if (!res.ok) return;
    const data = await res.json();
    const tracks = Array.isArray(data.tracks) ? data.tracks : [];
    gmusicTracks = tracks.map((filename) => {
      const el = wireGmusicEl(new Audio('./audio/gmusic/' + filename));
      el.preload = 'auto';
      el.gmusicTitle = filename.replace(/\.[^.]+$/, '').replace(/_/g, ' ');
      return el;
    });
  } catch (e) {
    // no manifest yet / bad JSON / fetch blocked - G-Music just stays silent
  }
}

// Station-style playback: jingle, 2 shuffled tracks, jingle, ... all through
// ONE queue and ONE current element, so two items can never play at once.
// Every event handler ignores events from anything but gmusicCurrentEl, and
// the per-frame safety net in updateGMusic only ever resumes the current
// element - advancing happens exclusively via its 'ended' event.
const GMUSIC_RETRY_MIN = 0.5;
const GMUSIC_RETRY_MAX = 8;
const GMUSIC_PENDING_TIMEOUT = 5;

let gmusicTracks = [];
let gmusicBag = [];
let gmusicLastTrack = null;
let gmusicQueue = [];
let gmusicCurrentEl = null;
let gmusicStarted = false;
let gmusicFadingIn = false;
let gmusicPendingSince = null;
let gmusicSuspended = false;
let gmusicRetryAt = 0;
let gmusicRetryDelay = GMUSIC_RETRY_MIN;
let gmusicAnnounceOnPlay = false;
// Set once a genuine track (not a jingle) is actually playing; updateGMusic
// flushes it into a HUD toast since it runs every frame with `world` in scope.
let pendingTrackAnnounce = null;

function wireGmusicEl(el) {
  try { ctx.createMediaElementSource(el).connect(musicBus); } catch (e) { /* ignore */ }
  el.addEventListener('ended', onGmusicEnded);
  el.addEventListener('playing', onGmusicPlaying);
  return el;
}

function makeJingleEl(key) {
  const el = wireGmusicEl(new Audio(GMUSIC_JINGLES[key]));
  el.gmusicJingleKey = key;
  return el;
}

function randomAmbientJingleEl() {
  return makeJingleEl(AMBIENT_JINGLE_KEYS[Math.floor(Math.random() * AMBIENT_JINGLE_KEYS.length)]);
}

function nextTrackEl() {
  if (!gmusicBag.length) {
    gmusicBag = gmusicTracks.slice();
    for (let i = gmusicBag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [gmusicBag[i], gmusicBag[j]] = [gmusicBag[j], gmusicBag[i]];
    }
    const last = gmusicBag.length - 1;
    if (last > 0 && gmusicBag[last] === gmusicLastTrack) [gmusicBag[0], gmusicBag[last]] = [gmusicBag[last], gmusicBag[0]];
  }
  gmusicLastTrack = gmusicBag.pop();
  return gmusicLastTrack;
}

function buildGmusicCycle() {
  return [randomAmbientJingleEl(), nextTrackEl(), nextTrackEl()];
}

function onGmusicEnded(e) {
  if (e.target !== gmusicCurrentEl) return;
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
  if (!el || el.gmusicPlayInFlight || gmusicSuspended) return;
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

  const startAsJingle = Math.random() < 0.25;
  const el = startAsJingle ? randomAmbientJingleEl() : nextTrackEl();
  gmusicQueue = buildGmusicCycle();
  if (startAsJingle) gmusicQueue.shift();
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
  if (!gmusicStarted) return;
  const next = gmusicQueue[0];
  if (next && next.gmusicJingleKey === key) return;
  const el = makeJingleEl(key);
  if (next && next.gmusicJingleKey) gmusicQueue[0] = el;
  else gmusicQueue.unshift(el);
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
    ctx.resume().catch(() => {});
  }
}

// Safari only lets an AudioContext/media element start inside a real user
// gesture; retry on every pointer/key press until audio is actually running.
function unlockAudio() {
  if (!ctx || document.hidden) return;
  const el = gmusicCurrentEl;
  if (el && el.paused && !el.ended && gmusicPendingSince === null) playGmusicCurrent();
  ctx.resume().then(() => {
    if (ctx.state !== 'running' || !gmusicCurrentEl || gmusicCurrentEl.paused) return;
    window.removeEventListener('pointerdown', unlockAudio, true);
    window.removeEventListener('keydown', unlockAudio, true);
  }).catch(() => {});
}

// ?stil in the URL: never create any audio (for automated/test sessions),
// without touching the player's saved mute setting.
const SILENT_MODE = typeof location !== 'undefined' && new URLSearchParams(location.search).has('stil');

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

function buildGraph() {
  master = ctx.createGain();
  master.gain.value = muted ? 0 : masterLevel();
  master.connect(buildSoftClip()).connect(ctx.destination);

  worldBus = ctx.createGain();
  worldBus.gain.value = getSettings().sfxVolume;
  worldBus.connect(master);

  sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.9;
  sfxBus.connect(worldBus);

  engineBus = ctx.createGain();
  engineBus.gain.value = 0;
  engineBus.connect(worldBus);

  sirenBus = ctx.createGain();
  sirenBus.gain.value = 0;
  sirenBus.connect(worldBus);

  musicBus = ctx.createGain();
  musicBus.gain.value = GMUSIC_VOLUME;
  musicBus.connect(master);

  trafficBus = ctx.createGain();
  trafficBus.gain.value = 1;
  trafficBus.connect(worldBus);

  ambBus = ctx.createGain();
  ambBus.gain.value = AMB_LEVEL;
  ambBus.connect(worldBus);

  uiBus = ctx.createGain();
  uiBus.gain.value = 0.8;
  uiBus.connect(worldBus);

  stingBus = ctx.createGain();
  stingBus.gain.value = 0.8;
  stingBus.connect(worldBus);

  reverb = buildReverb();
  sfxBus.connect(reverb.send);
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
    duckAmb: duckAmbience, duckMusic, setReverb, muted: () => muted,
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
  ctx = new AC();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  window.addEventListener('pointerdown', unlockAudio, true);
  window.addEventListener('keydown', unlockAudio, true);
  document.addEventListener('visibilitychange', onVisibilityChange);
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

// Mirrors the worklet's PROFILES: idle/redline rpm, upshift torque-cut time,
// output level. 0 petrol four, 1 hero Escort, 2 bus diesel, 3 brommer,
// 4 outboard, 5 V8, 6 van diesel.
const ENGINE_SPECS = [
  { idle: 800, red: 6200, shift: 0.2, level: 0.42, pops: 0.4 },
  { idle: 850, red: 6200, shift: 0.3, level: 0.46, pops: 0.75 },
  { idle: 600, red: 2300, shift: 0.45, level: 0.42, pops: 0 },
  { idle: 1900, red: 9500, shift: 0, level: 0.34, pops: 0 },
  { idle: 900, red: 5500, shift: 0, level: 0.4, pops: 0 },
  { idle: 750, red: 7000, shift: 0.16, level: 0.42, pops: 0.5 },
  { idle: 750, red: 4300, shift: 0.25, level: 0.42, pops: 0 },
];

function engineKind(v) {
  if (v.isScooter) return 3;
  if (v.isBoat) return 4;
  if (v.isBus) return 2;
  if (v.isHeroCar) return 1;
  const name = v.model && v.model.name;
  if (name === 'sport' || name === 'police' || v.isPolice) return 5;
  if (name === 'van') return 6;
  return 0;
}

// rpm for a vehicle from its speed, gear and throttle. st carries gear state.
function engineRpm(v, st, kind, throttle, t) {
  const S = ENGINE_SPECS[kind];
  const speed = Math.abs(v.speed);
  const frac = speed / (v.model.maxSpeed || 30);
  let shifted = 0;
  if (kind === 3) return { rpm: throttle > 0 ? 5200 + 3600 * Math.min(1, frac) : S.idle + 2300 * Math.min(1, frac), shifted };
  if (kind === 4) return { rpm: S.idle + (S.red - S.idle) * (throttle !== 0 ? 0.35 + 0.6 * Math.min(1, frac) : frac * 0.4), shifted };
  if (v.speed < -0.2) { st.gear = 0; return { rpm: S.idle + (S.red * 0.7 - S.idle) * clamp(speed / (v.model.maxSpeed * 0.25), 0, 1), shifted }; }
  const tops = kind === 2 ? BUS_GEAR_TOPS : GEAR_TOPS;
  const g = gearFor(frac, st.gear, tops);
  if (g !== st.gear) { shifted = g > st.gear ? 1 : -1; st.gear = g; }
  let rpm = Math.max(S.idle, S.red * 0.93 * frac / tops[g]);
  if (g === 0 && throttle > 0 && speed < 5) rpm = Math.max(rpm, S.idle + (kind === 2 ? 700 : 1900) * (1 - speed / 6));
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
  const motor = !!(v && !v.isBike && !v.wrecked);
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
  if (v && !v.wrecked && !world.paused) {
    const speed = Math.abs(v.speed);
    const small = v.isBike || v.isScooter;
    const surface = v.isBoat ? 4 : SURFACE_CODE[v.surface] ?? 0;
    const coasting = v.isBike && !(v.throttle > 0) && speed > 0.8;
    road = {
      speed, surface, small: small ? 1 : 0,
      wet: surface === 2 || v.isBoat ? 0 : rain,
      water: v.isBoat ? 1 : 0,
      wind: small ? 1 : v.isBoat ? 0.8 : v.isBus ? 0.25 : 0.4,
      free: coasting ? speed * 9 : 0,
      gain: clamp(speed / 1.2, v.isBoat ? 1 : 0, 1) * (v.isBus ? 0.55 : small ? 0.45 : 0.5),
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
  const { rpm: baseRpm, shifted } = engineRpm(v, S, S.kind, thr, t);
  let rpm = baseRpm;
  let load = thr > 0 ? 1 : thr < 0 && v.speed > 0.3 ? 0.04 : speed < 0.4 ? 0.22 : 0.07;
  if (thr < 0 && v.speed <= 0.3) load = 0.85;
  if (shifted && speed > 2) {
    if (shifted > 0 && thr > 0 && spec.shift) S.shiftUntil = t + spec.shift;
    if (shifted < 0 && thr <= 0 && S.kind !== 2) S.blipUntil = t + 0.13;
    if (S.kind !== 2) playGearClunk(S.kind === 1);
  }
  if (speed < 0.5 && thr > 0 && v.handbrake) rpm = spec.red * 0.82;
  if (thr > 0) rpm += (v.slip || 0) * spec.red * 0.25;
  if (t < S.shiftUntil) { load = 0.03; rpm *= 0.94; }
  if (t < S.blipUntil) { load = 0.55; rpm *= 1.18; }
  if (rpm > spec.red * 0.97) {
    S.limiter = (S.limiter + dt) % 0.12;
    rpm = spec.red * 0.97;
    if (S.limiter > 0.06) { load = 0.05; rpm -= spec.red * 0.05; }
  }

  if (spec.pops && S.prevThr > 0 && thr <= 0 && rpm > spec.red * 0.5 && Math.random() < spec.pops) {
    synthPost(synth.player, { type: 'pop', i: 0, n: 2 + Math.floor(Math.random() * 5) });
  } else if (spec.pops && thr <= 0 && speed > 8 && rpm > spec.red * 0.45 && Math.random() < dt * spec.pops * 0.8) {
    synthPost(synth.player, { type: 'pop', i: 0, n: 1 + Math.floor(Math.random() * 2) });
  }
  S.prevThr = thr;

  const gain = spec.level * (world.paused ? 0.5 : 1);
  S.gain += (clamp(0.15 + 0.35 * load * rpm / spec.red, 0, 0.5) - S.gain) * Math.min(1, dt * 4);
  synthPost(synth.player, { type: 'p', v: [{ i: 0, kind: S.kind, rpm, load, gain, pitch: 1 }], road });
}

const trafficEngine = new WeakMap();

function trafficEngineParams(v, dt, fresh) {
  let st = trafficEngine.get(v);
  const speed = Math.abs(v.speed);
  if (!st) { st = { gear: 0, prev: speed, load: 0.3 }; trafficEngine.set(v, st); }
  const acc = dt > 0 ? (speed - st.prev) / dt : 0;
  st.prev = speed;
  const target = acc > 0.3 ? clamp(0.45 + acc / (v.model.accel || 8) * 0.6, 0, 1) : acc < -0.6 ? 0.04 : speed < 0.3 ? 0.22 : 0.35;
  st.load += (target - st.load) * Math.min(1, dt * 5);
  const kind = engineKind(v);
  const { rpm } = engineRpm(v, st, kind, acc > 0.3 ? 1 : 0, 0);
  return { kind, rpm, load: st.load, snap: fresh };
}

function updateEngine(dt, world) {
  if (synth.player) { updateEngineSynth(dt, world); return; }
  const v = world.player.inVehicle;
  const motor = v && !v.isBike;
  const speed = motor ? Math.abs(v.speed) : 0;
  const t = ctx.currentTime;
  let targetGain = 0, targetFreq = 42, cutoff = 300;
  if (motor && v.isScooter) {
    targetGain = speed > 0.2 ? 0.05 + speed * 0.01 : 0;
    targetFreq = 160 + speed * 45;
    cutoff = 1600;
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
  const k = Math.min(1, dt * (t < engineState.shiftUntil ? 14 : 6));
  engineState.gain += (targetGain - engineState.gain) * k;
  engineState.freq += (targetFreq - engineState.freq) * k;

  engineBus.gain.value = engineState.gain;
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
let lastScrapeAt = -Infinity;
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

function buildHornVoice() {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2600;
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
  a.connect(filter);
  b.connect(bGain).connect(filter);
  filter.connect(gain).connect(sfxBus);
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
    const wob = Math.sin(t * 23) * 60 + Math.sin(t * 7.3) * 90 + (Math.random() - 0.5) * 120;
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
  if (!v || v.isBoat || v.wrecked || world.paused) { r.gain.gain.setTargetAtTime(0, t, 0.1); return; }
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
  const bell = v && v.isBike;
  if (pressing && bell) {
    if (t >= bellReadyAt) { playBell(v.x, v.y); bellReadyAt = t + 0.45; }
  } else if (!pressing) bellReadyAt = 0;
  const on = pressing && !bell;
  if (on && !hornVoice.on) {
    const low = v.isScooter ? 1.55 : hornPitch(v);
    const single = v.isScooter || v.isHeroCar;
    hornVoice.a.frequency.setValueAtTime(415 * low, t);
    hornVoice.b.frequency.setValueAtTime(523 * low * 1.004, t);
    hornVoice.bGain.gain.setValueAtTime(single ? 0 : 0.8, t);
  }
  if (on !== hornVoice.on) {
    hornVoice.on = on;
    hornVoice.gain.gain.setTargetAtTime(on ? (v && v.isScooter ? 0.04 : 0.06) : 0, t, on ? 0.008 : 0.03);
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
      if (world.time - lastScrapeAt > 0.11 && Math.random() < 0.35) {
        lastScrapeAt = world.time;
        playScrape(c.x, c.y, c.slide);
      }
    }
  }
}

function updateScrape(dt, world) {
  const sv = scrapeVoice;
  const t = ctx.currentTime;
  const on = !world.paused && world.time < sv.until;
  const target = on ? sv.target : 0;
  sv.target *= Math.max(0, 1 - dt * 2);
  sv.level += (target - sv.level) * Math.min(1, dt * (target > sv.level ? 20 : 8));
  if (sv.level < 0.002 && !on) { sv.level = 0; sv.target = 0; }
  if (sv.level > 0) {
    setPannerPos(sv.panner, sv.x, sv.y, 0.5, !sv.fresh);
    sv.fresh = false;
    sv.band.frequency.setTargetAtTime(1300 + sv.level * 1400 + (Math.random() - 0.5) * 500, t, 0.03);
    sv.ring.frequency.setTargetAtTime(3100 + (Math.random() - 0.5) * 400, t, 0.05);
  }
  sv.gain.gain.setTargetAtTime(sv.level * 0.2, t, 0.03);
}

const MAX_EVENTS_PER_FRAME = 8;

// world.audioEvents: [{kind, x, y, strength?}], drained every frame.
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
      case 'door_open': playDoor(x, y, true); doorDelay = 0.3; break;
      case 'door_close': playDoor(x, y, false); break;
      case 'engine_start':
        if (synth.player) { engineState.startDelay = doorDelay; break; }
        playEngineStart(x, y, doorDelay);
        engineState.startAt = ctx.currentTime + doorDelay + 0.75;
        engineState.gear = 0;
        break;
      case 'engine_stop': if (!synth.player) playEngineStop(x, y); break;
      case 'prop_hit': propHit(e, x, y); break;
      case 'coo': case 'flap': case 'bonk': case 'poop': case 'splat': case 'plop': playCritterEvent(e.kind, x, y, clamp(e.strength ?? 0.5, 0, 1)); break;
      case 'splash': playSplash(x, y); break;
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
      case 'achievement':
        [784, 988, 1175, 1568].forEach((f, j) => playTone({ freq: f, type: 'triangle', duration: 0.22, gain: 0.08, delay: j * 0.07, bus: stingBus, prio: 2 }));
        duckMusic(1);
        break;
      default: break;
    }
  }
}

function playCritterEvent(kind, x, y, k) {
  const out = spatialOut(x, y, { ref: 3, rolloff: 1.3, range: 40, model: 'equalpower', h: 0.6 });
  if (!out) return;
  const r = 0.92 + Math.random() * 0.16;
  if (kind === 'coo') playBuf('pigeon', { out, gain: 0.12 + k * 0.12, rate: r });
  else if (kind === 'flap') playBuf('flutter', { out, gain: 0.08 + k * 0.14, rate: r * 1.1 });
  else if (kind === 'bonk') { playBuf('punch', { out, gain: 0.2 + k * 0.15, rate: 1.4 * r }); playTone({ freq: 700, freqEnd: 380, type: 'triangle', duration: 0.12, gain: 0.05, out }); }
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
  const targetGain = chaseActive ? 0.18 + intensity * 0.22 : 0;
  sirenState.gain += (targetGain - sirenState.gain) * Math.min(1, dt * 2.2);
  sirenBus.gain.value = sirenState.gain;

  const units = chaseActive
    ? world.vehicles.filter((v) => v.isPolice && !v.hijacked && !v.wrecked && v.driver !== 'player')
    : [];
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
  if (v.isScooter) return { type: 'square', freq: 95 + s * 9, cutoff: 1100 + s * 40, gain: 0.04 + s * 0.006 };
  if (v.isBus) return { type: 'sawtooth', freq: 30 + s * 2.4, cutoff: 280 + s * 14, gain: 0.12 + s * 0.008 };
  return { type: 'sawtooth', freq: 40 + s * 3.2, cutoff: 300 + s * 16, gain: 0.06 + s * 0.009 };
}

function isEngineRunning(v) {
  if (v.wrecked || v.isBike || v.driver === 'player') return false;
  if (Math.abs(v.speed) > 0.2) return true;
  return v.isBoat || (!!v.road && !v.isHeroCar);
}

function updateTrafficAudio(dt, world) {
  const running = [];
  for (const v of world.vehicles) {
    if (isEngineRunning(v)) running.push(v);
    const horn = !!v.horn;
    if (horn && !hornWasOn.get(v) && v.driver !== 'player') playHorn(v.x, v.y, 0.4, hornPitch(v));
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
      const pitch = Math.pow(2, clamp(dopplerCents(v, Math.cos(v.angle) * v.speed, Math.sin(v.angle) * v.speed), -600, 600) / 1200);
      placeVoice(voice, v.x, v.y, v.isBoat ? 0.5 : 0.7);
      const level = v.isBus ? 0.55 : v.isBoat ? 0.5 : v.isScooter ? 0.4 : 0.32 + p.load * 0.2;
      fadeVoice(voice, level, dt, 4);
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
    fadeVoice(voice, Math.min(0.3, p.gain), dt, 4);
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

  let playerFired = false;
  for (const b of world.bullets) {
    if (seenBullets.has(b)) continue;
    seenBullets.add(b);
    if (b.owner === 'player') { playerFired = true; continue; }
    const sp = Math.hypot(b.vx, b.vy) || 1;
    playGunshot(b.x - (b.vx / sp) * b.traveled, b.y - (b.vy / sp) * b.traveled, 'pistol');
  }
  if (playerFired) {
    const src = p.inVehicle || p;
    playGunshot(src.x, src.y, world.weapon);
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
    if (!splashes.some((s) => Math.hypot(s.x - v.x, s.y - v.y) < 3)) playExplosion(v.x, v.y);
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
    if (el && el.paused && !el.ended && !el.gmusicPlayInFlight && !gmusicSuspended && nowSec() >= gmusicRetryAt) {
      if (el.error) advanceGmusicQueue();
      else playGmusicCurrent();
    }
  }

  if (pendingTrackAnnounce) {
    world.addMessage('🎵 Nu op G-Music: ' + pendingTrackAnnounce, 4);
    pendingTrackAnnounce = null;
  }

  // Fixed-gain duck (not real-time ducking analysis) whenever the engine is
  // working hard or the siren is audible, per spec - same lerp-toward-target
  // shape as engineBus/sirenBus above. Slower while fading in from a fresh
  // start so that fade actually reads as subtle instead of near-instant.
  const ducked = sirenAudible > 0.05 || engineState.gain > 0.4 || ctx.currentTime < duckState.musicUntil;
  const targetGain = ducked ? GMUSIC_DUCK_VOLUME : GMUSIC_VOLUME;
  const lerpRate = gmusicFadingIn ? dt * 0.8 : dt * 3;
  musicState.gain += (targetGain - musicState.gain) * Math.min(1, lerpRate);
  musicBus.gain.value = musicState.gain * getSettings().musicVolume;
  if (gmusicFadingIn && Math.abs(targetGain - musicState.gain) < 0.02) gmusicFadingIn = false;
}

let lastDeathAt = -Infinity;

export function updateAudio(dt, world) {
  const events = world.audioEvents || (world.audioEvents = []);
  if (!ctx || !worldReady) { events.length = 0; return; }
  if (!muted) playAudioEvents(world);
  events.length = 0;
  if (ctx.state === 'suspended' && !document.hidden) ctx.resume().catch(() => {});

  if (world.input.wasPressed('u')) {
    muted = !muted;
    saveMuted();
    master.gain.setTargetAtTime(muted ? 0 : masterLevel(), ctx.currentTime, 0.05);
    world.addMessage(muted ? 'Geluid uit' : 'Geluid aan', 1.5);
  }

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
    enqueueGmusicJingle('hoge_wanted');
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
  updateSqueal(dt, world);
  updateRumble(dt, world);
  updateScrape(dt, world);
  updatePlayerHorn(world);
  updateSiren(dt, world);
  updateTrafficAudio(dt, world);
  updateAmbience(dt, world);
  updateFoley(dt, world);
  updateUiSfx(dt, world);
  updateDucking(dt);
  if (bank.pending() === 0 && warmList.length) bank.warm([warmList.pop()]);
  updateGMusic(dt, world);
}

const warmList = ['glass', 'crunch_0', 'crunch_1', 'crunch_2', 'bikebell', 'ric_whine', 'prop_metal', 'bell_big', 'bell_carillon', 'thunder_0', 'thunder_1', 'thunder_2', 'bird_0', 'bird_1', 'bird_2', 'bird_3', 'bird_4',
  'gull_0', 'gull_1', 'clink', 'cow', 'sheep', 'duck', 'pigeon', 'flutter', 'dog', 'cat', 'step_gras_2', 'step_gras_3', 'step_wood_2', 'step_wood_3', 'step_wet_2', 'step_wet_3'];

export function getAudioStats() {
  if (!ctx) return null;
  const engineSynth = synth.player ? { kind: engineState.kind, gear: engineState.gear, level: +engineState.gain.toFixed(3), traffic: engineVoices.filter((voice) => voice.target).length } : null;
  return { activeVoices, buffers: bank ? bank.size() : 0, duck: duckState.level, engineSynth, ...ambienceStats(), ...foleyStats() };
}
