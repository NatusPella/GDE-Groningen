// Tammo and Tessa talk in the car (docs/verhaal-voorstel.md §4). Plays the
// exchanges in banterlines.js while both ride in the same vehicle with no
// stars, no mission or bijbaantje running, no cutscene and no phone. Triggers
// by priority: after a mission or shift, the next story step, places and
// wijken, then situations and idle chit-chat. A crash or new stars cut the
// talk off with a short reaction; an interrupted nabespreking comes back once.
// Story progress is only read (story.js, missions.js), never written.

import { setDualText } from './subtitles.js';
import { paintSpeaker } from './speakers.js';
import { REACTIONS, SPEAKERS } from './banterlines.js';
import { STEPS, missionIndexOf } from './storyarc.js';
import { currentStep, getStorySave } from './story.js';
import { isMissionActive, isMissionCompleted } from './missionquery.js';
import { getSideJobList } from './sidejobs.js';
import { isCinematicActive } from './cinematics.js';
import { registerNarrative, mayStart, storyWaiting } from './narrative.js';
import { isPhoneOpen } from './pausestate.js';
import { playBanterVoice, stopBanterVoice, pauseBanterVoice, voiceBusy } from './audio.js';
import { hold as holdChannel, release as releaseChannel } from './speech.js';
import { KEYS } from './storagekeys.js';
import { banterExchanges, storyDataReady } from './storytext.js';
import { openBank } from './voicebank.js';

const GLOBAL_CD = 75;
const PLACE_CD = 600;
const SITUATION_CD = 180;
const AFTER_VALID = 300;
const AFTER_GAP = 8;
const IDLE_GAP = 120;
const IDLE_CHANCE = 0.03;
const MIN_RIDE = 6;
const MIN_SPEED = 15 / 3.6;
const FAST = 100 / 3.6;
const FAST_HOLD = 2;
const HELI_HOLD = 8;
const EVENT_VALID = 45;
const PLACE_R = 90;
const CRASH_MIN = 0.3;
const CHECK_EVERY = 0.5;
const PROGRESS_EVERY = 2;
const LINE_GAP = 0.3;
const REPEAT_AFTER_MS = 3 * 3600 * 1000;
const HEARD_KEY = KEYS.banter;

const VOICE_DIR = openBank('banter').dir;
const voices = openBank('banter').entries;

let BY_TRIGGER = new Map();
let BY_ID = new Map();
let PLACE_NAMES = new Set();
let WIJK_NAMES = new Set();
function indexPool(pool) {
  BY_TRIGGER = new Map();
  for (const ex of pool) {
    if (!BY_TRIGGER.has(ex.trigger)) BY_TRIGGER.set(ex.trigger, []);
    BY_TRIGGER.get(ex.trigger).push(ex);
  }
  BY_ID = new Map(pool.map((ex) => [ex.id, ex]));
  PLACE_NAMES = new Set(pool.filter((ex) => ex.trigger.startsWith('place:')).map((ex) => ex.trigger.slice(6)));
  WIJK_NAMES = new Set(pool.filter((ex) => ex.trigger.startsWith('wijk:')).map((ex) => ex.trigger.slice(5)));
}
// The story talks from the script (storytext.js banterExchanges); the pool is indexed once the script data has loaded.
let poolReady = false;
indexPool([]);

let world = null;
let heard = loadHeard();
let st = fresh();
registerNarrative('banter', { active: () => !!st.talk });
registerNarrative('sub-banter', { active: () => !!st.talk && !st.paused });

function fresh() {
  return {
    ride: 0, lastEnd: 0, checkT: 0, progressT: PROGRESS_EVERY, talk: null, paused: false,
    pending: [], rest: null, placeCd: new Map(), sitCd: new Map(), situations: [], wijk: null, wijkEntered: null,
    mission: null, job: null, lastImpact: undefined, wanted: 0, flash: -Infinity, weather: '', hour: null, fastT: 0,
    done: new Set(), step: null, places: null,
  };
}

