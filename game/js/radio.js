// The radio: one station, G-Music, for the whole game, the same on foot
// (Tammo's earbuds) and in any vehicle. N (LB in a vehicle on a controller,
// or Instellingen > Geluid) turns it on or off; that is kept in the save.
// The station runs a programme per part of the game day (musicpick.js
// PROGRAMMES): Proat in de ochtend, De hits, Avondproat and from 22:00
// Nachtstreek (Rikus's calmer pool through an old radio). audio.js plays the
// records and every few records hands this module a talk break: Geesje's
// Radio Proat bits, the Kiekdoar news, the traffic, the weather, the cows,
// Rikus, all recordings the game already has. The talk goes through the
// speech channel's 'radio' class, so any other voice (a "Bel Rikus" call,
// banter, a card line) cuts it off. `window.__radio` debug.
import { setRadioOn, setRadioProgramme, onRadioBreak, radioInBreak, playLineVoice } from './audio.js';
import { lineVoiceFor, NARRATOR } from './linevoice.js';
import { smsVoiceFor, SMS_SAY } from './smsvoice.js';
import { NACHTSTREEK, KROLBRUG_FAULTS, COW_FEED, PLANTSOEN_NEWS, EVENT_DAYS } from './flavourlines.js';
import { RADIO_HOST, RADIO_GRUNN, KERMIS_NEWS } from './funlines.js';
import { STATION_NAME, programmeAt, normalizeRadio } from './musicpick.js';
import { talkActive } from './storytalk.js';
import { playerBusy } from './busy.js';

// the recorded Kiekdoar headlines in audio/nieuws (text from its tts.json)
const NEWS_CLIPS = [
  ['mission_up', 'Mysterieuze klusjesman weer aan het werk in Groningen.'],
  ['wanted_up_1', 'Onrust in Grunn, politie massaal op pad.'],
  ['wanted_up_2', 'Gierende sirenes in het centrum, politie zit iemand op de hielen.'],
  ['kill_up', 'Opnieuw onrust in de straten, politie tast in het duister.'],
  ['wrecked_up_1', 'Auto afgeschreven in het centrum, buurtbewoners verbijsterd.'],
  ['wrecked_up_2', 'Wéér een auto afgeschreven in Groningen, garages wrijven in hun handen.'],
];
const STORM_CLIP = ['weather_storm_start', 'Code rood, storm raast over Grunn.'];
// a break never holds the music longer than this
const BREAK_MAX = 40;

let world = null;
let on = true;
// what audio.js plays: off still plays the soundtrack in a minigame or the heli
let playing = true;
let prog = programmeAt(12);
const R = { queue: [], nextAt: 0, rot: {}, played: 0, done: null, breakUntil: 0 };

const pick = (a) => a[Math.floor(Math.random() * a.length)];

export function radioIsOn() {
  return on;
}

// The save (savegame.js): 'on' or 'off'; anything else is on.
export function getRadioSave() {
  return on ? 'on' : 'off';
}
export function applyRadioSave(v) {
  setRadio(normalizeRadio(v) === 'on', { announce: false });
}

export function setRadio(value, { announce: show = true } = {}) {
  on = !!value;
  if (!on) { R.done = null; R.queue = []; playing = false; setRadioOn(false); }
  if (show && world) announce(world);
  return on;
}

export function initRadio(w) {
  world = w;
  prog = programmeAt(w.clock);
  setRadioProgramme(prog);
  onRadioBreak((done) => startBreak(done));
  window.__radio = {
    on: () => on,
    toggle: () => setRadio(!on),
    programme: () => prog.id,
    queue: () => R.queue.map((l) => l.speaker + ': ' + l.text),
    inBreak: () => radioInBreak(),
    played: () => R.played,
    ducked: () => ducked(world),
  };
}

function announce(w) {
  w.nowPlaying = on
    ? { title: prog.name, artist: prog.sub, station: STATION_NAME, programme: prog.name, at: w.time }
    : { title: 'Even stilte', artist: '', station: 'Radio uit', at: w.time };
}

// The new story keeps the radio to the world: Rikus does not talk while a mission or a conversation
// runs (a story scene, a call, the pair talking), and stays quiet until the mission is over.
const ducked = (w) => !!((w.mission && w.mission.phase === 'active') || talkActive() || w.storyContact || (typeof document !== 'undefined' && document.body.classList.contains('cine-hide-hud')));
const busy = (w) => w.paused || playerBusy(w, ['activityGame', 'padel', 'heliRun', 'pigeon']).busy || ducked(w);

