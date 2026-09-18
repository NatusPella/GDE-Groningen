import { clamp } from './util.js';

const MASTER_VOLUME = 0.55;
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
const TAMMO_LINES = {
  wapen_opgepakt: './audio/voicelines/tammo/wapen_opgepakt.wav',
  geld_opgepakt: './audio/voicelines/tammo/geld_opgepakt.wav',
  auto_gejat: './audio/voicelines/tammo/auto_gejat.wav',
  missie_gestart: './audio/voicelines/tammo/missie_gestart.wav',
  missie_gelukt: './audio/voicelines/tammo/missie_gelukt.wav',
  missie_mislukt: './audio/voicelines/tammo/missie_mislukt.wav',
  opgepakt: './audio/voicelines/tammo/opgepakt.wav',
  water_panic: './audio/voicelines/tammo/water_panic.wav',
};
const ANITA_LINES = {
  wapen_opgepakt: './audio/voicelines/anita/wapen_opgepakt.wav',
  geld_opgepakt: './audio/voicelines/anita/geld_opgepakt.wav',
  missie_gestart: './audio/voicelines/anita/missie_gestart.wav',
  missie_gelukt: './audio/voicelines/anita/missie_gelukt.wav',
  missie_mislukt: './audio/voicelines/anita/missie_mislukt.wav',
  opgepakt: './audio/voicelines/anita/opgepakt.wav',
  kus: './audio/voicelines/anita/kus.wav',
};
const GMUSIC_JINGLES = {
  station_id: './audio/gmusic/jingles/station_id.wav',
  instappen: './audio/gmusic/jingles/instappen.wav',
  nummerovergang: './audio/gmusic/jingles/nummerovergang.wav',
  rij_knipoog: './audio/gmusic/jingles/rij_knipoog.wav',
  hoge_wanted: './audio/gmusic/jingles/hoge_wanted.wav',
  uitstappen: './audio/gmusic/jingles/uitstappen.wav',
};
const AMBIENT_JINGLE_KEYS = ['station_id', 'nummerovergang', 'rij_knipoog'];
const AMBIENT_JINGLE_MIN = 90, AMBIENT_JINGLE_MAX = 150;

// NPC ambient chatter, police barks, Sikkom phone-feed lines - each key has
// a few voice variants recorded for it; playX() below always picks one at
// random so the same trigger doesn't sound identical every time.
const NPC_PHRASE_AUDIO = Array.from({ length: 10 }, (_, i) =>
  [0, 1, 2].map((v) => `./audio/npc/phrase_${i}_v${v}.wav`));

const POLICE_BARK_KEYS = ['stop_politie', 'zet_kant', 'verdachte_voertuig', 'handen_omhoog', 'achtervolging', 'aangehouden'];
const POLICE_BARK_AUDIO = {};
for (const k of POLICE_BARK_KEYS) POLICE_BARK_AUDIO[k] = [0, 1].map((v) => `./audio/police/${k}_v${v}.wav`);
const POLICE_CHASE_START_KEYS = ['stop_politie', 'zet_kant', 'verdachte_voertuig', 'handen_omhoog', 'achtervolging'];

const SIKKOM_AUDIO_KEYS = ['wanted_up_1', 'wanted_up_2', 'wrecked_up_1', 'wrecked_up_2', 'copkill_up', 'pedkill_up', 'kill_up', 'mission_up'];
const SIKKOM_AUDIO = {};
for (const k of SIKKOM_AUDIO_KEYS) SIKKOM_AUDIO[k] = [0, 1].map((v) => `./audio/sikkom/${k}_v${v}.wav`);

let ctx = null;
let master = null;
let sfxBus = null;
let engineBus = null;
let sirenBus = null;
let musicBus = null;
let noiseBuffer = null;

let engine = null;
let siren = null;

let prev = null;
let seenMessages = null;
let muted = false;
let ambientJingleTimer = 0;
let wasDriving = false;
const engineState = { freq: 42, gain: 0 };
const sirenState = { gain: 0 };
const musicState = { gain: GMUSIC_VOLUME };
const gmusic = { tracks: [], elements: [], index: 0 };

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

