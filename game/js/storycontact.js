// How Jelle Terpstra (and Durk & Douwe) reach Tammo and Tessa: every story
// contact is diegetic and voiced. story.js queues the `contact` entries of
// storyarc.js steps here; they play one at a time when the game is quiet
// (no cutscene, no pigeon, no respawn). Kinds (`via`):
//   call       incoming call: ringing phone, caller ID, then the voiced lines
//   voicemail  a missed call / pocket dial, played back as a voice message
//   live       a livestream on the phone screen (portrait, LIVE badge, chat)
//   post       a Kiekdoar post with a selfie, read out as a video
//   card       a handwritten card or note, read out in the writer's voice
//   scene      a 3D cutscene (missionstory.js playLivestream), inside the LIVE frame
//   radio      Radio Nachtstreek on the phone: a station sting, Rikus and his caller in
//              the broadcast band ("Bel Rikus" before a mission, the rubrieken after one)
// Lines: [who, text, { tag, clue, card }] with who a storyarc.js SPEAKERS key; card shows
// that CHARACTERS key's name card (namecard.js) with the line;
// a Frisian line gets its Dutch subtitle from subtitles.js (dualHtml). Voices come
// from the lines manifest (linevoice.js, "<name>|<text>"), recorded by
// scripts/tts_lines*.{mjs,py}; voicelines_collect.mjs lists these lines.

import { lineVoiceFor } from './linevoice.js';
import { isStale } from './validity.js';
import { playContactVoice as playBanterVoice, stopContactVoice as stopBanterVoice, pauseContactVoice as pauseBanterVoice, holdContactChannel, playPhoneRing, playClueSting } from './audio.js';
import { SPEAKERS } from './storyarc.js';
import { showNameCard } from './namecard.js';
import { isCallActive } from './phonefeed.js';
import { isCinematicActive } from './cinematics.js';
import { readingSeconds } from './world.js';
import { PORTRAITS } from './storycast.js';
import { getClockText } from './clocktext.js';
import { dualHtml, dutchFor } from './subtitles.js';
import { speakerHtml } from './speakers.js';
import { noteSpoken } from './characters.js';
import { registerNarrative, mayStart } from './narrative.js';

let mission = null;
import('./missionstory.js').then((m) => { mission = m; }).catch(() => {});

export const CONTACT_NAMES = SPEAKERS;
const RING_S = 2.3;
const QUIET_S = 1.6;

const CHAT = [
  ['stadjer050', 'Wie is dit nou weer'], ['moi_uut_grunn', 'Moai?? Hier zeggen we moi'], ['kiekdeuse', 'Grunn > Fryslân'],
  ['fietsopdediep', 'Is dat een trekker met een limo erachter'], ['olle_grieze_fan', 'Zonnebril op. In het donker.'],
  ['hoornsediep', 'Die twee achter hem zijn echt groot'], ['zuiderpark4life', 'Moi uit Hoogkerk'], ['vismarktvincent', 'Kon minder'],
  ['kiekdoar_fan', 'Wie is W?'], ['oosterpoort_oma', 'Ik bel de pliesie. Of mijn kleinzoon.'], ['mem_terpstra', 'Jas aan, jonge.'],
];

let world = null;
let root = null;
let els = null;
let cardEl = null;
let liveEl = null;
const queue = [];
let cur = null;
let quietT = 0;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nameOf = (k) => CONTACT_NAMES[k] || k;

