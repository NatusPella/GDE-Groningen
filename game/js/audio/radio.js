// De radio en de G-Music-machine, uit audio.js gehaald (#519): de zenderstand
// met zijn programma en onderbrekingen, de wachtrij met jingles en nummers, de
// twee noodgrepen voor een dode zender en de per-beeld-afhandeling
// updateGMusic(). Wat dit bestand uit de audiograaf nodig heeft — de muziekbus,
// de gainstand, de stingdemping, de klok en de scenariomuziek — komt via één
// setter, setRadioDeps(), net als bij audio/vehiclevoices.js. Zo importeert dit
// bestand niets terug uit audio.js en blijft de module-cyclus op 0. Verder is
// dit een verplaatsing: dezelfde namen, dezelfde volgorde, dezelfde commentaren.
import { getSettings } from '../settings.js';
import { isThemeActive } from '../theme.js';
import { KEYS } from '../storagekeys.js';
import { MIN_TRACK_S, normalizeTrack, pickTrack, pushHistory, pickJingle, STATION_NAME } from '../musicpick.js';
import { createMusicWatch } from '../musicwatch.js';
import * as speech from '../speech.js';
import { GMUSIC_VOLUME, musicBusGain } from '../sfx/volume.js';
import { GMUSIC_PRELOAD_AHEAD } from './gmusicpreload.js';

const GMUSIC_MANIFEST_URL = './audio/gmusic/manifest.json';
const GMUSIC_DUCK_VOLUME = 0.5;
const GMUSIC_JINGLES = {
  station_id: './audio/gmusic/jingles/station_id.wav',
  nummerovergang: './audio/gmusic/jingles/nummerovergang.wav',
  rij_knipoog: './audio/gmusic/jingles/rij_knipoog.wav',
  hoge_wanted: './audio/gmusic/jingles/hoge_wanted.wav',
};
const AMBIENT_JINGLE_KEYS = ['station_id', 'nummerovergang', 'rij_knipoog'];

// De knoppen van de audiograaf in audio.js, neergezet vanuit buildGraph() waar
// de muziekbus, de gainstand en de ctx bestaan. `fix` en `resumeCtx` zijn de
// noodgrepen van de watchdog daarginds: de teller en het logboek blijven daar,
// dus de melding dat de radio iets repareerde komt daar ook vandaan.
let ctx = null;
let musicBus = null;
let musicState = null;
let stingDuckMul = () => 1;
let fix = () => {};
let resumeCtx = () => {};
let scenarioPlaying = () => false;   // speelt er een scenariotrack? (scenarioNow in audio.js)
let updateScenarioMusic = () => null;
let nowSec = () => performance.now() / 1000;

export function setRadioDeps(deps) {
  ({ ctx, musicBus, musicState, stingDuckMul, fix, resumeCtx, scenarioPlaying, updateScenarioMusic, nowSec } = deps);
}

