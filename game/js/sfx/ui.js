import { clamp } from '../util.js';
import { isPauseMenuOpen, isMapOpen } from '../pausestate.js';
import { getUserWaypoint } from '../goal.js';
import { sfxLinks } from '../latehooks.js';

// Menu/phone/map interface sounds, pickup chimes, mission/wanted stingers.
// Stingers go through their own bus and briefly duck G-Music.

let K = null;
let pointerAt = -1;
let navAt = -1;
let sliderAt = -1;
let openedAt = -1;
const st = {
  pause: false, zoom: null, zoomAt: 0, waypoint: null, notif: null, saved: false,
  money: null, wanted: 0, stingAt: -10, pingAt: -10, buzzAt: -10, busyAt: -10, roadblocks: new WeakSet(), messages: new WeakSet(),
};
let savedEl = null;

const wpKey = (w) => (w ? `${Math.round(w.x / 40)},${Math.round(w.y / 40)}` : null);

function t() { return K.ctx.currentTime; }
const ui = () => K.buses.ui;
const sting = () => K.buses.sting;

function tick(f = 1800, g = 0.035) {
  K.tone({ freq: f, freqEnd: f * 0.9, type: 'square', duration: 0.022, gain: g, filterFreq: 5000, bus: ui(), prio: 2 });
  K.noise({ duration: 0.012, freq: 4500, q: 2, gain: 0.05, type: 'bandpass', bus: ui(), prio: 2 });
}

function select() {
  K.tone({ freq: 880, type: 'triangle', duration: 0.07, gain: 0.07, bus: ui(), prio: 2 });
  K.tone({ freq: 1320, type: 'triangle', duration: 0.1, gain: 0.07, delay: 0.05, bus: ui(), prio: 2 });
}

function back() {
  K.tone({ freq: 1100, freqEnd: 700, type: 'triangle', duration: 0.1, gain: 0.06, bus: ui(), prio: 2 });
}

function toggleSnd(on) {
  K.tone({ freq: on ? 700 : 1000, freqEnd: on ? 1050 : 650, type: 'square', duration: 0.05, gain: 0.03, filterFreq: 3000, bus: ui(), prio: 2 });
}

function whoosh(up) {
  K.noise({ duration: 0.28, freq: up ? 300 : 2800, freqEnd: up ? 2800 : 300, q: 1.2, gain: 0.14, type: 'bandpass', bus: ui(), prio: 2 });
  K.tone({ freq: up ? 330 : 494, freqEnd: up ? 494 : 330, type: 'sine', duration: 0.18, gain: 0.05, bus: ui(), prio: 2 });
}

function phoneSnd(open) {
  K.noise({ duration: 0.12, freq: open ? 1200 : 2400, freqEnd: open ? 2400 : 1200, q: 1.5, gain: 0.08, type: 'bandpass', bus: ui(), prio: 2 });
  const [a, b] = open ? [1318.5, 1975.5] : [1975.5, 1318.5];
  K.tone({ freq: a, type: 'sine', duration: 0.09, gain: 0.07, delay: 0.04, bus: ui(), prio: 2 });
  K.tone({ freq: b, type: 'sine', duration: 0.14, gain: 0.07, delay: 0.11, bus: ui(), prio: 2 });
}

function buzz() {
  for (const d of [0, 0.2]) K.tone({ freq: 150, type: 'square', duration: 0.12, gain: 0.09, filterFreq: 420, delay: d, bus: ui(), prio: 2 });
  K.tone({ freq: 1175, type: 'sine', duration: 0.14, gain: 0.04, delay: 0.42, bus: ui(), prio: 2 });
}

function ping() {
  K.tone({ freq: 1047, type: 'sine', duration: 0.18, gain: 0.04, bus: ui(), prio: 2 });
  K.tone({ freq: 1568, type: 'sine', duration: 0.16, gain: 0.025, delay: 0.06, bus: ui(), prio: 2 });
}

export function initUiSfx(kit) {
  K = kit;
  K.bank.warm(['cashreg', 'rack', 'spray']);
}

export function uiWorldInit(world) {
  st.money = world.money;
  st.wanted = world.wanted;
  st.pause = isPauseMenuOpen();
  st.waypoint = wpKey(getUserWaypoint());
  st.notif = world.phoneHistory && world.phoneHistory[0];
  for (const m of world.messages) st.messages.add(m);
  for (const v of world.vehicles) if (v._roadblock) st.roadblocks.add(v._roadblock);
}

function startVisible() {
  const s = document.getElementById('start-screen');
  return !!(s && s.classList.contains('visible'));
}

export function isUiGestureTarget(kind, e) {
  if (kind === 'key') return startVisible() || isPauseMenuOpen();
  const el = e.target;
  return !!(el && el.closest && el.closest('#pause-menu, #start-screen, .phone'));
}

