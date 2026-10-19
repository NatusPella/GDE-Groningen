import { dualHtml, dutchFor } from './subtitles.js';
import { isStale } from './validity.js';
import { paintSpeaker } from './speakers.js';
import { noteSpoken } from './characters.js';
import { getClockText } from './hud_panel.js';
import { readingSeconds } from './world.js';
import { lineVoiceFor } from './linevoice.js';
import { playCallVoice, playPhoneRing, playSmsVoice, playPhonePing } from './audio.js';
import { smsVoiceFor, smsKind } from './smsvoice.js';
import { mayVoiceText, noteVoiceText } from './attention.js';
import { hold as holdChannel, release as releaseChannel } from './speech.js';
import { registerNarrative, mayStart, noteToast, heldBack } from './narrative.js';
import { zones, P1, P2, hudNow } from './hudrules.js';

// The folded phone (the Pixie Vouw 11's cover screen) on the HUD, bottom
// left above the street name: notification cards and incoming calls. Both slide up out of the bottom like a phone
// being raised; Telefoon › Berichten in the pause menu (phone.js) keeps the history.
//
// Notifications: notifyPhone(world, { from, app, title, text, duration }),
// or push { from, text, duration } onto world.phoneNotifications (the old
// way, still read every frame). At most two cards are up at once, the
// newest at the bottom; the older one steps back. A card whose text the
// HUD just showed as a card is only written to the history. A card pings and
// is read aloud in the sender's voice (smsvoice.js; `say` = the fixed line
// for a text with numbers or names, `voiced: true` = already spoken); the
// card stays up until the voice is done. `silent: true` (the new story's app texts) is only shown and pinged, never read aloud.
//
// Calls: startCall(world, { from, lines: [{ speaker, text, sub }], live,
// onEnd, voice }) rings, then plays line by line: each line is voiced from
// the lines manifest ("<speaker>|<text>", or voice(speaker, text) -> { src })
// on the speech.js 'call' class, which holds the channel for the whole call
// (car banter stops, reactions and bubbles wait, a story scene ends the call).
// Unvoiced lines stay up for their reading time. `sub` is a second subtitle
// line (the Dutch for a Frisian or Gronings line). `live: true` makes it a
// Kiekdoar livestream card instead of a call. Calls queue (one at a time) and
// wait while a cutscene hides the HUD. The finished call lands in the
// Kiekdoar history.

const HOLD_MIN = 6;
const HOLD_MAX = 13;
// attention budget: one phone card at a time, a counter for the rest
const MAX_UP = 1;
const HOLD_BUSY = 4.5;
const RING_TIME = 1.6;
const LINE_GAP = 0.35;
const HANGUP_TIME = 1.1;
const CALL_WAIT_MAX = 90;
const VOICE_DELAY = 0.45;
const VOICE_TAIL = 1.2;
const APP_ICON = {
  sikkom: '<path d="M12 3a6 6 0 0 0-6 6v4l-2 3v1h16v-1l-2-3V9a6 6 0 0 0-6-6zm-2 16a2 2 0 0 0 4 0z"/>',
  bericht: '<path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-5 4v-4H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/>',
  geld: '<path d="M3 6h18v12H3zm9 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM5 8v2a2 2 0 0 0 2-2zm12 0a2 2 0 0 0 2 2V8zM5 14v2h2a2 2 0 0 0-2-2zm14 0a2 2 0 0 0-2 2h2z"/>',
  bel: '<path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/>',
  live: '<circle cx="12" cy="12" r="3.2"/><path d="M7.1 7.1a7 7 0 0 0 0 9.8M16.9 7.1a7 7 0 0 1 0 9.8M4.2 4.2a11 11 0 0 0 0 15.6M19.8 4.2a11 11 0 0 1 0 15.6" fill="none" stroke="currentColor" stroke-width="1.8"/>',
};

let root = null;
let stack = null;
let callEl = null;
let world = null;
let cards = [];
let calls = [];
let call = null;
let notes = [];
let nextCallId = 1;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const icon = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor">${APP_ICON[k] || APP_ICON.bericht}</g></svg>`;
const initials = (name) => String(name).replace(/\(.*\)/, '').trim().split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase();
const clockNow = (w) => getClockText(w) || new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });

function injectStyle() {
  if (document.getElementById('phonefeed-style')) return;
  const link = document.createElement('link');
  link.id = 'phonefeed-style';
  link.rel = 'stylesheet';
  link.href = new URL('./phonefeed.css', import.meta.url).href;
  document.head.appendChild(link);
}

