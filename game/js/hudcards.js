// HUD cards: the one place short game messages show up, in the style of
// the "Nu op G-Music" card (left, under the health bars). Replaces the old
// white toast lines. world.addMessage(text, seconds, opts) feeds it (via
// world.cardSink); showCard(world, spec) is the direct API.
//
// - Every message gets a category (missie, bijbaan, geld, politie, gevaar,
//   prestatie, tip): opts.kind, else RULES below, else the running mission
//   or bijbaan, else tip. Each has its own accent colour and icon.
// - Redundant messages are dropped (DROP): what a cutscene card, the
//   now-playing card, the route chip or the mute icon already says.
// - At most MAX_VISIBLE cards at once; the rest wait in a short queue
//   (dangers and police first; important tips, spec.important or one that
//   teaches a key, before the rest, and only stale plain tips expire). The same key (or the
//   same text) updates the card that is up instead of stacking a new one.
// - While a cutscene hides the HUD or the game is paused, cards wait.
// - Countdowns (opts.exact, one short token like "3" or "GO! GO! GO!") are
//   a big number in the middle of the screen instead.
// - A few important cards are said out loud by whoever you play
//   (cardlines.js, lines manifest), on the speech.js channel as a reaction.
import { readingSeconds } from './world.js';
import { dualHtml } from './subtitles.js';
import { lineVoiceFor } from './linevoice.js';
import { playLineVoice } from './audio.js';
import { CARD_LINES } from './cardlines.js';
import { cardSpoken, hintVoiceFor } from './smsvoice.js';
import { CARD_PRIORITY, mayShowTip, noteTip } from './attention.js';
import { mayStart, noteToast, heldBack } from './narrative.js';
import { missionIconInner } from './missionicons.js';
import { zones, mayShow, cardPrio, cardZone, hudNow } from './hudrules.js';
import { enqueueCard } from './hudbus.js';
import { CAL_ICONS } from './calendar.js';

// the HUD's attention budget: one prominent card at a time
const MAX_VISIBLE = 1;
const MAX_QUEUE = 5;
const MIN_TIME = 4;
const MAX_TIME = 10;
const OUT_TIME = 0.45;
const TIP_STALE = 35;
const TIP_KEEP = 120;
const VOICE_GAP = 6;
const VOICE_REPEAT = 60;
const HINT_REPEAT = 20;

const ICON = {
  missie: '<path d="M6 3h2v18H6zM8 4h11l-2.5 4L19 12H8z"/>',
  bijbaan: '<path d="M9 4h6a1 1 0 0 1 1 1v2h4a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4V5a1 1 0 0 1 1-1zm1 3h4V6h-4zM3 12h18v1.6H3z"/>',
  geld: '<circle cx="12" cy="12" r="9.5"/><path class="hc-cut" d="M15.6 8.2a4.6 4.6 0 0 0-7.3 2.1H7v1.4h1.1v.6H7v1.4h1.3a4.6 4.6 0 0 0 7.3 2.1l-.9-1.2a3.1 3.1 0 0 1-4.8-.9h3.3v-1.4H9.6v-.6h3.6v-1.4H9.9a3.1 3.1 0 0 1 4.8-.9z"/>',
  politie: '<path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z"/>',
  gevaar: '<path fill-rule="evenodd" d="M12 2.5L1.5 21h21zM11 9.5h2v6h-2zm0 7.5h2v2h-2z"/>',
  prestatie: '<path d="M7 3h10v2h3v3a4 4 0 0 1-4 4h-.4A5 5 0 0 1 13 14.9V17h3v3H8v-3h3v-2.1A5 5 0 0 1 8.4 12H8a4 4 0 0 1-4-4V5h3zm0 4H6v1a2 2 0 0 0 1 1.7zm10 0v2.7A2 2 0 0 0 18 8V7z"/>',
  tip: '<path d="M9 21.5h6V20H9zM12 2a7 7 0 0 0-4 12.7V18.5h8v-3.8A7 7 0 0 0 12 2z"/>',
};
// rank: attention.js CARD_PRIORITY (story > danger > reward > tips)
const CARD_KINDS = {
  missie: { label: 'Missie', rank: CARD_PRIORITY.missie },
  bijbaan: { label: 'Bijbaantje', rank: CARD_PRIORITY.bijbaan },
  geld: { label: 'Geld', rank: CARD_PRIORITY.geld },
  politie: { label: 'Politie', rank: CARD_PRIORITY.politie },
  gevaar: { label: 'Let op', rank: CARD_PRIORITY.gevaar },
  prestatie: { label: 'Prestatie', rank: CARD_PRIORITY.prestatie },
  tip: { label: 'Tip', rank: CARD_PRIORITY.tip },
};