function buildSiren() {
  // NL/EU two-tone "hi-lo" wail: bandpass retuned from the old 800Hz center
  // (tuned for a 480-920Hz continuous sweep) down to sit between the two
  // fixed step tones below instead of muffling the low one.
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 545;
  filter.Q.value = 1.4;
  filter.connect(sirenBus);

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = SIREN_LOW_FREQ;
  osc.connect(filter);
  osc.start();

  return { osc, filter, toneHigh: false, nextToggle: 0 };
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

// One-shot playback for the pre-recorded voicelines/jingles above - routed
// through sfxBus (not its own bus) since these are conceptually just
// another kind of one-shot sound effect, same as every playX() above,
// just sourced from a real audio file instead of a synthesized oscillator.
// A missing/unplayable file (network hiccup, or an asymmetric-script key
// with no recording for this character) fails silently, never throws.
function playClip(src) {
  if (!ctx || muted) return;
  const el = new Audio(src);
  try {
    const node = ctx.createMediaElementSource(el);
    node.connect(sfxBus);
  } catch (e) {
    // ignore - playback still works without the Web Audio graph attached
  }
  el.play().catch(() => {});
}

function playVoiceline(character, key) {
  const src = (character === 'anita' ? ANITA_LINES : TAMMO_LINES)[key];
  if (src) playClip(src);
}

function playGMusicJingle(key) {
  const src = GMUSIC_JINGLES[key];
  if (src) playClip(src);
}

export function playAutoGejatLine(world) {
  if (world.player.character === 'tammo') playVoiceline('tammo', 'auto_gejat');
}

function playRandomVariant(paths) {
  if (!paths || !paths.length) return;
  playClip(paths[Math.floor(Math.random() * paths.length)]);
}

export function playNpcPhrase(index) {
  playRandomVariant(NPC_PHRASE_AUDIO[index]);
}

export function playPoliceBark(key) {
  playRandomVariant(POLICE_BARK_AUDIO[key]);
}

function playRandomChaseStartBark() {
  playPoliceBark(POLICE_CHASE_START_KEYS[Math.floor(Math.random() * POLICE_CHASE_START_KEYS.length)]);
}

export function playSikkomLine(key) {
  playRandomVariant(SIKKOM_AUDIO[key]);
}

// Fire-and-forget: initAudio() stays sync, this just fills in gmusic.elements
// whenever the manifest (and the track files it lists) resolve. An empty or
// missing manifest leaves gmusic.elements empty, which every gmusic playback
// path below already treats as "nothing to play" - never throws.
async function loadGMusicManifest() {
  try {
    const res = await fetch(GMUSIC_MANIFEST_URL);
    if (!res.ok) return;
    const data = await res.json();
    const tracks = Array.isArray(data.tracks) ? data.tracks : [];
    gmusic.tracks = tracks;
    gmusic.elements = tracks.map((filename) => {
      const el = new Audio('./audio/gmusic/' + filename);
      el.preload = 'auto';
      el.addEventListener('ended', () => {
        gmusic.index = (gmusic.index + 1) % gmusic.elements.length;
        const next = gmusic.elements[gmusic.index];
        if (next) next.el.play().catch(() => {});
      });
      const srcNode = ctx.createMediaElementSource(el);
      srcNode.connect(musicBus);
      return { el, filename, srcNode };
    });
  } catch (e) {
    // no manifest yet / bad JSON / fetch blocked - G-Music just stays silent
  }
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

  engineBus = ctx.createGain();
  engineBus.gain.value = 0;
  engineBus.connect(master);

  sirenBus = ctx.createGain();
  sirenBus.gain.value = 0;
  sirenBus.connect(master);

  musicBus = ctx.createGain();
  musicBus.gain.value = GMUSIC_VOLUME;
  musicBus.connect(master);

  noiseBuffer = buildNoiseBuffer(2);
  engine = buildEngine();
  siren = buildSiren();
  loadGMusicManifest();

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
  ambientJingleTimer = AMBIENT_JINGLE_MIN + Math.random() * (AMBIENT_JINGLE_MAX - AMBIENT_JINGLE_MIN);
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

  // Stepped hi-lo alternation, not a swept wail: hold each fixed pitch for
  // 0.5-0.7s (higher wanted level = faster alternation, still in range) and
  // jump with setValueAtTime so the switch is an abrupt step, not a glide.
  const hold = SIREN_HOLD_MAX - intensity * (SIREN_HOLD_MAX - SIREN_HOLD_MIN);
  if (ctx.currentTime >= siren.nextToggle) {
    siren.toneHigh = !siren.toneHigh;
    siren.osc.frequency.setValueAtTime(siren.toneHigh ? SIREN_HIGH_FREQ : SIREN_LOW_FREQ, ctx.currentTime);
    siren.nextToggle = ctx.currentTime + hold;
  }
}

function updateGMusic(dt, world) {
  // G-Music plays continuously, on foot or driving - idempotent (checked
  // every frame via el.paused) so a manifest that resolves after boot just
  // starts itself the next frame instead of needing an edge to trigger on.
  const cur = gmusic.elements[gmusic.index];
  if (cur && cur.el.paused) cur.el.play().catch(() => {});

  // Fixed-gain duck (not real-time ducking analysis) whenever the engine is
  // working hard or the siren is audible, per spec - same lerp-toward-target
  // shape as engineBus/sirenBus above.
  const ducked = sirenState.gain > 0.05 || engineState.gain > 0.4;
  const targetGain = ducked ? GMUSIC_DUCK_VOLUME : GMUSIC_VOLUME;
  musicState.gain += (targetGain - musicState.gain) * Math.min(1, dt * 3);
  musicBus.gain.value = musicState.gain;
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
  if (missionPhase === 'active' && prev.missionPhase !== 'active') {
    playMissionJingle();
    playVoiceline(world.player.character, 'missie_gestart');
  }

  for (const m of world.messages) {
    if (seenMessages.has(m)) continue;
    seenMessages.add(m);
    if (m.text === 'DOOD' || m.text === 'OPGEPAKT') {
      playDeathSting();
      if (m.text === 'OPGEPAKT') {
        playVoiceline(world.player.character, 'opgepakt');
        playPoliceBark('aangehouden');
      }
    } else if (m.text.indexOf('voltooid') !== -1) {
      playMissionJingle();
    } else if (m.text.indexOf('geklaard!') !== -1) {
      playVoiceline(world.player.character, 'missie_gelukt');
    } else if (m.text.indexOf('mislukt') !== -1) {
      playVoiceline(world.player.character, 'missie_mislukt');
    } else if (m.text.endsWith('ammo')) {
      playVoiceline(world.player.character, 'wapen_opgepakt');
    } else if (m.text.startsWith('+ €')) {
      playVoiceline(world.player.character, 'geld_opgepakt');
    } else if (m.text.startsWith('Kusje voor')) {
      playVoiceline(world.companion ? world.companion.character : null, 'kus');
    } else if (m.text === 'Nat geworden!') {
      playVoiceline(world.player.character, 'water_panic');
    }
  }

  const driving = !!world.player.inVehicle;
  if (driving && !wasDriving) playGMusicJingle('instappen');
  else if (!driving && wasDriving) playGMusicJingle('uitstappen');
  wasDriving = driving;
  if (world.wanted > 0 && prev.wanted === 0) {
    playGMusicJingle('hoge_wanted');
    playRandomChaseStartBark();
  }
  prev.wanted = world.wanted;

  ambientJingleTimer -= dt;
  if (ambientJingleTimer <= 0) {
    ambientJingleTimer = AMBIENT_JINGLE_MIN + Math.random() * (AMBIENT_JINGLE_MAX - AMBIENT_JINGLE_MIN);
    playGMusicJingle(AMBIENT_JINGLE_KEYS[Math.floor(Math.random() * AMBIENT_JINGLE_KEYS.length)]);
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
  updateGMusic(dt, world);
}