export function uiDomEvent(kind, e) {
  if (!K || K.muted()) return;
  const now = t();
  if (kind === 'pointer') { pointerAt = now; return; }
  const el = e.target && e.target.closest ? e.target : null;
  const inPause = el && el.closest('#pause-menu');
  const inStart = el && el.closest('#start-screen');
  const inPhone = el && el.closest('.phone');
  if (kind === 'focus') {
    if (!(inPause || inStart) || now - pointerAt < 0.3 || now - openedAt < 0.15 || now - navAt < 0.04) return;
    navAt = now;
    tick(inStart ? 1500 : 1800);
    return;
  }
  if (kind === 'click') {
    if (!(inPause || inStart || inPhone)) return;
    if (el.closest('[data-back], [data-action="cancel"], [data-action="resume"]')) back();
    else if (el.closest('input[type="checkbox"], input[type="range"], select')) return;
    else if (el.closest('button, [data-idx], [data-mission], [data-tab], .ss-item')) select();
    return;
  }
  if (kind === 'input') {
    if (!inPause) return;
    if (el.type === 'range') {
      if (now - sliderAt < 0.045) return;
      sliderAt = now;
      const lo = Number(el.min) || 0, hi = Number(el.max) || 1;
      const u = clamp((Number(el.value) - lo) / ((hi - lo) || 1), 0, 1);
      K.tone({ freq: 400 + u * 900, type: 'sine', duration: 0.035, gain: 0.05, bus: ui(), prio: 2 });
    } else if (el.type === 'checkbox') toggleSnd(el.checked);
    else tick(1400);
    return;
  }
  if (kind === 'key') {
    const k = e.key;
    if (startVisible() && !isPauseMenuOpen() && !e.repeat) {
      if (k === 'Enter' || k === ' ') select();
      else if (k === 'Escape') back();
    }
  }
}

// --- stingers -----------------------------------------------------------

function stab(freqs, { dur = 0.5, gain = 0.07, type = 'sawtooth', cutoff = 1800, delay = 0 } = {}) {
  for (const f of freqs) {
    K.tone({ freq: f, type, duration: dur, gain, filterFreq: cutoff, delay, bus: sting(), prio: 2 });
    K.tone({ freq: f * 1.004, type, duration: dur, gain: gain * 0.6, filterFreq: cutoff, delay, bus: sting(), prio: 2 });
  }
}

function hit(delay = 0, g = 0.25) {
  K.tone({ freq: 90, freqEnd: 45, type: 'sine', duration: 0.4, gain: g, delay, bus: sting(), prio: 2 });
  K.noise({ duration: 0.25, freq: 600, freqEnd: 120, q: 0.7, gain: g * 0.6, type: 'lowpass', delay, bus: sting(), prio: 2 });
}

function wantedUp(level) {
  const root = 110 * Math.pow(2, (level - 1) * 2 / 12);
  stab([root, root * 1.189, root * 1.498], { dur: 0.45, gain: 0.05, cutoff: 1400 + level * 300 });
  stab([root * 2, root * 2 * 1.335], { dur: 0.3, gain: 0.035, cutoff: 2600, delay: 0.14 });
  hit(0, 0.18 + level * 0.03);
}

function wantedDown() {
  stab([392, 330], { dur: 0.22, gain: 0.04, type: 'triangle', cutoff: 3000 });
  stab([294], { dur: 0.35, gain: 0.045, type: 'triangle', cutoff: 3000, delay: 0.18 });
}

function lostThem() {
  const notes = [261.6, 329.6, 392, 523.3, 659.3];
  notes.forEach((f, i) => K.tone({ freq: f, type: 'triangle', duration: 1.1 - i * 0.1, gain: 0.09, delay: i * 0.09, bus: sting(), prio: 2 }));
  K.noise({ duration: 1, freq: 6000, freqEnd: 2500, q: 0.8, gain: 0.03, type: 'bandpass', bus: sting(), prio: 2 });
}

function roadblockSting() {
  stab([73.4, 77.8, 110], { dur: 1.1, gain: 0.06, cutoff: 700 });
  hit(0, 0.28);
  for (let i = 0; i < 4; i++) K.noise({ duration: 0.04, freq: 7000, q: 1, gain: 0.05, type: 'highpass', delay: 0.35 + i * 0.18, bus: sting(), prio: 2 });
}

function missionFail() {
  [[440, 0], [370, 0.16], [311, 0.32], [233, 0.5]].forEach(([f, d]) => K.tone({ freq: f, freqEnd: f * 0.98, type: 'sawtooth', duration: d === 0.5 ? 0.7 : 0.18, gain: 0.09, filterFreq: 1400, delay: d, bus: sting(), prio: 2 }));
}

