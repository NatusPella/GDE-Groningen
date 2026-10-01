// The car radio. In a car, bus, boat or police car N tunes to the next
// station and B to the previous one: G-Music (the soundtrack), Radio
// Nachtstreek (the same records through an old radio, with Rikus talking
// between them), Radio Grunn (talk: Geesje, the Sikkom news, the traffic,
// the cows and Rikus's bits, all recordings the game already has) and off.
// Every vehicle keeps its own station; a stolen one comes with whatever its
// driver had on (a taxi or bus plays Radio Grunn, a tractor Nachtstreek).
// On foot or on a bike G-Music plays as always. audio.js does the music
// side (setRadioStation); the talk goes through the speech channel's
// 'radio' class, so any other voice cuts it off. `window.__radio` debug.
import { setRadioStation, playLineVoice } from './audio.js';
import { lineVoiceFor, NARRATOR } from './linevoice.js';
import { smsVoiceFor, SMS_SAY } from './smsvoice.js';
import { NACHTSTREEK, KROLBRUG_FAULTS, COW_FEED, PLANTSOEN_NEWS, EVENT_DAYS } from './flavourlines.js';
import { RADIO_HOST, RADIO_GRUNN, KERMIS_NEWS } from './funlines.js';

export const STATIONS = [
  { id: 'gmusic', name: 'G-Music', sub: 'Hits uit Grunn' },
  { id: 'nachtstreek', name: 'Radio Nachtstreek', sub: 'Rikus · streekmuziek tot de ochtend' },
  { id: 'grunn', name: 'Radio Grunn', sub: 'Praatradio · Sikkom-nieuws, verkeer en de koeien' },
  { id: 'uit', name: 'Radio uit', sub: 'Even stilte' },
];

let world = null;
let current = 'gmusic';
let lastVeh = null;
let lastOwn = 'gmusic';
const R = { queue: [], nextAt: 0, idx: 0, rikusAt: 0, rot: 0, played: 0 };

const pick = (a) => a[Math.floor(Math.random() * a.length)];

function hasRadio(v) {
  return !!v && !v.isBike && !v.isScooter && !v.sinking && !v.wrecked;
}

function defaultStation(v) {
  const name = String((v.model && (v.model.name || v.model.id)) || v.kind || '').toLowerCase();
  if (v.isBus || /taxi/.test(name)) return 'grunn';
  if (/trekker|tractor|limo/.test(name)) return 'nachtstreek';
  if (v.isPolice) return 'grunn';
  const r = Math.random();
  return r < 0.6 ? 'gmusic' : r < 0.82 ? 'grunn' : 'nachtstreek';
}

export function initRadio(w) {
  world = w;
  window.__radio = {
    station: () => current,
    stations: () => STATIONS.map((s) => s.id),
    tune: (id) => { const v = w.player.inVehicle; if (!hasRadio(v) || !STATIONS.some((s) => s.id === id)) return false; v.radioStation = id; return true; },
    queue: () => R.queue.map((l) => l.speaker + ': ' + l.text),
    played: () => R.played,
  };
}

function announce(w, st) {
  w.nowPlaying = { title: st.name, artist: st.sub, at: w.time };
}

function tune(w, v, dir) {
  const i = STATIONS.findIndex((s) => s.id === (v.radioStation || current));
  const st = STATIONS[(i + dir + STATIONS.length) % STATIONS.length];
  v.radioStation = st.id;
  announce(w, st);
  // a fresh start on the talk station: the ident first
  if (st.id === 'grunn') { R.queue = []; R.nextAt = w.time + 0.6; R.rot = 0; }
  if (st.id === 'nachtstreek') R.rikusAt = w.time + 4;
}

export function updateRadio(dt, w) {
  const p = w.player;
  const v = p.inVehicle;
  const input = w.input;
  let want = 'gmusic';
  if (hasRadio(v) && v.driver === 'player') {
    // your own car plays what you last listened to; a stolen one its driver's station
    if (!v.radioStation) v.radioStation = v.isHeroCar || v.playerOwned ? lastOwn : defaultStation(v);
    if (v.isHeroCar || v.playerOwned) lastOwn = v.radioStation;
    if (v !== lastVeh && v.radioStation !== 'gmusic') announce(w, STATIONS.find((s) => s.id === v.radioStation));
    lastVeh = v;
    const busy = w.paused || w.activityGame || w.padelGame;
    if (!busy && input.wasPressed('n')) tune(w, v, 1);
    else if (!busy && input.wasPressed('b')) tune(w, v, -1);
    want = v.radioStation;
  } else lastVeh = null;
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

// --- Radio Grunn: segments of host + content -----------------------------------------------

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
  const t = pick(texts).replace(/^SIKKOM( MELDT)?:\s*/i, '');
  return { speaker: 'Sikkom-redactie', text: t, voice: () => smsVoiceFor({ from: 'Sikkom', text: t }, lineVoiceFor) };
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
