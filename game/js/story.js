// Story director: walks the arc in storyarc.js. It keeps the guided route
// (world.storyGuide, used by routing.js when the player has no waypoint of
// their own) on the next step, sends a short phone message about why, pays a
// voorschot when a purchase is out of reach, offers "Sla deze missie over"
// after a failure and shows the "Wordt vervolgd" card where the built part
// of the story ends. Each step says who the player controls (step.player):
// Tammo and Anita trade places at its start, behind a short fade. After the
// built story the last step's character stays.

import { STEPS, STEP_BY_ID, PARTS, CLUES, WHY, stepAvailable, missionIndexOf, computeMoneyTimeline } from './storyarc.js';
import { queueStoryContact } from './storycontact.js';
import { playClueSting } from './audio.js';
import { lineVoiceFor } from './linevoice.js';
import {
  setMissionHooks, setNextMission, isMissionActive, isMissionCompleted, markMissionCompleted, getMissionDefs,
  unmetRequirement, requirementMet, requirementPlace, isNight, setMissionProgress, getMissionProgress, missionDebug,
} from './missions.js';
import { getShopVisits, getShopsForRender, grantStoryItem } from './shops.js';
import { getPigeonFlight } from './pigeonmode.js';
import { getPigeonSpotsForRender } from './pigeonspots.js';
import { getSideJobList } from './sidejobs.js';
import { getGaragesForRender } from './garages.js';
import { playCinematic, isCinematicActive } from './cinematics.js';
import { refreshDayNight } from './daynight.js';
import { getTrainTripCount, getStationsForRender } from './stationtravel.js';
import { getEierballen } from './achievementtracker.js';

const LEAD_DELAY = 3;
const GUIDE_EVERY = 2.5;
const REMIND_AFTER = 300;
const SKIP_OFFER_S = 30;
const SKIP_SHARE = 0.5;
const GATED_SKIP_S = 90;
const NIGHT_GARAGE_M = 16;
const NIGHT_HOUR = 21.4;
const SWAP_FADE = 0.45;

let world = null;
let ready = false;
let els = null;
const state = freshState();
let rt = freshRuntime();

function freshState() {
  return { done: new Set(), skipped: new Set(), fails: {}, waived: new Set(), voorschot: new Set(), cards: new Set(), flags: new Set() };
}

function freshRuntime() {
  return { cur: undefined, enteredAt: 0, leadAt: -1, reminded: false, base: {}, guideT: 0, skipUntil: -1, cardPending: null, nightWait: false, voorschotT: 0, lastPlayer: null, recapPending: null, newClues: new Set(), clueToasts: [] };
}

const who = (k) => (k === 'T' ? 'Tammo' : k === 'A' ? 'Anita' : k);

function phone(from, text, duration = 6) {
  if (world && world.phoneNotifications) world.phoneNotifications.push({ from, text, duration });
}

function missionIdx(step) {
  return step && step.kind === 'mission' ? missionIndexOf(step.mission) : -1;
}

// --- which step is next ----------------------------------------------------------

// Done: finished or skipped, a mission the chain already counts as passed,
// or an activity that a later, passed mission has made moot (old saves and
// missions played ahead via the phone).
function isDone(step, k) {
  if (state.done.has(step.id)) return true;
  if (step.kind === 'mission') {
    const i = missionIdx(step);
    return i >= 0 && isMissionCompleted(i);
  }
  for (let j = k + 1; j < STEPS.length; j++) {
    const s = STEPS[j];
    if (s.kind === 'mission' && (state.done.has(s.id) || (missionIdx(s) >= 0 && isMissionCompleted(missionIdx(s))))) return true;
  }
  return false;
}

// The next step to play, or { end: part } where the built story stops.
export function currentStep() {
  let lastPart = 'kop';
  for (let k = 0; k < STEPS.length; k++) {
    const s = STEPS[k];
    if (!stepAvailable(s)) return { end: lastPart, next: s };
    lastPart = s.part;
    if (!isDone(s, k)) return s;
  }
  return { end: lastPart, next: null, finale: true };
}

// --- goals of activity steps --------------------------------------------------------

function nearest(list, from) {
  let best = null, bd = Infinity;
  for (const q of list) {
    const d = Math.hypot(q.x - from.x, q.y - from.y);
    if (d < bd) { bd = d; best = q; }
  }
  return best;
}

const jobIds = (st) => (Array.isArray(st.goal.job) ? st.goal.job : [st.goal.job]);
const jobRounds = (st) => getSideJobList().filter((x) => jobIds(st).includes(x.id)).reduce((n, j) => n + (j.rounds || 0), 0);
const eggsFound = () => getEierballen().filter((e) => e.found).length;

