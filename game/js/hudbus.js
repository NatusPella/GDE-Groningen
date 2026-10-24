// The one planner for everything that asks for the player's eyes (#104).
// Pure logic, no DOM, no clock, no state: the tables and the rules live here,
// the three modules that used to hold them keep their own state (clock, probes,
// last-times) and ask this module for the answer:
//   attention.js  cinematic moments and tip/voice rationing  -> decideMoment
//   narrative.js  story scenes, talk and toasts, one at a time -> decideStart
//   hudrules.js   the HUD's zones and P0..P3                  -> mayShowP
//   overlayrules.js full-screen cards hold the small ones      -> decideOverlay
//   speech.js     one spoken line at a time                    -> decideSpeak
// mayShow(channel, ctx) is the single question; CHANNELS says which rule set
// answers for a channel, SURFACES lists every thing that asks for the player's
// eyes or ears and which channels it goes through (docs/KANALEN.md).

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
  // every kind a module may ask for or report (scene is only watched; sub-* are subtitles)
  KINDS: ['scene', 'contact', 'call', 'say', 'banter', 'text', 'phone', 'award', 'card', 'sub-cine', 'sub-banter'],
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

// --- overlays (overlayrules.js) ------------------------------------------------

// A full-screen card (the mission result, the choice panel) and a duel bar hold
// back the small things that would lie under or over them. Higher rank wins;
// equal ranks never hold each other.
export const OVERLAY_RANK = { resultaat: 5, keuze: 4, duelbalk: 3, prestatie: 2, wijkkaart: 1.5, naamkaart: 1, locatie: 1 };
export const OVERLAY_HOLDS = {
  resultaat: ['wijkkaart', 'naamkaart', 'locatie', 'prestatie', 'duelbalk'],
  keuze: ['wijkkaart', 'naamkaart', 'locatie', 'prestatie'],
  duelbalk: ['prestatie', 'locatie', 'wijkkaart'],
  // the wijkkaart (big district name, bottom left) and the naamkaart share a spot: one at a time (#292)
  wijkkaart: ['naamkaart', 'locatie'],
};

// active: a list or Set of the overlays on screen. Returns the Set that must wait.
export function heldOverlays(active) {
  const on = new Set(active || []);
  const held = new Set();
  for (const a of on) for (const h of OVERLAY_HOLDS[a] || []) if (on.has(h) && (OVERLAY_RANK[a] || 0) > (OVERLAY_RANK[h] || 0)) held.add(h);
  return held;
}

// May this overlay begin, given the others that are up?
export const decideOverlay = (name, active) => !heldOverlays([...(active || []).filter((a) => a !== name), name]).has(name);

// --- spoken lines (speech.js) ------------------------------------------------------

// Classes of spoken line, low to high, and the gap that must pass before the
// next line of a class may start.
export const SPEECH_PRIO = { radio: 0, ambient: 1, react: 2, job: 3, banter: 4, call: 5, mission: 6, story: 7 };
export const SPEECH_GAP = { radio: 2.5, ambient: 1.0, react: 0.5, job: 0.3, banter: 0.3, call: 0, mission: 0, story: 0 };
// Does a line of priority p cut off the clip that plays (c.prio) or the hold (h.prio)?
export const cutsClip = (p, c) => p === SPEECH_PRIO.story || (p > c.prio && (p >= SPEECH_PRIO.job || c.prio === SPEECH_PRIO.radio) && c.prio < SPEECH_PRIO.call);
export const cutsHold = (p, h) => p === SPEECH_PRIO.story || (p > h.prio && p >= SPEECH_PRIO.call && h.prio <= SPEECH_PRIO.banter);

// May a line of class `cls` start? s: { clip: { prio, own } | null (the clip that plays; own: the asker's
// own clip), hold: { prio } | null (the strongest hold of someone else), silentFor (s since the last line ended) }.
export function decideSpeak(cls, { clip = null, hold = null, silentFor = Infinity } = {}) {
  const p = SPEECH_PRIO[cls] ?? SPEECH_PRIO.ambient;
  if (p === SPEECH_PRIO.story) return true;
  if (clip && !clip.own && !cutsClip(p, clip)) return false;
  if (hold && hold.prio >= p) return false;
  if (hold && !cutsHold(p, hold) && hold.prio >= SPEECH_PRIO.call) return false;
  if (!clip && silentFor < (SPEECH_GAP[cls] ?? 1)) return false;
  return true;
}

// --- the one question ----------------------------------------------------------

