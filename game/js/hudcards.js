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
import { icoon } from './icons.js';
import { readingSeconds } from './world.js';
import { dualHtml } from './subtitles.js';
import { lineVoiceFor } from './linevoice.js';
import { playLineVoice } from './audio.js';
import { CARD_LINES } from './cardlines.js';
import { cardSpoken, hintVoiceFor } from './smsvoice.js';
import { CARD_PRIORITY, mayShowTip, noteTip } from './attention.js';
import { mayStart, noteToast, heldBack } from './narrative.js';
import { noticeHeld, enqueueNotice, noticeQueue, kindForCard, moreLabel, MISSIE_HOLD } from './notifyqueue.js'; // alle kaarten langs de ene meldingenwachtrij: een tegelijk, nooit tijdens laden of film (22-11)
import { missionIconInner } from './missionicons.js';
import { zones, mayShow, cardPrio, cardZone, hudNow } from './hudrules.js';
import { enqueueCard, leftColumnFits, LINE_PX, throttledRead, COLUMN_OPTS_MS } from './hudbus.js';
import { getUiScale } from './uiscale.js';
import { CAL_ICONS } from './calendar.js';
import { menuMelding } from './menumelding.js';
import { hoofdspeler } from './players.js';
import { sfeerVan, sfeerStijl } from './carrieresfeer.js'; // #631: de sfeerband van de bijbaan op de kaart
import { getSettings } from './settings.js';
import { keyTextHtml, hasKeyText } from './keycap.js';
import { stickyCard } from './cardtime.js';
import { cardDuration } from './noticetiming.js'; // 4 / 6 / 9 / 10 s, voor alle meldingen gelijk
import { adjustRemaining } from './melding.js'; // het aflopende balkje loopt mee als de rest verandert
import { addCardLog, cardLogText } from './cardlog.js';
import { opschuiven } from './microinteractions.js';
import { escapeHtml as esc } from './htmlescape.js';

// the HUD's attention budget: one prominent card at a time
const MAX_VISIBLE = 1;
const MAX_QUEUE = 5;
const OUT_TIME = 0.45;
const TIP_STALE = 35;
const TIP_KEEP = 120;
const TIP_WAIT = 20;      // een tip die al zo lang op een vrij slot in de meldingenwachtrij wacht, is geen uitleg meer
const TIP_WAIT_KEEP = 45; // een tip die een toets leert mag wat langer wachten
const VOICE_GAP = 6;
const VOICE_REPEAT = 60;
const HINT_REPEAT = 20;

// Betekenisnamen (icons.js, Phosphor, ADR 0041); missie- en kalenderkaarten houden hun eigen tekening.
const ICON = { missie: 'todo', bijbaan: 'bagage', geld: 'geld', politie: 'politie', gevaar: 'waarschuwing', prestatie: 'prestaties', tip: 'idee' };
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
  /^(?!Opslaan ).+ mislukt((?: —|:) .*)?$/,
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
// #801: de laatste kaarten, voor het tekstlog (pauzemenu > Hulp).
let cardLog = [];