function injectStyle() {
  if (document.getElementById('storycontact-style')) return;
  const st = document.createElement('style');
  st.id = 'storycontact-style';
  st.textContent = `
#hud .sc-phone { position: absolute; right: var(--hud-edge, 46px); top: var(--hud-stack-top, 210px); width: 232px; box-sizing: border-box; border-radius: 26px; padding: 10px 9px 14px;
  max-height: calc(100vh / var(--ui, 1) - var(--hud-stack-top, 210px) - 200px); overflow: hidden;
  background: #0c140e; border: 2px solid #1e9e56; box-shadow: 0 14px 34px rgba(0,0,0,.6), 0 0 0 3px rgba(12,20,14,.85);
  color: #f2f2f2; font-family: 'Arial Narrow', Arial, sans-serif; transform: translateY(40px) rotate(3deg); opacity: 0;
  transition: transform var(--dur-slow, 320ms) var(--ease-out, ease-out), opacity var(--dur-base, 200ms) var(--ease-out, ease-out); pointer-events: none; }
#hud .sc-phone { border: 5px solid #111613; border-left: 9px solid #1a201c; border-radius: 24px 22px 22px 24px; box-shadow: inset 0 0 0 1px rgba(63,201,122,.35), -2px 0 0 #070a08, 0 0 0 1px #2b332d, 0 14px 34px rgba(0,0,0,.6); }
#hud .sc-phone::before { content: ''; position: absolute; top: 5px; left: 50%; width: 7px; height: 7px; margin-left: -3.5px; border-radius: 50%; background: #050806; box-shadow: 0 0 0 1.5px #1f2622; z-index: 2; }
body.hide-minimap #hud .sc-phone { max-height: calc(100vh / var(--ui, 1) - var(--hud-stack-top, 210px) - 60px); }
#hud .sc-phone.aside { top: calc(var(--hud-tr-bottom, 200px) + 8px); right: 258px; max-height: calc(100vh / var(--ui, 1) - var(--hud-tr-bottom, 200px) - 200px); }
#hud .sc-phone.compact .sc-portrait, #hud .sc-phone.compact .sc-wave { display: none; }
#hud .sc-phone.compact .sc-screen { min-height: 0; }
#hud .sc-phone.compact .sc-livecanvas, #hud .sc-phone.compact .sc-postimg { height: 88px; }
#hud .sc-phone.show { transform: translateY(0) rotate(0); opacity: 1; }
#hud .sc-phone.ring { animation: sc-shake .5s infinite; }
@keyframes sc-shake { 0%,100% { transform: rotate(0); } 25% { transform: rotate(-2.2deg); } 75% { transform: rotate(2.2deg); } }
#hud .sc-top, #hud .sc-sub { display: none; }
#hud .sc-screen { position: relative; border-radius: 18px; overflow: hidden; background: radial-gradient(ellipse at top, #17301f 0%, #0c140e 85%); border: 1px solid rgba(63,201,122,.35); min-height: 190px; display: flex; flex-direction: column; }
#hud .sc-head { text-align: center; padding: 10px 10px 2px; }
#hud .sc-state { font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: #3fc97a; }
#hud .sc-name { font-size: 22px; font-weight: bold; margin-top: 2px; }
#hud .sc-portrait { display: block; margin: 6px auto 4px; width: 76px; height: 76px; border-radius: 50%; image-rendering: pixelated; background: #1d2a3a; }
#hud .sc-phone.ring .sc-portrait { box-shadow: 0 0 0 0 rgba(63,201,122,.7); animation: sc-pulse 1.1s infinite; }
@keyframes sc-pulse { 0% { box-shadow: 0 0 0 0 rgba(63,201,122,.6); } 100% { box-shadow: 0 0 0 16px rgba(63,201,122,0); } }
#hud .sc-wave { display: flex; gap: 3px; justify-content: center; align-items: center; height: 22px; margin: 2px 0 4px; }
#hud .sc-wave i { width: 3px; border-radius: 2px; background: #3fc97a; height: 4px; transition: height .12s; }
#hud .sc-bubble { margin: 6px 10px 10px; padding: 8px 10px; border-radius: 12px; background: rgba(255,255,255,.08); font-size: 14px; line-height: 1.3; min-height: 38px; }
#hud .sc-bubble b { font-weight: bold; margin-right: 4px; }
#hud .sc-bubble .nl-sub, #sc-card .nl-sub { display: block; margin-top: 3px; font-size: 12px; font-style: italic; color: rgba(255,255,255,.62); }
#hud .sc-phone[data-via="live"] .sc-screen { background: #000; }
#hud .sc-livebar, #sc-live .sc-livebar { display: flex; align-items: center; gap: 6px; padding: 7px 9px; font-size: 12px; }
#hud .sc-dot, #sc-live .sc-dot { background: #e0262f; color: #fff; font-weight: bold; border-radius: 4px; padding: 1px 5px; letter-spacing: 1px; }
#hud .sc-livecanvas { width: 100%; height: 170px; image-rendering: pixelated; display: block; }
#hud .sc-chat, #sc-live .sc-chat { font-size: 12px; line-height: 1.35; padding: 4px 9px; color: rgba(255,255,255,.85); height: 48px; overflow: hidden; }
#hud .sc-chat b, #sc-live .sc-chat b { color: #3fc97a; margin-right: 4px; }
#hud .sc-post { padding: 8px; }
#hud .sc-posthead { display: flex; align-items: center; gap: 7px; font-size: 13px; }
#hud .sc-posthead canvas { width: 28px; height: 28px; border-radius: 50%; image-rendering: pixelated; }
#hud .sc-postimg { width: 100%; height: 150px; border-radius: 10px; margin-top: 7px; image-rendering: pixelated; display: block; }
#hud .sc-likes { font-size: 12px; color: rgba(255,255,255,.55); margin-top: 4px; }
#sc-card { position: fixed; left: 50%; top: 44%; z-index: 14; width: min(420px, 82vw); transform: translate(-50%, -40%) rotate(-3deg); opacity: 0;
  transition: transform .45s ease, opacity .35s ease; pointer-events: none; background: #f6efdc; color: #2b2418; border-radius: 4px;
  padding: 22px 26px 18px; box-shadow: 0 18px 40px rgba(0,0,0,.55); font-family: 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive; }
#sc-card.show { opacity: 1; transform: translate(-50%, -50%) rotate(-2deg); }
#sc-card .sc-cardkick { font-family: 'Arial Narrow', Arial, sans-serif; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #8a6f3c; }
#sc-card .sc-cardtext { font-size: 21px; line-height: 1.35; margin-top: 8px; }
#sc-card .nl-sub { color: #6d5d44; font-family: 'Arial Narrow', Arial, sans-serif; }
#sc-card .sc-sign { text-align: right; margin-top: 10px; font-size: 18px; }
#sc-card::before { content: ''; position: absolute; left: 44%; top: -10px; width: 70px; height: 22px; background: rgba(230,220,160,.7); transform: rotate(3deg); }
#sc-live { position: fixed; inset: 0; z-index: 14; pointer-events: none; opacity: 0; transition: opacity .3s; background: radial-gradient(ellipse 34% 60% at 50% 50%, transparent 72%, rgba(0,0,0,.72) 100%); font-family: 'Arial Narrow', Arial, sans-serif; color: #fff; }
#sc-live.show { opacity: 1; }
#sc-live .sc-liveframe { position: absolute; top: 3vh; bottom: 3vh; left: 50%; transform: translateX(-50%); aspect-ratio: 9 / 16; max-width: 92vw;
  border: 10px solid #111; border-radius: 34px; box-shadow: 0 0 0 100vmax rgba(0,0,0,.72); }
#sc-live .sc-livebar { position: absolute; top: 10px; left: 10px; right: 10px; font-size: 15px; text-shadow: 0 1px 2px #000; }
#sc-live .sc-chat { position: absolute; left: 8px; right: 8px; bottom: 22%; height: auto; max-height: 30%; font-size: 14px; text-shadow: 0 1px 2px #000; }
#sc-live .sc-hearts { position: absolute; right: 12px; bottom: 30%; font-size: 20px; color: #ff5a7a; text-shadow: 0 1px 2px #000; }
`;
  document.head.appendChild(st);
}