// Which rule set answers for a channel.
export const CHANNELS = {
  moment: 'moment', // MOMENTS keys
  narrative: 'narrative', // scene, contact, call, text, say, banter, phone, award, card
  hud: 'hud', // card categories on the P scale
  tip: 'tip', // tip cards
  voice: 'voice', // phone messages read aloud
  overlay: 'overlay', // full-screen cards that hold the small ones
  speech: 'speech', // spoken lines, one at a time
};

// mayShow('hud', { p, busy, dialogue, zone })  |  mayShow('narrative', { kind, view, urgent })
// mayShow('moment', { kind, ...decideMoment context })  |  mayShow('tip', { now, last })
// mayShow('voice', { kind, now, voicedAt })  |  mayShow('overlay', { name, active })
// mayShow('speech', { cls, clip, hold, silentFor })
export function mayShow(channel, ctx) {
  if (channel === CHANNELS.hud) return mayShowP(ctx.p, ctx);
  if (channel === CHANNELS.narrative) return decideStart(ctx.kind, ctx.view, ctx);
  if (channel === CHANNELS.moment) return decideMoment(ctx.kind, ctx);
  if (channel === CHANNELS.tip) return decideTip(ctx.now, ctx.last);
  if (channel === CHANNELS.voice) return decideVoice(ctx.kind, ctx.now, ctx.voicedAt);
  if (channel === CHANNELS.overlay) return decideOverlay(ctx.name, ctx.active);
  if (channel === CHANNELS.speech) return decideSpeak(ctx.cls, ctx);
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

// --- the surfaces: everything that asks for the player's eyes or ears -------------
//
// One row per surface (a thing the player sees or hears that the game put there
// by itself). files: the modules that draw or play it. gates: the rule sets it
// goes through, as [channel, kind] (a surface with several gates must pass all of
// them). kinds: its card kinds in KINDS, from which the P scale and the zone
// follow. own: a surface without a gate says why (the player opened it, or the
// activity owns the place). scripts/hudbus_surfaces_test.mjs checks that every
// module that puts its own overlay on screen is listed here, so a new channel has
// to say how it is planned; scripts/hudbus_inventory.mjs --md writes
// docs/KANALEN.md from this table.
export const SURFACES = {
  kaart: { files: ['hudcards.js'], kinds: ['missie', 'bijbaan', 'reis', 'politie', 'gevaar', 'geld', 'prestatie', 'tip'], gates: [['hud'], ['narrative', 'card'], ['tip']] },
  prestatie: { files: ['achievements.js'], zone: 'E', p: P3, gates: [['narrative', 'award'], ['overlay', 'prestatie']] },
  bel: { files: ['phonefeed.js'], kinds: ['call'], gates: [['narrative', 'call'], ['speech', 'call']] },
  bericht: { files: ['phonefeed.js', 'sikkomfeed.js'], kinds: ['story', 'sms'], gates: [['narrative', 'text'], ['narrative', 'phone'], ['voice']] },
  radio: { files: ['storycontact.js'], p: P1, gates: [['narrative', 'contact']] },
  opmerking: { files: ['story.js'], p: P1, gates: [['narrative', 'say']] },
  autopraat: { files: ['banter.js'], zone: 'G', p: P3, gates: [['narrative', 'banter'], ['narrative', 'sub-banter'], ['speech', 'banter']] },
  ondertitel: { files: ['cinematics.js', 'storytalk.js', 'subtitles.js', 'radiosub.js'], zone: 'G', p: P1, gates: [['narrative', 'sub-cine']] },
  scene: { files: ['cinematics.js', 'intromontage.js', 'respawn.js', 'reisrit.js'], gates: [['narrative', 'scene']] },
  moment: { files: ['cinematics.js'], gates: [['moment', 'wijk'], ['moment', 'landmark'], ['moment', 'ommelanden'], ['moment', 'crash'], ['moment', 'wanted5']] },
  banner: { files: ['cinematics.js'], zone: 'D', p: P0, gates: [['overlay', 'resultaat'], ['narrative', 'scene']] },
  naamkaart: { files: ['namecard.js'], gates: [['overlay', 'naamkaart']] },
  plaatsnaam: { files: ['hud_panel.js'], zone: 'B', p: P3, gates: [['overlay', 'locatie']] },
  wijkkaart: { files: ['cinematics.js'], zone: 'B', p: P3, gates: [['overlay', 'wijkkaart']] },
  keuze: { files: ['choicepanel.js'], zone: 'B', p: P1, gates: [['overlay', 'keuze']] },
  bord: { files: ['minigamekit.js', 'golfhud.js'], zone: 'B', p: P1, gates: [['overlay', 'duelbalk']] },
  ballon: { files: ['scene3d.js'], p: P3, gates: [['speech', 'ambient']] },
  spraak: { files: ['speech.js'], gates: [['speech']] },
  // own planning, no gate: the HUD's layout (decideHud, hudrules.js) or a panel the player or the activity owns
  status: { files: ['hud_panel.js', 'hudgps.js', 'lowhealth.js'], p: P2, own: 'decideHud (hudrules.js) zet sterren, geld, kaart, voertuig, doel en balken neer' },
  opgeslagen: { files: ['savegame.js'], zone: 'F', p: P3, own: 'het kleine Opgeslagen-vinkje bij de plaatsnaam, links onder; een eigen DOM-element, geen kaart' },
  toetsen: { files: ['prompts.js', 'hudtext.js'], zone: 'H', p: P2, own: 'de toetstips tellen mee in decideHud (keys); gameBusy houdt ze weg' },
  activiteit: { files: ['stunthud.js', 'heistui.js', 'casework.js', 'bakeround.js', 'carbid.js', 'dorpsuitjes.js', 'kermis.js', 'padel.js', 'pigeonmode.js', 'postgame.js', 'reuzenrad.js', 'rondvaartchase.js', 'stationtravel.js'], zone: 'C', p: P1, own: 'het paneel van de activiteit zelf; de activiteit bepaalt wanneer, playerBusy houdt de rest weg' },
  voertuighud: { files: ['heliflight.js', 'helirun.js', 'planeflight.js', 'instrumenten.js', 'busboard3d.js', 'busbestuurhud.js'], zone: 'H', p: P2, own: 'vervangt de snelheidsmeter zolang je vliegt (body.heli-flying)' },
  samen: { files: ['coophud.js', 'coophold.js', 'coopscene.js', 'partnerhud.js', 'coopspelersui.js', 'coophostwisselui.js', 'coopwedstrijd3d.js'], p: P2, own: 'de uitnodiging Meedoen? en de uitslag van een race of golfronde tegen elkaar (coopwedstrijd3d.js, alleen zolang er een wedstrijd is), de spelerslijst (alleen bij Tab en in het pauzemenu, nooit permanent) en de fade bij samen spelen, en het meekijklaagje van een gast op de scene van de host (coopscene.js, volgt wat de host toont); geen eigen planner' },
  menu: { files: ['pausemenu.js', 'menumelding.js', 'veroverdpanel.js', 'mapview.js', 'phone.js', 'todoui.js', 'garageui.js', 'shopui.js', 'verhaalui.js', 'profileoverlay.js', 'loopbaanui.js', 'boerderijui.js', 'visboekui.js', 'startscreen.js', 'furniture.js', 'gfxprofile.js', 'samenkeuze.js', 'textfield.js'], own: 'de speler opent het zelf; het is modaal en de rest wacht' },
  invoer: { files: ['input.js', 'touch.js', 'aimassist.js'], own: 'invoer en richtkruis; vragen de aandacht niet' },
  dev: { files: ['storydev.js', 'storytest.js', 'testmenu.js', 'padtest.js', 'trailer.js'], own: 'ontwikkel- en promohulpen; niet voor de speler' },
  effect: { files: ['postfx3d.js', 'drunk.js'], own: 'schermeffect zonder tekst (flits, kleur); geen informatie' },
};

// The P scale and the zone of a surface: its own, else those of its card kinds (the most urgent / the first).
export const surfaceP = (id) => SURFACES[id]?.p ?? (SURFACES[id]?.kinds ? Math.min(...SURFACES[id].kinds.map((k) => KINDS[k].p)) : null);
export const surfaceZone = (id) => SURFACES[id]?.zone ?? (SURFACES[id]?.kinds ? KINDS[SURFACES[id].kinds[0]].zone : null);

// May this surface show now? ctx has one entry per channel the caller can answer (ctx.narrative = { view, urgent },
// ctx.hud = { busy, dialogue }, ctx.overlay = { active }, ...); every gate with an entry must say yes. A surface
// without a gate, or an unknown one, always may. `only`: ask just the gates of that kind (a surface with
// several kinds, like the cinematic moments, is asked one kind at a time).
export function mayShowSurface(id, ctx = {}, only = null) {
  const s = SURFACES[id];
  if (!s || !s.gates) return true;
  return s.gates.every(([channel, kind]) => !ctx[channel] || (only && kind && kind !== only) || mayShow(channel, {
    ...ctx[channel],
    p: surfaceP(id),
    zone: surfaceZone(id),
    ...(kind ? { kind, name: kind, cls: kind } : {}),
  }));
}