// 'm-<i>': the icon of story mission i (missionicons.js)
const svg = (kind) => {
  const eigen = (/^m-\d+$/.test(kind) && missionIconInner(+kind.slice(2))) || (/^cal-/.test(kind) && CAL_ICONS[kind.slice(4)]);
  return eigen ? `<svg viewBox="0 0 24 24" aria-hidden="true">${eigen}</svg>` : icoon(ICON[kind] || ICON.tip);
};

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
  // #801: een kaart die op 'geen timer' staat, sluit met een klik (zie mount)
  // of met Enter/Spatie/Escape; nooit terwijl de HUD bevroren is (menu, film).
  document.addEventListener('keydown', (e) => {
    if (e.repeat || !stackEl || stackEl.classList.contains('paused')) return;
    if (!['Enter', ' ', 'Spacebar', 'Escape'].includes(e.key)) return;
    const c = visible.filter((v) => !v.leaving && v.sticky).sort((a, b) => b.at - a.at)[0];
    if (!c) return;
    e.preventDefault();
    e.stopPropagation();
    dismissCard(c);
  }, { capture: true });
  if (typeof window !== 'undefined') window.__cards = { show: (spec) => showCard(world, spec), state: () => ({ visible: visible.map((c) => c.spec), queue: queue.map((q) => q.spec), notices: noticeQueue.state() }), log: () => cardLog.slice(), openLog: openCardLog, classify };
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
// #985: what the left column holds right now: the window height in HUD px and the lines a phone card (phonefeed.js) already takes
// #804: offsetHeight dwingt een layoutberekening af; hij werd elk frame gelezen zolang er een kaart in de wachtrij stond.
// Nu hooguit vier keer per seconde (COLUMN_OPTS_MS), en alleen als een E-kaart of een A-kaart het antwoord nodig heeft.
const columnOpts = throttledRead(() => columnOptsRead(), COLUMN_OPTS_MS);
function columnOptsRead() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return {};
  const pf = document.querySelector('#hud .phonefeed');
  const extra = pf && pf.offsetHeight > 0 ? Math.ceil(pf.offsetHeight / LINE_PX) : 0;
  return { viewH: window.innerHeight / (getUiScale() || 1), extraLines: extra };
}

export const cardsBusy = () => visible.some((c) => !c.leaving) || queue.length > 0 || noticeQueue.hasSurface('card');

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
  if (!opts.exact && menuMelding(text)) return; // pauzemenu of kaart open: de melding staat direct in beeld, niet pas na Escape (#435)
  showCard(world, { ...c, text, duration: dur, key: opts.key || text, say: opts.say, kicker: opts.kicker, important: opts.important, missie: opts.missie });
}

// spec: { kind, title, body | text, bodyHtml, duration, key, icon, kicker, voice: false }
// bodyHtml (optional) is shown in place of body, which still sets timing and text.
// De kaart gaat niet meteen in beeld: hij loopt via de meldingenwachtrij (notifyqueue.js), die er hooguit een tegelijk
// vrijgeeft, nooit tijdens laden, film, gesprek of een schermvullende kaart. Een kaart met dezelfde sleutel die al staat, ververst.
export function showCard(w, spec) {
  if (!stackEl) return;
  world = w || world;
  const card = buildCard(spec);
  const up = visible.find((c) => c.key === card.key && !c.leaving);
  if (up) { refresh(up, card); return; }
  enqueueNotice(kindForCard(card.spec.kind), cardNotice(card));
}

// Een stroom prestatiekaarten (notifyqueue.js, collapse): meer dan twee wachtend worden een kaart "N nieuwe prestaties".
// De prestaties zelf staan al geregistreerd; het menu Prestaties toont ze.
function achievementSummary(n) {
  const aantal = Number.isFinite(n) ? Math.max(2, Math.floor(n)) : 2;
  return cardNotice(buildCard({ kind: 'prestatie', kicker: 'Prestaties', title: `${aantal} nieuwe prestaties`, body: 'Alles staat in het menu onder Prestaties.', duration: 5, key: 'prestaties-samen', voice: false }));
}

function cardNotice(card) {
  const key = card.key;
  const alive = () => visible.some((c) => c.key === key) || queue.some((q) => q.key === key);
  return {
    key,
    surface: 'card',
    text: card.text,
    duration: card.secs,
    // tips vervallen na TIP_WAIT s wachten (ook de belangrijke: TIP_WAIT_KEEP); `keep` telt voor een tip niet (notifyqueue: soft)
    maxAge: card.spec.kind !== 'tip' ? undefined : card.important ? TIP_WAIT_KEEP : TIP_WAIT,
    keep: card.important,
    ignore: card.spec.missie ? [MISSIE_HOLD] : undefined, // een kaart van de missie zelf wacht niet op de missie (notifyqueue.js)
    summary: kindForCard(card.spec.kind) === 'achievement' ? achievementSummary : undefined,
    ready: () => cardReady(card),
    show: (it) => {
      if (it.more > 0) card.spec = { ...card.spec, body: [card.spec.body, moreLabel(it.more)].filter(Boolean).join(' \u00b7 ') };
      placeCard(card);
    },
    until: () => !alive(),
    cut: () => {
      const c = visible.find((v) => v.key === key);
      if (c) leave(c);
      queue = queue.filter((q) => q.key !== key);
    },
  };
}