const GOALS = {
  shop: {
    begin: (st, b) => { b.visits = getShopVisits(st.goal.shop); },
    met: (st, b) => getShopVisits(st.goal.shop) > (b.visits ?? Infinity),
    place: (st) => nearest(getShopsForRender().filter((s) => s.type === st.goal.shop), world.player),
  },
  require: {
    met: (st) => requirementMet(world, st.goal.req),
    place: (st) => requirementPlace(world, st.goal.req),
  },
  pigeon: {
    met: (st) => { const f = getPigeonFlight(); return !!f && f.score >= st.goal.score; },
    place: (st) => getPigeonSpotsForRender().find((s) => s.id === st.goal.spot) || nearest(getPigeonSpotsForRender(), world.player),
  },
  sideJob: {
    begin: (st, b) => { b.rounds = jobRounds(st); },
    met: (st, b) => jobRounds(st) > (b.rounds ?? Infinity),
    place: (st) => { const j = nearest(getSideJobList().filter((x) => jobIds(st).includes(x.id)), world.player); return j ? { x: j.x, y: j.y, name: j.name } : null; },
  },
  night: {
    met: () => isNight(world),
    place: () => nearest(getGaragesForRender(), world.player),
  },
  train: {
    begin: (st, b) => { b.trips = getTrainTripCount(); },
    met: (st, b) => getTrainTripCount() > (b.trips ?? Infinity),
    place: () => nearest(getStationsForRender(), world.player),
  },
  egg: {
    begin: (st, b) => { b.eggs = eggsFound(); },
    met: (st, b) => eggsFound() > (b.eggs ?? Infinity),
    place: () => nearest(getEierballen().filter((e) => !e.found), world.player),
  },
};

// --- flow ------------------------------------------------------------------------------

function enter(step) {
  rt.cur = step;
  rt.enteredAt = world.time;
  rt.reminded = false;
  rt.base = {};
  rt.guideT = 0;
  rt.nightWait = false;
  rt.gate = null;
  rt.gatedSince = -1;
  rt.gateOffered = false;
  // after the built story, idle missions get no automatic route (routing.js)
  world.storyFreePlay = !!(step && step.end);
  if (!step || step.end) {
    world.storyGuide = null;
    if (step && step.end && !state.cards.has(step.end)) rt.cardPending = step.end;
    return;
  }
  rt.leadAt = world.time + LEAD_DELAY;
  // the first step of a later part opens with an "Eerder in GTE VI" recap
  const first = STEPS.find((s) => s.part === step.part && stepAvailable(s));
  if (first === step && PARTS[step.part].recap && !state.flags.has('recap:' + step.part)) rt.recapPending = step.part;
  updateCharacter(world);
  if (step.kind === 'activity' && GOALS[step.goal.type] && GOALS[step.goal.type].begin) GOALS[step.goal.type].begin(step, rt.base);
  pointMissionChain(step);
  refreshGuide();
}

// The mission marker shows the mission of this step, or the next mission
// step after an activity.
function pointMissionChain(step) {
  if (isMissionActive()) return;
  const k = STEPS.indexOf(step);
  for (let j = k; j < STEPS.length; j++) {
    const s = STEPS[j];
    if (!stepAvailable(s)) break;
    if (s.kind === 'mission' && missionIdx(s) >= 0 && !isDone(s, j)) { setNextMission(world, missionIdx(s)); return; }
  }
}

function markDone(step, { skipped = false, quiet = false } = {}) {
  state.done.add(step.id);
  if (skipped) state.skipped.add(step.id);
  delete state.fails[step.id];
  rt.skipUntil = -1;
  if (step.unlocks) state.flags.add(step.unlocks);
  if (!quiet && step.kind === 'activity' && step.done) phone(who(step.done[0]), step.done[1], 5);
  if (!quiet && step.after) for (const [from, text] of step.after) phone(from, text, 6);
  if (step.beat) for (const [from, text] of step.beat) phone(who(from), text, 6);
  if (!quiet) queueContacts(step, 'after');
  for (const c of CLUES) {
    if (c.step !== step.id) continue;
    rt.newClues.add(c.title);
    if (!quiet) rt.clueToasts.push(c.title);
  }
}

// Jelle's (or the twins') calls, livestreams, posts and cards (storycontact.js);
// their `after` texts arrive once the contact is over.
function queueContacts(step, on) {
  for (const c of step.contact || []) {
    if ((c.on || 'after') !== on) continue;
    queueStoryContact({ ...c, onDone: () => { for (const [from, text] of c.after || []) phone(who(from), text, 6); } });
  }
}

