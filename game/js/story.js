// Story director: walks the arc in storyarc.js. It keeps the guided route
// (world.storyGuide, used by routing.js when the player has no waypoint of
// their own) on the next step, sends a short phone message about why, pays a
// voorschot when a purchase is out of reach, offers "Sla deze missie over"
// after a failure and shows the "Wordt vervolgd" card where the built part
// of the story ends.

import { STEPS, STEP_BY_ID, PARTS, stepAvailable, missionIndexOf, computeMoneyTimeline } from './storyarc.js';
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

const LEAD_DELAY = 3;
const GUIDE_EVERY = 2.5;
const REMIND_AFTER = 300;
const SKIP_OFFER_S = 30;
const SKIP_SHARE = 0.5;
const NIGHT_GARAGE_M = 16;
const NIGHT_HOUR = 21.4;

let world = null;
let ready = false;
let els = null;
const state = freshState();
let rt = freshRuntime();

function freshState() {
  return { done: new Set(), skipped: new Set(), fails: {}, waived: new Set(), voorschot: new Set(), cards: new Set(), flags: new Set() };
}

function freshRuntime() {
  return { cur: undefined, enteredAt: 0, leadAt: -1, reminded: false, base: {}, guideT: 0, skipUntil: -1, cardPending: null, nightWait: false, voorschotT: 0 };
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

const jobRounds = (id) => { const j = getSideJobList().find((x) => x.id === id); return j ? j.rounds : 0; };

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
    begin: (st, b) => { b.rounds = jobRounds(st.goal.job); },
    met: (st, b) => jobRounds(st.goal.job) > (b.rounds ?? Infinity),
    place: (st) => { const j = getSideJobList().find((x) => x.id === st.goal.job); return j ? { x: j.x, y: j.y, name: j.name } : null; },
  },
  night: {
    met: () => isNight(world),
    place: () => nearest(getGaragesForRender(), world.player),
  },
  train: { met: () => false, place: () => null },
  egg: { met: () => false, place: () => null },
};

// --- flow ------------------------------------------------------------------------------

function enter(step) {
  rt.cur = step;
  rt.enteredAt = world.time;
  rt.reminded = false;
  rt.base = {};
  rt.guideT = 0;
  rt.nightWait = false;
  if (!step || step.end) {
    world.storyGuide = null;
    if (step && step.end && !state.cards.has(step.end)) rt.cardPending = step.end;
    return;
  }
  rt.leadAt = world.time + LEAD_DELAY;
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

function playEndCard(part) {
  const ok = playCinematic({
    id: 'story-card', priority: 2, duration: 6.5, pause: true, letterbox: true, skippable: true, hideHud: true,
    kicker: PARTS[part] ? PARTS[part].end : '', title: 'Alles voor één eierbal', cardFor: 2.4, big: 'Wordt vervolgd…',
    lines: [
      { speaker: 'Anita', text: 'Iemand heeft onze Eierbal gejat.', at: 2.6, dur: 1.9 },
      { speaker: 'Tammo', text: 'Die was nog niet eens van ons.', at: 4.5, dur: 1.8 },
    ],
  });
  if (!ok) return false;
  state.cards.add(part);
  phone('GTE VI', 'Het verhaal gaat verder in een volgende versie. Tot die tijd is Grunn van jou: alle missies staan in je telefoon en in het pauzemenu.', 8);
  return true;
}

// --- skipping --------------------------------------------------------------------------

export function canSkipCurrent() {
  const step = rt.cur;
  if (!step || step.end || isMissionActive()) return false;
  if (step.kind === 'activity') return true;
  return (state.fails[step.id] || 0) >= 1;
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

function onPassed(w, i) {
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
  setMissionHooks({ waived: (key) => state.waived.has(key), passed: onPassed, failed: onFailed, gated: onGated });
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
  if (!step) return;
  if (step.end) {
    if (rt.cardPending && !isMissionActive() && !isCinematicActive() && !w.pigeonMode && playEndCard(rt.cardPending)) rt.cardPending = null;
    return;
  }
  if (rt.leadAt >= 0 && w.time >= rt.leadAt && !isCinematicActive()) {
    rt.leadAt = -1;
    if (step.lead) phone(who(step.lead[0]), step.lead[1], 7);
  }
  if ((rt.voorschotT -= dt) <= 0) { rt.voorschotT = 2; checkVoorschot(step); }
  if (step.kind === 'activity') {
    const g = GOALS[step.goal.type];
    if (step.goal.type === 'night') updateNightWait(step);
    if (g && g.met(step, rt.base)) { markDone(step); rt.cur = undefined; return; }
  }
  if ((rt.guideT -= dt) <= 0) { rt.guideT = GUIDE_EVERY; refreshGuide(); }
  if (!rt.reminded && w.time - rt.enteredAt > REMIND_AFTER && !isMissionActive()) {
    rt.reminded = true;
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

export function getStoryView() {
  const step = rt.cur || currentStep();
  const avail = STEPS.filter(stepAvailable);
  const done = avail.filter((s) => isDone(s, STEPS.indexOf(s))).length;
  if (!step || step.end) return { end: true, part: step ? step.end : 'kop', title: 'Wordt vervolgd…', done, total: avail.length };
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
};