export function initStoryContact(w) {
  world = w;
  if (root) return;
  injectStyle();
  root = document.createElement('div');
  root.className = 'sc-phone';
  root.setAttribute('aria-live', 'polite');
  (document.getElementById('hud') || document.body).appendChild(root);
  window.addEventListener('resize', () => { if (cur && root.classList.contains('show')) fitPhone(cur.c); });
  cardEl = document.createElement('div');
  cardEl.id = 'sc-card';
  document.body.appendChild(cardEl);
  liveEl = document.createElement('div');
  liveEl.id = 'sc-live';
  registerNarrative('contact', { active: () => !!cur, pending: () => queue.length > 0 && !!world && ready(world) });
  liveEl.innerHTML = '<div class="sc-liveframe"><div class="sc-livebar"></div><div class="sc-chat"></div><div class="sc-hearts">&#9829;</div></div>';
  document.body.appendChild(liveEl);
}

// --- portraits: small pixel-art faces drawn on a canvas ---------------------------------

function paintPortrait(cv, key, mood = '', big = false) {
  const P = PORTRAITS[key] || PORTRAITS.jelle;
  const W = 32, H = big ? 48 : 32;
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const bg = mood === 'greide' ? '#7fb35a' : mood === 'night' ? '#141b2b' : key === 'rikus' ? '#2a1f3a' : key === 'jelle' || key === 'mem' ? '#2e5da8' : '#6b2a2f';
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  if (mood === 'greide') {
    g.fillStyle = '#9fd2f0'; g.fillRect(0, 0, W, H * 0.45);
    g.fillStyle = '#fff'; g.fillRect(24, 14, 7, 4); g.fillStyle = '#222'; g.fillRect(26, 14, 2, 2); g.fillRect(29, 16, 2, 2);
  }
  if (mood === 'limo') { g.fillStyle = '#0c0c0e'; g.fillRect(0, H - 22, W, 10); g.fillStyle = '#1e6b3a'; g.fillRect(0, H - 26, 8, 14); }
  const ox = 8, oy = big ? 12 : 6;
  const r = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(ox + x, oy + y, w, h); };
  const angry = mood === 'angry';
  // shoulders and top
  r(-6, 18, 28, 12, P.top);
  if (P.under) { r(6, 18, 4, 12, P.under); r(7, 18, 2, 4, P.scarf || P.under); }
  if (P.scarf) { r(3, 16, 10, 3, P.scarf); }
  // neck, face
  r(5, 14, 6, 4, P.skin);
  r(1, 2, 14, 14, angry ? '#e9a08a' : P.skin);
  // hair or beanie
  if (P.beanie) { r(0, -1, 16, 6, P.beanie); r(0, 4, 16, 1, '#00000033'); } else { r(0, 0, 16, 4, P.hair); r(0, 4, 2, 4, P.hair); r(12, -1, 5, 3, P.hair); }
  // eyes / sunglasses
  if (P.shades) { r(2, 7, 5, 3, '#101214'); r(9, 7, 5, 3, '#101214'); r(7, 8, 2, 1, '#101214'); r(3, 7, 1, 1, '#5a6a7a'); }
  else { r(4, 8, 2, 2, '#1d1d1d'); r(10, 8, 2, 2, '#1d1d1d'); }
  if (P.glasses && !P.shades) { r(2, 7, 5, 1, '#2a2622'); r(9, 7, 5, 1, '#2a2622'); r(2, 10, 5, 1, '#2a2622'); r(9, 10, 5, 1, '#2a2622'); r(7, 8, 2, 1, '#2a2622'); }
  // Rikus' studio headphones
  if (P.phones) { r(-1, -2, 18, 2, P.phones); r(-2, 5, 3, 6, P.phones); r(15, 5, 3, 6, P.phones); }
  if (angry) { r(2, 5, 5, 1, '#3a2a1a'); r(9, 5, 5, 1, '#3a2a1a'); r(3, 4, 2, 1, '#3a2a1a'); r(11, 4, 2, 1, '#3a2a1a'); }
  // mouth, moustache, beard
  if (P.beard) r(1, 11, 14, 5, P.hair);
  if (P.moustache) r(4, 11, 8, 2, P.hair);
  r(6, 13, 4, 1, angry ? '#7a1f1f' : mood === 'smug' ? '#8a4a3a' : '#7a3a2a');
  if (mood === 'smug') r(10, 12, 1, 1, '#7a3a2a');
  if (mood === 'wet') { g.fillStyle = '#9fd8ff'; for (const [x, y] of [[3, 3], [13, 6], [6, 1], [11, 12]]) g.fillRect(ox + x, oy + y, 1, 2); }
}

