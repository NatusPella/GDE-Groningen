// The radio: one station list for the whole game, the same on foot (Tammo's
// earbuds) and in any vehicle. N tunes to the next station and B to the
// previous one (LB in a vehicle on a controller, or Instellingen > Geluid):
// G-Music (the hits), Radio Nachtstreek (Rikus's late-night records through an
// old radio, with him talking between them), Radio Proat (talk: Geesje, the
// Kiekdoar news, the traffic, the cows and Rikus's bits, all recordings the
// game already has) and off. The station follows you from car to car and is
// kept in the save. audio.js plays the music (setRadioStation); the talk goes
// through the speech channel's 'radio' class, so any other voice (a "Bel
// Rikus" call, banter, a card line) cuts it off. `window.__radio` debug.
import { setRadioStation, playLineVoice } from './audio.js';
import { lineVoiceFor, NARRATOR } from './linevoice.js';
import { smsVoiceFor, SMS_SAY } from './smsvoice.js';
import { NACHTSTREEK, KROLBRUG_FAULTS, COW_FEED, PLANTSOEN_NEWS, EVENT_DAYS } from './flavourlines.js';
import { RADIO_HOST, RADIO_GRUNN, KERMIS_NEWS } from './funlines.js';

export const STATIONS = [
  { id: 'gmusic', name: 'G-Music', sub: 'Hits uit Grunn', short: 'G-Music' },
  { id: 'nachtstreek', name: 'Radio Nachtstreek', sub: 'Rikus draait streekmuziek en praat ertussendoor', short: 'Nachtstreek' },
  { id: 'grunn', name: 'Radio Proat', sub: 'Praatradio: Kiekdoar-nieuws, verkeer en de koeien', short: 'Proat' },
  { id: 'uit', name: 'Radio uit', sub: 'Even stilte', short: 'Uit' },
];
const ids = new Set(STATIONS.map((s) => s.id));

let world = null;
// what you chose; `current` is what plays (a minigame or the heli overrides it)
let chosen = 'gmusic';
let current = 'gmusic';
const R = { queue: [], nextAt: 0, idx: 0, rikusAt: 0, rot: 0, played: 0 };

const pick = (a) => a[Math.floor(Math.random() * a.length)];

export function radioStation() {
  return chosen;
}

// The save (savegame.js): anything unknown or missing is G-Music.
export function getRadioSave() {
  return chosen;
}
export function applyRadioSave(id) {
  chosen = ids.has(id) ? id : 'gmusic';
}

export function tuneRadio(id, { announce: show = true } = {}) {
  if (!ids.has(id)) return false;
  chosen = id;
  const st = STATIONS.find((s) => s.id === id);
  if (show && world) announce(world, st);
  // a fresh start on the talk station: the ident first
  if (id === 'grunn') { R.queue = []; R.nextAt = (world ? world.time : 0) + 0.6; R.rot = 0; }
  if (id === 'nachtstreek') R.rikusAt = (world ? world.time : 0) + 4;
  return true;
}

export function initRadio(w) {
  world = w;
  window.__radio = {
    station: () => current,
    chosen: () => chosen,
    stations: () => STATIONS.map((s) => s.id),
    tune: (id) => tuneRadio(id),
    queue: () => R.queue.map((l) => l.speaker + ': ' + l.text),
    played: () => R.played,
  };
}

function announce(w, st) {
  w.nowPlaying = { title: st.name, artist: st.sub, station: st.name, at: w.time };
}

function cycle(dir) {
  const i = STATIONS.findIndex((s) => s.id === chosen);
  tuneRadio(STATIONS[(i + dir + STATIONS.length) % STATIONS.length].id);
}

