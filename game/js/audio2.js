import { clamp } from './util2.js';

const MASTER_VOLUME = 0.55;

let ctx = null;
let master = null;
let sfxBus = null;
let ambientBus = null;
let engineBus = null;
let sirenBus = null;
let noiseBuffer = null;

let pad = null;
let engine = null;
let siren = null;

let prev = null;
let seenMessages = null;
let muted = false;
const engineState = { freq: 42, gain: 0 };
const sirenState = { gain: 0 };
const tensionState = { value: 0 };

function buildNoiseBuffer(seconds) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function buildAmbientPad() {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 380;
  filter.Q.value = 0.7;
  filter.connect(ambientBus);

  // wide fifth/octave spacing (55 / 82.4 / 110 Hz = root-fifth-octave)
  // instead of closely-stacked tones - closely-spaced low oscillators beat
  // against each other and read as an unpleasant "brom" (hum/buzz) rather
  // than a pad, especially at any real volume
  const oscA = ctx.createOscillator();
  oscA.type = 'sine';
  oscA.frequency.value = 55;
  const gainA = ctx.createGain();
  gainA.gain.value = 0.22;
  oscA.connect(gainA).connect(filter);
  oscA.start();

  const oscB = ctx.createOscillator();
  oscB.type = 'triangle';
  oscB.frequency.value = 82.4;
  oscB.detune.value = -4;
  const gainB = ctx.createGain();
  gainB.gain.value = 0.14;
  oscB.connect(gainB).connect(filter);
  oscB.start();

  const oscC = ctx.createOscillator();
  oscC.type = 'sine';
  oscC.frequency.value = 110;
  oscC.detune.value = 3;
  const gainC = ctx.createGain();
  gainC.gain.value = 0.09;
  oscC.connect(gainC).connect(filter);
  oscC.start();

  // Slow filter-cutoff wobble is what keeps the drone from sounding like a
  // dead flat tone - depth/rate scale up with wanted level for tension.
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.07;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 90;
  lfo.connect(lfoGain).connect(filter.frequency);
  lfo.start();

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 600;
  noiseFilter.Q.value = 0.6;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.045;
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = noiseBuffer;
  noiseSrc.loop = true;
  noiseSrc.connect(noiseFilter).connect(noiseGain).connect(ambientBus);
  noiseSrc.start();

  return { filter, lfo, lfoGain };
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

function buildSiren() {
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 800;
  filter.Q.value = 4;
  filter.connect(sirenBus);

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 700;
  osc.connect(filter);
  osc.start();

  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.9;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 220;
  lfo.connect(lfoGain).connect(osc.frequency);
  lfo.start();

  return { osc, lfo, lfoGain, filter };
}

function playTone({ freq, freqEnd, type = 'sine', duration = 0.15, gain = 0.3, delay = 0, filterFreq = null }) {
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
  tail.connect(g).connect(sfxBus);

  osc.start(t0);
  osc.stop(t1 + 0.03);
  osc.onended = () => {
    osc.disconnect();
    g.disconnect();
    if (filter) filter.disconnect();
  };
}

function playNoiseBurst({ duration = 0.12, freq = 1200, freqEnd, q = 1, gain = 0.5, type = 'bandpass', delay = 0 }) {
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

  src.connect(filter).connect(g).connect(sfxBus);
  src.start(t0);
  src.stop(t1 + 0.03);
  src.onended = () => {
    src.disconnect();
    filter.disconnect();
    g.disconnect();
  };
}

function playHit() {
  playNoiseBurst({ duration: 0.09, freq: 1800, freqEnd: 400, q: 0.8, gain: 0.5 });
  playTone({ freq: 140, freqEnd: 60, type: 'triangle', duration: 0.08, gain: 0.35 });
}

function playCopSting() {
  playTone({ freq: 260, freqEnd: 70, type: 'sawtooth', duration: 0.35, gain: 0.3, filterFreq: 900 });
  playNoiseBurst({ duration: 0.2, freq: 500, freqEnd: 120, q: 0.7, gain: 0.25, delay: 0.02 });
}

function playPedSting() {
  playTone({ freq: 900, freqEnd: 500, type: 'sine', duration: 0.12, gain: 0.28 });
}

function playPlayerHurt() {
  playTone({ freq: 160, freqEnd: 55, type: 'sine', duration: 0.22, gain: 0.4 });
  playNoiseBurst({ duration: 0.15, freq: 300, freqEnd: 90, q: 0.6, gain: 0.3 });
}

function playArmorUp() {
  playTone({ freq: 700, type: 'triangle', duration: 0.09, gain: 0.3 });
  playTone({ freq: 1050, type: 'triangle', duration: 0.12, gain: 0.3, delay: 0.07 });
}

function playArmorDown() {
  playNoiseBurst({ duration: 0.08, freq: 2200, freqEnd: 900, q: 1.4, gain: 0.35, type: 'highpass' });
  playTone({ freq: 500, freqEnd: 260, type: 'square', duration: 0.07, gain: 0.15 });
}

function playCashChime() {
  const notes = [660, 880, 1320];
  notes.forEach((f, i) => playTone({ freq: f, type: 'sine', duration: 0.14, gain: 0.22, delay: i * 0.05 }));
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

export function initAudio(world) {
  if (ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  ctx = new AC();
  if (ctx.state === 'suspended') ctx.resume();

  master = ctx.createGain();
  master.gain.value = MASTER_VOLUME;
  master.connect(ctx.destination);

  sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.9;
  sfxBus.connect(master);

  ambientBus = ctx.createGain();
  ambientBus.gain.value = 0.16;
  ambientBus.connect(master);

  engineBus = ctx.createGain();
  engineBus.gain.value = 0;
  engineBus.connect(master);

  sirenBus = ctx.createGain();
  sirenBus.gain.value = 0;
  sirenBus.connect(master);

  noiseBuffer = buildNoiseBuffer(2);
  pad = buildAmbientPad();
  engine = buildEngine();
  siren = buildSiren();

  prev = {
    kills: world.stats.kills,
    copKills: world.stats.copKills,
    pedKills: world.stats.pedKills,
    health: world.health,
    armor: world.armor,
    money: world.money,
    weapon: world.weapon,
    missionPhase: world.mission ? world.mission.phase : null,
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

function updateSiren(dt, world) {
  const chaseActive = world.wanted > 0;
  const intensity = clamp(world.wanted / 5, 0, 1);
  const targetGain = chaseActive ? 0.18 + intensity * 0.22 : 0;
  sirenState.gain += (targetGain - sirenState.gain) * Math.min(1, dt * 2.2);
  sirenBus.gain.value = sirenState.gain;
  siren.lfo.frequency.value = 0.75 + intensity * 0.9;
}

function updateTension(dt, world) {
  const target = clamp(world.wanted / 5, 0, 1);
  tensionState.value += (target - tensionState.value) * Math.min(1, dt * 0.8);
  const t = tensionState.value;
  pad.filter.frequency.value = 380 + t * 900;
  pad.lfo.frequency.value = 0.07 + t * 0.5;
  pad.lfoGain.gain.value = 90 + t * 260;
  ambientBus.gain.value = 0.4 + t * 0.12;
}

export function updateAudio(dt, world) {
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();

  if (world.input.wasPressed('u')) {
    muted = !muted;
    master.gain.setTargetAtTime(muted ? 0 : MASTER_VOLUME, ctx.currentTime, 0.05);
    world.addMessage(muted ? 'Geluid uit' : 'Geluid aan', 1.5);
  }

  if (world.stats.kills > prev.kills) playHit();
  if (world.stats.copKills > prev.copKills) playCopSting();
  if (world.stats.pedKills > prev.pedKills) playPedSting();
  if (world.health < prev.health) playPlayerHurt();
  if (world.armor > prev.armor) playArmorUp();
  else if (world.armor < prev.armor) playArmorDown();
  if (world.money > prev.money) playCashChime();
  if (world.weapon !== prev.weapon) playSwitchClick();

  const missionPhase = world.mission ? world.mission.phase : null;
  if (missionPhase === 'active' && prev.missionPhase !== 'active') playMissionJingle();

  for (const m of world.messages) {
    if (seenMessages.has(m)) continue;
    seenMessages.add(m);
    if (m.text === 'DOOD' || m.text === 'OPGEPAKT') playDeathSting();
    else if (m.text.indexOf('voltooid') !== -1) playMissionJingle();
  }

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
  updateTension(dt, world);
}
