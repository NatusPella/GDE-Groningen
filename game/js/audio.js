import { clamp } from './util.js';
import { getCamera } from './scene3d.js';
import { getSettings, onSettingsChange } from './settings.js';

const MASTER_VOLUME = 0.55;
const MAX_DISTANCE = 120;
const SOURCE_HEIGHT = 1;
const SPEED_OF_SOUND = 343;
const ENGINE_VOICES = 4;
const ENGINE_RANGE = 60;
const SIREN_VOICES = 3;
const SPEECH_RANGE = 45;
const GMUSIC_MANIFEST_URL = './audio/gmusic/manifest.json';
const GMUSIC_VOLUME = 0.5;
const GMUSIC_DUCK_VOLUME = 0.2;
const SIREN_LOW_FREQ = 440;
const SIREN_HIGH_FREQ = 660;
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
let noiseBuffer = null;

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
const engineState = { freq: 42, gain: 0 };
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

function makePanner({ ref = 5, rolloff = 1, model = 'HRTF' } = {}) {
  const p = ctx.createPanner();
  p.panningModel = model;
  p.distanceModel = 'inverse';
  p.refDistance = ref;
  p.rolloffFactor = rolloff;
  p.maxDistance = MAX_DISTANCE;
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
  if (!ctx || muted) return null;
  const h = opts.h ?? SOURCE_HEIGHT;
  if (distToListener(x, y, h) > (opts.range ?? MAX_DISTANCE)) return null;
  const panner = makePanner(opts);
  setPannerPos(panner, x, y, h);
  panner.connect(opts.bus || sfxBus);
  let refs = 0;
  return {
    node: panner,
    hold() { refs++; },
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
  filter.frequency.value = 545;
  filter.Q.value = 1.4;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = SIREN_LOW_FREQ;

  const gain = ctx.createGain();
  gain.gain.value = 0;
  const panner = makePanner({ ref: 8, rolloff: 0.9, model: 'equalpower' });
  osc.connect(filter).connect(gain).connect(panner).connect(sirenBus);
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

function playTone({ freq, freqEnd, type = 'sine', duration = 0.15, gain = 0.3, delay = 0, filterFreq = null, out = null }) {
  const t0 = ctx.currentTime + delay;
  const t1 = t0 + duration;
  const osc = ctx.createOscillator();
  osc.type = type;
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
  tail.connect(g).connect(out ? out.node : sfxBus);
  if (out) out.hold();

  osc.start(t0);
  osc.stop(t1 + 0.03);
  osc.onended = () => {
    osc.disconnect();
    g.disconnect();
    if (filter) filter.disconnect();
    if (out) out.release();
  };
}

function playNoiseBurst({ duration = 0.12, freq = 1200, freqEnd, q = 1, gain = 0.5, type = 'bandpass', delay = 0, out = null }) {
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

  src.connect(filter).connect(g).connect(out ? out.node : sfxBus);
  if (out) out.hold();
  src.start(t0);
  src.stop(t1 + 0.03);
  src.onended = () => {
    src.disconnect();
    filter.disconnect();
    g.disconnect();
    if (out) out.release();
  };
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
  playNoiseBurst({ duration: 0.05, freq: 3200, freqEnd: 1500, q: 1.5, gain: 0.22, type: 'highpass', out });
  playTone({ freq: 2600, freqEnd: 1400, type: 'sine', duration: 0.09, gain: 0.06, out });
}

function playExplosion(x, y) {
  const out = spatialOut(x, y, { ref: 10, rolloff: 0.7 });
  if (!out) return;
  playNoiseBurst({ duration: 1.1, freq: 1400, freqEnd: 70, q: 0.5, gain: 0.85, type: 'lowpass', out });
  playTone({ freq: 90, freqEnd: 28, type: 'sine', duration: 0.9, gain: 0.55, out });
}

function playCrash(x, y, impact) {
  const out = spatialOut(x, y, { ref: 6, rolloff: 1 });
  if (!out) return;
  const k = clamp(impact / 15, 0.35, 1);
  playNoiseBurst({ duration: 0.25, freq: 900, freqEnd: 180, q: 0.7, gain: 0.55 * k, out });
  playTone({ freq: 110, freqEnd: 45, type: 'square', duration: 0.16, gain: 0.25 * k, filterFreq: 600, out });
}

function playSplash(x, y) {
  const out = spatialOut(x, y, { ref: 6, rolloff: 1, range: 80 });
  if (!out) return;
  playNoiseBurst({ duration: 0.7, freq: 1600, freqEnd: 220, q: 0.5, gain: 0.5, type: 'lowpass', out });
}

function playHorn(x, y) {
  const out = spatialOut(x, y, { ref: 6, rolloff: 1, range: 80 });
  if (!out) return;
  playTone({ freq: 415, type: 'square', duration: 0.4, gain: 0.1, filterFreq: 1800, out });
  playTone({ freq: 523, type: 'square', duration: 0.4, gain: 0.08, filterFreq: 1800, out });
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
  playTone({ freq: 220, freqEnd: 55, type: 'sawtooth', duration: 0.5, gain: 0.35, filterFreq: 1200 });
  playTone({ freq: 165, freqEnd: 45, type: 'sawtooth', duration: 0.55, gain: 0.3, delay: 0.04, filterFreq: 900 });
  playNoiseBurst({ duration: 0.3, freq: 700, freqEnd: 150, q: 0.6, gain: 0.3 });
}

function playMissionJingle() {
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

function playVoiceline(character, key) {
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

export function initAudio(world) {
  if (ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  ctx = new AC();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  window.addEventListener('pointerdown', unlockAudio, true);
  window.addEventListener('keydown', unlockAudio, true);
  document.addEventListener('visibilitychange', onVisibilityChange);

  master = ctx.createGain();
  master.gain.value = muted ? 0 : masterLevel();
  master.connect(ctx.destination);

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

  noiseBuffer = buildNoiseBuffer(2);
  engine = buildEngine();
  sirenVoices = Array.from({ length: SIREN_VOICES }, buildSirenVoice);
  engineVoices = Array.from({ length: ENGINE_VOICES }, buildEngineVoice);
  heliVoice = buildHeliVoice();
  loadGMusicManifest();

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
}

function updateEngine(dt, world) {
  const v = world.player.inVehicle;
  const speed = v ? Math.abs(v.speed) : 0;
  const targetGain = v ? clamp(0.12 + speed * 0.012, 0.12, 0.55) : 0;
  const targetFreq = 42 + speed * 3.4;
  const k = Math.min(1, dt * 4);
  engineState.gain += (targetGain - engineState.gain) * k;
  engineState.freq += (targetFreq - engineState.freq) * k;

  engineBus.gain.value = engineState.gain;
  engine.osc1.frequency.value = engineState.freq;
  engine.osc2.frequency.value = engineState.freq * 2 + 4;
  engine.filter.frequency.value = 300 + speed * 18;
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
  // jump with setValueAtTime so the switch is an abrupt step, not a glide.
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
      voice.osc.frequency.setValueAtTime(voice.toneHigh ? SIREN_HIGH_FREQ : SIREN_LOW_FREQ, t);
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
    if (horn && !hornWasOn.get(v) && v.driver !== 'player') playHorn(v.x, v.y);
    hornWasOn.set(v, horn);
  }
  assignVoices(engineVoices, nearestSorted(running, ENGINE_RANGE, ENGINE_VOICES));
  const t = ctx.currentTime;
  for (const voice of engineVoices) {
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

  const newlyWrecked = [];
  for (const v of world.vehicles) {
    if (v.hitThisFrame && !world.paused) {
      const last = lastCrashAt.get(v) ?? -Infinity;
      if (world.time - last >= CRASH_MIN_GAP) {
        playCrash(v.hitX, v.hitY, v.hitImpactSpeed || 0);
        // both parties of a collision carry the same hit point
        for (const o of world.vehicles) {
          if (o.hitThisFrame && o.hitX === v.hitX && o.hitY === v.hitY) lastCrashAt.set(o, world.time);
        }
      }
    }
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
  const ducked = sirenAudible > 0.05 || engineState.gain > 0.4;
  const targetGain = ducked ? GMUSIC_DUCK_VOLUME : GMUSIC_VOLUME;
  const lerpRate = gmusicFadingIn ? dt * 0.8 : dt * 3;
  musicState.gain += (targetGain - musicState.gain) * Math.min(1, lerpRate);
  musicBus.gain.value = musicState.gain * getSettings().musicVolume;
  if (gmusicFadingIn && Math.abs(targetGain - musicState.gain) < 0.02) gmusicFadingIn = false;
}

let lastDeathAt = -Infinity;

export function updateAudio(dt, world) {
  if (!ctx) return;
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
  updateSiren(dt, world);
  updateTrafficAudio(dt, world);
  updateGMusic(dt, world);
}