function refreshGuide() {
  const step = rt.cur;
  if (!step || step.end || isMissionActive()) { world.storyGuide = null; return; }
  let place = null;
  let why = step.title;
  if (step.kind === 'mission') {
    const defs = getMissionDefs();
    const def = defs[missionIdx(step)];
    const gate = def ? unmetRequirement(world, def) : null;
    if (gate) { place = requirementPlace(world, gate); why = `Eerst: ${gateLabel(gate)}`; }
    else if (def) place = def.start;
    // a requirement that stays unmet (no money, the rental boat sank) also makes the step skippable
    rt.gate = gate;
    rt.gatedSince = gate ? (rt.gatedSince >= 0 ? rt.gatedSince : world.time) : -1;
    if (gate && world.time - rt.gatedSince > GATED_SKIP_S && !rt.gateOffered) { rt.gateOffered = true; rt.skipUntil = world.time + SKIP_OFFER_S; }
    // the player picked another mission meanwhile: arm this one again once they are at its start
    if (!gate && def && Math.hypot(def.start.x - world.player.x, def.start.y - world.player.y) < 40) setNextMission(world, missionIdx(step));
  } else {
    const g = GOALS[step.goal.type];
    place = g && g.place(step);
  }
  world.storyGuide = place ? { x: place.x, y: place.y, name: why, step: step.id } : null;
}

function gateLabel(key) {
  return { weapon: 'koop een wapen', bike: 'koop een fiets', car: 'koop een auto', heist: 'zwart incognito of een huurboot', night: 'wachten tot het donker is', boat: 'huur een boot' }[key] || key;
}

// Tops up the money for a purchase the step needs, once per step.
function checkVoorschot(step) {
  if (!step || step.end || !step.cost || !step.voorschot || state.voorschot.has(step.id)) return;
  if (step.goal && step.goal.type === 'require' && requirementMet(world, step.goal.req)) return;
  if (world.money >= step.cost) return;
  const gift = Math.ceil((step.cost - world.money + 25) / 5) * 5;
  world.money += gift;
  state.voorschot.add(step.id);
  phone(step.voorschot.from, `${step.voorschot.text} (+€${gift})`, 7);
  world.addMessage(`${step.voorschot.from} schiet €${gift} voor`, 3.5);
}

// Waiting at a garage for the night: a short card, then the clock jumps.
function updateNightWait(step) {
  if (rt.nightWait || isNight(world) || world.pigeonMode || isCinematicActive()) return;
  const g = GOALS.night.place();
  if (!g || Math.hypot(g.x - world.player.x, g.y - world.player.y) > NIGHT_GARAGE_M) return;
  rt.nightWait = true;
  const ok = playCinematic({
    id: 'story-wait', priority: 2, duration: 3.2, pause: true, letterbox: true, skippable: true, hideHud: true,
    big: 'Wachten tot het donker is…',
    lines: [{ speaker: 'Henk', text: 'Blijf maar even hangen. Koffie staat achterin.', at: 0.5, dur: 2.4 }],
    onEnd: () => setNight(),
  });
  if (!ok) setNight();
}

function setNight() {
  if (!isNight(world)) { world.clock = NIGHT_HOUR; refreshDayNight(world); }
}

// Credits after the epilogue: name cards over the city, no voices.
const CREDITS = [
  ['Tammo & Anita', 'hoofdrollen'],
  ['Jelle Terpstra', 'de Fryske Snackkening'],
  ['Durk & Douwe', 'op één fatbike'],
  ['Bommen Berend, Oma Trijntje, Kapitein Klaas', 'en de rest van Grunn'],
  ['d\'Olle Grieze', 'keek alles aan en zei niks'],
];

// A slow climb around d'Olle Grieze for the ending.
function finaleShot(t0 = 0) {
  const lm = (world.map.meta.landmarks || []).find((l) => l.name === 'Martinitoren') || { x: 214, y: 13 };
  return (u, t) => {
    const a = 0.6 + (t0 + t) * 0.035;
    const r = 150 - (t0 + t) * 0.6;
    return { position: { x: lm.x + Math.cos(a) * r, y: lm.y + Math.sin(a) * r, z: 55 + (t0 + t) * 0.5 }, lookAt: { x: lm.x, y: lm.y, z: 40 }, fov: 50 };
  };
}

// "Eerder in GTE VI": the narrator sums up the story so far over slow orbits
// of the places it happened, when a new part starts.
function recapPlace(p) {
  if (Array.isArray(p)) return { x: p[0], y: p[1] };
  const lm = (world.map.meta.landmarks || []).find((l) => l.name === p);
  return lm ? { x: lm.x, y: lm.y } : { x: 160, y: 70 };
}