export function updateRadio(dt, w) {
  if (!busy(w) && w.input.wasPressed('n')) setRadio(!on);
  const want = on || playerBusy(w, ['activityGame', 'heliRun', 'pigeon']).busy;
  if (want !== playing) { playing = want; setRadioOn(want); }
  const next = programmeAt(w.clock);
  if (next !== prog) {
    prog = next;
    setRadioProgramme(prog);
    if (on && !busy(w)) announce(w);
  }
  if (w.paused || !R.done) return;
  // a minigame or the heli: no talk, straight on with the music
  if (busy(w) || w.time > R.breakUntil) { endBreak(); return; }
  talk(w);
}

// --- talk breaks ---------------------------------------------------------------------------

function startBreak(done) {
  const w = world;
  if (!w || !on || busy(w)) { done(); return; }
  const kinds = prog.talk;
  const i = R.rot[prog.id] || 0;
  R.rot[prog.id] = i + 1;
  R.queue = segment(kinds[i % kinds.length], w);
  R.done = done;
  R.nextAt = w.time + 0.4;
  R.breakUntil = w.time + BREAK_MAX;
}

function endBreak() {
  const done = R.done;
  R.done = null;
  R.queue = [];
  if (done) done();
}

function host(text) {
  return { speaker: RADIO_HOST, text, voice: () => lineVoiceFor(RADIO_HOST, text) };
}

function clip([key, text]) {
  const src = `./audio/nieuws/${key}_v${Math.random() < 0.5 ? 0 : 1}.wav`;
  return { speaker: 'Kiekdoar-redactie', text, voice: () => ({ src, dur: 4 }) };
}

function news() {
  const texts = [
    ...SMS_SAY.bike.lines,
    ...['job_bezorger', 'job_bus', 'job_taxi', 'job_fietsdepot', 'job_rondvaart', 'job_verhuizing'].map((k) => SMS_SAY[k].lines[0]),
    PLANTSOEN_NEWS, ...Object.values(EVENT_DAYS).map((e) => e.announce), KERMIS_NEWS,
  ].filter(Boolean);
  const t = pick(texts).replace(/^KIEKDOAR( MELDT)?:\s*/i, '');
  return { speaker: 'Kiekdoar-redactie', text: t, voice: () => smsVoiceFor({ from: 'Kiekdoar', text: t }, lineVoiceFor) };
}

function rikus() {
  const t = pick(NACHTSTREEK);
  return { speaker: NARRATOR, text: t, voice: () => lineVoiceFor(NARRATOR, t) };
}

function segment(kind, w) {
  const G = RADIO_GRUNN;
  const storm = !!(w.weather && w.weather.active && w.weather.intensity > 0.7);
  const wet = !!(w.weather && w.weather.active && w.weather.intensity > 0.15);
  if (kind === 'ident') return [host(pick(G.ident))];
  if (kind === 'news') return [host(pick(G.news)), news()];
  if (kind === 'clip') return [clip(pick(NEWS_CLIPS))];
  if (kind === 'ad') return [host(pick(G.ads))];
  if (kind === 'traffic') { const t = pick(KROLBRUG_FAULTS); return [host(pick(G.traffic)), { speaker: 'Verkeersinformatie', text: t, voice: () => lineVoiceFor('Verkeersinformatie', t) }]; }
  if (kind === 'weather') return storm ? [host(pick(G.weatherRain)), clip(STORM_CLIP)] : [host(pick(wet ? G.weatherRain : G.weatherSun))];
  if (kind === 'cows') {
    const [cow, t] = pick(Object.values(COW_FEED).flat());
    return [host(pick(G.cows)), { speaker: 'Koe ' + cow, text: t, voice: () => lineVoiceFor('Koe ' + cow, t) }];
  }
  // at night Rikus presents himself; by day Geesje passes him on
  if (kind === 'rikus') return prog.id === 'nacht' ? [rikus()] : [host(pick(G.rikus)), rikus()];
  return [host(pick(G.ident))];
}

function talk(w) {
  if (w.time < R.nextAt) return;
  if (!R.queue.length) { endBreak(); return; }
  const line = R.queue[0];
  const v = line.voice();
  if (!v) { R.queue.shift(); R.nextAt = w.time + 0.3; return; }
  // false: the channel is taken (a call, banter, a card line): try again soon
  if (!playLineVoice(v.src, v.dur, 'radio')) { R.nextAt = w.time + 1.2; return; }
  R.queue.shift();
  R.played++;
  R.nextAt = w.time + v.dur + (R.queue.length ? 0.5 : 1.2);
}