// --- the phone overlay -------------------------------------------------------------------

function renderPhone(c) {
  const who = c.from || 'jelle';
  const caller = c.caller || nameOf(who);
  const top = `<div class="sc-top"><span>${esc(world ? getClockText(world) || '' : '')}</span><span>Grunn Mobiel</span></div>`;
  let body;
  if (c.via === 'live') {
    body = `<div class="sc-livebar"><span class="sc-dot">LIVE</span><b>${esc(c.handle || 'JelleWâld')}</b><span style="margin-left:auto">&#128065; ${(c.viewers || 1953).toLocaleString('nl-NL')}</span></div>` +
      '<canvas class="sc-livecanvas"></canvas><div class="sc-chat"></div><div class="sc-bubble"></div>';
  } else if (c.via === 'post') {
    body = `<div class="sc-post"><div class="sc-posthead"><canvas></canvas><b>${esc(c.handle || 'JelleWâld')}</b><span style="margin-left:auto;color:#3fc97a;font-size:12px">KIEKDOAR</span></div>` +
      `<canvas class="sc-postimg"></canvas><div class="sc-likes">&#9829; ${esc(c.likes || '4.012')} · ${esc(c.caption || 'video')}</div></div><div class="sc-bubble"></div>`;
  } else if (c.via === 'radio') {
    body = `<div class="sc-head"><div class="sc-state">Radio Nachtstreek · live</div><canvas class="sc-portrait"></canvas><div class="sc-name">${esc(c.caller ? 'Bel Rikus' : 'Nachtstreek')}</div>` +
      `<div class="sc-sub">${esc(c.caller || 'met Rikus')}</div></div>` +
      '<div class="sc-wave">' + '<i></i>'.repeat(14) + '</div><div class="sc-bubble"></div>';
  } else {
    const state = c.via === 'voicemail' ? 'Voicemail' : 'Inkomend gesprek';
    body = `<div class="sc-head"><div class="sc-state">${state}</div><canvas class="sc-portrait"></canvas><div class="sc-name">${esc(caller)}</div>` +
      `<div class="sc-sub">${esc(c.sub || (c.caller ? 'Nummer onbekend' : 'Mobiel'))}</div></div>` +
      '<div class="sc-wave">' + '<i></i>'.repeat(14) + '</div><div class="sc-bubble"></div>';
  }
  root.dataset.via = c.via;
  root.innerHTML = top + `<div class="sc-screen">${body}</div>`;
  els = {
    bubble: root.querySelector('.sc-bubble'), state: root.querySelector('.sc-state'), chat: root.querySelector('.sc-chat'),
    bars: [...root.querySelectorAll('.sc-wave i')], live: root.querySelector('.sc-livecanvas'),
  };
  const cv = root.querySelector('.sc-portrait, .sc-livecanvas, .sc-postimg');
  if (cv) paintPortrait(cv, who, c.mood || (c.via === 'live' ? 'limo' : ''), c.via !== 'call' && c.via !== 'voicemail' && c.via !== 'radio');
  const av = root.querySelector('.sc-posthead canvas');
  if (av) paintPortrait(av, who, 'smug');
}