function playRecap(part) {
  const P = PARTS[part];
  if (!P || !P.recap) return false;
  let at = 3.4;
  const lines = P.recap.map(([place, text]) => {
    const v = lineVoiceFor('Verteller', text);
    const dur = Math.max(v ? v.dur + 0.4 : 0, 2.6, Math.min(6, 1 + text.length * 0.055));
    const l = { speaker: 'Verteller', text, at, dur, place: recapPlace(place) };
    at += dur + 0.3;
    return l;
  });
  return playCinematic({
    id: 'story-recap', priority: 2, duration: at + 0.4, pause: true, letterbox: true, skippable: true, hideHud: true,
    kicker: 'Eerder in GTE VI', title: P.title, cardFor: 3.2,
    lines: lines.map(({ speaker, text, at: a, dur }) => ({ speaker, text, at: a, dur })),
    shot: (u, t) => {
      let k = lines.findIndex((l) => t < l.at + l.dur + 0.3);
      if (k < 0) k = lines.length - 1;
      const l = lines[k], c = l.place, lt = Math.max(0, t - (k ? l.at : 0));
      const a = 0.8 + k * 1.9 + lt * 0.06, r = 66 - lt * 1.6;
      return { position: { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r, z: 27 - lt * 0.7 }, lookAt: { x: c.x, y: c.y, z: 10 }, fov: 48 };
    },
  });
}

// The end of the story: the epilogue (the last part's card lines), a big
// "Einde" and the credits; afterwards the world stays open.
function playFinale(part) {
  const P = PARTS[part];
  // the ending plays over the Grote Markt: the world streams around the player
  const p = world.player;
  const spot = world.map.nearestRoadPoint(160, 70, 120, false);
  if (spot && !p.inVehicle) {
    p.x = spot.x; p.y = spot.y;
    world.teleported = world.time;
    const c = world.companion;
    if (c && !c.inVehicle) { c.x = p.x + 1.2; c.y = p.y + 0.6; }
  }
  let at = 3.2;
  const lines = (P.card || []).map(([speaker, text]) => {
    const dur = Math.max(2.2, Math.min(5.2, 1 + text.length * 0.05));
    const l = { speaker, text, at, dur };
    at += dur + 0.25;
    return l;
  });
  const ok = playCinematic({
    id: 'story-card', priority: 2, duration: at + 0.6, pause: true, letterbox: true, skippable: true, hideHud: true,
    kicker: P.end, title: 'Alles voor één eierbal', cardFor: 3, lines, shot: finaleShot(0),
  });
  if (!ok) return false;
  const q = (spec) => playCinematic({ id: 'story-card', priority: 2, pause: true, letterbox: true, skippable: true, hideHud: true, queue: true, ...spec });
  q({ duration: 5, big: 'Wij tweeën vóór Grunn.', kicker: 'Grand Theft Eierbal VI', shot: finaleShot(40) });
  CREDITS.forEach(([name, role], k) => q({ duration: 3.2, kicker: role, title: name, cardFor: 3.2, shot: finaleShot(45 + k * 3.2) }));
  q({ duration: 4, big: 'Einde', kicker: 'Grunn is van jou', shot: finaleShot(62) });
  state.cards.add(part);
  phone('GTE VI', 'Het verhaal is uit. Grunn blijft van jou: alle missies staan in je telefoon en in het pauzemenu, de bijbaantjes draaien door en Jelle daagt je vast nog eens uit.', 9);
  return true;
}

function playEndCard(part) {
  if (PARTS[part] && PARTS[part].finale && currentStep().finale) return playFinale(part);
  const ok = playCinematic({
    id: 'story-card', priority: 2, duration: 6.5, pause: true, letterbox: true, skippable: true, hideHud: true,
    kicker: PARTS[part] ? PARTS[part].end : '', title: 'Alles voor één eierbal', cardFor: 2.4, big: 'Wordt vervolgd…',
    lines: ((PARTS[part] && PARTS[part].card) || []).map(([speaker, text], k) => ({ speaker, text, at: 2.6 + k * 2, dur: 1.9 })),
  });
  if (!ok) return false;
  state.cards.add(part);
  phone('GTE VI', 'Het verhaal gaat verder in een volgende versie. Tot die tijd is Grunn van jou: alle missies staan in je telefoon en in het pauzemenu.', 8);
  return true;
}

// The companion says a story step's line out loud: a speech bubble that
// follows them (scene3d.js world.extraSpeakers; voiced as a bubble line).
function companionSays(w, text) {
  const c = w.companion;
  if (!c || c.state === 'dead') return;
  const list = w.extraSpeakers || (w.extraSpeakers = []);
  const dur = Math.max(3, Math.min(6, 1.2 + text.length * 0.06));
  list.push({ x: c.x, y: c.y, h: 2.1, speechText: text, speechUntil: w.time + dur, follow: c, female: c.character === 'anita' });
}