function loadHeard() {
  try { return JSON.parse(localStorage.getItem(HEARD_KEY) || '{}') || {}; } catch (e) { return {}; }
}

function saveHeard() {
  try { localStorage.setItem(HEARD_KEY, JSON.stringify(heard)); } catch (e) { /* ignore */ }
}

// --- story progress (read-only) --------------------------------------------------

function refreshProgress() {
  if (!poolReady && storyDataReady()) { poolReady = true; st.places = null; indexPool(banterExchanges()); }
  let save = null;
  try { save = getStorySave(); } catch (e) { save = null; }
  const done = new Set([...(save ? save.done : []), ...(save ? save.skipped : [])]);
  for (const s of STEPS) if (s.kind === 'mission' && s.mission && isMissionCompleted(missionIndexOf(s.mission))) done.add(s.id);
  // an activity counts as done once a later mission is (like story.js isDone)
  let later = false;
  for (let k = STEPS.length - 1; k >= 0; k--) {
    const s = STEPS[k];
    if (s.kind === 'activity' && later) done.add(s.id);
    if (s.kind === 'mission' && done.has(s.id)) later = true;
  }
  st.done = done;
  let cur = null;
  try { cur = currentStep(); } catch (e) { cur = null; }
  st.step = !cur ? null : cur.end ? 'end:' + cur.end : cur.id;
}

const list = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

function inStoryOrder(code) {
  const k = STEPS.findIndex((s) => s.id === code);
  return k >= 0 && STEPS.slice(0, k).every((s) => s.kind !== 'mission' || !s.mission || st.done.has(s.id));
}

function gateOk(ex) {
  if (!list(ex.needs).every((id) => st.done.has(id))) return false;
  if (list(ex.until).some((id) => st.done.has(id))) return false;
  if (ex.arc) {
    const m = /^after:(H\d+):/.exec(ex.trigger);
    if (m && !inStoryOrder(m[1])) return false;
  }
  return true;
}

// unheard first; `repeat` also allows the least recently heard (after-lines)
// or ones heard long enough ago (places, situations, idle)
function pick(trigger, repeat) {
  const all = (BY_TRIGGER.get(trigger) || []).filter(gateOk);
  if (!all.length) return null;
  const fresh = all.filter((ex) => !heard[ex.id]);
  if (fresh.length) return fresh[Math.floor(Math.random() * fresh.length)];
  if (!repeat) return null;
  const sorted = all.slice().sort((a, b) => heard[a.id] - heard[b.id]);
  if (repeat === 'any') return sorted[0];
  return Date.now() - heard[sorted[0].id] > REPEAT_AFTER_MS ? sorted[0] : null;
}

// --- events -----------------------------------------------------------------------

function pushSituation(kind) {
  st.situations = st.situations.filter((s) => s.kind !== kind);
  st.situations.push({ kind, at: world.time });
}

function watchEvents(dt) {
  const w = world;
  const active = isMissionActive();
  if (active && !st.mission) st.mission = { code: w.mission && w.mission.code, base: w.stats.missionsDone };
  else if (!active && st.mission) {
    const m = st.mission;
    st.mission = null;
    if (m.code) addAfter(`after:${m.code}:${w.stats.missionsDone > m.base ? 'pass' : 'fail'}`);
  }
  const sj = w.sideJob;
  if (sj && sj.active && !st.job) st.job = { id: sj.id, rounds: jobRounds(sj.id) };
  else if (!(sj && sj.active) && st.job) {
    const j = st.job;
    st.job = null;
    addAfter(`after:job:${j.id}:${jobRounds(j.id) > j.rounds ? 'pass' : 'fail'}`);
  }

  let flash = -Infinity;
  for (const cam of w.flitspaalen || []) if (Number.isFinite(cam.lastFine) && cam.lastFine > flash) flash = cam.lastFine;
  if (flash > st.flash && st.flash !== -Infinity) pushSituation('flitser');
  st.flash = flash;

  const wx = w.weather;
  const kind = wx && wx.active && wx.intensity > 0.2 ? wx.kind : '';
  if (kind && kind !== st.weather) pushSituation(kind === 'motregen' || kind === 'regenbui' ? 'rain' : kind);
  st.weather = kind;

  const hour = Number.isFinite(w.clock) ? w.clock : null;
  if (hour != null && st.hour != null) {
    if (st.hour < 22 && hour >= 22) pushSituation('night');
    if (st.hour < 5.8 && hour >= 5.8 && hour < 8) pushSituation('dawn');
  }
  st.hour = hour;

  const v = w.player.inVehicle;
  st.fastT = v && !v.isHeli && Math.abs(v.speed || 0) > FAST ? st.fastT + dt : 0;
  if (st.fastT > FAST_HOLD && st.fastT - dt <= FAST_HOLD) pushSituation('speed');
  // a while up in the own helicopter, above the rooftops
  st.heliT = v && v.isHeli && !v.onGround && v.z - (v.groundZ || 0) > 20 ? (st.heliT || 0) + dt : 0;
  if (st.heliT > HELI_HOLD && st.heliT - dt <= HELI_HOLD) pushSituation('heli');

  st.situations = st.situations.filter((s) => w.time - s.at < EVENT_VALID);
}