export function initPhoneFeed(w) {
  world = w;
  if (!w.phoneNotifications) w.phoneNotifications = [];
  if (!w.phoneHistory) w.phoneHistory = [];
  injectStyle();
  root = document.getElementById('hud');
  stack = document.createElement('div');
  stack.className = 'phonefeed';
  stack.setAttribute('aria-live', 'polite');
  root.appendChild(stack);
  cards = [];
  calls = [];
  call = null;
  notes = [];
  registerNarrative('call', { active: () => !!call, pending: () => calls.length > 0 });
  registerNarrative('text', {
    active: () => cards.some((c) => c.story && !c.leaving),
    pending: () => notes.some((n) => n.story) || (world && world.phoneNotifications || []).some((n) => n.story),
  });
  if (typeof window !== 'undefined') {
    window.__phonefeed = { notify: (spec) => notifyPhone(world, spec), call: (spec) => startCall(world, spec), hangUp, state: () => ({ cards: cards.length, call: call && { from: call.from, phase: call.phase, i: call.i }, queued: calls.length }) };
  }
}

// --- notifications -------------------------------------------------------------------------

// "KIEKDOAR MELDT: onrust in Grunn, politie op pad" -> app Kiekdoar, headline
// "Onrust in Grunn", body "politie op pad".
function parse(n) {
  let text = String(n.text || '').trim();
  let from = n.from || '';
  let app = n.app || '';
  const m = /^KIEKDOAR( MELDT)?:\s*/i.exec(text);
  if (m) { text = text.slice(m[0].length); from = from || 'Kiekdoar'; }
  if (!app) app = /kiekdoar/i.test(from) || m ? 'sikkom' : /€/.test(text) && !from ? 'geld' : from ? 'bericht' : 'sikkom';
  let title = n.title || '';
  let body = text;
  if (!title && app === 'sikkom') {
    const c = /^(.{8,52}?)(, | – | - |: )(.{6,})$/.exec(text);
    if (c) { title = c[1]; body = c[3]; } else { title = text; body = ''; }
    title = title[0].toUpperCase() + title.slice(1);
  }
  if (!from) from = app === 'geld' ? 'Bank' : 'Kiekdoar';
  return { from, app, title, body };
}

export function notifyPhone(w, spec) {
  if (!w.phoneNotifications) w.phoneNotifications = [];
  w.phoneNotifications.push(spec);
}

// History entries: { text, at, from, body, read } (phone.js Berichten groups them by `from`).
function remember(w, text, from = '', body = '') {
  if (!w.phoneHistory) w.phoneHistory = [];
  w.phoneHistory.unshift({ text, at: clockNow(w), ...(from ? { from, body: body || text } : {}) });
  if (w.phoneHistory.length > 30) w.phoneHistory.length = 30;
}

// the HUD card just said it (a mission requirement is sent to both)
function alreadyShown(w, text) {
  return (w.messages || []).some((m) => m.text && m.text.length > 12 && text.includes(m.text) && m.until - w.time > 1);
}

function showNote(w, n) {
  const p = parse(n);
  const full = [p.title, p.body].filter(Boolean).join(': ');
  remember(w, p.from && p.from !== 'Kiekdoar' ? `${p.from}: ${n.text}` : n.text, p.from || 'Kiekdoar', p.from === 'Kiekdoar' ? [p.title, p.body].filter(Boolean).join(': ') : n.text);
  noticeFrom(p.from || 'Kiekdoar');
  if (alreadyShown(w, n.text)) return;
  const el = document.createElement('div');
  el.className = 'pf-card';
  el.dataset.app = p.app;
  el.innerHTML =
    `<div class="pf-head"><span class="pf-app">${icon(p.app)}</span><span class="pf-from">${esc(p.from)}</span><span class="pf-more" hidden></span><span class="pf-time">${esc(clockNow(w))}</span></div>` +
    (p.title ? `<div class="pf-title">${dualHtml(p.title)}</div>` : '') +
    (p.body ? `<div class="pf-body">${dualHtml(p.body)}</div>` : '');
  stack.appendChild(el);
  void el.offsetWidth;
  el.classList.add('on');
  const secs = Math.min(HOLD_MAX, Math.max(HOLD_MIN, (n.duration || 0) + 1, readingSeconds(full) * 1.4));
  el.style.setProperty('--pf-dur', `${secs}s`);
  const c = { el, left: secs, secs, voice: null, speaking: false, t: 0, story: !!n.story };
  if (!n.voiced && !n.silent) {
    const v = smsVoiceFor(n, lineVoiceFor);
    const kind = v && (n.story ? 'story' : smsKind(v.speaker));
    if (v && mayVoiceText(kind)) { c.voice = v; noteVoiceText(kind); }
  }
  if (!n.voiced) playPhonePing();
  cards.push(c);
}

