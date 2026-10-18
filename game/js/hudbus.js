// The one planner for everything that asks for the player's eyes (#104).
// Pure logic, no DOM, no clock, no state: the tables and the rules live here,
// the three modules that used to hold them keep their own state (clock, probes,
// last-times) and ask this module for the answer:
//   attention.js  cinematic moments and tip/voice rationing  -> decideMoment
//   narrative.js  story scenes, talk and toasts, one at a time -> decideStart
//   hudrules.js   the HUD's zones and P0..P3                  -> mayShowP
// mayShow(channel, ctx) is the single question; CHANNELS says which of the
// three rule sets answers for a channel.

export const P0 = 0, P1 = 1, P2 = 2, P3 = 3;

// Importance: story > danger > reward > discovery > tip.
export const LEVEL = { story: 5, danger: 4, reward: 3, discovery: 2, tip: 1 };

// One priority table. level: the attention scale (LEVEL); p: the HUD's P0..P3;
// zone: where a card shows (A messages, E achievement/radio). A kind without a
// level is not ranked by attention (phone items).
export const KINDS = {
  missie: { level: 'story', p: P1, zone: 'A' },
  bijbaan: { level: 'story', p: P1, zone: 'A' },
  reis: { level: 'story', p: P1, zone: 'A' },
  politie: { level: 'danger', p: P0, zone: 'A' },
  gevaar: { level: 'danger', p: P0, zone: 'A' },
  geld: { level: 'reward', p: P2, zone: 'A' },
  prestatie: { level: 'reward', p: P3, zone: 'E' },
  tip: { level: 'tip', p: P3, zone: 'A' },
  call: { p: P1, zone: 'A' },
  story: { p: P1, zone: 'A' },
  sms: { p: P2, zone: 'A' },
};

// HUD card categories (hudcards.js) on the attention scale, and phone items
// and cards on the P scale
export const CARD_PRIORITY = Object.fromEntries(
  Object.entries(KINDS).filter(([, v]) => v.level).map(([k, v]) => [k, LEVEL[v.level]]));
export const CARD_P = Object.fromEntries(Object.entries(KINDS).map(([k, v]) => [k, v.p]));
export const cardPrio = (kind) => KINDS[kind]?.p ?? P3;
export const cardZone = (kind) => KINDS[kind]?.zone ?? 'A';

// --- HUD zones (hudrules.js) -------------------------------------------------

// May an item of priority p start now? Busy moments and dialogue hold P3
// (and P2 messages in zone A, which are not on the busy list).
export function mayShowP(p, { busy = false, dialogue = false, zone = '' } = {}) {
  if (p <= P1) return true;
  if (busy) return p === P2 && zone !== 'A' && zone !== 'E';
  if (dialogue) return p === P2 && zone !== 'E';
  return true;
}

// --- narrative scheduling (narrative.js) ---------------------------------------

export const NARRATIVE = {
  AFTER_SCENE: 2.5,
  TOAST_AFTER_SCENE: 1.2,
  GAP: 2,
  BANTER_GAP: 8,
  TOAST_GAP: 1.5,
  TALK: ['contact', 'call', 'say', 'banter'],
  TOASTS: ['text', 'phone', 'award', 'card'],
};

// May an item of `kind` start? view describes the moment:
//   isOn(k), pending(k), since(k), sinceAny(kinds), subtitle (bool), toastAgo (s)
export function decideStart(kind, view, { urgent = false } = {}) {
  const { AFTER_SCENE, TOAST_AFTER_SCENE, GAP, BANTER_GAP, TOAST_GAP, TALK, TOASTS } = NARRATIVE;
  if (view.isOn('scene')) return false;
  if (TALK.includes(kind)) {
    if (view.since('scene') < AFTER_SCENE) return false;
    if (TALK.some((k) => k !== kind && view.isOn(k))) return false;
    if (view.sinceAny(TALK.filter((k) => k !== kind)) < GAP) return false;
    // a story text being read out finishes first
    if ((kind === 'contact' || kind === 'call') && view.isOn('text')) return false;
    if (kind === 'banter' || kind === 'say') {
      if (view.pending('contact') || view.pending('call')) return false;
    }
    if (kind === 'banter') {
      if (view.sinceAny(['scene', 'contact', 'call', 'text']) < BANTER_GAP) return false;
      if (view.pending('text') || view.isOn('text')) return false;
    }
    return true;
  }
  if (TOASTS.includes(kind)) {
    if (view.since('scene') < TOAST_AFTER_SCENE) return false;
    if (!urgent && (view.isOn('contact') || view.isOn('call') || view.subtitle)) return false;
    if (kind === 'text' && view.pending('contact')) return false;
    if (!urgent && view.toastAgo < TOAST_GAP) return false;
    return true;
  }
  return true;
}