function jobRounds(id) {
  try {
    const j = getSideJobList().find((q) => q.id === id);
    return j ? j.rounds || 0 : 0;
  } catch (e) { return 0; }
}

function addAfter(trigger) {
  st.pending = st.pending.filter((p) => p.trigger !== trigger);
  st.pending.push({ trigger, at: world.time });
}

// after:<id>:pass|fail for things outside missions and bijbaantjes (postgame.js)
export function banterAfter(trigger) {
  if (world) addAfter(trigger);
}

function placeList() {
  if (st.places) return st.places;
  const meta = world.map && world.map.meta;
  st.places = ((meta && meta.landmarks) || []).filter((l) => PLACE_NAMES.has(l.name));
  return st.places;
}

function watchWijk() {
  const pts = world.map && world.map.meta && world.map.meta.neighbourhoodPoints;
  if (!pts) return;
  const { x, y } = world.player;
  let best = null, bestD2 = Infinity;
  for (const p of pts) {
    const d2 = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d2 < bestD2) { bestD2 = d2; best = p; }
  }
  const name = best ? best.name : null;
  if (name !== st.wijk) {
    if (st.wijk !== null && WIJK_NAMES.has(name)) st.wijkEntered = { name, at: world.time };
    st.wijk = name;
  }
}

// --- when they may talk -------------------------------------------------------------

function together() {
  const w = world;
  const p = w.player, c = w.companion, v = p && p.inVehicle;
  return !!(v && c && c.inVehicle === v && c.state !== 'dead' && !v.wrecked && !v.sinking && !w.pigeonMode && !w.pendingRespawn);
}

function quiet() {
  const w = world;
  return w.wanted === 0 && !isMissionActive() && !(w.sideJob && w.sideJob.active) && !w.challenge && !isCinematicActive() && !isPhoneOpen() && !w.storyContact && mayStart('banter');
}

// --- conversation ---------------------------------------------------------------------

function lineDur([s, text]) {
  const v = voices[SPEAKERS[s] + '|' + text];
  return v ? v.dur + 0.25 : Math.max(1.8, Math.min(5.5, 1.2 + text.length * 0.055));
}

function start(ex, lines, kind) {
  st.talk = { ex, lines, kind, i: -1, t: 0, until: 0 };
  // the exchange holds the voice channel; a call or story scene cuts it off
  holdChannel('banter', 'banter', () => { if (st.talk) interrupt(null); }, { alive: () => !!st.talk });
  if (ex) { heard[ex.id] = Date.now(); saveHeard(); }
  nextLine();
}

function nextLine() {
  const tk = st.talk;
  tk.i++;
  if (tk.i >= tk.lines.length) { end(); return; }
  const l = tk.lines[tk.i];
  const v = voices[SPEAKERS[l[0]] + '|' + l[1]];
  if (v) playBanterVoice(VOICE_DIR + v.src);
  else stopBanterVoice();
  tk.t = 0;
  tk.until = lineDur(l) + (tk.i < tk.lines.length - 1 ? LINE_GAP : 0);
  showSub(l);
}