// the card's voice starts once the channel is free, while the card is up
function voiceCard(c) {
  if (!c.voice || c.leaving || c.t < VOICE_DELAY) return;
  const v = c.voice;
  // the card's clock stops while it talks, then runs out its reading time
  const r = playSmsVoice(v.src, v.dur, () => { c.speaking = false; });
  if (r === 'wait') return;
  c.voice = null;
  if (r !== 'play') return;
  c.speaking = true;
  c.left = Math.max(c.left, VOICE_TAIL);
  c.el.style.setProperty('--pf-dur', `${c.t + c.left + (v.dur || 3)}s`);
}

// "+2": how many more notifications wait behind the one that is up
function syncCounter() {
  const up = cards.find((c) => !c.leaving);
  if (!up) return;
  const more = up.el.querySelector('.pf-more');
  more.hidden = !notes.length;
  more.textContent = notes.length ? `+${notes.length}` : '';
  // a waiting queue shortens the card that is up (but it stays readable)
  if (notes.length && !up.speaking && !up.voice && up.secs - up.left > HOLD_BUSY) up.left = Math.min(up.left, 0.01);
}

function dropCard(c) {
  if (c.leaving) return;
  c.leaving = true;
  c.left = 0.5;
  notice.until = performance.now() + NOTICE_HOLD_MS;
  c.el.classList.remove('on');
  c.el.classList.add('out');
}

// --- calls ---------------------------------------------------------------------------------

export function startCall(w, spec) {
  const c = { id: nextCallId++, from: spec.from || 'Onbekend', lines: (spec.lines || []).filter((l) => l && l.text), live: !!spec.live, onEnd: spec.onEnd || null, voice: spec.voice || null, at: w.time };
  if (!c.lines.length) return 0;
  calls.push(c);
  return c.id;
}

export const isCallActive = () => !!call;

// The sender of the call or card on screen (a few seconds after it went):
// Esc then opens the unfolded phone on that thread (pausemenu.js).
const NOTICE_HOLD_MS = 2500;
let notice = { from: '', until: 0 };
function noticeFrom(from) {
  notice = { from, until: performance.now() + NOTICE_HOLD_MS + 1500 };
}

function hangUp() {
  if (!call) return;
  finishCall(true);
}

function callHtml(c) {
  const state = c.live ? '<span class="pf-live">LIVE</span>' : `<span class="pf-state">${c.phase === 'ring' ? 'Inkomend gesprek' : c.phase === 'end' ? 'Opgehangen' : '<i class="pf-dot"></i><b class="pf-clock">0:00</b>'}</span>`;
  return `<div class="pf-call-head"><span class="pf-avatar">${esc(initials(c.from))}</span>` +
    `<span class="pf-callwho"><small>${c.live ? 'Kiekdoar Live' : 'Telefoon'}</small><b>${esc(c.from)}</b></span>${state}</div>` +
    '<div class="pf-line"><span class="pf-speaker"></span><span class="pf-say"></span><span class="pf-sub"></span></div>';
}

function beginCall(w, c) {
  call = c;
  c.phase = 'ring';
  c.t = 0;
  c.i = -1;
  holdChannel('call', 'call', () => { if (call === c) finishCall(true); }, { alive: () => call === c });
  callEl = document.createElement('div');
  callEl.className = 'pf-callcard' + (c.live ? ' live' : '');
  callEl.innerHTML = callHtml(c);
  stack.appendChild(callEl);
  void callEl.offsetWidth;
  callEl.classList.add('on', 'ringing');
  playPhoneRing(c.live ? 1 : 2);
  document.body.classList.add('hud-call-on');
  for (const k of cards) dropCard(k);
}

function showLine(c) {
  const l = c.lines[c.i];
  const sp = callEl.querySelector('.pf-speaker');
  paintSpeaker(sp, l.speaker || c.from);
  noteSpoken(world, l.speaker || c.from);
  callEl.querySelector('.pf-say').textContent = l.text;
  // the Dutch under a Frisian/Gronings line (subtitles.js), unless given
  callEl.querySelector('.pf-sub').textContent = l.sub || dutchFor(l.text) || '';
  const line = callEl.querySelector('.pf-line');
  line.classList.remove('new');
  void line.offsetWidth;
  line.classList.add('new');
}

function nextLine(c) {
  c.i++;
  if (c.i >= c.lines.length) { finishCall(false); return; }
  const l = c.lines[c.i];
  showLine(c);
  const v = (c.voice && c.voice(l.speaker || c.from, l.text)) || lineVoiceFor(l.speaker || c.from, l.text);
  const read = Math.max(2.2, readingSeconds(l.text + ' ' + (l.sub || '')) * 0.85);
  c.lineT = 0;
  c.lineLen = read;
  c.voiced = false;
  if (v && playCallVoice(v.src, () => { if (call === c && c.i === c.lines.indexOf(l)) c.lineLen = Math.min(c.lineLen, c.lineT + LINE_GAP); })) {
    c.voiced = true;
    c.lineLen = Math.max((v.dur || 3) + 1.5, 2);
  }
}

