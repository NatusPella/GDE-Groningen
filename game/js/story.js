// Story director: walks the arc in storyarc.js. It keeps the guided route
// (world.storyGuide, used by routing.js when the player has no waypoint of
// their own) on the next step, sends a short phone message about why, pays a
// voorschot when a purchase is out of reach, offers "Sla deze missie over"
// after a failure and shows the "Wordt vervolgd" card where the built part
// of the story ends. Each step says who the player controls (step.player):
// Tammo and Tessa trade places at its start, behind a short fade. After the
// built story the last step's character stays.

import { STEPS, STEP_BY_ID, PARTS, CLUES, WHY, CHARACTERS, SPEAKERS, stepAvailable, missionIndexOf, computeMoneyTimeline, partNumber, stepDone, nextStoryStep, FINALE_PART } from './storyarc.js';
import { tickStoryTravel, rideWith } from './storytravel.js';
import { askTravel, travelPromptOpen } from './reispanel.js';
import { gateOn } from './coopgate.js';
import { startMeerijden } from './reisrit.js';
import { FLAGS } from './devflags.js';
import { setMeetHook } from './namecard.js';
import { displayName } from './speakers.js';
import { queueStoryContact } from './storycontact.js';
import { withValidity, setValidityContext } from './validity.js';
import { isCallActive } from './phonefeed.js';
import { SMS_SAY } from './smsvoice.js';
import { playClueSting } from './audio.js';
import { lineVoiceFor, NARRATOR } from './linevoice.js';
import {
  setMissionHooks, setNextMission, isMissionActive, isMissionCompleted, markMissionCompleted, getMissionDefs,
  unmetRequirement, requirementMet, requirementPlace, isNight, setMissionProgress, getMissionProgress, missionDebug,
  activeMissionIndex, failActiveMission, rideFirst,
} from './missions.js';
import { getShopVisits, getShopsForRender, grantStoryItem } from './shops.js';
import { getPigeonFlight, stopPigeonMode } from './pigeonmode.js';
import { isHeliRunActive, abortHeliRun } from './helirun.js';
import { jumpPrep, jumpSpot, openRond } from './storyjump.js';
import { JUMP_M } from './loadlogic.js';
import { buildingAt, withTiles } from './tileplace.js';
import { waterAt } from './waterlevels.js';
import { purchaseCount, storyBuyLabel } from './storyshop.js';
import { getPigeonSpotsForRender } from './pigeonspots.js';
import { getSideJobList } from './sidejobs.js';
import { getGaragesForRender } from './garages.js';
import { inHomeFlat, getHomeForRender, flatStage } from './home.js';
import { isShopOpen } from './shopui.js';
import { maybeOfferHelp, noteStepCleared } from './assistlive.js';
import { playCinematic, isCinematicActive, skipCinematic, sinceCinematic, isBannerUp } from './cinematics.js';
import { playScript } from './cutscenehost.js';
import { roofAt } from './camerapath.js';
import { isInWater } from './util.js';
import { openingActs, END_CARD, flatScene } from './cutscenes.js';
import { refreshDayNight } from './daynight.js';
import { getTrainTripCount, getStationsForRender } from './stationtravel.js';
import { getEierballen } from './achievementtracker.js';
import { queueFjordReveal, getChallengeProgress, isChallengeActive } from './postgame.js';
import { isUnlocked } from './achievements.js';
import { endingProgress, creditsDue, endingLeftText } from './ending.js';
import { getPadelMatchCount, getPadelSpotsForRender } from './padel.js';
import { FUN_GOALS, initStoryFun, updateStoryFun, storyFunDone, storyFunBusy, hideoutStep, hideoutChoices } from './storyfun.js';
import { EIKEA_GOALS, updateStoryEikea, waiveEikea, initStoryEikea } from './storyeikea.js';
import { THIRD_PARTY_CARDS } from './credits.js';
import { SERIES, GAME_TITLE } from './logo.js';
import { registerNarrative, mayStart, narrativeBusy, narrativeState } from './narrative.js';
import { storyLines, talkLines, radioContacts, appsAt, storyDataReady, readingTime, scene as storyScene } from './storytext.js';
import { updateStoryTalk, stopTalk, playTalk } from './storytalk.js';
import { makeReisGoals } from './storyreis.js';
import { plakjesState } from './plakjes.js';
import { registerStoryQueries } from './storyquery.js';

// Rikus' Radio Nachtstreek studio (radiostudio.js, three.js from the CDN) for the
// recaps and the epilogue; loaded lazily so Node checks can import this file.
let studioMod = null, sceneMod = null;
import('./radiostudio.js').then((m) => { studioMod = m; }).catch(() => {});
import('./scene3d.js').then((m) => { sceneMod = m; }).catch(() => {});

function openStudio() {
  const scene = sceneMod && sceneMod.getScene && sceneMod.getScene();
  if (!studioMod || !scene || !world) return null;
  const s = studioMod.buildRadioStudio(world.player.x, world.player.y);
  scene.add(s.group);
  return s;
}

const LEAD_DELAY = 3;
const LEAD_AFTER_SCENE = 2.5;
const SAY_AFTER_LEAD = 7;
const GUIDE_EVERY = 2.5;
const REMIND_AFTER = 300;
const SKIP_OFFER_S = 30;
const SKIP_SHARE = 0.5;
const GATED_SKIP_S = 90;
const STUCK_SKIP_S = 360;
const HOME_SCENE_AFTER = 2.5;
const NIGHT_HOUR = 23.9;
const SWAP_FADE = 0.45;
const SWAP_CALM = 1.2;
const SWAP_CARD_WAIT = 8;
const SWAP_MAX_WAIT = 8;

let world = null;
let ready = false;
let els = null;
const state = freshState();
let rt = freshRuntime();

function freshState() {
  return { done: new Set(), skipped: new Set(), fails: {}, waived: new Set(), voorschot: new Set(), cards: new Set(), flags: new Set() };
}

function freshRuntime() {
  return { gifts: {}, cur: undefined, enteredAt: 0, leadAt: -1, sayAt: -1, reminded: false, base: {}, guideT: 0, skipUntil: -1, cardPending: null, nightWait: false, flatSince: -1, voorschotT: 0, lastPlayer: null, recapPending: null, newClues: new Set(), clueToasts: [] };
}

const STORY_VALID = { ttl: 300, step: true };
const who = (k) => (k === 'T' ? 'Tammo' : k === 'A' ? 'Anita' : k);

function phone(from, text, duration = 6, say = undefined, silent = false) {
  // refs #171: a story text that waits for the player is dropped once its step is over or it is five minutes late
  if (world && world.phoneNotifications) world.phoneNotifications.push(withValidity({ from, text, duration, say, story: true, ...(silent ? { silent: true } : {}) }, STORY_VALID));
}

// The new arc (storyarc_nieuw.js, storytext.js): the Nachtstreek fragments and the silent app texts of the
// script that hang on a step, at its start or after it. App texts show as a phone card and are never read
// aloud. Sent once per save (a flag), so loading mid-step does not repeat them.
function sendScript(step, at) {
  if (!storyDataReady()) return;
  const key = `script:${step.id}:${at}`;
  if (state.flags.has(key)) return;
  state.flags.add(key);
  for (const c of radioContacts(step.id, at)) {
    if (c.lines.length) queueStoryContact(withValidity({ via: 'radio', from: 'rikus', on: 'after', mood: 'night', caller: '', lines: c.lines }, { ttl: 600, step: true }));
  }
  for (const a of appsAt(step.id, at)) phone(a.from, a.text, 7, undefined, true);
}

// A homeScene that names a script scene (storyarc_nieuw.js): its lines from the script, [who, text, { tag }]
function homeSceneOf(step) {
  const h = step.homeScene;
  if (!h || !h.id) return h || null;
  if (!storyDataReady()) return { ...h, lines: [] };
  return { ...h, lines: storyLines(h.id).map(([k, text, o]) => [k === 'V' ? 'rikus' : k, text, { tag: o.tag }]) };
}