function end() {
  st.talk = null;
  st.lastEnd = world.time;
  stopBanterVoice();
  releaseChannel('banter');
  showSub(null);
}

// Cut the talk off. A nabespreking keeps the rest (from the cut line) for later.
function interrupt(reaction) {
  const tk = st.talk;
  if (tk && tk.kind === 'after' && tk.i < tk.lines.length && !tk.resumed) {
    st.rest = { ex: tk.ex, lines: tk.lines.slice(Math.max(0, tk.i)), at: world.time };
  }
  end();
  if (reaction) {
    const pool = REACTIONS[reaction] || [];
    if (pool.length) start(null, [pool[Math.floor(Math.random() * pool.length)]], 'react');
  }
}

function tryStart() {
  const w = world;
  const now = w.time;
  st.pending = st.pending.filter((p) => now - p.at < AFTER_VALID);
  if (st.rest && now - st.rest.at > AFTER_VALID) st.rest = null;
  const v = w.player.inVehicle;
  if (st.ride < MIN_RIDE || (Math.abs(v.speed || 0) < MIN_SPEED && !api.anySpeed) || voiceBusy()) return;
  const since = now - st.lastEnd;

  if (since >= AFTER_GAP && st.rest) {
    const r = st.rest;
    st.rest = null;
    start(r.ex, r.lines, 'after');
    st.talk.resumed = true;
    return;
  }
  while (since >= AFTER_GAP && st.pending.length) {
    const p = st.pending.shift();
    const ex = pick(p.trigger, 'any');
    if (ex) { start(ex, ex.lines, 'after'); return; }
  }
  if (since < GLOBAL_CD) return;

  if (st.step) {
    const ex = pick('story:' + st.step, false);
    if (ex) { start(ex, ex.lines, 'story'); return; }
  }

  for (const l of placeList()) {
    if ((l.x - w.player.x) ** 2 + (l.y - w.player.y) ** 2 > PLACE_R * PLACE_R) continue;
    if (now < (st.placeCd.get(l.name) || 0)) continue;
    st.placeCd.set(l.name, now + PLACE_CD);
    const ex = pick('place:' + l.name, 'old');
    if (ex) { start(ex, ex.lines, 'place'); return; }
  }
  const wk = st.wijkEntered;
  if (wk && now - wk.at < EVENT_VALID && now >= (st.placeCd.get('wijk:' + wk.name) || 0)) {
    st.wijkEntered = null;
    st.placeCd.set('wijk:' + wk.name, now + PLACE_CD);
    const ex = pick('wijk:' + wk.name, 'old');
    if (ex) { start(ex, ex.lines, 'place'); return; }
  }

  while (st.situations.length) {
    const s = st.situations.pop();
    if (now < (st.sitCd.get(s.kind) || 0)) continue;
    const ex = pick('situation:' + s.kind, 'old');
    if (ex) { st.sitCd.set(s.kind, now + SITUATION_CD); start(ex, ex.lines, 'situation'); return; }
  }

  if (since >= IDLE_GAP && Math.random() < IDLE_CHANCE) {
    const ex = pick('idle', 'old');
    if (ex) start(ex, ex.lines, 'idle');
  }
}

// --- subtitle, in the style of the in-game subtitles (rondvaartchase.js) ----------------

let subEl = null;
function subtitleEl() {
  if (subEl) return subEl;
  subEl = document.createElement('div');
  subEl.id = 'banter-sub';
  subEl.setAttribute('aria-live', 'polite');
  Object.assign(subEl.style, {
    position: 'fixed', left: '50%', bottom: '27vh', transform: 'translateX(-50%)', width: 'min(86vw, 760px)',
    textAlign: 'center', font: "clamp(15px, 1.5vw, 20px) 'Arial Narrow', Arial, sans-serif", color: '#fff',
    letterSpacing: '0.3px', textShadow: '0 1px 3px rgba(0,0,0,0.95), 0 0 12px rgba(0,0,0,0.6)', pointerEvents: 'none',
    opacity: '0', transition: 'opacity 0.25s', zIndex: '40',
  });
  subEl.innerHTML = '<span class="bt-speaker" style="font-weight:bold;margin-right:6px"></span><span class="bt-line"></span>';
  document.body.appendChild(subEl);
  return subEl;
}