export function updateRadio(dt, w) {
  const input = w.input;
  const busy = w.paused || w.activityGame || w.padelGame || w.heliRun || w.pigeonMode;
  if (!busy && input.wasPressed('n')) cycle(1);
  else if (!busy && input.wasPressed('b')) cycle(-1);
  let want = chosen;
  // story scenes, minigames with their own sound and the heli: the soundtrack
  if (w.activityGame || w.heliRun || w.pigeonMode) want = 'gmusic';
  if (want !== current) {
    current = want;
    setRadioStation(want);
    if (want !== 'grunn') R.queue = [];
  }
  if (w.paused) return;
  if (current === 'grunn') talkStation(w);
  else if (current === 'nachtstreek') nachtstreek(w);
}

// --- Radio Proat: segments of host + content -----------------------------------------------

const ORDER = ['ident', 'news', 'ad', 'traffic', 'news', 'weather', 'cows', 'ad', 'rikus', 'news'];

function host(text) {
  return { speaker: RADIO_HOST, text, voice: () => lineVoiceFor(RADIO_HOST, text) };
}

function news() {
  const texts = [
    ...SMS_SAY.peerd.lines, ...SMS_SAY.bike.lines,
    ...['job_bezorger', 'job_bus', 'job_taxi', 'job_fietsdepot', 'job_rondvaart', 'job_verhuizing'].map((k) => SMS_SAY[k].lines[0]),
    PLANTSOEN_NEWS, ...Object.values(EVENT_DAYS).map((e) => e.announce), KERMIS_NEWS,
  ].filter(Boolean);
  const t = pick(texts).replace(/^KIEKDOAR( MELDT)?:\s*/i, '');
  return { speaker: 'Kiekdoar-redactie', text: t, voice: () => smsVoiceFor({ from: 'Kiekdoar', text: t }, lineVoiceFor) };
}

function segment(kind, w) {
  const G = RADIO_GRUNN;
  if (kind === 'ident') return [host(pick(G.ident))];
  if (kind === 'news') return [host(pick(G.news)), news()];
  if (kind === 'ad') return [host(pick(G.ads))];
  if (kind === 'traffic') { const t = pick(KROLBRUG_FAULTS); return [host(pick(G.traffic)), { speaker: 'Verkeersinformatie', text: t, voice: () => lineVoiceFor('Verkeersinformatie', t) }]; }
  if (kind === 'weather') { const wet = !!(w.weather && w.weather.active && w.weather.intensity > 0.15); return [host(pick(wet ? G.weatherRain : G.weatherSun))]; }
  if (kind === 'cows') {
    const all = Object.values(COW_FEED).flat();
    const [cow, t] = pick(all);
    return [host(pick(G.cows)), { speaker: 'Koe ' + cow, text: t, voice: () => lineVoiceFor('Koe ' + cow, t) }];
  }
  if (kind === 'rikus') { const t = pick(NACHTSTREEK); return [host(pick(G.rikus)), { speaker: NARRATOR, text: t, voice: () => lineVoiceFor(NARRATOR, t) }]; }
  return [host(pick(G.ident))];
}

function talkStation(w) {
  if (w.time < R.nextAt) return;
  if (!R.queue.length) {
    const kind = ORDER[R.rot % ORDER.length];
    R.rot++;
    R.queue = segment(kind, w);
  }
  const line = R.queue[0];
  const v = line.voice();
  if (!v) { R.queue.shift(); R.nextAt = w.time + 0.3; return; }
  // false: the channel is taken (a call, banter, a card line): try again soon
  if (!playLineVoice(v.src, v.dur, 'radio')) { R.nextAt = w.time + 1.2; return; }
  R.queue.shift();
  R.played++;
  R.nextAt = w.time + v.dur + (R.queue.length ? 0.5 : 2.2);
}

// Nachtstreek: Rikus between the records, every minute or two.
function nachtstreek(w) {
  if (w.time < R.rikusAt) return;
  const t = pick(NACHTSTREEK);
  const v = lineVoiceFor(NARRATOR, t);
  if (!v) { R.rikusAt = w.time + 30; return; }
  if (!playLineVoice(v.src, v.dur, 'radio')) { R.rikusAt = w.time + 3; return; }
  R.played++;
  R.rikusAt = w.time + 70 + Math.random() * 60;
}
