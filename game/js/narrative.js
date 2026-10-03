// One scheduler for everything that tells the story or asks for the
// player's eyes, so they come one after the other instead of on top of each
// other or of a cutscene. The modules keep their own queues; before they
// start an item they ask mayStart(kind), and they report what is playing or
// waiting through probes (registerNarrative). Pure logic with an injectable
// clock: node scripts/narrative_test.mjs checks the rules.
//
// Kinds, most important first:
//   scene    cutscenes, the intro, recaps, the mission banner (never gated, only watched)
//   contact  story contacts (storycontact.js): "Bel Rikus" on Radio Nachtstreek, Jelle's calls
//   call     phone calls (phonefeed.js startCall)
//   text     a story text on the phone (the lead of the next step)
//   say      the companion's remark when a step starts (story.js), a speech bubble
//   banter   car talk (banter.js)
//   phone    any other phone notification (Kiekdoar, the bank, app texts)
//   award    the achievement toast
//   card     HUD cards (hudcards.js; dangers and the police are let through)
//
// Rules:
// - Nothing starts while a scene plays. Talk (contact, call, say, banter) waits
//   AFTER_SCENE after it; toasts (text, phone, award, card) TOAST_AFTER_SCENE.
// - One talking item at a time: a contact, a call, the companion's remark or banter.
//   The next one waits GAP after the last one ended.
// - Banter waits longest: while any contact or call waits to play, and
//   BANTER_GAP after anything narrative (a scene, a contact, a call, a story text).
// - The story text of a step waits until its "Bel Rikus" (a contact that is
//   about to play) is over, so the radio opens the mission and the text says
//   where; a contact or call in turn lets a story text that is up finish.
// - Toasts are held while a contact or call talks (the phone is busy), except
//   the HUD's dangers; two toasts never pop up within TOAST_GAP of each other.

const AFTER_SCENE = 2.5;
const TOAST_AFTER_SCENE = 1.2;
const GAP = 2;
const BANTER_GAP = 8;
const TOAST_GAP = 1.5;

const TALK = ['contact', 'call', 'say', 'banter'];
const TOASTS = ['text', 'phone', 'award', 'card'];

let clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
const probes = {}; // kind -> { active, pending }
const was = {}; // kind -> active at the last sample
const endedAt = {}; // kind -> clock when it last stopped being active
let lastToast = -Infinity;
let sampledAt = -Infinity;

export function setNarrativeClock(fn) { clock = fn; }

export function resetNarrative() {
  for (const k of Object.keys(probes)) delete probes[k];
  for (const k of Object.keys(was)) delete was[k];
  for (const k of Object.keys(endedAt)) delete endedAt[k];
  lastToast = -Infinity;
  sampledAt = -Infinity;
}

// active(): the item plays now; pending(): one waits and is ready to play.
export function registerNarrative(kind, { active, pending } = {}) {
  probes[kind] = { active: active || (() => false), pending: pending || (() => false) };
}

function probe(kind, which) {
  const p = probes[kind];
  if (!p) return false;
  try { return !!p[which](); } catch (e) { return false; }
}

// Samples the probes: an item that stopped playing books its end time.
// Called every frame (main.js) and before every decision.
export function updateNarrative() {
  const now = clock();
  sampledAt = now;
  for (const kind of Object.keys(probes)) {
    const on = probe(kind, 'active');
    if (was[kind] && !on) endedAt[kind] = now;
    was[kind] = on;
  }
}

const isOn = (kind) => !!was[kind];
const since = (kind, now) => (isOn(kind) ? 0 : now - (endedAt[kind] ?? -Infinity));
const sinceAny = (kinds, now) => Math.min(...kinds.map((k) => since(k, now)));

// Something narrative plays right now (a scene or talk).
export function narrativeBusy() {
  updateNarrative();
  return isOn('scene') || TALK.some(isOn);
}

// May an item of `kind` start now? Toasts that do start should call noteToast().
export function mayStart(kind, { urgent = false } = {}) {
  updateNarrative();
  const now = sampledAt;
  if (isOn('scene')) return false;
  if (TALK.includes(kind)) {
    if (since('scene', now) < AFTER_SCENE) return false;
    if (TALK.some((k) => k !== kind && isOn(k))) return false;
    if (sinceAny(TALK.filter((k) => k !== kind), now) < GAP) return false;
    // a story text being read out finishes first
    if ((kind === 'contact' || kind === 'call') && isOn('text')) return false;
    if (kind === 'banter' || kind === 'say') {
      if (probe('contact', 'pending') || probe('call', 'pending')) return false;
    }
    if (kind === 'banter') {
      if (sinceAny(['scene', 'contact', 'call', 'text'], now) < BANTER_GAP) return false;
      if (probe('text', 'pending') || isOn('text')) return false;
    }
    return true;
  }
  if (TOASTS.includes(kind)) {
    if (since('scene', now) < TOAST_AFTER_SCENE) return false;
    if (!urgent && (isOn('contact') || isOn('call'))) return false;
    if (kind === 'text' && probe('contact', 'pending')) return false;
    if (!urgent && now - lastToast < TOAST_GAP) return false;
    return true;
  }
  return true;
}

// A story contact or call is ready and waits: car banter wraps up after its line.
export function storyWaiting() {
  return probe('contact', 'pending') || probe('call', 'pending');
}

export function noteToast() { lastToast = clock(); }

export const narrativeState = () => {
  updateNarrative();
  const now = sampledAt;
  return {
    now,
    active: Object.keys(probes).filter(isOn),
    pending: Object.keys(probes).filter((k) => probe(k, 'pending')),
    since: Object.fromEntries(Object.keys(probes).map((k) => [k, +since(k, now).toFixed(2)])),
  };
};

if (typeof window !== 'undefined') window.__narrative = { state: narrativeState, mayStart };
