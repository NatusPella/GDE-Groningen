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
//   sub-*    a subtitle on screen (sub-cine: a cutscene's line, sub-banter: car talk);
//            only watched, toasts wait for it
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
// - Toasts also wait while any subtitle shows (a Rikus line, car talk), and
//   phone and HUD cards that are already up step aside meanwhile (heldBack).

import { NARRATIVE, decideStart } from './hudbus.js';

const { TALK } = NARRATIVE;

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
const subtitleOn = () => Object.keys(was).some((k) => k.startsWith('sub-') && was[k]);
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
  return decideStart(kind, {
    isOn,
    pending: (k) => probe(k, 'pending'),
    since: (k) => since(k, now),
    sinceAny: (ks) => sinceAny(ks, now),
    subtitle: subtitleOn(),
    toastAgo: now - lastToast,
  }, { urgent });
}

// A story contact or call is ready and waits: car banter wraps up after its line.
export function storyWaiting() {
  return probe('contact', 'pending') || probe('call', 'pending');
}

// Cards already on screen hide (and wait) while a cutscene, a story call or a subtitle is up.
export function heldBack() {
  updateNarrative();
  return isOn('scene') || isOn('contact') || isOn('call') || subtitleOn();
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