function finishCall(cut) {
  const c = call;
  if (!c || c.phase === 'end') return;
  const said = c.lines.slice(0, cut ? Math.max(0, c.i + 1) : c.lines.length);
  remember(world, `${c.live ? 'Live' : 'Gesprek'} · ${c.from}: ${said.map((l) => l.text).join(' ')}`, c.from, `${c.live ? 'Live' : 'Gesprek'}: ${said.map((l) => l.text).join(' ')}`);
  noticeFrom(c.from);
  c.phase = 'end';
  c.t = 0;
  const st = callEl.querySelector('.pf-state');
  if (st) st.textContent = 'Opgehangen';
  callEl.classList.add('ended');
  document.body.classList.remove('hud-call-on');
  releaseChannel('call');
  if (c.onEnd) try { c.onEnd({ cut }); } catch (e) { /* ignore */ }
}

function updateCall(dt, w, visible) {
  if (!call) {
    calls = calls.filter((c) => w.time - c.at < CALL_WAIT_MAX);
    if (calls.length && visible && !w.storyContact && mayStart('call') && holdChannel('call', 'call')) beginCall(w, calls.shift());
    return;
  }
  const c = call;
  c.t += dt;
  if (c.phase === 'ring') {
    if (c.t >= (c.live ? 0.8 : RING_TIME)) { c.phase = 'talk'; c.t = 0; callEl.classList.remove('ringing'); callEl.innerHTML = callHtml(c); nextLine(c); }
    return;
  }
  if (c.phase === 'talk') {
    const clock = callEl.querySelector('.pf-clock');
    if (clock) { const s = Math.floor(c.t); const txt = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; if (clock.textContent !== txt) clock.textContent = txt; }
    c.lineT += dt;
    if (c.lineT >= c.lineLen) nextLine(c);
    return;
  }
  if (c.t >= HANGUP_TIME) {
    const el = callEl;
    el.classList.remove('on');
    el.classList.add('out');
    setTimeout(() => el.remove(), 500);
    callEl = null;
    call = null;
  }
}

// --- per frame -----------------------------------------------------------------------------

function hudVisible() {
  const b = document.body.classList;
  return b.contains('game-started') && !b.contains('cine-hide-hud');
}

export function updatePhoneFeed(dt, w) {
  if (!stack) return;
  world = w;
  if (!w.phoneNotifications) w.phoneNotifications = [];
  const visible = hudVisible();
  // a card that is up steps aside for a cutscene, a story call or a subtitle, and waits (narrative.js)
  const held = !call && heldBack();
  stack.classList.toggle('pf-held', held);
  if (visible && !w.paused && !held) {
    while (w.phoneNotifications.length) {
      const n = w.phoneNotifications.shift();
      // story texts go ahead of the news and app texts that wait
      const at = n.story ? notes.findIndex((q) => !q.story) : -1;
      if (at >= 0) notes.splice(at, 0, n); else notes.push(n);
    }
    // refs #171: a text that no longer applies (the step or mission moved on, too late) is not shown, only logged
    for (let i = notes.length - 1; i >= 0; i--) {
      if (!isStale(notes[i])) continue;
      const [n] = notes.splice(i, 1);
      remember(w, n.from ? `${n.from}: ${n.text}` : n.text, n.from || '', n.text);
    }
    while (notes.length > 6) {
      const i = notes.findIndex((q) => !q.story);
      const [n] = notes.splice(i >= 0 ? i : 0, 1);
      remember(w, n.from ? `${n.from}: ${n.text}` : n.text);
    }
    // narrative.js: not over a cutscene or a story call, a beat apart, story texts after their "Bel Rikus"
    if (!call && !cards.some((c) => !c.leaving) && zones.free('A', 'phone') && notes.length && !(hudNow.busy && !notes[0].story) && mayStart(notes[0].story ? 'text' : 'phone')) { noteToast(); showNote(w, notes.shift()); }
    syncCounter();
    for (const c of cards) { c.t += dt; voiceCard(c); if (c.speaking && c.t > 40) c.speaking = false; if (!c.speaking) c.left -= dt; }
    for (const c of cards.filter((k) => k.left <= 0)) {
      if (!c.leaving) dropCard(c);
      else { c.el.remove(); cards.splice(cards.indexOf(c), 1); }
    }
  }
  if (!w.paused) updateCall(dt, w, visible);
  // zone A is one card at a time: a call or text holds it, hudcards.js waits
  if (call || cards.length) zones.occupy('A', 'phone', call ? P1 : P2); else zones.vacate('A', 'phone');
}