// Said elsewhere already: the death/busted shot, the mission outro and fail
// cards, the start location (HUD), the mute icon, the route chip, the
// now-playing card.
const DROP = [
  /^(DOOD|OPGEPAKT)$/,
  / geklaard! \+€/,
  /^Missie mislukt: /,
  /^(?!Opslaan ).+ mislukt( — .*)?$/,
  /^Je begint bij /,
  /^Geluid (uit|aan)$/,
  /^Route naar /,
  /^Nachtstreek: /,
  /^Geteleporteerd naar /,
  // ambient trains and the pigeon's bumps: noise, not news
  / naar .+ vertrekt$/,
  / is aangekomen in /,
  /^(Au! Mien snavel!|Boink\.|Die muur stond der gisteren nog nait\.|Kiek uut, joh!|Bijna platgereden!|Roekoe\?! KIJK WAAR JE RIJDT!)$/,
];

const RULES = [
  [/politie|pliesie|agent|getuige|klemgereden|meldkamer|zwaailicht|flitspaal|geflitst|bewaker|gezien!/i, 'politie'],
  [/brand|zinkt|gezonken|uitgeput|aangereden|nat geworden|code rood|onweer|storm|total loss/i, 'gevaar'],
  [/record|gevonden!|vrijgespeeld|niveau \d|^(goud|zilver|brons) · |poeppunten/i, 'prestatie'],
  [/€/, 'geld'],
];

let world = null;
let stackEl = null;
let stackE = null;
let countEl = null;
let visible = [];
let queue = [];
let countT = 0;
let lastVoiceAt = -Infinity;
const voicedAt = new Map();

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// 'm-<i>': the icon of story mission i (missionicons.js)
const svg = (kind) => `<svg viewBox="0 0 24 24" aria-hidden="true">${(/^m-\d+$/.test(kind) && missionIconInner(+kind.slice(2))) || (/^cal-/.test(kind) && CAL_ICONS[kind.slice(4)]) || ICON[kind] || ICON.tip}</svg>`;

export function initCards(w, root) {
  world = w;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./hudcards.css', import.meta.url).href;
  document.head.appendChild(link);
  stackEl = document.createElement('div');
  stackEl.className = 'hud-cards';
  stackEl.setAttribute('aria-live', 'polite');
  root.appendChild(stackEl);
  // zone E (left middle): an achievement, one at a time (hudrules.js)
  stackE = document.createElement('div');
  stackE.className = 'hud-cards-e';
  stackE.setAttribute('aria-live', 'polite');
  root.appendChild(stackE);
  countEl = document.createElement('div');
  countEl.className = 'hud-count';
  countEl.setAttribute('aria-live', 'assertive');
  root.appendChild(countEl);
  visible = [];
  queue = [];
  w.cardSink = (text, dur, opts) => fromMessage(text, dur, opts);
  if (typeof window !== 'undefined') window.__cards = { show: (spec) => showCard(world, spec), state: () => ({ visible: visible.map((c) => c.spec), queue: queue.map((q) => q.spec) }), classify };
  return stackEl;
}

// For a running mission/bijbaan the default category is that.
function contextKind(w) {
  if (w && w.sideJob && w.sideJob.active) return 'bijbaan';
  if (w && w.mission && w.mission.phase === 'active') return 'missie';
  return 'tip';
}

