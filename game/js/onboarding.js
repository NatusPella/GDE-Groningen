// Uitleg for new players (.specs-fire/standards/mechanica.md): a handful of short tip cards,
// each once, at the moment it is useful: the first goal, money and shops,
// choosing your own goal on the map, and Te doen. About goals and where to
// go, not about keys: the key hints (prompts.js) only cover what is not
// obvious (E, T, M, Esc), never walking, running, jumping or the camera.
//
// - One at a time: a lesson only starts when everything the narrative
//   scheduler watches (scenes, radio, story texts, calls, banter, subtitles,
//   cards) has been quiet for QUIET seconds, and the previous lesson is GAP
//   seconds old. Never blocks play: they are ordinary HUD tip cards.
// - Seen lessons are kept per device (gde-uitleg), like the hint progress, so
//   a second playthrough gets none. A lesson whose key the player already
//   used (hintUses) counts as seen.
// - Instellingen › Weergave › "Uitleg voor nieuwe spelers" turns them off;
//   the first card says so.
import { showCard, cardsBusy } from './hudcards.js';
import { mayStart, narrativeState } from './narrative.js';
import { isCinematicActive, sinceCinematic } from './cinematics.js';
import { isPauseMenuOpen } from './pausestate.js';
import { getSettings } from './settings.js';
import { physicalKey, keyName, tokenKey, isSamenSessie } from './controls.js';
import { hintUses, glyphHtml } from './prompts.js';
import { KEYS } from './storagekeys.js';
import { playerBusy } from './busy.js';
import { lessonsAllSeen, goalHandled } from './onboardinglogic.js';
import { createCourse, trackCourse, courseNudged, pauseCourse, NUDGE, NUDGE_CARD } from './firststeps.js';
import { hoofdspeler } from './players.js';
import { escapeHtml as escHtml } from './htmlescape.js';

const STORE_KEY = KEYS.onboarding;
const FIRST_AFTER = 12;
const GAP = 30;
const AFTER_SCENE = 4;
const AFTER_MISSION = 8;
// everything the narrative scheduler watches has been quiet this long
const QUIET = 4;
const SKIP_NOTE = 'Uitleg uit: {ESC} › Instellingen.';

// {E} in a card is a key glyph (prompts.js glyphHtml): the rebound key, or the
// controller button when a controller was used last (glyphs.js).
const KEY_TOKEN = /\{(\w+)\}/g;
const plainKeys = (t) => t.replace(KEY_TOKEN, (m, k) => keyName(physicalKey(getSettings().keyBinds || {}, tokenKey(k))));
const htmlKeys = (t) => t.split(KEY_TOKEN).map((part, i) => (i % 2 ? glyphHtml(part) : escHtml(part))).join('');
const missionOn = (w) => !!(w.mission && w.mission.phase === 'active');
const busy = (w) => missionOn(w) || playerBusy(w, ['sideJob', 'challenge', 'padel', 'activityGame', 'heliRun', 'pigeon']).busy;

// In order: the first lesson that applies plays.
const LESSONS = [
  {
    id: 'doel',
    when: (w) => !!w.storyGuide && w.stats.missionsDone === 0 && !busy(w),
    card: () => ({ title: 'Je eerste klus', body: `Je doel staat bovenin. Volg de gele route.` }),
  },
  {
    id: 'geld',
    when: (w) => !!(w.storyGuide && w.storyGuide.buy) && !busy(w),
    card: () => ({ title: 'Geld en winkels', body: 'Geld komt van klussen; je saldo staat rechtsboven. Winkel: naar binnen en {E}.' }),
  },
  {
    id: 'kaart',
    known: () => hintUses('map') > 0,
    when: (w, s) => goalHandled(s, w.stats.missionsDone) && !busy(w),
    card: () => ({ title: 'Zelf kiezen', body: `Liever iets anders? Kies op de kaart ({M}). ${SKIP_NOTE}` }),
  },
  {
    id: 'tedoen',
    when: (w) => w.stats.missionsDone > startDone && !busy(w),
    card: () => ({ title: 'Activiteiten', body: 'Missie klaar en opgeslagen. Alles staat onder {ESC} › Verhaal of Activiteiten.' }),
  },
  {
    id: 'eerstedag',
    when: (w, s) => s.has('tedoen') && !busy(w),
    card: () => ({ title: 'Je eerste dag', body: 'Kleding en spuiterij helpen tegen de politie. {5} zet een routepunt.' }),
  },
  {
    id: 'samen',
    // na de eerste missie, niet tijdens een missie of een dienst, en niet als je al samen speelt. Alleen
    // spelen is sinds #554 een sessie van één (wel een hub), maar geen samen-sessie: daar hoort de kaart
    // juist wel te komen (#568).
    when: (w) => w.stats.missionsDone > startDone && !busy(w) && !isSamenSessie(w),
    card: () => ({ title: 'Samen spelen', body: 'Met vrienden? {ESC} › Samen spelen. Je geld en spullen blijven van jou.' }),
  },
];