// a caller behind an unknown number stays unknown in the subtitle too
function setBubble(line, c = null) {
  if (!els || !els.bubble) return;
  const who = line && (c && c.caller && c.via !== 'radio' && line[0] === c.from ? c.caller : nameOf(line[0]));
  els.bubble.innerHTML = line ? speakerHtml(who) + dualHtml(line[1]) : '';
  if (line) noteSpoken(world, who);
}

function showCard(c, line) {
  const signed = c.sign || (c.from === 'jelle' ? 'J.' : '');
  cardEl.innerHTML = `<div class="sc-cardkick">${esc(c.title || 'Een kaartje')}</div><div class="sc-cardtext">${dualHtml(line[1])}` +
    `</div>${signed ? `<div class="sc-sign">– ${esc(signed)}</div>` : ''}`;
  cardEl.classList.add('show');
}

export function showLiveFrame(on, { handle = 'JelleWâld', viewers = 1953 } = {}) {
  if (!liveEl) return;
  liveEl.classList.toggle('show', !!on);
  if (!on) { clearInterval(liveEl._chat); return; }
  liveEl.querySelector('.sc-livebar').innerHTML = `<span class="sc-dot">LIVE</span><b>${esc(handle)}</b><span style="margin-left:auto">&#128065; ${viewers.toLocaleString('nl-NL')}</span>`;
  const chat = liveEl.querySelector('.sc-chat');
  const shown = [];
  let k = Math.floor(Math.random() * CHAT.length);
  const tick = () => {
    shown.push(CHAT[k++ % CHAT.length]);
    if (shown.length > 4) shown.shift();
    chat.innerHTML = shown.map(([u, t]) => `<div><b>${esc(u)}</b>${esc(t)}</div>`).join('');
  };
  tick();
  clearInterval(liveEl._chat);
  liveEl._chat = setInterval(tick, 1700);
}