// The radio (radio.js): one station, on or off. Off holds the music like a
// scenario track does. The programme (musicpick.js PROGRAMMES) picks the
// pool and the jingles; a new programme starts with the next record.
// Every `every` records the radio takes a talk break: the record ends, the
// break handler voices its segment and calls done, then the music goes on.
export let radioOn = true;
export let radioProg = { name: '', music: 'gmusic', jingles: true, every: 3 };
let radioBreak = null;
let breakId = 0;
let inBreak = false;
let recordsSinceBreak = 0;
const radioHolds = () => !radioOn;
export function setRadioOn(on) {
  const was = radioOn;
  radioOn = !!on;
  if (radioOn && !was) freshPick = true;
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

// Fire-and-forget: initAudio() stays sync, this just fills in gmusicTracks
// whenever the manifest resolves. An empty or missing manifest leaves it
// empty, which every playback path below treats as "nothing to play".
export async function loadGMusicManifest() {
  try {
    const res = await fetch(GMUSIC_MANIFEST_URL);
    if (!res.ok) return;
    const data = await res.json();
    const tracks = (Array.isArray(data.tracks) ? data.tracks : []).map(normalizeTrack).filter(Boolean);
    gmusicTracks = tracks.map((t) => {
      const el = wireGmusicEl(new Audio('./audio/gmusic/' + t.file));
      // #660: geen preload='auto' meer voor alle 34 nummers (~128 MB); het
      // speelvenster wordt pas gearmd als het aan de beurt is (armGmusicQueue).
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

function trackArtist(title) {
  if (GMUSIC_ARTISTS[title]) return GMUSIC_ARTISTS[title];
  let h = 0;
  for (const c of String(title)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return GMUSIC_SPARE_ARTISTS[h % GMUSIC_SPARE_ARTISTS.length];
}

function wireGmusicEl(el) {
  // #660: pas belasten als dit nummer (of de volgende) aan de beurt is
  el.preload = 'none';
  try {
    // #592: bewaar de node op het element. Een weggegooid element met een node blijft anders via de
    // audiograaf hangen (removeAttribute('src') + load() geven hem niet vrij) en elke revive lekt er een.
    const node = ctx.createMediaElementSource(el);
    node.connect(musicBus);
    el.gmusicNode = node;
  } catch (e) { /* geen graaf: dan speelt dit element gewoon zonder node */ }
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

// Een element dat we loslaten (dode zender, vervangen jingle) eerst uit de graaf halen (#592).
function discardGmusicEl(el) {
  if (!el || !el.gmusicNode) return;
  try { el.gmusicNode.disconnect(); } catch (e) { /* al los */ }
  el.gmusicNode = null;
}

// one element per jingle, reused: a fresh one per cycle stayed wired to the
// music bus for good and piled up media players over a long session
const jingleEls = {};
function makeJingleEl(key) {
  const old = jingleEls[key];
  if (old && !old.error && old !== gmusicCurrentEl) return old;
  // een dode of vervangen jingle gaat de deur uit: zijn node hoort niet in de graaf te blijven (#592)
  if (old && (old !== gmusicCurrentEl || old.error)) discardGmusicEl(old);
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
let freshPick = false; // radio just switched on: new records first (musicpick.js NIEUW)
function nextTrackEl() {
  const good = gmusicTracks.filter((x) => !x.gmusicBad);
  const t = pickTrack((good.length ? good : gmusicTracks).map((el) => el.gmusicTrack), gmusicHistory, { station: radioProg.music, hour: musicHour, fresh: freshPick });
  freshPick = false;
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
// #660: alleen het nummer dat speelt en de volgende in de wachtrij bufferen
function armGmusicEl(el) {
  if (!el || el.preload === 'auto') return;
  el.preload = 'auto';
  try { el.load(); } catch (e) { /* geen bron meer */ }
}
function armGmusicQueue() {
  armGmusicEl(gmusicCurrentEl);
  for (let i = 0; i < GMUSIC_PRELOAD_AHEAD && i < gmusicQueue.length; i++) armGmusicEl(gmusicQueue[i]);
}

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
  armGmusicQueue();

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
  armGmusicQueue();
  playGmusicCurrent();
}

// Queued rather than layered over the running track: it replaces the next
// ambient jingle so music never overlaps.
export function enqueueGmusicJingle(key) {
  if (!gmusicStarted || !speech.radioMayTalk() || !radioOn || !radioProg.jingles) return;
  const next = gmusicQueue[0];
  if (next && next.gmusicJingleKey === key) return;
  const el = makeJingleEl(key);
  if (next && next.gmusicJingleKey) gmusicQueue[0] = el;
  else gmusicQueue.unshift(el);
}

// A music element that failed (network hiccup, decoder gone) is swapped for
// a fresh one on the same file, so the station keeps going.
function reviveGmusicEl(el) {
  discardGmusicEl(el); // #592: eerst de node van het dode element loskoppelen; daarna pas het element loslaten
  const fresh = wireGmusicEl(new Audio(el.src));
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

export function updateGMusic(dt, world) {
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
  musicBus.gain.value = musicBusGain(getSettings(), musicState.gain) * stingDuckMul(dt);
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

// De tab gaat naar de achtergrond of komt terug (visibilitychange in audio.js):
// de zender zwijgt en gaat mee met de ctx, en pakt daarna de wachtrij weer op.
export function radioSleep() {
  gmusicSuspended = true;
  if (gmusicCurrentEl && !gmusicCurrentEl.paused) gmusicCurrentEl.pause();
}
export function radioWake() {
  gmusicSuspended = false;
  gmusicRetryAt = 0;
}

// Een echte handeling van de speler (unlockAudio in audio.js): alles wat de
// browser liet vallen mag weer starten, ook het nummer dat al klaarstond.
export function radioUnlock() {
  gmusicSuspended = false;
  const el = gmusicCurrentEl;
  if (el && el.paused && !el.ended && gmusicPendingSince === null && !gmusicHeld) playGmusicCurrent();
}

// Het G-Music-deel van de watchdog in audio.js: een vastgelopen zender, een
// dode media-element of een teken dat stilviel wordt hier hersteld. De melding
// gaat via fix() terug naar de teller en het logboek daarginds.
const musicWatch = createMusicWatch();
export function radioCtxStalled() {
  if (gmusicSuspended) gmusicSuspended = false;
}
export function radioWasSuspended() {
  if (!gmusicSuspended) return false;
  gmusicSuspended = false;
  gmusicRetryAt = 0;
  return true;
}
export function watchRadio(now) {
  if (gmusicHeld && !scenarioPlaying() && !radioHolds()) { gmusicHeld = false; gmusicRetryAt = 0; playGmusicCurrent(); fix('gmusic-held'); }
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
}

// De testhaak window.__audio.poke() van audio.js: één ding expres kapotmaken,
// de watchdog moet het repareren. Alleen de twee radiostanden wonen hier.
export function radioPoke(what) {
  if (what === 'held') { gmusicHeld = true; return true; }
  if (what === 'gmusic') { gmusicSuspended = true; return true; }
  return false;
}

// Voor audioState() in audio.js: dezelfde velden als altijd, alleen van hier.
export function radioState() {
  return {
    started: gmusicStarted, held: gmusicHeld, suspended: gmusicSuspended, pending: gmusicPendingSince !== null,
    current: gmusicCurrentEl ? (gmusicCurrentEl.gmusicTitle || gmusicCurrentEl.gmusicJingleKey || '?') : null,
    paused: gmusicCurrentEl ? gmusicCurrentEl.paused : null, error: !!(gmusicCurrentEl && gmusicCurrentEl.error),
    tracks: gmusicTracks.length, queue: gmusicQueue.length, history: gmusicHistory.slice(-8),
  };
}

// De fietsen met een speakertje (bikeSpeakers in audio.js) lenen dezelfde
// nummers: alleen lezen, de wachtrij blijft hier.
export function radioTrackEls() {
  return gmusicTracks;
}
export function radioCurrentTrackEl() {
  return gmusicCurrentEl;
}
