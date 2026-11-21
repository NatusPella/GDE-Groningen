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
import { setRadioOn, setRadioProgramme, setRadioChannel, radioTrackList, onRadioBreak, radioInBreak, playLineVoice, playRadioJingle, playTextMumble } from './audio.js';
import { lineVoiceFor, NARRATOR } from './linevoice.js';
import { smsVoiceFor, SMS_SAY } from './smsvoice.js';
import { NACHTSTREEK, KROLBRUG_FAULTS, COW_FEED, PLANTSOEN_NEWS, EVENT_DAYS } from './flavourlines.js';
import { RADIO_HOST, RADIO_GRUNN, KERMIS_NEWS } from './funlines.js';
import { STATION_NAME, normalizeRadio } from './musicpick.js';
import { channelById, channelStatus, listChannels, openChannels, nextChannel, validChannel, programmeFor, isUnlocked, DEFAULT_CHANNEL } from './radiochannels.js';
import { talkActive } from './storytalk.js';
import { playerBusy } from './busy.js';
import { radioMayTalk } from './speech.js';
import { createAdState, noteBreak, planAdBlock, commitAdBlock, blockLines } from './radioads.js';
import { showRadioSub, hideRadioSub } from './radiosub.js';
import { kiesVers, leesPraatStaat, schrijfPraatStaat } from './radiopraat.js';
import { KEYS } from './storagekeys.js';

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
// what audio.js plays: alleen wat de speler zelf aanzet. Een minigame of de
// helirun zet de radio niet meer zelf aan (#502), dus dit volgt `on`.
let playing = true;
let channelId = DEFAULT_CHANNEL;
let prog = programmeFor(channelById(channelId), 12);
// the player's secrets (geheimen.js, in the save): main.js sets the source, so this module does not import the whole achievement layer
let foundSource = () => new Set();
let channelCheckAt = 0;
const R = { queue: [], nextAt: 0, rot: {}, recent: [], played: 0, done: null, breakUntil: 0 };
// the adverts (radioads.js, #409): when the last block ran, how many breaks ago, which ones were heard
const ADS = createAdState();
let subOn = false;
// tot wanneer de ondertitel van een opgenomen regel mag blijven staan (world.time, geen klok-timer:
// een menu pauzeert de wereld en dan hoort de regel ook te blijven)
let subUntil = 0;

// a line that did not just go out when the pool has another one; the rotation, the recent lines and the played adverts
// are kept between sessions (radiopraat.js, #985), like the music history
const fresh = (a) => kiesVers(a, R.recent);
function loadTalkState() {
  try {
    const st = leesPraatStaat(localStorage.getItem(KEYS.radioTalk));
    R.rot = st.rot; R.recent = st.recent; ADS.history = st.ads.history; ADS.blocks = st.ads.blocks;
  } catch (e) { /* no storage */ }
}
function saveTalkState() {
  try { localStorage.setItem(KEYS.radioTalk, schrijfPraatStaat({ rot: R.rot, recent: R.recent, ads: ADS })); } catch (e) { /* private mode */ }
}

export function radioIsOn() {
  return on;
}

export function setRadioFound(fn) {
  foundSource = typeof fn === 'function' ? fn : () => new Set();
}

// --- the channels (radiochannels.js, ADR 0046) ---------------------------------------------------------------------
const channelCtx = () => ({ found: foundSource() });
const manifestTracks = () => radioTrackList().map((el) => el.gmusicTrack).filter(Boolean);
// the list for the menu: open and 'soon' channels, never a secret one that has not been found
export function channelList() {
  return listChannels(manifestTracks(), channelCtx()).map((z) => ({ ...z, active: z.id === channelId }));
}
export const currentChannel = () => channelId;
const openChannelIds = () => openChannels(manifestTracks(), channelCtx());