// --- queue and playback --------------------------------------------------------------

export function queueStoryContact(c) {
  if (c && c.lines && c.lines.length) queue.push(c);
}

export function isStoryContactActive() {
  return !!cur;
}

// Who is on the story phone right now (the Berichten thread it lands in), or null.
export function storyContactCaller() {
  return cur ? callerOf(cur.c) : null;
}
const callerOf = (c) => (c.via === 'radio' ? 'Rikus' : c.caller || nameOf(c.from || 'jelle'));

function lineTime(line) {
  const v = lineVoiceFor(nameOf(line[0]), line[1]);
  return { v, dur: v ? v.dur + 0.45 : Math.max(2.4, readingSeconds(line[1]) * 0.8) };
}

function logHistory(c) {
  if (!world) return;
  const kind = { call: 'belde', voicemail: 'sprak in', live: 'was live', post: 'op Kiekdoar', card: 'liet een kaartje achter', scene: 'was live', radio: 'op Nachtstreek' }[c.via] || '';
  const text = c.lines.map((l) => dutchFor(l[1]) || l[1]).join(' ');
  const h = world.phoneHistory || (world.phoneHistory = []);
  const by = callerOf(c);
  // quiet: the contact makes its own sound (ring, radio sting, card); the
  // phone's buzz on top of it was a stray beep
  h.unshift({ text: `${by} ${kind}: ${text}`, at: getClockText(world) || '', from: by, body: kind ? `${kind[0].toUpperCase()}${kind.slice(1)}: ${text}` : text, quiet: true });
  if (h.length > 30) h.length = 30;
}

function ready(w) {
  return document.body.classList.contains('game-started') && !isCinematicActive() && !w.pigeonMode && !w.heliRun && !w.pendingRespawn && !w.paused && !isCallActive();
}

// narrative.js: one story item at a time, a beat after a cutscene
function canPlay(w) {
  return ready(w) && mayStart('contact');
}

function start(c) {
  cur = { c, i: -1, t: 0, phase: 'ring', until: 0 };
  world.storyContact = true;
  stopBanterVoice();
  logHistory(c);
  if (c.via === 'scene') {
    cur.phase = 'scene';
    const ok = mission && mission.playLivestream(world, { lines: c.lines, handle: c.handle, viewers: c.viewers, onDone: () => finish() });
    if (!ok) { c.via = 'live'; cur.phase = 'ring'; } else return;
  }
  if (c.via === 'card') { cur.phase = 'talk'; next(); return; }
  renderPhone(c);
  fitPhone(c);
  root.classList.add('show');
  if (c.via === 'call' || c.via === 'voicemail') { root.classList.add('ring'); playPhoneRing(2); cur.until = RING_S; } else if (c.via === 'radio') { cur.until = 1.6; } else { cur.until = 0.9; playPhoneRing(1); }
}

function next() {
  const c = cur.c;
  cur.i++;
  const line = c.lines[cur.i];
  if (!line) { finish(); return; }
  const { v, dur } = lineTime(line);
  cur.t = 0;
  cur.until = dur;
  if (v) playBanterVoice(v.src, { radio: c.via === 'radio' });
  if (line[2] && line[2].clue) playClueSting();
  if (line[2] && line[2].card) showNameCard(line[2].card);
  if (c.via === 'card') showCard(c, line);
  else { setBubble(line, c); if (root.scrollHeight > root.clientHeight + 1) fitPhone(c); }
}