// --- cinematic moments and rationing (attention.js) ----------------------------

// Cinematic moments: their level, their own cooldown and whether they may
// interrupt while driving fast. Discovery scenes share one cooldown.
export const MOMENTS = {
  wijk: { level: 'discovery', group: 'discovery', cooldown: 210, fast: false },
  landmark: { level: 'discovery', group: 'discovery', cooldown: 210, fast: false },
  ommelanden: { level: 'discovery', group: 'discovery', cooldown: 210, fast: false },
  crash: { level: 'danger', group: 'crash', cooldown: 60, fast: true },
  wanted5: { level: 'danger', group: 'wanted5', cooldown: 120, fast: true },
};
export const RATION = {
  GLOBAL_GAP: 40, // no two interruptions of any kind closer together than this
  AFTER_HIGHER: 20, // a lower level also waits this long after a higher one
  FAST: 50 / 3.6,
  TIP_GAP: 20,
};
// Phone messages read aloud: a character's text always; the news feed and the
// app's own texts at most once per gap.
export const VOICE_GAP = { news: 45, system: 30 };

// May a cinematic moment play now? c: { now, busy, callOn, narrativeBusy,
// speed, last: { any, level, groups } }.
export function decideMoment(kind, c) {
  const m = MOMENTS[kind];
  if (!m) return true;
  if (c.busy || c.callOn || c.narrativeBusy) return false;
  if (!m.fast && Math.abs(c.speed || 0) > RATION.FAST) return false;
  const { last, now } = c;
  if (now - (last.groups[m.group] ?? -Infinity) < m.cooldown) return false;
  if (now - last.any < RATION.GLOBAL_GAP) return false;
  if (LEVEL[m.level] < last.level && now - last.any < RATION.GLOBAL_GAP + RATION.AFTER_HIGHER) return false;
  return true;
}

// Tips: at most one per TIP_GAP seconds.
export const decideTip = (now, lastTip) => now - lastTip >= RATION.TIP_GAP;
// A phone message read aloud: a character's text always, the others once per VOICE_GAP.
export function decideVoice(kind, now, voicedAt) {
  const gap = VOICE_GAP[kind];
  return !gap || now - (voicedAt[kind] ?? -Infinity) >= gap;
}

// --- the one question ----------------------------------------------------------

// Which rule set answers for a channel.
export const CHANNELS = {
  moment: 'moment', // MOMENTS keys
  narrative: 'narrative', // scene, contact, call, text, say, banter, phone, award, card
  hud: 'hud', // card categories on the P scale
  tip: 'tip', // tip cards
  voice: 'voice', // phone messages read aloud
};

// mayShow('hud', { p, busy, dialogue, zone })  |  mayShow('narrative', { kind, view, urgent })
// mayShow('moment', { kind, ...decideMoment context })  |  mayShow('tip', { now, last })
// mayShow('voice', { kind, now, voicedAt })
export function mayShow(channel, ctx) {
  if (channel === CHANNELS.hud) return mayShowP(ctx.p, ctx);
  if (channel === CHANNELS.narrative) return decideStart(ctx.kind, ctx.view, ctx);
  if (channel === CHANNELS.moment) return decideMoment(ctx.kind, ctx);
  if (channel === CHANNELS.tip) return decideTip(ctx.now, ctx.last);
  if (channel === CHANNELS.voice) return decideVoice(ctx.kind, ctx.now, ctx.voicedAt);
  return true;
}

// --- the message queue (hudcards.js) --------------------------------------------

// One message at a time. cards: { key, rank (LEVEL), important, at }. A card
// with the same key replaces the waiting one; the order is rank, important,
// oldest first; over `max` the last ones fall off.
export const compareCards = (a, b) => b.rank - a.rank || (b.important | 0) - (a.important | 0) || a.at - b.at;
export function enqueueCard(queue, card, max = 5) {
  const out = queue.filter((q) => q.key !== card.key);
  out.push(card);
  out.sort(compareCards);
  return out.slice(0, max);
}