// stored: { id, announced }: the chosen channel and the secret channels whose message has already been shown (this device)
let announced = [];
let wanted = DEFAULT_CHANNEL; // what was stored; the save is sometimes not loaded yet at start-up, so this is applied later after all
function saveChannel() {
  try { localStorage.setItem(KEYS.radioChannel, JSON.stringify({ id: channelId, announced })); } catch (e) { /* private mode */ }
}
function loadChannel() {
  try {
    const d = JSON.parse(localStorage.getItem(KEYS.radioChannel) || 'null');
    if (d && typeof d.id === 'string') { announced = Array.isArray(d.announced) ? d.announced.filter((x) => typeof x === 'string') : []; return d.id; }
  } catch (e) { /* broken value: G-Music */ }
  return DEFAULT_CHANNEL;
}

// The channel's DJ introduces himself with a short text jingle: the subtitle and the soft mumble voice, no new recording.
function announceChannel(z) {
  if (!world || !z || !radioMayTalk()) return;
  subOn = true;
  showRadioSub(z.dj, z.ident);
  subUntil = world.time + 4;
  playTextMumble('R', z.ident, 3);
}

// Pick a channel (menu, Shift+N). Only an open channel; a hidden or 'soon' channel does nothing. Picking a channel turns the radio on:
// whoever picks a channel wants to hear it.
export function selectChannel(id, { announce: show = true } = {}) {
  if (!openChannelIds().includes(id)) return false;
  const z = channelById(id);
  const was = channelId;
  channelId = id;
  wanted = id;
  saveChannel();
  if (!on) setRadio(true, { announce: false });
  if (was !== id) {
    R.done = null; R.queue = []; hideSub();
    setRadioChannel(id);
    if (world) { prog = programmeFor(z, world.clock); setRadioProgramme(prog); }
    if (show) { if (world) announce(world); announceChannel(z); }
  }
  return true;
}
export function stepChannel(dir = 1) {
  return selectChannel(nextChannel(channelId, openChannelIds(), dir));
}
export const channelStatuses = () => channelStatus(manifestTracks(), channelCtx());

// A newly found secret channel: one message per device. The stored choice also comes back here once the save has its secrets
// (at start-up they are sometimes not there yet); a channel that is no longer open (another game loaded) becomes G-Music.
function checkNewChannels(w) {
  if (w.time < channelCheckAt) return;
  channelCheckAt = w.time + 1.5;
  if (!radioTrackList().length) return;
  const open = openChannelIds();
  const added = open.filter((id) => channelById(id) && channelById(id).unlock && !announced.includes(id));
  if (added.length) {
    announced = [...announced, ...added];
    saveChannel();
    for (const id of added) w.addMessage(`Nieuwe zender gevonden: ${channelById(id).name}. Kies hem in Instellingen > Geluid, of houd Shift ingedrukt en druk op N.`, 6);
  }
  const target = channelId === DEFAULT_CHANNEL && wanted !== DEFAULT_CHANNEL && open.includes(wanted) ? wanted : validChannel(channelId, open);
  if (target !== channelId) {
    channelId = target;
    setRadioChannel(channelId);
    prog = programmeFor(channelById(channelId), w.clock);
    setRadioProgramme(prog);
  }
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
  if (!on) { R.done = null; R.queue = []; playing = false; setRadioOn(false); hideSub(); }
  if (show && world) announce(world);
  return on;
}

export function initRadio(w) {
  world = w;
  loadTalkState();
  // de bewaarde zender: een geheime zender die niet gevonden is, kan hier niet uit een oude of gedeelde opslag komen
  wanted = loadChannel();
  const stored = channelById(wanted);
  channelId = stored && isUnlocked(stored, channelCtx()) ? stored.id : DEFAULT_CHANNEL;
  setRadioChannel(channelId);
  prog = programmeFor(channelById(channelId), w.clock);
  setRadioProgramme(prog);
  onRadioBreak((done) => startBreak(done));
  window.__radio = {
    on: () => on,
    toggle: () => setRadio(!on),
    programme: () => prog.id,
    station: () => channelId,
    stations: () => channelList().map((z) => z.id + ':' + z.status),
    pick: (id) => selectChannel(id),
    next: (dir) => stepChannel(dir),
    queue: () => R.queue.map((l) => l.speaker + ': ' + l.text),
    inBreak: () => radioInBreak(),
    played: () => R.played,
    ads: () => ({ blocks: ADS.blocks, since: ADS.breaks, history: [...ADS.history] }),
    // debug and scripts/qa/tester_radioads.page.js: start an advert block now, as if the gate were open
    adBlock: () => { ADS.breaks = Infinity; ADS.lastAt = -Infinity; R.queue = segment('reclame', world); R.done = R.done || (() => {}); R.nextAt = world.time; R.breakUntil = world.time + BREAK_MAX; return R.queue.length; },
    ducked: () => ducked(world),
  };
}