function buildCard(spec) {
  const kind = CARD_KINDS[spec.kind] ? spec.kind : 'tip';
  let { title = '', body = '' } = spec;
  if (!title && !body && spec.text) ({ title, body } = split(spec.text));
  // "Missie: X" under the kicker MISSIE: X is the title
  if (title && body && title.toLowerCase() === (spec.kicker || CARD_KINDS[kind].label).toLowerCase()) { title = body; body = ''; }
  const all = `${title} ${body}`.trim();
  // #801: 'Leestijd' in Instellingen > Hints & uitleg; bij 'geen timer' wacht een
  // belangrijke kaart op een klik of Enter in plaats van vanzelf te verdwijnen.
  const mode = getSettings().readingTime || 'normaal';
  const secs = cardDuration({ textSeconds: readingSeconds(all), duration: spec.duration || 0, mode });
  const icon = spec.icon || (kind === 'missie' ? missionCardIcon(world, `${title} ${body} ${spec.kicker || ''}`) : null);
  const card = { spec: { ...spec, kind, title, body, icon }, secs, key: spec.key || all, at: world ? world.time : 0, age: 0, text: spec.text || all };
  card.important = kind === 'tip' && (!!spec.important || teaches(all));
  card.sticky = stickyCard(mode, card.important);
  card.rank = CARD_KINDS[card.spec.kind].rank;
  return card;
}

// Mag deze kaart nu uit de wachtrij naar het scherm? Dezelfde regels als updateCards hieronder aanlegt (aandacht, gesprek, tips).
function cardReady(card) {
  const w = world;
  if (!w || !stackEl || hudHidden() || w.paused || w.uiPaused) return false;
  const q = { spec: card.spec, important: card.important };
  const press = pressing(q, w);
  if (!press && (heldBack() || !mayStart('card'))) return false;
  const calling = document.body.classList.contains('hud-call-on');
  if (calling && card.rank < CARD_PRIORITY.politie) return false;
  if (!mayShow(cardPrio(card.spec.kind), { busy: hudNow.busy, dialogue: hudNow.dialogue || calling, zone: zoneOf(q) })) return false;
  return card.spec.kind !== 'tip' || mayShowTip();
}

