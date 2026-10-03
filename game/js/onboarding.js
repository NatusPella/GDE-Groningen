// Uitleg for new players (docs/ONBOARDING.md): a handful of short tip cards,
// each once, at the moment it is useful: the first goal, money and shops,
// the phone, the map and Te doen. The key hints (prompts.js) teach the
// controls themselves; this covers what the HUD cannot say in a key cap.
//
// - One at a time: a lesson only starts when everything the narrative
//   scheduler watches (scenes, radio, story texts, calls, banter, subtitles,
//   cards) has been quiet for QUIET seconds, and the previous lesson is GAP
//   seconds old. Never blocks play: they are ordinary HUD tip cards.
// - Seen lessons are kept per device (gte-uitleg), like the hint progress, so
//   a second playthrough gets none. A lesson whose key the player already
//   used (hintUses) counts as seen.
// - Instellingen › Weergave › "Uitleg voor nieuwe spelers" turns them off;
//   the first card says so.
import { showCard, cardsBusy } from './hudcards.js';
import { mayStart, narrativeState } from './narrative.js';
import { isCinematicActive, sinceCinematic } from './cinematics.js';
import { isPauseMenuOpen } from './pausemenu.js';
import { getSettings } from './settings.js';
import { physicalKey, keyName } from './controls.js';
import { hintUses } from './prompts.js';

const STORE_KEY = 'gte-uitleg';
const FIRST_AFTER = 12;
const GAP = 30;
const AFTER_SCENE = 4;
const AFTER_MISSION = 8;
// everything the narrative scheduler watches has been quiet this long
const QUIET = 4;
const SKIP_NOTE = 'Ken je dit soort games? Esc › Instellingen › Weergave zet de uitleg uit.';

const key = (k) => `[${keyName(physicalKey(getSettings().keyBinds || {}, k)).toUpperCase()}]`;
const missionOn = (w) => !!(w.mission && w.mission.phase === 'active');
const busy = (w) => missionOn(w) || !!(w.sideJob && w.sideJob.active) || !!w.challenge || !!w.padelGame || !!w.activityGame || !!w.heliRun || !!w.pigeonMode;

// In order: the first lesson that applies plays.
const LESSONS = [
  {
    id: 'doel',
    when: (w) => !!w.storyGuide && w.stats.missionsDone === 0 && !busy(w),
    card: () => ({ title: 'Je eerste klus', body: `Bovenin staat je doel. Volg de gele route op de minimap tot in de gele marker. ${SKIP_NOTE}` }),
  },
  {
    id: 'geld',
    when: (w) => !!(w.storyGuide && w.storyGuide.buy) && !busy(w),
    card: () => ({ title: 'Geld en winkels', body: `Geld verdien je met missies en bijbaantjes; je saldo staat rechtsboven. Een winkel staat op de kaart: loop naar binnen en druk ${key('e')}.` }),
  },
  {
    id: 'telefoon',
    known: () => hintUses('phone') > 0,
    when: (w, s) => s.has('doel') && !busy(w),
    card: () => ({ title: 'Je telefoon', body: `Berichten gemist? ${key('t')} opent je telefoon: berichten terugkijken, contacten bellen en Kiekdoar lezen.` }),
  },
  {
    id: 'kaart',
    known: () => hintUses('map') > 0,
    when: (w, s) => s.has('doel') && !busy(w),
    card: () => ({ title: 'De kaart', body: `${key('m')} opent de kaart. Klik op een plek of missie en de gele route gaat erheen. Het verhaal wacht zolang.` }),
  },
  {
    id: 'tedoen',
    when: (w) => w.stats.missionsDone > startDone && !busy(w),
    card: () => ({ title: 'Te doen', body: 'Missie binnen, en het spel heeft opgeslagen. Alles wat nog openstaat staat onder Esc › Te doen: kies iets en de route gaat erheen.' }),
  },
];

let seen = load();
let playT = 0;
let lastAt = -Infinity;
let missionEndT = -Infinity;
let wasMission = false;
let startDone = -1;

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
  if (getSettings().onboardingTips === false || seen.size >= LESSONS.length) return;
  if (startDone < 0) startDone = w.stats.missionsDone;
  const on = missionOn(w);
  if (wasMission && !on) missionEndT = playT;
  wasMission = on;
  if (isCinematicActive() || sinceCinematic() < AFTER_SCENE) return;
  playT += dt;
  if (playT < FIRST_AFTER || playT - lastAt < GAP || playT - missionEndT < AFTER_MISSION) return;
  if (w.health <= 0 || w.pendingRespawn || w.wanted > 0) return;
  for (const l of LESSONS) {
    if (seen.has(l.id)) continue;
    if (l.known && l.known()) { markSeen(l.id); continue; }
    if (!l.when(w, seen)) continue;
    if (!quiet() || cardsBusy() || !mayStart('card')) return;
    const c = l.card();
    showCard(w, { kind: 'tip', kicker: 'Uitleg', title: c.title, body: c.body, key: 'uitleg-' + l.id, important: true, voice: false, duration: 9 });
    markSeen(l.id);
    lastAt = playT;
    return;
  }
}

if (typeof window !== 'undefined') window.__onboarding = { seen: () => [...seen], reset: resetOnboarding };