function announce(w) {
  w.nowPlaying = on
    ? { title: prog.name, artist: prog.sub, station: prog.stationName || STATION_NAME, programme: prog.name, at: w.time }
    : { title: 'Even stilte', artist: '', station: 'Radio uit', at: w.time };
}

// The new story keeps the radio to the world: Rikus does not talk while a mission or a conversation
// runs (a story scene, a call, the pair talking), and stays quiet until the mission is over.
const ducked = (w) => !!((w.mission && w.mission.phase === 'active') || talkActive() || w.storyContact || (typeof document !== 'undefined' && document.body.classList.contains('cine-hide-hud')));
const busy = (w) => w.paused || playerBusy(w, ['activityGame', 'padel', 'heliRun', 'pigeon']).busy || ducked(w);

// N zet de radio altijd om, behalve midden in een filmpje: daar is de toets van
// de scène en praat de verteller al niet (ducked). Een minigame, padel, de
// helirun en de duifmodus laten de radio met rust, want de speler moet hem ook
// daar uit kunnen zetten; alleen het pauzemenu houdt de toets nog tegen (#502).
export function radioKeyBlocked(w) {
  return !!w.paused || playerBusy(w, ['cinematic']).busy
    || (typeof document !== 'undefined' && document.body.classList.contains('cine-hide-hud'));
}