function showSub(line) {
  if (typeof document === 'undefined') return;
  const el = subtitleEl();
  if (line) {
    const sp = el.querySelector('.bt-speaker');
    paintSpeaker(sp, SPEAKERS[line[0]]);
    setDualText(el.querySelector('.bt-line'), line[1]);
  }
  el.style.opacity = line && !st.paused ? '1' : '0';
}

// --- per frame (main.js; dt is 0 while the game is paused) --------------------------------

export function updateBanter(dt, w) {
  world = w;
  const paused = !!w.paused || dt <= 0;
  if (paused !== st.paused) {
    st.paused = paused;
    pauseBanterVoice(paused);
    if (st.talk) showSub(st.talk.lines[st.talk.i]);
  }
  if (paused) return;

  const imp = w.lastImpact || null;
  const crashed = st.lastImpact !== undefined && imp && imp !== st.lastImpact && imp.strength >= CRASH_MIN;
  st.lastImpact = imp;
  const starsUp = w.wanted > st.wanted;
  st.wanted = w.wanted;

  watchEvents(dt);
  const both = together();
  st.ride = both ? st.ride + dt : 0;

  const tk = st.talk;
  if (tk) {
    if (!both || isCinematicActive() || isPhoneOpen() || w.storyContact || (tk.kind !== 'react' && (isMissionActive() || (w.sideJob && w.sideJob.active)))) { interrupt(null); return; }
    if (tk.kind !== 'react' && (crashed || starsUp)) { interrupt(starsUp ? 'stars' : 'crash'); return; }
    tk.t += dt;
    // a story contact or call waits (narrative.js): stop after this line
    if (tk.t >= tk.until) { if (tk.kind !== 'react' && storyWaiting()) interrupt(null); else nextLine(); }
    return;
  }

  if ((st.progressT += dt) >= PROGRESS_EVERY) {
    st.progressT = 0;
    refreshProgress();
    watchWijk();
  }
  if ((st.checkT += dt) < CHECK_EVERY) return;
  st.checkT = 0;
  if (both && quiet()) tryStart();
}

// Debug and smoke tests: window.__banter
const api = {
  anySpeed: false, // smoke tests: talk in a parked car
  state: () => ({
    talking: st.talk ? { id: st.talk.ex ? st.talk.ex.id : null, kind: st.talk.kind, line: st.talk.lines[st.talk.i] } : null,
    ride: +st.ride.toFixed(1), sinceLast: world ? +(world.time - st.lastEnd).toFixed(1) : null, together: world ? together() : false,
    quiet: world ? quiet() : false, step: st.step, pending: st.pending.map((p) => p.trigger), rest: !!st.rest,
    situations: st.situations.map((s) => s.kind), wijk: st.wijk, voices: Object.keys(voices).length,
  }),
  play: (id) => { const ex = BY_ID.get(id); if (!ex || !world) return false; if (st.talk) end(); start(ex, ex.lines, ex.trigger.startsWith('after:') ? 'after' : 'debug'); return true; },
  after: (trigger) => { if (!world) return false; addAfter(trigger); return true; },
  interrupt: (kind = 'crash') => { if (!st.talk) return false; interrupt(kind); return true; },
  eligible: (trigger) => { refreshProgress(); return (BY_TRIGGER.get(trigger) || []).filter(gateOk).map((ex) => ex.id); },
  resetHeard: () => { heard = {}; saveHeard(); },
  count: () => ({ exchanges: BY_ID.size, lines: [...BY_ID.values()].reduce((a, ex) => a + ex.lines.length, 0) }),
};
if (typeof window !== 'undefined') window.__banter = api;