// --- who plays: Tammo or Anita ----------------------------------------------------------

const charName = (c) => (c === 'anita' ? 'Anita' : 'Tammo');

// Tammo and Anita trade roles where they stand: the body you control becomes
// the other one, and so does the companion (scene3d.js rebuilds the meshes).
function swapCharacter(w, want) {
  const p = w.player, c = w.companion;
  if (p.character === want) return;
  if (c && c.character === want) c.character = p.character;
  p.character = want;
}

// The step's character, once nothing else is going on: the swap happens at
// once (never half-way, whatever pauses the game next), under a short fade
// from black and a line saying who takes over.
// A step's mission waits until its character has taken over.
function swapDone(w, i) {
  const step = currentStep();
  if (!step || step.end || step.kind !== 'mission' || missionIdx(step) !== i || !step.player) return true;
  return w.player.character === step.player;
}

function updateCharacter(w) {
  const step = rt.cur;
  const want = step && !step.end ? step.player : rt.lastPlayer;
  if (step && !step.end && step.player) rt.lastPlayer = step.player;
  if (!want || w.player.character === want) return;
  if (isCinematicActive() || w.pigeonMode || isMissionActive() || w.player.ragdoll || w.pendingRespawn) return;
  swapCharacter(w, want);
  if (!playHandover(w, step)) {
    flash();
    w.addMessage(`${charName(w.player.character)} neemt het over`, 2.5);
  }
}

// The handover: a whip in the new character's colour, a quick cut to them
// with a name card, and their reason for this step (step.why), said to the
// other one (voiced from the lines manifest by cinematics.js).
const CHAR_COLOR = { tammo: '#3f6ea8', anita: '#b8382d' };
let whipEl = null;
function whip(color) {
  if (!whipEl) {
    whipEl = document.createElement('div');
    whipEl.id = 'story-swap-whip';
    whipEl.style.cssText = 'position:fixed;top:-20%;bottom:-20%;left:0;width:70vw;z-index:16;pointer-events:none;transform:translateX(-120vw) skewX(-18deg);opacity:.95';
    document.body.appendChild(whipEl);
  }
  whipEl.style.background = `linear-gradient(90deg, transparent, ${color} 25%, ${color} 75%, transparent)`;
  whipEl.style.transition = 'none';
  whipEl.style.transform = 'translateX(-120vw) skewX(-18deg)';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    whipEl.style.transition = 'transform 0.55s cubic-bezier(.6,.05,.3,1)';
    whipEl.style.transform = 'translateX(160vw) skewX(-18deg)';
  }));
}

function playHandover(w, step) {
  const who = w.player.character, name = charName(who);
  const why = step && !step.end && step.why ? step.why : '';
  const voice = why && lineVoiceFor(name, why);
  const dur = why ? Math.max(3, (voice ? voice.dur : Math.min(4, 1 + why.length * 0.05)) + 1.1) : 2.2;
  const p = w.player, c = w.companion;
  const ok = playCinematic({
    id: 'story-swap', priority: 1, duration: dur, pause: true, letterbox: true, skippable: true, hideHud: true,
    kicker: 'Neemt het over', title: name, cardFor: Math.min(2.2, dur), accent: who,
    lines: why ? [{ speaker: name, text: why, at: 0.7, dur: dur - 0.9 }] : [],
    shot: (u, t) => {
      const v = p.inVehicle;
      const x = v ? v.x : p.x, y = v ? v.y : p.y, a = (v ? v.angle : p.angle) || 0;
      // from the other one, a fast whip over to the one who takes over, then a slow push-in
      const k = Math.min(1, t / 0.4), e = k * k * (3 - 2 * k);
      const ox = c ? c.x : x - Math.cos(a) * 2, oy = c ? c.y : y - Math.sin(a) * 2;
      const lx = ox + (x - ox) * e, ly = oy + (y - oy) * e;
      const r = (v ? 6.5 : 2.8) - u * 0.5, ca = a + 0.55;
      return { position: { x: x + Math.cos(ca) * r, y: y + Math.sin(ca) * r, z: v ? 2.6 : 1.75 }, lookAt: { x: lx, y: ly, z: v ? 1.1 : 1.45 }, fov: 44 - u * 4 };
    },
  });
  if (!ok) return false;
  whip(CHAR_COLOR[who] || '#3fc97a');
  return true;
}

let fadeEl = null;
function flash() {
  if (!fadeEl) {
    fadeEl = document.createElement('div');
    fadeEl.id = 'story-swap-fade';
    fadeEl.style.cssText = 'position:fixed;inset:0;z-index:13;background:#0c140e;opacity:0;pointer-events:none';
    document.body.appendChild(fadeEl);
  }
  fadeEl.style.transition = 'none';
  fadeEl.style.opacity = '1';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    fadeEl.style.transition = `opacity ${SWAP_FADE}s`;
    fadeEl.style.opacity = '0';
  }));
}