// Full phone under the top-right column; without the room the portrait goes,
// then it steps aside to the left of the column (clear of the minimap). One
// layout for the whole call, so it does not jump between lines.
const FITS = [[], ['compact'], ['aside'], ['aside', 'compact']];
function fitPhone(c) {
  if (!root) return;
  const bubble = els && els.bubble;
  const before = bubble ? bubble.innerHTML : '';
  const texts = bubble ? c.lines.map((l) => speakerHtml(nameOf(l[0])) + dualHtml(l[1])) : [''];
  let fit = FITS[FITS.length - 1];
  for (const cls of FITS) {
    root.classList.remove('compact', 'aside');
    root.classList.add(...cls);
    if (texts.every((t) => { if (bubble) bubble.innerHTML = t; return root.scrollHeight <= root.clientHeight + 1; })) { fit = cls; break; }
  }
  root.classList.remove('compact', 'aside');
  root.classList.add(...fit);
  if (bubble) bubble.innerHTML = before;
}

function finish() {
  if (!cur) return;
  const c = cur.c;
  cur = null;
  holdContactChannel(false);
  if (world) world.storyContact = false;
  if (root) root.classList.remove('show', 'ring');
  if (cardEl) cardEl.classList.remove('show');
  if (c && c.onDone) c.onDone();
}

export function updateStoryContact(dt, w) {
  world = w;
  if (!root) initStoryContact(w);
  if (!cur) {
    // refs #171: a contact that no longer applies is dropped and only logged in the history
    while (queue.length && isStale(queue[0])) logHistory(queue.shift());
    if (!queue.length || !canPlay(w)) { quietT = 0; return; }
    if ((quietT += dt) < QUIET_S) return;
    quietT = 0;
    // one talking channel (speech.js): the contact holds it like a call
    if (!holdContactChannel(true, () => !!cur)) return;
    start(queue.shift());
    return;
  }
  if (cur.phase === 'scene') return;
  // the pause menu or a pausing cutscene holds the call (the card hides meanwhile)
  if (!!w.paused !== !!cur.held) { cur.held = !!w.paused; pauseBanterVoice(cur.held); }
  if (cardEl && cur.c.via === 'card' && cur.i >= 0) cardEl.classList.toggle('show', !w.paused);
  if (w.paused) return;
  // a cutscene or a respawn cuts the line; the rest of it plays again later
  // (a "Bel Rikus" stays cut once its mission has started: it was its opening)
  if (isCinematicActive() || w.pendingRespawn) {
    const c = cur.c, from = Math.max(0, cur.i);
    const missionOn = !!(w.mission && w.mission.phase === 'active');
    stopBanterVoice();
    if (c.via !== 'scene' && from < c.lines.length && !(c.on === 'lead' && missionOn)) {
      queue.unshift({ ...c, lines: c.lines.slice(from) });
      cur.c = { ...c, onDone: null };
    }
    finish();
    return;
  }
  cur.t += dt;
  if (els && els.bars.length && cur.phase === 'talk') els.bars.forEach((b, k) => { b.style.height = `${4 + Math.abs(Math.sin(cur.t * 9 + k * 1.7)) * 16}px`; });
  if (cur.phase === 'ring') {
    if (cur.t < cur.until) return;
    cur.phase = 'talk';
    root.classList.remove('ring');
    if (els.state && cur.c.via !== 'radio') els.state.textContent = cur.c.via === 'voicemail' ? 'Voicemail · afspelen' : 'Verbonden';
    if (els.chat) {
      const lines = [...CHAT].sort(() => Math.random() - 0.5).slice(0, 3);
      els.chat.innerHTML = lines.map(([u, t]) => `<div><b>${esc(u)}</b>${esc(t)}</div>`).join('');
    }
    next();
    return;
  }
  if (cur.t >= cur.until) next();
}

// the story test fast-forwards contacts like it skips cutscenes: the current one ends at once (its onDone runs)
export function skipStoryContact() {
  if (!cur || cur.phase === 'scene') return false;
  stopBanterVoice();
  finish();
  return true;
}

if (typeof window !== 'undefined') window.__storyContact = { queue: queueStoryContact, state: () => cur && { via: cur.c.via, i: cur.i, phase: cur.phase }, pending: () => queue.length, skip: skipStoryContact };