function missionIdx(step) {
  return step && step.kind === 'mission' ? missionIndexOf(step.mission) : -1;
}

// --- which step is next ----------------------------------------------------------

const doneId = (id) => state.done.has(id);

function isDone(step, k) {
  return stepDone(k, doneId, isMissionCompleted);
}

// The next step to play, or { end: part } where the built story stops. Deel 4 (PARTS.*.after) starts once the finale card has played.
export function currentStep() {
  return nextStoryStep(doneId, isMissionCompleted, (part) => state.cards.has(part));
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
  // goal.buy: only buying one of those items counts (goal.have: or walking in
  // while already owning that weapon); without it, walking in is enough
  shop: {
    begin: (st, b) => { b.visits = getShopVisits(st.goal.shop); b.bought = purchaseCount(st.goal.buy); },
    met: (st, b) => {
      const visited = getShopVisits(st.goal.shop) > (b.visits ?? Infinity);
      if (!st.goal.buy) return visited;
      return purchaseCount(st.goal.buy) > (b.bought ?? Infinity) || (visited && !!st.goal.have && (world.ammo[st.goal.have] || 0) > 0);
    },
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
  // waiting for the dark happens at home; a step with a homeScene (k-nacht) plays it first
  night: {
    met: (st, b) => isNight(world) && (!st.homeScene || !!b.homeScene),
    place: () => homePlace() || nearest(getGaragesForRender(), world.player),
  },
  // a quiet evening in the flat: go home, go up, the step's homeScene plays
  home: {
    met: (st, b) => !!b.homeScene,
    place: () => homePlace(),
  },
  train: {
    begin: (st, b) => { b.trips = getTrainTripCount(); },
    met: (st, b) => getTrainTripCount() > (b.trips ?? Infinity),
    place: () => nearest(getStationsForRender(), world.player),
  },
  padel: {
    begin: (st, b) => { b.matches = getPadelMatchCount(); },
    met: (st, b) => getPadelMatchCount() > (b.matches ?? Infinity),
    place: () => nearest(getPadelSpotsForRender(), world.player),
  },
  // M00 (new arc): the opening scenes of the script (C00.1-C00.3) play once, as a cutscene over the new home
  opening: {
    begin: (st, b) => { b.phase = 'wait'; },
    met: (st, b) => {
      if (b.phase === 'wait') {
        const ready = !isMissionActive() && !isCinematicActive() && sinceCinematic() > 1 && !narrativeBusy() && !world.pigeonMode && !world.pendingRespawn && document.body.classList.contains('game-started') && !gateOn() && world.coopRole !== 'client';
        if (ready && storyDataReady()) { b.phase = 'play'; if (!playOpening(b)) b.phase = 'done'; }
        else if (ready && world.time - rt.enteredAt > 40) b.phase = 'done';
      }
      return b.phase === 'done';
    },
    place: () => null,
  },
  // E (new arc): nothing to do, the epilogue and the studio are the finale card of the last part (PARTS.ontzet.card):
  // the step is done as soon as the finale's mission has been told
  epilogue: {
    met: () => !isMissionActive() && !isCinematicActive() && sinceCinematic() > 1 && !narrativeBusy() && !world.pigeonMode && !world.pendingRespawn,
    place: () => null,
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
  rt.flatSince = -1;
  rt.gate = null;
  rt.gateCard = false;
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
  rt.sayAt = -1;
  // the first step of a later part opens with an "Eerder in GDE" recap
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
  if (isMissionActive() || goalIsMission()) return;
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
  if (!skipped) noteStepCleared(step.id);
  rt.skipUntil = -1;
  if (step.unlocks) state.flags.add(step.unlocks);
  if (!quiet && step.kind === 'activity' && step.done) {
    // "Even onderduiken": the scene and text of the option the player picked
    const shown = step.goal && step.goal.type === 'hideout' ? hideoutStep(step, rt.base) : step;
    if (shown.choice) state.flags.add('onderduik:' + shown.choice);
    // a step with a closing scene (storyfun.js) sends its done text after it
    const send = () => phone(who(shown.done[0]), shown.done[1], 5, undefined, !!step.silent);
    if (skipped || !storyFunDone(world, shown, send)) send();
  }
  if (!quiet && !skipped && step.kind === 'activity' && isPurchase(step)) {
    const next = currentStep();
    world.addMessage(next && !next.end ? `Gelukt! Terug naar het verhaal: ${next.title}` : 'Gelukt! Terug naar het verhaal', 5, { kind: 'missie', key: 'story-buy' });
  }
  if (!quiet && step.after) for (const [from, text] of step.after) phone(who(from), text, 6, undefined, !!step.silent);
  if (step.beat) for (const [from, text] of step.beat) phone(who(from), text, 6, undefined, !!step.silent);
  if (!quiet) queueContacts(step, 'after');
  if (!quiet && !skipped) sendScript(step, 'after');
  for (const c of CLUES) {
    if (c.step !== step.id) continue;
    rt.newClues.add(c.title);
    if (!quiet) rt.clueToasts.push(c);
  }
}

// Jelle's (or the twins') calls, livestreams, posts and cards (storycontact.js);
// their `after` texts arrive once the contact is over.
function queueContacts(step, on) {
  for (const c of step.contact || []) {
    if ((c.on || 'after') !== on) continue;
    queueStoryContact(withValidity({ ...c, onDone: () => { for (const [from, text] of c.after || []) phone(who(from), text, 6); } }, { ttl: 600, step: true }));
  }
}

// a mission the player chose as their goal (goal.js) keeps the marker
const goalIsMission = () => !!(world.goal && world.goal.kind === 'mission');

// on foot further than this from the next place: the route goes past your own ride
const RIDE_FIRST_M = 300;

function refreshGuide() {
  const step = rt.cur;
  if (!step || step.end || isMissionActive()) { world.storyGuide = null; return; }
  let place = null;
  let why = step.title;
  if (step.kind === 'mission') {
    const defs = getMissionDefs();
    const def = defs[missionIdx(step)];
    const gate = def ? unmetRequirement(world, def) : null;
    if (gate) { place = requirementPlace(world, gate); why = `Eerst: ${storyBuyLabel(world, place) || gateLabel(gate)}`; }
    if (rt.gate && rt.gate !== 'night' && !gate && !rt.gateCard) {
      rt.gateCard = true;
      world.addMessage(`Gelukt! Terug naar het verhaal: ${step.title}`, 5, { kind: 'missie', key: 'story-buy' });
    }
    else if (def && !gate) place = def.start;   // an unmet requirement keeps the guide at the shop: the start only once it is met
    // a requirement that stays unmet (no money, the rental boat sank) also makes the step skippable
    rt.gate = gate;
    rt.gatedSince = gate ? (rt.gatedSince >= 0 ? rt.gatedSince : world.time) : -1;
    if (gate && world.time - rt.gatedSince > GATED_SKIP_S && !rt.gateOffered) { rt.gateOffered = true; rt.skipUntil = world.time + SKIP_OFFER_S; }
    // the player picked another mission meanwhile: arm this one again once they are at its start
    if (!gate && def && !goalIsMission() && Math.hypot(def.start.x - world.player.x, def.start.y - world.player.y) < 40) setNextMission(world, missionIdx(step));
  } else {
    const g = GOALS[step.goal.type];
    place = g && g.place(step, rt.base);
    why = storyBuyLabel(world, place) || (step.goal.type === 'eikea' && place ? place.name : why);
  }
  // on foot after a hand-back, or the step needs your car: fetch it first
  let need = null;
  if (step.kind === 'mission') {
    const def = getMissionDefs()[missionIdx(step)];
    if (def && def.ride === 'racecar') need = rt.gate ? 'car' : 'racecar';
  } else if (step.goal && step.goal.req === 'racecar') need = 'car';
  const ride = place ? rideFirst(world, need) : null;
  if (ride) {
    const p = world.player, far = Math.hypot(place.x - p.x, place.y - p.y);
    if ((need || far > RIDE_FIRST_M) && Math.hypot(ride.x - p.x, ride.y - p.y) < far + 40) { why = `Eerst naar ${ride.name}, dan: ${why}`; place = ride; }
  }
  const shopId = place && place.type && place.id ? place.id : null;
  // a choice (r-trein): the route goes to the nearest option, the others are named
  let alt = '';
  if (step.kind === 'activity' && step.goal.type === 'hideout' && place) {
    why = `Onderduiken: ${place.name.charAt(0).toLowerCase()}${place.name.slice(1)}`;
    alt = hideoutChoices(step).filter((c) => c.id !== place.id).map((c) => c.short).join(' of ');
  }
  world.storyGuide = place ? { x: place.x, y: place.y, name: why, step: step.id, shopId, buy: !!shopId && isPurchase(step, rt.gate), alt } : null;
}

function isPurchase(step, gate) {
  if (step.kind === 'mission') return !!gate && gate !== 'night';
  return !!step.goal && ((step.goal.type === 'require' && step.goal.req !== 'night') || !!step.goal.buy);
}

function gateLabel(key) {
  return { weapon: 'koop een wapen', bike: 'koop een fiets', car: 'koop een auto', racecar: 'voer de Escapade op of koop een sportwagen', heist: 'koop zwart incognito of huur een boot', night: 'wachten tot het donker is', boat: 'huur een boot' }[key] || key;
}

// Tops up the money for a purchase the step needs, once per step.
function checkVoorschot(step) {
  if (!step || step.end || !step.cost || !step.voorschot || state.voorschot.has(step.id)) return;
  if (step.goal && step.goal.type === 'require' && requirementMet(world, step.goal.req)) return;
  if (world.money >= step.cost) return;
  const gift = Math.ceil((step.cost - world.money + 25) / 5) * 5;
  world.money += gift;
  state.voorschot.add(step.id);
  rt.gifts[step.id] = gift;
  phone(step.voorschot.from, `${step.voorschot.text} (+€${gift})`, 7);
  world.addMessage(`${step.voorschot.from} schiet €${gift} voor`, 3.5);
}

// Set when step `id` got a voorschot: { from, gift } (gift is null after a reload).
export function storyVoorschotInfo(id) {
  const step = STEP_BY_ID.get(id);
  if (!step || !step.voorschot || !state.voorschot.has(id)) return null;
  return { from: step.voorschot.from, gift: rt.gifts[id] ?? null };
}

// A shop opens: a voorschot that is due is paid before the menu shows prices.
export function prepareStoryShop() {
  if (!ready || !world) return;
  const step = rt.cur || currentStep();
  if (step && !step.end) checkVoorschot(step);
}

function homePlace() {
  const h = getHomeForRender()[0];
  return h ? { x: h.x, y: h.y, name: 'Thuis' } : null;
}

// Waiting for the dark (k-nacht, or a mission that needs it) and the quiet
// evenings (a step's homeScene) happen at home: a moment upstairs in the
// flat, then the scene (lines [who, text, { tag }]), then the clock moves on.
// Sleeping first works too: the scene follows when you wake up.
function updateHomeWait(step) {
  const scene = homeSceneOf(step);
  if (scene && scene.id && !scene.lines.length) return;
  const night = step.kind === 'mission' || step.goal.type === 'night';
  if (rt.nightWait || world.pigeonMode || isCinematicActive() || isShopOpen()) return;
  if (night && !scene && isNight(world)) return;
  if (!inHomeFlat()) { rt.flatSince = -1; return; }
  if (rt.flatSince < 0) rt.flatSince = world.time;
  if (world.time - rt.flatSince < HOME_SCENE_AFTER) return;
  rt.nightWait = true;
  const base = rt.base;
  const done = () => { if (night) setNight(); base.homeScene = true; };
  let at = 2.2;
  const lines = ((scene && scene.lines) || []).map(([k, text]) => {
    const speaker = SPEAKERS[k] || who(k);
    const v = lineVoiceFor(speaker, text);
    const dur = !v ? readingTime(text) : Math.max(v ? v.dur + 0.3 : 0, 1.6, Math.min(5, 0.8 + text.length * 0.055));
    const l = { speaker, text, at, dur };
    at += dur + 0.25;
    return l;
  });
  const cine = {
    id: 'story-wait', priority: 2, duration: lines.length ? at + 0.4 : 3.6, pause: true, letterbox: true, skippable: true, hideHud: true,
    big: (scene && scene.big) || (night ? 'Wachten tot het donker is…' : ''),
    lines,
    onStart: () => { if (scene && scene.clock != null) setClock(scene.clock); },
    onEnd: done,
  };
  // staged in the flat (cutscenes.js flatScene), the plain scene as the fallback
  const pl = world.player;
  const stage = flatStage();
  const ok = (lines.length > 2 && playScript(world, flatScene(scene && scene.clock != null ? 'avond' : 'wachten', lines), {
    lines, duration: cine.duration, anchor: stage ? stage.anchor : { x: pl.x, y: pl.y, facing: pl.angle || 0, z: pl.gz || 0 }, env: stage ? stage.env : null, cine,
  })) || playCinematic(cine);
  if (!ok) done();
}

function setNight() {
  if (!isNight(world)) setClock(NIGHT_HOUR);
}

function setClock(h) {
  world.clock = h;
  refreshDayNight(world);
}

// the kitchen of the opening hangs this high above the street (the set is a closed room)
const KITCHEN_Z = 345;

// The opening of the new story (M00): the trailer parody, the kitchen and moving day of the script,
// as a letterboxed cutscene over the player's new home. Recorded lines play, the others are text.
function playOpening(b) {
  const lines = [];
  let at = 1.2;
  for (const id of ['C00.1', 'C00.2', 'C00.3']) {
    for (const l of talkLines(id)) {
      const dur = l.voice ? Math.max(readingTime(l.text) * 0.6, l.voice.dur + 0.35) : readingTime(l.text);
      lines.push({ speaker: l.speaker, text: l.text, at, dur, ...(l.voice ? { voice: l.voice.src } : {}), ...(l.channel === 'radio' ? { radio: true } : {}) });
      at += dur + 0.12;
    }
    at += 0.9;
  }
  const p = world.player;
  const kop = PARTS.kop;
  // the staged version (cutscenes.js openingActs): people and props move, the camera cuts; the orbit below stays as the fallback
  const v0 = p.inVehicle;
  const spot = { x: v0 ? v0.x : p.x, y: v0 ? v0.y : p.y, facing: v0 ? v0.angle : p.angle || 0, z: 0 };
  // three acts after each other: the trailer in the street, Tessa's kitchen (high above it), moving day.
  // Skipping (hold Space) ends the whole opening.
  const acts = openingActs(lines);
  const playAct = (i) => {
    const act = acts[i];
    const last = i === acts.length - 1;
    return playScript(world, act.def, {
      lines: act.lines, duration: act.duration,
      anchor: act.def.set === 'keuken' ? { x: spot.x, y: spot.y, facing: 0, z: KITCHEN_Z } : { ...spot },
      // nobody stands in the street scenes: when the new home's tower leaves no clean turn, they play on the closest open ground (#321)
      fit: { radii: [10, 16, 24, 34, 46, 60], ground: (x, y) => roofAt(world.map, x, y) === 0 && !isInWater(world.map, x, y) },
      cine: {
        id: 'story-opening',
        ...(i === 0 ? { kicker: `${partNumber('kop')} · ${kop.date}`, title: kop.name, cardFor: 3.2 } : {}),
        onEnd: (skipped, replaced) => {
          if (last || skipped || replaced || !playAct(i + 1)) b.phase = 'done';
        },
      },
    });
  };
  const staged = acts.length === 3 && playAct(0);
  if (staged) return true;
  const ok = playCinematic({
    id: 'story-opening', priority: 4, duration: at + 1, pause: true, letterbox: true, skippable: true, hideHud: true,
    kicker: `${partNumber('kop')} · ${kop.date}`, title: kop.name, cardFor: 3.2, lines,
    shot: (u, t) => {
      const v = p.inVehicle, x = v ? v.x : p.x, y = v ? v.y : p.y;
      const a = 0.6 + t * 0.045;
      return { position: { x: x + Math.cos(a) * 15, y: y + Math.sin(a) * 15, z: 7 - u * 2.5 }, lookAt: { x, y, z: 3.5 }, fov: 46 };
    },
    onEnd: () => { b.phase = 'done'; },
  });
  return ok;
}

// Credits after the epilogue: name cards over the city, no voices.
const CREDITS = [
  ['Tammo & Tessa', 'twee Stadjers met een droom. Vijf woorden'],
  ['Rikus', 'vertelde het, op Nachtstreek'],
  ['Jelle Terpstra', 'de Fryske Snackkening, foar mem'],
  ['Gerda Terpstra', 'tweede in 1953. Nu op het bordje'],
  ['Oma Trijntje', 'zei het één keer. Dan is het waar'],
  ['Berend Bos', 'verloor weer. Net als in 1672'],
  ['Durk & Douwe', 'twee reuzen, één brein'],
  ['De torenwachter', 'meldde alleen'],
  ['Bert, Sjabbe, Jelmer, Sjoerd, Femke, Harm, Geert, Klaas, Henk en Dokter Dijkstra', 'en de rest van Grunn'],
  ...THIRD_PARTY_CARDS,
];

const FINALE_SPOT = [160.64, 68.15];

// A slow climb around d'Olle Grieze for the ending.
function finaleShot(t0 = 0) {
  const lm = (world.map.meta.landmarks || []).find((l) => l.name === 'Martinitoren') || { x: 213.81, y: 9.9 };
  return (u, t) => {
    const a = 0.6 + (t0 + t) * 0.035;
    const r = 150 - (t0 + t) * 0.6;
    return { position: { x: lm.x + Math.cos(a) * r, y: lm.y + Math.sin(a) * r, z: 55 + (t0 + t) * 0.5 }, lookAt: { x: lm.x, y: lm.y, z: 40 }, fov: 50 };
  };
}

// "Eerder in GDE": the narrator sums up the story so far over slow orbits
// of the places it happened, when a new part starts.
function recapPlace(p) {
  if (p === 'studio') return { studio: true, x: 0, y: 0 };
  if (Array.isArray(p)) return { x: p[0], y: p[1] };
  const lm = (world.map.meta.landmarks || []).find((l) => l.name === p);
  return lm ? { x: lm.x, y: lm.y } : { x: 160.64, y: 68.15 };
}

function playRecap(part) {
  const P = PARTS[part];
  if (!P || !P.recap) return false;
  let at = 3.4;
  const lines = P.recap.map(([place, text]) => {
    const v = lineVoiceFor(NARRATOR, text);
    const dur = Math.max(v ? v.dur + 0.4 : 0, 2.6, Math.min(6, 1 + text.length * 0.055));
    const l = { speaker: NARRATOR, text, at, dur, place: recapPlace(place) };
    at += dur + 0.3;
    return l;
  });
  // Rikus tells it on the radio: his voice in the broadcast
  // band, and the studio for the 'studio' lines (else the orbit of the first place)
  let studio = null, wasStudio = false;
  const fallback = recapPlace(P.recap.find(([p]) => p !== 'studio')[0]);
  return playCinematic({
    id: 'story-recap', priority: 2, duration: at + 0.4, pause: true, letterbox: true, skippable: true, hideHud: true,
    kicker: P.date ? `${partNumber(part)} · ${P.date}` : `Eerder in ${SERIES}`, title: P.name || P.title, cardFor: 3.2,
    lines: lines.map(({ speaker, text, at: a, dur }) => ({ speaker, text, at: a, dur, radio: true })),
    onStart: () => { studio = openStudio(); },
    onEnd: () => { if (studio) studio.dispose(); studio = null; },
    shot: (u, t) => {
      let k = lines.findIndex((l) => t < l.at + l.dur + 0.3);
      if (k < 0) k = lines.length - 1;
      const l = lines[k], lt = Math.max(0, t - (k ? l.at : 0));
      if (l.place.studio && studio) {
        wasStudio = true;
        studio.tick(t, t > l.at);
        return { ...studio.shot(k ? 1 : 0)(Math.min(1, lt / (l.dur + (k ? 0 : l.at)))), cut: true };
      }
      const c = l.place.studio ? fallback : l.place;
      const a = 0.8 + k * 1.9 + lt * 0.06, r = 66 - lt * 1.6;
      // out of the studio (high above the city) is a hard cut, not a swoop
      const cut = wasStudio;
      wasStudio = false;
      return { position: { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r, z: 27 - lt * 0.7 }, lookAt: { x: c.x, y: c.y, z: 10 }, fov: 48, cut };
    },
  });
}

// The end of the story: the epilogue (the last part's card lines) and the
// Fjord Frituur. The credits wait until everything is done (playCredits).
function playFinale(part) {
  const P = PARTS[part];
  // the ending plays over the Grote Markt: the world streams around the player
  const p = world.player;
  const spot = world.map.nearestRoadPoint(...FINALE_SPOT, 120, false);
  if (spot && !p.inVehicle) {
    p.x = spot.x; p.y = spot.y;
    world.teleported = world.time;
    const c = world.companion;
    if (c && !c.inVehicle) { c.x = p.x + 1.2; c.y = p.y + 0.6; }
  }
  let at = 3.2;
  const card = P.card || [];
  const lines = card.map(([speaker, text], k) => {
    const v = lineVoiceFor(speaker, text);
    const dur = Math.max(v ? v.dur + 0.3 : 0, 2.2, Math.min(5.2, 1 + text.length * 0.05));
    const l = { speaker, text, at, dur, radio: speaker === NARRATOR, studio: speaker === NARRATOR && k === card.length - 1 };
    at += dur + 0.25;
    return l;
  });
  let studio = null;
  const orbit = finaleShot(0);
  const ok = playCinematic({
    id: 'story-card', priority: 2, duration: at + 0.6, pause: true, letterbox: true, skippable: true, hideHud: true,
    kicker: 'Epiloog · september', title: 'Alles voor één eierbal', cardFor: 3, lines,
    onStart: () => { studio = openStudio(); },
    onEnd: () => { if (studio) studio.dispose(); studio = null; },
    // lines are timed to their recordings, so attachVoices keeps these times
    shot: (u, t) => {
      const l = lines[lines.length - 1];
      if (l && l.studio && studio && t >= l.at - 0.2) {
        studio.tick(t, true);
        return { ...studio.shot(1)(Math.min(1, (t - l.at) / 5)), cut: true };
      }
      return orbit(u, t);
    },
  });
  if (!ok) return false;
  const q = (spec) => playCinematic({ id: 'story-card', priority: 2, pause: true, letterbox: true, skippable: true, hideHud: true, queue: true, ...spec });
  const fromStudio = finaleShot(40);
  q({ duration: 5, big: 'Wij tweeën vóór Grunn.', kicker: GAME_TITLE, shot: (u, t) => ({ ...fromStudio(u, t), cut: t < 0.1 }) });
  // then the Fjord Frituur comes out from under its sheet and Tessa drives off in it
  queueFjordReveal(world);
  state.cards.add(part);
  const left = endingLeftText(getEnding());
  phone(SERIES, left
    ? `Het verhaal is uit, Grunn nog niet. Nog ${left} te gaan, dan pas mag de aftiteling. Alles staat in het menu onder Activiteiten.`
    : 'Het verhaal is uit. Grunn blijft van jou: alle missies staan in het menu onder Activiteiten.', 9);
  return true;
}

// --- the real end: credits once every mission and challenge is done ----------------

// A skipped mission counts as passed once it has been won after all (replayed).
function getEnding() {
  const missions = [];
  STEPS.forEach((s, k) => {
    const i = missionIdx(s);
    // a continuation (Deel 4) is extra: the credits do not wait for it
    if (i < 0 || !stepAvailable(s) || PARTS[s.part].after) return;
    const passed = isMissionCompleted(i) && isDone(s, k) && (!state.skipped.has(s.id) || isUnlocked(`m${i + 1}_klaar`));
    missions.push({ code: s.id, title: s.title, passed });
  });
  const finale = state.cards.has(FINALE_PART);
  return endingProgress({ finale, missions }, getChallengeProgress());
}

export function getStoryEnding() {
  return { ...getEnding(), credits: state.flags.has('credits') };
}

// "Aftiteling bekijken" in the pause menu: plays once the menu has closed.
export function requestCredits() {
  if (!state.flags.has('credits')) return false;
  rt.creditsPending = true;
  return true;
}

function playCredits() {
  const q = (spec) => playCinematic({ id: 'story-credits', priority: 2, pause: true, letterbox: true, skippable: true, hideHud: true, queue: true, ...spec });
  const ok = q({ duration: 5, big: 'Alles voor één eierbal', kicker: GAME_TITLE, shot: finaleShot(40) });
  if (!ok) return false;
  CREDITS.forEach(([name, role], k) => q({ duration: 3.2, kicker: role, title: name, cardFor: 3.2, shot: finaleShot(45 + k * 3.2) }));
  q({ duration: 4.5, logo: true, shot: finaleShot(46 + CREDITS.length * 3.2) });
  q({ duration: 4, big: 'Einde', kicker: 'Grunn is van jou', shot: finaleShot(50.5 + CREDITS.length * 3.2) });
  return true;
}

function updateCredits(dt, w) {
  const busy = isMissionActive() || isChallengeActive() || isCinematicActive() || narrativeBusy() || w.pigeonMode || w.pendingRespawn || isBannerUp();
  if (busy) return;
  if (rt.creditsPending) {
    if (playCredits()) rt.creditsPending = false;
    return;
  }
  if ((rt.endingT = (rt.endingT || 0) - dt) > 0) return;
  rt.endingT = 1;
  if (!creditsDue(getEnding(), { seen: state.flags.has('credits') })) return;
  if (!playCredits()) return;
  state.flags.add('credits');
  phone(SERIES, 'Alles gedaan. Echt alles. Grunn is van jou. Klap je telefoon open: de aftiteling staat bij Overzicht.', 8);
}

function playEndCard(part) {
  if (PARTS[part] && PARTS[part].finale && currentStep().finale) return playFinale(part);
  const card = {
    kicker: PARTS[part] ? PARTS[part].end : '', title: 'Alles voor één eierbal', cardFor: 2.4, big: (PARTS[part] && PARTS[part].big) || 'Wordt vervolgd…',
    lines: ((PARTS[part] && PARTS[part].card) || []).map(([speaker, text], k) => ({ speaker, text, at: 2.6 + k * 2, dur: 1.9 })),
  };
  const pl = world.player, vh = pl.inVehicle;
  // staged (cutscenes.js END_CARD), the plain card as the fallback
  const ok = playScript(world, END_CARD, {
    lines: card.lines, duration: 6.5,
    anchor: { x: vh ? vh.x : pl.x, y: vh ? vh.y : pl.y, facing: vh ? vh.angle : pl.angle || 0, z: 0 },
    cine: { id: 'story-card', priority: 2, kicker: card.kicker, title: card.title, cardFor: card.cardFor, big: card.big },
  }) || playCinematic({ id: 'story-card', priority: 2, duration: 6.5, pause: true, letterbox: true, skippable: true, hideHud: true, ...card });
  if (!ok) return false;
  state.cards.add(part);
  phone(SERIES, PARTS[part].after ? `${PARTS[part].end}. Grunn blijft van jou: alle missies staan in het menu onder Activiteiten.` : `${PARTS[part].end}. Dit stuk van het nieuwe verhaal is nog niet gebouwd. Tot die tijd is Grunn van jou: alle missies staan in het menu onder Activiteiten.`, 8, undefined, true);
  return true;
}

// The companion says a story step's line out loud: a speech bubble that
// follows them (scene3d.js world.extraSpeakers; voiced as a bubble line).
function companionSays(w, text) {
  const c = w.companion;
  if (!c || c.state === 'dead') return;
  const list = w.extraSpeakers || (w.extraSpeakers = []);
  const dur = Math.max(3, Math.min(6, 1.2 + text.length * 0.06));
  list.push({ x: c.x, y: c.y, h: 2.1, speechText: text, speechUntil: w.time + dur, follow: c, female: c.character === 'anita', speechName: c.character === 'anita' ? 'Anita' : 'Tammo' });
  rt.sayUntil = w.time + dur;
}

// --- who plays: Tammo or Tessa ----------------------------------------------------------

const charName = (c) => (c === 'anita' ? 'Anita' : 'Tammo');

// Tammo and Tessa trade roles where they stand: the body you control becomes
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
// A step's mission waits until its character has taken over. The proefvlucht
// (s-proefvlucht) comes first too: H15's trigger lies beside Roelf's demo heli,
// so walking up to him must not start the flight before he has had his say.
function swapDone(w, i) {
  if (w.coop && w.coop.fixedChars) return true; // coöp (#95): vaste personages, geen wissel
  const step = currentStep();
  if (step && !step.end && step.kind === 'activity' && step.goal && step.goal.type === 'flight' && !step.goal.over && !rt.base.met) return false;
  if (!step || step.end || step.kind !== 'mission' || missionIdx(step) !== i || !step.player) return true;
  return w.player.character === step.player;
}

// A calm moment for the handover: no mission banner up and a beat after a
// scene ended or a menu (a shop) closed; the game skips updateStory while paused.
function calmForSwap() {
  const now = performance.now();
  // a HUD card that is up (the purchase's "Gelukt!") is read first, for a while at most
  const card = document.body.classList.contains('hud-card-on');
  rt.cardSince = card ? rt.cardSince || now : 0;
  const reading = card && now - rt.cardSince < SWAP_CARD_WAIT * 1000;
  if (now - (rt.tickAt || 0) > 250 || isBannerUp() || reading || sinceCinematic() < SWAP_CALM || narrativeBusy()) rt.calmAt = now;
  rt.tickAt = now;
  return now - rt.calmAt > SWAP_CALM * 1000;
}

function updateCharacter(w) {
  const step = rt.cur;
  const want = step && !step.end ? step.player : rt.lastPlayer;
  if (step && !step.end && step.player) rt.lastPlayer = step.player;
  if (w.coop && w.coop.fixedChars) return; // coöp (#95): de host is Tammo, de gast Tessa
  const calm = calmForSwap();
  if (!want || w.player.character === want) { rt.swapWaitAt = 0; return; }
  if (isCinematicActive() || w.pigeonMode || isMissionActive() || w.player.ragdoll || w.pendingRespawn) return;
  const now = performance.now();
  if (!rt.swapWaitAt) rt.swapWaitAt = now;
  if (!calm && now - rt.swapWaitAt < SWAP_MAX_WAIT * 1000) return;
  rt.swapWaitAt = 0;
  swapCharacter(w, want);
  if (!playHandover(w, step)) {
    flash();
    w.addMessage(`${displayName(charName(w.player.character))} neemt het over`, 2.5);
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
    id: 'story-swap', priority: 1, duration: dur, pause: true, keepMotion: true, letterbox: true, skippable: true, hideHud: true,
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

// One rule for every step, in the pause menu (Overzicht, Te doen) and the O button
// on screen: a skip is only offered once the player has tried, after a failed
// attempt, a requirement that stays unmet, or a long time stuck on the step
// (a running story mission too: it is aborted first). force: the dev panel
// and the story test.
function skipEarned(step) {
  if ((state.fails[step.id] || 0) >= 1) return true;
  if (rt.gatedSince >= 0 && world.time - rt.gatedSince > GATED_SKIP_S) return true;
  if (isMissionActive()) return rt.runT > STUCK_SKIP_S;
  return step.kind === 'activity' && world.time - rt.enteredAt > REMIND_AFTER;
}

export function canSkipCurrent({ force = false } = {}) {
  const step = rt.cur;
  if (!step || step.end) return false;
  if (isMissionActive() && !(step.kind === 'mission' && activeMissionIndex() === missionIdx(step))) return false;
  return force || skipEarned(step);
}

function skipOffered() {
  const step = rt.cur;
  if (!step || step.end || isMissionActive()) return false;
  return skipEarned(step);
}

export function skipCurrent({ force = false } = {}) {
  const step = rt.cur;
  if (!canSkipCurrent({ force })) return false;
  if (isMissionActive() && !failActiveMission(world, 'Missie overgeslagen', 'Overgeslagen')) return false;
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
  if (step.waive === 'eikea') { waiveEikea(); return; }
  if (!grantStoryItem(world, step.waive) && step.goal && step.goal.req) state.waived.add(step.goal.req);
}

function initSkipUi() {
  if (els) return;
  const root = document.createElement('div');
  root.id = 'story-skip';
  root.hidden = true;
  root.innerHTML = '<button type="button"><span class="hud-key">O</span><span class="ss-label"></span></button>';
  const style = document.createElement('style');
  style.textContent = '#story-skip{position:fixed;left:50%;bottom:17%;transform:translateX(-50%);z-index:40;pointer-events:auto}' +
    '#story-skip button{zoom:var(--ui,1);display:flex;gap:10px;align-items:center;font:18px/1.1 \'Bebas Neue\',\'Arial Narrow\',Arial,sans-serif;letter-spacing:1px;color:#f0ede4;' +
    'background:radial-gradient(ellipse at center,rgba(23,48,31,.94),rgba(12,20,14,.94));border:1px solid rgba(63,201,122,.6);border-radius:4px;padding:9px 16px;cursor:pointer;box-shadow:0 6px 24px rgba(0,0,0,.4)}' +
    '#story-skip button:hover,#story-skip button:focus-visible{border-color:#3fc97a;box-shadow:0 0 0 1px #3fc97a,0 6px 24px rgba(0,0,0,.4);outline:none}' +
    '#story-skip .hud-key{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 6px;background:#fbfaf5;border:0;border-radius:5px;color:#0c140e;font:bold 13px/1 \'Bebas Neue\',\'Arial Narrow\',Arial,sans-serif;letter-spacing:1px;' +
    'box-shadow:0 2px 0 #a9a69b,0 0 0 1px rgba(0,0,0,.18)}' +
    'body.cine-hide-hud #story-skip{display:none}';
  document.head.appendChild(style);
  document.body.appendChild(root);
  root.querySelector('button').addEventListener('click', (e) => { e.stopPropagation(); skipCurrent(); });
  els = { root };
}

function hideSkip() {
  if (els) els.root.hidden = true;
  document.body.classList.remove('story-skip-on');
}

function updateSkipUi() {
  if (!els) return;
  const show = rt.skipUntil > world.time && skipOffered() && !world.pigeonMode;
  if (show) {
    const label = rt.cur && rt.cur.kind === 'activity' ? 'Sla deze stap over, verder met het verhaal' : 'Sla deze missie over, verder met het verhaal';
    const el = els.root.querySelector('.ss-label');
    if (el.textContent !== label) el.textContent = label;
  }
  if (els.root.hidden === show) { els.root.hidden = !show; document.body.classList.toggle('story-skip-on', show); }
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
  // hulp aanbieden na twee mislukkingen (#215): even na het mislukscherm
  rt.helpOffer = { at: w.time + 4, id: step.id };
}

function onGated() {
  rt.guideT = 0;
}

// --- init / update ------------------------------------------------------------------------

// what the validity of a queued message is judged against (validity.js)
function validityNow() {
  if (!world) return null;
  const s = currentStep();
  const m = world.mission;
  return { time: world.time, stepIndex: s && !s.end ? STEPS.indexOf(s) : STEPS.length, mission: m ? { phase: m.phase, index: m.index } : null, player: world.player ? { x: world.player.x, y: world.player.y } : null };
}

export function initStory(w) {
  world = w;
  setValidityContext(validityNow);
  setMissionHooks({ waived: (key) => state.waived.has(key), skipped: (i) => STEPS.some((s) => s.kind === 'mission' && missionIdx(s) === i && state.skipped.has(s.id)), passed: onPassed, failed: onFailed, gated: onGated, canStart: swapDone });
  // travel steps (storyreis.js): at the place the trip goes to, however you got there
  const busyNow = () => isMissionActive() || isCinematicActive() || narrativeBusy() || !!w.pigeonMode || !!w.pendingRespawn;
  Object.assign(GOALS, FUN_GOALS, EIKEA_GOALS, makeReisGoals({ getWorld: () => world, busy: busyNow, playLines: (id, from) => playTalk(talkLines(id, { from }), { id: 'reis:' + id, delay: 1.5 }) }));
  setMeetHook(meet);
  initStoryFun(w);
  initStoryEikea(w, () => (rt.cur && !rt.cur.end && rt.cur.goal && rt.cur.goal.type === 'eikea' ? rt.base : null));
  initSkipUi();
  registerNarrative('say', { active: () => !!world && (rt.sayUntil || 0) > world.time });
  ready = true;
  window.__story = storyApi;
}

// Kusjes (K) unlock with the first kiss, at the end of H13; before that the
// prompt, the key and the Besturing row don't exist (player.js, prompts.js,
// pausemenu.js read world.kissUnlocked).
const KISS_STEP = 'M16';
// H13 itself, not a later mission played ahead; and only once the story has
// got there: H13 played ahead from Te doen ("H13 nu al spelen?") left the
// missions before it open, and whoever you played then (Tammo or Tessa,
// depending on the step you were at) could kiss from H7 on.
function kissUnlockedNow() {
  const step = STEP_BY_ID.get(KISS_STEP);
  if (!step) return false;
  const i = missionIdx(step);
  const passed = state.done.has(KISS_STEP) || state.skipped.has(KISS_STEP) || (i >= 0 && isMissionCompleted(i));
  if (!passed) return false;
  const k = STEPS.indexOf(step);
  return STEPS.slice(0, k).every((s, j) => s.kind !== 'mission' || !stepAvailable(s) || isDone(s, j));
}

export function updateStory(dt, w) {
  if (!ready) return;
  world = w;
  if (document.body.classList.contains('game-started')) {
    // set on the first frame in play (no card for a loaded save), the card
    // only when it unlocks while playing
    const kiss = kissUnlockedNow();
    if (kiss && w.kissUnlocked === false) w.addMessage('Nieuw: geef elkaar een kusje met K', 4, { key: 'kiss-unlock' });
    w.kissUnlocked = kiss;
  }
  if (w.devInvuln) { w.health = 100; if (w.pendingRespawn && !w.pendingRespawn.busted) w.pendingRespawn = null; }
  if (!document.body.classList.contains('game-started')) return;
  const cur = currentStep();
  const same = cur === rt.cur || (cur.end && rt.cur && rt.cur.end === cur.end);
  if (!same) enter(cur);
  const step = rt.cur;
  rt.runT = step && !step.end && step.kind === 'mission' && activeMissionIndex() === missionIdx(step) ? (rt.runT || 0) + dt : 0;
  updateSkipUi();
  if (rt.helpOffer && w.time > rt.helpOffer.at && !isCinematicActive() && !isBannerUp() && !w.paused) {
    const o = rt.helpOffer;
    rt.helpOffer = null;
    maybeOfferHelp(w, o.id, state.fails[o.id] || 0);
  }
  updateCharacter(w);
  updateStoryTalk(dt, w);
  updateStoryFun(dt, w, step, rt.base);
  updateStoryEikea(dt, w, step, rt.base);
  if (!step) return;
  if (step.end) {
    if (rt.cardPending && !isMissionActive() && !isCinematicActive() && !narrativeBusy() && !w.pigeonMode && playEndCard(rt.cardPending)) rt.cardPending = null;
    else if (!rt.cardPending && step.finale && state.cards.has(step.end)) updateCredits(dt, w);
    return;
  }
  // Deel 4 is extra: the credits of the main story may roll in the middle of it
  if (PARTS[step.part].after && state.cards.has(FINALE_PART)) updateCredits(dt, w);
  if (rt.recapPending && !isMissionActive() && !isCinematicActive() && !narrativeBusy() && !w.pigeonMode && !w.pendingRespawn) {
    const part = rt.recapPending;
    rt.recapPending = null;
    if (playRecap(part)) { state.flags.add('recap:' + part); rt.leadAt = w.time + LEAD_DELAY; }
  }
  if (rt.clueToasts.length && !isCinematicActive() && !w.pigeonMode) {
    const c = rt.clueToasts.shift();
    w.addMessage(c.kind === 'taal' ? `Gronings geleerd: ${c.title}. Lees terug in het pauzemenu, Verhaal: "Aanwijzingen"` : `Nieuwe aanwijzing: ${c.title}. Lees terug in het pauzemenu, Verhaal: "Aanwijzingen"`, 4.5);
    playClueSting();
  }
  // the next step's text waits until a scene has been over for a moment, and
  // until the step's character has taken over: its "Bel Rikus" would hold the handover off
  const handoverDue = !!step.player && w.player.character !== step.player && !isMissionActive();
  if (rt.leadAt >= 0 && w.time >= rt.leadAt && !isCinematicActive() && sinceCinematic() > LEAD_AFTER_SCENE && !storyFunBusy() && !handoverDue) {
    rt.leadAt = -1;
    if (step.lead) phone(who(step.lead[0]), step.lead[1], 7, undefined, !!step.silent);
    sendScript(step, 'start');
    const buy = isPurchase(step) && (world.storyGuide && world.storyGuide.buy ? world.storyGuide.name : storyBuyLabel(world));
    if (buy) world.addMessage(`Voor het verhaal: ${buy}`, 6, { kind: 'missie', key: 'story-buy' });
    if (step.say) rt.sayAt = w.time + (step.lead ? SAY_AFTER_LEAD : 0);
    queueContacts(step, 'lead');
  }
  // the companion's remark follows the lead text instead of talking over it
  if (rt.sayAt >= 0 && w.time >= rt.sayAt && !isCinematicActive() && !isCallActive() && mayStart('say')) {
    rt.sayAt = -1;
    if (step.say) companionSays(w, step.say[1]);
  }
  // travel beats (#97): the choice ride along / drive / skip before a long jump, behind ?reizen
  if (FLAGS.reizen && rt.leadAt < 0) {
    tickStoryTravel({ on: true, step, flags: state.flags, world: w, ask: askTravel, ride: rideWith(w, startMeerijden), script: storyScene,
      busy: isMissionActive() || isCinematicActive() || narrativeBusy() || !!w.pigeonMode || !!w.pendingRespawn || travelPromptOpen() });
  }
  // the voorschot follows the lead that says what it is for
  if (rt.leadAt < 0 && (rt.voorschotT -= dt) <= 0) { rt.voorschotT = 2; checkVoorschot(step); }
  if (step.kind === 'activity') {
    const g = GOALS[step.goal.type];
    if (step.goal.type === 'night' || step.goal.type === 'home') updateHomeWait(step);
    if (g && g.met(step, rt.base)) { markDone(step); rt.cur = undefined; return; }
  } else if (rt.gate === 'night' && !isMissionActive()) updateHomeWait(step);
  if ((rt.guideT -= dt) <= 0) { rt.guideT = GUIDE_EVERY; refreshGuide(); }
  if (!rt.reminded && w.time - rt.enteredAt > REMIND_AFTER && !isMissionActive()) {
    rt.reminded = true;
    if (step.kind === 'activity') rt.skipUntil = w.time + 60;
    const from = step.lead ? who(step.lead[0]) : 'Anita';
    const remind = from === 'Tammo' ? SMS_SAY.remindT : from === 'Anita' ? SMS_SAY.remindA : null;
    phone(from, `Nog even dit: ${step.title}. Staat op je kaart, als je zin hebt.`, 6, remind ? remind.lines[0] : undefined, !!step.silent);
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
  if (world) world.kissUnlocked = false;
  if (!d || typeof d !== 'object' || d.v !== 1) return;
  const ids = (list) => (Array.isArray(list) ? list.filter((id) => STEP_BY_ID.has(id)) : []);
  state.done = new Set(ids(d.done));
  state.skipped = new Set(ids(d.skipped));
  state.voorschot = new Set(ids(d.voorschot));
  state.waived = new Set((Array.isArray(d.waived) ? d.waived : []).filter((k) => typeof k === 'string'));
  state.cards = new Set((Array.isArray(d.cards) ? d.cards : []).filter((k) => PARTS[k]));
  state.flags = new Set((Array.isArray(d.flags) ? d.flags : []).filter((k) => typeof k === 'string'));
  for (const [id, n] of Object.entries(d.fails || {})) if (STEP_BY_ID.has(id) && Number.isFinite(n)) state.fails[id] = n;
  // no frame with the old save's kisses (player.js runs before updateStory)
  if (world) world.kissUnlocked = kissUnlockedNow();
}

// Who Tammo and Tessa have met (name cards, namecard.js): a 'met:<key>' flag each.
function meet(key) {
  const f = 'met:' + key;
  if (state.flags.has(f)) return false;
  state.flags.add(f);
  return true;
}

// For a later "Verhaal" menu: every character with name, card line, bio and
// quote, and whether they were met in this playthrough.
export function getStoryCharacters() {
  return Object.entries(CHARACTERS).map(([key, c]) => ({ key, ...c, met: state.flags.has('met:' + key) }));
}

export function storyFlag(name) {
  return state.flags.has(name);
}

// A choice that must outlive its mission (M23's ally, read again in M26): a 'keuze:<naam>' flag, saved with the rest.
export function rememberStoryChoice(name) {
  // one answer per group ('bond-bus' replaces 'bond-trekker'): a replay of the mission can choose again
  const group = 'keuze:' + name.split('-')[0] + '-';
  for (const f of [...state.flags]) if (f.startsWith(group)) state.flags.delete(f);
  state.flags.add('keuze:' + name);
}

// --- views for the pause menu, phone and dev tools ------------------------------------------

// "Wat weten we?": the clues and turning points of the steps done so far
// (newest first) and what Tammo and Tessa are after in this part.
export function getStoryJournal() {
  const step = rt.cur || currentStep();
  const part = step && (step.part || step.end) || 'kop';
  const done = new Set(STEPS.filter((s, k) => isDone(s, k)).map((s) => s.id));
  const found = CLUES.filter((c) => done.has(c.step)).map((c) => ({ ...c, isNew: rt.newClues.has(c.title) })).reverse();
  // the new story: Jelle's plakjes, and how each one ended (plakjes.js)
  const plakjes = plakjesState(done, step && step.id);
  return { why: step && step.finale ? 'Grunn is van jou. En de Fjord Frituur staat op de Vismarkt.' : WHY[part] || '', found, total: CLUES.length, plakjes };
}

// The clues per part, for a later "Verhaal" menu: { kop: [...], romp, staart }, each
// { step, kind, title, text, found }.
export function getStoryCluesByPart() {
  const done = new Set(STEPS.filter((s, k) => isDone(s, k)).map((s) => s.id));
  const out = {};
  for (const part of Object.keys(PARTS)) out[part] = CLUES.filter((c) => (STEP_BY_ID.get(c.step) || {}).part === part).map((c) => ({ ...c, found: done.has(c.step) }));
  return out;
}

export function markCluesSeen() {
  rt.newClues.clear();
}

// Every step of the arc for the pause menu's Te doen › Verhaal, in play
// order: { id, part, kind, title, mission (index), player, reward, cost, goal,
// lead, done, skipped, current, available }.
export function getStorySteps() {
  const step = rt.cur || currentStep();
  const cur = step && !step.end ? step.id : null;
  return STEPS.map((s, k) => ({
    id: s.id, part: s.part, kind: s.kind, title: s.title, mission: missionIdx(s), player: s.player || null,
    reward: s.reward || 0, cost: s.cost || 0, goal: s.goal || null, lead: s.lead ? s.lead[1] : '',
    done: isDone(s, k), skipped: state.skipped.has(s.id), current: s.id === cur, available: stepAvailable(s),
  }));
}

// A story mission later than the current step (playing it now runs ahead of
// the story): { code, title, now: { code, title } }, else null.
export function storyMissionAhead(i) {
  const k = STEPS.findIndex((s) => s.kind === 'mission' && missionIdx(s) === i);
  if (k < 0 || isDone(STEPS[k], k)) return null;
  const step = rt.cur || currentStep();
  if (!step || step.end) return null;
  const c = STEPS.indexOf(step);
  if (c < 0 || k <= c) return null;
  return { code: STEPS[k].id, title: STEPS[k].title, now: { code: step.kind === 'mission' ? step.id : '', title: step.title } };
}

export function getStoryView() {
  const step = rt.cur || currentStep();
  const avail = STEPS.filter(stepAvailable);
  const done = avail.filter((s) => isDone(s, STEPS.indexOf(s))).length;
  if (!step || step.end) {
    const ending = step && step.finale ? getStoryEnding() : null;
    const left = ending && !ending.done ? endingLeftText(ending) : '';
    const title = !ending ? 'Wordt vervolgd…' : left ? `Nog ${left} tot het einde` : 'Einde. Grunn is van jou.';
    return { end: true, part: step ? step.end : 'kop', title, ending, done, total: avail.length };
  }
  return {
    end: false, id: step.id, part: step.part, partTitle: PARTS[step.part].title, kind: step.kind, title: step.title,
    lead: step.lead ? `${who(step.lead[0])}: ${step.lead[1]}` : '', canSkip: canSkipCurrent(), fails: state.fails[step.id] || 0,
    skipLabel: step.kind === 'mission' ? 'Sla deze missie over, verder met het verhaal' : 'Sla deze stap over, verder met het verhaal',
    done, total: avail.length,
  };
}
registerStoryQueries({ currentStep, storyFlag, getStoryView, storyVoorschotInfo, prepareStoryShop, getStorySave });

// Dev chapter select: rebuilds the progress, money and belongings a player
// would have right before step `id` (worst case money from the timeline).
// opts.start: de missie van de stap ook meteen starten (QA en spelbot: phase 'active'); zonder staat de speler
// naast de startplek en start de missie zoals voor een speler.
let jumpSettle = 0;
export function devJumpTo(id, opts = {}) {
  const k = STEPS.findIndex((s) => s.id === id);
  if (k < 0 || !stepAvailable(STEPS[k])) return false;
  const p0 = world.player;
  const fromX = p0.x, fromY = p0.y;
  for (const a of jumpPrep({ missionActive: isMissionActive(), pigeon: !!world.pigeonMode, heliRun: isHeliRunActive(), inVehicle: !!p0.inVehicle })) {
    if (a === 'abortMission') failActiveMission(world, 'Missie afgebroken', 'Afgebroken');
    else if (a === 'stopPigeon') stopPigeonMode(world);
    else if (a === 'abortHeli') abortHeliRun();
    else if (a === 'exitVehicle') p0.exitVehicle(world.map, world);
  }
  if (isMissionActive()) return false;
  // a cinematic of the old place (the game-start flight, a scene) would play on over the new one: a title card over a blank view (#267)
  if (isCinematicActive()) skipCinematic();
  const prior = STEPS.slice(0, k);
  Object.assign(state, freshState());
  rt = freshRuntime();
  for (const s of prior) {
    state.done.add(s.id);
    if (s.unlocks) state.flags.add(s.unlocks);
  }
  // a jump into Deel 4: the finale card of act 5 has played, or the gate (nextStoryStep) would send the story back to it
  if (PARTS[STEPS[k].part].after) state.cards.add(PARTS[STEPS[k].part].after);
  const completed = prior.filter((s) => s.kind === 'mission' && missionIdx(s) >= 0).map(missionIdx);
  const prog = getMissionProgress();
  setMissionProgress(world, { index: prog.index, completed, seen: completed });
  world.money = computeMoneyTimeline().rows[k].before;
  world.wanted = 0;
  for (const s of prior) if (s.waive === 'eikea') waiveEikea(); else if (s.waive && s.waive !== 'night') grantStoryItem(world, s.waive);
  const target = STEPS[k];
  const needsNight = target.id === 'H6' || target.id === 'M06';
  world.clock = needsNight ? NIGHT_HOUR : target.id === 'k-nacht' ? 14 : 12;
  refreshDayNight(world);
  enter(target);
  if (target.player) swapCharacter(world, target.player);
  const idx = missionIdx(target);
  const def = idx >= 0 ? getMissionDefs()[idx] : null;
  const vrij1 = (x, y) => !buildingAt(world.map, x, y, 0.5) && !waterAt(world.map, x, y);
  // een ruime plek eerst; is die er niet (een smalle steeg), dan volstaat een vrij punt
  const vrijRuim = (x, y) => openRond(vrij1, x, y);
  const vrij = vrij1;
  const landOn = (spot) => {
    const p = world.player;
    const [ex, ey] = world.map.escapeBuilding ? world.map.escapeBuilding(spot.x, spot.y, 0.5) : [spot.x, spot.y];
    if (p.inVehicle) { p.inVehicle.x = ex; p.inVehicle.y = ey; p.inVehicle.speed = 0; }
    p.x = ex; p.y = ey;
  };
  const spot = jumpSpot(def, world.storyGuide, { dist: 12, vrij: vrijRuim }) || jumpSpot(def, world.storyGuide, { dist: 12, vrij });
  if (spot) {
    landOn(spot);
    // a far jump hides the view behind the load screen while the streets stream in: the game's own watch swallows it right
    // after a cinematic, and the world would show bare for a few seconds (#267)
    if (Math.hypot(world.player.x - fromX, world.player.y - fromY) >= JUMP_M) world.devJumpLoad = true;
    // de tegels om de landingsplek zijn na een verre sprong nog niet binnen: buildingAt ziet dan geen gebouw en de speler
    // staat even later in een gevel (camera tegen een muur, #261). Zodra ze er zijn, kijkt dit opnieuw naar een vrije plek.
    const token = ++jumpSettle;
    const from = { x: world.player.x, y: world.player.y };
    withTiles(world.map, [[spot.x, spot.y]], () => {
      const p = world.player;
      if (token !== jumpSettle || Math.hypot(p.x - from.x, p.y - from.y) > 8 || vrijRuim(p.x, p.y)) return;
      const again = jumpSpot(def, world.storyGuide, { dist: 12, vrij: vrijRuim }) || jumpSpot(def, world.storyGuide, { dist: 12, vrij });
      if (again) landOn(again);
    }, { radius: 400, token: 'sprong' }).catch(() => {});
  }
  if (opts.start && idx >= 0 && !isMissionActive()) missionDebug.start(world, idx);
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
  characters: () => getStoryCharacters(),
  clues: () => getStoryCluesByPart(),
  jump: (id, opts) => devJumpTo(id, opts),
  complete: devCompleteStep,
  skip: (force) => skipCurrent({ force: !!force }),
  canSkip: () => canSkipCurrent(),
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
  goalPhase: () => rt.base && rt.base.phase,
  ending: getStoryEnding,
  credits: requestCredits,
  character: () => world.player.character,
  swapInfo: () => ({ want: rt.cur && rt.cur.player, me: world.player.character, comp: world.companion && world.companion.character, paused: !!world.paused, cine: isCinematicActive(), pigeon: !!world.pigeonMode, mission: isMissionActive(), ragdoll: !!world.player.ragdoll, respawn: !!world.pendingRespawn, banner: isBannerUp(), card: document.body.classList.contains('hud-card-on'), narrative: narrativeState() }),
};