// --- skipping --------------------------------------------------------------------------

export function canSkipCurrent() {
  const step = rt.cur;
  if (!step || step.end || isMissionActive()) return false;
  if (step.kind === 'activity') return true;
  return (state.fails[step.id] || 0) >= 1 || (rt.gatedSince >= 0 && world.time - rt.gatedSince > GATED_SKIP_S);
}

export function skipCurrent() {
  const step = rt.cur;
  if (!canSkipCurrent()) return false;
  if (step.kind === 'mission') {
    const i = missionIdx(step);
    const def = getMissionDefs()[i];
    const pay = Math.round(((def && def.reward) || step.reward || 0) * SKIP_SHARE / 5) * 5;
    world.money += pay;
    markMissionCompleted(world, i);
    world.addMessage(`${step.id} overgeslagen. Verder met het verhaal (+€${pay})`, 4);
  } else {
    applyWaive(step);
    world.addMessage(`Overgeslagen: ${step.title}`, 3.5);
  }
  markDone(step, { skipped: true });
  hideSkip();
  return true;
}

function applyWaive(step) {
  if (!step.waive) return;
  if (step.waive === 'night') { setNight(); return; }
  if (!grantStoryItem(world, step.waive) && step.goal && step.goal.req) state.waived.add(step.goal.req);
}

function initSkipUi() {
  if (els) return;
  const root = document.createElement('div');
  root.id = 'story-skip';
  root.hidden = true;
  root.innerHTML = '<button type="button"><span class="hud-key">O</span><span>Sla deze missie over, verder met het verhaal</span></button>';
  const style = document.createElement('style');
  style.textContent = '#story-skip{position:fixed;left:50%;bottom:17%;transform:translateX(-50%);z-index:40;pointer-events:auto}' +
    '#story-skip button{display:flex;gap:10px;align-items:center;font:600 16px/1.2 system-ui,sans-serif;color:#fff;background:rgba(16,18,22,.86);' +
    'border:1px solid rgba(255,210,63,.7);border-radius:10px;padding:10px 16px;cursor:pointer;box-shadow:0 6px 24px rgba(0,0,0,.4)}' +
    '#story-skip button:hover{background:rgba(40,36,20,.92)}' +
    'body.cine-hide-hud #story-skip{display:none}';
  document.head.appendChild(style);
  document.body.appendChild(root);
  root.querySelector('button').addEventListener('click', (e) => { e.stopPropagation(); skipCurrent(); });
  els = { root };
}

function hideSkip() {
  if (els) els.root.hidden = true;
}

function updateSkipUi() {
  if (!els) return;
  const show = rt.skipUntil > world.time && canSkipCurrent() && !world.pigeonMode;
  if (els.root.hidden === show) els.root.hidden = !show;
  if (show && world.input.wasPressed('o')) { world.input.consume('o'); skipCurrent(); }
}

// --- mission hooks ------------------------------------------------------------------------

// A mission started early (its marker shows during the activity before it)
// makes the open activities before it moot: they count as done, keeping
// their unlocks and story beats, without their "done" line.
function onPassed(w, i) {
  const k = STEPS.findIndex((s) => s.kind === 'mission' && missionIdx(s) === i);
  for (let j = 0; j < k; j++) {
    const s = STEPS[j];
    if (s.kind === 'activity' && stepAvailable(s) && !state.done.has(s.id)) markDone(s, { quiet: true });
  }
  for (const s of STEPS) {
    if (s.kind === 'mission' && missionIdx(s) === i && !state.done.has(s.id)) markDone(s);
  }
  rt.cur = undefined;
}

function onFailed(w, i) {
  const step = rt.cur;
  if (!step || step.end || step.kind !== 'mission' || missionIdx(step) !== i) return;
  state.fails[step.id] = (state.fails[step.id] || 0) + 1;
  rt.skipUntil = w.time + SKIP_OFFER_S;
}

function onGated() {
  rt.guideT = 0;
}

// --- init / update ------------------------------------------------------------------------

export function initStory(w) {
  world = w;
  setMissionHooks({ waived: (key) => state.waived.has(key), passed: onPassed, failed: onFailed, gated: onGated, canStart: swapDone });
  initSkipUi();
  ready = true;
  window.__story = storyApi;
}

