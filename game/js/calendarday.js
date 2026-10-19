// Today in the game (calendar.js has the calendar itself): world.calendar
// = { day, seen }. A night passing (the clock jumping back more than four
// hours: midnight, sleeping, a late train) moves to the next day; story
// progress moves the date on and holds it (calendar.js storyBounds). Saved
// as `kalender` (savegame.js). Sets the sun's declination for the day, and
// shows the "Vandaag in Grunn" card on the first morning of a special day.
import { formatDay, specialsOn, specialDay, cardFor, clampDay, storyBounds, sunDeclinationDeg, isSpecial, upcomingSpecials, STEP_DAY } from './calendar.js';
import { setSunDeclination } from './daynight.js';
import { showCard, cardsBusy } from './hudcards.js';
import { narrativeBusy } from './narrative.js';
import { isCinematicActive } from './cinematics.js';
import { isTrailerRunning } from './trailerstate.js';
import { playerBusy } from './busy.js';

const NIGHT_JUMP = 4;
const CARD_FROM = 6, CARD_UNTIL = 22;
// a new game or a load first belongs to the story
const CARD_GRACE = 45;

let world = null;
let prevClock = null;
let graceUntil = 0;
let lastDecl = null;

// story.js registers its progress view at load, so this module does not import it (import cycle, #108)
let getStoryView = () => ({ end: false });
export function setStoryViewSource(fn) { getStoryView = fn; }

function state(w) {
  if (!w.calendar) w.calendar = { day: 1, seen: [] };
  return w.calendar;
}

function bounds() {
  const sv = getStoryView();
  if (sv.end) return storyBounds({ end: true, part: sv.part, finale: !!sv.ending });
  return storyBounds({ id: sv.id });
}

export function initCalendar(w) {
  world = w;
  const c = state(w);
  c.day = clampDay(c.day, bounds());
  prevClock = null;
  graceUntil = (w.time || 0) + CARD_GRACE;
  window.__calendar = debugApi;
}

export function updateCalendar(dt, w) {
  world = w;
  const c = state(w);
  if (isTrailerRunning() || (typeof document !== 'undefined' && document.body.classList.contains('intro-montage'))) {
    // the trailer and the intro keep the look they were shot with
    prevClock = null;
    if (lastDecl !== null) { setSunDeclination(null); lastDecl = null; }
    return;
  }
  const h = ((w.clock % 24) + 24) % 24;
  const was = c.day;
  if (prevClock != null && prevClock - h > NIGHT_JUMP) c.day++;
  prevClock = h;
  c.day = clampDay(c.day, bounds());
  if (c.day !== was) dayChanged(c.day, was);
  if (c.day !== lastDecl) { setSunDeclination(sunDeclinationDeg(c.day)); lastDecl = c.day; }
  maybeCard(w, c, h);
}

function maybeCard(w, c, h) {
  if (h < CARD_FROM || h >= CARD_UNTIL || (w.time || 0) < graceUntil) return;
  const s = cardFor(c.day, c.seen);
  if (!s) return;
  if (typeof document !== 'undefined' && !document.body.classList.contains('game-started')) return;
  if (playerBusy(w, ['missionPhase', 'sideJob', 'challenge', 'race', 'pigeon', 'heliRun']).busy) return;
  if (isCinematicActive() || narrativeBusy() || cardsBusy()) return;
  c.seen.push(s.id);
  showCard(w, { kind: 'tip', kicker: 'Vandaag in Grunn', title: s.card[0], body: s.card[1], icon: 'cal-' + s.icon, important: true, voice: false, key: 'cal-' + s.id });
}

// --- for the HUD, menus and other systems -------------------------------------------

// onDayChange(fn): fn({ day, from, info, special }) whenever the date moves
// (also as a 'daychange' event on window, same detail).
const listeners = new Set();
export function onDayChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function dayChanged(day, from) {
  const detail = { day, from, info: formatDay(day), special: specialDay(day) };
  for (const fn of listeners) { try { fn(detail); } catch (e) { console.error('daychange', e); } }
  if (typeof window !== 'undefined' && typeof CustomEvent === 'function') window.dispatchEvent(new CustomEvent('daychange', { detail }));
}

export const today = (w = world) => (w ? state(w).day : 1);
export const todayInfo = (w = world) => formatDay(today(w));
// "Vrijdag 28 augustus" (pausemenu.js, the phone's status bar)
export const storyDate = (w = world) => todayInfo(w);
// the most important special day today, or null
export const todaySpecial = (w = world) => specialDay(today(w));
// is special day `id` (calendar.js SPECIAL_DAYS) on today?
export const isToday = (id, w = world) => isSpecial(id, today(w));
export const upcoming = (w = world, count = 4) => upcomingSpecials(today(w), count);

// --- save -------------------------------------------------------------------------------

export function getCalendarSave(w = world) {
  const c = w ? state(w) : { day: 1, seen: [] };
  return { v: 1, dag: c.day, gezien: [...c.seen] };
}

export function applyCalendarSave(w, d) {
  const c = state(w);
  const ok = d && typeof d === 'object' && d.v === 1;
  c.day = ok && Number.isFinite(d.dag) ? Math.max(1, Math.floor(d.dag)) : 1;
  c.seen = ok && Array.isArray(d.gezien) ? d.gezien.filter((id) => typeof id === 'string') : [];
  c.day = clampDay(c.day, bounds());
  prevClock = null;
  graceUntil = (w.time || 0) + CARD_GRACE;
}

const debugApi = {
  get: () => ({ ...state(world), info: todayInfo(), specials: specialsOn(today()).map((s) => s.id), bounds: bounds() }),
  set(n) { state(world).day = Math.max(1, n | 0); return this.get(); },
  stepDay: (id) => STEP_DAY.get(id),
};