let seen = load();
let playT = 0;
let lastAt = -Infinity;
let missionEndT = -Infinity;
let wasMission = false;
let startDone = -1;
// the reminder for a new player who drifts away from the first goal (firststeps.js): per session, never saved
const course = createCourse();
let courseDist = NaN;
let courseStep = '';

// The distance to the current story goal while the player is simply on his way to it, NaN otherwise: an own goal, a
// mission, a job or game means he is not lost. Audit speelbaarheid 23-11: not only the first goal: a later step has the
// same player who drifts off or stands still; the time reminder (storyremind.js) only fires after 5 minutes.
function storyGoalDistance(w) {
  const g = w.storyGuide;
  if (!g || w.storyFreePlay || busy(w) || w.goal) return NaN;
  const p = hoofdspeler(w);
  return p ? Math.hypot(g.x - p.x, g.y - p.y) : NaN;
}

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    return new Set(Array.isArray(d) ? d.filter((x) => typeof x === 'string') : []);
  } catch (e) {
    return new Set();
  }
}

function markSeen(id) {
  seen.add(id);
  try { localStorage.setItem(STORE_KEY, JSON.stringify([...seen])); } catch (e) { /* memory only */ }
}

// Nothing narrative plays or waits (a scene, Rikus on the radio, a story
// text, a call, car talk, a subtitle, another card) and nothing did for QUIET s.
function quiet() {
  const ns = narrativeState();
  if (ns.active.length || ns.pending.length) return false;
  return Object.values(ns.since).every((s) => s >= QUIET);
}

export function resetOnboarding() {
  seen = new Set();
  try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
}

export function updateOnboarding(dt, w) {
  if (!document.body.classList.contains('game-started') || w.paused || isPauseMenuOpen()) return;
  if (getSettings().onboardingTips === false) return;
  const allSeen = lessonsAllSeen(seen);   // the five cards are done; the "lost" reminder keeps working for every step
  if (startDone < 0) startDone = w.stats.missionsDone;
  const on = missionOn(w);
  if (wasMission && !on) missionEndT = playT;
  wasMission = on;
  if (isCinematicActive() || sinceCinematic() < AFTER_SCENE) return;
  playT += dt;
  courseDist = storyGoalDistance(w);
  // the first goal keeps its two reminders per session; every later step gets one of its own
  const stepNow = w.storyGuide ? w.storyGuide.step || 'doel' : '';
  if (stepNow !== courseStep) { courseStep = stepNow; if (stepNow && w.stats.missionsDone > 0) course.count = Math.min(course.count, NUDGE.max - 1); }
  const lost = Number.isFinite(courseDist) ? trackCourse(course, w.storyGuide.step || 'doel', courseDist, dt) : (pauseCourse(course), '');
  if (playT < FIRST_AFTER || playT - lastAt < GAP || playT - missionEndT < AFTER_MISSION) return;
  if (w.health <= 0 || w.pendingRespawn || w.wanted > 0 || w.voetbalGame) return;   // tijdens een voetbalwedstrijd spreekt er hoogstens: scorebalk, een melding en de spelerskaart (Club-UI 24-11)
  // after the goal card, and only when nothing else speaks: the same one-at-a-time rule as the lessons
  if (lost && (seen.has('doel') || allSeen)) {
    if (!quiet() || cardsBusy() || !mayStart('card')) return;
    showCard(w, { kind: 'tip', kicker: 'Uitleg', title: NUDGE_CARD.title, body: NUDGE_CARD.body, key: 'uitleg-route', important: true, voice: false, duration: 8 });
    courseNudged(course, courseDist);
    lastAt = playT;
    return;
  }
  if (allSeen) return;
  for (const l of LESSONS) {
    if (seen.has(l.id)) continue;
    if (l.known && l.known()) { markSeen(l.id); continue; }
    if (!l.when(w, seen)) continue;
    if (!quiet() || cardsBusy() || !mayStart('card')) return;
    const c = l.card();
    showCard(w, { kind: 'tip', kicker: 'Uitleg', title: c.title, body: plainKeys(c.body), bodyHtml: htmlKeys(c.body), key: 'uitleg-' + l.id, important: true, voice: false, duration: 9, onClose: () => markSeen(l.id) });
    lastAt = playT;
    return;
  }
}

if (typeof window !== 'undefined') window.__onboarding = { seen: () => [...seen], reset: resetOnboarding };