export function updateStory(dt, w) {
  if (!ready) return;
  world = w;
  if (w.devInvuln) { w.health = 100; if (w.pendingRespawn && !w.pendingRespawn.busted) w.pendingRespawn = null; }
  if (!document.body.classList.contains('game-started')) return;
  const cur = currentStep();
  const same = cur === rt.cur || (cur.end && rt.cur && rt.cur.end === cur.end);
  if (!same) enter(cur);
  const step = rt.cur;
  updateSkipUi();
  updateCharacter(w);
  if (!step) return;
  if (step.end) {
    if (rt.cardPending && !isMissionActive() && !isCinematicActive() && !w.pigeonMode && playEndCard(rt.cardPending)) rt.cardPending = null;
    return;
  }
  if (rt.recapPending && !isMissionActive() && !isCinematicActive() && !w.pigeonMode && !w.pendingRespawn) {
    const part = rt.recapPending;
    rt.recapPending = null;
    if (playRecap(part)) { state.flags.add('recap:' + part); rt.leadAt = w.time + LEAD_DELAY; }
  }
  if (rt.clueToasts.length && !isCinematicActive() && !w.pigeonMode) {
    const title = rt.clueToasts.shift();
    w.addMessage(`Nieuwe aanwijzing: ${title}. Lees terug in het pauzemenu, Missies: "Wat weten we?"`, 4.5);
    playClueSting();
  }
  if (rt.leadAt >= 0 && w.time >= rt.leadAt && !isCinematicActive()) {
    rt.leadAt = -1;
    if (step.lead) phone(who(step.lead[0]), step.lead[1], 7);
    if (step.say) companionSays(w, step.say[1]);
    queueContacts(step, 'lead');
  }
  if ((rt.voorschotT -= dt) <= 0) { rt.voorschotT = 2; checkVoorschot(step); }
  if (step.kind === 'activity') {
    const g = GOALS[step.goal.type];
    if (step.goal.type === 'night') updateNightWait(step);
    if (g && g.met(step, rt.base)) { markDone(step); rt.cur = undefined; return; }
  } else if (rt.gate === 'night' && !isMissionActive()) updateNightWait(step);
  if ((rt.guideT -= dt) <= 0) { rt.guideT = GUIDE_EVERY; refreshGuide(); }
  if (!rt.reminded && w.time - rt.enteredAt > REMIND_AFTER && !isMissionActive()) {
    rt.reminded = true;
    if (step.kind === 'activity') rt.skipUntil = w.time + 60;
    phone(step.lead ? who(step.lead[0]) : 'Anita', `Nog even dit: ${step.title}. Staat op je kaart, als je zin hebt.`, 6);
  }
}

// --- save -----------------------------------------------------------------------------------

export function getStorySave() {
  return {
    v: 1, done: [...state.done], skipped: [...state.skipped], fails: { ...state.fails },
    waived: [...state.waived], voorschot: [...state.voorschot], cards: [...state.cards], flags: [...state.flags],
  };
}

// Without story data (a save from before 0.5.0) the progress follows from
// the missions already passed: see isDone. Money, cars and prestaties live
// elsewhere in the save and stay as they are.
export function applyStorySave(d) {
  const fresh = freshState();
  Object.assign(state, fresh);
  rt = freshRuntime();
  if (!d || typeof d !== 'object' || d.v !== 1) return;
  const ids = (list) => (Array.isArray(list) ? list.filter((id) => STEP_BY_ID.has(id)) : []);
  state.done = new Set(ids(d.done));
  state.skipped = new Set(ids(d.skipped));
  state.voorschot = new Set(ids(d.voorschot));
  state.waived = new Set((Array.isArray(d.waived) ? d.waived : []).filter((k) => typeof k === 'string'));
  state.cards = new Set((Array.isArray(d.cards) ? d.cards : []).filter((k) => PARTS[k]));
  state.flags = new Set((Array.isArray(d.flags) ? d.flags : []).filter((k) => typeof k === 'string'));
  for (const [id, n] of Object.entries(d.fails || {})) if (STEP_BY_ID.has(id) && Number.isFinite(n)) state.fails[id] = n;
}

export function storyFlag(name) {
  return state.flags.has(name);
}

// --- views for the pause menu, phone and dev tools ------------------------------------------

// "Wat weten we?": the clues and turning points of the steps done so far
// (newest first) and what Tammo and Anita are after in this part.
export function getStoryJournal() {
  const step = rt.cur || currentStep();
  const part = step && (step.part || step.end) || 'kop';
  const done = new Set(STEPS.filter((s, k) => isDone(s, k)).map((s) => s.id));
  const found = CLUES.filter((c) => done.has(c.step)).map((c) => ({ ...c, isNew: rt.newClues.has(c.title) })).reverse();
  return { why: step && step.finale ? 'Grunn is van jou. En de Fjord Frituur ook.' : WHY[part] || '', found, total: CLUES.length };
}

export function markCluesSeen() {
  rt.newClues.clear();
}