export function updateRadio(dt, w) {
  if (subOn && w.paused) hideSub();
  // een opgenomen radiolijn is klaar: haal zijn ondertitel weg (de wereldklok staat stil in een menu)
  else if (subOn && subUntil && w.time >= subUntil) hideSub();
  // N zet de radio aan of uit; Shift+N gaat naar de volgende zender (ook als de radio uit stond: dan gaat hij aan)
  if (!radioKeyBlocked(w) && w.input.wasPressed('n')) { if (w.input.isDown('shift')) stepChannel(1); else setRadio(!on); }
  checkNewChannels(w);
  // Alleen de speler zet de radio aan. Vroeger stond hier `on || playerBusy(...)`,
  // waardoor een minigame, de helirun en de duifmodus hem zelf weer aanzetten en
  // de keuze van de speler overschreven (#502).
  if (on !== playing) { playing = on; setRadioOn(on); }
  const next = programmeFor(channelById(channelId), w.clock);
  if (next.id !== prog.id || next.channel !== prog.channel) {
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
  noteBreak(ADS);
  const kinds = prog.talk;
  const i = R.rot[prog.id] || 0;
  R.rot[prog.id] = i + 1;
  R.queue = segment(kinds[i % kinds.length], w);
  saveTalkState();
  R.done = done;
  R.nextAt = w.time + 0.4;
  R.breakUntil = w.time + BREAK_MAX;
}

function hideSub() {
  subOn = false;
  hideRadioSub();
}

function endBreak() {
  hideSub();
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
  const t = fresh(texts).replace(/^KIEKDOAR( MELDT)?:\s*/i, '');
  return { speaker: 'Kiekdoar-redactie', text: t, voice: () => smsVoiceFor({ from: 'Kiekdoar', text: t }, lineVoiceFor) };
}

function rikus() {
  const t = fresh(NACHTSTREEK);
  return { speaker: NARRATOR, text: t, voice: () => lineVoiceFor(NARRATOR, t) };
}

function segment(kind, w) {
  const G = RADIO_GRUNN;
  const storm = !!(w.weather && w.weather.active && w.weather.intensity > 0.7);
  const wet = !!(w.weather && w.weather.active && w.weather.intensity > 0.15);
  if (kind === 'ident') return [host(fresh(G.ident))];
  if (kind === 'dj') { const z = channelById(channelId); return z && z.lines ? [{ speaker: z.dj, text: fresh(z.lines), textOnly: true, dur: 4 }] : [host(fresh(G.ident))]; }
  if (kind === 'news') return [host(fresh(G.news)), news()];
  if (kind === 'clip') return [clip(fresh(NEWS_CLIPS))];
  if (kind === 'ad') return [host(fresh(G.ads))];
  if (kind === 'reclame') {
    // an advert block now and then (not at night, not twice in a row): without one the recorded advert goes out instead
    const block = planAdBlock(ADS, { now: w.time, progId: prog.id });
    if (!block) return [host(fresh(G.ads))];
    commitAdBlock(ADS, block, w.time);
    return blockLines(block);
  }
  if (kind === 'traffic') { const t = fresh(KROLBRUG_FAULTS); return [host(fresh(G.traffic)), { speaker: 'Verkeersinformatie', text: t, voice: () => lineVoiceFor('Verkeersinformatie', t) }]; }
  if (kind === 'weather') return storm ? [host(fresh(G.weatherRain)), clip(STORM_CLIP)] : [host(fresh(wet ? G.weatherRain : G.weatherSun))];
  if (kind === 'cows') {
    const [cow, t] = fresh(Object.values(COW_FEED).flat());
    return [host(fresh(G.cows)), { speaker: 'Koe ' + cow, text: t, voice: () => lineVoiceFor('Koe ' + cow, t) }];
  }
  // at night Rikus presents himself; by day Geesje passes him on
  if (kind === 'rikus') return prog.id === 'nacht' || prog.channel === 'nachtstreek' ? [rikus()] : [host(fresh(G.rikus)), rikus()];
  return [host(fresh(G.ident))];
}

function talk(w) {
  if (w.time < R.nextAt) return;
  if (!R.queue.length) { endBreak(); return; }
  const line = R.queue[0];
  if (line.textOnly) return talkText(w, line);
  const v = line.voice();
  if (!v) { R.queue.shift(); R.nextAt = w.time + 0.3; return; }
  // false: the channel is taken (a call, banter, a card line): try again soon
  if (!playLineVoice(v.src, v.dur, 'radio')) { R.nextAt = w.time + 1.2; return; }
  R.queue.shift();
  R.played++;
  // Een opgenomen radiolijn kreeg geen ondertitel: alleen de reclames (textOnly) deden dat. De
  // instellingen beloven ondertitels voor "filmpjes, gesprekken, telefoon, radio en naamkaarten",
  // dus wie doof is of de radio in een lawaaiige omgeving aan heeft, miste het hele praatblok.
  if (line.text) {
    subOn = true;
    showRadioSub(line.speaker, line.text);
    // de ondertitel gaat weg als de regel klaar is; de volgende regel zet zijn eigen eindtijd
    subUntil = w.time + Math.max(1.5, (v.dur || 3) + 0.4);
  }
  R.nextAt = w.time + v.dur + (R.queue.length ? 0.5 : 1.2);
}

// A line without a recording (the adverts): a jingle, or the subtitle with a soft mumble under it for the station's voice.
// It waits for the same silence as a recorded line (speech.js radioMayTalk), and talk() is not called during a call or a mission.
function talkText(w, line) {
  if (!radioMayTalk()) { R.nextAt = w.time + 1.2; return; }
  R.queue.shift();
  R.played++;
  if (line.jingle) { hideSub(); playRadioJingle(line.jingle); } else {
    subOn = true;
    showRadioSub(line.speaker, line.text);
    subUntil = w.time + Math.max(1.5, (line.dur || 3) + 0.4);
    playTextMumble('R', line.text, line.dur);
  }
  R.nextAt = w.time + line.dur;
}