// De kaart gaat de interne rij in en komt, zodra updateCards hem vrijgeeft, in beeld.
function placeCard(card) {
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

// A key named in a card becomes a key cap: {E}, [E], "(E)", "druk (op) E", "houd E" (keycap.js).
const teaches = hasKeyText;
const keycaps = keyTextHtml;

function cardHtml(c) {
  const s = c.spec;
  const kicker = s.kicker || (s.kind === 'bijbaan' && s.familieNaam) || CARD_KINDS[s.kind].label;
  // #631: een bijbaankaart draagt de sfeer van zijn vak als klein bandje (bestaande tint en motief).
  const sfeer = s.sfeerVak ? sfeerVan(s.sfeerVak) : null;
  const band = sfeer && sfeer.naam
    ? `<div class="hc-sfeer" style="display:flex;gap:6px;align-items:center;margin:2px 0 3px;padding:3px 6px;border-radius:4px;${sfeerStijl(s.sfeerVak)}"><small style="opacity:.85">${esc(sfeer.naam)}</small><span style="opacity:.7;font-size:13px">${esc(sfeer.motief || '')}</span></div>`
    : '';
  return `<div class="hc-icon">${svg(s.icon || s.kind)}</div>` +
    `<div class="hc-text"><small>${esc(kicker)}</small>${band}${s.title ? `<b>${keycaps(dualHtml(s.title))}</b>` : ''}${s.body ? `<span${s.title ? '' : ' class="solo"'}>${s.bodyHtml || keycaps(dualHtml(s.body))}</span>` : ''}</div>` +
    (c.sticky ? '<i class="ds-melding__tijd hc-timer" aria-hidden="true"></i><i class="hc-close">' + keycaps('Klik of druk op {ENTER}') + '</i>' : '<i class="ds-melding__tijd hc-timer" aria-hidden="true"></i>');
}

const zoneOf = (c) => cardZone(c.spec.kind);
// gevaar en politie: het balkje is rood (ds-melding.css); de rest bordgroen
const waarschuwing = (c) => (c.spec.kind === 'gevaar' || c.spec.kind === 'politie' ? ' ds-melding--waarschuwing' : '');

function mount(c) {
  const el = document.createElement('div');
  el.className = 'hud-card ds-mi-in ds-m-overshoot ds-melding' + waarschuwing(c); // ds-motion.css: inschuiven, staan, uitfaden; ds-micro.css: met een lichte overshoot (DS3)
  el.dataset.kind = c.spec.kind;
  el.innerHTML = cardHtml(c);
  if (!c.sticky) el.style.setProperty('--ds-melding-duur', `${c.secs}s`);
  if (c.sticky) el.classList.add('sticky');
  (zoneOf(c) === 'E' ? stackE : stackEl).appendChild(el);
  el.addEventListener('click', (ev) => {
    if (!c.sticky) return;
    ev.preventDefault();
    ev.stopPropagation();
    dismissCard(c);
  });
  zones.occupy(zoneOf(c), 'card', cardPrio(c.spec.kind));
  // on next frame, so the entry transition runs without a forced layout
  requestAnimationFrame(() => { if (!c.leaving) el.classList.add('on'); });
  c.el = el;
  c.left = c.sticky ? Infinity : c.secs;
  visible.push(c);
  if (!c.spec.noLog) cardLog = addCardLog(cardLog, { kind: c.spec.kind, title: c.spec.title, body: c.spec.body, text: c.text, key: c.key, at: c.at });
  speak(c);
}

function refresh(up, c) {
  up.spec = c.spec;
  up.secs = c.secs;
  up.sticky = c.sticky;
  up.left = c.sticky ? Infinity : c.secs;
  up.el.dataset.kind = c.spec.kind;
  up.el.innerHTML = cardHtml(up);
  if (c.sticky) up.el.classList.add('sticky');
  else { up.el.classList.remove('sticky'); up.el.style.setProperty('--ds-melding-duur', `${c.secs}s`); }
  up.el.classList.toggle('ds-melding--waarschuwing', waarschuwing(up) !== '');
  up.el.classList.remove('bump');
  requestAnimationFrame(() => up.el.classList.add('bump'));
}

function dismissCard(c) {
  if (c && c.sticky && !c.leaving) leave(c);
}

function leave(c) {
  if (c.leaving) return;
  c.leaving = true;
  // #801: een les of tip telt pas als gezien als de kaart echt weg is
  if (c.spec && c.spec.onClose) {
    const cb = c.spec.onClose;
    c.spec.onClose = null;
    try { cb(); } catch (e) { /* een kaart mag het spel nooit stukmaken */ }
  }
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
  const ik = hoofdspeler(world);
  const who = ik && ik.character === 'anita' ? 'Anita' : 'Tammo';
  const v = lineVoiceFor(who, hit.say);
  if (!v) return;
  if (playLineVoice(v.src, v.dur, 'react')) { lastVoiceAt = now; voicedAt.set(hit.say, now); }
}

// A card phrased as the companion talking (smsvoice.js hints manifest): said
// by the one you don't play, once the channel is free while the card is up.
function companionSays(c) {
  const ik = hoofdspeler(world);
  const who = ik && ik.character === 'anita' ? 'Tammo' : 'Anita';
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
  adjustRemaining(c.el, c.left);
}

// #801: het tekstlog openen als gewone (sticky) kaart; de les blijft daarna
// terug te lezen, ook als hij eerder automatisch wegging.
export function openCardLog() {
  if (!world || !stackEl) return null;
  const entries = cardLog.slice(-6);
  const body = entries.length
    ? entries.map((e) => `<div style="margin:2px 0">${esc((e.title ? e.title + ': ' : '') + (e.body || e.text || ''))}</div>`).join('')
    : '<div>Nog geen berichten.</div>';
  showCard(world, { kind: 'tip', kicker: 'Tekstlog', title: 'Laatste uitleg en tips', body: cardLogText(entries), bodyHtml: body, key: 'card-log', duration: 9, important: true, voice: false, noLog: true, onClose: null });
  return entries.length;
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
  const frozen = hudHidden() || w.paused || w.uiPaused || held || noticeHeld(['screen', 'cutscene', 'dialogue', 'mission']) || !mayStart('card', { urgent: true });
  stackEl.classList.toggle('paused', !!frozen);
  if (stackE) stackE.classList.toggle('paused', !!frozen); // het balkje van een E-kaart staat dan ook stil
  document.body.classList.toggle('hud-card-on', visible.some((c) => !c.leaving));
  if (frozen) return;
  // during a phone call only dangers and the police get a card
  const calling = document.body.classList.contains('hud-call-on');
  for (const c of visible) { if (!c.sticky) c.left -= dt; if (c.hint) tryHint(c); }
  for (const c of [...visible]) {
    if (c.sticky || c.left > 0) continue;
    if (!c.leaving) leave(c);
    else {
      opschuiven(c.el.parentNode, () => c.el.remove()); // de volgende kaart schuift soepel op
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
  // zone A and zone E share the left column: an E card waits until it fits under the A card that is up (hudbus.js, leftColumnFits)
  const upA = up.find((c) => zoneOf(c) === 'A');
  const fitsColumn = (q) => zoneOf(q) !== 'E' || leftColumnFits(upA ? upA.spec : null, q.spec, columnOpts());
  // one card per zone; P3 waits out a chase or a call; tips are rationed (attention.js)
  const i = queue.findIndex((q) => isFree(q) && fitsColumn(q)
    && !(calling && rankOf(q) < CARD_PRIORITY.politie)
    && mayShow(cardPrio(q.spec.kind), { busy, dialogue: dia, zone: zoneOf(q) })
    && (q.spec.kind !== 'tip' || mayShowTip())
    && (pressing(q, w) || up.length || !waiting));
  if (i >= 0) {
    const next = queue.splice(i, 1)[0];
    if (next.spec.kind === 'tip') noteTip();
    // #631: de sfeer van de lopende bijbaan mee de kaart in (de baan publiceert sfeerVak).
    if (next.spec.kind === 'bijbaan' && w && w.sideJob && w.sideJob.active) {
      if (w.sideJob.sfeerVak) next.spec.sfeerVak = w.sideJob.sfeerVak;
      if (w.sideJob.familieNaam) next.spec.familieNaam = w.sideJob.familieNaam;
    }
    noteToast();
    mount(next);
    // an A card never waits for an E card: an E card it would run into steps aside and comes back after it
    if (zoneOf(next) === 'A') for (const e of up) if (zoneOf(e) === 'E' && !leftColumnFits(next.spec, e.spec, columnOpts())) {
      queue = enqueueCard(queue, { spec: { ...e.spec, noLog: true }, secs: e.secs, key: e.key, at: e.at, age: 0, text: e.text, important: e.important, sticky: e.sticky, rank: e.rank }, MAX_QUEUE);
      leave(e);
    }
    return;
  }
  // a danger or police card pushes the oldest less urgent one out early
  const next = queue[0];
  const weakest = up.filter((c) => zoneOf(c) === zoneOf(next) && CARD_KINDS[c.spec.kind].rank < CARD_KINDS[next.spec.kind].rank).sort((a, b) => a.left - b.left)[0];
  if (weakest) leave(weakest);
  // a waiting queue shortens the card that is up (but it stays readable)
  else { const old = up.find((c) => zoneOf(c) === zoneOf(next) && c.secs - c.left > 3 && c.left > 1); if (old) { old.left = Math.min(old.left, 1); adjustRemaining(old.el, old.left); } }
}