export function getStoryView() {
  const step = rt.cur || currentStep();
  const avail = STEPS.filter(stepAvailable);
  const done = avail.filter((s) => isDone(s, STEPS.indexOf(s))).length;
  if (!step || step.end) return { end: true, part: step ? step.end : 'kop', title: step && step.finale ? 'Einde. Grunn is van jou.' : 'Wordt vervolgd…', done, total: avail.length };
  return {
    end: false, id: step.id, part: step.part, partTitle: PARTS[step.part].title, kind: step.kind, title: step.title,
    lead: step.lead ? `${who(step.lead[0])}: ${step.lead[1]}` : '', canSkip: canSkipCurrent(), fails: state.fails[step.id] || 0,
    skipLabel: step.kind === 'mission' ? 'Sla deze missie over, verder met het verhaal' : 'Sla deze stap over, verder met het verhaal',
    done, total: avail.length,
  };
}

// Dev chapter select: rebuilds the progress, money and belongings a player
// would have right before step `id` (worst case money from the timeline).
export function devJumpTo(id) {
  const k = STEPS.findIndex((s) => s.id === id);
  if (k < 0 || !stepAvailable(STEPS[k]) || isMissionActive()) return false;
  const prior = STEPS.slice(0, k);
  Object.assign(state, freshState());
  rt = freshRuntime();
  for (const s of prior) {
    state.done.add(s.id);
    if (s.unlocks) state.flags.add(s.unlocks);
  }
  const completed = prior.filter((s) => s.kind === 'mission' && missionIdx(s) >= 0).map(missionIdx);
  const prog = getMissionProgress();
  setMissionProgress(world, { index: prog.index, completed, seen: completed });
  world.money = computeMoneyTimeline().rows[k].before;
  world.wanted = 0;
  for (const s of prior) if (s.waive && s.waive !== 'night') grantStoryItem(world, s.waive);
  const target = STEPS[k];
  const needsNight = target.id === 'H6';
  world.clock = needsNight ? NIGHT_HOUR : target.id === 'k-nacht' ? 14 : 12;
  refreshDayNight(world);
  enter(target);
  if (target.player) swapCharacter(world, target.player);
  const g = world.storyGuide;
  if (g) {
    const p = world.player;
    const a = Math.random() * Math.PI * 2;
    const x = g.x + Math.cos(a) * 20, y = g.y + Math.sin(a) * 20;
    const [ex, ey] = world.map.escapeBuilding ? world.map.escapeBuilding(x, y, 0.5) : [x, y];
    if (p.inVehicle) { p.inVehicle.x = ex; p.inVehicle.y = ey; p.inVehicle.speed = 0; }
    p.x = ex; p.y = ey;
  }
  return true;
}

// Completes whatever the current step asks, the way a player would (a
// purchase is paid for). Used by the dev panel and the story test.
export function devCompleteStep() {
  const step = rt.cur || currentStep();
  if (!step || step.end) return false;
  if (step.kind === 'mission') {
    if (isMissionActive()) return missionDebug.complete(world);
    return missionDebug.start(world, missionIdx(step));
  }
  if (step.cost) {
    checkVoorschot(step);
    world.money -= step.cost;
  }
  if (step.goal.type === 'require' || step.waive) applyWaive(step);
  markDone(step);
  rt.cur = undefined;
  return true;
}

export const storyApi = {
  steps: STEPS,
  parts: PARTS,
  current: () => { const s = rt.cur || currentStep(); return s && s.end ? { end: s.end } : s ? { id: s.id, kind: s.kind, title: s.title } : null; },
  view: getStoryView,
  save: getStorySave,
  timeline: () => computeMoneyTimeline(),
  jump: devJumpTo,
  complete: devCompleteStep,
  skip: skipCurrent,
  canSkip: canSkipCurrent,
  win: () => missionDebug.win(world),
  lose: () => missionDebug.lose(world),
  objective: () => missionDebug.complete(world),
  teleport: () => {
    if (isMissionActive()) return missionDebug.teleport(world);
    const g = world.storyGuide;
    if (!g) return false;
    const p = world.player;
    if (p.inVehicle) { p.inVehicle.x = g.x; p.inVehicle.y = g.y; p.inVehicle.speed = 0; }
    p.x = g.x; p.y = g.y;
    return true;
  },
  mission: () => missionDebug.state(),
  cardShown: (part = 'kop') => state.cards.has(part),
  character: () => world.player.character,
  swapInfo: () => ({ want: rt.cur && rt.cur.player, me: world.player.character, comp: world.companion && world.companion.character, paused: !!world.paused, cine: isCinematicActive(), pigeon: !!world.pigeonMode, mission: isMissionActive(), ragdoll: !!world.player.ragdoll, respawn: !!world.pendingRespawn }),
};