function healthChime() {
  [523.3, 659.3, 784, 1046.5].forEach((f, i) => K.tone({ freq: f, type: 'sine', duration: 0.3, gain: 0.07, delay: i * 0.06, bus: ui(), prio: 2 }));
  K.noise({ duration: 0.4, freq: 7000, freqEnd: 4000, q: 1, gain: 0.04, type: 'highpass', delay: 0.1, bus: ui(), prio: 2 });
}

function strap() {
  K.noise({ duration: 0.18, freq: 3000, q: 1.5, gain: 0.32, type: 'bandpass', bus: ui(), prio: 2 });
  K.noise({ duration: 0.12, freq: 2200, q: 1.5, gain: 0.26, type: 'bandpass', delay: 0.14, bus: ui(), prio: 2 });
}

function moneyTicks(amount) {
  const n = clamp(Math.round(amount / 20), 3, 14);
  for (let i = 0; i < n; i++) K.tone({ freq: 2600 + (i % 3) * 300, type: 'square', duration: 0.018, gain: 0.05, filterFreq: 6000, delay: 0.15 + i * 0.04, bus: ui(), prio: 2 });
}

function saveBlip() {
  K.tone({ freq: 1200, type: 'square', duration: 0.035, gain: 0.03, filterFreq: 4000, bus: ui(), prio: 2 });
  K.tone({ freq: 1800, type: 'square', duration: 0.05, gain: 0.03, filterFreq: 4000, delay: 0.06, bus: ui(), prio: 2 });
}

// --- per-frame polling --------------------------------------------------

export function updateUiSfx(dt, world) {
  if (!K) return;
  const now = t();
  const muted = K.muted();

  const pause = isPauseMenuOpen();
  // the pause menu is the phone: unfolding it in play sounds like one, on the title screen a whoosh
  if (pause !== st.pause) { st.pause = pause; openedAt = now; if (!muted) (document.body.classList.contains('game-started') ? phoneSnd(pause) : whoosh(pause)); }

  if (isMapOpen()) {
    const s = sfxLinks.mapStats();
    const z = s ? s.zoom : null;
    if (st.zoom !== null && z !== null && Math.abs(z - st.zoom) / st.zoom > 0.04 && now - st.zoomAt > 0.06) {
      st.zoomAt = now;
      if (!muted) tick(z > st.zoom ? 2200 : 1500, 0.025);
      st.zoom = z;
    } else if (st.zoom === null) st.zoom = z;
  } else st.zoom = null;

  // getUserWaypoint() builds a fresh object per call, so compare by value
  const wp = wpKey(getUserWaypoint());
  if (wp !== st.waypoint) {
    if (!muted && now - st.pingAt > 2) { st.pingAt = now; (wp ? ping() : back()); }
    st.waypoint = wp;
  }

  const n = world.phoneHistory && world.phoneHistory[0];
  if (n && n !== st.notif && !muted && !n.quiet && now - st.buzzAt > 1) { st.buzzAt = now; buzz(); }
  st.notif = n;

  if (!savedEl) savedEl = document.querySelector('.hud-saved');
  const saved = !!(savedEl && savedEl.classList.contains('visible'));
  if (saved && !st.saved && !muted) saveBlip();
  st.saved = saved;

  if (world.pendingRespawn) st.busyAt = now;

  for (const m of world.messages) {
    if (st.messages.has(m)) continue;
    st.messages.add(m);
    if (muted) continue;
    const s = m.text || '';
    if (s.startsWith('+ €')) K.buf('cashreg', { bus: ui(), gain: 0.22, prio: 2 });
    else if (s.endsWith('munitie')) K.buf('rack', { bus: ui(), gain: 0.3, prio: 2 });
    else if (s.startsWith('Spuit & Klaar')) K.buf('spray', { bus: ui(), gain: 0.25, prio: 2 });
    else if (s.indexOf('mislukt') !== -1 && s !== 'Opslaan mislukt' && now - st.busyAt > 3) missionFail();
    else if (/^Opgelapt|^Pleister|^Pijnstillers|^Gezondheid/.test(s)) healthChime();
    else if (/^Kogelwerend|^Pantser/.test(s)) strap();
  }

  if (st.money !== null && world.money - st.money >= 40 && !muted) moneyTicks(world.money - st.money);
  st.money = world.money;

  if (world.wanted !== st.wanted) {
    const up = world.wanted > st.wanted;
    const canSting = !muted && now - st.stingAt > 1.2;
    if (world.wanted === 0) {
      if (!muted && now - st.busyAt > 1.5) lostThem();
    } else if (canSting) {
      st.stingAt = now;
      if (up) wantedUp(world.wanted); else wantedDown();
    }
    st.wanted = world.wanted;
  }

  for (const v of world.vehicles) {
    const rb = v._roadblock;
    if (!rb || st.roadblocks.has(rb)) continue;
    st.roadblocks.add(rb);
    if (!muted) roadblockSting();
  }
}