// "Prefix: rest" or "Short sentence! Rest" become title + body.
function split(text) {
  const t = String(text).trim();
  let m = /^([^:!?."“]{2,26}): (.+)$/.exec(t);
  if (m) return { title: m[1], body: m[2] };
  m = /^(.{3,38}?[!?.])\s+(.+)$/.exec(t);
  if (m) return { title: m[1], body: m[2] };
  if (t.length <= 38) return { title: t, body: '' };
  return { title: '', body: t };
}

// A card is up or waiting (onboarding.js waits for an empty HUD).
export const cardsBusy = () => visible.some((c) => !c.leaving) || queue.length > 0;

function classify(text, opts = {}, w = world) {
  const t = String(text || '');
  if (!t || opts.silent) return null;
  if (!opts.kind && DROP.some((re) => re.test(t))) return null;
  let kind = opts.kind;
  if (!kind) for (const [re, k] of RULES) if (re.test(t)) { kind = k; break; }
  if (!kind) kind = contextKind(w);
  return { kind, ...split(t) };
}

function fromMessage(text, dur, opts = {}) {
  if (opts.exact && dur < 2 && String(text).length <= 12) { showCount(text, dur); return; }
  const c = classify(text, opts);
  if (!c) return;
  showCard(world, { ...c, text, duration: dur, key: opts.key || text, say: opts.say, kicker: opts.kicker, important: opts.important });
}

// spec: { kind, title, body | text, bodyHtml, duration, key, icon, kicker, voice: false }
// bodyHtml (optional) is shown in place of body, which still sets timing and text.
export function showCard(w, spec) {
  if (!stackEl) return;
  world = w || world;
  const kind = CARD_KINDS[spec.kind] ? spec.kind : 'tip';
  let { title = '', body = '' } = spec;
  if (!title && !body && spec.text) ({ title, body } = split(spec.text));
  // "Missie: X" under the kicker MISSIE: X is the title
  if (title && body && title.toLowerCase() === (spec.kicker || CARD_KINDS[kind].label).toLowerCase()) { title = body; body = ''; }
  const all = `${title} ${body}`.trim();
  const secs = Math.min(MAX_TIME, Math.max(MIN_TIME, (spec.duration || 0) * 1.2, readingSeconds(all) * 1.25));
  const icon = spec.icon || (kind === 'missie' ? missionCardIcon(world, `${title} ${body} ${spec.kicker || ''}`) : null);
  const card = { spec: { ...spec, kind, title, body, icon }, secs, key: spec.key || all, at: world ? world.time : 0, age: 0, text: spec.text || all };
  card.important = kind === 'tip' && (!!spec.important || teaches(all));
  const up = visible.find((c) => c.key === card.key && !c.leaving);
  if (up) { refresh(up, card); return; }
  card.rank = CARD_KINDS[card.spec.kind].rank;
  queue = enqueueCard(queue, card, MAX_QUEUE);
}

// A mission card shows its mission's icon: the one that runs, else the one
// the card names (its code, "H3", or its title).
function missionCardIcon(w, text) {
  const m = w && w.mission;
  if (!m || !Number.isInteger(m.index)) return null;
  if (m.phase === 'active') return 'm-' + m.index;
  if ((m.code && new RegExp(`\\b${m.code}\\b`).test(text)) || (m.label && text.includes(m.label))) return 'm-' + m.index;
  return null;
}

// A key named in a card becomes a key cap: [E], "(E)", "druk (op) E/Spatie".
const KEYS = 'A|D|W|S|E|F|R|T|O|K|Q|Z|M|G|H|L|N|P|X|C|U|Spatie|Enter|Tab|Shift|Backspace|Esc';
const KEY_RE = new RegExp(`\\[(${KEYS})\\]|\\((${KEYS})\\)|(\\b[Dd]ruk (?:op )?)(${KEYS})\\b`, 'g');
function teaches(text) {
  KEY_RE.lastIndex = 0;
  return KEY_RE.test(text);
}
function keycaps(html) {
  return html.replace(KEY_RE, (m, a, b, pre, c) => {
    const k = a || b || c;
    return (pre || '') + `<kbd class="hud-key">${k === 'Spatie' ? 'SPATIE' : k.toUpperCase()}</kbd>`;
  });
}

function cardHtml(c) {
  const s = c.spec;
  const kicker = s.kicker || CARD_KINDS[s.kind].label;
  return `<div class="hc-icon">${svg(s.icon || s.kind)}</div>` +
    `<div class="hc-text"><small>${esc(kicker)}</small>${s.title ? `<b>${keycaps(dualHtml(s.title))}</b>` : ''}${s.body ? `<span${s.title ? '' : ' class="solo"'}>${s.bodyHtml || keycaps(dualHtml(s.body))}</span>` : ''}</div>` +
    '<i class="hc-timer"></i>';
}

const zoneOf = (c) => cardZone(c.spec.kind);

function mount(c) {
  const el = document.createElement('div');
  el.className = 'hud-card';
  el.dataset.kind = c.spec.kind;
  el.innerHTML = cardHtml(c);
  el.style.setProperty('--hc-dur', `${c.secs}s`);
  (zoneOf(c) === 'E' ? stackE : stackEl).appendChild(el);
  zones.occupy(zoneOf(c), 'card', cardPrio(c.spec.kind));
  // on next frame, so the entry transition runs without a forced layout
  requestAnimationFrame(() => { if (!c.leaving) el.classList.add('on'); });
  c.el = el;
  c.left = c.secs;
  visible.push(c);
  speak(c);
}

function refresh(up, c) {
  up.spec = c.spec;
  up.secs = c.secs;
  up.left = c.secs;
  up.el.dataset.kind = c.spec.kind;
  up.el.innerHTML = cardHtml(up);
  up.el.style.setProperty('--hc-dur', `${c.secs}s`);
  up.el.classList.remove('bump');
  requestAnimationFrame(() => up.el.classList.add('bump'));
}

function leave(c) {
  if (c.leaving) return;
  c.leaving = true;
  c.left = OUT_TIME;
  c.el.classList.remove('on');
  c.el.classList.add('out');
}

function speak(c) {
  if (c.spec.voice === false || !world) return;
  const hit = CARD_LINES.find((l) => l.match.test(c.text));
  if (!hit) { companionSays(c); return; }
  const now = world.time;
  if (now - lastVoiceAt < VOICE_GAP || now - (voicedAt.get(hit.say) ?? -Infinity) < VOICE_REPEAT) return;
  const who = world.player && world.player.character === 'anita' ? 'Anita' : 'Tammo';
  const v = lineVoiceFor(who, hit.say);
  if (!v) return;
  if (playLineVoice(v.src, v.dur, 'react')) { lastVoiceAt = now; voicedAt.set(hit.say, now); }
}

// A card phrased as the companion talking (smsvoice.js hints manifest): said
// by the one you don't play, once the channel is free while the card is up.
function companionSays(c) {
  const who = world.player && world.player.character === 'anita' ? 'Tammo' : 'Anita';
  const say = c.spec.say || cardSpoken(c.text);
  const v = hintVoiceFor(who, say);
  if (!v || world.time - (voicedAt.get(who + say) ?? -Infinity) < HINT_REPEAT) return;
  c.hint = { v, key: who + say };
  tryHint(c);
}

function tryHint(c) {
  const h = c.hint;
  if (!h || c.leaving) return;
  if (c.left < 1) { c.hint = null; return; }
  if (!playLineVoice(h.v.src, h.v.dur, 'react')) return;
  c.hint = null;
  voicedAt.set(h.key, world.time);
  lastVoiceAt = world.time;
  c.left = Math.max(c.left, h.v.dur + 0.6);
}

function showCount(text, dur) {
  if (!countEl) return;
  countEl.textContent = text;
  countEl.dataset.go = /\d/.test(text) ? '' : '1';
  countEl.classList.remove('on');
  void countEl.offsetWidth;
  countEl.classList.add('on');
  countT = Math.max(0.6, dur);
}

// Shown even while a story call talks: dangers, the police, and the cards of a running mission or bijbaan.
const pressing = (q, w) => q.spec.kind === 'politie' || q.spec.kind === 'gevaar' || contextKind(w) !== 'tip';

function hudHidden() {
  const b = document.body.classList;
  // trailer-hud: a gameplay shot in the trailer, before the game has started
  return !(b.contains('game-started') || b.contains('trailer-hud')) || b.contains('cine-hide-hud');
}

export function updateCards(dt, w) {
  if (!stackEl) return;
  world = w;
  if (countT > 0 && (countT -= dt) <= 0) countEl.classList.remove('on');
  // narrative.js: cards wait out every cutscene, not only the ones that hide the HUD
  // and a card that is up steps aside while a story call or a subtitle shows (not a danger or a mission's own card)
  const held = heldBack() && !visible.some((c) => !c.leaving && pressing(c, w)) && !(queue.length && pressing(queue[0], w));
  stackEl.classList.toggle('hc-held', held);
  const frozen = hudHidden() || w.paused || w.uiPaused || held || !mayStart('card', { urgent: true });
  stackEl.classList.toggle('paused', !!frozen);
  document.body.classList.toggle('hud-card-on', visible.some((c) => !c.leaving));
  if (frozen) return;
  // during a phone call only dangers and the police get a card
  const calling = document.body.classList.contains('hud-call-on');
  for (const c of visible) { c.left -= dt; if (c.hint) tryHint(c); }
  for (const c of visible.filter((v) => v.left <= 0)) {
    if (!c.leaving) leave(c);
    else {
      c.el.remove();
      visible.splice(visible.indexOf(c), 1);
      if (!visible.some((v) => zoneOf(v) === zoneOf(c))) zones.vacate(zoneOf(c), 'card');
    }
  }
  // age only counts while a card could be shown; tips wait out the tip gap,
  // an important one (it teaches a key, or says so) much longer
  // cards held back for a story call do not go stale meanwhile
  const waiting = !mayStart('card');
  for (const q of queue) if (!waiting || pressing(q, w)) q.age += dt;
  queue = queue.filter((q) => q.age < (q.spec.kind !== 'tip' ? 30 : q.important ? TIP_KEEP : TIP_STALE));
  if (!queue.length) return;
  const up = visible.filter((c) => !c.leaving);
  const busy = hudNow.busy, dia = hudNow.dialogue || calling;
  const rankOf = (q) => CARD_KINDS[q.spec.kind].rank;
  const isFree = (q) => !up.some((c) => zoneOf(c) === zoneOf(q)) && zones.free(zoneOf(q), 'card');
  // one card per zone; P3 waits out a chase or a call; tips are rationed (attention.js)
  const i = queue.findIndex((q) => isFree(q)
    && !(calling && rankOf(q) < CARD_PRIORITY.politie)
    && mayShow(cardPrio(q.spec.kind), { busy, dialogue: dia, zone: zoneOf(q) })
    && (q.spec.kind !== 'tip' || mayShowTip())
    && (pressing(q, w) || up.length || !waiting));
  if (i >= 0) {
    const next = queue.splice(i, 1)[0];
    if (next.spec.kind === 'tip') noteTip();
    noteToast();
    mount(next);
    return;
  }
  // a danger or police card pushes the oldest less urgent one out early
  const next = queue[0];
  const weakest = up.filter((c) => zoneOf(c) === zoneOf(next) && CARD_KINDS[c.spec.kind].rank < CARD_KINDS[next.spec.kind].rank).sort((a, b) => a.left - b.left)[0];
  if (weakest) leave(weakest);
  // a waiting queue shortens the card that is up (but it stays readable)
  else { const old = up.find((c) => zoneOf(c) === zoneOf(next) && c.secs - c.left > 3 && c.left > 1); if (old) old.left = Math.min(old.left, 1); }
}
